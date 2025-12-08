# FreightFlow - Digital Freight Marketplace

## Overview

FreightFlow is a full-stack logistics marketplace MVP that connects shippers with carriers for freight transportation. The platform supports three distinct user roles (Shipper, Carrier, Admin) with role-specific dashboards and workflows. Built with React, Express, and PostgreSQL, it features session-based authentication, real-time UI interactions, and a comprehensive design system based on shadcn/ui components with a blue and white enterprise theme.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build Tools**
- React 18+ with TypeScript for type-safe component development
- Vite as the build tool and dev server with HMR support
- Wouter for lightweight client-side routing
- TanStack Query for server state management and data fetching

**UI Component System**
- shadcn/ui (New York style) as the component foundation
- Radix UI primitives for accessible, unstyled components
- Tailwind CSS for utility-first styling with custom design tokens
- Class Variance Authority (CVA) for variant-based component APIs
- Custom color system with HSL-based theming supporting light/dark modes

**Design System**
- Hybrid Material Design with enterprise SaaS refinements
- Primary color: Blue (#2F7FED approximately) for CTAs and key actions
- Semantic colors: Green (success), Amber (warning), Red (error), Blue (info)
- Typography: Inter or DM Sans from Google Fonts
- Spacing scale: Tailwind units (2, 4, 6, 8, 12, 16, 20, 24)
- Role-optimized interfaces: lean for Carriers, powerful for Shippers, comprehensive for Admins

**State Management Approach**
- React Context for global app state (Auth, Theme)
- TanStack Query for async server state with automatic caching
- React Hook Form with Zod for form state and validation
- Local component state for UI-only concerns

**Key Frontend Features**
- Session-based authentication with role-based route protection
- Global day/night theme toggle with localStorage persistence
- AI Concierge chat widget (simulated intelligence for MVP)
- Notification panel with type-based icons and read/unread states
- Responsive sidebar navigation with role-specific menu items
- Reusable card components for loads, trucks, bids, and carriers

### Backend Architecture

**Server Framework**
- Express.js for HTTP server and routing
- Native Node.js HTTP server with WebSocket support capability
- Session middleware (express-session) for stateful authentication
- SHA-256 password hashing (development approach, should use bcrypt in production)

**API Design Pattern**
- RESTful endpoints under `/api` namespace
- Session-based auth with `requireAuth` middleware
- JSON request/response format
- Error handling with try-catch blocks returning appropriate HTTP status codes

**Authentication Strategy**
- Session-based authentication (not JWT as initially mentioned in requirements)
- Session data stored in memory or database (via connect-pg-simple)
- Middleware-based route protection checking `req.session.userId`
- Role information stored in user session for authorization

**Database Layer**
- PostgreSQL as the primary relational database
- Drizzle ORM for type-safe database queries and schema management
- Connection pooling via `pg` library
- Schema-first approach with Drizzle migrations

### Data Storage Solutions

**Database Schema Design**
- **users**: Core user authentication and profile (id, username, email, password, role, company details)
- **carrierProfiles**: Extended carrier information (fleet size, service zones, ratings, insurance)
- **trucks**: Carrier vehicle inventory (type, capacity, license plate, location, availability)
- **loads**: Shipper freight postings (origin, destination, weight, pickup date, status)
- **bids**: Carrier offers on loads (amount, estimated pickup, status, notes)
- **shipments**: Active freight movements linked to accepted bids
- **shipmentEvents**: Timeline tracking (pickup, checkpoints, delivery)
- **messages**: In-app communication between users
- **documents**: File metadata (POD, invoices, licenses, insurance)
- **notifications**: User alerts for bids, shipments, documents
- **ratings**: Carrier performance reviews from shippers

**Data Relationships**
- Users have one-to-many with trucks, loads, bids, messages
- Carriers have one-to-one with carrierProfiles
- Loads have one-to-many with bids
- Bids link to shipments (one-to-one when accepted)
- Shipments have one-to-many with shipmentEvents and documents

**Storage Interface Pattern**
- Centralized `IStorage` interface in `server/storage.ts`
- CRUD methods for each entity type
- Drizzle ORM queries with type inference from schema
- Support for filtered queries (by user role, status, date ranges)

### Authentication and Authorization

**Authentication Mechanism**
- Session cookies with httpOnly and secure flags
- 7-day session expiration
- Username/password credential validation
- Session secret from environment variable (development default provided)

**Authorization Pattern**
- Role-based access control (shipper, carrier, admin)
- Middleware checks session existence for protected routes
- Frontend route guards based on user role
- Role-specific API endpoint access (implemented in storage layer)

**Security Considerations**
- HTTPS enforcement in production (secure cookies)
- Password hashing (SHA-256 for MVP, should upgrade to bcrypt)
- CSRF protection via session configuration
- Rate limiting capability (express-rate-limit in dependencies)

## External Dependencies

### Third-Party UI Libraries
- **@radix-ui**: 20+ component primitives (accordion, dialog, dropdown, select, etc.)
- **shadcn/ui**: Pre-configured component system built on Radix UI
- **lucide-react**: Icon library for consistent iconography
- **recharts**: Charting library for transaction volume visualization
- **embla-carousel-react**: Carousel/slider functionality
- **cmdk**: Command palette component

### Form Management
- **react-hook-form**: Form state and validation
- **@hookform/resolvers**: Zod schema integration for forms
- **zod**: Runtime type validation and schema definition
- **drizzle-zod**: Generate Zod schemas from Drizzle database schema

### Data Fetching & State
- **@tanstack/react-query**: Async state management and caching
- **wouter**: Lightweight routing library (alternative to React Router)

### Backend Services
- **drizzle-orm**: TypeScript ORM for PostgreSQL
- **pg**: PostgreSQL client for Node.js
- **express-session**: Session middleware for Express
- **connect-pg-simple**: PostgreSQL session store
- **passport** / **passport-local**: Authentication strategies (in dependencies but not actively used in visible code)

### Build & Development Tools
- **vite**: Frontend build tool and dev server
- **tsx**: TypeScript execution for server
- **esbuild**: Server-side bundling for production
- **tailwindcss**: Utility-first CSS framework
- **autoprefixer**: CSS vendor prefixing
- **postcss**: CSS transformation pipeline

### Date & Utility Libraries
- **date-fns**: Date manipulation and formatting
- **nanoid**: Unique ID generation
- **clsx** / **tailwind-merge**: Utility for conditional className merging
- **class-variance-authority**: Component variant management

### Development Plugins (Replit-specific)
- **@replit/vite-plugin-runtime-error-modal**: Runtime error overlay
- **@replit/vite-plugin-cartographer**: Code mapping
- **@replit/vite-plugin-dev-banner**: Development environment banner

### Database Connection
- **PostgreSQL**: Provisioned via DATABASE_URL environment variable
- **Connection pooling**: Managed by `pg.Pool`
- **Migration strategy**: Drizzle Kit for schema migrations to `./migrations` directory

### Environment Configuration
- **NODE_ENV**: Development/production mode switching
- **DATABASE_URL**: PostgreSQL connection string (required)
- **SESSION_SECRET**: Session encryption key (defaults to development value)
- **REPL_ID**: Replit environment detection for dev plugins

## Vehicle Telematics System (Shipper Portal Exclusive)

The CAN-Bus GPS + Telematics system is available ONLY in the Shipper Portal. It is NOT available in the Admin Console or Carrier Portal.

### Telematics Features

**In-Transit Dashboard** (`/shipper/in-transit`)
- Live GPS positioning with heading indicator
- Real-time CAN-Bus diagnostics: speed, RPM, fuel level, engine temp, battery voltage
- Vehicle selection panel with status indicators (Moving/Stopped)
- Fleet Overview with aggregated metrics (moving count, stopped count, low fuel alerts, high temp alerts)
- Active Alerts panel showing critical vehicle issues

**ETA Prediction Engine**
- AI-powered arrival time estimates
- Traffic and weather condition monitoring
- Delay risk assessment (low/medium/high)
- Better route suggestions with time savings
- Distance remaining with real-time updates

**Driver Behavior Insights**
- Overall driver safety score (0-100)
- Harsh braking event tracking
- Sudden acceleration monitoring
- Overspeed incident logging
- Idle time analysis

**AI Concierge Integration**
The AI Concierge responds to telemetry-related queries:
- "Fleet status" - Shows live vehicle health and GPS summary
- "Vehicle alerts" - Lists current critical alerts (fuel, temperature, etc.)
- "ETA" / "When will" - Provides arrival predictions with delay analysis
- "Driver behavior" - Shows driver safety scores and recommendations

### Telematics API Endpoints

All endpoints require authentication (`requireAuth` middleware):

- `GET /api/telemetry/vehicles` - All active vehicles telemetry
- `GET /api/telemetry/vehicles/:vehicleId` - Single vehicle telemetry
- `GET /api/telemetry/vehicle-ids` - List of active vehicle IDs
- `GET /api/telemetry/eta/:loadId` - ETA prediction for a load
- `GET /api/telemetry/breadcrumbs/:vehicleId` - GPS trail (last 10 minutes)
- `GET /api/telemetry/driver-behavior/:driverId` - Driver behavior score
- `GET /api/telemetry/alerts` - All current fleet alerts
- `GET /api/telemetry/alerts/:vehicleId` - Alerts for specific vehicle

### Telemetry Data Types

**LiveTelemetryData**: Real-time vehicle state
- GPS coordinates (lat/lng), heading, speed, RPM
- Fuel level, engine temperature, battery voltage
- Odometer, load weight, ignition status

**EtaPrediction**: AI-powered arrival estimates
- Current ETA, original ETA, delay minutes
- Delay risk level, traffic condition, weather
- Better route availability with time savings

### Demo Vehicles

5 simulated vehicles for development:
- TRK-1024 (Route: Delhi → Mumbai)
- TRK-2048 (Route: Bangalore → Chennai)
- TRK-3072 (Route: Kolkata → Delhi)
- TRK-4096 (Route: Delhi → Mumbai)
- TRK-5120 (Route: Bangalore → Chennai)

### Implementation Notes

- REST API polling (5-second intervals) for reliability
- Telemetry simulation engine updates every 1 second
- No telematics data in Admin Console or Carrier Portal
- Test users: shipper/admin123 (shipper role), admin/admin123 (admin role)

## Admin Console Centralized Data Store

The Admin Console uses a centralized data store (`client/src/lib/admin-data-store.tsx`) for enterprise-scale mock data management. This provides:

### Architecture Pattern
- React Context with useRef for stable references
- All admin functions use useRef pattern to avoid stale closures
- State refresh pattern: After admin actions, call getter methods to refresh local state

### Data Types Managed
- **AdminUser**: User accounts with roles (shipper, carrier, dispatcher, admin)
- **AdminLoad**: Freight loads with detailed statuses and assignments
- **AdminCarrier**: Carrier companies with fleet, documents, and performance data
- **DetailedCarrier**: 7-tab carrier profile (Overview, Fleet, Documents, Performance, Loads, Financials, Activity)
- **RevenueIntelligence**: Comprehensive revenue analytics with 8 data categories

### Revenue Intelligence System
The `getRevenueIntelligence()` method provides centralized revenue data:
- **RevenueBySource**: Breakdown by Load Transactions (77%), Subscriptions (16%), Add-ons (5%), Penalties (2%)
- **ShipperContributor/CarrierContributor**: Top revenue contributors
- **LoadTypeRevenue**: Revenue by freight type (FMCG, Construction, Machinery, etc.)
- **RegionRevenue**: Geographic revenue distribution across Indian regions
- **MonthlyRevenueData**: 12-month historical data with growth metrics
- **RevenueTransaction**: Individual transaction records
- **ProfitInsight/AIInsight**: Profitability metrics and AI-generated insights

### Key Methods
- `getDetailedLoad(loadId)`: Returns complete load details with timeline and documents
- `getDetailedCarrier(carrierId)`: Returns 7-tab carrier profile data
- `getRevenueIntelligence()`: Returns comprehensive revenue analytics
- Admin actions: `addCarrierNote()`, `invalidateCarrierDocument()`, `suspendCarrier()`, etc.

### Data Scale
- 350-450 users across all roles
- 180-280 loads with full lifecycle data
- 90-130 carriers with fleet and performance data
- 24 months transaction history
- Rs. 3.26 Cr (~$400K) total revenue for analytics