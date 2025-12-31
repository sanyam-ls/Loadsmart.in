import { useState, useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  ChevronLeft,
  Package,
  User,
  Truck,
  MapPin,
  FileText,
  Clock,
  DollarSign,
  MessageSquare,
  Phone,
  Mail,
  Building2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Edit,
  UserPlus,
  Download,
  Eye,
  Star,
  Navigation,
  Calendar,
  Weight,
  Ruler,
  Shield,
  BadgeCheck,
  CircleDot,
  Send,
  MoreHorizontal,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAdminData, type DetailedLoad, type AdminLoad, type AdminCarrier, type LoadBidRecord } from "@/lib/admin-data-store";
import { useBidsByLoad, type GroupedBidsResponse } from "@/lib/api-hooks";
import { format } from "date-fns";
import type { Load } from "@shared/schema";

const formatCurrency = (amount: number) => {
  if (amount >= 100000) {
    return `Rs. ${(amount / 100000).toFixed(2)}L`;
  }
  return `Rs. ${amount.toLocaleString("en-IN")}`;
};

interface SafeUserDTO {
  id: string;
  username: string;
  email: string;
  company: string | null;
  phone: string | null;
  isVerified: boolean;
  role: string;
}

type LoadWithRelations = Load & { 
  shipper?: SafeUserDTO | null; 
  assignedCarrier?: SafeUserDTO | null; 
};

export default function AdminLoadDetailsPage() {
  const [, setLocation] = useLocation();
  const params = useParams<{ loadId: string }>();
  const { toast } = useToast();
  const { getDetailedLoad, updateLoadStatus, cancelLoad, assignCarrier, addAdminNote, approveDocument, rejectDocument, carriers, refreshFromShipperPortal } = useAdminData();
  
  const [activeTab, setActiveTab] = useState("overview");
  const [adminNote, setAdminNote] = useState("");
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<AdminLoad["status"]>("Active");
  const [selectedCarrierId, setSelectedCarrierId] = useState("");
  
  const loadId = params.loadId || "";
  
  const { data: apiLoad, isLoading: isApiLoading, error: apiError } = useQuery<LoadWithRelations>({
    queryKey: ["/api/loads", loadId],
    enabled: !!loadId,
  });

  // Fetch real bids from API for dual marketplace view
  const { data: apiBids } = useBidsByLoad(loadId);

  // Convert API bids to the LoadBidRecord format expected by the UI
  const apiBidsAsRecords = useMemo((): LoadBidRecord[] => {
    if (apiBids && apiBids.allBids && apiBids.allBids.length > 0) {
      return apiBids.allBids.map((bid: any) => ({
        bidId: bid.id,
        carrierId: bid.carrierId,
        carrierName: bid.carrier?.companyName || bid.carrier?.username || "Unknown Carrier",
        carrierType: (bid.carrierType || "enterprise") as "solo" | "enterprise",
        amount: parseFloat(bid.amount || "0"),
        status: (bid.status === "accepted" ? "Accepted" : 
                bid.status === "rejected" ? "Rejected" : 
                bid.status === "countered" ? "Countered" : "Pending") as LoadBidRecord["status"],
        submittedAt: bid.createdAt ? new Date(bid.createdAt) : new Date(),
        counterOffer: bid.counterAmount ? parseFloat(bid.counterAmount) : undefined,
        notes: bid.notes || undefined,
      }));
    }
    return [];
  }, [apiBids]);
  
  const detailedLoad = useMemo(() => {
    if (apiLoad) {
      // Use sequential shipperLoadNumber for consistent LD-XXX format across all portals
      const displayLoadId = `LD-${String(apiLoad.shipperLoadNumber || 0).padStart(3, '0')}`;
      return getDetailedLoad(displayLoadId) || createDetailedLoadFromApi(apiLoad, displayLoadId);
    }
    return getDetailedLoad(loadId);
  }, [loadId, getDetailedLoad, apiLoad]);

  // Final bids array: prefer API bids, fallback to mock data
  const allBids = useMemo(() => {
    if (apiBidsAsRecords.length > 0) return apiBidsAsRecords;
    return detailedLoad?.bids || [];
  }, [apiBidsAsRecords, detailedLoad?.bids]);

  // Pre-computed filtered bid arrays for dual marketplace view
  const soloBidsFiltered = useMemo(() => allBids.filter(b => b.carrierType === "solo"), [allBids]);
  const enterpriseBidsFiltered = useMemo(() => allBids.filter(b => b.carrierType === "enterprise" || !b.carrierType), [allBids]);
  
  function createDetailedLoadFromApi(load: LoadWithRelations, displayId: string): DetailedLoad {
    const mapLoadStatus = (status: string | null): AdminLoad["status"] => {
      switch (status) {
        case "pending": return "Pending";
        case "priced": return "Active";
        case "posted_to_carriers": return "Active";
        case "open_for_bid": return "Bidding";
        case "counter_received": return "Bidding";
        case "awarded": return "Assigned";
        case "in_transit": return "En Route";
        case "delivered": return "Delivered";
        case "closed": return "Delivered";
        case "cancelled": return "Cancelled";
        default: return "Pending";
      }
    };
    
    return {
      loadId: displayId,
      shipperId: load.shipperId,
      shipperName: load.shipperCompanyName || load.shipperContactName || "Unknown Shipper",
      pickup: load.pickupCity,
      drop: load.dropoffCity,
      weight: parseFloat(String(load.weight)) || 0,
      weightUnit: load.weightUnit || "kg",
      type: load.requiredTruckType || "Any",
      status: mapLoadStatus(load.status),
      assignedCarrier: null,
      carrierId: load.assignedCarrierId,
      createdDate: load.createdAt ? new Date(load.createdAt) : new Date(),
      eta: null,
      spending: parseFloat(String(load.adminFinalPrice || load.finalPrice || load.estimatedPrice || 0)),
      bidCount: 0,
      distance: parseFloat(String(load.distance || 0)),
      dimensions: "",
      priority: load.priority === "high" ? "High" : load.priority === "critical" ? "Critical" : "Normal",
      title: load.goodsToBeCarried,
      description: load.specialNotes || "",
      requiredTruckType: load.requiredTruckType,
      _originalId: load.id,
      shipperDetails: {
        shipperId: load.shipperId,
        name: load.shipperContactName || "Unknown",
        company: load.shipperCompanyName || "Unknown Company",
        phone: load.shipperPhone || "",
        email: load.shipper?.email || "",
        address: load.shipperCompanyAddress || "",
        isVerified: load.shipper?.isVerified || false,
        totalLoadsPosted: 0,
        rating: 4.5,
      },
      carrierDetails: load.assignedCarrier ? {
        carrierId: load.assignedCarrier.id,
        companyName: load.assignedCarrier.company || load.assignedCarrier.username,
        contactNumber: load.assignedCarrier.phone || "",
        verificationStatus: load.assignedCarrier.isVerified ? "verified" : "pending",
        rating: 4.5,
        fleetSize: 0,
      } : undefined,
      vehicleDetails: undefined,
      bids: [],
      negotiations: [],
      costBreakdown: {
        baseFreightCost: parseFloat(String(load.estimatedPrice || 0)),
        fuelSurcharge: 0,
        handlingFee: 0,
        platformFee: 0,
        totalCost: parseFloat(String(load.adminFinalPrice || load.finalPrice || load.estimatedPrice || 0)),
      },
      documents: [],
      activityLog: [],
      routeInfo: {
        pickupCoordinates: { lat: parseFloat(String(load.pickupLat || 0)), lng: parseFloat(String(load.pickupLng || 0)) },
        dropCoordinates: { lat: parseFloat(String(load.dropoffLat || 0)), lng: parseFloat(String(load.dropoffLng || 0)) },
        estimatedTime: "N/A",
        liveStatus: "Pending Pickup",
        checkpoints: [],
      },
    };
  }
  
  if (isApiLoading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px]">
        <Package className="h-16 w-16 text-muted-foreground mb-4 animate-pulse" />
        <h2 className="text-xl font-semibold mb-2">Loading...</h2>
        <p className="text-muted-foreground">Fetching load details</p>
      </div>
    );
  }
  
  if (!detailedLoad) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px]">
        <Package className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Load Not Found</h2>
        <p className="text-muted-foreground mb-4">The requested load could not be found.</p>
        <Button onClick={() => setLocation("/admin/loads")} data-testid="button-back-to-loads">
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to All Loads
        </Button>
      </div>
    );
  }
  
  const load = detailedLoad;

  const handleUpdateStatus = () => {
    updateLoadStatus(loadId, selectedStatus);
    setIsStatusModalOpen(false);
    toast({
      title: "Status Updated",
      description: `Load status changed to ${selectedStatus}`,
    });
  };

  const handleReassignCarrier = () => {
    const carrier = carriers.find(c => c.carrierId === selectedCarrierId);
    if (carrier) {
      assignCarrier(loadId, carrier.carrierId, carrier.companyName);
      setIsReassignModalOpen(false);
      toast({
        title: "Carrier Reassigned",
        description: `${carrier.companyName} has been assigned to this load`,
      });
    }
  };

  const handleCancelLoad = () => {
    cancelLoad(loadId);
    setIsCancelModalOpen(false);
    toast({
      title: "Load Cancelled",
      description: "This load has been cancelled",
      variant: "destructive",
    });
  };

  const handleAddNote = () => {
    if (adminNote.trim()) {
      addAdminNote(loadId, adminNote);
      setAdminNote("");
      toast({
        title: "Note Added",
        description: "Admin note has been saved",
      });
    }
  };

  const handleSyncPortal = () => {
    refreshFromShipperPortal();
    toast({
      title: "Synced",
      description: "Data synchronized with Shipper Portal",
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
      "Active": { variant: "default", className: "bg-blue-500" },
      "Bidding": { variant: "secondary", className: "bg-amber-500 text-white" },
      "Assigned": { variant: "default", className: "bg-indigo-500" },
      "En Route": { variant: "default", className: "bg-emerald-500" },
      "Delivered": { variant: "default", className: "bg-green-600" },
      "Cancelled": { variant: "destructive", className: "" },
      "Pending": { variant: "outline", className: "" },
    };
    const config = variants[status] || variants["Pending"];
    return <Badge className={config.className}>{status}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "Critical": return <Badge variant="destructive">Critical</Badge>;
      case "High": return <Badge className="bg-amber-500 text-white">High Priority</Badge>;
      default: return <Badge variant="outline">Normal</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setLocation("/admin/loads")}
            data-testid="button-back-to-loads"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold" data-testid="text-load-id">{detailedLoad.loadId}</h1>
              {apiLoad?.pickupId && (
                <Badge variant="secondary" className="font-mono text-xs" data-testid="badge-pickup-id">
                  Pickup: {apiLoad.pickupId}
                </Badge>
              )}
              {getStatusBadge(detailedLoad.status)}
              {getPriorityBadge(detailedLoad.priority || "Normal")}
            </div>
            <p className="text-muted-foreground">{detailedLoad.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={handleSyncPortal} data-testid="button-sync-portal">
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync Portal
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button data-testid="button-actions">
                Actions
                <MoreHorizontal className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsStatusModalOpen(true)} data-testid="menu-update-status">
                <Edit className="h-4 w-4 mr-2" />
                Update Status
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsReassignModalOpen(true)} data-testid="menu-reassign-carrier">
                <UserPlus className="h-4 w-4 mr-2" />
                Reassign Carrier
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setIsCancelModalOpen(true)} 
                className="text-destructive"
                data-testid="menu-cancel-load"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancel Load
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-4 lg:grid-cols-8 gap-1">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="shipper" data-testid="tab-shipper">Shipper</TabsTrigger>
          <TabsTrigger value="carrier" data-testid="tab-carrier">Carrier</TabsTrigger>
          <TabsTrigger value="route" data-testid="tab-route">Route</TabsTrigger>
          <TabsTrigger value="bids" data-testid="tab-bids">Bids</TabsTrigger>
          <TabsTrigger value="costs" data-testid="tab-costs">Costs</TabsTrigger>
          <TabsTrigger value="documents" data-testid="tab-documents">Documents</TabsTrigger>
          <TabsTrigger value="activity" data-testid="tab-activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Load Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium">{detailedLoad.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Category</span>
                  <span className="font-medium">{detailedLoad.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-medium">{format(detailedLoad.createdDate, "dd MMM yyyy")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Priority</span>
                  {getPriorityBadge(detailedLoad.priority || "Normal")}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Route Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-green-500" />
                  <span className="text-muted-foreground">From:</span>
                  <span className="font-medium">{detailedLoad.pickup}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-red-500" />
                  <span className="text-muted-foreground">To:</span>
                  <span className="font-medium">{detailedLoad.drop}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Distance</span>
                  <span className="font-medium">{detailedLoad.distance} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ETA</span>
                  <span className="font-medium">{detailedLoad.eta || detailedLoad.routeInfo.estimatedTime}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Load Specifications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Weight className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Weight:</span>
                  <span className="font-medium">{detailedLoad.weight.toLocaleString()} {detailedLoad.weightUnit}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Ruler className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Dimensions:</span>
                  <span className="font-medium">{detailedLoad.dimensions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Truck Type</span>
                  <span className="font-medium">{detailedLoad.requiredTruckType}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {detailedLoad.description && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{detailedLoad.description}</p>
                {detailedLoad.specialHandling && (
                  <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-md border border-amber-200 dark:border-amber-900">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-medium">Special Handling:</span>
                    </div>
                    <p className="text-sm text-amber-600 dark:text-amber-500 mt-1">{detailedLoad.specialHandling}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Admin Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Textarea 
                  placeholder="Add a note about this load..."
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  className="flex-1"
                  data-testid="input-admin-note"
                />
                <Button onClick={handleAddNote} disabled={!adminNote.trim()} data-testid="button-add-note">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shipper" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>{apiLoad?.shipperContactName || detailedLoad.shipperDetails.name}</CardTitle>
                    <CardDescription>{apiLoad?.shipperCompanyName || detailedLoad.shipperDetails.company}</CardDescription>
                  </div>
                </div>
                {apiLoad?.shipper?.isVerified || detailedLoad.shipperDetails.isVerified ? (
                  <Badge className="bg-green-500"><BadgeCheck className="h-3 w-3 mr-1" />Verified</Badge>
                ) : (
                  <Badge variant="outline">Unverified</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{apiLoad?.shipperPhone || detailedLoad.shipperDetails.phone}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{apiLoad?.shipper?.email || detailedLoad.shipperDetails.email}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{apiLoad?.shipperCompanyAddress || detailedLoad.shipperDetails.address}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Load ID</span>
                    <span className="font-medium font-mono" data-testid="text-shipper-load-id">
                      {`LD-${String(apiLoad?.shipperLoadNumber || 0).padStart(3, '0')}`}
                    </span>
                  </div>
                  {apiLoad?.pickupId && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Pickup ID</span>
                      <Badge variant="outline" className="font-mono" data-testid="text-pickup-id">
                        {apiLoad.pickupId}
                      </Badge>
                    </div>
                  )}
                  {apiLoad?.shipper?.isVerified !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Shipper Status</span>
                      <Badge variant={apiLoad.shipper.isVerified ? "default" : "outline"}>
                        {apiLoad.shipper.isVerified ? "Verified" : "Pending"}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" data-testid="button-call-shipper">
                  <Phone className="h-4 w-4 mr-2" />
                  Call Shipper
                </Button>
                <Button variant="outline" data-testid="button-email-shipper">
                  <Mail className="h-4 w-4 mr-2" />
                  Email Shipper
                </Button>
                <Button variant="outline" onClick={() => setLocation(`/admin/users`)} data-testid="button-view-profile">
                  <User className="h-4 w-4 mr-2" />
                  View Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="carrier" className="space-y-4">
          {(apiLoad?.assignedCarrier || detailedLoad.carrierDetails) ? (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Truck className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle>{apiLoad?.assignedCarrier?.company || detailedLoad.carrierDetails?.companyName || "Assigned Carrier"}</CardTitle>
                        <CardDescription>Assigned Carrier</CardDescription>
                      </div>
                    </div>
                    <Badge className={(apiLoad?.assignedCarrier?.isVerified || detailedLoad.carrierDetails?.verificationStatus === "verified") ? "bg-green-500" : ""}>
                      {apiLoad?.assignedCarrier?.isVerified ? "verified" : (detailedLoad.carrierDetails?.verificationStatus || "pending")}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{apiLoad?.assignedCarrier?.phone || detailedLoad.carrierDetails?.contactNumber || "Not available"}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{apiLoad?.assignedCarrier?.email || "Not available"}</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {apiLoad?.assignedCarrier?.username && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Contact Name</span>
                          <span className="font-medium">{apiLoad.assignedCarrier.username}</span>
                        </div>
                      )}
                      {detailedLoad.carrierDetails?.fleetSize && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Fleet Size</span>
                          <span className="font-medium">{detailedLoad.carrierDetails.fleetSize} vehicles</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {detailedLoad.vehicleDetails && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Assigned Vehicle</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Truck Type</span>
                          <span className="font-medium">{detailedLoad.vehicleDetails.truckType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Vehicle Number</span>
                          <span className="font-medium font-mono">{detailedLoad.vehicleDetails.vehicleNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Capacity</span>
                          <span className="font-medium">{detailedLoad.vehicleDetails.capacity}</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Driver Name</span>
                          <span className="font-medium">{detailedLoad.vehicleDetails.driverName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Driver Phone</span>
                          <span className="font-medium">{detailedLoad.vehicleDetails.driverPhone}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">License</span>
                          <span className="font-medium font-mono text-sm">{detailedLoad.vehicleDetails.driverLicense}</span>
                        </div>
                      </div>
                    </div>
                    <Separator className="my-4" />
                    <div className="flex gap-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        <span className="text-sm text-muted-foreground">RC Status:</span>
                        <Badge variant={detailedLoad.vehicleDetails.rcStatus === "Valid" ? "default" : "destructive"}>
                          {detailedLoad.vehicleDetails.rcStatus}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        <span className="text-sm text-muted-foreground">Insurance:</span>
                        <Badge variant={detailedLoad.vehicleDetails.insuranceStatus === "Valid" ? "default" : "destructive"}>
                          {detailedLoad.vehicleDetails.insuranceStatus}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Carrier Assigned</h3>
                <p className="text-muted-foreground mb-4">This load has not been assigned to a carrier yet.</p>
                <Button onClick={() => setIsReassignModalOpen(true)} data-testid="button-assign-carrier">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Assign Carrier
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="route" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Route Tracking</CardTitle>
              <CardDescription>Live status and route information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Navigation className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Live Status</p>
                    <p className="text-sm text-muted-foreground">{detailedLoad.routeInfo.liveStatus}</p>
                  </div>
                </div>
                <Badge className="text-lg py-1 px-3">{detailedLoad.routeInfo.estimatedTime}</Badge>
              </div>

              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                {detailedLoad.routeInfo.checkpoints.map((checkpoint, idx) => (
                  <div key={idx} className="relative flex items-start gap-4 pb-6 last:pb-0">
                    <div className={`relative z-10 h-8 w-8 rounded-full flex items-center justify-center ${
                      checkpoint.status === "passed" ? "bg-green-500 text-white" :
                      checkpoint.status === "current" ? "bg-primary text-primary-foreground animate-pulse" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {checkpoint.status === "passed" ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : checkpoint.status === "current" ? (
                        <CircleDot className="h-4 w-4" />
                      ) : (
                        <span className="text-xs">{idx + 1}</span>
                      )}
                    </div>
                    <div className="flex-1 pt-1">
                      <p className="font-medium">{checkpoint.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {checkpoint.status === "passed" ? "Completed" : 
                         checkpoint.status === "current" ? "Current Location" : "Upcoming"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 md:grid-cols-2 pt-4">
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Distance</p>
                  <p className="text-2xl font-bold">{detailedLoad.distance} km</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Estimated Time</p>
                  <p className="text-2xl font-bold">{detailedLoad.routeInfo.estimatedTime}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bids" className="space-y-4">
          {/* Dual Marketplace Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Bids</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-bids">{allBids.length}</div>
                <p className="text-xs text-muted-foreground">From all carriers</p>
              </CardContent>
            </Card>
            <Card className="border-orange-200 dark:border-orange-800">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-medium">Solo Driver Bids</CardTitle>
                  <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700">Solo</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-solo-bids">{soloBidsFiltered.length}</div>
                {soloBidsFiltered.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Lowest: {formatCurrency(Math.min(...soloBidsFiltered.map(b => b.amount)))}
                  </p>
                )}
              </CardContent>
            </Card>
            <Card className="border-blue-200 dark:border-blue-800">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-medium">Enterprise Bids</CardTitle>
                  <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700">Enterprise</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-enterprise-bids">{enterpriseBidsFiltered.length}</div>
                {enterpriseBidsFiltered.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Lowest: {formatCurrency(Math.min(...enterpriseBidsFiltered.map(b => b.amount)))}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Dual Marketplace Comparison View */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Solo Driver Marketplace */}
            <Card className="border-orange-200 dark:border-orange-800">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-orange-600" />
                    <CardTitle>Solo Driver Marketplace</CardTitle>
                  </div>
                  <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700">
                    {soloBidsFiltered.length} bids
                  </Badge>
                </div>
                <CardDescription>Owner-operators with single trucks</CardDescription>
              </CardHeader>
              <CardContent>
                {soloBidsFiltered.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No solo driver bids yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Driver</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Submitted</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {soloBidsFiltered
                        .sort((a, b) => a.amount - b.amount)
                        .map((bid) => (
                          <TableRow key={bid.bidId} data-testid={`row-solo-bid-${bid.bidId}`}>
                            <TableCell className="font-medium">{bid.carrierName}</TableCell>
                            <TableCell className="font-semibold">{formatCurrency(bid.amount)}</TableCell>
                            <TableCell>
                              <Badge variant={
                                bid.status === "Accepted" ? "default" :
                                bid.status === "Rejected" ? "destructive" :
                                "outline"
                              }>
                                {bid.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{format(bid.submittedAt, "dd MMM, HH:mm")}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Enterprise Carrier Marketplace */}
            <Card className="border-blue-200 dark:border-blue-800">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    <CardTitle>Enterprise Marketplace</CardTitle>
                  </div>
                  <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700">
                    {enterpriseBidsFiltered.length} bids
                  </Badge>
                </div>
                <CardDescription>Fleet operators with multiple trucks</CardDescription>
              </CardHeader>
              <CardContent>
                {enterpriseBidsFiltered.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No enterprise bids yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Submitted</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {enterpriseBidsFiltered
                        .sort((a, b) => a.amount - b.amount)
                        .map((bid) => (
                          <TableRow key={bid.bidId} data-testid={`row-enterprise-bid-${bid.bidId}`}>
                            <TableCell className="font-medium">{bid.carrierName}</TableCell>
                            <TableCell className="font-semibold">{formatCurrency(bid.amount)}</TableCell>
                            <TableCell>
                              <Badge variant={
                                bid.status === "Accepted" ? "default" :
                                bid.status === "Rejected" ? "destructive" :
                                "outline"
                              }>
                                {bid.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{format(bid.submittedAt, "dd MMM, HH:mm")}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Combined Bid History Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Bids - Combined View</CardTitle>
                  <CardDescription>Complete bid history from both marketplaces</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Carrier</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allBids.map((bid) => (
                    <TableRow key={bid.bidId} data-testid={`row-bid-${bid.bidId}`}>
                      <TableCell className="font-medium">{bid.carrierName}</TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={bid.carrierType === "solo" 
                            ? "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700" 
                            : "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700"
                          }
                          data-testid={`badge-carrier-type-${bid.bidId}`}
                        >
                          {bid.carrierType === "solo" ? "Solo" : "Enterprise"}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(bid.amount)}</TableCell>
                      <TableCell>
                        <Badge variant={
                          bid.status === "Accepted" ? "default" :
                          bid.status === "Rejected" ? "destructive" :
                          "outline"
                        }>
                          {bid.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(bid.submittedAt, "dd MMM, HH:mm")}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{bid.notes || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {detailedLoad.negotiations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Negotiation Chat Log</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-4">
                    {detailedLoad.negotiations.map((msg) => (
                      <div key={msg.messageId} className={`flex ${msg.senderType === "shipper" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[70%] p-3 rounded-lg ${
                          msg.senderType === "shipper" 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-muted"
                        }`}>
                          <p className="text-xs font-medium mb-1 opacity-70">{msg.senderName}</p>
                          <p className="text-sm">{msg.message}</p>
                          <p className="text-xs opacity-50 mt-1">{format(msg.timestamp, "HH:mm")}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="costs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cost Breakdown</CardTitle>
              <CardDescription>Financial details for this shipment</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Base Freight Cost</span>
                  <span className="font-medium">{formatCurrency(detailedLoad.costBreakdown.baseFreightCost)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Fuel Surcharge</span>
                  <span className="font-medium">{formatCurrency(detailedLoad.costBreakdown.fuelSurcharge)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Handling Fee</span>
                  <span className="font-medium">{formatCurrency(detailedLoad.costBreakdown.handlingFee)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Platform Fee</span>
                  <span className="font-medium">{formatCurrency(detailedLoad.costBreakdown.platformFee)}</span>
                </div>
                <div className="flex justify-between py-3 bg-muted/50 rounded-lg px-3">
                  <span className="font-semibold">Total Cost</span>
                  <span className="font-bold text-lg">{formatCurrency(detailedLoad.costBreakdown.totalCost)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Documents</CardTitle>
                  <CardDescription>{detailedLoad.documents.length} documents uploaded</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {detailedLoad.documents.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Uploaded By</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailedLoad.documents.map((doc) => (
                      <TableRow key={doc.documentId}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            {doc.name}
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline">{doc.type}</Badge></TableCell>
                        <TableCell>{doc.uploadedBy}</TableCell>
                        <TableCell>{format(doc.uploadedAt, "dd MMM yyyy")}</TableCell>
                        <TableCell>
                          <Badge variant={
                            doc.status === "Approved" ? "default" :
                            doc.status === "Rejected" ? "destructive" :
                            "outline"
                          }>
                            {doc.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" data-testid={`button-view-doc-${doc.documentId}`}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" data-testid={`button-download-doc-${doc.documentId}`}>
                              <Download className="h-4 w-4" />
                            </Button>
                            {doc.status === "Pending" && (
                              <>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="text-green-600"
                                  onClick={() => {
                                    approveDocument(loadId, doc.documentId);
                                    toast({ title: "Document Approved" });
                                  }}
                                  data-testid={`button-approve-doc-${doc.documentId}`}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="text-red-600"
                                  onClick={() => {
                                    rejectDocument(loadId, doc.documentId);
                                    toast({ title: "Document Rejected", variant: "destructive" });
                                  }}
                                  data-testid={`button-reject-doc-${doc.documentId}`}
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
                <div className="py-12 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Documents</h3>
                  <p className="text-muted-foreground">No documents have been uploaded for this load yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
              <CardDescription>Complete audit trail for this load</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                {detailedLoad.activityLog.map((event, idx) => (
                  <div key={event.eventId} className="relative flex items-start gap-4 pb-6 last:pb-0">
                    <div className={`relative z-10 h-8 w-8 rounded-full flex items-center justify-center ${
                      event.type === "delivered" ? "bg-green-500 text-white" :
                      event.type === "carrier_assigned" ? "bg-blue-500 text-white" :
                      event.type === "created" ? "bg-primary text-primary-foreground" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      <Clock className="h-4 w-4" />
                    </div>
                    <div className="flex-1 pt-1">
                      <p className="font-medium">{event.description}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{format(event.timestamp, "dd MMM yyyy, HH:mm")}</span>
                        {event.userName && (
                          <>
                            <span>by</span>
                            <span className="font-medium">{event.userName}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Load Status</DialogTitle>
            <DialogDescription>Change the status of this load</DialogDescription>
          </DialogHeader>
          <Select value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as AdminLoad["status"])}>
            <SelectTrigger data-testid="select-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Bidding">Bidding</SelectItem>
              <SelectItem value="Assigned">Assigned</SelectItem>
              <SelectItem value="En Route">En Route</SelectItem>
              <SelectItem value="Delivered">Delivered</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStatusModalOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateStatus} data-testid="button-confirm-status">Update Status</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isReassignModalOpen} onOpenChange={setIsReassignModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign Carrier</DialogTitle>
            <DialogDescription>Select a new carrier for this load</DialogDescription>
          </DialogHeader>
          <Select value={selectedCarrierId} onValueChange={setSelectedCarrierId}>
            <SelectTrigger data-testid="select-carrier">
              <SelectValue placeholder="Select a carrier" />
            </SelectTrigger>
            <SelectContent>
              {carriers.filter(c => c.verificationStatus === "verified").slice(0, 20).map((carrier) => (
                <SelectItem key={carrier.carrierId} value={carrier.carrierId}>
                  {carrier.companyName} (Rating: {carrier.rating})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReassignModalOpen(false)}>Cancel</Button>
            <Button onClick={handleReassignCarrier} disabled={!selectedCarrierId} data-testid="button-confirm-reassign">
              Assign Carrier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Load</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this load? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCancelModalOpen(false)}>Keep Load</Button>
            <Button variant="destructive" onClick={handleCancelLoad} data-testid="button-confirm-cancel">
              Cancel Load
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
