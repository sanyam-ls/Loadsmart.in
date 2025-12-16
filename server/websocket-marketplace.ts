import { WebSocketServer, WebSocket } from "ws";
import type { Server, IncomingMessage } from "http";
import type { Socket } from "net";

interface MarketplaceClient {
  ws: WebSocket;
  role: "carrier" | "admin" | "shipper" | null;
  userId: string | null;
}

const clients: Map<WebSocket, MarketplaceClient> = new Map();
let wss: WebSocketServer | null = null;

export function setupMarketplaceWebSocket(server: Server): WebSocketServer {
  wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request: IncomingMessage, socket: Socket, head: Buffer) => {
    const pathname = new URL(request.url || "", `http://${request.headers.host}`).pathname;
    
    if (pathname === "/ws/marketplace") {
      wss!.handleUpgrade(request, socket, head, (ws) => {
        wss!.emit("connection", ws, request);
      });
    }
  });

  wss.on("connection", (ws: WebSocket) => {
    console.log("Marketplace WebSocket client connected");

    const client: MarketplaceClient = {
      ws,
      role: null,
      userId: null,
    };
    clients.set(ws, client);

    ws.send(JSON.stringify({
      type: "connected",
      message: "Connected to marketplace events",
      timestamp: new Date().toISOString(),
    }));

    ws.on("message", (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        handleClientMessage(client, message);
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    });

    ws.on("close", () => {
      console.log("Marketplace WebSocket client disconnected");
      clients.delete(ws);
    });

    ws.on("error", (error) => {
      console.error("Marketplace WebSocket error:", error);
      clients.delete(ws);
    });
  });

  console.log("Marketplace WebSocket server started on /ws/marketplace");
  return wss;
}

function handleClientMessage(client: MarketplaceClient, message: any): void {
  switch (message.type) {
    case "identify":
      client.role = message.role || null;
      client.userId = message.userId || null;
      sendToClient(client.ws, {
        type: "identified",
        role: client.role,
        timestamp: new Date().toISOString(),
      });
      break;

    case "ping":
      sendToClient(client.ws, {
        type: "pong",
        timestamp: new Date().toISOString(),
      });
      break;

    default:
      console.log("Unknown marketplace message type:", message.type);
  }
}

function sendToClient(ws: WebSocket, data: any): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

export function broadcastLoadPosted(loadData: {
  id: string;
  pickupCity: string | null;
  dropoffCity: string | null;
  adminFinalPrice: string | null;
  requiredTruckType: string | null;
  status: string | null;
}): void {
  const message = {
    type: "load_posted",
    load: loadData,
    timestamp: new Date().toISOString(),
  };

  clients.forEach((client, ws) => {
    if (ws.readyState === WebSocket.OPEN && client.role === "carrier") {
      sendToClient(ws, message);
    }
  });

  console.log(`Broadcasted load_posted event for load ${loadData.id} to ${clients.size} carrier clients`);
}

export function broadcastLoadUpdated(loadId: string, shipperId: string | null, status: string | null, event: string, loadData?: any): void {
  const message = {
    type: "load_updated",
    loadId,
    status,
    event,
    load: loadData,
    timestamp: new Date().toISOString(),
  };

  clients.forEach((client, ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      if (client.role === "admin") {
        sendToClient(ws, message);
      }
      if (client.role === "shipper" && shipperId && client.userId === shipperId) {
        sendToClient(ws, message);
      }
    }
  });
  console.log(`Broadcasted load_updated (${event}) for load ${loadId}`);
}

export function broadcastBidReceived(loadId: string, bidData: any): void {
  const message = {
    type: "bid_received",
    loadId,
    bid: bidData,
    timestamp: new Date().toISOString(),
  };

  clients.forEach((client, ws) => {
    if (ws.readyState === WebSocket.OPEN && client.role === "admin") {
      sendToClient(ws, message);
    }
  });
  console.log(`Broadcasted bid_received event for load ${loadId}`);
}

export function broadcastBidCountered(carrierId: string, loadId: string, bidData: any): void {
  const message = {
    type: "bid_countered",
    loadId,
    bid: bidData,
    timestamp: new Date().toISOString(),
  };

  clients.forEach((client, ws) => {
    if (ws.readyState === WebSocket.OPEN && client.role === "carrier" && client.userId === carrierId) {
      sendToClient(ws, message);
    }
  });
  console.log(`Broadcasted bid_countered event to carrier ${carrierId}`);
}

export function broadcastBidAccepted(carrierId: string, loadId: string, bidData: any): void {
  const message = {
    type: "bid_accepted",
    loadId,
    bid: bidData,
    timestamp: new Date().toISOString(),
  };

  clients.forEach((client, ws) => {
    if (ws.readyState === WebSocket.OPEN && client.role === "carrier" && client.userId === carrierId) {
      sendToClient(ws, message);
    }
  });
  console.log(`Broadcasted bid_accepted event to carrier ${carrierId}`);
}

export function broadcastBidRejected(carrierId: string, loadId: string, bidData: any): void {
  const message = {
    type: "bid_rejected",
    loadId,
    carrierId,
    bid: bidData,
    timestamp: new Date().toISOString(),
  };

  clients.forEach((client, ws) => {
    if (ws.readyState === WebSocket.OPEN && client.role === "carrier" && client.userId === carrierId) {
      sendToClient(ws, message);
    }
  });
  console.log(`Broadcasted bid_rejected event to carrier ${carrierId}`);
}

export function broadcastInvoiceEvent(shipperId: string, invoiceId: string, event: string, invoiceData?: any): void {
  const message = {
    type: "invoice_update",
    invoiceId,
    event,
    invoice: invoiceData,
    timestamp: new Date().toISOString(),
  };

  clients.forEach((client, ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      if (event === "invoice_sent" && client.role === "shipper" && client.userId === shipperId) {
        sendToClient(ws, message);
      }
      if (["invoice_opened", "invoice_paid", "invoice_countered"].includes(event) && client.role === "admin") {
        sendToClient(ws, message);
      }
    }
  });
  console.log(`Broadcasted invoice_${event} event for invoice ${invoiceId}`);
}

export function broadcastNegotiationMessage(targetRole: "carrier" | "admin", targetUserId: string | null, bidId: string, messageData: any): void {
  const message = {
    type: "negotiation_message",
    bidId,
    negotiation: messageData,
    timestamp: new Date().toISOString(),
  };

  clients.forEach((client, ws) => {
    if (ws.readyState === WebSocket.OPEN && client.role === targetRole) {
      if (targetUserId === null || client.userId === targetUserId) {
        sendToClient(ws, message);
      }
    }
  });
  console.log(`Broadcasted negotiation_message to ${targetRole}`);
}
