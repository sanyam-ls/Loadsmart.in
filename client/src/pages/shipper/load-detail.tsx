import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { 
  ChevronLeft, MapPin, Package, Calendar, DollarSign, Truck, 
  Users, Edit, Copy, X, CheckCircle, AlertCircle, Star, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
import { useMockData } from "@/lib/mock-data-store";
import { DocumentManager } from "@/components/document-manager";

function getStatusColor(status: string | null) {
  switch (status) {
    case "Active": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "Bidding": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    case "Assigned": return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
    case "En Route": return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400";
    case "Delivered": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "Cancelled": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    default: return "bg-muted text-muted-foreground";
  }
}

function getBidStatusColor(status: string | null) {
  switch (status) {
    case "Pending": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    case "Accepted": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "Rejected": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    default: return "bg-muted text-muted-foreground";
  }
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
  const [acceptBidDialog, setAcceptBidDialog] = useState<{ open: boolean; bidId: string | null }>({ open: false, bidId: null });

  const { 
    getLoadById, 
    getBidsForLoad, 
    cancelLoad, 
    duplicateLoad, 
    acceptBid, 
    rejectBid,
    getShipmentByLoadId
  } = useMockData();

  const load = getLoadById(params.id || "");
  const bids = getBidsForLoad(params.id || "");
  const shipment = getShipmentByLoadId(params.id || "");

  const handleCancel = () => {
    if (params.id) {
      cancelLoad(params.id);
      toast({ title: "Load cancelled", description: "The load has been cancelled successfully." });
      setCancelDialog(false);
      navigate("/shipper/loads");
    }
  };

  const handleDuplicate = () => {
    if (params.id) {
      const newLoad = duplicateLoad(params.id);
      if (newLoad) {
        toast({ title: "Load duplicated", description: `Created new load ${newLoad.loadId}` });
        navigate("/shipper/loads");
      }
    }
  };

  const handleAcceptBid = () => {
    if (acceptBidDialog.bidId) {
      acceptBid(acceptBidDialog.bidId);
      toast({ title: "Bid accepted", description: "The carrier has been notified and assigned to this load." });
      setAcceptBidDialog({ open: false, bidId: null });
    }
  };

  const handleRejectBid = (bidId: string) => {
    rejectBid(bidId);
    toast({ title: "Bid declined" });
  };

  if (!load) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Load not found</h2>
          <p className="text-muted-foreground mb-4">The load you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => navigate("/shipper/loads")} data-testid="button-back-to-loads">Back to Loads</Button>
        </div>
      </div>
    );
  }

  const pendingBids = bids.filter(b => b.status === "Pending");
  const lowestBid = pendingBids.length > 0 ? Math.min(...pendingBids.map(b => b.bidPrice)) : null;
  const avgBid = pendingBids.length > 0 ? pendingBids.reduce((sum, b) => sum + b.bidPrice, 0) / pendingBids.length : null;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/shipper/loads")} data-testid="button-back">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold" data-testid="text-load-id">Load #{load.loadId}</h1>
            <Badge className={`${getStatusColor(load.status)} no-default-hover-elevate no-default-active-elevate`}>
              {load.status}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Created {formatTimeAgo(load.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDuplicate} data-testid="button-duplicate">
            <Copy className="h-4 w-4 mr-2" />
            Duplicate
          </Button>
          {load.status !== "Cancelled" && load.status !== "Delivered" && (
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
                    <p className="font-semibold" data-testid="text-pickup">{load.pickup}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(load.pickupDate)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">DELIVERY</p>
                    <p className="font-semibold" data-testid="text-drop">{load.drop}</p>
                    {load.eta && (
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          ETA: {load.eta}
                        </span>
                      </div>
                    )}
                  </div>
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
                    <span className="font-semibold ml-1">${Math.round(avgBid || 0).toLocaleString()}</span>
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {bids.length === 0 ? (
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
                      <TableRow key={bid.bidId} data-testid={`row-bid-${bid.bidId}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
                              {bid.carrierName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{bid.carrierName}</p>
                              <div className="flex items-center gap-1 text-xs text-amber-500">
                                <Star className="h-3 w-3 fill-current" />
                                4.8
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`font-semibold ${bid.bidPrice === lowestBid ? "text-green-600" : ""}`}>
                            ${bid.bidPrice.toLocaleString()}
                          </span>
                          {bid.bidPrice === lowestBid && (
                            <Badge variant="outline" className="ml-2 text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                              Best
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{bid.eta}</TableCell>
                        <TableCell>
                          <Badge className={`${getBidStatusColor(bid.status)} no-default-hover-elevate no-default-active-elevate`}>
                            {bid.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatTimeAgo(bid.createdAt)}
                        </TableCell>
                        <TableCell>
                          {bid.status === "Pending" && (
                            <div className="flex items-center gap-2">
                              <Button 
                                size="sm" 
                                onClick={() => setAcceptBidDialog({ open: true, bidId: bid.bidId })}
                                data-testid={`button-accept-bid-${bid.bidId}`}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Accept
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleRejectBid(bid.bidId)}
                                data-testid={`button-decline-bid-${bid.bidId}`}
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
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Load Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Weight</span>
                <span className="font-medium">{load.weight.toLocaleString()} {load.weightUnit}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Truck Type</span>
                <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate">
                  {load.type || "Any"}
                </Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Estimated Price</span>
                <span className="font-semibold text-lg">${load.estimatedPrice.toLocaleString()}</span>
              </div>
              {load.finalPrice && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Final Price</span>
                    <span className="font-semibold text-lg text-green-600 dark:text-green-400">
                      ${load.finalPrice.toLocaleString()}
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

          {load.carrier && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Assigned Carrier</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                    {load.carrier.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold" data-testid="text-carrier">{load.carrier}</p>
                    <div className="flex items-center gap-1 text-sm text-amber-500">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      4.8 rating
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {shipment && (
        <div className="mt-6">
          <DocumentManager shipment={shipment} />
        </div>
      )}

      {!shipment && (load.status === "Active" || load.status === "Bidding") && (
        <div className="mt-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Documents become available after carrier assignment</p>
                <p className="text-xs mt-1">Once a carrier is assigned, you can upload and manage shipment documents here</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={cancelDialog} onOpenChange={setCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Load</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this load? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialog(false)}>
              Keep Load
            </Button>
            <Button variant="destructive" onClick={handleCancel} data-testid="button-confirm-cancel">
              Cancel Load
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={acceptBidDialog.open} onOpenChange={(open) => setAcceptBidDialog({ open, bidId: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept Bid</DialogTitle>
            <DialogDescription>
              Are you sure you want to accept this bid? The carrier will be assigned to your load and all other bids will be rejected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcceptBidDialog({ open: false, bidId: null })}>
              Cancel
            </Button>
            <Button onClick={handleAcceptBid} data-testid="button-confirm-accept">
              Accept Bid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
