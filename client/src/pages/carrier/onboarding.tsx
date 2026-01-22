import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Truck, User, FileText, CreditCard, Upload, Check, Clock, 
  AlertCircle, Loader2, Building2, Shield, IdCard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DocumentUploadWithCamera } from "@/components/DocumentUploadWithCamera";
import { useAuth } from "@/lib/auth-context";

const soloFormSchema = z.object({
  carrierType: z.literal("solo"),
  aadhaarNumber: z.string().min(12, "Aadhaar must be 12 digits").max(12),
  driverLicenseNumber: z.string().min(1, "License number is required"),
  permitType: z.enum(["national", "domestic"]),
  uniqueRegistrationNumber: z.string().optional(),
  chassisNumber: z.string().min(1, "Chassis number is required"),
  licensePlateNumber: z.string().min(1, "License plate is required"),
  aadhaarUrl: z.string().optional(),
  licenseUrl: z.string().optional(),
  permitUrl: z.string().optional(),
  rcUrl: z.string().optional(),
  insuranceUrl: z.string().optional(),
  fitnessUrl: z.string().optional(),
});

const fleetFormSchema = z.object({
  carrierType: z.literal("enterprise"),
  incorporationType: z.enum(["pvt_ltd", "llp", "proprietorship", "partnership"]),
  businessRegistrationNumber: z.string().min(1, "Registration number is required"),
  businessAddress: z.string().min(1, "Business address is required"),
  panNumber: z.string().min(10, "PAN must be 10 characters").max(10),
  gstinNumber: z.string().min(15, "GSTIN must be 15 characters").max(15),
  tanNumber: z.string().min(10, "TAN must be 10 characters").max(10),
  fleetSize: z.number().int().min(1),
  incorporationUrl: z.string().optional(),
  tradeLicenseUrl: z.string().optional(),
  addressProofUrl: z.string().optional(),
  panUrl: z.string().optional(),
  gstinUrl: z.string().optional(),
  tanUrl: z.string().optional(),
});

const formSchema = z.discriminatedUnion("carrierType", [soloFormSchema, fleetFormSchema]);

type FormData = z.infer<typeof formSchema>;

interface OnboardingResponse {
  id: string;
  carrierId: string;
  status: string;
  carrierType: string;
  fleetSize: number;
  aadhaarNumber?: string;
  driverLicenseNumber?: string;
  permitType?: string;
  uniqueRegistrationNumber?: string;
  chassisNumber?: string;
  licensePlateNumber?: string;
  incorporationType?: string;
  businessRegistrationNumber?: string;
  businessAddress?: string;
  panNumber?: string;
  gstinNumber?: string;
  tanNumber?: string;
  rejectionReason?: string;
  notes?: string;
  documents: Array<{
    id: string;
    documentType: string;
    fileName: string;
    fileUrl: string;
  }>;
}

export default function CarrierOnboarding() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("identity");
  const [carrierType, setCarrierType] = useState<"solo" | "enterprise">("solo");
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedDataRef = useRef<string>("");

  const { data: onboardingStatus, isLoading: isLoadingStatus } = useQuery<OnboardingResponse>({
    queryKey: ["/api/carrier/onboarding"],
  });

  const soloForm = useForm<z.infer<typeof soloFormSchema>>({
    resolver: zodResolver(soloFormSchema),
    defaultValues: {
      carrierType: "solo",
      aadhaarNumber: "",
      driverLicenseNumber: "",
      permitType: "national",
      uniqueRegistrationNumber: "",
      chassisNumber: "",
      licensePlateNumber: "",
      aadhaarUrl: "",
      licenseUrl: "",
      permitUrl: "",
      rcUrl: "",
      insuranceUrl: "",
      fitnessUrl: "",
    },
  });

  const fleetForm = useForm<z.infer<typeof fleetFormSchema>>({
    resolver: zodResolver(fleetFormSchema),
    defaultValues: {
      carrierType: "enterprise",
      incorporationType: "pvt_ltd",
      businessRegistrationNumber: "",
      businessAddress: "",
      panNumber: "",
      gstinNumber: "",
      tanNumber: "",
      fleetSize: 1,
      incorporationUrl: "",
      tradeLicenseUrl: "",
      addressProofUrl: "",
      panUrl: "",
      gstinUrl: "",
      tanUrl: "",
    },
  });

  useEffect(() => {
    if (onboardingStatus) {
      const type = onboardingStatus.carrierType === "enterprise" ? "enterprise" : "solo";
      setCarrierType(type);
      
      if (type === "solo") {
        soloForm.reset({
          carrierType: "solo",
          aadhaarNumber: onboardingStatus.aadhaarNumber || "",
          driverLicenseNumber: onboardingStatus.driverLicenseNumber || "",
          permitType: (onboardingStatus.permitType as "national" | "domestic") || "national",
          uniqueRegistrationNumber: onboardingStatus.uniqueRegistrationNumber || "",
          chassisNumber: onboardingStatus.chassisNumber || "",
          licensePlateNumber: onboardingStatus.licensePlateNumber || "",
          aadhaarUrl: onboardingStatus.documents.find(d => d.documentType === "aadhaar")?.fileUrl || "",
          licenseUrl: onboardingStatus.documents.find(d => d.documentType === "license")?.fileUrl || "",
          permitUrl: onboardingStatus.documents.find(d => d.documentType === "permit")?.fileUrl || "",
          rcUrl: onboardingStatus.documents.find(d => d.documentType === "rc")?.fileUrl || "",
          insuranceUrl: onboardingStatus.documents.find(d => d.documentType === "insurance")?.fileUrl || "",
          fitnessUrl: onboardingStatus.documents.find(d => d.documentType === "fitness")?.fileUrl || "",
        });
      } else {
        fleetForm.reset({
          carrierType: "enterprise",
          incorporationType: (onboardingStatus.incorporationType as "pvt_ltd" | "llp" | "proprietorship" | "partnership") || "pvt_ltd",
          businessRegistrationNumber: onboardingStatus.businessRegistrationNumber || "",
          businessAddress: onboardingStatus.businessAddress || "",
          panNumber: onboardingStatus.panNumber || "",
          gstinNumber: onboardingStatus.gstinNumber || "",
          tanNumber: onboardingStatus.tanNumber || "",
          fleetSize: onboardingStatus.fleetSize || 1,
          incorporationUrl: onboardingStatus.documents.find(d => d.documentType === "incorporation")?.fileUrl || "",
          tradeLicenseUrl: onboardingStatus.documents.find(d => d.documentType === "trade_license")?.fileUrl || "",
          addressProofUrl: onboardingStatus.documents.find(d => d.documentType === "address_proof")?.fileUrl || "",
          panUrl: onboardingStatus.documents.find(d => d.documentType === "pan")?.fileUrl || "",
          gstinUrl: onboardingStatus.documents.find(d => d.documentType === "gstin")?.fileUrl || "",
          tanUrl: onboardingStatus.documents.find(d => d.documentType === "tan")?.fileUrl || "",
        });
      }
    }
  }, [onboardingStatus, soloForm, fleetForm]);

  const autoSaveMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const res = await apiRequest("PATCH", "/api/carrier/onboarding/draft", data);
      return res.json();
    },
    onSuccess: () => {
      setAutoSaveStatus("saved");
      setTimeout(() => setAutoSaveStatus("idle"), 2000);
    },
    onError: () => {
      setAutoSaveStatus("idle");
    },
  });

  const debouncedAutoSave = useCallback((data: Record<string, any>) => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    const dataString = JSON.stringify(data);
    if (dataString === lastSavedDataRef.current) {
      return;
    }

    setAutoSaveStatus("saving");
    autoSaveTimeoutRef.current = setTimeout(() => {
      lastSavedDataRef.current = dataString;
      autoSaveMutation.mutate(data);
    }, 1500);
  }, [autoSaveMutation]);

  useEffect(() => {
    const editableStatuses = ["draft", "on_hold", "rejected"];
    if (!onboardingStatus?.status || !editableStatuses.includes(onboardingStatus.status)) return;
    
    let unsubscribe: () => void;
    
    if (carrierType === "solo") {
      const sub = soloForm.watch((data) => {
        debouncedAutoSave(data);
      });
      unsubscribe = sub.unsubscribe;
    } else {
      const sub = fleetForm.watch((data) => {
        debouncedAutoSave(data);
      });
      unsubscribe = sub.unsubscribe;
    }

    return () => {
      unsubscribe();
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [onboardingStatus?.status, carrierType, soloForm, fleetForm, debouncedAutoSave]);

  const uploadDocMutation = useMutation({
    mutationFn: async ({ documentType, fileUrl, fileName }: { documentType: string; fileUrl: string; fileName: string }) => {
      const res = await apiRequest("POST", "/api/carrier/verification/documents", {
        documentType,
        fileName,
        fileUrl,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/carrier/onboarding"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error.message,
      });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/carrier/onboarding/submit", {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/carrier/onboarding"] });
      toast({
        title: t("carrierOnboarding.submitted"),
        description: t("carrierOnboarding.submittedDesc"),
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error.message,
      });
    },
  });

  const handleDocumentUpload = (documentType: string, value: string) => {
    if (!value) return;
    
    try {
      const parsed = JSON.parse(value);
      if (parsed.path) {
        uploadDocMutation.mutate({
          documentType,
          fileUrl: parsed.path,
          fileName: parsed.name || "Uploaded Document",
        });
      }
    } catch {
      // Legacy plain URL format
      uploadDocMutation.mutate({
        documentType,
        fileUrl: value,
        fileName: "Uploaded Document",
      });
    }
  };

  const handleSubmit = async () => {
    // Cancel any pending debounced auto-save
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    // Validate form before submitting
    if (carrierType === "solo") {
      const values = soloForm.getValues();
      const missingFields: string[] = [];
      
      // Check Identity tab fields
      if (!values.aadhaarNumber || values.aadhaarNumber.length < 12) {
        missingFields.push("Aadhaar Number (Identity tab)");
      }
      if (!values.driverLicenseNumber) {
        missingFields.push("Driver License Number (Identity tab)");
      }
      if (!values.permitType) {
        missingFields.push("Permit Type (Identity tab)");
      }
      
      // Check Vehicle tab fields
      if (!values.licensePlateNumber) {
        missingFields.push("License Plate Number (Vehicle tab)");
      }
      if (!values.chassisNumber) {
        missingFields.push("Chassis Number (Vehicle tab)");
      }
      
      if (missingFields.length > 0) {
        toast({
          variant: "destructive",
          title: t("common.error"),
          description: `Please fill in the following required fields: ${missingFields.join(", ")}`,
        });
        // Navigate to the appropriate tab
        if (missingFields.some(f => f.includes("Identity"))) {
          setActiveTab("identity");
        } else if (missingFields.some(f => f.includes("Vehicle"))) {
          setActiveTab("vehicle");
        }
        return;
      }
      
      // Save form data immediately before submit
      try {
        setAutoSaveStatus("saving");
        await apiRequest("PATCH", "/api/carrier/onboarding/draft", values);
      } catch (error) {
        // Continue with submit even if save fails - server will validate
      }
    } else {
      const values = fleetForm.getValues();
      const missingFields: string[] = [];
      
      // Check Business tab fields
      if (!values.incorporationType) {
        missingFields.push("Incorporation Type (Business tab)");
      }
      if (!values.businessRegistrationNumber) {
        missingFields.push("Business Registration Number (Business tab)");
      }
      if (!values.businessAddress) {
        missingFields.push("Business Address (Business tab)");
      }
      
      // Check Compliance tab fields
      if (!values.panNumber || values.panNumber.length < 10) {
        missingFields.push("PAN Number (Compliance tab)");
      }
      if (!values.gstinNumber || values.gstinNumber.length < 15) {
        missingFields.push("GSTIN Number (Compliance tab)");
      }
      if (!values.tanNumber || values.tanNumber.length < 10) {
        missingFields.push("TAN Number (Compliance tab)");
      }
      
      if (missingFields.length > 0) {
        toast({
          variant: "destructive",
          title: t("common.error"),
          description: `Please fill in the following required fields: ${missingFields.join(", ")}`,
        });
        // Navigate to the appropriate tab
        if (missingFields.some(f => f.includes("Business"))) {
          setActiveTab("identity");
        } else if (missingFields.some(f => f.includes("Compliance"))) {
          setActiveTab("vehicle");
        }
        return;
      }
      
      // Save form data immediately before submit
      try {
        setAutoSaveStatus("saving");
        await apiRequest("PATCH", "/api/carrier/onboarding/draft", values);
      } catch (error) {
        // Continue with submit even if save fails - server will validate
      }
    }
    
    submitMutation.mutate();
  };

  const getStatusBadge = () => {
    const status = onboardingStatus?.status;
    if (!status || status === "draft") return null;
    
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
      pending: { variant: "secondary", icon: Clock },
      under_review: { variant: "default", icon: Shield },
      approved: { variant: "default", icon: Check },
      rejected: { variant: "destructive", icon: AlertCircle },
      on_hold: { variant: "outline", icon: AlertCircle },
    };
    
    const config = variants[status] || { variant: "secondary" as const, icon: Clock };
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {t(`carrierOnboarding.status.${status}`)}
      </Badge>
    );
  };

  const canEdit = !onboardingStatus?.status || ["draft", "on_hold", "rejected"].includes(onboardingStatus.status);

  if (isLoadingStatus) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (onboardingStatus?.status === "approved") {
    return (
      <div className="container max-w-2xl py-12">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">{t("carrierOnboarding.approved")}</CardTitle>
            <CardDescription>{t("carrierOnboarding.approvedDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => setLocation("/carrier/loads")} data-testid="button-go-marketplace">
              {t("carrierOnboarding.goToMarketplace")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (onboardingStatus?.status === "pending" || onboardingStatus?.status === "under_review") {
    return (
      <div className="container max-w-2xl py-12">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">{t("carrierOnboarding.pendingReview")}</CardTitle>
            <CardDescription>{t("carrierOnboarding.pendingReviewDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            {getStatusBadge()}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t("carrierOnboarding.title")}</h1>
            <p className="text-muted-foreground mt-2">{t("carrierOnboarding.subtitle")}</p>
          </div>
          <div className="flex items-center gap-4">
            {getStatusBadge()}
            {autoSaveStatus === "saving" && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                {t("common.saving")}
              </span>
            )}
            {autoSaveStatus === "saved" && (
              <span className="text-sm text-green-600 flex items-center gap-1">
                <Check className="h-3 w-3" />
                {t("common.saved")}
              </span>
            )}
          </div>
        </div>

        {onboardingStatus?.status === "rejected" && onboardingStatus.rejectionReason && (
          <Card className="mt-4 border-destructive">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">{t("carrierOnboarding.rejectedReason")}</p>
                  <p className="text-sm text-muted-foreground">{onboardingStatus.rejectionReason}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    For assistance, please contact us at <a href="tel:+919876543210" className="text-primary font-medium underline">+91 98765 43210</a>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {onboardingStatus?.status === "on_hold" && (
          <Card className="mt-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-700 dark:text-yellow-500">Your verification is on hold</p>
                  {onboardingStatus.notes ? (
                    <p className="text-sm mt-1">{onboardingStatus.notes}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">Please review and update your information below, then resubmit for review.</p>
                  )}
                  <p className="text-sm text-muted-foreground mt-2">
                    For assistance, please contact support at <a href="tel:+919876543210" className="text-primary font-medium underline">+91 98765 43210</a>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            {carrierType === "solo" ? (
              <>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{t("carrierOnboarding.soloOperator")}</h3>
                  <p className="text-sm text-muted-foreground">{t("carrierOnboarding.soloDesc")}</p>
                </div>
              </>
            ) : (
              <>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{t("carrierOnboarding.fleetCompany")}</h3>
                  <p className="text-sm text-muted-foreground">{t("carrierOnboarding.fleetDesc")}</p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {carrierType === "solo" ? (
        <Form {...soloForm} key="solo-form">
          <form>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="identity" className="gap-2">
                  <IdCard className="h-4 w-4" />
                  {t("carrierOnboarding.identityTab")}
                </TabsTrigger>
                <TabsTrigger value="vehicle" className="gap-2">
                  <Truck className="h-4 w-4" />
                  {t("carrierOnboarding.vehicleTab")}
                </TabsTrigger>
                <TabsTrigger value="documents" className="gap-2">
                  <FileText className="h-4 w-4" />
                  {t("carrierOnboarding.documentsTab")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="identity">
                <Card>
                  <CardHeader>
                    <CardTitle>{t("carrierOnboarding.personalInfo")}</CardTitle>
                    <CardDescription>{t("carrierOnboarding.personalInfoDesc")}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={soloForm.control}
                      name="aadhaarNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("carrierOnboarding.aadhaarNumber")} *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="XXXX XXXX XXXX" maxLength={12} disabled={!canEdit} data-testid="input-aadhaar" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={soloForm.control}
                      name="driverLicenseNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("carrierOnboarding.driverLicense")} *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="DL-XXXXXXXXX" disabled={!canEdit} data-testid="input-license" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={soloForm.control}
                      name="permitType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("carrierOnboarding.permitType")} *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={!canEdit}>
                            <FormControl>
                              <SelectTrigger data-testid="select-permit-type">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="national">{t("carrierOnboarding.nationalPermit")}</SelectItem>
                              <SelectItem value="domestic">{t("carrierOnboarding.domesticPermit")}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="vehicle">
                <Card>
                  <CardHeader>
                    <CardTitle>{t("carrierOnboarding.vehicleInfo")}</CardTitle>
                    <CardDescription>{t("carrierOnboarding.vehicleInfoDesc")}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={soloForm.control}
                      name="licensePlateNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("carrierOnboarding.licensePlate")} *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="MH-01-AB-1234" disabled={!canEdit} data-testid="input-plate" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={soloForm.control}
                      name="chassisNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("carrierOnboarding.chassisNumber")} *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="XXXXXXXXXXXXXXXXX" disabled={!canEdit} data-testid="input-chassis" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={soloForm.control}
                      name="uniqueRegistrationNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("carrierOnboarding.registrationNumber")}</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={!canEdit} data-testid="input-reg-number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="documents">
                <Card>
                  <CardHeader>
                    <CardTitle>{t("carrierOnboarding.requiredDocs")}</CardTitle>
                    <CardDescription>{t("carrierOnboarding.requiredDocsDesc")}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">{t("carrierOnboarding.aadhaarCard")} *</label>
                        <DocumentUploadWithCamera
                          value={soloForm.watch("aadhaarUrl") || ""}
                          onChange={(val) => {
                            soloForm.setValue("aadhaarUrl", val);
                            handleDocumentUpload("aadhaar", val);
                          }}
                          disabled={!canEdit}
                          documentType="aadhaar_card"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">{t("carrierOnboarding.driverLicenseDoc")} *</label>
                        <DocumentUploadWithCamera
                          value={soloForm.watch("licenseUrl") || ""}
                          onChange={(val) => {
                            soloForm.setValue("licenseUrl", val);
                            handleDocumentUpload("license", val);
                          }}
                          disabled={!canEdit}
                          documentType="driver_license"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">{t("carrierOnboarding.permitDoc")} *</label>
                        <DocumentUploadWithCamera
                          value={soloForm.watch("permitUrl") || ""}
                          onChange={(val) => {
                            soloForm.setValue("permitUrl", val);
                            handleDocumentUpload("permit", val);
                          }}
                          disabled={!canEdit}
                          documentType="permit"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">{t("carrierOnboarding.rcDoc")} *</label>
                        <DocumentUploadWithCamera
                          value={soloForm.watch("rcUrl") || ""}
                          onChange={(val) => {
                            soloForm.setValue("rcUrl", val);
                            handleDocumentUpload("rc", val);
                          }}
                          disabled={!canEdit}
                          documentType="registration_certificate"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">{t("carrierOnboarding.insuranceDoc")} *</label>
                        <DocumentUploadWithCamera
                          value={soloForm.watch("insuranceUrl") || ""}
                          onChange={(val) => {
                            soloForm.setValue("insuranceUrl", val);
                            handleDocumentUpload("insurance", val);
                          }}
                          disabled={!canEdit}
                          documentType="insurance_certificate"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">{t("carrierOnboarding.fitnessDoc")} *</label>
                        <DocumentUploadWithCamera
                          value={soloForm.watch("fitnessUrl") || ""}
                          onChange={(val) => {
                            soloForm.setValue("fitnessUrl", val);
                            handleDocumentUpload("fitness", val);
                          }}
                          disabled={!canEdit}
                          documentType="fitness_certificate"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </form>
        </Form>
      ) : (
        <Form {...fleetForm} key="fleet-form">
          <form>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="identity" className="gap-2">
                  <Building2 className="h-4 w-4" />
                  {t("carrierOnboarding.businessTab")}
                </TabsTrigger>
                <TabsTrigger value="vehicle" className="gap-2">
                  <CreditCard className="h-4 w-4" />
                  {t("carrierOnboarding.complianceTab")}
                </TabsTrigger>
                <TabsTrigger value="documents" className="gap-2">
                  <FileText className="h-4 w-4" />
                  {t("carrierOnboarding.documentsTab")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="identity">
                <Card>
                  <CardHeader>
                    <CardTitle>{t("carrierOnboarding.businessInfo")}</CardTitle>
                    <CardDescription>{t("carrierOnboarding.businessInfoDesc")}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={fleetForm.control}
                      name="incorporationType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("carrierOnboarding.incorporationType")} *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={!canEdit}>
                            <FormControl>
                              <SelectTrigger data-testid="select-incorporation">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="pvt_ltd">{t("carrierOnboarding.pvtLtd")}</SelectItem>
                              <SelectItem value="llp">{t("carrierOnboarding.llp")}</SelectItem>
                              <SelectItem value="proprietorship">{t("carrierOnboarding.proprietorship")}</SelectItem>
                              <SelectItem value="partnership">{t("carrierOnboarding.partnership")}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={fleetForm.control}
                      name="businessRegistrationNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("carrierOnboarding.businessRegNumber")} *</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={!canEdit} data-testid="input-business-reg" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={fleetForm.control}
                      name="businessAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("carrierOnboarding.businessAddress")} *</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={!canEdit} data-testid="input-business-address" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={fleetForm.control}
                      name="fleetSize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("carrierOnboarding.fleetSize")} *</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min={1} 
                              {...field} 
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                              disabled={!canEdit} 
                              data-testid="input-fleet-size" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="vehicle">
                <Card>
                  <CardHeader>
                    <CardTitle>{t("carrierOnboarding.taxCompliance")}</CardTitle>
                    <CardDescription>{t("carrierOnboarding.taxComplianceDesc")}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={fleetForm.control}
                      name="panNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("carrierOnboarding.panNumber")} *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="XXXXX0000X" maxLength={10} disabled={!canEdit} data-testid="input-pan" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={fleetForm.control}
                      name="gstinNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("carrierOnboarding.gstinNumber")} *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="22XXXXX0000X1Z5" maxLength={15} disabled={!canEdit} data-testid="input-gstin" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={fleetForm.control}
                      name="tanNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("carrierOnboarding.tanNumber")} *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="XXXX00000X" maxLength={10} disabled={!canEdit} data-testid="input-tan" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="documents">
                <Card>
                  <CardHeader>
                    <CardTitle>{t("carrierOnboarding.requiredDocs")}</CardTitle>
                    <CardDescription>{t("carrierOnboarding.requiredDocsDescFleet")}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">{t("carrierOnboarding.incorporationDoc")} *</label>
                        <DocumentUploadWithCamera
                          value={fleetForm.watch("incorporationUrl") || ""}
                          onChange={(val) => {
                            fleetForm.setValue("incorporationUrl", val);
                            handleDocumentUpload("incorporation", val);
                          }}
                          disabled={!canEdit}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">{t("carrierOnboarding.tradeLicenseDoc")} *</label>
                        <DocumentUploadWithCamera
                          value={fleetForm.watch("tradeLicenseUrl") || ""}
                          onChange={(val) => {
                            fleetForm.setValue("tradeLicenseUrl", val);
                            handleDocumentUpload("trade_license", val);
                          }}
                          disabled={!canEdit}
                          documentType="trade_license"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">{t("carrierOnboarding.addressProofDoc")} *</label>
                        <DocumentUploadWithCamera
                          value={fleetForm.watch("addressProofUrl") || ""}
                          onChange={(val) => {
                            fleetForm.setValue("addressProofUrl", val);
                            handleDocumentUpload("address_proof", val);
                          }}
                          disabled={!canEdit}
                          documentType="address_proof"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">{t("carrierOnboarding.panDoc")} *</label>
                        <DocumentUploadWithCamera
                          value={fleetForm.watch("panUrl") || ""}
                          onChange={(val) => {
                            fleetForm.setValue("panUrl", val);
                            handleDocumentUpload("pan", val);
                          }}
                          disabled={!canEdit}
                          documentType="pan_card"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">{t("carrierOnboarding.gstinDoc")} *</label>
                        <DocumentUploadWithCamera
                          value={fleetForm.watch("gstinUrl") || ""}
                          onChange={(val) => {
                            fleetForm.setValue("gstinUrl", val);
                            handleDocumentUpload("gstin", val);
                          }}
                          disabled={!canEdit}
                          documentType="gstin_certificate"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">{t("carrierOnboarding.tanDoc")} *</label>
                        <DocumentUploadWithCamera
                          value={fleetForm.watch("tanUrl") || ""}
                          onChange={(val) => {
                            fleetForm.setValue("tanUrl", val);
                            handleDocumentUpload("tan", val);
                          }}
                          disabled={!canEdit}
                          documentType="tan_certificate"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </form>
        </Form>
      )}

      {canEdit && (
        <div className="mt-8 flex justify-end">
          <Button 
            size="lg" 
            onClick={handleSubmit}
            disabled={submitMutation.isPending}
            data-testid="button-submit-onboarding"
          >
            {submitMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("common.submitting")}
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                {t("carrierOnboarding.submitForReview")}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
