"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import useSWR from "swr";
import { useToast } from "./ToastContainer";

const fetcher = async (url: string) => {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
};

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  data?: string;
}
export const NotificationDropdown = React.memo(function NotificationDropdown({ 
  standalone = false,
  disableToast = false 
}: { 
  standalone?: boolean;
  disableToast?: boolean;
}) {
  const [localIsOpen, setLocalIsOpen] = useState(false);
  const { data: globalIsOpen, mutate: setGlobalIsOpen } = useSWR("notifications-open", null, { fallbackData: false });

  const isOpen = standalone ? globalIsOpen : localIsOpen;
  const setIsOpen = standalone ? setGlobalIsOpen : setLocalIsOpen;

  const dropdownRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Fetch notifications on mount, focus, or when dropdown opens (zero idle polling)
  const { data: notifications, mutate } = useSWR<{ data?: NotificationItem[]; notifications?: NotificationItem[] } | NotificationItem[]>(
    "/api/notifications",
    fetcher,
    {
      refreshInterval: 0,
      revalidateOnFocus: true,
    }
  );

  useEffect(() => {
    if (isOpen) {
      void mutate();
    }
  }, [isOpen, mutate]);

  const notificationsList = useMemo<NotificationItem[]>(
    () => Array.isArray(notifications) ? notifications : (notifications?.data ?? notifications?.notifications ?? []),
    [notifications]
  );

  const unreadCount = notificationsList.filter((n) => !n.isRead).length;

  // Track if we need to display a live toast alert on new notifications
  const isFirstLoadRef = useRef(true);
  const [prevCount, setPrevCount] = useState(0);
  useEffect(() => {
    if (disableToast) return;
    if (!notifications) return;

    const currentUnread = notificationsList.filter((n) => !n.isRead).length;

    if (isFirstLoadRef.current) {
      isFirstLoadRef.current = false;
      setPrevCount(currentUnread);
      return;
    }

    if (currentUnread > prevCount) {
      // Find the newest unread notification to show a toast
      const newNotifs = notificationsList.filter((n) => !n.isRead);
      const newest = newNotifs[0];
      if (newest) {
        toast(
          newest.title,
          newest.message,
          getToastType(newest.type)
        );
      }
    }
    setPrevCount(currentUnread);
  }, [notifications, prevCount, toast, disableToast, notificationsList]);

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

  if (standalone) {
    if (!isOpen) return null;
    return (
      <div className="fixed bottom-4 right-4 w-80 backdrop-blur-2xl bg-surface/90 border border-border rounded-2xl shadow-2xl z-[999] overflow-hidden flex flex-col max-h-[70vh] animate-in fade-in slide-in-from-bottom-4 transition-all duration-300">
        {/* Header */}
        <div className="p-4 border-b border-border flex flex-shrink-0 items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">Notifications</h3>
          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[9px] font-bold text-accent hover:text-accent-hover tracking-wide uppercase transition-colors duration-150 cursor-pointer"
              >
                Mark read
              </button>
            )}
            {notificationsList.length > 0 && (
              <button
                onClick={handleClearAll}
                className="text-[9px] font-bold text-muted hover:text-error tracking-wide uppercase transition-colors duration-150 cursor-pointer border-l border-border/60 pl-1.5"
              >
                Clear All
              </button>
            )}
            <button 
              onClick={() => setIsOpen(false)}
              aria-label="Close notifications"
              className="text-muted hover:text-foreground text-sm flex items-center justify-center cursor-pointer ml-1"
              title="Hide notifications"
            >
              ✕
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {notificationsList.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted flex flex-col items-center justify-center gap-2">
              <span>📭</span>
              <span>No notifications yet</span>
            </div>
          ) : (
            notificationsList.slice(0, 10).map((notification) => (
              <div
                key={notification.id}
                className={`p-3.5 flex gap-2.5 transition-colors duration-200 group ${
                  notification.isRead ? "bg-transparent" : "bg-accent-subtle/30"
                }`}
              >
                <span className="text-lg flex-shrink-0 self-start mt-0.5">
                  {getNotificationEmoji(notification.type)}
                </span>
                <div className="flex-grow space-y-0.5 min-w-0">
                  <div className="flex items-center justify-between gap-1.5">
                    <p className={`text-xs font-bold truncate ${notification.isRead ? "text-foreground" : "text-accent-hover"}`}>
                      {notification.title}
                    </p>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!notification.isRead && (
                        <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(notification.id);
                        }}
                        aria-label="Delete notification"
                        className="opacity-0 group-hover:opacity-100 text-[10px] text-muted hover:text-error transition-all duration-150 cursor-pointer p-0.5"
                        title="Delete notification"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-subtle font-medium leading-normal break-words">
                    {notification.message}
                  </p>
                  {notification.type === "job_progress" && notification.data && (
                    <div className="mt-1.5 mb-1 w-full bg-border rounded-full h-1.5 overflow-hidden shadow-inner">
                      <div 
                        className="bg-accent h-full rounded-full transition-all duration-300 ease-out" 
                        style={{ 
                          width: `${(() => {
                            try {
                              const d = JSON.parse(notification.data);
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
                      const d = notification.data ? JSON.parse(notification.data) : null;
                      if (d?.jobId) {
                        return (
                          <div className="flex items-center gap-2 mt-1">
                            <Link 
                              href={`/pipeline?jobId=${d.jobId}`} 
                              prefetch={false}
                              onClick={() => setIsOpen(false)}
                              className="text-[10px] text-accent hover:underline font-semibold inline-flex items-center gap-1"
                            >
                              Pipeline Queue <span>→</span>
                            </Link>
                          </div>
                        );
                      }
                      if (d?.storyId) {
                        const isWardrobeStory = typeof d.storyId === "string" && d.storyId.startsWith("wardrobe_");
                        return (
                          <Link 
                            href={isWardrobeStory ? "/pipeline" : `/editor/${d.storyId}`} 
                            prefetch={false}
                            onClick={() => setIsOpen(false)}
                            className="text-[10px] text-accent hover:underline mt-1 block font-semibold inline-flex items-center gap-1"
                          >
                            {isWardrobeStory ? "Pipeline Queue" : "Open Editor"} <span>→</span>
                          </Link>
                        );
                      }
                    } catch {}
                    return null;
                  })()}
                  <p className="text-[9px] text-muted">
                    {new Date(notification.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border text-center bg-white/[0.02]">
          <Link
            href="/notifications"
            prefetch={false}
            onClick={() => setIsOpen(false)}
            className="text-[11px] font-semibold text-subtle hover:text-foreground transition-colors"
          >
            View all notifications
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-xl bg-white/5 border border-border hover:border-border-hover hover:bg-white/10 active:scale-95 transition-all duration-200 cursor-pointer flex items-center justify-center"
      >
        <span className="text-xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1.5 rounded-full bg-error text-white font-bold text-[10px] flex items-center justify-center shadow-lg shadow-error/20 border border-background animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Fixed Bottom-Right Tray */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 w-80 backdrop-blur-2xl bg-surface/90 border border-border rounded-2xl shadow-2xl z-[999] overflow-hidden flex flex-col max-h-[70vh] animate-in fade-in slide-in-from-bottom-4 transition-all duration-300">
          {/* Header */}
          <div className="p-4 border-b border-border flex flex-shrink-0 items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">Notifications</h3>
            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[9px] font-bold text-accent hover:text-accent-hover tracking-wide uppercase transition-colors duration-150 cursor-pointer"
                >
                  Mark read
                </button>
              )}
              {notificationsList.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-[9px] font-bold text-muted hover:text-error tracking-wide uppercase transition-colors duration-150 cursor-pointer border-l border-border/60 pl-1.5"
                >
                  Clear All
                </button>
              )}
              <button 
                onClick={() => setIsOpen(false)}
                aria-label="Close notifications"
                className="text-muted hover:text-foreground text-sm flex items-center justify-center cursor-pointer ml-1"
                title="Hide notifications"
              >
                ✕
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {notificationsList.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted flex flex-col items-center justify-center gap-2">
                <span>📭</span>
                <span>No notifications yet</span>
              </div>
            ) : (
              notificationsList.slice(0, 10).map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3.5 flex gap-2.5 transition-colors duration-200 group ${
                    notification.isRead ? "bg-transparent" : "bg-accent-subtle/30"
                  }`}
                >
                  <span className="text-lg flex-shrink-0 self-start mt-0.5">
                    {getNotificationEmoji(notification.type)}
                  </span>
                  <div className="flex-grow space-y-0.5 min-w-0">
                    <div className="flex items-center justify-between gap-1.5">
                      <p className={`text-xs font-bold truncate ${notification.isRead ? "text-foreground" : "text-accent-hover"}`}>
                        {notification.title}
                      </p>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!notification.isRead && (
                          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(notification.id);
                          }}
                          aria-label="Delete notification"
                          className="opacity-0 group-hover:opacity-100 text-[10px] text-muted hover:text-error transition-all duration-150 cursor-pointer p-0.5"
                          title="Delete notification"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-subtle font-medium leading-normal break-words">
                      {notification.message}
                    </p>
                    {notification.type === "job_progress" && notification.data && (
                      <div className="mt-1.5 mb-1 w-full bg-border rounded-full h-1.5 overflow-hidden shadow-inner">
                        <div 
                          className="bg-accent h-full rounded-full transition-all duration-300 ease-out" 
                          style={{ 
                            width: `${(() => {
                              try {
                                const d = JSON.parse(notification.data);
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
                        const d = notification.data ? JSON.parse(notification.data) : null;
                        if (d?.jobId) {
                          return (
                            <Link 
                              href={`/pipeline?jobId=${d.jobId}`} 
                              prefetch={false}
                              onClick={() => setIsOpen(false)}
                              className="text-[10px] text-accent hover:underline mt-1 block font-semibold inline-flex items-center gap-1"
                            >
                              View Job Details <span>→</span>
                            </Link>
                          );
                        }
                        if (d?.storyId) {
                          const isWardrobeStory = typeof d.storyId === "string" && d.storyId.startsWith("wardrobe_");
                          return (
                            <Link 
                              href={isWardrobeStory ? "/pipeline" : `/editor/${d.storyId}`} 
                              prefetch={false}
                              onClick={() => setIsOpen(false)}
                              className="text-[10px] text-accent hover:underline mt-1 block font-semibold inline-flex items-center gap-1"
                            >
                              {isWardrobeStory ? "Pipeline Queue" : "Open Editor"} <span>→</span>
                            </Link>
                          );
                        }
                      } catch {}
                      return null;
                    })()}
                    <p className="text-[9px] text-muted">
                      {new Date(notification.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-border text-center bg-white/[0.02]">
            <Link
              href="/notifications"
              prefetch={false}
              onClick={() => setIsOpen(false)}
              className="text-[11px] font-semibold text-subtle hover:text-foreground transition-colors"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
});

function getToastType(type: string): "success" | "error" | "info" | "warning" {
  switch (type) {
    case "publish_done":
    case "video_ready":
      return "success";
    case "job_failed":
      return "error";
    case "system_alert":
      return "warning";
    default:
      return "info";
  }
}

function getNotificationEmoji(type: string): string {
  switch (type) {
    case "video_ready":
      return "🎬";
    case "publish_done":
      return "🚀";
    case "job_failed":
      return "⚠️";
    case "system_alert":
      return "🔧";
    case "job_progress":
      return "⏳";
    default:
      return "🔔";
  }
}
