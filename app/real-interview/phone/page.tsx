"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function PhoneInterviewClient() {
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
        const wsUrl = `wss://us1.rt.speechmatics.com/v2?jwt=${encodeURIComponent(jwt)}`;
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
      try {
        btnTestStart?.removeEventListener("click", onTestStart);
        btnTestStop?.removeEventListener("click", onTestStop);
        btnStart?.removeEventListener("click", onStart);
        btnStop?.removeEventListener("click", onStop);
        btnSetupClear?.removeEventListener("click", onSetupClear);
        btnClear?.removeEventListener("click", onSetupClear);
        btnSetupCopy?.removeEventListener("click", onSetupCopy);
        btnCopy?.removeEventListener("click", onCopy);
        startInterviewBtn?.removeEventListener("click", onStartInterview);
        btnBack?.removeEventListener("click", onBack);
        stopSpeechmatics(false);
      } catch {}
    };
  }, []);

  return (
    <>
      <style>{`
        :root { color-scheme: dark; }
        body { margin:0; font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; background:#070b12; color:#eaf2ff; }
        .wrap { max-width:860px; margin:0 auto; padding:14px; min-height:100vh; box-sizing:border-box; }
        .topbar {
          position: sticky; top:0; z-index:10;
          background: rgba(7,11,18,0.92);
          backdrop-filter: blur(10px);
          border:1px solid #1f2a3e; border-radius:18px;
          padding:12px; display:flex; justify-content:space-between; gap:10px;
        }
        .brand { font-weight:900; display:flex; gap:10px; align-items:center; }
        .pill { border:1px solid #2b3d5a; background:#0c1422; border-radius:999px; padding:6px 10px; font-size:12px; white-space:nowrap; }
        .ok { border-color:#2f7; } .danger { border-color:#b33; }
        .card { background:#0b1220; border:1px solid #1f2a3e; border-radius:18px; padding:14px; margin:12px 0; }
        label { display:block; font-size:12px; opacity:0.82; font-weight:800; margin-bottom:6px; }
        input, select, textarea {
          width:100%; box-sizing:border-box; border-radius:14px; border:1px solid #2b3d5a; background:#0c1422; color:#eaf2ff;
          padding:12px; font-size:15px; outline:none;
        }
        textarea { min-height:110px; resize:vertical; }
        .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        button {
          width:100%; border:1px solid #2b3d5a; background:#0c1422; color:#eaf2ff; border-radius:16px; padding:12px 10px;
          font-size:15px; font-weight:900; cursor:pointer;
        }
        button.primary { background:#13233d; border-color:#3a5a8e; }
        button.dangerBtn { background:#2a1220; border-color:#7a3550; }
        button:disabled { opacity:0.45; cursor:not-allowed; }
        .mini { font-size:12px; opacity:0.75; line-height:1.45; margin-top:8px; }
        .mono { white-space:pre-wrap; word-break:break-word; line-height:1.45; font-size:16px; }
        .bigBox { min-height:170px; }
        .hide { display:none; }
        .headerRow { display:flex; gap:10px; align-items:center; justify-content:space-between; }
        .headerRow h2 { margin:0; font-size:16px; }
        .soft { opacity:0.8; font-size:12px; }
        @media(max-width:520px){ .grid2{grid-template-columns:1fr;} }
        .backInline {
          width:auto;
          max-width:140px;
          border:1px solid #2b3d5a;
          border-radius:999px;
          padding:8px 12px;
          font-size:12px;
          font-weight:900;
        }
        a { color: inherit; text-decoration: none; }
      `}</style>

      <div className="wrap">
        <div className="topbar">
          <div className="brand">
            <Link href="/real-interview">
              <button className="backInline" type="button">Back</button>
            </Link>
            <span>Phone Interview AI</span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span className="pill" id="backendPill">Backend: checking...</span>
            <span className="pill" id="sttPill">STT: idle</span>
          </div>
        </div>

        <div id="setupView">
          <div className="card">
            <div className="headerRow">
              <h2>Setup</h2>
              <div className="soft">Test mic here, then go to interview view.</div>
            </div>
          </div>

          <div className="card">
            <div className="grid2">
              <div>
                <label>STT Engine</label>
                <select id="sttEngine" defaultValue="speechmatics"></select>
                <div className="mini" id="engineNote"></div>
              </div>

              <div>
                <label>Language</label>
                <select id="langSelect" defaultValue="en">
                  <option value="en">English (en)</option>
                </select>
                <div className="mini">We can add more languages later.</div>
              </div>
            </div>

            <div className="grid2" style={{ marginTop: 12 }}>
              <button className="primary" id="btnTestStart">Test Mic (Start STT)</button>
              <button className="dangerBtn" id="btnTestStop" disabled>Stop Test</button>
            </div>

            <div className="mini" id="statusLine">Ready.</div>
          </div>

          <div className="card">
            <label>Live Transcript (Test View)</label>
            <div className="mono bigBox" id="setupTranscript">Press Test Mic, then speak.</div>
            <div className="grid2" style={{ marginTop: 10 }}>
              <button id="btnSetupClear">Clear</button>
              <button id="btnSetupCopy">Copy Transcript</button>
            </div>
          </div>

          <div className="card">
            <div style={{ marginTop: 12 }}>
              <button className="primary" id="startInterviewBtn">Start Interview</button>
            </div>
          </div>
        </div>

        <div id="interviewView" className="hide">
          <div className="card">
            <div className="headerRow">
              <h2>Interview</h2>
              <button id="btnBack" style={{ maxWidth: 180 }}>Back</button>
            </div>
            <div className="mini">Transcript only. Answer is disabled for now.</div>
          </div>

          <div className="card">
            <label>Live Transcript</label>
            <div className="mono bigBox" id="transcript">Press Start, then speak.</div>

            <div className="grid2" style={{ marginTop: 10 }}>
              <button className="primary" id="btnStart">Start STT</button>
              <button className="dangerBtn" id="btnStop" disabled>Stop STT</button>
            </div>

            <div className="grid2" style={{ marginTop: 10 }}>
              <button id="btnClear">Clear</button>
              <button id="btnCopy">Copy Transcript</button>
            </div>
          </div>

          <div className="card">
            <div className="grid2">
              <button className="primary" id="btnAnswer">Generate Answer (disabled)</button>
              <button id="btnCopyAns">Copy Answer (disabled)</button>
            </div>

            <div className="mini" id="ansStatus">Answer: disabled (STT only)</div>
            <div className="mono bigBox" id="answer">Answer feature disabled. This page is Speechmatics STT only.</div>
          </div>
        </div>
      </div>
    </>
  );
}