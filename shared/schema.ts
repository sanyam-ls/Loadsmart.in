import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, decimal, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User roles enum
export const userRoles = ["shipper", "carrier", "admin"] as const;
export type UserRole = typeof userRoles[number];

// Load status enum
export const loadStatuses = ["draft", "posted", "bidding", "assigned", "in_transit", "delivered", "cancelled"] as const;
export type LoadStatus = typeof loadStatuses[number];

// Bid status enum
export const bidStatuses = ["pending", "accepted", "rejected", "countered", "expired"] as const;
export type BidStatus = typeof bidStatuses[number];

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

// Loads table
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
  createdAt: timestamp("created_at").defaultNow(),
});

// Bids table
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

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertCarrierProfileSchema = createInsertSchema(carrierProfiles).omit({ id: true });
export const insertTruckSchema = createInsertSchema(trucks).omit({ id: true, createdAt: true });
export const insertLoadSchema = createInsertSchema(loads).omit({ id: true, createdAt: true });
export const insertBidSchema = createInsertSchema(bids).omit({ id: true, createdAt: true });
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
