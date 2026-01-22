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
import ctaBackgroundImage from "@assets/image_1768955391086.png";
import employeeSectionBg from "@assets/image_1769038855319.png";
import collaborationImage from "@assets/generated_images/team_collaboration_office_scene.png";
import growthImage from "@assets/generated_images/career_growth_staircase_visual.png";
import impactImage from "@assets/generated_images/logistics_impact_partnership_scene.png";
import platformBgImage from "@assets/image_1769041507484.png";

const roleCards = [
  {
    id: "shipper",
    title: "Shipper",
    subtitle: "I am a Shipper",
    description: "Post loads, track shipments, and manage your freight operations with our digital marketplace.",
    icon: Package,
    features: ["Post unlimited loads", "Real-time tracking", "Document management"],
    link: "/auth?role=shipper",
    backGreeting: "Hey, I am a Shipper!",
    backDescription: "I post loads and connect with reliable carriers to move my freight. With FreightFlow, I can easily post unlimited shipments, get competitive bids from verified carriers, track my cargo in real-time, and manage all my shipping documents digitally. The platform helps me find the best rates while ensuring my goods reach their destination safely and on time."
  },
  {
    id: "solo",
    title: "Solo Carrier",
    subtitle: "I am a Solo Carrier",
    description: "Find loads, manage your truck, track earnings, and grow your owner-operator business.",
    icon: Truck,
    features: ["Load marketplace", "Earnings tracking", "Document storage"],
    link: "/auth?role=solo",
    backGreeting: "Hey, I am a Solo Carrier!",
    backDescription: "I am an owner-operator who finds and hauls loads independently. FreightFlow gives me access to a marketplace full of available loads, helps me track my earnings and expenses, stores all my compliance documents, and lets me grow my business on my own terms. No middlemen, just me, my truck, and the open road."
  },
  {
    id: "fleet",
    title: "Fleet Owner",
    subtitle: "I am a Fleet Owner",
    description: "Manage your fleet, drivers, and operations. Bid on loads and track all your shipments.",
    icon: Building2,
    features: ["Fleet management", "Driver tracking", "Revenue analytics"],
    link: "/auth?role=fleet",
    backGreeting: "Hey, I am a Fleet Owner!",
    backDescription: "I manage a fleet of trucks and drivers to handle multiple shipments. FreightFlow helps me assign drivers to loads, track all my vehicles in real-time, analyze revenue across my fleet, and scale my transportation business. With comprehensive analytics and fleet management tools, I can maximize efficiency and profitability."
  }
];

const staffCard = {
  id: "admin",
  title: "FreightFlow Staff",
  subtitle: "I work at FreightFlow",
  description: "Manage operations, approve carriers, handle pricing, and oversee the marketplace.",
  icon: Shield,
  features: ["Full platform access", "Carrier verification", "Analytics dashboard"],
  link: "/auth?role=admin",
  backGreeting: "Hey, I am FreightFlow Staff!",
  backDescription: "I ensure the marketplace runs smoothly by verifying carriers, managing load pricing, and overseeing all operations. My role involves approving new carriers, setting fair prices for shippers, resolving disputes, and using analytics to optimize the platform. I am the bridge that connects shippers with trusted carriers."
};

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
  { 
    id: "loads",
    value: "10,000+", 
    label: "Loads Delivered",
    backDescription: "Over 10,000 shipments facilitated across India, connecting shippers with reliable carriers."
  },
  { 
    id: "carriers",
    value: "500+", 
    label: "Trusted Carriers",
    backDescription: "500+ verified carriers in our network, from solo operators to large fleet companies."
  },
  { 
    id: "delivery",
    value: "98%", 
    label: "On-time Delivery",
    backDescription: "Real-time tracking ensures 98% on-time delivery. Your cargo arrives when promised."
  },
  { 
    id: "support",
    value: "24/7", 
    label: "Support Available",
    backDescription: "Dedicated support available around the clock, 365 days a year for any query."
  }
];

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const [activeFeature, setActiveFeature] = useState<number | null>(null);
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());

  const toggleCardFlip = (cardId: string) => {
    setFlippedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  };

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
      <header className="sticky top-0 z-50 w-full border-b backdrop-blur-md bg-white/95 dark:bg-[rgba(6,8,23,0.95)] border-gray-200 dark:border-white/10">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#667D9D]">
              <Truck className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white tracking-wide">FreightFlow</span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button 
              variant="outline" 
              onClick={() => setLocation("/auth")} 
              data-testid="button-signin"
              className="border-gray-300 dark:border-white/20 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10"
            >
              Sign In
            </Button>
            <Button 
              onClick={() => setLocation("/auth")} 
              data-testid="button-get-started"
              className="bg-[#16254F] dark:bg-white text-white dark:text-gray-900 hover:bg-[#16254F]/90 dark:hover:bg-white/90"
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
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(6, 8, 23, 0.7) 0%, rgba(22, 37, 79, 0.5) 50%, rgba(6, 8, 23, 0.7) 100%)' }} />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(0, 191, 255, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(0, 191, 255, 0.1) 0%, transparent 50%)' }} />
        
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <div style={{ animation: 'heroLevitate 4s ease-in-out infinite' }}>
              <h1 className="text-4xl md:text-6xl font-bold mb-6 text-white tracking-tight">
                Digital Freight Marketplace
              </h1>
              <p className="text-xl md:text-2xl mb-8 max-w-2xl mx-auto text-white">
                Connect shippers with trusted carriers. Post loads, track shipments, and manage your logistics operations, all in one platform.
              </p>
            </div>
            <div className="flex flex-nowrap justify-center gap-4 mt-12">
              {stats.map((stat) => {
                const isFlipped = flippedCards.has(`stat-${stat.id}`);
                return (
                  <div 
                    key={stat.id} 
                    className="relative w-48 h-36"
                    style={{ perspective: '1000px' }}
                    data-testid={`stat-card-${stat.id}`}
                  >
                    <div 
                      className="relative w-full h-full transition-transform duration-700"
                      style={{ 
                        transformStyle: 'preserve-3d',
                        transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                      }}
                    >
                      <div 
                        className="absolute inset-0 text-center px-4 py-4 rounded-xl cursor-pointer flex flex-col justify-center items-center"
                        onClick={() => toggleCardFlip(`stat-${stat.id}`)}
                        style={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.15)',
                          border: '1px solid rgba(255, 255, 255, 0.3)',
                          backfaceVisibility: 'hidden',
                          backdropFilter: 'blur(10px)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = '0 0 30px rgba(255, 255, 255, 0.3)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = 'none';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                        }}
                      >
                        <div className="text-3xl md:text-4xl font-bold text-white mb-1">{stat.value}</div>
                        <div className="text-sm text-white/70">{stat.label}</div>
                      </div>
                      
                      <div 
                        className="absolute inset-0 px-3 py-3 rounded-xl cursor-pointer flex flex-col justify-center overflow-hidden"
                        onClick={() => toggleCardFlip(`stat-${stat.id}`)}
                        style={{ 
                          background: 'linear-gradient(135deg, #16254F 0%, #0066CC 50%, #00BFFF 100%)',
                          border: '1px solid rgba(0, 191, 255, 0.5)',
                          backfaceVisibility: 'hidden',
                          transform: 'rotateY(180deg)',
                          boxShadow: '0 0 25px rgba(0, 191, 255, 0.4)'
                        }}
                      >
                        <p className="text-sm leading-relaxed text-center text-white">
                          {stat.backDescription}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {roleCards.map((role) => {
              const isFlipped = flippedCards.has(role.id);
              const backgroundImage = role.id === "shipper" ? shipperImage : 
                                     role.id === "solo" ? soloDriverImage : fleetOwnerImage;
              return (
                <div 
                  key={role.id} 
                  className="relative h-[480px]"
                  style={{ perspective: '1000px' }}
                  data-testid={`card-role-${role.id}`}
                >
                  <div 
                    className="relative w-full h-full transition-transform duration-700"
                    style={{ 
                      transformStyle: 'preserve-3d',
                      transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                    }}
                  >
                    <div 
                      className="absolute inset-0 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] flex flex-col"
                      onClick={() => toggleCardFlip(role.id)}
                      onKeyDown={(e) => e.key === 'Enter' && toggleCardFlip(role.id)}
                      tabIndex={0}
                      role="button"
                      aria-label={`Learn more about ${role.title}. Click to see details.`}
                      style={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.15)',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        backfaceVisibility: 'hidden',
                        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.2)',
                        backdropFilter: 'blur(10px)'
                      }}
                    >
                      <div className="p-5 text-center">
                        <p className="text-xl font-bold mb-1 text-white">I am a</p>
                        <h3 className="text-3xl font-bold mb-4 text-white">{role.title}</h3>
                        <Button
                          variant="outline"
                          className="mb-4 px-8"
                          style={{ 
                            borderColor: '#FFFFFF',
                            color: '#FFFFFF',
                            backgroundColor: 'transparent'
                          }}
                          onClick={(e) => { e.stopPropagation(); toggleCardFlip(role.id); }}
                          data-testid={`button-learn-${role.id}`}
                        >
                          LEARN MORE
                        </Button>
                      </div>
                      <div className="h-52 overflow-hidden">
                        <img src={backgroundImage} alt={role.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="p-4 text-center flex-1 flex items-center justify-center">
                        <p className="text-sm leading-relaxed text-white">{role.description}</p>
                      </div>
                    </div>
                    
                    <div 
                      className="absolute inset-0 overflow-hidden rounded-xl cursor-pointer"
                      onClick={() => toggleCardFlip(role.id)}
                      style={{ 
                        backgroundColor: '#16254F',
                        border: '1px solid rgba(0, 191, 255, 0.5)',
                        backfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                        boxShadow: '0 0 30px rgba(0, 191, 255, 0.3)'
                      }}
                    >
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #16254F 0%, #0a0f1f 100%)' }} />
                      <div className="p-8 relative flex flex-col h-full">
                        <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(0, 191, 255, 0.2)', border: '1px solid rgba(0, 191, 255, 0.5)' }}>
                          <role.icon className="h-6 w-6" style={{ color: '#00BFFF' }} aria-hidden="true" />
                        </div>
                        <h3 className="text-2xl font-bold mb-3" style={{ color: '#00BFFF' }}>{role.backGreeting}</h3>
                        <p className="text-sm leading-relaxed flex-1" style={{ color: '#ACBBC6' }}>
                          {role.backDescription}
                        </p>
                        <div className="mt-6 flex items-center gap-4">
                          <Button 
                            onClick={(e) => { e.stopPropagation(); handleRoleClick(role.link); }}
                            className="bg-white text-gray-900 hover:bg-white/90"
                            data-testid={`button-getstarted-${role.id}`}
                          >
                            Get Started
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                          <span className="text-xs" style={{ color: '#667D9D' }}>Click to flip back</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      <section className="py-20 relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${employeeSectionBg})` }}
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(6, 8, 23, 0.85) 0%, rgba(6, 8, 23, 0.7) 50%, rgba(6, 8, 23, 0.6) 100%)' }} />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-12">
            <p className="text-xl font-bold mb-2 text-white">Join Our Team</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
              What It's Like Working at FreightFlow
            </h2>
            <p className="text-xl max-w-2xl mx-auto text-white">
              Be part of a team that's revolutionizing India's logistics industry. We're building the future of freight, one load at a time.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-8">
            {[
              {
                id: 'culture',
                subtitle: 'I am part of a',
                title: 'Collaborative Culture',
                description: 'Work with passionate people who care about making logistics better for everyone.',
                image: collaborationImage,
                backTitle: 'Our Team Spirit',
                backDetails: 'At FreightFlow, collaboration is at our core. We hold daily standups, weekly brainstorming sessions, and quarterly team retreats. Our open-door policy means everyone from interns to executives can share ideas. We celebrate wins together, learn from setbacks as a team, and support each other through every challenge.'
              },
              {
                id: 'growth',
                subtitle: 'I have',
                title: 'Growth Opportunities',
                description: 'Learn new skills, take on challenges, and grow your career as we scale.',
                image: growthImage,
                backTitle: 'Your Career Path',
                backDetails: 'We invest in your growth with annual learning budgets, mentorship programs, and clear promotion paths. Access to online courses, industry conferences, and cross-functional projects helps you expand your skillset. Many of our leaders started as individual contributors and grew with the company.'
              },
              {
                id: 'impact',
                subtitle: 'I can',
                title: 'Make an Impact',
                description: 'Your work directly helps thousands of shippers and carriers across India.',
                image: impactImage,
                backTitle: 'Real-World Results',
                backDetails: 'Every feature you build, every process you improve directly impacts thousands of businesses across India. Our platform moves millions of tons of freight annually, supporting livelihoods from solo truck owners to large enterprises. Your work creates real economic value and helps modernize India\'s logistics industry.'
              }
            ].map((benefit) => {
              const isFlipped = flippedCards.has(benefit.id);
              return (
                <div 
                  key={benefit.id}
                  className="relative h-[420px]"
                  style={{ perspective: '1000px' }}
                  data-testid={`card-benefit-${benefit.id}`}
                >
                  <div 
                    className="relative w-full h-full transition-transform duration-700"
                    style={{ 
                      transformStyle: 'preserve-3d',
                      transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                    }}
                  >
                    <div 
                      className="absolute inset-0 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] flex flex-col"
                      onClick={() => toggleCardFlip(benefit.id)}
                      style={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.15)',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        backfaceVisibility: 'hidden',
                        backdropFilter: 'blur(10px)'
                      }}
                    >
                      <div className="p-5 text-center">
                        <p className="text-lg italic mb-1 text-white">{benefit.subtitle}</p>
                        <h3 className="text-xl font-bold text-white mb-3">{benefit.title}</h3>
                        <Button
                          variant="outline"
                          className="px-6"
                          size="sm"
                          style={{ 
                            borderColor: '#FFFFFF',
                            color: '#FFFFFF',
                            backgroundColor: 'transparent'
                          }}
                          onClick={(e) => { e.stopPropagation(); toggleCardFlip(benefit.id); }}
                          data-testid={`button-learn-${benefit.id}`}
                        >
                          LEARN MORE
                        </Button>
                      </div>
                      <div className="h-44 overflow-hidden">
                        <img src={benefit.image} alt={benefit.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="p-4 text-center flex-1 flex items-center justify-center">
                        <p className="text-sm leading-relaxed text-white">{benefit.description}</p>
                      </div>
                    </div>
                    
                    <div 
                      className="absolute inset-0 rounded-xl overflow-hidden cursor-pointer p-6 flex flex-col justify-center"
                      onClick={() => toggleCardFlip(benefit.id)}
                      style={{ 
                        backgroundColor: 'rgba(22, 37, 79, 0.95)',
                        border: '1px solid rgba(0, 191, 255, 0.5)',
                        backfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                        boxShadow: '0 0 30px rgba(0, 191, 255, 0.2)'
                      }}
                    >
                      <h3 className="text-xl font-bold mb-4" style={{ color: '#00BFFF' }}>{benefit.backTitle}</h3>
                      <p className="text-sm leading-relaxed" style={{ color: '#ACBBC6' }}>{benefit.backDetails}</p>
                      <p className="text-xs mt-4" style={{ color: '#667D9D' }}>Click to flip back</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-center">
            <Button 
              variant="outline"
              onClick={() => handleRoleClick('/auth?role=admin')}
              className="px-8"
              style={{ 
                backgroundColor: 'transparent',
                borderColor: '#FFFFFF',
                color: '#FFFFFF'
              }}
              data-testid="button-staff-login"
            >
              Staff Login
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      <section className="py-20 relative" style={{ 
          backgroundImage: `url(${platformBgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}>
        <div className="absolute inset-0" style={{ backgroundColor: 'rgba(255, 255, 255, 0.4)' }} />
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-12">
            <p className="text-sm font-medium mb-2" style={{ color: '#00BFFF' }}>Our Platform</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#060817' }}>
              Grow your business for the long haul
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: '#333333' }}>
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
                      border: activeFeature === index ? '2px solid rgba(0, 191, 255, 0.8)' : '2px solid rgba(0, 191, 255, 0.4)',
                      boxShadow: activeFeature === index 
                        ? '0 0 40px rgba(0, 191, 255, 0.7), 0 0 80px rgba(0, 191, 255, 0.4)' 
                        : '0 0 15px rgba(0, 191, 255, 0.2)',
                      animation: 'pulse-glow 2s ease-in-out infinite'
                    }}
                    onMouseEnter={(e) => {
                      if (activeFeature !== index) {
                        e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 191, 255, 0.6), 0 0 60px rgba(0, 191, 255, 0.3)';
                        e.currentTarget.style.borderColor = 'rgba(0, 191, 255, 0.7)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activeFeature !== index) {
                        e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 191, 255, 0.2)';
                        e.currentTarget.style.borderColor = 'rgba(0, 191, 255, 0.4)';
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
                <span key={index} className="text-lg font-semibold text-center max-w-[160px]" style={{ color: activeFeature === index ? '#00BFFF' : '#333333' }}>
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
          @keyframes heroLevitate {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-12px); }
          }
        `}</style>
      </section>

      <section className="py-20 relative" style={{ backgroundColor: '#0a1225' }}>
        <div 
          className="absolute inset-0"
          style={{ 
            backgroundImage: `url(${ctaBackgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.25
          }}
        />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(0, 191, 255, 0.08) 0%, transparent 70%)' }} />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-5xl mx-auto rounded-2xl p-8 md:p-12 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(22, 37, 79, 0.95) 0%, rgba(102, 125, 157, 0.9) 100%)', backdropFilter: 'blur(8px)', border: '1px solid rgba(0, 191, 255, 0.3)', boxShadow: '0 0 40px rgba(0, 191, 255, 0.15)' }}>
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
                <svg viewBox="0 0 64 64" className="h-14 w-14 mb-4 mx-auto lg:mx-0" aria-hidden="true">
                  <defs>
                    <linearGradient id="personGrad1" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#00BFFF" />
                      <stop offset="100%" stopColor="#0066CC" />
                    </linearGradient>
                    <linearGradient id="personGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#FFFFFF" />
                      <stop offset="100%" stopColor="#ACBBC6" />
                    </linearGradient>
                  </defs>
                  <circle cx="22" cy="16" r="10" fill="url(#personGrad1)" />
                  <ellipse cx="22" cy="14" rx="3" ry="2" fill="rgba(255,255,255,0.3)" />
                  <path d="M6 52 C6 38 14 32 22 32 C30 32 38 38 38 52 L38 56 L6 56 Z" fill="url(#personGrad1)" />
                  <rect x="10" y="40" width="24" height="2" rx="1" fill="rgba(255,255,255,0.2)" />
                  <circle cx="42" cy="20" r="8" fill="url(#personGrad2)" />
                  <ellipse cx="42" cy="18" rx="2.5" ry="1.5" fill="rgba(0,191,255,0.3)" />
                  <path d="M30 56 C30 44 36 38 42 38 C48 38 54 44 54 56 L54 58 L30 58 Z" fill="url(#personGrad2)" />
                  <rect x="34" y="48" width="16" height="2" rx="1" fill="rgba(0,191,255,0.2)" />
                  <path d="M36 28 C38 26 40 26 42 28" stroke="#00BFFF" strokeWidth="2" fill="none" strokeLinecap="round" />
                  <path d="M20 28 C22 26 24 26 26 28" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
                </svg>
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

      <footer className="py-8 bg-white dark:bg-[#0a1225] border-t border-gray-200 dark:border-[rgba(0,191,255,0.2)]">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: 'rgba(0, 191, 255, 0.2)', border: '1px solid rgba(0, 191, 255, 0.4)' }}>
                <Truck className="h-4 w-4" style={{ color: '#00BFFF' }} />
              </div>
              <span className="font-semibold text-gray-900 dark:text-white">FreightFlow</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-[#667D9D]">
              Digital Freight Marketplace. Connecting shippers with trusted carriers.
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-[#ACBBC6]">
              <span className="hover:text-gray-900 dark:hover:text-white cursor-pointer transition-colors">Privacy Policy</span>
              <span className="hover:text-gray-900 dark:hover:text-white cursor-pointer transition-colors">Terms of Service</span>
              <span className="hover:text-gray-900 dark:hover:text-white cursor-pointer transition-colors">Contact</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
