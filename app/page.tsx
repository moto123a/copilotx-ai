"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Home() {
  const router = useRouter();
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const smoothX = useSpring(x, { stiffness: 30, damping: 25 });
  const smoothY = useSpring(y, { stiffness: 30, damping: 25 });

  useEffect(() => {
    const move = (e: MouseEvent) => {
      const cx = e.clientX - window.innerWidth / 2;
      const cy = e.clientY - window.innerHeight / 2;
      x.set(cx / 25);
      y.set(cy / 25);
      setMouse({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, [x, y]);

  const buttons = [
    { label: "Resume", path: "resume", icon: "📄" },
    { label: "Mock Interview", path: "mock-interview", icon: "🎤" },
    { label: "Real-Time Interview", path: "real-interview", icon: "⚡" },
  ];

  const handleClick = (path: string) => router.push(`/${path}`);

  return (
    <main
      className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden text-center text-white font-sans bg-[#040414]"
    >
      {/* 🔮 Animated Aurora Background */}
      <motion.div
        className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,#0ff_0%,transparent_60%),radial-gradient(circle_at_80%_70%,#f0f_0%,transparent_60%)] opacity-40"
        animate={{
          backgroundPosition: ["0% 0%,100% 100%", "100% 0%,0% 100%", "0% 0%,100% 100%"],
        }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      />

      {/* ✨ Stars */}
      {[...Array(60)].map((_, i) => (
        <motion.span
          key={i}
          className="absolute w-[2px] h-[2px] bg-cyan-400 rounded-full"
          style={{
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
          }}
          animate={{
            opacity: [0.2, 1, 0.2],
            y: [0, -20, 0],
          }}
          transition={{
            duration: 3 + Math.random() * 3,
            repeat: Infinity,
            ease: "easeInOut",
            delay: Math.random() * 3,
          }}
        />
      ))}

      {/* 🌀 Energy Rings */}
      {[...Array(7)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute border border-cyan-400/20 rounded-full"
          style={{
            width: `${300 + i * 180}px`,
            height: `${300 + i * 180}px`,
          }}
          animate={{
            scale: [1, 1.4, 1],
            rotate: [0, 360],
            opacity: [0.15, 0.3, 0.15],
          }}
          transition={{
            duration: 22 + i * 3,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}

      {/* 🌈 Moving Light Layer */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-b from-transparent via-fuchsia-700/10 to-cyan-500/10 blur-[180px]"
        animate={{
          opacity: [0.2, 0.6, 0.2],
          scale: [1, 1.05, 1],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* 🧠 Animated Title */}
      <motion.h1
        initial={{ opacity: 0, y: 50 }}
        animate={{
          opacity: 1,
          y: [0, -5, 0, 5, 0],
          rotate: [0, 1, -1, 0],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="text-6xl md:text-7xl font-extrabold mb-6 relative z-10"
      >
        <motion.span
          animate={{
            backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
          }}
          transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
          className="bg-gradient-to-r from-cyan-300 via-blue-400 to-fuchsia-500 bg-[length:200%_200%] bg-clip-text text-transparent drop-shadow-[0_0_45px_rgba(56,189,248,0.9)]"
        >
          CopilotX&nbsp;AI
        </motion.span>
      </motion.h1>

      {/* 💬 Description */}
      <motion.p
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 1.5 }}
        className="text-lg md:text-xl text-gray-300 max-w-3xl leading-relaxed mb-16 px-6 relative z-10"
      >
        <motion.span
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="text-cyan-400 font-semibold"
        >
          Awakening Sequence Initiated...
        </motion.span>{" "}
        Your AI Interview Partner is now active — perceiving, analyzing, and
        responding like a human. <br />
        Let CopilotX guide you through intelligent, emotionally-aware mock and
        real-time interviews.
      </motion.p>

      {/* 🎛️ Updated Professional Buttons */}
      <div className="flex flex-col md:flex-row gap-10 relative z-10">
        {buttons.map((btn, i) => (
          <motion.div
            key={btn.path}
            style={{ x: smoothX, y: smoothY }}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 + i * 0.2, duration: 0.6 }}
            whileHover={{
              scale: 1.1,
              rotate: [0, 1.2, -1.2, 0],
              boxShadow:
                "0 0 35px rgba(0,255,255,0.6), 0 0 60px rgba(255,0,255,0.3)",
            }}
            whileTap={{ scale: 0.97 }}
            onClick={() => handleClick(btn.path)}
            className="relative w-56 h-56 flex flex-col items-center justify-center cursor-pointer
                       rounded-2xl backdrop-blur-xl bg-white/10 border border-cyan-200/30
                       shadow-[0_0_25px_rgba(56,189,248,0.5)] overflow-hidden"
          >
            {/* Light sweep */}
            <motion.span
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              animate={{ x: ["-150%", "150%"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />

            {/* Icon */}
            <motion.div
              className="text-5xl mb-3 drop-shadow-[0_0_12px_rgba(255,255,255,0.7)]"
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            >
              {btn.icon}
            </motion.div>

            {/* Label */}
            <motion.span
              className="text-xl font-semibold tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-blue-300 to-fuchsia-400"
              animate={{ opacity: [1, 0.7, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              {btn.label}
            </motion.span>
          </motion.div>
        ))}
      </div>

      {/* 💫 Neon Cursor Glow */}
      <motion.div
        className="fixed pointer-events-none w-48 h-48 rounded-full bg-cyan-400/15 blur-3xl"
        style={{
          left: mouse.x - 96,
          top: mouse.y - 96,
        }}
      />
    </main>
  );
}