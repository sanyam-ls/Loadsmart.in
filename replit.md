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
- `checkCarrierDocumentCompliance()`: Validates carrier has valid documents for bidding/trip start

### Solo Carrier Portal

Specialized portal for owner-operators with single-truck operations:

**Navigation (Simplified):**
- "My Truck" (instead of "My Fleet")
- "My Info" (instead of "Drivers")
- "My Documents" (instead of "Documents")
- No "Add Driver" or fleet management sections

**Key Features:**
- Compliance Status Indicator on My Truck page (green/amber/red)
- Cash-flow focused Revenue view with "My Earnings" tab
- Document expiry enforcement blocks bidding and trip starts
- Carrier type detected via `carrierType` field on auth context

**Document Compliance Enforcement:**
- Required documents: license, rc, insurance, permit, fitness, puc
- Expired docs return 403 on POST /api/bids and POST /api/otp/request-start
- Visual warning on My Truck page with actionable guidance

**Admin Visibility:**
- Solo Driver badges on carrier cards in /admin/carriers
- Carrier type filter (All/Solo/Enterprise) for filtering carriers

### Dual Marketplace Bidding System

Both Solo Drivers and Enterprise Carriers can bid on the same loads simultaneously, with separate but comparable bid marketplaces:

**API Response Structure (GET /api/loads/:id/bids):**
```json
{
  "soloBids": [],        // Bids from solo carriers
  "enterpriseBids": [],  // Bids from enterprise carriers
  "allBids": [],         // Combined bids for backward compatibility
  "summary": {
    "totalBids": 0,
    "soloBidCount": 0,
    "enterpriseBidCount": 0,
    "lowestSoloBid": null,
    "lowestEnterpriseBid": null
  }
}
```

**Admin Load Details - Dual Marketplace View:**
- Summary cards showing total bids, solo bid count, and enterprise bid count with lowest bids
- Side-by-side marketplace cards for Solo Driver and Enterprise bids
- Combined view table showing all bids with carrier type badges
- Orange theme for Solo Driver section, blue theme for Enterprise section

**Bid Acceptance Cross-Type Closure:**
- When a bid is accepted (from either carrier type), all other pending and countered bids are auto-rejected
- Rejection notes include carrier type for audit trail
- Works for bids in both "pending" and "countered" status

**Carrier Type Detection:**
- Bid carrierType is set from carrier profile at bid creation time
- Explicit carrierType from database takes precedence over fleet size detection

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

### API Route Ordering (Important)

Express routes must be ordered from specific to generic to prevent greedy matching:

```
/api/shipments/tracking       (BEFORE :id)
/api/shipments/:id/tracking   (BEFORE generic :id)
/api/shipments/load/:loadId   (BEFORE generic :id)
/api/shipments/:id            (LAST - catches all remaining)
```

**Why:** If `/api/shipments/:id` is defined first, requests to `/api/shipments/tracking` will match "tracking" as an ID, returning 404.

### Build & Development Tools

-   **Frontend**: `vite`, `tailwindcss`, `autoprefixer`, `postcss`
-   **Replit Specific**: `@replit/vite-plugin-runtime-error-modal`, `@replit/vite-plugin-cartographer`, `@replit/vite-plugin-dev-banner`

### Database

-   **PostgreSQL**: Accessed via `DATABASE_URL` environment variable, with `pg.Pool` for connection pooling and `Drizzle Kit` for migrations.

### Shared Data Files

-   **shared/indian-truck-data.ts**: Contains Indian truck manufacturers (Tata, Ashok Leyland, Mahindra, Eicher, BharatBenz, Force Motors, Volvo, Scania, MAN, Isuzu) with their models organized by capacity category (LCV, ICV, MCV, HCV, MHCV, Tractor). Used for cascading manufacturer → model dropdowns in the Add Truck form.
-   **shared/indian-locations.ts**: Contains all Indian states and their major cities for cascading State → City location selection. Metro cities are marked with `isMetro: true` flag.

### Truck & Driver Management (Carrier Portal)

**Add Truck Form Features:**
- Cascading Manufacturer → Model dropdown (selecting manufacturer filters available models)
- Each model displays its capacity range (e.g., "Prima 4928 (45-49 Ton)")
- Cascading State → City location selection
- Metro cities marked with "(Metro)" indicator

**Driver License Expiry Alerts:**
- Automatic detection of expired and expiring licenses
- Urgency levels: Critical (≤7 days), Warning (≤15 days), Expiring Soon (≤30 days)
- Separate sections for expired (red) and expiring (amber) licenses
- Days remaining/expired display for quick reference