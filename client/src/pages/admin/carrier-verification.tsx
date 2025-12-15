import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { 
  Truck, Search, FileText, ChevronLeft, Eye,
  ShieldCheck, ShieldX, ShieldAlert, Clock,
  CheckCircle, XCircle, User, Building2, MapPin, Phone, Mail
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAdminData, type AdminCarrier } from "@/lib/admin-data-store";
import { format } from "date-fns";

interface VerificationDocument {
  id: string;
  type: string;
  fileName: string;
  uploadedAt: Date;
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string;
}

const simulatedDocuments: Record<string, VerificationDocument[]> = {
  "CAR-001": [
    { id: "doc-1", type: "RC Certificate", fileName: "rc_certificate.pdf", uploadedAt: new Date("2024-01-15"), status: "approved" },
    { id: "doc-2", type: "Insurance", fileName: "insurance_policy.pdf", uploadedAt: new Date("2024-01-15"), status: "approved" },
    { id: "doc-3", type: "Fitness Certificate", fileName: "fitness_cert.pdf", uploadedAt: new Date("2024-01-16"), status: "pending" },
  ],
  "CAR-002": [
    { id: "doc-4", type: "RC Certificate", fileName: "vehicle_rc.pdf", uploadedAt: new Date("2024-02-01"), status: "pending" },
    { id: "doc-5", type: "Driver License", fileName: "license.pdf", uploadedAt: new Date("2024-02-01"), status: "pending" },
  ],
  "CAR-003": [
    { id: "doc-6", type: "RC Certificate", fileName: "rc.pdf", uploadedAt: new Date("2024-01-20"), status: "rejected", rejectionReason: "Document expired" },
    { id: "doc-7", type: "Insurance", fileName: "insurance.pdf", uploadedAt: new Date("2024-01-20"), status: "rejected", rejectionReason: "Invalid policy number" },
  ],
};

export default function CarrierVerificationPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { carriers, verifyCarrier, rejectCarrier } = useAdminData();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedCarrier, setSelectedCarrier] = useState<AdminCarrier | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const pendingCarriers = useMemo(() => {
    return carriers.filter(c => c.verificationStatus === "pending");
  }, [carriers]);

  const rejectedCarriers = useMemo(() => {
    return carriers.filter(c => c.verificationStatus === "rejected");
  }, [carriers]);

  const filteredCarriers = useMemo(() => {
    const list = activeTab === "pending" ? pendingCarriers : rejectedCarriers;
    if (!searchQuery) return list;
    
    const query = searchQuery.toLowerCase();
    return list.filter(carrier => 
      carrier.companyName?.toLowerCase().includes(query) ||
      carrier.email?.toLowerCase().includes(query)
    );
  }, [activeTab, pendingCarriers, rejectedCarriers, searchQuery]);

  const handleApprove = (carrier: AdminCarrier) => {
    verifyCarrier(carrier.carrierId);
    toast({
      title: "Carrier Verified",
      description: `${carrier.companyName} has been verified and added to the directory.`,
    });
    setDetailsOpen(false);
    setSelectedCarrier(null);
  };

  const handleReject = () => {
    if (selectedCarrier) {
      rejectCarrier(selectedCarrier.carrierId, rejectReason);
      toast({
        title: "Verification Rejected",
        description: `${selectedCarrier.companyName} verification has been rejected.`,
      });
      setRejectDialogOpen(false);
      setDetailsOpen(false);
      setSelectedCarrier(null);
      setRejectReason("");
    }
  };

  const openDetails = (carrier: AdminCarrier) => {
    setSelectedCarrier(carrier);
    setDetailsOpen(true);
  };

  const getCarrierTypeDisplay = (carrier: AdminCarrier) => {
    if (carrier.fleetSize === 1) {
      return { label: "Solo Owner-Operator", icon: User, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" };
    }
    return { label: `Fleet (${carrier.fleetSize} trucks)`, icon: Building2, color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" };
  };

  const getDocuments = (carrierId: string): VerificationDocument[] => {
    return simulatedDocuments[carrierId] || [
      { id: `auto-${carrierId}-1`, type: "RC Certificate", fileName: "rc_certificate.pdf", uploadedAt: new Date(), status: "pending" },
      { id: `auto-${carrierId}-2`, type: "Insurance", fileName: "insurance.pdf", uploadedAt: new Date(), status: "pending" },
      { id: `auto-${carrierId}-3`, type: "Driver License", fileName: "license.pdf", uploadedAt: new Date(), status: "pending" },
    ];
  };

  const renderCarrierCard = (carrier: AdminCarrier) => {
    const carrierType = getCarrierTypeDisplay(carrier);
    const CarrierIcon = carrierType.icon;
    const documents = getDocuments(carrier.carrierId);
    const pendingDocs = documents.filter(d => d.status === "pending").length;
    const rejectedDocs = documents.filter(d => d.status === "rejected").length;

    return (
      <Card key={carrier.carrierId} className="hover-elevate" data-testid={`verification-card-${carrier.carrierId}`}>
        <CardContent className="p-5">
          <div className="flex flex-col lg:flex-row lg:items-start gap-4">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <Truck className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold" data-testid={`text-carrier-name-${carrier.carrierId}`}>
                    {carrier.companyName}
                  </h3>
                  <p className="text-sm text-muted-foreground">{carrier.email}</p>
                </div>
                <Badge className={`${carrierType.color} no-default-hover-elevate no-default-active-elevate`}>
                  <CarrierIcon className="h-3 w-3 mr-1" />
                  {carrierType.label}
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{carrier.phone || "Not provided"}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{carrier.serviceZones?.slice(0, 2).join(", ") || "Not specified"}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Truck className="h-4 w-4" />
                  <span>{carrier.fleetSize} truck(s)</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Applied {format(new Date(carrier.dateJoined), "MMM d, yyyy")}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="gap-1">
                  <FileText className="h-3 w-3" />
                  {documents.length} Documents
                </Badge>
                {pendingDocs > 0 && (
                  <Badge variant="secondary" className="gap-1">
                    <Clock className="h-3 w-3" />
                    {pendingDocs} Pending Review
                  </Badge>
                )}
                {rejectedDocs > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <XCircle className="h-3 w-3" />
                    {rejectedDocs} Rejected
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => openDetails(carrier)}
                data-testid={`button-view-details-${carrier.carrierId}`}
              >
                <Eye className="h-4 w-4 mr-2" />
                Review
              </Button>
              {carrier.verificationStatus === "pending" && (
                <>
                  <Button 
                    onClick={() => handleApprove(carrier)}
                    data-testid={`button-quick-approve-${carrier.carrierId}`}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={() => {
                      setSelectedCarrier(carrier);
                      setRejectDialogOpen(true);
                    }}
                    data-testid={`button-quick-reject-${carrier.carrierId}`}
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
                <p className="text-2xl font-bold" data-testid="stat-pending">{pendingCarriers.length}</p>
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
                <p className="text-2xl font-bold" data-testid="stat-rejected">{rejectedCarriers.length}</p>
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
                <p className="text-sm text-muted-foreground">Verified Today</p>
                <p className="text-2xl font-bold" data-testid="stat-verified-today">
                  {carriers.filter(c => c.verificationStatus === "verified").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
            Pending ({pendingCarriers.length})
          </TabsTrigger>
          <TabsTrigger value="rejected" data-testid="tab-rejected" className="gap-2">
            <ShieldX className="h-4 w-4" />
            Rejected ({rejectedCarriers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4 space-y-4">
          {filteredCarriers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ShieldCheck className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <h3 className="text-lg font-semibold">All Caught Up!</h3>
                <p className="text-muted-foreground">No pending verification requests at this time.</p>
              </CardContent>
            </Card>
          ) : (
            filteredCarriers.map(carrier => renderCarrierCard(carrier))
          )}
        </TabsContent>

        <TabsContent value="rejected" className="mt-4 space-y-4">
          {filteredCarriers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <XCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No Rejected Applications</h3>
                <p className="text-muted-foreground">No carriers have been rejected.</p>
              </CardContent>
            </Card>
          ) : (
            filteredCarriers.map(carrier => renderCarrierCard(carrier))
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              {selectedCarrier?.companyName}
            </DialogTitle>
            <DialogDescription>
              Review carrier details and uploaded documents
            </DialogDescription>
          </DialogHeader>
          
          {selectedCarrier && (
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Carrier Information</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-muted-foreground">Company Name</Label>
                      <p className="font-medium">{selectedCarrier.companyName}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Type</Label>
                      <p className="font-medium">
                        {selectedCarrier.fleetSize === 1 ? "Solo Owner-Operator" : `Fleet (${selectedCarrier.fleetSize} trucks)`}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Email</Label>
                      <p className="font-medium">{selectedCarrier.email}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Phone</Label>
                      <p className="font-medium">{selectedCarrier.phone || "Not provided"}</p>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-muted-foreground">Service Zones</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedCarrier.serviceZones?.map((zone, i) => (
                          <Badge key={i} variant="outline">{zone}</Badge>
                        )) || <span className="text-muted-foreground">Not specified</span>}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Uploaded Documents</CardTitle>
                    <CardDescription>Review and verify each document</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {getDocuments(selectedCarrier.carrierId).map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{doc.type}</p>
                              <p className="text-sm text-muted-foreground">{doc.fileName}</p>
                              <p className="text-xs text-muted-foreground">
                                Uploaded {format(doc.uploadedAt, "MMM d, yyyy")}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {doc.status === "pending" && (
                              <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
                            )}
                            {doc.status === "approved" && (
                              <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>
                            )}
                            {doc.status === "rejected" && (
                              <div className="text-right">
                                <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>
                                {doc.rejectionReason && (
                                  <p className="text-xs text-destructive mt-1">{doc.rejectionReason}</p>
                                )}
                              </div>
                            )}
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
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
            {selectedCarrier?.verificationStatus === "pending" && (
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
                  onClick={() => handleApprove(selectedCarrier)}
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
              Please provide a reason for rejecting {selectedCarrier?.companyName}'s verification.
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
              disabled={!rejectReason.trim()}
              data-testid="button-confirm-reject"
            >
              Reject Verification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
