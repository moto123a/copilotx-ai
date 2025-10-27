// public/app.js — Always-on mic, spacebar pause/answer/resume, smooth live transcript

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

/* UI refs */
const startBtn = document.getElementById('startBtn');
const stopBtn  = document.getElementById('stopBtn');
const transcriptEl   = document.getElementById('transcript');
const lastQuestionEl = document.getElementById('lastQuestion');
const answerEl       = document.getElementById('answer');
const resumeBox      = document.getElementById('resumeBox');
const micStatusEl    = document.getElementById('micStatus');
const recStatusEl    = document.getElementById('recStatus');
const deviceSelect   = document.getElementById('deviceSelect');
const refreshBtn     = document.getElementById('refreshBtn');
const supportEl      = document.getElementById('support');
const secureEl       = document.getElementById('secure');
const vuEl           = document.getElementById('vu');
const vuLabel        = document.getElementById('vuLabel');
const diagMsg        = document.getElementById('diagMsg');

/* State */
let recognition = null;
let running = false;
let paused  = false;

let liveBuffer = '';
let interimChunk = '';
let lastStableSentence = '';

let interimTokens = []; // NEW: accumulate interim words so transcript grows live
let currentDeviceId = null;

/* restart & watchdog */
let restartBackoffMs = 0;
const BACKOFF_STEPS = [500, 1000, 2000, 3000];
let lastResultAt = 0;
let watchdogTimer = null;
const WATCHDOG_IDLE_MS = 10000;

/* VU meter stream */
let vuStream, vuCtx, vuAnalyser, vuSrc;

/* helpers */
function updateMic(on, note=''){
  micStatusEl.textContent = on ? 'Mic Listening' : ('Mic Stopped' + (note ? ` (${note})`:''));
  micStatusEl.classList.toggle('on', on);
  micStatusEl.classList.toggle('off', !on);
}
function updateRec(state){
  recStatusEl.textContent = `Recognizer ${state}`;
  const on = ['Ready','Listening','Restarting'].includes(state);
  recStatusEl.classList.toggle('on', on);
  recStatusEl.classList.toggle('off', !on);
}
function msg(text){ diagMsg.textContent = text; }
function resetTranscript(){
  liveBuffer=''; interimChunk=''; lastStableSentence='';
  interimTokens = []; // NEW: clear interim accumulator
  transcriptEl.textContent='';
}
function renderTranscript(){
  transcriptEl.textContent = (liveBuffer + (interimChunk ? ' ' + interimChunk : '')).trim();
  transcriptEl.scrollTop = transcriptEl.scrollHeight;
}
function extractLastSentence(text){
  const parts = text.replace(/\s+/g,' ').trim().split(/(?<=[\.\?\!])\s+/);
  if (!parts.length) return '';
  for (let i = parts.length - 1; i >= 0; i--) {
    const s = parts[i].trim();
    if (s.endsWith('?') && s.length > 2) return s;
  }
  return parts[parts.length - 1].trim();
}
function getLastQuestionForAnswer(){
  const defill = s => s.replace(/\b(um+|uh+|erm+|like|you know)\b/gi,'').replace(/\s{2,}/g,' ').trim();
  const candidate = lastStableSentence || liveBuffer;
  const maybe = defill((candidate + (interimChunk ? (' ' + interimChunk) : '')).trim());
  const final = extractLastSentence(maybe);
  return (final || maybe).trim();
}

/* devices */
async function populateDevices() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const inputs = devices.filter(d => d.kind === 'audioinput');
    deviceSelect.innerHTML = '';
    inputs.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.deviceId;
      opt.textContent = d.label || `Mic (${d.deviceId.slice(0,6)}...)`;
      deviceSelect.appendChild(opt);
    });
    if (currentDeviceId && inputs.some(d => d.deviceId === currentDeviceId)) {
      deviceSelect.value = currentDeviceId;
    } else if (inputs[0]) {
      deviceSelect.value = inputs[0].deviceId;
      currentDeviceId = inputs[0].deviceId;
    }
    if (!inputs.length) msg('No audio input devices found.');
  } catch { msg('Could not enumerate devices. Grant mic permission first.'); }
}

/* permission + VU using selected device */
async function startVU() {
  stopVU();
  try {
    vuStream = await navigator.mediaDevices.getUserMedia({
      audio: currentDeviceId ? { deviceId: { exact: currentDeviceId } } : true
    });
    vuCtx = new (window.AudioContext || window.webkitAudioContext)();
    vuAnalyser = vuCtx.createAnalyser();
    vuAnalyser.fftSize = 1024;
    vuSrc = vuCtx.createMediaStreamSource(vuStream);
    vuSrc.connect(vuAnalyser);

    const buf = new Uint8Array(vuAnalyser.fftSize);
    (function loop(){
      if (!vuAnalyser) return;
      vuAnalyser.getByteTimeDomainData(buf);
      let peak = 0;
      for (let i=0;i<buf.length;i++) {
        const v = Math.abs((buf[i]-128)/128);
        if (v > peak) peak = v;
      }
      const pct = Math.min(100, Math.round(peak*200));
      vuEl.style.width = pct + '%';
      vuLabel.textContent = `Level: ${pct}%`;
      requestAnimationFrame(loop);
    })();
    msg('Mic stream OK (VU running).');
  } catch (e) {
    let hint = e.name;
    if (e.name === 'NotReadableError') hint = 'Device busy (close Zoom/Teams/OBS)';
    msg(`Mic stream failed: ${hint}`);
  }
}
function stopVU() {
  if (vuStream) { vuStream.getTracks().forEach(t=>t.stop()); vuStream=null; }
  if (vuSrc) { try{vuSrc.disconnect();}catch{} vuSrc=null; }
  if (vuCtx) { try{vuCtx.close();}catch{} vuCtx=null; }
  vuEl.style.width = '0%'; vuLabel.textContent = 'Level: 0%';
}

/* watchdog & restart */
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
let restartTimer = null;
function safeRestart(_reason){
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

/* recognition */
function createRecognition(){
  if(!SpeechRecognition) return null;
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

  // UPDATED: accumulate interim words so transcript grows live
  rec.onresult = (evt) => {
    lastResultAt = Date.now();

    for (let i = evt.resultIndex; i < evt.results.length; i++) {
      const res  = evt.results[i];
      const text = (res[0].transcript || '').trim();
      if (!text) continue;

      if (res.isFinal) {
        // commit final text
        liveBuffer += (liveBuffer ? ' ' : '') + text;
        lastStableSentence = extractLastSentence(liveBuffer);
        // clear interim
        interimTokens = [];
        interimChunk = '';
      } else {
        // accumulate interim words (avoid duplicates)
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

/* answering */
async function askForAnswer(questionOverride){
  const question = (questionOverride && questionOverride.trim())
    ? questionOverride.trim()
    : getLastQuestionForAnswer();

  lastQuestionEl.textContent = question || '(no question detected)';
  answerEl.textContent = 'Thinking…';

  try {
    const r = await fetch('/answer', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ question, resume: resumeBox.value || '' })
    });
    if(!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json();
    if (!data?.ok && data?.error) throw new Error(JSON.stringify(data.error));
    answerEl.textContent = (data.answer || '').trim() || '(no answer)';
  } catch {
    answerEl.textContent = 'Error: failed to generate answer.';
  }
}

/* spacebar */
function onSpacebar(e){
  const tag = (document.activeElement?.tagName || '').toLowerCase();
  if (tag === 'textarea' || tag === 'input') return;
  if (e.code !== 'Space') return;

  e.preventDefault();
  if (!running) return;

  if (!paused){
    paused = true;
    updateMic(false); updateRec('Idle');
    try{ recognition.stop(); }catch{}
    const q = getLastQuestionForAnswer();
    lastQuestionEl.textContent = q || '(no question detected)';
    resetTranscript();            // clears interimTokens too
    askForAnswer(q);              // then fetch answer
  } else {
    paused = false;
    updateRec('Ready');
    restartBackoffMs = 0;
    lastResultAt = Date.now();
    try{ recognition.start(); }catch{}
  }
}

/* UI events */
startBtn.addEventListener('click', async ()=>{
  if (running) return;

  const support = !!SpeechRecognition;
  supportEl.textContent = support ? 'Yes' : 'No';
  secureEl.textContent = window.isSecureContext ? 'Yes' : 'No';
  if (!support) { msg('This browser does not support Web Speech API.'); return; }

  await populateDevices();
  currentDeviceId = deviceSelect?.value || null;

  await startVU(); // gets mic permission and shows level

  recognition = createRecognition();
  if (!recognition) { msg('Recognizer could not be created.'); return; }

  running = true; paused = false;
  startBtn.disabled = true; stopBtn.disabled = false;
  resetTranscript(); lastQuestionEl.textContent=''; answerEl.textContent='';
  updateRec('Ready');
  try { recognition.start(); } catch {}
  startWatchdog();
});

stopBtn.addEventListener('click', ()=>{
  if (!running) return;
  running = false; paused = false;
  startBtn.disabled = false; stopBtn.disabled = true;
  try { recognition.abort(); } catch {}
  updateMic(false); updateRec('Idle');
  stopWatchdog(); stopVU();
});

refreshBtn.addEventListener('click', populateDevices);
deviceSelect.addEventListener('change', async ()=>{
  currentDeviceId = deviceSelect.value || null;
  await startVU();
});

window.addEventListener('keydown', onSpacebar);

/* boot */
supportEl.textContent = (SpeechRecognition ? 'Yes' : 'No');
secureEl.textContent = (window.isSecureContext ? 'Yes' : 'No');
populateDevices().catch(()=>{});