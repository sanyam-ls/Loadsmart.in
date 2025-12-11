import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, decimal, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User roles enum
export const userRoles = ["shipper", "carrier", "admin"] as const;
export type UserRole = typeof userRoles[number];

// Load status enum (updated for Admin-as-Mediator flow)
export const loadStatuses = ["draft", "submitted_to_admin", "pending_admin_review", "admin_priced", "awaiting_shipper_confirmation", "posted", "posted_open", "posted_invite", "assigned", "bidding", "in_transit", "delivered", "cancelled", "archived"] as const;
export type LoadStatus = typeof loadStatuses[number];

// Admin post mode enum
export const adminPostModes = ["open", "invite", "assign"] as const;
export type AdminPostMode = typeof adminPostModes[number];

// Admin pricing status enum
export const adminPricingStatuses = ["draft", "locked", "awaiting_approval", "approved", "posted", "assigned", "rejected"] as const;
export type AdminPricingStatus = typeof adminPricingStatuses[number];

// Bid status enum
export const bidStatuses = ["pending", "accepted", "rejected", "countered", "expired"] as const;
export type BidStatus = typeof bidStatuses[number];

// Bid type enum (for Admin-as-Mediator flow)
export const bidTypes = ["carrier_bid", "admin_posted_acceptance", "admin_counter"] as const;
export type BidType = typeof bidTypes[number];

// Shipment status enum
export const shipmentStatuses = ["pickup_scheduled", "picked_up", "in_transit", "at_checkpoint", "out_for_delivery", "delivered"] as const;
export type ShipmentStatus = typeof shipmentStatuses[number];

// Truck types enum
export const truckTypes = ["flatbed", "refrigerated", "dry_van", "tanker", "container", "open_deck"] as const;
export type TruckType = typeof truckTypes[number];

// Document types enum
export const documentTypes = ["pod", "invoice", "rc", "insurance", "fitness", "license", "other"] as const;
export type DocumentType = typeof documentTypes[number];

// Alert types enum
export const alertTypes = ["overheating", "low_fuel", "overspeed", "low_battery", "harsh_brake", "sudden_acceleration", "route_deviation", "unexpected_stop", "idle_time"] as const;
export type AlertType = typeof alertTypes[number];

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("shipper"),
  companyName: text("company_name"),
  phone: text("phone"),
  avatar: text("avatar"),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Carrier profiles (additional info for carriers)
export const carrierProfiles = pgTable("carrier_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  fleetSize: integer("fleet_size").default(1),
  serviceZones: text("service_zones").array(),
  reliabilityScore: decimal("reliability_score", { precision: 3, scale: 2 }).default("0"),
  communicationScore: decimal("communication_score", { precision: 3, scale: 2 }).default("0"),
  onTimeScore: decimal("on_time_score", { precision: 3, scale: 2 }).default("0"),
  totalDeliveries: integer("total_deliveries").default(0),
  badgeLevel: text("badge_level").default("bronze"),
  bio: text("bio"),
});

// Trucks table
export const trucks = pgTable("trucks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  carrierId: varchar("carrier_id").notNull().references(() => users.id),
  truckType: text("truck_type").notNull(),
  licensePlate: text("license_plate").notNull(),
  capacity: integer("capacity").notNull(),
  capacityUnit: text("capacity_unit").default("tons"),
  isAvailable: boolean("is_available").default(true),
  currentLat: decimal("current_lat", { precision: 10, scale: 7 }),
  currentLng: decimal("current_lng", { precision: 10, scale: 7 }),
  currentLocation: text("current_location"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Loads table (updated for Admin-as-Mediator flow)
export const loads = pgTable("loads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shipperId: varchar("shipper_id").notNull().references(() => users.id),
  assignedCarrierId: varchar("assigned_carrier_id").references(() => users.id),
  assignedTruckId: varchar("assigned_truck_id").references(() => trucks.id),
  pickupAddress: text("pickup_address").notNull(),
  pickupCity: text("pickup_city").notNull(),
  pickupLat: decimal("pickup_lat", { precision: 10, scale: 7 }),
  pickupLng: decimal("pickup_lng", { precision: 10, scale: 7 }),
  dropoffAddress: text("dropoff_address").notNull(),
  dropoffCity: text("dropoff_city").notNull(),
  dropoffLat: decimal("dropoff_lat", { precision: 10, scale: 7 }),
  dropoffLng: decimal("dropoff_lng", { precision: 10, scale: 7 }),
  distance: decimal("distance", { precision: 10, scale: 2 }),
  weight: decimal("weight", { precision: 10, scale: 2 }).notNull(),
  weightUnit: text("weight_unit").default("tons"),
  cargoDescription: text("cargo_description"),
  requiredTruckType: text("required_truck_type"),
  estimatedPrice: decimal("estimated_price", { precision: 12, scale: 2 }),
  finalPrice: decimal("final_price", { precision: 12, scale: 2 }),
  pickupDate: timestamp("pickup_date"),
  deliveryDate: timestamp("delivery_date"),
  status: text("status").default("draft"),
  isTemplate: boolean("is_template").default(false),
  templateName: text("template_name"),
  adminSuggestedPrice: decimal("admin_suggested_price", { precision: 12, scale: 2 }),
  adminFinalPrice: decimal("admin_final_price", { precision: 12, scale: 2 }),
  adminPostMode: text("admin_post_mode"),
  adminId: varchar("admin_id").references(() => users.id),
  adminDecisionId: varchar("admin_decision_id"),
  invitedCarrierIds: text("invited_carrier_ids").array(),
  allowCounterBids: boolean("allow_counter_bids").default(false),
  kycVerified: boolean("kyc_verified").default(false),
  priority: text("priority").default("normal"),
  submittedAt: timestamp("submitted_at"),
  postedAt: timestamp("posted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Admin Decisions table (immutable audit trail)
export const adminDecisions = pgTable("admin_decisions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  loadId: varchar("load_id").notNull().references(() => loads.id),
  adminId: varchar("admin_id").notNull().references(() => users.id),
  suggestedPrice: decimal("suggested_price", { precision: 12, scale: 2 }).notNull(),
  finalPrice: decimal("final_price", { precision: 12, scale: 2 }).notNull(),
  postingMode: text("posting_mode").notNull(),
  invitedCarrierIds: text("invited_carrier_ids").array(),
  comment: text("comment"),
  pricingBreakdown: jsonb("pricing_breakdown"),
  actionType: text("action_type").default("price_and_post"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Pricing Templates table (reusable margin presets)
export const pricingTemplates = pgTable("pricing_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  markupPercent: decimal("markup_percent", { precision: 5, scale: 2 }).default("0"),
  fixedFee: decimal("fixed_fee", { precision: 12, scale: 2 }).default("0"),
  fuelSurchargePercent: decimal("fuel_surcharge_percent", { precision: 5, scale: 2 }).default("0"),
  platformRatePercent: decimal("platform_rate_percent", { precision: 5, scale: 2 }).default("10"),
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Admin Pricings table (detailed pricing calculations and adjustments)
export const adminPricings = pgTable("admin_pricings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  loadId: varchar("load_id").notNull().references(() => loads.id),
  adminId: varchar("admin_id").notNull().references(() => users.id),
  templateId: varchar("template_id").references(() => pricingTemplates.id),
  suggestedPrice: decimal("suggested_price", { precision: 12, scale: 2 }).notNull(),
  finalPrice: decimal("final_price", { precision: 12, scale: 2 }),
  markupPercent: decimal("markup_percent", { precision: 5, scale: 2 }).default("0"),
  fixedFee: decimal("fixed_fee", { precision: 12, scale: 2 }).default("0"),
  fuelOverride: decimal("fuel_override", { precision: 12, scale: 2 }),
  discountAmount: decimal("discount_amount", { precision: 12, scale: 2 }).default("0"),
  payoutEstimate: decimal("payout_estimate", { precision: 12, scale: 2 }),
  platformMargin: decimal("platform_margin", { precision: 12, scale: 2 }),
  platformMarginPercent: decimal("platform_margin_percent", { precision: 5, scale: 2 }),
  status: text("status").default("draft"),
  requiresApproval: boolean("requires_approval").default(false),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectedBy: varchar("rejected_by").references(() => users.id),
  rejectedAt: timestamp("rejected_at"),
  rejectionReason: text("rejection_reason"),
  postMode: text("post_mode"),
  invitedCarrierIds: text("invited_carrier_ids").array(),
  notes: text("notes"),
  priceBreakdown: jsonb("price_breakdown"),
  confidenceScore: integer("confidence_score"),
  riskFlags: text("risk_flags").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Invoice status enum
export const invoiceStatuses = ["draft", "sent", "viewed", "paid", "overdue", "cancelled"] as const;
export type InvoiceStatus = typeof invoiceStatuses[number];

// Invoices table (Admin-generated invoices for shippers)
export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceNumber: text("invoice_number").notNull().unique(),
  loadId: varchar("load_id").notNull().references(() => loads.id),
  shipperId: varchar("shipper_id").notNull().references(() => users.id),
  adminId: varchar("admin_id").notNull().references(() => users.id),
  pricingId: varchar("pricing_id").references(() => adminPricings.id),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  fuelSurcharge: decimal("fuel_surcharge", { precision: 12, scale: 2 }).default("0"),
  tollCharges: decimal("toll_charges", { precision: 12, scale: 2 }).default("0"),
  handlingFee: decimal("handling_fee", { precision: 12, scale: 2 }).default("0"),
  insuranceFee: decimal("insurance_fee", { precision: 12, scale: 2 }).default("0"),
  discountAmount: decimal("discount_amount", { precision: 12, scale: 2 }).default("0"),
  discountReason: text("discount_reason"),
  taxPercent: decimal("tax_percent", { precision: 5, scale: 2 }).default("18"),
  taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  paymentTerms: text("payment_terms").default("Net 30"),
  dueDate: timestamp("due_date"),
  status: text("status").default("draft"),
  notes: text("notes"),
  lineItems: jsonb("line_items"),
  sentAt: timestamp("sent_at"),
  viewedAt: timestamp("viewed_at"),
  paidAt: timestamp("paid_at"),
  paidAmount: decimal("paid_amount", { precision: 12, scale: 2 }),
  paymentMethod: text("payment_method"),
  paymentReference: text("payment_reference"),
  shipperConfirmed: boolean("shipper_confirmed").default(false),
  shipperConfirmedAt: timestamp("shipper_confirmed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Admin Action Types enum
export const adminActionTypes = [
  "view_load", "impersonate_user", "force_post", "generate_invoice", 
  "send_invoice", "save_draft", "requeue_post", "toggle_feature_flag",
  "grant_permission", "rollback_price", "manual_override", "create_ticket"
] as const;
export type AdminActionType = typeof adminActionTypes[number];

// API Log types enum
export const apiLogTypes = ["request", "response", "error"] as const;
export type ApiLogType = typeof apiLogTypes[number];

// Admin Audit Logs table (immutable trail of all admin actions)
export const adminAuditLogs = pgTable("admin_audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id").notNull().references(() => users.id),
  loadId: varchar("load_id").references(() => loads.id),
  userId: varchar("user_id").references(() => users.id),
  actionType: text("action_type").notNull(),
  actionDescription: text("action_description"),
  reason: text("reason"),
  beforeState: jsonb("before_state"),
  afterState: jsonb("after_state"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  sessionId: text("session_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// API Request Logs table (for debugging and troubleshooting)
export const apiLogs = pgTable("api_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  loadId: varchar("load_id").references(() => loads.id),
  userId: varchar("user_id").references(() => users.id),
  endpoint: text("endpoint").notNull(),
  method: text("method").notNull(),
  requestBody: jsonb("request_body"),
  responseBody: jsonb("response_body"),
  statusCode: integer("status_code"),
  errorMessage: text("error_message"),
  durationMs: integer("duration_ms"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  logType: text("log_type").default("request"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Admin Actions Queue table (for retry/requeue operations)
export const adminActionsQueue = pgTable("admin_actions_queue", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  loadId: varchar("load_id").notNull().references(() => loads.id),
  actionType: text("action_type").notNull(),
  payload: jsonb("payload"),
  status: text("status").default("pending"),
  priority: integer("priority").default(0),
  retryCount: integer("retry_count").default(0),
  maxRetries: integer("max_retries").default(3),
  lastError: text("last_error"),
  scheduledFor: timestamp("scheduled_for"),
  processedAt: timestamp("processed_at"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Feature Flags table (for admin controls)
export const featureFlags = pgTable("feature_flags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  isEnabled: boolean("is_enabled").default(false),
  targetRoles: text("target_roles").array(),
  metadata: jsonb("metadata"),
  updatedBy: varchar("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Carrier Settlements table (payouts to carriers)
export const carrierSettlements = pgTable("carrier_settlements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  loadId: varchar("load_id").notNull().references(() => loads.id),
  carrierId: varchar("carrier_id").notNull().references(() => users.id),
  invoiceId: varchar("invoice_id").references(() => invoices.id),
  grossAmount: decimal("gross_amount", { precision: 12, scale: 2 }).notNull(),
  platformFee: decimal("platform_fee", { precision: 12, scale: 2 }).default("0"),
  deductions: decimal("deductions", { precision: 12, scale: 2 }).default("0"),
  deductionReason: text("deduction_reason"),
  netPayout: decimal("net_payout", { precision: 12, scale: 2 }).notNull(),
  status: text("status").default("pending"),
  scheduledDate: timestamp("scheduled_date"),
  paidAt: timestamp("paid_at"),
  paymentMethod: text("payment_method"),
  transactionId: text("transaction_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Bids table (updated for Admin-as-Mediator flow)
export const bids = pgTable("bids", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  loadId: varchar("load_id").notNull().references(() => loads.id),
  carrierId: varchar("carrier_id").notNull().references(() => users.id),
  truckId: varchar("truck_id").references(() => trucks.id),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  counterAmount: decimal("counter_amount", { precision: 12, scale: 2 }),
  estimatedPickup: timestamp("estimated_pickup"),
  estimatedDelivery: timestamp("estimated_delivery"),
  notes: text("notes"),
  status: text("status").default("pending"),
  bidType: text("bid_type").default("carrier_bid"),
  approvalRequired: boolean("approval_required").default(false),
  adminMediated: boolean("admin_mediated").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Shipments table (for tracking)
export const shipments = pgTable("shipments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  loadId: varchar("load_id").notNull().references(() => loads.id),
  carrierId: varchar("carrier_id").notNull().references(() => users.id),
  truckId: varchar("truck_id").references(() => trucks.id),
  status: text("status").default("pickup_scheduled"),
  currentLat: decimal("current_lat", { precision: 10, scale: 7 }),
  currentLng: decimal("current_lng", { precision: 10, scale: 7 }),
  currentLocation: text("current_location"),
  eta: timestamp("eta"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
});

// Shipment timeline events
export const shipmentEvents = pgTable("shipment_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shipmentId: varchar("shipment_id").notNull().references(() => shipments.id),
  eventType: text("event_type").notNull(),
  location: text("location"),
  lat: decimal("lat", { precision: 10, scale: 7 }),
  lng: decimal("lng", { precision: 10, scale: 7 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Messages table (for negotiation chat)
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  loadId: varchar("load_id").notNull().references(() => loads.id),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  receiverId: varchar("receiver_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  messageType: text("message_type").default("text"),
  bidId: varchar("bid_id").references(() => bids.id),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Documents table
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  loadId: varchar("load_id").references(() => loads.id),
  shipmentId: varchar("shipment_id").references(() => shipments.id),
  documentType: text("document_type").notNull(),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size"),
  expiryDate: timestamp("expiry_date"),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").default("info"),
  relatedLoadId: varchar("related_load_id").references(() => loads.id),
  relatedBidId: varchar("related_bid_id").references(() => bids.id),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Ratings table
export const ratings = pgTable("ratings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  loadId: varchar("load_id").notNull().references(() => loads.id),
  raterId: varchar("rater_id").notNull().references(() => users.id),
  ratedUserId: varchar("rated_user_id").notNull().references(() => users.id),
  reliability: integer("reliability").notNull(),
  communication: integer("communication").notNull(),
  onTimeDelivery: integer("on_time_delivery").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Vehicle Telemetry table (CAN-Bus data)
export const vehicleTelemetry = pgTable("vehicle_telemetry", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleId: varchar("vehicle_id").notNull(),
  truckId: varchar("truck_id").references(() => trucks.id),
  loadId: varchar("load_id").references(() => loads.id),
  driverId: varchar("driver_id").references(() => users.id),
  lat: decimal("lat", { precision: 10, scale: 7 }).notNull(),
  lng: decimal("lng", { precision: 10, scale: 7 }).notNull(),
  speed: integer("speed").default(0),
  rpm: integer("rpm").default(0),
  fuelLevel: integer("fuel_level").default(100),
  engineTemp: integer("engine_temp").default(80),
  batteryVoltage: decimal("battery_voltage", { precision: 4, scale: 1 }).default("12.6"),
  odometer: decimal("odometer", { precision: 12, scale: 1 }).default("0"),
  loadWeight: decimal("load_weight", { precision: 10, scale: 2 }),
  maxCapacity: decimal("max_capacity", { precision: 10, scale: 2 }),
  heading: integer("heading").default(0),
  altitude: integer("altitude").default(0),
  isIgnitionOn: boolean("is_ignition_on").default(true),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Driver Behavior Events table
export const driverBehaviorEvents = pgTable("driver_behavior_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverId: varchar("driver_id").notNull().references(() => users.id),
  truckId: varchar("truck_id").references(() => trucks.id),
  loadId: varchar("load_id").references(() => loads.id),
  eventType: text("event_type").notNull(),
  severity: text("severity").default("low"),
  lat: decimal("lat", { precision: 10, scale: 7 }),
  lng: decimal("lng", { precision: 10, scale: 7 }),
  speed: integer("speed"),
  accelerationG: decimal("acceleration_g", { precision: 4, scale: 2 }),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Telematics Alerts table
export const telematicsAlerts = pgTable("telematics_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleId: varchar("vehicle_id").notNull(),
  loadId: varchar("load_id").references(() => loads.id),
  driverId: varchar("driver_id").references(() => users.id),
  alertType: text("alert_type").notNull(),
  severity: text("severity").default("warning"),
  message: text("message").notNull(),
  lat: decimal("lat", { precision: 10, scale: 7 }),
  lng: decimal("lng", { precision: 10, scale: 7 }),
  value: decimal("value", { precision: 10, scale: 2 }),
  threshold: decimal("threshold", { precision: 10, scale: 2 }),
  isAcknowledged: boolean("is_acknowledged").default(false),
  acknowledgedAt: timestamp("acknowledged_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// GPS Breadcrumb Trail table
export const gpsBreadcrumbs = pgTable("gps_breadcrumbs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleId: varchar("vehicle_id").notNull(),
  loadId: varchar("load_id").references(() => loads.id),
  lat: decimal("lat", { precision: 10, scale: 7 }).notNull(),
  lng: decimal("lng", { precision: 10, scale: 7 }).notNull(),
  speed: integer("speed"),
  heading: integer("heading"),
  isRiskySegment: boolean("is_risky_segment").default(false),
  riskReason: text("risk_reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Route ETA Predictions table
export const routeEtaPredictions = pgTable("route_eta_predictions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  loadId: varchar("load_id").notNull().references(() => loads.id),
  vehicleId: varchar("vehicle_id").notNull(),
  distanceRemaining: decimal("distance_remaining", { precision: 10, scale: 2 }),
  distanceUnit: text("distance_unit").default("km"),
  currentEta: timestamp("current_eta"),
  originalEta: timestamp("original_eta"),
  delayMinutes: integer("delay_minutes").default(0),
  delayRisk: text("delay_risk").default("low"),
  trafficCondition: text("traffic_condition").default("normal"),
  weatherCondition: text("weather_condition").default("clear"),
  betterRouteAvailable: boolean("better_route_available").default(false),
  betterRouteSavingsMinutes: integer("better_route_savings_minutes"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  carrierProfile: one(carrierProfiles, {
    fields: [users.id],
    references: [carrierProfiles.userId],
  }),
  trucks: many(trucks),
  loadsAsShipper: many(loads, { relationName: "shipperLoads" }),
  loadsAsCarrier: many(loads, { relationName: "carrierLoads" }),
  bids: many(bids),
  sentMessages: many(messages, { relationName: "sentMessages" }),
  receivedMessages: many(messages, { relationName: "receivedMessages" }),
  documents: many(documents),
  notifications: many(notifications),
}));

export const trucksRelations = relations(trucks, ({ one, many }) => ({
  carrier: one(users, {
    fields: [trucks.carrierId],
    references: [users.id],
  }),
  loads: many(loads),
  bids: many(bids),
}));

export const loadsRelations = relations(loads, ({ one, many }) => ({
  shipper: one(users, {
    fields: [loads.shipperId],
    references: [users.id],
    relationName: "shipperLoads",
  }),
  assignedCarrier: one(users, {
    fields: [loads.assignedCarrierId],
    references: [users.id],
    relationName: "carrierLoads",
  }),
  assignedTruck: one(trucks, {
    fields: [loads.assignedTruckId],
    references: [trucks.id],
  }),
  bids: many(bids),
  messages: many(messages),
  documents: many(documents),
  shipment: one(shipments, {
    fields: [loads.id],
    references: [shipments.loadId],
  }),
}));

export const bidsRelations = relations(bids, ({ one, many }) => ({
  load: one(loads, {
    fields: [bids.loadId],
    references: [loads.id],
  }),
  carrier: one(users, {
    fields: [bids.carrierId],
    references: [users.id],
  }),
  truck: one(trucks, {
    fields: [bids.truckId],
    references: [trucks.id],
  }),
  messages: many(messages),
}));

export const shipmentsRelations = relations(shipments, ({ one, many }) => ({
  load: one(loads, {
    fields: [shipments.loadId],
    references: [loads.id],
  }),
  carrier: one(users, {
    fields: [shipments.carrierId],
    references: [users.id],
  }),
  truck: one(trucks, {
    fields: [shipments.truckId],
    references: [trucks.id],
  }),
  events: many(shipmentEvents),
  documents: many(documents),
}));

export const shipmentEventsRelations = relations(shipmentEvents, ({ one }) => ({
  shipment: one(shipments, {
    fields: [shipmentEvents.shipmentId],
    references: [shipments.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  load: one(loads, {
    fields: [messages.loadId],
    references: [loads.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: "sentMessages",
  }),
  receiver: one(users, {
    fields: [messages.receiverId],
    references: [users.id],
    relationName: "receivedMessages",
  }),
  bid: one(bids, {
    fields: [messages.bidId],
    references: [bids.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  user: one(users, {
    fields: [documents.userId],
    references: [users.id],
  }),
  load: one(loads, {
    fields: [documents.loadId],
    references: [loads.id],
  }),
  shipment: one(shipments, {
    fields: [documents.shipmentId],
    references: [shipments.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  load: one(loads, {
    fields: [notifications.relatedLoadId],
    references: [loads.id],
  }),
  bid: one(bids, {
    fields: [notifications.relatedBidId],
    references: [bids.id],
  }),
}));

export const ratingsRelations = relations(ratings, ({ one }) => ({
  load: one(loads, {
    fields: [ratings.loadId],
    references: [loads.id],
  }),
  rater: one(users, {
    fields: [ratings.raterId],
    references: [users.id],
  }),
  ratedUser: one(users, {
    fields: [ratings.ratedUserId],
    references: [users.id],
  }),
}));

export const adminDecisionsRelations = relations(adminDecisions, ({ one }) => ({
  load: one(loads, {
    fields: [adminDecisions.loadId],
    references: [loads.id],
  }),
  admin: one(users, {
    fields: [adminDecisions.adminId],
    references: [users.id],
  }),
}));

export const pricingTemplatesRelations = relations(pricingTemplates, ({ one, many }) => ({
  creator: one(users, {
    fields: [pricingTemplates.createdBy],
    references: [users.id],
  }),
  pricings: many(adminPricings),
}));

export const adminPricingsRelations = relations(adminPricings, ({ one, many }) => ({
  load: one(loads, {
    fields: [adminPricings.loadId],
    references: [loads.id],
  }),
  admin: one(users, {
    fields: [adminPricings.adminId],
    references: [users.id],
  }),
  template: one(pricingTemplates, {
    fields: [adminPricings.templateId],
    references: [pricingTemplates.id],
  }),
  approver: one(users, {
    fields: [adminPricings.approvedBy],
    references: [users.id],
  }),
  invoices: many(invoices),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  load: one(loads, {
    fields: [invoices.loadId],
    references: [loads.id],
  }),
  shipper: one(users, {
    fields: [invoices.shipperId],
    references: [users.id],
  }),
  admin: one(users, {
    fields: [invoices.adminId],
    references: [users.id],
  }),
  pricing: one(adminPricings, {
    fields: [invoices.pricingId],
    references: [adminPricings.id],
  }),
}));

export const carrierSettlementsRelations = relations(carrierSettlements, ({ one }) => ({
  load: one(loads, {
    fields: [carrierSettlements.loadId],
    references: [loads.id],
  }),
  carrier: one(users, {
    fields: [carrierSettlements.carrierId],
    references: [users.id],
  }),
  invoice: one(invoices, {
    fields: [carrierSettlements.invoiceId],
    references: [invoices.id],
  }),
}));

export const adminAuditLogsRelations = relations(adminAuditLogs, ({ one }) => ({
  admin: one(users, {
    fields: [adminAuditLogs.adminId],
    references: [users.id],
  }),
  load: one(loads, {
    fields: [adminAuditLogs.loadId],
    references: [loads.id],
  }),
  user: one(users, {
    fields: [adminAuditLogs.userId],
    references: [users.id],
  }),
}));

export const apiLogsRelations = relations(apiLogs, ({ one }) => ({
  load: one(loads, {
    fields: [apiLogs.loadId],
    references: [loads.id],
  }),
  user: one(users, {
    fields: [apiLogs.userId],
    references: [users.id],
  }),
}));

export const adminActionsQueueRelations = relations(adminActionsQueue, ({ one }) => ({
  load: one(loads, {
    fields: [adminActionsQueue.loadId],
    references: [loads.id],
  }),
  createdByUser: one(users, {
    fields: [adminActionsQueue.createdBy],
    references: [users.id],
  }),
}));

export const featureFlagsRelations = relations(featureFlags, ({ one }) => ({
  updatedByUser: one(users, {
    fields: [featureFlags.updatedBy],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertCarrierProfileSchema = createInsertSchema(carrierProfiles).omit({ id: true });
export const insertTruckSchema = createInsertSchema(trucks).omit({ id: true, createdAt: true });
export const insertLoadSchema = createInsertSchema(loads).omit({ id: true, createdAt: true });
export const insertBidSchema = createInsertSchema(bids).omit({ id: true, createdAt: true });
export const insertAdminDecisionSchema = createInsertSchema(adminDecisions).omit({ id: true, createdAt: true });
export const insertPricingTemplateSchema = createInsertSchema(pricingTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAdminPricingSchema = createInsertSchema(adminPricings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertShipmentSchema = createInsertSchema(shipments).omit({ id: true });
export const insertShipmentEventSchema = createInsertSchema(shipmentEvents).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true, createdAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export const insertRatingSchema = createInsertSchema(ratings).omit({ id: true, createdAt: true });
export const insertVehicleTelemetrySchema = createInsertSchema(vehicleTelemetry).omit({ id: true });
export const insertDriverBehaviorEventSchema = createInsertSchema(driverBehaviorEvents).omit({ id: true, createdAt: true });
export const insertTelematicsAlertSchema = createInsertSchema(telematicsAlerts).omit({ id: true, createdAt: true });
export const insertGpsBreadcrumbSchema = createInsertSchema(gpsBreadcrumbs).omit({ id: true, createdAt: true });
export const insertRouteEtaPredictionSchema = createInsertSchema(routeEtaPredictions).omit({ id: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCarrierSettlementSchema = createInsertSchema(carrierSettlements).omit({ id: true, createdAt: true });
export const insertAdminAuditLogSchema = createInsertSchema(adminAuditLogs).omit({ id: true, createdAt: true });
export const insertApiLogSchema = createInsertSchema(apiLogs).omit({ id: true, createdAt: true });
export const insertAdminActionsQueueSchema = createInsertSchema(adminActionsQueue).omit({ id: true, createdAt: true });
export const insertFeatureFlagSchema = createInsertSchema(featureFlags).omit({ id: true, createdAt: true, updatedAt: true });

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertCarrierProfile = z.infer<typeof insertCarrierProfileSchema>;
export type CarrierProfile = typeof carrierProfiles.$inferSelect;
export type InsertTruck = z.infer<typeof insertTruckSchema>;
export type Truck = typeof trucks.$inferSelect;
export type InsertLoad = z.infer<typeof insertLoadSchema>;
export type Load = typeof loads.$inferSelect;
export type InsertBid = z.infer<typeof insertBidSchema>;
export type Bid = typeof bids.$inferSelect;
export type InsertAdminDecision = z.infer<typeof insertAdminDecisionSchema>;
export type AdminDecision = typeof adminDecisions.$inferSelect;
export type InsertPricingTemplate = z.infer<typeof insertPricingTemplateSchema>;
export type PricingTemplate = typeof pricingTemplates.$inferSelect;
export type InsertAdminPricing = z.infer<typeof insertAdminPricingSchema>;
export type AdminPricing = typeof adminPricings.$inferSelect;
export type InsertShipment = z.infer<typeof insertShipmentSchema>;
export type Shipment = typeof shipments.$inferSelect;
export type InsertShipmentEvent = z.infer<typeof insertShipmentEventSchema>;
export type ShipmentEvent = typeof shipmentEvents.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertRating = z.infer<typeof insertRatingSchema>;
export type Rating = typeof ratings.$inferSelect;
export type InsertVehicleTelemetry = z.infer<typeof insertVehicleTelemetrySchema>;
export type VehicleTelemetry = typeof vehicleTelemetry.$inferSelect;
export type InsertDriverBehaviorEvent = z.infer<typeof insertDriverBehaviorEventSchema>;
export type DriverBehaviorEvent = typeof driverBehaviorEvents.$inferSelect;
export type InsertTelematicsAlert = z.infer<typeof insertTelematicsAlertSchema>;
export type TelematicsAlert = typeof telematicsAlerts.$inferSelect;
export type InsertGpsBreadcrumb = z.infer<typeof insertGpsBreadcrumbSchema>;
export type GpsBreadcrumb = typeof gpsBreadcrumbs.$inferSelect;
export type InsertRouteEtaPrediction = z.infer<typeof insertRouteEtaPredictionSchema>;
export type RouteEtaPrediction = typeof routeEtaPredictions.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertCarrierSettlement = z.infer<typeof insertCarrierSettlementSchema>;
export type CarrierSettlement = typeof carrierSettlements.$inferSelect;
export type InsertAdminAuditLog = z.infer<typeof insertAdminAuditLogSchema>;
export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;
export type InsertApiLog = z.infer<typeof insertApiLogSchema>;
export type ApiLog = typeof apiLogs.$inferSelect;
export type InsertAdminActionsQueue = z.infer<typeof insertAdminActionsQueueSchema>;
export type AdminActionsQueue = typeof adminActionsQueue.$inferSelect;
export type InsertFeatureFlag = z.infer<typeof insertFeatureFlagSchema>;
export type FeatureFlag = typeof featureFlags.$inferSelect;

// Live telemetry data type (for WebSocket streaming)
export interface LiveTelemetryData {
  vehicleId: string;
  gps: { lat: number; lng: number };
  speed: number;
  rpm: number;
  fuelLevel: number;
  engineTemp: number;
  batteryVoltage: number;
  odometer: number;
  driverId: string;
  loadId: string;
  heading: number;
  loadWeight?: number;
  maxCapacity?: number;
  isIgnitionOn: boolean;
  timestamp: string;
}

// Driver behavior score type
export interface DriverBehaviorScore {
  driverId: string;
  overallScore: number;
  harshBrakingEvents: number;
  suddenAccelerationEvents: number;
  overspeedEvents: number;
  idleTimeMinutes: number;
  totalTrips: number;
  averageSpeed: number;
  fuelEfficiency: number;
}

// ETA prediction type
export interface EtaPrediction {
  loadId: string;
  vehicleId: string;
  currentEta: string;
  originalEta: string;
  delayMinutes: number;
  delayRisk: "low" | "medium" | "high";
  distanceRemaining: number;
  distanceUnit: string;
  trafficCondition: string;
  weatherCondition: string;
  betterRouteAvailable: boolean;
  betterRouteSavingsMinutes?: number;
}
