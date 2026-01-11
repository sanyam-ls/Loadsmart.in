import { useState, useEffect, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import {
  Calculator,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Truck,
  MapPin,
  Package,
  Users,
  Send,
  Sparkles,
  IndianRupee,
  ChevronRight,
  Loader2,
  BarChart3,
  Receipt,
  FileText,
  CheckCircle,
  Scale,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface LoadData {
  id: string;
  loadId?: string;
  pickupCity: string;
  dropoffCity: string;
  weight: number | string;
  weightUnit?: string;
  requiredTruckType: string;
  distance?: number | string;
  pickupDate?: string | Date;
  shipperId?: string;
  shipperName?: string;
  status?: string;
  cargoDescription?: string;
  adminPrice?: number;
  finalPrice?: string;
  adminFinalPrice?: string;
  // Shipper's requested pricing
  shipperPricePerTon?: string | number | null;
  shipperFixedPrice?: string | number | null;
  rateType?: string | null; // "per_ton" or "fixed_price"
}

interface CarrierOption {
  id: string;
  name: string;
  rating: number;
  trucks: number;
  zone: string;
  completedLoads: number;
}

interface PricingDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  load: LoadData | null;
  onSuccess?: () => void;
  carriers?: CarrierOption[];
}

interface PricingSuggestion {
  load_id: string;
  suggested_price: number;
  breakdown: {
    baseAmount: number;
    fuelSurcharge: number;
    handlingFee: number;
    seasonalMultiplier: number;
    regionMultiplier: number;
  };
  params: {
    distanceKm: number;
    weightTons: number;
    loadType: string;
    baseRatePerKm: number;
    region: string;
  };
  confidence_score: number;
  comparable_loads: Array<{
    id: string;
    route: string;
    distance: number;
    finalPrice: string;
  }>;
  risk_flags: string[];
  platform_rate_percent: number;
}

interface PricingTemplate {
  id: string;
  name: string;
  description?: string;
  markupPercent: string;
  fixedFee: string;
  fuelSurchargePercent: string;
  platformRatePercent: string;
}

const formatRupees = (amount: number): string => {
  return `Rs. ${amount.toLocaleString("en-IN")}`;
};

export function PricingDrawer({
  open,
  onOpenChange,
  load,
  onSuccess,
  carriers = [],
}: PricingDrawerProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLocking, setIsLocking] = useState(false);

  // Pricing state
  const [suggestedPrice, setSuggestedPrice] = useState(0);
  const [grossPrice, setGrossPrice] = useState(0); // Total price before margin deduction (what shipper pays)
  const [markupPercent, setMarkupPercent] = useState(0);
  const [fixedFee, setFixedFee] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [platformMarginPercent, setPlatformMarginPercent] = useState(10);
  const [advancePaymentPercent, setAdvancePaymentPercent] = useState(0);
  const [notes, setNotes] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  
  // Per-ton pricing state
  const [usePerTonRate, setUsePerTonRate] = useState(false);
  const [ratePerTon, setRatePerTon] = useState(0);
  const [customTonnage, setCustomTonnage] = useState<number | null>(null);

  // Posting options
  const [postMode, setPostMode] = useState<"open" | "invite" | "assign">("open");
  const [selectedCarriers, setSelectedCarriers] = useState<string[]>([]);
  const [allowCounterBids, setAllowCounterBids] = useState(true);

  // Pricing intelligence data
  const [breakdown, setBreakdown] = useState<PricingSuggestion["breakdown"] | null>(null);
  const [params, setParams] = useState<PricingSuggestion["params"] | null>(null);
  const [confidenceScore, setConfidenceScore] = useState(0);
  const [pricingId, setPricingId] = useState<string | null>(null);

  // Determine if load is in "Carrier Finalized" state (awarded) - ready for invoice
  const isCarrierFinalized = load?.status === "awarded";
  
  // Get the invoice price for shipper - use adminFinalPrice (shipper's gross price)
  // NOT finalPrice which is carrier payout after platform margin deduction
  const bidPrice = useMemo(() => {
    // For shipper invoices, use adminFinalPrice (shipper's gross price)
    const price = load?.adminFinalPrice || load?.adminPrice;
    if (price) {
      return typeof price === 'string' ? parseFloat(price) : price;
    }
    return 0;
  }, [load]);

  // Fetch templates
  const { data: templates = [] } = useQuery<PricingTemplate[]>({
    queryKey: ["/api/admin/pricing/templates"],
    enabled: open && !isCarrierFinalized,
  });

  // Calculate derived values - margin is calculated from gross price
  const platformMargin = useMemo(() => {
    return Math.round(grossPrice * (platformMarginPercent / 100));
  }, [grossPrice, platformMarginPercent]);

  // Final price (carrier payout) = gross price - platform margin
  const finalPrice = useMemo(() => {
    return grossPrice - platformMargin;
  }, [grossPrice, platformMargin]);

  // carrierPayout is the same as finalPrice (what carrier receives)
  const carrierPayout = finalPrice;

  const priceDeviation = useMemo(() => {
    if (suggestedPrice === 0) return 0;
    return ((grossPrice - suggestedPrice) / suggestedPrice) * 100;
  }, [grossPrice, suggestedPrice]);

  const requiresApproval = useMemo(() => {
    return Math.abs(priceDeviation) > 15;
  }, [priceDeviation]);

  // Get weight in tons, converting from KG if needed
  const loadWeightInTons = useMemo(() => {
    const w = parseFloat(load?.weight?.toString() || "0");
    if (w <= 0) return 1;
    // Convert KG to MT if weight unit is KG
    if (load?.weightUnit === 'KG') {
      return Math.round((w / 1000) * 100) / 100; // Round to 2 decimal places
    }
    return w; // Already in MT
  }, [load?.weight, load?.weightUnit]);

  // Use custom tonnage if set, otherwise use load weight
  const weightInTons = customTonnage !== null ? customTonnage : loadWeightInTons;

  // Calculated price from per-ton rate
  const calculatedFromPerTon = useMemo(() => {
    return Math.round(ratePerTon * weightInTons);
  }, [ratePerTon, weightInTons]);

  // Suggested per-ton rate based on suggested price
  const suggestedPerTonRate = useMemo(() => {
    if (weightInTons <= 0 || suggestedPrice <= 0) return 0;
    return Math.round(suggestedPrice / weightInTons);
  }, [suggestedPrice, weightInTons]);

  // Reset per-ton state when drawer closes or load changes
  useEffect(() => {
    if (!open) {
      // Reset when drawer closes
      setUsePerTonRate(false);
      setRatePerTon(0);
      setCustomTonnage(null);
    }
  }, [open]);

  // Reset per-ton state when load changes
  useEffect(() => {
    setUsePerTonRate(false);
    setRatePerTon(0);
    setCustomTonnage(null);
  }, [load?.id]);

  // Auto-populate pricing from shipper's requested rate
  useEffect(() => {
    if (open && load && !isCarrierFinalized) {
      // Check if shipper provided pricing
      const shipperRate = load.rateType;
      const shipperPerTon = load.shipperPricePerTon;
      const shipperFixed = load.shipperFixedPrice;
      
      if (shipperRate === "per_ton" && shipperPerTon) {
        // Shipper provided per-ton rate
        const perTonValue = typeof shipperPerTon === 'string' ? parseFloat(shipperPerTon) : shipperPerTon;
        if (perTonValue > 0) {
          setUsePerTonRate(true);
          setRatePerTon(perTonValue);
          // Calculate gross price from per-ton rate
          const calculatedPrice = Math.round(perTonValue * loadWeightInTons);
          setGrossPrice(calculatedPrice);
        }
      } else if (shipperFixed) {
        // Shipper provided fixed price
        const fixedValue = typeof shipperFixed === 'string' ? parseFloat(shipperFixed) : shipperFixed;
        if (fixedValue > 0) {
          setUsePerTonRate(false);
          setGrossPrice(Math.round(fixedValue));
        }
      }
    }
  }, [open, load?.id, load?.rateType, load?.shipperPricePerTon, load?.shipperFixedPrice, isCarrierFinalized, loadWeightInTons]);

  // Fetch suggested price when load changes (only for non-finalized loads)
  useEffect(() => {
    if (open && load?.id && !isCarrierFinalized) {
      fetchSuggestedPrice();
    }
  }, [open, load?.id, isCarrierFinalized]);

  // Update gross price when adjustments change (only when not using per-ton rate)
  useEffect(() => {
    if (!usePerTonRate && suggestedPrice > 0) {
      const adjusted = suggestedPrice * (1 + markupPercent / 100) + fixedFee - discountAmount;
      setGrossPrice(Math.round(Math.max(0, adjusted)));
    }
  }, [suggestedPrice, markupPercent, fixedFee, discountAmount, usePerTonRate]);

  // Update gross price when per-ton rate changes
  useEffect(() => {
    if (usePerTonRate && ratePerTon > 0) {
      setGrossPrice(calculatedFromPerTon);
    }
  }, [usePerTonRate, ratePerTon, calculatedFromPerTon]);

  // Apply template
  useEffect(() => {
    if (selectedTemplate && templates.length > 0) {
      const template = templates.find((t) => t.id === selectedTemplate);
      if (template) {
        setMarkupPercent(parseFloat(template.markupPercent) || 0);
        setFixedFee(parseFloat(template.fixedFee) || 0);
        setPlatformMarginPercent(parseFloat(template.platformRatePercent) || 10);
      }
    }
  }, [selectedTemplate, templates]);

  const fetchSuggestedPrice = async () => {
    if (!load?.id) return;
    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/admin/pricing/suggest", {
        load_id: load.id,
        distance: load.distance,
        weight: load.weight,
        loadType: load.requiredTruckType,
        pickupCity: load.pickupCity,
      });
      const data: PricingSuggestion = await response.json();

      setSuggestedPrice(data.suggested_price);
      setGrossPrice(data.suggested_price);
      setBreakdown(data.breakdown);
      setParams(data.params);
      setConfidenceScore(data.confidence_score);
      setPlatformMarginPercent(data.platform_rate_percent);
    } catch (error) {
      console.error("Failed to fetch suggested price:", error);
      const distance = parseFloat(load.distance?.toString() || "500");
      const weight = parseFloat(load.weight?.toString() || "10");
      const basePrice = distance * 45 * (1 + Math.max(0, weight - 5) * 0.02);
      const estimated = Math.round(basePrice * 1.2 + 500);
      setSuggestedPrice(estimated);
      setGrossPrice(estimated);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendInvoice = async () => {
    if (!load?.id || bidPrice <= 0) return;
    setIsSending(true);
    
    try {
      // Generate and send invoice in one API call
      const response = await apiRequest("POST", "/api/admin/invoice/generate-and-send", {
        load_id: load.id,
        amount: bidPrice,
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Invoice Sent",
          description: `Invoice for ${formatRupees(bidPrice)} has been generated and sent to the shipper.`,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/loads"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/queue"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/invoices"] });
        queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
        onSuccess?.();
        onOpenChange(false);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to send invoice";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const validatePricing = (): string | null => {
    if (grossPrice <= 0) {
      return "Total price must be greater than zero.";
    }
    if (postMode === "invite" && selectedCarriers.length === 0) {
      return "Please select at least one carrier to invite.";
    }
    if (platformMarginPercent < 0 || platformMarginPercent > 50) {
      return "Platform margin must be between 0% and 50%.";
    }
    return null;
  };

  const handleLockAndPost = async () => {
    if (!load?.id) return;

    const validationError = validatePricing();
    if (validationError) {
      toast({
        title: "Validation Error",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    setIsLocking(true);
    
    const isMockLoad = typeof load.id === 'string' && load.id.startsWith("LD-");
    
    if (isMockLoad) {
      setTimeout(() => {
        toast({
          title: "Load Posted Successfully",
          description: `Load has been priced at ${formatRupees(grossPrice)} and posted to carriers.`,
        });
        onSuccess?.();
        onOpenChange(false);
        setIsLocking(false);
      }, 500);
      return;
    }
    
    try {
      const saveResponse = await apiRequest("POST", "/api/admin/pricing/save", {
        load_id: load.id,
        suggested_price: suggestedPrice,
        gross_price: grossPrice,
        final_price: grossPrice, // Shipper total (for invoice)
        carrier_payout: finalPrice, // Carrier payout (after margin)
        markup_percent: markupPercent,
        fixed_fee: fixedFee,
        discount_amount: discountAmount,
        platform_margin_percent: platformMarginPercent,
        advance_payment_percent: advancePaymentPercent,
        notes,
        template_id: selectedTemplate || null,
      });
      const saveData = await saveResponse.json();
      const currentPricingId = saveData.pricing?.id || pricingId;

      if (!currentPricingId) {
        throw new Error("Failed to create pricing record");
      }

      const response = await apiRequest("POST", "/api/admin/pricing/lock", {
        pricing_id: currentPricingId,
        final_price: grossPrice, // Shipper total (for invoice)
        carrier_payout: finalPrice, // Carrier payout (after margin)
        post_mode: postMode,
        invite_carrier_ids: postMode === "invite" ? selectedCarriers : [],
        allow_counter_bids: allowCounterBids,
        advance_payment_percent: advancePaymentPercent,
        notes,
      });
      await response.json();

      toast({
        title: "Load Posted Successfully",
        description: `Load has been priced at ${formatRupees(grossPrice)} and posted to carriers.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/queue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/loads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/carrier/available-loads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      onSuccess?.();
      onOpenChange(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? (error.message.includes(':') ? error.message.split(':').slice(1).join(':').trim() : error.message)
        : "Failed to lock and post load";
      toast({
        title: "Failed to Lock & Post",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLocking(false);
    }
  };

  const toggleCarrier = (carrierId: string) => {
    setSelectedCarriers((prev) =>
      prev.includes(carrierId)
        ? prev.filter((id) => id !== carrierId)
        : [...prev, carrierId]
    );
  };

  if (!load) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[550px] p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-2">
            {isCarrierFinalized ? (
              <Receipt className="h-5 w-5 text-primary" />
            ) : (
              <Calculator className="h-5 w-5 text-primary" />
            )}
            <SheetTitle data-testid="text-drawer-title">
              {isCarrierFinalized ? "Send Invoice to Shipper" : "Price & Post Load"}
            </SheetTitle>
          </div>
          <SheetDescription>
            {isCarrierFinalized 
              ? "Generate and send invoice for the finalized bid"
              : "Set pricing and post to carrier marketplace"
            }
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {/* Load Summary Card */}
            <Card>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Load:</span>
                    <span className="font-mono font-medium" data-testid="text-load-id">
                      {load.loadId || load.id?.slice(0, 8).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    <span>{load.requiredTruckType || "Standard"}</span>
                  </div>
                  <div className="flex items-center gap-2 col-span-2">
                    <MapPin className="h-4 w-4 text-green-500" />
                    <span>{load.pickupCity}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    <MapPin className="h-4 w-4 text-red-500" />
                    <span>{load.dropoffCity}</span>
                  </div>
                  <div className="flex items-center gap-2 col-span-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span>{load.weight} {load.weightUnit || "MT"}</span>
                    {load.cargoDescription && (
                      <>
                        <span className="text-muted-foreground">-</span>
                        <span className="text-muted-foreground truncate">{load.cargoDescription}</span>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* SECTION 1: Invoice Section (for Carrier Finalized loads) */}
            {isCarrierFinalized && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Invoice Details</h3>
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Carrier Finalized
                  </Badge>
                </div>

                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="pt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Shipper:</span>
                      <span className="font-medium">{load.shipperName || "Unknown"}</span>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <IndianRupee className="h-5 w-5 text-primary" />
                        <span className="font-medium">Bid Amount</span>
                      </div>
                      <span className="text-2xl font-bold text-primary" data-testid="text-bid-amount">
                        {formatRupees(bidPrice)}
                      </span>
                    </div>

                    <div className="bg-muted/50 rounded-md p-3 text-sm text-muted-foreground">
                      <p>Invoice will be automatically generated with:</p>
                      <ul className="mt-2 space-y-1 list-disc list-inside">
                        <li>Load details and route information</li>
                        <li>Agreed bid amount: {formatRupees(bidPrice)}</li>
                        <li>Payment terms and due date</li>
                      </ul>
                    </div>

                    <Button 
                      className="w-full" 
                      size="lg"
                      onClick={handleSendInvoice}
                      disabled={isSending || bidPrice <= 0}
                      data-testid="button-send-invoice"
                    >
                      {isSending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Send Invoice to Shipper
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* SECTION 2: Carrier Posting Section (for loads needing pricing) */}
            {!isCarrierFinalized && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Post to Carrier Marketplace</h3>
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    {/* Shipper Requested Price Indicator */}
                    {(load.shipperFixedPrice || load.shipperPricePerTon) && (
                      <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Users className="h-4 w-4 text-amber-600" />
                            <span className="font-medium text-amber-700 dark:text-amber-400">Shipper's Requested Price</span>
                            <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 text-xs">
                              Pre-filled
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              {load.rateType === "per_ton" ? "Per Tonne Rate" : "Fixed Price"}
                            </span>
                            <span className="font-bold text-lg text-amber-700 dark:text-amber-400" data-testid="text-shipper-requested-price">
                              {load.rateType === "per_ton" && load.shipperPricePerTon
                                ? `Rs. ${parseFloat(load.shipperPricePerTon.toString()).toLocaleString("en-IN")}/MT`
                                : load.shipperFixedPrice
                                  ? formatRupees(parseFloat(load.shipperFixedPrice.toString()))
                                  : "-"
                              }
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            The pricing fields below have been pre-filled with the shipper's requested rate. You can adjust as needed.
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    {/* Template Selection */}
                    <div className="space-y-2">
                      <Label>Pricing Template (Optional)</Label>
                      <Select value={selectedTemplate || "none"} onValueChange={(val) => setSelectedTemplate(val === "none" ? "" : val)}>
                        <SelectTrigger data-testid="select-template">
                          <SelectValue placeholder="Select a template..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No template</SelectItem>
                          {templates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Rate Type Selection */}
                    <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
                      <CardContent className="pt-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Scale className="h-4 w-4 text-blue-600" />
                            <span className="font-medium">Pricing Method</span>
                          </div>
                        </div>
                        
                        {/* Rate Type Toggle */}
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            type="button"
                            variant={!usePerTonRate ? "default" : "outline"}
                            className="w-full"
                            onClick={() => {
                              setUsePerTonRate(false);
                              setRatePerTon(0);
                            }}
                            data-testid="button-rate-type-fixed"
                          >
                            <IndianRupee className="h-4 w-4 mr-2" />
                            Fixed Price
                          </Button>
                          <Button
                            type="button"
                            variant={usePerTonRate ? "default" : "outline"}
                            className="w-full"
                            onClick={() => setUsePerTonRate(true)}
                            data-testid="button-rate-type-per-ton"
                          >
                            <Scale className="h-4 w-4 mr-2" />
                            Per Tonne Rate
                          </Button>
                        </div>
                        
                        {/* Per Tonne Rate Calculator - Only shown when usePerTonRate is true */}
                        {usePerTonRate && (
                          <div className="space-y-4 pt-2 border-t">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Tonnage (MT)</Label>
                                <Input
                                  type="number"
                                  value={customTonnage !== null ? customTonnage : loadWeightInTons}
                                  onChange={(e) => {
                                    const newWeight = parseFloat(e.target.value) || 0;
                                    setCustomTonnage(newWeight);
                                  }}
                                  placeholder="Enter tonnage"
                                  className="text-lg font-medium"
                                  data-testid="input-tonnage"
                                />
                                {customTonnage === null && (
                                  <p className="text-xs text-muted-foreground">From load: {loadWeightInTons} MT</p>
                                )}
                              </div>
                              <div className="space-y-2">
                                <Label>Rate Per Tonne (Rs.)</Label>
                                <Input
                                  type="number"
                                  value={ratePerTon || ""}
                                  onChange={(e) => {
                                    const rate = parseInt(e.target.value) || 0;
                                    setRatePerTon(rate);
                                  }}
                                  placeholder="e.g. 2000"
                                  className="text-lg font-medium"
                                  data-testid="input-rate-per-ton"
                                />
                              </div>
                            </div>
                            
                            {ratePerTon > 0 && (
                              <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <Calculator className="h-4 w-4 text-primary" />
                                  <span className="text-sm font-medium">Calculated Total</span>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-muted-foreground">
                                    {weightInTons} MT x Rs. {ratePerTon.toLocaleString("en-IN")}
                                  </p>
                                  <p className="text-xl font-bold text-primary" data-testid="text-calculated-total">
                                    {formatRupees(calculatedFromPerTon)}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Fixed Price Input - Only shown when usePerTonRate is false */}
                        {!usePerTonRate && (
                          <div className="space-y-2 pt-2 border-t">
                            <Label>Enter Fixed Price (Rs.)</Label>
                            <div className="flex items-center gap-2">
                              <IndianRupee className="h-5 w-5 text-muted-foreground" />
                              <Input
                                type="number"
                                value={grossPrice || ""}
                                onChange={(e) => setGrossPrice(parseInt(e.target.value) || 0)}
                                placeholder="e.g. 50000"
                                className="text-lg font-medium"
                                data-testid="input-fixed-price"
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              This is the total amount the shipper will pay
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Separator />

                    {/* Total Price Summary (Shipper pays) */}
                    <Card className="border-green-500">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <IndianRupee className="h-5 w-5" />
                            <span className="font-medium">Total Price</span>
                            <Badge variant="outline" className="text-xs">
                              {usePerTonRate ? "Per Tonne" : "Fixed"}
                            </Badge>
                          </div>
                          {usePerTonRate ? (
                            <span className="text-xl font-bold" data-testid="text-total-price">
                              {formatRupees(grossPrice)}
                            </span>
                          ) : (
                            <Input
                              type="number"
                              value={grossPrice}
                              onChange={(e) => setGrossPrice(parseInt(e.target.value) || 0)}
                              className="w-32 text-right font-bold text-lg"
                              data-testid="input-gross-price"
                            />
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Margin & Final Price */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <BarChart3 className="h-4 w-4" />
                          Margin & Final Price
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Label className="text-sm">Platform Margin</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Slider
                              value={[platformMarginPercent]}
                              onValueChange={([val]) => setPlatformMarginPercent(val)}
                              min={5}
                              max={25}
                              step={1}
                              className="w-24"
                              data-testid="slider-platform-margin"
                            />
                            <span className="text-sm font-medium w-10">{platformMarginPercent}%</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Platform Earnings:</span>
                          <span className="font-medium text-primary">{formatRupees(platformMargin)}</span>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Final Price (Carrier Payout):</span>
                          <span className="font-bold text-lg text-green-600 dark:text-green-400">{formatRupees(finalPrice)}</span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Advance Payment Percentage - Enhanced */}
                    <Card className="border-2 border-green-200 dark:border-green-900">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <IndianRupee className="h-5 w-5 text-green-600" />
                          Carrier Advance Payment
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Quick Select Buttons */}
                        <div className="space-y-2">
                          <Label className="text-sm text-muted-foreground">Quick Select</Label>
                          <div className="flex flex-wrap gap-2">
                            {[0, 50, 75, 90, 100].map((percent) => (
                              <Button
                                key={percent}
                                type="button"
                                variant={advancePaymentPercent === percent ? "default" : "outline"}
                                size="sm"
                                onClick={() => setAdvancePaymentPercent(percent)}
                                data-testid={`button-advance-${percent}`}
                              >
                                {percent === 0 ? "No Advance" : `${percent}%`}
                              </Button>
                            ))}
                          </div>
                        </div>

                        {/* Custom Input */}
                        <div className="flex items-center gap-3">
                          <Label className="text-sm">Custom:</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={advancePaymentPercent}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setAdvancePaymentPercent(Math.min(100, Math.max(0, val)));
                              }}
                              min={0}
                              max={100}
                              className="w-20 text-right"
                              data-testid="input-advance-payment"
                            />
                            <span className="text-sm font-medium">%</span>
                          </div>
                        </div>

                        {/* Payment Breakdown */}
                        <div className="bg-muted/50 rounded-md p-3 space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Advance (Upfront):</span>
                            <span className="font-semibold text-green-600 dark:text-green-400">
                              {formatRupees(Math.round(finalPrice * (advancePaymentPercent / 100)))}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Balance (On Delivery):</span>
                            <span className="font-semibold">
                              {formatRupees(Math.round(finalPrice * ((100 - advancePaymentPercent) / 100)))}
                            </span>
                          </div>
                          <Separator />
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">Total Carrier Payout:</span>
                            <span className="font-bold text-green-600 dark:text-green-400">
                              {formatRupees(finalPrice)}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground">
                          Advance is paid to carrier before pickup. Balance is paid after successful delivery.
                        </p>
                      </CardContent>
                    </Card>

                    <Separator />

                    {/* Posting Options */}
                    <div className="space-y-4">
                      <h4 className="font-medium flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Posting Options
                      </h4>

                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id="post-open"
                            checked={postMode === "open"}
                            onCheckedChange={() => setPostMode("open")}
                            data-testid="checkbox-post-open"
                          />
                          <Label htmlFor="post-open" className="flex-1 cursor-pointer">
                            <span className="font-medium">Open to All Carriers</span>
                            <p className="text-sm text-muted-foreground">
                              All verified carriers can view and bid
                            </p>
                          </Label>
                        </div>

                        <div className="flex items-center gap-3">
                          <Checkbox
                            id="post-invite"
                            checked={postMode === "invite"}
                            onCheckedChange={() => setPostMode("invite")}
                            data-testid="checkbox-post-invite"
                          />
                          <Label htmlFor="post-invite" className="flex-1 cursor-pointer">
                            <span className="font-medium">Invite Specific Carriers</span>
                            <p className="text-sm text-muted-foreground">
                              Only invited carriers can view and bid
                            </p>
                          </Label>
                        </div>

                        {postMode === "invite" && carriers.length > 0 && (
                          <div className="ml-7 space-y-2 max-h-32 overflow-y-auto">
                            {carriers.map((carrier) => (
                              <div key={carrier.id} className="flex items-center gap-2">
                                <Checkbox
                                  id={`carrier-${carrier.id}`}
                                  checked={selectedCarriers.includes(carrier.id)}
                                  onCheckedChange={() => toggleCarrier(carrier.id)}
                                />
                                <Label htmlFor={`carrier-${carrier.id}`} className="text-sm cursor-pointer">
                                  {carrier.name} ({carrier.completedLoads} loads)
                                </Label>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="allow-counter"
                          checked={allowCounterBids}
                          onCheckedChange={(checked) => setAllowCounterBids(checked === true)}
                          data-testid="checkbox-allow-counter"
                        />
                        <Label htmlFor="allow-counter" className="cursor-pointer">
                          Allow carriers to submit counter-offers
                        </Label>
                      </div>
                    </div>

                    {/* Post Button */}
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handleLockAndPost}
                      disabled={isLocking || grossPrice <= 0}
                      data-testid="button-lock-post"
                    >
                      {isLocking ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Price & Post to Carriers
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
