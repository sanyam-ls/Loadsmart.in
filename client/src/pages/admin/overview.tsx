import { Users, Package, Truck, DollarSign, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/components/stat-card";
import { 
  AreaChart, 
  Area, 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const mockStats = {
  totalUsers: 1247,
  activeLoads: 342,
  verifiedCarriers: 89,
  monthlyVolume: 2450000,
};

const mockVolumeData = [
  { month: "Jan", volume: 1800000 },
  { month: "Feb", volume: 2100000 },
  { month: "Mar", volume: 1950000 },
  { month: "Apr", volume: 2300000 },
  { month: "May", volume: 2500000 },
  { month: "Jun", volume: 2450000 },
];

const mockUserGrowth = [
  { month: "Jan", shippers: 180, carriers: 45 },
  { month: "Feb", shippers: 210, carriers: 52 },
  { month: "Mar", shippers: 245, carriers: 58 },
  { month: "Apr", shippers: 280, carriers: 68 },
  { month: "May", shippers: 320, carriers: 78 },
  { month: "Jun", shippers: 356, carriers: 89 },
];

const mockLoadDistribution = [
  { name: "Completed", value: 245, color: "hsl(142, 76%, 36%)" },
  { name: "In Transit", value: 67, color: "hsl(217, 91%, 48%)" },
  { name: "Pending", value: 30, color: "hsl(48, 96%, 53%)" },
];

const mockRecentActivity = [
  { id: "a1", type: "user", message: "New carrier registered: Swift Transport", time: "5 mins ago" },
  { id: "a2", type: "load", message: "Load #1245 marked as delivered", time: "12 mins ago" },
  { id: "a3", type: "alert", message: "Carrier verification pending: MegaHaul", time: "25 mins ago" },
  { id: "a4", type: "user", message: "New shipper registered: ABC Manufacturing", time: "1 hour ago" },
  { id: "a5", type: "load", message: "New load posted: LA to Phoenix", time: "2 hours ago" },
];

export default function AdminOverview() {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Platform overview and key metrics.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={mockStats.totalUsers.toLocaleString()}
          icon={Users}
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard
          title="Active Loads"
          value={mockStats.activeLoads}
          icon={Package}
          trend={{ value: 8, isPositive: true }}
        />
        <StatCard
          title="Verified Carriers"
          value={mockStats.verifiedCarriers}
          icon={Truck}
          subtitle="94% verification rate"
        />
        <StatCard
          title="Monthly Volume"
          value={`$${(mockStats.monthlyVolume / 1000000).toFixed(1)}M`}
          icon={DollarSign}
          trend={{ value: 15, isPositive: true }}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
            <CardTitle className="text-lg">Transaction Volume</CardTitle>
            <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">
              <TrendingUp className="h-3 w-3 mr-1" />
              +15% vs last month
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockVolumeData}>
                  <defs>
                    <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(217, 91%, 48%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(217, 91%, 48%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(value) => `$${value / 1000000}M`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [`$${(value / 1000000).toFixed(2)}M`, "Volume"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="volume"
                    stroke="hsl(217, 91%, 48%)"
                    fillOpacity={1}
                    fill="url(#colorVolume)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Load Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={mockLoadDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {mockLoadDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-4">
              {mockLoadDistribution.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span>{item.name}</span>
                  </div>
                  <span className="font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">User Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockUserGrowth}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="shippers" fill="hsl(217, 91%, 48%)" radius={[4, 4, 0, 0]} name="Shippers" />
                  <Bar dataKey="carriers" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} name="Carriers" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockRecentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0 ${
                    activity.type === "alert" 
                      ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                      : activity.type === "user"
                        ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                        : "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                  }`}>
                    {activity.type === "alert" ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : activity.type === "user" ? (
                      <Users className="h-4 w-4" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{activity.message}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
