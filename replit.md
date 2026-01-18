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

Supports simultaneous bidding from Solo Drivers and Enterprise Carriers on the same loads with NO carrier type filtering:
- **Universal Load Visibility**: When admin posts a load with `post_mode: "open"` (default), ALL carriers see it regardless of carrier type
- **Simultaneous Bidding**: Both solo drivers and enterprise carriers can bid on the same load at the same time
- **Biddable States**: Loads in `posted_to_carriers`, `open_for_bid`, or `counter_received` status are visible for bidding
- **Counter-Offer Transparency**: When admin counters one carrier's bid, other carriers can still see and bid on the load
- **Bid Categorization**: API responses differentiate between `soloBids` and `enterpriseBids` for admin review
- **Bid Acceptance**: Accepting a bid from any carrier automatically rejects all other pending bids across both types
- **No Type Filtering**: The `checkCarrierEligibility` function does NOT filter by carrier type - eligibility is based on load status, posting mode, and carrier compliance only
- **Enterprise Carrier Bid Requirements**: Enterprise carriers MUST select a truck at bid time (required) and can optionally assign a driver. This ensures resource allocation happens upfront, not after shipment creation.
  - `truck_id` is required for enterprise carriers to submit a bid
  - `driver_id` is optional and can be set to "Assign Later" (unassigned)
  - Both fields are stored in the `bids` table and transferred to the shipment upon bid acceptance
  - Solo carriers don't see truck/driver selection as they operate single-truck businesses
- **Counter-Offer Acceptance Flow (BULLETPROOF)**: When carrier accepts admin's counter offer, the centralized `acceptBid()` workflow in `workflow-service.ts` executes atomically with comprehensive logging and idempotency:
  1. **Step 1**: Validate bid exists and can be accepted (idempotent - returns success if already accepted)
  2. **Step 2**: Validate load exists and is in valid bidding state
  3. **Step 3**: Calculate final accepted amount (priority: explicit price > counterAmount > original bid)
  4. **Step 4**: Update bid status to "accepted" with negotiated price
  5. **Step 5**: Auto-reject all other pending/countered bids for this load
  6. **Step 6**: Transition load state: `bidding → awarded → invoice_created`
  7. **Step 7**: Generate unique 4-digit pickup ID and update load with carrier assignment
  8. **Step 8**: Create invoice (if not already exists)
  9. **Step 9**: Create shipment (if not already exists) with status "pickup_scheduled"
  10. **Step 10**: Broadcast real-time updates to carrier and shipper
  - **Idempotency**: Calling acceptBid multiple times with same bidId returns success without duplicating work
  - **Error Resilience**: Each step logs progress; invoice/shipment creation failures don't block workflow
  - **Price Logic**: `counterAmount` (negotiated price) is used for Winning Carrier Bid, Carrier Payout, and invoice calculations
  - **Endpoint**: `POST /api/carrier/bids/:bidId/accept` triggers the complete `acceptBid` workflow

### Real-time Updates

WebSockets facilitate real-time updates for marketplace events (`/ws/marketplace`) and vehicle telematics (`/ws/telemetry`). This includes instant load postings and real-time shipment document sharing with notifications to relevant users.

### Real-time Shipment Document Sharing

Carriers can upload documents (LR, E-way Bill, Photos, POD, Invoice, Other) to Replit Object Storage using presigned URLs. Shippers receive real-time WebSocket notifications and immediate visibility of newly uploaded documents.

### Vehicle Telematics System (Shipper Portal Exclusive)

The Shipper Portal integrates a CAN-Bus GPS + Telematics system for real-time tracking, diagnostics (speed, RPM, fuel), AI-driven ETA predictions, and driver behavior insights. The AI Concierge can answer queries using telematics data.

### Shipper Onboarding Workflow (Verification-Only)

New shippers must complete a business verification process before posting loads. The workflow is simplified to verification-only without credit limit or banking features:
- **Auto-Draft Creation**: When a new shipper registers, a draft onboarding request is automatically created. The admin page shows these as "Awaiting Submission" in the Draft status filter.
- **Draft Auto-Save**: Shippers with draft status can continue filling out their verification form with automatic saving. Changes are debounced (1.5s delay) and saved via `PATCH /api/shipper/onboarding/draft`. A visual indicator shows "Auto-saving..." and "Changes saved" status. Form fields are pre-populated when returning to continue a draft.
- **Shipper Form**: Multi-tab form at `/shipper/onboarding` with 3 tabs: Business (legal name, PAN, GST, CIN, incorporation details), Contact (contact person details, trade references), and Documents (GST certificate, PAN card, incorporation certificate, address proof).
- **Document Upload**: The Documents tab uses `DocumentUpload` component (`client/src/components/DocumentUpload.tsx`) for direct file uploads to Replit Object Storage. Uploads use presigned URLs via `/api/uploads/request-url`, supporting images (JPEG, PNG, GIF, WebP) and PDF files up to 10MB. Uploaded file paths auto-save via the draft mechanism.
- **Admin Review Queue**: Admin page at `/admin/onboarding` with status-based filtering (Draft, Pending, Under Review, Approved, Rejected, On Hold), search, and detailed review dialog showing all onboarding data across tabs.
- **Status Flow**: `draft → pending → under_review → (approved | rejected | on_hold)`. Draft represents newly registered shippers who haven't submitted. Shippers can update if status is `on_hold` or `rejected`.
- **Approval Integration**: When approved, sets `user.isVerified=true` and syncs business data to users table (legalCompanyName→companyName, registeredAddress→companyAddress, contactPersonPhone→phone).
- **Gate Enforcement**: Shippers must be verified (`isVerified=true`) before posting loads.
- **Full i18n**: All onboarding strings translated in English, Hindi, Punjabi, Marathi, and Tamil.

### Carrier Onboarding Workflow

New carriers must complete a verification process before accessing the marketplace. The workflow includes:
- **Carrier Type Selection**: Carriers select either "Solo Operator" (single truck owner-operators) or "Fleet/Company" (transport companies with multiple trucks).
- **Solo Operator Requirements**: Identity tab (Aadhaar Number, Driver License Number, Permit Type), Vehicle tab (License Plate, Chassis Number, Registration Number), Documents tab (Aadhaar Card, Driver License, Permit Document, RC, Insurance Certificate, Fitness Certificate).
- **Fleet/Company Requirements**: Business tab (Incorporation Type, Business Registration Number, Business Address, Fleet Size), Compliance tab (PAN Number, GSTIN Number, TAN Number), Documents tab (Incorporation Certificate, Trade License, Address Proof, PAN Card, GSTIN Certificate, TAN Certificate).
- **Auto-Save**: Changes auto-save for draft, on_hold, and rejected statuses via `PATCH /api/carrier/onboarding/draft`.
- **Document Upload**: Uses `DocumentUpload` component for direct file uploads to Replit Object Storage.
- **Status Flow**: `draft → pending → under_review → (approved | rejected | on_hold)`. Carriers can update if status is `on_hold` or `rejected`.
- **Approval Integration**: When approved, sets `user.isVerified=true` and syncs business data to users table (businessAddress→companyAddress for enterprise carriers).
- **Gate Enforcement**: Carriers must be verified (`isVerified=true`) before accessing loads or placing bids.
- **Full i18n**: All onboarding strings translated in English (other languages pending).

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

### AI/ML Truck Suggestions

The platform includes ML-powered truck type suggestions based on weight, commodity type, and market trends:
- **Multi-Factor Analysis**: Considers weight, commodity type, and route when suggesting trucks
- **Commodity Category Mappings**: 25+ commodity categories with preferred truck types (frozen foods → reefer, electronics → container, cement → bulker, etc.)
- **Weight-Based Capacity Matching**: Maps weight ranges to appropriate truck capacities with 20% buffer
- **Market Trend Analysis (ML Feature)**: Analyzes historical loads by weight (±30%) and commodity type, scoring matches and ranking by frequency
- **OpenAI Integration**: ML-powered recommendations with structured JSON output, confidence scores, and alternative suggestions
- **Ensemble Approach**: Priority ordering - AI suggestion (if >70% confident) > Market trend (if score ≥4) > Rule-based fallback
- **Confidence Scores**: Each recommendation includes a confidence percentage (60-90%) based on data quality
- **Suggestion Sources**: Tracks source as "ai_ml", "market_commodity", "market_weight", or "rule_based"
- **UI Display**: Shows "AI/ML Recommended", "Market Trend Based", or "Suggested" labels with confidence badge
- **Caching**: 60-second cache to reduce API calls and improve response times
- **API Endpoint**: `POST /api/loads/suggest-truck` accepts weight, weightUnit, commodityType, goodsDescription, pickupCity, dropoffCity

### Shared Data Files

-   **`shared/indian-truck-data.ts`**: Contains Indian truck manufacturers and models for cascading dropdowns.
-   **`shared/indian-locations.ts`**: Contains Indian states and major cities for location selection.