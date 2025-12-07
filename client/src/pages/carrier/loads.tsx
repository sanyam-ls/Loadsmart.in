import { useState } from "react";
import { Search, Filter, MapPin, LayoutGrid, List, Map, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoadCard } from "@/components/load-card";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/hooks/use-toast";

const mockLoads = [
  {
    id: "l1",
    shipperId: "s1",
    pickupAddress: "123 Industrial Way",
    pickupCity: "Los Angeles, CA",
    dropoffAddress: "456 Commerce St",
    dropoffCity: "Phoenix, AZ",
    weight: "15000",
    weightUnit: "lbs",
    estimatedPrice: "2500",
    status: "posted",
    pickupDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2),
    distance: 372,
    matchScore: 92,
    shipper: { companyName: "ABC Manufacturing" },
  },
  {
    id: "l2",
    shipperId: "s2",
    pickupAddress: "789 Warehouse Blvd",
    pickupCity: "San Diego, CA",
    dropoffAddress: "321 Distribution Center",
    dropoffCity: "Las Vegas, NV",
    weight: "18000",
    weightUnit: "lbs",
    estimatedPrice: "2100",
    status: "posted",
    pickupDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 1),
    distance: 330,
    matchScore: 87,
    shipper: { companyName: "XYZ Logistics" },
  },
  {
    id: "l3",
    shipperId: "s3",
    pickupAddress: "555 Factory Lane",
    pickupCity: "Oakland, CA",
    dropoffAddress: "888 Retail Park",
    dropoffCity: "Salt Lake City, UT",
    weight: "22000",
    weightUnit: "lbs",
    estimatedPrice: "4200",
    status: "posted",
    pickupDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
    distance: 750,
    matchScore: 78,
    shipper: { companyName: "Premier Goods" },
  },
  {
    id: "l4",
    shipperId: "s4",
    pickupAddress: "100 Main Street",
    pickupCity: "Portland, OR",
    dropoffAddress: "200 Market Ave",
    dropoffCity: "Seattle, WA",
    weight: "12000",
    weightUnit: "lbs",
    estimatedPrice: "950",
    status: "posted",
    pickupDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 4),
    distance: 175,
    matchScore: 95,
    shipper: { companyName: "Northwest Supply" },
  },
];

export default function CarrierLoadsPage() {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<"grid" | "list" | "map">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [distanceFilter, setDistanceFilter] = useState("all");
  const [bidDialogOpen, setBidDialogOpen] = useState(false);
  const [selectedLoad, setSelectedLoad] = useState<typeof mockLoads[0] | null>(null);
  const [bidAmount, setBidAmount] = useState("");

  const filteredLoads = mockLoads.filter((load) => {
    const matchesSearch =
      load.pickupCity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      load.dropoffCity.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDistance =
      distanceFilter === "all" ||
      (distanceFilter === "short" && load.distance < 300) ||
      (distanceFilter === "medium" && load.distance >= 300 && load.distance < 600) ||
      (distanceFilter === "long" && load.distance >= 600);
    return matchesSearch && matchesDistance;
  });

  const handleBid = (load: typeof mockLoads[0]) => {
    setSelectedLoad(load);
    setBidAmount(load.estimatedPrice || "");
    setBidDialogOpen(true);
  };

  const submitBid = () => {
    if (!bidAmount || !selectedLoad) return;
    toast({
      title: "Bid submitted!",
      description: `Your bid of $${Number(bidAmount).toLocaleString()} has been sent to the shipper.`,
    });
    setBidDialogOpen(false);
    setBidAmount("");
    setSelectedLoad(null);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Available Loads</h1>
        <p className="text-muted-foreground">Find and bid on loads that match your fleet.</p>
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
        <Select value={distanceFilter} onValueChange={setDistanceFilter}>
          <SelectTrigger className="w-full sm:w-48" data-testid="select-distance-filter">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Distance" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Distances</SelectItem>
            <SelectItem value="short">Under 300 mi</SelectItem>
            <SelectItem value="medium">300-600 mi</SelectItem>
            <SelectItem value="long">Over 600 mi</SelectItem>
          </SelectContent>
        </Select>
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
          <TabsList>
            <TabsTrigger value="grid" data-testid="button-view-grid">
              <LayoutGrid className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="list" data-testid="button-view-list">
              <List className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="map" data-testid="button-view-map">
              <Map className="h-4 w-4" />
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {viewMode === "map" ? (
        <Card>
          <CardContent className="p-0">
            <div className="aspect-video bg-muted/50 rounded-lg flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">Map View</p>
                <p className="text-xs">Interactive map coming soon</p>
                <p className="text-xs mt-2">{filteredLoads.length} loads in your area</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : filteredLoads.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No loads found"
          description="There are no loads matching your criteria right now. Check back soon or adjust your filters."
        />
      ) : (
        <div className={
          viewMode === "grid"
            ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            : "space-y-4"
        }>
          {filteredLoads.map((load) => (
            <Card key={load.id} className="hover-elevate" data-testid={`load-card-${load.id}`}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 no-default-hover-elevate no-default-active-elevate">
                    {load.matchScore}% match
                  </Badge>
                  <span className="text-xs text-muted-foreground">{load.distance} miles</span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-sm">{load.pickupCity}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-red-500" />
                    <span className="text-sm">{load.dropoffCity}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm mb-4">
                  <span className="text-muted-foreground">
                    {load.weight} {load.weightUnit}
                  </span>
                  <span className="text-lg font-bold">
                    ${Number(load.estimatedPrice).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                  <span>{load.shipper?.companyName}</span>
                  <span>
                    Pickup: {new Date(load.pickupDate).toLocaleDateString([], { month: "short", day: "numeric" })}
                  </span>
                </div>

                <Button 
                  className="w-full" 
                  onClick={() => handleBid(load)}
                  data-testid={`button-bid-${load.id}`}
                >
                  Place Bid
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={bidDialogOpen} onOpenChange={setBidDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Place Bid</DialogTitle>
            <DialogDescription>
              {selectedLoad && (
                <>
                  Route: {selectedLoad.pickupCity} → {selectedLoad.dropoffCity}
                  <br />
                  Suggested price: ${Number(selectedLoad.estimatedPrice).toLocaleString()}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">Your Bid Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                className="pl-7"
                placeholder="Enter bid amount"
                data-testid="input-bid-amount"
              />
            </div>
            {selectedLoad && bidAmount && (
              <p className="text-sm text-muted-foreground mt-2">
                Rate per mile: ${(Number(bidAmount) / selectedLoad.distance).toFixed(2)}/mi
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBidDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitBid} data-testid="button-submit-bid">
              Submit Bid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
