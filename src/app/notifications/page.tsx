"use client";

import React from "react";
import Link from "next/link";
import { useToast } from "@/components/global/ToastContainer";
import { usePolling } from "@/lib/hooks/usePolling";
import { useInfiniteList } from "@/lib/hooks/useInfiniteList";
import { InfiniteScrollSentinel } from "@/components/global/InfiniteScrollSentinel";

import { Bell, CheckCheck, Trash2, Film, Rocket, AlertTriangle, Wrench, Clock, ArrowRight, X, Inbox, Search } from "lucide-react";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  data?: string;
}

export default function NotificationsPage() {
  const { toast } = useToast();
  const { enabled: pollingEnabled, interval: pollingInterval } = usePolling();

  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const [activeTab, setActiveTab] = React.useState<string>("all");

  const {
    items: notifications,
    total,
    setSize,
    size,
    isReachingEnd,
    isLoadingMore,
    isLoadingInitial,
    mutate,
  } = useInfiniteList<NotificationItem>("/api/notifications", {
    limit: 24,
    filters: {
      q: debouncedSearch || undefined,
      type: activeTab !== "all" && activeTab !== "unread" ? activeTab : undefined,
      unread: activeTab === "unread" ? "true" : undefined,
    },
    refreshInterval: pollingEnabled ? pollingInterval * 1000 : 0,
  });
  const notificationsLoaded = !isLoadingInitial;

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch("/api/notifications/read-all", {
        method: "POST",
      });
      if (res.ok) {
        mutate();
        toast("Success", "All notifications marked as read", "success");
      }
    } catch {
      toast("Error", "Could not mark notifications as read", "error");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        mutate();
        toast("Success", "Notification deleted", "success");
      }
    } catch {
      toast("Error", "Could not delete notification", "error");
    }
  };

  const handleClearAll = async () => {
    if (!confirm("Are you sure you want to clear all notifications history?")) return;
    try {
      const res = await fetch("/api/notifications", {
        method: "DELETE",
      });
      if (res.ok) {
        mutate();
        toast("Success", "All notifications cleared", "success");
      }
    } catch {
      toast("Error", "Could not clear notifications", "error");
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "video_ready":
        return <Film className="w-5 h-5 text-emerald-400" />;
      case "publish_done":
        return <Rocket className="w-5 h-5 text-purple-400" />;
      case "job_failed":
        return <AlertTriangle className="w-5 h-5 text-rose-400" />;
      case "system_alert":
        return <Wrench className="w-5 h-5 text-amber-400" />;
      case "job_progress":
        return <Clock className="w-5 h-5 text-cyan-400" />;
      default:
        return <Bell className="w-5 h-5 text-emerald-400" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "video_ready":
        return "Video Ready";
      case "publish_done":
        return "Publishing";
      case "job_failed":
        return "Task Error";
      case "system_alert":
        return "System";
      case "job_progress":
        return "Progress";
      default:
        return "Notification";
    }
  };

  const notificationsList = Array.isArray(notifications) ? notifications : [];
  const unreadCount = notificationsList.filter((n) => !n.isRead).length;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto font-sans">
      {/* Header */}
      <div className="glass-panel-raised p-6 md:p-8 rounded-3xl border border-border/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
            <h1 className="text-xl md:text-2xl font-bold font-mono text-foreground tracking-wider uppercase flex items-center gap-2.5">
              <Bell className="w-5 h-5 text-emerald-400" />
              <span>Notification Center</span>
            </h1>
          </div>
          <p className="text-xs text-muted font-medium mt-1">
            Real-time event streams, automated publishing alerts, and pipeline telemetry
            {total > 0 && (
              <span className="text-emerald-400 font-mono font-bold ml-1.5">· {total} total</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2.5 self-start">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 font-mono font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer active:scale-95 shadow-sm"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          )}
          {notificationsList.length > 0 && (
            <button
              onClick={handleClearAll}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.04] text-subtle border border-border/80 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30 font-mono font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </div>

      {/* Search & Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2.5 rounded-2xl bg-surface-raised/80 border border-border/80">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notification messages or titles..."
            className="w-full bg-background/60 border border-border/60 rounded-xl pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {[
            { id: "all", label: "All" },
            { id: "unread", label: "Unread" },
            { id: "video_ready", label: "Videos" },
            { id: "publish_done", label: "Publish" },
            { id: "job_failed", label: "Errors" },
            { id: "system_alert", label: "System" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "bg-surface-overlay/40 text-muted hover:text-foreground border border-border/40"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main List */}
      <div className="space-y-4">
        {!notificationsLoaded ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-muted font-mono">Loading notifications...</span>
          </div>
        ) : notificationsList.length === 0 ? (
          <div className="glass-panel-raised text-center py-20 border border-border/80 rounded-3xl p-10 max-w-md mx-auto flex flex-col items-center gap-4 shadow-xl">
            <Inbox className="w-10 h-10 text-muted" />
            <div>
              <h3 className="text-sm font-bold text-foreground font-mono">
                {search || activeTab !== "all" ? "No matching notifications" : "Inbox is clean"}
              </h3>
              <p className="text-xs text-muted mt-1">
                {search || activeTab !== "all"
                  ? "No notifications match your current search query or filter tab."
                  : "No active notifications or alerts registered in the system."}
              </p>
            </div>
            {(search || activeTab !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setActiveTab("all");
                }}
                className="mt-1 px-4 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-colors cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="glass-panel-raised border border-border/80 rounded-3xl overflow-hidden divide-y divide-border/60 shadow-xl">
            {notificationsList.map((n) => (
              <div
                key={n.id}
                className={`p-5 flex gap-4 transition-colors duration-200 hover:bg-white/[0.02] group ${
                  n.isRead ? "bg-transparent" : "bg-emerald-500/[0.04]"
                }`}
              >
                {/* Visual Icon Badge */}
                <div className="flex-shrink-0 w-11 h-11 rounded-2xl bg-surface-raised border border-border/80 flex items-center justify-center shadow-inner select-none">
                  {getIcon(n.type)}
                </div>

                {/* Content */}
                <div className="flex-grow space-y-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 text-[9px] font-mono font-bold tracking-widest uppercase rounded-full bg-white/[0.04] border border-border/80 text-subtle">
                        {getTypeLabel(n.type)}
                      </span>
                      {!n.isRead && (
                        <span className="px-2 py-0.5 text-[9px] font-mono font-bold tracking-wider rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 animate-pulse">
                          NEW
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(n.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted hover:text-rose-400 transition-all duration-150 cursor-pointer p-1 text-sm flex items-center justify-center rounded-lg hover:bg-white/5"
                      title="Delete notification"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <h4 className={`text-sm font-bold truncate ${n.isRead ? "text-foreground" : "text-emerald-400"}`}>
                    {n.title}
                  </h4>
                  <p className="text-xs text-subtle font-medium leading-relaxed break-words">
                    {n.message}
                  </p>
                  {/* Progress Bar for Job Progress */}
                  {n.type === "job_progress" && n.data && (
                    <div className="mt-2 w-full bg-surface-raised rounded-full h-1.5 overflow-hidden shadow-inner max-w-sm border border-border/60">
                      <div 
                        className="bg-cyan-400 h-full rounded-full transition-all duration-300 ease-out shadow-[0_0_8px_#22d3ee]" 
                        style={{ 
                          width: `${(() => {
                            try {
                              const d = JSON.parse(n.data);
                              if (d && typeof d.progress === 'number' && typeof d.total === 'number') {
                                return Math.min(100, Math.max(0, (d.progress / d.total) * 100));
                              }
                            } catch {}
                            return 0;
                          })()}%` 
                        }} 
                      />
                    </div>
                  )}
                  {(() => {
                    try {
                      const d = n.data ? JSON.parse(n.data) : null;
                      if (d?.jobId) {
                        return (
                          <Link href={`/pipeline?jobId=${d.jobId}`} prefetch={false} className="text-xs text-emerald-400 hover:underline mt-1.5 font-mono font-bold inline-flex items-center gap-1">
                            <span>View Job Details</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        );
                      }
                      if (d?.storyId) {
                        return (
                          <Link href={`/editor/${d.storyId}`} prefetch={false} className="text-xs text-emerald-400 hover:underline mt-1.5 font-mono font-bold inline-flex items-center gap-1">
                            <span>Open Editor</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        );
                      }
                    } catch {}
                    return null;
                  })()}

                  <p className="text-[10px] text-muted font-mono font-semibold mt-1">
                    {new Date(n.createdAt).toLocaleDateString([], {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    •{" "}
                    {new Date(n.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
            <InfiniteScrollSentinel
              onIntersect={() => setSize(size + 1)}
              disabled={isReachingEnd || isLoadingMore}
            />
          </div>
        )}
      </div>
    </div>
  );
}
