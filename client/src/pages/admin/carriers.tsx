import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { 
  Truck, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Edit, 
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Star,
  MapPin,
  Shield,
  ShieldCheck,
  ShieldX,
  ShieldAlert,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
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
import { useAdminData, type AdminCarrier } from "@/lib/admin-data-store";

export default function AdminCarriersPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { carriers, verificationQueue, updateCarrier, verifyCarrier, rejectCarrier, refreshFromShipperPortal } = useAdminData();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activityFilter, setActivityFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<keyof AdminCarrier>("dateJoined");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCarrier, setSelectedCarrier] = useState<AdminCarrier | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [formData, setFormData] = useState({
    companyName: "",
    email: "",
    phone: "",
    fleetSize: "",
    serviceZones: "",
  });
  const itemsPerPage = 10;

  const filteredCarriers = useMemo(() => {
    let result = [...carriers];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(carrier => 
        carrier.companyName?.toLowerCase().includes(query) ||
        carrier.email?.toLowerCase().includes(query) ||
        carrier.serviceZones?.some(z => z.toLowerCase().includes(query))
      );
    }
    
    if (statusFilter !== "all") {
      result = result.filter(carrier => carrier.verificationStatus === statusFilter);
    }
    
    if (activityFilter !== "all") {
      result = result.filter(carrier => carrier.activityLevel === activityFilter);
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
  }, [carriers, searchQuery, statusFilter, activityFilter, sortField, sortDirection]);

  const paginatedCarriers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCarriers.slice(start, start + itemsPerPage);
  }, [filteredCarriers, currentPage]);

  const totalPages = Math.ceil(filteredCarriers.length / itemsPerPage);

  const handleSort = (field: keyof AdminCarrier) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleUpdateCarrier = () => {
    if (selectedCarrier) {
      updateCarrier(selectedCarrier.carrierId, {
        companyName: formData.companyName,
        email: formData.email,
        phone: formData.phone,
        fleetSize: parseInt(formData.fleetSize) || selectedCarrier.fleetSize,
        serviceZones: formData.serviceZones.split(",").map(z => z.trim()).filter(Boolean),
      });
      
      toast({
        title: "Carrier Updated",
        description: `${formData.companyName} has been updated`,
      });
      setIsEditModalOpen(false);
      setSelectedCarrier(null);
    }
  };

  const handleVerifyCarrier = () => {
    if (selectedCarrier) {
      verifyCarrier(selectedCarrier.carrierId);
      toast({
        title: "Carrier Verified",
        description: `${selectedCarrier.companyName} is now verified`,
      });
      setIsVerifyModalOpen(false);
      setSelectedCarrier(null);
    }
  };

  const handleRejectCarrier = () => {
    if (selectedCarrier) {
      rejectCarrier(selectedCarrier.carrierId, rejectReason);
      toast({
        title: "Carrier Rejected",
        description: `${selectedCarrier.companyName} verification rejected`,
      });
      setIsRejectModalOpen(false);
      setSelectedCarrier(null);
      setRejectReason("");
    }
  };

  const openEditModal = (carrier: AdminCarrier) => {
    setSelectedCarrier(carrier);
    setFormData({
      companyName: carrier.companyName || "",
      email: carrier.email || "",
      phone: carrier.phone || "",
      fleetSize: carrier.fleetSize?.toString() || "",
      serviceZones: carrier.serviceZones?.join(", ") || "",
    });
    setIsEditModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified": return <Badge className="bg-green-600"><ShieldCheck className="h-3 w-3 mr-1" />Verified</Badge>;
      case "pending": return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "rejected": return <Badge variant="destructive"><ShieldX className="h-3 w-3 mr-1" />Rejected</Badge>;
      case "expired": return <Badge variant="outline"><ShieldAlert className="h-3 w-3 mr-1" />Expired</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getActivityBadge = (level: string) => {
    switch (level) {
      case "high": return <Badge className="bg-green-600">High</Badge>;
      case "medium": return <Badge variant="secondary">Medium</Badge>;
      case "low": return <Badge variant="outline">Low</Badge>;
      default: return <Badge variant="outline">{level}</Badge>;
    }
  };

  const pendingVerifications = verificationQueue.filter(v => v.entityType === "carrier" && v.status === "pending").length;

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
            <h1 className="text-2xl font-bold">Carriers Management</h1>
          </div>
          <p className="text-muted-foreground ml-10">Manage carrier verification and profiles ({carriers.length} total)</p>
        </div>
        <Button variant="outline" onClick={refreshFromShipperPortal} data-testid="button-sync-carriers">
          <RefreshCw className="h-4 w-4 mr-2" />
          Sync
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Truck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Carriers</p>
                <p className="text-xl font-bold">{carriers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Verified</p>
                <p className="text-xl font-bold">{carriers.filter(c => c.verificationStatus === "verified").length}</p>
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
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-xl font-bold">{carriers.filter(c => c.verificationStatus === "pending").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Fleet</p>
                <p className="text-xl font-bold">{carriers.reduce((sum, c) => sum + c.fleetSize, 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {pendingVerifications > 0 && (
        <Card className="border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-900/10">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldAlert className="h-5 w-5 text-amber-600" />
                <span>{pendingVerifications} carrier(s) awaiting verification</span>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setStatusFilter("pending")}
              >
                View Pending
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search carriers by name, email, or service zone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-carriers"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select value={activityFilter} onValueChange={setActivityFilter}>
                <SelectTrigger className="w-[130px]" data-testid="select-activity-filter">
                  <SelectValue placeholder="Activity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Activity</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 -ml-3"
                      onClick={() => handleSort("companyName")}
                      data-testid="button-sort-name"
                    >
                      Carrier
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 -ml-3"
                      onClick={() => handleSort("fleetSize")}
                      data-testid="button-sort-fleet"
                    >
                      Fleet
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>Service Zones</TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 -ml-3"
                      onClick={() => handleSort("rating")}
                      data-testid="button-sort-rating"
                    >
                      Rating
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCarriers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No carriers found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedCarriers.map((carrier) => (
                    <TableRow 
                      key={carrier.carrierId} 
                      className="cursor-pointer"
                      data-testid={`row-carrier-${carrier.carrierId}`}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                            <Truck className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <div className="font-medium flex items-center gap-2" data-testid={`text-carrier-name-${carrier.carrierId}`}>
                              {carrier.companyName}
                              {carrier.verificationStatus === "verified" && (
                                <Shield className="h-3 w-3 text-primary" />
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">{carrier.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell data-testid={`badge-status-${carrier.carrierId}`}>
                        {getStatusBadge(carrier.verificationStatus)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{carrier.fleetSize} trucks</div>
                          <div className="text-muted-foreground">{carrier.totalDeliveries} deliveries</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {carrier.serviceZones.slice(0, 2).map((zone, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              <MapPin className="h-2 w-2 mr-1" />
                              {zone}
                            </Badge>
                          ))}
                          {carrier.serviceZones.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{carrier.serviceZones.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell data-testid={`text-rating-${carrier.carrierId}`}>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                          <span className="font-medium">{carrier.rating.toFixed(1)}</span>
                          <span className="text-muted-foreground text-sm">({carrier.onTimePercent}% on-time)</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getActivityBadge(carrier.activityLevel)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" data-testid={`button-carrier-actions-${carrier.carrierId}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(carrier);
                            }} data-testid={`menu-edit-${carrier.carrierId}`}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Carrier
                            </DropdownMenuItem>
                            {carrier.verificationStatus === "pending" && (
                              <>
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCarrier(carrier);
                                  setIsVerifyModalOpen(true);
                                }} data-testid={`menu-verify-${carrier.carrierId}`}>
                                  <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                  Approve Verification
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCarrier(carrier);
                                  setIsRejectModalOpen(true);
                                }} data-testid={`menu-reject-${carrier.carrierId}`}>
                                  <XCircle className="h-4 w-4 mr-2 text-red-600" />
                                  Reject Verification
                                </DropdownMenuItem>
                              </>
                            )}
                            {carrier.verificationStatus === "verified" && (
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCarrier(carrier);
                                setIsRejectModalOpen(true);
                              }}>
                                <ShieldX className="h-4 w-4 mr-2" />
                                Revoke Verification
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {filteredCarriers.length > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <p className="text-sm text-muted-foreground" data-testid="text-pagination-info">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredCarriers.length)} of {filteredCarriers.length} carriers
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

      <Dialog open={isEditModalOpen} onOpenChange={(open) => { if (!open) { setIsEditModalOpen(false); setSelectedCarrier(null); } }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Carrier</DialogTitle>
            <DialogDescription>Update carrier profile information</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input 
                value={formData.companyName}
                onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                data-testid="input-company-name" 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input 
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  data-testid="input-email" 
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input 
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  data-testid="input-phone" 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Fleet Size</Label>
              <Input 
                type="number"
                value={formData.fleetSize}
                onChange={(e) => setFormData(prev => ({ ...prev, fleetSize: e.target.value }))}
                data-testid="input-fleet-size" 
              />
            </div>
            <div className="space-y-2">
              <Label>Service Zones (comma-separated)</Label>
              <Textarea 
                value={formData.serviceZones}
                onChange={(e) => setFormData(prev => ({ ...prev, serviceZones: e.target.value }))}
                placeholder="North India, Delhi NCR, Punjab..."
                data-testid="input-service-zones" 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditModalOpen(false); setSelectedCarrier(null); }}>
              Cancel
            </Button>
            <Button onClick={handleUpdateCarrier} data-testid="button-save-carrier">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isVerifyModalOpen} onOpenChange={(open) => { if (!open) { setIsVerifyModalOpen(false); setSelectedCarrier(null); } }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Verify Carrier</DialogTitle>
            <DialogDescription>
              Approve {selectedCarrier?.companyName} as a verified carrier? They will be able to bid on loads and receive assignments.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsVerifyModalOpen(false); setSelectedCarrier(null); }}>
              Cancel
            </Button>
            <Button onClick={handleVerifyCarrier} className="bg-green-600 hover:bg-green-700" data-testid="button-confirm-verify">
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRejectModalOpen} onOpenChange={(open) => { if (!open) { setIsRejectModalOpen(false); setSelectedCarrier(null); setRejectReason(""); } }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Reject Verification</DialogTitle>
            <DialogDescription>
              Reject verification for {selectedCarrier?.companyName}? Please provide a reason.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Reason for Rejection</Label>
            <Textarea 
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Incomplete documentation, invalid insurance..."
              className="mt-2"
              data-testid="input-reject-reason"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsRejectModalOpen(false); setSelectedCarrier(null); setRejectReason(""); }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRejectCarrier} data-testid="button-confirm-reject">
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
