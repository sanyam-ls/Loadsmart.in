import { useState } from "react";
import { MapPin, Package, Truck, CheckCircle, Clock, Upload, FileText, Calendar, Navigation } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/empty-state";

interface TrackingEvent {
  id: string;
  type: string;
  location: string;
  timestamp: Date;
  completed: boolean;
  notes?: string;
}

interface TrackedShipment {
  id: string;
  loadId: string;
  route: string;
  status: string;
  carrierName: string;
  truckInfo: string;
  progress: number;
  eta: Date;
  events: TrackingEvent[];
}

const mockShipments: TrackedShipment[] = [
  {
    id: "s1",
    loadId: "2",
    route: "San Francisco, CA → Denver, CO",
    status: "in_transit",
    carrierName: "FastHaul Logistics",
    truckInfo: "Dry Van - ABC-1234",
    progress: 65,
    eta: new Date(Date.now() + 1000 * 60 * 60 * 8),
    events: [
      { id: "e1", type: "pickup_scheduled", location: "San Francisco, CA", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), completed: true },
      { id: "e2", type: "picked_up", location: "San Francisco, CA", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 20), completed: true, notes: "All items verified and loaded" },
      { id: "e3", type: "in_transit", location: "Reno, NV", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12), completed: true },
      { id: "e4", type: "at_checkpoint", location: "Salt Lake City, UT", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4), completed: true, notes: "Rest stop - will resume in 2 hours" },
      { id: "e5", type: "out_for_delivery", location: "Denver, CO", timestamp: new Date(Date.now() + 1000 * 60 * 60 * 6), completed: false },
      { id: "e6", type: "delivered", location: "Denver, CO", timestamp: new Date(Date.now() + 1000 * 60 * 60 * 8), completed: false },
    ],
  },
  {
    id: "s2",
    loadId: "5",
    route: "Chicago, IL → Detroit, MI",
    status: "picked_up",
    carrierName: "Swift Transport",
    truckInfo: "Flatbed - XYZ-5678",
    progress: 25,
    eta: new Date(Date.now() + 1000 * 60 * 60 * 5),
    events: [
      { id: "e7", type: "pickup_scheduled", location: "Chicago, IL", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3), completed: true },
      { id: "e8", type: "picked_up", location: "Chicago, IL", timestamp: new Date(Date.now() - 1000 * 60 * 60), completed: true },
      { id: "e9", type: "in_transit", location: "En route", timestamp: new Date(Date.now() + 1000 * 60 * 60 * 2), completed: false },
      { id: "e10", type: "delivered", location: "Detroit, MI", timestamp: new Date(Date.now() + 1000 * 60 * 60 * 5), completed: false },
    ],
  },
];

const eventLabels: Record<string, string> = {
  pickup_scheduled: "Pickup Scheduled",
  picked_up: "Picked Up",
  in_transit: "In Transit",
  at_checkpoint: "At Checkpoint",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
};

const eventIcons: Record<string, typeof MapPin> = {
  pickup_scheduled: Calendar,
  picked_up: Package,
  in_transit: Truck,
  at_checkpoint: MapPin,
  out_for_delivery: Navigation,
  delivered: CheckCircle,
};

export default function TrackingPage() {
  const [selectedShipment, setSelectedShipment] = useState<TrackedShipment | null>(mockShipments[0] || null);

  if (mockShipments.length === 0) {
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

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Track Shipments</h1>
        <p className="text-muted-foreground">Monitor your active shipments in real-time.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Active Shipments</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-300px)]">
              <div className="p-3 space-y-2">
                {mockShipments.map((shipment) => (
                  <div
                    key={shipment.id}
                    className={`p-4 rounded-lg cursor-pointer hover-elevate ${
                      selectedShipment?.id === shipment.id ? "bg-primary/10 border border-primary/20" : "bg-muted/50"
                    }`}
                    onClick={() => setSelectedShipment(shipment)}
                    data-testid={`shipment-item-${shipment.id}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">Load #{shipment.loadId}</span>
                      <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 text-xs no-default-hover-elevate no-default-active-elevate">
                        <Truck className="h-3 w-3 mr-1" />
                        {shipment.progress}%
                      </Badge>
                    </div>
                    <p className="font-medium text-sm mb-2">{shipment.route}</p>
                    <Progress value={shipment.progress} className="h-2 mb-2" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{shipment.carrierName}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        ETA: {shipment.eta.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          {selectedShipment ? (
            <>
              <CardHeader className="pb-3 border-b border-border">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle className="text-lg">{selectedShipment.route}</CardTitle>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span>{selectedShipment.carrierName}</span>
                      <span>{selectedShipment.truckInfo}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Estimated Arrival</p>
                    <p className="font-semibold">
                      {selectedShipment.eta.toLocaleDateString([], { month: "short", day: "numeric" })} at{" "}
                      {selectedShipment.eta.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
                <Progress value={selectedShipment.progress} className="mt-4" />
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  <div>
                    <h3 className="font-semibold mb-4">Shipment Timeline</h3>
                    <div className="relative">
                      {selectedShipment.events.map((event, index) => {
                        const Icon = eventIcons[event.type] || MapPin;
                        const isLast = index === selectedShipment.events.length - 1;
                        return (
                          <div key={event.id} className="flex gap-4 pb-6 last:pb-0">
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
                                  {eventLabels[event.type] || event.type}
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
                    <div className="aspect-video rounded-lg bg-muted/50 flex items-center justify-center mb-4">
                      <div className="text-center text-muted-foreground">
                        <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Map view coming soon</p>
                        <p className="text-xs">Simulated tracking active</p>
                      </div>
                    </div>

                    <h3 className="font-semibold mb-4">Documents</h3>
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full justify-start" data-testid="button-view-bol">
                        <FileText className="h-4 w-4 mr-2" />
                        Bill of Lading
                        <Badge variant="secondary" className="ml-auto">Available</Badge>
                      </Button>
                      <Button variant="outline" className="w-full justify-start" disabled data-testid="button-view-pod">
                        <FileText className="h-4 w-4 mr-2" />
                        Proof of Delivery
                        <Badge variant="secondary" className="ml-auto text-muted-foreground">Pending</Badge>
                      </Button>
                      <Button variant="outline" className="w-full justify-start" data-testid="button-upload-doc">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Document
                      </Button>
                    </div>
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
