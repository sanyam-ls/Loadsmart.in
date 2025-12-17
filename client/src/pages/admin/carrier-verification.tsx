import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Truck, Search, FileText, ChevronLeft, Eye, ExternalLink,
  ShieldCheck, ShieldX, ShieldAlert, Clock,
  CheckCircle, XCircle, User, Building2, MapPin, Phone,
  ChevronDown, Info, Image, FileType, Ruler
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

// Document Requirements for Indian Freight Carriers (with pixel specifications)
const DOCUMENT_REQUIREMENTS = [
  { 
    type: "rc", 
    name: "RC (Registration Certificate)", 
    minPixels: "1200 x 800 px", 
    recPixels: "1600 x 1200 px", 
    dpi: "200-300", 
    formats: "JPG / PNG / PDF" 
  },
  { 
    type: "insurance", 
    name: "Vehicle Insurance", 
    minPixels: "1200 x 800 px", 
    recPixels: "1600 x 1200 px", 
    dpi: "200-300", 
    formats: "PDF / JPG" 
  },
  { 
    type: "fitness", 
    name: "Fitness Certificate", 
    minPixels: "1200 x 800 px", 
    recPixels: "1600 x 1200 px", 
    dpi: "200-300", 
    formats: "PDF / JPG" 
  },
  { 
    type: "permit", 
    name: "National / State Permit", 
    minPixels: "1200 x 800 px", 
    recPixels: "1600 x 1200 px", 
    dpi: "200-300", 
    formats: "PDF / JPG" 
  },
  { 
    type: "puc", 
    name: "PUC Certificate", 
    minPixels: "1000 x 700 px", 
    recPixels: "1200 x 800 px", 
    dpi: "200+", 
    formats: "PDF / JPG" 
  },
  { 
    type: "road_tax", 
    name: "Road Tax / Challan Clearance", 
    minPixels: "1000 x 700 px", 
    recPixels: "1200 x 800 px", 
    dpi: "200+", 
    formats: "PDF / JPG" 
  },
];

// Complete document type labels for all supported types
const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  rc: "RC (Registration Certificate)",
  insurance: "Vehicle Insurance",
  fitness: "Fitness Certificate",
  permit: "National / State Permit",
  puc: "PUC Certificate",
  road_tax: "Road Tax / Challan Clearance",
  license: "Driving License",
  pan: "PAN Card",
  gst: "GST Certificate",
  aadhar: "Aadhaar Card",
  fleet_proof: "Fleet Ownership Proof",
};

// Helper to get document display name
const getDocumentDisplayName = (type: string) => {
  return DOCUMENT_TYPE_LABELS[type] || type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
};

interface CarrierVerification {
  id: string;
  carrierId: string;
  carrierType: "solo" | "enterprise";
  fleetSize: number;
  status: "pending" | "approved" | "rejected";
  notes?: string;
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  carrier?: {
    id: string;
    username: string;
    companyName: string;
    email: string;
    phone?: string;
    serviceZones?: string[];
  };
  documents?: VerificationDocument[];
}

interface VerificationDocument {
  id: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
  status?: "pending" | "approved" | "rejected";
}

export default function CarrierVerificationPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedVerification, setSelectedVerification] = useState<CarrierVerification | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [requirementsOpen, setRequirementsOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<VerificationDocument | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const { data: verifications = [], isLoading } = useQuery<CarrierVerification[]>({
    queryKey: ["/api/admin/verifications"],
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/admin/verifications/${id}/approve`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/verifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/carriers"] });
      toast({
        title: "Carrier Verified",
        description: "The carrier has been verified and added to the directory.",
      });
      setDetailsOpen(false);
      setSelectedVerification(null);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to approve verification",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return apiRequest("POST", `/api/admin/verifications/${id}/reject`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/verifications"] });
      toast({
        title: "Verification Rejected",
        description: "The carrier verification has been rejected.",
      });
      setRejectDialogOpen(false);
      setDetailsOpen(false);
      setSelectedVerification(null);
      setRejectReason("");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to reject verification",
      });
    },
  });

  const pendingVerifications = useMemo(() => {
    return verifications.filter(v => v.status === "pending");
  }, [verifications]);

  const rejectedVerifications = useMemo(() => {
    return verifications.filter(v => v.status === "rejected");
  }, [verifications]);

  const filteredVerifications = useMemo(() => {
    const list = activeTab === "pending" ? pendingVerifications : rejectedVerifications;
    if (!searchQuery) return list;
    
    const query = searchQuery.toLowerCase();
    return list.filter(v => 
      v.carrier?.companyName?.toLowerCase().includes(query) ||
      v.carrier?.email?.toLowerCase().includes(query)
    );
  }, [activeTab, pendingVerifications, rejectedVerifications, searchQuery]);

  const handleApprove = (verification: CarrierVerification) => {
    approveMutation.mutate(verification.id);
  };

  const handleReject = () => {
    if (selectedVerification && rejectReason.trim()) {
      rejectMutation.mutate({ id: selectedVerification.id, reason: rejectReason });
    }
  };

  const openDetails = (verification: CarrierVerification) => {
    setSelectedVerification(verification);
    setDetailsOpen(true);
  };

  const getCarrierTypeDisplay = (verification: CarrierVerification) => {
    if (verification.carrierType === "solo" || verification.fleetSize === 1) {
      return { label: "Solo Owner-Operator", icon: User, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" };
    }
    return { label: `Fleet (${verification.fleetSize} trucks)`, icon: Building2, color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" };
  };

  const renderVerificationCard = (verification: CarrierVerification) => {
    const carrierType = getCarrierTypeDisplay(verification);
    const CarrierIcon = carrierType.icon;
    const documents = verification.documents || [];

    return (
      <Card key={verification.id} className="hover-elevate" data-testid={`verification-card-${verification.id}`}>
        <CardContent className="p-5">
          <div className="flex flex-col lg:flex-row lg:items-start gap-4">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <Truck className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold" data-testid={`text-carrier-name-${verification.id}`}>
                    {verification.carrier?.companyName || "Unknown Carrier"}
                  </h3>
                  <p className="text-sm text-muted-foreground">{verification.carrier?.email}</p>
                </div>
                <Badge className={`${carrierType.color} no-default-hover-elevate no-default-active-elevate`}>
                  <CarrierIcon className="h-3 w-3 mr-1" />
                  {carrierType.label}
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{verification.carrier?.phone || "Not provided"}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{verification.carrier?.serviceZones?.slice(0, 2).join(", ") || "Not specified"}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Truck className="h-4 w-4" />
                  <span>{verification.fleetSize} truck(s)</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Applied {format(new Date(verification.createdAt), "MMM d, yyyy")}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="gap-1">
                  <FileText className="h-3 w-3" />
                  {documents.length} Documents
                </Badge>
                {verification.status === "rejected" && verification.rejectionReason && (
                  <Badge variant="destructive" className="gap-1">
                    <XCircle className="h-3 w-3" />
                    Rejected: {verification.rejectionReason}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => openDetails(verification)}
                data-testid={`button-view-details-${verification.id}`}
              >
                <Eye className="h-4 w-4 mr-2" />
                Review
              </Button>
              {verification.status === "pending" && (
                <>
                  <Button 
                    onClick={() => handleApprove(verification)}
                    disabled={approveMutation.isPending}
                    data-testid={`button-quick-approve-${verification.id}`}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={() => {
                      setSelectedVerification(verification);
                      setRejectDialogOpen(true);
                    }}
                    data-testid={`button-quick-reject-${verification.id}`}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setLocation("/admin")}
          data-testid="button-back"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Carrier Verification</h1>
          <p className="text-muted-foreground">Review and verify carrier applications with documents</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-2xl font-bold" data-testid="stat-pending">{pendingVerifications.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                <ShieldX className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold" data-testid="stat-rejected">{rejectedVerifications.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Verified</p>
                <p className="text-2xl font-bold" data-testid="stat-verified-today">
                  {verifications.filter(v => v.status === "approved").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Document Requirements Reference */}
      <Collapsible open={requirementsOpen} onOpenChange={setRequirementsOpen}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-600" />
                  <CardTitle className="text-sm font-medium">Document Requirements Reference</CardTitle>
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform ${requirementsOpen ? "rotate-180" : ""}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 font-medium">Document Type</th>
                      <th className="text-left py-2 px-3 font-medium">
                        <div className="flex items-center gap-1">
                          <Ruler className="h-3 w-3" /> Min Pixels
                        </div>
                      </th>
                      <th className="text-left py-2 px-3 font-medium">
                        <div className="flex items-center gap-1">
                          <Image className="h-3 w-3" /> Recommended
                        </div>
                      </th>
                      <th className="text-left py-2 px-3 font-medium">DPI</th>
                      <th className="text-left py-2 px-3 font-medium">
                        <div className="flex items-center gap-1">
                          <FileType className="h-3 w-3" /> Formats
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {DOCUMENT_REQUIREMENTS.map((doc) => (
                      <tr key={doc.type} className="border-b last:border-0 hover-elevate">
                        <td className="py-2 px-3 font-medium">{doc.name}</td>
                        <td className="py-2 px-3 text-muted-foreground">{doc.minPixels}</td>
                        <td className="py-2 px-3 text-muted-foreground">{doc.recPixels}</td>
                        <td className="py-2 px-3 text-muted-foreground">{doc.dpi}</td>
                        <td className="py-2 px-3">
                          <Badge variant="secondary" className="text-xs">{doc.formats}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by company name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending" data-testid="tab-pending" className="gap-2">
            <ShieldAlert className="h-4 w-4" />
            Pending ({pendingVerifications.length})
          </TabsTrigger>
          <TabsTrigger value="rejected" data-testid="tab-rejected" className="gap-2">
            <ShieldX className="h-4 w-4" />
            Rejected ({rejectedVerifications.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4 space-y-4">
          {filteredVerifications.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ShieldCheck className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <h3 className="text-lg font-semibold">All Caught Up!</h3>
                <p className="text-muted-foreground">No pending verification requests at this time.</p>
              </CardContent>
            </Card>
          ) : (
            filteredVerifications.map(verification => renderVerificationCard(verification))
          )}
        </TabsContent>

        <TabsContent value="rejected" className="mt-4 space-y-4">
          {filteredVerifications.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <XCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No Rejected Applications</h3>
                <p className="text-muted-foreground">No carriers have been rejected.</p>
              </CardContent>
            </Card>
          ) : (
            filteredVerifications.map(verification => renderVerificationCard(verification))
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              {selectedVerification?.carrier?.companyName || "Carrier Details"}
            </DialogTitle>
            <DialogDescription>
              Review carrier details and uploaded documents
            </DialogDescription>
          </DialogHeader>
          
          {selectedVerification && (
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Carrier Information</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-muted-foreground">Company Name</Label>
                      <p className="font-medium">{selectedVerification.carrier?.companyName || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Type</Label>
                      <p className="font-medium">
                        {selectedVerification.carrierType === "solo" ? "Solo Owner-Operator" : `Fleet (${selectedVerification.fleetSize} trucks)`}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Email</Label>
                      <p className="font-medium">{selectedVerification.carrier?.email || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Phone</Label>
                      <p className="font-medium">{selectedVerification.carrier?.phone || "Not provided"}</p>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-muted-foreground">Service Zones</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedVerification.carrier?.serviceZones?.map((zone, i) => (
                          <Badge key={i} variant="outline">{zone}</Badge>
                        )) || <span className="text-muted-foreground">Not specified</span>}
                      </div>
                    </div>
                    {selectedVerification.notes && (
                      <div className="col-span-2">
                        <Label className="text-muted-foreground">Notes from Carrier</Label>
                        <p className="font-medium">{selectedVerification.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Uploaded Documents</CardTitle>
                    <CardDescription>Review and verify each document</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(selectedVerification.documents || []).length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">No documents uploaded yet</p>
                      ) : (
                        selectedVerification.documents?.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{getDocumentDisplayName(doc.documentType)}</p>
                                <p className="text-sm text-muted-foreground">{doc.fileName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {doc.uploadedAt ? `Uploaded ${format(new Date(doc.uploadedAt), "MMM d, yyyy")}` : "Recently uploaded"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {doc.status === "approved" ? (
                                <Badge variant="default" className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>
                              ) : doc.status === "rejected" ? (
                                <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>
                              ) : (
                                <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
                              )}
                              <Button 
                                variant="outline" 
                                size="sm" 
                                data-testid={`button-view-${doc.documentType}`}
                                onClick={() => {
                                  setPreviewDoc(doc);
                                  setPreviewOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          )}
          
          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Close
            </Button>
            {selectedVerification?.status === "pending" && (
              <>
                <Button 
                  variant="destructive"
                  onClick={() => {
                    setRejectDialogOpen(true);
                  }}
                  data-testid="button-reject-carrier"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button 
                  onClick={() => handleApprove(selectedVerification)}
                  disabled={approveMutation.isPending}
                  data-testid="button-approve-carrier"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve & Verify
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Verification</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting {selectedVerification?.carrier?.companyName}'s verification.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Rejection Reason</Label>
              <Textarea
                placeholder="Enter the reason for rejection..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="mt-2"
                data-testid="input-reject-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={!rejectReason.trim() || rejectMutation.isPending}
              data-testid="button-confirm-reject"
            >
              Reject Verification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {previewDoc && getDocumentDisplayName(previewDoc.documentType)}
            </DialogTitle>
            <DialogDescription>
              {previewDoc?.fileName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {previewDoc && (
              <>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Document Type</Label>
                    <p className="font-medium">{getDocumentDisplayName(previewDoc.documentType)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">File Name</Label>
                    <p className="font-medium">{previewDoc.fileName}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Upload Date</Label>
                    <p className="font-medium">
                      {previewDoc.uploadedAt ? format(new Date(previewDoc.uploadedAt), "MMM d, yyyy HH:mm") : "Recently uploaded"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <div className="mt-1">
                      {previewDoc.status === "approved" ? (
                        <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>
                      ) : previewDoc.status === "rejected" ? (
                        <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>
                      ) : (
                        <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending Review</Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Document Preview */}
                <div className="border rounded-lg overflow-hidden bg-muted/30">
                  {previewDoc.fileUrl.endsWith('.pdf') || previewDoc.fileName.endsWith('.pdf') ? (
                    <iframe
                      src={previewDoc.fileUrl}
                      className="w-full h-[400px]"
                      title={previewDoc.fileName}
                    />
                  ) : previewDoc.fileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) || previewDoc.fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <img
                      src={previewDoc.fileUrl}
                      alt={previewDoc.fileName}
                      className="max-w-full max-h-[400px] mx-auto object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <FileText className="h-16 w-16 mb-4" />
                      <p className="text-lg font-medium">Document Preview</p>
                      <p className="text-sm">Click below to open the document</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
            <Button asChild data-testid="button-open-document">
              <a href={previewDoc?.fileUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in New Tab
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
