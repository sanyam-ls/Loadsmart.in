import { useLocation } from "wouter";
import { Users, Package, Truck, DollarSign, TrendingUp, AlertTriangle, CheckCircle, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TransactionVolumeChart } from "@/components/transaction-volume-chart";
import { 
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
import { useTheme } from "@/lib/theme-provider";

const mockStats = {
  totalUsers: 1247,
  activeLoads: 342,
  verifiedCarriers: 89,
  monthlyVolume: 2450000,
};

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

interface ClickableStatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: { value: number; isPositive: boolean };
  subtitle?: string;
  href: string;
  testId: string;
}

function ClickableStatCard({ title, value, icon: Icon, trend, subtitle, href, testId }: ClickableStatCardProps) {
  const [, setLocation] = useLocation();
  
  return (
    <Card 
      className="cursor-pointer transition-all hover-elevate group"
      onClick={() => setLocation(href)}
      data-testid={testId}
    >
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold">{value}</p>
              {trend && (
                <Badge 
                  variant="secondary" 
                  className={`mt-1 text-xs ${trend.isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                >
                  <TrendingUp className={`h-3 w-3 mr-1 ${!trend.isPositive ? "rotate-180" : ""}`} />
                  {trend.isPositive ? "+" : ""}{trend.value}%
                </Badge>
              )}
              {subtitle && (
                <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
              )}
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminOverview() {
  const [, setLocation] = useLocation();
  const { theme } = useTheme();

  const chartAxisColor = theme === "dark" ? "hsl(220, 10%, 65%)" : "hsl(220, 12%, 35%)";
  const chartGridColor = theme === "dark" ? "hsl(220, 12%, 18%)" : "hsl(220, 12%, 92%)";

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Platform overview and key metrics. Click any tile to manage.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ClickableStatCard
          title="Total Users"
          value={mockStats.totalUsers.toLocaleString()}
          icon={Users}
          trend={{ value: 12, isPositive: true }}
          href="/admin/users"
          testId="card-total-users"
        />
        <ClickableStatCard
          title="Active Loads"
          value={mockStats.activeLoads}
          icon={Package}
          trend={{ value: 8, isPositive: true }}
          href="/admin/loads"
          testId="card-active-loads"
        />
        <ClickableStatCard
          title="Verified Carriers"
          value={mockStats.verifiedCarriers}
          icon={Truck}
          subtitle="94% verification rate"
          href="/admin/carriers"
          testId="card-verified-carriers"
        />
        <ClickableStatCard
          title="Monthly Volume"
          value={`$${(mockStats.monthlyVolume / 1000000).toFixed(1)}M`}
          icon={DollarSign}
          trend={{ value: 15, isPositive: true }}
          href="/admin/volume"
          testId="card-monthly-volume"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <TransactionVolumeChart />

        <Card 
          className="cursor-pointer hover-elevate"
          onClick={() => setLocation("/admin/loads")}
          data-testid="card-load-status"
        >
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Load Status</CardTitle>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
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
                      backgroundColor: theme === "dark" ? "hsl(220, 14%, 10%)" : "hsl(0, 0%, 100%)",
                      border: `1px solid ${chartGridColor}`,
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
        <Card 
          className="cursor-pointer hover-elevate"
          onClick={() => setLocation("/admin/users")}
          data-testid="card-user-growth"
        >
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">User Growth</CardTitle>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockUserGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: chartAxisColor, fontSize: 12 }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: chartAxisColor, fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme === "dark" ? "hsl(220, 14%, 10%)" : "hsl(0, 0%, 100%)",
                      border: `1px solid ${chartGridColor}`,
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

        <Card data-testid="card-recent-activity">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Recent Activity</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setLocation("/admin/users")}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockRecentActivity.map((activity) => (
                <div 
                  key={activity.id} 
                  className="flex items-start gap-3 cursor-pointer p-2 -mx-2 rounded-lg hover-elevate"
                  onClick={() => {
                    if (activity.type === "user") setLocation("/admin/users");
                    else if (activity.type === "load") setLocation("/admin/loads");
                    else setLocation("/admin/carriers");
                  }}
                  data-testid={`activity-${activity.id}`}
                >
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
