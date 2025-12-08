import { useState, useRef, useEffect, useCallback } from "react";
import { MapPin, Navigation, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AddressSuggestion {
  id: string;
  city: string;
  state: string;
  fullAddress: string;
  lat: number;
  lng: number;
  type: "city" | "recent" | "popular";
}

const US_CITIES: AddressSuggestion[] = [
  { id: "1", city: "Los Angeles", state: "CA", fullAddress: "Los Angeles, CA", lat: 34.0522, lng: -118.2437, type: "popular" },
  { id: "2", city: "New York", state: "NY", fullAddress: "New York, NY", lat: 40.7128, lng: -74.0060, type: "popular" },
  { id: "3", city: "Chicago", state: "IL", fullAddress: "Chicago, IL", lat: 41.8781, lng: -87.6298, type: "popular" },
  { id: "4", city: "Houston", state: "TX", fullAddress: "Houston, TX", lat: 29.7604, lng: -95.3698, type: "city" },
  { id: "5", city: "Phoenix", state: "AZ", fullAddress: "Phoenix, AZ", lat: 33.4484, lng: -112.0740, type: "popular" },
  { id: "6", city: "Philadelphia", state: "PA", fullAddress: "Philadelphia, PA", lat: 39.9526, lng: -75.1652, type: "city" },
  { id: "7", city: "San Antonio", state: "TX", fullAddress: "San Antonio, TX", lat: 29.4241, lng: -98.4936, type: "city" },
  { id: "8", city: "San Diego", state: "CA", fullAddress: "San Diego, CA", lat: 32.7157, lng: -117.1611, type: "city" },
  { id: "9", city: "Dallas", state: "TX", fullAddress: "Dallas, TX", lat: 32.7767, lng: -96.7970, type: "popular" },
  { id: "10", city: "San Jose", state: "CA", fullAddress: "San Jose, CA", lat: 37.3382, lng: -121.8863, type: "city" },
  { id: "11", city: "Austin", state: "TX", fullAddress: "Austin, TX", lat: 30.2672, lng: -97.7431, type: "city" },
  { id: "12", city: "Jacksonville", state: "FL", fullAddress: "Jacksonville, FL", lat: 30.3322, lng: -81.6557, type: "city" },
  { id: "13", city: "Fort Worth", state: "TX", fullAddress: "Fort Worth, TX", lat: 32.7555, lng: -97.3308, type: "city" },
  { id: "14", city: "Columbus", state: "OH", fullAddress: "Columbus, OH", lat: 39.9612, lng: -82.9988, type: "city" },
  { id: "15", city: "San Francisco", state: "CA", fullAddress: "San Francisco, CA", lat: 37.7749, lng: -122.4194, type: "popular" },
  { id: "16", city: "Charlotte", state: "NC", fullAddress: "Charlotte, NC", lat: 35.2271, lng: -80.8431, type: "city" },
  { id: "17", city: "Indianapolis", state: "IN", fullAddress: "Indianapolis, IN", lat: 39.7684, lng: -86.1581, type: "city" },
  { id: "18", city: "Seattle", state: "WA", fullAddress: "Seattle, WA", lat: 47.6062, lng: -122.3321, type: "popular" },
  { id: "19", city: "Denver", state: "CO", fullAddress: "Denver, CO", lat: 39.7392, lng: -104.9903, type: "popular" },
  { id: "20", city: "Boston", state: "MA", fullAddress: "Boston, MA", lat: 42.3601, lng: -71.0589, type: "popular" },
  { id: "21", city: "El Paso", state: "TX", fullAddress: "El Paso, TX", lat: 31.7619, lng: -106.4850, type: "city" },
  { id: "22", city: "Nashville", state: "TN", fullAddress: "Nashville, TN", lat: 36.1627, lng: -86.7816, type: "city" },
  { id: "23", city: "Detroit", state: "MI", fullAddress: "Detroit, MI", lat: 42.3314, lng: -83.0458, type: "city" },
  { id: "24", city: "Oklahoma City", state: "OK", fullAddress: "Oklahoma City, OK", lat: 35.4676, lng: -97.5164, type: "city" },
  { id: "25", city: "Portland", state: "OR", fullAddress: "Portland, OR", lat: 45.5152, lng: -122.6784, type: "city" },
  { id: "26", city: "Las Vegas", state: "NV", fullAddress: "Las Vegas, NV", lat: 36.1699, lng: -115.1398, type: "popular" },
  { id: "27", city: "Memphis", state: "TN", fullAddress: "Memphis, TN", lat: 35.1495, lng: -90.0490, type: "city" },
  { id: "28", city: "Louisville", state: "KY", fullAddress: "Louisville, KY", lat: 38.2527, lng: -85.7585, type: "city" },
  { id: "29", city: "Baltimore", state: "MD", fullAddress: "Baltimore, MD", lat: 39.2904, lng: -76.6122, type: "city" },
  { id: "30", city: "Milwaukee", state: "WI", fullAddress: "Milwaukee, WI", lat: 43.0389, lng: -87.9065, type: "city" },
  { id: "31", city: "Albuquerque", state: "NM", fullAddress: "Albuquerque, NM", lat: 35.0844, lng: -106.6504, type: "city" },
  { id: "32", city: "Tucson", state: "AZ", fullAddress: "Tucson, AZ", lat: 32.2226, lng: -110.9747, type: "city" },
  { id: "33", city: "Fresno", state: "CA", fullAddress: "Fresno, CA", lat: 36.7378, lng: -119.7871, type: "city" },
  { id: "34", city: "Sacramento", state: "CA", fullAddress: "Sacramento, CA", lat: 38.5816, lng: -121.4944, type: "city" },
  { id: "35", city: "Kansas City", state: "MO", fullAddress: "Kansas City, MO", lat: 39.0997, lng: -94.5786, type: "city" },
  { id: "36", city: "Mesa", state: "AZ", fullAddress: "Mesa, AZ", lat: 33.4152, lng: -111.8315, type: "city" },
  { id: "37", city: "Atlanta", state: "GA", fullAddress: "Atlanta, GA", lat: 33.7490, lng: -84.3880, type: "popular" },
  { id: "38", city: "Long Beach", state: "CA", fullAddress: "Long Beach, CA", lat: 33.7701, lng: -118.1937, type: "city" },
  { id: "39", city: "Colorado Springs", state: "CO", fullAddress: "Colorado Springs, CO", lat: 38.8339, lng: -104.8214, type: "city" },
  { id: "40", city: "Miami", state: "FL", fullAddress: "Miami, FL", lat: 25.7617, lng: -80.1918, type: "popular" },
];

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string, suggestion?: AddressSuggestion) => void;
  placeholder?: string;
  className?: string;
  testId?: string;
}

export function AddressAutocomplete({
  value,
  onChange,
  placeholder = "Enter city or address",
  className,
  testId,
}: AddressAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const searchCities = useCallback((query: string) => {
    if (!query.trim()) {
      const popular = US_CITIES.filter(c => c.type === "popular").slice(0, 5);
      setSuggestions(popular);
      return;
    }

    const q = query.toLowerCase();
    const matches = US_CITIES.filter(
      (city) =>
        city.city.toLowerCase().includes(q) ||
        city.state.toLowerCase().includes(q) ||
        city.fullAddress.toLowerCase().includes(q)
    ).slice(0, 8);

    setSuggestions(matches);
  }, []);

  useEffect(() => {
    searchCities(value);
  }, [value, searchCities]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (suggestion: AddressSuggestion) => {
    onChange(suggestion.fullAddress, suggestion);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
          handleSelect(suggestions[highlightedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const getIcon = (type: AddressSuggestion["type"]) => {
    switch (type) {
      case "recent":
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      case "popular":
        return <Navigation className="h-4 w-4 text-primary" />;
      default:
        return <MapPin className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`pl-9 ${className || ""}`}
          data-testid={testId}
          autoComplete="off"
        />
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md">
          <ScrollArea className="max-h-[240px]">
            <div className="p-1">
              {!value.trim() && (
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  Popular destinations
                </div>
              )}
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion.id}
                  type="button"
                  className={`w-full flex items-center gap-3 px-2 py-2 rounded-md text-left ${
                    index === highlightedIndex
                      ? "bg-accent text-accent-foreground"
                      : "hover-elevate"
                  }`}
                  onClick={() => handleSelect(suggestion)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  data-testid={`address-suggestion-${suggestion.id}`}
                >
                  {getIcon(suggestion.type)}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {suggestion.city}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {suggestion.state}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
          <div className="border-t px-3 py-2 text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            <span>Simulated address suggestions</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function estimateDrivingTime(distanceMiles: number): string {
  const hours = distanceMiles / 55;
  if (hours < 1) {
    return `${Math.round(hours * 60)} mins`;
  } else if (hours < 24) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  } else {
    const days = Math.floor(hours / 10);
    return `${days} day${days > 1 ? "s" : ""}`;
  }
}

export function getRouteInfo(
  originCity: string,
  destCity: string
): { distance: number; duration: string } | null {
  const origin = US_CITIES.find(
    (c) =>
      c.fullAddress.toLowerCase() === originCity.toLowerCase() ||
      c.city.toLowerCase() === originCity.toLowerCase()
  );
  const dest = US_CITIES.find(
    (c) =>
      c.fullAddress.toLowerCase() === destCity.toLowerCase() ||
      c.city.toLowerCase() === destCity.toLowerCase()
  );

  if (!origin || !dest) return null;

  const distance = calculateDistance(origin.lat, origin.lng, dest.lat, dest.lng);
  const roadDistance = Math.round(distance * 1.3);
  const duration = estimateDrivingTime(roadDistance);

  return { distance: roadDistance, duration };
}

export { US_CITIES };
export type { AddressSuggestion };
