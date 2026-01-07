// app/api/stt/tokens/route.ts
import { NextResponse } from "next/server";
import admin from "firebase-admin";

export const dynamic = "force-dynamic";

// ============================================================================
// 1) FIREBASE ADMIN (KEEP WORKING INIT EXACTLY)
// ============================================================================
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKeyInput = process.env.FIREBASE_PRIVATE_KEY;

if (!admin.apps.length) {
  if (projectId && clientEmail && privateKeyInput) {
    try {
      let formattedKey = privateKeyInput;
      if (!formattedKey.startsWith("---")) {
        formattedKey = Buffer.from(formattedKey, "base64").toString("utf8");
      }
      formattedKey = formattedKey.replace(/\\n/g, "\n").replace(/^"|"$/g, "");

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: formattedKey,
        }),
      });
      console.log("✅ Firebase Admin Initialized Successfully");
    } catch (error) {
      console.error("Firebase Init Error:", error);
    }
  }
}

const db = admin.apps.length ? admin.firestore() : null;

// ============================================================================
// 2) LOGGING (KEEP WORKING)
// ============================================================================
async function logUsageAndIncrement(email: string, service: string, details: any) {
  if (!db) return;
  try {
    await db.collection("api_usage_logs").add({
      userEmail: email || "Anonymous",
      service,
      transcript: details.transcript || "",
      durationSeconds: details.duration || 0,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      mode: details.mode || "chat",
    });

    if (email) {
      const userQuery = await db.collection("users").where("email", "==", email).limit(1).get();
      if (!userQuery.empty) {
        const userDoc = userQuery.docs[0];
        await userDoc.ref.update({
          usageCount: admin.firestore.FieldValue.increment(1),
          totalDurationSeconds: admin.firestore.FieldValue.increment(details.duration || 0),
          lastUsed: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }
  } catch (err) {
    console.error("Log Error:", err);
  }
}

// ============================================================================
// 3) COMMON HELPERS (SAFE)
// ============================================================================
function normalizeDashes(input: string) {
  return (input || "").replace(/[–—−]/g, "-").replace(/\u00A0/g, " ");
}

function sanitizeText(text: string) {
  if (!text) return "";
  const normalized = normalizeDashes(text);
  // keep only printable ascii + newline to avoid parser surprises & model issues
  return normalized.replace(/[^\x20-\x7E\n]/g, "").slice(0, 30000);
}

function cleanJson(text: string) {
  try {
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) return text.substring(firstBrace, lastBrace + 1);
    return "{}";
  } catch {
    return "{}";
  }
}

// ============================================================================
// 4) DETERMINISTIC RESUME EXPERIENCE PARSER (REPLACES GROQ verify_resume)
// ============================================================================
const NOW_YEAR = 2026;
const NOW_MONTH = 1; // Jan
const MERGE_ADJACENT = false;

const monthMap: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

function toMonthNum(monthStr: string): number | null {
  if (!monthStr) return null;
  const key = monthStr.trim().toLowerCase();
  return monthMap[key] ?? null;
}

function monthIndex(year: number, month: number): number {
  return year * 12 + (month - 1);
}

function monthsInclusive(startIdx: number, endIdx: number): number {
  if (endIdx < startIdx) return 0;
  return endIdx - startIdx + 1;
}

function formatYearsMonths(totalMonths: number) {
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  return `${years} years ${months} months`;
}

function sliceProfessionalExperience(resume: string) {
  const lower = resume.toLowerCase();
  const start = lower.indexOf("professional experience");
  if (start === -1) return resume;

  const edu = lower.indexOf("\neducation", start);
  if (edu !== -1) return resume.slice(start, edu);

  return resume.slice(start);
}

type ParsedRange = {
  sm: number;
  sy: number;
  em: number;
  ey: number;
  durationText: string;
};

function parseDateRange(text: string): ParsedRange | null {
  const s = normalizeDashes(text);

  const re =
    /([A-Za-z]{3,9})\s+(\d{4})\s*(?:-|\sto\s)\s*(present|till\s*date|[A-Za-z]{3,9})\s*(\d{4})?/i;

  const m = s.match(re);
  if (!m) return null;

  const sm = toMonthNum(m[1]);
  const sy = parseInt(m[2], 10);
  if (!sm || !sy) return null;

  const endToken = (m[3] || "").toLowerCase().replace(/\s+/g, "");

  let em: number;
  let ey: number;

  if (endToken === "present" || endToken === "tilldate") {
    em = NOW_MONTH;
    ey = NOW_YEAR;
  } else {
    const endMonth = toMonthNum(m[3]);
    const endYear = m[4] ? parseInt(m[4], 10) : NaN;
    if (!endMonth || !endYear) return null;
    em = endMonth;
    ey = endYear;
  }

  const durationText = `${m[1]} ${m[2]} - ${m[3]}${m[4] ? ` ${m[4]}` : ""}`
    .replace(/\s+/g, " ")
    .trim();

  return { sm, sy, em, ey, durationText };
}

function stripDurationFromLabel(label: string, durationText: string) {
  const cleanLabel = normalizeDashes(label)
    .replace(durationText, "")
    .replace(/\s+/g, " ")
    .replace(/[|]+/g, " ")
    .trim();

  return cleanLabel;
}

type Job = {
  label: string;
  durationText: string;
  months: number;
  startIdx: number;
  endIdx: number;
};

function extractJobs(experienceText: string): Job[] {
  const lines = experienceText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const jobs: Job[] = [];
  let lastHeader = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const isHeader = /^(client:|company:)/i.test(line);
    if (isHeader) {
      lastHeader = line;

      // Inline dates on the header itself
      const parsedInline = parseDateRange(line);
      if (parsedInline) {
        const sIdx = monthIndex(parsedInline.sy, parsedInline.sm);
        const eIdx = monthIndex(parsedInline.ey, parsedInline.em);

        const cleanLabel = stripDurationFromLabel(lastHeader, parsedInline.durationText);

        jobs.push({
          label: cleanLabel,
          durationText: parsedInline.durationText,
          startIdx: sIdx,
          endIdx: eIdx,
          months: monthsInclusive(sIdx, eIdx),
        });
        continue;
      }

      // Dates might be on next line
      const next = lines[i + 1] || "";
      const parsedNext = parseDateRange(next);
      if (parsedNext) {
        const sIdx = monthIndex(parsedNext.sy, parsedNext.sm);
        const eIdx = monthIndex(parsedNext.ey, parsedNext.em);

        jobs.push({
          label: lastHeader.replace(/\s+/g, " ").trim(),
          durationText: parsedNext.durationText,
          startIdx: sIdx,
          endIdx: eIdx,
          months: monthsInclusive(sIdx, eIdx),
        });
      }

      continue;
    }

    // Support "Duration:" lines inside a job block
    if (/^duration\s*:/i.test(line) && lastHeader) {
      const parsed = parseDateRange(line);
      if (!parsed) continue;

      const sIdx = monthIndex(parsed.sy, parsed.sm);
      const eIdx = monthIndex(parsed.ey, parsed.em);

      jobs.push({
        label: lastHeader.replace(/\s+/g, " ").trim(),
        durationText: parsed.durationText,
        startIdx: sIdx,
        endIdx: eIdx,
        months: monthsInclusive(sIdx, eIdx),
      });
    }
  }

  return jobs;
}

type Interval = { startIdx: number; endIdx: number };

function mergeIntervals(intervals: Interval[]): Interval[] {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a.startIdx - b.startIdx);

  const merged: Interval[] = [];
  let cur = { ...sorted[0] };

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];

    const canMerge = MERGE_ADJACENT ? next.startIdx <= cur.endIdx + 1 : next.startIdx <= cur.endIdx;

    if (canMerge) {
      cur.endIdx = Math.max(cur.endIdx, next.endIdx);
    } else {
      merged.push(cur);
      cur = { ...next };
    }
  }

  merged.push(cur);
  return merged;
}

function verifyResumeDeterministic(resumeRaw: string) {
  const resume = sanitizeText(resumeRaw ?? "");

  if (!resume || resume.length < 50) {
    return {
      totalExperience: "0 years 0 months",
      summary: "Resume text missing/too short.",
    };
  }

  const experienceText = sliceProfessionalExperience(resume);
  const jobs = extractJobs(experienceText);

  if (jobs.length === 0) {
    return {
      totalExperience: "0 years 0 months",
      summary:
        `Verification Scan (Jan 2026):\n` +
        `- Mathematical Audit Result: No job durations found.\n` +
        `Fix format to include lines like:\n` +
        `  "Client: X || Duration: Nov 2024 - Till Date"\n` +
        `  "Client: Y || Duration: Sep 2023 - Oct 2024"\n`,
    };
  }

  const grossMonths = jobs.reduce((sum, j) => sum + j.months, 0);

  const intervals: Interval[] = jobs.map((j) => ({ startIdx: j.startIdx, endIdx: j.endIdx }));
  const merged = mergeIntervals(intervals);

  const netMonths = merged.reduce((sum, it) => sum + monthsInclusive(it.startIdx, it.endIdx), 0);

  const lines: string[] = [];
  lines.push(`Verification Scan (Jan 2026):`);
  lines.push(`- Mathematical Audit Result:`);

  jobs.forEach((j, idx) => {
    lines.push(`  ${idx + 1}. ${j.label} || Duration: ${j.durationText} = ${j.months} months`);
  });

  lines.push(
    `- Total Calculation (gross): ${jobs.map((j) => `${j.months}`).join(" + ")} = ${grossMonths} months (${formatYearsMonths(
      grossMonths
    )})`
  );

  const hadMerge = merged.length !== intervals.length;
  if (!hadMerge) lines.push(`- Interval Consolidation: no overlaps detected.`);
  else lines.push(`- Interval Consolidation: merged ${intervals.length} intervals into ${merged.length}.`);

  lines.push(`- Total Net Experience: ${netMonths} months (${formatYearsMonths(netMonths)}).`);

  return {
    totalExperience: formatYearsMonths(netMonths),
    summary: lines.join("\n"),
  };
}

// ============================================================================
// 5) GET: SPEECHMATICS TOKEN (KEEP WORKING)
// ============================================================================
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userEmail = searchParams.get("email") || "Unknown User";
    const apiKey = process.env.SPEECHMATICS_API_KEY;

    if (!apiKey) return NextResponse.json({ error: "Key missing" }, { status: 500 });

    const response = await fetch("https://mp.speechmatics.com/v1/api_keys?type=rt", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ ttl: 60 }),
    });

    if (!response.ok) return NextResponse.json({ error: "Failed" }, { status: 401 });
    const data = await response.json();

    await logUsageAndIncrement(userEmail, "Speechmatics", { action: "Token Requested" });

    return NextResponse.json({ token: data.key_value });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ============================================================================
// 6) POST: GROQ (KEEP WORKING MODES) + VERIFY_RESUME (NEW DETERMINISTIC)
// ============================================================================
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { transcript, resume, jd, userEmail, duration, mode, question, answer } = body;

    // ------------------------------------------------------------------
    // MODE A: VERIFY RESUME (DETERMINISTIC, NO GROQ)
    // ------------------------------------------------------------------
    if (mode === "verify_resume") {
      const result = verifyResumeDeterministic(resume);

      await logUsageAndIncrement(userEmail || "Unknown", "Resume-Verify", {
        mode: "verify_resume",
        transcript: "",
        duration: duration || 0,
      });

      // Keep response shape your UI expects: data.totalExperience
      return NextResponse.json({
        totalExperience: result.totalExperience,
        summary: result.summary,
      });
    }

    // Everything below is your existing Groq logic (unchanged behavior)
    const groqApiKey = process.env.GROQ_API_KEY;

    if (!groqApiKey) {
      // keep original-ish fallback
      return NextResponse.json({
        score: 0,
        strengths: [],
        improvements: ["Missing API Key"],
        resume_proof: "N/A",
      });
    }

    // ------------------------------------------------------------------
    // MODE B: FEEDBACK
    // ------------------------------------------------------------------
    if (mode === "generate_feedback") {
      const safeResume = sanitizeText(resume);
      try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${groqApiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [
              { role: "system", content: `Technical Interviewer. JSON: {score, strengths, improvements, betterAnswerExample, resume_proof}.` },
              { role: "user", content: `RESUME: ${safeResume}\nQUESTION: ${question}\nANSWER: ${answer}` },
            ],
            temperature: 0.1,
            response_format: { type: "json_object" },
          }),
        });

        const data = await response.json();
        return NextResponse.json(JSON.parse(cleanJson(data.choices?.[0]?.message?.content)));
      } catch {
        return NextResponse.json({ score: 0 });
      }
    }

    // ------------------------------------------------------------------
    // MODE C: QUESTIONS
    // ------------------------------------------------------------------
    if (mode === "generate_questions") {
      const safeResume = sanitizeText(resume);

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${groqApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            { role: "system", content: `Generate 5 questions. JSON ONLY.` },
            { role: "user", content: `RESUME: ${safeResume}` },
          ],
          response_format: { type: "json_object" },
        }),
      });

      const data = await response.json();
      return NextResponse.json(JSON.parse(cleanJson(data.choices?.[0]?.message?.content)));
    }

    // ------------------------------------------------------------------
    // MODE D: REAL-TIME INTERVIEW (DEFAULT)
    // ------------------------------------------------------------------
    await logUsageAndIncrement(userEmail, "Groq-RealTime", { transcript, duration });

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${groqApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: `You are the CANDIDATE in a technical interview. Current Date: Jan 2026.

RULES:
1. Speak in the FIRST PERSON ("I have...", "In my role...").
2. Be mathematically precise. Sum the months of each job listed in the resume.
3. Acknowledge education gaps (e.g. Masters) naturally if asked about the timeline.
4. Sound natural, confident, and professional. Speak directly.`,
          },
          { role: "user", content: `RESUME: ${sanitizeText(resume)}\n\nInterviewer asks: "${transcript}"` },
        ],
        temperature: 0.1,
        max_tokens: 600,
      }),
    });

    const data = await response.json();
    let aiAns = data.choices?.[0]?.message?.content || "...";
    aiAns = aiAns
      .replace(/^(Based on the resume|As the candidate|I see that|According to the|The resume mentions|Looking at your resume)/i, "")
      .trim();

    return NextResponse.json({ answer: aiAns });
  } catch (error: any) {
    console.error("API Error", error);
    return NextResponse.json({ score: 0 });
  }
}
