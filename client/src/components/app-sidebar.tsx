import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Package,
  Truck,
  MessageSquare,
  MapPin,
  FileText,
  Users,
  BarChart3,
  Settings,
  Plus,
  Route,
  Gavel,
  Shield,
  Radio,
  DollarSign,
  User,
  History,
  ClipboardList,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const shipperItems = [
  { title: "Dashboard", url: "/shipper", icon: LayoutDashboard },
  { title: "Post Load", url: "/shipper/post-load", icon: Plus },
  { title: "My Loads", url: "/shipper/loads", icon: Package },
  { title: "Invoices", url: "/shipper/invoices", icon: FileText },
  { title: "Track Shipments", url: "/shipper/tracking", icon: Route },
  { title: "Documents", url: "/shipper/documents", icon: FileText },
];

const carrierItems = [
  { title: "Dashboard", url: "/carrier", icon: LayoutDashboard },
  { title: "Add Truck", url: "/carrier/add-truck", icon: Plus },
  { title: "My Fleet", url: "/carrier/fleet", icon: Truck },
  { title: "Drivers", url: "/carrier/drivers", icon: User },
  { title: "Available Loads", url: "/carrier/loads", icon: Route },
  { title: "My Bids", url: "/carrier/bids", icon: Gavel },
  { title: "Active Trips", url: "/carrier/trips", icon: MapPin },
  { title: "Trip History", url: "/carrier/history", icon: History },
  { title: "Revenue", url: "/carrier/revenue", icon: DollarSign },
  { title: "Documents", url: "/carrier/documents", icon: FileText },
];

const soloItems = [
  { title: "Load Feed", url: "/solo", icon: Route },
  { title: "My Bids", url: "/solo/bids", icon: Gavel },
  { title: "My Trips", url: "/solo/trips", icon: Truck },
  { title: "Earnings", url: "/solo/earnings", icon: DollarSign },
];

const adminItems = [
  { title: "Overview", url: "/admin", icon: LayoutDashboard },
  { title: "Load Queue", url: "/admin/queue", icon: ClipboardList },
  { title: "Bids & Negotiations", url: "/admin/negotiations", icon: Gavel },
  { title: "Invoices", url: "/admin/invoices", icon: FileText },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "All Loads", url: "/admin/loads", icon: Package },
  { title: "Carriers", url: "/admin/carriers", icon: Truck },
  { title: "Verification", url: "/admin/verification", icon: Shield },
  { title: "Reports", url: "/admin/reports", icon: BarChart3 },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  const isSoloPortal = location.startsWith("/solo");

  const getNavItems = () => {
    if (isSoloPortal) return soloItems;
    switch (user?.role) {
      case "shipper":
        return shipperItems;
      case "carrier":
        return carrierItems;
      case "admin":
        return adminItems;
      default:
        return shipperItems;
    }
  };

  const getRoleLabel = () => {
    if (isSoloPortal) return "Solo Driver";
    switch (user?.role) {
      case "shipper":
        return "Shipper Portal";
      case "carrier":
        return "Carrier Portal";
      case "admin":
        return "Admin Console";
      default:
        return "Portal";
    }
  };

  const getRoleBadgeVariant = () => {
    switch (user?.role) {
      case "admin":
        return "destructive";
      case "carrier":
        return "secondary";
      default:
        return "default";
    }
  };

  const items = getNavItems();

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Truck className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-semibold" data-testid="text-app-name">FreightFlow</span>
            <Badge variant={getRoleBadgeVariant()} className="w-fit text-xs">
              {getRoleLabel()}
            </Badge>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive = location === item.url || 
                  (item.url !== "/" && location.startsWith(item.url) && item.url.split("/").length > 2);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild data-active={isActive}>
                      <Link href={item.url} data-testid={`link-nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild data-active={location === "/settings"}>
                  <Link href="/settings" data-testid="link-nav-settings">
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-sidebar-border">
        {user && (
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback className="bg-primary/10 text-primary">
                {user.username?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-medium truncate" data-testid="text-username">
                {user.username}
              </span>
              <span className="text-xs text-muted-foreground truncate">
                {user.companyName || user.email}
              </span>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
