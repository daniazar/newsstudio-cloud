"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  X,
  Film,
  Check,
  ExternalLink,
  Loader2,
  Tv,
  Layers,
  ArrowRight,
  AlertCircle
} from "lucide-react";
import { MotionJobResult } from "@/lib/ai/modernMotionClient";

interface SegmentInfo {
  id: string;
  index: number;
  text: string;
  assetPath: string | null;
  assetType: string | null;
  personaId: string | null;
}

interface StoryItem {
  id: string;
  title: string;
  status: string;
  pubDate: string;
  script?: {
    id: string;
    headline: string;
    segments: SegmentInfo[];
  } | null;
  video?: {
    id: string;
    status: string;
    outputPath: string | null;
  } | null;
}

interface SendToStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: MotionJobResult | null;
}

export function SendToStoryModal({
  isOpen,
  onClose,
  result,
}: SendToStoryModalProps) {
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ storyId: string; segmentIndex: number } | null>(null);

  const handleClose = () => {
    setSelectedStoryId(null);
    setSelectedSegmentId(null);
    setSuccessInfo(null);
    setError(null);
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchStories = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/stories?limit=15");
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const data = await res.json();
        const storyList: StoryItem[] = data.stories || data.data || [];
        if (isMounted) {
          setStories(storyList);
          if (storyList.length > 0) {
            setSelectedStoryId(storyList[0].id);
            const firstSeg = storyList[0].script?.segments?.[0];
            if (firstSeg) {
              setSelectedSegmentId(firstSeg.id);
            }
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error("Failed to load stories for modal:", err);
          setError("Failed to fetch active news stories. Ensure database is connected.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchStories();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen || !result) return null;

  const activeStory = stories.find((s) => s.id === selectedStoryId);
  const segments = activeStory?.script?.segments || [];

  const handleApplyToSegment = async () => {
    if (!selectedStoryId || !selectedSegmentId) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const selectedSeg = segments.find((s) => s.id === selectedSegmentId);
      const segIndex = selectedSeg ? selectedSeg.index : 0;

      const res = await fetch(`/api/stories/${selectedStoryId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-segment",
          segmentId: selectedSegmentId,
          presenterVideoPath: result.output_url,
          presenterStatus: "READY",
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP error ${res.status}`);
      }

      setSuccessInfo({
        storyId: selectedStoryId,
        segmentIndex: segIndex + 1,
      });
    } catch (err: unknown) {
      console.error("Failed to assign presenter video to segment:", err);
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Failed to update story segment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface-elevated border border-border/80 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 text-foreground">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Deploy Motion Animation to News Story
              </h3>
              <p className="text-[11px] text-muted">
                Assign <span className="text-emerald-400 font-semibold">{result.model_name}</span> output to a scene segment
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg bg-surface border border-border/60 hover:bg-white/10 text-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successInfo ? (
          <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
              <Check className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground mb-1">
                Presenter Animation Assigned!
              </h4>
              <p className="text-xs text-muted max-w-md mx-auto">
                Scene {successInfo.segmentIndex} in &quot;{activeStory?.title}&quot; now uses the high-fidelity {result.model_name} animation loop.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <Link
                href={`/editor/${successInfo.storyId}`}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
              >
                <span>Open in Video Editor</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
              <button
                onClick={handleClose}
                className="px-4 py-2 rounded-xl bg-surface border border-border text-xs font-semibold text-muted hover:text-foreground transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Story Picker */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-muted uppercase tracking-wider flex items-center gap-1.5">
                <Tv className="w-3.5 h-3.5 text-sky-400" />
                <span>Select Target Story</span>
              </label>

              {isLoading ? (
                <div className="p-4 rounded-xl bg-surface border border-border/60 flex items-center justify-center text-xs text-muted gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Loading active news stories...</span>
                </div>
              ) : stories.length === 0 ? (
                <div className="p-4 rounded-xl bg-surface border border-border/60 text-xs text-muted text-center">
                  No active stories found. Create or ingest a story in the Newsroom first.
                </div>
              ) : (
                <select
                  value={selectedStoryId || ""}
                  onChange={(e) => {
                    const nextStoryId = e.target.value;
                    setSelectedStoryId(nextStoryId);
                    const st = stories.find((s) => s.id === nextStoryId);
                    const first = st?.script?.segments?.[0];
                    if (first) setSelectedSegmentId(first.id);
                  }}
                  className="w-full bg-surface border border-border/80 rounded-xl px-3 py-2 text-xs text-foreground focus:border-emerald-500 focus:outline-none"
                >
                  {stories.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.title} ({st.status})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Segment Selector */}
            {activeStory && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                  <span>Select Scene Segment</span>
                </label>

                {segments.length === 0 ? (
                  <div className="p-3 rounded-xl bg-surface border border-border/60 text-xs text-muted">
                    This story has not been scripted into scene segments yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                    {segments.map((seg) => {
                      const isSelected = selectedSegmentId === seg.id;
                      return (
                        <button
                          key={seg.id}
                          type="button"
                          onClick={() => setSelectedSegmentId(seg.id)}
                          className={`p-2.5 rounded-xl border text-left text-xs transition-all flex items-start justify-between cursor-pointer ${
                            isSelected
                              ? "bg-emerald-500/10 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/30"
                              : "bg-surface border-border/60 text-muted hover:bg-white/5 hover:text-foreground"
                          }`}
                        >
                          <div className="space-y-0.5 max-w-[85%]">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[11px] text-foreground">
                                Scene {seg.index + 1}
                              </span>
                              {seg.personaId && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/10 text-muted">
                                  Persona: {seg.personaId}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] line-clamp-1 italic text-muted">
                              &quot;{seg.text}&quot;
                            </p>
                          </div>
                          {isSelected && (
                            <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1 shrink-0 shadow-[0_0_8px_#34d399]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Preview Banner */}
            <div className="p-3 rounded-xl bg-surface border border-border/60 flex items-center justify-between text-xs">
              <div>
                <span className="text-muted block text-[10px]">Animation Asset URL:</span>
                <span className="font-mono text-emerald-300 text-[11px] truncate max-w-sm block">
                  {result.output_url}
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                {result.resolution}
              </span>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/60">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-xl bg-surface border border-border text-xs font-semibold text-muted hover:text-foreground transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleApplyToSegment}
                disabled={isSubmitting || !selectedStoryId || !selectedSegmentId || segments.length === 0}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-sky-600 hover:from-emerald-400 hover:to-sky-500 text-black font-bold text-xs shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Assigning Presenter...</span>
                  </>
                ) : (
                  <>
                    <span>Apply to Scene Segment</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
