import { useState, useMemo, useEffect } from "react";
import { useLocation, useSearch, useParams } from "wouter";
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Key,
  UserCheck,
  UserX,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Mail,
  Phone,
  Shield,
  Building,
  RefreshCw,
  FileCheck,
  Truck,
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
import { useAdminData, type AdminUser } from "@/lib/admin-data-store";
import { formatDistanceToNow, format } from "date-fns";

export default function AdminUsersPage() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const params = useParams<{ id?: string }>();
  const { toast } = useToast();
  const { users, addUser, updateUser, suspendUser, activateUser, deleteUser, refreshFromShipperPortal, showAllUsers, setShowAllUsers } = useAdminData();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [highlightUserId, setHighlightUserId] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileUser, setProfileUser] = useState<AdminUser | null>(null);
  
  // Handle deep-linking from other pages (e.g., from Onboarding "View User")
  useEffect(() => {
    const urlParams = new URLSearchParams(searchString);
    const userId = urlParams.get("userId");
    const role = urlParams.get("role");
    
    if (role) {
      setRoleFilter(role);
    }
    if (userId) {
      setHighlightUserId(userId);
      // Auto-search for the user using userId field
      const user = users.find(u => u.userId === userId);
      if (user) {
        setSearchQuery(user.email || user.name || "");
      }
    }
  }, [searchString, users]);

  // Handle URL path parameter for viewing user profile (e.g., /admin/users/:id)
  useEffect(() => {
    if (params.id && users.length > 0) {
      const user = users.find(u => u.userId === params.id);
      if (user) {
        setProfileUser(user);
        setIsProfileOpen(true);
      }
    }
  }, [params.id, users]);
  const [sortField, setSortField] = useState<keyof AdminUser>("dateJoined");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "shipper" as "shipper" | "carrier" | "admin",
    company: "",
    status: "active" as "active" | "suspended" | "pending",
    region: "North India" as string,
  });
  const itemsPerPage = 10;

  const filteredUsers = useMemo(() => {
    let result = [...users];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(user => 
        user.name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.company?.toLowerCase().includes(query) ||
        user.displayUserId?.toLowerCase().includes(query) ||
        (user.userNumber && String(user.userNumber).includes(query))
      );
    }
    
    if (roleFilter !== "all") {
      result = result.filter(user => user.role === roleFilter);
    }
    
    if (statusFilter !== "all") {
      result = result.filter(user => user.status === statusFilter);
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
  }, [users, searchQuery, roleFilter, statusFilter, sortField, sortDirection]);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  const handleSort = (field: keyof AdminUser) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      role: "shipper",
      company: "",
      status: "active",
      region: "North India",
    });
  };

  const handleResetPassword = (user: AdminUser) => {
    toast({
      title: "Password Reset",
      description: `Password reset email sent to ${user.email}`,
    });
  };

  const handleToggleStatus = (user: AdminUser) => {
    if (user.status === "active") {
      suspendUser(user.userId);
      toast({
        title: "User Suspended",
        description: `${user.name} has been suspended`,
      });
    } else {
      activateUser(user.userId);
      toast({
        title: "User Activated",
        description: `${user.name} has been activated`,
      });
    }
  };

  const handleDeleteUser = () => {
    if (selectedUser) {
      deleteUser(selectedUser.userId);
      toast({
        title: "User Deleted",
        description: `${selectedUser.name} has been removed`,
      });
      setIsDeleteModalOpen(false);
      setSelectedUser(null);
    }
  };

  const handleCreateUser = () => {
    const newUser = addUser({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      role: formData.role,
      company: formData.company,
      status: formData.status,
      isVerified: formData.status === "active",
      region: formData.region,
    });
    
    toast({
      title: "User Created",
      description: `${formData.name} has been added successfully`,
    });
    setIsAddModalOpen(false);
    resetForm();
  };

  const handleUpdateUser = () => {
    if (selectedUser) {
      updateUser(selectedUser.userId, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        company: formData.company,
        status: formData.status,
      });
      
      toast({
        title: "User Updated",
        description: `${formData.name}'s details have been updated`,
      });
      setIsEditModalOpen(false);
      setSelectedUser(null);
    }
  };

  const openEditModal = (user: AdminUser) => {
    setSelectedUser(user);
    setFormData({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      role: (user.role === "dispatcher" ? "shipper" : user.role) as "shipper" | "carrier" | "admin",
      company: user.company || "",
      status: user.status,
      region: user.region || "North India",
    });
    setIsEditModalOpen(true);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin": return "default";
      case "carrier": return "secondary";
      case "shipper": return "outline";
      default: return "outline";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge className="bg-green-600">Active</Badge>;
      case "inactive": return <Badge variant="outline" className="text-amber-600 border-amber-400">Inactive</Badge>;
      case "suspended": return <Badge variant="destructive">Suspended</Badge>;
      case "pending": return <Badge variant="secondary">Pending</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

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
            <h1 className="text-2xl font-bold">Users Management</h1>
          </div>
          <p className="text-muted-foreground ml-10">
            {showAllUsers ? "All platform users" : "Verified users"} ({users.length} total)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={refreshFromShipperPortal} data-testid="button-sync-users">
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync
          </Button>
          <Button onClick={() => { resetForm(); setIsAddModalOpen(true); }} data-testid="button-add-user">
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-5">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-xl font-bold">{users.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <UserCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-xl font-bold">{users.filter(u => u.status === "active").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Inactive</p>
                <p className="text-xl font-bold">{users.filter(u => u.status === "inactive").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <Shield className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-xl font-bold">{users.filter(u => u.status === "pending").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                <UserX className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Suspended</p>
                <p className="text-xl font-bold">{users.filter(u => u.status === "suspended").length}</p>
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
                placeholder="Search by user ID, name, email, or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-users"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[130px]" data-testid="select-role-filter">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="shipper">Shipper</SelectItem>
                  <SelectItem value="carrier">Carrier</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px]" data-testid="select-status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant={showAllUsers ? "default" : "outline"}
                size="sm"
                onClick={() => setShowAllUsers(!showAllUsers)}
                data-testid="button-toggle-all-users"
              >
                {showAllUsers ? "All Users" : "Verified Only"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[90px]">
                    <span className="text-xs">ID</span>
                  </TableHead>
                  <TableHead className="w-[200px]">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 -ml-3"
                      onClick={() => handleSort("name")}
                      data-testid="button-sort-name"
                    >
                      User
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 -ml-3"
                      onClick={() => handleSort("role")}
                      data-testid="button-sort-role"
                    >
                      Role
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 -ml-3"
                      onClick={() => handleSort("dateJoined")}
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
                {paginatedUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedUsers.map((user) => (
                    <TableRow 
                      key={user.userId} 
                      className={`cursor-pointer ${user.userId === highlightUserId ? "bg-primary/10 ring-2 ring-primary/30" : ""}`}
                      data-testid={`row-user-${user.userId}`}
                    >
                      <TableCell>
                        {user.displayUserId && (
                          <span className="text-xs font-mono font-semibold text-primary" data-testid={`text-userid-${user.userId}`}>
                            {user.displayUserId}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                            <Users className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <div className="font-medium flex items-center flex-wrap gap-2" data-testid={`text-username-${user.userId}`}>
                              {user.name}
                              {user.isVerified && (
                                <Shield className="h-3 w-3 text-primary" />
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Building className="h-3 w-3" />
                              {user.company || "No company"}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm" data-testid={`text-email-${user.userId}`}>
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {user.email}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {user.phone || "No phone"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)} className="capitalize" data-testid={`badge-role-${user.userId}`}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`badge-status-${user.userId}`}>
                        {getStatusBadge(user.status)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground" data-testid={`text-created-${user.userId}`}>
                        {format(user.dateJoined, "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" data-testid={`button-user-actions-${user.userId}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(user);
                            }} data-testid={`menu-edit-${user.userId}`}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit User
                            </DropdownMenuItem>
                            {user.role === "shipper" && (
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                setLocation("/admin/onboarding");
                              }} data-testid={`menu-view-onboarding-${user.userId}`}>
                                <FileCheck className="h-4 w-4 mr-2" />
                                View Onboarding
                              </DropdownMenuItem>
                            )}
                            {user.role === "carrier" && (
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                setLocation("/admin/verification");
                              }} data-testid={`menu-view-verification-${user.userId}`}>
                                <Truck className="h-4 w-4 mr-2" />
                                View Verification
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleResetPassword(user);
                            }} data-testid={`menu-reset-password-${user.userId}`}>
                              <Key className="h-4 w-4 mr-2" />
                              Reset Password
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleToggleStatus(user);
                            }} data-testid={`menu-toggle-status-${user.userId}`}>
                              {user.status === "active" ? (
                                <>
                                  <UserX className="h-4 w-4 mr-2" />
                                  Suspend
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-4 w-4 mr-2" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedUser(user);
                                setIsDeleteModalOpen(true);
                              }}
                              data-testid={`menu-delete-${user.userId}`}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete User
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

          {filteredUsers.length > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <p className="text-sm text-muted-foreground" data-testid="text-pagination-info">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length} users
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

      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>Create a new user account</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-name">Full Name</Label>
                <Input 
                  id="add-name" 
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  data-testid="input-add-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-email">Email</Label>
                <Input 
                  id="add-email" 
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  data-testid="input-add-email"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-phone">Phone</Label>
                <Input 
                  id="add-phone" 
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  data-testid="input-add-phone"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-role">Role</Label>
                <Select value={formData.role} onValueChange={(v) => setFormData(prev => ({ ...prev, role: v as "shipper" | "carrier" | "admin" }))}>
                  <SelectTrigger data-testid="select-add-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shipper">Shipper</SelectItem>
                    <SelectItem value="carrier">Carrier</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-company">Company Name</Label>
                <Input 
                  id="add-company" 
                  value={formData.company}
                  onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                  data-testid="input-add-company"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-status">Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v as "active" | "suspended" | "pending" }))}>
                  <SelectTrigger data-testid="select-add-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)} data-testid="button-cancel-add">
              Cancel
            </Button>
            <Button onClick={handleCreateUser} data-testid="button-save-user">
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditModalOpen} onOpenChange={(open) => { if (!open) { setIsEditModalOpen(false); setSelectedUser(null); } }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user details. Changes sync immediately.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name</Label>
                <Input 
                  id="edit-name" 
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  data-testid="input-edit-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input 
                  id="edit-email" 
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  data-testid="input-edit-email"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input 
                  id="edit-phone" 
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  data-testid="input-edit-phone"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select value={formData.role} onValueChange={(v) => setFormData(prev => ({ ...prev, role: v as "shipper" | "carrier" | "admin" }))}>
                  <SelectTrigger data-testid="select-edit-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shipper">Shipper</SelectItem>
                    <SelectItem value="carrier">Carrier</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-company">Company Name</Label>
                <Input 
                  id="edit-company" 
                  value={formData.company}
                  onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                  data-testid="input-edit-company"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v as "active" | "suspended" | "pending" }))}>
                  <SelectTrigger data-testid="select-edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditModalOpen(false); setSelectedUser(null); }} data-testid="button-cancel-edit">
              Cancel
            </Button>
            <Button onClick={handleUpdateUser} data-testid="button-update-user">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedUser?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} data-testid="button-cancel-delete">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser} data-testid="button-confirm-delete">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Profile Dialog */}
      <Dialog open={isProfileOpen} onOpenChange={(open) => {
        setIsProfileOpen(open);
        if (!open) {
          setProfileUser(null);
          // Navigate back to users list when closing
          setLocation("/admin/users");
        }
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center flex-wrap gap-2">
                  <span>{profileUser?.name || "User Profile"}</span>
                  {profileUser?.role && (
                    <Badge variant="outline" className="capitalize">
                      {profileUser.role}
                    </Badge>
                  )}
                </div>
                {profileUser?.displayUserId && (
                  <p className="text-xs font-mono text-muted-foreground mt-0.5" data-testid="text-profile-userid">
                    {profileUser.displayUserId}
                  </p>
                )}
              </div>
            </DialogTitle>
            <DialogDescription>
              View detailed information about this user
            </DialogDescription>
          </DialogHeader>
          
          {profileUser && (
            <div className="space-y-6 py-4">
              {/* Basic Information */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Contact Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Full Name</span>
                    <p className="font-medium">{profileUser.name || "-"}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Email</span>
                    <p className="font-medium flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {profileUser.email || "-"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Phone</span>
                    <p className="font-medium flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      {profileUser.phone || "-"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Company</span>
                    <p className="font-medium flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      {profileUser.company || "-"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Account Status */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Account Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Role</span>
                    <p>
                      <Badge variant={profileUser.role === "admin" ? "default" : "outline"} className="capitalize">
                        <Shield className="h-3 w-3 mr-1" />
                        {profileUser.role}
                      </Badge>
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Status</span>
                    <p>
                      {getStatusBadge(profileUser.status)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Verification</span>
                    <p>
                      <Badge variant={profileUser.isVerified ? "default" : "outline"}>
                        {profileUser.isVerified ? "Verified" : "Unverified"}
                      </Badge>
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Date Joined</span>
                    <p className="font-medium text-sm">
                      {profileUser.dateJoined ? format(new Date(profileUser.dateJoined), "MMM d, yyyy") : "-"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Region Info */}
              {profileUser.region && (
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Operating Region</h4>
                  <p className="font-medium">{profileUser.region}</p>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsProfileOpen(false);
                setProfileUser(null);
                setLocation("/admin/users");
              }}
              data-testid="button-close-profile"
            >
              Close
            </Button>
            {profileUser && (
              <Button 
                onClick={() => {
                  setIsProfileOpen(false);
                  const user = users.find(u => u.userId === profileUser.userId);
                  if (user) {
                    openEditModal(user);
                  }
                }}
                data-testid="button-edit-from-profile"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit User
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
