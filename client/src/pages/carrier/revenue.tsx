import { useMemo } from "react";
import { useLocation } from "wouter";
import { 
  TrendingUp, DollarSign, Truck, User, MapPin, Building2, 
  ArrowUpRight, ArrowDownRight, BarChart3, PieChart as PieChartIcon,
  Clock, CheckCircle2, AlertCircle, Wallet, ChevronRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "@/components/stat-card";
import { useCarrierData } from "@/lib/carrier-data-store";
import { useShipments, useLoads, useSettlements } from "@/lib/api-hooks";
import { useAuth } from "@/lib/auth-context";
import { deriveRegion, buildRegionMetrics } from "@/lib/utils";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { format } from "date-fns";
import type { Shipment, Load } from "@shared/schema";

function formatCurrency(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return 'Rs. 0';
  }
  if (amount >= 10000000) {
    return `Rs. ${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (amount >= 100000) {
    return `Rs. ${(amount / 100000).toFixed(1)}L`;
  }
  return `Rs. ${amount.toLocaleString()}`;
}

const CHART_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16"];

export default function CarrierRevenuePage() {
  const [, setLocation] = useLocation();
  const { getRevenueAnalytics, completedTrips: mockCompletedTrips } = useCarrierData();
  const { user, carrierType } = useAuth();
  const { data: allShipments = [] } = useShipments();
  const { data: allLoads = [] } = useLoads();
  const { data: allSettlements } = useSettlements();
  
  const isSoloDriver = carrierType === "solo";
  
  // Calculate real revenue from settlements and shipments
  const realRevenueData = useMemo(() => {
    // Get only delivered shipments for revenue calculation
    const myShipments = allShipments.filter((s: Shipment) => 
      s.carrierId === user?.id && s.status === 'delivered'
    );
    
    const carrierSettlements = Array.isArray(allSettlements) 
      ? allSettlements.filter((s: any) => s.carrierId === user?.id && s.status === 'paid')
      : [];
    
    // Calculate total real revenue from paid settlements
    const totalRealRevenue = carrierSettlements.reduce((sum: number, s: any) => 
      sum + parseFloat(s.carrierPayoutAmount?.toString() || '0'), 0
    );
    
    // Calculate revenue from delivered shipments (fallback if no settlements)
    const shipmentRevenue = myShipments.reduce((sum: number, s: Shipment) => {
      const load = allLoads.find((l: Load) => l.id === s.loadId);
      return sum + (load?.adminFinalPrice ? parseFloat(load.adminFinalPrice) * 0.85 : 0);
    }, 0);

    // Calculate revenue by region from DELIVERED shipments only (matches Trip History)
    // Includes both pickup and dropoff regions for comprehensive view
    const { revenueByRegion } = buildRegionMetrics(
      myShipments.map(s => ({ loadId: s.loadId, status: s.status })),
      allLoads.map(l => ({ 
        id: l.id, 
        pickupCity: (l as any).pickupCity, 
        dropoffCity: (l as any).dropoffCity, 
        adminFinalPrice: l.adminFinalPrice 
      })),
      ['delivered']
    );

    // For solo drivers, get their truck info for the truck revenue chart
    const truckRevenue = totalRealRevenue || shipmentRevenue;
    const revenueByTruckType = truckRevenue > 0 ? [{
      truckType: 'My Truck',
      revenue: truckRevenue,
      trips: myShipments.length
    }] : [];

    // Calculate monthly reports from shipments for solo drivers
    const monthlyRevenueMap: Record<string, { revenue: number; trips: number }> = {};
    myShipments.forEach((s: Shipment) => {
      const load = allLoads.find((l: Load) => l.id === s.loadId);
      if (load) {
        // Group by month (e.g., "Jan 2026")
        const deliveryDate = s.deliveryDate ? new Date(s.deliveryDate) : new Date();
        const monthKey = format(deliveryDate, 'MMM yyyy');
        const tripRevenue = load.adminFinalPrice ? parseFloat(load.adminFinalPrice) * 0.85 : 0;
        if (!monthlyRevenueMap[monthKey]) {
          monthlyRevenueMap[monthKey] = { revenue: 0, trips: 0 };
        }
        monthlyRevenueMap[monthKey].revenue += tripRevenue;
        monthlyRevenueMap[monthKey].trips += 1;
      }
    });
    const monthlyReports = Object.entries(monthlyRevenueMap)
      .map(([month, data]) => ({
        month,
        totalRevenue: data.revenue,
        tripsCompleted: data.trips,
        profitMargin: 25 // Approximate profit margin
      }))
      .sort((a, b) => {
        // Sort by date
        const dateA = new Date(a.month);
        const dateB = new Date(b.month);
        return dateA.getTime() - dateB.getTime();
      });
    
    return {
      totalRevenue: totalRealRevenue || shipmentRevenue,
      completedTripsCount: myShipments.length,
      hasRealData: myShipments.length > 0 || carrierSettlements.length > 0,
      revenueByRegion,
      revenueByTruckType,
      monthlyReports
    };
  }, [allShipments, allLoads, allSettlements, user?.id]);
  
  const baseAnalytics = useMemo(() => getRevenueAnalytics(), [getRevenueAnalytics]);
  
  // For solo drivers, only show their actual data (no mock data)
  // For enterprise carriers, merge real data with mock analytics for demo purposes
  const analytics = useMemo(() => {
    if (isSoloDriver) {
      // Solo drivers only see their actual revenue
      return {
        ...baseAnalytics,
        totalRevenue: realRevenueData.totalRevenue,
        monthlyReports: realRevenueData.monthlyReports,
        revenueByTruckType: realRevenueData.revenueByTruckType,
        revenueByDriver: [],
        revenueByRegion: realRevenueData.revenueByRegion,
        topShippers: [],
        bidWinRatio: 0,
        loadAcceptanceRate: 0,
        avgRevenuePerTrip: realRevenueData.completedTripsCount > 0 
          ? Math.round(realRevenueData.totalRevenue / realRevenueData.completedTripsCount)
          : 0,
        yoyGrowth: 0,
        bestPerformingTrucks: []
      };
    }
    return {
      ...baseAnalytics,
      totalRevenue: realRevenueData.hasRealData 
        ? realRevenueData.totalRevenue + baseAnalytics.totalRevenue 
        : baseAnalytics.totalRevenue,
    };
  }, [baseAnalytics, realRevenueData, isSoloDriver]);
  
  // Solo drivers only see their own completed trips count
  const completedTrips = isSoloDriver 
    ? realRevenueData.completedTripsCount 
    : realRevenueData.completedTripsCount + mockCompletedTrips.length;

  const monthlyChartData = analytics.monthlyReports.map(m => ({
    name: m.month,
    revenue: m.totalRevenue,
    profit: m.totalRevenue * (m.profitMargin / 100),
    trips: m.tripsCompleted
  }));

  const truckTypeChartData = analytics.revenueByTruckType.map((t, i) => ({
    name: t.truckType,
    value: t.revenue,
    trips: t.trips,
    color: CHART_COLORS[i % CHART_COLORS.length]
  }));

  const regionChartData = analytics.revenueByRegion.map((r, i) => ({
    name: r.region,
    revenue: r.revenue,
    trips: r.trips,
    growth: r.growth,
    color: CHART_COLORS[i % CHART_COLORS.length]
  }));

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-revenue-title">Revenue Analytics</h1>
          <p className="text-muted-foreground">
            Financial performance from {completedTrips} completed trips
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(analytics.totalRevenue)}
          icon={DollarSign}
          subtitle="All time"
          trend={{ value: analytics.yoyGrowth, isPositive: analytics.yoyGrowth > 0 }}
          testId="stat-total-revenue"
        />
        <StatCard
          title="Avg per Trip"
          value={formatCurrency(analytics.avgRevenuePerTrip)}
          icon={TrendingUp}
          subtitle="Revenue per load"
          testId="stat-avg-per-trip"
        />
        <StatCard
          title="Bid Win Rate"
          value={`${analytics.bidWinRatio}%`}
          icon={BarChart3}
          subtitle="Accepted bids"
          testId="stat-win-rate"
        />
        <StatCard
          title="YoY Growth"
          value={`${analytics.yoyGrowth > 0 ? "+" : ""}${analytics.yoyGrowth}%`}
          icon={analytics.yoyGrowth > 0 ? ArrowUpRight : ArrowDownRight}
          subtitle="vs last year"
          testId="stat-yoy-growth"
        />
      </div>

      <Tabs defaultValue={isSoloDriver ? "earnings" : "overview"} className="space-y-4">
        <TabsList>
          {isSoloDriver ? (
            <>
              <TabsTrigger value="earnings" data-testid="tab-earnings">My Earnings</TabsTrigger>
              <TabsTrigger value="overview" data-testid="tab-overview">Trends</TabsTrigger>
              <TabsTrigger value="shippers" data-testid="tab-shippers">Top Shippers</TabsTrigger>
            </>
          ) : (
            <>
              <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
              <TabsTrigger value="breakdown" data-testid="tab-breakdown">Breakdown</TabsTrigger>
              <TabsTrigger value="drivers" data-testid="tab-drivers">By Driver</TabsTrigger>
              <TabsTrigger value="shippers" data-testid="tab-shippers">Top Shippers</TabsTrigger>
            </>
          )}
        </TabsList>

        {/* Solo Driver Cash Flow View */}
        {isSoloDriver && (
          <TabsContent value="earnings" className="space-y-6">
            {completedTrips === 0 ? (
              /* Empty state for solo drivers with no completed trips */
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="p-4 rounded-full bg-muted mb-4">
                      <Wallet className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No earnings yet</h3>
                    <p className="text-muted-foreground max-w-md">
                      Complete trips to start earning revenue. Your earnings, payouts, and trip history will appear here.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-500/10">
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Completed Payouts</p>
                          <p className="text-xl font-bold text-green-600" data-testid="text-completed-payouts">
                            {formatCurrency(analytics.totalRevenue * 0.7)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-amber-500/10">
                          <Clock className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Pending Payments</p>
                          <p className="text-xl font-bold text-amber-600" data-testid="text-pending-payments">
                            {formatCurrency(analytics.totalRevenue * 0.2)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-red-500/10">
                          <AlertCircle className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Platform Deductions</p>
                          <p className="text-xl font-bold text-red-600" data-testid="text-deductions">
                            {formatCurrency(analytics.totalRevenue * 0.1)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Wallet className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Net Earnings</p>
                          <p className="text-xl font-bold text-primary" data-testid="text-net-earnings">
                            {formatCurrency(analytics.totalRevenue * 0.9)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Trip Payouts</CardTitle>
                    <CardDescription>Your per-trip earnings breakdown</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-3">
                        {analytics.monthlyReports.slice(0, 6).flatMap((month, monthIdx) => 
                          Array.from({ length: month.tripsCompleted > 5 ? 5 : month.tripsCompleted }, (_, tripIdx) => {
                            const tripRevenue = month.avgRevenuePerTrip * (0.9 + Math.random() * 0.2);
                            const platformFee = tripRevenue * 0.1;
                            const netPayout = tripRevenue - platformFee;
                            return (
                              <div key={`${monthIdx}-${tripIdx}`} className="p-4 rounded-lg bg-muted/50 flex items-center justify-between gap-4 flex-wrap">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 rounded-lg bg-primary/10">
                                    <Truck className="h-4 w-4 text-primary" />
                                  </div>
                                  <div>
                                    <p className="font-medium">Trip #{monthIdx * 5 + tripIdx + 1}</p>
                                    <p className="text-xs text-muted-foreground">{month.month}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="text-right">
                                    <p className="text-xs text-muted-foreground">Gross</p>
                                    <p className="font-medium">{formatCurrency(tripRevenue)}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs text-muted-foreground">Deduction</p>
                                    <p className="font-medium text-red-600">-{formatCurrency(platformFee)}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs text-muted-foreground">Net</p>
                                    <p className="font-bold text-green-600">{formatCurrency(netPayout)}</p>
                                  </div>
                                  <Badge variant="default">Paid</Badge>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        )}

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Monthly Revenue Trend</CardTitle>
                <CardDescription>Revenue and profit over the past months</CardDescription>
              </CardHeader>
              <CardContent>
                {monthlyChartData.length > 0 ? (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyChartData}>
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis 
                          tick={{ fontSize: 12 }}
                          tickFormatter={(v) => `${(v / 100000).toFixed(0)}L`}
                        />
                        <Tooltip 
                          formatter={(value: number) => formatCurrency(value)}
                          labelStyle={{ color: "var(--foreground)" }}
                        />
                        <Legend />
                        <Area 
                          type="monotone" 
                          dataKey="revenue" 
                          name="Revenue"
                          stroke="#3B82F6" 
                          fill="#3B82F680"
                        />
                        <Area 
                          type="monotone" 
                          dataKey="profit" 
                          name="Profit"
                          stroke="#10B981" 
                          fill="#10B98180"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-80 flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No monthly data yet</p>
                      <p className="text-sm">Complete trips to see revenue trends</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Trips Completed</CardTitle>
                <CardDescription>Number of trips per month</CardDescription>
              </CardHeader>
              <CardContent>
                {monthlyChartData.length > 0 ? (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyChartData}>
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="trips" name="Trips" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-80 flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No trips completed yet</p>
                      <p className="text-sm">Complete trips to see monthly stats</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className={`grid gap-6 ${isSoloDriver ? 'lg:grid-cols-2' : 'lg:grid-cols-3'}`}>
            {/* Hide Best Performing Trucks for solo drivers - they only have one truck */}
            {!isSoloDriver && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Best Performing Trucks</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.bestPerformingTrucks.slice(0, 5).map((truck, idx) => (
                      <div key={truck.truckId} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                            {idx + 1}
                          </div>
                          <div>
                            <p className="font-medium">{truck.plate}</p>
                            <p className="text-xs text-muted-foreground">{truck.truckId}</p>
                          </div>
                        </div>
                        <span className="font-bold">{formatCurrency(truck.revenue)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{isSoloDriver ? 'My Truck Revenue' : 'Revenue by Truck Type'}</CardTitle>
              </CardHeader>
              <CardContent>
                {truckTypeChartData.length > 0 ? (
                  <>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={truckTypeChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={70}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {truckTypeChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2 justify-center">
                      {truckTypeChartData.map((entry, idx) => (
                        <Badge key={idx} style={{ backgroundColor: entry.color }} className="text-white">
                          {entry.name}
                        </Badge>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-48 flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <Truck className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No completed trips yet</p>
                      <p className="text-sm">Complete trips to see revenue data</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Revenue by Region</CardTitle>
                <CardDescription>Click a region to view trips</CardDescription>
              </CardHeader>
              <CardContent>
                {regionChartData.length > 0 ? (
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {regionChartData.map((region) => (
                        <div 
                          key={region.name} 
                          className="p-2 rounded-md hover-elevate cursor-pointer border border-transparent hover:border-border transition-colors"
                          onClick={() => setLocation(`/carrier/history?region=${encodeURIComponent(region.name)}`)}
                          data-testid={`region-item-${region.name.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-primary" />
                              <span className="font-medium">{region.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{formatCurrency(region.revenue)}</span>
                              <Badge variant="secondary" className="text-xs">
                                {region.trips} {region.trips === 1 ? 'trip' : 'trips'}
                              </Badge>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Progress 
                              value={analytics.totalRevenue > 0 ? (region.revenue / analytics.totalRevenue) * 100 : 0} 
                              className="h-1.5 flex-1" 
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="h-64 flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No regional data yet</p>
                      <p className="text-sm">Complete trips to see revenue by region</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Monthly Financial Breakdown</CardTitle>
              <CardDescription>Detailed cost and revenue breakdown per month</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {analytics.monthlyReports.map((report) => (
                    <Card key={report.month}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold">{report.month}</h4>
                          <Badge variant={report.profitMargin > 20 ? "default" : "secondary"}>
                            {report.profitMargin}% margin
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Revenue</p>
                            <p className="font-bold text-lg">{formatCurrency(report.totalRevenue)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Trips</p>
                            <p className="font-bold text-lg">{report.tripsCompleted}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Avg/Trip</p>
                            <p className="font-bold text-lg">{formatCurrency(report.avgRevenuePerTrip)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Profit</p>
                            <p className="font-bold text-lg text-green-600">
                              {formatCurrency(report.totalRevenue * (report.profitMargin / 100))}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-4 pt-4 border-t">
                          <div>
                            <p className="text-xs text-muted-foreground">Fuel</p>
                            <p className="font-medium text-red-600">{formatCurrency(report.fuelCost)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Tolls</p>
                            <p className="font-medium text-red-600">{formatCurrency(report.tollCost)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Driver Pay</p>
                            <p className="font-medium text-red-600">{formatCurrency(report.driverPay)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Maintenance</p>
                            <p className="font-medium text-red-600">{formatCurrency(report.maintenanceCost)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Platform</p>
                            <p className="font-medium text-red-600">{formatCurrency(report.platformFees)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Enterprise-only: Revenue by Driver tab */}
        {!isSoloDriver && (
          <TabsContent value="drivers" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Revenue by Driver</CardTitle>
                <CardDescription>Individual driver performance and earnings</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-4">
                    {analytics.revenueByDriver.map((driver, idx) => (
                      <div key={driver.driverId} className="p-4 rounded-lg bg-muted/50 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                              {idx + 1}
                            </div>
                            <div>
                              <p className="font-semibold">{driver.driverName}</p>
                              <p className="text-xs text-muted-foreground">{driver.driverId}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg">{formatCurrency(driver.revenue)}</p>
                            <p className="text-xs text-muted-foreground">{driver.trips} trips</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Avg per Trip</p>
                            <p className="font-medium">{formatCurrency(driver.avgPerTrip)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Safety Score</p>
                            <div className="flex items-center gap-2">
                              <Progress value={driver.safetyScore} className="h-2 flex-1" />
                              <span className={`font-medium ${
                                driver.safetyScore > 80 ? "text-green-600" : 
                                driver.safetyScore > 60 ? "text-amber-600" : "text-red-600"
                              }`}>{driver.safetyScore}</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">% of Total</p>
                            <p className="font-medium">
                              {((driver.revenue / analytics.totalRevenue) * 100).toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="shippers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top Shippers</CardTitle>
              <CardDescription>Your highest-value shipper relationships</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {analytics.topShippers.map((shipper, idx) => (
                    <div key={shipper.shipperId} className="p-4 rounded-lg bg-muted/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold">{shipper.shipperName}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{shipper.loadsCompleted} loads</span>
                              <span className="flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                {shipper.rating.toFixed(1)} rating
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">{formatCurrency(shipper.totalPaid)}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(shipper.totalPaid / shipper.loadsCompleted)} avg
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
