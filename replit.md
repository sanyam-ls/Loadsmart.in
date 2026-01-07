# FreightFlow - Digital Freight Marketplace

## Overview

FreightFlow is an MVP full-stack logistics marketplace connecting shippers with carriers, supporting Shipper, Carrier, and Admin roles. It streamlines logistics operations by facilitating freight transportation with an "Admin-as-Mediator" pricing model, session-based authentication, real-time UI, and a comprehensive design system. The platform aims to improve efficiency and provide transparent freight management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

The frontend is built with React 18+ and TypeScript, utilizing Vite, `shadcn/ui`, `Radix UI`, and `Tailwind CSS` for a blue and white enterprise theme. State management uses `React Context`, `TanStack Query`, and `React Hook Form` with `Zod`. Key features include role-based authentication, a global theme toggle, multi-language support (English, Hindi, Punjabi, Marathi, Tamil), an AI Concierge chat widget, and responsive navigation.

### Backend

The backend uses `Express.js` for a RESTful API. Session-based authentication with `express-session` and `connect-pg-simple` manages user sessions and role-based authorization. `PostgreSQL` is the primary database, accessed via `Drizzle ORM` for type-safe queries.

### Admin-as-Mediator Workflow

Administrators review and price load postings before carriers can bid. Shippers submit loads without a rate, which are then priced by an admin and posted as "fixed price" or "negotiable." Carriers can accept fixed-price loads or counter-bid on negotiable ones.

### Canonical Load Lifecycle

The platform enforces a 12-state load lifecycle: `draft → pending → priced → posted_to_carriers → open_for_bid → counter_received → awarded → invoice_created → invoice_sent → invoice_acknowledged → invoice_paid → in_transit → delivered → closed`. This workflow includes functions for state transitions, role-based visibility, bid acceptance, and carrier eligibility/compliance checks.

### Solo Carrier Portal

A specialized portal for owner-operators with simplified navigation ("My Truck," "My Info," "My Documents"). It includes a compliance status indicator, a cash-flow focused "My Earnings" view, and document expiry enforcement that blocks bidding and trip starts.

### Dual Marketplace Bidding System

Supports simultaneous bidding from Solo Drivers and Enterprise Carriers on the same loads. API responses differentiate between `soloBids` and `enterpriseBids`, and the admin interface provides separate views for each. Accepting a bid from one type automatically rejects all other pending bids across both types.

### Real-time Updates

WebSockets facilitate real-time updates for marketplace events (`/ws/marketplace`) and vehicle telematics (`/ws/telemetry`). This includes instant load postings and real-time shipment document sharing with notifications to relevant users.

### Real-time Shipment Document Sharing

Carriers can upload documents (LR, E-way Bill, Photos, POD, Invoice, Other) to Replit Object Storage using presigned URLs. Shippers receive real-time WebSocket notifications and immediate visibility of newly uploaded documents.

### Vehicle Telematics System (Shipper Portal Exclusive)

The Shipper Portal integrates a CAN-Bus GPS + Telematics system for real-time tracking, diagnostics (speed, RPM, fuel), AI-driven ETA predictions, and driver behavior insights. The AI Concierge can answer queries using telematics data.

### Credit Assessment System

The platform includes both manual admin review and automated credit scoring for shippers. The automated system calculates scores based on weighted factors: payment history (±250 points from on-time rate), credit utilization (±150, optimal at ≤30%), load volume (±100 from recent 90-day activity), and tenure (±50 from account age). Base score is 500, with final scores ranging 0-1000. Risk thresholds: ≥750 low, ≥600 medium, ≥450 high, <450 critical. Default credit limits: low 1M, medium 500K, high 200K, critical 50K INR. Admins can run auto-assessment individually or in bulk, and manual overrides lock profiles from future auto-updates. The credit engine is in `server/services/credit-engine.ts`.

## External Dependencies

### Frontend Libraries

-   **UI Components**: `@radix-ui`, `shadcn/ui`, `lucide-react`, `recharts`, `embla-carousel-react`, `cmdk`
-   **Form Management**: `react-hook-form`, `@hookform/resolvers`, `zod`, `drizzle-zod`
-   **Data & State**: `@tanstack/react-query`, `wouter`
-   **Utilities**: `date-fns`, `nanoid`, `clsx`, `tailwind-merge`, `class-variance-authority`

### Backend Services

-   **ORM & DB**: `drizzle-orm`, `pg`
-   **Authentication**: `express-session`, `connect-pg-simple`

### Database

-   **PostgreSQL**: Accessed via `DATABASE_URL` using `pg.Pool` and `Drizzle Kit`.

### Shared Data Files

-   **`shared/indian-truck-data.ts`**: Contains Indian truck manufacturers and models for cascading dropdowns.
-   **`shared/indian-locations.ts`**: Contains Indian states and major cities for location selection.