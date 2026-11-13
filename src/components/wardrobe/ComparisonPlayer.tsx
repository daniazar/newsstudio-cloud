"use client";

import React, { useState, useRef, useCallback } from "react";
import { Play, Pause, SplitSquareHorizontal, Film, AlertTriangle, RefreshCw } from "lucide-react";

export interface ComparisonPlayerProps {
  originalVideoUrl: string;
  inpaintedVideoUrl: string;
  outfitName: string;
  initialMode?: "side_by_side" | "slider" | "gif";
  className?: string;
}

function normalizeMediaUrl(url?: string | null): string {
  if (!url) return "";
  let clean = url.trim().replace(/^public\//, "");
  if (!clean.startsWith("/") && !clean.startsWith("http")) {
    clean = "/" + clean;
  }
  return clean;
}

export const ComparisonPlayer = React.memo(function ComparisonPlayer({
  originalVideoUrl,
  inpaintedVideoUrl,
  outfitName,
  initialMode = "side_by_side",
  className = "",
}: ComparisonPlayerProps) {
  const cleanOriginalUrl = React.useMemo(() => normalizeMediaUrl(originalVideoUrl), [originalVideoUrl]);
  const cleanInpaintedUrl = React.useMemo(() => normalizeMediaUrl(inpaintedVideoUrl), [inpaintedVideoUrl]);

  const [playerViewMode, setPlayerViewMode] = useState<"side_by_side" | "slider" | "gif">(initialMode);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [sliderPos, setSliderPos] = useState<number>(50);
  const [originalError, setOriginalError] = useState<string | null>(null);
  const [inpaintedError, setInpaintedError] = useState<string | null>(null);

  const videoOriginalRef = useRef<HTMLVideoElement | null>(null);
  const videoInpaintedRef = useRef<HTMLVideoElement | null>(null);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => {
      const next = !prev;
      if (videoOriginalRef.current) {
        if (next) videoOriginalRef.current.play().catch(() => {});
        else videoOriginalRef.current.pause();
      }
      if (videoInpaintedRef.current) {
        if (next) videoInpaintedRef.current.play().catch(() => {});
        else videoInpaintedRef.current.pause();
      }
      return next;
    });
  }, []);

  const handleTimeSync = useCallback(() => {
    if (videoOriginalRef.current && videoInpaintedRef.current) {
      const origTime = videoOriginalRef.current.currentTime;
      if (Math.abs(videoInpaintedRef.current.currentTime - origTime) > 0.08) {
        videoInpaintedRef.current.currentTime = origTime;
      }
    }
  }, []);

  const retryPlayback = () => {
    setOriginalError(null);
    setInpaintedError(null);
    if (videoOriginalRef.current) {
      videoOriginalRef.current.load();
      videoOriginalRef.current.play().catch(() => {});
    }
    if (videoInpaintedRef.current) {
      videoInpaintedRef.current.load();
      videoInpaintedRef.current.play().catch(() => {});
    }
  };

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Player Mode Switcher Tabs */}
      <div className="flex items-center justify-between">
        <div
          role="group"
          aria-label="Comparison playback view mode"
          className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-raised border border-border/80 text-[10px] font-mono font-bold"
        >
          <button
            onClick={() => setPlayerViewMode("side_by_side")}
            aria-label="Side-by-side dual sync view"
            aria-pressed={playerViewMode === "side_by_side"}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              playerViewMode === "side_by_side"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-muted hover:text-white"
            }`}
          >
            Dual Sync
          </button>
          <button
            onClick={() => setPlayerViewMode("slider")}
            aria-label="Split slider comparison view"
            aria-pressed={playerViewMode === "slider"}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
              playerViewMode === "slider"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-muted hover:text-white"
            }`}
          >
            <SplitSquareHorizontal className="w-3 h-3" />
            <span>Split Slider</span>
          </button>
          <button
            onClick={() => setPlayerViewMode("gif")}
            aria-label="Loop result playback view"
            aria-pressed={playerViewMode === "gif"}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
              playerViewMode === "gif"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-muted hover:text-white"
            }`}
          >
            <Film className="w-3 h-3" />
            <span>Loop Result</span>
          </button>
        </div>

        <span className="text-[10px] font-mono text-purple-400 font-bold truncate max-w-[200px]">
          {outfitName}
        </span>
      </div>

      {/* Main Video Stage */}
      <div className="relative aspect-[9/14] max-h-[500px] w-full rounded-2xl bg-black border-2 border-border overflow-hidden shadow-2xl flex items-center justify-center">
        {playerViewMode === "gif" ? (
          /* Single Loop Result */
          <div className="relative w-full h-full overflow-hidden bg-black flex items-center justify-center">
            {inpaintedError ? (
              <div className="p-4 text-center text-xs font-mono text-amber-300 flex flex-col items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-amber-400" />
                <span>Failed to load inpainted video</span>
                <span className="text-[10px] text-muted max-w-xs truncate">{cleanInpaintedUrl}</span>
                <button
                  onClick={retryPlayback}
                  className="mt-2 px-3 py-1 rounded-lg bg-surface border border-border text-foreground hover:bg-white/10 flex items-center gap-1.5 text-[10px]"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Retry</span>
                </button>
              </div>
            ) : (
              <video
                key={cleanInpaintedUrl}
                src={cleanInpaintedUrl}
                autoPlay
                loop
                muted
                playsInline
                onError={() => setInpaintedError("Video decoding or URL error")}
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute top-2 left-2 pointer-events-none">
              <span className="text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-purple-600/90 text-white border border-purple-400/40">
                Inpainted ({outfitName})
              </span>
            </div>
          </div>
        ) : playerViewMode === "slider" ? (
          /* Split-Screen Slider Comparison */
          <div className="relative w-full h-full overflow-hidden select-none bg-black">
            {originalError ? (
              <div className="absolute inset-0 flex items-center justify-center text-center p-4 text-xs font-mono text-amber-300">
                <span>Original video unavailable</span>
              </div>
            ) : (
              <video
                key={cleanOriginalUrl}
                ref={videoOriginalRef}
                src={cleanOriginalUrl}
                autoPlay
                loop
                muted
                playsInline
                onTimeUpdate={handleTimeSync}
                onError={() => setOriginalError("Failed to load original video")}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}

            {/* Inpainted overlay clipped by slider position */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}
            >
              {inpaintedError ? (
                <div className="absolute inset-0 flex items-center justify-center text-center p-4 text-xs font-mono text-amber-300 bg-black/60">
                  <span>Inpainted video unavailable</span>
                </div>
              ) : (
                <video
                  key={cleanInpaintedUrl}
                  ref={videoInpaintedRef}
                  src={cleanInpaintedUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  onError={() => setInpaintedError("Failed to load inpainted video")}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
            </div>

            {/* Interactive Slider Divider Line */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] z-10 pointer-events-none"
              style={{ left: `${sliderPos}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white text-black text-[9px] font-bold flex items-center justify-center shadow-lg">
                ⇄
              </div>
            </div>

            <input
              type="range"
              min={0}
              max={100}
              value={sliderPos}
              onChange={(e) => setSliderPos(Number(e.target.value))}
              aria-label="Comparison slider"
              className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
            />

            <div className="absolute top-2 left-2 z-10 pointer-events-none">
              <span className="text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-black/80 text-white border border-white/10">
                Original (Source)
              </span>
            </div>
            <div className="absolute top-2 right-2 z-10 pointer-events-none">
              <span className="text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-purple-600/90 text-white border border-purple-400/40">
                Inpainted ({outfitName})
              </span>
            </div>
          </div>
        ) : (
          /* Side-by-Side Synchronized Dual Player */
          <div className="grid grid-cols-2 w-full h-full divide-x divide-white/10 bg-black">
            <div className="relative w-full h-full overflow-hidden flex items-center justify-center">
              {originalError ? (
                <div className="p-2 text-center text-[10px] font-mono text-amber-300">
                  Original unavailable
                </div>
              ) : (
                <video
                  key={cleanOriginalUrl}
                  ref={videoOriginalRef}
                  src={cleanOriginalUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  onTimeUpdate={handleTimeSync}
                  onError={() => setOriginalError("Failed to load original video")}
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute top-2 left-2 pointer-events-none">
                <span className="text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-black/80 text-white border border-white/10">
                  Original
                </span>
              </div>
            </div>
            <div className="relative w-full h-full overflow-hidden flex items-center justify-center">
              {inpaintedError ? (
                <div className="p-2 text-center text-[10px] font-mono text-amber-300 flex flex-col items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Inpainted unavailable</span>
                  <button
                    onClick={retryPlayback}
                    className="mt-1 px-2 py-0.5 rounded bg-surface border border-border text-[9px]"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <video
                  key={cleanInpaintedUrl}
                  ref={videoInpaintedRef}
                  src={cleanInpaintedUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  onError={() => setInpaintedError("Failed to load inpainted video")}
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute top-2 right-2 pointer-events-none">
                <span className="text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-purple-600/90 text-white border border-purple-400/40">
                  Inpainted
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Synchronized Play / Pause Button Overlay */}
        {playerViewMode !== "gif" && (
          <button
            onClick={togglePlay}
            className="absolute bottom-4 right-4 z-20 w-10 h-10 rounded-full bg-black/80 hover:bg-black text-white flex items-center justify-center border border-white/20 shadow-xl transition-transform active:scale-95"
            aria-label={isPlaying ? "Pause comparison" : "Play comparison"}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 text-purple-300" />
            ) : (
              <Play className="w-4 h-4 text-purple-300 translate-x-0.5" />
            )}
          </button>
        )}
      </div>
    </div>
  );
});
