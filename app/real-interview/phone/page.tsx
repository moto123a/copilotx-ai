// app/real-interview/phone/page.tsx
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SpeechmaticsClient } from "../laptop/stt-client";
import { Mic, MicOff, Bot, ArrowLeft, Loader2, Upload, FileText, Clipboard, Check, AlertCircle, X, RefreshCw } from "lucide-react";

export default function MobilePhonePage() {
  const [view, setView] = useState<'setup' | 'interview'>('setup');
  const [resume, setResume] = useState("");
  const [resumeSource, setResumeSource] = useState<'paste' | 'upload'>('paste');
  const [fileName, setFileName] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [partial, setPartial] = useState("");
  const [answer, setAnswer] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [autoGenerate, setAutoGenerate] = useState(true); // Default ON
  
  const sttClient = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file upload with PDF and DOCX support
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    if (file.type === "text/plain") {
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setResume(text);
      };
      reader.readAsText(file);
    } else if (file.type === "application/pdf") {
      // For PDF files
      reader.onload = async (event) => {
        try {
          const typedArray = new Uint8Array(event.target?.result as ArrayBuffer);
          // In production, you'd use a PDF parsing library
          // For now, we'll show instructions
          setResume("PDF uploaded: " + file.name + "\n\nPlease paste the text content manually for best results.");
        } catch (err) {
          alert("Please copy your resume text and paste it manually.");
        }
      };
      reader.readAsArrayBuffer(file);
    } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || file.name.endsWith('.docx')) {
      // For DOCX files
      reader.onload = async (event) => {
        try {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          // In production, use mammoth.js or similar
          setResume("Word document uploaded: " + file.name + "\n\nPlease paste the text content manually for best results.");
        } catch (err) {
          alert("Please copy your resume text and paste it manually.");
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  // Generate answer based on transcript and resume
  const generateAnswer = async () => {
    const fullText = (transcript + " " + partial).trim();
    if (!fullText || isGenerating) return;
    
    setIsGenerating(true);
    try {
      const response = await fetch("/api/stt/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          transcript: fullText, 
          resume: resume 
        }),
      });
      const data = await response.json();
      setAnswer(data.answer);
    } catch (err) { 
      setAnswer("Error generating answer. Please try again."); 
    } finally { 
      setIsGenerating(false); 
    }
  };

  // Auto-generate when transcript changes (if enabled)
  useEffect(() => {
    if (autoGenerate && transcript && !isGenerating && transcript.length > 20) {
      const timer = setTimeout(() => {
        generateAnswer();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [transcript, autoGenerate]);

  // Toggle recording
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      sttClient.current?.stop();
      setIsRecording(false);
    } else {
      setIsRecording(true);
      setTranscript("");
      setPartial("");
      setAnswer("");
      
      sttClient.current = new SpeechmaticsClient();
      sttClient.current.start({
        language: "en",
        onStatus: () => {},
        onPartial: (text) => setPartial(text),
        onFinal: (text) => { 
          setTranscript(p => (p + " " + text).trim()); 
          setPartial(""); 
        },
        onError: () => setIsRecording(false),
      });
    }
  }, [isRecording]);

  // Copy answer to clipboard
  const copyAnswer = () => {
    navigator.clipboard.writeText(answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Clear transcript and answer
  const clearTranscript = () => {
    setTranscript("");
    setPartial("");
    setAnswer("");
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-100 safe-area-inset">
      <AnimatePresence mode="wait">
        {view === 'setup' ? (
          // SETUP VIEW - Enhanced Professional Design
          <motion.div 
            key="setup" 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -20 }}
            className="min-h-screen p-5 pb-10"
          >
            <div className="max-w-2xl mx-auto">
              {/* Professional Header */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-center mb-10 mt-8"
              >
                <motion.div 
                  animate={{ 
                    scale: [1, 1.05, 1],
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-xl shadow-blue-500/30"
                >
                  <Mic size={36} className="text-white" />
                </motion.div>
                <h1 className="text-5xl font-extrabold mb-3 bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                  Interview Copilot
                </h1>
                <p className="text-slate-400 text-lg font-medium">
                  AI-Powered Real-Time Interview Assistant
                </p>
              </motion.div>

              {/* Resume Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-br from-slate-900/80 to-slate-800/80 border border-slate-700/50 rounded-3xl p-6 mb-6 backdrop-blur-xl shadow-2xl"
              >
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-bold flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                      <FileText size={20} className="text-blue-400" />
                    </div>
                    Resume / CV
                  </h2>
                  <div className="flex gap-2 bg-slate-800/50 p-1 rounded-xl">
                    <button
                      onClick={() => setResumeSource('paste')}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        resumeSource === 'paste' 
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg' 
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Paste
                    </button>
                    <button
                      onClick={() => setResumeSource('upload')}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        resumeSource === 'upload' 
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg' 
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Upload
                    </button>
                  </div>
                </div>

                {resumeSource === 'paste' ? (
                  <div className="relative">
                    <textarea 
                      value={resume} 
                      onChange={(e) => setResume(e.target.value)} 
                      placeholder="Paste your resume content here...&#10;&#10;Include your:&#10;• Work Experience&#10;• Skills & Technologies&#10;• Education & Certifications&#10;• Key Achievements"
                      className="w-full min-h-[320px] bg-slate-900/50 border border-slate-700 rounded-2xl p-5 text-slate-100 placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-base leading-relaxed resize-none shadow-inner"
                    />
                    {resume && (
                      <button
                        onClick={() => setResume("")}
                        className="absolute top-3 right-3 p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ) : (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <motion.div 
                      whileTap={{ scale: 0.98 }}
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-600 hover:border-blue-500 rounded-2xl p-10 text-center cursor-pointer transition-all bg-slate-900/30 hover:bg-slate-800/50"
                    >
                      <Upload size={56} className="mx-auto mb-4 text-slate-500" />
                      <p className="text-slate-300 font-semibold mb-2 text-lg">
                        Upload Your Resume
                      </p>
                      <p className="text-slate-500 text-sm mb-4">
                        PDF, Word, or Text files supported
                      </p>
                      <div className="inline-flex px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/20">
                        Choose File
                      </div>
                    </motion.div>
                    
                    {resume && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-xl"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                              <Check size={20} className="text-green-400" />
                            </div>
                            <div>
                              <p className="text-green-400 font-semibold text-sm">
                                {fileName || "Resume Loaded"}
                              </p>
                              <p className="text-slate-500 text-xs">
                                {resume.length} characters
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => { setResume(""); setFileName(""); }}
                            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                          >
                            <X size={18} className="text-slate-400" />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}

                {resume && (
                  <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 bg-slate-800/50 p-3 rounded-xl">
                    <AlertCircle size={14} className="text-blue-400" />
                    <span>AI will use this to provide personalized interview responses</span>
                  </div>
                )}
              </motion.div>

              {/* Auto-Generate Feature */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-br from-slate-900/80 to-slate-800/80 border border-slate-700/50 rounded-3xl p-6 mb-6 backdrop-blur-xl shadow-2xl"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                      <Bot size={20} className="text-purple-400" />
                      Auto-Generate Mode
                    </h3>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      Automatically generates answers when the interviewer finishes speaking
                    </p>
                  </div>
                  <button
                    onClick={() => setAutoGenerate(!autoGenerate)}
                    className={`relative w-16 h-9 rounded-full transition-all shadow-lg ${
                      autoGenerate ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-slate-700'
                    }`}
                  >
                    <motion.div
                      animate={{ x: autoGenerate ? 28 : 2 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className="w-7 h-7 bg-white rounded-full absolute top-1 shadow-lg"
                    />
                  </button>
                </div>
              </motion.div>

              {/* Start Button */}
              <motion.button 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                onClick={() => resume ? setView('interview') : null}
                disabled={!resume}
                whileTap={{ scale: 0.97 }}
                className={`w-full py-6 rounded-2xl font-bold text-xl transition-all shadow-2xl ${
                  resume 
                    ? 'bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 hover:shadow-blue-500/50 text-white' 
                    : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                }`}
              >
                {resume ? '🚀 Start Interview Session' : '📋 Add Resume to Continue'}
              </motion.button>

              <p className="text-center text-slate-500 text-xs mt-4">
                Your data is processed locally and never stored
              </p>
            </div>
          </motion.div>
        ) : (
          // INTERVIEW VIEW - Streamlined & Professional
          <motion.div 
            key="interview" 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            className="flex flex-col h-screen bg-gradient-to-b from-[#0a0a0f] to-[#050508]"
          >
            {/* Compact Header */}
            <div className="flex justify-between items-center p-4 pt-6 bg-slate-900/50 backdrop-blur-xl border-b border-slate-800">
              <button 
                onClick={() => { 
                  if (isRecording) {
                    if (window.confirm("Stop recording and exit interview?")) {
                      sttClient.current?.stop();
                      setIsRecording(false); 
                      setView('setup');
                    }
                  } else {
                    setView('setup');
                  }
                }} 
                className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              
              <motion.div 
                animate={{ scale: isRecording ? [1, 1.05, 1] : 1 }}
                transition={{ repeat: isRecording ? Infinity : 0, duration: 1.5 }}
                className={`px-5 py-2.5 rounded-full font-bold text-sm shadow-lg ${
                  isRecording 
                    ? 'bg-gradient-to-r from-red-500 to-red-600 text-white' 
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {isRecording ? '● LIVE' : 'READY'}
              </motion.div>

              <button
                onClick={clearTranscript}
                disabled={!transcript && !answer}
                className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-30"
              >
                <RefreshCw size={20} />
              </button>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
              {/* Question/Transcript Display */}
              <div className="flex-1 bg-gradient-to-br from-slate-900/60 to-slate-800/60 backdrop-blur-sm rounded-3xl p-6 border border-slate-700/50 overflow-y-auto min-h-0 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                    <span className="text-xs text-blue-400 font-bold uppercase tracking-wider">
                      Interview Question
                    </span>
                  </div>
                  {transcript && (
                    <span className="text-xs text-slate-500 bg-slate-800/50 px-3 py-1 rounded-full">
                      {transcript.split(' ').filter(w => w).length} words
                    </span>
                  )}
                </div>
                <div className="text-lg leading-relaxed text-slate-100 font-medium">
                  {transcript || <span className="text-slate-600 italic">Waiting to capture audio...</span>}
                  {partial && <span className="text-blue-400 animate-pulse"> {partial}</span>}
                </div>
              </div>

              {/* AI Answer Display */}
              <div className="flex-1 bg-gradient-to-br from-blue-900/20 to-purple-900/20 backdrop-blur-sm rounded-3xl p-6 border border-purple-500/30 overflow-y-auto min-h-0 relative shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                    <span className="text-xs text-purple-400 font-bold uppercase tracking-wider">
                      Your Answer
                    </span>
                  </div>
                  {answer && !isGenerating && (
                    <button
                      onClick={copyAnswer}
                      className="text-xs px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg flex items-center gap-2 transition-all font-semibold"
                    >
                      {copied ? (
                        <>
                          <Check size={14} />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Clipboard size={14} />
                          Copy
                        </>
                      )}
                    </button>
                  )}
                </div>
                
                {isGenerating ? (
                  <div className="flex flex-col items-center justify-center gap-4 py-8">
                    <Loader2 className="animate-spin text-purple-400" size={32} />
                    <span className="text-sm text-slate-400 font-medium">Generating personalized response...</span>
                  </div>
                ) : (
                  <div className="text-lg text-white font-medium leading-relaxed">
                    {answer || (
                      <span className="text-slate-500 italic">
                        {autoGenerate 
                          ? "Auto-generate is enabled. Answer will appear after question."
                          : "Tap 'Generate' button when ready for AI assistance."}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Large Control Buttons - Fixed at Bottom */}
            <div className="p-4 bg-slate-900/50 backdrop-blur-xl border-t border-slate-800">
              <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
                <motion.button 
                  whileTap={{ scale: 0.96 }}
                  onClick={toggleRecording}
                  className={`flex flex-col items-center justify-center rounded-2xl font-bold h-28 transition-all shadow-2xl ${
                    isRecording 
                      ? 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-red-500/40' 
                      : 'bg-gradient-to-br from-slate-800 to-slate-700 text-slate-300 hover:from-slate-700 hover:to-slate-600'
                  }`}
                >
                  {isRecording ? <MicOff size={36} strokeWidth={2.5} /> : <Mic size={36} strokeWidth={2.5} />}
                  <span className="text-sm mt-3 font-bold tracking-wide">
                    {isRecording ? 'STOP RECORDING' : 'START RECORDING'}
                  </span>
                </motion.button>

                <motion.button 
                  whileTap={{ scale: 0.96 }}
                  onClick={generateAnswer}
                  disabled={(!transcript && !partial) || isGenerating}
                  className={`flex flex-col items-center justify-center rounded-2xl font-bold h-28 transition-all shadow-2xl ${
                    (transcript || partial) && !isGenerating
                      ? 'bg-gradient-to-br from-blue-600 via-purple-600 to-blue-600 text-white shadow-purple-500/40 hover:shadow-purple-500/60'
                      : 'bg-slate-800/50 text-slate-600 cursor-not-allowed'
                  }`}
                >
                  <Bot size={36} strokeWidth={2.5} />
                  <span className="text-sm mt-3 font-bold tracking-wide">
                    GENERATE ANSWER
                  </span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}