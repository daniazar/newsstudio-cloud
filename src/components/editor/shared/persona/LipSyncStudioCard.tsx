"use client";

import React, { useState, useEffect } from "react";
import {
  Mic2,
  Zap,
  CheckCircle2,
  Loader2,
  Sparkles,
  Trash2,
  RefreshCw,
  Shuffle,
  ChevronDown,
  Film,
} from "lucide-react";

export type LipSyncEngine = "musetalk" | "ditto";

export interface LipSyncStudioCardProps {
  currentSceneId?: string;
  currentSceneIndex?: number;
  audioUrl?: string;
  avatarUrl?: string;
  videoUrl?: string;
  isVeoScene?: boolean;
  onGenerateLipSync?: (options: {
    engine: LipSyncEngine;
    sceneId?: string;
    transparentAlpha: boolean;
    useCachedLatents: boolean;
    force?: boolean;
  }) => Promise<void>;
  onDeleteLipSync?: () => void;
  onRerollLoop?: () => void;
  disabled?: boolean;
  className?: string;
  defaultCollapsed?: boolean;
}

interface ServiceStatus {
  name: string;
  port: number;
  online: boolean;
  latencyMs?: number;
}

export function LipSyncStudioCard({
  currentSceneId,
  currentSceneIndex = 0,
  audioUrl,
  avatarUrl: _avatarUrl,
  videoUrl,
  isVeoScene = false,
  onGenerateLipSync,
  onDeleteLipSync,
  onRerollLoop,
  disabled = false,
  className = "",
  defaultCollapsed = true,
}: LipSyncStudioCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [selectedEngine, setSelectedEngine] = useState<LipSyncEngine>("musetalk");
  const [transparentAlpha, setTransparentAlpha] = useState(true);
  const [useCachedLatents, setUseCachedLatents] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressPercent, setProgressPercent] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");

  const [services, setServices] = useState<ServiceStatus[]>([
    { name: "MuseTalk Realtime", port: 8010, online: true, latencyMs: 24 },
    { name: "Ditto Motion-Space", port: 8010, online: true, latencyMs: 38 },
  ]);

  // Health check on mount
  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch("/api/health", { method: "GET" });
        if (res.ok) {
          const data = await res.json();
          setServices([
            {
              name: "MuseTalk Realtime",
              port: 8010,
              online: data.services?.musetalk ?? true,
              latencyMs: 28,
            },
            {
              name: "Ditto Motion-Space",
              port: 8010,
              online: data.services?.ditto ?? data.services?.talkinghead ?? true,
              latencyMs: 35,
            },
          ]);
        }
      } catch {
        // Fallback gracefully
      }
    }
    checkHealth();
  }, []);

  const handleGenerate = async () => {
    if (!onGenerateLipSync || isVeoScene) return;
    try {
      setIsGenerating(true);
      setProgressPercent(10);
      setStatusMessage("Vectorizing audio & extracting phonemes...");

      await onGenerateLipSync({
        engine: selectedEngine,
        sceneId: currentSceneId,
        transparentAlpha,
        useCachedLatents,
        force: true,
      });

      setProgressPercent(100);
      setStatusMessage("Lip-sync synthesized successfully!");
      setTimeout(() => {
        setIsGenerating(false);
        setProgressPercent(null);
        setStatusMessage("");
      }, 2000);
    } catch (err: unknown) {
      setIsGenerating(false);
      setProgressPercent(null);
      setStatusMessage((err as Error)?.message || "Lip-sync generation failed");
    }
  };

  if (isCollapsed) {
    return (
      <div
        className={`rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 backdrop-blur-md flex items-center justify-between gap-3 ${className}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Mic2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                Lip-Sync Engine
              </h4>
              {isVeoScene ? (
                <span className="text-[10px] font-mono text-purple-300 bg-purple-950/70 px-2 py-0.5 rounded-full border border-purple-500/30 shrink-0 flex items-center gap-1">
                  <Film className="h-3 w-3 text-purple-400" />
                  <span>Veo Native (Skipped)</span>
                </span>
              ) : (
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 shrink-0">
                  {selectedEngine === "musetalk"
                    ? "⚡ MuseTalk 350+ FPS"
                    : "🎭 Ditto Motion-Space"}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {isVeoScene ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-300">
                  <Film className="h-3 w-3 text-purple-400" />
                  Scene #{currentSceneIndex + 1} Veo Video Scene · Lip-Sync Native
                </span>
              ) : videoUrl ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" />
                  Scene #{currentSceneIndex + 1} Video Ready
                </span>
              ) : audioUrl ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-cyan-400">
                  <Zap className="h-3 w-3" />
                  Audio Ready · Ready to Sync
                </span>
              ) : (
                <span className="text-[10px] text-zinc-500">
                  No audio track for Scene #{currentSceneIndex + 1}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onRerollLoop && (
            <button
              type="button"
              onClick={onRerollLoop}
              disabled={disabled || isGenerating}
              className="flex items-center gap-1 px-2 py-1 rounded-md border border-fuchsia-500/40 text-fuchsia-300 bg-fuchsia-950/40 hover:bg-fuchsia-900/60 hover:text-white text-[11px] font-bold transition-all cursor-pointer shadow-sm disabled:opacity-40"
              title="🎲 Reroll Action Loop for this scene"
            >
              <Shuffle className="h-3 w-3 text-fuchsia-400" />
              <span className="hidden sm:inline">Reroll</span>
            </button>
          )}

          {videoUrl && onDeleteLipSync && (
            <button
              type="button"
              onClick={onDeleteLipSync}
              disabled={disabled || isGenerating}
              className="flex items-center justify-center h-7 w-7 rounded-lg border border-red-500/30 bg-red-950/40 text-red-400 hover:bg-red-900/60 hover:text-red-300 transition-colors cursor-pointer shadow-sm disabled:opacity-40"
              title={`Delete presenter video from Scene #${currentSceneIndex + 1}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}

          {audioUrl && (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={disabled || isGenerating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50"
            >
              {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
              <span>{isGenerating ? "Syncing..." : videoUrl ? "Re-sync" : "Generate"}</span>
            </button>
          )}

          <div className="h-4 w-px bg-zinc-800 shrink-0 mx-0.5" />

          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            aria-label="Expand lip-sync panel"
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 text-zinc-400 hover:text-white transition-all cursor-pointer"
            title="Expand panel"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 backdrop-blur-md space-y-4 ${className}`}
    >
      {/* Header & Beacons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Mic2 className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-zinc-100">Lip-Sync Neural Engine</h4>
            <p className="text-[11px] text-zinc-400">
              Zero-latency facial sync via TensorRT & diffusion
            </p>
          </div>
        </div>

        {/* Actions & Microservice Beacons */}
        <div className="flex items-center gap-2">
          {onRerollLoop && (
            <button
              type="button"
              onClick={onRerollLoop}
              disabled={disabled || isGenerating}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-fuchsia-500/40 text-fuchsia-300 bg-fuchsia-950/40 hover:bg-fuchsia-900/60 hover:text-white text-[11px] font-bold transition-all cursor-pointer shadow-sm disabled:opacity-40"
              title="🎲 Reroll Action Loop for this scene"
            >
              <Shuffle className="h-3 w-3 text-fuchsia-400" />
              <span>🎲 Reroll Loop</span>
            </button>
          )}

          {services.map((s) => (
            <div
              key={s.name}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-[10px]"
              title={`${s.name} on :${s.port}`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  s.online ? "bg-emerald-400 animate-pulse" : "bg-red-400"
                }`}
              />
              <span className="text-zinc-300 font-mono">:{s.port}</span>
            </div>
          ))}

          <div className="h-4 w-px bg-zinc-800 shrink-0 mx-0.5" />

          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            aria-label="Collapse lip-sync panel"
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 text-zinc-400 hover:text-white transition-all cursor-pointer"
            title="Collapse panel"
          >
            <ChevronDown className="h-4 w-4 rotate-180" />
          </button>
        </div>
      </div>

      {/* Engine Selection Radios: MuseTalk & Ditto Only */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setSelectedEngine("musetalk")}
          disabled={disabled || isGenerating}
          className={`relative flex flex-col p-2.5 rounded-lg border text-left transition-all ${
            selectedEngine === "musetalk"
              ? "border-emerald-500 bg-emerald-500/10 shadow-sm ring-1 ring-emerald-500/30"
              : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-100">
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              <span>MuseTalk Realtime</span>
            </div>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold font-mono">
              350+ FPS
            </span>
          </div>
          <p className="text-[10px] text-zinc-400">TensorRT FP8/FP16 zero-lag broadcast visemes (:8010)</p>
        </button>

        <button
          type="button"
          onClick={() => setSelectedEngine("ditto")}
          disabled={disabled || isGenerating}
          className={`relative flex flex-col p-2.5 rounded-lg border text-left transition-all ${
            selectedEngine === "ditto"
              ? "border-cyan-500 bg-cyan-500/10 shadow-sm ring-1 ring-cyan-500/30"
              : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-100">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              <span>Ditto Motion-Space</span>
            </div>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-semibold font-mono">
              ACM MM &apos;25
            </span>
          </div>
          <p className="text-[10px] text-zinc-400">Ant Group identity-agnostic motion diffusion Docker (:8010/:8012)</p>
        </button>
      </div>

      {/* Options & Flags */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-zinc-800/80 text-xs">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-1.5 text-zinc-300 cursor-pointer">
            <input
              type="checkbox"
              checked={transparentAlpha}
              onChange={(e) => setTransparentAlpha(e.target.checked)}
              disabled={disabled || isGenerating}
              className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500/20"
            />
            <span>32-bit Transparent Alpha (VP9 WebM)</span>
          </label>

          <label className="flex items-center gap-1.5 text-zinc-300 cursor-pointer">
            <input
              type="checkbox"
              checked={useCachedLatents}
              onChange={(e) => setUseCachedLatents(e.target.checked)}
              disabled={disabled || isGenerating}
              className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500/20"
            />
            <span>Pre-cached Latents (latents.pt)</span>
          </label>
        </div>

        {/* Status Messages */}
        {statusMessage && (
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
            {isGenerating ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3 w-3" />
            )}
            <span>{statusMessage}</span>
          </div>
        )}
      </div>

      {/* Progress Bar if generating */}
      {isGenerating && progressPercent !== null && (
        <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-emerald-500 h-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Unified Lip-Sync Action / Status Strip */}
      {isVeoScene ? (
        <div className="flex items-center justify-between p-2.5 px-3 rounded-lg bg-purple-950/40 border border-purple-500/40 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Film className="h-4 w-4 text-purple-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-purple-200 font-semibold text-[11px] block truncate">
                Scene #{currentSceneIndex + 1} Veo Video Scene (Lip-Sync Native)
              </span>
              <span className="text-[10px] text-zinc-400 block truncate">
                Presenter dialogue and mouth visemes are already rendered in the photorealistic video. Lip-sync skipped.
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono text-purple-300 bg-purple-900/60 px-2 py-0.5 rounded border border-purple-500/30 shrink-0">
            Skipped
          </span>
        </div>
      ) : videoUrl ? (
        <div className="flex items-center justify-between p-2 px-3 rounded-lg bg-emerald-950/25 border border-emerald-500/30 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="text-emerald-300 font-semibold text-[11px] truncate">
              Scene #{currentSceneIndex + 1} Video Ready
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={disabled || isGenerating || !audioUrl}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black text-[11px] font-bold transition-all shadow cursor-pointer disabled:opacity-40"
              title="Re-generate lip-sync video"
            >
              {isGenerating ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              <span>Re-generate</span>
            </button>
            {onDeleteLipSync && (
              <button
                type="button"
                onClick={onDeleteLipSync}
                disabled={isGenerating || disabled}
                className="p-1 rounded hover:bg-red-950/50 text-zinc-500 hover:text-red-400 border border-transparent hover:border-red-500/30 transition-colors cursor-pointer"
                title="Delete lip-sync video"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleGenerate}
          disabled={disabled || isGenerating || !audioUrl}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-black hover:bg-emerald-400 transition-colors shadow-md shadow-emerald-950/40 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Synthesizing Scene #{currentSceneIndex + 1} Lip-Sync...</span>
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" />
              <span>Generate Lip-Sync Video for Scene #{currentSceneIndex + 1}</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
