import { useLocation } from "wouter";
import { Truck, DollarSign, Package, Clock, TrendingUp, Route, Plus, ArrowRight, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/components/stat-card";
import { useAuth } from "@/lib/auth-context";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";

const mockStats = {
  activeTrucks: 5,
  pendingBids: 8,
  activeTrips: 3,
  monthlyRevenue: 28500,
};

const mockAvailableLoads = [
  { id: "l1", route: "Los Angeles, CA → Phoenix, AZ", distance: 372, price: 2500, matchScore: 92 },
  { id: "l2", route: "San Diego, CA → Las Vegas, NV", distance: 330, price: 2100, matchScore: 87 },
  { id: "l3", route: "Oakland, CA → Salt Lake City, UT", distance: 750, price: 4200, matchScore: 78 },
];

const mockActiveTrips = [
  { id: "t1", route: "San Francisco, CA → Denver, CO", progress: 65, eta: "8 hours" },
  { id: "t2", route: "Chicago, IL → Detroit, MI", progress: 25, eta: "5 hours" },
];

const mockRevenueData = [
  { month: "Jan", revenue: 22000 },
  { month: "Feb", revenue: 25000 },
  { month: "Mar", revenue: 21000 },
  { month: "Apr", revenue: 28000 },
  { month: "May", revenue: 32000 },
  { month: "Jun", revenue: 28500 },
];

const mockPerformance = {
  reliability: 4.8,
  communication: 4.9,
  onTime: 4.7,
  overall: 4.8,
};

export default function CarrierDashboard() {
  const [, navigate] = useLocation();
  const { user } = useAuth();

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
        <StatCard
          title="Active Trucks"
          value={mockStats.activeTrucks}
          icon={Truck}
          subtitle="3 available now"
        />
        <StatCard
          title="Pending Bids"
          value={mockStats.pendingBids}
          icon={Clock}
          trend={{ value: 15, isPositive: true }}
        />
        <StatCard
          title="Active Trips"
          value={mockStats.activeTrips}
          icon={Route}
        />
        <StatCard
          title="Monthly Revenue"
          value={`$${mockStats.monthlyRevenue.toLocaleString()}`}
          icon={DollarSign}
          trend={{ value: 12, isPositive: true }}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
            <CardTitle className="text-lg">Monthly Revenue</CardTitle>
            <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">
              <TrendingUp className="h-3 w-3 mr-1" />
              +12% vs last month
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockRevenueData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(value) => `$${value / 1000}k`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
                  />
                  <Bar 
                    dataKey="revenue" 
                    fill="hsl(217, 91%, 48%)" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Performance Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center mb-6">
              <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-primary/10">
                <div className="text-center">
                  <Star className="h-6 w-6 text-amber-500 mx-auto mb-1 fill-current" />
                  <span className="text-3xl font-bold">{mockPerformance.overall}</span>
                  <span className="text-sm text-muted-foreground">/5.0</span>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Reliability</span>
                  <span className="font-medium">{mockPerformance.reliability}</span>
                </div>
                <Progress value={mockPerformance.reliability * 20} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Communication</span>
                  <span className="font-medium">{mockPerformance.communication}</span>
                </div>
                <Progress value={mockPerformance.communication * 20} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">On-Time Delivery</span>
                  <span className="font-medium">{mockPerformance.onTime}</span>
                </div>
                <Progress value={mockPerformance.onTime * 20} className="h-2" />
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
              View All
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockAvailableLoads.map((load) => (
                <div
                  key={load.id}
                  className="p-4 rounded-lg bg-muted/50 hover-elevate cursor-pointer"
                  onClick={() => navigate("/carrier/loads")}
                  data-testid={`recommended-load-${load.id}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{load.route}</span>
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 no-default-hover-elevate no-default-active-elevate">
                      {load.matchScore}% match
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{load.distance} miles</span>
                    <span className="font-semibold text-foreground">${load.price.toLocaleString()}</span>
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
              View All
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockActiveTrips.map((trip) => (
                <div
                  key={trip.id}
                  className="p-4 rounded-lg bg-muted/50 hover-elevate cursor-pointer"
                  onClick={() => navigate("/carrier/trips")}
                  data-testid={`active-trip-${trip.id}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{trip.route}</span>
                    <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">
                      ETA: {trip.eta}
                    </Badge>
                  </div>
                  <Progress value={trip.progress} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-2">{trip.progress}% complete</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
