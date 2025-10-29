"use client";

import dynamic from "next/dynamic";
import React from "react";

// ✅ Dynamically import your actual editor component (client-side only)
const ResumeEditor = dynamic(() => import("@/components/resume/ResumeEditor"), {
  ssr: false,
  loading: () => <p>Loading Resume Editor...</p>,
});

export default function EditorPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center">
      <h1 className="text-3xl font-semibold mb-6 text-center">
        Resume Editor
      </h1>
      <div className="w-full max-w-6xl bg-gray-900 p-6 rounded-lg shadow-lg">
        <ResumeEditor />
      </div>
    </main>
  );
}