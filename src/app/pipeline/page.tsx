"use client";

import React, { useState, useCallback } from "react";
import useSWR from "swr";
import Link from "next/link";
import {
  Cpu,
  Pause,
  Play,
  Plus,
  Sliders,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/components/global/ToastContainer";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ─── Status Helpers ────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  QUEUED: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  IN_PROGRESS: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  TTS_IN_PROGRESS: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  VIDEO_IN_PROGRESS: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  RENDER_IN_PROGRESS: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  DONE: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  FAILED: "bg-red-500/15 text-red-400 border-red-500/30",
  CANCELLED: "bg-orange-500/15 text-orange-400 border-orange-500/30",
};

const STATUS_LABELS: Record<string, string> = {
  QUEUED: "Queued",
  IN_PROGRESS: "In Progress",
  TTS_IN_PROGRESS: "Generating Audio",
  VIDEO_IN_PROGRESS: "Generating Video",
  RENDER_IN_PROGRESS: "Rendering",
  DONE: "Complete",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
        STATUS_COLORS[status] ?? "bg-white/5 text-muted border-border"
      }`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] font-mono text-muted w-8 text-right">{pct}%</span>
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

function formatDuration(ms: number | undefined | null): string {
  if (!ms) return "—";
  const totalSecs = Math.floor(ms / 1000);
  if (totalSecs < 60) return `${totalSecs}s`;
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins}m ${secs}s`;
}

function truncateWords(text: string, maxWords: number = 5): string {
  if (!text) return "";
  const words = text.split(" ");
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(" ") + "…";
}

// ─── Types ─────────────────────────────────────────────────────────────────

interface GenerationJob {
  id: string;
  storyId: string;
  storyTitle: string;
  companyId: string;
  type: string;
  status: string;
  currentStep: string | null;
  totalSteps: number;
  doneSteps: number;
  workerId: string | null;
  startedAt: string | null;
  completedAt: string | null;
  errorLog: string | null;
  createdAt: string;
  durationMs?: number;
  creditsUsed?: number;
}

interface JobLog {
  id: string;
  step: string;
  status: string;
  message: string | null;
  duration: number | null;
  createdAt: string;
}

interface JobsResponse {
  data: GenerationJob[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface WorkerStats {
  id: string;
  hostname: string;
  ip: string | null;
  type: string;
  status: string;
  currentJobId: string | null;
  currentStep: string | null;
  gpuMemoryUsedMB: number | null;
  gpuMemoryTotalMB: number | null;
  lastSeenAt: string;
}

interface PipelineStatsResponse {
  stats: {
    queued: number;
    queuedAudio: number;
    queuedVideo: number;
    queuedRender: number;
    inProgress: number;
    done: number;
    failed: number;
  };
  workers: WorkerStats[];
  isPipelinePaused: boolean;
  minJobsAudio: number;
  minJobsVideo: number;
  minJobsRender: number;
  minJobsImage: number;
}

// ─── Queue New Job Modal ───────────────────────────────────────────────────

function QueueJobModal({ onClose, onQueued }: { onClose: () => void; onQueued: () => void }) {
  const [storyId, setStoryId] = useState("");
  const [personaId, setPersonaId] = useState("");
  const [engine, setEngine] = useState("");
  const [tier, setTier] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storyId.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        storyId: storyId.trim(),
      };
      if (personaId) {
        payload.personaId = personaId;
        payload.voiceId = personaId;
      }
      if (engine) payload.engine = engine;
      if (tier) payload.tier = tier;

      const res = await fetch("/api/pipeline/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to queue job");
        return;
      }

      onQueued();
      onClose();
    } catch {
      setError("Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="text-sm font-bold text-foreground mb-4">Queue Generation Job</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted block mb-1">Story ID *</label>
            <input
              type="text"
              value={storyId}
              onChange={(e) => setStoryId(e.target.value)}
              placeholder="Paste a story ID..."
              className="w-full px-3 py-2 text-sm rounded-lg bg-surface-raised border border-border text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
              autoFocus
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted block mb-1">Voice / Persona</label>
              <select
                value={personaId}
                onChange={(e) => setPersonaId(e.target.value)}
                className="w-full px-2.5 py-2 text-xs rounded-lg bg-surface-raised border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="">Default (Story Persona)</option>
                <option value="ruby">Ruby Vance (es_AR)</option>
                <option value="diego">Diego Morales (es_AR)</option>
                <option value="camila">Camila Navarro (es_AR)</option>
                <option value="mateo">Mateo Silva (es_AR)</option>
                <option value="bautista">Bautista (es_AR)</option>
                <option value="sofia">Sofia (es_AR)</option>
                <option value="abigail">Abigail (en_US)</option>
                <option value="adrian">Adrian (en_US)</option>
                <option value="claire">Claire (en_US)</option>
                <option value="connor">Connor (en_US)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted block mb-1">TTS Engine</label>
              <select
                value={engine}
                onChange={(e) => setEngine(e.target.value)}
                className="w-full px-2.5 py-2 text-xs rounded-lg bg-surface-raised border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="">Auto (Server Default)</option>
                <option value="piper">Piper (Fast ONNX)</option>
                <option value="f5_tts">F5-TTS (Flow Matching)</option>
                <option value="cosyvoice_3">CosyVoice 3</option>
                <option value="styletts2">StyleTTS 2</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted block mb-1">Synthesis Tier</label>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value)}
              className="w-full px-2.5 py-2 text-xs rounded-lg bg-surface-raised border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">Auto (Based on Engine)</option>
              <option value="tier1">Tier 1: Fast (Sub-150ms ONNX)</option>
              <option value="tier2">Tier 2: Expressive Studio Master</option>
            </select>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20">
              {error}
            </p>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-muted hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !storyId.trim()}
              className="px-4 py-1.5 text-xs font-bold rounded-lg bg-accent text-white hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? "Queuing..." : "Queue Job"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Job Detail Drawer ─────────────────────────────────────────────────────

function JobDrawer({ job, onClose }: { job: GenerationJob; onClose: () => void }) {
  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full max-w-md bg-surface border-l border-border shadow-2xl overflow-y-auto">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">{job.storyTitle}</h3>
            <p className="text-[10px] text-muted font-mono mt-0.5">{job.id}</p>
          </div>
          <div className="flex items-center gap-3">
            {(job.status === "FAILED" || job.status === "DONE" || job.status === "CANCELLED") && (
              <button
                onClick={async () => {
                  if (!confirm(job.status === "DONE" ? "Rerun this job?" : "Retry this job?")) return;
                  await fetch(`/api/pipeline/jobs/${job.id}/retry`, { method: "POST" });
                  onClose();
                }}
                className="text-accent hover:text-accent-hover font-bold transition-colors text-xs uppercase tracking-wide px-2 py-1 bg-accent/10 rounded"
              >
                {job.status === "DONE" ? "Rerun" : "Retry"}
              </button>
            )}
            {job.status !== "DONE" && job.status !== "FAILED" && job.status !== "CANCELLED" && (
              <button
                onClick={async () => {
                  if (!confirm("Cancel this job?")) return;
                  await fetch(`/api/pipeline/jobs/${job.id}`, { method: "DELETE" });
                  onClose();
                }}
                className="text-red-400 hover:text-red-300 font-bold transition-colors text-xs uppercase tracking-wide px-2 py-1 bg-red-400/10 rounded"
              >
                Cancel
              </button>
            )}
            <button
              onClick={onClose}
              className="text-muted hover:text-foreground transition-colors text-lg"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Status + Progress */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <StatusBadge status={job.status} />
            {job.totalSteps > 0 && (
              <ProgressBar done={job.doneSteps} total={job.totalSteps} />
            )}
          </div>

          {job.currentStep && (
            <p className="text-xs text-muted">
              Current step: <span className="text-foreground font-mono">{job.currentStep}</span>
            </p>
          )}

          <div className="pt-2">
            <Link 
              href={job.type === "wardrobe_inpaint" ? `/wardrobe-studio?jobId=${job.id}` : `/editor/${job.storyId}`}
              className="inline-flex w-full items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-white/5 border border-border text-muted hover:text-foreground hover:bg-white/10 transition-colors"
            >
              {job.type === "wardrobe_inpaint" && <Sparkles className="w-3.5 h-3.5 text-purple-400" />}
              <span>{job.type === "wardrobe_inpaint" ? "Open in Wardrobe Studio" : "Open Story in Editor"}</span>
            </Link>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-2">
          <DetailRow label="Job ID" value={job.id} />
          <DetailRow label="Type" value={job.type === "wardrobe_inpaint" ? "Wardrobe Neural Inpaint (MiniMax H3)" : job.type === "video_full" ? "full" : job.type === "video_bubble" ? "bubble" : job.type} />
          <DetailRow label="Worker" value={job.workerId ?? "—"} />
          <DetailRow label="Story ID" value={job.storyId} />
          <DetailRow label="Steps" value={`${job.doneSteps} / ${job.totalSteps}`} />
          <DetailRow label="Created" value={new Date(job.createdAt).toLocaleString()} />
          {job.startedAt && (
            <DetailRow label="Started" value={new Date(job.startedAt).toLocaleString()} />
          )}
          {job.completedAt && (
            <DetailRow label="Completed" value={new Date(job.completedAt).toLocaleString()} />
          )}
          {job.durationMs != null && (
            <DetailRow label="Time Taken" value={formatDuration(job.durationMs)} />
          )}
          {job.creditsUsed != null && job.creditsUsed > 0 && (
            <DetailRow label="Est. Cost" value={`${job.creditsUsed.toFixed(2)} credits`} />
          )}
        </div>

        {/* Error log */}
        {job.errorLog && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-red-400">Error</p>
            <pre className="text-[10px] text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg p-3 whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">
              {job.errorLog}
            </pre>
          </div>
        )}

        {/* Execution Logs */}
        <JobLogs jobId={job.id} />
      </div>
    </div>
  );
}

function JobLogs({ jobId }: { jobId: string }) {
  const { data } = useSWR<{ logs: JobLog[] }>(`/api/pipeline/jobs/${jobId}/logs`, fetcher);
  
  if (!data?.logs || data.logs.length === 0) return null;

  return (
    <div className="space-y-2 pt-2 border-t border-border">
      <p className="text-xs font-bold text-foreground uppercase tracking-wider">Execution Logs</p>
      <div className="space-y-2">
        {data.logs.map((log) => (
          <div key={log.id} className="flex flex-col gap-1 text-[10px] bg-white/5 rounded-lg p-2 border border-border">
            <div className="flex justify-between items-start">
              <span className="font-mono font-bold text-muted">{log.step}</span>
              <span className={`font-bold ${log.status === "FAILED" ? "text-red-400" : log.status === "COMPLETED" ? "text-emerald-400" : "text-blue-400"}`}>
                {log.status}
              </span>
            </div>
            {log.message && <span className="text-muted">{log.message}</span>}
            <div className="flex justify-between text-muted/50 mt-1">
              <span>{new Date(log.createdAt).toLocaleTimeString()}</span>
              {log.duration !== null && <span>{log.duration}ms</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted">{label}</span>
      <span className="text-foreground font-mono truncate max-w-[200px]">{value}</span>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const { toast } = useToast();
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<GenerationJob | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"list" | "dashboard">("dashboard");
  const [showWorkers, setShowWorkers] = useState(false);
  const [showAllWorkers, setShowAllWorkers] = useState(false);

  // States for sequential worker scheduling thresholds
  const [minJobsAudio, setMinJobsAudio] = useState<number>(1);
  const [minJobsVideo, setMinJobsVideo] = useState<number>(1);
  const [minJobsRender, setMinJobsRender] = useState<number>(1);
  const [minJobsImage, setMinJobsImage] = useState<number>(1);
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);
  const currentTime = React.useSyncExternalStore(
    useCallback((cb: () => void) => {
      const timer = setInterval(cb, 10000);
      return () => clearInterval(timer);
    }, []),
    () => Date.now(),
    () => 0
  );

  const statusParam = filter === "all" ? "" : `&status=${filter}`;
  const { data, mutate } = useSWR<JobsResponse>(
    `/api/pipeline/jobs?limit=50${statusParam}`,
    fetcher,
    { refreshInterval: 3000 }
  );

  const { data: pipelineData, mutate: mutatePipeline } = useSWR<PipelineStatsResponse>(
    `/api/pipeline/stats`,
    fetcher,
    { refreshInterval: 3000 }
  );

  // Sync settings when data changes
  React.useEffect(() => {
    if (pipelineData) {
      queueMicrotask(() => {
        setMinJobsAudio(pipelineData.minJobsAudio ?? 1);
        setMinJobsVideo(pipelineData.minJobsVideo ?? 1);
        setMinJobsRender(pipelineData.minJobsRender ?? 1);
        setMinJobsImage(pipelineData.minJobsImage ?? 1);
      });
    }
  }, [pipelineData]);

  const handleSaveSettings = useCallback(async () => {
    setIsSavingSettings(true);
    try {
      const res = await fetch("/api/pipeline/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          minJobsAudio,
          minJobsVideo,
          minJobsRender,
          minJobsImage,
        }),
      });
      if (res.ok) {
        mutatePipeline();
        toast("Settings Saved", "Pipeline worker scheduling thresholds updated.", "success");
      } else {
        const data = await res.json();
        toast("Save Failed", data.error || "Failed to update pipeline settings.", "error");
      }
    } catch {
      toast("Save Failed", "Network error saving pipeline settings.", "error");
    } finally {
      setIsSavingSettings(false);
    }
  }, [minJobsAudio, minJobsVideo, minJobsRender, minJobsImage, mutatePipeline, toast]);

  const jobs = React.useMemo(() => data?.data ?? [], [data?.data]);
  const pagination = data?.pagination;

  // Auto-select job if jobId is in URL
  React.useEffect(() => {
    if (typeof window === "undefined" || jobs.length === 0 || selectedJob) return;
    const urlParams = new URLSearchParams(window.location.search);
    const urlJobId = urlParams.get("jobId");
    if (urlJobId) {
      const jobToSelect = jobs.find(j => j.id === urlJobId);
      if (jobToSelect) {
        queueMicrotask(() => {
          setSelectedJob(jobToSelect);
        });
      }
    }
  }, [jobs, selectedJob]);

  // Stats
  const stats = pipelineData?.stats ?? {
    queued: 0,
    queuedAudio: 0,
    queuedVideo: 0,
    queuedRender: 0,
    inProgress: 0,
    done: 0,
    failed: 0,
  };

  const handleCancel = useCallback(
    async (jobId: string) => {
      if (!confirm("Cancel this job?")) return;
      await fetch(`/api/pipeline/jobs/${jobId}`, { method: "DELETE" });
      mutate();
      mutatePipeline();
    },
    [mutate, mutatePipeline]
  );

  const handleRetry = useCallback(
    async (jobId: string) => {
      await fetch(`/api/pipeline/jobs/${jobId}/retry`, { method: "POST" });
      mutate();
      mutatePipeline();
    },
    [mutate, mutatePipeline]
  );

  const handleTogglePause = useCallback(async () => {
    if (!pipelineData) return;
    const newPauseState = !pipelineData.isPipelinePaused;
    await fetch("/api/pipeline/pause", {
      method: "POST",
      body: JSON.stringify({ pause: newPauseState }),
      headers: { "Content-Type": "application/json" },
    });
    mutatePipeline();
  }, [pipelineData, mutatePipeline]);

  const handleDeleteWorker = useCallback(async (workerId: string) => {
    if (!confirm("Delete this worker? It will re-register if it comes back online.")) return;
    await fetch(`/api/pipeline/workers/${workerId}`, { method: "DELETE" });
    mutatePipeline();
  }, [mutatePipeline]);

  const handleClearOfflineWorkers = useCallback(async () => {
    if (!confirm("Are you sure you want to mass delete all offline workers? Active workers will remain.")) return;
    try {
      const res = await fetch("/api/pipeline/workers/offline", { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast("Workers Cleared", `Successfully deleted ${json.count} offline worker(s).`, "success");
        mutatePipeline();
      } else {
        toast("Delete Failed", "Error deleting workers: " + (json.error || "Unknown error"), "error");
      }
    } catch (err: unknown) {
      toast("Delete Failed", err instanceof Error ? err.message : "Network error", "error");
    }
  }, [mutatePipeline, toast]);

  const handleResetStuck = useCallback(async () => {
    if (!confirm("Are you sure you want to reset all jobs stuck on offline workers? They will be marked as FAILED and can be retried.")) return;
    try {
      const res = await fetch("/api/pipeline/reset-stuck", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        toast("Jobs Reset", `Successfully reset ${json.count} stuck job(s).`, "success");
        mutate();
        mutatePipeline();
      } else {
        toast("Reset Failed", "Error resetting jobs: " + (json.error || "Unknown error"), "error");
      }
    } catch (err: unknown) {
      toast("Reset Failed", err instanceof Error ? err.message : "Network error", "error");
    }
  }, [mutate, mutatePipeline, toast]);

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-400 via-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20 border border-sky-400/30">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-foreground">Generation Pipeline</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-sky-500/10 text-sky-400 border border-sky-500/30">
                  CLUSTER QUEUE
                </span>
              </div>
              <p className="text-xs text-subtle font-normal mt-0.5">
                Monitor autonomous background workers, GPU allocation, and AI video synthesis queues
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* View Toggle */}
          <div className="flex items-center bg-surface-raised/90 rounded-xl p-0.5 border border-border/80">
            <button
              onClick={() => setViewMode("dashboard")}
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg transition-all cursor-pointer ${
                viewMode === "dashboard" ? "bg-emerald-500 text-white shadow-sm font-bold" : "text-muted hover:text-foreground"
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg transition-all cursor-pointer ${
                viewMode === "list" ? "bg-emerald-500 text-white shadow-sm font-bold" : "text-muted hover:text-foreground"
              }`}
            >
              List
            </button>
          </div>

          <button
            onClick={handleTogglePause}
            className={`px-4 py-2 text-xs font-mono font-bold rounded-xl transition-all border flex items-center gap-1.5 cursor-pointer shadow-sm ${
              pipelineData?.isPipelinePaused 
                ? "bg-rose-500/15 text-rose-300 border-rose-500/30 hover:bg-rose-500/25 shadow-rose-500/10" 
                : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25 shadow-emerald-500/10"
            }`}
          >
            {pipelineData?.isPipelinePaused ? (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Resume Pipeline</span>
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause Pipeline</span>
              </>
            )}
          </button>

          <button
            onClick={() => setShowQueueModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-mono font-bold rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-lg shadow-emerald-500/20 border border-emerald-400/30 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Queue Job</span>
          </button>
        </div>
      </div>

      {viewMode === "dashboard" ? (
        <div className="space-y-6">
          {/* Sequential Scheduler Configuration */}
          <div className="glass-panel-raised border border-white/10 rounded-2xl p-5 space-y-4 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-white/[0.04] border border-border text-emerald-400 mt-0.5">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground">Sequential Scheduler Configuration</h2>
                  <p className="text-[11px] text-subtle mt-0.5">
                    Set the minimum number of queued jobs required to automatically spin up each worker. Stops workers when queues are empty.
                  </p>
                </div>
              </div>
              <button
                onClick={handleSaveSettings}
                disabled={isSavingSettings}
                className="px-4 py-2 text-xs font-mono font-bold rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 disabled:opacity-50 transition-all cursor-pointer self-start sm:self-center"
              >
                {isSavingSettings ? "Saving..." : "Save Config"}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-1">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-muted block">Audio Worker Threshold (TTS)</label>
                <input
                  type="number"
                  min={1}
                  value={minJobsAudio}
                  onChange={(e) => setMinJobsAudio(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-surface-raised border border-border text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-muted block">Video Worker Threshold (SadTalker/ComfyUI)</label>
                <input
                  type="number"
                  min={1}
                  value={minJobsVideo}
                  onChange={(e) => setMinJobsVideo(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-surface-raised border border-border text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-muted block">Render Worker Threshold (Remotion)</label>
                <input
                  type="number"
                  min={1}
                  value={minJobsRender}
                  onChange={(e) => setMinJobsRender(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-surface-raised border border-border text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-muted block">Image Worker Threshold (ComfyUI)</label>
                <input
                  type="number"
                  min={1}
                  value={minJobsImage}
                  onChange={(e) => setMinJobsImage(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-surface-raised border border-border text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent font-mono"
                />
              </div>
            </div>
          </div>

          {/* Worker Health Panel */}
          {pipelineData?.workers && pipelineData.workers.length > 0 && (
            <div className="flex flex-col space-y-3 bg-white/5 border border-border rounded-xl p-4">
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setShowWorkers(!showWorkers)}
              >
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-foreground">Worker Health Panel</h2>
                  <span className="text-xs bg-white/10 text-muted px-2 py-0.5 rounded-full">
                    {pipelineData.workers.length} worker(s)
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  {showWorkers && currentTime > 0 && pipelineData.workers.some(w => currentTime - new Date(w.lastSeenAt).getTime() > 5 * 60 * 1000) && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleClearOfflineWorkers(); }}
                        className="text-xs font-bold text-red-400 hover:text-red-300 transition-colors bg-red-400/10 px-2 py-1 rounded"
                      >
                        Clear Offline
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleResetStuck(); }}
                        className="text-xs font-bold text-red-400 hover:text-red-300 transition-colors bg-red-400/10 px-2 py-1 rounded"
                      >
                        Reset Stuck Jobs
                      </button>
                    </div>
                  )}
                  <span className="text-muted text-lg">{showWorkers ? "▲" : "▼"}</span>
                </div>
              </div>
              
              {showWorkers && (
                <div className="pt-3 border-t border-border mt-3 space-y-6">
                  {Object.entries(
                    (showAllWorkers ? pipelineData.workers : pipelineData.workers.slice(0, 6)).reduce((acc, worker) => {
                      const t = worker.type || "unknown";
                      if (!acc[t]) acc[t] = [];
                      acc[t].push(worker);
                      return acc;
                    }, {} as Record<string, WorkerStats[]>)
                  ).map(([type, groupWorkers]) => (
                    <div key={type} className="space-y-3">
                      <h3 className="text-[11px] font-bold text-muted uppercase tracking-wider px-1">
                        {type.replace("_", " ")} ({groupWorkers.length})
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {groupWorkers.map(worker => {
                          const isDown = Date.now() - new Date(worker.lastSeenAt).getTime() > 5 * 60 * 1000;
                          return (
                          <div key={worker.id} className={`rounded-xl border ${isDown ? 'border-red-500/50 bg-red-500/5' : 'border-border bg-surface'} p-4 space-y-3 relative group`}>
                            {isDown && (
                              <button
                                onClick={() => handleDeleteWorker(worker.id)}
                                className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                                title="Delete Worker"
                              >
                                ✕
                              </button>
                            )}
                            <div className="flex items-center justify-between">
                              <div className="flex items-start gap-2">
                                <div className={`w-2 h-2 mt-1 rounded-full shrink-0 ${isDown ? 'bg-red-600' : worker.status === 'idle' ? 'bg-yellow-400' : worker.status === 'busy' ? 'bg-blue-400' : 'bg-red-400'} ${!isDown && 'animate-pulse'}`} />
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-foreground leading-tight">{worker.hostname}</span>
                                  {worker.ip && <span className="text-[10px] text-muted font-mono">{worker.ip}</span>}
                                </div>
                              </div>
                              <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${isDown ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-white/5 text-muted border-border'}`}>
                                {isDown ? "DOWN" : worker.status}
                              </span>
                            </div>
                            <div className="space-y-1">
                              <DetailRow label="Worker ID" value={worker.id.split("-")[1] ?? worker.id} />
                              <DetailRow label="Last Seen" value={timeAgo(worker.lastSeenAt)} />
                              {worker.currentJobId && (
                                <>
                                  <DetailRow label="Current Job" value={worker.currentJobId} />
                                  <DetailRow label="Step" value={worker.currentStep ?? "—"} />
                                </>
                              )}
                              {worker.gpuMemoryTotalMB && (
                                <div className="pt-2">
                                  <div className="flex justify-between text-[10px] text-muted mb-1">
                                    <span>GPU VRAM</span>
                                    <span>{worker.gpuMemoryUsedMB} / {worker.gpuMemoryTotalMB} MB</span>
                                  </div>
                                  <ProgressBar done={worker.gpuMemoryUsedMB ?? 0} total={worker.gpuMemoryTotalMB} />
                                </div>
                              )}
                            </div>
                          </div>
                        )})}
                      </div>
                    </div>
                  ))}
                  
                  {pipelineData.workers.length > 6 && (
                    <div className="flex justify-center pt-2">
                      <button
                        onClick={() => setShowAllWorkers(!showAllWorkers)}
                        className="text-xs font-bold text-accent hover:text-accent-hover transition-colors px-3 py-1.5 rounded-full bg-accent/10"
                      >
                        {showAllWorkers ? "Show Less" : `Show All ${pipelineData.workers.length} Workers`}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {[
              { 
                title: "Audio Queue", 
                type: "audio", 
                stats: {
                  queued: stats.queuedAudio,
                  inProgress: jobs.filter(j => j.type === "audio" && ["TTS_IN_PROGRESS", "VIDEO_IN_PROGRESS", "RENDER_IN_PROGRESS"].includes(j.status)).length,
                  done: jobs.filter(j => j.type === "audio" && j.status === "DONE").length,
                  failed: jobs.filter(j => j.type === "audio" && j.status === "FAILED").length,
                },
                items: jobs.filter((j) => j.type === "audio").slice(0, 5) 
              },
              { 
                title: "Video Queue", 
                type: "video", 
                stats: {
                  queued: stats.queuedVideo,
                  inProgress: jobs.filter(j => ["video", "video_full", "video_bubble", "wardrobe_inpaint"].includes(j.type) && ["IN_PROGRESS", "TTS_IN_PROGRESS", "VIDEO_IN_PROGRESS", "RENDER_IN_PROGRESS"].includes(j.status)).length,
                  done: jobs.filter(j => ["video", "video_full", "video_bubble", "wardrobe_inpaint"].includes(j.type) && j.status === "DONE").length,
                  failed: jobs.filter(j => ["video", "video_full", "video_bubble", "wardrobe_inpaint"].includes(j.type) && j.status === "FAILED").length,
                },
                items: jobs.filter((j) => ["video", "video_full", "video_bubble", "wardrobe_inpaint"].includes(j.type)).slice(0, 5) 
              },
              { 
                title: "Render Queue", 
                type: "render", 
                totalSteps: 4,
                stats: {
                  queued: stats.queuedRender,
                  inProgress: jobs.filter(j => j.type === "render" && ["TTS_IN_PROGRESS", "VIDEO_IN_PROGRESS", "RENDER_IN_PROGRESS"].includes(j.status)).length,
                  done: jobs.filter(j => j.type === "render" && j.status === "DONE").length,
                  failed: jobs.filter(j => j.type === "render" && j.status === "FAILED").length,
                },
                items: jobs.filter((j) => j.type === "render").slice(0, 5) 
              },
            ].map((section) => (
              <div key={section.type} className="flex flex-col space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-sm font-bold text-foreground">{section.title}</h2>
                </div>
                
                {/* Mini Stats Bar per queue */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "Queued", value: section.stats.queued, color: "text-yellow-400" },
                    { label: "In Progress", value: section.stats.inProgress, color: "text-blue-400" },
                    { label: "Done", value: section.stats.done, color: "text-emerald-400" },
                    { label: "Failed", value: section.stats.failed, color: "text-red-400" },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-lg border border-border bg-surface p-1.5 text-center"
                    >
                      <p className={`text-sm font-bold ${stat.color}`}>{stat.value}</p>
                      <p className="text-[9px] text-muted font-bold uppercase tracking-wide">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border border-border bg-surface overflow-hidden flex-1">
                  <table className="w-full text-xs table-fixed">
                    <thead>
                      <tr className="border-b border-border bg-surface-raised">
                        <th className="text-left px-3 py-3 text-muted font-semibold uppercase tracking-wider w-[40%] lg:w-[35%]">Story</th>
                        <th className="text-left px-3 py-3 text-muted font-semibold uppercase tracking-wider hidden lg:table-cell lg:w-[15%]">Created</th>
                        <th className="text-left px-3 py-3 text-muted font-semibold uppercase tracking-wider w-[25%] lg:w-[20%]">Status</th>
                        <th className="text-right px-3 py-3 text-muted font-semibold uppercase tracking-wider w-[35%] lg:w-[30%]">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.items.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-muted text-[10px] font-semibold uppercase tracking-wider">
                            No {section.type} jobs.
                          </td>
                        </tr>
                      )}
                      {section.items.map((job) => (
                        <tr
                          key={job.id}
                          onClick={() => setSelectedJob(job)}
                          className="border-b border-border/50 hover:bg-white/[0.02] cursor-pointer transition-colors"
                        >
                          <td className="px-3 py-3">
                            <div className="overflow-hidden flex flex-col gap-1 items-start">
                              <span className="font-semibold text-foreground" title={job.storyTitle}>
                                {truncateWords(job.storyTitle, 5)}
                              </span>
                              {(job.type === "video_full" || job.type === "video_bubble" || job.type === "wardrobe_inpaint") && (
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${
                                  job.type === "wardrobe_inpaint"
                                    ? "bg-purple-500/15 border-purple-500/40 text-purple-300"
                                    : "bg-white/5 border-border text-muted"
                                }`}>
                                  {job.type === "wardrobe_inpaint" ? "wardrobe" : job.type === "video_full" ? "full" : "bubble"}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-muted hidden lg:table-cell">
                            <p className="truncate max-w-[80px]">
                              {timeAgo(job.createdAt)}
                            </p>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex flex-col gap-1.5 w-full max-w-[120px]">
                              <div><StatusBadge status={job.status} /></div>
                              {job.totalSteps > 0 && <ProgressBar done={job.doneSteps} total={job.totalSteps} />}
                              <div className="flex items-center gap-2 mt-1">
                                {job.durationMs != null && (
                                  <span className="text-[10px] text-muted font-mono" title="Time Taken">⏱ {formatDuration(job.durationMs)}</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right">
                            {job.status !== "DONE" && job.status !== "FAILED" && job.status !== "CANCELLED" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancel(job.id);
                                }}
                                className="text-red-400 hover:text-red-300 font-semibold transition-colors text-[10px] uppercase tracking-wide mr-3"
                              >
                                Cancel
                              </button>
                            )}
                            {(job.status === "FAILED" || job.status === "DONE" || job.status === "CANCELLED") && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRetry(job.id);
                                }}
                                className="text-accent hover:text-accent-hover font-semibold transition-colors text-[10px] uppercase tracking-wide"
                              >
                                {job.status === "FAILED" ? "Retry" : "Rerun"}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {jobs.filter((j) => section.type === "video" ? ["video", "video_full", "video_bubble", "wardrobe_inpaint"].includes(j.type) : j.type === section.type).length > 5 && (
                    <div className="p-2 border-t border-border bg-surface-raised text-center text-[10px] text-muted font-semibold">
                      + {jobs.filter((j) => section.type === "video" ? ["video", "video_full", "video_bubble", "wardrobe_inpaint"].includes(j.type) : j.type === section.type).length - 5} more
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Stats Bar */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Queued", value: stats.queued, color: "text-yellow-400" },
              { label: "In Progress", value: stats.inProgress, color: "text-blue-400" },
              { label: "Completed", value: stats.done, color: "text-emerald-400" },
              { label: "Failed", value: stats.failed, color: "text-red-400" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-border bg-surface p-3 text-center"
              >
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-[10px] text-muted font-semibold uppercase tracking-wider mt-0.5">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2">
            {["all", "QUEUED", "TTS_IN_PROGRESS", "VIDEO_IN_PROGRESS", "RENDER_IN_PROGRESS", "DONE", "FAILED"].map(
              (f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider transition-colors border ${
                    filter === f
                      ? "bg-accent/15 text-accent border-accent/30"
                      : "bg-white/5 text-muted border-border hover:text-foreground"
                  }`}
                >
                  {f === "all" ? "All" : (STATUS_LABELS[f] ?? f)}
                </button>
              )
            )}
          </div>

          {/* Job Table */}
          <div className="space-y-3">
            <div className="rounded-xl border border-border bg-surface overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-surface-raised">
                    <th className="text-left px-4 py-3 text-muted font-semibold uppercase tracking-wider">
                      Story
                    </th>
                    <th className="text-left px-4 py-3 text-muted font-semibold uppercase tracking-wider">
                      Queue
                    </th>
                    <th className="text-left px-4 py-3 text-muted font-semibold uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 text-muted font-semibold uppercase tracking-wider">
                      Progress
                    </th>
                    <th className="text-left px-4 py-3 text-muted font-semibold uppercase tracking-wider">
                      Step
                    </th>
                    <th className="text-left px-4 py-3 text-muted font-semibold uppercase tracking-wider">
                      Worker
                    </th>
                    <th className="text-left px-4 py-3 text-muted font-semibold uppercase tracking-wider">
                      Created
                    </th>
                    <th className="text-right px-4 py-3 text-muted font-semibold uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-muted text-[10px] font-semibold uppercase tracking-wider">
                        No jobs.
                      </td>
                    </tr>
                  )}
                  {jobs.map((job) => (
                    <tr
                      key={job.id}
                      onClick={() => setSelectedJob(job)}
                      className="border-b border-border/50 hover:bg-white/[0.02] cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="overflow-hidden">
                          <span className="font-semibold text-foreground" title={job.storyTitle}>
                            {truncateWords(job.storyTitle, 5)}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted font-mono truncate mt-0.5">{job.storyId}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted bg-white/5 px-2 py-0.5 rounded-full border border-border">
                          {job.type === "video_full" ? "full" : job.type === "video_bubble" ? "bubble" : job.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={job.status} />
                      </td>
                      <td className="px-4 py-3">
                        <ProgressBar done={job.doneSteps} total={job.totalSteps} />
                      </td>
                      <td className="px-4 py-3 text-muted font-mono">
                        {job.currentStep ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-muted font-mono truncate max-w-[120px]">
                        {job.workerId ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {timeAgo(job.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {job.status !== "DONE" && job.status !== "FAILED" && job.status !== "CANCELLED" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancel(job.id);
                            }}
                            className="text-red-400 hover:text-red-300 font-semibold transition-colors text-[10px] uppercase tracking-wide mr-3"
                          >
                            Cancel
                          </button>
                        )}
                        {(job.status === "FAILED" || job.status === "DONE" || job.status === "CANCELLED") && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRetry(job.id);
                            }}
                            className="text-accent hover:text-accent-hover font-semibold transition-colors text-[10px] uppercase tracking-wide"
                          >
                            {job.status === "FAILED" ? "Retry" : "Rerun"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination info */}
          {pagination && pagination.total > 0 && (
            <p className="text-[10px] text-muted text-center">
              Showing {jobs.length} of {pagination.total} jobs
            </p>
          )}
        </>
      )}

      {/* Modals / Drawers */}
      {showQueueModal && (
        <QueueJobModal onClose={() => setShowQueueModal(false)} onQueued={() => mutate()} />
      )}
      {selectedJob && (
        <JobDrawer job={selectedJob} onClose={() => setSelectedJob(null)} />
      )}
    </div>
  );
}
