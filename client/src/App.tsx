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
import { AIConcierge } from "@/components/ai-concierge";
import { HelpBotWidget } from "@/components/HelpBotWidget";
import NotFound from "@/pages/not-found";

import AuthPage from "@/pages/auth";
import SettingsPage from "@/pages/settings";

import ShipperDashboard from "@/pages/shipper/dashboard";
import PostLoadPage from "@/pages/shipper/post-load";
import ShipperLoadsPage from "@/pages/shipper/loads";
import LoadDetailPage from "@/pages/shipper/load-detail";
import TrackingPage from "@/pages/shipper/tracking";
import ShipperDocumentsPage from "@/pages/shipper/documents";
import ShipperInvoicesPage from "@/pages/shipper/invoices";
import ShipperOnboardingPage from "@/pages/shipper/onboarding";
import AdminNearbyTrucksPage from "@/pages/admin/nearby-trucks";

import CarrierDashboard from "@/pages/carrier/dashboard";
import AddTruckPage from "@/pages/carrier/add-truck";
import FleetPage from "@/pages/carrier/fleet";
import CarrierLoadsPage from "@/pages/carrier/loads";
import CarrierBidsPage from "@/pages/carrier/bids";
import TripsPage from "@/pages/carrier/trips";
import CarrierDocumentsPage from "@/pages/carrier/documents";
import CarrierRevenuePage from "@/pages/carrier/revenue";
import CarrierDriversPage from "@/pages/carrier/drivers";
import CarrierHistoryPage from "@/pages/carrier/history";
import CarrierShipmentsPage from "@/pages/carrier/shipments";
import MyTruckPage from "@/pages/carrier/my-truck";
import MyInfoPage from "@/pages/carrier/my-info";
import MyDocumentsPage from "@/pages/carrier/my-documents";
import CarrierOnboardingPage from "@/pages/carrier/onboarding";
import { CarrierOnboardingGate } from "@/hooks/use-carrier-onboarding-gate";

import SoloLoadFeed from "@/pages/solo/load-feed";
import SoloMyBids from "@/pages/solo/my-bids";
import SoloMyTrips from "@/pages/solo/my-trips";
import SoloEarnings from "@/pages/solo/earnings";

import AdminOverview from "@/pages/admin/overview";
import AdminUsersPage from "@/pages/admin/users";
import AdminLoadsPage from "@/pages/admin/loads";
import AdminLoadDetailsPage from "@/pages/admin/load-details";
import AdminCarriersPage from "@/pages/admin/carriers";
import CarrierProfilePage from "@/pages/admin/carrier-profile";
import AdminVolumeAnalytics from "@/pages/admin/volume-analytics";
import RevenueDashboard from "@/pages/admin/revenue-dashboard";
import AdminLoadQueuePage from "@/pages/admin/load-queue";
import AdminNegotiationsPage from "@/pages/admin/negotiations";
import AdminInvoicesPage from "@/pages/admin/invoices";
import AdminCarrierVerificationPage from "@/pages/admin/carrier-verification";
import AdminCreditAssessmentPage from "@/pages/admin/credit-assessment";
import AdminOnboardingPage from "@/pages/admin/onboarding";
import NegotiationInbox from "@/pages/admin/negotiation-inbox";
import AdminOtpQueuePage from "@/pages/admin/otp-queue";
import { MockDataProvider } from "@/lib/mock-data-store";
import { DocumentVaultProvider } from "@/lib/document-vault-store";
import { AdminDataProvider } from "@/lib/admin-data-store";
import { CarrierDataProvider } from "@/lib/carrier-data-store";
import { CarrierOtpNotification } from "@/components/carrier-otp-notification";

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
      <>
        <AuthPage />
        <HelpBotWidget />
      </>
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
              <Route path="/admin/credit-assessment" component={AdminCreditAssessmentPage} />
              <Route path="/admin/onboarding" component={AdminOnboardingPage} />
              <Route path="/admin/reports" component={AdminVolumeAnalytics} />
              <Route path="/admin/invoices" component={AdminInvoicesPage} />
              <Route path="/admin/otp-queue" component={AdminOtpQueuePage} />
              
              <Route path="/settings" component={SettingsPage} />
              
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
      <AIConcierge />
      <CarrierOtpNotification />
      <HelpBotWidget />
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
