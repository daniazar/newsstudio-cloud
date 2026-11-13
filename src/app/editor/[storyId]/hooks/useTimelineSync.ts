"use client";

import { useEffect, useRef } from "react";
import type { EditorSegment } from "./useStoryEditor";

interface UseTimelineSyncOptions {
  storyId: string;
  segments: EditorSegment[];
  onSegmentsRefreshed?: () => void;
}

const durationCache = new Map<string, number>();

async function probeMediaDuration(url: string): Promise<number | null> {
  if (durationCache.has(url)) {
    return durationCache.get(url)!;
  }

  return new Promise((resolve) => {
    const isVideo = url.endsWith(".mp4") || url.includes("video");
    const el = isVideo ? document.createElement("video") : document.createElement("audio");
    el.preload = "metadata";

    const cleanup = () => {
      el.onloadedmetadata = null;
      el.onerror = null;
      el.src = "";
    };

    el.onloadedmetadata = () => {
      const dur = isFinite(el.duration) ? el.duration : null;
      if (dur !== null) {
        durationCache.set(url, dur);
      }
      cleanup();
      resolve(dur);
    };

    el.onerror = () => {
      cleanup();
      resolve(null);
    };

    el.src = url;
  });
}

export function useTimelineSync({
  storyId,
  segments,
  onSegmentsRefreshed,
}: UseTimelineSyncOptions) {
  const isSyncingRef = useRef(false);
  const lastSyncSegmentCount = useRef<number>(0);

  useEffect(() => {
    if (!segments || segments.length === 0) return;
    if (segments.length === lastSyncSegmentCount.current && lastSyncSegmentCount.current > 0) return;
    if (isSyncingRef.current) return;

    let isMounted = true;
    isSyncingRef.current = true;
    lastSyncSegmentCount.current = segments.length;

    (async () => {
      let cumulativeDelta = 0;
      let needsBatchUpdate = false;
      const updatedSegments: { id: string; index: number; startTime: number; endTime: number }[] = [];

      for (const seg of segments) {
        const mediaUrl =
          seg.presenterVideoPath ||
          (seg.audioPath
            ? `${window.location.protocol}//${window.location.hostname}:9000/news-studio/${seg.audioPath}`
            : null);

        if (!mediaUrl) {
          if (Math.abs(cumulativeDelta) > 0.05) {
            needsBatchUpdate = true;
            updatedSegments.push({
              id: seg.id,
              index: seg.index,
              startTime: seg.startTime + cumulativeDelta,
              endTime: seg.endTime + cumulativeDelta,
            });
          }
          continue;
        }

        const realDuration = await probeMediaDuration(mediaUrl);
        if (!realDuration) {
          if (Math.abs(cumulativeDelta) > 0.05) {
            needsBatchUpdate = true;
            updatedSegments.push({
              id: seg.id,
              index: seg.index,
              startTime: seg.startTime + cumulativeDelta,
              endTime: seg.endTime + cumulativeDelta,
            });
          }
          continue;
        }

        const currentDuration = seg.endTime - seg.startTime;
        const segDelta = realDuration - currentDuration;

        if (Math.abs(segDelta) > 0.05 || Math.abs(cumulativeDelta) > 0.05) {
          needsBatchUpdate = true;
          const newStart = seg.startTime + cumulativeDelta;
          const newEnd = newStart + realDuration;

          updatedSegments.push({
            id: seg.id,
            index: seg.index,
            startTime: newStart,
            endTime: newEnd,
          });

          cumulativeDelta += segDelta;
        }
      }

      if (isMounted && needsBatchUpdate && updatedSegments.length > 0) {
        try {
          const res = await fetch(`/api/stories/${storyId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "reorder-segments",
              segments: updatedSegments,
            }),
          });

          if (res.ok) {
            onSegmentsRefreshed?.();
          }
        } catch (e) {
          console.error("[useTimelineSync] Batch duration update failed:", e);
        }
      }

      isSyncingRef.current = false;
    })();

    return () => {
      isMounted = false;
    };
  }, [segments, storyId, onSegmentsRefreshed]);
}
