import { useState, useMemo } from "react";
import { 
  User, Phone, Shield, AlertTriangle, Star, MapPin, 
  Truck, Search, Calendar, Award, TrendingUp, Clock, CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/empty-state";
import { StatCard } from "@/components/stat-card";
import { useCarrierData, type CarrierDriver } from "@/lib/carrier-data-store";
import { format, differenceInMonths } from "date-fns";

function formatCurrency(amount: number): string {
  if (amount >= 100000) {
    return `Rs. ${(amount / 100000).toFixed(1)}L`;
  }
  return `Rs. ${amount.toLocaleString()}`;
}

function getSafetyScoreColor(score: number) {
  if (score >= 85) return "text-green-600 dark:text-green-400";
  if (score >= 70) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function getStatusBadge(status: CarrierDriver["availabilityStatus"]) {
  switch (status) {
    case "Available":
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "On Trip":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "Off Duty":
      return "bg-muted text-muted-foreground";
    case "On Leave":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export default function CarrierDriversPage() {
  const { drivers } = useCarrierData();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedDriver, setSelectedDriver] = useState<CarrierDriver | null>(null);

  const filteredDrivers = useMemo(() => {
    return drivers.filter((driver) => {
      const matchesSearch =
        driver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        driver.driverId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        driver.phone.includes(searchQuery);
      const matchesStatus = statusFilter === "all" || driver.availabilityStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [drivers, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const total = drivers.length;
    const available = drivers.filter(d => d.availabilityStatus === "Available").length;
    const onTrip = drivers.filter(d => d.availabilityStatus === "On Trip").length;
    const avgSafety = Math.round(drivers.reduce((sum, d) => sum + d.safetyScore, 0) / drivers.length);
    const totalTrips = drivers.reduce((sum, d) => sum + d.pastTripsCount, 0);
    
    return { total, available, onTrip, avgSafety, totalTrips };
  }, [drivers]);

  const expiringLicenses = useMemo(() => {
    return drivers.filter(d => {
      const monthsUntilExpiry = differenceInMonths(new Date(d.licenseExpiry), new Date());
      return monthsUntilExpiry <= 3 && monthsUntilExpiry >= 0;
    });
  }, [drivers]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-drivers-title">Driver Management</h1>
          <p className="text-muted-foreground">Manage your team of {drivers.length} drivers</p>
        </div>
        <Button data-testid="button-add-driver">
          <User className="h-4 w-4 mr-2" />
          Add Driver
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Total Drivers"
          value={stats.total}
          icon={User}
          subtitle="In your team"
          testId="stat-total-drivers"
        />
        <StatCard
          title="Available"
          value={stats.available}
          icon={CheckCircle}
          subtitle="Ready for dispatch"
          testId="stat-available-drivers"
        />
        <StatCard
          title="On Trip"
          value={stats.onTrip}
          icon={Truck}
          subtitle="Currently driving"
          testId="stat-on-trip-drivers"
        />
        <StatCard
          title="Avg Safety"
          value={stats.avgSafety}
          icon={Shield}
          subtitle="Safety score"
          testId="stat-avg-safety"
        />
        <StatCard
          title="Total Trips"
          value={stats.totalTrips.toLocaleString()}
          icon={TrendingUp}
          subtitle="All time"
          testId="stat-total-trips"
        />
      </div>

      {expiringLicenses.length > 0 && (
        <Card className="border-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              License Expiry Alerts ({expiringLicenses.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {expiringLicenses.map(driver => (
                <Badge 
                  key={driver.driverId} 
                  variant="outline" 
                  className="border-amber-500 text-amber-600"
                >
                  {driver.name} - Expires {format(new Date(driver.licenseExpiry), "MMM d, yyyy")}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, ID, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-drivers"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48" data-testid="select-status-filter">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Available">Available</SelectItem>
            <SelectItem value="On Trip">On Trip</SelectItem>
            <SelectItem value="Off Duty">Off Duty</SelectItem>
            <SelectItem value="On Leave">On Leave</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredDrivers.length === 0 ? (
        <EmptyState
          icon={User}
          title="No drivers found"
          description="No drivers match your search criteria."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDrivers.map((driver) => (
            <Card 
              key={driver.driverId} 
              className="hover-elevate cursor-pointer" 
              onClick={() => setSelectedDriver(driver)}
              data-testid={`driver-card-${driver.driverId}`}
            >
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{driver.name}</h3>
                      <p className="text-xs text-muted-foreground">{driver.driverId}</p>
                    </div>
                  </div>
                  <Badge className={`${getStatusBadge(driver.availabilityStatus)} no-default-hover-elevate no-default-active-elevate`}>
                    {driver.availabilityStatus}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Safety Score</p>
                    <div className="flex items-center gap-2">
                      <Progress value={driver.safetyScore} className="h-2 flex-1" />
                      <span className={`font-medium ${getSafetyScoreColor(driver.safetyScore)}`}>
                        {driver.safetyScore}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Performance</p>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                      <span className="font-medium">{driver.performanceRating.toFixed(1)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Truck className="h-4 w-4" />
                    <span>{driver.pastTripsCount} trips</span>
                  </div>
                  <span className="font-medium">{formatCurrency(driver.totalEarnings)}</span>
                </div>

                {driver.assignedTruckPlate && (
                  <div className="p-2 rounded-md bg-muted/50 text-sm">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      <span>Truck: {driver.assignedTruckPlate}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedDriver} onOpenChange={() => setSelectedDriver(null)}>
        {selectedDriver && (
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <span>{selectedDriver.name}</span>
                  <p className="text-sm font-normal text-muted-foreground">{selectedDriver.driverId}</p>
                </div>
              </DialogTitle>
              <DialogDescription>
                Driver profile and performance details
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="overview" className="mt-4">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-4 space-y-3">
                      <h4 className="font-medium">Contact Information</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{selectedDriver.phone}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{selectedDriver.address}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-4 space-y-3">
                      <h4 className="font-medium">License Details</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Number</span>
                          <span className="font-medium">{selectedDriver.licenseNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Expiry</span>
                          <span className="font-medium">
                            {format(new Date(selectedDriver.licenseExpiry), "MMM d, yyyy")}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Joined</span>
                          <span className="font-medium">
                            {format(new Date(selectedDriver.joinDate), "MMM yyyy")}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {selectedDriver.assignedTruckPlate && (
                  <Card>
                    <CardContent className="pt-4">
                      <h4 className="font-medium mb-2">Assigned Truck</h4>
                      <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                        <Truck className="h-6 w-6 text-primary" />
                        <span className="font-medium">{selectedDriver.assignedTruckPlate}</span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="performance" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <Shield className="h-8 w-8 mx-auto text-primary mb-2" />
                      <p className="text-2xl font-bold">{selectedDriver.safetyScore}</p>
                      <p className="text-xs text-muted-foreground">Safety Score</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <Star className="h-8 w-8 mx-auto text-amber-500 mb-2" />
                      <p className="text-2xl font-bold">{selectedDriver.performanceRating.toFixed(1)}</p>
                      <p className="text-xs text-muted-foreground">Performance</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <Truck className="h-8 w-8 mx-auto text-green-500 mb-2" />
                      <p className="text-2xl font-bold">{selectedDriver.pastTripsCount}</p>
                      <p className="text-xs text-muted-foreground">Trips</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <TrendingUp className="h-8 w-8 mx-auto text-blue-500 mb-2" />
                      <p className="text-2xl font-bold">{formatCurrency(selectedDriver.totalEarnings)}</p>
                      <p className="text-xs text-muted-foreground">Earnings</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardContent className="pt-4">
                    <h4 className="font-medium mb-4">Performance Metrics</h4>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Safety Score</span>
                          <span className={`font-medium ${getSafetyScoreColor(selectedDriver.safetyScore)}`}>
                            {selectedDriver.safetyScore}
                          </span>
                        </div>
                        <Progress value={selectedDriver.safetyScore} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Performance Rating</span>
                          <span className="font-medium">{selectedDriver.performanceRating.toFixed(1)}/5.0</span>
                        </div>
                        <Progress value={selectedDriver.performanceRating * 20} className="h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="documents" className="space-y-4 mt-4">
                <Card>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Award className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">Driving License</p>
                          <p className="text-xs text-muted-foreground">{selectedDriver.licenseNumber}</p>
                        </div>
                      </div>
                      <Badge variant="outline">
                        Expires {format(new Date(selectedDriver.licenseExpiry), "MMM yyyy")}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Shield className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="font-medium">Background Check</p>
                          <p className="text-xs text-muted-foreground">Verified</p>
                        </div>
                      </div>
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        Valid
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="font-medium">Medical Certificate</p>
                          <p className="text-xs text-muted-foreground">Annual checkup</p>
                        </div>
                      </div>
                      <Badge variant="outline">Active</Badge>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
