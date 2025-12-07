import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Plus, Search, Filter, Package, LayoutGrid, List, MapPin, ArrowRight, 
  Clock, DollarSign, Truck, MoreHorizontal, Edit, Copy, X, Eye, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Load, Bid } from "@shared/schema";

function getStatusColor(status: string | null) {
  switch (status) {
    case "draft": return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
    case "posted": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "bidding": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    case "assigned": return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
    case "in_transit": return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400";
    case "delivered": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "cancelled": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    default: return "bg-muted text-muted-foreground";
  }
}

function formatStatus(status: string | null) {
  if (!status) return "Draft";
  return status.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function formatDate(date: Date | string | null) {
  if (!date) return "TBD";
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTimeAgo(date: Date | string | null) {
  if (!date) return "";
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export default function ShipperLoadsPage() {
  const [, navigate] = useLocation();
  const searchParams = useSearch();
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; loadId: string | null }>({ open: false, loadId: null });

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    const status = params.get("status");
    if (status === "active") setStatusFilter("active");
    else if (status === "bidding") setStatusFilter("bidding");
    else if (status) setStatusFilter(status);
  }, [searchParams]);

  const { data: loads = [], isLoading } = useQuery<Load[]>({
    queryKey: ["/api/loads"],
    refetchInterval: 15000,
  });

  const { data: allBids = [] } = useQuery<Bid[]>({
    queryKey: ["/api/bids"],
  });

  const cancelMutation = useMutation({
    mutationFn: async (loadId: string) => {
      await apiRequest("PATCH", `/api/loads/${loadId}`, { status: "cancelled" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loads"] });
      toast({ title: "Load cancelled", description: "The load has been cancelled successfully." });
      setCancelDialog({ open: false, loadId: null });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to cancel load", variant: "destructive" });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (load: Load) => {
      const newLoad = {
        pickupAddress: load.pickupAddress,
        pickupCity: load.pickupCity,
        dropoffAddress: load.dropoffAddress,
        dropoffCity: load.dropoffCity,
        weight: load.weight,
        weightUnit: load.weightUnit,
        cargoDescription: load.cargoDescription,
        requiredTruckType: load.requiredTruckType,
        estimatedPrice: load.estimatedPrice,
        status: "draft",
      };
      await apiRequest("POST", "/api/loads", newLoad);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loads"] });
      toast({ title: "Load duplicated", description: "A new draft load has been created." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to duplicate load", variant: "destructive" });
    },
  });

  const loadsWithBids = loads.map(load => ({
    ...load,
    bidCount: allBids.filter(b => b.loadId === load.id).length,
    bids: allBids.filter(b => b.loadId === load.id),
  }));

  const filteredLoads = loadsWithBids.filter((load) => {
    let matchesStatus = true;
    if (statusFilter === "active") {
      matchesStatus = ["posted", "bidding", "assigned"].includes(load.status || "");
    } else if (statusFilter !== "all") {
      matchesStatus = load.status === statusFilter;
    }
    const matchesSearch = 
      load.pickupCity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      load.dropoffCity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      load.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const statusCounts = {
    all: loads.length,
    active: loads.filter(l => ["posted", "bidding", "assigned"].includes(l.status || "")).length,
    posted: loads.filter((l) => l.status === "posted").length,
    bidding: loads.filter((l) => l.status === "bidding").length,
    assigned: loads.filter((l) => l.status === "assigned").length,
    in_transit: loads.filter((l) => l.status === "in_transit").length,
    delivered: loads.filter((l) => l.status === "delivered").length,
    cancelled: loads.filter((l) => l.status === "cancelled").length,
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl font-bold">Active Loads</h1>
          <p className="text-muted-foreground">Manage all your posted loads, track status, and view bids.</p>
        </div>
        <Button onClick={() => navigate("/shipper/post-load")} data-testid="button-post-new-load">
          <Plus className="h-4 w-4 mr-2" />
          Post New Load
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by city or load ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-loads"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48" data-testid="select-status-filter">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Loads ({statusCounts.all})</SelectItem>
            <SelectItem value="active">Active ({statusCounts.active})</SelectItem>
            <SelectItem value="posted">Posted ({statusCounts.posted})</SelectItem>
            <SelectItem value="bidding">Bidding ({statusCounts.bidding})</SelectItem>
            <SelectItem value="assigned">Assigned ({statusCounts.assigned})</SelectItem>
            <SelectItem value="in_transit">In Transit ({statusCounts.in_transit})</SelectItem>
            <SelectItem value="delivered">Delivered ({statusCounts.delivered})</SelectItem>
            <SelectItem value="cancelled">Cancelled ({statusCounts.cancelled})</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex">
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("table")}
            data-testid="button-view-table"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("grid")}
            className="ml-1"
            data-testid="button-view-grid"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mb-6">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="all" className="gap-2">
            All <Badge variant="secondary" className="ml-1">{statusCounts.all}</Badge>
          </TabsTrigger>
          <TabsTrigger value="active" className="gap-2">
            Active <Badge variant="secondary" className="ml-1">{statusCounts.active}</Badge>
          </TabsTrigger>
          <TabsTrigger value="bidding" className="gap-2">
            Bidding <Badge variant="secondary" className="ml-1">{statusCounts.bidding}</Badge>
          </TabsTrigger>
          <TabsTrigger value="in_transit" className="gap-2">
            In Transit <Badge variant="secondary" className="ml-1">{statusCounts.in_transit}</Badge>
          </TabsTrigger>
          <TabsTrigger value="delivered" className="gap-2">
            Delivered <Badge variant="secondary" className="ml-1">{statusCounts.delivered}</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {filteredLoads.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No loads found"
          description={
            statusFilter === "all"
              ? "You haven't posted any loads yet. Start by posting your first load to connect with carriers."
              : `No loads with "${statusFilter.replace("_", " ")}" status.`
          }
          actionLabel="Post Your First Load"
          onAction={() => navigate("/shipper/post-load")}
        />
      ) : viewMode === "table" ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Load ID</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Bids</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Pickup Date</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLoads.map((load) => (
                <TableRow 
                  key={load.id} 
                  className="cursor-pointer hover-elevate"
                  onClick={() => navigate(`/shipper/loads/${load.id}`)}
                  data-testid={`row-load-${load.id}`}
                >
                  <TableCell className="font-mono text-sm">{load.id.slice(0, 8)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3 text-green-500" />
                      <span className="truncate max-w-24">{load.pickupCity}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <MapPin className="h-3 w-3 text-red-500" />
                      <span className="truncate max-w-24">{load.dropoffCity}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate">
                      {load.requiredTruckType || "Any"}
                    </Badge>
                  </TableCell>
                  <TableCell>{load.weight} {load.weightUnit}</TableCell>
                  <TableCell>
                    <Badge className={`${getStatusColor(load.status)} no-default-hover-elevate no-default-active-elevate`}>
                      {formatStatus(load.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {load.bidCount > 0 ? (
                      <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">
                        {load.bidCount} bid{load.bidCount !== 1 ? 's' : ''}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    ${Number(load.finalPrice || load.estimatedPrice || 0).toLocaleString()}
                  </TableCell>
                  <TableCell>{formatDate(load.pickupDate)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatTimeAgo(load.createdAt)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" data-testid={`button-menu-${load.id}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/shipper/loads/${load.id}`); }}>
                          <Eye className="h-4 w-4 mr-2" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/shipper/loads/${load.id}/edit`); }}>
                          <Edit className="h-4 w-4 mr-2" /> Edit Load
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); duplicateMutation.mutate(load); }}>
                          <Copy className="h-4 w-4 mr-2" /> Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={(e) => { e.stopPropagation(); setCancelDialog({ open: true, loadId: load.id }); }}
                          disabled={load.status === "cancelled" || load.status === "delivered"}
                        >
                          <X className="h-4 w-4 mr-2" /> Cancel Load
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredLoads.map((load) => (
            <Card 
              key={load.id} 
              className="hover-elevate cursor-pointer"
              onClick={() => navigate(`/shipper/loads/${load.id}`)}
              data-testid={`card-load-${load.id}`}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <Badge className={`${getStatusColor(load.status)} no-default-hover-elevate no-default-active-elevate`}>
                    {formatStatus(load.status)}
                  </Badge>
                  <div className="flex items-center gap-2">
                    {load.bidCount > 0 && (
                      <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">
                        {load.bidCount} bids
                      </Badge>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/shipper/loads/${load.id}/edit`); }}>
                          <Edit className="h-4 w-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); duplicateMutation.mutate(load); }}>
                          <Copy className="h-4 w-4 mr-2" /> Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={(e) => { e.stopPropagation(); setCancelDialog({ open: true, loadId: load.id }); }}
                        >
                          <X className="h-4 w-4 mr-2" /> Cancel
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 flex-shrink-0">
                      <MapPin className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{load.pickupCity}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center pl-3">
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    <div className="flex-1 h-px bg-border ml-2" />
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 flex-shrink-0">
                      <MapPin className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{load.dropoffCity}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Package className="h-3.5 w-3.5" />
                    <span>{load.weight} {load.weightUnit}</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{formatDate(load.pickupDate)}</span>
                  </div>
                  <div className="flex items-center gap-1 ml-auto font-medium text-foreground">
                    <DollarSign className="h-3.5 w-3.5" />
                    <span>{Number(load.estimatedPrice || 0).toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={cancelDialog.open} onOpenChange={(open) => setCancelDialog({ open, loadId: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Load</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this load? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialog({ open: false, loadId: null })}>
              Keep Load
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => cancelDialog.loadId && cancelMutation.mutate(cancelDialog.loadId)}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? "Cancelling..." : "Cancel Load"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
