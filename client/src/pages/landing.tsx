import { useLocation } from "wouter";
import { useState } from "react";
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
  IndianRupee,
  CheckCircle2,
  X
} from "lucide-react";
import shipperImage from "@assets/D29D77FD-38C9-494F-B81F-1C5943124B44_1768932398273.png";
import staffImage from "@assets/PHOTO-2026-01-21-00-10-17_1768953323491.jpg";
import soloDriverImage from "@assets/image_1768953524305.png";
import fleetOwnerImage from "@assets/image_1768953860585.png";
import heroVideo from "@assets/Loadlink_1768955038031.mp4";
import ctaTruckImage from "@assets/PHOTO-2026-01-21-00-10-48_1768955240083.jpg";

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
    icon: IndianRupee,
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
  const [activeFeature, setActiveFeature] = useState<number | null>(null);

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

          <div className="relative max-w-6xl mx-auto">
            <div 
              className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-20 rounded-lg"
              style={{ 
                background: 'linear-gradient(to bottom, #2a2a2a 0%, #3d3d3d 50%, #2a2a2a 100%)',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3), inset 0 -2px 4px rgba(0,0,0,0.3)'
              }}
            >
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 flex justify-around px-8">
                {[...Array(20)].map((_, i) => (
                  <div key={i} className="w-8 h-1 bg-yellow-400 rounded" style={{ opacity: 0.8 }} />
                ))}
              </div>
              <div className="absolute inset-x-0 top-2 h-0.5 bg-white/20" />
              <div className="absolute inset-x-0 bottom-2 h-0.5 bg-white/20" />
            </div>
            
            <div className="relative flex justify-around items-center py-16">
              {features.map((feature, index) => (
                <div key={index} className="relative">
                  <button
                    onClick={() => setActiveFeature(activeFeature === index ? null : index)}
                    className="relative z-10 w-24 h-24 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-110"
                    aria-label={`Learn more about ${feature.title}`}
                    aria-expanded={activeFeature === index}
                    style={{ 
                      backgroundColor: activeFeature === index ? 'rgba(0, 191, 255, 0.3)' : 'rgba(22, 37, 79, 0.9)',
                      border: activeFeature === index ? '2px solid rgba(0, 191, 255, 0.8)' : '2px solid rgba(102, 125, 157, 0.5)',
                      boxShadow: activeFeature === index 
                        ? '0 0 30px rgba(0, 191, 255, 0.6), 0 0 60px rgba(0, 191, 255, 0.3)' 
                        : 'none',
                      animation: 'pulse-glow 2s ease-in-out infinite'
                    }}
                    onMouseEnter={(e) => {
                      if (activeFeature !== index) {
                        e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 191, 255, 0.5), 0 0 40px rgba(0, 191, 255, 0.2)';
                        e.currentTarget.style.borderColor = 'rgba(0, 191, 255, 0.6)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activeFeature !== index) {
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.borderColor = 'rgba(102, 125, 157, 0.5)';
                      }
                    }}
                    data-testid={`truck-icon-${index}`}
                  >
                    <svg viewBox="0 0 64 40" className="w-14 h-10" aria-hidden="true">
                      <defs>
                        <linearGradient id={`truckGrad${index}`} x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#00BFFF" />
                          <stop offset="100%" stopColor="#0066CC" />
                        </linearGradient>
                        <linearGradient id={`cabGrad${index}`} x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#ffffff" />
                          <stop offset="100%" stopColor="#ccddee" />
                        </linearGradient>
                      </defs>
                      <rect x="2" y="8" width="38" height="22" rx="2" fill={`url(#truckGrad${index})`} stroke="#00BFFF" strokeWidth="1" />
                      <rect x="6" y="12" width="8" height="6" rx="1" fill="rgba(255,255,255,0.3)" />
                      <rect x="16" y="12" width="8" height="6" rx="1" fill="rgba(255,255,255,0.3)" />
                      <rect x="26" y="12" width="8" height="6" rx="1" fill="rgba(255,255,255,0.3)" />
                      <path d="M40 14 L40 30 L56 30 L56 22 L50 14 Z" fill={`url(#cabGrad${index})`} stroke="#00BFFF" strokeWidth="1" />
                      <rect x="44" y="18" width="8" height="6" rx="1" fill="#87CEEB" stroke="#00BFFF" strokeWidth="0.5" />
                      <circle cx="14" cy="32" r="5" fill="#333" stroke="#555" strokeWidth="2" />
                      <circle cx="14" cy="32" r="2" fill="#888" />
                      <circle cx="48" cy="32" r="5" fill="#333" stroke="#555" strokeWidth="2" />
                      <circle cx="48" cy="32" r="2" fill="#888" />
                      <rect x="52" y="24" width="4" height="2" rx="1" fill="#FF4444" />
                      <rect x="52" y="27" width="4" height="2" rx="1" fill="#FF4444" />
                    </svg>
                  </button>
                  
                  {activeFeature === index && (
                    <div 
                      className="absolute z-20 w-72 p-6 rounded-xl transition-all duration-300"
                      style={{ 
                        backgroundColor: '#16254F',
                        border: '1px solid rgba(0, 191, 255, 0.5)',
                        boxShadow: '0 0 40px rgba(0, 191, 255, 0.3), 0 10px 40px rgba(0, 0, 0, 0.5)',
                        top: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        marginTop: '1rem'
                      }}
                      data-testid={`feature-card-${index}`}
                    >
                      <button 
                        onClick={(e) => { e.stopPropagation(); setActiveFeature(null); }}
                        className="absolute top-3 right-3 text-white/60 hover:text-white transition-colors"
                        aria-label="Close feature details"
                        data-testid={`close-card-${index}`}
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(0, 191, 255, 0.2)' }}>
                        <feature.icon className="h-6 w-6" style={{ color: '#00BFFF' }} />
                      </div>
                      <h3 className="text-xl font-bold mb-3 text-white">{feature.title}</h3>
                      <p className="text-sm leading-relaxed" style={{ color: '#ACBBC6' }}>{feature.description}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="flex justify-around items-center mt-4">
              {features.map((feature, index) => (
                <span key={index} className="text-sm font-medium text-center max-w-[120px]" style={{ color: activeFeature === index ? '#00BFFF' : '#667D9D' }}>
                  {feature.title}
                </span>
              ))}
            </div>
          </div>
        </div>
        
        <style>{`
          @keyframes pulse-glow {
            0%, 100% { box-shadow: 0 0 10px rgba(0, 191, 255, 0.2); }
            50% { box-shadow: 0 0 20px rgba(0, 191, 255, 0.4), 0 0 30px rgba(0, 191, 255, 0.2); }
          }
        `}</style>
      </section>

      <section className="py-20" style={{ backgroundColor: '#060817' }}>
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto rounded-2xl p-8 md:p-12 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #16254F 0%, #667D9D 100%)' }}>
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.1) 0%, transparent 50%)' }} />
            <div className="relative flex flex-col lg:flex-row items-center gap-8">
              <div 
                className="w-full lg:w-1/2 rounded-xl overflow-hidden transition-all duration-500 cursor-pointer group"
                style={{ animation: 'levitate 3s ease-in-out infinite' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 40px rgba(0, 191, 255, 0.7), 0 0 80px rgba(0, 191, 255, 0.4), 0 20px 60px rgba(0, 0, 0, 0.5)';
                  e.currentTarget.style.transform = 'translateY(-10px) scale(1.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 10px 40px rgba(0, 0, 0, 0.3)';
                  e.currentTarget.style.transform = '';
                }}
                data-testid="cta-truck-image"
              >
                <img 
                  src={ctaTruckImage} 
                  alt="LoadSmart truck at warehouse" 
                  className="w-full h-64 lg:h-80 object-cover"
                />
              </div>
              <div className="w-full lg:w-1/2 text-center lg:text-left">
                <Users className="h-12 w-12 mb-4 text-white/80 mx-auto lg:mx-0" aria-hidden="true" />
                <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
                  Ready to get started?
                </h2>
                <p className="text-lg mb-8 text-white/80">
                  Join thousands of shippers and carriers already using FreightFlow to streamline their logistics operations.
                </p>
                <div className="flex flex-wrap justify-center lg:justify-start gap-4">
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
        </div>
        
        <style>{`
          @keyframes levitate {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-8px); }
          }
        `}</style>
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
