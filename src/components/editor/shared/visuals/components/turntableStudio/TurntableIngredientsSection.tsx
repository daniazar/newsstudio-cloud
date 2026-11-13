/**
 * src/components/editor/shared/visuals/components/turntableStudio/TurntableIngredientsSection.tsx
 *
 * Ingredients panel for Neural Product Turntable Studio:
 * 1) Staging Archetype Selector (Podium, Persona 360°, Material Swatch, Paint, Mannequin, Floor)
 * 2) Product reference photo selector with visual thumbnails
 * 3) Persona attire preview (active when Persona 360° is chosen)
 * 4) Pedestal & Lighting atmosphere selectors
 */

import React from "react";
import { Film, User, Layers, Palette, Shirt, Armchair, Trophy, Sparkles, Cpu } from "lucide-react";
import {
  TurntableStagingArchetype,
  TurntablePedestalStyle,
  TurntableLightingStyle,
  ProductSpec,
  ProductVariant,
} from "@/lib/types/ecommerce";
import {
  TURNTABLE_STAGING_ARCHETYPES,
  TURNTABLE_PEDESTALS,
  TURNTABLE_LIGHTING_STYLES,
} from "@/lib/ecommerce/turntablePromptCompiler";

interface TurntableIngredientsSectionProps {
  candidateProductUrls: string[];
  activeProductRefUrl: string | null;
  setSelectedProductRefUrl: (url: string | null) => void;
  stagingArchetype: TurntableStagingArchetype;
  onSelectStagingArchetype: (arch: TurntableStagingArchetype) => void;
  pedestalStyle: TurntablePedestalStyle;
  onSelectPedestalStyle: (pedestal: TurntablePedestalStyle) => void;
  lightingStyle: TurntableLightingStyle;
  onSelectLightingStyle: (lighting: TurntableLightingStyle) => void;
  personaId?: string;
  resolvedPersonaImageUrl?: string | null;
  productSpec?: ProductSpec;
  selectedVariantId?: string | null;
  onSelectVariant?: (variantOrId: ProductVariant | string | null) => void;
}

export function TurntableIngredientsSection({
  candidateProductUrls,
  activeProductRefUrl,
  setSelectedProductRefUrl,
  stagingArchetype,
  onSelectStagingArchetype,
  pedestalStyle,
  onSelectPedestalStyle,
  lightingStyle,
  onSelectLightingStyle,
  personaId = "ruby",
  resolvedPersonaImageUrl,
  productSpec,
  selectedVariantId,
  onSelectVariant,
}: TurntableIngredientsSectionProps) {
  const isPersonaMode = stagingArchetype === "persona_orbit";

  return (
    <div className="space-y-3 p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800/90 shadow-sm">
      {/* 1. Staging & Mounting Archetype */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-[11px] font-bold text-zinc-200 uppercase tracking-wider">
              1. Staging & Presentation Mount
            </span>
          </div>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            {stagingArchetype}
          </span>
        </div>
        <p className="text-[10px] text-zinc-400 leading-relaxed">
          Calibrated mounting geometries designed for bottles, flooring, apparel, paint, and furniture.
        </p>

        <div className="grid grid-cols-3 gap-1.5 pt-1">
          {TURNTABLE_STAGING_ARCHETYPES.map((arch) => {
            const isSelected = stagingArchetype === arch.id;
            const Icon =
              arch.id === "podium_pedestal"
                ? Trophy
                : arch.id === "persona_orbit"
                ? User
                : arch.id === "material_swatch"
                ? Layers
                : arch.id === "paint_finish"
                ? Palette
                : arch.id === "apparel_mannequin"
                ? Shirt
                : arch.id === "exploded_view"
                ? Cpu
                : Armchair;

            return (
              <button
                key={arch.id}
                type="button"
                onClick={() => onSelectStagingArchetype(arch.id)}
                className={`p-2 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? "border-cyan-500 bg-cyan-500/15 text-white shadow-sm shadow-cyan-950/40"
                    : "border-zinc-800 bg-zinc-950/60 hover:bg-zinc-800/70 text-zinc-300"
                }`}
                title={arch.description}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <div
                    className={`p-1 rounded ${
                      isSelected ? "bg-cyan-500 text-black" : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                  </div>
                  {isSelected && (
                    <span className="text-[8px] font-extrabold px-1 py-0.2 rounded bg-cyan-500 text-black">
                      ACTIVE
                    </span>
                  )}
                </div>
                <div className="text-[10px] font-bold leading-tight truncate">{arch.label}</div>
                <div className="text-[8.5px] text-zinc-400 leading-tight mt-0.5 line-clamp-1">
                  {arch.tagline}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 1b. Product Variant & Colorway Quick Switcher */}
      {productSpec?.variants && productSpec.variants.length > 0 && (
        <div className="space-y-1.5 pt-1 border-t border-zinc-800/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-[11px] font-bold text-zinc-200 uppercase tracking-wider">
                Variant & Colorway
              </span>
            </div>
            <span className="text-[9px] font-mono text-zinc-400">
              {productSpec.variants.length} SKU{productSpec.variants.length > 1 ? "s" : ""}
            </span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
            {productSpec.variants.map((v) => {
              const isSelected = selectedVariantId === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    const newId = isSelected ? null : v.id;
                    onSelectVariant?.(newId);
                    if (v.imageUrl && newId) {
                      setSelectedProductRefUrl(v.imageUrl);
                    }
                  }}
                  className={`px-2.5 py-1.5 rounded-lg border text-left transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                    isSelected
                      ? "border-cyan-500 bg-cyan-500/15 text-white shadow-sm shadow-cyan-950/40"
                      : "border-zinc-800 bg-zinc-950/60 hover:bg-zinc-800/70 text-zinc-300"
                  }`}
                  title={`Select ${v.title} colorway for turntable generation`}
                >
                  {v.colorHex ? (
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0 shadow-sm"
                      style={{ backgroundColor: v.colorHex }}
                    />
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full border border-zinc-600 bg-zinc-700 shrink-0" />
                  )}
                  <span className="text-[10px] font-bold truncate max-w-[120px]">{v.title}</span>
                  {v.price > 0 && (
                    <span className="text-[8.5px] font-mono text-zinc-400">
                      ${v.price.toFixed(2)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Visual Reference Ingredients */}
      <div className="space-y-1.5 pt-1 border-t border-zinc-800/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Film className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-[11px] font-bold text-zinc-200 uppercase tracking-wider">
              2. Conditioning References
            </span>
          </div>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            {isPersonaMode ? "Product + Persona Active" : "Product Packshot Ready"}
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 custom-scrollbar">
          {/* Persona Card (if Persona Orbit mode is chosen) */}
          {isPersonaMode && (
            <div
              className="relative group rounded-lg overflow-hidden border-2 border-purple-500 bg-purple-950/40 h-14 w-14 shrink-0 shadow flex flex-col items-center justify-center p-1 text-center"
              title={`AI Presenter: ${personaId}. Anchor wears the item as the camera orbits 360°.`}
            >
              {resolvedPersonaImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolvedPersonaImageUrl}
                  alt={personaId}
                  className="w-full h-full object-cover"
                />
              ) : (
                <>
                  <User className="h-5 w-5 text-purple-300" />
                  <span className="text-[7.5px] text-purple-200 font-bold font-mono uppercase mt-0.5">
                    {personaId}
                  </span>
                </>
              )}
              <span className="absolute top-0.5 right-0.5 text-[6.5px] bg-purple-600 text-white font-extrabold px-1 rounded-full">
                Anchor
              </span>
              <span className="absolute bottom-0 inset-x-0 bg-purple-950/90 text-[7px] text-purple-200 font-bold text-center py-0.2">
                360° Orbit
              </span>
            </div>
          )}

          {/* Product Reference Photos */}
          {candidateProductUrls.length > 0 ? (
            candidateProductUrls.map((url, idx) => {
              const isSelected = url === activeProductRefUrl;
              return (
                <button
                  key={`${url}-${idx}`}
                  type="button"
                  onClick={() => setSelectedProductRefUrl(url)}
                  className={`relative group rounded-lg overflow-hidden h-14 w-14 shrink-0 shadow transition-all cursor-pointer text-left ${
                    isSelected
                      ? "border-2 border-emerald-500 ring-2 ring-emerald-500/40"
                      : "border border-zinc-800 opacity-70 hover:opacity-100 hover:border-zinc-600"
                  }`}
                  title="Click to condition turntable geometry on this product photo"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Product reference ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {isSelected && (
                    <span className="absolute top-0.5 right-0.5 text-[6.5px] bg-emerald-600 text-white font-extrabold px-1 rounded-full">
                      ✓ Target
                    </span>
                  )}
                  <span className="absolute bottom-0 inset-x-0 bg-black/85 text-[7px] text-zinc-300 font-mono text-center py-0.2 truncate px-0.5">
                    Photo #{idx + 1}
                  </span>
                </button>
              );
            })
          ) : (
            <div className="p-3 rounded-lg border border-dashed border-zinc-800 text-[10px] text-zinc-500 w-full text-center">
              No product reference photos uploaded. Please upload a packshot photo below.
            </div>
          )}
        </div>
      </div>

      {/* 3. Pedestal & Lighting Atmosphere */}
      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-800/80">
        {/* Pedestal Style (Hidden if persona orbit or showroom floor) */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-zinc-300 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-cyan-400" />
            <span>Pedestal Surface</span>
          </label>
          <select
            value={pedestalStyle}
            onChange={(e) => onSelectPedestalStyle(e.target.value as TurntablePedestalStyle)}
            className="w-full text-[10.5px] font-bold bg-black/80 border border-zinc-800 hover:border-cyan-500/50 rounded-lg p-1.5 text-zinc-200 focus:outline-none cursor-pointer transition-colors"
          >
            {TURNTABLE_PEDESTALS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* Lighting Atmosphere */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-zinc-300 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-amber-400" />
            <span>Studio Lighting</span>
          </label>
          <select
            value={lightingStyle}
            onChange={(e) => onSelectLightingStyle(e.target.value as TurntableLightingStyle)}
            className="w-full text-[10.5px] font-bold bg-black/80 border border-zinc-800 hover:border-amber-500/50 rounded-lg p-1.5 text-zinc-200 focus:outline-none cursor-pointer transition-colors"
          >
            {TURNTABLE_LIGHTING_STYLES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
