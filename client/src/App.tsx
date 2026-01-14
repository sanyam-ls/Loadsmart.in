import { Suspense, lazy } from "react";
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
import { LanguageSwitcher } from "@/components/language-switcher";
import { NotificationPanel } from "@/components/notification-panel";
import { GlobalSearch } from "@/components/global-search";
import { HelpBotWidget } from "@/components/HelpBotWidget";
import { MockDataProvider } from "@/lib/mock-data-store";
import { DocumentVaultProvider } from "@/lib/document-vault-store";
import { AdminDataProvider } from "@/lib/admin-data-store";
import { CarrierDataProvider } from "@/lib/carrier-data-store";
import { CarrierOtpNotification } from "@/components/carrier-otp-notification";
import { CarrierOnboardingGate } from "@/hooks/use-carrier-onboarding-gate";

const NotFound = lazy(() => import("@/pages/not-found"));
const AuthPage = lazy(() => import("@/pages/auth"));
const SettingsPage = lazy(() => import("@/pages/settings"));

const ShipperDashboard = lazy(() => import("@/pages/shipper/dashboard"));
const PostLoadPage = lazy(() => import("@/pages/shipper/post-load"));
const ShipperLoadsPage = lazy(() => import("@/pages/shipper/loads"));
const LoadDetailPage = lazy(() => import("@/pages/shipper/load-detail"));
const TrackingPage = lazy(() => import("@/pages/shipper/tracking"));
const ShipperDocumentsPage = lazy(() => import("@/pages/shipper/documents"));
const ShipperInvoicesPage = lazy(() => import("@/pages/shipper/invoices"));
const ShipperOnboardingPage = lazy(() => import("@/pages/shipper/onboarding"));

const CarrierDashboard = lazy(() => import("@/pages/carrier/dashboard"));
const AddTruckPage = lazy(() => import("@/pages/carrier/add-truck"));
const FleetPage = lazy(() => import("@/pages/carrier/fleet"));
const CarrierLoadsPage = lazy(() => import("@/pages/carrier/loads"));
const CarrierBidsPage = lazy(() => import("@/pages/carrier/bids"));
const TripsPage = lazy(() => import("@/pages/carrier/trips"));
const CarrierDocumentsPage = lazy(() => import("@/pages/carrier/documents"));
const CarrierRevenuePage = lazy(() => import("@/pages/carrier/revenue"));
const CarrierDriversPage = lazy(() => import("@/pages/carrier/drivers"));
const CarrierHistoryPage = lazy(() => import("@/pages/carrier/history"));
const CarrierShipmentsPage = lazy(() => import("@/pages/carrier/shipments"));
const MyTruckPage = lazy(() => import("@/pages/carrier/my-truck"));
const MyInfoPage = lazy(() => import("@/pages/carrier/my-info"));
const MyDocumentsPage = lazy(() => import("@/pages/carrier/my-documents"));
const CarrierOnboardingPage = lazy(() => import("@/pages/carrier/onboarding"));

const SoloLoadFeed = lazy(() => import("@/pages/solo/load-feed"));
const SoloMyBids = lazy(() => import("@/pages/solo/my-bids"));
const SoloMyTrips = lazy(() => import("@/pages/solo/my-trips"));
const SoloEarnings = lazy(() => import("@/pages/solo/earnings"));

const AdminOverview = lazy(() => import("@/pages/admin/overview"));
const AdminUsersPage = lazy(() => import("@/pages/admin/users"));
const AdminLoadsPage = lazy(() => import("@/pages/admin/loads"));
const AdminLoadDetailsPage = lazy(() => import("@/pages/admin/load-details"));
const AdminCarriersPage = lazy(() => import("@/pages/admin/carriers"));
const CarrierProfilePage = lazy(() => import("@/pages/admin/carrier-profile"));
const AdminVolumeAnalytics = lazy(() => import("@/pages/admin/volume-analytics"));
const RevenueDashboard = lazy(() => import("@/pages/admin/revenue-dashboard"));
const AdminLoadQueuePage = lazy(() => import("@/pages/admin/load-queue"));
const AdminNegotiationsPage = lazy(() => import("@/pages/admin/negotiations"));
const AdminInvoicesPage = lazy(() => import("@/pages/admin/invoices"));
const AdminCarrierVerificationPage = lazy(() => import("@/pages/admin/carrier-verification"));
const AdminOnboardingPage = lazy(() => import("@/pages/admin/onboarding"));
const AdminLiveTrackingPage = lazy(() => import("@/pages/admin/live-tracking"));
const NegotiationInbox = lazy(() => import("@/pages/admin/negotiation-inbox"));
const AdminOtpQueuePage = lazy(() => import("@/pages/admin/otp-queue"));
const AdminNearbyTrucksPage = lazy(() => import("@/pages/admin/nearby-trucks"));

function PageLoader() {
  return (
    <div className="flex h-full items-center justify-center min-h-[200px]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

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
    return (
      <Suspense fallback={<PageLoader />}>
        <AuthPage />
      </Suspense>
    );
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
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <Suspense fallback={<PageLoader />}>
              <Switch>
                <Route path="/" component={() => {
                  const defaultRoute = user?.role === "admin" ? "/admin" : user?.role === "carrier" ? "/carrier" : "/shipper";
                  return <Redirect to={defaultRoute} />;
                }} />
                
                <Route path="/shipper" component={ShipperDashboard} />
                <Route path="/shipper/post-load" component={PostLoadPage} />
                <Route path="/shipper/loads" component={ShipperLoadsPage} />
                <Route path="/shipper/loads/:id" component={LoadDetailPage} />
                <Route path="/shipper/tracking" component={TrackingPage} />
                <Route path="/shipper/documents" component={ShipperDocumentsPage} />
                <Route path="/shipper/invoices" component={ShipperInvoicesPage} />
                <Route path="/shipper/onboarding" component={ShipperOnboardingPage} />
                              
                <Route path="/carrier" component={() => <CarrierOnboardingGate><CarrierDashboard /></CarrierOnboardingGate>} />
                <Route path="/carrier/add-truck" component={() => <CarrierOnboardingGate><AddTruckPage /></CarrierOnboardingGate>} />
                <Route path="/carrier/fleet" component={() => <CarrierOnboardingGate><FleetPage /></CarrierOnboardingGate>} />
                <Route path="/carrier/loads" component={() => <CarrierOnboardingGate><CarrierLoadsPage /></CarrierOnboardingGate>} />
                <Route path="/carrier/bids" component={() => <CarrierOnboardingGate><CarrierBidsPage /></CarrierOnboardingGate>} />
                <Route path="/carrier/trips" component={() => <CarrierOnboardingGate><TripsPage /></CarrierOnboardingGate>} />
                <Route path="/carrier/documents" component={() => <CarrierOnboardingGate><CarrierDocumentsPage /></CarrierOnboardingGate>} />
                <Route path="/carrier/revenue" component={() => <CarrierOnboardingGate><CarrierRevenuePage /></CarrierOnboardingGate>} />
                <Route path="/carrier/drivers" component={() => <CarrierOnboardingGate><CarrierDriversPage /></CarrierOnboardingGate>} />
                <Route path="/carrier/history" component={() => <CarrierOnboardingGate><CarrierHistoryPage /></CarrierOnboardingGate>} />
                <Route path="/carrier/shipments" component={() => <CarrierOnboardingGate><CarrierShipmentsPage /></CarrierOnboardingGate>} />
                <Route path="/carrier/my-truck" component={() => <CarrierOnboardingGate><MyTruckPage /></CarrierOnboardingGate>} />
                <Route path="/carrier/my-info" component={() => <CarrierOnboardingGate><MyInfoPage /></CarrierOnboardingGate>} />
                <Route path="/carrier/my-documents" component={() => <CarrierOnboardingGate><MyDocumentsPage /></CarrierOnboardingGate>} />
                <Route path="/carrier/onboarding" component={CarrierOnboardingPage} />
                
                <Route path="/solo" component={() => <CarrierOnboardingGate><SoloLoadFeed /></CarrierOnboardingGate>} />
                <Route path="/solo/loads" component={() => <CarrierOnboardingGate><SoloLoadFeed /></CarrierOnboardingGate>} />
                <Route path="/solo/bids" component={() => <CarrierOnboardingGate><SoloMyBids /></CarrierOnboardingGate>} />
                <Route path="/solo/trips" component={() => <CarrierOnboardingGate><SoloMyTrips /></CarrierOnboardingGate>} />
                <Route path="/solo/earnings" component={() => <CarrierOnboardingGate><SoloEarnings /></CarrierOnboardingGate>} />
                
                <Route path="/admin" component={AdminOverview} />
                <Route path="/admin/queue" component={AdminLoadQueuePage} />
                <Route path="/admin/negotiations" component={AdminNegotiationsPage} />
                <Route path="/admin/inbox" component={NegotiationInbox} />
                <Route path="/admin/users" component={AdminUsersPage} />
                <Route path="/admin/users/:id" component={AdminUsersPage} />
                <Route path="/admin/loads" component={AdminLoadsPage} />
                <Route path="/admin/loads/:loadId" component={AdminLoadDetailsPage} />
                <Route path="/admin/carriers" component={AdminCarriersPage} />
                <Route path="/admin/carriers/:carrierId" component={CarrierProfilePage} />
                <Route path="/admin/volume" component={AdminVolumeAnalytics} />
                <Route path="/admin/analytics" component={AdminVolumeAnalytics} />
                <Route path="/admin/revenue" component={RevenueDashboard} />
                <Route path="/admin/revenue/:metric" component={RevenueDashboard} />
                <Route path="/admin/nearby-trucks" component={AdminNearbyTrucksPage} />
                <Route path="/admin/verification" component={AdminCarrierVerificationPage} />
                <Route path="/admin/onboarding" component={AdminOnboardingPage} />
                <Route path="/admin/reports" component={AdminVolumeAnalytics} />
                <Route path="/admin/invoices" component={AdminInvoicesPage} />
                <Route path="/admin/otp-queue" component={AdminOtpQueuePage} />
                <Route path="/admin/live-tracking" component={AdminLiveTrackingPage} />
                
                <Route path="/settings" component={SettingsPage} />
                
                <Route component={NotFound} />
              </Switch>
            </Suspense>
          </main>
        </div>
      </div>
      <CarrierOtpNotification />
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
              <AdminDataProvider>
                <CarrierDataProvider>
                  <TooltipProvider>
                    <AppContent />
                    <Toaster />
                    <HelpBotWidget />
                  </TooltipProvider>
                </CarrierDataProvider>
              </AdminDataProvider>
            </DocumentVaultProvider>
          </MockDataProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
