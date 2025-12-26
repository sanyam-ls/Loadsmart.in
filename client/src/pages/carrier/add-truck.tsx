import { useState } from "react";
import { useLocation } from "wouter";
import { Truck, MapPin, Package, FileText, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

const truckFormSchema = z.object({
  truckType: z.string().min(1, "Truck type is required"),
  licensePlate: z.string().min(1, "License plate is required"),
  capacity: z.string().min(1, "Capacity is required"),
  capacityUnit: z.string().default("tons"),
  currentLocation: z.string().optional(),
  isAvailable: z.boolean().default(true),
});

type TruckFormData = z.infer<typeof truckFormSchema>;

import { indianTruckTypes, truckCategories } from "@shared/schema";

const truckTypesByCategory = truckCategories.reduce((acc, category) => {
  acc[category] = indianTruckTypes.filter(t => t.category === category);
  return acc;
}, {} as Record<string, typeof indianTruckTypes[number][]>);

const categoryLabels: Record<string, string> = {
  open: "Open Body (7.5-43 Ton)",
  container: "Container (7.5-30 Ton)",
  lcv: "LCV (2.5-7 Ton)",
  mini_pickup: "Mini/Pickup (0.75-2 Ton)",
  trailer: "Trailer (16-43 Ton)",
  tipper: "Tipper (9-30 Ton)",
  tanker: "Tanker (8-36 Ton)",
  dumper: "Dumper (9-36 Ton)",
  bulker: "Bulker (20-36 Ton)",
};

export default function AddTruckPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { carrierType } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const isSoloCarrier = carrierType === "solo";

  const form = useForm<TruckFormData>({
    resolver: zodResolver(truckFormSchema),
    defaultValues: {
      truckType: "",
      licensePlate: "",
      capacity: "",
      capacityUnit: "tons",
      currentLocation: "",
      isAvailable: true,
    },
  });

  const handleSubmit = async (data: TruckFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/trucks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...data,
          capacity: Number(data.capacity),
        }),
      });

      if (response.ok) {
        toast({ title: "Truck added!", description: "Your truck is now listed and ready for loads." });
        navigate(isSoloCarrier ? "/carrier/my-truck" : "/carrier/fleet");
      } else {
        toast({ title: "Error", description: "Failed to add truck. Please try again.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Add New Truck</h1>
        <p className="text-muted-foreground">Register a new vehicle to your fleet.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Vehicle Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="truckType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Truck Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-truck-type">
                          <SelectValue placeholder="Select truck type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-[300px]">
                        {truckCategories.map((category) => (
                          <SelectGroup key={category}>
                            <SelectLabel className="text-xs font-semibold text-muted-foreground">
                              {categoryLabels[category]}
                            </SelectLabel>
                            {truckTypesByCategory[category]?.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="licensePlate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>License Plate</FormLabel>
                    <FormControl>
                      <Input placeholder="ABC-1234" {...field} data-testid="input-license-plate" />
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
                Capacity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Load Capacity</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input 
                          type="number" 
                          placeholder="25" 
                          {...field} 
                          data-testid="input-capacity" 
                        />
                        <Select
                          defaultValue="tons"
                          onValueChange={(value) => form.setValue("capacityUnit", value)}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="tons">tons</SelectItem>
                            <SelectItem value="lbs">lbs</SelectItem>
                            <SelectItem value="kg">kg</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
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
                <MapPin className="h-4 w-4" />
                Location & Availability
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="currentLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Location</FormLabel>
                    <FormControl>
                      <Input placeholder="Mumbai, Maharashtra" {...field} data-testid="input-location" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isAvailable"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <FormLabel className="text-base">Available for loads</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Mark this truck as available to receive load recommendations
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-available"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Documents (Optional)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover-elevate cursor-pointer">
                <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium">Upload vehicle documents</p>
                <p className="text-xs text-muted-foreground">RC, Insurance, Fitness Certificate</p>
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-add-truck">
            {isLoading ? "Adding..." : "Add Truck to Fleet"}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </form>
      </Form>
    </div>
  );
}
