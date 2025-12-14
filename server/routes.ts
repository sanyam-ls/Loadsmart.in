import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import { insertUserSchema, insertLoadSchema, insertTruckSchema, insertBidSchema } from "@shared/schema";
import { z } from "zod";
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

  app.get("/api/loads", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ error: "Unauthorized" });

      let loadsList;
      if (user.role === "shipper") {
        loadsList = await storage.getLoadsByShipper(user.id);
      } else if (user.role === "carrier") {
        loadsList = await storage.getAvailableLoads();
      } else {
        loadsList = await storage.getAllLoads();
      }

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
      const load = await storage.getLoad(req.params.id);
      if (!load) {
        return res.status(404).json({ error: "Load not found" });
      }
      const loadBids = await storage.getBidsByLoad(load.id);
      res.json({ ...load, bids: loadBids });
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
        const shipperLoads = await storage.getLoadsByShipper(user.id);
        const allBids = await Promise.all(
          shipperLoads.map(load => storage.getBidsByLoad(load.id))
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
      const bid = await storage.updateBid(req.params.id, req.body);
      
      if (req.body.status === "accepted" && bid) {
        await storage.updateLoad(bid.loadId, {
          status: "assigned",
          assignedCarrierId: bid.carrierId,
          assignedTruckId: bid.truckId,
          finalPrice: bid.amount,
        });
        
        const otherBids = await storage.getBidsByLoad(bid.loadId);
        for (const otherBid of otherBids) {
          if (otherBid.id !== bid.id && otherBid.status === "pending") {
            await storage.updateBid(otherBid.id, { status: "rejected" });
          }
        }
      }

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
        status: newStatus
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

  // Get admin-posted loads for carriers
  app.get("/api/carrier/loads", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "carrier") {
        return res.status(403).json({ error: "Carrier access required" });
      }

      const adminPostedLoads = await storage.getAdminPostedLoads();
      
      // Filter based on posting mode
      const visibleLoads = adminPostedLoads.filter(load => {
        if (load.adminPostMode === 'open') return true;
        if (load.adminPostMode === 'invite' && load.invitedCarrierIds?.includes(user.id)) return true;
        if (load.adminPostMode === 'assign' && load.assignedCarrierId === user.id) return true;
        return false;
      });

      const enrichedLoads = await Promise.all(
        visibleLoads.map(async (load) => {
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

  // Carrier accepts admin price or submits counter bid
  app.post("/api/bids/submit", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "carrier") {
        return res.status(403).json({ error: "Only carriers can submit bids" });
      }

      const { load_id, amount, bid_type, notes, truck_id } = req.body;

      const load = await storage.getLoad(load_id);
      if (!load) {
        return res.status(404).json({ error: "Load not found" });
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

      const bid = await storage.createBid({
        loadId: load_id,
        carrierId: user.id,
        truckId: truck_id || null,
        amount: finalAmount,
        notes: notes || null,
        status: 'pending',
        bidType: finalBidType,
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
          adminCounterAmount: counter_amount,
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

      // Generate invoice for shipper - they need to confirm this before bidding begins
      let invoiceCreated = false;
      try {
        const existingInvoice = await storage.getInvoiceByLoad(load.id);
        if (!existingInvoice) {
          const taxRate = 0.18; // 18% GST
          const taxAmount = Math.round(finalPrice * taxRate);
          const totalAmount = finalPrice + taxAmount;
          
          const invoiceNumber = await storage.generateInvoiceNumber();
          const invoice = await storage.createInvoice({
            invoiceNumber,
            loadId: load.id,
            shipperId: load.shipperId,
            adminId: user.id,
            subtotal: finalPrice.toString(),
            taxPercent: '18',
            taxAmount: taxAmount.toString(),
            totalAmount: totalAmount.toString(),
            status: 'draft',
            paymentTerms: 'Net 30',
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            lineItems: [
              { 
                description: `Freight Transportation: ${load.pickupCity} to ${load.dropoffCity}`, 
                quantity: 1,
                rate: finalPrice,
                amount: finalPrice 
              }
            ],
            notes: `Load ID: ${load.id}`,
          });

          // Auto-send invoice to shipper
          await storage.sendInvoice(invoice.id);
          invoiceCreated = true;
        }
      } catch (invoiceError) {
        console.error("Invoice creation error:", invoiceError);
      }

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
        invoice_created: invoiceCreated,
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

      // Generate invoice for shipper
      let invoiceCreated = false;
      try {
        const existingInvoice = await storage.getInvoiceByLoad(load.id);
        if (!existingInvoice) {
          const taxRate = 0.18;
          const taxAmount = Math.round(finalPrice * taxRate);
          const totalAmount = finalPrice + taxAmount;
          
          const invoiceNumber = await storage.generateInvoiceNumber();
          const invoice = await storage.createInvoice({
            invoiceNumber,
            loadId: load.id,
            shipperId: load.shipperId,
            adminId: user.id,
            subtotal: finalPrice.toString(),
            taxPercent: '18',
            taxAmount: taxAmount.toString(),
            totalAmount: totalAmount.toString(),
            status: 'draft',
            paymentTerms: 'Net 30',
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            lineItems: [
              { 
                description: `Freight Transportation: ${load.pickupCity} to ${load.dropoffCity}`, 
                quantity: 1,
                rate: finalPrice,
                amount: finalPrice 
              }
            ],
            notes: `Load ID: ${load.id}`,
          });

          await storage.sendInvoice(invoice.id);
          invoiceCreated = true;
        }
      } catch (invoiceError) {
        console.error("Invoice creation error:", invoiceError);
      }

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
        invoice_created: invoiceCreated,
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
  app.get("/api/invoices/shipper", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "shipper") {
        return res.status(403).json({ error: "Shipper access required" });
      }

      const invoices = await storage.getInvoicesByShipper(user.id);
      res.json(invoices);
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
        status: 'confirmed',
      });

      // Get the load and post it for carrier bidding
      const load = await storage.getLoad(invoice.loadId);
      if (!load) {
        return res.status(404).json({ error: "Load not found" });
      }

      // First transition to 'invoice_approved' then to 'open_for_bids' (canonical states)
      const postMode = load.adminPostMode || 'open';
      
      // Update load status - NOW carriers can see and bid (using canonical 'open_for_bids')
      await storage.updateLoad(load.id, {
        status: 'open_for_bids',
        previousStatus: load.status,
        postedAt: new Date(),
        statusChangedBy: user.id,
        statusChangedAt: new Date(),
        statusNote: 'Invoice approved by shipper - load opened for carrier bidding',
      });

      // Update pricing status to posted
      const pricing = await storage.getAdminPricingByLoad(load.id);
      if (pricing) {
        await storage.updateAdminPricing(pricing.id, { status: 'posted' });
      }

      const finalPrice = parseFloat(load.adminFinalPrice?.toString() || '0');

      // Notify shipper of confirmation
      await storage.createNotification({
        userId: user.id,
        title: "Invoice Confirmed",
        message: `You have confirmed the invoice. Your load is now posted for carrier bidding.`,
        type: "success",
        relatedLoadId: load.id,
      });

      // NOW notify carriers - this is when bidding begins
      if (postMode === 'open') {
        const allUsers = await storage.getAllUsers();
        const carriers = allUsers.filter(u => u.role === 'carrier');
        for (const carrier of carriers.slice(0, 20)) {
          await storage.createNotification({
            userId: carrier.id,
            title: "New Load Available",
            message: `New load available: ${load.pickupCity} → ${load.dropoffCity} at Rs. ${finalPrice.toLocaleString('en-IN')}`,
            type: "info",
            relatedLoadId: load.id,
          });
        }
      }

      // If invite mode, notify invited carriers
      if (postMode === 'invite' && load.invitedCarrierIds?.length) {
        for (const carrierId of load.invitedCarrierIds) {
          await storage.createNotification({
            userId: carrierId,
            title: "New Load Invitation",
            message: `You've been invited to bid on a load: ${load.pickupCity} → ${load.dropoffCity} at Rs. ${finalPrice.toLocaleString('en-IN')}`,
            type: "info",
            relatedLoadId: load.id,
          });
        }
      }

      // Notify admins that shipper confirmed
      const allUsers = await storage.getAllUsers();
      const admins = allUsers.filter(u => u.role === 'admin');
      for (const admin of admins) {
        await storage.createNotification({
          userId: admin.id,
          title: "Shipper Confirmed Invoice",
          message: `Shipper ${user.companyName || user.username} confirmed invoice. Load is now open for carrier bidding.`,
          type: "success",
          relatedLoadId: load.id,
        });
      }

      res.json({ 
        success: true, 
        invoice: updatedInvoice,
        load_status: 'open_for_bids',
        message: "Invoice approved. Load is now open for carrier bidding.",
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

  // POST /api/admin/invoices - Create new invoice
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
      
      // Create notification for shipper
      const load = await storage.getLoad(invoice.loadId);
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

      const updated = await storage.markInvoicePaid(req.params.id, {
        paidAmount,
        paymentMethod,
        paymentReference,
      });

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

  // POST /api/admin/invoices/generate - Generate invoice from Invoice Builder
  app.post("/api/admin/invoices/generate", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { loadId, shipperId, lineItems, subtotal, discountAmount, discountReason,
              taxPercent, taxAmount, totalAmount, paymentTerms, dueDate, notes,
              platformMargin, estimatedCarrierPayout, status, sendToShipper, idempotencyKey } = req.body;

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
        
        const load = await storage.getLoad(loadId);
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

  // POST /api/admin/troubleshoot/generate-invoice/:loadId - Generate standalone invoice
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

  // Setup WebSocket for real-time telemetry
  setupTelemetryWebSocket(httpServer);

  return httpServer;
}
