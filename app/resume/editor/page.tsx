"use client";

import React from "react";
import dynamic from "next/dynamic";

// ✅ Import your component dynamically and disable SSR
const ResumeEditor = dynamic(() => import("../components/ResumeEditor"), {
  ssr: false,
  loading: () => <div>Loading editor...</div>,
});

// ✅ Remove ALL other exports — these are what break your build
// ❌ Do NOT export `dynamic`, `fetchCache`, or `revalidate` here
// They are causing the TypeScript type mismatch you see in your terminal

export default function ResumeEditorPage() {
  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "#0f172a",
        color: "white",
      }}
    >
      <ResumeEditor />
    </main>
  );
}