/**
 * src/components/editor/shared/media/CustomProductPhotoStudioCard.tsx
 *
 * Custom AI Product Photo Studio Card orchestrator.
 * Allows creators to generate bespoke, photorealistic staging photos of their product
 * in architectural rooms, luxury pedestals, or lifestyle contexts via Google Imagen 3 / Gemini.
 * Features live stopwatch timer, configurable polling cadence, and multi-conditioning.
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Camera,
  Check,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  Sparkles,
} from "lucide-react";
import {
  PRODUCT_MEDIA_CATEGORIES,
  detectCategoryFromProduct,
} from "@/lib/ecommerce/productMediaPresets";
import { filterPromptForSafety } from "@/lib/ecommerce/promptSafetyFilter";
import {
  resolvePersonaAttireImageUrl,
  buildConditionedReferenceUrls,
  hasPersonaInPrompt,
  buildStructuredPhotoPrompt,
  getSettingActionTemplates,
  resolveSettingKey,
} from "@/lib/ecommerce/personaPromptHelper";
import { reconcileLightingModifier } from "@/lib/ecommerce/promptModifierReconciler";

import { CustomProductPhotoStudioCardProps } from "./photoStudio/types";
import { useCustomProductPhotoGeneration } from "./photoStudio/useCustomProductPhotoGeneration";
import { PhotoStudioPreviewCard } from "./photoStudio/PhotoStudioPreviewCard";
import { PhotoStudioPromptSection } from "./photoStudio/PhotoStudioPromptSection";
import { PhotoStudioReferencesBar } from "./photoStudio/PhotoStudioReferencesBar";
import { PhotoStudioTelemetryDrawer } from "./photoStudio/PhotoStudioTelemetryDrawer";

export type { CustomProductPhotoStudioCardProps };

const CustomProductPhotoStudioCardComponent: React.FC<CustomProductPhotoStudioCardProps> = ({
  currentScene,
  onUpdateScene,
  productAssets = [],
  onAddAsset,
  productId = "prod",
  productName,
  productSpec,
  personaId,
  attireId,
  avatarSrc,
  actionLoopId,
  videoUrl,
  allScenes = [],
  onAssignMediaToScene,
}) => {
  const resolvedName = productName || productSpec?.title || "the product";

  // Detect initial category from product spec or name
  const initialCategory = useMemo(() => {
    return detectCategoryFromProduct(productSpec, resolvedName);
  }, [productSpec, resolvedName]);

  const [activeCategory, setActiveCategory] = useState<string>(initialCategory);
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "9:16" | "16:9">("1:1");

  const getDefaultPrompt = useCallback(
    (catKey: string, pId?: string, aId?: string) => {
      const effectivePersonaId = pId || personaId || "ruby";
      const effectiveAttireId = aId || attireId;
      const catConfig =
        PRODUCT_MEDIA_CATEGORIES[catKey] || PRODUCT_MEDIA_CATEGORIES.surface_material;
      const firstPreset = catConfig.photoPresets[0];
      const rawPrompt = firstPreset
        ? firstPreset.template(resolvedName, effectivePersonaId, effectiveAttireId)
        : `Photorealistic product photograph of ${resolvedName} in high-end studio lighting, 8k resolution`;
      return filterPromptForSafety(rawPrompt);
    },
    [resolvedName, personaId, attireId]
  );

  const [photoPrompt, setPhotoPrompt] = useState<string>(() =>
    getDefaultPrompt(initialCategory, personaId, attireId)
  );
  const isUserDirtyRef = useRef<boolean>(false);
  const lastSceneIdRef = useRef<string>(currentScene.id);

  const [photoTemplateIndex, setPhotoTemplateIndex] = useState<number>(
    () => (currentScene.sceneIndex || 0) % 6
  );
  const settingKey = useMemo(() => resolveSettingKey(activeCategory, undefined), [activeCategory]);
  const availablePhotoTemplates = useMemo(() => getSettingActionTemplates(settingKey), [settingKey]);

  // Sync active category if initialCategory changes
  useEffect(() => {
    if (initialCategory && initialCategory !== activeCategory) {
      setActiveCategory(initialCategory);
    }
  }, [initialCategory, activeCategory]);

  // Automatically ensure prompt has the persona & attire on mount or when scene/persona/attire updates
  useEffect(() => {
    const isNewScene = lastSceneIdRef.current !== currentScene.id;
    if (isNewScene) {
      lastSceneIdRef.current = currentScene.id;
      isUserDirtyRef.current = false;
      setPhotoTemplateIndex((currentScene.sceneIndex || 0) % 6);
    }

    if (!isUserDirtyRef.current || !hasPersonaInPrompt(photoPrompt) || !photoPrompt.trim()) {
      setPhotoPrompt(getDefaultPrompt(activeCategory, personaId, attireId));
    }
  }, [currentScene.id, currentScene.sceneIndex, activeCategory, personaId, attireId, resolvedName, getDefaultPrompt, photoPrompt]);

  // Extract reference images (persona first, then product packshots)
  const effectiveReferenceUrls = useMemo(() => {
    const personaImageUrl = resolvePersonaAttireImageUrl({
      personaId,
      attireId,
      avatarSrc:
        avatarSrc ||
        currentScene.presenterConfig?.avatarSrc ||
        currentScene.presenter?.avatarSrc,
      actionLoopId:
        actionLoopId || currentScene.presenterConfig?.selectedActionLoopId,
      videoUrl: videoUrl || currentScene.presenterConfig?.videoUrl,
    });

    const productUrls: string[] = [];
    if (currentScene.primaryMediaUrl) productUrls.push(currentScene.primaryMediaUrl);
    if (currentScene.secondaryMediaUrl) productUrls.push(currentScene.secondaryMediaUrl);

    if (Array.isArray(productAssets)) {
      for (const a of productAssets) {
        if (a?.url) productUrls.push(a.url);
        if (a?.mattedUrl) productUrls.push(a.mattedUrl);
      }
    }

    if (Array.isArray(productSpec?.assets)) {
      for (const a of productSpec.assets) {
        if (a?.url) productUrls.push(a.url);
      }
    }

    return buildConditionedReferenceUrls({
      personaImageUrl,
      productMediaUrls: productUrls,
      maxImages: 3,
    });
  }, [
    personaId,
    attireId,
    avatarSrc,
    actionLoopId,
    videoUrl,
    currentScene.presenterConfig?.avatarSrc,
    currentScene.presenterConfig?.selectedActionLoopId,
    currentScene.presenterConfig?.videoUrl,
    currentScene.presenter?.avatarSrc,
    currentScene.primaryMediaUrl,
    currentScene.secondaryMediaUrl,
    productAssets,
    productSpec?.assets,
  ]);

  // Generation & polling hook
  const {
    isGenerating,
    photoElapsedSeconds,
    photoStatusDetail,
    pollCadenceSeconds,
    setPollCadenceSeconds,
    lastCheckedAt,
    successMessage,
    setSuccessMessage,
    errorMessage,
    generatedPhotoUrl,
    liveLogs,
    showLiveLogsDrawer,
    setShowLiveLogsDrawer,
    logsEndRef,
    formatTimer,
    handleGeneratePhoto,
    handleManualCheckNow,
    handleResetToPackshot,
  } = useCustomProductPhotoGeneration({
    currentScene,
    productId,
    resolvedName,
    productAssets,
    photoPrompt,
    aspectRatio,
    activeCategory,
    effectiveReferenceUrls,
    personaId,
    attireId,
    avatarSrc,
    actionLoopId,
    videoUrl,
    onUpdateScene,
    onAddAsset,
  });

  const handleRerollPhotoTemplate = useCallback(() => {
    const nextIdx = (photoTemplateIndex + 1) % availablePhotoTemplates.length;
    setPhotoTemplateIndex(nextIdx);
    isUserDirtyRef.current = false;
    const nextTemplate = availablePhotoTemplates[nextIdx];
    const newPrompt = buildStructuredPhotoPrompt({
      productName: resolvedName,
      personaTraits: personaId,
      attireDesc: attireId,
      settingKey,
      templateIndex: nextIdx,
    });
    setPhotoPrompt(newPrompt);
    setSuccessMessage(`🎲 Swapped to Staging Template (${nextIdx + 1}/6: ${nextTemplate.label})`);
  }, [photoTemplateIndex, availablePhotoTemplates, resolvedName, personaId, attireId, settingKey, setSuccessMessage]);

  const isPhotoActiveAsBackground = Boolean(
    generatedPhotoUrl &&
      (currentScene.secondaryMediaUrl === generatedPhotoUrl ||
        (currentScene.sceneType === "scene_background" &&
          currentScene.primaryMediaUrl === generatedPhotoUrl))
  );
  const isPhotoActiveAsPrimary = Boolean(
    generatedPhotoUrl &&
      currentScene.primaryMediaUrl === generatedPhotoUrl &&
      currentScene.sceneType !== "scene_background"
  );
  const isCurrentPhotoActive = isPhotoActiveAsBackground || isPhotoActiveAsPrimary;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 space-y-3.5 transition-all">
      {/* 1. Header & Badges */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <Camera className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-100 uppercase tracking-wide">
                ✨ Custom Product Photo Studio
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Gemini & Imagen 3 CLI
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 mt-0.5">
              Generate a custom photorealistic photo for this product staged in an architectural
              room, on a luxury pedestal, or in lifestyle context
            </p>
          </div>
        </div>
        {isCurrentPhotoActive && (
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border ${
              isPhotoActiveAsBackground
                ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/30"
                : "text-cyan-300 bg-cyan-500/10 border-cyan-500/30"
            }`}
          >
            <Check className="h-3 w-3" />
            {isPhotoActiveAsBackground ? "Active Background" : "Active in Scene"}
          </span>
        )}
      </div>

      {/* 2. Status Alerts */}
      {successMessage && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 3. Photo Preview Card */}
      {generatedPhotoUrl && (
        <PhotoStudioPreviewCard
          currentScene={currentScene}
          generatedPhotoUrl={generatedPhotoUrl}
          resolvedName={resolvedName}
          isGenerating={isGenerating}
          productAssets={productAssets}
          allScenes={allScenes}
          isPhotoActiveAsBackground={isPhotoActiveAsBackground}
          isPhotoActiveAsPrimary={isPhotoActiveAsPrimary}
          isCurrentPhotoActive={isCurrentPhotoActive}
          onGeneratePhoto={handleGeneratePhoto}
          onResetToPackshot={handleResetToPackshot}
          onAddAsset={onAddAsset}
          onUpdateScene={onUpdateScene}
          onAssignMediaToScene={onAssignMediaToScene}
          setSuccessMessage={setSuccessMessage}
        />
      )}

      {/* 4-7. Categories, Prompt, Presets, and Modifiers */}
      <PhotoStudioPromptSection
        activeCategory={activeCategory}
        photoPrompt={photoPrompt}
        onSelectCategory={(catKey) => {
          isUserDirtyRef.current = false;
          setActiveCategory(catKey);
          setPhotoPrompt(getDefaultPrompt(catKey, personaId, attireId));
        }}
        onSelectPresetPrompt={(templateFn) => {
          isUserDirtyRef.current = false;
          setPhotoPrompt(filterPromptForSafety(templateFn(resolvedName, personaId, attireId)));
        }}
        onAddLightingModifier={(modId, phrase) => {
          isUserDirtyRef.current = true;
          setPhotoPrompt((prev) => reconcileLightingModifier(prev, modId, phrase));
        }}
        onResetPromptToTemplate={() => {
          isUserDirtyRef.current = false;
          setPhotoPrompt(getDefaultPrompt(activeCategory, personaId, attireId));
        }}
        onChangePrompt={(val) => {
          isUserDirtyRef.current = true;
          setPhotoPrompt(val);
        }}
        photoTemplateIndex={photoTemplateIndex}
        availablePhotoTemplates={availablePhotoTemplates}
        handleRerollPhotoTemplate={handleRerollPhotoTemplate}
      />

      {/* 8. References Preview */}
      <PhotoStudioReferencesBar effectiveReferenceUrls={effectiveReferenceUrls} />

      {/* Live Generation Progress & Telemetry Drawer */}
      <PhotoStudioTelemetryDrawer
        isGenerating={isGenerating}
        photoElapsedSeconds={photoElapsedSeconds}
        photoStatusDetail={photoStatusDetail}
        pollCadenceSeconds={pollCadenceSeconds}
        lastCheckedAt={lastCheckedAt}
        liveLogs={liveLogs}
        showLiveLogsDrawer={showLiveLogsDrawer}
        logsEndRef={logsEndRef}
        formatTimer={formatTimer}
        onManualCheckNow={handleManualCheckNow}
        onToggleLogsDrawer={() => setShowLiveLogsDrawer((prev) => !prev)}
        onCopyLogs={() => {
          navigator.clipboard?.writeText(liveLogs.join("\n"));
          setSuccessMessage("📋 Telemetry logs copied to clipboard!");
        }}
      />

      {/* 9. Aspect Ratio & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-zinc-800/80">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-zinc-400 font-medium">Aspect:</span>
            {(["1:1", "9:16", "16:9"] as const).map((ratio) => (
              <button
                key={ratio}
                type="button"
                onClick={() => setAspectRatio(ratio)}
                className={`px-2 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                  aspectRatio === ratio
                    ? "bg-cyan-500 text-black"
                    : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                }`}
              >
                {ratio}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 text-[11px] text-zinc-400 ml-1">
            <Clock className="h-3 w-3 text-zinc-400" />
            <span className="text-[10px]">Timer:</span>
            <select
              value={pollCadenceSeconds}
              onChange={(e) => setPollCadenceSeconds(Number(e.target.value))}
              className="text-[10px] font-bold font-mono bg-black/80 border border-zinc-700/80 hover:border-cyan-500/50 rounded px-1.5 py-0.5 text-zinc-200 focus:outline-none cursor-pointer transition-colors"
              title="Choose how frequently the page checks the background photo generation status"
            >
              <option value={2}>Check every 2s</option>
              <option value={3}>Check every 3s</option>
              <option value={5}>Check every 5s</option>
              <option value={10}>Check every 10s</option>
              <option value={30}>Check every 30s</option>
              <option value={60}>Check every 1m</option>
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGeneratePhoto}
          disabled={isGenerating || !photoPrompt.trim()}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-black text-xs font-black shadow-lg shadow-cyan-950/40 flex items-center gap-1.5 transition-all cursor-pointer"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin text-black" />
              <span>Generating ({formatTimer(photoElapsedSeconds)})...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5 text-black" />
              <span>Generate Product Photo</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export const CustomProductPhotoStudioCard = React.memo(CustomProductPhotoStudioCardComponent);
