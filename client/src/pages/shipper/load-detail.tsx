import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  ChevronLeft, MapPin, Calendar, 
  Users, Copy, X, CheckCircle, AlertCircle, Star, FileText, Loader2
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Load, Shipment, User } from "@shared/schema";

function getStatusColor(status: string | null) {
  switch (status) {
    case "pending": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    case "priced": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "posted_to_carriers": return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
    case "open_for_bid": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    case "counter_received": return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
    case "awarded": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "invoice_created":
    case "invoice_sent":
    case "invoice_acknowledged":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "invoice_paid": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "in_transit": return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400";
    case "delivered": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "closed": return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
    case "cancelled": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    default: return "bg-muted text-muted-foreground";
  }
}

function getStatusLabel(status: string | null) {
  switch (status) {
    case "pending": return "Pending Admin Review";
    case "priced": return "Priced";
    case "posted_to_carriers": return "Posted to Carriers";
    case "open_for_bid": return "Open for Bidding";
    case "counter_received": return "Negotiation Active";
    case "awarded": return "Carrier Finalized";
    case "invoice_created": return "Invoice Created";
    case "invoice_sent": return "Invoice Sent";
    case "invoice_acknowledged": return "Invoice Acknowledged";
    case "invoice_paid": return "Paid";
    case "in_transit": return "In Transit";
    case "delivered": return "Delivered";
    case "closed": return "Completed";
    case "cancelled": return "Cancelled";
    default: return status || "Unknown";
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

// Format load ID for display - shows LD-1001 (admin ref) or LD-023 (shipper seq)
function formatLoadId(load: { shipperLoadNumber?: number | null; adminReferenceNumber?: number | null; id: string }): string {
  if (load.adminReferenceNumber) {
    return `LD-${load.adminReferenceNumber}`;
  }
  if (load.shipperLoadNumber) {
    return `LD-${String(load.shipperLoadNumber).padStart(3, '0')}`;
  }
  return load.id.slice(0, 8);
}

type LoadWithCarrier = Load & { assignedCarrier?: User | null };

export default function LoadDetailPage() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  const [cancelDialog, setCancelDialog] = useState(false);

  const { data: load, isLoading, error } = useQuery<LoadWithCarrier>({
    queryKey: ["/api/loads", params.id],
    enabled: !!params.id,
  });

  const { data: shipment } = useQuery<Shipment>({
    queryKey: ["/api/shipments/load", params.id],
    enabled: !!params.id,
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/loads/${params.id}`, { status: "cancelled" });
    },
    onSuccess: () => {
      toast({ title: "Load cancelled", description: "The load has been cancelled successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/loads"] });
      setCancelDialog(false);
      navigate("/shipper/loads");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleCancel = () => {
    cancelMutation.mutate();
  };

  const handleDuplicate = () => {
    toast({ title: "Coming Soon", description: "Load duplication feature is in development." });
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !load) {
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

  const canCancel = !["cancelled", "delivered", "closed", "in_transit"].includes(load.status || "");
  const isFinalized = ["awarded", "invoice_created", "invoice_sent", "invoice_acknowledged", "invoice_paid", "in_transit", "delivered", "closed"].includes(load.status || "");

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/shipper/loads")} data-testid="button-back">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold" data-testid="text-load-id">Load #{formatLoadId(load)}</h1>
            <Badge className={`${getStatusColor(load.status)} no-default-hover-elevate no-default-active-elevate`}>
              {getStatusLabel(load.status)}
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
          {canCancel && (
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
                    <p className="font-semibold" data-testid="text-pickup">
                      {load.pickupAddress}, {load.pickupCity}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(load.pickupDate)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">DELIVERY</p>
                    <p className="font-semibold" data-testid="text-drop">
                      {load.dropoffAddress}, {load.dropoffCity}
                    </p>
                    {load.deliveryDate && (
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          Est. Delivery: {formatDate(load.deliveryDate)}
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
              <CardTitle className="text-lg">Carrier Assignment</CardTitle>
            </CardHeader>
            <CardContent>
              {isFinalized ? (
                <div className="text-center py-4">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-600 dark:text-green-400 mb-3" />
                  <p className="font-medium">Carrier Assigned</p>
                  <p className="text-sm text-muted-foreground mt-1">A carrier has been finalized for this load</p>
                  {load.assignedCarrierId && (
                    <Badge variant="outline" className="mt-3">
                      Carrier ID: {load.assignedCarrierId.slice(0, 8)}
                    </Badge>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="font-medium">Admin-Managed Selection</p>
                  <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                    Our logistics team is reviewing carrier bids and will select the best carrier for your load. 
                    You'll be notified when a carrier is assigned.
                  </p>
                  <Badge variant="outline" className="mt-4">In Review</Badge>
                </div>
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
                <span className="font-medium">{parseFloat(load.weight || "0").toLocaleString()} {load.weightUnit}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Truck Type</span>
                <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate">
                  {load.requiredTruckType || "Any"}
                </Badge>
              </div>
              {load.adminFinalPrice && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Final Price</span>
                    <span className="font-semibold text-lg text-green-600 dark:text-green-400">
                      ${parseFloat(load.adminFinalPrice).toLocaleString()}
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

          {load.assignedCarrierId && isFinalized && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Assigned Carrier</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                    C
                  </div>
                  <div>
                    <p className="font-semibold" data-testid="text-carrier">Carrier Assigned</p>
                    <div className="flex items-center gap-1 text-sm text-amber-500">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      Verified Carrier
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
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Shipment Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <CheckCircle className="h-8 w-8 mx-auto text-green-600 dark:text-green-400 mb-2" />
                <p className="font-medium">Shipment Active</p>
                <p className="text-sm text-muted-foreground">Status: {shipment.status}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!shipment && !isFinalized && (
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
            <Button 
              variant="destructive" 
              onClick={handleCancel} 
              disabled={cancelMutation.isPending}
              data-testid="button-confirm-cancel"
            >
              {cancelMutation.isPending ? "Cancelling..." : "Cancel Load"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
