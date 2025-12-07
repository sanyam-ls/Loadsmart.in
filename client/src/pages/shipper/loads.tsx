import { useState } from "react";
import { useLocation } from "wouter";
import { Plus, Search, Filter, Package, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadCard } from "@/components/load-card";
import { EmptyState } from "@/components/empty-state";

const mockLoads = [
  {
    id: "1",
    shipperId: "s1",
    pickupAddress: "123 Industrial Way",
    pickupCity: "Los Angeles, CA",
    dropoffAddress: "456 Commerce St",
    dropoffCity: "Phoenix, AZ",
    weight: "15000",
    weightUnit: "lbs",
    estimatedPrice: "2500",
    status: "bidding" as const,
    pickupDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2),
    bidCount: 4,
  },
  {
    id: "2",
    shipperId: "s1",
    pickupAddress: "789 Warehouse Blvd",
    pickupCity: "San Francisco, CA",
    dropoffAddress: "321 Distribution Center",
    dropoffCity: "Denver, CO",
    weight: "22000",
    weightUnit: "lbs",
    estimatedPrice: "4200",
    status: "in_transit" as const,
    pickupDate: new Date(),
    bidCount: 0,
  },
  {
    id: "3",
    shipperId: "s1",
    pickupAddress: "555 Factory Lane",
    pickupCity: "Seattle, WA",
    dropoffAddress: "888 Retail Park",
    dropoffCity: "Portland, OR",
    weight: "8500",
    weightUnit: "lbs",
    estimatedPrice: "1200",
    status: "posted" as const,
    pickupDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5),
    bidCount: 2,
  },
  {
    id: "4",
    shipperId: "s1",
    pickupAddress: "100 Main Street",
    pickupCity: "Chicago, IL",
    dropoffAddress: "200 Market Ave",
    dropoffCity: "Detroit, MI",
    weight: "18000",
    weightUnit: "lbs",
    estimatedPrice: "2100",
    status: "delivered" as const,
    pickupDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
    bidCount: 6,
  },
];

export default function ShipperLoadsPage() {
  const [, navigate] = useLocation();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredLoads = mockLoads.filter((load) => {
    const matchesStatus = statusFilter === "all" || load.status === statusFilter;
    const matchesSearch = 
      load.pickupCity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      load.dropoffCity.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const statusCounts = {
    all: mockLoads.length,
    posted: mockLoads.filter((l) => l.status === "posted").length,
    bidding: mockLoads.filter((l) => l.status === "bidding").length,
    in_transit: mockLoads.filter((l) => l.status === "in_transit").length,
    delivered: mockLoads.filter((l) => l.status === "delivered").length,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl font-bold">My Loads</h1>
          <p className="text-muted-foreground">Manage all your posted loads and track their status.</p>
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
            placeholder="Search by city..."
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
            <SelectItem value="posted">Posted ({statusCounts.posted})</SelectItem>
            <SelectItem value="bidding">Bidding ({statusCounts.bidding})</SelectItem>
            <SelectItem value="in_transit">In Transit ({statusCounts.in_transit})</SelectItem>
            <SelectItem value="delivered">Delivered ({statusCounts.delivered})</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("grid")}
            data-testid="button-view-grid"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("list")}
            className="ml-1"
            data-testid="button-view-list"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mb-6">
        <TabsList>
          <TabsTrigger value="all" className="gap-2">
            All
            <Badge variant="secondary" className="ml-1">{statusCounts.all}</Badge>
          </TabsTrigger>
          <TabsTrigger value="posted" className="gap-2">
            Posted
            <Badge variant="secondary" className="ml-1">{statusCounts.posted}</Badge>
          </TabsTrigger>
          <TabsTrigger value="bidding" className="gap-2">
            Bidding
            <Badge variant="secondary" className="ml-1">{statusCounts.bidding}</Badge>
          </TabsTrigger>
          <TabsTrigger value="in_transit" className="gap-2">
            In Transit
            <Badge variant="secondary" className="ml-1">{statusCounts.in_transit}</Badge>
          </TabsTrigger>
          <TabsTrigger value="delivered" className="gap-2">
            Delivered
            <Badge variant="secondary" className="ml-1">{statusCounts.delivered}</Badge>
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
      ) : (
        <div className={
          viewMode === "grid"
            ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            : "space-y-4"
        }>
          {filteredLoads.map((load) => (
            <LoadCard
              key={load.id}
              load={load as any}
              variant="shipper"
              onViewDetails={() => navigate(`/shipper/loads/${load.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
