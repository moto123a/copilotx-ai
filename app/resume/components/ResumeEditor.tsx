"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import ResumePreview from "./ResumePreview";

interface ResumeData {
  name: string;
  email: string;
  phone: string;
  summary: string;
  experience: string;
  education: string;
  skills: string;
}

export default function ResumeEditor({
  template,
  country,
  role,
}: {
  template: string;
  country: string;
  role: string;
}) {
  const [resume, setResume] = useState<ResumeData>({
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
  const [showPreview, setShowPreview] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const fields = Object.keys(resume) as (keyof ResumeData)[];

  /* ---------- Local AI Stream ---------- */
  async function localAIStream(prompt: string, onChunk: (text: string) => void) {
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
      alert("Make sure Ollama is running locally!");
    }
  }

  /* ---------- AI Suggest (Only Raw Content) ---------- */
  const handleAISuggest = async () => {
    const key = fields[step];
    if (["name", "email", "phone"].includes(key)) return;
    setIsGenerating(true);

    const prompt = `Give ONLY the ${key} text for a ${role} resume in ${country}. 
No titles, no labels, no "Summary:", no "Experience:", just the plain paragraph or bullet list. 
Keep it realistic, concise, and ATS-optimized.`;

    await localAIStream(prompt, (liveText) =>
      setResume((prev) => ({ ...prev, [key]: liveText }))
    );

    setIsGenerating(false);
  };

  /* ---------- Navigation ---------- */
  const handleNext = () => step < fields.length - 1 && setStep(step + 1);
  const handleBack = () => step > 0 && setStep(step - 1);
  const handleChange = (value: string) => {
    const key = fields[step];
    setResume((prev) => ({ ...prev, [key]: value }));
  };

  const currentKey = fields[step];
  const showAISuggest = !["name", "email", "phone"].includes(currentKey);

  /* ---------- RETURN ---------- */
  return (
    <div className="flex justify-center w-full bg-gray-900">
      <div
        className="flex flex-col md:flex-row justify-between items-start w-full max-w-7xl gap-8 px-4 py-8"
        style={{ minHeight: "90vh" }}
        data-html2canvas-ignore="true"
      >
        {/* ---------- LEFT SIDE FORM ---------- */}
        <motion.div
          className="p-6 bg-white/5 rounded-2xl backdrop-blur-lg border border-white/10 flex flex-col justify-between shadow-lg w-full md:w-[42%] h-[65vh] overflow-hidden"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div>
            <h2 className="text-2xl font-bold mb-1 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Resume Builder ({country})
            </h2>
            <p className="text-gray-400 text-sm mb-5">
              Please enter details step by step. You can use AI Suggest to auto-generate content.
            </p>

            <h3 className="text-lg font-semibold mb-2 capitalize text-gray-300">
              {currentKey}
            </h3>

            <textarea
              value={resume[currentKey]}
              onChange={(e) => handleChange(e.target.value)}
              rows={currentKey === "summary" ? 5 : 3}
              placeholder={`Enter your ${currentKey}...`}
              className="w-full p-4 rounded-xl bg-white/10 text-white border border-white/10 focus:border-cyan-400 focus:outline-none resize-none mb-3"
            />

            {showAISuggest && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleAISuggest}
                disabled={isGenerating}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-sm font-semibold text-white"
              >
                {isGenerating ? "Generating..." : "AI Suggest"}
              </motion.button>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center mt-6">
            <button
              onClick={handleBack}
              disabled={step === 0}
              className={`px-5 py-2 rounded-lg text-sm transition-all ${
                step === 0
                  ? "bg-gray-700 cursor-not-allowed opacity-50"
                  : "bg-gradient-to-r from-gray-600 to-gray-500 hover:from-gray-500 hover:to-gray-400"
              }`}
            >
              Back
            </button>
            <p className="text-gray-400 text-sm">
              Step {step + 1} of {fields.length}
            </p>
            <button
              onClick={handleNext}
              disabled={step === fields.length - 1}
              className={`px-5 py-2 rounded-lg text-sm transition-all ${
                step === fields.length - 1
                  ? "bg-gray-700 cursor-not-allowed opacity-50"
                  : "bg-gradient-to-r from-cyan-500 to-fuchsia-500 hover:from-cyan-400 hover:to-fuchsia-400"
              }`}
            >
              Next
            </button>
          </div>
        </motion.div>

        {/* ---------- RIGHT SIDE LIVE PREVIEW ---------- */}
        <div className="flex flex-col justify-start items-center w-full md:w-[56%] py-8">
          <motion.div
            id="resume-preview"
            ref={previewRef}
            className="bg-white shadow-2xl rounded-md border border-gray-300"
            style={{
              width: "760px",
              minHeight: "600px",
              maxHeight: "80vh",
              padding: "40px",
              overflowY: "auto",
              overflowX: "hidden",
              boxSizing: "border-box",
            }}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <ResumePreview resume={resume} template={template} mode="full" />
          </motion.div>

          <button
            onClick={() => setShowPreview(true)}
            className="mt-6 px-8 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white font-semibold hover:from-cyan-400 hover:to-fuchsia-400 transition-all"
          >
            Preview
          </button>
        </div>

        {/* ---------- FULLY RESPONSIVE PREVIEW POPUP ---------- */}
        {showPreview && (
          <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-50 p-4 md:p-6 lg:p-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="bg-white rounded-2xl shadow-2xl relative w-full max-w-3xl mx-auto"
              style={{
                maxHeight: "90vh",
                overflow: "hidden",
              }}
            >
              {/* Close Button */}
              <button
                onClick={() => setShowPreview(false)}
                className="absolute top-3 right-4 text-gray-500 text-2xl font-light hover:text-gray-800 transition-colors z-10"
                style={{ lineHeight: 1 }}
              >
                ×
              </button>

              {/* Responsive & Centered Resume Content */}
              <div
                className="overflow-y-auto px-6 py-10 md:px-8 md:py-12 lg:px-10 lg:py-14"
                style={{
                  maxHeight: "calc(90vh - 2rem)",
                  paddingTop: "3rem",
                }}
              >
                <div className="mx-auto" style={{ maxWidth: "210mm" }}>
                  <ResumePreview resume={resume} template={template} mode="full" />
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}