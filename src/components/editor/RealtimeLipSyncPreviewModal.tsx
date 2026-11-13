"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { AudioVisemeExtractor } from "@/lib/realtime/audioVisemeExtractor";
import { WebGLVisemeRenderer } from "@/lib/realtime/webglVisemeShader";
import { resolveStorageUrl } from "@/lib/storage/storageUtils";
import { PERSONA_CONFIGS } from "@/components/realtime/types";
import { getDefaultEngineForMode } from "@/lib/tts/modelPromptDirectives";
import type { UseModernTtsReturn } from "@/lib/tts/useModernTts";

interface RealtimeLipSyncPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  segment: {
    index: number;
    text: string;
    spokenText?: string | null;
    audioPath?: string | null;
    personaId?: string | null;
    actionLoop?: string | null;
  } | null;
  storyId: string;
  tts?: UseModernTtsReturn;
}

export const RealtimeLipSyncPreviewModal: React.FC<RealtimeLipSyncPreviewModalProps> = ({
  isOpen,
  onClose,
  segment,
  storyId,
  tts: _tts,
  }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [fps, setFps] = useState(60);
  const [jawOpen, setJawOpen] = useState(0);
  const [dominantViseme, setDominantViseme] = useState("sil");
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isNormalizing, setIsNormalizing] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const personaConfig =
    PERSONA_CONFIGS.find((p) => p.id === segment?.personaId) || PERSONA_CONFIGS[0];

  // Default engine for realtime mode: Kokoro for English, Piper for Spanish
  const defaultEngine = getDefaultEngineForMode("realtime", personaConfig.voiceLang || "en");
  const [selectedEngine, setSelectedEngine] = useState<string>(defaultEngine);
  const [localSpokenText, setLocalSpokenText] = useState<string>(
    segment?.spokenText || segment?.text || ""
  );

  // Sync segment changes to local state
  useEffect(() => {
    if (!segment) return;
    setLocalSpokenText(segment.spokenText || segment.text || "");
    setSelectedEngine(getDefaultEngineForMode("realtime", personaConfig.voiceLang || "en"));
  }, [segment, personaConfig.voiceLang]);

  const extractorRef = useRef<AudioVisemeExtractor | null>(null);
  const rendererRef = useRef<WebGLVisemeRenderer | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const isSourceConnectedRef = useRef(false);
  const blobUrlRef = useRef<string | null>(null);

  const loopVideoSrc =
    personaConfig.motionBeats.find((b) => b.code === segment?.actionLoop)?.videoUrl ||
    personaConfig.motionBeats[0]?.videoUrl ||
    personaConfig.idleVideo ||
    "/assets/action_loops/veo/veo_ruby_p01_standing_clasped_9x16_master.mp4";

  // Resolve audio URL
  useEffect(() => {
    if (!segment) return;
    if (blobUrlRef.current && blobUrlRef.current.startsWith("blob:")) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    if (segment.audioPath) {
      setAudioUrl(resolveStorageUrl(segment.audioPath));
    } else {
      setAudioUrl(null);
    }
  }, [segment]);

  // Request LLM re-normalization tailored to selected neural engine
  const handleNormalizeSpokenText = async (engineToUse = selectedEngine) => {
    if (!segment?.text) return;
    setIsNormalizing(true);
    try {
      const res = await fetch("/api/tts/normalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: segment.text,
          engine: engineToUse,
          language: personaConfig.voiceLang || "en",
          mode: "realtime",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.spokenText) {
          setLocalSpokenText(data.spokenText);
        }
      }
    } catch (err) {
      console.error("Failed to re-normalize spoken text:", err);
    } finally {
      setIsNormalizing(false);
    }
  };

  const handleEngineChange = async (newEngine: string) => {
    setSelectedEngine(newEngine);
    await handleNormalizeSpokenText(newEngine);
  };

  const handleSynthesizeTTS = useCallback(async () => {
    const textToSynthesize = localSpokenText.trim() || segment?.spokenText || segment?.text;
    if (!textToSynthesize) return;
    setIsSynthesizing(true);

    try {
      // 1. Direct synthesis with target engine and spoken text
      const res = await fetch("/api/tts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textToSynthesize,
          engine: selectedEngine,
          personaId: segment?.personaId || "ruby",
          language: personaConfig.voiceLang || "en",
          bypassCache: true,
        }),
      });

      if (res.ok) {
        const blob = await res.blob();
        if (blob && blob.size > 0) {
          if (blobUrlRef.current && blobUrlRef.current.startsWith("blob:")) {
            URL.revokeObjectURL(blobUrlRef.current);
          }
          const url = URL.createObjectURL(blob);
          blobUrlRef.current = url;
          setAudioUrl(url);
          return;
        }
      }

      // 2. Fallback: POST to story audio generation endpoint
      const storyRes = await fetch(`/api/stories/${storyId}/audio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segmentIndex: segment?.index,
          text: textToSynthesize,
          personaId: segment?.personaId || "ruby",
          engine: selectedEngine,
        }),
      });

      if (storyRes.ok) {
        const data = await storyRes.json();
        if (data.audioPath) {
          setAudioUrl(resolveStorageUrl(data.audioPath));
        }
      }
    } catch (e) {
      console.error("Synthesize error:", e);
    } finally {
      setIsSynthesizing(false);
    }
  }, [segment, storyId, localSpokenText, selectedEngine, personaConfig]);

  // Initialize WebGL and Audio Extractor
  useEffect(() => {
    if (!isOpen) return;

    if (canvasRef.current && !rendererRef.current) {
      try {
        const r = new WebGLVisemeRenderer();
        if (r.init(canvasRef.current)) {
          rendererRef.current = r;
        }
      } catch (e) {
        console.warn("WebGL renderer init failed:", e);
      }
    }

    if (!extractorRef.current) {
      extractorRef.current = new AudioVisemeExtractor();
    }

    const currentAudio = audioRef.current;
    const currentVideo = videoRef.current;

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = "";
      }
      if (currentVideo) {
        currentVideo.pause();
        currentVideo.src = "";
      }
    };
  }, [isOpen]);

  // Main Render Loop
  const startRenderLoop = useCallback(() => {
    const renderFrame = (time: number) => {
      // Calculate FPS
      frameCountRef.current++;
      if (time - lastTimeRef.current >= 1000) {
        setFps(frameCountRef.current);
        frameCountRef.current = 0;
        lastTimeRef.current = time;
      }

      const video = videoRef.current;
      const audio = audioRef.current;
      const extractor = extractorRef.current;
      const renderer = rendererRef.current;

      if (video && video.readyState >= 2 && renderer) {
        let frameData = {
          jawOpen: 0,
          lipWidth: 0,
          lipHeight: 0,
          lipPucker: 0,
          lipCompression: 0,
          dominantViseme: "sil",
        };

        if (audio && !audio.paused && extractor) {
          const extracted = extractor.extractFrame();
          frameData = {
            jawOpen: extracted.jawOpen,
            lipWidth: extracted.lipWidth,
            lipHeight: extracted.lipHeight,
            lipPucker: extracted.lipPucker,
            lipCompression: extracted.lipCompression,
            dominantViseme: extracted.dominantViseme,
          };
          setJawOpen(extracted.jawOpen);
          setDominantViseme(extracted.dominantViseme);
        } else {
          setJawOpen(0);
          setDominantViseme("sil");
        }

        const roi = (personaConfig as unknown as { mouthRoi?: { center?: [number, number]; radius?: [number, number]; angle?: number } })?.mouthRoi || { center: [0.5, 0.65] as [number, number], radius: [0.15, 0.12] as [number, number], angle: 0 };
        renderer.render(video, {
          mouthCenter: roi.center || [0.5, 0.65],
          mouthRadius: roi.radius || [0.15, 0.12],
          mouthAngle: roi.angle || 0,
          jawOpen: frameData.jawOpen,
          lipWidth: frameData.lipWidth,
          lipPucker: frameData.lipPucker,
          aspectRatio: (canvasRef.current?.width || 540) / (canvasRef.current?.height || 960),
        });
      }

      animationFrameRef.current = requestAnimationFrame(renderFrame);
    };

    animationFrameRef.current = requestAnimationFrame(renderFrame);
  }, [personaConfig]);

  // Clean up AudioContext, animation frame, and blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrlRef.current && blobUrlRef.current.startsWith("blob:")) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      isSourceConnectedRef.current = false;
    };
  }, []);

  const handlePlay = async () => {
    if (!videoRef.current) return;

    if (!audioUrl) {
      await handleSynthesizeTTS();
    }

    try {
      videoRef.current.currentTime = 0;
      await videoRef.current.play();

      if (audioRef.current && audioUrl) {
        if (!audioCtxRef.current) {
          const AudioContextClass =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          audioCtxRef.current = new AudioContextClass();
        }
        if (audioCtxRef.current.state === "suspended") {
          await audioCtxRef.current.resume();
        }
        if (!isSourceConnectedRef.current && extractorRef.current) {
          extractorRef.current.connectAudioElement(audioRef.current, audioCtxRef.current);
          isSourceConnectedRef.current = true;
        }
        audioRef.current.currentTime = 0;
        await audioRef.current.play();
      }

      setIsPlaying(true);
      startRenderLoop();
    } catch (e) {
      console.error("Playback error:", e);
    }
  };

  const handlePause = () => {
    if (videoRef.current) videoRef.current.pause();
    if (audioRef.current) audioRef.current.pause();
    setIsPlaying(false);
  };

  if (!isOpen || !segment) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in p-4">
      <div className="bg-surface border border-border rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-surface-raised">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent/20 flex items-center justify-center text-lg">
              ⚡
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                Real-Time WebGL Neural Lip-Sync Preview
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-300">
                  Zero Render Latency
                </span>
              </h3>
              <p className="text-xs text-muted">
                Scene {segment.index + 1} • {segment.actionLoop || "state_idle"} • {segment.personaId || "ruby"}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              handlePause();
              onClose();
            }}
            className="text-muted hover:text-foreground text-sm p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-y-auto">
          {/* Canvas Video Stage */}
          <div className="relative rounded-xl overflow-hidden bg-black aspect-[9/16] max-h-[380px] mx-auto border border-border flex items-center justify-center shadow-lg">
            {/* Hidden Source Media */}
            <video
              ref={videoRef}
              src={loopVideoSrc}
              loop
              playsInline
              muted
              crossOrigin="anonymous"
              className="hidden"
            />
            {audioUrl && (
              <audio
                ref={audioRef}
                src={audioUrl}
                crossOrigin="anonymous"
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />
            )}

            {/* WebGL Canvas Output */}
            <canvas
              ref={canvasRef}
              width={540}
              height={960}
              className="w-full h-full object-contain"
            />

            {/* Live Telemetry Overlay */}
            <div className="absolute top-2 left-2 flex flex-col gap-1 pointer-events-none">
              <span className="text-[9px] font-mono bg-black/70 px-1.5 py-0.5 rounded text-emerald-400">
                {fps} FPS (WebGL 2.0)
              </span>
              <span className="text-[9px] font-mono bg-black/70 px-1.5 py-0.5 rounded text-cyan-400">
                Viseme: [{dominantViseme}]
              </span>
            </div>
          </div>

          {/* Controls & Script Info */}
          <div className="flex flex-col justify-between space-y-3">
            <div className="space-y-3">
              {/* Audio Model Selection */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-wider">
                    Neural Voice Engine
                  </label>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-surface border border-border text-muted">
                    Default: {defaultEngine.toUpperCase()}
                  </span>
                </div>
                <select
                  value={selectedEngine}
                  onChange={(e) => handleEngineChange(e.target.value)}
                  disabled={isSynthesizing || isNormalizing}
                  className="w-full text-xs font-semibold bg-surface border border-border rounded-lg px-2.5 py-1.5 text-foreground focus:border-accent focus:outline-none cursor-pointer"
                >
                  <option value="kokoro">Kokoro — Ultra-Fast (Realtime EN Default)</option>
                  <option value="piper">Piper ONNX — Low VRAM (Realtime ES Default)</option>
                  <option value="omni">OmniVoice (Omni)</option>
                  <option value="f5_tts">F5-TTS (Zero-Shot Diffusion)</option>
                  <option value="styletts2">StyleTTS2</option>
                  <option value="cosyvoice">CosyVoice</option>
                </select>
              </div>

              {/* Visual Subtitle Display */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-wider">
                    Visual Subtitles (On-Screen)
                  </label>
                  <span className="text-[9px] font-mono text-muted">Clean</span>
                </div>
                <div className="p-2 rounded-lg bg-surface-raised border border-border text-xs text-foreground font-medium leading-relaxed max-h-16 overflow-y-auto">
                  "{segment.text}"
                </div>
              </div>

              {/* Acoustic Spoken Script (Two-Tier) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1">
                    <span>🎙️ Spoken Text ({selectedEngine.toUpperCase()})</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleNormalizeSpokenText()}
                      disabled={isNormalizing || isSynthesizing}
                      className="text-[10px] font-bold px-2 py-0.5 rounded border border-purple-500/40 bg-purple-500/15 text-purple-300 hover:bg-purple-500/25 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
                      title="Reprocess spoken text with LLM for the chosen audio engine"
                    >
                      {isNormalizing ? (
                        <>
                          <span className="w-2 h-2 border border-purple-300 border-t-transparent rounded-full animate-spin" />
                          <span>Normalizing...</span>
                        </>
                      ) : (
                        <>
                          <span>✨</span>
                          <span>Normalize ({selectedEngine.toUpperCase()})</span>
                        </>
                      )}
                    </button>
                    {localSpokenText.trim() !== segment.text.trim() && (
                      <button
                        type="button"
                        onClick={() => setLocalSpokenText(segment.text)}
                        className="text-[10px] text-muted hover:text-foreground cursor-pointer"
                        title="Reset to visual subtitle text"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
                <textarea
                  value={localSpokenText}
                  onChange={(e) => setLocalSpokenText(e.target.value)}
                  placeholder="Spoken script with phonetic expansions..."
                  rows={2}
                  className="w-full p-2 text-xs font-mono bg-surface border border-purple-500/30 rounded-lg text-foreground resize-none focus:border-purple-400 focus:outline-none"
                />
              </div>

              {/* Viseme Meter */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted font-bold uppercase">Jaw Depression Metric</span>
                  <span className="font-mono text-accent">{(jawOpen * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full h-2 bg-surface-raised rounded-full overflow-hidden border border-border">
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-75"
                    style={{ width: `${Math.min(100, jawOpen * 100)}%` }}
                  />
                </div>
              </div>

              {/* Audio State */}
              <div className="p-2 rounded-lg bg-surface border border-border flex items-center justify-between text-xs">
                <span className="text-muted">Audio Status:</span>
                <span className="font-bold text-foreground">
                  {audioUrl ? `Audio Ready (${selectedEngine.toUpperCase()})` : "No Audio Generated"}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2 border-t border-border">
              {!isPlaying ? (
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={handlePlay}
                  disabled={isSynthesizing || isNormalizing}
                >
                  {isSynthesizing ? "Synthesizing Audio..." : "▶ Test Live WebGL Lip-Sync"}
                </Button>
              ) : (
                <Button variant="secondary" className="w-full" onClick={handlePause}>
                  ⏸ Pause
                </Button>
              )}

              {!audioUrl && (
                <Button
                  variant="secondary"
                  className="w-full text-xs"
                  onClick={handleSynthesizeTTS}
                  disabled={isSynthesizing || isNormalizing}
                >
                  {isSynthesizing
                    ? "Synthesizing..."
                    : `🎙️ Generate Scene TTS (${selectedEngine.toUpperCase()})`}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border bg-surface-raised flex items-center justify-between text-xs text-muted">
          <span>Oculus 15-Viseme Neural Shader • 60 FPS Client-Side GPU</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              handlePause();
              onClose();
            }}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
