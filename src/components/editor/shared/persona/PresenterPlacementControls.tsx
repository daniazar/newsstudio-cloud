"use client";

import React from "react";
import {
  Maximize2,
  Columns,
  CircleDot,
  CornerDownRight,
  CornerDownLeft,
  RotateCcw,
  Sliders,
  Tag,
  ChevronDown,
  Eye,
  EyeOff,
} from "lucide-react";
import type { PresenterLayoutMode } from "@/lib/types/ecommerce";

export interface PresenterPlacementControlsProps {
  layoutMode: PresenterLayoutMode;
  onChangeLayoutMode: (mode: PresenterLayoutMode) => void;
  scale?: number;
  onChangeScale?: (scale: number) => void;
  offsetX?: number;
  onChangeOffsetX?: (x: number) => void;
  offsetY?: number;
  onChangeOffsetY?: (y: number) => void;
  showNametag?: boolean;
  onChangeShowNametag?: (show: boolean) => void;
  presenterName?: string;
  onChangePresenterName?: (name: string) => void;
  presenterTitle?: string;
  onChangePresenterTitle?: (title: string) => void;
  disabled?: boolean;
  className?: string;
  defaultCollapsed?: boolean;
  isAvatarHidden?: boolean;
  onToggleAvatarHidden?: (hidden: boolean) => void;
  canHideAvatar?: boolean;
  bubbleFaceZoom?: number;
  onChangeBubbleFaceZoom?: (zoom: number) => void;
  bubbleFaceOffsetY?: number;
  onChangeBubbleFaceOffsetY?: (y: number) => void;
  bubbleFaceOffsetX?: number;
  onChangeBubbleFaceOffsetX?: (x: number) => void;
  onResetBubbleFaceCrop?: () => void;
  onReset?: () => void;
}

interface LayoutOption {
  id: PresenterLayoutMode;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
  tag: string;
}

const LAYOUT_OPTIONS: LayoutOption[] = [
  {
    id: "full_screen",
    label: "Full Screen Anchor",
    sublabel: "100% hero viewport presentation",
    icon: Maximize2,
    tag: "Hook / Lead",
  },
  {
    id: "side_full_left",
    label: "Side Split (Left)",
    sublabel: "Full-height column left + media right",
    icon: Columns,
    tag: "Split 50/50",
  },
  {
    id: "side_full_right",
    label: "Side Split (Right)",
    sublabel: "Media left + full-height column right",
    icon: Columns,
    tag: "Split 50/50",
  },
  {
    id: "circle_pip",
    label: "Avatar in Bubble (PiP)",
    sublabel: "Floating circular broadcast pill",
    icon: CircleDot,
    tag: "Reaction PiP",
  },
  {
    id: "bottom_right",
    label: "Corner Anchor (Right)",
    sublabel: "Standing lower anchor with soft gradient",
    icon: CornerDownRight,
    tag: "Broadcast Standard",
  },
  {
    id: "bottom_left",
    label: "Corner Anchor (Left)",
    sublabel: "Standing lower anchor on bottom-left",
    icon: CornerDownLeft,
    tag: "Broadcast Alt",
  },
];

const SCALE_PRESETS = [
  { label: "80% Fit", value: 0.8 },
  { label: "100% 1:1", value: 1.0 },
  { label: "125% Focus", value: 1.25 },
  { label: "150% Close", value: 1.5 },
  { label: "200% Hero", value: 2.0 },
];

export function PresenterPlacementControls({
  layoutMode,
  onChangeLayoutMode,
  scale = 1.0,
  onChangeScale,
  offsetX = 0,
  onChangeOffsetX,
  offsetY = 0,
  onChangeOffsetY,
  showNametag = true,
  onChangeShowNametag,
  presenterName = "",
  onChangePresenterName,
  presenterTitle = "",
  onChangePresenterTitle,
  disabled = false,
  className = "",
  defaultCollapsed = true,
  isAvatarHidden = false,
  onToggleAvatarHidden,
  canHideAvatar = true,
  bubbleFaceZoom = 1.85,
  onChangeBubbleFaceZoom,
  bubbleFaceOffsetY = 5,
  onChangeBubbleFaceOffsetY,
  bubbleFaceOffsetX = 0,
  onChangeBubbleFaceOffsetX,
  onResetBubbleFaceCrop,
  onReset,
}: PresenterPlacementControlsProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);

  const activeOption = LAYOUT_OPTIONS.find((opt) => opt.id === layoutMode) || LAYOUT_OPTIONS[4];

  const handleReset = () => {
    if (onReset) {
      onReset();
      return;
    }
    onChangeLayoutMode("bottom_right");
    if (onChangeScale) onChangeScale(1.0);
    if (onChangeOffsetX) onChangeOffsetX(0);
    if (onChangeOffsetY) onChangeOffsetY(0);
    if (onToggleAvatarHidden) onToggleAvatarHidden(false);
    if (onChangeBubbleFaceZoom) onChangeBubbleFaceZoom(1.85);
    if (onChangeBubbleFaceOffsetY) onChangeBubbleFaceOffsetY(5);
    if (onChangeBubbleFaceOffsetX) onChangeBubbleFaceOffsetX(0);
  };

  return (
    <div className={`rounded-xl border border-zinc-800 bg-zinc-950/70 backdrop-blur-md transition-all overflow-hidden ${className}`}>
      {/* Collapsible Header */}
      <div className="p-3.5 flex items-center justify-between gap-2 select-none">
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-expanded={!isCollapsed}
          className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer group flex-1"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors shrink-0">
            <Sliders className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <h4 className="text-sm font-semibold text-zinc-100 group-hover:text-white transition-colors truncate">
              Avatar Staging & Framing
            </h4>

            {/* Collapsed State Badges */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {isAvatarHidden ? (
                <span className="text-[10px] font-bold text-amber-300 bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <EyeOff className="h-2.5 w-2.5" />
                  <span>Hidden on Scene</span>
                </span>
              ) : (
                <>
                  <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                    {activeOption.label}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-300 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded">
                    {Math.round(scale * 100)}%
                  </span>
                  {(offsetX !== 0 || offsetY !== 0) && (
                    <span className="text-[9px] font-mono text-zinc-400 hidden md:inline">
                      ({offsetX > 0 ? `+${offsetX}` : offsetX}, {offsetY > 0 ? `+${offsetY}` : offsetY})
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </button>

        {/* Quick Header Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {canHideAvatar && onToggleAvatarHidden && (
            <button
              type="button"
              onClick={() => onToggleAvatarHidden(!isAvatarHidden)}
              title={isAvatarHidden ? "Show avatar on this scene" : "Hide avatar on this scene"}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold border transition-colors cursor-pointer ${
                isAvatarHidden
                  ? "border-amber-500/50 bg-amber-950/50 text-amber-300 hover:bg-amber-900/60"
                  : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {isAvatarHidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              <span className="hidden sm:inline">{isAvatarHidden ? "Hidden" : "Visible"}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleReset}
            disabled={disabled}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-md border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors disabled:opacity-40 cursor-pointer shadow-sm"
            title="Reset to default anchor framing"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset</span>
          </button>

          <div className="h-4 w-px bg-zinc-800 shrink-0 mx-0.5" />

          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? "Expand panel" : "Collapse panel"}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 text-zinc-400 hover:text-white transition-all cursor-pointer"
            title={isCollapsed ? "Expand panel" : "Collapse panel"}
          >
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isCollapsed ? "" : "rotate-180"}`} />
          </button>
        </div>
      </div>

      {/* Expanded Accordion Body */}
      {!isCollapsed && (
        <div className="p-4 pt-1 border-t border-zinc-800/80 space-y-4">
          {/* Avatar Visibility Toggle Card */}
          {canHideAvatar && onToggleAvatarHidden && (
            <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {isAvatarHidden ? (
                  <EyeOff className="h-4 w-4 text-amber-400 shrink-0" />
                ) : (
                  <Eye className="h-4 w-4 text-emerald-400 shrink-0" />
                )}
                <div>
                  <span className="text-xs font-bold text-zinc-200 block">
                    {isAvatarHidden ? "Avatar Hidden on this Scene" : "Avatar Displayed on this Scene"}
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    {isAvatarHidden
                      ? "The scene renders only full-bleed product media, headlines, and audio without an anchor."
                      : "The AI anchor is active, lip-synced, and rendered in the selected framing mode."}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onToggleAvatarHidden(!isAvatarHidden)}
                className={`px-2.5 py-1 rounded-md text-xs font-bold border transition-colors shrink-0 cursor-pointer ${
                  isAvatarHidden
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30"
                    : "bg-zinc-800 text-zinc-300 border-zinc-700 hover:text-white"
                }`}
              >
                {isAvatarHidden ? "Restore Avatar" : "Hide Avatar"}
              </button>
            </div>
          )}

      {/* Grid of Layout Options */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {LAYOUT_OPTIONS.map((opt) => {
          const isSelected = layoutMode === opt.id;
          const Icon = opt.icon;

          return (
            <button
              key={opt.id}
              type="button"
              disabled={disabled}
              onClick={() => onChangeLayoutMode(opt.id)}
              className={`group relative flex flex-col items-start rounded-lg border p-2.5 text-left transition-all ${
                isSelected
                  ? "border-emerald-500/80 bg-emerald-500/10 shadow-sm shadow-emerald-950/50"
                  : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/70"
              } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
            >
              <div className="flex items-center justify-between w-full mb-1.5">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-md ${
                    isSelected
                      ? "bg-emerald-500 text-black font-semibold"
                      : "bg-zinc-800 text-zinc-400 group-hover:text-zinc-200"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span
                  className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${
                    isSelected
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {opt.tag}
                </span>
              </div>

              <div className="text-xs font-semibold text-zinc-200 group-hover:text-white leading-snug">
                {opt.label}
              </div>
              <div className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">
                {opt.sublabel}
              </div>
            </button>
          );
        })}
      </div>

      {/* Circle PiP Bubble Face Auto-Crop & Framing */}
      {layoutMode === "circle_pip" && (
        <div className="rounded-lg border border-cyan-500/40 bg-cyan-950/20 p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <CircleDot className="h-4 w-4 text-cyan-400" />
              <span className="text-xs font-bold text-cyan-200">
                Bubble Face Framing & Crop
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Auto-Centered
              </span>
            </div>

            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                if (onResetBubbleFaceCrop) {
                  onResetBubbleFaceCrop();
                } else {
                  if (onChangeBubbleFaceZoom) onChangeBubbleFaceZoom(1.85);
                  if (onChangeBubbleFaceOffsetY) onChangeBubbleFaceOffsetY(5);
                  if (onChangeBubbleFaceOffsetX) onChangeBubbleFaceOffsetX(0);
                }
              }}
              title="Reset face framing to auto-centered default"
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-cyan-400 hover:text-cyan-200 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded px-2 py-0.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Auto Focus Face</span>
            </button>
          </div>

          <p className="text-[10px] text-zinc-400 leading-tight">
            Automatically crops and locks camera focus onto the anchor's head, eyes, and shoulders inside the circular PiP bubble, eliminating chest/corset cutoffs.
          </p>

          <div className="space-y-2 pt-1">
            {/* Face Zoom / Crop Scale */}
            {onChangeBubbleFaceZoom && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-zinc-300">
                  <span className="flex items-center gap-1">
                    <span>Face Zoom / Crop:</span>
                    <span className="text-zinc-500 text-[10px]">(Default 185%)</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={100}
                      max={280}
                      step={5}
                      value={Math.round(bubbleFaceZoom * 100)}
                      disabled={disabled}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) {
                          onChangeBubbleFaceZoom(Math.max(1.0, Math.min(2.8, val / 100)));
                        }
                      }}
                      className="w-14 bg-black/60 border border-cyan-500/40 rounded px-1 py-0.5 text-cyan-300 font-mono text-[10px] text-right font-bold"
                    />
                    <span className="font-mono text-cyan-500 text-[10px]">%</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={1.0}
                  max={2.8}
                  step={0.05}
                  value={bubbleFaceZoom}
                  disabled={disabled}
                  onChange={(e) => onChangeBubbleFaceZoom(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer disabled:opacity-40"
                />
              </div>
            )}

            {/* Vertical Y Shift and Horizontal X Shift */}
            <div className="grid grid-cols-2 gap-2.5 pt-0.5">
              {onChangeBubbleFaceOffsetY && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-zinc-300">
                    <span>Face Height (Y):</span>
                    <span className="font-mono text-cyan-300 text-[10px] font-bold">
                      {bubbleFaceOffsetY > 0 ? `+${bubbleFaceOffsetY}` : bubbleFaceOffsetY}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-25}
                    max={25}
                    step={1}
                    value={bubbleFaceOffsetY}
                    disabled={disabled}
                    onChange={(e) => onChangeBubbleFaceOffsetY(parseInt(e.target.value, 10) || 0)}
                    title="Move face up (negative) or down (positive) inside the circle"
                    className="w-full accent-cyan-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer disabled:opacity-40"
                  />
                  <div className="flex justify-between text-[9px] text-zinc-500">
                    <span>▲ Crown</span>
                    <span>▼ Shoulders</span>
                  </div>
                </div>
              )}

              {onChangeBubbleFaceOffsetX && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-zinc-300">
                    <span>Face Center (X):</span>
                    <span className="font-mono text-cyan-300 text-[10px] font-bold">
                      {bubbleFaceOffsetX > 0 ? `+${bubbleFaceOffsetX}` : bubbleFaceOffsetX}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-25}
                    max={25}
                    step={1}
                    value={bubbleFaceOffsetX}
                    disabled={disabled}
                    onChange={(e) => onChangeBubbleFaceOffsetX(parseInt(e.target.value, 10) || 0)}
                    title="Shift face left (negative) or right (positive) inside the circle"
                    className="w-full accent-cyan-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer disabled:opacity-40"
                  />
                  <div className="flex justify-between text-[9px] text-zinc-500">
                    <span>◄ Left</span>
                    <span>Right ►</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Scale & Position Sliders */}
      <div className="space-y-3 pt-2 border-t border-zinc-800/80">
        {/* Scale Slider + Presets */}
        {onChangeScale && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400 font-medium flex items-center gap-1.5">
                <span>Zoom / Scale:</span>
                <input
                  type="number"
                  min={40}
                  max={300}
                  step={5}
                  value={Math.round(scale * 100)}
                  disabled={disabled}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) {
                      onChangeScale(Math.max(0.4, Math.min(3.0, val / 100)));
                    }
                  }}
                  className="w-14 bg-black/60 border border-zinc-700/60 rounded px-1 py-0.5 text-emerald-400 font-mono font-bold text-xs text-right"
                />
                <span className="text-emerald-500 font-mono font-bold text-xs">%</span>
              </span>

              {/* Quick Presets */}
              <div className="flex items-center gap-1">
                {SCALE_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    disabled={disabled}
                    onClick={() => onChangeScale(p.value)}
                    className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                      Math.abs(scale - p.value) < 0.03
                        ? "border-emerald-500/60 bg-emerald-500/20 text-emerald-300 font-semibold"
                        : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                    }`}
                  >
                    {Math.round(p.value * 100)}%
                  </button>
                ))}
              </div>
            </div>

            <input
              type="range"
              min={0.2}
              max={3.0}
              step={0.05}
              value={scale}
              disabled={disabled}
              onChange={(e) => onChangeScale(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer disabled:opacity-40"
            />
          </div>
        )}

        {/* 2-Axis Offset Sliders (X and Y) */}
        {(onChangeOffsetX || onChangeOffsetY) && (
          <div className="grid grid-cols-2 gap-3 pt-1">
            {onChangeOffsetX && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>Horizontal (X):</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={offsetX}
                      disabled={disabled}
                      onChange={(e) => onChangeOffsetX(parseInt(e.target.value, 10) || 0)}
                      className="w-16 bg-black/60 border border-zinc-700/60 rounded px-1 py-0.5 text-zinc-200 font-mono text-[10px] text-right"
                    />
                    <span className="font-mono text-zinc-500 text-[10px]">px</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={-1200}
                  max={1200}
                  step={5}
                  value={offsetX}
                  disabled={disabled}
                  onChange={(e) => onChangeOffsetX(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer disabled:opacity-40"
                />
              </div>
            )}

            {onChangeOffsetY && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>Vertical (Y):</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={offsetY}
                      disabled={disabled}
                      onChange={(e) => onChangeOffsetY(parseInt(e.target.value, 10) || 0)}
                      className="w-16 bg-black/60 border border-zinc-700/60 rounded px-1 py-0.5 text-zinc-200 font-mono text-[10px] text-right"
                    />
                    <span className="font-mono text-zinc-500 text-[10px]">px</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={-1400}
                  max={1400}
                  step={5}
                  value={offsetY}
                  disabled={disabled}
                  onChange={(e) => onChangeOffsetY(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer disabled:opacity-40"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Glassmorphic Nametag & Badge Settings */}
      {(onChangeShowNametag || onChangePresenterName || onChangePresenterTitle) && (
        <div className="pt-2 border-t border-zinc-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
              <Tag className="h-3.5 w-3.5 text-emerald-400" />
              <span>Broadcast Name Plate & Lower Third</span>
            </div>

            {onChangeShowNametag && (
              <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showNametag}
                  disabled={disabled}
                  onChange={(e) => onChangeShowNametag(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500/20"
                />
                <span>Visible</span>
              </label>
            )}
          </div>

          {showNametag && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              {onChangePresenterName && (
                <div>
                  <label className="block text-[10px] text-zinc-400 mb-1">
                    Spokesperson Name
                  </label>
                  <input
                    type="text"
                    value={presenterName}
                    disabled={disabled}
                    onChange={(e) => onChangePresenterName(e.target.value)}
                    placeholder="e.g. Ruby Vance"
                    className="w-full rounded-md border border-zinc-800 bg-zinc-900/80 px-2.5 py-1 text-xs text-zinc-200 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              )}

              {onChangePresenterTitle && (
                <div>
                  <label className="block text-[10px] text-zinc-400 mb-1">
                    Title / Role Tag
                  </label>
                  <input
                    type="text"
                    value={presenterTitle}
                    disabled={disabled}
                    onChange={(e) => onChangePresenterTitle(e.target.value)}
                    placeholder="e.g. Product Specialist"
                    className="w-full rounded-md border border-zinc-800 bg-zinc-900/80 px-2.5 py-1 text-xs text-zinc-200 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
        </div>
      )}
    </div>
  );
}
