"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  Palette,
  Check,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Layers,
  Flame,
  Star,
  Sliders,
  Moon,
  CircleDot,
} from "lucide-react";
import {
  HairColorSwatch,
  HairColorTechnique,
  HairColorDimension,
  HairToneSpec,
  SOLID_HAIR_COLOR_SWATCHES,
  SALON_DUAL_TONE_PRESETS,
  compileSalonFormulaBadge,
  getSwatchCssBackground,
  createCustomDualToneSwatch,
} from "@/lib/wardrobe/hairCatalog";

export interface SalonColorSelectorProps {
  activeSwatch?: HairColorSwatch | null;
  onSwatchSelect?: (swatch: HairColorSwatch | null) => void;
  variant?: "compact" | "full";
  className?: string;
  showFormulaBadge?: boolean;
}

interface TechniqueOption {
  id: HairColorTechnique;
  label: string;
  shortDesc: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TECHNIQUES: TechniqueOption[] = [
  { id: "solid", label: "Solid", shortDesc: "Single Process", icon: CircleDot },
  { id: "balayage", label: "Balayage", shortDesc: "Hand-Painted Melt", icon: Flame },
  { id: "ombre", label: "Ombré", shortDesc: "Gradient Dip", icon: Sliders },
  { id: "highlights", label: "Highlights", shortDesc: "Foil Babylights", icon: Layers },
  { id: "money_piece", label: "Money Piece", shortDesc: "Face-Framing", icon: Star },
  { id: "shadow_root", label: "Shadow Root", shortDesc: "Smoky Base", icon: Moon },
];

const DIMENSIONS: { id: HairColorDimension; label: string; desc: string }[] = [
  { id: "subtle", label: "Subtle", desc: "Soft natural blend" },
  { id: "medium", label: "Medium", desc: "Salon balanced" },
  { id: "bold", label: "Bold", desc: "High contrast drama" },
];

export const SalonColorSelector = React.memo(function SalonColorSelector({
  activeSwatch,
  onSwatchSelect,
  className = "",
  showFormulaBadge = true,
}: SalonColorSelectorProps) {
  const [selectedTechnique, setSelectedTechnique] = useState<HairColorTechnique>(
    activeSwatch?.technique || "solid"
  );
  const [selectedDimension, setSelectedDimension] = useState<HairColorDimension>(
    activeSwatch?.dimension || "medium"
  );
  const [isCustomOpen, setIsCustomOpen] = useState<boolean>(false);

  // Custom tone formulation state
  const [customRootTone, setCustomRootTone] = useState<HairToneSpec>({
    hex: activeSwatch?.rootTone?.hex || "#241812",
    name: activeSwatch?.rootTone?.name || "Dark Espresso",
    description: activeSwatch?.rootTone?.description || "dark espresso root",
  });
  const [customTipTone, setCustomTipTone] = useState<HairToneSpec>({
    hex: activeSwatch?.tipTone?.hex || "#E8C07A",
    name: activeSwatch?.tipTone?.name || "Warm Honey",
    description: activeSwatch?.tipTone?.description || "sunlit golden honey tips",
  });

  // Keep technique in sync if activeSwatch changes externally
  React.useEffect(() => {
    if (activeSwatch?.technique && activeSwatch.technique !== selectedTechnique) {
      setSelectedTechnique(activeSwatch.technique);
    }
    if (activeSwatch?.dimension && activeSwatch.dimension !== selectedDimension) {
      setSelectedDimension(activeSwatch.dimension);
    }
  }, [activeSwatch, selectedTechnique, selectedDimension]);

  // Filter swatches based on active technique filter
  const displayedSwatches = useMemo(() => {
    if (selectedTechnique === "solid") {
      return SOLID_HAIR_COLOR_SWATCHES;
    }
    return SALON_DUAL_TONE_PRESETS.filter((s) => s.technique === selectedTechnique);
  }, [selectedTechnique]);

  // Handle technique change
  const handleTechniqueChange = useCallback(
    (tech: HairColorTechnique) => {
      setSelectedTechnique(tech);
      if (tech === "solid") {
        // If current swatch is dual-tone, pick first solid swatch or keep if already solid
        if (activeSwatch?.isDualTone) {
          onSwatchSelect?.(SOLID_HAIR_COLOR_SWATCHES[0]);
        }
      } else {
        // Find matching preset for this technique
        const match = SALON_DUAL_TONE_PRESETS.find((s) => s.technique === tech);
        if (match) {
          onSwatchSelect?.(match);
          if (match.rootTone) setCustomRootTone(match.rootTone);
          if (match.tipTone) setCustomTipTone(match.tipTone);
        }
      }
    },
    [activeSwatch, onSwatchSelect]
  );

  // Handle dimension change for active dual-tone swatch
  const handleDimensionChange = useCallback(
    (dim: HairColorDimension) => {
      setSelectedDimension(dim);
      if (activeSwatch && activeSwatch.isDualTone && activeSwatch.rootTone && activeSwatch.tipTone) {
        const updated = createCustomDualToneSwatch({
          technique: activeSwatch.technique || selectedTechnique,
          dimension: dim,
          rootTone: activeSwatch.rootTone,
          tipTone: activeSwatch.tipTone,
          id: activeSwatch.id,
          name: activeSwatch.name,
          family: activeSwatch.family,
        });
        onSwatchSelect?.(updated);
      }
    },
    [activeSwatch, selectedTechnique, onSwatchSelect]
  );

  // Apply custom formulated dual-tone swatch
  const handleApplyCustomFormula = useCallback(() => {
    const custom = createCustomDualToneSwatch({
      technique: selectedTechnique === "solid" ? "balayage" : selectedTechnique,
      dimension: selectedDimension,
      rootTone: customRootTone,
      tipTone: customTipTone,
    });
    onSwatchSelect?.(custom);
    if (selectedTechnique === "solid") {
      setSelectedTechnique("balayage");
    }
  }, [selectedTechnique, selectedDimension, customRootTone, customTipTone, onSwatchSelect]);

  const activeFormulaText = useMemo(() => {
    if (!activeSwatch) return "Natural Stock Hairstyle (No Salon Dye)";
    return compileSalonFormulaBadge(activeSwatch);
  }, [activeSwatch]);

  const activeBackground = useMemo(() => {
    if (!activeSwatch) return "transparent";
    return getSwatchCssBackground(activeSwatch);
  }, [activeSwatch]);

  return (
    <div
      className={`flex flex-col gap-2.5 p-3 rounded-2xl bg-surface-raised/60 border border-purple-500/25 shadow-sm ${className}`}
    >
      {/* 1. Header & Compiled Salon Formula Preview Badge */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-foreground">
            Salon Color Science Matrix
          </span>
          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
            Dual-Tone AI
          </span>
        </div>

        {activeSwatch && (
          <button
            type="button"
            onClick={() => onSwatchSelect?.(null)}
            className="text-[10px] font-mono text-muted hover:text-purple-300 flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            <span>Reset Stock</span>
          </button>
        )}
      </div>

      {/* 2. Compiled Formula Preview Card */}
      {showFormulaBadge && (
        <div className="p-2.5 rounded-xl bg-purple-950/20 border border-purple-500/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-5 h-5 rounded-full border border-white/40 shrink-0 shadow-inner flex items-center justify-center text-white"
              style={{ background: activeBackground }}
            >
              {activeSwatch && <Sparkles className="w-2.5 h-2.5 drop-shadow" />}
            </div>
            <div className="min-w-0 flex flex-col">
              <span className="text-[11px] font-mono font-bold text-purple-200 truncate">
                {activeFormulaText}
              </span>
              <span className="text-[9px] font-mono text-purple-300/80 truncate">
                {activeSwatch?.isDualTone
                  ? `${activeSwatch.rootTone?.name} root melt → ${activeSwatch.tipTone?.name} ribbons (${activeSwatch.dimension} contrast)`
                  : activeSwatch
                  ? activeSwatch.description
                  : "Original reference model tones preserved without color overriding."}
              </span>
            </div>
          </div>

          {activeSwatch?.isDualTone && (
            <span className="text-[8px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0 hidden sm:inline-block">
              Anti-Banding Safeguard Active
            </span>
          )}
        </div>
      )}

      {/* 3. Technique Segmented Bar (Solid, Balayage, Ombré, Highlights, Money Piece, Shadow Root) */}
      <div className="flex flex-col gap-1">
        <span className="text-[9px] font-mono uppercase text-muted font-bold">Salon Technique:</span>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
          {TECHNIQUES.map((tech) => {
            const Icon = tech.icon;
            const isSelected = selectedTechnique === tech.id;
            return (
              <button
                key={tech.id}
                type="button"
                onClick={() => handleTechniqueChange(tech.id)}
                className={`px-2 py-1.5 rounded-lg text-left flex flex-col items-center justify-center gap-0.5 transition-all text-center ${
                  isSelected
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/30 border border-purple-400"
                    : "bg-surface border border-border/70 text-muted hover:text-white hover:border-purple-500/40"
                }`}
              >
                <Icon className={`w-3 h-3 ${isSelected ? "text-white" : "text-purple-400"}`} />
                <span className="text-[10px] font-mono font-bold leading-tight">{tech.label}</span>
                <span
                  className={`text-[8px] font-mono truncate max-w-full ${
                    isSelected ? "text-purple-100" : "text-muted"
                  }`}
                >
                  {tech.shortDesc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Dimensional Contrast Selector (Subtle, Medium, Bold) - only when dual-tone */}
      {selectedTechnique !== "solid" && (
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <span className="text-[9px] font-mono uppercase text-muted font-bold shrink-0">
            Dimension Level:
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {DIMENSIONS.map((dim) => {
              const isDimSelected = selectedDimension === dim.id;
              return (
                <button
                  key={dim.id}
                  type="button"
                  onClick={() => handleDimensionChange(dim.id)}
                  className={`px-2.5 py-0.5 rounded-md text-[9px] font-mono font-bold transition-all ${
                    isDimSelected
                      ? "bg-purple-600 text-white shadow-sm border border-purple-400"
                      : "bg-surface border border-border/60 text-muted hover:text-white"
                  }`}
                  title={dim.desc}
                >
                  {dim.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Swatch Grid for Selected Technique */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-mono uppercase text-muted font-bold">
            {selectedTechnique === "solid"
              ? "Single Process Swatches (9):"
              : `${TECHNIQUES.find((t) => t.id === selectedTechnique)?.label} Presets:`}
          </span>
          <span className="text-[8px] font-mono text-muted">
            {displayedSwatches.length} formula{displayedSwatches.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto pr-0.5">
          {displayedSwatches.map((swatch) => {
            const isSelected = activeSwatch?.id === swatch.id;
            const bg = getSwatchCssBackground(swatch);
            return (
              <button
                key={swatch.id}
                type="button"
                onClick={() => {
                  onSwatchSelect?.(swatch);
                  if (swatch.rootTone) setCustomRootTone(swatch.rootTone);
                  if (swatch.tipTone) setCustomTipTone(swatch.tipTone);
                }}
                className={`p-1.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                  isSelected
                    ? "bg-purple-600/20 border-purple-500 ring-1 ring-purple-500 shadow-sm"
                    : "bg-surface border-border/70 hover:border-purple-400/50 hover:bg-white/[0.02]"
                }`}
              >
                <div
                  className="w-5 h-5 rounded-full border border-white/30 shrink-0 shadow-inner"
                  style={{ background: bg }}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[9px] font-mono font-bold text-foreground truncate">
                    {swatch.name}
                  </div>
                  <div className="text-[8px] font-mono text-muted uppercase tracking-wider truncate">
                    {swatch.isDualTone
                      ? `${swatch.rootTone?.name} / ${swatch.tipTone?.name}`
                      : swatch.family}
                  </div>
                </div>
                {isSelected && <Check className="w-3 h-3 text-purple-400 shrink-0 mr-1" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 6. Custom Dual-Tone Hex Tuner Collapsible */}
      <div className="border-t border-border/40 pt-2 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setIsCustomOpen(!isCustomOpen)}
          aria-expanded={isCustomOpen}
          className="flex items-center justify-between text-[10px] font-mono font-bold text-purple-300 hover:text-purple-200 transition-colors w-full text-left"
        >
          <span className="flex items-center gap-1.5">
            <Sliders className="w-3 h-3 text-purple-400" />
            <span>Custom Dual Swatch Formulator</span>
          </span>
          {isCustomOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {isCustomOpen && (
          <div className="p-2.5 rounded-xl bg-black/40 border border-purple-500/20 flex flex-col gap-2.5 mt-0.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
              {/* Root Tone Customizer */}
              <div className="flex flex-col gap-1 p-2 rounded-lg bg-surface border border-border/70">
                <span className="text-[9px] uppercase text-muted font-bold">1. Root Tone (Melt)</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={
                      /^#[0-9A-Fa-f]{6}$/.test(customRootTone.hex)
                        ? customRootTone.hex
                        : /^#[0-9A-Fa-f]{6}$/.test(`#${customRootTone.hex}`)
                        ? `#${customRootTone.hex}`
                        : "#241812"
                    }
                    onChange={(e) =>
                      setCustomRootTone((prev) => ({ ...prev, hex: e.target.value.toUpperCase() }))
                    }
                    className="w-7 h-7 rounded border border-white/20 bg-transparent cursor-pointer shrink-0"
                    aria-label="Root tone color picker"
                  />
                  <input
                    type="text"
                    value={customRootTone.hex}
                    onChange={(e) =>
                      setCustomRootTone((prev) => ({ ...prev, hex: e.target.value.toUpperCase() }))
                    }
                    onBlur={() => {
                      setCustomRootTone((prev) => {
                        const trimmed = prev.hex.trim();
                        const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
                        return /^#[0-9A-Fa-f]{6}$/.test(withHash) ? { ...prev, hex: withHash } : prev;
                      });
                    }}
                    placeholder="#HEX"
                    className="w-20 bg-black/60 border border-border/70 rounded px-1.5 py-1 text-[10px] font-mono text-foreground uppercase"
                    maxLength={7}
                  />
                  <input
                    type="text"
                    value={customRootTone.name}
                    onChange={(e) => setCustomRootTone((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Root Name"
                    className="flex-1 bg-black/60 border border-border/70 rounded px-1.5 py-1 text-[10px] font-mono text-foreground"
                  />
                </div>
              </div>

              {/* Tip Tone Customizer */}
              <div className="flex flex-col gap-1 p-2 rounded-lg bg-surface border border-border/70">
                <span className="text-[9px] uppercase text-muted font-bold">
                  2. Tip Tone / Accent Ribbons
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={
                      /^#[0-9A-Fa-f]{6}$/.test(customTipTone.hex)
                        ? customTipTone.hex
                        : /^#[0-9A-Fa-f]{6}$/.test(`#${customTipTone.hex}`)
                        ? `#${customTipTone.hex}`
                        : "#E8C07A"
                    }
                    onChange={(e) =>
                      setCustomTipTone((prev) => ({ ...prev, hex: e.target.value.toUpperCase() }))
                    }
                    className="w-7 h-7 rounded border border-white/20 bg-transparent cursor-pointer shrink-0"
                    aria-label="Tip tone color picker"
                  />
                  <input
                    type="text"
                    value={customTipTone.hex}
                    onChange={(e) =>
                      setCustomTipTone((prev) => ({ ...prev, hex: e.target.value.toUpperCase() }))
                    }
                    onBlur={() => {
                      setCustomTipTone((prev) => {
                        const trimmed = prev.hex.trim();
                        const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
                        return /^#[0-9A-Fa-f]{6}$/.test(withHash) ? { ...prev, hex: withHash } : prev;
                      });
                    }}
                    placeholder="#HEX"
                    className="w-20 bg-black/60 border border-border/70 rounded px-1.5 py-1 text-[10px] font-mono text-foreground uppercase"
                    maxLength={7}
                  />
                  <input
                    type="text"
                    value={customTipTone.name}
                    onChange={(e) => setCustomTipTone((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Tip Name"
                    className="flex-1 bg-black/60 border border-border/70 rounded px-1.5 py-1 text-[10px] font-mono text-foreground"
                  />
                </div>
              </div>
            </div>

            {/* Live Dual Gradient Strip */}
            <div className="flex flex-col gap-1">
              <span className="text-[8px] font-mono uppercase text-muted">Micro-Gradation Preview:</span>
              <div
                className="h-3 w-full rounded-full border border-white/20 shadow-inner"
                style={{
                  background: `linear-gradient(90deg, ${customRootTone.hex} 0%, ${customRootTone.hex} 40%, ${customTipTone.hex} 75%, ${customTipTone.hex} 100%)`,
                }}
              />
            </div>

            <button
              type="button"
              onClick={handleApplyCustomFormula}
              className="w-full py-1.5 px-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-mono text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              <span>Apply Custom {selectedTechnique.toUpperCase()} Formula</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
});
