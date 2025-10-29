"use client";

import { useSearchParams } from "next/navigation";
import ResumeEditor from "../components/ResumeEditor";

export default function ResumeEditorPage() {
  const params = useSearchParams();
  const template = params.get("template") || "modern";
  const country = params.get("country") || "USA";
  const role = params.get("role") || "Software Engineer";

  return (
    <main className="min-h-screen bg-[#060617] text-white flex items-center justify-center relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,255,255,0.08),transparent_70%),radial-gradient(circle_at_80%_100%,rgba(255,0,255,0.08),transparent_80%)] blur-[120px]" />
      <div className="relative z-10 w-full max-w-7xl p-8 flex justify-between gap-8">
        <ResumeEditor template={template} country={country} role={role} />
      </div>
    </main>
  );
}