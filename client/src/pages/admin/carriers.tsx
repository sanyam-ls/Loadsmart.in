import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Truck, 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Edit, 
  Eye,
  FileText,
  Shield,
  ShieldCheck,
  ShieldX,
  Star,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Upload,
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { User, CarrierProfile } from "@shared/schema";

interface CarrierWithDetails extends Omit<User, "password"> {
  profile?: CarrierProfile | null;
  bidCount: number;
  documentCount: number;
}

export default function AdminCarriersPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<string>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCarrier, setSelectedCarrier] = useState<CarrierWithDetails | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    companyName: "",
    username: "",
    email: "",
    phone: "",
    fleetSize: "1",
  });
  const itemsPerPage = 10;

  const { data: carriers = [], isLoading, error } = useQuery<CarrierWithDetails[]>({
    queryKey: ["/api/admin/carriers"],
  });

  const verifyCarrierMutation = useMutation({
    mutationFn: async ({ id, isVerified }: { id: string; isVerified: boolean }) => {
      return apiRequest(`/api/admin/carriers/${id}/verify`, { 
        method: "PATCH", 
        body: JSON.stringify({ isVerified }) 
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/carriers"] });
      toast({ 
        title: variables.isVerified ? "Carrier Verified" : "Verification Revoked",
        description: variables.isVerified ? "Carrier has been verified" : "Carrier verification has been revoked"
      });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update carrier", variant: "destructive" });
    },
  });

  const filteredCarriers = useMemo(() => {
    let result = [...carriers];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(carrier => 
        carrier.companyName?.toLowerCase().includes(query) ||
        carrier.username?.toLowerCase().includes(query) ||
        carrier.id?.toLowerCase().includes(query)
      );
    }
    
    if (statusFilter !== "all") {
      if (statusFilter === "verified") {
        result = result.filter(carrier => carrier.isVerified);
      } else if (statusFilter === "pending") {
        result = result.filter(carrier => !carrier.isVerified);
      }
    }
    
    result.sort((a, b) => {
      const aVal = (a as any)[sortField] || "";
      const bVal = (b as any)[sortField] || "";
      const direction = sortDirection === "asc" ? 1 : -1;
      if (aVal < bVal) return -1 * direction;
      if (aVal > bVal) return 1 * direction;
      return 0;
    });
    
    return result;
  }, [carriers, searchQuery, statusFilter, sortField, sortDirection]);

  const paginatedCarriers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCarriers.slice(start, start + itemsPerPage);
  }, [filteredCarriers, currentPage]);

  const totalPages = Math.ceil(filteredCarriers.length / itemsPerPage);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleVerify = (carrier: CarrierWithDetails) => {
    verifyCarrierMutation.mutate({ id: carrier.id, isVerified: true });
  };

  const handleUnverify = (carrier: CarrierWithDetails) => {
    verifyCarrierMutation.mutate({ id: carrier.id, isVerified: false });
  };

  const openEditModal = (carrier: CarrierWithDetails) => {
    setSelectedCarrier(carrier);
    setFormData({
      companyName: carrier.companyName || "",
      username: carrier.username || "",
      email: carrier.email || "",
      phone: carrier.phone || "",
      fleetSize: carrier.profile?.fleetSize?.toString() || "1",
    });
    setIsEditModalOpen(true);
  };

  const getStatusBadge = (isVerified: boolean | null) => {
    if (isVerified) {
      return <Badge className="bg-green-600" data-testid="badge-verified"><ShieldCheck className="h-3 w-3 mr-1" />Verified</Badge>;
    }
    return <Badge variant="secondary" data-testid="badge-pending"><Shield className="h-3 w-3 mr-1" />Pending</Badge>;
  };

  const formatDate = (dateStr: string | Date | null) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
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
        <div className="text-center text-destructive">Failed to load carriers. Please try again.</div>
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
            <h1 className="text-2xl font-bold">Carriers Management</h1>
          </div>
          <p className="text-muted-foreground ml-10">Manage carrier verification and profiles ({carriers.length} total)</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} data-testid="button-add-carrier">
          <Plus className="h-4 w-4 mr-2" />
          Add Carrier
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by company, username, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-carriers"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Verification" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
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
                      data-testid="button-sort-company"
                    >
                      Company
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Fleet Size</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Performance</TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 -ml-3"
                      onClick={() => handleSort("createdAt")}
                      data-testid="button-sort-created"
                    >
                      Joined
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                  </TableHead>
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
                      key={carrier.id} 
                      className="cursor-pointer"
                      onClick={() => {
                        setSelectedCarrier(carrier);
                        setIsDetailModalOpen(true);
                      }}
                      data-testid={`row-carrier-${carrier.id}`}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                            <Truck className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium" data-testid={`text-company-${carrier.id}`}>
                              {carrier.companyName || carrier.username}
                            </div>
                            <div className="text-xs text-muted-foreground">{carrier.id.slice(0, 8)}...</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm" data-testid={`text-email-${carrier.id}`}>{carrier.email}</div>
                        <div className="text-sm text-muted-foreground">{carrier.phone || "No phone"}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2" data-testid={`text-fleet-${carrier.id}`}>
                          <Truck className="h-4 w-4 text-muted-foreground" />
                          <span>{carrier.profile?.fleetSize || 0} trucks</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(carrier.isVerified)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1" data-testid={`text-rating-${carrier.id}`}>
                          <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                          <span className="font-medium">
                            {carrier.profile?.reliabilityScore || "0.00"}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            ({carrier.profile?.totalDeliveries || 0} deliveries)
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground" data-testid={`text-joined-${carrier.id}`}>
                        {formatDate(carrier.createdAt)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" data-testid={`button-carrier-actions-${carrier.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCarrier(carrier);
                              setIsDetailModalOpen(true);
                            }} data-testid={`menu-view-${carrier.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(carrier);
                            }} data-testid={`menu-edit-${carrier.id}`}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Carrier
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCarrier(carrier);
                              setIsDocumentModalOpen(true);
                            }} data-testid={`menu-documents-${carrier.id}`}>
                              <Upload className="h-4 w-4 mr-2" />
                              Documents
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {carrier.isVerified ? (
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleUnverify(carrier);
                              }} data-testid={`menu-unverify-${carrier.id}`}>
                                <ShieldX className="h-4 w-4 mr-2" />
                                Revoke Verification
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleVerify(carrier);
                              }} data-testid={`menu-verify-${carrier.id}`}>
                                <ShieldCheck className="h-4 w-4 mr-2" />
                                Verify Carrier
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

      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-detail-title">{selectedCarrier?.companyName || selectedCarrier?.username}</DialogTitle>
            <DialogDescription data-testid="text-detail-id">{selectedCarrier?.id}</DialogDescription>
          </DialogHeader>
          {selectedCarrier && (
            <Tabs defaultValue="overview" className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
                <TabsTrigger value="performance" data-testid="tab-performance">Performance</TabsTrigger>
                <TabsTrigger value="documents" data-testid="tab-documents">Documents</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Username</Label>
                    <p className="font-medium" data-testid="text-detail-username">{selectedCarrier.username}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Fleet Size</Label>
                    <p className="font-medium" data-testid="text-detail-fleet">{selectedCarrier.profile?.fleetSize || 0} trucks</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium" data-testid="text-detail-email">{selectedCarrier.email}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Phone</Label>
                    <p className="font-medium" data-testid="text-detail-phone">{selectedCarrier.phone || "Not provided"}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Bio</Label>
                  <p className="text-sm" data-testid="text-detail-bio">{selectedCarrier.profile?.bio || "No bio provided"}</p>
                </div>
              </TabsContent>
              <TabsContent value="performance" className="mt-4">
                <div className="grid grid-cols-3 gap-4 pt-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-3xl font-bold" data-testid="text-detail-reliability">
                      {selectedCarrier.profile?.reliabilityScore || "0.00"}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                      <Star className="h-3 w-3 text-amber-500 fill-amber-500" />Reliability
                    </div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-3xl font-bold" data-testid="text-detail-deliveries">
                      {selectedCarrier.profile?.totalDeliveries || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Deliveries</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-3xl font-bold" data-testid="text-detail-ontime">
                      {selectedCarrier.profile?.onTimeScore || "0.00"}
                    </div>
                    <div className="text-sm text-muted-foreground">On-Time Score</div>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="documents" className="mt-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium">Documents</div>
                        <div className="text-sm text-muted-foreground">{selectedCarrier.documentCount || 0} documents uploaded</div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" data-testid="button-view-documents">
                      View All
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditModalOpen} onOpenChange={(open) => { if (!open) { setIsEditModalOpen(false); setSelectedCarrier(null); } }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Carrier</DialogTitle>
            <DialogDescription>Update carrier information</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input 
                  value={formData.companyName}
                  onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                  data-testid="input-company-name" 
                />
              </div>
              <div className="space-y-2">
                <Label>Username</Label>
                <Input 
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  data-testid="input-username" 
                />
              </div>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditModalOpen(false); setSelectedCarrier(null); }} data-testid="button-cancel-edit">
              Cancel
            </Button>
            <Button data-testid="button-save-carrier">
              Update Carrier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDocumentModalOpen} onOpenChange={setIsDocumentModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Upload Documents</DialogTitle>
            <DialogDescription>
              Upload documents for {selectedCarrier?.companyName || selectedCarrier?.username}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Document Type</Label>
              <Select>
                <SelectTrigger data-testid="select-document-type">
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rc">Registration Certificate</SelectItem>
                  <SelectItem value="insurance">Insurance Certificate</SelectItem>
                  <SelectItem value="license">Business License</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Drag and drop or click to upload</p>
              <Button variant="outline" size="sm" className="mt-2" data-testid="button-choose-file">
                Choose File
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDocumentModalOpen(false)} data-testid="button-cancel-upload">
              Cancel
            </Button>
            <Button onClick={() => {
              toast({ title: "Document Uploaded", description: "Document has been uploaded successfully" });
              setIsDocumentModalOpen(false);
            }} data-testid="button-upload">
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
