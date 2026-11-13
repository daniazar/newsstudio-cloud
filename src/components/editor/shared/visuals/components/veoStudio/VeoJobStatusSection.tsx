/**
 * src/components/editor/shared/visuals/components/veoStudio/VeoJobStatusSection.tsx
 *
 * Live generation progress card, stopwatch timer, progress bar,
 * tracked job card, failure diagnosis state, and live CLI telemetry drawers.
 */

import React from "react";
import {
  Film,
  ExternalLink,
  Loader2,
  RefreshCw,
  Play,
  AlertTriangle,
  RotateCcw,
  X,
  Terminal,
} from "lucide-react";
import { VeoTelemetryDrawer } from "../VeoTelemetryDrawer";
import { DEFAULT_FLOW_PROJECT_URL } from "../../types";
import { openGoogleFlow, inspectFlowErrors } from "@/lib/ecommerce/flowLauncher";

export interface VeoJobStatusSectionProps {
  isGeneratingVeo: boolean;
  veoJobId: string | null;
  veoElapsedSeconds: number;
  veoStatusDetail: string;
  formatTimer: (seconds: number) => string;
  flowProjectUrl?: string;
  pollCadenceSeconds: number;
  lastCheckedAt: Date | null;
  handleManualCheckNow: () => void;
  handleResumePolling: (jobId: string) => void;
  handleClearJob: () => void;
  liveLogs: string[];
  showLiveLogsDrawer: boolean;
  setShowLiveLogsDrawer: React.Dispatch<React.SetStateAction<boolean>>;
  logsEndRef: React.RefObject<HTMLDivElement | null>;
  setVeoSuccessMessage: (msg: string | null) => void;
  veoError?: string | null;
  handleGenerateVeoScene?: () => void;
}

export const VeoJobStatusSection: React.FC<VeoJobStatusSectionProps> = ({
  isGeneratingVeo,
  veoJobId,
  veoElapsedSeconds,
  veoStatusDetail,
  formatTimer,
  flowProjectUrl = DEFAULT_FLOW_PROJECT_URL,
  pollCadenceSeconds,
  lastCheckedAt,
  handleManualCheckNow,
  handleResumePolling,
  handleClearJob,
  liveLogs,
  showLiveLogsDrawer,
  setShowLiveLogsDrawer,
  logsEndRef,
  setVeoSuccessMessage,
  veoError,
  handleGenerateVeoScene,
}) => {
  if (!isGeneratingVeo && !veoJobId) {
    return null;
  }

  const isFailed = Boolean(veoError || veoStatusDetail?.toLowerCase().includes("failed"));

  return (
    <div className="space-y-3">
      {/* 1. Live Generation Progress Card & Active Timer */}
      {isGeneratingVeo && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-3.5 space-y-2.5 shadow-lg shadow-emerald-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                <Film className="h-3.5 w-3.5 text-emerald-400" />
                Veo 3.1 Cloud Diffusion Active
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openGoogleFlow(flowProjectUrl)}
                className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow"
                title="Open active Google Flow project canvas in browser and bring active automation window to front"
              >
                <ExternalLink className="h-3 w-3" />
                <span>Open Flow Canvas</span>
              </button>
              <span className="px-2.5 py-0.5 rounded-full bg-black/60 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold shadow">
                ⏱️ {formatTimer(veoElapsedSeconds)} / ~01:15
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-black/60 rounded-full h-2 overflow-hidden border border-emerald-500/20">
            <div
              className="bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 h-2 rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${Math.min(96, Math.max(8, (veoElapsedSeconds / 75) * 100))}%`,
              }}
            />
          </div>

          {/* Live Status + Polling Frequency Controls */}
          <div className="flex items-center justify-between text-[11px] text-zinc-300 pt-0.5">
            <div className="flex items-center gap-1.5 truncate max-w-[65%]">
              <Loader2 className="h-3 w-3 animate-spin text-emerald-400 shrink-0" />
              <span className="truncate text-zinc-300 font-medium">
                {veoStatusDetail || "Synthesizing 8s video diffusion on Google Flow..."}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleManualCheckNow}
                className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                title="Poll status now"
              >
                <RefreshCw className="h-2.5 w-2.5" />
                <span>Check now</span>
              </button>
            </div>
          </div>

          {lastCheckedAt && (
            <div className="text-[9px] text-zinc-500 font-mono text-right flex items-center justify-end gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>
                Checking server every {pollCadenceSeconds}s · Last check:{" "}
                {lastCheckedAt.toLocaleTimeString()}
              </span>
            </div>
          )}

          {/* Live CLI Telemetry Drawer */}
          <VeoTelemetryDrawer
            liveLogs={liveLogs}
            isOpen={showLiveLogsDrawer}
            onToggle={() => setShowLiveLogsDrawer((prev) => !prev)}
            onCopy={() => {
              navigator.clipboard?.writeText(liveLogs.join("\n"));
              setVeoSuccessMessage("📋 Telemetry logs copied to clipboard!");
            }}
            logsEndRef={logsEndRef}
            theme="emerald"
          />
        </div>
      )}

      {/* 2. Tracked Job Card in FAILED State */}
      {!isGeneratingVeo && veoJobId && isFailed && (
        <div className="rounded-xl border border-rose-500/50 bg-rose-950/25 p-3.5 space-y-2.5 shadow-lg shadow-rose-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
              </span>
              <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                Veo Job Failed:{" "}
                <span className="font-mono text-[10px] text-zinc-300">{veoJobId}</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => openGoogleFlow(flowProjectUrl)}
                className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                title="Open active Google Flow project canvas in browser and bring automation session to front"
              >
                <ExternalLink className="h-3 w-3" />
                <span>Open Flow</span>
              </button>
              <button
                type="button"
                onClick={() => inspectFlowErrors(flowProjectUrl)}
                className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                title="Open real-time remote DevTools console, network activity, and interactive live screencast of the Flow browser"
              >
                <Terminal className="h-3 w-3 text-amber-400" />
                <span>Inspect Errors</span>
              </button>
              <button
                type="button"
                onClick={handleClearJob}
                className="px-2.5 py-1 rounded bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/50 text-rose-100 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                title="Dismiss and clear failed job from session"
              >
                <X className="h-3 w-3" />
                <span>Dismiss Job</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-zinc-300 pt-0.5">
            <div className="flex items-start gap-1.5 truncate max-w-[70%]">
              <span className="text-rose-300/90 font-medium leading-relaxed truncate">
                {veoError || veoStatusDetail || "Veo generation finished but video artifact was not found."}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
              {handleGenerateVeoScene && (
                <button
                  type="button"
                  onClick={handleGenerateVeoScene}
                  className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  title="Retry video generation with current settings"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Retry Render</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleManualCheckNow}
                className="px-2 py-1 rounded bg-zinc-850 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                title="Check disk if you manually downloaded the video from Google Flow"
              >
                <RefreshCw className="h-2.5 w-2.5" />
                <span>Link Downloaded File</span>
              </button>
            </div>
          </div>

          {lastCheckedAt && (
            <div className="text-[9px] text-zinc-500 font-mono text-right flex items-center justify-end gap-1">
              <span>Last check: {lastCheckedAt.toLocaleTimeString()}</span>
            </div>
          )}

          {/* Live CLI Terminal Drawer for Failed Job */}
          {liveLogs.length > 0 && (
            <VeoTelemetryDrawer
              liveLogs={liveLogs}
              isOpen={showLiveLogsDrawer}
              onToggle={() => setShowLiveLogsDrawer((prev) => !prev)}
              onCopy={() => {
                navigator.clipboard?.writeText(liveLogs.join("\n"));
                setVeoSuccessMessage("📋 Telemetry logs copied to clipboard!");
              }}
              logsEndRef={logsEndRef}
              title="View Job Terminal Output"
              theme="rose"
            />
          )}
        </div>
      )}

      {/* 3. Tracked Job Card in PENDING / ACTIVE State */}
      {!isGeneratingVeo && veoJobId && !isFailed && (
        <div className="rounded-xl border border-teal-500/40 bg-teal-950/30 p-3.5 space-y-2.5 shadow-lg shadow-teal-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="inline-flex rounded-full h-2.5 w-2.5 bg-teal-400"></span>
              </span>
              <span className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
                <Film className="h-3.5 w-3.5 text-teal-400" />
                Tracked Veo Job:{" "}
                <span className="font-mono text-[10px] text-zinc-300">{veoJobId}</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => openGoogleFlow(flowProjectUrl)}
                className="px-2.5 py-1 rounded bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/40 text-teal-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                title="Open active Google Flow project canvas in browser and bring automation session to front"
              >
                <ExternalLink className="h-3 w-3" />
                <span>Open Flow</span>
              </button>
              <button
                type="button"
                onClick={() => handleResumePolling(veoJobId)}
                className="px-2.5 py-1 rounded bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/40 text-teal-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Play className="h-3 w-3" />
                <span>Resume Polling</span>
              </button>
              <button
                type="button"
                onClick={handleClearJob}
                className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs font-medium cursor-pointer transition-colors"
                title="Clear tracked job"
              >
                ✕ Clear
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-zinc-300 pt-0.5">
            <div className="flex items-center gap-1.5 truncate max-w-[70%]">
              <span className="truncate text-zinc-300">
                {veoStatusDetail ||
                  "Job stored in session. Click 'Check Status Now' or 'Resume Polling'."}
              </span>
            </div>

            <button
              type="button"
              onClick={handleManualCheckNow}
              className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Check Status Now</span>
            </button>
          </div>

          {lastCheckedAt && (
            <div className="text-[9px] text-zinc-500 font-mono text-right flex items-center justify-end gap-1">
              <span>Last check: {lastCheckedAt.toLocaleTimeString()}</span>
            </div>
          )}

          {/* Live CLI Terminal Drawer for Tracked Job */}
          {liveLogs.length > 0 && (
            <VeoTelemetryDrawer
              liveLogs={liveLogs}
              isOpen={showLiveLogsDrawer}
              onToggle={() => setShowLiveLogsDrawer((prev) => !prev)}
              onCopy={() => {
                navigator.clipboard?.writeText(liveLogs.join("\n"));
                setVeoSuccessMessage("📋 Telemetry logs copied to clipboard!");
              }}
              logsEndRef={logsEndRef}
              title="View Job Terminal Output"
              theme="teal"
            />
          )}
        </div>
      )}
    </div>
  );
};
