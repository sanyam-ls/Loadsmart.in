================================================================================
                    FULL SYSTEM FORENSIC DISCLOSURE REPORT
                              LoadSmart v1.0
                          Powered by Roadex

                    Internal Audit | Valuation Positioning
                          Strategic Control Document

                        Generated: February 2026
                        Classification: CONFIDENTIAL
================================================================================


================================================================================
                          TABLE OF CONTENTS
================================================================================

  1.  SYSTEM OVERVIEW
  2.  EXECUTIVE METRICS SUMMARY
  3.  TECHNOLOGY STACK - FRONTEND
  4.  TECHNOLOGY STACK - BACKEND
  5.  DATABASE TECHNOLOGY
  6.  DATABASE SCHEMA (ALL 44 TABLES)
  7.  COMPLETE API ENDPOINT DIRECTORY (ALL 253 ENDPOINTS)
  8.  FRONTEND ROUTING MAP (55+ ROUTES)
  9.  COMPLETE FEATURE INVENTORY
  10. CORE WORKFLOW ENGINE MAPPING
  11. LOAD LIFECYCLE STATE MACHINE
  12. PRICING ENGINE DETAIL
  13. RECOMMENDATION ALGORITHM
  14. CREDIT ASSESSMENT ENGINE
  15. DUAL MARKETPLACE BIDDING SYSTEM
  16. FLEET CARRIER RESOURCE ASSIGNMENT RULES
  17. WEBSOCKET EVENT CATALOG
  18. OTP SYSTEM ARCHITECTURE
  19. EMAIL SYSTEM
  20. INTERNATIONALIZATION (i18n)
  21. OBJECT STORAGE STRUCTURE
  22. FILE STRUCTURE OVERVIEW
  23. SOURCE CODE MAP
  24. SECURITY AND RISK ASSESSMENT
  25. BILLING AND MONETIZATION ENGINE
  26. DEPLOYMENT AND INFRASTRUCTURE
  27. COMPLIANCE AND REGULATORY CHECKLIST
  28. STRATEGIC VALUATION LAYERS
  29. CODE OWNERSHIP FOOTPRINT
  30. PERFORMANCE AND SCALABILITY ASSESSMENT
  31. DEPENDENCY VERSIONS (FULL LIST)


================================================================================
  SECTION 1: SYSTEM OVERVIEW
================================================================================

  Software Name:          LoadSmart (one word)
  Branding:               Powered by Roadex
  Version:                1.0
  Deployment State:       Production-ready on Replit
  Architecture Pattern:   Monolithic full-stack application
  API Style:              RESTful API-first architecture
  Hosting:                Replit (Nix-based Linux environment)
  Domain:                 .replit.app subdomain (custom domain configurable)
  Port:                   5000 (single-origin, Express serves both API + frontend)
  Security Model:         Session-based auth with PostgreSQL session store
  Scalability Model:      Vertical (single instance, Replit-managed)
  Licensing:              Proprietary, internal platform
  Hard-coded Constraints: Indian market (INR currency, Indian states/cities,
                          Indian truck types, GST/TDS compliance)

  Platform Purpose:
  Digital freight marketplace connecting shippers with carriers in the Indian
  logistics market. Features an "Admin-as-Mediator" pricing model where
  administrators review, price, and post loads on behalf of verified shippers.
  Carriers bid on posted loads through a dual marketplace system supporting
  both solo owner-operators and enterprise fleet carriers.


================================================================================
  SECTION 2: EXECUTIVE METRICS SUMMARY
================================================================================

  Total TypeScript/TSX Files:         3,764
  Total Project Files:                25,144
  Core Backend (routes.ts):           15,316 lines
  Storage Interface (storage.ts):     2,052 lines
  Database Schema (schema.ts):        2,109 lines
  Help Bot Routes:                    401 lines
  Page Components:                    61 files
  UI Components:                      81 files
  Database Tables:                    44
  Total API Endpoints:                253 (249 HTTP + 4 HelpBot)
  WebSocket Channels:                 2
  Frontend Routes:                    55+
  User Roles:                         3 defined in schema (admin, shipper, carrier)
                                     + 2 application-level sub-roles (finance, solo_carrier)
  Supported Languages:                5 (English, Hindi, Punjabi, Marathi, Tamil)
  Load Lifecycle States:              15
  Production Dependencies:            83 packages
  Dev Dependencies:                   18 packages


================================================================================
  SECTION 3: TECHNOLOGY STACK - FRONTEND
================================================================================

  3.1 Framework & Language
  -------------------------------------------------------
  Framework:              React 18.3.1
  Language:               TypeScript 5.6.3
  Build Tool:             Vite 5.4.14
  Transpiler:             esbuild 0.24.2

  3.2 UI & Styling
  -------------------------------------------------------
  CSS Framework:          Tailwind CSS 3.4.17
  Component Library:      shadcn/ui (Radix UI primitives)
  Animation:              tailwindcss-animate 1.0.7
  Icons:                  lucide-react 0.468.0, react-icons 5.4.0
  Charts:                 Recharts 2.15.0
  Carousel:               embla-carousel-react 8.5.1
  Resizable Panels:       react-resizable-panels 2.1.7
  Bottom Sheet/Drawer:    vaul 1.1.2
  Command Palette:        cmdk 1.0.4
  Class Utilities:        clsx 2.1.1, tailwind-merge 2.6.0,
                          class-variance-authority 0.7.1
  Theme:                  Royal blue + white, CSS custom properties,
                          dark mode via class toggle
  Responsive Design:      Tailwind breakpoints (sm/md/lg/xl)

  3.3 Routing
  -------------------------------------------------------
  Library:                wouter 3.5.0
  Route Types:            Public + Protected (role-gated)
  Total Routes:           55+

  3.4 State Management
  -------------------------------------------------------
  Server State:           TanStack React Query 5.62.7
  Auth State:             React Context API (auth-context.tsx)
  Form State:             React Hook Form 7.54.2
  Theme State:            React Context (ThemeProvider)
  Language State:          i18next
  Local UI State:          React useState / useReducer

  3.5 API Integration
  -------------------------------------------------------
  HTTP Client:            Native fetch (wrapped in apiRequest utility)
  Service Layer:          client/src/lib/queryClient.ts
  Real-time:              Native WebSocket API
  Credentials:            credentials: "include" (cookie-based sessions)

  3.6 Form Handling & Validation
  -------------------------------------------------------
  Form Library:           React Hook Form 7.54.2
  Resolver:               @hookform/resolvers (zodResolver)
  Validation:             Zod 3.24.1
  Schema Source:          drizzle-zod (createInsertSchema)
  OTP Input:              input-otp 1.4.1

  3.7 Maps & Tracking
  -------------------------------------------------------
  Maps Library:           Leaflet 1.9.4 + react-leaflet 5.0.0
  Usage:                  GPS tracking display, route visualization,
                          nearby trucks map

  3.8 Internationalization
  -------------------------------------------------------
  Framework:              i18next 24.2.2 + react-i18next 15.4.1
  Language Detection:     i18next-browser-languagedetector 8.0.4
  Languages:              English (default), Hindi, Punjabi, Marathi, Tamil

  3.9 Date & Utilities
  -------------------------------------------------------
  Date Library:           date-fns 4.1.0
  Unique IDs:             nanoid 5.0.9

  3.10 Build & PostCSS
  -------------------------------------------------------
  PostCSS:                postcss 8.4.49 + autoprefixer 10.4.20
  Theme Plugin:           @replit/vite-plugin-shadcn-theme-json 0.0.4


================================================================================
  SECTION 4: TECHNOLOGY STACK - BACKEND
================================================================================

  4.1 Runtime & Framework
  -------------------------------------------------------
  Language:               TypeScript 5.6.3
  Runtime:                Node.js
  Framework:              Express.js 4.21.2
  Dev Runner:             tsx 4.19.2

  4.2 Architecture
  -------------------------------------------------------
  Pattern:                Monolith
  Structure:              Layered (Routes -> Storage Interface -> Database)
  API Style:              REST (API-first)
  Frontend Serving:       Vite dev proxy in dev, static build in production

  4.3 Authentication
  -------------------------------------------------------
  Method:                 Session-based (express-session 1.18.1)
  Session Store:          PostgreSQL (connect-pg-simple 10.0.0)
  Cookie Type:            HTTP-only session cookies
  Password Hashing:       bcrypt (via Node.js crypto)

  4.4 Real-time
  -------------------------------------------------------
  Library:                ws 8.18.0 (native WebSocket)
  Channels:               /ws/marketplace, /ws/telemetry
  State:                  In-memory connection tracking

  4.5 AI Integration
  -------------------------------------------------------
  Library:                OpenAI 4.77.3
  Usage:                  Truck suggestions, ETA predictions, help bot chat

  4.6 Email
  -------------------------------------------------------
  Library:                Nodemailer 6.10.0
  Transport:              SMTP (Gmail, port 587, STARTTLS)
  Secrets:                SMTP_USER, SMTP_PASS

  4.7 File Upload
  -------------------------------------------------------
  Middleware:             Multer 1.4.5-lts.1
  Storage:                Replit Object Storage (presigned URLs)

  4.8 Background Jobs
  -------------------------------------------------------
  Job Queue:              None (all processing synchronous)
  Cron Jobs:              None
  Scheduled Tasks:        None

  4.9 Logging
  -------------------------------------------------------
  Request Logging:        Console.log
  Audit Trail:            Custom audit_logs table in PostgreSQL
  API Logging:            Custom api_logs table for admin troubleshooting


================================================================================
  SECTION 5: DATABASE TECHNOLOGY
================================================================================

  Database:               PostgreSQL (Neon-backed)
  ORM:                    Drizzle ORM 0.39.3
  Schema Validation:      drizzle-zod 0.7.0
  Migration Tool:         Drizzle Kit 0.30.4 (npm run db:push)
  Client Library:         pg 8.13.1 (node-postgres)
  Connection:             Pool via DATABASE_URL environment variable
  Hosting:                Neon (via Replit built-in PostgreSQL)
  Session Table:          "session" (managed by connect-pg-simple)


================================================================================
  SECTION 6: DATABASE SCHEMA (ALL 44 TABLES)
================================================================================

  6.1 Core Tables
  -------------------------------------------------------

  TABLE: users
    id                    serial PRIMARY KEY
    email                 varchar(255) NOT NULL UNIQUE
    password              text NOT NULL
    fullName              varchar(255)
    phone                 varchar(20)
    role                  varchar(20) NOT NULL (admin/shipper/carrier/finance)
    isVerified            boolean DEFAULT false
    companyName           varchar(255)
    companyAddress        text
    carrierType           varchar(20) (solo/fleet)
    profileImageUrl       text
    createdAt             timestamp DEFAULT now()
    updatedAt             timestamp DEFAULT now()

  TABLE: loads
    id                    serial PRIMARY KEY
    shipperId             integer REFERENCES users(id)
    status                varchar(50) DEFAULT 'draft'
    pickupAddress         text
    pickupLocality        text
    pickupLandmark        text
    pickupCity            varchar(100)
    pickupState           varchar(100)
    dropoffAddress        text
    dropoffLocality       text
    dropoffLandmark       text
    dropoffCity           varchar(100)
    dropoffState          varchar(100)
    dropoffBusinessName   varchar(255)
    weight                numeric
    materialType          varchar(100)
    cargoDescription      text
    requiredTruckType     varchar(100)
    numberOfTrucks        integer DEFAULT 1
    pickupDate            timestamp
    deliveryDate          timestamp
    specialNotes          text
    shipperContactName    varchar(255)
    shipperContactPhone   varchar(20)
    shipperCompanyAddress text
    receiverFullName      varchar(255)
    receiverPhone         varchar(20)
    receiverEmail         varchar(255)
    adminGrossPrice       numeric
    finalPrice            numeric
    adminFinalPrice       numeric
    platformMarginPercent numeric
    platformMargin        numeric
    estimatedCarrierPayout numeric
    carrierAdvancePercent numeric
    carrierAdvanceAmount  numeric
    carrierBalanceOnDelivery numeric
    advancePaymentPercent numeric
    shipperAdvanceAmount  numeric
    shipperBalanceAmount  numeric
    rateType              varchar(20) (per_ton/fixed)
    shipperPricePerTon    numeric
    pricingType           varchar(20) (fixed_price/negotiable)
    postedAt              timestamp
    awardedAt             timestamp
    awardedCarrierId      integer REFERENCES users(id)
    createdAt             timestamp DEFAULT now()
    updatedAt             timestamp DEFAULT now()

  TABLE: bids
    id                    serial PRIMARY KEY
    loadId                integer REFERENCES loads(id)
    carrierId             integer REFERENCES users(id)
    amount                numeric NOT NULL
    counterAmount         numeric
    status                varchar(20) DEFAULT 'pending'
    truckId               integer REFERENCES trucks(id)
    driverId              integer REFERENCES drivers(id)
    notes                 text
    negotiationHistory    jsonb
    createdAt             timestamp DEFAULT now()
    updatedAt             timestamp DEFAULT now()

  TABLE: shipments
    id                    serial PRIMARY KEY
    loadId                integer REFERENCES loads(id)
    carrierId             integer REFERENCES users(id)
    truckId               integer REFERENCES trucks(id)
    driverId              integer REFERENCES drivers(id)
    status                varchar(50) DEFAULT 'pending'
    trackingData          jsonb
    startedAt             timestamp
    deliveredAt           timestamp
    createdAt             timestamp DEFAULT now()
    updatedAt             timestamp DEFAULT now()

  TABLE: invoices
    id                    serial PRIMARY KEY
    loadId                integer REFERENCES loads(id)
    invoiceNumber         varchar(50) UNIQUE
    shipperId             integer REFERENCES users(id)
    carrierId             integer REFERENCES users(id)
    subtotal              numeric
    totalAmount           numeric
    cgst                  numeric
    sgst                  numeric
    igst                  numeric
    taxRate               numeric
    hsnSacCode            varchar(20)
    shipperGstin          varchar(20)
    carrierGstin          varchar(20)
    ewayBillNumber        varchar(50)
    ewayBillValidUntil    timestamp
    status                varchar(30) DEFAULT 'draft'
    sentAt                timestamp
    acknowledgedAt        timestamp
    paidAt                timestamp
    memoAmount            numeric
    memoNotes             text
    createdAt             timestamp DEFAULT now()
    updatedAt             timestamp DEFAULT now()

  TABLE: trucks
    id                    serial PRIMARY KEY
    carrierId             integer REFERENCES users(id)
    registrationNumber    varchar(50)
    truckType             varchar(100)
    manufacturer          varchar(100)
    model                 varchar(100)
    capacity              numeric
    permitType            varchar(50)
    permitExpiry          timestamp
    insuranceExpiry       timestamp
    fitnessExpiry         timestamp
    pucExpiry             timestamp
    rcDocumentUrl         text
    isActive              boolean DEFAULT true
    createdAt             timestamp DEFAULT now()
    updatedAt             timestamp DEFAULT now()

  TABLE: drivers
    id                    serial PRIMARY KEY
    carrierId             integer REFERENCES users(id)
    fullName              varchar(255) NOT NULL
    phone                 varchar(20) NOT NULL
    licenseNumber         varchar(50) NOT NULL
    licenseExpiry         timestamp NOT NULL
    licenseImageUrl       text
    aadhaarNumber         varchar(20)
    aadhaarImageUrl       text
    isActive              boolean DEFAULT true
    createdAt             timestamp DEFAULT now()
    updatedAt             timestamp DEFAULT now()

  6.2 Onboarding & Verification Tables
  -------------------------------------------------------

  TABLE: onboarding_requests
    id                    serial PRIMARY KEY
    userId                integer REFERENCES users(id)
    type                  varchar(20) (shipper/carrier)
    status                varchar(20) DEFAULT 'draft'
    formData              jsonb
    reviewerId            integer REFERENCES users(id)
    reviewNotes           text
    reviewedAt            timestamp
    submittedAt           timestamp
    createdAt             timestamp DEFAULT now()
    updatedAt             timestamp DEFAULT now()

  TABLE: verification_documents
    id                    serial PRIMARY KEY
    userId                integer REFERENCES users(id)
    documentType          varchar(50)
    documentUrl           text
    status                varchar(20) DEFAULT 'pending'
    verifiedBy            integer REFERENCES users(id)
    verifiedAt            timestamp
    expiryDate            timestamp
    createdAt             timestamp DEFAULT now()

  6.3 Financial Tables
  -------------------------------------------------------

  TABLE: finance_reviews
    id                    serial PRIMARY KEY
    shipmentId            integer REFERENCES shipments(id)
    reviewerId            integer REFERENCES users(id)
    status                varchar(20) DEFAULT 'pending'
    comment               text
    paymentStatus         varchar(20) DEFAULT 'not_released'
    reviewedAt            timestamp
    createdAt             timestamp DEFAULT now()
    updatedAt             timestamp DEFAULT now()

  TABLE: settlements
    id                    serial PRIMARY KEY
    shipmentId            integer REFERENCES shipments(id)
    carrierId             integer REFERENCES users(id)
    amount                numeric
    tdsDeduction          numeric
    haltingCharges        numeric
    podPenalty            numeric
    netAmount             numeric
    status                varchar(20) DEFAULT 'pending'
    paidAt                timestamp
    createdAt             timestamp DEFAULT now()
    updatedAt             timestamp DEFAULT now()

  TABLE: credit_assessments
    id                    serial PRIMARY KEY
    shipperId             integer REFERENCES users(id)
    creditScore           numeric
    recommendedLimit      numeric
    riskCategory          varchar(20)
    paymentTerms          integer
    assessedBy            integer REFERENCES users(id)
    assessmentData        jsonb
    createdAt             timestamp DEFAULT now()
    updatedAt             timestamp DEFAULT now()

  6.4 Communication & Tracking Tables
  -------------------------------------------------------

  TABLE: notifications
    id                    serial PRIMARY KEY
    userId                integer REFERENCES users(id)
    type                  varchar(50)
    title                 varchar(255)
    message               text
    isRead                boolean DEFAULT false
    metadata              jsonb
    createdAt             timestamp DEFAULT now()

  TABLE: messages
    id                    serial PRIMARY KEY
    loadId                integer REFERENCES loads(id)
    senderId              integer REFERENCES users(id)
    content               text
    createdAt             timestamp DEFAULT now()

  TABLE: shipment_documents
    id                    serial PRIMARY KEY
    shipmentId            integer REFERENCES shipments(id)
    documentType          varchar(50)
    documentUrl           text
    uploadedBy            integer REFERENCES users(id)
    createdAt             timestamp DEFAULT now()

  6.5 Audit & Logging Tables
  -------------------------------------------------------

  TABLE: audit_logs
    id                    serial PRIMARY KEY
    userId                integer REFERENCES users(id)
    action                varchar(100)
    entityType            varchar(50)
    entityId              integer
    details               jsonb
    createdAt             timestamp DEFAULT now()

  TABLE: api_logs
    id                    serial PRIMARY KEY
    method                varchar(10)
    path                  text
    statusCode            integer
    userId                integer
    loadId                integer
    duration              numeric
    requestBody           jsonb
    responseBody          jsonb
    createdAt             timestamp DEFAULT now()

  6.6 Other Tables
  -------------------------------------------------------

  TABLE: saved_addresses
    id                    serial PRIMARY KEY
    userId                integer REFERENCES users(id)
    type                  varchar(20) (pickup/dropoff)
    address               text
    locality              varchar(255)
    landmark              varchar(255)
    city                  varchar(100)
    state                 varchar(100)
    businessName          varchar(255)
    usageCount            integer DEFAULT 0
    lastUsedAt            timestamp
    createdAt             timestamp DEFAULT now()

  TABLE: otp_records
    id                    serial PRIMARY KEY
    phone                 varchar(20)
    email                 varchar(255)
    otp                   varchar(10)
    type                  varchar(30)
    isVerified            boolean DEFAULT false
    expiresAt             timestamp
    createdAt             timestamp DEFAULT now()

  TABLE: proposals
    id                    serial PRIMARY KEY
    loadId                integer REFERENCES loads(id)
    carrierId             integer REFERENCES users(id)
    adminId               integer REFERENCES users(id)
    message               text
    status                varchar(20) DEFAULT 'pending'
    createdAt             timestamp DEFAULT now()

  TABLE: pricing_templates
    id                    serial PRIMARY KEY
    name                  varchar(255)
    platformMarginPercent numeric
    carrierAdvancePercent numeric
    createdBy             integer REFERENCES users(id)
    createdAt             timestamp DEFAULT now()

  TABLE: feature_flags
    id                    serial PRIMARY KEY
    name                  varchar(100) UNIQUE
    isEnabled             boolean DEFAULT false
    updatedBy             integer REFERENCES users(id)
    updatedAt             timestamp DEFAULT now()

  TABLE: shipper_ratings
    id                    serial PRIMARY KEY
    shipperId             integer REFERENCES users(id)
    ratedBy               integer REFERENCES users(id)
    rating                numeric
    comment               text
    loadId                integer REFERENCES loads(id)
    createdAt             timestamp DEFAULT now()

  TABLE: carrier_ratings
    id                    serial PRIMARY KEY
    carrierId             integer REFERENCES users(id)
    ratedBy               integer REFERENCES users(id)
    rating                numeric
    comment               text
    loadId                integer REFERENCES loads(id)
    createdAt             timestamp DEFAULT now()

  TABLE: helpbot_conversations
    id                    serial PRIMARY KEY
    sessionId             varchar(100)
    messages              jsonb
    createdAt             timestamp DEFAULT now()
    updatedAt             timestamp DEFAULT now()

  TABLE: session (managed by connect-pg-simple)
    sid                   varchar PRIMARY KEY
    sess                  json NOT NULL
    expire                timestamp NOT NULL

  (Additional tables for invoice_responses, load_state_history,
   negotiation_threads, carrier_proposals, and other domain-specific
   entities bring the total to 45 tables.)


================================================================================
  SECTION 7: COMPLETE API ENDPOINT DIRECTORY (ALL 253 ENDPOINTS)
================================================================================

  7.1 Authentication & Session (9 endpoints)
  -------------------------------------------------------
  #    Method   Path                              Auth     Purpose
  1    POST     /api/auth/register                No       User registration (OTP verified)
  2    POST     /api/auth/login                   No       Email/password login
  3    POST     /api/auth/login-otp               No       Passwordless OTP login
  4    POST     /api/auth/logout                  Yes      Destroy session
  5    GET      /api/auth/me                      Yes      Get current user
  6    POST     /api/auth/forgot-password         No       Request password reset
  7    POST     /api/auth/reset-password          No       Complete password reset
  8    POST     /api/auth/send-registration-otp   No       Send phone OTP
  9    POST     /api/auth/send-email-otp          No       Send email OTP

  7.2 User Management (2 endpoints)
  -------------------------------------------------------
  10   GET      /api/users/:id                    Yes      Get user profile
  11   PATCH    /api/users/:id                    Yes      Update own profile

  7.3 Load Management (12 endpoints)
  -------------------------------------------------------
  12   GET      /api/loads                        Yes      List loads (role-filtered)
  13   GET      /api/loads/:id                    Yes      Get load detail
  14   POST     /api/loads                        Yes      Create load (shipper)
  15   PATCH    /api/loads/:id                    Yes      Update load
  16   DELETE   /api/loads/:id                    Yes      Delete load (draft only)
  17   POST     /api/loads/submit                 Yes      Submit load to admin queue
  18   POST     /api/loads/:id/submit-to-admin    Yes      Submit existing load
  19   POST     /api/loads/:id/accept-direct      Yes      Direct-accept fixed price
  20   GET      /api/loads/:id/recommended-carriers Admin  Recommended carriers
  21   POST     /api/loads/suggest-truck          Yes      AI truck suggestion
  22   GET      /api/loads/:id/audit-trail        Admin    Load audit history
  23   GET      /api/loads/:id/state-history      Admin    State transitions

  7.4 Bid Management (6 endpoints)
  -------------------------------------------------------
  24   GET      /api/bids                         Yes      List bids
  25   GET      /api/bids/:id                     Yes      Get bid detail
  26   POST     /api/bids                         Yes      Create bid
  27   POST     /api/bids/submit                  Yes      Submit bid on load
  28   PATCH    /api/bids/:id                     Yes      Update bid
  29   POST     /api/bids/:bidId/negotiate        Yes      Add negotiation message

  7.5 Truck Management (4 endpoints)
  -------------------------------------------------------
  30   GET      /api/trucks                       Yes      List carrier trucks
  31   POST     /api/trucks                       Yes      Add truck
  32   PATCH    /api/trucks/:id                   Yes      Update truck
  33   DELETE   /api/trucks/:id                   Yes      Remove truck

  7.6 Driver Management (4 endpoints)
  -------------------------------------------------------
  34   GET      /api/drivers                      Yes      List carrier drivers
  35   POST     /api/drivers                      Yes      Add driver
  36   PATCH    /api/drivers/:id                  Yes      Update driver
  37   DELETE   /api/drivers/:id                  Yes      Remove driver

  7.7 Shipment Management (9 endpoints)
  -------------------------------------------------------
  38   GET      /api/shipments                    Yes      List shipments
  39   GET      /api/shipments/:id                Yes      Get shipment detail
  40   GET      /api/shipments/load/:loadId       Yes      Shipment by load
  41   GET      /api/shipments/tracking           Yes      Tracking data
  42   PATCH    /api/shipments/:id                Yes      Update shipment
  43   PATCH    /api/shipments/:id/assign-driver  Yes      Assign driver
  44   PATCH    /api/shipments/:id/assign-truck   Yes      Assign truck
  45   GET      /api/shipments/:id/documents      Yes      Shipment documents
  46   POST     /api/shipments/:id/documents      Yes      Upload document

  7.8 Invoice Management (11 endpoints)
  -------------------------------------------------------
  47   GET      /api/invoices                     Yes      List invoices
  48   GET      /api/invoices/:id                 Yes      Invoice detail
  49   POST     /api/invoices                     Admin    Create invoice
  50   PATCH    /api/invoices/:id                 Admin    Update invoice
  51   POST     /api/invoices/:id/send            Admin    Send to shipper
  52   GET      /api/invoices/shipper             Shipper  Shipper invoices
  53   GET      /api/invoices/load/:loadId        Yes      Invoice by load
  54   POST     /api/invoices/:id/pdf             Admin    Generate PDF
  55   POST     /api/invoices/:id/duplicate       Admin    Duplicate invoice
  56   GET      /api/invoices/:id/history         Yes      Invoice history
  57   DELETE   /api/invoices/:id                 Admin    Delete invoice

  7.9 Notification System (3 endpoints)
  -------------------------------------------------------
  58   GET      /api/notifications                Yes      Get notifications
  59   PATCH    /api/notifications/:id/read       Yes      Mark read
  60   POST     /api/notifications/read-all       Yes      Mark all read

  7.10 Document & Message (3 endpoints)
  -------------------------------------------------------
  61   GET      /api/documents/user/:userId       Yes      User documents
  62   GET      /api/messages/load/:loadId        Yes      Load messages
  63   POST     /api/messages                     Yes      Send message

  7.11 Carrier Portal (29 endpoints)
  -------------------------------------------------------
  64   GET      /api/carrier/onboarding           Carrier  Onboarding status
  65   PATCH    /api/carrier/onboarding/draft     Carrier  Save onboarding draft
  66   POST     /api/carrier/onboarding/submit    Carrier  Submit onboarding
  67   GET      /api/carrier/verification         Carrier  Verification status
  68   POST     /api/carrier/verification/documents Carrier Upload verification docs
  69   GET      /api/carrier/loads                Carrier  Available marketplace loads
  70   GET      /api/carrier/available-loads      Carrier  Available loads (alt)
  71   GET      /api/carrier/recommended-loads    Carrier  AI-recommended loads
  72   GET      /api/carrier/bids                 Carrier  My bids
  73   POST     /api/carrier/bids/:bidId/counter  Carrier  Counter admin offer
  74   POST     /api/carrier/bids/:bidId/accept   Carrier  Accept counter-offer
  75   GET      /api/carrier/shipments            Carrier  My shipments
  76   GET      /api/carrier/trips                Carrier  Active trips
  77   GET      /api/carrier/documents            Carrier  My documents
  78   POST     /api/carrier/documents            Carrier  Upload document
  79   DELETE   /api/carrier/documents/:id        Carrier  Delete document
  80   GET      /api/carrier/documents/expiring   Carrier  Expiring docs alert
  81   GET      /api/carrier/dashboard/stats      Carrier  Dashboard statistics
  82   GET      /api/carrier/performance          Carrier  Performance metrics
  83   GET      /api/carrier/solo/truck           Carrier  Solo truck details
  84   GET      /api/carrier/solo/profile         Carrier  Solo profile
  85   PATCH    /api/carrier/solo/profile         Carrier  Update solo profile
  86   PATCH    /api/carrier/truck/:truckId       Carrier  Update truck
  87   GET      /api/carrier/earnings             Carrier  Earnings data
  88   GET      /api/carrier/proposals            Carrier  Received proposals
  89   POST     /api/carrier/proposals/:id/respond Carrier Respond to proposal
  90   GET      /api/carrier/settlements          Carrier  My settlements
  91   GET      /api/carrier/profile              Carrier  Full profile
  92   GET      /api/carrier/rating               Carrier  My rating

  7.12 Shipper Portal (17 endpoints)
  -------------------------------------------------------
  93   GET      /api/shipper/onboarding           Shipper  Onboarding status
  94   POST     /api/shipper/onboarding           Shipper  Create onboarding
  95   PUT      /api/shipper/onboarding           Shipper  Update onboarding
  96   PATCH    /api/shipper/onboarding/draft     Shipper  Save draft
  97   GET      /api/shipper/documents            Shipper  My documents
  98   GET      /api/shipper/saved-addresses/:type Shipper Saved addresses
  99   POST     /api/shipper/saved-addresses      Shipper  Save new address
  100  POST     /api/shipper/saved-addresses/:id/use Shipper Track usage
  101  POST     /api/shipper/invoices/:id/acknowledge Shipper Acknowledge invoice
  102  POST     /api/shipper/invoices/:id/negotiate Shipper Counter-offer
  103  POST     /api/shipper/invoices/:id/query   Shipper  Query charge
  104  POST     /api/shipper/invoices/:id/pay     Shipper  Mark paid
  105  POST     /api/shipper/invoices/:id/view    Shipper  Mark viewed
  106  GET      /api/shipper/profile              Shipper  Profile
  107  GET      /api/shipper/loads/delivered       Shipper  Delivered loads
  108  GET      /api/shipper/rating               Shipper  My rating
  109  GET      /api/shipper/credit-status        Shipper  Credit status

  7.13 Admin Load Management (15 endpoints)
  -------------------------------------------------------
  110  GET      /api/admin/queue                  Admin    Pricing queue
  111  GET      /api/admin/loads                  Admin    All loads
  112  GET      /api/admin/loads/:id              Admin    Load detail
  113  POST     /api/admin/loads/create           Admin    Create for shipper
  114  POST     /api/admin/loads/:id/post         Admin    Post to marketplace
  115  POST     /api/admin/loads/:loadId/reprice-repost Admin Reprice and repost
  116  POST     /api/admin/loads/:id/cancel       Admin    Cancel load
  117  POST     /api/admin/loads/:id/close        Admin    Close load
  118  PATCH    /api/admin/loads/:id/status       Admin    Update status
  119  GET      /api/admin/live-tracking          Admin    Live tracking
  120  GET      /api/admin/shippers/verified      Admin    Verified shippers
  121  GET      /api/admin/saved-addresses/:shipperId/:type Admin Shipper addresses
  122  POST     /api/admin/saved-addresses        Admin    Save address
  123  POST     /api/admin/loads/:id/accept-bid   Admin    Accept bid
  124  POST     /api/admin/loads/:id/reject-bid   Admin    Reject bid

  7.14 Admin Pricing (11 endpoints)
  -------------------------------------------------------
  125  POST     /api/admin/pricing/suggest        Admin    AI price suggestion
  126  POST     /api/admin/pricing/save           Admin    Save pricing draft
  127  POST     /api/admin/pricing/lock           Admin    Lock pricing
  128  GET      /api/admin/pricing/:loadId        Admin    Pricing for load
  129  GET      /api/admin/pricing/templates      Admin    List templates
  130  POST     /api/admin/pricing/templates      Admin    Create template
  131  PATCH    /api/admin/pricing/templates/:id  Admin    Update template
  132  DELETE   /api/admin/pricing/templates/:id  Admin    Delete template
  133  POST     /api/admin/pricing/calculate      Admin    Calculate breakdown
  134  POST     /api/admin/invoice/generate-and-send Admin Generate + send
  135  GET      /api/admin/pricing/history/:loadId Admin   Pricing history

  7.15 Admin Invoice Management (12 endpoints)
  -------------------------------------------------------
  136  GET      /api/admin/invoices               Admin    List invoices
  137  GET      /api/admin/invoices/:id           Admin    Invoice detail
  138  POST     /api/admin/invoices               Admin    Create invoice
  139  PATCH    /api/admin/invoices/:id           Admin    Update invoice
  140  POST     /api/admin/invoices/:id/send      Admin    Send to shipper
  141  POST     /api/admin/invoices/:id/remind    Admin    Send reminder
  142  GET      /api/admin/invoices/:id/responses Admin    Shipper responses
  143  POST     /api/admin/invoices/:id/respond   Admin    Respond to query
  144  PATCH    /api/admin/invoices/:id/memo      Admin    Update memo/amount
  145  POST     /api/admin/invoices/:id/finalize  Admin    Finalize invoice
  146  GET      /api/admin/invoices/pending       Admin    Pending invoices
  147  GET      /api/admin/invoices/:id/audit     Admin    Invoice audit trail

  7.16 Admin Negotiations (7 endpoints)
  -------------------------------------------------------
  148  GET      /api/admin/negotiations           Admin    All negotiations
  149  GET      /api/admin/negotiations/:loadId   Admin    Negotiation for load
  150  POST     /api/admin/negotiations/:loadId/counter Admin Counter bid
  151  POST     /api/admin/negotiations/:loadId/accept Admin Accept bid
  152  POST     /api/admin/negotiations/:loadId/reject Admin Reject bid
  153  POST     /api/admin/negotiations/:loadId/simulate Admin Simulate pricing
  154  GET      /api/admin/negotiations/counters  Admin    Pending counters

  7.17 Admin Carrier Management (6 endpoints)
  -------------------------------------------------------
  155  GET      /api/admin/carriers               Admin    List carriers
  156  GET      /api/admin/carriers/:id           Admin    Carrier detail
  157  PATCH    /api/admin/carriers/:id/verify    Admin    Verify carrier
  158  PATCH    /api/admin/carriers/:id/type      Admin    Set carrier type
  159  PATCH    /api/admin/carriers/backfill-types Admin   Backfill types
  160  GET      /api/admin/carriers/:id/performance Admin  Performance

  7.18 Admin User Management (5 endpoints)
  -------------------------------------------------------
  161  GET      /api/admin/users                  Admin    List users
  162  POST     /api/admin/users                  Admin    Create user
  163  PATCH    /api/admin/users/:id              Admin    Update user
  164  DELETE   /api/admin/users/:id              Admin    Delete user
  165  GET      /api/admin/users/:id/activity     Admin    Activity log

  7.19 Admin Onboarding Review (4 endpoints)
  -------------------------------------------------------
  166  GET      /api/admin/onboarding-requests    Admin    List requests
  167  GET      /api/admin/onboarding-requests/:id Admin   Request detail
  168  POST     /api/admin/onboarding-requests/:id/review Admin Approve/reject
  169  GET      /api/admin/onboarding-requests/stats Admin Statistics

  7.20 Admin Verification (6 endpoints)
  -------------------------------------------------------
  170  GET      /api/admin/verifications          Admin    Pending verifications
  171  POST     /api/admin/verifications/:id/approve Admin Approve
  172  POST     /api/admin/verifications/:id/reject Admin  Reject
  173  POST     /api/admin/verifications/:id/hold Admin    Hold
  174  PATCH    /api/admin/verification-documents/:id Admin Update doc status
  175  PATCH    /api/admin/documents/:id/verify   Admin    Verify document

  7.21 Admin Credit Assessment (6 endpoints)
  -------------------------------------------------------
  176  GET      /api/admin/credit-assessments     Admin    List assessments
  177  GET      /api/admin/credit-assessments/:shipperId Admin Shipper assessment
  178  POST     /api/admin/credit-assessments/:shipperId Admin Create assessment
  179  PATCH    /api/admin/credit-assessments/:id Admin    Update assessment
  180  POST     /api/admin/credit-assessments/bulk-auto-assess Admin Bulk assess
  181  GET      /api/admin/credit-assessments/:shipperId/history Admin History

  7.22 Admin Miscellaneous (14 endpoints)
  -------------------------------------------------------
  182  GET      /api/admin/analytics/realtime     Admin    Real-time analytics
  183  POST     /api/admin/seed-carriers          Admin    Seed test carriers
  184  POST     /api/admin/seed-pending-verifications Admin Seed verifications
  185  GET      /api/admin/feature-flags          Admin    Feature flags
  186  POST     /api/admin/feature-flags/:name/toggle Admin Toggle flag
  187  GET      /api/admin/proposals/load/:loadId Admin    Proposals for load
  188  POST     /api/admin/proposals/send         Admin    Send proposal
  189  POST     /api/admin/settlements            Admin    Create settlement
  190  POST     /api/admin/settlements/:id/pay    Admin    Mark paid
  191  GET      /api/admin/settlements            Admin    List settlements
  192  GET      /api/admin/api-logs               Admin    API logs
  193  GET      /api/admin/api-logs/:loadId       Admin    Logs for load
  194  GET      /api/admin/audit-logs             Admin    Audit trail
  195  GET      /api/admin/audit-logs/:loadId     Admin    Audit for load

  7.23 Admin Troubleshoot (10 endpoints)
  -------------------------------------------------------
  196  GET      /api/admin/troubleshoot/load/:loadId Admin Debug load
  197  GET      /api/admin/troubleshoot/queue     Admin    Debug queue
  198  POST     /api/admin/troubleshoot/force-process-queue Admin Force process
  199  POST     /api/admin/troubleshoot/requeue/:loadId Admin Requeue load
  200  POST     /api/admin/troubleshoot/force-post/:loadId Admin Force post
  201  POST     /api/admin/troubleshoot/rollback-price/:loadId Admin Rollback
  202  POST     /api/admin/troubleshoot/force-invoice/:loadId Admin Force invoice
  203  POST     /api/admin/troubleshoot/force-send-invoice/:loadId Admin Force send
  204  GET      /api/admin/troubleshoot/api-log/:loadId Admin API logs
  205  GET      /api/admin/troubleshoot/full-audit/:loadId Admin Full audit

  7.24 OTP System (14 endpoints)
  -------------------------------------------------------
  206  POST     /api/otp/send                     No       Send registration OTP
  207  POST     /api/otp/verify                   No       Verify registration OTP
  208  POST     /api/otp/send-email               No       Send email OTP
  209  POST     /api/otp/verify-email             No       Verify email OTP
  210  POST     /api/otp/trip-start/request       Yes      Request trip start OTP
  211  POST     /api/otp/trip-start/verify        Yes      Verify trip start OTP
  212  POST     /api/otp/trip-end/request         Yes      Request trip end OTP
  213  POST     /api/otp/trip-end/verify          Yes      Verify trip end OTP
  214  POST     /api/otp/route-start/request      Yes      Route start OTP
  215  POST     /api/otp/route-start/verify       Yes      Verify route start
  216  GET      /api/otp/pending                  Yes      Pending OTPs
  217  POST     /api/otp/approve/:otpId           Yes      Approve OTP
  218  POST     /api/otp/login/send               No       Send login OTP
  219  POST     /api/otp/login/verify             No       Verify login OTP

  7.25 Telemetry System (8 endpoints)
  -------------------------------------------------------
  220  GET      /api/telemetry/vehicles           Yes      Active vehicles
  221  GET      /api/telemetry/vehicles/:vehicleId Yes     Vehicle detail
  222  GET      /api/telemetry/eta/:loadId        Yes      AI ETA prediction
  223  GET      /api/telemetry/driver-behavior/:driverId Yes Driver behavior
  224  GET      /api/telemetry/alerts             Yes      Telematics alerts
  225  GET      /api/telemetry/alerts/:vehicleId  Yes      Vehicle alerts
  226  GET      /api/telemetry/breadcrumbs/:vehicleId Yes  GPS trail
  227  POST     /api/telemetry/simulate           Admin    Trigger simulation

  7.26 Ratings System (8 endpoints)
  -------------------------------------------------------
  228  POST     /api/shipper-ratings              Yes      Rate shipper
  229  POST     /api/carrier-ratings              Yes      Rate carrier
  230  GET      /api/shipper-ratings/:shipperId   Yes      Shipper ratings
  231  GET      /api/carrier-ratings/:carrierId   Yes      Carrier ratings
  232  GET      /api/ratings/shipper/:shipperId   Yes      Shipper avg
  233  GET      /api/ratings/carrier/:carrierId   Yes      Carrier avg
  234  POST     /api/ratings                      Yes      Generic rating
  235  GET      /api/ratings/user/:userId         Yes      User ratings

  7.27 Settlements (4 endpoints)
  -------------------------------------------------------
  236  GET      /api/settlements                  Yes      List settlements
  237  GET      /api/settlements/:id              Yes      Settlement detail
  238  POST     /api/settlements                  Admin    Create settlement
  239  PATCH    /api/settlements/:id              Admin    Update settlement

  7.28 Finance Portal (5 endpoints)
  -------------------------------------------------------
  240  GET      /api/finance/shipments            Finance  Shipments for review
  241  POST     /api/finance/reviews              Finance  Create/update review
  242  PATCH    /api/finance/reviews/:id/payment  Finance  Update payment status
  243  GET      /api/finance/reviews/all          Finance  All reviews
  244  GET      /api/finance/reviews/:shipmentId  Finance  Review for shipment

  7.29 Public / Misc (3 endpoints)
  -------------------------------------------------------
  245  POST     /api/contact                      No       Contact form
  246  GET      /api/health                       No       Health check
  247  GET      /api/config                       No       Public config

  7.30 WebSocket Channels (2 endpoints)
  -------------------------------------------------------
  248  WSS      /ws/marketplace                            Marketplace events
  249  WSS      /ws/telemetry                              Vehicle telematics

  7.31 Help Bot (4 endpoints)
  -------------------------------------------------------
  250  POST     /api/helpbot/chat                 No       Chat message
  251  GET      /api/helpbot/conversations        No       List conversations
  252  GET      /api/helpbot/conversations/:id    No       Get conversation
  253  GET      /api/helpbot/contact-support      No       Support info


================================================================================
  SECTION 8: FRONTEND ROUTING MAP (55+ ROUTES)
================================================================================

  8.1 Public Routes (No Auth Required)
  -------------------------------------------------------
  Path                              Component          Purpose
  /                                 Landing            Marketing page
  /auth                             Auth               Login / Register
  /about                            About              About LoadSmart
  /contact                          Contact            Contact form
  /faqs                             FAQs               FAQ page
  /press-room                       PressRoom          Press / media
  /solutions/for-shippers           ForShippers        Shipper marketing
  /solutions/for-carriers           ForCarriers        Carrier marketing
  /solutions/for-drivers            ForDrivers         Driver marketing

  8.2 Admin Routes
  -------------------------------------------------------
  /admin                            Overview           Dashboard
  /admin/queue                      LoadQueue          Pricing queue
  /admin/loads                      Loads              Load management
  /admin/loads/:id                  LoadDetails        Load detail
  /admin/users                      Users              User management
  /admin/carriers                   Carriers           Carrier management
  /admin/carriers/:id               CarrierProfile     Carrier detail
  /admin/onboarding                 Onboarding         Onboarding review
  /admin/invoices                   Invoices           Invoice management
  /admin/negotiations               Negotiations       All negotiations
  /admin/inbox                      NegotiationInbox   Negotiation inbox
  /admin/verification               CarrierVerification Verification queue
  /admin/live-tracking              LiveTracking       Live tracking
  /admin/post-load                  PostLoad           Post load for shipper
  /admin/nearby-trucks              NearbyTrucks       Nearby trucks map
  /admin/otp-queue                  OtpQueue           OTP management
  /admin/revenue                    RevenueDashboard   Revenue analytics
  /admin/volume                     VolumeAnalytics    Volume analytics
  /admin/finance-review             FinanceDashboard   Finance portal

  8.3 Shipper Routes
  -------------------------------------------------------
  /shipper                          Dashboard          Dashboard
  /shipper/onboarding               Onboarding         Onboarding form
  /shipper/post-load                PostLoad           Post new load
  /shipper/loads                    Loads              Load list
  /shipper/loads/:id                LoadDetail         Load detail
  /shipper/tracking                 Tracking           Shipment tracking
  /shipper/invoices                 Invoices           Invoice management
  /shipper/documents                Documents          Documents
  /shipper/delivered-loads          DeliveredLoads     Delivered history
  /shipper/otp-queue                OtpQueue           OTP approvals
  /shipper/settings                 Settings           User settings

  8.4 Carrier Routes
  -------------------------------------------------------
  /carrier                          Dashboard          Dashboard
  /carrier/onboarding               Onboarding         Onboarding form
  /carrier/loads                    Loads              Marketplace
  /carrier/bids                     Bids               Bid management
  /carrier/fleet                    Fleet              Fleet management
  /carrier/drivers                  Drivers            Driver management
  /carrier/add-truck                AddTruck           Add truck
  /carrier/shipments                Shipments          Shipments
  /carrier/trips                    Trips              Active trips
  /carrier/documents                Documents          Documents
  /carrier/my-truck                 MyTruck            Solo truck view
  /carrier/my-info                  MyInfo             Solo profile
  /carrier/my-documents             MyDocuments        Solo documents
  /carrier/history                  History            Trip history
  /carrier/revenue                  Revenue            Earnings

  8.5 Solo Carrier Routes
  -------------------------------------------------------
  /solo/loads                       LoadFeed           Solo marketplace
  /solo/bids                        MyBids             Solo bids
  /solo/trips                       MyTrips            Solo trips
  /solo/earnings                    Earnings           Solo earnings

  8.6 Finance Routes
  -------------------------------------------------------
  /finance/review                   FinanceDashboard   Finance review

  8.7 Utility Routes
  -------------------------------------------------------
  /in-transit                       InTransit          Telematics
  /settings                         Settings           User settings
  *                                 NotFound           404 page


================================================================================
  SECTION 9: COMPLETE FEATURE INVENTORY
================================================================================

  9.1 ADMIN PORTAL FEATURES
  -------------------------------------------------------

  Feature: Admin Dashboard
  Purpose: Central overview of platform activity
  Entry Point: /admin
  Actor: Admin
  Data Created: None (read-only)
  APIs: /api/admin/analytics/realtime
  Tables: loads, shipments, invoices, users
  Revenue Impact: Operational visibility

  Feature: Load Pricing Queue
  Purpose: Review and price shipper-submitted loads
  Entry Point: /admin/queue
  Actor: Admin
  Trigger: Shipper submits load (status -> pending)
  Workflow: View load -> Set gross price -> Set margin -> Set carrier
            advance -> Set rate type -> Lock pricing -> Post to marketplace
  Data Created: Pricing fields on load record
  Validations: adminGrossPrice required, margin 0-100%
  APIs: /api/admin/queue, /api/admin/pricing/*
  Tables: loads, audit_logs
  Revenue Impact: Direct - sets platform margin per load

  Feature: Admin Post Load (For Shipper)
  Purpose: Create loads on behalf of offline shippers
  Entry Point: /admin/post-load
  Actor: Admin
  Trigger: Manual admin action
  Workflow: Enter shipper details OR select existing shipper -> Fill load
            form -> Optionally set pricing -> Submit
  Data Created: Load record, optionally new shipper user + onboarding record
  Validations: insertLoadSchema with Zod
  APIs: /api/admin/loads/create, /api/admin/shippers/verified
  Tables: loads, users, onboarding_requests
  Revenue Impact: Expands load volume

  Feature: Reprice & Repost
  Purpose: Change pricing on active marketplace loads
  Entry Point: /admin/loads/:id
  Actor: Admin
  Trigger: Admin decides to adjust pricing
  Workflow: Open load -> Enter new pricing -> Confirm -> All pending bids
            auto-rejected -> Load reposted with new price
  Data Created: Updated pricing fields, rejected bid records
  Validations: Load must be in posted_to_carriers, open_for_bid,
               counter_received, or priced status
  APIs: /api/admin/loads/:loadId/reprice-repost
  Tables: loads, bids, audit_logs
  Revenue Impact: Margin optimization

  Feature: Bid Management & Negotiation
  Purpose: Accept, reject, or counter carrier bids
  Entry Point: /admin/negotiations, /admin/loads/:id
  Actor: Admin
  Trigger: Carrier submits bid
  Workflow: View bids -> Accept (creates shipment) OR Reject OR Counter
            (sends counter-offer to carrier)
  Data Created: Bid status updates, shipment records, notifications
  APIs: /api/admin/negotiations/*, /api/admin/loads/:id/accept-bid
  Tables: bids, shipments, loads, notifications
  Revenue Impact: Determines final carrier payout

  Feature: Invoice Management
  Purpose: Generate, send, and track invoices to shippers
  Entry Point: /admin/invoices
  Actor: Admin
  Trigger: Bid accepted / load awarded
  Workflow: Generate invoice -> Review -> Send to shipper -> Track
            acknowledgment -> Track payment -> Finalize
  Data Created: Invoice records, email notifications
  APIs: /api/admin/invoices/*, /api/admin/invoice/generate-and-send
  Tables: invoices, loads, notifications
  Revenue Impact: Direct - triggers shipper payment

  Feature: User Management
  Purpose: Create, edit, delete platform users
  Entry Point: /admin/users
  Actor: Admin
  APIs: /api/admin/users/*
  Tables: users

  Feature: Onboarding Review
  Purpose: Approve/reject shipper and carrier registrations
  Entry Point: /admin/onboarding
  Actor: Admin
  Trigger: User submits onboarding form
  Workflow: View submission -> Review documents -> Approve/Reject/Hold
  Data Created: Onboarding status update, user verification flag
  APIs: /api/admin/onboarding-requests/*
  Tables: onboarding_requests, users

  Feature: Carrier Verification
  Purpose: Verify carrier documents and identity
  Entry Point: /admin/verification
  Actor: Admin
  APIs: /api/admin/verifications/*
  Tables: verification_documents, users

  Feature: Live Tracking Dashboard
  Purpose: Monitor active shipments in real-time
  Entry Point: /admin/live-tracking
  Actor: Admin
  APIs: /api/admin/live-tracking, /ws/telemetry
  Tables: shipments, loads, trucks

  Feature: OTP Queue Management
  Purpose: View and manage OTP requests
  Entry Point: /admin/otp-queue
  Actor: Admin
  APIs: /api/otp/pending, /api/otp/approve/:otpId
  Tables: otp_records

  Feature: Revenue Analytics
  Purpose: Platform revenue reporting and analysis
  Entry Point: /admin/revenue
  Actor: Admin
  APIs: /api/admin/analytics/realtime
  Tables: loads, invoices, settlements

  Feature: Volume Analytics
  Purpose: Load volume and trend analysis
  Entry Point: /admin/volume
  Actor: Admin
  APIs: /api/admin/analytics/realtime
  Tables: loads

  Feature: Credit Assessment
  Purpose: Assess shipper creditworthiness
  Entry Point: Admin carrier/shipper detail pages
  Actor: Admin
  APIs: /api/admin/credit-assessments/*
  Tables: credit_assessments

  Feature: Feature Flags
  Purpose: Toggle platform features on/off
  Entry Point: Admin settings
  Actor: Admin
  APIs: /api/admin/feature-flags/*
  Tables: feature_flags

  Feature: Admin Troubleshooting
  Purpose: Debug load states, force transitions, view audit trails
  Entry Point: Admin load detail pages
  Actor: Admin
  APIs: /api/admin/troubleshoot/*
  Tables: loads, bids, invoices, shipments, audit_logs, api_logs

  9.2 SHIPPER PORTAL FEATURES
  -------------------------------------------------------

  Feature: Shipper Onboarding
  Purpose: Business verification for new shippers
  Entry Point: /shipper/onboarding
  Actor: Shipper
  Trigger: New shipper registration
  Workflow: Fill business details -> Upload documents -> Submit for review
            -> Admin reviews -> Approve/Reject
  Data Created: Onboarding request, verification documents
  Validations: Required fields vary by role (Shipper vs Transporter)
  APIs: /api/shipper/onboarding/*
  Tables: onboarding_requests, verification_documents, users

  Feature: Post Load
  Purpose: Create freight load requests
  Entry Point: /shipper/post-load
  Actor: Verified Shipper
  Trigger: Shipper needs freight transportation
  Workflow: Fill pickup details -> Fill dropoff details -> Enter cargo info
            -> Set schedule -> Submit (status: pending) -> Goes to admin queue
  Data Created: Load record (draft/pending)
  Validations: Shipper must be verified (isVerified=true)
  APIs: /api/loads, /api/loads/submit
  Tables: loads

  Feature: Load Tracking
  Purpose: Track active shipments
  Entry Point: /shipper/tracking
  Actor: Shipper
  APIs: /api/shipments/tracking
  Tables: shipments, loads

  Feature: Invoice Management (Shipper Side)
  Purpose: View, acknowledge, query, and pay invoices
  Entry Point: /shipper/invoices
  Actor: Shipper
  Workflow: Receive invoice -> View -> Acknowledge OR Query charge OR
            Negotiate -> Make payment
  APIs: /api/shipper/invoices/*
  Tables: invoices

  Feature: Edit Load
  Purpose: Modify load details after submission
  Entry Point: /shipper/loads/:id
  Actor: Shipper
  Validations: Cannot edit cancelled/delivered/closed/in_transit loads
  APIs: /api/loads/:id (PATCH)
  Tables: loads

  Feature: OTP Approvals
  Purpose: Approve trip start/end OTP requests
  Entry Point: /shipper/otp-queue
  Actor: Shipper
  APIs: /api/otp/pending, /api/otp/approve/:otpId
  Tables: otp_records

  Feature: Saved Addresses
  Purpose: Save frequently used pickup/dropoff addresses
  APIs: /api/shipper/saved-addresses/*
  Tables: saved_addresses

  Feature: Delivered Loads History
  Purpose: View completed deliveries with ratings
  Entry Point: /shipper/delivered-loads
  Actor: Shipper
  APIs: /api/shipper/loads/delivered
  Tables: loads, shipments

  9.3 CARRIER PORTAL FEATURES
  -------------------------------------------------------

  Feature: Carrier Onboarding
  Purpose: Identity and vehicle verification
  Entry Point: /carrier/onboarding
  Actor: New Carrier
  Workflow: Select type (Solo/Fleet) -> Fill identity details -> Upload
            documents -> Submit -> Admin reviews
  APIs: /api/carrier/onboarding/*
  Tables: onboarding_requests, verification_documents

  Feature: Marketplace (Load Browsing & Bidding)
  Purpose: Browse available loads and place bids
  Entry Point: /carrier/loads
  Actor: Verified Carrier
  Trigger: Admin posts load to marketplace
  Workflow: Browse loads -> View detail -> Place bid (with truck selection
            for fleet) -> OR Direct accept (fixed price)
  Data Created: Bid records
  Validations: Carrier must be verified, documents not expired
  APIs: /api/carrier/loads, /api/bids/submit
  Tables: loads, bids, trucks

  Feature: Recommended Loads
  Purpose: AI-powered load suggestions based on carrier profile
  Entry Point: /carrier/loads (highlighted section)
  Actor: Verified Carrier
  APIs: /api/carrier/recommended-loads
  Tables: loads, trucks, shipments

  Feature: Bid Management
  Purpose: Track and manage submitted bids
  Entry Point: /carrier/bids
  Actor: Carrier
  APIs: /api/carrier/bids
  Tables: bids

  Feature: Fleet Management
  Purpose: Manage trucks in carrier fleet
  Entry Point: /carrier/fleet
  Actor: Fleet Carrier
  APIs: /api/trucks/*
  Tables: trucks

  Feature: Driver Management
  Purpose: Manage drivers
  Entry Point: /carrier/drivers
  Actor: Fleet Carrier
  APIs: /api/drivers/*
  Tables: drivers

  Feature: Active Trips
  Purpose: Track ongoing shipments
  Entry Point: /carrier/trips
  Actor: Carrier
  APIs: /api/carrier/trips
  Tables: shipments, loads

  Feature: Document Management
  Purpose: Upload and manage carrier documents
  Entry Point: /carrier/documents
  Actor: Carrier
  APIs: /api/carrier/documents/*
  Tables: verification_documents

  Feature: Earnings
  Purpose: View earnings and settlement history
  Entry Point: /carrier/revenue
  Actor: Carrier
  APIs: /api/carrier/earnings, /api/carrier/settlements
  Tables: settlements, shipments

  9.4 SOLO CARRIER PORTAL FEATURES
  -------------------------------------------------------

  Feature: Solo Carrier Dashboard
  Purpose: Simplified portal for owner-operators
  Entry Point: /carrier/my-truck, /carrier/my-info, /carrier/my-documents
  Actor: Solo Carrier
  Special: Simplified navigation, single truck view, compliance indicator
  APIs: /api/carrier/solo/*
  Tables: users, trucks, verification_documents

  9.5 FINANCE PORTAL FEATURES
  -------------------------------------------------------

  Feature: Finance Review Dashboard
  Purpose: Review shipment documents and manage payment releases
  Entry Point: /finance/review
  Actor: Finance role
  Workflow: View shipment list -> Review documents -> Approve/Hold/Reject
            -> Update payment status (Not Released / Processing / Released)
  APIs: /api/finance/*
  Tables: finance_reviews, shipments

  9.6 CROSS-PORTAL FEATURES
  -------------------------------------------------------

  Feature: AI Concierge (Help Bot)
  Purpose: AI-powered chat assistant for all users
  Entry Point: Floating widget (all pages)
  Actor: Any user
  APIs: /api/helpbot/*
  Tables: helpbot_conversations

  Feature: Real-time Notifications
  Purpose: Instant updates for marketplace events
  Actor: All authenticated users
  APIs: /api/notifications/*, /ws/marketplace
  Tables: notifications

  Feature: Vehicle Telematics
  Purpose: GPS tracking, diagnostics, driver behavior
  Entry Point: /in-transit
  Actor: Shippers (primary), Admins
  APIs: /api/telemetry/*, /ws/telemetry
  Tables: shipments, trucks

  Feature: Rating System
  Purpose: Bidirectional shipper/carrier ratings
  Actor: Shippers, Carriers
  APIs: /api/shipper-ratings/*, /api/carrier-ratings/*
  Tables: shipper_ratings, carrier_ratings

  Feature: Contact Form
  Purpose: Public inquiry submission
  Entry Point: /contact
  Actor: Public
  APIs: /api/contact
  Tables: None (email only)


================================================================================
  SECTION 10: CORE WORKFLOW ENGINE MAPPING
================================================================================

  10.1 WORKFLOW: Load Posting (Shipper)
  -------------------------------------------------------
  Portal:     Shipper Portal
  Actor:      Verified Shipper
  Trigger:    Shipper clicks "Post Load"

  Step 1: Fill Load Form
    User Action:         Enter pickup, dropoff, cargo, schedule
    System Enforcement:  isVerified check, required field validation
    Data Created:        Load record (status: draft)

  Step 2: Submit to Admin
    User Action:         Click Submit
    System Enforcement:  Validates all required fields
    Data Created:        Load status -> pending
    Data Locked:         Load enters admin queue

  Unlocks:              Admin pricing workflow
  System Value:         Load capture, shipper engagement

  10.2 WORKFLOW: Admin Pricing & Posting
  -------------------------------------------------------
  Portal:     Admin Portal
  Actor:      Admin
  Trigger:    Load appears in pricing queue (status: pending)

  Step 1: Review Load
    User Action:         Open load from queue
    System Enforcement:  Only pending loads appear
    Data Created:        None

  Step 2: Set Pricing
    User Action:         Enter gross price, margin%, carrier advance%
    System Enforcement:  Calculator computes all derived fields
    Data Created:        Pricing fields on load record
    Data Locked:         Price breakdown locked

  Step 3: Post to Marketplace
    User Action:         Click Post (fixed/negotiable)
    System Enforcement:  All pricing fields required
    Data Created:        Load status -> posted_to_carriers, postedAt timestamp
    WebSocket:           load:new event broadcast

  Unlocks:              Carrier bidding
  System Value:         Revenue enabled (margin set), marketplace activated

  10.3 WORKFLOW: Carrier Bidding
  -------------------------------------------------------
  Portal:     Carrier Portal
  Actor:      Verified Carrier
  Trigger:    Load posted to marketplace (WebSocket notification)

  Step 1: Browse Loads
    User Action:         View marketplace listings
    System Enforcement:  Only posted/open loads visible, verified carrier only
    Data Created:        None

  Step 2a: Direct Accept (Fixed Price)
    User Action:         Click Accept on fixed-price load
    System Enforcement:  Truck/driver availability check (fleet)
    Data Created:        Bid (accepted), Shipment record
    Data Locked:         Load awarded, all other bids rejected

  Step 2b: Place Bid (Negotiable)
    User Action:         Enter bid amount, select truck
    System Enforcement:  Truck not already assigned to active load
    Data Created:        Bid record (status: pending)

  Step 3: Negotiation (if counter-offered)
    User Action:         Accept or counter admin's offer
    System Enforcement:  Bid amount validation
    Data Created:        Negotiation history entries

  Unlocks:              Admin bid acceptance workflow
  System Value:         Competitive pricing, carrier engagement

  10.4 WORKFLOW: Bid Acceptance
  -------------------------------------------------------
  Portal:     Admin Portal
  Actor:      Admin
  Trigger:    Carrier bid received

  Step 1: Review Bids
    User Action:         View all bids on load
    System Enforcement:  Recommended carriers displayed
    Data Created:        None

  Step 2: Accept Bid
    User Action:         Click Accept on chosen bid
    System Enforcement:  Idempotency check, truck/driver availability recheck
    Data Created:        Bid status -> accepted, all others -> rejected,
                         Shipment record created, Load status -> awarded
    WebSocket:           bid:accepted, load:status_changed events

  Unlocks:              Invoice creation, trip start
  System Value:         Revenue locked, carrier assignment confirmed

  10.5 WORKFLOW: Invoice Lifecycle
  -------------------------------------------------------
  Portal:     Admin Portal -> Shipper Portal
  Actor:      Admin (create/send), Shipper (acknowledge/pay)
  Trigger:    Bid accepted

  Step 1: Generate Invoice
    Data Created:        Invoice record with pricing breakdown
    Data Locked:         Invoice number assigned

  Step 2: Send to Shipper
    User Action:         Admin clicks Send
    Data Created:        Email sent, status -> sent
    WebSocket:           invoice:sent event

  Step 3: Shipper Acknowledges
    User Action:         Shipper views and acknowledges
    Data Created:        Status -> acknowledged

  Step 4: Payment
    User Action:         Shipper confirms payment
    Data Created:        Status -> paid, paidAt timestamp

  System Value:         Revenue collection, financial audit trail

  10.6 WORKFLOW: Trip Lifecycle (OTP-Verified)
  -------------------------------------------------------
  Portal:     Carrier + Shipper Portals
  Actor:      Carrier (requests OTP), Shipper (approves OTP)
  Trigger:    Invoice paid, carrier ready

  Step 1: Request Trip Start OTP
    User Action:         Carrier requests OTP at pickup point
    System Enforcement:  Load must be in correct status
    Data Created:        OTP record sent to shipper

  Step 2: Shipper Approves Start OTP
    User Action:         Shipper approves OTP
    Data Created:        Load status -> in_transit, shipment started

  Step 3: Request Trip End OTP
    User Action:         Carrier requests at delivery point
    Data Created:        OTP record sent to shipper

  Step 4: Shipper Approves End OTP
    User Action:         Shipper confirms delivery
    Data Created:        Load status -> delivered, deliveredAt timestamp

  System Value:         Verified pickup/delivery, dispute prevention

  10.7 WORKFLOW: Onboarding (Shipper/Carrier)
  -------------------------------------------------------
  Portal:     Shipper/Carrier Portal -> Admin Portal
  Actor:      New User -> Admin
  Trigger:    User registration

  Step 1: Fill Onboarding Form
    Data Created:        Onboarding request (draft/pending)

  Step 2: Upload Documents
    Data Created:        Document records in Object Storage

  Step 3: Submit for Review
    Data Created:        Status -> pending, submittedAt

  Step 4: Admin Review
    User Action:         Admin approves/rejects/holds
    Data Created:        Status update, user isVerified flag

  System Value:         Quality control, compliance enforcement


================================================================================
  SECTION 11: LOAD LIFECYCLE STATE MACHINE
================================================================================

  Complete State Transition Diagram:

  draft -> pending -> priced -> posted_to_carriers -> open_for_bid ->
  counter_received -> awarded -> invoice_created -> invoice_sent ->
  invoice_acknowledged -> invoice_paid -> in_transit -> delivered -> closed

  State Details:

  STATE: draft
    Description:        Shipper has started but not submitted load
    Actor:              Shipper
    Transitions:        draft -> pending (submit)
    Editable:           Yes

  STATE: pending
    Description:        Submitted to admin pricing queue
    Actor:              Admin
    Transitions:        pending -> priced (admin prices)
    Editable:           Yes

  STATE: priced
    Description:        Admin has set pricing, not yet posted
    Actor:              Admin
    Transitions:        priced -> posted_to_carriers (admin posts)
    Editable:           Yes (repriceable)

  STATE: posted_to_carriers
    Description:        Visible in carrier marketplace
    Actor:              Carriers
    Transitions:        posted_to_carriers -> open_for_bid (bid received)
                        posted_to_carriers -> awarded (direct accept)
    Editable:           Yes (repriceable)

  STATE: open_for_bid
    Description:        Active bidding in progress
    Actor:              Admin, Carriers
    Transitions:        open_for_bid -> counter_received (counter-offer)
                        open_for_bid -> awarded (bid accepted)
    Editable:           Yes (repriceable, rejects all bids)

  STATE: counter_received
    Description:        In negotiation between admin and carrier
    Actor:              Admin, Carrier
    Transitions:        counter_received -> awarded (accept)
                        counter_received -> open_for_bid (reject counter)
    Editable:           Yes (repriceable, rejects all bids)

  STATE: awarded
    Description:        Carrier assigned, shipment created
    Actor:              System
    Transitions:        awarded -> invoice_created (invoice generated)
    Editable:           No

  STATE: invoice_created
    Description:        Invoice generated for shipper
    Transitions:        invoice_created -> invoice_sent
    Editable:           No

  STATE: invoice_sent
    Description:        Invoice emailed to shipper
    Transitions:        invoice_sent -> invoice_acknowledged
    Editable:           No

  STATE: invoice_acknowledged
    Description:        Shipper has viewed/acknowledged invoice
    Transitions:        invoice_acknowledged -> invoice_paid
    Editable:           No

  STATE: invoice_paid
    Description:        Payment confirmed
    Transitions:        invoice_paid -> in_transit
    Editable:           No

  STATE: in_transit
    Description:        Truck is moving, GPS tracking active
    Transitions:        in_transit -> delivered
    Editable:           No

  STATE: delivered
    Description:        Goods received, delivery confirmed via OTP
    Transitions:        delivered -> closed
    Editable:           No

  STATE: closed
    Description:        Final state, load complete
    Transitions:        None (terminal)
    Editable:           No

  SIDE STATES (any active state):
    cancelled           Admin cancels load at any point
    unavailable         Load taken offline temporarily


================================================================================
  SECTION 12: PRICING ENGINE DETAIL
================================================================================

  12.1 Calculator Formulas
  -------------------------------------------------------

  INPUT FIELDS:
    adminGrossPrice          = Total price charged to shipper (INR)
    platformMarginPercent    = Platform's cut (%)
    carrierAdvancePercent    = Advance to carrier before delivery (%)
    advancePaymentPercent    = Advance from shipper (%)
    weight                   = Cargo weight in MT
    rateType                 = 'per_ton' | 'fixed'

  COMPUTED FIELDS:
    platformMargin           = adminGrossPrice * (platformMarginPercent / 100)
    estimatedCarrierPayout   = adminGrossPrice - platformMargin
    carrierAdvanceAmount     = estimatedCarrierPayout * (carrierAdvancePercent / 100)
    carrierBalanceOnDelivery = estimatedCarrierPayout - carrierAdvanceAmount
    shipperAdvanceAmount     = adminGrossPrice * (advancePaymentPercent / 100)
    shipperBalanceAmount     = adminGrossPrice - shipperAdvanceAmount

    If rateType = 'per_ton':
      shipperPricePerTon     = adminGrossPrice / weight

  REVENUE PER TRANSACTION:
    Platform Revenue = platformMargin (guaranteed per completed load)

  12.2 Deductions (Carrier Settlements)
  -------------------------------------------------------
  Deduction          Amount              Condition
  TDS                2% of payout        No declaration filed
  Halting Charges    Rs. 500/trip        Applied per trip
  POD Penalty        Rs. 100/day         After 15-day grace from delivery

  12.3 Bidirectional Price Sync
  -------------------------------------------------------

  Scenario A - Admin reprices load:
    loads.adminFinalPrice = newPrice
    loads.finalPrice = newPrice
    IF invoice exists:
      invoices.subtotal = newPrice
      invoices.totalAmount = recalculate(newPrice + surcharges + tax)
    PRESERVE: shipper advancePaymentPercent (never overwritten)

  Scenario B - Admin edits invoice memo amount:
    invoices.subtotal = newAmount
    invoices.totalAmount = recalculate(newAmount + surcharges + tax)
    loads.adminFinalPrice = newAmount
    loads.finalPrice = newAmount

  CRITICAL RULE: advancePaymentPercent (shipper) and carrierAdvancePercent
  are ALWAYS independent fields. Reprice operations preserve shipper's
  original advance percentage.


================================================================================
  SECTION 13: RECOMMENDATION ALGORITHM
================================================================================

  13.1 Carrier-Load Matching Score (100 points max)
  -------------------------------------------------------

  TRUCK TYPE MATCH (30 points):
    Carrier has truck matching load.requiredTruckType

  CAPACITY MATCH (25 points):
    Carrier truck capacity >= load.weight

  ROUTE EXPERIENCE (20 points):
    Carrier has completed shipments with matching pickup/dropoff cities

  COMMODITY EXPERIENCE (15 points):
    Carrier has carried similar materialType or cargoDescription

  SHIPPER EXPERIENCE (10 points):
    Carrier has previous completed shipments with same shipper

  ADMIN VIEW: Top 10 carriers sorted by score
  CARRIER VIEW: All loads with score >= 50 highlighted as "Recommended"


================================================================================
  SECTION 14: CREDIT ASSESSMENT ENGINE
================================================================================

  Scoring Weights:
    Financial Health:       35%
    Payment Behavior:       25%
    Business Stability:     20%
    Market/Industry Risk:   10%
    Documentation Quality:  10%

  Input Factors:
    annualTurnover, yearsInBusiness, businessType, gstComplianceScore,
    bankStatementScore, tradeReferences, outstandingDebt,
    paymentHistoryScore, legalDisputes, industryRiskFactor,
    collateralValue, existingCreditLimit, utilizationRate,
    daysPayableOutstanding, creditRatingAgencyScore, itrFilingStatus

  Output:
    creditScore:        0-100
    recommendedLimit:   INR amount
    riskCategory:       low / medium / high / very_high
    paymentTerms:       Recommended Net days
    requiresCollateral: boolean
    conditions:         Special conditions array


================================================================================
  SECTION 15: DUAL MARKETPLACE BIDDING SYSTEM
================================================================================

  Supports simultaneous bidding from Solo Drivers and Enterprise Carriers
  on the same loads without carrier type filtering.

  Eligible Load Statuses for Bidding:
    posted_to_carriers, open_for_bid, counter_received

  Bid Types:
    Direct Accept:      Fixed-price loads, immediate assignment
    Negotiable Bid:     Carrier proposes amount, admin counters

  Fleet Carrier Requirements:
    Must select truck at bid time
    Optionally select driver
    Both transfer to shipment upon acceptance

  Acceptance Workflow:
    Accept one bid -> All other pending bids auto-rejected
    Shipment record created
    Load status -> awarded
    Idempotency enforced (duplicate acceptance prevented)


================================================================================
  SECTION 16: FLEET CARRIER RESOURCE ASSIGNMENT RULES
================================================================================

  Rule 1: One truck per active load
    A truck cannot be assigned to multiple active shipments simultaneously

  Rule 2: One driver per active load
    A driver cannot be assigned to multiple active shipments simultaneously

  Rule 3: Resource release
    Resources become available after terminal statuses:
    delivered, closed, cancelled, completed

  Validation Point: Bid submission time
    Both shipments AND accepted bids checked to prevent race conditions


================================================================================
  SECTION 17: WEBSOCKET EVENT CATALOG
================================================================================

  17.1 Marketplace Channel (/ws/marketplace)
  -------------------------------------------------------
  Event                        Direction        Payload
  load:new                     Server->Client   Load object
  load:updated                 Server->Client   Load object
  load:status_changed          Server->Client   {loadId, oldStatus, newStatus}
  bid:new                      Server->Client   Bid object
  bid:updated                  Server->Client   Bid object
  bid:accepted                 Server->Client   {bidId, loadId}
  bid:rejected                 Server->Client   {bidId, loadId}
  bid:countered                Server->Client   {bidId, counter}
  shipment:created             Server->Client   Shipment object
  shipment:updated             Server->Client   Shipment object
  shipment:document_uploaded   Server->Client   {shipmentId, document}
  invoice:created              Server->Client   {invoiceId, loadId}
  invoice:sent                 Server->Client   {invoiceId}
  invoice:status_changed       Server->Client   {invoiceId, status}

  17.2 Telemetry Channel (/ws/telemetry)
  -------------------------------------------------------
  Event                        Direction        Payload
  telemetry:update             Server->Client   Vehicle telemetry data
  telemetry:alert              Server->Client   Alert object
  telemetry:eta_update         Server->Client   ETA prediction


================================================================================
  SECTION 18: OTP SYSTEM ARCHITECTURE
================================================================================

  OTP Types:
    registration         Phone verification during signup
    email                Email verification during signup
    login                Passwordless login
    trip_start           Pickup point verification
    trip_end             Delivery point verification
    route_start          Route start verification

  Flow:
    1. Requesting party triggers OTP send
    2. System generates 6-digit code
    3. Code sent via email (Nodemailer)
    4. OTP stored in otp_records table with expiry
    5. Approving party enters/approves code
    6. System verifies code and marks verified

  Expiry: Time-limited (configurable per type)
  Storage: otp_records table in PostgreSQL


================================================================================
  SECTION 19: EMAIL SYSTEM
================================================================================

  Transport:            SMTP (Gmail)
  Host:                 smtp.gmail.com
  Port:                 587
  Auth:                 SMTP_USER + SMTP_PASS (Replit Secrets)
  TLS:                  STARTTLS enabled
  Library:              Nodemailer 6.10.0

  Email Types Sent:
    OTP Verification:   "Your LoadSmart verification code"
    Trip Start OTP:     "Trip start OTP request"
    Trip End OTP:       "Trip end OTP request"
    Invoice Sent:       "Invoice #[number] from LoadSmart"
    Contact Form:       "New contact form submission"
    Password Reset:     "Password reset code"


================================================================================
  SECTION 20: INTERNATIONALIZATION (i18n)
================================================================================

  Framework:            i18next + react-i18next
  Detection:            i18next-browser-languagedetector
  Translation Storage:  Embedded in client/src/i18n/index.ts
  Fallback:             English

  Supported Languages:
    English (en)         Complete (default)
    Hindi (hi)           Partial
    Punjabi (pa)         Partial
    Marathi (mr)         Partial
    Tamil (ta)           Partial


================================================================================
  SECTION 21: OBJECT STORAGE STRUCTURE
================================================================================

  Provider:             Replit Object Storage
  Bucket:               repl-default-bucket-{REPL_ID}

  Directory Layout:
    public/
      documents/         Publicly accessible uploaded documents
      images/            Publicly accessible uploaded images
    .private/
      onboarding/        Onboarding documents
      verification/      Carrier verification docs
      shipment-docs/     Trip/shipment documents
      truck-docs/        Vehicle documents

  Upload Flow:
    1. Client requests presigned URL from server
    2. Server generates presigned upload URL
    3. Client uploads directly to Object Storage
    4. Client sends file metadata to server API
    5. Server creates document record in database


================================================================================
  SECTION 22: FILE STRUCTURE OVERVIEW
================================================================================

  Project Root:
    package.json              Dependencies and scripts
    tsconfig.json             TypeScript configuration
    tailwind.config.ts        Tailwind CSS configuration
    postcss.config.js         PostCSS configuration
    vite.config.ts            Vite build configuration
    drizzle.config.ts         Drizzle Kit configuration
    theme.json                shadcn theme configuration
    replit.md                 Project documentation

  Server:
    server/index.ts           Express app bootstrap
    server/routes.ts          All API routes (15,316 lines)
    server/storage.ts         Storage interface + DB implementation
    server/helpbot-routes.ts  AI help bot routes
    server/vite.ts            Vite integration

  Shared:
    shared/schema.ts          Drizzle ORM schema (2,109 lines)
    shared/indian-truck-data.ts  Truck manufacturers/models data
    shared/indian-locations.ts   Indian states/cities data

  Client:
    client/src/App.tsx        Root component with routing
    client/src/main.tsx       React entry point
    client/src/index.css      Global styles + CSS variables
    client/src/pages/         61 page components
    client/src/components/    81 UI components
    client/src/components/ui/ shadcn base components
    client/src/lib/           Utilities (queryClient, auth, sockets)
    client/src/hooks/         Custom React hooks
    client/src/i18n/          Internationalization

  Total Project Files:        25,144
  Total TypeScript Files:     3,764


================================================================================
  SECTION 23: SOURCE CODE MAP
================================================================================

  23.1 Backend Services
  -------------------------------------------------------
  server/routes.ts            All REST API handlers (15,316 lines)
  server/storage.ts           IStorage interface + DatabaseStorage
  server/helpbot-routes.ts    AI chatbot endpoints
  server/index.ts             Express middleware, session, CORS, startup
  server/vite.ts              Vite dev server proxy + static serving

  23.2 Frontend Core
  -------------------------------------------------------
  client/src/App.tsx           Root router with role-based routing
  client/src/main.tsx          React DOM render entry
  client/src/lib/queryClient.ts TanStack Query setup + apiRequest
  client/src/lib/auth-context.tsx Auth Context Provider
  client/src/lib/marketplace-socket.ts WebSocket client
  client/src/lib/utils.ts      Utility functions (cn, formatters)

  23.3 Middleware
  -------------------------------------------------------
  express-session              Session middleware
  connect-pg-simple            PostgreSQL session store
  multer                       File upload parsing
  Custom role guards           Inline in routes.ts

  23.4 Environment Variables Referenced
  -------------------------------------------------------
  DATABASE_URL                 PostgreSQL connection string
  SMTP_USER                    Email username
  SMTP_PASS                    Email password
  OPENAI_API_KEY               OpenAI API key
  SESSION_SECRET               Session encryption key
  REPL_ID                      Replit instance identifier

  23.5 Cron Jobs / Background Workers
  -------------------------------------------------------
  None implemented. All processing is synchronous.


================================================================================
  SECTION 24: SECURITY AND RISK ASSESSMENT
================================================================================

  24.1 Authentication Model
  -------------------------------------------------------
  Type:                 Session-based (HTTP-only cookies)
  Session Store:        PostgreSQL (connect-pg-simple)
  Session Lifetime:     Default express-session settings
  Password Storage:     bcrypt hashed

  24.2 Role Hierarchy
  -------------------------------------------------------
  admin                 Full platform access
  finance               Finance review portal access
  shipper               Shipper portal, own loads/invoices
  carrier               Carrier portal, marketplace, own bids/shipments
  solo_carrier          Simplified carrier portal (subset)

  24.3 Encryption
  -------------------------------------------------------
  Transport:            HTTPS (TLS managed by Replit)
  At Rest:              Not implemented (plaintext DB fields)
  Password:             bcrypt hashed

  24.4 Known Vulnerabilities / Technical Debt
  -------------------------------------------------------
  RISK: PII stored as plaintext
    Aadhaar numbers, phone numbers, email addresses not field-encrypted
    Severity: HIGH
    Mitigation: Add column-level encryption

  RISK: No rate limiting
    All API endpoints lack request throttling
    Severity: MEDIUM
    Mitigation: Add express-rate-limit middleware

  RISK: Single monolithic routes file (15,316 lines)
    Developer productivity and maintenance risk
    Severity: LOW
    Mitigation: Modularize into domain-specific route files

  RISK: No CSRF protection
    Mitigated by same-origin deployment but not explicit
    Severity: LOW
    Mitigation: Add csurf middleware

  RISK: In-memory WebSocket state
    Cannot scale horizontally
    Severity: MEDIUM
    Mitigation: Redis adapter for WebSocket

  RISK: No data retention / GDPR compliance
    No automatic data purging or user data export
    Severity: MEDIUM
    Mitigation: Implement data lifecycle management

  RISK: Console.log for error logging
    No structured error tracking or alerting
    Severity: LOW
    Mitigation: Add Winston + error tracking service


================================================================================
  SECTION 25: BILLING AND MONETIZATION ENGINE
================================================================================

  25.1 Revenue Model
  -------------------------------------------------------
  Primary Revenue:      Platform margin per load transaction
  Formula:              platformMargin = adminGrossPrice * (marginPercent / 100)
  Setting:              Per-load, set by admin during pricing

  25.2 SaaS Subscription Logic
  -------------------------------------------------------
  Not implemented. Platform operates on per-transaction margin model.

  25.3 Recurring Billing
  -------------------------------------------------------
  Not implemented. Each load is a discrete transaction.

  25.4 Payment Gateway Integration
  -------------------------------------------------------
  Not integrated. Payment tracking is manual via invoice status updates.
  Finance team reviews and marks payments as released.

  25.5 Kill Switches / License Enforcement
  -------------------------------------------------------
  Feature flags system allows toggling features on/off
  No external license enforcement or kill switches


================================================================================
  SECTION 26: DEPLOYMENT AND INFRASTRUCTURE
================================================================================

  26.1 Platform
  -------------------------------------------------------
  Host:                 Replit
  Environment:          Nix-based Linux
  Port:                 5000 (single-origin)

  26.2 CI/CD
  -------------------------------------------------------
  Build System:         Replit Deployments (built-in)
  Dev Command:          npm run dev (tsx + Vite)
  Build Command:        vite build + esbuild (production)
  No separate CI/CD pipeline (Replit handles deployment)

  26.3 Containerization
  -------------------------------------------------------
  Docker:               Not used
  Containers:           Not used
  Nix:                  Replit Nix environment

  26.4 Load Balancer / Proxy
  -------------------------------------------------------
  Reverse Proxy:        Managed by Replit
  SSL/TLS:              Managed by Replit
  Domain:               .replit.app (custom domain configurable)

  26.5 Scaling Strategy
  -------------------------------------------------------
  Current:              Single instance (vertical scaling)
  Horizontal:           Not configured (WebSocket in-memory state)
  Auto-scaling:         Managed by Replit


================================================================================
  SECTION 27: COMPLIANCE AND REGULATORY CHECKLIST
================================================================================

  27.1 Indian Logistics Regulations
  -------------------------------------------------------
  Requirement               Status          Implementation
  GST invoicing             Implemented     CGST/SGST/IGST in invoices
  GSTIN storage             Implemented     shipperGstin, carrierGstin
  HSN/SAC codes             Implemented     hsnSacCode field
  E-way bill tracking       Implemented     ewayBillNumber, validUntil
  TDS deduction (2%)        Implemented     Settlement calculations
  PAN verification          Partial         Field exists, no API verify
  Aadhaar verification      Partial         Upload exists, no API verify
  Vehicle permit tracking   Implemented     Permit type, expiry, upload
  Insurance tracking        Implemented     Expiry, document upload
  Fitness certificate       Implemented     Expiry, document upload
  PUC certificate           Implemented     Expiry, document upload
  RC book                   Implemented     Document upload + verification
  LR (Lorry Receipt)        Implemented     Required for transporter role
  Driver license            Implemented     Number, expiry, image upload

  27.2 Data Protection
  -------------------------------------------------------
  Requirement               Status          Notes
  PII encryption            Not implemented Plaintext storage
  Data retention policy     Not implemented No auto-purging
  Right to deletion         Not implemented No deletion endpoint
  Consent management        Not implemented No consent tracking
  Data export               Not implemented No portability
  Audit logging             Implemented     Full admin audit trail


================================================================================
  SECTION 28: STRATEGIC VALUATION LAYERS
================================================================================

  28.1 Strategic Premium Features
  -------------------------------------------------------
  - Admin-as-Mediator pricing model (unique workflow)
  - Dual marketplace (solo + fleet carriers)
  - AI-powered truck suggestions and ETA predictions
  - 100-point carrier-load recommendation engine
  - Bidirectional price sync (load <-> invoice)
  - OTP-verified trip start/end
  - Credit assessment engine
  - Multi-language support (5 Indian languages)
  - Real-time WebSocket marketplace
  - Vehicle telematics integration

  28.2 Vendor Lock-in Mechanisms
  -------------------------------------------------------
  - Custom pricing engine with carrier advance logic
  - Proprietary recommendation algorithm
  - Indian market-specific truck/location data
  - GST/TDS compliance embedded in core logic
  - OTP-based trip verification workflow

  28.3 Switching Cost Layers
  -------------------------------------------------------
  - Historical shipment data and carrier performance records
  - Onboarding records and verification documents
  - Pricing templates and margin configurations
  - Saved addresses and route history
  - Credit assessments and risk profiles
  - Negotiation history and audit trails

  28.4 Regulatory Moat
  -------------------------------------------------------
  - GST invoice compliance (CGST/SGST/IGST)
  - E-way bill tracking
  - TDS deduction automation
  - Vehicle document expiry enforcement
  - Driver license verification workflow
  - Indian-specific truck type database

  28.5 Network Effects
  -------------------------------------------------------
  - More shippers attract more carriers (load volume)
  - More carriers improve load coverage and pricing
  - Historical data improves recommendation accuracy
  - Route experience data creates competitive advantage

  28.6 Replaceability Score
  -------------------------------------------------------
  Component                   Replaceability   Effort
  Frontend UI                 Medium           3-4 months
  Backend API (253 endpoints) Low              6-8 months
  Pricing Engine              Low              2-3 months
  Recommendation Algorithm    Medium           1-2 months
  Database Schema (45 tables) Low              4-6 months
  Compliance Logic            Low              3-4 months
  Full System Rebuild         Very Low         12-18 months


================================================================================
  SECTION 29: CODE OWNERSHIP FOOTPRINT
================================================================================

  29.1 Original Code
  -------------------------------------------------------
  All application logic, components, routes, storage interface, and
  business workflows are original proprietary code.

  29.2 Third-Party Libraries (83 production, 18 dev)
  -------------------------------------------------------
  All dependencies are open-source packages from npm registry.
  No proprietary third-party code licensed.

  29.3 Open Source Dependencies
  -------------------------------------------------------
  React:              MIT License
  Express:            MIT License
  Drizzle ORM:        Apache 2.0 License
  Tailwind CSS:       MIT License
  Radix UI:           MIT License
  TanStack Query:     MIT License
  Leaflet:            BSD-2-Clause License
  OpenAI SDK:         MIT License
  All other deps:     MIT or compatible licenses

  29.4 Copyright Risk
  -------------------------------------------------------
  Risk Level:         LOW
  All dependencies are permissive open-source licenses (MIT, Apache 2.0,
  BSD). No GPL or copyleft dependencies in production code.


================================================================================
  SECTION 30: PERFORMANCE AND SCALABILITY ASSESSMENT
================================================================================

  30.1 Current Bottlenecks
  -------------------------------------------------------
  Area                      Issue                    Severity
  Single routes file        15,316 lines             Low
  No caching                Every request hits DB    Medium
  No rate limiting          API abuse risk           Medium
  Client-side analytics     Heavy data processing    Medium
  WebSocket in-memory       Single-instance only     Medium
  No background jobs        Sync processing          Medium
  No CDN for assets         Server-delivered         Low

  30.2 Scaling Recommendations (Priority Order)
  -------------------------------------------------------
  1. Add Redis caching for frequently accessed data
  2. Modularize routes.ts into domain-specific files
  3. Add rate limiting middleware
  4. Implement background job queue for emails/notifications
  5. Add Redis adapter for WebSocket horizontal scaling
  6. Add database indexes on status, carrierId, shipperId
  7. Enforce API response pagination on all list endpoints
  8. Pre-compute analytics data server-side


================================================================================
  SECTION 31: DEPENDENCY VERSIONS (FULL LIST)
================================================================================

  31.1 Production Dependencies (83 packages)
  -------------------------------------------------------
  @hookform/resolvers              3.9.1
  @radix-ui/react-accordion        1.2.2
  @radix-ui/react-alert-dialog     1.1.4
  @radix-ui/react-avatar           1.1.2
  @radix-ui/react-checkbox         1.1.3
  @radix-ui/react-collapsible      1.1.2
  @radix-ui/react-context-menu     2.2.4
  @radix-ui/react-dialog           1.1.4
  @radix-ui/react-dropdown-menu    2.1.4
  @radix-ui/react-hover-card       1.1.4
  @radix-ui/react-label            2.1.1
  @radix-ui/react-menubar          1.1.4
  @radix-ui/react-navigation-menu  1.2.3
  @radix-ui/react-popover          1.1.4
  @radix-ui/react-progress         1.1.1
  @radix-ui/react-radio-group      1.2.2
  @radix-ui/react-scroll-area      1.2.2
  @radix-ui/react-select           2.1.4
  @radix-ui/react-separator        1.1.1
  @radix-ui/react-slider           1.2.2
  @radix-ui/react-slot             1.1.1
  @radix-ui/react-switch           1.1.2
  @radix-ui/react-tabs             1.1.2
  @radix-ui/react-toast            1.2.4
  @radix-ui/react-toggle           1.1.1
  @radix-ui/react-toggle-group     1.1.1
  @radix-ui/react-tooltip          1.1.6
  @tanstack/react-query            5.62.7
  class-variance-authority         0.7.1
  clsx                             2.1.1
  cmdk                             1.0.4
  connect-pg-simple                10.0.0
  date-fns                         4.1.0
  drizzle-orm                      0.39.3
  drizzle-zod                      0.7.0
  embla-carousel-react             8.5.1
  express                          4.21.2
  express-session                  1.18.1
  i18next                          24.2.2
  i18next-browser-languagedetector 8.0.4
  input-otp                        1.4.1
  leaflet                          1.9.4
  lucide-react                     0.468.0
  multer                           1.4.5-lts.1
  nanoid                           5.0.9
  nodemailer                       6.10.0
  openai                           4.77.3
  pg                               8.13.1
  react                            18.3.1
  react-dom                        18.3.1
  react-hook-form                  7.54.2
  react-i18next                    15.4.1
  react-icons                      5.4.0
  react-leaflet                    5.0.0
  react-resizable-panels           2.1.7
  recharts                         2.15.0
  tailwind-merge                   2.6.0
  tailwindcss-animate              1.0.7
  vaul                             1.1.2
  wouter                           3.5.0
  ws                               8.18.0
  zod                              3.24.1

  31.2 Dev Dependencies (18 packages)
  -------------------------------------------------------
  @replit/vite-plugin-shadcn-theme-json  0.0.4
  @tailwindcss/typography                0.5.15
  @types/connect-pg-simple              7.0.3
  @types/express                         5.0.0
  @types/express-session                 1.18.1
  @types/leaflet                         1.9.15
  @types/multer                          1.4.12
  @types/nodemailer                      6.4.17
  @types/pg                              8.11.10
  @types/ws                              8.5.14
  autoprefixer                           10.4.20
  drizzle-kit                            0.30.4
  esbuild                               0.24.2
  postcss                                8.4.49
  tailwindcss                            3.4.17
  tsx                                    4.19.2
  typescript                             5.6.3
  vite                                   5.4.14


================================================================================
                          END OF REPORT
================================================================================

  Document:    Full System Forensic Disclosure Report v1
  Software:    LoadSmart (Powered by Roadex)
  Version:     1.0
  Generated:   February 2026
  Total Sections: 31
  Classification: CONFIDENTIAL - Internal Use Only

  This report covers the complete system architecture, all 253 API
  endpoints, 44 database tables, 55+ frontend routes, 7 core workflows,
  15-state lifecycle, pricing engine, recommendation algorithm, credit
  engine, WebSocket events, object storage, file structure, security
  assessment, compliance checklist, valuation layers, code ownership,
  performance assessment, and full dependency listing.

================================================================================
