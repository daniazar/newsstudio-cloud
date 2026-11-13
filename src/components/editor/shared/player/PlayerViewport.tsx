"use client";

import React, { useState, useRef } from "react";
import {
  Smartphone,
  Monitor,
  Square,
  ShieldCheck,
  Maximize2,
  Minimize2,
  Move,
  Layers,
} from "lucide-react";
import { SafeZonesOverlay } from "./SafeZonesOverlay";
import { AspectRatio, SafeZonePlatform } from "../hooks/useSafeZones";

export interface PlayerViewportProps {
  aspectRatio: AspectRatio;
  onChangeAspectRatio?: (ratio: AspectRatio) => void;
  safeZonePlatform?: SafeZonePlatform;
  onChangeSafeZonePlatform?: (platform: SafeZonePlatform) => void;
  showSafeZones?: boolean;
  onToggleSafeZones?: () => void;
  showGizmo?: boolean;
  onToggleGizmo?: () => void;
  isPlaying?: boolean;
  showLayerTree?: boolean;
  onToggleLayerTree?: () => void;
  leftSidebar?: React.ReactNode;
  overlay?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

function PlayerViewportComponent({
  aspectRatio = "9:16",
  onChangeAspectRatio,
  safeZonePlatform = "tiktok",
  onChangeSafeZonePlatform,
  showSafeZones = false,
  onToggleSafeZones,
  showGizmo = true,
  onToggleGizmo,
  isPlaying = false,
  showLayerTree = true,
  onToggleLayerTree,
  leftSidebar,
  overlay,
  children,
  className = "",
}: PlayerViewportProps) {
  const [internalSafeZones, setInternalSafeZones] = useState(showSafeZones);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const safeZonesVisible =
    onToggleSafeZones !== undefined ? showSafeZones : internalSafeZones;

  const handleToggleSafeZones = () => {
    if (onToggleSafeZones) {
      onToggleSafeZones();
    } else {
      setInternalSafeZones(!internalSafeZones);
    }
  };

  const handleToggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Determine aspect ratio class & max dimensions
  const getAspectStyle = (): React.CSSProperties => {
    switch (aspectRatio) {
      case "9:16":
        return {
          aspectRatio: "9/16",
          height: "100%",
          maxHeight: "100%",
          width: "auto",
        };
      case "16:9":
        return {
          aspectRatio: "16/9",
          width: "100%",
          maxWidth: "100%",
          maxHeight: "100%",
          height: "auto",
        };
      case "1:1":
        return {
          aspectRatio: "1/1",
          height: "100%",
          maxHeight: "100%",
          width: "auto",
        };
      default:
        return {
          aspectRatio: "9/16",
          height: "100%",
          maxHeight: "100%",
          width: "auto",
        };
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex-1 min-h-0 flex flex-col items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-xl overflow-hidden ${className}`}
    >
      {/* Top Controls Bar */}
      <div className="w-full flex items-center justify-between mb-3 border-b border-zinc-900 pb-2 z-20">
        <div className="flex items-center gap-2">
          {/* Layer Tree Panel Toggle */}
          {onToggleLayerTree && (
            <button
              type="button"
              onClick={onToggleLayerTree}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                showLayerTree
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/10"
                  : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white hover:bg-zinc-800"
              }`}
              title="Toggle Component Layer Tree Panel"
            >
              <Layers className="h-3.5 w-3.5 text-emerald-400" />
              <span>Layers</span>
            </button>
          )}

          {/* Aspect Ratio Switcher */}
          {onChangeAspectRatio && (
          <div className="flex items-center gap-1 bg-zinc-900/80 rounded-lg p-0.5 border border-zinc-800">
            <button
              type="button"
              onClick={() => onChangeAspectRatio("9:16")}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-colors ${
                aspectRatio === "9:16"
                  ? "bg-emerald-500 text-black shadow"
                  : "text-zinc-400 hover:text-white"
              }`}
              title="Vertical 9:16 (TikTok, Reels, Shorts)"
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>9:16</span>
            </button>

            <button
              type="button"
              onClick={() => onChangeAspectRatio("16:9")}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-colors ${
                aspectRatio === "16:9"
                  ? "bg-emerald-500 text-black shadow"
                  : "text-zinc-400 hover:text-white"
              }`}
              title="Widescreen 16:9 (YouTube, TV, Broadcast)"
            >
              <Monitor className="h-3.5 w-3.5" />
              <span>16:9</span>
            </button>

            <button
              type="button"
              onClick={() => onChangeAspectRatio("1:1")}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-colors ${
                aspectRatio === "1:1"
                  ? "bg-emerald-500 text-black shadow"
                  : "text-zinc-400 hover:text-white"
              }`}
              title="Square 1:1 (Instagram Feed, LinkedIn)"
            >
              <Square className="h-3.5 w-3.5" />
              <span>1:1</span>
            </button>
          </div>
        )}
        </div>

        {/* Right Tools: Safe Zones, Canvas Handles Toggle & Fullscreen */}
        <div className="flex items-center gap-2">
          {/* Direct Manipulation Gizmo Toggle */}
          {onToggleGizmo && (
            <button
              type="button"
              onClick={onToggleGizmo}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                showGizmo
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                  : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200"
              }`}
              title="Toggle Direct On-Canvas Drag Handles"
            >
              <Move className="h-3.5 w-3.5" />
              <span>Canvas Handles</span>
            </button>
          )}

          {/* Safe Zones Toggle */}
          <button
            type="button"
            onClick={handleToggleSafeZones}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
              safeZonesVisible
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200"
            }`}
            title="Toggle Safe Zone Guidelines"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Safe Zones</span>
          </button>

          {/* Platform Selector if safe zones visible */}
          {safeZonesVisible && onChangeSafeZonePlatform && (
            <select
              value={safeZonePlatform}
              onChange={(e) => onChangeSafeZonePlatform(e.target.value as SafeZonePlatform)}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-300 focus:border-emerald-500 focus:outline-none"
            >
              <option value="tiktok">TikTok</option>
              <option value="reels">Instagram Reels</option>
              <option value="shorts">YouTube Shorts</option>
              <option value="general">Broadcast TV</option>
            </select>
          )}

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="rounded-lg border border-zinc-800 bg-zinc-900 p-1.5 text-zinc-400 hover:text-white transition-colors"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Main Viewport Stage with Optional Docked Left Layer Tree */}
      <div className="relative flex-1 min-h-0 flex items-stretch w-full bg-zinc-950/90 rounded-xl overflow-hidden border border-zinc-900">
        {leftSidebar}
        <div className="relative flex-1 min-h-0 flex items-center justify-center p-2 overflow-hidden">
          <div
            style={getAspectStyle()}
            className="relative max-w-full max-h-full flex items-center justify-center rounded-lg overflow-hidden border border-zinc-800/80 bg-black shadow-2xl transition-all duration-300"
          >
            {/* Remotion or Preview Canvas Children */}
            {children}

            {/* Interactive Direct-Manipulation Gizmo Overlay (hidden during active playback to prevent frame drops) */}
            {showGizmo && !isPlaying && overlay}

            {/* Safe Zones Overlay */}
            <SafeZonesOverlay
              platform={safeZonePlatform}
              aspectRatio={aspectRatio}
              visible={safeZonesVisible}
              showPlatformUI={aspectRatio === "9:16"}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export const PlayerViewport = React.memo(PlayerViewportComponent);
