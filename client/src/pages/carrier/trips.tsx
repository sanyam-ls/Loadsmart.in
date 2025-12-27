import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  MapPin, Truck, Clock, CheckCircle, Upload, Navigation, Fuel, User, 
  AlertTriangle, TrendingUp, Route, Calendar, Timer, Shield, Gauge,
  ArrowRight, Package, Building2, PlayCircle, PauseCircle, Coffee,
  FileText, Eye, Download, Key, Lock, Unlock, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { EmptyState } from "@/components/empty-state";
import { StatCard } from "@/components/stat-card";
import { useToast } from "@/hooks/use-toast";
import { type CarrierTrip } from "@/lib/carrier-data-store";
import { format, addHours } from "date-fns";
import { OtpTripActions } from "@/components/otp-trip-actions";
import { useAuth } from "@/lib/auth-context";
import { useShipments, useLoads } from "@/lib/api-hooks";
import { onMarketplaceEvent } from "@/lib/marketplace-socket";
import type { Shipment, Load, Driver, Truck as DbTruck } from "@shared/schema";

import lrConsignmentNote from "@assets/generated_images/lr_consignment_note_document.png";
import ewayBill from "@assets/generated_images/e-way_bill_document.png";
import podDocument from "@assets/generated_images/proof_of_delivery_document.png";
import loadingPhotos from "@assets/generated_images/loading_photos_cargo_truck.png";

const documentImages: Record<string, string> = {
  "LR / Consignment Note": lrConsignmentNote,
  "E-way Bill": ewayBill,
  "Loading Photos": loadingPhotos,
  "Proof of Delivery (POD)": podDocument,
};

interface RealShipment {
  id: string;
  loadId: string;
  status: string;
  startOtpRequested: boolean;
  startOtpVerified: boolean;
  endOtpRequested: boolean;
  endOtpVerified: boolean;
  load?: {
    adminReferenceNumber?: number;
    pickupCity?: string;
    dropoffCity?: string;
  };
}

function formatCurrency(amount: number | undefined | null): string {
  const value = amount ?? 0;
  if (value >= 100000) {
    return `Rs. ${(value / 100000).toFixed(1)}L`;
  }
  return `Rs. ${value.toLocaleString()}`;
}

const statusConfig: Record<CarrierTrip["status"], { label: string; color: string }> = {
  awaiting_pickup: { label: "Awaiting Pickup", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  picked_up: { label: "Picked Up", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  in_transit: { label: "In Transit", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  at_checkpoint: { label: "At Checkpoint", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400" },
  out_for_delivery: { label: "Out for Delivery", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  delivered: { label: "Delivered", color: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400" },
};

function convertShipmentToTrip(
  shipment: Shipment, 
  load: Load | undefined, 
  drivers: Driver[], 
  trucks: DbTruck[]
): CarrierTrip {
  const loadId = load?.adminReferenceNumber 
    ? `LD-${String(load.adminReferenceNumber).padStart(3, '0')}` 
    : `LD-${shipment.loadId.slice(0, 6)}`;
  
  let status: CarrierTrip["status"] = "awaiting_pickup";
  let progress = 0;
  
  if (shipment.endOtpVerified) {
    status = "delivered";
    progress = 100;
  } else if (shipment.status === "in_transit") {
    status = "in_transit";
    progress = 50;
  } else if (shipment.startOtpVerified) {
    status = "in_transit";
    progress = 30;
  } else if (shipment.startOtpRequested) {
    status = "awaiting_pickup";
    progress = 10;
  }

  const totalDistance = typeof load?.distance === 'number' ? load.distance : 500;
  const rate = (load as any)?.adminPrice || load?.finalPrice || 0;
  const now = new Date();
  const createdAt = shipment.createdAt instanceof Date ? shipment.createdAt : new Date(shipment.createdAt || now);

  const assignedDriver = shipment.driverId ? drivers.find(d => d.id === shipment.driverId) : null;
  const assignedTruck = shipment.truckId 
    ? trucks.find(t => t.id === shipment.truckId) 
    : (load as any)?.assignedTruckId 
      ? trucks.find(t => t.id === (load as any).assignedTruckId)
      : trucks[0];

  const driverName = assignedDriver?.name || "Unassigned";
  const driverLicense = assignedDriver?.licenseNumber || "—";
  const truckName = assignedTruck 
    ? `${assignedTruck.make || ""} ${assignedTruck.model || ""} (${assignedTruck.licensePlate || ""})`.trim()
    : "Unassigned";

  return {
    tripId: `real-${shipment.id}`,
    loadId,
    pickup: load?.pickupCity || "Unknown",
    dropoff: load?.dropoffCity || "Unknown",
    status,
    progress,
    totalDistance,
    completedDistance: Math.round(totalDistance * (progress / 100)),
    eta: addHours(now, 12),
    originalEta: addHours(now, 12),
    rate,
    profitabilityEstimate: Math.round(rate * 0.25),
    currentLocation: load?.pickupCity || "En route",
    driverAssigned: driverName,
    driverAssignedId: shipment.driverId || "unassigned",
    truckAssigned: truckName,
    truckAssignedId: assignedTruck?.id || "unassigned",
    loadType: (load as any)?.cargoType || "General",
    weight: typeof load?.weight === 'number' ? load.weight : 10,
    startDate: createdAt,
    fuel: { fuelConsumed: 0, costPerLiter: 95, totalFuelCost: 0, fuelEfficiency: 4, costOverrun: 0, refuelAlerts: [] },
    driverInsights: { driverName, driverLicense, drivingHoursToday: 0, breaksTaken: 0, speedingAlerts: 0, harshBrakingEvents: 0, safetyScore: 85, idleTime: 0 },
    allStops: [
      { stopId: "s1", location: load?.pickupCity || "Origin", type: "pickup", status: shipment.startOtpVerified ? "completed" : "pending", scheduledTime: createdAt, actualTime: shipment.startOtpVerified ? createdAt : null },
      { stopId: "s2", location: load?.dropoffCity || "Destination", type: "delivery", status: shipment.endOtpVerified ? "completed" : "pending", scheduledTime: addHours(createdAt, 12), actualTime: shipment.endOtpVerified ? now : null },
    ],
    timeline: [
      { eventId: "e1", type: "pickup", description: "Shipment assigned", timestamp: createdAt, location: load?.pickupCity || "Origin" },
    ],
    shipperName: (load as any)?.shipperName || "Shipper",
  };
}

export default function TripsPage() {
  const { toast } = useToast();
  const { user, carrierType } = useAuth();
  const { data: shipments = [], refetch: refetchShipments } = useShipments();
  const { data: loads = [] } = useLoads();
  const [selectedTrip, setSelectedTrip] = useState<CarrierTrip | null>(null);
  const [detailTab, setDetailTab] = useState("overview");
  const [documentViewerOpen, setDocumentViewerOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<{ type: string; image: string } | null>(null);

  const isEnterprise = carrierType === "enterprise";

  const { data: drivers = [] } = useQuery<Driver[]>({
    queryKey: ["/api/drivers"],
    enabled: isEnterprise,
  });

  const { data: trucks = [] } = useQuery<DbTruck[]>({
    queryKey: ["/api/trucks"],
  });

  const activeTrips = useMemo(() => {
    const carrierShipments = shipments.filter(s => s.carrierId === user?.id && s.status !== "delivered" && s.status !== "cancelled");
    return carrierShipments.map(shipment => {
      const load = loads.find(l => l.id === shipment.loadId);
      return convertShipmentToTrip(shipment, load, drivers, trucks);
    });
  }, [shipments, loads, user?.id, drivers, trucks]);

  useEffect(() => {
    if (!selectedTrip && activeTrips.length > 0) {
      setSelectedTrip(activeTrips[0]);
    }
  }, [activeTrips, selectedTrip]);

  useEffect(() => {
    const unsubApproved = onMarketplaceEvent("otp_approved", () => {
      refetchShipments();
      toast({ title: "OTP Approved", description: "Trip OTP has been verified" });
    });
    const unsubCompleted = onMarketplaceEvent("trip_completed", () => {
      refetchShipments();
      toast({ title: "Trip Completed", description: "Trip marked as delivered" });
    });
    const unsubRequested = onMarketplaceEvent("otp_requested", () => {
      refetchShipments();
    });
    return () => { unsubApproved(); unsubCompleted(); unsubRequested(); };
  }, [refetchShipments, toast]);

  const matchedShipment = useMemo(() => {
    if (!selectedTrip) return null;
    const loadNum = selectedTrip.loadId.replace('LD-', '').replace(/^0+/, '');
    return shipments.find(s => {
      const load = loads.find(l => l.id === s.loadId);
      return load?.adminReferenceNumber?.toString() === loadNum || s.id === selectedTrip.tripId.replace('real-', '');
    });
  }, [selectedTrip, shipments, loads]);

  function openDocumentViewer(docType: string) {
    const image = documentImages[docType];
    if (image) {
      setSelectedDocument({ type: docType, image });
      setDocumentViewerOpen(true);
    }
  }

  const stats = useMemo(() => {
    const inTransit = activeTrips.filter(t => t.status === "in_transit").length;
    const pickingUp = activeTrips.filter(t => t.status === "awaiting_pickup" || t.status === "picked_up").length;
    const delivering = activeTrips.filter(t => t.status === "out_for_delivery").length;
    const totalRevenue = activeTrips.reduce((sum, t) => sum + (t.rate || 0), 0);
    const avgProgress = activeTrips.length > 0 
      ? Math.round(activeTrips.reduce((sum, t) => sum + (t.progress || 0), 0) / activeTrips.length)
      : 0;
    
    return { inTransit, pickingUp, delivering, totalRevenue, avgProgress };
  }, [activeTrips]);

  const handleStatusUpdate = (newStatus: CarrierTrip["status"]) => {
    if (!selectedTrip) return;
    toast({
      title: "Status Update",
      description: `Use the OTP workflow below to update trip status. Request Start/End OTP and have shipper verify.`,
    });
  };

  if (activeTrips.length === 0) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Active Trips</h1>
        <EmptyState
          icon={Truck}
          title="No active trips"
          description="When shippers accept your bids, your trips will appear here. Browse available loads to start bidding."
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-trips-title">Trip Intelligence</h1>
          <p className="text-muted-foreground">Manage your {activeTrips.length} active trips</p>
        </div>
      </div>
      
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Active Trips"
          value={activeTrips.length}
          icon={Truck}
          subtitle="In progress"
          testId="stat-active-trips"
        />
        <StatCard
          title="In Transit"
          value={stats.inTransit}
          icon={Route}
          subtitle="On the road"
          testId="stat-in-transit"
        />
        <StatCard
          title="Picking Up"
          value={stats.pickingUp}
          icon={Package}
          subtitle="At origin"
          testId="stat-picking-up"
        />
        <StatCard
          title="Delivering"
          value={stats.delivering}
          icon={MapPin}
          subtitle="Near destination"
          testId="stat-delivering"
        />
        <StatCard
          title="Trip Revenue"
          value={formatCurrency(stats.totalRevenue)}
          icon={TrendingUp}
          subtitle="All active trips"
          testId="stat-revenue"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Current Trips ({activeTrips.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-420px)]">
              <div className="p-3 space-y-2">
                {activeTrips.map((trip) => (
                  <div
                    key={trip.tripId}
                    className={`p-4 rounded-lg cursor-pointer hover-elevate ${
                      selectedTrip?.tripId === trip.tripId ? "bg-primary/10 border border-primary/20" : "bg-muted/50"
                    }`}
                    onClick={() => setSelectedTrip(trip)}
                    data-testid={`trip-item-${trip.tripId}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">{trip.loadId}</span>
                      <Badge className={`${statusConfig[trip.status].color} text-xs no-default-hover-elevate no-default-active-elevate`}>
                        {statusConfig[trip.status].label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-sm mb-2">
                      <span className="font-medium truncate max-w-[80px]">{trip.pickup}</span>
                      <ArrowRight className="h-3 w-3 flex-shrink-0" />
                      <span className="font-medium truncate max-w-[80px]">{trip.dropoff}</span>
                    </div>
                    <Progress value={trip.progress} className="h-2 mb-2" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate max-w-[100px]">{trip.currentLocation}</span>
                      </span>
                      <span className="font-medium text-foreground">{formatCurrency(trip.rate)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          {selectedTrip ? (
            <>
              <CardHeader className="pb-3 border-b border-border">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-lg">{selectedTrip.pickup} to {selectedTrip.dropoff}</CardTitle>
                      <Badge className={`${statusConfig[selectedTrip.status].color} no-default-hover-elevate no-default-active-elevate`}>
                        {statusConfig[selectedTrip.status].label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                      <span>{selectedTrip.loadId}</span>
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {selectedTrip.shipperName}
                      </span>
                      <span className="font-medium text-foreground">{formatCurrency(selectedTrip.rate)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">ETA</p>
                    <p className="font-semibold">
                      {format(new Date(selectedTrip.eta), "MMM d, h:mm a")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span>{selectedTrip.completedDistance} km</span>
                      <span>{selectedTrip.totalDistance} km</span>
                    </div>
                    <Progress value={selectedTrip.progress} />
                  </div>
                  <span className="font-bold text-lg">{selectedTrip.progress}%</span>
                </div>
              </CardHeader>
              
              <CardContent className="p-0">
                <Tabs value={detailTab} onValueChange={setDetailTab}>
                  <TabsList className="w-full justify-start rounded-none border-b px-4 flex-wrap">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="security">Security</TabsTrigger>
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                    <TabsTrigger value="fuel">Fuel</TabsTrigger>
                    <TabsTrigger value="driver">Driver</TabsTrigger>
                    <TabsTrigger value="timeline">Timeline</TabsTrigger>
                  </TabsList>
                  
                  <div className="p-4">
                    <TabsContent value="overview" className="mt-0 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <Card>
                          <CardContent className="pt-4 space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Load Type</span>
                              <span className="font-medium">{selectedTrip.loadType}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Weight</span>
                              <span className="font-medium">{selectedTrip.weight} Tons</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Driver</span>
                              <span className="font-medium">{selectedTrip.driverAssigned}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Truck</span>
                              <span className="font-medium">{selectedTrip.truckAssigned}</span>
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardContent className="pt-4 space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Profitability</span>
                              <span className="font-medium text-green-600">{formatCurrency(selectedTrip.profitabilityEstimate)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Total Distance</span>
                              <span className="font-medium">{selectedTrip.totalDistance} km</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Stops</span>
                              <span className="font-medium">{selectedTrip.allStops.length}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Started</span>
                              <span className="font-medium">{format(new Date(selectedTrip.startDate), "MMM d")}</span>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-3">Route Stops</h4>
                        <div className="space-y-2">
                          {selectedTrip.allStops.map((stop, idx) => (
                            <div key={stop.stopId} className="flex items-center gap-3 p-2 rounded-md bg-muted/50">
                              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                                stop.status === "completed" 
                                  ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" 
                                  : "bg-muted"
                              }`}>
                                {stop.status === "completed" ? (
                                  <CheckCircle className="h-4 w-4" />
                                ) : (
                                  <span className="text-xs font-medium">{idx + 1}</span>
                                )}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-sm">{stop.location}</p>
                                <p className="text-xs text-muted-foreground capitalize">{stop.type}</p>
                              </div>
                              {stop.actualTime && (
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(stop.actualTime), "h:mm a")}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="security" className="mt-0 space-y-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Key className="h-5 w-5 text-primary" />
                            OTP Security Gate
                          </CardTitle>
                          <CardDescription>
                            Secure your trip with OTP verification at pickup and delivery
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {matchedShipment ? (
                            <OtpTripActions 
                              shipment={matchedShipment as any} 
                              onStateChange={() => refetchShipments()}
                            />
                          ) : (
                            <div className="space-y-4">
                              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                                <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                  <Lock className="h-5 w-5 text-amber-600" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium">Trip Start</p>
                                  <p className="text-sm text-muted-foreground">Verify OTP at pickup location</p>
                                </div>
                                <Badge variant="outline">Pending</Badge>
                              </div>
                              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                  <Lock className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium">Trip End</p>
                                  <p className="text-sm text-muted-foreground">Verify OTP at delivery location</p>
                                </div>
                                <Badge variant="outline" className="text-muted-foreground">Locked</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground text-center">
                                OTP data will sync when shipment is connected
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>
                    
                    <TabsContent value="documents" className="mt-0 space-y-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            Trip Documents
                          </CardTitle>
                          <CardDescription>
                            View and manage shipment documents
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {["LR / Consignment Note", "E-way Bill", "Loading Photos", "Proof of Delivery (POD)"].map((docType, index) => (
                              <div 
                                key={index} 
                                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover-elevate cursor-pointer"
                                onClick={() => openDocumentViewer(docType)}
                                data-testid={`trip-document-${index}`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                                    <FileText className="h-4 w-4 text-primary" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-sm">{docType}</p>
                                    <p className="text-xs text-muted-foreground">Click to view</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-muted-foreground">Sample</Badge>
                                  <Eye className="h-4 w-4 text-muted-foreground" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                    
                    <TabsContent value="fuel" className="mt-0 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <Card>
                          <CardContent className="pt-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Fuel className="h-5 w-5 text-amber-500" />
                              <span className="font-medium">Fuel Consumed</span>
                            </div>
                            <p className="text-2xl font-bold">{selectedTrip.fuel.fuelConsumed} L</p>
                            <p className="text-sm text-muted-foreground">
                              @ Rs. {selectedTrip.fuel.costPerLiter}/L
                            </p>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardContent className="pt-4">
                            <div className="flex items-center gap-2 mb-2">
                              <TrendingUp className="h-5 w-5 text-green-500" />
                              <span className="font-medium">Fuel Cost</span>
                            </div>
                            <p className="text-2xl font-bold">{formatCurrency(selectedTrip.fuel.totalFuelCost)}</p>
                            <p className="text-sm text-muted-foreground">
                              {selectedTrip.fuel.fuelEfficiency} km/L efficiency
                            </p>
                          </CardContent>
                        </Card>
                      </div>
                      
                      {selectedTrip.fuel.costOverrun > 0 && (
                        <Card className="border-amber-500">
                          <CardContent className="pt-4">
                            <div className="flex items-center gap-2 text-amber-600">
                              <AlertTriangle className="h-5 w-5" />
                              <span className="font-medium">Cost Overrun Detected</span>
                            </div>
                            <p className="text-lg font-bold text-amber-600 mt-1">
                              +{formatCurrency(selectedTrip.fuel.costOverrun)}
                            </p>
                          </CardContent>
                        </Card>
                      )}
                      
                      {selectedTrip.fuel.refuelAlerts.length > 0 && (
                        <Card className="border-red-500">
                          <CardContent className="pt-4">
                            <div className="flex items-center gap-2 text-red-600 mb-2">
                              <Fuel className="h-5 w-5" />
                              <span className="font-medium">Refuel Alerts</span>
                            </div>
                            {selectedTrip.fuel.refuelAlerts.map((alert, idx) => (
                              <p key={idx} className="text-sm text-red-600">{alert}</p>
                            ))}
                          </CardContent>
                        </Card>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="driver" className="mt-0 space-y-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            <User className="h-5 w-5" />
                            {selectedTrip.driverInsights.driverName}
                          </CardTitle>
                          <CardDescription>License: {selectedTrip.driverInsights.driverLicense}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Safety Score</span>
                            <div className="flex items-center gap-2">
                              <Progress 
                                value={selectedTrip.driverInsights.safetyScore} 
                                className="w-24 h-2" 
                              />
                              <span className={`font-bold ${
                                selectedTrip.driverInsights.safetyScore > 80 
                                  ? "text-green-600" 
                                  : selectedTrip.driverInsights.safetyScore > 60 
                                    ? "text-amber-600" 
                                    : "text-red-600"
                              }`}>
                                {selectedTrip.driverInsights.safetyScore}
                              </span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 rounded-md bg-muted/50">
                              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                <Timer className="h-4 w-4" />
                                <span className="text-sm">Driving Hours</span>
                              </div>
                              <p className="text-lg font-bold">{selectedTrip.driverInsights.drivingHoursToday}h</p>
                            </div>
                            
                            <div className="p-3 rounded-md bg-muted/50">
                              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                <Coffee className="h-4 w-4" />
                                <span className="text-sm">Breaks Taken</span>
                              </div>
                              <p className="text-lg font-bold">{selectedTrip.driverInsights.breaksTaken}</p>
                            </div>
                            
                            <div className="p-3 rounded-md bg-muted/50">
                              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                <Gauge className="h-4 w-4" />
                                <span className="text-sm">Speeding Alerts</span>
                              </div>
                              <p className={`text-lg font-bold ${selectedTrip.driverInsights.speedingAlerts > 0 ? "text-red-600" : ""}`}>
                                {selectedTrip.driverInsights.speedingAlerts}
                              </p>
                            </div>
                            
                            <div className="p-3 rounded-md bg-muted/50">
                              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                <AlertTriangle className="h-4 w-4" />
                                <span className="text-sm">Harsh Braking</span>
                              </div>
                              <p className={`text-lg font-bold ${selectedTrip.driverInsights.harshBrakingEvents > 2 ? "text-amber-600" : ""}`}>
                                {selectedTrip.driverInsights.harshBrakingEvents}
                              </p>
                            </div>
                          </div>
                          
                          <div className="p-3 rounded-md bg-muted/50">
                            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                              <PauseCircle className="h-4 w-4" />
                              <span className="text-sm">Idle Time Today</span>
                            </div>
                            <p className="text-lg font-bold">{selectedTrip.driverInsights.idleTime} min</p>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                    
                    <TabsContent value="timeline" className="mt-0">
                      <ScrollArea className="h-64">
                        <div className="space-y-4">
                          {selectedTrip.timeline.map((event, index) => {
                            const isLast = index === selectedTrip.timeline.length - 1;
                            return (
                              <div key={event.eventId} className="flex gap-4">
                                <div className="relative flex flex-col items-center">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                                    {event.type === "pickup" && <Package className="h-4 w-4" />}
                                    {event.type === "loaded" && <CheckCircle className="h-4 w-4" />}
                                    {event.type === "en_route" && <Truck className="h-4 w-4" />}
                                    {event.type === "checkpoint" && <MapPin className="h-4 w-4" />}
                                    {event.type === "delivered" && <CheckCircle className="h-4 w-4" />}
                                    {event.type === "delay" && <AlertTriangle className="h-4 w-4" />}
                                  </div>
                                  {!isLast && (
                                    <div className="w-0.5 flex-1 mt-2 bg-border" />
                                  )}
                                </div>
                                <div className="flex-1 pt-1 pb-4">
                                  <p className="font-medium">{event.description}</p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                    <span>{format(new Date(event.timestamp), "MMM d, h:mm a")}</span>
                                    <span className="flex items-center gap-1">
                                      <MapPin className="h-3 w-3" />
                                      {event.location}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                  </div>
                </Tabs>
                
                <div className="border-t p-4">
                  <h4 className="font-medium mb-3">Quick Actions</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="outline"
                      onClick={() => handleStatusUpdate("at_checkpoint")}
                      disabled={selectedTrip.status === "delivered"}
                      data-testid="button-update-checkpoint"
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      Check-in
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => handleStatusUpdate("out_for_delivery")}
                      disabled={selectedTrip.status === "delivered"}
                      data-testid="button-update-delivery"
                    >
                      <Truck className="h-4 w-4 mr-2" />
                      Out for Delivery
                    </Button>
                    <Button 
                      onClick={() => handleStatusUpdate("delivered")}
                      disabled={selectedTrip.status === "delivered"}
                      data-testid="button-mark-delivered"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark Delivered
                    </Button>
                    <Button 
                      variant="outline"
                      data-testid="button-upload-pod"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload POD
                    </Button>
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="h-full flex items-center justify-center">
              <p className="text-muted-foreground">Select a trip to view details</p>
            </CardContent>
          )}
        </Card>
      </div>

      <Dialog open={documentViewerOpen} onOpenChange={setDocumentViewerOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedDocument?.type}
            </DialogTitle>
            <DialogDescription>
              View and download this document
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            {selectedDocument?.image && (
              <img 
                src={selectedDocument.image} 
                alt={selectedDocument.type}
                className="max-w-full max-h-[60vh] object-contain rounded-lg border"
                data-testid="document-image"
              />
            )}
            <Button 
              variant="outline"
              onClick={() => {
                if (selectedDocument?.image) {
                  const link = document.createElement('a');
                  link.href = selectedDocument.image;
                  link.download = `${selectedDocument.type.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
                  link.click();
                }
              }}
              data-testid="button-download-document"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Document
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
