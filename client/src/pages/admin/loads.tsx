import { useState } from "react";
import { Search, Filter, Package, MapPin, DollarSign, MoreHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const mockLoads = [
  { id: "1234", shipper: "ABC Manufacturing", route: "Los Angeles, CA → Phoenix, AZ", status: "in_transit", price: 2500, createdAt: new Date("2024-06-01") },
  { id: "1235", shipper: "XYZ Logistics", route: "San Francisco, CA → Denver, CO", status: "bidding", price: 4200, createdAt: new Date("2024-06-02") },
  { id: "1236", shipper: "Premier Goods", route: "Seattle, WA → Portland, OR", status: "delivered", price: 950, createdAt: new Date("2024-05-28") },
  { id: "1237", shipper: "ABC Manufacturing", route: "Chicago, IL → Detroit, MI", status: "posted", price: 1800, createdAt: new Date("2024-06-03") },
  { id: "1238", shipper: "Northwest Supply", route: "Denver, CO → Salt Lake City, UT", status: "assigned", price: 1500, createdAt: new Date("2024-06-03") },
  { id: "1239", shipper: "XYZ Logistics", route: "Las Vegas, NV → Phoenix, AZ", status: "delivered", price: 1100, createdAt: new Date("2024-05-25") },
];

function getStatusInfo(status: string) {
  switch (status) {
    case "posted":
      return { label: "Posted", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" };
    case "bidding":
      return { label: "Bidding", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" };
    case "assigned":
      return { label: "Assigned", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" };
    case "in_transit":
      return { label: "In Transit", className: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400" };
    case "delivered":
      return { label: "Delivered", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" };
    default:
      return { label: status, className: "bg-muted text-muted-foreground" };
  }
}

export default function AdminLoadsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredLoads = mockLoads.filter((load) => {
    const matchesSearch =
      load.id.includes(searchQuery) ||
      load.shipper.toLowerCase().includes(searchQuery.toLowerCase()) ||
      load.route.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || load.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const loadCounts = {
    total: mockLoads.length,
    active: mockLoads.filter((l) => ["posted", "bidding", "assigned", "in_transit"].includes(l.status)).length,
    delivered: mockLoads.filter((l) => l.status === "delivered").length,
    totalValue: mockLoads.reduce((sum, l) => sum + l.price, 0),
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">All Loads</h1>
        <p className="text-muted-foreground">Monitor all loads on the platform.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{loadCounts.total}</p>
            <p className="text-sm text-muted-foreground">Total Loads</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{loadCounts.active}</p>
            <p className="text-sm text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{loadCounts.delivered}</p>
            <p className="text-sm text-muted-foreground">Delivered</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">${loadCounts.totalValue.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Total Value</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by ID, shipper, or route..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-loads"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48" data-testid="select-status-filter">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="posted">Posted</SelectItem>
            <SelectItem value="bidding">Bidding</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="in_transit">In Transit</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Load ID</TableHead>
              <TableHead>Shipper</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLoads.map((load) => {
              const statusInfo = getStatusInfo(load.status);
              return (
                <TableRow key={load.id} data-testid={`load-row-${load.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="font-mono font-medium">#{load.id}</span>
                    </div>
                  </TableCell>
                  <TableCell>{load.shipper}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      {load.route}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${statusInfo.className} no-default-hover-elevate no-default-active-elevate`}>
                      {statusInfo.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 font-medium">
                      <DollarSign className="h-3 w-3 text-muted-foreground" />
                      {load.price.toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {load.createdAt.toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid={`button-load-menu-${load.id}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem>View Bids</DropdownMenuItem>
                        <DropdownMenuItem>Contact Shipper</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Cancel Load</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
