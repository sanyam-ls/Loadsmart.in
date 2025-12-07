# Logistics Marketplace Design Guidelines

## Design Approach

**Selected Approach**: Hybrid - Material Design foundation with enterprise SaaS refinements inspired by platforms like Linear, Vercel, and Stripe for a professional, data-rich logistics application.

**Key Principles**:
- Enterprise minimalism: Clean, advanced interfaces without clutter
- Information density balanced with breathing room
- Role-specific UI optimization (lean for Carriers, powerful for Shippers, comprehensive for Admins)
- Trust-building through professional polish

## Color System

**Primary Palette**:
- Primary Blue: Use for CTAs, active states, key actions (bids, confirmations)
- Secondary Blue: Lighter shade for backgrounds, hover states
- White/Light backgrounds for day mode
- Dark grays (#1a1a1a to #2d2d2d) for night mode
- Grayscale accents: Strategic use for borders, dividers, secondary text

**Semantic Colors**:
- Success: Green for confirmed, delivered, active status
- Warning: Amber for pending, expiring documents
- Error: Red for delays, rejections
- Info: Blue for notifications, new bids

## Typography

**Font Stack**: Inter or DM Sans via Google Fonts
- Headings: Bold (700), sizes 32px/24px/18px
- Body: Regular (400), 16px base
- Small text/labels: Medium (500), 14px
- Data/numbers: Tabular figures, Medium (500)

## Layout System

**Spacing Scale**: Use Tailwind units 2, 4, 6, 8, 12, 16, 20, 24
- Component padding: p-6 to p-8
- Section spacing: py-12 to py-20
- Card gaps: gap-4 to gap-6
- Dashboard grid gaps: gap-6

**Container Strategy**:
- Dashboard layouts: max-w-7xl with full-width maps/tables
- Forms: max-w-2xl centered
- Cards: Consistent border-radius (rounded-lg)

## Component Library

### Navigation
- **Top Bar**: Logo left, role switcher center, notifications + theme toggle + profile right
- **Sidebar**: Icon + text navigation, collapsible on mobile, active state with blue accent
- **Breadcrumbs**: For deep navigation (Load Details → Negotiation → Documents)

### Dashboards
- **Widget Cards**: White/dark cards with shadow-sm, consistent padding (p-6)
- **Stat Cards**: Large number display, small label, trend indicator
- **Chart Cards**: Integrated recharts with matching theme colors
- **Quick Actions**: Prominent blue buttons in cards

### Data Display
- **Tables**: Zebra striping optional, hover states, sortable headers
- **Lists**: Clean rows with dividers, action buttons on hover
- **Cards Grid**: 2-3 columns desktop, 1 column mobile
- **Timeline**: Vertical with connecting lines, status icons, timestamps

### Forms
- **Smart Load Form**: Multi-step if needed, inline validation, auto-suggestions
- **Input Fields**: Consistent height (h-12), clear labels, helper text
- **Dropdowns**: Native select styled or custom with search for carriers
- **File Upload**: Drag-drop zone with preview thumbnails

### Interactive Elements
- **Bidding Cards**: Price prominent, carrier info, action buttons (Accept/Counter)
- **Chat Interface**: Message bubbles (blue for user, gray for others), timestamp, bid integration
- **Map Views**: Leaflet with custom markers, filters sidebar, legend
- **Tracking Timeline**: Step indicators, active step highlighted, completion checkmarks

### Modals & Overlays
- **AI Concierge**: Fixed bottom-right, rounded chat bubble, 400px width when open
- **Notifications Panel**: Slide-in from right, categorized by type
- **Confirmation Dialogs**: Centered, clear action buttons

### Specialized Components
- **Carrier Profile Cards**: Photo/logo, badge, stats grid, trust indicators, CTA
- **Load Cards**: Pickup/dropoff icons, distance/weight, status tag, bid count
- **Truck Availability**: Map markers + list, match score badge, quick quote button
- **Document Vault**: Grid of document cards, status indicators, upload button

## Empty States

Every empty view includes:
- Icon (200px, subtle gray)
- Heading: "No [items] yet"
- Instructional text: 2-3 sentences explaining next steps
- Primary CTA button
- Example: "No loads posted" → "Create your first load to connect with carriers nearby"

## Day/Night Mode

**Implementation**:
- Toggle in top navigation, persists in localStorage
- Smooth transition (0.3s ease)
- Day: White backgrounds, dark text, light shadows
- Night: Dark backgrounds (#1a1a1a base), white text, elevated cards with subtle borders

## AI Concierge

**Visual Treatment**:
- Floating button: Blue circle with chat icon, bottom-right (bottom-6 right-6)
- Chat window: 400px wide, 600px tall, rounded corners, shadow-lg
- Messages: User (blue background), AI (gray background)
- Typing indicator: Three animated dots
- Quick action chips below input

## Navigation Structure

**Shipper Flow**: Dashboard → Post Load (smart form) → My Loads (table/cards) → Negotiation (chat + bids) → Track Shipment (timeline/map) → Carriers Directory → Documents → Account

**Carrier Flow**: Dashboard → Add Truck (form) → Available Loads (map/list with filters) → My Bids → Active Trips (timeline) → Documents → Account

**Admin Flow**: Overview (metrics) → Users (table) → All Loads → Carrier Verification → Reports/Analytics

## Animations

**Minimal, Purposeful**:
- Page transitions: Fade in content (0.2s)
- Notifications: Slide in from right (0.3s)
- AI Concierge: Expand from button (0.3s)
- No scroll-triggered animations
- Hover states: Smooth scale/shadow transitions (0.15s)

## Images

**Strategic Placement**:
- **Landing/Marketing**: Hero image showing trucks/logistics (full-width, 60vh)
- **Empty States**: Illustrative icons, not photos
- **Carrier Profiles**: Truck photos/fleet images
- **Documents**: Thumbnail previews of uploaded files
- **No decorative images** in functional dashboards - data and functionality are the focus

**Hero Treatment** (if landing page exists):
- Logistics imagery (trucks on highway, warehouse operations)
- Gradient overlay for text readability
- CTA buttons with backdrop-blur-sm for contrast
- Height: 60-70vh, not full screen

## Professional Polish

- Consistent shadow depths (shadow-sm for cards, shadow-lg for modals)
- Subtle hover states on all interactive elements
- Loading states for all async actions (skeleton screens, spinners)
- Toast notifications for confirmations (top-right)
- Responsive breakpoints: md (768px), lg (1024px), xl (1280px)
- All text properly contrasted (WCAG AA minimum)