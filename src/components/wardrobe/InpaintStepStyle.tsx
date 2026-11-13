"use client";

import React, { useState } from "react";
import { Shirt, Scissors, Search, X, Sparkles, Film, ChevronDown, ChevronUp } from "lucide-react";
import { VirtualGrid } from "./VirtualOutfitGrid";
import { OutfitCard } from "./OutfitCard";
import { HairstyleCard } from "./HairstyleCard";
import { PersonaSwapSelector } from "./PersonaSwapSelector";
import {
  OutfitItem,
  TransformationType,
  GENDER_FILTERS,
  HAIR_GENDER_FILTERS,
  HAIR_CATEGORIES,
  HAIR_COLOR_FILTERS,
  INPAINTER_GRID_RESPONSIVE_COLS,
} from "./types";
import { HairStyleItem, HairColorSwatch } from "@/lib/wardrobe/hairCatalog";
import { SalonColorSelector } from "./SalonColorSelector";
import { LightingCalibrationPanel } from "./LightingCalibrationPanel";
import { LightingEnvironmentConfig, resolveLightingConfig } from "@/lib/wardrobe/lightingEngine";
import { VolumetricPaddingPanel } from "./VolumetricPaddingPanel";
import {
  VolumetricPaddingConfig,
  analyzeVolumetricSilhouette,
} from "@/lib/wardrobe/volumetricPaddingEngine";

export interface InpaintStepStyleProps {
  transformationType: TransformationType;
  onTransformationTypeChange: (type: TransformationType) => void;
  targetOutfit: OutfitItem;
  // Attire
  outfitsCount: number;
  filteredOutfits: OutfitItem[];
  onOutfitSelect: (outfit: OutfitItem) => void;
  selectedGender: string;
  onSelectGender: (gender: string) => void;
  outfitSearch: string;
  onOutfitSearchChange: (search: string) => void;
  // Hairstyle
  hairstylesCount: number;
  filteredHairstyles: HairStyleItem[];
  activeHairstyle: HairStyleItem;
  onHairstyleSelect: (hair: HairStyleItem) => void;
  selectedHairGender: string;
  onSelectHairGender: (gender: string) => void;
  selectedHairCategory: string;
  onSelectHairCategory: (category: string) => void;
  selectedHairColorFamily: string;
  onSelectHairColorFamily: (family: string) => void;
  hairSearch: string;
  onHairSearchChange: (search: string) => void;
  activeSwatch?: HairColorSwatch | null;
  onSwatchSelect?: (swatch: HairColorSwatch | null) => void;
  // Persona Transference
  targetPersonaId?: string;
  onTargetPersonaSelect?: (personaId: string) => void;
  keepOriginalHair?: boolean;
  onKeepOriginalHairChange?: (keep: boolean) => void;
  targetPersonaName?: string;
  morphologyPolicy?: import("./types").MorphologyPolicy;
  onMorphologyPolicyChange?: (policy: import("./types").MorphologyPolicy) => void;
  sleeveStyle?: import("./types").SleeveStyleOption;
  onSleeveStyleChange?: (style: import("./types").SleeveStyleOption) => void;
  // Execution Calibration
  renderMode: "slice" | "full";
  onRenderModeChange: (mode: "slice" | "full") => void;
  trackPrompt: string;
  onTrackPromptChange: (prompt: string) => void;
  onAutoFillTrackPrompt: () => void;
  isExtractingTrackPrompt: boolean;
  seed: number;
  onSeedChange: (seed: number) => void;
  currentPersonaName: string;
  sourceGarment: string;
  onOpenAiBlueprintModal?: (options?: { initialType?: "attire" | "hair" }) => void;
  // Phase 4: Dynamic Lighting & Environment Bleed Integration
  lightingConfig?: LightingEnvironmentConfig;
  onLightingConfigChange?: (config: LightingEnvironmentConfig) => void;
  sourceLoopUrl?: string;
  // Phase 6: Volumetric Mask Padding & Studio Set Adaptability
  volumetricPaddingConfig?: VolumetricPaddingConfig;
  onVolumetricPaddingConfigChange?: (config: VolumetricPaddingConfig) => void;
}

export const InpaintStepStyle = React.memo(function InpaintStepStyle({
  transformationType,
  onTransformationTypeChange,
  targetOutfit,
  outfitsCount,
  filteredOutfits,
  onOutfitSelect,
  selectedGender,
  onSelectGender,
  outfitSearch,
  onOutfitSearchChange,
  hairstylesCount,
  filteredHairstyles,
  activeHairstyle,
  onHairstyleSelect,
  selectedHairGender,
  onSelectHairGender,
  selectedHairCategory,
  onSelectHairCategory,
  selectedHairColorFamily,
  onSelectHairColorFamily,
  hairSearch,
  onHairSearchChange,
  activeSwatch,
  onSwatchSelect,
  targetPersonaId,
  onTargetPersonaSelect,
  keepOriginalHair,
  onKeepOriginalHairChange,
  targetPersonaName,
  morphologyPolicy,
  onMorphologyPolicyChange,
  sleeveStyle,
  onSleeveStyleChange,
  renderMode,
  onRenderModeChange,
  trackPrompt,
  onTrackPromptChange,
  onAutoFillTrackPrompt,
  isExtractingTrackPrompt,
  seed,
  onSeedChange,
  currentPersonaName,
  sourceGarment,
  onOpenAiBlueprintModal,
  lightingConfig,
  onLightingConfigChange,
  sourceLoopUrl,
  volumetricPaddingConfig,
  onVolumetricPaddingConfigChange,
}: InpaintStepStyleProps) {
  const [showPromptDetails, setShowPromptDetails] = useState<boolean>(false);
  const [internalLightingConfig, setInternalLightingConfig] = useState<LightingEnvironmentConfig>(
    () => lightingConfig || resolveLightingConfig("broadcast_neutral")
  );
  const activeLighting = lightingConfig || internalLightingConfig;
  const handleLightingChange = onLightingConfigChange || setInternalLightingConfig;

  const [internalVolumetricConfig, setInternalVolumetricConfig] = useState<VolumetricPaddingConfig>(() =>
    volumetricPaddingConfig ||
    analyzeVolumetricSilhouette({
      haircutId: activeHairstyle?.id,
      haircutName: activeHairstyle?.name,
      hairLength: activeHairstyle?.hairLength,
      outfitName: targetOutfit?.name,
      outfitCategory: targetOutfit?.category,
      sourceLoopUrl,
    })
  );
  const activeVolumetric = volumetricPaddingConfig || internalVolumetricConfig;
  const handleVolumetricChange = onVolumetricPaddingConfigChange || setInternalVolumetricConfig;

  const handleResetAutoVolumetric = React.useCallback(() => {
    const autoResolved = analyzeVolumetricSilhouette({
      haircutId: activeHairstyle?.id,
      haircutName: activeHairstyle?.name,
      hairLength: activeHairstyle?.hairLength,
      outfitName: targetOutfit?.name,
      outfitCategory: targetOutfit?.category,
      sourceLoopUrl,
    });
    handleVolumetricChange(autoResolved);
  }, [activeHairstyle, targetOutfit, sourceLoopUrl, handleVolumetricChange]);

  const detectedSilhouetteName = React.useMemo(() => {
    const auto = analyzeVolumetricSilhouette({
      haircutId: activeHairstyle?.id,
      haircutName: activeHairstyle?.name,
      hairLength: activeHairstyle?.hairLength,
      outfitName: targetOutfit?.name,
      outfitCategory: targetOutfit?.category,
      sourceLoopUrl,
    });
    if (auto.silhouetteClass === "dramatic") return "Dramatic Silhouette (Afro / Power Outfit)";
    if (auto.silhouetteClass === "volumetric") return "Volumetric Silhouette (Curls / Flared Gown)";
    if (auto.silhouetteClass === "compact") return "Compact Silhouette (Fade / Short Cut)";
    return "Balanced Broadcast Silhouette";
  }, [activeHairstyle, targetOutfit, sourceLoopUrl]);

  // Helper: Renders Attire lookbook search, filters, and virtual grid
  const renderAttireSection = (isCompoundMode: boolean) => (
    <div className={`flex flex-col gap-2 ${isCompoundMode ? "p-3 bg-surface-raised/40 rounded-xl border border-border/80" : ""}`}>
      {isCompoundMode && (
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono font-bold text-purple-300 flex items-center gap-1.5">
            <Shirt className="w-3.5 h-3.5 text-purple-400" />
            <span>1. Select Attire Look ({outfitsCount})</span>
          </span>
          <span className="text-[10px] font-mono text-muted">
            Chosen: <span className="text-purple-300 font-bold">{targetOutfit.name}</span>
          </span>
        </div>
      )}

      {/* Attire Filter and Search Bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {GENDER_FILTERS.map((gf) => (
            <button
              key={gf.id}
              onClick={() => onSelectGender(gf.id)}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold whitespace-nowrap transition-all ${
                selectedGender === gf.id
                  ? "bg-purple-600 text-white shadow-sm"
                  : "bg-surface-raised border border-border/80 text-muted hover:text-white"
              }`}
            >
              {gf.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onOpenAiBlueprintModal && (
            <button
              type="button"
              onClick={() => onOpenAiBlueprintModal({ initialType: "attire" })}
              aria-label="Generate AI Attire Blueprint"
              className="px-2 py-0.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/50 text-purple-200 text-[10px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-2.5 h-2.5 text-purple-300" />
              <span>+ AI Attire</span>
            </button>
          )}

          <div className="relative shrink-0 w-32 sm:w-36">
            <Search className="w-3 h-3 text-muted absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search look..."
              value={outfitSearch}
              onChange={(e) => onOutfitSearchChange(e.target.value)}
              aria-label="Search outfits"
              className="w-full bg-surface-raised border border-border/80 rounded-lg pl-6 pr-5 py-1 text-[10px] text-foreground placeholder:text-muted focus:outline-none focus:border-purple-500 font-mono"
            />
            {outfitSearch && (
              <button
                onClick={() => onOutfitSearchChange("")}
                aria-label="Clear search"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted hover:text-white"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <VirtualGrid
        items={filteredOutfits}
        columns={4}
        responsiveColumns={INPAINTER_GRID_RESPONSIVE_COLS}
        rowHeight={412}
        overscanRows={3}
        gapClassName="gap-2.5"
        containerClassName={isCompoundMode ? "max-h-[260px] pr-1" : "max-h-[340px] pr-1"}
        scrollable={true}
        emptyState={
          <div className="p-6 text-center text-muted font-mono text-[10px]">
            No matching attires found
          </div>
        }
        renderItem={(outfit, idx) => (
          <OutfitCard
            key={outfit.id}
            outfit={outfit}
            variant="compact"
            isSelected={targetOutfit.id === outfit.id}
            priority={idx < 8}
            onSelect={onOutfitSelect}
          />
        )}
      />
    </div>
  );

  // Helper: Renders Hairstyle search, gender/category chips, color swatches, and card grid
  const renderHairstyleSection = (isCompoundMode: boolean) => (
    <div className={`flex flex-col gap-2 ${isCompoundMode ? "p-3 bg-surface-raised/40 rounded-xl border border-border/80" : ""}`}>
      {isCompoundMode && (
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono font-bold text-purple-300 flex items-center gap-1.5">
            <Scissors className="w-3.5 h-3.5 text-purple-400" />
            <span>2. Select Hairstyle & Color Swatch ({hairstylesCount})</span>
          </span>
          <span className="text-[10px] font-mono text-muted">
            Chosen:{" "}
            <span className="text-purple-300 font-bold">
              {activeSwatch ? `${activeSwatch.name} ` : ""}
              {activeHairstyle.name}
            </span>
          </span>
        </div>
      )}

      {/* Hairstyle Filter and Search Bar */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {HAIR_GENDER_FILTERS.map((gf) => (
              <button
                key={gf.id}
                onClick={() => onSelectHairGender(gf.id)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold whitespace-nowrap transition-all ${
                  selectedHairGender === gf.id
                    ? "bg-purple-600 text-white shadow-sm"
                    : "bg-surface-raised border border-border/80 text-muted hover:text-white"
                }`}
              >
                {gf.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onOpenAiBlueprintModal && (
              <button
                type="button"
                onClick={() => onOpenAiBlueprintModal({ initialType: "hair" })}
                aria-label="Generate AI Hairstyle Blueprint"
                className="px-2 py-0.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/50 text-purple-200 text-[10px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap"
              >
                <Sparkles className="w-2.5 h-2.5 text-purple-300" />
                <span>+ AI Hair</span>
              </button>
            )}

            <div className="relative shrink-0 w-32 sm:w-36">
              <Search className="w-3 h-3 text-muted absolute left-2 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search style..."
                value={hairSearch}
                onChange={(e) => onHairSearchChange(e.target.value)}
                aria-label="Search hairstyles"
                className="w-full bg-surface-raised border border-border/80 rounded-lg pl-6 pr-5 py-1 text-[10px] text-foreground placeholder:text-muted focus:outline-none focus:border-purple-500 font-mono"
              />
              {hairSearch && (
                <button
                  onClick={() => onHairSearchChange("")}
                  aria-label="Clear hair search"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted hover:text-white"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Category Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {HAIR_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelectHairCategory(cat.id)}
              className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-semibold whitespace-nowrap transition-all ${
                selectedHairCategory === cat.id
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/80"
                  : "bg-surface-raised border border-border/60 text-muted hover:text-white"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Color Family Filter Chips */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
          {HAIR_COLOR_FILTERS.map((cf) => (
            <button
              key={cf.id}
              onClick={() => onSelectHairColorFamily(cf.id)}
              className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${
                selectedHairColorFamily === cf.id
                  ? "bg-purple-600 text-white shadow-sm"
                  : "bg-surface-raised border border-border/60 text-muted hover:text-white"
              }`}
            >
              {cf.dot && (
                <span
                  className="w-1.5 h-1.5 rounded-full border border-white/20"
                  style={{ backgroundColor: cf.dot }}
                />
              )}
              <span>{cf.label}</span>
            </button>
          ))}
        </div>

        {/* Advanced Hair Color Science: Salon Technique & Dimensional Swatches */}
        <SalonColorSelector
          activeSwatch={activeSwatch}
          onSwatchSelect={onSwatchSelect}
          showFormulaBadge={true}
        />
      </div>

      <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 overflow-y-auto pr-1 ${isCompoundMode ? "max-h-[260px]" : "max-h-[340px]"}`}>
        {filteredHairstyles.length === 0 ? (
          <div className="col-span-full p-6 text-center text-muted font-mono text-[10px]">
            No hairstyles found matching filters
          </div>
        ) : (
          filteredHairstyles.map((hair) => (
            <HairstyleCard
              key={hair.id}
              hair={hair}
              variant="compact"
              isSelected={activeHairstyle.id === hair.id && (transformationType === "hair" || transformationType === "compound")}
              activeSwatch={activeSwatch}
              onSelect={onHairstyleSelect}
            />
          ))
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Step 2: Target Wardrobe / Hairstyle / Compound Selector */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-purple-500/20 text-purple-400 inline-flex items-center justify-center text-[10px]">
                2
              </span>
              Target Wardrobe Look
            </span>
            {onOpenAiBlueprintModal && (
              <button
                type="button"
                onClick={() =>
                  onOpenAiBlueprintModal({
                    initialType: transformationType === "hair" ? "hair" : "attire",
                  })
                }
                className="px-2 py-0.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/50 text-purple-200 text-[10px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap shadow-sm"
              >
                <Sparkles className="w-2.5 h-2.5 text-purple-300" />
                <span>+ AI Blueprint</span>
              </button>
            )}
          </div>
          <span className="text-[10px] font-mono text-purple-400">
            Selected:{" "}
            {transformationType === "persona" ? (
              <span className="text-foreground font-bold">
                Identity Transference:{" "}
                <span className="text-amber-300">{targetPersonaName || targetPersonaId || "Target Persona"}</span>{" "}
                <span className="text-muted font-normal">
                  ({keepOriginalHair ? "Keep Source Hair" : "Adopt Signature Hair"})
                </span>
              </span>
            ) : transformationType === "compound" ? (
              <span className="text-foreground font-bold">
                {targetOutfit.name}{" "}
                <span className="text-purple-400 font-normal">+</span>{" "}
                {activeSwatch ? `${activeSwatch.name} ` : ""}
                {activeHairstyle.name}
              </span>
            ) : transformationType === "hair" ? (
              <span className="text-foreground font-bold">
                {activeSwatch ? `${activeSwatch.name} ` : ""}
                {activeHairstyle.name}
              </span>
            ) : (
              <span className="text-foreground font-bold">{targetOutfit.name}</span>
            )}
          </span>
        </div>

        {/* 4-Way Mode Segmented Control: Attire | Hairstyles | Complete Makeover | Swap Persona */}
        <div className="flex items-center gap-1.5 p-1 bg-surface-raised rounded-xl border border-border/80 w-fit flex-wrap">
          <button
            type="button"
            onClick={() => onTransformationTypeChange("attire")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
              transformationType === "attire"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-muted hover:text-white"
            }`}
          >
            <Shirt className="w-3.5 h-3.5" />
            <span>Attire & Outfits ({outfitsCount})</span>
          </button>
          <button
            type="button"
            onClick={() => onTransformationTypeChange("hair")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
              transformationType === "hair"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-muted hover:text-white"
            }`}
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Hairstyles ({hairstylesCount})</span>
          </button>
          <button
            type="button"
            onClick={() => onTransformationTypeChange("compound")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
              transformationType === "compound"
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm shadow-purple-600/30"
                : "text-muted hover:text-white"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Complete Makeover</span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30 font-semibold hidden sm:inline">
              Attire + Hair
            </span>
          </button>
          <button
            type="button"
            onClick={() => onTransformationTypeChange("persona")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
              transformationType === "persona"
                ? "bg-gradient-to-r from-amber-600 via-pink-600 to-purple-600 text-white shadow-sm shadow-amber-600/30"
                : "text-muted hover:text-white"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>✨ Swap Persona</span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30 font-semibold hidden sm:inline">
              Keep Outfit
            </span>
          </button>
        </div>

        {transformationType === "persona" ? (
          <PersonaSwapSelector
            targetPersonaId={targetPersonaId || "blaze"}
            onTargetPersonaSelect={onTargetPersonaSelect || (() => {})}
            keepOriginalHair={Boolean(keepOriginalHair)}
            onKeepOriginalHairChange={onKeepOriginalHairChange || (() => {})}
            morphologyPolicy={morphologyPolicy || "strict_garment"}
            onMorphologyPolicyChange={onMorphologyPolicyChange}
            sleeveStyle={sleeveStyle}
            onSleeveStyleChange={onSleeveStyleChange}
            sourcePersonaName={currentPersonaName}
            sourceGarment={sourceGarment}
          />
        ) : transformationType === "compound" ? (
          <div className="flex flex-col gap-3">
            {renderAttireSection(true)}
            {renderHairstyleSection(true)}
          </div>
        ) : transformationType === "attire" ? (
          renderAttireSection(false)
        ) : (
          renderHairstyleSection(false)
        )}
      </div>

      {/* Step 3: SAM 3.1 & MiniMax Inpainting Parameters */}
      <div className="p-4 rounded-2xl bg-surface border border-border/80 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-purple-500/20 text-purple-400 inline-flex items-center justify-center text-[10px]">
              3
            </span>
            Neural Tracking & Execution Calibration
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onRenderModeChange("slice")}
              aria-label="Quick slice mode (39 frames)"
              aria-pressed={renderMode === "slice"}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all ${
                renderMode === "slice"
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/80"
                  : "bg-surface-raised border border-border text-muted"
              }`}
            >
              ⚡ Quick Slice (39F)
            </button>
            <button
              onClick={() => onRenderModeChange("full")}
              aria-label="Full video mode (169 frames)"
              aria-pressed={renderMode === "full"}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all ${
                renderMode === "full"
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/80"
                  : "bg-surface-raised border border-border text-muted"
              }`}
            >
              🌟 Full Video (169F)
            </button>
          </div>
        </div>

        {/* Phase 4: Dynamic Environment Lighting & Spill Matrix */}
        <LightingCalibrationPanel
          lightingConfig={activeLighting}
          onChange={handleLightingChange}
          sourceLoopUrl={sourceLoopUrl}
        />

        {/* Phase 6: Volumetric Mask Padding & Studio Set Adaptability */}
        <VolumetricPaddingPanel
          paddingConfig={activeVolumetric}
          onChange={handleVolumetricChange}
          onResetAuto={handleResetAutoVolumetric}
          detectedSilhouetteName={detectedSilhouetteName}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-mono font-bold text-muted uppercase">
                {transformationType === "persona"
                  ? "SAM 3.1 Head & Morphology Tracking Prompt"
                  : transformationType === "compound"
                  ? "SAM 3.1 Compound Makeover Tracking Prompt"
                  : transformationType === "hair"
                  ? "SAM 3.1 Hairstyle Tracking Prompt"
                  : "SAM 3.1 Compound Tracking Prompt"}
              </label>
              <button
                type="button"
                onClick={onAutoFillTrackPrompt}
                disabled={isExtractingTrackPrompt}
                aria-label="Auto-fill track prompt from outfit"
                className="text-[9px] font-mono text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
              >
                <Sparkles className="w-2.5 h-2.5" />
                <span>
                  {isExtractingTrackPrompt ? "Analyzing Plate..." : "Auto-Fill Prompt"}
                </span>
              </button>
            </div>
            <input
              type="text"
              value={trackPrompt}
              onChange={(e) => onTrackPromptChange(e.target.value)}
              placeholder="e.g. burgundy dress, clothing, attire, dress, hair, head"
              className="w-full mt-1 bg-surface-raised border border-border rounded-xl px-3 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:border-purple-500/60"
            />
            <p className="text-[9px] text-muted mt-1">
              {transformationType === "persona"
                ? morphologyPolicy === "biometric_adaptation"
                  ? "Inverted tracking focuses on head, hair, skin, and bust/cleavage for anatomical body adaptation while locking lower dress and posture."
                  : "Inverted tracking targets head, face, skin, and shoulder hair with anti-ghost cleanup while locking 100% of attire and kinematics."
                : transformationType === "compound"
                ? "Compound tracking binds garments, bare arms, and hairstyle/head together for complete anchor metamorphosis."
                : transformationType === "hair"
                ? "Hairstyle tracking binds hair, bangs, hairline, scalp, and shoulder boundaries to prevent ghost strands."
                : "Compound tracking binds garments + bare arms together to prevent duplicate limbs."}
            </p>
          </div>

          <div>
            <label className="text-[10px] font-mono font-bold text-muted uppercase">
              Diffusion Random Seed
            </label>
            <input
              type="number"
              value={seed}
              onChange={(e) => onSeedChange(Number(e.target.value))}
              className="w-full mt-1 bg-surface-raised border border-border rounded-xl px-3 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:border-purple-500/60"
            />
            <p className="text-[9px] text-muted mt-1">
              Calibrated seed: 20261002 (matches high-fashion reference runs).
            </p>
          </div>
        </div>

        {/* Collapsible MiniMax Prompt Inspector */}
        <div className="border border-border/80 rounded-xl overflow-hidden mt-1">
          <button
            onClick={() => setShowPromptDetails(!showPromptDetails)}
            aria-expanded={showPromptDetails}
            aria-label="Toggle MiniMax prompt details inspector"
            className="w-full px-3 py-2 bg-surface-raised flex items-center justify-between text-left text-xs font-mono font-bold text-subtle hover:text-white"
          >
            <span className="flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5 text-purple-400" />
              {transformationType === "compound"
                ? "MiniMax H3 2-Stage Compound Pipeline Inspector"
                : "MiniMax H3 6-Section Prompt Lint Inspector"}
            </span>
            {showPromptDetails ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {showPromptDetails && (
            <div className="p-3 bg-black/60 text-[10px] font-mono text-muted leading-relaxed max-h-56 overflow-y-auto">
              <p className="text-purple-300 font-bold mb-1">
                {transformationType === "compound"
                  ? "Generated MiniMax ref2va Dual-Stage Compound Prompt:"
                  : transformationType === "hair"
                  ? "Generated MiniMax ref2va Hairstyle Prompt:"
                  : "Generated MiniMax ref2va Prompt:"}
              </p>
              <pre className="whitespace-pre-wrap font-mono text-slate-300">
                {transformationType === "compound" ? (
`================================================================================
[COMPOUND METAMORPHOSIS — 2-STAGE CHAINED PIPELINE]
Anchor: ${currentPersonaName}
Target Look: ${targetOutfit.name} + ${activeSwatch ? `${activeSwatch.name} ` : ""}${activeHairstyle.name}
Execution: Stage 1 (Attire) -> Intermediate Video Handshake -> Stage 2 (Hairstyle)
================================================================================

--- [STAGE 1/2: ATTIRE INPAINTING] ---
subject_definitions:
<Subject 1> is the ${targetOutfit.name} from <Picture 1>.
<Video 1> is the source video being edited.

summary: [video editing + audio reuse]
The target video is an edited version of <Video 1>. Replace the ${currentPersonaName}'s ${sourceGarment} and arms with <Subject 1>. Completely replace the ${currentPersonaName}'s upper body silhouette and neckline with the authentic tailoring, lapels, collar, and sleeves of <Subject 1>, extending fabric over the shoulders, chest, and arms regardless of original bare skin from <Video 1>.

--------------------------------------------------------------------------------
--- [STAGE 2/2: HAIRSTYLE METAMORPHOSIS (Applied on Stage 1 Output)] ---
subject_definitions:
<Subject 1> is the target hairstyle: ${activeSwatch ? `${activeSwatch.name} ` : ""}${activeHairstyle.name} from <Picture 1>.
<Video 1> is the Stage 1 rendered video being edited.

summary: [video editing + audio reuse]
Replace the ${currentPersonaName}'s hair with <Subject 1>. Completely transform the hair cut, length, and silhouette to match the haircut geometry in <Subject 1>, overriding original hair color with ${activeSwatch ? activeSwatch.name : activeHairstyle.hairColor}.`
                ) : transformationType === "hair" ? (
`subject_definitions:
<Subject 1> is the target hairstyle: ${activeSwatch ? `${activeSwatch.name} ` : ""}${activeHairstyle.name} from <Picture 1>.
<Video 1> is the source video being edited.

summary: [video editing + audio reuse]
The target video is an edited version of <Video 1>. Replace the ${currentPersonaName}'s hair with <Subject 1>. Completely transform the hair cut, length, and silhouette to match the haircut geometry in <Subject 1>.`
                ) : (
`subject_definitions:
<Subject 1> is the ${targetOutfit.name} from <Picture 1>.
<Video 1> is the source video being edited.

summary: [video editing + audio reuse]
The target video is an edited version of <Video 1>. Replace the ${currentPersonaName}'s ${sourceGarment} and arms with <Subject 1>. Completely replace the ${currentPersonaName}'s upper body silhouette and neckline with the authentic tailoring, lapels, collar, and sleeves of <Subject 1>, extending fabric over the shoulders, chest, and arms regardless of original bare skin from <Video 1>.

retention_analysis:
<Subject 1> (appears in [Shot 1]): fully_preserved - retain the ${targetOutfit.prompt}. Adopt the complete silhouette, collar structure, lapels, sleeves, and garment geometry of <Subject 1>. The new outfit replaces the original ${sourceGarment} and bare skin, extending fabric cleanly over shoulders, chest, and arms without conforming to the cut of the original garment.
<Video 1>: weak_reference - follow original standing pose, speaking cadence, facial expressions, and green screen background.

detailed_description:
Photorealistic professional broadcast green screen studio. [Shot 1] The ${currentPersonaName} stands in front of the green screen wearing the ${targetOutfit.name}. The ${targetOutfit.name} completely replaces the presenter's previous clothing and neckline with crisp tailoring, authentic shoulder structure, lapels, and sleeves against the solid green chroma background. The garment drapes naturally over the presenter's upper body with its true silhouette rather than conforming to the source video's garment cut.`
                )}
              </pre>
            </div>
          )}
        </div>
      </div>
    </>
  );
});
