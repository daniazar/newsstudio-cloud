/**
 * src/components/editor/shared/media/photoStudio/PhotoStudioTelemetryDrawer.tsx
 *
 * Progress stopwatch, animated progress bar, and collapsible live CLI telemetry drawer
 * with color-coded log lines for CustomProductPhotoStudioCard.
 */

import React from "react";
import {
  Camera,
  Loader2,
  RefreshCw,
  Terminal,
  Copy,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface PhotoStudioTelemetryDrawerProps {
  isGenerating: boolean;
  photoElapsedSeconds: number;
  photoStatusDetail: string;
  pollCadenceSeconds: number;
  lastCheckedAt: Date | null;
  liveLogs: string[];
  showLiveLogsDrawer: boolean;
  logsEndRef: React.RefObject<HTMLDivElement | null>;
  formatTimer: (seconds: number) => string;
  onManualCheckNow: () => void;
  onToggleLogsDrawer: () => void;
  onCopyLogs: () => void;
}

export function PhotoStudioTelemetryDrawer({
  isGenerating,
  photoElapsedSeconds,
  photoStatusDetail,
  pollCadenceSeconds,
  lastCheckedAt,
  liveLogs,
  showLiveLogsDrawer,
  logsEndRef,
  formatTimer,
  onManualCheckNow,
  onToggleLogsDrawer,
  onCopyLogs,
}: PhotoStudioTelemetryDrawerProps) {
  return (
    <>
      {/* Live Generation Progress Card & Active Timer */}
      {isGenerating && (
        <div className="rounded-xl border border-cyan-500/40 bg-cyan-950/30 p-3.5 space-y-2.5 shadow-lg shadow-cyan-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
              </span>
              <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                <Camera className="h-3.5 w-3.5 text-cyan-400" />
                Gemini / Imagen 3 CLI Active
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-black/60 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-bold shadow">
                ⏱️ {formatTimer(photoElapsedSeconds)} / ~00:30
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-black/60 rounded-full h-2 overflow-hidden border border-cyan-500/20">
            <div
              className="bg-gradient-to-r from-cyan-500 via-blue-400 to-cyan-300 h-2 rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${Math.min(96, Math.max(10, (photoElapsedSeconds / 30) * 100))}%`,
              }}
            />
          </div>

          {/* Live Status & Manual Check */}
          <div className="flex items-center justify-between text-[11px] text-zinc-300 pt-0.5">
            <div className="flex items-center gap-1.5 truncate max-w-[65%]">
              <Loader2 className="h-3 w-3 animate-spin text-cyan-400 shrink-0" />
              <span className="truncate text-zinc-300 font-medium">
                {photoStatusDetail || "Synthesizing custom product photo with Gemini / Imagen 3..."}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={onManualCheckNow}
                className="px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                title="Poll status now"
              >
                <RefreshCw className="h-2.5 w-2.5" />
                <span>Check now</span>
              </button>
            </div>
          </div>

          {lastCheckedAt && (
            <div className="text-[9px] text-zinc-500 font-mono text-right flex items-center justify-end gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></span>
              <span>
                Checking server every {pollCadenceSeconds}s · Last check:{" "}
                {lastCheckedAt.toLocaleTimeString()}
              </span>
            </div>
          )}

          {/* Expandable Live CLI Terminal */}
          <div className="pt-1.5 border-t border-cyan-500/20">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={onToggleLogsDrawer}
                className="text-[10px] font-mono font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Terminal className="h-3 w-3" />
                <span>Live CLI Telemetry & Console Logs ({liveLogs.length} lines)</span>
                {showLiveLogsDrawer ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>

              {showLiveLogsDrawer && liveLogs.length > 0 && (
                <button
                  type="button"
                  onClick={onCopyLogs}
                  className="text-[9px] font-mono text-zinc-400 hover:text-zinc-200 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Copy className="h-2.5 w-2.5" />
                  <span>Copy logs</span>
                </button>
              )}
            </div>

            {showLiveLogsDrawer && (
              <div className="mt-2 rounded-lg bg-black/90 border border-zinc-800 p-2.5 max-h-48 overflow-y-auto font-mono text-[10px] leading-relaxed custom-scrollbar space-y-1 shadow-inner">
                {liveLogs.length === 0 ? (
                  <div className="text-zinc-500 italic">
                    Waiting for initial CLI log events...
                  </div>
                ) : (
                  liveLogs.map((logLine, lIdx) => {
                    const isStage = logLine.includes("[STAGE]");
                    const isError =
                      logLine.includes("[ERROR]") || logLine.toLowerCase().includes("error");
                    const isWarn = logLine.includes("[WARN]");
                    const isSuccess =
                      logLine.includes("[SUCCESS]") ||
                      logLine.includes("✔") ||
                      logLine.includes("🎉");

                    return (
                      <div
                        key={lIdx}
                        className={`truncate ${
                          isError
                            ? "text-rose-400 font-bold"
                            : isSuccess
                            ? "text-emerald-300 font-semibold"
                            : isStage
                            ? "text-amber-300 font-bold"
                            : isWarn
                            ? "text-amber-400"
                            : "text-zinc-300"
                        }`}
                      >
                        {logLine}
                      </div>
                    );
                  })
                )}
                <div ref={logsEndRef as React.RefObject<HTMLDivElement>} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Standalone Live Telemetry Drawer when idle but logs exist */}
      {!isGenerating && liveLogs.length > 0 && (
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onToggleLogsDrawer}
              className="text-[10px] font-mono font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Terminal className="h-3 w-3" />
              <span>CLI Telemetry & Console Logs ({liveLogs.length} lines)</span>
              {showLiveLogsDrawer ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>

            {showLiveLogsDrawer && (
              <button
                type="button"
                onClick={onCopyLogs}
                className="text-[9px] font-mono text-zinc-400 hover:text-zinc-200 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Copy className="h-2.5 w-2.5" />
                <span>Copy logs</span>
              </button>
            )}
          </div>

          {showLiveLogsDrawer && (
            <div className="mt-1 rounded-lg bg-black/90 border border-zinc-800 p-2.5 max-h-40 overflow-y-auto font-mono text-[10px] leading-relaxed custom-scrollbar space-y-1 shadow-inner">
              {liveLogs.map((logLine, lIdx) => {
                const isStage = logLine.includes("[STAGE]");
                const isError =
                  logLine.includes("[ERROR]") || logLine.toLowerCase().includes("error");
                const isWarn = logLine.includes("[WARN]");
                const isSuccess =
                  logLine.includes("[SUCCESS]") ||
                  logLine.includes("✔") ||
                  logLine.includes("🎉");

                return (
                  <div
                    key={lIdx}
                    className={`truncate ${
                      isError
                        ? "text-rose-400 font-bold"
                        : isSuccess
                        ? "text-emerald-300 font-semibold"
                        : isStage
                        ? "text-amber-300 font-bold"
                        : isWarn
                        ? "text-amber-400"
                        : "text-zinc-300"
                    }`}
                  >
                    {logLine}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </>
  );
}
