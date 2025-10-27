"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";

export default function InterviewPage() {
  useEffect(() => {
    console.log("✅ Interview page loaded successfully");
  }, []);

  return (
    <main className="relative flex flex-col items-center justify-center min-h-screen text-center overflow-hidden text-white bg-gradient-to-b from-[#0b1120] via-[#0e1625] to-[#0b0f1a]">
      {/* 🌌 Background Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.25)_0%,rgba(10,15,25,1)_90%)] pointer-events-none" />

      {/* ✨ Top & Bottom Neon Lines */}
      <div className="absolute top-0 w-full h-[2px] bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-400 shadow-[0_0_25px_#06b6d4]" />
      <div className="absolute bottom-0 w-full h-[2px] bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-400 shadow-[0_0_25px_#06b6d4]" />

      {/* 🧠 Title */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="text-3xl md:text-4xl font-extrabold mb-3 drop-shadow-[0_0_25px_rgba(56,189,248,0.8)]"
      >
        <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-purple-400 bg-clip-text text-transparent">
          CopilotX AI – Interview Assistant
        </span>
      </motion.h1>

      {/* 💬 Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 1 }}
        className="text-base md:text-lg text-gray-300 max-w-2xl leading-relaxed mb-6"
      >
        Welcome to your AI-powered interview environment.  
        Paste your resume, start the mic, and press{" "}
        <strong className="text-cyan-300">Spacebar</strong> to get real-time AI responses.
      </motion.p>

      {/* 🧩 Iframe Container — No Scroll, Fits on Screen */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6, duration: 0.8 }}
        className="relative w-[92%] md:w-[85%] lg:w-[75%] h-[82vh] rounded-xl border border-cyan-400/50 
                   shadow-[0_0_30px_rgba(56,189,248,0.4)] overflow-hidden bg-transparent"
      >
        <iframe
          src="/interview/index.html"
          title="Interview Interface"
          className="absolute inset-0 w-full h-full border-none overflow-hidden"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        ></iframe>

        {/* Glowing Border */}
        <div className="absolute inset-0 rounded-xl pointer-events-none border border-cyan-400/40 shadow-[0_0_35px_rgba(56,189,248,0.6)]" />
      </motion.div>
    </main>
  );
}