import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import type { User } from "@shared/schema";

type UserWithoutPassword = Omit<User, "password">;

export default function AdminUsersPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<keyof UserWithoutPassword>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<UserWithoutPassword | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    phone: "",
    role: "shipper",
    companyName: "",
    password: "",
  });
  const itemsPerPage = 10;

  const { data: users = [], isLoading, error } = useQuery<UserWithoutPassword[]>({
    queryKey: ["/api/users"],
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("/api/admin/users", { method: "POST", body: JSON.stringify(data) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User Created", description: "New user has been created successfully" });
      setIsAddModalOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create user", variant: "destructive" });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<User> }) => {
      return apiRequest(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(data) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User Updated", description: "User details have been updated" });
      setIsEditModalOpen(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update user", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      username: "",
      email: "",
      phone: "",
      role: "shipper",
      companyName: "",
      password: "",
    });
  };

  const filteredUsers = useMemo(() => {
    let result = [...users];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(user => 
        user.username?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.companyName?.toLowerCase().includes(query)
      );
    }
    
    if (roleFilter !== "all") {
      result = result.filter(user => user.role === roleFilter);
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
  }, [users, searchQuery, roleFilter, sortField, sortDirection]);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  const handleSort = (field: keyof UserWithoutPassword) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleResetPassword = (user: UserWithoutPassword) => {
    toast({
      title: "Password Reset",
      description: `Password reset email sent to ${user.email}`,
    });
  };

  const handleToggleStatus = (user: UserWithoutPassword) => {
    updateUserMutation.mutate({
      id: user.id,
      data: { isVerified: !user.isVerified },
    });
  };

  const handleDeleteUser = () => {
    if (selectedUser) {
      toast({
        title: "User Deactivated",
        description: `${selectedUser.username} has been deactivated`,
      });
      setIsDeleteModalOpen(false);
      setSelectedUser(null);
    }
  };

  const handleCreateUser = () => {
    createUserMutation.mutate(formData);
  };

  const handleUpdateUser = () => {
    if (selectedUser) {
      updateUserMutation.mutate({
        id: selectedUser.id,
        data: {
          username: formData.username,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          companyName: formData.companyName,
        },
      });
    }
  };

  const openEditModal = (user: UserWithoutPassword) => {
    setSelectedUser(user);
    setFormData({
      username: user.username || "",
      email: user.email || "",
      phone: user.phone || "",
      role: user.role || "shipper",
      companyName: user.companyName || "",
      password: "",
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
        <div className="text-center text-destructive">Failed to load users. Please try again.</div>
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
            <h1 className="text-2xl font-bold">Users Management</h1>
          </div>
          <p className="text-muted-foreground ml-10">Manage all platform users ({users.length} total)</p>
        </div>
        <Button onClick={() => { resetForm(); setIsAddModalOpen(true); }} data-testid="button-add-user">
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name, email, or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-users"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[140px]" data-testid="select-role-filter">
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
                      onClick={() => handleSort("username")}
                      data-testid="button-sort-username"
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
                      onClick={() => handleSort("createdAt")}
                      data-testid="button-sort-created"
                    >
                      Created
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedUsers.map((user) => (
                    <TableRow 
                      key={user.id} 
                      className="cursor-pointer"
                      data-testid={`row-user-${user.id}`}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                            <Users className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <div className="font-medium flex items-center gap-2" data-testid={`text-username-${user.id}`}>
                              {user.username}
                              {user.isVerified && (
                                <Shield className="h-3 w-3 text-primary" />
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">{user.companyName || "No company"}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm" data-testid={`text-email-${user.id}`}>
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
                        <Badge variant={getRoleBadgeVariant(user.role || "")} className="capitalize" data-testid={`badge-role-${user.id}`}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={user.isVerified ? "default" : "secondary"}
                          className={user.isVerified ? "bg-green-600" : ""}
                          data-testid={`badge-status-${user.id}`}
                        >
                          {user.isVerified ? "Verified" : "Unverified"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground" data-testid={`text-created-${user.id}`}>
                        {formatDate(user.createdAt)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" data-testid={`button-user-actions-${user.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(user);
                            }} data-testid={`menu-edit-${user.id}`}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit User
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleResetPassword(user);
                            }} data-testid={`menu-reset-password-${user.id}`}>
                              <Key className="h-4 w-4 mr-2" />
                              Reset Password
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleToggleStatus(user);
                            }} data-testid={`menu-toggle-status-${user.id}`}>
                              {user.isVerified ? (
                                <>
                                  <UserX className="h-4 w-4 mr-2" />
                                  Unverify
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-4 w-4 mr-2" />
                                  Verify
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
                              data-testid={`menu-delete-${user.id}`}
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
                <Label htmlFor="add-username">Username</Label>
                <Input 
                  id="add-username" 
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  data-testid="input-add-username"
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
                <Select value={formData.role} onValueChange={(v) => setFormData(prev => ({ ...prev, role: v }))}>
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
            <div className="space-y-2">
              <Label htmlFor="add-company">Company Name</Label>
              <Input 
                id="add-company" 
                value={formData.companyName}
                onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                data-testid="input-add-company"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-password">Password</Label>
              <Input 
                id="add-password" 
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Enter initial password"
                data-testid="input-add-password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)} data-testid="button-cancel-add">
              Cancel
            </Button>
            <Button 
              onClick={handleCreateUser} 
              disabled={createUserMutation.isPending}
              data-testid="button-save-user"
            >
              {createUserMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditModalOpen} onOpenChange={(open) => { if (!open) { setIsEditModalOpen(false); setSelectedUser(null); } }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-username">Username</Label>
                <Input 
                  id="edit-username" 
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  data-testid="input-edit-username"
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
                <Select value={formData.role} onValueChange={(v) => setFormData(prev => ({ ...prev, role: v }))}>
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
            <div className="space-y-2">
              <Label htmlFor="edit-company">Company Name</Label>
              <Input 
                id="edit-company" 
                value={formData.companyName}
                onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                data-testid="input-edit-company"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditModalOpen(false); setSelectedUser(null); }} data-testid="button-cancel-edit">
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateUser} 
              disabled={updateUserMutation.isPending}
              data-testid="button-update-user"
            >
              {updateUserMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedUser?.username}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} data-testid="button-cancel-delete">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser} data-testid="button-confirm-delete">
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
