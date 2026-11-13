import React, { useState, useRef, useCallback } from "react";
import { UseModernTtsReturn } from "./useModernTts";
import { VoiceParams, DEFAULT_VOICE_PARAMS } from "./personas";

export interface BatchState {
  isBatching: boolean;
  batchTotal: number;
  batchDone: number;
  batchCurrentScene: string;
  batchResults: Record<number, "pending" | "generating" | "done" | "cached" | "error">;
  blobMap: Record<number, Blob>;
}

export interface BatchSegment {
  index: number;
  text?: string;
  dialogue?: string;
  spokenText?: string;
  voiceParams?: unknown;
  audioPath?: string;
  presenterVideoPath?: string;
  presenterVideoSrc?: string;
  [key: string]: unknown;
}

async function getAudioDuration(blob: Blob): Promise<number> {
  if (typeof window === "undefined") return 0;
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return 0;
  
  const audioContext = new AudioContextClass();
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    return audioBuffer.duration;
  } catch (e) {
    console.error("Failed to decode audio duration", e);
    return 0;
  } finally {
    audioContext.close();
  }
}

export function useBatchGeneration(tts: UseModernTtsReturn) {
  const [isBatching, setIsBatching] = useState(false);
  const [batchTotal, setBatchTotal] = useState(0);
  const [batchDone, setBatchDone] = useState(0);
  const [batchCurrentScene, setBatchCurrentScene] = useState<string>("");
  const [batchResults, setBatchResults] = useState<Record<number, "pending" | "generating" | "done" | "cached" | "error">>({});
  const [blobMap, setBlobMap] = useState<Record<number, Blob>>({});
  const batchCancelRef = useRef(false);
  const globalNotifIdRef = useRef<string | null>(null);

  const runBatch = useCallback(async (
    segmentsToRun: BatchSegment[],
    getPersonaIdForSegment: (seg: BatchSegment) => string,
    activeParams: VoiceParams = DEFAULT_VOICE_PARAMS,
    onDurationUpdate?: (segIndex: number, duration: number) => void,
    onAudioGenerated?: (segIndex: number, blob: Blob) => Promise<void>
  ) => {
    if (segmentsToRun.length === 0) return;

    batchCancelRef.current = false;
    setIsBatching(true);
    setBatchTotal(segmentsToRun.length);
    setBatchDone(0);

    const initialResults: Record<number, "pending"> = {};
    segmentsToRun.forEach((s) => (initialResults[s.index] = "pending"));
    setBatchResults((prev) => ({ ...prev, ...initialResults }));

    try {
      const res = await fetch("/api/notifications/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          title: "Generating Voice Audio",
          message: `Batch generating ${segmentsToRun.length} scenes...`,
          total: segmentsToRun.length
        })
      });
      if (res.ok) {
        const data = await res.json();
        globalNotifIdRef.current = data.id;
      }
    } catch (e) {
      console.warn("Failed to start global notification", e);
    }

    for (let i = 0; i < segmentsToRun.length; i++) {
      if (batchCancelRef.current) break;

      // Ping heartbeat to keep servers alive during long batch generations
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("app-activity"));
      }

      const seg = segmentsToRun[i];
      const previewText = (seg.text || seg.spokenText || seg.dialogue || "").slice(0, 40);
      setBatchCurrentScene(`Scene ${seg.index + 1}: "${previewText}…"`);
      setBatchResults((prev) => ({ ...prev, [seg.index]: "generating" }));

      const personaId = getPersonaIdForSegment(seg);
      
      // Use segment-specific params if they exist, otherwise fallback to activeParams
      let params = activeParams;
      if (seg.voiceParams) {
        try {
          params = typeof seg.voiceParams === 'string' 
            ? JSON.parse(seg.voiceParams) 
            : (seg.voiceParams as VoiceParams);
        } catch (e) {
          console.warn(`[Batch] Failed to parse voiceParams for scene ${seg.index}`, e);
        }
      }

      try {
        const textToSpeak = seg.spokenText?.trim() || seg.text || seg.dialogue || "";
        const blob = await tts.generateAudio(`scene-${seg.index}`, textToSpeak, personaId, params);
        if (blob) {
          setBlobMap((prev) => ({ ...prev, [seg.index]: blob }));
          setBatchResults((prev) => ({ ...prev, [seg.index]: "done" }));
          
          // Detect duration and notify
          const duration = await getAudioDuration(blob);
          if (duration > 0) {
            onDurationUpdate?.(seg.index, duration);
          }

          // Trigger upload if callback provided
          if (onAudioGenerated) {
            await onAudioGenerated(seg.index, blob);
          }
        } else {
          setBatchResults((prev) => ({ ...prev, [seg.index]: "error" }));
        }
      } catch {
        setBatchResults((prev) => ({ ...prev, [seg.index]: "error" }));
      }

      setBatchDone(i + 1);
      
      if (globalNotifIdRef.current) {
        try {
          await fetch("/api/notifications/progress", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "update",
              id: globalNotifIdRef.current,
              progress: i + 1,
              message: `Generated ${i + 1}/${segmentsToRun.length} scenes`
            })
          });
        } catch { /* silent fail */ }
      }
    }

    if (globalNotifIdRef.current && !batchCancelRef.current) {
      try {
        await fetch("/api/notifications/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "finish",
            id: globalNotifIdRef.current,
            message: `Successfully generated ${segmentsToRun.length} scenes' audio.`,
            success: true
          })
        });
      } catch {}
      globalNotifIdRef.current = null;
    }

    setIsBatching(false);
    setBatchCurrentScene("");
  }, [tts]);

  const cancelBatch = useCallback(async () => {
    batchCancelRef.current = true;
    tts.cancelGeneration();
    setIsBatching(false);
    if (globalNotifIdRef.current) {
      try {
        await fetch("/api/notifications/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "finish",
            id: globalNotifIdRef.current,
            message: "Generation was cancelled.",
            success: false
          })
        });
      } catch {}
      globalNotifIdRef.current = null;
    }
  }, [tts]);

  const clearSceneCache = useCallback(async (segIndex: number, text: string, params: VoiceParams) => {
    await tts.deleteCacheEntry(`scene-${segIndex}`, text, params);
    setBlobMap((prev) => {
      const next = { ...prev };
      delete next[segIndex];
      return next;
    });
    setBatchResults((prev) => {
      const next = { ...prev };
      delete next[segIndex];
      return next;
    });
  }, [tts]);

  const initCache = useCallback(async (
    segments: BatchSegment[], 
    activeParams: VoiceParams,
    onDurationUpdate?: (segIndex: number, duration: number) => void,
    onAudioGenerated?: (segIndex: number, blob: Blob) => Promise<void>
  ) => {
    const newBlobMap: Record<number, Blob> = {};
    const newBatchResults: Record<number, "pending" | "generating" | "done" | "cached" | "error"> = {};
    for (const seg of segments) {
      if (seg.index < 0 || !seg.text?.trim()) continue;
      
      // Use segment-specific params if they exist, otherwise fallback to activeParams
      let params = activeParams;
      if (seg.voiceParams) {
        try {
          params = typeof seg.voiceParams === 'string' 
            ? JSON.parse(seg.voiceParams) 
            : (seg.voiceParams as VoiceParams);
        } catch (e) {
          console.warn(`[Batch] Failed to parse voiceParams for scene ${seg.index}`, e);
        }
      }

      const blob = await tts.checkCacheEntry(seg.text, params);
      if (blob) {
        newBlobMap[seg.index] = blob;
        newBatchResults[seg.index] = "cached";
        
        // Also check duration for already cached items to ensure sync
        const duration = await getAudioDuration(blob);
        if (duration > 0) {
          onDurationUpdate?.(seg.index, duration);
        }

        // Trigger upload if callback provided (for sync with production)
        if (onAudioGenerated) {
          await onAudioGenerated(seg.index, blob);
        }
      } else if (seg.audioPath || seg.presenterVideoPath || seg.presenterVideoSrc) {
        // If it's already generated and stored in the database, mark it as cached
        // so the UI knows we don't need to generate it again.
        newBatchResults[seg.index] = "cached";
      }
    }
    setBlobMap((prev) => ({ ...prev, ...newBlobMap }));
    setBatchResults((prev) => ({ ...prev, ...newBatchResults }));
  }, [tts]);

  return React.useMemo(() => ({
    isBatching,
    batchTotal,
    batchDone,
    batchCurrentScene,
    batchResults,
    blobMap,
    runBatch,
    cancelBatch,
    clearSceneCache,
    initCache,
    setBlobMap,
    setBatchResults,
  }), [
    isBatching,
    batchTotal,
    batchDone,
    batchCurrentScene,
    batchResults,
    blobMap,
    runBatch,
    cancelBatch,
    clearSceneCache,
    initCache,
  ]);
}
