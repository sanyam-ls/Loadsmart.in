import { useState } from "react";
import { useLocation } from "wouter";
import { 
  MapPin, Package, Truck, ArrowRight, IndianRupee, 
  Clock, Lock, Unlock, Loader2, RefreshCw, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";

interface LoadCard {
  id: string;
  origin: string;
  destination: string;
  loadType: string | null;
  weight: string | null;
  estimatedDistance: number | null;
  adminFinalPrice: string | null;
  allowCounterBids: boolean | null;
  shipperName: string | null;
  bidCount: number;
  myBid: any | null;
  postedByAdmin: boolean;
  priceFixed: boolean;
  createdAt: string;
}

export default function SoloLoadFeed() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedLoad, setSelectedLoad] = useState<LoadCard | null>(null);
  const [showBidDialog, setShowBidDialog] = useState(false);
  const [bidAmount, setBidAmount] = useState("");
  const [bidNotes, setBidNotes] = useState("");
  const [isAccepting, setIsAccepting] = useState(false);

  const { data: loadsData, isLoading, refetch, isRefetching } = useQuery<LoadCard[]>({
    queryKey: ["/api/carrier/available-loads"],
  });

  const submitBidMutation = useMutation({
    mutationFn: async (data: { load_id: string; amount: string; bid_type: string; notes?: string }) => {
      return apiRequest("POST", "/api/bids/submit", { ...data, carrier_type: "solo" });
    },
    onSuccess: () => {
      toast({ title: "Success", description: isAccepting ? "Load accepted!" : "Counter-bid submitted!" });
      setShowBidDialog(false);
      setSelectedLoad(null);
      setBidAmount("");
      setBidNotes("");
      queryClient.invalidateQueries({ queryKey: ["/api/carrier/available-loads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bids"] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to submit bid", 
        variant: "destructive" 
      });
    },
  });

  const handleAcceptPrice = (load: LoadCard) => {
    setSelectedLoad(load);
    setIsAccepting(true);
    submitBidMutation.mutate({
      load_id: load.id,
      amount: load.adminFinalPrice || "0",
      bid_type: "admin_posted_acceptance",
    });
  };

  const handleCounterBid = (load: LoadCard) => {
    setSelectedLoad(load);
    setIsAccepting(false);
    setBidAmount(load.adminFinalPrice || "");
    setShowBidDialog(true);
  };

  const submitCounter = () => {
    if (!selectedLoad || !bidAmount) return;
    submitBidMutation.mutate({
      load_id: selectedLoad.id,
      amount: bidAmount,
      bid_type: "counter",
      notes: bidNotes || undefined,
    });
  };

  const formatPrice = (price: string | null) => {
    if (!price) return "N/A";
    return new Intl.NumberFormat("en-IN").format(parseFloat(price));
  };

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffHrs > 24) return `${Math.floor(diffHrs / 24)}d ago`;
    if (diffHrs > 0) return `${diffHrs}h ago`;
    return `${diffMins}m ago`;
  };

  const loads = loadsData || [];

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center justify-between p-4 border-b bg-card sticky top-0 z-10">
        <div>
          <h1 className="text-xl font-bold" data-testid="text-page-title">Available Loads</h1>
          <p className="text-sm text-muted-foreground">{loads.length} loads near you</p>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => refetch()}
          disabled={isRefetching}
          data-testid="button-refresh"
        >
          <RefreshCw className={`h-5 w-5 ${isRefetching ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="p-4">
                <Skeleton className="h-20 w-full" />
              </Card>
            ))
          ) : loads.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No loads available</p>
              <p className="text-sm">Check back later for new opportunities</p>
            </div>
          ) : (
            loads.map((load) => (
              <Card 
                key={load.id} 
                className="overflow-hidden hover-elevate"
                data-testid={`card-load-${load.id}`}
              >
                <CardContent className="p-0">
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <MapPin className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                          <span className="font-medium text-sm truncate">{load.origin}</span>
                        </div>
                        <div className="flex items-center gap-2 pl-1.5 mb-1">
                          <div className="w-0.5 h-4 bg-border" />
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-red-600 flex-shrink-0" />
                          <span className="font-medium text-sm truncate">{load.destination}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="flex items-center gap-1 text-lg font-bold text-primary">
                          <IndianRupee className="h-4 w-4" />
                          {formatPrice(load.adminFinalPrice)}
                        </div>
                        <div className="flex items-center gap-1 justify-end text-xs text-muted-foreground">
                          {load.priceFixed ? (
                            <>
                              <Lock className="h-3 w-3" />
                              <span>Fixed</span>
                            </>
                          ) : (
                            <>
                              <Unlock className="h-3 w-3" />
                              <span>Negotiable</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                      {load.loadType && (
                        <div className="flex items-center gap-1">
                          <Truck className="h-3 w-3" />
                          <span>{load.loadType}</span>
                        </div>
                      )}
                      {load.weight && (
                        <div className="flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          <span>{load.weight} MT</span>
                        </div>
                      )}
                      {load.estimatedDistance && (
                        <span>{load.estimatedDistance} km</span>
                      )}
                      <div className="flex items-center gap-1 ml-auto">
                        <Clock className="h-3 w-3" />
                        <span>{getTimeAgo(load.createdAt)}</span>
                      </div>
                    </div>

                    {load.myBid ? (
                      <div className="flex items-center justify-between p-2 bg-muted rounded-md">
                        <span className="text-sm">
                          Your bid: <span className="font-semibold">Rs. {formatPrice(load.myBid.amount)}</span>
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {load.myBid.status === "pending" ? "Pending" : load.myBid.status}
                        </Badge>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button 
                          className="flex-1"
                          onClick={() => handleAcceptPrice(load)}
                          disabled={submitBidMutation.isPending && selectedLoad?.id === load.id}
                          data-testid={`button-accept-${load.id}`}
                        >
                          {submitBidMutation.isPending && selectedLoad?.id === load.id && isAccepting ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : null}
                          Accept Price
                        </Button>
                        {load.allowCounterBids && !load.priceFixed && (
                          <Button 
                            variant="outline" 
                            className="flex-1"
                            onClick={() => handleCounterBid(load)}
                            data-testid={`button-counter-${load.id}`}
                          >
                            Counter Bid
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      <Dialog open={showBidDialog} onOpenChange={setShowBidDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Counter Bid</DialogTitle>
            <DialogDescription>
              {selectedLoad && (
                <span>
                  {selectedLoad.origin} <ArrowRight className="inline h-3 w-3" /> {selectedLoad.destination}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Admin Price</label>
              <div className="text-lg font-bold text-muted-foreground">
                Rs. {formatPrice(selectedLoad?.adminFinalPrice || null)}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Your Offer (Rs.)</label>
              <Input
                type="number"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                placeholder="Enter your price"
                data-testid="input-bid-amount"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Notes (optional)</label>
              <Textarea
                value={bidNotes}
                onChange={(e) => setBidNotes(e.target.value)}
                placeholder="Add any notes for admin..."
                className="resize-none"
                rows={3}
                data-testid="input-bid-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBidDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={submitCounter}
              disabled={!bidAmount || submitBidMutation.isPending}
              data-testid="button-submit-counter"
            >
              {submitBidMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Submit Counter Bid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
