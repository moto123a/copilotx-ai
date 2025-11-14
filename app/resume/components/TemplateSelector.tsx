"use client";

import TemplateCard from "./TemplateCard";

export default function TemplateSelector({
  onSelect,
}: {
  onSelect: (id: string) => void;
}) {
  const templates = [
    {
      id: "modern",
      name: "Modern Professional",
      desc: "Clean, bold, and perfect for tech jobs. ATS-optimized layout.",
      color: "from-cyan-500 via-blue-500 to-fuchsia-500",
    },
    {
      id: "minimal",
      name: "Minimalist Classic",
      desc: "Elegant, neutral template ideal for corporate or formal roles.",
      color: "from-gray-200 via-gray-400 to-gray-600",
    },
    {
      id: "creative",
      name: "Creative Edge",
      desc: "Stylish and unique layout for designers and innovators.",
      color: "from-fuchsia-500 via-purple-500 to-indigo-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-10 justify-center">
      {templates.map((t) => (
        <TemplateCard key={t.id} template={t} onSelect={() => onSelect(t.id)} />
      ))}
    </div>
  );
}