"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { SpeechmaticsClient } from "./stt-client"; 

export default function PhoneInterviewClient() {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState("Ready");
  
  // 'transcript' is the confirmed text (white)
  const [transcript, setTranscript] = useState("");
  // 'partial' is the live typing text (blue)
  const [partial, setPartial] = useState("");
  
  const sttClient = useRef(new SpeechmaticsClient());

  const handleStart = () => {
    setIsRecording(true);
    setTranscript(""); 
    setPartial("");

    sttClient.current.start({
      language: "en",
      onStatus: (msg) => setStatus(msg),
      
      // LIVE TYPING UPDATE
      onPartial: (text) => {
        setPartial(text);
      },
      
      // FINAL SENTENCE UPDATE
      onFinal: (text) => {
        setTranscript((prev) => prev + " " + text);
        setPartial(""); // Clear partial because it's now final
      },
      
      onError: (err) => {
        setStatus(`Error: ${err}`);
        setIsRecording(false);
      }
    });
  };

  const handleStop = () => {
    sttClient.current.stop();
    setIsRecording(false);
    setStatus("Stopped");
    setPartial("");
  };

  useEffect(() => {
    return () => {
      sttClient.current.stop();
    };
  }, []);

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-white items-center justify-center p-6">
      
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-blue-500 mb-2">Phone Mode</h1>
        <p className="text-sm text-slate-400">
          Status: <span className="text-white font-mono bg-slate-800 px-2 py-1 rounded">{status}</span>
        </p>
      </div>

      <div className="w-full max-w-lg h-64 bg-slate-900 rounded-2xl border border-slate-800 p-6 mb-10 overflow-y-auto shadow-inner flex flex-col-reverse">
        {/* We use flex-col-reverse to keep new text at the bottom */}
        <p className="text-lg leading-relaxed">
          <span className="text-slate-200">{transcript}</span>
          {/* This is the live typing part */}
          <span className="text-blue-400 animate-pulse"> {partial}</span>
        </p>
      </div>

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={isRecording ? handleStop : handleStart}
        className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl shadow-2xl transition-all ${
          isRecording 
            ? "bg-red-500 shadow-red-500/50 animate-pulse" 
            : "bg-blue-600 shadow-blue-600/50"
        }`}
      >
        <i className={`fa-solid ${isRecording ? "fa-stop" : "fa-microphone"}`}></i>
      </motion.button>

    </div>
  );
}