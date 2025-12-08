import { useState } from "react";
import { useLocation } from "wouter";
import { 
  ChevronLeft, DollarSign, TrendingUp, TrendingDown, Download, 
  Calendar, Package, Truck, MapPin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useMockData } from "@/lib/mock-data-store";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
}

export default function SpendAnalyticsPage() {
  const [, navigate] = useLocation();
  const { theme } = useTheme();
  const [dateRange, setDateRange] = useState("12m");
  const [activeTab, setActiveTab] = useState("overview");
  const { spend } = useMockData();

  const routeSpendData = [
    { route: "LA - Phoenix", amount: 85000, loads: 42 },
    { route: "Chicago - Detroit", amount: 72000, loads: 38 },
    { route: "Dallas - Houston", amount: 65000, loads: 35 },
    { route: "Atlanta - Miami", amount: 58000, loads: 30 },
    { route: "NY - Boston", amount: 45000, loads: 25 },
  ];

  const carrierSpendData = spend.carrierSpend.map((carrier, index) => ({
    name: carrier.carrier,
    value: carrier.amount,
    color: `hsl(217, 91%, ${48 + index * 10}%)`,
  }));

  const chartColors = {
    primary: "hsl(217, 91%, 48%)",
    secondary: "hsl(220, 12%, 50%)",
    grid: theme === "dark" ? "hsl(220, 12%, 18%)" : "hsl(220, 12%, 92%)",
    text: theme === "dark" ? "hsl(220, 12%, 70%)" : "hsl(220, 12%, 40%)",
  };

  const topExpensiveLoads = [
    { id: "LD-EXP1", pickup: "LA, CA", drop: "Miami, FL", price: 8500 },
    { id: "LD-EXP2", pickup: "Seattle, WA", drop: "NYC, NY", price: 7200 },
    { id: "LD-EXP3", pickup: "Chicago, IL", drop: "Phoenix, AZ", price: 6800 },
    { id: "LD-EXP4", pickup: "Dallas, TX", drop: "Boston, MA", price: 6200 },
    { id: "LD-EXP5", pickup: "Denver, CO", drop: "Atlanta, GA", price: 5800 },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/shipper")} data-testid="button-back">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Monthly Spend Analytics</h1>
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
        <Card data-testid="card-total-spend">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Spend</p>
                <p className="text-2xl font-bold mt-1" data-testid="text-total-spend">{formatCurrency(spend.totalAmount)}</p>
                <div className={`flex items-center gap-1 mt-2 text-sm ${spend.percentChange >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                  {spend.percentChange >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  <span>{spend.percentChange >= 0 ? "+" : ""}{spend.percentChange}% vs last month</span>
                </div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-monthly-avg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Avg</p>
                <p className="text-2xl font-bold mt-1">
                  {formatCurrency(Math.round(spend.monthlyData.reduce((s, m) => s + m.amount, 0) / 12))}
                </p>
                <p className="text-xs text-muted-foreground mt-2">Based on 12-month data</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                <Calendar className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-avg-load-cost">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Load Cost</p>
                <p className="text-2xl font-bold mt-1">
                  {formatCurrency(Math.round(spend.totalAmount / spend.monthlyData.reduce((s, m) => s + m.loads, 0)))}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {spend.monthlyData.reduce((s, m) => s + m.loads, 0)} total loads
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                <Package className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-top-carrier">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Top Carrier</p>
                <p className="text-lg font-bold mt-1 truncate">{spend.carrierSpend[0]?.carrier}</p>
                <p className="text-xs text-muted-foreground mt-2">{formatCurrency(spend.carrierSpend[0]?.amount || 0)} spent</p>
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
                +{spend.percentChange}% YoY
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={spend.monthlyData}>
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
                  {topExpensiveLoads.map((load, i) => (
                    <div 
                      key={load.id} 
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover-elevate cursor-pointer"
                      onClick={() => navigate(`/shipper/loads/${load.id}`)}
                      data-testid={`row-expensive-load-${load.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
                          {i + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{load.pickup} to {load.drop}</p>
                          <p className="text-xs text-muted-foreground">Load #{load.id}</p>
                        </div>
                      </div>
                      <span className="font-semibold">{formatCurrency(load.price)}</span>
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
                  {spend.carrierSpend.map((carrier) => (
                    <TableRow key={carrier.carrier} data-testid={`row-carrier-${carrier.carrier.replace(/\s+/g, '-')}`}>
                      <TableCell className="font-medium">{carrier.carrier}</TableCell>
                      <TableCell>{formatCurrency(carrier.amount)}</TableCell>
                      <TableCell>{carrier.loads}</TableCell>
                      <TableCell>{formatCurrency(Math.round(carrier.amount / carrier.loads))}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">
                          {Math.round(carrier.amount / spend.totalAmount * 100)}%
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
                        data={spend.breakdown}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="amount"
                        label={({ category, percentage }) => `${category}: ${percentage}%`}
                      >
                        {spend.breakdown.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={`hsl(217, 91%, ${48 + index * 10}%)`} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-4">
                  {spend.breakdown.map((type, i) => (
                    <div key={type.category} className="flex items-center justify-between" data-testid={`row-type-${type.category}`}>
                      <div className="flex items-center gap-3">
                        <div 
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: `hsl(217, 91%, ${48 + i * 10}%)` }}
                        />
                        <span className="font-medium">{type.category}</span>
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
              <CardTitle className="text-lg">Monthly Expense Summary</CardTitle>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Total Spend</TableHead>
                    <TableHead>Loads</TableHead>
                    <TableHead>Avg per Load</TableHead>
                    <TableHead>Change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {spend.monthlyData.map((month, index) => {
                    const prevAmount = index > 0 ? spend.monthlyData[index - 1].amount : month.amount;
                    const change = ((month.amount - prevAmount) / prevAmount * 100).toFixed(1);
                    return (
                      <TableRow key={month.month} data-testid={`row-month-${month.month}`}>
                        <TableCell className="font-medium">{month.month}</TableCell>
                        <TableCell>{formatCurrency(month.amount)}</TableCell>
                        <TableCell>{month.loads}</TableCell>
                        <TableCell>{formatCurrency(Math.round(month.amount / month.loads))}</TableCell>
                        <TableCell>
                          <Badge 
                            variant="secondary" 
                            className={`no-default-hover-elevate no-default-active-elevate ${
                              parseFloat(change) >= 0 
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            }`}
                          >
                            {parseFloat(change) >= 0 ? "+" : ""}{change}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
