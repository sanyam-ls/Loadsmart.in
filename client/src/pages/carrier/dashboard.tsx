import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Truck, DollarSign, Package, Clock, TrendingUp, Route, Plus, ArrowRight, Star, MapPin, User, Info, Loader2, CheckCircle, XCircle, FileText, ShieldCheck, ShieldX, ShieldAlert, Eye, Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/stat-card";
import { useAuth } from "@/lib/auth-context";
import { useTrucks, useLoads, useShipments } from "@/lib/api-hooks";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { connectMarketplace, onMarketplaceEvent, offMarketplaceEvent } from "@/lib/marketplace-socket";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer 
} from "recharts";
import type { Truck as TruckType, Load, Shipment } from "@shared/schema";

const formatCurrency = (amount: number): string => {
  if (amount >= 10000000) {
    return `Rs. ${(amount / 10000000).toFixed(2)} Cr`;
  } else if (amount >= 100000) {
    return `Rs. ${(amount / 100000).toFixed(2)} L`;
  } else {
    return `Rs. ${amount.toLocaleString("en-IN")}`;
  }
};

const formatEta = (eta: Date | string): string => {
  const now = new Date();
  const etaDate = new Date(eta);
  const diffMs = etaDate.getTime() - now.getTime();
  const hours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
  const minutes = Math.max(0, Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60)));
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
};

const performanceTooltips = {
  reliability: "Measures on-time pickup and delivery consistency. Based on completed trips vs scheduled times.",
  communication: "Tracks responsiveness to shipper messages and update frequency during trips.",
  onTime: "Percentage of deliveries completed within the promised delivery window.",
  overall: "Weighted average of all performance metrics. Industry benchmark is 4.5/5.0"
};

const getDocumentDisplayName = (docType: string): string => {
  const typeMap: Record<string, string> = {
    rc_book: "RC (Registration Certificate)",
    insurance: "Vehicle Insurance",
    permit: "Commercial Permit",
    pan_card: "PAN Card",
    gst_certificate: "GST Certificate",
    driving_license: "Driving License",
    pollution_certificate: "Pollution Certificate",
    fitness_certificate: "Fitness Certificate",
    other: "Other Document",
  };
  return typeMap[docType] || docType;
};

export default function CarrierDashboard() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [verificationDialogOpen, setVerificationDialogOpen] = useState(false);
  const [hasNewVerificationUpdate, setHasNewVerificationUpdate] = useState(false);
  
  // Fetch verification status
  const { data: verification, refetch: refetchVerification } = useQuery<{
    id: string;
    status: string;
    rejectionReason?: string;
    documents: Array<{
      id: string;
      documentType: string;
      fileName: string;
      fileUrl: string;
      status: string;
      uploadedAt?: string;
      rejectionReason?: string;
    }>;
    updatedAt?: string;
  }>({
    queryKey: ["/api/carrier/verification"],
  });
  
  // Connect to WebSocket for real-time verification status updates
  useEffect(() => {
    if (user?.id) {
      connectMarketplace("carrier", user.id);
      
      const handleVerificationStatus = (data: { status: string; companyName?: string; reason?: string }) => {
        // Set flag to show notification indicator
        setHasNewVerificationUpdate(true);
        refetchVerification();
        
        if (data.status === "approved") {
          toast({
            title: "Verification Approved!",
            description: "Congratulations! Your carrier account has been verified. You can now bid on loads. Click to view details.",
            duration: 10000,
            action: (
              <Button variant="outline" size="sm" onClick={() => setVerificationDialogOpen(true)}>
                View
              </Button>
            ),
          });
        } else if (data.status === "rejected") {
          toast({
            variant: "destructive",
            title: "Verification Rejected",
            description: data.reason || "Your verification application was rejected. Click to view details.",
            duration: 10000,
            action: (
              <Button variant="outline" size="sm" onClick={() => setVerificationDialogOpen(true)}>
                View
              </Button>
            ),
          });
        }
      };
      
      onMarketplaceEvent("verification_status_changed", handleVerificationStatus);
      
      return () => {
        offMarketplaceEvent("verification_status_changed", handleVerificationStatus);
      };
    }
  }, [user?.id, toast, refetchVerification]);
  
  // Use new stats endpoint for dashboard data
  const { data: dashboardStats, isLoading: statsLoading } = useQuery<{
    activeTruckCount: number;
    totalTruckCount: number;
    availableTruckCount: number;
    pendingBidsCount: number;
    activeTripsCount: number;
    driversEnRoute: number;
    currentMonthRevenue: number;
    completedTripsThisMonth: number;
    totalShipments: number;
    hasRevenueData: boolean;
  }>({
    queryKey: ["/api/carrier/dashboard/stats"],
  });

  const { data: allTrucks } = useTrucks();
  const { data: allLoads, isLoading: loadsLoading } = useLoads();
  const { data: allShipments } = useShipments();

  if (statsLoading || loadsLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Use stats from the API endpoint
  const activeTruckCount = dashboardStats?.activeTruckCount || 0;
  const availableTruckCount = dashboardStats?.availableTruckCount || 0;
  const totalTruckCount = dashboardStats?.totalTruckCount || 0;
  const pendingBidsCount = dashboardStats?.pendingBidsCount || 0;
  const activeTripsCount = dashboardStats?.activeTripsCount || 0;
  const driversEnRoute = dashboardStats?.driversEnRoute || 0;
  const currentMonthRevenue = dashboardStats?.currentMonthRevenue || 0;
  const hasRevenueData = dashboardStats?.hasRevenueData || false;

  const trucks = (allTrucks || []).filter((t: TruckType) => t.carrierId === user?.id);
  const loads = allLoads || [];
  const shipments = (allShipments || []).filter((s: Shipment) => s.carrierId === user?.id);
  
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentMonthName = monthNames[currentMonth];
  
  const monthlyRevenueData = hasRevenueData 
    ? [{ month: currentMonthName, revenue: currentMonthRevenue, fullMonth: `${monthNames[currentMonth]} (Current Month)` }]
    : [];

  const revenueChange = 0;

  const availableLoads = loads.filter((l: Load) => 
    ['posted_to_carriers', 'open_for_bid'].includes(l.status || '')
  );

  const topRecommendedLoads = availableLoads.slice(0, 4).map((load: Load) => ({
    loadId: load.id,
    pickup: `${load.pickupCity || 'Unknown'}`,
    dropoff: `${load.dropoffCity || 'Unknown'}`,
    distance: load.distance ? parseFloat(load.distance) : null,
    loadType: load.requiredTruckType || 'General',
    budget: load.adminFinalPrice ? parseFloat(load.adminFinalPrice) : null,
  }));

  const displayTrips = shipments
    .filter((s: Shipment) => ['in_transit', 'picked_up', 'out_for_delivery', 'at_checkpoint', 'pickup_scheduled'].includes(s.status || ''))
    .slice(0, 4)
    .map((shipment: Shipment) => {
      const load = loads.find((l: Load) => l.id === shipment.loadId);
      const truck = trucks.find((t: TruckType) => t.id === shipment.truckId);
      return {
        tripId: shipment.id,
        pickup: load?.pickupCity || 'Unknown',
        dropoff: load?.dropoffCity || 'Unknown',
        eta: shipment.eta,
        driverAssigned: 'Driver Assigned',
        truckAssigned: truck?.licensePlate || 'Truck Assigned',
        loadType: load?.requiredTruckType || 'General',
        totalDistance: load?.distance ? parseFloat(load.distance) : null,
        status: shipment.status,
      };
    });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-welcome">
            Welcome back, {user?.companyName || user?.username}
          </h1>
          <p className="text-muted-foreground">Here's your fleet overview for today.</p>
        </div>
        <Button onClick={() => navigate("/carrier/add-truck")} data-testid="button-add-truck">
          <Plus className="h-4 w-4 mr-2" />
          Add Truck
        </Button>
      </div>

      {/* Verification Status Card - Show if not verified or recently updated */}
      {verification && (verification.status === "pending" || verification.status === "approved" || verification.status === "rejected") && (
        <Card 
          className={`cursor-pointer hover-elevate ${
            verification.status === "approved" ? "border-green-500/50 bg-green-50/50 dark:bg-green-950/20" : 
            verification.status === "rejected" ? "border-destructive/50 bg-red-50/50 dark:bg-red-950/20" : 
            "border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20"
          }`}
          onClick={() => {
            setHasNewVerificationUpdate(false);
            setVerificationDialogOpen(true);
          }}
          data-testid="card-verification-status"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                {verification.status === "approved" ? (
                  <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-full">
                    <ShieldCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                ) : verification.status === "rejected" ? (
                  <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-full">
                    <ShieldX className="h-6 w-6 text-destructive" />
                  </div>
                ) : (
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-900/50 rounded-full relative">
                    <ShieldAlert className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                    {hasNewVerificationUpdate && (
                      <span className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full animate-pulse" />
                    )}
                  </div>
                )}
                <div>
                  <h3 className="font-semibold">
                    {verification.status === "approved" ? "Verification Complete" : 
                     verification.status === "rejected" ? "Verification Rejected" : 
                     "Verification Pending"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {verification.status === "approved" 
                      ? `Your account is verified. ${verification.documents?.length || 0} documents approved.`
                      : verification.status === "rejected"
                      ? verification.rejectionReason || "Please review the rejection details and resubmit."
                      : `${verification.documents?.length || 0} documents submitted and awaiting review.`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasNewVerificationUpdate && (
                  <Badge variant="default" className="animate-pulse">
                    <Bell className="h-3 w-3 mr-1" />
                    New Update
                  </Badge>
                )}
                <Button variant="outline" size="sm" data-testid="button-view-verification">
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div 
          className="cursor-pointer hover-elevate rounded-lg"
          onClick={() => navigate("/carrier/fleet")}
          data-testid="tile-active-trucks"
        >
          <StatCard
            title="Active Trucks"
            value={`${activeTruckCount} / ${totalTruckCount}`}
            icon={Truck}
            subtitle={`${availableTruckCount} available now`}
          />
        </div>
        <div 
          className="cursor-pointer hover-elevate rounded-lg"
          onClick={() => navigate("/carrier/bids")}
          data-testid="tile-pending-bids"
        >
          <StatCard
            title="Pending Bids"
            value={pendingBidsCount}
            icon={Clock}
            trend={{ value: 15, isPositive: true }}
            subtitle="vs last week"
          />
        </div>
        <div 
          className="cursor-pointer hover-elevate rounded-lg"
          onClick={() => navigate("/carrier/trips")}
          data-testid="tile-active-trips"
        >
          <StatCard
            title="Active Trips"
            value={activeTripsCount}
            icon={Route}
            subtitle={`${driversEnRoute} drivers en route`}
          />
        </div>
        <div 
          className="cursor-pointer hover-elevate rounded-lg"
          onClick={() => navigate("/carrier/revenue")}
          data-testid="tile-monthly-revenue"
        >
          <StatCard
            title="Monthly Revenue"
            value={currentMonthRevenue > 0 ? formatCurrency(currentMonthRevenue) : "No data"}
            icon={DollarSign}
            subtitle={hasRevenueData ? `${dashboardStats?.completedTripsThisMonth || 0} trips completed` : "Complete trips to earn"}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
            <CardTitle className="text-lg">Revenue Summary</CardTitle>
            {hasRevenueData && (
              <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">
                {formatCurrency(currentMonthRevenue)} total
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {!hasRevenueData ? (
              <div className="h-64 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No revenue data yet</p>
                  <p className="text-sm">Complete trips to start earning revenue</p>
                </div>
              </div>
            ) : (
              <>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyRevenueData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" className="text-xs" />
                      <YAxis className="text-xs" tickFormatter={(value) => `${(value / 100000).toFixed(1)}L`} />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                        labelFormatter={(label, payload) => {
                          if (payload && payload[0]) {
                            return payload[0].payload.fullMonth;
                          }
                          return label;
                        }}
                      />
                      <Bar 
                        dataKey="revenue" 
                        fill="hsl(217, 91%, 48%)" 
                        radius={[4, 4, 0, 0]}
                        cursor="pointer"
                        onClick={() => {
                          navigate("/carrier/revenue");
                        }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Click any bar to view detailed monthly report
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4 flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-lg">Performance Score</CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>{performanceTooltips.overall}</p>
              </TooltipContent>
            </Tooltip>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center h-64">
              <Star className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="font-medium text-muted-foreground">Performance data unavailable</p>
              <p className="text-sm text-muted-foreground text-center mt-1">
                Complete more trips to build your performance score
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
            <CardTitle className="text-lg">Recommended Loads</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate("/carrier/loads")} data-testid="link-view-all-loads">
              View All ({availableLoads.length})
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {topRecommendedLoads.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No recommended loads available</p>
            ) : (
              <div className="space-y-3">
                {topRecommendedLoads.map((load) => (
                  <div
                    key={load.loadId}
                    className="p-4 rounded-lg bg-muted/50 hover-elevate cursor-pointer"
                    onClick={() => navigate("/carrier/loads")}
                    data-testid={`recommended-load-${load.loadId}`}
                  >
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <span className="font-medium text-sm truncate">{load.pickup} to {load.dropoff}</span>
                      <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate shrink-0">
                        {load.loadType}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground gap-2 flex-wrap">
                      {load.distance && <span>{load.distance} km</span>}
                      {load.budget && <span className="font-semibold text-foreground">{formatCurrency(load.budget)}</span>}
                      {!load.distance && !load.budget && <span>Details pending</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
            <CardTitle className="text-lg">Active Trips</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate("/carrier/trips")} data-testid="link-view-all-trips">
              View All ({activeTripsCount})
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {displayTrips.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No active trips at the moment</p>
              ) : (
                displayTrips.map((trip) => (
                  <div
                    key={trip.tripId}
                    className="p-4 rounded-lg bg-muted/50 hover-elevate cursor-pointer"
                    onClick={() => navigate("/carrier/trips")}
                    data-testid={`active-trip-${trip.tripId}`}
                  >
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <span className="font-medium text-sm truncate">{trip.pickup} to {trip.dropoff}</span>
                      {trip.eta && (
                        <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate shrink-0">
                          ETA: {formatEta(trip.eta)}
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      {trip.driverAssigned && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {trip.driverAssigned}
                        </div>
                      )}
                      {trip.truckAssigned && (
                        <div className="flex items-center gap-1">
                          <Truck className="h-3 w-3" />
                          {trip.truckAssigned}
                        </div>
                      )}
                      {trip.totalDistance && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {trip.totalDistance} km
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <Badge variant="outline" className="text-xs no-default-hover-elevate no-default-active-elevate">
                        {trip.loadType}
                      </Badge>
                      <span className="text-xs text-muted-foreground">In Transit</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              className="h-auto py-4 flex-col gap-2"
              onClick={() => navigate("/carrier/loads")}
              data-testid="quick-action-find-loads"
            >
              <Package className="h-5 w-5" />
              <span className="text-xs">Find Loads</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex-col gap-2"
              onClick={() => navigate("/carrier/bids")}
              data-testid="quick-action-manage-bids"
            >
              <Clock className="h-5 w-5" />
              <span className="text-xs">Manage Bids</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex-col gap-2"
              onClick={() => navigate("/carrier/drivers")}
              data-testid="quick-action-drivers"
            >
              <User className="h-5 w-5" />
              <span className="text-xs">Drivers</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex-col gap-2"
              onClick={() => navigate("/carrier/revenue")}
              data-testid="quick-action-revenue"
            >
              <TrendingUp className="h-5 w-5" />
              <span className="text-xs">Revenue Report</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Verification Status Dialog */}
      <Dialog open={verificationDialogOpen} onOpenChange={(open) => {
        setVerificationDialogOpen(open);
        if (!open) {
          setHasNewVerificationUpdate(false);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {verification?.status === "approved" ? (
                <ShieldCheck className="h-5 w-5 text-green-600" />
              ) : verification?.status === "rejected" ? (
                <ShieldX className="h-5 w-5 text-destructive" />
              ) : (
                <ShieldAlert className="h-5 w-5 text-yellow-600" />
              )}
              Verification Status
            </DialogTitle>
            <DialogDescription>
              {verification?.status === "approved" 
                ? "Your carrier account has been verified and you can now bid on loads."
                : verification?.status === "rejected"
                ? "Your verification was rejected. Please review the details below and resubmit."
                : "Your verification is pending review by our team."}
            </DialogDescription>
          </DialogHeader>
          
          {verification && (
            <ScrollArea className="flex-1 max-h-[60vh] pr-4">
              <div className="space-y-4">
                {/* Overall Status */}
                <Card className={
                  verification.status === "approved" ? "border-green-500/50" :
                  verification.status === "rejected" ? "border-destructive/50" :
                  "border-yellow-500/50"
                }>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="font-semibold">Overall Status</h3>
                        <p className="text-sm text-muted-foreground">
                          {verification.updatedAt && `Last updated: ${format(new Date(verification.updatedAt), "MMM d, yyyy 'at' h:mm a")}`}
                        </p>
                      </div>
                      <Badge 
                        variant={
                          verification.status === "approved" ? "default" :
                          verification.status === "rejected" ? "destructive" :
                          "secondary"
                        }
                        className={verification.status === "approved" ? "bg-green-600" : ""}
                      >
                        {verification.status === "approved" ? "Verified" : 
                         verification.status === "rejected" ? "Rejected" : 
                         "Pending Review"}
                      </Badge>
                    </div>
                    {verification.rejectionReason && (
                      <div className="mt-3 p-3 bg-destructive/10 rounded-md">
                        <p className="text-sm font-medium text-destructive">Rejection Reason:</p>
                        <p className="text-sm text-muted-foreground">{verification.rejectionReason}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Documents List */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Submitted Documents ({verification.documents?.length || 0})</CardTitle>
                    <CardDescription>Status of each document you submitted</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(verification.documents || []).length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">No documents submitted yet</p>
                      ) : (
                        verification.documents?.map((doc) => (
                          <div 
                            key={doc.id} 
                            className={`flex items-center justify-between p-3 border rounded-lg ${
                              doc.status === "approved" ? "border-green-500/30 bg-green-50/50 dark:bg-green-950/20" :
                              doc.status === "rejected" ? "border-destructive/30 bg-red-50/50 dark:bg-red-950/20" :
                              ""
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{getDocumentDisplayName(doc.documentType)}</p>
                                <p className="text-sm text-muted-foreground">{doc.fileName}</p>
                                {doc.uploadedAt && (
                                  <p className="text-xs text-muted-foreground">
                                    Uploaded {format(new Date(doc.uploadedAt), "MMM d, yyyy")}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {doc.status === "approved" ? (
                                <Badge variant="default" className="bg-green-600">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Approved
                                </Badge>
                              ) : doc.status === "rejected" ? (
                                <div className="text-right">
                                  <Badge variant="destructive">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Rejected
                                  </Badge>
                                  {doc.rejectionReason && (
                                    <p className="text-xs text-destructive mt-1">{doc.rejectionReason}</p>
                                  )}
                                </div>
                              ) : (
                                <Badge variant="secondary">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Pending
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                {verification.status === "rejected" && (
                  <div className="flex justify-end">
                    <Button onClick={() => navigate("/carrier/verification")} data-testid="button-resubmit-verification">
                      Resubmit Documents
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
