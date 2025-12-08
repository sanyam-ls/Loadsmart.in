import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  ChevronLeft,
  Calendar,
  Package,
  Users,
  Truck,
  MapPin,
  Building,
  Filter,
  Download,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useTheme } from "@/lib/theme-provider";

interface MonthlyVolumeData {
  month: string;
  fullMonth: string;
  volume: number;
  loads: number;
  avgLoadPrice: number;
  topRoutes: { route: string; volume: number; loads: number }[];
  topShippers: { name: string; volume: number; loads: number }[];
  topCarriers: { name: string; volume: number; loads: number }[];
}

const generateMockVolumeData = (): MonthlyVolumeData[] => {
  const months = [
    { short: "Jan", full: "January 2024" },
    { short: "Feb", full: "February 2024" },
    { short: "Mar", full: "March 2024" },
    { short: "Apr", full: "April 2024" },
    { short: "May", full: "May 2024" },
    { short: "Jun", full: "June 2024" },
    { short: "Jul", full: "July 2024" },
    { short: "Aug", full: "August 2024" },
    { short: "Sep", full: "September 2024" },
    { short: "Oct", full: "October 2024" },
    { short: "Nov", full: "November 2024" },
    { short: "Dec", full: "December 2024" },
  ];

  const routes = [
    "Los Angeles - Phoenix",
    "Chicago - Detroit",
    "Dallas - Houston",
    "Atlanta - Miami",
    "New York - Boston",
    "Seattle - Portland",
    "Denver - Salt Lake City",
  ];

  const shippers = ["ABC Manufacturing", "XYZ Corp", "Global Imports", "FastRetail Inc", "MegaStore LLC"];
  const carriers = ["Swift Transport", "MegaHaul Inc", "FastFreight", "Reliable Logistics", "Express Carriers"];

  return months.map((m, i) => {
    const baseVolume = 1800000 + Math.random() * 800000 + (i * 100000);
    const loads = Math.round(150 + Math.random() * 100 + (i * 8));
    
    return {
      month: m.short,
      fullMonth: m.full,
      volume: Math.round(baseVolume),
      loads,
      avgLoadPrice: Math.round(baseVolume / loads),
      topRoutes: routes.slice(0, 5).map((route, idx) => ({
        route,
        volume: Math.round((baseVolume * (0.25 - idx * 0.04)) + Math.random() * 50000),
        loads: Math.round((loads * (0.25 - idx * 0.04)) + Math.random() * 10),
      })).sort((a, b) => b.volume - a.volume),
      topShippers: shippers.map((name, idx) => ({
        name,
        volume: Math.round((baseVolume * (0.3 - idx * 0.05)) + Math.random() * 80000),
        loads: Math.round((loads * (0.3 - idx * 0.05)) + Math.random() * 15),
      })).sort((a, b) => b.volume - a.volume),
      topCarriers: carriers.map((name, idx) => ({
        name,
        volume: Math.round((baseVolume * (0.28 - idx * 0.04)) + Math.random() * 70000),
        loads: Math.round((loads * (0.28 - idx * 0.04)) + Math.random() * 12),
      })).sort((a, b) => b.volume - a.volume),
    };
  });
};

const fullYearData = generateMockVolumeData();

const routeBreakdown = [
  { name: "LA - Phoenix", value: 4250000, color: "hsl(217, 91%, 48%)" },
  { name: "Chicago - Detroit", value: 3800000, color: "hsl(217, 91%, 58%)" },
  { name: "Dallas - Houston", value: 3200000, color: "hsl(217, 91%, 68%)" },
  { name: "Atlanta - Miami", value: 2900000, color: "hsl(217, 91%, 78%)" },
  { name: "Other Routes", value: 5850000, color: "hsl(220, 12%, 50%)" },
];

const loadTypeBreakdown = [
  { name: "Dry Van", value: 8500000, color: "hsl(217, 91%, 48%)" },
  { name: "Flatbed", value: 4200000, color: "hsl(142, 76%, 36%)" },
  { name: "Refrigerated", value: 3100000, color: "hsl(48, 96%, 53%)" },
  { name: "Tanker", value: 2200000, color: "hsl(280, 70%, 50%)" },
  { name: "Container", value: 2000000, color: "hsl(340, 75%, 55%)" },
];

type TimeRange = "30d" | "90d" | "1y" | "custom";

export default function AdminVolumeAnalytics() {
  const [, setLocation] = useLocation();
  const { theme } = useTheme();
  const [timeRange, setTimeRange] = useState<TimeRange>("1y");
  const [selectedMonth, setSelectedMonth] = useState<MonthlyVolumeData | null>(null);

  const filteredData = useMemo(() => {
    switch (timeRange) {
      case "30d":
        return fullYearData.slice(-1);
      case "90d":
        return fullYearData.slice(-3);
      case "1y":
      case "custom":
      default:
        return fullYearData;
    }
  }, [timeRange]);

  const totalVolume = filteredData.reduce((sum, d) => sum + d.volume, 0);
  const totalLoads = filteredData.reduce((sum, d) => sum + d.loads, 0);
  const avgLoadPrice = totalVolume / totalLoads;
  
  const currentMonth = filteredData[filteredData.length - 1];
  const previousMonth = filteredData[filteredData.length - 2];
  const monthlyGrowth = previousMonth 
    ? ((currentMonth.volume - previousMonth.volume) / previousMonth.volume * 100) 
    : 0;

  const chartColors = {
    stroke: theme === "dark" ? "hsl(217, 91%, 65%)" : "hsl(217, 91%, 48%)",
    fill: theme === "dark" ? "hsl(217, 91%, 65%)" : "hsl(217, 91%, 48%)",
    bar: theme === "dark" ? "hsl(217, 91%, 55%)" : "hsl(217, 91%, 48%)",
    bar2: theme === "dark" ? "hsl(142, 76%, 50%)" : "hsl(142, 76%, 36%)",
  };

  const formatCurrency = (value: number) => {
    if (value >= 10000000) {
      return `Rs. ${(value / 10000000).toFixed(2)}Cr`;
    }
    if (value >= 100000) {
      return `Rs. ${(value / 100000).toFixed(1)}L`;
    }
    return `Rs. ${(value / 1000).toFixed(0)}K`;
  };

  const handleChartClick = (data: any) => {
    if (data?.activePayload?.[0]) {
      const monthData = fullYearData.find(d => d.month === data.activePayload[0].payload.month);
      if (monthData) {
        setSelectedMonth(monthData);
      }
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setLocation("/admin")}
              data-testid="button-back-to-dashboard"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">Volume Analytics</h1>
          </div>
          <p className="text-muted-foreground ml-10">Detailed breakdown of transaction volume and revenue</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <SelectTrigger className="w-[160px]" data-testid="select-time-range">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="1y">This Year</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" data-testid="button-export">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card 
          className="cursor-pointer hover-elevate transition-all"
          onClick={() => setLocation("/admin/revenue/sources")}
          data-testid="card-total-volume"
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Total Volume</p>
                <p className="text-2xl font-bold">{formatCurrency(totalVolume)}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
            </div>
            <Badge 
              variant="secondary" 
              className={`mt-2 ${monthlyGrowth >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
            >
              {monthlyGrowth >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
              {monthlyGrowth >= 0 ? "+" : ""}{monthlyGrowth.toFixed(1)}% vs last month
            </Badge>
            <p className="text-xs text-primary mt-2 flex items-center gap-1">
              Click to view detailed breakdown
            </p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover-elevate transition-all"
          onClick={() => setLocation("/admin/revenue/transactions")}
          data-testid="card-total-loads"
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Total Loads</p>
                <p className="text-2xl font-bold">{totalLoads.toLocaleString()}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-green-500" />
              </div>
            </div>
            <p className="text-xs text-primary mt-2 flex items-center gap-1">
              Click to view all transactions
            </p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover-elevate transition-all"
          onClick={() => setLocation("/admin/revenue/timeline")}
          data-testid="card-avg-load-price"
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Avg Load Price</p>
                <p className="text-2xl font-bold">{formatCurrency(avgLoadPrice)}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-amber-500" />
              </div>
            </div>
            <p className="text-xs text-primary mt-2 flex items-center gap-1">
              Click to view pricing trends
            </p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover-elevate transition-all"
          onClick={() => setLocation("/admin/revenue/profitability")}
          data-testid="card-active-months"
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Active Months</p>
                <p className="text-2xl font-bold">{filteredData.length}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-purple-500" />
              </div>
            </div>
            <p className="text-xs text-primary mt-2 flex items-center gap-1">
              Click for profitability insights
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Volume Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart 
                  data={filteredData}
                  onClick={handleChartClick}
                  style={{ cursor: "pointer" }}
                >
                  <defs>
                    <linearGradient id="colorVolumeAnalytics" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartColors.fill} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={chartColors.fill} stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke={theme === "dark" ? "hsl(220, 12%, 18%)" : "hsl(220, 12%, 92%)"} 
                    vertical={false}
                  />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: theme === "dark" ? "hsl(220, 10%, 65%)" : "hsl(220, 12%, 35%)", fontSize: 12 }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: theme === "dark" ? "hsl(220, 10%, 65%)" : "hsl(220, 12%, 35%)", fontSize: 12 }}
                    tickFormatter={(value) => `Rs. ${(value / 10000000).toFixed(1)}Cr`}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: theme === "dark" ? "hsl(220, 14%, 10%)" : "hsl(0, 0%, 100%)",
                      border: `1px solid ${theme === "dark" ? "hsl(220, 12%, 18%)" : "hsl(220, 12%, 92%)"}`,
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [formatCurrency(value), "Volume"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="volume"
                    stroke={chartColors.stroke}
                    fillOpacity={1}
                    fill="url(#colorVolumeAnalytics)"
                    strokeWidth={2}
                    dot={{ fill: chartColors.fill, strokeWidth: 2, r: 4, cursor: "pointer" }}
                    activeDot={{ r: 6, cursor: "pointer" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Click on a data point to see detailed breakdown
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Volume by Load Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={loadTypeBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {loadTypeBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: theme === "dark" ? "hsl(220, 14%, 10%)" : "hsl(0, 0%, 100%)",
                      border: `1px solid ${theme === "dark" ? "hsl(220, 12%, 18%)" : "hsl(220, 12%, 92%)"}`,
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [formatCurrency(value), "Volume"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-2">
              {loadTypeBreakdown.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span>{item.name}</span>
                  </div>
                  <span className="font-medium">{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedMonth && (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{selectedMonth.fullMonth} Breakdown</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSelectedMonth(null)}>
                Clear Selection
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3 mb-6">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold">{formatCurrency(selectedMonth.volume)}</div>
                <div className="text-sm text-muted-foreground">Total Volume</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold">{selectedMonth.loads}</div>
                <div className="text-sm text-muted-foreground">Completed Loads</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold">{formatCurrency(selectedMonth.avgLoadPrice)}</div>
                <div className="text-sm text-muted-foreground">Avg Load Price</div>
              </div>
            </div>

            <Tabs defaultValue="routes">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="routes">
                  <MapPin className="h-4 w-4 mr-2" />
                  Top Routes
                </TabsTrigger>
                <TabsTrigger value="shippers">
                  <Building className="h-4 w-4 mr-2" />
                  Top Shippers
                </TabsTrigger>
                <TabsTrigger value="carriers">
                  <Truck className="h-4 w-4 mr-2" />
                  Top Carriers
                </TabsTrigger>
              </TabsList>
              <TabsContent value="routes" className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Route</TableHead>
                      <TableHead className="text-right">Volume</TableHead>
                      <TableHead className="text-right">Loads</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedMonth.topRoutes.map((route, idx) => (
                      <TableRow key={idx} className="cursor-pointer" onClick={() => setLocation("/admin/loads")}>
                        <TableCell className="font-medium">{route.route}</TableCell>
                        <TableCell className="text-right">{formatCurrency(route.volume)}</TableCell>
                        <TableCell className="text-right">{route.loads}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
              <TabsContent value="shippers" className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Shipper</TableHead>
                      <TableHead className="text-right">Volume</TableHead>
                      <TableHead className="text-right">Loads</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedMonth.topShippers.map((shipper, idx) => (
                      <TableRow key={idx} className="cursor-pointer" onClick={() => setLocation("/admin/users")}>
                        <TableCell className="font-medium">{shipper.name}</TableCell>
                        <TableCell className="text-right">{formatCurrency(shipper.volume)}</TableCell>
                        <TableCell className="text-right">{shipper.loads}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
              <TabsContent value="carriers" className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Carrier</TableHead>
                      <TableHead className="text-right">Volume</TableHead>
                      <TableHead className="text-right">Loads</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedMonth.topCarriers.map((carrier, idx) => (
                      <TableRow key={idx} className="cursor-pointer" onClick={() => setLocation("/admin/carriers")}>
                        <TableCell className="font-medium">{carrier.name}</TableCell>
                        <TableCell className="text-right">{formatCurrency(carrier.volume)}</TableCell>
                        <TableCell className="text-right">{carrier.loads}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Volume by Route</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={routeBreakdown} layout="vertical">
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke={theme === "dark" ? "hsl(220, 12%, 18%)" : "hsl(220, 12%, 92%)"} 
                    horizontal={false}
                  />
                  <XAxis 
                    type="number" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: theme === "dark" ? "hsl(220, 10%, 65%)" : "hsl(220, 12%, 35%)", fontSize: 12 }}
                    tickFormatter={(value) => `Rs. ${(value / 10000000).toFixed(1)}Cr`}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: theme === "dark" ? "hsl(220, 10%, 65%)" : "hsl(220, 12%, 35%)", fontSize: 12 }}
                    width={100}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: theme === "dark" ? "hsl(220, 14%, 10%)" : "hsl(0, 0%, 100%)",
                      border: `1px solid ${theme === "dark" ? "hsl(220, 12%, 18%)" : "hsl(220, 12%, 92%)"}`,
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [formatCurrency(value), "Volume"]}
                  />
                  <Bar dataKey="value" fill={chartColors.bar} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Monthly Loads Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredData}>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke={theme === "dark" ? "hsl(220, 12%, 18%)" : "hsl(220, 12%, 92%)"} 
                    vertical={false}
                  />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: theme === "dark" ? "hsl(220, 10%, 65%)" : "hsl(220, 12%, 35%)", fontSize: 12 }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: theme === "dark" ? "hsl(220, 10%, 65%)" : "hsl(220, 12%, 35%)", fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: theme === "dark" ? "hsl(220, 14%, 10%)" : "hsl(0, 0%, 100%)",
                      border: `1px solid ${theme === "dark" ? "hsl(220, 12%, 18%)" : "hsl(220, 12%, 92%)"}`,
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="loads" fill={chartColors.bar2} radius={[4, 4, 0, 0]} name="Loads" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
