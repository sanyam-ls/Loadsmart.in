import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationPanel } from "@/components/notification-panel";
import { GlobalSearch } from "@/components/global-search";
import { AIConcierge } from "@/components/ai-concierge";
import NotFound from "@/pages/not-found";

import AuthPage from "@/pages/auth";
import SettingsPage from "@/pages/settings";

import ShipperDashboard from "@/pages/shipper/dashboard";
import PostLoadPage from "@/pages/shipper/post-load";
import ShipperLoadsPage from "@/pages/shipper/loads";
import LoadDetailPage from "@/pages/shipper/load-detail";
import NegotiationsPage from "@/pages/shipper/negotiations";
import TrackingPage from "@/pages/shipper/tracking";
import CarriersPage from "@/pages/shipper/carriers";
import ShipperDocumentsPage from "@/pages/shipper/documents";
import SpendAnalyticsPage from "@/pages/shipper/spend";
import NearbyTrucksPage from "@/pages/shipper/nearby-trucks";

import CarrierDashboard from "@/pages/carrier/dashboard";
import AddTruckPage from "@/pages/carrier/add-truck";
import FleetPage from "@/pages/carrier/fleet";
import CarrierLoadsPage from "@/pages/carrier/loads";
import CarrierBidsPage from "@/pages/carrier/bids";
import TripsPage from "@/pages/carrier/trips";
import CarrierDocumentsPage from "@/pages/carrier/documents";

import AdminOverview from "@/pages/admin/overview";
import AdminUsersPage from "@/pages/admin/users";
import AdminLoadsPage from "@/pages/admin/loads";
import AdminCarriersPage from "@/pages/admin/carriers";
import AdminVolumeAnalytics from "@/pages/admin/volume-analytics";
import InTransitPage from "@/pages/in-transit";
import { MockDataProvider } from "@/lib/mock-data-store";
import { DocumentVaultProvider } from "@/lib/document-vault-store";
import PendingBidsPage from "@/pages/shipper/pending-bids";

function AppContent() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user && location !== "/auth") {
    return <Redirect to="/auth" />;
  }

  if (location === "/auth" && user) {
    const defaultRoute = user.role === "admin" ? "/admin" : user.role === "carrier" ? "/carrier" : "/shipper";
    return <Redirect to={defaultRoute} />;
  }

  if (location === "/auth") {
    return <AuthPage />;
  }

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-4 p-3 border-b border-border sticky top-0 z-50 bg-background">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex-1 flex justify-center">
              <GlobalSearch />
            </div>
            <div className="flex items-center gap-2">
              <NotificationPanel />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <Switch>
              <Route path="/" component={() => {
                const defaultRoute = user?.role === "admin" ? "/admin" : user?.role === "carrier" ? "/carrier" : "/shipper";
                return <Redirect to={defaultRoute} />;
              }} />
              
              <Route path="/shipper" component={ShipperDashboard} />
              <Route path="/shipper/post-load" component={PostLoadPage} />
              <Route path="/shipper/loads" component={ShipperLoadsPage} />
              <Route path="/shipper/loads/:id" component={LoadDetailPage} />
              <Route path="/shipper/spend" component={SpendAnalyticsPage} />
              <Route path="/shipper/pending-bids" component={PendingBidsPage} />
              <Route path="/shipper/negotiations" component={NegotiationsPage} />
              <Route path="/shipper/tracking" component={TrackingPage} />
              <Route path="/shipper/carriers" component={CarriersPage} />
              <Route path="/shipper/nearby-trucks" component={NearbyTrucksPage} />
              <Route path="/shipper/documents" component={ShipperDocumentsPage} />
              
              <Route path="/carrier" component={CarrierDashboard} />
              <Route path="/carrier/add-truck" component={AddTruckPage} />
              <Route path="/carrier/fleet" component={FleetPage} />
              <Route path="/carrier/loads" component={CarrierLoadsPage} />
              <Route path="/carrier/bids" component={CarrierBidsPage} />
              <Route path="/carrier/trips" component={TripsPage} />
              <Route path="/carrier/documents" component={CarrierDocumentsPage} />
              
              <Route path="/admin" component={AdminOverview} />
              <Route path="/admin/users" component={AdminUsersPage} />
              <Route path="/admin/users/:id" component={AdminUsersPage} />
              <Route path="/admin/loads" component={AdminLoadsPage} />
              <Route path="/admin/loads/:id" component={AdminLoadsPage} />
              <Route path="/admin/carriers" component={AdminCarriersPage} />
              <Route path="/admin/carriers/:id" component={AdminCarriersPage} />
              <Route path="/admin/volume" component={AdminVolumeAnalytics} />
              <Route path="/admin/verification" component={AdminCarriersPage} />
              <Route path="/admin/reports" component={AdminVolumeAnalytics} />
              
              <Route path="/shipper/in-transit" component={InTransitPage} />
              
              <Route path="/settings" component={SettingsPage} />
              
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
      <AIConcierge />
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <MockDataProvider>
            <DocumentVaultProvider>
              <TooltipProvider>
                <AppContent />
                <Toaster />
              </TooltipProvider>
            </DocumentVaultProvider>
          </MockDataProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
