"use client";

import React from "react";
import dynamic from "next/dynamic";

// ✅ Dynamically import ResumeEditor — disable SSR (so it never runs on server)
const ResumeEditor = dynamic(() => import("../../../components/ResumeEditor"), {
  ssr: false,
  loading: () => <div>Loading editor...</div>,
});

// ✅ Prevent Next.js pre-rendering / caching issues
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

// ✅ Component
export default function ResumeEditorPage() {
  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        padding: "2rem",
        minHeight: "100vh",
      }}
    >
      <div>
        <ResumeEditor />
      </div>
    </main>
  );
}