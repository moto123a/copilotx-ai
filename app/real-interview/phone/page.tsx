// app/real-interview/phone/page.tsx
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SpeechmaticsClient } from "../laptop/stt-client";
import { Mic, MicOff, ArrowLeft, FileText, Clipboard, Check, RefreshCw, Zap, Sparkles, BrainCircuit, ShieldAlert, Loader2 } from "lucide-react";
import { auth } from "../../firebaseConfig";
import { onAuthStateChanged } from "firebase/auth"; // Added for protection
import AuthModal from "../../../components/AuthModal"; // Added for protection

export default function MobilePhonePage() {
  // --- NEW PROTECTION STATE ---
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const [view, setView] = useState<'setup' | 'interview'>('setup');
  const [resume, setResume] = useState("");
  const [resumeSource, setResumeSource] = useState<'paste' | 'upload'>('paste');
  const [fileName, setFileName] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  
  // Data States
  const [transcript, setTranscript] = useState("");
  const [partial, setPartial] = useState("");
  const [finalAnswer, setFinalAnswer] = useState(""); 
  
  // Tracker for Duration
  const [startTime, setStartTime] = useState<number | null>(null);
  
  const hiddenDraftRef = useRef(""); 
  const [copied, setCopied] = useState(false);
  const [thinkingStep, setThinkingStep] = useState(0);

  const sttClient = useRef<any>(null);
  const transcriptRef = useRef(""); 
  const partialRef = useRef("");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- NEW: AUTH CHECK LOGIC ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (!currentUser) {
        setShowAuthModal(true); // Force the login popup if not signed in
      }
    });
    return () => unsubscribe();
  }, []);

  // --- VISUALS ---
  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => { setThinkingStep(prev => (prev + 1) % 4); }, 1200);
    return () => clearInterval(interval);
  }, [isRecording]);

  const getThinkingText = () => {
    switch(thinkingStep) {
      case 0: return "Listening...";
      case 1: return "Analyzing...";
      case 2: return "Drafting...";
      case 3: return "Ready...";
      default: return "Processing...";
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    if (file.type === "text/plain") {
      reader.onload = (event) => setResume(event.target?.result as string);
      reader.readAsText(file);
    } else {
      setResume("File uploaded: " + file.name + "\n\n(Please paste text manually for best results)");
    }
  };

  // --- UPDATED FETCH ---
  const performFetch = async () => {
    const fullText = (transcriptRef.current + " " + partialRef.current).trim();
    if (!fullText || fullText.length < 5) return;
    const duration = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
    try {
      const response = await fetch("/api/stt/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          transcript: fullText, 
          resume: resume,
          userEmail: auth.currentUser?.email || "unknown",
          duration: duration
        }),
      });
      const data = await response.json();
      if (data.answer) { hiddenDraftRef.current = data.answer; }
    } catch (err) { console.error("Fetch error", err); }
  };

  useEffect(() => {
    if (!isRecording) return;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
       if (partialRef.current.length > 5 || transcriptRef.current.length > 5) {
         performFetch();
       }
    }, 2000); 
    return () => { if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current); }
  }, [partial, transcript, isRecording]);

  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      sttClient.current?.stop();
      setIsRecording(false);
      const duration = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
      if (hiddenDraftRef.current) { setFinalAnswer(hiddenDraftRef.current); } 
      else { setFinalAnswer(""); }
      const fullText = (transcriptRef.current + " " + partialRef.current).trim();
      if (fullText) {
         try {
           const response = await fetch("/api/stt/tokens", {
             method: "POST",
             headers: { "Content-Type": "application/json" },
             body: JSON.stringify({ 
               transcript: fullText, 
               resume: resume,
               userEmail: auth.currentUser?.email || "unknown",
               duration: duration
             }),
           });
           const data = await response.json();
           setFinalAnswer(data.answer); 
         } catch(e) {}
      }
    } else {
      setIsRecording(true);
      setStartTime(Date.now());
      setTranscript("");
      setPartial("");
      setFinalAnswer(""); 
      hiddenDraftRef.current = ""; 
      transcriptRef.current = "";
      partialRef.current = "";
      sttClient.current = new SpeechmaticsClient();
      sttClient.current.start({
        language: "en",
        onStatus: () => {},
        onPartial: (text: string) => { setPartial(text); partialRef.current = text; },
        onFinal: (text: string) => { 
          const newTotal = (transcriptRef.current + " " + text).trim();
          setTranscript(newTotal); 
          transcriptRef.current = newTotal;
          setPartial(""); 
          partialRef.current = "";
        },
        onError: () => setIsRecording(false),
      });
    }
  }, [isRecording, resume, startTime]);

  const copyAnswer = () => {
    navigator.clipboard.writeText(finalAnswer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // --- BLOCK RENDERING IF NOT LOGGED IN ---
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-100 safe-area-inset font-sans">
      
      {/* SECURITY OVERLAY: If no user, show AuthModal and hide content */}
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      
      {!user ? (
        <div className="flex flex-col items-center justify-center h-screen p-10 text-center">
           <BrainCircuit size={60} className="text-slate-700 mb-4" />
           <h2 className="text-2xl font-bold text-slate-400">Access Restricted</h2>
           <p className="text-slate-500 mt-2">Please sign in to access the Interview Session.</p>
           <button onClick={() => setShowAuthModal(true)} className="mt-6 px-8 py-3 bg-blue-600 rounded-xl font-bold">Sign In Now</button>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {view === 'setup' ? (
            <motion.div 
              key="setup" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="min-h-screen p-5 pb-10"
            >
               <div className="max-w-2xl mx-auto">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mb-10 mt-8">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-xl shadow-blue-500/30">
                    <Mic size={36} className="text-white" />
                  </div>
                  <h1 className="text-5xl font-extrabold mb-3 bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                    Interview Copilot
                  </h1>
                  <p className="text-slate-400 text-lg font-medium">AI-Powered Real-Time Interview Assistant</p>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900/80 border border-slate-700/50 rounded-3xl p-6 mb-6 backdrop-blur-xl shadow-2xl">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-xl font-bold flex items-center gap-3"><FileText size={20} className="text-blue-400" /> Resume / CV</h2>
                    <div className="flex gap-2 bg-slate-800/50 p-1 rounded-xl">
                      <button onClick={() => setResumeSource('paste')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${resumeSource === 'paste' ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white' : 'text-slate-400'}`}>Paste</button>
                      <button onClick={() => setResumeSource('upload')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${resumeSource === 'upload' ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white' : 'text-slate-400'}`}>Upload</button>
                    </div>
                  </div>
                  {resumeSource === 'paste' ? (
                    <div className="relative">
                      <textarea value={resume} onChange={(e) => setResume(e.target.value)} placeholder="Paste your resume content here..." className="w-full min-h-[320px] bg-slate-900/50 border border-slate-700 rounded-2xl p-5 text-slate-100 placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none text-base resize-none" />
                      {resume && <button onClick={() => setResume("")} className="absolute top-3 right-3 p-2 bg-red-500/10 text-red-400 rounded-lg"><Check size={16} /></button>}
                    </div>
                  ) : (
                    <motion.div onClick={() => fileInputRef.current?.click()} whileTap={{ scale: 0.98 }} className="border-2 border-dashed border-slate-600 hover:border-blue-500 rounded-2xl p-10 text-center cursor-pointer bg-slate-900/30">
                      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
                      <ArrowLeft size={56} className="mx-auto mb-4 text-slate-500" />
                      <p className="text-slate-300 font-semibold mb-2">Upload Your Resume</p>
                    </motion.div>
                  )}
                </motion.div>
                <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => resume ? setView('interview') : null} disabled={!resume} whileTap={{ scale: 0.97 }} className={`w-full py-6 rounded-2xl font-bold text-xl transition-all shadow-2xl ${resume ? 'bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 text-white' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}>
                  {resume ? '🚀 Start Interview Session' : '📋 Add Resume to Continue'}
                </motion.button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="interview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-screen bg-gradient-to-b from-[#0a0a0f] to-[#050508]">
              {/* Header */}
              <div className="flex justify-between items-center p-4 pt-6 bg-slate-900/50 backdrop-blur-xl border-b border-slate-800 shrink-0">
                <button onClick={() => setView('setup')} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"><ArrowLeft size={20} /></button>
                <div className={`px-5 py-2.5 rounded-full font-bold text-sm shadow-lg flex items-center gap-2 ${isRecording ? 'bg-gradient-to-r from-red-500 to-red-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  {isRecording && <span className="w-2 h-2 bg-white rounded-full animate-pulse"/>}
                  {isRecording ? 'LIVE' : 'READY'}
                </div>
                <button onClick={() => {setTranscript(""); setFinalAnswer(""); hiddenDraftRef.current = "";}} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl"><RefreshCw size={20} /></button>
              </div>

              <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
                {/* Question */}
                <div className="h-[25%] bg-gradient-to-br from-slate-900/60 to-slate-800/60 backdrop-blur-sm rounded-3xl p-6 border border-slate-700/50 overflow-y-auto shadow-xl shrink-0">
                  <div className="flex items-center gap-2 mb-4 sticky top-0 bg-transparent">
                    <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                    <span className="text-xs text-blue-400 font-bold uppercase tracking-wider">Interview Question</span>
                  </div>
                  <div className="text-lg leading-relaxed text-slate-100 font-medium">
                    {transcript || <span className="text-slate-600 italic">Waiting for audio...</span>}
                    {partial && <span className="text-blue-400 animate-pulse"> {partial}</span>}
                  </div>
                </div>

                {/* ANSWER BOX */}
                <div className={`flex-1 flex flex-col backdrop-blur-sm rounded-3xl border shadow-xl transition-colors duration-500 overflow-hidden ${isRecording ? 'bg-blue-900/10 border-blue-500/30' : 'bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-purple-500/30'}`}>
                  <div className="p-5 pb-2 flex items-center justify-between shrink-0 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      {isRecording ? <BrainCircuit size={14} className="animate-pulse text-blue-400" /> : <Sparkles size={14} className="text-purple-400"/>}
                      <span className={`text-xs font-bold uppercase tracking-wider ${isRecording ? 'text-blue-400' : 'text-purple-400'}`}>
                        {isRecording ? "AI Thinking Process" : "Suggested Answer"}
                      </span>
                    </div>
                    {finalAnswer && !isRecording && (
                      <button onClick={copyAnswer} className="text-xs px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center gap-2 font-semibold backdrop-blur-md transition-all">
                        {copied ? <Check size={14} /> : <Clipboard size={14} />} {copied ? 'Copied' : 'Copy'}
                      </button>
                    )}
                  </div>
                  
                  <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 pt-2">
                    <div className="min-h-full font-medium leading-relaxed text-lg">
                      {isRecording ? (
                         <div className="flex flex-col items-center justify-center h-full space-y-4">
                            <div className="relative w-16 h-16 flex items-center justify-center">
                               <motion.div animate={{ scale: [1, 1.5], opacity: [0.5, 0] }} transition={{ repeat: Infinity, duration: 2.5 }} className="absolute inset-0 bg-blue-500/20 rounded-full" />
                               <BrainCircuit size={32} className="text-blue-400 z-10" />
                            </div>
                            <motion.div key={thinkingStep} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="text-blue-300 font-mono text-sm tracking-wide bg-blue-900/30 px-3 py-1 rounded-full border border-blue-500/20">
                               {getThinkingText()}
                            </motion.div>
                         </div>
                      ) : (
                        <div className="text-white animate-in fade-in duration-200">
                           {finalAnswer || (
                             <div className="flex flex-col items-center justify-center h-full opacity-60 space-y-2">
                                <Sparkles className="animate-spin text-purple-400" size={24}/>
                                <span className="text-purple-300 italic text-sm">Finishing generation...</span>
                             </div>
                           )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* BUTTON */}
              <div className="p-4 bg-slate-900/50 backdrop-blur-xl border-t border-slate-800 shrink-0">
                <motion.button 
                  whileTap={{ scale: 0.96 }}
                  onClick={toggleRecording}
                  className={`w-full rounded-2xl font-bold h-28 transition-all shadow-2xl flex flex-col items-center justify-center relative overflow-hidden ${
                    isRecording 
                      ? 'bg-gradient-to-br from-red-500 to-red-600 shadow-red-500/40' 
                      : 'bg-gradient-to-br from-blue-600 to-purple-600 shadow-blue-500/40'
                  }`}
                >
                  {isRecording && (
                    <motion.div animate={{ scale: [1, 1.3], opacity: [0.2, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="absolute inset-0 bg-white/20 rounded-2xl" />
                  )}
                  {isRecording ? (
                    <>
                      <MicOff size={32} className="text-white mb-1 relative z-10" />
                      <span className="text-sm font-bold tracking-wide text-white relative z-10">MUTE & REVEAL</span>
                      <span className="text-[10px] text-red-100 mt-1 relative z-10 opacity-90 flex items-center gap-1 font-mono uppercase">
                         <ShieldAlert size={10} fill="currentColor"/> Safe/Eco Mode
                      </span>
                    </>
                  ) : (
                    <>
                      <Mic size={36} className="text-white mb-2" />
                      <span className="text-sm font-bold tracking-wide text-white">TAP TO SPEAK</span>
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}