"use client";

import { useToast } from "@/components/global/ToastContainer";
import { BroadcastHeroHUD } from "@/components/newsroom/BroadcastHeroHUD";
import type { StoryModalData } from "@/components/newsroom/NewsPreProductionModal";
import { StoryCardGrid } from "@/components/newsroom/StoryCardGrid";
import { SortOption,StoryFilterBar } from "@/components/newsroom/StoryFilterBar";
import { useInfiniteList } from "@/lib/hooks/useInfiniteList";
import { usePolling } from "@/lib/hooks/usePolling";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback,useEffect,useState } from "react";
import useSWR from "swr";

const StoryKanbanBoard = dynamic(
  () => import("@/components/newsroom/StoryKanbanBoard").then((mod) => mod.StoryKanbanBoard),
  { ssr: false }
);

const ArticleDrawer = dynamic(
  () => import("@/components/newsroom/ArticleDrawer").then((mod) => mod.ArticleDrawer),
  { ssr: false }
);

const NewsPreProductionModal = dynamic(
  () => import("@/components/newsroom/NewsPreProductionModal").then((mod) => mod.NewsPreProductionModal),
  { ssr: false }
);

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Feed {
  id: string;
  name: string;
  url: string;
  isActive: boolean;
  _count?: { stories: number };
}

interface Brand {
  id: string;
  name: string;
  rssGroups: Array<{
    feeds: Array<{ id: string }>;
  }>;
}

interface Story {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  pubDate?: string | null;
  author?: string | null;
  link: string;
  feed: { id?: string; name: string };
  category?: string | null;
  approvalStatus?: string;
  script?: { 
    id: string; 
    headline: string;
    segments: Array<{ id: string; index: number; text: string; assetPath: string | null; assetType?: string | null; personaId: string | null }>;
  } | null;
  video?: { 
    id: string; 
    status: string; 
    outputPath?: string | null;
    bgMusicPath?: string | null;
    bgMusic?: { name: string; mood: string } | null;
  } | null;
  articleImageUrls?: string | null;
  errorLog?: string | null;
}

export default function DashboardPage() {
  const { toast } = useToast();
  
  // Filter States
  const [filterBrand, setFilterBrand] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterApproval, setFilterApproval] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>(SortOption.Date);
  const [viewMode, setViewMode] = useState<"grid" | "table" | "kanban">("grid");

  // Selection & Actions
  const [selectedStoryIds, setSelectedStoryIds] = useState<Set<string>>(new Set());
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [_viewingAssetsStory, setViewingAssetsStory] = useState<Story | null>(null);
  const [isIngesting, setIsIngesting] = useState(false);
  const [isBatchScripting, setIsBatchScripting] = useState(false);
  const [preProductionStory, setPreProductionStory] = useState<Story | null>(null);

  // Debounce search input
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350);
    return () => clearTimeout(handle);
  }, [searchQuery]);

  // Load Feeds & Brands
  const { data: feedsData, mutate: _mutateFeeds } = useSWR<{ data?: Feed[]; feeds?: Feed[] }>(
    "/api/feeds?limit=500&lite=true",
    fetcher
  );
  const { data: brandsData } = useSWR<{ data?: Brand[]; brands?: Brand[] }>(
    "/api/brands?limit=500&lite=true",
    fetcher
  );

  // Server-driven infinite list of stories
  const {
    items: stories,
    total: totalStories,
    setSize,
    size,
    isReachingEnd,
    isLoadingMore,
    mutate: mutateStories,
  } = useInfiniteList<Story>("/api/stories", {
    limit: 30,
    filters: {
      q: debouncedSearch || undefined,
      brandId: filterBrand !== "all" ? filterBrand : undefined,
      status: filterStatus !== "all" ? filterStatus : undefined,
      category: filterCategory !== "all" ? filterCategory : undefined,
      approvalStatus: filterApproval !== "all" ? filterApproval : undefined,
      sortBy: sortBy,
    },
  });

  const _feeds = feedsData?.data ?? feedsData?.feeds ?? [];
  const brands = brandsData?.data ?? brandsData?.brands ?? [];

  // Polling
  const { enabled: pollingEnabled, interval: pollingInterval } = usePolling();

  const fetchData = useCallback(async () => {
    mutateStories();
  }, [mutateStories]);

  useEffect(() => {
    if (!pollingEnabled) return;
    const interval = setInterval(fetchData, pollingInterval * 1000);
    return () => clearInterval(interval);
  }, [fetchData, pollingEnabled, pollingInterval]);

  // Action Handlers
  const handleIngestNow = async () => {
    setIsIngesting(true);
    try {
      const res = await fetch("/api/ingest", { method: "POST" });
      if (res.ok) {
        toast("Success", "RSS Ingestion started in background...", "success");
      } else {
        toast("Error", "Could not trigger ingestion", "error");
      }
      setTimeout(fetchData, 3000);
    } catch {
      toast("Error", "Connection error", "error");
    } finally {
      setIsIngesting(false);
    }
  };

  const handleGenerateScript = (storyId: string) => {
    const target = stories.find((s) => s.id === storyId);
    if (target) {
      setPreProductionStory(target);
    }
  };

  const handleSendToProduction = async (storyId: string) => {
    try {
      const res = await fetch(`/api/stories/${storyId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send-to-production" }),
      });
      if (res.ok) {
        toast("Success", "Dispatched FSM story synthesis job to pipeline!", "success");
      } else {
        toast("Error", "Could not dispatch production job", "error");
      }
      setTimeout(fetchData, 2000);
    } catch {
      toast("Error", "Connection error", "error");
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    if (!confirm("Are you sure you want to delete this story?")) return;
    try {
      const res = await fetch(`/api/stories/${storyId}`, { method: "DELETE" });
      if (res.ok) {
        toast("Success", "Story deleted successfully", "success");
        mutateStories();
      } else {
        toast("Error", "Could not delete story", "error");
      }
    } catch {
      toast("Error", "Connection error", "error");
    }
  };

  const handleBatchScript = async () => {
    const unscripted = stories.filter((s) => s.status === "INGESTED");
    if (unscripted.length === 0) {
      toast("Info", "All stories already have scripts generated.", "info");
      return;
    }

    setIsBatchScripting(true);
    try {
      await Promise.all(
        unscripted.slice(0, 5).map((s) =>
          fetch(`/api/stories/${s.id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "generate-script" }),
          })
        )
      );
      toast("Success", `Started script synthesis for ${Math.min(5, unscripted.length)} stories.`, "success");
      setTimeout(fetchData, 2500);
    } catch {
      toast("Error", "Batch script synthesis failed", "error");
    } finally {
      setIsBatchScripting(false);
    }
  };

  const toggleStorySelection = (storyId: string) => {
    setSelectedStoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(storyId)) next.delete(storyId);
      else next.add(storyId);
      return next;
    });
  };

  const handleBatchDelete = async () => {
    if (selectedStoryIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedStoryIds.size} selected stories?`)) return;

    try {
      await Promise.all(
        Array.from(selectedStoryIds).map((id) => fetch(`/api/stories/${id}`, { method: "DELETE" }))
      );
      toast("Success", `Deleted ${selectedStoryIds.size} stories.`, "success");
      setSelectedStoryIds(new Set());
      fetchData();
    } catch {
      toast("Error", "Batch delete failed", "error");
    }
  };

  // Filtered stories directly from server-driven query
  const filteredStories = stories;

  // Calculate Pipeline Counts
  const queueStats = {
    pendingCount: stories.filter((s) => s.status === "INGESTED").length,
    processingCount: stories.filter((s) => s.status === "RENDERING" || s.status === "SCRIPTING").length,
    completedCount: stories.filter((s) => s.status === "COMPLETED").length,
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-8 lg:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Modern Broadcast Hero HUD */}
        <BroadcastHeroHUD
          queueStats={queueStats}
          totalStories={totalStories}
          isIngesting={isIngesting}
          onIngestNow={handleIngestNow}
          onBatchScript={handleBatchScript}
          isBatchScripting={isBatchScripting}
        />

        {/* Filter & View Mode Controls Bar */}
        <StoryFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedCategory={filterCategory}
          onCategoryChange={setFilterCategory}
          selectedApproval={filterApproval}
          onApprovalChange={setFilterApproval}
          selectedStatus={filterStatus}
          onStatusChange={setFilterStatus}
          selectedBrand={filterBrand}
          onBrandChange={setFilterBrand}
          brands={brands}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          sortBy={sortBy}
          onSortChange={setSortBy}
          selectedCount={selectedStoryIds.size}
          onBatchDelete={handleBatchDelete}
        />

        {/* Dynamic Views: Grid / Kanban / Table */}
        {viewMode === "kanban" ? (
          <StoryKanbanBoard
            stories={filteredStories}
            onGenerateScript={handleGenerateScript}
            onSendToProduction={handleSendToProduction}
            onDeleteStory={handleDeleteStory}
            selectedStoryIds={selectedStoryIds}
            onToggleSelection={toggleStorySelection}
            onSelectStory={(id) => setSelectedStoryId(id)}
            onViewAssets={(story) => setViewingAssetsStory(story)}
          />
        ) : viewMode === "table" ? (
          <div className="overflow-x-auto rounded-2xl border border-border/60 bg-surface/40 backdrop-blur-md shadow-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/80 bg-white/[0.02] text-xs font-bold text-muted uppercase tracking-wider">
                  <th className="py-3.5 px-4">Title / Headline</th>
                  <th className="py-3.5 px-4">Source</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-xs font-medium">
                {filteredStories.map((story) => (
                  <tr key={story.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-foreground hover:text-accent cursor-pointer line-clamp-1" onClick={() => setSelectedStoryId(story.id)}>
                        {story.title}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-muted font-mono">{story.feed.name}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-white/5 border border-white/10">
                        {story.category || "General"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-[11px] font-bold text-accent">{story.status}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {story.script && (
                          <Link
                            href={`/editor/${story.id}`}
                            prefetch={false}
                            className="px-2.5 py-1 rounded-lg bg-accent text-white font-bold text-[11px] hover:bg-accent-hover transition-colors"
                          >
                            Editor →
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <StoryCardGrid
            stories={filteredStories}
            onGenerateScript={handleGenerateScript}
            onSendToProduction={handleSendToProduction}
            onDeleteStory={handleDeleteStory}
            selectedStoryIds={selectedStoryIds}
            onToggleSelection={toggleStorySelection}
            onSelectStory={(id) => setSelectedStoryId(id)}
            onViewAssets={(story) => setViewingAssetsStory(story)}
            isLoadingMore={isLoadingMore}
            isReachingEnd={isReachingEnd}
            onLoadMore={() => setSize(size + 1)}
          />
        )}

        {/* Article Drawer Preview */}
        {selectedStoryId && (
          <ArticleDrawer
            storyId={selectedStoryId}
            onClose={() => setSelectedStoryId(null)}
          />
        )}

        {/* Pre-Production Control Room Modal */}
        <NewsPreProductionModal
          isOpen={!!preProductionStory}
          onClose={() => setPreProductionStory(null)}
          story={preProductionStory as unknown as StoryModalData}
          onApproveSuccess={() => {
            fetchData();
          }}
        />
      </div>
    </div>
  );
}
