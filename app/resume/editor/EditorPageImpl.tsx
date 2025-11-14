"use client";

import { useSearchParams } from "next/navigation";
import { saveAs } from "file-saver";
import dynamic from "next/dynamic";

export default function EditorPageImpl() {
  const searchParams = useSearchParams();
  const template = searchParams.get("template") || "modern";
  const country = searchParams.get("country") || "USA";
  const role = searchParams.get("role") || "Software Developer";

  const ResumeEditor = dynamic(() => import("../components/ResumeEditor"), {
    ssr: false,
  });

  const handleDownloadPDF = async () => {
    const html2pdf = (await import("html2pdf.js")).default;
    const resume = document.querySelector("#resume-preview");
    if (!resume) return;

    html2pdf()
      .from(resume as HTMLElement)
      .set({
        margin: 0.5,
        filename: `CopilotX_${role.replace(/\s+/g, "_")}_Resume.pdf`,
        html2canvas: { scale: 2 },
        jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
      })
      .save();
  };

  const handleDownloadWord = () => {
    const resume = document.querySelector("#resume-preview");
    if (!resume) return;
    const blob = new Blob([(resume as HTMLElement).outerHTML], {
      type: "application/msword",
    });
    saveAs(blob, `CopilotX_${role.replace(/\s+/g, "_")}_Resume.doc`);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center py-6 relative">
      <div className="absolute top-4 right-6 flex gap-3 z-50">
        <button
          onClick={handleDownloadPDF}
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded-md"
        >
          📄 PDF
        </button>
        <button
          onClick={handleDownloadWord}
          className="bg-pink-500 hover:bg-pink-600 text-white font-semibold px-4 py-2 rounded-md"
        >
          📝 DOC
        </button>
      </div>

      <ResumeEditor template={template} country={country} role={role} />
    </div>
  );
}