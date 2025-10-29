"use client";

export default function ResumePreview({
  resume,
  template,
}: {
  resume: any;
  template: string;
}) {
  return (
    <div
      id="resume-preview"
      className="bg-white text-black rounded-lg p-8 min-h-full shadow-xl font-sans"
    >
      <h1 className="text-3xl font-bold text-center mb-2">{resume.name}</h1>
      <p className="text-center text-gray-600 text-sm mb-6">
        {resume.email && `${resume.email} • `} 
        {resume.phone && `${resume.phone}`}
      </p>

      <Section title="Professional Summary" text={resume.summary} />
      <Section title="Experience" text={resume.experience} />
      <Section title="Education" text={resume.education} />
      <Section title="Skills" text={resume.skills} />
    </div>
  );
}

function Section({ title, text }: { title: string; text: string }) {
  if (!text) return null;
  return (
    <div className="mb-6">
      <h2 className="text-lg font-bold mb-2 text-gray-800">{title}</h2>
      <p className="text-gray-700 whitespace-pre-line text-sm leading-relaxed">
        {text}
      </p>
    </div>
  );
}