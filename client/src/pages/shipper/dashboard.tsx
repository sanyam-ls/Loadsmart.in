import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Package, DollarSign, Truck, TrendingUp, TrendingDown, AlertTriangle, Plus, ArrowRight, FileText, Receipt, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatCard } from "@/components/stat-card";
import { useAuth } from "@/lib/auth-context";
import { useLoads, useInvoices, useNotifications } from "@/lib/api-hooks";
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
import type { Load, Invoice } from "@shared/schema";

function getStatusBadgeStyle(status: string | null | undefined) {
  switch (status) {
    case 'in_transit':
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case 'pending':
    case 'priced':
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    case 'delivered':
    case 'closed':
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
  }
}

function formatStatus(status: string | null | undefined): string {
  if (!status) return 'Unknown';
  return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Format load ID for display - shows LD-1001 (admin ref) or LD-023 (shipper seq)
function formatLoadId(load: { shipperLoadNumber?: number | null; adminReferenceNumber?: number | null; id: string }): string {
  if (load.adminReferenceNumber) {
    return `LD-${load.adminReferenceNumber}`;
  }
  if (load.shipperLoadNumber) {
    return `LD-${String(load.shipperLoadNumber).padStart(3, '0')}`;
  }
  return load.id.slice(0, 8);
}

export default function ShipperDashboard() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { data: loads, isLoading: loadsLoading } = useLoads();
  const { data: invoices, isLoading: invoicesLoading } = useInvoices();
  const { data: notifications } = useNotifications();
  const { getExpiringDocuments, getExpiredDocuments } = useDocumentVault();

  const userLoads = (loads || []).filter((load: Load) => load.shipperId === user?.id);
  const activeLoads = userLoads.filter((load: Load) => 
    ['pending', 'priced', 'posted_to_carriers', 'open_for_bid', 'counter_received', 'awarded', 'invoice_created', 'invoice_sent', 'invoice_acknowledged', 'invoice_paid'].includes(load.status || '')
  );
  const inTransitLoads = userLoads.filter((load: Load) => load.status === 'in_transit');
  
  const expiringDocs = getExpiringDocuments();
  const expiredDocs = getExpiredDocuments();
  
  const recentLoads = userLoads.slice(0, 5);

  const userInvoices = (invoices || []) as Invoice[];
  const totalSpend = userInvoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + parseFloat(inv.totalAmount?.toString() || '0'), 0);
  
  const monthlyData = [
    { month: 'Jul', amount: 150000 },
    { month: 'Aug', amount: 180000 },
    { month: 'Sep', amount: 220000 },
    { month: 'Oct', amount: 195000 },
    { month: 'Nov', amount: 240000 },
    { month: 'Dec', amount: totalSpend || 280000 },
  ];

  const spendChange = 12;

  const unreadNotifications = (notifications || []).filter(n => !n.isRead).slice(0, 4);

  const dashboardAlerts = [
    ...unreadNotifications.map((notif, i) => ({
      id: `notif-${i}`,
      type: notif.type === 'error' ? 'delay' : 'status',
      message: notif.message || notif.title,
      time: notif.createdAt ? new Date(notif.createdAt).toLocaleTimeString() : 'Just now',
    })),
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

  if (loadsLoading || invoicesLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-welcome">
            {t("dashboard.welcomeBack")}, {user?.companyName || user?.username}
          </h1>
          <p className="text-muted-foreground">{t("shipper.loadOverview")}</p>
        </div>
        <Button onClick={() => navigate("/shipper/post-load")} data-testid="button-post-load">
          <Plus className="h-4 w-4 mr-2" />
          {t("shipper.postNewLoad")}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t("dashboard.activeLoads")}
          value={activeLoads.length}
          icon={Package}
          trend={{ value: 12, isPositive: true }}
          onClick={() => navigate("/shipper/loads")}
          testId="stat-active-loads"
        />
        <StatCard
          title={t("dashboard.inTransit")}
          value={inTransitLoads.length}
          icon={Truck}
          trend={{ value: 8, isPositive: true }}
          onClick={() => navigate("/shipper/tracking")}
          testId="stat-in-transit"
        />
        <StatCard
          title={t("shipper.totalSpent")}
          value={`Rs. ${totalSpend.toLocaleString('en-IN')}`}
          icon={DollarSign}
          trend={{ value: Math.abs(spendChange), isPositive: spendChange > 0 }}
          onClick={() => navigate("/shipper/invoices")}
          testId="stat-monthly-spend"
        />
        <StatCard
          title={t("documents.title")}
          value={expiringDocs.length + expiredDocs.length}
          icon={FileText}
          subtitle={t("common.required")}
          onClick={() => navigate("/shipper/documents")}
          testId="stat-documents"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
            <CardTitle className="text-lg">{t("shipper.totalSpent")}</CardTitle>
            <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">
              {spendChange >= 0 ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1" />
              )}
              {spendChange >= 0 ? "+" : ""}{spendChange}% {t("dashboard.vsLastWeek")}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
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
            <CardTitle className="text-lg">{t("common.notifications")}</CardTitle>
            <Badge variant="destructive" className="no-default-hover-elevate no-default-active-elevate">
              {dashboardAlerts.length}
            </Badge>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {dashboardAlerts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">{t("messages.noDataFound")}</p>
                ) : (
                  dashboardAlerts.map((alert) => (
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
                          alert.type === "delay" ? "text-red-500" : "text-green-500"
                        }`} />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{alert.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">{alert.time}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
            <CardTitle className="text-lg">{t("dashboard.activeLoads")}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate("/shipper/loads")} data-testid="link-view-all-loads">
              {t("dashboard.viewAll")}
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {recentLoads.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">{t("shipper.noLoadsPosted")}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate("/shipper/post-load")}>
                  {t("shipper.postFirstLoad")}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentLoads.map((load: Load) => (
                  <div
                    key={load.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover-elevate cursor-pointer"
                    onClick={() => navigate(`/shipper/loads/${load.id}`)}
                    data-testid={`load-card-${load.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-medium text-sm">{formatLoadId(load)}</span>
                        <Badge variant="outline" className="text-xs">
                          {load.truckType || 'General'}
                        </Badge>
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${getStatusBadgeStyle(load.status)}`}
                        >
                          {formatStatus(load.status)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {load.pickupCity}, {load.pickupState} to {load.dropoffCity}, {load.dropoffState}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-xs text-muted-foreground">{load.weight ? `${parseFloat(load.weight).toLocaleString('en-IN')} kg` : 'N/A'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
            <CardTitle className="text-lg">{t("invoices.title")}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate("/shipper/invoices")} data-testid="link-view-invoices">
              {t("dashboard.viewAll")}
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {userInvoices.length === 0 ? (
              <div className="text-center py-8">
                <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">{t("invoices.noInvoicesFound")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {userInvoices.slice(0, 3).map((invoice: Invoice) => (
                  <div 
                    key={invoice.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover-elevate cursor-pointer" 
                    onClick={() => navigate("/shipper/invoices")} 
                    data-testid={`invoice-${invoice.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <Receipt className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="font-medium text-sm">{invoice.invoiceNumber}</span>
                        <p className="text-xs text-muted-foreground">
                          {invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">Rs. {parseFloat(invoice.totalAmount?.toString() || '0').toLocaleString('en-IN')}</p>
                      <Badge className={`text-xs no-default-hover-elevate no-default-active-elevate ${
                        invoice.status === 'paid' 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}>
                        {invoice.status ? invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1) : 'Pending'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
