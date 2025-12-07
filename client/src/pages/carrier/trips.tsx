import { useState } from "react";
import { MapPin, Truck, Clock, CheckCircle, Upload, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/hooks/use-toast";

const mockTrips = [
  {
    id: "trip1",
    loadId: "l3",
    route: "San Francisco, CA → Denver, CO",
    status: "in_transit",
    progress: 65,
    currentLocation: "Salt Lake City, UT",
    eta: new Date(Date.now() + 1000 * 60 * 60 * 8),
    rate: 4200,
    steps: [
      { id: "s1", label: "Picked Up", completed: true, time: "Yesterday, 8:00 AM" },
      { id: "s2", label: "In Transit", completed: true, time: "Yesterday, 9:30 AM" },
      { id: "s3", label: "Checkpoint (SLC)", completed: true, time: "Today, 6:00 AM" },
      { id: "s4", label: "Out for Delivery", completed: false },
      { id: "s5", label: "Delivered", completed: false },
    ],
  },
  {
    id: "trip2",
    loadId: "l5",
    route: "Chicago, IL → Detroit, MI",
    status: "picked_up",
    progress: 25,
    currentLocation: "Chicago, IL",
    eta: new Date(Date.now() + 1000 * 60 * 60 * 5),
    rate: 1800,
    steps: [
      { id: "s6", label: "Picked Up", completed: true, time: "Today, 10:00 AM" },
      { id: "s7", label: "In Transit", completed: false },
      { id: "s8", label: "Delivered", completed: false },
    ],
  },
];

export default function TripsPage() {
  const { toast } = useToast();
  const [selectedTrip, setSelectedTrip] = useState(mockTrips[0] || null);

  const updateStatus = (newStatus: string) => {
    toast({
      title: "Status updated",
      description: `Trip status updated to "${newStatus.replace("_", " ")}"`,
    });
  };

  if (mockTrips.length === 0) {
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
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Active Trips</h1>
        <p className="text-muted-foreground">Manage and update your current shipments.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Current Trips</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-300px)]">
              <div className="p-3 space-y-2">
                {mockTrips.map((trip) => (
                  <div
                    key={trip.id}
                    className={`p-4 rounded-lg cursor-pointer hover-elevate ${
                      selectedTrip?.id === trip.id ? "bg-primary/10 border border-primary/20" : "bg-muted/50"
                    }`}
                    onClick={() => setSelectedTrip(trip)}
                    data-testid={`trip-item-${trip.id}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">Load #{trip.loadId}</span>
                      <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 text-xs no-default-hover-elevate no-default-active-elevate">
                        {trip.progress}%
                      </Badge>
                    </div>
                    <p className="font-medium text-sm mb-2">{trip.route}</p>
                    <Progress value={trip.progress} className="h-2 mb-2" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {trip.currentLocation}
                      </span>
                      <span className="font-medium text-foreground">${trip.rate.toLocaleString()}</span>
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
                    <CardTitle className="text-lg">{selectedTrip.route}</CardTitle>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span>Load #{selectedTrip.loadId}</span>
                      <span className="font-medium text-foreground">${selectedTrip.rate.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">ETA</p>
                    <p className="font-semibold">
                      {selectedTrip.eta.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
                <Progress value={selectedTrip.progress} className="mt-4" />
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  <div>
                    <h3 className="font-semibold mb-4">Trip Progress</h3>
                    <div className="space-y-4">
                      {selectedTrip.steps.map((step, index) => {
                        const isLast = index === selectedTrip.steps.length - 1;
                        return (
                          <div key={step.id} className="flex gap-4">
                            <div className="relative flex flex-col items-center">
                              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                                step.completed 
                                  ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" 
                                  : "bg-muted text-muted-foreground"
                              }`}>
                                {step.completed ? (
                                  <CheckCircle className="h-4 w-4" />
                                ) : (
                                  <div className="h-2 w-2 rounded-full bg-current" />
                                )}
                              </div>
                              {!isLast && (
                                <div className={`w-0.5 flex-1 mt-2 ${
                                  step.completed ? "bg-green-200 dark:bg-green-800" : "bg-border"
                                }`} />
                              )}
                            </div>
                            <div className="flex-1 pt-1">
                              <p className={`font-medium ${!step.completed && "text-muted-foreground"}`}>
                                {step.label}
                              </p>
                              {step.time && (
                                <p className="text-xs text-muted-foreground">{step.time}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold mb-4">Current Location</h3>
                      <div className="aspect-video rounded-lg bg-muted/50 flex items-center justify-center mb-4">
                        <div className="text-center text-muted-foreground">
                          <Navigation className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">{selectedTrip.currentLocation}</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-4">Quick Actions</h3>
                      <div className="space-y-2">
                        <Button 
                          className="w-full justify-start" 
                          variant="outline"
                          onClick={() => updateStatus("at_checkpoint")}
                          data-testid="button-update-checkpoint"
                        >
                          <MapPin className="h-4 w-4 mr-2" />
                          Check-in at Location
                        </Button>
                        <Button 
                          className="w-full justify-start" 
                          variant="outline"
                          onClick={() => updateStatus("out_for_delivery")}
                          data-testid="button-update-delivery"
                        >
                          <Truck className="h-4 w-4 mr-2" />
                          Mark Out for Delivery
                        </Button>
                        <Button 
                          className="w-full justify-start"
                          onClick={() => updateStatus("delivered")}
                          data-testid="button-mark-delivered"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Mark as Delivered
                        </Button>
                        <Button 
                          className="w-full justify-start" 
                          variant="outline"
                          data-testid="button-upload-pod"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload POD
                        </Button>
                      </div>
                    </div>
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
    </div>
  );
}
