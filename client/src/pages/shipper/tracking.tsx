import { useState } from "react";
import { 
  MapPin, Package, Truck, CheckCircle, Clock, FileText, Calendar, 
  Navigation, Building, ArrowRight, RefreshCw 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/empty-state";
import { DocumentManager, DocumentStatusSummary } from "@/components/document-manager";
import { useMockData, ShipmentStage, TrackedShipment } from "@/lib/mock-data-store";

const stageLabels: Record<ShipmentStage, string> = {
  load_created: "Load Created",
  carrier_assigned: "Carrier Assigned",
  reached_pickup: "Reached Pickup",
  loaded: "Loaded",
  in_transit: "In Transit",
  arrived_at_drop: "Arrived at Drop",
  delivered: "Delivered",
  completed: "Completed",
};

const stageIcons: Record<ShipmentStage, typeof MapPin> = {
  load_created: FileText,
  carrier_assigned: Truck,
  reached_pickup: Building,
  loaded: Package,
  in_transit: Navigation,
  arrived_at_drop: MapPin,
  delivered: CheckCircle,
  completed: CheckCircle,
};

function getStatusBadge(stage: ShipmentStage) {
  if (stage === "completed" || stage === "delivered") {
    return (
      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 no-default-hover-elevate no-default-active-elevate">
        <CheckCircle className="h-3 w-3 mr-1" />
        Completed
      </Badge>
    );
  }
  if (stage === "in_transit") {
    return (
      <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 no-default-hover-elevate no-default-active-elevate">
        <Truck className="h-3 w-3 mr-1" />
        In Transit
      </Badge>
    );
  }
  return (
    <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 no-default-hover-elevate no-default-active-elevate">
      <Clock className="h-3 w-3 mr-1" />
      Active
    </Badge>
  );
}

export default function TrackingPage() {
  const { shipments, getActiveShipments, updateShipmentStage } = useMockData();
  const activeShipments = getActiveShipments();
  const [selectedShipment, setSelectedShipment] = useState<TrackedShipment | null>(
    activeShipments[0] || null
  );
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const simulateProgress = (shipment: TrackedShipment) => {
    const stages: ShipmentStage[] = [
      "load_created",
      "carrier_assigned", 
      "reached_pickup",
      "loaded",
      "in_transit",
      "arrived_at_drop",
      "delivered",
      "completed",
    ];
    
    const currentIndex = stages.indexOf(shipment.currentStage);
    if (currentIndex < stages.length - 1 && shipment.currentStage !== "completed") {
      const nextStage = stages[currentIndex + 1];
      updateShipmentStage(shipment.shipmentId, nextStage);
      
      const updatedShipment = shipments.find(s => s.shipmentId === shipment.shipmentId);
      if (updatedShipment) {
        setSelectedShipment({ ...updatedShipment, currentStage: nextStage });
      }
    }
  };

  if (activeShipments.length === 0) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Track Shipments</h1>
        <EmptyState
          icon={MapPin}
          title="No shipments to track"
          description="Once a carrier picks up your load, you'll be able to track its journey in real-time here."
        />
      </div>
    );
  }

  const currentShipment = selectedShipment 
    ? shipments.find(s => s.shipmentId === selectedShipment.shipmentId) || selectedShipment
    : null;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Track Shipments</h1>
          <p className="text-muted-foreground">Monitor your active shipments in real-time.</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={refreshing}
          data-testid="button-refresh-tracking"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Active Shipments ({activeShipments.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-300px)]">
              <div className="p-3 space-y-2">
                {activeShipments.map((shipment) => (
                  <div
                    key={shipment.shipmentId}
                    className={`p-4 rounded-lg cursor-pointer hover-elevate ${
                      currentShipment?.shipmentId === shipment.shipmentId 
                        ? "bg-primary/10 border border-primary/20" 
                        : "bg-muted/50"
                    }`}
                    onClick={() => setSelectedShipment(shipment)}
                    data-testid={`shipment-item-${shipment.shipmentId}`}
                  >
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <span className="text-xs text-muted-foreground">Load #{shipment.loadId}</span>
                      {getStatusBadge(shipment.currentStage)}
                    </div>
                    <p className="font-medium text-sm mb-2">{shipment.route}</p>
                    <Progress value={shipment.progress} className="h-2 mb-2" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground gap-2 flex-wrap">
                      <span>{shipment.carrierName}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        ETA: {shipment.eta.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="mt-2">
                      <DocumentStatusSummary shipment={shipment} />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          {currentShipment ? (
            <>
              <CardHeader className="pb-3 border-b border-border">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle className="text-lg">{currentShipment.route}</CardTitle>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                      <span>{currentShipment.carrierName}</span>
                      <span>{currentShipment.truckInfo}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Estimated Arrival</p>
                    <p className="font-semibold">
                      {currentShipment.eta.toLocaleDateString([], { month: "short", day: "numeric" })} at{" "}
                      {currentShipment.eta.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
                <Progress value={currentShipment.progress} className="mt-4" />
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  <div>
                    <div className="flex items-center justify-between mb-4 gap-2">
                      <h3 className="font-semibold">Shipment Timeline</h3>
                      {currentShipment.currentStage !== "completed" && currentShipment.currentStage !== "delivered" && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => simulateProgress(currentShipment)}
                          data-testid="button-simulate-progress"
                        >
                          <ArrowRight className="h-4 w-4 mr-1" />
                          Simulate Next
                        </Button>
                      )}
                    </div>
                    <div className="relative">
                      {currentShipment.events.map((event, index) => {
                        const Icon = stageIcons[event.stage] || MapPin;
                        const isLast = index === currentShipment.events.length - 1;
                        return (
                          <div key={event.eventId} className="flex gap-4 pb-6 last:pb-0">
                            <div className="relative flex flex-col items-center">
                              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                                event.completed 
                                  ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" 
                                  : "bg-muted text-muted-foreground"
                              }`}>
                                <Icon className="h-4 w-4" />
                              </div>
                              {!isLast && (
                                <div className={`w-0.5 flex-1 mt-2 ${
                                  event.completed ? "bg-green-200 dark:bg-green-800" : "bg-border"
                                }`} />
                              )}
                            </div>
                            <div className="flex-1 pt-1">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <p className={`font-medium ${!event.completed && "text-muted-foreground"}`}>
                                  {stageLabels[event.stage]}
                                </p>
                                {event.completed && (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{event.location}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {event.timestamp.toLocaleDateString([], { month: "short", day: "numeric" })} at{" "}
                                {event.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </p>
                              {event.notes && (
                                <p className="text-sm text-muted-foreground mt-2 p-2 bg-muted/50 rounded">
                                  {event.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-4">Live Map</h3>
                    <div className="aspect-video rounded-lg bg-muted/50 flex items-center justify-center mb-6">
                      <div className="text-center text-muted-foreground">
                        <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Map view coming soon</p>
                        <p className="text-xs">Simulated tracking active</p>
                      </div>
                    </div>

                    <h3 className="font-semibold mb-4">Documents</h3>
                    <DocumentManager shipment={currentShipment} compact />
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="h-full flex items-center justify-center">
              <p className="text-muted-foreground">Select a shipment to view details</p>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
