import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Gavel, 
  Check, 
  X, 
  MessageSquare, 
  Clock, 
  Truck,
  Building2,
  User,
  DollarSign,
  ArrowRight,
  FileText,
  Search,
  RefreshCw,
  Package,
} from "lucide-react";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/empty-state";

type Bid = {
  id: string;
  loadId: string;
  carrierId: string;
  amount: string;
  status: string;
  notes?: string;
  proposedTruckId?: string;
  createdAt: string;
  carrier?: {
    id: string;
    username: string;
    companyName?: string;
    carrierType?: string;
  };
  load?: {
    id: string;
    pickupCity: string;
    dropoffCity: string;
    status: string;
    weight?: number;
    requiredTruckType?: string;
  };
  truck?: {
    id: string;
    licensePlate: string;
    truckType: string;
  };
};

type LoadWithBids = {
  load: {
    id: string;
    pickupCity: string;
    dropoffCity: string;
    status: string;
    weight?: number;
    requiredTruckType?: string;
  };
  bids: Bid[];
};

export default function AdminNegotiationsPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [selectedBid, setSelectedBid] = useState<Bid | null>(null);
  const [counterDialogOpen, setCounterDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
  const [counterAmount, setCounterAmount] = useState("");
  const [counterNotes, setCounterNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: bids = [], isLoading, refetch } = useQuery<Bid[]>({
    queryKey: ["/api/bids"],
    refetchInterval: 10000,
  });

  const acceptMutation = useMutation({
    mutationFn: async (bidId: string) => {
      return apiRequest("PATCH", `/api/bids/${bidId}`, { action: "accept" });
    },
    onSuccess: () => {
      toast({
        title: "Bid Accepted",
        description: "The carrier has been finalized for this load. You can now send the invoice to the shipper.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bids"] });
      queryClient.invalidateQueries({ queryKey: ["/api/loads"] });
      setAcceptDialogOpen(false);
      setSelectedBid(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to accept bid",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ bidId, reason }: { bidId: string; reason: string }) => {
      return apiRequest("PATCH", `/api/bids/${bidId}`, { action: "reject", reason });
    },
    onSuccess: () => {
      toast({
        title: "Bid Rejected",
        description: "The carrier has been notified.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bids"] });
      setRejectDialogOpen(false);
      setSelectedBid(null);
      setRejectReason("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject bid",
        variant: "destructive",
      });
    },
  });

  const counterMutation = useMutation({
    mutationFn: async ({ bidId, amount, notes }: { bidId: string; amount: string; notes: string }) => {
      return apiRequest("PATCH", `/api/bids/${bidId}`, { 
        action: "counter", 
        counterAmount: parseFloat(amount),
        notes
      });
    },
    onSuccess: () => {
      toast({
        title: "Counter Offer Sent",
        description: "The carrier has been notified of your counter offer.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bids"] });
      setCounterDialogOpen(false);
      setSelectedBid(null);
      setCounterAmount("");
      setCounterNotes("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send counter offer",
        variant: "destructive",
      });
    },
  });

  const groupedByLoad = useMemo(() => {
    const groups: Record<string, LoadWithBids> = {};
    
    bids.forEach(bid => {
      if (bid.load) {
        const loadId = bid.loadId;
        if (!groups[loadId]) {
          groups[loadId] = {
            load: bid.load,
            bids: [],
          };
        }
        groups[loadId].bids.push(bid);
      }
    });
    
    return Object.values(groups);
  }, [bids]);

  const filteredBids = useMemo(() => {
    return bids.filter(bid => {
      const matchesSearch = searchQuery === "" ||
        bid.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bid.carrier?.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bid.carrier?.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bid.load?.pickupCity?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bid.load?.dropoffCity?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || bid.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [bids, searchQuery, statusFilter]);

  const pendingBids = filteredBids.filter(b => b.status === "pending");
  const counteredBids = filteredBids.filter(b => b.status === "countered");
  const acceptedBids = filteredBids.filter(b => b.status === "accepted");
  const rejectedBids = filteredBids.filter(b => b.status === "rejected");

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline">Pending Review</Badge>;
      case "countered":
        return <Badge variant="secondary">Counter Sent</Badge>;
      case "accepted":
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Accepted</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCarrierTypeBadge = (carrierType?: string) => {
    if (carrierType === "solo") {
      return <Badge variant="outline" className="text-xs"><User className="h-3 w-3 mr-1" />Solo Driver</Badge>;
    }
    return <Badge variant="outline" className="text-xs"><Building2 className="h-3 w-3 mr-1" />Enterprise</Badge>;
  };

  const BidCard = ({ bid }: { bid: Bid }) => (
    <Card className="hover-elevate" data-testid={`card-bid-${bid.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold" data-testid={`text-carrier-${bid.id}`}>
                {bid.carrier?.companyName || bid.carrier?.username}
              </span>
              {getCarrierTypeBadge(bid.carrier?.carrierType)}
              {getStatusBadge(bid.status)}
            </div>
            
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Load:</span>{" "}
              {bid.load?.pickupCity} <ArrowRight className="h-3 w-3 inline" /> {bid.load?.dropoffCity}
            </div>
            
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="font-semibold text-lg" data-testid={`text-amount-${bid.id}`}>
                  ${parseFloat(bid.amount).toLocaleString()}
                </span>
              </div>
              {bid.truck && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Truck className="h-4 w-4" />
                  <span>{bid.truck.licensePlate} ({bid.truck.truckType})</span>
                </div>
              )}
            </div>
            
            {bid.notes && (
              <p className="text-sm text-muted-foreground mt-2">
                <MessageSquare className="h-3 w-3 inline mr-1" />
                {bid.notes}
              </p>
            )}
            
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(new Date(bid.createdAt), "MMM d, yyyy h:mm a")}
            </div>
          </div>
          
          {bid.status === "pending" && (
            <div className="flex gap-2 flex-shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedBid(bid);
                  setCounterAmount(bid.amount);
                  setCounterDialogOpen(true);
                }}
                data-testid={`button-counter-${bid.id}`}
              >
                <MessageSquare className="h-4 w-4 mr-1" />
                Counter
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedBid(bid);
                  setRejectDialogOpen(true);
                }}
                data-testid={`button-reject-${bid.id}`}
              >
                <X className="h-4 w-4 mr-1" />
                Reject
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setSelectedBid(bid);
                  setAcceptDialogOpen(true);
                }}
                data-testid={`button-accept-${bid.id}`}
              >
                <Check className="h-4 w-4 mr-1" />
                Accept
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Negotiation Queue</h1>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-20 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Negotiation Queue</h1>
          <p className="text-muted-foreground">Review and manage carrier bids for all loads</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} data-testid="button-refresh">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by carrier, load, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-status">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="countered">Countered</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-amber-600" data-testid="count-pending">{pendingBids.length}</div>
            <div className="text-sm text-muted-foreground">Pending Review</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600" data-testid="count-countered">{counteredBids.length}</div>
            <div className="text-sm text-muted-foreground">Counter Sent</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600" data-testid="count-accepted">{acceptedBids.length}</div>
            <div className="text-sm text-muted-foreground">Accepted</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600" data-testid="count-rejected">{rejectedBids.length}</div>
            <div className="text-sm text-muted-foreground">Rejected</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" data-testid="tab-pending">
            Pending ({pendingBids.length})
          </TabsTrigger>
          <TabsTrigger value="countered" data-testid="tab-countered">
            Countered ({counteredBids.length})
          </TabsTrigger>
          <TabsTrigger value="accepted" data-testid="tab-accepted">
            Accepted ({acceptedBids.length})
          </TabsTrigger>
          <TabsTrigger value="by-load" data-testid="tab-by-load">
            By Load ({groupedByLoad.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <ScrollArea className="h-[600px]">
            {pendingBids.length === 0 ? (
              <EmptyState
                icon={Gavel}
                title="No pending bids"
                description="When carriers submit bids, they will appear here for your review."
              />
            ) : (
              <div className="space-y-4">
                {pendingBids.map(bid => (
                  <BidCard key={bid.id} bid={bid} />
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="countered">
          <ScrollArea className="h-[600px]">
            {counteredBids.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title="No countered bids"
                description="Bids you've countered will appear here."
              />
            ) : (
              <div className="space-y-4">
                {counteredBids.map(bid => (
                  <BidCard key={bid.id} bid={bid} />
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="accepted">
          <ScrollArea className="h-[600px]">
            {acceptedBids.length === 0 ? (
              <EmptyState
                icon={Check}
                title="No accepted bids"
                description="Accepted bids will appear here. You can send invoices for finalized loads."
              />
            ) : (
              <div className="space-y-4">
                {acceptedBids.map(bid => (
                  <Card key={bid.id} data-testid={`card-accepted-${bid.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">
                              {bid.carrier?.companyName || bid.carrier?.username}
                            </span>
                            {getCarrierTypeBadge(bid.carrier?.carrierType)}
                            {getStatusBadge(bid.status)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {bid.load?.pickupCity} <ArrowRight className="h-3 w-3 inline" /> {bid.load?.dropoffCity}
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            <span className="font-semibold">${parseFloat(bid.amount).toLocaleString()}</span>
                          </div>
                        </div>
                        <Button
                          onClick={() => navigate(`/admin/loads?loadId=${bid.loadId}`)}
                          data-testid={`button-view-load-${bid.id}`}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Send Invoice
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="by-load">
          <ScrollArea className="h-[600px]">
            {groupedByLoad.length === 0 ? (
              <EmptyState
                icon={Package}
                title="No loads with bids"
                description="When carriers bid on loads, they will be grouped here."
              />
            ) : (
              <div className="space-y-6">
                {groupedByLoad.map(({ load, bids: loadBids }) => (
                  <Card key={load.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div>
                          <CardTitle className="text-lg">
                            {load.pickupCity} <ArrowRight className="h-4 w-4 inline" /> {load.dropoffCity}
                          </CardTitle>
                          <CardDescription>
                            Load ID: {load.id.slice(0, 8).toUpperCase()} | {loadBids.length} bid(s)
                          </CardDescription>
                        </div>
                        <Badge variant="outline">{load.status}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {loadBids.map(bid => (
                          <div
                            key={bid.id}
                            className="flex items-center justify-between gap-4 p-3 rounded-md bg-muted/50"
                          >
                            <div className="flex items-center gap-3">
                              {getCarrierTypeBadge(bid.carrier?.carrierType)}
                              <span className="font-medium">
                                {bid.carrier?.companyName || bid.carrier?.username}
                              </span>
                              <span className="font-semibold text-green-600">
                                ${parseFloat(bid.amount).toLocaleString()}
                              </span>
                              {getStatusBadge(bid.status)}
                            </div>
                            {bid.status === "pending" && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedBid(bid);
                                    setRejectDialogOpen(true);
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedBid(bid);
                                    setAcceptDialogOpen(true);
                                  }}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      <Dialog open={acceptDialogOpen} onOpenChange={setAcceptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept Bid</DialogTitle>
            <DialogDescription>
              Accepting this bid will finalize the carrier for this load and auto-reject all other bids.
            </DialogDescription>
          </DialogHeader>
          {selectedBid && (
            <div className="py-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Carrier:</span>
                <span className="font-medium">{selectedBid.carrier?.companyName || selectedBid.carrier?.username}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-semibold text-green-600">${parseFloat(selectedBid.amount).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Load:</span>
                <span>{selectedBid.load?.pickupCity} to {selectedBid.load?.dropoffCity}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcceptDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => selectedBid && acceptMutation.mutate(selectedBid.id)}
              disabled={acceptMutation.isPending}
              data-testid="button-confirm-accept"
            >
              {acceptMutation.isPending ? "Accepting..." : "Accept & Finalize Carrier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Bid</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this bid. The carrier will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Reason for rejection (optional)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              data-testid="input-reject-reason"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => selectedBid && rejectMutation.mutate({ bidId: selectedBid.id, reason: rejectReason })}
              disabled={rejectMutation.isPending}
              data-testid="button-confirm-reject"
            >
              {rejectMutation.isPending ? "Rejecting..." : "Reject Bid"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={counterDialogOpen} onOpenChange={setCounterDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Counter Offer</DialogTitle>
            <DialogDescription>
              Send a counter offer to the carrier.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm font-medium">Counter Amount</label>
              <div className="relative mt-1">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="Enter counter amount"
                  value={counterAmount}
                  onChange={(e) => setCounterAmount(e.target.value)}
                  className="pl-10"
                  data-testid="input-counter-amount"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Notes (optional)</label>
              <Textarea
                placeholder="Add notes for the carrier..."
                value={counterNotes}
                onChange={(e) => setCounterNotes(e.target.value)}
                className="mt-1"
                data-testid="input-counter-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCounterDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => selectedBid && counterMutation.mutate({ 
                bidId: selectedBid.id, 
                amount: counterAmount, 
                notes: counterNotes 
              })}
              disabled={counterMutation.isPending || !counterAmount}
              data-testid="button-confirm-counter"
            >
              {counterMutation.isPending ? "Sending..." : "Send Counter Offer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
