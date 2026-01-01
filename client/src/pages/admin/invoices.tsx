import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  FileText, Send, Check, Clock, AlertCircle, DollarSign,
  Search, Filter, Eye, RefreshCw, MessageSquare, History,
  CheckCircle, XCircle, ArrowLeftRight, ChevronDown, ChevronUp, Star,
  User, Building2, Phone, Truck, Award, MapPin
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { connectMarketplace, disconnectMarketplace, onMarketplaceEvent } from "@/lib/marketplace-socket";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

interface CounterOffer {
  id: string;
  proposedAmount: string;
  reason: string;
  proposedBy: "shipper" | "admin";
  status: "pending" | "accepted" | "rejected";
  createdAt: Date;
  respondedAt?: Date;
  responseNote?: string;
}

interface CarrierDetails {
  id: string;
  name: string;
  companyName?: string;
  phone?: string;
  carrierType: 'solo' | 'enterprise';
  tripsCompleted: number;
}

interface DriverDetails {
  id: string;
  name: string;
  phone?: string;
  licenseNumber?: string;
}

interface TruckDetails {
  id: string;
  registrationNumber: string;
  truckType?: string;
  capacity?: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  loadId: string;
  shipperId: string;
  shipper?: { companyName?: string; username: string };
  load?: { pickupCity: string; dropoffCity: string; status: string };
  subtotal: string;
  taxAmount: string;
  taxPercent?: number;
  totalAmount: string;
  status: string;
  shipperStatus?: "pending" | "viewed" | "acknowledged" | "countered" | "paid";
  acknowledgedAt?: string;
  paidAt?: string;
  counterOffers?: CounterOffer[];
  createdAt: string;
  sentAt?: string;
  dueDate?: string;
  shipperCounterAmount?: string;
  shipperResponseMessage?: string;
  counterContactName?: string;
  counterContactCompany?: string;
  counterContactPhone?: string;
  counterContactAddress?: string;
  counterReason?: string;
  counteredAt?: string;
  advancePaymentPercent?: number;
  lineItems?: { description: string; amount: string }[];
  pickupCity?: string;
  dropoffCity?: string;
  loadRoute?: string;
  carrier?: CarrierDetails;
  driver?: DriverDetails;
  truck?: TruckDetails;
}

const simulatedInvoices: Invoice[] = [
  {
    id: "INV-001",
    invoiceNumber: "INV-2024-001",
    loadId: "LOAD-1",
    shipperId: "SHP-1",
    shipper: { companyName: "Tata Steel", username: "tatasteel" },
    load: { pickupCity: "Mumbai", dropoffCity: "Delhi", status: "delivered" },
    subtotal: "45000",
    taxAmount: "8100",
    totalAmount: "53100",
    status: "paid",
    shipperStatus: "paid",
    acknowledgedAt: "2024-12-10T10:30:00Z",
    paidAt: "2024-12-12T14:20:00Z",
    createdAt: "2024-12-08T09:00:00Z",
    sentAt: "2024-12-08T09:30:00Z",
    dueDate: "2024-12-22",
  },
  {
    id: "INV-002",
    invoiceNumber: "INV-2024-002",
    loadId: "LOAD-2",
    shipperId: "SHP-2",
    shipper: { companyName: "Reliance Industries", username: "reliance" },
    load: { pickupCity: "Chennai", dropoffCity: "Bangalore", status: "in_transit" },
    subtotal: "35000",
    taxAmount: "6300",
    totalAmount: "41300",
    status: "sent",
    shipperStatus: "acknowledged",
    acknowledgedAt: "2024-12-14T16:45:00Z",
    createdAt: "2024-12-12T11:00:00Z",
    sentAt: "2024-12-12T11:15:00Z",
    dueDate: "2024-12-26",
  },
  {
    id: "INV-004",
    invoiceNumber: "INV-2024-004",
    loadId: "LOAD-4",
    shipperId: "SHP-1",
    shipper: { companyName: "Tata Steel", username: "tatasteel" },
    load: { pickupCity: "Kolkata", dropoffCity: "Bhubaneswar", status: "delivered" },
    subtotal: "22000",
    taxAmount: "3960",
    totalAmount: "25960",
    status: "sent",
    shipperStatus: "viewed",
    createdAt: "2024-12-14T07:00:00Z",
    sentAt: "2024-12-14T07:30:00Z",
    dueDate: "2024-12-28",
  },
  {
    id: "INV-005",
    invoiceNumber: "INV-2024-005",
    loadId: "LOAD-5",
    shipperId: "SHP-4",
    shipper: { companyName: "Hindustan Unilever", username: "hul" },
    load: { pickupCity: "Ahmedabad", dropoffCity: "Jaipur", status: "finalized" },
    subtotal: "18000",
    taxAmount: "3240",
    totalAmount: "21240",
    status: "draft",
    shipperStatus: "pending",
    createdAt: "2024-12-15T06:00:00Z",
    dueDate: "2024-12-29",
  },
  {
    id: "INV-006",
    invoiceNumber: "INV-2024-006",
    loadId: "LOAD-6",
    shipperId: "SHP-2",
    shipper: { companyName: "Reliance Industries", username: "reliance" },
    load: { pickupCity: "Surat", dropoffCity: "Nagpur", status: "delivered" },
    subtotal: "32000",
    taxAmount: "5760",
    totalAmount: "37760",
    status: "overdue",
    shipperStatus: "acknowledged",
    acknowledgedAt: "2024-12-01T11:00:00Z",
    createdAt: "2024-11-25T09:00:00Z",
    sentAt: "2024-11-25T09:30:00Z",
    dueDate: "2024-12-09",
  },
];

function getStatusBadge(status: string) {
  switch (status) {
    case "draft":
      return <Badge variant="outline" data-testid="badge-status-draft"><Clock className="h-3 w-3 mr-1" />Draft</Badge>;
    case "sent":
      return <Badge variant="secondary" data-testid="badge-status-sent"><Send className="h-3 w-3 mr-1" />Sent</Badge>;
    case "approved":
    case "acknowledged":
      return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" data-testid="badge-status-acknowledged"><Check className="h-3 w-3 mr-1" />Acknowledged</Badge>;
    case "paid":
      return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" data-testid="badge-status-paid"><DollarSign className="h-3 w-3 mr-1" />Paid</Badge>;
    case "overdue":
      return <Badge variant="destructive" data-testid="badge-status-overdue"><AlertCircle className="h-3 w-3 mr-1" />Overdue</Badge>;
    default:
      return <Badge variant="outline" data-testid="badge-status-unknown">{status}</Badge>;
  }
}

function getShipperStatusBadge(status?: string) {
  switch (status) {
    case "pending":
      return <Badge variant="outline" className="text-xs"><Clock className="h-3 w-3 mr-1" />Not Viewed</Badge>;
    case "viewed":
      return <Badge variant="secondary" className="text-xs"><Eye className="h-3 w-3 mr-1" />Viewed</Badge>;
    case "acknowledged":
      return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs"><CheckCircle className="h-3 w-3 mr-1" />Acknowledged</Badge>;
    case "countered":
      return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs"><ArrowLeftRight className="h-3 w-3 mr-1" />Countered</Badge>;
    case "paid":
      return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs"><DollarSign className="h-3 w-3 mr-1" />Paid</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">-</Badge>;
  }
}

export default function AdminInvoicesPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [shipperStatusFilter, setShipperStatusFilter] = useState("all");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [markPaidConfirmOpen, setMarkPaidConfirmOpen] = useState(false);
  const [invoiceToMarkPaid, setInvoiceToMarkPaid] = useState<string | null>(null);

  const { data: apiInvoices = [], isLoading, refetch } = useQuery<Invoice[]>({
    queryKey: ["/api/admin/invoices"],
  });

  useEffect(() => {
    if (user?.id && user?.role === "admin") {
      connectMarketplace("admin", user.id);
      
      const unsubInvoice = onMarketplaceEvent("invoice_update", (data) => {
        if (data.event === "invoice_viewed") {
          toast({
            title: "Invoice Viewed",
            description: `Invoice ${data.invoice?.invoiceNumber || data.invoiceId} has been viewed by shipper.`,
          });
          refetch();
        } else if (data.event === "invoice_acknowledged") {
          toast({
            title: "Invoice Acknowledged",
            description: `Invoice ${data.invoice?.invoiceNumber || data.invoiceId} has been acknowledged by shipper.`,
          });
          refetch();
        } else if (data.event === "invoice_opened") {
          toast({
            title: "Invoice Opened",
            description: `Invoice ${data.invoice?.invoiceNumber || data.invoiceId} has been opened by shipper.`,
          });
          refetch();
        } else if (data.event === "invoice_paid") {
          toast({
            title: "Payment Received",
            description: `Invoice ${data.invoice?.invoiceNumber || data.invoiceId} has been paid.`,
          });
          refetch();
        } else if (data.event === "invoice_countered") {
          toast({
            title: "Counter Offer Received",
            description: `Shipper submitted a counter offer for invoice ${data.invoice?.invoiceNumber || data.invoiceId}.`,
          });
          refetch();
        }
      });

      return () => {
        unsubInvoice();
        disconnectMarketplace();
      };
    }
  }, [user?.id, user?.role, toast, refetch]);

  const invoices = useMemo(() => {
    if (apiInvoices.length > 0) {
      return apiInvoices.map(inv => ({
        ...inv,
        shipperStatus: inv.shipperStatus || (inv.status === "paid" ? "paid" : inv.status === "sent" ? "viewed" : "pending"),
      }));
    }
    return simulatedInvoices;
  }, [apiInvoices]);

  const sendMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      return apiRequest("POST", `/api/admin/invoices/${invoiceId}/send`, {});
    },
    onSuccess: () => {
      toast({ title: "Invoice Sent", description: "Invoice has been sent to the shipper." });
      // Sync data across portal
      queryClient.invalidateQueries({ queryKey: ["/api/admin/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/loads"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      return apiRequest("POST", `/api/admin/invoices/${invoiceId}/mark-paid`, {});
    },
    onSuccess: () => {
      toast({ title: "Invoice Marked as Paid", description: "Payment has been recorded for this invoice." });
      // Sync data across portal
      queryClient.invalidateQueries({ queryKey: ["/api/admin/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/loads"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch = searchQuery === "" ||
      inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.shipper?.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.load?.pickupCity?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.load?.dropoffCity?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
    const matchesShipperStatus = shipperStatusFilter === "all" || inv.shipperStatus === shipperStatusFilter;
    return matchesSearch && matchesStatus && matchesShipperStatus;
  });

  const stats = {
    total: invoices.length,
    draft: invoices.filter((i) => i.status === "draft").length,
    sent: invoices.filter((i) => i.status === "sent").length,
    paid: invoices.filter((i) => i.status === "paid").length,
    overdue: invoices.filter((i) => i.status === "overdue").length,
  };

  const totalRevenue = invoices
    .filter(i => i.status === "paid")
    .reduce((sum, i) => sum + parseFloat(i.totalAmount || "0"), 0);

  const pendingAmount = invoices
    .filter(i => i.status === "sent")
    .reduce((sum, i) => sum + parseFloat(i.totalAmount || "0"), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Invoice Management</h1>
          <p className="text-muted-foreground">Track invoices and shipper responses</p>
        </div>
        <Button onClick={() => refetch()} variant="outline" data-testid="button-refresh">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card data-testid="card-stat-total">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Invoices</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-revenue">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Collected</p>
                <p className="text-xl font-bold">Rs. {totalRevenue.toLocaleString("en-IN")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-pending">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-xl font-bold">Rs. {pendingAmount.toLocaleString("en-IN")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-overdue">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-xl font-bold">{stats.overdue}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
          <div>
            <CardTitle className="text-lg">All Invoices</CardTitle>
            <CardDescription>With shipper response status tracking</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-48"
                data-testid="input-search"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32" data-testid="select-status-filter">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
            <Select value={shipperStatusFilter} onValueChange={setShipperStatusFilter}>
              <SelectTrigger className="w-36" data-testid="select-shipper-status-filter">
                <SelectValue placeholder="Shipper Response" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Responses</SelectItem>
                <SelectItem value="pending">Not Viewed</SelectItem>
                <SelectItem value="viewed">Viewed</SelectItem>
                <SelectItem value="acknowledged">Acknowledged</SelectItem>
                <SelectItem value="countered">Countered</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground" data-testid="text-empty-state">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No invoices found</p>
              <p className="text-sm">Invoices are created when carriers are finalized for loads</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Shipper</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Shipper Response</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id} data-testid={`row-invoice-${invoice.id}`}>
                    <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                    <TableCell>{invoice.shipper?.companyName || invoice.shipper?.username || '-'}</TableCell>
                    <TableCell className="text-sm">
                      {invoice.load ? `${invoice.load.pickupCity} → ${invoice.load.dropoffCity}` : '-'}
                    </TableCell>
                    <TableCell className="font-medium">
                      Rs. {parseFloat(invoice.totalAmount || '0').toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {getShipperStatusBadge(invoice.shipperStatus)}
                        {invoice.counterOffers?.some(c => c.status === "pending") && (
                          <Badge variant="outline" className="text-xs bg-amber-50 dark:bg-amber-900/20">
                            <ArrowLeftRight className="h-3 w-3 mr-1" />
                            Counter Pending
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {invoice.dueDate ? format(new Date(invoice.dueDate), "MMM d, yyyy") : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedInvoice(invoice);
                            setDetailsOpen(true);
                          }}
                          data-testid={`button-view-${invoice.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {invoice.status === "draft" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => sendMutation.mutate(invoice.id)}
                            disabled={sendMutation.isPending}
                            data-testid={`button-send-${invoice.id}`}
                          >
                            <Send className="h-4 w-4 mr-1" />
                            Send
                          </Button>
                        )}
                        {(invoice.shipperStatus === "acknowledged" || invoice.acknowledgedAt) && invoice.status !== "paid" && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setInvoiceToMarkPaid(invoice.id);
                              setMarkPaidConfirmOpen(true);
                            }}
                            disabled={markPaidMutation.isPending}
                            data-testid={`button-mark-paid-${invoice.id}`}
                          >
                            <DollarSign className="h-4 w-4 mr-1" />
                            Mark Paid
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedInvoice?.invoiceNumber}
            </DialogTitle>
            <DialogDescription>
              Invoice details and shipper response history
            </DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <div className="flex-1 overflow-y-auto pr-2" style={{ maxHeight: 'calc(80vh - 140px)' }}>
              <div className="space-y-6">
                {/* Header Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Route</Label>
                    <p className="font-medium">{selectedInvoice.loadRoute || (selectedInvoice.load ? `${selectedInvoice.load.pickupCity} to ${selectedInvoice.load.dropoffCity}` : "N/A")}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <p className="mt-1">{getStatusBadge(selectedInvoice.status)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Created</Label>
                    <p className="font-medium">{format(new Date(selectedInvoice.createdAt), "d MMM yyyy")}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Due Date</Label>
                    <p className="font-medium">
                      {selectedInvoice.dueDate ? format(new Date(selectedInvoice.dueDate), "d MMM yyyy") : "-"}
                    </p>
                  </div>
                </div>

                {/* Shipper Section */}
                <Card className="border-slate-200 dark:border-slate-700/50 bg-slate-50/30 dark:bg-slate-900/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-slate-600" />
                      Shipper
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Company Name</Label>
                        <p className="font-medium text-sm">{selectedInvoice.shipper?.companyName || selectedInvoice.shipper?.username}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Response Status</Label>
                        <p className="mt-1">{getShipperStatusBadge(selectedInvoice.shipperStatus)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Carrier Details Section */}
                {selectedInvoice.carrier && (
                  <Card className="border-blue-200 dark:border-blue-700/50 bg-blue-50/30 dark:bg-blue-900/10">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        {selectedInvoice.carrier.carrierType === 'solo' ? (
                          <User className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Building2 className="h-4 w-4 text-blue-600" />
                        )}
                        {selectedInvoice.carrier.carrierType === 'solo' ? 'Solo Driver' : 'Enterprise Carrier'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {selectedInvoice.carrier.carrierType === 'solo' ? (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs text-muted-foreground">Driver Name</Label>
                              <p className="font-medium text-sm" data-testid="text-carrier-name">
                                {selectedInvoice.carrier.name}
                              </p>
                            </div>
                            {selectedInvoice.carrier.phone && (
                              <div>
                                <Label className="text-xs text-muted-foreground">Phone</Label>
                                <p className="text-sm flex items-center gap-1">
                                  <Phone className="h-3 w-3 text-muted-foreground" />
                                  {selectedInvoice.carrier.phone}
                                </p>
                              </div>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            {selectedInvoice.truck && (
                              <div>
                                <Label className="text-xs text-muted-foreground">Truck Number</Label>
                                <p className="font-medium text-sm flex items-center gap-1" data-testid="text-truck-number">
                                  <Truck className="h-3 w-3 text-muted-foreground" />
                                  {selectedInvoice.truck.registrationNumber}
                                </p>
                              </div>
                            )}
                            <div>
                              <Label className="text-xs text-muted-foreground">Trips Completed</Label>
                              <p className="text-sm flex items-center gap-1" data-testid="text-trips-completed">
                                <Award className="h-3 w-3 text-green-600" />
                                {selectedInvoice.carrier.tripsCompleted} trips
                              </p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs text-muted-foreground">Company Name</Label>
                              <p className="font-medium text-sm" data-testid="text-company-name">
                                {selectedInvoice.carrier.companyName || selectedInvoice.carrier.name}
                              </p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Trips Completed</Label>
                              <p className="text-sm flex items-center gap-1" data-testid="text-trips-completed">
                                <Award className="h-3 w-3 text-green-600" />
                                {selectedInvoice.carrier.tripsCompleted} trips
                              </p>
                            </div>
                          </div>
                          {selectedInvoice.driver && (
                            <div className="bg-background/50 rounded-md p-2">
                              <Label className="text-xs text-muted-foreground">Assigned Driver</Label>
                              <div className="flex items-center gap-3 mt-1">
                                <p className="font-medium text-sm flex items-center gap-1" data-testid="text-driver-name">
                                  <User className="h-3 w-3 text-muted-foreground" />
                                  {selectedInvoice.driver.name}
                                </p>
                                {selectedInvoice.driver.phone && (
                                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {selectedInvoice.driver.phone}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-3">
                            {selectedInvoice.truck && (
                              <div>
                                <Label className="text-xs text-muted-foreground">Truck Number</Label>
                                <p className="font-medium text-sm flex items-center gap-1" data-testid="text-truck-number">
                                  <Truck className="h-3 w-3 text-muted-foreground" />
                                  {selectedInvoice.truck.registrationNumber}
                                </p>
                              </div>
                            )}
                            {selectedInvoice.truck?.truckType && (
                              <div>
                                <Label className="text-xs text-muted-foreground">Truck Type</Label>
                                <p className="text-sm">{selectedInvoice.truck.truckType}</p>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                      
                      {/* Route Display */}
                      {(selectedInvoice.pickupCity || selectedInvoice.load?.pickupCity) && (
                        <div className="pt-2 border-t">
                          <Label className="text-xs text-muted-foreground">Route</Label>
                          <p className="text-sm font-medium flex items-center gap-2 mt-1">
                            <MapPin className="h-3 w-3 text-green-600" />
                            {selectedInvoice.pickupCity || selectedInvoice.load?.pickupCity}
                            <span className="text-muted-foreground">to</span>
                            <MapPin className="h-3 w-3 text-red-600" />
                            {selectedInvoice.dropoffCity || selectedInvoice.load?.dropoffCity}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Line Items */}
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Line Items</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    {selectedInvoice.lineItems && selectedInvoice.lineItems.length > 0 ? (
                      selectedInvoice.lineItems.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{item.description}</span>
                          <span>Rs. {parseFloat(item.amount || '0').toLocaleString('en-IN')}</span>
                        </div>
                      ))
                    ) : (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Freight services: {selectedInvoice.loadRoute || (selectedInvoice.load ? `${selectedInvoice.load.pickupCity} to ${selectedInvoice.load.dropoffCity}` : "Load transport")}</span>
                        <span>Rs. {parseFloat(selectedInvoice.subtotal || '0').toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>Rs. {parseFloat(selectedInvoice.subtotal || '0').toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">GST ({selectedInvoice.taxPercent || 18}%)</span>
                      <span>Rs. {parseFloat(selectedInvoice.taxAmount || '0').toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-semibold">Total Amount</span>
                      <span className="text-xl font-bold">Rs. {parseFloat(selectedInvoice.totalAmount || '0').toLocaleString('en-IN')}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Advance Payment Section */}
                {selectedInvoice.advancePaymentPercent !== undefined && selectedInvoice.advancePaymentPercent !== null && selectedInvoice.advancePaymentPercent > 0 && (
                  <Card className="border-green-200 dark:border-green-700/50 bg-green-50/50 dark:bg-green-900/10">
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-green-700 dark:text-green-400">Carrier Advance Payment</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Advance Payment:</span>
                        <span className="font-bold text-green-600 dark:text-green-400">{selectedInvoice.advancePaymentPercent}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Balance on Delivery:</span>
                        <span className="font-medium">{100 - selectedInvoice.advancePaymentPercent}%</span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {selectedInvoice.acknowledgedAt && (
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-blue-600" />
                        <span className="text-sm">
                          Acknowledged by shipper on {format(new Date(selectedInvoice.acknowledgedAt), "MMM d, yyyy 'at' h:mm a")}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {selectedInvoice.paidAt && (
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="text-sm">
                          Payment received on {format(new Date(selectedInvoice.paidAt), "MMM d, yyyy 'at' h:mm a")}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {(selectedInvoice.shipperCounterAmount || selectedInvoice.counterContactName) && (
                  <Card className="border-amber-200 dark:border-amber-700/50 bg-amber-50/50 dark:bg-amber-900/10">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <ArrowLeftRight className="h-4 w-4 text-amber-600" />
                        Counter Offer Details
                        {selectedInvoice.counteredAt && (
                          <span className="text-xs font-normal text-muted-foreground">
                            - {format(new Date(selectedInvoice.counteredAt), "MMM d, yyyy 'at' h:mm a")}
                          </span>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {selectedInvoice.shipperCounterAmount && (
                        <div className="flex items-center justify-between gap-4 bg-background p-3 rounded-md border">
                          <div>
                            <p className="text-sm text-muted-foreground">Proposed Amount</p>
                            <p className="font-semibold text-lg text-amber-700 dark:text-amber-400">
                              Rs. {parseFloat(selectedInvoice.shipperCounterAmount).toLocaleString('en-IN')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Original Amount</p>
                            <p className="font-medium">
                              Rs. {parseFloat(selectedInvoice.totalAmount || '0').toLocaleString('en-IN')}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {selectedInvoice.counterReason && (
                        <div>
                          <p className="text-sm font-medium mb-1">Reason for Counter Offer</p>
                          <p className="text-sm bg-background p-3 rounded-md border">{selectedInvoice.counterReason}</p>
                        </div>
                      )}
                      
                      {(selectedInvoice.counterContactName || selectedInvoice.counterContactPhone) && (
                        <div>
                          <p className="text-sm font-medium mb-2">Contact Information</p>
                          <div className="bg-background p-3 rounded-md border space-y-2">
                            {selectedInvoice.counterContactName && (
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground text-sm w-20">Name:</span>
                                <span className="font-medium">{selectedInvoice.counterContactName}</span>
                              </div>
                            )}
                            {selectedInvoice.counterContactCompany && (
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground text-sm w-20">Company:</span>
                                <span className="font-medium">{selectedInvoice.counterContactCompany}</span>
                              </div>
                            )}
                            {selectedInvoice.counterContactPhone && (
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground text-sm w-20">Phone:</span>
                                <span className="font-medium">{selectedInvoice.counterContactPhone}</span>
                              </div>
                            )}
                            {selectedInvoice.counterContactAddress && (
                              <div className="flex items-start gap-2">
                                <span className="text-muted-foreground text-sm w-20">Address:</span>
                                <span className="font-medium">{selectedInvoice.counterContactAddress}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {selectedInvoice.counterOffers && selectedInvoice.counterOffers.length > 0 && (
                  <Collapsible open={historyExpanded} onOpenChange={setHistoryExpanded}>
                    <Card>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="py-3 cursor-pointer hover-elevate">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <History className="h-4 w-4" />
                              Counter Offer History ({selectedInvoice.counterOffers.length})
                            </CardTitle>
                            {historyExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0 space-y-4">
                          {selectedInvoice.counterOffers.map((offer, index) => (
                            <div key={offer.id} className="border rounded-lg p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">Counter #{index + 1}</Badge>
                                  {offer.status === "pending" && (
                                    <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                      <Clock className="h-3 w-3 mr-1" />
                                      Pending
                                    </Badge>
                                  )}
                                  {offer.status === "accepted" && (
                                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Accepted
                                    </Badge>
                                  )}
                                  {offer.status === "rejected" && (
                                    <Badge variant="destructive">
                                      <XCircle className="h-3 w-3 mr-1" />
                                      Rejected
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(offer.createdAt), "MMM d, yyyy 'at' h:mm a")}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Proposed Amount</p>
                                <p className="font-semibold text-lg">Rs. {parseFloat(offer.proposedAmount).toLocaleString('en-IN')}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Shipper's Reason</p>
                                <p className="text-sm bg-muted/50 p-2 rounded">{offer.reason}</p>
                              </div>
                              {offer.responseNote && (
                                <div>
                                  <p className="text-sm text-muted-foreground">Admin Response</p>
                                  <p className="text-sm bg-primary/5 p-2 rounded">{offer.responseNote}</p>
                                  {offer.respondedAt && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Responded on {format(new Date(offer.respondedAt), "MMM d, yyyy 'at' h:mm a")}
                                    </p>
                                  )}
                                </div>
                              )}
                              {offer.status === "pending" && (
                                <div className="flex gap-2 pt-2 border-t">
                                  <Button size="sm" variant="outline">
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Reject
                                  </Button>
                                  <Button size="sm">
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Accept
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))}
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="flex-shrink-0 border-t pt-4">
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>Close</Button>
            {selectedInvoice?.status === "draft" && (
              <Button onClick={() => {
                sendMutation.mutate(selectedInvoice.id);
                setDetailsOpen(false);
              }}>
                <Send className="h-4 w-4 mr-2" />
                Send to Shipper
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Paid Confirmation Dialog - Restricted to Authorized Personnel */}
      <Dialog open={markPaidConfirmOpen} onOpenChange={setMarkPaidConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Confirm Payment Recording
            </DialogTitle>
            <DialogDescription>
              This action is restricted to authorized accounts personnel only.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-lg p-4">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                By proceeding, you confirm that:
              </p>
              <ul className="list-disc list-inside text-sm text-amber-700 dark:text-amber-300 mt-2 space-y-1">
                <li>You are authorized to record payments</li>
                <li>Payment has been verified in the bank account</li>
                <li>The full invoice amount has been received</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMarkPaidConfirmOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (invoiceToMarkPaid) {
                  markPaidMutation.mutate(invoiceToMarkPaid);
                }
                setMarkPaidConfirmOpen(false);
                setInvoiceToMarkPaid(null);
              }}
              disabled={markPaidMutation.isPending}
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Confirm Payment Received
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
