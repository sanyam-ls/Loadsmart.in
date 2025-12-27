import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { 
  Plus, Search, Truck, MapPin, Package, Edit, Trash2, AlertTriangle, 
  CheckCircle, Clock, Wrench, Filter, ChevronDown, ChevronRight,
  Fuel, Calendar, Shield, FileText, User, Settings, TrendingUp, Eye, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { StatCard } from "@/components/stat-card";
import { useCarrierData, type CarrierTruck } from "@/lib/carrier-data-store";
import { useQuery } from "@tanstack/react-query";
import type { Truck as DbTruck } from "@shared/schema";
import { format, differenceInDays } from "date-fns";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip 
} from "recharts";

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

const statusConfig: Record<CarrierTruck["currentStatus"], { label: string; icon: typeof Truck; color: string }> = {
  "Idle": { label: "Idle", icon: CheckCircle, color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  "On Trip": { label: "On Trip", icon: Truck, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  "En Route": { label: "En Route", icon: MapPin, color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  "Under Maintenance": { label: "Maintenance", icon: Wrench, color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

function formatDate(date: Date): string {
  return format(new Date(date), "dd MMM yyyy");
}

function getDaysUntilExpiry(date: Date): number {
  return differenceInDays(new Date(date), new Date());
}

function TruckDetailDialog({ truck }: { truck: CarrierTruck }) {
  const daysToInsurance = getDaysUntilExpiry(truck.insuranceExpiry);
  const daysToFitness = getDaysUntilExpiry(truck.fitnessExpiry);
  const daysToService = getDaysUntilExpiry(truck.nextServiceDue);
  
  return (
    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          {truck.licensePlate}
        </DialogTitle>
        <DialogDescription>
          {truck.manufacturer} {truck.model} ({truck.makeYear})
        </DialogDescription>
      </DialogHeader>
      
      <Tabs defaultValue="overview" className="mt-4">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="specs">Specifications</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge className={statusConfig[truck.currentStatus].color}>
                      {truck.currentStatus}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Location</span>
                    <span className="font-medium">{truck.currentLocation}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Driver</span>
                    <span className="font-medium">{truck.assignedDriver || "Unassigned"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fuel Level</span>
                    <div className="flex items-center gap-2">
                      <Progress value={truck.fuelLevel} className="w-20 h-2" />
                      <span className="font-medium">{truck.fuelLevel}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type</span>
                    <span className="font-medium">{truck.truckType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Capacity</span>
                    <span className="font-medium">{truck.loadCapacity} Tons</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Body Type</span>
                    <span className="font-medium">{truck.bodyType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Odometer</span>
                    <span className="font-medium">{truck.odometerReading.toLocaleString()} km</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="specs" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Manufacturer</span>
                    <span className="font-medium">{truck.manufacturer}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Model</span>
                    <span className="font-medium">{truck.model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Make Year</span>
                    <span className="font-medium">{truck.makeYear}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">License Plate</span>
                    <span className="font-medium">{truck.licensePlate}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Registration</span>
                    <span className="font-medium text-sm">{truck.registrationNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Chassis</span>
                    <span className="font-medium text-sm">{truck.chassisNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Load Capacity</span>
                    <span className="font-medium">{truck.loadCapacity} Tons</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Body Type</span>
                    <span className="font-medium">{truck.bodyType}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="documents" className="space-y-4 mt-4">
          <div className="space-y-3">
            <Card className={daysToInsurance < 0 ? "border-red-500" : daysToInsurance < 30 ? "border-amber-500" : ""}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className={`h-5 w-5 ${daysToInsurance < 0 ? "text-red-500" : daysToInsurance < 30 ? "text-amber-500" : "text-green-500"}`} />
                    <div>
                      <p className="font-medium">Insurance Certificate</p>
                      <p className="text-sm text-muted-foreground">Expires: {formatDate(truck.insuranceExpiry)}</p>
                    </div>
                  </div>
                  <Badge className={daysToInsurance < 0 ? "bg-red-100 text-red-700" : daysToInsurance < 30 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}>
                    {daysToInsurance < 0 ? "Expired" : `${daysToInsurance} days left`}
                  </Badge>
                </div>
              </CardContent>
            </Card>
            
            <Card className={daysToFitness < 0 ? "border-red-500" : daysToFitness < 30 ? "border-amber-500" : ""}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className={`h-5 w-5 ${daysToFitness < 0 ? "text-red-500" : daysToFitness < 30 ? "text-amber-500" : "text-green-500"}`} />
                    <div>
                      <p className="font-medium">Fitness Certificate</p>
                      <p className="text-sm text-muted-foreground">Expires: {formatDate(truck.fitnessExpiry)}</p>
                    </div>
                  </div>
                  <Badge className={daysToFitness < 0 ? "bg-red-100 text-red-700" : daysToFitness < 30 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}>
                    {daysToFitness < 0 ? "Expired" : `${daysToFitness} days left`}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="maintenance" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3 mb-3">
                  <Wrench className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Last Service</span>
                </div>
                <p className="text-2xl font-bold">{formatDate(truck.lastServiceDate)}</p>
                <p className="text-sm text-muted-foreground">{Math.abs(getDaysUntilExpiry(truck.lastServiceDate))} days ago</p>
              </CardContent>
            </Card>
            
            <Card className={daysToService < 15 ? "border-amber-500" : ""}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3 mb-3">
                  <Calendar className={`h-5 w-5 ${daysToService < 15 ? "text-amber-500" : "text-muted-foreground"}`} />
                  <span className="font-medium">Next Service Due</span>
                </div>
                <p className="text-2xl font-bold">{formatDate(truck.nextServiceDue)}</p>
                <p className={`text-sm ${daysToService < 15 ? "text-amber-500" : "text-muted-foreground"}`}>
                  {daysToService < 0 ? "Overdue" : `In ${daysToService} days`}
                </p>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Fuel className="h-5 w-5" />
                  <div>
                    <p className="font-medium">Current Fuel Level</p>
                    <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleTimeString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Progress value={truck.fuelLevel} className="w-32 h-3" />
                  <span className={`font-bold ${truck.fuelLevel < 25 ? "text-red-500" : truck.fuelLevel < 50 ? "text-amber-500" : "text-green-500"}`}>
                    {truck.fuelLevel}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DialogContent>
  );
}

export default function FleetPage() {
  const [, navigate] = useLocation();
  const { trucks: mockTrucks, getFleetOverview } = useCarrierData();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedTruck, setSelectedTruck] = useState<CarrierTruck | null>(null);
  
  // Query backend trucks for real-time updates
  const { data: backendTrucks, isLoading: trucksLoading, isSuccess: trucksLoaded } = useQuery<DbTruck[]>({
    queryKey: ["/api/trucks"],
    refetchOnWindowFocus: true,
  });

  // Use backend trucks when query succeeds (even if empty), otherwise show mock data while loading
  const trucks: CarrierTruck[] = useMemo(() => {
    // If query has succeeded, use backend data (even if empty array)
    if (trucksLoaded && backendTrucks !== undefined) {
      return backendTrucks.map((t) => ({
        truckId: t.id,
        truckType: t.truckType as CarrierTruck["truckType"],
        licensePlate: t.licensePlate,
        registrationNumber: t.registrationNumber || t.licensePlate,
        chassisNumber: t.chassisNumber || "Not specified",
        manufacturer: t.make || "Not specified",
        model: t.model || t.truckType,
        makeYear: t.year || new Date().getFullYear(),
        loadCapacity: t.capacity,
        bodyType: t.bodyType || t.truckType,
        currentLocation: t.currentLocation || "Location not set",
        currentStatus: t.isAvailable ? "Idle" : "On Trip" as CarrierTruck["currentStatus"],
        fuelLevel: 75,
        odometerReading: 50000,
        assignedDriver: null,
        assignedDriverId: null,
        insuranceExpiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        fitnessExpiry: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
        lastServiceDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        nextServiceDue: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      }));
    }
    // While loading, show mock data as placeholder
    return mockTrucks;
  }, [backendTrucks, trucksLoaded, mockTrucks]);
  
  const fleetOverview = useMemo(() => {
    // Use backend-based metrics when backend data is loaded
    if (trucksLoaded) {
      const totalTrucks = trucks.length;
      const activeTrucks = trucks.filter(t => t.currentStatus === "On Trip" || t.currentStatus === "En Route").length;
      const availableNow = trucks.filter(t => t.currentStatus === "Idle").length;
      const underMaintenance = trucks.filter(t => t.currentStatus === "Under Maintenance").length;
      
      return {
        totalTrucks,
        activeTrucks,
        availableNow,
        underMaintenance,
        fleetUtilization: totalTrucks > 0 ? Math.round((activeTrucks / totalTrucks) * 100) : 0,
        truckTypeBreakdown: Object.entries(
          trucks.reduce((acc, t) => {
            acc[t.truckType] = (acc[t.truckType] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        ).map(([type, count]) => ({ type, count })),
        documentExpiryAlerts: [],
      };
    }
    return getFleetOverview();
  }, [trucks, trucksLoaded, getFleetOverview]);
  
  const filteredTrucks = useMemo(() => {
    return trucks.filter((truck) => {
      const matchesSearch =
        truck.licensePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
        truck.currentLocation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        truck.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        truck.model.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === "all" || truck.truckType === typeFilter;
      const matchesStatus = statusFilter === "all" || truck.currentStatus === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [trucks, searchQuery, typeFilter, statusFilter]);
  
  const pieChartData = fleetOverview.truckTypeBreakdown.map((item, idx) => ({
    name: item.type,
    value: item.count,
    color: COLORS[idx % COLORS.length]
  }));
  
  const statusData = [
    { name: "Active", count: fleetOverview.activeTrucks, color: "#3B82F6" },
    { name: "Idle", count: fleetOverview.availableNow, color: "#10B981" },
    { name: "Maintenance", count: fleetOverview.underMaintenance, color: "#EF4444" },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-fleet-title">Fleet Intelligence</h1>
          <p className="text-muted-foreground">Manage your fleet of {trucks.length} trucks</p>
        </div>
        <Button onClick={() => navigate("/carrier/add-truck")} data-testid="button-add-truck">
          <Plus className="h-4 w-4 mr-2" />
          Add Truck
        </Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="trucks" data-testid="tab-trucks">All Trucks</TabsTrigger>
          <TabsTrigger value="alerts" data-testid="tab-alerts">Alerts</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard
              title="Total Trucks"
              value={fleetOverview.totalTrucks}
              icon={Truck}
              subtitle="In your fleet"
              testId="stat-total-trucks"
            />
            <StatCard
              title="Active Trucks"
              value={fleetOverview.activeTrucks}
              icon={TrendingUp}
              subtitle="Currently on trips"
              testId="stat-active-trucks"
            />
            <StatCard
              title="Available Now"
              value={fleetOverview.availableNow}
              icon={CheckCircle}
              subtitle="Ready for dispatch"
              testId="stat-available"
            />
            <StatCard
              title="Under Maintenance"
              value={fleetOverview.underMaintenance}
              icon={Wrench}
              subtitle="Being serviced"
              testId="stat-maintenance"
            />
            <StatCard
              title="Fleet Utilization"
              value={`${fleetOverview.fleetUtilization}%`}
              icon={TrendingUp}
              subtitle="Active / Total"
              testId="stat-utilization"
            />
          </div>
          
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Fleet by Type</CardTitle>
                <CardDescription>Distribution of truck types in your fleet</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Fleet Status</CardTitle>
                <CardDescription>Current operational status breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusData} layout="vertical">
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} />
                      <Tooltip />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {fleetOverview.documentExpiryAlerts.length > 0 && (
            <Card className="border-amber-500">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Document Expiry Alerts
                </CardTitle>
                <CardDescription>Documents expiring within 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {fleetOverview.documentExpiryAlerts.slice(0, 5).map((alert, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-amber-500" />
                        <div>
                          <span className="font-medium">{alert.plate}</span>
                          <span className="text-muted-foreground mx-2">-</span>
                          <span className="text-muted-foreground">{alert.documentType}</span>
                        </div>
                      </div>
                      <Badge className={getDaysUntilExpiry(alert.expiryDate) < 0 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}>
                        {getDaysUntilExpiry(alert.expiryDate) < 0 
                          ? "Expired" 
                          : `${getDaysUntilExpiry(alert.expiryDate)} days left`}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="trucks" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by plate, location, manufacturer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-trucks"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-type-filter">
                <SelectValue placeholder="Truck Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Container">Container</SelectItem>
                <SelectItem value="Flatbed">Flatbed</SelectItem>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="Reefer">Reefer</SelectItem>
                <SelectItem value="Tanker">Tanker</SelectItem>
                <SelectItem value="Trailer">Trailer</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Idle">Idle</SelectItem>
                <SelectItem value="On Trip">On Trip</SelectItem>
                <SelectItem value="En Route">En Route</SelectItem>
                <SelectItem value="Under Maintenance">Under Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>License Plate</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Manufacturer</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Fuel</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTrucks.map((truck) => {
                      const StatusIcon = statusConfig[truck.currentStatus].icon;
                      return (
                        <TableRow key={truck.truckId} data-testid={`row-truck-${truck.truckId}`}>
                          <TableCell className="font-medium">{truck.licensePlate}</TableCell>
                          <TableCell>{truck.truckType}</TableCell>
                          <TableCell>{truck.manufacturer}</TableCell>
                          <TableCell>{truck.loadCapacity} T</TableCell>
                          <TableCell className="max-w-[150px] truncate">{truck.currentLocation}</TableCell>
                          <TableCell>{truck.assignedDriver || <span className="text-muted-foreground">Unassigned</span>}</TableCell>
                          <TableCell>
                            <Badge className={statusConfig[truck.currentStatus].color}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusConfig[truck.currentStatus].label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={truck.fuelLevel} className="w-16 h-2" />
                              <span className={`text-xs ${truck.fuelLevel < 25 ? "text-red-500" : ""}`}>
                                {truck.fuelLevel}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => setSelectedTruck(truck)} data-testid={`button-view-${truck.truckId}`}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <TruckDetailDialog truck={truck} />
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
          
          <p className="text-sm text-muted-foreground">
            Showing {filteredTrucks.length} of {trucks.length} trucks
          </p>
        </TabsContent>
        
        <TabsContent value="alerts" className="space-y-4">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Expired Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                {fleetOverview.documentExpiryAlerts.filter(a => getDaysUntilExpiry(a.expiryDate) < 0).length === 0 ? (
                  <p className="text-muted-foreground">No expired documents</p>
                ) : (
                  <div className="space-y-2">
                    {fleetOverview.documentExpiryAlerts
                      .filter(a => getDaysUntilExpiry(a.expiryDate) < 0)
                      .map((alert, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-md bg-red-50 dark:bg-red-900/20">
                          <div className="flex items-center gap-3">
                            <FileText className="h-4 w-4 text-red-500" />
                            <div>
                              <span className="font-medium">{alert.plate}</span>
                              <span className="text-muted-foreground mx-2">-</span>
                              <span className="text-muted-foreground">{alert.documentType}</span>
                            </div>
                          </div>
                          <Badge className="bg-red-100 text-red-700">
                            Expired {Math.abs(getDaysUntilExpiry(alert.expiryDate))} days ago
                          </Badge>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Expiring Soon (Within 30 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {fleetOverview.documentExpiryAlerts.filter(a => getDaysUntilExpiry(a.expiryDate) >= 0).length === 0 ? (
                  <p className="text-muted-foreground">No documents expiring soon</p>
                ) : (
                  <div className="space-y-2">
                    {fleetOverview.documentExpiryAlerts
                      .filter(a => getDaysUntilExpiry(a.expiryDate) >= 0)
                      .map((alert, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-md bg-amber-50 dark:bg-amber-900/20">
                          <div className="flex items-center gap-3">
                            <FileText className="h-4 w-4 text-amber-500" />
                            <div>
                              <span className="font-medium">{alert.plate}</span>
                              <span className="text-muted-foreground mx-2">-</span>
                              <span className="text-muted-foreground">{alert.documentType}</span>
                            </div>
                          </div>
                          <Badge className="bg-amber-100 text-amber-700">
                            {getDaysUntilExpiry(alert.expiryDate)} days left
                          </Badge>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Fuel className="h-5 w-5 text-amber-500" />
                  Low Fuel Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {trucks.filter(t => t.fuelLevel < 25).length === 0 ? (
                  <p className="text-muted-foreground">No trucks with low fuel</p>
                ) : (
                  <div className="space-y-2">
                    {trucks
                      .filter(t => t.fuelLevel < 25)
                      .map((truck) => (
                        <div key={truck.truckId} className="flex items-center justify-between p-3 rounded-md bg-amber-50 dark:bg-amber-900/20">
                          <div className="flex items-center gap-3">
                            <Fuel className="h-4 w-4 text-amber-500" />
                            <div>
                              <span className="font-medium">{truck.licensePlate}</span>
                              <span className="text-muted-foreground mx-2">-</span>
                              <span className="text-muted-foreground">{truck.currentLocation}</span>
                            </div>
                          </div>
                          <Badge className={truck.fuelLevel < 15 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}>
                            {truck.fuelLevel}% fuel
                          </Badge>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
