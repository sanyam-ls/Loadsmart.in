import { db } from "./db";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import {
  users, trucks, loads, bids, shipments, shipmentEvents,
  messages, documents, notifications, ratings, carrierProfiles, adminDecisions,
  pricingTemplates, adminPricings,
  type User, type InsertUser,
  type Truck, type InsertTruck,
  type Load, type InsertLoad,
  type Bid, type InsertBid,
  type Shipment, type InsertShipment,
  type ShipmentEvent, type InsertShipmentEvent,
  type Message, type InsertMessage,
  type Document, type InsertDocument,
  type Notification, type InsertNotification,
  type Rating, type InsertRating,
  type CarrierProfile, type InsertCarrierProfile,
  type AdminDecision, type InsertAdminDecision,
  type PricingTemplate, type InsertPricingTemplate,
  type AdminPricing, type InsertAdminPricing,
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;

  getCarrierProfile(userId: string): Promise<CarrierProfile | undefined>;
  createCarrierProfile(profile: InsertCarrierProfile): Promise<CarrierProfile>;
  updateCarrierProfile(userId: string, updates: Partial<CarrierProfile>): Promise<CarrierProfile | undefined>;

  getTruck(id: string): Promise<Truck | undefined>;
  getTrucksByCarrier(carrierId: string): Promise<Truck[]>;
  createTruck(truck: InsertTruck): Promise<Truck>;
  updateTruck(id: string, updates: Partial<Truck>): Promise<Truck | undefined>;
  deleteTruck(id: string): Promise<boolean>;

  getLoad(id: string): Promise<Load | undefined>;
  getLoadsByShipper(shipperId: string): Promise<Load[]>;
  getAvailableLoads(): Promise<Load[]>;
  getAllLoads(): Promise<Load[]>;
  createLoad(load: InsertLoad): Promise<Load>;
  updateLoad(id: string, updates: Partial<Load>): Promise<Load | undefined>;

  getBid(id: string): Promise<Bid | undefined>;
  getBidsByLoad(loadId: string): Promise<Bid[]>;
  getBidsByCarrier(carrierId: string): Promise<Bid[]>;
  getAllBids(): Promise<Bid[]>;
  createBid(bid: InsertBid): Promise<Bid>;
  updateBid(id: string, updates: Partial<Bid>): Promise<Bid | undefined>;

  getShipment(id: string): Promise<Shipment | undefined>;
  getShipmentByLoad(loadId: string): Promise<Shipment | undefined>;
  getShipmentsByCarrier(carrierId: string): Promise<Shipment[]>;
  createShipment(shipment: InsertShipment): Promise<Shipment>;
  updateShipment(id: string, updates: Partial<Shipment>): Promise<Shipment | undefined>;

  getShipmentEvents(shipmentId: string): Promise<ShipmentEvent[]>;
  createShipmentEvent(event: InsertShipmentEvent): Promise<ShipmentEvent>;

  getMessagesByLoad(loadId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessagesAsRead(loadId: string, userId: string): Promise<void>;

  getDocumentsByUser(userId: string): Promise<Document[]>;
  getDocumentsByLoad(loadId: string): Promise<Document[]>;
  createDocument(doc: InsertDocument): Promise<Document>;
  deleteDocument(id: string): Promise<boolean>;

  getNotificationsByUser(userId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: string): Promise<void>;
  markAllNotificationsAsRead(userId: string): Promise<void>;

  getRatingsByUser(userId: string): Promise<Rating[]>;
  createRating(rating: InsertRating): Promise<Rating>;

  // Admin mediation methods
  getLoadsSubmittedToAdmin(): Promise<Load[]>;
  getAdminPostedLoads(): Promise<Load[]>;
  submitLoadToAdmin(loadId: string): Promise<Load | undefined>;
  getAdminDecision(id: string): Promise<AdminDecision | undefined>;
  getAdminDecisionsByLoad(loadId: string): Promise<AdminDecision[]>;
  createAdminDecision(decision: InsertAdminDecision): Promise<AdminDecision>;

  // Admin Pricing & Margin Builder methods
  getPricingTemplates(): Promise<PricingTemplate[]>;
  getPricingTemplate(id: string): Promise<PricingTemplate | undefined>;
  createPricingTemplate(template: InsertPricingTemplate): Promise<PricingTemplate>;
  updatePricingTemplate(id: string, updates: Partial<PricingTemplate>): Promise<PricingTemplate | undefined>;
  deletePricingTemplate(id: string): Promise<boolean>;

  getAdminPricing(id: string): Promise<AdminPricing | undefined>;
  getAdminPricingByLoad(loadId: string): Promise<AdminPricing | undefined>;
  getAdminPricingHistory(loadId: string): Promise<AdminPricing[]>;
  createAdminPricing(pricing: InsertAdminPricing): Promise<AdminPricing>;
  updateAdminPricing(id: string, updates: Partial<AdminPricing>): Promise<AdminPricing | undefined>;
  lockAdminPricing(id: string, finalPrice: string, postMode: string, invitedCarrierIds?: string[]): Promise<AdminPricing | undefined>;
  approveAdminPricing(id: string, approverId: string): Promise<AdminPricing | undefined>;
  rejectAdminPricing(id: string, rejecterId: string, reason: string): Promise<AdminPricing | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return updated;
  }

  async getCarrierProfile(userId: string): Promise<CarrierProfile | undefined> {
    const [profile] = await db.select().from(carrierProfiles).where(eq(carrierProfiles.userId, userId));
    return profile;
  }

  async createCarrierProfile(profile: InsertCarrierProfile): Promise<CarrierProfile> {
    const [newProfile] = await db.insert(carrierProfiles).values(profile).returning();
    return newProfile;
  }

  async updateCarrierProfile(userId: string, updates: Partial<CarrierProfile>): Promise<CarrierProfile | undefined> {
    const [updated] = await db.update(carrierProfiles).set(updates).where(eq(carrierProfiles.userId, userId)).returning();
    return updated;
  }

  async getTruck(id: string): Promise<Truck | undefined> {
    const [truck] = await db.select().from(trucks).where(eq(trucks.id, id));
    return truck;
  }

  async getTrucksByCarrier(carrierId: string): Promise<Truck[]> {
    return db.select().from(trucks).where(eq(trucks.carrierId, carrierId)).orderBy(desc(trucks.createdAt));
  }

  async createTruck(truck: InsertTruck): Promise<Truck> {
    const [newTruck] = await db.insert(trucks).values(truck).returning();
    return newTruck;
  }

  async updateTruck(id: string, updates: Partial<Truck>): Promise<Truck | undefined> {
    const [updated] = await db.update(trucks).set(updates).where(eq(trucks.id, id)).returning();
    return updated;
  }

  async deleteTruck(id: string): Promise<boolean> {
    const result = await db.delete(trucks).where(eq(trucks.id, id));
    return true;
  }

  async getLoad(id: string): Promise<Load | undefined> {
    const [load] = await db.select().from(loads).where(eq(loads.id, id));
    return load;
  }

  async getLoadsByShipper(shipperId: string): Promise<Load[]> {
    return db.select().from(loads).where(eq(loads.shipperId, shipperId)).orderBy(desc(loads.createdAt));
  }

  async getAvailableLoads(): Promise<Load[]> {
    return db.select().from(loads)
      .where(sql`${loads.status} IN ('posted', 'bidding')`)
      .orderBy(desc(loads.createdAt));
  }

  async getAllLoads(): Promise<Load[]> {
    return db.select().from(loads).orderBy(desc(loads.createdAt));
  }

  async createLoad(load: InsertLoad): Promise<Load> {
    const [newLoad] = await db.insert(loads).values(load).returning();
    return newLoad;
  }

  async updateLoad(id: string, updates: Partial<Load>): Promise<Load | undefined> {
    const [updated] = await db.update(loads).set(updates).where(eq(loads.id, id)).returning();
    return updated;
  }

  async getBid(id: string): Promise<Bid | undefined> {
    const [bid] = await db.select().from(bids).where(eq(bids.id, id));
    return bid;
  }

  async getBidsByLoad(loadId: string): Promise<Bid[]> {
    return db.select().from(bids).where(eq(bids.loadId, loadId)).orderBy(desc(bids.createdAt));
  }

  async getBidsByCarrier(carrierId: string): Promise<Bid[]> {
    return db.select().from(bids).where(eq(bids.carrierId, carrierId)).orderBy(desc(bids.createdAt));
  }

  async getAllBids(): Promise<Bid[]> {
    return db.select().from(bids).orderBy(desc(bids.createdAt));
  }

  async createBid(bid: InsertBid): Promise<Bid> {
    const [newBid] = await db.insert(bids).values(bid).returning();
    return newBid;
  }

  async updateBid(id: string, updates: Partial<Bid>): Promise<Bid | undefined> {
    const [updated] = await db.update(bids).set(updates).where(eq(bids.id, id)).returning();
    return updated;
  }

  async getShipment(id: string): Promise<Shipment | undefined> {
    const [shipment] = await db.select().from(shipments).where(eq(shipments.id, id));
    return shipment;
  }

  async getShipmentByLoad(loadId: string): Promise<Shipment | undefined> {
    const [shipment] = await db.select().from(shipments).where(eq(shipments.loadId, loadId));
    return shipment;
  }

  async getShipmentsByCarrier(carrierId: string): Promise<Shipment[]> {
    return db.select().from(shipments).where(eq(shipments.carrierId, carrierId));
  }

  async createShipment(shipment: InsertShipment): Promise<Shipment> {
    const [newShipment] = await db.insert(shipments).values(shipment).returning();
    return newShipment;
  }

  async updateShipment(id: string, updates: Partial<Shipment>): Promise<Shipment | undefined> {
    const [updated] = await db.update(shipments).set(updates).where(eq(shipments.id, id)).returning();
    return updated;
  }

  async getShipmentEvents(shipmentId: string): Promise<ShipmentEvent[]> {
    return db.select().from(shipmentEvents).where(eq(shipmentEvents.shipmentId, shipmentId)).orderBy(desc(shipmentEvents.createdAt));
  }

  async createShipmentEvent(event: InsertShipmentEvent): Promise<ShipmentEvent> {
    const [newEvent] = await db.insert(shipmentEvents).values(event).returning();
    return newEvent;
  }

  async getMessagesByLoad(loadId: string): Promise<Message[]> {
    return db.select().from(messages).where(eq(messages.loadId, loadId)).orderBy(messages.createdAt);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
  }

  async markMessagesAsRead(loadId: string, userId: string): Promise<void> {
    await db.update(messages)
      .set({ isRead: true })
      .where(and(eq(messages.loadId, loadId), eq(messages.receiverId, userId)));
  }

  async getDocumentsByUser(userId: string): Promise<Document[]> {
    return db.select().from(documents).where(eq(documents.userId, userId)).orderBy(desc(documents.createdAt));
  }

  async getDocumentsByLoad(loadId: string): Promise<Document[]> {
    return db.select().from(documents).where(eq(documents.loadId, loadId)).orderBy(desc(documents.createdAt));
  }

  async createDocument(doc: InsertDocument): Promise<Document> {
    const [newDoc] = await db.insert(documents).values(doc).returning();
    return newDoc;
  }

  async deleteDocument(id: string): Promise<boolean> {
    await db.delete(documents).where(eq(documents.id, id));
    return true;
  }

  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async markNotificationAsRead(id: string): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
  }

  async getRatingsByUser(userId: string): Promise<Rating[]> {
    return db.select().from(ratings).where(eq(ratings.ratedUserId, userId)).orderBy(desc(ratings.createdAt));
  }

  async createRating(rating: InsertRating): Promise<Rating> {
    const [newRating] = await db.insert(ratings).values(rating).returning();
    return newRating;
  }

  // Admin mediation methods
  async getLoadsSubmittedToAdmin(): Promise<Load[]> {
    return db.select().from(loads)
      .where(sql`${loads.status} IN ('submitted_to_admin', 'pending_admin_review')`)
      .orderBy(desc(loads.submittedAt));
  }

  async getAdminPostedLoads(): Promise<Load[]> {
    return db.select().from(loads)
      .where(sql`${loads.status} IN ('posted', 'posted_open', 'posted_invite', 'assigned') AND ${loads.adminId} IS NOT NULL`)
      .orderBy(desc(loads.postedAt));
  }

  async submitLoadToAdmin(loadId: string): Promise<Load | undefined> {
    const [updated] = await db.update(loads)
      .set({ 
        status: 'submitted_to_admin',
        submittedAt: new Date()
      })
      .where(eq(loads.id, loadId))
      .returning();
    return updated;
  }

  async getAdminDecision(id: string): Promise<AdminDecision | undefined> {
    const [decision] = await db.select().from(adminDecisions).where(eq(adminDecisions.id, id));
    return decision;
  }

  async getAdminDecisionsByLoad(loadId: string): Promise<AdminDecision[]> {
    return db.select().from(adminDecisions)
      .where(eq(adminDecisions.loadId, loadId))
      .orderBy(desc(adminDecisions.createdAt));
  }

  async createAdminDecision(decision: InsertAdminDecision): Promise<AdminDecision> {
    const [newDecision] = await db.insert(adminDecisions).values(decision).returning();
    return newDecision;
  }

  // Admin Pricing & Margin Builder implementations
  async getPricingTemplates(): Promise<PricingTemplate[]> {
    return db.select().from(pricingTemplates)
      .where(eq(pricingTemplates.isActive, true))
      .orderBy(desc(pricingTemplates.createdAt));
  }

  async getPricingTemplate(id: string): Promise<PricingTemplate | undefined> {
    const [template] = await db.select().from(pricingTemplates).where(eq(pricingTemplates.id, id));
    return template;
  }

  async createPricingTemplate(template: InsertPricingTemplate): Promise<PricingTemplate> {
    const [newTemplate] = await db.insert(pricingTemplates).values(template).returning();
    return newTemplate;
  }

  async updatePricingTemplate(id: string, updates: Partial<PricingTemplate>): Promise<PricingTemplate | undefined> {
    const [updated] = await db.update(pricingTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(pricingTemplates.id, id))
      .returning();
    return updated;
  }

  async deletePricingTemplate(id: string): Promise<boolean> {
    await db.update(pricingTemplates)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(pricingTemplates.id, id));
    return true;
  }

  async getAdminPricing(id: string): Promise<AdminPricing | undefined> {
    const [pricing] = await db.select().from(adminPricings).where(eq(adminPricings.id, id));
    return pricing;
  }

  async getAdminPricingByLoad(loadId: string): Promise<AdminPricing | undefined> {
    const [pricing] = await db.select().from(adminPricings)
      .where(eq(adminPricings.loadId, loadId))
      .orderBy(desc(adminPricings.createdAt));
    return pricing;
  }

  async getAdminPricingHistory(loadId: string): Promise<AdminPricing[]> {
    return db.select().from(adminPricings)
      .where(eq(adminPricings.loadId, loadId))
      .orderBy(desc(adminPricings.createdAt));
  }

  async createAdminPricing(pricing: InsertAdminPricing): Promise<AdminPricing> {
    const [newPricing] = await db.insert(adminPricings).values(pricing).returning();
    return newPricing;
  }

  async updateAdminPricing(id: string, updates: Partial<AdminPricing>): Promise<AdminPricing | undefined> {
    const [updated] = await db.update(adminPricings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(adminPricings.id, id))
      .returning();
    return updated;
  }

  async lockAdminPricing(id: string, finalPrice: string, postMode: string, invitedCarrierIds?: string[]): Promise<AdminPricing | undefined> {
    const [updated] = await db.update(adminPricings)
      .set({ 
        finalPrice,
        postMode,
        invitedCarrierIds: invitedCarrierIds || [],
        status: 'locked',
        updatedAt: new Date()
      })
      .where(eq(adminPricings.id, id))
      .returning();
    return updated;
  }

  async approveAdminPricing(id: string, approverId: string): Promise<AdminPricing | undefined> {
    const [updated] = await db.update(adminPricings)
      .set({ 
        status: 'approved',
        approvedBy: approverId,
        approvedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(adminPricings.id, id))
      .returning();
    return updated;
  }

  async rejectAdminPricing(id: string, rejecterId: string, reason: string): Promise<AdminPricing | undefined> {
    const [updated] = await db.update(adminPricings)
      .set({ 
        status: 'rejected',
        rejectedBy: rejecterId,
        rejectedAt: new Date(),
        rejectionReason: reason,
        updatedAt: new Date()
      })
      .where(eq(adminPricings.id, id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
