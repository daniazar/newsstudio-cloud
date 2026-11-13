"use client";

import React, { useCallback } from "react";
import { motion } from "framer-motion";
import type { CameraCue } from "@/lib/types";

interface SceneBlockProps {
  index: number;
  text: string;
  imagePrompt: string;
  startTime: number;
  endTime: number;
  totalDuration: number;
  assetPath?: string | null;
  assetType?: string | null;
  isSelected: boolean;
  onSelect: () => void;
  onDropAsset: (file: File) => void;
  onSplit?: (index: number) => void;
  onMerge?: (index: number) => void;
  onTrim?: (index: number, newStart: number, newEnd: number) => void;
  actionLoop?: string | null;
  cameraCue?: CameraCue | null;
  hasAudio?: boolean;
  hasVideo?: boolean;
  sceneStrategy?: string | null;
}

const CAMERA_BADGE_COLORS: Record<string, string> = {
  cam1_wide: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  cam2_left: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  cam3_closeup: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  cam4_overhead: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
};

export const SceneBlock: React.FC<SceneBlockProps> = ({
  index,
  text,
  imagePrompt: _imagePrompt,
  startTime,
  endTime,
  totalDuration,
  assetPath: _assetPath,
  assetType,
  isSelected,
  onSelect,
  onDropAsset,
  onSplit,
  onMerge,
  onTrim,
  actionLoop,
  cameraCue,
  hasAudio,
  hasVideo,
  sceneStrategy: _sceneStrategy,
}) => {
  const duration = endTime - startTime;
  const leftPercent = (startTime / totalDuration) * 100;
  const widthPercent = (duration / totalDuration) * 100;

  const handleLeftTrimDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const initialStart = startTime;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaTime = (deltaX / (window.innerWidth * 0.7)) * totalDuration;
      const newStart = Math.max(0, Math.min(endTime - 0.5, initialStart + deltaTime));
      onTrim?.(index, Number(newStart.toFixed(2)), endTime);
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, [index, startTime, endTime, totalDuration, onTrim]);

  const handleRightTrimDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const initialEnd = endTime;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaTime = (deltaX / (window.innerWidth * 0.7)) * totalDuration;
      const newEnd = Math.max(startTime + 0.5, Math.min(totalDuration, initialEnd + deltaTime));
      onTrim?.(index, startTime, Number(newEnd.toFixed(2)));
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, [index, startTime, endTime, totalDuration, onTrim]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer.files[0];
      if (file) {
        onDropAsset(file);
      }
    },
    [onDropAsset]
  );

  const formattedLoopName = actionLoop
    ? actionLoop.replace("state_", "").replace("P0", "P").replace(/_/g, " ")
    : null;

  // Generate pseudo-waveform bars based on text hash for visual speech cadence
  const waveformBars = React.useMemo(() => {
    if (!hasAudio) return [];
    const count = Math.max(8, Math.min(24, Math.floor(duration * 4)));
    const bars: number[] = [];
    let seed = 0;
    for (let i = 0; i < text.length; i++) {
      seed = (seed + text.charCodeAt(i) * (i + 1)) % 1000;
    }
    for (let i = 0; i < count; i++) {
      const val = 0.2 + 0.8 * Math.abs(Math.sin((seed + i * 37) * 0.15) * Math.cos(i * 0.3));
      bars.push(Math.max(0.15, Math.min(0.95, val)));
    }
    return bars;
  }, [hasAudio, duration, text]);

  return (
    <motion.div
      className={`absolute h-full rounded-lg border-2 cursor-pointer overflow-hidden group ${
        isSelected
          ? "border-accent shadow-lg shadow-accent/20"
          : "border-border hover:border-border-hover"
      }`}
      style={{
        left: `${leftPercent}%`,
        width: `calc(${widthPercent}% - 2px)`,
        marginRight: "2px",
      }}
      title={text}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      layout
    >
      {/* Asset thumbnail background */}
      <div className="absolute inset-0 bg-surface-raised">
        {assetType === "video" || assetType === "image" ? (
          <div className="w-full h-full bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center">
            <span className="text-2xl">🎬</span>
          </div>
        ) : assetType === "intro" ? (
          <div className="w-full h-full bg-gradient-to-br from-indigo-500/20 to-purple-500/10 flex items-center justify-center">
            <span className="text-2xl">✨</span>
          </div>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-surface-overlay to-surface-raised" />
        )}
      </div>

      {/* Audio Waveform Ambient Track */}
      {hasAudio && waveformBars.length > 0 && (
        <div className="absolute bottom-1.5 left-1 right-1 h-5 flex items-end justify-between gap-[1px] opacity-25 group-hover:opacity-40 transition-opacity pointer-events-none z-0">
          {waveformBars.map((height, i) => (
            <div
              key={i}
              className="flex-1 bg-cyan-400 rounded-t-sm"
              style={{ height: `${height * 100}%` }}
            />
          ))}
        </div>
      )}

      {/* Content overlay */}
      <div className="relative z-10 p-2 h-full flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-accent bg-accent-muted px-1.5 py-0.5 rounded">
                Scene {index + 1}
              </span>
              {cameraCue && (
                <span
                  className={`text-[8px] font-bold font-mono px-1 py-0.2 rounded border ${
                    CAMERA_BADGE_COLORS[cameraCue] || "border-border text-muted"
                  }`}
                >
                  {cameraCue.toUpperCase().replace("CAM", "C")}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {hasVideo ? (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Presenter Video Generated" />
              ) : hasAudio ? (
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" title="Audio Generated" />
              ) : null}
              <span className="text-[9px] text-muted font-mono">
                {startTime.toFixed(1)}s
              </span>
            </div>
          </div>
          <p className="text-[10px] text-foreground mt-1 leading-tight line-clamp-2">
            {text}
          </p>
        </div>

        {/* Footer info: Motion Loop & Hover Actions */}
        <div className="flex items-center justify-between text-[8px] text-muted pt-1">
          {formattedLoopName && (
            <span className="truncate max-w-[80px] font-mono capitalize text-accent/80">
              {formattedLoopName}
            </span>
          )}

          {/* Hover Quick Actions: Split & Merge */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto flex items-center gap-1">
            {onSplit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSplit(index);
                }}
                className="px-1 py-0.5 rounded bg-black/70 hover:bg-accent text-[9px] text-white/90 hover:text-white transition-colors"
                title="Split Scene (✂️)"
              >
                ✂️
              </button>
            )}
            {onMerge && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMerge(index);
                }}
                className="px-1 py-0.5 rounded bg-black/70 hover:bg-accent text-[9px] text-white/90 hover:text-white transition-colors"
                title="Merge with Next (🔗)"
              >
                🔗
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Left and Right Edge Trim Drag Handles */}
      <div
        className="absolute left-0 top-0 bottom-0 w-2 hover:w-3 bg-accent/20 hover:bg-accent cursor-ew-resize opacity-0 group-hover:opacity-100 transition-all z-30 flex items-center justify-center rounded-l-md"
        title="Drag to trim start time"
        onMouseDown={handleLeftTrimDown}
      >
        <div className="w-0.5 h-3 bg-white/70 rounded-full" />
      </div>

      <div
        className="absolute right-0 top-0 bottom-0 w-2 hover:w-3 bg-accent/20 hover:bg-accent cursor-ew-resize opacity-0 group-hover:opacity-100 transition-all z-30 flex items-center justify-center rounded-r-md"
        title="Drag to trim end time"
        onMouseDown={handleRightTrimDown}
      >
        <div className="w-0.5 h-3 bg-white/70 rounded-full" />
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent"
          layoutId="scene-indicator"
        />
      )}
    </motion.div>
  );
};
