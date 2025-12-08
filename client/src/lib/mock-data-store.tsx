import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface MockLoad {
  loadId: string;
  pickup: string;
  drop: string;
  weight: number;
  weightUnit: string;
  type: string;
  status: "Active" | "Bidding" | "Assigned" | "En Route" | "Delivered" | "Cancelled";
  carrier: string | null;
  eta: string | null;
  estimatedPrice: number;
  finalPrice: number | null;
  cargoDescription: string;
  pickupDate: string;
  createdAt: string;
}

export interface MockBid {
  bidId: string;
  loadId: string;
  carrierName: string;
  carrierId: string;
  bidPrice: number;
  eta: string;
  status: "Pending" | "Accepted" | "Rejected" | "Countered";
  counterPrice: number | null;
  counterMessage: string | null;
  createdAt: string;
}

export interface MockInTransit {
  loadId: string;
  vehicleId: string;
  pickup: string;
  drop: string;
  currentLocation: string;
  currentLat: number;
  currentLng: number;
  eta: string;
  status: "En Route" | "At Checkpoint" | "Delayed";
  carrier: string;
  driver: string;
  speed: number;
  fuelLevel: number;
  engineTemp: number;
}

export interface MockSpend {
  totalAmount: number;
  percentChange: number;
  breakdown: { category: string; amount: number; percentage: number }[];
  monthlyData: { month: string; amount: number; loads: number }[];
  carrierSpend: { carrier: string; amount: number; loads: number }[];
}

export interface MockNotification {
  id: string;
  title: string;
  message: string;
  type: "bid" | "shipment" | "document" | "general";
  isRead: boolean;
  createdAt: Date;
  loadId?: string;
  bidId?: string;
}

interface MockDataContextType {
  loads: MockLoad[];
  bids: MockBid[];
  inTransit: MockInTransit[];
  spend: MockSpend;
  notifications: MockNotification[];
  addLoad: (load: Omit<MockLoad, "loadId" | "createdAt">) => MockLoad;
  updateLoad: (loadId: string, updates: Partial<MockLoad>) => void;
  cancelLoad: (loadId: string) => void;
  deleteLoad: (loadId: string) => void;
  duplicateLoad: (loadId: string) => MockLoad | null;
  addBid: (bid: Omit<MockBid, "bidId" | "createdAt" | "counterPrice" | "counterMessage">) => MockBid;
  acceptBid: (bidId: string) => void;
  rejectBid: (bidId: string) => void;
  counterBid: (bidId: string, counterPrice: number, message: string) => void;
  moveToTransit: (loadId: string, vehicleId: string) => void;
  completeDelivery: (loadId: string) => void;
  getActiveLoads: () => MockLoad[];
  getPendingBids: () => MockBid[];
  getInTransitLoads: () => MockInTransit[];
  getLoadById: (loadId: string) => MockLoad | undefined;
  getBidsForLoad: (loadId: string) => MockBid[];
  addNotification: (notification: Omit<MockNotification, "id" | "createdAt" | "isRead">) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  getUnreadNotificationCount: () => number;
}

const MockDataContext = createContext<MockDataContextType | null>(null);

function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

const initialLoads: MockLoad[] = [
  {
    loadId: "LD-001",
    pickup: "Los Angeles, CA",
    drop: "Phoenix, AZ",
    weight: 15000,
    weightUnit: "lbs",
    type: "Dry Van",
    status: "Active",
    carrier: null,
    eta: null,
    estimatedPrice: 2500,
    finalPrice: null,
    cargoDescription: "Electronics and consumer goods",
    pickupDate: new Date(Date.now() + 86400000).toISOString(),
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    loadId: "LD-002",
    pickup: "Chicago, IL",
    drop: "Detroit, MI",
    weight: 22000,
    weightUnit: "lbs",
    type: "Flatbed",
    status: "Bidding",
    carrier: null,
    eta: null,
    estimatedPrice: 1800,
    finalPrice: null,
    cargoDescription: "Steel beams and construction materials",
    pickupDate: new Date(Date.now() + 172800000).toISOString(),
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    loadId: "LD-003",
    pickup: "Dallas, TX",
    drop: "Houston, TX",
    weight: 8000,
    weightUnit: "lbs",
    type: "Refrigerated",
    status: "Assigned",
    carrier: "FastHaul Logistics",
    eta: "Dec 10, 2025 2:00 PM",
    estimatedPrice: 1200,
    finalPrice: 1150,
    cargoDescription: "Frozen food products",
    pickupDate: new Date(Date.now() + 86400000).toISOString(),
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    loadId: "LD-004",
    pickup: "Seattle, WA",
    drop: "Portland, OR",
    weight: 12000,
    weightUnit: "lbs",
    type: "Dry Van",
    status: "Active",
    carrier: null,
    eta: null,
    estimatedPrice: 950,
    finalPrice: null,
    cargoDescription: "Retail merchandise",
    pickupDate: new Date(Date.now() + 259200000).toISOString(),
    createdAt: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    loadId: "LD-005",
    pickup: "Miami, FL",
    drop: "Atlanta, GA",
    weight: 18000,
    weightUnit: "lbs",
    type: "Dry Van",
    status: "Bidding",
    carrier: null,
    eta: null,
    estimatedPrice: 2100,
    finalPrice: null,
    cargoDescription: "Furniture and home goods",
    pickupDate: new Date(Date.now() + 345600000).toISOString(),
    createdAt: new Date(Date.now() - 14400000).toISOString(),
  },
];

const initialBids: MockBid[] = [
  {
    bidId: "BID-001",
    loadId: "LD-002",
    carrierName: "Swift Transport Co",
    carrierId: "C-001",
    bidPrice: 1650,
    eta: "Dec 11, 2025 10:00 AM",
    status: "Pending",
    counterPrice: null,
    counterMessage: null,
    createdAt: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    bidId: "BID-002",
    loadId: "LD-002",
    carrierName: "Premier Freight",
    carrierId: "C-002",
    bidPrice: 1720,
    eta: "Dec 11, 2025 8:00 AM",
    status: "Pending",
    counterPrice: null,
    counterMessage: null,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    bidId: "BID-003",
    loadId: "LD-005",
    carrierName: "FastHaul Logistics",
    carrierId: "C-003",
    bidPrice: 1950,
    eta: "Dec 12, 2025 4:00 PM",
    status: "Pending",
    counterPrice: null,
    counterMessage: null,
    createdAt: new Date(Date.now() - 900000).toISOString(),
  },
  {
    bidId: "BID-004",
    loadId: "LD-005",
    carrierName: "MegaHaul Inc",
    carrierId: "C-004",
    bidPrice: 2050,
    eta: "Dec 12, 2025 2:00 PM",
    status: "Pending",
    counterPrice: null,
    counterMessage: null,
    createdAt: new Date(Date.now() - 600000).toISOString(),
  },
  {
    bidId: "BID-005",
    loadId: "LD-001",
    carrierName: "CrossCountry Trucking",
    carrierId: "C-005",
    bidPrice: 2400,
    eta: "Dec 9, 2025 6:00 PM",
    status: "Pending",
    counterPrice: null,
    counterMessage: null,
    createdAt: new Date(Date.now() - 300000).toISOString(),
  },
];

const initialInTransit: MockInTransit[] = [
  {
    loadId: "LD-T001",
    vehicleId: "TRK-1024",
    pickup: "New York, NY",
    drop: "Boston, MA",
    currentLocation: "Hartford, CT",
    currentLat: 41.7658,
    currentLng: -72.6734,
    eta: "Dec 8, 2025 4:30 PM",
    status: "En Route",
    carrier: "FastHaul Logistics",
    driver: "John Smith",
    speed: 62,
    fuelLevel: 75,
    engineTemp: 185,
  },
  {
    loadId: "LD-T002",
    vehicleId: "TRK-2048",
    pickup: "San Francisco, CA",
    drop: "Los Angeles, CA",
    currentLocation: "Bakersfield, CA",
    currentLat: 35.3733,
    currentLng: -119.0187,
    eta: "Dec 8, 2025 8:00 PM",
    status: "En Route",
    carrier: "Swift Transport Co",
    driver: "Maria Garcia",
    speed: 58,
    fuelLevel: 45,
    engineTemp: 190,
  },
  {
    loadId: "LD-T003",
    vehicleId: "TRK-3072",
    pickup: "Denver, CO",
    drop: "Salt Lake City, UT",
    currentLocation: "Grand Junction, CO",
    currentLat: 39.0639,
    currentLng: -108.5506,
    eta: "Dec 9, 2025 11:00 AM",
    status: "At Checkpoint",
    carrier: "Premier Freight",
    driver: "Robert Johnson",
    speed: 0,
    fuelLevel: 88,
    engineTemp: 165,
  },
];

const initialSpend: MockSpend = {
  totalAmount: 45200,
  percentChange: 12.5,
  breakdown: [
    { category: "Dry Van", amount: 22500, percentage: 50 },
    { category: "Flatbed", amount: 11300, percentage: 25 },
    { category: "Refrigerated", amount: 6780, percentage: 15 },
    { category: "Tanker", amount: 4520, percentage: 10 },
  ],
  monthlyData: [
    { month: "Jan", amount: 32000, loads: 12 },
    { month: "Feb", amount: 38000, loads: 15 },
    { month: "Mar", amount: 35000, loads: 14 },
    { month: "Apr", amount: 42000, loads: 18 },
    { month: "May", amount: 48000, loads: 21 },
    { month: "Jun", amount: 45200, loads: 19 },
    { month: "Jul", amount: 52000, loads: 23 },
    { month: "Aug", amount: 49000, loads: 20 },
    { month: "Sep", amount: 55000, loads: 25 },
    { month: "Oct", amount: 58000, loads: 27 },
    { month: "Nov", amount: 61000, loads: 28 },
    { month: "Dec", amount: 45200, loads: 18 },
  ],
  carrierSpend: [
    { carrier: "FastHaul Logistics", amount: 15800, loads: 8 },
    { carrier: "Swift Transport Co", amount: 12400, loads: 6 },
    { carrier: "Premier Freight", amount: 9500, loads: 5 },
    { carrier: "MegaHaul Inc", amount: 7500, loads: 4 },
  ],
};

const initialNotifications: MockNotification[] = [
  {
    id: "notif-001",
    title: "New Bid Received",
    message: "FastHaul Logistics bid $2,450 on Load LD-001",
    type: "bid",
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 5),
    loadId: "LD-001",
    bidId: "BID-001",
  },
  {
    id: "notif-002",
    title: "Shipment Update",
    message: "Load LD-T001 is approaching Phoenix, AZ",
    type: "shipment",
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30),
    loadId: "LD-T001",
  },
  {
    id: "notif-003",
    title: "Rate Confirmed",
    message: "Your counter-offer for Load LD-003 has been accepted",
    type: "bid",
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    loadId: "LD-003",
  },
  {
    id: "notif-004",
    title: "Document Uploaded",
    message: "POD uploaded for Load LD-007",
    type: "document",
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
    loadId: "LD-007",
  },
  {
    id: "notif-005",
    title: "Delivery Completed",
    message: "Load LD-005 has been delivered successfully",
    type: "shipment",
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    loadId: "LD-005",
  },
];

export function MockDataProvider({ children }: { children: ReactNode }) {
  const [loads, setLoads] = useState<MockLoad[]>(initialLoads);
  const [bids, setBids] = useState<MockBid[]>(initialBids);
  const [inTransit, setInTransit] = useState<MockInTransit[]>(initialInTransit);
  const [spend, setSpend] = useState<MockSpend>(initialSpend);
  const [notifications, setNotifications] = useState<MockNotification[]>(initialNotifications);

  const createNotification = useCallback((notificationData: Omit<MockNotification, "id" | "createdAt" | "isRead">) => {
    const newNotification: MockNotification = {
      ...notificationData,
      id: generateId("notif"),
      isRead: false,
      createdAt: new Date(),
    };
    setNotifications(prev => [newNotification, ...prev]);
  }, []);

  const addLoad = useCallback((loadData: Omit<MockLoad, "loadId" | "createdAt">): MockLoad => {
    const newLoad: MockLoad = {
      ...loadData,
      loadId: generateId("LD"),
      createdAt: new Date().toISOString(),
    };
    setLoads(prev => [newLoad, ...prev]);
    
    createNotification({
      title: "Load Posted",
      message: `New load ${newLoad.loadId} posted: ${loadData.pickup} to ${loadData.drop}`,
      type: "general",
      loadId: newLoad.loadId,
    });
    
    return newLoad;
  }, [createNotification]);

  const updateLoad = useCallback((loadId: string, updates: Partial<MockLoad>) => {
    setLoads(prev => prev.map(load => 
      load.loadId === loadId ? { ...load, ...updates } : load
    ));
  }, []);

  const cancelLoad = useCallback((loadId: string) => {
    setLoads(prev => prev.map(load => 
      load.loadId === loadId ? { ...load, status: "Cancelled" as const } : load
    ));
    setBids(prev => prev.map(bid => 
      bid.loadId === loadId ? { ...bid, status: "Rejected" as const } : bid
    ));
  }, []);

  const deleteLoad = useCallback((loadId: string) => {
    setLoads(prev => prev.filter(load => load.loadId !== loadId));
    setBids(prev => prev.filter(bid => bid.loadId !== loadId));
  }, []);

  const duplicateLoad = useCallback((loadId: string): MockLoad | null => {
    const original = loads.find(l => l.loadId === loadId);
    if (!original) return null;
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const newLoad: MockLoad = {
      ...original,
      loadId: generateId("LD"),
      status: "Active",
      carrier: null,
      eta: null,
      finalPrice: null,
      pickupDate: tomorrow.toISOString(),
      createdAt: new Date().toISOString(),
    };
    setLoads(prev => [newLoad, ...prev]);
    return newLoad;
  }, [loads]);

  const addBid = useCallback((bidData: Omit<MockBid, "bidId" | "createdAt" | "counterPrice" | "counterMessage">): MockBid => {
    const newBid: MockBid = {
      ...bidData,
      bidId: generateId("BID"),
      counterPrice: null,
      counterMessage: null,
      createdAt: new Date().toISOString(),
    };
    setBids(prev => [newBid, ...prev]);
    
    setLoads(prev => prev.map(load => 
      load.loadId === bidData.loadId && load.status === "Active" 
        ? { ...load, status: "Bidding" as const } 
        : load
    ));
    
    return newBid;
  }, []);

  const acceptBid = useCallback((bidId: string) => {
    const bid = bids.find(b => b.bidId === bidId);
    if (!bid) return;

    setBids(prev => prev.map(b => {
      if (b.bidId === bidId) return { ...b, status: "Accepted" as const };
      if (b.loadId === bid.loadId) return { ...b, status: "Rejected" as const };
      return b;
    }));

    setLoads(prev => prev.map(load => 
      load.loadId === bid.loadId 
        ? { 
            ...load, 
            status: "Assigned" as const, 
            carrier: bid.carrierName,
            eta: bid.eta,
            finalPrice: bid.bidPrice
          } 
        : load
    ));

    setSpend(prev => ({
      ...prev,
      totalAmount: prev.totalAmount + bid.bidPrice,
      carrierSpend: prev.carrierSpend.map(cs => 
        cs.carrier === bid.carrierName 
          ? { ...cs, amount: cs.amount + bid.bidPrice, loads: cs.loads + 1 }
          : cs
      )
    }));

    createNotification({
      title: "Bid Accepted",
      message: `You accepted ${bid.carrierName}'s bid of $${bid.bidPrice.toLocaleString()} for load ${bid.loadId}`,
      type: "bid",
      loadId: bid.loadId,
      bidId: bid.bidId,
    });
  }, [bids, createNotification]);

  const rejectBid = useCallback((bidId: string) => {
    setBids(prev => prev.map(bid => 
      bid.bidId === bidId ? { ...bid, status: "Rejected" as const } : bid
    ));
  }, []);

  const counterBid = useCallback((bidId: string, counterPrice: number, message: string) => {
    const bid = bids.find(b => b.bidId === bidId);
    setBids(prev => prev.map(b => 
      b.bidId === bidId 
        ? { ...b, status: "Countered" as const, counterPrice, counterMessage: message } 
        : b
    ));
    
    if (bid) {
      createNotification({
        title: "Counter-Offer Sent",
        message: `You countered ${bid.carrierName}'s bid with $${counterPrice.toLocaleString()} for load ${bid.loadId}`,
        type: "bid",
        loadId: bid.loadId,
        bidId: bid.bidId,
      });
    }
  }, [bids, createNotification]);

  const moveToTransit = useCallback((loadId: string, vehicleId: string) => {
    const load = loads.find(l => l.loadId === loadId);
    if (!load || !load.carrier) return;

    setLoads(prev => prev.map(l => 
      l.loadId === loadId ? { ...l, status: "En Route" as const } : l
    ));

    const newTransit: MockInTransit = {
      loadId,
      vehicleId,
      pickup: load.pickup,
      drop: load.drop,
      currentLocation: load.pickup,
      currentLat: 34.0522,
      currentLng: -118.2437,
      eta: load.eta || "TBD",
      status: "En Route",
      carrier: load.carrier,
      driver: "Driver Assigned",
      speed: 55,
      fuelLevel: 100,
      engineTemp: 180,
    };
    setInTransit(prev => [newTransit, ...prev]);
  }, [loads]);

  const completeDelivery = useCallback((loadId: string) => {
    const load = loads.find(l => l.loadId === loadId);
    setLoads(prev => prev.map(l => 
      l.loadId === loadId ? { ...l, status: "Delivered" as const } : l
    ));
    setInTransit(prev => prev.filter(t => t.loadId !== loadId));
    
    if (load) {
      createNotification({
        title: "Delivery Completed",
        message: `Load ${loadId} has been delivered to ${load.drop}`,
        type: "shipment",
        loadId: loadId,
      });
    }
  }, [loads, createNotification]);

  const getActiveLoads = useCallback(() => 
    loads.filter(l => ["Active", "Bidding", "Assigned"].includes(l.status)),
  [loads]);

  const getPendingBids = useCallback(() => 
    bids.filter(b => b.status === "Pending"),
  [bids]);

  const getInTransitLoads = useCallback(() => inTransit, [inTransit]);

  const getLoadById = useCallback((loadId: string) => 
    loads.find(l => l.loadId === loadId),
  [loads]);

  const getBidsForLoad = useCallback((loadId: string) => 
    bids.filter(b => b.loadId === loadId),
  [bids]);

  const addNotification = createNotification;

  const markNotificationRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, isRead: true } : n
    ));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  }, []);

  const getUnreadNotificationCount = useCallback(() => 
    notifications.filter(n => !n.isRead).length,
  [notifications]);

  return (
    <MockDataContext.Provider value={{
      loads,
      bids,
      inTransit,
      spend,
      notifications,
      addLoad,
      updateLoad,
      cancelLoad,
      deleteLoad,
      duplicateLoad,
      addBid,
      acceptBid,
      rejectBid,
      counterBid,
      moveToTransit,
      completeDelivery,
      getActiveLoads,
      getPendingBids,
      getInTransitLoads,
      getLoadById,
      getBidsForLoad,
      addNotification,
      markNotificationRead,
      markAllNotificationsRead,
      getUnreadNotificationCount,
    }}>
      {children}
    </MockDataContext.Provider>
  );
}

export function useMockData() {
  const context = useContext(MockDataContext);
  if (!context) {
    throw new Error("useMockData must be used within a MockDataProvider");
  }
  return context;
}
