"use client";

import dynamic from "next/dynamic";

const ResumeEditor = dynamic(() => import("../components/ResumeEditor"), {
  ssr: false,
  loading: () => <p className="text-white">Loading editor...</p>,
});

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function ResumeEditorPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] flex justify-center items-center text-white">
      <ResumeEditor template="modern" country="USA" role="Software Developer" />
    </main>
  );
}