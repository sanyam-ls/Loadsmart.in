import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { MapPin, Package, Calendar, Truck, Save, ArrowRight, Sparkles, Info, Clock, CheckCircle2, Send } from "lucide-react";
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
import { AddressAutocomplete, getRouteInfo } from "@/components/address-autocomplete";
import { apiRequest, queryClient } from "@/lib/queryClient";

const loadFormSchema = z.object({
  pickupAddress: z.string().min(5, "Pickup address is required"),
  pickupCity: z.string().min(2, "Pickup city is required"),
  dropoffAddress: z.string().min(5, "Dropoff address is required"),
  dropoffCity: z.string().min(2, "Dropoff city is required"),
  weight: z.string().min(1, "Weight is required"),
  weightUnit: z.string().default("tons"),
  cargoDescription: z.string().optional(),
  requiredTruckType: z.string().optional(),
  pickupDate: z.string().min(1, "Pickup date is required"),
  deliveryDate: z.string().optional(),
  isTemplate: z.boolean().default(false),
  templateName: z.string().optional(),
  preferredCarriers: z.boolean().default(false),
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
  if (desc.includes("frozen") || desc.includes("cold") || desc.includes("perishable")) return "Refrigerated";
  if (desc.includes("liquid") || desc.includes("oil") || desc.includes("fuel")) return "Tanker";
  if (desc.includes("machine") || desc.includes("equipment") || desc.includes("vehicle")) return "Flatbed";
  if (weight > 40) return "Flatbed";
  return "Dry Van";
}

export default function PostLoadPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { addLoad } = useMockData();
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedLoadId, setSubmittedLoadId] = useState<string | null>(null);
  const [estimation, setEstimation] = useState<{
    distance: number;
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
      weightUnit: "tons",
      cargoDescription: "",
      requiredTruckType: "",
      pickupDate: "",
      deliveryDate: "",
      isTemplate: false,
      templateName: "",
      preferredCarriers: false,
    },
  });

  const watchedFields = form.watch(["pickupCity", "dropoffCity", "weight", "cargoDescription", "requiredTruckType"]);
  const [pickupCity, dropoffCity, weight, description, truckType] = watchedFields;

  useEffect(() => {
    if (pickupCity && dropoffCity && weight) {
      const distance = calculateDistance(pickupCity, dropoffCity);
      const suggestedTruck = truckType || suggestTruckType(Number(weight), description || "");
      const nearbyTrucks = Math.floor(Math.random() * 15) + 3;
      setEstimation({ distance, suggestedTruck, nearbyTrucks });
    }
  }, [pickupCity, dropoffCity, weight, description, truckType]);

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
      
      const newLoad = addLoad({
        pickup: data.pickupCity,
        drop: data.dropoffCity,
        weight: Number(data.weight),
        weightUnit: data.weightUnit,
        type: truckType,
        status: "Pending Admin Review",
        carrier: null,
        eta: null,
        estimatedPrice: null,
        finalPrice: null,
        cargoDescription: data.cargoDescription || "",
        pickupDate: new Date(data.pickupDate).toISOString(),
      });

      try {
        await apiRequest("POST", "/api/loads/submit", {
          pickupAddress: data.pickupAddress,
          pickupCity: data.pickupCity,
          dropoffAddress: data.dropoffAddress,
          dropoffCity: data.dropoffCity,
          weight: data.weight,
          cargoDescription: data.cargoDescription || "",
          requiredTruckType: truckType,
          pickupDate: data.pickupDate,
          deliveryDate: data.deliveryDate || null,
        });
      } catch (apiError) {
        console.log("API call skipped - using mock data for demo");
      }

      setSubmittedLoadId(newLoad.loadId);
      setSubmitted(true);
      
      queryClient.invalidateQueries({ queryKey: ['/api/loads'] });

      toast({ 
        title: "Load Submitted for Review", 
        description: `Your load has been submitted. Our team will evaluate and price it shortly.` 
      });
      
    } catch (error) {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
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
                      {estimation.suggestedTruck}
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
