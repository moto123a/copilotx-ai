// app/real-interview/page.tsx
"use client";

import Link from "next/link";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowLeft, Laptop, Mic, Sparkles, Zap } from "lucide-react";
import React, { useEffect, useState } from "react"; // Added useEffect, useState
import { useRouter } from "next/navigation"; // Added useRouter
import { onAuthStateChanged } from "firebase/auth"; // Added for Firebase
import { auth } from "../firebaseConfig"; // Added for Firebase
import AuthModal from "../../components/AuthModal";
// Enhanced Animated Starfield with Multiple Layers
const Starfield = () => {
  return (
    <div className="absolute inset-0 -z-20 overflow-hidden">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
      <div id="stars1" className="absolute inset-0"></div>
      <div id="stars2" className="absolute inset-0"></div>
      <div id="stars3" className="absolute inset-0"></div>
      <div id="stars4" className="absolute inset-0"></div>
      
      {/* Animated gradient orbs */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"
      />
      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"
      />
    </div>
  );
};

// Super Magnetic Button with Ripple Effect
const MagneticButton = ({ children }) => {
  const ref = React.useRef(null);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const [ripples, setRipples] = React.useState([]);

  const handleMouse = (e) => {
    const { clientX, clientY } = e;
    const { height, width, left, top } = ref.current.getBoundingClientRect();
    const x = clientX - (left + width / 2);
    const y = clientY - (top + height / 2);
    setPosition({ x: x * 0.3, y: y * 0.3 });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  const handleClick = (e) => {
    const { left, top } = ref.current.getBoundingClientRect();
    const x = e.clientX - left;
    const y = e.clientY - top;
    const newRipple = { x, y, id: Date.now() };
    setRipples([...ripples, newRipple]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 600);
  };

  const { x, y } = position;
  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      animate={{ x, y }}
      transition={{ type: "spring", stiffness: 400, damping: 25, mass: 0.3 }}
      className="w-full relative overflow-hidden"
    >
      {ripples.map((ripple) => (
        <motion.span
          key={ripple.id}
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: 4, opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute rounded-full bg-blue-400/30"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: 20,
            height: 20,
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}
      {children}
    </motion.div>
  );
};

// Ultra Advanced Choice Card with Particles
const ChoiceCard = ({ href, icon: Icon, title, description, buttonText, color, onAction }) => {
  const ref = React.useRef(null);
  const [isHovered, setIsHovered] = React.useState(false);

  // 3D Tilt Effect
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseX = useSpring(x, { stiffness: 400, damping: 35, restDelta: 0.001 });
  const mouseY = useSpring(y, { stiffness: 400, damping: 35, restDelta: 0.001 });

  const rotateX = useTransform(mouseY, [-200, 200], [15, -15]);
  const rotateY = useTransform(mouseX, [-200, 200], [-15, 15]);
  const scale = useTransform(mouseX, [-200, 200], [1, 1.03]);

  const handleMouseMove = (e) => {
    if (!ref.current) return;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    x.set(e.clientX - (left + width / 2));
    y.set(e.clientY - (top + height / 2));
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
    setIsHovered(false);
  };

  // Floating particles
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    size: Math.random() * 4 + 2,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 2,
  }));

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={() => setIsHovered(true)}
      style={{ rotateX, rotateY, scale, transformStyle: "preserve-3d" }}
      className="relative h-full w-full rounded-3xl border border-white/20 bg-gradient-to-br from-slate-900/80 via-slate-800/60 to-slate-900/80 p-8 shadow-2xl shadow-black/80 backdrop-blur-xl"
    >
      {/* Animated border glow */}
      <motion.div
        className={`absolute inset-0 rounded-3xl opacity-0 ${color === 'blue' ? 'bg-blue-500/20' : 'bg-purple-500/20'} blur-xl`}
        animate={{ opacity: isHovered ? [0.3, 0.6, 0.3] : 0 }}
        transition={{ duration: 2, repeat: Infinity }}
      />

      {/* Floating particles */}
      {isHovered && particles.map((particle) => (
        <motion.div
          key={particle.id}
          className={`absolute rounded-full ${color === 'blue' ? 'bg-blue-400' : 'bg-purple-400'}`}
          initial={{ x: `${particle.x}%`, y: `${particle.y}%`, opacity: 0 }}
          animate={{
            y: [null, `${particle.y - 50}%`],
            opacity: [0, 0.8, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: particle.delay,
            ease: "easeOut",
          }}
          style={{ width: particle.size, height: particle.size }}
        />
      ))}

      {/* Shimmer effect */}
      <motion.div
        className="absolute inset-0 rounded-3xl"
        style={{
          background: `linear-gradient(135deg, transparent 0%, ${color === 'blue' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(168, 85, 247, 0.1)'} 50%, transparent 100%)`,
        }}
        animate={{ x: isHovered ? ["0%", "100%"] : "0%" }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
      />

      <div
        style={{ transform: "translateZ(75px)", transformStyle: "preserve-3d" }}
        className="relative z-10 text-center"
      >
        {/* Animated icon container */}
        <motion.div
          animate={{
            rotate: isHovered ? [0, 5, -5, 0] : 0,
            scale: isHovered ? [1, 1.1, 1] : 1,
          }}
          transition={{ duration: 0.5 }}
          className={`mx-auto mb-6 inline-flex h-20 w-20 items-center justify-center rounded-2xl border-2 ${
            color === 'blue' 
              ? 'bg-blue-500/10 border-blue-400/30 text-blue-400' 
              : 'bg-purple-500/10 border-purple-400/30 text-purple-400'
          } shadow-lg relative overflow-hidden`}
        >
          <motion.div
            className={`absolute inset-0 ${color === 'blue' ? 'bg-blue-400/20' : 'bg-purple-400/20'}`}
            animate={{ scale: isHovered ? [1, 1.5] : 1, opacity: isHovered ? [0.5, 0] : 0 }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <Icon size={36} className="relative z-10" />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0"
          >
            <Sparkles size={16} className="absolute top-1 right-1 opacity-50" />
          </motion.div>
        </motion.div>

        <motion.h2
          className="text-3xl font-bold text-white mb-3 bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent"
          animate={{ scale: isHovered ? 1.05 : 1 }}
          transition={{ duration: 0.3 }}
        >
          {title}
        </motion.h2>

        <p className="text-slate-400 mb-10 max-w-xs mx-auto text-base leading-relaxed">
          {description}
        </p>

        {/* Updated: Added onClick handling to check authentication */}
        <div onClick={(e) => { e.preventDefault(); onAction(href); }} className="cursor-pointer">
          <MagneticButton>
            <motion.div
              className={`w-full text-center px-6 py-4 rounded-xl border font-bold text-white transition-all duration-300 relative overflow-hidden group ${
                color === 'blue'
                  ? 'border-blue-500/30 bg-gradient-to-r from-blue-600/20 to-blue-500/20 hover:from-blue-600/40 hover:to-blue-500/40'
                  : 'border-purple-500/30 bg-gradient-to-r from-purple-600/20 to-purple-500/20 hover:from-purple-600/40 hover:to-purple-500/40'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <motion.div
                className={`absolute inset-0 ${color === 'blue' ? 'bg-blue-500/20' : 'bg-purple-500/20'}`}
                initial={{ x: "-100%" }}
                whileHover={{ x: "100%" }}
                transition={{ duration: 0.5 }}
              />
              <span className="relative z-10 flex items-center justify-center gap-2">
                {buttonText}
                <Zap size={18} className="group-hover:animate-bounce" />
              </span>
            </motion.div>
          </MagneticButton>
        </div>
      </div>
    </motion.div>
  );
};

export default function RealInterviewChooserPage() {
  const router = useRouter(); // Initialize Router
  const [user, setUser] = useState<any>(null); // State for User
  const [showAuthModal, setShowAuthModal] = useState(false); // State for Login Modal

  // Added Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Added Secure Navigation function
  const handleAction = (path: string) => {
    if (!user) {
      setShowAuthModal(true); // Show login popup if not signed in
    } else {
      router.push(path); // Go to page if signed in
    }
  };

  return (
    <>
      <style jsx global>{`
        @keyframes twinkle {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 1; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        #stars1, #stars2, #stars3, #stars4 {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }
        #stars1 {
          background: transparent url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><circle cx="100" cy="100" r="1" fill="white"/></svg>') repeat;
          animation: twinkle 12s ease-in-out infinite;
        }
        #stars2 {
          background: transparent url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><circle cx="400" cy="400" r="0.7" fill="white"/></svg>') repeat;
          animation: twinkle 18s ease-in-out infinite;
        }
        #stars3 {
          background: transparent url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><circle cx="800" cy="800" r="1.5" fill="white"/></svg>') repeat;
          animation: twinkle 8s ease-in-out infinite;
        }
        #stars4 {
          background: transparent url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><circle cx="200" cy="600" r="0.5" fill="cyan"/></svg>') repeat;
          animation: twinkle 15s ease-in-out infinite;
        }
      `}</style>

      <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-[#000005] via-[#0a0a1a] to-[#000005] text-slate-200 antialiased">
        <Starfield />
        
        {/* Added: Auth Modal is displayed when showAuthModal is true */}
        {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
        
        {/* Multiple gradient overlays */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent"></div>
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent"></div>
        
        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center p-4" style={{ perspective: "2000px" }}>
          <div className="w-full max-w-6xl">
            {/* Ultra Animated Header */}
            <motion.div
              initial={{ y: -50, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 100, damping: 15, delay: 0.1 }}
              className="text-center mb-8"
            >
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="inline-block mb-4"
              >
                <Sparkles size={48} className="text-blue-400 mx-auto" />
              </motion.div>
              
              <motion.h1
                className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-4"
                animate={{ 
                  backgroundPosition: ["0%", "100%"],
                }}
                transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                style={{
                  backgroundImage: "linear-gradient(90deg, #fff, #60a5fa, #a78bfa, #fff)",
                  backgroundSize: "200% auto",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Copilot Mode Select
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mx-auto max-w-2xl text-xl text-slate-300"
              >
                Choose the mode that best fits your interview scenario.
              </motion.p>
            </motion.div>

            {/* Cards with Stagger Animation */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                visible: { transition: { staggerChildren: 0.2, delayChildren: 0.3 } },
              }}
              className="grid grid-cols-1 gap-10 md:grid-cols-2 mb-16"
            >
              <motion.div
                variants={{ 
                  hidden: { y: 100, opacity: 0, rotateX: -20 }, 
                  visible: { y: 0, opacity: 1, rotateX: 0 } 
                }}
                transition={{ type: "spring", stiffness: 80, damping: 15 }}
              >
                <ChoiceCard
                  href="/real-interview/laptop"
                  icon={Laptop}
                  title="Screen Share Mode"
                  description="Runs discreetly during video calls. Ideal for Zoom, Teams, and Google Meet interviews."
                  buttonText="Launch Screen Share"
                  color="blue"
                  onAction={handleAction} // Pass secure check
                />
              </motion.div>

              <motion.div
                variants={{ 
                  hidden: { y: 100, opacity: 0, rotateX: -20 }, 
                  visible: { y: 0, opacity: 1, rotateX: 0 } 
                }}
                transition={{ type: "spring", stiffness: 80, damping: 15 }}
              >
                <ChoiceCard
                  href="/real-interview/phone"
                  icon={Mic}
                  title="Microphone Mode"
                  description="Listens via your microphone. Perfect for phone calls and in-person interviews."
                  buttonText="Launch Microphone"
                  color="purple"
                  onAction={handleAction} // Pass secure check
                />
              </motion.div>
            </motion.div>

            {/* Animated Back Button */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="text-center"
            >
              <Link href="/">
                <motion.button
                  whileHover={{ scale: 1.05, backgroundColor: "rgba(255, 255, 255, 0.1)" }}
                  whileTap={{ scale: 0.95 }}
                  className="inline-flex items-center gap-3 rounded-xl bg-white/5 px-8 py-4 text-base font-semibold text-slate-300 ring-1 ring-inset ring-white/20 transition-all backdrop-blur-sm"
                >
                  <ArrowLeft size={20} />
                  <span>Back to Home</span>
                </motion.button>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
}