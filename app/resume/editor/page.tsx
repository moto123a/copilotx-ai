"use client";

import dynamic from "next/dynamic";
import React from "react";

// ✅ Adjust path if your component lives elsewhere
const ResumeEditor = dynamic(() => import("@/components/resume/ResumeEditor"), {
  ssr: false,
  loading: () => <p style={{ color: "#999", textAlign: "center" }}>Loading editor...</p>,
});

export default function ResumeEditorPage() {
  if (typeof window === "undefined") return null; // 🚫 avoid SSR on Vercel
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "white",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <h1 style={{ fontSize: "2rem", marginBottom: "1.5rem" }}>
        CopilotX Resume Editor
      </h1>
      <div style={{ width: "100%", maxWidth: "1100px", background: "#1e293b", padding: "2rem", borderRadius: "1rem" }}>
        <ResumeEditor template="modern" country="USA" role="Software Engineer" />
      </div>
    </main>
  );
}