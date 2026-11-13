"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { WebglChromaCompositor } from "@/lib/realtime/webglChromaCompositor";
import { getStudioBackgroundById } from "@/lib/realtime/studioBackgrounds";

export interface SubvideoChunk {
  id: string;
  beatIndex: number;
  avatarId: string;
  videoUrl: string;
  durationSec: number;
  text?: string;
  genDurationMs?: number;
}

interface ContinuousVideoQueuePlayerProps {
  queue: SubvideoChunk[];
  idleVideoSrc?: string;
  minBufferCount?: number;
  enableChroma?: boolean;
  studioBgId?: string;
  onChunkPlayed?: (chunk: SubvideoChunk) => void;
  onQueueEmpty?: () => void;
  className?: string;
  autoPlay?: boolean;
}

export function ContinuousVideoQueuePlayer({
  queue,
  idleVideoSrc = "/assets/action_loops/ruby_master_suite/ruby_idle.mp4",
  minBufferCount = 1,
  enableChroma = true,
  studioBgId = "panoramic_videowall",
  onChunkPlayed,
  onQueueEmpty,
  className = "",
  autoPlay = true,
}: ContinuousVideoQueuePlayerProps) {
  // Dual-Video Buffer State
  const [activeSlot, setActiveSlot] = useState<"A" | "B">("A");
  const [slotASrc] = useState<string>(idleVideoSrc);
  const [slotBSrc] = useState<string>("");
  const [isPlayingChunk, setIsPlayingChunk] = useState<boolean>(false);
  const [currentChunk, setCurrentChunk] = useState<SubvideoChunk | null>(null);

  // Playback & Queue Refs
  const videoRefA = useRef<HTMLVideoElement | null>(null);
  const videoRefB = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chromaCompositorRef = useRef<WebglChromaCompositor | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  const internalQueueRef = useRef<SubvideoChunk[]>([]);
  const currentChunkIndexRef = useRef<number>(-1);
  const isPlayingRef = useRef<boolean>(false);
  const enableChromaRef = useRef<boolean>(enableChroma);
  const studioBgRef = useRef(getStudioBackgroundById(studioBgId));

  useEffect(() => {
    enableChromaRef.current = enableChroma;
  }, [enableChroma]);

  useEffect(() => {
    const bg = getStudioBackgroundById(studioBgId);
    studioBgRef.current = bg;
    if (chromaCompositorRef.current) {
      chromaCompositorRef.current.loadBackground(bg.imageUrl);
    }
  }, [studioBgId]);

  // Advance to next chunk in queue
  const playNextInQueue = useCallback(() => {
    if (internalQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      setIsPlayingChunk(false);
      setCurrentChunk(null);

      const currentActiveVid = activeSlot === "A" ? videoRefA.current : videoRefB.current;
      if (currentActiveVid) {
        currentActiveVid.src = idleVideoSrc;
        currentActiveVid.loop = true;
        currentActiveVid.play().catch(() => {});
      }
      onQueueEmpty?.();
      return;
    }

    const nextChunk = internalQueueRef.current.shift()!;
    currentChunkIndexRef.current += 1;
    isPlayingRef.current = true;
    setIsPlayingChunk(true);
    setCurrentChunk(nextChunk);

    const nextSlot = activeSlot === "A" ? "B" : "A";
    const nextVideoEl = nextSlot === "A" ? videoRefA.current : videoRefB.current;
    const currentVideoEl = activeSlot === "A" ? videoRefA.current : videoRefB.current;

    if (nextVideoEl) {
      nextVideoEl.src = nextChunk.videoUrl;
      nextVideoEl.loop = false;
      nextVideoEl.currentTime = 0;

      nextVideoEl.oncanplay = () => {
        nextVideoEl
          .play()
          .then(() => {
            setActiveSlot(nextSlot);
            if (currentVideoEl) {
              currentVideoEl.pause();
            }
            onChunkPlayed?.(nextChunk);
          })
          .catch((e) => console.warn("Autoplay error on slot switch:", e));
        nextVideoEl.oncanplay = null;
      };

      nextVideoEl.onended = () => {
        playNextInQueue();
      };
    }
  }, [activeSlot, idleVideoSrc, onChunkPlayed, onQueueEmpty]);

  // Update internal queue ref when prop changes
  useEffect(() => {
    internalQueueRef.current = [...queue];

    if (!isPlayingRef.current && queue.length >= minBufferCount && autoPlay) {
      playNextInQueue();
    }
  }, [queue, minBufferCount, autoPlay, playNextInQueue]);

  // Initialize WebGL Chroma Compositor
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const compositor = new WebglChromaCompositor();
    const ok = compositor.init(canvas);
    if (ok) {
      chromaCompositorRef.current = compositor;
      compositor.loadBackground(studioBgRef.current.imageUrl);
    }

    return () => {
      if (chromaCompositorRef.current) {
        chromaCompositorRef.current.destroy();
        chromaCompositorRef.current = null;
      }
    };
  }, []);

  // WebGL 60 FPS Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderLoop = () => {
      const activeVideo = activeSlot === "A" ? videoRefA.current : videoRefB.current;
      if (activeVideo && activeVideo.readyState >= 2 && chromaCompositorRef.current) {
        if (activeVideo.videoWidth > 0 && activeVideo.videoHeight > 0) {
          if (canvas.width !== activeVideo.videoWidth || canvas.height !== activeVideo.videoHeight) {
            canvas.width = activeVideo.videoWidth;
            canvas.height = activeVideo.videoHeight;
          }
        }

        chromaCompositorRef.current.render(activeVideo, {
          enableChromaKey: enableChromaRef.current,
          keyColor: [0.05, 0.75, 0.22],
          similarity: 0.40,
          smoothness: 0.08,
          despillStrength: 0.95,
          lightingTone: studioBgRef.current.lightingTone,
        });
      }

      animFrameIdRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameIdRef.current = requestAnimationFrame(renderLoop);
    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
    };
  }, [activeSlot]);

  return (
    <div className={`relative w-full h-full overflow-hidden bg-black flex items-center justify-center ${className}`}>
      {/* Hidden Video Source Slot A */}
      <video
        ref={videoRefA}
        src={slotASrc}
        playsInline
        muted={false}
        autoPlay
        loop={!isPlayingChunk}
        crossOrigin="anonymous"
        className="opacity-0 pointer-events-none absolute -z-50 w-1 h-1"
      />

      {/* Hidden Video Source Slot B */}
      <video
        ref={videoRefB}
        src={slotBSrc}
        playsInline
        muted={false}
        crossOrigin="anonymous"
        className="opacity-0 pointer-events-none absolute -z-50 w-1 h-1"
      />

      {/* WebGL 60 FPS Composite Output Canvas */}
      <canvas
        ref={canvasRef}
        width={544}
        height={960}
        className="w-full h-full object-contain z-10"
      />

      {/* Active Gesture & Buffer HUD Overlay */}
      <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[11px] font-mono text-gray-300">
        <span
          className={`w-2 h-2 rounded-full ${
            isPlayingChunk ? "bg-emerald-400 animate-pulse" : "bg-cyan-400"
          }`}
        />
        <span>
          {isPlayingChunk && currentChunk
            ? `ACTIVE: ${currentChunk.avatarId} (Beat #${currentChunk.beatIndex + 1})`
            : "IDLE STANDBY LOOP"}
        </span>
        <span className="text-gray-500">|</span>
        <span className="text-cyan-400 font-bold">Buffer: {queue.length} ready</span>
      </div>
    </div>
  );
}
