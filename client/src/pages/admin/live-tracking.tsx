import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  MapPin, Truck, Package, Phone, Mail, Building2, User, 
  Navigation, Clock, RefreshCw, Loader2, ChevronRight,
  Radio, CheckCircle, AlertCircle, ArrowRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

interface TrackedShipment {
  id: string;
  loadId: string;
  status: string;
  progress: number;
  currentStage: string;
  createdAt: string;
  startedAt: string | null;
  eta: string | null;
  currentLocation: {
    lat: number | null;
    lng: number | null;
    address: string | null;
  };
  otp: {
    startRequested: boolean;
    startVerified: boolean;
    endRequested: boolean;
    endVerified: boolean;
  };
  load: {
    id: string;
    referenceNumber: number | null;
    pickupCity: string;
    pickupAddress: string;
    pickupState: string | null;
    dropoffCity: string;
    dropoffAddress: string;
    dropoffState: string | null;
    materialType: string | null;
    weight: string;
    requiredTruckType: string | null;
    pickupDate: string | null;
    deliveryDate: string | null;
  } | null;
  shipper: {
    id: string;
    username: string;
    companyName: string;
    contactName: string;
    phone: string | null;
    email: string | null;
    address: string | null;
  } | null;
  receiver: {
    name: string | null;
    phone: string | null;
    email: string | null;
    businessName: string | null;
    address: string | null;
    city: string | null;
  } | null;
  carrier: {
    id: string;
    username: string;
    companyName: string;
    phone: string | null;
    carrierType: string;
  } | null;
  driver: {
    name: string;
    phone: string | null;
  } | null;
  truck: {
    id: string;
    registrationNumber: string;
    truckType: string;
    capacity: number;
  } | null;
}

const stageLabels: Record<string, string> = {
  pickup_scheduled: "Awaiting Pickup",
  at_pickup: "At Pickup Location",
  in_transit: "In Transit",
  delivered: "Delivered",
};

const stageBadgeColors: Record<string, string> = {
  pickup_scheduled: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  at_pickup: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  in_transit: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  delivered: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

export default function AdminLiveTrackingPage() {
  const [selectedShipment, setSelectedShipment] = useState<TrackedShipment | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [telemetryData, setTelemetryData] = useState<Record<string, { lat: number; lng: number; speed?: number }>>({});

  const { data: shipments = [], isLoading, refetch, isRefetching } = useQuery<TrackedShipment[]>({
    queryKey: ["/api/admin/live-tracking"],
    refetchInterval: 30000,
  });

  // Connect to telemetry WebSocket for real-time updates
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    const connect = () => {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      ws = new WebSocket(`${protocol}//${window.location.host}/ws/telemetry`);

      ws.onopen = () => {
        ws?.send(JSON.stringify({ type: "subscribe", all: true }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "position_update" && data.vehicleId) {
            setTelemetryData(prev => ({
              ...prev,
              [data.vehicleId]: {
                lat: data.lat,
                lng: data.lng,
                speed: data.speed,
              }
            }));
          }
        } catch (e) {
          console.error("Failed to parse telemetry message:", e);
        }
      };

      ws.onclose = () => {
        reconnectTimeout = setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      ws?.close();
      clearTimeout(reconnectTimeout);
    };
  }, []);

  // Apply filters
  const filteredShipments = shipments.filter(shipment => {
    const matchesSearch = searchQuery === "" || 
      shipment.load?.referenceNumber?.toString().includes(searchQuery) ||
      shipment.load?.pickupCity?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.load?.dropoffCity?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.shipper?.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.carrier?.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.truck?.registrationNumber?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStage = stageFilter === "all" || shipment.currentStage === stageFilter;
    
    return matchesSearch && matchesStage;
  });

  // Stats
  const stats = {
    total: shipments.length,
    inTransit: shipments.filter(s => s.currentStage === "in_transit").length,
    atPickup: shipments.filter(s => s.currentStage === "at_pickup").length,
    awaiting: shipments.filter(s => s.currentStage === "pickup_scheduled").length,
  };

  const handleSelectShipment = useCallback((shipment: TrackedShipment) => {
    setSelectedShipment(shipment);
    setIsDetailOpen(true);
  }, []);

  const getLocationDisplay = (shipment: TrackedShipment) => {
    const telemetry = telemetryData[shipment.truck?.registrationNumber || ""];
    if (telemetry) {
      return `${telemetry.lat.toFixed(4)}, ${telemetry.lng.toFixed(4)}`;
    }
    if (shipment.currentLocation?.address) {
      return shipment.currentLocation.address;
    }
    if (shipment.currentLocation?.lat && shipment.currentLocation?.lng) {
      return `${shipment.currentLocation.lat.toFixed(4)}, ${shipment.currentLocation.lng.toFixed(4)}`;
    }
    return "Location updating...";
  };

  return (
    <div className="flex flex-col h-full p-6 gap-6" data-testid="page-admin-live-tracking">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Live Shipment Tracking</h1>
          <p className="text-muted-foreground">Monitor all active shipments across carriers in real-time</p>
        </div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={isRefetching}
          data-testid="button-refresh"
        >
          {isRefetching ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Active</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
              <Navigation className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">In Transit</p>
              <p className="text-2xl font-bold text-green-600">{stats.inTransit}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
              <MapPin className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">At Pickup</p>
              <p className="text-2xl font-bold text-blue-600">{stats.atPickup}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Awaiting Pickup</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.awaiting}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4">
        <Input
          placeholder="Search by load #, city, shipper, carrier, or truck..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
          data-testid="input-search"
        />
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-stage-filter">
            <SelectValue placeholder="Filter by stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            <SelectItem value="pickup_scheduled">Awaiting Pickup</SelectItem>
            <SelectItem value="at_pickup">At Pickup</SelectItem>
            <SelectItem value="in_transit">In Transit</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="flex-1">
        <CardHeader className="pb-3">
          <CardTitle>Active Shipments ({filteredShipments.length})</CardTitle>
          <CardDescription>Click on a shipment to view full details</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredShipments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Truck className="h-12 w-12 mb-4 opacity-50" />
              <p>No active shipments found</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="divide-y">
                {filteredShipments.map((shipment) => (
                  <div
                    key={shipment.id}
                    className="p-4 hover-elevate cursor-pointer"
                    onClick={() => handleSelectShipment(shipment)}
                    data-testid={`shipment-row-${shipment.id}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-semibold">
                            LD-{shipment.load?.referenceNumber ? String(shipment.load.referenceNumber).padStart(3, "0") : "???"}
                          </span>
                          <Badge className={stageBadgeColors[shipment.currentStage] || ""}>
                            {stageLabels[shipment.currentStage] || shipment.currentStage}
                          </Badge>
                          {telemetryData[shipment.truck?.registrationNumber || ""] && (
                            <Badge variant="outline" className="gap-1">
                              <Radio className="h-3 w-3 text-green-500 animate-pulse" />
                              Live
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                          <span>{shipment.load?.pickupCity}</span>
                          <ArrowRight className="h-3 w-3" />
                          <span>{shipment.load?.dropoffCity}</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate">
                              <span className="text-muted-foreground">Shipper:</span>{" "}
                              {shipment.shipper?.companyName || "N/A"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate">
                              <span className="text-muted-foreground">Truck:</span>{" "}
                              {shipment.truck?.registrationNumber || "N/A"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate">
                              {getLocationDisplay(shipment)}
                            </span>
                          </div>
                        </div>

                        <Progress value={shipment.progress} className="h-1.5 mt-3" />
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selectedShipment && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Load LD-{selectedShipment.load?.referenceNumber?.toString().padStart(3, "0") || "???"}
                </SheetTitle>
                <SheetDescription>
                  {selectedShipment.load?.pickupCity} → {selectedShipment.load?.dropoffCity}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <div className="flex items-center gap-3">
                  <Badge className={stageBadgeColors[selectedShipment.currentStage] || ""}>
                    {stageLabels[selectedShipment.currentStage] || selectedShipment.currentStage}
                  </Badge>
                  <Progress value={selectedShipment.progress} className="flex-1 h-2" />
                  <span className="text-sm font-medium">{selectedShipment.progress}%</span>
                </div>

                <Tabs defaultValue="route" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="route">Route</TabsTrigger>
                    <TabsTrigger value="shipper">Shipper</TabsTrigger>
                    <TabsTrigger value="receiver">Receiver</TabsTrigger>
                    <TabsTrigger value="carrier">Carrier</TabsTrigger>
                  </TabsList>

                  <TabsContent value="route" className="space-y-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-green-600" />
                          Pickup Location
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="font-medium">{selectedShipment.load?.pickupCity}</p>
                        <p className="text-sm text-muted-foreground">{selectedShipment.load?.pickupAddress}</p>
                        {selectedShipment.load?.pickupDate && (
                          <p className="text-sm mt-1">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {format(new Date(selectedShipment.load.pickupDate), "PPp")}
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-red-600" />
                          Delivery Location
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="font-medium">{selectedShipment.load?.dropoffCity}</p>
                        <p className="text-sm text-muted-foreground">{selectedShipment.load?.dropoffAddress}</p>
                        {selectedShipment.eta && (
                          <p className="text-sm mt-1">
                            <Clock className="h-3 w-3 inline mr-1" />
                            ETA: {format(new Date(selectedShipment.eta), "PPp")}
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Current Location</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2">
                          <Navigation className="h-4 w-4 text-primary" />
                          <span>{getLocationDisplay(selectedShipment)}</span>
                          {telemetryData[selectedShipment.truck?.registrationNumber || ""] && (
                            <Badge variant="outline" className="gap-1 ml-auto">
                              <Radio className="h-3 w-3 text-green-500 animate-pulse" />
                              Live
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Cargo Details</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1 text-sm">
                        <p><span className="text-muted-foreground">Material:</span> {selectedShipment.load?.materialType || "N/A"}</p>
                        <p><span className="text-muted-foreground">Weight:</span> {selectedShipment.load?.weight} MT</p>
                        <p><span className="text-muted-foreground">Truck Type:</span> {selectedShipment.load?.requiredTruckType || "N/A"}</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">OTP Verification Status</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            {selectedShipment.otp.startVerified ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : selectedShipment.otp.startRequested ? (
                              <AlertCircle className="h-4 w-4 text-yellow-600" />
                            ) : (
                              <Clock className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span>Pickup OTP</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {selectedShipment.otp.endVerified ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : selectedShipment.otp.endRequested ? (
                              <AlertCircle className="h-4 w-4 text-yellow-600" />
                            ) : (
                              <Clock className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span>Delivery OTP</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="shipper" className="space-y-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Shipper Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <p className="font-medium text-lg">{selectedShipment.shipper?.companyName || "N/A"}</p>
                          <p className="text-sm text-muted-foreground">{selectedShipment.shipper?.contactName}</p>
                        </div>
                        <Separator />
                        <div className="space-y-2 text-sm">
                          {selectedShipment.shipper?.phone && (
                            <a href={`tel:${selectedShipment.shipper.phone}`} className="flex items-center gap-2 hover:text-primary">
                              <Phone className="h-4 w-4" />
                              {selectedShipment.shipper.phone}
                            </a>
                          )}
                          {selectedShipment.shipper?.email && (
                            <a href={`mailto:${selectedShipment.shipper.email}`} className="flex items-center gap-2 hover:text-primary">
                              <Mail className="h-4 w-4" />
                              {selectedShipment.shipper.email}
                            </a>
                          )}
                          {selectedShipment.shipper?.address && (
                            <div className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 mt-0.5" />
                              <span>{selectedShipment.shipper.address}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="receiver" className="space-y-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Receiver Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <p className="font-medium text-lg">{selectedShipment.receiver?.name || "N/A"}</p>
                          {selectedShipment.receiver?.businessName && (
                            <p className="text-sm text-muted-foreground">{selectedShipment.receiver.businessName}</p>
                          )}
                        </div>
                        <Separator />
                        <div className="space-y-2 text-sm">
                          {selectedShipment.receiver?.phone && (
                            <a href={`tel:${selectedShipment.receiver.phone}`} className="flex items-center gap-2 hover:text-primary">
                              <Phone className="h-4 w-4" />
                              {selectedShipment.receiver.phone}
                            </a>
                          )}
                          {selectedShipment.receiver?.email && (
                            <a href={`mailto:${selectedShipment.receiver.email}`} className="flex items-center gap-2 hover:text-primary">
                              <Mail className="h-4 w-4" />
                              {selectedShipment.receiver.email}
                            </a>
                          )}
                          {selectedShipment.receiver?.address && (
                            <div className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 mt-0.5" />
                              <span>{selectedShipment.receiver.address}, {selectedShipment.receiver.city}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="carrier" className="space-y-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Truck className="h-4 w-4" />
                          Carrier & Driver
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <p className="font-medium">{selectedShipment.carrier?.companyName || "N/A"}</p>
                          <Badge variant="outline" className="mt-1">
                            {selectedShipment.carrier?.carrierType === "solo" ? "Solo Driver" : "Fleet Carrier"}
                          </Badge>
                        </div>
                        <Separator />
                        <div className="space-y-2 text-sm">
                          <p className="font-medium">Driver: {selectedShipment.driver?.name || "N/A"}</p>
                          {selectedShipment.driver?.phone && (
                            <a href={`tel:${selectedShipment.driver.phone}`} className="flex items-center gap-2 hover:text-primary">
                              <Phone className="h-4 w-4" />
                              {selectedShipment.driver.phone}
                            </a>
                          )}
                          {selectedShipment.carrier?.phone && (
                            <a href={`tel:${selectedShipment.carrier.phone}`} className="flex items-center gap-2 hover:text-primary">
                              <Phone className="h-4 w-4" />
                              Carrier: {selectedShipment.carrier.phone}
                            </a>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Vehicle Details</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1 text-sm">
                        <p><span className="text-muted-foreground">Registration:</span> {selectedShipment.truck?.registrationNumber || "N/A"}</p>
                        <p><span className="text-muted-foreground">Type:</span> {selectedShipment.truck?.truckType || "N/A"}</p>
                        <p><span className="text-muted-foreground">Capacity:</span> {selectedShipment.truck?.capacity || "N/A"} MT</p>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
