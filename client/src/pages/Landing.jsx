import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.jpg';
import heroHighway from '../assets/hero_highway.jpg';
import {
  FiArrowRight, FiShield, FiBarChart2, FiUsers, FiTruck,
  FiCheckCircle, FiStar, FiTrendingUp, FiAward, FiLayers,
  FiHardDrive, FiTarget, FiClock, FiMapPin, FiTool,
  FiMessageSquare, FiMail, FiPhone, FiMenu, FiX
} from 'react-icons/fi';

// ============================================================
// PREMIUM 3D-INSPIRED FLOATING SHAPES
// ============================================================
const FloatingShape = ({ className, children, duration = 6, delay = 0 }) => (
  <motion.div
    className={`absolute pointer-events-none ${className}`}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 1 + delay }}
  >
    <motion.div
      animate={{
        y: [0, -18, 0],
        rotate: [0, 6, 0],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: 'easeInOut',
        delay,
      }}
    >
      {children}
    </motion.div>
  </motion.div>
);

// 3D Gear SVG - Construction theme
const GearSvg = ({ className }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 8C55.5 8 60 11.5 61.5 17L63.5 22C68.5 23 73 26 77 30L82 28C87 26 92.5 29 94.5 34.5L96.5 39C98.5 44 96.5 49 92 52L88.5 55C89.5 60 89.5 66 88.5 71L92 74C96.5 77 98.5 82 96.5 87L94.5 91.5C92.5 97 87 99.5 82 97.5L77 95.5C73 99.5 67.5 101.5 62 101.5L59.5 97C54.5 99 49.5 99 44.5 97L42 101.5C36.5 101.5 31 99.5 27 95.5L22 97.5C17 99.5 11.5 97 9.5 91.5L7.5 87C5.5 82 7.5 77 12 74L15.5 71C14.5 66 14.5 60 15.5 55L12 52C7.5 49 5.5 44 7.5 39L9.5 34.5C11.5 29 17 26.5 22 28.5L27 30.5C31 26.5 36.5 24 42 23.5L44.5 19C46 14 50.5 9.5 56 9L50 8Z" className="stroke-blue-400/20" strokeWidth="2"/>
    <circle cx="50" cy="50" r="16" className="fill-blue-400/10" />
    <circle cx="50" cy="50" r="5" className="fill-blue-500/30" />
    <circle cx="50" cy="50" r="2" className="fill-blue-400/50" />
  </svg>
);

// Bridge Arc SVG
const BridgeSvg = ({ className }) => (
  <svg className={className} viewBox="0 0 200 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 70 Q100 5 190 70" className="stroke-blue-400/20" strokeWidth="3" strokeLinecap="round" />
    <path d="M10 70 Q100 15 190 70" className="stroke-blue-400/12" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M10 70 Q100 25 190 70" className="stroke-blue-400/8" strokeWidth="1" strokeLinecap="round" />
    <line x1="60" y1="70" x2="60" y2="45" className="stroke-blue-400/15" strokeWidth="2" />
    <line x1="100" y1="70" x2="100" y2="35" className="stroke-blue-400/15" strokeWidth="2" />
    <line x1="140" y1="70" x2="140" y2="45" className="stroke-blue-400/15" strokeWidth="2" />
  </svg>
);

// Hexagon Grid SVG
const HexSvg = ({ className }) => (
  <svg className={className} viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
    <polygon points="90,5 137,35 137,95 90,125 43,95 43,35" className="stroke-blue-400/12" strokeWidth="1" />
    <polygon points="90,25 125,48 125,82 90,105 55,82 55,48" className="stroke-blue-400/8" strokeWidth="1" />
    <polygon points="90,105 115,120 115,150 90,165 65,150 65,120" className="stroke-blue-400/6" strokeWidth="1" />
    <line x1="90" y1="125" x2="90" y2="165" className="stroke-blue-400/6" strokeWidth="1" />
    <line x1="90" y1="5" x2="90" y2="25" className="stroke-blue-400/8" strokeWidth="1" />
  </svg>
);

// Isometric cube SVG
const CubeSvg = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <polygon points="40,5 72,25 72,55 40,75 8,55 8,25" className="stroke-amber-400/15" strokeWidth="1.5" fill="none" />
    <polygon points="40,20 58,30 58,50 40,60 22,50 22,30" className="stroke-amber-400/10" strokeWidth="1" fill="none" />
    <line x1="8" y1="25" x2="40" y2="20" className="stroke-amber-400/8" strokeWidth="1" />
    <line x1="72" y1="25" x2="40" y2="20" className="stroke-amber-400/8" strokeWidth="1" />
    <line x1="8" y1="55" x2="40" y2="60" className="stroke-amber-400/8" strokeWidth="1" />
    <line x1="72" y1="55" x2="40" y2="60" className="stroke-amber-400/8" strokeWidth="1" />
  </svg>
);

// ============================================================
// PARALLAX BACKGROUND
// ============================================================
const ParallaxBackground = () => {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, -120]);
  const y2 = useTransform(scrollY, [0, 500], [0, -250]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0.6]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Main 3D-style background image */}
      <motion.div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
        style={{ y: y1, opacity, backgroundImage: `url(${heroHighway})` }}
      />

      {/* Multi-layer premium overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-950/75 via-gray-950/55 to-gray-950/85" />
      <div className="absolute inset-0 bg-gradient-to-r from-blue-950/20 via-transparent to-indigo-950/20" />
      <div className="absolute inset-0 bg-gradient-to-t from-gray-950/65 via-transparent to-transparent" />

      {/* Animated grid overlay */}
      <motion.div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'linear-gradient(rgba(96,165,250,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(96,165,250,0.3) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          y: y2,
        }}
      />

      {/* Construction dots pattern */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(96,165,250,0.4) 1px, transparent 1px)',
          backgroundSize: '30px 30px',
        }}
      />

      {/* 3D-inspired floating shapes */}
      <FloatingShape className="top-[12%] left-[5%] w-28 h-28" duration={7} delay={0}>
        <GearSvg className="w-full h-full" />
      </FloatingShape>

      <FloatingShape className="top-[20%] right-[8%] w-36 h-20" duration={8} delay={1}>
        <BridgeSvg className="w-full h-full" />
      </FloatingShape>

      <FloatingShape className="bottom-[35%] left-[3%] w-24 h-24" duration={9} delay={0.5}>
        <HexSvg className="w-full h-full" />
      </FloatingShape>

      <FloatingShape className="top-[45%] right-[4%] w-20 h-20" duration={6} delay={2}>
        <GearSvg className="w-full h-full" />
      </FloatingShape>

      <FloatingShape className="bottom-[25%] right-[15%] w-24 h-14 opacity-60" duration={7} delay={1.5}>
        <BridgeSvg className="w-full h-full" />
      </FloatingShape>

      <FloatingShape className="top-[60%] left-[10%] w-16 h-16" duration={8} delay={0.8}>
        <CubeSvg className="w-full h-full" />
      </FloatingShape>

      {/* Animated gradient orbs */}
      <motion.div
        className="absolute top-1/5 left-1/4 w-[500px] h-[500px] rounded-full bg-blue-500/8 blur-[150px]"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-indigo-500/8 blur-[120px]"
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.4, 0.2, 0.4],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-2/3 left-2/3 w-[300px] h-[300px] rounded-full bg-amber-500/5 blur-[100px]"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5 }}
      >
        <motion.div
          className="flex flex-col items-center gap-2"
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <span className="text-[10px] text-white/30 tracking-widest uppercase">Scroll</span>
          <div className="w-5 h-8 rounded-full border-2 border-white/15 flex items-start justify-center pt-1.5">
            <motion.div
              className="w-1 h-2 rounded-full bg-white/60"
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

// ============================================================
// FEATURE CARD - Premium Glass
// ============================================================
const FeatureCard = ({ icon: Icon, title, desc, index, color = 'blue' }) => {
  const cardRef = useRef(null);
  const isInView = useInView(cardRef, { once: true, margin: '-50px' });

  const accentGradients = {
    blue: 'from-blue-500/20 to-indigo-500/20',
    amber: 'from-amber-500/20 to-orange-500/20',
    emerald: 'from-emerald-500/20 to-teal-500/20',
    purple: 'from-purple-500/20 to-pink-500/20',
  };

  const iconColors = {
    blue: 'text-blue-400',
    amber: 'text-amber-400',
    emerald: 'text-emerald-400',
    purple: 'text-purple-400',
  };

  const glowColors = {
    blue: 'from-blue-500/10 via-blue-500/5 to-indigo-500/10',
    amber: 'from-amber-500/10 via-amber-500/5 to-orange-500/10',
    emerald: 'from-emerald-500/10 via-emerald-500/5 to-teal-500/10',
    purple: 'from-purple-500/10 via-purple-500/5 to-pink-500/10',
  };

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: index * 0.1, duration: 0.5, type: 'spring', stiffness: 80 }}
      className="group relative"
    >
      {/* Glow effect on hover */}
      <div className={`absolute -inset-0.5 bg-gradient-to-r ${glowColors[color]} blur-xl transition-all duration-500 opacity-0 group-hover:opacity-100 rounded-2xl`} />

      <div className="relative glass-card rounded-2xl p-7 h-full">
        {/* Shimmer border on hover */}
        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, transparent 0%, rgba(59,130,246,0.1) 50%, transparent 100%)',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            padding: '1px',
          }}
        />

        <div className="relative z-10">
          {/* Icon container */}
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${accentGradients[color]} flex items-center justify-center mb-5 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
            <Icon className={`w-7 h-7 ${iconColors[color]}`} />
          </div>

          {/* Content */}
          <h3 className="text-white font-bold text-lg mb-2 group-hover:text-blue-300 transition-colors duration-300">
            {title}
          </h3>
          <p className="text-sm text-gray-400 leading-relaxed">
            {desc}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================================
// STAT COUNTER
// ============================================================
const StatCounter = ({ value, label, suffix = '+', icon: Icon, color = 'blue' }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  const colorClasses = {
    blue: 'from-blue-400 to-blue-600',
    amber: 'from-amber-400 to-amber-600',
    emerald: 'from-emerald-400 to-emerald-600',
    purple: 'from-purple-400 to-purple-600',
  };

  const borderColors = {
    blue: 'border-blue-500/20',
    amber: 'border-amber-500/20',
    emerald: 'border-emerald-500/20',
    purple: 'border-purple-500/20',
  };

  const bgColors = {
    blue: 'bg-blue-500/10',
    amber: 'bg-amber-500/10',
    emerald: 'bg-emerald-500/10',
    purple: 'bg-purple-500/10',
  };

  const iconColors = {
    blue: 'text-blue-400',
    amber: 'text-amber-400',
    emerald: 'text-emerald-400',
    purple: 'text-purple-400',
  };

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const duration = 2000;
    const increment = value / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [isInView, value]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5 }}
      className={`text-center p-6 rounded-2xl bg-white/[0.03] border ${borderColors[color]} backdrop-blur-sm`}
    >
      <div className={`w-12 h-12 rounded-xl ${bgColors[color]} flex items-center justify-center mx-auto mb-3`}>
        <Icon className={`w-6 h-6 ${iconColors[color]}`} />
      </div>
      <div className={`text-3xl sm:text-4xl font-extrabold bg-gradient-to-r ${colorClasses[color]} bg-clip-text text-transparent`}>
        {count}{suffix}
      </div>
      <p className="text-sm text-gray-400 mt-1.5 font-medium">{label}</p>
    </motion.div>
  );
};

// ============================================================
// TESTIMONIAL CARD
// ============================================================
const TestimonialCard = ({ quote, author, role, company, index }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-30px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: index * 0.15, duration: 0.5 }}
      className="glass-card rounded-2xl p-8 relative"
    >
      <FiMessageSquare className="absolute top-5 right-6 w-8 h-8 text-blue-500/10" />
      <p className="text-gray-300 leading-relaxed mb-6 italic">
        &ldquo;{quote}&rdquo;
      </p>
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
          {author.split(' ').map(n => n[0]).join('')}
        </div>
        <div>
          <p className="text-white font-semibold text-sm">{author}</p>
          <p className="text-gray-500 text-xs">{role}, {company}</p>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================================
// STEP CARD - How It Works
// ============================================================
const StepCard = ({ number, title, desc, icon: Icon }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -20 }}
      animate={isInView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.5 }}
      className="relative flex gap-6"
    >
      {/* Step number */}
      <div className="flex flex-col items-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-600/30 shrink-0">
          {number}
        </div>
        <div className="w-px flex-1 bg-gradient-to-b from-blue-500/30 to-transparent mt-3" />
      </div>

      {/* Content */}
      <div className="pb-12">
        <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-3">
          <Icon className="w-6 h-6 text-blue-400" />
        </div>
        <h3 className="text-white font-bold text-lg mb-1.5">{title}</h3>
        <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
      </div>
    </motion.div>
  );
};

// ============================================================
// PARALLAX SECTION WRAPPER
// ============================================================
const SectionWrapper = ({ children, className = '' }) => (
  <section className={`relative px-6 ${className}`}>
    {children}
  </section>
);

// ============================================================
// LANDING PAGE
// ============================================================
const Landing = () => {
  const { isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(isAdmin ? '/admin/dashboard' : '/user/dashboard', { replace: true });
    }
  }, [isAuthenticated, isAdmin, navigate]);

  if (isAuthenticated) return null;

  const features = [
    { icon: FiBarChart2, title: 'Project Management', desc: 'Plan, track, and manage construction projects with real-time milestones, budgets, and team collaboration tools.', color: 'blue' },
    { icon: FiTruck, title: 'Equipment Tracking', desc: 'Monitor heavy machinery fleet, schedule preventive maintenance, track fuel usage, and optimize equipment utilization.', color: 'amber' },
    { icon: FiUsers, title: 'Workforce Management', desc: 'Manage workers, track attendance, process payroll, allocate skills, and maintain complete HR records digitally.', color: 'emerald' },
    { icon: FiShield, title: 'Safety & Compliance', desc: 'Track incidents, schedule inspections, manage safety training, and maintain compliance documentation across all sites.', color: 'purple' },
    { icon: FiLayers, title: 'Material Inventory', desc: 'Track material stock levels, manage suppliers, process purchase orders, and monitor inventory movements across projects.', color: 'blue' },
    { icon: FiTrendingUp, title: 'Budget & Finance', desc: 'Manage project budgets, track expenses, generate invoices, and get real-time financial insights and comprehensive reports.', color: 'amber' },
  ];

  const testimonials = [
    {
      quote: 'Vishnu Infra has transformed how we manage our highway projects. The real-time tracking and reporting capabilities are exceptional.',
      author: 'Rajesh Sharma',
      role: 'Project Director',
      company: 'NHAI',
    },
    {
      quote: 'The equipment tracking and workforce management modules alone saved us 30% in operational costs within the first quarter.',
      author: 'Priya Patel',
      role: 'CEO',
      company: 'Patel Construction Ltd.',
    },
    {
      quote: 'Having all our project data, compliance docs, and financials in one platform has been a game-changer for our operations team.',
      author: 'Arun Verma',
      role: 'Operations Head',
      company: 'Bharat Infrastructure Corp.',
    },
  ];

  const howItWorks = [
    { number: '01', icon: FiTarget, title: 'Define Your Project', desc: 'Set up your construction project with all parameters — budget, timeline, resources, and milestones in minutes.' },
    { number: '02', icon: FiTool, title: 'Allocate Resources', desc: 'Assign workforce, schedule equipment, order materials, and manage vendors from a single dashboard.' },
    { number: '03', icon: FiBarChart2, title: 'Monitor & Optimize', desc: 'Track progress in real-time, generate reports, and make data-driven decisions to keep projects on schedule and budget.' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 overflow-hidden selection:bg-blue-500/30 selection:text-white">
      {/* ============================================================ */}
      {/* NAVBAR - Premium Glassmorphism */}
      {/* ============================================================ */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="fixed top-0 left-0 right-0 z-50"
      >
        <div className="absolute inset-0 bg-gray-950/60 backdrop-blur-xl border-b border-white/[0.04]" />
        <div className="relative flex items-center justify-between px-6 py-3.5 max-w-7xl mx-auto">
          <Link to="/" className="flex items-center gap-3 group">
            {/* Vishnu Infra Logo */}
            <motion.div
              whileHover={{ rotate: 360, scale: 1.1 }}
              transition={{ duration: 0.6 }}
              className="w-11 h-11 rounded-xl overflow-hidden bg-white flex items-center justify-center shadow-lg border border-white/10"
            >
              <img src={logo} alt="Vishnu Infra Logo" className="w-full h-full object-cover" />
            </motion.div>
            <div className="hidden sm:block">
              <span className="font-bold text-white text-lg tracking-tight">Vishnu Infra</span>
              <p className="text-[9px] text-blue-400/50 tracking-[0.2em] uppercase">Enterprise ERP</p>
            </div>
          </Link>

          {/* Desktop Nav Items */}
          <div className="hidden md:flex items-center gap-2 sm:gap-4">
            <motion.div whileHover={{ y: -1 }}>
              <Link to="/contact" className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors relative group">
                Contact
                <span className="absolute -bottom-0.5 left-2 right-2 h-[1px] bg-blue-500/0 group-hover:bg-blue-500/50 transition-all duration-300" />
              </Link>
            </motion.div>
            <motion.div whileHover={{ y: -1 }}>
              <Link to="/login" className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors">
                Sign In
              </Link>
            </motion.div>
            <Link to="/register">
              <motion.button
                whileHover={{ y: -2, boxShadow: '0 8px 25px rgba(59,130,246,0.35)' }}
                whileTap={{ scale: 0.98 }}
                className="px-5 py-2.5 text-sm font-medium bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg shadow-blue-600/20 transition-all"
              >
                Get Started Free
              </motion.button>
            </Link>
          </div>

          {/* Hamburger button on mobile */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-gray-300 hover:bg-white/5 hover:text-white transition-all md:hidden z-50"
          >
            {mobileMenuOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Dropdown Panel */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="absolute top-16 left-0 right-0 z-40 bg-gray-950/95 backdrop-blur-xl border-b border-white/[0.05] md:hidden px-6 py-6 space-y-4 flex flex-col items-stretch"
            >
              <Link 
                to="/contact" 
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 text-center text-sm font-semibold text-gray-300 hover:text-white transition-colors"
              >
                Contact
              </Link>
              <Link 
                to="/login" 
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 text-center text-sm font-semibold text-gray-300 hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link 
                to="/register" 
                onClick={() => setMobileMenuOpen(false)}
                className="w-full"
              >
                <button className="w-full py-3 text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg shadow-blue-600/20">
                  Get Started Free
                </button>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* ============================================================ */}
      {/* HERO SECTION - Premium Fullscreen */}
      {/* ============================================================ */}
      <section className="relative min-h-screen flex items-center pt-20">
        <ParallaxBackground />

        <div className="relative z-10 px-6 pb-20 max-w-7xl mx-auto text-center w-full">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {/* Premium badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="inline-flex items-center gap-2 px-5 py-2 bg-white/[0.04] border border-white/[0.08] text-blue-400 rounded-full text-xs sm:text-sm font-medium mb-8 backdrop-blur-sm"
            >
              <span className="flex items-center gap-1.5">
                <motion.span
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-2 h-2 bg-blue-400 rounded-full"
                />
                Enterprise Infrastructure Management
              </span>
            </motion.div>

            {/* Main headline with gradient */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-3xl sm:text-6xl lg:text-7xl xl:text-8xl font-extrabold text-white leading-[1.05] mb-6 tracking-tight"
            >
              Building the Future
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-500 bg-clip-text text-transparent">
                with Vishnu Infra
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="text-sm sm:text-xl text-gray-400 max-w-3xl mx-auto mb-10 leading-relaxed"
            >
              Delivering Excellence in Road Construction, Infrastructure Development, and Engineering Solutions with Quality, Innovation, and Trust.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 max-w-xs mx-auto sm:max-w-none"
            >
              <Link to="/register" className="w-full sm:w-auto">
                <motion.button
                  whileHover={{ y: -3, boxShadow: '0 12px 30px rgba(59,130,246,0.4)' }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full px-8 py-4 bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 text-base"
                >
                  Get Started Free
                  <motion.span
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <FiArrowRight className="w-4 h-4" />
                  </motion.span>
                </motion.button>
              </Link>
              <Link to="/login" className="w-full sm:w-auto">
                <motion.button
                  whileHover={{ y: -2 }}
                  className="w-full px-8 py-4 glass-premium text-white font-medium rounded-xl hover:bg-white/[0.08] transition-all text-base"
                >
                  Sign In
                </motion.button>
              </Link>
            </motion.div>

            {/* Trust indicators / Feature strip */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.8 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-16 px-4"
            >
              {/* Item 1 */}
              <motion.div
                whileHover={{ y: -6, scale: 1.02 }}
                className="glass-premium rounded-2xl p-6 border border-white/[0.06] text-left hover:border-yellow-500/25 transition-all duration-300 relative group overflow-hidden"
              >
                {/* Accent glow on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/0 via-yellow-500/0 to-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-yellow-500/10 rounded-xl text-yellow-400 group-hover:bg-yellow-500/20 group-hover:scale-110 transition-all duration-300">
                    <FiTrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-base leading-snug">
                      Faster Project Completion
                    </h3>
                    <p className="text-gray-400 text-xs mt-2 leading-relaxed font-medium">
                      Recognized for completing infrastructure projects ahead of schedule while maintaining the highest standards of quality and safety.
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Item 2 */}
              <motion.div
                whileHover={{ y: -6, scale: 1.02 }}
                className="glass-premium rounded-2xl p-6 border border-white/[0.06] text-left hover:border-yellow-500/25 transition-all duration-300 relative group overflow-hidden"
              >
                {/* Accent glow on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/0 via-yellow-500/0 to-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-yellow-500/10 rounded-xl text-yellow-400 group-hover:bg-yellow-500/20 group-hover:scale-110 transition-all duration-300">
                    <FiStar className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-base leading-snug">
                      15+ Projects Delivered
                    </h3>
                    <p className="text-gray-400 text-xs mt-2 leading-relaxed font-medium">
                      Successfully completed 15+ road construction and infrastructure projects with client satisfaction.
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Item 3 */}
              <motion.div
                whileHover={{ y: -6, scale: 1.02 }}
                className="glass-premium rounded-2xl p-6 border border-white/[0.06] text-left hover:border-yellow-500/25 transition-all duration-300 relative group overflow-hidden"
              >
                {/* Accent glow on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/0 via-yellow-500/0 to-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-yellow-500/10 rounded-xl text-yellow-400 group-hover:bg-yellow-500/20 group-hover:scale-110 transition-all duration-300">
                    <FiAward className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-base leading-snug">
                      12+ Years Experience
                    </h3>
                    <p className="text-gray-400 text-xs mt-2 leading-relaxed font-medium">
                      Delivering excellence in infrastructure development with over 12 years of industry experience.
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* FOOTER */}
      {/* ============================================================ */}
      <footer className="relative border-t border-white/[0.05] bg-gray-950/90 backdrop-blur-md py-8 px-6 z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="text-xs text-gray-500 font-semibold tracking-wide">
            &copy; {new Date().getFullYear()} Vishnu Infra Enterprise ERP. All Rights Reserved.
          </div>
          <div className="flex items-center justify-center gap-1.5 text-xs text-white font-medium">
            <span>💻</span>
            <span>Developed by <span className="text-yellow-500 font-bold hover:text-yellow-400 transition-colors cursor-pointer">Urmahi Vishnoi</span></span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
