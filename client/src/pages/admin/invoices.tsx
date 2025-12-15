import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  FileText, Send, Check, Clock, AlertCircle, DollarSign,
  Search, Filter, Eye, RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

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
  createdAt: string;
  sentAt?: string;
  paidAt?: string;
  dueDate?: string;
}

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
      return <Badge variant="destructive" data-testid="badge-status-disputed"><AlertCircle className="h-3 w-3 mr-1" />Disputed</Badge>;
    default:
      return <Badge variant="outline" data-testid="badge-status-unknown">{status}</Badge>;
  }
}

export default function AdminInvoicesPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { data: invoices = [], isLoading, refetch } = useQuery<Invoice[]>({
    queryKey: ["/api/admin/invoices"],
  });

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
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: invoices.length,
    draft: invoices.filter((i) => i.status === "draft").length,
    sent: invoices.filter((i) => i.status === "sent").length,
    paid: invoices.filter((i) => i.status === "paid").length,
    overdue: invoices.filter((i) => i.status === "overdue").length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Invoice Management</h1>
          <p className="text-muted-foreground">Manage and track all invoices</p>
        </div>
        <Button onClick={() => refetch()} variant="outline" data-testid="button-refresh">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card data-testid="card-stat-total">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total Invoices</div>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-draft">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.draft}</div>
            <div className="text-sm text-muted-foreground">Draft</div>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-sent">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.sent}</div>
            <div className="text-sm text-muted-foreground">Sent</div>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-paid">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
            <div className="text-sm text-muted-foreground">Paid</div>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-overdue">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
            <div className="text-sm text-muted-foreground">Overdue</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
          <CardTitle className="text-lg">All Invoices</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
                data-testid="input-search"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32" data-testid="select-status-filter">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
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
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id} data-testid={`row-invoice-${invoice.id}`}>
                    <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                    <TableCell>{invoice.shipper?.companyName || invoice.shipper?.username || '-'}</TableCell>
                    <TableCell>
                      {invoice.load ? `${invoice.load.pickupCity} → ${invoice.load.dropoffCity}` : '-'}
                    </TableCell>
                    <TableCell className="font-medium">
                      Rs. {parseFloat(invoice.totalAmount || '0').toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(invoice.createdAt).toLocaleDateString()}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
            <DialogDescription>
              Invoice {selectedInvoice?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Shipper</span>
                  <p className="font-medium">{selectedInvoice.shipper?.companyName || selectedInvoice.shipper?.username}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Status</span>
                  <p>{getStatusBadge(selectedInvoice.status)}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Subtotal</span>
                  <p className="font-medium">Rs. {parseFloat(selectedInvoice.subtotal || '0').toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Tax</span>
                  <p className="font-medium">Rs. {parseFloat(selectedInvoice.taxAmount || '0').toLocaleString('en-IN')}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-sm text-muted-foreground">Total Amount</span>
                  <p className="text-xl font-bold">Rs. {parseFloat(selectedInvoice.totalAmount || '0').toLocaleString('en-IN')}</p>
                </div>
              </div>
              {selectedInvoice.load && (
                <div>
                  <span className="text-sm text-muted-foreground">Route</span>
                  <p className="font-medium">{selectedInvoice.load.pickupCity} → {selectedInvoice.load.dropoffCity}</p>
                  <p className="text-sm text-muted-foreground">Load Status: {selectedInvoice.load.status}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
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
