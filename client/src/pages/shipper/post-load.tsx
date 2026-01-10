import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { MapPin, Package, Calendar, Truck, Save, ArrowRight, Sparkles, Info, Clock, CheckCircle2, Send, Building2, ChevronRight, X, Container, Droplet, Check, ChevronsUpDown, Search, AlertCircle, Loader2, FileText } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { AddressAutocomplete, getRouteInfo } from "@/components/address-autocomplete";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";

const loadFormSchema = z.object({
  shipperCompanyName: z.string().min(2, "Company name is required"),
  shipperContactName: z.string().min(2, "Contact name is required"),
  shipperCompanyAddress: z.string().min(5, "Company address is required"),
  shipperPhone: z.string().min(10, "Valid phone number is required"),
  pickupAddress: z.string().min(5, "Pickup address is required"),
  pickupLocality: z.string().optional(),
  pickupLandmark: z.string().optional(),
  pickupCity: z.string().min(2, "Pickup city is required"),
  dropoffAddress: z.string().min(5, "Dropoff address is required"),
  dropoffLocality: z.string().optional(),
  dropoffLandmark: z.string().optional(),
  dropoffBusinessName: z.string().optional(),
  dropoffCity: z.string().min(2, "Dropoff city is required"),
  receiverName: z.string().min(2, "Receiver name is required"),
  receiverPhone: z.string().min(10, "Valid receiver phone number is required"),
  receiverEmail: z.string().email("Valid email is required").optional().or(z.literal("")),
  weight: z.string().min(1, "Weight is required"),
  weightUnit: z.string().default("tons"),
  goodsToBeCarried: z.string().min(2, "Please specify goods to be carried"),
  specialNotes: z.string().optional(),
  rateType: z.enum(["per_ton", "fixed_price"]).default("per_ton"),
  shipperPricePerTon: z.string().optional(),
  shipperFixedPrice: z.string().optional(),
  advancePaymentPercent: z.string().optional(),
  requiredTruckType: z.string().optional(),
  pickupDate: z.string().min(1, "Pickup date is required"),
  deliveryDate: z.string().optional(),
  isTemplate: z.boolean().default(false),
  templateName: z.string().optional(),
  preferredCarriers: z.boolean().default(false),
});

type LoadFormData = z.infer<typeof loadFormSchema>;

import { indianTruckTypes, truckBodyCategories } from "@shared/schema";

// Comprehensive commodity categories for Indian freight logistics
const commodityCategories = [
  {
    category: "Agricultural & Food Products",
    items: [
      { value: "rice", label: "Rice / Paddy" },
      { value: "wheat", label: "Wheat" },
      { value: "pulses", label: "Pulses / Daal" },
      { value: "sugar", label: "Sugar" },
      { value: "jaggery", label: "Jaggery (Gud)" },
      { value: "tea", label: "Tea" },
      { value: "coffee", label: "Coffee" },
      { value: "spices", label: "Spices" },
      { value: "edible_oil", label: "Edible Oil" },
      { value: "fruits", label: "Fresh Fruits" },
      { value: "vegetables", label: "Fresh Vegetables" },
      { value: "onions_potatoes", label: "Onions / Potatoes" },
      { value: "cotton", label: "Cotton" },
      { value: "tobacco", label: "Tobacco" },
      { value: "jute", label: "Jute" },
      { value: "animal_feed", label: "Animal Feed / Fodder" },
      { value: "seeds", label: "Seeds" },
      { value: "fertilizer", label: "Fertilizer" },
      { value: "pesticides", label: "Pesticides / Insecticides" },
    ],
  },
  {
    category: "Construction Materials",
    items: [
      { value: "cement", label: "Cement Bags" },
      { value: "cement_bulk", label: "Cement (Bulk)" },
      { value: "sand", label: "Sand" },
      { value: "gravel", label: "Gravel / Stone Chips" },
      { value: "bricks", label: "Bricks" },
      { value: "tiles", label: "Tiles / Ceramics" },
      { value: "marble", label: "Marble / Granite" },
      { value: "steel_rods", label: "Steel Rods / TMT Bars" },
      { value: "steel_coils", label: "Steel Coils" },
      { value: "steel_plates", label: "Steel Plates / Sheets" },
      { value: "pipes", label: "Pipes (Steel/PVC)" },
      { value: "plywood", label: "Plywood / Timber" },
      { value: "glass", label: "Glass" },
      { value: "paint", label: "Paint / Coatings" },
      { value: "concrete_blocks", label: "Concrete Blocks" },
      { value: "gypsum", label: "Gypsum" },
    ],
  },
  {
    category: "Metals & Minerals",
    items: [
      { value: "iron_ore", label: "Iron Ore" },
      { value: "coal", label: "Coal" },
      { value: "limestone", label: "Limestone" },
      { value: "bauxite", label: "Bauxite" },
      { value: "copper", label: "Copper" },
      { value: "aluminium", label: "Aluminium" },
      { value: "zinc", label: "Zinc" },
      { value: "scrap_metal", label: "Scrap Metal" },
      { value: "manganese", label: "Manganese" },
      { value: "silica_sand", label: "Silica Sand" },
    ],
  },
  {
    category: "Chemicals & Petroleum",
    items: [
      { value: "chemicals_general", label: "Chemicals (General)" },
      { value: "chemicals_industrial", label: "Chemicals (Industrial)" },
      { value: "chemicals_hazardous", label: "Chemicals (Hazardous)" },
      { value: "caustic_soda", label: "Caustic Soda" },
      { value: "chlorine", label: "Chlorine" },
      { value: "calcium_carbonate", label: "Calcium Carbonate" },
      { value: "acids", label: "Acids" },
      { value: "sulphuric_acid", label: "Sulphuric Acid" },
      { value: "hydrochloric_acid", label: "Hydrochloric Acid" },
      { value: "nitric_acid", label: "Nitric Acid" },
      { value: "solvents", label: "Solvents" },
      { value: "resins", label: "Resins / Polymers" },
      { value: "plastics_raw", label: "Plastics (Raw Material)" },
      { value: "rubber", label: "Rubber" },
      { value: "petroleum_products", label: "Petroleum Products" },
      { value: "lng_lpg", label: "LNG / LPG" },
      { value: "bitumen", label: "Bitumen" },
      { value: "lubricants", label: "Lubricants / Oils" },
      { value: "crude_oil", label: "Crude Oil" },
      { value: "diesel", label: "Diesel" },
      { value: "petrol", label: "Petrol / Gasoline" },
      { value: "kerosene", label: "Kerosene" },
      { value: "furnace_oil", label: "Furnace Oil" },
      { value: "naphtha", label: "Naphtha" },
    ],
  },
  {
    category: "Industrial & Manufacturing",
    items: [
      { value: "machinery", label: "Machinery / Equipment" },
      { value: "auto_parts", label: "Auto Parts / Components" },
      { value: "automobiles", label: "Automobiles / Vehicles" },
      { value: "textiles", label: "Textiles / Fabrics" },
      { value: "garments", label: "Garments / Apparel" },
      { value: "yarn", label: "Yarn / Thread" },
      { value: "leather", label: "Leather / Leather Goods" },
      { value: "paper", label: "Paper / Cardboard" },
      { value: "packaging", label: "Packaging Materials" },
      { value: "electrical", label: "Electrical Equipment" },
      { value: "electronics", label: "Electronics" },
      { value: "cables_wires", label: "Cables / Wires" },
      { value: "batteries", label: "Batteries" },
      { value: "solar_panels", label: "Solar Panels" },
    ],
  },
  {
    category: "Consumer Goods",
    items: [
      { value: "fmcg", label: "FMCG Products" },
      { value: "beverages", label: "Beverages" },
      { value: "dairy", label: "Dairy Products" },
      { value: "frozen_foods", label: "Frozen Foods" },
      { value: "packaged_foods", label: "Packaged Foods" },
      { value: "medicines", label: "Medicines / Pharmaceuticals" },
      { value: "cosmetics", label: "Cosmetics / Personal Care" },
      { value: "furniture", label: "Furniture" },
      { value: "appliances", label: "Home Appliances" },
      { value: "household", label: "Household Goods" },
    ],
  },
  {
    category: "Containers & Special Cargo",
    items: [
      { value: "container_20ft", label: "Container (20ft)" },
      { value: "container_40ft", label: "Container (40ft)" },
      { value: "odc_cargo", label: "ODC (Over Dimensional Cargo)" },
      { value: "project_cargo", label: "Project Cargo" },
      { value: "hazardous", label: "Hazardous Materials" },
      { value: "perishables", label: "Perishables (Temperature Controlled)" },
      { value: "livestock", label: "Livestock" },
      { value: "empty_containers", label: "Empty Containers" },
    ],
  },
  {
    category: "Others",
    items: [
      { value: "e_commerce", label: "E-commerce Parcels" },
      { value: "courier", label: "Courier / Packages" },
      { value: "exhibition", label: "Exhibition Materials" },
      { value: "shifting", label: "Household Shifting" },
      { value: "waste", label: "Industrial Waste" },
      { value: "recyclables", label: "Recyclables" },
      { value: "other", label: "Other / Custom" },
    ],
  },
];

// Get commodity label from value
function getCommodityLabel(value: string): string {
  for (const category of commodityCategories) {
    const item = category.items.find(i => i.value === value);
    if (item) return item.label;
  }
  return value;
}

// Flatten all commodities for searching
const allCommodities = commodityCategories.flatMap(cat => 
  cat.items.map(item => ({ ...item, category: cat.category }))
);

// Searchable Commodity Combobox Component with custom input support
function CommodityCombobox({ 
  value, 
  onChange,
  customValue,
  onCustomChange
}: { 
  value?: string; 
  onChange: (value: string) => void;
  customValue?: string;
  onCustomChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  
  const selectedCommodity = value ? allCommodities.find(c => c.value === value) : null;
  const isCustomSelected = value === "other";

  // Get display text for the button
  const getDisplayText = () => {
    if (isCustomSelected && customValue) {
      return customValue;
    }
    if (selectedCommodity) {
      return selectedCommodity.label;
    }
    return null;
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
            data-testid="select-goods-to-be-carried"
          >
            {getDisplayText() ? (
              <span className="truncate">{getDisplayText()}</span>
            ) : (
              <span className="text-muted-foreground">Select commodity type...</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command
            filter={(value, search) => {
              if (value.toLowerCase().startsWith(search.toLowerCase())) return 1;
              return 0;
            }}
          >
            <CommandInput placeholder="Type to search commodities..." />
            <CommandList className="max-h-[400px]">
              <CommandEmpty>No commodity found.</CommandEmpty>
              {commodityCategories.map((category) => (
                <CommandGroup key={category.category} heading={category.category}>
                  {category.items.map((item) => (
                    <CommandItem
                      key={item.value}
                      value={item.label}
                      onSelect={() => {
                        onChange(item.value);
                        if (item.value !== "other") {
                          onCustomChange("");
                        }
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={`mr-2 h-4 w-4 ${
                          value === item.value ? "opacity-100" : "opacity-0"
                        }`}
                      />
                      {item.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {/* Custom commodity input when "Other / Custom" is selected */}
      {isCustomSelected && (
        <Input
          placeholder="Enter your commodity type..."
          value={customValue || ""}
          onChange={(e) => onCustomChange(e.target.value)}
          className="mt-2"
          data-testid="input-custom-commodity"
        />
      )}
    </div>
  );
}

const truckTypesByCategory = truckBodyCategories.reduce((acc, category) => {
  acc[category.id] = indianTruckTypes.filter(t => t.category === category.id);
  return acc;
}, {} as Record<string, typeof indianTruckTypes[number][]>);

function getTruckLabel(value: string): string {
  const truck = indianTruckTypes.find(t => t.value === value);
  return truck?.label || value;
}

function getTruckCategoryInfo(truckValue: string) {
  const truck = indianTruckTypes.find(t => t.value === truckValue);
  if (!truck) return null;
  return truckBodyCategories.find(c => c.id === truck.category);
}

function TruckTypeSelector({ 
  value, 
  onChange, 
  suggestedTruck 
}: { 
  value?: string; 
  onChange: (value: string) => void;
  suggestedTruck?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  const handleTruckSelect = (truckValue: string) => {
    onChange(truckValue);
    setIsOpen(false);
    setSelectedCategory(null);
  };

  const handleBack = () => {
    setSelectedCategory(null);
  };

  const handleClose = () => {
    setIsOpen(false);
    setSelectedCategory(null);
  };

  const selectedTruck = value ? indianTruckTypes.find(t => t.value === value) : null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="w-full justify-between h-9 font-normal"
        onClick={() => setIsOpen(true)}
        data-testid="select-truck-type"
      >
        {selectedTruck ? (
          <span className="flex items-center gap-2 truncate">
            <Truck className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="truncate">{selectedTruck.label}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">Select truck type</span>
        )}
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      </Button>

      <Sheet open={isOpen} onOpenChange={handleClose}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0">
          {!selectedCategory ? (
            <>
              <SheetHeader className="p-4 border-b">
                <SheetTitle>Choose a Body Type</SheetTitle>
                <SheetDescription>What type of truck do you require?</SheetDescription>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-120px)]">
                <div className="p-2">
                  {truckBodyCategories.map((category) => {
                    const trucksInCategory = truckTypesByCategory[category.id] || [];
                    if (trucksInCategory.length === 0) return null;
                    
                    return (
                      <button
                        key={category.id}
                        type="button"
                        className="w-full flex items-center gap-4 p-4 hover-elevate active-elevate-2 rounded-md text-left"
                        onClick={() => handleCategorySelect(category.id)}
                        data-testid={`category-${category.id}`}
                      >
                        <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center shrink-0">
                          {category.id === "container" ? (
                            <Container className="h-6 w-6 text-muted-foreground" />
                          ) : category.id === "tanker" ? (
                            <Droplet className="h-6 w-6 text-muted-foreground" />
                          ) : (
                            <Truck className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{category.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {category.tonnageRange}, {category.description}
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </>
          ) : (
            <>
              <SheetHeader className="p-4 border-b">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleBack}
                    data-testid="button-back-category"
                  >
                    <ArrowRight className="h-4 w-4 rotate-180" />
                  </Button>
                  <div>
                    <SheetTitle>
                      {truckBodyCategories.find(c => c.id === selectedCategory)?.name}
                    </SheetTitle>
                    <SheetDescription>Select a specific truck configuration</SheetDescription>
                  </div>
                </div>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-120px)]">
                <div className="p-2 space-y-1">
                  {truckTypesByCategory[selectedCategory]?.map((truck) => (
                    <button
                      key={truck.value}
                      type="button"
                      className={`w-full flex items-center justify-between gap-3 p-4 rounded-md text-left hover-elevate active-elevate-2 ${
                        value === truck.value ? "bg-primary/10 border border-primary" : ""
                      }`}
                      onClick={() => handleTruckSelect(truck.value)}
                      data-testid={`truck-${truck.value}`}
                    >
                      <div className="flex-1">
                        <div className="font-medium">{truck.label}</div>
                        <div className="text-sm text-muted-foreground">
                          {truck.capacityMin}-{truck.capacityMax} tons
                        </div>
                      </div>
                      {value === truck.value && (
                        <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

const savedTemplates = [
  { id: "t1", name: "Mumbai to Delhi Regular", pickup: "Mumbai, MH", dropoff: "Delhi, DL" },
  { id: "t2", name: "Bangalore Distribution Route", pickup: "Bangalore, KA", dropoff: "Chennai, TN" },
];

function calculateDistance(from: string, to: string): number {
  const routeInfo = getRouteInfo(from, to);
  if (routeInfo) {
    return routeInfo.distance;
  }
  const distances: Record<string, number> = {
    "mumbai, mh_delhi, dl": 1400,
    "bangalore, ka_chennai, tn": 350,
    "mumbai, mh_chennai, tn": 1340,
    "delhi, dl_kolkata, wb": 1500,
  };
  const key = `${from.toLowerCase()}_${to.toLowerCase()}`;
  return distances[key] || Math.floor(Math.random() * 1500) + 200;
}

function suggestTruckType(weight: number, description: string): string {
  const desc = description.toLowerCase();
  if (desc.includes("frozen") || desc.includes("cold") || desc.includes("perishable")) return "container_20ft";
  if (desc.includes("liquid") || desc.includes("oil") || desc.includes("fuel")) return "tanker_oil";
  if (desc.includes("cement") || desc.includes("powder") || desc.includes("bulk")) return "bulker_cement";
  if (desc.includes("sand") || desc.includes("gravel") || desc.includes("stone")) return "dumper_hyva";
  if (desc.includes("machine") || desc.includes("equipment") || desc.includes("vehicle")) return "trailer_40ft";
  if (weight > 35) return "open_18_wheeler";
  if (weight > 25) return "open_14_wheeler";
  if (weight > 15) return "open_10_wheeler";
  if (weight > 7) return "open_20_feet";
  if (weight > 2) return "lcv_17ft";
  if (weight > 1) return "lcv_tata_ace";
  return "mini_pickup";
}

export default function PostLoadPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedLoadId, setSubmittedLoadId] = useState<string | null>(null);
  const [customCommodity, setCustomCommodity] = useState("");
  const [estimation, setEstimation] = useState<{
    distance: number;
    suggestedTruck: string;
    nearbyTrucks: number;
  } | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);

  // Check shipper onboarding status - only verified shippers can post loads
  // Poll every 5 seconds when status is pending/under_review to detect approval in real-time
  const { data: onboardingStatus, isLoading: isLoadingOnboarding } = useQuery<any>({
    queryKey: ["/api/shipper/onboarding"],
    enabled: user?.role === "shipper",
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      // Poll frequently when waiting for approval
      if (status === "pending" || status === "under_review") {
        return 5000; // Poll every 5 seconds
      }
      return false; // Stop polling once approved/rejected
    },
  });

  // Show approval celebration dialog when shipper has been approved
  useEffect(() => {
    if (onboardingStatus?.status === "approved" && user?.id) {
      const seenKey = `approval_seen_${user.id}`;
      const hasSeen = localStorage.getItem(seenKey);
      if (!hasSeen) {
        setShowApprovalDialog(true);
        localStorage.setItem(seenKey, "true");
      }
    }
  }, [onboardingStatus?.status, user?.id]);

  const form = useForm<LoadFormData>({
    resolver: zodResolver(loadFormSchema),
    defaultValues: {
      shipperCompanyName: "",
      shipperContactName: "",
      shipperCompanyAddress: "",
      shipperPhone: "",
      pickupAddress: "",
      pickupLocality: "",
      pickupLandmark: "",
      pickupCity: "",
      dropoffAddress: "",
      dropoffLocality: "",
      dropoffLandmark: "",
      dropoffBusinessName: "",
      dropoffCity: "",
      receiverName: "",
      receiverPhone: "",
      receiverEmail: "",
      weight: "",
      weightUnit: "tons",
      goodsToBeCarried: "",
      specialNotes: "",
      rateType: "per_ton",
      shipperPricePerTon: "",
      shipperFixedPrice: "",
      advancePaymentPercent: "",
      requiredTruckType: "",
      pickupDate: "",
      deliveryDate: "",
      isTemplate: false,
      templateName: "",
      preferredCarriers: false,
    },
  });

  const watchedFields = form.watch(["pickupCity", "dropoffCity", "weight", "goodsToBeCarried", "requiredTruckType"]);
  const [pickupCity, dropoffCity, weight, goodsDescription, truckType] = watchedFields;

  // Auto-populate shipper details from user profile
  useEffect(() => {
    if (user) {
      // Shipper details - auto-populate from user profile (contact person name is left empty)
      if (user.companyName) {
        form.setValue("shipperCompanyName", user.companyName);
      }
      if (user.phone) {
        form.setValue("shipperPhone", user.phone);
      }
      // Company address - use user's address if available
      const userAny = user as any;
      if (userAny.companyAddress) {
        form.setValue("shipperCompanyAddress", userAny.companyAddress);
      }
      // Pickup location - use user's default pickup address if available
      if (userAny.defaultPickupAddress) {
        form.setValue("pickupAddress", userAny.defaultPickupAddress);
      }
      if (userAny.defaultPickupCity) {
        form.setValue("pickupCity", userAny.defaultPickupCity);
      }
      if (userAny.defaultPickupLocality) {
        form.setValue("pickupLocality", userAny.defaultPickupLocality);
      }
      if (userAny.defaultPickupLandmark) {
        form.setValue("pickupLandmark", userAny.defaultPickupLandmark);
      }
    }
  }, [user, form]);

  useEffect(() => {
    if (pickupCity && dropoffCity && weight) {
      const distance = calculateDistance(pickupCity, dropoffCity);
      const suggestedTruck = truckType || suggestTruckType(Number(weight), goodsDescription || "");
      const nearbyTrucks = Math.floor(Math.random() * 15) + 3;
      setEstimation({ distance, suggestedTruck, nearbyTrucks });
    }
  }, [pickupCity, dropoffCity, weight, goodsDescription, truckType]);

  const updateEstimation = () => {
  };

  const applyTemplate = (templateId: string) => {
    const template = savedTemplates.find((t) => t.id === templateId);
    if (template) {
      form.setValue("pickupCity", template.pickup);
      form.setValue("dropoffCity", template.dropoff);
      toast({ title: "Template applied", description: `Loaded "${template.name}" template.` });
    }
  };

  const handleSubmit = async (data: LoadFormData) => {
    setIsLoading(true);
    
    try {
      const truckType = data.requiredTruckType || estimation?.suggestedTruck || "Dry Van";
      
      // Use custom commodity value when "other" is selected
      const finalGoodsDescription = data.goodsToBeCarried === "other" && customCommodity
        ? customCommodity
        : data.goodsToBeCarried || "";
      
      const response = await apiRequest("POST", "/api/loads/submit", {
        shipperCompanyName: data.shipperCompanyName,
        shipperContactName: data.shipperContactName,
        shipperCompanyAddress: data.shipperCompanyAddress,
        shipperPhone: data.shipperPhone,
        pickupAddress: data.pickupAddress,
        pickupLocality: data.pickupLocality || null,
        pickupLandmark: data.pickupLandmark || null,
        pickupCity: data.pickupCity,
        dropoffAddress: data.dropoffAddress,
        dropoffLocality: data.dropoffLocality || null,
        dropoffLandmark: data.dropoffLandmark || null,
        dropoffBusinessName: data.dropoffBusinessName || null,
        dropoffCity: data.dropoffCity,
        receiverName: data.receiverName,
        receiverPhone: data.receiverPhone,
        receiverEmail: data.receiverEmail || null,
        weight: data.weight,
        goodsToBeCarried: finalGoodsDescription,
        specialNotes: data.specialNotes || "",
        rateType: data.rateType,
        shipperPricePerTon: data.rateType === "per_ton" ? data.shipperPricePerTon || null : null,
        shipperFixedPrice: data.rateType === "fixed_price" ? data.shipperFixedPrice || null : null,
        advancePaymentPercent: data.advancePaymentPercent ? parseInt(data.advancePaymentPercent) : null,
        requiredTruckType: truckType,
        pickupDate: data.pickupDate,
        deliveryDate: data.deliveryDate || null,
      });
      
      const result = await response.json();

      setSubmittedLoadId(result.load_id);
      setSubmitted(true);
      
      queryClient.invalidateQueries({ queryKey: ['/api/loads'] });

      toast({ 
        title: "Load Submitted for Review", 
        description: `Your load has been submitted. Our team will evaluate and price it shortly.` 
      });
      
    } catch (error: any) {
      console.error("Submit load error:", error);
      toast({ 
        title: "Error", 
        description: error?.message || "Something went wrong submitting your load.", 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Gate: Only verified shippers can post loads
  if (isLoadingOnboarding) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Check if shipper has not completed onboarding or is not approved
  const isApproved = onboardingStatus?.status === "approved";
  const hasSubmittedOnboarding = !!onboardingStatus;

  if (!isApproved && user?.role === "shipper") {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
            <CardTitle className="text-xl" data-testid="text-onboarding-required">
              {t("postLoad.onboardingRequired")}
            </CardTitle>
            <CardDescription>
              {hasSubmittedOnboarding 
                ? t("postLoad.onboardingPendingDesc", { status: onboardingStatus?.status })
                : t("postLoad.completeOnboardingDesc")
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {hasSubmittedOnboarding ? (
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{t("postLoad.applicationStatus")}</p>
                    <p className="text-sm text-muted-foreground capitalize">{onboardingStatus?.status?.replace(/_/g, " ")}</p>
                  </div>
                </div>
                {onboardingStatus?.decisionNote && (
                  <div className="mt-3 p-3 rounded bg-background border">
                    <p className="text-sm text-muted-foreground">{onboardingStatus.decisionNote}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-700 dark:text-blue-300 text-sm">
                      {t("postLoad.whyOnboarding")}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      {t("postLoad.whyOnboardingDesc")}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              {!hasSubmittedOnboarding && (
                <Button onClick={() => navigate("/shipper/onboarding")} className="w-full" data-testid="button-complete-onboarding">
                  <FileText className="h-4 w-4 mr-2" />
                  {t("postLoad.completeOnboarding")}
                </Button>
              )}
              {onboardingStatus?.status === "draft" && (
                <Button onClick={() => navigate("/shipper/onboarding")} className="w-full" data-testid="button-continue-onboarding">
                  <FileText className="h-4 w-4 mr-2" />
                  {t("postLoad.continueOnboarding")}
                </Button>
              )}
              {(onboardingStatus?.status === "on_hold" || onboardingStatus?.status === "rejected") && (
                <Button onClick={() => navigate("/shipper/onboarding")} className="w-full" data-testid="button-update-onboarding">
                  <FileText className="h-4 w-4 mr-2" />
                  {t("postLoad.updateOnboarding")}
                </Button>
              )}
              <Button variant="outline" onClick={() => navigate("/shipper")} data-testid="button-back-dashboard">
                {t("common.backToDashboard")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-xl" data-testid="text-submission-success">Load Submitted Successfully</CardTitle>
            <CardDescription>
              Your load has been submitted for admin review. You'll be notified once it's posted to carriers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground mb-2">Load ID</p>
              <p className="font-mono font-semibold">{submittedLoadId}</p>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Status Timeline</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Submitted</p>
                    <p className="text-xs text-muted-foreground">Just now</p>
                  </div>
                </div>
                <div className="ml-3 border-l-2 border-dashed border-muted h-4" />
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center shrink-0 animate-pulse">
                    <Clock className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Pending Admin Review</p>
                    <p className="text-xs text-muted-foreground">Our team is evaluating and pricing your load</p>
                  </div>
                </div>
                <div className="ml-3 border-l-2 border-dashed border-muted h-4" />
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Send className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-muted-foreground">Posted to Carriers</p>
                    <p className="text-xs text-muted-foreground">Waiting for admin to post</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-700 dark:text-blue-300 text-sm">What happens next?</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    Our logistics team will review your load details, determine the optimal pricing based on current market conditions, and post it to verified carriers. You'll receive a notification once your load is live.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={() => navigate("/shipper/loads")} className="flex-1" data-testid="button-view-loads">
                View My Loads
              </Button>
              <Button variant="outline" onClick={() => { setSubmitted(false); form.reset(); }} data-testid="button-post-another">
                Post Another Load
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader className="text-center">
            <div className="mx-auto w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <DialogTitle className="text-xl text-center" data-testid="text-approval-title">
              {t("postLoad.approvalCongrats")}
            </DialogTitle>
            <DialogDescription className="text-center">
              {t("postLoad.approvalMessage")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button 
              onClick={() => setShowApprovalDialog(false)} 
              className="w-full"
              data-testid="button-continue-application"
            >
              {t("postLoad.continueToApplication")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mb-6">
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Submit New Load</h1>
        <p className="text-muted-foreground">Fill in the details below. We will evaluate and price your load - you'll be notified when it's posted.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {savedTemplates.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Saved Templates</CardTitle>
                <CardDescription>Quickly fill in details from your saved routes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {savedTemplates.map((template) => (
                    <Button
                      key={template.id}
                      variant="outline"
                      size="sm"
                      onClick={() => applyTemplate(template.id)}
                      data-testid={`button-template-${template.id}`}
                    >
                      {template.name}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-500" />
                    Shipper Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="shipperCompanyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name</FormLabel>
                          <FormControl>
                            <Input placeholder="ABC Logistics Pvt Ltd" {...field} data-testid="input-shipper-company-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="shipperContactName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Person Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Rajesh Kumar" {...field} data-testid="input-shipper-contact-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="shipperCompanyAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Address</FormLabel>
                        <FormControl>
                          <Input placeholder="123 Industrial Area, Sector 5, Mumbai, MH 400001" {...field} data-testid="input-shipper-company-address" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="shipperPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="+91 98765 43210" {...field} data-testid="input-shipper-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-green-500" />
                    Pickup Location
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="pickupAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street Address</FormLabel>
                        <FormControl>
                          <Input placeholder="123 Warehouse Way" {...field} data-testid="input-pickup-address" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="pickupLocality"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Locality / Area</FormLabel>
                          <FormControl>
                            <Input placeholder="Industrial Area, Sector 5" {...field} data-testid="input-pickup-locality" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="pickupLandmark"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Landmark</FormLabel>
                          <FormControl>
                            <Input placeholder="Near ABC Factory" {...field} data-testid="input-pickup-landmark" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="pickupCity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City, State</FormLabel>
                        <FormControl>
                          <AddressAutocomplete
                            value={field.value}
                            onChange={(val) => { field.onChange(val); updateEstimation(); }}
                            placeholder="Mumbai, MH"
                            testId="input-pickup-city"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-red-500" />
                    Dropoff Location
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="dropoffBusinessName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Name</FormLabel>
                        <FormControl>
                          <Input placeholder="ABC Enterprises Pvt. Ltd." {...field} data-testid="input-dropoff-business-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dropoffAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street Address</FormLabel>
                        <FormControl>
                          <Input placeholder="456 Distribution Center" {...field} data-testid="input-dropoff-address" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="dropoffLocality"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Locality / Area</FormLabel>
                          <FormControl>
                            <Input placeholder="Okhla Industrial Area" {...field} data-testid="input-dropoff-locality" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="dropoffLandmark"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Landmark</FormLabel>
                          <FormControl>
                            <Input placeholder="Opposite Metro Station" {...field} data-testid="input-dropoff-landmark" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="dropoffCity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City, State</FormLabel>
                        <FormControl>
                          <AddressAutocomplete
                            value={field.value}
                            onChange={(val) => { field.onChange(val); updateEstimation(); }}
                            placeholder="Delhi, DL"
                            testId="input-dropoff-city"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-purple-500" />
                    Receiver Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="receiverName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Receiver Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} data-testid="input-receiver-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="receiverPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Receiver Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="+91 98765 43210" {...field} data-testid="input-receiver-phone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="receiverEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Receiver Email (Optional)</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="receiver@example.com" {...field} data-testid="input-receiver-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Cargo Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="weight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Weight</FormLabel>
                          <FormControl>
                            <div className="flex gap-2">
                              <Input 
                                type="number" 
                                placeholder="15" 
                                {...field}
                                onBlur={(e) => { field.onBlur(); updateEstimation(); }}
                                data-testid="input-weight" 
                              />
                              <Select
                                defaultValue="tons"
                                onValueChange={(value) => form.setValue("weightUnit", value)}
                              >
                                <SelectTrigger className="w-24">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="tons">tons</SelectItem>
                                  <SelectItem value="kg">kg</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="requiredTruckType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Truck Type</FormLabel>
                          <FormControl>
                            <TruckTypeSelector
                              value={field.value}
                              onChange={(value) => { field.onChange(value); updateEstimation(); }}
                              suggestedTruck={estimation?.suggestedTruck}
                            />
                          </FormControl>
                          {estimation?.suggestedTruck && !field.value && (
                            <FormDescription className="flex items-center gap-1 text-primary">
                              <Sparkles className="h-3 w-3" />
                              Suggested: {getTruckLabel(estimation.suggestedTruck)}
                            </FormDescription>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="goodsToBeCarried"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Goods to be Carried</FormLabel>
                        <CommodityCombobox 
                          value={field.value}
                          onChange={(value) => { field.onChange(value); updateEstimation(); }}
                          customValue={customCommodity}
                          onCustomChange={setCustomCommodity}
                        />
                        <FormDescription className="text-xs">
                          Type to search or select the type of goods you need to transport
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="specialNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Special Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Any special handling requirements, loading/unloading instructions, etc."
                            {...field}
                            data-testid="input-special-notes"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Your Pricing Preference
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="rateType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rate Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-rate-type">
                              <SelectValue placeholder="Select rate type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="per_ton">Per Tonne Rate</SelectItem>
                            <SelectItem value="fixed_price">Fixed Price</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription className="text-xs">
                          Choose whether you want to pay per tonne or a fixed price for the entire load
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className={form.watch("rateType") === "per_ton" ? "" : "hidden"}>
                    <FormField
                      control={form.control}
                      name="shipperPricePerTon"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price per Tonne (Optional)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">Rs.</span>
                              <Input
                                type="number"
                                placeholder="Enter your preferred rate per tonne"
                                className="pl-10"
                                {...field}
                                data-testid="input-price-per-ton"
                              />
                            </div>
                          </FormControl>
                          <FormDescription className="text-xs">
                            This helps our team understand your budget expectations
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className={form.watch("rateType") === "fixed_price" ? "" : "hidden"}>
                    <FormField
                      control={form.control}
                      name="shipperFixedPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fixed Price (Optional)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">Rs.</span>
                              <Input
                                type="number"
                                placeholder="Enter your preferred fixed price"
                                className="pl-10"
                                {...field}
                                data-testid="input-fixed-price"
                              />
                            </div>
                          </FormControl>
                          <FormDescription className="text-xs">
                            Total amount for the entire load
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="advancePaymentPercent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Advance Payment Percentage (Optional)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              placeholder="e.g. 30"
                              {...field}
                              data-testid="input-advance-percent"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">%</span>
                          </div>
                        </FormControl>
                        <FormDescription className="text-xs">
                          Percentage of total price you prefer to pay as advance
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="pickupDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pickup Date</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} data-testid="input-pickup-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="deliveryDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Delivery Date (Optional)</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} data-testid="input-delivery-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button type="submit" className="flex-1" disabled={isLoading} data-testid="button-submit-load">
                  {isLoading ? "Submitting..." : "Submit for Admin Review"}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                <Button type="button" variant="outline" data-testid="button-save-template">
                  <Save className="h-4 w-4 mr-2" />
                  Save as Template
                </Button>
              </div>
            </form>
          </Form>
        </div>

        <div className="space-y-6">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-500" />
                How It Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-300 font-medium mb-2">
                  We handle the pricing for you
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  Our logistics experts will evaluate your load and determine the optimal market rate. You'll be notified once your load is priced and posted to verified carriers.
                </p>
              </div>

              {estimation && (
                <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Estimated Distance</span>
                    <span className="font-semibold">{estimation.distance.toLocaleString()} km</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Suggested Truck</span>
                    <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">
                      {getTruckLabel(estimation.suggestedTruck)}
                    </Badge>
                  </div>
                </div>
              )}

              {estimation && (
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                    <Truck className="h-4 w-4" />
                    <span className="font-medium">{estimation.nearbyTrucks} trucks available</span>
                  </div>
                  <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                    Ready in your region
                  </p>
                </div>
              )}

              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <span>Competitive market-based pricing</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <span>Verified and rated carriers only</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <span>Full tracking and documentation</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
