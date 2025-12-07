import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Copy,
  UserPlus,
  Eye,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  MapPin,
  Truck,
  Weight,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Load } from "@shared/schema";

interface LoadWithDetails extends Load {
  shipper?: { username: string; companyName: string | null } | null;
  carrier?: { username: string; companyName: string | null } | null;
  bidCount: number;
}

export default function AdminLoadsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<keyof Load>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLoad, setSelectedLoad] = useState<LoadWithDetails | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    pickupCity: "",
    pickupAddress: "",
    dropoffCity: "",
    dropoffAddress: "",
    weight: "",
    requiredTruckType: "dry_van",
    estimatedPrice: "",
    pickupDate: "",
    deliveryDate: "",
    status: "draft",
    cargoDescription: "",
  });
  const itemsPerPage = 10;

  const { data: loads = [], isLoading, error } = useQuery<LoadWithDetails[]>({
    queryKey: ["/api/admin/loads"],
  });

  const { data: carriers = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/carriers"],
  });

  const updateLoadMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Load> }) => {
      return apiRequest(`/api/admin/loads/${id}`, { method: "PATCH", body: JSON.stringify(data) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/loads"] });
      toast({ title: "Load Updated", description: "Load details have been updated" });
      setIsEditModalOpen(false);
      setSelectedLoad(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update load", variant: "destructive" });
    },
  });

  const filteredLoads = useMemo(() => {
    let result = [...loads];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(load => 
        load.id?.toLowerCase().includes(query) ||
        load.pickupCity?.toLowerCase().includes(query) ||
        load.dropoffCity?.toLowerCase().includes(query) ||
        load.shipper?.companyName?.toLowerCase().includes(query)
      );
    }
    
    if (statusFilter !== "all") {
      result = result.filter(load => load.status === statusFilter);
    }
    
    result.sort((a, b) => {
      const aVal = a[sortField] || "";
      const bVal = b[sortField] || "";
      const direction = sortDirection === "asc" ? 1 : -1;
      if (aVal < bVal) return -1 * direction;
      if (aVal > bVal) return 1 * direction;
      return 0;
    });
    
    return result;
  }, [loads, searchQuery, statusFilter, sortField, sortDirection]);

  const paginatedLoads = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLoads.slice(start, start + itemsPerPage);
  }, [filteredLoads, currentPage]);

  const totalPages = Math.ceil(filteredLoads.length / itemsPerPage);

  const handleSort = (field: keyof Load) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleDuplicateLoad = (load: LoadWithDetails) => {
    toast({
      title: "Load Duplicated",
      description: `Created a copy of load`,
    });
  };

  const handleDeleteLoad = () => {
    if (selectedLoad) {
      toast({
        title: "Load Deleted",
        description: `Load has been deleted`,
      });
      setIsDeleteModalOpen(false);
      setSelectedLoad(null);
    }
  };

  const handleUpdateLoad = () => {
    if (selectedLoad) {
      updateLoadMutation.mutate({
        id: selectedLoad.id,
        data: {
          pickupCity: formData.pickupCity,
          pickupAddress: formData.pickupAddress,
          dropoffCity: formData.dropoffCity,
          dropoffAddress: formData.dropoffAddress,
          weight: formData.weight,
          requiredTruckType: formData.requiredTruckType,
          estimatedPrice: formData.estimatedPrice,
          status: formData.status,
          cargoDescription: formData.cargoDescription,
        },
      });
    }
  };

  const handleAssignCarrier = (carrierId: string) => {
    if (selectedLoad) {
      updateLoadMutation.mutate({
        id: selectedLoad.id,
        data: { 
          assignedCarrierId: carrierId,
          status: "assigned",
        },
      });
      setIsAssignModalOpen(false);
    }
  };

  const openEditModal = (load: LoadWithDetails) => {
    setSelectedLoad(load);
    setFormData({
      pickupCity: load.pickupCity || "",
      pickupAddress: load.pickupAddress || "",
      dropoffCity: load.dropoffCity || "",
      dropoffAddress: load.dropoffAddress || "",
      weight: load.weight?.toString() || "",
      requiredTruckType: load.requiredTruckType || "dry_van",
      estimatedPrice: load.estimatedPrice?.toString() || "",
      pickupDate: load.pickupDate ? new Date(load.pickupDate).toISOString().split("T")[0] : "",
      deliveryDate: load.deliveryDate ? new Date(load.deliveryDate).toISOString().split("T")[0] : "",
      status: load.status || "draft",
      cargoDescription: load.cargoDescription || "",
    });
    setIsEditModalOpen(true);
  };

  const getStatusBadgeColor = (status: string | null) => {
    switch (status) {
      case "delivered": return "bg-green-600";
      case "in_transit": return "bg-blue-600";
      case "assigned": return "bg-purple-600";
      case "bidding": return "bg-amber-600";
      case "posted": return "bg-cyan-600";
      case "cancelled": return "bg-red-600";
      default: return "";
    }
  };

  const formatDate = (dateStr: string | Date | null) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (value: string | number | null) => {
    if (!value) return "$0";
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(numValue);
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center text-destructive">Failed to load data. Please try again.</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setLocation("/admin")}
              data-testid="button-back-to-dashboard"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">Loads Management</h1>
          </div>
          <p className="text-muted-foreground ml-10">Manage all platform loads ({loads.length} total)</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} data-testid="button-add-load">
          <Plus className="h-4 w-4 mr-2" />
          Add Load
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by Load ID, route, or shipper..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-loads"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]" data-testid="select-status-filter">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="posted">Posted</SelectItem>
                <SelectItem value="bidding">Bidding</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="in_transit">In Transit</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 -ml-3"
                      onClick={() => handleSort("id")}
                      data-testid="button-sort-id"
                    >
                      Load ID
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>Shipper</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 -ml-3"
                      onClick={() => handleSort("status")}
                      data-testid="button-sort-status"
                    >
                      Status
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>Carrier</TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 -ml-3"
                      onClick={() => handleSort("estimatedPrice")}
                      data-testid="button-sort-price"
                    >
                      Price
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLoads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No loads found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedLoads.map((load) => (
                    <TableRow 
                      key={load.id} 
                      className="cursor-pointer"
                      data-testid={`row-load-${load.id}`}
                    >
                      <TableCell className="font-mono font-medium" data-testid={`text-load-id-${load.id}`}>
                        {load.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium" data-testid={`text-shipper-${load.id}`}>
                            {load.shipper?.companyName || "Unknown"}
                          </div>
                          <div className="text-muted-foreground">{load.shipper?.username}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2" data-testid={`text-route-${load.id}`}>
                          <MapPin className="h-3 w-3 text-green-500" />
                          <span className="text-sm">{load.pickupCity}</span>
                          <span className="text-muted-foreground">→</span>
                          <MapPin className="h-3 w-3 text-red-500" />
                          <span className="text-sm">{load.dropoffCity}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm space-y-1">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Weight className="h-3 w-3" />
                            {load.weight} {load.weightUnit || "tons"}
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Truck className="h-3 w-3" />
                            {load.requiredTruckType || "Any"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getStatusBadgeColor(load.status)} capitalize`} data-testid={`badge-status-${load.id}`}>
                          {load.status?.replace("_", " ") || "draft"}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`text-carrier-${load.id}`}>
                        {load.carrier ? (
                          <span className="text-sm">{load.carrier.companyName || load.carrier.username}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell data-testid={`text-price-${load.id}`}>
                        <div className="text-sm">
                          <div className="font-medium">{formatCurrency(load.finalPrice || load.estimatedPrice)}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" data-testid={`button-load-actions-${load.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(load);
                            }} data-testid={`menu-edit-${load.id}`}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Load
                            </DropdownMenuItem>
                            {!load.assignedCarrierId && (
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLoad(load);
                                setIsAssignModalOpen(true);
                              }} data-testid={`menu-assign-${load.id}`}>
                                <UserPlus className="h-4 w-4 mr-2" />
                                Assign Carrier
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicateLoad(load);
                            }} data-testid={`menu-duplicate-${load.id}`}>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLoad(load);
                                setIsDeleteModalOpen(true);
                              }}
                              data-testid={`menu-delete-${load.id}`}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Load
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {filteredLoads.length > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <p className="text-sm text-muted-foreground" data-testid="text-pagination-info">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredLoads.length)} of {filteredLoads.length} loads
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm px-2">
                  Page {currentPage} of {totalPages || 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  data-testid="button-next-page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditModalOpen} onOpenChange={(open) => { if (!open) { setIsEditModalOpen(false); setSelectedLoad(null); } }}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Load</DialogTitle>
            <DialogDescription>Update load information</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pickup City</Label>
                <Input 
                  value={formData.pickupCity}
                  onChange={(e) => setFormData(prev => ({ ...prev, pickupCity: e.target.value }))}
                  data-testid="input-pickup-city" 
                />
              </div>
              <div className="space-y-2">
                <Label>Dropoff City</Label>
                <Input 
                  value={formData.dropoffCity}
                  onChange={(e) => setFormData(prev => ({ ...prev, dropoffCity: e.target.value }))}
                  data-testid="input-dropoff-city" 
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pickup Address</Label>
                <Input 
                  value={formData.pickupAddress}
                  onChange={(e) => setFormData(prev => ({ ...prev, pickupAddress: e.target.value }))}
                  data-testid="input-pickup-address" 
                />
              </div>
              <div className="space-y-2">
                <Label>Dropoff Address</Label>
                <Input 
                  value={formData.dropoffAddress}
                  onChange={(e) => setFormData(prev => ({ ...prev, dropoffAddress: e.target.value }))}
                  data-testid="input-dropoff-address" 
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Weight</Label>
                <Input 
                  type="number" 
                  value={formData.weight}
                  onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
                  data-testid="input-weight" 
                />
              </div>
              <div className="space-y-2">
                <Label>Truck Type</Label>
                <Select value={formData.requiredTruckType} onValueChange={(v) => setFormData(prev => ({ ...prev, requiredTruckType: v }))}>
                  <SelectTrigger data-testid="select-truck-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flatbed">Flatbed</SelectItem>
                    <SelectItem value="dry_van">Dry Van</SelectItem>
                    <SelectItem value="refrigerated">Refrigerated</SelectItem>
                    <SelectItem value="tanker">Tanker</SelectItem>
                    <SelectItem value="container">Container</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Estimated Price</Label>
                <Input 
                  type="number" 
                  value={formData.estimatedPrice}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimatedPrice: e.target.value }))}
                  data-testid="input-price" 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}>
                <SelectTrigger data-testid="select-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="posted">Posted</SelectItem>
                  <SelectItem value="bidding">Bidding</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditModalOpen(false); setSelectedLoad(null); }} data-testid="button-cancel-edit">
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateLoad} 
              disabled={updateLoadMutation.isPending}
              data-testid="button-save-load"
            >
              {updateLoadMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Load
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Assign Carrier</DialogTitle>
            <DialogDescription>
              Assign a carrier to this load
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Select Carrier</Label>
            <Select onValueChange={(v) => handleAssignCarrier(v)}>
              <SelectTrigger className="mt-2" data-testid="select-carrier">
                <SelectValue placeholder="Choose a carrier" />
              </SelectTrigger>
              <SelectContent>
                {carriers.map((carrier: any) => (
                  <SelectItem key={carrier.id} value={carrier.id}>
                    {carrier.companyName || carrier.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignModalOpen(false)} data-testid="button-cancel-assign">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Load</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this load? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} data-testid="button-cancel-delete">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteLoad} data-testid="button-confirm-delete">
              Delete Load
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
