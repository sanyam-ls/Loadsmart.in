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
  const [finalPrice, setFinalPrice] = useState(0);
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
  
  // Get the bid price for invoice
  const bidPrice = useMemo(() => {
    const price = load?.finalPrice || load?.adminFinalPrice || load?.adminPrice;
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

  // Calculate derived values
  const platformMargin = useMemo(() => {
    return Math.round(finalPrice * (platformMarginPercent / 100));
  }, [finalPrice, platformMarginPercent]);

  const carrierPayout = useMemo(() => {
    return finalPrice - platformMargin;
  }, [finalPrice, platformMargin]);

  const priceDeviation = useMemo(() => {
    if (suggestedPrice === 0) return 0;
    return ((finalPrice - suggestedPrice) / suggestedPrice) * 100;
  }, [finalPrice, suggestedPrice]);

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

  // Fetch suggested price when load changes (only for non-finalized loads)
  useEffect(() => {
    if (open && load?.id && !isCarrierFinalized) {
      fetchSuggestedPrice();
    }
  }, [open, load?.id, isCarrierFinalized]);

  // Update final price when adjustments change (only when not using per-ton rate)
  useEffect(() => {
    if (!usePerTonRate && suggestedPrice > 0) {
      const adjusted = suggestedPrice * (1 + markupPercent / 100) + fixedFee - discountAmount;
      setFinalPrice(Math.round(Math.max(0, adjusted)));
    }
  }, [suggestedPrice, markupPercent, fixedFee, discountAmount, usePerTonRate]);

  // Update final price when per-ton rate changes
  useEffect(() => {
    if (usePerTonRate && ratePerTon > 0) {
      setFinalPrice(calculatedFromPerTon);
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
      setFinalPrice(data.suggested_price);
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
      setFinalPrice(estimated);
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
    if (finalPrice <= 0) {
      return "Final price must be greater than zero.";
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
          description: `Load has been priced at ${formatRupees(finalPrice)} and posted to carriers.`,
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
        final_price: finalPrice,
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
        final_price: finalPrice,
        post_mode: postMode,
        invite_carrier_ids: postMode === "invite" ? selectedCarriers : [],
        allow_counter_bids: allowCounterBids,
        notes,
      });
      await response.json();

      toast({
        title: "Load Posted Successfully",
        description: `Load has been priced at ${formatRupees(finalPrice)} and posted to carriers.`,
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

                    {/* Suggested Price */}
                    <Card className="bg-muted/50">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">AI Suggested Price</span>
                            {confidenceScore > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                {confidenceScore}% confidence
                              </Badge>
                            )}
                          </div>
                          <span className="text-xl font-bold" data-testid="text-suggested-price">
                            {formatRupees(suggestedPrice)}
                          </span>
                        </div>
                        {breakdown && (
                          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                            <span>Base: {formatRupees(breakdown.baseAmount)}</span>
                            <span>Fuel: +{formatRupees(breakdown.fuelSurcharge)}</span>
                            <span>Handling: +{formatRupees(breakdown.handlingFee)}</span>
                            {breakdown.seasonalMultiplier !== 1 && (
                              <span>Season: x{breakdown.seasonalMultiplier.toFixed(2)}</span>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Per-Ton Rate Calculator - Simple Indian Pricing */}
                    <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
                      <CardContent className="pt-4 space-y-4">
                        <div className="flex items-center gap-2">
                          <Scale className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">Per Ton Rate Calculator</span>
                        </div>
                        
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
                            <Label>Rate Per Ton (Rs.)</Label>
                            <Input
                              type="number"
                              value={ratePerTon || ""}
                              onChange={(e) => {
                                const rate = parseInt(e.target.value) || 0;
                                setRatePerTon(rate);
                                setUsePerTonRate(rate > 0);
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
                              <span className="text-sm font-medium">Total Price</span>
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
                      </CardContent>
                    </Card>

                    {/* Adjustments */}
                    {!usePerTonRate && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Markup Percentage</Label>
                          <span className="text-sm font-medium">{markupPercent}%</span>
                        </div>
                        <Slider
                          value={[markupPercent]}
                          onValueChange={([val]) => setMarkupPercent(val)}
                          min={-20}
                          max={30}
                          step={1}
                          data-testid="slider-markup"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Fixed Fee (Rs.)</Label>
                          <Input
                            type="number"
                            value={fixedFee}
                            onChange={(e) => setFixedFee(parseInt(e.target.value) || 0)}
                            data-testid="input-fixed-fee"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Discount (Rs.)</Label>
                          <Input
                            type="number"
                            value={discountAmount}
                            onChange={(e) => setDiscountAmount(parseInt(e.target.value) || 0)}
                            data-testid="input-discount"
                          />
                        </div>
                      </div>
                    </div>
                    )}

                    <Separator />

                    {/* Final Price */}
                    <Card className={requiresApproval ? "border-amber-500" : "border-green-500"}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <IndianRupee className="h-5 w-5" />
                            <span className="font-medium">Final Price</span>
                          </div>
                          <Input
                            type="number"
                            value={finalPrice}
                            onChange={(e) => setFinalPrice(parseInt(e.target.value) || 0)}
                            className="w-32 text-right font-bold text-lg"
                            data-testid="input-final-price"
                          />
                        </div>

                        {priceDeviation !== 0 && (
                          <div className="flex items-center gap-2 text-sm">
                            {priceDeviation > 0 ? (
                              <TrendingUp className="h-4 w-4 text-green-500" />
                            ) : (
                              <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />
                            )}
                            <span className={priceDeviation > 0 ? "text-green-600" : "text-red-600"}>
                              {priceDeviation > 0 ? "+" : ""}
                              {priceDeviation.toFixed(1)}% from suggested
                            </span>
                            {requiresApproval && (
                              <Badge variant="outline" className="text-amber-600 border-amber-500">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Needs Approval
                              </Badge>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Margin Preview */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <BarChart3 className="h-4 w-4" />
                          Margin Preview
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
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Carrier Payout:</span>
                          <span className="font-medium">{formatRupees(carrierPayout)}</span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Advance Payment Percentage */}
                    <Card>
                      <CardContent className="pt-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <IndianRupee className="h-4 w-4 text-green-600" />
                            <Label className="text-sm font-medium">Advance Payment</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Slider
                              value={[advancePaymentPercent]}
                              onValueChange={([val]) => setAdvancePaymentPercent(val)}
                              min={0}
                              max={100}
                              step={5}
                              className="w-24"
                              data-testid="slider-advance-payment"
                            />
                            <span className="text-sm font-medium w-10">{advancePaymentPercent}%</span>
                          </div>
                        </div>
                        {advancePaymentPercent > 0 && (
                          <div className="flex items-center justify-between text-sm bg-green-50 dark:bg-green-950/30 p-2 rounded-md">
                            <span className="text-muted-foreground">Advance Amount:</span>
                            <span className="font-semibold text-green-600 dark:text-green-400">
                              {formatRupees(Math.round(finalPrice * (advancePaymentPercent / 100)))}
                            </span>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Percentage of final price to be paid as advance before pickup
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
                      disabled={isLocking || finalPrice <= 0}
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
