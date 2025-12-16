import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  FileText, Send, Check, Clock, AlertCircle, DollarSign,
  Search, Filter, Eye, RefreshCw, MessageSquare, History,
  CheckCircle, XCircle, ArrowLeftRight, ChevronDown, ChevronUp
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
import { ScrollArea } from "@/components/ui/scroll-area";
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

interface Invoice {
  id: string;
  invoiceNumber: string;
  loadId: string;
  shipperId: string;
  shipper?: { companyName?: string; username: string };
  load?: { pickupCity: string; dropoffCity: string; status: string };
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  status: string;
  shipperStatus?: "pending" | "viewed" | "acknowledged" | "countered" | "paid";
  acknowledgedAt?: string;
  paidAt?: string;
  counterOffers?: CounterOffer[];
  createdAt: string;
  sentAt?: string;
  dueDate?: string;
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
    id: "INV-003",
    invoiceNumber: "INV-2024-003",
    loadId: "LOAD-3",
    shipperId: "SHP-3",
    shipper: { companyName: "Mahindra Logistics", username: "mahindra" },
    load: { pickupCity: "Pune", dropoffCity: "Hyderabad", status: "awarded" },
    subtotal: "28000",
    taxAmount: "5040",
    totalAmount: "33040",
    status: "disputed",
    shipperStatus: "countered",
    createdAt: "2024-12-10T08:00:00Z",
    sentAt: "2024-12-10T08:30:00Z",
    dueDate: "2024-12-24",
    counterOffers: [
      {
        id: "CO-1",
        proposedAmount: "28000",
        reason: "Original quote was Rs. 28,000 as per verbal agreement. Tax should be calculated on agreed amount.",
        proposedBy: "shipper",
        status: "rejected",
        createdAt: new Date("2024-12-11T10:00:00Z"),
        respondedAt: new Date("2024-12-11T14:00:00Z"),
        responseNote: "Rate was finalized at Rs. 33,040 including GST as per signed agreement.",
      },
      {
        id: "CO-2",
        proposedAmount: "30000",
        reason: "Willing to pay Rs. 30,000 as a compromise. Please consider this as final offer.",
        proposedBy: "shipper",
        status: "pending",
        createdAt: new Date("2024-12-12T09:00:00Z"),
      },
    ],
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
    case "disputed":
      return <Badge variant="destructive" data-testid="badge-status-disputed"><MessageSquare className="h-3 w-3 mr-1" />Disputed</Badge>;
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

  const { data: apiInvoices = [], isLoading, refetch } = useQuery<Invoice[]>({
    queryKey: ["/api/admin/invoices"],
  });

  useEffect(() => {
    if (user?.id && user?.role === "admin") {
      connectMarketplace("admin", user.id);
      
      const unsubInvoice = onMarketplaceEvent("invoice_update", (data) => {
        if (data.event === "invoice_opened") {
          toast({
            title: "Invoice Acknowledged",
            description: `Invoice ${data.invoice?.invoiceNumber || data.invoiceId} has been viewed by shipper.`,
          });
          refetch();
        } else if (data.event === "invoice_paid") {
          toast({
            title: "Payment Received",
            description: `Invoice ${data.invoice?.invoiceNumber || data.invoiceId} has been paid.`,
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/invoices"] });
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
    disputed: invoices.filter((i) => i.status === "disputed").length,
    pendingCounter: invoices.filter((i) => i.counterOffers?.some(c => c.status === "pending")).length,
  };

  const totalRevenue = invoices
    .filter(i => i.status === "paid")
    .reduce((sum, i) => sum + parseFloat(i.totalAmount || "0"), 0);

  const pendingAmount = invoices
    .filter(i => ["sent", "disputed"].includes(i.status))
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
        <Card data-testid="card-stat-disputes">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                <MessageSquare className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Disputes</p>
                <p className="text-xl font-bold">{stats.disputed}</p>
                {stats.pendingCounter > 0 && (
                  <p className="text-xs text-amber-600">{stats.pendingCounter} counter pending</p>
                )}
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
                <SelectItem value="disputed">Disputed</SelectItem>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Invoice {selectedInvoice?.invoiceNumber}
            </DialogTitle>
            <DialogDescription>
              Invoice details and shipper response history
            </DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Shipper</span>
                    <p className="font-medium">{selectedInvoice.shipper?.companyName || selectedInvoice.shipper?.username}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Invoice Status</span>
                    <p className="mt-1">{getStatusBadge(selectedInvoice.status)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Shipper Response</span>
                    <p className="mt-1">{getShipperStatusBadge(selectedInvoice.shipperStatus)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Due Date</span>
                    <p className="font-medium">
                      {selectedInvoice.dueDate ? format(new Date(selectedInvoice.dueDate), "MMM d, yyyy") : "-"}
                    </p>
                  </div>
                </div>

                <Card>
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>Rs. {parseFloat(selectedInvoice.subtotal || '0').toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">GST (18%)</span>
                        <span>Rs. {parseFloat(selectedInvoice.taxAmount || '0').toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="font-semibold">Total Amount</span>
                        <span className="text-xl font-bold">Rs. {parseFloat(selectedInvoice.totalAmount || '0').toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {selectedInvoice.load && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">Load Details</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="font-medium">{selectedInvoice.load.pickupCity} → {selectedInvoice.load.dropoffCity}</p>
                      <p className="text-sm text-muted-foreground">Load Status: {selectedInvoice.load.status}</p>
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
            </ScrollArea>
          )}
          <DialogFooter className="border-t pt-4">
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
    </div>
  );
}
