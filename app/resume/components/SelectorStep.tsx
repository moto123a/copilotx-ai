"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export default function SelectorStep({
  onNext,
}: {
  onNext: (data: { country: string; tech: string }) => void;
}) {
  const [country, setCountry] = useState("");
  const [tech, setTech] = useState("");

  const countries = ["India", "USA", "UK", "Australia"];
  const techs = [
    "Java Full Stack Developer",
    "Data Scientist",
    "DevOps Engineer",
    "Frontend Developer",
    "Backend Developer",
    "AI/ML Engineer",
  ];

  const canProceed = country && tech;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="flex flex-col items-center justify-center space-y-10"
    >
      <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-fuchsia-500 bg-clip-text text-transparent">
        Let’s Personalize Your Resume
      </h1>
      <p className="text-gray-400 text-lg max-w-xl">
        Select your country and technology to get AI-optimized templates that
        fit your job market perfectly.
      </p>

      {/* 🌍 Country Selection */}
      <div>
        <p className="text-cyan-400 mb-3 font-medium text-lg">Select Country</p>
        <div className="flex flex-wrap justify-center gap-4">
          {countries.map((c) => (
            <motion.button
              key={c}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setCountry(c)}
              className={`px-6 py-3 rounded-xl border ${
                country === c
                  ? "border-cyan-400 bg-cyan-400/10"
                  : "border-white/10 hover:border-cyan-300"
              }`}
            >
              {c}
            </motion.button>
          ))}
        </div>
      </div>

      {/* 💻 Tech Selection */}
      <div>
        <p className="text-cyan-400 mb-3 font-medium text-lg">Select Technology</p>
        <div className="flex flex-wrap justify-center gap-4 max-w-3xl">
          {techs.map((t) => (
            <motion.button
              key={t}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setTech(t)}
              className={`px-6 py-3 rounded-xl border text-sm ${
                tech === t
                  ? "border-fuchsia-400 bg-fuchsia-400/10"
                  : "border-white/10 hover:border-fuchsia-300"
              }`}
            >
              {t}
            </motion.button>
          ))}
        </div>
      </div>

      {/* 🚀 Continue */}
      <motion.button
        disabled={!canProceed}
        whileHover={canProceed ? { scale: 1.05 } : {}}
        whileTap={canProceed ? { scale: 0.95 } : {}}
        onClick={() => onNext({ country, tech })}
        className={`px-10 py-3 rounded-xl text-lg font-semibold mt-8 transition-all ${
          canProceed
            ? "bg-gradient-to-r from-cyan-500 to-fuchsia-500 hover:shadow-[0_0_25px_rgba(56,189,248,0.5)]"
            : "bg-gray-600/40 cursor-not-allowed"
        }`}
      >
        Continue
      </motion.button>
    </motion.div>
  );
}