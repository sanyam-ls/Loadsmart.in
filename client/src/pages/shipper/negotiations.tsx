import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { useMockData, type NegotiationThread, type ChatMessage } from "@/lib/mock-data-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Send,
  Check,
  X,
  DollarSign,
  MessageSquare,
  Truck,
  MapPin,
  Clock,
  Package,
  ArrowLeftRight,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function NegotiationsPage() {
  const { toast } = useToast();
  const {
    bids,
    getPendingBids,
    getLoadById,
    getOrCreateNegotiation,
    sendNegotiationMessage,
    submitCounterOffer,
    acceptNegotiation,
    rejectNegotiation,
    negotiations,
  } = useMockData();

  const [selectedBidId, setSelectedBidId] = useState<string | null>(null);
  const [activeThread, setActiveThread] = useState<NegotiationThread | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [counterAmount, setCounterAmount] = useState("");
  const [showCounterDialog, setShowCounterDialog] = useState(false);
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const pendingBids = getPendingBids();
  const counteredBids = bids.filter(b => b.status === "Countered");
  const activeBids = [...pendingBids, ...counteredBids];

  useEffect(() => {
    if (activeBids.length > 0 && !selectedBidId) {
      setSelectedBidId(activeBids[0].bidId);
    }
  }, [activeBids, selectedBidId]);

  useEffect(() => {
    if (selectedBidId) {
      try {
        const thread = getOrCreateNegotiation(selectedBidId);
        setActiveThread(thread);
      } catch {
        setActiveThread(null);
      }
    }
  }, [selectedBidId, getOrCreateNegotiation]);

  useEffect(() => {
    if (selectedBidId) {
      const updatedThread = negotiations.find(n => n.bidId === selectedBidId);
      if (updatedThread) {
        setActiveThread(updatedThread);
      }
    }
  }, [negotiations, selectedBidId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeThread?.messages]);

  const handleSendMessage = () => {
    if (!messageInput.trim() || !activeThread) return;
    sendNegotiationMessage(activeThread.threadId, messageInput);
    setMessageInput("");
  };

  const handleSubmitCounter = () => {
    if (!activeThread) return;
    const amount = parseFloat(counterAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid counter-offer amount.",
        variant: "destructive",
      });
      return;
    }
    submitCounterOffer(activeThread.threadId, amount);
    setShowCounterDialog(false);
    setCounterAmount("");
    toast({
      title: "Counter-Offer Sent",
      description: `Your counter-offer of $${amount.toLocaleString()} has been submitted.`,
    });
  };

  const handleAccept = () => {
    if (!activeThread) return;
    acceptNegotiation(activeThread.threadId);
    setShowAcceptDialog(false);
    toast({
      title: "Bid Accepted",
      description: "The carrier has been notified and assigned to the load.",
    });
  };

  const handleReject = () => {
    if (!activeThread) return;
    rejectNegotiation(activeThread.threadId);
    setShowRejectDialog(false);
    toast({
      title: "Bid Rejected",
      description: "The carrier has been notified of your decision.",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 no-default-hover-elevate no-default-active-elevate">Active</Badge>;
      case "accepted":
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 no-default-hover-elevate no-default-active-elevate">Accepted</Badge>;
      case "rejected":
        return <Badge variant="secondary" className="bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 no-default-hover-elevate no-default-active-elevate">Rejected</Badge>;
      case "withdrawn":
        return <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">Withdrawn</Badge>;
      default:
        return <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">{status}</Badge>;
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const renderMessage = (msg: ChatMessage) => {
    const isShipper = msg.sender === "shipper";
    
    if (msg.type === "acceptance") {
      return (
        <div key={msg.messageId} className="flex justify-center my-4">
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 py-2 px-4 no-default-hover-elevate no-default-active-elevate">
            <Check className="h-4 w-4 mr-2" />
            Bid Accepted: ${msg.bidAmount?.toLocaleString()}
          </Badge>
        </div>
      );
    }

    if (msg.type === "rejection") {
      return (
        <div key={msg.messageId} className="flex justify-center my-4">
          <Badge variant="destructive" className="py-2 px-4 no-default-hover-elevate no-default-active-elevate">
            <X className="h-4 w-4 mr-2" />
            Bid Rejected
          </Badge>
        </div>
      );
    }

    if (msg.type === "counter_offer" || msg.type === "bid_update") {
      return (
        <div
          key={msg.messageId}
          className={`flex ${isShipper ? "justify-end" : "justify-start"} mb-3`}
          data-testid={`chat-message-${msg.messageId}`}
        >
          <div className={`max-w-[75%]`}>
            <div
              className={`rounded-lg px-4 py-3 ${
                isShipper
                  ? "bg-primary/10 border border-primary/20"
                  : "bg-muted"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className={`h-4 w-4 ${isShipper ? "text-primary" : "text-amber-500"}`} />
                <span className="text-sm font-medium">
                  {isShipper ? "Your Offer" : "Carrier Offer"}
                </span>
              </div>
              <p className="text-xl font-bold">${msg.bidAmount?.toLocaleString()}</p>
              {msg.content && <p className="text-sm mt-2 text-muted-foreground">{msg.content}</p>}
            </div>
            <p className={`text-xs text-muted-foreground mt-1 ${isShipper ? "text-right" : ""}`}>
              {msg.senderName} • {formatTime(msg.timestamp)}
            </p>
          </div>
        </div>
      );
    }
    
    return (
      <div
        key={msg.messageId}
        className={`flex ${isShipper ? "justify-end" : "justify-start"} mb-3`}
        data-testid={`chat-message-${msg.messageId}`}
      >
        <div className={`max-w-[75%]`}>
          <div
            className={`rounded-lg px-4 py-2 ${
              isShipper
                ? "bg-primary text-primary-foreground"
                : "bg-muted"
            }`}
          >
            <p className="text-sm">{msg.content}</p>
          </div>
          <p className={`text-xs text-muted-foreground mt-1 ${isShipper ? "text-right" : ""}`}>
            {msg.senderName} • {formatTime(msg.timestamp)}
          </p>
        </div>
      </div>
    );
  };

  const selectedBid = selectedBidId ? bids.find(b => b.bidId === selectedBidId) : null;
  const selectedLoad = selectedBid ? getLoadById(selectedBid.loadId) : null;

  if (activeBids.length === 0) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/shipper">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Negotiation Hub</h1>
            <p className="text-muted-foreground">Negotiate with carriers in real-time</p>
          </div>
        </div>

        <Card className="py-16">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Active Negotiations</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              Negotiations will appear here when you receive bids on your loads.
            </p>
            <Link href="/shipper/post-load">
              <Button data-testid="button-post-load">
                <Package className="h-4 w-4 mr-2" />
                Post a Load
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/shipper">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Negotiation Hub</h1>
          <p className="text-muted-foreground">
            {activeBids.length} active negotiation{activeBids.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        <Card className="lg:col-span-1 flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Active Bids</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="p-4 space-y-2">
                {activeBids.map(bid => {
                  const load = getLoadById(bid.loadId);
                  const isSelected = selectedBidId === bid.bidId;
                  const thread = negotiations.find(n => n.bidId === bid.bidId);
                  
                  return (
                    <button
                      key={bid.bidId}
                      onClick={() => setSelectedBidId(bid.bidId)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors hover-elevate ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-transparent bg-muted/50"
                      }`}
                      data-testid={`bid-item-${bid.bidId}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {bid.carrierName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-sm">{bid.carrierName}</span>
                        </div>
                        {bid.status === "Countered" && (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 no-default-hover-elevate no-default-active-elevate">
                            Countered
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{load?.pickup?.split(',')[0]}</span>
                        <ArrowLeftRight className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">{load?.drop?.split(',')[0]}</span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="font-semibold text-green-600 dark:text-green-400">
                          ${bid.bidPrice.toLocaleString()}
                        </span>
                        {thread?.carrierTyping && (
                          <span className="text-xs text-muted-foreground animate-pulse">
                            Typing...
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 flex flex-col">
          {activeThread && selectedBid && selectedLoad ? (
            <>
              <CardHeader className="pb-2 border-b">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {selectedBid.carrierName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {selectedBid.carrierName}
                        {getStatusBadge(activeThread.status)}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Load {selectedLoad.loadId} • {selectedLoad.pickup.split(',')[0]} to {selectedLoad.drop.split(',')[0]}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Current Bid</p>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400" data-testid="text-current-bid">
                      ${activeThread.currentBidAmount.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {selectedLoad.pickup}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    ETA: {selectedBid.eta}
                  </span>
                  <span className="flex items-center gap-1">
                    <Package className="h-3 w-3" />
                    {selectedLoad.weight.toLocaleString()} {selectedLoad.weightUnit}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col p-0 min-h-0">
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-1">
                    {activeThread.messages.map(renderMessage)}
                    {activeThread.carrierTyping && (
                      <div className="flex justify-start mb-3">
                        <div className="bg-muted rounded-lg px-4 py-2">
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm text-muted-foreground">
                              {selectedBid.carrierName} is typing...
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {activeThread.status === "active" && (
                  <>
                    <Separator />
                    <div className="p-4 space-y-3">
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          variant="default"
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          onClick={() => setShowAcceptDialog(true)}
                          data-testid="button-accept-bid"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Accept ${activeThread.currentBidAmount.toLocaleString()}
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            setCounterAmount(String(Math.round(activeThread.currentBidAmount * 0.9)));
                            setShowCounterDialog(true);
                          }}
                          data-testid="button-counter-offer"
                        >
                          <ArrowLeftRight className="h-4 w-4 mr-2" />
                          Counter
                        </Button>
                        <Button
                          variant="outline"
                          className="text-destructive border-destructive/30"
                          onClick={() => setShowRejectDialog(true)}
                          data-testid="button-reject-bid"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Type a message..."
                          value={messageInput}
                          onChange={e => setMessageInput(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && handleSendMessage()}
                          data-testid="input-message"
                        />
                        <Button
                          size="icon"
                          onClick={handleSendMessage}
                          disabled={!messageInput.trim()}
                          data-testid="button-send-message"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                {activeThread.status !== "active" && (
                  <div className="p-4 bg-muted/50 text-center">
                    <p className="text-muted-foreground">
                      This negotiation has been {activeThread.status}.
                    </p>
                  </div>
                )}
              </CardContent>
            </>
          ) : (
            <CardContent className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a bid to start negotiating</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      <Dialog open={showCounterDialog} onOpenChange={setShowCounterDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Counter-Offer</DialogTitle>
            <DialogDescription>
              Enter your counter-offer amount. The carrier will be notified immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="counter-amount">Counter-Offer Amount ($)</Label>
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                <Input
                  id="counter-amount"
                  type="number"
                  value={counterAmount}
                  onChange={e => setCounterAmount(e.target.value)}
                  placeholder="Enter amount"
                  data-testid="input-counter-amount"
                />
              </div>
            </div>
            {activeThread && (
              <p className="text-sm text-muted-foreground">
                Current bid: ${activeThread.currentBidAmount.toLocaleString()}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCounterDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitCounter} data-testid="button-confirm-counter">
              Submit Counter-Offer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept Bid</DialogTitle>
            <DialogDescription>
              Are you sure you want to accept this bid?
            </DialogDescription>
          </DialogHeader>
          {activeThread && selectedLoad && (
            <div className="py-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Carrier</span>
                <span className="font-medium">{activeThread.carrierName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-bold text-green-600">${activeThread.currentBidAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Route</span>
                <span>{selectedLoad.pickup.split(',')[0]} to {selectedLoad.drop.split(',')[0]}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAcceptDialog(false)}>
              Cancel
            </Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={handleAccept} data-testid="button-confirm-accept">
              Accept Bid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Bid</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject this bid? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} data-testid="button-confirm-reject">
              Reject Bid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
