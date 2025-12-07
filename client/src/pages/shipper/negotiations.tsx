import { useState, useRef, useEffect } from "react";
import { Send, DollarSign, Check, X, RefreshCw, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ChatMessage {
  id: string;
  senderId: string;
  content: string;
  type: "text" | "bid" | "counter" | "accepted" | "rejected";
  bidAmount?: number;
  timestamp: Date;
}

interface Negotiation {
  id: string;
  loadId: string;
  carrierId: string;
  carrierName: string;
  loadRoute: string;
  currentBid: number;
  status: "active" | "accepted" | "rejected";
  messages: ChatMessage[];
}

const mockNegotiations: Negotiation[] = [
  {
    id: "n1",
    loadId: "1",
    carrierId: "c1",
    carrierName: "FastHaul Logistics",
    loadRoute: "Los Angeles, CA → Phoenix, AZ",
    currentBid: 2450,
    status: "active",
    messages: [
      { id: "m1", senderId: "c1", content: "Hi! I'm interested in this load. Here's my bid.", type: "text", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2) },
      { id: "m2", senderId: "c1", content: "", type: "bid", bidAmount: 2600, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2) },
      { id: "m3", senderId: "s1", content: "Thanks for your interest. Can you do $2,400?", type: "text", timestamp: new Date(Date.now() - 1000 * 60 * 60) },
      { id: "m4", senderId: "c1", content: "I can meet you in the middle.", type: "text", timestamp: new Date(Date.now() - 1000 * 60 * 30) },
      { id: "m5", senderId: "c1", content: "", type: "counter", bidAmount: 2450, timestamp: new Date(Date.now() - 1000 * 60 * 30) },
    ],
  },
  {
    id: "n2",
    loadId: "1",
    carrierId: "c2",
    carrierName: "Swift Transport",
    loadRoute: "Los Angeles, CA → Phoenix, AZ",
    currentBid: 2380,
    status: "active",
    messages: [
      { id: "m6", senderId: "c2", content: "", type: "bid", bidAmount: 2500, timestamp: new Date(Date.now() - 1000 * 60 * 90) },
      { id: "m7", senderId: "s1", content: "", type: "counter", bidAmount: 2350, timestamp: new Date(Date.now() - 1000 * 60 * 60) },
      { id: "m8", senderId: "c2", content: "Let me check our schedule. Final offer:", type: "text", timestamp: new Date(Date.now() - 1000 * 60 * 20) },
      { id: "m9", senderId: "c2", content: "", type: "bid", bidAmount: 2380, timestamp: new Date(Date.now() - 1000 * 60 * 20) },
    ],
  },
  {
    id: "n3",
    loadId: "3",
    carrierId: "c3",
    carrierName: "Premier Freight",
    loadRoute: "Seattle, WA → Portland, OR",
    currentBid: 1150,
    status: "accepted",
    messages: [
      { id: "m10", senderId: "c3", content: "", type: "bid", bidAmount: 1200, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5) },
      { id: "m11", senderId: "s1", content: "Looks good! Let's do $1,150 and we have a deal.", type: "text", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4) },
      { id: "m12", senderId: "c3", content: "Deal! Looking forward to it.", type: "text", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3) },
      { id: "m13", senderId: "s1", content: "", type: "accepted", bidAmount: 1150, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3) },
    ],
  },
];

export default function NegotiationsPage() {
  const [negotiations] = useState<Negotiation[]>(mockNegotiations);
  const [selectedNeg, setSelectedNeg] = useState<Negotiation | null>(mockNegotiations[0] || null);
  const [newMessage, setNewMessage] = useState("");
  const [counterDialogOpen, setCounterDialogOpen] = useState(false);
  const [counterAmount, setCounterAmount] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [selectedNeg?.messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedNeg) return;
    setNewMessage("");
  };

  const handleCounter = () => {
    if (!counterAmount || !selectedNeg) return;
    setCounterDialogOpen(false);
    setCounterAmount("");
  };

  const renderMessage = (message: ChatMessage, isOwn: boolean) => {
    const isCarrier = message.senderId !== "s1";

    if (message.type === "bid" || message.type === "counter") {
      return (
        <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`} key={message.id}>
          <div className={`max-w-[80%] p-4 rounded-lg ${
            isOwn ? "bg-primary/10 border border-primary/20" : "bg-muted"
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className={`h-4 w-4 ${message.type === "counter" ? "text-amber-500" : "text-primary"}`} />
              <span className="text-sm font-medium">
                {message.type === "counter" ? "Counter Offer" : "Bid"}
              </span>
            </div>
            <p className="text-2xl font-bold">${message.bidAmount?.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-2">
              {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>
      );
    }

    if (message.type === "accepted") {
      return (
        <div className="flex justify-center" key={message.id}>
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 py-2 px-4 no-default-hover-elevate no-default-active-elevate">
            <Check className="h-4 w-4 mr-2" />
            Rate Confirmed: ${message.bidAmount?.toLocaleString()}
          </Badge>
        </div>
      );
    }

    if (message.type === "rejected") {
      return (
        <div className="flex justify-center" key={message.id}>
          <Badge variant="destructive" className="py-2 px-4 no-default-hover-elevate no-default-active-elevate">
            <X className="h-4 w-4 mr-2" />
            Bid Rejected
          </Badge>
        </div>
      );
    }

    return (
      <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`} key={message.id}>
        <div className={`max-w-[70%] px-4 py-2 rounded-lg ${
          isOwn ? "bg-primary text-primary-foreground" : "bg-muted"
        }`}>
          <p className="text-sm">{message.content}</p>
          <p className={`text-xs mt-1 ${isOwn ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
            {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      </div>
    );
  };

  if (negotiations.length === 0) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Negotiations</h1>
        <EmptyState
          icon={MessageSquare}
          title="No negotiations yet"
          description="When carriers bid on your loads, you can negotiate rates and finalize deals here. Start by posting a load to attract bids."
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Negotiations</h1>

      <div className="grid gap-6 lg:grid-cols-3 h-[calc(100vh-200px)]">
        <Card className="lg:col-span-1 flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Active Conversations</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full">
              <div className="p-3 space-y-2">
                {negotiations.map((neg) => (
                  <div
                    key={neg.id}
                    className={`p-3 rounded-lg cursor-pointer hover-elevate ${
                      selectedNeg?.id === neg.id ? "bg-primary/10 border border-primary/20" : "bg-muted/50"
                    }`}
                    onClick={() => setSelectedNeg(neg)}
                    data-testid={`negotiation-item-${neg.id}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {neg.carrierName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm">{neg.carrierName}</span>
                      </div>
                      <Badge
                        variant={neg.status === "accepted" ? "default" : neg.status === "rejected" ? "destructive" : "secondary"}
                        className={neg.status === "accepted" 
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs no-default-hover-elevate no-default-active-elevate" 
                          : "text-xs no-default-hover-elevate no-default-active-elevate"
                        }
                      >
                        {neg.status === "accepted" ? "Confirmed" : neg.status === "rejected" ? "Declined" : "Active"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">{neg.loadRoute}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">${neg.currentBid.toLocaleString()}</span>
                      <span className="text-xs text-muted-foreground">
                        {neg.messages[neg.messages.length - 1]?.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 flex flex-col">
          {selectedNeg ? (
            <>
              <CardHeader className="pb-3 border-b border-border">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {selectedNeg.carrierName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base">{selectedNeg.carrierName}</CardTitle>
                      <p className="text-xs text-muted-foreground">{selectedNeg.loadRoute}</p>
                    </div>
                  </div>
                  {selectedNeg.status === "active" && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setCounterDialogOpen(true)} data-testid="button-counter-offer">
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Counter
                      </Button>
                      <Button size="sm" data-testid="button-accept-bid">
                        <Check className="h-4 w-4 mr-1" />
                        Accept ${selectedNeg.currentBid.toLocaleString()}
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full p-4" ref={scrollRef}>
                  <div className="space-y-4">
                    {selectedNeg.messages.map((message) => renderMessage(message, message.senderId === "s1"))}
                  </div>
                </ScrollArea>
              </CardContent>
              {selectedNeg.status === "active" && (
                <div className="p-4 border-t border-border">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                      data-testid="input-chat-message"
                    />
                    <Button onClick={handleSendMessage} data-testid="button-send-message">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <CardContent className="flex-1 flex items-center justify-center">
              <p className="text-muted-foreground">Select a conversation to view messages</p>
            </CardContent>
          )}
        </Card>
      </div>

      <Dialog open={counterDialogOpen} onOpenChange={setCounterDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Make Counter Offer</DialogTitle>
            <DialogDescription>
              Current bid is ${selectedNeg?.currentBid.toLocaleString()}. Enter your counter offer amount.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <Input
                type="number"
                placeholder="Enter amount"
                value={counterAmount}
                onChange={(e) => setCounterAmount(e.target.value)}
                data-testid="input-counter-amount"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCounterDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCounter} data-testid="button-submit-counter">
              Send Counter Offer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
