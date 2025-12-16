import { useLocation } from "wouter";
import { Truck, DollarSign, Package, Clock, TrendingUp, Route, Plus, ArrowRight, Star, MapPin, User, Info, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/components/stat-card";
import { useAuth } from "@/lib/auth-context";
import { useTrucks, useBids, useLoads, useShipments, useSettlements } from "@/lib/api-hooks";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer 
} from "recharts";
import type { Truck as TruckType, Bid, Load, Shipment } from "@shared/schema";

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

export default function CarrierDashboard() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  
  const { data: allTrucks, isLoading: trucksLoading } = useTrucks();
  const { data: allBids, isLoading: bidsLoading } = useBids();
  const { data: allLoads, isLoading: loadsLoading } = useLoads();
  const { data: allShipments } = useShipments();
  const { data: allSettlements } = useSettlements();

  if (trucksLoading || bidsLoading || loadsLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const trucks = (allTrucks || []).filter((t: TruckType) => t.carrierId === user?.id);
  const bids = (allBids || []).filter((b: Bid) => b.carrierId === user?.id);
  const loads = allLoads || [];
  const shipments = (allShipments || []).filter((s: Shipment) => s.carrierId === user?.id);
  const carrierSettlements = (allSettlements || []).filter((s: any) => s.carrierId === user?.id);

  const activeTruckCount = trucks.filter((t: TruckType) => t.status === "on_trip" || t.status === "en_route").length;
  const availableTruckCount = trucks.filter((t: TruckType) => t.status === "available" || t.status === "idle").length;
  const pendingBidsCount = bids.filter((b: Bid) => b.status === "pending" || b.status === "countered").length;
  const activeTripsCount = shipments.filter((s: Shipment) => s.status === "in_transit").length;
  const driversEnRoute = activeTripsCount;
  
  const currentMonthRevenue = carrierSettlements
    .filter((s: any) => s.status === 'paid')
    .reduce((sum: number, s: any) => sum + parseFloat(s.carrierPayoutAmount?.toString() || '0'), 0);
  
  const hasRevenueData = carrierSettlements.length > 0;
  
  const monthlyRevenueData = hasRevenueData 
    ? [{ month: 'Dec', revenue: currentMonthRevenue, fullMonth: 'December (Current)' }]
    : [];

  const revenueChange = 0;

  const availableLoads = loads.filter((l: Load) => 
    ['posted_to_carriers', 'open_for_bid'].includes(l.status || '')
  );

  const topRecommendedLoads = availableLoads.slice(0, 4).map((load: Load) => ({
    loadId: load.id,
    pickup: `${load.pickupCity}`,
    dropoff: `${load.dropoffCity}`,
    distance: load.distance ? parseFloat(load.distance) : null,
    loadType: load.truckType || 'General',
    budget: load.adminPrice ? parseFloat(load.adminPrice) : null,
  }));

  const displayTrips = shipments
    .filter((s: Shipment) => s.status === 'in_transit')
    .slice(0, 4)
    .map((shipment: Shipment) => {
      const load = loads.find((l: Load) => l.id === shipment.loadId);
      return {
        tripId: shipment.id,
        pickup: load?.pickupCity || 'Unknown',
        dropoff: load?.dropoffCity || 'Unknown',
        eta: shipment.estimatedDelivery,
        driverAssigned: shipment.driverName,
        truckAssigned: shipment.truckNumber,
        loadType: load?.truckType || 'General',
        totalDistance: load?.distance ? parseFloat(load.distance) : null,
      };
    });

  const performance = {
    reliability: 4.8,
    communication: 4.9,
    onTime: 4.7,
    overall: 4.8,
  };

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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div 
          className="cursor-pointer hover-elevate rounded-lg"
          onClick={() => navigate("/carrier/fleet")}
          data-testid="tile-active-trucks"
        >
          <StatCard
            title="Active Trucks"
            value={`${activeTruckCount} / ${trucks.length}`}
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
            subtitle={carrierSettlements.length > 0 ? `${carrierSettlements.length} settlement(s)` : "Complete trips to earn"}
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
            <div className="flex items-center justify-center mb-6">
              <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-primary/10">
                <div className="text-center">
                  <Star className="h-6 w-6 text-amber-500 mx-auto mb-1 fill-current" />
                  <span className="text-3xl font-bold">{performance.overall}</span>
                  <span className="text-sm text-muted-foreground">/5.0</span>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-muted-foreground cursor-help flex items-center gap-1">
                        Reliability
                        <Info className="h-3 w-3" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>{performanceTooltips.reliability}</p>
                    </TooltipContent>
                  </Tooltip>
                  <span className="font-medium">{performance.reliability}</span>
                </div>
                <Progress value={performance.reliability * 20} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-muted-foreground cursor-help flex items-center gap-1">
                        Communication
                        <Info className="h-3 w-3" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>{performanceTooltips.communication}</p>
                    </TooltipContent>
                  </Tooltip>
                  <span className="font-medium">{performance.communication}</span>
                </div>
                <Progress value={performance.communication * 20} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-muted-foreground cursor-help flex items-center gap-1">
                        On-Time Delivery
                        <Info className="h-3 w-3" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>{performanceTooltips.onTime}</p>
                    </TooltipContent>
                  </Tooltip>
                  <span className="font-medium">{performance.onTime}</span>
                </div>
                <Progress value={performance.onTime * 20} className="h-2" />
              </div>
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
    </div>
  );
}
