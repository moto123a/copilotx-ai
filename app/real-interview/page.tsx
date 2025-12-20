// app/real-interview/page.tsx
"use client";

import Link from "next/link";

export default function RealInterviewChooserPage() {
  return (
    <div className="min-h-screen bg-[#0b0f14] text-[#e8f0fa]">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-10">
          <h1 className="text-3xl font-semibold">Real-Time Interview</h1>
          <Link href="/">
            <button className="px-4 py-2 rounded-lg border border-[#233048] bg-[#131a25] hover:border-[#2a7fff] font-semibold">
              Back to Home
            </button>
          </Link>
        </div>

        <p className="text-[#9fb0c3] mb-8">
          Choose how you want to run the interview assistant.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Laptop Interview */}
          <Link href="/real-interview/laptop" className="block">
            <div className="rounded-2xl border border-[#233048] bg-[#121821] p-6 hover:border-[#2a7fff] transition">
              <div className="text-xl font-semibold mb-2">Laptop Interview</div>
              <div className="text-[#9fb0c3] mb-6">
                Use on your laptop during screen share.
              </div>
              <button className="w-full px-4 py-3 rounded-xl border border-[#233048] bg-[#131a25] hover:border-[#2a7fff] font-semibold">
                Open Laptop Interview
              </button>
            </div>
          </Link>

          {/* Phone Interview */}
          <Link href="/real-interview/phone" className="block">
            <div className="rounded-2xl border border-[#233048] bg-[#121821] p-6 hover:border-[#2a7fff] transition">
              <div className="text-xl font-semibold mb-2">Phone Interview</div>
              <div className="text-[#9fb0c3] mb-6">
                Use your mic to capture the interviewer and generate answers.
              </div>
              <button className="w-full px-4 py-3 rounded-xl border border-[#233048] bg-[#131a25] hover:border-[#2a7fff] font-semibold">
                Open Phone Interview
              </button>
            </div>
          </Link>
        </div>

        <div className="mt-10 text-sm text-[#9fb0c3]">
          Phone Interview opens your current WebKit STT page.
        </div>
      </div>
    </div>
  );
}