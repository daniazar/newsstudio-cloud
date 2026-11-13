"use client";

import React from "react";
import { useSafeZones, SafeZonePlatform, AspectRatio } from "../hooks/useSafeZones";
import { Heart, MessageCircle, Share2, Music, Bookmark } from "lucide-react";

export interface SafeZonesOverlayProps {
  platform?: SafeZonePlatform;
  aspectRatio?: AspectRatio;
  visible?: boolean;
  showPlatformUI?: boolean;
  className?: string;
}

export function SafeZonesOverlay({
  platform = "tiktok",
  aspectRatio = "9:16",
  visible = true,
  showPlatformUI = true,
  className = "",
}: SafeZonesOverlayProps) {
  const margins = useSafeZones({ platform, aspectRatio });

  if (!visible) return null;

  return (
    <div
      className={`pointer-events-none absolute inset-0 z-30 select-none overflow-hidden ${className}`}
    >
      {/* 1. Safe Margin Boundary Box */}
      <div
        className="absolute border border-dashed border-emerald-400/60 bg-emerald-500/[0.02]"
        style={{
          top: `${margins.top}%`,
          bottom: `${margins.bottom}%`,
          left: `${margins.left}%`,
          right: `${margins.right}%`,
        }}
      >
        <span className="absolute left-2 top-2 rounded bg-emerald-500/80 px-1.5 py-0.5 font-mono text-[9px] font-bold text-black shadow-sm">
          SAFE ZONE ({platform.toUpperCase()})
        </span>
      </div>

      {/* 2. Shaded Dead Zones (Where Platform UI Obscures Content) */}
      {/* Top Banner Zone */}
      <div
        className="absolute left-0 right-0 top-0 bg-red-500/10 border-b border-red-500/20 flex items-center justify-center text-[10px] text-red-300 font-mono"
        style={{ height: `${margins.top}%` }}
      >
        <span>Header & Search Bar Obstruction</span>
      </div>

      {/* Bottom Bar Zone */}
      <div
        className="absolute bottom-0 left-0 right-0 bg-red-500/10 border-t border-red-500/20 flex items-center justify-center text-[10px] text-red-300 font-mono"
        style={{ height: `${margins.bottom}%` }}
      >
        <span>Captions, CTA & Home Navigation Obstruction</span>
      </div>

      {/* Right Action Rail (For Vertical Video) */}
      {aspectRatio === "9:16" && margins.right > 8 && (
        <div
          className="absolute right-0 top-0 bottom-0 bg-red-500/10 border-l border-red-500/20 flex items-center justify-center text-[9px] text-red-300 font-mono rotate-90"
          style={{ width: `${margins.right}%` }}
        >
          <span>Action Rail</span>
        </div>
      )}

      {/* 3. Simulated Native UI Icons (for 9:16 vertical feeds) */}
      {showPlatformUI && aspectRatio === "9:16" && (
        <>
          {/* Right Action Rail Mock Icons */}
          <div className="absolute right-3 bottom-20 flex flex-col items-center gap-4 text-white/70">
            <div className="flex flex-col items-center gap-1">
              <div className="h-9 w-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/20">
                <Heart className="h-5 w-5 text-white/80" />
              </div>
              <span className="text-[10px] font-bold">12.4K</span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <div className="h-9 w-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/20">
                <MessageCircle className="h-5 w-5 text-white/80" />
              </div>
              <span className="text-[10px] font-bold">348</span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <div className="h-9 w-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/20">
                <Bookmark className="h-5 w-5 text-white/80" />
              </div>
              <span className="text-[10px] font-bold">892</span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <div className="h-9 w-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/20">
                <Share2 className="h-5 w-5 text-white/80" />
              </div>
              <span className="text-[10px] font-bold">Share</span>
            </div>

            {/* Rotating Disc */}
            <div className="h-8 w-8 rounded-full bg-zinc-900 border-2 border-white/40 flex items-center justify-center animate-spin">
              <Music className="h-4 w-4 text-emerald-400" />
            </div>
          </div>

          {/* Bottom Captions Mock */}
          <div className="absolute left-4 bottom-5 max-w-[70%] space-y-1 text-white/90 drop-shadow">
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <span>@newsstudio.official</span>
              <span className="text-[10px] text-emerald-400 font-semibold">• Follow</span>
            </div>
            <p className="text-[11px] line-clamp-2 text-white/80 leading-snug">
              Breaking broadcast coverage & smart e-commerce showcase #news #review #trending
            </p>
          </div>
        </>
      )}
    </div>
  );
}
