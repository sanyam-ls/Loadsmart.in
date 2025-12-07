import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  ChevronLeft, MapPin, ArrowRight, Package, Calendar, DollarSign, Truck, Clock,
  Users, Edit, Copy, X, CheckCircle, AlertCircle, MessageSquare, FileText,
  RefreshCw, Navigation, Phone, Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Load, Bid, User } from "@shared/schema";

function getStatusColor(status: string | null) {
  switch (status) {
    case "draft": return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
    case "posted": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "bidding": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    case "assigned": return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
    case "in_transit": return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400";
    case "delivered": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "cancelled": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    default: return "bg-muted text-muted-foreground";
  }
}

function getBidStatusColor(status: string | null) {
  switch (status) {
    case "pending": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    case "accepted": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "declined": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    case "countered": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    default: return "bg-muted text-muted-foreground";
  }
}

function formatStatus(status: string | null) {
  if (!status) return "Draft";
  return status.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function formatDate(date: Date | string | null) {
  if (!date) return "TBD";
  return new Date(date).toLocaleDateString("en-US", { 
    month: "short", 
    day: "numeric", 
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatTimeAgo(date: Date | string | null) {
  if (!date) return "";
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export default function LoadDetailPage() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  const [cancelDialog, setCancelDialog] = useState(false);
  const [acceptBidDialog, setAcceptBidDialog] = useState<{ open: boolean; bid: Bid | null }>({ open: false, bid: null });
  const [simulatedEta, setSimulatedEta] = useState<string>("");

  const { data: loadData, isLoading: loadLoading } = useQuery<Load & { bids?: Bid[] }>({
    queryKey: [`/api/loads/${params.id}`],
    enabled: !!params.id,
  });

  const load = loadData;
  const bids = loadData?.bids || [];
  const bidsLoading = loadLoading;

  const { data: carriers = [] } = useQuery<User[]>({
    queryKey: ["/api/carriers"],
  });

  useEffect(() => {
    if (load?.status === "in_transit") {
      const updateEta = () => {
        const baseHours = 4 + Math.random() * 2;
        const eta = new Date(Date.now() + baseHours * 60 * 60 * 1000);
        setSimulatedEta(eta.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }));
      };
      updateEta();
      const interval = setInterval(updateEta, 15000);
      return () => clearInterval(interval);
    }
  }, [load?.status]);

  const cancelMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/loads/${params.id}`, { status: "cancelled" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loads"] });
      queryClient.invalidateQueries({ queryKey: [`/api/loads/${params.id}`] });
      toast({ title: "Load cancelled", description: "The load has been cancelled successfully." });
      setCancelDialog(false);
      navigate("/shipper/loads");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to cancel load", variant: "destructive" });
    },
  });

  const acceptBidMutation = useMutation({
    mutationFn: async (bidId: string) => {
      await apiRequest("PATCH", `/api/bids/${bidId}`, { status: "accepted" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loads"] });
      queryClient.invalidateQueries({ queryKey: [`/api/loads/${params.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/bids"] });
      toast({ title: "Bid accepted", description: "The carrier has been notified and assigned to this load." });
      setAcceptBidDialog({ open: false, bid: null });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to accept bid", variant: "destructive" });
    },
  });

  const declineBidMutation = useMutation({
    mutationFn: async (bidId: string) => {
      await apiRequest("PATCH", `/api/bids/${bidId}`, { status: "rejected" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/loads/${params.id}`] });
      toast({ title: "Bid declined" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to decline bid", variant: "destructive" });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async () => {
      if (!load) return;
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const newLoad = {
        pickupAddress: load.pickupAddress,
        pickupCity: load.pickupCity,
        dropoffAddress: load.dropoffAddress,
        dropoffCity: load.dropoffCity,
        weight: String(load.weight),
        weightUnit: load.weightUnit || "tons",
        cargoDescription: load.cargoDescription || "",
        requiredTruckType: load.requiredTruckType || "dry_van",
        estimatedPrice: String(load.estimatedPrice || 0),
        pickupDate: tomorrow.toISOString(),
        status: "draft",
      };
      await apiRequest("POST", "/api/loads", newLoad);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loads"] });
      toast({ title: "Load duplicated", description: "A new draft load has been created." });
      navigate("/shipper/loads");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to duplicate load", variant: "destructive" });
    },
  });

  const getCarrierName = (carrierId: string) => {
    const carrier = carriers.find(c => c.id === carrierId);
    return carrier?.companyName || carrier?.username || "Unknown Carrier";
  };

  if (loadLoading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <Skeleton className="h-10 w-48 mb-6" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-96" />
          </div>
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (!load) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Load not found</h2>
          <p className="text-muted-foreground mb-4">The load you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => navigate("/shipper/loads")}>Back to Loads</Button>
        </div>
      </div>
    );
  }

  const pendingBids = bids.filter(b => b.status === "pending");
  const lowestBid = pendingBids.length > 0 ? Math.min(...pendingBids.map(b => Number(b.amount))) : null;
  const avgBid = pendingBids.length > 0 ? pendingBids.reduce((sum, b) => sum + Number(b.amount), 0) / pendingBids.length : null;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/shipper/loads")} data-testid="button-back">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Load #{load.id.slice(0, 8)}</h1>
            <Badge className={`${getStatusColor(load.status)} no-default-hover-elevate no-default-active-elevate`}>
              {formatStatus(load.status)}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Created {formatTimeAgo(load.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => duplicateMutation.mutate()} data-testid="button-duplicate">
            <Copy className="h-4 w-4 mr-2" />
            Duplicate
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(`/shipper/loads/${load.id}/edit`)} data-testid="button-edit">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          {load.status !== "cancelled" && load.status !== "delivered" && (
            <Button variant="destructive" size="sm" onClick={() => setCancelDialog(true)} data-testid="button-cancel-load">
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Route Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                    <MapPin className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="w-0.5 h-16 bg-border my-2" />
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                    <MapPin className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                </div>
                <div className="flex-1 space-y-8">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">PICKUP</p>
                    <p className="font-semibold">{load.pickupCity}</p>
                    <p className="text-sm text-muted-foreground">{load.pickupAddress}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(load.pickupDate)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">DELIVERY</p>
                    <p className="font-semibold">{load.dropoffCity}</p>
                    <p className="text-sm text-muted-foreground">{load.dropoffAddress}</p>
                    {load.deliveryDate && (
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(load.deliveryDate)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Distance</p>
                  <p className="text-2xl font-bold">{Number(load.distance || 0).toLocaleString()} mi</p>
                  {load.status === "in_transit" && simulatedEta && (
                    <div className="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                      <p className="text-xs text-muted-foreground">ETA</p>
                      <p className="font-semibold text-blue-600 dark:text-blue-400">{simulatedEta}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        Live tracking
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle className="text-lg">Bids ({bids.length})</CardTitle>
              {pendingBids.length > 0 && (
                <div className="flex items-center gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Lowest:</span>
                    <span className="font-semibold ml-1 text-green-600 dark:text-green-400">${lowestBid?.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Avg:</span>
                    <span className="font-semibold ml-1">${avgBid?.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {bidsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
                </div>
              ) : bids.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">No bids yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Carriers will start bidding once your load is posted</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Carrier</TableHead>
                      <TableHead>Bid Amount</TableHead>
                      <TableHead>ETA</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bids.map((bid) => (
                      <TableRow key={bid.id} data-testid={`row-bid-${bid.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
                              {getCarrierName(bid.carrierId).charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{getCarrierName(bid.carrierId)}</p>
                              <div className="flex items-center gap-1 text-xs text-amber-500">
                                <Star className="h-3 w-3 fill-current" />
                                4.8
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold">${Number(bid.amount).toLocaleString()}</span>
                          {bid.counterAmount && (
                            <span className="text-xs text-muted-foreground ml-1">
                              (Counter: ${Number(bid.counterAmount).toLocaleString()})
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {bid.estimatedPickup ? formatDate(bid.estimatedPickup) : "Not specified"}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getBidStatusColor(bid.status)} no-default-hover-elevate no-default-active-elevate`}>
                            {formatStatus(bid.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatTimeAgo(bid.createdAt)}
                        </TableCell>
                        <TableCell>
                          {bid.status === "pending" && (
                            <div className="flex items-center gap-2">
                              <Button 
                                size="sm" 
                                onClick={() => setAcceptBidDialog({ open: true, bid })}
                                data-testid={`button-accept-bid-${bid.id}`}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Accept
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => declineBidMutation.mutate(bid.id)}
                                data-testid={`button-decline-bid-${bid.id}`}
                              >
                                Decline
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {load.status === "in_transit" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Shipment Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { status: "Pickup confirmed", time: "2 hours ago", icon: CheckCircle, active: true },
                    { status: "In transit", time: "1 hour ago", icon: Truck, active: true },
                    { status: "Delivery pending", time: "ETA: " + simulatedEta, icon: MapPin, active: false },
                  ].map((event, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0 ${
                        event.active ? "bg-green-100 dark:bg-green-900/30" : "bg-muted"
                      }`}>
                        <event.icon className={`h-4 w-4 ${
                          event.active ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                        }`} />
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${event.active ? "" : "text-muted-foreground"}`}>{event.status}</p>
                        <p className="text-sm text-muted-foreground">{event.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Load Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Weight</span>
                <span className="font-medium">{load.weight} {load.weightUnit}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Truck Type</span>
                <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate">
                  {load.requiredTruckType || "Any"}
                </Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Estimated Price</span>
                <span className="font-semibold text-lg">${Number(load.estimatedPrice || 0).toLocaleString()}</span>
              </div>
              {load.finalPrice && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Final Price</span>
                    <span className="font-semibold text-lg text-green-600 dark:text-green-400">
                      ${Number(load.finalPrice).toLocaleString()}
                    </span>
                  </div>
                </>
              )}
              {load.cargoDescription && (
                <>
                  <Separator />
                  <div>
                    <span className="text-muted-foreground text-sm">Cargo Description</span>
                    <p className="mt-1">{load.cargoDescription}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {load.assignedCarrierId && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Assigned Carrier</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                    {getCarrierName(load.assignedCarrierId).charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold">{getCarrierName(load.assignedCarrierId)}</p>
                    <div className="flex items-center gap-1 text-sm text-amber-500">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      4.8 rating
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Phone className="h-4 w-4 mr-2" />
                    Call
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Message
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Bill of Lading</span>
                  <Badge variant="outline" className="ml-auto no-default-hover-elevate no-default-active-elevate">Pending</Badge>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Proof of Delivery</span>
                  <Badge variant="outline" className="ml-auto no-default-hover-elevate no-default-active-elevate">Pending</Badge>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full mt-4">
                Upload Document
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={cancelDialog} onOpenChange={setCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Load</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this load? This action cannot be undone and any pending bids will be declined.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialog(false)}>Keep Load</Button>
            <Button 
              variant="destructive" 
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? "Cancelling..." : "Cancel Load"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={acceptBidDialog.open} onOpenChange={(open) => setAcceptBidDialog({ open, bid: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept Bid</DialogTitle>
            <DialogDescription>
              You are about to accept this bid from {acceptBidDialog.bid && getCarrierName(acceptBidDialog.bid.carrierId)} 
              for ${Number(acceptBidDialog.bid?.amount || 0).toLocaleString()}. The carrier will be notified and assigned to this load.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcceptBidDialog({ open: false, bid: null })}>Cancel</Button>
            <Button 
              onClick={() => acceptBidDialog.bid && acceptBidMutation.mutate(acceptBidDialog.bid.id)}
              disabled={acceptBidMutation.isPending}
            >
              {acceptBidMutation.isPending ? "Accepting..." : "Accept Bid"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
