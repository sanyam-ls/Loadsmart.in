import { useLocation } from "wouter";
import { Users, Package, Truck, DollarSign, TrendingUp, AlertTriangle, CheckCircle, ChevronRight, RefreshCw, FileCheck, Clock, Loader2 } from "lucide-react";
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
import { useLoads, useBids, useUsers, useCarriers, useShipments, useInvoices } from "@/lib/api-hooks";
import { formatDistanceToNow } from "date-fns";
import { queryClient } from "@/lib/queryClient";
import type { Load, User } from "@shared/schema";

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
  
  const { data: loads, isLoading: loadsLoading } = useLoads();
  const { data: users, isLoading: usersLoading } = useUsers();
  const { data: carriers, isLoading: carriersLoading } = useCarriers();
  const { data: bids } = useBids();
  const { data: invoices } = useInvoices();

  const chartAxisColor = theme === "dark" ? "hsl(220, 10%, 65%)" : "hsl(220, 12%, 35%)";
  const chartGridColor = theme === "dark" ? "hsl(220, 12%, 18%)" : "hsl(220, 12%, 92%)";

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/loads'] });
    queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    queryClient.invalidateQueries({ queryKey: ['/api/carriers'] });
    queryClient.invalidateQueries({ queryKey: ['/api/bids'] });
    queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
  };

  if (loadsLoading || usersLoading || carriersLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const allLoads = loads || [];
  const allUsers = users || [];
  const allCarriers = carriers || [];
  const allBids = bids || [];
  const allInvoices = invoices || [];

  const activeStatusList = ['submitted_to_admin', 'pending_pricing', 'posted_to_carriers', 'open_for_bid', 'counter_received', 'awarded', 'invoice_sent', 'in_transit'];
  const inTransitLoads = allLoads.filter((l: Load) => l.status === 'in_transit');
  const activeLoads = allLoads.filter((l: Load) => activeStatusList.includes(l.status || ''));
  const completedLoads = allLoads.filter((l: Load) => ['delivered', 'pod_uploaded', 'carrier_invoice_submitted', 'carrier_finalized', 'closed'].includes(l.status || ''));
  const pendingLoads = allLoads.filter((l: Load) => ['submitted_to_admin', 'pending_pricing'].includes(l.status || ''));

  const verifiedCarriers = allCarriers.filter(c => c.carrierProfile?.verificationStatus === 'verified');
  
  const totalSpend = allInvoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + parseFloat(inv.totalAmount?.toString() || '0'), 0);

  const stats = {
    totalUsers: allUsers.length,
    activeLoads: activeLoads.length,
    verifiedCarriers: verifiedCarriers.length,
    monthlyVolume: totalSpend,
    monthlyChange: 12,
  };

  const pendingVerifications = allCarriers.filter(c => c.carrierProfile?.verificationStatus === 'pending').length;

  const loadDistribution = [
    { name: "Completed", value: completedLoads.length, color: "hsl(142, 76%, 36%)" },
    { name: "In Transit", value: inTransitLoads.length, color: "hsl(217, 91%, 48%)" },
    { name: "Pending", value: pendingLoads.length, color: "hsl(48, 96%, 53%)" },
  ];

  const userGrowthData = [
    { month: 'Jul', shippers: 45, carriers: 32 },
    { month: 'Aug', shippers: 52, carriers: 38 },
    { month: 'Sep', shippers: 58, carriers: 42 },
    { month: 'Oct', shippers: 65, carriers: 48 },
    { month: 'Nov', shippers: 72, carriers: 55 },
    { month: 'Dec', shippers: allUsers.filter((u: any) => u.role === 'shipper').length || 78, carriers: allUsers.filter((u: any) => u.role === 'carrier').length || 60 },
  ];

  const recentActivity = allLoads.slice(0, 8).map((load: Load, i) => ({
    id: `activity-${i}`,
    type: 'load',
    message: `Load ${load.id.slice(0, 8)} - ${load.pickupCity} to ${load.dropoffCity}`,
    timestamp: load.createdAt ? new Date(load.createdAt) : new Date(),
    severity: load.status === 'in_transit' ? 'info' : load.status === 'delivered' ? 'success' : 'warning',
  }));

  const getActivityIcon = (type: string, severity: string) => {
    if (severity === "warning") return <AlertTriangle className="h-4 w-4" />;
    if (severity === "success") return <CheckCircle className="h-4 w-4" />;
    if (severity === "error") return <AlertTriangle className="h-4 w-4" />;
    return type === "user" ? <Users className="h-4 w-4" /> : 
           type === "load" ? <Package className="h-4 w-4" /> :
           type === "carrier" ? <Truck className="h-4 w-4" /> :
           type === "document" ? <FileCheck className="h-4 w-4" /> :
           <DollarSign className="h-4 w-4" />;
  };

  const getActivityColor = (severity: string) => {
    switch (severity) {
      case "warning": return "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400";
      case "success": return "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400";
      case "error": return "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400";
      default: return "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400";
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Platform overview and key metrics. Click any tile to manage.</p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleRefresh}
          data-testid="button-refresh-data"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Sync Data
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ClickableStatCard
          title="Total Users"
          value={stats.totalUsers.toLocaleString()}
          icon={Users}
          trend={{ value: 12, isPositive: true }}
          href="/admin/users"
          testId="card-total-users"
        />
        <ClickableStatCard
          title="Active Loads"
          value={stats.activeLoads}
          icon={Package}
          trend={{ value: 8, isPositive: true }}
          href="/admin/loads"
          testId="card-active-loads"
        />
        <ClickableStatCard
          title="Verified Carriers"
          value={stats.verifiedCarriers}
          icon={Truck}
          subtitle={allCarriers.length > 0 ? `${Math.round((stats.verifiedCarriers / allCarriers.length) * 100)}% verification rate` : '0% verification rate'}
          href="/admin/carriers"
          testId="card-verified-carriers"
        />
        <ClickableStatCard
          title="Monthly Volume"
          value={`Rs. ${(stats.monthlyVolume / 100000).toFixed(1)}L`}
          icon={DollarSign}
          trend={{ value: stats.monthlyChange, isPositive: stats.monthlyChange > 0 }}
          href="/admin/volume"
          testId="card-monthly-volume"
        />
      </div>

      {pendingVerifications > 0 && (
        <Card 
          className="border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-900/10 cursor-pointer hover-elevate"
          onClick={() => setLocation("/admin/verification")}
          data-testid="card-pending-verifications"
        >
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                  <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="font-medium">Pending Verifications</p>
                  <p className="text-sm text-muted-foreground">{pendingVerifications} items require your attention</p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                Review Now
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <TransactionVolumeChart />

        <Card 
          className="cursor-pointer hover-elevate"
          onClick={() => setLocation("/admin/loads")}
          data-testid="card-load-status"
        >
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Load Status Distribution</CardTitle>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={loadDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {loadDistribution.map((entry, index) => (
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
              {loadDistribution.map((item) => (
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
                <BarChart data={userGrowthData}>
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
              <Badge variant="secondary" className="text-xs">
                Live
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-72 overflow-y-auto">
              {recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
              ) : (
                recentActivity.map((activity) => (
                  <div 
                    key={activity.id} 
                    className="flex items-start gap-3 cursor-pointer p-2 -mx-2 rounded-lg hover-elevate"
                    onClick={() => {
                      if (activity.type === "user") setLocation("/admin/users");
                      else if (activity.type === "load") setLocation("/admin/loads");
                      else if (activity.type === "carrier") setLocation("/admin/carriers");
                      else if (activity.type === "document") setLocation("/admin/verification");
                      else setLocation("/admin/volume");
                    }}
                    data-testid={`activity-${activity.id}`}
                  >
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0 ${getActivityColor(activity.severity)}`}>
                      {getActivityIcon(activity.type, activity.severity)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{activity.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card 
          className="cursor-pointer hover-elevate"
          onClick={() => setLocation("/admin/users")}
          data-testid="card-user-breakdown"
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-base">User Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Shippers</span>
                <span className="font-medium">{allUsers.filter((u: any) => u.role === "shipper").length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Carriers</span>
                <span className="font-medium">{allUsers.filter((u: any) => u.role === "carrier").length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Dispatchers</span>
                <span className="font-medium">{allUsers.filter((u: any) => u.role === "dispatcher").length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Admins</span>
                <span className="font-medium">{allUsers.filter((u: any) => u.role === "admin").length}</span>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Active Users</span>
                  <Badge variant="secondary">{allUsers.filter((u: any) => u.isActive).length}</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover-elevate"
          onClick={() => setLocation("/admin/carriers")}
          data-testid="card-carrier-status"
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Carrier Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Verified</span>
                <Badge className="bg-green-600">{verifiedCarriers.length}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pending</span>
                <Badge variant="secondary">{pendingVerifications}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Carriers</span>
                <span className="font-medium">{allCarriers.length}</span>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Avg. Rating</span>
                  <Badge variant="secondary">
                    {allCarriers.length > 0 
                      ? (allCarriers.reduce((sum: number, c: any) => sum + (c.carrierProfile?.rating || 0), 0) / allCarriers.length).toFixed(1)
                      : '0.0'
                    }
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover-elevate"
          onClick={() => setLocation("/admin/loads")}
          data-testid="card-load-summary"
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Load Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Loads</span>
                <span className="font-medium">{allLoads.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active Bids</span>
                <span className="font-medium">{allBids.filter((b: any) => b.status === 'pending').length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">In Transit</span>
                <Badge className="bg-blue-600">{inTransitLoads.length}</Badge>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Volume</span>
                  <Badge variant="secondary">
                    Rs. {(allLoads.reduce((sum: number, l: Load) => sum + parseFloat(l.adminPrice || '0'), 0) / 100000).toFixed(1)}L
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
