import { useState, useEffect } from "react";
import { Loader2, Truck, Package, MapPin, Clock, CheckCircle, RefreshCw, ArrowRight, Calendar, Key, UserCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/empty-state";
import { OtpTripActions } from "@/components/otp-trip-actions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useShipments, useLoads, invalidateAllData } from "@/lib/api-hooks";
import { useAuth } from "@/lib/auth-context";
import { onMarketplaceEvent } from "@/lib/marketplace-socket";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Shipment, Load, Driver } from "@shared/schema";
import { formatDistanceToNow, format } from "date-fns";

function formatLoadId(load?: { adminReferenceNumber?: number | null; shipperLoadNumber?: number | null }): string {
  if (load?.adminReferenceNumber) {
    return `LD-${load.adminReferenceNumber}`;
  }
  if (load?.shipperLoadNumber) {
    return `LD-${String(load.shipperLoadNumber).padStart(3, '0')}`;
  }
  return "—";
}

const statusConfig: Record<string, { label: string; color: string }> = {
  assigned: { label: "Assigned", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  in_transit: { label: "In Transit", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  delivered: { label: "Delivered", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

interface ShipmentWithLoad extends Shipment {
  load?: Load;
}

export default function CarrierShipmentsPage() {
  const { user, carrierType } = useAuth();
  const { toast } = useToast();
  const { data: shipments, isLoading: shipmentsLoading, refetch } = useShipments();
  const { data: loads } = useLoads();
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  const isEnterprise = carrierType === "enterprise";

  const { data: drivers = [] } = useQuery<Driver[]>({
    queryKey: ["/api/drivers"],
    enabled: isEnterprise,
  });

  const assignDriverMutation = useMutation({
    mutationFn: async ({ shipmentId, driverId }: { shipmentId: string; driverId: string }) => {
      return apiRequest("PATCH", `/api/shipments/${shipmentId}/assign-driver`, { driverId });
    },
    onSuccess: () => {
      toast({
        title: "Driver Assigned",
        description: "Driver has been assigned to this shipment.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/shipments"] });
      refetch();
    },
    onError: () => {
      toast({
        title: "Assignment Failed",
        description: "Failed to assign driver. Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    const unsubApproved = onMarketplaceEvent("otp_approved", (data) => {
      refetch();
      toast({
        title: "OTP Approved",
        description: data.otpType === "trip_start" 
          ? "Trip start OTP has been approved. You can now begin your trip."
          : "Trip end OTP has been approved. Trip completed successfully.",
      });
    });

    const unsubCompleted = onMarketplaceEvent("trip_completed", () => {
      refetch();
      toast({
        title: "Trip Completed",
        description: "Your trip has been marked as delivered.",
      });
    });

    const unsubRequested = onMarketplaceEvent("otp_requested", () => {
      refetch();
    });

    return () => {
      unsubApproved();
      unsubCompleted();
      unsubRequested();
    };
  }, [refetch, toast]);

  const carrierShipments: ShipmentWithLoad[] = (shipments || [])
    .filter(s => s.carrierId === user?.id)
    .map(s => ({
      ...s,
      load: (loads || []).find(l => l.id === s.loadId),
    }))
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  const activeShipments = carrierShipments.filter(s => s.status !== "delivered" && s.status !== "cancelled");
  const completedShipments = carrierShipments.filter(s => s.status === "delivered" || s.status === "cancelled");
  
  const selectedShipment = carrierShipments.find(s => s.id === selectedShipmentId) || activeShipments[0];

  const handleRefresh = () => {
    invalidateAllData();
    refetch();
  };

  if (shipmentsLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (carrierShipments.length === 0) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">My Shipments</h1>
        <EmptyState
          icon={Package}
          title="No shipments yet"
          description="When your bids are accepted, your shipments will appear here. You can then use OTP to start and complete trips."
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-shipments-title">My Shipments</h1>
          <p className="text-muted-foreground">
            {activeShipments.length} active, {completedShipments.length} completed
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} data-testid="button-refresh-shipments">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Shipments</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs defaultValue="active">
              <TabsList className="mx-3 mb-2">
                <TabsTrigger value="active" data-testid="tab-active-shipments">
                  Active ({activeShipments.length})
                </TabsTrigger>
                <TabsTrigger value="completed" data-testid="tab-completed-shipments">
                  Completed ({completedShipments.length})
                </TabsTrigger>
              </TabsList>
              <ScrollArea className="h-[calc(100vh-350px)]">
                <TabsContent value="active" className="m-0 px-3 pb-3">
                  {activeShipments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Truck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No active shipments</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {activeShipments.map(shipment => (
                        <div
                          key={shipment.id}
                          className={`p-4 rounded-lg cursor-pointer hover-elevate ${
                            selectedShipment?.id === shipment.id 
                              ? "bg-primary/10 border border-primary/20" 
                              : "bg-muted/50"
                          }`}
                          onClick={() => setSelectedShipmentId(shipment.id)}
                          data-testid={`shipment-card-${shipment.id}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium">{formatLoadId(shipment.load)}</span>
                            <Badge className={`${statusConfig[shipment.status || "assigned"]?.color || statusConfig.assigned.color} text-xs no-default-hover-elevate no-default-active-elevate`}>
                              {statusConfig[shipment.status || "assigned"]?.label || "Assigned"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 text-sm mb-2">
                            <span className="truncate max-w-[80px]">{shipment.load?.pickupCity || "—"}</span>
                            <ArrowRight className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate max-w-[80px]">{shipment.load?.dropoffCity || "—"}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {shipment.startOtpVerified ? (
                              <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                <CheckCircle className="h-3 w-3" />
                                Started
                              </span>
                            ) : shipment.startOtpRequested ? (
                              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                <Clock className="h-3 w-3" />
                                OTP Pending
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Awaiting Start
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="completed" className="m-0 px-3 pb-3">
                  {completedShipments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No completed shipments</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {completedShipments.map(shipment => (
                        <div
                          key={shipment.id}
                          className={`p-4 rounded-lg cursor-pointer hover-elevate ${
                            selectedShipment?.id === shipment.id 
                              ? "bg-primary/10 border border-primary/20" 
                              : "bg-muted/50"
                          }`}
                          onClick={() => setSelectedShipmentId(shipment.id)}
                          data-testid={`shipment-card-${shipment.id}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium">{formatLoadId(shipment.load)}</span>
                            <Badge className={`${statusConfig[shipment.status || "delivered"]?.color} text-xs no-default-hover-elevate no-default-active-elevate`}>
                              {statusConfig[shipment.status || "delivered"]?.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 text-sm">
                            <span className="truncate max-w-[80px]">{shipment.load?.pickupCity || "—"}</span>
                            <ArrowRight className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate max-w-[80px]">{shipment.load?.dropoffCity || "—"}</span>
                          </div>
                          {shipment.completedAt && (
                            <p className="text-xs text-muted-foreground mt-1">
                              <Calendar className="h-3 w-3 inline mr-1" />
                              {format(new Date(shipment.completedAt), "MMM d, yyyy")}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          {selectedShipment ? (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <CardTitle className="text-lg">
                        {selectedShipment.load?.pickupCity || "—"} → {selectedShipment.load?.dropoffCity || "—"}
                      </CardTitle>
                      <CardDescription>
                        Load {formatLoadId(selectedShipment.load)}
                      </CardDescription>
                    </div>
                    <Badge className={`${statusConfig[selectedShipment.status || "assigned"]?.color} no-default-hover-elevate no-default-active-elevate`}>
                      {statusConfig[selectedShipment.status || "assigned"]?.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Pickup</p>
                      <p className="font-medium flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-green-600" />
                        {selectedShipment.load?.pickupCity || "—"}
                      </p>
                      {selectedShipment.load?.pickupAddress && (
                        <p className="text-sm text-muted-foreground">{selectedShipment.load.pickupAddress}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Delivery</p>
                      <p className="font-medium flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-red-600" />
                        {selectedShipment.load?.dropoffCity || "—"}
                      </p>
                      {selectedShipment.load?.dropoffAddress && (
                        <p className="text-sm text-muted-foreground">{selectedShipment.load.dropoffAddress}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3 pt-2 border-t">
                    <div>
                      <p className="text-xs text-muted-foreground">Cargo</p>
                      <p className="font-medium">{selectedShipment.load?.materialType || selectedShipment.load?.goodsToBeCarried || "General"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Weight</p>
                      <p className="font-medium">{selectedShipment.load?.weight || "—"} tonnes</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Created</p>
                      <p className="font-medium">
                        {selectedShipment.createdAt 
                          ? formatDistanceToNow(new Date(selectedShipment.createdAt), { addSuffix: true })
                          : "—"}
                      </p>
                    </div>
                  </div>

                  {isEnterprise && (
                    <div className="pt-4 border-t">
                      <div className="flex items-center gap-2 mb-3">
                        <UserCircle className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium text-sm">Driver Assignment</p>
                      </div>
                      {drivers.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No drivers added yet. Add drivers in the Drivers section to assign them to shipments.
                        </p>
                      ) : selectedShipment.driverId ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">
                            {drivers.find(d => d.id === selectedShipment.driverId)?.name || "Assigned Driver"}
                          </Badge>
                          <Select
                            onValueChange={(driverId) => {
                              assignDriverMutation.mutate({
                                shipmentId: selectedShipment.id,
                                driverId,
                              });
                            }}
                            disabled={assignDriverMutation.isPending}
                          >
                            <SelectTrigger className="w-[140px]" data-testid="select-reassign-driver">
                              <SelectValue placeholder="Change driver" />
                            </SelectTrigger>
                            <SelectContent>
                              {drivers
                                .filter(d => d.status === "available" && d.id !== selectedShipment.driverId)
                                .map(driver => (
                                  <SelectItem key={driver.id} value={driver.id}>
                                    {driver.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Select
                            onValueChange={(driverId) => {
                              assignDriverMutation.mutate({
                                shipmentId: selectedShipment.id,
                                driverId,
                              });
                            }}
                            disabled={assignDriverMutation.isPending}
                          >
                            <SelectTrigger className="w-[200px]" data-testid="select-driver">
                              <SelectValue placeholder="Select a driver" />
                            </SelectTrigger>
                            <SelectContent>
                              {drivers
                                .filter(d => d.status === "available")
                                .map(driver => (
                                  <SelectItem key={driver.id} value={driver.id}>
                                    {driver.name} - {driver.phone}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          {assignDriverMutation.isPending && (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <OtpTripActions 
                shipment={selectedShipment} 
                loadStatus={selectedShipment.load?.status || undefined}
                onStateChange={handleRefresh}
              />
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Select a shipment to view details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
