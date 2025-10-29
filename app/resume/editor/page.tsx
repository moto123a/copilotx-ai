"use client";

import dynamic from "next/dynamic";
import React from "react";

// ✅ Adjust this path based on where ResumeEditor.tsx actually lives
const ResumeEditor = dynamic(() => import("@/components/resume/ResumeEditor"), {
  ssr: false,
  loading: () => <p className="text-gray-400 text-center">Loading editor...</p>,
});

export default function ResumeEditorPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center">
      <h1 className="text-3xl font-semibold mb-6 text-center">
        CopilotX Resume Editor
      </h1>

      <div className="w-full max-w-6xl bg-gray-900 p-6 rounded-xl shadow-lg">
        {/* 🔹 Disable SSR completely for ResumeEditor */}
        <ResumeEditor template="modern" country="USA" role="Software Engineer" />
      </div>
    </main>
  );
}