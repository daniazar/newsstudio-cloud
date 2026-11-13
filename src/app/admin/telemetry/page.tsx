"use client";

import React, { useState } from "react";
import useSWR from "swr";
import {
  Activity,
  Cpu,
  HardDrive,
  RefreshCw,
  Server,
  Zap,
  Layers,
  PowerOff,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Box,
  Sparkles,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface ServiceMetric {
  id: string;
  name: string;
  category: string;
  defaultPort?: number;
  status: "ONLINE" | "BUSY" | "OFFLINE" | "UNCONFIGURED";
  pids: number[];
  containerName?: string;
  dockerImage?: string;
  cpuPct: number;
  ramMb: number;
  ramPct: number;
  vramMb: number;
  vramPct: number;
  latencyMs?: number;
  details?: string;
  activeProfile?: string;
  inactivityTimeoutSeconds?: number;
}

export interface DockerImageReport {
  repository: string;
  tag: string;
  imageId: string;
  createdSince: string;
  size: string;
  serviceName?: string;
  inUse: boolean;
}

interface TopProcess {
  pid: number;
  name: string;
  displayName: string;
  ramMb: number;
  vramMb?: number;
  cpuSeconds?: number;
}

export interface DockerInstanceMetric {
  id: string;
  name: string;
  image: string;
  status: string;
  hasGpu: boolean;
  cpuPct: number;
  ramMb: number;
  ramLimitMb: number;
  vramMb: number;
  details?: string;
  serviceId?: string;
  serviceName?: string;
}

interface TelemetryData {
  timestamp: string;
  gpu?: {
    name: string;
    vramUsedMb: number;
    vramTotalMb: number;
    vramUsedPct: number;
    gpuUtilPct: number;
    tempC: number;
    powerW: number;
  };
  system: {
    platform: string;
    cpuModel: string;
    cpuCores: number;
    totalMemMb: number;
    usedMemMb: number;
    freeMemMb: number;
    memUsedPct: number;
    uptimeHours: number;
  };
  queue: {
    queued: number;
    processing: number;
    failed: number;
    completed24h: number;
  };
  services: ServiceMetric[];
  totalServiceRamMb: number;
  totalServiceVramMb: number;
  hostOtherRamMb: number;
  hostOtherVramMb: number;
  topOtherProcesses: TopProcess[];
  dockerImages?: DockerImageReport[];
  dockerTotalVramMb?: number;
  dockerTotalRamMb?: number;
  dockerDriverCacheVramMb?: number;
  dockerInstances?: DockerInstanceMetric[];
}

function formatMb(mb: number): string {
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(2)} GB`;
  }
  return `${Math.round(mb)} MB`;
}

export default function AdminTelemetryPage() {
  const [liveMonitor, setLiveMonitor] = useState(false);

  const { data, mutate, isValidating } = useSWR<TelemetryData>(
    "/api/admin/telemetry",
    fetcher,
    { refreshInterval: liveMonitor ? 10_000 : 0, revalidateOnFocus: false }
  );

  const { data: memData, mutate: mutateMem } = useSWR<{
    status: string;
    gcAvailable: boolean;
    processMemory: {
      rssMB: number;
      heapTotalMB: number;
      heapUsedMB: number;
      externalMB: number;
      arrayBuffersMB: number;
    };
    v8HeapStatistics: {
      totalHeapSizeMB: number;
      usedHeapSizeMB: number;
      heapSizeLimitMB: number;
    };
  }>("/api/health/memory", fetcher, {
    refreshInterval: liveMonitor ? 10_000 : 0,
    revalidateOnFocus: false,
  });

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const handleTriggerGc = async () => {
    setActionLoading("gc");
    try {
      const res = await fetch("/api/health/memory", { method: "POST" });
      const json = await res.json();
      if (res.ok && json.status === "ok") {
        setActionMessage({
          text: `Garbage collection executed: Freed ${json.freed?.heapMB || 0} MB heap memory!`,
          type: "success",
        });
        await mutateMem();
      } else {
        setActionMessage({ text: json.message || "GC trigger failed", type: "error" });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionMessage({ text: msg, type: "error" });
    } finally {
      setActionLoading(null);
      setTimeout(() => setActionMessage(null), 5000);
    }
  };

  const handleCleanTemp = async () => {
    setActionLoading("cleanTemp");
    try {
      const res = await fetch("/api/health/memory?cleanTemp=true");
      const json = await res.json();
      if (res.ok && json.tempCleanResult) {
        setActionMessage({
          text: `Purged ${json.tempCleanResult.cleanedCount} stale temp artifacts (${json.tempCleanResult.freedMB} MB freed)!`,
          type: "success",
        });
      } else {
        setActionMessage({ text: "Temp cleanup executed", type: "success" });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionMessage({ text: msg, type: "error" });
    } finally {
      setActionLoading(null);
      setTimeout(() => setActionMessage(null), 5000);
    }
  };

  const handleKillService = async (serviceId: string, serviceName: string) => {
    if (!confirm(`Are you sure you want to stop/kill ${serviceName} and release its memory?`)) {
      return;
    }
    setActionLoading(serviceId);
    try {
      const res = await fetch("/api/admin/services/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setActionMessage({ text: json.message || `Stopped ${serviceName}`, type: "success" });
        await mutate();
      } else {
        setActionMessage({ text: json.message || `Failed to stop ${serviceName}`, type: "error" });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionMessage({ text: msg, type: "error" });
    } finally {
      setActionLoading(null);
      setTimeout(() => setActionMessage(null), 5000);
    }
  };

  const handleSwitchProfile = async (serviceId: string, profile: string) => {
    setActionLoading(`profile_${serviceId}_${profile}`);
    try {
      const res = await fetch("/api/admin/services/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId, action: "profile", profile }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setActionMessage({ text: json.message || `Switched profile to ${profile.toUpperCase()}`, type: "success" });
        await mutate();
      } else {
        setActionMessage({ text: json.message || `Failed to switch profile`, type: "error" });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionMessage({ text: msg, type: "error" });
    } finally {
      setActionLoading(null);
      setTimeout(() => setActionMessage(null), 5000);
    }
  };

  const handleSetWatchdogTimeout = async (serviceId: string, timeoutSeconds: number) => {
    setActionLoading(`timeout_${serviceId}`);
    try {
      const res = await fetch("/api/admin/services/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId, action: "timeout", timeoutSeconds }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setActionMessage({ text: json.message || `Updated watchdog timeout`, type: "success" });
        await mutate();
      } else {
        setActionMessage({ text: json.message || `Failed to update timeout`, type: "error" });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionMessage({ text: msg, type: "error" });
    } finally {
      setActionLoading(null);
      setTimeout(() => setActionMessage(null), 5000);
    }
  };

  const handleKillAllAI = async () => {
    if (!confirm("Are you sure you want to stop and release ALL AI microservices (Modern-TTS, MuseTalk, KeySync, Ollama, ComfyUI)?")) {
      return;
    }
    setActionLoading("all");
    try {
      const res = await fetch("/api/admin/services/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId: "all" }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setActionMessage({ text: json.message, type: "success" });
        await mutate();
      } else {
        setActionMessage({ text: json.message || "Failed to stop all services", type: "error" });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionMessage({ text: msg, type: "error" });
    } finally {
      setActionLoading(null);
      setTimeout(() => setActionMessage(null), 5000);
    }
  };

  const handleFlushVramCache = async () => {
    setActionLoading("flush_vram");
    try {
      const res = await fetch("/api/admin/services/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId: "talkinghead_vram" }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setActionMessage({ text: json.message, type: "success" });
        await mutate();
      } else {
        setActionMessage({ text: json.message || "Failed to flush VRAM caches", type: "error" });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionMessage({ text: msg, type: "error" });
    } finally {
      setActionLoading(null);
      setTimeout(() => setActionMessage(null), 5000);
    }
  };

  const gpu = data?.gpu;
  const system = data?.system;
  const queue = data?.queue;
  const services = data?.services || [];
  const topOther = data?.topOtherProcesses || [];

  return (
    <div className="min-h-screen bg-background p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/80 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-500 to-sky-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 border border-emerald-400/30">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-foreground tracking-tight">GPU & System Telemetry</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                LIVE METRICS
              </span>
            </div>
            <p className="text-xs text-subtle font-normal mt-0.5">Real-time NVIDIA CUDA acceleration, hardware thermal state, and microservice cluster health</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleTriggerGc}
            disabled={actionLoading !== null}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
            title="Trigger manual V8 garbage collection compaction"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${actionLoading === "gc" ? "animate-spin text-emerald-400" : ""}`} />
            <span>Run V8 GC</span>
          </button>

          <button
            onClick={handleCleanTemp}
            disabled={actionLoading !== null}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-mono font-bold transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
            title="Purge orphaned render and AI temporary files"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Purge Temp</span>
          </button>

          <button
            onClick={handleFlushVramCache}
            disabled={actionLoading !== null}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-mono font-bold transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
            title="Flush Avatar Pool & PyTorch CUDA cache from Modern-TalkingHead without stopping container"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Flush VRAM Cache</span>
          </button>

          <button
            onClick={handleKillAllAI}
            disabled={actionLoading !== null}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-mono font-bold transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
            title="Stop all AI services to free maximum GPU VRAM and RAM"
          >
            <PowerOff className="w-3.5 h-3.5" />
            <span>Free All AI VRAM</span>
          </button>

          <button
            onClick={() => setLiveMonitor((prev) => !prev)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer shadow-sm active:scale-95 ${
              liveMonitor
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                : "bg-surface-raised/90 border-border/80 hover:bg-white/[0.08] text-muted"
            }`}
            title="Toggle 10s telemetry polling (off by default to stay idle)"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{liveMonitor ? "Live (10s)" : "Live: Off"}</span>
          </button>

          <button
            onClick={() => { mutate(); mutateMem(); }}
            disabled={isValidating}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-raised/90 border border-border/80 hover:bg-white/[0.08] text-xs font-mono font-bold text-foreground transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isValidating ? "animate-spin text-emerald-400" : "text-muted"}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionMessage && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 text-xs font-mono font-bold transition-all ${
            actionMessage.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-rose-500/10 border-rose-500/30 text-rose-400"
          }`}
        >
          {actionMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Grid Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
        {/* GPU VRAM Card */}
        <div className="glass-panel-raised rounded-3xl border border-border/80 p-5 space-y-3.5 shadow-lg">
          <div className="flex items-center justify-between text-subtle">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">GPU VRAM Allocation</span>
            <Cpu className="w-4 h-4 text-emerald-400" />
          </div>
          {gpu ? (
            <>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-black text-foreground font-mono">{gpu.vramUsedPct}%</span>
                <span className="text-xs font-mono text-subtle tabular-nums font-bold">
                  {formatMb(gpu.vramUsedMb)} / {formatMb(gpu.vramTotalMb)}
                </span>
              </div>
              <div className="w-full bg-surface-raised h-2 rounded-full overflow-hidden border border-border/60">
                <div
                  className={`h-full rounded-full transition-all ${
                    gpu.vramUsedPct > 85 ? "bg-rose-500 shadow-[0_0_8px_#f43f5e]" : gpu.vramUsedPct > 60 ? "bg-amber-500 shadow-[0_0_8px_#f59e0b]" : "bg-emerald-500 shadow-[0_0_8px_#10b981]"
                  }`}
                  style={{ width: `${gpu.vramUsedPct}%` }}
                />
              </div>
              <p className="text-[10px] font-mono text-muted truncate">{gpu.name}</p>
            </>
          ) : (
            <div className="text-xs font-mono text-muted py-2">No NVIDIA GPU detected (running CPU/Mac)</div>
          )}
        </div>

        {/* GPU Core Utilization Card */}
        <div className="glass-panel-raised rounded-3xl border border-border/80 p-5 space-y-3.5 shadow-lg">
          <div className="flex items-center justify-between text-subtle">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">GPU Core Load</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          {gpu ? (
            <>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-black text-foreground font-mono">{gpu.gpuUtilPct}%</span>
                <span className="text-xs font-mono text-amber-400 font-bold tabular-nums">{gpu.tempC}°C</span>
              </div>
              <div className="w-full bg-surface-raised h-2 rounded-full overflow-hidden border border-border/60">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-500 transition-all shadow-[0_0_8px_#f59e0b]"
                  style={{ width: `${gpu.gpuUtilPct}%` }}
                />
              </div>
              <p className="text-[10px] font-mono text-muted">Thermal: {gpu.tempC}°C • Power: {gpu.powerW?.toFixed(0)}W</p>
            </>
          ) : (
            <div className="text-xs font-mono text-muted py-2">Integrated Graphics / MPS</div>
          )}
        </div>

        {/* System RAM Card */}
        <div className="glass-panel-raised rounded-3xl border border-border/80 p-5 space-y-3.5 shadow-lg">
          <div className="flex items-center justify-between text-subtle">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">System RAM</span>
            <HardDrive className="w-4 h-4 text-sky-400" />
          </div>
          {system ? (
            <>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-black text-foreground font-mono">{system.memUsedPct}%</span>
                <span className="text-xs font-mono text-subtle tabular-nums font-bold">
                  {formatMb(system.usedMemMb)} / {formatMb(system.totalMemMb)}
                </span>
              </div>
              <div className="w-full bg-surface-raised h-2 rounded-full overflow-hidden border border-border/60">
                <div
                  className="h-full rounded-full bg-sky-400 transition-all shadow-[0_0_8px_#38bdf8]"
                  style={{ width: `${system.memUsedPct}%` }}
                />
              </div>
              <p className="text-[10px] font-mono text-muted">
                {system.cpuCores} CPU Cores • Uptime {system.uptimeHours}h
              </p>
            </>
          ) : (
            <div className="text-xs font-mono text-muted py-2">Loading system memory...</div>
          )}
        </div>

        {/* Node.js V8 Heap Card */}
        <div className="glass-panel-raised rounded-3xl border border-border/80 p-5 space-y-3.5 shadow-lg">
          <div className="flex items-center justify-between text-subtle">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Node.js V8 Heap</span>
            <Activity className="w-4 h-4 text-teal-400" />
          </div>
          {memData?.processMemory ? (
            <>
              <div className="flex items-baseline justify-between">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-foreground font-mono">
                    {Math.round(((memData.processMemory.heapUsedMB) / (memData.processMemory.heapTotalMB || 1)) * 100)}%
                  </span>
                  <span className="text-[10px] font-mono text-muted">
                    committed ({Math.round((memData.processMemory.heapUsedMB / (memData.v8HeapStatistics?.heapSizeLimitMB || 1)) * 100)}% of max)
                  </span>
                </div>
                <span className="text-xs font-mono text-subtle tabular-nums font-bold">
                  {memData.processMemory.heapUsedMB} / {memData.processMemory.heapTotalMB} MB
                </span>
              </div>
              <div className="w-full bg-surface-raised h-2 rounded-full overflow-hidden border border-border/60">
                <div
                  className="h-full rounded-full bg-teal-400 transition-all shadow-[0_0_8px_#2dd4bf]"
                  style={{
                    width: `${Math.min(100, Math.round(((memData.processMemory.heapUsedMB) / (memData.processMemory.heapTotalMB || 1)) * 100))}%`
                  }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] font-mono text-muted">
                <span>RSS: {memData.processMemory.rssMB} MB</span>
                <span>Max Ceiling: {Math.round((memData.v8HeapStatistics?.heapSizeLimitMB || 0) / 1024)} GB</span>
                <span>GC: {memData.gcAvailable ? "EXPOSED" : "AUTO"}</span>
              </div>
            </>
          ) : (
            <div className="text-xs font-mono text-muted py-2">Loading Node.js memory...</div>
          )}
        </div>

        {/* Pipeline Queue Card */}
        <div className="glass-panel-raised rounded-3xl border border-border/80 p-5 space-y-3.5 shadow-lg">
          <div className="flex items-center justify-between text-subtle">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Pipeline Throughput</span>
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          {queue ? (
            <>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-foreground font-mono">{queue.processing} Active</span>
                <span className="text-xs font-mono text-amber-400 font-bold tabular-nums">{queue.queued} Queued</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono pt-1">
                <span className="text-emerald-400 font-bold">{queue.completed24h} Done (24h)</span>
                {queue.failed > 0 && <span className="text-rose-400 font-bold">{queue.failed} Failed</span>}
              </div>
            </>
          ) : (
            <div className="text-xs font-mono text-muted py-2">Loading queue telemetry...</div>
          )}
        </div>
      </div>

      {/* GPU VRAM Proportional Allocation Map Card */}
      {gpu && (
        <div className="glass-panel-raised rounded-3xl border border-border/80 p-6 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-400" />
              <span>GPU VRAM Allocation Map</span>
            </h2>
            <span className="text-[11px] font-mono text-muted">
              Total Used: <strong className="text-purple-400">{formatMb(gpu.vramUsedMb)}</strong> / {formatMb(gpu.vramTotalMb)} ({gpu.vramUsedPct}%) • Free: <strong className="text-emerald-400">{formatMb(Math.max(0, gpu.vramTotalMb - gpu.vramUsedMb))}</strong>
            </span>
          </div>

          {/* Proportional Segmented Progress Bar */}
          <div className="w-full bg-surface-raised h-4 rounded-xl overflow-hidden flex border border-border/60 p-0.5 gap-0.5">
            {(() => {
              const totalMb = gpu.vramTotalMb || 1;
              const segments: { label: string; mb: number; color: string; textColor: string }[] = [];

              (data?.dockerInstances || []).forEach((inst) => {
                if (inst.vramMb > 0) {
                  let color = "bg-purple-500 shadow-[0_0_8px_#a855f7]";
                  let textColor = "text-purple-400";
                  const lower = inst.name.toLowerCase();
                  if (lower.includes("talkinghead")) {
                    color = "bg-purple-500 shadow-[0_0_8px_#a855f7]";
                    textColor = "text-purple-400";
                  } else if (lower.includes("musetalk")) {
                    color = "bg-cyan-500 shadow-[0_0_8px_#06b6d4]";
                    textColor = "text-cyan-400";
                  } else if (lower.includes("motion")) {
                    color = "bg-emerald-500 shadow-[0_0_8px_#10b981]";
                    textColor = "text-emerald-400";
                  } else if (lower.includes("tts")) {
                    color = "bg-amber-500 shadow-[0_0_8px_#f59e0b]";
                    textColor = "text-amber-400";
                  }
                  segments.push({ label: inst.serviceName || inst.name, mb: inst.vramMb, color, textColor });
                }
              });

              if (data?.dockerDriverCacheVramMb && data.dockerDriverCacheVramMb > 0) {
                segments.push({
                  label: "WSL2 Driver Cache",
                  mb: data.dockerDriverCacheVramMb,
                  color: "bg-sky-700/60",
                  textColor: "text-sky-400",
                });
              }

              if (data?.hostOtherVramMb && data.hostOtherVramMb > 0) {
                segments.push({
                  label: "Host Desktop (dwm/Chrome)",
                  mb: data.hostOtherVramMb,
                  color: "bg-slate-500/50",
                  textColor: "text-slate-400",
                });
              }

              const freeMb = Math.max(0, totalMb - gpu.vramUsedMb);
              if (freeMb > 0) {
                segments.push({
                  label: "Free VRAM",
                  mb: freeMb,
                  color: "bg-white/[0.04]",
                  textColor: "text-muted",
                });
              }

              return segments.map((seg, idx) => {
                const pct = Math.max(0.5, (seg.mb / totalMb) * 100);
                return (
                  <div
                    key={idx}
                    className={`h-full rounded-lg transition-all ${seg.color}`}
                    style={{ width: `${pct}%` }}
                    title={`${seg.label}: ${formatMb(seg.mb)} (${((seg.mb / totalMb) * 100).toFixed(1)}%)`}
                  />
                );
              });
            })()}
          </div>

          {/* Allocation Legend */}
          <div className="flex flex-wrap gap-4 pt-1">
            {(() => {
              const totalMb = gpu.vramTotalMb || 1;
              const segments: { label: string; mb: number; dotColor: string; textColor: string }[] = [];

              (data?.dockerInstances || []).forEach((inst) => {
                if (inst.vramMb > 0) {
                  let dotColor = "bg-purple-400";
                  let textColor = "text-purple-400";
                  const lower = inst.name.toLowerCase();
                  if (lower.includes("talkinghead")) {
                    dotColor = "bg-purple-400";
                    textColor = "text-purple-400";
                  } else if (lower.includes("musetalk")) {
                    dotColor = "bg-cyan-400";
                    textColor = "text-cyan-400";
                  } else if (lower.includes("motion")) {
                    dotColor = "bg-emerald-400";
                    textColor = "text-emerald-400";
                  } else if (lower.includes("tts")) {
                    dotColor = "bg-amber-400";
                    textColor = "text-amber-400";
                  }
                  segments.push({ label: inst.serviceName || inst.name, mb: inst.vramMb, dotColor, textColor });
                }
              });

              if (data?.dockerDriverCacheVramMb && data.dockerDriverCacheVramMb > 0) {
                segments.push({
                  label: "WSL2 Driver Cache",
                  mb: data.dockerDriverCacheVramMb,
                  dotColor: "bg-sky-500",
                  textColor: "text-sky-400",
                });
              }

              if (data?.hostOtherVramMb && data.hostOtherVramMb > 0) {
                segments.push({
                  label: "Host Desktop",
                  mb: data.hostOtherVramMb,
                  dotColor: "bg-slate-400",
                  textColor: "text-slate-400",
                });
              }

              const freeMb = Math.max(0, totalMb - gpu.vramUsedMb);
              if (freeMb > 0) {
                segments.push({
                  label: "Free VRAM",
                  mb: freeMb,
                  dotColor: "bg-muted",
                  textColor: "text-muted",
                });
              }

              return segments.map((seg, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-[11px] font-mono">
                  <span className={`w-2 h-2 rounded-full ${seg.dotColor}`} />
                  <span className="text-subtle font-medium">{seg.label}:</span>
                  <strong className={seg.textColor}>{formatMb(seg.mb)}</strong>
                  <span className="text-muted text-[10px]">({((seg.mb / totalMb) * 100).toFixed(1)}%)</span>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {/* Services Health Table with Kill Controls */}
      <div className="glass-panel-raised rounded-3xl border border-border/80 p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Server className="w-4 h-4 text-emerald-400" />
            <span>AI Microservices & Engine Cluster</span>
          </h2>
          <span className="text-[11px] font-mono text-muted">
            Tracked AI VRAM: <strong className="text-purple-400">{formatMb(data?.totalServiceVramMb || 0)}</strong> • Host RAM: <strong className="text-sky-400">{formatMb(data?.totalServiceRamMb || 0)}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/80 text-[11px] font-mono font-bold text-subtle uppercase tracking-wider">
                <th className="py-3 px-3">Service</th>
                <th className="py-3 px-3">Port</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">CPU</th>
                <th className="py-3 px-3">Host RAM</th>
                <th className="py-3 px-3">GPU VRAM</th>
                <th className="py-3 px-3">Latency</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-xs font-mono">
              {services.map((s) => {
                const isOnline = s.status === "ONLINE" || s.status === "BUSY";
                const isBusy = s.status === "BUSY";
                const isLoading = actionLoading === s.id;

                return (
                  <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-foreground flex items-center gap-2">
                        <span>{s.name}</span>
                        {s.dockerImage && (
                          <span className="px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[9px] font-mono">
                            🐳 {s.dockerImage.split(':')[0]}
                          </span>
                        )}
                      </div>
                      {s.details && <div className="text-[10px] text-muted font-normal mt-0.5">{s.details}</div>}

                      {/* Interactive Profile Switcher for Modern-TalkingHead */}
                      {(s.id === "modern_talkinghead" || s.id === "musetalk") && isOnline && (
                        <div className="mt-2 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="text-[9px] font-mono uppercase tracking-wider text-muted mr-1">Profile:</span>
                            {[
                              { id: "musetalk", label: "MuseTalk (~708MB)" },
                              { id: "ditto", label: "Ditto (~7GB)" },
                              { id: "full", label: "Full (~11.5GB)" },
                              { id: "standby", label: "Standby (0MB)" },
                            ].map((p) => {
                              const isActive = s.activeProfile?.toLowerCase() === p.id;
                              const isSwitching = actionLoading === `profile_${s.id}_${p.id}`;
                              return (
                                <button
                                  key={p.id}
                                  onClick={() => handleSwitchProfile(s.id, p.id)}
                                  disabled={actionLoading !== null || isActive}
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all cursor-pointer ${
                                    isActive
                                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/50 shadow-sm shadow-purple-500/20 ring-1 ring-purple-400/30"
                                      : "bg-white/[0.04] text-muted hover:text-foreground hover:bg-white/[0.08] border border-border/60"
                                  } disabled:cursor-default`}
                                  title={`Switch Modern-TalkingHead to ${p.label}`}
                                >
                                  {isSwitching ? "..." : p.label}
                                </button>
                              );
                            })}
                          </div>
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="text-[9px] font-mono uppercase tracking-wider text-muted mr-1">Auto-Purge:</span>
                            {[
                              { sec: 300, label: "5m" },
                              { sec: 600, label: "10m" },
                              { sec: 1800, label: "30m" },
                              { sec: 0, label: "Off" },
                            ].map((w) => {
                              const isCurrent = s.inactivityTimeoutSeconds === w.sec || (w.sec === 600 && s.inactivityTimeoutSeconds === undefined);
                              return (
                                <button
                                  key={w.sec}
                                  onClick={() => handleSetWatchdogTimeout(s.id, w.sec)}
                                  disabled={actionLoading !== null || isCurrent}
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono transition-all cursor-pointer ${
                                    isCurrent
                                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50"
                                      : "bg-white/[0.03] text-muted hover:text-foreground hover:bg-white/[0.06] border border-border/40"
                                  } disabled:cursor-default`}
                                  title={w.sec === 0 ? "Disable auto-purge watchdog" : `Set auto-purge timeout to ${w.label}`}
                                >
                                  {w.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Interactive Profile Switcher for Modern-TTS */}
                      {(s.id === "modern_tts" || s.id === "tts") && isOnline && (
                        <div className="mt-2 flex flex-wrap items-center gap-1">
                          <span className="text-[9px] font-mono uppercase tracking-wider text-muted mr-1">Profile:</span>
                          {[
                            { id: "studio", label: "Studio (~1.6GB)" },
                            { id: "lightweight", label: "Lightweight (~450MB)" },
                            { id: "full", label: "Full (~14GB)" },
                          ].map((p) => {
                            const isActive = s.activeProfile?.toLowerCase() === p.id;
                            const isSwitching = actionLoading === `profile_${s.id}_${p.id}`;
                            return (
                              <button
                                key={p.id}
                                onClick={() => handleSwitchProfile(s.id, p.id)}
                                disabled={actionLoading !== null || isActive}
                                className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all cursor-pointer ${
                                  isActive
                                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/50 shadow-sm shadow-purple-500/20 ring-1 ring-purple-400/30"
                                    : "bg-white/[0.04] text-muted hover:text-foreground hover:bg-white/[0.08] border border-border/60"
                                } disabled:cursor-default`}
                                title={`Switch Modern-TTS to ${p.label}`}
                              >
                                {isSwitching ? "..." : p.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-muted">{s.defaultPort ? `:${s.defaultPort}` : "-"}</td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isBusy
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                            : isOnline
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : "bg-white/[0.04] text-muted border border-border/60"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isBusy ? "bg-amber-400 animate-ping" : isOnline ? "bg-emerald-400" : "bg-muted"
                          }`}
                        />
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-foreground">{s.cpuPct > 0 ? `${s.cpuPct.toFixed(1)}%` : "-"}</td>
                    <td className="py-3.5 px-3 text-foreground">{s.ramMb > 0 ? formatMb(s.ramMb) : "-"}</td>
                    <td className="py-3.5 px-3 text-purple-400 font-bold">{s.vramMb > 0 ? formatMb(s.vramMb) : "-"}</td>
                    <td className="py-3.5 px-3 text-muted">{s.latencyMs !== undefined && isOnline ? `${s.latencyMs}ms` : "-"}</td>
                    <td className="py-3.5 px-3 text-right">
                      {isOnline ? (
                        <div className="flex items-center justify-end gap-1.5">
                          {(s.id === "modern_talkinghead" || s.id === "musetalk") && (
                            <button
                              onClick={async () => {
                                setActionLoading(`cache_${s.id}`);
                                try {
                                  const res = await fetch("/api/admin/services/control", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ serviceId: "talkinghead_vram" }),
                                  });
                                  const json = await res.json();
                                  setActionMessage({
                                    text: json.message || "VRAM cache cleared",
                                    type: json.success ? "success" : "error",
                                  });
                                  await mutate();
                                } catch (e: unknown) {
                                  setActionMessage({ text: String(e), type: "error" });
                                } finally {
                                  setActionLoading(null);
                                  setTimeout(() => setActionMessage(null), 5000);
                                }
                              }}
                              disabled={actionLoading !== null}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[10px] font-mono font-bold transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                              title="Flush Avatar Pool and PyTorch cache from VRAM without stopping the server"
                            >
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>{actionLoading === `cache_${s.id}` ? "Flushing..." : "Flush VRAM"}</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleKillService(s.id, s.name)}
                            disabled={isLoading}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] font-mono font-bold transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                            title={`Stop/Kill ${s.name} and free resources`}
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>{isLoading ? "Stopping..." : "Kill / Free"}</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted font-normal">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Docker Container Inventory & VRAM Allocation Card */}
      {data?.dockerInstances && data.dockerInstances.length > 0 && (
        <div className="glass-panel-raised rounded-3xl border border-border/80 p-6 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Box className="w-4 h-4 text-cyan-400" />
              <span>Docker Container Inventory & GPU Acceleration</span>
            </h2>
            <span className="text-[11px] font-mono text-muted">
              WSL2 VM VRAM: <strong className="text-purple-400">{formatMb(data?.dockerTotalVramMb || 0)}</strong> • WSL2 VM RAM: <strong className="text-sky-400">{formatMb(data?.dockerTotalRamMb || 0)}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/80 text-[11px] font-mono font-bold text-subtle uppercase tracking-wider">
                  <th className="py-3 px-3">Container Name</th>
                  <th className="py-3 px-3">GPU Accel</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">CPU</th>
                  <th className="py-3 px-3">RAM</th>
                  <th className="py-3 px-3">GPU VRAM</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-xs font-mono">
                {data.dockerInstances.map((c) => {
                  const isLoading = actionLoading === c.name || actionLoading === c.id;
                  return (
                    <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-foreground flex items-center gap-2">
                          <span>{c.name}</span>
                          {c.serviceName && (
                            <span className="text-[10px] text-muted font-normal">
                              ({c.serviceName})
                            </span>
                          )}
                        </div>
                        {c.details && <div className="text-[10px] text-muted font-normal mt-0.5">{c.details}</div>}
                      </td>
                      <td className="py-3 px-3">
                        {c.hasGpu ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/30">
                            ⚡ NVIDIA
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/[0.04] text-muted border border-border/60">
                            ○ CPU only
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-muted">{c.status}</td>
                      <td className="py-3 px-3 text-foreground">{c.cpuPct > 0 ? `${c.cpuPct.toFixed(1)}%` : "-"}</td>
                      <td className="py-3 px-3 text-foreground">{c.ramMb > 0 ? formatMb(c.ramMb) : "-"}</td>
                      <td className="py-3 px-3 text-purple-400 font-bold">{c.vramMb > 0 ? formatMb(c.vramMb) : "-"}</td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleKillService(c.name, c.name)}
                          disabled={isLoading}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] font-mono font-bold transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                          title={`Stop Docker container ${c.name}`}
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>{isLoading ? "Stopping..." : "Stop"}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {data?.dockerDriverCacheVramMb && data.dockerDriverCacheVramMb > 0 && (
            <div className="text-[11px] font-mono text-muted pt-2 border-t border-border/40 flex items-center gap-1.5">
              <span>ℹ️</span>
              <span>Docker Desktop / WSL2 Caching & Driver Arena Pool:</span>
              <strong className="text-foreground">{formatMb(data.dockerDriverCacheVramMb)}</strong>
            </div>
          )}
        </div>
      )}

      {/* Docker Image Inventory */}
      {data?.dockerImages && data.dockerImages.length > 0 && (
        <div className="glass-panel-raised rounded-3xl border border-border/80 p-6 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Box className="w-4 h-4 text-sky-400" />
              <span>Local Docker Image Inventory</span>
            </h2>
            <div className="flex items-center gap-3 text-[11px] font-mono text-muted">
              <span>Total Images: <strong className="text-foreground">{data.dockerImages.length}</strong></span>
              <span>In Use: <strong className="text-emerald-400">{data.dockerImages.filter((i) => i.inUse).length} Active</strong></span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/80 text-[11px] font-mono font-bold text-subtle uppercase tracking-wider">
                  <th className="py-3 px-3">Repository</th>
                  <th className="py-3 px-3">Tag</th>
                  <th className="py-3 px-3">Image ID</th>
                  <th className="py-3 px-3">Size</th>
                  <th className="py-3 px-3">Service Link</th>
                  <th className="py-3 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-xs font-mono">
                {data.dockerImages.map((img) => (
                  <tr key={`${img.repository}:${img.tag}-${img.imageId}`} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-3 font-bold text-foreground">{img.repository}</td>
                    <td className="py-3 px-3 text-muted">{img.tag}</td>
                    <td className="py-3 px-3 text-muted font-mono">{img.imageId.slice(0, 12)}</td>
                    <td className="py-3 px-3 text-amber-400 font-bold">{img.size}</td>
                    <td className="py-3 px-3 text-sky-400">
                      {img.serviceName ? (
                        <span className="truncate max-w-[220px] block">{img.serviceName}</span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          img.inUse
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : "bg-white/[0.04] text-muted border border-border/60"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${img.inUse ? "bg-emerald-400" : "bg-muted"}`} />
                        {img.inUse ? "IN USE" : "CACHED"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Host Processes */}
      {topOther.length > 0 && (
        <div className="glass-panel-raised rounded-3xl border border-border/80 p-6 space-y-4 shadow-xl">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-amber-400" />
            <span>Top Non-Service Host Processes (System Memory Consumers)</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {topOther.slice(0, 6).map((p) => (
              <div key={p.pid} className="p-3.5 rounded-2xl bg-surface/80 border border-border/80 flex items-center justify-between text-xs font-mono">
                <div>
                  <div className="font-bold text-foreground truncate max-w-[180px]">{p.displayName || p.name}</div>
                  <div className="text-[10px] text-muted">PID {p.pid}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-sky-400">{formatMb(p.ramMb)} RAM</div>
                  {p.vramMb && p.vramMb > 10 && <div className="text-[10px] font-bold text-purple-400">{formatMb(p.vramMb)} VRAM</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
