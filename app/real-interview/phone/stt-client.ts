"use client";

export type STTStatus =
  | "idle"
  | "starting"
  | "listening"
  | "stopped"
  | "error";

type Callbacks = {
  onStatus?: (s: STTStatus, note?: string) => void;
  onTranscript?: (text: string) => void;
};

export function createSpeechmaticsSTT(cb: Callbacks) {
  const API_TOKEN = "/api/stt/tokens";

  let ws: WebSocket | null = null;
  let stream: MediaStream | null = null;
  let ctx: AudioContext | null = null;
  let processor: ScriptProcessorNode | null = null;
  let source: MediaStreamAudioSourceNode | null = null;

  let running = false;
  let recognitionStarted = false;
  let finalText = "";
  let lastShown = "";
  let manualStop = false;

  function normalize(s: string) {
    return (s || "").replace(/\s+/g, " ").trim();
  }

  function emitTranscript(t: string) {
    if (t !== lastShown) {
      lastShown = t;
      cb.onTranscript?.(t);
    }
  }

  async function safeJson(res: Response) {
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`HTTP ${res.status}: ${txt.slice(0, 200)}`);
    }
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    if (ct.includes("application/json")) return await res.json();
    const txt = await res.text();
    throw new Error(`Non-JSON: ${txt.slice(0, 200)}`);
  }

  async function getJwt() {
    const r = await fetch(API_TOKEN, { method: "GET" });
    const j = await safeJson(r);

    const jwt = j.jwt || j.token;
    if (!jwt) throw new Error("No token returned from /api/stt/tokens");
    return jwt as string;
  }

  function cleanup() {
    try {
      processor?.disconnect();
      source?.disconnect();
    } catch {}

    try {
      ctx?.close();
    } catch {}

    try {
      stream?.getTracks()?.forEach((t) => t.stop());
    } catch {}

    try {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ message: "EndOfStream" }));
        ws.close();
      }
    } catch {}

    ws = null;
    stream = null;
    ctx = null;
    processor = null;
    source = null;

    running = false;
    recognitionStarted = false;
  }

  async function start(language = "en") {
    if (running) return;

    if (!window.isSecureContext) {
      cb.onStatus?.("error", "Mic needs HTTPS (ngrok) or localhost.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      cb.onStatus?.("error", "Mic API not available.");
      return;
    }

    manualStop = false;
    running = true;
    recognitionStarted = false;
    finalText = "";
    lastShown = "";

    cb.onStatus?.("starting", "Starting...");
    emitTranscript("Starting Speechmatics...");

    try {
      const jwt = await getJwt();

      stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Force 16k sample rate for Speechmatics raw audio
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000
      });
      await ctx.resume();

      const sampleRate = ctx.sampleRate;

      source = ctx.createMediaStreamSource(stream);
      processor = ctx.createScriptProcessor(4096, 1, 1);

      // mute output
      const gain = ctx.createGain();
      gain.gain.value = 0;

      source.connect(processor);
      processor.connect(gain);
      gain.connect(ctx.destination);

      // IMPORTANT: use US realtime endpoint (your portal shows us1)
      const wsUrl = `wss://us.rt.speechmatics.com/v2?jwt=${encodeURIComponent(jwt)}`;
      ws = new WebSocket(wsUrl);
      ws.binaryType = "arraybuffer";

      ws.onopen = () => {
        ws?.send(
          JSON.stringify({
            message: "StartRecognition",
            audio_format: {
              type: "raw",
              encoding: "pcm_f32le",
              sample_rate: sampleRate
            },
            transcription_config: {
              language: language.trim(),
              enable_partials: true,
              max_delay: 1.0
            }
          })
        );
      };

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data as string);

          if (msg.message === "RecognitionStarted") {
            recognitionStarted = true;
            cb.onStatus?.("listening", "Listening...");
            emitTranscript("Listening...");
            return;
          }

          if (msg.message === "AddTranscript") {
            const text = normalize(
              (msg.results || [])
                .map((r: any) => r?.alternatives?.[0]?.content || "")
                .join("")
            );

            const isFinal =
              msg?.metadata?.transcript_type === "final" ||
              msg?.metadata?.is_final === true;

            if (text) {
              if (isFinal) {
                finalText = normalize(finalText + " " + text);
                emitTranscript(finalText);
              } else {
                emitTranscript(normalize(finalText + " " + text));
              }
            }
            return;
          }

          if (msg.message === "Error") {
            cb.onStatus?.("error", `Speechmatics error: ${msg?.reason || "unknown"}`);
            stop(true);
            return;
          }
        } catch {
          // ignore
        }
      };

      ws.onerror = () => {
        cb.onStatus?.("error", "WebSocket error.");
        stop(true);
      };

      ws.onclose = () => {
        if (!manualStop) cb.onStatus?.("idle", "Closed.");
      };

      processor.onaudioprocess = (e) => {
        if (!running) return;
        if (!recognitionStarted) return;
        if (!ws || ws.readyState !== WebSocket.OPEN) return;

        const input = e.inputBuffer.getChannelData(0);
        ws.send(input.buffer);
      };
    } catch (e: any) {
      cb.onStatus?.("error", e?.message || "Start failed");
      cleanup();
    }
  }

  function stop(userStop = true) {
    manualStop = userStop;
    cb.onStatus?.("stopped", "Stopped");
    cleanup();
  }

  return { start, stop };
}