import { useState, useMemo } from "react";
import { 
  Search, MapPin, LayoutGrid, List, Package, Star, 
  Truck, TrendingUp, ArrowRight, Building2, 
  Target, Timer, Sparkles, ShieldCheck, Lock, Unlock, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";

interface CarrierLoad {
  id: string;
  origin: string;
  destination: string;
  loadType: string | null;
  weight: string | null;
  estimatedDistance: number | null;
  adminFinalPrice: string | null;
  allowCounterBids: boolean | null;
  shipperName: string | null;
  bidCount: number;
  myBid: any | null;
  postedByAdmin: boolean;
  priceFixed: boolean;
  createdAt: string;
  isSimulated?: boolean;
}

const simulatedLoads: CarrierLoad[] = [
  {
    id: "DEMO-001",
    origin: "Mumbai, Maharashtra",
    destination: "Delhi, NCR",
    loadType: "32 ft MXL",
    weight: "18",
    estimatedDistance: 1420,
    adminFinalPrice: "125000",
    allowCounterBids: true,
    shipperName: "Reliance Industries",
    bidCount: 3,
    myBid: null,
    postedByAdmin: true,
    priceFixed: false,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    isSimulated: true,
  },
  {
    id: "DEMO-002",
    origin: "Bengaluru, Karnataka",
    destination: "Chennai, Tamil Nadu",
    loadType: "Container 20ft",
    weight: "12",
    estimatedDistance: 350,
    adminFinalPrice: "45000",
    allowCounterBids: false,
    shipperName: "Tata Motors",
    bidCount: 5,
    myBid: null,
    postedByAdmin: true,
    priceFixed: true,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    isSimulated: true,
  },
  {
    id: "DEMO-003",
    origin: "Ahmedabad, Gujarat",
    destination: "Jaipur, Rajasthan",
    loadType: "Taurus 21T",
    weight: "22",
    estimatedDistance: 680,
    adminFinalPrice: "78000",
    allowCounterBids: true,
    shipperName: "Adani Group",
    bidCount: 2,
    myBid: null,
    postedByAdmin: true,
    priceFixed: false,
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    isSimulated: true,
  },
  {
    id: "DEMO-004",
    origin: "Kolkata, West Bengal",
    destination: "Guwahati, Assam",
    loadType: "32 ft SXL",
    weight: "20",
    estimatedDistance: 980,
    adminFinalPrice: "92000",
    allowCounterBids: false,
    shipperName: "ITC Limited",
    bidCount: 4,
    myBid: null,
    postedByAdmin: true,
    priceFixed: true,
    createdAt: new Date(Date.now() - 5400000).toISOString(),
    isSimulated: true,
  },
  {
    id: "DEMO-005",
    origin: "Pune, Maharashtra",
    destination: "Hyderabad, Telangana",
    loadType: "28 ft MXL",
    weight: "15",
    estimatedDistance: 560,
    adminFinalPrice: "62000",
    allowCounterBids: true,
    shipperName: "Mahindra Logistics",
    bidCount: 6,
    myBid: null,
    postedByAdmin: true,
    priceFixed: false,
    createdAt: new Date(Date.now() - 900000).toISOString(),
    isSimulated: true,
  },
  {
    id: "DEMO-006",
    origin: "Ludhiana, Punjab",
    destination: "Delhi, NCR",
    loadType: "Open Truck",
    weight: "25",
    estimatedDistance: 310,
    adminFinalPrice: "38000",
    allowCounterBids: false,
    shipperName: "Hero MotoCorp",
    bidCount: 8,
    myBid: null,
    postedByAdmin: true,
    priceFixed: true,
    createdAt: new Date(Date.now() - 10800000).toISOString(),
    isSimulated: true,
  },
  {
    id: "DEMO-007",
    origin: "Coimbatore, Tamil Nadu",
    destination: "Kochi, Kerala",
    loadType: "Container 40ft",
    weight: "28",
    estimatedDistance: 190,
    adminFinalPrice: "32000",
    allowCounterBids: true,
    shipperName: "Asian Paints",
    bidCount: 1,
    myBid: null,
    postedByAdmin: true,
    priceFixed: false,
    createdAt: new Date(Date.now() - 14400000).toISOString(),
    isSimulated: true,
  },
  {
    id: "DEMO-008",
    origin: "Nagpur, Maharashtra",
    destination: "Bhopal, Madhya Pradesh",
    loadType: "Trailer 20ft",
    weight: "16",
    estimatedDistance: 350,
    adminFinalPrice: "48000",
    allowCounterBids: false,
    shipperName: "Ultratech Cement",
    bidCount: 3,
    myBid: null,
    postedByAdmin: true,
    priceFixed: true,
    createdAt: new Date(Date.now() - 21600000).toISOString(),
    isSimulated: true,
  },
];

function formatCurrency(amount: number): string {
  if (amount >= 100000) {
    return `Rs. ${(amount / 100000).toFixed(1)}L`;
  }
  return `Rs. ${amount.toLocaleString()}`;
}

function getMatchScoreBadge(score: number) {
  if (score >= 90) return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  if (score >= 75) return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
  return "bg-muted text-muted-foreground";
}

function calculateMatchScore(load: CarrierLoad): number {
  return Math.floor(70 + Math.random() * 25);
}

export default function CarrierLoadsPage() {
  const { toast } = useToast();
  
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [distanceFilter, setDistanceFilter] = useState("all");
  const [loadTypeFilter, setLoadTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [bidDialogOpen, setBidDialogOpen] = useState(false);
  const [selectedLoad, setSelectedLoad] = useState<CarrierLoad | null>(null);
  const [bidAmount, setBidAmount] = useState("");

  const { data: apiLoads = [], isLoading, error } = useQuery<CarrierLoad[]>({
    queryKey: ['/api/carrier/loads'],
  });

  const loads = useMemo(() => {
    return [...apiLoads, ...simulatedLoads];
  }, [apiLoads]);

  const bidMutation = useMutation({
    mutationFn: async (data: { load_id: string; amount: number; bid_type: string }) => {
      return apiRequest('/api/bids/submit', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/carrier/loads'] });
    },
  });

  const loadsWithScores = useMemo(() => {
    return loads.map(load => ({
      ...load,
      matchScore: calculateMatchScore(load),
    }));
  }, [loads]);

  const filteredAndSortedLoads = useMemo(() => {
    const query = searchQuery.toLowerCase();
    let filtered = loadsWithScores.filter((load) => {
      const matchesSearch = !query ||
        (load.origin ?? "").toLowerCase().includes(query) ||
        (load.destination ?? "").toLowerCase().includes(query) ||
        (load.shipperName ?? "").toLowerCase().includes(query) ||
        (load.id ?? "").toLowerCase().includes(query);
      
      const distance = load.estimatedDistance || 0;
      const matchesDistance =
        distanceFilter === "all" ||
        (distanceFilter === "short" && distance < 500) ||
        (distanceFilter === "medium" && distance >= 500 && distance < 1000) ||
        (distanceFilter === "long" && distance >= 1000);
      
      const matchesLoadType = loadTypeFilter === "all" || load.loadType === loadTypeFilter;
      return matchesSearch && matchesDistance && matchesLoadType;
    });

    switch (sortBy) {
      case "match":
        filtered.sort((a, b) => b.matchScore - a.matchScore);
        break;
      case "rate":
        const getRate = (l: typeof filtered[0]) => parseFloat(l.adminFinalPrice || "0");
        filtered.sort((a, b) => getRate(b) - getRate(a));
        break;
      case "distance":
        filtered.sort((a, b) => (a.estimatedDistance || 0) - (b.estimatedDistance || 0));
        break;
      case "newest":
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }

    return filtered;
  }, [loadsWithScores, searchQuery, distanceFilter, loadTypeFilter, sortBy]);

  const loadTypes = useMemo(() => {
    const types = new Set(loads.map(l => l.loadType).filter(Boolean));
    return Array.from(types) as string[];
  }, [loads]);

  const stats = useMemo(() => {
    const total = loads.length;
    const highMatch = loadsWithScores.filter(l => l.matchScore >= 85).length;
    const avgRate = loads.length > 0
      ? Math.round(loads.reduce((sum, l) => sum + parseFloat(l.adminFinalPrice || "0"), 0) / loads.length)
      : 0;
    const fixedPriceLoads = loads.filter(l => l.priceFixed).length;
    
    return { total, highMatch, avgRate, fixedPriceLoads };
  }, [loads, loadsWithScores]);

  const handleBid = (load: CarrierLoad & { matchScore: number }) => {
    if (load.isSimulated) return;
    setSelectedLoad(load);
    const price = parseFloat(load.adminFinalPrice || "0");
    setBidAmount(price.toString());
    setBidDialogOpen(true);
  };

  const handleAccept = async () => {
    if (!selectedLoad || selectedLoad.isSimulated) return;
    const price = parseFloat(selectedLoad.adminFinalPrice || "0");
    
    try {
      await bidMutation.mutateAsync({
        load_id: selectedLoad.id,
        amount: price,
        bid_type: 'admin_posted_acceptance',
      });
      
      toast({
        title: "Load Accepted",
        description: `You've accepted the fixed price of ${formatCurrency(price)} for this load.`,
      });
      setBidDialogOpen(false);
      setBidAmount("");
      setSelectedLoad(null);
    } catch (err: any) {
      toast({
        title: "Failed to Accept",
        description: err.message || "Could not accept the load. Please try again.",
        variant: "destructive",
      });
    }
  };

  const submitBid = async () => {
    if (!bidAmount || !selectedLoad || selectedLoad.isSimulated) return;
    
    const amount = parseInt(bidAmount);
    const adminPrice = parseFloat(selectedLoad.adminFinalPrice || "0");
    const isCounterBid = !selectedLoad.priceFixed && amount !== adminPrice;
    
    try {
      await bidMutation.mutateAsync({
        load_id: selectedLoad.id,
        amount,
        bid_type: isCounterBid ? 'counter' : 'carrier_bid',
      });
      
      toast({
        title: isCounterBid ? "Counter-Bid Submitted" : "Bid Placed Successfully",
        description: isCounterBid
          ? `Your counter-bid of ${formatCurrency(amount)} has been submitted for review.`
          : `Your bid of ${formatCurrency(amount)} has been submitted.`,
      });
      setBidDialogOpen(false);
      setBidAmount("");
      setSelectedLoad(null);
    } catch (err: any) {
      toast({
        title: "Failed to Submit Bid",
        description: err.message || "Could not submit your bid. Please try again.",
        variant: "destructive",
      });
    }
  };

  const topRecommendations = filteredAndSortedLoads
    .filter(l => l.matchScore >= 85)
    .slice(0, 3);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Smart Load Matching</h1>
            <p className="text-muted-foreground">Loading available loads...</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="pt-4">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i}>
              <CardContent className="pt-4">
                <Skeleton className="h-40 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <EmptyState
          icon={Package}
          title="Failed to load available loads"
          description="There was an error loading the loads. Please try refreshing the page."
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-loads-title">Smart Load Matching</h1>
          <p className="text-muted-foreground">Find and bid on {loads.length} loads optimized for your fleet</p>
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
          title="Fixed Price"
          value={stats.fixedPriceLoads}
          icon={Lock}
          subtitle="Accept instantly"
          testId="stat-fixed"
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
                <Card key={load.id} className="hover-elevate" data-testid={`rec-load-${load.id}`}>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`${getMatchScoreBadge(load.matchScore)} no-default-hover-elevate no-default-active-elevate`}>
                          <Target className="h-3 w-3 mr-1" />
                          {load.matchScore}% Match
                        </Badge>
                        {load.isSimulated && (
                          <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 no-default-hover-elevate no-default-active-elevate">
                            Demo
                          </Badge>
                        )}
                        {load.postedByAdmin && !load.isSimulated && (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 no-default-hover-elevate no-default-active-elevate">
                            <ShieldCheck className="h-3 w-3 mr-1" />
                            Admin
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{load.id.slice(0, 8)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium truncate">{load.origin}</span>
                      <ArrowRight className="h-3 w-3" />
                      <span className="font-medium truncate">{load.destination}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold">{formatCurrency(parseFloat(load.adminFinalPrice || "0"))}</span>
                      <Button 
                        size="sm" 
                        onClick={() => handleBid(load)} 
                        data-testid={`button-bid-rec-${load.id}`}
                        disabled={load.isSimulated}
                        title={load.isSimulated ? "Demo load - for display only" : undefined}
                      >
                        {load.isSimulated ? "Demo" : load.priceFixed ? "Accept" : "Bid Now"}
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
          description={loads.length === 0 
            ? "No loads have been posted to carriers yet. Check back soon!"
            : "No loads match your current filters. Try adjusting your search criteria."
          }
        />
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedLoads.slice(0, 30).map((load) => (
            <Card key={load.id} className="hover-elevate" data-testid={`load-card-${load.id}`}>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`${getMatchScoreBadge(load.matchScore)} no-default-hover-elevate no-default-active-elevate`}>
                      <Target className="h-3 w-3 mr-1" />
                      {load.matchScore}% Match
                    </Badge>
                    {load.isSimulated && (
                      <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 no-default-hover-elevate no-default-active-elevate">
                        Demo
                      </Badge>
                    )}
                    {load.postedByAdmin && !load.isSimulated && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 no-default-hover-elevate no-default-active-elevate">
                        <ShieldCheck className="h-3 w-3 mr-1" />
                        Posted by Admin
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{load.id.slice(0, 8)}</span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-green-500" />
                    <span className="font-medium">{load.origin}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-red-500" />
                    <span className="font-medium">{load.destination}</span>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {load.loadType && <Badge variant="outline">{load.loadType}</Badge>}
                  {load.weight && <Badge variant="outline">{load.weight} Tons</Badge>}
                  {load.estimatedDistance && <Badge variant="outline">{load.estimatedDistance} km</Badge>}
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
                </div>
                
                {load.shipperName && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    <span>{load.shipperName}</span>
                  </div>
                )}
                
                <div className="flex items-center justify-between pt-2 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground">Admin Price</p>
                    <p className="text-xl font-bold">{formatCurrency(parseFloat(load.adminFinalPrice || "0"))}</p>
                  </div>
                  <Button 
                    onClick={() => handleBid(load)} 
                    data-testid={`button-bid-${load.id}`}
                    variant={load.priceFixed ? "default" : "outline"}
                    disabled={!!load.myBid || load.isSimulated}
                    title={load.isSimulated ? "Demo load - for display only" : undefined}
                  >
                    {load.isSimulated ? "Demo" : load.myBid ? "Bid Placed" : load.priceFixed ? "Accept" : "Place Bid"}
                  </Button>
                </div>
                
                {load.myBid && (
                  <div className="text-xs text-muted-foreground">
                    <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">
                      Your bid: {formatCurrency(parseFloat(load.myBid.amount))}
                    </Badge>
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
                  <div key={load.id} className="p-4 hover-elevate" data-testid={`load-row-${load.id}`}>
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <Badge className={`${getMatchScoreBadge(load.matchScore)} no-default-hover-elevate no-default-active-elevate`}>
                            <Target className="h-3 w-3 mr-1" />
                            {load.matchScore}%
                          </Badge>
                          {load.isSimulated && (
                            <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 no-default-hover-elevate no-default-active-elevate">
                              Demo
                            </Badge>
                          )}
                          <span className="text-sm text-muted-foreground">{load.id.slice(0, 8)}</span>
                          {load.loadType && <Badge variant="outline">{load.loadType}</Badge>}
                          {load.myBid && (
                            <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">
                              Bid placed
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{load.origin}</span>
                          <ArrowRight className="h-4 w-4" />
                          <span className="font-medium">{load.destination}</span>
                          {load.estimatedDistance && (
                            <span className="text-sm text-muted-foreground">({load.estimatedDistance} km)</span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                          {load.shipperName && (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-4 w-4" />
                              {load.shipperName}
                            </span>
                          )}
                          {load.weight && (
                            <span className="flex items-center gap-1">
                              <Package className="h-4 w-4" />
                              {load.weight} Tons
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Rate</p>
                          <p className="text-xl font-bold">{formatCurrency(parseFloat(load.adminFinalPrice || "0"))}</p>
                        </div>
                        <Button 
                          onClick={() => handleBid(load)} 
                          data-testid={`button-bid-list-${load.id}`}
                          disabled={!!load.myBid || load.isSimulated}
                          title={load.isSimulated ? "Demo load - for display only" : undefined}
                        >
                          {load.isSimulated ? "Demo" : load.myBid ? "Placed" : "Bid"}
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
            <DialogTitle>
              {selectedLoad?.priceFixed ? "Accept Fixed Price Load" : "Place Your Bid"}
            </DialogTitle>
            <DialogDescription>
              {selectedLoad?.priceFixed 
                ? "Review the admin-priced load and accept to book immediately"
                : "Submit a bid or counter-offer for this load"
              }
            </DialogDescription>
          </DialogHeader>
          
          {selectedLoad && (
            <div className="space-y-4 py-4">
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge className={`${getMatchScoreBadge((selectedLoad as any).matchScore || 80)} no-default-hover-elevate no-default-active-elevate`}>
                      <Target className="h-3 w-3 mr-1" />
                      {(selectedLoad as any).matchScore || 80}% Match
                    </Badge>
                    <span className="text-sm text-muted-foreground">{selectedLoad.id.slice(0, 8)}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedLoad.origin}</span>
                    <ArrowRight className="h-4 w-4" />
                    <span>{selectedLoad.destination}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {selectedLoad.shipperName && (
                      <div>
                        <span className="text-muted-foreground">Shipper:</span>
                        <span className="ml-2 font-medium">{selectedLoad.shipperName}</span>
                      </div>
                    )}
                    {selectedLoad.loadType && (
                      <div>
                        <span className="text-muted-foreground">Load Type:</span>
                        <span className="ml-2 font-medium">{selectedLoad.loadType}</span>
                      </div>
                    )}
                    {selectedLoad.weight && (
                      <div>
                        <span className="text-muted-foreground">Weight:</span>
                        <span className="ml-2 font-medium">{selectedLoad.weight} Tons</span>
                      </div>
                    )}
                    {selectedLoad.estimatedDistance && (
                      <div>
                        <span className="text-muted-foreground">Distance:</span>
                        <span className="ml-2 font-medium">{selectedLoad.estimatedDistance} km</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-muted-foreground">Admin Price</span>
                    <span className="text-lg font-bold">{formatCurrency(parseFloat(selectedLoad.adminFinalPrice || "0"))}</span>
                  </div>
                </CardContent>
              </Card>
              
              {selectedLoad.priceFixed ? (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    This load has a fixed price set by the admin. Click "Accept" to confirm this load at the displayed rate.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="text-sm font-medium">Your Bid Amount (Rs.)</label>
                  <Input
                    type="number"
                    placeholder="Enter your bid amount"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    data-testid="input-bid-amount"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the same amount to accept the admin price, or a different amount to submit a counter-bid.
                  </p>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBidDialogOpen(false)} data-testid="button-cancel-bid">
              Cancel
            </Button>
            {selectedLoad?.priceFixed ? (
              <Button 
                onClick={handleAccept} 
                disabled={bidMutation.isPending}
                data-testid="button-confirm-accept"
              >
                {bidMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Accept Load
              </Button>
            ) : (
              <Button 
                onClick={submitBid} 
                disabled={!bidAmount || bidMutation.isPending}
                data-testid="button-submit-bid"
              >
                {bidMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Submit Bid
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
