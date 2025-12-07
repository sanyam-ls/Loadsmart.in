import { useState } from "react";
import { useLocation } from "wouter";
import { Package, DollarSign, Truck, Clock, TrendingUp, AlertTriangle, Plus, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatCard } from "@/components/stat-card";
import { LoadCard } from "@/components/load-card";
import { useAuth } from "@/lib/auth-context";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";

const mockStats = {
  activeLoads: 8,
  pendingBids: 12,
  inTransit: 5,
  monthlySpend: 45200,
};

const mockActiveLoads = [
  {
    id: "1",
    shipperId: "s1",
    pickupAddress: "123 Industrial Way",
    pickupCity: "Los Angeles, CA",
    dropoffAddress: "456 Commerce St",
    dropoffCity: "Phoenix, AZ",
    weight: "15000",
    weightUnit: "lbs",
    estimatedPrice: "2500",
    status: "bidding" as const,
    pickupDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2),
    bidCount: 4,
  },
  {
    id: "2",
    shipperId: "s1",
    pickupAddress: "789 Warehouse Blvd",
    pickupCity: "San Francisco, CA",
    dropoffAddress: "321 Distribution Center",
    dropoffCity: "Denver, CO",
    weight: "22000",
    weightUnit: "lbs",
    estimatedPrice: "4200",
    status: "in_transit" as const,
    pickupDate: new Date(),
    bidCount: 0,
  },
];

const mockNearbyTrucks = [
  { id: "t1", type: "Dry Van", distance: 12, available: true },
  { id: "t2", type: "Flatbed", distance: 25, available: true },
  { id: "t3", type: "Refrigerated", distance: 34, available: false },
  { id: "t4", type: "Container", distance: 41, available: true },
];

const mockTopCarriers = [
  { id: "c1", name: "FastHaul Logistics", rating: 4.9, deliveries: 234 },
  { id: "c2", name: "Swift Transport", rating: 4.8, deliveries: 189 },
  { id: "c3", name: "Premier Freight", rating: 4.7, deliveries: 156 },
];

const mockAlerts = [
  { id: "a1", type: "delay", message: "Load #1234 experiencing 2-hour delay", time: "10 mins ago" },
  { id: "a2", type: "document", message: "Insurance expires in 5 days", time: "1 hour ago" },
  { id: "a3", type: "bid", message: "New bid received for Load #1235", time: "2 hours ago" },
];

const mockSpendData = [
  { month: "Jan", amount: 32000 },
  { month: "Feb", amount: 38000 },
  { month: "Mar", amount: 35000 },
  { month: "Apr", amount: 42000 },
  { month: "May", amount: 48000 },
  { month: "Jun", amount: 45200 },
];

export default function ShipperDashboard() {
  const [, navigate] = useLocation();
  const { user } = useAuth();

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
          value={mockStats.activeLoads}
          icon={Package}
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard
          title="Pending Bids"
          value={mockStats.pendingBids}
          icon={Clock}
          subtitle="Awaiting your response"
        />
        <StatCard
          title="In Transit"
          value={mockStats.inTransit}
          icon={Truck}
          trend={{ value: 8, isPositive: true }}
        />
        <StatCard
          title="Monthly Spend"
          value={`$${mockStats.monthlySpend.toLocaleString()}`}
          icon={DollarSign}
          trend={{ value: 5, isPositive: false }}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
            <CardTitle className="text-lg">Monthly Spend</CardTitle>
            <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">
              <TrendingUp className="h-3 w-3 mr-1" />
              +18% vs last month
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockSpendData}>
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(217, 91%, 48%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(217, 91%, 48%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(value) => `$${value / 1000}k`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, "Spend"]}
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
              {mockAlerts.length}
            </Badge>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {mockAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover-elevate cursor-pointer"
                    data-testid={`alert-${alert.id}`}
                  >
                    <AlertTriangle className={`h-4 w-4 flex-shrink-0 mt-0.5 ${
                      alert.type === "delay" 
                        ? "text-red-500" 
                        : alert.type === "document" 
                          ? "text-amber-500" 
                          : "text-blue-500"
                    }`} />
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
            <div className="space-y-4">
              {mockActiveLoads.map((load) => (
                <LoadCard
                  key={load.id}
                  load={load as any}
                  variant="shipper"
                  onViewDetails={() => navigate(`/shipper/loads/${load.id}`)}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
              <CardTitle className="text-lg">Nearby Trucks</CardTitle>
              <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">
                {mockNearbyTrucks.filter(t => t.available).length} available
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {mockNearbyTrucks.map((truck) => (
                  <div
                    key={truck.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover-elevate cursor-pointer"
                    data-testid={`nearby-truck-${truck.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{truck.type}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">{truck.distance} mi</span>
                      <Badge 
                        variant={truck.available ? "default" : "secondary"}
                        className={truck.available 
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 no-default-hover-elevate no-default-active-elevate" 
                          : "no-default-hover-elevate no-default-active-elevate"
                        }
                      >
                        {truck.available ? "Available" : "In Use"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
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
                      <span className="text-amber-500">★ {carrier.rating}</span>
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
