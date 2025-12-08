import { useState, useMemo } from "react";
import { useLocation, useRoute, Link } from "wouter";
import { 
  ChevronLeft,
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Package,
  Users,
  Building,
  MapPin,
  Calendar,
  Truck,
  Filter,
  Download,
  FileText,
  CreditCard,
  Sparkles,
  AlertCircle,
  ArrowRight,
  ChevronRight,
  Search,
  FileDown,
  BarChart3,
  PieChart as PieChartIcon,
  Table2,
  Lightbulb,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  LineChart,
  Line,
  ComposedChart,
} from "recharts";
import { useTheme } from "@/lib/theme-provider";
import { useToast } from "@/hooks/use-toast";
import { useAdminData } from "@/lib/admin-data-store";

type MetricView = "overview" | "sources" | "contributors" | "loadTypes" | "regions" | "timeline" | "transactions" | "profitability";

export default function RevenueDashboard() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/admin/revenue/:metric?");
  const { theme } = useTheme();
  const { toast } = useToast();
  const { getRevenueIntelligence } = useAdminData();
  
  // Get revenue data from the centralized admin data store
  const revenueData = useMemo(() => getRevenueIntelligence(), [getRevenueIntelligence]);
  
  const initialView = (params?.metric as MetricView) || "overview";
  const [activeView, setActiveView] = useState<MetricView>(initialView);
  const [timeRange, setTimeRange] = useState<string>("1y");
  const [sortBy, setSortBy] = useState<string>("revenue");
  const [filterRegion, setFilterRegion] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [contributorTab, setContributorTab] = useState<"shippers" | "carriers">("shippers");

  const formatCurrency = (value: number) => {
    if (value >= 10000000) {
      return `Rs. ${(value / 10000000).toFixed(2)}Cr`;
    }
    if (value >= 100000) {
      return `Rs. ${(value / 100000).toFixed(1)}L`;
    }
    if (value >= 1000) {
      return `Rs. ${(value / 1000).toFixed(0)}K`;
    }
    return `Rs. ${value.toFixed(0)}`;
  };

  const chartColors = {
    primary: theme === "dark" ? "hsl(217, 91%, 65%)" : "hsl(217, 91%, 48%)",
    secondary: theme === "dark" ? "hsl(142, 76%, 50%)" : "hsl(142, 76%, 36%)",
    warning: theme === "dark" ? "hsl(48, 96%, 60%)" : "hsl(48, 96%, 53%)",
    danger: theme === "dark" ? "hsl(0, 72%, 55%)" : "hsl(0, 72%, 51%)",
  };

  const handleExport = (type: string) => {
    toast({
      title: "Export Started",
      description: `Generating ${type} report for download...`,
    });
    setTimeout(() => {
      toast({
        title: "Export Complete",
        description: `${type} report has been downloaded.`,
      });
    }, 1500);
  };

  const filteredShippers = useMemo(() => {
    let filtered = revenueData.shipperContributors;
    if (filterRegion !== "all") {
      filtered = filtered.filter(s => s.region === filterRegion);
    }
    if (searchQuery) {
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.company.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return filtered;
  }, [filterRegion, searchQuery]);

  const filteredTransactions = useMemo(() => {
    let filtered = revenueData.transactions;
    if (filterRegion !== "all") {
      filtered = filtered.filter(t => t.region === filterRegion);
    }
    if (searchQuery) {
      filtered = filtered.filter(t => 
        t.loadId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.shipper.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.carrier.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return filtered;
  }, [filterRegion, searchQuery]);

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/admin/analytics")} data-testid="button-back">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Revenue Intelligence Dashboard</h1>
            <p className="text-muted-foreground">Complete breakdown of {formatCurrency(revenueData.totalRevenue)} total revenue</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32" data-testid="select-time-range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="1y">Last 12 Months</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => handleExport("Full Revenue")} data-testid="button-export-full">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Quick Stats - Clickable */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card 
          className="cursor-pointer hover-elevate" 
          onClick={() => setActiveView("sources")}
          data-testid="card-total-revenue"
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Total Volume</p>
                <p className="text-2xl font-bold">{formatCurrency(revenueData.totalRevenue)}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="text-green-600 dark:text-green-400">
                <TrendingUp className="h-3 w-3 mr-1" />
                +14.2% vs last year
              </Badge>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover-elevate" 
          onClick={() => setActiveView("timeline")}
          data-testid="card-avg-load-price"
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Avg Load Price</p>
                <p className="text-2xl font-bold">{formatCurrency(revenueData.totalRevenue / 2847)}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-amber-500" />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="text-green-600 dark:text-green-400">
                <TrendingUp className="h-3 w-3 mr-1" />
                +8.3% vs last year
              </Badge>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover-elevate" 
          onClick={() => setActiveView("transactions")}
          data-testid="card-total-loads"
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Total Loads</p>
                <p className="text-2xl font-bold">2,847</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-green-500" />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="text-green-600 dark:text-green-400">
                <TrendingUp className="h-3 w-3 mr-1" />
                +23.5% vs last year
              </Badge>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover-elevate" 
          onClick={() => setActiveView("profitability")}
          data-testid="card-profit-margin"
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Profit Margin</p>
                <p className="text-2xl font-bold">32%</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-purple-500" />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="text-green-600 dark:text-green-400">
                <TrendingUp className="h-3 w-3 mr-1" />
                +2.1% vs last year
              </Badge>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as MetricView)} className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="overview" className="gap-1" data-testid="tab-overview">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="sources" className="gap-1" data-testid="tab-sources">
            <PieChartIcon className="h-4 w-4" />
            By Source
          </TabsTrigger>
          <TabsTrigger value="contributors" className="gap-1" data-testid="tab-contributors">
            <Users className="h-4 w-4" />
            Contributors
          </TabsTrigger>
          <TabsTrigger value="loadTypes" className="gap-1" data-testid="tab-load-types">
            <Package className="h-4 w-4" />
            By Load Type
          </TabsTrigger>
          <TabsTrigger value="regions" className="gap-1" data-testid="tab-regions">
            <MapPin className="h-4 w-4" />
            By Region
          </TabsTrigger>
          <TabsTrigger value="timeline" className="gap-1" data-testid="tab-timeline">
            <Calendar className="h-4 w-4" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="transactions" className="gap-1" data-testid="tab-transactions">
            <Table2 className="h-4 w-4" />
            Transactions
          </TabsTrigger>
          <TabsTrigger value="profitability" className="gap-1" data-testid="tab-profitability">
            <Lightbulb className="h-4 w-4" />
            Profitability
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Revenue by Source Pie Chart */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <div>
                  <CardTitle className="text-lg">Revenue by Source</CardTitle>
                  <CardDescription>Distribution of total revenue</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setActiveView("sources")}>
                  View Details <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={revenueData.sourceGroups}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {revenueData.sourceGroups.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Monthly Revenue Trend */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <div>
                  <CardTitle className="text-lg">Monthly Revenue Trend</CardTitle>
                  <CardDescription>12-month performance overview</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setActiveView("timeline")}>
                  View Details <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueData.monthlyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="month" fontSize={12} />
                      <YAxis fontSize={12} tickFormatter={(v) => formatCurrency(v)} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke={chartColors.primary}
                        fill={chartColors.primary}
                        fillOpacity={0.2}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Contributors Quick View */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <div>
                  <CardTitle className="text-lg">Top Shippers</CardTitle>
                  <CardDescription>Highest revenue contributors</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setActiveView("contributors"); setContributorTab("shippers"); }}>
                  View All <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {revenueData.shipperContributors.slice(0, 5).map((shipper, idx) => (
                    <div 
                      key={shipper.shipperId} 
                      className="flex items-center justify-between gap-2 p-2 rounded-md hover-elevate cursor-pointer"
                      onClick={() => setLocation(`/admin/users/${shipper.shipperId}`)}
                      data-testid={`row-shipper-${shipper.shipperId}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center font-medium text-sm">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{shipper.company}</p>
                          <p className="text-xs text-muted-foreground">{shipper.loadsBooked} loads</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">{formatCurrency(shipper.totalSpend)}</p>
                        <p className="text-xs text-muted-foreground">{shipper.contribution.toFixed(1)}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <div>
                  <CardTitle className="text-lg">Top Carriers</CardTitle>
                  <CardDescription>Highest commission generators</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setActiveView("contributors"); setContributorTab("carriers"); }}>
                  View All <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {revenueData.carrierContributors.slice(0, 5).map((carrier, idx) => (
                    <div 
                      key={carrier.carrierId} 
                      className="flex items-center justify-between gap-2 p-2 rounded-md hover-elevate cursor-pointer"
                      onClick={() => setLocation(`/admin/carriers/${carrier.carrierId}`)}
                      data-testid={`row-carrier-${carrier.carrierId}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center font-medium text-sm">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{carrier.name}</p>
                          <p className="text-xs text-muted-foreground">{carrier.loadsExecuted} loads executed</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">{formatCurrency(carrier.commissionGenerated)}</p>
                        <p className="text-xs text-muted-foreground">{carrier.contribution.toFixed(1)}% of commissions</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Insights */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                AI-Powered Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {revenueData.aiInsights.map((insight, idx) => (
                  <div 
                    key={idx}
                    className={`p-3 rounded-md border ${
                      insight.type === "success" ? "border-green-500/30 bg-green-500/5" :
                      insight.type === "warning" ? "border-amber-500/30 bg-amber-500/5" :
                      "border-blue-500/30 bg-blue-500/5"
                    }`}
                  >
                    <p className="text-sm">{insight.text}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revenue by Source Tab */}
        <TabsContent value="sources" className="space-y-6 mt-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Pie Chart */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Revenue Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={revenueData.sourceGroups}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {revenueData.sourceGroups.map((entry, index) => (
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

            {/* Detailed Breakdown */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-lg">Detailed Source Breakdown</CardTitle>
                <Button variant="outline" size="sm" onClick={() => handleExport("Revenue by Source")}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Share</TableHead>
                      <TableHead className="text-right">Trend</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {revenueData.revenueBySource.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{item.source}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                        <TableCell className="text-right">{item.percentage}%</TableCell>
                        <TableCell className="text-right">
                          <Badge 
                            variant="secondary" 
                            className={item.trend >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}
                          >
                            {item.trend >= 0 ? "+" : ""}{item.trend}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Trend by Source */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Monthly Revenue by Source</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData.monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="month" fontSize={12} />
                    <YAxis fontSize={12} tickFormatter={(v) => formatCurrency(v)} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="loadTransactions" name="Load Transactions" stackId="a" fill={chartColors.primary} />
                    <Bar dataKey="subscriptions" name="Subscriptions" stackId="a" fill={chartColors.secondary} />
                    <Bar dataKey="addOns" name="Add-ons" stackId="a" fill={chartColors.warning} />
                    <Bar dataKey="penalties" name="Penalties" stackId="a" fill={chartColors.danger} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contributors Tab */}
        <TabsContent value="contributors" className="space-y-6 mt-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <Tabs value={contributorTab} onValueChange={(v) => setContributorTab(v as "shippers" | "carriers")}>
              <TabsList>
                <TabsTrigger value="shippers" data-testid="tab-shippers">
                  <Building className="h-4 w-4 mr-2" />
                  Shippers
                </TabsTrigger>
                <TabsTrigger value="carriers" data-testid="tab-carriers">
                  <Truck className="h-4 w-4 mr-2" />
                  Carriers
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-48"
                  data-testid="input-search"
                />
              </div>
              <Select value={filterRegion} onValueChange={setFilterRegion}>
                <SelectTrigger className="w-40" data-testid="select-filter-region">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  <SelectItem value="North India">North India</SelectItem>
                  <SelectItem value="South India">South India</SelectItem>
                  <SelectItem value="West India">West India</SelectItem>
                  <SelectItem value="East India">East India</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40" data-testid="select-sort">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue">By Revenue</SelectItem>
                  <SelectItem value="loads">By Loads</SelectItem>
                  <SelectItem value="contribution">By Contribution</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => handleExport(contributorTab === "shippers" ? "Shipper Revenue" : "Carrier Revenue")}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {contributorTab === "shippers" ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Top Revenue Contributors - Shippers</CardTitle>
                <CardDescription>Shippers ranked by total spend on the platform</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Region</TableHead>
                      <TableHead className="text-right">Total Spend</TableHead>
                      <TableHead className="text-right">Loads</TableHead>
                      <TableHead className="text-right">Avg/Load</TableHead>
                      <TableHead className="text-right">Contribution</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredShippers.map((shipper, idx) => (
                      <TableRow 
                        key={shipper.shipperId} 
                        className="cursor-pointer hover-elevate"
                        onClick={() => setLocation(`/admin/users/${shipper.shipperId}`)}
                        data-testid={`row-shipper-detail-${shipper.shipperId}`}
                      >
                        <TableCell className="font-medium">{idx + 1}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{shipper.company}</p>
                            <p className="text-xs text-muted-foreground">{shipper.shipperId}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{shipper.region}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(shipper.totalSpend)}</TableCell>
                        <TableCell className="text-right">{shipper.loadsBooked}</TableCell>
                        <TableCell className="text-right">{formatCurrency(shipper.avgSpendPerLoad)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">{shipper.contribution.toFixed(1)}%</Badge>
                        </TableCell>
                        <TableCell>
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Top Revenue Contributors - Carriers</CardTitle>
                <CardDescription>Carriers ranked by commission generated for the platform</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Carrier</TableHead>
                      <TableHead className="text-right">Loads Executed</TableHead>
                      <TableHead className="text-right">Load Value</TableHead>
                      <TableHead className="text-right">Commission</TableHead>
                      <TableHead className="text-right">Contribution</TableHead>
                      <TableHead className="text-right">Rating</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {revenueData.carrierContributors.map((carrier, idx) => (
                      <TableRow 
                        key={carrier.carrierId} 
                        className="cursor-pointer hover-elevate"
                        onClick={() => setLocation(`/admin/carriers/${carrier.carrierId}`)}
                        data-testid={`row-carrier-detail-${carrier.carrierId}`}
                      >
                        <TableCell className="font-medium">{idx + 1}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{carrier.name}</p>
                            <p className="text-xs text-muted-foreground">{carrier.carrierId}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{carrier.loadsExecuted}</TableCell>
                        <TableCell className="text-right">{formatCurrency(carrier.loadValue)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(carrier.commissionGenerated)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">{carrier.contribution.toFixed(1)}%</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className="text-amber-600 dark:text-amber-400">
                            {carrier.rating.toFixed(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Load Types Tab */}
        <TabsContent value="loadTypes" className="space-y-6 mt-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Chart */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Revenue by Load Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueData.loadTypeRevenue} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis type="number" fontSize={12} tickFormatter={(v) => formatCurrency(v)} />
                      <YAxis type="category" dataKey="type" fontSize={12} width={100} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="revenue" fill={chartColors.primary} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Table */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-lg">Load Type Performance</CardTitle>
                <Button variant="outline" size="sm" onClick={() => handleExport("Load Type Revenue")}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Load Type</TableHead>
                      <TableHead className="text-right">Total Loads</TableHead>
                      <TableHead className="text-right">Avg Rate</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead>Peak Month</TableHead>
                      <TableHead className="text-right">YoY Growth</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {revenueData.loadTypeRevenue.map((item) => (
                      <TableRow key={item.type}>
                        <TableCell className="font-medium">{item.type}</TableCell>
                        <TableCell className="text-right">{item.totalLoads}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.avgRate)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(item.revenue)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.peakMonth}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge 
                            variant="secondary" 
                            className={item.yoyGrowth >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}
                          >
                            {item.yoyGrowth >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                            {item.yoyGrowth >= 0 ? "+" : ""}{item.yoyGrowth}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Regions Tab */}
        <TabsContent value="regions" className="space-y-6 mt-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Region Heatmap visualization */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Revenue Heatmap</CardTitle>
                <CardDescription>Regional concentration</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {revenueData.regionRevenue.map((region) => (
                    <div 
                      key={region.code}
                      className="p-3 rounded-md text-center cursor-pointer hover-elevate"
                      style={{
                        backgroundColor: `hsl(217, 91%, ${80 - region.heatValue * 40}%)`,
                      }}
                      onClick={() => setLocation(`/admin/regions/${region.code}`)}
                    >
                      <p className="font-semibold text-sm text-white drop-shadow">{region.code}</p>
                      <p className="text-xs text-white/80 drop-shadow">{formatCurrency(region.revenue)}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
                  <span>Low Revenue</span>
                  <div className="flex-1 mx-2 h-2 rounded bg-gradient-to-r from-blue-200 to-blue-600" />
                  <span>High Revenue</span>
                </div>
              </CardContent>
            </Card>

            {/* Region Table */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-lg">Regional Performance</CardTitle>
                <Button variant="outline" size="sm" onClick={() => handleExport("Region Revenue")}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Region</TableHead>
                      <TableHead className="text-right">Loads</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">YoY Growth</TableHead>
                      <TableHead>Top Customer</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {revenueData.regionRevenue.map((region) => (
                      <TableRow 
                        key={region.code} 
                        className="cursor-pointer hover-elevate"
                        onClick={() => setLocation(`/admin/regions/${region.code}`)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{region.region}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{region.loadsExecuted}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(region.revenue)}</TableCell>
                        <TableCell className="text-right">
                          <Badge 
                            variant="secondary" 
                            className={region.yoyGrowth >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}
                          >
                            {region.yoyGrowth >= 0 ? "+" : ""}{region.yoyGrowth}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{region.topCustomer}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Regional Bar Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Regional Revenue Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData.regionRevenue}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="region" fontSize={11} angle={-20} textAnchor="end" height={60} />
                    <YAxis fontSize={12} tickFormatter={(v) => formatCurrency(v)} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="revenue" fill={chartColors.primary} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-6 mt-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Best/Worst months */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Performance Highlights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-md bg-green-500/10 border border-green-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-green-700 dark:text-green-400">Best Month</span>
                  </div>
                  <p className="text-2xl font-bold">{revenueData.bestMonth.fullMonth}</p>
                  <p className="text-lg">{formatCurrency(revenueData.bestMonth.revenue)}</p>
                  <p className="text-sm text-muted-foreground">{revenueData.bestMonth.loads} loads</p>
                </div>
                <div className="p-4 rounded-md bg-amber-500/10 border border-amber-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="h-5 w-5 text-amber-600" />
                    <span className="font-semibold text-amber-700 dark:text-amber-400">Slowest Month</span>
                  </div>
                  <p className="text-2xl font-bold">{revenueData.worstMonth.fullMonth}</p>
                  <p className="text-lg">{formatCurrency(revenueData.worstMonth.revenue)}</p>
                  <p className="text-sm text-muted-foreground">{revenueData.worstMonth.loads} loads</p>
                </div>
              </CardContent>
            </Card>

            {/* Monthly Revenue Chart */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Monthly Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={revenueData.monthlyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="month" fontSize={12} />
                      <YAxis yAxisId="left" fontSize={12} tickFormatter={(v) => formatCurrency(v)} />
                      <YAxis yAxisId="right" orientation="right" fontSize={12} />
                      <Tooltip formatter={(value: number, name: string) => 
                        name === "growth" ? `${value}%` : formatCurrency(value)
                      } />
                      <Legend />
                      <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill={chartColors.primary} radius={[4, 4, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="growth" name="Growth %" stroke={chartColors.secondary} strokeWidth={2} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quarterly View */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Quarterly Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {revenueData.quarterlyData.map((q) => (
                  <div key={q.quarter} className="p-4 rounded-md border">
                    <p className="text-sm text-muted-foreground">{q.quarter}</p>
                    <p className="text-2xl font-bold mt-1">{formatCurrency(q.revenue)}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm text-muted-foreground">{q.loads} loads</span>
                      <Badge 
                        variant="secondary" 
                        className={q.growth >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}
                      >
                        {q.growth >= 0 ? "+" : ""}{q.growth}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Forecast */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                3-Month Forecast (AI Predicted)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                {revenueData.forecast.map((f) => (
                  <div key={f.month} className="p-4 rounded-md bg-purple-500/5 border border-purple-500/20">
                    <p className="font-semibold">{f.month}</p>
                    <p className="text-2xl font-bold mt-1">{formatCurrency(f.projected)}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-purple-500 rounded-full" 
                          style={{ width: `${f.confidence}%` }} 
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">{f.confidence}% confidence</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-6 mt-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by Load ID, Shipper, Carrier..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-72"
                  data-testid="input-search-transactions"
                />
              </div>
              <Select value={filterRegion} onValueChange={setFilterRegion}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  <SelectItem value="North India">North India</SelectItem>
                  <SelectItem value="South India">South India</SelectItem>
                  <SelectItem value="West India">West India</SelectItem>
                  <SelectItem value="East India">East India</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => handleExport("Transaction CSV")}>
                <FileDown className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" onClick={() => handleExport("Transaction PDF")}>
                <FileText className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Detailed Transaction Table</CardTitle>
              <CardDescription>Complete record of all revenue events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Load ID</TableHead>
                      <TableHead>Shipper</TableHead>
                      <TableHead>Carrier</TableHead>
                      <TableHead className="text-right">Load Value</TableHead>
                      <TableHead className="text-right">Platform Fee</TableHead>
                      <TableHead className="text-right">Subscription</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Region</TableHead>
                      <TableHead>Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.slice(0, 25).map((tx, idx) => (
                      <TableRow key={idx} className="hover-elevate">
                        <TableCell className="text-sm">
                          {tx.date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </TableCell>
                        <TableCell>
                          <Link href={`/admin/loads/${tx.loadId}`}>
                            <span className="text-primary hover:underline cursor-pointer" data-testid={`link-load-${tx.loadId}`}>
                              {tx.loadId}
                            </span>
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Link href={`/admin/users/${tx.shipperId}`}>
                            <span className="text-primary hover:underline cursor-pointer text-sm" data-testid={`link-shipper-${tx.shipperId}`}>
                              {tx.shipper.length > 20 ? tx.shipper.substring(0, 20) + "..." : tx.shipper}
                            </span>
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Link href={`/admin/carriers/${tx.carrierId}`}>
                            <span className="text-primary hover:underline cursor-pointer text-sm" data-testid={`link-carrier-${tx.carrierId}`}>
                              {tx.carrier.length > 20 ? tx.carrier.substring(0, 20) + "..." : tx.carrier}
                            </span>
                          </Link>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(tx.loadValue)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(tx.platformFee)}</TableCell>
                        <TableCell className="text-right">{tx.subscriptionFee > 0 ? formatCurrency(tx.subscriptionFee) : "-"}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={tx.paymentStatus === "Paid" ? "default" : tx.paymentStatus === "Pending" ? "secondary" : "destructive"}
                          >
                            {tx.paymentStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{tx.region}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{tx.loadType}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {filteredTransactions.length > 25 && (
                <div className="text-center mt-4 text-sm text-muted-foreground">
                  Showing 25 of {filteredTransactions.length} transactions. Export for complete data.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profitability Tab */}
        <TabsContent value="profitability" className="space-y-6 mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Key Metrics */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Profitability Metrics</CardTitle>
                <CardDescription>Simulated financial health indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {revenueData.profitInsights.map((insight, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-md border">
                      <div>
                        <p className="text-sm text-muted-foreground">{insight.label}</p>
                        <p className="text-xl font-bold">
                          {typeof insight.value === "number" ? formatCurrency(insight.value) : insight.value}
                        </p>
                      </div>
                      {insight.trend !== undefined && (
                        <Badge 
                          variant="secondary" 
                          className={insight.icon === "up" ? "text-green-600 dark:text-green-400" : insight.icon === "down" ? "text-red-600 dark:text-red-400" : ""}
                        >
                          {insight.icon === "up" ? <TrendingUp className="h-3 w-3 mr-1" /> : 
                           insight.icon === "down" ? <TrendingDown className="h-3 w-3 mr-1" /> : null}
                          {insight.trend >= 0 ? "+" : ""}{insight.trend}%
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Revenue vs Cost Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Revenue vs Estimated Cost</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueData.monthlyRevenue.map(m => ({
                      month: m.month,
                      revenue: m.revenue,
                      cost: m.revenue * 0.68,
                      profit: m.revenue * 0.32,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="month" fontSize={12} />
                      <YAxis fontSize={12} tickFormatter={(v) => formatCurrency(v)} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="revenue" name="Revenue" fill={chartColors.primary} />
                      <Bar dataKey="cost" name="Est. Cost" fill={chartColors.danger} />
                      <Bar dataKey="profit" name="Est. Profit" fill={chartColors.secondary} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Insights Panel */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                AI-Powered Financial Insights
              </CardTitle>
              <CardDescription>Automated analysis and recommendations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {revenueData.aiInsights.map((insight, idx) => (
                  <div 
                    key={idx}
                    className={`p-4 rounded-md border flex items-start gap-3 ${
                      insight.type === "success" ? "border-green-500/30 bg-green-500/5" :
                      insight.type === "warning" ? "border-amber-500/30 bg-amber-500/5" :
                      "border-blue-500/30 bg-blue-500/5"
                    }`}
                  >
                    {insight.type === "success" ? (
                      <TrendingUp className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                    ) : insight.type === "warning" ? (
                      <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                    ) : (
                      <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                    )}
                    <p className="text-sm">{insight.text}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Export Options */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Export Reports</CardTitle>
              <CardDescription>Generate and download detailed reports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { name: "Monthly Revenue Report", icon: Calendar },
                  { name: "Shipper Revenue Report", icon: Building },
                  { name: "Carrier Revenue Report", icon: Truck },
                  { name: "Region Revenue Report", icon: MapPin },
                  { name: "Full Transaction Analytics", icon: Table2 },
                  { name: "Profitability Analysis", icon: Sparkles },
                ].map((report) => (
                  <Button 
                    key={report.name}
                    variant="outline" 
                    className="justify-start h-auto py-3"
                    onClick={() => handleExport(report.name)}
                    data-testid={`button-export-${report.name.toLowerCase().replace(/\s/g, "-")}`}
                  >
                    <report.icon className="h-4 w-4 mr-3" />
                    <div className="text-left">
                      <p className="font-medium">{report.name}</p>
                      <p className="text-xs text-muted-foreground">Download PDF/CSV</p>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
