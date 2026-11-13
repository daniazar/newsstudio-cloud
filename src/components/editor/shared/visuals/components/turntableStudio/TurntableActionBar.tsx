/**
 * src/components/editor/shared/visuals/components/turntableStudio/TurntableActionBar.tsx
 *
 * Bottom action controls for Neural Product Turntable Studio:
 * Duration badge, timer check cadence selector, manual check/link button,
 * and primary "Generate Commercial Turntable" render trigger.
 */

import React from "react";
import { Clock, Search, Loader2, Sparkles } from "lucide-react";
import { TurntableEngine, TurntableStepMode } from "@/lib/types/ecommerce";

interface TurntableActionBarProps {
  engine: TurntableEngine;
  stepMode: TurntableStepMode;
  pollCadenceSeconds: number;
  setPollCadenceSeconds: (cadence: number) => void;
  handleManualCheckNow: () => void;
  isGeneratingTurntable: boolean;
  isCheckingNow: boolean;
  handleGenerateTurntableScene: () => void;
  turntablePrompt: string;
  formatTimer: (seconds: number) => string;
  turntableElapsedSeconds: number;
}

export function TurntableActionBar({
  engine,
  stepMode,
  pollCadenceSeconds,
  setPollCadenceSeconds,
  handleManualCheckNow,
  isGeneratingTurntable,
  isCheckingNow,
  handleGenerateTurntableScene,
  turntablePrompt,
  formatTimer,
  turntableElapsedSeconds,
}: TurntableActionBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
      <div className="flex items-center gap-2">
        <span className="px-2.5 py-1 rounded-md bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-bold font-mono">
          {engine === "minimax_h3"
            ? `⏱️ 5.16s · ${stepMode === "tao_3step" ? "Tao 3-Step" : "Tao 2-Step"}`
            : "⏱️ 8s · Veo 3.1 Lite"}
        </span>

        {/* Polling Timer Cadence Selector */}
        <div className="flex items-center gap-1 text-[11px] text-zinc-400">
          <Clock className="h-3 w-3 text-zinc-400" />
          <span className="text-[10px]">Timer:</span>
          <select
            value={pollCadenceSeconds}
            onChange={(e) => setPollCadenceSeconds(Number(e.target.value))}
            className="text-[10px] font-bold font-mono bg-black/80 border border-zinc-700/80 hover:border-cyan-500/50 rounded px-1.5 py-0.5 text-zinc-200 focus:outline-none cursor-pointer transition-colors"
            title="Choose how frequently the page checks background generation status"
          >
            <option value={3}>Check every 3s</option>
            <option value={5}>Check every 5s</option>
            <option value={10}>Check every 10s</option>
            <option value={30}>Check every 30s</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Manual Check / Link Video Fallback */}
        <button
          type="button"
          onClick={handleManualCheckNow}
          disabled={isGeneratingTurntable || isCheckingNow}
          className="px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-zinc-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          title="Check if a video was already rendered on disk for this scene"
        >
          {isCheckingNow ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
          ) : (
            <Search className="h-3.5 w-3.5 text-cyan-400" />
          )}
          <span>{isCheckingNow ? "Checking..." : "Check / Link Video"}</span>
        </button>

        {/* Primary Action Button */}
        <button
          type="button"
          onClick={handleGenerateTurntableScene}
          disabled={isGeneratingTurntable || !turntablePrompt.trim()}
          className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black text-xs font-black shadow-lg shadow-cyan-950/40 flex items-center gap-1.5 transition-all cursor-pointer"
        >
          {isGeneratingTurntable ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Rendering ({formatTimer(turntableElapsedSeconds)})...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5 fill-black" />
              <span>Generate Commercial Turntable</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
