import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { connectMarketplace, disconnectMarketplace, onMarketplaceEvent } from "@/lib/marketplace-socket";
import { useAuth } from "@/lib/auth-context";
import { 
  Package, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Copy,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  MapPin,
  Truck,
  Weight,
  RefreshCw,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  Send,
  Receipt,
  Users,
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAdminData, type AdminLoad, type AdminCarrier } from "@/lib/admin-data-store";
import { format } from "date-fns";

export default function AdminLoadsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { loads, carriers, updateLoad, assignCarrier, updateLoadStatus, refreshFromShipperPortal, addActivity } = useAdminData();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<keyof AdminLoad>("createdDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLoad, setSelectedLoad] = useState<AdminLoad | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isPushModalOpen, setIsPushModalOpen] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [isSendingInvoice, setIsSendingInvoice] = useState(false);
  const [formData, setFormData] = useState({
    pickup: "",
    drop: "",
    weight: "",
    type: "Dry Van",
    status: "Active" as AdminLoad["status"],
  });
  const [selectedCarrierId, setSelectedCarrierId] = useState<string>("");
  const itemsPerPage = 10;
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id && user?.role === "admin") {
      connectMarketplace("admin", user.id);
      
      const unsubLoadUpdate = onMarketplaceEvent("load_updated", (data) => {
        toast({
          title: "Load Updated",
          description: `Load ${data.load?.pickupCity || ""} → ${data.load?.dropoffCity || ""} status changed to ${data.status}`,
        });
        if (typeof window !== "undefined") {
          import("@/lib/queryClient").then(({ queryClient }) => {
            queryClient.invalidateQueries({ queryKey: ['/api/loads'] });
            queryClient.invalidateQueries({ queryKey: ['/api/bids'] });
          });
        }
      });

      const unsubBidReceived = onMarketplaceEvent("bid_received", (data) => {
        toast({
          title: "New Bid Received",
          description: `Carrier submitted a bid for Rs. ${parseFloat(data.bid?.amount || "0").toLocaleString("en-IN")}`,
        });
      });

      return () => {
        unsubLoadUpdate();
        unsubBidReceived();
        disconnectMarketplace();
      };
    }
  }, [user?.id, user?.role, toast]);

  const filteredLoads = useMemo(() => {
    let result = [...loads];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(load => 
        load.loadId?.toLowerCase().includes(query) ||
        load.pickup?.toLowerCase().includes(query) ||
        load.drop?.toLowerCase().includes(query) ||
        load.shipperName?.toLowerCase().includes(query) ||
        load.assignedCarrier?.toLowerCase().includes(query)
      );
    }
    
    if (statusFilter !== "all") {
      result = result.filter(load => load.status === statusFilter);
    }
    
    result.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      const direction = sortDirection === "asc" ? 1 : -1;
      
      if (aVal instanceof Date && bVal instanceof Date) {
        return (aVal.getTime() - bVal.getTime()) * direction;
      }
      
      const aStr = String(aVal || "");
      const bStr = String(bVal || "");
      if (aStr < bStr) return -1 * direction;
      if (aStr > bStr) return 1 * direction;
      return 0;
    });
    
    return result;
  }, [loads, searchQuery, statusFilter, sortField, sortDirection]);

  const paginatedLoads = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLoads.slice(start, start + itemsPerPage);
  }, [filteredLoads, currentPage]);

  const totalPages = Math.ceil(filteredLoads.length / itemsPerPage);

  const handleSort = (field: keyof AdminLoad) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleDuplicateLoad = (load: AdminLoad) => {
    toast({
      title: "Load Duplicated",
      description: `Created a copy of load ${load.loadId}`,
    });
    addActivity({
      type: "load",
      message: `Load ${load.loadId} duplicated`,
      entityId: load.loadId,
      severity: "info",
    });
  };

  const handleDeleteLoad = () => {
    if (selectedLoad) {
      updateLoadStatus(selectedLoad.loadId, "Cancelled");
      toast({
        title: "Load Cancelled",
        description: `Load ${selectedLoad.loadId} has been cancelled`,
      });
      setIsDeleteModalOpen(false);
      setSelectedLoad(null);
    }
  };

  const handleUpdateLoad = () => {
    if (selectedLoad) {
      updateLoad(selectedLoad.loadId, {
        pickup: formData.pickup,
        drop: formData.drop,
        weight: parseInt(formData.weight) || selectedLoad.weight,
        type: formData.type,
        status: formData.status,
      });
      
      toast({
        title: "Load Updated",
        description: `Load ${selectedLoad.loadId} has been updated`,
      });
      setIsEditModalOpen(false);
      setSelectedLoad(null);
    }
  };

  const handleAssignCarrier = () => {
    if (selectedLoad && selectedCarrierId) {
      const carrier = carriers.find(c => c.carrierId === selectedCarrierId);
      if (carrier) {
        assignCarrier(selectedLoad.loadId, carrier.carrierId, carrier.companyName);
        toast({
          title: "Carrier Assigned",
          description: `${carrier.companyName} assigned to load ${selectedLoad.loadId}`,
        });
      }
      setIsAssignModalOpen(false);
      setSelectedLoad(null);
      setSelectedCarrierId("");
    }
  };

  const handleStatusChange = (newStatus: AdminLoad["status"]) => {
    if (selectedLoad) {
      updateLoadStatus(selectedLoad.loadId, newStatus);
      toast({
        title: "Status Updated",
        description: `Load ${selectedLoad.loadId} is now ${newStatus}`,
      });
      setIsStatusModalOpen(false);
      setSelectedLoad(null);
    }
  };

  const handlePushToCarriers = async () => {
    if (!selectedLoad) return;
    
    setIsPushing(true);
    try {
      updateLoadStatus(selectedLoad.loadId, "Bidding");
      addActivity({
        type: "load",
        message: `Load ${selectedLoad.loadId} pushed to carrier marketplace`,
        entityId: selectedLoad.loadId,
        severity: "success",
      });
      
      toast({
        title: "Load Pushed to Carriers",
        description: `Load ${selectedLoad.loadId} is now available for carriers to bid`,
      });
      setIsPushModalOpen(false);
      setSelectedLoad(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to push load to carriers",
        variant: "destructive",
      });
    } finally {
      setIsPushing(false);
    }
  };

  const handleSendInvoice = async (load: AdminLoad) => {
    setIsSendingInvoice(true);
    try {
      addActivity({
        type: "transaction",
        message: `Invoice sent to ${load.shipperName} for load ${load.loadId}`,
        entityId: load.loadId,
        severity: "success",
      });
      
      toast({
        title: "Invoice Sent",
        description: `Invoice for load ${load.loadId} sent to ${load.shipperName}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send invoice",
        variant: "destructive",
      });
    } finally {
      setIsSendingInvoice(false);
    }
  };

  const openEditModal = (load: AdminLoad) => {
    setSelectedLoad(load);
    setFormData({
      pickup: load.pickup || "",
      drop: load.drop || "",
      weight: load.weight?.toString() || "",
      type: load.type || "Dry Van",
      status: load.status,
    });
    setIsEditModalOpen(true);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "Delivered": return "bg-green-600";
      case "En Route": return "bg-blue-600";
      case "Assigned": return "bg-purple-600";
      case "Bidding": return "bg-amber-600";
      case "Active": return "bg-cyan-600";
      case "Cancelled": return "bg-red-600";
      case "Pending": return "bg-gray-600";
      default: return "";
    }
  };

  const formatCurrency = (value: number) => {
    return `Rs. ${value.toLocaleString("en-IN")}`;
  };

  const verifiedCarriers = carriers.filter(c => c.verificationStatus === "verified");

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
        <Button variant="outline" onClick={refreshFromShipperPortal} data-testid="button-sync-loads">
          <RefreshCw className="h-4 w-4 mr-2" />
          Sync from Portal
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-5">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-xl font-bold">{loads.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-xl font-bold">{loads.filter(l => ["Active", "Bidding"].includes(l.status)).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Truck className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">In Transit</p>
                <p className="text-xl font-bold">{loads.filter(l => l.status === "En Route").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Delivered</p>
                <p className="text-xl font-bold">{loads.filter(l => l.status === "Delivered").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Revenue</p>
                <p className="text-xl font-bold">Rs. {(loads.reduce((sum, l) => sum + l.spending, 0) / 100000).toFixed(1)}L</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by Load ID, route, shipper, or carrier..."
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
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Bidding">Bidding</SelectItem>
                <SelectItem value="Assigned">Assigned</SelectItem>
                <SelectItem value="En Route">In Transit</SelectItem>
                <SelectItem value="Delivered">Delivered</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 -ml-3"
                      onClick={() => handleSort("loadId")}
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
                      onClick={() => handleSort("spending")}
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
                      key={load.loadId} 
                      className="cursor-pointer hover-elevate"
                      onClick={() => setLocation(`/admin/loads/${load.loadId}`)}
                      data-testid={`row-load-${load.loadId}`}
                    >
                      <TableCell className="font-mono font-medium" data-testid={`text-load-id-${load.loadId}`}>
                        {load.loadId}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium" data-testid={`text-shipper-${load.loadId}`}>
                            {load.shipperName}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {format(load.createdDate, "MMM d, yyyy")}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2" data-testid={`text-route-${load.loadId}`}>
                          <MapPin className="h-3 w-3 text-green-500" />
                          <span className="text-sm">{load.pickup}</span>
                          <span className="text-muted-foreground">-</span>
                          <MapPin className="h-3 w-3 text-red-500" />
                          <span className="text-sm">{load.drop}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm space-y-1">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Weight className="h-3 w-3" />
                            {load.weight?.toLocaleString()} {load.weightUnit}
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Truck className="h-3 w-3" />
                            {load.type}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={`${getStatusBadgeColor(load.status)} cursor-pointer`} 
                          data-testid={`badge-status-${load.loadId}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLoad(load);
                            setIsStatusModalOpen(true);
                          }}
                        >
                          {load.status}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`text-carrier-${load.loadId}`}>
                        {load.assignedCarrier ? (
                          <span className="text-sm">{load.assignedCarrier}</span>
                        ) : (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLoad(load);
                              setIsAssignModalOpen(true);
                            }}
                          >
                            <UserPlus className="h-3 w-3 mr-1" />
                            Assign
                          </Button>
                        )}
                      </TableCell>
                      <TableCell data-testid={`text-price-${load.loadId}`}>
                        <div className="text-sm font-medium">{formatCurrency(load.spending)}</div>
                        {load.bidCount > 0 && (
                          <div className="text-xs text-muted-foreground">{load.bidCount} bids</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" data-testid={`button-load-actions-${load.loadId}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(load);
                            }} data-testid={`menu-edit-${load.loadId}`}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Load
                            </DropdownMenuItem>
                            {!load.assignedCarrier && (
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLoad(load);
                                setIsAssignModalOpen(true);
                              }} data-testid={`menu-assign-${load.loadId}`}>
                                <UserPlus className="h-4 w-4 mr-2" />
                                Assign Carrier
                              </DropdownMenuItem>
                            )}
                            {!load.assignedCarrier && load.status !== "Bidding" && (
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLoad(load);
                                setIsPushModalOpen(true);
                              }} data-testid={`menu-push-${load.loadId}`}>
                                <Users className="h-4 w-4 mr-2" />
                                Push to Carriers
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleSendInvoice(load);
                            }} data-testid={`menu-invoice-${load.loadId}`}>
                              <Receipt className="h-4 w-4 mr-2" />
                              Send Invoice
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLoad(load);
                              setIsStatusModalOpen(true);
                            }}>
                              <AlertCircle className="h-4 w-4 mr-2" />
                              Change Status
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicateLoad(load);
                            }} data-testid={`menu-duplicate-${load.loadId}`}>
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
                              data-testid={`menu-delete-${load.loadId}`}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Cancel Load
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
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Load</DialogTitle>
            <DialogDescription>Update load information. Changes sync to Shipper Portal.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pickup Location</Label>
                <Input 
                  value={formData.pickup}
                  onChange={(e) => setFormData(prev => ({ ...prev, pickup: e.target.value }))}
                  data-testid="input-pickup" 
                />
              </div>
              <div className="space-y-2">
                <Label>Drop Location</Label>
                <Input 
                  value={formData.drop}
                  onChange={(e) => setFormData(prev => ({ ...prev, drop: e.target.value }))}
                  data-testid="input-drop" 
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Weight (lbs)</Label>
                <Input 
                  type="number" 
                  value={formData.weight}
                  onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
                  data-testid="input-weight" 
                />
              </div>
              <div className="space-y-2">
                <Label>Truck Type</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData(prev => ({ ...prev, type: v }))}>
                  <SelectTrigger data-testid="select-truck-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dry Van">Dry Van</SelectItem>
                    <SelectItem value="Flatbed">Flatbed</SelectItem>
                    <SelectItem value="Refrigerated">Refrigerated</SelectItem>
                    <SelectItem value="Tanker">Tanker</SelectItem>
                    <SelectItem value="Container">Container</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v as AdminLoad["status"] }))}>
                <SelectTrigger data-testid="select-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Bidding">Bidding</SelectItem>
                  <SelectItem value="Assigned">Assigned</SelectItem>
                  <SelectItem value="En Route">In Transit</SelectItem>
                  <SelectItem value="Delivered">Delivered</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditModalOpen(false); setSelectedLoad(null); }} data-testid="button-cancel-edit">
              Cancel
            </Button>
            <Button onClick={handleUpdateLoad} data-testid="button-save-load">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAssignModalOpen} onOpenChange={(open) => { if (!open) { setIsAssignModalOpen(false); setSelectedLoad(null); setSelectedCarrierId(""); } }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Assign Carrier</DialogTitle>
            <DialogDescription>
              Select a verified carrier to assign to load {selectedLoad?.loadId}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <Label>Select Carrier</Label>
              <Select value={selectedCarrierId} onValueChange={setSelectedCarrierId}>
                <SelectTrigger data-testid="select-carrier">
                  <SelectValue placeholder="Choose a carrier..." />
                </SelectTrigger>
                <SelectContent>
                  {verifiedCarriers.map((carrier) => (
                    <SelectItem key={carrier.carrierId} value={carrier.carrierId}>
                      <div className="flex items-center justify-between w-full gap-4">
                        <span>{carrier.companyName}</span>
                        <Badge variant="secondary" className="text-xs">
                          {carrier.rating.toFixed(1)} rating
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedCarrierId && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                {(() => {
                  const carrier = carriers.find(c => c.carrierId === selectedCarrierId);
                  return carrier ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Fleet Size</span>
                        <span className="font-medium">{carrier.fleetSize} trucks</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">On-Time</span>
                        <span className="font-medium">{carrier.onTimePercent}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Deliveries</span>
                        <span className="font-medium">{carrier.totalDeliveries}</span>
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAssignModalOpen(false); setSelectedLoad(null); setSelectedCarrierId(""); }}>
              Cancel
            </Button>
            <Button onClick={handleAssignCarrier} disabled={!selectedCarrierId} data-testid="button-confirm-assign">
              Assign Carrier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isStatusModalOpen} onOpenChange={(open) => { if (!open) { setIsStatusModalOpen(false); setSelectedLoad(null); } }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Change Load Status</DialogTitle>
            <DialogDescription>
              Update status for load {selectedLoad?.loadId}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            {(["Pending", "Active", "Bidding", "Assigned", "En Route", "Delivered", "Cancelled"] as AdminLoad["status"][]).map((status) => (
              <Button
                key={status}
                variant={selectedLoad?.status === status ? "default" : "outline"}
                className="w-full justify-start"
                onClick={() => handleStatusChange(status)}
              >
                <Badge className={`${getStatusBadgeColor(status)} mr-2`}>{status}</Badge>
                {status === selectedLoad?.status && "(Current)"}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Cancel Load</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel load {selectedLoad?.loadId}? This will update the status to Cancelled.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} data-testid="button-cancel-delete">
              Keep Load
            </Button>
            <Button variant="destructive" onClick={handleDeleteLoad} data-testid="button-confirm-delete">
              Cancel Load
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPushModalOpen} onOpenChange={(open) => { if (!open) { setIsPushModalOpen(false); setSelectedLoad(null); } }}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Push Load to Carriers
            </DialogTitle>
            <DialogDescription>
              Make load {selectedLoad?.loadId} available to all carriers for bidding.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedLoad && (
              <div className="space-y-3 p-4 bg-muted rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Route</span>
                  <span className="font-medium">{selectedLoad.pickup} - {selectedLoad.drop}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipper</span>
                  <span className="font-medium">{selectedLoad.shipperName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Price</span>
                  <span className="font-medium">{formatCurrency(selectedLoad.spending)}</span>
                </div>
              </div>
            )}
            <p className="mt-4 text-sm text-muted-foreground">
              Once pushed, carriers will be able to view and bid on this load in their marketplace.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsPushModalOpen(false); setSelectedLoad(null); }}>
              Cancel
            </Button>
            <Button onClick={handlePushToCarriers} disabled={isPushing} data-testid="button-confirm-push">
              {isPushing ? "Pushing..." : "Push to Carriers"}
              <Send className="h-4 w-4 ml-2" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
