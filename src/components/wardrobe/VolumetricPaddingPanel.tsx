"use client";

import React from "react";
import { Maximize2, Sparkles, Sliders, RefreshCw, ShieldCheck } from "lucide-react";
import {
  VolumetricPaddingConfig,
  BoundaryDecayCurve,
  compileVolumetricPromptDirectives,
} from "@/lib/wardrobe/volumetricPaddingEngine";

export interface VolumetricPaddingPanelProps {
  paddingConfig: VolumetricPaddingConfig;
  onChange: (config: VolumetricPaddingConfig) => void;
  onResetAuto?: () => void;
  detectedSilhouetteName?: string;
}

export const VolumetricPaddingPanel: React.FC<VolumetricPaddingPanelProps> = ({
  paddingConfig,
  onChange,
  onResetAuto,
  detectedSilhouetteName = "Standard Broadcast Cut",
}) => {
  const directives = compileVolumetricPromptDirectives(paddingConfig);

  const handleHorizontalChange = (val: number) => {
    onChange({
      ...paddingConfig,
      paddingLeftPercent: val,
      paddingRightPercent: val,
      autoVolumetricEnabled: false,
    });
  };

  const handleVerticalChange = (val: number) => {
    onChange({
      ...paddingConfig,
      paddingTopPercent: val,
      paddingBottomPercent: val,
      autoVolumetricEnabled: false,
    });
  };

  const handleFeatherChange = (val: number) => {
    onChange({
      ...paddingConfig,
      featherRadiusPixels: val,
      autoVolumetricEnabled: false,
    });
  };

  const handleDecayCurveChange = (curve: BoundaryDecayCurve) => {
    onChange({
      ...paddingConfig,
      boundaryDecay: curve,
      autoVolumetricEnabled: false,
    });
  };

  const handleToggleAuto = () => {
    if (!paddingConfig.autoVolumetricEnabled && onResetAuto) {
      onResetAuto();
    } else {
      onChange({
        ...paddingConfig,
        autoVolumetricEnabled: !paddingConfig.autoVolumetricEnabled,
      });
    }
  };

  const handleToggleAdaptiveSet = () => {
    onChange({
      ...paddingConfig,
      adaptiveSetExpansion: !paddingConfig.adaptiveSetExpansion,
      autoVolumetricEnabled: false,
    });
  };

  const avgH = Math.round((paddingConfig.paddingLeftPercent + paddingConfig.paddingRightPercent) / 2);
  const avgV = Math.round((paddingConfig.paddingTopPercent + paddingConfig.paddingBottomPercent) / 2);

  return (
    <div className="p-4 rounded-2xl bg-surface-raised border border-border flex flex-col gap-3 shadow-md">
      {/* Header & Badges */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Maximize2 className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground">
                Volumetric Mask Padding &amp; Edge Feathering
              </span>
              <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[9px] font-mono font-bold uppercase tracking-wider">
                Phase 6
              </span>
            </div>
            <p className="text-[10px] text-muted">
              Dynamically expands SAM 3.1 crop box to eliminate clipping on afro curls, wide lapels, and virtual sets.
            </p>
          </div>
        </div>

        {/* Live Formula Badge */}
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-purple-950/60 border border-purple-500/40 text-[10px] font-mono text-purple-300 font-bold">
            {directives.formulaBadge}
          </span>
          <button
            onClick={handleToggleAuto}
            className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold border transition-colors flex items-center gap-1 ${
              paddingConfig.autoVolumetricEnabled
                ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-400"
                : "bg-surface border-border text-muted hover:text-foreground"
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>{paddingConfig.autoVolumetricEnabled ? "AUTO: ON" : "MANUAL"}</span>
          </button>
        </div>
      </div>

      {/* Auto-Detection Context Banner */}
      <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-black/40 border border-border/60 text-[11px] font-mono">
        <div className="flex items-center gap-2 text-muted">
          <span className="text-purple-400 font-bold">Target Silhouette:</span>
          <span className="text-foreground">{detectedSilhouetteName}</span>
          <span className="px-1.5 py-0.2 rounded bg-purple-900/40 text-purple-300 text-[9px] uppercase font-bold">
            {paddingConfig.silhouetteClass}
          </span>
        </div>

        {onResetAuto && !paddingConfig.autoVolumetricEnabled && (
          <button
            onClick={onResetAuto}
            className="text-[10px] text-purple-400 hover:text-purple-300 underline flex items-center gap-1"
          >
            <RefreshCw className="w-2.5 h-2.5" />
            <span>Recalibrate Auto</span>
          </button>
        )}
      </div>

      {/* Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {/* Horizontal Expansion Slider */}
        <div className="p-3 rounded-xl bg-black/20 border border-border/50 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted flex items-center gap-1.5 font-medium">
              <Sliders className="w-3.5 h-3.5 text-purple-400" />
              Lateral Expansion (Width / Shoulders / Curls)
            </span>
            <span className="text-purple-300 font-mono font-bold">+{avgH}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="50"
            step="1"
            value={avgH}
            onChange={(e) => handleHorizontalChange(Number(e.target.value))}
            className="w-full accent-purple-500 cursor-pointer"
            aria-label="Lateral expansion percentage"
          />
          <div className="flex justify-between text-[9px] font-mono text-muted">
            <span>0% (Tight Crop)</span>
            <span>+25% (Wide Lapel / Waves)</span>
            <span>+50% (Full Afro Wingspan)</span>
          </div>
        </div>

        {/* Vertical Expansion Slider */}
        <div className="p-3 rounded-xl bg-black/20 border border-border/50 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted flex items-center gap-1.5 font-medium">
              <Sliders className="w-3.5 h-3.5 text-purple-400" />
              Vertical Expansion (Crown / Updo / Hemline)
            </span>
            <span className="text-purple-300 font-mono font-bold">+{avgV}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="50"
            step="1"
            value={avgV}
            onChange={(e) => handleVerticalChange(Number(e.target.value))}
            className="w-full accent-purple-500 cursor-pointer"
            aria-label="Vertical expansion percentage"
          />
          <div className="flex justify-between text-[9px] font-mono text-muted">
            <span>0% (Standard Headroom)</span>
            <span>+25% (High Ponytail / Bouffant)</span>
            <span>+50% (Max Headroom)</span>
          </div>
        </div>

        {/* Feather Radius Slider */}
        <div className="p-3 rounded-xl bg-black/20 border border-border/50 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              Radial Border Feathering
            </span>
            <span className="text-purple-300 font-mono font-bold">
              {paddingConfig.featherRadiusPixels}px
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="64"
            step="2"
            value={paddingConfig.featherRadiusPixels}
            onChange={(e) => handleFeatherChange(Number(e.target.value))}
            className="w-full accent-purple-500 cursor-pointer"
            aria-label="Feather radius pixels"
          />
          <div className="flex justify-between text-[9px] font-mono text-muted">
            <span>0px (Hard Edge)</span>
            <span>16px (Standard Soft)</span>
            <span>64px (Deep Dissolve)</span>
          </div>
        </div>

        {/* Boundary Decay Curve & Set Adaptability */}
        <div className="p-3 rounded-xl bg-black/20 border border-border/50 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted font-medium">Boundary Decay Curve:</span>
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-black/50 border border-border">
              {(["linear", "smoothstep", "cosine"] as BoundaryDecayCurve[]).map((curve) => (
                <button
                  key={curve}
                  type="button"
                  onClick={() => handleDecayCurveChange(curve)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold capitalize transition-colors ${
                    paddingConfig.boundaryDecay === curve
                      ? "bg-purple-600 text-white"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {curve}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-border/40">
            <span className="text-[11px] text-muted">Virtual Set Adaptability</span>
            <button
              type="button"
              onClick={handleToggleAdaptiveSet}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors ${
                paddingConfig.adaptiveSetExpansion
                  ? "bg-purple-950/50 border-purple-500/60 text-purple-300"
                  : "bg-surface border-border text-muted"
              }`}
            >
              {paddingConfig.adaptiveSetExpansion ? "ACTIVE (COSINE BLEND)" : "OFF (GREEN CHROMA)"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
