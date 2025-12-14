"use client";
import { motion } from "framer-motion";
import { useEffect } from "react";

export default function Footer({ isDark = true }) {
  const currentYear = new Date().getFullYear();

  // Load Font Awesome
  useEffect(() => {
    if (!document.querySelector('link[href*="font-awesome"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css';
      document.head.appendChild(link);
    }
  }, []);

  // Theme colors
  const theme = {
    bg: isDark 
      ? 'bg-gradient-to-b from-slate-950 via-slate-900 to-black' 
      : 'bg-gradient-to-b from-white via-slate-50 to-slate-100',
    text: isDark ? 'text-slate-300' : 'text-slate-700',
    heading: isDark ? 'text-white' : 'text-slate-900',
    textSecondary: isDark ? 'text-slate-400' : 'text-slate-600',
    textTertiary: isDark ? 'text-slate-500' : 'text-slate-500',
    border: isDark ? 'border-slate-800/50' : 'border-slate-200',
    cardBg: isDark ? 'bg-slate-800/50' : 'bg-slate-100/50',
    cardBorder: isDark ? 'border-slate-700/50' : 'border-slate-300/50',
    inputBg: isDark ? 'bg-slate-800/50' : 'bg-white',
    inputBorder: isDark ? 'border-slate-700/50' : 'border-slate-300',
    inputFocus: isDark ? 'focus:border-blue-500' : 'focus:border-blue-600',
    hoverText: isDark ? 'hover:text-blue-400' : 'hover:text-blue-600',
  };

  const socialLinks = [
    { 
      name: "Twitter", 
      icon: "fa-brands fa-x-twitter", 
      url: "https://twitter.com", 
      color: isDark ? "hover:text-cyan-400" : "hover:text-cyan-600",
      gradient: "from-cyan-400 to-blue-500",
      hoverBg: isDark ? "group-hover:from-cyan-400 group-hover:to-blue-500" : "group-hover:from-cyan-500 group-hover:to-blue-600"
    },
    { 
      name: "Instagram", 
      icon: "fa-brands fa-instagram", 
      url: "https://instagram.com", 
      color: isDark ? "hover:text-pink-500" : "hover:text-pink-600",
      gradient: "from-pink-500 to-purple-500",
      hoverBg: isDark ? "group-hover:from-pink-500 group-hover:to-purple-500" : "group-hover:from-pink-600 group-hover:to-purple-600"
    },
    { 
      name: "Facebook", 
      icon: "fa-brands fa-facebook", 
      url: "https://facebook.com", 
      color: isDark ? "hover:text-blue-500" : "hover:text-blue-600",
      gradient: "from-blue-500 to-blue-600",
      hoverBg: isDark ? "group-hover:from-blue-500 group-hover:to-blue-600" : "group-hover:from-blue-600 group-hover:to-blue-700"
    },
    { 
      name: "LinkedIn", 
      icon: "fa-brands fa-linkedin", 
      url: "https://linkedin.com", 
      color: isDark ? "hover:text-blue-400" : "hover:text-blue-600",
      gradient: "from-blue-400 to-blue-600",
      hoverBg: isDark ? "group-hover:from-blue-400 group-hover:to-blue-600" : "group-hover:from-blue-500 group-hover:to-blue-700"
    },
    { 
      name: "GitHub", 
      icon: "fa-brands fa-github", 
      url: "https://github.com", 
      color: isDark ? "hover:text-white" : "hover:text-slate-900",
      gradient: "from-gray-400 to-gray-600",
      hoverBg: isDark ? "group-hover:from-gray-300 group-hover:to-gray-500" : "group-hover:from-gray-500 group-hover:to-gray-700"
    },
    { 
      name: "YouTube", 
      icon: "fa-brands fa-youtube", 
      url: "https://youtube.com", 
      color: isDark ? "hover:text-red-500" : "hover:text-red-600",
      gradient: "from-red-500 to-red-600",
      hoverBg: isDark ? "group-hover:from-red-500 group-hover:to-red-600" : "group-hover:from-red-600 group-hover:to-red-700"
    },
  ];

  const footerLinks = [
    { name: "Features", href: "#features", icon: "fa-solid fa-star" },
    { name: "How it Works", href: "#how", icon: "fa-solid fa-lightbulb" },
    { name: "Pricing", href: "#pricing", icon: "fa-solid fa-tag" },
    { name: "Contact", href: "#contact", icon: "fa-solid fa-envelope" },
  ];

  return (
    <footer className={`relative ${theme.bg} ${theme.text} py-16 border-t ${theme.border} overflow-hidden transition-colors duration-500`}>
      {/* Animated Background Elements */}
      <motion.div
        animate={{
          background: isDark ? [
            "radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)",
            "radial-gradient(circle at 80% 50%, rgba(168, 85, 247, 0.1) 0%, transparent 50%)",
            "radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)",
          ] : [
            "radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.05) 0%, transparent 50%)",
            "radial-gradient(circle at 80% 50%, rgba(168, 85, 247, 0.05) 0%, transparent 50%)",
            "radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.05) 0%, transparent 50%)",
          ],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 pointer-events-none"
      />

      {/* Floating Orbs */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-64 h-64 rounded-full blur-3xl"
          style={{
            opacity: isDark ? 0.2 : 0.1,
            background: i === 0 
              ? "radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%)"
              : i === 1
              ? "radial-gradient(circle, rgba(168, 85, 247, 0.3) 0%, transparent 70%)"
              : "radial-gradient(circle, rgba(236, 72, 153, 0.3) 0%, transparent 70%)",
            left: `${i * 30}%`,
            top: "50%",
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, i % 2 === 0 ? 20 : -20, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 8 + i * 2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 1,
          }}
        />
      ))}

      <div className="container mx-auto px-6 md:px-12 relative z-10">
        {/* Main Footer Content */}
        <div className="grid md:grid-cols-3 gap-12 mb-12">
          {/* Left: Logo + Brand */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex flex-col space-y-4"
          >
            <div className="flex items-center space-x-3">
              {/* UPDATED LOGO: Replaced 'C' text box with Image */}
              <motion.div
                whileHover={{ rotate: 360, scale: 1.1 }}
                transition={{ duration: 0.6 }}
                className="w-12 h-12 relative"
              >
                 {/* Ensure 'logo.jpeg' is in your public folder */}
                <img 
                  src="/logo.jpeg" 
                  alt="CoopilotX Logo" 
                  className="w-full h-full object-contain rounded-lg"
                />
              </motion.div>
              
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                CoopilotX AI
              </span>
            </div>
            <p className={`${theme.textSecondary} text-sm leading-relaxed max-w-xs`}>
              Empowering professionals with AI-driven interview assistance. Master every interview with confidence.
            </p>
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className={`flex items-center gap-2 text-xs ${theme.textTertiary}`}
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-2 h-2 bg-green-500 rounded-full"
              />
              <span>AI Systems Operational</span>
            </motion.div>
          </motion.div>

          {/* Center: Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col space-y-4"
          >
            <h3 className={`text-lg font-bold ${theme.heading} mb-2`}>Quick Links</h3>
            <div className="grid grid-cols-2 gap-3">
              {footerLinks.map((link, index) => (
                <motion.a
                  key={link.name}
                  href={link.href}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ x: 5, color: isDark ? "#60a5fa" : "#2563eb" }}
                  className={`${theme.textSecondary} ${theme.hoverText} transition-all duration-300 text-sm relative group flex items-center gap-2`}
                >
                  <motion.i 
                    className={`${link.icon} text-xs`}
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.5 }}
                  />
                  <span className="relative z-10">{link.name}</span>
                  <motion.div
                    className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-0 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full group-hover:h-4 transition-all duration-300"
                  />
                </motion.a>
              ))}
            </div>
          </motion.div>

          {/* Right: Social Icons */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col space-y-4"
          >
            <h3 className={`text-lg font-bold ${theme.heading} mb-2`}>Connect With Us</h3>
            <div className="flex flex-wrap gap-4">
              {socialLinks.map((social, index) => (
                <motion.a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, type: "spring", stiffness: 200 }}
                  whileHover={{ 
                    scale: 1.2, 
                    rotate: 5,
                    y: -8
                  }}
                  whileTap={{ scale: 0.9 }}
                  className="relative group"
                  title={social.name}
                >
                  <motion.div
                    className={`w-14 h-14 rounded-xl ${theme.cardBg} border-2 ${theme.cardBorder} flex items-center justify-center ${theme.textSecondary} ${social.color} transition-all duration-300 backdrop-blur-sm overflow-hidden bg-gradient-to-br ${social.hoverBg}`}
                  >
                    {/* Animated background on hover */}
                    <motion.div
                      className={`absolute inset-0 bg-gradient-to-br ${social.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                      animate={{
                        scale: [1, 1.2, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                    
                    {/* Icon */}
                    <motion.i 
                      className={`${social.icon} text-2xl relative z-10 group-hover:text-white transition-colors duration-300`}
                      animate={{
                        rotate: [0, 5, -5, 0],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: index * 0.2
                      }}
                    />
                  </motion.div>
                  
                  {/* Glow Effect */}
                  <motion.div
                    className={`absolute inset-0 rounded-xl bg-gradient-to-br ${social.gradient} opacity-0 group-hover:opacity-60 blur-xl -z-10 transition-opacity duration-300`}
                    animate={{
                      scale: [1, 1.3, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                  
                  {/* Floating particles on hover */}
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 1 }}
                  >
                    {[...Array(3)].map((_, i) => (
                      <motion.div
                        key={i}
                        className={`absolute w-1 h-1 rounded-full bg-gradient-to-br ${social.gradient}`}
                        style={{
                          left: '50%',
                          top: '50%',
                        }}
                        animate={{
                          x: [0, (i - 1) * 20],
                          y: [0, -30],
                          opacity: [0, 1, 0],
                        }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          delay: i * 0.2,
                        }}
                      />
                    ))}
                  </motion.div>
                </motion.a>
              ))}
            </div>
            
            {/* Newsletter Signup */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6 }}
              className="mt-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <motion.i 
                  className="fa-solid fa-envelope text-blue-400"
                  animate={{ y: [0, -3, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <p className={`text-xs ${theme.textSecondary}`}>Stay updated with latest features</p>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <i className={`fa-solid fa-at absolute left-3 top-1/2 -translate-y-1/2 text-xs ${theme.textTertiary}`}></i>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className={`w-full pl-9 pr-3 py-2 rounded-lg ${theme.inputBg} border ${theme.inputBorder} text-sm ${theme.text} placeholder:text-slate-500 focus:outline-none ${theme.inputFocus} focus:ring-1 focus:ring-blue-500/50 transition-all`}
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 transition-all flex items-center gap-2"
                >
                  <span>Subscribe</span>
                  <motion.i 
                    className="fa-solid fa-paper-plane"
                    whileHover={{ x: 3, y: -3 }}
                  />
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.5 }}
          className={`h-px bg-gradient-to-r from-transparent ${isDark ? 'via-slate-700' : 'via-slate-300'} to-transparent mb-8`}
        />

        {/* Bottom Line */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className={`flex flex-col md:flex-row justify-between items-center gap-4 text-sm ${theme.textTertiary}`}
        >
          <div className="flex items-center gap-2">
            <i className="fa-regular fa-copyright"></i>
            <span>{currentYear}</span>
            <motion.span
              whileHover={{ scale: 1.05 }}
              className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent font-semibold"
            >
              CoopilotX AI
            </motion.span>
            <span>. All rights reserved.</span>
          </div>
          
          <div className="flex gap-6 text-xs">
            <motion.a
              href="#privacy"
              whileHover={{ color: isDark ? "#60a5fa" : "#2563eb", y: -2 }}
              className={`${theme.hoverText} transition-all flex items-center gap-1`}
            >
              <i className="fa-solid fa-shield-halved"></i>
              <span>Privacy Policy</span>
            </motion.a>
            <motion.a
              href="#terms"
              whileHover={{ color: isDark ? "#60a5fa" : "#2563eb", y: -2 }}
              className={`${theme.hoverText} transition-all flex items-center gap-1`}
            >
              <i className="fa-solid fa-file-contract"></i>
              <span>Terms of Service</span>
            </motion.a>
            <motion.a
              href="#cookies"
              whileHover={{ color: isDark ? "#60a5fa" : "#2563eb", y: -2 }}
              className={`${theme.hoverText} transition-all flex items-center gap-1`}
            >
              <i className="fa-solid fa-cookie-bite"></i>
              <span>Cookie Policy</span>
            </motion.a>
          </div>
        </motion.div>
      </div>

      {/* Animated Bottom Glow Line */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
        animate={{
          backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "linear",
        }}
        style={{
          backgroundSize: "200% 100%",
          boxShadow: isDark 
            ? "0 0 20px rgba(59, 130, 246, 0.5), 0 0 40px rgba(168, 85, 247, 0.3)"
            : "0 0 15px rgba(59, 130, 246, 0.3), 0 0 30px rgba(168, 85, 247, 0.2)",
        }}
      />

      {/* Corner Decorative Elements with Icons */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        className={`absolute bottom-4 left-4 w-20 h-20 border-2 ${isDark ? 'border-blue-500/20' : 'border-blue-500/30'} rounded-full flex items-center justify-center`}
      >
        <i className={`fa-solid fa-rocket text-xl ${isDark ? 'text-blue-500/30' : 'text-blue-500/40'}`}></i>
      </motion.div>
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className={`absolute top-4 right-4 w-16 h-16 border-2 ${isDark ? 'border-purple-500/20' : 'border-purple-500/30'} rounded-full flex items-center justify-center`}
      >
        <i className={`fa-solid fa-brain text-lg ${isDark ? 'text-purple-500/30' : 'text-purple-500/40'}`}></i>
      </motion.div>
    </footer>
  );
}