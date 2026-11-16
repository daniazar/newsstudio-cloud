"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  UserButton,
  OrganizationSwitcher,
  ClerkLoaded,
  ClerkLoading,
} from "@clerk/nextjs";
import useSWR from "swr";
import {
  Radio,
  Video,
  Layers,
  Film,
  Users,
  Sliders,
  Tv,
  Rss,
  FolderOpen,
  Activity,
  LayoutDashboard,
  Building2,
  UserCheck,
  Calendar,
  Wrench,
  Bell,
  HardDrive,
  Database,
  Volume2,
  Cpu,
  Menu,
  X,
  ShoppingBag,
  Box,
} from "lucide-react";
import { NotificationDropdown } from "./NotificationDropdown";
import { PaletteSwitcher } from "./PaletteSwitcher";
import { usePolling } from "@/lib/hooks/usePolling";
import {
  useCachedSuperAdmin,
  useCachedActiveOrg,
  type CachedOrg,
} from "@/lib/hooks/useSidebarIdentity";

/**
 * Lightweight, non-interactive stand-in for Clerk OrganizationSwitcher
 */
function CachedOrgPreview({
  org,
  full = false,
}: {
  org: CachedOrg;
  full?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-xl bg-white/[0.04] border border-border/80 text-foreground ${
        full ? "w-full px-3 py-2" : "px-2 py-1.5 max-w-[140px]"
      }`}
    >
      {org.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={org.imageUrl}
          alt=""
          className="w-5 h-5 rounded-lg object-cover shrink-0 ring-1 ring-white/10"
        />
      ) : (
        <span className="w-5 h-5 rounded-lg bg-accent/20 border border-accent/30 shrink-0" />
      )}
      <span className="text-xs font-bold truncate">{org.name}</span>
    </div>
  );
}

const fetcher = async (url: string) => {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
};

const orgSwitcherAppearance = {
  elements: {
    rootBox: "flex items-center min-w-0",
    organizationSwitcherTrigger:
      "px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-border/80 hover:bg-white/[0.08] hover:border-border-hover transition-all text-foreground gap-2 max-w-[140px]",
    organizationPreviewMainIdentifier:
      "text-foreground font-bold truncate text-xs",
    organizationSwitcherPopoverActionButton__createOrganization: "hidden",
  },
} as const;

interface NavItem {
  href: string;
  label: string;
  // ComponentType (not ElementType): @react-three/fiber augments JSX.IntrinsicElements, which makes
  // ElementType's props intersect to `never`.
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  /** "accent" follows the active palette; the others are fixed status colors. */
  badgeVariant?: "accent" | "emerald" | "ruby" | "amber" | "sky";
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export const Sidebar = React.memo(function Sidebar() {
  const pathname = usePathname();

  const isSuperAdmin = useCachedSuperAdmin();
  const { org: cachedOrg } = useCachedActiveOrg();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const {
    enabled: pollingEnabled,
    updateSettings: updatePollingSettings,
    isOverridden: pollingOverridden,
  } = usePolling();

  // Single-shot mount fetch for system health (0 idle polling)
  const { data: health } = useSWR("/api/health", fetcher, {
    refreshInterval: 0,
    revalidateOnFocus: false,
    revalidateIfStale: false,
  });

  // Fetch notifications on mount / focus (no idle polling)
  const { data: notifications } = useSWR<
    | Array<{ isRead: boolean }>
    | {
        data?: Array<{ isRead: boolean }>;
        notifications?: Array<{ isRead: boolean }>;
      }
  >("/api/notifications", fetcher, {
    refreshInterval: 0,
    revalidateOnFocus: true,
  });

  // Pending access-request count (no idle polling)
  const { data: accessReqs } = useSWR<{ stats?: { pendingCount: number } }>(
    isSuperAdmin ? "/api/admin/access-requests" : null,
    fetcher,
    {
      refreshInterval: 0,
      revalidateOnFocus: true,
    },
  );
  const pendingAccessCount = accessReqs?.stats?.pendingCount ?? 0;

  const notificationsList: Array<{ isRead: boolean }> = Array.isArray(
    notifications,
  )
    ? notifications
    : (notifications?.data ?? notifications?.notifications ?? []);
  const unreadCount = notificationsList.filter((n) => !n.isRead).length;

  const { data: isNotifOpen, mutate: setNotifOpen } = useSWR(
    "notifications-open",
    null,
    {
      fallbackData: false,
    },
  );

  // 4-Pillar Modernized Navigation with Unified Lucide Icons
  const navigationGroups: NavGroup[] = useMemo(
    () => [
      {
        title: "Broadcast Operations",
        items: [
          { href: "/newsroom", label: "Control Center", icon: Radio },
          { href: "/pipeline", label: "Pipeline Queue", icon: Layers },
          { href: "/vault", label: "Video Vault", icon: Film },
        ],
      },
      {
        title: "Persona & Brand Studio",
        items: [
          { href: "/personas", label: "Persona Vault", icon: Users },
          {
            href: "/voice-studio",
            label: "Voice Studio & Matrix",
            icon: Sliders,
            badge: "LIVE",
            badgeVariant: "accent",
          },
          { href: "/brands", label: "Brands & Channels", icon: Tv },
        ],
      },
      {
        title: "Content & Assets",
        items: [
          {
            href: "/ecommerce-studio",
            label: "E-Commerce Studio",
            icon: ShoppingBag,
            badge: "NEW",
            badgeVariant: "accent",
          },
          { href: "/feeds", label: "RSS Feeds", icon: Rss },
          { href: "/vault/assets", label: "Asset Vault", icon: FolderOpen },
        ],
      },
      {
        title: "System & Telemetry",
        items: [
          { href: "/admin/telemetry", label: "GPU Telemetry", icon: Activity },
          { href: "/admin", label: "Admin Dashboard", icon: LayoutDashboard },
          ...(isSuperAdmin
            ? [
                {
                  href: "/admin/organizations",
                  label: "Organizations",
                  icon: Building2,
                },
                {
                  href: "/admin/access-requests",
                  label:
                    pendingAccessCount > 0
                      ? `Access Requests (${pendingAccessCount})`
                      : "Access Requests",
                  icon: UserCheck,
                },
              ]
            : []),
          { href: "/admin/scheduler", label: "Scheduler", icon: Calendar },
          { href: "/admin/settings", label: "Settings", icon: Wrench },
          { href: "/notifications", label: "Notification Center", icon: Bell },
        ],
      },
    ],
    [isSuperAdmin, pendingAccessCount],
  );

  const getStatusDot = (status?: string) => {
    if (status === "online") {
      return (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 shadow-[0_0_8px_#34d399]" />
        </span>
      );
    }
    if (status === "offline") {
      return (
        <span className="inline-flex rounded-full h-2 w-2 bg-rose-500 shadow-[0_0_8px_#f43f5e]" />
      );
    }
    return <span className="inline-flex rounded-full h-2 w-2 bg-slate-600" />;
  };

  const getStatusTextColor = (status?: string, highlightOffline = false) => {
    if (status === "online") return "text-emerald-400";
    if (status === "unconfigured") return "text-slate-400";
    if (status === "offline" && highlightOffline) return "text-rose-400";
    return "text-slate-500";
  };

  const getStatusLabel = (status?: string, fallbackLabel = "idle") => {
    if (status === "unconfigured") return "local";
    return status || fallbackLabel;
  };

  const getBadgeStyle = (variant?: string) => {
    if (variant === "ruby") {
      return "bg-rose-500/20 text-rose-300 border-rose-500/30";
    }
    if (variant === "amber") {
      return "bg-amber-500/20 text-amber-300 border-amber-500/30";
    }
    if (variant === "sky") {
      return "bg-sky-500/20 text-sky-300 border-sky-500/30";
    }
    if (variant === "emerald") {
      return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
    }
    return "bg-accent/20 text-accent-hover border-accent/30";
  };

  return (
    <>
      {/* Mobile Top Bar */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-surface/90 backdrop-blur-xl border-b border-border/80 z-40 lg:hidden flex items-center justify-between px-4">
        <Link
          href="/newsroom"
          prefetch={false}
          className="flex items-center gap-2.5"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent-hover via-accent to-accent flex items-center justify-center shadow-lg shadow-accent/20 border border-accent-hover/30">
            <span className="text-accent-foreground font-black text-sm tracking-tighter">
              R
            </span>
          </div>
          <span className="text-sm font-black text-foreground tracking-tight">
            RubyStudio
          </span>
        </Link>

        <div className="flex items-center gap-2.5">
          <ClerkLoading>
            {cachedOrg ? (
              <CachedOrgPreview org={cachedOrg} />
            ) : (
              <div className="h-8 w-28 rounded-xl bg-white/5 border border-border animate-pulse" />
            )}
          </ClerkLoading>
          <ClerkLoaded>
            <OrganizationSwitcher
              hidePersonal
              appearance={orgSwitcherAppearance}
            />
          </ClerkLoaded>
          <NotificationDropdown disableToast />
          <UserButton
            signInUrl="/"
            appearance={{
              elements: { userButtonAvatarBox: "w-8 h-8 ring-1 ring-white/20" },
            }}
          />
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            aria-label={isMobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileOpen}
            className="p-2 rounded-xl bg-white/[0.04] border border-border hover:bg-white/10 text-subtle hover:text-foreground transition-colors cursor-pointer"
          >
            {isMobileOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </header>

      {/* Navigation Sidebar Drawer */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-64 border-r border-border/80 bg-surface/95 backdrop-blur-2xl z-50 flex flex-col transition-all duration-300 lg:translate-x-0 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Header & Logo */}
        <div className="p-5 border-b border-border/80 flex items-center justify-between">
          <Link
            href="/newsroom"
            prefetch={false}
            className="flex items-center gap-3 group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-hover via-accent to-accent flex items-center justify-center shadow-lg shadow-accent/20 border border-accent-hover/30 group-hover:scale-105 transition-transform">
              <span className="text-accent-foreground font-black text-base tracking-tighter">
                R
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-black text-foreground tracking-tight group-hover:text-accent transition-colors">
                  RubyStudio
                </h1>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-accent/10 text-accent border border-accent/20">
                  AI
                </span>
              </div>
              <p className="text-[10px] text-muted font-mono tracking-wide uppercase">
                Broadcast Suite
              </p>
            </div>
          </Link>
          <div className="hidden lg:flex items-center gap-2">
            <button
              onClick={() => setNotifOpen(!isNotifOpen)}
              className="relative p-2 rounded-xl bg-white/[0.04] border border-border hover:border-border-hover hover:bg-white/[0.08] active:scale-95 transition-all duration-200 cursor-pointer flex items-center justify-center text-subtle hover:text-foreground"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white font-mono font-bold text-[9px] flex items-center justify-center shadow-lg shadow-rose-500/30 border border-background animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>
            <UserButton
              signInUrl="/"
              appearance={{
                elements: {
                  userButtonAvatarBox:
                    "w-7 h-7 hover:scale-105 transition-transform ring-1 ring-white/10",
                },
              }}
            />
          </div>
        </div>

        {/* Active organization switcher */}
        <div className="hidden lg:block px-4 py-2.5 border-b border-border/80">
          <ClerkLoading>
            {cachedOrg ? (
              <CachedOrgPreview org={cachedOrg} full />
            ) : (
              <div className="h-9 w-full rounded-xl bg-white/5 border border-border animate-pulse" />
            )}
          </ClerkLoading>
          <ClerkLoaded>
            <OrganizationSwitcher
              hidePersonal
              appearance={{
                ...orgSwitcherAppearance,
                elements: {
                  ...orgSwitcherAppearance.elements,
                  rootBox: "flex items-center w-full",
                  organizationSwitcherTrigger:
                    "w-full justify-between px-3 py-2 rounded-xl bg-white/[0.04] border border-border/80 hover:bg-white/[0.08] hover:border-border-hover transition-colors text-foreground",
                  organizationPreviewMainIdentifier:
                    "text-foreground font-bold truncate text-xs",
                },
              }}
            />
          </ClerkLoaded>
        </div>

        {/* Scrollable Navigation Groups */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
          {navigationGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              <h3 className="px-2.5 text-[9px] font-mono font-bold text-muted uppercase tracking-widest">
                {group.title}
              </h3>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={false}
                      onClick={() => setIsMobileOpen(false)}
                      className={`group flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold tracking-tight transition-all duration-150 cursor-pointer ${
                        isActive
                          ? "bg-accent/15 text-accent-hover font-bold border border-accent/30 shadow-sm shadow-accent/10"
                          : "text-subtle hover:text-foreground hover:bg-white/[0.04] border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          className={`w-4 h-4 transition-colors ${
                            isActive
                              ? "text-accent"
                              : "text-muted group-hover:text-foreground"
                          }`}
                        />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider rounded border ${getBadgeStyle(
                            item.badgeVariant,
                          )}`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer: Palette picker + Live Health Indicator Grid */}
        <div className="p-3 border-t border-border/80 space-y-2 bg-black/20">
          <PaletteSwitcher />
          <div className="p-2.5 rounded-xl border border-border/70 bg-surface/60 space-y-2">
            <div className="flex items-center justify-between text-[9px] font-mono font-bold text-muted uppercase tracking-wider">
              <span>Cluster Engines</span>
              <span>Status</span>
            </div>

            <div className="flex flex-col gap-1 text-[11px] font-medium text-subtle">
              {/* Database */}
              <div className="flex items-center justify-between py-0.5">
                <div className="flex items-center gap-2">
                  {getStatusDot(health?.services?.database?.status)}
                  <span className="flex items-center gap-1">
                    <Database className="w-3 h-3 text-muted" /> DB (Prisma)
                  </span>
                </div>
                <span
                  className={`text-[9px] font-mono font-bold uppercase ${getStatusTextColor(health?.services?.database?.status, true)}`}
                >
                  {getStatusLabel(health?.services?.database?.status, "wait")}
                </span>
              </div>

              {/* Storage */}
              <div className="flex items-center justify-between py-0.5">
                <div className="flex items-center gap-2">
                  {getStatusDot(health?.services?.storage?.status)}
                  <span className="flex items-center gap-1">
                    <HardDrive className="w-3 h-3 text-muted" /> Storage (S3)
                  </span>
                </div>
                <span
                  className={`text-[9px] font-mono font-bold uppercase ${getStatusTextColor(health?.services?.storage?.status, true)}`}
                >
                  {getStatusLabel(health?.services?.storage?.status, "wait")}
                </span>
              </div>

              {/* Modern-TTS */}
              <div className="flex items-center justify-between py-0.5">
                <div className="flex items-center gap-2">
                  {getStatusDot(health?.services?.tts?.status)}
                  <span className="flex items-center gap-1">
                    <Volume2 className="w-3 h-3 text-muted" /> TTS (:8005)
                  </span>
                </div>
                <span
                  className={`text-[9px] font-mono font-bold uppercase ${getStatusTextColor(health?.services?.tts?.status, true)}`}
                >
                  {getStatusLabel(health?.services?.tts?.status, "wait")}
                </span>
              </div>

              {/* MuseTalk */}
              <div className="flex items-center justify-between py-0.5">
                <div className="flex items-center gap-2">
                  {getStatusDot(health?.services?.musetalk?.status)}
                  <span className="flex items-center gap-1">
                    <Video className="w-3 h-3 text-muted" /> TalkingHead (:8010)
                  </span>
                </div>
                <span
                  className={`text-[9px] font-mono font-bold uppercase ${getStatusTextColor(health?.services?.musetalk?.status)}`}
                >
                  {getStatusLabel(health?.services?.musetalk?.status, "idle")}
                </span>
              </div>

              {/* ComfyUI */}
              <div className="flex items-center justify-between py-0.5">
                <div className="flex items-center gap-2">
                  {getStatusDot(health?.services?.comfyui?.status)}
                  <span className="flex items-center gap-1">
                    <Cpu className="w-3 h-3 text-muted" /> ComfyUI (:8188)
                  </span>
                </div>
                <span
                  className={`text-[9px] font-mono font-bold uppercase ${getStatusTextColor(health?.services?.comfyui?.status)}`}
                >
                  {getStatusLabel(health?.services?.comfyui?.status, "idle")}
                </span>
              </div>

              {/* Object3D-Server (3D Product Turntable) */}
              <div className="flex items-center justify-between py-0.5">
                <div className="flex items-center gap-2">
                  {getStatusDot(health?.services?.object3d?.status)}
                  <span className="flex items-center gap-1">
                    <Box className="w-3 h-3 text-muted" /> Object3D (:8020)
                  </span>
                </div>
                <span
                  className={`text-[9px] font-mono font-bold uppercase ${getStatusTextColor(health?.services?.object3d?.status)}`}
                >
                  {getStatusLabel(health?.services?.object3d?.status, "idle")}
                </span>
              </div>
            </div>

            {/* Polling Toggle */}
            <div className="pt-1.5 border-t border-border/40 flex items-center justify-between">
              <span className="text-[9px] font-mono text-muted uppercase tracking-wider">
                Health Stream
              </span>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={pollingEnabled}
                  disabled={pollingOverridden}
                  onChange={(e) =>
                    updatePollingSettings({ enabled: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-6 h-3.5 bg-white/10 rounded-full peer peer-checked:bg-accent peer-checked:after:bg-accent-foreground peer-checked:after:translate-x-2.5 after:content-[''] after:absolute after:top-[1.5px] after:left-[1.5px] after:bg-white after:rounded-full after:h-2.5 after:w-2.5 after:transition-all" />
              </label>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-md z-30 lg:hidden"
        />
      )}
    </>
  );
});
