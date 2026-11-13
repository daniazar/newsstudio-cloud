"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Cpu,
  RefreshCw,
  Zap,
  Volume2,
  HardDrive,
  Sparkles,
  Download,
  Music,
} from "lucide-react";
import { useWebGPUCapabilityCheck } from "@/lib/realtime/useWebGPUCapabilityCheck";

const VOICE_PRESETS = {
  es: [
    { id: "es_AR-male-rioplatense", label: "Rioplatense Male", onnx: "/presets/voices/es_AR-male-rioplatense.onnx", config: "/presets/voices/es_AR-male-rioplatense.onnx.json" },
    { id: "es_AR-daniela-high", label: "Daniela (Female)", onnx: "/presets/voices/es_AR-daniela-high.onnx", config: "/presets/voices/es_AR-daniela-high.onnx.json" },
  ],
  en: [
    { id: "en_US-amy-medium", label: "Amy", onnx: "/presets/voices/en_US-amy-medium.onnx", config: "/presets/voices/en_US-amy-medium.onnx.json" },
    { id: "en_US-ryan-high", label: "Ryan (Male)", onnx: "/presets/voices/en_US-ryan-high.onnx", config: "/presets/voices/en_US-ryan-high.onnx.json" },
  ],
} as const;

type Lang = keyof typeof VOICE_PRESETS;

export interface ScriptPreset {
  label: string;
  displayText: string;
  spokenText: string;
}

export const SAMPLE_SCRIPTS: Record<Lang, ScriptPreset[]> = {
  es: [
    {
      label: "Saludo & Intro",
      displayText: "¡Hola! Bienvenidos a Ruby NewsStudio.",
      spokenText: "¡Hola! Bienvenidos a Ruby NewsStudio.",
    },
    {
      label: "Tech & Finanzas",
      displayText: "El CEO de Apple anunció una inversión de $3.5B en IA.",
      spokenText: "El C-E-O de Apple anunció hoy una inversión de tres punto cinco billones de dólares en I-A.",
    },
    {
      label: "Último Momento",
      displayText: "Último momento: Wall Street sube un 20% hoy.",
      spokenText: "Noticia de último momento: el mercado de Wall Street sube un veinte por ciento hoy.",
    },
  ],
  en: [
    {
      label: "Greeting & Intro",
      displayText: "Hello and welcome to Ruby NewsStudio!",
      spokenText: "Hello, and welcome to Ruby NewsStudio!",
    },
    {
      label: "Tech & Innovation",
      displayText: "Apple just announced a $14.8M AI initiative.",
      spokenText: "Apple just announced a 14.8 million dollar A-I initiative.",
    },
    {
      label: "Market Alert",
      displayText: "Breaking news: NVIDIA revenue surged 42% today.",
      spokenText: "Breaking news: NVIDIA's revenue surged forty-two percent today.",
    },
  ],
};

function float32ToWavBlob(samples: Float32Array, sampleRate = 16000): Blob {
  const numChannels = 1;
  const bytesPerSample = 2; // 16-bit PCM
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // 16-bit
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const val = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(offset, val, true);
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

export function computeHermiteSpeechPresence(
  frameIdx: number,
  totalFrames: number,
  silenceMask?: boolean[]
): number {
  if (frameIdx < 0 || frameIdx >= totalFrames) return 0.0;

  const isSilent = silenceMask ? Boolean(silenceMask[frameIdx]) : false;
  if (isSilent && silenceMask) {
    let sStart = frameIdx;
    while (sStart > 0 && silenceMask[sStart - 1]) sStart--;
    let sEnd = frameIdx;
    while (sEnd < totalFrames - 1 && silenceMask[sEnd + 1]) sEnd++;
    const silenceLen = sEnd - sStart + 1;
    if (silenceLen < 3) return 0.70;
    return 0.0;
  }

  const N_ATTACK = 4;
  const N_RELEASE = 5;

  let sPrev = -1;
  if (silenceMask) {
    for (let i = frameIdx - 1; i >= 0; i--) {
      if (silenceMask[i]) {
        let sS = i;
        while (sS > 0 && silenceMask[sS - 1]) sS--;
        let sE = i;
        while (sE < totalFrames - 1 && silenceMask[sE + 1]) sE++;
        if (sE - sS + 1 >= 3) {
          sPrev = i;
          break;
        }
      }
    }
  }
  const distStart = sPrev === -1 ? frameIdx : frameIdx - sPrev - 1;

  let sNext = totalFrames;
  if (silenceMask) {
    for (let i = frameIdx + 1; i < totalFrames; i++) {
      if (silenceMask[i]) {
        let sS = i;
        while (sS > 0 && silenceMask[sS - 1]) sS--;
        let sE = i;
        while (sE < totalFrames - 1 && silenceMask[sE + 1]) sE++;
        if (sE - sS + 1 >= 3) {
          sNext = i;
          break;
        }
      }
    }
  }
  const distEnd = sNext === totalFrames ? totalFrames - 1 - frameIdx : sNext - frameIdx - 1;

  let alphaAttack = 1.0;
  if (distStart < N_ATTACK) {
    const tau = (distStart + 1.0) / (N_ATTACK + 1.0);
    alphaAttack = 3.0 * (tau * tau) - 2.0 * (tau * tau * tau);
  }

  let alphaRelease = 1.0;
  if (distEnd < N_RELEASE) {
    const tau = (distEnd + 1.0) / (N_RELEASE + 1.0);
    alphaRelease = 3.0 * (tau * tau) - 2.0 * (tau * tau * tau);
  }

  return Math.min(alphaAttack, alphaRelease);
}

export function computeHermitePresenceWeights(totalFrames: number, silenceMask?: boolean[]): Float32Array {
  const weights = new Float32Array(totalFrames);
  for (let f = 0; f < totalFrames; f++) {
    weights[f] = computeHermiteSpeechPresence(f, totalFrames, silenceMask);
  }
  return weights;
}

export function BrowserModePipeline({ className = "" }: { className?: string }) {
  const capability = useWebGPUCapabilityCheck();

  const [language, setLanguage] = useState<Lang>("es");
  const [voiceId, setVoiceId] = useState<string>("es_AR-male-rioplatense");

  const [gpuEngineReady, setGpuEngineReady] = useState(false);
  const [ttsReady, setTtsReady] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [isAudioOnly, setIsAudioOnly] = useState(false);
  const isAudioOnlyRef = useRef(false);

  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);

  const [synthesisStage, setSynthesisStage] = useState<"idle" | "tts" | "unet" | "vae" | "playback">("idle");
  const [synthesisProgress, setSynthesisProgress] = useState(0);
  const [fps, setFps] = useState(25);
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [ttsProgress, setTtsProgress] = useState(0);

  // Two-Tier Text Architecture
  const [visualText, setVisualText] = useState(SAMPLE_SCRIPTS.es[0].displayText);
  const [spokenText, setSpokenText] = useState(SAMPLE_SCRIPTS.es[0].spokenText);
  const [isNormalizing, setIsNormalizing] = useState(false);

  // DOM, Audio & Workers Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const ttsWorkerRef = useRef<Worker | null>(null);
  const gpuWorkerRef = useRef<Worker | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playbackSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const rawAudioBufferRef = useRef<Float32Array | null>(null);

  // Main-thread frame buffer: Map<frameIndex, { bitmap, coords, fd }>
  const decodedFramesRef = useRef<Map<number, {
    bitmap: ImageBitmap | null;
    coords: [number, number, number, number];
    fd?: { cx: number; cy: number; w: number; h: number; angle: number } | null;
  }>>(new Map());
  const isPlayingRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const lastRenderedFrameRef = useRef<number>(-1);
  const lastRenderedVideoIdxRef = useRef<number>(-1);
  const avatarMediaPipeFramesRef = useRef<Array<{ cx: number; cy: number; w: number; h: number; angle: number }>>([]);
  const avatarCoordsRef = useRef<Array<[number, number, number, number]>>([]);
  const avatarVideoFpsRef = useRef<number>(24.0);
  const silenceFlagsRef = useRef<boolean[]>([]);
  const presenceWeightsRef = useRef<Float32Array | null>(null);

  const selectedVoice = VOICE_PRESETS[language].find((v) => v.id === voiceId) ?? VOICE_PRESETS[language][0];
  const selectedVoiceRef = useRef(selectedVoice);
  selectedVoiceRef.current = selectedVoice;
  const languageRef = useRef<Lang>(language);
  languageRef.current = language;

  // 1. Base Video Autoplay Helper
  const startVideoPlayback = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.defaultMuted = true;
    const playPromise = v.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {});
    }
  }, []);

  // 2. Playback Cleanup Helper
  const endPlayback = useCallback(() => {
    isPlayingRef.current = false;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (canvasRef.current) {
      const cCtx = canvasRef.current.getContext("2d");
      cCtx?.clearRect(0, 0, 1080, 1920);
    }
    decodedFramesRef.current.forEach((f) => f.bitmap?.close());
    decodedFramesRef.current.clear();
    lastRenderedFrameRef.current = -1;
    lastRenderedVideoIdxRef.current = -1;
    setGenerating(false);
    setSynthesisStage("idle");
    setStatusMsg("Done. Ready for next prompt.");
  }, []);

  // 3. Initialize MuseTalk WebGPU Worker
  const initGPUWorker = useCallback(() => {
    if (gpuWorkerRef.current) return;
    try {
      const gpuWorker = new Worker(
        new URL("../../workers/musetalkGPUWorker.ts", import.meta.url),
        { type: "module" }
      );
      gpuWorkerRef.current = gpuWorker;

      gpuWorker.onmessage = (e: MessageEvent) => {
        const { type, payload } = e.data as { type: string; payload: Record<string, unknown> };

        if (type === "INIT_PROGRESS") {
          const stage = payload.stage as string;
          const percent = payload.percent as number;
          setStatusMsg(`Loading ${stage.toUpperCase()} model... ${percent}%`);
        } else if (type === "READY") {
          setGpuEngineReady(true);
          setStatusMsg("MuseTalk WebGPU Neural Engine Ready (TensorRT-grade WebGPU⚡)");
          if (payload.mediaPipeFrames && Array.isArray(payload.mediaPipeFrames)) {
            avatarMediaPipeFramesRef.current = payload.mediaPipeFrames as Array<{ cx: number; cy: number; w: number; h: number; angle: number }>;
          }
          if (payload.coords && Array.isArray(payload.coords)) {
            avatarCoordsRef.current = payload.coords as Array<[number, number, number, number]>;
          }
          if (typeof payload.videoFps === "number") {
            avatarVideoFpsRef.current = payload.videoFps;
          }
        } else if (type === "FRAME_PROGRESS") {
          const stage = payload.stage as "unet" | "vae";
          const percent = payload.percent as number;
          const frameIndex = payload.frameIndex as number;
          const totalFrames = payload.totalFrames as number;
          setSynthesisStage(stage);
          setSynthesisProgress(percent);
          setStatusMsg(`Synthesizing neural lip-sync [Frame ${frameIndex + 1} / ${totalFrames}] (${stage.toUpperCase()} ${percent}%)...`);
        } else if (type === "FRAME_READY") {
          // Zero-copy ImageBitmap transferred from worker
          const frameIndex = payload.frameIndex as number;
          const bitmap = payload.bitmap as ImageBitmap | null;
          const coords = payload.coords as [number, number, number, number];
          const fd = (payload.fd as { cx: number; cy: number; w: number; h: number; angle: number } | null) || null;
          decodedFramesRef.current.set(frameIndex, { bitmap, coords, fd });
        } else if (type === "STREAM_READY") {
          void (async () => {
            setSynthesisStage("playback");
            setStatusMsg("Playing neural lip-sync (A/V sync locked)...");

            const rawAudio = rawAudioBufferRef.current;
            if (!rawAudio) {
              endPlayback();
              return;
            }

            // Ensure AudioContext is active
            if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
              const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
              audioCtxRef.current = new AudioCtx();
            }
            const ctx = audioCtxRef.current;
            if (ctx.state === "suspended") {
              try {
                await ctx.resume();
              } catch (e) {
                console.warn("[audioCtx.resume]", e);
              }
            }

            // Fresh AudioBufferSourceNode at start of playback
            const buf = ctx.createBuffer(1, rawAudio.length, 16000);
            buf.getChannelData(0).set(rawAudio);

            const src = ctx.createBufferSource();
            src.buffer = buf;
            src.connect(ctx.destination);
            playbackSourceRef.current = src;

            const startTime = ctx.currentTime;
            src.start(0);

            if (videoRef.current) {
              videoRef.current.currentTime = 0;
              videoRef.current.muted = true;
              videoRef.current.defaultMuted = true;
              videoRef.current.play().catch(() => {});
            }

            isPlayingRef.current = true;
            lastRenderedFrameRef.current = -1;

            src.onended = () => {
              endPlayback();
            };

            // Main-thread requestAnimationFrame locked to AudioContext time + Hardware Video PTS
            const totalFrames = payload.totalFrames as number;
            const silenceFlags = (payload.silenceFlags as boolean[]) || [];
            silenceFlagsRef.current = silenceFlags;
            presenceWeightsRef.current = computeHermitePresenceWeights(totalFrames, silenceFlags);

            let renderTicks = 0;
            let lastFpsTime = performance.now();

            const renderLoop = () => {
              if (!isPlayingRef.current) return;

              const now = performance.now();
              const elapsed = ctx.currentTime - startTime;
              const targetIdx = Math.max(0, Math.floor(elapsed * 25));

              const v = videoRef.current;
              const vFps = avatarVideoFpsRef.current || 24.0;
              const mediaPipeFrames = avatarMediaPipeFramesRef.current;
              const totalVF = mediaPipeFrames.length || avatarCoordsRef.current.length || 185;

              // 1. Dynamic Phase-Locked Loop (PLL) drift compensation between video and audio
              if (v) {
                const videoTime = v.currentTime;
                const vDuration = v.duration > 0 ? v.duration : (totalVF / vFps);
                const expectedVideoTime = (vDuration > 0) ? (elapsed % vDuration) : elapsed;
                const drift = videoTime - expectedVideoTime;

                if (Math.abs(drift) > 0.10) {
                  // Hard seek if drift exceeds 100ms
                  v.currentTime = expectedVideoTime;
                  v.playbackRate = 1.0;
                } else if (drift > 0.015) {
                  // Video leads audio by >15ms: gently brake to 0.95x
                  v.playbackRate = 0.95;
                } else if (drift < -0.015) {
                  // Video lags audio by >15ms: gently accelerate to 1.05x
                  v.playbackRate = 1.05;
                } else {
                  v.playbackRate = 1.0;
                }
              }

              // 2. Hardware Video Presentation Index (at 24.0 FPS)
              const presentedVideoTime = v ? v.currentTime : (elapsed % (totalVF / vFps));
              const vIdx = Math.max(0, Math.floor(presentedVideoTime * vFps + 0.001)) % totalVF;

              // 3. Render when either the audio viseme changes (25 FPS) or video frame advances (24 FPS)
              if (targetIdx !== lastRenderedFrameRef.current || vIdx !== lastRenderedVideoIdxRef.current) {
                lastRenderedFrameRef.current = targetIdx;
                lastRenderedVideoIdxRef.current = vIdx;

                const frameData = decodedFramesRef.current.get(targetIdx);
                const c = canvasRef.current;
                if (c) {
                  const cCtx = c.getContext("2d");
                  if (cCtx) {
                    cCtx.clearRect(0, 0, 1080, 1920);

                    const weights = presenceWeightsRef.current;
                    const presenceWeight = (weights && targetIdx < weights.length)
                      ? weights[targetIdx]
                      : 1.0;

                    // In deep silence or resting pause, canvas remains clear to expose 100% native resting video mouth
                    if (presenceWeight > 0.005 && frameData?.bitmap) {
                      // Live MediaPipe 478-point affine coordinates locked to presented video frame
                      const liveFd = (mediaPipeFrames.length > 0 && mediaPipeFrames[vIdx])
                        ? mediaPipeFrames[vIdx]
                        : frameData.fd;

                      if (liveFd) {
                        // Canonical Frame 0 Constants from MediaPipe FaceLandmarker
                        const CX0 = 123.84;
                        const CY0 = 189.57;
                        const W0 = 105.65;
                        const H0 = 25.53;
                        const theta0 = -2.87 * (Math.PI / 180.0);

                        const sx = liveFd.w / W0;
                        const targetH = liveFd.h || (liveFd.w * (30.56 / 94.50));
                        const sy = targetH / H0;
                        const dTheta = (liveFd.angle * (Math.PI / 180.0)) - theta0;

                        cCtx.save();
                        cCtx.globalAlpha = presenceWeight;
                        cCtx.translate(liveFd.cx, liveFd.cy);
                        cCtx.rotate(dTheta);
                        cCtx.scale(sx, sy);
                        cCtx.drawImage(frameData.bitmap, -CX0, -CY0);
                        cCtx.restore();
                      } else {
                        const liveCoords = (avatarCoordsRef.current.length > 0 && avatarCoordsRef.current[vIdx])
                          ? avatarCoordsRef.current[vIdx]
                          : frameData.coords;
                        const [x1, y1, x2, y2] = liveCoords;
                        const w = x2 - x1;
                        const h = y2 - y1;
                        if (w > 0 && h > 0) {
                          cCtx.save();
                          cCtx.globalAlpha = presenceWeight;
                          cCtx.drawImage(frameData.bitmap, 0, 0, 256, 256, x1, y1, w, h);
                          cCtx.restore();
                        }
                      }
                    }
                  }
                }
                renderTicks++;
              }

              if (now - lastFpsTime >= 1000) {
                setFps(renderTicks);
                renderTicks = 0;
                lastFpsTime = now;
              }

              if (targetIdx < totalFrames && isPlayingRef.current) {
                rafRef.current = requestAnimationFrame(renderLoop);
              } else if (targetIdx >= totalFrames) {
                endPlayback();
              }
            };

            rafRef.current = requestAnimationFrame(renderLoop);
          })();
        } else if (type === "ERROR") {
          console.error("[MuseTalk Worker Error]", payload.message);
          setInitError(`MuseTalk: ${payload.message as string}`);
          setGenerating(false);
          setSynthesisStage("idle");
        }
      };

      // Initialize UNet, VAE, and Avatar packet with WebGPU neural models
      gpuWorker.postMessage({
        type: "INIT",
        payload: {
          unetUrl: "/models/musetalk/musetalk_unet.onnx",
          vaeUrl: "/models/musetalk/vae_decoder.onnx",
          latentsUrl: "/assets/avatars/latents/ruby_burgundy_m1_loop_v1.latents.bin",
          metaUrl: "/assets/avatars/latents/ruby_burgundy_m1_loop_v1.meta.json",
        },
      });
    } catch (err) {
      console.error("[initGPUWorker]", err);
    }
  }, [endPlayback]);

  // 4. Initialize Piper TTS Worker
  const initTTSWorker = useCallback(() => {
    if (ttsWorkerRef.current) return;
    try {
      const tts = new Worker(
        new URL("../../workers/piperTTSWorker.ts", import.meta.url),
        { type: "module" }
      );
      ttsWorkerRef.current = tts;

      tts.onmessage = (e: MessageEvent) => {
        const { type, payload } = e.data as { type: string; payload: Record<string, unknown> };

        if (type === "INIT_PROGRESS") {
          const percent = payload.percent as number;
          setTtsProgress(percent);
          setStatusMsg(`Loading Piper Voice... ${percent}%`);
        } else if (type === "READY") {
          setTtsReady(true);
          setInitializing(false);
          setStatusMsg("Piper TTS Ready ✅");
        } else if (type === "SYNTHESIS_COMPLETE") {
          const audio16kHz = payload.audio16kHz as ArrayBuffer;
          const duration = payload.durationSec as number;
          const requestId = payload.requestId as string;

          // Store a copy of audio float data for playback
          const copy = new Float32Array(audio16kHz.slice(0));
          rawAudioBufferRef.current = copy;

          // Convert to WAV Blob for instant download & preview
          const wavBlob = float32ToWavBlob(copy, 16000);
          setAudioBlobUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return URL.createObjectURL(wavBlob);
          });
          setAudioDuration(duration);

          if (isAudioOnlyRef.current) {
            isAudioOnlyRef.current = false;
            setIsAudioOnly(false);
            setGenerating(false);
            setSynthesisStage("idle");
            setStatusMsg(`Piper audio generated (${duration.toFixed(1)}s)! Click 'Download WAV' below.`);
            return;
          }

          setStatusMsg(`Synthesized audio (${duration.toFixed(1)}s) — running WebGPU Batched MuseTalk...`);
          setSynthesisStage("unet");
          setSynthesisProgress(5);

          // Clear previous frames
          decodedFramesRef.current.forEach((f) => f.bitmap?.close());
          decodedFramesRef.current.clear();

          // Send raw audio to WebGPU worker as Transferable
          gpuWorkerRef.current?.postMessage(
            { type: "AUDIO_CHUNK", payload: { audio16kHz, requestId } },
            [audio16kHz]
          );
        } else if (type === "ERROR") {
          console.error("[TTS Worker]", payload.message);
          setInitError(`TTS: ${payload.message as string}`);
          setInitializing(false);
          setGenerating(false);
          setSynthesisStage("idle");
        }
      };

      tts.postMessage({
        type: "INIT",
        payload: {
          onnxUrl: selectedVoiceRef.current.onnx,
          configUrl: selectedVoiceRef.current.config,
          language: languageRef.current === "es" ? "es_AR" : "en_US",
          applyRioplatense: languageRef.current === "es",
        },
      });
    } catch (err) {
      console.error("[initTTSWorker]", err);
    }
  }, []);

  // 5. Switch Voices dynamically
  const handleSwitchVoice = useCallback((newVoiceId: string, newLang: Lang) => {
    setVoiceId(newVoiceId);
    setLanguage(newLang);

    const allPresets = [...SAMPLE_SCRIPTS.es, ...SAMPLE_SCRIPTS.en];
    const isUsingPreset = allPresets.some((p) => p.displayText === visualText);
    if (!visualText.trim() || isUsingPreset) {
      const nextPreset = SAMPLE_SCRIPTS[newLang][0];
      setVisualText(nextPreset.displayText);
      setSpokenText(nextPreset.spokenText);
    }
    const voice = VOICE_PRESETS[newLang].find((v) => v.id === newVoiceId) ?? VOICE_PRESETS[newLang][0];
    if (ttsWorkerRef.current) {
      setTtsReady(false);
      setStatusMsg(`Loading ${voice.label}...`);
      ttsWorkerRef.current.postMessage({
        type: "INIT",
        payload: {
          onnxUrl: voice.onnx,
          configUrl: voice.config,
          language: newLang === "es" ? "es_AR" : "en_US",
          applyRioplatense: newLang === "es",
        },
      });
    }
  }, [visualText]);

  // 5. Preload Avatar MediaPipe Landmark Geometry
  useEffect(() => {
    fetch("/assets/avatars/latents/ruby_burgundy_m1_loop_v1.meta.json")
      .then((r) => r.json())
      .then((metaJson) => {
        if (metaJson.mediaPipe?.frames && Array.isArray(metaJson.mediaPipe.frames)) {
          avatarMediaPipeFramesRef.current = metaJson.mediaPipe.frames;
        }
        if (Array.isArray(metaJson.coords) && metaJson.coords.length > 0) {
          avatarCoordsRef.current = metaJson.coords;
        }
        if (typeof metaJson.videoFps === "number") {
          avatarVideoFpsRef.current = metaJson.videoFps;
        } else if (typeof metaJson.fps === "number") {
          avatarVideoFpsRef.current = metaJson.fps;
        }
      })
      .catch((err) => {
        console.warn("[BrowserModePipeline] Preloading avatar metadata failed:", err);
      });
  }, []);

  // 6. Autoplay Video on mount and interaction
  useEffect(() => {
    startVideoPlayback();

    const onUserGesture = () => {
      startVideoPlayback();
      window.removeEventListener("pointerdown", onUserGesture);
      window.removeEventListener("keydown", onUserGesture);
    };
    window.addEventListener("pointerdown", onUserGesture, { once: true });
    window.addEventListener("keydown", onUserGesture, { once: true });

    return () => {
      window.removeEventListener("pointerdown", onUserGesture);
      window.removeEventListener("keydown", onUserGesture);
    };
  }, [startVideoPlayback]);

  // 7. Auto-initialize WebGPU MuseTalk worker and Piper TTS worker ONCE on mount
  useEffect(() => {
    initGPUWorker();
    initTTSWorker();

    return () => {
      endPlayback();
      playbackSourceRef.current?.stop();
      ttsWorkerRef.current?.terminate();
      ttsWorkerRef.current = null;
      gpuWorkerRef.current?.terminate();
      gpuWorkerRef.current = null;
      audioCtxRef.current?.close();
    };
  }, [initGPUWorker, initTTSWorker, endPlayback]);

  const handleNormalizeSpokenText = async () => {
    if (!visualText.trim() || isNormalizing) return;
    setIsNormalizing(true);
    setStatusMsg("Optimizing pronunciation via local LLM...");

    try {
      const res = await fetch("/api/tts/normalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: visualText.trim(),
          engine: "piper",
          language: language === "es" ? "es" : "en",
          mode: "realtime",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.spokenText) {
          setSpokenText(data.spokenText);
          setStatusMsg("Pronunciation optimized for Piper ONNX ✅");
        }
      }
    } catch (err) {
      console.error("[Normalization] Failed:", err);
    } finally {
      setIsNormalizing(false);
    }
  };

  const handleGenerate = useCallback(async () => {
    if (!visualText.trim() || generating || isAudioOnly) return;

    isAudioOnlyRef.current = false;
    setIsAudioOnly(false);
    setGenerating(true);
    setSynthesisStage("tts");
    setSynthesisProgress(5);

    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current.state === "suspended") {
      void audioCtxRef.current.resume();
    }
    startVideoPlayback();

    const isSpokenNormalized = spokenText.trim() && spokenText.trim() !== visualText.trim();
    const textToSynthesize = isSpokenNormalized ? spokenText.trim() : visualText.trim();

    setStatusMsg("Synthesizing speech via Piper ONNX (WASM CPU)...");

    if (!ttsWorkerRef.current) {
      initTTSWorker();
    }

    ttsWorkerRef.current?.postMessage({
      type: "SYNTHESIZE",
      payload: {
        text: textToSynthesize,
        requestId: `req_${Date.now()}`,
      },
    });
  }, [spokenText, visualText, generating, isAudioOnly, startVideoPlayback, initTTSWorker]);

  const handleSynthesizeAudioOnly = useCallback(() => {
    if (!visualText.trim() || generating || isAudioOnly) return;

    isAudioOnlyRef.current = true;
    setIsAudioOnly(true);
    setStatusMsg("Synthesizing Piper audio only...");

    const isSpokenNormalized = spokenText.trim() && spokenText.trim() !== visualText.trim();
    const textToSynthesize = isSpokenNormalized ? spokenText.trim() : visualText.trim();

    if (!ttsWorkerRef.current) {
      initTTSWorker();
    }

    ttsWorkerRef.current?.postMessage({
      type: "SYNTHESIZE",
      payload: {
        text: textToSynthesize,
        requestId: `audio_only_${Date.now()}`,
      },
    });
  }, [spokenText, visualText, generating, isAudioOnly, initTTSWorker]);

  const handleDownloadAudio = useCallback(() => {
    if (!audioBlobUrl) return;
    const a = document.createElement("a");
    a.href = audioBlobUrl;
    a.download = `piper_${selectedVoice.id}_${Date.now()}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [audioBlobUrl, selectedVoice.id]);

  useEffect(() => {
    return () => {
      if (audioBlobUrl) {
        URL.revokeObjectURL(audioBlobUrl);
      }
    };
  }, [audioBlobUrl]);

  return (
    <div className={`flex flex-col h-full bg-[#05070c] text-white overflow-y-auto p-4 space-y-3 ${className}`}>

      {/* GPU Capability Card */}
      <div className="shrink-0">
        {capability.checking ? (
          <div className="p-3 rounded-xl bg-neutral-900/50 border border-white/10 flex items-center gap-3">
            <RefreshCw className="w-4 h-4 text-neutral-400 animate-spin" />
            <span className="text-xs font-mono text-neutral-300">Probing GPU adapter...</span>
          </div>
        ) : !capability.supported ? (
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-900 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-red-400">WebGPU Not Supported</h4>
              <p className="text-[11px] text-red-300/80 mt-0.5">{capability.reason}</p>
              <p className="text-[11px] font-bold text-white mt-1">→ Use Server Mode (Port 8010)</p>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-900/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-emerald-400">WebGPU Neural Pipeline Active</h4>
                <p className="text-[10px] text-emerald-300/60">{capability.adapterName ?? "Hardware GPU"} · Batched MuseTalk UNet + VAE</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded bg-black/40 text-[10px] font-mono text-emerald-300 border border-emerald-500/20">
                {Math.round(capability.maxBufferMB)} MB VRAM
              </span>
              {capability.supportsFP16 && (
                <span className="px-2 py-0.5 rounded bg-black/40 text-[10px] font-mono text-cyan-300 border border-cyan-500/20">
                  FP16
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Voice Selector */}
      <div className="p-3 rounded-xl bg-neutral-900/50 border border-white/10 space-y-2.5 shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-bold">Voice Model</h3>
          {language === "es" && (
            <span className="px-2 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-[10px] font-mono text-amber-300">
              🧉 Rioplatense ON
            </span>
          )}
        </div>
        <div className="flex gap-1.5">
          {(["es", "en"] as Lang[]).map((lang) => (
            <button
              key={lang}
              onClick={() => {
                const nextVoice = VOICE_PRESETS[lang][0].id;
                handleSwitchVoice(nextVoice, lang);
              }}
              disabled={initializing || generating}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer ${
                language === lang
                  ? "bg-white/10 text-white border border-white/20"
                  : "bg-black/40 text-neutral-500 border border-transparent hover:bg-white/5"
              }`}
            >
              {lang === "es" ? "🇦🇷 Spanish" : "🇺🇸 English"}
            </button>
          ))}
        </div>
        <select
          value={voiceId}
          onChange={(e) => handleSwitchVoice(e.target.value, language)}
          disabled={initializing || generating}
          className="w-full p-2 rounded-lg bg-black/60 border border-white/15 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none disabled:opacity-50 cursor-pointer"
        >
          {VOICE_PRESETS[language].map((v) => (
            <option key={v.id} value={v.id}>{v.label} ({v.id})</option>
          ))}
        </select>
      </div>

      {/* Engine Status */}
      <div className="p-3 rounded-xl bg-neutral-900/50 border border-white/10 space-y-2 shrink-0">
        <h3 className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-bold">Engine Status</h3>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-white/5">
            <div className="flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-mono text-neutral-300">Piper TTS (WASM CPU)</span>
            </div>
            {ttsReady ? (
              <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                <CheckCircle2 className="w-3 h-3" /> Ready
              </div>
            ) : ttsProgress > 0 ? (
              <div className="w-24 h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 transition-all" style={{ width: `${ttsProgress}%` }} />
              </div>
            ) : (
              <span className="text-[10px] text-neutral-500 font-mono">Loading...</span>
            )}
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-white/5">
            <div className="flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs font-mono text-neutral-300">MuseTalk Neural (WebGPU Batched B=4)</span>
            </div>
            {gpuEngineReady ? (
              <div className="flex items-center gap-1 text-[10px] text-cyan-400 font-bold">
                <CheckCircle2 className="w-3 h-3" /> Ready (WebGPU⚡)
              </div>
            ) : (
              <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin" />
            )}
          </div>
        </div>

        {/* Progress Bar during neural synthesis */}
        {generating && (
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between text-[10px] font-mono text-cyan-300">
              <span>{synthesisStage === "tts" ? "Synthesizing Audio..." : synthesisStage === "unet" ? "UNet Diffusion Keyframes (Batched B=4)..." : synthesisStage === "vae" ? "VAE Neural Decoding (Batched B=4)..." : "A/V Locked Playback"}</span>
              <span>{synthesisProgress}%</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300"
                style={{ width: `${synthesisProgress}%` }}
              />
            </div>
          </div>
        )}

        {initError && (
          <p className="text-[10px] text-red-400 font-mono bg-red-950/30 rounded px-2 py-1">{initError}</p>
        )}

        {statusMsg && !initError && (
          <p className="text-[10px] text-neutral-400 font-mono">{statusMsg}</p>
        )}
      </div>

      {/* Stage Container: Hardware-accelerated base loop video + WebGPU lip-sync overlay canvas */}
      <div
        onClick={startVideoPlayback}
        className={`relative mx-auto h-[460px] aspect-[9/16] rounded-2xl overflow-hidden bg-neutral-950 border shadow-2xl shrink-0 transition-all cursor-pointer ${gpuEngineReady ? "border-violet-500/50 shadow-violet-500/10" : "border-white/10"}`}
      >
        {/* Layer 1 (Bottom): Master Ruby Burgundy Loop Video */}
        <video
          ref={videoRef}
          src="/assets/action_loops/veo/ruby_burgundy_vertical_backup/ruby_burgundy_M1_loop_v1.mp4"
          autoPlay
          loop
          muted
          playsInline
          onLoadedMetadata={(e) => {
            e.currentTarget.muted = true;
            e.currentTarget.defaultMuted = true;
            e.currentTarget.play().catch(() => {});
          }}
          onCanPlay={(e) => {
            e.currentTarget.muted = true;
            e.currentTarget.defaultMuted = true;
            e.currentTarget.play().catch(() => {});
          }}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />

        {/* Layer 2 (Overlay): Main-Thread Direct Compositor WebGPU Lip-Sync Canvas */}
        <canvas
          ref={canvasRef}
          width={1080}
          height={1920}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />

        {/* HUD Overlay */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 flex-wrap z-10 pointer-events-none">
          <div className="px-2 py-0.5 rounded bg-black/75 backdrop-blur text-[10px] font-mono flex items-center gap-1 border border-white/10">
            <span className={`w-1.5 h-1.5 rounded-full ${generating ? "bg-red-400 animate-pulse" : gpuEngineReady ? "bg-emerald-400" : "bg-neutral-500"}`} />
            {generating ? (synthesisStage === "playback" ? "LIVE ⚡" : "SYNTH") : gpuEngineReady ? "READY" : "IDLE"}
          </div>

          <div className="px-2 py-0.5 rounded bg-black/75 backdrop-blur text-[10px] font-mono text-cyan-300 border border-white/10">
            {fps} FPS
          </div>
        </div>
      </div>

      {/* Script Presets & Two-Tier Script Editor */}
      <div className="p-3 rounded-xl bg-neutral-900/50 border border-white/10 space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-bold">Script Presets</h3>
          <span className="text-[9px] font-mono text-neutral-500">Tier 1 & Tier 2 Cadence</span>
        </div>

        <div className="flex gap-1.5">
          {SAMPLE_SCRIPTS[language].map((script) => (
            <button
              key={script.label}
              onClick={() => {
                setVisualText(script.displayText);
                setSpokenText(script.spokenText);
              }}
              disabled={generating}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer border ${
                visualText === script.displayText
                  ? "bg-violet-600/30 text-violet-200 border-violet-500/50"
                  : "bg-black/40 text-neutral-400 border-white/5 hover:bg-white/5 hover:text-white"
              }`}
            >
              {script.label}
            </button>
          ))}
        </div>

        {/* Visual Script Input */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-mono text-neutral-400">Display / Teleprompter Text</label>
            <button
              onClick={handleNormalizeSpokenText}
              disabled={isNormalizing || generating || !visualText.trim()}
              className="flex items-center gap-1 text-[10px] font-mono text-amber-400 hover:text-amber-300 disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              {isNormalizing ? "Optimizing..." : "Normalize Phonetics"}
            </button>
          </div>
          <textarea
            value={visualText}
            onChange={(e) => {
              setVisualText(e.target.value);
              setSpokenText(e.target.value);
            }}
            rows={2}
            disabled={generating}
            className="w-full p-2.5 rounded-lg bg-black/60 border border-white/15 text-xs text-white placeholder-neutral-500 focus:border-cyan-500 focus:outline-none resize-none font-sans disabled:opacity-50"
            placeholder="Type speech prompt here..."
          />
        </div>

        {/* Generate / Synthesize Audio Controls */}
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            {/* Generate Full Lip-Sync */}
            <button
              onClick={handleGenerate}
              disabled={!gpuEngineReady || !ttsReady || generating || isAudioOnly || !visualText.trim()}
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 font-bold text-xs shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {generating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{synthesisStage === "playback" ? "Speaking..." : "Synthesizing Neural Lip-Sync..."}</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-current" />
                  <span>Speak in Browser (Piper + WebGPU)</span>
                </>
              )}
            </button>

            {/* Synthesize Audio Only (Instant <50ms) */}
            <button
              onClick={handleSynthesizeAudioOnly}
              disabled={!ttsReady || generating || isAudioOnly || !visualText.trim()}
              title="Generate audio only using in-browser Piper TTS without running WebGPU MuseTalk"
              className="py-2.5 px-3.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-white/10 text-neutral-200 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              {isAudioOnly ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Music className="w-3.5 h-3.5 text-amber-400" />
                  <span>Audio Only</span>
                </>
              )}
            </button>
          </div>

          {/* Download Audio Bar (Shown whenever Piper audio is available) */}
          {audioBlobUrl && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-violet-950/40 border border-violet-500/30 text-xs">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-violet-400 shrink-0" />
                <span className="font-mono text-neutral-200">
                  Piper Audio: <span className="text-violet-300 font-bold">{audioDuration.toFixed(1)}s</span> (16kHz WAV)
                </span>
                <audio controls src={audioBlobUrl} className="h-6 w-36 ml-2" />
              </div>
              <button
                onClick={handleDownloadAudio}
                className="py-1.5 px-3 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-mono font-bold text-xs flex items-center gap-1.5 shadow-md shadow-violet-900/50 cursor-pointer transition-all shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download WAV</span>
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
