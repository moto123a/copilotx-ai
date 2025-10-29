"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import html2pdf from "html2pdf.js";
import ResumePreview from "./ResumePreview";

export default function ResumeEditor({
  template,
  country,
  role,
}: {
  template: string;
  country: string;
  role: string;
}) {
  const [resume, setResume] = useState({
    name: "",
    email: "",
    phone: "",
    summary: "",
    experience: "",
    education: "",
    skills: "",
  });

  const [step, setStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const fields = Object.keys(resume);

  // ✅ Local Ollama Stream (browser-only safe)
  async function localAIStream(prompt: string, onChunk: (text: string) => void) {
    // 🧠 Prevent running during SSR build on Vercel
    if (typeof window === "undefined") return;

    try {
      const res = await fetch("http://127.0.0.1:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "mistral", prompt, stream: true }),
      });

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter(Boolean);
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.response) {
              text += data.response;
              onChunk(text);
            }
          } catch {
            text += line;
            onChunk(text);
          }
        }
      }
    } catch (err) {
      console.error("Ollama error:", err);
      alert("⚠️ Make sure Ollama is running locally on http://127.0.0.1:11434");
    }
  }

  // 💡 AI Suggest Current Step
  const handleAISuggest = async () => {
    const key = fields[step];
    if (["name", "email", "phone"].includes(key)) return; // 🚫 Skip AI for these

    setIsGenerating(true);
    const prompt = `Write a professional ${key} section for a ${role} resume in ${country}. Keep it realistic, concise, and ATS-optimized.`;

    await localAIStream(prompt, (liveText) =>
      setResume((prev) => ({ ...prev, [key]: liveText }))
    );

    setIsGenerating(false);
  };

  // 🧾 Download PDF
  const handleDownloadPDF = () => {
    if (!previewRef.current) return;
    html2pdf()
      .from(previewRef.current)
      .set({
        margin: 0.5,
        filename: `CopilotX_${role.replace(/\s+/g, "_")}_Resume.pdf`,
        html2canvas: { scale: 2 },
        jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
      })
      .save();
  };

  const handleNext = () => {
    if (step < fields.length - 1) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleChange = (value: string) => {
    const key = fields[step];
    setResume((prev) => ({ ...prev, [key]: value }));
  };

  const currentKey = fields[step];
  const showAISuggest = !["name", "email", "phone"].includes(currentKey);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 w-full">
      {/* Left Form */}
      <motion.div
        className="p-8 bg-white/5 rounded-2xl backdrop-blur-lg border border-white/10 flex flex-col justify-between"
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div>
          <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            Resume Builder ({country})
          </h2>

          <h3 className="text-lg font-semibold mb-2 capitalize text-gray-300">
            {currentKey}
          </h3>

          <textarea
            value={(resume as any)[currentKey]}
            onChange={(e) => handleChange(e.target.value)}
            rows={currentKey === "summary" ? 5 : 3}
            placeholder={`Enter your ${currentKey}...`}
            className="w-full p-4 rounded-xl bg-white/10 text-white border border-white/10 focus:border-cyan-400 focus:outline-none resize-none mb-3"
          />

          <div className="flex gap-3 mb-4">
            {showAISuggest && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleAISuggest}
                disabled={isGenerating}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-sm font-semibold"
              >
                💡 {isGenerating ? "Generating..." : "AI Suggest"}
              </motion.button>
            )}

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleDownloadPDF}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-500 text-sm font-semibold"
            >
              📄 Download PDF
            </motion.button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-6">
          <button
            onClick={handleBack}
            disabled={step === 0}
            className={`px-5 py-2 rounded-lg text-sm ${
              step === 0
                ? "bg-gray-700 cursor-not-allowed opacity-50"
                : "bg-gradient-to-r from-gray-600 to-gray-500"
            }`}
          >
            ⬅ Back
          </button>
          <p className="text-gray-400 text-sm">
            Step {step + 1} of {fields.length}
          </p>
          <button
            onClick={handleNext}
            disabled={step === fields.length - 1}
            className={`px-5 py-2 rounded-lg text-sm ${
              step === fields.length - 1
                ? "bg-gray-700 cursor-not-allowed opacity-50"
                : "bg-gradient-to-r from-cyan-500 to-fuchsia-500"
            }`}
          >
            Next ➡
          </button>
        </div>
      </motion.div>

      {/* Right Preview */}
      <motion.div
        ref={previewRef}
        className="p-8 bg-white/10 rounded-2xl backdrop-blur-lg border border-white/10 sticky top-8 h-[85vh] overflow-y-auto"
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
      >
        <ResumePreview resume={resume} template={template} />
      </motion.div>
    </div>
  );
}