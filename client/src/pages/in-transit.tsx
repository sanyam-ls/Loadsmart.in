import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Truck,
  MapPin,
  Gauge,
  Fuel,
  Thermometer,
  Battery,
  Clock,
  AlertTriangle,
  Navigation,
  Activity,
  TrendingUp,
  Zap,
  RotateCcw,
  Radio,
  Box,
  User,
  RefreshCw,
} from "lucide-react";
import type { LiveTelemetryData } from "@shared/schema";

export default function InTransit() {
  const [selectedVehicle, setSelectedVehicle] = useState<LiveTelemetryData | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const { data: vehicles = [], isLoading, refetch, isRefetching } = useQuery<LiveTelemetryData[]>({
    queryKey: ["/api/telemetry/vehicles"],
    refetchInterval: 5000,
  });

  const { data: alertsData = [] } = useQuery<{ vehicleId: string; alert: string }[]>({
    queryKey: ["/api/telemetry/alerts"],
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (vehicles.length > 0) {
      setLastUpdate(new Date());
    }
  }, [vehicles]);

  const alerts = alertsData.map(a => ({ vehicleId: a.vehicleId, alerts: [a.alert] }));

  useEffect(() => {
    if (vehicles.length > 0 && !selectedVehicle) {
      setSelectedVehicle(vehicles[0]);
    } else if (selectedVehicle && vehicles.length > 0) {
      const updated = vehicles.find(v => v.vehicleId === selectedVehicle.vehicleId);
      if (updated) setSelectedVehicle(updated);
    }
  }, [vehicles, selectedVehicle]);

  const getSpeedColor = (speed: number) => {
    if (speed > 100) return "text-red-500";
    if (speed > 80) return "text-yellow-500";
    return "text-green-500";
  };

  const getFuelColor = (level: number) => {
    if (level < 10) return "text-red-500";
    if (level < 25) return "text-yellow-500";
    return "text-green-500";
  };

  const getTempColor = (temp: number) => {
    if (temp > 100) return "text-red-500";
    if (temp > 95) return "text-yellow-500";
    return "text-green-500";
  };

  const getBatteryColor = (voltage: number) => {
    if (voltage < 12) return "text-red-500";
    if (voltage < 12.5) return "text-yellow-500";
    return "text-green-500";
  };

  const vehicleAlerts = alerts.flatMap(a => 
    a.alerts.map(alert => ({ vehicleId: a.vehicleId, message: alert }))
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="flex flex-col h-screen">
        <header className="border-b bg-card px-6 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold">In-Transit Dashboard</h1>
              <p className="text-muted-foreground text-sm">Real-time vehicle telematics and GPS tracking</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant={vehicles.length > 0 ? "default" : "secondary"} className="gap-1">
                <Radio className="w-3 h-3" />
                {isLoading ? "Loading..." : vehicles.length > 0 ? "Live" : "No Data"}
              </Badge>
              {lastUpdate && (
                <span className="text-xs text-muted-foreground">
                  Updated: {lastUpdate.toLocaleTimeString()}
                </span>
              )}
              <Badge variant="outline" className="gap-1">
                <Truck className="w-3 h-3" />
                {vehicles.length} Vehicles
              </Badge>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => refetch()}
                disabled={isRefetching}
                data-testid="button-refresh-telemetry"
              >
                <RefreshCw className={`w-4 h-4 ${isRefetching ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <aside className="w-80 border-r bg-card overflow-hidden flex flex-col">
            <div className="p-4 border-b">
              <h3 className="font-semibold">Active Vehicles</h3>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-2">
                {vehicles.map(vehicle => (
                  <button
                    key={vehicle.vehicleId}
                    onClick={() => setSelectedVehicle(vehicle)}
                    className={`w-full text-left p-3 rounded-md transition-colors hover-elevate active-elevate-2 ${
                      selectedVehicle?.vehicleId === vehicle.vehicleId
                        ? "bg-primary/10 border border-primary/30"
                        : "bg-muted/30"
                    }`}
                    data-testid={`vehicle-card-${vehicle.vehicleId}`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-medium">{vehicle.vehicleId}</span>
                      <Badge
                        variant={vehicle.speed > 0 ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {vehicle.speed > 0 ? "Moving" : "Stopped"}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Gauge className="w-3 h-3" />
                        {vehicle.speed} km/h
                      </div>
                      <div className="flex items-center gap-1">
                        <Fuel className="w-3 h-3" />
                        {vehicle.fuelLevel}%
                      </div>
                      <div className="flex items-center gap-1">
                        <Box className="w-3 h-3" />
                        {vehicle.loadId}
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {vehicle.driverId}
                      </div>
                    </div>
                  </button>
                ))}
                {vehicles.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Truck className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No active vehicles</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </aside>

          <main className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 overflow-auto">
              <div className="lg:col-span-2 space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-primary" />
                      GPS Location
                    </CardTitle>
                    <CardDescription>Real-time vehicle positioning</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selectedVehicle ? (
                      <div className="aspect-[16/9] bg-muted rounded-md relative overflow-hidden">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3">
                              <Navigation className="w-8 h-8 text-primary" style={{ transform: `rotate(${selectedVehicle.heading}deg)` }} />
                            </div>
                            <p className="text-lg font-semibold">
                              {selectedVehicle.gps.lat.toFixed(4)}, {selectedVehicle.gps.lng.toFixed(4)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Heading: {selectedVehicle.heading}
                            </p>
                            <div className="mt-4 px-6">
                              <div className="grid grid-cols-3 gap-4 text-center text-sm">
                                <div className="p-2 bg-background rounded">
                                  <p className="font-semibold">{selectedVehicle.vehicleId}</p>
                                  <p className="text-xs text-muted-foreground">Vehicle</p>
                                </div>
                                <div className="p-2 bg-background rounded">
                                  <p className="font-semibold">{selectedVehicle.driverId}</p>
                                  <p className="text-xs text-muted-foreground">Driver</p>
                                </div>
                                <div className="p-2 bg-background rounded">
                                  <p className="font-semibold">{selectedVehicle.loadId}</p>
                                  <p className="text-xs text-muted-foreground">Load</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="absolute bottom-3 left-3 bg-background/80 backdrop-blur-sm px-3 py-1 rounded text-xs">
                          Live GPS Feed
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-[16/9] bg-muted rounded-md flex items-center justify-center">
                        <p className="text-muted-foreground">Select a vehicle to view location</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {selectedVehicle && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Speed</p>
                            <p className={`text-2xl font-bold ${getSpeedColor(selectedVehicle.speed)}`}>
                              {selectedVehicle.speed}
                            </p>
                            <p className="text-xs text-muted-foreground">km/h</p>
                          </div>
                          <Gauge className={`w-8 h-8 ${getSpeedColor(selectedVehicle.speed)}`} />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">RPM</p>
                            <p className="text-2xl font-bold">{selectedVehicle.rpm}</p>
                            <p className="text-xs text-muted-foreground">revs/min</p>
                          </div>
                          <RotateCcw className="w-8 h-8 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Fuel</p>
                            <p className={`text-2xl font-bold ${getFuelColor(selectedVehicle.fuelLevel)}`}>
                              {selectedVehicle.fuelLevel}%
                            </p>
                            <Progress value={selectedVehicle.fuelLevel} className="h-1.5 mt-1" />
                          </div>
                          <Fuel className={`w-8 h-8 ${getFuelColor(selectedVehicle.fuelLevel)}`} />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Engine Temp</p>
                            <p className={`text-2xl font-bold ${getTempColor(selectedVehicle.engineTemp)}`}>
                              {selectedVehicle.engineTemp}
                            </p>
                            <p className="text-xs text-muted-foreground">Celsius</p>
                          </div>
                          <Thermometer className={`w-8 h-8 ${getTempColor(selectedVehicle.engineTemp)}`} />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {selectedVehicle && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Battery</p>
                            <p className={`text-2xl font-bold ${getBatteryColor(selectedVehicle.batteryVoltage)}`}>
                              {selectedVehicle.batteryVoltage}V
                            </p>
                            <p className="text-xs text-muted-foreground">Voltage</p>
                          </div>
                          <Battery className={`w-8 h-8 ${getBatteryColor(selectedVehicle.batteryVoltage)}`} />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Odometer</p>
                            <p className="text-2xl font-bold">{Math.round(selectedVehicle.odometer).toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">km</p>
                          </div>
                          <TrendingUp className="w-8 h-8 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Load Weight</p>
                            <p className="text-2xl font-bold">{selectedVehicle.loadWeight || 0}</p>
                            <p className="text-xs text-muted-foreground">of {selectedVehicle.maxCapacity || 0} tons</p>
                          </div>
                          <Box className="w-8 h-8 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Ignition</p>
                            <p className="text-2xl font-bold">{selectedVehicle.isIgnitionOn ? "ON" : "OFF"}</p>
                            <p className="text-xs text-muted-foreground">Status</p>
                          </div>
                          <Zap className={`w-8 h-8 ${selectedVehicle.isIgnitionOn ? "text-green-500" : "text-muted-foreground"}`} />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-500" />
                      Active Alerts
                    </CardTitle>
                    <CardDescription>Real-time vehicle alerts</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-48">
                      <div className="space-y-2">
                        {vehicleAlerts.length > 0 ? vehicleAlerts.map((alert, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-md"
                            data-testid={`alert-${idx}`}
                          >
                            <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{alert.message}</p>
                              <p className="text-xs text-muted-foreground">{alert.vehicleId}</p>
                            </div>
                          </div>
                        )) : (
                          <div className="text-center py-6 text-muted-foreground">
                            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No active alerts</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-primary" />
                      Fleet Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Moving</span>
                        <span className="font-semibold text-green-500">
                          {vehicles.filter(v => v.speed > 0).length}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Stopped</span>
                        <span className="font-semibold text-yellow-500">
                          {vehicles.filter(v => v.speed === 0).length}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Low Fuel (&lt;25%)</span>
                        <span className="font-semibold text-red-500">
                          {vehicles.filter(v => v.fuelLevel < 25).length}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">High Temp (&gt;100C)</span>
                        <span className="font-semibold text-red-500">
                          {vehicles.filter(v => v.engineTemp > 100).length}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Avg Speed</span>
                        <span className="font-semibold">
                          {vehicles.length > 0
                            ? Math.round(vehicles.reduce((sum, v) => sum + v.speed, 0) / vehicles.length)
                            : 0} km/h
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {selectedVehicle && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-primary" />
                        Trip Info
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Vehicle ID</span>
                          <span className="font-medium">{selectedVehicle.vehicleId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Driver ID</span>
                          <span className="font-medium">{selectedVehicle.driverId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Load ID</span>
                          <span className="font-medium">{selectedVehicle.loadId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Last Update</span>
                          <span className="font-medium">
                            {new Date(selectedVehicle.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
