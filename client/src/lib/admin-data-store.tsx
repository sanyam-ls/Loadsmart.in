import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { useMockData, type MockLoad, type MockBid, type TrackedShipment, type ShipmentDocument } from "./mock-data-store";
import { mockCarriers, type ExtendedCarrier } from "./carrier-data";
import { useDocumentVault, type VaultDocument } from "./document-vault-store";

export interface AdminUser {
  userId: string;
  name: string;
  email: string;
  company: string;
  role: "shipper" | "carrier" | "admin";
  status: "active" | "suspended" | "pending";
  dateJoined: Date;
  phone?: string;
  isVerified: boolean;
  lastActive?: Date;
}

export interface AdminLoad {
  loadId: string;
  shipperId: string;
  shipperName: string;
  pickup: string;
  drop: string;
  weight: number;
  weightUnit: string;
  type: string;
  status: "Active" | "Bidding" | "Assigned" | "En Route" | "Delivered" | "Cancelled" | "Pending";
  assignedCarrier: string | null;
  carrierId: string | null;
  createdDate: Date;
  eta: string | null;
  spending: number;
  bidCount: number;
}

export interface AdminCarrier {
  carrierId: string;
  companyName: string;
  verificationStatus: "verified" | "pending" | "rejected" | "expired";
  fleetSize: number;
  serviceZones: string[];
  activityLevel: "high" | "medium" | "low";
  rating: number;
  totalDeliveries: number;
  onTimePercent: number;
  email: string;
  phone: string;
  dateJoined: Date;
}

export interface VerificationRequest {
  requestId: string;
  entityType: "carrier" | "shipper" | "document";
  entityId: string;
  entityName: string;
  documentType?: string;
  documentName?: string;
  submittedAt: Date;
  status: "pending" | "approved" | "rejected";
  reviewedBy?: string;
  reviewedAt?: Date;
  notes?: string;
}

export interface TransactionRecord {
  transactionId: string;
  loadId: string;
  route: string;
  shipperId: string;
  shipperName: string;
  carrierId: string;
  carrierName: string;
  amount: number;
  status: "completed" | "pending" | "failed" | "refunded";
  date: Date;
  paymentMethod: string;
}

export interface MonthlyReport {
  month: string;
  year: number;
  totalVolume: number;
  loadCount: number;
  userGrowth: { shippers: number; carriers: number };
  loadDistribution: { completed: number; inTransit: number; pending: number; cancelled: number };
}

export interface RecentActivity {
  id: string;
  type: "user" | "load" | "carrier" | "document" | "transaction";
  message: string;
  entityId?: string;
  timestamp: Date;
  severity: "info" | "warning" | "success" | "error";
}

interface AdminStats {
  totalUsers: number;
  activeLoads: number;
  verifiedCarriers: number;
  pendingVerifications: number;
  monthlyVolume: number;
  monthlyChange: number;
  completedLoads: number;
  inTransitLoads: number;
  pendingLoads: number;
}

interface AdminDataContextType {
  users: AdminUser[];
  loads: AdminLoad[];
  carriers: AdminCarrier[];
  verificationQueue: VerificationRequest[];
  transactions: TransactionRecord[];
  monthlyReports: MonthlyReport[];
  recentActivity: RecentActivity[];
  stats: AdminStats;
  
  addUser: (user: Omit<AdminUser, "userId" | "dateJoined">) => AdminUser;
  updateUser: (userId: string, updates: Partial<AdminUser>) => void;
  suspendUser: (userId: string) => void;
  activateUser: (userId: string) => void;
  deleteUser: (userId: string) => void;
  
  updateLoad: (loadId: string, updates: Partial<AdminLoad>) => void;
  assignCarrier: (loadId: string, carrierId: string, carrierName: string) => void;
  updateLoadStatus: (loadId: string, status: AdminLoad["status"]) => void;
  
  updateCarrier: (carrierId: string, updates: Partial<AdminCarrier>) => void;
  verifyCarrier: (carrierId: string) => void;
  rejectCarrier: (carrierId: string, reason?: string) => void;
  
  approveVerification: (requestId: string, reviewer: string) => void;
  rejectVerification: (requestId: string, reviewer: string, reason?: string) => void;
  
  addActivity: (activity: Omit<RecentActivity, "id" | "timestamp">) => void;
  
  refreshFromShipperPortal: () => void;
  syncToShipperPortal: (loadId: string, updates: Partial<MockLoad>) => void;
}

const AdminDataContext = createContext<AdminDataContextType | null>(null);

function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

const initialUsers: AdminUser[] = [
  {
    userId: "USR-001",
    name: "John Anderson",
    email: "john@globalfreight.com",
    company: "Global Freight Solutions",
    role: "shipper",
    status: "active",
    dateJoined: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
    phone: "(555) 123-4567",
    isVerified: true,
    lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    userId: "USR-002",
    name: "Sarah Mitchell",
    email: "sarah@acmelogistics.com",
    company: "Acme Logistics Corp",
    role: "shipper",
    status: "active",
    dateJoined: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    phone: "(555) 234-5678",
    isVerified: true,
    lastActive: new Date(Date.now() - 30 * 60 * 1000),
  },
  {
    userId: "USR-003",
    name: "Mike Chen",
    email: "mike@swifttransport.com",
    company: "Swift Transport Co",
    role: "carrier",
    status: "active",
    dateJoined: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
    phone: "(555) 345-6789",
    isVerified: true,
    lastActive: new Date(Date.now() - 1 * 60 * 60 * 1000),
  },
  {
    userId: "USR-004",
    name: "Emily Rodriguez",
    email: "emily@fasthaul.com",
    company: "FastHaul Logistics",
    role: "carrier",
    status: "active",
    dateJoined: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000),
    phone: "(555) 456-7890",
    isVerified: true,
    lastActive: new Date(Date.now() - 4 * 60 * 60 * 1000),
  },
  {
    userId: "USR-005",
    name: "David Kumar",
    email: "david@newshipper.com",
    company: "New Shipper Inc",
    role: "shipper",
    status: "pending",
    dateJoined: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    phone: "(555) 567-8901",
    isVerified: false,
  },
  {
    userId: "USR-006",
    name: "Lisa Thompson",
    email: "lisa@premierfreight.com",
    company: "Premier Freight",
    role: "carrier",
    status: "active",
    dateJoined: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000),
    phone: "(555) 678-9012",
    isVerified: true,
    lastActive: new Date(Date.now() - 12 * 60 * 60 * 1000),
  },
  {
    userId: "USR-007",
    name: "Admin User",
    email: "admin@freightflow.com",
    company: "FreightFlow Platform",
    role: "admin",
    status: "active",
    dateJoined: new Date(Date.now() - 500 * 24 * 60 * 60 * 1000),
    phone: "(555) 000-0001",
    isVerified: true,
    lastActive: new Date(),
  },
  {
    userId: "USR-008",
    name: "Robert Wilson",
    email: "robert@megahaul.com",
    company: "MegaHaul Inc",
    role: "carrier",
    status: "suspended",
    dateJoined: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
    phone: "(555) 789-0123",
    isVerified: false,
  },
  {
    userId: "USR-009",
    name: "Jennifer Lee",
    email: "jennifer@titantrucking.com",
    company: "Titan Trucking Co",
    role: "carrier",
    status: "active",
    dateJoined: new Date(Date.now() - 250 * 24 * 60 * 60 * 1000),
    phone: "(555) 890-1234",
    isVerified: true,
    lastActive: new Date(Date.now() - 6 * 60 * 60 * 1000),
  },
  {
    userId: "USR-010",
    name: "Mark Johnson",
    email: "mark@blustarcarriers.com",
    company: "BlueStar Carriers",
    role: "carrier",
    status: "active",
    dateJoined: new Date(Date.now() - 300 * 24 * 60 * 60 * 1000),
    phone: "(555) 901-2345",
    isVerified: true,
    lastActive: new Date(Date.now() - 8 * 60 * 60 * 1000),
  },
];

const initialVerificationQueue: VerificationRequest[] = [
  {
    requestId: "VER-001",
    entityType: "carrier",
    entityId: "carrier-11",
    entityName: "Thunder Road Logistics",
    submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    status: "pending",
  },
  {
    requestId: "VER-002",
    entityType: "carrier",
    entityId: "carrier-12",
    entityName: "Pacific Haulers Inc",
    submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    status: "pending",
  },
  {
    requestId: "VER-003",
    entityType: "document",
    entityId: "DOC-VER-001",
    entityName: "Swift Transport Co",
    documentType: "Motor Carrier Authority",
    documentName: "MC_Authority_2024.pdf",
    submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    status: "pending",
  },
  {
    requestId: "VER-004",
    entityType: "document",
    entityId: "DOC-VER-002",
    entityName: "FastHaul Logistics",
    documentType: "Cargo Insurance",
    documentName: "Cargo_Insurance_Cert.pdf",
    submittedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    status: "pending",
  },
  {
    requestId: "VER-005",
    entityType: "shipper",
    entityId: "USR-005",
    entityName: "New Shipper Inc",
    submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    status: "pending",
  },
];

const initialTransactions: TransactionRecord[] = [
  {
    transactionId: "TXN-001",
    loadId: "LD-003",
    route: "Dallas, TX to Houston, TX",
    shipperId: "USR-001",
    shipperName: "Global Freight Solutions",
    carrierId: "carrier-4",
    carrierName: "FastHaul Logistics",
    amount: 1150,
    status: "completed",
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    paymentMethod: "Bank Transfer",
  },
  {
    transactionId: "TXN-002",
    loadId: "LD-T001",
    route: "New York, NY to Boston, MA",
    shipperId: "USR-002",
    shipperName: "Acme Logistics Corp",
    carrierId: "carrier-4",
    carrierName: "FastHaul Logistics",
    amount: 2800,
    status: "pending",
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    paymentMethod: "Credit Card",
  },
  {
    transactionId: "TXN-003",
    loadId: "LD-T002",
    route: "San Francisco, CA to Los Angeles, CA",
    shipperId: "USR-001",
    shipperName: "Global Freight Solutions",
    carrierId: "carrier-1",
    carrierName: "Swift Transport Co",
    amount: 1950,
    status: "completed",
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    paymentMethod: "Bank Transfer",
  },
];

const generateMonthlyReports = (): MonthlyReport[] => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const currentMonth = new Date().getMonth();
  
  return months.map((month, idx) => {
    const baseVolume = 1800000 + Math.random() * 800000;
    const loadCount = 280 + Math.floor(Math.random() * 80);
    
    return {
      month,
      year: 2025,
      totalVolume: Math.round(baseVolume * (idx <= currentMonth ? 1 : 0.8)),
      loadCount: idx <= currentMonth ? loadCount : Math.floor(loadCount * 0.7),
      userGrowth: {
        shippers: 180 + idx * 15 + Math.floor(Math.random() * 20),
        carriers: 45 + idx * 4 + Math.floor(Math.random() * 8),
      },
      loadDistribution: {
        completed: Math.floor(loadCount * 0.7),
        inTransit: Math.floor(loadCount * 0.15),
        pending: Math.floor(loadCount * 0.1),
        cancelled: Math.floor(loadCount * 0.05),
      },
    };
  });
};

const initialActivity: RecentActivity[] = [
  {
    id: "ACT-001",
    type: "carrier",
    message: "New carrier registered: Thunder Road Logistics",
    entityId: "carrier-11",
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    severity: "info",
  },
  {
    id: "ACT-002",
    type: "load",
    message: "Load #LD-003 marked as delivered",
    entityId: "LD-003",
    timestamp: new Date(Date.now() - 12 * 60 * 1000),
    severity: "success",
  },
  {
    id: "ACT-003",
    type: "document",
    message: "Document verification pending: MegaHaul MC Authority",
    entityId: "DOC-VER-001",
    timestamp: new Date(Date.now() - 25 * 60 * 1000),
    severity: "warning",
  },
  {
    id: "ACT-004",
    type: "user",
    message: "New shipper registered: New Shipper Inc",
    entityId: "USR-005",
    timestamp: new Date(Date.now() - 60 * 60 * 1000),
    severity: "info",
  },
  {
    id: "ACT-005",
    type: "load",
    message: "New load posted: LA to Phoenix (15,000 lbs)",
    entityId: "LD-001",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    severity: "info",
  },
  {
    id: "ACT-006",
    type: "transaction",
    message: "Payment completed: $1,150 for Dallas-Houston route",
    entityId: "TXN-001",
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
    severity: "success",
  },
  {
    id: "ACT-007",
    type: "carrier",
    message: "Carrier suspended: MegaHaul Inc - compliance issue",
    entityId: "carrier-4",
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
    severity: "error",
  },
];

export function AdminDataProvider({ children }: { children: ReactNode }) {
  const shipperData = useMockData();
  const documentVault = useDocumentVault();
  
  const [users, setUsers] = useState<AdminUser[]>(initialUsers);
  const [adminLoads, setAdminLoads] = useState<AdminLoad[]>([]);
  const [carriers, setCarriers] = useState<AdminCarrier[]>([]);
  const [verificationQueue, setVerificationQueue] = useState<VerificationRequest[]>(initialVerificationQueue);
  const [transactions, setTransactions] = useState<TransactionRecord[]>(initialTransactions);
  const [monthlyReports] = useState<MonthlyReport[]>(generateMonthlyReports());
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>(initialActivity);

  const usersRef = useRef(users);
  const carriersRef = useRef(carriers);
  const adminLoadsRef = useRef(adminLoads);

  useEffect(() => { usersRef.current = users; }, [users]);
  useEffect(() => { carriersRef.current = carriers; }, [carriers]);
  useEffect(() => { adminLoadsRef.current = adminLoads; }, [adminLoads]);

  const syncCarriersFromSource = useCallback(() => {
    const adminCarriers: AdminCarrier[] = mockCarriers.map((c) => ({
      carrierId: c.id,
      companyName: c.companyName || "Unknown Carrier",
      verificationStatus: c.isVerified ? "verified" : "pending",
      fleetSize: c.carrierProfile?.fleetSize || 0,
      serviceZones: c.carrierProfile?.serviceZones || [],
      activityLevel: (c.carrierProfile?.totalDeliveries || 0) > 200 ? "high" : (c.carrierProfile?.totalDeliveries || 0) > 50 ? "medium" : "low",
      rating: parseFloat(c.carrierProfile?.reliabilityScore || "4.0"),
      totalDeliveries: c.carrierProfile?.totalDeliveries || 0,
      onTimePercent: c.extendedProfile?.onTimeDeliveryPct || 90,
      email: c.email || "",
      phone: c.phone || "",
      dateJoined: c.createdAt || new Date(),
    }));
    setCarriers(adminCarriers);
  }, []);

  const syncLoadsFromShipper = useCallback(() => {
    const shipperLoads = shipperData.loads;
    const shipperBids = shipperData.bids;
    
    const adminLoadsData: AdminLoad[] = shipperLoads.map((load) => {
      const bidsForLoad = shipperBids.filter(b => b.loadId === load.loadId);
      return {
        loadId: load.loadId,
        shipperId: "USR-001",
        shipperName: "Demo Shipper",
        pickup: load.pickup,
        drop: load.drop,
        weight: load.weight,
        weightUnit: load.weightUnit,
        type: load.type,
        status: load.status as AdminLoad["status"],
        assignedCarrier: load.carrier,
        carrierId: bidsForLoad.find(b => b.status === "Accepted")?.carrierId || null,
        createdDate: new Date(load.createdAt),
        eta: load.eta,
        spending: load.finalPrice || load.estimatedPrice,
        bidCount: bidsForLoad.length,
      };
    });
    
    const inTransitLoads: AdminLoad[] = shipperData.inTransit.map((t) => ({
      loadId: t.loadId,
      shipperId: "USR-001",
      shipperName: "Demo Shipper",
      pickup: t.pickup,
      drop: t.drop,
      weight: 0,
      weightUnit: "lbs",
      type: "Dry Van",
      status: "En Route" as const,
      assignedCarrier: t.carrier,
      carrierId: null,
      createdDate: new Date(Date.now() - 48 * 60 * 60 * 1000),
      eta: t.eta,
      spending: 2500,
      bidCount: 0,
    }));
    
    const allLoads = [...adminLoadsData, ...inTransitLoads];
    setAdminLoads(allLoads);
  }, [shipperData.loads, shipperData.bids, shipperData.inTransit]);

  useEffect(() => {
    syncCarriersFromSource();
  }, [syncCarriersFromSource]);

  useEffect(() => {
    syncLoadsFromShipper();
  }, [syncLoadsFromShipper]);

  const stats: AdminStats = {
    totalUsers: users.length + carriers.length,
    activeLoads: adminLoads.filter(l => ["Active", "Bidding", "Assigned", "En Route"].includes(l.status)).length,
    verifiedCarriers: carriers.filter(c => c.verificationStatus === "verified").length,
    pendingVerifications: verificationQueue.filter(v => v.status === "pending").length,
    monthlyVolume: monthlyReports[new Date().getMonth()]?.totalVolume || 2450000,
    monthlyChange: 15,
    completedLoads: adminLoads.filter(l => l.status === "Delivered").length,
    inTransitLoads: adminLoads.filter(l => l.status === "En Route").length,
    pendingLoads: adminLoads.filter(l => ["Active", "Bidding", "Pending"].includes(l.status)).length,
  };

  const addUser = useCallback((userData: Omit<AdminUser, "userId" | "dateJoined">): AdminUser => {
    const newUser: AdminUser = {
      ...userData,
      userId: generateId("USR"),
      dateJoined: new Date(),
    };
    setUsers(prev => [...prev, newUser]);
    addActivity({
      type: "user",
      message: `New ${userData.role} registered: ${userData.company}`,
      entityId: newUser.userId,
      severity: "info",
    });
    return newUser;
  }, []);

  const updateUser = useCallback((userId: string, updates: Partial<AdminUser>) => {
    setUsers(prev => prev.map(u => u.userId === userId ? { ...u, ...updates } : u));
  }, []);

  const suspendUser = useCallback((userId: string) => {
    const user = usersRef.current.find(u => u.userId === userId);
    setUsers(prev => prev.map(u => u.userId === userId ? { ...u, status: "suspended" } : u));
    if (user) {
      addActivity({
        type: "user",
        message: `User suspended: ${user.name}`,
        entityId: userId,
        severity: "warning",
      });
    }
  }, []);

  const activateUser = useCallback((userId: string) => {
    const user = usersRef.current.find(u => u.userId === userId);
    setUsers(prev => prev.map(u => u.userId === userId ? { ...u, status: "active", isVerified: true } : u));
    if (user) {
      addActivity({
        type: "user",
        message: `User activated: ${user.name}`,
        entityId: userId,
        severity: "success",
      });
    }
  }, []);

  const deleteUser = useCallback((userId: string) => {
    setUsers(prev => prev.filter(u => u.userId !== userId));
  }, []);

  const updateLoad = useCallback((loadId: string, updates: Partial<AdminLoad>) => {
    setAdminLoads(prev => prev.map(l => l.loadId === loadId ? { ...l, ...updates } : l));
    if (updates.status) {
      shipperData.updateLoad(loadId, { status: updates.status as MockLoad["status"] });
    }
  }, [shipperData]);

  const assignCarrier = useCallback((loadId: string, carrierId: string, carrierName: string) => {
    setAdminLoads(prev => prev.map(l => 
      l.loadId === loadId 
        ? { ...l, assignedCarrier: carrierName, carrierId, status: "Assigned" as const }
        : l
    ));
    shipperData.updateLoad(loadId, { carrier: carrierName, status: "Assigned" });
    addActivity({
      type: "load",
      message: `Carrier ${carrierName} assigned to load ${loadId}`,
      entityId: loadId,
      severity: "success",
    });
  }, [shipperData]);

  const updateLoadStatus = useCallback((loadId: string, status: AdminLoad["status"]) => {
    setAdminLoads(prev => prev.map(l => l.loadId === loadId ? { ...l, status } : l));
    shipperData.updateLoad(loadId, { status: status as MockLoad["status"] });
    addActivity({
      type: "load",
      message: `Load ${loadId} status changed to ${status}`,
      entityId: loadId,
      severity: "info",
    });
  }, [shipperData]);

  const updateCarrier = useCallback((carrierId: string, updates: Partial<AdminCarrier>) => {
    setCarriers(prev => prev.map(c => c.carrierId === carrierId ? { ...c, ...updates } : c));
  }, []);

  const verifyCarrier = useCallback((carrierId: string) => {
    const carrier = carriersRef.current.find(c => c.carrierId === carrierId);
    setCarriers(prev => prev.map(c => 
      c.carrierId === carrierId ? { ...c, verificationStatus: "verified" } : c
    ));
    setVerificationQueue(prev => prev.map(v => 
      v.entityId === carrierId && v.entityType === "carrier" 
        ? { ...v, status: "approved", reviewedAt: new Date() }
        : v
    ));
    if (carrier) {
      addActivity({
        type: "carrier",
        message: `Carrier verified: ${carrier.companyName}`,
        entityId: carrierId,
        severity: "success",
      });
    }
  }, []);

  const rejectCarrier = useCallback((carrierId: string, reason?: string) => {
    const carrier = carriersRef.current.find(c => c.carrierId === carrierId);
    setCarriers(prev => prev.map(c => 
      c.carrierId === carrierId ? { ...c, verificationStatus: "rejected" } : c
    ));
    setVerificationQueue(prev => prev.map(v => 
      v.entityId === carrierId && v.entityType === "carrier" 
        ? { ...v, status: "rejected", reviewedAt: new Date(), notes: reason }
        : v
    ));
    if (carrier) {
      addActivity({
        type: "carrier",
        message: `Carrier verification rejected: ${carrier.companyName}`,
        entityId: carrierId,
        severity: "error",
      });
    }
  }, []);

  const approveVerification = useCallback((requestId: string, reviewer: string) => {
    const request = verificationQueue.find(v => v.requestId === requestId);
    setVerificationQueue(prev => prev.map(v => 
      v.requestId === requestId 
        ? { ...v, status: "approved", reviewedBy: reviewer, reviewedAt: new Date() }
        : v
    ));
    if (request) {
      if (request.entityType === "carrier") {
        verifyCarrier(request.entityId);
      } else if (request.entityType === "shipper") {
        activateUser(request.entityId);
      }
      addActivity({
        type: request.entityType === "document" ? "document" : request.entityType === "shipper" ? "user" : "carrier",
        message: `Verification approved: ${request.entityName}${request.documentType ? ` - ${request.documentType}` : ""}`,
        entityId: request.entityId,
        severity: "success",
      });
    }
  }, [verificationQueue, verifyCarrier, activateUser]);

  const rejectVerification = useCallback((requestId: string, reviewer: string, reason?: string) => {
    const request = verificationQueue.find(v => v.requestId === requestId);
    setVerificationQueue(prev => prev.map(v => 
      v.requestId === requestId 
        ? { ...v, status: "rejected", reviewedBy: reviewer, reviewedAt: new Date(), notes: reason }
        : v
    ));
    if (request) {
      addActivity({
        type: request.entityType === "document" ? "document" : request.entityType === "shipper" ? "user" : "carrier",
        message: `Verification rejected: ${request.entityName}`,
        entityId: request.entityId,
        severity: "error",
      });
    }
  }, [verificationQueue]);

  const addActivity = useCallback((activity: Omit<RecentActivity, "id" | "timestamp">) => {
    const newActivity: RecentActivity = {
      ...activity,
      id: generateId("ACT"),
      timestamp: new Date(),
    };
    setRecentActivity(prev => [newActivity, ...prev].slice(0, 50));
  }, []);

  const refreshFromShipperPortal = useCallback(() => {
    syncLoadsFromShipper();
    syncCarriersFromSource();
    addActivity({
      type: "load",
      message: "Data synchronized with Shipper Portal",
      severity: "info",
    });
  }, [syncLoadsFromShipper, syncCarriersFromSource]);

  const syncToShipperPortal = useCallback((loadId: string, updates: Partial<MockLoad>) => {
    shipperData.updateLoad(loadId, updates);
    addActivity({
      type: "load",
      message: `Load ${loadId} synced to Shipper Portal`,
      entityId: loadId,
      severity: "info",
    });
  }, [shipperData]);

  return (
    <AdminDataContext.Provider value={{
      users,
      loads: adminLoads,
      carriers,
      verificationQueue,
      transactions,
      monthlyReports,
      recentActivity,
      stats,
      addUser,
      updateUser,
      suspendUser,
      activateUser,
      deleteUser,
      updateLoad,
      assignCarrier,
      updateLoadStatus,
      updateCarrier,
      verifyCarrier,
      rejectCarrier,
      approveVerification,
      rejectVerification,
      addActivity,
      refreshFromShipperPortal,
      syncToShipperPortal,
    }}>
      {children}
    </AdminDataContext.Provider>
  );
}

export function useAdminData() {
  const context = useContext(AdminDataContext);
  if (!context) {
    throw new Error("useAdminData must be used within an AdminDataProvider");
  }
  return context;
}
