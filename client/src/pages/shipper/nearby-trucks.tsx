import { useState } from "react";
import { useLocation } from "wouter";
import { Truck, ArrowLeft, MapPin, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NearbyTrucks } from "@/components/nearby-trucks";
import { useMockData } from "@/lib/mock-data-store";

export default function NearbyTrucksPage() {
  const [, navigate] = useLocation();
  const { getActiveLoads } = useMockData();
  const activeLoads = getActiveLoads();
  const [selectedLoadId, setSelectedLoadId] = useState<string | null>(
    activeLoads[0]?.loadId || null
  );

  const selectedLoad = activeLoads.find(l => l.loadId === selectedLoadId);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 flex-wrap">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate("/shipper")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="h-6 w-6" />
            Find Nearby Trucks
          </h1>
          <p className="text-muted-foreground">
            Discover available trucks near your pickup locations
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Package className="h-4 w-4" />
            Select a Load
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeLoads.length === 0 ? (
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No active loads to search for trucks.</p>
              <Button 
                className="mt-4"
                onClick={() => navigate("/shipper/post-load")}
                data-testid="button-post-load"
              >
                Post a New Load
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Select value={selectedLoadId || ""} onValueChange={setSelectedLoadId}>
                <SelectTrigger data-testid="select-load">
                  <SelectValue placeholder="Select a load to find nearby trucks" />
                </SelectTrigger>
                <SelectContent>
                  {activeLoads.map(load => (
                    <SelectItem key={load.loadId} value={load.loadId}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{load.loadId}</span>
                        <span className="text-muted-foreground">|</span>
                        <span className="text-sm">{load.pickup}</span>
                        <span className="text-muted-foreground">to</span>
                        <span className="text-sm">{load.drop}</span>
                        <Badge variant="outline" className="ml-2">{load.type}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedLoad && (
                <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-md flex-wrap">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="text-sm">{selectedLoad.pickup}</span>
                    <span className="text-muted-foreground">to</span>
                    <span className="text-sm">{selectedLoad.drop}</span>
                  </div>
                  <Badge>{selectedLoad.type}</Badge>
                  <Badge variant="outline">{selectedLoad.weight.toLocaleString()} {selectedLoad.weightUnit}</Badge>
                  <Badge variant="secondary">{selectedLoad.status}</Badge>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedLoad && (
        <NearbyTrucks load={selectedLoad} />
      )}
    </div>
  );
}
