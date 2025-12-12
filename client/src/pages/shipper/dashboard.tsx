import { useLocation } from "wouter";
import { Package, DollarSign, Truck, Clock, TrendingUp, TrendingDown, AlertTriangle, Plus, ArrowRight, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatCard } from "@/components/stat-card";
import { useAuth } from "@/lib/auth-context";
import { useMockData } from "@/lib/mock-data-store";
import { useDocumentVault } from "@/lib/document-vault-store";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";


const mockTopCarriers = [
  { id: "c1", name: "FastHaul Logistics", rating: 4.9, deliveries: 234 },
  { id: "c2", name: "Swift Transport", rating: 4.8, deliveries: 189 },
  { id: "c3", name: "Premier Freight", rating: 4.7, deliveries: 156 },
];


export default function ShipperDashboard() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { 
    loads, 
    getActiveLoads, 
    getPendingBids, 
    getInTransitLoads, 
    spend,
    trucks
  } = useMockData();
  const { getExpiringDocuments, getExpiredDocuments } = useDocumentVault();

  const activeLoads = getActiveLoads();
  const pendingBids = getPendingBids();
  const inTransitLoads = getInTransitLoads();
  const expiringDocs = getExpiringDocuments();
  const expiredDocs = getExpiredDocuments();
  
  const recentLoads = activeLoads.slice(0, 3);

  const spendChange = spend.percentChange;

  const dashboardAlerts = [
    { id: "delay-1", type: "delay", message: "Shipment LD-T001 may be delayed by 30 mins", time: "5 mins ago" },
    { id: "bid-1", type: "bid", message: "New bid received for load LD-002", time: "12 mins ago" },
    ...expiredDocs.slice(0, 2).map((doc, i) => ({
      id: `expired-${i}`,
      type: "document" as const,
      message: `${doc.fileName} has expired and needs renewal`,
      time: "Action required",
    })),
    ...expiringDocs.slice(0, 2).map((doc, i) => ({
      id: `expiring-${i}`,
      type: "document" as const,
      message: `${doc.fileName} expires soon`,
      time: "Review needed",
    })),
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-welcome">
            Welcome back, {user?.companyName || user?.username}
          </h1>
          <p className="text-muted-foreground">Here's what's happening with your shipments today.</p>
        </div>
        <Button onClick={() => navigate("/shipper/post-load")} data-testid="button-post-load">
          <Plus className="h-4 w-4 mr-2" />
          Post New Load
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Loads"
          value={activeLoads.length}
          icon={Package}
          trend={{ value: 12, isPositive: true }}
          onClick={() => navigate("/shipper/loads")}
          testId="stat-active-loads"
        />
        <StatCard
          title="Pending Bids"
          value={pendingBids.length}
          icon={Clock}
          subtitle="Awaiting your response"
          onClick={() => navigate("/shipper/pending-bids")}
          testId="stat-pending-bids"
        />
        <StatCard
          title="In Transit"
          value={inTransitLoads.length}
          icon={Truck}
          trend={{ value: 8, isPositive: true }}
          onClick={() => navigate("/shipper/in-transit")}
          testId="stat-in-transit"
        />
        <StatCard
          title="Monthly Spend"
          value={`Rs. ${spend.totalAmount.toLocaleString('en-IN')}`}
          icon={DollarSign}
          trend={{ value: Math.abs(spendChange), isPositive: spendChange > 0 }}
          onClick={() => navigate("/shipper/spend")}
          testId="stat-monthly-spend"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
            <CardTitle className="text-lg">Monthly Spend</CardTitle>
            <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">
              {spendChange >= 0 ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1" />
              )}
              {spendChange >= 0 ? "+" : ""}{spendChange}% vs last month
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={spend.monthlyData.slice(0, 6)}>
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(217, 91%, 48%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(217, 91%, 48%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(value) => `Rs. ${(value / 100000).toFixed(1)}L`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [`Rs. ${value.toLocaleString('en-IN')}`, "Spend"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="hsl(217, 91%, 48%)"
                    fillOpacity={1}
                    fill="url(#colorAmount)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
            <CardTitle className="text-lg">Alerts</CardTitle>
            <Badge variant="destructive" className="no-default-hover-elevate no-default-active-elevate">
              {dashboardAlerts.length}
            </Badge>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {dashboardAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover-elevate cursor-pointer"
                    onClick={() => alert.type === "document" && navigate("/shipper/documents")}
                    data-testid={`alert-${alert.id}`}
                  >
                    {alert.type === "document" ? (
                      <FileText className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-500" />
                    ) : (
                      <AlertTriangle className={`h-4 w-4 flex-shrink-0 mt-0.5 ${
                        alert.type === "delay" ? "text-red-500" : "text-blue-500"
                      }`} />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{alert.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{alert.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
            <CardTitle className="text-lg">Active Loads</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate("/shipper/loads")} data-testid="link-view-all-loads">
              View All
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {recentLoads.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No active loads yet</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate("/shipper/post-load")}>
                  Post Your First Load
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentLoads.map((load) => (
                  <div
                    key={load.loadId}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover-elevate cursor-pointer"
                    onClick={() => navigate(`/shipper/loads/${load.loadId}`)}
                    data-testid={`load-card-${load.loadId}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{load.loadId}</span>
                        <Badge variant="outline" className="text-xs">
                          {load.type}
                        </Badge>
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${
                            load.status === "Active" 
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" 
                              : load.status === "Bidding" 
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          }`}
                        >
                          {load.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {load.pickup} → {load.drop}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-medium">Rs. {(load.estimatedPrice ?? 0).toLocaleString('en-IN')}</p>
                      <p className="text-xs text-muted-foreground">{load.weight.toLocaleString('en-IN')} {load.weightUnit}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
              <CardTitle className="text-lg">Nearby Trucks</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/shipper/nearby-trucks")} data-testid="link-view-nearby-trucks">
                Find Trucks
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {trucks.filter(t => t.availabilityStatus === "Available").slice(0, 4).map((truck) => (
                  <div
                    key={truck.truckId}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover-elevate cursor-pointer"
                    onClick={() => navigate("/shipper/nearby-trucks")}
                    data-testid={`nearby-truck-${truck.truckId}`}
                  >
                    <div className="flex items-center gap-3">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="font-medium text-sm">{truck.carrierName}</span>
                        <p className="text-xs text-muted-foreground">{truck.currentLocation}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{truck.truckType}</Badge>
                      <Badge 
                        className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 no-default-hover-elevate no-default-active-elevate"
                      >
                        {truck.reliabilityScore}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground text-center mt-3">
                {trucks.filter(t => t.availabilityStatus === "Available").length} trucks available near your loads
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
              <CardTitle className="text-lg">Top Carriers</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/shipper/carriers")} data-testid="link-view-all-carriers">
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {mockTopCarriers.map((carrier, index) => (
                  <div
                    key={carrier.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover-elevate cursor-pointer"
                    data-testid={`top-carrier-${carrier.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
                        {index + 1}
                      </div>
                      <span className="font-medium">{carrier.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-amber-500">* {carrier.rating}</span>
                      <span className="text-muted-foreground">{carrier.deliveries} trips</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
