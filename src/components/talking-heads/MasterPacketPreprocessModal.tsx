"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Zap,
  CheckCircle2,
  Clock,
  HardDrive,
  Cpu,
  Layers,
  Sparkles,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  AvatarCacheStatus,
  TALKING_HEAD_MODELS,
  } from "@/lib/ai/talkingHeadsClient";

interface MasterPacketPreprocessModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeAvatarId?: string;
}

const DEFAULT_AVATARS = [
  { id: "ruby", name: "Ruby — Lead Prime Anchor", role: "Evening News & Political Analysis" },
  { id: "david", name: "David — Financial Market Specialist", role: "Macroeconomics & Equities" },
  { id: "alex", name: "Alex — Investigative Tech Reporter", role: "AI & Cybersecurity Roundups" },
  { id: "sophia", name: "Sophia — Global Affairs Diplomat", role: "International Breaking News" },
];

export function MasterPacketPreprocessModal({
  isOpen,
  onClose,
  activeAvatarId = "ruby",
}: MasterPacketPreprocessModalProps) {
  const [selectedAvatar, setSelectedAvatar] = useState(activeAvatarId);
  const [cacheStatus, setCacheStatus] = useState<AvatarCacheStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [processingEngine, setProcessingEngine] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const fetchStatus = async (avatarId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/talking-heads/cache?avatarId=${encodeURIComponent(avatarId)}`);
      if (res.ok) {
        const data: AvatarCacheStatus = await res.json();
        setCacheStatus(data);
      }
    } catch (err) {
      console.error("Failed to load cache status", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus(selectedAvatar);
    }
  }, [isOpen, selectedAvatar]);

  const handlePreprocessEngine = async (engineId: string) => {
    setProcessingEngine(engineId);
    setLogs((prev) => [
      `[${new Date().toLocaleTimeString()}] 🚀 Initiating pre-processing for '${selectedAvatar}' on engine '${engineId}'...`,
      ...prev,
    ]);

    try {
      const res = await fetch("/api/talking-heads/preprocess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          avatarId: selectedAvatar,
          engine: engineId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setLogs((prev) => [
          `[${new Date().toLocaleTimeString()}] ✅ ${data.message} (${data.artifactsCreated.length} artifacts, ${data.totalSizeMb} MB, ${data.elapsedSeconds}s)`,
          ...prev,
        ]);
        await fetchStatus(selectedAvatar);
      } else {
        const err = await res.text();
        setLogs((prev) => [
          `[${new Date().toLocaleTimeString()}] ❌ Failed on '${engineId}': ${err}`,
          ...prev,
        ]);
      }
    } catch (err: unknown) {
      setLogs((prev) => [
        `[${new Date().toLocaleTimeString()}] ❌ Network error: ${err instanceof Error ? err.message : String(err)}`,
        ...prev,
      ]);
    } finally {
      setProcessingEngine(null);
    }
  };

  const handlePreprocessAll = async () => {
    for (const model of TALKING_HEAD_MODELS) {
      await handlePreprocessEngine(model.id);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-inner">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Master Asset Pre-Processing Suite
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono">
                  &lt;10ms Cold Start
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Pre-extract landmarks, VAE latents (<code className="text-emerald-300">latents.pt</code>), BiSeNet alpha masks, and ClipVision features to eliminate inference latency.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Avatar Bar & Action Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-3 bg-slate-950/60 border-b border-slate-800/80 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Anchor:</span>
            <div className="flex gap-1.5">
              {DEFAULT_AVATARS.map((av) => (
                <button
                  key={av.id}
                  onClick={() => setSelectedAvatar(av.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition border ${
                    selectedAvatar === av.id
                      ? "bg-emerald-600/30 text-emerald-300 border-emerald-500/60 shadow-sm"
                      : "bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-slate-200"
                  }`}
                >
                  {av.id.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchStatus(selectedAvatar)}
              disabled={isLoading}
              className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 border border-slate-700/60 transition"
              title="Refresh Status"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={handlePreprocessAll}
              disabled={processingEngine !== null}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-950 transition disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Pre-Process All 9 Engines
            </button>
          </div>
        </div>

        {/* Engine Status Grid */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {TALKING_HEAD_MODELS.map((model) => {
              const engStatus = cacheStatus?.engines?.[model.id];
              const isCached = engStatus?.cached;
              const isBusy = processingEngine === model.id;

              return (
                <div
                  key={model.id}
                  className={`p-4 rounded-xl border transition flex flex-col justify-between ${
                    isCached
                      ? "bg-slate-900/60 border-emerald-500/30 shadow-sm shadow-emerald-950/20"
                      : "bg-slate-900/40 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-white text-sm">{model.name}</h4>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/50">
                            {model.architecture.split("+")[0]}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{model.organization}</p>
                      </div>

                      {isCached ? (
                        <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Cached ({engStatus.coldStartLatency})
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-[11px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                          <Clock className="w-3.5 h-3.5" />
                          Uncached (Slow)
                        </span>
                      )}
                    </div>

                    {/* Artifact Badges */}
                    <div className="flex flex-wrap gap-1.5 my-2">
                      {engStatus?.artifacts.map((art) => (
                        <span
                          key={art.name}
                          className={`text-[10px] font-mono px-2 py-0.5 rounded border flex items-center gap-1 ${
                            art.cached
                              ? "bg-emerald-950/40 text-emerald-300 border-emerald-800/60"
                              : "bg-slate-800/40 text-slate-500 border-slate-800"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${art.cached ? "bg-emerald-400" : "bg-slate-600"}`} />
                          {art.name}
                          {art.cached && <span className="opacity-60 text-[9px]">({art.sizeKb}KB)</span>}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions & Stats Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 mt-2 text-xs">
                    <span className="text-slate-500">
                      Total: <span className="text-slate-300 font-mono">{engStatus?.sizeMb || 0} MB</span>
                    </span>

                    <button
                      onClick={() => handlePreprocessEngine(model.id)}
                      disabled={isBusy || processingEngine !== null}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                        isCached
                          ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                          : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
                      } disabled:opacity-50`}
                    >
                      {isBusy ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Pre-Baking...
                        </>
                      ) : isCached ? (
                        <>
                          <RefreshCw className="w-3 h-3" />
                          Re-Preprocess
                        </>
                      ) : (
                        <>
                          <Zap className="w-3 h-3" />
                          Pre-Process Master Packet
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Activity Log Terminal */}
          {logs.length > 0 && (
            <div className="mt-4 p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] space-y-1 max-h-32 overflow-y-auto">
              <div className="text-xs text-slate-400 font-semibold mb-1 flex items-center gap-1.5">
                <Layers className="w-3 h-3 text-emerald-400" />
                Pre-Processing Engine Logs:
              </div>
              {logs.map((log, i) => (
                <div key={i} className="text-slate-300 leading-relaxed">
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-900/60 text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-emerald-400" />
              Total Cached: <strong className="text-white">{cacheStatus?.totalCacheSizeMb || 0} MB</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-cyan-400" />
              Storage: <code className="text-slate-300">/app/cache/anchors/{selectedAvatar}/</code>
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
