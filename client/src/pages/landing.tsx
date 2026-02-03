import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth-context";
import { ChevronLeft, ChevronRight, ChevronDown, Search, Facebook, Linkedin, Youtube, Instagram } from "lucide-react";
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
      description: "Own your truck, own your future. Access loads directly, manage your trips, track earnings, and stay compliant - all from your Solo Carrier Portal.",
      image: "/assets/E5B529F0-62F3-4B17-80D6-64685531E0FA_1770123487619.png"
    },
    {
      role: "Carrier",
      description: "Find the best loads first on India's largest load board network, with support from dock to dock and beyond.",
      image: "/assets/708CC45D-8B89-4450-992D-90158D6A2F5D_1770123616290.png"
    },
    {
      role: "Shipper",
      description: "Take charge of your transportation and logistics network, with a 360-degree view of truckload markets.",
      image: "/assets/PHOTO-2026-01-21-00-10-30_1770123244936.jpg"
    }
  ];

  const stats = [
    { value: "₹1T+", label: "IN FREIGHT TRANSACTIONS" },
    { value: "235M+", label: "LOADS POSTED ANNUALLY" },
    { value: "150K", label: "TRANSACTIONS PER MINUTE" }
  ];

  const awards = [
    { title: "Top 50", subtitle: "Best Software" },
    { title: "Grid Leader", subtitle: "Spring 2025" },
    { title: "Leader", subtitle: "Load Board 2025" },
    { title: "Leader", subtitle: "Analytics 2025" },
    { title: "Fastest", subtitle: "Implementation" },
    { title: "Best Est. ROI", subtitle: "Spring 2025" }
  ];

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
                className="bg-white dark:bg-[#161b22] rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow"
                data-testid={`card-role-${card.role.toLowerCase()}`}
              >
                <div className="p-8 text-center">
                  <p className="text-gray-500 dark:text-gray-400 text-base mb-1">I am a</p>
                  <h3 className="text-3xl font-extrabold text-[#3366FF] mb-6">{card.role}</h3>
                  <Button 
                    className="bg-[#3366FF] text-white rounded-full text-sm font-semibold uppercase tracking-wider"
                    data-testid={`button-learn-more-${card.role.toLowerCase()}`}
                  >
                    Learn More
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
                    {card.description}
                  </p>
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

      {/* Awards Section */}
      <section className="py-12 bg-[#1a1a2e]">
        <div className="container mx-auto px-4">
          <h3 className="text-center text-white font-bold text-lg mb-8" data-testid="text-awards-title">
            Award-winning freight technology
          </h3>
          <div className="flex flex-wrap justify-center gap-8">
            {awards.map((award, index) => (
              <div 
                key={index}
                className="flex items-center gap-3 bg-[#2a2a4e] rounded-lg px-6 py-4"
                data-testid={`badge-award-${index}`}
              >
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xs font-bold">LS</span>
                </div>
                <div>
                  <p className="text-white font-bold text-sm">{award.title}</p>
                  <p className="text-gray-400 text-xs">{award.subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative py-24">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?w=1600&h=600&fit=crop')" }}
        >
          <div className="absolute inset-0 bg-[#1a1a2e]/70" />
        </div>
        <div className="relative z-10 container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-12 text-center">
            {stats.map((stat, index) => (
              <div key={index} data-testid={`stat-${index}`}>
                <p className="text-5xl md:text-6xl font-bold text-white mb-2">{stat.value}</p>
                <p className="text-white/80 text-sm font-semibold tracking-wider uppercase">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Products Grid Section */}
      <section className="py-20 bg-white dark:bg-[#0d1117]">
        <div className="container mx-auto px-4">
          {/* First Row */}
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            {/* Load Smart One Card */}
            <div className="bg-[#1a1a2e] rounded-lg p-8 flex flex-col justify-between" data-testid="card-product-one">
              <div>
                <div className="mb-4">
                  <img 
                    src={logoPath}
                    alt="Load Smart" 
                    className="h-8 w-auto object-contain mb-4"
                  />
                </div>
                <h3 className="text-3xl font-bold text-[#3366FF] mb-2">One</h3>
                <p className="text-white text-xl font-semibold mb-1">Freight</p>
                <p className="text-white font-bold mb-6">End-to-End Solutions</p>
              </div>
              <Button 
                className="bg-[#3366FF] text-white rounded-full text-sm font-semibold uppercase tracking-wider"
                data-testid="button-learn-more-one"
              >
                Learn More
              </Button>
            </div>

            {/* Truck Highway Image */}
            <div className="rounded-lg overflow-hidden h-64 md:h-auto">
              <img 
                src="https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=600&h=400&fit=crop"
                alt="Freight truck on highway"
                className="w-full h-full object-cover"
                data-testid="img-truck-highway"
              />
            </div>

            {/* Smart Factoring Card */}
            <div className="bg-gray-100 dark:bg-[#161b22] rounded-lg p-8 flex flex-col justify-between" data-testid="card-product-factoring">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Smart Factoring</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                  Get paid fast with automated invoicing, no annual contracts, and rates as low as 1.0%.
                </p>
              </div>
              <Button 
                className="bg-[#3366FF] text-white rounded-full text-sm font-semibold uppercase tracking-wider"
                data-testid="button-learn-more-factoring"
              >
                Learn More
              </Button>
            </div>
          </div>

          {/* Second Row */}
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            {/* Rateview Analytics Card */}
            <div className="bg-gray-100 dark:bg-[#161b22] rounded-lg p-8" data-testid="card-product-rateview">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Rateview Analytics</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                The industry standard in truckload pricing data. See the most current spot and contract truckload rates across all lanes in India.
              </p>
              <Button 
                className="bg-[#3366FF] text-white rounded-full text-sm font-semibold uppercase tracking-wider"
                data-testid="button-learn-more-rateview"
              >
                Learn More
              </Button>
            </div>

            {/* Warehouse Image */}
            <div className="rounded-lg overflow-hidden h-64 md:h-auto">
              <img 
                src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&h=400&fit=crop"
                alt="Warehouse"
                className="w-full h-full object-cover"
                data-testid="img-warehouse"
              />
            </div>

            {/* iQ Analytics Card */}
            <div className="bg-[#1a1a2e] rounded-lg p-8 flex flex-col justify-between" data-testid="card-product-iq">
              <div>
                <div className="mb-4">
                  <img 
                    src={logoPath}
                    alt="Load Smart" 
                    className="h-8 w-auto object-contain mb-4"
                  />
                </div>
                <h3 className="text-4xl font-bold text-[#3366FF] mb-2">iQ</h3>
                <p className="text-white text-xl font-semibold mb-4">Analytics</p>
                <p className="text-white font-bold">The Most Accurate Insights</p>
              </div>
              <Button 
                className="bg-[#3366FF] text-white rounded-full text-sm font-semibold uppercase tracking-wider mt-6"
                data-testid="button-learn-more-iq"
              >
                Learn More
              </Button>
            </div>
          </div>

          {/* Third Row */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Outgo Factoring Card */}
            <div className="bg-[#1a1a2e] rounded-lg p-8 flex flex-col justify-between" data-testid="card-product-outgo">
              <div>
                <div className="mb-4">
                  <img 
                    src={logoPath}
                    alt="Load Smart" 
                    className="h-8 w-auto object-contain mb-4"
                  />
                </div>
                <h3 className="text-3xl font-bold text-[#3366FF] mb-2">Outgo</h3>
                <p className="text-white text-xl font-semibold mb-4">Factoring</p>
                <p className="text-white font-bold">Get paid faster</p>
              </div>
              <Button 
                className="bg-[#3366FF] text-white rounded-full text-sm font-semibold uppercase tracking-wider mt-6"
                data-testid="button-learn-more-outgo"
              >
                Learn More
              </Button>
            </div>

            {/* Illustration/Diagram */}
            <div className="bg-white dark:bg-[#161b22] rounded-lg p-8 flex items-center justify-center">
              <div className="relative w-full h-48">
                {/* Simple illustration representing freight flow */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full border-2 border-[#3366FF] flex items-center justify-center">
                      <span className="text-[#3366FF] text-2xl font-bold">$</span>
                    </div>
                    <div className="w-8 h-0.5 bg-[#3366FF]" />
                    <div className="w-16 h-16 rounded-full border-2 border-[#3366FF] flex items-center justify-center">
                      <span className="text-[#3366FF] text-lg">Truck</span>
                    </div>
                    <div className="w-8 h-0.5 bg-[#3366FF]" />
                    <div className="w-16 h-16 rounded-full border-2 border-[#3366FF] flex items-center justify-center">
                      <span className="text-[#3366FF] text-2xl font-bold">$</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Factoring on Your Terms Card */}
            <div className="bg-gray-100 dark:bg-[#161b22] rounded-lg p-8" data-testid="card-product-terms">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Factoring on Your Terms</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                Put non-recourse factoring work for you with automated invoicing, no long-term contracts, and the freedom to choose which loads to factor.
              </p>
              <Button 
                className="bg-[#3366FF] text-white rounded-full text-sm font-semibold uppercase tracking-wider"
                data-testid="button-learn-more-terms"
              >
                Learn More
              </Button>
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
