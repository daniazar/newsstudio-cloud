"use client";

import React, { useState, useEffect } from "react";
import { TalkingHeadModelProfile } from "@/lib/ai/talkingHeadsClient";
import {
  GitFork,
  ExternalLink,
  Copy,
  Check,
  Terminal,
  Info,
  X,
  HardDrive,
  Download,
  RefreshCw,
  FolderCheck,
  Layers,
  Database,
} from "lucide-react";

interface ForkManagerModalProps {
  model: TalkingHeadModelProfile | null;
  isOpen: boolean;
  onClose: () => void;
}

interface ModelCacheDetails {
  repo_cloned?: boolean;
  repo_path?: string;
  repo_size_mb?: number;
  weights_cached?: boolean;
  hf_model_id?: string;
}

interface ForkCacheStatus {
  models?: Record<string, ModelCacheDetails>;
}

export function ForkManagerModal({ model, isOpen, onClose }: ForkManagerModalProps) {
  const [activeTab, setActiveTab] = useState<"fork" | "cache">("cache");
  const [copied, setCopied] = useState<string | null>(null);
  const [cacheData, setCacheData] = useState<ForkCacheStatus | null>(null);
  const [loadingCache, setLoadingCache] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const fetchCacheStatus = async () => {
    setLoadingCache(true);
    try {
      const res = await fetch("/api/talking-heads/cache");
      if (res.ok) {
        const data: ForkCacheStatus = await res.json();
        setCacheData(data);
      }
    } catch {
      // Ignored
    } finally {
      setLoadingCache(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    let isCancelled = false;

    fetch("/api/talking-heads/cache")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ForkCacheStatus | null) => {
        if (!isCancelled && data) {
          setCacheData(data);
        }
      })
      .catch(() => {
        // Ignored
      });

    return () => {
      isCancelled = true;
    };
  }, [isOpen]);

  const handleCacheAction = async (action: "clone" | "download") => {
    if (!model) return;
    setActionInProgress(action);
    try {
      await fetch("/api/talking-heads/cache", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId: model.id, action }),
      });
      await fetchCacheStatus();
    } catch {
      // Ignored
    } finally {
      setActionInProgress(null);
    }
  };

  if (!isOpen || !model) return null;

  const repoName = model.repoUrl.split("/").pop()?.replace(".git", "") || model.id;
  const userForkUrl = `https://github.com/daniazar/${repoName}.git`;

  const submoduleUpdateCommand = `git submodule set-url ${model.submodulePath} ${userForkUrl}\ngit submodule sync\ngit commit -am "chore(vendor): point ${model.name} submodule to daniazar fork"`;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const modelCache = cacheData?.models?.[model.id];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-[#090d16] border border-white/15 rounded-2xl shadow-2xl overflow-hidden text-white animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Model Caching &amp; Remote Settings
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-gray-300 border border-white/10">
                  {model.name}
                </span>
              </h3>
              <p className="text-xs text-gray-400 font-mono">
                {model.submodulePath}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 px-6 bg-black/30">
          <button
            onClick={() => setActiveTab("cache")}
            className={`py-2.5 px-4 text-xs font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "cache"
                ? "border-purple-500 text-purple-400"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            Model &amp; Repo Cache
          </button>
          <button
            onClick={() => setActiveTab("fork")}
            className={`py-2.5 px-4 text-xs font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "fork"
                ? "border-purple-500 text-purple-400"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <GitFork className="w-3.5 h-3.5" />
            Git Fork &amp; Remote
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs text-gray-300 max-h-[70vh] overflow-y-auto">
          {activeTab === "cache" ? (
            <>
              {/* Cache status banner */}
              <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/30 flex items-start gap-3">
                <Database className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-purple-200">Layer &amp; Volume Cache Optimization</p>
                  <p className="text-purple-300/80 leading-relaxed">
                    Model checkpoints (<span className="text-white font-mono">/app/weights</span>) and cloned repos (<span className="text-white font-mono">/app/repos</span>) are mounted to persistent Docker volumes. Your server code (<span className="text-white font-mono">server.py</span>, <span className="text-white font-mono">engine_loader.py</span>) is live-mounted from host disk so code edits reload instantly without rebuilding or re-downloading!
                  </p>
                </div>
              </div>

              {/* Cache Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-gray-300 flex items-center gap-1.5">
                      <FolderCheck className="w-3.5 h-3.5 text-cyan-400" />
                      Repository Code
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                        modelCache?.repo_cloned
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      {modelCache?.repo_cloned ? "Cached" : "Pending"}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 font-mono truncate">
                    {modelCache?.repo_path || "Not yet cached"}
                  </p>
                  <div className="pt-2 flex items-center justify-between border-t border-white/10 text-[10px]">
                    <span className="text-gray-500">Size: {modelCache?.repo_size_mb || 0} MB</span>
                    <button
                      onClick={() => handleCacheAction("clone")}
                      disabled={actionInProgress !== null}
                      className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-mono flex items-center gap-1 transition-colors disabled:opacity-50"
                    >
                      {actionInProgress === "clone" ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <Download className="w-3 h-3" />
                      )}
                      Clone / Sync
                    </button>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-gray-300 flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5 text-purple-400" />
                      Model Checkpoints
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                        modelCache?.weights_cached
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                      }`}
                    >
                      {modelCache?.weights_cached ? "Ready" : "Not Downloaded"}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 font-mono truncate">
                    {modelCache?.hf_model_id || "Weights on HuggingFace"}
                  </p>
                  <div className="pt-2 flex items-center justify-between border-t border-white/10 text-[10px]">
                    <span className="text-gray-500">Est. VRAM: {model.vramGb} GB</span>
                    <button
                      onClick={() => handleCacheAction("download")}
                      disabled={actionInProgress !== null}
                      className="px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 font-mono flex items-center gap-1 transition-colors disabled:opacity-50"
                    >
                      {actionInProgress === "download" ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <Download className="w-3 h-3" />
                      )}
                      Cache Weights
                    </button>
                  </div>
                </div>
              </div>

              {/* Volumes Info */}
              <div className="p-3 rounded-xl bg-black/50 border border-white/10 space-y-1.5 font-mono text-[11px]">
                <div className="flex items-center justify-between text-gray-400">
                  <span>Docker Persistent Volumes:</span>
                  <button onClick={fetchCacheStatus} className="hover:text-white flex items-center gap-1">
                    <RefreshCw className={`w-3 h-3 ${loadingCache ? "animate-spin" : ""}`} />
                    Refresh
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-400 pt-1">
                  <div>
                    <span className="text-purple-400">Weights Volume:</span> talkinghead_weights
                  </div>
                  <div>
                    <span className="text-cyan-400">HF Cache Volume:</span> talkinghead_hf_cache
                  </div>
                  <div>
                    <span className="text-emerald-400">Repos Volume:</span> talkinghead_repos
                  </div>
                  <div>
                    <span className="text-amber-400">Host Live Mount:</span> vendor/Modern-TalkingHead-Server
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Status Note */}
              <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-500/30 flex items-start gap-3">
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-blue-200">Current Remote Strategy: Upstream Tracking</p>
                  <p className="text-blue-300/80 leading-relaxed">
                    Tracked from official research upstream. When you need custom architectural modifications or server adapters, fork it to your GitHub account (<span className="text-white font-mono">daniazar/{repoName}</span>) and apply the commands below.
                  </p>
                </div>
              </div>

              {/* URLs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono">
                <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-1">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider block">Official Upstream URL</span>
                  <a
                    href={model.repoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-400 hover:underline flex items-center gap-1.5 truncate text-[11px]"
                  >
                    <span className="truncate">{model.repoUrl}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>

                <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-1">
                  <span className="text-[10px] text-purple-400 uppercase tracking-wider block">Your Personal Fork URL</span>
                  <div className="flex items-center justify-between text-purple-300 text-[11px]">
                    <span className="truncate">{userForkUrl}</span>
                    <button
                      onClick={() => copyToClipboard(userForkUrl, "forkUrl")}
                      className="text-gray-400 hover:text-white p-1"
                    >
                      {copied === "forkUrl" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Code block 1: Switch submodule remote */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono text-gray-400 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                    Switch Submodule Remote to Personal Fork:
                  </label>
                  <button
                    onClick={() => copyToClipboard(submoduleUpdateCommand, "cmd1")}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-[11px] text-gray-300 font-mono transition-colors"
                  >
                    {copied === "cmd1" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied === "cmd1" ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-black/70 border border-white/10 font-mono text-[11px] text-emerald-400/90 overflow-x-auto">
                  {submoduleUpdateCommand}
                </pre>
              </div>
            </>
          )}

          {/* Model Spec Details */}
          <div className="pt-2 border-t border-white/10 grid grid-cols-3 gap-2 font-mono text-[11px]">
            <div>
              <span className="text-gray-500 block">Venue:</span>
              <span className="text-gray-300">{model.paperVenue}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Resolution:</span>
              <span className="text-gray-300">{model.resolution}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Est. VRAM:</span>
              <span className="text-gray-300">{model.vramGb} GB</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-black/50 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
