import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { onMarketplaceEvent } from "@/lib/marketplace-socket";
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MapPin,
  Star,
  ShieldCheck,
  ShieldX,
  Truck,
  FileText,
  Package,
  Clock,
  RefreshCw,
  Calendar,
  Activity,
  Eye,
  CheckCircle2,
  XCircle,
  Download,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

interface CarrierProfile {
  userId: string;
  carrierType: string;
  fleetSize: number;
  serviceZones: string[];
  reliabilityScore: string;
  communicationScore: string;
  onTimeScore: string;
  totalDeliveries: number;
  badgeLevel: string;
  rating: string;
  bio?: string;
}

interface CarrierData {
  id: string;
  username: string;
  email: string;
  companyName: string;
  phone?: string;
  isVerified: boolean;
  createdAt: string;
  profile: CarrierProfile;
  bids: any[];
  bidCount: number;
  documents: any[];
  documentCount: number;
  trucks: any[];
  truckCount: number;
  verification?: any;
  assignedLoads: any[];
}

function formatRupees(amount: number): string {
  if (amount >= 10000000) {
    return `Rs. ${(amount / 10000000).toFixed(2)} Cr`;
  } else if (amount >= 100000) {
    return `Rs. ${(amount / 100000).toFixed(2)} L`;
  } else {
    return `Rs. ${amount.toLocaleString("en-IN")}`;
  }
}

export default function CarrierProfilePage() {
  const [, params] = useRoute("/admin/carriers/:carrierId");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [documentPreviewOpen, setDocumentPreviewOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);

  const carrierId = params?.carrierId;

  const { data: carrier, isLoading, refetch } = useQuery<CarrierData>({
    queryKey: ["/api/admin/carriers", carrierId],
    enabled: !!carrierId,
  });

  // Listen for real-time document uploads from this carrier
  useEffect(() => {
    if (!carrierId) return;

    const unsubscribe = onMarketplaceEvent("carrier_document_uploaded", (data: any) => {
      if (data.carrierId === carrierId) {
        refetch();
        toast({
          title: "New Document Uploaded",
          description: `${data.carrierName || 'Carrier'} uploaded a new ${data.documentType} document. Please review for verification.`,
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [carrierId, refetch, toast]);

  const verifyMutation = useMutation({
    mutationFn: async (isVerified: boolean) => {
      return apiRequest("PATCH", `/api/admin/carriers/${carrierId}/verify`, { isVerified });
    },
    onSuccess: () => {
      refetch();
      // Sync data across portal
      queryClient.invalidateQueries({ queryKey: ["/api/admin/carriers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/carriers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/verifications"] });
      toast({ title: "Carrier Updated", description: "Carrier verification status changed" });
    },
  });

  const documentVerifyMutation = useMutation({
    mutationFn: async ({ documentId, isVerified }: { documentId: string; isVerified: boolean }) => {
      return apiRequest("PATCH", `/api/admin/documents/${documentId}/verify`, { isVerified });
    },
    onSuccess: (_, { isVerified }) => {
      refetch();
      setDocumentPreviewOpen(false);
      setSelectedDocument(null);
      toast({ 
        title: isVerified ? "Document Verified" : "Document Rejected",
        description: isVerified ? "The document has been approved." : "The document has been rejected."
      });
    },
    onError: () => {
      toast({ 
        title: "Error",
        description: "Failed to update document status",
        variant: "destructive"
      });
    },
  });

  const documentTypeLabels: Record<string, string> = {
    license: "Driving License",
    rc: "RC Book",
    insurance: "Insurance Policy",
    fitness: "Fitness Certificate",
    permit: "Road Permit",
    puc: "PUC Certificate",
    pod: "Proof of Delivery",
    lr: "Lorry Receipt",
    eway: "E-Way Bill",
    eway_bill: "E-Way Bill",
    loading_photos: "Loading Photos",
    other: "Other Document",
    truck_rc: "Truck RC",
    truck_insurance: "Truck Insurance",
    truck_fitness: "Truck Fitness",
    truck_permit: "Truck Permit",
    truck_puc: "Truck PUC",
  };

  const handleSync = () => {
    refetch();
    toast({ title: "Data Synced", description: "Carrier data refreshed from database" });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!carrier) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Button 
          variant="ghost" 
          onClick={() => setLocation("/admin/carriers")}
          className="mb-4"
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Carriers
        </Button>
        <Card>
          <CardContent className="p-12 text-center">
            <ShieldX className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Carrier Not Found</h2>
            <p className="text-muted-foreground">The carrier you're looking for doesn't exist.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const profile = carrier.profile;
  const rating = parseFloat(profile?.rating || "0");
  const reliabilityScore = parseFloat(profile?.reliabilityScore || "0");
  const communicationScore = parseFloat(profile?.communicationScore || "0");
  const onTimeScore = parseFloat(profile?.onTimeScore || "0");

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setLocation("/admin/carriers")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold" data-testid="text-carrier-name">
                {carrier.companyName || carrier.username}
              </h1>
              <Badge 
                variant={carrier.isVerified ? "default" : "secondary"}
                className={carrier.isVerified ? "bg-green-500/10 text-green-600 border-green-200" : ""}
              >
                {carrier.isVerified ? (
                  <>
                    <ShieldCheck className="h-3 w-3 mr-1" />
                    Verified
                  </>
                ) : (
                  <>
                    <ShieldX className="h-3 w-3 mr-1" />
                    Unverified
                  </>
                )}
              </Badge>
            </div>
            <p className="text-muted-foreground">{carrier.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSync}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync
          </Button>
          {!carrier.isVerified ? (
            <Button 
              size="sm" 
              onClick={() => verifyMutation.mutate(true)}
              disabled={verifyMutation.isPending}
            >
              <ShieldCheck className="h-4 w-4 mr-2" />
              Verify Carrier
            </Button>
          ) : (
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={() => verifyMutation.mutate(false)}
              disabled={verifyMutation.isPending}
            >
              <ShieldX className="h-4 w-4 mr-2" />
              Revoke Verification
            </Button>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                <Star className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rating</p>
                <p className="text-2xl font-bold">{rating.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Truck className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fleet Size</p>
                <p className="text-2xl font-bold">{profile?.fleetSize || carrier.truckCount || 1}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <Package className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Deliveries</p>
                <p className="text-2xl font-bold">{profile?.totalDeliveries || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Activity className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Bids</p>
                <p className="text-2xl font-bold">{carrier.bidCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="fleet">Fleet ({carrier.truckCount})</TabsTrigger>
          <TabsTrigger value="bids">Bids ({carrier.bidCount})</TabsTrigger>
          <TabsTrigger value="documents">Documents ({carrier.documentCount})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Solo Driver: Driver Info / Enterprise: Company Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {profile?.carrierType === "solo" ? "Driver Information" : "Company Information"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {profile?.carrierType === "solo" ? (
                  <>
                    {/* Solo Driver - Show driver name and truck info */}
                    <div className="flex items-center gap-3">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Driver Name</p>
                        <p className="font-medium">{carrier.username}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Truck Number</p>
                        <p className="font-medium">
                          {carrier.trucks && carrier.trucks.length > 0 
                            ? carrier.trucks[0].licensePlate || "Not registered"
                            : "No truck registered"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Driver ID</p>
                        <p className="font-medium text-xs font-mono">{carrier.id}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Enterprise Carrier - Show company info */}
                    <div className="flex items-center gap-3">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Company Name</p>
                        <p className="font-medium">{carrier.companyName || "Not specified"}</p>
                      </div>
                    </div>
                  </>
                )}
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{carrier.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{carrier.phone || "Not specified"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Member Since</p>
                    <p className="font-medium">
                      {carrier.createdAt ? format(new Date(carrier.createdAt), "MMM dd, yyyy") : "N/A"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Service Zones */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Service Zones</CardTitle>
              </CardHeader>
              <CardContent>
                {profile?.serviceZones && profile.serviceZones.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.serviceZones.map((zone: string, idx: number) => (
                      <Badge key={idx} variant="secondary">
                        <MapPin className="h-3 w-3 mr-1" />
                        {zone}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No service zones specified</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Performance Scores */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Performance Scores</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Reliability</span>
                  <span>{reliabilityScore}%</span>
                </div>
                <Progress value={reliabilityScore} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Communication</span>
                  <span>{communicationScore}%</span>
                </div>
                <Progress value={communicationScore} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>On-Time Delivery</span>
                  <span>{onTimeScore}%</span>
                </div>
                <Progress value={onTimeScore} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fleet" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Fleet Details</CardTitle>
            </CardHeader>
            <CardContent>
              {carrier.trucks && carrier.trucks.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle Number</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {carrier.trucks.map((truck: any) => (
                      <TableRow key={truck.id}>
                        <TableCell className="font-medium">{truck.vehicleNumber}</TableCell>
                        <TableCell>{truck.vehicleType}</TableCell>
                        <TableCell>{truck.capacity} tons</TableCell>
                        <TableCell>
                          <Badge variant={truck.isActive ? "default" : "secondary"}>
                            {truck.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No trucks registered yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bids" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bid History</CardTitle>
            </CardHeader>
            <CardContent>
              {carrier.bids && carrier.bids.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Load ID</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {carrier.bids.slice(0, 20).map((bid: any) => (
                      <TableRow key={bid.id}>
                        <TableCell className="font-mono text-sm">{bid.loadId.slice(0, 8)}...</TableCell>
                        <TableCell>{formatRupees(bid.amount)}</TableCell>
                        <TableCell>
                          <Badge variant={bid.status === "accepted" ? "default" : "secondary"}>
                            {bid.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {bid.createdAt ? format(new Date(bid.createdAt), "MMM dd, yyyy") : "N/A"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No bids placed yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Uploaded Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {carrier.documents && carrier.documents.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {carrier.documents.map((doc: any) => (
                      <TableRow key={doc.id} data-testid={`row-document-${doc.id}`}>
                        <TableCell className="font-medium">{doc.fileName || doc.name}</TableCell>
                        <TableCell>{documentTypeLabels[doc.documentType] || doc.documentType || doc.type}</TableCell>
                        <TableCell>
                          {doc.source === 'truck' ? (
                            <Badge variant="outline" className="text-xs">
                              Truck: {doc.truckPlate}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">Shipment</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {doc.createdAt ? format(new Date(doc.createdAt), "MMM dd, yyyy") : "N/A"}
                        </TableCell>
                        <TableCell>
                          {doc.expiryDate ? format(new Date(doc.expiryDate), "MMM dd, yyyy") : "No expiry"}
                        </TableCell>
                        <TableCell>
                          {doc.isVerified ? (
                            <Badge variant="default">Verified</Badge>
                          ) : (
                            <Badge variant="secondary">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setSelectedDocument(doc);
                                setDocumentPreviewOpen(true);
                              }}
                              data-testid={`button-view-document-${doc.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {!doc.isVerified && doc.source !== 'truck' && (
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="text-green-600 hover:text-green-700"
                                  onClick={() => documentVerifyMutation.mutate({ documentId: doc.id, isVerified: true })}
                                  disabled={documentVerifyMutation.isPending}
                                  data-testid={`button-approve-document-${doc.id}`}
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => documentVerifyMutation.mutate({ documentId: doc.id, isVerified: false })}
                                  disabled={documentVerifyMutation.isPending}
                                  data-testid={`button-reject-document-${doc.id}`}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No documents uploaded yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Document Preview Dialog */}
      <Dialog open={documentPreviewOpen} onOpenChange={setDocumentPreviewOpen}>
        <DialogContent className="sm:max-w-2xl">
          {selectedDocument && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <DialogTitle>
                      {documentTypeLabels[selectedDocument.documentType] || selectedDocument.documentType}
                    </DialogTitle>
                    <DialogDescription>
                      {selectedDocument.fileName}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="py-4">
                <div className="aspect-[4/3] rounded-lg bg-muted flex items-center justify-center mb-4 overflow-hidden">
                  {selectedDocument.fileUrl?.includes("/assets/generated_images/") || 
                   selectedDocument.fileUrl?.endsWith(".png") || 
                   selectedDocument.fileUrl?.endsWith(".jpg") || 
                   selectedDocument.fileUrl?.endsWith(".jpeg") ||
                   selectedDocument.fileUrl?.startsWith("data:image/") ? (
                    <img 
                      src={selectedDocument.fileUrl} 
                      alt={selectedDocument.fileName}
                      className="w-full h-full object-contain"
                      data-testid="img-document-preview"
                    />
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <FileText className="h-16 w-16 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Document Preview</p>
                      <p className="text-xs">{selectedDocument.fileName}</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">File Size</p>
                    <p className="font-medium">
                      {selectedDocument.fileSize 
                        ? `${(selectedDocument.fileSize / 1024).toFixed(1)} KB`
                        : "Unknown"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <div className="mt-1">
                      {selectedDocument.isVerified ? (
                        <Badge variant="default">Verified</Badge>
                      ) : (
                        <Badge variant="secondary">Pending Review</Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Uploaded</p>
                    <p className="font-medium">
                      {selectedDocument.createdAt ? format(new Date(selectedDocument.createdAt), "dd MMM yyyy") : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Expiry Date</p>
                    <p className="font-medium">
                      {selectedDocument.expiryDate 
                        ? format(new Date(selectedDocument.expiryDate), "dd MMM yyyy")
                        : "No expiry date"}
                    </p>
                  </div>
                </div>
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                {!selectedDocument.isVerified && (
                  <>
                    <Button 
                      variant="destructive" 
                      onClick={() => documentVerifyMutation.mutate({ documentId: selectedDocument.id, isVerified: false })}
                      disabled={documentVerifyMutation.isPending}
                      data-testid="button-reject-document-dialog"
                    >
                      {documentVerifyMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <XCircle className="h-4 w-4 mr-2" />
                      )}
                      Reject
                    </Button>
                    <Button 
                      variant="default"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => documentVerifyMutation.mutate({ documentId: selectedDocument.id, isVerified: true })}
                      disabled={documentVerifyMutation.isPending}
                      data-testid="button-approve-document-dialog"
                    >
                      {documentVerifyMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                      )}
                      Verify
                    </Button>
                  </>
                )}
                <div className="flex-1" />
                <Button 
                  variant="outline"
                  onClick={() => window.open(selectedDocument.fileUrl, "_blank")}
                  data-testid="button-download-document"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => window.open(selectedDocument.fileUrl, "_blank")}
                  data-testid="button-view-full-document"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Full
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
