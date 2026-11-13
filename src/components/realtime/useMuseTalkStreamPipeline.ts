"use client";

import { useState, useRef, useCallback } from "react";
import { SubvideoChunk } from "./ContinuousVideoQueuePlayer";

export interface StreamBeatInput {
  id?: string;
  text?: string;
  avatarId: string;
  durationSec?: number;
}

export interface StreamPipelineMetrics {
  ttfbMs: number | null;
  totalDurationMs: number | null;
  chunksReceived: number;
  totalBeats: number;
  fps: number | null;
}

export function useMuseTalkStreamPipeline() {
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [subvideoQueue, setSubvideoQueue] = useState<SubvideoChunk[]>([]);
  const [currentPlayingChunk, setCurrentPlayingChunk] = useState<SubvideoChunk | null>(null);
  const [metrics, setMetrics] = useState<StreamPipelineMetrics>({
    ttfbMs: null,
    totalDurationMs: null,
    chunksReceived: 0,
    totalBeats: 0,
    fps: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const startTimeRef = useRef<number>(0);

  const startStream = useCallback(async (beats: StreamBeatInput[], personaId: string = "ruby") => {
    // Reset state
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsStreaming(true);
    setSubvideoQueue([]);
    startTimeRef.current = performance.now();
    setMetrics({
      ttfbMs: null,
      totalDurationMs: null,
      chunksReceived: 0,
      totalBeats: beats.length,
      fps: null,
    });

    try {
      const response = await fetch("/api/presenter/stream-pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaId,
          beats,
          chunkMode: "progressive_2s",
          fps: 25,
        }),
        signal: abortController.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`Failed to initialize stream: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let chunksCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);

            if (event.type === "chunk_ready") {
              chunksCount += 1;
              const now = performance.now();
              const ttfb = chunksCount === 1 ? Math.round(now - startTimeRef.current) : undefined;

              const chunk: SubvideoChunk = {
                id: event.beatId,
                beatIndex: event.beatIndex,
                avatarId: event.avatarId,
                videoUrl: event.videoUrl,
                durationSec: event.durationSec,
                genDurationMs: event.genDurationMs,
              };

              setSubvideoQueue((prev) => [...prev, chunk]);
              setMetrics((prev) => ({
                ...prev,
                chunksReceived: chunksCount,
                ttfbMs: ttfb !== undefined ? ttfb : prev.ttfbMs,
                fps: event.serverFps || prev.fps || 105,
              }));
            } else if (event.type === "stream_complete") {
              const totalDuration = Math.round(performance.now() - startTimeRef.current);
              setMetrics((prev) => ({
                ...prev,
                totalDurationMs: totalDuration,
              }));
            }
          } catch (jsonErr) {
            console.warn("NDJSON parsing error:", jsonErr);
          }
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name !== "AbortError") {
        console.error("Stream error:", err);
      }
    } finally {
      setIsStreaming(false);
    }
  }, []);

  const stopStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  return {
    isStreaming,
    subvideoQueue,
    currentPlayingChunk,
    metrics,
    startStream,
    stopStream,
    setCurrentPlayingChunk,
  };
}
