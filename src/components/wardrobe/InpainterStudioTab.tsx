"use client";

import React, { useState } from "react";
import { InpaintStepPersona } from "./InpaintStepPersona";
import { InpaintStepStyle } from "./InpaintStepStyle";
import { InpaintComparisonMatrix } from "./InpaintComparisonMatrix";
import {
  PersonaItem,
  PersonaLoopOption,
  OutfitItem,
  TransformationType,
  InpaintProgressState,
  InpaintResultState,
} from "./types";
import { HairStyleItem, HairColorSwatch } from "@/lib/wardrobe/hairCatalog";

export interface InpainterStudioTabProps {
  personas: PersonaItem[];
  currentPersona: PersonaItem;
  selectedPersonaId: string;
  onPersonaChange: (id: string) => void;
  loops: PersonaLoopOption[];
  selectedLoop: PersonaLoopOption | null;
  onLoopSelect: (loop: PersonaLoopOption) => void;
  // Step 2 & 3 State
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
  // Calibration
  renderMode: "slice" | "full";
  onRenderModeChange: (mode: "slice" | "full") => void;
  trackPrompt: string;
  onTrackPromptChange: (prompt: string) => void;
  onAutoFillTrackPrompt: () => void;
  isExtractingTrackPrompt: boolean;
  seed: number;
  onSeedChange: (seed: number) => void;
  sourceGarment: string;
  // Comparison Matrix & Monitor
  isInpainting: boolean;
  inpaintProgress: InpaintProgressState;
  inpaintResult: InpaintResultState | null;
  activeJobId: string | null;
  onLoadVerifiedDemo: () => void;
  storyId?: string | null;
  onOpenAiBlueprintModal?: (options?: { initialType?: "attire" | "hair" }) => void;
  // Persona Transference
  targetPersonaId?: string;
  onTargetPersonaSelect?: (id: string) => void;
  keepOriginalHair?: boolean;
  onKeepOriginalHairChange?: (keep: boolean) => void;
  targetPersonaName?: string;
  morphologyPolicy?: import("./types").MorphologyPolicy;
  onMorphologyPolicyChange?: (policy: import("./types").MorphologyPolicy) => void;
  sleeveStyle?: import("./types").SleeveStyleOption;
  onSleeveStyleChange?: (style: import("./types").SleeveStyleOption) => void;
  // Phase 4: Dynamic Lighting & Environment Bleed Integration
  lightingConfig?: import("@/lib/wardrobe/lightingEngine").LightingEnvironmentConfig;
  onLightingConfigChange?: (config: import("@/lib/wardrobe/lightingEngine").LightingEnvironmentConfig) => void;
  // Phase 5: Saved Persona Looks
  onSaveLookSuccess?: (look: import("@/lib/wardrobe/personaLookTypes").PersonaLook) => void;
  recentJobs?: import("./SavePersonaLookModal").RecentJobItem[];
  savedLooks?: import("@/lib/wardrobe/personaLookTypes").PersonaLook[];
  // Phase 6: Volumetric Mask Padding & Studio Set Adaptability
  volumetricPaddingConfig?: import("@/lib/wardrobe/volumetricPaddingEngine").VolumetricPaddingConfig;
  onVolumetricPaddingConfigChange?: (config: import("@/lib/wardrobe/volumetricPaddingEngine").VolumetricPaddingConfig) => void;
}

export const InpainterStudioTab = React.memo(function InpainterStudioTab({
  personas,
  currentPersona,
  selectedPersonaId,
  onPersonaChange,
  loops,
  selectedLoop,
  onLoopSelect,
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
  renderMode,
  onRenderModeChange,
  trackPrompt,
  onTrackPromptChange,
  onAutoFillTrackPrompt,
  isExtractingTrackPrompt,
  seed,
  onSeedChange,
  sourceGarment,
  isInpainting,
  inpaintProgress,
  inpaintResult,
  activeJobId,
  onLoadVerifiedDemo,
  storyId,
  onOpenAiBlueprintModal,
  targetPersonaId,
  onTargetPersonaSelect,
  keepOriginalHair,
  onKeepOriginalHairChange,
  targetPersonaName,
  morphologyPolicy,
  onMorphologyPolicyChange,
  sleeveStyle,
  onSleeveStyleChange,
  lightingConfig,
  onLightingConfigChange,
  onSaveLookSuccess,
  recentJobs,
  savedLooks,
  volumetricPaddingConfig,
  onVolumetricPaddingConfigChange,
}: InpainterStudioTabProps) {
  const [playerViewMode, setPlayerViewMode] = useState<"side_by_side" | "slider" | "gif">(
    "side_by_side"
  );

  // Dynamically infer pose tag from currently selected action loop
  const inferredPoseTag: import("@/lib/wardrobe/personaLookTypes").PoseTag = (() => {
    const text = `${selectedLoop?.name || ""} ${selectedLoop?.id || ""}`.toUpperCase();
    if (/\bM2\b|_M2_|\bEXPLANATORY\b|\bGESTURE_RIGHT\b/.test(text)) return "M2";
    if (/\bM3\b|_M3_|\bWELCOMING\b|\bINTRO_WELCOME\b/.test(text)) return "M3";
    if (/\bM4\b|_M4_|\bEMPHASIS\b|\bNOD\b/.test(text)) return "M4";
    if (/\bM5\b|_M5_|\bSIDE\b|\bTURN\b/.test(text)) return "M5";
    return "M1";
  })();

  return (
    <div className="flex-1 flex flex-col xl:flex-row overflow-y-auto xl:overflow-hidden">
      {/* Left Panel: Configuration & Lookbook Selector */}
      <div className="w-full xl:w-7/12 p-6 border-b xl:border-b-0 xl:border-r border-border/80 flex flex-col gap-5 overflow-y-visible xl:overflow-y-auto shrink-0 xl:shrink">
        <InpaintStepPersona
          personas={personas}
          currentPersona={currentPersona}
          selectedPersonaId={selectedPersonaId}
          onPersonaChange={onPersonaChange}
          loops={loops}
          selectedLoop={selectedLoop}
          onLoopSelect={onLoopSelect}
        />

        <InpaintStepStyle
          transformationType={transformationType}
          onTransformationTypeChange={onTransformationTypeChange}
          targetOutfit={targetOutfit}
          outfitsCount={outfitsCount}
          filteredOutfits={filteredOutfits}
          onOutfitSelect={onOutfitSelect}
          selectedGender={selectedGender}
          onSelectGender={onSelectGender}
          outfitSearch={outfitSearch}
          onOutfitSearchChange={onOutfitSearchChange}
          hairstylesCount={hairstylesCount}
          filteredHairstyles={filteredHairstyles}
          activeHairstyle={activeHairstyle}
          onHairstyleSelect={onHairstyleSelect}
          selectedHairGender={selectedHairGender}
          onSelectHairGender={onSelectHairGender}
          selectedHairCategory={selectedHairCategory}
          onSelectHairCategory={onSelectHairCategory}
          selectedHairColorFamily={selectedHairColorFamily}
          onSelectHairColorFamily={onSelectHairColorFamily}
          hairSearch={hairSearch}
          onHairSearchChange={onHairSearchChange}
          activeSwatch={activeSwatch}
          onSwatchSelect={onSwatchSelect}
          targetPersonaId={targetPersonaId}
          onTargetPersonaSelect={onTargetPersonaSelect}
          keepOriginalHair={keepOriginalHair}
          onKeepOriginalHairChange={onKeepOriginalHairChange}
          targetPersonaName={targetPersonaName}
          morphologyPolicy={morphologyPolicy}
          onMorphologyPolicyChange={onMorphologyPolicyChange}
          sleeveStyle={sleeveStyle}
          onSleeveStyleChange={onSleeveStyleChange}
          renderMode={renderMode}
          onRenderModeChange={onRenderModeChange}
          trackPrompt={trackPrompt}
          onTrackPromptChange={onTrackPromptChange}
          onAutoFillTrackPrompt={onAutoFillTrackPrompt}
          isExtractingTrackPrompt={isExtractingTrackPrompt}
          seed={seed}
          onSeedChange={onSeedChange}
          currentPersonaName={currentPersona.name}
          sourceGarment={sourceGarment}
          onOpenAiBlueprintModal={onOpenAiBlueprintModal}
          lightingConfig={lightingConfig}
          onLightingConfigChange={onLightingConfigChange}
          sourceLoopUrl={selectedLoop?.videoUrl}
          volumetricPaddingConfig={volumetricPaddingConfig}
          onVolumetricPaddingConfigChange={onVolumetricPaddingConfigChange}
        />
      </div>

      {/* Right Panel: Synchronized Comparison Matrix & Monitor */}
      <InpaintComparisonMatrix
        playerViewMode={playerViewMode}
        onPlayerViewModeChange={setPlayerViewMode}
        isInpainting={isInpainting}
        inpaintProgress={inpaintProgress}
        inpaintResult={inpaintResult}
        activeJobId={activeJobId}
        onLoadVerifiedDemo={onLoadVerifiedDemo}
        currentPersonaId={currentPersona.id}
        currentPersonaName={currentPersona.name}
        targetPersonaId={targetPersonaId}
        targetPersonaName={targetPersonaName}
        targetOutfitId={targetOutfit.id}
        targetOutfitName={targetOutfit.name}
        activeHairstyleName={activeHairstyle?.name}
        activeHairstyleId={activeHairstyle?.id}
        activeColorSwatch={activeSwatch?.hex}
        lightingPresetName={lightingConfig?.presetId}
        poseTag={inferredPoseTag}
        recentJobs={recentJobs}
        existingLooks={savedLooks}
        storyId={storyId}
        transformationType={transformationType}
        onSaveLookSuccess={onSaveLookSuccess}
      />
    </div>
  );
});
