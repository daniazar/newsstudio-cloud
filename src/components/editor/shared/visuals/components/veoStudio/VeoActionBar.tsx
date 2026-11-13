/**
 * src/components/editor/shared/visuals/components/veoStudio/VeoActionBar.tsx
 *
 * Bottom action controls for Veo 3.1 diffusion studio:
 * duration badge, polling timer selector, Open Flow button,
 * manual video check/link button, and Render Veo Scene trigger.
 */

import React from "react";
import { Clock, ExternalLink, Loader2, Search, Sparkles } from "lucide-react";
import { DEFAULT_FLOW_PROJECT_URL } from "../../types";
import { openGoogleFlow } from "@/lib/ecommerce/flowLauncher";

export interface VeoActionBarProps {
  pollCadenceSeconds: number;
  setPollCadenceSeconds: (cadence: number) => void;
  flowProjectUrl?: string;
  handleManualCheckNow: () => void;
  isGeneratingVeo: boolean;
  isCheckingNow: boolean;
  handleGenerateVeoScene: () => void;
  veoPrompt: string;
  formatTimer: (seconds: number) => string;
  veoElapsedSeconds: number;
}

export const VeoActionBar: React.FC<VeoActionBarProps> = ({
  pollCadenceSeconds,
  setPollCadenceSeconds,
  flowProjectUrl = DEFAULT_FLOW_PROJECT_URL,
  handleManualCheckNow,
  isGeneratingVeo,
  isCheckingNow,
  handleGenerateVeoScene,
  veoPrompt,
  formatTimer,
  veoElapsedSeconds,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
      <div className="flex items-center gap-2">
        <span className="px-2.5 py-1 rounded-md bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold font-mono">
          ⏱️ 8s (Veo 3.1 Lite)
        </span>

        {/* Status Check Timer Frequency Selector */}
        <div className="flex items-center gap-1 text-[11px] text-zinc-400">
          <Clock className="h-3 w-3 text-zinc-400" />
          <span className="text-[10px]">Timer:</span>
          <select
            value={pollCadenceSeconds}
            onChange={(e) => setPollCadenceSeconds(Number(e.target.value))}
            className="text-[10px] font-bold font-mono bg-black/80 border border-zinc-700/80 hover:border-emerald-500/50 rounded px-1.5 py-0.5 text-zinc-200 focus:outline-none cursor-pointer transition-colors"
            title="Choose how frequently the page checks the background video generation status"
          >
            <option value={3}>Check every 3s</option>
            <option value={5}>Check every 5s</option>
            <option value={10}>Check every 10s</option>
            <option value={30}>Check every 30s</option>
            <option value={60}>Check every 1m</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => openGoogleFlow(flowProjectUrl)}
          className="px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-zinc-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          title="Open Google Flow project canvas in browser and bring active automation session to front"
        >
          <ExternalLink className="h-3.5 w-3.5 text-blue-400" />
          <span>Open Google Flow</span>
        </button>

        <button
          type="button"
          onClick={handleManualCheckNow}
          disabled={isGeneratingVeo || isCheckingNow}
          className="px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-zinc-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          title="Check if a video was already rendered on disk, downloaded, or on cluster for this scene"
        >
          {isCheckingNow ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
          ) : (
            <Search className="h-3.5 w-3.5 text-emerald-400" />
          )}
          <span>{isCheckingNow ? "Checking..." : "Check / Link Video"}</span>
        </button>

        <button
          type="button"
          onClick={handleGenerateVeoScene}
          disabled={isGeneratingVeo || !veoPrompt.trim()}
          className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black text-xs font-black shadow-lg shadow-emerald-950/40 flex items-center gap-1.5 transition-all cursor-pointer"
        >
          {isGeneratingVeo ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Rendering ({formatTimer(veoElapsedSeconds)})...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              <span>Render Veo Scene</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
