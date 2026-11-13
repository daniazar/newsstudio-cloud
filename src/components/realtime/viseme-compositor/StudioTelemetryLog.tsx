"use client";

import React, { useRef, useEffect } from "react";
import { Terminal, Trash2, Cpu, Zap } from "lucide-react";

export interface LogEntry {
  id: string;
  time: string;
  message: string;
  type: "info" | "success" | "warn" | "error";
}

interface StudioTelemetryLogProps {
  logs: LogEntry[];
  onClearLogs: () => void;
  cacheHits: number;
  totalKeyframes: number;
  fuzzyHits: number;
  latencyMs: number;
}

export const StudioTelemetryLog: React.FC<StudioTelemetryLogProps> = ({
  logs,
  onClearLogs,
  cacheHits,
  totalKeyframes,
  fuzzyHits,
  latencyMs,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="flex flex-col bg-neutral-900/60 rounded-2xl border border-neutral-800 p-4 font-mono text-xs">
      {/* Header with Stats */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-semibold text-white">Telemetry & Pipeline Log</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
            <Zap className="w-3 h-3" />
            <span>
              Cache: {cacheHits} / {totalKeyframes} ({fuzzyHits} fuzzy)
            </span>
          </div>

          <div className="flex items-center gap-1 text-[10px] text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded-full">
            <Cpu className="w-3 h-3" />
            <span>{latencyMs}ms Latency</span>
          </div>

          <button
            type="button"
            onClick={onClearLogs}
            className="p-1 rounded hover:bg-neutral-800 text-neutral-500 hover:text-neutral-300 transition-colors"
            title="Clear logs"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal Output Area */}
      <div
        ref={scrollRef}
        className="mt-3 flex flex-col gap-1 max-h-[160px] min-h-[120px] overflow-y-auto bg-black/60 rounded-xl p-2.5 border border-neutral-800/80 font-mono text-[11px]"
      >
        {logs.length === 0 ? (
          <span className="text-neutral-600 italic">No telemetry events recorded yet.</span>
        ) : (
          logs.map((l) => {
            const colorClass =
              l.type === "success"
                ? "text-emerald-400"
                : l.type === "warn"
                ? "text-amber-400"
                : l.type === "error"
                ? "text-rose-400"
                : "text-neutral-300";

            return (
              <div key={l.id} className="flex items-start gap-2 leading-relaxed">
                <span className="text-neutral-500 select-none shrink-0">[{l.time}]</span>
                <span className={`${colorClass} break-words`}>{l.message}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
