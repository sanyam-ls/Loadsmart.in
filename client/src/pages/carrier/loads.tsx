import { useState, useMemo } from "react";
import { 
  Search, Filter, MapPin, LayoutGrid, List, Map, Package, Star, 
  Truck, Clock, TrendingUp, ArrowRight, Building2, AlertCircle, 
  Target, Timer, Sparkles, ShieldCheck, Lock, Unlock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { EmptyState } from "@/components/empty-state";
import { StatCard } from "@/components/stat-card";
import { useToast } from "@/hooks/use-toast";
import { useCarrierData, type AvailableLoad } from "@/lib/carrier-data-store";
import { format, differenceInHours } from "date-fns";

function formatCurrency(amount: number): string {
  if (amount >= 100000) {
    return `Rs. ${(amount / 100000).toFixed(1)}L`;
  }
  return `Rs. ${amount.toLocaleString()}`;
}

function getMatchScoreColor(score: number) {
  if (score >= 85) return "text-green-600 dark:text-green-400";
  if (score >= 70) return "text-amber-600 dark:text-amber-400";
  return "text-muted-foreground";
}

function getMatchScoreBadge(score: number) {
  if (score >= 90) return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  if (score >= 75) return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
  return "bg-muted text-muted-foreground";
}

export default function CarrierLoadsPage() {
  const { toast } = useToast();
  const { availableLoads, placeBid } = useCarrierData();
  
  const [viewMode, setViewMode] = useState<"grid" | "list" | "map">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [distanceFilter, setDistanceFilter] = useState("all");
  const [loadTypeFilter, setLoadTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("match");
  const [bidDialogOpen, setBidDialogOpen] = useState(false);
  const [selectedLoad, setSelectedLoad] = useState<AvailableLoad | null>(null);
  const [bidAmount, setBidAmount] = useState("");

  const filteredAndSortedLoads = useMemo(() => {
    let filtered = availableLoads.filter((load) => {
      const matchesSearch =
        load.pickup.toLowerCase().includes(searchQuery.toLowerCase()) ||
        load.dropoff.toLowerCase().includes(searchQuery.toLowerCase()) ||
        load.shipperCompany.toLowerCase().includes(searchQuery.toLowerCase()) ||
        load.loadId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDistance =
        distanceFilter === "all" ||
        (distanceFilter === "short" && load.distance < 500) ||
        (distanceFilter === "medium" && load.distance >= 500 && load.distance < 1000) ||
        (distanceFilter === "long" && load.distance >= 1000);
      const matchesLoadType = loadTypeFilter === "all" || load.loadType === loadTypeFilter;
      return matchesSearch && matchesDistance && matchesLoadType;
    });

    switch (sortBy) {
      case "match":
        filtered.sort((a, b) => b.matchScore - a.matchScore);
        break;
      case "rate":
        filtered.sort((a, b) => b.expectedRate - a.expectedRate);
        break;
      case "distance":
        filtered.sort((a, b) => a.distance - b.distance);
        break;
      case "newest":
        filtered.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
        break;
    }

    return filtered;
  }, [availableLoads, searchQuery, distanceFilter, loadTypeFilter, sortBy]);

  const loadTypes = useMemo(() => {
    const types = new Set(availableLoads.map(l => l.loadType));
    return Array.from(types);
  }, [availableLoads]);

  const stats = useMemo(() => {
    const total = availableLoads.length;
    const highMatch = availableLoads.filter(l => l.matchScore >= 85).length;
    const avgRate = availableLoads.length > 0
      ? Math.round(availableLoads.reduce((sum, l) => sum + l.expectedRate, 0) / availableLoads.length)
      : 0;
    const urgentLoads = availableLoads.filter(l => 
      differenceInHours(new Date(l.expiresAt), new Date()) < 12
    ).length;
    
    return { total, highMatch, avgRate, urgentLoads };
  }, [availableLoads]);

  const handleBid = (load: AvailableLoad) => {
    setSelectedLoad(load);
    setBidAmount(load.expectedRate.toString());
    setBidDialogOpen(true);
  };

  const submitBid = () => {
    if (!bidAmount || !selectedLoad) return;
    
    placeBid(selectedLoad.loadId, parseInt(bidAmount));
    
    toast({
      title: "Bid Placed Successfully",
      description: `Your bid of ${formatCurrency(parseInt(bidAmount))} has been sent to ${selectedLoad.shipperCompany}.`,
    });
    setBidDialogOpen(false);
    setBidAmount("");
    setSelectedLoad(null);
  };

  const topRecommendations = filteredAndSortedLoads
    .filter(l => l.matchScore >= 85)
    .slice(0, 3);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-loads-title">Smart Load Matching</h1>
          <p className="text-muted-foreground">Find and bid on {availableLoads.length} loads optimized for your fleet</p>
        </div>
      </div>
      
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Available Loads"
          value={stats.total}
          icon={Package}
          subtitle="Currently posted"
          testId="stat-total-loads"
        />
        <StatCard
          title="High Match"
          value={stats.highMatch}
          icon={Target}
          subtitle="85%+ compatibility"
          testId="stat-high-match"
        />
        <StatCard
          title="Avg. Rate"
          value={formatCurrency(stats.avgRate)}
          icon={TrendingUp}
          subtitle="Per load"
          testId="stat-avg-rate"
        />
        <StatCard
          title="Urgent Loads"
          value={stats.urgentLoads}
          icon={Timer}
          subtitle="Expiring soon"
          testId="stat-urgent"
        />
      </div>

      {topRecommendations.length > 0 && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Recommended for Your Fleet
            </CardTitle>
            <CardDescription>Top matches based on your trucks, locations, and history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              {topRecommendations.map((load) => (
                <Card key={load.loadId} className="hover-elevate" data-testid={`rec-load-${load.loadId}`}>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`${getMatchScoreBadge(load.matchScore)} no-default-hover-elevate no-default-active-elevate`}>
                          <Target className="h-3 w-3 mr-1" />
                          {load.matchScore}% Match
                        </Badge>
                        {load.postedByAdmin && (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 no-default-hover-elevate no-default-active-elevate">
                            <ShieldCheck className="h-3 w-3 mr-1" />
                            Admin
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{load.loadId}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium truncate">{load.pickup}</span>
                      <ArrowRight className="h-3 w-3" />
                      <span className="font-medium truncate">{load.dropoff}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold">{formatCurrency(load.adminFinalPrice || load.expectedRate)}</span>
                      <Button size="sm" onClick={() => handleBid(load)} data-testid={`button-bid-rec-${load.loadId}`}>
                        {load.priceFixed ? "Accept" : "Bid Now"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by city, shipper, or load ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-loads"
          />
        </div>
        <Select value={distanceFilter} onValueChange={setDistanceFilter}>
          <SelectTrigger className="w-full sm:w-36" data-testid="select-distance-filter">
            <SelectValue placeholder="Distance" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Distances</SelectItem>
            <SelectItem value="short">Under 500 km</SelectItem>
            <SelectItem value="medium">500-1000 km</SelectItem>
            <SelectItem value="long">Over 1000 km</SelectItem>
          </SelectContent>
        </Select>
        <Select value={loadTypeFilter} onValueChange={setLoadTypeFilter}>
          <SelectTrigger className="w-full sm:w-36" data-testid="select-type-filter">
            <SelectValue placeholder="Load Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {loadTypes.map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-36" data-testid="select-sort">
            <SelectValue placeholder="Sort By" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="match">Best Match</SelectItem>
            <SelectItem value="rate">Highest Rate</SelectItem>
            <SelectItem value="distance">Shortest</SelectItem>
            <SelectItem value="newest">Newest</SelectItem>
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
          </TabsList>
        </Tabs>
      </div>

      {filteredAndSortedLoads.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No loads found"
          description="No loads match your current filters. Try adjusting your search criteria."
        />
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedLoads.slice(0, 30).map((load) => (
            <Card key={load.loadId} className="hover-elevate" data-testid={`load-card-${load.loadId}`}>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`${getMatchScoreBadge(load.matchScore)} no-default-hover-elevate no-default-active-elevate`}>
                      <Target className="h-3 w-3 mr-1" />
                      {load.matchScore}% Match
                    </Badge>
                    {load.postedByAdmin && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 no-default-hover-elevate no-default-active-elevate">
                        <ShieldCheck className="h-3 w-3 mr-1" />
                        Posted by Admin
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{load.loadId}</span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-green-500" />
                    <span className="font-medium">{load.pickup}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-red-500" />
                    <span className="font-medium">{load.dropoff}</span>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{load.loadType}</Badge>
                  <Badge variant="outline">{load.weight} Tons</Badge>
                  <Badge variant="outline">{load.distance} km</Badge>
                  {load.priceFixed !== undefined && (
                    <Badge 
                      variant="outline" 
                      className={load.priceFixed 
                        ? "border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400" 
                        : "border-green-300 text-green-700 dark:border-green-700 dark:text-green-400"
                      }
                    >
                      {load.priceFixed ? (
                        <><Lock className="h-3 w-3 mr-1" />Fixed Price</>
                      ) : (
                        <><Unlock className="h-3 w-3 mr-1" />Negotiable</>
                      )}
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span>{load.shipperCompany}</span>
                  <Star className="h-3 w-3 text-amber-500 fill-amber-500 ml-1" />
                  <span>{load.shipperRating.toFixed(1)}</span>
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {load.postedByAdmin ? "Admin Price" : "Expected Rate"}
                    </p>
                    <p className="text-xl font-bold">{formatCurrency(load.adminFinalPrice || load.expectedRate)}</p>
                  </div>
                  <Button 
                    onClick={() => handleBid(load)} 
                    data-testid={`button-bid-${load.loadId}`}
                    variant={load.priceFixed ? "default" : "outline"}
                  >
                    {load.priceFixed ? "Accept" : "Place Bid"}
                  </Button>
                </div>
                
                {load.recommendedTrucks.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    <Truck className="h-3 w-3 inline mr-1" />
                    Recommended: {load.recommendedTrucks.slice(0, 2).join(", ")}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              <div className="divide-y">
                {filteredAndSortedLoads.slice(0, 50).map((load) => (
                  <div key={load.loadId} className="p-4 hover-elevate" data-testid={`load-row-${load.loadId}`}>
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <Badge className={`${getMatchScoreBadge(load.matchScore)} no-default-hover-elevate no-default-active-elevate`}>
                            <Target className="h-3 w-3 mr-1" />
                            {load.matchScore}%
                          </Badge>
                          <span className="text-sm text-muted-foreground">{load.loadId}</span>
                          <Badge variant="outline">{load.loadType}</Badge>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{load.pickup}</span>
                          <ArrowRight className="h-4 w-4" />
                          <span className="font-medium">{load.dropoff}</span>
                          <span className="text-sm text-muted-foreground">({load.distance} km)</span>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Building2 className="h-4 w-4" />
                            {load.shipperCompany}
                          </span>
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                            {load.shipperRating.toFixed(1)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Package className="h-4 w-4" />
                            {load.weight} Tons
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Rate</p>
                          <p className="text-xl font-bold">{formatCurrency(load.expectedRate)}</p>
                        </div>
                        <Button onClick={() => handleBid(load)} data-testid={`button-bid-list-${load.loadId}`}>
                          Bid
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
      
      <p className="text-sm text-muted-foreground">
        Showing {Math.min(filteredAndSortedLoads.length, viewMode === "list" ? 50 : 30)} of {filteredAndSortedLoads.length} loads
      </p>

      <Dialog open={bidDialogOpen} onOpenChange={setBidDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Place Your Bid</DialogTitle>
            <DialogDescription>
              Submit a competitive bid for this load
            </DialogDescription>
          </DialogHeader>
          
          {selectedLoad && (
            <div className="space-y-4 py-4">
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge className={`${getMatchScoreBadge(selectedLoad.matchScore)} no-default-hover-elevate no-default-active-elevate`}>
                      <Target className="h-3 w-3 mr-1" />
                      {selectedLoad.matchScore}% Match
                    </Badge>
                    <span className="text-sm text-muted-foreground">{selectedLoad.loadId}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedLoad.pickup}</span>
                    <ArrowRight className="h-4 w-4" />
                    <span>{selectedLoad.dropoff}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Shipper:</span>
                      <span className="ml-2 font-medium">{selectedLoad.shipperCompany}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Load Type:</span>
                      <span className="ml-2 font-medium">{selectedLoad.loadType}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Weight:</span>
                      <span className="ml-2 font-medium">{selectedLoad.weight} Tons</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Distance:</span>
                      <span className="ml-2 font-medium">{selectedLoad.distance} km</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-muted-foreground">Expected Rate</span>
                    <span className="text-lg font-bold">{formatCurrency(selectedLoad.expectedRate)}</span>
                  </div>
                </CardContent>
              </Card>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Your Bid Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">Rs.</span>
                  <Input
                    type="number"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    className="pl-10"
                    placeholder="Enter your bid"
                    data-testid="input-bid-amount"
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setBidAmount(Math.round(selectedLoad.expectedRate * 0.95).toString())}
                  >
                    -5%
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setBidAmount(selectedLoad.expectedRate.toString())}
                  >
                    Match
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setBidAmount(Math.round(selectedLoad.expectedRate * 1.05).toString())}
                  >
                    +5%
                  </Button>
                </div>
              </div>
              
              {selectedLoad.recommendedTrucks.length > 0 && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm font-medium mb-2">Recommended Trucks</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedLoad.recommendedTrucks.map((truck, idx) => (
                      <Badge key={idx} variant="secondary">{truck}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setBidDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitBid} disabled={!bidAmount} data-testid="button-submit-bid">
              Submit Bid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
