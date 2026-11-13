"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import useSWR from "swr";
import { useUser } from "@clerk/nextjs";
import { usePolling } from "@/lib/hooks/usePolling";
import { useToast } from "@/components/global/ToastContainer";
import { 
  BarChart2, Tv, Radio, Clock, ShieldCheck, ShieldAlert,
  Server, Cpu, Database, Terminal, Activity,
  ArrowRight, RefreshCw, Layers, CheckCircle2, XCircle,
  Play, Trash2, Zap, AlertTriangle, Wifi, WifiOff, HardDrive, LineChart,
  Archive, ArrowUpRight
} from "lucide-react";
import dynamic from "next/dynamic";

const UsageTimelineChart = dynamic(
  () => import("@/components/admin/UsageTimelineChart").then((m) => m.UsageTimelineChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 flex items-center justify-center bg-card/40 rounded-lg animate-pulse">
        <span className="text-xs text-muted">Loading chart metrics...</span>
      </div>
    ),
  }
);

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface DashboardData {
  error?: string;
  details?: string;
  metrics: {
    storiesCount: number;
    feedsCount: number;
    channelsCount: number;
    publishesCount: number;
    jobsCount: number;
    schedulesCount: number;
  };
  jobStats: {
    queued: number;
    processing: number;
    done: number;
    failed: number;
    dead: number;
  };
  queueDepth: Record<string, { queued: number; processing: number; failed: number; total: number }>;
  pipelineFunnel: Record<string, number>;
  activeJobs: Array<{
    id: string;
    type: string;
    status: string;
    storyId: string | null;
    createdAt: string;
    startedAt: string | null;
    _storyTitle: string | null;
  }>;
  deadJobs: Array<{
    id: string;
    type: string;
    status: string;
    storyId: string | null;
    payload: string | null;
    result: string | null;
    attempts: number;
    createdAt: string;
    _storyTitle: string | null;
  }>;
  systemHealth: {
    status: string;
    services: Record<string, { status: string; latency?: number }>;
  } | null;
  aiTokens: {
    totalPromptTokens: number;
    totalCompletionTokens: number;
    totalTokens: number;
    estimatedCost: string;
    workerCredits: string;
  };
  systemLogs: Array<{
    id: string;
    user: string;
    action: string;
    target: string;
    timestamp: string;
    status: "success" | "warning" | "error";
  }>;
}

const legacyRoutes = [
  {
    title: "Realtime Studio",
    href: "/realtime",
    badge: "WebRTC / Edge",
    description: "Low-latency browser-native neural stage and WebRTC streaming testbed.",
    icon: Zap,
  },
  {
    title: "WebGPU Lip-Sync Lab",
    href: "/tools/musetalk-webgpu",
    badge: "ONNX WebGPU",
    description: "Client-side WebGPU accelerated lip-sync and audio-viseme extraction test harness.",
    icon: Cpu,
  },
  {
    title: "Motion & Gesture Studio",
    href: "/motion-studio",
    badge: "FSM Motion",
    description: "FSM boundary-locked motion beats, gesture blending, and action loop matrix.",
    icon: Activity,
  },
  {
    title: "Talking Heads Lab",
    href: "/talking-heads-lab",
    badge: "Neural Arena",
    description: "Multi-model talking head neural evaluation arena (AVTR-1, Ditto, MuseTalk, EchoMimic).",
    icon: Tv,
  },
];

export default function AdminDashboardPage() {
  const { isLoaded, isSignedIn } = useUser();
  const { toast } = useToast();
  const isAdmin = isSignedIn;
  const { enabled: pollingEnabled, interval: pollingInterval } = usePolling();

  const { data, mutate, isValidating } = useSWR<DashboardData>(
    isAdmin ? "/api/admin/dashboard" : null, 
    fetcher,
    { refreshInterval: pollingEnabled ? pollingInterval * 1000 : 0 }
  );

  const [replayingJobs, setReplayingJobs] = useState<Set<string>>(new Set());
  const [timelineDays, setTimelineDays] = useState<number>(30);
  const [currentTime, setCurrentTime] = useState<number>(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  if (!isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-muted font-medium">Validating administrative session...</span>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-6 md:p-8 max-w-xl mx-auto min-h-[60vh] flex flex-col justify-center items-center text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-error/10 border border-error/30 flex items-center justify-center shadow-lg shadow-error/10 animate-bounce">
          <ShieldAlert className="w-10 h-10 text-error" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-foreground tracking-tight">Access Denied</h1>
          <p className="text-xs text-muted font-semibold max-w-sm leading-relaxed">
            This section requires administrator credentials.
          </p>
        </div>
        <Link href="/" prefetch={false} className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white/5 border border-border hover:bg-white/10 text-foreground font-bold text-xs uppercase tracking-wider rounded-xl transition-all active:scale-95 cursor-pointer">
          Return to Control Center <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const handleReplayJob = async (jobId: string) => {
    setReplayingJobs(prev => new Set(prev).add(jobId));
    try {
      const res = await fetch("/api/admin/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const result = await res.json();
      if (result.success) {
        toast("Replayed", result.message, "success");
        mutate();
      } else {
        toast("Error", result.error || "Could not replay job.", "error");
      }
    } catch {
      toast("Error", "Connection error.", "error");
    } finally {
      setReplayingJobs(prev => { const n = new Set(prev); n.delete(jobId); return n; });
    }
  };

  const handleDismissJob = async (jobId: string) => {
    try {
      const res = await fetch(`/api/admin/jobs?jobId=${jobId}`, { method: "DELETE" });
      if (res.ok) {
        toast("Dismissed", "Job has been removed.", "success");
        mutate();
      }
    } catch {
      toast("Error", "Connection error.", "error");
    }
  };

  const handleQuickAction = async (action: string) => {
    try {
      if (action === "ingest-all") {
        const res = await fetch("/api/ingest", { method: "POST" });
        if (res.ok) toast("Triggered", "Feed ingestion has been queued.", "success");
        else toast("Error", "Could not trigger ingestion.", "error");
      } else if (action === "flush-dlq") {
        if (!confirm("Delete all FAILED/DEAD jobs? This cannot be undone.")) return;
        // Delete all dead jobs one by one
        const deadJobs = data?.deadJobs || [];
        for (const job of deadJobs) {
          await fetch(`/api/admin/jobs?jobId=${job.id}`, { method: "DELETE" });
        }
        toast("Flushed", `${deadJobs.length} dead jobs removed.`, "success");
        mutate();
      } else if (action === "rerun-failed") {
        const failedJobs = data?.deadJobs?.filter(j => j.status === "FAILED") || [];
        for (const job of failedJobs) {
          await fetch("/api/admin/jobs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jobId: job.id }),
          });
        }
        toast("Replayed", `${failedJobs.length} failed jobs re-queued.`, "success");
        mutate();
      }
    } catch {
      toast("Error", "Action failed.", "error");
    }
  };

  // Pipeline funnel stages in order
  const funnelStages = [
    { key: "INGESTED", label: "Ingested", color: "bg-blue-500" },
    { key: "SCRIPTING", label: "Scripting", color: "bg-yellow-500" },
    { key: "SCRIPTED", label: "Scripted", color: "bg-amber-500" },
    { key: "IN_PRODUCTION", label: "In Production", color: "bg-orange-500" },
    { key: "RENDERING", label: "Rendering", color: "bg-purple-500" },
    { key: "COMPLETED", label: "Completed", color: "bg-emerald-500" },
    { key: "FAILED", label: "Failed", color: "bg-red-500" },
  ];

  const getHealthIcon = (status?: string) => {
    if (status === "online") return <Wifi className="w-4 h-4 text-success" />;
    if (status === "offline") return <WifiOff className="w-4 h-4 text-error" />;
    return <Activity className="w-4 h-4 text-muted animate-pulse" />;
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
            <span>⚙️</span> Administrator Console
          </h1>
          <p className="text-xs text-muted font-medium mt-1">
            System health, job queues, pipeline status, and automation monitoring.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="#legacy-tools"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Legacy Labs (4)</span>
          </a>
          <button
            onClick={() => mutate()}
            disabled={isValidating}
            className="flex items-center gap-1.5 px-4 py-2 bg-accent-muted hover:bg-accent-subtle text-accent border border-accent/20 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isValidating ? "animate-spin" : ""}`} />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {!data ? (
        <div className="flex flex-col items-center justify-center py-40 gap-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-muted font-medium">Loading administration metrics...</span>
        </div>
      ) : data.error ? (
        <div className="flex flex-col items-center justify-center py-40 gap-3">
          <AlertTriangle className="w-8 h-8 text-error mb-2" />
          <span className="text-sm font-bold text-error">Failed to load dashboard data</span>
          <p className="text-xs text-muted mt-2 max-w-md text-center">{data.error}</p>
          {data.details && <p className="text-[10px] text-muted mt-1 max-w-md text-center bg-error/10 p-2 rounded">{data.details}</p>}
        </div>
      ) : (
        <>
          {/* 1. Main Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: "RSS Feeds", value: data.metrics.feedsCount, icon: <Radio className="w-4 h-4 text-accent" />, color: "text-accent" },
              { label: "Articles", value: data.metrics.storiesCount, icon: <Database className="w-4 h-4 text-success" />, color: "text-success" },
              { label: "Channels", value: data.metrics.channelsCount, icon: <Tv className="w-4 h-4 text-red-500" />, color: "text-red-500" },
              { label: "Published", value: data.metrics.publishesCount, icon: <ShieldCheck className="w-4 h-4 text-purple-400" />, color: "text-purple-400" },
              { label: "Total Jobs", value: data.metrics.jobsCount, icon: <Server className="w-4 h-4 text-cyan-400" />, color: "text-cyan-400" },
              { label: "Schedules", value: data.metrics.schedulesCount, icon: <Clock className="w-4 h-4 text-amber-400" />, color: "text-amber-400" },
            ].map(({ label, value, icon, color }) => (
              <div key={label} className="backdrop-blur-md bg-surface/30 border border-border/80 rounded-2xl p-4 shadow hover:border-border-hover transition-colors">
                <div className="flex items-start justify-between">
                  <span className="text-[9px] text-muted font-bold uppercase tracking-wider">{label}</span>
                  {icon}
                </div>
                <span className={`text-xl font-black ${color} block mt-2 leading-none`}>{value}</span>
              </div>
            ))}
          </div>

          {/* 2. Queue Depth Cards + Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Queue Depth Cards */}
            {["TTS", "VIDEO", "RENDER", "PUBLISH"].map((type) => {
              const q = data.queueDepth[type] || { queued: 0, processing: 0, failed: 0, total: 0 };
              return (
                <div key={type} className="backdrop-blur-md bg-surface/30 border border-border/80 rounded-2xl p-4 shadow">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-[10px] font-bold text-foreground uppercase tracking-wider">{type} Queue</h4>
                    <span className="text-[9px] font-bold text-muted">{q.total} total</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-2 rounded-xl bg-background/50 border border-border/40">
                      <span className="text-[8px] text-muted font-bold uppercase block">Queued</span>
                      <span className="text-sm font-black text-foreground">{q.queued}</span>
                    </div>
                    <div className="text-center p-2 rounded-xl bg-background/50 border border-border/40">
                      <span className="text-[8px] text-warning font-bold uppercase block">Active</span>
                      <span className={`text-sm font-black ${q.processing > 0 ? "text-warning animate-pulse" : "text-foreground"}`}>{q.processing}</span>
                    </div>
                    <div className="text-center p-2 rounded-xl bg-background/50 border border-border/40">
                      <span className="text-[8px] text-error font-bold uppercase block">Failed</span>
                      <span className={`text-sm font-black ${q.failed > 0 ? "text-error" : "text-foreground"}`}>{q.failed}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 3. Pipeline Funnel + System Health + GPU Status */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Pipeline Funnel */}
            <div className="lg:col-span-2 p-5 backdrop-blur-md bg-surface/30 border border-border/80 rounded-3xl shadow space-y-4">
              <h3 className="text-xs font-bold text-foreground border-b border-border pb-2.5 flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4 text-accent" /> Pipeline Funnel
              </h3>
              <div className="space-y-2">
                {funnelStages.map(({ key, label, color }) => {
                  const count = data.pipelineFunnel[key] || 0;
                  const totalStories = Object.values(data.pipelineFunnel).reduce((a, b) => a + b, 0);
                  const pct = totalStories > 0 ? (count / totalStories) * 100 : 0;
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-muted w-24 text-right uppercase tracking-wider">{label}</span>
                      <div className="flex-1 h-5 bg-background/50 border border-border/40 rounded-full overflow-hidden">
                        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${Math.max(pct, count > 0 ? 2 : 0)}%` }} />
                      </div>
                      <span className="text-xs font-black text-foreground w-10 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* System Health + GPU Status */}
            <div className="space-y-4">
              {/* System Health Panel */}
              <div className="p-5 backdrop-blur-md bg-surface/30 border border-border/80 rounded-3xl shadow space-y-3">
                <h3 className="text-xs font-bold text-foreground border-b border-border pb-2.5 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-accent" /> System Health
                </h3>
                {data.systemHealth ? (
                  <div className="space-y-2.5">
                    {Object.entries(data.systemHealth.services || {}).map(([name, svc]) => (
                      <div key={name} className="flex items-center justify-between py-1">
                        <div className="flex items-center gap-2">
                          {getHealthIcon(svc.status)}
                          <span className="text-xs font-semibold text-foreground capitalize">{name.replace(/_/g, " ")}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {svc.latency !== undefined && (
                            <span className="text-[9px] text-muted font-bold">{svc.latency}ms</span>
                          )}
                          <span className={`text-[9px] font-black uppercase tracking-wider ${svc.status === "online" ? "text-success" : "text-error"}`}>
                            {svc.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-muted italic text-center py-3">Health data unavailable</p>
                )}
              </div>

              {/* GPU / ComfyUI Status Card */}
              <div className="p-5 backdrop-blur-md bg-surface/30 border border-border/80 rounded-3xl shadow space-y-3">
                <h3 className="text-xs font-bold text-foreground border-b border-border pb-2.5 flex items-center gap-1.5">
                  <HardDrive className="w-4 h-4 text-accent" /> GPU / ComfyUI
                </h3>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-subtle">Status</span>
                  <span className={`text-[10px] font-black uppercase ${
                    data.systemHealth?.services?.comfyui?.status === "online" ? "text-success" : "text-muted"
                  }`}>
                    {data.systemHealth?.services?.comfyui?.status || "Not connected"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-subtle">Active Jobs</span>
                  <span className="text-xs font-black text-foreground">
                    {(data.queueDepth["VIDEO"]?.processing || 0)}
                  </span>
                </div>
                <p className="text-[9px] text-muted italic border-t border-border/40 pt-2 mt-1">
                  Full GPU metrics available after Azure deployment (Sprint 8).
                </p>
              </div>
            </div>
          </div>

          {/* 4. Quick Actions Row */}
          <div className="flex flex-wrap gap-3 p-4 backdrop-blur-md bg-surface/30 border border-border/80 rounded-2xl shadow">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider flex items-center gap-1.5 mr-2">
              <Zap className="w-3.5 h-3.5 text-accent" /> Quick Actions
            </span>
            <button
              onClick={() => handleQuickAction("ingest-all")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/10 border border-accent/20 text-accent hover:bg-accent/15 rounded-xl text-[10px] font-bold transition-all active:scale-95 cursor-pointer"
            >
              <Radio className="w-3 h-3" /> Ingest All Feeds
            </button>
            <button
              onClick={() => handleQuickAction("flush-dlq")}
              disabled={(data.deadJobs?.length || 0) === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-error/10 border border-error/20 text-error hover:bg-error/15 rounded-xl text-[10px] font-bold transition-all active:scale-95 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-3 h-3" /> Flush DLQ ({data.deadJobs?.length || 0})
            </button>
            <button
              onClick={() => handleQuickAction("rerun-failed")}
              disabled={(data.deadJobs?.filter(j => j.status === "FAILED").length || 0) === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-warning/10 border border-warning/20 text-warning hover:bg-warning/15 rounded-xl text-[10px] font-bold transition-all active:scale-95 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <RefreshCw className="w-3 h-3" /> Re-run Failed ({data.deadJobs?.filter(j => j.status === "FAILED").length || 0})
            </button>
          </div>

          {/* 5. Active Jobs Table + DLQ Inspector */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active Jobs */}
            <div className="p-5 backdrop-blur-md bg-surface/30 border border-border/80 rounded-3xl shadow space-y-4">
              <h3 className="text-xs font-bold text-foreground border-b border-border pb-2.5 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-accent" /> Active Jobs ({data.activeJobs?.length || 0})
              </h3>
              {data.activeJobs && data.activeJobs.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {data.activeJobs.map((job) => (
                    <div key={job.id} className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/40">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] font-black bg-accent/10 border border-accent/20 text-accent px-1.5 py-0.5 rounded uppercase">{job.type}</span>
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${
                            job.status === "PROCESSING" ? "bg-warning/10 border border-warning/20 text-warning animate-pulse" : "bg-white/5 border border-border text-muted"
                          }`}>{job.status}</span>
                        </div>
                        {job._storyTitle && (
                          <p className="text-[10px] text-subtle font-semibold mt-1 truncate">{job._storyTitle}</p>
                        )}
                      </div>
                      <span className="text-[9px] text-muted font-bold">
                        {job.startedAt && currentTime ? `${Math.max(0, Math.round((currentTime - new Date(job.startedAt).getTime()) / 1000))}s ago` : "queued"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted italic text-center py-6">No active jobs in queue.</p>
              )}
            </div>

            {/* DLQ Inspector */}
            <div className="p-5 backdrop-blur-md bg-surface/30 border border-border/80 rounded-3xl shadow space-y-4">
              <h3 className="text-xs font-bold text-foreground border-b border-border pb-2.5 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-error" /> Dead Letter Queue ({data.deadJobs?.length || 0})
              </h3>
              {data.deadJobs && data.deadJobs.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {data.deadJobs.map((job) => (
                    <div key={job.id} className="p-3 rounded-xl bg-background/50 border border-border/40">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] font-black bg-error/10 border border-error/20 text-error px-1.5 py-0.5 rounded uppercase">{job.type}</span>
                          <span className="text-[8px] font-black bg-error/10 border border-error/20 text-error px-1.5 py-0.5 rounded uppercase">{job.status}</span>
                          <span className="text-[9px] text-muted">×{job.attempts} attempts</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleReplayJob(job.id)}
                            disabled={replayingJobs.has(job.id)}
                            className="h-6 px-2 flex items-center gap-1 text-[9px] font-bold bg-success/10 border border-success/20 text-success hover:bg-success/15 rounded-lg transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                          >
                            {replayingJobs.has(job.id) ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                            Replay
                          </button>
                          <button
                            onClick={() => handleDismissJob(job.id)}
                            className="h-6 px-2 flex items-center gap-1 text-[9px] font-bold bg-white/5 border border-border text-muted hover:text-error hover:border-error/20 rounded-lg transition-all active:scale-95 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" /> Dismiss
                          </button>
                        </div>
                      </div>
                      {job._storyTitle && (
                        <p className="text-[10px] text-subtle font-semibold truncate">{job._storyTitle}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted italic text-center py-6 flex flex-col items-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-success" />
                  No dead or failed jobs. All clear!
                </p>
              )}
            </div>
          </div>

          {/* 6. AI Tokens + System Logs */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* AI Tokens */}
            <div className="p-5 backdrop-blur-md bg-surface/30 border border-border/80 rounded-3xl shadow space-y-4">
              <h3 className="text-xs font-bold text-foreground border-b border-border pb-2.5 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-accent" /> AI Token Usage
              </h3>
              <div className="space-y-3">
                <div className="p-3 bg-background/50 border border-border/40 rounded-xl">
                  <span className="text-[9px] text-muted font-bold uppercase block">Input Tokens</span>
                  <span className="text-lg font-black text-foreground">{data.aiTokens.totalPromptTokens.toLocaleString()}</span>
                </div>
                <div className="p-3 bg-background/50 border border-border/40 rounded-xl">
                  <span className="text-[9px] text-muted font-bold uppercase block">Output Tokens</span>
                  <span className="text-lg font-black text-foreground">{data.aiTokens.totalCompletionTokens.toLocaleString()}</span>
                </div>
                <div className="p-3 bg-background/50 border border-border/40 rounded-xl border-l-2 border-l-emerald-500/40">
                  <span className="text-[9px] text-emerald-400 font-bold uppercase block">Estimated Cost</span>
                  <span className="text-lg font-black text-emerald-400">${data.aiTokens.estimatedCost}</span>
                </div>
                <div className="p-3 bg-background/50 border border-border/40 rounded-xl border-l-2 border-l-cyan-500/40">
                  <span className="text-[9px] text-cyan-400 font-bold uppercase block">Job Credits</span>
                  <span className="text-lg font-black text-cyan-400">{data.aiTokens.workerCredits}</span>
                </div>
              </div>
            </div>

            {/* System Audit Logs */}
            <div className="lg:col-span-2 p-5 backdrop-blur-md bg-surface/30 border border-border/80 rounded-3xl shadow space-y-4">
              <h3 className="text-xs font-bold text-foreground border-b border-border pb-2.5 flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-accent" /> System Audit Trail
              </h3>
              <div className="overflow-x-auto rounded-2xl border border-border/80 bg-background/50 shadow-inner">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border/85 bg-white/[0.01] text-[10px] font-bold text-muted uppercase tracking-wider">
                      <th className="py-3 px-4">Source</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Layer</th>
                      <th className="py-3 px-4">Time</th>
                      <th className="py-3 px-4 text-right">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 text-xs font-semibold text-subtle">
                    {data.systemLogs.slice(0, 8).map((log) => (
                      <tr key={log.id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="py-2.5 px-4 font-bold text-foreground">{log.user}</td>
                        <td className="py-2.5 px-4 font-medium text-subtle truncate max-w-[200px]">{log.action}</td>
                        <td className="py-2.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[8px] font-black bg-white/5 border border-border/40 text-muted uppercase">{log.target}</span>
                        </td>
                        <td className="py-2.5 px-4 text-muted text-[10px]">{new Date(log.timestamp).toLocaleString()}</td>
                        <td className="py-2.5 px-4 text-right">
                          {log.status === "success" ? (
                            <span className="inline-flex items-center gap-0.5 text-success text-[9px] font-bold"><CheckCircle2 className="w-3.5 h-3.5" /> OK</span>
                          ) : log.status === "error" ? (
                            <span className="inline-flex items-center gap-0.5 text-error text-[9px] font-bold"><XCircle className="w-3.5 h-3.5" /> Fail</span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 text-warning text-[9px] font-bold"><Clock className="w-3.5 h-3.5" /> Pending</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 7. Usage Timeline Chart */}
          <div className="p-5 backdrop-blur-md bg-surface/30 border border-border/80 rounded-3xl shadow space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <LineChart className="w-4 h-4 text-accent" /> Credit Consumption Timeline
              </h3>
              <select 
                value={timelineDays} 
                onChange={(e) => setTimelineDays(Number(e.target.value))}
                className="text-[10px] font-bold uppercase bg-transparent border-none text-muted focus:ring-0 cursor-pointer outline-none"
              >
                <option value={7}>Last 7 Days</option>
                <option value={14}>Last 14 Days</option>
                <option value={30}>Last 30 Days</option>
                <option value={90}>Last 90 Days</option>
              </select>
            </div>
            <UsageTimelineChart days={timelineDays} />
          </div>
        </>
      )}

      {/* 8. Legacy Tools & Experimental Labs */}
      <div id="legacy-tools" className="p-5 backdrop-blur-md bg-surface/30 border border-border/80 rounded-3xl shadow space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border pb-3">
          <div>
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Archive className="w-4 h-4 text-amber-400" /> Legacy Tools &amp; Experimental Labs
            </h3>
            <p className="text-[11px] text-muted font-medium mt-0.5">
              Archived experimental studios and lab harnesses removed from main navigation but retained for developer testing and backwards compatibility.
            </p>
          </div>
          <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20 self-start sm:self-auto">
            4 Archived Routes
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {legacyRoutes.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex flex-col justify-between p-4 rounded-2xl bg-background/50 border border-border/40 hover:border-amber-500/40 hover:bg-amber-500/[0.03] transition-all duration-200"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-xl bg-white/[0.04] border border-border/60 group-hover:border-amber-500/30 group-hover:bg-amber-500/10 transition-colors">
                    <item.icon className="w-4 h-4 text-amber-400" />
                  </div>
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 border border-border/60 text-muted group-hover:text-amber-300 group-hover:border-amber-500/30 transition-colors">
                    {item.badge}
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground group-hover:text-amber-300 transition-colors flex items-center gap-1">
                    <span>{item.title}</span>
                    <ArrowUpRight className="w-3 h-3 opacity-0 -translate-x-1 translate-y-1 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0 transition-all text-amber-400" />
                  </h4>
                  <p className="text-[10px] text-muted font-medium leading-relaxed mt-1">
                    {item.description}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-2.5 border-t border-border/30 flex items-center justify-between text-[10px] font-mono text-muted">
                <span className="truncate max-w-[150px]">{item.href}</span>
                <span className="text-amber-400/80 group-hover:text-amber-300 group-hover:underline font-bold">Open &rarr;</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
