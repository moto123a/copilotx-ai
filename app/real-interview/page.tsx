// app/real-interview/page.tsx

"use client"; 

import { useEffect, useRef } from 'react'; 
import Link from 'next/link';


// === 1. INLINE TYPES TO FIX ALL TYPESCRIPT ERRORS ===
// These declarations satisfy the compiler for Web Speech API types.

interface SpeechRecognition extends EventTarget {
    start: () => void;
    stop: () => void;
    abort: () => void;
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    onstart: (event: Event) => void;
    onend: (event: Event) => void;
    onerror: (event: SpeechRecognitionErrorEvent) => void;
    onresult: (event: SpeechRecognitionEvent) => void;
}

interface SpeechRecognitionConstructor {
    new(): SpeechRecognition;
    prototype: SpeechRecognition;
}

interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}
interface SpeechRecognitionResultList {
    length: number;
    [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionResult {
    isFinal: boolean;
    [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
}
interface SpeechRecognitionErrorEvent extends Event {
    error: string;
}

// Type definitions for the Refs object
interface CopilotRefs {
    startBtn: React.RefObject<HTMLButtonElement>;
    stopBtn: React.RefObject<HTMLButtonElement>;
    transcriptEl: React.RefObject<HTMLDivElement>;
    lastQuestionEl: React.RefObject<HTMLDivElement>;
    answerEl: React.RefObject<HTMLDivElement>;
    resumeBox: React.RefObject<HTMLTextAreaElement>;
    micStatusEl: React.RefObject<HTMLSpanElement>;
    recStatusEl: React.RefObject<HTMLSpanElement>;
    deviceSelect: React.RefObject<HTMLSelectElement>;
    refreshBtn: React.RefObject<HTMLButtonElement>;
    supportEl: React.RefObject<HTMLSpanElement>; 
    secureEl: React.RefObject<HTMLSpanElement>;
    vuEl: React.RefObject<HTMLSpanElement>;
    vuLabel: React.RefObject<HTMLSpanElement>;
    diagMsg: React.RefObject<HTMLDivElement>;
}


// === 2. INITIALIZER FUNCTION (Updated with definitive 'as any' cast) ===

function initializeInterviewCopilot(refs: CopilotRefs) {
    
    const { 
        startBtn, stopBtn, transcriptEl, lastQuestionEl, answerEl, resumeBox, 
        micStatusEl, recStatusEl, deviceSelect, refreshBtn, supportEl, 
        secureEl, vuEl, vuLabel, diagMsg 
    } = refs;

    // FIX 1: Use 'as any' to assign the SpeechRecognition constructor.
    const SpeechRecognition = ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) as SpeechRecognitionConstructor;

    /* State and helpers (rest of app.js) */
    let recognition: SpeechRecognition | null = null;
    let running = false;
    let paused  = false;
    let liveBuffer = '';
    let interimChunk = '';
    let lastStableSentence = '';
    let interimTokens: string[] = []; 
    let currentDeviceId: string | null = null;
    let restartBackoffMs = 0;
    const BACKOFF_STEPS = [500, 1000, 2000, 3000];
    let lastResultAt = 0;
    let watchdogTimer: NodeJS.Timeout | null = null;
    const WATCHDOG_IDLE_MS = 10000;
    let vuStream: MediaStream | null = null;
    let vuCtx: AudioContext | null = null;
    let vuAnalyser: AnalyserNode | null = null;
    
    // FIX 2: Use the standard AudioNode type, which MediaStreamSourceNode inherits from.
    // This removes the red line on MediaStreamSourceNode.
    let vuSrc: AudioNode | null = null; 
    
    let restartTimer: NodeJS.Timeout | null = null;


    // --- Functions using refs.current ---
    
    function updateMic(on: boolean, note=''){
      if (!micStatusEl.current) return;
      micStatusEl.current.textContent = on ? 'Mic Listening' : ('Mic Stopped' + (note ? ` (${note})`:''));
      micStatusEl.current.classList.toggle('on', on);
      micStatusEl.current.classList.toggle('off', !on);
    }
    function updateRec(state: string){
      if (!recStatusEl.current) return;
      recStatusEl.current.textContent = `Recognizer ${state}`;
      const on = ['Ready','Listening','Restarting'].includes(state);
      recStatusEl.current.classList.toggle('on', on);
      recStatusEl.current.classList.toggle('off', !on);
    }
    function msg(text: string){ if (diagMsg.current) diagMsg.current.textContent = text; }
    function resetTranscript(){
      liveBuffer=''; interimChunk=''; lastStableSentence='';
      interimTokens = []; 
      if (transcriptEl.current) {
          transcriptEl.current.textContent='';
      }
    }
    function renderTranscript(){
      if (!transcriptEl.current) return;
      transcriptEl.current.textContent = (liveBuffer + (interimChunk ? ' ' + interimChunk : '')).trim();
      transcriptEl.current.scrollTop = transcriptEl.current.scrollHeight;
    }
    function extractLastSentence(text: string){
      const parts = text.replace(/\s+/g,' ').trim().split(/(?<=[\.\?\!])\s+/);
      if (!parts.length) return '';
      for (let i = parts.length - 1; i >= 0; i--) {
        const s = parts[i].trim();
        if (s.endsWith('?') && s.length > 2) return s;
      }
      return parts[parts.length - 1].trim();
    }
    function getLastQuestionForAnswer(){
      const defill = (s: string) => s.replace(/\b(um+|uh+|erm+|like|you know)\b/gi,'').replace(/\s{2,}/g,' ').trim();
      const candidate = lastStableSentence || liveBuffer;
      const maybe = defill((candidate + (interimChunk ? (' ' + interimChunk) : '')).trim());
      const final = extractLastSentence(maybe);
      return (final || maybe).trim();
    }
    async function populateDevices() {
      if (!deviceSelect.current) return;
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const inputs = devices.filter(d => d.kind === 'audioinput');
        deviceSelect.current.innerHTML = '';
        inputs.forEach(d => {
          const opt = document.createElement('option');
          opt.value = d.deviceId;
          opt.textContent = d.label || `Mic (${d.deviceId.slice(0,6)}...)`;
          deviceSelect.current!.appendChild(opt);
        });
        if (currentDeviceId && inputs.some(d => d.deviceId === currentDeviceId)) {
          deviceSelect.current.value = currentDeviceId;
        } else if (inputs[0]) {
          deviceSelect.current.value = inputs[0].deviceId;
          currentDeviceId = inputs[0].deviceId;
        }
        if (!inputs.length) msg('No audio input devices found.');
      } catch { msg('Could not enumerate devices. Grant mic permission first.'); }
    }
    async function startVU() {
      stopVU();
      if (!vuEl.current || !vuLabel.current) return;
      try {
        vuStream = await navigator.mediaDevices.getUserMedia({
          audio: currentDeviceId ? { deviceId: { exact: currentDeviceId } } : true
        });

        // FIX 3: Robust AudioContext constructor call (fixes the constructor red line)
        const AudioContextConstructor = (window.AudioContext || (window as any).webkitAudioContext);
        vuCtx = new (AudioContextConstructor as any)(); 

        vuAnalyser = vuCtx.createAnalyser();
        vuAnalyser.fftSize = 1024;
        
        // vuSrc is now typed as AudioNode to avoid the MediaStreamSourceNode red line
        vuSrc = vuCtx.createMediaStreamSource(vuStream);
        vuSrc.connect(vuAnalyser);

        const buf = new Uint8Array(vuAnalyser.fftSize);
        (function loop(){
          if (!vuAnalyser || !vuEl.current || !vuLabel.current) return;
          vuAnalyser.getByteTimeDomainData(buf);
          let peak = 0;
          for (let i=0;i<buf.length;i++) {
            const v = Math.abs((buf[i]-128)/128);
            if (v > peak) peak = v;
          }
          const pct = Math.min(100, Math.round(peak*200));
          vuEl.current.style.width = pct + '%';
          vuLabel.current.textContent = `Level: ${pct}%`;
          requestAnimationFrame(loop);
        })();
        msg('Mic stream OK (VU running).');
      } catch (e: any) {
        let hint = e.name;
        if (e.name === 'NotReadableError') hint = 'Device busy (close Zoom/Teams/OBS)';
        msg(`Mic stream failed: ${hint}`);
      }
    }
    function stopVU() {
      if (vuStream) { vuStream.getTracks().forEach(t=>t.stop()); vuStream=null; }
      if (vuSrc) { try{vuSrc.disconnect();}catch{} vuSrc=null; }
      if (vuCtx) { try{vuCtx.close();}catch{} vuCtx=null; }
      if (vuEl.current && vuLabel.current) {
          vuEl.current.style.width = '0%'; vuLabel.current.textContent = 'Level: 0%';
      }
    }
    function startWatchdog(){
      stopWatchdog();
      watchdogTimer = setInterval(()=>{
        if(!running || paused) return;
        if(Date.now() - lastResultAt > WATCHDOG_IDLE_MS){
          safeRestart('idle');
        }
      }, 1500);
    }
    function stopWatchdog(){
      if(watchdogTimer){ clearInterval(watchdogTimer); watchdogTimer=null; }
    }
    function safeRestart(_reason: string){
      if(!running || paused) return;
      if(restartTimer) return;
      const delay = restartBackoffMs || BACKOFF_STEPS[0];
      restartBackoffMs = BACKOFF_STEPS[Math.min(BACKOFF_STEPS.indexOf(delay)+1, BACKOFF_STEPS.length-1)];
      updateRec('Restarting');
      restartTimer = setTimeout(()=>{
        restartTimer = null;
        try { recognition && recognition.stop(); } catch {}
        try { recognition && recognition.start(); } catch {}
      }, delay);
    }
    function createRecognition(): SpeechRecognition | null {
      if(!SpeechRecognition) return null;
      // Recognition type already defined at the top
      const rec = new SpeechRecognition();
      rec.lang = 'en-US';
      rec.continuous = true;
      rec.interimResults = true;

      rec.onstart = () => {
        updateRec('Listening'); updateMic(true);
        restartBackoffMs = 0;
        lastResultAt = Date.now();
      };
      rec.onend = () => {
        updateMic(false);
        if(!running || paused) { updateRec('Idle'); return; }
        safeRestart('onend');
      };
      rec.onerror = (e) => {
        if (e.error === 'aborted') return;
        if (e.error === 'not-allowed') updateRec('Blocked');
        else updateRec('Error');
        safeRestart(e.error);
      };
      // SpeechRecognitionEvent type defined at the top
      rec.onresult = (evt: SpeechRecognitionEvent) => {
        lastResultAt = Date.now();

        for (let i = evt.resultIndex; i < evt.results.length; i++) {
          const res  = evt.results[i];
          const text = (res[0].transcript || '').trim();
          if (!text) continue;

          if (res.isFinal) {
            liveBuffer += (liveBuffer ? ' ' : '') + text;
            lastStableSentence = extractLastSentence(liveBuffer);
            interimTokens = [];
            interimChunk = '';
          } else {
            const words = text.split(/\s+/).filter(Boolean);
            for (const w of words) {
              if (interimTokens.length === 0 || interimTokens[interimTokens.length - 1] !== w) {
                interimTokens.push(w);
              }
            }
            interimChunk = interimTokens.join(' ');
          }
        }
        renderTranscript();
      };
      return rec;
    }
    async function askForAnswer(questionOverride?: string){
      const question = (questionOverride && questionOverride.trim())
        ? questionOverride.trim()
        : getLastQuestionForAnswer();

      if (lastQuestionEl.current) lastQuestionEl.current.textContent = question || '(no question detected)';
      if (answerEl.current) answerEl.current.textContent = 'Thinking…';

      try {
        const r = await fetch('/api/answer', { 
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ question, resume: resumeBox.current?.value || '' })
        });
        if(!r.ok) throw new Error('HTTP ' + r.status);
        const data = await r.json();
        if (!data?.ok && data?.error) throw new Error(JSON.stringify(data.error));
        if (answerEl.current) answerEl.current.textContent = (data.answer || '').trim() || '(no answer)';
      } catch {
        if (answerEl.current) answerEl.current.textContent = 'Error: failed to generate answer.';
      }
    }
    function onSpacebar(e: KeyboardEvent){
      const tag = (document.activeElement?.tagName || '').toLowerCase();
      if (tag === 'textarea' || tag === 'input') return;
      if (e.code !== 'Space') return;

      e.preventDefault();
      if (!running) return;

      if (!paused){
        paused = true;
        updateMic(false); updateRec('Idle');
        try{ recognition!.stop(); }catch{}
        const q = getLastQuestionForAnswer();
        if (lastQuestionEl.current) lastQuestionEl.current.textContent = q || '(no question detected)';
        resetTranscript();           
        askForAnswer(q);             
      } else {
        paused = false;
        updateRec('Ready');
        restartBackoffMs = 0;
        lastResultAt = Date.now();
        try{ recognition!.start(); }catch{}
      }
    }

    /* UI events */
    if (startBtn.current) startBtn.current.addEventListener('click', async ()=>{
      if (running) return;
      const support = !!SpeechRecognition;
      if (supportEl.current) supportEl.current.textContent = support ? 'Yes' : 'No';
      if (secureEl.current) secureEl.current.textContent = window.isSecureContext ? 'Yes' : 'No';
      
      // FIX 4: Check against the locally defined SpeechRecognition
      if (!support) { msg('This browser does not support Web Speech API.'); return; } 
      
      await populateDevices();
      currentDeviceId = deviceSelect.current?.value || null;
      await startVU(); 
      recognition = createRecognition();
      if (!recognition) { msg('Recognizer could not be created.'); return; }
      running = true; paused = false;
      startBtn.current!.disabled = true; stopBtn.current!.disabled = false;
      resetTranscript(); 
      if (lastQuestionEl.current) lastQuestionEl.current.textContent=''; 
      if (answerEl.current) answerEl.current.textContent='';
      updateRec('Ready');
      try { recognition.start(); } catch {}
      startWatchdog();
    });

    if (stopBtn.current) stopBtn.current.addEventListener('click', ()=>{
      if (!running) return;
      running = false; paused = false;
      if(startBtn.current) startBtn.current.disabled = false; 
      if(stopBtn.current) stopBtn.current.disabled = true;
      try { recognition!.abort(); } catch {}
      updateMic(false); updateRec('Idle');
      stopWatchdog(); stopVU();
    });

    if (refreshBtn.current) refreshBtn.current.addEventListener('click', populateDevices);
    if (deviceSelect.current) deviceSelect.current.addEventListener('change', async ()=>{
      currentDeviceId = deviceSelect.current!.value || null;
      await startVU();
    });

    window.addEventListener('keydown', onSpacebar);

    /* boot */
    if (supportEl.current) supportEl.current.textContent = (SpeechRecognition ? 'Yes' : 'No');
    if (secureEl.current) secureEl.current.textContent = (window.isSecureContext ? 'Yes' : 'No');
    populateDevices().catch(()=>{});
    
    // Clean up function for useEffect
    return () => {
        if (running) {
            try { recognition!.abort(); } catch {}
            stopWatchdog();
            stopVU();
        }
        window.removeEventListener('keydown', onSpacebar); 
    };
}


const inlineStyles = `
:root { --bg:#0b0f14; --panel:#121821; --muted:#9fb0c3; --text:#e8f0fa; --accent:#2a7fff; }
*{box-sizing:border-box}
html,body{height:100%}
body{margin:0;background:var(--bg);color:var(--text);font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif}
.wrap{max-width:1100px;margin:0 auto;padding:20px}
header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
h1{margin:0;font-size:22px}
.status{display:flex;gap:8px}
.pill{padding:6px 10px;border-radius:999px;font-size:12px;background:#1b2230;color:#ffb7b7;border:1px solid #3a2020}
.pill.on{color:#b7ffde;border-color:#1f3b2e;background:#102217}
.pill.off{color:#ffb7b7;border-color:#3a2020;background:#221010}
.diag{margin:8px 0 14px;padding:10px;border-radius:8px;border:1px solid #3a4660;background:#0f1520}
.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.meter{width:160px;height:12px;background:#1b2230;border-radius:6px;overflow:hidden;border:1px solid #233048}
.meter>span{display:block;height:100%;background:#2a7fff;width:0%}
.muted{color:var(--muted)}
.controls{display:flex;align-items:center;gap:12px;margin:10px 0 16px}
button{padding:10px 14px;border-radius:8px;border:1px solid #233048;background:#131a25;color:var(--text);font-weight:600;cursor:pointer}
button:disabled{opacity:.5;cursor:not-allowed}
button:hover:not(:disabled){border-color:var(--accent)}
.hint{color:var(--muted)}
.columns{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.col h2{margin:8px 0;color:#d2def0}
textarea{width:100%;min-height:220px;padding:12px;border-radius:10px;border:1px solid #233048;background:var(--panel);color:var(--text);resize:vertical}
.panel{background:var(--panel);border:1px solid #233048;border-radius:10px;padding:12px;min-height:220px;white-space:pre-wrap;line-height:1.45;overflow:auto}
.qa{margin-top:16px}
.qa-row{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.qa-col h3{margin:8px 0;color:#d2def0}
`; // Styles from style.css


// === 3. REACT COMPONENT (Where refs are defined and attached) ===

export default function RealTimeInterviewPage() {
    // 1. Define all Ref objects
    const startBtnRef = useRef<HTMLButtonElement>(null);
    const stopBtnRef = useRef<HTMLButtonElement>(null);
    const transcriptElRef = useRef<HTMLDivElement>(null);
    const lastQuestionElRef = useRef<HTMLDivElement>(null);
    const answerElRef = useRef<HTMLDivElement>(null);
    const resumeBoxRef = useRef<HTMLTextAreaElement>(null);
    const micStatusElRef = useRef<HTMLSpanElement>(null);
    const recStatusElRef = useRef<HTMLSpanElement>(null);
    const deviceSelectRef = useRef<HTMLSelectElement>(null);
    const refreshBtnRef = useRef<HTMLButtonElement>(null);
    const supportElRef = useRef<HTMLSpanElement>(null);
    const secureElRef = useRef<HTMLSpanElement>(null);
    const vuElRef = useRef<HTMLSpanElement>(null);
    const vuLabelRef = useRef<HTMLSpanElement>(null);
    const diagMsgRef = useRef<HTMLDivElement>(null);
    
    // Create the Refs object to pass to the initializer function
    const refs: CopilotRefs = {
        startBtn: startBtnRef, stopBtn: stopBtnRef, transcriptEl: transcriptElRef, 
        lastQuestionEl: lastQuestionElRef, answerEl: answerElRef, resumeBox: resumeBoxRef, 
        micStatusEl: micStatusElRef, recStatusEl: recStatusElRef, deviceSelect: deviceSelectRef, 
        refreshBtn: refreshBtnRef, supportEl: supportElRef, secureEl: secureElRef, 
        vuEl: vuElRef, vuLabel: vuLabelRef, diagMsg: diagMsgRef
    };

    // 2. Run the vanilla JS logic inside useEffect
    useEffect(() => {
        // Pass the ref object to the initializer function
        return initializeInterviewCopilot(refs);
    }, []);

    // 3. JSX with ref={...} replacing id="..."
    return (
        <div className="relative min-h-screen">
            
            {/* Embed the specific styles */}
            <style dangerouslySetInnerHTML={{ __html: inlineStyles }} />

            {/* Back button for navigation */}
            <div className="absolute top-6 left-6 z-10">
                <Link href="/">
                    <button className="text-cyan-400 hover:text-cyan-300 transition text-lg font-medium"
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                        ← Back to Home
                    </button>
                </Link>
            </div>
            
            <div className="wrap" style={{ paddingTop: '80px' }}>
                <header>
                    <h1>Interview Assistant — WebKit</h1>
                    <div className="status">
                        <span ref={micStatusElRef} className="pill off">Mic Stopped</span>
                        <span ref={recStatusElRef} className="pill off">Recognizer Idle</span>
                    </div>
                </header>

                <section className="diag">
                    <div className="row">
                        <div>Support: <span ref={supportElRef}>No</span></div> 
                        <div>&nbsp;|&nbsp; Secure context: <span ref={secureElRef}>No</span></div>
                    </div>

                    <div className="row">
                        <label htmlFor="deviceSelect">Input device:</label>
                        <select ref={deviceSelectRef}></select>
                        <button ref={refreshBtnRef}>Refresh devices</button>
                        <div className="meter"><span ref={vuElRef}></span></div>
                        <span ref={vuLabelRef} className="muted">Level: 0%</span>
                    </div>

                    <div ref={diagMsgRef} className="muted"></div>
                </section>

                <section className="controls">
                    <button ref={startBtnRef}>Start Interview</button>
                    <button ref={stopBtnRef} disabled>Stop</button>
                    <div className="hint">Press <b>Spacebar</b> to pause mic & get an answer. Press again to resume.</div>
                </section>

                <section className="columns">
                    <div className="col">
                        <h2>Your Resume (in memory only)</h2>
                        <textarea ref={resumeBoxRef} placeholder="Paste your resume here..."></textarea>
                    </div>
                    <div className="col">
                        <h2>Live Transcript</h2>
                        <div ref={transcriptElRef} className="panel" aria-live="polite"></div>
                    </div>
                </section>

                <section className="qa">
                    <h2>Last Question & Answer</h2>
                    <div className="qa-row">
                        <div className="qa-col">
                            <h3>Detected Question</h3>
                            <div ref={lastQuestionElRef} className="panel"></div>
                        </div>
                        <div className="qa-col">
                            <h3>Assistant Answer</h3>
                            <div ref={answerElRef} className="panel"></div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}