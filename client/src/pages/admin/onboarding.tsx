import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { parseDocumentValue } from "@/components/DocumentUpload";
import {
  UserCheck,
  Search,
  Building2,
  Phone,
  Mail,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  FileText,
  CreditCard,
  Calendar,
  MapPin,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDistanceToNow, format } from "date-fns";
import type { ShipperOnboardingRequest, User } from "@shared/schema";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";

interface OnboardingWithUser {
  request: ShipperOnboardingRequest;
  user: User;
}

interface StatusSectionProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  count: number;
  items: OnboardingWithUser[];
  onReview: (item: OnboardingWithUser) => void;
  getStatusBadge: (status: string) => React.ReactNode;
  businessTypeLabels: Record<string, string>;
  t: (key: string) => string;
  testIdPrefix: string;
}

function StatusSection({
  title,
  description,
  icon,
  count,
  items,
  onReview,
  getStatusBadge,
  businessTypeLabels,
  t,
  testIdPrefix,
}: StatusSectionProps) {
  const [isOpen, setIsOpen] = useState(count > 0);

  if (count === 0) {
    return (
      <Card className="opacity-60">
        <CardHeader className="py-4">
          <div className="flex items-center gap-3">
            {icon}
            <div className="flex-1">
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription className="text-sm">{description}</CardDescription>
            </div>
            <Badge variant="secondary" className="text-muted-foreground">0</Badge>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="py-4 cursor-pointer">
            <div className="flex items-center gap-3">
              {isOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
              {icon}
              <div className="flex-1">
                <CardTitle className="text-base">{title}</CardTitle>
                <CardDescription className="text-sm">{description}</CardDescription>
              </div>
              <Badge variant="default">{count}</Badge>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("onboarding.companyName")}</TableHead>
                  <TableHead>{t("onboarding.contactName")}</TableHead>
                  <TableHead>{t("onboarding.businessType")}</TableHead>
                  <TableHead>{t("onboarding.submittedAt")}</TableHead>
                  <TableHead>{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.request.id} data-testid={`row-${testIdPrefix}-${item.request.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{item.request.legalCompanyName || "-"}</div>
                          <div className="text-sm text-muted-foreground">{item.request.tradeName}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-sm">
                          <span>{item.request.contactPersonName || "-"}</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          <span>{item.request.contactPersonPhone || "-"}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.request.businessType 
                        ? t(businessTypeLabels[item.request.businessType] || item.request.businessType) 
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {item.request.submittedAt
                        ? formatDistanceToNow(new Date(item.request.submittedAt), { addSuffix: true })
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onReview(item)}
                        data-testid={`button-review-${testIdPrefix}-${item.request.id}`}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        {t("adminOnboarding.review")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

const businessTypeLabels: Record<string, string> = {
  proprietorship: "onboarding.proprietorship",
  partnership: "onboarding.partnership",
  pvt_ltd: "onboarding.pvtLtd",
  public_ltd: "onboarding.publicLtd",
  llp: "onboarding.llp",
};

function DocumentLink({ value }: { value: string }) {
  const doc = parseDocumentValue(value);
  if (!doc) return null;
  
  return (
    <a
      href={doc.path}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary hover:underline flex items-center gap-1"
    >
      <FileText className="h-4 w-4" />
      {doc.name}
    </a>
  );
}

export default function AdminOnboardingPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<OnboardingWithUser | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewData, setReviewData] = useState({
    decision: "" as "" | "approved" | "rejected" | "on_hold" | "under_review",
    decisionNote: "",
  });

  const { data: requests, isLoading, refetch } = useQuery<OnboardingWithUser[]>({
    queryKey: ["/api/admin/onboarding-requests"],
  });

  const reviewMutation = useMutation({
    mutationFn: async (data: { requestId: string; review: typeof reviewData }) => {
      return apiRequest("POST", `/api/admin/onboarding-requests/${data.requestId}/review`, data.review);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/onboarding-requests"] });
      setIsReviewDialogOpen(false);
      setSelectedRequest(null);
      toast({
        title: t("adminOnboarding.reviewSaved"),
        description: t("adminOnboarding.reviewSavedDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("common.error"),
        description: t("adminOnboarding.reviewFailed"),
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }> = {
      draft: { variant: "outline", icon: AlertCircle },
      pending: { variant: "secondary", icon: Clock },
      under_review: { variant: "default", icon: Eye },
      approved: { variant: "default", icon: CheckCircle },
      rejected: { variant: "destructive", icon: XCircle },
      on_hold: { variant: "secondary", icon: AlertCircle },
    };
    const config = variants[status] || variants.pending;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {t(`onboarding.status${status.charAt(0).toUpperCase() + status.slice(1).replace(/_./g, (m) => m[1].toUpperCase())}`)}
      </Badge>
    );
  };

  const statusCounts = {
    all: requests?.length || 0,
    draft: requests?.filter((r) => r.request?.status === "draft").length || 0,
    // Include both pending and under_review in the pending count
    pending: requests?.filter((r) => r.request?.status === "pending" || r.request?.status === "under_review").length || 0,
    approved: requests?.filter((r) => r.request?.status === "approved").length || 0,
    rejected: requests?.filter((r) => r.request?.status === "rejected").length || 0,
    on_hold: requests?.filter((r) => r.request?.status === "on_hold").length || 0,
  };

  const getFilteredByStatus = (status: string): OnboardingWithUser[] => {
    return (requests || []).filter((item) => {
      if (!item?.request) return false;
      const matchesSearch =
        !searchQuery ||
        item.request.legalCompanyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.user?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.user?.email?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // For "pending" section, also include "under_review" items
      if (status === "pending") {
        return matchesSearch && (item.request.status === "pending" || item.request.status === "under_review");
      }
      return matchesSearch && item.request.status === status;
    });
  };

  const openReviewDialog = (item: OnboardingWithUser) => {
    setSelectedRequest(item);
    setReviewData({
      decision: "",
      decisionNote: item.request.decisionNote || "",
    });
    setIsReviewDialogOpen(true);
  };

  const handleSubmitReview = () => {
    if (!selectedRequest || !reviewData.decision) return;
    reviewMutation.mutate({
      requestId: selectedRequest.request.id,
      review: reviewData,
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">
            {t("adminOnboarding.title")}
          </h1>
          <p className="text-muted-foreground">{t("adminOnboarding.subtitle")}</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} data-testid="button-refresh">
          <RefreshCw className="h-4 w-4 mr-2" />
          {t("common.refresh")}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{statusCounts.all}</div>
            <div className="text-sm text-muted-foreground">{t("common.all")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{statusCounts.pending}</div>
            <div className="text-sm text-muted-foreground">Pending Review</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-500">{statusCounts.draft}</div>
            <div className="text-sm text-muted-foreground">Awaiting Submission</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{statusCounts.approved}</div>
            <div className="text-sm text-muted-foreground">{t("onboarding.statusApproved")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{statusCounts.rejected}</div>
            <div className="text-sm text-muted-foreground">{t("onboarding.statusRejected")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{statusCounts.on_hold}</div>
            <div className="text-sm text-muted-foreground">{t("onboarding.statusOnHold")}</div>
          </CardContent>
        </Card>
      </div>

      <div className="relative w-full max-w-sm mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("adminOnboarding.searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          data-testid="input-search"
        />
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <StatusSection
            title="Pending Review"
            description="Submissions awaiting admin review"
            icon={<Clock className="h-5 w-5 text-yellow-600" />}
            count={statusCounts.pending}
            items={getFilteredByStatus("pending")}
            onReview={openReviewDialog}
            getStatusBadge={getStatusBadge}
            businessTypeLabels={businessTypeLabels}
            t={t}
            testIdPrefix="pending"
          />

          <StatusSection
            title="Awaiting Submission"
            description="Draft applications not yet submitted by shippers"
            icon={<AlertCircle className="h-5 w-5 text-gray-500" />}
            count={statusCounts.draft}
            items={getFilteredByStatus("draft")}
            onReview={openReviewDialog}
            getStatusBadge={getStatusBadge}
            businessTypeLabels={businessTypeLabels}
            t={t}
            testIdPrefix="draft"
          />

          <StatusSection
            title="Approved"
            description="Verified and approved shippers"
            icon={<CheckCircle className="h-5 w-5 text-green-600" />}
            count={statusCounts.approved}
            items={getFilteredByStatus("approved")}
            onReview={openReviewDialog}
            getStatusBadge={getStatusBadge}
            businessTypeLabels={businessTypeLabels}
            t={t}
            testIdPrefix="approved"
          />

          <StatusSection
            title="Rejected"
            description="Applications that did not meet requirements"
            icon={<XCircle className="h-5 w-5 text-red-600" />}
            count={statusCounts.rejected}
            items={getFilteredByStatus("rejected")}
            onReview={openReviewDialog}
            getStatusBadge={getStatusBadge}
            businessTypeLabels={businessTypeLabels}
            t={t}
            testIdPrefix="rejected"
          />

          <StatusSection
            title="On Hold"
            description="Applications pending additional information"
            icon={<AlertCircle className="h-5 w-5 text-orange-600" />}
            count={statusCounts.on_hold}
            items={getFilteredByStatus("on_hold")}
            onReview={openReviewDialog}
            getStatusBadge={getStatusBadge}
            businessTypeLabels={businessTypeLabels}
            t={t}
            testIdPrefix="on-hold"
          />
        </div>
      )}

      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{t("adminOnboarding.reviewTitle")}</DialogTitle>
            <DialogDescription>
              {selectedRequest?.request.legalCompanyName}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0 pr-4 overflow-y-auto">
            <Tabs defaultValue="business" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="business">{t("onboarding.tabBusiness")}</TabsTrigger>
                <TabsTrigger value="contact">{t("onboarding.tabContact")}</TabsTrigger>
                <TabsTrigger value="documents">{t("onboarding.tabDocuments")}</TabsTrigger>
              </TabsList>

              <TabsContent value="business" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">{t("onboarding.legalCompanyName")}</Label>
                    <p className="font-medium">{selectedRequest?.request.legalCompanyName}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t("onboarding.tradeName")}</Label>
                    <p className="font-medium">{selectedRequest?.request.tradeName || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t("onboarding.businessType")}</Label>
                    <p className="font-medium">{selectedRequest?.request.businessType ? t(businessTypeLabels[selectedRequest.request.businessType] || selectedRequest.request.businessType) : "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t("onboarding.incorporationDate")}</Label>
                    <p className="font-medium">
                      {selectedRequest?.request.incorporationDate
                        ? format(new Date(selectedRequest.request.incorporationDate), "PPP")
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t("onboarding.pan")}</Label>
                    <p className="font-medium">{selectedRequest?.request.panNumber || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t("onboarding.gstin")}</Label>
                    <p className="font-medium">{selectedRequest?.request.gstinNumber || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t("onboarding.cin")}</Label>
                    <p className="font-medium">{selectedRequest?.request.cinNumber || "-"}</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="text-muted-foreground">{t("onboarding.registeredAddress")}</Label>
                  <p className="font-medium">
                    {selectedRequest?.request.registeredAddress || "-"}, {selectedRequest?.request.registeredCity || "-"},{" "}
                    {selectedRequest?.request.registeredState || "-"} - {selectedRequest?.request.registeredPincode || "-"}
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="contact" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">{t("onboarding.contactName")}</Label>
                    <p className="font-medium">{selectedRequest?.request.contactPersonName || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t("onboarding.designation")}</Label>
                    <p className="font-medium">{selectedRequest?.request.contactPersonDesignation || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t("onboarding.phone")}</Label>
                    <p className="font-medium">{selectedRequest?.request.contactPersonPhone || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t("onboarding.email")}</Label>
                    <p className="font-medium">{selectedRequest?.request.contactPersonEmail || "-"}</p>
                  </div>
                </div>

                <Separator />

                <h4 className="font-medium text-lg">{t("onboarding.tradeReferences")}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <Card className="border-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">Reference 1</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-2">
                      <p className="font-medium text-base">{selectedRequest?.request.tradeReference1Company || "-"}</p>
                      <p className="text-sm"><span className="text-muted-foreground">Contact: </span>{selectedRequest?.request.tradeReference1Contact || "-"}</p>
                      <p className="text-sm"><span className="text-muted-foreground">Phone: </span>{selectedRequest?.request.tradeReference1Phone || "-"}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">Reference 2</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-2">
                      <p className="font-medium text-base">{selectedRequest?.request.tradeReference2Company || "-"}</p>
                      <p className="text-sm"><span className="text-muted-foreground">Contact: </span>{selectedRequest?.request.tradeReference2Contact || "-"}</p>
                      <p className="text-sm"><span className="text-muted-foreground">Phone: </span>{selectedRequest?.request.tradeReference2Phone || "-"}</p>
                    </CardContent>
                  </Card>
                </div>

                <h4 className="font-medium mt-4">How did you hear about us?</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Referral Source</Label>
                    <p className="font-medium">
                      {selectedRequest?.request.referralSource === "google" && "Google"}
                      {selectedRequest?.request.referralSource === "app_store" && "App Store"}
                      {selectedRequest?.request.referralSource === "linkedin" && "LinkedIn"}
                      {selectedRequest?.request.referralSource === "sales_person" && "Sales Person Reference"}
                      {!selectedRequest?.request.referralSource && "-"}
                    </p>
                  </div>
                  {selectedRequest?.request.referralSource === "sales_person" && (
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Sales Person Name</Label>
                      <p className="font-medium">{selectedRequest?.request.referralSalesPersonName || "-"}</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="documents" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">{t("onboarding.gstCertificate")}</Label>
                    {selectedRequest?.request.gstCertificateUrl ? (
                      <DocumentLink value={selectedRequest.request.gstCertificateUrl} />
                    ) : selectedRequest?.request.noGstCertificate ? (
                      <div className="space-y-2">
                        <Badge variant="outline" className="text-amber-600 border-amber-300">
                          No GST - Alternative Document
                        </Badge>
                        {selectedRequest?.request.alternativeDocumentType && (
                          <p className="text-sm">
                            <span className="text-muted-foreground">Type: </span>
                            <span className="font-medium">
                              {selectedRequest.request.alternativeDocumentType === "msme_certificate" && "MSME Certificate"}
                              {selectedRequest.request.alternativeDocumentType === "udyam_registration" && "Udyam Registration"}
                              {selectedRequest.request.alternativeDocumentType === "shop_establishment" && "Shop & Establishment License"}
                              {selectedRequest.request.alternativeDocumentType === "trade_license" && "Trade License"}
                              {selectedRequest.request.alternativeDocumentType === "iec_certificate" && "IEC Certificate"}
                              {selectedRequest.request.alternativeDocumentType === "fssai_license" && "FSSAI License"}
                              {selectedRequest.request.alternativeDocumentType === "other_govt_auth" && "Other Government Authorization"}
                              {!["msme_certificate", "udyam_registration", "shop_establishment", "trade_license", "iec_certificate", "fssai_license", "other_govt_auth"].includes(selectedRequest.request.alternativeDocumentType || "") && selectedRequest.request.alternativeDocumentType}
                            </span>
                          </p>
                        )}
                        {selectedRequest?.request.alternativeAuthorizationUrl ? (
                          <DocumentLink value={selectedRequest.request.alternativeAuthorizationUrl} />
                        ) : (
                          <p className="text-sm text-muted-foreground">Document not yet uploaded</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">{t("common.notProvided")}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">{t("onboarding.panCard")}</Label>
                    {selectedRequest?.request.panCardUrl ? (
                      <DocumentLink value={selectedRequest.request.panCardUrl} />
                    ) : (
                      <p className="text-muted-foreground">{t("common.notProvided")}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">{t("onboarding.incorporationCertificate")}</Label>
                    {selectedRequest?.request.incorporationCertificateUrl ? (
                      <DocumentLink value={selectedRequest.request.incorporationCertificateUrl} />
                    ) : (
                      <p className="text-muted-foreground">{t("common.notProvided")}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">{t("onboarding.addressProof")}</Label>
                    {selectedRequest?.request.businessAddressProofUrl ? (
                      <DocumentLink value={selectedRequest.request.businessAddressProofUrl} />
                    ) : (
                      <p className="text-muted-foreground">{t("common.notProvided")}</p>
                    )}
                  </div>
                </div>
              </TabsContent>

            </Tabs>

            <Separator className="my-6" />

            <div className="space-y-4">
              <h3 className="font-semibold">{t("adminOnboarding.decision")}</h3>

              <div className="space-y-2">
                <Label>{t("common.status")}</Label>
                <Select
                  value={reviewData.decision}
                  onValueChange={(value) => setReviewData({ ...reviewData, decision: value as typeof reviewData.decision })}
                >
                  <SelectTrigger data-testid="select-decision">
                    <SelectValue placeholder={t("adminOnboarding.selectDecision")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="under_review">{t("onboarding.statusUnderReview")}</SelectItem>
                    <SelectItem value="approved">{t("onboarding.statusApproved")}</SelectItem>
                    <SelectItem value="rejected">{t("onboarding.statusRejected")}</SelectItem>
                    <SelectItem value="on_hold">{t("onboarding.statusOnHold")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t("adminOnboarding.decisionNote")}</Label>
                <Textarea
                  value={reviewData.decisionNote}
                  onChange={(e) => setReviewData({ ...reviewData, decisionNote: e.target.value })}
                  placeholder={t("adminOnboarding.notePlaceholder")}
                  rows={3}
                  data-testid="input-decision-note"
                />
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="pt-4 border-t flex-shrink-0">
            <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)} data-testid="button-cancel">
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleSubmitReview}
              disabled={!reviewData.decision || reviewMutation.isPending}
              data-testid="button-submit-review"
            >
              {reviewMutation.isPending ? t("common.saving") : t("adminOnboarding.submitReview")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
