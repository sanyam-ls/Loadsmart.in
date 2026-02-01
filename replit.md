# FreightFlow - Digital Freight Marketplace

## Overview

FreightFlow is a full-stack logistics marketplace connecting shippers with carriers, featuring Shipper, Carrier, and Admin roles. It aims to streamline freight transportation through an "Admin-as-Mediator" pricing model, session-based authentication, real-time UI, and a comprehensive design system, enhancing efficiency and transparency in freight management. The platform includes an AI Concierge, a Solo Carrier Portal, dual marketplace bidding, real-time tracking, and document sharing.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

The frontend is built with React 18+ and TypeScript, leveraging Vite, `shadcn/ui`, `Radix UI`, and `Tailwind CSS` for a blue and white enterprise theme. State management uses `React Context`, `TanStack Query`, and `React Hook Form` with `Zod`. It supports role-based authentication, a global theme toggle, multi-language support (English, Hindi, Punjabi, Marathi, Tamil), an AI Concierge chat widget, and responsive navigation.

### Backend

The backend is an `Express.js` RESTful API. It uses session-based authentication with `express-session` and `connect-pg-simple` for user sessions and role-based authorization. `PostgreSQL` is the primary database, accessed via `Drizzle ORM` for type-safe queries.

### Admin-as-Mediator Workflow

Administrators review and price load postings before carriers can bid. Shippers submit loads without a rate. Admins then price these loads and post them as "fixed price" or "negotiable." Carriers can accept fixed-price loads or counter-bid on negotiable ones.

### Canonical Load Lifecycle

The platform enforces a 12-state load lifecycle: `draft → pending → priced → posted_to_carriers → open_for_bid → counter_received → awarded → invoice_created → invoice_sent → invoice_acknowledged → invoice_paid → in_transit → delivered → closed`. This workflow governs state transitions, role-based visibility, bid acceptance, and carrier eligibility checks.

### Solo Carrier Portal

A specialized portal for owner-operators with simplified navigation and focused views like "My Truck," "My Info," and "My Documents." It includes a compliance status indicator and an "My Earnings" view, with document expiry enforcement blocking bidding and trip starts.

### Dual Marketplace Bidding System

The system supports simultaneous bidding from Solo Drivers and Enterprise Carriers on the same loads without carrier type filtering. Loads in `posted_to_carriers`, `open_for_bid`, or `counter_received` statuses are visible for bidding. Bid acceptance from any carrier automatically rejects all other pending bids. Enterprise carriers must select a truck at bid time, and an optional driver, which are then transferred to the shipment upon bid acceptance. A robust `acceptBid()` workflow handles counter-offer acceptance, ensuring idempotency and error resilience.

### Fleet Carrier Resource Assignment Rules

Fleet/Enterprise carriers are restricted to assigning one truck and one driver per active load. Validation is enforced at bid submission time:
-   A truck cannot be assigned to multiple active shipments or accepted bids simultaneously
-   A driver cannot be assigned to multiple active shipments or accepted bids simultaneously
-   Resources become available for new assignments only after delivery is completed (status: `delivered`, `closed`, `cancelled`, or `completed`)
-   Terminal shipment statuses that release resources: `delivered`, `closed`, `cancelled`, `completed`
-   Both shipments and accepted bids are checked to prevent race conditions during bid acceptance workflow

### Admin Reprice & Repost Feature

Administrators can reprice and repost loads in `posted_to_carriers`, `open_for_bid`, `counter_received`, or `priced` statuses. Repricing marketplace loads automatically rejects all pending bids. The feature includes an enhanced pricing calculator for setting gross price, platform margin, and carrier advance payment, with server-side validation and an audit trail.

### Real-time Updates

WebSockets facilitate real-time updates for marketplace events (`/ws/marketplace`) and vehicle telematics (`/ws/telemetry`), enabling instant load postings and real-time shipment document sharing with notifications.

### Real-time Shipment Document Sharing

Carriers can upload various documents to Replit Object Storage using presigned URLs. Shippers receive real-time WebSocket notifications and immediate visibility of newly uploaded documents.

### Vehicle Telematics System (Shipper Portal Exclusive)

The Shipper Portal integrates a CAN-Bus GPS + Telematics system for real-time tracking, diagnostics, AI-driven ETA predictions, and driver behavior insights. The AI Concierge can answer queries using this telematics data.

### Shipper Onboarding Workflow

New shippers undergo a business verification process. This includes auto-draft creation, auto-saving of form data, a multi-tab form for business details, contact information, and document uploads to Replit Object Storage. An admin review queue manages statuses: `draft → pending → under_review → (approved | rejected | on_hold)`. Approval (`isVerified=true`) is required before posting loads.

#### Shipper Role Selection
Shippers must identify their role during onboarding via an "I am a" dropdown with two options:
- **Shipper**: Standard shipper without additional document requirements
- **Transporter**: Requires mandatory LR (Lorry Receipt) copy upload for verification

The shipper role is displayed in the admin onboarding review page with a badge, and the LR copy document link is shown conditionally for Transporters. Server-side validation enforces LR copy requirement for transporter role submissions.

### Carrier Onboarding Workflow

New carriers complete a verification process based on their type ("Solo Operator" or "Fleet/Company"). The workflow includes specific identity, vehicle, and document requirements, with auto-saving and document uploads. Similar to shippers, an admin review process determines approval, setting `isVerified=true` upon completion, which is necessary before accessing loads or bidding.

### AI/ML Truck Suggestions

The platform provides ML-powered truck type suggestions based on weight, commodity type, and market trends. It uses multi-factor analysis, commodity category mappings, and weight-based capacity matching, with an ensemble approach prioritizing AI suggestions (if confident), then market trends, and finally rule-based fallbacks. Recommendations include confidence scores and track their source (AI/ML, market, rule-based).

### Shipper Edit Load Feature

Shippers can edit load details directly from the load detail page via a side sheet/drawer interface. The Edit button appears only for loads in editable statuses (not `cancelled`, `delivered`, `closed`, `in_transit`, or `unavailable`). Editable fields include:
- Shipper contact information (name, phone, company address)
- Pickup location details (address, locality, landmark, city, state)
- Dropoff location details (address, locality, landmark, city, state, business name)
- Receiver details (full name, phone, email)
- Cargo information (weight, goods description, special notes)
- Schedule (pickup and delivery dates)

Changes sync across all portals (shipper, admin, carrier) via query cache invalidation. The edit form validates required fields (pickup/dropoff addresses, cities, receiver name/phone) before saving.

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

### AI Integrations

-   **OpenAI**: For ML-powered truck suggestions.

### Shared Data Files

-   **`shared/indian-truck-data.ts`**: Contains Indian truck manufacturers and models.
-   **`shared/indian-locations.ts`**: Contains Indian states and major cities.