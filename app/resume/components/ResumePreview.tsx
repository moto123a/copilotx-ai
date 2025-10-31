"use client";

import { useEffect, useRef, useState } from "react";

interface ResumeData {
  name: string;
  email: string;
  phone: string;
  summary: string;
  experience: string;
  education: string;
  skills: string;
}

export default function ResumePreview({
  resume,
  template,
  mode = "mini",
}: {
  resume: ResumeData;
  template: string;
  mode?: "mini" | "full";
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(14);

  useEffect(() => {
    if (mode === "full") return;

    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    let currentFont = 14;
    content.style.fontSize = currentFont + "px";

    const adjustSize = () => {
      let attempts = 0;
      while (
        content.scrollHeight > container.clientHeight &&
        currentFont > 4 &&
        attempts < 100
      ) {
        currentFont -= 0.2;
        content.style.fontSize = currentFont + "px";
        attempts++;
      }
      setFontSize(currentFont);
    };

    setTimeout(adjustSize, 200);
  }, [resume, mode]);

  // 🔧 Fix layout spacing to move preview a bit left
  const styles =
    mode === "mini"
      ? {
          width: "360px",
          height: "520px",
          padding: "10px",
          overflow: "hidden",
          marginLeft: "-40px", // 👈 shifts preview slightly left
        }
      : {
          width: "800px",
          height: "100%",
          padding: "40px",
          overflowY: "auto",
          marginLeft: "-60px", // 👈 fix for larger preview
        };

  return (
    <div
      ref={containerRef}
      className="flex justify-center items-start bg-transparent rounded-xl"
      style={styles as React.CSSProperties} // ✅ fixes red underline
    >
      <div
        ref={contentRef}
        className="bg-white text-black rounded-xl p-8 shadow-md"
        style={{
          width: "100%",
          lineHeight: "1.5",
          fontSize: `${fontSize}px`,
          transition: "font-size 0.2s ease",
        }}
      >
        <h1
          className="text-center font-bold uppercase mb-4 text-blue-700"
          style={{ fontSize: `${fontSize + 6}px` }}
        >
          {resume.name || "Your Name"}
        </h1>

        <p
          className="text-center mb-6 text-gray-600"
          style={{ fontSize: `${fontSize - 1}px` }}
        >
          {resume.email || "your@email.com"} |{" "}
          {resume.phone || "(123) 456-7890"}
        </p>

        <h2
          className="font-semibold mb-2 text-blue-700"
          style={{ fontSize: `${fontSize + 1}px` }}
        >
          Summary
        </h2>
        <p className="text-gray-800 mb-4 whitespace-pre-line">
          {resume.summary || "Write a short summary about yourself."}
        </p>

        <h2
          className="font-semibold mb-2 text-blue-700"
          style={{ fontSize: `${fontSize + 1}px` }}
        >
          Experience
        </h2>
        <p className="text-gray-800 mb-4 whitespace-pre-line">
          {resume.experience || "List your work experience here."}
        </p>

        <h2
          className="font-semibold mb-2 text-blue-700"
          style={{ fontSize: `${fontSize + 1}px` }}
        >
          Education
        </h2>
        <p className="text-gray-800 mb-4 whitespace-pre-line">
          {resume.education || "Mention your education details."}
        </p>

        <h2
          className="font-semibold mb-2 text-blue-700"
          style={{ fontSize: `${fontSize + 1}px` }}
        >
          Skills
        </h2>
        <p className="text-gray-800 whitespace-pre-line">
          {resume.skills || "List your professional skills."}
        </p>
      </div>
    </div>
  );
}