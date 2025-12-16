import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import { 
  insertUserSchema, insertLoadSchema, insertTruckSchema, insertBidSchema,
  insertCarrierVerificationSchema, insertCarrierVerificationDocumentSchema, insertBidNegotiationSchema, insertShipperInvoiceResponseSchema
} from "@shared/schema";
import { z } from "zod";
import { 
  getLoadsForRole, 
  checkCarrierEligibility, 
  canUserBidOnLoad, 
  acceptBid, 
  rejectBid,
  transitionLoadState
} from "./workflow-service";
import { setupTelemetryWebSocket } from "./websocket-telemetry";
import {
  getAllVehiclesTelemetry,
  getVehicleTelemetry,
  getEtaPrediction,
  getGpsBreadcrumbs,
  getDriverBehaviorScore,
  checkTelemetryAlerts,
  getActiveVehicleIds,
} from "./telemetry-simulator";

const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "freightflow-secret-key-change-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    })
  );

  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);
      
      const existingUser = await storage.getUserByUsername(data.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }
      
      const existingEmail = await storage.getUserByEmail(data.email);
      if (existingEmail) {
        return res.status(400).json({ error: "Email already exists" });
      }

      const hashedPassword = await hashPassword(data.password);
      const user = await storage.createUser({
        ...data,
        password: hashedPassword,
      });

      if (user.role === "carrier") {
        await storage.createCarrierProfile({
          userId: user.id,
          fleetSize: 0,
          serviceZones: [],
          reliabilityScore: "0",
          communicationScore: "0",
          onTimeScore: "0",
          totalDeliveries: 0,
          badgeLevel: "bronze",
          bio: null,
        });
      }

      req.session.userId = user.id;
      
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Registration error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const hashedPassword = await hashPassword(password);
      if (user.password !== hashedPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      req.session.userId = user.id;
      
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        req.session.destroy(() => {});
        return res.status(401).json({ error: "User not found" });
      }

      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Auth check error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.json({ success: true });
    });
  });

  // GET /api/loads - Role-based load visibility (enforced at API level)
  app.get("/api/loads", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ error: "Unauthorized" });

      // Use workflow service for role-based visibility
      const loadsList = await getLoadsForRole(user);

      const loadsWithBids = await Promise.all(
        loadsList.map(async (load) => {
          const loadBids = await storage.getBidsByLoad(load.id);
          return { ...load, bidCount: loadBids.length };
        })
      );

      res.json(loadsWithBids);
    } catch (error) {
      console.error("Get loads error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/loads", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "shipper") {
        return res.status(403).json({ error: "Only shippers can post loads" });
      }

      const body = { ...req.body };
      if (body.pickupDate && typeof body.pickupDate === 'string') {
        body.pickupDate = new Date(body.pickupDate);
      }
      if (body.deliveryDate && typeof body.deliveryDate === 'string') {
        body.deliveryDate = new Date(body.deliveryDate);
      }

      const data = insertLoadSchema.parse({
        ...body,
        shipperId: user.id,
      });

      const load = await storage.createLoad(data);
      res.json(load);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create load error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/loads/:id", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ error: "Unauthorized" });

      const load = await storage.getLoad(req.params.id);
      if (!load) {
        return res.status(404).json({ error: "Load not found" });
      }
      
      // Admin-as-Mediator: Shippers can only see bids on finalized loads
      const isFinalized = ["assigned", "in_transit", "delivered"].includes(load.status || "");
      const shouldIncludeBids = user.role !== "shipper" || isFinalized;
      
      if (shouldIncludeBids) {
        const loadBids = await storage.getBidsByLoad(load.id);
        res.json({ ...load, bids: loadBids });
      } else {
        // Hide bids and pricing info from shippers pre-finalization
        res.json({ ...load, bids: [], bidCount: 0 });
      }
    } catch (error) {
      console.error("Get load error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /api/loads/:id/history - Get load state change history
  app.get("/api/loads/:id/history", requireAuth, async (req, res) => {
    try {
      const load = await storage.getLoad(req.params.id);
      if (!load) {
        return res.status(404).json({ error: "Load not found" });
      }
      const history = await storage.getLoadStateHistory(req.params.id);
      res.json(history);
    } catch (error) {
      console.error("Get load history error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/loads/:id", requireAuth, async (req, res) => {
    try {
      const body = { ...req.body };
      if (body.pickupDate && typeof body.pickupDate === 'string') {
        body.pickupDate = new Date(body.pickupDate);
      }
      if (body.deliveryDate && typeof body.deliveryDate === 'string') {
        body.deliveryDate = new Date(body.deliveryDate);
      }
      
      const load = await storage.updateLoad(req.params.id, body);
      res.json(load);
    } catch (error) {
      console.error("Update load error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/trucks", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ error: "Unauthorized" });

      const trucksList = await storage.getTrucksByCarrier(user.id);
      res.json(trucksList);
    } catch (error) {
      console.error("Get trucks error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/trucks", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "carrier") {
        return res.status(403).json({ error: "Only carriers can add trucks" });
      }

      const data = insertTruckSchema.parse({
        ...req.body,
        carrierId: user.id,
      });

      const truck = await storage.createTruck(data);
      res.json(truck);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create truck error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/trucks/:id", requireAuth, async (req, res) => {
    try {
      const truck = await storage.updateTruck(req.params.id, req.body);
      res.json(truck);
    } catch (error) {
      console.error("Update truck error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/trucks/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteTruck(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete truck error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/bids", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ error: "Unauthorized" });

      let bidsList;
      if (user.role === "carrier") {
        bidsList = await storage.getBidsByCarrier(user.id);
      } else if (user.role === "shipper") {
        // Admin-as-Mediator: Shippers can only see bids on finalized loads (assigned, in_transit, delivered)
        const shipperLoads = await storage.getLoadsByShipper(user.id);
        const finalizedLoads = shipperLoads.filter(load => 
          ["assigned", "in_transit", "delivered"].includes(load.status || "")
        );
        const allBids = await Promise.all(
          finalizedLoads.map(load => storage.getBidsByLoad(load.id))
        );
        bidsList = allBids.flat();
      } else {
        bidsList = await storage.getAllBids();
      }
      
      const bidsWithDetails = await Promise.all(
        bidsList.map(async (bid) => {
          const carrier = await storage.getUser(bid.carrierId);
          const load = await storage.getLoad(bid.loadId);
          const { password: _, ...carrierWithoutPassword } = carrier || {};
          return { ...bid, carrier: carrierWithoutPassword, load };
        })
      );

      res.json(bidsWithDetails);
    } catch (error) {
      console.error("Get bids error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/loads/:loadId/bids", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ error: "Unauthorized" });

      // Admin-as-Mediator: Shippers cannot access bids on non-finalized loads
      if (user.role === "shipper") {
        const load = await storage.getLoad(req.params.loadId);
        if (load && !["assigned", "in_transit", "delivered"].includes(load.status || "")) {
          return res.json([]); // Return empty array for non-finalized loads
        }
      }

      const bidsList = await storage.getBidsByLoad(req.params.loadId);
      
      const bidsWithCarriers = await Promise.all(
        bidsList.map(async (bid) => {
          const carrier = await storage.getUser(bid.carrierId);
          const { password: _, ...carrierWithoutPassword } = carrier || {};
          return { ...bid, carrier: carrierWithoutPassword };
        })
      );

      res.json(bidsWithCarriers);
    } catch (error) {
      console.error("Get load bids error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/bids", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "carrier") {
        return res.status(403).json({ error: "Only carriers can place bids" });
      }

      const data = insertBidSchema.parse({
        ...req.body,
        carrierId: user.id,
      });

      const bid = await storage.createBid(data);
      
      const load = await storage.getLoad(data.loadId);
      if (load && load.status === "posted") {
        await storage.updateLoad(data.loadId, { status: "bidding" });
      }

      res.json(bid);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create bid error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/bids/:id", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ error: "Unauthorized" });

      const { action, status, reason, counterAmount, notes } = req.body;

      // Use workflow service for bid acceptance (auto-closes other bids + awards load)
      if (action === "accept" || status === "accepted") {
        if (user.role !== "admin") {
          return res.status(403).json({ error: "Only admin can accept bids" });
        }
        const result = await acceptBid(req.params.id, user.id);
        if (!result.success) {
          return res.status(400).json({ error: result.error });
        }
        return res.json(result.bid);
      }

      // Use workflow service for bid rejection
      if (action === "reject" || status === "rejected") {
        if (user.role !== "admin") {
          return res.status(403).json({ error: "Only admin can reject bids" });
        }
        const result = await rejectBid(req.params.id, user.id, reason);
        if (!result.success) {
          return res.status(400).json({ error: result.error });
        }
        return res.json(result.bid);
      }

      // Handle counter offer from admin
      if (action === "counter") {
        if (user.role !== "admin") {
          return res.status(403).json({ error: "Only admin can counter bids" });
        }
        const bid = await storage.getBid(req.params.id);
        if (!bid) {
          return res.status(404).json({ error: "Bid not found" });
        }
        
        // Update bid with counter offer
        const updatedBid = await storage.updateBid(req.params.id, {
          status: "countered",
          notes: notes || `Admin counter: $${counterAmount}`,
        });
        
        // Update load state to counter_received (negotiation active)
        if (bid.loadId) {
          await storage.updateLoad(bid.loadId, { 
            status: "counter_received",
            statusNote: `Admin countered with $${counterAmount}`
          });
        }
        
        return res.json(updatedBid);
      }

      // For other updates, use storage directly
      const bid = await storage.updateBid(req.params.id, req.body);
      res.json(bid);
    } catch (error) {
      console.error("Update bid error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/shipments", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ error: "Unauthorized" });

      const shipmentsList = await storage.getShipmentsByCarrier(user.id);
      res.json(shipmentsList);
    } catch (error) {
      console.error("Get shipments error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const notificationsList = await storage.getNotificationsByUser(req.session.userId!);
      res.json(notificationsList);
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      await storage.markNotificationAsRead(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Mark notification read error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/notifications/read-all", requireAuth, async (req, res) => {
    try {
      await storage.markAllNotificationsAsRead(req.session.userId!);
      res.json({ success: true });
    } catch (error) {
      console.error("Mark all notifications read error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/documents", requireAuth, async (req, res) => {
    try {
      const documentsList = await storage.getDocumentsByUser(req.session.userId!);
      res.json(documentsList);
    } catch (error) {
      console.error("Get documents error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/users", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }
      const usersList = await storage.getAllUsers();
      const usersWithoutPasswords = usersList.map(({ password: _, ...u }) => u);
      res.json(usersWithoutPasswords);
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/carriers", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required - Shippers cannot view carrier directory" });
      }

      const allUsers = await storage.getAllUsers();
      const carriers = allUsers.filter(u => u.role === "carrier");
      
      const carriersWithProfiles = await Promise.all(
        carriers.map(async (carrier) => {
          const profile = await storage.getCarrierProfile(carrier.id);
          const { password: _, ...carrierWithoutPassword } = carrier;
          return { ...carrierWithoutPassword, carrierProfile: profile };
        })
      );

      res.json(carriersWithProfiles);
    } catch (error) {
      console.error("Get carriers error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/messages/:loadId", requireAuth, async (req, res) => {
    try {
      const messagesList = await storage.getMessagesByLoad(req.params.loadId);
      res.json(messagesList);
    } catch (error) {
      console.error("Get messages error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/messages", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ error: "Unauthorized" });

      const message = await storage.createMessage({
        ...req.body,
        senderId: user.id,
      });

      res.json(message);
    } catch (error) {
      console.error("Create message error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Admin routes
  const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    next();
  };

  // Admin: Get platform stats
  app.get("/api/admin/stats", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const allUsers = await storage.getAllUsers();
      const allLoads = await storage.getAllLoads();
      const carriers = allUsers.filter(u => u.role === "carrier");
      const verifiedCarriers = carriers.filter(u => u.isVerified);

      const activeLoads = allLoads.filter(l => 
        ["posted", "bidding", "assigned", "in_transit"].includes(l.status || "")
      );

      const deliveredLoads = allLoads.filter(l => l.status === "delivered");
      const totalVolume = deliveredLoads.reduce((sum, l) => 
        sum + parseFloat(l.finalPrice?.toString() || l.estimatedPrice?.toString() || "0"), 0
      );

      res.json({
        totalUsers: allUsers.length,
        totalShippers: allUsers.filter(u => u.role === "shipper").length,
        totalCarriers: carriers.length,
        verifiedCarriers: verifiedCarriers.length,
        activeLoads: activeLoads.length,
        completedLoads: deliveredLoads.length,
        totalLoads: allLoads.length,
        monthlyVolume: totalVolume,
      });
    } catch (error) {
      console.error("Get admin stats error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Admin: Update user
  app.patch("/api/admin/users/:id", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const updated = await storage.updateUser(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "User not found" });
      }

      const { password: _, ...userWithoutPassword } = updated;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Admin: Create user (for admin to add users manually)
  app.post("/api/admin/users", requireAuth, async (req, res) => {
    try {
      const adminUser = await storage.getUser(req.session.userId!);
      if (!adminUser || adminUser.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const data = insertUserSchema.parse(req.body);
      const hashedPassword = await hashPassword(data.password);
      const newUser = await storage.createUser({
        ...data,
        password: hashedPassword,
      });

      if (newUser.role === "carrier") {
        await storage.createCarrierProfile({
          userId: newUser.id,
          fleetSize: 1,
          serviceZones: [],
          reliabilityScore: "0",
          communicationScore: "0",
          onTimeScore: "0",
          totalDeliveries: 0,
          badgeLevel: "bronze",
          bio: null,
        });
      }

      const { password: _, ...userWithoutPassword } = newUser;
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Admin create user error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Admin: Get all loads with shipper info
  app.get("/api/admin/loads", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const allLoads = await storage.getAllLoads();
      
      const loadsWithDetails = await Promise.all(
        allLoads.map(async (load) => {
          const shipper = await storage.getUser(load.shipperId);
          const carrier = load.assignedCarrierId ? await storage.getUser(load.assignedCarrierId) : null;
          const loadBids = await storage.getBidsByLoad(load.id);
          
          return {
            ...load,
            shipper: shipper ? { username: shipper.username, companyName: shipper.companyName } : null,
            carrier: carrier ? { username: carrier.username, companyName: carrier.companyName } : null,
            bidCount: loadBids.length,
          };
        })
      );

      res.json(loadsWithDetails);
    } catch (error) {
      console.error("Get admin loads error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Admin: Create load
  app.post("/api/admin/loads", requireAuth, async (req, res) => {
    try {
      const adminUser = await storage.getUser(req.session.userId!);
      if (!adminUser || adminUser.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const data = insertLoadSchema.parse(req.body);
      const load = await storage.createLoad(data);
      res.json(load);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Admin create load error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Admin: Update load (with carrier assignment)
  app.patch("/api/admin/loads/:id", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const updated = await storage.updateLoad(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Admin update load error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Admin: Get carriers with profiles
  app.get("/api/admin/carriers", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const allUsers = await storage.getAllUsers();
      const carriers = allUsers.filter(u => u.role === "carrier");
      
      const carriersWithDetails = await Promise.all(
        carriers.map(async (carrier) => {
          const profile = await storage.getCarrierProfile(carrier.id);
          const carrierBids = await storage.getBidsByCarrier(carrier.id);
          const documents = await storage.getDocumentsByUser(carrier.id);
          
          const { password: _, ...carrierWithoutPassword } = carrier;
          return {
            ...carrierWithoutPassword,
            profile,
            bidCount: carrierBids.length,
            documentCount: documents.length,
          };
        })
      );

      res.json(carriersWithDetails);
    } catch (error) {
      console.error("Get admin carriers error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Admin: Verify/unverify carrier
  app.patch("/api/admin/carriers/:id/verify", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { isVerified } = req.body;
      const updated = await storage.updateUser(req.params.id, { isVerified });
      
      if (!updated) {
        return res.status(404).json({ error: "Carrier not found" });
      }

      const { password: _, ...carrierWithoutPassword } = updated;
      res.json(carrierWithoutPassword);
    } catch (error) {
      console.error("Verify carrier error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ============================================
  // TELEMETRY API ROUTES (CAN-Bus / Vehicle Tracking)
  // ============================================

  // Get all active vehicles telemetry
  app.get("/api/telemetry/vehicles", requireAuth, async (req, res) => {
    try {
      const telemetry = getAllVehiclesTelemetry();
      res.json(telemetry);
    } catch (error) {
      console.error("Get telemetry error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get single vehicle telemetry
  app.get("/api/telemetry/vehicles/:vehicleId", requireAuth, async (req, res) => {
    try {
      const telemetry = getVehicleTelemetry(req.params.vehicleId);
      if (!telemetry) {
        return res.status(404).json({ error: "Vehicle not found" });
      }
      res.json(telemetry);
    } catch (error) {
      console.error("Get vehicle telemetry error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get vehicle list
  app.get("/api/telemetry/vehicle-ids", requireAuth, async (req, res) => {
    try {
      const vehicleIds = getActiveVehicleIds();
      res.json(vehicleIds);
    } catch (error) {
      console.error("Get vehicle IDs error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get ETA prediction for a load
  app.get("/api/telemetry/eta/:loadId", requireAuth, async (req, res) => {
    try {
      const eta = getEtaPrediction(req.params.loadId);
      if (!eta) {
        return res.status(404).json({ error: "Load not found or not in transit" });
      }
      res.json(eta);
    } catch (error) {
      console.error("Get ETA error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get GPS breadcrumbs for a vehicle
  app.get("/api/telemetry/breadcrumbs/:vehicleId", requireAuth, async (req, res) => {
    try {
      const minutes = parseInt(req.query.minutes as string) || 10;
      const breadcrumbs = getGpsBreadcrumbs(req.params.vehicleId, minutes);
      res.json(breadcrumbs);
    } catch (error) {
      console.error("Get breadcrumbs error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get driver behavior score
  app.get("/api/telemetry/driver-behavior/:driverId", requireAuth, async (req, res) => {
    try {
      const behavior = getDriverBehaviorScore(req.params.driverId);
      res.json(behavior);
    } catch (error) {
      console.error("Get driver behavior error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get all current alerts (must be before /:vehicleId route)
  app.get("/api/telemetry/alerts", requireAuth, async (req, res) => {
    try {
      const allTelemetry = getAllVehiclesTelemetry();
      const allAlerts = allTelemetry.flatMap(t => {
        const alerts = checkTelemetryAlerts(t);
        return alerts.map(alert => ({
          vehicleId: t.vehicleId,
          loadId: t.loadId,
          driverId: t.driverId,
          alert,
          timestamp: new Date().toISOString(),
        }));
      });
      res.json(allAlerts);
    } catch (error) {
      console.error("Get all alerts error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get alerts for a specific vehicle
  app.get("/api/telemetry/alerts/:vehicleId", requireAuth, async (req, res) => {
    try {
      const telemetry = getVehicleTelemetry(req.params.vehicleId);
      if (!telemetry) {
        return res.status(404).json({ error: "Vehicle not found" });
      }
      const alerts = checkTelemetryAlerts(telemetry);
      res.json(alerts);
    } catch (error) {
      console.error("Get alerts error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ==========================================
  // ADMIN-AS-MEDIATOR FLOW ENDPOINTS
  // ==========================================

  // Shipper submits load to Admin for pricing (no rate required)
  app.post("/api/loads/submit", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "shipper") {
        return res.status(403).json({ error: "Only shippers can submit loads" });
      }

      const body = { ...req.body };
      if (body.pickupDate && typeof body.pickupDate === 'string') {
        body.pickupDate = new Date(body.pickupDate);
      }
      if (body.deliveryDate && typeof body.deliveryDate === 'string') {
        body.deliveryDate = new Date(body.deliveryDate);
      }

      const data = insertLoadSchema.parse({
        ...body,
        shipperId: user.id,
        status: 'submitted_to_admin',
        submittedAt: new Date(),
      });

      const load = await storage.createLoad(data);

      // Create notification for admins
      const admins = (await storage.getAllUsers()).filter(u => u.role === 'admin');
      for (const admin of admins) {
        await storage.createNotification({
          userId: admin.id,
          title: "New Load Submitted",
          message: `${user.companyName || user.username} submitted a new load from ${load.pickupCity} to ${load.dropoffCity}`,
          type: "info",
          relatedLoadId: load.id,
        });
      }

      res.json({ load_id: load.id, status: 'submitted_to_admin' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Submit load error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Admin queue - list loads pending admin review
  app.get("/api/admin/queue", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const pendingLoads = await storage.getLoadsSubmittedToAdmin();
      
      // Enrich with shipper info
      const enrichedLoads = await Promise.all(
        pendingLoads.map(async (load) => {
          const shipper = await storage.getUser(load.shipperId);
          return {
            ...load,
            shipperName: shipper?.companyName || shipper?.username,
            shipperEmail: shipper?.email,
          };
        })
      );

      res.json(enrichedLoads);
    } catch (error) {
      console.error("Get admin queue error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Admin prices and posts a load
  app.post("/api/admin/price", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { load_id, suggested_price, final_price, post_mode, invite_carrier_ids, comment, allow_counter_bids } = req.body;

      if (!load_id || !final_price || !post_mode) {
        return res.status(400).json({ error: "load_id, final_price, and post_mode are required" });
      }

      const load = await storage.getLoad(load_id);
      if (!load) {
        return res.status(404).json({ error: "Load not found" });
      }

      // Create admin decision record (immutable audit trail)
      const decision = await storage.createAdminDecision({
        loadId: load_id,
        adminId: user.id,
        suggestedPrice: suggested_price || final_price,
        finalPrice: final_price,
        postingMode: post_mode,
        invitedCarrierIds: invite_carrier_ids || null,
        comment: comment || null,
        pricingBreakdown: req.body.pricing_breakdown || null,
        actionType: 'price_and_post',
      });

      // Determine status based on post mode - Use canonical lifecycle states
      // posted_to_carriers = visible to carriers, open_for_bid = active bidding
      let newStatus = 'posted_to_carriers';
      if (post_mode === 'assign') {
        newStatus = 'awarded'; // Direct assignment skips bidding
      }

      // NOTE: Invoice is NOT created here per Admin-as-Mediator workflow
      // Invoice is only generated AFTER carrier is finalized (awarded state)
      // This happens in acceptBid() workflow service or when admin transitions to invoice_sent

      // Update load with admin pricing
      const updatedLoad = await storage.updateLoad(load_id, {
        adminSuggestedPrice: suggested_price || final_price,
        adminFinalPrice: final_price,
        adminPostMode: post_mode,
        adminId: user.id,
        adminDecisionId: decision.id,
        invitedCarrierIds: invite_carrier_ids || null,
        allowCounterBids: allow_counter_bids || false,
        status: newStatus,
        postedAt: new Date(),
      });

      // Notify shipper
      await storage.createNotification({
        userId: load.shipperId,
        title: "Load Posted by Admin",
        message: `Your load from ${load.pickupCity} to ${load.dropoffCity} has been priced at Rs. ${final_price} and posted to carriers.`,
        type: "success",
        relatedLoadId: load_id,
      });

      // If invite mode, notify invited carriers
      if (post_mode === 'invite' && invite_carrier_ids?.length > 0) {
        for (const carrierId of invite_carrier_ids) {
          await storage.createNotification({
            userId: carrierId,
            title: "Invited to Bid on Load",
            message: `You have been invited to bid on a load from ${load.pickupCity} to ${load.dropoffCity}`,
            type: "info",
            relatedLoadId: load_id,
          });
        }
      }

      res.json({ 
        success: true, 
        load: updatedLoad, 
        decision_id: decision.id,
        status: newStatus,
        message: "Load priced and posted to carriers. Invoice will be generated after carrier is finalized."
      });
    } catch (error) {
      console.error("Admin price error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get admin decision history for a load
  app.get("/api/admin/audit/:loadId", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const decisions = await storage.getAdminDecisionsByLoad(req.params.loadId);
      
      // Enrich with admin info
      const enrichedDecisions = await Promise.all(
        decisions.map(async (decision) => {
          const admin = await storage.getUser(decision.adminId);
          return {
            ...decision,
            adminName: admin?.username,
            adminEmail: admin?.email,
          };
        })
      );

      res.json(enrichedDecisions);
    } catch (error) {
      console.error("Get audit error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ============================
  // ADMIN NEGOTIATION CHAT ROUTES
  // ============================

  // Get all negotiation threads with load details
  app.get("/api/admin/negotiations", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      // Get loads that are in negotiation states (including awarded for post-acceptance invoice flow)
      const negotiableStatuses = ["posted_to_carriers", "open_for_bid", "counter_received", "awarded", "open_for_bids"];
      const loads = await storage.getLoadsByStatuses(negotiableStatuses as any);
      
      // Enrich with negotiation thread data
      const enrichedLoads = await Promise.all(
        loads.map(async (load) => {
          const thread = await storage.getOrCreateNegotiationThread(load.id);
          const shipper = await storage.getUser(load.shipperId);
          const bids = await storage.getBidsByLoad(load.id);
          const messages = await storage.getBidNegotiationsByLoad(load.id);
          
          return {
            ...load,
            shipperName: shipper?.companyName || shipper?.username,
            shipperEmail: shipper?.email,
            thread,
            bidCount: bids.length,
            messageCount: messages.length,
            latestActivity: messages.length > 0 
              ? messages[messages.length - 1].createdAt 
              : thread.lastActivityAt,
          };
        })
      );

      // Get counters for dashboard
      const counters = await storage.getNegotiationCounters();

      res.json({ loads: enrichedLoads, counters });
    } catch (error) {
      console.error("Get negotiations error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get negotiation thread and messages for a specific load
  app.get("/api/admin/negotiations/:loadId", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { loadId } = req.params;
      const load = await storage.getLoad(loadId);
      if (!load) {
        return res.status(404).json({ error: "Load not found" });
      }

      const thread = await storage.getOrCreateNegotiationThread(loadId);
      const messages = await storage.getBidNegotiationsByLoad(loadId);
      const bids = await storage.getBidsByLoad(loadId);
      const shipper = await storage.getUser(load.shipperId);

      // Enrich bids with carrier info
      const enrichedBids = await Promise.all(
        bids.map(async (bid) => {
          const carrier = await storage.getUser(bid.carrierId);
          return {
            ...bid,
            carrierName: carrier?.companyName || carrier?.username,
            carrierEmail: carrier?.email,
          };
        })
      );

      res.json({
        load: {
          ...load,
          shipperName: shipper?.companyName || shipper?.username,
        },
        thread,
        messages,
        bids: enrichedBids,
      });
    } catch (error) {
      console.error("Get negotiation thread error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Admin sends counter-offer in negotiation
  app.post("/api/admin/negotiations/:loadId/counter", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { loadId } = req.params;
      const counterSchema = z.object({
        bidId: z.string(),
        counterAmount: z.string(),
        message: z.string().optional(),
      });

      const { bidId, counterAmount, message } = counterSchema.parse(req.body);

      const load = await storage.getLoad(loadId);
      if (!load) {
        return res.status(404).json({ error: "Load not found" });
      }

      const bid = await storage.getBid(bidId);
      if (!bid) {
        return res.status(404).json({ error: "Bid not found" });
      }

      // Update bid with counter amount
      await storage.updateBid(bidId, { 
        counterAmount,
        status: "countered",
      });

      // Create negotiation message
      const negotiationMessage = await storage.createBidNegotiation({
        bidId,
        loadId,
        senderId: user.id,
        senderRole: "admin",
        messageType: "admin_counter",
        message: message || `Counter offer: Rs. ${Number(counterAmount).toLocaleString('en-IN')}`,
        amount: counterAmount,
        previousAmount: bid.amount,
        carrierName: null,
        isSimulated: false,
      });

      // Update thread status
      await storage.updateNegotiationThread(loadId, {
        status: "counter_sent",
        pendingCounters: 1,
        lastActivityAt: new Date(),
      });

      // Update load status to counter_received
      await storage.updateLoad(loadId, { status: "counter_received" });

      // Notify carrier
      await storage.createNotification({
        userId: bid.carrierId,
        title: "Counter Offer Received",
        message: `Admin has countered your bid with Rs. ${Number(counterAmount).toLocaleString('en-IN')}`,
        type: "warning",
        relatedLoadId: loadId,
        contextType: "counter_offer",
      });

      res.json({ success: true, message: negotiationMessage });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Counter offer error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Admin accepts a bid in negotiation
  app.post("/api/admin/negotiations/:loadId/accept", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { loadId } = req.params;
      const acceptSchema = z.object({
        bidId: z.string(),
      });

      const { bidId } = acceptSchema.parse(req.body);

      const load = await storage.getLoad(loadId);
      if (!load) {
        return res.status(404).json({ error: "Load not found" });
      }

      const bid = await storage.getBid(bidId);
      if (!bid) {
        return res.status(404).json({ error: "Bid not found" });
      }

      // Accept the winning bid
      await storage.updateBid(bidId, { status: "accepted" });

      // Reject all other bids for this load
      const allBids = await storage.getBidsByLoad(loadId);
      for (const otherBid of allBids) {
        if (otherBid.id !== bidId && otherBid.status !== "rejected") {
          await storage.updateBid(otherBid.id, { status: "rejected" });
          // Notify rejected carriers
          await storage.createNotification({
            userId: otherBid.carrierId,
            title: "Bid Not Selected",
            message: `Another carrier was selected for the load from ${load.pickupCity} to ${load.dropoffCity}`,
            type: "info",
            relatedLoadId: loadId,
          });
        }
      }

      // Get the final amount (counter amount if exists, otherwise original bid)
      const finalAmount = bid.counterAmount || bid.amount;

      // Create acceptance message in chat
      const carrier = await storage.getUser(bid.carrierId);
      await storage.createBidNegotiation({
        bidId,
        loadId,
        senderId: user.id,
        senderRole: "system",
        messageType: "admin_accept",
        message: `Carrier finalized at Rs. ${Number(finalAmount).toLocaleString('en-IN')}`,
        amount: finalAmount,
        carrierName: carrier?.companyName || carrier?.username,
        isSimulated: false,
      });

      // Update thread to accepted
      await storage.acceptBidInThread(loadId, bidId, bid.carrierId, finalAmount);

      // Update load status to awarded (CARRIER_FINALIZED)
      await storage.updateLoad(loadId, { 
        status: "awarded",
        assignedCarrierId: bid.carrierId,
        finalPrice: finalAmount,
        awardedBidId: bidId,
      });

      // Notify winning carrier
      await storage.createNotification({
        userId: bid.carrierId,
        title: "Bid Accepted!",
        message: `Your bid for load from ${load.pickupCity} to ${load.dropoffCity} has been accepted at Rs. ${Number(finalAmount).toLocaleString('en-IN')}`,
        type: "success",
        relatedLoadId: loadId,
      });

      // Notify shipper
      await storage.createNotification({
        userId: load.shipperId,
        title: "Carrier Assigned",
        message: `A carrier has been assigned for your load from ${load.pickupCity} to ${load.dropoffCity}`,
        type: "success",
        relatedLoadId: loadId,
      });

      res.json({ 
        success: true, 
        message: "Bid accepted and carrier finalized",
        finalAmount,
        carrierId: bid.carrierId,
        carrierName: carrier?.companyName || carrier?.username,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Accept bid error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Admin rejects a bid in negotiation
  app.post("/api/admin/negotiations/:loadId/reject", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { loadId } = req.params;
      const rejectSchema = z.object({
        bidId: z.string(),
        reason: z.string().optional(),
      });

      const { bidId, reason } = rejectSchema.parse(req.body);

      const bid = await storage.getBid(bidId);
      if (!bid) {
        return res.status(404).json({ error: "Bid not found" });
      }

      const load = await storage.getLoad(loadId);

      // Reject the bid
      await storage.updateBid(bidId, { status: "rejected" });

      // Create rejection message in chat
      await storage.createBidNegotiation({
        bidId,
        loadId,
        senderId: user.id,
        senderRole: "admin",
        messageType: "admin_reject",
        message: reason || "Bid rejected by admin",
        amount: bid.amount,
        isSimulated: false,
      });

      // Notify carrier
      await storage.createNotification({
        userId: bid.carrierId,
        title: "Bid Rejected",
        message: reason || `Your bid for load from ${load?.pickupCity} to ${load?.dropoffCity} was not accepted`,
        type: "warning",
        relatedLoadId: loadId,
      });

      res.json({ success: true, message: "Bid rejected" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Reject bid error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Generate simulated bid for a load
  app.post("/api/admin/negotiations/:loadId/simulate", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { loadId } = req.params;
      const load = await storage.getLoad(loadId);
      if (!load) {
        return res.status(404).json({ error: "Load not found" });
      }

      // Generate simulated carrier names
      const simulatedCarrierNames = [
        "Swift Logistics",
        "Premium Freight Co",
        "Highway Express",
        "National Transport",
        "Metro Carriers",
        "Rapid Delivery",
        "Elite Trucking",
        "Prime Movers",
      ];

      const carrierName = simulatedCarrierNames[Math.floor(Math.random() * simulatedCarrierNames.length)];
      
      // Generate realistic bid amount based on admin price
      const basePrice = Number(load.adminFinalPrice) || 50000;
      const variance = 0.1 + Math.random() * 0.15; // 10-25% variance
      const bidAmount = Math.round(basePrice * (1 - variance));

      // Create simulated bid message
      const message = await storage.createBidNegotiation({
        loadId,
        senderRole: "carrier",
        messageType: "simulated_bid",
        message: `Bid placed: Rs. ${bidAmount.toLocaleString('en-IN')}`,
        amount: bidAmount.toString(),
        isSimulated: true,
        simulatedCarrierName: carrierName,
        carrierType: Math.random() > 0.5 ? "enterprise" : "solo",
      });

      // Update thread bid count
      await storage.incrementThreadBidCount(loadId, true);

      res.json({ success: true, message, carrierName, bidAmount });
    } catch (error) {
      console.error("Simulate bid error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get negotiation counters for dashboard
  app.get("/api/admin/negotiations/counters", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const counters = await storage.getNegotiationCounters();
      res.json(counters);
    } catch (error) {
      console.error("Get counters error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get admin-posted loads for carriers (with eligibility filters)
  app.get("/api/carrier/loads", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "carrier") {
        return res.status(403).json({ error: "Carrier access required" });
      }

      const adminPostedLoads = await storage.getAdminPostedLoads();
      
      // Apply full carrier eligibility checks from workflow service
      const eligibleLoads: typeof adminPostedLoads = [];
      for (const load of adminPostedLoads) {
        const eligibility = await checkCarrierEligibility(user.id, load);
        if (eligibility.eligible) {
          eligibleLoads.push(load);
        }
      }

      const enrichedLoads = await Promise.all(
        eligibleLoads.map(async (load) => {
          const shipper = await storage.getUser(load.shipperId);
          const loadBids = await storage.getBidsByLoad(load.id);
          const myBid = loadBids.find(b => b.carrierId === user.id);
          return {
            ...load,
            shipperName: shipper?.companyName || shipper?.username,
            bidCount: loadBids.length,
            myBid: myBid || null,
            postedByAdmin: true,
            priceFixed: !load.allowCounterBids,
          };
        })
      );

      res.json(enrichedLoads);
    } catch (error) {
      console.error("Get carrier loads error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Solo carrier available loads - same as enterprise loads (with eligibility filters)
  app.get("/api/carrier/available-loads", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "carrier") {
        return res.status(403).json({ error: "Carrier access required" });
      }

      const adminPostedLoads = await storage.getAdminPostedLoads();
      
      // Apply full carrier eligibility checks from workflow service
      const eligibleLoads: typeof adminPostedLoads = [];
      for (const load of adminPostedLoads) {
        const eligibility = await checkCarrierEligibility(user.id, load);
        if (eligibility.eligible) {
          eligibleLoads.push(load);
        }
      }

      const enrichedLoads = await Promise.all(
        eligibleLoads.map(async (load) => {
          const shipper = await storage.getUser(load.shipperId);
          const loadBids = await storage.getBidsByLoad(load.id);
          const myBid = loadBids.find(b => b.carrierId === user.id);
          return {
            ...load,
            shipperName: shipper?.companyName || shipper?.username,
            bidCount: loadBids.length,
            myBid: myBid || null,
            postedByAdmin: true,
            priceFixed: !load.allowCounterBids,
          };
        })
      );

      res.json(enrichedLoads);
    } catch (error) {
      console.error("Get carrier available loads error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Carrier accepts admin price or submits counter bid
  app.post("/api/bids/submit", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "carrier") {
        return res.status(403).json({ error: "Only carriers can submit bids" });
      }

      const { load_id, amount, bid_type, notes, truck_id, carrier_type } = req.body;

      const load = await storage.getLoad(load_id);
      if (!load) {
        return res.status(404).json({ error: "Load not found" });
      }

      // Use workflow service to check carrier eligibility
      const canBid = await canUserBidOnLoad(user.id, load_id);
      if (!canBid.allowed) {
        return res.status(403).json({ error: canBid.reason });
      }

      // Check if load allows counter bids
      if (bid_type === 'counter' && !load.allowCounterBids) {
        return res.status(403).json({ error: "Counter bids not allowed for this load" });
      }

      // Determine bid type and amount
      let finalBidType = bid_type || 'carrier_bid';
      let finalAmount = amount;

      if (bid_type === 'admin_posted_acceptance') {
        finalAmount = load.adminFinalPrice;
        finalBidType = 'admin_posted_acceptance';
      }

      // Get carrier type from request or default to enterprise
      const finalCarrierType = carrier_type || 'enterprise';

      const bid = await storage.createBid({
        loadId: load_id,
        carrierId: user.id,
        truckId: truck_id || null,
        amount: finalAmount,
        notes: notes || null,
        status: 'pending',
        bidType: finalBidType,
        carrierType: finalCarrierType,
        adminMediated: !!load.adminId,
        approvalRequired: bid_type === 'counter',
      });

      // Update load status based on bid type - use canonical states
      if (bid_type === 'counter') {
        // Counter-bid submitted, needs admin review
        await storage.updateLoad(load_id, {
          status: 'counter_received',
          previousStatus: load.status,
          statusChangedAt: new Date(),
        });
      } else if (bid_type === 'admin_posted_acceptance') {
        // First acceptance - move to bidding phase (admin will finalize)
        if (load.status === 'posted_to_carriers') {
          await storage.updateLoad(load_id, {
            status: 'open_for_bid',
            previousStatus: load.status,
            openForBidAt: new Date(),
            statusChangedAt: new Date(),
          });
        }
      }

      // Notify shipper and admin
      if (load.shipperId) {
        await storage.createNotification({
          userId: load.shipperId,
          title: bid_type === 'admin_posted_acceptance' ? "Carrier Accepted Your Load" : "New Bid Received",
          message: `${user.companyName || user.username} ${bid_type === 'admin_posted_acceptance' ? 'accepted' : 'submitted a bid for'} your load`,
          type: "info",
          relatedLoadId: load_id,
          relatedBidId: bid.id,
        });
      }

      if (load.adminId) {
        await storage.createNotification({
          userId: load.adminId,
          title: bid_type === 'admin_posted_acceptance' ? "Carrier Accepted Admin Price" : "Carrier Counter Bid",
          message: `${user.companyName || user.username} ${bid_type === 'admin_posted_acceptance' ? 'accepted the admin price' : `countered with Rs. ${amount}`}`,
          type: "info",
          relatedLoadId: load_id,
          relatedBidId: bid.id,
        });
      }

      res.json({ success: true, bid });
    } catch (error) {
      console.error("Submit bid error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Admin force-assigns carrier to load
  app.post("/api/admin/assign", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { load_id, carrier_id, truck_id, final_price } = req.body;

      const load = await storage.getLoad(load_id);
      if (!load) {
        return res.status(404).json({ error: "Load not found" });
      }

      const carrier = await storage.getUser(carrier_id);
      if (!carrier || carrier.role !== 'carrier') {
        return res.status(404).json({ error: "Carrier not found" });
      }

      // Create admin decision for assignment
      const decision = await storage.createAdminDecision({
        loadId: load_id,
        adminId: user.id,
        suggestedPrice: load.adminSuggestedPrice || final_price,
        finalPrice: final_price || load.adminFinalPrice || "0",
        postingMode: 'assign',
        comment: `Direct assignment to ${carrier.companyName || carrier.username}`,
        actionType: 'assign',
      });

      // Update load with canonical awarded status
      const updatedLoad = await storage.updateLoad(load_id, {
        assignedCarrierId: carrier_id,
        assignedTruckId: truck_id || null,
        adminDecisionId: decision.id,
        status: 'awarded',
        previousStatus: load.status,
        adminPostMode: 'assign',
        awardedAt: new Date(),
        statusChangedAt: new Date(),
        statusChangedBy: user.id,
      });

      // Create order/shipment
      const shipment = await storage.createShipment({
        loadId: load_id,
        carrierId: carrier_id,
        truckId: truck_id || null,
        status: 'pickup_scheduled',
      });

      // Notify carrier
      await storage.createNotification({
        userId: carrier_id,
        title: "Load Assigned to You",
        message: `You have been assigned a load from ${load.pickupCity} to ${load.dropoffCity}`,
        type: "success",
        relatedLoadId: load_id,
      });

      // Notify shipper
      await storage.createNotification({
        userId: load.shipperId,
        title: "Carrier Assigned",
        message: `${carrier.companyName || carrier.username} has been assigned to your load`,
        type: "success",
        relatedLoadId: load_id,
      });

      res.json({ success: true, load: updatedLoad, shipment, decision_id: decision.id });
    } catch (error) {
      console.error("Admin assign error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Admin awards a bid to a carrier
  app.post("/api/admin/award-bid", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { bid_id, truck_id } = req.body;

      const bid = await storage.getBid(bid_id);
      if (!bid) {
        return res.status(404).json({ error: "Bid not found" });
      }

      const load = await storage.getLoad(bid.loadId);
      if (!load) {
        return res.status(404).json({ error: "Load not found" });
      }

      const carrier = await storage.getUser(bid.carrierId);
      if (!carrier) {
        return res.status(404).json({ error: "Carrier not found" });
      }

      // Update bid to accepted
      await storage.updateBid(bid_id, {
        status: 'accepted',
      });

      // Reject all other bids for this load
      const allBids = await storage.getBidsByLoad(bid.loadId);
      for (const otherBid of allBids) {
        if (otherBid.id !== bid_id && otherBid.status === 'pending') {
          await storage.updateBid(otherBid.id, { status: 'rejected' });
        }
      }

      // Update load to awarded status
      const updatedLoad = await storage.updateLoad(bid.loadId, {
        assignedCarrierId: bid.carrierId,
        assignedTruckId: truck_id || bid.truckId || null,
        awardedBidId: bid_id,
        status: 'awarded',
        previousStatus: load.status,
        awardedAt: new Date(),
        biddingClosedAt: new Date(),
        finalPrice: bid.amount,
        statusChangedAt: new Date(),
        statusChangedBy: user.id,
      });

      // Create shipment
      const shipment = await storage.createShipment({
        loadId: bid.loadId,
        carrierId: bid.carrierId,
        truckId: truck_id || bid.truckId || null,
        status: 'pickup_scheduled',
      });

      // Notify carrier
      await storage.createNotification({
        userId: bid.carrierId,
        title: "Bid Accepted",
        message: `Your bid for the load from ${load.pickupCity} to ${load.dropoffCity} has been accepted`,
        type: "success",
        relatedLoadId: bid.loadId,
        relatedBidId: bid_id,
      });

      // Notify shipper
      await storage.createNotification({
        userId: load.shipperId,
        title: "Carrier Selected",
        message: `${carrier.companyName || carrier.username} has been awarded your load`,
        type: "success",
        relatedLoadId: bid.loadId,
      });

      res.json({ success: true, load: updatedLoad, shipment, bid });
    } catch (error) {
      console.error("Admin award bid error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Admin handles counter-offer (accept/reject/re-counter)
  app.post("/api/admin/counter-response", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { bid_id, action, counter_amount, notes } = req.body;

      const bid = await storage.getBid(bid_id);
      if (!bid) {
        return res.status(404).json({ error: "Bid not found" });
      }

      const load = await storage.getLoad(bid.loadId);
      if (!load) {
        return res.status(404).json({ error: "Load not found" });
      }

      const carrier = await storage.getUser(bid.carrierId);
      if (!carrier) {
        return res.status(404).json({ error: "Carrier not found" });
      }

      if (action === 'accept') {
        // Accept the counter-offer - award the load
        await storage.updateBid(bid_id, { status: 'accepted' });

        const updatedLoad = await storage.updateLoad(bid.loadId, {
          assignedCarrierId: bid.carrierId,
          awardedBidId: bid_id,
          status: 'awarded',
          previousStatus: load.status,
          awardedAt: new Date(),
          finalPrice: bid.amount,
          statusChangedAt: new Date(),
          statusChangedBy: user.id,
        });

        await storage.createNotification({
          userId: bid.carrierId,
          title: "Counter-Offer Accepted",
          message: `Your counter-offer of Rs. ${bid.amount} has been accepted`,
          type: "success",
          relatedLoadId: bid.loadId,
          relatedBidId: bid_id,
        });

        res.json({ success: true, action: 'accepted', load: updatedLoad });
      } else if (action === 'reject') {
        // Reject the counter-offer
        await storage.updateBid(bid_id, { status: 'rejected' });

        // Check if there are other pending bids
        const allBids = await storage.getBidsByLoad(bid.loadId);
        const hasOtherPendingBids = allBids.some(b => b.id !== bid_id && b.status === 'pending');

        // Update load status back to open_for_bid if no other pending counter-offers
        if (!hasOtherPendingBids) {
          await storage.updateLoad(bid.loadId, {
            status: 'open_for_bid',
            previousStatus: load.status,
            statusChangedAt: new Date(),
          });
        }

        await storage.createNotification({
          userId: bid.carrierId,
          title: "Counter-Offer Rejected",
          message: `Your counter-offer for the ${load.pickupCity} to ${load.dropoffCity} load was not accepted`,
          type: "warning",
          relatedLoadId: bid.loadId,
          relatedBidId: bid_id,
        });

        res.json({ success: true, action: 'rejected' });
      } else if (action === 're-counter') {
        // Admin submits a re-counter offer
        await storage.updateBid(bid_id, { 
          status: 'countered',
          counterAmount: counter_amount,
        });

        // Create a new bid from admin perspective
        const adminBid = await storage.createBid({
          loadId: bid.loadId,
          carrierId: bid.carrierId, // Reference the original carrier
          amount: counter_amount,
          notes: notes || `Admin re-counter offer`,
          status: 'pending',
          bidType: 'admin_counter',
          adminMediated: true,
        });

        await storage.updateLoad(bid.loadId, {
          status: 'open_for_bid',
          previousStatus: load.status,
          statusChangedAt: new Date(),
        });

        await storage.createNotification({
          userId: bid.carrierId,
          title: "Admin Counter-Offer",
          message: `Admin has countered with Rs. ${counter_amount} for the ${load.pickupCity} to ${load.dropoffCity} load`,
          type: "info",
          relatedLoadId: bid.loadId,
          relatedBidId: adminBid.id,
        });

        res.json({ success: true, action: 're-countered', bid: adminBid });
      } else {
        return res.status(400).json({ error: "Invalid action. Use 'accept', 'reject', or 're-counter'" });
      }
    } catch (error) {
      console.error("Admin counter response error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Pricing estimation helper (auto-suggest price)
  app.post("/api/admin/estimate-price", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { distance, weight, load_type, pickup_city, dropoff_city } = req.body;

      // Pricing algorithm
      const baseRates: Record<string, number> = {
        'flatbed': 45,
        'refrigerated': 65,
        'dry_van': 40,
        'tanker': 55,
        'container': 50,
        'open_deck': 35,
        'default': 42,
      };

      const baseRate = baseRates[load_type?.toLowerCase()] || baseRates['default'];
      const distanceKm = parseFloat(distance) || 500;
      const weightTons = parseFloat(weight) || 10;

      // Base calculation: distance * rate
      let suggestedPrice = distanceKm * baseRate;

      // Weight adjustment (+2% per ton above 5 tons)
      if (weightTons > 5) {
        suggestedPrice *= (1 + (weightTons - 5) * 0.02);
      }

      // Fuel surcharge (estimated 12%)
      const fuelSurcharge = suggestedPrice * 0.12;

      // Admin margin (8%)
      const adminMargin = suggestedPrice * 0.08;

      // Handling fee
      const handlingFee = 500;

      const totalPrice = Math.round(suggestedPrice + fuelSurcharge + adminMargin + handlingFee);

      res.json({
        suggested_price: totalPrice,
        breakdown: {
          base_amount: Math.round(suggestedPrice),
          fuel_surcharge: Math.round(fuelSurcharge),
          admin_margin: Math.round(adminMargin),
          handling_fee: handlingFee,
        },
        params: {
          distance_km: distanceKm,
          weight_tons: weightTons,
          load_type: load_type || 'default',
          base_rate_per_km: baseRate,
        }
      });
    } catch (error) {
      console.error("Estimate price error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ============================================
  // Admin Pricing & Margin Builder Routes
  // ============================================

  // Pricing coefficients (configurable)
  const PRICING_CONFIG = {
    baseRates: {
      'flatbed': 45,
      'refrigerated': 65,
      'dry_van': 40,
      'tanker': 55,
      'container': 50,
      'open_deck': 35,
      'default': 42,
    } as Record<string, number>,
    fuelSurchargePercent: 12,
    defaultPlatformRate: 10,
    handlingFee: 500,
    approvalThresholdPercent: 15, // If admin price differs from suggested by > 15%, require approval
    seasonalMultipliers: {
      'jan': 1.0, 'feb': 1.0, 'mar': 1.05, 'apr': 1.05,
      'may': 1.1, 'jun': 1.1, 'jul': 1.15, 'aug': 1.1,
      'sep': 1.05, 'oct': 1.1, 'nov': 1.15, 'dec': 1.2,
    } as Record<string, number>,
    regionMultipliers: {
      'north': 1.0, 'south': 0.95, 'east': 1.02, 'west': 1.05, 'central': 1.0,
    } as Record<string, number>,
  };

  // Helper function for price calculation
  const calculatePricing = (params: {
    distance: number;
    weight: number;
    loadType?: string;
    region?: string;
    pickupDate?: Date;
  }) => {
    const { distance, weight, loadType, region, pickupDate } = params;
    const baseRate = PRICING_CONFIG.baseRates[loadType?.toLowerCase() || 'default'] || PRICING_CONFIG.baseRates['default'];
    
    // Base calculation
    let baseAmount = distance * baseRate;
    
    // Weight adjustment (+2% per ton above 5 tons)
    if (weight > 5) {
      baseAmount *= (1 + (weight - 5) * 0.02);
    }
    
    // Seasonal multiplier
    const month = (pickupDate || new Date()).toLocaleString('en-US', { month: 'short' }).toLowerCase();
    const seasonalMultiplier = PRICING_CONFIG.seasonalMultipliers[month] || 1.0;
    baseAmount *= seasonalMultiplier;
    
    // Region multiplier
    const regionMultiplier = PRICING_CONFIG.regionMultipliers[region?.toLowerCase() || 'central'] || 1.0;
    baseAmount *= regionMultiplier;
    
    // Surcharges
    const fuelSurcharge = baseAmount * (PRICING_CONFIG.fuelSurchargePercent / 100);
    const handlingFee = PRICING_CONFIG.handlingFee;
    
    const totalSuggestedPrice = Math.round(baseAmount + fuelSurcharge + handlingFee);
    
    return {
      suggestedPrice: totalSuggestedPrice,
      breakdown: {
        baseAmount: Math.round(baseAmount),
        fuelSurcharge: Math.round(fuelSurcharge),
        handlingFee,
        seasonalMultiplier,
        regionMultiplier,
      },
      params: {
        distanceKm: distance,
        weightTons: weight,
        loadType: loadType || 'default',
        baseRatePerKm: baseRate,
        region: region || 'central',
      },
      confidenceScore: Math.min(95, 70 + Math.floor(distance / 100) + (weight > 5 ? 10 : 5)),
    };
  };

  // POST /api/admin/pricing/suggest - Get suggested price with full breakdown
  app.post("/api/admin/pricing/suggest", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { load_id, distance: mockDistance, weight: mockWeight, loadType: mockLoadType, pickupCity: mockPickupCity, mockMode } = req.body;
      const load = await storage.getLoad(load_id);
      
      // In production, require load to exist unless explicit mock mode is enabled
      const isMockMode = mockMode === true || (mockDistance !== undefined && mockWeight !== undefined);
      if (!load && !isMockMode) {
        return res.status(404).json({ error: "Load not found" });
      }
      
      // Support mock data when load not found (for development with mock loads)
      const distance = load 
        ? parseFloat(load.distance?.toString() || '500') 
        : parseFloat(mockDistance?.toString() || '500');
      const weight = load 
        ? parseFloat(load.weight?.toString() || '10') 
        : parseFloat(mockWeight?.toString() || '10');
      const pickupDate = load?.pickupDate ? new Date(load.pickupDate) : new Date();
      const loadType = load?.requiredTruckType || mockLoadType;

      // Determine region from pickup city
      const city = (load?.pickupCity || mockPickupCity || '').toLowerCase();
      let region = 'central';
      if (['delhi', 'chandigarh', 'jaipur', 'lucknow'].some(c => city.includes(c))) region = 'north';
      else if (['chennai', 'bangalore', 'hyderabad', 'kochi'].some(c => city.includes(c))) region = 'south';
      else if (['kolkata', 'bhubaneswar', 'guwahati'].some(c => city.includes(c))) region = 'east';
      else if (['mumbai', 'pune', 'ahmedabad', 'surat'].some(c => city.includes(c))) region = 'west';

      const pricing = calculatePricing({
        distance,
        weight,
        loadType: loadType || undefined,
        region,
        pickupDate,
      });

      // Get comparable loads (last 90 days)
      let comparableLoads: Array<{ id: string; route: string; distance: string | number | null; finalPrice: string | null }> = [];
      if (load) {
        const allLoads = await storage.getAllLoads();
        comparableLoads = allLoads
          .filter(l => 
            l.id !== load.id && 
            l.status === 'delivered' && 
            l.finalPrice &&
            Math.abs(parseFloat(l.distance?.toString() || '0') - distance) < 100 &&
            l.requiredTruckType === load.requiredTruckType
          )
          .slice(0, 5)
          .map(l => ({
            id: l.id,
            route: `${l.pickupCity} → ${l.dropoffCity}`,
            distance: l.distance,
            finalPrice: l.finalPrice,
          }));
      }

      // Risk flags
      const riskFlags: string[] = [];
      if (load && !load.kycVerified) riskFlags.push('Shipper KYC not verified');
      if (distance > 2000) riskFlags.push('Long haul route (>2000km)');
      if (weight > 25) riskFlags.push('Heavy load (>25 tons)');

      res.json({
        load_id,
        suggested_price: pricing.suggestedPrice,
        breakdown: pricing.breakdown,
        params: pricing.params,
        confidence_score: pricing.confidenceScore,
        comparable_loads: comparableLoads,
        risk_flags: riskFlags,
        platform_rate_percent: PRICING_CONFIG.defaultPlatformRate,
      });
    } catch (error) {
      console.error("Pricing suggest error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/admin/pricing/save - Save draft pricing
  app.post("/api/admin/pricing/save", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { 
        load_id, suggested_price, final_price, markup_percent, fixed_fee, 
        fuel_override, discount_amount, platform_margin_percent, notes, template_id 
      } = req.body;

      // Check if pricing already exists for this load
      let existingPricing = await storage.getAdminPricingByLoad(load_id);

      // Calculate payout and margin
      const finalPriceNum = parseFloat(final_price || suggested_price);
      const platformMarginPercent = parseFloat(platform_margin_percent || PRICING_CONFIG.defaultPlatformRate);
      const platformMargin = Math.round(finalPriceNum * (platformMarginPercent / 100));
      const payoutEstimate = Math.round(finalPriceNum - platformMargin);

      const pricingData = {
        loadId: load_id,
        adminId: user.id,
        templateId: template_id || null,
        suggestedPrice: suggested_price?.toString(),
        finalPrice: final_price?.toString() || null,
        markupPercent: markup_percent?.toString() || "0",
        fixedFee: fixed_fee?.toString() || "0",
        fuelOverride: fuel_override?.toString() || null,
        discountAmount: discount_amount?.toString() || "0",
        payoutEstimate: payoutEstimate.toString(),
        platformMargin: platformMargin.toString(),
        platformMarginPercent: platformMarginPercent.toString(),
        status: 'draft',
        notes: notes || null,
      };

      let pricing;
      if (existingPricing && existingPricing.status === 'draft') {
        pricing = await storage.updateAdminPricing(existingPricing.id, pricingData);
      } else {
        pricing = await storage.createAdminPricing(pricingData as any);
      }

      res.json({ success: true, pricing });
    } catch (error) {
      console.error("Pricing save error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/admin/pricing/lock - Lock final price and optionally post
  app.post("/api/admin/pricing/lock", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { pricing_id, final_price, post_mode, invite_carrier_ids, notes, allow_counter_bids } = req.body;

      const pricing = await storage.getAdminPricing(pricing_id);
      if (!pricing) {
        return res.status(404).json({ error: "Pricing not found" });
      }

      // Check if approval is needed
      const suggestedPrice = parseFloat(pricing.suggestedPrice?.toString() || '0');
      const finalPrice = parseFloat(final_price);
      const deviation = Math.abs((finalPrice - suggestedPrice) / suggestedPrice * 100);
      const requiresApproval = deviation > PRICING_CONFIG.approvalThresholdPercent;

      // Calculate margins
      const platformMarginPercent = parseFloat(pricing.platformMarginPercent?.toString() || PRICING_CONFIG.defaultPlatformRate.toString());
      const platformMargin = Math.round(finalPrice * (platformMarginPercent / 100));
      const payoutEstimate = Math.round(finalPrice - platformMargin);

      // Update pricing record
      const updatedPricing = await storage.updateAdminPricing(pricing_id, {
        finalPrice: finalPrice.toString(),
        postMode: post_mode,
        invitedCarrierIds: invite_carrier_ids || [],
        status: requiresApproval ? 'awaiting_approval' : 'locked',
        requiresApproval,
        payoutEstimate: payoutEstimate.toString(),
        platformMargin: platformMargin.toString(),
        notes: notes || pricing.notes,
      });

      if (requiresApproval) {
        // Notify other admins for approval
        const allUsers = await storage.getAllUsers();
        const otherAdmins = allUsers.filter(u => u.role === 'admin' && u.id !== user.id);
        for (const admin of otherAdmins) {
          await storage.createNotification({
            userId: admin.id,
            title: "Pricing Override Requires Approval",
            message: `Load pricing deviates ${deviation.toFixed(1)}% from suggested. Review required.`,
            type: "warning",
            relatedLoadId: pricing.loadId,
          });
        }

        return res.json({ 
          success: true, 
          pricing: updatedPricing, 
          requires_approval: true,
          deviation_percent: deviation,
        });
      }

      // If no approval needed, proceed to lock and await shipper confirmation
      const load = await storage.getLoad(pricing.loadId);
      if (!load) {
        return res.status(404).json({ error: "Load not found" });
      }

      // Update load to 'priced' status first (canonical state machine)
      // This will transition to 'invoice_sent' after invoice is generated
      await storage.updateLoad(pricing.loadId, {
        status: 'priced',
        previousStatus: load.status,
        adminFinalPrice: finalPrice.toString(),
        adminPostMode: post_mode,
        adminId: user.id,
        allowCounterBids: allow_counter_bids !== false,
        invitedCarrierIds: invite_carrier_ids || [],
        priceLockedAt: new Date(),
        priceLockedBy: user.id,
        statusChangedBy: user.id,
        statusChangedAt: new Date(),
      });

      // Create admin decision record
      await storage.createAdminDecision({
        loadId: pricing.loadId,
        adminId: user.id,
        suggestedPrice: pricing.suggestedPrice,
        finalPrice: finalPrice.toString(),
        postingMode: post_mode,
        invitedCarrierIds: invite_carrier_ids || [],
        comment: notes || null,
        pricingBreakdown: JSON.stringify({
          platformMargin,
          payoutEstimate,
          markupPercent: pricing.markupPercent,
          fixedFee: pricing.fixedFee,
        }),
        actionType: 'price_and_post',
      });

      // Update pricing status to locked (not posted yet)
      await storage.updateAdminPricing(pricing_id, { status: 'locked' });

      // NOTE: Invoice is NOT created at pricing time per Admin-as-Mediator workflow
      // Invoice will be generated ONLY after carrier finalization (bid accepted)
      // This happens in acceptBid() in workflow-service.ts

      // CRITICAL FIX: Set status to 'posted_to_carriers' so carriers can see the load immediately
      // This ensures the success message in the UI is accurate - no fake success states
      await storage.updateLoad(load.id, {
        status: 'posted_to_carriers',
        previousStatus: 'priced',
        adminFinalPrice: finalPrice.toString(),
        adminPostMode: post_mode,
        adminId: user.id,
        allowCounterBids: allow_counter_bids !== false,
        invitedCarrierIds: invite_carrier_ids || [],
        postedAt: new Date(),
        statusChangedBy: user.id,
        statusChangedAt: new Date(),
      });

      // Notify shipper that load has been posted
      await storage.createNotification({
        userId: load.shipperId,
        title: "Load Posted to Carriers",
        message: `Your load from ${load.pickupCity} to ${load.dropoffCity} has been priced at Rs. ${finalPrice.toLocaleString('en-IN')} and is now visible to carriers.`,
        type: "success",
        relatedLoadId: pricing.loadId,
      });

      // Notify carriers based on post mode
      if (post_mode === 'open') {
        // For open mode, carriers will see it when they refresh the load board
      } else if (post_mode === 'invite' && invite_carrier_ids?.length > 0) {
        for (const carrierId of invite_carrier_ids) {
          await storage.createNotification({
            userId: carrierId,
            title: "Invited to Bid on Load",
            message: `You have been invited to bid on a load from ${load.pickupCity} to ${load.dropoffCity}`,
            type: "info",
            relatedLoadId: load.id,
          });
        }
      }

      res.json({ 
        success: true, 
        pricing: updatedPricing,
        requires_approval: false,
        load_status: 'posted_to_carriers',
        invoice_note: 'Invoice will be generated after carrier is finalized',
      });
    } catch (error) {
      console.error("Pricing lock error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/admin/pricing/approve - Approve pricing override
  app.post("/api/admin/pricing/approve", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { pricing_id, post_mode, invite_carrier_ids, allow_counter_bids } = req.body;

      const pricing = await storage.getAdminPricing(pricing_id);
      if (!pricing) {
        return res.status(404).json({ error: "Pricing not found" });
      }

      if (pricing.status !== 'awaiting_approval') {
        return res.status(400).json({ error: "Pricing is not awaiting approval" });
      }

      // Approve the pricing
      const approvedPricing = await storage.approveAdminPricing(pricing_id, user.id);

      // Get the load
      const load = await storage.getLoad(pricing.loadId);
      if (!load) {
        return res.status(404).json({ error: "Load not found" });
      }

      const finalPrice = parseFloat(pricing.finalPrice?.toString() || '0');
      const mode = post_mode || pricing.postMode || 'open';

      // Set to 'posted_to_carriers' status - carriers can see the load immediately
      await storage.updateLoad(pricing.loadId, {
        status: 'posted_to_carriers',
        previousStatus: load.status,
        adminFinalPrice: finalPrice.toString(),
        adminPostMode: mode,
        adminId: pricing.adminId,
        allowCounterBids: allow_counter_bids !== false,
        invitedCarrierIds: invite_carrier_ids || pricing.invitedCarrierIds || [],
        priceLockedAt: new Date(),
        priceLockedBy: user.id,
        postedAt: new Date(),
        statusChangedBy: user.id,
        statusChangedAt: new Date(),
      });

      // Create admin decision record
      await storage.createAdminDecision({
        loadId: pricing.loadId,
        adminId: user.id,
        suggestedPrice: pricing.suggestedPrice,
        finalPrice: finalPrice.toString(),
        postingMode: mode,
        invitedCarrierIds: invite_carrier_ids || pricing.invitedCarrierIds || [],
        comment: `Approved by ${user.username}`,
        pricingBreakdown: pricing.priceBreakdown as Record<string, unknown> || null,
        actionType: 'approve_and_post',
      });

      // Update pricing status to posted
      await storage.updateAdminPricing(pricing_id, { status: 'posted' });

      // Notify original admin
      await storage.createNotification({
        userId: pricing.adminId,
        title: "Pricing Override Approved",
        message: `Pricing approved. Load is now visible to carriers.`,
        type: "success",
        relatedLoadId: pricing.loadId,
      });

      // NOTE: Invoice is NOT created at pricing approval time per Admin-as-Mediator workflow
      // Invoice will be generated ONLY after carrier finalization (bid accepted)
      // This happens in acceptBid() in workflow-service.ts

      // Notify shipper that load is posted
      await storage.createNotification({
        userId: load.shipperId,
        title: "Load Posted to Carriers",
        message: `Your load from ${load.pickupCity} to ${load.dropoffCity} has been priced at Rs. ${finalPrice.toLocaleString('en-IN')} and is now visible to carriers.`,
        type: "success",
        relatedLoadId: pricing.loadId,
      });

      // Notify carriers based on post mode
      if (mode === 'invite' && (invite_carrier_ids || pricing.invitedCarrierIds)?.length > 0) {
        const carrierIds = invite_carrier_ids || pricing.invitedCarrierIds || [];
        for (const carrierId of carrierIds) {
          await storage.createNotification({
            userId: carrierId,
            title: "Invited to Bid on Load",
            message: `You have been invited to bid on a load from ${load.pickupCity} to ${load.dropoffCity}`,
            type: "info",
            relatedLoadId: load.id,
          });
        }
      }

      res.json({ 
        success: true, 
        pricing: approvedPricing, 
        load_status: 'posted_to_carriers',
        invoice_note: 'Invoice will be generated after carrier is finalized',
      });
    } catch (error) {
      console.error("Pricing approve error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/admin/pricing/reject - Reject pricing override
  app.post("/api/admin/pricing/reject", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { pricing_id, reason } = req.body;

      const pricing = await storage.getAdminPricing(pricing_id);
      if (!pricing) {
        return res.status(404).json({ error: "Pricing not found" });
      }

      const rejectedPricing = await storage.rejectAdminPricing(pricing_id, user.id, reason);

      // Notify original admin
      await storage.createNotification({
        userId: pricing.adminId,
        title: "Pricing Override Rejected",
        message: `Your pricing override was rejected: ${reason}`,
        type: "error",
        relatedLoadId: pricing.loadId,
      });

      res.json({ success: true, pricing: rejectedPricing });
    } catch (error) {
      console.error("Pricing reject error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /api/admin/pricing/history/:loadId - Get pricing history
  app.get("/api/admin/pricing/history/:loadId", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const history = await storage.getAdminPricingHistory(req.params.loadId);
      
      // Add admin names to history entries
      const historyWithAdmins = await Promise.all(
        history.map(async (entry) => {
          const admin = await storage.getUser(entry.adminId);
          const approver = entry.approvedBy ? await storage.getUser(entry.approvedBy) : null;
          return {
            ...entry,
            adminName: admin?.username || 'Unknown',
            approverName: approver?.username || null,
          };
        })
      );

      res.json(historyWithAdmins);
    } catch (error) {
      console.error("Pricing history error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /api/admin/pricing/templates - Get all pricing templates
  app.get("/api/admin/pricing/templates", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const templates = await storage.getPricingTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Get templates error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/admin/pricing/templates - Create pricing template
  app.post("/api/admin/pricing/templates", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { name, description, markup_percent, fixed_fee, fuel_surcharge_percent, platform_rate_percent } = req.body;

      const template = await storage.createPricingTemplate({
        name,
        description,
        markupPercent: markup_percent?.toString() || "0",
        fixedFee: fixed_fee?.toString() || "0",
        fuelSurchargePercent: fuel_surcharge_percent?.toString() || "0",
        platformRatePercent: platform_rate_percent?.toString() || PRICING_CONFIG.defaultPlatformRate.toString(),
        createdBy: user.id,
      });

      res.json(template);
    } catch (error) {
      console.error("Create template error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // DELETE /api/admin/pricing/templates/:id - Delete (deactivate) pricing template
  app.delete("/api/admin/pricing/templates/:id", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      await storage.deletePricingTemplate(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete template error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /api/admin/pricing/:loadId - Get current pricing for a load
  app.get("/api/admin/pricing/:loadId", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const pricing = await storage.getAdminPricingByLoad(req.params.loadId);
      res.json(pricing || null);
    } catch (error) {
      console.error("Get pricing error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // =============================================
  // INVOICE BUILDER ENDPOINTS
  // =============================================

  // GET /api/admin/invoices - Get all invoices (admin only)
  app.get("/api/admin/invoices", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const invoices = await storage.getAllInvoices();
      res.json(invoices);
    } catch (error) {
      console.error("Get invoices error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /api/invoices/shipper - Get invoices for current shipper
  // RULE: Shipper only sees invoices AFTER they are SENT (not draft/created)
  app.get("/api/invoices/shipper", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "shipper") {
        return res.status(403).json({ error: "Shipper access required" });
      }

      const invoices = await storage.getInvoicesByShipper(user.id);
      // Filter to only show sent/approved/paid invoices (not draft/created)
      const visibleStatuses = ['sent', 'approved', 'acknowledged', 'paid', 'overdue', 'disputed'];
      const visibleInvoices = invoices.filter(inv => visibleStatuses.includes(inv.status || ''));
      res.json(visibleInvoices);
    } catch (error) {
      console.error("Get shipper invoices error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/invoices/:id/confirm - Shipper confirms invoice to start carrier bidding
  app.post("/api/invoices/:id/confirm", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "shipper") {
        return res.status(403).json({ error: "Shipper access required" });
      }

      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      // Verify shipper owns this invoice
      if (invoice.shipperId !== user.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Check if already confirmed
      if (invoice.shipperConfirmed) {
        return res.status(400).json({ error: "Invoice already confirmed" });
      }

      // Confirm the invoice (shipper approves)
      const updatedInvoice = await storage.updateInvoice(req.params.id, {
        shipperConfirmed: true,
        shipperConfirmedAt: new Date(),
        shipperResponseType: 'approve',
        status: 'approved',
        approvedAt: new Date(),
      });

      // Get the load
      const load = await storage.getLoad(invoice.loadId);
      if (!load) {
        return res.status(404).json({ error: "Load not found" });
      }

      // NEW WORKFLOW: Invoice comes AFTER carrier finalization
      // Shipper acknowledges invoice → then pays → then transit begins
      const transitionResult = await transitionLoadState(
        load.id,
        'invoice_acknowledged',
        user.id,
        'Invoice acknowledged by shipper - awaiting payment'
      );
      if (!transitionResult.success) {
        console.warn(`Load state transition warning: ${transitionResult.error}`);
      }

      // Notify shipper of confirmation
      await storage.createNotification({
        userId: user.id,
        title: "Invoice Approved",
        message: `You have approved the invoice for ${load.pickupCity} → ${load.dropoffCity}. The shipment is ready to begin.`,
        type: "success",
        relatedLoadId: load.id,
      });

      // Notify assigned carrier that shipper approved - they can start transit
      if (load.assignedCarrierId) {
        await storage.createNotification({
          userId: load.assignedCarrierId,
          title: "Shipment Approved - Ready for Pickup",
          message: `The shipper has approved the invoice. You can now begin the shipment: ${load.pickupCity} → ${load.dropoffCity}`,
          type: "success",
          relatedLoadId: load.id,
        });
      }

      // Notify admins
      const allUsers = await storage.getAllUsers();
      const admins = allUsers.filter(u => u.role === 'admin');
      for (const admin of admins) {
        await storage.createNotification({
          userId: admin.id,
          title: "Shipper Approved Invoice",
          message: `Shipper ${user.companyName || user.username} approved invoice for ${load.pickupCity} → ${load.dropoffCity}. Ready for transit.`,
          type: "success",
          relatedLoadId: load.id,
        });
      }

      res.json({ 
        success: true, 
        invoice: updatedInvoice,
        load_status: 'invoice_acknowledged',
        message: "Invoice acknowledged. Awaiting payment to proceed.",
      });
    } catch (error) {
      console.error("Invoice confirm error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/invoices/:id/reject - Shipper rejects invoice
  app.post("/api/invoices/:id/reject", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "shipper") {
        return res.status(403).json({ error: "Shipper access required" });
      }

      const { reason } = req.body;
      if (!reason) {
        return res.status(400).json({ error: "Rejection reason is required" });
      }

      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      if (invoice.shipperId !== user.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      if (invoice.shipperConfirmed) {
        return res.status(400).json({ error: "Invoice already confirmed" });
      }

      // Update invoice with rejection
      const updatedInvoice = await storage.updateInvoice(req.params.id, {
        shipperResponseType: 'reject',
        shipperResponseMessage: reason,
        status: 'disputed',
      });

      // Update load status to invoice_rejected (canonical state)
      const load = await storage.getLoad(invoice.loadId);
      if (load) {
        await storage.updateLoad(load.id, {
          status: 'invoice_rejected',
          previousStatus: load.status,
          statusChangedBy: user.id,
          statusChangedAt: new Date(),
          statusNote: `Invoice rejected: ${reason}`,
        });
      }

      // Create shipper invoice response record for audit
      await storage.createShipperInvoiceResponse({
        invoiceId: invoice.id,
        loadId: invoice.loadId,
        shipperId: user.id,
        responseType: 'reject',
        message: reason,
        status: 'submitted',
      });

      // Notify admins about rejection
      const allUsers = await storage.getAllUsers();
      const admins = allUsers.filter(u => u.role === 'admin');
      for (const admin of admins) {
        await storage.createNotification({
          userId: admin.id,
          title: "Invoice Rejected by Shipper",
          message: `Invoice ${invoice.invoiceNumber} was rejected: "${reason}"`,
          type: "error",
          relatedLoadId: invoice.loadId,
        });
      }

      res.json({
        success: true,
        invoice: updatedInvoice,
        load_status: 'invoice_rejected',
        message: "Invoice rejected. Admin has been notified.",
      });
    } catch (error) {
      console.error("Invoice reject error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/invoices/:id/negotiate - Shipper requests negotiation
  app.post("/api/invoices/:id/negotiate", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "shipper") {
        return res.status(403).json({ error: "Shipper access required" });
      }

      const { proposedAmount, reason } = req.body;
      if (!proposedAmount || !reason) {
        return res.status(400).json({ error: "Proposed amount and reason are required" });
      }

      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      if (invoice.shipperId !== user.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      if (invoice.shipperConfirmed) {
        return res.status(400).json({ error: "Invoice already confirmed" });
      }

      // Update invoice with negotiation request
      const updatedInvoice = await storage.updateInvoice(req.params.id, {
        shipperResponseType: 'negotiate',
        shipperResponseMessage: `Counter: Rs. ${parseFloat(proposedAmount).toLocaleString('en-IN')} - ${reason}`,
        status: 'negotiation',
      });

      // Update load status to invoice_negotiation (canonical state)
      const load = await storage.getLoad(invoice.loadId);
      if (load) {
        await storage.updateLoad(load.id, {
          status: 'invoice_negotiation',
          previousStatus: load.status,
          statusChangedBy: user.id,
          statusChangedAt: new Date(),
          statusNote: `Invoice negotiation: Proposed Rs. ${proposedAmount.toLocaleString('en-IN')}`,
        });
      }

      // Create shipper invoice response record for audit
      await storage.createShipperInvoiceResponse({
        invoiceId: invoice.id,
        loadId: invoice.loadId,
        shipperId: user.id,
        responseType: 'negotiate',
        counterAmount: proposedAmount.toString(),
        message: reason,
        status: 'pending',
      });

      // Notify admins about negotiation request
      const allUsers = await storage.getAllUsers();
      const admins = allUsers.filter(u => u.role === 'admin');
      for (const admin of admins) {
        await storage.createNotification({
          userId: admin.id,
          title: "Invoice Negotiation Requested",
          message: `Shipper ${user.companyName || user.username} proposes Rs. ${parseFloat(proposedAmount).toLocaleString('en-IN')} (was Rs. ${parseFloat(invoice.totalAmount?.toString() || '0').toLocaleString('en-IN')})`,
          type: "warning",
          relatedLoadId: invoice.loadId,
        });
      }

      res.json({
        success: true,
        invoice: updatedInvoice,
        load_status: 'invoice_negotiation',
        message: "Negotiation request submitted. Admin will review your proposal.",
      });
    } catch (error) {
      console.error("Invoice negotiate error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /api/admin/invoices/:id - Get specific invoice
  app.get("/api/admin/invoices/:id", requireAuth, async (req, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      const user = await storage.getUser(req.session.userId!);
      if (user?.role !== "admin" && user?.id !== invoice.shipperId) {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json(invoice);
    } catch (error) {
      console.error("Get invoice error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/admin/invoices - Create new invoice (ONLY for loads in awarded state or later)
  app.post("/api/admin/invoices", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { loadId, shipperId, lineItems, subtotal, fuelSurcharge, tollCharges, 
              handlingFee, insuranceFee, discountAmount, discountReason, 
              taxPercent, taxAmount, totalAmount, paymentTerms, dueDate, notes } = req.body;

      if (!loadId || !shipperId || !subtotal || !totalAmount) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const load = await storage.getLoad(loadId);
      if (!load) {
        return res.status(404).json({ error: "Load not found" });
      }

      // Invoice creation allowed at awarded state (creates invoice_created) or later invoice states
      const allowedStatesForInvoice = ['awarded', 'invoice_created', 'invoice_sent', 'invoice_acknowledged', 'invoice_paid', 'in_transit', 'delivered', 'closed'];
      if (!load.status || !allowedStatesForInvoice.includes(load.status)) {
        return res.status(400).json({ 
          error: "Invoice can only be created after carrier finalization (awarded state or later)" 
        });
      }

      const invoiceNumber = await storage.generateInvoiceNumber();

      const invoice = await storage.createInvoice({
        invoiceNumber,
        loadId,
        shipperId,
        adminId: user.id,
        subtotal,
        fuelSurcharge: fuelSurcharge || "0",
        tollCharges: tollCharges || "0",
        handlingFee: handlingFee || "0",
        insuranceFee: insuranceFee || "0",
        discountAmount: discountAmount || "0",
        discountReason,
        taxPercent: taxPercent || "18",
        taxAmount: taxAmount || "0",
        totalAmount,
        paymentTerms: paymentTerms || "Net 30",
        dueDate: dueDate ? new Date(dueDate) : undefined,
        notes,
        lineItems,
        status: "draft",
      });

      // Transition load state to invoice_created (if still in awarded state)
      if (load.status === 'awarded') {
        await storage.updateLoad(load.id, {
          status: 'invoice_created',
          previousStatus: load.status,
          statusChangedBy: user.id,
          statusChangedAt: new Date(),
          statusNote: 'Invoice created by admin',
        });
      }

      res.status(201).json(invoice);
    } catch (error) {
      console.error("Create invoice error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // PUT /api/admin/invoices/:id - Update invoice
  app.put("/api/admin/invoices/:id", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      if (invoice.status === "paid") {
        return res.status(400).json({ error: "Cannot modify paid invoice" });
      }

      const updated = await storage.updateInvoice(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Update invoice error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/admin/invoices/:id/send - Send invoice to shipper
  app.post("/api/admin/invoices/:id/send", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      const updated = await storage.sendInvoice(req.params.id);
      
      // Transition load state to invoice_sent using centralized validation
      const load = await storage.getLoad(invoice.loadId);
      if (load) {
        const transitionResult = await transitionLoadState(
          load.id,
          'invoice_sent',
          user.id,
          'Invoice sent to shipper'
        );
        if (!transitionResult.success) {
          console.warn(`Load state transition warning: ${transitionResult.error}`);
        }
      }
      
      // Create notification for shipper
      await storage.createNotification({
        userId: invoice.shipperId,
        title: "New Invoice Received",
        message: `Invoice ${invoice.invoiceNumber} for load ${load?.pickupCity} to ${load?.dropoffCity} has been sent to you.`,
        type: "invoice",
        relatedLoadId: invoice.loadId,
      });

      res.json(updated);
    } catch (error) {
      console.error("Send invoice error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/admin/invoices/:id/pay - Mark invoice as paid
  app.post("/api/admin/invoices/:id/pay", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { paidAmount, paymentMethod, paymentReference } = req.body;
      if (!paidAmount || !paymentMethod) {
        return res.status(400).json({ error: "Missing payment details" });
      }

      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      const updated = await storage.markInvoicePaid(req.params.id, {
        paidAmount,
        paymentMethod,
        paymentReference,
      });

      // Transition load state to invoice_paid using centralized validation
      const load = await storage.getLoad(invoice.loadId);
      if (load) {
        const transitionResult = await transitionLoadState(
          load.id,
          'invoice_paid',
          user.id,
          'Invoice paid - ready for transit'
        );
        if (!transitionResult.success) {
          console.warn(`Load state transition warning: ${transitionResult.error}`);
        }

        // Notify carrier that payment is complete and they can begin
        if (load.assignedCarrierId) {
          await storage.createNotification({
            userId: load.assignedCarrierId,
            title: "Payment Received - Ready for Pickup",
            message: `Payment confirmed for ${load.pickupCity} → ${load.dropoffCity}. You can now schedule pickup.`,
            type: "success",
            relatedLoadId: load.id,
          });
        }
      }

      res.json(updated);
    } catch (error) {
      console.error("Mark invoice paid error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /api/admin/invoices/load/:loadId - Get invoice for a specific load
  app.get("/api/admin/invoices/load/:loadId", requireAuth, async (req, res) => {
    try {
      const invoice = await storage.getInvoiceByLoad(req.params.loadId);
      res.json(invoice || null);
    } catch (error) {
      console.error("Get invoice by load error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/admin/invoices/generate - Generate invoice from Invoice Builder (ONLY for awarded+ loads)
  app.post("/api/admin/invoices/generate", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { loadId, shipperId, lineItems, subtotal, discountAmount, discountReason,
              taxPercent, taxAmount, totalAmount, paymentTerms, dueDate, notes,
              platformMargin, estimatedCarrierPayout, status, sendToShipper, idempotencyKey } = req.body;

      // CRITICAL: Verify load is in awarded state or later before allowing invoice creation
      const load = await storage.getLoad(loadId);
      if (!load) {
        return res.status(404).json({ error: "Load not found" });
      }

      // Invoice creation allowed at awarded state (creates invoice_created) or later invoice states
      const allowedStatesForInvoice = ['awarded', 'invoice_created', 'invoice_sent', 'invoice_acknowledged', 'invoice_paid', 'in_transit', 'delivered', 'closed'];
      if (!load.status || !allowedStatesForInvoice.includes(load.status)) {
        return res.status(400).json({ 
          error: "Invoice can only be created after carrier finalization (awarded state or later)" 
        });
      }

      // Check idempotency
      if (idempotencyKey) {
        const existing = await storage.getInvoiceByIdempotencyKey(idempotencyKey);
        if (existing) {
          return res.json({ invoice: existing, existed: true });
        }
      }

      // Check if invoice already exists for this load
      const existingInvoice = await storage.getInvoiceByLoad(loadId);
      if (existingInvoice) {
        return res.json({ invoice: existingInvoice, existed: true });
      }

      if (!loadId || !shipperId || !subtotal || !totalAmount) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const invoiceNumber = await storage.generateInvoiceNumber();
      const dueDateValue = dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const invoice = await storage.createInvoice({
        invoiceNumber,
        loadId,
        shipperId,
        adminId: user.id,
        subtotal,
        discountAmount: discountAmount || "0",
        discountReason,
        taxPercent: taxPercent || "18",
        taxAmount: taxAmount || "0",
        totalAmount,
        paymentTerms: paymentTerms || "Net 30",
        dueDate: dueDateValue,
        notes,
        lineItems,
        platformMargin: platformMargin || "0",
        estimatedCarrierPayout: estimatedCarrierPayout || "0",
        status: status || "draft",
        idempotencyKey,
      });

      // Transition load state to invoice_created (if still in awarded state)
      if (load.status === 'awarded') {
        await storage.updateLoad(load.id, {
          status: 'invoice_created',
          previousStatus: load.status,
          statusChangedBy: user.id,
          statusChangedAt: new Date(),
          statusNote: 'Invoice created by admin',
        });
      }

      // Create audit log
      await storage.createInvoiceHistory({
        invoiceId: invoice.id,
        userId: user.id,
        action: "create",
        payload: { lineItems, subtotal, totalAmount, taxPercent },
      });

      // If sendToShipper is true, send immediately
      if (sendToShipper) {
        await storage.updateInvoice(invoice.id, { status: "sent", sentAt: new Date() });
        
        // Transition load state to invoice_sent
        await storage.updateLoad(load.id, {
          status: 'invoice_sent',
          previousStatus: 'invoice_created',
          statusChangedBy: user.id,
          statusChangedAt: new Date(),
          statusNote: 'Invoice sent to shipper',
        });
        
        await storage.createNotification({
          userId: shipperId,
          title: "Invoice Received",
          message: `Invoice ${invoiceNumber} for ${load?.pickupCity} to ${load?.dropoffCity} - Total: Rs. ${parseFloat(totalAmount).toLocaleString('en-IN')}`,
          type: "invoice",
          relatedLoadId: loadId,
        });

        await storage.createInvoiceHistory({
          invoiceId: invoice.id,
          userId: user.id,
          action: "send",
          payload: { sentAt: new Date() },
        });
      }

      res.status(201).json({ invoice, existed: false });
    } catch (error) {
      console.error("Generate invoice error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /api/admin/invoices/:id/history - Get invoice audit history
  app.get("/api/admin/invoices/:id/history", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const history = await storage.getInvoiceHistory(req.params.id);
      res.json(history);
    } catch (error) {
      console.error("Get invoice history error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/shipper/invoices/:id/acknowledge - Shipper acknowledges invoice
  app.post("/api/shipper/invoices/:id/acknowledge", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "shipper") {
        return res.status(403).json({ error: "Shipper access required" });
      }

      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice || invoice.shipperId !== user.id) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      const updated = await storage.updateInvoice(req.params.id, {
        status: "acknowledged",
        viewedAt: new Date(),
      });

      // Transition load state to invoice_acknowledged using centralized validation
      const transitionResult = await transitionLoadState(
        invoice.loadId,
        'invoice_acknowledged',
        user.id,
        'Invoice acknowledged by shipper'
      );
      if (!transitionResult.success) {
        console.warn(`Load state transition warning: ${transitionResult.error}`);
      }

      await storage.createInvoiceHistory({
        invoiceId: invoice.id,
        userId: user.id,
        action: "acknowledge",
        payload: { acknowledgedAt: new Date() },
      });

      // Notify admin
      const admins = (await storage.getAllUsers()).filter(u => u.role === 'admin');
      for (const admin of admins) {
        await storage.createNotification({
          userId: admin.id,
          title: "Invoice Acknowledged",
          message: `${user.companyName || user.username} acknowledged invoice ${invoice.invoiceNumber}`,
          type: "success",
          relatedLoadId: invoice.loadId,
        });
      }

      res.json(updated);
    } catch (error) {
      console.error("Acknowledge invoice error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/shipper/invoices/:id/pay - Shipper pays invoice (mock)
  app.post("/api/shipper/invoices/:id/pay", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "shipper") {
        return res.status(403).json({ error: "Shipper access required" });
      }

      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice || invoice.shipperId !== user.id) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      const { paymentMethod } = req.body;
      const paymentReference = `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

      const updated = await storage.markInvoicePaid(req.params.id, {
        paidAmount: invoice.totalAmount,
        paymentMethod: paymentMethod || "mock_payment",
        paymentReference,
      });

      // Transition load state to invoice_paid using centralized validation
      const transitionResult = await transitionLoadState(
        invoice.loadId,
        'invoice_paid',
        user.id,
        'Invoice paid by shipper - ready for transit'
      );
      if (!transitionResult.success) {
        console.warn(`Load state transition warning: ${transitionResult.error}`);
      }

      await storage.createInvoiceHistory({
        invoiceId: invoice.id,
        userId: user.id,
        action: "pay",
        payload: { paymentMethod, paymentReference, paidAmount: invoice.totalAmount },
      });

      // Notify admin
      const admins = (await storage.getAllUsers()).filter(u => u.role === 'admin');
      for (const admin of admins) {
        await storage.createNotification({
          userId: admin.id,
          title: "Payment Received",
          message: `Payment of Rs. ${parseFloat(invoice.totalAmount).toLocaleString('en-IN')} received for invoice ${invoice.invoiceNumber}`,
          type: "success",
          relatedLoadId: invoice.loadId,
        });
      }

      // Notify carrier that payment is complete and they can begin transit
      const load = await storage.getLoad(invoice.loadId);
      if (load?.assignedCarrierId) {
        await storage.createNotification({
          userId: load.assignedCarrierId,
          title: "Payment Received - Ready for Pickup",
          message: `Payment confirmed for ${load.pickupCity} → ${load.dropoffCity}. You can now schedule pickup.`,
          type: "success",
          relatedLoadId: load.id,
        });
      }

      res.json({ invoice: updated, paymentReference });
    } catch (error) {
      console.error("Pay invoice error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/shipper/invoices/:id/query - Shipper raises a query/dispute
  app.post("/api/shipper/invoices/:id/query", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "shipper") {
        return res.status(403).json({ error: "Shipper access required" });
      }

      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice || invoice.shipperId !== user.id) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Query message is required" });
      }

      const updated = await storage.updateInvoice(req.params.id, {
        status: "disputed",
      });

      await storage.createInvoiceHistory({
        invoiceId: invoice.id,
        userId: user.id,
        action: "dispute",
        payload: { message, disputedAt: new Date() },
      });

      // Notify admin
      const admins = (await storage.getAllUsers()).filter(u => u.role === 'admin');
      for (const admin of admins) {
        await storage.createNotification({
          userId: admin.id,
          title: "Invoice Query Raised",
          message: `${user.companyName || user.username} raised a query on invoice ${invoice.invoiceNumber}: "${message.slice(0, 50)}..."`,
          type: "warning",
          relatedLoadId: invoice.loadId,
        });
      }

      res.json({ invoice: updated, queryId: `QRY-${Date.now()}` });
    } catch (error) {
      console.error("Query invoice error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // =============================================
  // CARRIER PROPOSAL ENDPOINTS (Edited Estimations)
  // =============================================

  // POST /api/admin/proposals/send - Send edited estimation to carriers
  app.post("/api/admin/proposals/send", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { loadId, carrierIds, proposedPayout, lineItems, message, expiryHours } = req.body;

      if (!loadId || !carrierIds?.length || !proposedPayout) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const load = await storage.getLoad(loadId);
      if (!load) {
        return res.status(404).json({ error: "Load not found" });
      }

      const expiresAt = new Date(Date.now() + (expiryHours || 24) * 60 * 60 * 1000);
      const proposals = [];

      for (const carrierId of carrierIds) {
        const proposal = await storage.createCarrierProposal({
          loadId,
          carrierId,
          adminId: user.id,
          proposedPayout,
          lineItems,
          message,
          expiresAt,
          status: "pending",
        });
        proposals.push(proposal);

        // Notify carrier
        await storage.createNotification({
          userId: carrierId,
          title: "New Proposal Received",
          message: `You have a new freight proposal for ${load.pickupCity} to ${load.dropoffCity} - Payout: Rs. ${parseFloat(proposedPayout).toLocaleString('en-IN')}`,
          type: "info",
          relatedLoadId: loadId,
        });
      }

      res.json({ proposals, count: proposals.length });
    } catch (error) {
      console.error("Send proposals error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /api/carrier/proposals - Get proposals for carrier
  app.get("/api/carrier/proposals", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "carrier") {
        return res.status(403).json({ error: "Carrier access required" });
      }

      const proposals = await storage.getCarrierProposalsByCarrier(user.id);
      res.json(proposals);
    } catch (error) {
      console.error("Get proposals error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /api/carrier/proposals/pending - Get pending proposals for carrier
  app.get("/api/carrier/proposals/pending", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "carrier") {
        return res.status(403).json({ error: "Carrier access required" });
      }

      const proposals = await storage.getPendingCarrierProposals(user.id);
      res.json(proposals);
    } catch (error) {
      console.error("Get pending proposals error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/carrier/proposals/:id/accept - Accept a proposal
  app.post("/api/carrier/proposals/:id/accept", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "carrier") {
        return res.status(403).json({ error: "Carrier access required" });
      }

      const proposal = await storage.getCarrierProposal(req.params.id);
      if (!proposal || proposal.carrierId !== user.id) {
        return res.status(404).json({ error: "Proposal not found" });
      }

      if (proposal.status !== "pending") {
        return res.status(400).json({ error: "Proposal is no longer pending" });
      }

      if (proposal.expiresAt && new Date(proposal.expiresAt) < new Date()) {
        await storage.updateCarrierProposal(req.params.id, { status: "expired" });
        return res.status(400).json({ error: "Proposal has expired" });
      }

      const updated = await storage.acceptCarrierProposal(req.params.id);

      // Notify admin
      await storage.createNotification({
        userId: proposal.adminId,
        title: "Proposal Accepted",
        message: `${user.companyName || user.username} accepted your proposal for payout Rs. ${parseFloat(proposal.proposedPayout).toLocaleString('en-IN')}`,
        type: "success",
        relatedLoadId: proposal.loadId,
      });

      res.json(updated);
    } catch (error) {
      console.error("Accept proposal error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/carrier/proposals/:id/counter - Counter a proposal
  app.post("/api/carrier/proposals/:id/counter", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "carrier") {
        return res.status(403).json({ error: "Carrier access required" });
      }

      const proposal = await storage.getCarrierProposal(req.params.id);
      if (!proposal || proposal.carrierId !== user.id) {
        return res.status(404).json({ error: "Proposal not found" });
      }

      if (proposal.status !== "pending") {
        return res.status(400).json({ error: "Proposal is no longer pending" });
      }

      const { counterAmount, counterMessage } = req.body;
      if (!counterAmount) {
        return res.status(400).json({ error: "Counter amount is required" });
      }

      const updated = await storage.counterCarrierProposal(
        req.params.id,
        counterAmount,
        counterMessage || ""
      );

      // Notify admin
      await storage.createNotification({
        userId: proposal.adminId,
        title: "Counter Offer Received",
        message: `${user.companyName || user.username} countered with Rs. ${parseFloat(counterAmount).toLocaleString('en-IN')}`,
        type: "warning",
        relatedLoadId: proposal.loadId,
      });

      res.json(updated);
    } catch (error) {
      console.error("Counter proposal error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /api/admin/proposals/load/:loadId - Get proposals for a load
  app.get("/api/admin/proposals/load/:loadId", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const proposals = await storage.getCarrierProposalsByLoad(req.params.loadId);
      res.json(proposals);
    } catch (error) {
      console.error("Get proposals by load error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // =============================================
  // CARRIER SETTLEMENT ENDPOINTS
  // =============================================

  // GET /api/carrier/settlements - Get settlements for current carrier
  app.get("/api/carrier/settlements", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "carrier") {
        return res.status(403).json({ error: "Carrier access required" });
      }

      const settlements = await storage.getSettlementsByCarrier(user.id);
      res.json(settlements);
    } catch (error) {
      console.error("Get carrier settlements error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/admin/settlements - Create carrier settlement
  app.post("/api/admin/settlements", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { loadId, carrierId, invoiceId, grossAmount, platformFee, deductions, 
              deductionReason, netPayout, scheduledDate, notes } = req.body;

      if (!loadId || !carrierId || !grossAmount || !netPayout) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const settlement = await storage.createSettlement({
        loadId,
        carrierId,
        invoiceId,
        grossAmount,
        platformFee: platformFee || "0",
        deductions: deductions || "0",
        deductionReason,
        netPayout,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
        notes,
        status: "pending",
      });

      // Notify carrier
      const load = await storage.getLoad(loadId);
      await storage.createNotification({
        userId: carrierId,
        title: "Settlement Created",
        message: `A settlement of Rs. ${parseFloat(netPayout).toLocaleString('en-IN')} has been created for load ${load?.pickupCity} to ${load?.dropoffCity}.`,
        type: "payment",
        relatedLoadId: loadId,
      });

      res.status(201).json(settlement);
    } catch (error) {
      console.error("Create settlement error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/admin/settlements/:id/pay - Mark settlement as paid
  app.post("/api/admin/settlements/:id/pay", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { paymentMethod, transactionId } = req.body;
      if (!paymentMethod) {
        return res.status(400).json({ error: "Payment method required" });
      }

      const updated = await storage.markSettlementPaid(req.params.id, {
        paymentMethod,
        transactionId,
      });

      if (updated) {
        await storage.createNotification({
          userId: updated.carrierId,
          title: "Payment Received",
          message: `Your payout of Rs. ${parseFloat(updated.netPayout).toLocaleString('en-IN')} has been processed.`,
          type: "payment",
          relatedLoadId: updated.loadId,
        });
      }

      res.json(updated);
    } catch (error) {
      console.error("Mark settlement paid error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // =============================================
  // ADMIN TROUBLESHOOTING DASHBOARD ENDPOINTS
  // =============================================

  // GET /api/admin/troubleshoot/load/:id - Full load diagnostics
  app.get("/api/admin/troubleshoot/load/:id", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const load = await storage.getLoad(req.params.id);
      if (!load) {
        return res.status(404).json({ error: "Load not found" });
      }

      // Get related data
      const shipper = await storage.getUser(load.shipperId);
      const pricing = await storage.getAdminPricingByLoad(load.id);
      const invoice = await storage.getInvoiceByLoad(load.id);
      const bidsData = await storage.getBidsByLoad(load.id);
      const auditLogs = await storage.getAuditLogsByLoad(load.id);
      const apiLogs = await storage.getApiLogsByLoad(load.id, 50);
      const pendingActions = await storage.getPendingActionsByLoad(load.id);

      // Build diagnostics
      const diagnostics = {
        loadBasics: {
          id: load.id,
          status: load.status,
          pickupCity: load.pickupCity,
          dropoffCity: load.dropoffCity,
          distance: load.distance,
          weight: load.weight,
          requiredTruckType: load.requiredTruckType,
          finalPrice: load.finalPrice,
          adminFinalPrice: load.adminFinalPrice,
          hasFinalPrice: !!load.finalPrice || !!load.adminFinalPrice,
          createdAt: load.createdAt,
          submittedAt: load.submittedAt,
          postedAt: load.postedAt,
        },
        shipperInfo: shipper ? {
          id: shipper.id,
          username: shipper.username,
          companyName: shipper.companyName,
          isVerified: shipper.isVerified,
          kycVerified: load.kycVerified,
        } : null,
        pricingInfo: pricing ? {
          id: pricing.id,
          status: pricing.status,
          suggestedPrice: pricing.suggestedPrice,
          finalPrice: pricing.finalPrice,
          requiresApproval: pricing.requiresApproval,
          approvedAt: pricing.approvedAt,
          rejectedAt: pricing.rejectedAt,
          rejectionReason: pricing.rejectionReason,
        } : null,
        invoiceInfo: invoice ? {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          status: invoice.status,
          totalAmount: invoice.totalAmount,
          sentAt: invoice.sentAt,
          paidAt: invoice.paidAt,
        } : null,
        bidsCount: bidsData.length,
        auditLogCount: auditLogs.length,
        recentApiLogs: apiLogs.slice(0, 10),
        pendingActions: pendingActions,
        healthChecks: {
          hasPricing: !!pricing,
          hasInvoice: !!invoice,
          isPosted: ['posted', 'posted_open', 'posted_invite', 'assigned', 'bidding'].includes(load.status || ''),
          hasValidPrice: !!(load.finalPrice || load.adminFinalPrice),
          shipperVerified: !!shipper?.isVerified,
        },
      };

      // Log this view action
      await storage.createAuditLog({
        adminId: user.id,
        loadId: load.id,
        actionType: 'view_load',
        actionDescription: 'Admin viewed load diagnostics',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json(diagnostics);
    } catch (error) {
      console.error("Load diagnostics error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/admin/troubleshoot/force-post/:loadId - Force post a load
  app.post("/api/admin/troubleshoot/force-post/:loadId", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { reason, finalPrice, postMode, tempPost } = req.body;
      if (!reason) {
        return res.status(400).json({ error: "Admin reason required for force post" });
      }

      const load = await storage.getLoad(req.params.loadId);
      if (!load) {
        return res.status(404).json({ error: "Load not found" });
      }

      const beforeState = {
        status: load.status,
        finalPrice: load.finalPrice,
        adminFinalPrice: load.adminFinalPrice,
        postedAt: load.postedAt,
      };

      // Force update the load
      const price = finalPrice || load.adminFinalPrice || load.finalPrice || load.estimatedPrice || '0';
      const updated = await storage.updateLoad(load.id, {
        status: postMode === 'invite' ? 'posted_invite' : postMode === 'assign' ? 'assigned' : 'posted_open',
        adminFinalPrice: price,
        finalPrice: price,
        postedAt: new Date(),
        adminId: user.id,
        adminPostMode: postMode || 'open',
      });

      // Log the action
      await storage.createAuditLog({
        adminId: user.id,
        loadId: load.id,
        actionType: 'force_post',
        actionDescription: `Force posted load to ${postMode || 'open'} mode`,
        reason,
        beforeState,
        afterState: {
          status: updated?.status,
          finalPrice: updated?.finalPrice,
          adminFinalPrice: updated?.adminFinalPrice,
          postedAt: updated?.postedAt,
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        metadata: { tempPost: !!tempPost },
      });

      // Notify shipper
      await storage.createNotification({
        userId: load.shipperId,
        title: "Load Posted",
        message: `Your load from ${load.pickupCity} to ${load.dropoffCity} has been posted by admin.`,
        type: "load",
        relatedLoadId: load.id,
      });

      res.json({ success: true, load: updated });
    } catch (error) {
      console.error("Force post error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/admin/troubleshoot/requeue/:loadId - Requeue a failed post action
  app.post("/api/admin/troubleshoot/requeue/:loadId", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { actionType, payload, priority } = req.body;
      const load = await storage.getLoad(req.params.loadId);
      if (!load) {
        return res.status(404).json({ error: "Load not found" });
      }

      const queuedAction = await storage.createActionQueue({
        loadId: load.id,
        actionType: actionType || 'post',
        payload: payload || {},
        status: 'pending',
        priority: priority || 0,
        createdBy: user.id,
      });

      await storage.createAuditLog({
        adminId: user.id,
        loadId: load.id,
        actionType: 'requeue_post',
        actionDescription: `Requeued ${actionType || 'post'} action`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        metadata: { queueId: queuedAction.id },
      });

      res.json({ success: true, queuedAction });
    } catch (error) {
      console.error("Requeue error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/admin/troubleshoot/generate-invoice/:loadId - Generate standalone invoice (ONLY for awarded+ loads)
  app.post("/api/admin/troubleshoot/generate-invoice/:loadId", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { provisional, notes } = req.body;
      const load = await storage.getLoad(req.params.loadId);
      if (!load) {
        return res.status(404).json({ error: "Load not found" });
      }

      // CRITICAL: Verify load is in awarded state or later before allowing invoice creation
      const allowedStatesForInvoice = ['awarded', 'invoice_created', 'invoice_sent', 'invoice_acknowledged', 'invoice_paid', 'in_transit', 'delivered', 'closed'];
      if (!load.status || !allowedStatesForInvoice.includes(load.status)) {
        return res.status(400).json({ 
          error: "Invoice can only be created after carrier finalization (awarded state or later)" 
        });
      }

      // Check for existing invoice
      const existingInvoice = await storage.getInvoiceByLoad(load.id);
      if (existingInvoice && !provisional) {
        return res.status(400).json({ error: "Invoice already exists. Use provisional flag to create provisional invoice." });
      }

      const finalPrice = parseFloat(load.adminFinalPrice || load.finalPrice || load.estimatedPrice || '0');
      const taxRate = 0.18;
      const taxAmount = finalPrice * taxRate;
      const totalAmount = finalPrice + taxAmount;

      const invoiceNumber = await storage.generateInvoiceNumber();
      const invoice = await storage.createInvoice({
        invoiceNumber: provisional ? `PROV-${invoiceNumber}` : invoiceNumber,
        loadId: load.id,
        shipperId: load.shipperId,
        adminId: user.id,
        subtotal: String(finalPrice),
        taxPercent: '18',
        taxAmount: String(Math.round(taxAmount)),
        totalAmount: String(Math.round(totalAmount)),
        status: 'draft',
        notes: provisional ? `Provisional invoice - ${notes || 'Generated pending platform confirmation'}` : notes,
        paymentTerms: 'Net 30',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        lineItems: [
          { description: `Freight: ${load.pickupCity} to ${load.dropoffCity}`, amount: finalPrice }
        ],
      });

      await storage.createAuditLog({
        adminId: user.id,
        loadId: load.id,
        actionType: 'generate_invoice',
        actionDescription: provisional ? 'Generated provisional invoice' : 'Generated standalone invoice',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        metadata: { invoiceId: invoice.id, provisional },
      });

      res.status(201).json(invoice);
    } catch (error) {
      console.error("Generate invoice error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/admin/troubleshoot/send-invoice/:invoiceId - Send/resend invoice
  app.post("/api/admin/troubleshoot/send-invoice/:invoiceId", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { channel } = req.body; // email, sms, webhook
      const invoice = await storage.getInvoice(req.params.invoiceId);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      const updated = await storage.sendInvoice(invoice.id);

      // Notify shipper
      const load = await storage.getLoad(invoice.loadId);
      await storage.createNotification({
        userId: invoice.shipperId,
        title: "Invoice Sent",
        message: `Invoice ${invoice.invoiceNumber} for Rs. ${parseFloat(invoice.totalAmount).toLocaleString('en-IN')} has been sent for load ${load?.pickupCity} to ${load?.dropoffCity}.`,
        type: "payment",
        relatedLoadId: invoice.loadId,
      });

      await storage.createAuditLog({
        adminId: user.id,
        loadId: invoice.loadId,
        actionType: 'send_invoice',
        actionDescription: `Sent invoice via ${channel || 'email'}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        metadata: { invoiceId: invoice.id, channel: channel || 'email' },
      });

      res.json({ success: true, invoice: updated });
    } catch (error) {
      console.error("Send invoice error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/admin/troubleshoot/rollback-price/:loadId - Rollback to previous price
  app.post("/api/admin/troubleshoot/rollback-price/:loadId", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { reason, targetPricingId } = req.body;
      if (!reason) {
        return res.status(400).json({ error: "Reason required for price rollback" });
      }

      const load = await storage.getLoad(req.params.loadId);
      if (!load) {
        return res.status(404).json({ error: "Load not found" });
      }

      // Get pricing history
      const pricingHistory = await storage.getAdminPricingHistory(load.id);
      if (pricingHistory.length < 2 && !targetPricingId) {
        return res.status(400).json({ error: "No previous pricing to rollback to" });
      }

      const targetPricing = targetPricingId 
        ? pricingHistory.find(p => p.id === targetPricingId)
        : pricingHistory[1]; // Second most recent

      if (!targetPricing) {
        return res.status(404).json({ error: "Target pricing not found" });
      }

      const beforeState = {
        finalPrice: load.finalPrice,
        adminFinalPrice: load.adminFinalPrice,
      };

      await storage.updateLoad(load.id, {
        finalPrice: targetPricing.finalPrice,
        adminFinalPrice: targetPricing.finalPrice,
      });

      await storage.createAuditLog({
        adminId: user.id,
        loadId: load.id,
        actionType: 'rollback_price',
        actionDescription: `Rolled back price to ${targetPricing.finalPrice}`,
        reason,
        beforeState,
        afterState: { finalPrice: targetPricing.finalPrice, adminFinalPrice: targetPricing.finalPrice },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        metadata: { targetPricingId: targetPricing.id },
      });

      res.json({ success: true, rolledBackToPrice: targetPricing.finalPrice });
    } catch (error) {
      console.error("Rollback price error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /api/admin/troubleshoot/audit-trail/:loadId - Get audit trail for load
  app.get("/api/admin/troubleshoot/audit-trail/:loadId", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const auditLogs = await storage.getAuditLogsByLoad(req.params.loadId);
      res.json(auditLogs);
    } catch (error) {
      console.error("Get audit trail error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /api/admin/troubleshoot/api-logs/:loadId - Get API logs for load
  app.get("/api/admin/troubleshoot/api-logs/:loadId", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const apiLogsData = await storage.getApiLogsByLoad(req.params.loadId, limit);
      res.json(apiLogsData);
    } catch (error) {
      console.error("Get API logs error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /api/admin/feature-flags - Get all feature flags
  app.get("/api/admin/feature-flags", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const flags = await storage.getAllFeatureFlags();
      res.json(flags);
    } catch (error) {
      console.error("Get feature flags error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/admin/feature-flags/:name/toggle - Toggle feature flag
  app.post("/api/admin/feature-flags/:name/toggle", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { isEnabled } = req.body;
      const updated = await storage.toggleFeatureFlag(req.params.name, isEnabled, user.id);

      if (!updated) {
        // Create if doesn't exist
        const newFlag = await storage.createFeatureFlag({
          name: req.params.name,
          isEnabled,
          updatedBy: user.id,
        });

        await storage.createAuditLog({
          adminId: user.id,
          actionType: 'toggle_feature_flag',
          actionDescription: `Created and set feature flag ${req.params.name} to ${isEnabled}`,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          metadata: { flagName: req.params.name, isEnabled },
        });

        return res.json(newFlag);
      }

      await storage.createAuditLog({
        adminId: user.id,
        actionType: 'toggle_feature_flag',
        actionDescription: `Toggled feature flag ${req.params.name} to ${isEnabled}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        metadata: { flagName: req.params.name, isEnabled },
      });

      res.json(updated);
    } catch (error) {
      console.error("Toggle feature flag error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /api/admin/troubleshoot/queue - Get pending action queue
  app.get("/api/admin/troubleshoot/queue", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const pendingActions = await storage.getPendingActions();
      res.json(pendingActions);
    } catch (error) {
      console.error("Get action queue error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/admin/troubleshoot/queue/:id/process - Process queued action
  app.post("/api/admin/troubleshoot/queue/:id/process", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const action = await storage.getActionQueue(req.params.id);
      if (!action) {
        return res.status(404).json({ error: "Action not found" });
      }

      const processed = await storage.processActionQueue(action.id);
      res.json({ success: true, action: processed });
    } catch (error) {
      console.error("Process queue action error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ==================== CARRIER VERIFICATION ROUTES ====================

  // GET /api/admin/verifications - Get all carrier verifications
  app.get("/api/admin/verifications", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const verifications = await storage.getAllCarrierVerifications();
      
      // Enrich with carrier info and documents
      const enrichedVerifications = await Promise.all(
        verifications.map(async (v) => {
          const carrier = await storage.getUser(v.carrierId);
          const profile = await storage.getCarrierProfile(v.carrierId);
          const documents = await storage.getVerificationDocuments(v.id);
          return {
            ...v,
            carrier: carrier ? { username: carrier.username, companyName: carrier.companyName, email: carrier.email } : null,
            profile,
            documents,
          };
        })
      );

      res.json(enrichedVerifications);
    } catch (error) {
      console.error("Get verifications error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /api/admin/verifications/pending - Get pending verifications
  app.get("/api/admin/verifications/pending", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const verifications = await storage.getCarrierVerificationsByStatus("pending");
      
      const enrichedVerifications = await Promise.all(
        verifications.map(async (v) => {
          const carrier = await storage.getUser(v.carrierId);
          const profile = await storage.getCarrierProfile(v.carrierId);
          const documents = await storage.getVerificationDocuments(v.id);
          return {
            ...v,
            carrier: carrier ? { username: carrier.username, companyName: carrier.companyName, email: carrier.email } : null,
            profile,
            documents,
          };
        })
      );

      res.json(enrichedVerifications);
    } catch (error) {
      console.error("Get pending verifications error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/admin/verifications/:id/approve - Approve carrier verification
  app.post("/api/admin/verifications/:id/approve", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const verification = await storage.getCarrierVerification(req.params.id);
      if (!verification) {
        return res.status(404).json({ error: "Verification not found" });
      }

      // Validate request body - only allow safe fields
      const approveSchema = z.object({
        notes: z.string().optional(),
      });

      const validatedBody = approveSchema.parse(req.body);

      // Update verification status with server-controlled sensitive fields
      const updated = await storage.updateCarrierVerification(req.params.id, {
        status: "approved", // Server-controlled
        reviewedBy: user.id, // Always use authenticated admin
        reviewedAt: new Date(), // Server timestamp
        notes: validatedBody.notes,
      });

      // Also mark the user as verified
      await storage.updateUser(verification.carrierId, { isVerified: true });

      // Create audit log
      await storage.createAuditLog({
        adminId: user.id,
        userId: verification.carrierId,
        actionType: "approve_verification",
        actionDescription: `Approved carrier verification for ${verification.carrierId}`,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Approve verification error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/admin/verifications/:id/reject - Reject carrier verification
  app.post("/api/admin/verifications/:id/reject", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const verification = await storage.getCarrierVerification(req.params.id);
      if (!verification) {
        return res.status(404).json({ error: "Verification not found" });
      }

      // Validate request body - only allow safe fields
      const rejectSchema = z.object({
        reason: z.string().min(1, "Rejection reason is required"),
        notes: z.string().optional(),
      });

      const validatedBody = rejectSchema.parse(req.body);

      // Update verification with server-controlled sensitive fields
      const updated = await storage.updateCarrierVerification(req.params.id, {
        status: "rejected", // Server-controlled
        reviewedBy: user.id, // Always use authenticated admin
        reviewedAt: new Date(), // Server timestamp
        rejectionReason: validatedBody.reason,
        notes: validatedBody.notes,
      });

      // Create audit log
      await storage.createAuditLog({
        adminId: user.id,
        userId: verification.carrierId,
        actionType: "reject_verification",
        actionDescription: `Rejected carrier verification for ${verification.carrierId}: ${validatedBody.reason}`,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Reject verification error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/carrier/verification - Submit carrier verification request
  app.post("/api/carrier/verification", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "carrier") {
        return res.status(403).json({ error: "Carrier access required" });
      }

      // Check for existing pending verification
      const existing = await storage.getCarrierVerificationByCarrier(user.id);
      if (existing && existing.status === "pending") {
        return res.status(400).json({ error: "You already have a pending verification request" });
      }

      // Strict schema - ONLY user-controlled fields, using .strict() to reject unknown keys
      const userInputSchema = z.object({
        carrierType: z.enum(["solo", "enterprise"]).optional().default("solo"),
        fleetSize: z.number().int().min(1).optional().default(1),
        notes: z.string().optional(),
      }).strict();

      const userInput = userInputSchema.parse(req.body);

      // Build final payload with ONLY server-controlled sensitive fields
      const verification = await storage.createCarrierVerification({
        carrierId: user.id,
        carrierType: userInput.carrierType,
        fleetSize: userInput.fleetSize,
        status: "pending",
        notes: userInput.notes,
      });

      res.json(verification);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Submit verification error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /api/carrier/verification - Get carrier's own verification status
  app.get("/api/carrier/verification", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "carrier") {
        return res.status(403).json({ error: "Carrier access required" });
      }

      const verification = await storage.getCarrierVerificationByCarrier(user.id);
      if (!verification) {
        return res.json(null);
      }

      const documents = await storage.getVerificationDocuments(verification.id);
      res.json({ ...verification, documents });
    } catch (error) {
      console.error("Get carrier verification error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/carrier/verification/documents - Upload verification document
  app.post("/api/carrier/verification/documents", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "carrier") {
        return res.status(403).json({ error: "Carrier access required" });
      }

      const verification = await storage.getCarrierVerificationByCarrier(user.id);
      if (!verification) {
        return res.status(400).json({ error: "No verification request found. Please submit a verification request first." });
      }

      // Strict schema - ONLY user-controlled fields
      const userInputSchema = z.object({
        documentType: z.enum(["license", "rc", "insurance", "pan", "gst", "aadhar", "fleet_proof", "other"]),
        fileName: z.string().min(1),
        fileUrl: z.string().url(),
        fileSize: z.number().int().optional(),
        expiryDate: z.string().optional(),
      });

      const userInput = userInputSchema.parse(req.body);

      // Build final payload - server controls verificationId and carrierId
      const document = await storage.createVerificationDocument({
        verificationId: verification.id,
        carrierId: user.id,
        documentType: userInput.documentType,
        fileName: userInput.fileName,
        fileUrl: userInput.fileUrl,
        fileSize: userInput.fileSize,
        expiryDate: userInput.expiryDate ? new Date(userInput.expiryDate) : null,
      });

      res.json(document);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Upload verification document error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ==================== BID NEGOTIATION ROUTES ====================

  // GET /api/bids/:id/negotiations - Get bid negotiation history
  app.get("/api/bids/:id/negotiations", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ error: "Unauthorized" });

      const bid = await storage.getBid(req.params.id);
      if (!bid) {
        return res.status(404).json({ error: "Bid not found" });
      }

      const load = await storage.getLoad(bid.loadId);
      if (!load) {
        return res.status(404).json({ error: "Load not found" });
      }

      // Authorization: Only bid carrier, load shipper, or admin can view negotiations
      const isCarrier = user.id === bid.carrierId;
      const isShipper = user.id === load.shipperId;
      const isAdmin = user.role === "admin";

      if (!isCarrier && !isShipper && !isAdmin) {
        return res.status(403).json({ error: "Not authorized to view these negotiations" });
      }

      const negotiations = await storage.getBidNegotiations(req.params.id);
      
      // Enrich with sender info
      const enrichedNegotiations = await Promise.all(
        negotiations.map(async (n) => {
          const sender = n.senderId ? await storage.getUser(n.senderId) : null;
          return {
            ...n,
            sender: sender ? { username: sender.username, companyName: sender.companyName } : null,
          };
        })
      );

      res.json(enrichedNegotiations);
    } catch (error) {
      console.error("Get bid negotiations error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/bids/:id/negotiate - Add negotiation message/counter offer
  app.post("/api/bids/:id/negotiate", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ error: "Unauthorized" });

      const bid = await storage.getBid(req.params.id);
      if (!bid) {
        return res.status(404).json({ error: "Bid not found" });
      }

      const load = await storage.getLoad(bid.loadId);
      if (!load) {
        return res.status(404).json({ error: "Load not found" });
      }

      // Authorization: Only bid carrier, load shipper, or admin can negotiate
      const isCarrier = user.id === bid.carrierId;
      const isShipper = user.id === load.shipperId;
      const isAdmin = user.role === "admin";

      if (!isCarrier && !isShipper && !isAdmin) {
        return res.status(403).json({ error: "Not authorized to negotiate on this bid" });
      }

      // Strict schema - ONLY user-controlled fields
      const userInputSchema = z.object({
        messageType: z.enum(["message", "counter_offer", "accept", "reject"]).optional().default("message"),
        message: z.string().optional(),
        amount: z.string().optional(),
      });

      const userInput = userInputSchema.parse(req.body);

      // Build final payload - server controls senderId and senderRole from session
      const negotiation = await storage.createBidNegotiation({
        bidId: bid.id,
        loadId: bid.loadId,
        senderId: user.id,
        senderRole: user.role,
        messageType: userInput.messageType,
        message: userInput.message,
        amount: userInput.amount,
      });

      // Update bid if this is a counter offer
      if (userInput.messageType === "counter_offer" && userInput.amount) {
        await storage.updateBid(bid.id, {
          status: "countered",
          counterAmount: userInput.amount,
        });

        // Update load status if needed
        if (load.status === "open_for_bid") {
          await storage.updateLoad(load.id, { status: "counter_received" });
        }
      }

      res.json(negotiation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create bid negotiation error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ==================== INVOICE RESPONSE ROUTES ====================

  // GET /api/invoices/:id/responses - Get invoice responses/negotiation history
  app.get("/api/invoices/:id/responses", requireAuth, async (req, res) => {
    try {
      const responses = await storage.getShipperInvoiceResponses(req.params.id);
      res.json(responses);
    } catch (error) {
      console.error("Get invoice responses error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/invoices/:id/respond - Submit shipper response to invoice
  app.post("/api/invoices/:id/respond", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ error: "Unauthorized" });

      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      // Authorization: Verify shipper owns this invoice
      if (user.role !== "shipper" || user.id !== invoice.shipperId) {
        return res.status(403).json({ error: "Not authorized to respond to this invoice" });
      }

      // Validate allowed status transitions
      const allowedStatusesForResponse = ["pending", "sent", "viewed", "negotiating", "disputed"];
      if (!allowedStatusesForResponse.includes(invoice.status)) {
        return res.status(400).json({ error: `Cannot respond to invoice in ${invoice.status} status` });
      }

      // Strict schema - ONLY user-controlled fields
      const userInputSchema = z.object({
        responseType: z.enum(["approve", "negotiate", "query"]),
        message: z.string().optional(),
        counterAmount: z.string().optional(),
      });

      const userInput = userInputSchema.parse(req.body);

      // Build final payload - server controls invoiceId, loadId, shipperId
      const response = await storage.createShipperInvoiceResponse({
        invoiceId: invoice.id,
        loadId: invoice.loadId || "",
        shipperId: user.id,
        responseType: userInput.responseType,
        message: userInput.message,
        counterAmount: userInput.counterAmount,
      });

      // Update invoice status based on response type - server-controlled transitions
      if (userInput.responseType === "approve") {
        await storage.updateInvoice(invoice.id, {
          status: "approved",
          approvedAt: new Date(),
          shipperResponseType: "approve",
        });
      } else if (userInput.responseType === "negotiate") {
        await storage.updateInvoice(invoice.id, {
          status: "negotiating",
          shipperResponseType: "negotiate",
          shipperCounterAmount: userInput.counterAmount,
          shipperResponseMessage: userInput.message,
        });
      } else if (userInput.responseType === "query") {
        await storage.updateInvoice(invoice.id, {
          status: "disputed",
          shipperResponseType: "query",
          shipperResponseMessage: userInput.message,
        });
      }

      // Create invoice history entry
      await storage.createInvoiceHistory({
        invoiceId: invoice.id,
        userId: user.id,
        action: `shipper_${userInput.responseType}`,
        payload: { message: userInput.message, counterAmount: userInput.counterAmount },
      });

      res.json(response);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Submit invoice response error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/admin/invoices/:id/respond - Admin responds to shipper query/negotiation
  app.post("/api/admin/invoices/:id/respond", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      // Get the pending response
      const responses = await storage.getShipperInvoiceResponses(invoice.id);
      const pendingResponse = responses.find((r) => r.status === "pending");

      if (pendingResponse) {
        await storage.updateShipperInvoiceResponse(pendingResponse.id, {
          status: "resolved",
          adminResponse: req.body.message,
          adminRespondedAt: new Date(),
          adminId: user.id,
        });
      }

      // Update invoice based on admin action
      if (req.body.action === "accept_counter") {
        await storage.updateInvoice(invoice.id, {
          totalAmount: req.body.newAmount || invoice.shipperCounterAmount,
          status: "approved",
          approvedAt: new Date(),
        });
      } else if (req.body.action === "reject_counter") {
        await storage.updateInvoice(invoice.id, {
          status: "sent", // Back to sent status for re-review
        });
      }

      // Create audit log
      await storage.createAuditLog({
        adminId: user.id,
        actionType: "invoice_response",
        actionDescription: `Admin responded to invoice ${invoice.invoiceNumber}: ${req.body.action}`,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        metadata: { invoiceId: invoice.id, action: req.body.action },
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Admin invoice response error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // =============================================
  // LOAD STATE TRANSITION ENDPOINT
  // =============================================

  // POST /api/loads/:id/transition - Transition load to new state
  app.post("/api/loads/:id/transition", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { toStatus, reason } = req.body;
      if (!toStatus) {
        return res.status(400).json({ error: "toStatus is required" });
      }

      const load = await storage.getLoad(req.params.id);
      if (!load) {
        return res.status(404).json({ error: "Load not found" });
      }

      // Authorization: Only admins, the shipper who owns, or assigned carrier can transition
      const isAdmin = user.role === "admin";
      const isOwner = user.id === load.shipperId;
      const isAssignedCarrier = user.id === load.assignedCarrierId;

      if (!isAdmin && !isOwner && !isAssignedCarrier) {
        return res.status(403).json({ error: "Not authorized to transition this load" });
      }

      // Use the canonical state transition function
      const result = await transitionLoadState(load.id, toStatus, user.id, reason);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      const updatedLoad = await storage.getLoad(load.id);
      res.json({ success: true, load: updatedLoad });
    } catch (error) {
      console.error("Load transition error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // =============================================
  // SETTLEMENTS ENDPOINTS
  // =============================================

  // GET /api/settlements - Get all settlements (admin)
  app.get("/api/settlements", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const settlements = await storage.getAllSettlements();
      res.json(settlements);
    } catch (error) {
      console.error("Get settlements error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /api/settlements/carrier - Get settlements for current carrier
  app.get("/api/settlements/carrier", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "carrier") {
        return res.status(403).json({ error: "Carrier access required" });
      }

      const settlements = await storage.getSettlementsByCarrier(user.id);
      res.json(settlements);
    } catch (error) {
      console.error("Get carrier settlements error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/settlements - Create settlement (admin)
  app.post("/api/settlements", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const settlement = await storage.createSettlement(req.body);
      res.json(settlement);
    } catch (error) {
      console.error("Create settlement error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // PATCH /api/settlements/:id - Update settlement status
  app.patch("/api/settlements/:id", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const settlement = await storage.updateSettlement(req.params.id, req.body);
      res.json(settlement);
    } catch (error) {
      console.error("Update settlement error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // =============================================
  // CARRIER VERIFICATION ENDPOINTS
  // =============================================

  // GET /api/carrier-verifications - Get all pending verifications (admin)
  app.get("/api/carrier-verifications", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const verifications = await storage.getAllCarrierVerifications();
      res.json(verifications);
    } catch (error) {
      console.error("Get verifications error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /api/carrier-verifications/:carrierId - Get verification for specific carrier
  app.get("/api/carrier-verifications/:carrierId", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Allow admin or the carrier themselves
      if (user.role !== "admin" && user.id !== req.params.carrierId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const verification = await storage.getCarrierVerification(req.params.carrierId);
      res.json(verification || null);
    } catch (error) {
      console.error("Get verification error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // PATCH /api/carrier-verifications/:id - Update verification status (admin)
  app.patch("/api/carrier-verifications/:id", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const verification = await storage.updateCarrierVerification(req.params.id, req.body);
      res.json(verification);
    } catch (error) {
      console.error("Update verification error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // =============================================
  // CARRIERS ENDPOINTS (PUBLIC DATA)
  // =============================================

  // GET /api/carriers - Get all verified carriers
  app.get("/api/carriers", requireAuth, async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const carriers = allUsers.filter(u => u.role === "carrier" && u.isVerified);
      
      const carriersWithProfiles = await Promise.all(
        carriers.map(async (carrier) => {
          const profile = await storage.getCarrierProfile(carrier.id);
          const { password: _, ...carrierWithoutPassword } = carrier;
          return { ...carrierWithoutPassword, carrierProfile: profile };
        })
      );

      res.json(carriersWithProfiles);
    } catch (error) {
      console.error("Get carriers error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /api/carriers/:id - Get specific carrier details
  app.get("/api/carriers/:id", requireAuth, async (req, res) => {
    try {
      const carrier = await storage.getUser(req.params.id);
      if (!carrier || carrier.role !== "carrier") {
        return res.status(404).json({ error: "Carrier not found" });
      }

      const profile = await storage.getCarrierProfile(carrier.id);
      const { password: _, ...carrierWithoutPassword } = carrier;
      res.json({ ...carrierWithoutPassword, carrierProfile: profile });
    } catch (error) {
      console.error("Get carrier error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // =============================================
  // NOTIFICATIONS ENDPOINTS
  // =============================================

  // GET /api/notifications - Get notifications for current user
  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const notifications = await storage.getNotificationsByUser(req.session.userId!);
      res.json(notifications);
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // PATCH /api/notifications/:id/read - Mark notification as read
  app.patch("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      const notification = await storage.getNotification(req.params.id);
      if (!notification) {
        return res.status(404).json({ error: "Notification not found" });
      }

      if (notification.userId !== req.session.userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      await storage.markNotificationAsRead(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Mark notification read error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/notifications/read-all - Mark all notifications as read
  app.post("/api/notifications/read-all", requireAuth, async (req, res) => {
    try {
      await storage.markAllNotificationsAsRead(req.session.userId!);
      res.json({ success: true });
    } catch (error) {
      console.error("Mark all notifications read error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // =============================================
  // SHIPMENTS ENDPOINTS
  // =============================================

  // GET /api/shipments - Get all shipments (admin) or user's shipments
  app.get("/api/shipments", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      let shipments;
      if (user.role === "admin") {
        shipments = await storage.getAllShipments();
      } else if (user.role === "carrier") {
        shipments = await storage.getShipmentsByCarrier(user.id);
      } else {
        shipments = await storage.getShipmentsByShipper(user.id);
      }

      res.json(shipments);
    } catch (error) {
      console.error("Get shipments error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /api/shipments/:id - Get specific shipment
  app.get("/api/shipments/:id", requireAuth, async (req, res) => {
    try {
      const shipment = await storage.getShipment(req.params.id);
      if (!shipment) {
        return res.status(404).json({ error: "Shipment not found" });
      }
      res.json(shipment);
    } catch (error) {
      console.error("Get shipment error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /api/shipments/load/:loadId - Get shipment for a load
  app.get("/api/shipments/load/:loadId", requireAuth, async (req, res) => {
    try {
      const shipment = await storage.getShipmentByLoad(req.params.loadId);
      res.json(shipment || null);
    } catch (error) {
      console.error("Get shipment by load error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // =============================================
  // DOCUMENTS ENDPOINTS
  // =============================================

  // GET /api/documents - Get documents for current user
  app.get("/api/documents", requireAuth, async (req, res) => {
    try {
      const documents = await storage.getDocumentsByUser(req.session.userId!);
      res.json(documents);
    } catch (error) {
      console.error("Get documents error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /api/loads/:loadId/documents - Get documents for a load
  app.get("/api/loads/:loadId/documents", requireAuth, async (req, res) => {
    try {
      const documents = await storage.getDocumentsByLoad(req.params.loadId);
      res.json(documents);
    } catch (error) {
      console.error("Get load documents error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // =============================================
  // USERS ENDPOINT (ADMIN)
  // =============================================

  // GET /api/users - Get all users (admin only)
  app.get("/api/users", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const allUsers = await storage.getAllUsers();
      const usersWithoutPasswords = allUsers.map(u => {
        const { password: _, ...userWithoutPassword } = u;
        return userWithoutPassword;
      });
      res.json(usersWithoutPasswords);
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // =============================================
  // INVOICES GENERAL ENDPOINTS
  // =============================================

  // GET /api/invoices - Get invoices based on user role
  app.get("/api/invoices", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      let invoices;
      if (user.role === "admin") {
        invoices = await storage.getAllInvoices();
      } else if (user.role === "shipper") {
        invoices = await storage.getInvoicesByShipper(user.id);
        // Filter to show only sent+ invoices to shipper
        const visibleStatuses = ['sent', 'approved', 'acknowledged', 'paid', 'overdue', 'disputed'];
        invoices = invoices.filter(inv => visibleStatuses.includes(inv.status || ''));
      } else if (user.role === "carrier") {
        // Carriers see invoices for loads they delivered
        const allInvoices = await storage.getAllInvoices();
        const carrierLoads = await storage.getLoadsByCarrier(user.id);
        const carrierLoadIds = carrierLoads.map(l => l.id);
        invoices = allInvoices.filter(inv => carrierLoadIds.includes(inv.loadId || ''));
      } else {
        invoices = [];
      }

      res.json(invoices);
    } catch (error) {
      console.error("Get invoices error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /api/invoices/:id - Get specific invoice
  app.get("/api/invoices/:id", requireAuth, async (req, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      const user = await storage.getUser(req.session.userId!);
      // Authorization check
      if (user?.role !== "admin" && user?.id !== invoice.shipperId) {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json(invoice);
    } catch (error) {
      console.error("Get invoice error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/invoices - Create invoice (admin only, for completed loads)
  app.post("/api/invoices", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const invoice = await storage.createInvoice(req.body);
      res.json(invoice);
    } catch (error) {
      console.error("Create invoice error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // PATCH /api/invoices/:id - Update invoice
  app.patch("/api/invoices/:id", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const invoice = await storage.updateInvoice(req.params.id, req.body);
      res.json(invoice);
    } catch (error) {
      console.error("Update invoice error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/invoices/:id/send - Send invoice to shipper
  app.post("/api/invoices/:id/send", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      const updatedInvoice = await storage.updateInvoice(req.params.id, {
        status: 'sent',
        sentAt: new Date(),
        sentBy: user.id,
      });

      // Notify shipper
      if (invoice.shipperId) {
        await storage.createNotification({
          userId: invoice.shipperId,
          title: "New Invoice Received",
          message: `Invoice #${invoice.invoiceNumber} is ready for your review.`,
          type: "info",
          relatedLoadId: invoice.loadId || undefined,
        });
      }

      // Update load status
      if (invoice.loadId) {
        await transitionLoadState(invoice.loadId, 'invoice_sent', user.id, 'Invoice sent to shipper');
      }

      res.json({ success: true, invoice: updatedInvoice });
    } catch (error) {
      console.error("Send invoice error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // =============================================
  // LOAD HISTORY ENDPOINT
  // =============================================

  // GET /api/loads/:id/history - Get load state history
  app.get("/api/loads/:id/history", requireAuth, async (req, res) => {
    try {
      const history = await storage.getLoadStateHistory(req.params.id);
      res.json(history);
    } catch (error) {
      console.error("Get load history error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // =============================================
  // NEGOTIATION THREADS ENDPOINT
  // =============================================

  // GET /api/negotiations - Get negotiation threads for current user
  app.get("/api/negotiations", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (user.role === "admin") {
        const threads = await storage.getAllNegotiationThreads();
        res.json(threads);
      } else {
        // Get threads for loads user is involved in
        const userLoads = user.role === "shipper" 
          ? await storage.getLoadsByShipper(user.id)
          : await storage.getLoadsByCarrier(user.id);
        
        const threads = await Promise.all(
          userLoads.map(load => storage.getNegotiationThread(load.id))
        );
        res.json(threads.filter(Boolean));
      }
    } catch (error) {
      console.error("Get negotiations error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /api/negotiations/:loadId - Get specific thread
  app.get("/api/negotiations/:loadId", requireAuth, async (req, res) => {
    try {
      const thread = await storage.getNegotiationThread(req.params.loadId);
      res.json(thread || null);
    } catch (error) {
      console.error("Get negotiation thread error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Setup WebSocket for real-time telemetry
  setupTelemetryWebSocket(httpServer);

  return httpServer;
}
