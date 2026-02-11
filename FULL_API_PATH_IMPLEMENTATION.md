# LoadSmart - Full API Path Implementation & Connectivity Reference

> Exact end-to-end API path addresses, full URLs, frontend callers, screen mappings, and deployed connectivity for the entire platform.

---

## Table of Contents

1. [Base URL & ENV Resolution](#1-base-url--env-resolution)
2. [Backend API Master List](#2-backend-api-master-list)
3. [Frontend API Calling Path](#3-frontend-api-calling-path)
4. [Screen-to-API Mapping](#4-screen-to-api-mapping)
5. [Deployed Connectivity URLs](#5-deployed-connectivity-urls)

---

## 1. Base URL & ENV Resolution

### URL Construction

LoadSmart runs frontend + backend on a **single origin** (same port, no separate API domain). All API calls use **relative paths** with no base URL prefix.

| Property | Value |
|----------|-------|
| Server Bind | `0.0.0.0:5000` |
| Protocol (Dev) | `http://` |
| Protocol (Prod) | `https://` |
| API Prefix | `/api/` (relative, no base URL) |
| WebSocket (Dev) | `ws://{host}/ws/marketplace` |
| WebSocket (Prod) | `wss://{host}/ws/marketplace` |

### Dev URL

```
http://localhost:5000
```

All API calls: `http://localhost:5000/api/*`

Replit Dev Domain: `https://{repl-slug}.{username}.repl.co` (auto-assigned)

### Prod URL

```
https://{repl-slug}.replit.app
```

All API calls: `https://{repl-slug}.replit.app/api/*`

Custom domain (if configured): `https://loadsmart.in` or user-configured domain

### How Frontend Resolves URLs

**No explicit BASE_URL or axios baseURL exists.** All frontend API calls use relative paths:

```typescript
// queryClient.ts - Default query function
fetch(queryKey.join("/"), { credentials: "include" })
// Example: queryKey ['/api/loads'] => fetches /api/loads

// apiRequest() - Mutation helper
fetch(url, { method, headers, body, credentials: "include" })
// Example: apiRequest("POST", "/api/loads/submit", data)

// auth-context.tsx - Direct fetch calls
fetch("/api/auth/me", { credentials: "include" })
fetch("/api/auth/login", { method: "POST", credentials: "include", body })
```

**WebSocket URL construction** (marketplace-socket.ts):
```typescript
const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
const wsUrl = `${protocol}//${window.location.host}/ws/marketplace`;
```

### Environment Variables (Server-Side)

| Variable | Source | Purpose |
|----------|--------|---------|
| `DATABASE_URL` | Replit Secrets | PostgreSQL connection string |
| `SESSION_SECRET` | Replit Secrets / Fallback | Express session encryption |
| `SMTP_USER` | Replit Secrets | Email sender (OTP, notifications) |
| `SMTP_PASS` | Replit Secrets | Email password |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | Replit Integration | OpenAI API key |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | Replit Integration | OpenAI base URL |
| `PORT` | Runtime | Server port (default: 5000) |
| `NODE_ENV` | Runtime | "production" or "development" |

### Config Files

| File | Purpose |
|------|---------|
| `vite.config.ts` | Vite build config, dev server, aliases |
| `server/index.ts` | Express app entry, middleware, port binding |
| `server/routes.ts` | All API route definitions |
| `server/vite.ts` | Vite dev middleware (development only) |
| `server/static.ts` | Static file serving (production only) |
| `server/db.ts` | PostgreSQL pool (`DATABASE_URL`) |
| `drizzle.config.ts` | Drizzle ORM / migration config |

---

## 2. Backend API Master List

All routes defined in **`server/routes.ts`** unless noted otherwise.

Middleware legend:
- **None** = No authentication required (public)
- **requireAuth** = Session-based auth (checks `req.session.userId`)
- **requireAdmin** = Admin role check (role-based, inside handler)

### 2.1 Authentication Routes

| # | Method | Route Path | Full URL (Prod) | Middleware | Description |
|---|--------|-----------|-----------------|------------|-------------|
| 1 | POST | `/api/auth/register` | `https://{domain}/api/auth/register` | None | Register new user (OTP required) |
| 2 | POST | `/api/auth/login` | `https://{domain}/api/auth/login` | None | Login (username/email/phone) |
| 3 | POST | `/api/auth/logout` | `https://{domain}/api/auth/logout` | None | Destroy session |
| 4 | GET | `/api/auth/me` | `https://{domain}/api/auth/me` | None | Get current user |
| 5 | POST | `/api/auth/forgot-password` | `https://{domain}/api/auth/forgot-password` | None | Send password reset OTP |
| 6 | POST | `/api/auth/verify-reset-otp` | `https://{domain}/api/auth/verify-reset-otp` | None | Verify reset OTP |
| 7 | POST | `/api/auth/reset-password` | `https://{domain}/api/auth/reset-password` | None | Reset password |
| 8 | POST | `/api/auth/login-otp/send` | `https://{domain}/api/auth/login-otp/send` | None | Send login OTP |
| 9 | POST | `/api/auth/login-otp/verify` | `https://{domain}/api/auth/login-otp/verify` | None | Verify login OTP |

### 2.2 User Routes

| # | Method | Route Path | Full URL (Prod) | Middleware | Description |
|---|--------|-----------|-----------------|------------|-------------|
| 10 | PATCH | `/api/user/profile` | `https://{domain}/api/user/profile` | requireAuth | Update own profile |
| 11 | GET | `/api/users` | `https://{domain}/api/users` | requireAuth | List users |

### 2.3 Load Routes

| # | Method | Route Path | Full URL (Prod) | Middleware | Description |
|---|--------|-----------|-----------------|------------|-------------|
| 12 | GET | `/api/loads` | `https://{domain}/api/loads` | requireAuth | List loads (role-filtered) |
| 13 | POST | `/api/loads` | `https://{domain}/api/loads` | requireAuth | Create load |
| 14 | GET | `/api/loads/:id` | `https://{domain}/api/loads/{id}` | requireAuth | Get load details |
| 15 | PATCH | `/api/loads/:id` | `https://{domain}/api/loads/{id}` | requireAuth | Update load |
| 16 | GET | `/api/loads/:id/history` | `https://{domain}/api/loads/{id}/history` | requireAuth | Load status history |
| 17 | POST | `/api/loads/submit` | `https://{domain}/api/loads/submit` | requireAuth | Submit load for pricing |
| 18 | POST | `/api/loads/suggest-truck` | `https://{domain}/api/loads/suggest-truck` | requireAuth | AI truck suggestion |
| 19 | POST | `/api/loads/:id/accept-direct` | `https://{domain}/api/loads/{id}/accept-direct` | requireAuth | Carrier direct accept |
| 20 | POST | `/api/loads/:id/transition` | `https://{domain}/api/loads/{id}/transition` | requireAuth | Transition load status |
| 21 | GET | `/api/loads/:loadId/bids` | `https://{domain}/api/loads/{loadId}/bids` | requireAuth | Bids for specific load |
| 22 | GET | `/api/loads/:loadId/documents` | `https://{domain}/api/loads/{loadId}/documents` | requireAuth | Documents for load |
| 23 | GET | `/api/loads/:id/recommended-carriers` | `https://{domain}/api/loads/{id}/recommended-carriers` | requireAuth | Recommended carriers |

### 2.4 Bid Routes

| # | Method | Route Path | Full URL (Prod) | Middleware | Description |
|---|--------|-----------|-----------------|------------|-------------|
| 24 | GET | `/api/bids` | `https://{domain}/api/bids` | requireAuth | List all bids |
| 25 | POST | `/api/bids` | `https://{domain}/api/bids` | requireAuth | Create bid |
| 26 | PATCH | `/api/bids/:id` | `https://{domain}/api/bids/{id}` | requireAuth | Update bid (accept/reject/counter) |
| 27 | POST | `/api/bids/submit` | `https://{domain}/api/bids/submit` | requireAuth | Carrier submits bid |
| 28 | GET | `/api/bids/:id/negotiations` | `https://{domain}/api/bids/{id}/negotiations` | requireAuth | Negotiation history |
| 29 | POST | `/api/bids/:id/negotiate` | `https://{domain}/api/bids/{id}/negotiate` | requireAuth | Add negotiation message |

### 2.5 Truck Routes

| # | Method | Route Path | Full URL (Prod) | Middleware | Description |
|---|--------|-----------|-----------------|------------|-------------|
| 30 | GET | `/api/trucks` | `https://{domain}/api/trucks` | requireAuth | List carrier trucks |
| 31 | POST | `/api/trucks` | `https://{domain}/api/trucks` | requireAuth | Add truck |
| 32 | PATCH | `/api/trucks/:id` | `https://{domain}/api/trucks/{id}` | requireAuth | Update truck |
| 33 | DELETE | `/api/trucks/:id` | `https://{domain}/api/trucks/{id}` | requireAuth | Delete truck |

### 2.6 Driver Routes

| # | Method | Route Path | Full URL (Prod) | Middleware | Description |
|---|--------|-----------|-----------------|------------|-------------|
| 34 | GET | `/api/drivers` | `https://{domain}/api/drivers` | requireAuth | List carrier drivers |
| 35 | POST | `/api/drivers` | `https://{domain}/api/drivers` | requireAuth | Add driver |
| 36 | PATCH | `/api/drivers/:id` | `https://{domain}/api/drivers/{id}` | requireAuth | Update driver |
| 37 | DELETE | `/api/drivers/:id` | `https://{domain}/api/drivers/{id}` | requireAuth | Delete driver |

### 2.7 Shipment Routes

| # | Method | Route Path | Full URL (Prod) | Middleware | Description |
|---|--------|-----------|-----------------|------------|-------------|
| 38 | GET | `/api/shipments` | `https://{domain}/api/shipments` | requireAuth | List shipments |
| 39 | GET | `/api/shipments/:id` | `https://{domain}/api/shipments/{id}` | requireAuth | Shipment details |
| 40 | GET | `/api/shipments/tracking` | `https://{domain}/api/shipments/tracking` | requireAuth | All tracked shipments |
| 41 | GET | `/api/shipments/:id/tracking` | `https://{domain}/api/shipments/{id}/tracking` | requireAuth | Single shipment tracking |
| 42 | GET | `/api/shipments/load/:loadId` | `https://{domain}/api/shipments/load/{loadId}` | requireAuth | Shipment by load ID |
| 43 | PATCH | `/api/shipments/:id/assign-driver` | `https://{domain}/api/shipments/{id}/assign-driver` | requireAuth | Assign driver |
| 44 | PATCH | `/api/shipments/:id/assign-truck` | `https://{domain}/api/shipments/{id}/assign-truck` | requireAuth | Assign truck |
| 45 | GET | `/api/shipments/:id/documents` | `https://{domain}/api/shipments/{id}/documents` | requireAuth | Shipment documents |
| 46 | POST | `/api/shipments/:id/documents` | `https://{domain}/api/shipments/{id}/documents` | requireAuth | Upload shipment document |

### 2.8 Invoice Routes

| # | Method | Route Path | Full URL (Prod) | Middleware | Description |
|---|--------|-----------|-----------------|------------|-------------|
| 47 | GET | `/api/invoices` | `https://{domain}/api/invoices` | requireAuth | List invoices |
| 48 | GET | `/api/invoices/:id` | `https://{domain}/api/invoices/{id}` | requireAuth | Invoice details |
| 49 | POST | `/api/invoices` | `https://{domain}/api/invoices` | requireAuth | Create invoice |
| 50 | PATCH | `/api/invoices/:id` | `https://{domain}/api/invoices/{id}` | requireAuth | Update invoice |
| 51 | POST | `/api/invoices/:id/send` | `https://{domain}/api/invoices/{id}/send` | requireAuth | Send invoice |
| 52 | GET | `/api/invoices/:id/responses` | `https://{domain}/api/invoices/{id}/responses` | requireAuth | Invoice responses |
| 53 | POST | `/api/invoices/:id/respond` | `https://{domain}/api/invoices/{id}/respond` | requireAuth | Respond to invoice |
| 54 | POST | `/api/invoices/:id/confirm` | `https://{domain}/api/invoices/{id}/confirm` | requireAuth | Shipper confirms |
| 55 | POST | `/api/invoices/:id/reject` | `https://{domain}/api/invoices/{id}/reject` | requireAuth | Shipper rejects |
| 56 | POST | `/api/invoices/:id/negotiate` | `https://{domain}/api/invoices/{id}/negotiate` | requireAuth | Shipper negotiates |
| 57 | GET | `/api/invoices/shipper` | `https://{domain}/api/invoices/shipper` | requireAuth | Shipper's invoices |

### 2.9 Notification Routes

| # | Method | Route Path | Full URL (Prod) | Middleware | Description |
|---|--------|-----------|-----------------|------------|-------------|
| 58 | GET | `/api/notifications` | `https://{domain}/api/notifications` | requireAuth | User notifications |
| 59 | PATCH | `/api/notifications/:id/read` | `https://{domain}/api/notifications/{id}/read` | requireAuth | Mark read |
| 60 | POST | `/api/notifications/read-all` | `https://{domain}/api/notifications/read-all` | requireAuth | Mark all read |

### 2.10 Document Routes

| # | Method | Route Path | Full URL (Prod) | Middleware | Description |
|---|--------|-----------|-----------------|------------|-------------|
| 61 | GET | `/api/documents` | `https://{domain}/api/documents` | requireAuth | User documents |

### 2.11 Message Routes

| # | Method | Route Path | Full URL (Prod) | Middleware | Description |
|---|--------|-----------|-----------------|------------|-------------|
| 62 | GET | `/api/messages/:loadId` | `https://{domain}/api/messages/{loadId}` | requireAuth | Load messages |
| 63 | POST | `/api/messages` | `https://{domain}/api/messages` | requireAuth | Send message |

### 2.12 Carrier Routes

| # | Method | Route Path | Full URL (Prod) | Middleware | Description |
|---|--------|-----------|-----------------|------------|-------------|
| 64 | GET | `/api/carrier/loads` | `https://{domain}/api/carrier/loads` | requireAuth | Available loads |
| 65 | GET | `/api/carrier/available-loads` | `https://{domain}/api/carrier/available-loads` | requireAuth | Available loads (alt) |
| 66 | GET | `/api/carrier/bids` | `https://{domain}/api/carrier/bids` | requireAuth | Carrier bid history |
| 67 | POST | `/api/carrier/bids/:bidId/counter` | `https://{domain}/api/carrier/bids/{bidId}/counter` | requireAuth | Counter admin offer |
| 68 | POST | `/api/carrier/bids/:bidId/accept` | `https://{domain}/api/carrier/bids/{bidId}/accept` | requireAuth | Accept admin counter |
| 69 | GET | `/api/carrier/dashboard/stats` | `https://{domain}/api/carrier/dashboard/stats` | requireAuth | Dashboard stats |
| 70 | GET | `/api/carrier/performance` | `https://{domain}/api/carrier/performance` | requireAuth | Performance metrics |
| 71 | GET | `/api/carrier/recommended-loads` | `https://{domain}/api/carrier/recommended-loads` | requireAuth | AI-recommended loads |
| 72 | GET | `/api/carrier/documents` | `https://{domain}/api/carrier/documents` | requireAuth | Carrier documents |
| 73 | POST | `/api/carrier/documents` | `https://{domain}/api/carrier/documents` | requireAuth | Upload document |
| 74 | GET | `/api/carrier/documents/:id` | `https://{domain}/api/carrier/documents/{id}` | requireAuth | Get document |
| 75 | PATCH | `/api/carrier/documents/:id` | `https://{domain}/api/carrier/documents/{id}` | requireAuth | Update document |
| 76 | DELETE | `/api/carrier/documents/:id` | `https://{domain}/api/carrier/documents/{id}` | requireAuth | Delete document |
| 77 | GET | `/api/carrier/documents/expiring` | `https://{domain}/api/carrier/documents/expiring` | requireAuth | Expiring documents |
| 78 | GET | `/api/carrier/onboarding` | `https://{domain}/api/carrier/onboarding` | requireAuth | Onboarding status |
| 79 | PATCH | `/api/carrier/onboarding/draft` | `https://{domain}/api/carrier/onboarding/draft` | requireAuth | Save draft |
| 80 | POST | `/api/carrier/onboarding/submit` | `https://{domain}/api/carrier/onboarding/submit` | requireAuth | Submit onboarding |
| 81 | GET | `/api/carrier/verification` | `https://{domain}/api/carrier/verification` | requireAuth | Verification status |
| 82 | POST | `/api/carrier/verification` | `https://{domain}/api/carrier/verification` | requireAuth | Create verification |
| 83 | POST | `/api/carrier/verification/documents` | `https://{domain}/api/carrier/verification/documents` | requireAuth | Upload verification doc |
| 84 | GET | `/api/carrier/solo/truck` | `https://{domain}/api/carrier/solo/truck` | requireAuth | Solo carrier truck |
| 85 | PATCH | `/api/carrier/truck/:truckId` | `https://{domain}/api/carrier/truck/{truckId}` | requireAuth | Update carrier truck |
| 86 | GET | `/api/carrier/solo/profile` | `https://{domain}/api/carrier/solo/profile` | requireAuth | Solo carrier profile |
| 87 | PATCH | `/api/carrier/solo/profile` | `https://{domain}/api/carrier/solo/profile` | requireAuth | Update solo profile |
| 88 | GET | `/api/carriers` | `https://{domain}/api/carriers` | requireAuth | List carriers |
| 89 | GET | `/api/carriers/:id` | `https://{domain}/api/carriers/{id}` | requireAuth | Carrier details |
| 90 | GET | `/api/carrier-verifications` | `https://{domain}/api/carrier-verifications` | requireAuth | Verification list |
| 91 | GET | `/api/carrier-verifications/:carrierId` | `https://{domain}/api/carrier-verifications/{carrierId}` | requireAuth | Carrier verification |
| 92 | PATCH | `/api/carrier-verifications/:id` | `https://{domain}/api/carrier-verifications/{id}` | requireAuth | Update verification |

### 2.13 Shipper Routes

| # | Method | Route Path | Full URL (Prod) | Middleware | Description |
|---|--------|-----------|-----------------|------------|-------------|
| 93 | GET | `/api/shipper/profile` | `https://{domain}/api/shipper/profile` | requireAuth | Shipper profile |
| 94 | GET | `/api/shipper/:id/profile` | `https://{domain}/api/shipper/{id}/profile` | requireAuth | Shipper profile by ID |
| 95 | GET | `/api/shipper/onboarding` | `https://{domain}/api/shipper/onboarding` | requireAuth | Onboarding status |
| 96 | POST | `/api/shipper/onboarding` | `https://{domain}/api/shipper/onboarding` | requireAuth | Create onboarding |
| 97 | PUT | `/api/shipper/onboarding` | `https://{domain}/api/shipper/onboarding` | requireAuth | Update onboarding |
| 98 | PATCH | `/api/shipper/onboarding/draft` | `https://{domain}/api/shipper/onboarding/draft` | requireAuth | Save draft |
| 99 | GET | `/api/shipper/documents` | `https://{domain}/api/shipper/documents` | requireAuth | Shipper documents |
| 100 | GET | `/api/shipper/saved-addresses` | `https://{domain}/api/shipper/saved-addresses` | requireAuth | All saved addresses |
| 101 | GET | `/api/shipper/saved-addresses/:type` | `https://{domain}/api/shipper/saved-addresses/{type}` | requireAuth | Addresses by type |
| 102 | POST | `/api/shipper/saved-addresses` | `https://{domain}/api/shipper/saved-addresses` | requireAuth | Save address |
| 103 | POST | `/api/shipper/saved-addresses/:id/use` | `https://{domain}/api/shipper/saved-addresses/{id}/use` | requireAuth | Record usage |
| 104 | DELETE | `/api/shipper/saved-addresses/:id` | `https://{domain}/api/shipper/saved-addresses/{id}` | requireAuth | Delete address |
| 105 | POST | `/api/shipper/invoices/:id/acknowledge` | `https://{domain}/api/shipper/invoices/{id}/acknowledge` | requireAuth | Acknowledge invoice |
| 106 | POST | `/api/shipper/invoices/:id/negotiate` | `https://{domain}/api/shipper/invoices/{id}/negotiate` | requireAuth | Negotiate invoice |
| 107 | POST | `/api/shipper/invoices/:id/pay` | `https://{domain}/api/shipper/invoices/{id}/pay` | requireAuth | Confirm payment |
| 108 | POST | `/api/shipper/invoices/:id/query` | `https://{domain}/api/shipper/invoices/{id}/query` | requireAuth | Query invoice |
| 109 | POST | `/api/shipper/invoices/:id/view` | `https://{domain}/api/shipper/invoices/{id}/view` | requireAuth | Mark viewed |

### 2.14 Admin Routes - Load Management

| # | Method | Route Path | Full URL (Prod) | Middleware | Description |
|---|--------|-----------|-----------------|------------|-------------|
| 110 | GET | `/api/admin/stats` | `https://{domain}/api/admin/stats` | requireAuth (admin) | Dashboard stats |
| 111 | GET | `/api/admin/live-tracking` | `https://{domain}/api/admin/live-tracking` | requireAuth (admin) | Live tracking |
| 112 | GET | `/api/admin/analytics/realtime` | `https://{domain}/api/admin/analytics/realtime` | requireAuth (admin) | Real-time analytics |
| 113 | GET | `/api/admin/loads` | `https://{domain}/api/admin/loads` | requireAuth (admin) | All loads |
| 114 | POST | `/api/admin/loads` | `https://{domain}/api/admin/loads` | requireAuth (admin) | Create load |
| 115 | PATCH | `/api/admin/loads/:id` | `https://{domain}/api/admin/loads/{id}` | requireAuth (admin) | Update load |
| 116 | POST | `/api/admin/loads/create` | `https://{domain}/api/admin/loads/create` | requireAuth (admin) | Post load for shipper |
| 117 | POST | `/api/admin/loads/:loadId/reprice-repost` | `https://{domain}/api/admin/loads/{loadId}/reprice-repost` | requireAuth (admin) | Reprice and repost |
| 118 | GET | `/api/admin/queue` | `https://{domain}/api/admin/queue` | requireAuth (admin) | Pricing queue |
| 119 | POST | `/api/admin/price` | `https://{domain}/api/admin/price` | requireAuth (admin) | Price a load |
| 120 | POST | `/api/admin/assign` | `https://{domain}/api/admin/assign` | requireAuth (admin) | Assign carrier |
| 121 | POST | `/api/admin/award-bid` | `https://{domain}/api/admin/award-bid` | requireAuth (admin) | Award bid |
| 122 | POST | `/api/admin/counter-response` | `https://{domain}/api/admin/counter-response` | requireAuth (admin) | Counter response |
| 123 | POST | `/api/admin/estimate-price` | `https://{domain}/api/admin/estimate-price` | requireAuth (admin) | Estimate price |
| 124 | GET | `/api/admin/audit/:loadId` | `https://{domain}/api/admin/audit/{loadId}` | requireAuth (admin) | Load audit trail |

### 2.15 Admin Routes - Pricing System

| # | Method | Route Path | Full URL (Prod) | Middleware | Description |
|---|--------|-----------|-----------------|------------|-------------|
| 125 | POST | `/api/admin/pricing/suggest` | `https://{domain}/api/admin/pricing/suggest` | requireAuth (admin) | AI price suggestion |
| 126 | POST | `/api/admin/pricing/calculate` | `https://{domain}/api/admin/pricing/calculate` | requireAuth (admin) | Calculate breakdown |
| 127 | POST | `/api/admin/pricing/save` | `https://{domain}/api/admin/pricing/save` | requireAuth (admin) | Save pricing draft |
| 128 | POST | `/api/admin/pricing/lock` | `https://{domain}/api/admin/pricing/lock` | requireAuth (admin) | Lock and post |
| 129 | POST | `/api/admin/pricing/approve` | `https://{domain}/api/admin/pricing/approve` | requireAuth (admin) | Approve pricing |
| 130 | POST | `/api/admin/pricing/reject` | `https://{domain}/api/admin/pricing/reject` | requireAuth (admin) | Reject pricing |
| 131 | GET | `/api/admin/pricing/history/:loadId` | `https://{domain}/api/admin/pricing/history/{loadId}` | requireAuth (admin) | Pricing history |
| 132 | GET | `/api/admin/pricing/:loadId` | `https://{domain}/api/admin/pricing/{loadId}` | requireAuth (admin) | Current pricing |
| 133 | GET | `/api/admin/pricing/templates` | `https://{domain}/api/admin/pricing/templates` | requireAuth (admin) | List templates |
| 134 | POST | `/api/admin/pricing/templates` | `https://{domain}/api/admin/pricing/templates` | requireAuth (admin) | Create template |
| 135 | DELETE | `/api/admin/pricing/templates/:id` | `https://{domain}/api/admin/pricing/templates/{id}` | requireAuth (admin) | Delete template |

### 2.16 Admin Routes - Invoices

| # | Method | Route Path | Full URL (Prod) | Middleware | Description |
|---|--------|-----------|-----------------|------------|-------------|
| 136 | GET | `/api/admin/invoices` | `https://{domain}/api/admin/invoices` | requireAuth (admin) | All invoices (searchable) |
| 137 | POST | `/api/admin/invoices` | `https://{domain}/api/admin/invoices` | requireAuth (admin) | Create invoice |
| 138 | POST | `/api/admin/invoices/generate` | `https://{domain}/api/admin/invoices/generate` | requireAuth (admin) | Generate invoice |
| 139 | GET | `/api/admin/invoices/:id` | `https://{domain}/api/admin/invoices/{id}` | requireAuth (admin) | Invoice detail |
| 140 | PUT | `/api/admin/invoices/:id` | `https://{domain}/api/admin/invoices/{id}` | requireAuth (admin) | Update invoice |
| 141 | GET | `/api/admin/invoices/:id/history` | `https://{domain}/api/admin/invoices/{id}/history` | requireAuth (admin) | Invoice history |
| 142 | POST | `/api/admin/invoices/:id/send` | `https://{domain}/api/admin/invoices/{id}/send` | requireAuth (admin) | Send to shipper |
| 143 | POST | `/api/admin/invoices/:id/pay` | `https://{domain}/api/admin/invoices/{id}/pay` | requireAuth (admin) | Mark paid |
| 144 | POST | `/api/admin/invoices/:id/mark-paid` | `https://{domain}/api/admin/invoices/{id}/mark-paid` | requireAuth (admin) | Mark payment complete |
| 145 | POST | `/api/admin/invoices/:id/respond` | `https://{domain}/api/admin/invoices/{id}/respond` | requireAuth (admin) | Respond to query |
| 146 | GET | `/api/admin/invoices/load/:loadId` | `https://{domain}/api/admin/invoices/load/{loadId}` | requireAuth (admin) | Invoice by load |
| 147 | POST | `/api/admin/invoice/generate-and-send` | `https://{domain}/api/admin/invoice/generate-and-send` | requireAuth (admin) | Generate + send |

### 2.17 Admin Routes - Negotiations

| # | Method | Route Path | Full URL (Prod) | Middleware | Description |
|---|--------|-----------|-----------------|------------|-------------|
| 148 | GET | `/api/admin/negotiations` | `https://{domain}/api/admin/negotiations` | requireAuth (admin) | All negotiations |
| 149 | GET | `/api/admin/negotiations/:loadId` | `https://{domain}/api/admin/negotiations/{loadId}` | requireAuth (admin) | Load negotiations |
| 150 | POST | `/api/admin/negotiations/:loadId/counter` | `https://{domain}/api/admin/negotiations/{loadId}/counter` | requireAuth (admin) | Counter bid |
| 151 | POST | `/api/admin/negotiations/:loadId/accept` | `https://{domain}/api/admin/negotiations/{loadId}/accept` | requireAuth (admin) | Accept bid |
| 152 | POST | `/api/admin/negotiations/:loadId/reject` | `https://{domain}/api/admin/negotiations/{loadId}/reject` | requireAuth (admin) | Reject bid |
| 153 | POST | `/api/admin/negotiations/:loadId/simulate` | `https://{domain}/api/admin/negotiations/{loadId}/simulate` | requireAuth (admin) | Simulate outcome |
| 154 | GET | `/api/admin/negotiations/counters` | `https://{domain}/api/admin/negotiations/counters` | requireAuth (admin) | Counter summary |

### 2.18 Admin Routes - Carrier Management

| # | Method | Route Path | Full URL (Prod) | Middleware | Description |
|---|--------|-----------|-----------------|------------|-------------|
| 155 | GET | `/api/admin/carriers` | `https://{domain}/api/admin/carriers` | requireAuth (admin) | All carriers |
| 156 | GET | `/api/admin/carriers/:id` | `https://{domain}/api/admin/carriers/{id}` | requireAuth (admin) | Carrier detail |
| 157 | PATCH | `/api/admin/carriers/:id/verify` | `https://{domain}/api/admin/carriers/{id}/verify` | requireAuth (admin) | Verify carrier |
| 158 | PATCH | `/api/admin/carriers/:id/type` | `https://{domain}/api/admin/carriers/{id}/type` | requireAuth (admin) | Update type |
| 159 | POST | `/api/admin/carriers/backfill-types` | `https://{domain}/api/admin/carriers/backfill-types` | requireAuth (admin) | Backfill types |
| 160 | PATCH | `/api/admin/documents/:id/verify` | `https://{domain}/api/admin/documents/{id}/verify` | requireAuth (admin) | Verify document |

### 2.19 Admin Routes - User Management

| # | Method | Route Path | Full URL (Prod) | Middleware | Description |
|---|--------|-----------|-----------------|------------|-------------|
| 161 | GET | `/api/admin/users` | `https://{domain}/api/admin/users` | requireAuth (admin) | All users |
| 162 | POST | `/api/admin/users` | `https://{domain}/api/admin/users` | requireAuth (admin) | Create user |
| 163 | PATCH | `/api/admin/users/:id` | `https://{domain}/api/admin/users/{id}` | requireAuth (admin) | Update user |
| 164 | GET | `/api/admin/shippers/verified` | `https://{domain}/api/admin/shippers/verified` | requireAuth (admin) | Verified shippers |
| 165 | GET | `/api/admin/contact` | `https://{domain}/api/admin/contact` | requireAuth (admin) | Contact submissions |

### 2.20 Admin Routes - Onboarding

| # | Method | Route Path | Full URL (Prod) | Middleware | Description |
|---|--------|-----------|-----------------|------------|-------------|
| 166 | GET | `/api/admin/onboarding-requests` | `https://{domain}/api/admin/onboarding-requests` | requireAuth (admin) | All requests |
| 167 | GET | `/api/admin/onboarding-requests/:id` | `https://{domain}/api/admin/onboarding-requests/{id}` | requireAuth (admin) | Request detail |
| 168 | POST | `/api/admin/onboarding-requests/:id/review` | `https://{domain}/api/admin/onboarding-requests/{id}/review` | requireAuth (admin) | Review request |
| 169 | GET | `/api/admin/onboarding-requests/stats` | `https://{domain}/api/admin/onboarding-requests/stats` | requireAuth (admin) | Onboarding stats |

### 2.21 Admin Routes - Carrier Verification

| # | Method | Route Path | Full URL (Prod) | Middleware | Description |
|---|--------|-----------|-----------------|------------|-------------|
| 170 | GET | `/api/admin/verifications` | `https://{domain}/api/admin/verifications` | requireAuth (admin) | All verifications |
| 171 | GET | `/api/admin/verifications/pending` | `https://{domain}/api/admin/verifications/pending` | requireAuth (admin) | Pending verifications |
| 172 | POST | `/api/admin/verifications/:id/approve` | `https://{domain}/api/admin/verifications/{id}/approve` | requireAuth (admin) | Approve |
| 173 | POST | `/api/admin/verifications/:id/reject` | `https://{domain}/api/admin/verifications/{id}/reject` | requireAuth (admin) | Reject |
| 174 | POST | `/api/admin/verifications/:id/hold` | `https://{domain}/api/admin/verifications/{id}/hold` | requireAuth (admin) | Put on hold |
| 175 | PATCH | `/api/admin/verification-documents/:id` | `https://{domain}/api/admin/verification-documents/{id}` | requireAuth (admin) | Update doc status |

### 2.22 Admin Routes - Credit Assessment

| # | Method | Route Path | Full URL (Prod) | Middleware | Description |
|---|--------|-----------|-----------------|------------|-------------|
| 176 | GET | `/api/admin/credit-assessments` | `https://{domain}/api/admin/credit-assessments` | requireAuth (admin) | All assessments |
| 177 | GET | `/api/admin/credit-assessments/:shipperId` | `https://{domain}/api/admin/credit-assessments/{shipperId}` | requireAuth (admin) | Shipper assessment |
| 178 | POST | `/api/admin/credit-assessments/:shipperId` | `https://{domain}/api/admin/credit-assessments/{shipperId}` | requireAuth (admin) | Create/update |
| 179 | GET | `/api/admin/credit-assessments/:shipperId/evaluations` | `https://{domain}/api/admin/credit-assessments/{shipperId}/evaluations` | requireAuth (admin) | Evaluations |
| 180 | POST | `/api/admin/credit-assessments/:shipperId/auto-assess` | `https://{domain}/api/admin/credit-assessments/{shipperId}/auto-assess` | requireAuth (admin) | Auto-assess |
| 181 | POST | `/api/admin/credit-assessments/bulk-auto-assess` | `https://{domain}/api/admin/credit-assessments/bulk-auto-assess` | requireAuth (admin) | Bulk assess |

### 2.23 Admin Routes - Saved Addresses

| # | Method | Route Path | Full URL (Prod) | Middleware | Description |
|---|--------|-----------|-----------------|------------|-------------|
| 182 | GET | `/api/admin/saved-addresses/:shipperId/:type` | `https://{domain}/api/admin/saved-addresses/{shipperId}/{type}` | requireAuth (admin) | Shipper addresses |
| 183 | POST | `/api/admin/saved-addresses` | `https://{domain}/api/admin/saved-addresses` | requireAuth (admin) | Save address |

### 2.24 Admin Routes - Feature Flags

| # | Method | Route Path | Full URL (Prod) | Middleware | Description |
|---|--------|-----------|-----------------|------------|-------------|
| 184 | GET | `/api/admin/feature-flags` | `https://{domain}/api/admin/feature-flags` | requireAuth (admin) | Get flags |
| 185 | POST | `/api/admin/feature-flags/:name/toggle` | `https://{domain}/api/admin/feature-flags/{name}/toggle` | requireAuth (admin) | Toggle flag |

### 2.25 Admin Routes - Proposals

| # | Method | Route Path | Full URL (Prod) | Middleware | Description |
|---|--------|-----------|-----------------|------------|-------------|
| 186 | GET | `/api/admin/proposals/load/:loadId` | `https://{domain}/api/admin/proposals/load/{loadId}` | requireAuth (admin) | Load proposals |
| 187 | POST | `/api/admin/proposals/send` | `https://{domain}/api/admin/proposals/send` | requireAuth (admin) | Send proposal |

### 2.26 Admin Routes - Settlements

| # | Method | Route Path | Full URL (Prod) | Middleware | Description |
|---|--------|-----------|-----------------|------------|-------------|
| 188 | POST | `/api/admin/settlements` | `https://{domain}/api/admin/settlements` | requireAuth (admin) | Create settlement |
| 189 | POST | `/api/admin/settlements/:id/pay` | `https://{domain}/api/admin/settlements/{id}/pay` | requireAuth (admin) | Process payment |

### 2.27 Admin Routes - Troubleshooting

| # | Method | Route Path | Full URL (Prod) | Middleware | Description |
|---|--------|-----------|-----------------|------------|-------------|
| 190 | GET | `/api/admin/troubleshoot/load/:id` | `https://{domain}/api/admin/troubleshoot/load/{id}` | requireAuth (admin) | Debug load |
| 191 | GET | `/api/admin/troubleshoot/queue` | `https://{domain}/api/admin/troubleshoot/queue` | requireAuth (admin) | Debug queue |
| 192 | POST | `/api/admin/troubleshoot/queue/:id/process` | `https://{domain}/api/admin/troubleshoot/queue/{id}/process` | requireAuth (admin) | Force process |
| 193 | POST | `/api/admin/troubleshoot/requeue/:loadId` | `https://{domain}/api/admin/troubleshoot/requeue/{loadId}` | requireAuth (admin) | Requeue load |
| 194 | POST | `/api/admin/troubleshoot/force-post/:loadId` | `https://{domain}/api/admin/troubleshoot/force-post/{loadId}` | requireAuth (admin) | Force post |
| 195 | POST | `/api/admin/troubleshoot/rollback-price/:loadId` | `https://{domain}/api/admin/troubleshoot/rollback-price/{loadId}` | requireAuth (admin) | Rollback price |
| 196 | POST | `/api/admin/troubleshoot/generate-invoice/:loadId` | `https://{domain}/api/admin/troubleshoot/generate-invoice/{loadId}` | requireAuth (admin) | Force invoice |
| 197 | POST | `/api/admin/troubleshoot/send-invoice/:invoiceId` | `https://{domain}/api/admin/troubleshoot/send-invoice/{invoiceId}` | requireAuth (admin) | Force send |
| 198 | GET | `/api/admin/troubleshoot/audit-trail/:loadId` | `https://{domain}/api/admin/troubleshoot/audit-trail/{loadId}` | requireAuth (admin) | Full audit |
| 199 | GET | `/api/admin/troubleshoot/api-logs/:loadId` | `https://{domain}/api/admin/troubleshoot/api-logs/{loadId}` | requireAuth (admin) | API logs |

### 2.28 Admin Routes - Seeding

| # | Method | Route Path | Full URL (Prod) | Middleware | Description |
|---|--------|-----------|-----------------|------------|-------------|
| 200 | POST | `/api/admin/seed-carriers` | `https://{domain}/api/admin/seed-carriers` | requireAuth (admin) | Seed test carriers |
| 201 | POST | `/api/admin/seed-pending-verifications` | `https://{domain}/api/admin/seed-pending-verifications` | requireAuth (admin) | Seed verifications |

### 2.29 OTP Routes

| # | Method | Route Path | Full URL (Prod) | Middleware | Description |
|---|--------|-----------|-----------------|------------|-------------|
| 202 | POST | `/api/otp/request-start` | `https://{domain}/api/otp/request-start` | requireAuth | Request trip start OTP |
| 203 | POST | `/api/otp/request-route-start` | `https://{domain}/api/otp/request-route-start` | requireAuth | Request route start |
| 204 | POST | `/api/otp/request-end` | `https://{domain}/api/otp/request-end` | requireAuth | Request trip end |
| 205 | GET | `/api/otp/requests` | `https://{domain}/api/otp/requests` | requireAuth | OTP requests (admin) |
| 206 | GET | `/api/otp/shipper-requests` | `https://{domain}/api/otp/shipper-requests` | requireAuth | Shipper OTP requests |
| 207 | POST | `/api/otp/approve/:requestId` | `https://{domain}/api/otp/approve/{requestId}` | requireAuth | Approve OTP |
| 208 | POST | `/api/otp/regenerate/:requestId` | `https://{domain}/api/otp/regenerate/{requestId}` | requireAuth | Regenerate OTP |
| 209 | POST | `/api/otp/reject/:requestId` | `https://{domain}/api/otp/reject/{requestId}` | requireAuth | Reject OTP |
| 210 | POST | `/api/otp/verify` | `https://{domain}/api/otp/verify` | requireAuth | Verify OTP code |
| 211 | GET | `/api/otp/status/:shipmentId` | `https://{domain}/api/otp/status/{shipmentId}` | requireAuth | OTP status |
| 212 | POST | `/api/otp/registration/send` | `https://{domain}/api/otp/registration/send` | None | Send registration OTP |
| 213 | POST | `/api/otp/registration/verify` | `https://{domain}/api/otp/registration/verify` | None | Verify registration OTP |
| 214 | POST | `/api/otp/registration/send-email` | `https://{domain}/api/otp/registration/send-email` | None | Send email OTP |
| 215 | POST | `/api/otp/registration/verify-email` | `https://{domain}/api/otp/registration/verify-email` | None | Verify email OTP |

### 2.30 Telemetry Routes

| # | Method | Route Path | Full URL (Prod) | Middleware | Description |
|---|--------|-----------|-----------------|------------|-------------|
| 216 | GET | `/api/telemetry/vehicles` | `https://{domain}/api/telemetry/vehicles` | requireAuth | All vehicle data |
| 217 | GET | `/api/telemetry/vehicles/:vehicleId` | `https://{domain}/api/telemetry/vehicles/{vehicleId}` | requireAuth | Single vehicle |
| 218 | GET | `/api/telemetry/vehicle-ids` | `https://{domain}/api/telemetry/vehicle-ids` | requireAuth | Active IDs |
| 219 | GET | `/api/telemetry/eta/:loadId` | `https://{domain}/api/telemetry/eta/{loadId}` | requireAuth | AI ETA |
| 220 | GET | `/api/telemetry/breadcrumbs/:vehicleId` | `https://{domain}/api/telemetry/breadcrumbs/{vehicleId}` | requireAuth | GPS trail |
| 221 | GET | `/api/telemetry/driver-behavior/:driverId` | `https://{domain}/api/telemetry/driver-behavior/{driverId}` | requireAuth | Driver score |
| 222 | GET | `/api/telemetry/alerts` | `https://{domain}/api/telemetry/alerts` | requireAuth | All alerts |
| 223 | GET | `/api/telemetry/alerts/:vehicleId` | `https://{domain}/api/telemetry/alerts/{vehicleId}` | requireAuth | Vehicle alerts |

### 2.31 Rating Routes

| # | Method | Route Path | Full URL (Prod) | Middleware | Description |
|---|--------|-----------|-----------------|------------|-------------|
| 224 | POST | `/api/shipper-ratings` | `https://{domain}/api/shipper-ratings` | requireAuth | Rate shipper |
| 225 | GET | `/api/shipper/:shipperId/rating` | `https://{domain}/api/shipper/{shipperId}/rating` | None | Shipper avg rating |
| 226 | GET | `/api/shipper/:shipperId/ratings` | `https://{domain}/api/shipper/{shipperId}/ratings` | None | All shipper ratings |
| 227 | GET | `/api/shipper-ratings/check/:shipmentId` | `https://{domain}/api/shipper-ratings/check/{shipmentId}` | requireAuth | Check if rated |
| 228 | POST | `/api/carrier-ratings` | `https://{domain}/api/carrier-ratings` | requireAuth | Rate carrier |
| 229 | GET | `/api/carrier/:carrierId/rating` | `https://{domain}/api/carrier/{carrierId}/rating` | None | Carrier avg rating |
| 230 | GET | `/api/carrier/:carrierId/ratings` | `https://{domain}/api/carrier/{carrierId}/ratings` | None | All carrier ratings |
| 231 | GET | `/api/carrier-ratings/check/:shipmentId` | `https://{domain}/api/carrier-ratings/check/{shipmentId}` | requireAuth | Check if rated |

### 2.32 Settlement Routes

| # | Method | Route Path | Full URL (Prod) | Middleware | Description |
|---|--------|-----------|-----------------|------------|-------------|
| 232 | GET | `/api/settlements` | `https://{domain}/api/settlements` | requireAuth | All settlements |
| 233 | GET | `/api/settlements/carrier` | `https://{domain}/api/settlements/carrier` | requireAuth | Carrier settlements |
| 234 | POST | `/api/settlements` | `https://{domain}/api/settlements` | requireAuth | Create settlement |
| 235 | PATCH | `/api/settlements/:id` | `https://{domain}/api/settlements/{id}` | requireAuth | Update settlement |

### 2.33 Finance Routes

| # | Method | Route Path | Full URL (Prod) | Middleware | Description |
|---|--------|-----------|-----------------|------------|-------------|
| 236 | GET | `/api/finance/shipments` | `https://{domain}/api/finance/shipments` | requireAuth | Shipments for review |
| 237 | POST | `/api/finance/reviews` | `https://{domain}/api/finance/reviews` | requireAuth | Create/update review |
| 238 | PATCH | `/api/finance/reviews/:id/payment` | `https://{domain}/api/finance/reviews/{id}/payment` | requireAuth | Update payment |
| 239 | GET | `/api/finance/reviews/all` | `https://{domain}/api/finance/reviews/all` | requireAuth | All reviews |
| 240 | GET | `/api/finance/reviews/:shipmentId` | `https://{domain}/api/finance/reviews/{shipmentId}` | requireAuth | Shipment review |

### 2.34 Contact Route

| # | Method | Route Path | Full URL (Prod) | Middleware | Description |
|---|--------|-----------|-----------------|------------|-------------|
| 241 | POST | `/api/contact` | `https://{domain}/api/contact` | None | Submit contact form |

### 2.35 Help Bot Routes (server/helpbot-routes.ts)

| # | Method | Route Path | Full URL (Prod) | Middleware | Description |
|---|--------|-----------|-----------------|------------|-------------|
| 242 | POST | `/api/helpbot/chat` | `https://{domain}/api/helpbot/chat` | None | AI chat message |
| 243 | GET | `/api/helpbot/contact-support` | `https://{domain}/api/helpbot/contact-support` | None | Contact support |
| 244 | GET | `/api/helpbot/conversations` | `https://{domain}/api/helpbot/conversations` | None | List conversations |
| 245 | GET | `/api/helpbot/conversations/:id` | `https://{domain}/api/helpbot/conversations/{id}` | None | Conversation detail |

### 2.36 Object Storage Routes (server/replit_integrations/object_storage/)

| # | Method | Route Path | Full URL (Prod) | Middleware | Description |
|---|--------|-----------|-----------------|------------|-------------|
| 246 | POST | `/api/uploads/request-url` | `https://{domain}/api/uploads/request-url` | None | Get presigned upload URL |
| 247 | GET | `/objects/:objectPath(*)` | `https://{domain}/objects/{objectPath}` | None | Serve stored object |

### 2.37 WebSocket Endpoints

| # | Protocol | Path | Full URL (Prod) | Description |
|---|----------|------|-----------------|-------------|
| 248 | WS/WSS | `/ws/marketplace` | `wss://{domain}/ws/marketplace` | Real-time marketplace events |
| 249 | WS/WSS | `/ws/telemetry` | `wss://{domain}/ws/telemetry` | Vehicle telematics stream |

---

## 3. Frontend API Calling Path

### 3.1 Core HTTP Client

| File Path | Function | URL Pattern | Headers / Auth |
|-----------|----------|-------------|----------------|
| `client/src/lib/queryClient.ts` | `apiRequest(method, url, data?)` | Relative path `/api/*` | `Content-Type: application/json`, `credentials: "include"` |
| `client/src/lib/queryClient.ts` | `getQueryFn()` (default query) | From `queryKey` joined | `credentials: "include"` |
| `client/src/lib/auth-context.tsx` | `fetch("/api/auth/me")` | `/api/auth/me` | `credentials: "include"` |
| `client/src/lib/auth-context.tsx` | `fetch("/api/auth/login")` | `/api/auth/login` | `Content-Type: application/json`, `credentials: "include"` |
| `client/src/lib/auth-context.tsx` | `fetch("/api/auth/register")` | `/api/auth/register` | `Content-Type: application/json`, `credentials: "include"` |
| `client/src/lib/auth-context.tsx` | `fetch("/api/auth/logout")` | `/api/auth/logout` | `credentials: "include"` |
| `client/src/lib/marketplace-socket.ts` | `connectMarketplace()` | `ws(s)://{host}/ws/marketplace` | None (session via upgrade) |
| `client/src/hooks/use-telemetry.ts` | `fetch("/api/telemetry/vehicles")` | `/api/telemetry/vehicles` | Default |
| `client/src/hooks/use-upload.ts` | `fetch("/api/uploads/request-url")` | `/api/uploads/request-url` | Default |

### 3.2 Admin Portal API Calls

| Frontend File | Function / Hook | API URL Called | Method |
|---------------|-----------------|---------------|--------|
| `pages/admin/overview.tsx` | useQuery | `/api/admin/onboarding-requests/stats` | GET |
| `pages/admin/overview.tsx` | useQuery | `/api/admin/analytics/realtime` | GET |
| `pages/admin/load-queue.tsx` | useQuery | `/api/admin/queue` | GET |
| `pages/admin/load-queue.tsx` | useQuery | `/api/admin/pricing/templates` | GET |
| `pages/admin/load-queue.tsx` | apiRequest | `/api/admin/invoices/{id}/send` | POST |
| `pages/admin/load-queue.tsx` | apiRequest | `/api/admin/loads/{id}/reprice-repost` | POST |
| `pages/admin/loads.tsx` | useQuery | `/api/loads` | GET |
| `pages/admin/loads.tsx` | useQuery | `/api/finance/reviews/all` | GET |
| `pages/admin/load-details.tsx` | useQuery | `/api/loads/{loadId}` | GET |
| `pages/admin/load-details.tsx` | useQuery | `/api/loads/{id}/recommended-carriers` | GET |
| `pages/admin/load-details.tsx` | useQuery | `/api/shipments/load/{loadId}` | GET |
| `pages/admin/load-details.tsx` | apiRequest | `/api/loads/{loadId}` | PATCH |
| `pages/admin/load-details.tsx` | apiRequest | `/api/loads/{loadId}/transition` | POST |
| `pages/admin/negotiations.tsx` | useQuery | `/api/bids` | GET |
| `pages/admin/negotiations.tsx` | apiRequest | `/api/bids/{id}/negotiate` | POST |
| `pages/admin/negotiations.tsx` | apiRequest | `/api/bids/{id}` | PATCH |
| `pages/admin/negotiation-inbox.tsx` | useQuery | `/api/admin/negotiations` | GET |
| `pages/admin/invoices.tsx` | useQuery | `/api/admin/invoices` | GET |
| `pages/admin/invoices.tsx` | apiRequest | `/api/admin/invoices/{id}/send` | POST |
| `pages/admin/invoices.tsx` | apiRequest | `/api/admin/invoices/{id}/mark-paid` | POST |
| `pages/admin/carriers.tsx` | useQuery | `/api/admin/carriers` | GET |
| `pages/admin/carriers.tsx` | useQuery | `/api/admin/verifications` | GET |
| `pages/admin/carriers.tsx` | apiRequest | `/api/admin/carriers/{id}` | PATCH |
| `pages/admin/carriers.tsx` | apiRequest | `/api/admin/carriers/{id}/verify` | PATCH |
| `pages/admin/carrier-profile.tsx` | useQuery | `/api/admin/carriers/{id}` | GET |
| `pages/admin/carrier-profile.tsx` | apiRequest | `/api/admin/carriers/{id}/verify` | PATCH |
| `pages/admin/carrier-profile.tsx` | apiRequest | `/api/admin/documents/{id}/verify` | PATCH |
| `pages/admin/carrier-verification.tsx` | useQuery | `/api/admin/verifications` | GET |
| `pages/admin/carrier-verification.tsx` | apiRequest | `/api/admin/verifications/{id}/approve` | POST |
| `pages/admin/carrier-verification.tsx` | apiRequest | `/api/admin/verifications/{id}/reject` | POST |
| `pages/admin/carrier-verification.tsx` | apiRequest | `/api/admin/verifications/{id}/hold` | POST |
| `pages/admin/carrier-verification.tsx` | apiRequest | `/api/admin/verification-documents/{id}` | PATCH |
| `pages/admin/onboarding.tsx` | useQuery | `/api/admin/onboarding-requests` | GET |
| `pages/admin/onboarding.tsx` | apiRequest | `/api/admin/onboarding-requests/{id}/review` | POST |
| `pages/admin/post-load.tsx` | useQuery | `/api/admin/shippers/verified` | GET |
| `pages/admin/post-load.tsx` | useQuery | `/api/admin/saved-addresses/{shipperId}/pickup` | GET |
| `pages/admin/post-load.tsx` | useQuery | `/api/admin/saved-addresses/{shipperId}/dropoff` | GET |
| `pages/admin/post-load.tsx` | apiRequest | `/api/admin/loads/create` | POST |
| `pages/admin/post-load.tsx` | apiRequest | `/api/admin/saved-addresses` | POST |
| `pages/admin/live-tracking.tsx` | useQuery | `/api/admin/live-tracking` | GET |
| `pages/admin/live-tracking.tsx` | apiRequest | `/api/finance/reviews` | POST |
| `pages/admin/live-tracking.tsx` | apiRequest | `/api/finance/reviews/{id}/payment` | PATCH |
| `pages/admin/live-tracking.tsx` | apiRequest | `/api/admin/documents/{id}/verify` | PATCH |
| `pages/admin/volume-analytics.tsx` | useQuery | `/api/loads` | GET |
| `pages/admin/volume-analytics.tsx` | useQuery | `/api/bids` | GET |

### 3.3 Admin Component API Calls

| Frontend File | Function / Hook | API URL Called | Method |
|---------------|-----------------|---------------|--------|
| `components/admin/pricing-drawer.tsx` | useQuery | `/api/admin/pricing/templates` | GET |
| `components/admin/pricing-drawer.tsx` | apiRequest | `/api/admin/pricing/suggest` | POST |
| `components/admin/pricing-drawer.tsx` | apiRequest | `/api/admin/invoice/generate-and-send` | POST |
| `components/admin/pricing-drawer.tsx` | apiRequest | `/api/admin/pricing/save` | POST |
| `components/admin/pricing-drawer.tsx` | apiRequest | `/api/admin/pricing/lock` | POST |
| `components/admin/invoice-drawer.tsx` | apiRequest | `/api/admin/invoices` | POST |
| `components/admin/invoice-drawer.tsx` | apiRequest | `/api/admin/invoices/{id}/send` | POST |
| `components/admin/invoice-builder.tsx` | apiRequest | `/api/admin/invoices/{id}` | PATCH |
| `components/admin/invoice-builder.tsx` | apiRequest | `/api/admin/invoices/generate` | POST |
| `components/admin/invoice-builder.tsx` | apiRequest | `/api/admin/invoices/{id}/send` | POST |
| `components/admin/negotiation-chat.tsx` | useQuery | `/api/admin/negotiations/{loadId}` | GET |
| `components/admin/negotiation-chat.tsx` | apiRequest | `/api/admin/negotiations/{loadId}/counter` | POST |
| `components/admin/negotiation-chat.tsx` | apiRequest | `/api/admin/negotiations/{loadId}/accept` | POST |
| `components/admin/negotiation-chat.tsx` | apiRequest | `/api/admin/negotiations/{loadId}/reject` | POST |
| `components/admin/negotiation-chat.tsx` | apiRequest | `/api/admin/negotiations/{loadId}/simulate` | POST |

### 3.4 Shipper Portal API Calls

| Frontend File | Function / Hook | API URL Called | Method |
|---------------|-----------------|---------------|--------|
| `pages/shipper/dashboard.tsx` | useQuery | `/api/shipments/tracking` | GET |
| `pages/shipper/dashboard.tsx` | useQuery | `/api/shipper/documents` | GET |
| `pages/shipper/loads.tsx` | useQuery | `/api/loads` | GET |
| `pages/shipper/load-detail.tsx` | useQuery | `/api/loads/{id}` | GET |
| `pages/shipper/load-detail.tsx` | useQuery | `/api/shipments/load/{id}` | GET |
| `pages/shipper/load-detail.tsx` | apiRequest | `/api/loads/{id}` | PATCH |
| `pages/shipper/post-load.tsx` | useQuery | `/api/shipper/onboarding` | GET |
| `pages/shipper/post-load.tsx` | useQuery | `/api/shipper/saved-addresses/pickup` | GET |
| `pages/shipper/post-load.tsx` | useQuery | `/api/shipper/saved-addresses/dropoff` | GET |
| `pages/shipper/post-load.tsx` | apiRequest | `/api/loads/submit` | POST |
| `pages/shipper/post-load.tsx` | apiRequest | `/api/shipper/saved-addresses` | POST |
| `pages/shipper/post-load.tsx` | apiRequest | `/api/shipper/saved-addresses/{id}/use` | POST |
| `pages/shipper/tracking.tsx` | useQuery | `/api/shipments/tracking` | GET |
| `pages/shipper/delivered-loads.tsx` | useQuery | `/api/shipments/tracking` | GET |
| `pages/shipper/documents.tsx` | useQuery | `/api/shipper/onboarding` | GET |
| `pages/shipper/documents.tsx` | useQuery | `/api/shipper/documents` | GET |
| `pages/shipper/invoices.tsx` | useQuery | `/api/invoices/shipper` | GET |
| `pages/shipper/invoices.tsx` | apiRequest | `/api/shipper/invoices/{id}/acknowledge` | POST |
| `pages/shipper/invoices.tsx` | apiRequest | `/api/shipper/invoices/{id}/view` | POST |
| `pages/shipper/onboarding.tsx` | useQuery | `/api/shipper/onboarding` | GET |
| `pages/shipper/onboarding.tsx` | apiRequest | `/api/shipper/onboarding/draft` | PATCH |
| `pages/shipper/onboarding.tsx` | apiRequest | `/api/shipper/onboarding` | POST |
| `pages/shipper/onboarding.tsx` | apiRequest | `/api/shipper/onboarding` | PUT |

### 3.5 Carrier Portal API Calls

| Frontend File | Function / Hook | API URL Called | Method |
|---------------|-----------------|---------------|--------|
| `pages/carrier/dashboard.tsx` | useQuery | `/api/carrier/onboarding` | GET |
| `pages/carrier/dashboard.tsx` | useQuery | `/api/carrier/verification` | GET |
| `pages/carrier/dashboard.tsx` | useQuery | `/api/carrier/dashboard/stats` | GET |
| `pages/carrier/dashboard.tsx` | useQuery | `/api/carrier/performance` | GET |
| `pages/carrier/loads.tsx` | useQuery | `/api/carrier/loads` | GET |
| `pages/carrier/loads.tsx` | useQuery | `/api/carrier/recommended-loads` | GET |
| `pages/carrier/loads.tsx` | useQuery | `/api/trucks` | GET |
| `pages/carrier/loads.tsx` | useQuery | `/api/drivers` | GET |
| `pages/carrier/loads.tsx` | apiRequest | `/api/bids/submit` | POST |
| `pages/carrier/loads.tsx` | apiRequest | `/api/loads/{id}/accept-direct` | POST |
| `pages/carrier/bids.tsx` | useQuery | `/api/carrier/bids` | GET |
| `pages/carrier/bids.tsx` | apiRequest | `/api/carrier/bids/{bidId}/counter` | POST |
| `pages/carrier/bids.tsx` | apiRequest | `/api/bids/{bidId}/negotiate` | POST |
| `pages/carrier/bids.tsx` | apiRequest | `/api/carrier/bids/{bidId}/accept` | POST |
| `pages/carrier/fleet.tsx` | useQuery | `/api/trucks` | GET |
| `pages/carrier/fleet.tsx` | apiRequest | `/api/trucks/{truckId}` | PATCH |
| `pages/carrier/drivers.tsx` | useQuery | `/api/drivers` | GET |
| `pages/carrier/drivers.tsx` | apiRequest | `/api/drivers` | POST |
| `pages/carrier/drivers.tsx` | apiRequest | `/api/drivers/{id}` | PATCH |
| `pages/carrier/drivers.tsx` | apiRequest | `/api/drivers/{id}` | DELETE |
| `pages/carrier/shipments.tsx` | useQuery | `/api/drivers` | GET |
| `pages/carrier/shipments.tsx` | useQuery | `/api/trucks` | GET |
| `pages/carrier/shipments.tsx` | apiRequest | `/api/shipments/{id}/assign-driver` | PATCH |
| `pages/carrier/shipments.tsx` | apiRequest | `/api/shipments/{id}/assign-truck` | PATCH |
| `pages/carrier/trips.tsx` | useQuery | `/api/shipments/{shipmentId}/documents` | GET |
| `pages/carrier/trips.tsx` | apiRequest | `/api/shipments/{shipmentId}/documents` | POST |
| `pages/carrier/documents.tsx` | useQuery | `/api/carrier/documents` | GET |
| `pages/carrier/documents.tsx` | apiRequest | `/api/carrier/documents` | POST |
| `pages/carrier/documents.tsx` | apiRequest | `/api/carrier/documents/{id}` | DELETE |
| `pages/carrier/my-truck.tsx` | useQuery | `/api/carrier/solo/truck` | GET |
| `pages/carrier/my-truck.tsx` | apiRequest | `/api/carrier/truck/{truckId}` | PATCH |
| `pages/carrier/my-info.tsx` | useQuery | `/api/carrier/solo/profile` | GET |
| `pages/carrier/my-info.tsx` | useQuery | `/api/carrier/performance` | GET |
| `pages/carrier/my-info.tsx` | apiRequest | `/api/carrier/solo/profile` | PATCH |
| `pages/carrier/my-documents.tsx` | useQuery | `/api/carrier/documents/expiring` | GET |
| `pages/carrier/my-documents.tsx` | useQuery | `/api/carrier/verification` | GET |
| `pages/carrier/my-documents.tsx` | apiRequest | `/api/carrier/documents` | POST |
| `pages/carrier/my-documents.tsx` | apiRequest | `/api/carrier/documents/{id}` | DELETE |
| `pages/carrier/add-truck.tsx` | useQuery | `/api/carrier/onboarding` | GET |
| `pages/carrier/add-truck.tsx` | useQuery | `/api/trucks` | GET |
| `pages/carrier/add-truck.tsx` | useQuery | `/api/carrier/documents` | GET |
| `pages/carrier/add-truck.tsx` | useQuery | `/api/carrier/documents/expiring` | GET |
| `pages/carrier/onboarding.tsx` | useQuery | `/api/carrier/onboarding` | GET |
| `pages/carrier/onboarding.tsx` | apiRequest | `/api/carrier/onboarding/draft` | PATCH |
| `pages/carrier/onboarding.tsx` | apiRequest | `/api/carrier/verification/documents` | POST |
| `pages/carrier/onboarding.tsx` | apiRequest | `/api/carrier/onboarding/submit` | POST |
| `pages/carrier/history.tsx` | useQuery | `/api/drivers` | GET |
| `pages/carrier/history.tsx` | useQuery | `/api/shipments` | GET |

### 3.6 Solo Carrier Portal API Calls

| Frontend File | Function / Hook | API URL Called | Method |
|---------------|-----------------|---------------|--------|
| `pages/solo/load-feed.tsx` | useQuery | `/api/carrier/available-loads` | GET |
| `pages/solo/load-feed.tsx` | useQuery | `/api/carrier/recommended-loads` | GET |
| `pages/solo/load-feed.tsx` | apiRequest | `/api/bids/submit` | POST |
| `pages/solo/my-bids.tsx` | useQuery | `/api/bids` | GET |
| `pages/solo/my-trips.tsx` | useQuery | `/api/shipments` | GET |
| `pages/solo/earnings.tsx` | useQuery | `/api/shipments` | GET |

### 3.7 Finance Portal API Calls

| Frontend File | Function / Hook | API URL Called | Method |
|---------------|-----------------|---------------|--------|
| `pages/finance/dashboard.tsx` | useQuery | `/api/finance/shipments` | GET |
| `pages/finance/dashboard.tsx` | apiRequest | `/api/finance/reviews` | POST |
| `pages/finance/dashboard.tsx` | apiRequest | `/api/finance/reviews/{id}/payment` | PATCH |

### 3.8 Shared Component API Calls

| Frontend File | Function / Hook | API URL Called | Method |
|---------------|-----------------|---------------|--------|
| `components/notification-panel.tsx` | useQuery | `/api/notifications` | GET |
| `components/notification-panel.tsx` | apiRequest | `/api/notifications/{id}/read` | PATCH |
| `components/notification-panel.tsx` | apiRequest | `/api/notifications/read-all` | POST |
| `components/shipper-rating-dialog.tsx` | apiRequest | `/api/shipper-ratings` | POST |
| `components/carrier-rating-dialog.tsx` | apiRequest | `/api/carrier-ratings` | POST |
| `components/admin-verification-banner.tsx` | useQuery | `/api/admin/verifications` | GET |
| `hooks/use-carrier-onboarding-gate.tsx` | useQuery | `/api/carrier/onboarding` | GET |
| `hooks/use-shipper-onboarding-gate.tsx` | useQuery | `/api/shipper/onboarding` | GET |
| `hooks/use-shipper-profile.ts` | useQuery | `/api/shipper/profile` | GET |
| `hooks/use-shipper-profile.ts` | useQuery | `/api/shipper/{shipperId}/profile` | GET |
| `pages/in-transit.tsx` | useQuery | `/api/telemetry/vehicles` | GET |
| `pages/in-transit.tsx` | useQuery | `/api/telemetry/alerts` | GET |
| `pages/in-transit.tsx` | useQuery | `/api/telemetry/eta/{loadId}` | GET |
| `pages/in-transit.tsx` | useQuery | `/api/telemetry/driver-behavior/{driverId}` | GET |
| `pages/settings.tsx` | useQuery | `/api/shipper/{userId}/rating` | GET |

### 3.9 Reusable API Hooks (`client/src/lib/api-hooks.ts`)

| Hook | API URL | Method | Invalidates |
|------|---------|--------|-------------|
| `useLoads()` | `/api/loads` | GET | - |
| `useLoad(id)` | `/api/loads/{id}` | GET | - |
| `useLoadHistory(loadId)` | `/api/loads/{loadId}/history` | GET | - |
| `useCreateLoad()` | `/api/loads` | POST | `/api/loads` |
| `useUpdateLoad()` | `/api/loads/{id}` | PATCH | `/api/loads`, `/api/loads/{id}` |
| `useTransitionLoad()` | `/api/loads/{loadId}/transition` | POST | `/api/loads`, `/api/loads/{loadId}` |
| `useBids()` | `/api/bids` | GET | - |
| `useLoadBids(loadId)` | `/api/loads/{loadId}/bids` | GET | - |
| `useCreateBid()` | `/api/bids` | POST | `/api/bids`, `/api/loads/{loadId}/bids` |
| `useUpdateBid()` | `/api/bids/{id}` | PATCH | `/api/bids`, `/api/loads` |
| `useTrucks()` | `/api/trucks` | GET | - |
| `useCreateTruck()` | `/api/trucks` | POST | `/api/trucks` |
| `useUpdateTruck()` | `/api/trucks/{id}` | PATCH | `/api/trucks` |
| `useDeleteTruck()` | `/api/trucks/{id}` | DELETE | `/api/trucks` |
| `useShipments()` | `/api/shipments` | GET | - |
| `useShipmentTracking()` | `/api/shipments/tracking` | GET | - |
| `useShipment(id)` | `/api/shipments/{id}` | GET | - |
| `useShipmentByLoad(loadId)` | `/api/shipments/load/{loadId}` | GET | - |
| `useInvoices()` | `/api/invoices` | GET | - |
| `useInvoice(id)` | `/api/invoices/{id}` | GET | - |
| `useShipperInvoices()` | `/api/invoices/shipper` | GET | - |
| `useCreateInvoice()` | `/api/invoices` | POST | `/api/invoices` |
| `useUpdateInvoice()` | `/api/invoices/{id}` | PATCH | `/api/invoices`, `/api/invoices/{id}` |
| `useSendInvoice()` | `/api/invoices/{id}/send` | POST | `/api/invoices`, `/api/loads` |
| `useNotifications()` | `/api/notifications` | GET | - |
| `useMarkNotificationRead()` | `/api/notifications/{id}/read` | PATCH | `/api/notifications` |
| `useMarkAllNotificationsRead()` | `/api/notifications/read-all` | POST | `/api/notifications` |
| `useDocuments()` | `/api/documents` | GET | - |
| `useLoadDocuments(loadId)` | `/api/loads/{loadId}/documents` | GET | - |
| `useCarriers()` | `/api/carriers` | GET | - |
| `useCarrier(id)` | `/api/carriers/{id}` | GET | - |
| `useUsers()` | `/api/users` | GET | - |
| `useAdminStats()` | `/api/admin/stats` | GET | - |

---

## 4. Screen-to-API Mapping

### 4.1 Public Pages

| Screen (Route) | Component | APIs Called |
|-----------------|-----------|-----------|
| `/auth` (Login/Register) | `auth.tsx` | `/api/auth/login`, `/api/auth/register`, `/api/otp/registration/send`, `/api/otp/registration/verify` |
| `/` (Landing) | `landing.tsx` | None |
| `/about` | `about.tsx` | None |
| `/contact` | `contact.tsx` | `/api/contact` |
| `/faqs` | `faqs.tsx` | None |
| `/solutions` | `solutions/` | None |
| `/press-room` | `press-room.tsx` | None |

### 4.2 Admin Portal Pages

| Screen (Route) | Component | APIs Called |
|-----------------|-----------|-----------|
| `/admin` | `admin/overview.tsx` | `/api/admin/onboarding-requests/stats`, `/api/admin/analytics/realtime` |
| `/admin/post-load` | `admin/post-load.tsx` | `/api/admin/shippers/verified`, `/api/admin/saved-addresses/{id}/{type}`, `/api/admin/loads/create`, `/api/admin/saved-addresses` |
| `/admin/queue` | `admin/load-queue.tsx` | `/api/admin/queue`, `/api/admin/pricing/templates`, `/api/admin/invoices/{id}/send`, `/api/admin/loads/{id}/reprice-repost` |
| `/admin/loads` | `admin/loads.tsx` | `/api/loads`, `/api/finance/reviews/all` |
| `/admin/loads/:loadId` | `admin/load-details.tsx` | `/api/loads/{id}`, `/api/loads/{id}/recommended-carriers`, `/api/shipments/load/{id}`, `/api/loads/{id}` (PATCH), `/api/loads/{id}/transition` |
| `/admin/negotiations` | `admin/negotiations.tsx` | `/api/bids`, `/api/bids/{id}/negotiate`, `/api/bids/{id}` (PATCH) |
| `/admin/inbox` | `admin/negotiation-inbox.tsx` | `/api/admin/negotiations` |
| `/admin/invoices` | `admin/invoices.tsx` | `/api/admin/invoices`, `/api/admin/invoices/{id}/send`, `/api/admin/invoices/{id}/mark-paid` |
| `/admin/carriers` | `admin/carriers.tsx` | `/api/admin/carriers`, `/api/admin/verifications`, `/api/admin/carriers/{id}` (PATCH), `/api/admin/carriers/{id}/verify` |
| `/admin/carriers/:carrierId` | `admin/carrier-profile.tsx` | `/api/admin/carriers/{id}`, `/api/admin/carriers/{id}/verify`, `/api/admin/documents/{id}/verify` |
| `/admin/verification` | `admin/carrier-verification.tsx` | `/api/admin/verifications`, `/api/admin/verifications/{id}/approve`, `/api/admin/verifications/{id}/reject`, `/api/admin/verifications/{id}/hold`, `/api/admin/verification-documents/{id}` |
| `/admin/onboarding` | `admin/onboarding.tsx` | `/api/admin/onboarding-requests`, `/api/admin/onboarding-requests/{id}/review` |
| `/admin/users` | `admin/users.tsx` | `/api/admin/users` |
| `/admin/live-tracking` | `admin/live-tracking.tsx` | `/api/admin/live-tracking`, `/api/finance/reviews`, `/api/finance/reviews/{id}/payment`, `/api/admin/documents/{id}/verify` |
| `/admin/volume` | `admin/volume-analytics.tsx` | `/api/loads`, `/api/bids` |
| `/admin/revenue` | `admin/revenue-dashboard.tsx` | Various analytics |
| `/admin/otp-queue` | `admin/otp-queue.tsx` | `/api/otp/requests` |
| `/admin/finance-review` | `finance/dashboard.tsx` | `/api/finance/shipments`, `/api/finance/reviews`, `/api/finance/reviews/{id}/payment` |

### 4.3 Shipper Portal Pages

| Screen (Route) | Component | APIs Called |
|-----------------|-----------|-----------|
| `/shipper` | `shipper/dashboard.tsx` | `/api/shipments/tracking`, `/api/shipper/documents` |
| `/shipper/post-load` | `shipper/post-load.tsx` | `/api/shipper/onboarding`, `/api/shipper/saved-addresses/pickup`, `/api/shipper/saved-addresses/dropoff`, `/api/loads/submit`, `/api/shipper/saved-addresses` |
| `/shipper/loads` | `shipper/loads.tsx` | `/api/loads` |
| `/shipper/loads/:id` | `shipper/load-detail.tsx` | `/api/loads/{id}`, `/api/shipments/load/{id}`, `/api/loads/{id}` (PATCH) |
| `/shipper/tracking` | `shipper/tracking.tsx` | `/api/shipments/tracking` |
| `/shipper/delivered` | `shipper/delivered-loads.tsx` | `/api/shipments/tracking` |
| `/shipper/documents` | `shipper/documents.tsx` | `/api/shipper/onboarding`, `/api/shipper/documents` |
| `/shipper/invoices` | `shipper/invoices.tsx` | `/api/invoices/shipper`, `/api/shipper/invoices/{id}/acknowledge`, `/api/shipper/invoices/{id}/view` |
| `/shipper/onboarding` | `shipper/onboarding.tsx` | `/api/shipper/onboarding`, `/api/shipper/onboarding/draft`, `/api/shipper/onboarding` (PUT) |

### 4.4 Carrier Portal Pages

| Screen (Route) | Component | APIs Called |
|-----------------|-----------|-----------|
| `/carrier` | `carrier/dashboard.tsx` | `/api/carrier/onboarding`, `/api/carrier/verification`, `/api/carrier/dashboard/stats`, `/api/carrier/performance` |
| `/carrier/loads` | `carrier/loads.tsx` | `/api/carrier/loads`, `/api/carrier/recommended-loads`, `/api/trucks`, `/api/drivers`, `/api/bids/submit`, `/api/loads/{id}/accept-direct` |
| `/carrier/bids` | `carrier/bids.tsx` | `/api/carrier/bids`, `/api/carrier/bids/{id}/counter`, `/api/bids/{id}/negotiate`, `/api/carrier/bids/{id}/accept` |
| `/carrier/fleet` | `carrier/fleet.tsx` | `/api/trucks`, `/api/trucks/{id}` (PATCH) |
| `/carrier/drivers` | `carrier/drivers.tsx` | `/api/drivers`, `/api/drivers` (POST), `/api/drivers/{id}` (PATCH/DELETE) |
| `/carrier/shipments` | `carrier/shipments.tsx` | `/api/drivers`, `/api/trucks`, `/api/shipments/{id}/assign-driver`, `/api/shipments/{id}/assign-truck` |
| `/carrier/trips` | `carrier/trips.tsx` | `/api/drivers`, `/api/trucks`, `/api/shipments/{id}/documents` |
| `/carrier/documents` | `carrier/documents.tsx` | `/api/carrier/documents` (GET/POST/DELETE) |
| `/carrier/my-truck` | `carrier/my-truck.tsx` | `/api/carrier/solo/truck`, `/api/carrier/truck/{id}` (PATCH) |
| `/carrier/my-info` | `carrier/my-info.tsx` | `/api/carrier/solo/profile` (GET/PATCH), `/api/carrier/performance` |
| `/carrier/my-documents` | `carrier/my-documents.tsx` | `/api/carrier/documents/expiring`, `/api/carrier/verification`, `/api/carrier/documents` (POST/DELETE) |
| `/carrier/add-truck` | `carrier/add-truck.tsx` | `/api/carrier/onboarding`, `/api/trucks`, `/api/carrier/documents`, `/api/carrier/documents/expiring` |
| `/carrier/onboarding` | `carrier/onboarding.tsx` | `/api/carrier/onboarding`, `/api/carrier/onboarding/draft`, `/api/carrier/verification/documents`, `/api/carrier/onboarding/submit` |
| `/carrier/revenue` | `carrier/revenue.tsx` | Various settlement/earnings |
| `/carrier/history` | `carrier/history.tsx` | `/api/drivers`, `/api/shipments` |

### 4.5 Solo Carrier Portal Pages

| Screen (Route) | Component | APIs Called |
|-----------------|-----------|-----------|
| `/solo` | `solo/load-feed.tsx` | `/api/carrier/available-loads`, `/api/carrier/recommended-loads`, `/api/bids/submit` |
| `/solo/loads` | `solo/load-feed.tsx` | Same as above |
| `/solo/bids` | `solo/my-bids.tsx` | `/api/bids` |
| `/solo/trips` | `solo/my-trips.tsx` | `/api/shipments` |
| `/solo/earnings` | `solo/earnings.tsx` | `/api/shipments` |

### 4.6 Shared Pages

| Screen (Route) | Component | APIs Called |
|-----------------|-----------|-----------|
| `/settings` | `settings.tsx` | `/api/shipper/{userId}/rating`, `/api/user` |
| (In-Transit overlay) | `in-transit.tsx` | `/api/telemetry/vehicles`, `/api/telemetry/alerts`, `/api/telemetry/eta/{loadId}`, `/api/telemetry/driver-behavior/{driverId}` |

---

## 5. Deployed Connectivity URLs

### Server Architecture

```
Client Browser
    |
    | HTTPS (port 443)
    v
Replit Reverse Proxy (TLS termination, trust proxy enabled)
    |
    | HTTP (port 5000 internally)
    v
Express.js Server (0.0.0.0:5000)
    |
    +--> /api/*           -> Express route handlers
    +--> /ws/marketplace  -> WebSocket (noServer, upgrade handler)
    +--> /ws/telemetry    -> WebSocket (noServer, upgrade handler)
    +--> /objects/*       -> Object Storage (Replit integration)
    +--> /assets/*        -> Static files (attached_assets/)
    +--> /*               -> Vite dev server (dev) / Static build (prod)
```

### Deployed Domain

| Environment | URL Pattern |
|-------------|-------------|
| Development | `https://{repl-slug}.{username}.repl.co` |
| Production (Autoscale) | `https://{repl-slug}.replit.app` |
| Custom Domain (if configured) | `https://loadsmart.in` (or user-defined) |

### Backend Domain

Same as frontend - single origin deployment. No separate API domain.

| Item | Value |
|------|-------|
| Backend Domain | Same as frontend domain |
| API Gateway | None (Express serves directly) |
| Load Balancer | Replit Autoscale (reverse proxy) |
| Proxy Path | Direct (no path rewriting) |
| CORS Origin | Not configured (same-origin, no CORS needed) |

### Cookie Configuration

| Setting | Development | Production |
|---------|-------------|------------|
| Secure | `false` | `true` |
| HttpOnly | `true` | `true` |
| SameSite | `lax` | `none` |
| Max Age | 7 days | 7 days |
| Domain | Not set (defaults to origin) | Not set (defaults to origin) |

### Database Connectivity

| Item | Value |
|------|-------|
| Database | PostgreSQL (Neon-backed) |
| Connection | `process.env.DATABASE_URL` |
| Driver | `pg.Pool` |
| ORM | Drizzle ORM |
| Session Store | `connect-pg-simple` (table: `session`) |

### Object Storage

| Item | Value |
|------|-------|
| Provider | Replit Object Storage |
| Upload URL | `POST /api/uploads/request-url` (presigned URL) |
| Serve Path | `GET /objects/{objectPath}` |
| Integration | `server/replit_integrations/object_storage/` |

### AI Integration

| Item | Value |
|------|-------|
| Provider | OpenAI (via Replit integration) |
| Base URL | `process.env.AI_INTEGRATIONS_OPENAI_BASE_URL` |
| API Key | `process.env.AI_INTEGRATIONS_OPENAI_API_KEY` |
| Used In | `server/helpbot-routes.ts`, `server/routes.ts` (truck suggestions) |

### Deployment Configuration

```
# .replit
[deployment]
deploymentTarget = "autoscale"
```

| Item | Value |
|------|-------|
| Deployment Target | Autoscale |
| Port | 5000 (env `PORT`, firewalled except 5000) |
| Build | `npm run build` (Vite production build) |
| Start | `npm run dev` (development) / `npm start` (production) |

---

*Generated from LoadSmart (powered by Roadex) codebase - READ-ONLY analysis, no code modifications made.*

**Total API Endpoints: 249** (247 HTTP routes + 2 WebSocket endpoints)

**Controller File:** All HTTP routes in `server/routes.ts` except help bot routes in `server/helpbot-routes.ts` and object storage routes in `server/replit_integrations/object_storage/`
