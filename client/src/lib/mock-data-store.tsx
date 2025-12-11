import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";

export interface MockTruck {
  truckId: string;
  truckType: "32FT" | "20FT" | "Open" | "Container" | "Refrigerated" | "Flatbed" | "Dry Van";
  currentLat: number;
  currentLng: number;
  currentLocation: string;
  availabilityStatus: "Available" | "En Route" | "Busy";
  loadCapacity: number;
  carrierName: string;
  carrierId: string;
  reliabilityScore: number;
  speed: number;
  estimatedTimeToPickup: number;
  driverName: string;
  licensePlate: string;
  lastUpdated: Date;
}

export interface TruckMatchResult extends MockTruck {
  distanceFromPickup: number;
  matchScore: number;
}

export interface MockLoad {
  loadId: string;
  pickup: string;
  drop: string;
  weight: number;
  weightUnit: string;
  type: string;
  status: "Active" | "Bidding" | "Assigned" | "En Route" | "Delivered" | "Cancelled" | "Pending Admin Review" | "Admin Priced" | "Posted";
  carrier: string | null;
  eta: string | null;
  estimatedPrice: number | null;
  adminSuggestedPrice?: number | null;
  adminFinalPrice?: number | null;
  adminPostMode?: "open" | "invite" | "assign" | null;
  adminId?: string | null;
  invitedCarrierIds?: string[] | null;
  allowCounterBids?: boolean;
  postedAt?: string | null;
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

export interface ChatMessage {
  messageId: string;
  sender: "shipper" | "carrier";
  senderName: string;
  content: string;
  timestamp: Date;
  type: "text" | "bid_update" | "counter_offer" | "acceptance" | "rejection" | "withdrawal" | "system";
  bidAmount?: number;
}

export interface NegotiationThread {
  threadId: string;
  bidId: string;
  loadId: string;
  carrierName: string;
  carrierId: string;
  messages: ChatMessage[];
  currentBidAmount: number;
  lastCounterAmount: number | null;
  status: "active" | "accepted" | "rejected" | "withdrawn";
  carrierTyping: boolean;
  lastUpdated: Date;
}

interface NearbyTruckFilters {
  truckType?: string;
  radiusKm?: number;
  minCapacity?: number;
  minRating?: number;
  availableOnly?: boolean;
}

export const shipmentStages = [
  "load_created",
  "carrier_assigned", 
  "reached_pickup",
  "loaded",
  "in_transit",
  "arrived_at_drop",
  "delivered",
  "completed"
] as const;
export type ShipmentStage = typeof shipmentStages[number];

export const documentTemplates = [
  { id: "pod", name: "Proof of Delivery (POD)", stages: ["delivered", "completed"], required: true },
  { id: "invoice", name: "Invoice", stages: ["delivered", "completed"], required: true },
  { id: "lr", name: "LR / Consignment Note", stages: ["reached_pickup", "loaded"], required: true },
  { id: "eway_bill", name: "E-way Bill", stages: ["loaded", "in_transit"], required: true },
  { id: "rc_insurance", name: "RC & Insurance", stages: ["carrier_assigned", "reached_pickup"], required: false },
  { id: "driver_id", name: "Driver ID", stages: ["carrier_assigned", "reached_pickup"], required: false },
  { id: "loading_photos", name: "Loading Photos", stages: ["reached_pickup", "loaded"], required: false },
  { id: "delivery_photos", name: "Delivery Photos", stages: ["delivered", "completed"], required: false },
  { id: "weight_slip", name: "Weight Slip", stages: ["loaded"], required: false },
  { id: "inspection_photos", name: "Inspection Photos", stages: ["in_transit", "arrived_at_drop"], required: false },
  { id: "additional", name: "Additional Notes / Attachments", stages: shipmentStages as unknown as string[], required: false },
] as const;
export type DocumentTemplateId = typeof documentTemplates[number]["id"];

export interface ShipmentDocument {
  docId: string;
  shipmentId: string;
  loadId: string;
  templateId: DocumentTemplateId;
  fileName: string;
  fileType: "pdf" | "image";
  fileUrl: string;
  fileSize: number;
  status: "not_uploaded" | "uploaded" | "verified";
  uploadedAt: Date | null;
  uploadedBy: string | null;
  stage: ShipmentStage;
  notes?: string;
}

export interface ShipmentStageEvent {
  eventId: string;
  shipmentId: string;
  stage: ShipmentStage;
  location: string;
  timestamp: Date;
  completed: boolean;
  eta?: Date;
  notes?: string;
  documents: ShipmentDocument[];
}

export interface TrackedShipment {
  shipmentId: string;
  loadId: string;
  route: string;
  currentStage: ShipmentStage;
  carrierName: string;
  carrierId: string;
  vehicleId: string;
  truckInfo: string;
  driverName: string;
  driverPhone: string;
  progress: number;
  eta: Date;
  createdAt: Date;
  events: ShipmentStageEvent[];
  documents: ShipmentDocument[];
}

interface MockDataContextType {
  loads: MockLoad[];
  bids: MockBid[];
  inTransit: MockInTransit[];
  spend: MockSpend;
  notifications: MockNotification[];
  trucks: MockTruck[];
  negotiations: NegotiationThread[];
  shipments: TrackedShipment[];
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
  getNearbyTrucks: (pickupCity: string, loadType: string, loadWeight: number, filters?: NearbyTruckFilters) => TruckMatchResult[];
  requestQuote: (truckId: string, loadId: string) => MockBid;
  getTruckById: (truckId: string) => MockTruck | undefined;
  getOrCreateNegotiation: (bidId: string) => NegotiationThread;
  sendNegotiationMessage: (threadId: string, message: string) => void;
  submitCounterOffer: (threadId: string, amount: number, message?: string) => void;
  acceptNegotiation: (threadId: string) => void;
  rejectNegotiation: (threadId: string) => void;
  getActiveNegotiations: () => NegotiationThread[];
  getShipmentById: (shipmentId: string) => TrackedShipment | undefined;
  getShipmentByLoadId: (loadId: string) => TrackedShipment | undefined;
  getActiveShipments: () => TrackedShipment[];
  getCompletedShipments: () => TrackedShipment[];
  uploadDocument: (shipmentId: string, templateId: DocumentTemplateId, fileName: string, fileType: "pdf" | "image", stage: ShipmentStage) => ShipmentDocument;
  verifyDocument: (docId: string) => void;
  deleteDocument: (docId: string) => void;
  getDocumentsForShipment: (shipmentId: string) => ShipmentDocument[];
  getDocumentsForLoad: (loadId: string) => ShipmentDocument[];
  updateShipmentStage: (shipmentId: string, stage: ShipmentStage, notes?: string) => void;
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

const createShipmentEvents = (shipmentId: string, currentStage: ShipmentStage, pickup: string, drop: string): ShipmentStageEvent[] => {
  const stageIndex = shipmentStages.indexOf(currentStage);
  const now = new Date();
  
  return shipmentStages.map((stage, index) => ({
    eventId: `evt-${shipmentId}-${index}`,
    shipmentId,
    stage,
    location: index <= 2 ? pickup : index >= 5 ? drop : "In Transit",
    timestamp: new Date(now.getTime() - (stageIndex - index) * 3600000 * 4),
    completed: index <= stageIndex,
    eta: index > stageIndex ? new Date(now.getTime() + (index - stageIndex) * 3600000 * 4) : undefined,
    notes: index === stageIndex ? "Current stage" : undefined,
    documents: [],
  }));
};

const initialShipments: TrackedShipment[] = [
  {
    shipmentId: "SHP-001",
    loadId: "LD-T001",
    route: "New York, NY → Boston, MA",
    currentStage: "in_transit",
    carrierName: "FastHaul Logistics",
    carrierId: "C-003",
    vehicleId: "TRK-1024",
    truckInfo: "Dry Van - NY-4523AB",
    driverName: "John Smith",
    driverPhone: "+1 (555) 123-4567",
    progress: 65,
    eta: new Date(Date.now() + 1000 * 60 * 60 * 4),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    events: createShipmentEvents("SHP-001", "in_transit", "New York, NY", "Boston, MA"),
    documents: [
      {
        docId: "DOC-001",
        shipmentId: "SHP-001",
        loadId: "LD-T001",
        templateId: "lr",
        fileName: "LR_Consignment_Note.pdf",
        fileType: "pdf",
        fileUrl: "/mock/lr_note.pdf",
        fileSize: 245000,
        status: "verified",
        uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 20),
        uploadedBy: "John Smith",
        stage: "reached_pickup",
      },
      {
        docId: "DOC-002",
        shipmentId: "SHP-001",
        loadId: "LD-T001",
        templateId: "eway_bill",
        fileName: "E-Way_Bill_12345.pdf",
        fileType: "pdf",
        fileUrl: "/mock/eway_bill.pdf",
        fileSize: 180000,
        status: "uploaded",
        uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 18),
        uploadedBy: "John Smith",
        stage: "loaded",
      },
      {
        docId: "DOC-003",
        shipmentId: "SHP-001",
        loadId: "LD-T001",
        templateId: "loading_photos",
        fileName: "Loading_Photo_1.jpg",
        fileType: "image",
        fileUrl: "/mock/loading_photo.jpg",
        fileSize: 1200000,
        status: "uploaded",
        uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 19),
        uploadedBy: "John Smith",
        stage: "loaded",
      },
    ],
  },
  {
    shipmentId: "SHP-002",
    loadId: "LD-T002",
    route: "San Francisco, CA → Los Angeles, CA",
    currentStage: "loaded",
    carrierName: "Swift Transport Co",
    carrierId: "C-004",
    vehicleId: "TRK-2048",
    truckInfo: "Flatbed - CA-7891XY",
    driverName: "Maria Garcia",
    driverPhone: "+1 (555) 234-5678",
    progress: 35,
    eta: new Date(Date.now() + 1000 * 60 * 60 * 8),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
    events: createShipmentEvents("SHP-002", "loaded", "San Francisco, CA", "Los Angeles, CA"),
    documents: [
      {
        docId: "DOC-004",
        shipmentId: "SHP-002",
        loadId: "LD-T002",
        templateId: "lr",
        fileName: "Consignment_Note_SF.pdf",
        fileType: "pdf",
        fileUrl: "/mock/lr_sf.pdf",
        fileSize: 220000,
        status: "uploaded",
        uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 6),
        uploadedBy: "Maria Garcia",
        stage: "reached_pickup",
      },
    ],
  },
  {
    shipmentId: "SHP-003",
    loadId: "LD-T003",
    route: "Denver, CO → Salt Lake City, UT",
    currentStage: "arrived_at_drop",
    carrierName: "Premier Freight",
    carrierId: "C-005",
    vehicleId: "TRK-3072",
    truckInfo: "Refrigerated - CO-3456ZZ",
    driverName: "Robert Johnson",
    driverPhone: "+1 (555) 345-6789",
    progress: 85,
    eta: new Date(Date.now() + 1000 * 60 * 60 * 2),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 36),
    events: createShipmentEvents("SHP-003", "arrived_at_drop", "Denver, CO", "Salt Lake City, UT"),
    documents: [
      {
        docId: "DOC-005",
        shipmentId: "SHP-003",
        loadId: "LD-T003",
        templateId: "lr",
        fileName: "LR_Note_Denver.pdf",
        fileType: "pdf",
        fileUrl: "/mock/lr_denver.pdf",
        fileSize: 195000,
        status: "verified",
        uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 30),
        uploadedBy: "Robert Johnson",
        stage: "reached_pickup",
      },
      {
        docId: "DOC-006",
        shipmentId: "SHP-003",
        loadId: "LD-T003",
        templateId: "eway_bill",
        fileName: "EWay_Denver_SLC.pdf",
        fileType: "pdf",
        fileUrl: "/mock/eway_denver.pdf",
        fileSize: 175000,
        status: "verified",
        uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 28),
        uploadedBy: "Robert Johnson",
        stage: "loaded",
      },
      {
        docId: "DOC-007",
        shipmentId: "SHP-003",
        loadId: "LD-T003",
        templateId: "inspection_photos",
        fileName: "Inspection_Checkpoint.jpg",
        fileType: "image",
        fileUrl: "/mock/inspection.jpg",
        fileSize: 980000,
        status: "uploaded",
        uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 10),
        uploadedBy: "Robert Johnson",
        stage: "in_transit",
      },
    ],
  },
  {
    shipmentId: "SHP-004",
    loadId: "LD-COMP-001",
    route: "Miami, FL → Atlanta, GA",
    currentStage: "completed",
    carrierName: "FastHaul Logistics",
    carrierId: "C-003",
    vehicleId: "TRK-4096",
    truckInfo: "Dry Van - FL-1122AB",
    driverName: "Sarah Williams",
    driverPhone: "+1 (555) 456-7890",
    progress: 100,
    eta: new Date(Date.now() - 1000 * 60 * 60 * 12),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72),
    events: createShipmentEvents("SHP-004", "completed", "Miami, FL", "Atlanta, GA"),
    documents: [
      {
        docId: "DOC-008",
        shipmentId: "SHP-004",
        loadId: "LD-COMP-001",
        templateId: "pod",
        fileName: "POD_Miami_Atlanta.pdf",
        fileType: "pdf",
        fileUrl: "/mock/pod_miami.pdf",
        fileSize: 310000,
        status: "verified",
        uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 14),
        uploadedBy: "Sarah Williams",
        stage: "delivered",
      },
      {
        docId: "DOC-009",
        shipmentId: "SHP-004",
        loadId: "LD-COMP-001",
        templateId: "invoice",
        fileName: "Invoice_SHP004.pdf",
        fileType: "pdf",
        fileUrl: "/mock/invoice_004.pdf",
        fileSize: 125000,
        status: "verified",
        uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 13),
        uploadedBy: "Admin",
        stage: "completed",
      },
      {
        docId: "DOC-010",
        shipmentId: "SHP-004",
        loadId: "LD-COMP-001",
        templateId: "delivery_photos",
        fileName: "Delivery_Confirmation.jpg",
        fileType: "image",
        fileUrl: "/mock/delivery_photo.jpg",
        fileSize: 1450000,
        status: "verified",
        uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 14),
        uploadedBy: "Sarah Williams",
        stage: "delivered",
      },
    ],
  },
];

const cityCoordinates: Record<string, { lat: number; lng: number }> = {
  "Los Angeles, CA": { lat: 34.0522, lng: -118.2437 },
  "Phoenix, AZ": { lat: 33.4484, lng: -112.0740 },
  "Chicago, IL": { lat: 41.8781, lng: -87.6298 },
  "Detroit, MI": { lat: 42.3314, lng: -83.0458 },
  "Dallas, TX": { lat: 32.7767, lng: -96.7970 },
  "Houston, TX": { lat: 29.7604, lng: -95.3698 },
  "Seattle, WA": { lat: 47.6062, lng: -122.3321 },
  "Portland, OR": { lat: 45.5152, lng: -122.6784 },
  "Miami, FL": { lat: 25.7617, lng: -80.1918 },
  "Atlanta, GA": { lat: 33.7490, lng: -84.3880 },
  "New York, NY": { lat: 40.7128, lng: -74.0060 },
  "Boston, MA": { lat: 42.3601, lng: -71.0589 },
  "San Francisco, CA": { lat: 37.7749, lng: -122.4194 },
  "Denver, CO": { lat: 39.7392, lng: -104.9903 },
  "Salt Lake City, UT": { lat: 40.7608, lng: -111.8910 },
  "Las Vegas, NV": { lat: 36.1699, lng: -115.1398 },
  "San Diego, CA": { lat: 32.7157, lng: -117.1611 },
  "Austin, TX": { lat: 30.2672, lng: -97.7431 },
  "Nashville, TN": { lat: 36.1627, lng: -86.7816 },
  "Charlotte, NC": { lat: 35.2271, lng: -80.8431 },
  "Indianapolis, IN": { lat: 39.7684, lng: -86.1581 },
  "Columbus, OH": { lat: 39.9612, lng: -82.9988 },
  "Philadelphia, PA": { lat: 39.9526, lng: -75.1652 },
  "Jacksonville, FL": { lat: 30.3322, lng: -81.6557 },
  "San Antonio, TX": { lat: 29.4241, lng: -98.4936 },
  "Fort Worth, TX": { lat: 32.7555, lng: -97.3308 },
  "Oklahoma City, OK": { lat: 35.4676, lng: -97.5164 },
  "Memphis, TN": { lat: 35.1495, lng: -90.0490 },
  "Louisville, KY": { lat: 38.2527, lng: -85.7585 },
  "Baltimore, MD": { lat: 39.2904, lng: -76.6122 },
  "Milwaukee, WI": { lat: 43.0389, lng: -87.9065 },
  "Albuquerque, NM": { lat: 35.0844, lng: -106.6504 },
  "Tucson, AZ": { lat: 32.2226, lng: -110.9747 },
  "Kansas City, MO": { lat: 39.0997, lng: -94.5786 },
  "Sacramento, CA": { lat: 38.5816, lng: -121.4944 },
  "Fresno, CA": { lat: 36.7378, lng: -119.7871 },
  "Omaha, NE": { lat: 41.2565, lng: -95.9345 },
  "Minneapolis, MN": { lat: 44.9778, lng: -93.2650 },
  "Raleigh, NC": { lat: 35.7796, lng: -78.6382 },
  "Cleveland, OH": { lat: 41.4993, lng: -81.6944 },
  "Pittsburgh, PA": { lat: 40.4406, lng: -79.9959 },
  "St. Louis, MO": { lat: 38.6270, lng: -90.1994 },
  "Tampa, FL": { lat: 27.9506, lng: -82.4572 },
  "Orlando, FL": { lat: 28.5383, lng: -81.3792 },
};

const initialTrucks: MockTruck[] = [
  {
    truckId: "TRK-NB001",
    truckType: "Dry Van",
    currentLat: 34.1522,
    currentLng: -118.3437,
    currentLocation: "North Hollywood, CA",
    availabilityStatus: "Available",
    loadCapacity: 22,
    carrierName: "FastHaul Logistics",
    carrierId: "C-003",
    reliabilityScore: 94,
    speed: 0,
    estimatedTimeToPickup: 25,
    driverName: "Mike Chen",
    licensePlate: "CA-8847XL",
    lastUpdated: new Date(),
  },
  {
    truckId: "TRK-NB002",
    truckType: "Flatbed",
    currentLat: 33.9425,
    currentLng: -118.4081,
    currentLocation: "El Segundo, CA",
    availabilityStatus: "Available",
    loadCapacity: 28,
    carrierName: "Swift Transport Co",
    carrierId: "C-001",
    reliabilityScore: 88,
    speed: 45,
    estimatedTimeToPickup: 35,
    driverName: "Sarah Johnson",
    licensePlate: "CA-2231AB",
    lastUpdated: new Date(),
  },
  {
    truckId: "TRK-NB003",
    truckType: "Refrigerated",
    currentLat: 34.0195,
    currentLng: -118.4912,
    currentLocation: "Santa Monica, CA",
    availabilityStatus: "Available",
    loadCapacity: 18,
    carrierName: "Premier Freight",
    carrierId: "C-002",
    reliabilityScore: 91,
    speed: 0,
    estimatedTimeToPickup: 40,
    driverName: "David Kim",
    licensePlate: "CA-5567RF",
    lastUpdated: new Date(),
  },
  {
    truckId: "TRK-NB004",
    truckType: "Container",
    currentLat: 33.7701,
    currentLng: -118.1937,
    currentLocation: "Long Beach, CA",
    availabilityStatus: "En Route",
    loadCapacity: 40,
    carrierName: "MegaHaul Inc",
    carrierId: "C-004",
    reliabilityScore: 85,
    speed: 55,
    estimatedTimeToPickup: 60,
    driverName: "James Wilson",
    licensePlate: "CA-9912CT",
    lastUpdated: new Date(),
  },
  {
    truckId: "TRK-NB005",
    truckType: "20FT",
    currentLat: 34.1478,
    currentLng: -118.1445,
    currentLocation: "Pasadena, CA",
    availabilityStatus: "Available",
    loadCapacity: 15,
    carrierName: "CrossCountry Trucking",
    carrierId: "C-005",
    reliabilityScore: 92,
    speed: 0,
    estimatedTimeToPickup: 30,
    driverName: "Robert Garcia",
    licensePlate: "CA-4421SM",
    lastUpdated: new Date(),
  },
  {
    truckId: "TRK-NB006",
    truckType: "32FT",
    currentLat: 41.9281,
    currentLng: -87.6798,
    currentLocation: "Evanston, IL",
    availabilityStatus: "Available",
    loadCapacity: 25,
    carrierName: "Midwest Express",
    carrierId: "C-006",
    reliabilityScore: 89,
    speed: 0,
    estimatedTimeToPickup: 20,
    driverName: "Tom Anderson",
    licensePlate: "IL-7732EX",
    lastUpdated: new Date(),
  },
  {
    truckId: "TRK-NB007",
    truckType: "Dry Van",
    currentLat: 41.7508,
    currentLng: -87.8878,
    currentLocation: "La Grange, IL",
    availabilityStatus: "Available",
    loadCapacity: 22,
    carrierName: "FastHaul Logistics",
    carrierId: "C-003",
    reliabilityScore: 94,
    speed: 35,
    estimatedTimeToPickup: 45,
    driverName: "Chris Martinez",
    licensePlate: "IL-1187DV",
    lastUpdated: new Date(),
  },
  {
    truckId: "TRK-NB008",
    truckType: "Flatbed",
    currentLat: 42.0334,
    currentLng: -87.8834,
    currentLocation: "Skokie, IL",
    availabilityStatus: "Busy",
    loadCapacity: 30,
    carrierName: "Heavy Haul Bros",
    carrierId: "C-007",
    reliabilityScore: 86,
    speed: 0,
    estimatedTimeToPickup: 90,
    driverName: "Bill Thompson",
    licensePlate: "IL-5543HH",
    lastUpdated: new Date(),
  },
  {
    truckId: "TRK-NB009",
    truckType: "Dry Van",
    currentLat: 32.8267,
    currentLng: -96.8470,
    currentLocation: "Irving, TX",
    availabilityStatus: "Available",
    loadCapacity: 20,
    carrierName: "Texas Star Freight",
    carrierId: "C-008",
    reliabilityScore: 90,
    speed: 0,
    estimatedTimeToPickup: 15,
    driverName: "Jose Ramirez",
    licensePlate: "TX-2241TS",
    lastUpdated: new Date(),
  },
  {
    truckId: "TRK-NB010",
    truckType: "Refrigerated",
    currentLat: 32.9483,
    currentLng: -96.7299,
    currentLocation: "Richardson, TX",
    availabilityStatus: "Available",
    loadCapacity: 18,
    carrierName: "ColdChain Carriers",
    carrierId: "C-009",
    reliabilityScore: 95,
    speed: 0,
    estimatedTimeToPickup: 25,
    driverName: "Maria Santos",
    licensePlate: "TX-8876CC",
    lastUpdated: new Date(),
  },
  {
    truckId: "TRK-NB011",
    truckType: "Container",
    currentLat: 29.8804,
    currentLng: -95.5198,
    currentLocation: "Spring, TX",
    availabilityStatus: "Available",
    loadCapacity: 40,
    carrierName: "Gulf Coast Transport",
    carrierId: "C-010",
    reliabilityScore: 87,
    speed: 50,
    estimatedTimeToPickup: 35,
    driverName: "Kevin Brown",
    licensePlate: "TX-3345GC",
    lastUpdated: new Date(),
  },
  {
    truckId: "TRK-NB012",
    truckType: "Open",
    currentLat: 33.0462,
    currentLng: -96.9942,
    currentLocation: "Carrollton, TX",
    availabilityStatus: "En Route",
    loadCapacity: 24,
    carrierName: "Open Road Trucking",
    carrierId: "C-011",
    reliabilityScore: 82,
    speed: 60,
    estimatedTimeToPickup: 50,
    driverName: "Larry White",
    licensePlate: "TX-6654OR",
    lastUpdated: new Date(),
  },
  {
    truckId: "TRK-NB013",
    truckType: "Dry Van",
    currentLat: 47.6862,
    currentLng: -122.3521,
    currentLocation: "Wallingford, WA",
    availabilityStatus: "Available",
    loadCapacity: 22,
    carrierName: "Pacific Northwest Freight",
    carrierId: "C-012",
    reliabilityScore: 93,
    speed: 0,
    estimatedTimeToPickup: 18,
    driverName: "Alex Turner",
    licensePlate: "WA-1123PN",
    lastUpdated: new Date(),
  },
  {
    truckId: "TRK-NB014",
    truckType: "Flatbed",
    currentLat: 47.5262,
    currentLng: -122.4321,
    currentLocation: "West Seattle, WA",
    availabilityStatus: "Available",
    loadCapacity: 28,
    carrierName: "Swift Transport Co",
    carrierId: "C-001",
    reliabilityScore: 88,
    speed: 40,
    estimatedTimeToPickup: 30,
    driverName: "Emily Davis",
    licensePlate: "WA-7789SW",
    lastUpdated: new Date(),
  },
  {
    truckId: "TRK-NB015",
    truckType: "20FT",
    currentLat: 25.8617,
    currentLng: -80.2918,
    currentLocation: "Hialeah, FL",
    availabilityStatus: "Available",
    loadCapacity: 15,
    carrierName: "Sunshine State Carriers",
    carrierId: "C-013",
    reliabilityScore: 91,
    speed: 0,
    estimatedTimeToPickup: 22,
    driverName: "Carlos Rodriguez",
    licensePlate: "FL-4456SS",
    lastUpdated: new Date(),
  },
  {
    truckId: "TRK-NB016",
    truckType: "Refrigerated",
    currentLat: 25.9017,
    currentLng: -80.1318,
    currentLocation: "North Miami, FL",
    availabilityStatus: "Available",
    loadCapacity: 20,
    carrierName: "ColdChain Carriers",
    carrierId: "C-009",
    reliabilityScore: 95,
    speed: 35,
    estimatedTimeToPickup: 28,
    driverName: "Anna Lopez",
    licensePlate: "FL-8821CC",
    lastUpdated: new Date(),
  },
];

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

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function calculateMatchScore(
  distance: number,
  truckType: string,
  loadType: string,
  truckCapacity: number,
  loadWeight: number,
  reliabilityScore: number,
  eta: number
): number {
  const distanceScore = Math.max(0, 100 - (distance * 2));
  
  const typeCompatibility: Record<string, string[]> = {
    "Dry Van": ["Dry Van", "32FT", "20FT"],
    "Flatbed": ["Flatbed", "Open"],
    "Refrigerated": ["Refrigerated"],
    "Container": ["Container"],
    "Open": ["Open", "Flatbed"],
    "32FT": ["32FT", "Dry Van"],
    "20FT": ["20FT", "Dry Van"],
  };
  const compatible = typeCompatibility[loadType]?.includes(truckType) || truckType === loadType;
  const typeScore = compatible ? 100 : 30;
  
  const weightInTons = loadWeight / 2000;
  const capacityRatio = weightInTons / truckCapacity;
  const capacityScore = capacityRatio <= 1 ? (capacityRatio > 0.5 ? 100 : 60) : 20;
  
  const etaScore = Math.max(0, 100 - (eta / 2));
  
  const weightedScore = (
    distanceScore * 0.40 +
    typeScore * 0.20 +
    capacityScore * 0.15 +
    reliabilityScore * 0.15 +
    etaScore * 0.10
  );
  
  return Math.round(Math.min(100, Math.max(0, weightedScore)));
}

export function MockDataProvider({ children }: { children: ReactNode }) {
  const [loads, setLoads] = useState<MockLoad[]>(initialLoads);
  const [bids, setBids] = useState<MockBid[]>(initialBids);
  const [inTransit, setInTransit] = useState<MockInTransit[]>(initialInTransit);
  const [spend, setSpend] = useState<MockSpend>(initialSpend);
  const [notifications, setNotifications] = useState<MockNotification[]>(initialNotifications);
  const [trucks, setTrucks] = useState<MockTruck[]>(initialTrucks);
  const [negotiations, setNegotiations] = useState<NegotiationThread[]>([]);
  const [shipments, setShipments] = useState<TrackedShipment[]>(initialShipments);
  const [pendingTimeouts, setPendingTimeouts] = useState<Set<ReturnType<typeof setTimeout>>>(new Set());
  
  const bidsRef = useRef<MockBid[]>(bids);
  const negotiationsRef = useRef<NegotiationThread[]>(negotiations);
  const shipmentsRef = useRef<TrackedShipment[]>(shipments);
  
  useEffect(() => {
    bidsRef.current = bids;
  }, [bids]);
  
  useEffect(() => {
    negotiationsRef.current = negotiations;
  }, [negotiations]);
  
  useEffect(() => {
    shipmentsRef.current = shipments;
  }, [shipments]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTrucks(prev => prev.map(truck => {
        if (truck.availabilityStatus === "En Route" || truck.speed > 0) {
          const movementLat = (Math.random() - 0.5) * 0.01;
          const movementLng = (Math.random() - 0.5) * 0.01;
          return {
            ...truck,
            currentLat: truck.currentLat + movementLat,
            currentLng: truck.currentLng + movementLng,
            lastUpdated: new Date(),
          };
        }
        return truck;
      }));
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

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
    const bidRef: { current: MockBid | undefined } = { current: undefined };
    
    setBids(prev => {
      const bid = prev.find(b => b.bidId === bidId);
      if (!bid) return prev;
      bidRef.current = bid;
      
      return prev.map(b => {
        if (b.bidId === bidId) return { ...b, status: "Accepted" as const };
        if (b.loadId === bid.loadId) return { ...b, status: "Rejected" as const };
        return b;
      });
    });

    const bid = bidRef.current;
    if (!bid) return;

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
  }, [createNotification]);

  const rejectBid = useCallback((bidId: string) => {
    setBids(prev => prev.map(bid => 
      bid.bidId === bidId ? { ...bid, status: "Rejected" as const } : bid
    ));
  }, []);

  const counterBid = useCallback((bidId: string, counterPrice: number, message: string) => {
    const bidRef: { current: MockBid | undefined } = { current: undefined };
    
    setBids(prev => {
      bidRef.current = prev.find(b => b.bidId === bidId);
      return prev.map(b => 
        b.bidId === bidId 
          ? { ...b, status: "Countered" as const, counterPrice, counterMessage: message } 
          : b
      );
    });
    
    const bid = bidRef.current;
    if (bid) {
      createNotification({
        title: "Counter-Offer Sent",
        message: `You countered ${bid.carrierName}'s bid with $${counterPrice.toLocaleString()} for load ${bid.loadId}`,
        type: "bid",
        loadId: bid.loadId,
        bidId: bid.bidId,
      });
    }
  }, [createNotification]);

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

  const getTruckById = useCallback((truckId: string) => 
    trucks.find(t => t.truckId === truckId),
  [trucks]);

  const getNearbyTrucks = useCallback((
    pickupCity: string,
    loadType: string,
    loadWeight: number,
    filters?: NearbyTruckFilters
  ): TruckMatchResult[] => {
    let pickupCoords = cityCoordinates[pickupCity];
    
    if (!pickupCoords) {
      const cityName = pickupCity.split(',')[0]?.trim().toLowerCase();
      const matchedCityKey = Object.keys(cityCoordinates).find(c => 
        c.toLowerCase().includes(cityName || '') || cityName?.includes(c.split(',')[0].toLowerCase())
      );
      if (matchedCityKey) {
        pickupCoords = cityCoordinates[matchedCityKey];
      }
    }
    
    const coords = pickupCoords || { lat: 34.0522, lng: -118.2437 };
    const radiusKm = filters?.radiusKm || 50;
    
    let filteredTrucks = trucks.filter(truck => {
      const distance = calculateDistance(coords.lat, coords.lng, truck.currentLat, truck.currentLng);
      if (distance > radiusKm) return false;
      
      if (filters?.availableOnly && truck.availabilityStatus !== "Available") return false;
      if (filters?.truckType && truck.truckType !== filters.truckType) return false;
      if (filters?.minCapacity && truck.loadCapacity < filters.minCapacity) return false;
      if (filters?.minRating && truck.reliabilityScore < filters.minRating) return false;
      
      return true;
    });
    
    const results: TruckMatchResult[] = filteredTrucks.map(truck => {
      const distance = calculateDistance(coords.lat, coords.lng, truck.currentLat, truck.currentLng);
      const matchScore = calculateMatchScore(
        distance,
        truck.truckType,
        loadType,
        truck.loadCapacity,
        loadWeight,
        truck.reliabilityScore,
        truck.estimatedTimeToPickup
      );
      
      return {
        ...truck,
        distanceFromPickup: Math.round(distance * 10) / 10,
        matchScore,
      };
    });
    
    return results.sort((a, b) => b.matchScore - a.matchScore);
  }, [trucks]);

  const requestQuote = useCallback((truckId: string, loadId: string): MockBid => {
    const truck = trucks.find(t => t.truckId === truckId);
    const load = loads.find(l => l.loadId === loadId);
    
    if (!truck || !load) {
      throw new Error("Truck or load not found");
    }
    
    const basePrice = load.estimatedPrice || load.adminFinalPrice || 50000;
    const baseBidPrice = basePrice * (0.85 + Math.random() * 0.2);
    const bidPrice = Math.round(baseBidPrice / 50) * 50;
    
    const pickupDate = new Date(load.pickupDate);
    pickupDate.setHours(pickupDate.getHours() + truck.estimatedTimeToPickup / 60);
    const eta = pickupDate.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    const newBid = addBid({
      loadId,
      carrierName: truck.carrierName,
      carrierId: truck.carrierId,
      bidPrice,
      eta,
      status: "Pending",
    });
    
    createNotification({
      title: "Quote Requested",
      message: `Quote requested from ${truck.carrierName} for load ${loadId}`,
      type: "bid",
      loadId,
      bidId: newBid.bidId,
    });
    
    setTimeout(() => {
      const responses = ["accept", "counter", "decline"] as const;
      const response = responses[Math.floor(Math.random() * 3)];
      
      if (response === "accept") {
        createNotification({
          title: "Carrier Responded",
          message: `${truck.carrierName} accepted your quote request at $${bidPrice.toLocaleString()}`,
          type: "bid",
          loadId,
          bidId: newBid.bidId,
        });
      } else if (response === "counter") {
        const counterPrice = Math.round((bidPrice * (0.9 + Math.random() * 0.15)) / 50) * 50;
        setBids(prev => prev.map(b => 
          b.bidId === newBid.bidId 
            ? { ...b, status: "Countered" as const, counterPrice, counterMessage: `We can offer $${counterPrice} for this route` }
            : b
        ));
        createNotification({
          title: "Counter-Offer Received",
          message: `${truck.carrierName} countered with $${counterPrice.toLocaleString()} for load ${loadId}`,
          type: "bid",
          loadId,
          bidId: newBid.bidId,
        });
      } else {
        setBids(prev => prev.map(b => 
          b.bidId === newBid.bidId ? { ...b, status: "Rejected" as const } : b
        ));
        createNotification({
          title: "Quote Declined",
          message: `${truck.carrierName} declined the quote request for load ${loadId}`,
          type: "bid",
          loadId,
          bidId: newBid.bidId,
        });
      }
      
      setTrucks(prev => prev.map(t => {
        if (t.truckId === truckId && response === "accept") {
          return { ...t, availabilityStatus: "En Route" as const };
        }
        return t;
      }));
    }, 3000 + Math.random() * 5000);
    
    return newBid;
  }, [trucks, loads, addBid, createNotification]);

  const carrierResponses = [
    "We can offer ${amount} for this route.",
    "Based on current fuel prices, ${amount} is our best rate.",
    "Traffic conditions may affect ETA. We can do ${amount}.",
    "Can you confirm loading time? We're offering ${amount}.",
    "We can improve rate to ${amount} if loading is flexible.",
    "Our driver is available. ${amount} is competitive for this lane.",
    "Weather looks good. We can commit at ${amount}.",
    "This is our standard rate: ${amount}. Volume discounts available.",
  ];

  const getRandomCarrierResponse = (amount: number) => {
    const template = carrierResponses[Math.floor(Math.random() * carrierResponses.length)];
    return template.replace("${amount}", `$${amount.toLocaleString()}`);
  };

  const simulateCarrierTyping = useCallback((threadId: string, callback: () => void) => {
    setNegotiations(prev => prev.map(n => 
      n.threadId === threadId ? { ...n, carrierTyping: true } : n
    ));
    
    const typingDelay = 1000 + Math.random() * 2000;
    const timeout = setTimeout(() => {
      setNegotiations(prev => prev.map(n => 
        n.threadId === threadId ? { ...n, carrierTyping: false } : n
      ));
      callback();
      setPendingTimeouts(prev => {
        const newSet = new Set(prev);
        newSet.delete(timeout);
        return newSet;
      });
    }, typingDelay);
    
    setPendingTimeouts(prev => new Set(prev).add(timeout));
  }, []);

  const addMessageToThread = useCallback((threadId: string, message: ChatMessage) => {
    setNegotiations(prev => prev.map(n => 
      n.threadId === threadId 
        ? { 
            ...n, 
            messages: [...n.messages, message], 
            lastUpdated: new Date(),
            currentBidAmount: message.bidAmount ?? n.currentBidAmount 
          } 
        : n
    ));
  }, []);

  const getOrCreateNegotiation = useCallback((bidId: string): NegotiationThread => {
    const existing = negotiationsRef.current.find(n => n.bidId === bidId);
    if (existing) return existing;

    const bid = bidsRef.current.find(b => b.bidId === bidId);
    if (!bid) throw new Error("Bid not found");
    
    const initialMessage: ChatMessage = {
      messageId: generateId("msg"),
      sender: "carrier",
      senderName: bid.carrierName,
      content: getRandomCarrierResponse(bid.bidPrice),
      timestamp: new Date(bid.createdAt),
      type: "bid_update",
      bidAmount: bid.bidPrice,
    };

    const thread: NegotiationThread = {
      threadId: generateId("thread"),
      bidId,
      loadId: bid.loadId,
      carrierName: bid.carrierName,
      carrierId: bid.carrierId,
      messages: [initialMessage],
      currentBidAmount: bid.bidPrice,
      lastCounterAmount: bid.counterPrice,
      status: bid.status === "Accepted" ? "accepted" : bid.status === "Rejected" ? "rejected" : "active",
      carrierTyping: false,
      lastUpdated: new Date(),
    };

    if (bid.counterPrice && bid.counterMessage) {
      thread.messages.push({
        messageId: generateId("msg"),
        sender: "shipper",
        senderName: "You",
        content: `Counter-offer submitted: $${bid.counterPrice.toLocaleString()}`,
        timestamp: new Date(),
        type: "counter_offer",
        bidAmount: bid.counterPrice,
      });
    }

    setNegotiations(prev => [...prev, thread]);
    return thread;
  }, []);

  const sendNegotiationMessage = useCallback((threadId: string, message: string) => {
    const shipperMessage: ChatMessage = {
      messageId: generateId("msg"),
      sender: "shipper",
      senderName: "You",
      content: message,
      timestamp: new Date(),
      type: "text",
    };
    addMessageToThread(threadId, shipperMessage);

    const thread = negotiationsRef.current.find(n => n.threadId === threadId);
    if (!thread) return;

    simulateCarrierTyping(threadId, () => {
      const acknowledgments = [
        "Got it, let me check with dispatch.",
        "Understood. I'll get back to you shortly.",
        "Thanks for the update!",
        "Noted. We'll coordinate accordingly.",
        "Received. Our team is reviewing.",
      ];
      const carrierReply: ChatMessage = {
        messageId: generateId("msg"),
        sender: "carrier",
        senderName: thread.carrierName,
        content: acknowledgments[Math.floor(Math.random() * acknowledgments.length)],
        timestamp: new Date(),
        type: "text",
      };
      addMessageToThread(threadId, carrierReply);
    });
  }, [addMessageToThread, simulateCarrierTyping]);

  const submitCounterOffer = useCallback((threadId: string, amount: number, message?: string) => {
    const thread = negotiationsRef.current.find(n => n.threadId === threadId);
    if (!thread) return;

    const counterMessage: ChatMessage = {
      messageId: generateId("msg"),
      sender: "shipper",
      senderName: "You",
      content: message || `Counter-offer submitted: $${amount.toLocaleString()}`,
      timestamp: new Date(),
      type: "counter_offer",
      bidAmount: amount,
    };
    addMessageToThread(threadId, counterMessage);

    setNegotiations(prev => prev.map(n => 
      n.threadId === threadId ? { ...n, lastCounterAmount: amount } : n
    ));

    counterBid(thread.bidId, amount, message || `Counter-offer: $${amount}`);

    simulateCarrierTyping(threadId, () => {
      const responses = ["accept", "counter", "negotiate"] as const;
      const response = responses[Math.floor(Math.random() * 3)];
      
      if (response === "accept") {
        const acceptMessage: ChatMessage = {
          messageId: generateId("msg"),
          sender: "carrier",
          senderName: thread.carrierName,
          content: `We accept your offer of $${amount.toLocaleString()}. Ready to proceed!`,
          timestamp: new Date(),
          type: "text",
          bidAmount: amount,
        };
        addMessageToThread(threadId, acceptMessage);
        
        setBids(prev => prev.map(b => 
          b.bidId === thread.bidId ? { ...b, bidPrice: amount, status: "Pending" as const } : b
        ));
        
        setNegotiations(prev => prev.map(n => 
          n.threadId === threadId ? { ...n, currentBidAmount: amount } : n
        ));
        
        createNotification({
          title: "Carrier Accepted Counter-Offer",
          message: `${thread.carrierName} accepted your counter-offer of $${amount.toLocaleString()}`,
          type: "bid",
          loadId: thread.loadId,
          bidId: thread.bidId,
        });
      } else {
        const carrierCounter = Math.round((amount + thread.currentBidAmount) / 2 / 50) * 50;
        const counterReply: ChatMessage = {
          messageId: generateId("msg"),
          sender: "carrier",
          senderName: thread.carrierName,
          content: getRandomCarrierResponse(carrierCounter),
          timestamp: new Date(),
          type: "counter_offer",
          bidAmount: carrierCounter,
        };
        addMessageToThread(threadId, counterReply);
        
        setBids(prev => prev.map(b => 
          b.bidId === thread.bidId 
            ? { ...b, bidPrice: carrierCounter, status: "Countered" as const, counterPrice: carrierCounter }
            : b
        ));
        
        setNegotiations(prev => prev.map(n => 
          n.threadId === threadId ? { ...n, currentBidAmount: carrierCounter } : n
        ));
        
        createNotification({
          title: "New Counter-Offer",
          message: `${thread.carrierName} countered with $${carrierCounter.toLocaleString()}`,
          type: "bid",
          loadId: thread.loadId,
          bidId: thread.bidId,
        });
      }
    });
  }, [addMessageToThread, simulateCarrierTyping, counterBid, createNotification]);

  const acceptNegotiation = useCallback((threadId: string) => {
    const thread = negotiationsRef.current.find(n => n.threadId === threadId);
    if (!thread) return;

    const acceptMessage: ChatMessage = {
      messageId: generateId("msg"),
      sender: "shipper",
      senderName: "You",
      content: `You accepted the bid of $${thread.currentBidAmount.toLocaleString()}.`,
      timestamp: new Date(),
      type: "acceptance",
      bidAmount: thread.currentBidAmount,
    };
    addMessageToThread(threadId, acceptMessage);

    setNegotiations(prev => prev.map(n => 
      n.threadId === threadId ? { ...n, status: "accepted" as const } : n
    ));

    acceptBid(thread.bidId);

    simulateCarrierTyping(threadId, () => {
      const confirmMessage: ChatMessage = {
        messageId: generateId("msg"),
        sender: "carrier",
        senderName: thread.carrierName,
        content: "Great! We'll dispatch our driver shortly. Thank you for your business!",
        timestamp: new Date(),
        type: "text",
      };
      addMessageToThread(threadId, confirmMessage);
    });
  }, [addMessageToThread, simulateCarrierTyping, acceptBid]);

  const rejectNegotiation = useCallback((threadId: string) => {
    const thread = negotiationsRef.current.find(n => n.threadId === threadId);
    if (!thread) return;

    const rejectMessage: ChatMessage = {
      messageId: generateId("msg"),
      sender: "shipper",
      senderName: "You",
      content: "You rejected this bid.",
      timestamp: new Date(),
      type: "rejection",
    };
    addMessageToThread(threadId, rejectMessage);

    setNegotiations(prev => prev.map(n => 
      n.threadId === threadId ? { ...n, status: "rejected" as const } : n
    ));

    rejectBid(thread.bidId);
  }, [addMessageToThread, rejectBid]);

  const getActiveNegotiations = useCallback(() => 
    negotiations.filter(n => n.status === "active"),
  [negotiations]);

  const getShipmentById = useCallback((shipmentId: string) => 
    shipmentsRef.current.find(s => s.shipmentId === shipmentId),
  []);

  const getShipmentByLoadId = useCallback((loadId: string) => 
    shipmentsRef.current.find(s => s.loadId === loadId),
  []);

  const getActiveShipments = useCallback(() => 
    shipments.filter(s => s.currentStage !== "completed"),
  [shipments]);

  const getCompletedShipments = useCallback(() => 
    shipments.filter(s => s.currentStage === "completed"),
  [shipments]);

  const uploadDocument = useCallback((
    shipmentId: string, 
    templateId: DocumentTemplateId, 
    fileName: string, 
    fileType: "pdf" | "image",
    stage: ShipmentStage
  ): ShipmentDocument => {
    const shipment = shipmentsRef.current.find(s => s.shipmentId === shipmentId);
    if (!shipment) throw new Error("Shipment not found");

    const template = documentTemplates.find(t => t.id === templateId);
    const mockFileUrl = fileType === "pdf" ? `/mock/${templateId}.pdf` : `/mock/${templateId}.jpg`;
    
    const newDoc: ShipmentDocument = {
      docId: generateId("DOC"),
      shipmentId,
      loadId: shipment.loadId,
      templateId,
      fileName,
      fileType,
      fileUrl: mockFileUrl,
      fileSize: Math.floor(Math.random() * 2000000) + 100000,
      status: "uploaded",
      uploadedAt: new Date(),
      uploadedBy: "You",
      stage,
    };

    setShipments(prev => prev.map(s => {
      if (s.shipmentId === shipmentId) {
        const updatedEvents = s.events.map(e => 
          e.stage === stage 
            ? { ...e, documents: [...e.documents, newDoc] }
            : e
        );
        return { 
          ...s, 
          documents: [...s.documents, newDoc],
          events: updatedEvents,
        };
      }
      return s;
    }));

    createNotification({
      title: "Document Uploaded",
      message: `${template?.name || fileName} uploaded for shipment ${shipmentId}`,
      type: "document",
      loadId: shipment.loadId,
    });

    if (templateId === "pod" && shipment.currentStage !== "completed") {
      setShipments(prev => prev.map(s => {
        if (s.shipmentId === shipmentId) {
          const updatedEvents = s.events.map(e => ({
            ...e,
            completed: true,
          }));
          return { 
            ...s, 
            currentStage: "completed" as const, 
            progress: 100,
            events: updatedEvents,
          };
        }
        return s;
      }));

      setLoads(prev => prev.map(l => 
        l.loadId === shipment.loadId ? { ...l, status: "Delivered" as const } : l
      ));
      
      setInTransit(prev => prev.filter(t => t.loadId !== shipment.loadId));

      createNotification({
        title: "Delivery Completed",
        message: `POD uploaded - Load ${shipment.loadId} marked as completed`,
        type: "shipment",
        loadId: shipment.loadId,
      });
    }

    return newDoc;
  }, [createNotification]);

  const verifyDocument = useCallback((docId: string) => {
    setShipments(prev => prev.map(s => ({
      ...s,
      documents: s.documents.map(d => 
        d.docId === docId ? { ...d, status: "verified" as const } : d
      ),
      events: s.events.map(e => ({
        ...e,
        documents: e.documents.map(d =>
          d.docId === docId ? { ...d, status: "verified" as const } : d
        ),
      })),
    })));
  }, []);

  const deleteDocument = useCallback((docId: string) => {
    setShipments(prev => prev.map(s => ({
      ...s,
      documents: s.documents.filter(d => d.docId !== docId),
      events: s.events.map(e => ({
        ...e,
        documents: e.documents.filter(d => d.docId !== docId),
      })),
    })));
  }, []);

  const getDocumentsForShipment = useCallback((shipmentId: string) => {
    const shipment = shipmentsRef.current.find(s => s.shipmentId === shipmentId);
    return shipment?.documents || [];
  }, []);

  const getDocumentsForLoad = useCallback((loadId: string) => {
    const shipment = shipmentsRef.current.find(s => s.loadId === loadId);
    return shipment?.documents || [];
  }, []);

  const updateShipmentStage = useCallback((shipmentId: string, stage: ShipmentStage, notes?: string) => {
    const shipment = shipmentsRef.current.find(s => s.shipmentId === shipmentId);
    if (!shipment) return;

    const currentStageIndex = shipmentStages.indexOf(shipment.currentStage);
    const newStageIndex = shipmentStages.indexOf(stage);
    
    if (newStageIndex < currentStageIndex && stage !== "completed") {
      console.warn(`Cannot regress stage from ${shipment.currentStage} to ${stage}`);
      return;
    }
    
    if (shipment.currentStage === "completed") {
      console.warn("Cannot update stage of a completed shipment");
      return;
    }

    const progress = Math.round((newStageIndex / (shipmentStages.length - 1)) * 100);

    setShipments(prev => prev.map(s => {
      if (s.shipmentId === shipmentId) {
        const updatedEvents = s.events.map((e, idx) => ({
          ...e,
          completed: idx <= newStageIndex,
          notes: e.stage === stage && notes ? notes : e.notes,
        }));
        return { 
          ...s, 
          currentStage: stage,
          progress,
          events: updatedEvents,
        };
      }
      return s;
    }));

    const stageLabels: Record<ShipmentStage, string> = {
      load_created: "Load Created",
      carrier_assigned: "Carrier Assigned",
      reached_pickup: "Reached Pickup",
      loaded: "Loaded",
      in_transit: "In Transit",
      arrived_at_drop: "Arrived at Drop",
      delivered: "Delivered",
      completed: "Completed",
    };
    
    createNotification({
      title: "Shipment Update",
      message: `${shipment.route} - ${stageLabels[stage]}`,
      type: "shipment",
      loadId: shipment.loadId,
    });
  }, [createNotification]);

  useEffect(() => {
    return () => {
      pendingTimeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [pendingTimeouts]);

  return (
    <MockDataContext.Provider value={{
      loads,
      bids,
      inTransit,
      spend,
      notifications,
      trucks,
      negotiations,
      shipments,
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
      getNearbyTrucks,
      requestQuote,
      getTruckById,
      getOrCreateNegotiation,
      sendNegotiationMessage,
      submitCounterOffer,
      acceptNegotiation,
      rejectNegotiation,
      getActiveNegotiations,
      getShipmentById,
      getShipmentByLoadId,
      getActiveShipments,
      getCompletedShipments,
      uploadDocument,
      verifyDocument,
      deleteDocument,
      getDocumentsForShipment,
      getDocumentsForLoad,
      updateShipmentStage,
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
