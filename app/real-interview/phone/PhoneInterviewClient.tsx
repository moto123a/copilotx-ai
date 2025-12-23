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
    // Use tokens route as "backend health"
    const API_HEALTH = "/api/stt/tokens";
    const API_TOKEN = "/api/stt/tokens";

    function $(id: string) {
      return document.getElementById(id) as any;
    }

    const backendPill = $("backendPill");
    const sttPill = $("sttPill");
    const statusLine = $("statusLine");

    const setupView = $("setupView");
    const interviewView = $("interviewView");
    const startInterviewBtn = $("startInterviewBtn");
    const btnBack = $("btnBack");

    const sttEngine = $("sttEngine");
    const engineNote = $("engineNote");
    const langSelect = $("langSelect");

    const btnTestStart = $("btnTestStart");
    const btnTestStop = $("btnTestStop");
    const btnStart = $("btnStart");
    const btnStop = $("btnStop");

    const setupTranscriptEl = $("setupTranscript");
    const transcriptEl = $("transcript");
    const btnSetupClear = $("btnSetupClear");
    const btnSetupCopy = $("btnSetupCopy");
    const btnClear = $("btnClear");
    const btnCopy = $("btnCopy");

    const btnAnswer = $("btnAnswer");
    const btnCopyAns = $("btnCopyAns");
    const ansStatus = $("ansStatus");
    const answerEl = $("answer");

    function setPill(el: any, text: string, ok = true) {
      if (!el) return;
      el.textContent = text;
      el.classList.remove("ok", "danger");
      el.classList.add(ok ? "ok" : "danger");
    }

    function setSTT(text: string, ok = true) {
      setPill(sttPill, text, ok);
    }

    function setButtonsRunning(running: boolean) {
      if (btnTestStart) btnTestStart.disabled = running;
      if (btnTestStop) btnTestStop.disabled = !running;
      if (btnStart) btnStart.disabled = running;
      if (btnStop) btnStop.disabled = !running;
    }

    function setTranscriptText(text: string) {
      const t = text || "";
      if (setupTranscriptEl) setupTranscriptEl.textContent = t;
      if (transcriptEl) transcriptEl.textContent = t;
    }

    async function copyTranscript() {
      const t = (setupTranscriptEl?.textContent || transcriptEl?.textContent || "").trim();
      if (!t) return;
      try {
        await navigator.clipboard.writeText(t);
        if (statusLine) statusLine.textContent = "Copied transcript.";
      } catch {
        window.prompt("Copy transcript:", t);
      }
    }

    async function safeJson(res: Response) {
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status} ${res.statusText}: ${txt.slice(0, 200)}`);
      }

      const ct = (res.headers.get("content-type") || "").toLowerCase();
      if (ct.includes("application/json")) return await res.json();

      const txt = await res.text();
      throw new Error(`Non-JSON response: ${txt.slice(0, 200)}`);
    }

    async function checkBackend() {
      try {
        const r = await fetch(API_HEALTH, { method: "GET", cache: "no-store" });
        const j = await safeJson(r);
        setPill(backendPill, j.ok ? "Backend: ready" : "Backend: ready", true);
      } catch (e: any) {
        setPill(backendPill, "Backend: offline", false);
        if (statusLine) statusLine.textContent = `Backend check failed: ${e?.message || e}`;
      }
    }

    // ---------------- Speechmatics RT ----------------
    let smWs: WebSocket | null = null;
    let audioStream: MediaStream | null = null;
    let audioCtx: AudioContext | null = null;
    let processor: ScriptProcessorNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;

    let running = false;

    // Full accumulator
    let fullTranscriptBuffer = "";
    let lastShown = "";
    let manualStopRequested = false;

    function formatText(s: string) {
      if (!s) return "";
      let clean = s
        .replace(/\s+/g, " ")
        .replace(/\s+([.,!?;:])/g, "$1")
        .trim();
      return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : "";
    }

    function setTranscriptIfChanged(t: string) {
      const next = formatText(t);
      if (next !== lastShown) {
        lastShown = next;
        setTranscriptText(next);
      }
    }

    async function getJwt() {
      const r = await fetch(API_TOKEN, { method: "GET", cache: "no-store" });
      const j = await safeJson(r);
      const jwt = j.jwt || j.token;
      if (!jwt) throw new Error("No jwt returned from backend (/api/stt/tokens)");
      return jwt as string;
    }

    function stopSpeechmatics(userStop = false) {
      manualStopRequested = userStop;
      running = false;

      try {
        processor?.disconnect();
        source?.disconnect();
      } catch {}

      try {
        audioCtx?.close();
      } catch {}

      try {
        audioStream?.getTracks()?.forEach((t) => t.stop());
      } catch {}

      try {
        if (smWs && smWs.readyState === WebSocket.OPEN) {
          smWs.send(JSON.stringify({ message: "EndOfStream" }));
          smWs.close();
        }
      } catch {}

      smWs = null;
      audioStream = null;
      audioCtx = null;
      processor = null;
      source = null;

      setButtonsRunning(false);
      if (userStop) {
        setSTT("STT: idle", true);
        if (statusLine) statusLine.textContent = "Stopped.";
      }
    }

    async function startSpeechmatics() {
      if (running) return;

      if (!window.isSecureContext) {
        setSTT("STT: error", false);
        if (statusLine) {
          statusLine.textContent =
            "Mic requires HTTPS (ngrok) or localhost. Open the app on https://... not plain http.";
        }
        stopSpeechmatics(false);
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setSTT("STT: error", false);
        if (statusLine) statusLine.textContent = "Mic API not available (getUserMedia missing).";
        stopSpeechmatics(false);
        return;
      }

      manualStopRequested = false;
      running = true;

      fullTranscriptBuffer = "";
      lastShown = "";

      setTranscriptIfChanged("Starting Speechmatics...");
      setSTT("STT: starting", true);
      setButtonsRunning(true);

      try {
        const jwt = await getJwt();

        audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });

        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        await audioCtx.resume();
        const sampleRate = audioCtx.sampleRate;

        source = audioCtx.createMediaStreamSource(audioStream);
        processor = audioCtx.createScriptProcessor(4096, 1, 1);

        const gain = audioCtx.createGain();
        gain.gain.value = 0;

        source.connect(processor);
        processor.connect(gain);
        gain.connect(audioCtx.destination);

        // IMPORTANT: you said your region is us1
        const wsUrl = `wss://us.rt.speechmatics.com/v2?jwt=${encodeURIComponent(jwt)}`;
        smWs = new WebSocket(wsUrl);
        smWs.binaryType = "arraybuffer";

        let recognitionStarted = false;

        smWs.onopen = () => {
          smWs?.send(
            JSON.stringify({
              message: "StartRecognition",
              audio_format: {
                type: "raw",
                encoding: "pcm_f32le",
                sample_rate: sampleRate,
              },
              transcription_config: {
                language: (langSelect?.value || "en").trim(),
                enable_partials: true,
                max_delay: 0.7,
                enable_entities: true,
              },
            })
          );
          if (statusLine) statusLine.textContent = "Connected. Starting recognition...";
        };

        smWs.onmessage = (evt) => {
          try {
            const msg = JSON.parse(evt.data as string);

            if (msg.message === "RecognitionStarted") {
              recognitionStarted = true;
              setSTT("STT: listening", true);
              if (statusLine) statusLine.textContent = "Listening (Speechmatics)...";
              setTranscriptIfChanged("");
              return;
            }

            if (msg.message === "AddTranscript") {
              const chunk = (msg.results || [])
                .map((r: any) => r?.alternatives?.[0]?.content || "")
                .join("");

              if (chunk) {
                fullTranscriptBuffer += chunk;
                setTranscriptIfChanged(fullTranscriptBuffer);
              }
              return;
            }

            if (msg.message === "Error") {
              setSTT("STT: error", false);
              if (statusLine) statusLine.textContent = `Speechmatics error: ${msg?.reason || "unknown"}`;
              stopSpeechmatics(false);
              return;
            }
          } catch {}
        };

        smWs.onerror = () => {
          setSTT("STT: error", false);
          if (statusLine) statusLine.textContent = "Speechmatics connection error.";
          stopSpeechmatics(false);
        };

        smWs.onclose = () => {
          running = false;
          setButtonsRunning(false);
          if (!manualStopRequested) setSTT("STT: idle", true);
        };

        processor.onaudioprocess = (e) => {
          if (!running) return;
          if (!recognitionStarted) return;
          if (!smWs || smWs.readyState !== WebSocket.OPEN) return;

          const input = e.inputBuffer.getChannelData(0);
          smWs.send(input.buffer);
        };
      } catch (e: any) {
        setSTT("STT: error", false);
        if (statusLine) statusLine.textContent = `Start failed: ${e?.message || e}`;
        stopSpeechmatics(false);
      }
    }

    const onTestStart = async () => {
      stopSpeechmatics(false);
      await startSpeechmatics();
    };
    const onTestStop = () => stopSpeechmatics(true);

    const onStart = async () => {
      stopSpeechmatics(false);
      await startSpeechmatics();
    };
    const onStop = () => stopSpeechmatics(true);

    const onSetupClear = () => {
      fullTranscriptBuffer = "";
      lastShown = "";
      setTranscriptText("");
      if (statusLine) statusLine.textContent = "Cleared.";
    };

    const onSetupCopy = () => copyTranscript();
    const onCopy = () => copyTranscript();

    const onStartInterview = () => {
      setupView?.classList.add("hide");
      interviewView?.classList.remove("hide");
    };

    const onBack = () => {
      interviewView?.classList.add("hide");
      setupView?.classList.remove("hide");
    };

    btnTestStart?.addEventListener("click", onTestStart);
    btnTestStop?.addEventListener("click", onTestStop);
    btnStart?.addEventListener("click", onStart);
    btnStop?.addEventListener("click", onStop);
    btnSetupClear?.addEventListener("click", onSetupClear);
    btnClear?.addEventListener("click", onSetupClear);
    btnSetupCopy?.addEventListener("click", onSetupCopy);
    btnCopy?.addEventListener("click", onCopy);
    startInterviewBtn?.addEventListener("click", onStartInterview);
    btnBack?.addEventListener("click", onBack);

    if (sttEngine) {
      sttEngine.innerHTML = "";
      const opt = document.createElement("option");
      opt.value = "speechmatics";
      opt.textContent = "Speechmatics (mobile stable)";
      sttEngine.appendChild(opt);
      sttEngine.value = "speechmatics";
    }
    if (engineNote) engineNote.textContent = "Speechmatics is used for STT. Works on Android and iPhone.";

    if (btnAnswer) btnAnswer.disabled = true;
    if (btnCopyAns) btnCopyAns.disabled = true;
    if (ansStatus) ansStatus.textContent = "Answer: disabled (STT only)";
    if (answerEl) answerEl.textContent = "Answer feature disabled. This page is Speechmatics STT only.";

    (async function init() {
      await checkBackend();
      setSTT("STT: idle", true);
      if (statusLine) statusLine.textContent = "Ready.";
      setButtonsRunning(false);
    })();

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
