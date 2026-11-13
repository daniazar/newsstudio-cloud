"use client";

import React from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Repeat,
  Volume2,
  VolumeX,
  Maximize2,
  Clock,
} from "lucide-react";
import { formatTimecode } from "../hooks/usePlayerTransport";

export interface PlayerTransportControlsProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  currentFrame: number;
  totalDurationFrames: number;
  fps?: number;
  onSeekFrame: (frame: number) => void;
  onStepFrame?: (delta: number) => void;
  isLooping?: boolean;
  onToggleLoop?: () => void;
  playbackSpeed?: number;
  onChangePlaybackSpeed?: (speed: number) => void;
  isMuted?: boolean;
  onToggleMute?: () => void;
  onToggleFullScreen?: () => void;
  className?: string;
}

function PlayerTransportControlsComponent({
  isPlaying,
  onTogglePlay,
  currentFrame,
  totalDurationFrames,
  fps = 30,
  onSeekFrame,
  onStepFrame,
  isLooping = false,
  onToggleLoop,
  playbackSpeed = 1.0,
  onChangePlaybackSpeed,
  isMuted = false,
  onToggleMute,
  onToggleFullScreen,
  className = "",
}: PlayerTransportControlsProps) {
  const currentTimecode = formatTimecode(currentFrame, fps);
  const totalTimecode = formatTimecode(totalDurationFrames, fps);

  const handleStep = (delta: number) => {
    if (onStepFrame) {
      onStepFrame(delta);
    } else {
      onSeekFrame(Math.max(0, Math.min(totalDurationFrames, currentFrame + delta)));
    }
  };

  const SPEED_OPTIONS = [0.5, 1.0, 1.5, 2.0];

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950/80 px-4 py-2.5 backdrop-blur-md ${className}`}
    >
      {/* 1. Timecode Counter */}
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-emerald-400" />
        <div className="flex items-center gap-1 font-mono text-xs">
          <span className="font-bold text-zinc-100">{currentTimecode}</span>
          <span className="text-zinc-600">/</span>
          <span className="text-zinc-400">{totalTimecode}</span>
        </div>
        <span className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500 border border-zinc-800">
          F:{currentFrame}
        </span>
      </div>

      {/* 2. Main Transport Control Buttons */}
      <div className="flex items-center gap-1">
        {/* Jump Start */}
        <button
          type="button"
          onClick={() => onSeekFrame(0)}
          title="Jump to Start (Home)"
          className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-white transition-colors"
        >
          <SkipBack className="h-4 w-4" />
        </button>

        {/* Step Backward 1 Frame */}
        <button
          type="button"
          onClick={() => handleStep(-1)}
          title="Step 1 Frame Backward (Left Arrow)"
          className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-white transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Play / Pause Primary Button */}
        <button
          type="button"
          onClick={onTogglePlay}
          title={isPlaying ? "Pause (Space)" : "Play (Space)"}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-black shadow-md shadow-emerald-950/60 hover:bg-emerald-400 transition-transform active:scale-95"
        >
          {isPlaying ? (
            <Pause className="h-4 w-4 fill-current" />
          ) : (
            <Play className="h-4 w-4 fill-current ml-0.5" />
          )}
        </button>

        {/* Step Forward 1 Frame */}
        <button
          type="button"
          onClick={() => handleStep(1)}
          title="Step 1 Frame Forward (Right Arrow)"
          className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-white transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* Jump End */}
        <button
          type="button"
          onClick={() => onSeekFrame(Math.max(0, totalDurationFrames - 1))}
          title="Jump to End (End)"
          className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-white transition-colors"
        >
          <SkipForward className="h-4 w-4" />
        </button>
      </div>

      {/* 3. Utility Toggles: Loop, Speed, Audio Mute, Full Screen */}
      <div className="flex items-center gap-2">
        {/* Speed Chips */}
        {onChangePlaybackSpeed && (
          <div className="flex items-center rounded-lg border border-zinc-800 bg-zinc-900/60 p-0.5 text-[10px]">
            {SPEED_OPTIONS.map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => onChangePlaybackSpeed(spd)}
                className={`px-1.5 py-0.5 rounded font-mono font-medium transition-colors ${
                  playbackSpeed === spd
                    ? "bg-zinc-800 text-emerald-400 font-bold"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        )}

        {/* Loop Toggle */}
        {onToggleLoop && (
          <button
            type="button"
            onClick={onToggleLoop}
            title={isLooping ? "Disable Loop" : "Enable Loop"}
            className={`rounded-lg p-1.5 transition-colors ${
              isLooping
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
            }`}
          >
            <Repeat className="h-4 w-4" />
          </button>
        )}

        {/* Mute Toggle */}
        {onToggleMute && (
          <button
            type="button"
            onClick={onToggleMute}
            title={isMuted ? "Unmute" : "Mute"}
            className={`rounded-lg p-1.5 transition-colors ${
              isMuted
                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
            }`}
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        )}

        {/* Fullscreen */}
        {onToggleFullScreen && (
          <button
            type="button"
            onClick={onToggleFullScreen}
            title="Full Screen Viewport"
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-white transition-colors"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export const PlayerTransportControls = React.memo(PlayerTransportControlsComponent);
