import type { Express, Request, Response } from "express";
import OpenAI from "openai";
import { db } from "./db";
import { helpBotConversations, helpBotMessages } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const FREIGHTFLOW_KNOWLEDGE = `
You are a helpful customer support assistant for FreightFlow, a digital freight marketplace connecting shippers with carriers in India.

## About FreightFlow
FreightFlow is a comprehensive logistics platform that helps businesses transport goods efficiently. The platform supports three user types:
- **Shippers**: Companies that need to transport goods
- **Carriers**: Transport companies and owner-operators who provide trucks
- **Admins**: Platform administrators who manage pricing and approvals

## Key Features

### For Shippers:
- Post loads for transport with pickup and delivery locations
- Get competitive rates from verified carriers
- Track shipments in real-time with GPS telematics
- Manage invoices and payments securely
- Access document management for LR, E-way bills, and POD

### For Carriers:
- Browse available loads in the marketplace
- Place bids on loads that match your fleet capacity
- Manage your fleet of trucks and drivers
- Upload shipment documents (LR, E-way bill, POD)
- Track earnings and payment history

### Onboarding Process:
1. **Register** with your email and role (shipper or carrier)
2. **Complete verification** by submitting business documents
3. **Admin review** - our team reviews your application
4. **Get approved** and start using the platform

### Load Lifecycle:
1. Shipper posts a load request
2. Admin prices the load
3. Load is posted to marketplace
4. Carriers bid on the load
5. Admin awards to best carrier
6. Invoice is created and sent to shipper
7. Shipper acknowledges invoice
8. Carrier picks up and delivers goods
9. Delivery confirmed and payment processed

### Document Requirements:
**For Shippers:**
- GST Certificate
- PAN Card
- Business Registration/Incorporation Certificate
- Cancelled Cheque
- Address Proof

**For Solo Carriers:**
- Aadhaar Card
- Driver License
- Vehicle Registration (RC)
- Insurance Certificate
- Fitness Certificate
- Permit Documents

**For Fleet/Company Carriers:**
- Business Registration
- Trade License
- PAN Card
- GST Certificate
- TAN Certificate

### Contact Support:
- Email: support@freightflow.in
- Phone: +91 1800-XXX-XXXX (Toll-free)
- Hours: Monday-Saturday, 9 AM - 6 PM IST

## Guidelines for Responses:
- Be friendly, helpful, and professional
- Use simple language that non-technical users can understand
- If you don't know something specific, offer to connect them with customer service
- For urgent issues, always recommend contacting customer support directly
- Provide step-by-step guidance when explaining processes
- Be patient and understanding with frustrated users
`;

export function registerHelpBotRoutes(app: Express): void {
  app.post("/api/helpbot/chat", async (req: Request, res: Response) => {
    try {
      const { message, conversationId } = req.body;
      const userId = req.session?.userId;

      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Message is required" });
      }

      let convId = conversationId;
      
      if (!convId) {
        const [newConv] = await db.insert(helpBotConversations)
          .values({ 
            title: message.substring(0, 50) + (message.length > 50 ? "..." : ""),
            userId: userId || null 
          })
          .returning();
        convId = newConv.id;
      }

      await db.insert(helpBotMessages)
        .values({ conversationId: convId, role: "user", content: message });

      const history = await db.select()
        .from(helpBotMessages)
        .where(eq(helpBotMessages.conversationId, convId))
        .orderBy(helpBotMessages.createdAt);

      const chatMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
        { role: "system", content: FREIGHTFLOW_KNOWLEDGE },
        ...history.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      res.write(`data: ${JSON.stringify({ conversationId: convId })}\n\n`);

      const stream = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: chatMessages,
        stream: true,
        max_completion_tokens: 1024,
      });

      let fullResponse = "";

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      await db.insert(helpBotMessages)
        .values({ conversationId: convId, role: "assistant", content: fullResponse });

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Help bot error:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Sorry, I encountered an error. Please try again." })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to process message" });
      }
    }
  });

  app.get("/api/helpbot/conversations", async (req: Request, res: Response) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.json([]);
      }
      
      const convs = await db.select()
        .from(helpBotConversations)
        .where(eq(helpBotConversations.userId, userId))
        .orderBy(desc(helpBotConversations.createdAt))
        .limit(20);
      
      res.json(convs);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.get("/api/helpbot/conversations/:id", async (req: Request, res: Response) => {
    try {
      const userId = req.session?.userId;
      const convId = parseInt(req.params.id);
      
      const [conversation] = await db.select()
        .from(helpBotConversations)
        .where(eq(helpBotConversations.id, convId));
      
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      // Authorization check: ensure user owns this conversation
      // Allow access only if conversation belongs to this user, or if it was a guest conversation (null userId) and current user is the same guest session
      if (conversation.userId && conversation.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const msgs = await db.select()
        .from(helpBotMessages)
        .where(eq(helpBotMessages.conversationId, convId))
        .orderBy(helpBotMessages.createdAt);

      res.json({ ...conversation, messages: msgs });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  app.get("/api/helpbot/contact-support", async (req: Request, res: Response) => {
    res.json({
      email: "support@freightflow.in",
      phone: "+91 1800-XXX-XXXX",
      hours: "Monday-Saturday, 9 AM - 6 PM IST",
      whatsapp: "+91 98765 XXXXX",
    });
  });
}
