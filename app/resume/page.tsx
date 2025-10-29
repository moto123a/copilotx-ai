"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import SelectorStep from "./components/SelectorStep";
import TemplateSelector from "./components/TemplateSelector";

export default function ResumeHome() {
  const router = useRouter();
  const [step, setStep] = useState<"select" | "templates">("select");
  const [form, setForm] = useState({ country: "", tech: "" });

  const handleNext = (data: { country: string; tech: string }) => {
    setForm(data);
    setStep("templates");
  };

  const handleSelectTemplate = (templateId: string) => {
    router.push(
      `/resume/editor?template=${templateId}&country=${form.country}&role=${form.tech}`
    );
  };

  return (
    <main className="min-h-screen bg-[#060617] text-white flex flex-col items-center justify-center relative overflow-hidden font-sans">
      {/* 🌌 Background gradient */}
      <motion.div
        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,255,255,0.15),transparent_60%),radial-gradient(circle_at_80%_100%,rgba(255,0,255,0.1),transparent_70%)] blur-[100px]"
        animate={{
          backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      />

      <div className="relative z-10 w-full max-w-5xl p-6 text-center">
        {step === "select" ? (
          <SelectorStep onNext={handleNext} />
        ) : (
          <>
            <motion.h1
              className="text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 via-blue-400 to-fuchsia-500 bg-clip-text text-transparent"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1 }}
            >
              Choose Your Resume Template
            </motion.h1>

            <p className="text-gray-400 mb-10 text-lg">
              {form.tech} — {form.country}
            </p>

            <TemplateSelector onSelect={handleSelectTemplate} />
          </>
        )}
      </div>
    </main>
  );
}