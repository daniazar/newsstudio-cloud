"use client";

import React from "react";
import {
  UserCheck,
  Eye,
  EyeOff,
  Sparkles,
  RotateCcw,
  Maximize2,
  Columns,
  CircleDot,
  CornerDownRight,
  CornerDownLeft,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import type {
  AdPresenterConfig,
  PresenterLayoutMode,
  ScenePresenterMode,
  ScenePresenterSettings,
} from "@/lib/types/ecommerce";
import { getPersonaById, PERSONAS, type Persona } from "@/lib/tts/personas";
import {
  getScenePresenterMode,
  resolveEffectivePresenter,
} from "@/lib/ecommerce/presenterResolver";

export interface ScenePresenterControlsProps {
  sceneIndex: number;
  scenePresenter?: ScenePresenterSettings | null;
  videoPresenter: AdPresenterConfig;
  onChangeScenePresenter: (settings: ScenePresenterSettings | null) => void;
  onOpenFullPresenterSuite?: () => void;
  className?: string;
  compact?: boolean;
  defaultCollapsed?: boolean;
}

interface LayoutModeOption {
  id: PresenterLayoutMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const LAYOUT_MODE_OPTIONS: LayoutModeOption[] = [
  { id: "full_screen", label: "Full Screen", icon: Maximize2 },
  { id: "circle_pip", label: "Circle PiP", icon: CircleDot },
  { id: "bottom_right", label: "Corner Right", icon: CornerDownRight },
  { id: "bottom_left", label: "Corner Left", icon: CornerDownLeft },
  { id: "side_full_left", label: "Split Left", icon: Columns },
  { id: "side_full_right", label: "Split Right", icon: Columns },
];

function ScenePresenterControlsComponent({
  sceneIndex,
  scenePresenter,
  videoPresenter,
  onChangeScenePresenter,
  onOpenFullPresenterSuite,
  className = "",
  compact: _compact = false,
  defaultCollapsed = true,
}: ScenePresenterControlsProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);

  const currentMode: ScenePresenterMode = getScenePresenterMode(scenePresenter);
  const effectivePresenter = resolveEffectivePresenter(videoPresenter, scenePresenter);

  const effectivePersona = getPersonaById(effectivePresenter?.personaId || videoPresenter.personaId || "sofia");
  const videoPersona = getPersonaById(videoPresenter.personaId || "sofia");

  const isOverrideActive = Boolean(
    scenePresenter?.overrideDefault === true ||
    (scenePresenter?.overrideDefault !== false && (currentMode === "custom" || currentMode === "hidden"))
  );

  const handleResetToDefault = () => {
    onChangeScenePresenter(null);
  };

  const handleSetMode = (newMode: ScenePresenterMode) => {
    if (newMode === "inherit") {
      onChangeScenePresenter(null);
      return;
    }

    if (newMode === "hidden") {
      onChangeScenePresenter({
        mode: "hidden",
        overrideDefault: true,
        enabled: false,
      });
      return;
    }

    // Custom mode: inherit video presenter as base and allow overrides
    onChangeScenePresenter({
      mode: "custom",
      overrideDefault: true,
      enabled: true,
      personaId: scenePresenter?.personaId || videoPresenter.personaId,
      layoutMode: scenePresenter?.layoutMode || videoPresenter.layoutMode || "bottom_right",
      position: scenePresenter?.position || videoPresenter.position || "bottom_right",
      scale: scenePresenter?.scale ?? videoPresenter.scale ?? 1.0,
      offsetX: scenePresenter?.offsetX ?? videoPresenter.offsetX ?? 0,
      offsetY: scenePresenter?.offsetY ?? videoPresenter.offsetY ?? 0,
      showNametag: scenePresenter?.showNametag ?? videoPresenter.showNametag ?? true,
      avatarSrc: scenePresenter?.avatarSrc || videoPresenter.avatarSrc,
      presenterName: scenePresenter?.presenterName || videoPresenter.presenterName,
      roleTag: scenePresenter?.roleTag || videoPresenter.roleTag,
    });
  };

  const handleUpdateOverride = (patch: Partial<ScenePresenterSettings>) => {
    onChangeScenePresenter({
      mode: "custom",
      overrideDefault: true,
      enabled: true,
      ...(scenePresenter || {}),
      ...patch,
    });
  };

  return (
    <div className={`rounded-xl border border-zinc-800 bg-zinc-950/70 backdrop-blur-md overflow-hidden transition-all ${className}`}>
      {/* 1. Header with Effective Presenter Status & Collapse Toggle */}
      <div className="p-3.5 border-b border-zinc-800/80 flex items-center justify-between gap-3 select-none">
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer group flex-1"
        >
          <div className="relative h-8 w-8 rounded-full overflow-hidden border border-zinc-700 bg-zinc-800 shrink-0 group-hover:border-purple-500 transition-colors">
            {effectivePresenter?.enabled && effectivePresenter.avatarSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={effectivePresenter.avatarSrc}
                alt={effectivePresenter.presenterName || "Avatar"}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/placeholder_product.png";
                }}
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-zinc-500">
                <EyeOff className="h-4 w-4" />
              </div>
            )}
            {currentMode === "custom" && (
              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-purple-500 border border-zinc-950" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-100 group-hover:text-white transition-colors truncate">
                Scene #{sceneIndex + 1} Avatar
              </span>
              {currentMode === "inherit" && (
                <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded-full border border-zinc-700/50 shrink-0">
                  Inheriting Default
                </span>
              )}
              {currentMode === "custom" && (
                <span className="text-[10px] font-bold text-purple-300 bg-purple-950/70 px-2 py-0.5 rounded-full border border-purple-500/40 shrink-0 flex items-center gap-1">
                  <Sparkles className="h-2.5 w-2.5 text-purple-400" />
                  Custom Override
                </span>
              )}
              {currentMode === "hidden" && (
                <span className="text-[10px] font-semibold text-amber-300 bg-amber-950/70 px-2 py-0.5 rounded-full border border-amber-500/40 shrink-0 flex items-center gap-1">
                  <EyeOff className="h-2.5 w-2.5" />
                  Hidden on Scene
                </span>
              )}
            </div>

            <p className="text-[11px] text-zinc-400 truncate">
              {currentMode === "hidden"
                ? "No avatar displayed in this scene"
                : `${effectivePresenter?.presenterName || effectivePersona?.name || "Anchor"} • ${(
                    effectivePresenter?.layoutMode || "bottom_right"
                  ).replace(/_/g, " ")}`}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Quick Hide/Show Toggle */}
          <button
            type="button"
            onClick={() => handleSetMode(currentMode === "hidden" ? "inherit" : "hidden")}
            title={currentMode === "hidden" ? "Restore avatar for this scene" : "Hide avatar on this scene"}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold border transition-colors cursor-pointer ${
              currentMode === "hidden"
                ? "border-amber-500/50 bg-amber-950/50 text-amber-300 hover:bg-amber-900/60"
                : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {currentMode === "hidden" ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            <span className="hidden sm:inline">{currentMode === "hidden" ? "Hidden" : "Visible"}</span>
          </button>

          {onOpenFullPresenterSuite && (
            <button
              type="button"
              onClick={onOpenFullPresenterSuite}
              className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-colors shrink-0"
              title="Open Presenter Studio"
            >
              <span>Suite</span>
              <ExternalLink className="h-3 w-3" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-900 transition-transform cursor-pointer"
            title={isCollapsed ? "Expand scene presenter controls" : "Collapse scene presenter controls"}
          >
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isCollapsed ? "" : "rotate-180"}`} />
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="space-y-0">

      {/* 2. Override Commercial Default Checkbox & Reset Button */}
      <div className="p-3 bg-zinc-900/60 border-b border-zinc-800/70 flex items-center justify-between gap-3">
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isOverrideActive}
            onChange={(e) => {
              if (e.target.checked) {
                handleSetMode("custom");
              } else {
                handleResetToDefault();
              }
            }}
            className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-purple-600 focus:ring-purple-500 cursor-pointer"
          />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
              <span>Override Commercial Default Presenter</span>
              {isOverrideActive && (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                  OVERRIDE ACTIVE
                </span>
              )}
            </span>
            <span className="text-[10px] text-zinc-400">
              {isOverrideActive
                ? "Scene defines bespoke anchor, layout framing, and positioning."
                : "Disabled by default. Scene cleanly inherits commercial anchor defaults."}
            </span>
          </div>
        </label>

        {isOverrideActive && (
          <button
            type="button"
            onClick={handleResetToDefault}
            className="flex items-center gap-1 text-[11px] font-semibold text-zinc-400 hover:text-white px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-colors shrink-0"
            title="Revert scene to commercial default"
          >
            <RotateCcw className="h-3 w-3 text-cyan-400" />
            <span>Reset to Default</span>
          </button>
        )}
      </div>

      {isOverrideActive && (
        /* Three-Way Mode Segmented Switch */
        <div className="p-3 bg-zinc-900/40 border-b border-zinc-800/50">
          <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-900 rounded-lg border border-zinc-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => handleSetMode("inherit")}
              className={`py-1.5 px-2 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                currentMode === "inherit"
                  ? "bg-zinc-800 text-white shadow-sm border border-zinc-700"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <UserCheck className="h-3.5 w-3.5 text-cyan-400" />
              <span>Inherit Default</span>
            </button>

            <button
              type="button"
              onClick={() => handleSetMode("custom")}
              className={`py-1.5 px-2 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                currentMode === "custom"
                  ? "bg-purple-600 text-white shadow-sm font-bold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-purple-300" />
              <span>Custom Override</span>
            </button>

            <button
              type="button"
              onClick={() => handleSetMode("hidden")}
              className={`py-1.5 px-2 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                currentMode === "hidden"
                  ? "bg-amber-600/90 text-white shadow-sm font-bold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <EyeOff className="h-3.5 w-3.5 text-amber-200" />
              <span>Hide on Scene</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Tab Body based on active mode */}
      <div className="p-3.5 space-y-3.5">
        {/* MODE: INHERIT */}
        {currentMode === "inherit" && (
          <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/30 flex items-center justify-between gap-3">
            <div className="text-xs text-zinc-400">
              <span className="font-semibold text-zinc-200 block">Using Video-Level Default</span>
              <span>
                {videoPersona?.name || "Default Anchor"} • {(videoPresenter.layoutMode || "bottom_right").replace(/_/g, " ")} ({Math.round((videoPresenter.scale || 1.0) * 100)}% scale)
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleSetMode("custom")}
              className="px-2.5 py-1 text-xs font-semibold rounded bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 transition-colors shrink-0"
            >
              ✨ Customize for this Scene
            </button>
          </div>
        )}

        {/* MODE: HIDDEN */}
        {currentMode === "hidden" && (
          <div className="p-3 rounded-lg border border-amber-900/40 bg-amber-950/20 flex items-center justify-between gap-3">
            <div className="text-xs text-zinc-300">
              <span className="font-semibold text-amber-400 block">Avatar Hidden on Scene #{sceneIndex + 1}</span>
              <span className="text-[11px] text-zinc-400">
                Ideal for macro detail shots, 3D exploded views, and full-bleed media.
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleSetMode("inherit")}
              className="px-2.5 py-1 text-xs font-semibold rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors shrink-0"
            >
              ↩ Restore Default
            </button>
          </div>
        )}

        {/* MODE: CUSTOM OVERRIDE */}
        {currentMode === "custom" && (
          <div className="space-y-3">
            {/* Persona Switcher for this Scene */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-zinc-300">
                  Scene Persona
                </label>
                <span className="text-[10px] text-purple-400">
                  Overrides video anchor ({videoPersona?.name || "Sofia"})
                </span>
              </div>

              <div className="relative">
                <select
                  value={effectivePresenter?.personaId || "sofia"}
                  onChange={(e) => {
                    const persona = getPersonaById(e.target.value);
                    handleUpdateOverride({
                      personaId: e.target.value,
                      presenterName: persona?.name,
                      roleTag: persona?.title,
                      avatarSrc: persona?.avatarUrl,
                    });
                  }}
                  className="w-full appearance-none bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 transition-colors"
                >
                  {PERSONAS.map((p: Persona) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.title} ({p.language.toUpperCase()} • {p.gender})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
              </div>
            </div>

            {/* Layout Mode Grid */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-zinc-300 block">
                Camera & Layout Framing
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {LAYOUT_MODE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = (effectivePresenter?.layoutMode || "bottom_right") === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleUpdateOverride({ layoutMode: opt.id, position: opt.id })}
                      className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg border text-center transition-all ${
                        isSelected
                          ? "bg-purple-950/60 border-purple-500 text-purple-200 shadow-sm"
                          : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${isSelected ? "text-purple-400" : "text-zinc-400"}`} />
                      <span className="text-[10px] font-medium leading-tight">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scale Slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-300">Avatar Scale</span>
                <span className="text-purple-400 font-bold">
                  {Math.round((effectivePresenter?.scale || 1.0) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.6"
                max="1.5"
                step="0.05"
                value={effectivePresenter?.scale || 1.0}
                onChange={(e) => handleUpdateOverride({ scale: parseFloat(e.target.value) })}
                className="w-full accent-purple-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg appearance-none"
              />
            </div>

            {/* Nametag & Badge Toggle */}
            <div className="flex items-center justify-between pt-1">
              <label className="text-[11px] text-zinc-300 flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={effectivePresenter?.showNametag !== false}
                  onChange={(e) =>
                    handleUpdateOverride({
                      showNametag: e.target.checked,
                      showNameBadge: e.target.checked,
                    })
                  }
                  className="rounded border-zinc-700 text-purple-600 focus:ring-0 cursor-pointer"
                />
                <span>Display Presenter Name Badge on this Scene</span>
              </label>

              <button
                type="button"
                onClick={() => handleSetMode("inherit")}
                className="text-[10px] text-zinc-400 hover:text-red-400 flex items-center gap-1 transition-colors"
                title="Reset this scene to use commercial default"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset to Default</span>
              </button>
            </div>
          </div>
        )}
      </div>
        </div>
      )}
    </div>
  );
}

export const ScenePresenterControls = React.memo(ScenePresenterControlsComponent);
