/**
 * NewsStudio — `useModernTts` React Hook
 * 
 * Modern hook for React / Next.js client components connected to Modern-TTS-Server (Port 8005).
 * Supports low-latency Piper ONNX streaming, F5-TTS, StyleTTS2, CosyVoice, and automatic fallback.
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  generateAudioWithModernTtsResult,
  checkModernTtsHealth,
  getTtsProfile,
  setTtsProfile,
  freeModernTtsMemory,
  ModernTtsOptions,
  ModernTtsHealth,
  ModernTtsResult,
  TtsProfileTier,
} from "./modernTtsClient";
import { TtsEngineType } from "./textPreprocessor";
import type { VoiceParams } from "./voicePresets";

export interface GenerationProgress {
  phase: string;
  stage: string;
  loaded: number;
  total: number;
  indeterminate: boolean;
}

export interface UseModernTtsState {
  isGenerating: boolean;
  isPlaying: boolean;
  isStreaming: boolean;
  serverOnline: boolean;
  modelStatus: "idle" | "loading" | "ready" | "error";
  loadPhase: string;
  downloadProgress: GenerationProgress;
  generatingIds: Set<string>;
  activeProfile: string;
  audioUrl: string | null;
  audioBuffer: ArrayBuffer | null;
  durationSeconds: number;
  latencyMs: number;
  usedEngine: TtsEngineType | null;
  isFallback: boolean;
  fallbackReason: string | null;
  error: string | null;
  health: ModernTtsHealth | null;
}

export interface GenerateAudioParams extends Partial<VoiceParams>, Partial<ModernTtsOptions> {
  bypassCache?: boolean;
  energy?: number;
  expressiveness?: number;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
}

export interface UseModernTtsReturn extends UseModernTtsState {
  synthesize: (text: string, referenceAudioPath?: string, options?: ModernTtsOptions) => Promise<ArrayBuffer | null>;
  synthesizeAndPlay: (text: string, referenceAudioPath?: string, options?: ModernTtsOptions) => Promise<void>;
  generateAudio: (id: string, text: string, personaId: string, params?: GenerateAudioParams, referenceAudioBlob?: Blob | string) => Promise<Blob | null>;
  previewAudio: (blob: Blob, speed?: number, pitchShift?: number) => void;
  cancelGeneration: () => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  checkHealth: () => Promise<ModernTtsHealth>;
  checkServerHealth: () => Promise<boolean>;
  setProfileTier: (tier: TtsProfileTier) => Promise<void>;
  startServer: () => Promise<void>;
  stopServer: () => Promise<void>;
  clearCache: () => Promise<void>;
  checkCacheEntry: (text?: string, params?: unknown) => Promise<Blob | null>;
  deleteCacheEntry: (id?: string, text?: string, params?: unknown) => Promise<void>;
  clearAudio: () => void;
}

export function useModernTts(initialOptions: ModernTtsOptions = {}): UseModernTtsReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [serverOnline, setServerOnline] = useState(true);
  const [modelStatus, setModelStatus] = useState<"idle" | "loading" | "ready" | "error">("ready");
  const [loadPhase] = useState("done");
  const [downloadProgress, setDownloadProgress] = useState<GenerationProgress>({
    phase: "ready",
    stage: "",
    loaded: 100,
    total: 100,
    indeterminate: false,
  });
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  const [activeProfile, setActiveProfile] = useState<string>("studio");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<ArrayBuffer | null>(null);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [latencyMs, setLatencyMs] = useState(0);
  const [usedEngine, setUsedEngine] = useState<TtsEngineType | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<ModernTtsHealth | null>(null);

  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const currentObjectUrlRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const checkHealthCallback = useCallback(async (): Promise<ModernTtsHealth> => {
    try {
      const h = await checkModernTtsHealth();
      if (isMountedRef.current) {
        setHealth(h);
        const online = h.status === "ok";
        setServerOnline(online);
        setModelStatus(online ? "ready" : "error");
      }
      return h;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      const h: ModernTtsHealth = { status: "offline", error: msg };
      if (isMountedRef.current) {
        setHealth(h);
        setServerOnline(false);
        setModelStatus("error");
      }
      return h;
    }
  }, []);

  const checkServerHealth = useCallback(async (): Promise<boolean> => {
    const h = await checkHealthCallback();
    return h.status === "ok";
  }, [checkHealthCallback]);

  // Clean up object URLs and audio on unmount & initial health check
  useEffect(() => {
    isMountedRef.current = true;
    let isCancelled = false;

    const init = async () => {
      await checkHealthCallback();
      try {
        const p = await getTtsProfile();
        if (!isCancelled && isMountedRef.current && p.profile) {
          setActiveProfile(p.profile);
        }
      } catch {}
    };

    void init();

    return () => {
      isCancelled = true;
      isMountedRef.current = false;
      if (currentObjectUrlRef.current) {
        URL.revokeObjectURL(currentObjectUrlRef.current);
      }
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current = null;
      }
    };
  }, [checkHealthCallback]);

  const clearAudio = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
    }
    if (currentObjectUrlRef.current) {
      URL.revokeObjectURL(currentObjectUrlRef.current);
      currentObjectUrlRef.current = null;
    }
    setAudioUrl(null);
    setAudioBuffer(null);
    setIsPlaying(false);
    setDurationSeconds(0);
    setError(null);
  }, []);

  const clearCache = useCallback(async () => {
    try {
      await freeModernTtsMemory();
    } catch {
      // ignore
    }
  }, []);

  const setProfileTier = useCallback(async (tier: TtsProfileTier) => {
    try {
      const res = await setTtsProfile(tier);
      if (isMountedRef.current) {
        setActiveProfile(res.profile);
      }
    } catch (e: unknown) {
      if (isMountedRef.current) {
        const msg = e instanceof Error ? e.message : "Failed to change memory profile";
        setError(msg);
      }
    }
  }, []);

  const startServer = useCallback(async () => {
    // Health poll
    await checkServerHealth();
  }, [checkServerHealth]);

  const stopServer = useCallback(async () => {
    try {
      await freeModernTtsMemory();
    } catch {
      // ignore
    }
  }, []);

  const checkCacheEntry = useCallback(async (): Promise<Blob | null> => {
    return null;
  }, []);

  const deleteCacheEntry = useCallback(async (): Promise<void> => {
    // No-op for Modern-TTS memory-managed pipeline
  }, []);

  const cancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    setIsStreaming(false);
    setGeneratingIds(new Set());
  }, []);

  const synthesize = useCallback(
    async (
      text: string,
      referenceAudioPath = "",
      options: ModernTtsOptions = {}
    ): Promise<ArrayBuffer | null> => {
      if (!text || !text.trim()) {
        setError("Text is empty");
        return null;
      }

      setIsGenerating(true);
      setError(null);
      const mergedOptions = { ...initialOptions, ...options };
      if (mergedOptions.engine === "piper") {
        setIsStreaming(true);
      }

      try {
        const result: ModernTtsResult = await generateAudioWithModernTtsResult(
          text,
          referenceAudioPath,
          mergedOptions
        );

        if (!isMountedRef.current) return result.audioBuffer;

        // Revoke prior URL
        if (currentObjectUrlRef.current) {
          URL.revokeObjectURL(currentObjectUrlRef.current);
        }

        const blob = new Blob([result.audioBuffer], { type: "audio/wav" });
        const newUrl = URL.createObjectURL(blob);
        currentObjectUrlRef.current = newUrl;

        setAudioUrl(newUrl);
        setAudioBuffer(result.audioBuffer);
        setLatencyMs(result.latencyMs);
        setUsedEngine(result.usedEngine);
        setIsFallback(result.isFallback);
        setFallbackReason(result.fallbackReason || null);

        // Preload audio to get exact duration
        const tempAudio = new Audio(newUrl);
        tempAudio.onloadedmetadata = () => {
          if (isMountedRef.current) {
            setDurationSeconds(tempAudio.duration || 0);
          }
        };

        return result.audioBuffer;
      } catch (err: unknown) {
        if (isMountedRef.current) {
          const msg = err instanceof Error ? err.message : "TTS synthesis failed";
          setError(msg);
        }
        return null;
      } finally {
        if (isMountedRef.current) {
          setIsGenerating(false);
          setIsStreaming(false);
        }
      }
    },
    [initialOptions]
  );

  const generateAudio = useCallback(
    async (
      id: string,
      text: string,
      personaId: string,
      params?: GenerateAudioParams,
      referenceAudioBlob?: Blob | string
    ): Promise<Blob | null> => {
      setGeneratingIds((prev) => new Set([...prev, id]));
      setDownloadProgress({
        phase: "generating",
        stage: `Synthesizing ${id}...`,
        loaded: 50,
        total: 100,
        indeterminate: true,
      });

      try {
        let refPath = personaId ? `${personaId}.wav` : "ruby.wav";
        if (typeof referenceAudioBlob === "string") {
          refPath = referenceAudioBlob;
        }

        const buf = await synthesize(text, refPath, {
          personaId,
          pitchShift: params?.pitchShift,
          speedFactor: params?.speed,
          engine: params?.engine || initialOptions.engine || "piper",
          enableFallback: true,
        });

        if (!buf) return null;

        setDownloadProgress({
          phase: "ready",
          stage: "Done",
          loaded: 100,
          total: 100,
          indeterminate: false,
        });

        return new Blob([buf], { type: "audio/wav" });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Audio generation failed";
        setError(msg);
        return null;
      } finally {
        setGeneratingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [synthesize, initialOptions.engine]
  );

  const previewAudio = useCallback((blob: Blob, speed = 1.0, pitchShift?: number) => {
    void pitchShift;
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.playbackRate = speed;
    audio.play().catch(() => {});
  }, []);

  const play = useCallback(() => {
    if (!audioUrl) return;

    if (!audioElementRef.current) {
      const audio = new Audio(audioUrl);
      audioElementRef.current = audio;

      audio.onplay = () => {
        if (isMountedRef.current) setIsPlaying(true);
      };
      audio.onpause = () => {
        if (isMountedRef.current) setIsPlaying(false);
      };
      audio.onended = () => {
        if (isMountedRef.current) setIsPlaying(false);
      };
      audio.onerror = () => {
        if (isMountedRef.current) {
          setIsPlaying(false);
          setError("Audio playback error");
        }
      };
    }

    audioElementRef.current.play().catch((err) => {
      if (isMountedRef.current) {
        setError(`Playback failed: ${err.message}`);
        setIsPlaying(false);
      }
    });
  }, [audioUrl]);

  const pause = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }
  }, []);

  const stop = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, []);

  const synthesizeAndPlay = useCallback(
    async (
      text: string,
      referenceAudioPath = "",
      options: ModernTtsOptions = {}
    ): Promise<void> => {
      const buf = await synthesize(text, referenceAudioPath, options);
      if (buf && currentObjectUrlRef.current) {
        if (audioElementRef.current) {
          audioElementRef.current.pause();
          audioElementRef.current = null;
        }

        const audio = new Audio(currentObjectUrlRef.current);
        audioElementRef.current = audio;

        audio.onplay = () => {
          if (isMountedRef.current) setIsPlaying(true);
        };
        audio.onpause = () => {
          if (isMountedRef.current) setIsPlaying(false);
        };
        audio.onended = () => {
          if (isMountedRef.current) setIsPlaying(false);
        };
        audio.onerror = () => {
          if (isMountedRef.current) {
            setIsPlaying(false);
            setError("Playback error");
          }
        };

        audio.play().catch((e) => {
          if (isMountedRef.current) setError(`Playback error: ${e.message}`);
        });
      }
    },
    [synthesize]
  );

  return {
    isGenerating,
    isPlaying,
    isStreaming,
    serverOnline,
    modelStatus,
    loadPhase,
    downloadProgress,
    generatingIds,
    activeProfile,
    audioUrl,
    audioBuffer,
    durationSeconds,
    latencyMs,
    usedEngine,
    isFallback,
    fallbackReason,
    error,
    health,
    synthesize,
    synthesizeAndPlay,
    generateAudio,
    previewAudio,
    cancelGeneration,
    play,
    pause,
    stop,
    checkHealth: checkHealthCallback,
    checkServerHealth,
    setProfileTier,
    startServer,
    stopServer,
    clearCache,
    checkCacheEntry,
    deleteCacheEntry,
    clearAudio,
  };
}
