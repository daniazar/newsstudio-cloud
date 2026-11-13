"use client";

import { PERSONAS } from "@/lib/tts/personas";
import { ArrowUpRight,RefreshCw,Sparkles,Video } from "lucide-react";
import Link from "next/link";
import React from "react";

interface BroadcastHeroHUDProps {
  queueStats?: {
    pendingCount: number;
    processingCount: number;
    completedCount: number;
  };
  totalStories: number;
  isIngesting: boolean;
  onIngestNow: () => void;
  onBatchScript?: () => void;
  isBatchScripting?: boolean;
}

export const BroadcastHeroHUD: React.FC<BroadcastHeroHUDProps> = ({
  queueStats = { pendingCount: 0, processingCount: 0, completedCount: 0 },
  totalStories,
  isIngesting,
  onIngestNow,
  onBatchScript,
  isBatchScripting = false,
}) => {
  return (
    <div className="relative rounded-3xl overflow-hidden glass-panel-raised border border-white/10 p-6 sm:p-7 shadow-2xl mb-6">
      {/* Specular Ambient Glow Orbs */}
      <div className="absolute top-0 right-1/4 w-80 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-80 h-32 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        {/* Left Column: Studio Branding & Active Anchor Roster */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400 shadow-[0_0_8px_#34d399]" />
            </span>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-foreground tracking-tight">
                Newsroom Command Center
              </h1>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                BROADCAST v2.5
              </span>
            </div>
          </div>

          <p className="text-xs text-subtle max-w-xl leading-relaxed font-normal">
            Autonomous multi-anchor television orchestrator. Real-time RSS scraping, Gemini 2.5 script synthesis, and 40 FPS neural lip-sync rendering.
          </p>

          {/* Active Persona Roster Avatars */}
          <div className="flex items-center gap-3 pt-1">
            <span className="text-[10px] font-mono font-bold text-muted uppercase tracking-wider">
              On-Air Anchors:
            </span>
            <div className="flex items-center -space-x-2">
              {PERSONAS.slice(0, 5).map((persona) => (
                <div
                  key={persona.id}
                  className="relative group cursor-pointer"
                  title={`${persona.name} — ${persona.title}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={persona.avatarUrl}
                    alt={persona.name}
                    className="w-7 h-7 rounded-full object-cover border-2 border-background ring-1 ring-white/20 group-hover:scale-110 group-hover:z-10 transition-transform"
                  />
                  <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border border-background shadow-[0_0_4px_#34d399]" />
                </div>
              ))}
            </div>
            <Link
              href="/personas"
              className="inline-flex items-center gap-0.5 text-[10px] font-mono font-bold text-emerald-400 hover:text-emerald-300 transition-colors ml-1"
            >
              <span>Vault</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Right Column: Telemetry Cards & Quick Action Dock */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
          {/* Quick Metrics Badges */}
          <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center bg-white/[0.04] border border-border/80 rounded-2xl p-2.5 backdrop-blur-md">
            {/* Total Stories */}
            <div className="text-center px-3 border-r border-border/60 last:border-0">
              <div className="text-[9px] font-mono text-muted uppercase tracking-wider">Stories</div>
              <div className="text-base font-black text-foreground font-mono mt-0.5 tabular-nums">{totalStories}</div>
            </div>

            {/* Pipeline Queue Active */}
            <div className="text-center px-3 border-r border-border/60 last:border-0">
              <div className="text-[9px] font-mono text-muted uppercase tracking-wider">In Queue</div>
              <div className="text-base font-black text-sky-400 font-mono mt-0.5 tabular-nums">
                {queueStats.pendingCount + queueStats.processingCount}
              </div>
            </div>

            {/* Ready */}
            <div className="text-center px-3">
              <div className="text-[9px] font-mono text-muted uppercase tracking-wider">Ready</div>
              <div className="text-base font-black text-emerald-400 font-mono mt-0.5 tabular-nums">
                {queueStats.completedCount}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Ingest RSS Now */}
            <button
              onClick={onIngestNow}
              disabled={isIngesting}
              className={`px-4 py-2.5 rounded-xl border font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg ${
                isIngesting
                  ? "bg-white/10 border-white/10 text-muted cursor-not-allowed"
                  : "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 border-emerald-400/30 text-white shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98]"
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isIngesting ? "animate-spin" : ""}`} />
              <span>{isIngesting ? "Ingesting..." : "Ingest RSS"}</span>
            </button>

            {/* Batch Script Synthesis */}
            {onBatchScript && (
              <button
                onClick={onBatchScript}
                disabled={isBatchScripting}
                className="px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] font-bold text-xs text-foreground flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>{isBatchScripting ? "Synthesizing..." : "Batch Script"}</span>
              </button>
            )}

            {/* Interactive Call Button */}
            <Link
              href="/interactive-call"
              className="px-3.5 py-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 font-bold text-xs text-rose-300 flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-lg shadow-rose-500/10"
            >
              <Video className="w-3.5 h-3.5 text-rose-400" />
              <span>Live CVI Call</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
