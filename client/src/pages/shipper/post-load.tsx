import { useState } from "react";
import { useLocation } from "wouter";
import { MapPin, Package, Calendar, DollarSign, Truck, Save, ArrowRight, Sparkles, Info } from "lucide-react";
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMockData } from "@/lib/mock-data-store";

const loadFormSchema = z.object({
  pickupAddress: z.string().min(5, "Pickup address is required"),
  pickupCity: z.string().min(2, "Pickup city is required"),
  dropoffAddress: z.string().min(5, "Dropoff address is required"),
  dropoffCity: z.string().min(2, "Dropoff city is required"),
  weight: z.string().min(1, "Weight is required"),
  weightUnit: z.string().default("lbs"),
  cargoDescription: z.string().optional(),
  requiredTruckType: z.string().optional(),
  pickupDate: z.string().min(1, "Pickup date is required"),
  deliveryDate: z.string().optional(),
  isTemplate: z.boolean().default(false),
  templateName: z.string().optional(),
});

type LoadFormData = z.infer<typeof loadFormSchema>;

const truckTypes = [
  { value: "Dry Van", label: "Dry Van", description: "Standard enclosed trailer" },
  { value: "Flatbed", label: "Flatbed", description: "Open deck for oversized loads" },
  { value: "Refrigerated", label: "Refrigerated", description: "Temperature-controlled" },
  { value: "Tanker", label: "Tanker", description: "Liquid cargo transport" },
  { value: "Container", label: "Container", description: "Intermodal shipping" },
  { value: "Open Deck", label: "Open Deck", description: "Heavy equipment & machinery" },
];

const savedTemplates = [
  { id: "t1", name: "LA to Phoenix Regular", pickup: "Los Angeles, CA", dropoff: "Phoenix, AZ" },
  { id: "t2", name: "SF Distribution Route", pickup: "San Francisco, CA", dropoff: "Denver, CO" },
];

function calculateDistance(from: string, to: string): number {
  const distances: Record<string, number> = {
    "los angeles, ca_phoenix, az": 372,
    "san francisco, ca_denver, co": 1235,
    "los angeles, ca_denver, co": 1020,
    "phoenix, az_denver, co": 602,
  };
  const key = `${from.toLowerCase()}_${to.toLowerCase()}`;
  return distances[key] || Math.floor(Math.random() * 1500) + 200;
}

function calculatePrice(distance: number, weight: number, truckType: string): number {
  const baseRate = 2.5;
  const typeMultiplier: Record<string, number> = {
    "Dry Van": 1.0,
    "Flatbed": 1.15,
    "Refrigerated": 1.35,
    "Tanker": 1.25,
    "Container": 1.1,
    "Open Deck": 1.2,
  };
  const multiplier = typeMultiplier[truckType] || 1.0;
  const weightFactor = weight > 30000 ? 1.2 : weight > 20000 ? 1.1 : 1.0;
  return Math.round(distance * baseRate * multiplier * weightFactor);
}

function suggestTruckType(weight: number, description: string): string {
  const desc = description.toLowerCase();
  if (desc.includes("frozen") || desc.includes("cold") || desc.includes("perishable")) return "Refrigerated";
  if (desc.includes("liquid") || desc.includes("oil") || desc.includes("fuel")) return "Tanker";
  if (desc.includes("machine") || desc.includes("equipment") || desc.includes("vehicle")) return "Flatbed";
  if (weight > 40000) return "Flatbed";
  return "Dry Van";
}

export default function PostLoadPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { addLoad } = useMockData();
  const [isLoading, setIsLoading] = useState(false);
  const [estimation, setEstimation] = useState<{
    distance: number;
    price: number;
    suggestedTruck: string;
    nearbyTrucks: number;
  } | null>(null);

  const form = useForm<LoadFormData>({
    resolver: zodResolver(loadFormSchema),
    defaultValues: {
      pickupAddress: "",
      pickupCity: "",
      dropoffAddress: "",
      dropoffCity: "",
      weight: "",
      weightUnit: "lbs",
      cargoDescription: "",
      requiredTruckType: "",
      pickupDate: "",
      deliveryDate: "",
      isTemplate: false,
      templateName: "",
    },
  });

  const watchedFields = form.watch(["pickupCity", "dropoffCity", "weight", "cargoDescription", "requiredTruckType"]);

  const updateEstimation = () => {
    const [pickupCity, dropoffCity, weight, description, truckType] = watchedFields;
    if (pickupCity && dropoffCity && weight) {
      const distance = calculateDistance(pickupCity, dropoffCity);
      const suggestedTruck = truckType || suggestTruckType(Number(weight), description || "");
      const price = calculatePrice(distance, Number(weight), suggestedTruck);
      const nearbyTrucks = Math.floor(Math.random() * 15) + 3;
      setEstimation({ distance, price, suggestedTruck, nearbyTrucks });
    }
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
      
      const newLoad = addLoad({
        pickup: data.pickupCity,
        drop: data.dropoffCity,
        weight: Number(data.weight),
        weightUnit: data.weightUnit,
        type: truckType,
        status: "Active",
        carrier: null,
        eta: null,
        estimatedPrice: estimation?.price || 2000,
        finalPrice: null,
        cargoDescription: data.cargoDescription || "",
        pickupDate: new Date(data.pickupDate).toISOString(),
      });

      toast({ 
        title: "Load Posted Successfully!", 
        description: `Load ${newLoad.loadId} is now visible to carriers. Dashboard updated.` 
      });
      
      navigate("/shipper/loads");
    } catch (error) {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Post New Load</h1>
        <p className="text-muted-foreground">Fill in the details below to post your load to the marketplace.</p>
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
                  <FormField
                    control={form.control}
                    name="pickupCity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City, State</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Los Angeles, CA" 
                            {...field} 
                            onBlur={(e) => { field.onBlur(); updateEstimation(); }}
                            data-testid="input-pickup-city" 
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
                  <FormField
                    control={form.control}
                    name="dropoffCity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City, State</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Phoenix, AZ" 
                            {...field}
                            onBlur={(e) => { field.onBlur(); updateEstimation(); }}
                            data-testid="input-dropoff-city" 
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
                                placeholder="15000" 
                                {...field}
                                onBlur={(e) => { field.onBlur(); updateEstimation(); }}
                                data-testid="input-weight" 
                              />
                              <Select
                                defaultValue="lbs"
                                onValueChange={(value) => form.setValue("weightUnit", value)}
                              >
                                <SelectTrigger className="w-24">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="lbs">lbs</SelectItem>
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
                          <Select onValueChange={(value) => { field.onChange(value); updateEstimation(); }} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-truck-type">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {truckTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {estimation?.suggestedTruck && !field.value && (
                            <FormDescription className="flex items-center gap-1 text-primary">
                              <Sparkles className="h-3 w-3" />
                              Suggested: {estimation.suggestedTruck}
                            </FormDescription>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="cargoDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cargo Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe your cargo (e.g., palletized goods, machinery, perishables...)"
                            {...field}
                            onBlur={(e) => { field.onBlur(); updateEstimation(); }}
                            data-testid="input-cargo-description"
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
                <Button type="submit" className="flex-1" disabled={isLoading} data-testid="button-post-load">
                  {isLoading ? "Posting..." : "Post Load"}
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
          {estimation ? (
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Smart Estimation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Distance</span>
                    <span className="font-semibold">{estimation.distance.toLocaleString()} miles</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Estimated Price</span>
                    <span className="text-xl font-bold text-primary">${estimation.price.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Suggested Truck</span>
                    <Badge variant="secondary">
                      {estimation.suggestedTruck}
                    </Badge>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                    <Truck className="h-4 w-4" />
                    <span className="font-medium">{estimation.nearbyTrucks} trucks available nearby</span>
                  </div>
                  <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                    Ready to pick up your load
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                <Info className="h-8 w-8 mx-auto mb-3 opacity-50" />
                <p className="text-sm">
                  Fill in pickup and dropoff locations to see distance, pricing estimates, and available trucks.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
