"use client";

import { useEffect, useRef, useState } from "react";
import AiRobot3D from "../../components/AiRobot3D";

// --- Types ---
type Feedback = {
  score: number;
  strengths: any[];
  improvements: any[];
  betterAnswerExample: any;
  resume_proof?: any;
};

// --- Render Safe Helper ---
const renderSafe = (val: any) => {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (typeof val === "object") {
    if (typeof (val as any).summary === "string") return (val as any).summary;
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  }
  return String(val);
};

// --- API Helper ---
async function fetchAi(payload: any) {
  const url = "/api/stt/tokens";
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    console.error("Non-JSON response from API:", text);
    throw new Error("API returned non-JSON response");
  }
}

// --- FILE HELPER ---
const handleFileUpload = async (
  e: React.ChangeEvent<HTMLInputElement>,
  setter: (s: string) => void
) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    setter(text);
  } catch {
    alert("File read error");
  }
};

// --- STRICT ANSWER RULES ---
const isTooShortAnswer = (text: string) => {
  const t = (text || "").trim();
  const words = t.split(/\s+/).filter(Boolean);
  if (t.length < 20) return true;
  if (words.length < 5) return true;
  return false;
};

// --- QUESTION NORMALIZER ---
const normalizeQuestions = (res: any): string[] => {
  const q1 = res?.questions;
  const q2 = res?.data?.questions;
  const q3 = res?.result?.questions;

  const raw = Array.isArray(q1) ? q1 : Array.isArray(q2) ? q2 : Array.isArray(q3) ? q3 : [];
  const cleaned = raw
    .map((x: any) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean);

  return cleaned;
};

// --- SHUFFLE ---
const shuffle = (arr: string[]) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ✅ Always force first question
const enforceFirstTellMe = (qs: string[]) => {
  const first = "Tell me about yourself.";
  const filtered = (qs || [])
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean)
    .filter((q) => q.toLowerCase() !== first.toLowerCase());
  return [first, ...filtered];
};

export default function MockInterviewPage() {
  // --- Data ---
  const [resumeText, setResumeText] = useState("");
  const [jdText, setJdText] = useState("");
  const [setupComplete, setSetupComplete] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Verification State
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>("");

  // --- Interview ---
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [answer, setAnswer] = useState("");

  const [micOn, setMicOn] = useState(false);
  const [interim, setInterim] = useState("");
  const [answerLocked, setAnswerLocked] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);

  const [lastFeedback, setLastFeedback] = useState<Feedback | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [sessionId, setSessionId] = useState<string>("");
  const [scores, setScores] = useState<number[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  // --- Pre-Start Camera Prompt ---
  const [showPreStart, setShowPreStart] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);

  // --- Refs ---
  const recognitionRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Logic Refs
  const shouldAutoListenRef = useRef(false);
  const silenceTimerRef = useRef<number | null>(null);
  const autoNextArmedRef = useRef(false);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const activeQuestions =
    generatedQuestions.length > 0 ? generatedQuestions : ["Tell me about yourself."];
  const currentQuestion =
    started && index < activeQuestions.length ? activeQuestions[index] : "Finished.";

  // --- LOGGER ---
  const addLog = (msg: string) => {
    setLogs((prev) => {
      if (prev[0] === msg) return prev;
      return [msg, ...prev].slice(0, 3);
    });
  };

  // --- VERIFY RESUME FUNCTION ---
  const testResumeReading = async () => {
    if (!resumeText || resumeText.length < 50) {
      alert("Please paste a valid resume first.");
      return;
    }
    setIsVerifying(true);
    setVerificationResult("");
    try {
      const data = await fetchAi({
        mode: "verify_resume",
        resume: resumeText,
        jd: jdText || "N/A",
      });

      if (data?.summary) setVerificationResult(data.summary);
      else setVerificationResult(data || "AI didn't return a summary.");
    } catch {
      setVerificationResult("Connection failed. Check API Key.");
    }
    setIsVerifying(false);
  };

  // --- UTILS ---
  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const stopSpeaking = () => {
    if (typeof window !== "undefined") window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  // --- CAMERA ---
  const startCamera = async () => {
    if (typeof window === "undefined" || !navigator.mediaDevices) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      setCameraOn(true);
    } catch {
      setCameraOn(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  };

  useEffect(() => {
    if (cameraOn && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraOn]);

  // --- MIC ---
  const stopMic = () => {
    if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);

    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }

    setMicOn(false);
    setIsUserSpeaking(false);
    clearSilenceTimer();
  };

  const startMic = () => {
    if (typeof window === "undefined") return;

    if (isSpeaking) {
      addLog("Wait: Robot Speaking");
      return;
    }
    if (isAnalyzing) {
      addLog("Wait: Analyzing");
      return;
    }
    if (micOn) return;

    stopMic();

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onstart = () => {
      setMicOn(true);
      addLog("🎤 Mic ON");
    };

    rec.onend = () => {
      setMicOn(false);
      if (
        shouldAutoListenRef.current &&
        !isSpeaking &&
        !autoNextArmedRef.current &&
        !answerLocked
      ) {
        restartTimeoutRef.current = setTimeout(() => {
          if (shouldAutoListenRef.current) {
            try {
              rec.start();
            } catch {
              addLog("Restart prevented");
            }
          }
        }, 1000);
      }
    };

    rec.onresult = (event: any) => {
      if (isSpeaking) {
        stopMic();
        return;
      }

      let iText = "";
      let fText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0]?.transcript || "";
        if (event.results[i].isFinal) fText += t + " ";
        else iText += t;
      }

      if (iText || fText) {
        setIsUserSpeaking(true);
        clearSilenceTimer();
        armSilenceTimer();
      }

      if (fText) setAnswer((prev) => (prev + " " + fText.trim()).trim());
      setInterim(iText);
    };

    rec.onerror = (e: any) => {
      if (e.error === "no-speech") return;
      addLog(`Mic Error: ${e.error}`);
      if (e.error === "not-allowed") shouldAutoListenRef.current = false;
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch {}
  };

  // --- SUBMISSION ---
  const armSilenceTimer = () => {
    clearSilenceTimer();
    silenceTimerRef.current = window.setTimeout(() => {
      if (autoNextArmedRef.current) return;
      const ans = (answer || "").trim();
      if (ans.length < 5) return;

      addLog("⏳ Processing Answer...");
      handleSubmit(ans);
    }, 2500);
  };

  const handleSubmit = async (finalAnswer: string) => {
    const cleanAns = (finalAnswer || "").trim();

    // ✅ IMPORTANT: No more fake X/Y/Z. For short answers, call backend script generator.
    if (isTooShortAnswer(cleanAns)) {
      autoNextArmedRef.current = true;
      shouldAutoListenRef.current = false;
      stopMic();

      setAnswerLocked(true);
      setInterim("");
      setIsAnalyzing(true);

      try {
        // Call new backend mode that generates a resume-based word-for-word script
        const scriptRes = await fetchAi({
          mode: "generate_script",
          question: activeQuestions[index],
          answer: cleanAns,
          resume: resumeText,
          jd: jdText,
        });

        const fb: Feedback = {
          score: 0,
          strengths: [],
          improvements: [
            "Answer is too short. Speak at least 2–3 full sentences with details from your resume.",
          ],
          betterAnswerExample:
            scriptRes?.betterAnswerExample ||
            "Speak longer. Add: role + years + 2 skills + 1 impact + what you want next.",
          resume_proof: scriptRes?.resume_proof || "",
        };

        setLastFeedback(fb);
        setScores((p) => [...p, fb.score || 0]);
        setIsAnalyzing(false);
        setShowFeedback(true);
        return;
      } catch {
        const fb: Feedback = {
          score: 0,
          strengths: [],
          improvements: [
            "Answer is too short. Speak at least 2–3 full sentences with details from your resume.",
          ],
          betterAnswerExample:
            "Speak longer. Add: role + years + 2 skills + 1 impact + what you want next.",
          resume_proof: "",
        };
        setLastFeedback(fb);
        setScores((p) => [...p, fb.score || 0]);
        setIsAnalyzing(false);
        setShowFeedback(true);
        return;
      }
    }

    autoNextArmedRef.current = true;
    shouldAutoListenRef.current = false;
    stopMic();

    setAnswerLocked(true);
    setInterim("");
    setIsAnalyzing(true);

    let fb: Feedback;
    try {
      const res = await fetchAi({
        mode: "generate_feedback",
        question: activeQuestions[index],
        answer: cleanAns,
        resume: resumeText,
        jd: jdText,
      });
      fb = res;
    } catch {
      fb = { score: 0, strengths: [], improvements: ["Error"], betterAnswerExample: "N/A" };
    }

    setLastFeedback(fb);
    setScores((p) => [...p, fb.score || 0]);
    setIsAnalyzing(false);
    setShowFeedback(true);
  };

  const nextQuestion = () => {
    setShowFeedback(false);
    if (index >= activeQuestions.length - 1) {
      setStarted(false);
      return;
    }
    setIndex((prev) => prev + 1);
    setAnswer("");
    setAnswerLocked(false);
    autoNextArmedRef.current = false;
  };

  // --- TTS ---
  const speakQuestion = () => {
    if (!started) return;

    stopSpeaking();
    shouldAutoListenRef.current = false;
    stopMic();

    setTimeout(() => {
      const utter = new SpeechSynthesisUtterance(currentQuestion);
      utter.onstart = () => setIsSpeaking(true);

      utter.onend = () => {
        setIsSpeaking(false);
        shouldAutoListenRef.current = true;
        setTimeout(() => startMic(), 1000);
      };

      window.speechSynthesis.speak(utter);
    }, 500);
  };

  // --- EFFECTS ---
  useEffect(() => {
    if (started && index < activeQuestions.length) {
      speakQuestion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, index]);

  useEffect(() => {
    return () => {
      stopSpeaking();
      stopMic();
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initSession = async () => {
    const sid = `session_${Date.now()}`;
    setSessionId(sid);
    setStarted(true);
    setIndex(0);
    setScores([]);
    setAnswer("");
    setInterim("");
    setLastFeedback(null);
    setShowFeedback(false);
    setAnswerLocked(false);
    autoNextArmedRef.current = false;
    shouldAutoListenRef.current = false;
    setIsAnalyzing(false);
  };

  const openPreStart = () => {
    setShowPreStart(true);
  };

  const confirmStart = async (enableCamera: boolean) => {
    setShowPreStart(false);
    if (enableCamera) await startCamera();
    else stopCamera();
    await initSession();
  };

  const endInterview = () => {
    stopSpeaking();
    stopMic();
    stopCamera();
    window.location.reload();
  };

  const copyScript = async () => {
    const text = renderSafe(lastFeedback?.betterAnswerExample || "");
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      addLog("✅ Script copied");
    } catch {
      addLog("Copy failed");
    }
  };

  const progressLabel =
    started && activeQuestions.length > 0 ? `${index + 1} / ${activeQuestions.length}` : "";

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      {/* Top Bar (Minimal) */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur border-b border-slate-900">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg sm:text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
              Mock Interview
            </h1>
            {started && (
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
                <span className="text-slate-600">Progress:</span>
                <span className="text-slate-300 font-bold">{progressLabel}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {started && (
              <>
                <div
                  className={[
                    "px-3 py-1 rounded-full text-[11px] font-bold border",
                    isSpeaking
                      ? "bg-blue-600/20 border-blue-500 text-blue-200"
                      : "bg-slate-950 border-slate-800 text-slate-500",
                  ].join(" ")}
                >
                  {isSpeaking ? "Speaking" : "Listening"}
                </div>

                <div
                  className={[
                    "px-3 py-1 rounded-full text-[11px] font-bold border",
                    micOn
                      ? "bg-emerald-600/20 border-emerald-500 text-emerald-200"
                      : "bg-slate-950 border-slate-800 text-slate-500",
                  ].join(" ")}
                >
                  {micOn ? "Mic On" : "Mic Off"}
                </div>

                <button
                  onClick={endInterview}
                  className="px-3 py-2 rounded-lg text-xs font-extrabold border border-red-900 text-red-400 hover:bg-red-900/20 transition"
                >
                  End
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 pb-24">
        {/* SETUP */}
        {!started && !setupComplete && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-slate-950 border border-slate-900 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                    Step 1
                  </div>
                  <div className="text-xl font-extrabold">Resume</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Paste resume text or upload a file.
                  </div>
                </div>
              </div>

              <textarea
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                className="w-full h-64 bg-black text-sm p-4 rounded-xl border border-slate-800 focus:border-blue-500 focus:outline-none"
                placeholder="Paste your resume here..."
              />

              <div className="mt-3 flex items-center justify-between gap-3">
                <label className="text-xs text-slate-400 cursor-pointer hover:text-blue-400 transition">
                  <input
                    type="file"
                    onChange={(e) => handleFileUpload(e, setResumeText)}
                    className="hidden"
                    accept=".txt,.doc,.docx"
                  />
                  Upload file (.txt, .doc, .docx)
                </label>

                <button
                  onClick={testResumeReading}
                  disabled={isVerifying || resumeText.length < 50}
                  className="px-3 py-2 rounded-lg text-xs font-extrabold border border-emerald-900 text-emerald-300 hover:bg-emerald-900/20 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  {isVerifying ? "Checking…" : "Test Resume"}
                </button>
              </div>

              {verificationResult && (
                <div className="mt-3 p-3 rounded-xl border border-emerald-900 bg-emerald-950/30">
                  <div className="text-xs font-bold text-emerald-300 mb-1">Resume Read Result</div>
                  <div className="text-xs text-emerald-100 whitespace-pre-wrap">
                    {renderSafe(verificationResult)}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-950 border border-slate-900 rounded-2xl p-5">
              <div className="mb-3">
                <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                  Step 2
                </div>
                <div className="text-xl font-extrabold">Job Description</div>
                <div className="text-xs text-slate-500 mt-1">Optional (improves relevance).</div>
              </div>

              <textarea
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                className="w-full h-64 bg-black text-sm p-4 rounded-xl border border-slate-800 focus:border-purple-500 focus:outline-none"
                placeholder="Paste job description here..."
              />

              <button
                onClick={async () => {
                  setIsGenerating(true);
                  try {
                    const res = await fetchAi({
                      mode: "generate_questions",
                      resume: resumeText,
                      jd: jdText,
                    });

                    const qs = normalizeQuestions(res);
                    const finalQs = enforceFirstTellMe(qs.length > 0 ? shuffle(qs) : []);

                    if (finalQs.length === 0) {
                      alert("Question generation failed. Check console log.");
                      setIsGenerating(false);
                      return;
                    }

                    setGeneratedQuestions(finalQs);
                    setSetupComplete(true);
                  } catch {
                    alert("Generation failed. Please try again.");
                  }
                  setIsGenerating(false);
                }}
                disabled={isGenerating || !resumeText}
                className="mt-4 w-full bg-blue-600 hover:bg-blue-500 transition px-6 py-4 rounded-2xl text-sm font-extrabold disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isGenerating ? "Generating…" : "Generate Questions"}
              </button>

              {!resumeText && (
                <div className="mt-2 text-xs text-red-400">
                  Add resume first (required).
                </div>
              )}
            </div>
          </div>
        )}

        {/* READY */}
        {setupComplete && !started && (
          <div className="bg-slate-950 border border-slate-900 rounded-2xl p-10 text-center">
            <div className="text-5xl">✅</div>
            <div className="mt-3 text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
              Ready to Start
            </div>
            <div className="mt-2 text-slate-400 text-sm">
              Question 1 is always{" "}
              <span className="text-white font-bold">“Tell me about yourself.”</span>
            </div>

            <button
              onClick={openPreStart}
              className="mt-6 bg-emerald-600 hover:bg-emerald-500 transition px-10 py-4 rounded-2xl text-lg font-extrabold"
            >
              Start Interview
            </button>
          </div>
        )}

        {/* PRE-START MODAL (Camera asked first) */}
        {showPreStart && (
          <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur flex items-center justify-center px-4">
            <div className="w-full max-w-lg bg-slate-950 border border-slate-900 rounded-2xl p-6">
              <div className="text-xl font-extrabold">Before we begin</div>
              <div className="mt-2 text-sm text-slate-400">
                For a realistic mock interview, we recommend enabling your camera.
              </div>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => confirmStart(true)}
                  className="bg-blue-600 hover:bg-blue-500 transition px-4 py-3 rounded-xl text-sm font-extrabold"
                >
                  Enable Camera & Start
                </button>
                <button
                  onClick={() => confirmStart(false)}
                  className="bg-slate-900 hover:bg-slate-800 transition px-4 py-3 rounded-xl text-sm font-extrabold border border-slate-800"
                >
                  Start Without Camera
                </button>
              </div>

              <button
                onClick={() => setShowPreStart(false)}
                className="mt-4 w-full text-xs text-slate-500 hover:text-slate-300 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* INTERVIEW */}
        {started && (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Left: Interviewer */}
            <div className="bg-slate-950 border border-slate-900 rounded-2xl overflow-hidden">
              <div className="relative h-80 flex items-center justify-center">
                <AiRobot3D isSpeaking={isSpeaking} />
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs">
                  <div className="text-slate-500">
                    {isAnalyzing
                      ? "Analyzing your answer…"
                      : isSpeaking
                      ? "Interviewer speaking…"
                      : "Your turn"}
                  </div>
                  <button
                    onClick={speakQuestion}
                    className="px-3 py-2 rounded-lg border border-slate-800 text-slate-300 hover:text-white hover:border-slate-600 transition font-bold"
                    disabled={isAnalyzing}
                    title="Repeat the question"
                  >
                    Repeat
                  </button>
                </div>
              </div>

              <div className="p-5 border-t border-slate-900 bg-slate-900/30">
                <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                  Question {index + 1}
                </div>
                <div className="mt-2 text-xl font-semibold leading-relaxed">{currentQuestion}</div>
              </div>
            </div>

            {/* Right: Candidate */}
            <div className="space-y-4">
              {/* Camera Preview (clean, optional) */}
              <div className="bg-slate-950 border border-slate-900 rounded-2xl overflow-hidden">
                <div className="relative h-52 bg-black">
                  {cameraOn ? (
                    <video
                      ref={videoRef}
                      className="absolute inset-0 w-full h-full object-cover opacity-50"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-sm">
                      Camera is off
                    </div>
                  )}
                </div>
              </div>

              {/* ONE Answer Box */}
              <div className="bg-slate-950 border border-slate-900 rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                      Your Answer
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Speak naturally. Submit when finished.
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setAnswer("");
                      setInterim("");
                    }}
                    className="px-3 py-2 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:border-slate-600 transition text-xs font-bold"
                  >
                    Clear
                  </button>
                </div>

                <div className="mt-3 bg-black border border-slate-900 rounded-xl p-4 min-h-[140px] text-sm whitespace-pre-wrap leading-relaxed">
                  {answer?.trim() ? (
                    answer
                  ) : (
                    <span className="text-slate-600">Start speaking…</span>
                  )}
                  {interim ? <span className="text-slate-500"> {" "}{interim}</span> : null}
                </div>

                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => handleSubmit(answer)}
                    disabled={answer.length < 5 || isAnalyzing}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 transition px-5 py-3 rounded-xl text-sm font-extrabold disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isAnalyzing ? "Analyzing…" : "Submit Answer"}
                  </button>

                  {showFeedback && (
                    <button
                      onClick={nextQuestion}
                      className="px-5 py-3 rounded-xl text-sm font-extrabold bg-emerald-600 hover:bg-emerald-500 transition"
                    >
                      Next
                    </button>
                  )}
                </div>

                {/* Feedback appears directly under answer box (realistic) */}
                {showFeedback && lastFeedback && (
                  <div className="mt-5 pt-5 border-t border-slate-900 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                          Feedback
                        </div>
                        <div className="mt-1 text-3xl font-extrabold text-emerald-300">
                          {lastFeedback.score ?? 0}/10
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={copyScript}
                          className="px-4 py-3 rounded-xl text-xs font-extrabold border border-slate-800 text-slate-300 hover:text-white hover:border-slate-600 transition"
                        >
                          Copy Script
                        </button>
                      </div>
                    </div>

                    {lastFeedback.resume_proof && (
                      <div className="p-4 rounded-xl border border-blue-900 bg-blue-950/30">
                        <div className="text-xs font-bold text-blue-300 uppercase mb-1">
                          Resume Reference
                        </div>
                        <div className="text-sm text-blue-100 italic whitespace-pre-wrap">
                          “{renderSafe(lastFeedback.resume_proof)}”
                        </div>
                      </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl border border-slate-900 bg-black">
                        <div className="text-xs font-bold text-slate-500 uppercase mb-2">
                          Improve
                        </div>
                        <div className="text-sm text-red-200 whitespace-pre-wrap">
                          {renderSafe(lastFeedback.improvements?.[0] || "—")}
                        </div>
                      </div>

                      <div className="p-4 rounded-xl border border-slate-900 bg-black">
                        <div className="text-xs font-bold text-slate-500 uppercase mb-2">
                          Exact Script (Say This)
                        </div>
                        <div className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                          {renderSafe(lastFeedback.betterAnswerExample || "—")}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Minimal logs (tiny, optional) */}
              <div className="text-[10px] text-slate-600 font-mono">
                {logs.map((l, i) => (
                  <div key={i}>{l}</div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
