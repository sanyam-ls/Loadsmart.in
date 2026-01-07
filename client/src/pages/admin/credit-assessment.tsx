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
    creditLimit: "",
    creditScore: 500,
    riskLevel: "medium" as "low" | "medium" | "high" | "critical",
    paymentTerms: 30,
    notes: "",
    rationale: "",
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
      return apiRequest("POST", `/api/admin/credit-assessments/${data.shipperId}`, {
        creditLimit: data.assessment.creditLimit,
        creditScore: data.assessment.creditScore,
        riskLevel: data.assessment.riskLevel,
        paymentTerms: data.assessment.paymentTerms,
        notes: data.assessment.notes,
        rationale: data.assessment.rationale,
      });
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
    if (shipper.creditProfile) {
      setFormData({
        creditLimit: String(shipper.creditProfile.creditLimit || "0"),
        creditScore: shipper.creditProfile.creditScore || 500,
        riskLevel: (shipper.creditProfile.riskLevel as "low" | "medium" | "high" | "critical") || "medium",
        paymentTerms: shipper.creditProfile.paymentTerms || 30,
        notes: shipper.creditProfile.notes || "",
        rationale: "",
      });
    } else {
      setFormData({
        creditLimit: "100000",
        creditScore: 500,
        riskLevel: "medium",
        paymentTerms: 30,
        notes: "",
        rationale: "Initial credit assessment",
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
        <Button variant="outline" onClick={() => refetch()} data-testid="button-refresh">
          <RefreshCw className="h-4 w-4 mr-2" />
          {t("common.refresh")}
        </Button>
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
        <DialogContent className="max-w-lg">
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

          <div className="space-y-4 py-4">
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
          </div>

          <DialogFooter>
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
