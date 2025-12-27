import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { Truck, MapPin, Package, FileText, ArrowRight, Upload, X, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { queryClient } from "@/lib/queryClient";

const truckFormSchema = z.object({
  truckType: z.string().min(1, "Truck type is required"),
  licensePlate: z.string().min(1, "License plate is required"),
  capacity: z.string().min(1, "Capacity is required"),
  capacityUnit: z.string().default("tons"),
  currentLocation: z.string().optional(),
  isAvailable: z.boolean().default(true),
  // Extended specification fields
  make: z.string().min(1, "Manufacturer is required"),
  model: z.string().min(1, "Model is required"),
  year: z.string().min(1, "Year is required"),
  registrationNumber: z.string().optional(),
  chassisNumber: z.string().optional(),
  bodyType: z.string().optional(),
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

interface DocumentFile {
  file: File;
  name: string;
  type: string;
}

export default function AddTruckPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { carrierType } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSoloCarrier = carrierType === "solo";

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newDocs: DocumentFile[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // Determine document type from file name
        const name = file.name.toLowerCase();
        let type = "other";
        if (name.includes("rc") || name.includes("registration")) type = "rc";
        else if (name.includes("insurance")) type = "insurance";
        else if (name.includes("fitness")) type = "fitness";
        else if (name.includes("puc") || name.includes("pollution")) type = "puc";
        else if (name.includes("permit")) type = "permit";
        
        newDocs.push({ file, name: file.name, type });
      }
      setDocuments(prev => [...prev, ...newDocs]);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const form = useForm<TruckFormData>({
    resolver: zodResolver(truckFormSchema),
    defaultValues: {
      truckType: "",
      licensePlate: "",
      capacity: "",
      capacityUnit: "tons",
      currentLocation: "",
      isAvailable: true,
      make: "",
      model: "",
      year: "",
      registrationNumber: "",
      chassisNumber: "",
      bodyType: "",
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
          truckType: data.truckType,
          licensePlate: data.licensePlate,
          capacity: Number(data.capacity),
          capacityUnit: data.capacityUnit,
          currentLocation: data.currentLocation,
          isAvailable: data.isAvailable,
          make: data.make,
          model: data.model,
          year: data.year ? Number(data.year) : undefined,
          registrationNumber: data.registrationNumber || undefined,
          chassisNumber: data.chassisNumber || undefined,
          bodyType: data.bodyType || undefined,
        }),
      });

      if (response.ok) {
        const truck = await response.json();
        
        // Upload documents if any
        if (documents.length > 0) {
          for (const doc of documents) {
            try {
              const reader = new FileReader();
              await new Promise<void>((resolve, reject) => {
                reader.onload = async () => {
                  const fileUrl = reader.result as string;
                  await fetch("/api/carrier/documents", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                      documentType: doc.type,
                      fileName: doc.name,
                      fileUrl: fileUrl,
                      fileSize: doc.file.size,
                      expiryDate: null,
                      truckId: truck.id,
                    }),
                  });
                  resolve();
                };
                reader.onerror = reject;
                reader.readAsDataURL(doc.file);
              });
            } catch (docError) {
              console.error("Failed to upload document:", docError);
            }
          }
        }
        
        // Invalidate trucks query for real-time update
        queryClient.invalidateQueries({ queryKey: ["/api/trucks"] });
        
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
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="make"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Manufacturer</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-manufacturer">
                            <SelectValue placeholder="Select manufacturer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Tata Motors">Tata Motors</SelectItem>
                          <SelectItem value="Ashok Leyland">Ashok Leyland</SelectItem>
                          <SelectItem value="Mahindra">Mahindra</SelectItem>
                          <SelectItem value="Eicher">Eicher</SelectItem>
                          <SelectItem value="BharatBenz">BharatBenz</SelectItem>
                          <SelectItem value="Force Motors">Force Motors</SelectItem>
                          <SelectItem value="Volvo">Volvo</SelectItem>
                          <SelectItem value="Scania">Scania</SelectItem>
                          <SelectItem value="MAN">MAN</SelectItem>
                          <SelectItem value="Isuzu">Isuzu</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Prima 4928" {...field} data-testid="input-model" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Year of Manufacture</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="2023" min="1990" max={new Date().getFullYear()} {...field} data-testid="input-year" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="licensePlate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>License Plate</FormLabel>
                      <FormControl>
                        <Input placeholder="MH-01-AB-1234" {...field} data-testid="input-license-plate" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="registrationNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registration Number (RC)</FormLabel>
                      <FormControl>
                        <Input placeholder="Same as license plate if not available" {...field} data-testid="input-registration-number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="chassisNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Chassis Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., MAT123456789012345" {...field} data-testid="input-chassis-number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bodyType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Body Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-body-type">
                            <SelectValue placeholder="Select body type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="open">Open Body</SelectItem>
                          <SelectItem value="closed">Closed Body</SelectItem>
                          <SelectItem value="container">Container</SelectItem>
                          <SelectItem value="flatbed">Flatbed</SelectItem>
                          <SelectItem value="tanker">Tanker</SelectItem>
                          <SelectItem value="tipper">Tipper</SelectItem>
                          <SelectItem value="trailer">Trailer</SelectItem>
                          <SelectItem value="refrigerated">Refrigerated</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
            <CardContent className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                multiple
                className="hidden"
                onChange={handleFileSelect}
                data-testid="input-document-upload"
              />
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-lg p-6 text-center hover-elevate cursor-pointer"
                data-testid="dropzone-documents"
              >
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium">Click to upload vehicle documents</p>
                <p className="text-xs text-muted-foreground">RC, Insurance, Fitness Certificate (PDF, JPG, PNG)</p>
              </div>
              
              {documents.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Selected documents:</p>
                  {documents.map((doc, index) => (
                    <div key={index} className="flex items-center justify-between gap-2 p-2 border rounded-md">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        <span className="text-sm truncate">{doc.name}</span>
                        <Badge variant="outline" className="flex-shrink-0 no-default-hover-elevate no-default-active-elevate">
                          {doc.type.toUpperCase()}
                        </Badge>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeDocument(index)}
                        data-testid={`button-remove-doc-${index}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
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
