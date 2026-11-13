"use client";

import React, { useState } from "react";
import {
  Camera,
  ZoomIn,
  ZoomOut,
  ArrowLeft,
  ArrowRight,
  Maximize,
  MoveUp,
  Film,
  ChevronDown,
} from "lucide-react";

export interface KinematicCameraToolbarProps {
  cameraCue?: string;
  onChangeCameraCue: (cue: string) => void;
  transitionType?: string;
  onChangeTransitionType?: (transition: string) => void;
  disabled?: boolean;
  className?: string;
  defaultCollapsed?: boolean;
}

interface CueOption {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const CAMERA_CUES: CueOption[] = [
  { id: "zoom_in", label: "Push In / Zoom", icon: ZoomIn, description: "Slow dramatic push into subject" },
  { id: "zoom_out", label: "Pull Out / Reveal", icon: ZoomOut, description: "Smooth backward pull to reveal scene" },
  { id: "pan_left", label: "Pan Left", icon: ArrowLeft, description: "Lateral tracking shot to the left" },
  { id: "pan_right", label: "Pan Right", icon: ArrowRight, description: "Lateral tracking shot to the right" },
  { id: "close_up", label: "Hero Close-Up", icon: Maximize, description: "Tight punch-in for emotional focus" },
  { id: "pedestal_up", label: "Pedestal Up", icon: MoveUp, description: "Elevating camera crane motion" },
];

const TRANSITION_OPTIONS = [
  { id: "fade", label: "Cross-Dissolve", icon: "✨" },
  { id: "slide", label: "Lateral Slide", icon: "➡️" },
  { id: "zoom", label: "Whip Zoom", icon: "🔍" },
  { id: "wipe", label: "Before/After Wipe", icon: "⚡" },
  { id: "glitch", label: "Digital Glitch", icon: "👾" },
  { id: "cut", label: "Hard Cut", icon: "✂️" },
];

export function KinematicCameraToolbar({
  cameraCue = "zoom_in",
  onChangeCameraCue,
  transitionType = "fade",
  onChangeTransitionType,
  disabled = false,
  className = "",
  defaultCollapsed = true,
}: KinematicCameraToolbarProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const activeCue = CAMERA_CUES.find((c) => c.id === cameraCue) || CAMERA_CUES[0];
  const activeTrans = TRANSITION_OPTIONS.find((t) => t.id === transitionType) || TRANSITION_OPTIONS[0];
  const ActiveIcon = activeCue.icon;

  if (isCollapsed) {
    return (
      <div
        className={`rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 backdrop-blur-md flex items-center justify-between gap-3 ${className}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Camera className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                Kinematic Camera
              </h4>
              <span className="text-[10px] font-mono text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-500/30 shrink-0 flex items-center gap-1">
                <ActiveIcon className="h-3 w-3" />
                {activeCue.label}
              </span>
              {onChangeTransitionType && (
                <span className="text-[10px] font-mono text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-500/30 shrink-0 hidden sm:inline-flex items-center gap-1">
                  <span>{activeTrans.icon}</span>
                  {activeTrans.label}
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400 truncate mt-0.5">
              Procedural Ken Burns motion & scene transition dynamics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            aria-label="Expand kinematic camera motion panel"
            className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 backdrop-blur-md space-y-4 ${className}`}
    >
      {/* 1. Camera Motion Cues */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Camera className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-zinc-100">Kinematic Camera Motion</h4>
              <p className="text-[11px] text-zinc-400">
                Procedural Ken Burns pan & zoom directives for Remotion
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            aria-label="Collapse kinematic camera panel"
            className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronDown className="h-4 w-4 rotate-180" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
          {CAMERA_CUES.map((cue) => {
            const isSelected = cameraCue === cue.id;
            const Icon = cue.icon;

            return (
              <button
                key={cue.id}
                type="button"
                disabled={disabled}
                onClick={() => onChangeCameraCue(cue.id)}
                className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition-all ${
                  isSelected
                    ? "border-blue-500 bg-blue-500/10 shadow-sm ring-1 ring-blue-500/40"
                    : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/80"
                } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <div
                  className={`p-1.5 rounded-md ${
                    isSelected ? "bg-blue-500 text-black" : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-zinc-200 leading-snug">
                    {cue.label}
                  </div>
                  <div className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">
                    {cue.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Scene Transition Cues */}
      {onChangeTransitionType && (
        <div className="pt-3 border-t border-zinc-800/80 space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Film className="h-3.5 w-3.5" />
            </div>
            <div>
              <h5 className="text-xs font-semibold text-zinc-200">
                Incoming Scene Transition
              </h5>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {TRANSITION_OPTIONS.map((trans) => {
              const isSelected = transitionType === trans.id;

              return (
                <button
                  key={trans.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChangeTransitionType(trans.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                    isSelected
                      ? "border-purple-500 bg-purple-500/15 text-purple-200 ring-1 ring-purple-500/40"
                      : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                  }`}
                >
                  <span>{trans.icon}</span>
                  <span>{trans.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
