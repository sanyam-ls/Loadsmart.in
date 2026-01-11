import { useState, useMemo, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useTranslation } from "react-i18next";
import { 
  Search, MapPin, LayoutGrid, List, Package, Star, 
  Truck, TrendingUp, ArrowRight, Building2, Calendar,
  Target, Timer, Sparkles, ShieldCheck, Lock, Unlock, Loader2, CheckCircle
} from "lucide-react";
import { connectMarketplace, onMarketplaceEvent, disconnectMarketplace } from "@/lib/marketplace-socket";
import { useAuth } from "@/lib/auth-context";
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
  finalPrice: string | null;
  allowCounterBids: boolean | null;
  shipperName: string | null;
  bidCount: number;
  myBid: any | null;
  postedByAdmin: boolean;
  priceFixed: boolean;
  createdAt: string;
  isSimulated?: boolean;
  pickupDate?: string | null;
  deliveryDate?: string | null;
  shipperLoadNumber?: number | null;
  adminReferenceNumber?: number | null;
  carrierAdvancePercent?: number | null;
  cargoDescription?: string | null;
  postedAt?: string | null;
}

// Helper to get carrier display price (finalPrice = carrier payout price)
function getCarrierPrice(load: CarrierLoad): number {
  return parseFloat(load.finalPrice || load.adminFinalPrice || "0");
}

// Format load ID for display - shows LD-1001 (admin ref) or LD-023 (shipper seq)
function formatLoadId(load: { shipperLoadNumber?: number | null; adminReferenceNumber?: number | null; id: string }): string {
  if (load.adminReferenceNumber) {
    return `LD-${String(load.adminReferenceNumber).padStart(3, '0')}`;
  }
  if (load.shipperLoadNumber) {
    return `LD-${String(load.shipperLoadNumber).padStart(3, '0')}`;
  }
  return load.id.slice(0, 8);
}

// Helper function to estimate distance between cities
function estimateDistanceFromCities(pickup: string, dropoff: string): number {
  const distanceMap: Record<string, number> = {
    "mumbai_delhi": 1400, "delhi_mumbai": 1400,
    "bangalore_chennai": 350, "chennai_bangalore": 350,
    "pune_hyderabad": 560, "hyderabad_pune": 560,
    "kolkata_guwahati": 980, "guwahati_kolkata": 980,
    "ahmedabad_jaipur": 680, "jaipur_ahmedabad": 680,
    "ludhiana_delhi": 310, "delhi_ludhiana": 310,
    "coimbatore_kochi": 190, "kochi_coimbatore": 190,
    "nagpur_bhopal": 350, "bhopal_nagpur": 350,
  };
  
  const normalizeCity = (city: string) => 
    (city || "").toLowerCase().split(",")[0].trim().replace(/\s+/g, "");
  
  const key1 = `${normalizeCity(pickup)}_${normalizeCity(dropoff)}`;
  const key2 = `${normalizeCity(dropoff)}_${normalizeCity(pickup)}`;
  
  return distanceMap[key1] || distanceMap[key2] || Math.floor(Math.random() * 800) + 200;
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
    finalPrice: "112500",
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
    finalPrice: "40500",
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
    finalPrice: "70200",
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
    finalPrice: "82800",
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
    finalPrice: "55800",
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
    finalPrice: "34200",
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
    finalPrice: "28800",
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
    finalPrice: "43200",
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
  return `Rs. ${amount.toLocaleString("en-IN")}`;
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
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const searchString = useSearch();
  const highlightLoadId = new URLSearchParams(searchString).get("highlight");
  
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [distanceFilter, setDistanceFilter] = useState("all");
  const [loadTypeFilter, setLoadTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [bidDialogOpen, setBidDialogOpen] = useState(false);
  const [selectedLoad, setSelectedLoad] = useState<CarrierLoad | null>(null);
  const [bidAmount, setBidAmount] = useState("");
  const [simulatedLoadStates, setSimulatedLoadStates] = useState<Record<string, { myBid?: { amount: string }, status?: string }>>({});
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailLoad, setDetailLoad] = useState<CarrierLoad | null>(null);

  useEffect(() => {
    if (user?.id && user?.role === "carrier") {
      connectMarketplace("carrier", user.id);
      
      const unsubscribe = onMarketplaceEvent("load_posted", (loadData) => {
        toast({
          title: t("carrier.newLoadAvailable"),
          description: `${loadData.pickupCity} ${t("common.to")} ${loadData.dropoffCity} - Rs. ${parseFloat(loadData.adminFinalPrice || "0").toLocaleString("en-IN")}`,
        });
      });

      return () => {
        unsubscribe();
        disconnectMarketplace();
      };
    }
  }, [user?.id, user?.role, toast]);

  useEffect(() => {
    if (highlightLoadId) {
      setHighlightedId(highlightLoadId);
      setTimeout(() => {
        const element = document.querySelector(`[data-testid="load-card-${highlightLoadId}"]`) 
          || document.querySelector(`[data-testid="load-row-${highlightLoadId}"]`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 500);
      setTimeout(() => setHighlightedId(null), 5000);
    }
  }, [highlightLoadId]);

  // Raw API response type (before transformation)
  interface ApiLoad {
    id: string;
    pickupCity: string;
    dropoffCity: string;
    requiredTruckType: string | null;
    weight: string | null;
    distance: number | null;
    adminFinalPrice: string | null;
    finalPrice: string | null;
    allowCounterBids: boolean | null;
    shipperName: string | null;
    bidCount: number;
    myBid: any | null;
    postedByAdmin: boolean;
    priceFixed: boolean;
    createdAt: string;
    postedAt: string | null;
    pickupDate: string | null;
    deliveryDate: string | null;
    carrierAdvancePercent: number | null;
    cargoDescription: string | null;
    goodsToBeCarried: string | null;
    shipperLoadNumber: number | null;
    adminReferenceNumber: number | null;
  }

  const { data: rawApiLoads = [], isLoading, error } = useQuery<ApiLoad[]>({
    queryKey: ['/api/carrier/loads'],
  });

  // Transform API data to match CarrierLoad interface
  const apiLoads: CarrierLoad[] = useMemo(() => {
    return rawApiLoads.map(load => ({
      id: load.id,
      origin: load.pickupCity || "Unknown",
      destination: load.dropoffCity || "Unknown",
      loadType: load.requiredTruckType,
      weight: load.weight,
      estimatedDistance: load.distance || estimateDistanceFromCities(load.pickupCity, load.dropoffCity),
      adminFinalPrice: load.adminFinalPrice,
      finalPrice: load.finalPrice,
      allowCounterBids: load.allowCounterBids,
      shipperName: load.shipperName,
      bidCount: load.bidCount || 0,
      myBid: load.myBid,
      postedByAdmin: load.postedByAdmin ?? true,
      priceFixed: load.priceFixed ?? false,
      createdAt: load.postedAt || load.createdAt,
      isSimulated: false,
      pickupDate: load.pickupDate,
      deliveryDate: load.deliveryDate,
      carrierAdvancePercent: load.carrierAdvancePercent,
      cargoDescription: load.goodsToBeCarried || load.cargoDescription,
      postedAt: load.postedAt,
      shipperLoadNumber: load.shipperLoadNumber,
      adminReferenceNumber: load.adminReferenceNumber,
    }));
  }, [rawApiLoads]);

  const loads = useMemo(() => {
    return [...apiLoads, ...simulatedLoads];
  }, [apiLoads]);

  const bidMutation = useMutation({
    mutationFn: async (data: { load_id: string; amount: number; bid_type: string }) => {
      return apiRequest('POST', '/api/bids/submit', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/carrier/loads'] });
    },
  });

  const loadsWithScores = useMemo(() => {
    return loads.map(load => {
      const simState = load.isSimulated ? simulatedLoadStates[load.id] : undefined;
      return {
        ...load,
        matchScore: calculateMatchScore(load),
        myBid: simState?.myBid || load.myBid,
      };
    });
  }, [loads, simulatedLoadStates]);

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
        filtered.sort((a, b) => getCarrierPrice(b) - getCarrierPrice(a));
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
      ? Math.round(loads.reduce((sum, l) => sum + getCarrierPrice(l), 0) / loads.length)
      : 0;
    const fixedPriceLoads = loads.filter(l => l.priceFixed).length;
    
    return { total, highMatch, avgRate, fixedPriceLoads };
  }, [loads, loadsWithScores]);

  const handleBid = (load: CarrierLoad & { matchScore: number }) => {
    setSelectedLoad(load);
    const price = getCarrierPrice(load);
    setBidAmount(price.toString());
    setBidDialogOpen(true);
  };

  const handleSimulatedAccept = (load: CarrierLoad, price: number) => {
    setSimulatedLoadStates(prev => ({
      ...prev,
      [load.id]: {
        myBid: { amount: price.toString() },
        status: 'awarded'
      }
    }));
    toast({
      title: t("carrier.loadAccepted"),
      description: t("carrier.loadAcceptedDesc", { price: formatCurrency(price) }),
    });
    setBidDialogOpen(false);
    setBidAmount("");
    setSelectedLoad(null);
  };

  const handleSimulatedBid = (load: CarrierLoad, amount: number, isCounter: boolean) => {
    setSimulatedLoadStates(prev => ({
      ...prev,
      [load.id]: {
        myBid: { amount: amount.toString() },
        status: isCounter ? 'counter_received' : 'bidding'
      }
    }));
    toast({
      title: isCounter ? t("bids.counterSubmitted") : t("bids.bidPlacedSuccessfully"),
      description: isCounter
        ? t("bids.counterSubmittedDesc", { amount: formatCurrency(amount) })
        : t("bids.bidSubmittedDesc", { amount: formatCurrency(amount) }),
    });
    setBidDialogOpen(false);
    setBidAmount("");
    setSelectedLoad(null);
  };

  const handleAccept = async () => {
    if (!selectedLoad) return;
    const price = getCarrierPrice(selectedLoad);
    
    if (selectedLoad.isSimulated) {
      handleSimulatedAccept(selectedLoad, price);
      return;
    }
    
    try {
      await bidMutation.mutateAsync({
        load_id: selectedLoad.id,
        amount: price,
        bid_type: 'admin_posted_acceptance',
      });
      
      toast({
        title: t("carrier.loadAccepted"),
        description: t("carrier.loadAcceptedDesc", { price: formatCurrency(price) }),
      });
      setBidDialogOpen(false);
      setBidAmount("");
      setSelectedLoad(null);
    } catch (err: any) {
      toast({
        title: t("carrier.failedToAccept"),
        description: err.message || t("carrier.couldNotAcceptLoad"),
        variant: "destructive",
      });
    }
  };

  const submitBid = async () => {
    if (!bidAmount || !selectedLoad) return;
    
    const amount = parseInt(bidAmount);
    const carrierPrice = getCarrierPrice(selectedLoad);
    const isCounterBid = !selectedLoad.priceFixed && amount !== carrierPrice;
    
    if (selectedLoad.isSimulated) {
      handleSimulatedBid(selectedLoad, amount, isCounterBid);
      return;
    }
    
    try {
      await bidMutation.mutateAsync({
        load_id: selectedLoad.id,
        amount,
        bid_type: isCounterBid ? 'counter' : 'carrier_bid',
      });
      
      toast({
        title: isCounterBid ? t("bids.counterSubmitted") : t("bids.bidPlacedSuccessfully"),
        description: isCounterBid
          ? t("bids.counterSubmittedDesc", { amount: formatCurrency(amount) })
          : t("bids.bidSubmittedDesc", { amount: formatCurrency(amount) }),
      });
      setBidDialogOpen(false);
      setBidAmount("");
      setSelectedLoad(null);
    } catch (err: any) {
      toast({
        title: t("bids.failedToSubmitBid"),
        description: err.message || t("bids.couldNotSubmitBid"),
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
            <h1 className="text-2xl font-bold">{t("carrier.smartLoadMatching")}</h1>
            <p className="text-muted-foreground">{t("common.loading")}</p>
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
          title={t("carrier.failedToLoadLoads")}
          description={t("carrier.errorLoadingLoads")}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-loads-title">{t("carrier.smartLoadMatching")}</h1>
          <p className="text-muted-foreground">{t("carrier.findAndBidLoads", { count: loads.length })}</p>
        </div>
      </div>
      
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t("carrier.availableLoads")}
          value={stats.total}
          icon={Package}
          subtitle={t("carrier.currentlyPosted")}
          testId="stat-total-loads"
        />
        <StatCard
          title={t("carrier.highMatch")}
          value={stats.highMatch}
          icon={Target}
          subtitle={t("carrier.compatibility85")}
          testId="stat-high-match"
        />
        <StatCard
          title={t("carrier.avgRate")}
          value={formatCurrency(stats.avgRate)}
          icon={TrendingUp}
          subtitle={t("carrier.perLoad")}
          testId="stat-avg-rate"
        />
        <StatCard
          title={t("carrier.fixedPrice")}
          value={stats.fixedPriceLoads}
          icon={Lock}
          subtitle={t("carrier.acceptInstantly")}
          testId="stat-fixed"
        />
      </div>

      {topRecommendations.length > 0 && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {t("carrier.recommendedForFleet")}
            </CardTitle>
            <CardDescription>{t("carrier.topMatchesDesc")}</CardDescription>
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
                          {load.matchScore}% {t("carrier.match")}
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
                      <span className="text-xs text-muted-foreground">{formatLoadId(load)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium truncate">{load.origin}</span>
                      <ArrowRight className="h-3 w-3" />
                      <span className="font-medium truncate">{load.destination}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold">{formatCurrency(getCarrierPrice(load))}</span>
                      <Button 
                        size="sm" 
                        onClick={() => handleBid(load)} 
                        data-testid={`button-bid-rec-${load.id}`}
                        disabled={!!load.myBid}
                      >
                        {load.myBid ? "Bid Placed" : load.priceFixed ? "Accept" : "Bid Now"}
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
            placeholder={t("carrier.searchLoadsPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-loads"
          />
        </div>
        <Select value={distanceFilter} onValueChange={setDistanceFilter}>
          <SelectTrigger className="w-full sm:w-36" data-testid="select-distance-filter">
            <SelectValue placeholder={t("loads.distance")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("carrier.allDistances")}</SelectItem>
            <SelectItem value="short">{t("carrier.under500km")}</SelectItem>
            <SelectItem value="medium">{t("carrier.500to1000km")}</SelectItem>
            <SelectItem value="long">{t("carrier.over1000km")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={loadTypeFilter} onValueChange={setLoadTypeFilter}>
          <SelectTrigger className="w-full sm:w-36" data-testid="select-type-filter">
            <SelectValue placeholder={t("loads.loadType")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("carrier.allTypes")}</SelectItem>
            {loadTypes.map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-36" data-testid="select-sort">
            <SelectValue placeholder={t("common.sortBy")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="match">{t("carrier.bestMatch")}</SelectItem>
            <SelectItem value="rate">{t("carrier.highestRate")}</SelectItem>
            <SelectItem value="distance">{t("carrier.shortest")}</SelectItem>
            <SelectItem value="newest">{t("carrier.newest")}</SelectItem>
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
          title={t("loads.noLoadsFound")}
          description={loads.length === 0 
            ? t("carrier.noLoadsPostedYet")
            : t("carrier.noLoadsMatchFilters")
          }
        />
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedLoads.slice(0, 30).map((load) => (
            <Card 
              key={load.id} 
              className={`hover-elevate cursor-pointer ${highlightedId === load.id ? "ring-2 ring-primary ring-offset-2 animate-pulse" : ""}`} 
              data-testid={`load-card-${load.id}`}
              onClick={() => {
                setDetailLoad(load);
                setDetailDialogOpen(true);
              }}
            >
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`${getMatchScoreBadge(load.matchScore)} no-default-hover-elevate no-default-active-elevate`}>
                      <Target className="h-3 w-3 mr-1" />
                      {load.matchScore}% {t("carrier.match")}
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
                  <span className="text-xs text-muted-foreground">{formatLoadId(load)}</span>
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
                    <p className="text-xs text-muted-foreground">Total Price</p>
                    <p className="text-xl font-bold">{formatCurrency(getCarrierPrice(load))}</p>
                  </div>
                  <Button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBid(load);
                    }} 
                    data-testid={`button-bid-${load.id}`}
                    variant={load.priceFixed ? "default" : "outline"}
                    disabled={!!load.myBid}
                  >
                    {load.myBid ? "Bid Placed" : load.priceFixed ? "Accept" : "Place Bid"}
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
                  <div key={load.id} className={`p-4 hover-elevate ${highlightedId === load.id ? "ring-2 ring-primary ring-offset-2 animate-pulse" : ""}`} data-testid={`load-row-${load.id}`}>
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
                          <span className="text-sm text-muted-foreground">{formatLoadId(load)}</span>
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
                          <p className="text-xl font-bold">{formatCurrency(getCarrierPrice(load))}</p>
                        </div>
                        <Button 
                          onClick={() => handleBid(load)} 
                          data-testid={`button-bid-list-${load.id}`}
                          disabled={!!load.myBid}
                        >
                          {load.myBid ? "Placed" : "Bid"}
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

      {/* Load Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Load Details
            </DialogTitle>
            <DialogDescription>
              Complete information about this load
            </DialogDescription>
          </DialogHeader>
          
          {detailLoad && (
            <div className="space-y-4 py-4">
              <Card>
                <CardContent className="pt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`${getMatchScoreBadge((detailLoad as any).matchScore || 80)} no-default-hover-elevate no-default-active-elevate`}>
                        <Target className="h-3 w-3 mr-1" />
                        {(detailLoad as any).matchScore || 80}% Match
                      </Badge>
                      {detailLoad.priceFixed ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 no-default-hover-elevate no-default-active-elevate">
                          <Lock className="h-3 w-3 mr-1" />
                          Fixed Price
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 no-default-hover-elevate no-default-active-elevate">
                          <Unlock className="h-3 w-3 mr-1" />
                          Negotiable
                        </Badge>
                      )}
                    </div>
                    <span className="text-sm font-mono text-muted-foreground">{formatLoadId(detailLoad)}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-green-500" />
                    <span className="font-medium">{detailLoad.origin}</span>
                    <ArrowRight className="h-4 w-4" />
                    <MapPin className="h-4 w-4 text-red-500" />
                    <span className="font-medium">{detailLoad.destination}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {detailLoad.shipperName && (
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{t("loads.shipper")}:</span>
                        <span className="font-medium">{detailLoad.shipperName}</span>
                      </div>
                    )}
                    {detailLoad.loadType && (
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{t("common.type")}:</span>
                        <span className="font-medium">{detailLoad.loadType}</span>
                      </div>
                    )}
                    {detailLoad.weight && (
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{t("loads.weight")}:</span>
                        <span className="font-medium">{detailLoad.weight} Tons</span>
                      </div>
                    )}
                    {detailLoad.estimatedDistance && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{t("loads.distance")}:</span>
                        <span className="font-medium">{detailLoad.estimatedDistance} km</span>
                      </div>
                    )}
                    {detailLoad.cargoDescription && (
                      <div className="flex items-center gap-2 col-span-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Commodity:</span>
                        <span className="font-medium">{detailLoad.cargoDescription}</span>
                      </div>
                    )}
                    {detailLoad.postedAt && (
                      <div className="flex items-center gap-2 col-span-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Posted:</span>
                        <span className="font-medium">
                          {new Date(detailLoad.postedAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {/* Price & Payment Information */}
              <Card className="border-primary/30">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Price</span>
                    <span className="text-xl font-bold text-primary">{formatCurrency(getCarrierPrice(detailLoad))}</span>
                  </div>
                  
                  {(detailLoad.carrierAdvancePercent !== null && detailLoad.carrierAdvancePercent !== undefined && detailLoad.carrierAdvancePercent > 0) && (
                    <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg space-y-2">
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-green-700 dark:text-green-400">Advance Payment Available</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Advance Percentage:</span>
                        <span className="font-semibold">{detailLoad.carrierAdvancePercent}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Advance Amount:</span>
                        <span className="font-bold text-green-600 dark:text-green-400">
                          {formatCurrency(Math.round(getCarrierPrice(detailLoad) * (detailLoad.carrierAdvancePercent / 100)))}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Balance on Delivery:</span>
                        <span className="font-medium">
                          {formatCurrency(Math.round(getCarrierPrice(detailLoad) * (1 - detailLoad.carrierAdvancePercent / 100)))}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {(!detailLoad.carrierAdvancePercent || detailLoad.carrierAdvancePercent === 0) && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">No advance payment required for this load.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)} data-testid="button-close-detail">
              Close
            </Button>
            <Button 
              onClick={() => {
                setDetailDialogOpen(false);
                if (detailLoad) {
                  handleBid(detailLoad as any);
                }
              }}
              disabled={!!detailLoad?.myBid}
              data-testid="button-bid-from-detail"
            >
              {detailLoad?.myBid ? "Bid Placed" : detailLoad?.priceFixed ? "Accept Load" : "Place Bid"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                      {(selectedLoad as any).matchScore || 80}% {t("carrier.match")}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{formatLoadId(selectedLoad)}</span>
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
                        <span className="text-muted-foreground">{t("loads.shipper")}:</span>
                        <span className="ml-2 font-medium">{selectedLoad.shipperName}</span>
                      </div>
                    )}
                    {selectedLoad.loadType && (
                      <div>
                        <span className="text-muted-foreground">Load {t("common.type")}:</span>
                        <span className="ml-2 font-medium">{selectedLoad.loadType}</span>
                      </div>
                    )}
                    {selectedLoad.weight && (
                      <div>
                        <span className="text-muted-foreground">{t("loads.weight")}:</span>
                        <span className="ml-2 font-medium">{selectedLoad.weight} Tons</span>
                      </div>
                    )}
                    {selectedLoad.estimatedDistance && (
                      <div>
                        <span className="text-muted-foreground">{t("loads.distance")}:</span>
                        <span className="ml-2 font-medium">{selectedLoad.estimatedDistance} km</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-muted-foreground">Total Price</span>
                    <span className="text-lg font-bold">{formatCurrency(getCarrierPrice(selectedLoad))}</span>
                  </div>
                </CardContent>
              </Card>
              
              <div className="p-4 bg-muted/50 rounded-lg border">
                <label className="text-sm font-medium mb-2 block">Your Bid Amount (Rs.)</label>
                <Input
                  type="number"
                  placeholder={t("bids.enterBidAmount")}
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  className="mb-3"
                  data-testid="input-bid-amount"
                />
                <Button 
                  className="w-full"
                  onClick={() => {
                    if (parseFloat(bidAmount) === getCarrierPrice(selectedLoad)) {
                      handleAccept();
                    } else {
                      submitBid();
                    }
                  }}
                  disabled={!bidAmount || bidMutation.isPending}
                  data-testid="button-place-bid"
                >
                  {bidMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Place Bid
                </Button>
                {parseFloat(bidAmount) !== getCarrierPrice(selectedLoad) && bidAmount && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Different price will go through admin negotiation.
                  </p>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBidDialogOpen(false)} data-testid="button-cancel-bid">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
