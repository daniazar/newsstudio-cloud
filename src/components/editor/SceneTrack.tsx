"use client";

import React, { useState, useRef } from "react";
import { SceneBlock } from "./SceneBlock";
import { TimelineRuler } from "./TimelineRuler";
import type { CameraCue } from "@/lib/types";

interface Segment {
  index: number;
  text: string;
  imagePrompt: string;
  startTime: number;
  endTime: number;
  assetPath?: string | null;
  assetType?: string | null;
  actionLoop?: string | null;
  cameraCue?: CameraCue | null;
  hasAudio?: boolean;
  hasVideo?: boolean;
  sceneStrategy?: string | null;
}

interface SceneTrackProps {
  segments: Segment[];
  totalDuration: number;
  selectedIndex: number | null;
  onSelectScene: (index: number | null) => void;
  onDropAsset: (index: number, file: File) => void;
  onSplitScene?: (index: number) => void;
  onMergeScene?: (index: number) => void;
  onTrimScene?: (index: number, newStart: number, newEnd: number) => void;
  onSeek: (time: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onReorder?: (newOrder: Segment[]) => void;
  currentFrame: number;
  fps: number;
}

export const SceneTrack: React.FC<SceneTrackProps> = ({
  segments,
  totalDuration,
  selectedIndex,
  onSelectScene,
  onDropAsset,
  onSplitScene,
  onMergeScene,
  onTrimScene,
  onSeek,
  onDragStart,
  onDragEnd,
  currentFrame,
  fps,
}) => {
  const currentTime = currentFrame / fps;
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const calculateTimeFromEvent = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const time = percentage * totalDuration;
    return Math.max(0, Math.min(time, totalDuration));
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    onDragStart?.();
    onSeek(calculateTimeFromEvent(e));
    onSelectScene(null); // Deselect when clicking on track background
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    onSeek(calculateTimeFromEvent(e));
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      onDragEnd?.();
    }
  };

  // Find segment currently under playhead
  const safeSegments = (segments || []).filter(Boolean);
  const currentSegment = safeSegments.find(
    (s) => s && typeof s.startTime === "number" && currentTime >= s.startTime && currentTime <= (s.endTime ?? s.startTime + 4)
  );

  return (
    <div
      className="w-full select-none cursor-pointer space-y-2"
      ref={trackRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Canvas Time ruler */}
      <TimelineRuler
        totalDuration={totalDuration}
        fps={fps}
      />

      {/* Track 1: Visual Scene Blocks Track */}
      <div className="relative h-20 bg-surface/40 rounded-xl border border-border/60 overflow-hidden">
        {/* Background Grid Guide Lines aligned with ruler */}
        <div className="absolute inset-0 pointer-events-none select-none z-0 overflow-hidden">
          {totalDuration > 0 &&
            Array.from({ length: Math.ceil(totalDuration) + 1 }).map((_, sec) => {
              const isMajor = sec % 5 === 0;
              const leftPercent = (sec / totalDuration) * 100;
              if (leftPercent > 100) return null;
              return (
                <div
                  key={sec}
                  className={`absolute top-0 bottom-0 pointer-events-none ${
                    isMajor
                      ? "w-[1px] bg-white/10 border-r border-dashed border-white/15"
                      : "w-[1px] bg-white/5"
                  }`}
                  style={{ left: `${leftPercent}%` }}
                />
              );
            })}
        </div>

        <div className="absolute inset-0 z-10">
          {safeSegments.map((seg) => {
            const startSec = typeof seg.startTime === "number" ? seg.startTime : 0;
            const endSec = typeof seg.endTime === "number" ? seg.endTime : startSec + 4;
            return (
              <SceneBlock
                key={(seg as { id?: string }).id || seg.index}
                index={seg.index}
                text={seg.text || ""}
                imagePrompt={seg.imagePrompt}
                startTime={startSec}
                endTime={endSec}
                totalDuration={totalDuration}
                assetPath={seg.assetPath}
                assetType={seg.assetType}
                actionLoop={seg.actionLoop}
                cameraCue={seg.cameraCue}
                hasAudio={seg.hasAudio}
                hasVideo={seg.hasVideo}
                sceneStrategy={seg.sceneStrategy}
                isSelected={selectedIndex === seg.index}
                onSelect={() => {
                  onSelectScene(seg.index);
                }}
                onDropAsset={(file) => onDropAsset(seg.index, file)}
                onSplit={onSplitScene ? () => onSplitScene(seg.index) : undefined}
                onMerge={onMergeScene && seg.index < safeSegments.length - 1 ? () => onMergeScene(seg.index) : undefined}
                onTrim={onTrimScene}
              />
            );
          })}
        </div>

        {/* Playhead for Track 1 */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 pointer-events-none"
          style={{
            left: `${totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0}%`,
          }}
        >
          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
        </div>
      </div>

      {/* Track 2: Dedicated Interactive Speech Audio Waveform Track */}
      <div className="relative h-10 bg-black/40 rounded-lg border border-border/40 overflow-hidden flex items-center px-1">
        {/* Background Grid Guide Lines aligned with ruler */}
        <div className="absolute inset-0 pointer-events-none select-none z-0 overflow-hidden">
          {totalDuration > 0 &&
            Array.from({ length: Math.ceil(totalDuration) + 1 }).map((_, sec) => {
              const isMajor = sec % 5 === 0;
              const leftPercent = (sec / totalDuration) * 100;
              if (leftPercent > 100) return null;
              return (
                <div
                  key={sec}
                  className={`absolute top-0 bottom-0 pointer-events-none ${
                    isMajor
                      ? "w-[1px] bg-white/10 border-r border-dashed border-white/10"
                      : "w-[1px] bg-white/5"
                  }`}
                  style={{ left: `${leftPercent}%` }}
                />
              );
            })}
        </div>

        {/* Track Label Badge */}
        <div className="absolute left-2 top-1/2 -translate-y-1/2 z-20 pointer-events-none flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface/80 border border-border/50 text-[9px] font-mono text-cyan-400 font-bold">
          <span>🎙️ AUDIO</span>
        </div>

        {/* Audio Segments with Waveforms */}
        <div className="absolute inset-0 z-10">
          {safeSegments.map((seg) => {
            const startSec = typeof seg.startTime === "number" ? seg.startTime : 0;
            const endSec = typeof seg.endTime === "number" ? seg.endTime : startSec + 4;
            const segDuration = Math.max(0.1, endSec - startSec);
            const leftPct = totalDuration > 0 ? (startSec / totalDuration) * 100 : 0;
            const widthPct = totalDuration > 0 ? (segDuration / totalDuration) * 100 : 0;
            const isSegActive = currentTime >= startSec && currentTime <= endSec;
            const segPlayProgress = isSegActive
              ? Math.max(0, Math.min(1, (currentTime - startSec) / segDuration))
              : currentTime > endSec ? 1 : 0;

            // Generate deterministic waveform bars
            const barCount = Math.max(8, Math.min(32, Math.floor(segDuration * 3.5)));
            const bars: number[] = [];
            let seed = 0;
            const textToHash = seg.text || "";
            for (let i = 0; i < textToHash.length; i++) {
              seed = (seed + textToHash.charCodeAt(i) * (i + 1)) % 1000;
            }
            for (let i = 0; i < barCount; i++) {
              const val = 0.25 + 0.75 * Math.abs(Math.sin((seed + i * 41) * 0.18) * Math.cos(i * 0.35));
              bars.push(Math.max(0.2, Math.min(0.95, val)));
            }

            return (
              <div
                key={`audio-seg-${seg.index}`}
                className={`absolute top-1 bottom-1 rounded border transition-colors overflow-hidden ${
                  selectedIndex === seg.index
                    ? "border-cyan-400/80 bg-cyan-950/40"
                    : isSegActive
                    ? "border-emerald-500/60 bg-emerald-950/20"
                    : "border-border/60 bg-surface-raised/30 hover:border-border"
                }`}
                style={{
                  left: `${leftPct}%`,
                  width: `calc(${widthPct}% - 2px)`,
                  marginRight: "2px",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectScene(seg.index);
                }}
              >
                {/* Played audio fill */}
                <div
                  className="absolute inset-0 bg-cyan-500/15 pointer-events-none transition-all"
                  style={{ width: `${segPlayProgress * 100}%` }}
                />

                {/* Waveform visual bars */}
                <div className="absolute inset-0 px-2 flex items-center justify-between gap-[1px] pointer-events-none">
                  {bars.map((h, bIdx) => {
                    const barPos = bIdx / barCount;
                    const isBarPlayed = barPos <= segPlayProgress;
                    return (
                      <div
                        key={bIdx}
                        className={`flex-1 rounded-full transition-colors ${
                          isBarPlayed ? "bg-cyan-400" : "bg-muted/40"
                        }`}
                        style={{ height: `${h * 80}%` }}
                      />
                    );
                  })}
                </div>

                {/* Duration chip */}
                <span className="absolute right-1.5 bottom-0.5 text-[8px] font-mono font-semibold text-muted pointer-events-none">
                  {segDuration.toFixed(1)}s
                </span>
              </div>
            );
          })}
        </div>

        {/* Playhead for Track 2 */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 pointer-events-none"
          style={{
            left: `${totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0}%`,
          }}
        />
      </div>

      {/* Floating Split At Playhead Action */}
      {currentSegment && onSplitScene && (
        <div className="flex items-center justify-between px-1 text-[10px] text-muted">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-foreground font-semibold">
              Scene {currentSegment.index + 1} ({currentTime.toFixed(2)}s / {totalDuration.toFixed(2)}s)
            </span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSplitScene(currentSegment.index);
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-accent/15 border border-accent/30 text-[10px] font-bold text-accent hover:bg-accent hover:text-white transition-all cursor-pointer shadow-sm"
          >
            <span>✂️ Split Scene at Playhead (S)</span>
          </button>
        </div>
      )}
    </div>
  );
};
