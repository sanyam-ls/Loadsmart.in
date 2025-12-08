import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { 
  Plus, Search, Filter, Package, LayoutGrid, List, MapPin, ArrowRight, 
  Clock, DollarSign, Truck, MoreHorizontal, Edit, Copy, X, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
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
import { useMockData, type MockLoad } from "@/lib/mock-data-store";

function getStatusColor(status: string | null) {
  switch (status) {
    case "Active": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "Bidding": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    case "Assigned": return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
    case "En Route": return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400";
    case "Delivered": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "Cancelled": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    default: return "bg-muted text-muted-foreground";
  }
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

  const { loads, bids, cancelLoad, duplicateLoad, getBidsForLoad } = useMockData();

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    const status = params.get("status");
    if (status === "active") setStatusFilter("active");
    else if (status === "bidding") setStatusFilter("Bidding");
    else if (status) setStatusFilter(status);
  }, [searchParams]);

  const handleCancel = (loadId: string) => {
    cancelLoad(loadId);
    toast({ title: "Load cancelled", description: "The load has been cancelled successfully." });
    setCancelDialog({ open: false, loadId: null });
  };

  const handleDuplicate = (loadId: string) => {
    const newLoad = duplicateLoad(loadId);
    if (newLoad) {
      toast({ title: "Load duplicated", description: `Created new load ${newLoad.loadId}` });
    }
  };

  const loadsWithBids = loads.map(load => ({
    ...load,
    bidCount: getBidsForLoad(load.loadId).length,
    loadBids: getBidsForLoad(load.loadId),
  }));

  const filteredLoads = loadsWithBids.filter((load) => {
    let matchesStatus = true;
    if (statusFilter === "active") {
      matchesStatus = ["Active", "Bidding", "Assigned"].includes(load.status);
    } else if (statusFilter !== "all") {
      matchesStatus = load.status === statusFilter;
    }
    const matchesSearch = 
      load.pickup.toLowerCase().includes(searchQuery.toLowerCase()) ||
      load.drop.toLowerCase().includes(searchQuery.toLowerCase()) ||
      load.loadId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const statusCounts = {
    all: loads.length,
    active: loads.filter(l => ["Active", "Bidding", "Assigned"].includes(l.status)).length,
    Active: loads.filter((l) => l.status === "Active").length,
    Bidding: loads.filter((l) => l.status === "Bidding").length,
    Assigned: loads.filter((l) => l.status === "Assigned").length,
    "En Route": loads.filter((l) => l.status === "En Route").length,
    Delivered: loads.filter((l) => l.status === "Delivered").length,
    Cancelled: loads.filter((l) => l.status === "Cancelled").length,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Active Loads</h1>
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
            <SelectItem value="Active">Posted ({statusCounts.Active})</SelectItem>
            <SelectItem value="Bidding">Bidding ({statusCounts.Bidding})</SelectItem>
            <SelectItem value="Assigned">Assigned ({statusCounts.Assigned})</SelectItem>
            <SelectItem value="En Route">In Transit ({statusCounts["En Route"]})</SelectItem>
            <SelectItem value="Delivered">Delivered ({statusCounts.Delivered})</SelectItem>
            <SelectItem value="Cancelled">Cancelled ({statusCounts.Cancelled})</SelectItem>
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
          <TabsTrigger value="Bidding" className="gap-2">
            Bidding <Badge variant="secondary" className="ml-1">{statusCounts.Bidding}</Badge>
          </TabsTrigger>
          <TabsTrigger value="En Route" className="gap-2">
            In Transit <Badge variant="secondary" className="ml-1">{statusCounts["En Route"]}</Badge>
          </TabsTrigger>
          <TabsTrigger value="Delivered" className="gap-2">
            Delivered <Badge variant="secondary" className="ml-1">{statusCounts.Delivered}</Badge>
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
              : `No loads with "${statusFilter}" status.`
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
                <TableHead>Created</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLoads.map((load) => (
                <TableRow 
                  key={load.loadId} 
                  className="cursor-pointer hover-elevate"
                  onClick={() => navigate(`/shipper/loads/${load.loadId}`)}
                  data-testid={`row-load-${load.loadId}`}
                >
                  <TableCell className="font-mono text-sm">{load.loadId}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3 text-green-500" />
                      <span className="truncate max-w-24">{load.pickup}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <MapPin className="h-3 w-3 text-red-500" />
                      <span className="truncate max-w-24">{load.drop}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate">
                      {load.type || "Any"}
                    </Badge>
                  </TableCell>
                  <TableCell>{load.weight.toLocaleString()} {load.weightUnit}</TableCell>
                  <TableCell>
                    <Badge className={`${getStatusColor(load.status)} no-default-hover-elevate no-default-active-elevate`}>
                      {load.status}
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
                    ${(load.finalPrice || load.estimatedPrice || 0).toLocaleString()}
                  </TableCell>
                  <TableCell>{formatDate(load.pickupDate)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatTimeAgo(load.createdAt)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" data-testid={`button-menu-${load.loadId}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/shipper/loads/${load.loadId}`); }}>
                          <Eye className="h-4 w-4 mr-2" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicate(load.loadId); }}>
                          <Copy className="h-4 w-4 mr-2" /> Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={(e) => { e.stopPropagation(); setCancelDialog({ open: true, loadId: load.loadId }); }}
                          disabled={load.status === "Cancelled" || load.status === "Delivered"}
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
              key={load.loadId} 
              className="hover-elevate cursor-pointer"
              onClick={() => navigate(`/shipper/loads/${load.loadId}`)}
              data-testid={`card-load-${load.loadId}`}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <Badge className={`${getStatusColor(load.status)} no-default-hover-elevate no-default-active-elevate`}>
                    {load.status}
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
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicate(load.loadId); }}>
                          <Copy className="h-4 w-4 mr-2" /> Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={(e) => { e.stopPropagation(); setCancelDialog({ open: true, loadId: load.loadId }); }}
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
                      <p className="text-sm font-medium truncate">{load.pickup}</p>
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
                      <p className="text-sm font-medium truncate">{load.drop}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Package className="h-3.5 w-3.5" />
                    <span>{load.weight.toLocaleString()} {load.weightUnit}</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{formatDate(load.pickupDate)}</span>
                  </div>
                  <div className="flex items-center gap-1 ml-auto font-medium text-foreground">
                    <DollarSign className="h-3.5 w-3.5" />
                    <span>{(load.estimatedPrice || 0).toLocaleString()}</span>
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
              onClick={() => cancelDialog.loadId && handleCancel(cancelDialog.loadId)}
            >
              Cancel Load
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
