"use client";

import React from "react";
import useSWR from "swr";
import Link from "next/link";
import { Activity, Radio, Cpu, Layers, Sparkles } from "lucide-react";
import { usePolling } from "@/lib/hooks/usePolling";
import { useCachedActiveOrg } from "@/lib/hooks/useSidebarIdentity";

const fetcher = async (url: string) => {
  try {
    const res = await fetch(url, { redirect: "manual" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
};

export const AmbientClusterHUD = React.memo(function AmbientClusterHUD() {
  const { enabled: pollingEnabled, interval: pollingInterval } = usePolling();
  const { org: cachedOrg } = useCachedActiveOrg();
  const isProd = process.env.NODE_ENV === "production";

  const { data: health } = useSWR(isProd ? null : "/api/health", fetcher, {
    refreshInterval: !isProd && pollingEnabled ? pollingInterval * 1000 : 0,
    revalidateOnFocus: false,
  });

  const { data: queueData } = useSWR(cachedOrg?.id ? "/api/pipeline/stats" : null, fetcher, {
    refreshInterval: (latestData) => {
      const queued = latestData?.stats?.queued || 0;
      const inProgress = latestData?.stats?.inProgress || 0;
      return queued + inProgress > 0 ? 10_000 : 0;
    },
    revalidateOnFocus: true,
  });

  const isDegraded = health?.status === "degraded" || health?.status === "unhealthy";
  const activeJobs = (queueData?.stats?.queued || 0) + (queueData?.stats?.inProgress || 0);

  return (
    <div className="fixed bottom-0 left-0 right-0 lg:left-64 z-30 pointer-events-none">
      <div className="pointer-events-auto h-8 bg-surface/90 backdrop-blur-xl border-t border-border/80 px-4 flex items-center justify-between text-[10px] font-mono text-muted select-none">
        {/* Left: Cluster Health & Live State */}
        <div className="flex items-center gap-3">
          <Link
            href="/admin/telemetry"
            prefetch={false}
            className="flex items-center gap-1.5 text-subtle hover:text-white transition-colors"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                  isDegraded ? "bg-amber-400 opacity-75" : "bg-emerald-400 opacity-75"
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                  isDegraded ? "bg-amber-500" : "bg-emerald-500"
                }`}
              />
            </span>
            <span className="font-bold tracking-tight">
              {isDegraded ? "CLUSTER DEGRADED" : "CLUSTER ONLINE"}
            </span>
          </Link>

          <span className="text-border">|</span>

          <Link
            href="/pipeline"
            prefetch={false}
            className="flex items-center gap-1 hover:text-emerald-400 transition-colors"
          >
            <Layers className="w-3 h-3 text-muted" />
            <span>Jobs:</span>
            <span className="font-bold text-foreground">{activeJobs}</span>
          </Link>
        </div>

        {/* Center: Realtime Engines */}
        <div className="hidden sm:flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Radio className="w-3 h-3 text-emerald-400" />
            <span className="text-subtle">TTS :8005</span>
            <span className="text-[9px] text-emerald-400 font-bold">READY</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Cpu className="w-3 h-3 text-sky-400" />
            <span className="text-subtle">MuseTalk 40FPS</span>
            <span className="text-[9px] text-sky-400 font-bold">READY</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-rose-400" />
            <span className="text-subtle">Remotion 4K</span>
            <span className="text-[9px] text-rose-400 font-bold">CUDA</span>
          </div>
        </div>

        {/* Right: Quick shortcut helper */}
        <div className="flex items-center gap-3">
          <Link
            href="/newsroom"
            prefetch={false}
            className="flex items-center gap-1 text-muted hover:text-subtle transition-colors"
          >
            <Activity className="w-3 h-3" />
            <span className="hidden md:inline">Telemetry</span>
          </Link>

          <div className="hidden lg:flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/[0.04] border border-border/60 text-[9px] text-subtle">
            <span>Press</span>
            <kbd className="px-1 py-0.2 rounded bg-white/10 text-foreground font-mono font-bold">/</kbd>
            <span>to search</span>
          </div>
        </div>
      </div>
    </div>
  );
});
