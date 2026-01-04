import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { onMarketplaceEvent } from "@/lib/marketplace-socket";
import { useToast } from "@/hooks/use-toast";
import { 
  MapPin, Package, Truck, CheckCircle, Clock, FileText, 
  Navigation, Building, ArrowRight, RefreshCw, Loader2,
  Eye, X, Download, Calendar, Bell
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/empty-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { format, addHours, differenceInHours } from "date-fns";

import lrConsignmentNote from "@assets/generated_images/lr_consignment_note_document.png";
import ewayBill from "@assets/generated_images/e-way_bill_document.png";
import podDocument from "@assets/generated_images/proof_of_delivery_document.png";
import loadingPhotos from "@assets/generated_images/loading_photos_cargo_truck.png";

type ShipmentStage = "load_created" | "carrier_assigned" | "reached_pickup" | "loaded" | "in_transit" | "arrived_at_drop" | "delivered";

interface TimelineEvent {
  stage: ShipmentStage;
  completed: boolean;
  timestamp: string | null;
  location: string;
}

interface TrackedShipment {
  id: string;
  loadId: string;
  carrierId: string;
  status: string;
  progress: number;
  currentStage: string;
  eta: string | null;
  createdAt: string;
  startOtpRequested: boolean;
  startOtpVerified: boolean;
  endOtpRequested: boolean;
  endOtpVerified: boolean;
  load: {
    id: string;
    adminReferenceNumber: number | null;
    pickupCity: string;
    pickupAddress: string;
    dropoffCity: string;
    dropoffAddress: string;
    materialType: string;
    weight: string;
    requiredTruckType: string;
  } | null;
  carrier: {
    id: string;
    username: string;
    companyName: string;
    phone: string | null;
    carrierType: 'solo' | 'enterprise';
    tripsCompleted: number;
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
  documents: Array<{
    id: string;
    documentType: string;
    status: string;
    fileName: string;
  }>;
  timeline: TimelineEvent[];
}

const stageLabels: Record<ShipmentStage, string> = {
  load_created: "Load Created",
  carrier_assigned: "Carrier Assigned",
  reached_pickup: "Reached Pickup",
  loaded: "Loaded",
  in_transit: "In Transit",
  arrived_at_drop: "Arrived at Drop",
  delivered: "Delivered",
};

const stageIcons: Record<ShipmentStage, typeof MapPin> = {
  load_created: FileText,
  carrier_assigned: Truck,
  reached_pickup: Building,
  loaded: Package,
  in_transit: Navigation,
  arrived_at_drop: MapPin,
  delivered: CheckCircle,
};

const documentImages: Record<string, string> = {
  "LR / Consignment Note": lrConsignmentNote,
  "E-way Bill": ewayBill,
  "Loading Photos": loadingPhotos,
  "Proof of Delivery (POD)": podDocument,
};

function calculateETA(shipment: TrackedShipment): { date: string; time: string } | null {
  if (shipment.currentStage === "delivered") {
    const deliveredEvent = shipment.timeline.find(e => e.stage === "delivered" && e.timestamp);
    if (deliveredEvent?.timestamp) {
      const dt = new Date(deliveredEvent.timestamp);
      return {
        date: format(dt, "MMM d, yyyy"),
        time: format(dt, "h:mm a"),
      };
    }
    return null;
  }
  
  if (shipment.eta) {
    const etaDate = new Date(shipment.eta);
    return {
      date: format(etaDate, "MMM d, yyyy"),
      time: format(etaDate, "h:mm a"),
    };
  }
  
  const inTransitEvent = shipment.timeline.find(e => e.stage === "in_transit" && e.timestamp);
  if (inTransitEvent?.timestamp) {
    const estimatedArrival = addHours(new Date(inTransitEvent.timestamp), 12);
    return {
      date: format(estimatedArrival, "MMM d, yyyy"),
      time: format(estimatedArrival, "h:mm a"),
    };
  }
  
  const loadedEvent = shipment.timeline.find(e => e.stage === "loaded" && e.timestamp);
  if (loadedEvent?.timestamp) {
    const estimatedArrival = addHours(new Date(loadedEvent.timestamp), 14);
    return {
      date: format(estimatedArrival, "MMM d, yyyy"),
      time: format(estimatedArrival, "h:mm a"),
    };
  }
  
  return null;
}

function getStatusBadge(stage: string) {
  if (stage === "delivered") {
    return (
      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 no-default-hover-elevate no-default-active-elevate">
        <CheckCircle className="h-3 w-3 mr-1" />
        Delivered
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

function formatLoadId(adminReferenceNumber: number | null | undefined): string {
  if (adminReferenceNumber) {
    return `LD-${adminReferenceNumber}`;
  }
  return "LD-XXXX";
}

const documentTypeToLabel: Record<string, string> = {
  lr_consignment: "LR / Consignment Note",
  eway_bill: "E-way Bill",
  loading_photos: "Loading Photos",
  pod: "Proof of Delivery (POD)",
  invoice: "Invoice",
  other: "Other Document",
};

export default function TrackingPage() {
  const { toast } = useToast();
  const { data: shipments = [], isLoading, refetch, isFetching } = useQuery<TrackedShipment[]>({
    queryKey: ['/api/shipments/tracking'],
    refetchInterval: 30000,
  });

  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  const [documentViewerOpen, setDocumentViewerOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<{ type: string; image: string } | null>(null);

  const activeShipments = shipments.filter(s => s.currentStage !== "delivered");
  const selectedShipment = shipments.find(s => s.id === selectedShipmentId) || activeShipments[0] || null;
  const estimatedArrival = selectedShipment ? calculateETA(selectedShipment) : null;

  useEffect(() => {
    const unsubDocumentUploaded = onMarketplaceEvent("document_uploaded", (data: any) => {
      const docLabel = documentTypeToLabel[data?.documentType] || data?.documentType;
      toast({
        title: "New Document Received",
        description: `Carrier uploaded: ${docLabel}`,
      });
      refetch();
      if (data?.shipmentId) {
        queryClient.invalidateQueries({ queryKey: ["/api/shipments", data.shipmentId, "documents"] });
      }
    });
    
    return () => {
      unsubDocumentUploaded();
    };
  }, [toast, refetch]);

  function openDocumentViewer(docType: string) {
    const image = documentImages[docType];
    if (image) {
      setSelectedDocument({ type: docType, image });
      setDocumentViewerOpen(true);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (shipments.length === 0) {
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
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Track Shipments</h1>
          <p className="text-muted-foreground">Monitor your active shipments in real-time.</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => refetch()}
          disabled={isFetching}
          data-testid="button-refresh-tracking"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
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
                {shipments.map((shipment) => (
                  <div
                    key={shipment.id}
                    className={`p-4 rounded-lg cursor-pointer hover-elevate ${
                      selectedShipment?.id === shipment.id 
                        ? "bg-primary/10 border border-primary/20" 
                        : "bg-muted/50"
                    }`}
                    onClick={() => setSelectedShipmentId(shipment.id)}
                    data-testid={`shipment-item-${shipment.id}`}
                  >
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <span className="text-xs text-muted-foreground">
                        Load {formatLoadId(shipment.load?.adminReferenceNumber)}
                      </span>
                      {getStatusBadge(shipment.currentStage)}
                    </div>
                    <p className="font-medium text-sm mb-2">
                      {shipment.load?.pickupCity || "Origin"} to {shipment.load?.dropoffCity || "Destination"}
                    </p>
                    <Progress value={shipment.progress} className="h-2 mb-2" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground gap-2 flex-wrap">
                      <span>{shipment.carrier?.companyName || "Carrier"}</span>
                      {shipment.eta && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          ETA: {format(new Date(shipment.eta), "h:mm a")}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <FileText className="h-3 w-3" />
                      <span>{shipment.documents.length} docs</span>
                      {shipment.documents.filter(d => d.status === "verified").length > 0 && (
                        <Badge variant="outline" className="text-xs py-0">
                          <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                          {shipment.documents.filter(d => d.status === "verified").length} verified
                        </Badge>
                      )}
                    </div>
                    <div className="mt-2 text-xs">
                      <Badge variant="secondary" className="text-xs">
                        {shipment.documents.filter(d => d.status === "verified").length}/{4} required
                      </Badge>
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
                    <CardTitle className="text-lg">
                      {selectedShipment.load?.pickupCity || "Origin"} to {selectedShipment.load?.dropoffCity || "Destination"}
                    </CardTitle>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                      <span className="font-medium">{selectedShipment.carrier?.companyName}</span>
                      {selectedShipment.truck && (
                        <span>
                          {selectedShipment.truck.truckType} - {selectedShipment.truck.registrationNumber}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground flex items-center justify-end gap-1">
                      <Calendar className="h-3 w-3" />
                      {selectedShipment.currentStage === "delivered" ? "Delivered" : "Estimated Arrival"}
                    </p>
                    {estimatedArrival ? (
                      <div>
                        <p className="font-semibold text-lg" data-testid="text-eta-date">{estimatedArrival.date}</p>
                        <p className="text-sm text-muted-foreground" data-testid="text-eta-time">{estimatedArrival.time}</p>
                      </div>
                    ) : (
                      <p className="font-semibold text-muted-foreground">Pending</p>
                    )}
                  </div>
                </div>
                <Progress value={selectedShipment.progress} className="mt-4" />
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  <div>
                    <h3 className="font-semibold mb-4">Shipment Timeline</h3>
                    <div className="relative">
                      {selectedShipment.timeline.map((event, index) => {
                        const Icon = stageIcons[event.stage as ShipmentStage] || MapPin;
                        const isLast = index === selectedShipment.timeline.length - 1;
                        return (
                          <div key={event.stage} className="flex gap-4 pb-6 last:pb-0">
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
                                  {stageLabels[event.stage as ShipmentStage] || event.stage}
                                </p>
                                {event.completed && (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{event.location}</p>
                              {event.timestamp && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {format(new Date(event.timestamp), "MMM d 'at' h:mm a")}
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
                        <p className="text-xs">Real-time tracking active</p>
                      </div>
                    </div>

                    <h3 className="font-semibold mb-4">Carrier & Truck Details</h3>
                    <div className="space-y-3 mb-6">
                      {selectedShipment.carrier?.carrierType === 'solo' ? (
                        <>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Driver</span>
                            <span className="font-medium">{selectedShipment.driver?.name || selectedShipment.carrier?.username || "N/A"}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Trips Done</span>
                            <span className="font-medium">{selectedShipment.carrier?.tripsCompleted || 0}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Company</span>
                            <span className="font-medium">{selectedShipment.carrier?.companyName || "N/A"}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Driver</span>
                            <span className="font-medium">{selectedShipment.driver?.name || "Pending assignment"}</span>
                          </div>
                        </>
                      )}
                      {selectedShipment.truck ? (
                        <>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Vehicle</span>
                            <span className="font-medium">{selectedShipment.truck.truckType}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Truck No.</span>
                            <span className="font-medium">{selectedShipment.truck.registrationNumber}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Capacity</span>
                            <span className="font-medium">{selectedShipment.truck.capacity} tons</span>
                          </div>
                        </>
                      ) : (
                        <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4" />
                            <span>Truck details will be available once the carrier assigns a vehicle</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <h3 className="font-semibold mb-4">Documents</h3>
                    <div className="space-y-2">
                      {["LR / Consignment Note", "E-way Bill", "Loading Photos", "Proof of Delivery (POD)"].map((docType, index) => {
                        const doc = selectedShipment.documents.find(d => 
                          d.documentType.toLowerCase().includes(docType.toLowerCase().split(" ")[0])
                        );
                        return (
                          <div 
                            key={index} 
                            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover-elevate cursor-pointer"
                            onClick={() => openDocumentViewer(docType)}
                            data-testid={`document-${docType.toLowerCase().replace(/[^a-z]/g, '-')}`}
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{docType}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {doc?.status === "verified" ? (
                                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Verified
                                </Badge>
                              ) : doc ? (
                                <Badge variant="secondary">
                                  <ArrowRight className="h-3 w-3 mr-1" />
                                  Uploaded
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground">
                                  Sample
                                </Badge>
                              )}
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                        );
                      })}
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

      <Dialog open={documentViewerOpen} onOpenChange={setDocumentViewerOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedDocument?.type}
            </DialogTitle>
            <DialogDescription>
              {selectedShipment && (
                <span>
                  Load {formatLoadId(selectedShipment.load?.adminReferenceNumber)} - {selectedShipment.load?.pickupCity} to {selectedShipment.load?.dropoffCity}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedDocument && (
            <div className="mt-4">
              <div className="border rounded-lg overflow-hidden bg-white">
                <img 
                  src={selectedDocument.image} 
                  alt={selectedDocument.type}
                  className="w-full h-auto object-contain"
                  data-testid="img-document-viewer"
                />
              </div>
              <div className="mt-4 flex items-center justify-end gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = selectedDocument.image;
                    link.download = `${selectedDocument.type.replace(/[^a-z0-9]/gi, '_')}.png`;
                    link.click();
                  }}
                  data-testid="button-download-document"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button 
                  size="sm"
                  onClick={() => setDocumentViewerOpen(false)}
                  data-testid="button-close-document"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
