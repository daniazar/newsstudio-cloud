"use client";

import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { UnifiedTimelineItem } from "./TimelineSceneAdapter";
import { TimelinePlayhead } from "./TimelinePlayhead";
import { TimelineRuler } from "./TimelineRuler";
import { SceneBlock } from "./SceneBlock";
import {
  Plus,
  Scissors,
  Trash2,
  ZoomIn,
  ZoomOut,
  Layers,
  ArrowLeft,
  ArrowRight,
  LayoutList,
} from "lucide-react";

export interface UnifiedTimelineProps {
  items: UnifiedTimelineItem[];
  currentFrame: number;
  totalDurationFrames?: number;
  fps?: number;
  selectedSceneIndex: number | null;
  onSelectScene: (index: number | null, seekToStart?: boolean) => void;
  onSeek: (frame: number, isScrubbing?: boolean) => void;
  onTrimScene?: (index: number, newDurationFrames: number) => void;
  onTrimStartScene?: (index: number, newStartFrames: number, newDurationFrames: number) => void;
  onAddScene?: () => void;
  onSplitScene?: (index: number) => void;
  onMergeScene?: (index: number) => void;
  onDeleteScene?: (index: number) => void;
  onReorderScene?: (fromIndex: number, toIndex: number) => void;
  onOpenReorderModal?: () => void;
  className?: string;
}

function UnifiedTimelineComponent({
  items,
  currentFrame,
  totalDurationFrames: customTotalFrames,
  fps = 30,
  selectedSceneIndex,
  onSelectScene,
  onSeek,
  onTrimScene,
  onTrimStartScene,
  onAddScene,
  onSplitScene,
  onMergeScene,
  onDeleteScene,
  onReorderScene,
  onOpenReorderModal,
  className = "",
}: UnifiedTimelineProps) {
  const [zoom, setZoom] = useState<number>(1.0);
  const trackContainerRef = useRef<HTMLDivElement>(null);
  const cachedRectRef = useRef<{ left: number; width: number } | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const pendingClientXRef = useRef<number | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubFrame, setScrubFrame] = useState<number | null>(null);

  // Calculate actual total duration frames from items if not supplied
  const totalFrames = useMemo(() => {
    if (customTotalFrames && customTotalFrames > 0) return customTotalFrames;
    if (!items || items.length === 0) return fps * 10;
    const lastItem = items[items.length - 1];
    return Math.max(fps * 5, lastItem.startFrame + lastItem.durationFrames);
  }, [customTotalFrames, items, fps]);

  const handleZoomIn = () => setZoom((z) => Math.min(3.0, z + 0.5));
  const handleZoomOut = () => setZoom((z) => Math.max(1.0, z - 0.5));

  const handleTrim = useCallback(
    (id: string, newDuration: number) => {
      const targetItem = items.find((it) => it.id === id);
      if (targetItem && typeof targetItem.index === "number" && targetItem.index >= 0 && onTrimScene) {
        onTrimScene(targetItem.index, newDuration);
      }
    },
    [items, onTrimScene]
  );

  const handleTrimStart = useCallback(
    (id: string, newStartFrames: number, newDurationFrames: number) => {
      const targetItem = items.find((it) => it.id === id);
      if (targetItem && typeof targetItem.index === "number" && targetItem.index >= 0) {
        if (onTrimStartScene) {
          onTrimStartScene(targetItem.index, newStartFrames, newDurationFrames);
        } else if (onTrimScene) {
          onTrimScene(targetItem.index, newDurationFrames);
        }
      }
    },
    [items, onTrimStartScene, onTrimScene]
  );

  const handleSelectSceneBlock = useCallback(
    (_: string, itemIdx: number) => {
      onSelectScene(itemIdx, true);
    },
    [onSelectScene]
  );

  const calculateFrameFromClientX = useCallback(
    (clientX: number) => {
      let rect = cachedRectRef.current;
      if (!rect && trackContainerRef.current) {
        const r = trackContainerRef.current.getBoundingClientRect();
        rect = { left: r.left, width: r.width };
        cachedRectRef.current = rect;
      }
      if (!rect || rect.width <= 0 || totalFrames <= 0) return 0;
      const clickX = clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, clickX / rect.width));
      return Math.round(ratio * totalFrames);
    },
    [totalFrames]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only respond to primary click (left mouse button) or touch/pen
    if (e.button !== 0 && e.pointerType === "mouse") return;

    // Do not intercept if user clicked on a resize handle or action button
    const target = e.target as HTMLElement;
    if (target.closest("[data-resize-handle]") || target.closest("button")) {
      return;
    }

    e.preventDefault();

    // Cache track bounding geometry ONCE at pointerdown to eliminate layout thrashing
    if (trackContainerRef.current) {
      const r = trackContainerRef.current.getBoundingClientRect();
      cachedRectRef.current = { left: r.left, width: r.width };
    }

    const targetFrame = calculateFrameFromClientX(e.clientX);
    setIsScrubbing(true);
    setScrubFrame(targetFrame);

    // Instant seek notification (isScrubbing = true)
    onSeek(targetFrame, true);

    // Select the scene under the cursor WITHOUT forcing it to jump to startFrame (seekToStart = false)
    const sceneUnderCursor = items.find(
      (it) => targetFrame >= it.startFrame && targetFrame < it.startFrame + it.durationFrames
    );
    if (sceneUnderCursor) {
      onSelectScene(sceneUnderCursor.index, false);
    }
  };

  useEffect(() => {
    if (!isScrubbing) return;

    const handlePointerMove = (e: PointerEvent) => {
      pendingClientXRef.current = e.clientX;
      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(() => {
          rafIdRef.current = null;
          if (pendingClientXRef.current !== null) {
            const frame = calculateFrameFromClientX(pendingClientXRef.current);
            setScrubFrame(frame);
            onSeek(frame, true);
          }
        });
      }
    };

    const handlePointerUp = () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      const finalFrame = pendingClientXRef.current !== null
        ? calculateFrameFromClientX(pendingClientXRef.current)
        : (scrubFrame ?? currentFrame);

      pendingClientXRef.current = null;
      cachedRectRef.current = null;
      setScrubFrame(null);
      setIsScrubbing(false);

      // Commit exact final frame with isScrubbing = false
      onSeek(finalFrame, false);

      // Synchronize scene selection under the final scrub position
      const finalScene = items.find(
        (it) => finalFrame >= it.startFrame && finalFrame < it.startFrame + it.durationFrames
      );
      if (finalScene) {
        onSelectScene(finalScene.index, false);
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [isScrubbing, calculateFrameFromClientX, currentFrame, items, onSeek, onSelectScene, scrubFrame]);

  const gridGuideLines = useMemo(() => {
    const totalSec = totalFrames / fps;
    if (totalSec <= 0) return null;
    const count = Math.ceil(totalSec) + 1;
    return Array.from({ length: count }).map((_, sec) => {
      const isMajor = sec % 5 === 0;
      const leftPercent = (sec / totalSec) * 100;
      if (leftPercent > 100) return null;
      return (
        <div
          key={sec}
          className={`absolute top-0 bottom-0 pointer-events-none ${
            isMajor
              ? "w-[1px] bg-zinc-700/35 border-r border-dashed border-zinc-600/25"
              : "w-[1px] bg-zinc-800/20"
          }`}
          style={{ left: `${leftPercent}%` }}
        />
      );
    });
  }, [totalFrames, fps]);

  return (
    <div
      className={`rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-xl space-y-3 ${className}`}
    >
      {/* Timeline Controls Header */}
      <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
              Multi-Track Timeline
            </h4>
            <p className="text-[10px] text-zinc-400">
              {items.length} scenes • {(totalFrames / fps).toFixed(1)}s total
            </p>
          </div>
        </div>

        {/* Action Buttons: Zoom, Add, Split, Delete */}
        <div className="flex items-center gap-2">
          {/* Zoom */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoom <= 1.0}
              title="Zoom Out"
              className="p-1 text-zinc-400 hover:text-white disabled:opacity-30"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="font-mono text-[10px] px-1 text-zinc-400">{zoom}x</span>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoom >= 3.0}
              title="Zoom In"
              className="p-1 text-zinc-400 hover:text-white disabled:opacity-30"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Add Scene */}
          {onAddScene && (
            <button
              type="button"
              onClick={onAddScene}
              className="flex items-center gap-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Scene</span>
            </button>
          )}

          {/* Split Scene */}
          {onSplitScene && selectedSceneIndex !== null && selectedSceneIndex >= 0 && selectedSceneIndex < 900 && (
            <button
              type="button"
              onClick={() => onSplitScene(selectedSceneIndex)}
              className="flex items-center gap-1 rounded-lg bg-zinc-900 border border-zinc-800 px-2 py-1 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800"
            >
              <Scissors className="h-3.5 w-3.5" />
              <span>Split</span>
            </button>
          )}

          {/* Reorder Buttons (Move Earlier / Later) */}
          {onReorderScene && selectedSceneIndex !== null && selectedSceneIndex >= 0 && selectedSceneIndex < 900 && (
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5" title="Reorder selected scene in sequence">
              <button
                type="button"
                onClick={() => onReorderScene(selectedSceneIndex, selectedSceneIndex - 1)}
                disabled={selectedSceneIndex <= 0}
                title="Move Scene Earlier (Shift Left)"
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-zinc-300 hover:text-cyan-400 hover:bg-zinc-800 rounded disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3 w-3" />
                <span className="text-[10px] hidden sm:inline font-semibold">Earlier</span>
              </button>
              <div className="w-[1px] h-3 bg-zinc-800 my-auto" />
              <button
                type="button"
                onClick={() => onReorderScene(selectedSceneIndex, selectedSceneIndex + 1)}
                disabled={selectedSceneIndex >= (items.filter((it) => it.index >= 0 && it.index < 900).length - 1)}
                title="Move Scene Later (Shift Right)"
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-zinc-300 hover:text-cyan-400 hover:bg-zinc-800 rounded disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
              >
                <span className="text-[10px] hidden sm:inline font-semibold">Later</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* Reorder Storyboard Modal Trigger */}
          {onOpenReorderModal && (
            <button
              type="button"
              onClick={onOpenReorderModal}
              title="Open Storyboard Scene Reorder Modal"
              className="flex items-center gap-1 rounded-lg bg-zinc-900 border border-zinc-800 px-2 py-1 text-xs font-medium text-zinc-300 hover:text-cyan-400 hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <LayoutList className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-[11px] hidden md:inline font-semibold">Reorder Storyboard</span>
            </button>
          )}

          {/* Delete Scene */}
          {onDeleteScene && selectedSceneIndex !== null && selectedSceneIndex >= 0 && selectedSceneIndex < 900 && (
            <button
              type="button"
              onClick={() => onDeleteScene(selectedSceneIndex)}
              className="flex items-center gap-1 rounded-lg bg-red-500/10 border border-red-500/30 px-2 py-1 text-xs font-medium text-red-400 hover:bg-red-500/20"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Scene Track Container */}
      <div className="relative rounded-xl border border-zinc-800/80 bg-zinc-900/30 overflow-x-auto select-none p-2 space-y-1">
        <div
          ref={trackContainerRef}
          onPointerDown={handlePointerDown}
          className="relative min-w-[600px] cursor-pointer select-none"
          style={{ width: zoom > 1.0 ? `${zoom * 100}%` : "100%" }}
        >
          {/* Time Ruler with seconds (0s, 5s, 10s...) matching News Studio */}
          <TimelineRuler
            totalDurationFrames={totalFrames}
            fps={fps}
            zoom={zoom}
          />

          {/* Track 1: Visual Scene Blocks Track */}
          <div className="relative w-full h-20 overflow-hidden bg-zinc-950/40 rounded-lg border border-zinc-800/60">
            {/* Background Grid Guide Lines aligned with ruler (memoized) */}
            <div className="absolute inset-0 pointer-events-none select-none z-0 overflow-hidden">
              {gridGuideLines}
            </div>

            {items.map((item) => (
              <SceneBlock
                key={item.id}
                item={item}
                totalDurationFrames={totalFrames}
                fps={fps}
                isSelected={selectedSceneIndex === item.index}
                onSelect={handleSelectSceneBlock}
                onTrimDuration={handleTrim}
                onTrimStart={handleTrimStart}
                onSplit={onSplitScene}
                onMerge={onMergeScene}
                onDelete={onDeleteScene}
              />
            ))}
          </div>

          {/* Draggable Playhead Needle across ruler & track */}
          <TimelinePlayhead
            currentFrame={scrubFrame ?? currentFrame}
            totalDurationFrames={totalFrames}
            fps={fps}
            onSeek={onSeek}
            isScrubbing={isScrubbing}
            controlled={true}
          />
        </div>
      </div>
    </div>
  );
}

export const UnifiedTimeline = React.memo(UnifiedTimelineComponent);
