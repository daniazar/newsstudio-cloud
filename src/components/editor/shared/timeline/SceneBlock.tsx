"use client";

import React, { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { UnifiedTimelineItem } from "./TimelineSceneAdapter";
import { Scissors, Link2, Trash2 } from "lucide-react";

export interface SceneBlockProps {
  item: UnifiedTimelineItem;
  totalDurationFrames: number;
  isSelected?: boolean;
  onSelect: (id: string, index: number) => void;
  onTrimDuration?: (id: string, newDurationFrames: number) => void;
  onTrimStart?: (id: string, newStartFrames: number, newDurationFrames: number) => void;
  onSplit?: (index: number) => void;
  onMerge?: (index: number) => void;
  onDelete?: (index: number) => void;
  fps?: number;
  className?: string;
}

const CAMERA_BADGE_COLORS: Record<string, string> = {
  cam1_wide: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  cam2_left: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  cam3_closeup: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  cam4_overhead: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
};

function SceneBlockComponent({
  item,
  totalDurationFrames,
  isSelected = false,
  onSelect,
  onTrimDuration,
  onTrimStart,
  onSplit,
  onMerge,
  onDelete,
  fps = 30,
  className = "",
}: SceneBlockProps) {
  const [isResizingRight, setIsResizingRight] = useState(false);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const blockRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);
  const startDurationRef = useRef<number>(item.durationFrames);
  const startFrameRef = useRef<number>(item.startFrame);

  const leftPercent = totalDurationFrames > 0
    ? (item.startFrame / totalDurationFrames) * 100
    : 0;

  const widthPercent = totalDurationFrames > 0
    ? (item.durationFrames / totalDurationFrames) * 100
    : 10;

  const durationSec = (item.durationFrames / fps).toFixed(1);

  // 1. Right Edge Resize (Trim Duration)
  const handleRightResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizingRight(true);
    startXRef.current = e.clientX;
    startDurationRef.current = item.durationFrames;
  };

  const handleRightResizeMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizingRight || !blockRef.current) return;
      const parent = blockRef.current.parentElement;
      if (!parent) return;

      const deltaX = e.clientX - startXRef.current;
      const parentWidth = parent.getBoundingClientRect().width;
      const deltaFrames = Math.round((deltaX / parentWidth) * totalDurationFrames);

      const minFrames = Math.round(fps * 0.5); // min 0.5s
      const maxFrames = Math.round(fps * 60);  // max 60s
      const newDuration = Math.max(minFrames, Math.min(maxFrames, startDurationRef.current + deltaFrames));

      onTrimDuration?.(item.id, newDuration);
    },
    [isResizingRight, totalDurationFrames, fps, item.id, onTrimDuration]
  );

  const handleRightResizeEnd = useCallback(() => {
    if (isResizingRight) {
      setIsResizingRight(false);
    }
  }, [isResizingRight]);

  useEffect(() => {
    if (isResizingRight) {
      window.addEventListener("mousemove", handleRightResizeMove);
      window.addEventListener("mouseup", handleRightResizeEnd);
      return () => {
        window.removeEventListener("mousemove", handleRightResizeMove);
        window.removeEventListener("mouseup", handleRightResizeEnd);
      };
    }
  }, [isResizingRight, handleRightResizeMove, handleRightResizeEnd]);

  // 2. Left Edge Resize (Trim Start)
  const handleLeftResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizingLeft(true);
    startXRef.current = e.clientX;
    startDurationRef.current = item.durationFrames;
    startFrameRef.current = item.startFrame;
  };

  const handleLeftResizeMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizingLeft || !blockRef.current) return;
      const parent = blockRef.current.parentElement;
      if (!parent) return;

      const deltaX = e.clientX - startXRef.current;
      const parentWidth = parent.getBoundingClientRect().width;
      const deltaFrames = Math.round((deltaX / parentWidth) * totalDurationFrames);

      const minFrames = Math.round(fps * 0.5);
      const maxShift = startDurationRef.current - minFrames;
      const clampedDelta = Math.max(-startFrameRef.current, Math.min(maxShift, deltaFrames));

      const newStart = startFrameRef.current + clampedDelta;
      const newDuration = startDurationRef.current - clampedDelta;

      if (onTrimStart) {
        onTrimStart(item.id, newStart, newDuration);
      } else if (onTrimDuration) {
        onTrimDuration(item.id, newDuration);
      }
    },
    [isResizingLeft, totalDurationFrames, fps, item.id, onTrimStart, onTrimDuration]
  );

  const handleLeftResizeEnd = useCallback(() => {
    if (isResizingLeft) {
      setIsResizingLeft(false);
    }
  }, [isResizingLeft]);

  useEffect(() => {
    if (isResizingLeft) {
      window.addEventListener("mousemove", handleLeftResizeMove);
      window.addEventListener("mouseup", handleLeftResizeEnd);
      return () => {
        window.removeEventListener("mousemove", handleLeftResizeMove);
        window.removeEventListener("mouseup", handleLeftResizeEnd);
      };
    }
  }, [isResizingLeft, handleLeftResizeMove, handleLeftResizeEnd]);

  // Badge label calculation
  const badgeText =
    item.index === -1 ? "Intro" : item.index >= 900 ? "Outro" : `Scene ${item.index + 1}`;

  // Formatted Action Loop Name
  const formattedLoopName = useMemo(() => {
    if (!item.actionLoop) return null;
    return item.actionLoop
      .replace("state_", "")
      .replace("ruby_", "")
      .replace("burgundy_", "")
      .replace(/loop v\d/i, "")
      .replace(/_/g, " ")
      .trim();
  }, [item.actionLoop]);

  // Audio Waveform ambient bars (visual cadence)
  const waveformBars = useMemo(() => {
    const durSec = item.durationFrames / fps;
    const count = Math.max(8, Math.min(24, Math.floor(durSec * 4)));
    const bars: number[] = [];
    let seed = 0;
    const srcStr = item.text || item.title || "";
    for (let i = 0; i < srcStr.length; i++) {
      seed = (seed + srcStr.charCodeAt(i) * (i + 1)) % 1000;
    }
    for (let i = 0; i < count; i++) {
      const val = 0.2 + 0.8 * Math.abs(Math.sin((seed + i * 37) * 0.15) * Math.cos(i * 0.3));
      bars.push(Math.max(0.15, Math.min(0.95, val)));
    }
    return bars;
  }, [item.text, item.title, item.durationFrames, fps]);

  const hasAudio = Boolean(item.audioUrl);
  const hasVideo = Boolean(item.videoUrl);
  const displayText = item.text || item.voiceoverScript || item.title || "";

  return (
    <div
      ref={blockRef}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest("[data-resize-handle]") || (e.target as HTMLElement).closest("button")) {
          return;
        }
        e.stopPropagation();
        onSelect(item.id, item.index);
      }}
      title={`Scene ${badgeText}: ${displayText} (${durationSec}s)`}
      style={{
        left: `${leftPercent}%`,
        width: `${Math.max(4, widthPercent)}%`,
        contentVisibility: "auto",
        containIntrinsicSize: "140px 80px",
      }}
      className={`group absolute top-1 bottom-1 flex rounded-lg border overflow-hidden cursor-pointer select-none transition-all ${
        isSelected
          ? "border-emerald-400 bg-emerald-500/20 shadow-md shadow-emerald-950/70 ring-2 ring-emerald-500/60 z-20"
          : "border-zinc-800 bg-zinc-900/80 hover:border-zinc-700 hover:bg-zinc-850 z-10"
      } ${className}`}
    >
      {/* Background: Asset thumbnail or subtle studio gradient */}
      <div className="absolute inset-0 bg-zinc-950">
        {item.thumbnailUrl && item.thumbnailUrl !== "/placeholder_product.png" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.thumbnailUrl}
            alt={item.title || badgeText}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105 opacity-40"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="absolute inset-0 h-full w-full flex items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-950 to-black opacity-60">
            <span className="text-xl opacity-20">🎬</span>
          </div>
        )}
      </div>

      {/* Vignette Overlay for Readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/70 pointer-events-none" />

      {/* Audio Waveform Ambient Track */}
      {hasAudio && waveformBars.length > 0 && (
        <div className="absolute bottom-1 left-2 right-2 h-4 flex items-end justify-between gap-[1px] opacity-25 group-hover:opacity-45 transition-opacity pointer-events-none z-0">
          {waveformBars.map((height, i) => (
            <div
              key={i}
              className="flex-1 bg-cyan-400 rounded-t-sm"
              style={{ height: `${height * 100}%` }}
            />
          ))}
        </div>
      )}

      {/* Content Overlay */}
      <div className="relative z-10 p-1.5 h-full w-full flex flex-col justify-between overflow-hidden">
        {/* Top Header: Badge, Camera Cue, Status Dots & Duration */}
        <div>
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1 min-w-0">
              <span className="rounded bg-black/80 backdrop-blur-md px-1.5 py-0.5 font-mono text-[9px] font-bold text-white border border-white/10 shadow-sm uppercase tracking-wider shrink-0">
                {badgeText}
              </span>
              {item.cameraCue && (
                <span
                  className={`text-[8px] font-bold font-mono px-1 py-0.5 rounded border shrink-0 ${
                    CAMERA_BADGE_COLORS[item.cameraCue] || "border-zinc-700 text-zinc-400 bg-zinc-800"
                  }`}
                >
                  {item.cameraCue.toUpperCase().replace("CAM", "C")}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {hasVideo ? (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" title="Presenter Video Generated" />
              ) : hasAudio ? (
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" title="Voiceover Audio Generated" />
              ) : null}
              <span className="text-[9px] text-zinc-400 font-mono">
                {durationSec}s
              </span>
            </div>
          </div>

          {/* Script Text Preview (2-line clamp) */}
          {displayText && (
            <p className="text-[9.5px] text-zinc-200 mt-1 leading-tight line-clamp-2 drop-shadow-sm">
              {displayText}
            </p>
          )}
        </div>

        {/* Bottom Footer: Action Loop & Hover Actions */}
        <div className="flex items-center justify-between text-[8px] text-zinc-400 pt-0.5">
          {formattedLoopName ? (
            <span className="truncate max-w-[85px] font-mono capitalize text-purple-300/80 bg-purple-950/40 px-1 py-0.2 rounded border border-purple-500/20">
              {formattedLoopName}
            </span>
          ) : <span />}

          {/* Hover Quick Actions */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto flex items-center gap-1 z-30">
            {onSplit && item.index >= 0 && item.index < 900 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSplit(item.index);
                }}
                className="px-1 py-0.5 rounded bg-black/80 hover:bg-zinc-700 text-[9px] text-zinc-200 hover:text-white border border-zinc-700 transition-colors"
                title="Split Scene (✂️)"
              >
                <Scissors className="h-2.5 w-2.5" />
              </button>
            )}
            {onMerge && item.index >= 0 && item.index < 900 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMerge(item.index);
                }}
                className="px-1 py-0.5 rounded bg-black/80 hover:bg-zinc-700 text-[9px] text-zinc-200 hover:text-white border border-zinc-700 transition-colors"
                title="Merge with Next (🔗)"
              >
                <Link2 className="h-2.5 w-2.5" />
              </button>
            )}
            {onDelete && item.index >= 0 && item.index < 900 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item.index);
                }}
                className="px-1 py-0.5 rounded bg-black/80 hover:bg-rose-900/80 text-[9px] text-rose-300 hover:text-rose-100 border border-rose-500/30 transition-colors"
                title="Delete Scene (🗑️)"
              >
                <Trash2 className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Left Edge Resize Handle */}
      {(onTrimStart || onTrimDuration) && (
        <div
          data-resize-handle="true"
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={handleLeftResizeStart}
          className="absolute left-0 top-0 bottom-0 w-2.5 hover:w-3 cursor-ew-resize hover:bg-emerald-500/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-30 bg-black/30"
          title="Drag to trim start"
        >
          <div className="w-0.5 h-3 bg-white/70 rounded-full" />
        </div>
      )}

      {/* Right Edge Resize Handle */}
      {onTrimDuration && (
        <div
          data-resize-handle="true"
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={handleRightResizeStart}
          className="absolute right-0 top-0 bottom-0 w-2.5 hover:w-3 cursor-ew-resize hover:bg-emerald-500/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-30 bg-black/30"
          title="Drag to trim duration"
        >
          <div className="w-0.5 h-3 bg-white/70 rounded-full" />
        </div>
      )}

      {/* Bottom Accent Bar on Selection */}
      {isSelected && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] z-30" />
      )}
    </div>
  );
}

export const SceneBlock = React.memo(SceneBlockComponent);

