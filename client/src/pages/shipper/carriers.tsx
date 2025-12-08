import { useState, useMemo } from "react";
import { Search, Filter, MapPin, Truck, SortAsc, SortDesc } from "lucide-react";
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
import { CarrierProfileModal } from "@/components/carrier-profile-modal";
import { RequestQuotePanel } from "@/components/request-quote-panel";
import { EmptyState } from "@/components/empty-state";
import { mockCarriers, getAllZones, type ExtendedCarrier } from "@/lib/carrier-data";

type SortOption = "rating" | "fleet" | "deliveries" | "name";
type SortOrder = "asc" | "desc";

export default function CarriersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [badgeFilter, setBadgeFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortOption>("rating");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  
  const [selectedCarrier, setSelectedCarrier] = useState<ExtendedCarrier | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);

  const allZones = getAllZones();

  const filteredAndSortedCarriers = useMemo(() => {
    let result = mockCarriers.filter((carrier) => {
      const matchesSearch =
        carrier.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        carrier.carrierProfile?.serviceZones?.some((z: string) =>
          z.toLowerCase().includes(searchQuery.toLowerCase())
        );
      const matchesZone =
        zoneFilter === "all" ||
        carrier.carrierProfile?.serviceZones?.includes(zoneFilter);
      const matchesBadge =
        badgeFilter === "all" || carrier.carrierProfile?.badgeLevel === badgeFilter;
      return matchesSearch && matchesZone && matchesBadge;
    });

    result.sort((a, b) => {
      let aVal: number, bVal: number;
      
      switch (sortBy) {
        case "rating":
          aVal = Number(a.carrierProfile?.reliabilityScore || 0);
          bVal = Number(b.carrierProfile?.reliabilityScore || 0);
          break;
        case "fleet":
          aVal = a.carrierProfile?.fleetSize || 0;
          bVal = b.carrierProfile?.fleetSize || 0;
          break;
        case "deliveries":
          aVal = a.carrierProfile?.totalDeliveries || 0;
          bVal = b.carrierProfile?.totalDeliveries || 0;
          break;
        case "name":
          return sortOrder === "asc" 
            ? (a.companyName || "").localeCompare(b.companyName || "")
            : (b.companyName || "").localeCompare(a.companyName || "");
        default:
          aVal = 0;
          bVal = 0;
      }
      
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    });

    return result;
  }, [searchQuery, zoneFilter, badgeFilter, sortBy, sortOrder]);

  const handleViewProfile = (carrier: ExtendedCarrier) => {
    setSelectedCarrier(carrier);
    setProfileModalOpen(true);
  };

  const handleRequestQuote = (carrier: ExtendedCarrier) => {
    setSelectedCarrier(carrier);
    setQuoteModalOpen(true);
  };

  const handleRequestQuoteFromProfile = () => {
    setProfileModalOpen(false);
    setQuoteModalOpen(true);
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === "asc" ? "desc" : "asc");
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Carrier Directory</h1>
        <p className="text-muted-foreground">
          Browse verified carriers and request quotes for your shipments.
        </p>
      </div>

      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
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
        
        <div className="flex items-center gap-2 justify-between flex-wrap">
          <p className="text-sm text-muted-foreground">
            Showing {filteredAndSortedCarriers.length} of {mockCarriers.length} carriers
          </p>
          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-36" data-testid="select-sort-by">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rating">Rating</SelectItem>
                <SelectItem value="fleet">Fleet Size</SelectItem>
                <SelectItem value="deliveries">Deliveries</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={toggleSortOrder}
              data-testid="button-sort-order"
            >
              {sortOrder === "desc" ? (
                <SortDesc className="h-4 w-4" />
              ) : (
                <SortAsc className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {filteredAndSortedCarriers.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No carriers found"
          description="Try adjusting your search or filters to find carriers that match your needs."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedCarriers.map((carrier) => (
            <CarrierCard
              key={carrier.id}
              carrier={carrier}
              onViewProfile={() => handleViewProfile(carrier)}
              onRequestQuote={() => handleRequestQuote(carrier)}
              onChat={() => {}}
            />
          ))}
        </div>
      )}

      <CarrierProfileModal
        carrier={selectedCarrier}
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        onRequestQuote={handleRequestQuoteFromProfile}
      />

      <RequestQuotePanel
        carrier={selectedCarrier}
        open={quoteModalOpen}
        onClose={() => setQuoteModalOpen(false)}
      />
    </div>
  );
}
