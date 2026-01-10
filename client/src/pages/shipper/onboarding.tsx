import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Building2, User, Phone, Mail, MapPin, FileText, CreditCard,
  Upload, Check, Clock, AlertCircle, ChevronRight, Loader2, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormDescription,
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
import { indianStates } from "@shared/indian-locations";
import { DocumentUpload } from "@/components/DocumentUpload";

const onboardingFormSchema = z.object({
  legalCompanyName: z.string().min(1, "Company name is required"),
  tradeName: z.string().optional(),
  businessType: z.enum(["proprietorship", "partnership", "pvt_ltd", "public_ltd", "llp"]),
  incorporationDate: z.string().optional(),
  cinNumber: z.string().optional(),
  panNumber: z.string().min(10).max(10, "PAN must be 10 characters"),
  gstinNumber: z.string().optional(),
  registeredAddress: z.string().min(1, "Address is required"),
  registeredCity: z.string().min(1, "City is required"),
  registeredState: z.string().min(1, "State is required"),
  registeredPincode: z.string().min(6).max(6, "Pincode must be 6 digits"),
  operatingRegions: z.array(z.string()).optional(),
  primaryCommodities: z.array(z.string()).optional(),
  estimatedMonthlyLoads: z.number().int().min(0).optional(),
  avgLoadValueInr: z.string().optional(),
  contactPersonName: z.string().min(1, "Contact name is required"),
  contactPersonDesignation: z.string().optional(),
  contactPersonPhone: z.string().min(10, "Phone is required"),
  contactPersonEmail: z.string().email("Valid email required"),
  gstCertificateUrl: z.string().optional(),
  panCardUrl: z.string().optional(),
  incorporationCertificateUrl: z.string().optional(),
  cancelledChequeUrl: z.string().optional(),
  businessAddressProofUrl: z.string().optional(),
  tradeReference1Company: z.string().optional(),
  tradeReference1Contact: z.string().optional(),
  tradeReference1Phone: z.string().optional(),
  tradeReference2Company: z.string().optional(),
  tradeReference2Contact: z.string().optional(),
  tradeReference2Phone: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankIfscCode: z.string().optional(),
  bankBranchName: z.string().optional(),
  preferredPaymentTerms: z.enum(["cod", "net_7", "net_15", "net_30", "net_45"]).optional(),
  requestedCreditLimit: z.string().optional(),
});

type OnboardingFormData = z.infer<typeof onboardingFormSchema>;

export default function ShipperOnboarding() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("business");
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [showFullForm, setShowFullForm] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedDataRef = useRef<string>("");

  const { data: onboardingStatus, isLoading: isLoadingStatus } = useQuery<any>({
    queryKey: ["/api/shipper/onboarding"],
  });

  const form = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingFormSchema),
    defaultValues: {
      legalCompanyName: "",
      tradeName: "",
      businessType: "pvt_ltd",
      panNumber: "",
      gstinNumber: "",
      cinNumber: "",
      incorporationDate: "",
      registeredAddress: "",
      registeredCity: "",
      registeredState: "",
      registeredPincode: "",
      operatingRegions: [],
      primaryCommodities: [],
      estimatedMonthlyLoads: undefined,
      avgLoadValueInr: "",
      contactPersonName: "",
      contactPersonDesignation: "",
      contactPersonPhone: "",
      contactPersonEmail: "",
      gstCertificateUrl: "",
      panCardUrl: "",
      incorporationCertificateUrl: "",
      cancelledChequeUrl: "",
      businessAddressProofUrl: "",
      tradeReference1Company: "",
      tradeReference1Contact: "",
      tradeReference1Phone: "",
      tradeReference2Company: "",
      tradeReference2Contact: "",
      tradeReference2Phone: "",
      bankName: "",
      bankAccountNumber: "",
      bankIfscCode: "",
      bankBranchName: "",
      preferredPaymentTerms: "net_30",
      requestedCreditLimit: "",
    },
  });

  // Pre-populate form with existing data (draft, pending, under_review, on_hold, rejected)
  useEffect(() => {
    if (onboardingStatus && (onboardingStatus.status === "draft" || onboardingStatus.status === "pending" || onboardingStatus.status === "under_review" || onboardingStatus.status === "on_hold" || onboardingStatus.status === "rejected")) {
      const draftData: Partial<OnboardingFormData> = {
        legalCompanyName: onboardingStatus.legalCompanyName || "",
        tradeName: onboardingStatus.tradeName || "",
        businessType: onboardingStatus.businessType || "pvt_ltd",
        panNumber: onboardingStatus.panNumber || "",
        gstinNumber: onboardingStatus.gstinNumber || "",
        cinNumber: onboardingStatus.cinNumber || "",
        incorporationDate: onboardingStatus.incorporationDate ? onboardingStatus.incorporationDate.split('T')[0] : "",
        registeredAddress: onboardingStatus.registeredAddress || "",
        registeredCity: onboardingStatus.registeredCity || "",
        registeredState: onboardingStatus.registeredState || "",
        registeredPincode: onboardingStatus.registeredPincode || "",
        operatingRegions: onboardingStatus.operatingRegions || [],
        primaryCommodities: onboardingStatus.primaryCommodities || [],
        estimatedMonthlyLoads: onboardingStatus.estimatedMonthlyLoads || undefined,
        avgLoadValueInr: onboardingStatus.avgLoadValueInr || "",
        contactPersonName: onboardingStatus.contactPersonName || "",
        contactPersonDesignation: onboardingStatus.contactPersonDesignation || "",
        contactPersonPhone: onboardingStatus.contactPersonPhone || "",
        contactPersonEmail: onboardingStatus.contactPersonEmail || "",
        gstCertificateUrl: onboardingStatus.gstCertificateUrl || "",
        panCardUrl: onboardingStatus.panCardUrl || "",
        incorporationCertificateUrl: onboardingStatus.incorporationCertificateUrl || "",
        cancelledChequeUrl: onboardingStatus.cancelledChequeUrl || "",
        businessAddressProofUrl: onboardingStatus.businessAddressProofUrl || "",
        tradeReference1Company: onboardingStatus.tradeReference1Company || "",
        tradeReference1Contact: onboardingStatus.tradeReference1Contact || "",
        tradeReference1Phone: onboardingStatus.tradeReference1Phone || "",
        tradeReference2Company: onboardingStatus.tradeReference2Company || "",
        tradeReference2Contact: onboardingStatus.tradeReference2Contact || "",
        tradeReference2Phone: onboardingStatus.tradeReference2Phone || "",
        bankName: onboardingStatus.bankName || "",
        bankAccountNumber: onboardingStatus.bankAccountNumber || "",
        bankIfscCode: onboardingStatus.bankIfscCode || "",
        bankBranchName: onboardingStatus.bankBranchName || "",
        preferredPaymentTerms: onboardingStatus.preferredPaymentTerms || "net_30",
        requestedCreditLimit: onboardingStatus.requestedCreditLimit || "",
      };

      form.reset(draftData);
      lastSavedDataRef.current = JSON.stringify(draftData);
    }
  }, [onboardingStatus, form]);

  // Auto-save mutation for drafts
  const autoSaveMutation = useMutation({
    mutationFn: async (data: Partial<OnboardingFormData>) => {
      const res = await apiRequest("PATCH", "/api/shipper/onboarding/draft", data);
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

  // Debounced auto-save function
  const debouncedAutoSave = useCallback((data: Partial<OnboardingFormData>) => {
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

  // Watch form changes for auto-save (only for draft status)
  useEffect(() => {
    if (onboardingStatus?.status !== "draft") return;

    const subscription = form.watch((data) => {
      debouncedAutoSave(data as Partial<OnboardingFormData>);
    });

    return () => {
      subscription.unsubscribe();
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [form, onboardingStatus?.status, debouncedAutoSave]);

  const submitMutation = useMutation({
    mutationFn: async (data: OnboardingFormData) => {
      const res = await apiRequest("POST", "/api/shipper/onboarding", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t("onboarding.submitSuccess"),
        description: t("onboarding.submitSuccessDesc"),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/shipper/onboarding"] });
    },
    onError: (error: any) => {
      toast({
        title: t("onboarding.submitError"),
        description: error.message || t("onboarding.submitErrorDesc"),
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<OnboardingFormData>) => {
      const res = await apiRequest("PUT", "/api/shipper/onboarding", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t("onboarding.updateSuccess"),
        description: t("onboarding.updateSuccessDesc"),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/shipper/onboarding"] });
    },
    onError: (error: any) => {
      toast({
        title: t("onboarding.updateError"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: OnboardingFormData) => {
    if (onboardingStatus && (onboardingStatus.status === "on_hold" || onboardingStatus.status === "rejected")) {
      updateMutation.mutate(data);
    } else {
      submitMutation.mutate(data);
    }
  };

  if (isLoadingStatus) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary" className="gap-1"><FileText className="h-3 w-3" />{t("onboarding.statusDraft")}</Badge>;
      case "pending":
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />{t("onboarding.statusPending")}</Badge>;
      case "under_review":
        return <Badge className="bg-blue-500 gap-1"><Loader2 className="h-3 w-3 animate-spin" />{t("onboarding.statusUnderReview")}</Badge>;
      case "approved":
        return <Badge className="bg-green-500 gap-1"><Check className="h-3 w-3" />{t("onboarding.statusApproved")}</Badge>;
      case "rejected":
        return <Badge variant="destructive" className="gap-1"><X className="h-3 w-3" />{t("onboarding.statusRejected")}</Badge>;
      case "on_hold":
        return <Badge variant="secondary" className="gap-1"><AlertCircle className="h-3 w-3" />{t("onboarding.statusOnHold")}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Render auto-save indicator
  const renderAutoSaveIndicator = () => {
    if (onboardingStatus?.status !== "draft") return null;
    
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="auto-save-indicator">
        {autoSaveStatus === "saving" && (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>{t("postLoad.autoSaving")}</span>
          </>
        )}
        {autoSaveStatus === "saved" && (
          <>
            <Check className="h-3 w-3 text-green-500" />
            <span className="text-green-600 dark:text-green-400">{t("postLoad.autoSaved")}</span>
          </>
        )}
      </div>
    );
  };

  if (onboardingStatus && (onboardingStatus.status === "pending" || onboardingStatus.status === "under_review" || onboardingStatus.status === "approved") && !showFullForm) {
    return (
      <div className="container mx-auto py-6 max-w-4xl">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {t("onboarding.title")}
                </CardTitle>
                <CardDescription>{t("onboarding.statusDescription")}</CardDescription>
              </div>
              {getStatusBadge(onboardingStatus.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{t("onboarding.companyName")}</p>
                <p className="font-medium">{onboardingStatus.legalCompanyName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{t("onboarding.gstin")}</p>
                <p className="font-medium">{onboardingStatus.gstinNumber || "-"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{t("onboarding.submittedAt")}</p>
                <p className="font-medium">{new Date(onboardingStatus.submittedAt).toLocaleDateString()}</p>
              </div>
              {onboardingStatus.status === "approved" && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{t("onboarding.approvedAt")}</p>
                  <p className="font-medium">{new Date(onboardingStatus.reviewedAt).toLocaleDateString()}</p>
                </div>
              )}
            </div>

            {onboardingStatus.status === "approved" && (
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                  <Check className="h-5 w-5" />
                  <p className="font-medium">{t("onboarding.approvedMessage")}</p>
                </div>
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                  {t("onboarding.approvedDescription")}
                </p>
                <Button
                  className="mt-4"
                  onClick={() => setLocation("/shipper/post-load")}
                  data-testid="button-post-first-load"
                >
                  {t("onboarding.postFirstLoad")}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}

            {onboardingStatus.status === "pending" && (
              <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                  <Clock className="h-5 w-5" />
                  <p className="font-medium">{t("onboarding.pendingMessage")}</p>
                </div>
                <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                  {t("onboarding.pendingDescription")}
                </p>
              </div>
            )}

            {onboardingStatus.status === "under_review" && (
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <p className="font-medium">{t("onboarding.underReviewMessage")}</p>
                </div>
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                  {t("onboarding.underReviewDescription")}
                </p>
              </div>
            )}

            {(onboardingStatus.status === "pending" || onboardingStatus.status === "under_review") && (
              <Button
                variant="outline"
                onClick={() => setShowFullForm(true)}
                data-testid="button-view-full-application"
                className="w-full"
              >
                <FileText className="h-4 w-4 mr-2" />
                {t("onboarding.viewFullApplication")}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (onboardingStatus && (onboardingStatus.status === "on_hold" || onboardingStatus.status === "rejected")) {
    return (
      <div className="container mx-auto py-6 max-w-4xl space-y-6">
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  {t("onboarding.actionRequired")}
                </CardTitle>
                <CardDescription>
                  {onboardingStatus.status === "rejected" 
                    ? t("onboarding.rejectedDescription")
                    : t("onboarding.onHoldDescription")}
                </CardDescription>
              </div>
              {getStatusBadge(onboardingStatus.status)}
            </div>
          </CardHeader>
          {onboardingStatus.decisionNote && (
            <CardContent>
              <div className="bg-muted rounded-lg p-4">
                <p className="text-sm font-medium mb-1">{t("onboarding.adminNote")}</p>
                <p className="text-sm text-muted-foreground">{onboardingStatus.decisionNote}</p>
              </div>
            </CardContent>
          )}
        </Card>

        <OnboardingFormComponent 
          form={form} 
          onSubmit={onSubmit} 
          isSubmitting={updateMutation.isPending}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isUpdate={true}
        />
      </div>
    );
  }

  // For draft status, show form with auto-save
  const isDraft = onboardingStatus?.status === "draft";
  const isPendingOrUnderReview = onboardingStatus?.status === "pending" || onboardingStatus?.status === "under_review";

  return (
    <div className="container mx-auto py-6 max-w-4xl space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            {t("onboarding.title")}
          </h1>
          <div className="flex items-center gap-3">
            {renderAutoSaveIndicator()}
            {isDraft && getStatusBadge("draft")}
            {isPendingOrUnderReview && getStatusBadge(onboardingStatus?.status)}
          </div>
        </div>
        <p className="text-muted-foreground">
          {isDraft ? t("onboarding.continueDraftDesc") : t("onboarding.subtitle")}
        </p>
      </div>

      {showFullForm && isPendingOrUnderReview && (
        <Button
          variant="outline"
          onClick={() => setShowFullForm(false)}
          data-testid="button-back-to-summary"
        >
          <ChevronRight className="h-4 w-4 mr-2 rotate-180" />
          {t("onboarding.backToSummary")}
        </Button>
      )}

      <OnboardingFormComponent 
        form={form} 
        onSubmit={onSubmit} 
        isSubmitting={submitMutation.isPending}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isUpdate={false}
      />
    </div>
  );
}

interface OnboardingFormProps {
  form: ReturnType<typeof useForm<OnboardingFormData>>;
  onSubmit: (data: OnboardingFormData) => void;
  isSubmitting: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isUpdate: boolean;
}

function OnboardingFormComponent({ form, onSubmit, isSubmitting, activeTab, setActiveTab, isUpdate }: OnboardingFormProps) {
  const { t } = useTranslation();

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="business" className="gap-1" data-testid="tab-business">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">{t("onboarding.tabBusiness")}</span>
            </TabsTrigger>
            <TabsTrigger value="contact" className="gap-1" data-testid="tab-contact">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{t("onboarding.tabContact")}</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-1" data-testid="tab-documents">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">{t("onboarding.tabDocuments")}</span>
            </TabsTrigger>
            <TabsTrigger value="banking" className="gap-1" data-testid="tab-banking">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">{t("onboarding.tabBanking")}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="business">
            <Card>
              <CardHeader>
                <CardTitle>{t("onboarding.businessDetails")}</CardTitle>
                <CardDescription>{t("onboarding.businessDetailsDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="legalCompanyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("onboarding.legalCompanyName")} *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder={t("onboarding.legalCompanyNamePlaceholder")} 
                            {...field} 
                            data-testid="input-legal-company-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tradeName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("onboarding.tradeName")}</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder={t("onboarding.tradeNamePlaceholder")} 
                            {...field} 
                            data-testid="input-trade-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="businessType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("onboarding.businessType")} *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-business-type">
                              <SelectValue placeholder={t("onboarding.selectBusinessType")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="proprietorship">{t("onboarding.proprietorship")}</SelectItem>
                            <SelectItem value="partnership">{t("onboarding.partnership")}</SelectItem>
                            <SelectItem value="pvt_ltd">{t("onboarding.pvtLtd")}</SelectItem>
                            <SelectItem value="public_ltd">{t("onboarding.publicLtd")}</SelectItem>
                            <SelectItem value="llp">{t("onboarding.llp")}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="incorporationDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("onboarding.incorporationDate")}</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field} 
                            data-testid="input-incorporation-date"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="panNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("onboarding.pan")} *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="ABCDE1234F" 
                            className="uppercase"
                            maxLength={10}
                            {...field} 
                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                            data-testid="input-pan-number"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="gstinNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("onboarding.gstin")}</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="22ABCDE1234F1Z5" 
                            className="uppercase"
                            maxLength={15}
                            {...field} 
                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                            data-testid="input-gstin"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cinNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("onboarding.cin")}</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="U12345MH2020PTC123456" 
                            className="uppercase"
                            {...field} 
                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                            data-testid="input-cin"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">{t("onboarding.registeredAddress")}</h4>
                  <FormField
                    control={form.control}
                    name="registeredAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("onboarding.addressLine")} *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder={t("onboarding.addressPlaceholder")} 
                            {...field} 
                            data-testid="input-address"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid gap-4 md:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="registeredCity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("onboarding.city")} *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder={t("onboarding.cityPlaceholder")} 
                              {...field} 
                              data-testid="input-city"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="registeredState"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("onboarding.state")} *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-state">
                                <SelectValue placeholder={t("onboarding.selectState")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {indianStates.map((state) => (
                                <SelectItem key={state.code} value={state.name}>
                                  {state.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="registeredPincode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("onboarding.pincode")} *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="400001" 
                              maxLength={6}
                              {...field} 
                              data-testid="input-pincode"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="button" onClick={() => setActiveTab("contact")} data-testid="button-next-contact">
                    {t("onboarding.next")}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contact">
            <Card>
              <CardHeader>
                <CardTitle>{t("onboarding.contactDetails")}</CardTitle>
                <CardDescription>{t("onboarding.contactDetailsDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="contactPersonName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("onboarding.contactName")} *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder={t("onboarding.contactNamePlaceholder")} 
                            {...field} 
                            data-testid="input-contact-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactPersonDesignation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("onboarding.designation")}</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder={t("onboarding.designationPlaceholder")} 
                            {...field} 
                            data-testid="input-designation"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="contactPersonPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("onboarding.phone")} *</FormLabel>
                        <FormControl>
                          <div className="flex">
                            <span className="inline-flex items-center px-3 bg-muted border border-r-0 rounded-l-md text-muted-foreground">
                              +91
                            </span>
                            <Input 
                              placeholder="9876543210" 
                              className="rounded-l-none"
                              {...field} 
                              data-testid="input-phone"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactPersonEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("onboarding.email")} *</FormLabel>
                        <FormControl>
                          <Input 
                            type="email"
                            placeholder="contact@company.com" 
                            {...field} 
                            data-testid="input-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">{t("onboarding.tradeReferences")}</h4>
                  <p className="text-sm text-muted-foreground">{t("onboarding.tradeReferencesDesc")}</p>
                  
                  <div className="grid gap-4 md:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="tradeReference1Company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("onboarding.reference1Company")}</FormLabel>
                          <FormControl>
                            <Input placeholder={t("onboarding.companyNamePlaceholder")} {...field} data-testid="input-ref1-company" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="tradeReference1Contact"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("onboarding.reference1Contact")}</FormLabel>
                          <FormControl>
                            <Input placeholder={t("onboarding.contactNamePlaceholder")} {...field} data-testid="input-ref1-contact" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="tradeReference1Phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("onboarding.reference1Phone")}</FormLabel>
                          <FormControl>
                            <Input placeholder="9876543210" {...field} data-testid="input-ref1-phone" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="tradeReference2Company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("onboarding.reference2Company")}</FormLabel>
                          <FormControl>
                            <Input placeholder={t("onboarding.companyNamePlaceholder")} {...field} data-testid="input-ref2-company" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="tradeReference2Contact"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("onboarding.reference2Contact")}</FormLabel>
                          <FormControl>
                            <Input placeholder={t("onboarding.contactNamePlaceholder")} {...field} data-testid="input-ref2-contact" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="tradeReference2Phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("onboarding.reference2Phone")}</FormLabel>
                          <FormControl>
                            <Input placeholder="9876543210" {...field} data-testid="input-ref2-phone" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="flex justify-between gap-4">
                  <Button type="button" variant="outline" onClick={() => setActiveTab("business")} data-testid="button-back-business">
                    {t("onboarding.back")}
                  </Button>
                  <Button type="button" onClick={() => setActiveTab("documents")} data-testid="button-next-documents">
                    {t("onboarding.next")}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle>{t("onboarding.complianceDocuments")}</CardTitle>
                <CardDescription>{t("onboarding.complianceDocumentsDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="gstCertificateUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("onboarding.gstCertificate")}</FormLabel>
                        <FormControl>
                          <DocumentUpload
                            value={field.value || ""}
                            onChange={field.onChange}
                            placeholder={t("onboarding.noFileSelected")}
                            testId="upload-gst-certificate"
                          />
                        </FormControl>
                        <FormDescription>{t("onboarding.gstCertificateDesc")}</FormDescription>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="panCardUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("onboarding.panCard")}</FormLabel>
                        <FormControl>
                          <DocumentUpload
                            value={field.value || ""}
                            onChange={field.onChange}
                            placeholder={t("onboarding.noFileSelected")}
                            testId="upload-pan-card"
                          />
                        </FormControl>
                        <FormDescription>{t("onboarding.panCardDesc")}</FormDescription>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="incorporationCertificateUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("onboarding.incorporationCertificate")}</FormLabel>
                        <FormControl>
                          <DocumentUpload
                            value={field.value || ""}
                            onChange={field.onChange}
                            placeholder={t("onboarding.noFileSelected")}
                            testId="upload-incorporation-certificate"
                          />
                        </FormControl>
                        <FormDescription>{t("onboarding.incorporationCertificateDesc")}</FormDescription>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="businessAddressProofUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("onboarding.addressProof")}</FormLabel>
                        <FormControl>
                          <DocumentUpload
                            value={field.value || ""}
                            onChange={field.onChange}
                            placeholder={t("onboarding.noFileSelected")}
                            testId="upload-address-proof"
                          />
                        </FormControl>
                        <FormDescription>{t("onboarding.addressProofDesc")}</FormDescription>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-between gap-4">
                  <Button type="button" variant="outline" onClick={() => setActiveTab("contact")} data-testid="button-back-contact">
                    {t("onboarding.back")}
                  </Button>
                  <Button type="button" onClick={() => setActiveTab("banking")} data-testid="button-next-banking">
                    {t("onboarding.next")}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="banking">
            <Card>
              <CardHeader>
                <CardTitle>{t("onboarding.bankingDetails")}</CardTitle>
                <CardDescription>{t("onboarding.bankingDetailsDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="bankName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("onboarding.bankName")}</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder={t("onboarding.bankNamePlaceholder")} 
                            {...field} 
                            data-testid="input-bank-name"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bankBranchName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("onboarding.branchName")}</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder={t("onboarding.branchNamePlaceholder")} 
                            {...field} 
                            data-testid="input-branch-name"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="bankAccountNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("onboarding.accountNumber")}</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder={t("onboarding.accountNumberPlaceholder")} 
                            {...field} 
                            data-testid="input-account-number"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bankIfscCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("onboarding.ifscCode")}</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="SBIN0001234" 
                            className="uppercase"
                            {...field} 
                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                            data-testid="input-ifsc"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="cancelledChequeUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("onboarding.cancelledCheque")}</FormLabel>
                      <FormControl>
                        <DocumentUpload
                          value={field.value || ""}
                          onChange={field.onChange}
                          placeholder={t("onboarding.noFileSelected")}
                          testId="upload-cancelled-cheque"
                        />
                      </FormControl>
                      <FormDescription>{t("onboarding.cancelledChequeDesc")}</FormDescription>
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="preferredPaymentTerms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("onboarding.paymentTerms")}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-payment-terms">
                              <SelectValue placeholder={t("onboarding.selectPaymentTerms")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="cod">{t("onboarding.cod")}</SelectItem>
                            <SelectItem value="net_7">{t("onboarding.net7")}</SelectItem>
                            <SelectItem value="net_15">{t("onboarding.net15")}</SelectItem>
                            <SelectItem value="net_30">{t("onboarding.net30")}</SelectItem>
                            <SelectItem value="net_45">{t("onboarding.net45")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="requestedCreditLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("onboarding.requestedCreditLimit")}</FormLabel>
                        <FormControl>
                          <div className="flex">
                            <span className="inline-flex items-center px-3 bg-muted border border-r-0 rounded-l-md text-muted-foreground">
                              INR
                            </span>
                            <Input 
                              placeholder="500000" 
                              className="rounded-l-none"
                              {...field} 
                              data-testid="input-credit-limit"
                            />
                          </div>
                        </FormControl>
                        <FormDescription>{t("onboarding.creditLimitDesc")}</FormDescription>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-between gap-4">
                  <Button type="button" variant="outline" onClick={() => setActiveTab("documents")} data-testid="button-back-documents">
                    {t("onboarding.back")}
                  </Button>
                  <Button type="submit" disabled={isSubmitting} data-testid="button-submit-onboarding">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t("onboarding.submitting")}
                      </>
                    ) : (
                      <>
                        {isUpdate ? t("onboarding.resubmit") : t("onboarding.submit")}
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </form>
    </Form>
  );
}
