"use client";

import { Suspense } from "react";
import LiveInterviewClient from "./pageImpl";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-10 text-white">Loading interview…</div>}>
      <LiveInterviewClient />
    </Suspense>
  );
}