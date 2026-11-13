"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { 
  Play, Tv, Film, Camera, Smartphone, Calendar, Info, Clock, X,
  ExternalLink, FileText, RefreshCw, ChevronRight,
  LayoutGrid, List, TrendingUp, TrendingDown, Eye, ThumbsUp, Shield, Search
} from "lucide-react";
import { useToast } from "@/components/global/ToastContainer";
import { useInfiniteList } from "@/lib/hooks/useInfiniteList";
import { InfiniteScrollSentinel } from "@/components/global/InfiniteScrollSentinel";
import dynamic from "next/dynamic";
import type { ForensicQaReport } from "@/lib/ai/qaGatekeeper";

const ForensicQaModal = dynamic(
  () => import("@/components/qa/ForensicQaModal").then((mod) => mod.ForensicQaModal),
  { ssr: false }
);

interface ChannelOption {
  id: string;
  name: string;
  platform: string;
  handle: string;
}

interface PublishRecord {
  id: string;
  status: string;
  platformVideoId: string | null;
  publishedAt: string | null;
  scheduledFor: string | null;
  viewCount: number;
  likeCount: number;
  channel: {
    name: string;
    platform: string;
  };
}

interface Video {
  id: string;
  status: string;
  aspectRatio: string;
  outputPath?: string | null;
  thumbnailPath?: string | null;
  duration?: number | null;
  youtubeTitle?: string | null;
  youtubeDescription?: string | null;
  youtubeTags?: string | null;
  instagramCaption?: string | null;
  instagramHashtags?: string | null;
  totalViews?: number;
  totalLikes?: number;
  createdAt: string;
  story: {
    id: string;
    title: string;
    feed: { name: string };
  };
  publishes?: PublishRecord[];
}

interface DrawerSegment {
  id: string;
  index: number;
  text: string;
  startTime?: number | null;
  endTime?: number | null;
  assetType?: string | null;
}

interface AnalyticsTableRow {
  id: string;
  title: string;
  thumbnailPath: string;
  category: string;
  persona: string;
  totalViews: number;
  totalLikes: number;
  publishCount: number;
  createdAt: string;
}

interface AnalyticsData {
  trend: {
    recentViews: number;
    previousViews: number;
    percentChange: number;
  };
  bestPerforming: {
    category: string;
    persona: string;
    dayOfWeek: string;
    timeOfDay: string;
  };
  table: AnalyticsTableRow[];
}

export default function VaultPage() {
  const { toast } = useToast();

  // Search & Filter state
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const [aspectRatioFilter, setAspectRatioFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const {
    items: videos,
    total: totalVideos,
    setSize,
    size,
    isReachingEnd,
    isLoadingMore,
    isLoadingInitial: isLoadingVideos,
    mutate: mutateVideos,
  } = useInfiniteList<Video>("/api/videos", {
    limit: 24,
    filters: {
      q: debouncedSearch || undefined,
      aspectRatio: aspectRatioFilter !== "all" ? aspectRatioFilter : undefined,
      sortBy: sortBy !== "newest" ? sortBy : undefined,
    },
  });
  const [channels, setChannels] = useState<ChannelOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  
  const [viewMode, setViewMode] = useState<"grid" | "table" | "analytics">("grid");
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [drawerSegments, setDrawerSegments] = useState<DrawerSegment[]>([]);
  const [segmentsLoading, setSegmentsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lazily load the script segments for the currently open video drawer.
  useEffect(() => {
    let cancelled = false;
    const loadSegments = async () => {
      if (!selectedVideo) {
        setDrawerSegments([]);
        return;
      }
      setSegmentsLoading(true);
      try {
        const res = await fetch(`/api/stories/${selectedVideo.story.id}`);
        const data = res.ok ? await res.json() : null;
        if (cancelled) return;
        const segs = data?.script?.segments ?? data?.story?.script?.segments ?? [];
        setDrawerSegments(Array.isArray(segs) ? segs : []);
      } catch {
        if (!cancelled) setDrawerSegments([]);
      } finally {
        if (!cancelled) setSegmentsLoading(false);
      }
    };
    loadSegments();
    return () => {
      cancelled = true;
    };
  }, [selectedVideo]);

  // Publishing Modal states
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [publishingVideo, setPublishingVideo] = useState<Video | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState("");
  const [publishTitle, setPublishTitle] = useState("");
  const [publishDescription, setPublishDescription] = useState("");
  const [publishVisibility, setPublishVisibility] = useState("public");
  const [publishScheduledFor, setPublishScheduledFor] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  // Forensic QA Audit states
  const [qaModalOpen, setQaModalOpen] = useState(false);
  const [qaReport, setQaReport] = useState<ForensicQaReport | null>(null);
  const [isAuditingQa, setIsAuditingQa] = useState(false);

  const handleAuditVaultVideo = async (video: Video) => {
    setIsAuditingQa(true);
    setQaModalOpen(true);
    toast("Forensic QA Gatekeeper", "Running zero-trust multimodal audit with Gemini 2.5 Vision...", "info");

    try {
      const res = await fetch("/api/qa/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId: video.id,
          videoPath: video.outputPath,
          title: video.story?.title || video.youtubeTitle,
          aspectRatio: video.aspectRatio === "horizontal" ? "16:9" : "9:16",
        }),
      });

      const data = await res.json();
      if (data.success && data.report) {
        setQaReport(data.report);
      } else {
        toast("Audit Notice", data.error || "Could not complete audit.", "warning");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast("Audit Error", msg, "error");
    } finally {
      setIsAuditingQa(false);
    }
  };

  const fetchChannels = async () => {
    const res = await fetch("/api/channels?limit=500");
    if (res.ok) {
      const data = await res.json();
      setChannels(data.data ?? data.channels ?? []);
    }
  };

  const fetchAnalytics = async () => {
    const res = await fetch("/api/videos/analytics");
    if (res.ok) {
      setAnalyticsData(await res.json());
    }
  };

  useEffect(() => {
    const init = async () => {
      await fetchChannels();
      setIsLoading(false);
    };
    init();
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast("Copied", "Text copied to clipboard", "success");
  };

  const handleOpenPublishModal = (video: Video) => {
    setPublishingVideo(video);
    
    // Choose pre-filled tags and template based on video properties
    const defaultTitle = video.youtubeTitle || video.story.title || "";
    const defaultDesc = video.youtubeDescription || video.instagramCaption || "";

    setPublishTitle(defaultTitle);
    setPublishDescription(defaultDesc);
    setPublishScheduledFor("");
    if (channels.length > 0) {
      setSelectedChannelId(channels[0].id);
    }
    setIsPublishModalOpen(true);
  };

  const handlePublishSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publishingVideo || !selectedChannelId) return;

    setIsPublishing(true);
    try {
      const res = await fetch(`/api/videos/${publishingVideo.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: selectedChannelId,
          title: publishTitle,
          description: publishDescription,
          visibility: publishVisibility,
          scheduledFor: publishScheduledFor || null,
        }),
      });

      if (res.ok) {
        toast("Scheduled", "The video has been sent to Inngest for publishing", "success");
        setIsPublishModalOpen(false);
        mutateVideos(); // Refresh statuses
      } else {
        const err = await res.text();
        toast("Error", `Failed to publish: ${err}`, "error");
      }
    } catch {
      toast("Error", "Connection error with the server", "error");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCaptureFrame = async (videoNode: HTMLVideoElement, videoId: string) => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = videoNode.videoWidth;
      canvas.height = videoNode.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(videoNode, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);

      toast("Processing", "Uploading thumbnail...", "info");

      const res = await fetch(`/api/videos/${videoId}/thumbnail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: dataUrl })
      });
      if (res.ok) {
        toast("Success", "Thumbnail updated", "success");
        mutateVideos();
      } else {
        toast("Error", "Could not save the thumbnail", "error");
      }
    } catch {
      toast("Error", "An error occurred while capturing the frame", "error");
    }
  };

  const handleCustomThumbnail = (e: React.ChangeEvent<HTMLInputElement>, videoId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast("Error", "The image must be smaller than 5MB", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      toast("Processing", "Uploading custom thumbnail...", "info");

      try {
        const res = await fetch(`/api/videos/${videoId}/thumbnail`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64 })
        });
        
        if (res.ok) {
          toast("Success", "Thumbnail updated with your image", "success");
          mutateVideos();

          // Update selected video object to show it immediately
          const { url } = await res.json();
          setSelectedVideo(prev => prev ? { ...prev, thumbnailPath: url } : null);
        } else {
          toast("Error", "Could not save the thumbnail", "error");
        }
      } catch {
        toast("Error", "Network error while uploading", "error");
      }
    };
    reader.readAsDataURL(file);
  };

  const getPlatformIcon = (plat: string) => {
    switch (plat) {
      case "youtube": return <Tv className="w-3.5 h-3.5 text-red-500" />;
      case "instagram": return <Camera className="w-3.5 h-3.5 text-pink-500" />;
      case "tiktok": return <Smartphone className="w-3.5 h-3.5 text-cyan-400" />;
      default: return <Clock className="w-3.5 h-3.5 text-muted" />;
    }
  };

  const exportCsv = () => {
    if (!analyticsData?.table) return;
    const headers = ["ID", "Title", "Category", "Persona", "Total Views", "Total Likes", "Publish Count", "Created At"];
    const rows = analyticsData.table.map((row: AnalyticsTableRow) => [
      row.id,
      `"${row.title.replace(/"/g, '""')}"`,
      row.category,
      row.persona,
      row.totalViews,
      row.totalLikes,
      row.publishCount,
      new Date(row.createdAt).toLocaleDateString()
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r: (string | number)[]) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "vault_analytics.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading || isLoadingVideos) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-500 to-sky-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 border border-emerald-400/30">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-foreground tracking-tight">
                  Video Vault
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  4K MASTER ARCHIVE
                </span>
              </div>
              <p className="text-xs text-subtle font-normal mt-0.5">
                Review completed compositions, analyze broadcast metrics, and distribute multi-channel packages
                {totalVideos > 0 && (
                  <span className="ml-1.5 font-mono font-bold text-emerald-400">· {totalVideos} master files</span>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center bg-surface-raised/90 border border-border/80 p-0.5 rounded-xl">
            <button 
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === "grid" ? "bg-emerald-500 text-white shadow-sm font-bold" : "text-muted hover:text-foreground"}`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === "table" ? "bg-emerald-500 text-white shadow-sm font-bold" : "text-muted hover:text-foreground"}`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
            <button 
              onClick={() => {
                setViewMode("analytics");
                if (!analyticsData) fetchAnalytics();
              }}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === "analytics" ? "bg-emerald-500 text-white shadow-sm font-bold" : "text-muted hover:text-foreground"}`}
              title="Analytics"
            >
              <TrendingUp className="w-4 h-4" />
            </button>
          </div>
          
          <Link
            href="/brands"
            className="flex items-center gap-1.5 px-4 py-2 bg-surface-raised/90 hover:bg-white/[0.08] text-subtle hover:text-white border border-border/80 rounded-xl text-xs font-mono font-bold transition-all active:scale-95 self-start"
          >
            <Tv className="w-3.5 h-3.5 text-emerald-400" />
            <span>Connected Channels</span>
            <ChevronRight className="w-3.5 h-3.5 text-muted" />
          </Link>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2.5 rounded-2xl bg-surface-raised/80 border border-border/80">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search master compositions by title, YouTube metadata, or Instagram caption..."
            className="w-full bg-background/60 border border-border/60 rounded-xl pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Format / Aspect Ratio Filter */}
          <div className="flex items-center bg-background/60 border border-border/60 p-0.5 rounded-xl">
            <button
              type="button"
              onClick={() => setAspectRatioFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                aspectRatioFilter === "all"
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              All Formats
            </button>
            <button
              type="button"
              onClick={() => setAspectRatioFilter("vertical")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                aspectRatioFilter === "vertical"
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>9:16</span>
            </button>
            <button
              type="button"
              onClick={() => setAspectRatioFilter("horizontal")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                aspectRatioFilter === "horizontal"
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>16:9</span>
            </button>
          </div>

          {/* Sort Selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-background/60 border border-border/60 rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-emerald-500 cursor-pointer font-medium"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="views">Most Views</option>
            <option value="likes">Most Likes</option>
            <option value="duration">Longest Duration</option>
          </select>
        </div>
      </div>

      {videos.length === 0 ? (
        <div className="text-center py-24 border border-border/80 rounded-3xl max-w-md mx-auto p-10 glass-panel-raised flex flex-col items-center gap-3 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-border flex items-center justify-center text-emerald-400">
            <Film className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-black text-foreground tracking-tight">
              {search || aspectRatioFilter !== "all" ? "No Matching Videos" : "The Vault is Empty"}
            </h3>
            <p className="text-xs text-subtle mt-1 leading-relaxed font-normal">
              {search || aspectRatioFilter !== "all"
                ? "No video compositions match your search query or aspect ratio filter."
                : "Render a video in the Newsroom Control Center to archive your first broadcast master composition here."}
            </p>
          </div>
          {(search || aspectRatioFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setAspectRatioFilter("all");
              }}
              className="mt-2 px-4 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-colors cursor-pointer"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {videos.map((video) => (
            <Card key={video.id} className="overflow-hidden glass-panel-raised border border-border/80 rounded-3xl p-4 flex flex-col gap-4 shadow-xl hover:border-emerald-500/50 transition-all duration-300 relative group cursor-pointer" onClick={() => setSelectedVideo(video)}>
              
              {/* Output video preview or thumbnail */}
              {video.outputPath ? (
                <div
                  className={`relative w-full rounded-2xl overflow-hidden bg-black/80 border border-border/60 flex items-center justify-center ${
                    video.aspectRatio === "vertical"
                      ? "aspect-[9/16] max-h-[320px]"
                      : "aspect-video"
                  }`}
                >
                  {video.thumbnailPath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={video.thumbnailPath} alt="Thumbnail" className="w-full h-full object-cover" />
                  ) : (
                    <video src={video.outputPath} className="w-full h-full object-contain" preload="metadata" />
                  )}
                  
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="w-10 h-10 text-white drop-shadow-md" />
                  </div>

                  {/* Analytics overlay */}
                  {(video.totalViews || 0) > 0 && (
                    <Badge variant="accent" className="absolute bottom-3 left-3 bg-black/60 backdrop-blur font-bold flex items-center gap-1 text-[9px] border-none">
                      <Eye className="w-3 h-3" /> {(video.totalViews || 0).toLocaleString()}
                    </Badge>
                  )}
                  
                  <Badge variant="accent" className="absolute top-3 right-3 opacity-90 backdrop-blur font-bold tracking-widest text-[9px]">
                    {video.aspectRatio === "vertical" ? "9:16" : "16:9"}
                  </Badge>
                </div>
              ) : (
                <div
                  className={`relative bg-gradient-to-br from-background to-surface w-full ${
                    video.aspectRatio === "vertical"
                      ? "aspect-[9/16] max-h-[280px]"
                      : "aspect-video"
                  } rounded-2xl flex flex-col items-center justify-center border border-border/60`}
                >
                  <span className="text-4xl animate-pulse">🎬</span>
                  <span className="text-[10px] text-muted font-bold mt-2 uppercase">Processing...</span>
                </div>
              )}

              {/* Title & Origin Metadata */}
              <div className="space-y-1">
                <h3 className="text-sm font-black text-foreground line-clamp-2 leading-tight">
                  {video.story.title}
                </h3>
                
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-bold text-muted uppercase">
                  <span className="px-1.5 py-0.5 rounded bg-surface-overlay border border-border/40">
                    {video.story.feed.name}
                  </span>
                  <span>•</span>
                  <span>{video.duration ? `${video.duration}s` : "60s"}</span>
                </div>
              </div>

              {/* Publish Badges */}
              {video.publishes && video.publishes.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-background/50 border border-border/50">
                  {video.publishes.map((pub) => (
                    <span 
                      key={pub.id} 
                      className={`px-2 py-0.5 rounded text-[8px] font-bold tracking-wide uppercase border flex items-center gap-1 ${
                        pub.status === "PUBLISHED" 
                          ? "bg-success/15 border-success/30 text-success" 
                          : "bg-warning/15 border-warning/30 text-warning animate-pulse"
                      }`}
                      title={pub.status === "SCHEDULED" ? `Scheduled for ${pub.scheduledFor ? new Date(pub.scheduledFor).toLocaleString() : ""}` : "Published"}
                    >
                      {getPlatformIcon(pub.channel.platform)}
                      <span>{pub.channel.name}</span>
                    </span>
                  ))}
                </div>
              )}

              {/* Quick Actions */}
              {video.outputPath && (
                <div className="flex gap-2 mt-auto pt-2 border-t border-border/50">
                  <input 
                    id={`grid-file-${video.id}`}
                    type="file" 
                    accept="image/jpeg,image/png"
                    className="hidden" 
                    onChange={(e) => handleCustomThumbnail(e, video.id)}
                  />
                  <Button 
                    size="sm" 
                    variant="secondary" 
                    className="flex-1 text-[10px] h-7 px-2 bg-background/50 hover:bg-surface-overlay"
                    onClick={(e) => {
                      e.stopPropagation();
                      document.getElementById(`grid-file-${video.id}`)?.click();
                    }}
                  >
                    <Camera className="w-3 h-3 mr-1" /> Thumbnail
                  </Button>
                  <a 
                    href={video.outputPath} 
                    download
                    className="flex-1 text-[10px] h-7 px-2 bg-background/50 hover:bg-surface-overlay inline-flex items-center justify-center gap-2 font-medium rounded-lg cursor-pointer border border-border text-foreground"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-3 h-3 mr-1" /> Download
                  </a>
                </div>
              )}
            </Card>
          ))}
          <InfiniteScrollSentinel
            onIntersect={() => setSize(size + 1)}
            disabled={isReachingEnd || isLoadingMore}
            className="col-span-full h-1"
          />
        </div>
      ) : viewMode === "table" ? (
        <div className="bg-surface/30 border border-border/80 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-overlay border-b border-border text-[10px] uppercase font-bold text-muted tracking-wider">
                <tr>
                  <th className="px-4 py-3">Thumbnail</th>
                  <th className="px-4 py-3">Title / Story</th>
                  <th className="px-4 py-3 text-center">Duration</th>
                  <th className="px-4 py-3 text-center">Format</th>
                  <th className="px-4 py-3">Performance (Views)</th>
                  <th className="px-4 py-3 text-right">Channels</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {videos.map(video => (
                  <tr key={video.id} className="hover:bg-white/5 transition-colors cursor-pointer" onClick={() => setSelectedVideo(video)}>
                    <td className="px-4 py-3 w-16">
                      <div className="w-12 h-16 bg-black rounded-lg overflow-hidden flex items-center justify-center relative">
                        {video.thumbnailPath ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={video.thumbnailPath} alt="Thumb" className="w-full h-full object-cover" />
                        ) : video.outputPath ? (
                          <video src={video.outputPath} className="w-full h-full object-cover" preload="metadata" />
                        ) : (
                          <span className="text-[10px] text-muted">...</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-foreground line-clamp-2 max-w-sm">{video.story.title}</div>
                      <div className="text-[10px] text-muted mt-1">{new Date(video.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="px-4 py-3 text-center font-medium">
                      {video.duration ? `${video.duration}s` : "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="default" className="text-[9px] uppercase border bg-transparent text-muted">{video.aspectRatio}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 font-bold text-foreground">
                        <Eye className="w-3.5 h-3.5 text-muted" />
                        {(video.totalViews || 0).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {video.publishes?.map(pub => (
                          <div key={pub.id} className="w-6 h-6 rounded-full bg-surface-overlay flex items-center justify-center border border-border" title={`${pub.channel.name} - ${pub.status}`}>
                            {getPlatformIcon(pub.channel.platform)}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {video.outputPath && (
                        <div className="flex items-center justify-end gap-2">
                          <input 
                            id={`table-file-${video.id}`}
                            type="file" 
                            accept="image/jpeg,image/png"
                            className="hidden" 
                            onChange={(e) => handleCustomThumbnail(e, video.id)}
                          />
                          <Button 
                            size="sm" 
                            variant="secondary" 
                            className="text-[10px] h-7 px-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              document.getElementById(`table-file-${video.id}`)?.click();
                            }}
                          >
                            <Camera className="w-3 h-3" />
                          </Button>
                          <a 
                            href={video.outputPath} 
                            download
                            className="text-[10px] h-7 px-2 bg-surface-raised hover:bg-surface-overlay inline-flex items-center justify-center gap-2 font-medium rounded-lg cursor-pointer border border-border text-foreground"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <InfiniteScrollSentinel
            onIntersect={() => setSize(size + 1)}
            disabled={isReachingEnd || isLoadingMore}
            className="h-1"
          />
        </div>
      ) : viewMode === "analytics" && analyticsData ? (
        <div className="space-y-6 animate-in fade-in">
          {/* Best Performing Summaries */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="bg-surface/50 border border-border rounded-2xl p-5 backdrop-blur-sm">
              <span className="text-[10px] text-muted font-bold uppercase tracking-wider mb-2 block">Weekly Trend</span>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-black">{analyticsData.trend.recentViews.toLocaleString()}</span>
                {analyticsData.trend.percentChange !== 0 && (
                  <Badge variant={analyticsData.trend.percentChange > 0 ? "success" : "error"} className="mb-1 text-[10px]">
                    {analyticsData.trend.percentChange > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                    {Math.abs(analyticsData.trend.percentChange)}%
                  </Badge>
                )}
              </div>
            </div>
            <div className="bg-surface/50 border border-border rounded-2xl p-5 backdrop-blur-sm">
              <span className="text-[10px] text-muted font-bold uppercase tracking-wider mb-2 block">Best Category</span>
              <span className="text-xl font-bold text-accent">{analyticsData.bestPerforming.category}</span>
            </div>
            <div className="bg-surface/50 border border-border rounded-2xl p-5 backdrop-blur-sm">
              <span className="text-[10px] text-muted font-bold uppercase tracking-wider mb-2 block">Best Persona</span>
              <span className="text-xl font-bold text-pink-400 capitalize">{analyticsData.bestPerforming.persona}</span>
            </div>
            <div className="bg-surface/50 border border-border rounded-2xl p-5 backdrop-blur-sm">
              <span className="text-[10px] text-muted font-bold uppercase tracking-wider mb-2 block">Best Day</span>
              <span className="text-xl font-bold text-purple-400">{analyticsData.bestPerforming.dayOfWeek}</span>
            </div>
            <div className="bg-surface/50 border border-border rounded-2xl p-5 backdrop-blur-sm">
              <span className="text-[10px] text-muted font-bold uppercase tracking-wider mb-2 block">Best Time</span>
              <span className="text-xl font-bold text-emerald-400">
                {analyticsData.bestPerforming.timeOfDay}
              </span>
            </div>
          </div>

          {/* Performance Table */}
          <div className="bg-surface/30 border border-border/80 rounded-3xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <h3 className="text-sm font-bold text-foreground">Performance by Video</h3>
              <Button size="sm" variant="secondary" onClick={exportCsv}>
                <FileText className="w-4 h-4 mr-1.5" /> Exportar CSV
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-overlay border-b border-border text-[10px] uppercase font-bold text-muted tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Thumbnail</th>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Persona</th>
                    <th className="px-4 py-3 text-right">Total Views</th>
                    <th className="px-4 py-3 text-right">Likes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {analyticsData.table.map((row: AnalyticsTableRow) => (
                    <tr key={row.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 w-16">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={row.thumbnailPath} alt="Thumb" className="w-12 h-16 object-cover rounded-lg bg-black" />
                      </td>
                      <td className="px-4 py-3 font-bold line-clamp-2 max-w-xs">{row.title}</td>
                      <td className="px-4 py-3"><Badge variant="default" className="text-[9px] bg-transparent border-border">{row.category}</Badge></td>
                      <td className="px-4 py-3 capitalize">{row.persona}</td>
                      <td className="px-4 py-3 text-right font-black text-accent">{row.totalViews.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-medium">{row.totalLikes.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {/* 🎬 Detailed Video Drawer */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={(e) => {
          if (e.target === e.currentTarget) setSelectedVideo(null);
        }}>
          <div className="w-full max-w-xl h-full bg-background border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-surface/50">
              <h2 className="text-sm font-black flex items-center gap-2 text-foreground">
                <Info className="w-4 h-4 text-accent" /> Video Details
              </h2>
              <button 
                onClick={() => setSelectedVideo(null)}
                className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4 text-muted hover:text-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Player Section */}
              <div className="space-y-3">
                {selectedVideo.outputPath ? (
                  <div className={`relative bg-black rounded-2xl overflow-hidden border border-border/50 mx-auto ${selectedVideo.aspectRatio === "vertical" ? "w-[280px] aspect-[9/16]" : "w-full aspect-video"}`}>
                    <video 
                      id={`drawer-video-${selectedVideo.id}`}
                      src={selectedVideo.outputPath} 
                      controls 
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                   <div className="w-full aspect-video rounded-2xl border border-border bg-surface-overlay flex items-center justify-center">
                     <p className="text-muted text-xs font-bold">Video not processed yet.</p>
                   </div>
                )}
                
                {selectedVideo.outputPath && (
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      className="text-xs py-1"
                      onClick={() => {
                        const v = document.getElementById(`drawer-video-${selectedVideo.id}`) as HTMLVideoElement;
                        if (v) handleCaptureFrame(v, selectedVideo.id);
                      }}
                    >
                      <Camera className="w-3.5 h-3.5 mr-1.5" /> Capture Current Frame
                    </Button>
                    <input 
                      type="file" 
                      accept="image/jpeg,image/png"
                      ref={fileInputRef}
                      className="hidden" 
                      onChange={(e) => handleCustomThumbnail(e, selectedVideo.id)}
                    />
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      className="text-xs py-1"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Camera className="w-3.5 h-3.5 mr-1.5" /> Upload Thumbnail
                    </Button>
                    <Button 
                      size="sm" 
                      variant="secondary"  
                      className="text-xs py-1"
                    >
                      <a href={selectedVideo.outputPath} download className="flex items-center">
                        <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Download MP4
                      </a>
                    </Button>
                    <Button 
                      size="sm" 
                      variant="primary" 
                      className="text-xs py-1 px-4 shadow-accent/20"
                      onClick={() => handleOpenPublishModal(selectedVideo)}
                    >
                      <Tv className="w-3.5 h-3.5 mr-1.5" /> Publish
                    </Button>
                  </div>
                )}
              </div>

              {/* Analytics Section */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-subtle uppercase tracking-widest border-b border-border pb-1">Performance (Analytics)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-surface border border-border rounded-xl p-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                      <Eye className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted uppercase font-bold">Total Views</p>
                      <p className="text-lg font-black text-foreground">{(selectedVideo.totalViews || 0).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="bg-surface border border-border rounded-xl p-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-pink-500/10 flex items-center justify-center">
                      <ThumbsUp className="w-4 h-4 text-pink-500" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted uppercase font-bold">Total Likes</p>
                      <p className="text-lg font-black text-foreground">{(selectedVideo.totalLikes || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Zero-Trust Multimodal QA Gatekeeper */}
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-border pb-1">
                  <h3 className="text-xs font-bold text-subtle uppercase tracking-widest flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-cyan-400" />
                    Forensic QA Gatekeeper
                  </h3>
                  <span className="text-[9px] font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                    Gemini 2.5 Vision
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleAuditVaultVideo(selectedVideo)}
                  disabled={isAuditingQa}
                  className="w-full py-2.5 px-4 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50"
                >
                  <Shield className={`w-3.5 h-3.5 ${isAuditingQa ? "animate-pulse text-cyan-400" : ""}`} />
                  Run Zero-Trust Multimodal QA Audit
                </button>
              </div>

              {/* Publish History */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-subtle uppercase tracking-widest border-b border-border pb-1">Publish History</h3>
                {selectedVideo.publishes && selectedVideo.publishes.length > 0 ? (
                  <div className="space-y-2">
                    {selectedVideo.publishes.map(pub => (
                      <div key={pub.id} className="p-3 bg-surface border border-border rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-background">
                            {getPlatformIcon(pub.channel.platform)}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-foreground">{pub.channel.name}</p>
                            <p className="text-[9px] text-muted">
                              {pub.status === "PUBLISHED" ? `Published: ${new Date(pub.publishedAt!).toLocaleString()}` :
                               pub.status === "SCHEDULED" ? `Scheduled: ${pub.scheduledFor ? new Date(pub.scheduledFor).toLocaleString() : 'Pending'}` :
                               'Failed'}
                            </p>
                          </div>
                        </div>
                        {pub.status === "PUBLISHED" && (
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-foreground flex items-center gap-1 justify-end"><Eye className="w-3 h-3 text-muted"/> {pub.viewCount.toLocaleString()}</p>
                            <p className="text-[10px] font-bold text-foreground flex items-center gap-1 justify-end"><ThumbsUp className="w-3 h-3 text-muted"/> {pub.likeCount.toLocaleString()}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted">Not published to any channel yet.</p>
                )}
              </div>

              {/* Script Segments */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-subtle uppercase tracking-widest border-b border-border pb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-accent" /> Script Segments
                  {drawerSegments.length > 0 && (
                    <span className="text-[9px] font-black text-muted">({drawerSegments.length})</span>
                  )}
                </h3>
                {segmentsLoading ? (
                  <div className="flex items-center gap-2 text-muted text-xs py-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading segments...
                  </div>
                ) : drawerSegments.length > 0 ? (
                  <div className="space-y-1.5">
                    {drawerSegments.map((seg) => (
                      <div key={seg.id} className="flex gap-2.5 p-2.5 bg-surface border border-border rounded-xl">
                        <span className="text-[10px] font-black text-accent shrink-0 w-5 text-center">
                          {seg.index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] text-foreground leading-snug line-clamp-2">{seg.text}</p>
                          <div className="flex items-center gap-2 mt-1 text-[9px] text-muted">
                            {typeof seg.startTime === "number" && typeof seg.endTime === "number" && (
                              <span>{seg.startTime.toFixed(1)}s – {seg.endTime.toFixed(1)}s</span>
                            )}
                            {seg.assetType && (
                              <span className="px-1.5 py-0.5 rounded bg-background border border-border/40 uppercase font-bold">
                                {seg.assetType}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted">No segments available for this video.</p>
                )}
              </div>

              {/* Metadata Copy Section */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-subtle uppercase tracking-widest border-b border-border pb-1">Generated Metadata</h3>
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-background border border-border space-y-2 relative shadow-inner">
                    <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
                      <span className="text-[10px] font-bold text-foreground flex items-center gap-1.5">
                        <Tv className="w-4 h-4 text-red-500" /> YouTube Shorts
                      </span>
                      <button
                        onClick={() => {
                          const text = [
                            selectedVideo.youtubeTitle,
                            selectedVideo.youtubeDescription,
                            selectedVideo.youtubeTags ? `Tags: ${JSON.parse(selectedVideo.youtubeTags).join(", ")}` : "",
                          ].filter(Boolean).join("\n\n");
                          copyToClipboard(text);
                        }}
                        className="text-[9px] font-bold text-accent uppercase tracking-wider hover:underline cursor-pointer"
                      >
                        Copy
                      </button>
                    </div>
                    {selectedVideo.youtubeTitle && (
                      <div>
                        <p className="text-[9px] text-muted font-bold uppercase">Title</p>
                        <p className="text-xs text-foreground font-semibold">{selectedVideo.youtubeTitle}</p>
                      </div>
                    )}
                    {selectedVideo.youtubeDescription && (
                      <div>
                        <p className="text-[9px] text-muted font-bold uppercase">Description</p>
                        <p className="text-xs text-foreground font-semibold line-clamp-3 leading-relaxed">{selectedVideo.youtubeDescription}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 📢 Platform Publishing Modal (Unchanged Layout) */}
      {isPublishModalOpen && publishingVideo && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/60 z-[99999] flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-surface border border-border rounded-3xl p-6 md:p-8 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <span>📢</span> Publish and Distribute Video
              </h3>
              <button
                onClick={() => setIsPublishModalOpen(false)}
                className="text-muted hover:text-foreground text-sm cursor-pointer p-0.5"
              >
                ✕
              </button>
            </div>

            {channels.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-border/60 rounded-2xl p-6 flex flex-col items-center gap-2.5">
                <span className="text-2xl">📺</span>
                <p className="text-xs font-bold text-foreground">You have no distribution channels linked</p>
                <p className="text-[10px] text-muted leading-relaxed">To enable automated uploads, first connect your social networks.</p>
                <Link
                  href="/brands"
                  className="mt-1 px-4 py-2 bg-accent text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow cursor-pointer active:scale-95"
                >
                  Connect Channel
                </Link>
              </div>
            ) : (
              <form onSubmit={handlePublishSubmit} className="space-y-4">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Select Channel */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-subtle uppercase">Select Target Channel</label>
                    <select
                      value={selectedChannelId}
                      onChange={(e) => setSelectedChannelId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs text-foreground outline-none cursor-pointer"
                    >
                      {channels.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.platform.toUpperCase()} - {c.name} ({c.handle})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Select Visibility */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-subtle uppercase">Visibility / Privacy</label>
                    <select
                      value={publishVisibility}
                      onChange={(e) => setPublishVisibility(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs text-foreground outline-none cursor-pointer"
                    >
                      <option value="public">Public (Monetizable)</option>
                      <option value="unlisted">Unlisted</option>
                      <option value="private">Private</option>
                    </select>
                  </div>

                </div>

                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-subtle uppercase">Publication Title *</label>
                  <input
                    type="text"
                    required
                    value={publishTitle}
                    onChange={(e) => setPublishTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs text-foreground focus:border-accent outline-none"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-subtle uppercase">Description / Caption *</label>
                  <textarea
                    required
                    value={publishDescription}
                    onChange={(e) => setPublishDescription(e.target.value)}
                    rows={4}
                    className="w-full p-3.5 rounded-xl bg-background border border-border text-xs text-foreground focus:border-accent outline-none resize-none leading-relaxed"
                  />
                </div>

                {/* Scheduler (Optional) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-subtle uppercase flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-accent" /> Schedule deferred publishing (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={publishScheduledFor}
                    onChange={(e) => setPublishScheduledFor(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs text-foreground focus:border-accent outline-none cursor-pointer"
                  />
                  <p className="text-[9px] text-muted">Leave this field empty to publish immediately to the social network.</p>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-border mt-2">
                  <button
                    type="button"
                    onClick={() => setIsPublishModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 border border-border hover:bg-white/10 text-xs font-semibold text-subtle cursor-pointer active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPublishing}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-lg active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isPublishing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>{publishScheduledFor ? "Schedule Publication" : "Distribute Now 🚀"}</span>
                  </button>
                </div>

              </form>
            )}

          </div>
        </div>
      )}

      {/* Zero-Trust Multimodal Forensic QA Modal */}
      <ForensicQaModal
        isOpen={qaModalOpen}
        onClose={() => setQaModalOpen(false)}
        report={qaReport}
        isLoading={isAuditingQa}
        onReaudit={() => {
          if (selectedVideo) handleAuditVaultVideo(selectedVideo);
        }}
        onApprove={() => {
          setQaModalOpen(false);
          toast("Video Certified", "Quality assurance passed and video certified for public distribution!", "success");
        }}
      />

    </div>
  );
}
