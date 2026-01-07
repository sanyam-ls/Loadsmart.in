import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  CreditCard,
  Search,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Building2,
  Phone,
  Mail,
  RefreshCw,
  Edit,
  History,
  DollarSign,
  Shield,
  ChevronRight,
  Zap,
  Bot,
  User as UserIcon,
  FileText,
  Scale,
  Landmark,
  CircleDollarSign,
  BadgeCheck,
  FileCheck,
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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDistanceToNow, format } from "date-fns";
import type { User, ShipperCreditProfile, ShipperCreditEvaluation } from "@shared/schema";

interface ShipperWithProfile {
  user: User;
  creditProfile: ShipperCreditProfile | null;
}

export default function CreditAssessmentPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [selectedShipper, setSelectedShipper] = useState<ShipperWithProfile | null>(null);
  const [isAssessmentDialogOpen, setIsAssessmentDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    // Core Assessment
    creditLimit: "",
    creditScore: 500,
    riskLevel: "medium" as "low" | "medium" | "high" | "critical",
    paymentTerms: 30,
    notes: "",
    rationale: "",
    
    // Financial Health
    annualRevenue: "",
    totalAssets: "",
    debtSummary: "",
    cashFlowRating: "fair" as "excellent" | "good" | "fair" | "poor",
    liquidityRatio: "",
    debtToEquityRatio: "",
    outstandingDebtAmount: "",
    
    // Business Profile
    businessYearsInOperation: 0,
    companyScale: "small" as "small" | "medium" | "large" | "enterprise",
    paymentHistoryScore: 50,
    averageDaysToPay: 30,
    latePaymentCount: 0,
    reputationRating: "good" as "excellent" | "good" | "fair" | "poor",
    
    // Compliance (India-specific)
    gstCompliant: false,
    gstNumber: "",
    incomeTaxCompliant: false,
    dgftRegistered: false,
    dgftIecNumber: "",
    hasValidContracts: false,
    contractTypes: "",
    confirmedOrdersValue: "",
    
    // Credit History
    creditBureauScore: 0,
    creditUtilizationPercent: "",
    hasPublicRecords: false,
    publicRecordsDetails: "",
    
    // Section Notes
    financialAnalysisNotes: "",
    qualitativeAssessmentNotes: "",
  });

  const { data: shippers, isLoading, refetch } = useQuery<ShipperWithProfile[]>({
    queryKey: ["/api/admin/credit-assessments"],
  });

  const { data: evaluationHistory } = useQuery<ShipperCreditEvaluation[]>({
    queryKey: ["/api/admin/credit-assessments", selectedShipper?.user.id, "evaluations"],
    enabled: !!selectedShipper && isHistoryDialogOpen,
  });

  const assessmentMutation = useMutation({
    mutationFn: async (data: { shipperId: string; assessment: typeof formData }) => {
      return apiRequest("POST", `/api/admin/credit-assessments/${data.shipperId}`, data.assessment);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/credit-assessments"] });
      setIsAssessmentDialogOpen(false);
      toast({
        title: t("creditAssessment.saved"),
        description: t("creditAssessment.savedDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("common.error"),
        description: t("creditAssessment.saveFailed"),
        variant: "destructive",
      });
    },
  });

  const autoAssessMutation = useMutation({
    mutationFn: async (data: { shipperId: string; apply: boolean }) => {
      return apiRequest("POST", `/api/admin/credit-assessments/${data.shipperId}/auto-assess`, {
        apply: data.apply,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/credit-assessments"] });
      toast({
        title: t("creditAssessment.autoAssessComplete"),
        description: variables.apply 
          ? t("creditAssessment.autoAssessApplied") 
          : t("creditAssessment.autoAssessCalculated"),
      });
    },
    onError: () => {
      toast({
        title: t("common.error"),
        description: t("creditAssessment.autoAssessFailed"),
        variant: "destructive",
      });
    },
  });

  const bulkAutoAssessMutation = useMutation({
    mutationFn: async (apply: boolean) => {
      return apiRequest("POST", "/api/admin/credit-assessments/bulk-auto-assess", { apply });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/credit-assessments"] });
      toast({
        title: t("creditAssessment.bulkAssessComplete"),
        description: t("creditAssessment.bulkAssessDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("common.error"),
        description: t("creditAssessment.bulkAssessFailed"),
        variant: "destructive",
      });
    },
  });

  const filteredShippers = shippers?.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.user.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.user.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRisk =
      riskFilter === "all" ||
      (riskFilter === "unassessed" && !item.creditProfile) ||
      item.creditProfile?.riskLevel === riskFilter;

    return matchesSearch && matchesRisk;
  });

  const getRiskBadge = (riskLevel: string | null | undefined) => {
    switch (riskLevel) {
      case "low":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400">{t("creditAssessment.lowRisk")}</Badge>;
      case "medium":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400">{t("creditAssessment.mediumRisk")}</Badge>;
      case "high":
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400">{t("creditAssessment.highRisk")}</Badge>;
      case "critical":
        return <Badge variant="destructive">{t("creditAssessment.criticalRisk")}</Badge>;
      default:
        return <Badge variant="secondary">{t("creditAssessment.notAssessed")}</Badge>;
    }
  };

  const formatCurrency = (amount: string | number | null | undefined) => {
    if (!amount) return "0";
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  const handleOpenAssessment = (shipper: ShipperWithProfile) => {
    setSelectedShipper(shipper);
    const cp = shipper.creditProfile;
    if (cp) {
      setFormData({
        creditLimit: String(cp.creditLimit || "0"),
        creditScore: cp.creditScore || 500,
        riskLevel: (cp.riskLevel as "low" | "medium" | "high" | "critical") || "medium",
        paymentTerms: cp.paymentTerms || 30,
        notes: cp.notes || "",
        rationale: "",
        annualRevenue: String(cp.annualRevenue || ""),
        totalAssets: String(cp.totalAssets || ""),
        debtSummary: cp.debtSummary || "",
        cashFlowRating: (cp.cashFlowRating as any) || "fair",
        liquidityRatio: String(cp.liquidityRatio || ""),
        debtToEquityRatio: String(cp.debtToEquityRatio || ""),
        outstandingDebtAmount: String(cp.outstandingDebtAmount || ""),
        businessYearsInOperation: cp.businessYearsInOperation || 0,
        companyScale: (cp.companyScale as any) || "small",
        paymentHistoryScore: cp.paymentHistoryScore || 50,
        averageDaysToPay: cp.averageDaysToPay || 30,
        latePaymentCount: cp.latePaymentCount || 0,
        reputationRating: (cp.reputationRating as any) || "good",
        gstCompliant: cp.gstCompliant || false,
        gstNumber: cp.gstNumber || "",
        incomeTaxCompliant: cp.incomeTaxCompliant || false,
        dgftRegistered: cp.dgftRegistered || false,
        dgftIecNumber: cp.dgftIecNumber || "",
        hasValidContracts: cp.hasValidContracts || false,
        contractTypes: cp.contractTypes || "",
        confirmedOrdersValue: String(cp.confirmedOrdersValue || ""),
        creditBureauScore: cp.creditBureauScore || 0,
        creditUtilizationPercent: String(cp.creditUtilizationPercent || ""),
        hasPublicRecords: cp.hasPublicRecords || false,
        publicRecordsDetails: cp.publicRecordsDetails || "",
        financialAnalysisNotes: cp.financialAnalysisNotes || "",
        qualitativeAssessmentNotes: cp.qualitativeAssessmentNotes || "",
      });
    } else {
      setFormData({
        creditLimit: "100000",
        creditScore: 500,
        riskLevel: "medium",
        paymentTerms: 30,
        notes: "",
        rationale: "Initial credit assessment",
        annualRevenue: "",
        totalAssets: "",
        debtSummary: "",
        cashFlowRating: "fair",
        liquidityRatio: "",
        debtToEquityRatio: "",
        outstandingDebtAmount: "",
        businessYearsInOperation: 0,
        companyScale: "small",
        paymentHistoryScore: 50,
        averageDaysToPay: 30,
        latePaymentCount: 0,
        reputationRating: "good",
        gstCompliant: false,
        gstNumber: "",
        incomeTaxCompliant: false,
        dgftRegistered: false,
        dgftIecNumber: "",
        hasValidContracts: false,
        contractTypes: "",
        confirmedOrdersValue: "",
        creditBureauScore: 0,
        creditUtilizationPercent: "",
        hasPublicRecords: false,
        publicRecordsDetails: "",
        financialAnalysisNotes: "",
        qualitativeAssessmentNotes: "",
      });
    }
    setIsAssessmentDialogOpen(true);
  };

  const handleOpenHistory = (shipper: ShipperWithProfile) => {
    setSelectedShipper(shipper);
    setIsHistoryDialogOpen(true);
  };

  const handleSubmitAssessment = () => {
    if (!selectedShipper) return;
    assessmentMutation.mutate({
      shipperId: selectedShipper.user.id,
      assessment: formData,
    });
  };

  const stats = {
    total: shippers?.length || 0,
    assessed: shippers?.filter((s) => s.creditProfile).length || 0,
    lowRisk: shippers?.filter((s) => s.creditProfile?.riskLevel === "low").length || 0,
    highRisk: shippers?.filter((s) => s.creditProfile?.riskLevel === "high" || s.creditProfile?.riskLevel === "critical").length || 0,
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="credit-assessment-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <CreditCard className="h-6 w-6" />
            {t("creditAssessment.title")}
          </h1>
          <p className="text-muted-foreground">{t("creditAssessment.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="default" 
            onClick={() => bulkAutoAssessMutation.mutate(true)}
            disabled={bulkAutoAssessMutation.isPending}
            data-testid="button-bulk-auto-assess"
          >
            <Zap className="h-4 w-4 mr-2" />
            {bulkAutoAssessMutation.isPending ? t("common.loading") : t("creditAssessment.runAutoAssessAll")}
          </Button>
          <Button variant="outline" onClick={() => refetch()} data-testid="button-refresh">
            <RefreshCw className="h-4 w-4 mr-2" />
            {t("common.refresh")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("creditAssessment.totalShippers")}</p>
                <p className="text-2xl font-bold" data-testid="text-total-shippers">{stats.total}</p>
              </div>
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("creditAssessment.assessed")}</p>
                <p className="text-2xl font-bold" data-testid="text-assessed">{stats.assessed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("creditAssessment.lowRiskCount")}</p>
                <p className="text-2xl font-bold text-green-600" data-testid="text-low-risk">{stats.lowRisk}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("creditAssessment.highRiskCount")}</p>
                <p className="text-2xl font-bold text-red-600" data-testid="text-high-risk">{stats.highRisk}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("creditAssessment.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-risk-filter">
                <SelectValue placeholder={t("creditAssessment.filterByRisk")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                <SelectItem value="unassessed">{t("creditAssessment.notAssessed")}</SelectItem>
                <SelectItem value="low">{t("creditAssessment.lowRisk")}</SelectItem>
                <SelectItem value="medium">{t("creditAssessment.mediumRisk")}</SelectItem>
                <SelectItem value="high">{t("creditAssessment.highRisk")}</SelectItem>
                <SelectItem value="critical">{t("creditAssessment.criticalRisk")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("creditAssessment.shipper")}</TableHead>
                <TableHead>{t("creditAssessment.contact")}</TableHead>
                <TableHead>{t("creditAssessment.creditLimit")}</TableHead>
                <TableHead>{t("creditAssessment.creditScore")}</TableHead>
                <TableHead>{t("creditAssessment.riskLevel")}</TableHead>
                <TableHead>{t("creditAssessment.lastAssessed")}</TableHead>
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredShippers?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {t("creditAssessment.noShippers")}
                  </TableCell>
                </TableRow>
              ) : (
                filteredShippers?.map((item) => (
                  <TableRow key={item.user.id} data-testid={`row-shipper-${item.user.id}`}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{item.user.companyName || item.user.username}</span>
                        <span className="text-sm text-muted-foreground">{item.user.username}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {item.user.email}
                        </span>
                        {item.user.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {item.user.phone}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.creditProfile ? (
                        <span className="font-medium">{formatCurrency(item.creditProfile.creditLimit)}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.creditProfile ? (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.creditProfile.creditScore}</span>
                          <span className="text-muted-foreground text-xs">/1000</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{getRiskBadge(item.creditProfile?.riskLevel)}</TableCell>
                    <TableCell>
                      {item.creditProfile?.lastAssessmentAt ? (
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(item.creditProfile.lastAssessmentAt), { addSuffix: true })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => autoAssessMutation.mutate({ shipperId: item.user.id, apply: true })}
                          disabled={autoAssessMutation.isPending}
                          data-testid={`button-auto-assess-${item.user.id}`}
                        >
                          <Zap className="h-4 w-4 mr-1" />
                          {t("creditAssessment.runAutoAssess")}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenAssessment(item)}
                          data-testid={`button-assess-${item.user.id}`}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          {item.creditProfile ? t("creditAssessment.update") : t("creditAssessment.assess")}
                        </Button>
                        {item.creditProfile && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenHistory(item)}
                            data-testid={`button-history-${item.user.id}`}
                          >
                            <History className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isAssessmentDialogOpen} onOpenChange={setIsAssessmentDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {selectedShipper?.creditProfile
                ? t("creditAssessment.updateTitle")
                : t("creditAssessment.newTitle")}
            </DialogTitle>
            <DialogDescription>
              {selectedShipper?.user.companyName || selectedShipper?.user.username}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="decision" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="decision" data-testid="tab-decision">
                <Scale className="h-4 w-4 mr-1" />
                {t("creditAssessment.tabDecision")}
              </TabsTrigger>
              <TabsTrigger value="financial" data-testid="tab-financial">
                <CircleDollarSign className="h-4 w-4 mr-1" />
                {t("creditAssessment.tabFinancial")}
              </TabsTrigger>
              <TabsTrigger value="business" data-testid="tab-business">
                <Building2 className="h-4 w-4 mr-1" />
                {t("creditAssessment.tabBusiness")}
              </TabsTrigger>
              <TabsTrigger value="compliance" data-testid="tab-compliance">
                <FileCheck className="h-4 w-4 mr-1" />
                {t("creditAssessment.tabCompliance")}
              </TabsTrigger>
              <TabsTrigger value="credit" data-testid="tab-credit">
                <Landmark className="h-4 w-4 mr-1" />
                {t("creditAssessment.tabCreditHistory")}
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[400px] mt-4 pr-4">
              <TabsContent value="decision" className="space-y-4 mt-0">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="creditLimit">{t("creditAssessment.creditLimit")}</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="creditLimit"
                        type="number"
                        value={formData.creditLimit}
                        onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                        className="pl-10"
                        data-testid="input-credit-limit"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="creditScore">{t("creditAssessment.creditScore")}</Label>
                    <Input
                      id="creditScore"
                      type="number"
                      min={0}
                      max={1000}
                      value={formData.creditScore}
                      onChange={(e) => setFormData({ ...formData, creditScore: parseInt(e.target.value) || 0 })}
                      data-testid="input-credit-score"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="riskLevel">{t("creditAssessment.riskLevel")}</Label>
                    <Select
                      value={formData.riskLevel}
                      onValueChange={(value) => setFormData({ ...formData, riskLevel: value as any })}
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
                  <div className="space-y-2">
                    <Label htmlFor="paymentTerms">{t("creditAssessment.paymentTerms")}</Label>
                    <div className="relative">
                      <Input
                        id="paymentTerms"
                        type="number"
                        min={0}
                        max={365}
                        value={formData.paymentTerms}
                        onChange={(e) => setFormData({ ...formData, paymentTerms: parseInt(e.target.value) || 0 })}
                        data-testid="input-payment-terms"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        {t("creditAssessment.days")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rationale">{t("creditAssessment.rationale")}</Label>
                  <Textarea
                    id="rationale"
                    value={formData.rationale}
                    onChange={(e) => setFormData({ ...formData, rationale: e.target.value })}
                    placeholder={t("creditAssessment.rationalePlaceholder")}
                    rows={3}
                    data-testid="input-rationale"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">{t("creditAssessment.notes")}</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder={t("creditAssessment.notesPlaceholder")}
                    rows={2}
                    data-testid="input-notes"
                  />
                </div>
              </TabsContent>

              <TabsContent value="financial" className="space-y-4 mt-0">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("creditAssessment.annualRevenue")}</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        value={formData.annualRevenue}
                        onChange={(e) => setFormData({ ...formData, annualRevenue: e.target.value })}
                        className="pl-10"
                        placeholder="Annual revenue in INR"
                        data-testid="input-annual-revenue"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("creditAssessment.totalAssets")}</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        value={formData.totalAssets}
                        onChange={(e) => setFormData({ ...formData, totalAssets: e.target.value })}
                        className="pl-10"
                        placeholder="Total assets in INR"
                        data-testid="input-total-assets"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("creditAssessment.cashFlowRating")}</Label>
                    <Select
                      value={formData.cashFlowRating}
                      onValueChange={(value) => setFormData({ ...formData, cashFlowRating: value as any })}
                    >
                      <SelectTrigger data-testid="select-cashflow">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="excellent">{t("creditAssessment.excellent")}</SelectItem>
                        <SelectItem value="good">{t("creditAssessment.good")}</SelectItem>
                        <SelectItem value="fair">{t("creditAssessment.fair")}</SelectItem>
                        <SelectItem value="poor">{t("creditAssessment.poor")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("creditAssessment.outstandingDebt")}</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        value={formData.outstandingDebtAmount}
                        onChange={(e) => setFormData({ ...formData, outstandingDebtAmount: e.target.value })}
                        className="pl-10"
                        data-testid="input-outstanding-debt"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("creditAssessment.liquidityRatio")}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.liquidityRatio}
                      onChange={(e) => setFormData({ ...formData, liquidityRatio: e.target.value })}
                      placeholder="Current ratio (e.g., 1.5)"
                      data-testid="input-liquidity-ratio"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("creditAssessment.debtToEquity")}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.debtToEquityRatio}
                      onChange={(e) => setFormData({ ...formData, debtToEquityRatio: e.target.value })}
                      placeholder="Debt-to-equity ratio"
                      data-testid="input-debt-equity"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t("creditAssessment.debtSummary")}</Label>
                  <Textarea
                    value={formData.debtSummary}
                    onChange={(e) => setFormData({ ...formData, debtSummary: e.target.value })}
                    placeholder="Summary of outstanding debts and liabilities"
                    rows={2}
                    data-testid="input-debt-summary"
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t("creditAssessment.financialNotes")}</Label>
                  <Textarea
                    value={formData.financialAnalysisNotes}
                    onChange={(e) => setFormData({ ...formData, financialAnalysisNotes: e.target.value })}
                    placeholder="Additional notes on financial analysis"
                    rows={2}
                    data-testid="input-financial-notes"
                  />
                </div>
              </TabsContent>

              <TabsContent value="business" className="space-y-4 mt-0">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("creditAssessment.yearsInOperation")}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={formData.businessYearsInOperation}
                      onChange={(e) => setFormData({ ...formData, businessYearsInOperation: parseInt(e.target.value) || 0 })}
                      data-testid="input-years-operation"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("creditAssessment.companyScale")}</Label>
                    <Select
                      value={formData.companyScale}
                      onValueChange={(value) => setFormData({ ...formData, companyScale: value as any })}
                    >
                      <SelectTrigger data-testid="select-company-scale">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">{t("creditAssessment.scaleSmall")}</SelectItem>
                        <SelectItem value="medium">{t("creditAssessment.scaleMedium")}</SelectItem>
                        <SelectItem value="large">{t("creditAssessment.scaleLarge")}</SelectItem>
                        <SelectItem value="enterprise">{t("creditAssessment.scaleEnterprise")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("creditAssessment.reputationRating")}</Label>
                    <Select
                      value={formData.reputationRating}
                      onValueChange={(value) => setFormData({ ...formData, reputationRating: value as any })}
                    >
                      <SelectTrigger data-testid="select-reputation">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="excellent">{t("creditAssessment.excellent")}</SelectItem>
                        <SelectItem value="good">{t("creditAssessment.good")}</SelectItem>
                        <SelectItem value="fair">{t("creditAssessment.fair")}</SelectItem>
                        <SelectItem value="poor">{t("creditAssessment.poor")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("creditAssessment.paymentHistoryScore")}</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={formData.paymentHistoryScore}
                      onChange={(e) => setFormData({ ...formData, paymentHistoryScore: parseInt(e.target.value) || 0 })}
                      data-testid="input-payment-history-score"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("creditAssessment.avgDaysToPay")}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={formData.averageDaysToPay}
                      onChange={(e) => setFormData({ ...formData, averageDaysToPay: parseInt(e.target.value) || 0 })}
                      data-testid="input-avg-days-pay"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("creditAssessment.latePaymentCount")}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={formData.latePaymentCount}
                      onChange={(e) => setFormData({ ...formData, latePaymentCount: parseInt(e.target.value) || 0 })}
                      data-testid="input-late-payments"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t("creditAssessment.businessNotes")}</Label>
                  <Textarea
                    value={formData.qualitativeAssessmentNotes}
                    onChange={(e) => setFormData({ ...formData, qualitativeAssessmentNotes: e.target.value })}
                    placeholder="Additional notes on business profile"
                    rows={2}
                    data-testid="input-business-notes"
                  />
                </div>
              </TabsContent>

              <TabsContent value="compliance" className="space-y-4 mt-0">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="gstCompliant"
                      checked={formData.gstCompliant}
                      onCheckedChange={(checked) => setFormData({ ...formData, gstCompliant: !!checked })}
                      data-testid="checkbox-gst"
                    />
                    <Label htmlFor="gstCompliant" className="font-normal">
                      {t("creditAssessment.gstCompliant")}
                    </Label>
                  </div>
                  {formData.gstCompliant && (
                    <div className="space-y-2 ml-6">
                      <Label>{t("creditAssessment.gstNumber")}</Label>
                      <Input
                        value={formData.gstNumber}
                        onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                        placeholder="GSTIN (e.g., 22AAAAA0000A1Z5)"
                        data-testid="input-gst-number"
                      />
                    </div>
                  )}

                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="incomeTaxCompliant"
                      checked={formData.incomeTaxCompliant}
                      onCheckedChange={(checked) => setFormData({ ...formData, incomeTaxCompliant: !!checked })}
                      data-testid="checkbox-income-tax"
                    />
                    <Label htmlFor="incomeTaxCompliant" className="font-normal">
                      {t("creditAssessment.incomeTaxCompliant")}
                    </Label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="dgftRegistered"
                      checked={formData.dgftRegistered}
                      onCheckedChange={(checked) => setFormData({ ...formData, dgftRegistered: !!checked })}
                      data-testid="checkbox-dgft"
                    />
                    <Label htmlFor="dgftRegistered" className="font-normal">
                      {t("creditAssessment.dgftRegistered")}
                    </Label>
                  </div>
                  {formData.dgftRegistered && (
                    <div className="space-y-2 ml-6">
                      <Label>{t("creditAssessment.dgftIecNumber")}</Label>
                      <Input
                        value={formData.dgftIecNumber}
                        onChange={(e) => setFormData({ ...formData, dgftIecNumber: e.target.value })}
                        placeholder="IEC Number (e.g., 0300000000)"
                        data-testid="input-iec-number"
                      />
                    </div>
                  )}

                  <Separator />

                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="hasValidContracts"
                      checked={formData.hasValidContracts}
                      onCheckedChange={(checked) => setFormData({ ...formData, hasValidContracts: !!checked })}
                      data-testid="checkbox-contracts"
                    />
                    <Label htmlFor="hasValidContracts" className="font-normal">
                      {t("creditAssessment.hasValidContracts")}
                    </Label>
                  </div>
                  {formData.hasValidContracts && (
                    <div className="grid grid-cols-2 gap-4 ml-6">
                      <div className="space-y-2">
                        <Label>{t("creditAssessment.contractTypes")}</Label>
                        <Input
                          value={formData.contractTypes}
                          onChange={(e) => setFormData({ ...formData, contractTypes: e.target.value })}
                          placeholder="PO, LC, Bank Guarantee, etc."
                          data-testid="input-contract-types"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("creditAssessment.confirmedOrdersValue")}</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="number"
                            value={formData.confirmedOrdersValue}
                            onChange={(e) => setFormData({ ...formData, confirmedOrdersValue: e.target.value })}
                            className="pl-10"
                            data-testid="input-orders-value"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="credit" className="space-y-4 mt-0">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("creditAssessment.creditBureauScore")}</Label>
                    <Input
                      type="number"
                      min={300}
                      max={900}
                      value={formData.creditBureauScore}
                      onChange={(e) => setFormData({ ...formData, creditBureauScore: parseInt(e.target.value) || 0 })}
                      placeholder="CIBIL/Experian score (300-900)"
                      data-testid="input-bureau-score"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("creditAssessment.creditUtilization")}</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step="0.1"
                        value={formData.creditUtilizationPercent}
                        onChange={(e) => setFormData({ ...formData, creditUtilizationPercent: e.target.value })}
                        data-testid="input-credit-utilization"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="hasPublicRecords"
                      checked={formData.hasPublicRecords}
                      onCheckedChange={(checked) => setFormData({ ...formData, hasPublicRecords: !!checked })}
                      data-testid="checkbox-public-records"
                    />
                    <Label htmlFor="hasPublicRecords" className="font-normal text-destructive">
                      {t("creditAssessment.hasPublicRecords")}
                    </Label>
                  </div>
                  {formData.hasPublicRecords && (
                    <div className="space-y-2 ml-6">
                      <Label>{t("creditAssessment.publicRecordsDetails")}</Label>
                      <Textarea
                        value={formData.publicRecordsDetails}
                        onChange={(e) => setFormData({ ...formData, publicRecordsDetails: e.target.value })}
                        placeholder="Details of bankruptcies, liens, lawsuits, or legal issues"
                        rows={3}
                        data-testid="input-public-records-details"
                      />
                    </div>
                  )}
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsAssessmentDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleSubmitAssessment}
              disabled={assessmentMutation.isPending}
              data-testid="button-save-assessment"
            >
              {assessmentMutation.isPending ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              {t("creditAssessment.historyTitle")}
            </DialogTitle>
            <DialogDescription>
              {selectedShipper?.user.companyName || selectedShipper?.user.username}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {evaluationHistory?.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {t("creditAssessment.noHistory")}
              </p>
            ) : (
              evaluationHistory?.map((evaluation) => (
                <Card key={evaluation.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={evaluation.decision === "approved" ? "default" : "secondary"}>
                            {evaluation.decision}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {evaluation.evaluatedAt && format(new Date(evaluation.evaluatedAt), "PPp")}
                          </span>
                        </div>
                        {evaluation.rationale && (
                          <p className="text-sm">{evaluation.rationale}</p>
                        )}
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          {evaluation.previousCreditLimit !== evaluation.newCreditLimit && (
                            <span>
                              {t("creditAssessment.limit")}: {formatCurrency(evaluation.previousCreditLimit)} <ChevronRight className="inline h-3 w-3" /> {formatCurrency(evaluation.newCreditLimit)}
                            </span>
                          )}
                          {evaluation.previousRiskLevel !== evaluation.newRiskLevel && (
                            <span>
                              {t("creditAssessment.risk")}: {evaluation.previousRiskLevel || "-"} <ChevronRight className="inline h-3 w-3" /> {evaluation.newRiskLevel}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
