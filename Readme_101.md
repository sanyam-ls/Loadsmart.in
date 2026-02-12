# LoadSmart - Digital Freight Marketplace

**Powered by Roadex** | Production-Grade Logistics Platform for the Indian Market

---

## Table of Contents

1. [Completed Project Workflow](#1-completed-project-workflow)
2. [Main Frontend Libraries and Their Purpose](#2-main-frontend-libraries-and-their-purpose)
3. [Main Backend Libraries and Their Purpose](#3-main-backend-libraries-and-their-purpose)
4. [Third-Party APIs Used](#4-third-party-apis-used)

---

## 1. Completed Project Workflow

### 1.1 System Architecture

```
Browser (React SPA)
    |
    |--- REST API (Express.js, port 5000)
    |       |--- Session Auth (express-session + connect-pg-simple)
    |       |--- Drizzle ORM
    |       |--- PostgreSQL (Neon-backed)
    |
    |--- WebSocket /ws/marketplace (real-time load/bid events)
    |--- WebSocket /ws/telemetry (vehicle GPS + CAN-Bus telematics)
    |
    |--- External: OpenAI (truck suggestions, AI concierge)
    |--- External: Google Maps Distance Matrix API
    |--- External: SMTP (Nodemailer email notifications)
    |--- External: Replit Object Storage (document uploads)
```

The platform runs as a single-origin deployment on port 5000. Vite serves the React frontend, and Express handles API requests and WebSocket upgrades on the same HTTP server. PostgreSQL stores all persistent data across 44 tables. Two WebSocket channels provide real-time updates for marketplace events and vehicle telematics.

### 1.2 Authentication Flow

1. **Registration** (`POST /api/auth/register`) - User submits username, password, full name, phone, and role (shipper/carrier/admin). Password is hashed server-side. A session is created immediately upon successful registration.
2. **Login** (`POST /api/auth/login`) - Credentials validated against hashed password. On success, a PostgreSQL-backed session is created via `connect-pg-simple` and a session cookie is set.
3. **OTP Login** (`POST /api/auth/login-otp/send`, `POST /api/auth/login-otp/verify`) - Alternative passwordless login via phone OTP.
4. **Session Persistence** - Sessions stored in the PostgreSQL `session` table. Every API request is validated by `requireAuth` middleware that checks `req.session.userId`.
5. **Password Reset** - Forgot password flow via OTP: `POST /api/auth/forgot-password` sends OTP, `POST /api/auth/verify-reset-otp` validates, `POST /api/auth/reset-password` sets new password.
6. **Logout** (`POST /api/auth/logout`) - Destroys server-side session and clears cookie.
7. **Session Check** (`GET /api/auth/me`) - Frontend calls on mount to verify active session and retrieve current user data.

### 1.3 User Flows by Role

#### Shipper Flow

1. **Register** as shipper and complete onboarding form (business details, contact info, document uploads).
2. **Onboarding Review** - Admin reviews and approves (`isVerified = true`). Shipper cannot post loads until verified.
3. **Post Load** (`POST /api/loads/submit`) - Submit load with pickup/dropoff locations, cargo details, schedule. Load enters `pending` status.
4. **Track Load** - Monitor load through the 16-state lifecycle from dashboard.
5. **Invoice Management** - View, acknowledge, query, negotiate, or pay invoices sent by admin.
6. **Document Viewing** - Access shipment documents uploaded by carriers in real time via WebSocket notifications.
7. **Rate Carriers** - Submit ratings after delivery completion.
8. **Vehicle Tracking** - Real-time GPS tracking, ETA predictions, and driver behavior insights via telematics dashboard.

#### Carrier Flow (Fleet and Solo)

1. **Register** as carrier, complete onboarding (identity, vehicle, and document uploads based on Solo or Fleet type).
2. **Admin Verification** - Admin reviews carrier profile, documents, and approves verification.
3. **Browse Marketplace** (`GET /api/carrier/available-loads`) - View loads in `posted_to_carriers`, `open_for_bid`, or `counter_received` status.
4. **Place Bids** (`POST /api/bids/submit`) - Bid on loads. Fleet carriers must select a truck (and optionally a driver) at bid time. Resource validation ensures no truck/driver is double-assigned.
5. **Negotiate** - Counter-bid on negotiable loads. Admin mediates all negotiations.
6. **Trip Management** - After bid acceptance, manage shipments with OTP-verified start/end, document uploads, and status updates.
7. **Solo Portal** - Simplified navigation at `/solo/*` routes with "My Truck," "My Info," "My Documents," and "My Earnings" views.
8. **Recommendations** (`GET /api/carrier/recommended-loads`) - AI-powered load recommendations scored on truck match (30pts), capacity (25pts), route experience (20pts), commodity experience (15pts), and shipper experience (10pts).

#### Admin Flow

1. **Dashboard** (`/admin`) - Overview with platform statistics, revenue metrics, and active load counts.
2. **Post Loads on Behalf of Shippers** (`POST /api/admin/loads/create`) - Create loads for offline shippers with optional auto-creation of shipper accounts.
3. **Pricing Queue** (`GET /api/admin/queue`) - Review pending loads, set gross price, platform margin, and carrier advance percentage.
4. **Reprice and Repost** (`POST /api/admin/loads/:loadId/reprice-repost`) - Adjust pricing on marketplace loads; auto-rejects pending bids.
5. **Negotiation Inbox** - Review carrier counter-bids, accept/reject/counter through admin-as-mediator workflow.
6. **Invoice Management** - Generate, send, track, and mark invoices as paid. Bidirectional price sync between loads and invoices.
7. **Carrier Verification** - Review carrier onboarding documents, approve/reject/hold.
8. **Shipper Onboarding** - Review shipper business verification requests.
9. **Credit Assessment** - Evaluate shipper creditworthiness with auto-assessment capability.
10. **Live Tracking** (`/admin/live-tracking`) - Real-time vehicle positions, ETA predictions, and finance review status.
11. **Troubleshooting** - Force-post, requeue, rollback pricing, and audit trail tools.
12. **Feature Flags** - Toggle platform features dynamically.
13. **OTP Queue** - Manage trip start/end OTP requests from carriers.
14. **Recommended Carriers** (`GET /api/loads/:id/recommended-carriers`) - View top 10 carrier matches per load.

#### Finance Flow

1. **Review Dashboard** (`/admin/finance-review`) - List shipments with uploaded documents for financial review.
2. **Review Actions** (`POST /api/finance/reviews`) - Approve, hold, or reject shipments with comments.
3. **Payment Tracking** (`PATCH /api/finance/reviews/:id/payment`) - Track payment status: Not Released, Processing, Released.

### 1.4 API Request/Response Cycle

```
Client Request
    |
    v
Express Middleware Chain:
    1. express.json() - Parse body
    2. express-session - Attach session
    3. CORS headers
    |
    v
Route Handler:
    4. requireAuth - Validate session, attach req.user
    5. Role check (if role-specific endpoint)
    6. Zod schema validation on request body
    7. DatabaseStorage method call (Drizzle ORM)
    8. JSON response with status code
    |
    v
WebSocket Broadcast (if marketplace event):
    9. broadcastMarketplaceUpdate() pushes event to connected clients
```

All API responses follow standard HTTP status codes. Errors return `{ message: string }` objects. Session-based auth uses cookies (no Bearer tokens for standard API calls).

### 1.5 Load Lifecycle State Machine (16 States)

```
draft -> pending -> priced -> posted_to_carriers -> open_for_bid -> counter_received
    -> awarded -> invoice_created -> invoice_sent -> invoice_acknowledged
    -> invoice_paid -> in_transit -> delivered -> closed
                                                    |
                                              cancelled / unavailable
```

State transitions are enforced server-side via a valid transitions map. Each transition is logged in the `load_state_change_logs` table with actor, timestamp, and reason.

### 1.6 Environment Configuration

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Express session signing secret |
| `NODE_ENV` | Runtime environment (development/production) |
| `PORT` | Server port (defaults to 5000) |
| `SMTP_HOST` | Email server hostname (defaults to smtp.gmail.com) |
| `SMTP_PORT` | Email server port (defaults to 587) |
| `SMTP_SECURE` | TLS flag for email |
| `SMTP_USER` | Email account username |
| `SMTP_PASS` | Email account password |
| `SMTP_FROM` | Sender email address |
| `GOOGLE_MAPS_API_KEY` | Google Distance Matrix API key |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | OpenAI API key (Replit AI integration) |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | OpenAI API base URL (Replit-managed) |

### 1.7 Database Schema Overview (44 Tables)

**Core Entities:**

| Table | Description | Key Relationships |
|---|---|---|
| `users` | All platform users (shipper, carrier, admin) | Referenced by loads, bids, shipments |
| `loads` | Freight load postings | FK to users (shipper), has bids, invoices |
| `bids` | Carrier bids on loads | FK to loads, users (carrier), trucks |
| `shipments` | Active shipments after bid acceptance | FK to loads, bids, carriers |
| `invoices` | Financial invoices for loads | FK to loads, bidirectional price sync |
| `trucks` | Carrier fleet vehicles | FK to users (carrier) |
| `drivers` | Fleet carrier drivers | FK to users (carrier) |

**Onboarding and Verification:**

| Table | Description |
|---|---|
| `shipper_onboarding_requests` | Shipper business verification submissions |
| `carrier_verifications` | Carrier identity and document verification |
| `carrier_verification_documents` | Uploaded verification documents |

**Financial and Pricing:**

| Table | Description |
|---|---|
| `admin_pricings` | Admin pricing decisions for loads |
| `pricing_templates` | Reusable pricing templates |
| `carrier_settlements` | Carrier payment settlements |
| `carrier_proposals` | Admin-to-carrier pricing proposals |
| `finance_reviews` | Finance team review decisions and payment status |
| `shipper_credit_profiles` | Shipper credit assessment profiles |
| `shipper_credit_evaluations` | Individual credit evaluation records |

**Communication and Tracking:**

| Table | Description |
|---|---|
| `messages` | Load-level messaging between users |
| `notifications` | System notifications per user |
| `documents` | Uploaded documents (linked to shipments/loads) |
| `bid_negotiations` | Bid negotiation message threads |
| `negotiation_threads` | Structured negotiation tracking |

**Telematics:**

| Table | Description |
|---|---|
| `vehicle_telemetry` | Real-time vehicle position and diagnostics |
| `gps_breadcrumbs` | Historical GPS trail data |
| `driver_behavior_events` | Driving behavior incidents |
| `telematics_alerts` | Vehicle diagnostic alerts |
| `route_eta_predictions` | AI-driven ETA calculations |

**Audit and Operations:**

| Table | Description |
|---|---|
| `admin_audit_logs` | Admin action audit trail |
| `load_state_change_logs` | Load lifecycle transition history |
| `admin_actions_queue` | Queued admin tasks |
| `api_logs` | API call logging for troubleshooting |
| `feature_flags` | Dynamic feature toggle flags |
| `otp_verifications` | OTP codes and verification status |
| `otp_requests` | Trip start/end OTP requests |

**Ratings and Addresses:**

| Table | Description |
|---|---|
| `carrier_ratings` | Shipper-to-carrier ratings |
| `shipper_ratings` | Carrier-to-shipper ratings |
| `ratings` | General ratings table |
| `saved_addresses` | Reusable pickup/dropoff addresses |
| `contact_submissions` | Public contact form submissions |

**Other:**

| Table | Description |
|---|---|
| `carrier_profiles` | Extended carrier profile data |
| `admin_decisions` | Admin approval/rejection records |
| `invoice_history` | Invoice modification audit trail |
| `shipper_invoice_responses` | Shipper responses to invoices |
| `shipment_events` | Shipment milestone events |

---

## 2. Main Frontend Libraries and Their Purpose

### Core Framework

| Library | Version | Purpose | Usage Location |
|---|---|---|---|
| `react` | ^18.3.1 | UI component framework | All components, pages, hooks |
| `react-dom` | ^18.3.1 | DOM rendering for React | Entry point (`main.tsx`) |
| `typescript` | 5.6.3 | Static type checking | All `.ts` and `.tsx` files |
| `vite` | ^5.4.20 | Build tool and dev server | Development server, HMR, production builds |

### Routing and State Management

| Library | Version | Purpose | Usage Location |
|---|---|---|---|
| `wouter` | ^3.3.5 | Lightweight client-side routing | `App.tsx` (55+ routes), `Link` components throughout |
| `@tanstack/react-query` | ^5.60.5 | Server state management, caching, mutations | All data-fetching pages (loads, bids, invoices, dashboards) |

### UI Component System

| Library | Version | Purpose | Usage Location |
|---|---|---|---|
| `@radix-ui/*` (20+ packages) | Various | Accessible, unstyled UI primitives | Base layer for shadcn/ui components: dialogs, dropdowns, tabs, tooltips, selects, accordions, popovers |
| `tailwindcss` | ^3.4.17 | Utility-first CSS framework | All component styling via className |
| `tailwind-merge` | ^2.6.0 | Merges conflicting Tailwind classes | `cn()` utility in `lib/utils.ts` |
| `class-variance-authority` | ^0.7.1 | Component variant management | Button, Badge, and other shadcn component variants |
| `tailwindcss-animate` | ^1.0.7 | Animation utilities for Tailwind | Enter/exit animations on dialogs, toasts, dropdowns |
| `lucide-react` | ^0.453.0 | Icon library | Icons throughout all pages and navigation |
| `react-icons` | ^5.4.0 | Extended icon library (company logos) | Brand logos via `react-icons/si` |
| `cmdk` | ^1.1.1 | Command palette component | Global search (`global-search.tsx`) |
| `vaul` | ^1.1.2 | Drawer/sheet component | Mobile-responsive side panels |

### Forms and Validation

| Library | Version | Purpose | Usage Location |
|---|---|---|---|
| `react-hook-form` | ^7.55.0 | Form state management | All forms: post-load, onboarding, registration, pricing, invoicing |
| `@hookform/resolvers` | ^3.10.0 | Zod resolver for react-hook-form | Form validation integration |
| `zod` | ^3.25.76 | Schema validation | Request validation (shared between frontend and backend via `drizzle-zod`) |
| `drizzle-zod` | ^0.7.1 | Auto-generate Zod schemas from Drizzle tables | Insert schemas for all database entities |
| `input-otp` | ^1.4.2 | OTP input component | OTP verification forms |

### Data Visualization and Maps

| Library | Version | Purpose | Usage Location |
|---|---|---|---|
| `recharts` | ^2.15.2 | Charting library | Revenue dashboard, volume analytics, transaction charts |
| `leaflet` | ^1.9.4 | Map rendering engine | Shipment tracking maps, nearby trucks |
| `react-leaflet` | ^4.2.1 | React bindings for Leaflet | `shipment-map.tsx`, admin live-tracking, nearby trucks page |

### Animation and Layout

| Library | Version | Purpose | Usage Location |
|---|---|---|---|
| `framer-motion` | ^11.13.1 | Animation library | Page transitions, component animations |
| `embla-carousel-react` | ^8.6.0 | Carousel component | Landing page feature carousels |
| `react-resizable-panels` | ^2.1.7 | Resizable split panels | Dashboard layouts |
| `react-day-picker` | ^8.10.1 | Date picker component | Schedule date selection in load forms |

### Internationalization

| Library | Version | Purpose | Usage Location |
|---|---|---|---|
| `i18next` | ^25.7.3 | Internationalization framework | Multi-language support engine |
| `react-i18next` | ^16.5.1 | React bindings for i18next | `language-switcher.tsx`, all translatable UI text |
| `i18next-browser-languagedetector` | ^8.2.0 | Auto-detect browser language | Initial language selection |

Supported languages: English, Hindi, Punjabi, Marathi, Tamil.

### File Upload

| Library | Version | Purpose | Usage Location |
|---|---|---|---|
| `@uppy/core` | ^5.2.0 | File upload framework | Document upload pipeline |
| `@uppy/dashboard` | ^5.1.0 | Upload dashboard UI | Upload interface in onboarding and document pages |
| `@uppy/react` | ^5.1.1 | React integration for Uppy | `DocumentUpload.tsx`, `ObjectUploader.tsx` |
| `@uppy/aws-s3` | ^5.1.0 | S3-compatible upload destination | Replit Object Storage uploads via presigned URLs |

### Utilities

| Library | Version | Purpose | Usage Location |
|---|---|---|---|
| `date-fns` | ^3.6.0 | Date formatting and manipulation | Timestamps, schedule displays, date calculations |
| `clsx` | ^2.1.1 | Conditional className builder | `cn()` utility helper |
| `zod-validation-error` | ^3.5.4 | Human-readable Zod error messages | Form error display |
| `next-themes` | ^0.4.6 | Theme management (light/dark) | `theme-toggle.tsx`, global theme provider |

---

## 3. Main Backend Libraries and Their Purpose

### Server Framework

| Library | Version | Purpose | Usage Location |
|---|---|---|---|
| `express` | ^4.21.2 | HTTP server framework | `server/routes.ts` (257+ routes), middleware chain |
| `tsx` | ^4.20.5 | TypeScript execution engine | `npm run dev` script - runs TypeScript directly |
| `esbuild` | ^0.25.0 | Production bundler | `script/build.ts` - builds production server bundle |

### Authentication and Sessions

| Library | Version | Purpose | Usage Location |
|---|---|---|---|
| `express-session` | ^1.18.1 | Server-side session management | Session middleware in `server/index.ts`, `requireAuth` guard |
| `connect-pg-simple` | ^10.0.0 | PostgreSQL session store | Persistent sessions in `session` table |
| `passport` | ^0.7.0 | Authentication middleware framework | Auth strategy configuration |
| `passport-local` | ^1.0.0 | Username/password auth strategy | Local login implementation |
| `memorystore` | ^1.6.7 | In-memory session fallback | Development environment fallback |

### Database

| Library | Version | Purpose | Usage Location |
|---|---|---|---|
| `drizzle-orm` | ^0.39.3 | Type-safe SQL ORM | `server/storage.ts` (2,052 lines) - all database operations |
| `drizzle-kit` | ^0.31.4 | Schema migration tool | `npm run db:push` - schema synchronization |
| `pg` | ^8.16.3 | PostgreSQL client driver | Database connection pool in `server/db.ts` |

### Email

| Library | Version | Purpose | Usage Location |
|---|---|---|---|
| `nodemailer` | ^8.0.0 | Email sending | Contact form submissions, invoice notifications (`server/routes.ts` lines 14720-14753) |

### AI and ML

| Library | Version | Purpose | Usage Location |
|---|---|---|---|
| `openai` | ^6.16.0 | OpenAI API client | Truck type suggestions (`/api/loads/suggest-truck`), AI Concierge HelpBot (`server/helpbot-routes.ts`) |

### WebSockets

| Library | Version | Purpose | Usage Location |
|---|---|---|---|
| `ws` | ^8.18.0 | WebSocket server | `server/websocket-marketplace.ts` (marketplace events), `server/websocket-telemetry.ts` (vehicle tracking) |

### Cloud Storage

| Library | Version | Purpose | Usage Location |
|---|---|---|---|
| `@google-cloud/storage` | ^7.18.0 | GCS-compatible storage client | Replit Object Storage integration (`server/replit_integrations/object_storage`) |
| `google-auth-library` | ^10.5.0 | Google authentication | Object Storage auth |

### Utilities

| Library | Version | Purpose | Usage Location |
|---|---|---|---|
| `zod` | ^3.25.76 | Runtime schema validation | Request body validation in all POST/PATCH/PUT routes |
| `glob` | ^13.0.0 | File pattern matching | Build scripts |
| `p-limit` | ^7.2.0 | Concurrency limiter | Rate-limiting parallel async operations |
| `p-retry` | ^7.1.1 | Retry with backoff | Resilient external API calls |

---

## 4. Third-Party APIs Used

### 4.1 OpenAI API

| Attribute | Details |
|---|---|
| **Purpose** | ML-powered truck type suggestions and AI Concierge chatbot |
| **Endpoints Used** | `chat.completions.create` (GPT model) |
| **Authentication** | API Key via Replit AI Integrations (`AI_INTEGRATIONS_OPENAI_API_KEY`) |
| **Base URL** | Managed by Replit (`AI_INTEGRATIONS_OPENAI_BASE_URL`) |
| **Features Dependent** | Truck suggestion engine (`POST /api/loads/suggest-truck`), HelpBot conversational assistant (`POST /api/helpbot/chat`) |
| **Usage Details** | Analyzes weight, commodity type, and market context to suggest appropriate truck types. Returns suggestions with confidence indicators. |

### 4.2 Google Maps Distance Matrix API

| Attribute | Details |
|---|---|
| **Purpose** | Calculate road distance and travel time between pickup and dropoff locations |
| **Endpoint Used** | `https://maps.googleapis.com/maps/api/distancematrix/json` |
| **Authentication** | API Key (`GOOGLE_MAPS_API_KEY`) |
| **Features Dependent** | Distance calculation (`POST /api/distance/calculate`), freight rate estimation, route-based carrier matching |
| **Usage Details** | Calculates distance in kilometers and duration in hours between origin and destination cities. Falls back to Haversine formula estimation when API key is not configured. |

### 4.3 SMTP Email Service (Nodemailer)

| Attribute | Details |
|---|---|
| **Purpose** | Transactional email notifications |
| **Server** | Configurable (defaults to `smtp.gmail.com:587`) |
| **Authentication** | Username/Password (`SMTP_USER`, `SMTP_PASS`) |
| **Features Dependent** | Contact form submission notifications, invoice delivery notifications |
| **Usage Details** | Gracefully degrades when SMTP credentials are not configured (logs skip message, saves submission to database regardless). |

### 4.4 Replit Object Storage

| Attribute | Details |
|---|---|
| **Purpose** | Cloud file storage for documents, onboarding files, and shipment documents |
| **Authentication** | Managed automatically by Replit platform (GCS-compatible) |
| **Features Dependent** | Shipper onboarding document uploads, carrier verification document uploads, shipment document sharing, profile images |
| **Usage Details** | Integrated via `@google-cloud/storage` client. Supports presigned URL generation for direct browser uploads via Uppy. Public and private storage directories. Real-time document sharing notifications via WebSocket. |

### 4.5 Replit AI Integrations

| Attribute | Details |
|---|---|
| **Purpose** | Managed OpenAI API access with automatic key rotation |
| **Authentication** | Automatically provisioned by Replit platform |
| **Features Dependent** | All OpenAI-powered features (truck suggestions, AI concierge) |
| **Usage Details** | Provides `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL` environment variables. Handles API key lifecycle management. |

### 4.6 WebSocket Channels (Internal)

| Channel | Path | Purpose | Events |
|---|---|---|---|
| Marketplace | `/ws/marketplace` | Real-time load, bid, and pricing updates | `load_posted`, `bid_placed`, `bid_accepted`, `price_updated`, `load_status_changed` |
| Telemetry | `/ws/telemetry` | Vehicle GPS, diagnostics, driver behavior | `position_update`, `speed_alert`, `eta_update`, `diagnostic_event` |

---

## Summary Metrics

| Metric | Value |
|---|---|
| Total API Endpoints | 261 (257 HTTP + 4 HelpBot) |
| Database Tables | 44 |
| Frontend Routes | 55+ |
| Frontend Pages | 61 files across 6 role directories |
| UI Components | 81 files |
| WebSocket Channels | 2 |
| Supported Languages | 5 (English, Hindi, Punjabi, Marathi, Tamil) |
| Load Lifecycle States | 16 |
| Production Dependencies | 83 packages |
| Dev Dependencies | 23 packages |
| User Roles | 3 schema-defined (admin, shipper, carrier) + 2 application-level (finance, solo_carrier) |

---

*Generated from codebase analysis -- LoadSmart v1.0, February 2026*
