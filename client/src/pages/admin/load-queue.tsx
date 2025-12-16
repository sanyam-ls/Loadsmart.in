import { useState, useMemo, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  Clock, 
  MapPin, 
  Package, 
  Truck, 
  Calendar, 
  Filter, 
  Search, 
  ChevronRight, 
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Building2,
  Send,
  Calculator,
  Users,
  Receipt,
  Gavel,
  Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useMockData, MockLoad } from "@/lib/mock-data-store";
import { PricingDrawer } from "@/components/admin/pricing-drawer";
import { InvoiceDrawer } from "@/components/admin/invoice-drawer";
import { useAuth } from "@/lib/auth-context";
import { connectMarketplace, onMarketplaceEvent, disconnectMarketplace } from "@/lib/marketplace-socket";
import { queryClient } from "@/lib/queryClient";

const regions = ["All Regions", "North India", "South India", "East India", "West India", "Central India"];
const loadTypes = [
  "All Types", 
  "17 ft", "19 ft", "20 ft", "22 ft", "24 ft",
  "28 ft SXL", "28 ft MXL", 
  "32 ft SXL", "32 ft MXL",
  "Open Truck", 
  "Trailer 20ft", "Trailer 40ft",
  "Container 20ft", "Container 40ft",
  "Taurus 14T", "Taurus 16T", "Taurus 21T",
  "TATA Ace", "Bolero Pickup"
];
const priorities = ["All Priority", "Urgent", "High", "Normal", "Low"];

const ratePerKmByType: Record<string, number> = {
  "17 ft": 38,
  "19 ft": 40,
  "20 ft": 42,
  "22 ft": 45,
  "24 ft": 48,
  "28 ft SXL": 52,
  "28 ft MXL": 55,
  "32 ft SXL": 58,
  "32 ft MXL": 62,
  "Open Truck": 45,
  "Trailer 20ft": 65,
  "Trailer 40ft": 75,
  "Container 20ft": 60,
  "Container 40ft": 70,
  "Taurus 14T": 55,
  "Taurus 16T": 58,
  "Taurus 21T": 62,
  "TATA Ace": 25,
  "Bolero Pickup": 28,
};

interface CarrierOption {
  id: string;
  name: string;
  rating: number;
  trucks: number;
  zone: string;
  completedLoads: number;
}

interface RealLoad {
  id: string;
  pickupCity: string;
  dropoffCity: string;
  pickupAddress?: string;
  dropoffAddress?: string;
  weight: number;
  weightUnit?: string;
  cargoDescription?: string;
  requiredTruckType?: string;
  pickupDate?: string;
  status: string;
  shipperId: string;
  shipperName?: string;
  shipperEmail?: string;
  distance?: number;
  priority?: string;
  adminPrice?: number;
  adminFinalPrice?: string;
  finalPrice?: string;  // The negotiated final price after bid acceptance
  priceLockedAt?: string;
}

function getCanonicalStateDisplay(status: string): { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string } {
  const stateMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
    "draft": { label: "Draft", variant: "outline" },
    "pending": { label: "Pending Review", variant: "default", className: "bg-amber-500 text-white" },
    "priced": { label: "Priced - Ready to Post", variant: "secondary", className: "bg-blue-500 text-white" },
    "posted_to_carriers": { label: "Posted to Carriers", variant: "secondary", className: "bg-cyan-500 text-white" },
    "open_for_bid": { label: "Awaiting Bids", variant: "secondary", className: "bg-purple-500 text-white" },
    "counter_received": { label: "Negotiation", variant: "secondary", className: "bg-orange-500 text-white" },
    "awarded": { label: "Carrier Finalized", variant: "secondary", className: "bg-emerald-500 text-white" },
    "invoice_sent": { label: "Invoice Sent", variant: "secondary", className: "bg-indigo-500 text-white" },
    "invoice_approved": { label: "Invoice Approved", variant: "secondary", className: "bg-green-500 text-white" },
    "in_transit": { label: "In Transit", variant: "secondary", className: "bg-blue-600 text-white" },
    "delivered": { label: "Delivered", variant: "secondary", className: "bg-teal-500 text-white" },
    "closed": { label: "Completed", variant: "secondary", className: "bg-gray-500 text-white" },
    "cancelled": { label: "Cancelled", variant: "destructive" },
  };
  return stateMap[status.toLowerCase()] || { label: status, variant: "outline" };
}

function getAdminActionForState(status: string): { action: string; buttonLabel: string; icon?: string } | null {
  const actionMap: Record<string, { action: string; buttonLabel: string; icon?: string }> = {
    "pending": { action: "price", buttonLabel: "Price Load", icon: "calculator" },
    "priced": { action: "post_to_carriers", buttonLabel: "Post to Carriers", icon: "truck" },
    "posted_to_carriers": { action: "view_bids", buttonLabel: "View Bids", icon: "gavel" },
    "open_for_bid": { action: "view_bids", buttonLabel: "View Bids", icon: "gavel" },
    "counter_received": { action: "review_counter", buttonLabel: "Review Counter", icon: "gavel" },
    "awarded": { action: "send_invoice", buttonLabel: "Send Invoice", icon: "send" },
    "invoice_sent": { action: "view_invoice", buttonLabel: "View Invoice", icon: "receipt" },
    "invoice_approved": { action: "start_transit", buttonLabel: "Start Transit", icon: "truck" },
    "in_transit": { action: "track_shipment", buttonLabel: "Track Shipment", icon: "mappin" },
    "delivered": { action: "close_load", buttonLabel: "Close Load", icon: "check" },
  };
  return actionMap[status.toLowerCase()] || null;
}

const mockCarriers: CarrierOption[] = [
  { id: "c1", name: "Rajesh Transport", rating: 4.8, trucks: 45, zone: "North India", completedLoads: 234 },
  { id: "c2", name: "Sharma Logistics", rating: 4.6, trucks: 28, zone: "West India", completedLoads: 189 },
  { id: "c3", name: "Kumar Fleet", rating: 4.9, trucks: 62, zone: "South India", completedLoads: 312 },
  { id: "c4", name: "Singh Carriers", rating: 4.5, trucks: 35, zone: "North India", completedLoads: 156 },
  { id: "c5", name: "Patel Movers", rating: 4.7, trucks: 41, zone: "West India", completedLoads: 278 },
];

function getPendingLoads(loads: MockLoad[]): MockLoad[] {
  return loads.filter(l => l.status === "Pending Admin Review" || l.status === "Active");
}

function estimateDistance(pickup: string, drop: string): number {
  const distanceMap: Record<string, number> = {
    "mumbai_delhi": 1400,
    "delhi_mumbai": 1400,
    "bangalore_chennai": 350,
    "chennai_bangalore": 350,
    "bengaluru_chennai": 350,
    "chennai_bengaluru": 350,
    "kolkata_delhi": 1500,
    "delhi_kolkata": 1500,
    "mumbai_chennai": 1340,
    "chennai_mumbai": 1340,
    "bangalore_hyderabad": 570,
    "hyderabad_bangalore": 570,
    "bengaluru_hyderabad": 570,
    "hyderabad_bengaluru": 570,
    "delhi_jaipur": 280,
    "jaipur_delhi": 280,
    "mumbai_pune": 150,
    "pune_mumbai": 150,
    "bhiwandi_ahmedabad": 530,
    "ahmedabad_bhiwandi": 530,
    "ahmedabad_mumbai": 524,
    "mumbai_ahmedabad": 524,
    "ludhiana_jaipur": 580,
    "jaipur_ludhiana": 580,
    "kolkata_guwahati": 980,
    "guwahati_kolkata": 980,
    "delhi_ludhiana": 310,
    "ludhiana_delhi": 310,
    "chennai_hyderabad": 625,
    "hyderabad_chennai": 625,
    "surat_mumbai": 284,
    "mumbai_surat": 284,
    "ahmedabad_surat": 265,
    "surat_ahmedabad": 265,
    "nagpur_mumbai": 840,
    "mumbai_nagpur": 840,
    "indore_mumbai": 585,
    "mumbai_indore": 585,
  };
  
  const key = `${pickup.toLowerCase().split(",")[0].trim()}_${drop.toLowerCase().split(",")[0].trim()}`;
  return distanceMap[key] || Math.floor(400 + Math.random() * 1200);
}

function calculateSuggestedPrice(load: MockLoad): { 
  suggestedPrice: number;
  breakdown: {
    baseAmount: number;
    fuelSurcharge: number;
    adminMargin: number;
    handlingFee: number;
  };
  params: {
    distanceKm: number;
    weightTons: number;
    baseRatePerKm: number;
  };
} {
  const distanceKm = estimateDistance(load.pickup, load.drop);
  const weightTons = load.weight;
  const baseRate = ratePerKmByType[load.type] || 45;
  
  let baseAmount = distanceKm * baseRate;
  if (weightTons > 5) {
    baseAmount *= (1 + (weightTons - 5) * 0.02);
  }
  
  const fuelSurcharge = Math.round(baseAmount * 0.12);
  const adminMargin = Math.round(baseAmount * 0.08);
  const handlingFee = 500;
  
  const suggestedPrice = Math.round(baseAmount + fuelSurcharge + adminMargin + handlingFee);
  
  return {
    suggestedPrice,
    breakdown: {
      baseAmount: Math.round(baseAmount),
      fuelSurcharge,
      adminMargin,
      handlingFee,
    },
    params: {
      distanceKm,
      weightTons,
      baseRatePerKm: baseRate,
    }
  };
}

export default function LoadQueuePage() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const { toast } = useToast();
  const { loads, updateLoad } = useMockData();
  const [searchQuery, setSearchQuery] = useState("");
  const [regionFilter, setRegionFilter] = useState("All Regions");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [priorityFilter, setPriorityFilter] = useState("All Priority");
  const [selectedLoad, setSelectedLoad] = useState<MockLoad | null>(null);
  const [selectedRealLoad, setSelectedRealLoad] = useState<RealLoad | null>(null);
  const [pricingDialogOpen, setPricingDialogOpen] = useState(false);
  const [pricingDrawerOpen, setPricingDrawerOpen] = useState(false);
  const [invoiceDrawerOpen, setInvoiceDrawerOpen] = useState(false);
  const [invoicePricingAmount, setInvoicePricingAmount] = useState<number>(0);
  const [finalPrice, setFinalPrice] = useState("");
  const [postMode, setPostMode] = useState<"open" | "invite" | "assign">("open");
  const [selectedCarriers, setSelectedCarriers] = useState<string[]>([]);
  const [assignedCarrier, setAssignedCarrier] = useState("");
  const [allowCounterBids, setAllowCounterBids] = useState(true);
  const [adminComment, setAdminComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user } = useAuth();

  const { data: realLoads = [], isLoading: isLoadingReal } = useQuery<RealLoad[]>({
    queryKey: ["/api/admin/queue"],
    refetchInterval: 30000,
  });

  // WebSocket listener for real-time load submissions from shippers
  useEffect(() => {
    if (user?.id && user?.role === "admin") {
      connectMarketplace("admin", user.id);
      
      const unsubLoadSubmitted = onMarketplaceEvent("load_submitted", (data) => {
        toast({
          title: "New Load Submitted",
          description: `${data.load?.shipperName || "A shipper"} submitted a load from ${data.load?.pickupCity || ""} to ${data.load?.dropoffCity || ""}`,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/queue"] });
      });

      return () => {
        unsubLoadSubmitted();
        disconnectMarketplace();
      };
    }
  }, [user?.id, user?.role, toast]);

  // Handle highlight query param from notifications - auto-open drawer for that load
  const [highlightHandled, setHighlightHandled] = useState(false);
  useEffect(() => {
    if (highlightHandled) return;
    const params = new URLSearchParams(searchString || "");
    const highlightId = params.get("highlight");
    if (!highlightId) return;
    
    // Wait for real loads to finish loading before attempting to match
    if (isLoadingReal) return;
    
    // Search in real loads (full ID, prefix match, or uppercase short ID comparison)
    const matchingLoad = realLoads.find(l => 
      l.id === highlightId || 
      l.id.startsWith(highlightId) || 
      l.id.slice(0, 8).toUpperCase() === highlightId.slice(0, 8).toUpperCase()
    );
    
    if (matchingLoad) {
      setSelectedRealLoad(matchingLoad);
      setPricingDrawerOpen(true);
      setHighlightHandled(true);
      // Clear query param after drawer opens
      setTimeout(() => navigate("/admin/load-queue", { replace: true }), 200);
    } else {
      // No matching load found after data loaded - clear param and mark handled
      setHighlightHandled(true);
      navigate("/admin/load-queue", { replace: true });
    }
  }, [searchString, realLoads, isLoadingReal, highlightHandled, navigate]);

  const convertToDrawerFormat = (load: MockLoad) => ({
    id: load.loadId,
    loadId: load.loadId,
    pickupCity: load.pickup.split(",")[0].trim(),
    dropoffCity: load.drop.split(",")[0].trim(),
    weight: load.weight,
    weightUnit: load.weightUnit,
    requiredTruckType: load.type,
    distance: estimateDistance(load.pickup, load.drop),
    pickupDate: load.pickupDate,
    cargoDescription: load.cargoDescription,
  });

  const convertRealToDrawerFormat = (load: RealLoad) => ({
    id: load.id,
    loadId: load.id.slice(0, 8).toUpperCase(),
    pickupCity: load.pickupCity,
    dropoffCity: load.dropoffCity,
    weight: load.weight,
    weightUnit: load.weightUnit || "MT",
    requiredTruckType: load.requiredTruckType || "Standard",
    distance: load.distance || 500,
    pickupDate: load.pickupDate,
    cargoDescription: load.cargoDescription,
    shipperId: load.shipperId,
  });

  const openRealLoadPricingDrawer = (load: RealLoad) => {
    setSelectedRealLoad(load);
    setPricingDrawerOpen(true);
  };

  const openPricingDrawer = (load: MockLoad) => {
    setSelectedLoad(load);
    setPricingDrawerOpen(true);
  };

  const openInvoiceDrawer = (load: MockLoad) => {
    setSelectedLoad(load);
    const pricing = calculateSuggestedPrice(load);
    setInvoicePricingAmount(pricing.suggestedPrice);
    setInvoiceDrawerOpen(true);
  };

  const pendingLoads = useMemo(() => getPendingLoads(loads), [loads]);

  const filteredLoads = useMemo(() => {
    return pendingLoads.filter(load => {
      const matchesSearch = searchQuery === "" || 
        load.loadId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        load.pickup.toLowerCase().includes(searchQuery.toLowerCase()) ||
        load.drop.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = typeFilter === "All Types" || load.type === typeFilter;
      
      return matchesSearch && matchesType;
    });
  }, [pendingLoads, searchQuery, typeFilter]);

  const openPricingDialog = (load: MockLoad) => {
    setSelectedLoad(load);
    const pricing = calculateSuggestedPrice(load);
    setFinalPrice(pricing.suggestedPrice.toString());
    setPricingDialogOpen(true);
    setPostMode("open");
    setSelectedCarriers([]);
    setAssignedCarrier("");
    setAllowCounterBids(true);
    setAdminComment("");
  };

  const handlePriceAndPost = async () => {
    if (!selectedLoad || !finalPrice) return;
    
    setIsSubmitting(true);
    
    try {
      let newStatus: MockLoad["status"] = "Posted";
      if (postMode === "assign") {
        newStatus = "Assigned";
      }
      
      updateLoad(selectedLoad.loadId, {
        status: newStatus,
        adminFinalPrice: parseInt(finalPrice),
        adminSuggestedPrice: parseInt(finalPrice),
        adminPostMode: postMode,
        allowCounterBids: allowCounterBids,
        invitedCarrierIds: postMode === "invite" ? selectedCarriers : null,
        carrier: postMode === "assign" ? mockCarriers.find(c => c.id === assignedCarrier)?.name || null : null,
        postedAt: new Date().toISOString(),
      });
      
      toast({
        title: "Load Posted Successfully",
        description: postMode === "assign" 
          ? `Load assigned to ${mockCarriers.find(c => c.id === assignedCarrier)?.name}`
          : postMode === "invite"
          ? `Load posted to ${selectedCarriers.length} invited carriers`
          : "Load posted to all carriers",
      });
      
      setPricingDialogOpen(false);
      setSelectedLoad(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to post load",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedPricing = selectedLoad ? calculateSuggestedPrice(selectedLoad) : null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Load Queue</h1>
          <p className="text-muted-foreground">Review, price, and post loads submitted by shippers</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-lg px-3 py-1">
            {pendingLoads.length + realLoads.length} Pending
          </Badge>
        </div>
      </div>

      {realLoads.length > 0 && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              Loads Requiring Admin Action ({realLoads.length})
            </CardTitle>
            <CardDescription>
              Shipper submissions in various workflow stages requiring admin attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Load ID</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Shipper</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Admin Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {realLoads.map((load) => (
                    <TableRow key={load.id} data-testid={`row-real-load-${load.id.slice(0, 8)}`}>
                      <TableCell className="font-mono font-medium">{load.id.slice(0, 8).toUpperCase()}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3 text-green-500" />
                            <span className="truncate max-w-[120px]">{load.pickupCity}</span>
                          </div>
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3 text-red-500" />
                            <span className="truncate max-w-[120px]">{load.dropoffCity}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{load.shipperName || "Unknown"}</span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <span className="font-medium">{load.weight} {load.weightUnit || "MT"}</span>
                          {load.cargoDescription && (
                            <p className="text-xs text-muted-foreground truncate max-w-[100px]">
                              {load.cargoDescription}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          // Show price: finalPrice (negotiated) > adminFinalPrice > adminPrice
                          const price = load.finalPrice || load.adminFinalPrice || load.adminPrice;
                          if (price) {
                            const priceNum = typeof price === 'string' ? parseFloat(price) : price;
                            const isBidPrice = load.finalPrice && !load.adminPrice;
                            return (
                              <div className="flex flex-col">
                                <span className="font-medium text-green-600 dark:text-green-400">
                                  Rs. {priceNum.toLocaleString('en-IN')}
                                </span>
                                {isBidPrice && (
                                  <span className="text-xs text-muted-foreground">(Bid Price)</span>
                                )}
                              </div>
                            );
                          }
                          return <span className="text-muted-foreground text-sm">Not priced</span>;
                        })()}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const stateDisplay = getCanonicalStateDisplay(load.status);
                          return (
                            <Badge variant={stateDisplay.variant} className={stateDisplay.className}>
                              {load.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                              {load.status === "priced" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                              {load.status === "invoice_sent" && <Send className="h-3 w-3 mr-1" />}
                              {stateDisplay.label}
                            </Badge>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-right">
                        {(() => {
                          const adminAction = getAdminActionForState(load.status);
                          if (adminAction) {
                            const handleAction = () => {
                              if (adminAction.action === "price" || adminAction.action === "reprice" || adminAction.action === "send_invoice" || adminAction.action === "push_to_carriers") {
                                openRealLoadPricingDrawer(load);
                              } else if (adminAction.action === "view_bids" || adminAction.action === "negotiate" || adminAction.action === "track_shipment" || adminAction.action === "view_invoice") {
                                openRealLoadPricingDrawer(load);
                              } else {
                                openRealLoadPricingDrawer(load);
                              }
                            };
                            return (
                              <Button 
                                size="sm" 
                                onClick={handleAction}
                                data-testid={`button-action-real-${load.id.slice(0, 8)}`}
                              >
                                {adminAction.action === "price" && <Calculator className="h-4 w-4 mr-1" />}
                                {adminAction.action === "send_invoice" && <Send className="h-4 w-4 mr-1" />}
                                {adminAction.action === "reprice" && <Calculator className="h-4 w-4 mr-1" />}
                                {adminAction.action === "negotiate" && <Users className="h-4 w-4 mr-1" />}
                                {adminAction.action === "view_invoice" && <Receipt className="h-4 w-4 mr-1" />}
                                {adminAction.action === "push_to_carriers" && <Truck className="h-4 w-4 mr-1" />}
                                {adminAction.action === "view_bids" && <Gavel className="h-4 w-4 mr-1" />}
                                {adminAction.action === "track_shipment" && <MapPin className="h-4 w-4 mr-1" />}
                                {adminAction.buttonLabel}
                              </Button>
                            );
                          }
                          return (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => openRealLoadPricingDrawer(load)}
                              data-testid={`button-view-real-${load.id.slice(0, 8)}`}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View Details
                            </Button>
                          );
                        })()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by load ID, pickup, or destination..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-loads"
              />
            </div>
            <div className="flex gap-2">
              <Select value={regionFilter} onValueChange={setRegionFilter}>
                <SelectTrigger className="w-[150px]" data-testid="select-region">
                  <SelectValue placeholder="Region" />
                </SelectTrigger>
                <SelectContent>
                  {regions.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[150px]" data-testid="select-type">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {loadTypes.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredLoads.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No pending loads to review</p>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Load ID</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Truck Type</TableHead>
                    <TableHead>Pickup Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLoads.map((load) => {
                    const pricing = calculateSuggestedPrice(load);
                    return (
                      <TableRow key={load.loadId} data-testid={`row-load-${load.loadId}`}>
                        <TableCell className="font-mono font-medium">{load.loadId}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1 text-sm">
                              <MapPin className="h-3 w-3 text-green-500" />
                              <span className="truncate max-w-[120px]">{load.pickup}</span>
                            </div>
                            <div className="flex items-center gap-1 text-sm">
                              <MapPin className="h-3 w-3 text-red-500" />
                              <span className="truncate max-w-[120px]">{load.drop}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <span className="font-medium">{load.weight} {load.weightUnit}</span>
                            {load.cargoDescription && (
                              <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                                {load.cargoDescription}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate">
                            <Truck className="h-3 w-3 mr-1" />
                            {load.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {new Date(load.pickupDate).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={load.status === "Pending Admin Review" ? "default" : "secondary"}
                            className={load.status === "Pending Admin Review" ? "bg-amber-500 text-white" : ""}
                          >
                            {load.status === "Pending Admin Review" ? (
                              <><Clock className="h-3 w-3 mr-1" /> Pending</>
                            ) : load.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-sm font-medium text-muted-foreground">
                              Est. Rs. {pricing.suggestedPrice.toLocaleString('en-IN')}
                            </span>
                            <Button 
                              size="sm" 
                              onClick={() => openPricingDrawer(load)}
                              data-testid={`button-price-${load.loadId}`}
                            >
                              <Calculator className="h-4 w-4 mr-1" />
                              Price & Post
                            </Button>
                            <Button 
                              size="sm"
                              variant="outline"
                              onClick={() => openInvoiceDrawer(load)}
                              data-testid={`button-invoice-${load.loadId}`}
                            >
                              <Receipt className="h-4 w-4 mr-1" />
                              Invoice
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Dialog open={pricingDialogOpen} onOpenChange={setPricingDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Price and Post Load</DialogTitle>
            <DialogDescription>
              Set the final price and choose how to post this load to carriers
            </DialogDescription>
          </DialogHeader>

          {selectedLoad && selectedPricing && (
            <div className="space-y-6">
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Load ID:</span>
                    <span className="ml-2 font-mono font-medium">{selectedLoad.loadId}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Route:</span>
                    <span className="ml-2">{selectedLoad.pickup} to {selectedLoad.drop}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Weight:</span>
                    <span className="ml-2">{selectedLoad.weight} {selectedLoad.weightUnit}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Truck Type:</span>
                    <span className="ml-2">{selectedLoad.type}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Price Estimation
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Distance ({selectedPricing.params.distanceKm} km x Rs. {selectedPricing.params.baseRatePerKm})</span>
                      <span>Rs. {selectedPricing.breakdown.baseAmount.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fuel Surcharge (12%)</span>
                      <span>Rs. {selectedPricing.breakdown.fuelSurcharge.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Platform Fee (8%)</span>
                      <span>Rs. {selectedPricing.breakdown.adminMargin.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Handling Fee</span>
                      <span>Rs. {selectedPricing.breakdown.handlingFee.toLocaleString('en-IN')}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Suggested Price</span>
                      <span className="text-primary">Rs. {selectedPricing.suggestedPrice.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Final Price
                  </h4>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Set Final Price (Rs.)</Label>
                      <Input
                        type="number"
                        value={finalPrice}
                        onChange={(e) => setFinalPrice(e.target.value)}
                        data-testid="input-final-price"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="allowCounter"
                        checked={allowCounterBids}
                        onChange={(e) => setAllowCounterBids(e.target.checked)}
                        className="rounded border-input"
                      />
                      <Label htmlFor="allowCounter" className="text-sm font-normal cursor-pointer">
                        Allow carriers to submit counter bids
                      </Label>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Posting Mode
                </h4>
                <Tabs value={postMode} onValueChange={(v) => setPostMode(v as typeof postMode)}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="open" data-testid="tab-open">
                      Open Market
                    </TabsTrigger>
                    <TabsTrigger value="invite" data-testid="tab-invite">
                      Invite Only
                    </TabsTrigger>
                    <TabsTrigger value="assign" data-testid="tab-assign">
                      Direct Assign
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="open" className="pt-4">
                    <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-green-700 dark:text-green-300 text-sm">Open to all verified carriers</p>
                          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                            All carriers matching the requirements can see and bid on this load.
                          </p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="invite" className="pt-4 space-y-3">
                    <p className="text-sm text-muted-foreground">Select carriers to invite:</p>
                    <ScrollArea className="h-[150px] border rounded-md p-2">
                      {mockCarriers.map((carrier) => (
                        <div 
                          key={carrier.id}
                          className="flex items-center justify-between p-2 hover-elevate rounded-md"
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={selectedCarriers.includes(carrier.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedCarriers([...selectedCarriers, carrier.id]);
                                } else {
                                  setSelectedCarriers(selectedCarriers.filter(id => id !== carrier.id));
                                }
                              }}
                              className="rounded border-input"
                            />
                            <div>
                              <p className="font-medium text-sm">{carrier.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {carrier.zone} | {carrier.trucks} trucks | {carrier.completedLoads} loads
                              </p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">
                            {carrier.rating.toFixed(1)} rating
                          </Badge>
                        </div>
                      ))}
                    </ScrollArea>
                    {selectedCarriers.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {selectedCarriers.length} carrier(s) selected
                      </p>
                    )}
                  </TabsContent>
                  <TabsContent value="assign" className="pt-4 space-y-3">
                    <p className="text-sm text-muted-foreground">Directly assign to a carrier:</p>
                    <Select value={assignedCarrier} onValueChange={setAssignedCarrier}>
                      <SelectTrigger data-testid="select-assign-carrier">
                        <SelectValue placeholder="Select carrier to assign" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockCarriers.map((carrier) => (
                          <SelectItem key={carrier.id} value={carrier.id}>
                            <div className="flex items-center gap-2">
                              <span>{carrier.name}</span>
                              <Badge variant="outline" className="ml-2 no-default-hover-elevate no-default-active-elevate">
                                {carrier.rating.toFixed(1)}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {assignedCarrier && (
                      <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm">
                        <p className="text-blue-700 dark:text-blue-300">
                          Load will be directly assigned to{" "}
                          <strong>{mockCarriers.find(c => c.id === assignedCarrier)?.name}</strong>
                        </p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>

              <div className="space-y-2">
                <Label>Admin Notes (Optional)</Label>
                <Textarea
                  placeholder="Add notes about this pricing decision..."
                  value={adminComment}
                  onChange={(e) => setAdminComment(e.target.value)}
                  data-testid="input-admin-comment"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPricingDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handlePriceAndPost} 
              disabled={isSubmitting || !finalPrice || (postMode === "assign" && !assignedCarrier)}
              data-testid="button-confirm-post"
            >
              {isSubmitting ? "Posting..." : "Confirm & Post"}
              <Send className="h-4 w-4 ml-2" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PricingDrawer
        open={pricingDrawerOpen}
        onOpenChange={(open) => {
          setPricingDrawerOpen(open);
          if (!open) {
            setSelectedRealLoad(null);
          }
        }}
        load={selectedRealLoad ? convertRealToDrawerFormat(selectedRealLoad) : (selectedLoad ? convertToDrawerFormat(selectedLoad) : null)}
        onSuccess={() => {
          if (selectedLoad) {
            updateLoad(selectedLoad.loadId, { status: "Posted" });
          }
          setSelectedRealLoad(null);
        }}
        carriers={mockCarriers}
      />

      {selectedLoad && invoiceDrawerOpen && (
        <InvoiceDrawer
          open={invoiceDrawerOpen}
          onOpenChange={setInvoiceDrawerOpen}
          load={{
            id: selectedLoad.loadId,
            pickupCity: selectedLoad.pickup.split(",")[0].trim(),
            dropoffCity: selectedLoad.drop.split(",")[0].trim(),
            weight: selectedLoad.weight,
            requiredTruckType: selectedLoad.type,
            distance: estimateDistance(selectedLoad.pickup, selectedLoad.drop),
            pickupDate: selectedLoad.pickupDate,
            shipperId: (selectedLoad as unknown as { shipperId?: string }).shipperId || "shipper-1",
            cargoDescription: selectedLoad.cargoDescription,
          }}
          pricingAmount={invoicePricingAmount}
          onSuccess={() => {
            toast({
              title: "Invoice Created",
              description: "Invoice has been created successfully.",
            });
          }}
        />
      )}
    </div>
  );
}
