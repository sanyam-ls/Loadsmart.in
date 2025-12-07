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