"use client";

import React, { useState } from "react";
import {
  Sun,
  Shield,
  Sliders,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Check,
} from "lucide-react";
import {
  LightingEnvironmentConfig,
  LightingPresetId,
  LightDirection,
  STUDIO_LIGHTING_PRESETS,
  LIGHTING_PRESET_LIST,
  compileLightingFormulaBadge,
  analyzeLoopBackgroundBleed,
} from "@/lib/wardrobe/lightingEngine";

export interface LightingCalibrationPanelProps {
  lightingConfig: LightingEnvironmentConfig;
  onChange: (config: LightingEnvironmentConfig) => void;
  sourceLoopUrl?: string;
  className?: string;
}

const BLEED_TINT_PRESETS = [
  { id: "chroma_green", label: "Chroma Green", hex: "#4C9C13" },
  { id: "led_cyan", label: "LED Wall Cyan", hex: "#0284C7" },
  { id: "warm_oak", label: "News Desk Oak", hex: "#9A3412" },
  { id: "cyber_magenta", label: "Neon Magenta", hex: "#D946EF" },
  { id: "noir_shadow", label: "Noir Shadow", hex: "#111827" },
];

export const LightingCalibrationPanel = React.memo(function LightingCalibrationPanel({
  lightingConfig,
  onChange,
  sourceLoopUrl,
  className = "",
}: LightingCalibrationPanelProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [showAdvancedRig, setShowAdvancedRig] = useState<boolean>(false);

  const formulaBadge = compileLightingFormulaBadge(lightingConfig);

  // Handle preset selection
  const handleSelectPreset = (presetId: LightingPresetId) => {
    const base = STUDIO_LIGHTING_PRESETS[presetId];
    if (!base) return;

    // Preserve any existing detected loop bleed if desired
    let bleed = base.ambientBleed;
    if (sourceLoopUrl && base.ambientBleed.bounceType === "chroma_green") {
      bleed = analyzeLoopBackgroundBleed(sourceLoopUrl);
    }

    onChange({
      ...base,
      ambientBleed: bleed,
      ambientTintHex: bleed.dominantHex,
      keyDirection: lightingConfig.keyDirection || base.keyDirection,
      rimLightWrap: lightingConfig.rimLightWrap ?? base.rimLightWrap,
      despillEnabled: lightingConfig.despillEnabled ?? base.despillEnabled,
    });
  };

  // Direction toggle
  const handleDirectionChange = (direction: LightDirection) => {
    onChange({
      ...lightingConfig,
      keyDirection: direction,
      keyLight: {
        ...lightingConfig.keyLight,
        direction,
      },
    });
  };

  // Rim wrap slider
  const handleRimWrapChange = (wrap: number) => {
    onChange({
      ...lightingConfig,
      rimLightWrap: wrap,
    });
  };

  // Despill toggle
  const handleToggleDespill = () => {
    onChange({
      ...lightingConfig,
      despillEnabled: !lightingConfig.despillEnabled,
    });
  };

  // Bleed tint override
  const handleSelectTint = (hex: string) => {
    onChange({
      ...lightingConfig,
      ambientTintHex: hex,
      ambientBleed: {
        ...lightingConfig.ambientBleed,
        dominantHex: hex,
        bounceType: "custom",
        name: `Custom Bleed (${hex})`,
      },
    });
  };

  // Auto-detect from loop
  const handleAutoDetectFromLoop = () => {
    if (!sourceLoopUrl) return;
    const detected = analyzeLoopBackgroundBleed(sourceLoopUrl);
    onChange({
      ...lightingConfig,
      ambientBleed: detected,
      ambientTintHex: detected.dominantHex,
      despillEnabled: detected.despillWrap,
    });
  };

  return (
    <div
      className={`rounded-2xl bg-surface-raised/60 border border-border/80 overflow-hidden transition-all ${className}`}
      data-testid="lighting-calibration-panel"
    >
      {/* Header bar with toggle */}
      <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-surface-raised/90 border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Sun className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-foreground">
                Environment Lighting & Spill Matrix
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-400/20 font-semibold">
                Phase 4
              </span>
            </div>
            <p className="text-[10px] text-muted font-mono truncate max-w-md sm:max-w-lg">
              {formulaBadge}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
          {sourceLoopUrl && (
            <button
              type="button"
              onClick={handleAutoDetectFromLoop}
              title="Sample background bleed from selected loop"
              className="px-2 py-1 rounded-lg bg-surface border border-border text-[9px] font-mono text-purple-300 hover:text-purple-200 hover:border-purple-500/40 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-2.5 h-2.5 text-purple-400" />
              <span>Sample Set</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
            aria-label="Toggle Lighting Panel"
            className="p-1 rounded-lg hover:bg-surface text-muted hover:text-foreground transition-colors cursor-pointer"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 flex flex-col gap-4">
          {/* Preset Chips */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted">
              Studio Environment Profiles
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {LIGHTING_PRESET_LIST.map((p) => {
                const isSelected = lightingConfig.presetId === p.presetId;
                return (
                  <button
                    key={p.presetId}
                    type="button"
                    onClick={() => handleSelectPreset(p.presetId)}
                    className={`p-2 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-purple-600/15 border-purple-500 text-white shadow-sm shadow-purple-600/20"
                        : "bg-surface/80 border-border/80 text-muted hover:text-foreground hover:border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                          style={{
                            backgroundColor: p.keyLight.hex,
                            boxShadow: `0 0 6px ${p.keyLight.hex}80`,
                          }}
                        />
                        <span className="text-[11px] font-mono font-bold truncate">
                          {p.presetName}
                        </span>
                      </div>
                      {isSelected && (
                        <Check className="w-3 h-3 text-purple-400 shrink-0" />
                      )}
                    </div>
                    <span className="text-[9px] font-mono text-subtle">
                      {`${p.keyLight.colorTempK}K • ${p.ambientBleed.name.split(" ")[0]}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Controls: Key Direction, Rim Wrap, Despill, Ambient Bleed */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 border-t border-border/60">
            {/* 1. Key Light Direction */}
            <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-surface/50 border border-border/60">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted flex items-center justify-between">
                <span>Key Light Vector</span>
                <span className="text-amber-400">
                  {`${lightingConfig.keyLight.colorTempK}K`}
                </span>
              </span>
              <div className="grid grid-cols-3 gap-1 mt-0.5">
                {(["left", "center", "right"] as LightDirection[]).map((dir) => {
                  const active = lightingConfig.keyDirection === dir;
                  const label =
                    dir === "left"
                      ? "45° Left"
                      : dir === "right"
                      ? "45° Right"
                      : "Center";
                  return (
                    <button
                      key={dir}
                      type="button"
                      onClick={() => handleDirectionChange(dir)}
                      className={`px-2 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                        active
                          ? "bg-purple-600 text-white shadow-xs"
                          : "bg-surface-raised border border-border text-muted hover:text-white"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <span className="text-[9px] text-subtle font-mono mt-0.5">
                Angles fabric fold shading and hair highlight reflections.
              </span>
            </div>

            {/* 2. Rim Light Wrap & Chroma Despill */}
            <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-surface/50 border border-border/60">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted">
                  Rim Wrap & Despill
                </span>
                <span className="text-[10px] font-mono font-bold text-cyan-400">
                  {`${lightingConfig.rimLightWrap}%`}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={lightingConfig.rimLightWrap}
                onChange={(e) => handleRimWrapChange(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-surface-raised rounded-lg mt-1"
                aria-label="Rim Light Wrap Percentage"
              />
              <div className="flex items-center justify-between mt-1">
                <span className="text-[9px] font-mono text-muted flex items-center gap-1">
                  <Shield className="w-3 h-3 text-emerald-400" />
                  <span>Chroma Despill Shield</span>
                </span>
                <button
                  type="button"
                  onClick={handleToggleDespill}
                  className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-bold transition-all cursor-pointer ${
                    lightingConfig.despillEnabled
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50"
                      : "bg-surface-raised text-muted border border-border hover:text-white"
                  }`}
                >
                  {lightingConfig.despillEnabled ? "ACTIVE (ON)" : "BYPASS (OFF)"}
                </button>
              </div>
            </div>

            {/* 3. Ambient Bleed Tint */}
            <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-surface/50 border border-border/60">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted">
                  Ambient Set Bleed
                </span>
                <span
                  className="w-3 h-3 rounded-full border border-white/20 shrink-0 shadow-xs"
                  style={{ backgroundColor: lightingConfig.ambientTintHex || lightingConfig.ambientBleed.dominantHex }}
                />
              </div>

              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                {BLEED_TINT_PRESETS.map((t) => {
                  const isCurrent =
                    (lightingConfig.ambientTintHex || lightingConfig.ambientBleed.dominantHex).toLowerCase() ===
                    t.hex.toLowerCase();
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleSelectTint(t.hex)}
                      title={t.label}
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
                        isCurrent
                          ? "border-white scale-110 shadow-sm"
                          : "border-border/80 opacity-70 hover:opacity-100 hover:scale-105"
                      }`}
                      style={{ backgroundColor: t.hex }}
                    >
                      {isCurrent && <Check className="w-2.5 h-2.5 text-white" />}
                    </button>
                  );
                })}

                <input
                  type="text"
                  value={lightingConfig.ambientTintHex || lightingConfig.ambientBleed.dominantHex}
                  onChange={(e) => handleSelectTint(e.target.value)}
                  placeholder="#4C9C13"
                  className="w-16 px-1.5 py-0.5 rounded bg-surface border border-border text-[9px] font-mono text-foreground focus:outline-none focus:border-purple-500"
                />
              </div>

              <span className="text-[9px] text-subtle font-mono truncate mt-0.5">
                {lightingConfig.ambientBleed.name}
              </span>
            </div>
          </div>

          {/* Advanced 3-Point Light Breakdown Toggle */}
          <div className="border border-border/60 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdvancedRig(!showAdvancedRig)}
              className="w-full px-3 py-1.5 bg-surface/80 flex items-center justify-between text-left text-[10px] font-mono font-bold text-muted hover:text-foreground cursor-pointer transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3 h-3 text-purple-400" />
                <span>3-Point Photometric Breakdown</span>
              </span>
              {showAdvancedRig ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>

            {showAdvancedRig && (
              <div className="p-3 bg-black/40 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] font-mono">
                <div className="p-2 rounded-lg bg-surface/50 border border-border/40 flex flex-col gap-0.5">
                  <span className="text-amber-300 font-bold">Key Light</span>
                  <span className="text-muted">{lightingConfig.keyLight.name}</span>
                  <span className="text-subtle">
                    {lightingConfig.keyLight.colorTempK}K • {lightingConfig.keyLight.intensity}% Int • Dir: {lightingConfig.keyDirection}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-surface/50 border border-border/40 flex flex-col gap-0.5">
                  <span className="text-sky-300 font-bold">Fill Light</span>
                  <span className="text-muted">{lightingConfig.fillLight.name}</span>
                  <span className="text-subtle">
                    {lightingConfig.fillLight.colorTempK}K • {lightingConfig.fillLight.intensity}% Int • Soft
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-surface/50 border border-border/40 flex flex-col gap-0.5">
                  <span className="text-cyan-300 font-bold">Rim Light</span>
                  <span className="text-muted">{lightingConfig.rimLight.name}</span>
                  <span className="text-subtle">
                    {lightingConfig.rimLight.colorTempK}K • {lightingConfig.rimLight.intensity}% Int • {lightingConfig.rimLightWrap}% Wrap
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
