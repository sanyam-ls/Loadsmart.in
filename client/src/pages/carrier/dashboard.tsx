import { useLocation } from "wouter";
import { Truck, DollarSign, Package, Clock, TrendingUp, Route, Plus, ArrowRight, Star, Fuel, MapPin, User, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/components/stat-card";
import { useAuth } from "@/lib/auth-context";
import { useCarrierData } from "@/lib/carrier-data-store";
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

const formatCurrency = (amount: number): string => {
  if (amount >= 10000000) {
    return `Rs. ${(amount / 10000000).toFixed(2)} Cr`;
  } else if (amount >= 100000) {
    return `Rs. ${(amount / 100000).toFixed(2)} L`;
  } else {
    return `Rs. ${amount.toLocaleString("en-IN")}`;
  }
};

const formatEta = (eta: Date): string => {
  const now = new Date();
  const diffMs = eta.getTime() - now.getTime();
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
  const { trucks, bids, activeTrips, availableLoads, getFleetOverview, getRevenueAnalytics } = useCarrierData();
  
  const fleetOverview = getFleetOverview();
  const revenueAnalytics = getRevenueAnalytics();
  
  const activeTruckCount = trucks.filter(t => t.currentStatus === "On Trip" || t.currentStatus === "En Route").length;
  const availableTruckCount = trucks.filter(t => t.currentStatus === "Idle").length;
  const pendingBidsCount = bids.filter(b => b.bidStatus === "pending" || b.bidStatus === "countered").length;
  const activeTripsCount = activeTrips.length;
  const driversEnRoute = activeTrips.filter(t => t.status === "in_transit").length;
  
  const monthlyRevenueData = revenueAnalytics.monthlyReports.map(m => ({
    month: m.month.slice(0, 3),
    revenue: m.totalRevenue,
    fullMonth: m.month
  }));

  const currentMonthRevenue = revenueAnalytics.monthlyReports[revenueAnalytics.monthlyReports.length - 1]?.totalRevenue || 0;
  const lastMonthRevenue = revenueAnalytics.monthlyReports[revenueAnalytics.monthlyReports.length - 2]?.totalRevenue || 0;
  const revenueChange = lastMonthRevenue > 0 ? Math.round(((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100) : 0;
  
  const topRecommendedLoads = availableLoads
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 4);

  const displayTrips = activeTrips.slice(0, 4).map(trip => {
    const totalDistance = trip.totalDistance;
    const coveredDistance = Math.round(totalDistance * (trip.progress / 100));
    return {
      ...trip,
      coveredKm: coveredDistance,
      fuelUsed: Math.round(coveredDistance * 0.12),
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
            value={formatCurrency(currentMonthRevenue)}
            icon={DollarSign}
            trend={{ value: Math.abs(revenueChange), isPositive: revenueChange >= 0 }}
            subtitle="vs last month"
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
            <CardTitle className="text-lg">Monthly Revenue (FY 2024-25)</CardTitle>
            <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">
              <TrendingUp className="h-3 w-3 mr-1" />
              {revenueChange >= 0 ? '+' : ''}{revenueChange}% vs last month
            </Badge>
          </CardHeader>
          <CardContent>
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
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 no-default-hover-elevate no-default-active-elevate shrink-0">
                      {load.matchScore}% match
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground gap-2 flex-wrap">
                    <span>{load.distance} km</span>
                    <span className="text-xs">{load.loadType}</span>
                    <span className="font-semibold text-foreground">{formatCurrency(load.budget)}</span>
                  </div>
                </div>
              ))}
            </div>
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
                      <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate shrink-0">
                        ETA: {formatEta(trip.eta)}
                      </Badge>
                    </div>
                    <Progress value={trip.progress} className="h-2 mb-2" />
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {trip.driverAssigned}
                      </div>
                      <div className="flex items-center gap-1">
                        <Truck className="h-3 w-3" />
                        {trip.truckAssigned}
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {trip.coveredKm} / {trip.totalDistance} km
                      </div>
                      <div className="flex items-center gap-1">
                        <Fuel className="h-3 w-3" />
                        {trip.fuelUsed} L used
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <Badge variant="outline" className="text-xs no-default-hover-elevate no-default-active-elevate">
                        {trip.loadType}
                      </Badge>
                      <span className="text-xs font-medium">{trip.progress}% complete</span>
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
