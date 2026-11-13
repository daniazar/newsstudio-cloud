/**
 * src/components/editor/shared/visuals/components/VeoTelemetryDrawer.tsx
 *
 * Reusable expandable monospace live CLI terminal drawer for real-time
 * telemetry, progress logs, error indicators, auto-scroll, and 1-click clipboard copy.
 */

import React from "react";
import { Terminal, ChevronUp, ChevronDown, Copy } from "lucide-react";

export interface VeoTelemetryDrawerProps {
  liveLogs: string[];
  isOpen: boolean;
  onToggle: () => void;
  onCopy: () => void;
  logsEndRef?: React.RefObject<HTMLDivElement | null>;
  title?: string;
  theme?: "emerald" | "teal" | "rose";
}

export const VeoTelemetryDrawer: React.FC<VeoTelemetryDrawerProps> = ({
  liveLogs,
  isOpen,
  onToggle,
  onCopy,
  logsEndRef,
  title,
  theme = "emerald",
}) => {
  const isEmerald = theme === "emerald";
  const isRose = theme === "rose";
  const labelColor = isRose
    ? "text-rose-400 hover:text-rose-300"
    : isEmerald
    ? "text-emerald-400 hover:text-emerald-300"
    : "text-teal-300 hover:text-teal-200";
  const borderColor = isRose
    ? "border-rose-500/20"
    : isEmerald
    ? "border-emerald-500/20"
    : "border-teal-500/20";

  return (
    <div className={`pt-1.5 border-t ${borderColor}`}>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onToggle}
          className={`text-[10px] font-mono font-semibold ${labelColor} flex items-center gap-1.5 cursor-pointer transition-colors`}
        >
          <Terminal className="h-3 w-3" />
          <span>
            {title || "Live CLI Telemetry & Console Logs"} ({liveLogs.length} lines)
          </span>
          {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        {isOpen && liveLogs.length > 0 && (
          <button
            type="button"
            onClick={onCopy}
            className="text-[9px] font-mono text-zinc-400 hover:text-zinc-200 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Copy className="h-2.5 w-2.5" />
            <span>Copy logs</span>
          </button>
        )}
      </div>

      {isOpen && (
        <div className="mt-2 rounded-lg bg-black/90 border border-zinc-800 p-2.5 max-h-48 overflow-y-auto font-mono text-[10px] leading-relaxed custom-scrollbar space-y-1 shadow-inner">
          {liveLogs.length === 0 ? (
            <div className="text-zinc-500 italic">Waiting for initial CLI log events...</div>
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
          {logsEndRef && <div ref={logsEndRef} />}
        </div>
      )}
    </div>
  );
};
