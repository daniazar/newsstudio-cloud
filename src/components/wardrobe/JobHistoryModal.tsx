"use client";

import React from "react";
import Link from "next/link";
import { Clock, RefreshCw, X, Activity, ExternalLink, Eye, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { WardrobeInpaintJobSummary } from "./types";

export interface JobHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobs: WardrobeInpaintJobSummary[];
  isLoading: boolean;
  onRefresh: () => void;
  onLoadInPlayer: (job: WardrobeInpaintJobSummary) => void;
  onMonitorLive: (job: WardrobeInpaintJobSummary) => void;
}

export const JobHistoryModal = React.memo(function JobHistoryModal({
  isOpen,
  onClose,
  jobs,
  isLoading,
  onRefresh,
  onLoadInPlayer,
  onMonitorLive,
}: JobHistoryModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="glass-panel-raised border border-border/80 w-full max-w-2xl rounded-3xl p-6 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Wardrobe Inpaint History</h3>
              <p className="text-[10px] font-mono text-muted">Recent neural transformation jobs & completions</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={onRefresh}
              isLoading={isLoading}
              className="text-xs font-mono"
              aria-label="Refresh job history"
            >
              <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <button
              onClick={onClose}
              aria-label="Close history modal"
              className="p-1 rounded-lg text-muted hover:text-white hover:bg-surface-raised transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-border/60 space-y-2 pr-1">
          {jobs.length === 0 ? (
            <div className="p-8 text-center text-muted font-mono text-xs flex flex-col items-center gap-2">
              <Activity className="w-8 h-8 text-purple-400/40" />
              <span>No previous inpaint jobs found</span>
            </div>
          ) : (
            jobs.map((job) => {
              const isDone = job.status === "DONE";
              const isFailed = job.status === "FAILED";
              const isLive = job.status === "QUEUED" || job.status === "IN_PROGRESS";
              const outfitTitle = job.config?.outfitName || "Wardrobe Inpaint";
              const personaTitle = job.config?.personaName || "Anchor";
              const outputUrl = job.outputPublicUrl || job.config?.outputPublicUrl;

              return (
                <div
                  key={job.id}
                  className="p-3 rounded-2xl bg-surface/40 hover:bg-surface border border-border/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          isDone
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : isFailed
                            ? "bg-red-500/20 text-red-300 border border-red-500/40"
                            : "bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-pulse"
                        }`}
                      >
                        {job.status}
                      </span>
                      <span className="text-xs font-bold text-foreground truncate">
                        {personaTitle} — {outfitTitle}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-muted">
                      <span>{new Date(job.createdAt).toLocaleString()}</span>
                      <span>•</span>
                      <span className="truncate">{job.currentStep || "Processed"}</span>
                    </div>
                    {job.errorLog && (
                      <p className="text-[10px] font-mono text-red-400 truncate max-w-md">{job.errorLog}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <Link
                      href={`/pipeline?jobId=${job.id}`}
                      target="_blank"
                      className="p-1.5 rounded-xl bg-surface-raised border border-border text-muted hover:text-white transition-colors"
                      title="View in Pipeline Queue"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>

                    {isDone && outputUrl && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onLoadInPlayer(job)}
                        className="text-xs font-mono flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5 text-purple-400" />
                        <span>Load in Player</span>
                      </Button>
                    )}

                    {isLive && (
                      <Button
                        size="sm"
                        variant="emerald-glow"
                        onClick={() => onMonitorLive(job)}
                        className="text-xs font-mono flex items-center gap-1.5"
                      >
                        <Activity className="w-3.5 h-3.5 animate-spin" />
                        <span>Monitor Live</span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border/60">
          <Link
            href="/pipeline"
            target="_blank"
            className="text-xs font-mono text-purple-400 hover:text-purple-300 flex items-center gap-1.5"
          >
            <span>Open Full Video Pipeline Monitor</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
          <Button
            size="sm"
            variant="secondary"
            onClick={onClose}
            className="text-xs font-mono"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
});
