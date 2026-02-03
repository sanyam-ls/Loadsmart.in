import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth-context";
import { ChevronLeft, ChevronRight, ChevronDown, Search, Facebook, Linkedin, Youtube, Instagram, UserCheck, LayoutGrid, Zap, ShieldCheck, MapPin, BarChart3 } from "lucide-react";
import { SiX } from "react-icons/si";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import logoPath from "@assets/Purple_and_Black_Modern_Software_Developer_LinkedIn_Banner_1770118882647.png";

export default function LandingPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [currentHeroSlide, setCurrentHeroSlide] = useState(0);

  // Hero slides data
  const heroSlides = [
    {
      title: "Smarter tools for every carrier",
      subtitle: "Get access to India's largest freight network so you can get the best load first - and fast - plus tools to maximize profits.",
      image: "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=1200&h=800&fit=crop"
    },
    {
      title: "Connect with trusted shippers",
      subtitle: "Find reliable loads and build lasting partnerships with verified shippers across the country.",
      image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200&h=800&fit=crop"
    },
    {
      title: "Maximize your freight profits",
      subtitle: "Use our analytics tools to optimize routes, reduce empty miles, and increase your earnings.",
      image: "https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=1200&h=800&fit=crop"
    }
  ];

  // Auto-advance hero carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentHeroSlide((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const nextHeroSlide = () => {
    setCurrentHeroSlide((prev) => (prev + 1) % heroSlides.length);
  };

  const prevHeroSlide = () => {
    setCurrentHeroSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  };

  const roleCards = [
    {
      role: "Driver",
      shortDescription: "Own your truck, own your future.",
      detailedDescription: "As a Solo Driver, you get exclusive access to our Solo Carrier Portal. Find and accept loads directly, manage your trips in real-time, track your earnings, upload documents, and stay compliant with automated expiry alerts. Your truck, your rules, your profits.",
      image: "/assets/E5B529F0-62F3-4B17-80D6-64685531E0FA_1770123487619.png"
    },
    {
      role: "Carrier",
      shortDescription: "Grow your fleet business with confidence.",
      detailedDescription: "As a Fleet Carrier, manage your entire fleet from one powerful dashboard. Assign trucks and drivers to loads, track all shipments in real-time, bid on marketplace loads, manage invoices, and maximize fleet utilization. Scale your business with India's largest freight network.",
      image: "/assets/708CC45D-8B89-4450-992D-90158D6A2F5D_1770123616290.png"
    },
    {
      role: "Shipper",
      shortDescription: "Take charge of your logistics network.",
      detailedDescription: "As a Shipper, post your loads and connect with verified carriers instantly. Get competitive pricing, track shipments in real-time with GPS telematics, manage documents digitally, and gain 360-degree visibility into your transportation network. Streamline your supply chain today.",
      image: "/assets/PHOTO-2026-01-21-00-10-30_1770123244936.jpg"
    }
  ];

  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});

  const handleGetStarted = () => {
    setLocation("/auth");
  };

  const handleLogin = () => {
    setLocation("/auth");
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0d1117]">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-[#1a1a2e] border-b border-[#1a1a2e]">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          {/* Logo */}
          <div className="flex items-center">
            <img 
              src={logoPath}
              alt="Load Smart" 
              className="h-10 w-auto object-contain"
              data-testid="img-logo"
            />
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 text-sm text-gray-300" data-testid="nav-products">
                Products <ChevronDown className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-[#1a1a2e] border-gray-700">
                <DropdownMenuItem data-testid="menu-item-load-board">Load Board</DropdownMenuItem>
                <DropdownMenuItem data-testid="menu-item-rateview">Rateview Analytics</DropdownMenuItem>
                <DropdownMenuItem data-testid="menu-item-iq">iQ Analytics</DropdownMenuItem>
                <DropdownMenuItem data-testid="menu-item-outgo">Load Smart Outgo</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 text-sm text-gray-300" data-testid="nav-solutions">
                Solutions <ChevronDown className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-[#1a1a2e] border-gray-700">
                <DropdownMenuItem data-testid="menu-item-brokers">For Brokers</DropdownMenuItem>
                <DropdownMenuItem data-testid="menu-item-carriers">For Carriers</DropdownMenuItem>
                <DropdownMenuItem data-testid="menu-item-shippers">For Shippers</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 text-sm text-gray-300" data-testid="nav-resources">
                Resources <ChevronDown className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-[#1a1a2e] border-gray-700">
                <DropdownMenuItem data-testid="menu-item-blog">Blog</DropdownMenuItem>
                <DropdownMenuItem data-testid="menu-item-faqs">FAQs</DropdownMenuItem>
                <DropdownMenuItem data-testid="menu-item-guides">Guides</DropdownMenuItem>
                <DropdownMenuItem data-testid="menu-item-videos">Videos</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" className="text-sm text-gray-300" data-testid="nav-contact">
              Contact
            </Button>
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="text-gray-300" data-testid="button-search">
              <Search className="h-5 w-5" />
            </Button>
            <ThemeToggle />
            <Button 
              onClick={handleLogin}
              variant="ghost"
              className="text-sm text-gray-300"
              data-testid="button-login"
            >
              Login
            </Button>
            <Button 
              onClick={handleGetStarted}
              variant="ghost"
              className="text-sm text-white"
              data-testid="button-signup"
            >
              Signup
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section with Video Background */}
      <section className="relative h-[600px] overflow-hidden" data-testid="section-hero">
        {/* Video Background */}
        <video 
          autoPlay 
          loop 
          muted 
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          data-testid="video-hero-background"
        >
          <source src="/assets/Loadlink_1770122436363.mp4" type="video/mp4" />
        </video>
        {/* Dark overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#1a1a2e]/90 via-[#1a1a2e]/70 to-transparent" />

        {/* Hero Content */}
        <div className="relative z-10 container mx-auto h-full flex items-center px-4">
          <div className="max-w-xl">
            <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight mb-6" data-testid="text-hero-title">
              {heroSlides[currentHeroSlide].title}
            </h1>
            <p className="text-lg text-gray-300 mb-8 leading-relaxed" data-testid="text-hero-subtitle">
              {heroSlides[currentHeroSlide].subtitle}
            </p>
            <Button 
              onClick={handleGetStarted}
              size="lg"
              className="bg-[#3366FF] text-white rounded-full text-sm font-semibold uppercase tracking-wider"
              data-testid="button-get-started"
            >
              Get Started
            </Button>
          </div>
        </div>

        {/* Carousel Navigation Arrows */}
        <Button 
          onClick={prevHeroSlide}
          variant="ghost"
          size="icon"
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 text-white/70"
          data-testid="button-hero-prev"
        >
          <ChevronLeft className="h-8 w-8" />
        </Button>
        <Button 
          onClick={nextHeroSlide}
          variant="ghost"
          size="icon"
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 text-white/70"
          data-testid="button-hero-next"
        >
          <ChevronRight className="h-8 w-8" />
        </Button>

        {/* Carousel Dots */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {heroSlides.map((_, index) => (
            <Button
              key={index}
              onClick={() => setCurrentHeroSlide(index)}
              variant="ghost"
              size="icon"
              className={`rounded-full ${
                index === currentHeroSlide ? 'bg-white' : 'bg-white/40'
              }`}
              data-testid={`button-hero-dot-${index}`}
            >
              <span className="sr-only">Slide {index + 1}</span>
            </Button>
          ))}
        </div>
      </section>

      {/* Role Cards Section */}
      <section className="py-20 bg-white dark:bg-[#0d1117]">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            {roleCards.map((card) => (
              <div 
                key={card.role}
                className="relative h-[500px] cursor-pointer perspective-1000"
                style={{ perspective: '1000px' }}
                onClick={() => setFlippedCards(prev => ({ ...prev, [card.role]: !prev[card.role] }))}
                data-testid={`card-role-${card.role.toLowerCase()}`}
              >
                <div 
                  className="relative w-full h-full transition-transform duration-700"
                  style={{ 
                    transformStyle: 'preserve-3d',
                    transform: flippedCards[card.role] ? 'rotateY(180deg)' : 'rotateY(0deg)'
                  }}
                >
                  {/* Front of card */}
                  <div 
                    className="absolute inset-0 bg-white dark:bg-[#161b22] rounded-lg shadow-lg backface-hidden"
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    <div className="p-8 text-center">
                      <p className="text-gray-600 dark:text-gray-300 text-xl mb-2">I am a</p>
                      <h3 className="text-4xl font-black text-[#2855CC] mb-6">{card.role}</h3>
                      <Button 
                        className="bg-[#3366FF] text-white rounded-full text-sm font-semibold uppercase tracking-wider"
                        data-testid={`button-get-started-${card.role.toLowerCase()}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setFlippedCards(prev => ({ ...prev, [card.role]: true }));
                        }}
                      >
                        Get Started
                      </Button>
                    </div>
                    <div className="relative h-48 overflow-hidden">
                      <img 
                        src={card.image} 
                        alt={card.role}
                        className="w-full h-full object-cover"
                        data-testid={`img-role-${card.role.toLowerCase()}`}
                      />
                    </div>
                    <div className="p-6">
                      <p className="text-gray-600 dark:text-gray-400 text-sm text-center leading-relaxed">
                        {card.shortDescription}
                      </p>
                    </div>
                  </div>

                  {/* Back of card */}
                  <div 
                    className="absolute inset-0 bg-[#2855CC] dark:bg-[#1e4499] rounded-lg shadow-lg p-8 flex flex-col justify-between"
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                  >
                    <div>
                      <h3 className="text-3xl font-black text-white mb-4">{card.role}</h3>
                      <p className="text-white/90 text-base leading-relaxed mb-6">
                        {card.detailedDescription}
                      </p>
                    </div>
                    <div className="space-y-3">
                      <Button 
                        className="w-full bg-white text-[#2855CC] rounded-full text-sm font-semibold uppercase tracking-wider"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGetStarted();
                        }}
                        data-testid={`button-signup-${card.role.toLowerCase()}`}
                      >
                        Sign Up Now
                      </Button>
                      <Button 
                        variant="outline"
                        className="w-full border-white text-white rounded-full text-sm font-semibold uppercase tracking-wider"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFlippedCards(prev => ({ ...prev, [card.role]: false }));
                        }}
                        data-testid={`button-back-${card.role.toLowerCase()}`}
                      >
                        Go Back
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Grow Your Business Section */}
      <section className="py-16 bg-white dark:bg-[#0d1117]">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold italic text-gray-900 dark:text-white mb-6" data-testid="text-grow-title">
            Grow your business for the long haul
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
            We match the right load to the right truck at the right price, with trusted insights since 2020. 
            Succeed on India's fastest growing freight network.
          </p>
        </div>
      </section>

      {/* AI Platform Section */}
      <section className="relative py-24">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/assets/7181445E-ECEF-4FE4-9951-343B8B9C7286_1770125833116.png')" }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-[#0d1117]/80 via-[#0d1117]/70 to-[#0d1117]/80" />
        </div>
        <div className="relative z-10 container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-8 drop-shadow-lg" data-testid="text-ai-platform-title">
            India's First AI-Powered Logistics Platform
          </h2>
          <div className="bg-[#0d1117]/70 backdrop-blur-sm rounded-xl p-8 max-w-5xl mx-auto border border-white/10">
            <p className="text-white text-lg md:text-xl leading-relaxed" data-testid="text-ai-platform-description">
              Our intelligent automation transforms freight operations across every portal. <span className="text-[#3366FF] font-semibold">Shippers</span> get AI-powered truck recommendations and smart pricing. <span className="text-[#3366FF] font-semibold">Carriers</span> benefit from algorithmic load matching and route optimization. <span className="text-[#3366FF] font-semibold">Admins</span> leverage real-time analytics and automated compliance tracking. From document verification to predictive ETA calculations, our <span className="text-[#3366FF] font-semibold">AI Concierge</span> works 24/7 to reduce manual work, eliminate errors, and accelerate every transaction.
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white dark:bg-[#0d1117]">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-bold text-center text-gray-900 dark:text-white mb-4" data-testid="text-features-title">
            Platform Features
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-16 max-w-2xl mx-auto">
            Everything you need to streamline your freight operations
          </p>
          
          {/* First Row */}
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            {/* Effortless Onboarding Card */}
            <div className="bg-gray-100 dark:bg-[#161b22] rounded-lg p-8" data-testid="card-feature-onboarding">
              <div className="w-12 h-12 bg-[#3366FF]/10 rounded-lg flex items-center justify-center mb-4">
                <UserCheck className="w-6 h-6 text-[#3366FF]" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Effortless Onboarding & Ease of Use</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                No steep learning curve. No technical dependency. Shippers and carriers get productive on Day One with an intuitive, role-based interface.
              </p>
              <p className="text-[#3366FF] text-sm font-semibold">
                Software that works the way logistics already works.
              </p>
            </div>

            {/* Unified Digital Load Marketplace Card */}
            <div className="bg-[#1a1a2e] rounded-lg p-8" data-testid="card-feature-marketplace">
              <div className="w-12 h-12 bg-[#3366FF]/20 rounded-lg flex items-center justify-center mb-4">
                <LayoutGrid className="w-6 h-6 text-[#3366FF]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Unified Digital Load Marketplace</h3>
              <p className="text-gray-300 leading-relaxed mb-4">
                Single pane of glass for shippers, carriers, fleet owners, and brokers. Post loads, bid, assign, and track—without fragmentation or phone chaos.
              </p>
              <p className="text-[#3366FF] text-sm font-semibold">
                Speed + liquidity + transparency.
              </p>
            </div>

            {/* Smart Matching & Pricing Engine Card */}
            <div className="bg-gray-100 dark:bg-[#161b22] rounded-lg p-8" data-testid="card-feature-matching">
              <div className="w-12 h-12 bg-[#3366FF]/10 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-[#3366FF]" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Smart Matching & Pricing Engine</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                Algorithmic load-to-carrier matching using lane history, truck type, availability, and performance data. Dynamic pricing reduces empty miles and rate disputes.
              </p>
              <p className="text-[#3366FF] text-sm font-semibold">
                Higher margins, faster closes.
              </p>
            </div>
          </div>

          {/* Second Row */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Carrier Trust & Verification Card */}
            <div className="bg-[#1a1a2e] rounded-lg p-8" data-testid="card-feature-verification">
              <div className="w-12 h-12 bg-[#3366FF]/20 rounded-lg flex items-center justify-center mb-4">
                <ShieldCheck className="w-6 h-6 text-[#3366FF]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Carrier Trust & Verification Layer</h3>
              <p className="text-gray-300 leading-relaxed mb-4">
                Built-in KYC, document validation, performance scoring, and compliance tracking. Only verified carriers operate in the ecosystem.
              </p>
              <p className="text-[#3366FF] text-sm font-semibold">
                Risk reduction + enterprise trust.
              </p>
            </div>

            {/* Real-Time Shipment Visibility Card */}
            <div className="bg-gray-100 dark:bg-[#161b22] rounded-lg p-8" data-testid="card-feature-visibility">
              <div className="w-12 h-12 bg-[#3366FF]/10 rounded-lg flex items-center justify-center mb-4">
                <MapPin className="w-6 h-6 text-[#3366FF]" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Real-Time Shipment Visibility</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                Live tracking, milestone updates, and exception alerts across the journey. No black boxes. No "where is the truck?" calls.
              </p>
              <p className="text-[#3366FF] text-sm font-semibold">
                Control, predictability, accountability.
              </p>
            </div>

            {/* Operations & Analytics Command Center Card */}
            <div className="bg-[#1a1a2e] rounded-lg p-8" data-testid="card-feature-analytics">
              <div className="w-12 h-12 bg-[#3366FF]/20 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-[#3366FF]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Operations & Analytics Command Center</h3>
              <p className="text-gray-300 leading-relaxed mb-4">
                Dashboards for on-time delivery, lane performance, carrier efficiency, and cost optimization. Decision-making powered by data, not gut feel.
              </p>
              <p className="text-[#3366FF] text-sm font-semibold">
                Measurable ROI + operational intelligence.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section - Black & White Hero */}
      <section className="relative py-24">
        <div 
          className="absolute inset-0 bg-cover bg-center grayscale"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=1600&h=600&fit=crop')" }}
        >
          <div className="absolute inset-0 bg-[#1a1a2e]/60" />
        </div>
        <div className="relative z-10 container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white uppercase tracking-wide leading-tight" data-testid="text-about-title">
            We've been taking the<br />
            uncertainty out of<br />
            freight since 2020
          </h2>
        </div>
      </section>

      {/* Company Description Section */}
      <section className="py-16 bg-gray-200 dark:bg-[#21262d]">
        <div className="container mx-auto px-4">
          <p className="text-center text-gray-700 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed" data-testid="text-company-description">
            Load Smart operates India's fastest growing digital freight marketplace; an automated freight-matching technology platform; Load Smart iQ, the industry's leading freight data analytics service; and Load Smart Outgo, the freight financial services platform. Shippers, transportation brokers, carriers, news organizations, and industry analysts rely on Load Smart for market trends and data insights, informed by thousands of daily load posts and a database exceeding ₹1 trillion in freight market transactions. Founded in 2020, Load Smart continues to set the standard for innovation in the trucking and logistics industry.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0d1117] pt-16 pb-8">
        <div className="container mx-auto px-4">
          {/* Footer Links */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <h4 className="text-[#3366FF] font-bold text-sm uppercase tracking-wider mb-4" data-testid="footer-company">COMPANY</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors" data-testid="link-leadership">Leadership</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors" data-testid="link-history">History</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors" data-testid="link-careers">Careers</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors" data-testid="link-news-events">News & Events</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors" data-testid="link-partner">Partner with Us</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[#3366FF] font-bold text-sm uppercase tracking-wider mb-4" data-testid="footer-products">PRODUCTS</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors" data-testid="link-load-board">Load Board</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors" data-testid="link-rateview">Rateview Analytics</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors" data-testid="link-iq-benchmark">iQ Benchmark</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors" data-testid="link-operating-authority">Operating Authority</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors" data-testid="link-product-reviews">Product Reviews</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors" data-testid="link-outgo">Load Smart Outgo</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[#3366FF] font-bold text-sm uppercase tracking-wider mb-4" data-testid="footer-resources">RESOURCES</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors" data-testid="link-faqs">FAQs</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors" data-testid="link-blog">Blog</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors" data-testid="link-press-room">Press Room</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors" data-testid="link-guides">Guides</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors" data-testid="link-videos">Videos</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[#3366FF] font-bold text-sm uppercase tracking-wider mb-4" data-testid="footer-support">SUPPORT</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors" data-testid="link-product-login">Product Login</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors" data-testid="link-fraud-protection">Fraud Protection</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors" data-testid="link-support-request">Support Request</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors" data-testid="link-contact-us">Contact Us</a></li>
              </ul>
            </div>
          </div>

          {/* Social Icons */}
          <div className="flex justify-center gap-6 mb-8">
            <a href="#" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors" data-testid="social-facebook">
              <Facebook className="h-5 w-5" />
              <span className="text-sm">Facebook</span>
            </a>
            <a href="#" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors" data-testid="social-x">
              <SiX className="h-4 w-4" />
              <span className="text-sm">X</span>
            </a>
            <a href="#" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors" data-testid="social-linkedin">
              <Linkedin className="h-5 w-5" />
              <span className="text-sm">LinkedIn</span>
            </a>
            <a href="#" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors" data-testid="social-youtube">
              <Youtube className="h-5 w-5" />
              <span className="text-sm">YouTube</span>
            </a>
            <a href="#" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors" data-testid="social-instagram">
              <Instagram className="h-5 w-5" />
              <span className="text-sm">Instagram</span>
            </a>
          </div>

          {/* App Store Badges */}
          <div className="text-center mb-8">
            <p className="text-gray-500 text-sm mb-4">Download the Load Smart mobile app</p>
            <div className="flex justify-center gap-4">
              <div className="bg-black border border-gray-600 rounded-lg px-4 py-2 flex items-center gap-2" data-testid="badge-app-store">
                <div className="text-white">
                  <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-gray-400 text-[10px]">Download on the</p>
                  <p className="text-white text-sm font-semibold">App Store</p>
                </div>
              </div>
              <div className="bg-black border border-gray-600 rounded-lg px-4 py-2 flex items-center gap-2" data-testid="badge-google-play">
                <div className="text-white">
                  <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
                    <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-gray-400 text-[10px]">GET IT ON</p>
                  <p className="text-white text-sm font-semibold">Google Play</p>
                </div>
              </div>
            </div>
          </div>

          {/* Review Badges */}
          <div className="flex justify-center gap-6 mb-8">
            <div className="flex items-center gap-2 text-gray-500" data-testid="review-capterra-1">
              <span className="text-sm">Capterra</span>
              <span className="text-yellow-500">4.5</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500" data-testid="review-g2">
              <span className="text-sm">G2</span>
              <span className="text-yellow-500">4.5</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500" data-testid="review-capterra-2">
              <span className="text-sm">Capterra</span>
              <span className="text-yellow-500">4.6</span>
            </div>
          </div>

          {/* Footer Links */}
          <div className="flex justify-center gap-6 mb-6 text-sm">
            <a href="#" className="text-gray-500 hover:text-white transition-colors" data-testid="link-marketing-index">Marketing Index</a>
            <a href="#" className="text-gray-500 hover:text-white transition-colors" data-testid="link-site-map">Site Map</a>
            <a href="#" className="text-gray-500 hover:text-white transition-colors" data-testid="link-legal">Legal</a>
            <a href="#" className="text-gray-500 hover:text-white transition-colors" data-testid="link-privacy-policy">Privacy Policy</a>
          </div>

          {/* Copyright */}
          <div className="text-center">
            <p className="text-gray-600 text-xs" data-testid="text-copyright">
              Copyright 2026 Load Smart Solutions, LLC. All rights reserved. All trademarks are the property of their respective owners.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
