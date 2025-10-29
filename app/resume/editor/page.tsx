"use client";

import dynamic from "next/dynamic";

// ✅ Use a different local variable name to avoid conflict
const DynamicResumeEditor = dynamic(() => import("../components/ResumeEditor"), {
  ssr: false,
  loading: () => <p className="text-white">Loading editor...</p>,
});

// ✅ Keep export constants separate and safe
export const dynamicMode = "force-dynamic";
export const revalidate = 0;

export default function ResumeEditorPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] flex justify-center items-center text-white">
      <DynamicResumeEditor
        template="modern"
        country="USA"
        role="Software Developer"
      />
    </main>
  );
}