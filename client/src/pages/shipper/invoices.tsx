import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  FileText, Check, Clock, AlertCircle, Eye, Download, 
  CreditCard, MessageSquare, CheckCircle, XCircle, Loader2,
  ArrowLeftRight, History, ChevronDown, ChevronUp, DollarSign
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

interface CounterOffer {
  id: string;
  proposedAmount: number;
  reason: string;
  proposedBy: "shipper" | "admin";
  status: "pending" | "accepted" | "rejected";
  createdAt: Date;
  respondedAt?: Date;
  responseNote?: string;
}

interface LineItem {
  code?: string;
  description: string;
  quantity: number;
  unitPrice?: number;
  rate?: number;
  amount: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  loadId: string;
  loadRoute?: string;
  loadStatus?: string;
  shipperId: string;
  subtotal: string;
  discountAmount?: string;
  discountReason?: string;
  taxPercent: string;
  taxAmount: string;
  totalAmount: string;
  paymentTerms?: string;
  status: string;
  shipperConfirmed: boolean;
  shipperConfirmedAt: string | null;
  acknowledgedAt?: string | null;
  paidAt?: string | null;
  paidAmount?: string | null;
  paymentMethod?: string | null;
  paymentReference?: string | null;
  lineItems: LineItem[];
  counterOffers?: CounterOffer[];
  dueDate: string;
  createdAt: string;
  notes?: string;
}

const simulatedInvoices: Invoice[] = [
  {
    id: "INV-SHP-001",
    invoiceNumber: "INV-2024-001",
    loadId: "LOAD-101",
    loadRoute: "Mumbai → Delhi",
    loadStatus: "delivered",
    shipperId: "current-user",
    subtotal: "45000",
    taxPercent: "18",
    taxAmount: "8100",
    totalAmount: "53100",
    paymentTerms: "Net 14",
    status: "paid",
    shipperConfirmed: true,
    shipperConfirmedAt: "2024-12-08T10:00:00Z",
    acknowledgedAt: "2024-12-10T14:30:00Z",
    paidAt: "2024-12-12T16:45:00Z",
    paidAmount: "53100",
    paymentMethod: "bank_transfer",
    paymentReference: "TXN-78923456",
    lineItems: [
      { description: "Freight Charges: Mumbai to Delhi (1420 km)", quantity: 1, amount: 42000 },
      { description: "Loading/Unloading", quantity: 1, amount: 2000 },
      { description: "Insurance Premium", quantity: 1, amount: 1000 },
    ],
    dueDate: "2024-12-22",
    createdAt: "2024-12-08T09:00:00Z",
  },
  {
    id: "INV-SHP-002",
    invoiceNumber: "INV-2024-002",
    loadId: "LOAD-102",
    loadRoute: "Chennai → Bangalore",
    loadStatus: "in_transit",
    shipperId: "current-user",
    subtotal: "35000",
    taxPercent: "18",
    taxAmount: "6300",
    totalAmount: "41300",
    paymentTerms: "Net 14",
    status: "sent",
    shipperConfirmed: true,
    shipperConfirmedAt: "2024-12-12T11:00:00Z",
    acknowledgedAt: "2024-12-14T09:30:00Z",
    lineItems: [
      { description: "Freight Charges: Chennai to Bangalore (350 km)", quantity: 1, amount: 32000 },
      { description: "Special Handling", quantity: 1, amount: 3000 },
    ],
    dueDate: "2024-12-26",
    createdAt: "2024-12-12T10:30:00Z",
  },
  {
    id: "INV-SHP-003",
    invoiceNumber: "INV-2024-003",
    loadId: "LOAD-103",
    loadRoute: "Pune → Hyderabad",
    loadStatus: "awarded",
    shipperId: "current-user",
    subtotal: "28000",
    taxPercent: "18",
    taxAmount: "5040",
    totalAmount: "33040",
    paymentTerms: "Net 14",
    status: "disputed",
    shipperConfirmed: true,
    shipperConfirmedAt: "2024-12-10T08:30:00Z",
    lineItems: [
      { description: "Freight Charges: Pune to Hyderabad (560 km)", quantity: 1, amount: 25000 },
      { description: "Fuel Surcharge", quantity: 1, amount: 3000 },
    ],
    counterOffers: [
      {
        id: "CO-1",
        proposedAmount: 28000,
        reason: "The original quote was Rs. 28,000 as per our verbal discussion. GST calculation seems incorrect.",
        proposedBy: "shipper",
        status: "rejected",
        createdAt: new Date("2024-12-11T10:00:00Z"),
        respondedAt: new Date("2024-12-11T14:00:00Z"),
        responseNote: "Rate was confirmed at Rs. 33,040 including GST as per signed agreement.",
      },
      {
        id: "CO-2",
        proposedAmount: 30000,
        reason: "Willing to pay Rs. 30,000 as final settlement. Please consider this compromise.",
        proposedBy: "shipper",
        status: "pending",
        createdAt: new Date("2024-12-12T09:00:00Z"),
      },
    ],
    dueDate: "2024-12-24",
    createdAt: "2024-12-10T08:00:00Z",
  },
  {
    id: "INV-SHP-004",
    invoiceNumber: "INV-2024-004",
    loadId: "LOAD-104",
    loadRoute: "Kolkata → Bhubaneswar",
    loadStatus: "finalized",
    shipperId: "current-user",
    subtotal: "22000",
    taxPercent: "18",
    taxAmount: "3960",
    totalAmount: "25960",
    paymentTerms: "Net 14",
    status: "sent",
    shipperConfirmed: false,
    shipperConfirmedAt: null,
    lineItems: [
      { description: "Freight Charges: Kolkata to Bhubaneswar (440 km)", quantity: 1, amount: 20000 },
      { description: "Toll Charges", quantity: 1, amount: 2000 },
    ],
    dueDate: "2024-12-28",
    createdAt: "2024-12-14T07:00:00Z",
  },
  {
    id: "INV-SHP-005",
    invoiceNumber: "INV-2024-005",
    loadId: "LOAD-105",
    loadRoute: "Ahmedabad → Jaipur",
    loadStatus: "awarded",
    shipperId: "current-user",
    subtotal: "18000",
    taxPercent: "18",
    taxAmount: "3240",
    totalAmount: "21240",
    paymentTerms: "Net 14",
    status: "acknowledged",
    shipperConfirmed: true,
    shipperConfirmedAt: "2024-12-13T11:00:00Z",
    acknowledgedAt: "2024-12-14T15:20:00Z",
    lineItems: [
      { description: "Freight Charges: Ahmedabad to Jaipur (680 km)", quantity: 1, amount: 16500 },
      { description: "Packaging Materials", quantity: 1, amount: 1500 },
    ],
    dueDate: "2024-12-29",
    createdAt: "2024-12-13T10:00:00Z",
  },
];

export default function ShipperInvoicesPage() {
  const { toast } = useToast();
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [negotiateDialogOpen, setNegotiateDialogOpen] = useState(false);
  const [negotiateReason, setNegotiateReason] = useState("");
  const [counterAmount, setCounterAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [historyExpanded, setHistoryExpanded] = useState(false);

  const { data: apiInvoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices/shipper"],
  });

  const invoices = useMemo(() => {
    if (apiInvoices.length > 0) {
      return apiInvoices.filter(inv => {
        const loadStatus = inv.loadStatus?.toLowerCase() || "";
        return ["awarded", "finalized", "in_transit", "delivered", "completed"].includes(loadStatus) ||
               inv.status !== "draft";
      });
    }
    return simulatedInvoices;
  }, [apiInvoices]);

  const confirmMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      return apiRequest("POST", `/api/invoices/${invoiceId}/confirm`, {});
    },
    onSuccess: () => {
      toast({
        title: "Invoice Confirmed",
        description: "Invoice has been acknowledged and confirmed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices/shipper"] });
      setConfirmDialogOpen(false);
      setSelectedInvoice(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to confirm invoice",
        variant: "destructive",
      });
    },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      return apiRequest("POST", `/api/shipper/invoices/${invoiceId}/acknowledge`, {});
    },
    onSuccess: () => {
      toast({
        title: "Invoice Acknowledged",
        description: "You have acknowledged receipt of this invoice.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices/shipper"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to acknowledge invoice",
        variant: "destructive",
      });
    },
  });

  const payMutation = useMutation({
    mutationFn: async ({ invoiceId, method }: { invoiceId: string; method: string }) => {
      return apiRequest("POST", `/api/shipper/invoices/${invoiceId}/pay`, { paymentMethod: method });
    },
    onSuccess: async (response) => {
      const data = await response.json();
      toast({
        title: "Payment Successful",
        description: `Payment reference: ${data.paymentReference || "Generated"}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices/shipper"] });
      setPayDialogOpen(false);
      setSelectedInvoice(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to process payment",
        variant: "destructive",
      });
    },
  });

  const negotiateMutation = useMutation({
    mutationFn: async ({ invoiceId, proposedAmount, reason }: { invoiceId: string; proposedAmount: number; reason: string }) => {
      return apiRequest("POST", `/api/shipper/invoices/${invoiceId}/negotiate`, { proposedAmount, reason });
    },
    onSuccess: () => {
      toast({
        title: "Counter Offer Submitted",
        description: "Your counter offer has been sent to admin for review.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices/shipper"] });
      setNegotiateDialogOpen(false);
      setCounterAmount("");
      setNegotiateReason("");
      setSelectedInvoice(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit counter offer",
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `Rs. ${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusBadge = (invoice: Invoice) => {
    const status = invoice.status.toLowerCase();
    
    if (status === 'paid') {
      return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"><DollarSign className="h-3 w-3 mr-1" />Paid</Badge>;
    }
    if (status === 'disputed' || status === 'invoice_rejected') {
      return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"><ArrowLeftRight className="h-3 w-3 mr-1" />Counter Pending</Badge>;
    }
    if (status === 'acknowledged') {
      return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"><Check className="h-3 w-3 mr-1" />Acknowledged</Badge>;
    }
    if (invoice.shipperConfirmed) {
      return <Badge variant="secondary"><Check className="h-3 w-3 mr-1" />Confirmed</Badge>;
    }
    if (status === 'sent') {
      return <Badge variant="outline" className="text-amber-600 border-amber-300"><Clock className="h-3 w-3 mr-1" />Pending Review</Badge>;
    }
    return <Badge variant="outline">{invoice.status}</Badge>;
  };

  const pendingConfirmation = invoices.filter(inv => {
    const status = inv.status.toLowerCase();
    return !inv.shipperConfirmed && status === 'sent';
  });

  const activeInvoices = invoices.filter(inv => {
    const status = inv.status.toLowerCase();
    return (inv.shipperConfirmed || status === 'acknowledged') && 
           status !== 'paid' && 
           status !== 'disputed';
  });

  const disputedInvoices = invoices.filter(inv => inv.status.toLowerCase() === 'disputed');
  const paidInvoices = invoices.filter(inv => inv.status.toLowerCase() === 'paid');

  const totalPending = invoices
    .filter(i => !['paid', 'disputed'].includes(i.status.toLowerCase()))
    .reduce((sum, i) => sum + parseFloat(i.totalAmount || "0"), 0);

  const totalPaid = paidInvoices.reduce((sum, i) => sum + parseFloat(i.totalAmount || "0"), 0);

  const handleConfirm = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setConfirmDialogOpen(true);
  };

  const handlePay = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setPayDialogOpen(true);
  };

  const handleNegotiate = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setCounterAmount("");
    setNegotiateReason("");
    setNegotiateDialogOpen(true);
  };

  const handleViewDetails = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setHistoryExpanded(false);
    setDetailsOpen(true);
  };

  const handleDownloadPDF = (invoice: Invoice) => {
    const content = `
INVOICE - ${invoice.invoiceNumber}
========================================
Date: ${formatDate(invoice.createdAt)}
Due Date: ${formatDate(invoice.dueDate)}
Status: ${invoice.status.toUpperCase()}
Route: ${invoice.loadRoute || 'N/A'}

LINE ITEMS:
${invoice.lineItems?.map(item => `- ${item.description}: ${formatCurrency(item.amount)}`).join('\n') || 'No line items'}

----------------------------------------
Subtotal: ${formatCurrency(invoice.subtotal)}
GST (${invoice.taxPercent}%): ${formatCurrency(invoice.taxAmount)}
----------------------------------------
TOTAL: ${formatCurrency(invoice.totalAmount)}
========================================
${invoice.paymentReference ? `Payment Ref: ${invoice.paymentReference}` : ''}
    `;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${invoice.invoiceNumber}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Invoice Downloaded",
      description: `${invoice.invoiceNumber} has been downloaded.`,
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold">Invoices</h1>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-32" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const renderInvoiceCard = (invoice: Invoice, showActions: boolean = true) => (
    <Card key={invoice.id} className={invoice.status === 'disputed' ? 'border-amber-300 dark:border-amber-800' : ''} data-testid={`card-invoice-${invoice.id}`}>
      <CardContent className="pt-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium" data-testid={`text-invoice-number-${invoice.id}`}>
                {invoice.invoiceNumber}
              </span>
              {getStatusBadge(invoice)}
            </div>
            {invoice.loadRoute && (
              <p className="text-sm font-medium">{invoice.loadRoute}</p>
            )}
            <p className="text-sm text-muted-foreground">
              Created: {formatDate(invoice.createdAt)} | Due: {formatDate(invoice.dueDate)}
            </p>
            {invoice.acknowledgedAt && (
              <p className="text-xs text-muted-foreground">
                Acknowledged: {format(new Date(invoice.acknowledgedAt), "MMM d, yyyy 'at' h:mm a")}
              </p>
            )}
            {invoice.paidAt && (
              <p className="text-xs text-green-600">
                Paid: {format(new Date(invoice.paidAt), "MMM d, yyyy")} | Ref: {invoice.paymentReference}
              </p>
            )}
            {invoice.counterOffers && invoice.counterOffers.length > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  <History className="h-3 w-3 mr-1" />
                  {invoice.counterOffers.length} Counter Offer(s)
                </Badge>
                {invoice.counterOffers.some(c => c.status === "pending") && (
                  <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs">
                    Awaiting Response
                  </Badge>
                )}
              </div>
            )}
          </div>
          
          <div className="text-right space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-xl font-bold" data-testid={`text-invoice-total-${invoice.id}`}>
                {formatCurrency(invoice.totalAmount)}
              </p>
              <p className="text-xs text-muted-foreground">(incl. {invoice.taxPercent}% GST)</p>
            </div>
            {showActions && (
              <div className="flex gap-2 flex-wrap justify-end">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleViewDetails(invoice)}
                  data-testid={`button-view-invoice-${invoice.id}`}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Details
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleDownloadPDF(invoice)}
                  data-testid={`button-download-invoice-${invoice.id}`}
                >
                  <Download className="h-4 w-4" />
                </Button>
                
                {!invoice.shipperConfirmed && invoice.status === 'sent' && (
                  <>
                    <Button 
                      size="sm"
                      onClick={() => handleConfirm(invoice)}
                      data-testid={`button-confirm-invoice-${invoice.id}`}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => handleNegotiate(invoice)}
                      data-testid={`button-counter-invoice-${invoice.id}`}
                    >
                      <ArrowLeftRight className="h-4 w-4 mr-1" />
                      Counter
                    </Button>
                  </>
                )}
                
                {invoice.shipperConfirmed && 
                 invoice.status.toLowerCase() !== 'paid' && 
                 invoice.status.toLowerCase() !== 'disputed' && (
                  <>
                    {!invoice.acknowledgedAt && (
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => acknowledgeMutation.mutate(invoice.id)}
                        disabled={acknowledgeMutation.isPending}
                        data-testid={`button-acknowledge-${invoice.id}`}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Acknowledge
                      </Button>
                    )}
                    <Button 
                      size="sm"
                      onClick={() => handlePay(invoice)}
                      data-testid={`button-pay-${invoice.id}`}
                    >
                      <CreditCard className="h-4 w-4 mr-1" />
                      Pay Now
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-invoices-title">Invoices</h1>
        <p className="text-muted-foreground">Manage invoices for your awarded loads</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Invoices</p>
                <p className="text-xl font-bold">{invoices.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-xl font-bold">{formatCurrency(totalPending)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Paid</p>
                <p className="text-xl font-bold">{formatCurrency(totalPaid)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                <ArrowLeftRight className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Disputed</p>
                <p className="text-xl font-bold">{disputedInvoices.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending" data-testid="tab-pending">
            Review ({pendingConfirmation.length})
          </TabsTrigger>
          <TabsTrigger value="active" data-testid="tab-active">
            Active ({activeInvoices.length})
          </TabsTrigger>
          <TabsTrigger value="disputed" data-testid="tab-disputed">
            Countered ({disputedInvoices.length})
          </TabsTrigger>
          <TabsTrigger value="paid" data-testid="tab-paid">
            Paid ({paidInvoices.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending" className="space-y-4 mt-4">
          {pendingConfirmation.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <h3 className="text-lg font-semibold">All Caught Up!</h3>
                <p className="text-muted-foreground">No invoices pending your review</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-4 w-4" />
                <span>Please review and approve these invoices or submit a counter offer.</span>
              </div>
              {pendingConfirmation.map(invoice => renderInvoiceCard(invoice))}
            </>
          )}
        </TabsContent>
        
        <TabsContent value="active" className="space-y-4 mt-4">
          {activeInvoices.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No active invoices awaiting payment</p>
              </CardContent>
            </Card>
          ) : (
            activeInvoices.map(invoice => renderInvoiceCard(invoice))
          )}
        </TabsContent>

        <TabsContent value="disputed" className="space-y-4 mt-4">
          {disputedInvoices.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <CheckCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No disputed invoices</p>
              </CardContent>
            </Card>
          ) : (
            disputedInvoices.map(invoice => renderInvoiceCard(invoice))
          )}
        </TabsContent>
        
        <TabsContent value="paid" className="space-y-4 mt-4">
          {paidInvoices.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <DollarSign className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No paid invoices yet</p>
              </CardContent>
            </Card>
          ) : (
            paidInvoices.map(invoice => renderInvoiceCard(invoice, false))
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedInvoice?.invoiceNumber}
            </DialogTitle>
            <DialogDescription>
              Invoice details and counter offer history
            </DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Route</Label>
                    <p className="font-medium">{selectedInvoice.loadRoute || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <p className="mt-1">{getStatusBadge(selectedInvoice)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Created</Label>
                    <p className="font-medium">{formatDate(selectedInvoice.createdAt)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Due Date</Label>
                    <p className="font-medium">{formatDate(selectedInvoice.dueDate)}</p>
                  </div>
                </div>

                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Line Items</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    {selectedInvoice.lineItems?.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{item.description}</span>
                        <span>{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatCurrency(selectedInvoice.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">GST ({selectedInvoice.taxPercent}%)</span>
                      <span>{formatCurrency(selectedInvoice.taxAmount)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span>{formatCurrency(selectedInvoice.totalAmount)}</span>
                    </div>
                  </CardContent>
                </Card>

                {selectedInvoice.acknowledgedAt && (
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 text-blue-600">
                        <Check className="h-4 w-4" />
                        <span className="text-sm">Acknowledged on {format(new Date(selectedInvoice.acknowledgedAt), "MMM d, yyyy 'at' h:mm a")}</span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {selectedInvoice.paidAt && (
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 text-green-600">
                        <DollarSign className="h-4 w-4" />
                        <span className="text-sm">
                          Paid on {format(new Date(selectedInvoice.paidAt), "MMM d, yyyy")} via {selectedInvoice.paymentMethod?.replace('_', ' ')}
                        </span>
                      </div>
                      {selectedInvoice.paymentReference && (
                        <p className="text-xs text-muted-foreground mt-1">Reference: {selectedInvoice.paymentReference}</p>
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
                            {historyExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
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
                                      <Clock className="h-3 w-3 mr-1" />Pending
                                    </Badge>
                                  )}
                                  {offer.status === "accepted" && (
                                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                      <CheckCircle className="h-3 w-3 mr-1" />Accepted
                                    </Badge>
                                  )}
                                  {offer.status === "rejected" && (
                                    <Badge variant="destructive">
                                      <XCircle className="h-3 w-3 mr-1" />Rejected
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(offer.createdAt), "MMM d, yyyy")}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Your Proposed Amount</p>
                                <p className="font-semibold text-lg">{formatCurrency(offer.proposedAmount)}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Your Reason</p>
                                <p className="text-sm bg-muted/50 p-2 rounded">{offer.reason}</p>
                              </div>
                              {offer.responseNote && (
                                <div>
                                  <p className="text-sm text-muted-foreground">Admin Response</p>
                                  <p className="text-sm bg-primary/5 p-2 rounded">{offer.responseNote}</p>
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
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Invoice</DialogTitle>
            <DialogDescription>
              By approving this invoice, you agree to the pricing.
            </DialogDescription>
          </DialogHeader>
          
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-md space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invoice</span>
                  <span className="font-medium">{selectedInvoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Route</span>
                  <span>{selectedInvoice.loadRoute}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(selectedInvoice.totalAmount)}</span>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => selectedInvoice && confirmMutation.mutate(selectedInvoice.id)}
              disabled={confirmMutation.isPending}
              data-testid="button-confirm-invoice-dialog"
            >
              {confirmMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
              Approve Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pay Invoice</DialogTitle>
            <DialogDescription>Select payment method and confirm payment</DialogDescription>
          </DialogHeader>
          
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-md">
                <div className="flex justify-between text-lg font-bold">
                  <span>Amount Due</span>
                  <span>{formatCurrency(selectedInvoice.totalAmount)}</span>
                </div>
              </div>
              
              <div>
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="mt-2" data-testid="select-payment-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="debit_card">Debit Card</SelectItem>
                    <SelectItem value="net_banking">Net Banking</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => selectedInvoice && payMutation.mutate({ invoiceId: selectedInvoice.id, method: paymentMethod })}
              disabled={payMutation.isPending}
              data-testid="button-confirm-pay"
            >
              {payMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
              Pay {selectedInvoice ? formatCurrency(selectedInvoice.totalAmount) : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={negotiateDialogOpen} onOpenChange={setNegotiateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Counter Offer</DialogTitle>
            <DialogDescription>
              Propose a different amount with your reason
            </DialogDescription>
          </DialogHeader>
          
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-md">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Original Amount</span>
                  <span className="font-medium">{formatCurrency(selectedInvoice.totalAmount)}</span>
                </div>
              </div>
              
              <div>
                <Label>Your Proposed Amount (Rs.)</Label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={counterAmount}
                  onChange={(e) => setCounterAmount(e.target.value)}
                  className="mt-2"
                  data-testid="input-counter-amount"
                />
              </div>
              
              <div>
                <Label>Reason for Counter Offer</Label>
                <Textarea
                  placeholder="Explain why you're proposing this amount..."
                  value={negotiateReason}
                  onChange={(e) => setNegotiateReason(e.target.value)}
                  className="mt-2"
                  rows={4}
                  data-testid="input-counter-reason"
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setNegotiateDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => selectedInvoice && negotiateMutation.mutate({ 
                invoiceId: selectedInvoice.id, 
                proposedAmount: parseFloat(counterAmount), 
                reason: negotiateReason 
              })}
              disabled={negotiateMutation.isPending || !counterAmount || !negotiateReason}
              data-testid="button-submit-counter"
            >
              {negotiateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowLeftRight className="h-4 w-4 mr-2" />}
              Submit Counter Offer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
