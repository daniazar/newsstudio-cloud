/**
 * src/components/editor/shared/visuals/SceneVisualsPicker.tsx
 *
 * Visual Render Mode & Product Image Selector Suite (Modular Orchestrator).
 * Coordinates:
 * 1. RenderModeSelector: Visual presentation mode selector & 3D staging controls.
 * 2. VeoDiffusionStudioCard: Custom AI Video Scene diffusion & Photo Studio card.
 * 3. ComparisonSlotsPicker: Split Before & After visual target slots.
 * 4. MediaAssetGallery: Product assets catalog, custom URL input, and multi-scene assignment.
 */

import React, { useState, useEffect } from "react";
import { useToast } from "@/components/global/ToastContainer";
import {
  DEFAULT_FLOW_PROJECT_URL,
  SceneVisualsPickerProps,
  RenderModeOption,
  RENDER_MODES,
  MediaGalleryItem,
  StudioSubtab,
} from "./types";
import { useVeoSceneGeneration } from "./hooks/useVeoSceneGeneration";
import { useTurntableSceneGeneration } from "./hooks/useTurntableSceneGeneration";
import { useSceneMediaGallery } from "./hooks/useSceneMediaGallery";
import { RenderModeSelector } from "./components/RenderModeSelector";
import { VeoDiffusionStudioCard } from "./components/VeoDiffusionStudioCard";
import { ComparisonSlotsPicker } from "./components/ComparisonSlotsPicker";
import { MediaAssetGallery } from "./components/MediaAssetGallery";

// Re-export constants and types for backwards compatibility
export {
  DEFAULT_FLOW_PROJECT_URL,
  RENDER_MODES,
  type SceneVisualsPickerProps,
  type RenderModeOption,
  type MediaGalleryItem,
  type StudioSubtab,
};

const SceneVisualsPickerComponent: React.FC<SceneVisualsPickerProps> = ({
  currentScene,
  onUpdateScene,
  productAssets = [],
  onOpenStockSearch,
  onAddAsset,
  onRemoveAsset,
  productId,
  productName,
  productSpec,
  accentColor: _accentColor = "#06b6d4",
  personaId,
  attireId,
  avatarSrc,
  actionLoopId,
  videoUrl,
  allScenes = [],
  onAssignMediaToScene,
  onInsertVideoScene,
}) => {
  const { toast } = useToast();
  const isComparisonMode =
    currentScene.sceneType === "before_after_wipe" ||
    currentScene.sceneType === "room_staging";

  const [activeSlot, setActiveSlot] = useState<"primary" | "secondary">("primary");
  const [studioSubtab, setStudioSubtab] = useState<StudioSubtab>(
    currentScene.sceneType === "product_turntable" || currentScene.customTurntableVideoUrl
      ? "turntable"
      : currentScene.sceneType === "custom_veo_hero" || currentScene.customVeoVideoUrl
      ? "video"
      : "photo"
  );
  const [showVideoPreviewInStudio, setShowVideoPreviewInStudio] = useState<boolean>(true);

  // Hook 1: Veo 3.1 Scene Generation, Interval Polling & Diagnostics
  const veo = useVeoSceneGeneration({
    currentScene,
    onUpdateScene,
    productAssets,
    productId,
    productName,
    productSpec,
    personaId,
    attireId,
    avatarSrc,
    actionLoopId,
    videoUrl,
    onAddAsset,
    onRemoveAsset,
    onAssignMediaToScene,
    toast,
  });

  // Hook 2: Neural Product Turntable Studio (MiniMax H3 + Veo 3.1)
  const turntable = useTurntableSceneGeneration({
    currentScene,
    onUpdateScene,
    productAssets,
    productId,
    productName,
    productSpec,
    personaId,
    attireId,
    avatarSrc,
    onAddAsset,
    onAssignMediaToScene,
    toast,
  });

  // Hook 2: Media Asset Gallery, Filters & Multi-Scene Targeting
  const gallery = useSceneMediaGallery({
    currentScene,
    onUpdateScene,
    productAssets,
    productSpec,
    allScenes,
    onAddAsset,
    onAssignMediaToScene,
    activeSlot,
    isComparisonMode,
    checkIsVideo: veo.checkIsVideo,
  });

  // Auto-initialize distinct secondaryMediaUrl for comparison mode if missing
  useEffect(() => {
    if (isComparisonMode && !currentScene.secondaryMediaUrl && productAssets.length > 1) {
      const alternativeAsset = productAssets.find(
        (a) => a.url && a.url !== currentScene.primaryMediaUrl
      );
      if (alternativeAsset?.url) {
        onUpdateScene({ secondaryMediaUrl: alternativeAsset.url });
      }
    }
  }, [
    isComparisonMode,
    currentScene.secondaryMediaUrl,
    currentScene.primaryMediaUrl,
    productAssets,
    onUpdateScene,
  ]);

  const isCurrentSceneUsingCustomVideo = Boolean(
    currentScene.sceneType === "custom_veo_hero" ||
      currentScene.customVeoVideoUrl ||
      currentScene.customTurntableVideoUrl ||
      (currentScene.primaryMediaUrl && veo.checkIsVideo(currentScene.primaryMediaUrl))
  );

  return (
    <div className="space-y-4">
      {/* 1. Visual Render & Presentation Mode Selector */}
      <RenderModeSelector
        currentScene={currentScene}
        onUpdateScene={onUpdateScene}
        productAssets={productAssets}
        onOpenPhotoStudio={() => setStudioSubtab("photo")}
        toast={toast}
        checkIsVideo={veo.checkIsVideo}
      />

      {/* 2. Unified Custom AI Media Generation Studio (Photo, Video & 360 Turntable) */}
      <VeoDiffusionStudioCard
        studioSubtab={studioSubtab}
        setStudioSubtab={setStudioSubtab}
        turntable={turntable}
        currentScene={currentScene}
        onUpdateScene={onUpdateScene}
        productAssets={productAssets}
        productId={productId}
        productName={productName}
        productSpec={productSpec}
        personaId={personaId}
        attireId={attireId}
        avatarSrc={avatarSrc}
        actionLoopId={actionLoopId}
        videoUrl={videoUrl}
        allScenes={allScenes}
        onAddAsset={onAddAsset}
        onAssignMediaToScene={onAssignMediaToScene}
        onInsertVideoScene={onInsertVideoScene}
        toast={toast}
        veoCategory={veo.veoCategory}
        setVeoCategory={veo.setVeoCategory}
        veoPrompt={veo.veoPrompt}
        setVeoPrompt={veo.setVeoPrompt}
        isVeoUserDirtyRef={veo.isVeoUserDirtyRef}
        veoCameraCue={veo.veoCameraCue}
        setVeoCameraCue={veo.setVeoCameraCue}
        isGeneratingVeo={veo.isGeneratingVeo}
        veoElapsedSeconds={veo.veoElapsedSeconds}
        veoStatusDetail={veo.veoStatusDetail}
        veoJobId={veo.veoJobId}
        lastCheckedAt={veo.lastCheckedAt}
        pollCadenceSeconds={veo.pollCadenceSeconds}
        setPollCadenceSeconds={veo.setPollCadenceSeconds}
        veoError={veo.veoError}
        setVeoError={veo.setVeoError}
        veoSuccessMessage={veo.veoSuccessMessage}
        setVeoSuccessMessage={veo.setVeoSuccessMessage}
        liveLogs={veo.liveLogs}
        showLiveLogsDrawer={veo.showLiveLogsDrawer}
        setShowLiveLogsDrawer={veo.setShowLiveLogsDrawer}
        isCheckingNow={veo.isCheckingNow}
        logsEndRef={veo.logsEndRef}
        formatTimer={veo.formatTimer}
        handleManualCheckNow={veo.handleManualCheckNow}
        handleResumePolling={veo.handleResumePolling}
        handleClearJob={veo.handleClearJob}
        handleGenerateVeoScene={veo.handleGenerateVeoScene}
        handleDeleteVeoVideo={veo.handleDeleteVeoVideo}
        handleDetachMediaFromScene={veo.handleDetachMediaFromScene}
        isDeletingVeo={veo.isDeletingVeo}
        activeVeoUrl={veo.activeVeoUrl}
        selectedProductRefUrl={veo.selectedProductRefUrl}
        setSelectedProductRefUrl={veo.setSelectedProductRefUrl}
        resolvedPersonaImageUrl={veo.resolvedPersonaImageUrl}
        candidateProductUrls={veo.candidateProductUrls}
        activeProductRefUrl={veo.activeProductRefUrl}
        getResolvedEnglishPrompt={veo.getResolvedEnglishPrompt}
        showVideoPreviewInStudio={showVideoPreviewInStudio}
        setShowVideoPreviewInStudio={setShowVideoPreviewInStudio}
        showVeoApplyMenu={gallery.showVeoApplyMenu}
        setShowVeoApplyMenu={gallery.setShowVeoApplyMenu}
        veoAllowSpeaking={veo.veoAllowSpeaking}
        handleToggleAllowSpeaking={veo.handleToggleAllowSpeaking}
        veoLanguageOverride={veo.veoLanguageOverride}
        handleSelectLanguageOverride={veo.handleSelectLanguageOverride}
        detectedSceneLanguage={veo.detectedSceneLanguage}
        currentTemplateIndex={veo.currentTemplateIndex}
        availableActionTemplates={veo.availableActionTemplates}
        handleRerollActionTemplate={veo.handleRerollActionTemplate}
        currentDialogueIndex={veo.currentDialogueIndex}
        availableDialogueOptions={veo.availableDialogueOptions}
        handleRerollDialogue={veo.handleRerollDialogue}
        veoPerformance={veo.veoPerformance}
        veoPerformanceMood={veo.veoPerformanceMood}
        handleSelectPerformanceMood={veo.handleSelectPerformanceMood}
        handleChangePerformance={veo.handleChangePerformance}
      />

      {/* 3. Before & After Target Slots (Active when Comparison Mode is selected) */}
      {isComparisonMode && (
        <ComparisonSlotsPicker
          currentScene={currentScene}
          activeSlot={activeSlot}
          onSelectSlot={setActiveSlot}
          onSwapBeforeAfter={gallery.handleSwapBeforeAfter}
        />
      )}

      {/* 4. Product Photos & Media Asset Gallery (Photos & Videos) */}
      <MediaAssetGallery
        allMedia={gallery.allMedia}
        filteredMedia={gallery.filteredMedia}
        photosCount={gallery.photosCount}
        videosCount={gallery.videosCount}
        mediaFilter={gallery.mediaFilter}
        onSetMediaFilter={gallery.setMediaFilter}
        onOpenStockSearch={onOpenStockSearch}
        showCustomUrlBox={gallery.showCustomUrlBox}
        onToggleCustomUrlBox={() => gallery.setShowCustomUrlBox((prev) => !prev)}
        customUrlInput={gallery.customUrlInput}
        onChangeCustomUrlInput={gallery.setCustomUrlInput}
        onApplyCustomUrl={gallery.handleApplyCustomUrl}
        isCurrentSceneUsingCustomVideo={isCurrentSceneUsingCustomVideo}
        currentScene={currentScene}
        allScenes={allScenes}
        isComparisonMode={isComparisonMode}
        activeSlot={activeSlot}
        onSetActiveSlot={setActiveSlot}
        onUpdateScene={onUpdateScene}
        activeMediaDropdownUrl={gallery.activeMediaDropdownUrl}
        onSetActiveMediaDropdownUrl={gallery.setActiveMediaDropdownUrl}
        onSelectMedia={gallery.handleSelectMedia}
        onApplyMediaToTarget={gallery.handleApplyMediaToTarget}
        onSaveMediaToCatalog={gallery.handleSaveMediaToCatalog}
        onGenerateCutout={gallery.handleGenerateCutout}
        processingUrl={gallery.processingUrl}
        onDetachMediaFromScene={veo.handleDetachMediaFromScene}
        onDeleteVeoVideo={veo.handleDeleteVeoVideo}
        onRemoveAsset={onRemoveAsset}
        onInsertVideoScene={onInsertVideoScene}
        toast={toast}
      />
    </div>
  );
};

export const SceneVisualsPicker = React.memo(SceneVisualsPickerComponent);
export default SceneVisualsPicker;
