import { useState, useMemo, useEffect, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { 
  Search, Filter, Gavel, Clock, CheckCircle, XCircle, RefreshCw, 
  MapPin, Truck, Package, Building2, Star, MessageSquare, Send,
  TrendingUp, AlertTriangle, Timer, ArrowRight, ChevronDown, ChevronRight,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/empty-state";
import { StatCard } from "@/components/stat-card";
import { useCarrierData, type CarrierBid } from "@/lib/carrier-data-store";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { connectMarketplace, disconnectMarketplace, onMarketplaceEvent } from "@/lib/marketplace-socket";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import type { Bid, Load } from "@shared/schema";

function formatCurrency(amount: number): string {
  if (amount >= 100000) {
    return `Rs. ${(amount / 100000).toFixed(1)}L`;
  }
  return `Rs. ${amount.toLocaleString()}`;
}

const statusConfig: Record<CarrierBid["bidStatus"], { label: string; icon: typeof CheckCircle; color: string }> = {
  pending: { label: "Pending", icon: Clock, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  countered: { label: "Countered", icon: RefreshCw, color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  accepted: { label: "Accepted", icon: CheckCircle, color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  rejected: { label: "Rejected", icon: XCircle, color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  expired: { label: "Expired", icon: Clock, color: "bg-muted text-muted-foreground" },
};

interface ChatMessage {
  id: string;
  sender: "carrier" | "admin";
  message: string;
  amount?: number;
  timestamp: Date;
  isSimulated?: boolean;
}

function NegotiationDialog({ bid, onAccept, onCounter, onReject, isOpen }: { 
  bid: CarrierBid; 
  onAccept: () => void;
  onCounter: (amount: number) => void;
  onReject: () => void;
  isOpen: boolean;
}) {
  const [counterAmount, setCounterAmount] = useState(bid.currentRate.toString());
  const [showCounterInput, setShowCounterInput] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const isRealBid = bid.bidId && !bid.bidId.startsWith("bid-");

  useEffect(() => {
    if (!isOpen) return;

    if (isRealBid) {
      setIsLoading(true);
      fetch(`/api/bids/${bid.bidId}/negotiations`, { credentials: "include" })
        .then((res) => res.ok ? res.json() : [])
        .then((data) => {
          const messages: ChatMessage[] = data
            .filter((msg: any) => msg.messageType !== "initial_bid")
            .map((msg: any) => ({
              id: msg.id,
              sender: msg.senderRole === "admin" ? "admin" : "carrier",
              message: msg.message || (msg.messageType === "counter_offer" ? "Counter offer" : "Message"),
              amount: msg.amount ? parseFloat(msg.amount) : undefined,
              timestamp: new Date(msg.createdAt),
              isSimulated: false,
            }));
          setChatMessages(messages);
        })
        .catch(() => setChatMessages([]))
        .finally(() => setIsLoading(false));
    } else {
      setChatMessages(
        bid.negotiationHistory.slice(1).map((msg) => ({
          id: msg.id,
          sender: msg.sender as "carrier" | "admin",
          message: msg.message,
          amount: msg.amount,
          timestamp: new Date(msg.timestamp),
          isSimulated: true,
        }))
      );
    }
  }, [isOpen, bid.bidId, isRealBid, bid.negotiationHistory]);

  useEffect(() => {
    if (!isOpen || !isRealBid) return;

    const unsub = onMarketplaceEvent("negotiation_message", (data) => {
      if (data.bidId === bid.bidId) {
        const newMsg: ChatMessage = {
          id: data.negotiation?.id || `msg-${Date.now()}`,
          sender: data.negotiation?.senderRole === "carrier" ? "carrier" : "admin",
          message: data.negotiation?.message || "Counter offer",
          amount: data.negotiation?.counterAmount ? parseFloat(data.negotiation.counterAmount) : undefined,
          timestamp: new Date(data.negotiation?.createdAt || Date.now()),
          isSimulated: false,
        };
        setChatMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      }
    });

    return () => unsub();
  }, [isOpen, isRealBid, bid.bidId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const sendMessage = async (messageType: "message" | "counter_offer") => {
    if (!isRealBid) {
      if (messageType === "counter_offer") {
        onCounter(parseInt(counterAmount));
        setShowCounterInput(false);
      }
      return;
    }

    setIsSending(true);
    try {
      const payload: any = { messageType };
      if (messageType === "counter_offer") {
        payload.amount = counterAmount;
        payload.message = `Counter offer: Rs. ${parseInt(counterAmount).toLocaleString("en-IN")}`;
      } else {
        payload.message = newMessage;
      }

      await apiRequest("POST", `/api/bids/${bid.bidId}/negotiations`, payload);

      if (messageType === "counter_offer") {
        setShowCounterInput(false);
        toast({ title: "Counter Sent", description: `Your counter offer of ${formatCurrency(parseInt(counterAmount))} has been sent.` });
      } else {
        setNewMessage("");
        toast({ title: "Message Sent", description: "Your message has been sent to the admin." });
      }
    } catch {
      toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };
  
  return (
    <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Negotiation - {bid.loadId}
        </DialogTitle>
        <DialogDescription>
          {bid.pickup} to {bid.dropoff}
        </DialogDescription>
      </DialogHeader>
      
      <div className="grid grid-cols-2 gap-4 py-4">
        <Card>
          <CardContent className="pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Shipper</span>
              <span className="font-medium">{bid.shipperCompany}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Rating</span>
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                <span className="font-medium">{bid.shipperRating.toFixed(1)}</span>
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Load Type</span>
              <span className="font-medium">{bid.loadType}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Weight</span>
              <span className="font-medium">{bid.weight} Tons</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Distance</span>
              <span className="font-medium">{bid.distance} km</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Original Rate</span>
              <span className="font-medium">{formatCurrency(bid.proposedRate)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Your Offer</span>
              <span className="font-medium text-primary">{formatCurrency(bid.carrierOffer)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Est. Profit</span>
              <span className="font-medium text-green-600">{formatCurrency(bid.estimatedProfit)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Negotiation Chat</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-48" ref={scrollRef}>
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : chatMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                No negotiation messages yet
              </div>
            ) : (
              <div className="space-y-3">
                {chatMessages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`flex ${msg.sender === "carrier" ? "justify-end" : "justify-start"}`}
                  >
                    <div 
                      className={`max-w-[80%] rounded-lg p-3 ${
                        msg.sender === "carrier" 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium">
                          {msg.sender === "carrier" ? "You" : "Admin"}
                        </span>
                        <span className="text-xs opacity-70">
                          {format(new Date(msg.timestamp), "MMM d, h:mm a")}
                        </span>
                      </div>
                      <p className="text-sm">{msg.message}</p>
                      {msg.amount && (
                        <p className="text-lg font-bold mt-1">{formatCurrency(msg.amount)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {isRealBid && (bid.bidStatus === "pending" || bid.bidStatus === "countered") && (
        <div className="flex gap-2 pt-2">
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newMessage.trim()) {
                sendMessage("message");
              }
            }}
            className="flex-1"
            data-testid="input-chat-message"
          />
          <Button
            size="icon"
            disabled={!newMessage.trim() || isSending}
            onClick={() => sendMessage("message")}
            data-testid="button-send-message"
          >
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      )}
      
      {(bid.bidStatus === "pending" || bid.bidStatus === "countered") && (
        <div className="space-y-4 pt-4 border-t">
          {bid.bidStatus === "countered" && bid.shipperCounterRate && (
            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="font-medium text-amber-800 dark:text-amber-200">Admin Counter Offer</span>
              </div>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                {formatCurrency(bid.shipperCounterRate)}
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                {bid.timeLeftToRespond}h left to respond
              </p>
            </div>
          )}
          
          {showCounterInput ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Enter counter amount"
                  value={counterAmount}
                  onChange={(e) => setCounterAmount(e.target.value)}
                  className="flex-1"
                  data-testid="input-counter-amount"
                />
                <Button 
                  onClick={() => sendMessage("counter_offer")}
                  disabled={isSending}
                  data-testid="button-submit-counter"
                >
                  {isSending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  Send
                </Button>
              </div>
              <Button 
                variant="ghost" 
                className="w-full" 
                onClick={() => setShowCounterInput(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button 
                className="flex-1" 
                onClick={onAccept}
                data-testid="button-accept-bid"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Accept {bid.shipperCounterRate ? "Counter" : ""}
              </Button>
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowCounterInput(true)}
                data-testid="button-counter-bid"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Counter Offer
              </Button>
              <Button 
                variant="destructive" 
                onClick={onReject}
                data-testid="button-reject-bid"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </DialogContent>
  );
}

export default function CarrierBidsPage() {
  const { bids: mockBids, updateBid, updateBidStatus } = useCarrierData();
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const searchParams = useSearch();
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadTypeFilter, setLoadTypeFilter] = useState("all");
  const [selectedBid, setSelectedBid] = useState<CarrierBid | null>(null);
  const [autoOpenProcessed, setAutoOpenProcessed] = useState(false);
  
  // Fetch real bids from API
  const { data: realBidsData = [] } = useQuery<(Bid & { load?: Load })[]>({
    queryKey: ['/api/carrier/bids'],
    staleTime: 15000,
    refetchInterval: 30000,
    enabled: !!user && user.role === "carrier",
  });
  
  // Convert real bids to CarrierBid format and merge with mock data
  const bids = useMemo(() => {
    const realBids: CarrierBid[] = realBidsData.map((bid) => ({
      bidId: bid.id,
      loadId: bid.loadId,
      shipperName: "Shipper",
      shipperCompany: bid.load?.shipperId || "Unknown Shipper",
      shipperRating: 4.5,
      pickup: bid.load?.pickupCity || bid.load?.pickupAddress || "Origin",
      dropoff: bid.load?.dropoffCity || bid.load?.dropoffAddress || "Destination",
      loadType: bid.load?.vehicleType || "General",
      weight: Number(bid.load?.weight) || 10,
      distance: Number(bid.load?.distance) || 500,
      proposedRate: Number(bid.load?.adminFinalPrice) || Number(bid.amount) || 50000,
      carrierOffer: Number(bid.amount) || 50000,
      currentRate: Number(bid.counterAmount) || Number(bid.amount) || 50000,
      shipperCounterRate: bid.counterAmount ? Number(bid.counterAmount) : null,
      estimatedRevenue: Number(bid.amount) || 50000,
      estimatedProfit: Math.round((Number(bid.amount) || 50000) * 0.2),
      requiredVehicleType: bid.load?.vehicleType || "Open - 17 Feet",
      bidStatus: (bid.status as CarrierBid["bidStatus"]) || "pending",
      timeLeftToRespond: 24,
      submittedAt: new Date(bid.createdAt || Date.now()),
      negotiationHistory: [{
        id: `msg-${bid.id}-1`,
        sender: "carrier" as const,
        message: "Initial bid placed",
        amount: Number(bid.amount),
        timestamp: new Date(bid.createdAt || Date.now()),
      }],
    }));
    
    // Merge real bids with mock bids, prioritizing real bids
    const realBidIds = new Set(realBids.map(b => b.bidId));
    const realLoadIds = new Set(realBids.map(b => b.loadId));
    const filteredMockBids = mockBids.filter(b => !realBidIds.has(b.bidId) && !realLoadIds.has(b.loadId));
    
    return [...realBids, ...filteredMockBids];
  }, [realBidsData, mockBids]);
  
  // Auto-open negotiation dialog when navigating from notification with ?load= parameter
  useEffect(() => {
    if (autoOpenProcessed) return;
    
    const params = new URLSearchParams(searchParams);
    const loadId = params.get("load");
    
    if (loadId && bids.length > 0) {
      const matchingBid = bids.find(b => b.loadId === loadId);
      if (matchingBid) {
        setSelectedBid(matchingBid);
        // Clear the URL parameter
        setLocation("/carrier/bids", { replace: true });
      }
      setAutoOpenProcessed(true);
    }
  }, [searchParams, bids, autoOpenProcessed, setLocation]);

  useEffect(() => {
    if (user?.id && user?.role === "carrier") {
      connectMarketplace("carrier", user.id);
      
      const unsubCounter = onMarketplaceEvent("bid_countered", (data) => {
        if (data.carrierId === user.id) {
          const counterAmount = data.counterAmount || data.bid?.counterAmount;
          if (counterAmount && !isNaN(parseFloat(counterAmount))) {
            updateBidStatus(data.bidId || data.bid?.id, "countered", parseFloat(counterAmount));
          }
          // Invalidate carrier bids cache to refresh from API
          queryClient.invalidateQueries({ queryKey: ['/api/carrier/bids'] });
          toast({
            title: "Counter Offer Received",
            description: `Admin sent a counter offer of Rs. ${parseFloat(counterAmount || "0").toLocaleString("en-IN")}`,
          });
        }
      });

      const unsubAccepted = onMarketplaceEvent("bid_accepted", (data) => {
        if (data.carrierId === user.id) {
          updateBidStatus(data.bidId || data.bid?.id, "accepted");
          // Invalidate carrier bids cache to refresh from API
          queryClient.invalidateQueries({ queryKey: ['/api/carrier/bids'] });
          toast({
            title: "Bid Accepted!",
            description: `Your bid for the load has been accepted. Check your trips.`,
          });
        }
      });

      const unsubRejected = onMarketplaceEvent("bid_rejected", (data) => {
        if (data.carrierId === user.id) {
          updateBidStatus(data.bidId || data.bid?.id, "rejected");
          // Invalidate carrier bids cache to refresh from API
          queryClient.invalidateQueries({ queryKey: ['/api/carrier/bids'] });
          toast({
            title: "Bid Rejected",
            description: "Your bid was not accepted for this load.",
            variant: "destructive",
          });
        }
      });

      return () => {
        unsubCounter();
        unsubAccepted();
        unsubRejected();
        disconnectMarketplace();
      };
    }
  }, [user?.id, user?.role, toast, updateBidStatus]);

  const filteredBids = useMemo(() => {
    return bids.filter((bid) => {
      const matchesStatus = statusFilter === "all" || bid.bidStatus === statusFilter;
      const matchesSearch = 
        bid.pickup.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bid.dropoff.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bid.shipperCompany.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bid.loadId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLoadType = loadTypeFilter === "all" || bid.loadType === loadTypeFilter;
      return matchesStatus && matchesSearch && matchesLoadType;
    });
  }, [bids, statusFilter, searchQuery, loadTypeFilter]);

  const statusCounts = useMemo(() => ({
    all: bids.length,
    pending: bids.filter((b) => b.bidStatus === "pending").length,
    countered: bids.filter((b) => b.bidStatus === "countered").length,
    accepted: bids.filter((b) => b.bidStatus === "accepted").length,
    rejected: bids.filter((b) => b.bidStatus === "rejected").length,
  }), [bids]);
  
  const stats = useMemo(() => {
    const total = bids.length;
    const won = bids.filter(b => b.bidStatus === "accepted").length;
    const pending = bids.filter(b => b.bidStatus === "pending" || b.bidStatus === "countered").length;
    const totalValue = bids.filter(b => b.bidStatus === "accepted").reduce((sum, b) => sum + b.currentRate, 0);
    
    return {
      total,
      won,
      pending,
      winRate: total > 0 ? Math.round((won / total) * 100) : 0,
      totalValue
    };
  }, [bids]);

  const loadTypes = useMemo(() => {
    const types = new Set(bids.map(b => b.loadType));
    return Array.from(types);
  }, [bids]);

  const handleAccept = (bidId: string) => {
    updateBid(bidId, "accept");
    toast({
      title: "Bid Accepted",
      description: "The bid has been accepted. A new trip will be created.",
    });
  };

  const handleCounter = (bidId: string, amount: number) => {
    updateBid(bidId, "counter", amount);
    toast({
      title: "Counter Offer Sent",
      description: `Your counter offer of ${formatCurrency(amount)} has been sent.`,
    });
  };

  const handleReject = (bidId: string) => {
    updateBid(bidId, "reject");
    toast({
      title: "Bid Rejected",
      description: "The bid has been rejected.",
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-bids-title">Negotiation Center</h1>
          <p className="text-muted-foreground">Manage your {bids.length} bids and negotiations</p>
        </div>
      </div>
      
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Bids"
          value={stats.total}
          icon={Gavel}
          subtitle="All time"
          testId="stat-total-bids"
        />
        <StatCard
          title="Active Negotiations"
          value={stats.pending}
          icon={MessageSquare}
          subtitle="Pending response"
          testId="stat-pending-bids"
        />
        <StatCard
          title="Win Rate"
          value={`${stats.winRate}%`}
          icon={TrendingUp}
          subtitle={`${stats.won} won`}
          testId="stat-win-rate"
        />
        <StatCard
          title="Total Value Won"
          value={formatCurrency(stats.totalValue)}
          icon={Package}
          subtitle="Accepted bids"
          testId="stat-total-value"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by route, shipper, or load ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-bids"
          />
        </div>
        <Select value={loadTypeFilter} onValueChange={setLoadTypeFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-load-type">
            <SelectValue placeholder="Load Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {loadTypes.map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="all" className="gap-2" data-testid="tab-all">
            All
            <Badge variant="secondary" className="ml-1">{statusCounts.all}</Badge>
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-2" data-testid="tab-pending">
            Pending
            <Badge variant="secondary" className="ml-1">{statusCounts.pending}</Badge>
          </TabsTrigger>
          <TabsTrigger value="countered" className="gap-2" data-testid="tab-countered">
            Countered
            <Badge variant="secondary" className="ml-1">{statusCounts.countered}</Badge>
          </TabsTrigger>
          <TabsTrigger value="accepted" className="gap-2" data-testid="tab-accepted">
            Accepted
            <Badge variant="secondary" className="ml-1">{statusCounts.accepted}</Badge>
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-2" data-testid="tab-rejected">
            Rejected
            <Badge variant="secondary" className="ml-1">{statusCounts.rejected}</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {filteredBids.length === 0 ? (
        <EmptyState
          icon={Gavel}
          title="No bids found"
          description={
            bids.length === 0
              ? "You haven't placed any bids yet. Browse available loads to start bidding."
              : `No bids match your current filters.`
          }
        />
      ) : (
        <div className="grid gap-4">
          {filteredBids.slice(0, 50).map((bid) => {
            const statusInfo = statusConfig[bid.bidStatus];
            const StatusIcon = statusInfo.icon;
            
            return (
              <Card key={bid.bidId} className="hover-elevate" data-testid={`bid-card-${bid.bidId}`}>
                <CardContent className="p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <Badge className={`${statusInfo.color} no-default-hover-elevate no-default-active-elevate`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusInfo.label}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {bid.loadId}
                        </span>
                        <Badge variant="outline">{bid.loadType}</Badge>
                        {bid.bidStatus === "countered" && bid.timeLeftToRespond > 0 && (
                          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            <Timer className="h-3 w-3 mr-1" />
                            {bid.timeLeftToRespond}h left
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 text-lg">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{bid.pickup}</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{bid.dropoff}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          ({bid.distance} km)
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        <div className="flex items-center gap-1">
                          <Building2 className="h-4 w-4" />
                          <span>{bid.shipperCompany}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                          <span>{bid.shipperRating.toFixed(1)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Package className="h-4 w-4" />
                          <span>{bid.weight} Tons</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Truck className="h-4 w-4" />
                          <span>{bid.requiredVehicleType}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <div className="text-right space-y-1">
                        <div className="text-sm text-muted-foreground">Your Bid</div>
                        <div className="text-xl font-bold">{formatCurrency(bid.carrierOffer)}</div>
                        {bid.shipperCounterRate && bid.bidStatus === "countered" && (
                          <div className="text-sm text-amber-600 dark:text-amber-400">
                            Counter: {formatCurrency(bid.shipperCounterRate)}
                          </div>
                        )}
                        <div className="text-sm text-green-600 dark:text-green-400">
                          +{formatCurrency(bid.estimatedProfit)} profit
                        </div>
                      </div>
                      
                      <Dialog 
                        open={selectedBid?.bidId === bid.bidId} 
                        onOpenChange={(open) => setSelectedBid(open ? bid : null)}
                      >
                        <DialogTrigger asChild>
                          <Button 
                            variant={bid.bidStatus === "countered" ? "default" : "outline"}
                            data-testid={`button-view-${bid.bidId}`}
                          >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            {bid.bidStatus === "countered" ? "Respond" : "View Details"}
                          </Button>
                        </DialogTrigger>
                        <NegotiationDialog 
                          bid={bid}
                          isOpen={selectedBid?.bidId === bid.bidId}
                          onAccept={() => handleAccept(bid.bidId)}
                          onCounter={(amount) => handleCounter(bid.bidId, amount)}
                          onReject={() => handleReject(bid.bidId)}
                        />
                      </Dialog>
                    </div>
                  </div>
                  
                  {bid.negotiationHistory.length > 1 && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <MessageSquare className="h-4 w-4" />
                        <span>Latest: {bid.negotiationHistory[bid.negotiationHistory.length - 1].message}</span>
                        <span className="text-xs">
                          ({format(new Date(bid.negotiationHistory[bid.negotiationHistory.length - 1].timestamp), "MMM d, h:mm a")})
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      
      <p className="text-sm text-muted-foreground">
        Showing {Math.min(filteredBids.length, 50)} of {filteredBids.length} bids
      </p>
    </div>
  );
}
