import { useState } from "react";
import { Search, Filter, MapPin, Truck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CarrierCard } from "@/components/carrier-card";
import { EmptyState } from "@/components/empty-state";
import type { User, CarrierProfile } from "@shared/schema";

type CarrierWithProfile = User & { carrierProfile: CarrierProfile | null };

const mockCarriers: CarrierWithProfile[] = [
  {
    id: "c1",
    username: "fasthaullogistics",
    email: "contact@fasthaul.com",
    password: "",
    role: "carrier",
    companyName: "FastHaul Logistics",
    phone: "(555) 123-4567",
    avatar: null,
    isVerified: true,
    createdAt: new Date(),
    carrierProfile: {
      id: "cp1",
      userId: "c1",
      fleetSize: 24,
      serviceZones: ["California", "Arizona", "Nevada", "Utah"],
      reliabilityScore: "4.8",
      communicationScore: "4.9",
      onTimeScore: "4.7",
      totalDeliveries: 234,
      badgeLevel: "gold",
      bio: "Premium freight solutions with nationwide coverage.",
    },
  },
  {
    id: "c2",
    username: "swifttransport",
    email: "hello@swift.com",
    password: "",
    role: "carrier",
    companyName: "Swift Transport",
    phone: "(555) 234-5678",
    avatar: null,
    isVerified: true,
    createdAt: new Date(),
    carrierProfile: {
      id: "cp2",
      userId: "c2",
      fleetSize: 18,
      serviceZones: ["Texas", "Oklahoma", "Louisiana", "Arkansas"],
      reliabilityScore: "4.6",
      communicationScore: "4.8",
      onTimeScore: "4.5",
      totalDeliveries: 189,
      badgeLevel: "silver",
      bio: "Reliable freight services across the South.",
    },
  },
  {
    id: "c3",
    username: "premierfreight",
    email: "info@premier.com",
    password: "",
    role: "carrier",
    companyName: "Premier Freight",
    phone: "(555) 345-6789",
    avatar: null,
    isVerified: true,
    createdAt: new Date(),
    carrierProfile: {
      id: "cp3",
      userId: "c3",
      fleetSize: 12,
      serviceZones: ["Washington", "Oregon", "Idaho"],
      reliabilityScore: "4.9",
      communicationScore: "4.7",
      onTimeScore: "4.9",
      totalDeliveries: 156,
      badgeLevel: "platinum",
      bio: "Pacific Northwest specialists.",
    },
  },
  {
    id: "c4",
    username: "megahaul",
    email: "contact@megahaul.com",
    password: "",
    role: "carrier",
    companyName: "MegaHaul Express",
    phone: "(555) 456-7890",
    avatar: null,
    isVerified: false,
    createdAt: new Date(),
    carrierProfile: {
      id: "cp4",
      userId: "c4",
      fleetSize: 8,
      serviceZones: ["Florida", "Georgia", "Alabama"],
      reliabilityScore: "4.3",
      communicationScore: "4.4",
      onTimeScore: "4.2",
      totalDeliveries: 78,
      badgeLevel: "bronze",
      bio: "Growing fleet serving the Southeast.",
    },
  },
];

export default function CarriersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [badgeFilter, setBadgeFilter] = useState("all");

  const allZones = Array.from(
    new Set(mockCarriers.flatMap((c) => c.carrierProfile?.serviceZones || []))
  ).sort();

  const filteredCarriers = mockCarriers.filter((carrier) => {
    const matchesSearch =
      carrier.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      carrier.carrierProfile?.serviceZones?.some((z) =>
        z.toLowerCase().includes(searchQuery.toLowerCase())
      );
    const matchesZone =
      zoneFilter === "all" ||
      carrier.carrierProfile?.serviceZones?.includes(zoneFilter);
    const matchesBadge =
      badgeFilter === "all" || carrier.carrierProfile?.badgeLevel === badgeFilter;
    return matchesSearch && matchesZone && matchesBadge;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Carrier Directory</h1>
        <p className="text-muted-foreground">
          Browse verified carriers and request quotes for your shipments.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or service zone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-carriers"
          />
        </div>
        <Select value={zoneFilter} onValueChange={setZoneFilter}>
          <SelectTrigger className="w-full sm:w-48" data-testid="select-zone-filter">
            <MapPin className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Service zone" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Zones</SelectItem>
            {allZones.map((zone) => (
              <SelectItem key={zone} value={zone}>
                {zone}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={badgeFilter} onValueChange={setBadgeFilter}>
          <SelectTrigger className="w-full sm:w-40" data-testid="select-badge-filter">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Badge level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="platinum">Platinum</SelectItem>
            <SelectItem value="gold">Gold</SelectItem>
            <SelectItem value="silver">Silver</SelectItem>
            <SelectItem value="bronze">Bronze</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredCarriers.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No carriers found"
          description="Try adjusting your search or filters to find carriers that match your needs."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCarriers.map((carrier) => (
            <CarrierCard
              key={carrier.id}
              carrier={carrier}
              onViewProfile={() => {}}
              onRequestQuote={() => {}}
              onChat={() => {}}
            />
          ))}
        </div>
      )}
    </div>
  );
}
