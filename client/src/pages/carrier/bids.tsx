import { useState } from "react";
import { Search, Filter, Gavel, Clock, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/empty-state";

const mockBids = [
  {
    id: "b1",
    loadId: "l1",
    route: "Los Angeles, CA → Phoenix, AZ",
    amount: 2400,
    status: "pending",
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    estimatedProfit: 850,
  },
  {
    id: "b2",
    loadId: "l2",
    route: "San Diego, CA → Las Vegas, NV",
    amount: 2000,
    status: "countered",
    counterAmount: 1900,
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
    estimatedProfit: 700,
  },
  {
    id: "b3",
    loadId: "l3",
    route: "Oakland, CA → Salt Lake City, UT",
    amount: 4100,
    status: "accepted",
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    estimatedProfit: 1500,
  },
  {
    id: "b4",
    loadId: "l4",
    route: "Portland, OR → Seattle, WA",
    amount: 900,
    status: "rejected",
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
    estimatedProfit: 350,
  },
];

function getStatusInfo(status: string) {
  switch (status) {
    case "accepted":
      return { label: "Accepted", icon: CheckCircle, className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" };
    case "rejected":
      return { label: "Rejected", icon: XCircle, className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" };
    case "countered":
      return { label: "Countered", icon: RefreshCw, className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" };
    case "expired":
      return { label: "Expired", icon: Clock, className: "bg-muted text-muted-foreground" };
    default:
      return { label: "Pending", icon: Clock, className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" };
  }
}

export default function CarrierBidsPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredBids = mockBids.filter((bid) => {
    const matchesStatus = statusFilter === "all" || bid.status === statusFilter;
    const matchesSearch = bid.route.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const statusCounts = {
    all: mockBids.length,
    pending: mockBids.filter((b) => b.status === "pending").length,
    countered: mockBids.filter((b) => b.status === "countered").length,
    accepted: mockBids.filter((b) => b.status === "accepted").length,
    rejected: mockBids.filter((b) => b.status === "rejected").length,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">My Bids</h1>
        <p className="text-muted-foreground">Track and manage all your submitted bids.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by route..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-bids"
          />
        </div>
      </div>

      <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mb-6">
        <TabsList>
          <TabsTrigger value="all" className="gap-2">
            All
            <Badge variant="secondary" className="ml-1">{statusCounts.all}</Badge>
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-2">
            Pending
            <Badge variant="secondary" className="ml-1">{statusCounts.pending}</Badge>
          </TabsTrigger>
          <TabsTrigger value="countered" className="gap-2">
            Countered
            <Badge variant="secondary" className="ml-1">{statusCounts.countered}</Badge>
          </TabsTrigger>
          <TabsTrigger value="accepted" className="gap-2">
            Accepted
            <Badge variant="secondary" className="ml-1">{statusCounts.accepted}</Badge>
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-2">
            Rejected
            <Badge variant="secondary" className="ml-1">{statusCounts.rejected}</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {filteredBids.length === 0 ? (
        <EmptyState
          icon={Gavel}
          title="No bids found"
          description={
            mockBids.length === 0
              ? "You haven't placed any bids yet. Browse available loads to start bidding."
              : `No bids with "${statusFilter}" status.`
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredBids.map((bid) => {
            const statusInfo = getStatusInfo(bid.status);
            const StatusIcon = statusInfo.icon;
            return (
              <Card key={bid.id} className="hover-elevate" data-testid={`bid-card-${bid.id}`}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <Badge className={`${statusInfo.className} no-default-hover-elevate no-default-active-elevate`}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusInfo.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Load #{bid.loadId}
                    </span>
                  </div>

                  <p className="font-medium mb-4">{bid.route}</p>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Your Bid</span>
                      <span className="font-bold text-lg">${bid.amount.toLocaleString()}</span>
                    </div>
                    {bid.counterAmount && (
                      <div className="flex items-center justify-between text-sm p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                        <span className="text-amber-700 dark:text-amber-400">Counter Offer</span>
                        <span className="font-bold text-amber-700 dark:text-amber-400">
                          ${bid.counterAmount.toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Est. Profit</span>
                      <span className="text-green-600 dark:text-green-400 font-medium">
                        +${bid.estimatedProfit.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mb-4">
                    Submitted {bid.submittedAt.toLocaleDateString([], { month: "short", day: "numeric" })} at{" "}
                    {bid.submittedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>

                  {bid.status === "countered" && (
                    <div className="flex gap-2">
                      <Button className="flex-1" data-testid={`button-accept-counter-${bid.id}`}>
                        Accept Counter
                      </Button>
                      <Button variant="outline" data-testid={`button-decline-${bid.id}`}>
                        Decline
                      </Button>
                    </div>
                  )}
                  {bid.status === "accepted" && (
                    <Button className="w-full" variant="outline" data-testid={`button-view-trip-${bid.id}`}>
                      View Trip Details
                    </Button>
                  )}
                  {bid.status === "pending" && (
                    <Button className="w-full" variant="outline" data-testid={`button-modify-${bid.id}`}>
                      Modify Bid
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
