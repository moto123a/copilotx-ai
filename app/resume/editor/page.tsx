"use client";

import { Suspense } from "react";
import EditorPageImpl from "./EditorPageImpl";

export default function ResumeEditorWrapper() {
  return (
    <Suspense fallback={<div className="text-white p-6">Loading editor...</div>}>
      <EditorPageImpl />
    </Suspense>
  );
}