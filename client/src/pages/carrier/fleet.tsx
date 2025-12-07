import { useState } from "react";
import { useLocation } from "wouter";
import { Plus, Search, Truck, MapPin, Package, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/empty-state";

const mockTrucks = [
  {
    id: "t1",
    truckType: "dry_van",
    licensePlate: "ABC-1234",
    capacity: 25,
    capacityUnit: "tons",
    currentLocation: "Los Angeles, CA",
    isAvailable: true,
  },
  {
    id: "t2",
    truckType: "flatbed",
    licensePlate: "XYZ-5678",
    capacity: 30,
    capacityUnit: "tons",
    currentLocation: "Phoenix, AZ",
    isAvailable: true,
  },
  {
    id: "t3",
    truckType: "refrigerated",
    licensePlate: "DEF-9012",
    capacity: 20,
    capacityUnit: "tons",
    currentLocation: "San Diego, CA",
    isAvailable: false,
  },
  {
    id: "t4",
    truckType: "dry_van",
    licensePlate: "GHI-3456",
    capacity: 22,
    capacityUnit: "tons",
    currentLocation: "Las Vegas, NV",
    isAvailable: true,
  },
];

const truckTypeLabels: Record<string, string> = {
  dry_van: "Dry Van",
  flatbed: "Flatbed",
  refrigerated: "Refrigerated",
  tanker: "Tanker",
  container: "Container",
  open_deck: "Open Deck",
};

export default function FleetPage() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [trucks, setTrucks] = useState(mockTrucks);

  const filteredTrucks = trucks.filter((truck) => {
    const matchesSearch =
      truck.licensePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      truck.currentLocation?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || truck.truckType === typeFilter;
    return matchesSearch && matchesType;
  });

  const toggleAvailability = (truckId: string) => {
    setTrucks((prev) =>
      prev.map((t) => (t.id === truckId ? { ...t, isAvailable: !t.isAvailable } : t))
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl font-bold">My Fleet</h1>
          <p className="text-muted-foreground">Manage your trucks and their availability.</p>
        </div>
        <Button onClick={() => navigate("/carrier/add-truck")} data-testid="button-add-new-truck">
          <Plus className="h-4 w-4 mr-2" />
          Add New Truck
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by plate or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-trucks"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-48" data-testid="select-type-filter">
            <Truck className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Truck type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="dry_van">Dry Van</SelectItem>
            <SelectItem value="flatbed">Flatbed</SelectItem>
            <SelectItem value="refrigerated">Refrigerated</SelectItem>
            <SelectItem value="tanker">Tanker</SelectItem>
            <SelectItem value="container">Container</SelectItem>
            <SelectItem value="open_deck">Open Deck</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{trucks.length}</p>
            <p className="text-sm text-muted-foreground">Total Trucks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {trucks.filter((t) => t.isAvailable).length}
            </p>
            <p className="text-sm text-muted-foreground">Available</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {trucks.filter((t) => !t.isAvailable).length}
            </p>
            <p className="text-sm text-muted-foreground">In Use</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">
              {trucks.reduce((sum, t) => sum + t.capacity, 0)}
            </p>
            <p className="text-sm text-muted-foreground">Total Capacity (tons)</p>
          </CardContent>
        </Card>
      </div>

      {filteredTrucks.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No trucks found"
          description={
            trucks.length === 0
              ? "Add your first truck to start receiving load recommendations and bids."
              : "Try adjusting your search or filters."
          }
          actionLabel="Add Your First Truck"
          onAction={() => navigate("/carrier/add-truck")}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTrucks.map((truck) => (
            <Card key={truck.id} className="hover-elevate" data-testid={`truck-card-${truck.id}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Truck className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">{truckTypeLabels[truck.truckType]}</p>
                      <p className="text-sm text-muted-foreground">{truck.licensePlate}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={truck.isAvailable}
                      onCheckedChange={() => toggleAvailability(truck.id)}
                      data-testid={`switch-available-${truck.id}`}
                    />
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Package className="h-4 w-4" />
                      <span>Capacity</span>
                    </div>
                    <span className="font-medium">{truck.capacity} {truck.capacityUnit}</span>
                  </div>
                  {truck.currentLocation && (
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>Location</span>
                      </div>
                      <span className="font-medium">{truck.currentLocation}</span>
                    </div>
                  )}
                </div>

                <Badge
                  className={truck.isAvailable
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 w-full justify-center no-default-hover-elevate no-default-active-elevate"
                    : "bg-muted text-muted-foreground w-full justify-center no-default-hover-elevate no-default-active-elevate"
                  }
                >
                  {truck.isAvailable ? "Available for Loads" : "Currently In Use"}
                </Badge>

                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" className="flex-1" data-testid={`button-edit-${truck.id}`}>
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button variant="ghost" size="icon" data-testid={`button-delete-${truck.id}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
