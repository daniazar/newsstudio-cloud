"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Repeat,
  Sparkles,
  Zap,
  Columns,
  Split,
  Sliders,
  User,
  Radio,
  AlertTriangle,
  Download,
  Loader2,
  } from "lucide-react";
import { TalkingHeadModelProfile } from "@/lib/ai/talkingHeadsClient";

interface ArenaComparisonStageProps {
  modelA: TalkingHeadModelProfile;
  modelB?: TalkingHeadModelProfile;
  isArenaMode: boolean;
  videoUrlA?: string | null;
  videoUrlB?: string | null;
  avatarSrc: string;
  audioSrc?: string | null;
  telemetryA?: { ttfbMs: number; latencyMs: number; fps: number };
  telemetryB?: { ttfbMs: number; latencyMs: number; fps: number };
  isGenerating: boolean;
  onResetDriver?: () => void;
  driverLabel?: string;
  errorA?: string | null;
  errorB?: string | null;
  onDownloadWeights?: (modelId: string) => void;
  isDownloadingWeights?: boolean;
}

export function ArenaComparisonStage({
  modelA,
  modelB,
  isArenaMode,
  videoUrlA,
  videoUrlB,
  avatarSrc,
  audioSrc,
  telemetryA,
  telemetryB,
  isGenerating,
  onResetDriver,
  driverLabel,
  errorA,
  errorB,
  onDownloadWeights,
  isDownloadingWeights,
}: ArenaComparisonStageProps) {
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<"side-by-side" | "wipe">("side-by-side");
  const [sliderPos, setSliderPos] = useState<number>(50); // 0 to 100%
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const videoRefA = useRef<HTMLVideoElement | null>(null);
  const videoRefB = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const isVideo = (url?: string | null): boolean => {
    if (!url) return false;
    return (
      url.endsWith(".mp4") ||
      url.endsWith(".webm") ||
      url.startsWith("data:video/") ||
      url.includes("/assets/action_loops/") ||
      url.includes("/assets/cache/conversational/") ||
      url.includes("/api/talking-heads/media/")
    );
  };

  const hasVideoA = isVideo(videoUrlA);
  const hasVideoB = isVideo(videoUrlB);

  const isModelAWeightsVerified = Boolean(
    modelA.weightsInstalled ||
    errorA?.toLowerCase().includes("installed and verified") ||
    errorA?.toLowerCase().includes("fully installed")
  );
  const isModelBWeightsVerified = Boolean(
    modelB?.weightsInstalled ||
    errorB?.toLowerCase().includes("installed and verified") ||
    errorB?.toLowerCase().includes("fully installed")
  );

  const togglePlay = () => {
    const nextPlay = !isPlaying;
    setIsPlaying(nextPlay);
    if (videoRefA.current && hasVideoA) {
      if (nextPlay) videoRefA.current.play().catch(() => {});
      else videoRefA.current.pause();
    }
    if (videoRefB.current && hasVideoB) {
      if (nextPlay) videoRefB.current.play().catch(() => {});
      else videoRefB.current.pause();
    }
    if (audioRef.current && audioSrc) {
      if (nextPlay) audioRef.current.play().catch(() => {});
      else audioRef.current.pause();
    }
  };

  const handleReplay = () => {
    if (videoRefA.current && hasVideoA) {
      videoRefA.current.currentTime = 0;
      videoRefA.current.play().catch(() => {});
    }
    if (videoRefB.current && hasVideoB) {
      videoRefB.current.currentTime = 0;
      videoRefB.current.play().catch(() => {});
    }
    if (audioRef.current && audioSrc) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
    setIsPlaying(true);
  };

  // Sync video and audio attributes
  useEffect(() => {
    if (videoRefA.current) {
      // If audioSrc is handled by dedicated audioRef, keep video muted to prevent audio doubling
      videoRefA.current.muted = audioSrc ? true : isMuted;
      videoRefA.current.loop = isLooping;
    }
    if (videoRefB.current) {
      videoRefB.current.muted = true;
      videoRefB.current.loop = isLooping;
    }
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
      audioRef.current.loop = isLooping;
    }
  }, [isMuted, isLooping, audioSrc]);

  // Restart playback when new video or audio arrives
  useEffect(() => {
    if (hasVideoA && videoRefA.current) {
      videoRefA.current.currentTime = 0;
      videoRefA.current.play().catch(() => {});
    }
    if (hasVideoB && videoRefB.current) {
      videoRefB.current.currentTime = 0;
      videoRefB.current.play().catch(() => {});
    }
    if (audioSrc && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
    setIsPlaying(true);
  }, [videoUrlA, videoUrlB, audioSrc, hasVideoA, hasVideoB]);

  // Keep playback time aligned
  const handleTimeUpdateA = () => {
    if (videoRefA.current) {
      const cur = videoRefA.current.currentTime;
      if (videoRefB.current) {
        const diff = Math.abs(cur - videoRefB.current.currentTime);
        if (diff > 0.15) videoRefB.current.currentTime = cur;
      }
      if (audioRef.current && audioSrc) {
        const diffA = Math.abs(cur - audioRef.current.currentTime);
        if (diffA > 0.15) audioRef.current.currentTime = cur;
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const pct = Math.round((x / rect.width) * 100);
    setSliderPos(pct);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const x = Math.max(0, Math.min(touch.clientX - rect.left, rect.width));
    const pct = Math.round((x / rect.width) * 100);
    setSliderPos(pct);
  };

  return (
    <div className="flex flex-col h-full bg-[#04060a] rounded-2xl border border-white/10 overflow-hidden shadow-2xl relative">
      {/* Hidden Synchronized Audio Track Element */}
      {audioSrc && (
        <audio
          ref={audioRef}
          src={audioSrc}
          preload="auto"
          onEnded={() => {
            if (!isLooping) setIsPlaying(false);
          }}
        />
      )}

      {/* Top Header Controls */}
      <div className="flex items-center justify-between px-5 py-3 bg-black/60 border-b border-white/10 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase text-white">
              {isArenaMode ? "Arena Comparison" : "Single Model Stage"}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-gray-300">
              {modelA.name} {isArenaMode && modelB ? `vs ${modelB.name}` : ""}
            </span>
            {hasVideoA && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                Lip-Sync Video
              </span>
            )}
            {!hasVideoA && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-950/80 border border-blue-500/40 text-blue-300 flex items-center gap-1">
                <User className="w-2.5 h-2.5" />
                Driver Portrait
              </span>
            )}
            {audioSrc && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-purple-950/80 border border-purple-500/40 text-purple-300 flex items-center gap-1">
                <Radio className="w-2.5 h-2.5 animate-pulse" />
                Audio Active
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Reset / View Driver Button */}
          {hasVideoA && onResetDriver && (
            <button
              onClick={onResetDriver}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white border border-white/10 text-[10px] font-mono transition-colors cursor-pointer"
              title="Return to selected still driver portrait"
            >
              <User className="w-3 h-3 text-emerald-400" />
              <span>Reset Driver</span>
            </button>
          )}
          {/* View Mode Toggle (Arena Mode Only) */}
          {isArenaMode && modelB && (
            <div className="flex items-center bg-black/40 border border-white/10 rounded-lg p-0.5 mr-2">
              <button
                onClick={() => setViewMode("side-by-side")}
                className={`px-2 py-1 rounded-md text-[10px] font-mono flex items-center gap-1 transition-colors ${
                  viewMode === "side-by-side"
                    ? "bg-white/15 text-white font-bold"
                    : "text-gray-400 hover:text-gray-200"
                }`}
                title="Side-by-side split screen"
              >
                <Columns className="w-3 h-3" />
                Side-by-Side
              </button>
              <button
                onClick={() => setViewMode("wipe")}
                className={`px-2 py-1 rounded-md text-[10px] font-mono flex items-center gap-1 transition-colors ${
                  viewMode === "wipe"
                    ? "bg-purple-600/80 text-white font-bold"
                    : "text-gray-400 hover:text-gray-200"
                }`}
                title="Interactive Wipe / Diff Slider"
              >
                <Split className="w-3 h-3" />
                Wipe Slider
              </button>
            </div>
          )}

          {/* Playback Action Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={togglePlay}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white transition-colors"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={handleReplay}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white transition-colors"
              title="Replay from start"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`p-1.5 rounded-lg transition-colors ${
                isMuted ? "bg-red-500/20 text-red-400" : "bg-white/5 hover:bg-white/15 text-gray-300"
              }`}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setIsLooping(!isLooping)}
              className={`p-1.5 rounded-lg transition-colors ${
                isLooping ? "bg-cyan-500/20 text-cyan-300" : "bg-white/5 hover:bg-white/15 text-gray-300"
              }`}
              title="Toggle Continuous Loop"
            >
              <Repeat className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Video Viewport */}
      {isArenaMode && modelB && viewMode === "wipe" ? (
        /* WIPE / SPLIT SLIDER MODE */
        <div
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => setIsDragging(false)}
          onTouchMove={handleTouchMove}
          className="flex-1 overflow-hidden p-4 flex items-center justify-center relative select-none cursor-ew-resize"
        >
          <div className="w-full h-full relative rounded-xl overflow-hidden border border-white/15 bg-black max-w-4xl max-h-[600px] flex items-center justify-center">
            {/* Model A View (Left Side / Full Base) */}
            {hasVideoA && videoUrlA ? (
              <video
                ref={videoRefA}
                src={videoUrlA}
                poster={avatarSrc}
                autoPlay
                playsInline
                loop={isLooping}
                muted={audioSrc ? true : isMuted}
                onTimeUpdate={handleTimeUpdateA}
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarSrc}
                alt="Model A Driver Portrait"
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              />
            )}

            {/* Model B View (Right Side - Clipped) */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                clipPath: `polygon(${sliderPos}% 0, 100% 0, 100% 100%, ${sliderPos}% 100%)`,
              }}
            >
              {hasVideoB && videoUrlB ? (
                <video
                  ref={videoRefB}
                  src={videoUrlB}
                  poster={avatarSrc}
                  autoPlay
                  playsInline
                  loop={isLooping}
                  muted={true}
                  className="w-full h-full object-contain pointer-events-none"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarSrc}
                  alt="Model B Driver Portrait"
                  className="w-full h-full object-contain pointer-events-none"
                />
              )}
            </div>

            {/* Vertical Divider Line & Handle */}
            <div
              className="absolute top-0 bottom-0 z-30 w-1 bg-white cursor-ew-resize flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.8)]"
              style={{ left: `${sliderPos}%` }}
              onMouseDown={() => setIsDragging(true)}
            >
              <div className="w-8 h-8 -ml-3.5 rounded-full bg-black/90 border-2 border-white flex items-center justify-center shadow-xl text-white text-[10px] font-mono font-bold tracking-tighter">
                ◫
              </div>
            </div>

            {/* Badges on left & right */}
            <div className="absolute top-4 left-4 z-20">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-cyan-950/90 text-cyan-300 border border-cyan-500/40 backdrop-blur-md">
                ◀ {modelA.name} ({sliderPos}%)
              </span>
            </div>
            <div className="absolute top-4 right-4 z-20">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-purple-950/90 text-purple-300 border border-purple-500/40 backdrop-blur-md">
                {modelB.name} ({100 - sliderPos}%) ▶
              </span>
            </div>

            {/* Generating Overlay */}
            {isGenerating && (
              <div className="absolute inset-0 z-40 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center gap-2 pointer-events-none">
                <Zap className="w-8 h-8 text-cyan-400 animate-bounce" />
                <span className="text-xs font-mono text-cyan-200">
                  Synthesizing Neural Lip-Sync across Arena Engines...
                </span>
              </div>
            )}

            {/* Slider bar control at bottom */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-72 px-3 py-1.5 rounded-full bg-black/80 border border-white/15 backdrop-blur-md flex items-center gap-2">
              <Sliders className="w-3 h-3 text-gray-400 shrink-0" />
              <input
                type="range"
                min={0}
                max={100}
                value={sliderPos}
                onChange={(e) => setSliderPos(Number(e.target.value))}
                className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <span className="text-[10px] font-mono text-gray-300 shrink-0 w-8 text-right">
                {sliderPos}%
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* SIDE-BY-SIDE MODE */
        <div className="flex-1 flex overflow-hidden p-4 gap-4 items-center justify-center relative">
          {/* Model A Container */}
          <div className="flex-1 h-full relative rounded-xl overflow-hidden border border-cyan-500/30 bg-black flex flex-col shadow-lg shadow-cyan-950/20">
            <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-cyan-950/90 text-cyan-300 border border-cyan-500/40 backdrop-blur-md">
                Model A: {modelA.name}
              </span>
              {telemetryA && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-black/70 text-gray-300 border border-white/10 backdrop-blur-md">
                  {telemetryA.latencyMs}ms • {telemetryA.fps} FPS
                </span>
              )}
            </div>

            {errorA ? (
              <div className="relative w-full h-full flex flex-col items-center justify-center p-6 bg-red-950/30 border border-red-500/30 text-center overflow-y-auto">
                <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center mb-3 shrink-0">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-red-300 mb-1">
                  Engine Generation Error
                </span>
                <span className="text-sm font-bold text-white mb-2">
                  {modelA.name}
                </span>
                <p className="text-xs text-gray-300 max-w-sm mb-4 bg-black/60 p-3 rounded-lg border border-white/10 font-mono text-left leading-relaxed">
                  {errorA}
                </p>
                {isModelAWeightsVerified ? (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-[11px] font-mono mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>Checkpoints Installed & Verified (/app/weights/{modelA.id})</span>
                  </div>
                ) : onDownloadWeights ? (
                  <button
                    onClick={() => onDownloadWeights(modelA.id)}
                    disabled={isDownloadingWeights}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-mono font-bold transition-all shadow-md cursor-pointer"
                  >
                    {isDownloadingWeights ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Downloading Weights in Docker...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>Download Weights in Docker</span>
                      </>
                    )}
                  </button>
                ) : null}
              </div>
            ) : hasVideoA && videoUrlA ? (
              <video
                ref={videoRefA}
                src={videoUrlA}
                poster={avatarSrc}
                autoPlay
                playsInline
                loop={isLooping}
                muted={audioSrc ? true : isMuted}
                onTimeUpdate={handleTimeUpdateA}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="relative w-full h-full flex items-center justify-center bg-black/40 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarSrc}
                  alt="Selected Anchor Driver"
                  className="w-full h-full object-contain select-none"
                />
                <div className="absolute bottom-4 left-4 z-20 px-2.5 py-1 rounded-full bg-black/70 border border-white/15 text-[10px] font-mono text-gray-300 backdrop-blur-md flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  <span>{driverLabel || "Input Driver Ready"}</span>
                </div>
              </div>
            )}

            {isGenerating && (
              <div className="absolute inset-0 z-30 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                <Zap className="w-8 h-8 text-cyan-400 animate-bounce" />
                <span className="text-xs font-mono text-cyan-200">
                  Synthesizing {modelA.name}...
                </span>
              </div>
            )}
          </div>

          {/* Model B Container */}
          {isArenaMode && modelB && (
            <div className="flex-1 h-full relative rounded-xl overflow-hidden border border-purple-500/30 bg-black flex flex-col shadow-lg shadow-purple-950/20">
              <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-purple-950/90 text-purple-300 border border-purple-500/40 backdrop-blur-md">
                  Model B: {modelB.name}
                </span>
                {telemetryB && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-black/70 text-gray-300 border border-white/10 backdrop-blur-md">
                    {telemetryB.latencyMs}ms • {telemetryB.fps} FPS
                  </span>
                )}
              </div>

              {errorB ? (
                <div className="relative w-full h-full flex flex-col items-center justify-center p-6 bg-purple-950/30 border border-purple-500/30 text-center overflow-y-auto">
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mb-3 shrink-0">
                    <AlertTriangle className="w-6 h-6 text-amber-400" />
                  </div>
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-300 mb-1">
                    Engine Generation Error
                  </span>
                  <span className="text-sm font-bold text-white mb-2">
                    {modelB.name}
                  </span>
                  <p className="text-xs text-gray-300 max-w-sm mb-4 bg-black/60 p-3 rounded-lg border border-white/10 font-mono text-left leading-relaxed">
                    {errorB}
                  </p>
                  {isModelBWeightsVerified ? (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-[11px] font-mono mb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>Checkpoints Installed & Verified (/app/weights/{modelB.id})</span>
                    </div>
                  ) : onDownloadWeights ? (
                    <button
                      onClick={() => onDownloadWeights(modelB.id)}
                      disabled={isDownloadingWeights}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-mono font-bold transition-all shadow-md cursor-pointer"
                    >
                      {isDownloadingWeights ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Downloading Weights in Docker...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          <span>Download Weights in Docker</span>
                        </>
                      )}
                    </button>
                  ) : null}
                </div>
              ) : hasVideoB && videoUrlB ? (
                <video
                  ref={videoRefB}
                  src={videoUrlB}
                  poster={avatarSrc}
                  autoPlay
                  playsInline
                  loop={isLooping}
                  muted={true}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="relative w-full h-full flex items-center justify-center bg-black/40 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={avatarSrc}
                    alt="Model B Driver"
                    className="w-full h-full object-contain select-none"
                  />
                  <div className="absolute bottom-4 left-4 z-20 px-2.5 py-1 rounded-full bg-black/70 border border-white/15 text-[10px] font-mono text-gray-300 backdrop-blur-md flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-purple-400" />
                    <span>{modelB.name} Ready to Infer</span>
                  </div>
                </div>
              )}

              {isGenerating && (
                <div className="absolute inset-0 z-30 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                  <Sparkles className="w-8 h-8 text-purple-400 animate-spin" />
                  <span className="text-xs font-mono text-purple-200">
                    Synthesizing {modelB.name}...
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Bottom Bar */}
      <div className="px-5 py-2.5 bg-black/80 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-gray-400">
        <div className="flex items-center gap-3">
          <span>Resolution: <span className="text-gray-200">{modelA.resolution}</span></span>
          <span>•</span>
          <span>Arch: <span className="text-gray-200">{modelA.architecture}</span></span>
        </div>
        <div className="flex items-center gap-2 text-cyan-400">
          <span>{isArenaMode && viewMode === "wipe" ? "Interactive Wipe Comparison Active" : "Dual-Stream Synchronized"}</span>
        </div>
      </div>
    </div>
  );
}
