# LoadSmart - Complete API Implementation Documentation

> Full technical reference for all backend API routes, frontend API calls, authentication flow, WebSocket events, and deployment connectivity.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Authentication & Session Management](#2-authentication--session-management)
3. [API Route Reference](#3-api-route-reference)
   - [Auth Routes](#31-auth-routes)
   - [User Routes](#32-user-routes)
   - [Load Routes](#33-load-routes)
   - [Bid Routes](#34-bid-routes)
   - [Truck Routes](#35-truck-routes)
   - [Driver Routes](#36-driver-routes)
   - [Shipment Routes](#37-shipment-routes)
   - [Invoice Routes](#38-invoice-routes)
   - [Notification Routes](#39-notification-routes)
   - [Admin Routes](#310-admin-routes)
   - [Carrier Routes](#311-carrier-routes)
   - [Shipper Routes](#312-shipper-routes)
   - [OTP Routes](#313-otp-routes)
   - [Telemetry Routes](#314-telemetry-routes)
   - [Rating Routes](#315-rating-routes)
   - [Finance Routes](#316-finance-routes)
   - [Settlement Routes](#317-settlement-routes)
   - [Saved Address Routes](#318-saved-address-routes)
   - [Recommendation Routes](#319-recommendation-routes)
   - [Contact Routes](#320-contact-routes)
4. [WebSocket Events](#4-websocket-events)
5. [Frontend API Integration Patterns](#5-frontend-api-integration-patterns)
6. [Query Cache & Invalidation Map](#6-query-cache--invalidation-map)
7. [Error Handling](#7-error-handling)
8. [Deployment & Connectivity](#8-deployment--connectivity)

---

## 1. Architecture Overview

```
Frontend (React + Vite)         Backend (Express.js)           Database (PostgreSQL)
     :5000                           :5000                         Neon-backed
  +-----------+                +-----------------+              +-----------+
  | React App |  -- HTTP -->   | Express API     | -- SQL -->   | PostgreSQL|
  | TanStack  |  <-- JSON --  | Drizzle ORM     | <-- rows --  | (Neon)    |
  | Query     |                | Session Store   |              +-----------+
  +-----------+                +-----------------+
       |                             |
       +--- WebSocket (ws://) -------+
            /ws/marketplace
            /ws/telemetry
```

**Stack**: React 18 + TypeScript + Vite (frontend), Express.js + Drizzle ORM (backend), PostgreSQL (database)

**API Pattern**: RESTful JSON over HTTP, session-based authentication, WebSocket for real-time events

**Base URL**: All API routes are prefixed with `/api/`

---

## 2. Authentication & Session Management

### Session Configuration

| Property | Value |
|----------|-------|
| Store | PostgreSQL via `connect-pg-simple` (table: `session`) |
| Secret | `process.env.SESSION_SECRET` or fallback |
| Resave | `false` |
| Save Uninitialized | `false` |
| Cookie Max Age | 7 days (`7 * 24 * 60 * 60 * 1000` ms) |
| Cookie Secure | `true` in production, `false` in development |
| Cookie HttpOnly | `true` |
| Cookie SameSite | `"none"` in production, `"lax"` in development |
| Trust Proxy | Enabled in production (Replit reverse proxy) |

### Middleware

- **`requireAuth`**: Checks `req.session.userId`. Returns `401 Unauthorized` if missing.
- **`requireAdmin`**: Checks user role is `admin`. Returns `403 Forbidden` if not admin.
- All API routes (except public auth routes) use `requireAuth`.

### Frontend Auth Flow

1. **Page Load**: `AuthProvider` calls `GET /api/auth/me` with `credentials: "include"`
2. **Login**: `POST /api/auth/login` sets session cookie, clears stale query cache
3. **Register**: `POST /api/auth/register` sets session cookie, clears stale query cache
4. **Logout**: `POST /api/auth/logout` destroys session, clears all query caches and session storage
5. **Session Refresh**: `refreshUser()` re-fetches `GET /api/auth/me`

### Frontend HTTP Client (`queryClient.ts`)

```typescript
// apiRequest - Used for mutations (POST/PATCH/PUT/DELETE)
apiRequest(method: string, url: string, data?: unknown, customHeaders?: Record<string, string>): Promise<Response>
// Always includes credentials: "include" for session cookies
// Throws on non-2xx responses with status and message

// Default Query Function - Used for all useQuery hooks
// Fetches from queryKey joined as URL path
// credentials: "include" on every request
// On 401: throws by default (configurable to return null)
```

---

## 3. API Route Reference

### 3.1 Auth Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/auth/register` | No | Register new user |
| `POST` | `/api/auth/login` | No | Login with username/password |
| `POST` | `/api/auth/logout` | No | Destroy session |
| `GET` | `/api/auth/me` | No | Get current authenticated user |
| `POST` | `/api/auth/forgot-password` | No | Initiate password reset (sends OTP via email) |
| `POST` | `/api/auth/verify-reset-otp` | No | Verify password reset OTP |
| `POST` | `/api/auth/reset-password` | No | Reset password with verified OTP |
| `POST` | `/api/auth/login-otp/send` | No | Send OTP for passwordless login |
| `POST` | `/api/auth/login-otp/verify` | No | Verify OTP for passwordless login |

#### `POST /api/auth/register`

**Request Body:**
```json
{
  "username": "string (required)",
  "password": "string (required)",
  "email": "string (optional)",
  "role": "shipper | carrier | admin | finance",
  "companyName": "string (optional)",
  "companyAddress": "string (optional)",
  "defaultPickupCity": "string (optional)",
  "phone": "string (required - must match OTP-verified phone)",
  "carrierType": "solo | enterprise (optional, for carriers)",
  "city": "string (optional)",
  "otpId": "string (REQUIRED - phone OTP verification ID)"
}
```

**Response:** `200` with `{ user: AuthUser }`

**OTP Verification Flow (mandatory):**
1. Client calls `POST /api/otp/registration/send` with phone number to get OTP
2. Client calls `POST /api/otp/registration/verify` with OTP code, receives `otpId`
3. `otpId` is passed during registration - server validates it matches the phone number
4. OTP record is marked as `consumed` after successful registration
5. Returns `400` if `otpId` is missing, expired, already used, or phone doesn't match

**Side Effects:**
- Creates user record with hashed password (SHA-256)
- For carriers: creates `carrierProfile` record with carrier type
- For shippers: auto-creates draft `shipperOnboardingRequest`
- Admins are automatically verified (`isVerified: true`)
- Broadcasts `user_registered` WebSocket event to admins
- Sets session `userId`

#### `POST /api/auth/login`

**Request Body:**
```json
{
  "username": "string (accepts username, email, or phone number)",
  "password": "string"
}
```

**Response:** `200` with `{ user: AuthUser }` (excludes password field)

**Lookup Order:** Tries username first, then email, then phone number

#### `GET /api/auth/me`

**Response:** `200` with `{ user: AuthUser }` or `401` if not authenticated

**AuthUser Shape:**
```json
{
  "id": "number",
  "username": "string",
  "email": "string | null",
  "role": "shipper | carrier | admin | finance",
  "companyName": "string | null",
  "phone": "string | null",
  "isVerified": "boolean",
  "carrierType": "solo | enterprise | null"
}
```

#### `POST /api/auth/forgot-password`

**Request Body:**
```json
{
  "email": "string"
}
```

**Response:** `200` with `{ message: "...", otpId: "string" }`

**Side Effects:** Sends 6-digit OTP via email (SMTP)

#### `POST /api/auth/verify-reset-otp`

**Request Body:**
```json
{
  "otpId": "string",
  "otp": "string"
}
```

**Response:** `200` with `{ verified: true, resetToken: "string" }`

#### `POST /api/auth/reset-password`

**Request Body:**
```json
{
  "resetToken": "string",
  "newPassword": "string"
}
```

**Response:** `200` with `{ message: "Password reset successfully" }`

---

### 3.2 User Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `PATCH` | `/api/user/profile` | Yes | Update current user profile |
| `GET` | `/api/users` | Yes | List all users |

#### `PATCH /api/user/profile`

**Request Body:** Partial user fields (companyName, phone, email, etc.)

**Response:** `200` with updated user object

---

### 3.3 Load Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/loads` | Yes | List loads (role-filtered) |
| `POST` | `/api/loads` | Yes | Create new load |
| `GET` | `/api/loads/:id` | Yes | Get load details with enriched data |
| `PATCH` | `/api/loads/:id` | Yes | Update load fields |
| `GET` | `/api/loads/:id/history` | Yes | Get load status history |
| `POST` | `/api/loads/submit` | Yes | Submit load for admin pricing queue |
| `POST` | `/api/loads/suggest-truck` | Yes | AI/ML truck type suggestion |
| `POST` | `/api/loads/:id/accept-direct` | Yes | Carrier accepts fixed-price load directly |
| `POST` | `/api/loads/:id/transition` | Yes | Transition load status |

#### `GET /api/loads`

**Query Parameters:** None (role-based filtering applied server-side)

**Response:** `200` with array of loads filtered by user role:
- **Shipper**: Own loads only
- **Carrier**: Available loads in marketplace statuses
- **Admin**: All loads

#### `GET /api/loads/:id`

**Response:** `200` with enriched load object including:
- Load fields
- Shipper info (username, companyName, phone, email)
- Accepted bid info (carrier name, amount, truck details)
- Shipment info (status, documents)
- Invoice info (status, amounts)
- Bid count, latest negotiation amount
- Carrier advance percentage

#### `POST /api/loads/submit`

**Request Body:** Load fields (all optional, flexible entry)
```json
{
  "shipperContactName": "string",
  "shipperContactPhone": "string",
  "pickupAddress": "string",
  "pickupCity": "string",
  "pickupState": "string",
  "dropoffAddress": "string",
  "dropoffCity": "string",
  "dropoffState": "string",
  "weight": "number",
  "goodsDescription": "string",
  "pickupDate": "string (ISO date)",
  "deliveryDate": "string (ISO date)",
  "truckType": "string",
  "specialNotes": "string"
}
```

**Response:** `201` with created load (status: `pending`)

**Side Effects:** Broadcasts `load_submitted` WebSocket event

#### `POST /api/loads/suggest-truck`

**Request Body:**
```json
{
  "weight": "number",
  "commodity": "string"
}
```

**Response:** `200` with truck suggestions including confidence scores

#### `POST /api/loads/:id/transition`

**Request Body:**
```json
{
  "toStatus": "string (target status)",
  "reason": "string (optional)"
}
```

**Response:** `200` with updated load

**Valid Status Transitions:**
```
draft -> pending -> priced -> posted_to_carriers -> open_for_bid -> counter_received -> awarded ->
invoice_created -> invoice_sent -> invoice_acknowledged -> invoice_paid -> in_transit -> delivered -> closed
```

---

### 3.4 Bid Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/bids` | Yes | List all bids (admin) |
| `POST` | `/api/bids` | Yes | Create bid |
| `PATCH` | `/api/bids/:id` | Yes | Update bid (accept/reject/counter) |
| `POST` | `/api/bids/submit` | Yes | Carrier submits bid on load |
| `GET` | `/api/bids/:id/negotiations` | Yes | Get bid negotiation history |
| `POST` | `/api/bids/:id/negotiate` | Yes | Add negotiation message to bid |
| `GET` | `/api/loads/:loadId/bids` | Yes | Get all bids for a specific load |

#### `POST /api/bids/submit`

**Request Body:**
```json
{
  "loadId": "number",
  "amount": "number",
  "notes": "string (optional)",
  "truckId": "number (required for enterprise carriers)",
  "driverId": "number (optional)"
}
```

**Response:** `201` with created bid

**Validation:**
- Carrier must be verified (`isVerified: true`)
- Carrier document compliance checked (expiry enforcement)
- Load must be in biddable status (`posted_to_carriers`, `open_for_bid`, `counter_received`)
- Enterprise carriers: truck and driver availability checked (no double-assignment)

**Side Effects:** Broadcasts `bid_received` WebSocket event, creates notification for admin

#### `PATCH /api/bids/:id`

**Request Body:**
```json
{
  "action": "accept | reject | counter",
  "amount": "number (for counter)",
  "reason": "string (for reject)"
}
```

**Accept Side Effects:**
- Updates load status to `awarded`
- Rejects all other pending bids on same load
- Creates shipment record
- Assigns truck/driver from bid to shipment
- Creates notifications for carrier and shipper
- Broadcasts WebSocket events (`bid_accepted`, `bid_rejected`)

#### `POST /api/bids/:id/negotiate`

**Request Body:**
```json
{
  "amount": "number",
  "message": "string",
  "role": "admin | carrier"
}
```

**Response:** `200` with negotiation record

---

### 3.5 Truck Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/trucks` | Yes | List carrier's trucks |
| `POST` | `/api/trucks` | Yes | Add new truck |
| `PATCH` | `/api/trucks/:id` | Yes | Update truck details |
| `DELETE` | `/api/trucks/:id` | Yes | Delete truck |

#### `POST /api/trucks`

**Request Body:**
```json
{
  "registrationNumber": "string",
  "truckType": "string",
  "capacity": "number (tons)",
  "manufacturer": "string",
  "model": "string",
  "year": "number",
  "currentLocation": "string"
}
```

---

### 3.6 Driver Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/drivers` | Yes | List carrier's drivers |
| `POST` | `/api/drivers` | Yes | Add new driver (all fields mandatory) |
| `PATCH` | `/api/drivers/:id` | Yes | Update driver |
| `DELETE` | `/api/drivers/:id` | Yes | Delete driver |

#### `POST /api/drivers`

**Request Body (all mandatory):**
```json
{
  "name": "string",
  "phone": "string",
  "licenseNumber": "string",
  "licenseExpiry": "string (ISO date)",
  "experience": "number (years)"
}
```

---

### 3.7 Shipment Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/shipments` | Yes | List shipments |
| `GET` | `/api/shipments/:id` | Yes | Get shipment details |
| `GET` | `/api/shipments/tracking` | Yes | Get all tracked shipments with enriched data |
| `GET` | `/api/shipments/:id/tracking` | Yes | Get specific shipment tracking data |
| `GET` | `/api/shipments/load/:loadId` | Yes | Get shipment for a specific load |
| `PATCH` | `/api/shipments/:id/assign-driver` | Yes | Assign driver to shipment |
| `PATCH` | `/api/shipments/:id/assign-truck` | Yes | Assign truck to shipment |
| `GET` | `/api/shipments/:id/documents` | Yes | Get shipment documents |
| `POST` | `/api/shipments/:id/documents` | Yes | Upload document to shipment |

#### `POST /api/shipments/:id/documents`

**Request Body:**
```json
{
  "type": "string (e.g., pod, lr, invoice, weighment, ewayBill)",
  "name": "string",
  "url": "string (Object Storage URL)",
  "fileKey": "string (storage key)",
  "mimeType": "string"
}
```

**Side Effects:** Broadcasts `shipment_document_uploaded` WebSocket event, notifies shipper

---

### 3.8 Invoice Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/invoices` | Yes | List invoices |
| `GET` | `/api/invoices/:id` | Yes | Get invoice details |
| `POST` | `/api/invoices` | Yes | Create invoice |
| `PATCH` | `/api/invoices/:id` | Yes | Update invoice |
| `POST` | `/api/invoices/:id/send` | Yes | Send invoice to shipper |
| `GET` | `/api/invoices/:id/responses` | Yes | Get invoice response history |
| `POST` | `/api/invoices/:id/respond` | Yes | Add response to invoice |
| `POST` | `/api/invoices/:id/confirm` | Yes | Shipper confirms invoice |
| `POST` | `/api/invoices/:id/reject` | Yes | Shipper rejects invoice |
| `POST` | `/api/invoices/:id/negotiate` | Yes | Shipper negotiates invoice |
| `GET` | `/api/invoices/shipper` | Yes | Get shipper's invoices |

**Key Invoice Fields:**
```json
{
  "loadId": "number",
  "shipmentId": "number",
  "memoNumber": "string (auto-generated: LS-MEMO-XXXX)",
  "amount": "number (shipper total / adminFinalPrice)",
  "carrierPayout": "number (finalPrice)",
  "platformMargin": "number",
  "advanceAmount": "number",
  "balanceAmount": "number",
  "status": "draft | sent | acknowledged | confirmed | rejected | paid"
}
```

**Price Sync Rule:** When invoice `amount` is edited, load `adminFinalPrice` updates bidirectionally. When admin reprices a load, invoice `amount` syncs automatically.

---

### 3.9 Notification Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/notifications` | Yes | Get user's notifications |
| `PATCH` | `/api/notifications/:id/read` | Yes | Mark notification as read |
| `POST` | `/api/notifications/read-all` | Yes | Mark all notifications as read |

---

### 3.10 Admin Routes

#### Load Management

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/admin/loads` | Admin | List all loads |
| `POST` | `/api/admin/loads` | Admin | Create load |
| `PATCH` | `/api/admin/loads/:id` | Admin | Update load |
| `POST` | `/api/admin/loads/create` | Admin | Post load on behalf of shipper |
| `POST` | `/api/admin/loads/:loadId/reprice-repost` | Admin | Reprice and repost load |
| `GET` | `/api/admin/queue` | Admin | Get pricing queue |
| `POST` | `/api/admin/price` | Admin | Price a load |

##### `POST /api/admin/loads/create`

**Request Body:**
```json
{
  "existingShipperId": "number (optional, use existing shipper)",
  "shipperContactName": "string (for auto-create shipper)",
  "shipperContactPhone": "string (for auto-create shipper)",
  "shipperCompanyName": "string",
  "shipperCompanyAddress": "string",
  "postImmediately": "boolean",
  "adminGrossPrice": "number (if posting immediately)",
  "platformMarginPercent": "number",
  "carrierAdvancePercent": "number",
  "...loadFields": "all standard load fields"
}
```

**Auto-Create Shipper Logic:**
- Checks phone against existing users (normalized 10-digit, raw, +91 prefix)
- Reuses existing shipper if phone matches
- Returns error if phone matches non-shipper user
- Creates new user with hashed password and auto-generated email
- Creates approved onboarding record

##### `POST /api/admin/loads/:loadId/reprice-repost`

**Request Body:**
```json
{
  "grossPrice": "number",
  "platformMarginPercent": "number",
  "carrierAdvancePercent": "number"
}
```

**Side Effects:** Rejects all pending bids, updates invoice if exists, broadcasts `load_updated`

##### `POST /api/admin/price`

**Request Body:**
```json
{
  "loadId": "number",
  "grossPrice": "number",
  "platformMarginPercent": "number",
  "carrierAdvancePercent": "number",
  "pricingType": "fixed | negotiable",
  "postToMarketplace": "boolean"
}
```

**Side Effects:**
- Sets `adminFinalPrice`, `finalPrice`, `platformMargin`
- Transitions load status to `priced` or `posted_to_carriers`
- Broadcasts WebSocket events

#### Pricing System

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/admin/pricing/suggest` | Admin | AI-assisted price suggestion |
| `POST` | `/api/admin/pricing/calculate` | Admin | Calculate pricing breakdown |
| `POST` | `/api/admin/pricing/save` | Admin | Save pricing draft |
| `POST` | `/api/admin/pricing/lock` | Admin | Lock and post pricing |
| `POST` | `/api/admin/pricing/approve` | Admin | Approve pricing |
| `POST` | `/api/admin/pricing/reject` | Admin | Reject pricing |
| `GET` | `/api/admin/pricing/history/:loadId` | Admin | Get pricing history |
| `GET` | `/api/admin/pricing/:loadId` | Admin | Get current pricing |
| `GET` | `/api/admin/pricing/templates` | Admin | List pricing templates |
| `POST` | `/api/admin/pricing/templates` | Admin | Create pricing template |
| `DELETE` | `/api/admin/pricing/templates/:id` | Admin | Delete pricing template |

#### Invoice Management

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/admin/invoices` | Admin | List all invoices with search |
| `POST` | `/api/admin/invoices` | Admin | Create invoice |
| `GET` | `/api/admin/invoices/:id` | Admin | Get invoice details |
| `PUT` | `/api/admin/invoices/:id` | Admin | Update invoice |
| `POST` | `/api/admin/invoices/:id/send` | Admin | Send invoice to shipper |
| `POST` | `/api/admin/invoices/:id/pay` | Admin | Mark invoice as paid |
| `POST` | `/api/admin/invoices/:id/mark-paid` | Admin | Mark invoice payment complete |
| `POST` | `/api/admin/invoices/:id/respond` | Admin | Admin responds to invoice query |
| `GET` | `/api/admin/invoices/:id/history` | Admin | Invoice change history |
| `GET` | `/api/admin/invoices/load/:loadId` | Admin | Get invoice by load ID |
| `POST` | `/api/admin/invoice/generate-and-send` | Admin | Generate invoice and send in one step |
| `POST` | `/api/admin/invoices/generate` | Admin | Generate invoice draft |

**Invoice Search (GET /api/admin/invoices):**

Searches across: Load ID, shipper username, pickup/dropoff cities, company name, memo number

#### Negotiation System

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/admin/negotiations` | Admin | List all active negotiations |
| `GET` | `/api/admin/negotiations/:loadId` | Admin | Get negotiations for a load |
| `POST` | `/api/admin/negotiations/:loadId/counter` | Admin | Admin counters carrier bid |
| `POST` | `/api/admin/negotiations/:loadId/accept` | Admin | Admin accepts carrier bid |
| `POST` | `/api/admin/negotiations/:loadId/reject` | Admin | Admin rejects carrier bid |
| `POST` | `/api/admin/negotiations/:loadId/simulate` | Admin | Simulate negotiation outcome |
| `GET` | `/api/admin/negotiations/counters` | Admin | Get counter-offer summary |

#### Carrier Management

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/admin/carriers` | Admin | List all carriers with profiles |
| `GET` | `/api/admin/carriers/:id` | Admin | Get carrier detail with trucks, drivers, docs |
| `PATCH` | `/api/admin/carriers/:id/verify` | Admin | Verify/unverify carrier |
| `PATCH` | `/api/admin/carriers/:id/type` | Admin | Update carrier type |
| `POST` | `/api/admin/carriers/backfill-types` | Admin | Backfill missing carrier types |
| `PATCH` | `/api/admin/documents/:id/verify` | Admin | Verify/reject carrier document |

#### User Management

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/admin/users` | Admin | List all users with filtering |
| `POST` | `/api/admin/users` | Admin | Create new user |
| `PATCH` | `/api/admin/users/:id` | Admin | Update user details |

#### Onboarding Management

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/admin/onboarding-requests` | Admin | List onboarding requests |
| `GET` | `/api/admin/onboarding-requests/:id` | Admin | Get specific request |
| `POST` | `/api/admin/onboarding-requests/:id/review` | Admin | Approve/reject onboarding |
| `GET` | `/api/admin/onboarding-requests/stats` | Admin | Onboarding statistics |

##### `POST /api/admin/onboarding-requests/:id/review`

**Request Body:**
```json
{
  "status": "approved | rejected | on_hold",
  "notes": "string (optional)"
}
```

**Side Effects (on approval):**
- Sets `isVerified: true` on user record
- Invalidates both onboarding and users caches

#### Carrier Verification

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/admin/verifications` | Admin | List verification requests |
| `GET` | `/api/admin/verifications/pending` | Admin | List pending verifications |
| `POST` | `/api/admin/verifications/:id/approve` | Admin | Approve verification |
| `POST` | `/api/admin/verifications/:id/reject` | Admin | Reject verification |
| `POST` | `/api/admin/verifications/:id/hold` | Admin | Put verification on hold |
| `PATCH` | `/api/admin/verification-documents/:id` | Admin | Update document status |

#### Credit Assessment

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/admin/credit-assessments` | Admin | List all assessments |
| `GET` | `/api/admin/credit-assessments/:shipperId` | Admin | Get shipper assessment |
| `POST` | `/api/admin/credit-assessments/:shipperId` | Admin | Create/update assessment |
| `GET` | `/api/admin/credit-assessments/:shipperId/evaluations` | Admin | Get evaluation history |
| `POST` | `/api/admin/credit-assessments/:shipperId/auto-assess` | Admin | Auto-assess shipper |
| `POST` | `/api/admin/credit-assessments/bulk-auto-assess` | Admin | Bulk auto-assess |

#### Other Admin Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/admin/stats` | Admin | Dashboard statistics |
| `GET` | `/api/admin/live-tracking` | Admin | Live tracking data with enriched shipments |
| `GET` | `/api/admin/analytics/realtime` | Admin | Real-time analytics |
| `GET` | `/api/admin/contact` | Admin | Contact form submissions |
| `GET` | `/api/admin/shippers/verified` | Admin | List verified shippers |
| `POST` | `/api/admin/assign` | Admin | Assign carrier to load |
| `POST` | `/api/admin/award-bid` | Admin | Award bid to carrier |
| `POST` | `/api/admin/counter-response` | Admin | Respond to counter-offer |
| `POST` | `/api/admin/estimate-price` | Admin | Estimate pricing |
| `GET` | `/api/admin/audit/:loadId` | Admin | Load audit trail |
| `GET` | `/api/admin/feature-flags` | Admin | Get feature flags |
| `POST` | `/api/admin/feature-flags/:name/toggle` | Admin | Toggle feature flag |
| `GET` | `/api/admin/proposals/load/:loadId` | Admin | Get proposals for load |
| `POST` | `/api/admin/proposals/send` | Admin | Send proposal |
| `POST` | `/api/admin/seed-carriers` | Admin | Seed test carriers |
| `POST` | `/api/admin/seed-pending-verifications` | Admin | Seed test verifications |

#### Admin Troubleshoot Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/admin/troubleshoot/load/:id` | Admin | Debug load data |
| `GET` | `/api/admin/troubleshoot/queue` | Admin | Debug pricing queue |
| `POST` | `/api/admin/troubleshoot/queue/:id/process` | Admin | Force process queue item |
| `POST` | `/api/admin/troubleshoot/requeue/:loadId` | Admin | Requeue load for pricing |
| `POST` | `/api/admin/troubleshoot/force-post/:loadId` | Admin | Force post load |
| `POST` | `/api/admin/troubleshoot/rollback-price/:loadId` | Admin | Rollback pricing |
| `POST` | `/api/admin/troubleshoot/generate-invoice/:loadId` | Admin | Force generate invoice |
| `POST` | `/api/admin/troubleshoot/send-invoice/:invoiceId` | Admin | Force send invoice |
| `GET` | `/api/admin/troubleshoot/audit-trail/:loadId` | Admin | Full audit trail |
| `GET` | `/api/admin/troubleshoot/api-logs/:loadId` | Admin | API logs for load |

#### Admin Settlement Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/admin/settlements` | Admin | Create settlement |
| `POST` | `/api/admin/settlements/:id/pay` | Admin | Process settlement payment |

---

### 3.11 Carrier Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/carrier/loads` | Yes | Available loads for carrier marketplace |
| `GET` | `/api/carrier/available-loads` | Yes | Alternative available loads endpoint |
| `GET` | `/api/carrier/bids` | Yes | Carrier's bid history |
| `POST` | `/api/carrier/bids/:bidId/counter` | Yes | Counter admin's offer |
| `POST` | `/api/carrier/bids/:bidId/accept` | Yes | Accept admin's counter-offer |
| `GET` | `/api/carrier/dashboard/stats` | Yes | Carrier dashboard stats |
| `GET` | `/api/carrier/recommended-loads` | Yes | AI-recommended loads |
| `GET` | `/api/carrier/documents` | Yes | Carrier's documents |
| `POST` | `/api/carrier/documents` | Yes | Upload carrier document |
| `DELETE` | `/api/carrier/documents/:id` | Yes | Delete carrier document |
| `GET` | `/api/carrier/documents/expiring` | Yes | Expiring documents |
| `GET` | `/api/carrier/onboarding` | Yes | Get onboarding status |
| `PATCH` | `/api/carrier/onboarding/draft` | Yes | Save onboarding draft |
| `POST` | `/api/carrier/onboarding/submit` | Yes | Submit onboarding |
| `GET` | `/api/carrier/verification` | Yes | Get verification status |
| `POST` | `/api/carrier/verification` | Yes | Create verification request |
| `POST` | `/api/carrier/verification/documents` | Yes | Upload verification document |
| `PATCH` | `/api/carrier/solo/profile` | Yes | Update solo carrier profile |
| `PATCH` | `/api/carrier/truck/:truckId` | Yes | Update carrier's truck |

#### `GET /api/carrier/loads`

**Response:** Available loads in statuses: `posted_to_carriers`, `open_for_bid`, `counter_received`

Includes load details, shipper info, and pricing information visible to carriers.

#### `POST /api/carrier/bids/:bidId/counter`

**Request Body:**
```json
{
  "counterAmount": "number",
  "message": "string (optional)"
}
```

**Side Effects:** Creates negotiation record, broadcasts `bid_countered` WebSocket event

#### `POST /api/carrier/bids/:bidId/accept`

**Request Body:**
```json
{
  "bidId": "number"
}
```

**Side Effects:** Same as admin bid acceptance workflow

---

### 3.12 Shipper Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/shipper/profile` | Yes | Get shipper profile |
| `GET` | `/api/shipper/:id/profile` | Yes | Get shipper profile by ID |
| `GET` | `/api/shipper/onboarding` | Yes | Get onboarding status |
| `POST` | `/api/shipper/onboarding` | Yes | Create onboarding request |
| `PUT` | `/api/shipper/onboarding` | Yes | Update onboarding request |
| `PATCH` | `/api/shipper/onboarding/draft` | Yes | Save onboarding draft |
| `GET` | `/api/shipper/documents` | Yes | Get shipper's shipment documents |
| `GET` | `/api/shipper/saved-addresses` | Yes | Get all saved addresses |
| `GET` | `/api/shipper/saved-addresses/:type` | Yes | Get saved addresses by type (pickup/dropoff) |
| `POST` | `/api/shipper/saved-addresses` | Yes | Save new address |
| `POST` | `/api/shipper/saved-addresses/:id/use` | Yes | Increment address usage count |
| `DELETE` | `/api/shipper/saved-addresses/:id` | Yes | Delete saved address |
| `POST` | `/api/shipper/invoices/:id/acknowledge` | Yes | Acknowledge invoice receipt |
| `POST` | `/api/shipper/invoices/:id/negotiate` | Yes | Negotiate invoice amount |
| `POST` | `/api/shipper/invoices/:id/pay` | Yes | Confirm invoice payment |
| `POST` | `/api/shipper/invoices/:id/query` | Yes | Query invoice details |
| `POST` | `/api/shipper/invoices/:id/view` | Yes | Mark invoice as viewed |

#### Shipper Onboarding

**Role Selection:** `"shipper"` or `"transporter"` (transporter requires LR copy upload)

**Statuses:** `draft -> pending -> under_review -> approved | rejected | on_hold`

**Onboarding Request Body:**
```json
{
  "businessName": "string",
  "businessType": "string",
  "gstNumber": "string",
  "panNumber": "string",
  "shipperRole": "shipper | transporter",
  "contactName": "string",
  "contactPhone": "string",
  "contactEmail": "string",
  "address": "string",
  "city": "string",
  "state": "string",
  "documents": {
    "gst_certificate": "string (URL)",
    "pan_card": "string (URL)",
    "lr_copy": "string (URL, required for transporter)"
  }
}
```

---

### 3.13 OTP Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/otp/request-start` | Yes | Request trip start OTP |
| `POST` | `/api/otp/request-route-start` | Yes | Request route start OTP |
| `POST` | `/api/otp/request-end` | Yes | Request trip end OTP |
| `GET` | `/api/otp/requests` | Yes | Get OTP requests (admin view) |
| `GET` | `/api/otp/shipper-requests` | Yes | Get shipper's OTP requests |
| `POST` | `/api/otp/approve/:requestId` | Yes | Admin approves OTP request |
| `POST` | `/api/otp/regenerate/:requestId` | Yes | Regenerate OTP |
| `POST` | `/api/otp/reject/:requestId` | Yes | Reject OTP request |
| `POST` | `/api/otp/verify` | Yes | Verify OTP code |
| `GET` | `/api/otp/status/:shipmentId` | Yes | Get OTP status for shipment |
| `POST` | `/api/otp/registration/send` | No | Send registration OTP |
| `POST` | `/api/otp/registration/verify` | No | Verify registration OTP |
| `POST` | `/api/otp/registration/send-email` | No | Send email verification OTP |
| `POST` | `/api/otp/registration/verify-email` | No | Verify email OTP |

---

### 3.14 Telemetry Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/telemetry/vehicles` | Yes | All vehicle telematics data |
| `GET` | `/api/telemetry/vehicles/:vehicleId` | Yes | Single vehicle telematics |
| `GET` | `/api/telemetry/vehicle-ids` | Yes | Active vehicle IDs |
| `GET` | `/api/telemetry/eta/:loadId` | Yes | AI-predicted ETA |
| `GET` | `/api/telemetry/breadcrumbs/:vehicleId` | Yes | GPS breadcrumb trail |
| `GET` | `/api/telemetry/driver-behavior/:driverId` | Yes | Driver behavior score |
| `GET` | `/api/telemetry/alerts` | Yes | All telematics alerts |
| `GET` | `/api/telemetry/alerts/:vehicleId` | Yes | Vehicle-specific alerts |

---

### 3.15 Rating Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/shipper-ratings` | Yes | Carrier rates shipper |
| `GET` | `/api/shipper/:shipperId/rating` | No | Get shipper's average rating |
| `GET` | `/api/shipper/:shipperId/ratings` | No | Get all shipper ratings |
| `GET` | `/api/shipper-ratings/check/:shipmentId` | Yes | Check if rated for shipment |
| `POST` | `/api/carrier-ratings` | Yes | Shipper rates carrier |
| `GET` | `/api/carrier/:carrierId/rating` | No | Get carrier's average rating |
| `GET` | `/api/carrier/:carrierId/ratings` | No | Get all carrier ratings |
| `GET` | `/api/carrier-ratings/check/:shipmentId` | Yes | Check if rated for shipment |

---

### 3.16 Finance Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/finance/shipments` | Finance/Admin | List shipments for review |
| `POST` | `/api/finance/reviews` | Finance/Admin | Create/update finance review |
| `PATCH` | `/api/finance/reviews/:id/payment` | Finance/Admin | Update payment status |
| `GET` | `/api/finance/reviews/all` | Finance/Admin | Get all finance reviews |
| `GET` | `/api/finance/reviews/:shipmentId` | Finance/Admin | Get review for shipment |

**Finance Review Body:**
```json
{
  "shipmentId": "number",
  "status": "approved | on_hold | rejected",
  "comment": "string"
}
```

**Payment Status Values:** `not_released | processing | released`

---

### 3.17 Settlement Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/settlements` | Yes | List all settlements |
| `GET` | `/api/settlements/carrier` | Yes | Carrier's settlements |
| `POST` | `/api/settlements` | Yes | Create settlement |
| `PATCH` | `/api/settlements/:id` | Yes | Update settlement |

---

### 3.18 Saved Address Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/admin/saved-addresses/:shipperId/:type` | Admin | Get shipper's saved addresses |
| `POST` | `/api/admin/saved-addresses` | Admin | Save address for shipper |
| `GET` | `/api/shipper/saved-addresses` | Yes | Get own saved addresses |
| `GET` | `/api/shipper/saved-addresses/:type` | Yes | Get by type (pickup/dropoff) |
| `POST` | `/api/shipper/saved-addresses` | Yes | Save new address |
| `POST` | `/api/shipper/saved-addresses/:id/use` | Yes | Record address usage |
| `DELETE` | `/api/shipper/saved-addresses/:id` | Yes | Delete saved address |

---

### 3.19 Recommendation Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/loads/:id/recommended-carriers` | Admin | Top 10 carrier matches for load |
| `GET` | `/api/carrier/recommended-loads` | Yes | Loads ranked by match score |

**Scoring Algorithm (100 points max):**

| Factor | Points | Description |
|--------|--------|-------------|
| Truck Type Match | 30 | Carrier has matching truck type |
| Capacity Match | 25 | Truck can carry the load weight |
| Route Experience | 20 | Prior shipments on similar routes |
| Commodity Experience | 15 | Prior shipments with similar goods |
| Shipper Experience | 10 | Prior work with the shipper |

---

### 3.20 Contact Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/contact` | No | Submit contact form |

---

## 4. WebSocket Events

### Connection

**Endpoint:** `ws://{host}/ws/marketplace` (or `wss://` for HTTPS)

**Handshake:**
```json
// Client sends after connection:
{ "type": "identify", "role": "carrier|admin|shipper", "userId": "string" }

// Server responds:
{ "type": "identified", "role": "carrier", "timestamp": "ISO string" }
```

### Event Types

| Event | Direction | Trigger | Cache Invalidations |
|-------|-----------|---------|---------------------|
| `load_posted` | Server -> All | Admin posts load to marketplace | `/api/carrier/loads`, `/api/loads` |
| `load_updated` | Server -> All | Load details changed | `/api/carrier/loads`, `/api/loads`, `/api/loads/{id}` |
| `bid_received` | Server -> Admin | Carrier submits bid | `/api/admin/negotiations`, `/api/bids` |
| `bid_countered` | Server -> Carrier | Admin counters bid | `/api/bids`, `/api/carrier/bids` |
| `bid_accepted` | Server -> All | Bid awarded to carrier | `/api/bids`, `/api/carrier/bids`, `/api/carrier/loads`, `/api/shipments`, `/api/settlements`, `/api/loads` |
| `bid_rejected` | Server -> Carrier | Bid rejected | `/api/bids`, `/api/carrier/bids`, `/api/carrier/loads` |
| `invoice_update` | Server -> All | Invoice status changed | `/api/invoices`, `/api/invoices/shipper`, `/api/admin/invoices`, `/api/settlements` |
| `negotiation_message` | Server -> Involved | New negotiation chat message | `/api/bids/negotiations`, `/api/admin/negotiations` |
| `verification_status_changed` | Server -> Carrier | Carrier verification updated | `/api/carrier/verification`, `/api/me` |
| `otp_approved` | Server -> All | OTP request approved | `/api/shipments`, `/api/loads`, `/api/admin/otp-queue` |
| `otp_requested` | Server -> Admin | Carrier requests OTP | `/api/shipments`, `/api/admin/otp-queue` |
| `trip_completed` | Server -> All | Shipment delivered | `/api/shipments`, `/api/loads`, `/api/admin/otp-queue`, `/api/settlements` |
| `shipment_document_uploaded` | Server -> Shipper | Carrier uploads document | `/api/shipper/documents`, `/api/shipments` |
| `carrier_document_uploaded` | Server -> Admin | Carrier uploads verification doc | `/api/admin/carriers`, `/api/admin/verifications` |

### Telemetry WebSocket

**Endpoint:** `ws://{host}/ws/telemetry`

Provides real-time vehicle GPS, diagnostics, and CAN-Bus data for shipper tracking portal.

---

## 5. Frontend API Integration Patterns

### Query Hooks (TanStack Query v5)

```typescript
// Pattern: useQuery with array queryKey
const { data, isLoading, error } = useQuery({
  queryKey: ['/api/loads'],  // queryKey doubles as the fetch URL
});

// Pattern: Parameterized query
const { data } = useQuery({
  queryKey: ['/api/loads', loadId],  // fetches /api/loads/{loadId}
});

// Pattern: Nested resource
const { data } = useQuery({
  queryKey: ['/api/loads', loadId, 'bids'],  // fetches /api/loads/{loadId}/bids
});
```

### Mutation Pattern

```typescript
const mutation = useMutation({
  mutationFn: async (data) => {
    const res = await apiRequest("POST", "/api/endpoint", data);
    return res.json();
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['/api/related-data'] });
    toast({ title: "Success" });
  },
  onError: (error) => {
    toast({ title: "Error", description: error.message, variant: "destructive" });
  },
});
```

### Default Query Configuration

```typescript
{
  queryFn: getQueryFn({ on401: "throw" }),  // Throws on 401
  refetchInterval: false,
  refetchOnWindowFocus: false,
  staleTime: 5000,  // 5 seconds
  retry: false,
}
```

---

## 6. Query Cache & Invalidation Map

### Admin Portal Cache Keys

| Query Key | Used In | Invalidated By |
|-----------|---------|----------------|
| `/api/admin/queue` | Load Queue | Price, reprice, load transitions |
| `/api/admin/loads` | Loads page | Load CRUD, reprice |
| `/api/admin/negotiations` | Negotiations | Bid actions, WebSocket |
| `/api/admin/invoices` | Invoices | Invoice CRUD, send, pay |
| `/api/admin/carriers` | Carriers | Verify, type change |
| `/api/admin/users` | Users | User CRUD, onboarding approval |
| `/api/admin/onboarding-requests` | Onboarding | Review actions |
| `/api/admin/onboarding-requests/stats` | Overview | Review actions |
| `/api/admin/analytics/realtime` | Overview | Auto-refresh |
| `/api/admin/verifications` | Verification | Approve/reject/hold |
| `/api/admin/shippers/verified` | Post Load | Onboarding approval |
| `/api/admin/saved-addresses` | Post Load | Address save |
| `/api/admin/stats` | Dashboard | Various |

### Carrier Portal Cache Keys

| Query Key | Used In | Invalidated By |
|-----------|---------|----------------|
| `/api/carrier/loads` | Marketplace | WebSocket events, bid submit |
| `/api/carrier/bids` | My Bids | Bid actions, WebSocket |
| `/api/carrier/recommended-loads` | Marketplace | Load changes |
| `/api/carrier/shipments` | Shipments | Bid accept, OTP |
| `/api/trucks` | Fleet | Truck CRUD |
| `/api/drivers` | Drivers | Driver CRUD |
| `/api/carrier/documents` | Documents | Upload/delete |

### Shipper Portal Cache Keys

| Query Key | Used In | Invalidated By |
|-----------|---------|----------------|
| `/api/loads` | My Loads | Load submit, edit |
| `/api/shipments/tracking` | Tracking, Dashboard | WebSocket events |
| `/api/shipper/documents` | Documents | Document upload |
| `/api/shipper/onboarding` | Onboarding | Draft save, submit |
| `/api/invoices/shipper` | Invoices | Invoice actions |
| `/api/shipper/saved-addresses` | Post Load | Address save/delete |

### Common Cache Keys

| Query Key | Used In | Invalidated By |
|-----------|---------|----------------|
| `/api/notifications` | Notification Panel | Read, read-all |
| `/api/settlements` | Multiple | Bid accept, payments |
| `/api/settlements/carrier` | Carrier Revenue | Bid accept, payments |

---

## 7. Error Handling

### Backend Error Responses

All errors follow this pattern:
```json
{
  "error": "Human-readable error message"
}
```

**HTTP Status Codes:**

| Code | Meaning | When Used |
|------|---------|-----------|
| 400 | Bad Request | Validation failure, invalid state transition |
| 401 | Unauthorized | Missing session / not logged in |
| 403 | Forbidden | Role mismatch (e.g., non-admin accessing admin route) |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate (e.g., username taken, bid already exists) |
| 500 | Internal Server Error | Unexpected server-side failure |

### Frontend Error Handling

```typescript
// apiRequest throws on non-2xx with format: "STATUS: message"
// Example: "400: Load not found"
// Example: "401: Unauthorized"

// TanStack Query catches and surfaces via error property
const { error } = useQuery({ queryKey: [...] });
// error.message contains the "STATUS: message" string

// Toast pattern for mutations:
onError: (error: Error) => {
  toast({
    title: "Error",
    description: error.message,
    variant: "destructive",
  });
}
```

---

## 8. Deployment & Connectivity

### Server Configuration

| Setting | Value |
|---------|-------|
| Port | 5000 (frontend and backend on same port) |
| Frontend Build | Vite (production build served by Express) |
| Backend | Express.js with session middleware |
| Database | PostgreSQL via `DATABASE_URL` environment variable |
| Session Store | PostgreSQL (`session` table, auto-created) |
| Trust Proxy | Enabled in production |
| Cookie Secure | `true` in production |
| Cookie SameSite | `"none"` in production, `"lax"` in development |

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Express session encryption key |
| `SMTP_USER` | Email sender address (OTP, notifications) |
| `SMTP_PASS` | Email sender password |
| `OPENAI_API_KEY` | AI truck suggestions, help bot |

### API Request Flow

```
Browser Request
    |
    v
Vite Dev Server (development) / Express Static (production)
    |
    +--> /api/* routes -> Express Router -> Session Check -> Route Handler -> Drizzle ORM -> PostgreSQL
    |
    +--> /ws/* routes -> WebSocket Server -> Real-time Event Broadcasting
    |
    +--> /* (other) -> Vite/React SPA (client-side routing via wouter)
```

### CORS & Credentials

- No explicit CORS configuration needed (frontend and backend share same origin)
- All API requests include `credentials: "include"` for session cookies
- WebSocket connections use same-origin, no additional auth needed (session validated server-side)

### Database Schema Management

- **ORM**: Drizzle ORM with PostgreSQL driver (`pg`)
- **Schema**: Defined in `shared/schema.ts` using Drizzle table definitions
- **Migrations**: `npm run db:push` syncs schema to database
- **Validation**: Zod schemas generated via `drizzle-zod` (`createInsertSchema`)

### Key Business Rules (Server-Enforced)

1. **Shipper verification required** before posting loads
2. **Carrier verification required** before bidding (document compliance checked)
3. **One truck + one driver per active load** for enterprise carriers
4. **Bid acceptance** auto-rejects all other bids, creates shipment
5. **Price sync**: `adminFinalPrice` (shipper total) and `finalPrice` (carrier payout) stay synced between loads and invoices
6. **Advance separation**: `advancePaymentPercent` (shipper) and `carrierAdvancePercent` (carrier) are independent fields
7. **Document expiry** blocks carrier from bidding or starting trips
8. **Load status lifecycle** enforces valid state transitions only

### Deductions (Finance Module)

| Deduction | Rate |
|-----------|------|
| TDS | 2% (when no TDS declaration on file) |
| Halting Charges | Rs. 500 per trip |
| POD Penalty | Rs. 100/day after 15-day grace period |

---

*Generated for LoadSmart (powered by Roadex) - Digital Freight Marketplace*
