"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  const handleClick = () => {
    console.log("✅ Start for Free button clicked");
    router.push("/interview");
  };

  return (
    <main className="relative flex flex-col items-center justify-center min-h-screen text-center overflow-hidden text-white bg-gradient-to-b from-[#0b1120] via-[#0e1625] to-[#0b0f1a]">
      {/* 🌌 Background Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.25)_0%,rgba(10,15,25,1)_90%)] pointer-events-none" />

      {/* ✨ Top and Bottom Gradient Lines */}
      <div className="absolute top-0 w-full h-[2px] bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-400 shadow-[0_0_25px_#06b6d4]" />
      <div className="absolute bottom-0 w-full h-[2px] bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-400 shadow-[0_0_25px_#06b6d4]" />

      {/* 🌟 Title */}
      <motion.h1
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="text-6xl md:text-7xl font-extrabold mb-6 leading-tight drop-shadow-[0_0_25px_rgba(56,189,248,0.8)]"
      >
        <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-purple-400 bg-clip-text text-transparent">
          Welcome to CopilotX AI
        </span>
      </motion.h1>

      {/* 💬 Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 1 }}
        className="text-lg md:text-xl text-gray-200 max-w-2xl leading-relaxed mb-12"
      >
        Your all-in-one AI-powered <strong>Interview Assistant</strong> and{" "}
        <strong>Resume Builder</strong>. Practice real-time mock interviews, get instant feedback,
        and craft professional resumes effortlessly.
      </motion.p>

      {/* 🚀 Modern Neon Button */}
      <motion.button
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        onClick={handleClick}
        className="relative px-12 py-4 text-lg font-semibold rounded-xl 
                   bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 
                   text-white overflow-hidden transition-all duration-500
                   hover:from-purple-500 hover:via-blue-400 hover:to-cyan-300 
                   shadow-[0_0_25px_rgba(56,189,248,0.8)] hover:shadow-[0_0_50px_rgba(56,189,248,1)]
                   active:scale-95 group"
      >
        {/* Animated Border Glow */}
        <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 blur-[15px] opacity-70 group-hover:opacity-100 transition duration-700"></span>

        {/* Button Text */}
        <span className="relative z-10 flex items-center gap-2 font-bold tracking-wide">
          Start for Free
          <motion.span
            animate={{ x: [0, 4, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            🚀
          </motion.span>
        </span>
      </motion.button>
    </main>
  );
}