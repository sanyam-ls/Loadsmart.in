import { useState, useEffect, useMemo, useRef } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Package, Calendar, Truck, ArrowRight, Sparkles, Info, Clock, CheckCircle2, Send, Building2, ChevronRight, Container, Droplet, Check, ChevronsUpDown, Loader2, Phone, DollarSign, Users, ClipboardList, User, X, Search } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import { indianTruckTypes, truckBodyCategories } from "@shared/schema";
import { indianStates } from "@shared/indian-locations";

// Admin load form schema - includes admin pricing fields
const adminLoadFormSchema = z.object({
  shipperCompanyName: z.string().min(2, "Company name is required"),
  shipperContactName: z.string().min(2, "Contact name is required"),
  shipperCompanyAddress: z.string().min(5, "Company address is required"),
  shipperPhone: z.string().min(10, "Valid phone number is required"),
  pickupAddress: z.string().min(5, "Pickup address is required"),
  pickupLocality: z.string().optional(),
  pickupLandmark: z.string().optional(),
  pickupBusinessName: z.string().min(2, "Business name is required"),
  pickupState: z.string().min(1, "Pickup state is required"),
  pickupCity: z.string().min(2, "Pickup city is required"),
  pickupCityCustom: z.string().optional(),
  pickupPincode: z.string().optional(),
  dropoffAddress: z.string().min(5, "Dropoff address is required"),
  dropoffLocality: z.string().optional(),
  dropoffLandmark: z.string().optional(),
  dropoffBusinessName: z.string().optional(),
  dropoffState: z.string().min(1, "Dropoff state is required"),
  dropoffCity: z.string().min(2, "Dropoff city is required"),
  dropoffCityCustom: z.string().optional(),
  dropoffPincode: z.string().optional(),
  receiverName: z.string().min(2, "Receiver name is required"),
  receiverPhone: z.string().min(10, "Valid receiver phone number is required"),
  receiverEmail: z.string().email("Valid email is required").optional().or(z.literal("")),
  weight: z.string().min(1, "Weight is required"),
  weightUnit: z.string().default("tons"),
  goodsToBeCarried: z.string().min(2, "Please specify goods to be carried"),
  specialNotes: z.string().optional(),
  rateType: z.enum(["per_ton", "fixed_price"]).default("fixed_price"),
  shipperPricePerTon: z.string().optional(),
  shipperFixedPrice: z.string().optional(),
  advancePaymentPercent: z.string().optional(),
  requiredTruckType: z.string().optional(),
  pickupDate: z.string().min(1, "Pickup date is required"),
  deliveryDate: z.string().optional(),
  // Admin pricing fields
  postImmediately: z.boolean().default(false),
  adminGrossPrice: z.string().optional(),
  platformMargin: z.string().optional(),
  carrierAdvancePercent: z.string().optional(),
}).refine((data) => {
  if (data.rateType === "per_ton") {
    return data.shipperPricePerTon && data.shipperPricePerTon.trim() !== "";
  }
  return true;
}, {
  message: "Price per tonne is required",
  path: ["shipperPricePerTon"],
}).refine((data) => {
  if (data.rateType === "fixed_price") {
    return data.shipperFixedPrice && data.shipperFixedPrice.trim() !== "";
  }
  return true;
}, {
  message: "Fixed price is required",
  path: ["shipperFixedPrice"],
}).refine((data) => {
  if (data.pickupCity === "__other__") {
    return data.pickupCityCustom && data.pickupCityCustom.trim() !== "";
  }
  return true;
}, {
  message: "Please enter the city name",
  path: ["pickupCityCustom"],
}).refine((data) => {
  if (data.dropoffCity === "__other__") {
    return data.dropoffCityCustom && data.dropoffCityCustom.trim() !== "";
  }
  return true;
}, {
  message: "Please enter the city name",
  path: ["dropoffCityCustom"],
});

type AdminLoadFormData = z.infer<typeof adminLoadFormSchema>;

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
      { value: "petroleum_products", label: "Petroleum Products" },
      { value: "lubricants", label: "Lubricants / Oils" },
      { value: "plastics_raw", label: "Plastics (Raw Material)" },
      { value: "rubber", label: "Rubber" },
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
      { value: "perishables", label: "Perishables (Temperature Controlled)" },
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
      { value: "other", label: "Other / Custom" },
    ],
  },
];

// Flatten all commodities for searching
const allCommodities = commodityCategories.flatMap(cat => 
  cat.items.map(item => ({ ...item, category: cat.category }))
);

// Searchable Commodity Combobox Component
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
            data-testid="admin-select-goods-to-be-carried"
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
      
      {isCustomSelected && (
        <Input
          placeholder="Enter your commodity type..."
          value={customValue || ""}
          onChange={(e) => onCustomChange(e.target.value)}
          className="mt-2"
          data-testid="admin-input-custom-commodity"
        />
      )}
    </div>
  );
}

const truckTypesByCategory = truckBodyCategories.reduce((acc, category) => {
  acc[category.id] = indianTruckTypes.filter(t => t.category === category.id);
  return acc;
}, {} as Record<string, typeof indianTruckTypes[number][]>);

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
        data-testid="admin-select-truck-type"
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
                <SheetDescription>What type of truck is required?</SheetDescription>
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
                        data-testid={`admin-category-${category.id}`}
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
                    data-testid="admin-button-back-category"
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
                      data-testid={`admin-truck-${truck.value}`}
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

export default function AdminPostLoadPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedLoadId, setSubmittedLoadId] = useState<string | null>(null);
  const [submittedLoadNumber, setSubmittedLoadNumber] = useState<number | null>(null);
  const [submittedLoadDetails, setSubmittedLoadDetails] = useState<{
    pickupCity: string;
    pickupState: string;
    dropoffCity: string;
    dropoffState: string;
    weight: string;
    goods: string;
    truckType: string;
    pickupDate: string;
    specialNotes: string;
    rateType: string;
    pricePerTon: string;
    fixedPrice: string;
    postImmediately: boolean;
  } | null>(null);
  const [customCommodity, setCustomCommodity] = useState("");
  const [estimation, setEstimation] = useState<{
    distance: number;
    suggestedTruck: string;
    nearbyTrucks: number;
  } | null>(null);
  const [selectedShipperId, setSelectedShipperId] = useState<string | null>(null);
  const [shipperSearchOpen, setShipperSearchOpen] = useState(false);
  const [shipperSearchQuery, setShipperSearchQuery] = useState("");

  // Type for shipper from API
  type ShipperOption = {
    id: string;
    username: string;
    email: string;
    companyName: string | null;
    companyAddress: string | null;
    phone: string | null;
    isVerified: boolean | null;
  };

  // Fetch all shippers for the dropdown
  const { data: allShippers = [], isLoading: shippersLoading } = useQuery<ShipperOption[]>({
    queryKey: ['/api/admin/shippers/verified'],
  });

  // Filter shippers based on search query
  const filteredShippers = allShippers.filter((shipper) => {
    if (!shipperSearchQuery.trim()) return true;
    const searchLower = shipperSearchQuery.toLowerCase();
    return (
      (shipper.companyName?.toLowerCase().includes(searchLower)) ||
      (shipper.username?.toLowerCase().includes(searchLower)) ||
      (shipper.email?.toLowerCase().includes(searchLower)) ||
      (shipper.phone?.toLowerCase().includes(searchLower))
    );
  });

  // Click outside to close shipper dropdown
  const shipperDropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shipperDropdownRef.current && !shipperDropdownRef.current.contains(event.target as Node)) {
        setShipperSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const form = useForm<AdminLoadFormData>({
    resolver: zodResolver(adminLoadFormSchema),
    defaultValues: {
      shipperCompanyName: "",
      shipperContactName: "",
      shipperCompanyAddress: "",
      shipperPhone: "",
      pickupAddress: "",
      pickupLocality: "",
      pickupLandmark: "",
      pickupBusinessName: "",
      pickupState: "",
      pickupCity: "",
      pickupCityCustom: "",
      pickupPincode: "",
      dropoffAddress: "",
      dropoffLocality: "",
      dropoffLandmark: "",
      dropoffBusinessName: "",
      dropoffState: "",
      dropoffCity: "",
      dropoffCityCustom: "",
      dropoffPincode: "",
      receiverName: "",
      receiverPhone: "",
      receiverEmail: "",
      weight: "",
      weightUnit: "tons",
      goodsToBeCarried: "",
      specialNotes: "",
      rateType: "fixed_price",
      shipperPricePerTon: "",
      shipperFixedPrice: "",
      advancePaymentPercent: "",
      requiredTruckType: "",
      pickupDate: "",
      deliveryDate: "",
      postImmediately: false,
      adminGrossPrice: "",
      platformMargin: "10",
      carrierAdvancePercent: "30",
    },
  });

  const watchedFields = form.watch(["pickupState", "pickupCity", "dropoffState", "dropoffCity", "weight", "weightUnit", "goodsToBeCarried", "requiredTruckType"]);
  const [pickupState, pickupCity, dropoffState, dropoffCity, weight, weightUnit, goodsDescription, truckType] = watchedFields;
  
  // Get cities for selected states
  const pickupCities = useMemo(() => {
    if (!pickupState) return [];
    const state = indianStates.find(s => s.code === pickupState);
    return state?.cities || [];
  }, [pickupState]);
  
  const dropoffCities = useMemo(() => {
    if (!dropoffState) return [];
    const state = indianStates.find(s => s.code === dropoffState);
    return state?.cities || [];
  }, [dropoffState]);

  // Show truck suggestion when weight is entered
  useEffect(() => {
    if (!weight) {
      setEstimation(null);
      return;
    }
    
    const weightInTons = weightUnit === "kg" ? Number(weight) / 1000 : Number(weight);
    const localSuggestion = suggestTruckType(weightInTons, goodsDescription || "");
    const nearbyTrucks = Math.floor(Math.random() * 15) + 3;
    
    setEstimation(prev => ({ 
      distance: prev?.distance || 0, 
      suggestedTruck: localSuggestion, 
      nearbyTrucks 
    }));
  }, [weight, weightUnit, goodsDescription]);

  const handleSubmit = async (data: AdminLoadFormData) => {
    setIsLoading(true);
    
    try {
      const truckType = data.requiredTruckType || estimation?.suggestedTruck || "Dry Van";
      
      const finalGoodsDescription = data.goodsToBeCarried === "other" && customCommodity
        ? customCommodity
        : data.goodsToBeCarried || "";
      
      const finalPickupCity = data.pickupCity === "__other__" && data.pickupCityCustom
        ? data.pickupCityCustom
        : data.pickupCity;
      const finalDropoffCity = data.dropoffCity === "__other__" && data.dropoffCityCustom
        ? data.dropoffCityCustom
        : data.dropoffCity;
      
      // Submit load via admin endpoint
      const response = await apiRequest("POST", "/api/admin/loads/create", {
        existingShipperId: selectedShipperId,
        shipperCompanyName: data.shipperCompanyName,
        shipperContactName: data.shipperContactName,
        shipperCompanyAddress: data.shipperCompanyAddress,
        shipperPhone: data.shipperPhone,
        pickupAddress: data.pickupAddress,
        pickupLocality: data.pickupLocality || null,
        pickupLandmark: data.pickupLandmark || null,
        pickupBusinessName: data.pickupBusinessName || null,
        pickupCity: finalPickupCity,
        pickupState: data.pickupState,
        dropoffAddress: data.dropoffAddress,
        dropoffLocality: data.dropoffLocality || null,
        dropoffLandmark: data.dropoffLandmark || null,
        dropoffBusinessName: data.dropoffBusinessName || null,
        dropoffCity: finalDropoffCity,
        dropoffState: data.dropoffState,
        receiverName: data.receiverName,
        receiverPhone: data.receiverPhone,
        receiverEmail: data.receiverEmail || null,
        weight: data.weight,
        goodsToBeCarried: finalGoodsDescription,
        specialNotes: data.specialNotes || "",
        rateType: data.rateType,
        shipperPricePerTon: data.rateType === "per_ton" ? (data.shipperPricePerTon?.replace(/,/g, '') || null) : null,
        shipperFixedPrice: data.rateType === "fixed_price" ? (data.shipperFixedPrice?.replace(/,/g, '') || null) : null,
        advancePaymentPercent: data.advancePaymentPercent ? parseInt(data.advancePaymentPercent) : null,
        requiredTruckType: truckType,
        pickupDate: data.pickupDate,
        deliveryDate: data.deliveryDate || null,
        // Admin-specific fields
        postImmediately: data.postImmediately,
        adminGrossPrice: data.adminGrossPrice ? data.adminGrossPrice.replace(/,/g, '') : null,
        platformMargin: data.platformMargin || null,
        carrierAdvancePercent: data.carrierAdvancePercent || null,
      });
      
      const result = await response.json();

      setSubmittedLoadId(result.load_id);
      setSubmittedLoadNumber(result.load_number);
      const pickupStateName = indianStates.find(s => s.code === data.pickupState)?.name || data.pickupState;
      const dropoffStateName = indianStates.find(s => s.code === data.dropoffState)?.name || data.dropoffState;
      setSubmittedLoadDetails({
        pickupCity: finalPickupCity,
        pickupState: pickupStateName,
        dropoffCity: finalDropoffCity,
        dropoffState: dropoffStateName,
        weight: data.weight,
        goods: finalGoodsDescription,
        truckType: truckType || '',
        pickupDate: data.pickupDate,
        specialNotes: data.specialNotes || '',
        rateType: data.rateType,
        pricePerTon: data.shipperPricePerTon || '',
        fixedPrice: data.shipperFixedPrice || '',
        postImmediately: data.postImmediately,
      });
      setSubmitted(true);
      
      // Invalidate all load-related queries
      queryClient.invalidateQueries({ queryKey: ['/api/loads'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/loads'] });

      toast({ 
        title: data.postImmediately ? "Load Posted to Carriers" : "Load Created Successfully", 
        description: data.postImmediately 
          ? `Load LD-${String(result.load_number).padStart(3, '0')} has been posted to the marketplace.`
          : `Load LD-${String(result.load_number).padStart(3, '0')} has been added to the pricing queue.`
      });
      
    } catch (error: any) {
      console.error("Submit load error:", error);
      toast({ 
        title: "Error", 
        description: error?.message || "Something went wrong creating the load.", 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-xl" data-testid="text-admin-submission-success">
              Load Created Successfully
            </CardTitle>
            <CardDescription>
              {submittedLoadDetails?.postImmediately 
                ? "The load has been posted to carriers and is now live on the marketplace."
                : "The load has been added to the pricing queue. You can price and post it from the Load Queue."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground mb-2">Load Number</p>
              <p className="font-mono font-semibold text-lg">LD-{String(submittedLoadNumber).padStart(3, '0')}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">From</p>
                <p className="font-medium">{submittedLoadDetails?.pickupCity}, {submittedLoadDetails?.pickupState}</p>
              </div>
              <div>
                <p className="text-muted-foreground">To</p>
                <p className="font-medium">{submittedLoadDetails?.dropoffCity}, {submittedLoadDetails?.dropoffState}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Weight</p>
                <p className="font-medium">{submittedLoadDetails?.weight} Tons</p>
              </div>
              <div>
                <p className="text-muted-foreground">Cargo</p>
                <p className="font-medium">{submittedLoadDetails?.goods}</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Status</h3>
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${submittedLoadDetails?.postImmediately ? 'bg-green-500' : 'bg-amber-500'}`}>
                  {submittedLoadDetails?.postImmediately ? (
                    <Send className="h-4 w-4 text-white" />
                  ) : (
                    <Clock className="h-4 w-4 text-white" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-sm">
                    {submittedLoadDetails?.postImmediately ? "Posted to Carriers" : "Pending Pricing"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {submittedLoadDetails?.postImmediately 
                      ? "Carriers can now view and bid on this load"
                      : "Go to Load Queue to price and post this load"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              {submittedLoadDetails?.postImmediately ? (
                <Button onClick={() => navigate("/admin/loads")} className="flex-1" data-testid="button-view-all-loads">
                  View All Loads
                </Button>
              ) : (
                <Button onClick={() => navigate("/admin/queue")} className="flex-1" data-testid="button-go-to-queue">
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Go to Load Queue
                </Button>
              )}
              <Button variant="outline" onClick={() => { setSubmitted(false); form.reset(); }} data-testid="button-post-another-admin">
                Create Another Load
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 w-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" data-testid="text-admin-post-load-title">Post a Load</h1>
        <p className="text-muted-foreground">Create a new load on behalf of a shipper. The load will be added to all loads and available for pricing in the queue.</p>
      </div>

      <div className="flex gap-6 items-start flex-1">
        <div className="flex-1 space-y-6 min-w-0">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Shipper Details Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-500" />
                    Shipper Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Shipper Selector - Autocomplete Input */}
                  <div className="space-y-2">
                    <FormLabel>Select Existing Shipper (Optional)</FormLabel>
                    <div className="relative" ref={shipperDropdownRef}>
                      <Input
                        placeholder="Type to search verified shippers..."
                        value={shipperSearchQuery}
                        onChange={(e) => {
                          setShipperSearchQuery(e.target.value);
                          setShipperSearchOpen(true);
                          if (e.target.value === "") {
                            setSelectedShipperId(null);
                          }
                        }}
                        onFocus={() => setShipperSearchOpen(true)}
                        className="pr-10"
                        data-testid="input-search-shipper"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        {shippersLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                        {selectedShipperId && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => {
                              setSelectedShipperId(null);
                              setShipperSearchQuery("");
                              form.setValue("shipperCompanyName", "");
                              form.setValue("shipperContactName", "");
                              form.setValue("shipperCompanyAddress", "");
                              form.setValue("shipperPhone", "");
                            }}
                            data-testid="button-clear-shipper"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                        <Search className="h-4 w-4 text-muted-foreground" />
                      </div>
                      
                      {/* Dropdown Results */}
                      {shipperSearchOpen && (
                        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
                          {shippersLoading ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Loading shippers...
                            </div>
                          ) : (
                            <>
                              <div className="px-3 py-2 text-xs text-muted-foreground border-b flex items-center justify-between">
                                <span>All Shippers ({filteredShippers.length})</span>
                                <span className="text-xs">
                                  {allShippers.filter(s => s.isVerified).length} verified
                                </span>
                              </div>
                              {filteredShippers.length === 0 ? (
                                <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                                  No shippers match "{shipperSearchQuery}"
                                </div>
                              ) : (
                                filteredShippers.map((shipper) => (
                                  <div
                                    key={shipper.id}
                                    className={`px-3 py-2 cursor-pointer hover-elevate flex items-center gap-2 ${
                                      selectedShipperId === shipper.id ? "bg-accent" : ""
                                    }`}
                                    onClick={() => {
                                      setSelectedShipperId(shipper.id);
                                      setShipperSearchQuery(shipper.companyName || shipper.username);
                                      form.setValue("shipperCompanyName", shipper.companyName || "");
                                      form.setValue("shipperContactName", shipper.username || "");
                                      form.setValue("shipperCompanyAddress", shipper.companyAddress || "");
                                      form.setValue("shipperPhone", shipper.phone || "");
                                      setShipperSearchOpen(false);
                                    }}
                                    data-testid={`dropdown-shipper-${shipper.id}`}
                                  >
                                    <Check
                                      className={`h-4 w-4 ${
                                        selectedShipperId === shipper.id ? "opacity-100" : "opacity-0"
                                      }`}
                                    />
                                    <div className="flex flex-col flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium truncate">{shipper.companyName || shipper.username}</span>
                                        <Badge variant={shipper.isVerified ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                                          {shipper.isVerified ? "Active" : "Pending"}
                                        </Badge>
                                      </div>
                                      <span className="text-xs text-muted-foreground truncate">
                                        {shipper.email} {shipper.phone && `| ${shipper.phone}`}
                                      </span>
                                    </div>
                                  </div>
                                ))
                              )}
                              <div
                                className="px-3 py-2 cursor-pointer hover-elevate flex items-center gap-2 border-t text-muted-foreground"
                                onClick={() => {
                                  setSelectedShipperId(null);
                                  setShipperSearchQuery("");
                                  setShipperSearchOpen(false);
                                }}
                                data-testid="dropdown-shipper-manual"
                              >
                                <User className="h-4 w-4" />
                                <span className="text-sm">Enter shipper details manually</span>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    {selectedShipperId && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Check className="h-3 w-3 text-green-500" />
                        Load will be attributed to this shipper and visible in their portal
                      </p>
                    )}
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">
                        {selectedShipperId ? "Shipper Info (auto-filled)" : "Or enter shipper details manually"}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="shipperCompanyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="admin-input-shipper-company-name" />
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
                            <Input {...field} data-testid="admin-input-shipper-contact-name" />
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
                          <Input {...field} data-testid="admin-input-shipper-company-address" />
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
                          <Input {...field} data-testid="admin-input-shipper-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Pickup Location Card */}
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
                    name="pickupBusinessName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business / Factory Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. ABC Manufacturing" {...field} data-testid="admin-input-pickup-business-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pickupAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input placeholder="Street address" {...field} data-testid="admin-input-pickup-address" />
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
                            <Input placeholder="Locality name" {...field} data-testid="admin-input-pickup-locality" />
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
                            <Input placeholder="Near..." {...field} data-testid="admin-input-pickup-landmark" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="pickupState"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(value);
                              form.setValue("pickupCity", "");
                            }} 
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="admin-select-pickup-state">
                                <SelectValue placeholder="Select state" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {indianStates.map((state) => (
                                <SelectItem key={state.code} value={state.code}>
                                  {state.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="pickupCity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={!pickupState}>
                            <FormControl>
                              <SelectTrigger data-testid="admin-select-pickup-city">
                                <SelectValue placeholder="Select city" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {pickupCities.map((city) => (
                                <SelectItem key={city.name} value={city.name}>
                                  {city.name}
                                </SelectItem>
                              ))}
                              <SelectItem value="__other__">Other (Enter manually)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  {form.watch("pickupCity") === "__other__" && (
                    <FormField
                      control={form.control}
                      name="pickupCityCustom"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Enter City Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter city name" {...field} data-testid="admin-input-pickup-city-custom" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  <FormField
                    control={form.control}
                    name="pickupPincode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pincode (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="6-digit pincode" {...field} data-testid="admin-input-pickup-pincode" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Dropoff Location Card */}
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
                        <FormLabel>Business Name (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Receiver business name" {...field} data-testid="admin-input-dropoff-business-name" />
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
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input placeholder="Street address" {...field} data-testid="admin-input-dropoff-address" />
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
                            <Input placeholder="Locality name" {...field} data-testid="admin-input-dropoff-locality" />
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
                            <Input placeholder="Near..." {...field} data-testid="admin-input-dropoff-landmark" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="dropoffState"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(value);
                              form.setValue("dropoffCity", "");
                            }} 
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="admin-select-dropoff-state">
                                <SelectValue placeholder="Select state" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {indianStates.map((state) => (
                                <SelectItem key={state.code} value={state.code}>
                                  {state.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="dropoffCity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={!dropoffState}>
                            <FormControl>
                              <SelectTrigger data-testid="admin-select-dropoff-city">
                                <SelectValue placeholder="Select city" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {dropoffCities.map((city) => (
                                <SelectItem key={city.name} value={city.name}>
                                  {city.name}
                                </SelectItem>
                              ))}
                              <SelectItem value="__other__">Other (Enter manually)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  {form.watch("dropoffCity") === "__other__" && (
                    <FormField
                      control={form.control}
                      name="dropoffCityCustom"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Enter City Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter city name" {...field} data-testid="admin-input-dropoff-city-custom" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  <FormField
                    control={form.control}
                    name="dropoffPincode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pincode (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="6-digit pincode" {...field} data-testid="admin-input-dropoff-pincode" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Receiver Details Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4 text-purple-500" />
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
                            <Input placeholder="Full name" {...field} data-testid="admin-input-receiver-name" />
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
                            <Input placeholder="10-digit number" {...field} data-testid="admin-input-receiver-phone" />
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
                          <Input type="email" placeholder="email@example.com" {...field} data-testid="admin-input-receiver-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Cargo Details Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="h-4 w-4 text-orange-500" />
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
                            <Input type="number" placeholder="Enter weight" {...field} data-testid="admin-input-weight" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="weightUnit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="admin-select-weight-unit">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="tons">Tons</SelectItem>
                              <SelectItem value="kg">Kilograms</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="goodsToBeCarried"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Goods to be Carried</FormLabel>
                        <FormControl>
                          <CommodityCombobox
                            value={field.value}
                            onChange={field.onChange}
                            customValue={customCommodity}
                            onCustomChange={setCustomCommodity}
                          />
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
                        <FormLabel>Required Truck Type</FormLabel>
                        <FormControl>
                          <TruckTypeSelector
                            value={field.value}
                            onChange={field.onChange}
                            suggestedTruck={estimation?.suggestedTruck}
                          />
                        </FormControl>
                        {estimation?.suggestedTruck && !field.value && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Sparkles className="h-4 w-4 text-primary" />
                            <span>Suggested: {indianTruckTypes.find(t => t.value === estimation.suggestedTruck)?.label || estimation.suggestedTruck}</span>
                          </div>
                        )}
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
                            data-testid="admin-input-special-notes"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Schedule Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-teal-500" />
                    Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="pickupDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pickup Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="admin-input-pickup-date" />
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
                          <FormLabel>Expected Delivery Date (Optional)</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="admin-input-delivery-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Pricing Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-500" />
                    Shipper Pricing
                  </CardTitle>
                  <CardDescription>Set the shipper's quoted price</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="rateType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rate Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="admin-select-rate-type">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="fixed_price">Fixed Price</SelectItem>
                            <SelectItem value="per_ton">Per Ton</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {form.watch("rateType") === "fixed_price" && (
                    <FormField
                      control={form.control}
                      name="shipperFixedPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fixed Price (INR)</FormLabel>
                          <FormControl>
                            <Input 
                              type="text" 
                              placeholder="e.g. 50,000" 
                              {...field} 
                              data-testid="admin-input-shipper-fixed-price"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  {form.watch("rateType") === "per_ton" && (
                    <FormField
                      control={form.control}
                      name="shipperPricePerTon"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price Per Ton (INR)</FormLabel>
                          <FormControl>
                            <Input 
                              type="text" 
                              placeholder="e.g. 2,500" 
                              {...field}
                              data-testid="admin-input-shipper-price-per-ton"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  <FormField
                    control={form.control}
                    name="advancePaymentPercent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Advance Payment % (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="e.g. 30" 
                            min="0" 
                            max="100"
                            {...field}
                            data-testid="admin-input-advance-payment"
                          />
                        </FormControl>
                        <FormDescription>
                          Percentage of total to be paid upfront
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Admin Options Card */}
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-primary" />
                    Admin Options
                  </CardTitle>
                  <CardDescription>Configure how the load should be processed</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="postImmediately"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Post Immediately</FormLabel>
                          <FormDescription>
                            Skip the pricing queue and post directly to carriers
                          </FormDescription>
                        </div>
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                            data-testid="admin-checkbox-post-immediately"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  {form.watch("postImmediately") && (
                    <>
                      <FormField
                        control={form.control}
                        name="adminGrossPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Gross Price for Carriers (INR)</FormLabel>
                            <FormControl>
                              <Input 
                                type="text" 
                                placeholder="e.g. 45,000" 
                                {...field}
                                data-testid="admin-input-gross-price"
                              />
                            </FormControl>
                            <FormDescription>
                              The price carriers will see and bid on
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="platformMargin"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Platform Margin %</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  placeholder="10" 
                                  min="0" 
                                  max="50"
                                  {...field}
                                  data-testid="admin-input-platform-margin"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="carrierAdvancePercent"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Carrier Advance %</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  placeholder="30" 
                                  min="0" 
                                  max="100"
                                  {...field}
                                  data-testid="admin-input-carrier-advance"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Submit Button */}
              <div className="flex gap-3">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isLoading}
                  data-testid="admin-button-submit-load"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating Load...
                    </>
                  ) : form.watch("postImmediately") ? (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Create & Post to Carriers
                    </>
                  ) : (
                    <>
                      <ClipboardList className="h-4 w-4 mr-2" />
                      Create & Add to Queue
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/admin")}
                  data-testid="admin-button-cancel"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
