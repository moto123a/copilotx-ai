"use client";

import { motion } from "framer-motion";

export default function TemplateCard({
  template,
  onSelect,
}: {
  template: { id: string; name: string; desc: string; color: string };
  onSelect: () => void;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(0,255,255,0.3)" }}
      whileTap={{ scale: 0.97 }}
      onClick={onSelect}
      className={`relative w-72 h-80 cursor-pointer rounded-2xl p-5 
        bg-gradient-to-br ${template.color} backdrop-blur-xl 
        border border-white/10 shadow-[0_0_25px_rgba(56,189,248,0.3)] 
        flex flex-col justify-between text-white overflow-hidden`}
    >
      {/* Animated glow overlay */}
      <motion.span
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
        animate={{ x: ["-150%", "150%"] }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
      />

      <div className="text-left z-10">
        <h2 className="text-2xl font-bold mb-2 drop-shadow-[0_0_8px_rgba(0,0,0,0.3)]">
          {template.name}
        </h2>
        <p className="text-sm text-gray-100/90 leading-relaxed">
          {template.desc}
        </p>
      </div>

      <motion.button
        whileHover={{
          scale: 1.05,
          backgroundColor: "rgba(255,255,255,0.3)",
        }}
        whileTap={{ scale: 0.95 }}
        className="z-10 mt-6 px-5 py-2 rounded-xl bg-white/20 text-sm font-semibold backdrop-blur-md"
      >
        Use Template
      </motion.button>
    </motion.div>
  );
}