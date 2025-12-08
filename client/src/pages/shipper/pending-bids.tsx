import { Link } from "wouter";
import { useMockData } from "@/lib/mock-data-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Check,
  X,
  Clock,
  DollarSign,
  Truck,
  MapPin,
  TrendingDown,
  TrendingUp,
  MessageSquare,
  ArrowLeftRight,
} from "lucide-react";
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
import { useState } from "react";

export default function PendingBidsPage() {
  const { toast } = useToast();
  const { bids, loads, getPendingBids, getLoadById, acceptBid, rejectBid, counterBid } = useMockData();
  const [selectedBid, setSelectedBid] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"accept" | "reject" | "counter" | null>(null);
  const [counterPrice, setCounterPrice] = useState<string>("");
  const [counterMessage, setCounterMessage] = useState<string>("");

  const pendingBids = getPendingBids();
  const counteredBids = bids.filter(b => b.status === "Countered");
  const activeBids = [...pendingBids, ...counteredBids];

  const handleAccept = (bidId: string) => {
    setSelectedBid(bidId);
    setActionType("accept");
  };

  const handleReject = (bidId: string) => {
    setSelectedBid(bidId);
    setActionType("reject");
  };

  const handleCounter = (bidId: string) => {
    const bid = bids.find(b => b.bidId === bidId);
    if (bid) {
      setCounterPrice(String(Math.round(bid.bidPrice * 0.9)));
      setCounterMessage("We appreciate your bid. Would you consider this counter-offer?");
    }
    setSelectedBid(bidId);
    setActionType("counter");
  };

  const confirmAction = () => {
    if (!selectedBid || !actionType) return;

    if (actionType === "accept") {
      acceptBid(selectedBid);
      toast({
        title: "Bid Accepted",
        description: "The carrier has been notified and assigned to the load.",
      });
    } else if (actionType === "reject") {
      rejectBid(selectedBid);
      toast({
        title: "Bid Rejected",
        description: "The carrier has been notified of your decision.",
      });
    } else if (actionType === "counter") {
      const price = parseFloat(counterPrice);
      if (isNaN(price) || price <= 0) {
        toast({
          title: "Invalid Price",
          description: "Please enter a valid counter-offer price.",
          variant: "destructive",
        });
        return;
      }
      counterBid(selectedBid, price, counterMessage);
      toast({
        title: "Counter-Offer Sent",
        description: "The carrier has been notified of your counter-offer.",
      });
    }

    setSelectedBid(null);
    setActionType(null);
    setCounterPrice("");
    setCounterMessage("");
  };

  const getBidStatusBadge = (status: string, counterPrice?: number | null) => {
    switch (status) {
      case "Pending":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">Pending</Badge>;
      case "Accepted":
        return <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">Accepted</Badge>;
      case "Rejected":
        return <Badge variant="secondary" className="bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400">Rejected</Badge>;
      case "Countered":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
            Countered {counterPrice ? `$${counterPrice.toLocaleString()}` : ""}
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const groupedBids = activeBids.reduce((acc, bid) => {
    if (!acc[bid.loadId]) {
      acc[bid.loadId] = [];
    }
    acc[bid.loadId].push(bid);
    return acc;
  }, {} as Record<string, typeof activeBids>);

  const selectedBidData = selectedBid ? bids.find(b => b.bidId === selectedBid) : null;
  const selectedLoadData = selectedBidData ? getLoadById(selectedBidData.loadId) : null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Link href="/shipper">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Pending Bids</h1>
            <p className="text-muted-foreground">Review and respond to carrier bids on your loads</p>
          </div>
        </div>
        {activeBids.length > 0 && (
          <Link href="/shipper/negotiations">
            <Button data-testid="button-open-negotiations">
              <MessageSquare className="h-4 w-4 mr-2" />
              Open Negotiation Hub
            </Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-total-bids">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Total Pending Bids</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-bids">{pendingBids.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting your response</p>
          </CardContent>
        </Card>

        <Card data-testid="card-loads-with-bids">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Loads with Bids</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-loads-with-bids">{Object.keys(groupedBids).length}</div>
            <p className="text-xs text-muted-foreground">Active negotiations</p>
          </CardContent>
        </Card>

        <Card data-testid="card-avg-bid">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Average Bid</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-avg-bid">
              ${pendingBids.length > 0 
                ? Math.round(pendingBids.reduce((sum, b) => sum + b.bidPrice, 0) / pendingBids.length).toLocaleString() 
                : 0}
            </div>
            <p className="text-xs text-muted-foreground">Across all pending bids</p>
          </CardContent>
        </Card>

        <Card data-testid="card-countered-bids">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Counter-Offers Sent</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-countered-bids">{counteredBids.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting carrier response</p>
          </CardContent>
        </Card>
      </div>

      {Object.entries(groupedBids).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Pending Bids</h3>
            <p className="text-muted-foreground text-center max-w-md">
              You don't have any pending bids at the moment. Post a new load to start receiving bids from carriers.
            </p>
            <Link href="/shipper/post-load">
              <Button className="mt-4" data-testid="button-post-load">Post a Load</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedBids).map(([loadId, loadBids]) => {
          const load = getLoadById(loadId);
          if (!load) return null;

          const lowestBid = Math.min(...loadBids.map(b => b.bidPrice));
          const highestBid = Math.max(...loadBids.map(b => b.bidPrice));

          return (
            <Card key={loadId} data-testid={`card-load-bids-${loadId}`}>
              <CardHeader>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Link href={`/shipper/loads/${loadId}`}>
                        <span className="text-primary hover:underline cursor-pointer" data-testid={`link-load-${loadId}`}>
                          {loadId}
                        </span>
                      </Link>
                      <Badge variant="outline">{load.type}</Badge>
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <MapPin className="h-3 w-3" />
                      {load.pickup} → {load.drop}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <TrendingDown className="h-4 w-4 text-green-600" />
                      <span>Low: ${lowestBid.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4 text-red-600" />
                      <span>High: ${highestBid.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Carrier</TableHead>
                      <TableHead>Bid Amount</TableHead>
                      <TableHead>ETA</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadBids.sort((a, b) => a.bidPrice - b.bidPrice).map((bid) => (
                      <TableRow key={bid.bidId} data-testid={`row-bid-${bid.bidId}`}>
                        <TableCell className="font-medium">{bid.carrierName}</TableCell>
                        <TableCell>
                          <span className={bid.bidPrice === lowestBid ? "text-green-600 font-semibold" : ""}>
                            ${bid.bidPrice.toLocaleString()}
                          </span>
                          {bid.bidPrice === lowestBid && (
                            <Badge variant="outline" className="ml-2 text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                              Best Price
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{bid.eta}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(bid.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{getBidStatusBadge(bid.status, bid.counterPrice)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {bid.status === "Pending" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCounter(bid.bidId)}
                                data-testid={`button-counter-${bid.bidId}`}
                              >
                                <ArrowLeftRight className="h-4 w-4 mr-1" />
                                Counter
                              </Button>
                            )}
                            <Button
                              size="sm"
                              onClick={() => handleAccept(bid.bidId)}
                              data-testid={`button-accept-${bid.bidId}`}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 dark:text-red-400"
                              onClick={() => handleReject(bid.bidId)}
                              data-testid={`button-reject-${bid.bidId}`}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })
      )}

      <Dialog open={!!selectedBid} onOpenChange={() => { setSelectedBid(null); setActionType(null); setCounterPrice(""); setCounterMessage(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "accept" ? "Accept Bid" : actionType === "counter" ? "Counter-Offer" : "Reject Bid"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "accept" 
                ? "Are you sure you want to accept this bid? This will assign the carrier to the load and reject all other bids."
                : actionType === "counter"
                ? "Send a counter-offer to negotiate the price with this carrier."
                : "Are you sure you want to reject this bid? The carrier will be notified of your decision."}
            </DialogDescription>
          </DialogHeader>
          
          {selectedBidData && selectedLoadData && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Carrier</p>
                  <p className="font-medium">{selectedBidData.carrierName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Original Bid</p>
                  <p className="font-medium text-lg">${selectedBidData.bidPrice.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Load</p>
                  <p className="font-medium">{selectedBidData.loadId}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">ETA</p>
                  <p className="font-medium">{selectedBidData.eta}</p>
                </div>
              </div>
              <div className="text-sm">
                <p className="text-muted-foreground">Route</p>
                <p className="font-medium">{selectedLoadData.pickup} → {selectedLoadData.drop}</p>
              </div>

              {actionType === "counter" && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="counter-price">Your Counter-Offer Price</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="counter-price"
                        type="number"
                        placeholder="Enter your counter-offer"
                        className="pl-9"
                        value={counterPrice}
                        onChange={(e) => setCounterPrice(e.target.value)}
                        data-testid="input-counter-price"
                      />
                    </div>
                    {counterPrice && selectedBidData && (
                      <p className="text-xs text-muted-foreground">
                        {parseFloat(counterPrice) < selectedBidData.bidPrice 
                          ? `${Math.round((1 - parseFloat(counterPrice) / selectedBidData.bidPrice) * 100)}% lower than original bid`
                          : parseFloat(counterPrice) > selectedBidData.bidPrice
                          ? `${Math.round((parseFloat(counterPrice) / selectedBidData.bidPrice - 1) * 100)}% higher than original bid`
                          : "Same as original bid"}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="counter-message">Message to Carrier (Optional)</Label>
                    <Textarea
                      id="counter-message"
                      placeholder="Add a note to explain your counter-offer..."
                      value={counterMessage}
                      onChange={(e) => setCounterMessage(e.target.value)}
                      className="resize-none"
                      rows={3}
                      data-testid="input-counter-message"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setSelectedBid(null); setActionType(null); setCounterPrice(""); setCounterMessage(""); }}>
              Cancel
            </Button>
            <Button
              variant={actionType === "reject" ? "destructive" : "default"}
              onClick={confirmAction}
              data-testid={`button-confirm-${actionType}`}
            >
              {actionType === "accept" ? "Accept Bid" : actionType === "counter" ? "Send Counter-Offer" : "Reject Bid"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
