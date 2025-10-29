"use client";

import React from "react";
import dynamic from "next/dynamic";

// ✅ Load ResumeEditor only on the client side
const ResumeEditor = dynamic(() => import("../components/ResumeEditor"), {
  ssr: false, // disables server-side rendering
  loading: () => <div>Loading editor...</div>,
});

// ✅ Prevent Next.js from trying to prerender this page
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function ResumeEditorPage() {
  return (
    <main
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        background: "#0f0f0f",
        color: "#fff",
      }}
    >
      <ResumeEditor />
    </main>
  );
}