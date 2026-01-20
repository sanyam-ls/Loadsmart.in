import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { 
  Truck, 
  Building2, 
  Package, 
  Users, 
  Shield,
  ArrowRight,
  MapPin,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle2
} from "lucide-react";

const roleCards = [
  {
    id: "shipper",
    title: "Shipper",
    subtitle: "I am a Shipper",
    description: "Post loads, track shipments, and manage your freight operations with our digital marketplace.",
    icon: Package,
    features: ["Post unlimited loads", "Real-time tracking", "Document management"],
    link: "/auth?role=shipper",
    color: "from-blue-500 to-blue-600"
  },
  {
    id: "admin",
    title: "FreightFlow Staff",
    subtitle: "I work at FreightFlow",
    description: "Manage operations, approve carriers, handle pricing, and oversee the marketplace.",
    icon: Shield,
    features: ["Full platform access", "Carrier verification", "Analytics dashboard"],
    link: "/auth?role=admin",
    color: "from-indigo-500 to-indigo-600"
  },
  {
    id: "solo",
    title: "Solo Carrier",
    subtitle: "I am a Solo Carrier",
    description: "Find loads, manage your truck, track earnings, and grow your owner-operator business.",
    icon: Truck,
    features: ["Load marketplace", "Earnings tracking", "Document storage"],
    link: "/auth?role=solo",
    color: "from-emerald-500 to-emerald-600"
  },
  {
    id: "fleet",
    title: "Fleet Owner",
    subtitle: "I am a Fleet Owner",
    description: "Manage your fleet, drivers, and operations. Bid on loads and track all your shipments.",
    icon: Building2,
    features: ["Fleet management", "Driver tracking", "Revenue analytics"],
    link: "/auth?role=fleet",
    color: "from-orange-500 to-orange-600"
  }
];

const features = [
  {
    icon: MapPin,
    title: "Real-time Tracking",
    description: "GPS-enabled tracking for complete visibility of your shipments from pickup to delivery."
  },
  {
    icon: TrendingUp,
    title: "Competitive Marketplace",
    description: "Get the best rates with our dual bidding system - fixed pricing or negotiable offers."
  },
  {
    icon: FileText,
    title: "Digital Documents",
    description: "Secure document sharing, POD uploads, and instant invoice generation."
  },
  {
    icon: Clock,
    title: "Fast Payments",
    description: "Quick carrier payouts with transparent pricing and advance payment options."
  }
];

const stats = [
  { value: "10,000+", label: "Loads Delivered" },
  { value: "500+", label: "Trusted Carriers" },
  { value: "98%", label: "On-time Delivery" },
  { value: "24/7", label: "Support Available" }
];

export default function LandingPage() {
  const [, setLocation] = useLocation();

  const handleRoleClick = (link: string) => {
    setLocation(link);
  };

  const handleKeyDown = (e: React.KeyboardEvent, link: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setLocation(link);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Truck className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold">FreightFlow</span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button variant="outline" onClick={() => setLocation("/auth")} data-testid="button-signin">
              Sign In
            </Button>
            <Button onClick={() => setLocation("/auth")} data-testid="button-get-started">
              Get Started
            </Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              Digital Freight Marketplace
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Connect shippers with trusted carriers. Post loads, track shipments, and manage your logistics operations - all in one platform.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              {stats.map((stat, index) => (
                <div key={index} className="text-center px-6 py-3">
                  <div className="text-2xl md:text-3xl font-bold text-primary">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {roleCards.map((role) => (
              <Card 
                key={role.id} 
                className="group relative overflow-hidden hover-elevate cursor-pointer border-2 hover:border-primary/50 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                onClick={() => handleRoleClick(role.link)}
                onKeyDown={(e) => handleKeyDown(e, role.link)}
                tabIndex={0}
                role="button"
                aria-label={`${role.subtitle} - ${role.title}`}
                data-testid={`card-role-${role.id}`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${role.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
                <CardHeader className="pb-2">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${role.color} flex items-center justify-center mb-3`}>
                    <role.icon className="h-6 w-6 text-white" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">{role.subtitle}</p>
                  <CardTitle className="text-2xl">{role.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CardDescription className="text-sm">
                    {role.description}
                  </CardDescription>
                  <ul className="space-y-2">
                    {role.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full group-hover:bg-primary gap-2" variant="outline" tabIndex={-1}>
                    Get Started
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Grow your business for the long haul
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We match the right load to the right truck at the right price, with trusted insights and support from dock to dock and beyond.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-8 md:p-12 text-center text-primary-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-90" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to get started?
            </h2>
            <p className="text-lg opacity-90 mb-8 max-w-xl mx-auto">
              Join thousands of shippers and carriers already using FreightFlow to streamline their logistics operations.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button 
                size="lg" 
                variant="secondary" 
                onClick={() => setLocation("/auth")}
                data-testid="button-cta-signup"
              >
                Create Free Account
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
                onClick={() => setLocation("/auth")}
                data-testid="button-cta-signin"
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Truck className="h-4 w-4" />
              </div>
              <span className="font-semibold">FreightFlow</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Digital Freight Marketplace. Connecting shippers with trusted carriers.
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Privacy Policy</span>
              <span>Terms of Service</span>
              <span>Contact</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
