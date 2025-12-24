type StartOptions = {
  language: string; 
  onStatus: (s: string) => void;
  onPartial: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (err: string) => void;
};

export class SpeechmaticsClient {
  private ws: WebSocket | null = null;
  private audioCtx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private started = false;

  async start(opts: StartOptions) {
    if (this.started) return;
    this.started = true;

    try {
      opts.onStatus("Requesting Token...");

      const tr = await fetch("/api/stt/tokens", { cache: "no-store" });
      
      if (!tr.ok) {
        throw new Error(`API Error (${tr.status})`);
      }

      const data = await tr.json();

      if (!data.token) {
        throw new Error("No token received");
      }

      // Connect to Speechmatics
      const wsUrl = `wss://eu2.rt.speechmatics.com/v2/en?jwt=${data.token}`;

      opts.onStatus("Connecting...");

      this.ws = new WebSocket(wsUrl);
      this.ws.binaryType = "arraybuffer";

      this.ws.onopen = async () => {
        opts.onStatus("Connected. Starting Mic...");
        await this.setupAudio(opts);
      };

      this.ws.onmessage = (evt) => {
        this.handleMessage(evt, opts);
      };

      this.ws.onerror = (e) => {
        console.error("WS Error:", e);
        opts.onError("WebSocket Connection Error");
      };

      this.ws.onclose = (e) => {
        if (this.started) {
           opts.onStatus(`Connection Closed (Code: ${e.code})`);
        }
        this.stop();
      };

    } catch (err: any) {
      this.started = false;
      opts.onError(err.message || "Failed to start");
    }
  }

  private async setupAudio(opts: StartOptions) {
    try {
      // Standard High Quality Audio Constraints
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1
        } 
      });
      
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
      await this.audioCtx.resume();

      // ⚠️ GOLDEN RATIO CONFIGURATION
      // Enhanced Accuracy + Instant Partials + Stable Connection
      const startMsg = {
        message: "StartRecognition",
        audio_format: {
          type: "raw",
          encoding: "pcm_f32le",
          sample_rate: this.audioCtx.sampleRate,
        },
        transcription_config: {
          language: "en",
          operating_point: "enhanced", // ✅ MAX ACCURACY
          enable_partials: true,       // ✅ INSTANT SPEED (This makes it feel fast)
          max_delay: 2,                // ✅ STABILITY (Prevents 'Connection Closed')
          enable_entities: true,       // ✅ Formats numbers/dates
        },
      };

      this.ws?.send(JSON.stringify(startMsg));

      const source = this.audioCtx.createMediaStreamSource(this.stream);
      // 4096 is the most stable buffer size for browser microphones
      this.processor = this.audioCtx.createScriptProcessor(4096, 1, 1);

      source.connect(this.processor);
      this.processor.connect(this.audioCtx.destination);

      this.processor.onaudioprocess = (e) => {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        const input = e.inputBuffer.getChannelData(0);
        this.ws.send(input.buffer);
      };

      opts.onStatus("Listening...");

    } catch (err) {
      opts.onError("Microphone Denied");
      this.stop();
    }
  }

  private handleMessage(evt: MessageEvent, opts: StartOptions) {
    try {
      const msg = JSON.parse(evt.data);
      
      if (msg.message === "AudioAdded") return;

      if (msg.message === "AddTranscript") {
        if (msg.metadata?.transcript) {
          opts.onFinal(msg.metadata.transcript);
        }
      } 
      else if (msg.message === "AddPartialTranscript") {
        if (msg.metadata?.transcript) {
          opts.onPartial(msg.metadata.transcript);
        }
      }
    } catch {}
  }

  stop() {
    this.started = false;
    this.processor?.disconnect();
    this.audioCtx?.close();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.ws?.close();
    
    this.processor = null;
    this.audioCtx = null;
    this.stream = null;
    this.ws = null;
  }
}