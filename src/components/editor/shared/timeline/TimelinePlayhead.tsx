"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";

export interface TimelinePlayheadProps {
  currentFrame: number;
  totalDurationFrames: number;
  fps?: number;
  onSeek?: (frame: number, isScrubbing?: boolean) => void;
  isScrubbing?: boolean;
  controlled?: boolean;
  timelineWidthPx?: number;
  className?: string;
}

function TimelinePlayheadComponent({
  currentFrame,
  totalDurationFrames,
  fps = 30,
  onSeek,
  isScrubbing: externalIsScrubbing,
  controlled = false,
  className = "",
}: TimelinePlayheadProps) {
  const [internalIsScrubbing, setInternalIsScrubbing] = useState(false);
  const isScrubbing = controlled ? Boolean(externalIsScrubbing) : internalIsScrubbing;

  const headRef = useRef<HTMLDivElement>(null);
  const cachedParentRectRef = useRef<{ left: number; width: number } | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const pendingClientXRef = useRef<number | null>(null);

  const percent = totalDurationFrames > 0
    ? Math.max(0, Math.min(100, (currentFrame / totalDurationFrames) * 100))
    : 0;

  const seekAtClientX = useCallback(
    (clientX: number, dragging: boolean) => {
      let rect = cachedParentRectRef.current;
      if (!rect) {
        const parent = headRef.current?.parentElement;
        if (!parent || totalDurationFrames <= 0) return;
        const r = parent.getBoundingClientRect();
        rect = { left: r.left, width: r.width };
        cachedParentRectRef.current = rect;
      }
      if (!rect || rect.width <= 0) return;

      const clickX = clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, clickX / rect.width));
      const targetFrame = Math.round(ratio * totalDurationFrames);
      onSeek?.(targetFrame, dragging);
    },
    [totalDurationFrames, onSeek]
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    // If controlled by parent (like UnifiedTimeline), allow pointerdown to bubble to parent's track container
    if (controlled) {
      return;
    }

    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.stopPropagation();
    e.preventDefault();

    const parent = headRef.current?.parentElement;
    if (parent) {
      const r = parent.getBoundingClientRect();
      cachedParentRectRef.current = { left: r.left, width: r.width };
    }

    setInternalIsScrubbing(true);
    seekAtClientX(e.clientX, true);
  };

  useEffect(() => {
    if (controlled || !internalIsScrubbing) return;

    const handlePointerMove = (e: PointerEvent) => {
      pendingClientXRef.current = e.clientX;
      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(() => {
          rafIdRef.current = null;
          if (pendingClientXRef.current !== null) {
            seekAtClientX(pendingClientXRef.current, true);
          }
        });
      }
    };

    const handlePointerUp = () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (pendingClientXRef.current !== null) {
        seekAtClientX(pendingClientXRef.current, false);
        pendingClientXRef.current = null;
      }
      cachedParentRectRef.current = null;
      setInternalIsScrubbing(false);
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
  }, [controlled, internalIsScrubbing, seekAtClientX]);

  const sec = Math.floor(currentFrame / fps);
  const frames = Math.floor(currentFrame % fps);
  const timecode = `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}:${String(frames).padStart(2, "0")}`;

  return (
    <div
      ref={headRef}
      onPointerDown={handlePointerDown}
      className={`absolute top-0 bottom-0 z-40 flex flex-col items-center pointer-events-auto cursor-ew-resize -translate-x-1/2 select-none ${className}`}
      style={{ left: `${percent}%` }}
    >
      {/* Playhead Diamond Head */}
      <div className="group relative flex items-center justify-center cursor-ew-resize py-0.5">
        <div className="h-4 w-3.5 bg-red-500 rounded-t-sm shadow-md shadow-red-950/80 [clip-path:polygon(0%_0%,100%_0%,100%_70%,50%_100%,0%_70%)] hover:scale-110 active:scale-95 transition-transform" />

        {/* Floating Timecode Tooltip */}
        {isScrubbing && (
          <div className="absolute -top-7 rounded bg-red-600 px-1.5 py-0.5 font-mono text-[9px] font-bold text-white shadow-lg whitespace-nowrap z-50 pointer-events-none">
            {timecode}
          </div>
        )}
      </div>

      {/* Red Vertical Needle Line with invisible wide hit target */}
      <div className="relative h-full flex items-center justify-center cursor-ew-resize w-4 -mx-1.5">
        <div className="h-full w-[1.5px] bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] pointer-events-none" />
      </div>
    </div>
  );
}

export const TimelinePlayhead = React.memo(TimelinePlayheadComponent);
