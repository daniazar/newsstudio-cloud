"use client";

import React from "react";
import { TalkingHeadModelProfile } from "@/lib/ai/talkingHeadsClient";
import { GitFork, Check, Cpu } from "lucide-react";

interface ModelWithStatus extends TalkingHeadModelProfile {
  isOnline?: boolean;
  isSubmoduleInstalled?: boolean;
  port?: number;
}

interface ModelSelectorMatrixProps {
  models: ModelWithStatus[];
  modelA: string;
  modelB: string;
  isArenaMode: boolean;
  onSelectModelA: (id: string) => void;
  onSelectModelB: (id: string) => void;
  onOpenForkModal: (model: TalkingHeadModelProfile) => void;
}

export function ModelSelectorMatrix({
  models,
  modelA,
  modelB,
  isArenaMode,
  onSelectModelA,
  onSelectModelB,
  onOpenForkModal,
}: ModelSelectorMatrixProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-mono uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          Neural Talking Head Engines ({models.length})
        </label>
        <span className="text-[11px] font-mono text-gray-500">
          {isArenaMode ? "Comparing Model A vs Model B" : "Select Active Engine"}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {models.map((m) => {
          const isSelectedA = modelA === m.id;
          const isSelectedB = isArenaMode && modelB === m.id;

          let borderClass = "border-white/10 hover:border-white/20 bg-black/40";
          if (isSelectedA) {
            borderClass = "border-cyan-500/80 bg-cyan-950/20 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/50";
          } else if (isSelectedB) {
            borderClass = "border-purple-500/80 bg-purple-950/20 shadow-lg shadow-purple-950/40 ring-1 ring-purple-500/50";
          }

          return (
            <div
              key={m.id}
              className={`p-3 rounded-2xl border transition-all relative flex flex-col justify-between group ${borderClass}`}
            >
              {/* Top row */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="text-xs font-bold text-white tracking-wide">
                      {m.name}
                    </h4>
                    {/* Status Dot */}
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-mono uppercase font-bold ${
                        m.weightsInstalled
                          ? "bg-emerald-950/80 text-emerald-400 border border-emerald-500/40"
                          : "bg-amber-950/80 text-amber-400 border border-amber-500/40"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${m.weightsInstalled ? "bg-emerald-400" : "bg-amber-400 animate-pulse"}`} />
                      {m.weightsInstalled ? "WEIGHTS READY" : "NO WEIGHTS"}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono block">
                    {m.organization} • {m.paperVenue}
                  </span>
                </div>

                {/* Fork Remote Modal Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenForkModal(m);
                  }}
                  title="Manage Submodule Remote & Fork"
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-gray-400 hover:text-purple-300 transition-colors shrink-0"
                >
                  <GitFork className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Architecture & Spec Pills */}
              <p className="text-[11px] text-gray-300/90 line-clamp-2 mb-2 leading-tight">
                {m.description}
              </p>

              <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-mono mb-3 text-gray-400">
                <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5">
                  {m.architecture.split("+")[0].trim()}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-gray-300">
                  {m.recommendedFps} FPS
                </span>
                <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-cyan-400">
                  ~{m.vramGb}GB VRAM
                </span>
                {m.vramGb <= 7.5 ? (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-bold">
                    ⚡ 8GB OK
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/20 font-bold">
                    🚀 24GB Tier
                  </span>
                )}
              </div>

              {/* Selection Controls */}
              <div className="flex items-center gap-1.5 pt-2 border-t border-white/5">
                <button
                  onClick={() => onSelectModelA(m.id)}
                  className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-mono font-bold transition-all flex items-center justify-center gap-1 ${
                    isSelectedA
                      ? "bg-cyan-500 text-black shadow-sm font-black"
                      : "bg-white/5 text-gray-300 hover:bg-white/10"
                  }`}
                >
                  {isSelectedA && <Check className="w-3 h-3" />}
                  <span>Primary (A)</span>
                </button>

                {isArenaMode && (
                  <button
                    onClick={() => onSelectModelB(m.id)}
                    className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-mono font-bold transition-all flex items-center justify-center gap-1 ${
                      isSelectedB
                        ? "bg-purple-500 text-white shadow-sm font-black"
                        : "bg-white/5 text-gray-300 hover:bg-white/10"
                    }`}
                  >
                    {isSelectedB && <Check className="w-3 h-3" />}
                    <span>Compare (B)</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
