# FreightFlow - Digital Freight Marketplace

## Overview

FreightFlow is an MVP full-stack logistics marketplace connecting shippers with carriers. It supports Shipper, Carrier, and Admin roles with distinct dashboards and workflows. The platform facilitates freight transportation, incorporating a unique "Admin-as-Mediator" pricing model. Key capabilities include session-based authentication, real-time UI, and a comprehensive design system. The project aims to streamline logistics operations, improve efficiency, and provide transparent freight management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is built with React 18+ and TypeScript, using Vite for development. It employs `shadcn/ui` (New York style) components, `Radix UI` primitives, and `Tailwind CSS` for styling, adhering to a blue and white enterprise theme. State management combines `React Context` for global state, `TanStack Query` for server state, and `React Hook Form` with `Zod` for form handling. Core features include role-based authentication, a global theme toggle, an AI Concierge chat widget, and responsive navigation.

### Backend Architecture

The backend utilizes `Express.js` for HTTP routing, supporting a RESTful API design under the `/api` namespace. Session-based authentication with `express-session` and `connect-pg-simple` manages user sessions and role-based authorization. `PostgreSQL` is the primary database, accessed via `Drizzle ORM` for type-safe queries and schema management. The system design includes a robust data model for users, carriers, loads, bids, and shipments, ensuring data integrity and efficient relationships.

### Admin-as-Mediator Workflow

This core feature involves administrators reviewing and pricing load postings before carriers can bid. Shippers submit loads without a rate, which then enter an admin queue for review, pricing, and posting (as "fixed price" or "negotiable"). Carriers can then accept fixed-price loads or counter-bid on negotiable ones. This workflow is supported by specific API endpoints for submission, review, pricing, and auditing.

### Canonical Load Lifecycle (12 States)

The platform enforces a consistent 12-state load lifecycle:

```
draft → pending → priced → posted_to_carriers → open_for_bid → counter_received 
      → awarded → invoice_created → invoice_sent → invoice_acknowledged 
      → invoice_paid → in_transit → delivered → closed
```

**State Transitions:**
- **draft**: Initial load creation (not submitted)
- **pending**: Shipper submitted load, awaiting admin pricing
- **priced**: Admin set price, awaiting posting decision
- **posted_to_carriers**: Load posted for carrier bidding
- **open_for_bid**: Carriers actively bidding
- **counter_received**: Counter-offer negotiations in progress
- **awarded**: Bid accepted, carrier assigned (auto-creates shipment + invoice)
- **invoice_created → invoice_sent → invoice_acknowledged → invoice_paid**: Invoice workflow
- **in_transit**: Shipment picked up and en route
- **delivered**: Shipment delivered to destination
- **closed**: Load complete

**Key Workflow Functions (server/workflow-service.ts):**
- `transitionLoadState()`: Validates and executes state transitions
- `getLoadsForRole()`: Role-based load visibility filtering
- `acceptBid()`: Accepts bid, auto-creates shipment and invoice, closes other bids
- `checkCarrierEligibility()`: Validates carrier can bid on a load

### Real-time Marketplace Updates

The platform uses WebSockets for real-time updates between portals:

**WebSocket Endpoints:**
- `/ws/marketplace` - Marketplace events (load posting, bid updates)
- `/ws/telemetry` - Vehicle telematics streaming

**Real-time Load Updates:**
- When admin posts a load via "Price & Post", server broadcasts `load_posted` event
- Carrier's "Available Loads" page receives the event and auto-refreshes
- Toast notification shows new load details immediately

**Implementation:**
- Server: `server/websocket-marketplace.ts` - WebSocket server with broadcast functions
- Client: `client/src/lib/marketplace-socket.ts` - Connection management and event handlers
- Events: `load_posted`, `load_updated`, `bid_received`

### Vehicle Telematics System (Shipper Portal Exclusive)

The Shipper Portal includes a CAN-Bus GPS + Telematics system. It provides real-time vehicle tracking, CAN-Bus diagnostics (speed, RPM, fuel, etc.), ETA predictions with AI, and driver behavior insights. The AI Concierge integrates with telematics data to answer queries about fleet status, alerts, ETAs, and driver performance.

## External Dependencies

### Frontend Libraries

-   **UI Components**: `@radix-ui`, `shadcn/ui`, `lucide-react` (icons), `recharts` (charts), `embla-carousel-react`, `cmdk`
-   **Form Management**: `react-hook-form`, `@hookform/resolvers`, `zod`, `drizzle-zod`
-   **Data & State**: `@tanstack/react-query`, `wouter` (routing)
-   **Utilities**: `date-fns`, `nanoid`, `clsx`, `tailwind-merge`, `class-variance-authority`

### Backend Services

-   **ORM & DB**: `drizzle-orm`, `pg` (PostgreSQL client)
-   **Authentication**: `express-session`, `connect-pg-simple`
-   **Development**: `tsx`, `esbuild`

### Build & Development Tools

-   **Frontend**: `vite`, `tailwindcss`, `autoprefixer`, `postcss`
-   **Replit Specific**: `@replit/vite-plugin-runtime-error-modal`, `@replit/vite-plugin-cartographer`, `@replit/vite-plugin-dev-banner`

### Database

-   **PostgreSQL**: Accessed via `DATABASE_URL` environment variable, with `pg.Pool` for connection pooling and `Drizzle Kit` for migrations.