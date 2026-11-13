"use client";

import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDistanceToNow } from "date-fns";
import { Play,X } from "lucide-react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export interface PipelineJob {
  id: string;
  status: string;
  progress?: number | null;
  currentStep?: string | null;
  doneSteps?: number;
  totalSteps?: number;
  createdAt?: string | Date;
  story?: {
    title?: string | null;
  } | null;
}

export function PipelineQueuePanel() {
  const { data, error, mutate } = useSWR<{ jobs: PipelineJob[] }>("/api/pipeline/jobs", fetcher, {
    refreshInterval: 3000,
  });

  if (error) return null;
  if (!data) return null;

  const jobs = data.jobs || [];
  const activeJobs = jobs.filter((j: PipelineJob) => j.status === "QUEUED" || j.status === "PROCESSING" || j.status === "PENDING" || j.status.includes("IN_PROGRESS"));

  if (activeJobs.length === 0) return null;

  const handleCancel = async (jobId: string) => {
    // We can use the existing progress endpoint to mark as FAILED to cancel
    await fetch(`/api/pipeline/jobs/${jobId}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step: "cancelled", status: "FAILED", errorLog: "Cancelled by user" })
    });
    mutate();
  };

  return (
    <div className="w-full bg-background border border-border/60 rounded-xl p-4 mb-6 shadow-sm">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-3 flex items-center gap-2">
        <Play className="w-3 h-3 text-accent" />
        Live Pipeline Queue
      </h3>
      <div className="flex flex-col gap-3">
        {activeJobs.map((job: PipelineJob) => (
          <div key={job.id} className="flex flex-col gap-2 p-3 bg-surface rounded-lg border border-border/40">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold truncate max-w-[200px] md:max-w-md">
                {job.story?.title || job.id}
              </span>
              <div className="flex items-center gap-2">
                <StatusBadge status={job.status} />
                <button
                  onClick={() => handleCancel(job.id)}
                  className="p-1 hover:bg-black/20 rounded text-muted hover:text-red-400 transition-colors"
                  title="Cancel Job"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {job.status === "PROCESSING" || job.status.includes("IN_PROGRESS") ? (
              <div className="flex flex-col gap-1 mt-1">
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>{job.currentStep || "Processing..."}</span>
                  <span>{job.doneSteps} / {job.totalSteps} steps</span>
                </div>
                <div className="h-1.5 w-full bg-black/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-accent transition-all duration-500 ease-out"
                    style={{ width: `${Math.min(100, Math.max(0, (((job.doneSteps ?? 0) / Math.max(1, job.totalSteps ?? 1))) * 100))}%` }}
                  />
                </div>
              </div>
            ) : (
              <span className="text-[10px] text-muted font-mono">
                Queued {formatDistanceToNow(new Date(job.createdAt || Date.now()))} ago
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
