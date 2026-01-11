import { useState, useMemo, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
  Eye,
  RefreshCw
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
  pickupLocality?: string;
  pickupLandmark?: string;
  dropoffAddress?: string;
  dropoffLocality?: string;
  dropoffLandmark?: string;
  dropoffBusinessName?: string;
  weight: number;
  weightUnit?: string;
  cargoDescription?: string;
  goodsToBeCarried?: string;
  specialNotes?: string;
  shipperPricePerTon?: string | number;
  shipperFixedPrice?: string | number;
  rateType?: string;
  advancePaymentPercent?: number;
  requiredTruckType?: string;
  pickupDate?: string;
  deliveryDate?: string;
  status: string;
  shipperId: string;
  shipperName?: string;
  shipperEmail?: string;
  shipperCompanyName?: string;
  shipperContactName?: string;
  shipperCompanyAddress?: string;
  shipperPhone?: string;
  receiverName?: string;
  receiverPhone?: string;
  receiverEmail?: string;
  distance?: number;
  priority?: string;
  adminPrice?: number;
  adminFinalPrice?: string;
  finalPrice?: string;
  priceLockedAt?: string;
  submittedAt?: string;
  shipperLoadNumber?: number | null;
  adminReferenceNumber?: number | null;
}

// Format load ID for display - Admin sees LD-1001, LD-1002, etc.
function formatLoadId(load: { shipperLoadNumber?: number | null; adminReferenceNumber?: number | null; id: string }): string {
  // If admin has assigned a reference number, show that (e.g., LD-1001, LD-10023)
  if (load.adminReferenceNumber) {
    return `LD-${load.adminReferenceNumber}`;
  }
  // Otherwise show shipper's sequential number (e.g., LD-001)
  if (load.shipperLoadNumber) {
    return `LD-${String(load.shipperLoadNumber).padStart(3, '0')}`;
  }
  // Fallback to first 8 chars of UUID
  return load.id.slice(0, 8).toUpperCase();
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
  const { t } = useTranslation();
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
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [detailsLoad, setDetailsLoad] = useState<RealLoad | null>(null);

  const { user } = useAuth();
  
  const openLoadDetails = (load: RealLoad) => {
    setDetailsLoad(load);
    setDetailsDialogOpen(true);
  };

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
    loadId: formatLoadId(load),
    pickupCity: load.pickupCity,
    dropoffCity: load.dropoffCity,
    weight: load.weight,
    weightUnit: load.weightUnit || "MT",
    requiredTruckType: load.requiredTruckType || "Standard",
    distance: load.distance || 500,
    pickupDate: load.pickupDate,
    cargoDescription: load.cargoDescription,
    shipperId: load.shipperId,
    shipperName: load.shipperName,
    status: load.status,
    adminPrice: load.adminPrice,
    finalPrice: load.finalPrice,
    adminFinalPrice: load.adminFinalPrice,
    // Shipper's pricing preferences
    shipperPricePerTon: load.shipperPricePerTon,
    shipperFixedPrice: load.shipperFixedPrice,
    rateType: load.rateType,
    advancePaymentPercent: load.advancePaymentPercent,
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
          <h1 className="text-2xl font-bold" data-testid="text-page-title">{t('admin.loadQueue')}</h1>
          <p className="text-muted-foreground">{t('admin.loadQueueDescription')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-lg px-3 py-1">
            {pendingLoads.length + realLoads.length} {t('common.pending')}
          </Badge>
        </div>
      </div>

      {/* Invoice Sending - Compact grid of carrier finalized loads */}
      {(() => {
        const invoiceLoads = realLoads
          .filter(l => l.status === 'awarded')
          .sort((a, b) => {
            const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
            const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
            return dateB - dateA;
          });
        if (invoiceLoads.length === 0) return null;
        return (
          <Card className="border-emerald-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Send className="h-5 w-5 text-emerald-500" />
                {t('admin.invoiceSending')} ({invoiceLoads.length})
              </CardTitle>
              <CardDescription>
                {t('admin.invoiceSendingDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {invoiceLoads.map((load) => {
                  // For invoices, use adminFinalPrice (shipper total) first, not finalPrice (carrier negotiated)
                  const price = load.adminFinalPrice || load.shipperFixedPrice || load.adminPrice;
                  const priceNum = price ? (typeof price === 'string' ? parseFloat(price) : price) : 0;
                  
                  return (
                    <div 
                      key={load.id} 
                      className="border rounded-lg p-3 bg-card hover-elevate"
                      data-testid={`card-invoice-load-${load.id.slice(0, 8)}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="font-mono text-sm font-medium">{formatLoadId(load)}</span>
                        <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs">
                          {t('admin.ready')}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1 mb-3">
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3 text-green-500 shrink-0" />
                          <span className="truncate">{load.pickupCity}</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3 text-red-500 shrink-0" />
                          <span className="truncate">{load.dropoffCity}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm mb-3">
                        <span className="text-muted-foreground">{load.shipperName || t('loads.shipper')}</span>
                        <span className="font-medium">{load.weight} {load.weightUnit || "MT"}</span>
                      </div>
                      
                      <div className="border-t pt-2 mb-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{t('common.total')}</span>
                          <span className="font-bold text-green-600 dark:text-green-400">
                            Rs. {priceNum.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="flex-1"
                          onClick={() => openLoadDetails(load)}
                          data-testid={`button-view-invoice-details-${load.id.slice(0, 8)}`}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          {t('common.view')}
                        </Button>
                        <Button 
                          size="sm"
                          className="flex-1"
                          onClick={() => openRealLoadPricingDrawer(load)}
                          data-testid={`button-send-invoice-${load.id.slice(0, 8)}`}
                        >
                          <Send className="h-3 w-3 mr-1" />
                          {t('invoices.send')}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Pricing & Posting Table - Loads with pending status */}
      {(() => {
        const pricingLoads = realLoads.filter(l => l.status === 'pending' || l.status === 'priced');
        if (pricingLoads.length === 0) return null;
        return (
          <Card className="border-amber-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calculator className="h-5 w-5 text-amber-500" />
                {t('admin.pricingAndPosting')} ({pricingLoads.length})
              </CardTitle>
              <CardDescription>
                {t('admin.pricingAndPostingDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('loads.loadId')}</TableHead>
                      <TableHead>{t('loads.route')}</TableHead>
                      <TableHead>{t('loads.shipper')}</TableHead>
                      <TableHead>{t('loads.cargo')}</TableHead>
                      <TableHead>{t('admin.totalPrice')}</TableHead>
                      <TableHead>{t('common.status')}</TableHead>
                      <TableHead className="text-right">{t('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pricingLoads.map((load) => {
                      const price = load.finalPrice || load.adminFinalPrice || load.adminPrice;
                      const priceNum = price ? (typeof price === 'string' ? parseFloat(price) : price) : 0;
                      
                      return (
                        <TableRow key={load.id} data-testid={`row-pricing-load-${load.id.slice(0, 8)}`}>
                          <TableCell className="font-mono font-medium">{formatLoadId(load)}</TableCell>
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
                            <span className="text-sm">{load.shipperName || t('common.unknown')}</span>
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
                            {priceNum > 0 ? (
                              <span className="font-medium text-green-600 dark:text-green-400">
                                Rs. {priceNum.toLocaleString('en-IN')}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-sm">{t('admin.notPriced')}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const stateDisplay = getCanonicalStateDisplay(load.status);
                              return (
                                <Badge variant={stateDisplay.variant} className={stateDisplay.className}>
                                  {load.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                                  {load.status === "priced" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                                  {stateDisplay.label}
                                </Badge>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button 
                                size="icon" 
                                variant="ghost"
                                onClick={() => openLoadDetails(load)}
                                data-testid={`button-view-pricing-details-${load.id.slice(0, 8)}`}
                                title="View full details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                onClick={() => openRealLoadPricingDrawer(load)}
                                data-testid={`button-price-load-${load.id.slice(0, 8)}`}
                              >
                                <Calculator className="h-4 w-4 mr-1" />
                                {t('admin.priceLoad')}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        );
      })()}


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

      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Load Details - {detailsLoad ? formatLoadId(detailsLoad) : ''}
            </DialogTitle>
            <DialogDescription>
              Complete shipper submission details
            </DialogDescription>
          </DialogHeader>
          
          {detailsLoad && (
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Shipper Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground text-xs">Company Name</Label>
                      <p className="font-medium">{detailsLoad.shipperCompanyName || detailsLoad.shipperName || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Contact Name</Label>
                      <p className="font-medium">{detailsLoad.shipperContactName || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Company Address</Label>
                      <p className="font-medium">{detailsLoad.shipperCompanyAddress || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Phone</Label>
                      <p className="font-medium">{detailsLoad.shipperPhone || "N/A"}</p>
                    </div>
                    {detailsLoad.shipperEmail && (
                      <div>
                        <Label className="text-muted-foreground text-xs">Email</Label>
                        <p className="font-medium">{detailsLoad.shipperEmail}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {(detailsLoad.receiverName || detailsLoad.receiverPhone) && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Receiver Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground text-xs">Receiver Name</Label>
                        <p className="font-medium">{detailsLoad.receiverName || "N/A"}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">Receiver Phone</Label>
                        <p className="font-medium">{detailsLoad.receiverPhone || "N/A"}</p>
                      </div>
                      {detailsLoad.receiverEmail && (
                        <div className="col-span-2">
                          <Label className="text-muted-foreground text-xs">Receiver Email</Label>
                          <p className="font-medium">{detailsLoad.receiverEmail}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Route Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 text-sm">
                  {/* Pickup Location */}
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">Pickup Location</Label>
                    <div className="grid grid-cols-2 gap-3 pl-2 border-l-2 border-green-500">
                      <div>
                        <Label className="text-muted-foreground text-xs">Street Address</Label>
                        <p className="font-medium">{detailsLoad.pickupAddress || "N/A"}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">City, State</Label>
                        <p className="font-medium">{detailsLoad.pickupCity}</p>
                      </div>
                      {detailsLoad.pickupLocality && (
                        <div>
                          <Label className="text-muted-foreground text-xs">Locality / Area</Label>
                          <p className="font-medium">{detailsLoad.pickupLocality}</p>
                        </div>
                      )}
                      {detailsLoad.pickupLandmark && (
                        <div>
                          <Label className="text-muted-foreground text-xs">Landmark</Label>
                          <p className="font-medium">{detailsLoad.pickupLandmark}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dropoff Location */}
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">Dropoff Location</Label>
                    <div className="grid grid-cols-2 gap-3 pl-2 border-l-2 border-red-500">
                      {detailsLoad.dropoffBusinessName && (
                        <div className="col-span-2">
                          <Label className="text-muted-foreground text-xs">Business Name</Label>
                          <p className="font-medium">{detailsLoad.dropoffBusinessName}</p>
                        </div>
                      )}
                      <div>
                        <Label className="text-muted-foreground text-xs">Street Address</Label>
                        <p className="font-medium">{detailsLoad.dropoffAddress || "N/A"}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">City, State</Label>
                        <p className="font-medium">{detailsLoad.dropoffCity}</p>
                      </div>
                      {detailsLoad.dropoffLocality && (
                        <div>
                          <Label className="text-muted-foreground text-xs">Locality / Area</Label>
                          <p className="font-medium">{detailsLoad.dropoffLocality}</p>
                        </div>
                      )}
                      {detailsLoad.dropoffLandmark && (
                        <div>
                          <Label className="text-muted-foreground text-xs">Landmark</Label>
                          <p className="font-medium">{detailsLoad.dropoffLandmark}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Cargo Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground text-xs">Weight</Label>
                      <p className="font-medium">{detailsLoad.weight} {detailsLoad.weightUnit || "MT"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Required Truck Type</Label>
                      <p className="font-medium">{detailsLoad.requiredTruckType || "Standard"}</p>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-muted-foreground text-xs">Goods to be Carried</Label>
                      <p className="font-medium">{detailsLoad.goodsToBeCarried || detailsLoad.cargoDescription || "N/A"}</p>
                    </div>
                    {detailsLoad.specialNotes && (
                      <div className="col-span-2">
                        <Label className="text-muted-foreground text-xs">Special Notes</Label>
                        <p className="font-medium text-amber-600 dark:text-amber-400">{detailsLoad.specialNotes}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground text-xs">Pickup Date</Label>
                      <p className="font-medium">
                        {detailsLoad.pickupDate 
                          ? new Date(detailsLoad.pickupDate).toLocaleString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : "Not specified"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Delivery Date</Label>
                      <p className="font-medium">
                        {detailsLoad.deliveryDate 
                          ? new Date(detailsLoad.deliveryDate).toLocaleString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : "Not specified"}
                      </p>
                    </div>
                    {detailsLoad.submittedAt && (
                      <div className="col-span-2">
                        <Label className="text-muted-foreground text-xs">Submitted At</Label>
                        <p className="font-medium text-muted-foreground">
                          {new Date(detailsLoad.submittedAt).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Shipper's Pricing Preference
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground text-xs">Rate Type</Label>
                      <p className="font-medium">
                        {detailsLoad.rateType === "fixed_price" ? "Fixed Price" : "Per Tonne Rate"}
                      </p>
                    </div>
                    {detailsLoad.rateType === "fixed_price" && detailsLoad.shipperFixedPrice && (
                      <div>
                        <Label className="text-muted-foreground text-xs">Shipper's Fixed Price</Label>
                        <p className="font-medium text-blue-600 dark:text-blue-400">
                          Rs. {Number(detailsLoad.shipperFixedPrice).toLocaleString('en-IN')}
                        </p>
                      </div>
                    )}
                    {detailsLoad.rateType !== "fixed_price" && detailsLoad.shipperPricePerTon && (
                      <div>
                        <Label className="text-muted-foreground text-xs">Shipper's Rate (Per Tonne)</Label>
                        <p className="font-medium text-blue-600 dark:text-blue-400">
                          Rs. {Number(detailsLoad.shipperPricePerTon).toLocaleString('en-IN')} / tonne
                        </p>
                      </div>
                    )}
                    {detailsLoad.advancePaymentPercent !== undefined && detailsLoad.advancePaymentPercent !== null && (
                      <div>
                        <Label className="text-muted-foreground text-xs">Preferred Advance Payment</Label>
                        <p className="font-medium text-amber-600 dark:text-amber-400">
                          {detailsLoad.advancePaymentPercent}%
                        </p>
                      </div>
                    )}
                    {detailsLoad.adminPrice && (
                      <div>
                        <Label className="text-muted-foreground text-xs">Admin Priced Amount</Label>
                        <p className="font-medium text-green-600 dark:text-green-400">
                          Rs. {Number(detailsLoad.adminPrice).toLocaleString('en-IN')}
                        </p>
                      </div>
                    )}
                    {detailsLoad.finalPrice && (
                      <div>
                        <Label className="text-muted-foreground text-xs">Final Negotiated Price</Label>
                        <p className="font-medium text-emerald-600 dark:text-emerald-400">
                          Rs. {Number(detailsLoad.finalPrice).toLocaleString('en-IN')}
                        </p>
                      </div>
                    )}
                    {detailsLoad.adminFinalPrice && (
                      <div>
                        <Label className="text-muted-foreground text-xs">Invoice Total</Label>
                        <p className="font-medium text-primary">
                          Rs. {Number(detailsLoad.adminFinalPrice).toLocaleString('en-IN')}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  Status: {getCanonicalStateDisplay(detailsLoad.status).label}
                </Badge>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDetailsDialogOpen(false)}
              data-testid="button-close-details-dialog"
            >
              Close
            </Button>
            <Button 
              onClick={() => {
                setDetailsDialogOpen(false);
                if (detailsLoad) {
                  openRealLoadPricingDrawer(detailsLoad);
                }
              }}
              data-testid="button-price-from-details"
            >
              <Calculator className="h-4 w-4 mr-2" />
              Price This Load
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
