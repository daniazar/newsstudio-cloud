"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Layers,
  Sparkles,
  Download,
  LayoutGrid,
  Columns,
  Send,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Flame,
  Check,
  Eye,
  EyeOff,
  Zap,
} from "lucide-react";
import { MotionJobResult, MotionModelSpec } from "@/lib/ai/modernMotionClient";
import { SendToStoryModal } from "./SendToStoryModal";

interface ModelCompareGridProps {
  results: MotionJobResult[];
  modelsMetadata: Record<string, MotionModelSpec>;
  referenceImageUrl?: string;
}

export function ModelCompareGrid({
  results,
  modelsMetadata,
}: ModelCompareGridProps) {
  const [viewMode, setViewMode] = useState<"grid" | "wipe">("grid");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(4.0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isLooping] = useState(true);
  const [zoomLevel, setZoomLevel] = useState<1 | 2 | 3>(1);
  const [showChromaKey, setShowChromaKey] = useState(false);
  const [showTelemetryHUD, setShowTelemetryHUD] = useState(false);

  // Forensic A/B Curtain Wipe state
  const [modelAId, setModelAId] = useState<string>(results[0]?.model_id || "wan-animate-2");
  const [modelBId, setModelBId] = useState<string>(results[1]?.model_id || results[0]?.model_id || "scail-2");
  const [splitPos, setSplitPos] = useState<number>(50); // 0 to 100%
  const [isDraggingWipe, setIsDraggingWipe] = useState<boolean>(false);
  const [showDiffHeatmap, setShowDiffHeatmap] = useState<boolean>(false);

  // Pipeline Integration State
  const [storyModalResult, setStoryModalResult] = useState<MotionJobResult | null>(null);
  const [vaultSavedIds, setVaultSavedIds] = useState<Set<string>>(new Set());

  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const canvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const wipeContainerRef = useRef<HTMLDivElement>(null);
  const diffCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Derived effective models for comparison (avoids setState in effect)
  const effectiveModelAId = results.some((r) => r.model_id === modelAId)
    ? modelAId
    : results[0]?.model_id || "wan-animate-2";
  const effectiveModelBId = results.some((r) => r.model_id === modelBId)
    ? modelBId
    : results[1]?.model_id || results[0]?.model_id || "scail-2";

  // Synchronize playback across all video elements
  const togglePlay = () => {
    const nextState = !isPlaying;
    setIsPlaying(nextState);

    videoRefs.current.forEach((video) => {
      if (nextState) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  };

  const handleSeek = useCallback((time: number) => {
    setCurrentTime(time);
    videoRefs.current.forEach((video) => {
      video.currentTime = time;
    });
  }, []);

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    videoRefs.current.forEach((video) => {
      video.playbackRate = rate;
    });
  };

  const restartPlayback = () => {
    handleSeek(0);
    if (!isPlaying) {
      togglePlay();
    }
  };

  // Precision frame-by-frame step
  const stepFrame = (direction: -1 | 1) => {
    if (isPlaying) {
      setIsPlaying(false);
      videoRefs.current.forEach((video) => video.pause());
    }
    const frameDuration = 1 / 30; // 30 FPS step
    const nextTime = Math.max(0, Math.min(duration || 4.0, currentTime + direction * frameDuration));
    handleSeek(nextTime);
  };

  // Primary time update ticker from first active video
  useEffect(() => {
    const firstVideo = videoRefs.current.values().next().value;
    if (!firstVideo) return;

    const onTimeUpdate = () => {
      setCurrentTime(firstVideo.currentTime);
      if (firstVideo.duration) setDuration(firstVideo.duration);
    };

    firstVideo.addEventListener("timeupdate", onTimeUpdate);
    return () => {
      firstVideo.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, [results]);

  // Draggable A/B Curtain Wipe mouse/touch handler
  const handleWipeMove = useCallback(
    (clientX: number) => {
      if (!wipeContainerRef.current) return;
      const rect = wipeContainerRef.current.getBoundingClientRect();
      const pos = ((clientX - rect.left) / rect.width) * 100;
      setSplitPos(Math.max(2, Math.min(98, pos)));
    },
    []
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isDraggingWipe) handleWipeMove(e.clientX);
    };
    const onMouseUp = () => {
      if (isDraggingWipe) setIsDraggingWipe(false);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (isDraggingWipe && e.touches[0]) handleWipeMove(e.touches[0].clientX);
    };
    const onTouchEnd = () => {
      if (isDraggingWipe) setIsDraggingWipe(false);
    };

    if (isDraggingWipe) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
      window.addEventListener("touchmove", onTouchMove);
      window.addEventListener("touchend", onTouchEnd);
    }
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [isDraggingWipe, handleWipeMove]);

  // Real-time canvas chroma key and pixel diff compositor loop
  useEffect(() => {
    const renderCompositorFrame = () => {
      // 1. Grid Chroma Key Pass
      if (showChromaKey && viewMode === "grid") {
        results.forEach((res) => {
          const video = videoRefs.current.get(res.job_id);
          const canvas = canvasRefs.current.get(res.job_id);
          if (!video || !canvas || video.readyState < 2) return;

          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) return;

          canvas.width = video.videoWidth || 720;
          canvas.height = video.videoHeight || 1280;

          // Virtual studio backdrop
          ctx.fillStyle = "#0a0f18";
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imgData.data;

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            if (g > 80 && g > r * 1.25 && g > b * 1.25) {
              data[i + 3] = 0;
            } else if (g > 60 && g > r * 1.1) {
              data[i + 1] = (r + b) / 2;
            }
          }
          ctx.putImageData(imgData, 0, 0);
        });
      }

      // 2. A/B Difference Heatmap Pass
      if (viewMode === "wipe" && showDiffHeatmap && diffCanvasRef.current) {
        const videoA = Array.from(videoRefs.current.entries()).find(([k]) =>
          results.some((r) => r.job_id === k && r.model_id === effectiveModelAId)
        )?.[1];
        const videoB = Array.from(videoRefs.current.entries()).find(([k]) =>
          results.some((r) => r.job_id === k && r.model_id === effectiveModelBId)
        )?.[1];

        if (videoA && videoB && videoA.readyState >= 2 && videoB.readyState >= 2) {
          const diffCanvas = diffCanvasRef.current;
          const ctx = diffCanvas.getContext("2d", { willReadFrequently: true });
          if (ctx) {
            const w = 360;
            const h = 640;
            diffCanvas.width = w;
            diffCanvas.height = h;

            // Offscreen draw
            const offA = document.createElement("canvas");
            offA.width = w;
            offA.height = h;
            const ctxA = offA.getContext("2d", { willReadFrequently: true });

            const offB = document.createElement("canvas");
            offB.width = w;
            offB.height = h;
            const ctxB = offB.getContext("2d", { willReadFrequently: true });

            if (ctxA && ctxB) {
              ctxA.drawImage(videoA, 0, 0, w, h);
              ctxB.drawImage(videoB, 0, 0, w, h);

              const dataA = ctxA.getImageData(0, 0, w, h).data;
              const dataB = ctxB.getImageData(0, 0, w, h).data;
              const diffImg = ctx.createImageData(w, h);
              const diffData = diffImg.data;

              for (let i = 0; i < dataA.length; i += 4) {
                const dr = Math.abs(dataA[i] - dataB[i]);
                const dg = Math.abs(dataA[i + 1] - dataB[i + 1]);
                const db = Math.abs(dataA[i + 2] - dataB[i + 2]);
                const totalDiff = (dr + dg + db) / 3;

                if (totalDiff > 18) {
                  // High difference: neon magenta/cyan intensity map
                  diffData[i] = Math.min(255, totalDiff * 3);     // Red
                  diffData[i + 1] = Math.max(0, 255 - totalDiff * 2); // Green
                  diffData[i + 2] = 255;                          // Blue
                  diffData[i + 3] = 220;
                } else {
                  // Low difference: subtle dark backing
                  diffData[i] = 10;
                  diffData[i + 1] = 15;
                  diffData[i + 2] = 25;
                  diffData[i + 3] = 200;
                }
              }
              ctx.putImageData(diffImg, 0, 0);
            }
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(renderCompositorFrame);
    };

    animationFrameRef.current = requestAnimationFrame(renderCompositorFrame);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [showChromaKey, viewMode, showDiffHeatmap, results, effectiveModelAId, effectiveModelBId]);

  const handleSaveToVault = (res: MotionJobResult) => {
    setVaultSavedIds((prev) => new Set(prev).add(res.job_id));
    setTimeout(() => {
      setVaultSavedIds((prev) => {
        const next = new Set(prev);
        next.delete(res.job_id);
        return next;
      });
    }, 3000);
  };

  if (results.length === 0) {
    return (
      <div className="bg-surface-elevated/50 border border-border/80 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
          <Sparkles className="w-6 h-6 animate-pulse" />
        </div>
        <h4 className="text-sm font-bold text-foreground mb-1">No Model Benchmark Run Yet</h4>
        <p className="text-xs text-muted max-w-md">
          Select an anchor chroma photo and driving motion above, choose which models to evaluate, and click &quot;Run Comparative Benchmark&quot;.
        </p>
      </div>
    );
  }

  const resultA = results.find((r) => r.model_id === effectiveModelAId) || results[0];
  const resultB = results.find((r) => r.model_id === effectiveModelBId) || results[1] || results[0];

  const gridColsClass =
    results.length === 1
      ? "grid-cols-1 max-w-sm mx-auto"
      : results.length === 2
      ? "grid-cols-1 sm:grid-cols-2"
      : results.length === 3
      ? "grid-cols-1 sm:grid-cols-3"
      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

  return (
    <div className="bg-surface-elevated/80 border border-border/80 rounded-2xl p-5 shadow-2xl backdrop-blur-md space-y-4">
      {/* Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          {/* Synchronized Play/Pause */}
          <button
            onClick={togglePlay}
            className="w-9 h-9 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center font-bold shadow-lg shadow-emerald-500/20 transition-transform active:scale-95 cursor-pointer"
            title={isPlaying ? "Pause" : "Play Synchronized"}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>

          {/* Restart */}
          <button
            onClick={restartPlayback}
            className="w-9 h-9 rounded-xl bg-surface border border-border hover:bg-white/10 text-muted hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
            title="Restart to Beginning"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Frame-by-Frame Stepper */}
          <div className="flex items-center rounded-xl bg-surface border border-border p-0.5 text-[11px] font-mono">
            <button
              onClick={() => stepFrame(-1)}
              className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-white/5 transition-colors cursor-pointer"
              title="Previous Frame (1/30s)"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 text-[10px] text-muted">FRAME</span>
            <button
              onClick={() => stepFrame(1)}
              className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-white/5 transition-colors cursor-pointer"
              title="Next Frame (1/30s)"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Speed Selectors */}
          <div className="flex items-center rounded-xl bg-surface border border-border p-0.5 text-[11px] font-mono font-bold">
            {[0.5, 1.0, 1.5].map((rate) => (
              <button
                key={rate}
                onClick={() => handleSpeedChange(rate)}
                className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                  playbackRate === rate ? "bg-emerald-500/20 text-emerald-300 font-bold" : "text-muted hover:text-foreground"
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>

          <span className="text-xs font-mono text-muted pl-2">
            {currentTime.toFixed(2)}s / {duration.toFixed(2)}s
          </span>
        </div>

        {/* View Mode & Inspection Tools */}
        <div className="flex items-center gap-2">
          {/* View Mode Switcher */}
          <div className="flex items-center rounded-xl bg-surface border border-border p-0.5 text-xs font-semibold">
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                viewMode === "grid"
                  ? "bg-emerald-500/20 text-emerald-300 shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grid View</span>
            </button>
            <button
              onClick={() => setViewMode("wipe")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                viewMode === "wipe"
                  ? "bg-purple-500/20 text-purple-300 shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>A/B Curtain Wipe</span>
            </button>
          </div>

          {/* Mode-specific Inspection Controls */}
          {viewMode === "grid" ? (
            <>
              {/* Chroma Key Toggle */}
              <button
                onClick={() => setShowChromaKey(!showChromaKey)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  showChromaKey
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm"
                    : "bg-surface border-border text-muted hover:text-foreground"
                }`}
                title="Toggle real-time green screen removal to inspect edge bleed"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{showChromaKey ? "Keyed Backdrop ON" : "Raw Chroma"}</span>
              </button>

              {/* Zoom Level */}
              <div className="flex items-center rounded-xl bg-surface border border-border p-0.5 text-[11px] font-mono font-bold">
                {([1, 2, 3] as const).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setZoomLevel(lvl)}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      zoomLevel === lvl ? "bg-sky-500/20 text-sky-300" : "text-muted hover:text-foreground"
                    }`}
                    title={`Zoom ${lvl}x to inspect hand & finger articulation`}
                  >
                    {lvl}x
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              {/* Pixel Difference Heatmap Toggle */}
              <button
                onClick={() => setShowDiffHeatmap(!showDiffHeatmap)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  showDiffHeatmap
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm"
                    : "bg-surface border-border text-muted hover:text-foreground"
                }`}
                title="Visualize mathematical pixel difference |A - B| to expose jitter and distortion"
              >
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                <span>{showDiffHeatmap ? "Diff Heatmap ON" : "Diff Heatmap"}</span>
              </button>
            </>
          )}

          {/* Telemetry Overlays Toggle */}
          <button
            onClick={() => setShowTelemetryHUD(!showTelemetryHUD)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              showTelemetryHUD
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm"
                : "bg-surface border-border text-muted hover:text-foreground"
            }`}
            title="Toggle telemetry badges, optimization tags, and simulation notices on top of video"
          >
            {showTelemetryHUD ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showTelemetryHUD ? "Hide Video Text" : "Show Video Text"}</span>
          </button>
        </div>
      </div>

      {/* Synchronized Timeline Scrubber */}
      <div className="relative flex items-center gap-3">
        <input
          type="range"
          min="0"
          max={duration || 4.0}
          step="0.01"
          value={currentTime}
          onChange={(e) => handleSeek(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-surface-overlay rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none"
        />
      </div>

      {/* ========================================================= */}
      {/* MODE 1: FORENSIC A/B CURTAIN WIPE & DIFFERENCE HEATMAP */}
      {/* ========================================================= */}
      {viewMode === "wipe" ? (
        <div className="space-y-4">
          {/* Model Selectors Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-surface rounded-xl border border-border/60">
            {/* Model A Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                MODEL A (LEFT)
              </span>
              <select
                value={effectiveModelAId}
                onChange={(e) => setModelAId(e.target.value)}
                className="flex-1 bg-surface-elevated border border-border/80 rounded-lg px-2.5 py-1 text-xs text-foreground focus:border-emerald-500 focus:outline-none"
              >
                {results.map((r) => (
                  <option key={r.model_id} value={r.model_id}>
                    {r.model_name} ({r.resolution})
                  </option>
                ))}
              </select>
            </div>

            {/* Model B Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                MODEL B (RIGHT)
              </span>
              <select
                value={effectiveModelBId}
                onChange={(e) => setModelBId(e.target.value)}
                className="flex-1 bg-surface-elevated border border-border/80 rounded-lg px-2.5 py-1 text-xs text-foreground focus:border-purple-500 focus:outline-none"
              >
                {results.map((r) => (
                  <option key={r.model_id} value={r.model_id}>
                    {r.model_name} ({r.resolution})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Unified Curtain Viewport */}
          <div className="flex justify-center">
            <div
              ref={wipeContainerRef}
              onMouseDown={() => setIsDraggingWipe(true)}
              onTouchStart={() => setIsDraggingWipe(true)}
              className="relative w-full max-w-md aspect-[9/16] bg-black rounded-2xl overflow-hidden border border-border/80 shadow-2xl select-none cursor-ew-resize"
            >
              {/* Layer B (Background / Right side) */}
              <video
                ref={(el) => {
                  if (el && resultB) videoRefs.current.set(resultB.job_id, el);
                }}
                src={resultB?.output_url ? `${resultB.output_url}?t=${resultB.job_id}` : undefined}
                loop={isLooping}
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              />

              {/* Layer A (Foreground / Left side with clip-path wipe) */}
              <div
                className="absolute inset-0 overflow-hidden pointer-events-none"
                style={{ clipPath: `inset(0 ${100 - splitPos}% 0 0)` }}
              >
                <video
                  ref={(el) => {
                    if (el && resultA) videoRefs.current.set(resultA.job_id, el);
                  }}
                  src={resultA?.output_url ? `${resultA.output_url}?t=${resultA.job_id}` : undefined}
                  loop={isLooping}
                  muted
                  playsInline
                  className="w-full h-full object-cover pointer-events-none"
                />
              </div>

              {/* Difference Heatmap Overlay (if enabled) */}
              {showDiffHeatmap && (
                <canvas
                  ref={diffCanvasRef}
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none mix-blend-screen opacity-90"
                />
              )}

              {/* Draggable Divider Line */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_12px_rgba(255,255,255,0.8)] flex items-center justify-center pointer-events-none z-20"
                style={{ left: `${splitPos}%`, transform: "translateX(-50%)" }}
              >
                <div className="w-7 h-7 rounded-full bg-white text-black text-[9px] font-bold flex items-center justify-center shadow-lg border border-black/20">
                  ↔
                </div>
              </div>

              {/* Top Labels */}
              <div className="absolute top-3 left-3 z-30 pointer-events-none">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-black/80 backdrop-blur text-emerald-400 border border-emerald-500/40">
                  {resultA?.model_name} ({splitPos.toFixed(0)}%)
                </span>
              </div>
              <div className="absolute top-3 right-3 z-30 pointer-events-none">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-black/80 backdrop-blur text-purple-400 border border-purple-500/40">
                  {resultB?.model_name} ({(100 - splitPos).toFixed(0)}%)
                </span>
              </div>

              {/* Bottom Telemetry Bar (Toggled with showTelemetryHUD) */}
              {showTelemetryHUD && (
                <div className="absolute bottom-3 inset-x-3 flex items-center justify-between pointer-events-none z-30 text-[9px] font-mono">
                  <span className="px-2 py-0.5 rounded bg-black/70 backdrop-blur text-white/80 border border-white/10 flex items-center gap-1.5 flex-wrap">
                    <span>A: {resultA?.inference_time_sec}s • {resultA?.fps}fps</span>
                    {resultA?.is_distilled && (
                      <span className="text-amber-300 font-bold">
                        • ⚡ Distilled ({resultA.distillation_steps || 4} steps)
                      </span>
                    )}
                    {resultA?.guidance_cache?.hit && (
                      <span className="text-amber-300">
                        • ⚡ {resultA.guidance_cache.latency_ms ?? 0}ms loop
                      </span>
                    )}
                    {resultA?.persona_cache?.hit && (
                      <span className="text-emerald-300">
                        • ⚡ {resultA.persona_cache.latency_ms ?? 0}ms anchor
                      </span>
                    )}
                    {resultA?.hardware_encoder && (
                      <span className="text-sky-300">
                        • ⚡ {resultA.hardware_encoder === "h264_nvenc" ? "NVENC" : "CPU"} ({resultA.mux_time_ms ?? 0}ms)
                      </span>
                    )}
                    {resultA?.temporal_flow?.active && (
                      <span className="text-teal-300">
                        • ⚡ Flow {resultA.temporal_flow.compute_reduction_pct ?? 50}%
                      </span>
                    )}
                    {resultA?.pyramidal_cascade?.active && (
                      <span className="text-indigo-300">
                        • ⚡ Cascade -{resultA.pyramidal_cascade.token_savings_pct ?? 75}%
                      </span>
                    )}
                    {resultA?.silence_sieve?.active && (
                      <span className="text-emerald-300">
                        • ⚡ Silence -{resultA.silence_sieve.compute_saved_pct ?? 25}%
                      </span>
                    )}
                    {resultA?.sliding_kv?.active && (
                      <span className="text-cyan-300">
                        • ⚡ KV {resultA.sliding_kv.kv_vram_mb ?? 32.8}MB
                      </span>
                    )}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-black/70 backdrop-blur text-white/80 border border-white/10 flex items-center gap-1.5 flex-wrap">
                    <span>B: {resultB?.inference_time_sec}s • {resultB?.fps}fps</span>
                    {resultB?.is_distilled && (
                      <span className="text-amber-300 font-bold">
                        • ⚡ Distilled ({resultB.distillation_steps || 4} steps)
                      </span>
                    )}
                    {resultB?.guidance_cache?.hit && (
                      <span className="text-amber-300">
                        • ⚡ {resultB.guidance_cache.latency_ms ?? 0}ms loop
                      </span>
                    )}
                    {resultB?.persona_cache?.hit && (
                      <span className="text-emerald-300">
                        • ⚡ {resultB.persona_cache.latency_ms ?? 0}ms anchor
                      </span>
                    )}
                    {resultB?.hardware_encoder && (
                      <span className="text-sky-300">
                        • ⚡ {resultB.hardware_encoder === "h264_nvenc" ? "NVENC" : "CPU"} ({resultB.mux_time_ms ?? 0}ms)
                      </span>
                    )}
                    {resultB?.temporal_flow?.active && (
                      <span className="text-teal-300">
                        • ⚡ Flow {resultB.temporal_flow.compute_reduction_pct ?? 50}%
                      </span>
                    )}
                    {resultB?.pyramidal_cascade?.active && (
                      <span className="text-indigo-300">
                        • ⚡ Cascade -{resultB.pyramidal_cascade.token_savings_pct ?? 75}%
                      </span>
                    )}
                    {resultB?.silence_sieve?.active && (
                      <span className="text-emerald-300">
                        • ⚡ Silence -{resultB.silence_sieve.compute_saved_pct ?? 25}%
                      </span>
                    )}
                    {resultB?.sliding_kv?.active && (
                      <span className="text-cyan-300">
                        • ⚡ KV {resultB.sliding_kv.kv_vram_mb ?? 32.8}MB
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Row for A and B Models */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto pt-2">
            <button
              onClick={() => setStoryModalResult(resultA)}
              className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Use Model A in Story</span>
            </button>

            <button
              onClick={() => setStoryModalResult(resultB)}
              className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-bold transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Use Model B in Story</span>
            </button>
          </div>
        </div>
      ) : (
        /* ========================================================= */
        /* MODE 2: MULTI-MODEL SYNCHRONIZED GRID MATRIX */
        /* ========================================================= */
        <div className={`grid gap-4 ${gridColsClass}`}>
          {results.map((res) => {
            const meta = modelsMetadata[res.model_id];
            const isLead = res.model_id === "wan-animate-2" || res.model_id === "scail-2";
            const isSaved = vaultSavedIds.has(res.job_id);

            return (
              <div
                key={res.job_id}
                className="group relative bg-surface/90 border border-border/80 hover:border-emerald-500/40 rounded-2xl overflow-hidden flex flex-col shadow-lg transition-all"
              >
                {/* Model Card Header */}
                <div className="p-3 bg-surface-elevated/90 border-b border-border/60 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-foreground">{res.model_name}</h4>
                      {isLead && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          TIER S
                        </span>
                      )}
                      {res.is_distilled && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-0.5">
                          <Zap className="w-2.5 h-2.5 fill-amber-300" />
                          <span>DISTILLED</span>
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted truncate block max-w-[180px]">
                      {meta?.architecture?.split("(")[0] || "Neural Diffusion"}
                    </span>
                  </div>

                  {/* Actions (Story, Vault, Download, Toggle HUD) */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setShowTelemetryHUD(!showTelemetryHUD)}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        showTelemetryHUD
                          ? "bg-amber-500/20 text-amber-300"
                          : "bg-white/5 hover:bg-white/10 text-muted hover:text-foreground"
                      }`}
                      title={showTelemetryHUD ? "Hide Video Text Overlays" : "Show Video Text Overlays"}
                    >
                      {showTelemetryHUD ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      onClick={() => setStoryModalResult(res)}
                      className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors cursor-pointer"
                      title="Send directly to a Newsroom Story Scene"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleSaveToVault(res)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-muted hover:text-amber-400 transition-colors cursor-pointer"
                      title="Save to Asset Vault"
                    >
                      {isSaved ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Bookmark className="w-3.5 h-3.5" />}
                    </button>

                    <a
                      href={res.output_url}
                      download={res.filename}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-muted hover:text-emerald-400 transition-colors cursor-pointer"
                      title="Download MP4"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {/* Video Display Container */}
                <div className="relative aspect-[9/16] bg-black overflow-hidden flex items-center justify-center">
                  {/* Raw Video */}
                  <video
                    ref={(el) => {
                      if (el) videoRefs.current.set(res.job_id, el);
                      else videoRefs.current.delete(res.job_id);
                    }}
                    src={res.output_url ? `${res.output_url}?t=${res.job_id}` : undefined}
                    loop={isLooping}
                    muted
                    playsInline
                    className={`w-full h-full object-cover transition-transform duration-200 ${
                      showChromaKey ? "hidden" : "block"
                    }`}
                    style={{
                      transform: zoomLevel > 1 ? `scale(${zoomLevel})` : undefined,
                      transformOrigin: "center 40%",
                    }}
                  />

                  {/* Chroma Canvas Compositor */}
                  <canvas
                    ref={(el) => {
                      if (el) canvasRefs.current.set(res.job_id, el);
                      else canvasRefs.current.delete(res.job_id);
                    }}
                    className={`w-full h-full object-cover transition-transform duration-200 ${
                      showChromaKey ? "block" : "hidden"
                    }`}
                    style={{
                      transform: zoomLevel > 1 ? `scale(${zoomLevel})` : undefined,
                      transformOrigin: "center 40%",
                    }}
                  />

                  {/* Telemetry Overlays (Toggled via HUD Control) */}
                  {showTelemetryHUD && (
                    <div className="absolute top-2 left-2 right-2 flex flex-col gap-1 pointer-events-none z-10">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/75 backdrop-blur text-emerald-400 border border-white/10 shadow">
                          {res.fps} FPS • {res.resolution}
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/75 backdrop-blur text-sky-300 border border-white/10 shadow">
                          Inference: {res.inference_time_sec}s
                        </span>
                        {res.instant_cache_hit && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/30 backdrop-blur text-emerald-200 border border-emerald-400/40 shadow font-bold">
                            ⚡ Instant Memo
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col gap-0.5 max-h-48 overflow-y-auto pr-1 scrollbar-none pointer-events-auto">
                        {res.gpu_telemetry?.executed && (
                          <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/80 backdrop-blur text-emerald-300 border border-emerald-500/40 flex items-center gap-1 font-bold">
                            ⚡ GPU: {res.gpu_telemetry.device} ({res.gpu_telemetry.compute_time_ms}ms • Peak {res.gpu_telemetry.peak_mb}MB)
                          </span>
                        )}
                        {res.is_distilled && (
                          <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-amber-950/70 backdrop-blur text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            ⚡ Distilled: {res.distillation_technique || "Fast Model"} {res.distillation_speedup ? `(${res.distillation_speedup} speedup)` : `(${res.distillation_steps || 4} steps)`}
                          </span>
                        )}
                        {res.guidance_cache?.hit && (
                          <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-black/70 backdrop-blur text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            ⚡ Guidance: {res.guidance_cache.latency_ms ?? 0}ms ({res.guidance_cache.cache_type})
                          </span>
                        )}
                        {res.persona_cache?.hit && (
                          <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-black/70 backdrop-blur text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            ⚡ Anchor: {res.persona_cache.latency_ms ?? 0}ms ({res.persona_cache.persona_id})
                          </span>
                        )}
                        {res.hardware_encoder && (
                          <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-black/70 backdrop-blur text-sky-300 border border-sky-500/30 flex items-center gap-1">
                            ⚡ {res.hardware_encoder === "h264_nvenc" ? "NVENC Zero-Copy" : "libx264"} ({res.mux_time_ms ?? 0}ms)
                          </span>
                        )}
                        {res.one_pass_cfg?.active && (
                          <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-sky-950/70 backdrop-blur text-sky-300 border border-sky-500/30 flex items-center gap-1">
                            ⚡ 1-Pass CFG ({res.one_pass_cfg.flops_saved_pct ?? 44}% Saved)
                          </span>
                        )}
                        {res.static_arena?.active && (
                          <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-purple-950/70 backdrop-blur text-purple-300 border border-purple-500/30 flex items-center gap-1">
                            ⚡ CUDA Arena (0 Realloc)
                          </span>
                        )}
                        {res.tiled_vae?.active && (
                          <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-amber-950/70 backdrop-blur text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            ⚡ Tiled VAE ({res.tiled_vae.peak_vram_mb ?? 1850}MB)
                          </span>
                        )}
                        {res.temporal_flow?.active && (
                          <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-teal-950/70 backdrop-blur text-teal-300 border border-teal-500/30 flex items-center gap-1">
                            ⚡ Flow Infill ({res.temporal_flow.compute_reduction_pct ?? 50}% Saved)
                          </span>
                        )}
                        {res.pyramidal_cascade?.active && (
                          <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-indigo-950/70 backdrop-blur text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                            ⚡ Cascade ({res.pyramidal_cascade.token_savings_pct ?? 75}% Tokens)
                          </span>
                        )}
                        {res.acoustic_simhash?.active && (
                          <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-rose-950/70 backdrop-blur text-rose-300 border border-rose-500/30 flex items-center gap-1">
                            ⚡ SimHash ({res.acoustic_simhash.encoder_bypassed ? "0ms Bypass" : "Cached"})
                          </span>
                        )}
                        {res.triple_buffer?.active && (
                          <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/70 backdrop-blur text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            ⚡ 3-Stage Buffer ({res.triple_buffer.throughput_boost_factor ?? 1.45}x)
                          </span>
                        )}
                        {res.silence_sieve?.active && (
                          <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/70 backdrop-blur text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            ⚡ Silence Sieve ({res.silence_sieve.compute_saved_pct ?? 25}% Saved)
                          </span>
                        )}
                        {res.sliding_kv?.active && (
                          <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/70 backdrop-blur text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                            ⚡ Sliding INT8 KV ({res.sliding_kv.kv_vram_mb ?? 32.8}MB)
                          </span>
                        )}
                        {res.tps_warp?.active && (
                          <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-fuchsia-950/70 backdrop-blur text-fuchsia-300 border border-fuchsia-500/30 flex items-center gap-1">
                            ⚡ TPS Bi-Harmonic (C2)
                          </span>
                        )}
                        {res.zerocopy_streaming?.active && (
                          <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-yellow-950/70 backdrop-blur text-yellow-300 border border-yellow-500/30 flex items-center gap-1">
                            ⚡ Zero-Copy Stream (-72ms)
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Simulation Mode Notice (Only shown when HUD is ON) */}
                  {showTelemetryHUD && res.engine_mode === "simulated_preview" && (
                    <div className="absolute bottom-2 inset-x-2 bg-amber-500/20 border border-amber-500/40 backdrop-blur-md rounded-xl p-1.5 text-center pointer-events-none z-10">
                      <span className="text-[9px] font-bold text-amber-300 uppercase tracking-wider block">
                        Preview Pipeline Simulation
                      </span>
                      <span className="text-[8px] text-amber-200/80">Weights not installed locally • Simulated Preview</span>
                    </div>
                  )}
                </div>

                {/* Model Strengths Pill Footer */}
                <div className="p-2.5 bg-surface-elevated/40 border-t border-border/40 text-[10px] space-y-1">
                  <p className="text-muted line-clamp-2 italic leading-tight">
                    {meta?.agent_verdict || "High-fidelity human body retargeting."}
                  </p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {meta?.strengths?.slice(0, 2).map((s, i) => (
                      <span
                        key={i}
                        className="text-[8px] px-1.5 py-0.2 rounded bg-white/5 border border-white/10 text-subtle truncate"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Story Assignment Modal */}
      <SendToStoryModal
        isOpen={!!storyModalResult}
        onClose={() => setStoryModalResult(null)}
        result={storyModalResult}
      />
    </div>
  );
}
