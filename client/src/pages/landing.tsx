import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
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
import shipperImage from "@assets/D29D77FD-38C9-494F-B81F-1C5943124B44_1768932398273.png";
import staffImage from "@assets/PHOTO-2026-01-21-00-10-17_1768953323491.jpg";
import soloDriverImage from "@assets/image_1768953524305.png";
import fleetOwnerImage from "@assets/image_1768953860585.png";
import heroVideo from "@assets/VIDEO-2026-01-21-00-13-02_1768954212443.mp4";

const roleCards = [
  {
    id: "shipper",
    title: "Shipper",
    subtitle: "I am a Shipper",
    description: "Post loads, track shipments, and manage your freight operations with our digital marketplace.",
    icon: Package,
    features: ["Post unlimited loads", "Real-time tracking", "Document management"],
    link: "/auth?role=shipper",
  },
  {
    id: "admin",
    title: "FreightFlow Staff",
    subtitle: "I work at FreightFlow",
    description: "Manage operations, approve carriers, handle pricing, and oversee the marketplace.",
    icon: Shield,
    features: ["Full platform access", "Carrier verification", "Analytics dashboard"],
    link: "/auth?role=admin",
  },
  {
    id: "solo",
    title: "Solo Carrier",
    subtitle: "I am a Solo Carrier",
    description: "Find loads, manage your truck, track earnings, and grow your owner-operator business.",
    icon: Truck,
    features: ["Load marketplace", "Earnings tracking", "Document storage"],
    link: "/auth?role=solo",
  },
  {
    id: "fleet",
    title: "Fleet Owner",
    subtitle: "I am a Fleet Owner",
    description: "Manage your fleet, drivers, and operations. Bid on loads and track all your shipments.",
    icon: Building2,
    features: ["Fleet management", "Driver tracking", "Revenue analytics"],
    link: "/auth?role=fleet",
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
    <div className="min-h-screen" style={{ backgroundColor: '#060817' }}>
      <header className="sticky top-0 z-50 w-full border-b border-white/10 backdrop-blur-md" style={{ backgroundColor: 'rgba(6, 8, 23, 0.95)' }}>
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: '#667D9D' }}>
              <Truck className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-wide">FreightFlow</span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button 
              variant="outline" 
              onClick={() => setLocation("/auth")} 
              data-testid="button-signin"
              className="border-white/20 text-white hover:bg-white/10 hover:text-white"
            >
              Sign In
            </Button>
            <Button 
              onClick={() => setLocation("/auth")} 
              data-testid="button-get-started"
              className="bg-white text-gray-900 hover:bg-white/90"
            >
              Get Started
            </Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden py-20 md:py-32">
        <video 
          autoPlay 
          loop 
          muted 
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src={heroVideo} type="video/mp4" />
        </video>
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(6, 8, 23, 0.85) 0%, rgba(22, 37, 79, 0.75) 50%, rgba(6, 8, 23, 0.85) 100%)' }} />
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(102, 125, 157, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(22, 37, 79, 0.5) 0%, transparent 50%)' }} />
        
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-white tracking-tight">
              Digital Freight Marketplace
            </h1>
            <p className="text-xl md:text-2xl mb-8 max-w-2xl mx-auto" style={{ color: '#ACBBC6' }}>
              Connect shippers with trusted carriers. Post loads, track shipments, and manage your logistics operations - all in one platform.
            </p>
            <div className="flex flex-wrap justify-center gap-6 mt-12">
              {stats.map((stat, index) => (
                <div 
                  key={index} 
                  className="text-center px-8 py-6 rounded-xl cursor-pointer transition-all duration-300 hover:scale-105"
                  style={{ 
                    backgroundColor: 'rgba(22, 37, 79, 0.6)',
                    border: '1px solid rgba(102, 125, 157, 0.3)',
                    boxShadow: 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 191, 255, 0.6), 0 0 60px rgba(0, 191, 255, 0.3), inset 0 0 20px rgba(0, 191, 255, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(0, 191, 255, 0.8)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderColor = 'rgba(102, 125, 157, 0.3)';
                  }}
                  data-testid={`stat-card-${index}`}
                >
                  <div className="text-3xl md:text-4xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-sm" style={{ color: '#667D9D' }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {roleCards.map((role) => (
              <div 
                key={role.id} 
                className="group relative overflow-hidden rounded-xl cursor-pointer transition-all duration-300 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent min-h-[320px]"
                onClick={() => handleRoleClick(role.link)}
                onKeyDown={(e) => handleKeyDown(e, role.link)}
                tabIndex={0}
                role="button"
                aria-label={`${role.subtitle} - ${role.title}`}
                data-testid={`card-role-${role.id}`}
                style={{ 
                  backgroundColor: '#16254F',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 40px rgba(0, 191, 255, 0.5), 0 0 80px rgba(0, 191, 255, 0.25), inset 0 0 30px rgba(0, 191, 255, 0.08)';
                  e.currentTarget.style.borderColor = 'rgba(0, 191, 255, 0.7)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }}
              >
                {role.id === "shipper" && (
                  <>
                    <div 
                      className="absolute inset-0 bg-cover bg-right bg-no-repeat"
                      style={{ backgroundImage: `url(${shipperImage})` }}
                    />
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(6, 8, 23, 0.95) 0%, rgba(22, 37, 79, 0.7) 50%, rgba(22, 37, 79, 0.5) 100%)' }} />
                  </>
                )}
                {role.id === "admin" && (
                  <>
                    <div 
                      className="absolute inset-0 bg-cover bg-right bg-no-repeat"
                      style={{ backgroundImage: `url(${staffImage})` }}
                    />
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(6, 8, 23, 0.95) 0%, rgba(22, 37, 79, 0.7) 50%, rgba(22, 37, 79, 0.5) 100%)' }} />
                  </>
                )}
                {role.id === "solo" && (
                  <>
                    <div 
                      className="absolute inset-0 bg-cover bg-right bg-no-repeat"
                      style={{ backgroundImage: `url(${soloDriverImage})` }}
                    />
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(6, 8, 23, 0.95) 0%, rgba(22, 37, 79, 0.7) 50%, rgba(22, 37, 79, 0.5) 100%)' }} />
                  </>
                )}
                {role.id === "fleet" && (
                  <>
                    <div 
                      className="absolute inset-0 bg-cover bg-right bg-no-repeat"
                      style={{ backgroundImage: `url(${fleetOwnerImage})` }}
                    />
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(6, 8, 23, 0.95) 0%, rgba(22, 37, 79, 0.7) 50%, rgba(22, 37, 79, 0.5) 100%)' }} />
                  </>
                )}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'linear-gradient(135deg, rgba(102, 125, 157, 0.2) 0%, transparent 100%)' }} />
                
                <div className="p-8 relative flex flex-col justify-center h-full max-w-xs">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: '#667D9D' }}>
                    <role.icon className="h-6 w-6 text-white" />
                  </div>
                  <p className="text-sm font-medium mb-1" style={{ color: '#667D9D' }}>{role.subtitle}</p>
                  <h3 className="text-2xl font-bold text-white mb-3">{role.title}</h3>
                  <p className="text-sm mb-4" style={{ color: '#ACBBC6' }}>
                    {role.description}
                  </p>
                  <ul className="space-y-2 mb-6">
                    {role.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-white/80">
                        <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: '#667D9D' }} />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <div 
                    className="w-fit py-2.5 px-6 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all group-hover:gap-3"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', color: '#16254F', border: '1px solid rgba(255, 255, 255, 0.8)' }}
                  >
                    Get Started
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 relative" style={{ backgroundColor: '#0a0f1f' }}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
              Grow your business for the long haul
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: '#ACBBC6' }}>
              We match the right load to the right truck at the right price, with trusted insights and support from dock to dock and beyond.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'rgba(102, 125, 157, 0.2)' }}>
                  <feature.icon className="h-7 w-7" style={{ color: '#667D9D' }} />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-white">{feature.title}</h3>
                <p className="text-sm" style={{ color: '#ACBBC6' }}>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20" style={{ backgroundColor: '#060817' }}>
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto rounded-2xl p-8 md:p-12 text-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #16254F 0%, #667D9D 100%)' }}>
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.1) 0%, transparent 50%)' }} />
            <div className="relative">
              <Users className="h-12 w-12 mx-auto mb-4 text-white/80" />
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
                Ready to get started?
              </h2>
              <p className="text-lg mb-8 max-w-xl mx-auto text-white/80">
                Join thousands of shippers and carriers already using FreightFlow to streamline their logistics operations.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button 
                  size="lg" 
                  onClick={() => setLocation("/auth")}
                  data-testid="button-cta-signup"
                  className="bg-white text-gray-900 hover:bg-white/90"
                >
                  Create Free Account
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-white/30 text-white hover:bg-white/10"
                  onClick={() => setLocation("/auth")}
                  data-testid="button-cta-signin"
                >
                  Sign In
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-8" style={{ backgroundColor: '#060817', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: '#667D9D' }}>
                <Truck className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-white">FreightFlow</span>
            </div>
            <p className="text-sm" style={{ color: '#667D9D' }}>
              Digital Freight Marketplace. Connecting shippers with trusted carriers.
            </p>
            <div className="flex items-center gap-4 text-sm" style={{ color: '#ACBBC6' }}>
              <span className="hover:text-white cursor-pointer transition-colors">Privacy Policy</span>
              <span className="hover:text-white cursor-pointer transition-colors">Terms of Service</span>
              <span className="hover:text-white cursor-pointer transition-colors">Contact</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
