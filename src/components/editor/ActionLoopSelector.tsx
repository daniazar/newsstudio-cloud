"use client";

import React, { useState } from "react";
import {
  ACTION_MATRIX_GESTURES,
  CAMERA_CUES,
  type CameraCue,
} from "@/lib/types";

interface ActionLoopSelectorProps {
  currentLoop?: string | null;
  currentCameraCue?: CameraCue | null;
  onSelectLoop: (loopId: string) => void;
  onSelectCameraCue: (cue: CameraCue) => void;
  personaId?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  "Core Base": "border-blue-500/30 bg-blue-500/10 text-blue-300",
  "Active Speech": "border-purple-500/30 bg-purple-500/10 text-purple-300",
  Presentation: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
  Editorial: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  Heartfelt: "border-pink-500/30 bg-pink-500/10 text-pink-300",
  "Breaking News": "border-red-500/30 bg-red-500/10 text-red-300",
  Closing: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
};

export const ActionLoopSelector: React.FC<ActionLoopSelectorProps> = ({
  currentLoop = "state_idle",
  currentCameraCue = "cam1_wide",
  onSelectLoop,
  onSelectCameraCue,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [_hoveredGesture, setHoveredGesture] = useState<string | null>(null);

  const categories = [
    "All",
    "Core Base",
    "Active Speech",
    "Presentation",
    "Editorial",
    "Breaking News",
  ];

  const filteredGestures =
    activeCategory === "All"
      ? ACTION_MATRIX_GESTURES
      : ACTION_MATRIX_GESTURES.filter((g) => g.category === activeCategory);

  const selectedGesture =
    ACTION_MATRIX_GESTURES.find((g) => g.id === currentLoop) ||
    ACTION_MATRIX_GESTURES[0];

  return (
    <div className="space-y-4">
      {/* ── Section Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">🔄</span>
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Action Loop & Motion Beat (4.0s FSM)
          </h4>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-300">
          MAE ≤ 4.0 Locked
        </span>
      </div>

      {/* ── Active Selection Preview Card ── */}
      <div className="p-3 rounded-xl bg-surface border border-accent/30 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{selectedGesture?.icon || "🧘"}</span>
            <div>
              <div className="text-xs font-bold text-accent">
                {selectedGesture?.label || "Idle State"}
              </div>
              <div className="text-[10px] text-muted line-clamp-1">
                {selectedGesture?.desc}
              </div>
            </div>
          </div>
          <span
            className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
              CATEGORY_COLORS[selectedGesture?.category || "Core Base"]
            }`}
          >
            {selectedGesture?.category}
          </span>
        </div>
      </div>

      {/* ── Camera Rig Switcher ── */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-muted uppercase tracking-wider flex items-center gap-1">
            🎥 Camera Rig Angle
          </span>
          <span className="text-[10px] text-muted font-mono">
            {currentCameraCue || "cam1_wide"}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {CAMERA_CUES.map((cue) => {
            const isSelected = (currentCameraCue || "cam1_wide") === cue.id;
            return (
              <button
                key={cue.id}
                type="button"
                onClick={() => onSelectCameraCue(cue.id as CameraCue)}
                className={`px-2 py-2 rounded-lg border text-left flex flex-col gap-0.5 transition-all cursor-pointer ${
                  isSelected
                    ? "border-accent bg-accent/15 text-accent shadow-sm"
                    : "border-border bg-surface hover:border-border-hover text-muted hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-1">
                  <span className="text-xs">{cue.icon}</span>
                  <span className="text-[11px] font-bold truncate">{cue.name}</span>
                </div>
                <span className="text-[9px] text-muted opacity-80 truncate">
                  {cue.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Category Filter Tabs ── */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
              activeCategory === cat
                ? "bg-accent text-white"
                : "bg-surface text-muted hover:text-foreground border border-border"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ── Gesture Grid ── */}
      <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
        {filteredGestures.map((g) => {
          const isSelected = currentLoop === g.id;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => onSelectLoop(g.id)}
              onMouseEnter={() => setHoveredGesture(g.id)}
              onMouseLeave={() => setHoveredGesture(null)}
              className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden ${
                isSelected
                  ? "border-accent bg-accent/15 text-foreground ring-1 ring-accent"
                  : "border-border bg-surface hover:border-accent/40 text-muted hover:text-foreground"
              }`}
            >
              <div className="flex items-start justify-between gap-1 w-full">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-lg flex-shrink-0">{g.icon}</span>
                  <span className="text-[11px] font-bold truncate text-foreground">
                    {g.label}
                  </span>
                </div>
                {isSelected && (
                  <span className="text-accent text-xs font-bold">✓</span>
                )}
              </div>
              <p className="text-[9px] text-muted line-clamp-2 mt-1.5 leading-tight">
                {g.desc}
              </p>
              <div className="mt-2 flex items-center justify-between">
                <span
                  className={`text-[8px] font-mono px-1.5 py-0.2 rounded border ${
                    CATEGORY_COLORS[g.category] || "border-border text-muted"
                  }`}
                >
                  {g.category}
                </span>
                <span className="text-[8px] font-mono text-muted">4.0s Loop</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
