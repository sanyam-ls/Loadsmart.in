import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Activity, 
  FileText, 
  History, 
  Terminal,
  Send,
  RotateCcw,
  FileWarning,
  Zap,
  Clock,
  User,
  Package,
  ArrowRight,
  RefreshCw,
  Copy,
  ChevronDown,
  Shield,
  Eye,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface LoadDiagnostics {
  loadBasics: {
    id: string;
    status: string;
    pickupCity: string;
    dropoffCity: string;
    distance: string;
    weight: string;
    requiredTruckType: string;
    finalPrice: string | null;
    adminFinalPrice: string | null;
    hasFinalPrice: boolean;
    createdAt: string;
    submittedAt: string | null;
    postedAt: string | null;
  };
  shipperInfo: {
    id: string;
    username: string;
    companyName: string | null;
    isVerified: boolean;
    kycVerified: boolean;
  } | null;
  pricingInfo: {
    id: string;
    status: string;
    suggestedPrice: string;
    finalPrice: string | null;
    requiresApproval: boolean;
    approvedAt: string | null;
    rejectedAt: string | null;
    rejectionReason: string | null;
  } | null;
  invoiceInfo: {
    id: string;
    invoiceNumber: string;
    status: string;
    totalAmount: string;
    sentAt: string | null;
    paidAt: string | null;
  } | null;
  bidsCount: number;
  auditLogCount: number;
  recentApiLogs: ApiLog[];
  pendingActions: ActionQueueItem[];
  healthChecks: {
    hasPricing: boolean;
    hasInvoice: boolean;
    isPosted: boolean;
    hasValidPrice: boolean;
    shipperVerified: boolean;
  };
}

interface AuditLog {
  id: string;
  adminId: string;
  loadId: string | null;
  actionType: string;
  actionDescription: string;
  reason: string | null;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface ApiLog {
  id: string;
  loadId: string | null;
  endpoint: string;
  method: string;
  requestBody: Record<string, unknown> | null;
  responseStatus: number | null;
  responseBody: Record<string, unknown> | null;
  errorMessage: string | null;
  durationMs: number | null;
  createdAt: string;
}

interface ActionQueueItem {
  id: string;
  loadId: string;
  actionType: string;
  payload: Record<string, unknown>;
  status: string;
  priority: number;
  retryCount: number;
  lastError: string | null;
  processedAt: string | null;
  createdBy: string;
  createdAt: string;
}

function formatCurrency(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined) return "Rs. 0";
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `Rs. ${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function StatusBadge({ value, good, label }: { value: boolean; good: boolean; label: string }) {
  const isHealthy = value === good;
  return (
    <div className="flex items-center gap-2">
      {isHealthy ? (
        <CheckCircle className="h-4 w-4 text-green-500" />
      ) : (
        <XCircle className="h-4 w-4 text-red-500" />
      )}
      <span className={isHealthy ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}>
        {label}
      </span>
    </div>
  );
}

export default function TroubleshootDashboard() {
  const { toast } = useToast();
  const [loadIdInput, setLoadIdInput] = useState("");
  const [selectedLoadId, setSelectedLoadId] = useState<string | null>(null);
  const [forcePostDialogOpen, setForcePostDialogOpen] = useState(false);
  const [forcePostReason, setForcePostReason] = useState("");
  const [forcePostMode, setForcePostMode] = useState("open");
  const [forcePostPrice, setForcePostPrice] = useState("");
  const [generateInvoiceDialogOpen, setGenerateInvoiceDialogOpen] = useState(false);
  const [invoiceProvisional, setInvoiceProvisional] = useState(false);
  const [invoiceNotes, setInvoiceNotes] = useState("");

  const { data: diagnostics, isLoading: loadingDiagnostics, refetch: refetchDiagnostics } = useQuery<LoadDiagnostics>({
    queryKey: ['/api/admin/troubleshoot/load', selectedLoadId],
    enabled: !!selectedLoadId,
  });

  const { data: auditTrail, isLoading: loadingAudit } = useQuery<AuditLog[]>({
    queryKey: ['/api/admin/troubleshoot/audit-trail', selectedLoadId],
    enabled: !!selectedLoadId,
  });

  const { data: apiLogs, isLoading: loadingApiLogs } = useQuery<ApiLog[]>({
    queryKey: ['/api/admin/troubleshoot/api-logs', selectedLoadId],
    enabled: !!selectedLoadId,
  });

  const { data: pendingQueue } = useQuery<ActionQueueItem[]>({
    queryKey: ['/api/admin/troubleshoot/queue'],
  });

  const forcePostMutation = useMutation({
    mutationFn: async (data: { loadId: string; reason: string; postMode: string; finalPrice?: string }) => {
      return await apiRequest("POST", `/api/admin/troubleshoot/force-post/${data.loadId}`, {
        reason: data.reason,
        postMode: data.postMode,
        finalPrice: data.finalPrice,
      });
    },
    onSuccess: () => {
      toast({ title: "Load Force Posted", description: "The load has been force posted successfully." });
      setForcePostDialogOpen(false);
      setForcePostReason("");
      queryClient.invalidateQueries({ queryKey: ['/api/admin/troubleshoot/load', selectedLoadId] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const generateInvoiceMutation = useMutation({
    mutationFn: async (data: { loadId: string; provisional: boolean; notes: string }) => {
      return await apiRequest("POST", `/api/admin/troubleshoot/generate-invoice/${data.loadId}`, {
        provisional: data.provisional,
        notes: data.notes,
      });
    },
    onSuccess: () => {
      toast({ title: "Invoice Generated", description: "The invoice has been created successfully." });
      setGenerateInvoiceDialogOpen(false);
      setInvoiceNotes("");
      queryClient.invalidateQueries({ queryKey: ['/api/admin/troubleshoot/load', selectedLoadId] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const sendInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      return await apiRequest("POST", `/api/admin/troubleshoot/send-invoice/${invoiceId}`, {
        channel: "email",
      });
    },
    onSuccess: () => {
      toast({ title: "Invoice Sent", description: "The invoice has been sent to the shipper." });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/troubleshoot/load', selectedLoadId] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSearch = () => {
    if (loadIdInput.trim()) {
      setSelectedLoadId(loadIdInput.trim());
    }
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast({ title: "Copied", description: "ID copied to clipboard." });
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Shield className="h-6 w-6" />
          Admin Troubleshooting Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Diagnose load issues, force actions, and view audit trails
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Load Lookup</CardTitle>
          <CardDescription>Enter a Load ID to diagnose issues</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Enter Load ID..."
                value={loadIdInput}
                onChange={(e) => setLoadIdInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                data-testid="input-load-id"
              />
            </div>
            <Button onClick={handleSearch} data-testid="button-search-load">
              <Search className="h-4 w-4 mr-2" />
              Lookup
            </Button>
            {selectedLoadId && (
              <Button variant="outline" onClick={() => refetchDiagnostics()} data-testid="button-refresh">
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {loadingDiagnostics && selectedLoadId && (
        <Card>
          <CardContent className="py-12 text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="mt-2 text-muted-foreground">Loading diagnostics...</p>
          </CardContent>
        </Card>
      )}

      {!selectedLoadId && !loadingDiagnostics && (
        <Card>
          <CardContent className="py-16 text-center">
            <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No Load Selected</h3>
            <p className="text-muted-foreground mt-1">Enter a Load ID above to start troubleshooting</p>
          </CardContent>
        </Card>
      )}

      {diagnostics && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" data-testid="tab-overview">
              <Activity className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="actions" data-testid="tab-actions">
              <Zap className="h-4 w-4 mr-2" />
              Actions
            </TabsTrigger>
            <TabsTrigger value="invoices" data-testid="tab-invoices">
              <FileText className="h-4 w-4 mr-2" />
              Invoices
            </TabsTrigger>
            <TabsTrigger value="audit" data-testid="tab-audit">
              <History className="h-4 w-4 mr-2" />
              Audit Trail
            </TabsTrigger>
            <TabsTrigger value="api-logs" data-testid="tab-api-logs">
              <Terminal className="h-4 w-4 mr-2" />
              API Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <CardTitle className="text-base">Load Details</CardTitle>
                    <Badge variant={diagnostics.loadBasics.status === 'posted_open' ? 'default' : 'secondary'}>
                      {diagnostics.loadBasics.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">ID:</span>
                    <code className="bg-muted px-2 py-1 rounded text-xs">{diagnostics.loadBasics.id}</code>
                    <Button size="icon" variant="ghost" onClick={() => handleCopyId(diagnostics.loadBasics.id)} data-testid="button-copy-load-id">
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span>{diagnostics.loadBasics.pickupCity}</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span>{diagnostics.loadBasics.dropoffCity}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Distance:</span>
                      <span className="ml-2">{diagnostics.loadBasics.distance} km</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Weight:</span>
                      <span className="ml-2">{diagnostics.loadBasics.weight} tons</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Truck Type:</span>
                      <span className="ml-2">{diagnostics.loadBasics.requiredTruckType}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Final Price:</span>
                      <span className="ml-2 font-medium">
                        {formatCurrency(diagnostics.loadBasics.adminFinalPrice || diagnostics.loadBasics.finalPrice)}
                      </span>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Created:</span>
                      <span className="ml-2">{formatDate(diagnostics.loadBasics.createdAt)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Submitted:</span>
                      <span className="ml-2">{formatDate(diagnostics.loadBasics.submittedAt)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Posted:</span>
                      <span className="ml-2">{formatDate(diagnostics.loadBasics.postedAt)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Bids:</span>
                      <span className="ml-2">{diagnostics.bidsCount}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Health Checks</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <StatusBadge value={diagnostics.healthChecks.hasValidPrice} good={true} label="Has Valid Price" />
                  <StatusBadge value={diagnostics.healthChecks.hasPricing} good={true} label="Has Pricing Record" />
                  <StatusBadge value={diagnostics.healthChecks.isPosted} good={true} label="Is Posted" />
                  <StatusBadge value={diagnostics.healthChecks.hasInvoice} good={true} label="Has Invoice" />
                  <StatusBadge value={diagnostics.healthChecks.shipperVerified} good={true} label="Shipper Verified" />
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Shipper Info
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {diagnostics.shipperInfo ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Username:</span>
                        <span>{diagnostics.shipperInfo.username}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Company:</span>
                        <span>{diagnostics.shipperInfo.companyName || "N/A"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Verified:</span>
                        {diagnostics.shipperInfo.isVerified ? (
                          <Badge variant="default" className="bg-green-500">Verified</Badge>
                        ) : (
                          <Badge variant="secondary">Not Verified</Badge>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">No shipper info available</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Pricing Info</CardTitle>
                </CardHeader>
                <CardContent>
                  {diagnostics.pricingInfo ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge variant={diagnostics.pricingInfo.status === 'approved' ? 'default' : 'secondary'}>
                          {diagnostics.pricingInfo.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Suggested:</span>
                        <span>{formatCurrency(diagnostics.pricingInfo.suggestedPrice)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Final:</span>
                        <span className="font-medium">{formatCurrency(diagnostics.pricingInfo.finalPrice)}</span>
                      </div>
                      {diagnostics.pricingInfo.rejectionReason && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Rejection:</span>
                          <span className="text-red-600">{diagnostics.pricingInfo.rejectionReason}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">No pricing record found</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="actions" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Force Post Load
                  </CardTitle>
                  <CardDescription>
                    Bypass normal workflow and force post this load
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Dialog open={forcePostDialogOpen} onOpenChange={setForcePostDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="destructive" 
                        className="w-full"
                        disabled={diagnostics.healthChecks.isPosted}
                        data-testid="button-force-post"
                      >
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Force Post
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Force Post Load</DialogTitle>
                        <DialogDescription>
                          This action bypasses normal approval workflow. Please provide a reason.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Post Mode</Label>
                          <Select value={forcePostMode} onValueChange={setForcePostMode}>
                            <SelectTrigger data-testid="select-post-mode">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="open">Open to All Carriers</SelectItem>
                              <SelectItem value="invite">Invite Only</SelectItem>
                              <SelectItem value="assign">Direct Assignment</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Override Price (Optional)</Label>
                          <Input
                            placeholder="Leave empty to use existing price"
                            value={forcePostPrice}
                            onChange={(e) => setForcePostPrice(e.target.value)}
                            data-testid="input-force-post-price"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Reason for Force Post *</Label>
                          <Textarea
                            placeholder="Explain why this load needs to be force posted..."
                            value={forcePostReason}
                            onChange={(e) => setForcePostReason(e.target.value)}
                            data-testid="textarea-force-post-reason"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setForcePostDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => {
                            if (selectedLoadId && forcePostReason) {
                              forcePostMutation.mutate({
                                loadId: selectedLoadId,
                                reason: forcePostReason,
                                postMode: forcePostMode,
                                finalPrice: forcePostPrice || undefined,
                              });
                            }
                          }}
                          disabled={!forcePostReason || forcePostMutation.isPending}
                          data-testid="button-confirm-force-post"
                        >
                          {forcePostMutation.isPending ? "Processing..." : "Force Post"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Rollback Price
                  </CardTitle>
                  <CardDescription>
                    Revert to a previous pricing version
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    disabled={!diagnostics.pricingInfo}
                    data-testid="button-rollback-price"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Rollback to Previous Price
                  </Button>
                </CardContent>
              </Card>
            </div>

            {pendingQueue && pendingQueue.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Pending Action Queue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-48">
                    <div className="space-y-2">
                      {pendingQueue.map((action) => (
                        <div key={action.id} className="flex items-center justify-between p-2 bg-muted rounded">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{action.actionType}</Badge>
                            <span className="text-sm">{action.loadId}</span>
                          </div>
                          <Button size="sm" variant="ghost" data-testid={`button-process-action-${action.id}`}>
                            Process
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="invoices" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Current Invoice</CardTitle>
                </CardHeader>
                <CardContent>
                  {diagnostics.invoiceInfo ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Invoice #</span>
                        <code className="bg-muted px-2 py-1 rounded text-sm">{diagnostics.invoiceInfo.invoiceNumber}</code>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Status</span>
                        <Badge variant={diagnostics.invoiceInfo.status === 'paid' ? 'default' : 'secondary'}>
                          {diagnostics.invoiceInfo.status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Amount</span>
                        <span className="font-medium">{formatCurrency(diagnostics.invoiceInfo.totalAmount)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Sent</span>
                        <span>{formatDate(diagnostics.invoiceInfo.sentAt)}</span>
                      </div>
                      <Separator />
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => sendInvoiceMutation.mutate(diagnostics.invoiceInfo!.id)}
                        disabled={sendInvoiceMutation.isPending}
                        data-testid="button-resend-invoice"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        {sendInvoiceMutation.isPending ? "Sending..." : "Resend Invoice"}
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <FileWarning className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground text-sm">No invoice exists for this load</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Generate Invoice</CardTitle>
                  <CardDescription>
                    Create a standalone or provisional invoice
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Dialog open={generateInvoiceDialogOpen} onOpenChange={setGenerateInvoiceDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        className="w-full"
                        disabled={!!diagnostics.invoiceInfo}
                        data-testid="button-generate-invoice"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Generate Invoice
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Generate Invoice</DialogTitle>
                        <DialogDescription>
                          Create an invoice for this load. Use provisional for pending confirmations.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="provisional"
                            checked={invoiceProvisional}
                            onChange={(e) => setInvoiceProvisional(e.target.checked)}
                            data-testid="checkbox-provisional"
                          />
                          <Label htmlFor="provisional">Create as Provisional Invoice</Label>
                        </div>
                        <div className="space-y-2">
                          <Label>Notes (Optional)</Label>
                          <Textarea
                            placeholder="Add any notes for this invoice..."
                            value={invoiceNotes}
                            onChange={(e) => setInvoiceNotes(e.target.value)}
                            data-testid="textarea-invoice-notes"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setGenerateInvoiceDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button
                          onClick={() => {
                            if (selectedLoadId) {
                              generateInvoiceMutation.mutate({
                                loadId: selectedLoadId,
                                provisional: invoiceProvisional,
                                notes: invoiceNotes,
                              });
                            }
                          }}
                          disabled={generateInvoiceMutation.isPending}
                          data-testid="button-confirm-generate-invoice"
                        >
                          {generateInvoiceMutation.isPending ? "Generating..." : "Generate"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="audit" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Audit Trail
                </CardTitle>
                <CardDescription>
                  Complete history of admin actions on this load
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingAudit ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </div>
                ) : auditTrail && auditTrail.length > 0 ? (
                  <ScrollArea className="h-96">
                    <Accordion type="single" collapsible className="w-full">
                      {auditTrail.map((log, index) => (
                        <AccordionItem key={log.id} value={log.id}>
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-3">
                              <Badge variant="outline">{log.actionType}</Badge>
                              <span className="text-sm text-muted-foreground">
                                {formatDate(log.createdAt)}
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-2 p-3 bg-muted rounded">
                              <p className="text-sm">{log.actionDescription}</p>
                              {log.reason && (
                                <div className="text-sm">
                                  <span className="text-muted-foreground">Reason: </span>
                                  <span>{log.reason}</span>
                                </div>
                              )}
                              {log.beforeState && (
                                <Collapsible>
                                  <CollapsibleTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <ChevronDown className="h-3 w-3 mr-1" />
                                      Before State
                                    </Button>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent>
                                    <pre className="text-xs bg-background p-2 rounded overflow-x-auto">
                                      {JSON.stringify(log.beforeState, null, 2)}
                                    </pre>
                                  </CollapsibleContent>
                                </Collapsible>
                              )}
                              {log.afterState && (
                                <Collapsible>
                                  <CollapsibleTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <ChevronDown className="h-3 w-3 mr-1" />
                                      After State
                                    </Button>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent>
                                    <pre className="text-xs bg-background p-2 rounded overflow-x-auto">
                                      {JSON.stringify(log.afterState, null, 2)}
                                    </pre>
                                  </CollapsibleContent>
                                </Collapsible>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8">
                    <Eye className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No audit logs for this load</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="api-logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Terminal className="h-4 w-4" />
                  API Response Logs
                </CardTitle>
                <CardDescription>
                  Recent API calls related to this load
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingApiLogs ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </div>
                ) : apiLogs && apiLogs.length > 0 ? (
                  <ScrollArea className="h-96">
                    <div className="space-y-2">
                      {apiLogs.map((log) => (
                        <Collapsible key={log.id}>
                          <CollapsibleTrigger asChild>
                            <div className="flex items-center justify-between p-3 bg-muted rounded cursor-pointer hover-elevate">
                              <div className="flex items-center gap-3">
                                <Badge 
                                  variant={log.responseStatus && log.responseStatus >= 400 ? 'destructive' : 'default'}
                                >
                                  {log.method}
                                </Badge>
                                <code className="text-xs">{log.endpoint}</code>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                  {log.durationMs}ms
                                </span>
                                <Badge variant="outline">{log.responseStatus || 'N/A'}</Badge>
                              </div>
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="p-3 border-l-2 border-muted ml-2 mt-1 space-y-2">
                              <div className="text-xs text-muted-foreground">
                                {formatDate(log.createdAt)}
                              </div>
                              {log.requestBody && (
                                <div>
                                  <span className="text-xs font-medium">Request:</span>
                                  <pre className="text-xs bg-background p-2 rounded overflow-x-auto mt-1">
                                    {JSON.stringify(log.requestBody, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.responseBody && (
                                <div>
                                  <span className="text-xs font-medium">Response:</span>
                                  <pre className="text-xs bg-background p-2 rounded overflow-x-auto mt-1">
                                    {JSON.stringify(log.responseBody, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.errorMessage && (
                                <div className="text-xs text-red-600">
                                  <span className="font-medium">Error: </span>
                                  {log.errorMessage}
                                </div>
                              )}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8">
                    <Terminal className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No API logs for this load</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
