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

interface OnboardingWithUser {
  request: ShipperOnboardingRequest;
  user: User;
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
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedRequest, setSelectedRequest] = useState<OnboardingWithUser | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewData, setReviewData] = useState({
    decision: "" as "" | "approved" | "rejected" | "on_hold" | "under_review",
    decisionNote: "",
    creditLimit: "500000",
    paymentTerms: 30,
    riskLevel: "medium" as "low" | "medium" | "high" | "critical",
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

  const filteredRequests = requests?.filter((item) => {
    if (!item?.request) return false;
    const matchesSearch =
      !searchQuery ||
      item.request.legalCompanyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.user?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.user?.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || item.request.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: requests?.length || 0,
    draft: requests?.filter((r) => r.request?.status === "draft").length || 0,
    pending: requests?.filter((r) => r.request?.status === "pending").length || 0,
    under_review: requests?.filter((r) => r.request?.status === "under_review").length || 0,
    approved: requests?.filter((r) => r.request?.status === "approved").length || 0,
    rejected: requests?.filter((r) => r.request?.status === "rejected").length || 0,
    on_hold: requests?.filter((r) => r.request?.status === "on_hold").length || 0,
  };

  const openReviewDialog = (item: OnboardingWithUser) => {
    setSelectedRequest(item);
    setReviewData({
      decision: "",
      decisionNote: item.request.decisionNote || "",
      creditLimit: item.request.requestedCreditLimit?.toString() || "500000",
      paymentTerms: 30,
      riskLevel: "medium",
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

      <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
        <Card className={statusFilter === "all" ? "border-primary" : ""}>
          <CardContent className="p-4 cursor-pointer" onClick={() => setStatusFilter("all")}>
            <div className="text-2xl font-bold">{statusCounts.all}</div>
            <div className="text-sm text-muted-foreground">{t("common.all")}</div>
          </CardContent>
        </Card>
        <Card className={statusFilter === "draft" ? "border-primary" : ""}>
          <CardContent className="p-4 cursor-pointer" onClick={() => setStatusFilter("draft")}>
            <div className="text-2xl font-bold text-gray-500">{statusCounts.draft}</div>
            <div className="text-sm text-muted-foreground">{t("onboarding.statusDraft")}</div>
          </CardContent>
        </Card>
        <Card className={statusFilter === "pending" ? "border-primary" : ""}>
          <CardContent className="p-4 cursor-pointer" onClick={() => setStatusFilter("pending")}>
            <div className="text-2xl font-bold text-yellow-600">{statusCounts.pending}</div>
            <div className="text-sm text-muted-foreground">{t("onboarding.statusPending")}</div>
          </CardContent>
        </Card>
        <Card className={statusFilter === "under_review" ? "border-primary" : ""}>
          <CardContent className="p-4 cursor-pointer" onClick={() => setStatusFilter("under_review")}>
            <div className="text-2xl font-bold text-blue-600">{statusCounts.under_review}</div>
            <div className="text-sm text-muted-foreground">{t("onboarding.statusUnderReview")}</div>
          </CardContent>
        </Card>
        <Card className={statusFilter === "approved" ? "border-primary" : ""}>
          <CardContent className="p-4 cursor-pointer" onClick={() => setStatusFilter("approved")}>
            <div className="text-2xl font-bold text-green-600">{statusCounts.approved}</div>
            <div className="text-sm text-muted-foreground">{t("onboarding.statusApproved")}</div>
          </CardContent>
        </Card>
        <Card className={statusFilter === "rejected" ? "border-primary" : ""}>
          <CardContent className="p-4 cursor-pointer" onClick={() => setStatusFilter("rejected")}>
            <div className="text-2xl font-bold text-red-600">{statusCounts.rejected}</div>
            <div className="text-sm text-muted-foreground">{t("onboarding.statusRejected")}</div>
          </CardContent>
        </Card>
        <Card className={statusFilter === "on_hold" ? "border-primary" : ""}>
          <CardContent className="p-4 cursor-pointer" onClick={() => setStatusFilter("on_hold")}>
            <div className="text-2xl font-bold text-orange-600">{statusCounts.on_hold}</div>
            <div className="text-sm text-muted-foreground">{t("onboarding.statusOnHold")}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>{t("adminOnboarding.queue")}</CardTitle>
            <CardDescription>{t("adminOnboarding.queueDesc")}</CardDescription>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("adminOnboarding.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredRequests?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("adminOnboarding.noRequests")}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("onboarding.companyName")}</TableHead>
                  <TableHead>{t("onboarding.contactName")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead>{t("onboarding.businessType")}</TableHead>
                  <TableHead>{t("onboarding.submittedAt")}</TableHead>
                  <TableHead>{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests?.map((item) => (
                  <TableRow key={item.request.id} data-testid={`row-request-${item.request.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{item.request.legalCompanyName}</div>
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
                    <TableCell>{getStatusBadge(item.request.status || "draft")}</TableCell>
                    <TableCell>{item.request.businessType ? t(businessTypeLabels[item.request.businessType] || item.request.businessType) : "-"}</TableCell>
                    <TableCell>
                      {item.request.submittedAt
                        ? formatDistanceToNow(new Date(item.request.submittedAt), { addSuffix: true })
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openReviewDialog(item)}
                        data-testid={`button-review-${item.request.id}`}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        {t("adminOnboarding.review")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="business">{t("onboarding.tabBusiness")}</TabsTrigger>
                <TabsTrigger value="contact">{t("onboarding.tabContact")}</TabsTrigger>
                <TabsTrigger value="documents">{t("onboarding.tabDocuments")}</TabsTrigger>
                <TabsTrigger value="banking">{t("onboarding.tabBanking")}</TabsTrigger>
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

                <h4 className="font-medium">{t("onboarding.tradeReferences")}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4 space-y-2">
                      <p className="font-medium">{selectedRequest?.request.tradeReference1Company || "-"}</p>
                      <p className="text-sm text-muted-foreground">{selectedRequest?.request.tradeReference1Contact || "-"}</p>
                      <p className="text-sm text-muted-foreground">{selectedRequest?.request.tradeReference1Phone || "-"}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 space-y-2">
                      <p className="font-medium">{selectedRequest?.request.tradeReference2Company || "-"}</p>
                      <p className="text-sm text-muted-foreground">{selectedRequest?.request.tradeReference2Contact || "-"}</p>
                      <p className="text-sm text-muted-foreground">{selectedRequest?.request.tradeReference2Phone || "-"}</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="documents" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">{t("onboarding.gstCertificate")}</Label>
                    {selectedRequest?.request.gstCertificateUrl ? (
                      <DocumentLink value={selectedRequest.request.gstCertificateUrl} />
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

              <TabsContent value="banking" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">{t("onboarding.bankName")}</Label>
                    <p className="font-medium">{selectedRequest?.request.bankName || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t("onboarding.branchName")}</Label>
                    <p className="font-medium">{selectedRequest?.request.bankBranchName || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t("onboarding.accountNumber")}</Label>
                    <p className="font-medium">{selectedRequest?.request.bankAccountNumber || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t("onboarding.ifscCode")}</Label>
                    <p className="font-medium">{selectedRequest?.request.bankIfscCode || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t("onboarding.paymentTerms")}</Label>
                    <p className="font-medium">{selectedRequest?.request.preferredPaymentTerms}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t("onboarding.requestedCreditLimit")}</Label>
                    <p className="font-medium">
                      {selectedRequest?.request.requestedCreditLimit
                        ? `₹${Number(selectedRequest.request.requestedCreditLimit).toLocaleString()}`
                        : "-"}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">{t("onboarding.cancelledCheque")}</Label>
                  {selectedRequest?.request.cancelledChequeUrl ? (
                    <DocumentLink value={selectedRequest.request.cancelledChequeUrl} />
                  ) : (
                    <p className="text-muted-foreground">{t("common.notProvided")}</p>
                  )}
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

              {reviewData.decision === "approved" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg border">
                  <div className="space-y-2">
                    <Label>{t("adminOnboarding.proposedCreditLimit")}</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                      <Input
                        type="number"
                        value={reviewData.creditLimit}
                        onChange={(e) => setReviewData({ ...reviewData, creditLimit: e.target.value })}
                        data-testid="input-credit-limit"
                        className="pl-7"
                      />
                    </div>
                    {selectedRequest?.request.requestedCreditLimit && (
                      <p className="text-xs text-muted-foreground">
                        {t("adminOnboarding.requestedAmount")}: ₹{Number(selectedRequest.request.requestedCreditLimit).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>{t("creditAssessment.paymentTerms")} ({t("creditAssessment.days")})</Label>
                    <Input
                      type="number"
                      value={reviewData.paymentTerms || ""}
                      onChange={(e) => setReviewData({ ...reviewData, paymentTerms: e.target.value ? parseInt(e.target.value) : 30 })}
                      data-testid="input-payment-terms"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("creditAssessment.riskLevel")}</Label>
                    <Select
                      value={reviewData.riskLevel}
                      onValueChange={(value) => setReviewData({ ...reviewData, riskLevel: value as typeof reviewData.riskLevel })}
                    >
                      <SelectTrigger data-testid="select-risk-level">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">{t("creditAssessment.lowRisk")}</SelectItem>
                        <SelectItem value="medium">{t("creditAssessment.mediumRisk")}</SelectItem>
                        <SelectItem value="high">{t("creditAssessment.highRisk")}</SelectItem>
                        <SelectItem value="critical">{t("creditAssessment.criticalRisk")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

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
