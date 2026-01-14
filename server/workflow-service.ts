import { storage } from "./storage";
import { validStateTransitions, LoadStatus, BidStatus } from "@shared/schema";
import type { Load, Bid, User } from "@shared/schema";
import { 
  broadcastLoadUpdated, 
  broadcastBidAccepted, 
  broadcastBidRejected 
} from "./websocket-marketplace";

/**
 * Workflow Service - Centralized business logic for the Admin-Managed Freight Exchange
 * 
 * LOAD LIFECYCLE (12 Core States):
 * draft → pending → priced → posted_to_carriers → open_for_bid → counter_received → awarded 
 *      → invoice_created → invoice_sent → invoice_acknowledged → invoice_paid → in_transit → delivered → closed
 * 
 * RULES:
 * 1. State transitions must follow validStateTransitions map
 * 2. Role-based visibility enforced at query level
 * 3. Carrier eligibility verified before showing loads
 * 4. Bid states properly managed with auto-close on acceptance
 * 5. Invoice unlocked ONLY after CARRIER_FINALIZED (awarded state)
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
      // Admin sees ALL loads except unavailable (shippers hide those from admin/carriers)
      return allLoads.filter(load => 
        (load.status || "draft") !== "unavailable"
      );

    case "shipper":
      // Shipper sees only their own loads across the full lifecycle
      // From submission through delivery, including unavailable loads they've hidden
      const shipperVisibleStates: LoadStatus[] = [
        "pending", "priced", "posted_to_carriers", "open_for_bid", "counter_received",
        "awarded", "invoice_created", "invoice_sent", "invoice_acknowledged", "invoice_paid", 
        "in_transit", "delivered", "closed", "unavailable"
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
  
  const loadStatus = (load.status || "draft") as LoadStatus;
  
  // Allow assigned carrier to see their awarded/in-progress loads
  const isAssignedCarrier = load.assignedCarrierId === carrierId;
  const assignedCarrierVisibleStates: LoadStatus[] = [
    "awarded", "invoice_created", "invoice_sent", "invoice_acknowledged", "invoice_paid", "in_transit", "delivered"
  ];
  
  if (isAssignedCarrier && assignedCarrierVisibleStates.includes(loadStatus)) {
    // Assigned carrier can always see their loads in execution states
    return { eligible: true, reasons: [] };
  }

  // 0. Check load is in carrier-visible state for bidding
  // Include "counter_received" to allow simultaneous bids from multiple carriers
  // (both solo drivers and enterprise carriers can bid on the same load)
  const carrierBiddableStates: LoadStatus[] = ["posted_to_carriers", "open_for_bid", "counter_received"];
  if (!carrierBiddableStates.includes(loadStatus)) {
    reasons.push(`Load not open for bidding (status: ${loadStatus})`);
  }

  // 0b. Skip if already awarded to another carrier (ONLY for post-awarded states)
  // During bidding states (posted_to_carriers, open_for_bid, counter_received),
  // ALL carriers can still see and bid on the load even if assignedCarrierId is set
  // This enables dual marketplace simultaneous bidding
  const postAwardedStates: LoadStatus[] = ["awarded", "invoice_created", "invoice_sent", "invoice_acknowledged", "invoice_paid", "in_transit", "delivered", "closed"];
  if (load.assignedCarrierId && load.assignedCarrierId !== carrierId && postAwardedStates.includes(loadStatus)) {
    reasons.push("Load already assigned to another carrier");
  }
  
  const carrier = await storage.getUser(carrierId);
  if (!carrier) {
    return { eligible: false, reasons: ["Carrier not found"] };
  }

  // 1. Check carrier is verified - SOFT CHECK (warning only, not blocking for MVP)
  // In production, you'd make this a hard requirement
  // if (!carrier.isVerified) {
  //   reasons.push("Carrier not verified");
  // }

  // 2. Get carrier profile for additional checks
  const profile = await storage.getCarrierProfile(carrierId);
  
  if (profile) {
    // 3. Check minimum rating (if applicable) - require at least 2.0 reliability score
    const reliabilityScore = parseFloat(profile.reliabilityScore?.toString() || "0");
    if (reliabilityScore > 0 && reliabilityScore < 2.0) {
      reasons.push("Reliability score below minimum threshold");
    }

    // 4. Check service region compatibility - SOFT CHECK for MVP
    // Service zones are optional hints, not hard requirements
    // if (profile.serviceZones && profile.serviceZones.length > 0 && load.pickupCity) {
    //   const pickupRegion = extractRegion(load.pickupCity);
    //   const dropoffRegion = extractRegion(load.dropoffCity);
    //   
    //   const servesPickup = profile.serviceZones.some(zone => 
    //     zone.toLowerCase().includes(pickupRegion.toLowerCase()) ||
    //     pickupRegion.toLowerCase().includes(zone.toLowerCase())
    //   );
    //   const servesDropoff = profile.serviceZones.some(zone => 
    //     zone.toLowerCase().includes(dropoffRegion.toLowerCase()) ||
    //     dropoffRegion.toLowerCase().includes(zone.toLowerCase())
    //   );
    //   
    //   if (!servesPickup && !servesDropoff) {
    //     reasons.push("Service zone mismatch");
    //   }
    // }
  }

  // 5. Check truck type compatibility - SOFT CHECK for MVP
  // Carriers can bid even without pre-registered matching trucks
  // if (load.requiredTruckType) {
  //   const trucks = await storage.getTrucksByCarrier(carrierId);
  //   const hasMatchingTruck = trucks.some(truck => 
  //     truck.truckType === load.requiredTruckType && truck.isAvailable
  //   );
  //   if (!hasMatchingTruck) {
  //     reasons.push("No matching truck type available");
  //   }
  // }

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
  const eligibleLoads: Load[] = [];

  for (const load of allLoads) {
    // Check full eligibility (includes status, assignment, posting mode, and carrier checks)
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
  acceptedBy: string,
  finalPrice?: number  // Optional: the final negotiated price from counter-offers
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

  // Use the final negotiated price if provided, otherwise use counter amount (if countered), otherwise original bid
  // This ensures negotiated counter offers are properly used when carrier accepted the counter
  const acceptedAmount = finalPrice != null 
    ? finalPrice.toString() 
    : (bid.counterAmount && bid.status === "countered") 
      ? bid.counterAmount.toString() 
      : bid.amount;

  // Accept this bid (use only existing schema fields)
  const updatedBid = await storage.updateBid(bidId, { 
    status: "accepted",
    amount: acceptedAmount,  // Update bid amount to reflect negotiated price
    notes: `Accepted by ${acceptedBy} at ${new Date().toISOString()} for Rs. ${parseFloat(acceptedAmount).toLocaleString("en-IN")}`
  });

  // Auto-close all other bids for this load (both pending and countered, from any carrier type)
  const otherBids = await storage.getBidsByLoad(bid.loadId);
  for (const otherBid of otherBids) {
    if (otherBid.id !== bidId && (otherBid.status === "pending" || otherBid.status === "countered")) {
      await storage.updateBid(otherBid.id, { 
        status: "rejected",
        notes: `Auto-rejected: Another bid was accepted (${otherBid.carrierType || "enterprise"} carrier bid closed)`
      });
    }
  }

  // Transition load to invoice_created state and create invoice
  // Shipment will be created later when shipper acknowledges the invoice
  const load = await storage.getLoad(bid.loadId);
  if (load) {
    await transitionLoadState(bid.loadId, "invoice_created", acceptedBy, `Bid ${bidId} accepted at Rs. ${parseFloat(acceptedAmount).toLocaleString("en-IN")}`);
    
    // Generate unique 4-digit pickup ID for carrier verification
    const pickupId = await storage.generateUniquePickupId();
    
    await storage.updateLoad(bid.loadId, {
      assignedCarrierId: bid.carrierId,
      assignedTruckId: bid.truckId,
      finalPrice: acceptedAmount,  // Use the negotiated final price
      awardedBidId: bidId,
      pickupId: pickupId,  // Unique 4-digit code for carrier pickup
    });

    // Note: Shipment is NOT created here - it will be created when shipper acknowledges invoice

    // Create invoice now that carrier is finalized (if not already exists)
    try {
      const existingInvoice = await storage.getInvoiceByLoad(load.id);
      if (!existingInvoice) {
        const invoiceNumber = await storage.generateInvoiceNumber();
        const finalAmount = acceptedAmount || load.adminFinalPrice || "0";  // Use negotiated price
        
        // Calculate advance payment from load (no GST applied - total equals subtotal)
        const advancePercent = load.advancePaymentPercent || 0;
        const advanceAmount = advancePercent > 0 ? (parseFloat(finalAmount) * (advancePercent / 100)).toFixed(2) : null;
        const balanceOnDelivery = advancePercent > 0 ? (parseFloat(finalAmount) - parseFloat(advanceAmount || "0")).toFixed(2) : null;
        
        const newInvoice = await storage.createInvoice({
          invoiceNumber,
          loadId: load.id,
          shipperId: load.shipperId,
          adminId: acceptedBy,
          subtotal: finalAmount,
          fuelSurcharge: "0",
          tollCharges: "0",
          handlingFee: "0",
          insuranceFee: "0",
          discountAmount: "0",
          discountReason: null,
          taxPercent: "0",
          taxAmount: "0",
          totalAmount: finalAmount,
          advancePaymentPercent: advancePercent > 0 ? advancePercent : null,
          advancePaymentAmount: advanceAmount,
          balanceOnDelivery: balanceOnDelivery,
          paymentTerms: "Net 30",
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          notes: `Invoice generated for load ${load.id} after carrier finalization`,
          lineItems: [{
            description: `Freight services: ${load.pickupCity} to ${load.dropoffCity}`,
            quantity: 1,
            rate: finalAmount,
            amount: finalAmount
          }],
          status: "draft",
        });
        
        // Link the invoice to the load
        await storage.updateLoad(bid.loadId, {
          invoiceId: newInvoice.id,
        });
      }
    } catch (invoiceError) {
      console.error("Failed to create invoice after bid acceptance:", invoiceError);
    }

    broadcastBidAccepted(bid.carrierId, load.id, {
      id: bidId,
      amount: bid.amount,
      loadId: load.id,
    });

    // Broadcast invoice_created status - shipment created after shipper acknowledges
    broadcastLoadUpdated(load.id, load.shipperId, "invoice_created", "invoice_created", {
      id: load.id,
      status: "invoice_created",
      pickupCity: load.pickupCity,
      dropoffCity: load.dropoffCity,
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

  broadcastBidRejected(bid.carrierId, bid.loadId, {
    id: bidId,
    amount: bid.amount,
    reason: reason || "Bid rejected",
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
  // Include "counter_received" to allow simultaneous bids from multiple carriers
  const biddableStates: LoadStatus[] = ["posted_to_carriers", "open_for_bid", "counter_received"];
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

  // Check document compliance
  const compliance = await checkCarrierDocumentCompliance(userId);
  if (!compliance.compliant) {
    return { allowed: false, reason: compliance.reason || "Document compliance check failed" };
  }

  return { allowed: true };
}

// ============================================================================
// DOCUMENT COMPLIANCE CHECK
// ============================================================================

export interface DocumentComplianceResult {
  compliant: boolean;
  reason?: string;
  expiredDocuments: string[];
  missingDocuments: string[];
}

const REQUIRED_DOCUMENT_TYPES = [
  "driving_license",
  "rc",
  "insurance",
  "permit",
  "fitness",
  "puc"
];

const DOCUMENT_DISPLAY_NAMES: Record<string, string> = {
  "driving_license": "Driving License",
  "rc": "Registration Certificate (RC)",
  "insurance": "Insurance",
  "permit": "Permit",
  "fitness": "Fitness Certificate",
  "puc": "PUC Certificate"
};

export async function checkCarrierDocumentCompliance(
  carrierId: string
): Promise<DocumentComplianceResult> {
  const now = new Date();
  const expiredDocuments: string[] = [];
  const missingDocuments: string[] = [];

  // Get carrier profile to check if solo or enterprise
  const profile = await storage.getCarrierProfile(carrierId);
  const isSolo = profile?.carrierType === "solo";

  // Get all documents for this carrier
  const documents = await storage.getDocumentsByUser(carrierId);
  
  // For solo carriers, we check all documents under their user ID
  // For enterprise carriers, we check company-level documents
  for (const docType of REQUIRED_DOCUMENT_TYPES) {
    const doc = documents.find(d => d.documentType === docType && d.isVerified === true);
    
    if (!doc) {
      // Document not found or not verified - mark as missing
      missingDocuments.push(DOCUMENT_DISPLAY_NAMES[docType] || docType);
    } else if (doc.expiryDate && new Date(doc.expiryDate) < now) {
      // Document expired
      expiredDocuments.push(DOCUMENT_DISPLAY_NAMES[docType] || docType);
    }
  }

  // Build reason message
  let reason: string | undefined;
  
  if (expiredDocuments.length > 0) {
    reason = `Expired documents: ${expiredDocuments.join(", ")}. Please renew before bidding.`;
  }
  
  // Note: For MVP, we only block on expired docs, not missing docs (carriers can still be onboarding)
  // To also block on missing docs, uncomment below:
  // if (missingDocuments.length > 0) {
  //   const missingMsg = `Missing documents: ${missingDocuments.join(", ")}.`;
  //   reason = reason ? `${reason} ${missingMsg}` : missingMsg;
  // }

  return {
    compliant: expiredDocuments.length === 0,
    reason,
    expiredDocuments,
    missingDocuments
  };
}
