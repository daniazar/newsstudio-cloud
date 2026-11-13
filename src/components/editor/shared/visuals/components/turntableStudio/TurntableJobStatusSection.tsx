/**
 * src/components/editor/shared/visuals/components/turntableStudio/TurntableJobStatusSection.tsx
 *
 * Telemetry and generation progress tracking card for Turntable Studio:
 * - Stopwatch timer and expected completion baseline
 * - Multi-step progress bar (Sampling -> VRAM Flush -> INT8 VAE Decode -> Video Combine)
 * - VRAM peak gauge (17.2 GB / 24GB GDDR7)
 * - Live logs drawer toggle and error alerts
 */

import React from "react";
import {
  Film,
  AlertTriangle,
  RotateCcw,
  X,
  Terminal,
  Cpu,
  CheckCircle2,
} from "lucide-react";
import { TurntableEngine } from "@/lib/types/ecommerce";

interface TurntableJobStatusSectionProps {
  isGeneratingTurntable: boolean;
  turntableJobId: string | null;
  turntableElapsedSeconds: number;
  turntableStatusDetail: string;
  formatTimer: (seconds: number) => string;
  engine: TurntableEngine;
  currentStep: number;
  totalSteps: number;
  progressPercent: number;
  vramUsedGb: number;
  liveLogs: string[];
  showLiveLogsDrawer: boolean;
  setShowLiveLogsDrawer: React.Dispatch<React.SetStateAction<boolean>>;
  logsEndRef: React.RefObject<HTMLDivElement | null>;
  turntableError: string | null;
  turntableSuccessMessage: string | null;
  handleClearJob: () => void;
  handleGenerateTurntableScene: () => void;
}

export function TurntableJobStatusSection({
  isGeneratingTurntable,
  turntableJobId,
  turntableElapsedSeconds,
  turntableStatusDetail,
  formatTimer,
  engine,
  currentStep,
  totalSteps,
  progressPercent,
  vramUsedGb,
  liveLogs,
  showLiveLogsDrawer,
  setShowLiveLogsDrawer,
  logsEndRef,
  turntableError,
  turntableSuccessMessage,
  handleClearJob,
  handleGenerateTurntableScene,
}: TurntableJobStatusSectionProps) {
  if (!isGeneratingTurntable && !turntableJobId && !turntableError && !turntableSuccessMessage) {
    return null;
  }

  const isFailed = Boolean(turntableError || turntableStatusDetail?.toLowerCase().includes("failed"));

  return (
    <div className="space-y-3">
      {/* Success Message Banner */}
      {turntableSuccessMessage && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs shadow-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span className="font-semibold">{turntableSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={handleClearJob}
            className="p-1 hover:bg-emerald-500/20 rounded text-emerald-400 transition-colors cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Error Failure Banner */}
      {isFailed && (
        <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 font-bold text-red-300">
              <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
              <span>Turntable Generation Issue</span>
            </div>
            <button
              type="button"
              onClick={handleClearJob}
              className="p-1 hover:bg-red-500/20 rounded text-red-400 transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-zinc-300 leading-relaxed font-mono">
            {turntableError || turntableStatusDetail}
          </p>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleGenerateTurntableScene}
              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Retry Generation</span>
            </button>
            <button
              type="button"
              onClick={handleClearJob}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Active Generation Progress Card */}
      {isGeneratingTurntable && (
        <div className="rounded-xl border border-cyan-500/40 bg-cyan-950/20 p-3.5 space-y-3 shadow-lg shadow-cyan-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
              </span>
              <span className="text-xs font-bold text-cyan-200 flex items-center gap-1.5">
                <Film className="h-3.5 w-3.5 text-cyan-400" />
                <span>
                  {engine === "minimax_h3"
                    ? "MiniMax H3 Diffusion Active (Local RTX)"
                    : "Google Veo 3.1 Cloud Diffusion Active"}
                </span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              {engine === "minimax_h3" && (
                <span className="text-[9.5px] font-mono px-2 py-0.5 rounded bg-black/60 border border-cyan-500/30 text-cyan-300 font-bold flex items-center gap-1">
                  <Cpu className="h-3 w-3" />
                  <span>{vramUsedGb.toFixed(1)} GB VRAM</span>
                </span>
              )}
              <span className="px-2.5 py-0.5 rounded-full bg-black/70 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-bold shadow">
                ⏱️ {formatTimer(turntableElapsedSeconds)} / {engine === "minimax_h3" ? "~03:58" : "~01:15"}
              </span>
            </div>
          </div>

          {/* Progress Bar & Status Text */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10.5px]">
              <span className="font-semibold text-zinc-300 truncate max-w-[70%]">
                {turntableStatusDetail || "Synthesizing rotating packshot sweep..."}
              </span>
              <span className="font-mono text-cyan-300 font-bold">{progressPercent}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-zinc-800/80 overflow-hidden border border-zinc-700/50">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 via-emerald-400 to-cyan-300 transition-all duration-500 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Pipeline Stage Pills */}
          <div className="grid grid-cols-4 gap-1 text-[8.5px] font-mono">
            <div
              className={`p-1 rounded text-center border ${
                currentStep >= 1
                  ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-200 font-bold"
                  : "bg-black/40 border-zinc-800 text-zinc-500"
              }`}
            >
              1. Sampling
            </div>
            <div
              className={`p-1 rounded text-center border ${
                currentStep >= totalSteps
                  ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-200 font-bold"
                  : "bg-black/40 border-zinc-800 text-zinc-500"
              }`}
            >
              2. Flush DiT
            </div>
            <div
              className={`p-1 rounded text-center border ${
                progressPercent >= 80
                  ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-200 font-bold"
                  : "bg-black/40 border-zinc-800 text-zinc-500"
              }`}
            >
              3. VAE Decode
            </div>
            <div
              className={`p-1 rounded text-center border ${
                progressPercent >= 95
                  ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-200 font-bold"
                  : "bg-black/40 border-zinc-800 text-zinc-500"
              }`}
            >
              4. Mux Video
            </div>
          </div>

          {/* Footer Controls: Live logs drawer toggle & cancel */}
          <div className="flex items-center justify-between pt-1 border-t border-cyan-900/40 text-[10px]">
            <button
              type="button"
              onClick={() => setShowLiveLogsDrawer(!showLiveLogsDrawer)}
              className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Terminal className="h-3 w-3 text-cyan-400" />
              <span>{showLiveLogsDrawer ? "Hide Live Telemetry" : "Show Live Telemetry"}</span>
            </button>
            <button
              type="button"
              onClick={handleClearJob}
              className="text-red-400 hover:text-red-300 cursor-pointer transition-colors"
            >
              Cancel Job
            </button>
          </div>

          {/* Live Telemetry Drawer */}
          {showLiveLogsDrawer && (
            <div className="mt-2 p-2.5 rounded-lg bg-black/90 border border-zinc-800 font-mono text-[9px] text-zinc-300 max-h-36 overflow-y-auto custom-scrollbar space-y-1">
              {liveLogs.length > 0 ? (
                liveLogs.map((log, idx) => (
                  <div key={idx} className="leading-tight">
                    {log}
                  </div>
                ))
              ) : (
                <div className="text-zinc-500">Awaiting telemetry logs from execution daemon...</div>
              )}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
