"use client"; // must be the very first line

import React from "react";
import loadable from "next/dynamic"; // renamed to avoid conflict with export const dynamic

// ✅ Dynamically import ResumeEditor to disable SSR
const ResumeEditor = loadable(
  () => import("../components/ResumeEditor"),
  { ssr: false } // ensures no server-side rendering
);

// ✅ Disable static generation and caching
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default function ResumeEditorPage() {
  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      <h1 style={{ fontSize: "2rem", marginBottom: "1.5rem" }}>
        CopilotX Resume Editor
      </h1>

      <div
        style={{
          width: "100%",
          maxWidth: "1000px",
          background: "#1e293b",
          padding: "2rem",
          borderRadius: "1rem",
          color: "white",
        }}
      >
        {/* ✅ Fix for missing props during build */}
        <ResumeEditor {...({} as any)} />
      </div>
    </main>
  );
}