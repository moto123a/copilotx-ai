"use client";

import React from "react";
import ResumeEditor from "../components/ResumeEditor";

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
        }}
      >
        <ResumeEditor
          template="modern"
          country="USA"
          role="Software Engineer"
        />
      </div>
    </main>
  );
}