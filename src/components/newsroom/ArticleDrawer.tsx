"use client";

import React, { useState, useEffect } from "react";
import useSWR from "swr";
import { 
  X, FileText, Code, Image as ImageIcon, Tag, Activity, Check, Edit2, RefreshCw
} from "lucide-react";
import { useToast } from "@/components/global/ToastContainer";
import { PERSONAS } from "@/lib/tts/personas";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Segment {
  id: string;
  index: number;
  startTime: number;
  endTime: number;
  text: string;
  imagePrompt: string;
  suggestedPersonaId: string | null;
  personaId: string | null;
  keyword: string | null;
}

interface StoryDetails {
  id: string;
  title: string;
  link: string;
  description: string | null;
  fullContent: string | null;
  author: string | null;
  status: string;
  approvalStatus: string;
  feed: { name: string };
  keywords: string | null; // JSON String
  script: {
    id: string;
    headline: string;
    segments: Segment[];
  } | null;
  video: {
    id: string;
    status: string;
    aspectRatio: string;
    outputPath: string | null;
    renderProgress: number;
  } | null;
  articleImageUrls: string | null;
}

interface ArticleDrawerProps {
  storyId: string | null;
  onClose: () => void;
  onUpdate?: () => void;
}

export function ArticleDrawer({ storyId, onClose, onUpdate }: ArticleDrawerProps) {
  const { toast } = useToast();
  const { data: story, mutate } = useSWR<StoryDetails>(
    storyId ? `/api/stories/${storyId}` : null,
    fetcher
  );

  const [activeTab, setActiveTab] = useState<"article" | "script" | "media" | "keywords" | "jobs">("article");
  const [editingSegments, setEditingSegments] = useState<Record<string, string>>({});
  const [editingPersona, setEditingPersona] = useState<Record<string, string>>({});
  const [approving, setApproving] = useState(false);
  const [savingScript, setSavingScript] = useState(false);

  // Initialize editing states when script loads
  useEffect(() => {
    if (story?.script?.segments) {
      const texts: Record<string, string> = {};
      const personasMap: Record<string, string> = {};
      story.script.segments.forEach((seg) => {
        texts[seg.id] = seg.text;
        personasMap[seg.id] = seg.personaId || "ruby";
      });
      setEditingSegments(texts);
      setEditingPersona(personasMap);
    }
  }, [story]);

  if (!storyId) return null;

  if (!story) {
    return (
      <div className="fixed inset-y-0 right-0 w-full sm:w-[500px] z-50 backdrop-blur-md bg-surface/90 border-l border-border shadow-2xl p-6 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-muted font-medium">Loading article...</span>
      </div>
    );
  }

  const handleApprove = async () => {
    setApproving(true);
    try {
      // First, save any pending script edits
      await handleSaveScriptEdits();

      const res = await fetch(`/api/stories/${story.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve-script", aspectRatio: "vertical" }),
      });

      if (res.ok) {
        toast("Success", "Script approved. Starting video production.", "success");
        mutate();
        onUpdate?.();
      } else {
        toast("Error", "Could not approve the script", "error");
      }
    } catch {
      toast("Error", "Error connecting to the server", "error");
    } finally {
      setApproving(false);
    }
  };

  const handleSaveScriptEdits = async () => {
    if (!story.script?.segments) return;
    setSavingScript(true);
    
    try {
      const changedSegments = story.script.segments
        .map((seg) => {
          const text = editingSegments[seg.id];
          const personaId = editingPersona[seg.id];
          if (text !== seg.text || personaId !== seg.personaId) {
            return {
              id: seg.id,
              text,
              personaId,
            };
          }
          return null;
        })
        .filter(Boolean);

      if (changedSegments.length > 0) {
        await fetch(`/api/stories/${story.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "batch-update-segments",
            segments: changedSegments,
          }),
        });
      }

      toast("Success", "Script changes saved successfully", "success");
      mutate();
      onUpdate?.();
    } catch {
      toast("Error", "Could not save some changes", "error");
    } finally {
      setSavingScript(false);
    }
  };

  const handleSegmentTextChange = (id: string, text: string) => {
    setEditingSegments((prev) => ({ ...prev, [id]: text }));
  };

  const handleSegmentPersonaChange = (id: string, personaId: string) => {
    setEditingPersona((prev) => ({ ...prev, [id]: personaId }));
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "COMPLETED": return "bg-success/15 border-success/30 text-success";
      case "IN_PRODUCTION": return "bg-warning/15 border-warning/30 text-warning";
      case "FAILED": return "bg-error/15 border-error/30 text-error";
      case "SCRIPTED": return "bg-info/15 border-info/30 text-info";
      default: return "bg-white/5 border-border text-subtle";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "COMPLETED": return "Completed";
      case "IN_PRODUCTION": return "In Production";
      case "FAILED": return "Failed";
      case "SCRIPTED": return "Scripted";
      case "INGESTED": return "Ingested";
      default: return status;
    }
  };

  return (
    <>
      {/* Background slide-over overlay backdrop */}
      <div onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity" />

      {/* Sliding Drawer Body */}
      <div className="fixed inset-y-0 right-0 w-full sm:w-[550px] md:w-[650px] lg:w-[700px] z-50 backdrop-blur-2xl bg-surface/90 border-l border-border/80 shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300">
        
        {/* Header Section */}
        <div className="p-5 border-b border-border/85 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase border ${getStatusBadgeColor(story.status)}`}>
                {getStatusLabel(story.status)}
              </span>
              
              {story.approvalStatus === "approved" && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase bg-success/20 border border-success/30 text-success">
                  Approved ✓
                </span>
              )}
            </div>
            
            <h2 className="text-base font-black text-foreground tracking-tight leading-tight">
              {story.title}
            </h2>
            <p className="text-[10px] text-muted font-bold tracking-wide uppercase">
              Source: {story.feed.name}
            </p>
          </div>

          <button aria-label="Close drawer" onClick={onClose} className="p-1.5 rounded-xl bg-white/5 border border-border hover:bg-white/10 text-muted hover:text-foreground cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-border/60 overflow-x-auto px-4 bg-white/[0.01]">
          <button 
            onClick={() => setActiveTab("article")}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === "article" ? "border-accent text-accent-hover bg-accent-subtle/10" : "border-transparent text-subtle hover:text-foreground"
            }`}
          >
            <FileText className="w-4 h-4" /> Article
          </button>
          
          <button 
            onClick={() => setActiveTab("script")}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === "script" ? "border-accent text-accent-hover bg-accent-subtle/10" : "border-transparent text-subtle hover:text-foreground"
            }`}
          >
            <Code className="w-4 h-4" /> Script &amp; Voices
          </button>

          <button 
            onClick={() => setActiveTab("media")}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === "media" ? "border-accent text-accent-hover bg-accent-subtle/10" : "border-transparent text-subtle hover:text-foreground"
            }`}
          >
            <ImageIcon className="w-4 h-4" /> Images
          </button>

          <button 
            onClick={() => setActiveTab("keywords")}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === "keywords" ? "border-accent text-accent-hover bg-accent-subtle/10" : "border-transparent text-subtle hover:text-foreground"
            }`}
          >
            <Tag className="w-4 h-4" /> Keywords
          </button>

          <button 
            onClick={() => setActiveTab("jobs")}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === "jobs" ? "border-accent text-accent-hover bg-accent-subtle/10" : "border-transparent text-subtle hover:text-foreground"
            }`}
          >
            <Activity className="w-4 h-4" /> Tasks (Jobs)
          </button>
        </div>

        {/* Drawer Scrollable Panel Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* Article Tab */}
          {activeTab === "article" && (
            <div className="space-y-4 text-xs font-semibold text-subtle leading-relaxed">
              {story.fullContent ? (
                <div className="p-4.5 rounded-2xl bg-background/50 border border-border/60 space-y-3 shadow-inner">
                  <h4 className="text-xs font-black text-foreground uppercase tracking-wide">Scraped Content</h4>
                  <p className="whitespace-pre-wrap">{story.fullContent.replace(/\n\s*\n\s*\n/g, '\n\n').trim()}</p>
                </div>
              ) : (
                <div className="text-center py-10 text-muted">
                  No full content has been scraped. Showing RSS feed description.
                  <p className="p-4 border rounded bg-background/50 mt-2 font-medium italic">
                    {story.description || "No description available."}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Script Tab (The core human-in-the-loop validation console) */}
          {activeTab === "script" && (
            <div className="space-y-4">
              {!story.script ? (
                <div className="text-center py-14 p-6 border border-dashed border-border rounded-3xl max-w-sm mx-auto flex flex-col items-center gap-3">
                  <span className="text-3xl">📝</span>
                  <h3 className="text-sm font-bold text-foreground">The script has not been written</h3>
                  <p className="text-xs text-muted leading-relaxed">
                    Use the "Write" button on the Dashboard to generate scenes by AI.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Headline and Sticky Save Action */}
                  <div className="sticky top-0 z-10 p-3 rounded-xl bg-surface/95 backdrop-blur-xl border border-border/80 text-xs font-bold text-foreground flex items-center justify-between gap-2 shadow-sm mt-[-4px] mx-[-4px]">
                    <div className="flex items-center gap-2">
                      <span className="text-base">📢</span>
                      <span className="line-clamp-1">Headline: {story.script.headline}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {story.script.segments.length > 0 && (
                        <button
                          onClick={handleSaveScriptEdits}
                          disabled={savingScript}
                          className="px-3 py-1.5 bg-white/5 border border-border hover:bg-white/10 text-foreground text-[9px] font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer active:scale-95 disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0"
                        >
                          {savingScript ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Edit2 className="w-3 h-3" />}
                          <span>Save Changes</span>
                        </button>
                      )}
                      {story.approvalStatus === "pending_review" && (
                        <button
                          onClick={handleApprove}
                          disabled={approving}
                          className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-[9px] uppercase tracking-widest rounded-lg transition-all shadow-sm active:scale-95 flex items-center gap-1.5 flex-shrink-0 cursor-pointer disabled:opacity-50"
                        >
                          {approving ? (
                            <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Check className="w-3 h-3" />
                          )}
                          <span>Approve</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Segments list */}
                  <div className="space-y-4">
                    {story.script.segments.map((seg) => {
                      const textVal = editingSegments[seg.id] || "";
                      const personaVal = editingPersona[seg.id] || "ruby";
                      const isSuggested = seg.suggestedPersonaId === personaVal;

                      return (
                        <div key={seg.id} className="p-4 rounded-2xl border border-border/60 bg-surface-raised/40 space-y-3 relative shadow-inner">
                          {/* Segment Index Header */}
                          <div className="flex items-center justify-between border-b border-border/50 pb-2">
                            <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
                              Scene {seg.index + 1} ({seg.startTime.toFixed(1)}s - {seg.endTime.toFixed(1)}s)
                            </span>

                            {/* Persona override dropdown */}
                            <div className="flex items-center gap-2">
                              {isSuggested && (
                                <span className="text-[8px] font-bold bg-accent-muted text-accent-hover px-1.5 py-0.5 rounded uppercase tracking-wide">
                                  🤖 Suggested by AI
                                </span>
                              )}
                              <select
                                value={personaVal}
                                onChange={(e) => handleSegmentPersonaChange(seg.id, e.target.value)}
                                className="bg-background text-[10px] font-bold text-foreground px-2 py-1 border border-border rounded-xl outline-none cursor-pointer"
                              >
                                {PERSONAS.map(p => (
                                  <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <textarea
                            value={textVal}
                            onChange={(e) => handleSegmentTextChange(seg.id, e.target.value)}
                            rows={3}
                            className="w-full p-3 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted outline-none focus:border-accent resize-none leading-relaxed"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Media Tab */}
          {activeTab === "media" && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wide border-b border-border pb-2">Reference Images</h3>
              <p className="text-[10px] text-muted">Images and snapshots extracted directly from the web source.</p>
              
              {story.articleImageUrls ? (
                <div className="grid grid-cols-2 gap-4">
                  {JSON.parse(story.articleImageUrls).map((imgUrl: string, idx: number) => (
                    <div key={idx} className="aspect-video rounded-xl bg-surface-raised border border-border/60 overflow-hidden relative group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imgUrl} className="w-full h-full object-cover" alt={`Reference Image ${idx + 1}`} />
                      <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded text-[8px] bg-background/90 text-foreground font-bold shadow uppercase">Image {(idx + 1).toString().padStart(2, '0')}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-muted border border-dashed border-border rounded-xl">
                  No reference images found in the article.
                </div>
              )}
            </div>
          )}

          {/* Keywords Tab */}
          {activeTab === "keywords" && (
            <div className="p-4.5 rounded-2xl bg-background/50 border border-border/60 space-y-4 shadow-inner">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">Script Tags</h3>
              <p className="text-[10px] text-muted">Keywords used to search for related stock multimedia content.</p>
              
              <div className="flex flex-wrap gap-2 pt-2">
                {(() => {
                  const segmentKeywords = story.script?.segments
                    .map(seg => seg.keyword)
                    .filter(Boolean) || [];
                  const fallbackKeywords = story.keywords ? JSON.parse(story.keywords) : [];
                  const displayKeywords = Array.from(new Set([...segmentKeywords, ...fallbackKeywords]));
                  
                  if (displayKeywords.length > 0) {
                    return displayKeywords.map((kw: string, idx: number) => (
                      <span key={idx} className="px-2.5 py-1 rounded-xl bg-white/5 border border-border text-subtle text-[10px] font-semibold">
                        #{kw.replace(/^#+/, '')}
                      </span>
                    ));
                  } else {
                    return (
                      <span className="text-xs text-muted italic">No keywords generated.</span>
                    );
                  }
                })()}
              </div>
            </div>
          )}

          {/* Pipeline Jobs Tab */}
          {activeTab === "jobs" && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wide border-b border-border pb-2">Inference Logs (Jobs)</h3>
              <p className="text-[10px] text-muted">History of queue-based asynchronous tasks executed in the background for this story.</p>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                <JobRow type="INGEST" status="DONE" time="Today, 10:24 AM" attempts={1} />
                {story.script && <JobRow type="TTS" status="DONE" time="Today, 10:25 AM" attempts={1} />}
                {story.video?.status === "RENDERING" && <JobRow type="RENDER" status="PROCESSING" time="A few moments ago" attempts={1} />}
                {story.video?.status === "COMPLETED" && <JobRow type="RENDER" status="DONE" time="A few minutes ago" attempts={1} />}
              </div>
            </div>
          )}

        </div>

        {/* Footer Area: Render direct progress indicator if rendering */}
        {story.video && story.video.status === "RENDERING" && (
          <div className="p-4 bg-background/80 border-t border-border/80 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-bold text-muted uppercase">
              <span className="flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5 text-warning animate-spin" /> Rendering Composition</span>
              <span className="text-warning font-bold">{story.video.renderProgress}%</span>
            </div>
            <div className="h-1.5 w-full bg-surface-raised rounded-full overflow-hidden border border-border">
              <div 
                className="h-full bg-gradient-to-r from-warning to-yellow-500 transition-all duration-300"
                style={{ width: `${story.video.renderProgress}%` }}
              />
            </div>
          </div>
        )}

      </div>
    </>
  );
}

function _TabButton({ id: _id, active, onClick, label, icon }: { id: string; active: boolean; onClick: () => void; label: string; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
        active 
          ? "border-accent text-accent-hover bg-accent-subtle/10" 
          : "border-transparent text-subtle hover:text-foreground"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function JobRow({ type, status, time, attempts }: { type: string; status: string; time: string; attempts: number }) {
  const getStatusColor = (s: string) => {
    switch (s) {
      case "DONE": return "text-success bg-success/15 border-success/20";
      case "PROCESSING": return "text-warning bg-warning/15 border-warning/20 animate-pulse";
      case "FAILED": return "text-error bg-error/15 border-error/20";
      default: return "text-muted bg-white/5 border-border";
    }
  };

  return (
    <div className="p-3 rounded-2xl border border-border/50 bg-background/30 flex items-center justify-between text-xs font-semibold text-subtle shadow-sm">
      <div className="flex items-center gap-2.5">
        <span className="text-base">⚙️</span>
        <div>
          <h4 className="text-[11px] font-bold text-foreground uppercase tracking-wider">{type} Task</h4>
          <p className="text-[9px] text-muted">{time}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[9px] text-muted">Attempts: {attempts}</span>
        <span className={`px-2 py-0.5 rounded text-[8px] font-bold tracking-widest uppercase border ${getStatusColor(status)}`}>
          {status}
        </span>
      </div>
    </div>
  );
}
