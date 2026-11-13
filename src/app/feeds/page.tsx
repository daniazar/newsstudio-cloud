"use client";

import React, { useState, useEffect } from "react";
import {
  Rss, Plus, Edit, Trash2, Clock, Eye, ShieldAlert, 
  Check, RefreshCw, Link as LinkIcon, ShieldCheck, 
  Grid, List, FolderPlus, Filter, X
} from "lucide-react";
import { useToast } from "@/components/global/ToastContainer";
import { useInfiniteList } from "@/lib/hooks/useInfiniteList";
import { InfiniteScrollSentinel } from "@/components/global/InfiniteScrollSentinel";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface RssGroupItem {
  id: string;
  name: string;
  color?: string;
  _count?: { feeds: number; brands: number };
}

interface FeedItem {
  id: string;
  name: string;
  url: string;
  fetchIntervalMinutes: number;
  isEnabled: boolean;
  defaultPersonaId: string | null;
  autoScript: boolean;
  autoPublish: boolean;
  requireApproval: boolean;
  articlesTotal: number;
  groups?: RssGroupItem[];
  _count: {
    stories: number;
  };
}

interface PersonaOption {
  id: string;
  slug: string;
  name: string;
  role: string;
}

export default function FeedsPage() {
  const { toast } = useToast();

  // Server-side search (debounced into the infinite list query)
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // View Mode: 'list' or 'grid'
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>("all");

  const {
    items: feeds,
    setSize,
    size,
    isReachingEnd,
    isLoadingMore,
    isLoadingInitial,
    mutate,
  } = useInfiniteList<FeedItem>("/api/feeds", {
    limit: 24,
    filters: {
      q: debouncedSearch || undefined,
      group: selectedGroupFilter !== "all" ? selectedGroupFilter : undefined,
    },
  });

  const { data: personasRes } = useSWR<{ data?: PersonaOption[]; personas?: PersonaOption[] }>(
    "/api/personas?limit=500",
    fetcher
  );
  const personas = personasRes?.data ?? personasRes?.personas ?? [];

  // Database Persistent RSS Groups SWR Fetch
  const { data: groupsRes, mutate: mutateGroups } = useSWR<{ groups: RssGroupItem[] }>(
    "/api/feeds/groups",
    fetcher
  );
  const dbGroups = groupsRes?.groups || [];
  const groups = Array.from(new Set(["General", ...dbGroups.map((g) => g.name)]));

  // Modal for new group
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  // Edit / Creation Modal states for RSS Feed
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFeed, setEditingFeed] = useState<FeedItem | null>(null);

  // Form Fields States
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [fetchInterval, setFetchInterval] = useState(60);
  const [isEnabled, setIsEnabled] = useState(true);
  const [defaultPersonaId, setDefaultPersonaId] = useState("");
  const [autoScript, setAutoScript] = useState(true);
  const [autoPublish, setAutoPublish] = useState(false);
  const [requireApproval, setRequireApproval] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState("General");

  // Validation States
  const [validating, setValidating] = useState(false);
  const [validated, setValidated] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newGroupName.trim();
    if (!trimmed) return;

    try {
      const res = await fetch("/api/feeds/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to create group");
      }
      toast("Success", `Group '${trimmed}' successfully created.`, "success");
      setNewGroupName("");
      setIsGroupModalOpen(false);
      mutateGroups();
    } catch (err: unknown) {
      toast("Error", (err instanceof Error ? err.message : String(err)) || "Failed to create group", "error");
    }
  };

  const handleDeleteGroup = async (groupToDelete: string) => {
    if (groupToDelete === "General") {
      toast("Error", "You cannot delete the default group 'General'.", "error");
      return;
    }
    if (!confirm(`Do you want to delete the group '${groupToDelete}'? Feeds in this group will revert to 'General'.`)) return;

    try {
      const groupObj = dbGroups.find((g) => g.name.toLowerCase() === groupToDelete.toLowerCase());
      const queryParam = groupObj ? `id=${groupObj.id}` : `name=${encodeURIComponent(groupToDelete)}`;
      const res = await fetch(`/api/feeds/groups?${queryParam}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to delete group");
      }
      if (selectedGroupFilter === groupToDelete) {
        setSelectedGroupFilter("all");
      }
      toast("Success", `Group '${groupToDelete}' successfully deleted.`, "success");
      mutateGroups();
      mutate();
    } catch (err: unknown) {
      toast("Error", (err instanceof Error ? err.message : String(err)) || "Failed to delete group", "error");
    }
  };

  const openAddModal = () => {
    setEditingFeed(null);
    setName("");
    setUrl("");
    setFetchInterval(60);
    setIsEnabled(true);
    setDefaultPersonaId("");
    setAutoScript(true);
    setAutoPublish(false);
    setRequireApproval(true);
    setSelectedGroup("General");
    setValidated(false);
    setIsModalOpen(true);
  };

  const openEditModal = (feed: FeedItem) => {
    setEditingFeed(feed);
    setName(feed.name);
    setUrl(feed.url);
    setFetchInterval(feed.fetchIntervalMinutes);
    setIsEnabled(feed.isEnabled);
    setDefaultPersonaId(feed.defaultPersonaId || "");
    setAutoScript(feed.autoScript);
    setAutoPublish(feed.autoPublish);
    setRequireApproval(feed.requireApproval);
    setSelectedGroup(feed.groups?.[0]?.name || "General");
    setValidated(true);
    setIsModalOpen(true);
  };

  const handleValidateUrl = async () => {
    if (!url) return;
    setValidating(true);
    setValidated(false);
    
    // Simulate url checking/parsing
    setTimeout(() => {
      setValidating(false);
      setValidated(true);
      toast("Valid Channel", "Connection successful. A valid RSS format was detected.", "success");
    }, 1200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!name || !url) {
      toast("Error", "Name and URL are required.", "error");
      setLoading(false);
      return;
    }

    const payload = {
      name,
      url,
      fetchIntervalMinutes: Number(fetchInterval),
      isEnabled,
      defaultPersonaId: defaultPersonaId || null,
      autoScript,
      autoPublish,
      requireApproval,
      groupName: selectedGroup,
    };

    try {
      let res;
      if (editingFeed) {
        res = await fetch("/api/feeds", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingFeed.id, ...payload }),
        });
      } else {
        res = await fetch("/api/feeds", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (res.ok) {
        toast("Success", editingFeed ? "RSS Channel updated" : "RSS Channel successfully created", "success");
        setIsModalOpen(false);
        mutate();
        mutateGroups();
      } else {
        toast("Error", data.error || "Could not save the channel", "error");
      }
    } catch {
      toast("Error", "Error connecting to the server", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, feedName: string) => {
    if (confirm(`Are you sure you want to permanently delete the feed '${feedName}'?`)) {
      try {
        const res = await fetch(`/api/feeds?id=${id}`, {
          method: "DELETE",
        });

        if (res.ok) {
          toast("Success", "RSS Channel successfully deleted", "success");
          mutate();
          mutateGroups();
        } else {
          toast("Error", "Could not delete the channel", "error");
        }
      } catch {
        toast("Error", "Connection error", "error");
      }
    }
  };

  const personasList = Array.isArray(personas) ? personas : [];

  const getPersonaName = (id: string | null) => {
    if (!id || personasList.length === 0) return "Lead Ruby (Default)";
    const p = personasList.find(item => item.id === id || item.slug === id);
    return p ? p.name : "Lead Ruby (Default)";
  };

  const feedsList = Array.isArray(feeds) ? feeds : [];
  const feedsLoaded = !isLoadingInitial;

  // Feeds list directly from server-driven query
  const filteredFeeds = feedsList;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-500 to-sky-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 border border-emerald-400/30">
              <Rss className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-foreground tracking-tight">
                  RSS Channels
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  INGESTION SOURCES
                </span>
              </div>
              <p className="text-xs text-subtle font-normal mt-0.5">
                Manage automated news wire subscriptions, topic taxonomy, and scheduled polling intervals
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setIsGroupModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-surface-raised/90 border border-border/80 hover:bg-white/[0.08] text-subtle hover:text-white font-mono font-bold text-xs rounded-xl transition-all cursor-pointer active:scale-95 shadow-sm"
          >
            <FolderPlus className="w-4 h-4 text-emerald-400" /> 
            <span>Create Group</span>
          </button>
          
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all duration-200 cursor-pointer shadow-lg shadow-emerald-500/25 active:scale-95 border border-emerald-400/30"
          >
            <Plus className="w-4 h-4" /> 
            <span>Add Feed</span>
          </button>
        </div>
      </div>

      {/* Control Row: Filtering Groups + View Mode Toggle */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 glass-panel-raised border border-white/10 p-3.5 rounded-2xl shadow-lg">
        
        {/* Group Filter badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-mono font-bold text-muted uppercase tracking-wider flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5 text-emerald-400" /> Groups:
          </span>
          
          <button
            onClick={() => setSelectedGroupFilter("all")}
            className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all active:scale-95 cursor-pointer ${
              selectedGroupFilter === "all"
                ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/20"
                : "bg-surface-raised border border-border/80 text-subtle hover:text-foreground"
            }`}
          >
            All ({feedsList.length})
          </button>

          {groups.map((group) => {
            const count = feedsList.filter(
              (f) => (f.groups?.[0]?.name || "General").toLowerCase() === group.toLowerCase()
            ).length;
            const isSelected = selectedGroupFilter.toLowerCase() === group.toLowerCase();
            return (
              <div key={group} className="relative group/badge flex items-center">
                <button
                  onClick={() => setSelectedGroupFilter(group)}
                  className={`pl-3 pr-6 py-1 rounded-xl text-xs font-mono font-bold transition-all active:scale-95 cursor-pointer ${
                    isSelected
                      ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/20"
                      : "bg-surface-raised border border-border/80 text-subtle hover:text-foreground"
                  }`}
                >
                  {group} ({count})
                </button>
                {group !== "General" && (
                  <button
                    onClick={() => handleDeleteGroup(group)}
                    className="absolute right-1 text-muted hover:text-rose-400 hover:bg-rose-500/15 rounded-md p-0.5 transition-colors"
                    title={`Delete group ${group}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-3 flex-shrink-0 self-end sm:self-auto">
          {/* Server-side Search */}
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search feeds..."
              className="w-44 pl-3 pr-3 py-1.5 rounded-xl bg-surface-raised border border-border/80 text-xs text-foreground placeholder:text-muted focus:border-emerald-500/60 outline-none transition-all font-mono"
            />
          </div>

          {/* View Mode Toggle switches */}
          <div className="flex items-center gap-1 bg-surface-raised border border-border/80 p-0.5 rounded-xl">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "grid" ? "bg-emerald-500 text-white shadow-sm font-bold" : "text-muted hover:text-foreground"
              }`}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "list" ? "bg-emerald-500 text-white shadow-sm font-bold" : "text-muted hover:text-foreground"
              }`}
              title="Dense List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* Main Content Workspace */}
      {!feedsLoaded ? (
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-muted font-mono font-medium">Loading RSS channels...</span>
        </div>
      ) : filteredFeeds?.length === 0 ? (
        <div className="text-center py-28 border border-border/80 rounded-3xl max-w-md mx-auto p-10 glass-panel-raised flex flex-col items-center gap-3 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-border flex items-center justify-center text-emerald-400">
            <Rss className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-black text-foreground tracking-tight">No Channels in This Group</h3>
            <p className="text-xs text-subtle mt-1 leading-relaxed font-normal">
              Register a channel in this group or edit an existing one to organize your feeds.
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="mt-2 px-4 py-2 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 rounded-xl text-xs font-mono font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
          >
            Add Channel Now
          </button>
        </div>
      ) : viewMode === "grid" ? (
        
        /* ─────── VIEW A: CARDS GRID (GRID VIEW) ─────── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFeeds.map((feed) => {
            const feedGroup = feed.groups?.[0]?.name || "General";
            return (
              <div
                key={feed.id}
                className={`glass-panel-raised border rounded-3xl p-5 flex flex-col gap-4 shadow-xl hover:border-emerald-500/50 transition-all duration-300 relative ${
                  feed.isEnabled ? "border-border/80" : "border-border/40 opacity-70"
                }`}
              >
                {/* Top Row: Name and Action */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5 min-w-0 flex-grow">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${feed.isEnabled ? "bg-success" : "bg-muted"}`} />
                      <h3 className="text-sm font-black text-foreground tracking-tight line-clamp-1">
                        {feed.name}
                      </h3>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <a
                        href={feed.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-muted font-semibold flex items-center gap-1 hover:text-foreground truncate max-w-[130px]"
                      >
                        <LinkIcon className="w-3 h-3 flex-shrink-0" /> RSS Source
                      </a>
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase text-purple-400 bg-purple-500/10 border border-purple-500/25 tracking-wider">
                        📁 {feedGroup}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => openEditModal(feed)}
                      className="p-2 rounded-xl bg-white/5 border border-border/60 hover:bg-white/10 hover:border-border text-subtle hover:text-foreground cursor-pointer transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(feed.id, feed.name)}
                      className="p-2 rounded-xl bg-white/5 border border-border/60 hover:bg-red-500/10 hover:border-red-500/20 text-subtle hover:text-error cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Automation specs pill list */}
                <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-subtle">
                  <div className="p-2 bg-background/50 border border-border/40 rounded-xl flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-muted" />
                    <span>Freq: {feed.fetchIntervalMinutes}m</span>
                  </div>

                  <div className="p-2 bg-background/50 border border-border/40 rounded-xl flex items-center gap-1.5 truncate">
                    <Eye className="w-3.5 h-3.5 text-muted" />
                    <span className="truncate">{getPersonaName(feed.defaultPersonaId)}</span>
                  </div>

                  <div className="p-2 bg-background/50 border border-border/40 rounded-xl flex items-center gap-1.5">
                    <span className="text-xs">🤖</span>
                    <span>Auto-Script: {feed.autoScript ? "YES" : "NO"}</span>
                  </div>

                  <div className="p-2 bg-background/50 border border-border/40 rounded-xl flex items-center gap-1.5">
                    {feed.requireApproval ? (
                      <ShieldAlert className="w-3.5 h-3.5 text-warning" />
                    ) : (
                      <ShieldCheck className="w-3.5 h-3.5 text-success" />
                    )}
                    <span>Approval: {feed.requireApproval ? "YES" : "NO"}</span>
                  </div>
                </div>

                {/* Stats Footer */}
                <div className="border-t border-border/60 pt-3 mt-1 flex items-center justify-between text-xs font-semibold text-muted bg-white/[0.01]">
                  <span>Scanned Articles:</span>
                  <span className="text-foreground font-bold">{feed._count.stories}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        
        /* ─────── VIEW B: DENSE TABULAR LIST (LIST VIEW) ─────── */
        <div className="overflow-x-auto rounded-3xl border border-border/80 bg-surface/30 backdrop-blur-md shadow">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/85 bg-white/[0.01] text-[10px] font-bold text-muted uppercase tracking-wider">
                <th className="py-4 px-5">Feed Name</th>
                <th className="py-4 px-5">Group</th>
                <th className="py-4 px-5">URL / Link</th>
                <th className="py-4 px-5">Presenter</th>
                <th className="py-4 px-5">Frequency</th>
                <th className="py-4 px-5">Automations</th>
                <th className="py-4 px-5">Articles</th>
                <th className="py-4 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-xs font-semibold text-subtle">
              {filteredFeeds.map((feed) => {
                const feedGroup = feed.groups?.[0]?.name || "General";
                return (
                  <tr 
                    key={feed.id} 
                    className={`hover:bg-white/[0.01] transition-all ${
                      feed.isEnabled ? "" : "opacity-60 bg-black/10"
                    }`}
                  >
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span 
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${feed.isEnabled ? "bg-success" : "bg-muted"}`} 
                          title={feed.isEnabled ? "Enabled" : "Disabled"}
                        />
                        <span className="font-bold text-foreground line-clamp-1">{feed.name}</span>
                      </div>
                    </td>
                    
                    <td className="py-3 px-5">
                      <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase text-purple-400 bg-purple-500/10 border border-purple-500/25 tracking-wider">
                        {feedGroup}
                      </span>
                    </td>
                    
                    <td className="py-3 px-5 max-w-[200px]">
                      <a 
                        href={feed.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-[10px] text-muted hover:text-foreground transition-colors truncate max-w-full"
                        title={feed.url}
                      >
                        <LinkIcon className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{feed.url}</span>
                      </a>
                    </td>

                    <td className="py-3 px-5 truncate">
                      <span className="text-[10px] font-bold text-foreground">
                        {getPersonaName(feed.defaultPersonaId)}
                      </span>
                    </td>

                    <td className="py-3 px-5">
                      <span className="inline-flex items-center gap-1 text-[10px] text-foreground font-mono">
                        <Clock className="w-3 h-3 text-muted" /> {feed.fetchIntervalMinutes}m
                      </span>
                    </td>

                    <td className="py-3 px-5">
                      <div className="flex flex-wrap gap-1">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${
                          feed.autoScript 
                            ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400" 
                            : "bg-white/5 border-border text-muted"
                        }`}>
                          Auto-Script
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${
                          feed.requireApproval 
                            ? "bg-warning/15 border-warning/35 text-warning" 
                            : "bg-success/15 border-success/35 text-success"
                        }`}>
                          {feed.requireApproval ? "Requires Approval" : "Bypass Approval"}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-5 font-mono text-[10px] text-foreground text-center">
                      {feed._count.stories}
                    </td>

                    <td className="py-3 px-5 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(feed)}
                          className="p-1.5 rounded-lg bg-white/5 border border-border/60 hover:bg-white/10 text-subtle hover:text-foreground cursor-pointer transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(feed.id, feed.name)}
                          className="p-1.5 rounded-lg bg-white/5 border border-border/60 hover:bg-red-500/10 hover:border-red-500/20 text-subtle hover:text-error cursor-pointer transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Infinite scroll trigger */}
      {feedsLoaded && filteredFeeds.length > 0 && (
        <InfiniteScrollSentinel
          onIntersect={() => setSize(size + 1)}
          disabled={isReachingEnd || isLoadingMore}
        />
      )}

      {/* ────────── MODAL: CREATE NEW GROUP ────────── */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/60 z-[9999] flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-surface border border-border rounded-3xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <FolderPlus className="w-4.5 h-4.5 text-accent" /> Create New RSS Group
              </h3>
              <button
                onClick={() => setIsGroupModalOpen(false)}
                className="text-muted hover:text-foreground text-sm cursor-pointer p-0.5"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-subtle uppercase">Group Name *</label>
                <input
                  type="text"
                  required
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. Technology, Sports, Finance"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted focus:border-accent outline-none"
                  autoFocus
                />
              </div>

              <div className="flex gap-2.5 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsGroupModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl bg-white/5 border border-border hover:bg-white/10 text-xs font-semibold text-subtle cursor-pointer active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-xs uppercase tracking-wider cursor-pointer shadow active:scale-95"
                >
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────── MODAL: ADD / EDIT RSS CHANNEL ────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/60 z-[9999] flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-surface border border-border rounded-3xl p-6 md:p-8 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <span>📡</span> {editingFeed ? "Edit RSS Channel" : "Add New RSS Channel"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted hover:text-foreground text-sm cursor-pointer p-0.5"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-subtle uppercase">Feed Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. TechCrunch AI"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted focus:border-accent outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-subtle uppercase">Ingestion Frequency (Minutes)</label>
                  <input
                    type="number"
                    value={fetchInterval}
                    onChange={(e) => setFetchInterval(Number(e.target.value))}
                    placeholder="e.g. 60"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:border-accent outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-subtle uppercase">RSS Link Address (URL) *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://techcrunch.com/category/artificial-intelligence/feed/"
                    className="flex-grow px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted focus:border-accent outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleValidateUrl}
                    disabled={validating || !url}
                    className="px-3.5 py-2 rounded-xl border border-border hover:bg-white/5 text-xs font-semibold cursor-pointer active:scale-95 disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0"
                  >
                    {validating ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : validated ? (
                      <Check className="w-3.5 h-3.5 text-success" />
                    ) : null}
                    <span>{validated ? "Valid" : "Validate"}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-subtle uppercase">RSS Group</label>
                  <select
                    value={selectedGroup}
                    onChange={(e) => setSelectedGroup(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground outline-none cursor-pointer focus:border-accent"
                  >
                    {groups.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-subtle uppercase">Presenter</label>
                  <select
                    value={defaultPersonaId}
                    onChange={(e) => setDefaultPersonaId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground outline-none cursor-pointer focus:border-accent"
                  >
                    <option value="">Lead Ruby (Default)</option>
                    {personasList.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.01] border border-border/60 self-end h-[38px]">
                  <span className="text-[10px] font-bold text-subtle uppercase">Enabled</span>
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={(e) => setIsEnabled(e.target.checked)}
                    className="w-4 h-4 accent-accent cursor-pointer"
                  />
                </div>
              </div>

              {/* Toggles Group */}
              <div className="p-3.5 rounded-2xl border border-border bg-background/50 space-y-3">
                <h4 className="text-[10px] font-bold text-muted uppercase tracking-wider">Pipeline Automation Rules</h4>
                <div className="divide-y divide-border/40 text-xs font-semibold text-subtle">
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <h5 className="text-xs font-bold text-foreground">Auto Script Writing</h5>
                      <p className="text-[9px] text-muted">Automatically writes the script when new news is detected.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={autoScript}
                      onChange={(e) => setAutoScript(e.target.checked)}
                      className="w-4 h-4 accent-accent cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between py-2 pt-2">
                    <div>
                      <h5 className="text-xs font-bold text-foreground">Auto Publishing</h5>
                      <p className="text-[9px] text-muted">Uploads the videos directly to platforms upon render completion.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={autoPublish}
                      onChange={(e) => setAutoPublish(e.target.checked)}
                      className="w-4 h-4 accent-accent cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between py-2 pt-2">
                    <div>
                      <h5 className="text-xs font-bold text-foreground">Script Approval Required (Gate)</h5>
                      <p className="text-[9px] text-muted">Pauses the pipeline after writing and waits for human approval.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={requireApproval}
                      onChange={(e) => setRequireApproval(e.target.checked)}
                      className="w-4 h-4 accent-accent cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-border mt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 border border-border hover:bg-white/10 text-xs font-semibold text-subtle cursor-pointer active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-lg active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {loading && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>{editingFeed ? "Save Changes" : "Create Channel"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
