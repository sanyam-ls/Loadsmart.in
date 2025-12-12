import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  FileText, Check, Clock, AlertCircle, Eye, Download, 
  CreditCard, MessageSquare, CheckCircle, XCircle, Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";

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
  paidAt?: string | null;
  paidAmount?: string | null;
  paymentMethod?: string | null;
  paymentReference?: string | null;
  lineItems: LineItem[];
  dueDate: string;
  createdAt: string;
  notes?: string;
}

export default function ShipperInvoicesPage() {
  const { toast } = useToast();
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [queryDialogOpen, setQueryDialogOpen] = useState(false);
  const [queryMessage, setQueryMessage] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");

  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices/shipper"],
  });

  const confirmMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      return apiRequest("POST", `/api/invoices/${invoiceId}/confirm`, {});
    },
    onSuccess: () => {
      toast({
        title: "Invoice Confirmed",
        description: "Your load is now posted for carrier bidding.",
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
        description: `Payment reference: ${data.paymentReference}`,
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

  const queryMutation = useMutation({
    mutationFn: async ({ invoiceId, message }: { invoiceId: string; message: string }) => {
      return apiRequest("POST", `/api/shipper/invoices/${invoiceId}/query`, { message });
    },
    onSuccess: () => {
      toast({
        title: "Query Submitted",
        description: "Your query has been sent to the admin team.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices/shipper"] });
      setQueryDialogOpen(false);
      setQueryMessage("");
      setSelectedInvoice(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit query",
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
    if (invoice.status === 'paid') {
      return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"><CheckCircle className="h-3 w-3 mr-1" />Paid</Badge>;
    }
    if (invoice.status === 'disputed') {
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Disputed</Badge>;
    }
    if (invoice.status === 'acknowledged') {
      return <Badge variant="secondary"><Check className="h-3 w-3 mr-1" />Acknowledged</Badge>;
    }
    if (invoice.status === 'sent' && !invoice.shipperConfirmed) {
      return <Badge variant="outline" className="text-warning border-warning"><Clock className="h-3 w-3 mr-1" />Pending Confirmation</Badge>;
    }
    if (invoice.shipperConfirmed) {
      return <Badge variant="secondary"><Check className="h-3 w-3 mr-1" />Confirmed</Badge>;
    }
    return <Badge variant="outline">{invoice.status}</Badge>;
  };

  const pendingConfirmation = invoices.filter(inv => !inv.shipperConfirmed && inv.status !== 'paid');
  const activeInvoices = invoices.filter(inv => inv.shipperConfirmed && inv.status !== 'paid');
  const paidInvoices = invoices.filter(inv => inv.status === 'paid');

  const handleConfirm = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setConfirmDialogOpen(true);
  };

  const handlePay = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setPayDialogOpen(true);
  };

  const handleQuery = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setQueryDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
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
    <Card key={invoice.id} className={invoice.status === 'disputed' ? 'border-destructive/50' : ''}>
      <CardContent className="pt-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium" data-testid={`text-invoice-number-${invoice.id}`}>
                {invoice.invoiceNumber}
              </span>
              {getStatusBadge(invoice)}
            </div>
            <p className="text-sm text-muted-foreground">
              Created: {formatDate(invoice.createdAt)} | Due: {formatDate(invoice.dueDate)}
            </p>
            {invoice.lineItems?.[0] && (
              <p className="text-sm">{invoice.lineItems[0].description}</p>
            )}
            {invoice.paymentReference && (
              <p className="text-xs text-muted-foreground">
                Ref: {invoice.paymentReference}
              </p>
            )}
          </div>
          
          <div className="text-right space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-lg font-bold" data-testid={`text-invoice-total-${invoice.id}`}>
                {formatCurrency(invoice.totalAmount)}
              </p>
              <p className="text-xs text-muted-foreground">
                (incl. {invoice.taxPercent}% GST)
              </p>
            </div>
            {showActions && (
              <div className="flex gap-2 flex-wrap justify-end">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedInvoice(invoice)}
                  data-testid={`button-view-invoice-${invoice.id}`}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
                
                {!invoice.shipperConfirmed && invoice.status !== 'paid' && (
                  <Button 
                    size="sm"
                    onClick={() => handleConfirm(invoice)}
                    data-testid={`button-confirm-invoice-${invoice.id}`}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Confirm
                  </Button>
                )}
                
                {invoice.shipperConfirmed && invoice.status !== 'paid' && invoice.status !== 'disputed' && (
                  <>
                    {invoice.status !== 'acknowledged' && (
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
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuery(invoice)}
                      data-testid={`button-query-${invoice.id}`}
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Raise Query
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
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-invoices-title">Invoices</h1>
        <p className="text-muted-foreground">View, confirm, and manage your invoices</p>
      </div>

      {invoices.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No Invoices Yet</h3>
            <p className="text-muted-foreground">
              Invoices will appear here once your loads are priced by the admin.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending" data-testid="tab-pending">
              Pending ({pendingConfirmation.length})
            </TabsTrigger>
            <TabsTrigger value="active" data-testid="tab-active">
              Active ({activeInvoices.length})
            </TabsTrigger>
            <TabsTrigger value="paid" data-testid="tab-paid">
              Paid ({paidInvoices.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="pending" className="space-y-4 mt-4">
            {pendingConfirmation.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">No invoices pending confirmation</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4 text-warning" />
                  <span>Please confirm these invoices to start carrier bidding on your loads.</span>
                </div>
                {pendingConfirmation.map(invoice => renderInvoiceCard(invoice))}
              </>
            )}
          </TabsContent>
          
          <TabsContent value="active" className="space-y-4 mt-4">
            {activeInvoices.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">No active invoices awaiting payment</p>
                </CardContent>
              </Card>
            ) : (
              activeInvoices.map(invoice => renderInvoiceCard(invoice))
            )}
          </TabsContent>
          
          <TabsContent value="paid" className="space-y-4 mt-4">
            {paidInvoices.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">No paid invoices yet</p>
                </CardContent>
              </Card>
            ) : (
              paidInvoices.map(invoice => renderInvoiceCard(invoice, false))
            )}
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Invoice</DialogTitle>
            <DialogDescription>
              By confirming this invoice, you agree to the pricing and your load will be posted for carrier bidding.
            </DialogDescription>
          </DialogHeader>
          
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-md space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invoice Number</span>
                  <span className="font-medium">{selectedInvoice.invoiceNumber}</span>
                </div>
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
              </div>
              
              <p className="text-sm text-muted-foreground">
                Due Date: {formatDate(selectedInvoice.dueDate)}
              </p>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => selectedInvoice && confirmMutation.mutate(selectedInvoice.id)}
              disabled={confirmMutation.isPending}
              data-testid="button-confirm-invoice-dialog"
            >
              {confirmMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Confirm Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pay Invoice</DialogTitle>
            <DialogDescription>
              Complete payment for invoice {selectedInvoice?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>
          
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-md">
                <div className="flex justify-between text-lg font-bold">
                  <span>Amount to Pay</span>
                  <span>{formatCurrency(selectedInvoice.totalAmount)}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger data-testid="select-payment-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer (NEFT/RTGS)</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="debit_card">Debit Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <p className="text-sm text-muted-foreground">
                This is a mock payment. In production, you would be redirected to a payment gateway.
              </p>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => selectedInvoice && payMutation.mutate({ 
                invoiceId: selectedInvoice.id, 
                method: paymentMethod 
              })}
              disabled={payMutation.isPending}
              data-testid="button-pay-confirm"
            >
              {payMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4 mr-2" />
              )}
              Pay {selectedInvoice && formatCurrency(selectedInvoice.totalAmount)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={queryDialogOpen} onOpenChange={setQueryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Raise Query</DialogTitle>
            <DialogDescription>
              Submit a query or dispute for invoice {selectedInvoice?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Your Query</Label>
              <Textarea
                value={queryMessage}
                onChange={(e) => setQueryMessage(e.target.value)}
                placeholder="Describe your concern or question about this invoice..."
                rows={4}
                data-testid="textarea-query"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Our admin team will review your query and respond within 24 hours.
            </p>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setQueryDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => selectedInvoice && queryMutation.mutate({ 
                invoiceId: selectedInvoice.id, 
                message: queryMessage 
              })}
              disabled={queryMutation.isPending || !queryMessage.trim()}
              data-testid="button-submit-query"
            >
              {queryMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <MessageSquare className="h-4 w-4 mr-2" />
              )}
              Submit Query
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedInvoice && !confirmDialogOpen && !payDialogOpen && !queryDialogOpen} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
          </DialogHeader>
          
          {selectedInvoice && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{selectedInvoice.invoiceNumber}</span>
                  {getStatusBadge(selectedInvoice)}
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <h4 className="font-medium">Line Items</h4>
                  {selectedInvoice.lineItems?.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{item.description}</span>
                      <span>{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(selectedInvoice.subtotal)}</span>
                  </div>
                  {selectedInvoice.discountAmount && parseFloat(selectedInvoice.discountAmount) > 0 && (
                    <div className="flex justify-between text-sm text-destructive">
                      <span>Discount</span>
                      <span>- {formatCurrency(selectedInvoice.discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">GST ({selectedInvoice.taxPercent}%)</span>
                    <span>{formatCurrency(selectedInvoice.taxAmount)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span>{formatCurrency(selectedInvoice.totalAmount)}</span>
                  </div>
                </div>
                
                <Separator />
                
                <div className="text-sm space-y-1">
                  <p><span className="text-muted-foreground">Created:</span> {formatDate(selectedInvoice.createdAt)}</p>
                  <p><span className="text-muted-foreground">Due:</span> {formatDate(selectedInvoice.dueDate)}</p>
                  {selectedInvoice.paymentTerms && (
                    <p><span className="text-muted-foreground">Terms:</span> {selectedInvoice.paymentTerms}</p>
                  )}
                  {selectedInvoice.notes && (
                    <p><span className="text-muted-foreground">Notes:</span> {selectedInvoice.notes}</p>
                  )}
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
