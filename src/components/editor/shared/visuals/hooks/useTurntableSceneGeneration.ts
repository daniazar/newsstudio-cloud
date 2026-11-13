/**
 * src/components/editor/shared/visuals/hooks/useTurntableSceneGeneration.ts
 *
 * Custom hook encapsulating Neural Product Turntable generation:
 * - Dual Engine: MiniMax H3 (Local ComfyUI) & Google Veo 3.1 (Flow)
 * - 6 Typology-Aware Staging Archetypes (including Persona 360° Orbit)
 * - 24+ Contextual Environment Templates & Semantic Matching
 * - Polling intervals, stopwatch timer, localStorage recovery, and scene attachment.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  AdScene,
  ExtractedProductAsset,
  ProductSpec,
  ProductVariant,
  TurntableEngine,
  TurntableStagingArchetype,
  TurntableMotionPreset,
  TurntablePedestalStyle,
  TurntableLightingStyle,
  TurntableStepMode,
  TurntableCameraElevation,
  TurntableRadarPin,
  TurntableSocialProofConfig,
} from "@/lib/types/ecommerce";
import {
  compileTurntablePrompt,
  detectStagingArchetype,
} from "@/lib/ecommerce/turntablePromptCompiler";
import {
  resolveContextualEnvironment,
  getEnvironmentById,
} from "@/lib/ecommerce/turntableEnvironmentEngine";
import { extractDefaultRadarPins } from "@/lib/ecommerce/turntableRadarEngine";
import { resolvePersonaAttireImageUrl } from "@/lib/ecommerce/personaPromptHelper";

export interface UseTurntableSceneGenerationProps {
  currentScene: AdScene;
  onUpdateScene: (updates: Partial<AdScene>) => void;
  productAssets: ExtractedProductAsset[];
  productId?: string;
  productName?: string;
  productSpec?: ProductSpec;
  personaId?: string;
  attireId?: string;
  avatarSrc?: string;
  onAddAsset?: (asset: ExtractedProductAsset) => void;
  onAssignMediaToScene?: (
    sceneIndex: number,
    mediaUrl: string,
    isVideo?: boolean,
    asBackground?: boolean
  ) => void;
  toast: (
    title: string,
    message: string,
    type?: "info" | "success" | "warning" | "error"
  ) => void;
}

export function useTurntableSceneGeneration({
  currentScene,
  onUpdateScene,
  productAssets = [],
  productId,
  productName,
  productSpec,
  personaId = "ruby",
  attireId,
  avatarSrc: _avatarSrc,
  onAddAsset,
  onAssignMediaToScene: _onAssignMediaToScene,
  toast,
}: UseTurntableSceneGenerationProps) {
  // Helper to test if a URL corresponds to a video
  const checkIsVideo = useCallback((url: string) => {
    if (!url) return false;
    const clean = url.split("?")[0].toLowerCase();
    return (
      clean.endsWith(".mp4") ||
      clean.endsWith(".webm") ||
      clean.endsWith(".mov") ||
      clean.includes("turntable_") ||
      clean.includes("veo_")
    );
  }, []);

  // 1. Engine Selection: MiniMax H3 (Local) vs Google Veo 3.1 (Cloud)
  const [turntableEngine, setTurntableEngine] = useState<TurntableEngine>(
    currentScene.turntableEngine || "minimax_h3"
  );

  // 2. Staging Archetype: Auto-detected or user selected
  const initialArchetype = useMemo(() => {
    if (currentScene.turntableStagingArchetype) return currentScene.turntableStagingArchetype;
    return detectStagingArchetype(productSpec, productName);
  }, [currentScene.turntableStagingArchetype, productSpec, productName]);

  const [stagingArchetype, setStagingArchetype] = useState<TurntableStagingArchetype>(initialArchetype);

  // 3. Motion Preset (Hero Arc 60°, 180° Turnaround, 360° Loop)
  const [motionPreset, setMotionPreset] = useState<TurntableMotionPreset>(
    currentScene.turntableMotionPreset || "hero_arc_60"
  );

  // 4. Staging Pedestal
  const [pedestalStyle, setPedestalStyle] = useState<TurntablePedestalStyle>(
    currentScene.turntablePedestal || "obsidian_black"
  );

  // 5. Lighting Atmosphere
  const [lightingStyle, setLightingStyle] = useState<TurntableLightingStyle>(
    currentScene.turntableLighting || "luxury_gold"
  );

  // 6. Step Mode (TaoMate 2-step vs 3-step)
  const [stepMode, setStepMode] = useState<TurntableStepMode>(
    currentScene.turntableStepMode || "tao_2step"
  );

  // 6b. Director Camera Angle & Elevation
  const [cameraElevation, setCameraElevation] = useState<TurntableCameraElevation>(
    currentScene.turntableCameraElevation || "eye_level"
  );

  // 6c. Selected Product Variant (Colorway)
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(
    currentScene.turntableSelectedVariantId || productSpec?.variants?.[0]?.id
  );

  // 6d. Feature Radar Pins Toggle & Config
  const [enableRadarPins, setEnableRadarPins] = useState<boolean>(
    currentScene.turntableEnableRadarPins ?? Boolean(productSpec?.bulletPoints && productSpec.bulletPoints.length > 0)
  );

  const [radarPins, setRadarPins] = useState<TurntableRadarPin[]>(() => {
    if (currentScene.turntableRadarPins && currentScene.turntableRadarPins.length > 0) {
      return currentScene.turntableRadarPins;
    }
    return extractDefaultRadarPins(productSpec, "#06b6d4", Math.round(currentScene.durationFrames || 155));
  });

  // 6e. Export Modal Visibility
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  // 6f. Dynamic Social Proof & Scarcity Overlays
  const [socialProof, setSocialProof] = useState<TurntableSocialProofConfig>(() => {
    if (currentScene.turntableSocialProof) {
      return currentScene.turntableSocialProof;
    }
    const firstReview = productSpec?.topReviews?.[0];
    return {
      showRatingBadge: true,
      rating: productSpec?.rating || 4.9,
      reviewCount: productSpec?.reviewCount || 1420,
      showBuyerQuote: Boolean(firstReview?.body),
      buyerQuoteText: firstReview?.body,
      buyerAuthor: firstReview?.author ? `${firstReview.author} — Verified Buyer` : undefined,
      showScarcityTicker: true,
      scarcityText: "⚡ ONLY 7 LEFT IN STOCK",
      trustSeal: "30_day_guarantee",
    };
  });

  const handleUpdateSocialProof = (config: TurntableSocialProofConfig) => {
    setSocialProof(config);
    onUpdateScene({ turntableSocialProof: config });
  };

  // 6g. 3-Hook Variation Matrix Modal Visibility
  const [isHookMatrixModalOpen, setIsHookMatrixModalOpen] = useState<boolean>(false);
  const handleOpenHookMatrixModal = () => setIsHookMatrixModalOpen(true);
  const handleCloseHookMatrixModal = () => setIsHookMatrixModalOpen(false);

  // 7. Contextual Environment & Semantic Default
  const autoEnvironment = useMemo(() => {
    return resolveContextualEnvironment(productSpec, productName);
  }, [productSpec, productName]);

  const [environmentId, setEnvironmentId] = useState<string>(
    currentScene.turntableEnvironmentId || autoEnvironment.id
  );
  const [environmentPrompt, setEnvironmentPrompt] = useState<string>(
    currentScene.turntableEnvironmentPrompt || autoEnvironment.promptDescription
  );

  // 8. Product Reference Photo Candidate list
  const candidateProductUrls = useMemo(() => {
    const urls: string[] = [];
    const seen = new Set<string>();

    const addUrl = (u?: string | null) => {
      if (!u || seen.has(u)) return;
      if (
        u.includes("/avatars/") ||
        u.includes("avatar_") ||
        u.includes("ruby_chroma") ||
        u.includes("sofia_chroma")
      ) {
        return;
      }
      seen.add(u);
      urls.push(u);
    };

    if (currentScene.primaryMediaUrl && !checkIsVideo(currentScene.primaryMediaUrl)) {
      addUrl(currentScene.primaryMediaUrl);
    }
    for (const a of productAssets) {
      if (a.url && !checkIsVideo(a.url)) addUrl(a.url);
    }
    if (productSpec?.assets) {
      for (const a of productSpec.assets) {
        if (a.url && !checkIsVideo(a.url)) addUrl(a.url);
      }
    }
    return urls;
  }, [currentScene.primaryMediaUrl, productAssets, productSpec, checkIsVideo]);

  const [selectedProductRefUrl, setSelectedProductRefUrl] = useState<string | null>(null);

  const activeProductRefUrl = useMemo(() => {
    if (selectedProductRefUrl && candidateProductUrls.includes(selectedProductRefUrl)) {
      return selectedProductRefUrl;
    }
    return candidateProductUrls[0] || currentScene.primaryMediaUrl || null;
  }, [selectedProductRefUrl, candidateProductUrls, currentScene.primaryMediaUrl]);

  // Persona Attire Image URL for Persona Orbit mode
  const resolvedPersonaImageUrl = useMemo(() => {
    return resolvePersonaAttireImageUrl({ personaId, attireId });
  }, [personaId, attireId]);

  // Prompt generation
  const getCompiledPrompt = useCallback(
    (overrides?: {
      engine?: TurntableEngine;
      stagingArchetype?: TurntableStagingArchetype;
      motionPreset?: TurntableMotionPreset;
      pedestalStyle?: TurntablePedestalStyle;
      lightingStyle?: TurntableLightingStyle;
      cameraElevation?: TurntableCameraElevation;
      selectedVariantId?: string;
      environmentId?: string;
      environmentPrompt?: string;
    }) => {
      const activeEnvId = overrides?.environmentId || environmentId;
      const envPreset = getEnvironmentById(activeEnvId);
      const activeEnvPrompt =
        overrides?.environmentPrompt !== undefined
          ? overrides.environmentPrompt
          : environmentPrompt || envPreset?.promptDescription;

      const activeVarId = overrides?.selectedVariantId !== undefined ? overrides.selectedVariantId : selectedVariantId;
      const activeVariant = productSpec?.variants?.find((v) => v.id === activeVarId);

      return compileTurntablePrompt({
        productName: productName || productSpec?.title || "the product",
        category: productSpec?.typology || "discrete_object",
        engine: overrides?.engine || turntableEngine,
        stagingArchetype: overrides?.stagingArchetype || stagingArchetype,
        motionPreset: overrides?.motionPreset || motionPreset,
        pedestalStyle: overrides?.pedestalStyle || pedestalStyle,
        lightingStyle: overrides?.lightingStyle || lightingStyle,
        cameraElevation: overrides?.cameraElevation || cameraElevation,
        variantTitle: activeVariant?.title,
        variantColorHex: activeVariant?.colorHex,
        environmentId: activeEnvId,
        environmentPrompt: activeEnvPrompt,
        personaId,
        attireId,
      });
    },
    [
      productName,
      productSpec?.title,
      productSpec?.typology,
      productSpec?.variants,
      turntableEngine,
      stagingArchetype,
      motionPreset,
      pedestalStyle,
      lightingStyle,
      cameraElevation,
      selectedVariantId,
      environmentId,
      environmentPrompt,
      personaId,
      attireId,
    ]
  );

  const [turntablePrompt, setTurntablePrompt] = useState<string>(
    () => currentScene.turntablePrompt || getCompiledPrompt()
  );
  const isTurntableUserDirtyRef = useRef<boolean>(false);

  // Generation status and lifecycle
  const [isGeneratingTurntable, setIsGeneratingTurntable] = useState<boolean>(false);
  const [turntableJobId, setTurntableJobId] = useState<string | null>(null);
  const [turntableElapsedSeconds, setTurntableElapsedSeconds] = useState<number>(0);
  const [turntableStatusDetail, setTurntableStatusDetail] = useState<string>("");
  const [turntableError, setTurntableError] = useState<string | null>(null);
  const [turntableSuccessMessage, setTurntableSuccessMessage] = useState<string | null>(null);
  const [liveLogs, setLiveLogs] = useState<string[]>([]);
  const [showLiveLogsDrawer, setShowLiveLogsDrawer] = useState<boolean>(false);
  const [isCheckingNow, setIsCheckingNow] = useState<boolean>(false);
  const [pollCadenceSeconds, setPollCadenceSeconds] = useState<number>(3);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [totalSteps, setTotalSteps] = useState<number>(2);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [vramUsedGb, setVramUsedGb] = useState<number>(17.2);
  const [showVideoPreviewInStudio, setShowVideoPreviewInStudio] = useState<boolean>(true);
  const [isDeletingTurntable, setIsDeletingTurntable] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const logsEndRef = useRef<HTMLDivElement | null>(null);

  const formatTimer = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const getJobStorageKey = useCallback(
    (sceneIdx: number) => `newsstudio_turntable_job_scene_${sceneIdx}`,
    []
  );

  const stopPollingAndTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopPollingAndTimer();
    };
  }, [stopPollingAndTimer]);

  // Update prompt whenever parameters change if user hasn't typed a custom override
  const handleUpdateParameter = useCallback(
    (updates: {
      engine?: TurntableEngine;
      stagingArchetype?: TurntableStagingArchetype;
      motionPreset?: TurntableMotionPreset;
      pedestalStyle?: TurntablePedestalStyle;
      lightingStyle?: TurntableLightingStyle;
      cameraElevation?: TurntableCameraElevation;
      selectedVariantId?: string;
      environmentId?: string;
      environmentPrompt?: string;
    }) => {
      if (updates.engine) setTurntableEngine(updates.engine);
      if (updates.stagingArchetype) setStagingArchetype(updates.stagingArchetype);
      if (updates.motionPreset) setMotionPreset(updates.motionPreset);
      if (updates.pedestalStyle) setPedestalStyle(updates.pedestalStyle);
      if (updates.lightingStyle) setLightingStyle(updates.lightingStyle);
      if (updates.cameraElevation) setCameraElevation(updates.cameraElevation);
      if (updates.selectedVariantId !== undefined) setSelectedVariantId(updates.selectedVariantId);
      if (updates.environmentId) setEnvironmentId(updates.environmentId);
      if (updates.environmentPrompt !== undefined) setEnvironmentPrompt(updates.environmentPrompt);

      if (!isTurntableUserDirtyRef.current) {
        setTurntablePrompt(getCompiledPrompt(updates));
      }
    },
    [getCompiledPrompt]
  );

  const handleSelectVariant = useCallback(
    (variantOrId: ProductVariant | string | null) => {
      const id = typeof variantOrId === "object" && variantOrId !== null ? variantOrId.id : variantOrId;
      setSelectedVariantId(id || undefined);
      const foundVariant =
        typeof variantOrId === "object" && variantOrId !== null
          ? variantOrId
          : productSpec?.variants?.find((v) => v.id === id);
      if (foundVariant?.imageUrl) {
        setSelectedProductRefUrl(foundVariant.imageUrl);
      }
      handleUpdateParameter({ selectedVariantId: id || undefined });
      if (foundVariant) {
        toast("Variant Selected", `Staged reference image and color for ${foundVariant.title}.`, "info");
      }
    },
    [handleUpdateParameter, productSpec?.variants, toast]
  );

  const handleChangeElevation = useCallback(
    (elevation: TurntableCameraElevation) => {
      setCameraElevation(elevation);
      handleUpdateParameter({ cameraElevation: elevation });
    },
    [handleUpdateParameter]
  );

  const handleToggleRadarPins = useCallback(
    (enabled: boolean) => {
      setEnableRadarPins(enabled);
      onUpdateScene({
        turntableEnableRadarPins: enabled,
        turntableRadarPins: radarPins,
      });
      toast(
        enabled ? "Feature Radar Pins Enabled" : "Feature Radar Pins Disabled",
        enabled ? "Dynamic radar callouts will pulse on top of the turntable scene." : "Radar pins hidden from this scene.",
        "info"
      );
    },
    [onUpdateScene, radarPins, toast]
  );

  const handleUpdateRadarPins = useCallback(
    (newPins: TurntableRadarPin[]) => {
      setRadarPins(newPins);
      onUpdateScene({
        turntableRadarPins: newPins,
      });
    },
    [onUpdateScene]
  );

  const handleOpenExportModal = useCallback(() => setIsExportModalOpen(true), []);
  const handleCloseExportModal = useCallback(() => setIsExportModalOpen(false), []);

  const handleResetToCompiledPrompt = useCallback(() => {
    isTurntableUserDirtyRef.current = false;
    setTurntablePrompt(getCompiledPrompt());
  }, [getCompiledPrompt]);

  // Generate Action
  const handleGenerateTurntableScene = async () => {
    if (!turntablePrompt.trim()) return;
    stopPollingAndTimer();
    setIsGeneratingTurntable(true);
    setTurntableElapsedSeconds(0);
    setCurrentStep(0);
    setProgressPercent(10);
    setTurntableStatusDetail(
      turntableEngine === "minimax_h3"
        ? "Staging product reference & preparing MiniMax H3 workflow..."
        : "Initializing Google Flow cluster for 8s 9:16 video diffusion..."
    );
    setTurntableError(null);
    setTurntableSuccessMessage(null);
    setLastCheckedAt(new Date());

    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      setTurntableElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    const activeVariant = productSpec?.variants?.find((v) => v.id === selectedVariantId);

    try {
      const res = await fetch("/api/ecommerce/generate-turntable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          productName,
          sceneIndex: currentScene.sceneIndex,
          productImageUrl: activeProductRefUrl || candidateProductUrls[0] || (productAssets[0]?.url) || undefined,
          engine: turntableEngine,
          stagingArchetype,
          motionPreset,
          pedestalStyle,
          lightingStyle,
          cameraElevation,
          variantTitle: activeVariant?.title,
          variantColorHex: activeVariant?.colorHex,
          environmentId,
          environmentPrompt,
          stepMode,
          promptOverride: turntablePrompt.trim(),
          personaId,
          attireId,
          aspectRatio: "9:16",
          durationSeconds: turntableEngine === "google_veo" ? 8 : 5.16,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to start turntable video generation");
      }

      const activeJobId = data.jobId;
      setTurntableJobId(activeJobId);
      if (typeof window !== "undefined") {
        localStorage.setItem(getJobStorageKey(currentScene.sceneIndex), activeJobId);
      }

      // Interval poller
      const intervalMs = Math.max(2000, (pollCadenceSeconds || 3) * 1000);
      pollRef.current = setInterval(async () => {
        try {
          const pollUrl = `/api/ecommerce/generate-turntable?jobId=${encodeURIComponent(activeJobId)}`;
          const pollRes = await fetch(pollUrl);
          const pollData = await pollRes.json();
          setLastCheckedAt(new Date());

          if (pollData.progress) setTurntableStatusDetail(pollData.progress);
          if (pollData.currentStep !== undefined) setCurrentStep(pollData.currentStep);
          if (pollData.totalSteps !== undefined) setTotalSteps(pollData.totalSteps);
          if (pollData.progressPercent !== undefined) setProgressPercent(pollData.progressPercent);
          if (pollData.vramUsedGb !== undefined) setVramUsedGb(pollData.vramUsedGb);
          if (pollData.logs && Array.isArray(pollData.logs)) setLiveLogs(pollData.logs);

          if (pollData.status === "completed" && pollData.videoUrl) {
            stopPollingAndTimer();
            onUpdateScene({
              sceneType: "product_turntable",
              customTurntableVideoUrl: pollData.videoUrl,
              primaryMediaUrl: pollData.videoUrl,
              turntablePreviewGifUrl: pollData.previewGifUrl,
              turntableEngine,
              turntableStagingArchetype: stagingArchetype,
              turntableMotionPreset: motionPreset,
              turntablePedestal: pedestalStyle,
              turntableLighting: lightingStyle,
              turntableStepMode: stepMode,
              turntableCameraElevation: cameraElevation,
              turntableEnableRadarPins: enableRadarPins,
              turntableRadarPins: radarPins,
              turntableSelectedVariantId: selectedVariantId,
              turntableSelectedVariantTitle: activeVariant?.title,
              turntableEnvironmentId: environmentId,
              turntableEnvironmentPrompt: environmentPrompt,
              turntablePrompt: turntablePrompt.trim(),
            });

            if (onAddAsset) {
              onAddAsset({
                id: `asset_turntable_${Date.now()}`,
                url: pollData.videoUrl,
                type: "existing_video",
                altText: `Neural Turntable: ${productName || "Product"}`,
              });
            }

            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            setTurntableSuccessMessage(
              `✨ Neural Product Turntable generated and attached to scene in ${formatTimer(elapsed)}!`
            );
            setIsGeneratingTurntable(false);
            if (typeof window !== "undefined") {
              localStorage.removeItem(getJobStorageKey(currentScene.sceneIndex));
            }
          } else if (pollData.status === "failed") {
            stopPollingAndTimer();
            setTurntableError(pollData.error || "Turntable generation failed");
            setIsGeneratingTurntable(false);
          }
        } catch (pollErr: unknown) {
          console.warn("[Turntable Poll Notice]", pollErr);
        }
      }, intervalMs);
    } catch (err: unknown) {
      const _e = err as Error;
      stopPollingAndTimer();
      setTurntableError(err instanceof Error ? err.message : "Failed to generate turntable video");
      setIsGeneratingTurntable(false);
    }
  };

  // Manual Check / Link Video Action
  const handleManualCheckNow = async () => {
    setIsCheckingNow(true);
    setTurntableError(null);
    try {
      const checkUrl = `/api/ecommerce/generate-turntable?productId=${encodeURIComponent(
        productId || ""
      )}&sceneIndex=${currentScene.sceneIndex}`;
      const res = await fetch(checkUrl);
      const data = await res.json();
      setLastCheckedAt(new Date());

      if (data.status === "completed" && data.videoUrl) {
        onUpdateScene({
          sceneType: "product_turntable",
          customTurntableVideoUrl: data.videoUrl,
          primaryMediaUrl: data.videoUrl,
          turntablePreviewGifUrl: data.previewGifUrl,
        });
        setTurntableSuccessMessage("✓ Existing verified turntable video located and linked to scene!");
        toast("Turntable Video Linked", "Verified packshot video linked to scene.", "success");
      } else {
        toast("No Finished Video Found", "No completed render found for this scene yet.", "info");
      }
    } catch {
      toast("Check Notice", "Could not query active turntable job status.", "warning");
    } finally {
      setIsCheckingNow(false);
    }
  };

  const handleResumePolling = (jobId: string) => {
    setTurntableJobId(jobId);
    setIsGeneratingTurntable(true);
    // starts timer and poller
  };

  const handleClearJob = () => {
    stopPollingAndTimer();
    setIsGeneratingTurntable(false);
    setTurntableJobId(null);
    setTurntableStatusDetail("");
    setTurntableError(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(getJobStorageKey(currentScene.sceneIndex));
    }
  };

  const handleDetachMediaFromScene = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    stopPollingAndTimer();
    setIsGeneratingTurntable(false);

    const defaultPhoto =
      productAssets.find((a) => !checkIsVideo(a.url))?.url ||
      productSpec?.assets?.find((a) => !checkIsVideo(a.url))?.url ||
      "";

    onUpdateScene({
      customTurntableVideoUrl: undefined,
      primaryMediaUrl: defaultPhoto || currentScene.primaryMediaUrl,
    });

    setTurntableSuccessMessage("↺ Reverted scene to original product photo packshot");
    toast("Video Detached", "Scene reverted to original product photo.", "info");
  };

  const handleDeleteTurntableVideo = async () => {
    setIsDeletingTurntable(true);
    try {
      handleDetachMediaFromScene();
      handleClearJob();
      setTurntableSuccessMessage("Turntable video removed from scene");
      toast("Video Removed", "Turntable video removed from current scene.", "info");
    } finally {
      setIsDeletingTurntable(false);
    }
  };

  const activeTurntableUrl =
    currentScene.customTurntableVideoUrl ||
    (currentScene.primaryMediaUrl && checkIsVideo(currentScene.primaryMediaUrl)
      ? currentScene.primaryMediaUrl
      : undefined);

  return {
    formatTimer,
    turntableEngine,
    setTurntableEngine,
    stagingArchetype,
    setStagingArchetype,
    motionPreset,
    setMotionPreset,
    pedestalStyle,
    setPedestalStyle,
    lightingStyle,
    setLightingStyle,
    stepMode,
    setStepMode,
    environmentId,
    setEnvironmentId,
    environmentPrompt,
    setEnvironmentPrompt,
    candidateProductUrls,
    activeProductRefUrl,
    selectedProductRefUrl,
    setSelectedProductRefUrl,
    resolvedPersonaImageUrl,
    turntablePrompt,
    setTurntablePrompt,
    isTurntableUserDirtyRef,
    isGeneratingTurntable,
    turntableJobId,
    turntableElapsedSeconds,
    turntableStatusDetail,
    turntableError,
    setTurntableError,
    turntableSuccessMessage,
    setTurntableSuccessMessage,
    liveLogs,
    showLiveLogsDrawer,
    setShowLiveLogsDrawer,
    isCheckingNow,
    pollCadenceSeconds,
    setPollCadenceSeconds,
    lastCheckedAt,
    currentStep,
    totalSteps,
    progressPercent,
    vramUsedGb,
    showVideoPreviewInStudio,
    setShowVideoPreviewInStudio,
    isDeletingTurntable,
    activeTurntableUrl,
    logsEndRef,
    cameraElevation,
    setCameraElevation,
    selectedVariantId,
    setSelectedVariantId,
    enableRadarPins,
    setEnableRadarPins,
    radarPins,
    setRadarPins,
    isExportModalOpen,
    setIsExportModalOpen,
    handleSelectVariant,
    handleChangeElevation,
    handleToggleRadarPins,
    handleUpdateRadarPins,
    socialProof,
    setSocialProof,
    handleUpdateSocialProof,
    isHookMatrixModalOpen,
    setIsHookMatrixModalOpen,
    handleOpenHookMatrixModal,
    handleCloseHookMatrixModal,
    handleOpenExportModal,
    handleCloseExportModal,
    handleUpdateParameter,
    handleResetToCompiledPrompt,
    handleGenerateTurntableScene,
    handleManualCheckNow,
    handleResumePolling,
    handleClearJob,
    handleDetachMediaFromScene,
    handleDeleteTurntableVideo,
    checkIsVideo,
  };
}
