import { storage } from "./storage";
import { validStateTransitions, LoadStatus, BidStatus } from "@shared/schema";
import type { Load, Bid, User } from "@shared/schema";

/**
 * Workflow Service - Centralized business logic for the Admin-Managed Freight Exchange
 * 
 * LOAD LIFECYCLE:
 * draft → pending → priced → posted_to_carriers → open_for_bid → counter_received → awarded → invoice_sent → invoice_approved → in_transit → delivered → closed
 * 
 * RULES:
 * 1. State transitions must follow validStateTransitions map
 * 2. Role-based visibility enforced at query level
 * 3. Carrier eligibility verified before showing loads
 * 4. Bid states properly managed with auto-close on acceptance
 */

// ============================================================================
// STATE TRANSITION VALIDATION
// ============================================================================

export function canTransitionTo(currentStatus: LoadStatus, newStatus: LoadStatus): boolean {
  const allowedTransitions = validStateTransitions[currentStatus];
  return allowedTransitions?.includes(newStatus) ?? false;
}

export async function transitionLoadState(
  loadId: string,
  newStatus: LoadStatus,
  changedBy: string,
  note?: string
): Promise<{ success: boolean; error?: string; load?: Load }> {
  try {
    // Use storage's built-in transition which validates and logs
    const updatedLoad = await storage.transitionLoadState(loadId, newStatus, changedBy, note);
    return { success: true, load: updatedLoad };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to transition load state" };
  }
}

// ============================================================================
// ROLE-BASED VISIBILITY
// ============================================================================

export async function getLoadsForRole(
  user: User
): Promise<Load[]> {
  const allLoads = await storage.getAllLoads();

  switch (user.role) {
    case "admin":
      // Admin sees ALL loads, ALL states
      return allLoads;

    case "shipper":
      // Shipper sees only their own loads in specific states
      const shipperVisibleStates: LoadStatus[] = [
        "pending", "priced", "awarded", "invoice_sent", "invoice_approved", 
        "in_transit", "delivered", "closed"
      ];
      return allLoads.filter(load => 
        load.shipperId === user.id && 
        shipperVisibleStates.includes((load.status || "draft") as LoadStatus)
      );

    case "carrier":
      // Carrier sees only eligible loads in posted/bidding states
      return getEligibleLoadsForCarrier(user, allLoads);

    default:
      return [];
  }
}

// ============================================================================
// CARRIER ELIGIBILITY FILTERS
// ============================================================================

export interface CarrierEligibilityResult {
  eligible: boolean;
  reasons: string[];
}

export async function checkCarrierEligibility(
  carrierId: string,
  load: Load
): Promise<CarrierEligibilityResult> {
  const reasons: string[] = [];
  
  const carrier = await storage.getUser(carrierId);
  if (!carrier) {
    return { eligible: false, reasons: ["Carrier not found"] };
  }

  // 1. Check carrier is verified
  if (!carrier.isVerified) {
    reasons.push("Carrier not verified");
  }

  // 2. Get carrier profile for additional checks
  const profile = await storage.getCarrierProfile(carrierId);
  
  if (profile) {
    // 3. Check minimum rating (if applicable) - require at least 2.0 reliability score
    const reliabilityScore = parseFloat(profile.reliabilityScore?.toString() || "0");
    if (reliabilityScore > 0 && reliabilityScore < 2.0) {
      reasons.push("Reliability score below minimum threshold");
    }

    // 4. Check service region compatibility (if defined)
    if (profile.serviceZones && profile.serviceZones.length > 0 && load.pickupCity) {
      const pickupRegion = extractRegion(load.pickupCity);
      const dropoffRegion = extractRegion(load.dropoffCity);
      
      const servesPickup = profile.serviceZones.some(zone => 
        zone.toLowerCase().includes(pickupRegion.toLowerCase()) ||
        pickupRegion.toLowerCase().includes(zone.toLowerCase())
      );
      const servesDropoff = profile.serviceZones.some(zone => 
        zone.toLowerCase().includes(dropoffRegion.toLowerCase()) ||
        dropoffRegion.toLowerCase().includes(zone.toLowerCase())
      );
      
      if (!servesPickup && !servesDropoff) {
        reasons.push("Service zone mismatch");
      }
    }
  }

  // 5. Check truck type compatibility
  if (load.requiredTruckType) {
    const trucks = await storage.getTrucksByCarrier(carrierId);
    const hasMatchingTruck = trucks.some(truck => 
      truck.truckType === load.requiredTruckType && truck.isAvailable
    );
    if (!hasMatchingTruck) {
      reasons.push("No matching truck type available");
    }
  }

  // 6. Check if carrier is blocked/suspended (using isVerified as proxy)
  // In a full implementation, you'd have a separate blocked/suspended flag

  // 7. Check posting mode restrictions
  if (load.adminPostMode === "invite") {
    const invitedIds = load.invitedCarrierIds || [];
    if (!invitedIds.includes(carrierId)) {
      reasons.push("Not invited to this load");
    }
  } else if (load.adminPostMode === "assign") {
    if (load.assignedCarrierId !== carrierId) {
      reasons.push("Load assigned to different carrier");
    }
  }

  return {
    eligible: reasons.length === 0,
    reasons
  };
}

function extractRegion(city: string): string {
  // Extract state/region code from city string like "Mumbai, MH" or "Delhi, DL"
  const parts = city.split(",").map(p => p.trim());
  return parts.length > 1 ? parts[parts.length - 1] : parts[0];
}

async function getEligibleLoadsForCarrier(
  carrier: User,
  allLoads: Load[]
): Promise<Load[]> {
  // Carrier-visible states only
  const carrierVisibleStates: LoadStatus[] = [
    "posted_to_carriers", "open_for_bid"
  ];

  const eligibleLoads: Load[] = [];

  for (const load of allLoads) {
    const status = (load.status || "draft") as LoadStatus;
    
    // Skip if not in carrier-visible state
    if (!carrierVisibleStates.includes(status)) {
      continue;
    }

    // Skip if already awarded to another carrier
    if (load.assignedCarrierId && load.assignedCarrierId !== carrier.id) {
      continue;
    }

    // Check full eligibility
    const eligibility = await checkCarrierEligibility(carrier.id, load);
    if (eligibility.eligible) {
      eligibleLoads.push(load);
    }
  }

  return eligibleLoads;
}

// ============================================================================
// BID STATE MANAGEMENT
// ============================================================================

export const bidStateTransitions: Record<BidStatus, BidStatus[]> = {
  pending: ["accepted", "rejected", "countered", "expired"],
  countered: ["accepted", "rejected", "expired"],
  accepted: [],  // Terminal state
  rejected: [],  // Terminal state
  expired: [],   // Terminal state
};

export function canTransitionBid(current: BidStatus, next: BidStatus): boolean {
  return bidStateTransitions[current]?.includes(next) ?? false;
}

export async function acceptBid(
  bidId: string,
  acceptedBy: string
): Promise<{ success: boolean; error?: string; bid?: Bid }> {
  const bid = await storage.getBid(bidId);
  if (!bid) {
    return { success: false, error: "Bid not found" };
  }

  const currentStatus = (bid.status || "pending") as BidStatus;
  if (!canTransitionBid(currentStatus, "accepted")) {
    return { 
      success: false, 
      error: `Cannot accept bid in status: ${currentStatus}` 
    };
  }

  // Accept this bid (use only existing schema fields)
  const updatedBid = await storage.updateBid(bidId, { 
    status: "accepted",
    notes: `Accepted by ${acceptedBy} at ${new Date().toISOString()}`
  });

  // Auto-close all other bids for this load
  const otherBids = await storage.getBidsByLoad(bid.loadId);
  for (const otherBid of otherBids) {
    if (otherBid.id !== bidId && otherBid.status === "pending") {
      await storage.updateBid(otherBid.id, { 
        status: "rejected",
        notes: "Auto-rejected: Another bid was accepted"
      });
    }
  }

  // Transition load to awarded state
  const load = await storage.getLoad(bid.loadId);
  if (load) {
    await transitionLoadState(bid.loadId, "awarded", acceptedBy, `Bid ${bidId} accepted`);
    await storage.updateLoad(bid.loadId, {
      assignedCarrierId: bid.carrierId,
      assignedTruckId: bid.truckId,
      finalPrice: bid.amount,
      awardedBidId: bidId,
    });
  }

  return { success: true, bid: updatedBid };
}

export async function rejectBid(
  bidId: string,
  rejectedBy: string,
  reason?: string
): Promise<{ success: boolean; error?: string; bid?: Bid }> {
  const bid = await storage.getBid(bidId);
  if (!bid) {
    return { success: false, error: "Bid not found" };
  }

  const currentStatus = (bid.status || "pending") as BidStatus;
  if (!canTransitionBid(currentStatus, "rejected")) {
    return { 
      success: false, 
      error: `Cannot reject bid in status: ${currentStatus}` 
    };
  }

  const updatedBid = await storage.updateBid(bidId, { 
    status: "rejected",
    notes: reason || `Rejected by ${rejectedBy}`
  });

  return { success: true, bid: updatedBid };
}

export async function counterBid(
  bidId: string,
  newAmount: string,
  counteredBy: string,
  notes?: string
): Promise<{ success: boolean; error?: string; bid?: Bid }> {
  const bid = await storage.getBid(bidId);
  if (!bid) {
    return { success: false, error: "Bid not found" };
  }

  const currentStatus = (bid.status || "pending") as BidStatus;
  if (!canTransitionBid(currentStatus, "countered")) {
    return { 
      success: false, 
      error: `Cannot counter bid in status: ${currentStatus}` 
    };
  }

  const updatedBid = await storage.updateBid(bidId, { 
    status: "countered",
    counterAmount: newAmount,
    notes: notes || `Counter offer: ${newAmount} by ${counteredBy}`
  });

  // Update load to counter_received state
  const load = await storage.getLoad(bid.loadId);
  if (load) {
    await transitionLoadState(bid.loadId, "counter_received", counteredBy, `Counter bid on ${bidId}`);
  }

  return { success: true, bid: updatedBid };
}

// ============================================================================
// VISIBILITY HELPERS FOR API ROUTES
// ============================================================================

export async function canUserAccessLoad(userId: string, loadId: string): Promise<boolean> {
  const user = await storage.getUser(userId);
  if (!user) return false;

  const load = await storage.getLoad(loadId);
  if (!load) return false;

  switch (user.role) {
    case "admin":
      return true;
    case "shipper":
      return load.shipperId === user.id;
    case "carrier":
      const eligibility = await checkCarrierEligibility(user.id, load);
      return eligibility.eligible || load.assignedCarrierId === user.id;
    default:
      return false;
  }
}

export async function canUserBidOnLoad(userId: string, loadId: string): Promise<{ allowed: boolean; reason?: string }> {
  const user = await storage.getUser(userId);
  if (!user) {
    return { allowed: false, reason: "User not found" };
  }

  if (user.role !== "carrier") {
    return { allowed: false, reason: "Only carriers can bid" };
  }

  const load = await storage.getLoad(loadId);
  if (!load) {
    return { allowed: false, reason: "Load not found" };
  }

  // Check load is in biddable state
  const biddableStates: LoadStatus[] = ["posted_to_carriers", "open_for_bid"];
  if (!biddableStates.includes((load.status || "draft") as LoadStatus)) {
    return { allowed: false, reason: `Load not open for bidding (status: ${load.status})` };
  }

  // Check carrier eligibility
  const eligibility = await checkCarrierEligibility(user.id, load);
  if (!eligibility.eligible) {
    return { allowed: false, reason: eligibility.reasons.join(", ") };
  }

  // Check if carrier already has an active bid
  const existingBids = await storage.getBidsByLoad(loadId);
  const carrierBid = existingBids.find(b => b.carrierId === userId && b.status === "pending");
  if (carrierBid) {
    return { allowed: false, reason: "You already have a pending bid on this load" };
  }

  return { allowed: true };
}
