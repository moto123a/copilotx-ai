"use client";
import React, { useEffect, useState } from "react";

export default function ResumeEditor() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Run only in browser
    setIsClient(true);
  }, []);

  if (!isClient) return <div>Loading editor...</div>;

  return (
    <div>
      <h1 style={{ color: "white" }}>Resume Editor</h1>
      <textarea
        placeholder="Paste your resume here..."
        style={{
          width: "100%",
          height: "300px",
          background: "#1e293b",
          color: "white",
          padding: "1rem",
          borderRadius: "8px",
        }}
      />
    </div>
  );
}