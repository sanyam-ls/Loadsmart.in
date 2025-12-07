import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  ChevronLeft, DollarSign, TrendingUp, TrendingDown, Download, Filter,
  Calendar, Package, Truck, MapPin, Building, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { 
  AreaChart, 
  Area, 
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useTheme } from "@/lib/theme-provider";
import type { Load, User } from "@shared/schema";

const monthlySpendData = [
  { month: "Jan", amount: 32000, loads: 12 },
  { month: "Feb", amount: 38000, loads: 15 },
  { month: "Mar", amount: 35000, loads: 14 },
  { month: "Apr", amount: 42000, loads: 18 },
  { month: "May", amount: 48000, loads: 21 },
  { month: "Jun", amount: 45200, loads: 19 },
  { month: "Jul", amount: 52000, loads: 23 },
  { month: "Aug", amount: 49000, loads: 20 },
  { month: "Sep", amount: 55000, loads: 25 },
  { month: "Oct", amount: 58000, loads: 27 },
  { month: "Nov", amount: 61000, loads: 28 },
  { month: "Dec", amount: 64000, loads: 30 },
];

const carrierSpendData = [
  { name: "FastHaul Logistics", value: 125000, color: "hsl(217, 91%, 48%)" },
  { name: "Swift Transport", value: 98000, color: "hsl(217, 91%, 58%)" },
  { name: "Premier Freight", value: 76000, color: "hsl(217, 91%, 68%)" },
  { name: "MegaHaul Inc", value: 54000, color: "hsl(217, 91%, 78%)" },
  { name: "Others", value: 42000, color: "hsl(220, 12%, 50%)" },
];

const routeSpendData = [
  { route: "LA - Phoenix", amount: 85000, loads: 42 },
  { route: "Chicago - Detroit", amount: 72000, loads: 38 },
  { route: "Dallas - Houston", amount: 65000, loads: 35 },
  { route: "Atlanta - Miami", amount: 58000, loads: 30 },
  { route: "NY - Boston", amount: 45000, loads: 25 },
];

const loadTypeSpendData = [
  { type: "Dry Van", amount: 180000, percentage: 45 },
  { type: "Flatbed", amount: 120000, percentage: 30 },
  { type: "Refrigerated", amount: 60000, percentage: 15 },
  { type: "Tanker", amount: 40000, percentage: 10 },
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
}

function formatDate(date: Date | string | null) {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function SpendAnalyticsPage() {
  const [, navigate] = useLocation();
  const { theme } = useTheme();
  const [dateRange, setDateRange] = useState("12m");
  const [activeTab, setActiveTab] = useState("overview");

  const { data: loads = [], isLoading } = useQuery<Load[]>({
    queryKey: ["/api/loads"],
  });

  const { data: carriers = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const deliveredLoads = useMemo(() => 
    loads.filter(l => l.status === "delivered" && l.finalPrice),
    [loads]
  );

  const totalSpend = useMemo(() => 
    deliveredLoads.reduce((sum, l) => sum + Number(l.finalPrice || 0), 0),
    [deliveredLoads]
  );

  const currentMonthSpend = useMemo(() => {
    const now = new Date();
    return deliveredLoads
      .filter(l => l.deliveryDate && new Date(l.deliveryDate).getMonth() === now.getMonth())
      .reduce((sum, l) => sum + Number(l.finalPrice || 0), 0);
  }, [deliveredLoads]);

  const avgLoadCost = useMemo(() => 
    deliveredLoads.length > 0 ? totalSpend / deliveredLoads.length : 0,
    [deliveredLoads, totalSpend]
  );

  const getCarrierName = (carrierId: string | null) => {
    if (!carrierId) return "Unassigned";
    const carrier = carriers.find(c => c.id === carrierId);
    return carrier?.companyName || carrier?.username || "Unknown";
  };

  const chartColors = {
    primary: "hsl(217, 91%, 48%)",
    secondary: "hsl(220, 12%, 50%)",
    grid: theme === "dark" ? "hsl(220, 12%, 18%)" : "hsl(220, 12%, 92%)",
    text: theme === "dark" ? "hsl(220, 12%, 70%)" : "hsl(220, 12%, 40%)",
  };

  const topExpensiveLoads = useMemo(() => 
    [...deliveredLoads].sort((a, b) => Number(b.finalPrice || 0) - Number(a.finalPrice || 0)).slice(0, 5),
    [deliveredLoads]
  );

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Skeleton className="h-10 w-64 mb-6" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/shipper")} data-testid="button-back">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Monthly Spend Analytics</h1>
          <p className="text-muted-foreground">Detailed breakdown of your shipping expenses</p>
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-36" data-testid="select-date-range">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3m">Last 3 months</SelectItem>
            <SelectItem value="6m">Last 6 months</SelectItem>
            <SelectItem value="12m">Last 12 months</SelectItem>
            <SelectItem value="ytd">Year to date</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" data-testid="button-export">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Spend</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(totalSpend || 579000)}</p>
                <div className="flex items-center gap-1 mt-2 text-sm text-green-600 dark:text-green-400">
                  <TrendingUp className="h-4 w-4" />
                  <span>+12% vs last year</span>
                </div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(currentMonthSpend || 64000)}</p>
                <div className="flex items-center gap-1 mt-2 text-sm text-red-600 dark:text-red-400">
                  <TrendingDown className="h-4 w-4" />
                  <span>+5% vs last month</span>
                </div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                <Calendar className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Load Cost</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(avgLoadCost || 2850)}</p>
                <p className="text-xs text-muted-foreground mt-2">{deliveredLoads.length || 203} total loads</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                <Package className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Top Carrier</p>
                <p className="text-lg font-bold mt-1 truncate">FastHaul Logistics</p>
                <p className="text-xs text-muted-foreground mt-2">{formatCurrency(125000)} spent</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                <Truck className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="by-carrier">By Carrier</TabsTrigger>
          <TabsTrigger value="by-route">By Route</TabsTrigger>
          <TabsTrigger value="by-type">By Load Type</TabsTrigger>
          <TabsTrigger value="details">Detailed Table</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle className="text-lg">12-Month Spend Trend</CardTitle>
              <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">
                <TrendingUp className="h-3 w-3 mr-1" />
                +18% YoY
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlySpendData}>
                    <defs>
                      <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                    <XAxis dataKey="month" stroke={chartColors.text} fontSize={12} />
                    <YAxis stroke={chartColors.text} fontSize={12} tickFormatter={(v) => `$${v/1000}k`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: theme === "dark" ? "hsl(220, 12%, 8%)" : "white",
                        border: `1px solid ${chartColors.grid}`,
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [formatCurrency(value), "Spend"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      stroke={chartColors.primary}
                      fillOpacity={1}
                      fill="url(#colorSpend)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Spend by Carrier</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={carrierSpendData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {carrierSpendData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top 5 Most Expensive Loads</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(topExpensiveLoads.length > 0 ? topExpensiveLoads : [
                    { id: "1", pickupCity: "LA, CA", dropoffCity: "Miami, FL", finalPrice: 8500 },
                    { id: "2", pickupCity: "Seattle, WA", dropoffCity: "NYC, NY", finalPrice: 7200 },
                    { id: "3", pickupCity: "Chicago, IL", dropoffCity: "Phoenix, AZ", finalPrice: 6800 },
                    { id: "4", pickupCity: "Dallas, TX", dropoffCity: "Boston, MA", finalPrice: 6200 },
                    { id: "5", pickupCity: "Denver, CO", dropoffCity: "Atlanta, GA", finalPrice: 5800 },
                  ]).map((load, i) => (
                    <div 
                      key={load.id} 
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover-elevate cursor-pointer"
                      onClick={() => navigate(`/shipper/loads/${load.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
                          {i + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{load.pickupCity} → {load.dropoffCity}</p>
                          <p className="text-xs text-muted-foreground">Load #{load.id.slice(0, 8)}</p>
                        </div>
                      </div>
                      <span className="font-semibold">{formatCurrency(Number(load.finalPrice))}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="by-carrier">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Spend by Carrier</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80 mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={carrierSpendData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                    <XAxis type="number" stroke={chartColors.text} fontSize={12} tickFormatter={(v) => `$${v/1000}k`} />
                    <YAxis type="category" dataKey="name" stroke={chartColors.text} fontSize={12} width={120} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="value" fill={chartColors.primary} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Carrier</TableHead>
                    <TableHead>Total Spend</TableHead>
                    <TableHead>Loads</TableHead>
                    <TableHead>Avg per Load</TableHead>
                    <TableHead>% of Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {carrierSpendData.map((carrier) => (
                    <TableRow key={carrier.name}>
                      <TableCell className="font-medium">{carrier.name}</TableCell>
                      <TableCell>{formatCurrency(carrier.value)}</TableCell>
                      <TableCell>{Math.floor(carrier.value / 2500)}</TableCell>
                      <TableCell>{formatCurrency(2500)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">
                          {Math.round(carrier.value / 395000 * 100)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="by-route">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Spend by Route</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80 mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={routeSpendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                    <XAxis dataKey="route" stroke={chartColors.text} fontSize={12} />
                    <YAxis stroke={chartColors.text} fontSize={12} tickFormatter={(v) => `$${v/1000}k`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="amount" fill={chartColors.primary} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Route</TableHead>
                    <TableHead>Total Spend</TableHead>
                    <TableHead>Loads</TableHead>
                    <TableHead>Avg per Load</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {routeSpendData.map((route) => (
                    <TableRow key={route.route}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          {route.route}
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(route.amount)}</TableCell>
                      <TableCell>{route.loads}</TableCell>
                      <TableCell>{formatCurrency(Math.round(route.amount / route.loads))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="by-type">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Spend by Load Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={loadTypeSpendData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="amount"
                        label={({ type, percentage }) => `${type}: ${percentage}%`}
                      >
                        {loadTypeSpendData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={`hsl(217, 91%, ${48 + index * 10}%)`} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-4">
                  {loadTypeSpendData.map((type, i) => (
                    <div key={type.type} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: `hsl(217, 91%, ${48 + i * 10}%)` }}
                        />
                        <span className="font-medium">{type.type}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(type.amount)}</p>
                        <p className="text-xs text-muted-foreground">{type.percentage}% of total</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle className="text-lg">Detailed Expense Table</CardTitle>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Load ID</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Carrier</TableHead>
                    <TableHead>Load Type</TableHead>
                    <TableHead>Bid Price</TableHead>
                    <TableHead>Total Cost</TableHead>
                    <TableHead>Delivery Date</TableHead>
                    <TableHead>Payment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(deliveredLoads.length > 0 ? deliveredLoads.slice(0, 10) : [
                    { id: "demo1", pickupCity: "LA, CA", dropoffCity: "Phoenix, AZ", assignedCarrierId: null, requiredTruckType: "Dry Van", estimatedPrice: 2400, finalPrice: 2500, deliveryDate: new Date() },
                    { id: "demo2", pickupCity: "Chicago, IL", dropoffCity: "Detroit, MI", assignedCarrierId: null, requiredTruckType: "Flatbed", estimatedPrice: 1800, finalPrice: 1900, deliveryDate: new Date() },
                    { id: "demo3", pickupCity: "Dallas, TX", dropoffCity: "Houston, TX", assignedCarrierId: null, requiredTruckType: "Refrigerated", estimatedPrice: 1200, finalPrice: 1250, deliveryDate: new Date() },
                  ]).map((load) => (
                    <TableRow 
                      key={load.id}
                      className="cursor-pointer hover-elevate"
                      onClick={() => navigate(`/shipper/loads/${load.id}`)}
                    >
                      <TableCell className="font-mono text-sm">{load.id.slice(0, 8)}</TableCell>
                      <TableCell>
                        <span className="truncate max-w-32">{load.pickupCity} → {load.dropoffCity}</span>
                      </TableCell>
                      <TableCell>{getCarrierName(load.assignedCarrierId)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate">
                          {load.requiredTruckType || "Dry Van"}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(Number(load.estimatedPrice || 0))}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(Number(load.finalPrice || 0))}</TableCell>
                      <TableCell>{formatDate(load.deliveryDate)}</TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 no-default-hover-elevate no-default-active-elevate">
                          Paid
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
