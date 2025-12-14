import { useState } from "react";
import { useLocation } from "wouter";
import { Bell, Check, Package, Gavel, MapPin, FileText, Truck, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useMockData, type MockNotification } from "@/lib/mock-data-store";
import { useAuth } from "@/lib/auth-context";

function getNotificationIcon(type: string) {
  switch (type) {
    case "bid":
      return <Gavel className="h-4 w-4" />;
    case "shipment":
      return <Truck className="h-4 w-4" />;
    case "document":
      return <FileText className="h-4 w-4" />;
    default:
      return <Package className="h-4 w-4" />;
  }
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getTypeLabel(type: string): string {
  switch (type) {
    case "bid":
      return "Bids";
    case "shipment":
      return "Shipments";
    case "document":
      return "Documents";
    default:
      return "General";
  }
}

export function NotificationPanel() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { notifications, markNotificationRead, markAllNotificationsRead, getUnreadNotificationCount } = useMockData();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const handleNotificationClick = (notification: MockNotification) => {
    markNotificationRead(notification.id);
    setIsOpen(false);
    
    if (notification.loadId) {
      if (user?.role === "admin") {
        navigate(`/admin/load-queue?highlight=${notification.loadId}`);
      } else if (user?.role === "carrier") {
        navigate(`/carrier/loads?highlight=${notification.loadId}`);
      } else if (user?.role === "shipper") {
        navigate(`/shipper/loads/${notification.loadId}`);
      }
    }
  };

  const unreadCount = getUnreadNotificationCount();

  const filteredNotifications = activeTab === "all" 
    ? notifications 
    : notifications.filter(n => n.type === activeTab);

  const bidNotifications = notifications.filter(n => n.type === "bid");
  const shipmentNotifications = notifications.filter(n => n.type === "shipment");
  const documentNotifications = notifications.filter(n => n.type === "document");

  const unreadByType = {
    bid: bidNotifications.filter(n => !n.isRead).length,
    shipment: shipmentNotifications.filter(n => !n.isRead).length,
    document: documentNotifications.filter(n => !n.isRead).length,
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" data-testid="button-notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-medium">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between gap-2 p-4 border-b border-border">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllNotificationsRead}
              className="text-xs h-auto py-1"
              data-testid="button-mark-all-read"
            >
              <Check className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
            <TabsTrigger 
              value="all" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              data-testid="tab-all"
            >
              All
            </TabsTrigger>
            <TabsTrigger 
              value="bid" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent relative"
              data-testid="tab-bids"
            >
              Bids
              {unreadByType.bid > 0 && (
                <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                  {unreadByType.bid}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="shipment" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent relative"
              data-testid="tab-shipments"
            >
              Shipments
              {unreadByType.shipment > 0 && (
                <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                  {unreadByType.shipment}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="document" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent relative"
              data-testid="tab-documents"
            >
              Docs
              {unreadByType.document > 0 && (
                <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                  {unreadByType.document}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-0">
            <ScrollArea className="h-80">
              {filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6">
                  <Bell className="h-12 w-12 mb-2 opacity-50" />
                  <p className="text-sm">No {activeTab === "all" ? "" : activeTab} notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover-elevate cursor-pointer ${
                        !notification.isRead ? "bg-primary/5" : ""
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                      data-testid={`notification-item-${notification.id}`}
                    >
                      <div className="flex gap-3">
                        <div className={`flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full ${
                          !notification.isRead ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                        }`}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium">{notification.title}</p>
                            {!notification.isRead && (
                              <span className="flex-shrink-0 w-2 h-2 bg-primary rounded-full" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">
                              {getTimeAgo(notification.createdAt)}
                            </span>
                            {notification.loadId && (
                              <span className="text-xs text-primary">
                                {notification.loadId}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
