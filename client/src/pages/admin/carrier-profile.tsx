import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { format } from "date-fns";
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MapPin,
  Star,
  Shield,
  ShieldCheck,
  ShieldX,
  ShieldAlert,
  Truck,
  FileText,
  TrendingUp,
  TrendingDown,
  Minus,
  Package,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  Edit,
  Ban,
  RefreshCw,
  MessageSquare,
  Download,
  Eye,
  Calendar,
  Users,
  Activity,
  BarChart3,
  Route,
  Percent,
  Timer,
  ThumbsUp,
  ThumbsDown,
  ArrowUpRight,
  Fuel,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { 
  useAdminData, 
  type DetailedCarrier,
  type CarrierTruck,
  type CarrierDocument,
  type CarrierAssignedLoad,
} from "@/lib/admin-data-store";

function formatRupees(amount: number): string {
  if (amount >= 10000000) {
    return `Rs. ${(amount / 10000000).toFixed(2)} Cr`;
  } else if (amount >= 100000) {
    return `Rs. ${(amount / 100000).toFixed(2)} L`;
  } else {
    return `Rs. ${amount.toLocaleString("en-IN")}`;
  }
}

function getStatusBadgeColor(status: string): string {
  switch (status) {
    case "verified": return "bg-green-500/10 text-green-600 border-green-200";
    case "pending": return "bg-yellow-500/10 text-yellow-600 border-yellow-200";
    case "rejected": return "bg-red-500/10 text-red-600 border-red-200";
    case "expired": return "bg-orange-500/10 text-orange-600 border-orange-200";
    default: return "bg-gray-500/10 text-gray-600 border-gray-200";
  }
}

function getDocStatusColor(status: string): string {
  switch (status) {
    case "Valid": return "bg-green-500/10 text-green-600";
    case "Expired": return "bg-red-500/10 text-red-600";
    case "Missing": return "bg-yellow-500/10 text-yellow-600";
    default: return "bg-gray-500/10 text-gray-600";
  }
}

function getActivityColor(level: string): string {
  switch (level) {
    case "high": return "bg-green-500/10 text-green-600";
    case "medium": return "bg-blue-500/10 text-blue-600";
    case "low": return "bg-orange-500/10 text-orange-600";
    default: return "bg-gray-500/10 text-gray-600";
  }
}

export default function CarrierProfilePage() {
  const [, params] = useRoute("/admin/carriers/:carrierId");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { 
    getDetailedCarrier, 
    verifyCarrier, 
    rejectCarrier, 
    suspendCarrier, 
    reactivateCarrier,
    addCarrierNote,
    invalidateCarrierDocument,
    refreshFromShipperPortal 
  } = useAdminData();

  const [carrier, setCarrier] = useState<DetailedCarrier | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [adminNote, setAdminNote] = useState("");
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const carrierId = params?.carrierId;

  useEffect(() => {
    if (carrierId) {
      const data = getDetailedCarrier(carrierId);
      setCarrier(data);
      setIsLoading(false);
    }
  }, [carrierId, getDetailedCarrier]);

  const handleSync = () => {
    refreshFromShipperPortal();
    if (carrierId) {
      const data = getDetailedCarrier(carrierId);
      setCarrier(data);
    }
    toast({ title: "Data Synced", description: "Carrier data synchronized with portal" });
  };

  const handleAddNote = () => {
    if (adminNote.trim() && carrierId) {
      addCarrierNote(carrierId, adminNote);
      const data = getDetailedCarrier(carrierId);
      setCarrier(data);
      setAdminNote("");
      toast({ title: "Note Added", description: "Admin note has been saved" });
    }
  };

  const handleVerify = () => {
    if (carrierId) {
      verifyCarrier(carrierId);
      const data = getDetailedCarrier(carrierId);
      setCarrier(data);
      toast({ title: "Carrier Verified", description: "Carrier has been approved" });
    }
  };

  const handleSuspend = () => {
    if (carrierId) {
      suspendCarrier(carrierId, suspendReason);
      const data = getDetailedCarrier(carrierId);
      setCarrier(data);
      setIsSuspendModalOpen(false);
      setSuspendReason("");
      toast({ title: "Carrier Suspended", description: "Carrier has been suspended" });
    }
  };

  const handleReactivate = () => {
    if (carrierId) {
      reactivateCarrier(carrierId);
      const data = getDetailedCarrier(carrierId);
      setCarrier(data);
      toast({ title: "Carrier Reactivated", description: "Carrier is now active" });
    }
  };

  const handleReject = () => {
    if (carrierId) {
      rejectCarrier(carrierId, rejectReason);
      const data = getDetailedCarrier(carrierId);
      setCarrier(data);
      setIsRejectModalOpen(false);
      setRejectReason("");
      toast({ title: "Carrier Rejected", description: "Carrier verification rejected" });
    }
  };

  const handleInvalidateDocument = (documentId: string) => {
    if (carrierId) {
      invalidateCarrierDocument(carrierId, documentId);
      const data = getDetailedCarrier(carrierId);
      setCarrier(data);
      toast({ title: "Document Invalidated", description: "Document marked as invalid" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!carrier) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => setLocation("/admin/carriers")} data-testid="button-back-to-carriers">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Carriers
        </Button>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold">Carrier Not Found</h2>
          <p className="text-muted-foreground">The carrier you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const getVerificationIcon = () => {
    switch (carrier.verificationStatus) {
      case "verified": return <ShieldCheck className="h-5 w-5 text-green-600" />;
      case "pending": return <ShieldAlert className="h-5 w-5 text-yellow-600" />;
      case "rejected": return <ShieldX className="h-5 w-5 text-red-600" />;
      case "expired": return <Shield className="h-5 w-5 text-orange-600" />;
    }
  };

  const getTrendIcon = () => {
    switch (carrier.performance.performanceTrend) {
      case "up": return <TrendingUp className="h-4 w-4 text-green-600" />;
      case "down": return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/admin/carriers")} data-testid="button-back-to-carriers">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold" data-testid="text-carrier-name">{carrier.companyName}</h1>
              {getVerificationIcon()}
              <Badge className={getStatusBadgeColor(carrier.verificationStatus)} data-testid="badge-verification-status">
                {carrier.verificationStatus}
              </Badge>
              <Badge className={getActivityColor(carrier.activityLevel)}>
                {carrier.activityLevel} activity
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm" data-testid="text-carrier-id">{carrier.carrierId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={handleSync} data-testid="button-sync-portal">
            <RefreshCw className="mr-2 h-4 w-4" />
            Sync Portal
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="default" data-testid="button-actions">
                Actions
                <MoreHorizontal className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {carrier.verificationStatus === "pending" && (
                <DropdownMenuItem onClick={handleVerify} data-testid="menu-verify-carrier">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve Verification
                </DropdownMenuItem>
              )}
              {carrier.verificationStatus === "pending" && (
                <DropdownMenuItem onClick={() => setIsRejectModalOpen(true)} data-testid="menu-reject-carrier">
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject Verification
                </DropdownMenuItem>
              )}
              {carrier.verificationStatus === "verified" && (
                <DropdownMenuItem onClick={() => setIsSuspendModalOpen(true)} data-testid="menu-suspend-carrier">
                  <Ban className="mr-2 h-4 w-4" />
                  Suspend Carrier
                </DropdownMenuItem>
              )}
              {carrier.verificationStatus === "rejected" && (
                <DropdownMenuItem onClick={handleReactivate} data-testid="menu-reactivate-carrier">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reactivate Carrier
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem data-testid="menu-edit-carrier">
                <Edit className="mr-2 h-4 w-4" />
                Edit Details
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-muted-foreground">Rating</span>
            </div>
            <p className="text-2xl font-bold mt-1" data-testid="text-rating">{carrier.rating.toFixed(1)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Fleet Size</span>
            </div>
            <p className="text-2xl font-bold mt-1" data-testid="text-fleet-size">{carrier.fleetSize}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Deliveries</span>
            </div>
            <p className="text-2xl font-bold mt-1" data-testid="text-deliveries">{carrier.completedShipments}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">On-Time</span>
            </div>
            <p className="text-2xl font-bold mt-1" data-testid="text-ontime">{carrier.onTimePercent}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">Avg Response</span>
            </div>
            <p className="text-2xl font-bold mt-1" data-testid="text-response-time">{carrier.avgResponseTime}m</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-indigo-500" />
              <span className="text-sm text-muted-foreground">Reliability</span>
            </div>
            <p className="text-2xl font-bold mt-1" data-testid="text-reliability">{carrier.reliabilityScore}%</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-7 lg:w-auto lg:inline-flex">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="fleet" data-testid="tab-fleet">Fleet</TabsTrigger>
          <TabsTrigger value="documents" data-testid="tab-documents">Documents</TabsTrigger>
          <TabsTrigger value="performance" data-testid="tab-performance">Performance</TabsTrigger>
          <TabsTrigger value="loads" data-testid="tab-loads">Loads</TabsTrigger>
          <TabsTrigger value="financials" data-testid="tab-financials">Financials</TabsTrigger>
          <TabsTrigger value="activity" data-testid="tab-activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Company Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Company Type</p>
                    <p className="font-medium">{carrier.basicInfo.companyType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Year Founded</p>
                    <p className="font-medium">{carrier.basicInfo.yearFounded}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">CIN/Registration</p>
                    <p className="font-medium text-xs">{carrier.basicInfo.cinRegistrationId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">GST Number</p>
                    <p className="font-medium">{carrier.basicInfo.gstNumber}</p>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Registered Address</p>
                  <p className="font-medium">{carrier.basicInfo.registeredAddress}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{carrier.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{carrier.phone}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Verification & Compliance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Verification Status</p>
                    <Badge className={`${getStatusBadgeColor(carrier.verificationStatus)} mt-1`}>
                      {carrier.verificationStatus}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Expiry Date</p>
                    <p className="font-medium">{format(carrier.identity.verificationExpiryDate, "MMM d, yyyy")}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Compliance Level</p>
                    <Badge className={
                      carrier.identity.complianceLevel === "High" ? "bg-green-500/10 text-green-600" :
                      carrier.identity.complianceLevel === "Medium" ? "bg-yellow-500/10 text-yellow-600" :
                      "bg-red-500/10 text-red-600"
                    }>
                      {carrier.identity.complianceLevel}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Risk Score</p>
                    <p className="font-medium">{carrier.identity.riskScore}/100</p>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Member Since</p>
                  <p className="font-medium">{format(carrier.dateJoined, "MMMM d, yyyy")}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Route className="h-5 w-5" />
                  Service Coverage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Coverage Level</p>
                  <Badge className="bg-blue-500/10 text-blue-600 mt-1">
                    {carrier.serviceZoneDetails.coverageLevel}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Active Regions</p>
                  <div className="flex flex-wrap gap-2">
                    {carrier.serviceZones.slice(0, 6).map((zone, idx) => (
                      <Badge key={idx} variant="outline">{zone}</Badge>
                    ))}
                    {carrier.serviceZones.length > 6 && (
                      <Badge variant="outline">+{carrier.serviceZones.length - 6} more</Badge>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Top Lanes</p>
                  {carrier.serviceZoneDetails.highFrequencyLanes.slice(0, 3).map((lane, idx) => (
                    <div key={idx} className="flex items-center justify-between py-1">
                      <span className="text-sm">{lane.origin} - {lane.destination}</span>
                      <span className="text-sm text-muted-foreground">{lane.frequency} trips</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Ratings & Reviews
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-4xl font-bold">{carrier.ratingBreakdown.overall.toFixed(1)}</p>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${star <= Math.round(carrier.ratingBreakdown.overall) ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{carrier.reviews.length} reviews</p>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div>
                      <div className="flex justify-between text-sm">
                        <span>Communication</span>
                        <span>{carrier.ratingBreakdown.communication.toFixed(1)}</span>
                      </div>
                      <Progress value={carrier.ratingBreakdown.communication * 20} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm">
                        <span>Reliability</span>
                        <span>{carrier.ratingBreakdown.reliability.toFixed(1)}</span>
                      </div>
                      <Progress value={carrier.ratingBreakdown.reliability * 20} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm">
                        <span>Consistency</span>
                        <span>{carrier.ratingBreakdown.consistency.toFixed(1)}</span>
                      </div>
                      <Progress value={carrier.ratingBreakdown.consistency * 20} className="h-2" />
                    </div>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Recent Review</p>
                  {carrier.reviews[0] && (
                    <div className="p-3 bg-muted/50 rounded-md">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{carrier.reviews[0].shipperName}</span>
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                          <span className="text-sm">{carrier.reviews[0].rating.toFixed(1)}</span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{carrier.reviews[0].comment}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Health Indicators
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Last Active</p>
                    <p className="font-medium">{format(carrier.healthIndicators.lastActiveDate, "MMM d, h:mm a")}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Churn Probability</p>
                    <p className={`font-medium ${carrier.healthIndicators.churnProbability > 50 ? "text-red-600" : carrier.healthIndicators.churnProbability > 20 ? "text-yellow-600" : "text-green-600"}`}>
                      {carrier.healthIndicators.churnProbability}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Expiring Documents</p>
                    <p className={`font-medium ${carrier.healthIndicators.expiringDocuments > 0 ? "text-orange-600" : "text-green-600"}`}>
                      {carrier.healthIndicators.expiringDocuments}
                    </p>
                  </div>
                </div>
                {carrier.healthIndicators.riskAlerts.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Risk Alerts</p>
                      <div className="space-y-2">
                        {carrier.healthIndicators.riskAlerts.map((alert, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm text-orange-600">
                            <AlertTriangle className="h-4 w-4" />
                            {alert}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Admin Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Add a note about this carrier..."
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  data-testid="input-admin-note"
                />
                <Button onClick={handleAddNote} disabled={!adminNote.trim()} data-testid="button-add-note">
                  Add Note
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="fleet" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Fleet Composition</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(carrier.fleetComposition).map(([type, count]) => {
                    if (count === 0) return null;
                    const typeLabels: Record<string, string> = {
                      miniTruck: "Mini-truck",
                      pickup: "Pickup",
                      container20ft: "20ft Container",
                      container32ft: "32ft Container",
                      flatbed: "Flatbed",
                      trailer: "Trailer",
                      reefer: "Reefer/Cold",
                      tanker: "Tanker",
                    };
                    return (
                      <div key={type} className="flex items-center justify-between">
                        <span className="text-sm">{typeLabels[type] || type}</span>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fleet Utilization</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Active Trucks</span>
                    <span>{carrier.fleetUtilization.activePercentage}%</span>
                  </div>
                  <Progress value={carrier.fleetUtilization.activePercentage} className="h-2" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Trip Length</p>
                    <p className="font-medium">{carrier.fleetUtilization.avgTripLength} km</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Acceptance Rate</p>
                    <p className="font-medium">{carrier.fleetUtilization.avgLoadAcceptanceRate}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fleet Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Trucks</span>
                    <span className="font-medium">{carrier.fleetSize}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Active</span>
                    <Badge className="bg-green-500/10 text-green-600">
                      {carrier.trucks.filter(t => t.isActive).length}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Inactive</span>
                    <Badge className="bg-gray-500/10 text-gray-600">
                      {carrier.trucks.filter(t => !t.isActive).length}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Docs Expired</span>
                    <Badge className="bg-red-500/10 text-red-600">
                      {carrier.trucks.filter(t => t.rcStatus === "Expired" || t.insuranceStatus === "Expired").length}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Truck Records</CardTitle>
              <CardDescription>All vehicles in the fleet</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Truck Number</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>RC</TableHead>
                      <TableHead>Insurance</TableHead>
                      <TableHead>Fitness</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {carrier.trucks.slice(0, 10).map((truck) => (
                      <TableRow key={truck.truckId} data-testid={`row-truck-${truck.truckId}`}>
                        <TableCell className="font-mono">{truck.truckNumber}</TableCell>
                        <TableCell>{truck.type}</TableCell>
                        <TableCell>{truck.model}</TableCell>
                        <TableCell>{truck.capacity}</TableCell>
                        <TableCell>
                          {truck.driverAssigned ? (
                            <div>
                              <p className="text-sm">{truck.driverAssigned}</p>
                              <p className="text-xs text-muted-foreground">{truck.driverPhone}</p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={getDocStatusColor(truck.rcStatus)}>{truck.rcStatus}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getDocStatusColor(truck.insuranceStatus)}>{truck.insuranceStatus}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getDocStatusColor(truck.fitnessStatus)}>{truck.fitnessStatus}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={truck.isActive ? "bg-green-500/10 text-green-600" : "bg-gray-500/10 text-gray-600"}>
                            {truck.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {carrier.trucks.length > 10 && (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    Showing 10 of {carrier.trucks.length} trucks
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Company Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {carrier.documents.filter(d => d.category === "Company").map((doc) => (
                    <div key={doc.documentId} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{doc.type}</p>
                          <p className="text-xs text-muted-foreground">{doc.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getDocStatusColor(doc.status)}>{doc.status}</Badge>
                        <Button size="icon" variant="ghost">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Document Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Documents</span>
                    <span className="font-medium">{carrier.documents.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Valid</span>
                    <Badge className="bg-green-500/10 text-green-600">
                      {carrier.documents.filter(d => d.status === "Valid").length}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Expired</span>
                    <Badge className="bg-red-500/10 text-red-600">
                      {carrier.documents.filter(d => d.status === "Expired").length}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Missing</span>
                    <Badge className="bg-yellow-500/10 text-yellow-600">
                      {carrier.documents.filter(d => d.status === "Missing").length}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Fleet Documents</CardTitle>
              <CardDescription>Vehicle-specific documents (RC, Insurance, Fitness)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document Type</TableHead>
                      <TableHead>File Name</TableHead>
                      <TableHead>Truck ID</TableHead>
                      <TableHead>Upload Date</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {carrier.documents.filter(d => d.category === "Fleet").map((doc) => (
                      <TableRow key={doc.documentId}>
                        <TableCell>{doc.type}</TableCell>
                        <TableCell className="text-sm">{doc.name}</TableCell>
                        <TableCell className="font-mono text-xs">{doc.truckId}</TableCell>
                        <TableCell>{format(doc.uploadDate, "MMM d, yyyy")}</TableCell>
                        <TableCell>
                          {doc.expiryDate ? format(doc.expiryDate, "MMM d, yyyy") : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge className={getDocStatusColor(doc.status)}>{doc.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost">
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost"
                              onClick={() => handleInvalidateDocument(doc.documentId)}
                            >
                              <XCircle className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6 mt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">On-Time Delivery</p>
                    <p className="text-2xl font-bold">{carrier.performance.onTimeDeliveryRate}%</p>
                  </div>
                  {getTrendIcon()}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div>
                  <p className="text-sm text-muted-foreground">Load Acceptance</p>
                  <p className="text-2xl font-bold">{carrier.performance.loadAcceptanceRate}%</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Response Time</p>
                  <p className="text-2xl font-bold">{carrier.performance.avgResponseTimeMinutes} min</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div>
                  <p className="text-sm text-muted-foreground">Cancellation Rate</p>
                  <p className="text-2xl font-bold">{carrier.performance.cancellationRate}%</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Behavior Insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Preferred Load Types</p>
                  <div className="flex flex-wrap gap-2">
                    {carrier.behaviorInsights.preferredLoadTypes.map((type, idx) => (
                      <Badge key={idx} variant="outline">{type}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Preferred Regions</p>
                  <div className="flex flex-wrap gap-2">
                    {carrier.behaviorInsights.preferredRegions.map((region, idx) => (
                      <Badge key={idx} variant="outline">{region}</Badge>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Peak Hours</p>
                    <p className="font-medium">{carrier.behaviorInsights.peakOperatingHours}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Repeat Business</p>
                    <p className="font-medium">{carrier.behaviorInsights.repeatBusinessRatio}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Frequent Shippers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {carrier.frequentShippers.slice(0, 5).map((shipper, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{shipper.shipperName}</span>
                      </div>
                      <Badge variant="outline">{shipper.loadCount} loads</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {carrier.reviews.slice(0, 5).map((review) => (
                  <div key={review.reviewId} className="p-4 bg-muted/50 rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{review.shipperName}</span>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-3 w-3 ${star <= Math.round(review.rating) ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`}
                            />
                          ))}
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground">{format(review.date, "MMM d, yyyy")}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{review.comment}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="loads" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Current Loads</CardTitle>
              <CardDescription>Active and in-progress loads</CardDescription>
            </CardHeader>
            <CardContent>
              {carrier.currentLoads.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No current loads</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Load ID</TableHead>
                        <TableHead>Shipper</TableHead>
                        <TableHead>Route</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Earnings</TableHead>
                        <TableHead>ETA</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {carrier.currentLoads.map((load) => (
                        <TableRow 
                          key={load.loadId} 
                          className="cursor-pointer"
                          onClick={() => setLocation(`/admin/loads/${load.loadId}`)}
                        >
                          <TableCell className="font-mono">{load.loadId}</TableCell>
                          <TableCell>{load.shipperName}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-green-500" />
                              <span className="text-sm">{load.pickup}</span>
                              <span className="text-muted-foreground">-</span>
                              <MapPin className="h-3 w-3 text-red-500" />
                              <span className="text-sm">{load.drop}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge>{load.status}</Badge>
                          </TableCell>
                          <TableCell>{formatRupees(load.earnings)}</TableCell>
                          <TableCell>{load.eta || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Past Loads</CardTitle>
              <CardDescription>Last 20 completed loads</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Load ID</TableHead>
                      <TableHead>Shipper</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Performance</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Earnings</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {carrier.pastLoads.map((load) => (
                      <TableRow key={load.loadId}>
                        <TableCell className="font-mono">{load.loadId}</TableCell>
                        <TableCell>{load.shipperName}</TableCell>
                        <TableCell>
                          <span className="text-sm">{load.pickup} - {load.drop}</span>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            load.deliveryPerformance === "On-Time" ? "bg-green-500/10 text-green-600" :
                            load.deliveryPerformance === "Early" ? "bg-blue-500/10 text-blue-600" :
                            "bg-orange-500/10 text-orange-600"
                          }>
                            {load.deliveryPerformance}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {load.rating && (
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                              <span>{load.rating.toFixed(1)}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{formatRupees(load.earnings)}</TableCell>
                        <TableCell>{format(load.assignedDate, "MMM d, yyyy")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financials" className="space-y-6 mt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold">{formatRupees(carrier.financials.totalRevenueGenerated)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div>
                  <p className="text-sm text-muted-foreground">Last 12 Months</p>
                  <p className="text-2xl font-bold">{formatRupees(carrier.financials.last12MonthsVolume)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Trip Cost</p>
                  <p className="text-2xl font-bold">{formatRupees(carrier.financials.avgTripCost)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div>
                  <p className="text-sm text-muted-foreground">Settlement Cycle</p>
                  <p className="text-2xl font-bold">{carrier.financials.settlementCycle} days</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Payment Behavior</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Payment Status</span>
                  <Badge className={
                    carrier.financials.paymentBehavior === "Timely" ? "bg-green-500/10 text-green-600" :
                    carrier.financials.paymentBehavior === "Mixed" ? "bg-yellow-500/10 text-yellow-600" :
                    "bg-red-500/10 text-red-600"
                  }>
                    {carrier.financials.paymentBehavior}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Settlement Cycle</span>
                  <span className="font-medium">{carrier.financials.settlementCycle} days</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Lanes by Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {carrier.financials.topLanesByRevenue.map((lane, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Route className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{lane.origin} - {lane.destination}</span>
                      </div>
                      <span className="font-medium">{formatRupees(lane.revenue)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
              <CardDescription>Recent carrier activities and events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {carrier.activityLog.map((event) => (
                  <div key={event.eventId} className="flex items-start gap-4 p-3 bg-muted/50 rounded-md">
                    <div className={`p-2 rounded-full ${
                      event.type === "verification" ? "bg-green-500/10" :
                      event.type === "document" ? "bg-blue-500/10" :
                      event.type === "load" ? "bg-purple-500/10" :
                      event.type === "performance" ? "bg-yellow-500/10" :
                      event.type === "admin_action" ? "bg-red-500/10" :
                      "bg-gray-500/10"
                    }`}>
                      {event.type === "verification" && <ShieldCheck className="h-4 w-4 text-green-600" />}
                      {event.type === "document" && <FileText className="h-4 w-4 text-blue-600" />}
                      {event.type === "load" && <Package className="h-4 w-4 text-purple-600" />}
                      {event.type === "performance" && <TrendingUp className="h-4 w-4 text-yellow-600" />}
                      {event.type === "admin_action" && <Edit className="h-4 w-4 text-red-600" />}
                      {event.type === "suspension" && <Ban className="h-4 w-4 text-red-600" />}
                      {event.type === "reactivation" && <RefreshCw className="h-4 w-4 text-green-600" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">{event.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {format(event.timestamp, "MMM d, yyyy 'at' h:mm a")}
                        </span>
                        {event.userName && (
                          <>
                            <span className="text-xs text-muted-foreground">by</span>
                            <span className="text-xs font-medium">{event.userName}</span>
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

      <Dialog open={isSuspendModalOpen} onOpenChange={setIsSuspendModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Carrier</DialogTitle>
            <DialogDescription>
              Are you sure you want to suspend {carrier.companyName}? This will prevent them from receiving new loads.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Reason for suspension</label>
              <Textarea
                placeholder="Enter reason..."
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSuspendModalOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleSuspend}>Suspend Carrier</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Verification</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject verification for {carrier.companyName}?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Reason for rejection</label>
              <Textarea
                placeholder="Enter reason..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectModalOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject}>Reject Verification</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
