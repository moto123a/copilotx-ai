"use client";

import { useEffect, useRef, useState } from "react";

// Mock 3D Robot Component
const AiRobot3D = ({ isSpeaking }: { isSpeaking: boolean }) => (
  <div className={`text-6xl transition-transform ${isSpeaking ? 'scale-110' : 'scale-100'}`}>
    🤖
  </div>
);

// --- Types ---
type Feedback = {
  score: number;
  strengths: string[];
  improvements: string[];
  betterAnswerExample: string;
  resume_proof?: string;
};

// --- API Helper ---
async function fetchAi(payload: any) {
  const res = await fetch("/api/stt/tokens", { 
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return res.json();
}

// --- FILE HELPER ---
const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, setter: (s: string) => void) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    setter(text);
  } catch (err) { alert("File read error"); }
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
  const [verificationResult, setVerificationResult] = useState("");

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

  // --- Refs ---
  const recognitionRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  
  // Logic Refs
  const shouldAutoListenRef = useRef(false);
  const silenceTimerRef = useRef<number | null>(null);
  const autoNextArmedRef = useRef(false);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null); 

  const activeQuestions = generatedQuestions.length > 0 ? generatedQuestions : ["Tell me about yourself."];
  const currentQuestion = started && index < activeQuestions.length ? activeQuestions[index] : "Finished.";

  // --- LOGGER ---
  const addLog = (msg: string) => {
    setLogs(prev => {
        if(prev[0] === msg) return prev;
        return [msg, ...prev].slice(0, 3);
    });
  };

  // --- NEW: VERIFY RESUME FUNCTION ---
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
            jd: jdText || "N/A"
        });
        if (data.summary) {
            setVerificationResult(data.summary);
        } else {
            setVerificationResult("AI didn't return a summary.");
        }
    } catch (e) {
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

  // --- STABLE MIC LOGIC (Loop Fix) ---
  const stopMic = () => {
    if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
    
    if (recognitionRef.current) {
      recognitionRef.current.onend = null; 
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    
    setMicOn(false);
    setIsUserSpeaking(false);
    clearSilenceTimer();
  };

  const startMic = () => {
    if (typeof window === "undefined") return;
    
    if (isSpeaking) { addLog("Wait: Robot Speaking"); return; }
    if (isAnalyzing) { addLog("Wait: Analyzing"); return; }
    if (micOn) return;

    stopMic();

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
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
        if (shouldAutoListenRef.current && !isSpeaking && !autoNextArmedRef.current && !answerLocked) {
            restartTimeoutRef.current = setTimeout(() => {
                if (shouldAutoListenRef.current) {
                    try { rec.start(); } catch (e) { addLog("Restart prevented"); }
                }
            }, 1000); 
        }
    };

    rec.onresult = (event: any) => {
        if (isSpeaking) { stopMic(); return; }

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

        if (fText) setAnswer(prev => prev + " " + fText.trim());
        setInterim(iText);
    };

    rec.onerror = (e: any) => {
        if (e.error === 'no-speech') return;
        addLog(`Mic Error: ${e.error}`);
        if(e.error === 'not-allowed') shouldAutoListenRef.current = false;
    };

    recognitionRef.current = rec;
    try { rec.start(); } catch (e) {}
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
            answer: finalAnswer,
            resume: resumeText,
            jd: jdText
        });
        fb = res;
    } catch (e) {
        fb = { score: 0, strengths: [], improvements: ["Error"], betterAnswerExample: "N/A" };
    }

    setLastFeedback(fb);
    setScores(p => [...p, fb.score || 0]);
    setIsAnalyzing(false);
    setShowFeedback(true);
  };

  const nextQuestion = () => {
    setShowFeedback(false);
    if (index >= activeQuestions.length - 1) {
        setStarted(false);
        return;
    }
    setIndex(prev => prev + 1);
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
  }, [started, index]);

  useEffect(() => {
      return () => {
          stopSpeaking();
          stopMic();
          stopCamera();
      }
  }, []);

  const initSession = async () => {
    const sid = `session_${Date.now()}`;
    setSessionId(sid);
    setStarted(true);
    setIndex(0);
    setScores([]);
  };

  const startCamera = async () => {
    if (typeof window === "undefined" || !navigator.mediaDevices) return;
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream;
        setCameraOn(true);
    } catch(e) {}
  };
  
  const stopCamera = () => {
      if(streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
  }

  useEffect(() => {
    if (cameraOn && videoRef.current && streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(()=>{});
    }
  }, [cameraOn]);

  return (
    <div className="min-h-screen bg-black text-white p-4 font-sans pb-32">
       <div className="max-w-7xl mx-auto space-y-6">
          {/* HEADER */}
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">AI Mock Interview</h1>
            {started && <button onClick={() => window.location.reload()} className="text-red-500 border border-red-900 px-3 py-1 rounded">End Interview</button>}
          </div>

          {/* SETUP PHASE - STEP BY STEP */}
          {!started && !setupComplete && (
             <div className="space-y-6">
                {/* STEP INDICATOR */}
                <div className="flex items-center justify-center gap-4 mb-8">
                   <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold">1</div>
                      <span className="text-sm">Resume</span>
                   </div>
                   <div className="w-12 h-0.5 bg-slate-700"></div>
                   <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold">2</div>
                      <span className="text-sm">Job Details</span>
                   </div>
                   <div className="w-12 h-0.5 bg-slate-700"></div>
                   <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold">3</div>
                      <span className="text-sm">Start</span>
                   </div>
                </div>

                {/* STEP 1: RESUME */}
                <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                   <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold">1</div>
                      <h2 className="text-xl font-bold text-blue-400">Upload Your Resume</h2>
                   </div>
                   
                   <p className="text-slate-400 text-sm mb-4">Paste your resume text below or upload a file. The AI will use this to generate personalized questions.</p>
                   
                   <textarea 
                      value={resumeText} 
                      onChange={e=>setResumeText(e.target.value)} 
                      className="w-full h-48 bg-black text-sm p-4 rounded border border-slate-700 focus:border-blue-500 focus:outline-none" 
                      placeholder="Paste your resume here...&#10;&#10;Example:&#10;John Doe&#10;Software Engineer with 5 years experience...&#10;&#10;Skills: JavaScript, React, Node.js..."
                   />
                   
                   <div className="mt-4 flex items-center gap-4">
                      <label className="text-sm text-slate-400 cursor-pointer hover:text-blue-400 transition">
                         <input type="file" onChange={e => handleFileUpload(e, setResumeText)} className="hidden" accept=".txt,.doc,.docx" />
                         📎 Or upload file (.txt, .doc)
                      </label>
                   </div>
                   
                   {/* VERIFY RESUME */}
                   {resumeText.length > 50 && (
                      <div className="mt-4 p-4 bg-slate-800 rounded-lg border border-slate-700">
                         <button 
                            onClick={testResumeReading}
                            disabled={isVerifying}
                            className="w-full text-sm bg-emerald-900/30 text-emerald-400 border border-emerald-800 px-4 py-3 rounded hover:bg-emerald-900/50 transition font-bold"
                         >
                            {isVerifying ? "🔍 Analyzing Resume..." : "✓ Test Resume Reading (Optional)"}
                         </button>
                         {verificationResult && (
                            <div className="mt-3 p-3 bg-emerald-950/50 border border-emerald-500/30 rounded">
                               <div className="text-xs font-bold text-emerald-400 mb-1">AI Read Your Resume:</div>
                               <p className="text-xs text-emerald-200">{verificationResult}</p>
                            </div>
                         )}
                      </div>
                   )}
                </div>

                {/* STEP 2: JOB DESCRIPTION */}
                <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                   <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center font-bold">2</div>
                      <h2 className="text-xl font-bold text-purple-400">Add Job Description</h2>
                   </div>
                   
                   <p className="text-slate-400 text-sm mb-4">Paste the job description to get role-specific interview questions.</p>
                   
                   <textarea 
                      value={jdText} 
                      onChange={e=>setJdText(e.target.value)} 
                      className="w-full h-48 bg-black text-sm p-4 rounded border border-slate-700 focus:border-purple-500 focus:outline-none" 
                      placeholder="Paste job description here...&#10;&#10;Example:&#10;Senior Frontend Developer&#10;Requirements: 5+ years React experience...&#10;&#10;Responsibilities: Build responsive web applications..."
                   />
                   
                   <button 
                     onClick={async () => {
                        setIsGenerating(true);
                        try {
                            const res = await fetchAi({ mode: "generate_questions", resume: resumeText, jd: jdText });
                            setGeneratedQuestions(res.questions || []);
                            setSetupComplete(true);
                        } catch(e) { alert("Generation failed. Please try again."); }
                        setIsGenerating(false);
                     }}
                     className="mt-4 bg-blue-600 px-6 py-3 rounded-lg w-full font-bold text-lg hover:bg-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                     disabled={isGenerating || !resumeText}
                   >
                     {isGenerating ? "⏳ Generating Questions..." : "Generate Interview Questions →"}
                   </button>
                   
                   {!resumeText && (
                      <p className="mt-2 text-xs text-red-400">⚠️ Please add your resume first</p>
                   )}
                </div>
             </div>
          )}

          {/* READY TO START */}
          {setupComplete && !started && (
             <div className="text-center py-20 space-y-6">
                <div className="text-6xl mb-4">✅</div>
                <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                   Interview Ready!
                </h2>
                <p className="text-slate-400">We've generated {generatedQuestions.length} personalized questions based on your profile.</p>
                <button 
                   onClick={initSession} 
                   className="bg-emerald-600 px-12 py-4 rounded-xl text-xl font-bold hover:bg-emerald-500 transition transform hover:scale-105"
                >
                   🎙️ Start Interview
                </button>
             </div>
          )}

          {/* INTERVIEW ACTIVE */}
          {started && (
             <div className="space-y-6">
                {/* PROGRESS BAR */}
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                   <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-400">Question Progress</span>
                      <span className="text-blue-400 font-bold">{index + 1} / {activeQuestions.length}</span>
                   </div>
                   <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div 
                         className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                         style={{ width: `${((index + 1) / activeQuestions.length) * 100}%` }}
                      ></div>
                   </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                   {/* LEFT: AI INTERVIEWER */}
                   <div className="lg:col-span-2 space-y-4">
                      {/* AI ROBOT */}
                      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                         <div className="h-64 flex items-center justify-center relative">
                            <AiRobot3D isSpeaking={isSpeaking} />
                            <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
                               <div className="flex gap-3">
                                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${isSpeaking ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
                                     {isSpeaking ? "🔊 Speaking" : "💤 Idle"}
                                  </div>
                                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${micOn ? 'bg-emerald-600 text-white animate-pulse' : 'bg-slate-800 text-slate-500'}`}>
                                     {micOn ? "🎤 Listening" : "🔇 Mic Off"}
                                  </div>
                               </div>
                            </div>
                         </div>
                         
                         {/* CURRENT QUESTION */}
                         <div className="bg-slate-800 p-6">
                            <div className="flex items-center gap-2 mb-3">
                               <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Question {index + 1}</span>
                            </div>
                            <p className="text-xl leading-relaxed">{currentQuestion}</p>
                         </div>
                      </div>

                      {/* FEEDBACK SECTION */}
                      {showFeedback && lastFeedback && (
                         <div className="bg-slate-800 p-6 rounded-xl border border-emerald-500/30 space-y-4">
                            <div className="flex justify-between items-center">
                               <h3 className="text-lg font-bold text-emerald-400">Your Performance</h3>
                               <div className="text-3xl font-bold text-emerald-400">{lastFeedback.score ?? 0}/10</div>
                            </div>
                            
                            {lastFeedback.resume_proof && (
                               <div className="bg-blue-900/20 border border-blue-500/20 p-4 rounded">
                                  <div className="text-xs font-bold text-blue-400 uppercase mb-2">📋 Resume Reference Check</div>
                                  <p className="text-sm text-blue-200 italic">"{lastFeedback.resume_proof}"</p>
                               </div>
                            )}

                            <div className="space-y-3">
                               <div>
                                  <div className="text-xs font-bold text-slate-400 uppercase mb-1">💡 Suggestion</div>
                                  <p className="text-sm text-slate-300">{lastFeedback.betterAnswerExample ?? "None"}</p>
                               </div>
                               
                               {lastFeedback.improvements && lastFeedback.improvements[0] && (
                                  <div>
                                     <div className="text-xs font-bold text-slate-400 uppercase mb-1">⚠️ Area to Improve</div>
                                     <p className="text-sm text-red-300">{lastFeedback.improvements[0]}</p>
                                  </div>
                               )}
                            </div>
                            
                            <button 
                               onClick={nextQuestion} 
                               className="mt-4 w-full bg-blue-600 py-3 rounded-lg text-sm font-bold hover:bg-blue-500 transition"
                            >
                               Continue to Next Question →
                            </button>
                         </div>
                      )}
                   </div>

                   {/* RIGHT: YOUR RESPONSE */}
                   <div className="space-y-4">
                      {/* VIDEO + ANSWER */}
                      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                         <div className="relative h-64 bg-black">
                            {cameraOn && <video ref={videoRef} className="absolute w-full h-full object-cover opacity-40" />}
                            {!cameraOn && (
                               <div className="absolute inset-0 flex items-center justify-center text-slate-600">
                                  <div className="text-center">
                                     <div className="text-4xl mb-2">📹</div>
                                     <button onClick={startCamera} className="text-xs underline hover:text-blue-400">Enable Camera</button>
                                  </div>
                               </div>
                            )}
                         </div>
                         
                         <div className="p-4 bg-slate-800">
                            <div className="text-xs font-bold text-slate-400 uppercase mb-2">Your Answer</div>
                            <div className="bg-black p-3 rounded h-32 overflow-auto text-sm">
                               {answer || <span className="text-slate-600">Start speaking...</span>}
                               <span className="text-slate-500 ml-1">{interim}</span>
                            </div>
                         </div>
                         
                         {/* CONTROLS */}
                         <div className="p-3 bg-slate-900 border-t border-slate-700 flex gap-2">
                            <button 
                               onClick={() => setAnswer("")} 
                               className="text-xs text-slate-400 hover:text-white px-3 py-2 rounded border border-slate-700 hover:border-slate-500"
                            >
                               Clear
                            </button>
                            
                            {!micOn && !isSpeaking && !isAnalyzing && (
                               <button 
                                  onClick={() => { shouldAutoListenRef.current = true; startMic(); }} 
                                  className="flex-1 text-xs bg-emerald-900 text-emerald-400 px-3 py-2 rounded border border-emerald-700 animate-pulse font-bold"
                               >
                                  🎤 Start Speaking
                               </button>
                            )}

                            <button 
                               onClick={() => handleSubmit(answer)} 
                               disabled={answer.length < 5 || isAnalyzing}
                               className="bg-blue-600 px-6 py-2 rounded text-xs font-bold disabled:opacity-50 hover:bg-blue-500 transition"
                            >
                               {isAnalyzing ? "⏳" : "Submit"}
                            </button>
                         </div>
                      </div>

                      {/* STATUS LOG */}
                      <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                         <div className="text-xs font-bold text-slate-500 uppercase mb-2">Status</div>
                         <div className="text-[10px] font-mono text-slate-600 space-y-1">
                            {logs.map((l, i) => <div key={i}>{l}</div>)}
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          )}
       </div>
    </div>
  );
}