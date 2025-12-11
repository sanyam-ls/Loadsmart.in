import { useState, useEffect, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import {
  Calculator,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Info,
  DollarSign,
  Truck,
  MapPin,
  Package,
  Clock,
  Users,
  Lock,
  Send,
  History,
  Sparkles,
  IndianRupee,
  Percent,
  ChevronRight,
  Loader2,
  Shield,
  BarChart3,
} from "lucide-react";

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
  status?: string;
  cargoDescription?: string;
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
  const [activeTab, setActiveTab] = useState("builder");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLocking, setIsLocking] = useState(false);

  // Pricing state
  const [suggestedPrice, setSuggestedPrice] = useState(0);
  const [finalPrice, setFinalPrice] = useState(0);
  const [markupPercent, setMarkupPercent] = useState(0);
  const [fixedFee, setFixedFee] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [platformMarginPercent, setPlatformMarginPercent] = useState(10);
  const [notes, setNotes] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  // Posting options
  const [postMode, setPostMode] = useState<"open" | "invite" | "assign">("open");
  const [selectedCarriers, setSelectedCarriers] = useState<string[]>([]);
  const [allowCounterBids, setAllowCounterBids] = useState(true);

  // Pricing intelligence data
  const [breakdown, setBreakdown] = useState<PricingSuggestion["breakdown"] | null>(null);
  const [params, setParams] = useState<PricingSuggestion["params"] | null>(null);
  const [confidenceScore, setConfidenceScore] = useState(0);
  const [comparableLoads, setComparableLoads] = useState<PricingSuggestion["comparable_loads"]>([]);
  const [riskFlags, setRiskFlags] = useState<string[]>([]);
  const [pricingId, setPricingId] = useState<string | null>(null);

  // Fetch templates
  const { data: templates = [] } = useQuery<PricingTemplate[]>({
    queryKey: ["/api/admin/pricing/templates"],
    enabled: open,
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

  // Fetch suggested price when load changes
  useEffect(() => {
    if (open && load?.id) {
      fetchSuggestedPrice();
    }
  }, [open, load?.id]);

  // Update final price when adjustments change
  useEffect(() => {
    if (suggestedPrice > 0) {
      const adjusted = suggestedPrice * (1 + markupPercent / 100) + fixedFee - discountAmount;
      setFinalPrice(Math.round(Math.max(0, adjusted)));
    }
  }, [suggestedPrice, markupPercent, fixedFee, discountAmount]);

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
      });
      const data: PricingSuggestion = await response.json();

      setSuggestedPrice(data.suggested_price);
      setFinalPrice(data.suggested_price);
      setBreakdown(data.breakdown);
      setParams(data.params);
      setConfidenceScore(data.confidence_score);
      setComparableLoads(data.comparable_loads);
      setRiskFlags(data.risk_flags);
      setPlatformMarginPercent(data.platform_rate_percent);
    } catch (error) {
      console.error("Failed to fetch suggested price:", error);
      // Fallback calculation
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

  const handleSaveDraft = async () => {
    if (!load?.id) return;
    setIsSaving(true);
    try {
      const response = await apiRequest("POST", "/api/admin/pricing/save", {
        load_id: load.id,
        suggested_price: suggestedPrice,
        final_price: finalPrice,
        markup_percent: markupPercent,
        fixed_fee: fixedFee,
        discount_amount: discountAmount,
        platform_margin_percent: platformMarginPercent,
        notes,
        template_id: selectedTemplate || null,
      });
      const data = await response.json();
      setPricingId(data.pricing?.id);

      toast({
        title: "Draft Saved",
        description: "Pricing draft has been saved. You can continue editing.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save draft",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLockAndPost = async () => {
    if (!load?.id) return;

    // Save first if no pricing ID
    if (!pricingId) {
      await handleSaveDraft();
    }

    setIsLocking(true);
    try {
      // Create pricing if not exists
      const saveResponse = await apiRequest("POST", "/api/admin/pricing/save", {
        load_id: load.id,
        suggested_price: suggestedPrice,
        final_price: finalPrice,
        markup_percent: markupPercent,
        fixed_fee: fixedFee,
        discount_amount: discountAmount,
        platform_margin_percent: platformMarginPercent,
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
      const data = await response.json();

      if (data.requires_approval) {
        toast({
          title: "Approval Required",
          description: `Price deviates ${data.deviation_percent.toFixed(1)}% from suggested. Sent for admin approval.`,
        });
      } else {
        toast({
          title: "Load Posted Successfully",
          description: `Load has been priced at ${formatRupees(finalPrice)} and posted to carriers.`,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/queue"] });
        queryClient.invalidateQueries({ queryKey: ["/api/loads"] });
        onSuccess?.();
        onOpenChange(false);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to lock and post load",
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
      <SheetContent className="w-full sm:max-w-[600px] p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            <SheetTitle data-testid="text-drawer-title">Price & Post Load</SheetTitle>
          </div>
          <SheetDescription>
            Set final pricing and post to carriers
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {/* Load Summary */}
            <Card>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Load:</span>
                    <span className="font-mono font-medium" data-testid="text-load-id">
                      {load.loadId || load.id?.slice(0, 8)}
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
                  {params && (
                    <div className="flex items-center gap-2 col-span-2 text-muted-foreground">
                      <span>{params.distanceKm} km</span>
                      <span className="mx-1">|</span>
                      <span>{params.weightTons} tons</span>
                      <span className="mx-1">|</span>
                      <Badge variant="outline" className="text-xs">
                        {params.region} region
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="builder" data-testid="tab-builder">
                  <Calculator className="h-4 w-4 mr-1" />
                  Builder
                </TabsTrigger>
                <TabsTrigger value="intelligence" data-testid="tab-intelligence">
                  <Sparkles className="h-4 w-4 mr-1" />
                  Intel
                </TabsTrigger>
                <TabsTrigger value="post" data-testid="tab-post">
                  <Send className="h-4 w-4 mr-1" />
                  Post
                </TabsTrigger>
              </TabsList>

              {/* Price Builder Tab */}
              <TabsContent value="builder" className="space-y-4 mt-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    {/* Template Selection */}
                    <div className="space-y-2">
                      <Label>Pricing Template (Optional)</Label>
                      <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                        <SelectTrigger data-testid="select-template">
                          <SelectValue placeholder="Select a template..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">No template</SelectItem>
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

                    {/* Adjustments */}
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
                            <Label>Platform Rate</Label>
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="h-3 w-3 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                Percentage of final price retained as platform fee
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <div className="flex items-center gap-2">
                            <Slider
                              value={[platformMarginPercent]}
                              onValueChange={([val]) => setPlatformMarginPercent(val)}
                              min={5}
                              max={20}
                              step={0.5}
                              className="w-24"
                              data-testid="slider-platform-rate"
                            />
                            <span className="text-sm font-medium w-12 text-right">
                              {platformMarginPercent}%
                            </span>
                          </div>
                        </div>

                        <Separator />

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Carrier Payout</span>
                            <p className="text-lg font-bold text-green-600" data-testid="text-carrier-payout">
                              {formatRupees(carrierPayout)}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Platform Margin</span>
                            <p className="text-lg font-bold text-primary" data-testid="text-platform-margin">
                              {formatRupees(platformMargin)}
                            </p>
                          </div>
                        </div>

                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${platformMarginPercent}%` }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </TabsContent>

              {/* Intelligence Tab */}
              <TabsContent value="intelligence" className="space-y-4 mt-4">
                {/* Risk Flags */}
                {riskFlags.length > 0 && (
                  <Card className="border-amber-500">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2 text-amber-600">
                        <AlertTriangle className="h-4 w-4" />
                        Risk Flags ({riskFlags.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {riskFlags.map((flag, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm">
                            <Shield className="h-3 w-3 text-amber-500" />
                            {flag}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {riskFlags.length === 0 && (
                  <Card className="border-green-500">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="font-medium">No risk flags detected</span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Comparable Loads */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <History className="h-4 w-4" />
                      Comparable Loads
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {comparableLoads.length > 0 ? (
                      <ul className="space-y-2">
                        {comparableLoads.map((comp) => (
                          <li
                            key={comp.id}
                            className="flex items-center justify-between text-sm p-2 rounded bg-muted/50"
                          >
                            <div>
                              <p className="font-medium">{comp.route}</p>
                              <p className="text-xs text-muted-foreground">
                                {comp.distance} km
                              </p>
                            </div>
                            <span className="font-mono">
                              {formatRupees(parseInt(comp.finalPrice || "0"))}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No comparable loads found in last 90 days
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Pricing Parameters */}
                {params && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Calculator className="h-4 w-4" />
                        Calculation Parameters
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Distance:</span>
                          <span>{params.distanceKm} km</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Weight:</span>
                          <span>{params.weightTons} tons</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Base Rate:</span>
                          <span>Rs. {params.baseRatePerKm}/km</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Region:</span>
                          <span className="capitalize">{params.region}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Post Options Tab */}
              <TabsContent value="post" className="space-y-4 mt-4">
                {/* Post Mode */}
                <div className="space-y-3">
                  <Label>Posting Mode</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant={postMode === "open" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPostMode("open")}
                      className="flex flex-col h-auto py-3"
                      data-testid="button-mode-open"
                    >
                      <Users className="h-4 w-4 mb-1" />
                      <span className="text-xs">Open Market</span>
                    </Button>
                    <Button
                      variant={postMode === "invite" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPostMode("invite")}
                      className="flex flex-col h-auto py-3"
                      data-testid="button-mode-invite"
                    >
                      <Send className="h-4 w-4 mb-1" />
                      <span className="text-xs">Invite Only</span>
                    </Button>
                    <Button
                      variant={postMode === "assign" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPostMode("assign")}
                      className="flex flex-col h-auto py-3"
                      data-testid="button-mode-assign"
                    >
                      <Lock className="h-4 w-4 mb-1" />
                      <span className="text-xs">Direct Assign</span>
                    </Button>
                  </div>
                </div>

                {/* Carrier Selection for Invite/Assign mode */}
                {(postMode === "invite" || postMode === "assign") && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">
                        {postMode === "invite" ? "Select Carriers to Invite" : "Assign to Carrier"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-48">
                        <div className="space-y-2">
                          {carriers.map((carrier) => (
                            <div
                              key={carrier.id}
                              className={`p-3 rounded border cursor-pointer transition-colors ${
                                (postMode === "invite" && selectedCarriers.includes(carrier.id)) ||
                                (postMode === "assign" && selectedCarriers[0] === carrier.id)
                                  ? "border-primary bg-primary/5"
                                  : "hover:bg-muted/50"
                              }`}
                              onClick={() => {
                                if (postMode === "assign") {
                                  setSelectedCarriers([carrier.id]);
                                } else {
                                  toggleCarrier(carrier.id);
                                }
                              }}
                              data-testid={`carrier-option-${carrier.id}`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">{carrier.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {carrier.trucks} trucks | {carrier.zone} | {carrier.completedLoads} loads
                                  </p>
                                </div>
                                <Badge variant="secondary">{carrier.rating}</Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                      {postMode === "invite" && selectedCarriers.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {selectedCarriers.length} carrier(s) selected
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Allow Counter Bids */}
                {postMode !== "assign" && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="allowCounterBids"
                      checked={allowCounterBids}
                      onCheckedChange={(checked) => setAllowCounterBids(checked as boolean)}
                      data-testid="checkbox-counter-bids"
                    />
                    <Label htmlFor="allowCounterBids" className="text-sm cursor-pointer">
                      Allow carriers to submit counter-bids
                    </Label>
                  </div>
                )}

                {/* Notes */}
                <div className="space-y-2">
                  <Label>Internal Notes</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any notes about this pricing decision..."
                    rows={3}
                    data-testid="textarea-notes"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>

        <SheetFooter className="px-6 py-4 border-t gap-2">
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={isSaving || isLocking}
            data-testid="button-save-draft"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <History className="h-4 w-4 mr-2" />
            )}
            Save Draft
          </Button>
          <Button
            onClick={handleLockAndPost}
            disabled={isLocking || isSaving || finalPrice <= 0}
            data-testid="button-lock-post"
          >
            {isLocking ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Lock className="h-4 w-4 mr-2" />
            )}
            {requiresApproval ? "Submit for Approval" : "Lock & Post"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
