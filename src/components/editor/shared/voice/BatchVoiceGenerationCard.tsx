/**
 * src/components/editor/shared/voice/BatchVoiceGenerationCard.tsx
 *
 * Batch Voice Generation & Audio Caching Panel for Commercial Video Ads.
 * Faithful port of the News Studio Voice Studio Batch Generation card.
 *
 * Features:
 * - Per-scene persona selector (overrides scene-level persona and voice settings)
 * - Real-time per-scene status feedback (pending ○, generating ▶, done ✓, cached ⚡, error ✗)
 * - Audition audio playback (▶ / ⏹) and scene cache clearing (✕)
 * - Smart audio cache detection: skips re-generating unchanged text/persona scenes
 * - Automatic ripple-shifted timeline duration synchronization
 */

"use client";

import React, { useState, useRef, useMemo } from "react";
import { AdScene } from "@/lib/types/ecommerce";
import { PERSONAS } from "@/lib/tts/personas";
import {
  synthesizeSceneVoice,
  calculateRippleShiftedScenes,
  computeAudioCacheKey,
  clearAudioCacheEntry,
  audioCacheStore,
  isVideoScene,
  getVideoSceneMediaUrl,
} from "@/lib/ecommerce/voiceSynthesisCalibrator";
import { Mic, RefreshCw, Play, Square, Loader2, CheckCircle2, XCircle, Circle, Trash2, ChevronDown, FileX, Film, Sparkles } from "lucide-react";

export type SceneAudioStatus = "pending" | "generating" | "done" | "cached" | "error";

export interface BatchVoiceGenerationCardProps {
  scenes: AdScene[];
  defaultPersonaId: string;
  selectedEngine: string;
  selectedModel: string;
  speechSpeed: number;
  pitchShift: number;
  language: string;
  isSpanish: boolean;
  disableCloningIfDifferentLanguage?: boolean;
  onUpdateScenePersona: (sceneIndex: number, personaId: string) => void;
  onBatchCalibrateComplete: (updatedScenes: AdScene[]) => void;
  onGenerateSceneAudio?: (
    sceneIndex: number,
    text: string,
    options: Record<string, unknown>
  ) => Promise<{ url: string; durationSeconds: number; durationFrames: number; cacheKey?: string }>;
  onClearSceneAudio?: (sceneIndex: number) => void;
  onDeleteSceneAudioAndCache?: (sceneIndex: number) => void | Promise<void>;
  onClearAllAudio?: () => void;
  onSelectScene?: (sceneIndex: number) => void;
  selectedSceneIndex?: number | null;
  defaultCollapsed?: boolean;
}

export const BatchVoiceGenerationCard: React.FC<BatchVoiceGenerationCardProps> = ({
  scenes,
  defaultPersonaId,
  selectedEngine,
  selectedModel,
  speechSpeed,
  pitchShift,
  language,
  isSpanish: _isSpanish,
  disableCloningIfDifferentLanguage = true,
  onUpdateScenePersona,
  onBatchCalibrateComplete,
  onGenerateSceneAudio,
  onClearSceneAudio,
  onDeleteSceneAudioAndCache,
  onClearAllAudio,
  onSelectScene,
  selectedSceneIndex,
  defaultCollapsed = true,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [runtimeStatuses, setRuntimeStatuses] = useState<Record<number, SceneAudioStatus>>({});
  const setSceneStatuses = setRuntimeStatuses;
  const [localAudioUrls, setLocalAudioUrls] = useState<Record<number, string>>({});
  const [isBatching, setIsBatching] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [playingSceneIndex, setPlayingSceneIndex] = useState<number | null>(null);
  const [purgingIndex, setPurgingIndex] = useState<number | null>(null);
  const cancelRef = useRef(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Derive scene statuses cleanly via useMemo without cascading render effects
  const sceneStatuses: Record<number, SceneAudioStatus> = useMemo(() => {
    const statuses: Record<number, SceneAudioStatus> = {};

    scenes.forEach((scene, idx) => {
      if (runtimeStatuses[idx] === "generating") {
        statuses[idx] = "generating";
        return;
      }

      // Check video scene first: skip neural cache check and recognize video audio
      const videoUrl = getVideoSceneMediaUrl(scene);
      if (isVideoScene(scene) && videoUrl) {
        if (scene.audioUrl) {
          statuses[idx] = runtimeStatuses[idx] === "done" ? "done" : "cached";
        } else {
          statuses[idx] = runtimeStatuses[idx] ?? "pending";
        }
        return;
      }

      const personaId =
        scene.presenterConfig?.personaId ||
        scene.presenter?.personaId ||
        defaultPersonaId;

      const scriptText = scene.spokenVoiceoverScript || scene.voiceoverScript || "";
      const expectedKey = computeAudioCacheKey(scriptText, {
        engine: selectedEngine,
        model: selectedModel,
        personaId,
        speed: speechSpeed,
        pitchShift,
        language,
        disableCloningIfDifferentLanguage,
      });

      if (runtimeStatuses[idx]) {
        statuses[idx] = runtimeStatuses[idx];
      } else if (scene.audioUrl && (scene.audioCacheKey === expectedKey || audioCacheStore.has(expectedKey))) {
        statuses[idx] = "cached";
      } else if (scene.audioUrl && !scene.audioCacheKey) {
        // Audio already exists from initial load
        statuses[idx] = "cached";
      } else {
        statuses[idx] = "pending";
      }
    });

    return statuses;
  }, [
    scenes,
    runtimeStatuses,
    defaultPersonaId,
    selectedEngine,
    selectedModel,
    speechSpeed,
    pitchShift,
    language,
    disableCloningIfDifferentLanguage,
  ]);

  // Audio Playback handler
  const handleTogglePlay = (idx: number, audioUrl?: string) => {
    if (!audioUrl) return;

    if (playingSceneIndex === idx) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
      setPlayingSceneIndex(null);
      return;
    }

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }

    const audio = new Audio(audioUrl);
    audioPlayerRef.current = audio;
    setPlayingSceneIndex(idx);

    audio.onended = () => {
      setPlayingSceneIndex(null);
      audioPlayerRef.current = null;
    };

    audio.onerror = () => {
      setPlayingSceneIndex(null);
      audioPlayerRef.current = null;
    };

    audio.play().catch(() => {
      setPlayingSceneIndex(null);
      audioPlayerRef.current = null;
    });
  };

  // 1. Delete Audio (Soft delete: removes audio assignment from scene, retains cached file in storage)
  const handleClearSceneAudio = (idx: number) => {
    const scene = scenes.find((s) => s.sceneIndex === idx) || (idx >= 0 && idx < scenes.length ? scenes[idx] : undefined);
    if (!scene) return;

    if (playingSceneIndex === idx && audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setPlayingSceneIndex(null);
    }

    setSceneStatuses((prev) => ({ ...prev, [idx]: "pending" }));
    setLocalAudioUrls((prev) => {
      const copy = { ...prev };
      delete copy[idx];
      return copy;
    });
    onClearSceneAudio?.(idx);
  };

  // 2. Delete Audio + Delete Cache (Hard delete: removes audio AND permanently purges physical file & memory cache)
  const handleDeleteSceneAudioAndCache = async (idx: number) => {
    const scene = scenes.find((s) => s.sceneIndex === idx) || (idx >= 0 && idx < scenes.length ? scenes[idx] : undefined);
    if (!scene) return;

    if (scene.audioCacheKey) {
      clearAudioCacheEntry(scene.audioCacheKey);
    }

    if (playingSceneIndex === idx && audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setPlayingSceneIndex(null);
    }

    setSceneStatuses((prev) => ({ ...prev, [idx]: "pending" }));
    setLocalAudioUrls((prev) => {
      const copy = { ...prev };
      delete copy[idx];
      return copy;
    });

    setPurgingIndex(idx);
    try {
      if (onDeleteSceneAudioAndCache) {
        await onDeleteSceneAudioAndCache(idx);
      } else {
        onClearSceneAudio?.(idx);
      }
    } finally {
      setPurgingIndex(null);
    }
  };

  // Clear Cache & generated audio for ALL scenes
  const handleClearAll = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setPlayingSceneIndex(null);
    }

    scenes.forEach((s) => {
      if (s.audioCacheKey) {
        clearAudioCacheEntry(s.audioCacheKey);
      }
    });

    const resetStatuses: Record<number, SceneAudioStatus> = {};
    scenes.forEach((_, idx) => {
      resetStatuses[idx] = "pending";
    });
    setSceneStatuses(resetStatuses);
    setLocalAudioUrls({});

    onClearAllAudio?.();
  };

  // Run sequential batch generation with cache skipping
  const handleRunBatch = async (forceRegenerateAll = false) => {
    if (scenes.length === 0 || isBatching) return;

    cancelRef.current = false;
    setIsBatching(true);
    setBatchProgress({ current: 0, total: scenes.length });

    let currentScenes = [...scenes];

    for (let i = 0; i < currentScenes.length; i++) {
      if (cancelRef.current) break;

      const scene = currentScenes[i];
      setBatchProgress({ current: i + 1, total: currentScenes.length });

      // CHECK AT THE TOP:
      // Skip audio synthesis for video scenes and just use the audio track of the video!
      const videoUrl = getVideoSceneMediaUrl(scene);
      if (isVideoScene(scene) && videoUrl) {
        const videoDurationSec = scene.audioDuration || (scene.durationFrames > 0 ? scene.durationFrames / 30 : 8.0);
        const videoDurationFrames = Math.max(240, scene.durationFrames > 0 ? scene.durationFrames : Math.round(videoDurationSec * 30));

        currentScenes = calculateRippleShiftedScenes(
          currentScenes,
          i,
          videoDurationFrames,
          videoUrl, // Use the video's own audio track
          videoDurationSec,
          `video::${videoUrl}`
        );

        setLocalAudioUrls((prev) => ({ ...prev, [i]: videoUrl }));
        setSceneStatuses((prev) => ({ ...prev, [i]: "done" }));

        // PROGRESSIVE UPDATE: Notify parent immediately
        onBatchCalibrateComplete([...currentScenes]);
        continue;
      }

      const scriptText = (scene.spokenVoiceoverScript || scene.voiceoverScript || "").trim();
      if (!scriptText) {
        continue;
      }

      const personaId =
        scene.presenterConfig?.personaId ||
        scene.presenter?.personaId ||
        defaultPersonaId;

      const sceneOptions = {
        engine: selectedEngine,
        model: selectedModel,
        personaId,
        speed: speechSpeed,
        pitchShift,
        language,
        disableCloningIfDifferentLanguage,
      };

      const expectedKey = computeAudioCacheKey(scriptText, sceneOptions);

      // Check if already cached
      const isAlreadyCached =
        !forceRegenerateAll &&
        scene.audioUrl &&
        scene.durationFrames > 0 &&
        (scene.audioCacheKey === expectedKey || audioCacheStore.has(expectedKey));

      if (isAlreadyCached) {
        setSceneStatuses((prev) => ({ ...prev, [i]: "cached" }));
        continue;
      }

      setSceneStatuses((prev) => ({ ...prev, [i]: "generating" }));
      const targetIdx = typeof scene.sceneIndex === "number" ? scene.sceneIndex : i;

      try {
        const result = onGenerateSceneAudio
          ? await onGenerateSceneAudio(targetIdx, scriptText, sceneOptions)
          : await synthesizeSceneVoice(scriptText, sceneOptions);

        currentScenes = calculateRippleShiftedScenes(
          currentScenes,
          i,
          result.durationFrames,
          result.url,
          result.durationSeconds,
          result.cacheKey
        );

        setLocalAudioUrls((prev) => ({ ...prev, [i]: result.url }));
        setSceneStatuses((prev) => ({ ...prev, [i]: "done" }));

        // PROGRESSIVE UPDATE: Notify parent immediately so this scene's audio and duration update without waiting for all scenes
        onBatchCalibrateComplete([...currentScenes]);
      } catch (err) {
        console.error(`[BatchVoice] Error generating audio for scene ${i + 1}:`, err);
        setSceneStatuses((prev) => ({ ...prev, [i]: "error" }));
      }
    }

    setIsBatching(false);
    setBatchProgress(null);
    onBatchCalibrateComplete([...currentScenes]);
  };

  const [isNormalizingAll, setIsNormalizingAll] = useState(false);

  const handleCancelBatch = () => {
    cancelRef.current = true;
    setIsBatching(false);
    setBatchProgress(null);
  };

  const handleRenormalizeAllSpokenTexts = async () => {
    if (scenes.length === 0 || isNormalizingAll) return;
    setIsNormalizingAll(true);

    try {
      const updatedScenes = [...scenes];
      let changed = false;

      for (let i = 0; i < updatedScenes.length; i++) {
        const sc = updatedScenes[i];
        const visualText = sc.voiceoverScript || sc.headline;
        if (!visualText || !visualText.trim()) continue;

        try {
          const res = await fetch("/api/tts/normalize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: visualText,
              engine: selectedEngine,
              language,
              mode: "ecommerce",
            }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data.spokenText) {
              updatedScenes[i] = {
                ...updatedScenes[i],
                spokenVoiceoverScript: data.spokenText,
              };
              changed = true;
            }
          }
        } catch (normErr) {
          console.error(`[BatchVoice] Error normalizing scene #${i + 1}:`, normErr);
        }
      }

      if (changed) {
        onBatchCalibrateComplete(updatedScenes);
      }
    } finally {
      setIsNormalizingAll(false);
    }
  };

  const cachedOrDoneCount = Object.values(sceneStatuses).filter(
    (s) => s === "cached" || s === "done"
  ).length;
  const hasErrors = Object.values(sceneStatuses).some((s) => s === "error");
  const allReady = cachedOrDoneCount === scenes.length && scenes.length > 0;
  const hasAnyAudio =
    scenes.some((s, idx) => Boolean(s.audioUrl || localAudioUrls[idx])) ||
    cachedOrDoneCount > 0;

  if (isCollapsed) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 backdrop-blur-md flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Mic className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                Batch Voice Studio
              </h4>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30 shrink-0">
                {cachedOrDoneCount}/{scenes.length} Ready ({Math.round((cachedOrDoneCount / Math.max(1, scenes.length)) * 100)}%)
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 truncate mt-0.5">
              Multi-scene speech calibration & automated duration synchronization
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {hasAnyAudio && onClearAllAudio && (
            <button
              type="button"
              disabled={isBatching}
              onClick={handleClearAll}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-500/30 bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-300 text-xs font-semibold transition-all cursor-pointer shadow-sm disabled:opacity-40"
              title="Clear all generated audio across all scenes"
            >
              <Trash2 className="h-3 w-3" />
              <span className="hidden sm:inline">Clear All</span>
            </button>
          )}

          <button
            type="button"
            disabled={isBatching || scenes.length === 0}
            onClick={() => handleRunBatch(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50"
          >
            {isBatching ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>{batchProgress ? `${batchProgress.current}/${batchProgress.total}` : "Synthesizing..."}</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3" />
                <span>Calibrate All</span>
              </>
            )}
          </button>

          <div className="h-4 w-px bg-zinc-800 shrink-0 mx-0.5" />

          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            aria-label="Expand batch voice panel"
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 text-zinc-400 hover:text-white transition-all cursor-pointer"
            title="Expand panel"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 backdrop-blur-md space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Mic className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              Batch Generation
            </h4>
            <p className="text-[11px] text-zinc-400">
              Per-scene voiceover synthesis & automated duration calibration
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isNormalizingAll || scenes.length === 0}
            onClick={handleRenormalizeAllSpokenTexts}
            className="text-[10px] font-medium px-2 py-1 rounded-lg border border-purple-500/40 text-purple-300 hover:text-white bg-purple-950/40 hover:bg-purple-900/60 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
            title={`Re-normalize all spoken voiceovers specifically for ${selectedEngine.toUpperCase()}`}
          >
            <Sparkles className="h-3 w-3 text-purple-400" />
            <span>{isNormalizingAll ? "Normalizing..." : `✨ Normalize (${selectedEngine})`}</span>
          </button>

          {hasAnyAudio && onClearAllAudio && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg border border-red-500/40 text-red-400 hover:text-red-300 bg-red-950/40 hover:bg-red-900/60 transition-all flex items-center gap-1 cursor-pointer"
              title="Clear all generated audio across all scenes"
            >
              <Trash2 className="h-3 w-3 text-red-400" />
              <span>Clear All</span>
            </button>
          )}

          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
            {cachedOrDoneCount}/{scenes.length} Ready ({Math.round((cachedOrDoneCount / Math.max(1, scenes.length)) * 100)}%)
          </span>

          <div className="h-4 w-px bg-zinc-800 shrink-0 mx-0.5" />

          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            aria-label="Collapse batch voice panel"
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 text-zinc-400 hover:text-white transition-all cursor-pointer"
            title="Collapse panel"
          >
            <ChevronDown className="h-4 w-4 rotate-180" />
          </button>
        </div>
      </div>

      {/* Scrollable Scene List */}
      <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
        {scenes.map((scene, idx) => {
          const sceneIdx = typeof scene.sceneIndex === "number" ? scene.sceneIndex : idx;
          const status = sceneStatuses[sceneIdx] ?? sceneStatuses[idx] ?? "pending";
          const isSelected = selectedSceneIndex === sceneIdx;
          const activePersonaId =
            scene.presenterConfig?.personaId ||
            scene.presenter?.personaId ||
            defaultPersonaId;

          const activeAudioUrl = scene.audioUrl || localAudioUrls[sceneIdx] || localAudioUrls[idx];
          const hasAudio = Boolean(activeAudioUrl);
          const isPlaying = playingSceneIndex === sceneIdx;

          return (
            <div
              key={scene.id || sceneIdx}
              onClick={() => onSelectScene?.(sceneIdx)}
              className={`flex items-center gap-2 py-2 px-2.5 rounded-lg border transition-all cursor-pointer group ${
                isSelected
                  ? "bg-zinc-800/80 border-emerald-500/50 ring-1 ring-emerald-500/20"
                  : "bg-zinc-900/50 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/80"
              }`}
            >
              {/* Status Icon */}
              <span
                className={`text-[11px] w-4 text-center shrink-0 flex items-center justify-center ${
                  status === "done"
                     ? "text-emerald-400"
                    : status === "cached"
                    ? "text-emerald-400/80"
                    : status === "generating"
                    ? "text-amber-400"
                    : status === "error"
                    ? "text-red-400"
                    : "text-zinc-600"
                }`}
              >
                {status === "done" ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : status === "cached" ? (
                  <span className="font-bold text-xs" title="Cached">⚡</span>
                ) : status === "generating" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />
                ) : status === "error" ? (
                  <XCircle className="h-3.5 w-3.5" />
                ) : (
                  <Circle className="h-3.5 w-3.5" />
                )}
              </span>

              {/* Scene Number & Text Snippet */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-zinc-300">
                    #{sceneIdx + 1}:
                  </span>
                  <span
                    className={`text-[11px] truncate ${
                      status === "generating" ? "text-white font-medium" : "text-zinc-400"
                    }`}
                    title={scene.voiceoverScript}
                  >
                    {scene.voiceoverScript?.slice(0, 32) || "Empty script..."}
                    {scene.voiceoverScript && scene.voiceoverScript.length > 32 ? "…" : ""}
                  </span>
                </div>
              </div>

              {/* Duration Tag if Calibrated */}
              {scene.audioDuration ? (
                <span className="text-[10px] font-mono text-emerald-400/90 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-500/20 shrink-0">
                  {scene.audioDuration.toFixed(1)}s ({scene.durationFrames}f)
                </span>
              ) : (
                <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded shrink-0">
                  {(scene.durationFrames / 30).toFixed(1)}s
                </span>
              )}

              {/* Per-Scene Persona Selector OR Native Video Audio Badge */}
              {isVideoScene(scene) ? (
                <span
                  className="w-28 text-[10px] bg-purple-950/60 border border-purple-500/30 rounded px-2 py-1 text-purple-300 font-semibold flex items-center justify-center gap-1 shrink-0"
                  title="Video scene: uses native video audio track (neural TTS synthesis skipped)"
                >
                  <Film className="h-3 w-3 text-purple-400 shrink-0" />
                  <span className="truncate">Video Audio</span>
                </span>
              ) : (
                <select
                  value={activePersonaId}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    e.stopPropagation();
                    onUpdateScenePersona(sceneIdx, e.target.value);
                    // Invalidate this scene's cached audio status since persona changed
                    setSceneStatuses((prev) => ({ ...prev, [sceneIdx]: "pending", [idx]: "pending" }));
                  }}
                  className="w-28 text-[10px] bg-zinc-950 border border-zinc-700/80 rounded px-1.5 py-1 text-zinc-200 focus:border-emerald-500 focus:outline-none cursor-pointer shrink-0"
                  title="Select persona for this scene"
                >
                  <optgroup label="Standard Personas">
                    {PERSONAS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              )}

              {/* Action Buttons: Audition Play, Delete Audio, and Delete + Delete Cache */}
              {(hasAudio || status === "cached") && (
                <div
                  className="flex items-center gap-1 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Audition Play/Stop */}
                  {hasAudio && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTogglePlay(sceneIdx, activeAudioUrl);
                      }}
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] transition-colors cursor-pointer ${
                        isPlaying
                          ? "bg-emerald-500 text-black shadow"
                          : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      }`}
                      title={isPlaying ? "Stop audio" : "Audition scene audio"}
                    >
                      {isPlaying ? (
                        <Square className="h-2.5 w-2.5 fill-current" />
                      ) : (
                        <Play className="h-2.5 w-2.5 fill-current ml-0.5" />
                      )}
                    </button>
                  )}

                  {/* Button 1: Delete Audio (Unlink from scene, keep cached file) */}
                  {hasAudio && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClearSceneAudio(sceneIdx);
                      }}
                      className="w-6 h-6 rounded border border-zinc-800 hover:border-red-500/40 bg-zinc-900/60 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 flex items-center justify-center text-xs transition-colors cursor-pointer"
                      title={`Delete audio for Scene #${sceneIdx + 1} (keeps cached file in storage)`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}

                  {/* Button 2: Delete Audio + Delete Cache (Purge physical file & memory cache) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSceneAudioAndCache(sceneIdx);
                    }}
                    disabled={purgingIndex === sceneIdx}
                    className="w-6 h-6 rounded border border-zinc-800 hover:border-amber-500/50 bg-zinc-900/60 hover:bg-amber-500/20 text-zinc-400 hover:text-amber-400 flex items-center justify-center text-xs transition-colors cursor-pointer disabled:opacity-50"
                    title={`Delete audio + delete cached file from storage for Scene #${sceneIdx + 1} (fixes corrupted/distorted audio)`}
                  >
                    {purgingIndex === sceneIdx ? (
                      <Loader2 className="h-3 w-3 animate-spin text-amber-400" />
                    ) : (
                      <FileX className="h-3 w-3 text-amber-400" />
                    )}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Batch Action Buttons */}
      <div className="flex gap-2 pt-1">
        {isBatching ? (
          <button
            type="button"
            onClick={handleCancelBatch}
            className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-red-950/40 hover:bg-red-900/50 text-red-300 border border-red-500/40 transition-colors flex items-center justify-center gap-1.5"
          >
            <span>✕ Cancel Batch</span>
            {batchProgress && (
              <span className="text-[10px] font-mono opacity-80">
                ({batchProgress.current}/{batchProgress.total})
              </span>
            )}
          </button>
        ) : (
          <>
            <button
              type="button"
              disabled={scenes.length === 0}
              onClick={() => handleRunBatch(allReady)}
              className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {allReady ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Re-generate All {scenes.length} Scenes</span>
                </>
              ) : cachedOrDoneCount > 0 ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Re-generate Missing ({scenes.length - cachedOrDoneCount})</span>
                </>
              ) : (
                <>
                  <Mic className="h-3.5 w-3.5" />
                  <span>Generate All {scenes.length} Scenes</span>
                </>
              )}
            </button>

            {hasAnyAudio && onClearAllAudio && (
              <button
                type="button"
                onClick={handleClearAll}
                className="py-2 px-3 rounded-lg text-xs font-semibold bg-red-950/40 hover:bg-red-900/50 text-red-300 border border-red-500/40 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                title="Clear all generated voiceovers across all scenes"
              >
                <Trash2 className="h-3.5 w-3.5 text-red-400" />
                <span>Clear All</span>
              </button>
            )}

            {hasErrors && (
              <button
                type="button"
                onClick={() => handleRunBatch(false)}
                className="py-2 px-3 rounded-lg text-xs font-semibold bg-red-950/40 hover:bg-red-900/50 text-red-300 border border-red-500/40 transition-colors flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Retry Failed</span>
              </button>
            )}
          </>
        )}
      </div>

      {/* Bottom Subtitle */}
      <p className="text-[10px] text-zinc-500 leading-tight">
        Audio is cached. Only re-generates scenes where text or params changed.
      </p>
    </div>
  );
};
