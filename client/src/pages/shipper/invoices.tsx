import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { FileText, Check, Clock, AlertCircle, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface Invoice {
  id: string;
  invoiceNumber: string;
  loadId: string;
  shipperId: string;
  subtotal: string;
  taxPercent: string;
  taxAmount: string;
  totalAmount: string;
  status: string;
  shipperConfirmed: boolean;
  shipperConfirmedAt: string | null;
  lineItems: { description: string; quantity: number; rate: number; amount: number }[];
  dueDate: string;
  createdAt: string;
  notes: string;
}

export default function ShipperInvoicesPage() {
  const { toast } = useToast();
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

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

  const pendingConfirmation = invoices.filter(inv => !inv.shipperConfirmed);
  const confirmedInvoices = invoices.filter(inv => inv.shipperConfirmed);

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `Rs. ${num.toLocaleString('en-IN')}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleConfirm = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setConfirmDialogOpen(true);
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

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-invoices-title">Invoices</h1>
        <p className="text-muted-foreground">View and confirm invoices for your loads</p>
      </div>

      {pendingConfirmation.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-warning" />
            <h2 className="text-lg font-semibold">Pending Confirmation</h2>
            <Badge variant="secondary">{pendingConfirmation.length}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Please confirm these invoices to start carrier bidding on your loads.
          </p>
          
          {pendingConfirmation.map(invoice => (
            <Card key={invoice.id} className="border-warning/50">
              <CardContent className="pt-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium" data-testid={`text-invoice-number-${invoice.id}`}>
                        {invoice.invoiceNumber}
                      </span>
                      <Badge variant="outline" className="text-warning border-warning">
                        <Clock className="h-3 w-3 mr-1" />
                        Awaiting Confirmation
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Created: {formatDate(invoice.createdAt)}
                    </p>
                    {invoice.lineItems?.[0] && (
                      <p className="text-sm">{invoice.lineItems[0].description}</p>
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
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedInvoice(invoice)}
                        data-testid={`button-view-invoice-${invoice.id}`}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => handleConfirm(invoice)}
                        data-testid={`button-confirm-invoice-${invoice.id}`}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Confirm
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {confirmedInvoices.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Confirmed Invoices</h2>
          
          {confirmedInvoices.map(invoice => (
            <Card key={invoice.id}>
              <CardContent className="pt-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{invoice.invoiceNumber}</span>
                      <Badge variant="secondary">
                        <Check className="h-3 w-3 mr-1" />
                        Confirmed
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Confirmed: {invoice.shipperConfirmedAt ? formatDate(invoice.shipperConfirmedAt) : 'N/A'}
                    </p>
                    {invoice.lineItems?.[0] && (
                      <p className="text-sm">{invoice.lineItems[0].description}</p>
                    )}
                  </div>
                  
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                    <p className="text-lg font-bold">{formatCurrency(invoice.totalAmount)}</p>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setSelectedInvoice(invoice)}
                      className="mt-2"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {invoices.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No Invoices Yet</h3>
            <p className="text-muted-foreground">
              Invoices will appear here once your loads are priced by the admin.
            </p>
          </CardContent>
        </Card>
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
              {confirmMutation.isPending ? "Confirming..." : "Confirm Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedInvoice && !confirmDialogOpen} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
          </DialogHeader>
          
          {selectedInvoice && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{selectedInvoice.invoiceNumber}</span>
                  <Badge variant={selectedInvoice.shipperConfirmed ? "secondary" : "outline"}>
                    {selectedInvoice.shipperConfirmed ? "Confirmed" : "Pending"}
                  </Badge>
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
                  {selectedInvoice.notes && (
                    <p><span className="text-muted-foreground">Notes:</span> {selectedInvoice.notes}</p>
                  )}
                </div>
                
                {!selectedInvoice.shipperConfirmed && (
                  <Button 
                    className="w-full" 
                    onClick={() => handleConfirm(selectedInvoice)}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Confirm Invoice
                  </Button>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
