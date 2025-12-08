import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { useMockData, type MockLoad, type MockBid, type TrackedShipment, type ShipmentDocument } from "./mock-data-store";
import { mockCarriers, type ExtendedCarrier } from "./carrier-data";
import { useDocumentVault, type VaultDocument } from "./document-vault-store";

export interface AdminUser {
  userId: string;
  name: string;
  email: string;
  company: string;
  role: "shipper" | "carrier" | "admin" | "dispatcher";
  status: "active" | "suspended" | "pending";
  dateJoined: Date;
  phone?: string;
  isVerified: boolean;
  lastActive?: Date;
  region: string;
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
  distance: number;
  dimensions: string;
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
  reliabilityScore: number;
  avgResponseTime: number;
  completedShipments: number;
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
  userGrowthPercent: number;
  loadGrowthPercent: number;
  carrierGrowthPercent: number;
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

const indianFirstNames = [
  "Rajesh", "Priya", "Amit", "Neha", "Vikram", "Sunita", "Arun", "Kavitha", "Suresh", "Deepa",
  "Rahul", "Anjali", "Sanjay", "Meera", "Vijay", "Lakshmi", "Prakash", "Rekha", "Manoj", "Shweta",
  "Ramesh", "Pooja", "Ashok", "Divya", "Sunil", "Ritu", "Ajay", "Preeti", "Mohan", "Swathi",
  "Ravi", "Anita", "Kiran", "Sneha", "Gaurav", "Asha", "Naveen", "Bhavna", "Rohit", "Pallavi",
  "Anil", "Jyoti", "Dinesh", "Sapna", "Pankaj", "Nisha", "Alok", "Vandana", "Hemant", "Rashmi"
];

const indianLastNames = [
  "Sharma", "Patel", "Singh", "Kumar", "Reddy", "Rao", "Gupta", "Joshi", "Verma", "Mehta",
  "Agarwal", "Iyer", "Nair", "Menon", "Pillai", "Bhat", "Hegde", "Kaur", "Gill", "Malhotra",
  "Kapoor", "Khanna", "Chopra", "Tandon", "Saxena", "Tripathi", "Pandey", "Mishra", "Dubey", "Tiwari",
  "Chauhan", "Rathore", "Shekhawat", "Bhardwaj", "Yadav", "Srivastava", "Banerjee", "Chatterjee", "Mukherjee", "Das"
];

const companyNames = [
  "Tata Logistics", "Reliance Transport", "Mahindra Freight", "Ashok Leyland Carriers", "Gati Express",
  "BlueDart Cargo", "DTDC Logistics", "Delhivery Express", "Ecom Express", "Shadowfax Logistics",
  "Rivigo Carriers", "SafeExpress", "TCI Express", "VRL Logistics", "Continental Carriers",
  "ABT Industries", "Agarwal Packers", "Om Logistics", "Allied Logistics", "Patel Roadways",
  "Shree Maruti Courier", "XpressBees", "FirstFlight Logistics", "Trackon Logistics", "Professional Couriers",
  "India Post Logistics", "Raj Freight", "Bharat Transport", "National Express", "Express Roadways",
  "Punjab Carriers", "Gujarat Freight", "Maharashtra Logistics", "Karnataka Express", "Tamil Nadu Transport",
  "Kerala Cargo", "Bengal Logistics", "Bihar Carriers", "UP Express", "Rajasthan Roadways"
];

const regions = [
  "North India", "South India", "West India", "East India", "Central India",
  "Delhi NCR", "Mumbai Metropolitan", "Bangalore Urban", "Chennai Metro", "Kolkata Metro",
  "Punjab", "Gujarat", "Maharashtra", "Karnataka", "Tamil Nadu", "Kerala", "Bengal", "UP", "Rajasthan", "MP"
];

const cities = [
  "Delhi", "Mumbai", "Bangalore", "Chennai", "Kolkata", "Hyderabad", "Pune", "Ahmedabad",
  "Jaipur", "Lucknow", "Kanpur", "Nagpur", "Indore", "Bhopal", "Patna", "Vadodara",
  "Ghaziabad", "Ludhiana", "Agra", "Nashik", "Faridabad", "Meerut", "Rajkot", "Varanasi",
  "Srinagar", "Aurangabad", "Dhanbad", "Amritsar", "Allahabad", "Ranchi", "Coimbatore", "Jabalpur",
  "Gwalior", "Vijayawada", "Jodhpur", "Madurai", "Raipur", "Kota", "Chandigarh", "Guwahati"
];

const loadTypes = ["Dry Van", "Refrigerated", "Flatbed", "Container", "Open Body", "Tanker", "LTL", "FTL", "Parcel", "Heavy Haul"];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateEnterpriseUsers(): AdminUser[] {
  const users: AdminUser[] = [];
  const totalUsers = randomBetween(350, 450);
  
  const roleDistribution = {
    shipper: Math.floor(totalUsers * 0.45),
    carrier: Math.floor(totalUsers * 0.40),
    dispatcher: Math.floor(totalUsers * 0.10),
    admin: Math.floor(totalUsers * 0.05),
  };
  
  let userId = 1;
  
  for (const [role, count] of Object.entries(roleDistribution)) {
    for (let i = 0; i < count; i++) {
      const firstName = randomFrom(indianFirstNames);
      const lastName = randomFrom(indianLastNames);
      const company = role === "admin" ? "FreightFlow Platform" : randomFrom(companyNames);
      const daysAgo = randomBetween(1, 730);
      const isRecent = daysAgo < 30;
      const status = isRecent && Math.random() < 0.3 ? "pending" : (Math.random() < 0.05 ? "suspended" : "active");
      
      users.push({
        userId: `USR-${String(userId).padStart(4, "0")}`,
        name: `${firstName} ${lastName}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${company.toLowerCase().replace(/\s+/g, "")}.com`,
        company,
        role: role as AdminUser["role"],
        status,
        dateJoined: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
        phone: `+91 ${randomBetween(70000, 99999)} ${randomBetween(10000, 99999)}`,
        isVerified: status === "active" && Math.random() > 0.1,
        lastActive: status === "active" ? new Date(Date.now() - randomBetween(0, 48) * 60 * 60 * 1000) : undefined,
        region: randomFrom(regions),
      });
      userId++;
    }
  }
  
  return users;
}

function generateEnterpriseLoads(users: AdminUser[]): AdminLoad[] {
  const loads: AdminLoad[] = [];
  const totalLoads = randomBetween(180, 280);
  const shippers = users.filter(u => u.role === "shipper");
  
  const statusDistribution = {
    "Active": 0.15,
    "Bidding": 0.20,
    "Assigned": 0.10,
    "En Route": 0.25,
    "Delivered": 0.25,
    "Cancelled": 0.03,
    "Pending": 0.02,
  };
  
  for (let i = 0; i < totalLoads; i++) {
    const shipper = randomFrom(shippers);
    const pickup = randomFrom(cities);
    let drop = randomFrom(cities);
    while (drop === pickup) drop = randomFrom(cities);
    
    const rand = Math.random();
    let cumulative = 0;
    let status: AdminLoad["status"] = "Active";
    for (const [s, prob] of Object.entries(statusDistribution)) {
      cumulative += prob;
      if (rand < cumulative) {
        status = s as AdminLoad["status"];
        break;
      }
    }
    
    const daysAgo = randomBetween(0, 60);
    const weight = randomBetween(500, 25000);
    const distance = randomBetween(100, 2500);
    const spending = Math.round(distance * randomBetween(15, 45) + weight * 0.02);
    
    loads.push({
      loadId: `LD-${String(i + 1).padStart(5, "0")}`,
      shipperId: shipper.userId,
      shipperName: shipper.company,
      pickup,
      drop,
      weight,
      weightUnit: "kg",
      type: randomFrom(loadTypes),
      status,
      assignedCarrier: ["Assigned", "En Route", "Delivered"].includes(status) ? randomFrom(companyNames) : null,
      carrierId: ["Assigned", "En Route", "Delivered"].includes(status) ? `CAR-${randomBetween(1, 100)}` : null,
      createdDate: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
      eta: ["En Route", "Assigned"].includes(status) ? `${randomBetween(1, 5)} days` : null,
      spending,
      bidCount: ["Active", "Bidding"].includes(status) ? randomBetween(1, 12) : randomBetween(3, 8),
      distance,
      dimensions: `${randomBetween(4, 20)}ft x ${randomBetween(4, 10)}ft x ${randomBetween(4, 10)}ft`,
    });
  }
  
  return loads;
}

function generateEnterpriseCarriers(): AdminCarrier[] {
  const carriers: AdminCarrier[] = [];
  const totalCarriers = randomBetween(90, 130);
  
  for (let i = 0; i < totalCarriers; i++) {
    const totalDeliveries = randomBetween(10, 800);
    const isHighPerformer = totalDeliveries > 300;
    const rating = isHighPerformer ? 4.2 + Math.random() * 0.8 : 3.5 + Math.random() * 1.0;
    const onTimePercent = isHighPerformer ? randomBetween(88, 99) : randomBetween(70, 92);
    const verificationStatus = Math.random() < 0.75 ? "verified" : (Math.random() < 0.6 ? "pending" : (Math.random() < 0.5 ? "rejected" : "expired"));
    
    const zoneCount = randomBetween(1, 5);
    const serviceZones: string[] = [];
    for (let j = 0; j < zoneCount; j++) {
      const zone = randomFrom(regions);
      if (!serviceZones.includes(zone)) serviceZones.push(zone);
    }
    
    carriers.push({
      carrierId: `CAR-${String(i + 1).padStart(4, "0")}`,
      companyName: randomFrom(companyNames) + (i > companyNames.length ? ` ${i}` : ""),
      verificationStatus,
      fleetSize: randomBetween(2, 150),
      serviceZones,
      activityLevel: totalDeliveries > 300 ? "high" : (totalDeliveries > 80 ? "medium" : "low"),
      rating: Math.round(rating * 10) / 10,
      totalDeliveries,
      onTimePercent,
      email: `contact@carrier${i + 1}.in`,
      phone: `+91 ${randomBetween(70000, 99999)} ${randomBetween(10000, 99999)}`,
      dateJoined: new Date(Date.now() - randomBetween(30, 900) * 24 * 60 * 60 * 1000),
      reliabilityScore: Math.round((rating / 5) * 100),
      avgResponseTime: randomBetween(5, 120),
      completedShipments: Math.floor(totalDeliveries * 0.95),
    });
  }
  
  return carriers;
}

function generateEnterpriseTransactions(loads: AdminLoad[], carriers: AdminCarrier[]): TransactionRecord[] {
  const transactions: TransactionRecord[] = [];
  const completedLoads = loads.filter(l => l.status === "Delivered");
  
  for (const load of completedLoads) {
    const carrier = randomFrom(carriers);
    transactions.push({
      transactionId: `TXN-${transactions.length + 1}`.padStart(8, "0"),
      loadId: load.loadId,
      route: `${load.pickup} to ${load.drop}`,
      shipperId: load.shipperId,
      shipperName: load.shipperName,
      carrierId: carrier.carrierId,
      carrierName: carrier.companyName,
      amount: load.spending,
      status: Math.random() < 0.9 ? "completed" : (Math.random() < 0.5 ? "pending" : "refunded"),
      date: new Date(load.createdDate.getTime() + randomBetween(1, 7) * 24 * 60 * 60 * 1000),
      paymentMethod: randomFrom(["Bank Transfer", "UPI", "Credit Card", "Net Banking", "Wallet"]),
    });
  }
  
  const additionalTransactions = randomBetween(200, 400);
  for (let i = 0; i < additionalTransactions; i++) {
    const carrier = randomFrom(carriers);
    const pickup = randomFrom(cities);
    let drop = randomFrom(cities);
    while (drop === pickup) drop = randomFrom(cities);
    const daysAgo = randomBetween(1, 730);
    
    transactions.push({
      transactionId: `TXN-${String(transactions.length + 1).padStart(6, "0")}`,
      loadId: `LD-H${String(i + 1).padStart(5, "0")}`,
      route: `${pickup} to ${drop}`,
      shipperId: `USR-${String(randomBetween(1, 200)).padStart(4, "0")}`,
      shipperName: randomFrom(companyNames),
      carrierId: carrier.carrierId,
      carrierName: carrier.companyName,
      amount: randomBetween(5000, 150000),
      status: "completed",
      date: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
      paymentMethod: randomFrom(["Bank Transfer", "UPI", "Credit Card", "Net Banking", "Wallet"]),
    });
  }
  
  return transactions.sort((a, b) => b.date.getTime() - a.date.getTime());
}

function generateMonthlyReports(transactions: TransactionRecord[]): MonthlyReport[] {
  const reports: MonthlyReport[] = [];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  for (let i = 0; i < 24; i++) {
    const monthsBack = 23 - i;
    const date = new Date(currentYear, currentMonth - monthsBack, 1);
    const year = date.getFullYear();
    const m = date.getMonth();
    
    const monthTransactions = transactions.filter(t => {
      return t.date.getFullYear() === year && t.date.getMonth() === m;
    });
    
    const baseVolume = 15000000 + Math.random() * 20000000;
    const seasonalMultiplier = [0.8, 0.85, 0.95, 1.0, 1.05, 0.9, 0.85, 0.9, 1.1, 1.2, 1.15, 1.3][m];
    const festivalBonus = (m === 9 || m === 10) ? 1.25 : 1;
    const growthFactor = 1 + (i * 0.02);
    
    const totalVolume = monthTransactions.reduce((sum, t) => sum + t.amount, 0) || 
      Math.round(baseVolume * seasonalMultiplier * festivalBonus * growthFactor);
    
    const loadCount = monthTransactions.length || randomBetween(180, 350);
    
    reports.push({
      month: months[m],
      year,
      totalVolume,
      loadCount,
      userGrowth: {
        shippers: 150 + i * 8 + randomBetween(0, 20),
        carriers: 40 + i * 3 + randomBetween(0, 10),
      },
      loadDistribution: {
        completed: Math.floor(loadCount * 0.72),
        inTransit: Math.floor(loadCount * 0.15),
        pending: Math.floor(loadCount * 0.08),
        cancelled: Math.floor(loadCount * 0.05),
      },
    });
  }
  
  return reports;
}

function generateVerificationQueue(carriers: AdminCarrier[], users: AdminUser[]): VerificationRequest[] {
  const queue: VerificationRequest[] = [];
  
  const pendingCarriers = carriers.filter(c => c.verificationStatus === "pending").slice(0, 15);
  for (const carrier of pendingCarriers) {
    queue.push({
      requestId: `VER-C${queue.length + 1}`,
      entityType: "carrier",
      entityId: carrier.carrierId,
      entityName: carrier.companyName,
      submittedAt: new Date(Date.now() - randomBetween(1, 14) * 24 * 60 * 60 * 1000),
      status: "pending",
    });
  }
  
  const pendingUsers = users.filter(u => u.status === "pending").slice(0, 10);
  for (const user of pendingUsers) {
    queue.push({
      requestId: `VER-U${queue.length + 1}`,
      entityType: "shipper",
      entityId: user.userId,
      entityName: user.company,
      submittedAt: new Date(Date.now() - randomBetween(1, 7) * 24 * 60 * 60 * 1000),
      status: "pending",
    });
  }
  
  const docTypes = ["Motor Carrier Authority", "Cargo Insurance", "Liability Insurance", "Driver License", "Vehicle Registration"];
  for (let i = 0; i < 20; i++) {
    const carrier = randomFrom(carriers);
    queue.push({
      requestId: `VER-D${queue.length + 1}`,
      entityType: "document",
      entityId: `DOC-${i + 1}`,
      entityName: carrier.companyName,
      documentType: randomFrom(docTypes),
      documentName: `${randomFrom(docTypes).replace(/\s+/g, "_")}_${randomBetween(2024, 2025)}.pdf`,
      submittedAt: new Date(Date.now() - randomBetween(0, 10) * 24 * 60 * 60 * 1000),
      status: "pending",
    });
  }
  
  return queue;
}

function generateRecentActivity(users: AdminUser[], loads: AdminLoad[], carriers: AdminCarrier[]): RecentActivity[] {
  const activities: RecentActivity[] = [];
  const severityOptions: Array<"info" | "warning" | "success" | "error"> = ["info", "success", "warning"];
  
  const activityTemplates = [
    { type: "user" as const, messages: ["New shipper registered: {company}", "User verified: {name}", "Account suspended: {company}"] },
    { type: "load" as const, messages: ["New load posted: {pickup} to {drop}", "Load delivered: {loadId}", "Carrier assigned to {loadId}"] },
    { type: "carrier" as const, messages: ["Carrier verified: {company}", "New carrier registered: {company}", "Fleet size updated: {company}"] },
    { type: "transaction" as const, messages: ["Payment completed: {amount}", "Refund processed: {amount}", "Invoice generated: {loadId}"] },
  ];
  
  for (let i = 0; i < 50; i++) {
    const template = randomFrom(activityTemplates);
    const messageTemplate = randomFrom(template.messages);
    const severity = randomFrom(severityOptions);
    
    let message = messageTemplate;
    if (messageTemplate.includes("{company}")) message = message.replace("{company}", randomFrom(companyNames));
    if (messageTemplate.includes("{name}")) message = message.replace("{name}", `${randomFrom(indianFirstNames)} ${randomFrom(indianLastNames)}`);
    if (messageTemplate.includes("{pickup}")) message = message.replace("{pickup}", randomFrom(cities));
    if (messageTemplate.includes("{drop}")) message = message.replace("{drop}", randomFrom(cities));
    if (messageTemplate.includes("{loadId}")) message = message.replace("{loadId}", `LD-${String(randomBetween(1, 200)).padStart(5, "0")}`);
    if (messageTemplate.includes("{amount}")) message = message.replace("{amount}", `Rs. ${randomBetween(5000, 150000).toLocaleString()}`);
    
    activities.push({
      id: `ACT-${String(i + 1).padStart(4, "0")}`,
      type: template.type,
      message,
      timestamp: new Date(Date.now() - i * randomBetween(5, 60) * 60 * 1000),
      severity,
    });
  }
  
  return activities;
}

const enterpriseUsers = generateEnterpriseUsers();
const enterpriseLoads = generateEnterpriseLoads(enterpriseUsers);
const enterpriseCarriers = generateEnterpriseCarriers();
const enterpriseTransactions = generateEnterpriseTransactions(enterpriseLoads, enterpriseCarriers);
const enterpriseReports = generateMonthlyReports(enterpriseTransactions);
const enterpriseVerifications = generateVerificationQueue(enterpriseCarriers, enterpriseUsers);
const enterpriseActivity = generateRecentActivity(enterpriseUsers, enterpriseLoads, enterpriseCarriers);

export function AdminDataProvider({ children }: { children: ReactNode }) {
  const shipperData = useMockData();
  const documentVault = useDocumentVault();
  
  const [users, setUsers] = useState<AdminUser[]>(enterpriseUsers);
  const [adminLoads, setAdminLoads] = useState<AdminLoad[]>(enterpriseLoads);
  const [carriers, setCarriers] = useState<AdminCarrier[]>(enterpriseCarriers);
  const [verificationQueue, setVerificationQueue] = useState<VerificationRequest[]>(enterpriseVerifications);
  const [transactions, setTransactions] = useState<TransactionRecord[]>(enterpriseTransactions);
  const [monthlyReports] = useState<MonthlyReport[]>(enterpriseReports);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>(enterpriseActivity);

  const usersRef = useRef(users);
  const carriersRef = useRef(carriers);
  const adminLoadsRef = useRef(adminLoads);

  useEffect(() => { usersRef.current = users; }, [users]);
  useEffect(() => { carriersRef.current = carriers; }, [carriers]);
  useEffect(() => { adminLoadsRef.current = adminLoads; }, [adminLoads]);

  const syncCarriersFromSource = useCallback(() => {
    const sourceCarriers: AdminCarrier[] = mockCarriers.map((c, idx) => ({
      carrierId: c.id,
      companyName: c.companyName || "Unknown Carrier",
      verificationStatus: c.isVerified ? "verified" : "pending",
      fleetSize: c.carrierProfile?.fleetSize || randomBetween(5, 50),
      serviceZones: c.carrierProfile?.serviceZones || [randomFrom(regions)],
      activityLevel: (c.carrierProfile?.totalDeliveries || 0) > 200 ? "high" : (c.carrierProfile?.totalDeliveries || 0) > 50 ? "medium" : "low",
      rating: parseFloat(c.carrierProfile?.reliabilityScore || "4.0"),
      totalDeliveries: c.carrierProfile?.totalDeliveries || randomBetween(50, 300),
      onTimePercent: c.extendedProfile?.onTimeDeliveryPct || randomBetween(85, 98),
      email: c.email || `carrier${idx}@example.com`,
      phone: c.phone || `+91 ${randomBetween(70000, 99999)} ${randomBetween(10000, 99999)}`,
      dateJoined: c.createdAt || new Date(Date.now() - randomBetween(100, 500) * 24 * 60 * 60 * 1000),
      reliabilityScore: Math.round(parseFloat(c.carrierProfile?.reliabilityScore || "4.0") * 20),
      avgResponseTime: randomBetween(10, 60),
      completedShipments: (c.carrierProfile?.totalDeliveries || 0) * 0.95,
    }));
    
    setCarriers(prev => {
      const existingIds = new Set(sourceCarriers.map(c => c.carrierId));
      const nonSourceCarriers = prev.filter(c => !existingIds.has(c.carrierId));
      return [...sourceCarriers, ...nonSourceCarriers];
    });
  }, []);

  const syncLoadsFromShipper = useCallback(() => {
    const shipperLoads = shipperData.loads;
    const shipperBids = shipperData.bids;
    
    const syncedLoads: AdminLoad[] = shipperLoads.map((load) => {
      const bidsForLoad = shipperBids.filter(b => b.loadId === load.loadId);
      const pickup = randomFrom(cities);
      const drop = randomFrom(cities);
      return {
        loadId: load.loadId,
        shipperId: "USR-0001",
        shipperName: "Demo Shipper",
        pickup: load.pickup || pickup,
        drop: load.drop || drop,
        weight: load.weight || randomBetween(1000, 15000),
        weightUnit: load.weightUnit || "kg",
        type: load.type || randomFrom(loadTypes),
        status: load.status as AdminLoad["status"],
        assignedCarrier: load.carrier,
        carrierId: bidsForLoad.find(b => b.status === "Accepted")?.carrierId || null,
        createdDate: new Date(load.createdAt),
        eta: load.eta,
        spending: load.finalPrice || load.estimatedPrice,
        bidCount: bidsForLoad.length,
        distance: randomBetween(200, 1500),
        dimensions: `${randomBetween(6, 18)}ft x ${randomBetween(6, 10)}ft x ${randomBetween(6, 10)}ft`,
      };
    });
    
    setAdminLoads(prev => {
      const syncedIds = new Set(syncedLoads.map(l => l.loadId));
      const nonSyncedLoads = prev.filter(l => !syncedIds.has(l.loadId));
      return [...syncedLoads, ...nonSyncedLoads];
    });
  }, [shipperData.loads, shipperData.bids]);

  useEffect(() => {
    syncCarriersFromSource();
  }, [syncCarriersFromSource]);

  useEffect(() => {
    syncLoadsFromShipper();
  }, [syncLoadsFromShipper]);

  const currentMonth = monthlyReports[monthlyReports.length - 1];
  const previousMonth = monthlyReports[monthlyReports.length - 2];
  
  const stats: AdminStats = {
    totalUsers: users.length,
    activeLoads: adminLoads.filter(l => ["Active", "Bidding", "Assigned", "En Route"].includes(l.status)).length,
    verifiedCarriers: carriers.filter(c => c.verificationStatus === "verified").length,
    pendingVerifications: verificationQueue.filter(v => v.status === "pending").length,
    monthlyVolume: currentMonth?.totalVolume || 4500000,
    monthlyChange: previousMonth ? Math.round(((currentMonth?.totalVolume || 0) - previousMonth.totalVolume) / previousMonth.totalVolume * 100) : 15,
    completedLoads: adminLoads.filter(l => l.status === "Delivered").length,
    inTransitLoads: adminLoads.filter(l => l.status === "En Route").length,
    pendingLoads: adminLoads.filter(l => ["Active", "Bidding", "Pending"].includes(l.status)).length,
    userGrowthPercent: 12 + Math.floor(Math.random() * 8),
    loadGrowthPercent: 8 + Math.floor(Math.random() * 12),
    carrierGrowthPercent: 5 + Math.floor(Math.random() * 10),
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
    setRecentActivity(prev => [newActivity, ...prev].slice(0, 100));
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
