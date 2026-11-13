/**
 * src/components/editor/shared/visuals/hooks/useVeoSceneGeneration.ts
 *
 * Custom hook encapsulating Veo 3.1 video diffusion generation,
 * polling intervals, stopwatch timer, localStorage job recovery,
 * manual check, and prompt safety filtering.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  AdScene,
  ExtractedProductAsset,
  ProductSpec,
} from "@/lib/types/ecommerce";
import { getBespokeEnglishVeoPrompt } from "@/lib/ecommerce/adCopywriter";
import { filterPromptForSafety } from "@/lib/ecommerce/promptSafetyFilter";
import { detectLanguageWithMediaPipe } from "@/lib/ecommerce/mediapipeLanguageDetector";
import {
  resolvePersonaAttireImageUrl,
  buildConditionedReferenceUrls,
  hasPersonaInPrompt,
  getPersonaPromptDetails,
  detectLanguage,
  reconcilePromptWithSceneDialogueAndReferences,
  PERFORMANCE_MOODS,
  getPerformanceMood,
  getSettingActionTemplates,
  getSceneDialogueVariations,
  resolveSettingKey,
} from "@/lib/ecommerce/personaPromptHelper";
import { detectCategoryFromProduct } from "@/lib/ecommerce/productMediaPresets";

export interface UseVeoSceneGenerationProps {
  currentScene: AdScene;
  onUpdateScene: (updates: Partial<AdScene>) => void;
  productAssets: ExtractedProductAsset[];
  productId?: string;
  productName?: string;
  productSpec?: ProductSpec;
  personaId?: string;
  attireId?: string;
  avatarSrc?: string;
  actionLoopId?: string;
  videoUrl?: string;
  onAddAsset?: (asset: ExtractedProductAsset) => void;
  onRemoveAsset?: (assetUrl: string) => void;
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

export function useVeoSceneGeneration({
  currentScene,
  onUpdateScene,
  productAssets = [],
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
}: UseVeoSceneGenerationProps) {
  // Helper to test if a URL or asset type corresponds to a video
  const checkIsVideo = useCallback((url: string, type?: string) => {
    if (!url) return false;
    if (type === "existing_video" || type === "custom_veo_hero" || type === "video") return true;
    const clean = url.split("?")[0].toLowerCase();
    return (
      clean.endsWith(".mp4") ||
      clean.endsWith(".webm") ||
      clean.endsWith(".mov") ||
      clean.endsWith(".m4v") ||
      clean.includes("/video/") ||
      clean.includes("veo_")
    );
  }, []);

  const initialVeoCategory = useMemo(() => {
    return detectCategoryFromProduct(productSpec, productName);
  }, [productSpec, productName]);

  const [veoCategory, setVeoCategory] = useState<string>(initialVeoCategory);

  const [mediaPipeDetectedLang, setMediaPipeDetectedLang] = useState<"Spanish" | "English" | null>(null);

  useEffect(() => {
    const text = currentScene.voiceoverScript || currentScene.headline || "";
    if (!text.trim()) {
      setMediaPipeDetectedLang(null);
      return;
    }
    let isCurrent = true;
    detectLanguageWithMediaPipe(text).then((res) => {
      if (isCurrent && res && res.isReliable) {
        setMediaPipeDetectedLang(
          res.language.startsWith("es")
            ? "Spanish"
            : res.language.startsWith("en")
            ? "English"
            : null
        );
      }
    });
    return () => {
      isCurrent = false;
    };
  }, [currentScene.voiceoverScript, currentScene.headline]);

  const detectedSceneLanguage = useMemo(() => {
    if (mediaPipeDetectedLang) return mediaPipeDetectedLang;
    const text = currentScene.voiceoverScript || currentScene.headline || "";
    return detectLanguage(text);
  }, [mediaPipeDetectedLang, currentScene.voiceoverScript, currentScene.headline]);

  const [veoAllowSpeaking, setVeoAllowSpeaking] = useState<boolean>(true);
  const [veoLanguageOverride, setVeoLanguageOverride] = useState<string>("auto");

  const getResolvedEnglishPrompt = useCallback(
    (cue?: string, allowSpeakingOverride?: boolean, langOverride?: string) => {
      const sceneDialogue = currentScene.voiceoverScript || currentScene.headline || "";
      const effectiveAllowSpeaking =
        allowSpeakingOverride !== undefined ? allowSpeakingOverride : veoAllowSpeaking;
      const effectiveLanguage =
        langOverride && langOverride !== "auto"
          ? langOverride
          : veoLanguageOverride !== "auto"
          ? veoLanguageOverride
          : detectedSceneLanguage;

      if (currentScene.customVeoPrompt && hasPersonaInPrompt(currentScene.customVeoPrompt)) {
        return reconcilePromptWithSceneDialogueAndReferences(currentScene.customVeoPrompt, {
          productName: productName || productSpec?.title || "the product",
          dialogue: sceneDialogue,
          language: effectiveLanguage,
          allowSpeaking: effectiveAllowSpeaking,
        });
      }

      if (productSpec) {
        return filterPromptForSafety(
          getBespokeEnglishVeoPrompt(
            productSpec,
            cue || currentScene.cameraCue || "drone_flyover",
            personaId,
            attireId,
            "living_room",
            {
              dialogue: sceneDialogue,
              language: effectiveLanguage,
              sceneIndex: currentScene.sceneIndex,
              headline: currentScene.headline,
              visualActionPrompt: currentScene.visualActionPrompt,
              allowSpeaking: effectiveAllowSpeaking,
            }
          ),
          { allowSpeaking: effectiveAllowSpeaking }
        );
      }

      const pDetails = getPersonaPromptDetails({
        personaId,
        attireId,
        productName: productName || "the product",
        typology: "surface_material",
        dialogue: sceneDialogue,
        language: effectiveLanguage,
        allowSpeaking: effectiveAllowSpeaking,
      });

      return filterPromptForSafety(
        `Smooth floating aerial glide moving steadily forward across an expansive sunlit luxury living room featuring ${productName || "the product"}, ${pDetails.fullPersonaPromptClause}, pure unobstructed camera POV, no physical drones, no quadcopters, no camera equipment visible in frame, natural daylight reflections, high-end interior architecture, photorealistic 8k commercial quality, 30fps`,
        { allowSpeaking: effectiveAllowSpeaking }
      );
    },
    [
      currentScene.customVeoPrompt,
      currentScene.cameraCue,
      currentScene.voiceoverScript,
      currentScene.headline,
      currentScene.sceneIndex,
      currentScene.visualActionPrompt,
      productSpec,
      productName,
      personaId,
      attireId,
      veoAllowSpeaking,
      veoLanguageOverride,
      detectedSceneLanguage,
    ]
  );

  // Custom Veo Scene Generation State
  const [veoPrompt, setVeoPrompt] = useState<string>(() => getResolvedEnglishPrompt());
  const isVeoUserDirtyRef = useRef<boolean>(false);
  const lastVeoSceneIdRef = useRef<string>(currentScene.id);
  const [veoCameraCue, setVeoCameraCue] = useState<string>(
    currentScene.cameraCue || "drone_flyover"
  );

  const handleToggleAllowSpeaking = useCallback(
    (newVal: boolean) => {
      setVeoAllowSpeaking(newVal);
      isVeoUserDirtyRef.current = false;
      setVeoPrompt((prevPrompt) => {
        const sceneDialogue = currentScene.voiceoverScript || currentScene.headline || "";
        const effectiveLang =
          veoLanguageOverride !== "auto" ? veoLanguageOverride : detectedSceneLanguage;
        const base =
          prevPrompt && hasPersonaInPrompt(prevPrompt)
            ? prevPrompt
            : getResolvedEnglishPrompt(veoCameraCue, newVal, veoLanguageOverride);
        return reconcilePromptWithSceneDialogueAndReferences(base, {
          productName: productName || productSpec?.title || "the product",
          dialogue: sceneDialogue,
          language: effectiveLang,
          allowSpeaking: newVal,
        });
      });
    },
    [
      getResolvedEnglishPrompt,
      veoCameraCue,
      veoLanguageOverride,
      currentScene.voiceoverScript,
      currentScene.headline,
      detectedSceneLanguage,
      productName,
      productSpec?.title,
    ]
  );

  const handleSelectLanguageOverride = useCallback(
    (newLang: string) => {
      setVeoLanguageOverride(newLang);
      if (veoAllowSpeaking) {
        isVeoUserDirtyRef.current = false;
        setVeoPrompt((prevPrompt) => {
          const sceneDialogue = currentScene.voiceoverScript || currentScene.headline || "";
          const effectiveLang = newLang !== "auto" ? newLang : detectedSceneLanguage;
          const base =
            prevPrompt && hasPersonaInPrompt(prevPrompt)
              ? prevPrompt
              : getResolvedEnglishPrompt(veoCameraCue, veoAllowSpeaking, newLang);
          return reconcilePromptWithSceneDialogueAndReferences(base, {
            productName: productName || productSpec?.title || "the product",
            dialogue: sceneDialogue,
            language: effectiveLang,
            allowSpeaking: true,
          });
        });
      }
    },
    [
      getResolvedEnglishPrompt,
      veoCameraCue,
      veoAllowSpeaking,
      currentScene.voiceoverScript,
      currentScene.headline,
      detectedSceneLanguage,
      productName,
      productSpec?.title,
    ]
  );

  // 6-Template Matrix, Dialogue Variations & Customize Performance State
  const [currentTemplateIndex, setCurrentTemplateIndex] = useState<number>(
    () => (currentScene.sceneIndex || 0) % 6
  );
  const [currentDialogueIndex, setCurrentDialogueIndex] = useState<number>(
    () => (currentScene.sceneIndex || 0) % 6
  );
  const [veoPerformanceMood, setVeoPerformanceMood] = useState<string>("energetic");
  const [veoPerformance, setVeoPerformance] = useState<string>(PERFORMANCE_MOODS[0].clause);

  const activeSettingKey = useMemo(() => {
    return resolveSettingKey(undefined, undefined, veoPrompt);
  }, [veoPrompt]);

  const availableActionTemplates = useMemo(() => {
    return getSettingActionTemplates(activeSettingKey);
  }, [activeSettingKey]);

  const availableDialogueOptions = useMemo(() => {
    const effectiveLang =
      veoLanguageOverride !== "auto" ? veoLanguageOverride : detectedSceneLanguage;
    return getSceneDialogueVariations(
      productName || productSpec?.title || "the product",
      effectiveLang
    );
  }, [productName, productSpec?.title, veoLanguageOverride, detectedSceneLanguage]);

  const handleRerollActionTemplate = useCallback(() => {
    const nextIdx = (currentTemplateIndex + 1) % availableActionTemplates.length;
    setCurrentTemplateIndex(nextIdx);
    isVeoUserDirtyRef.current = false;
    const nextTemplate = availableActionTemplates[nextIdx];
    const effectiveLang =
      veoLanguageOverride !== "auto" ? veoLanguageOverride : detectedSceneLanguage;
    const sceneDialogue = currentScene.voiceoverScript || currentScene.headline || "";

    let nextPerf = veoPerformance;
    if (nextTemplate.defaultPerformance) {
      nextPerf = nextTemplate.defaultPerformance;
      setVeoPerformance(nextPerf);
      if (nextTemplate.defaultMoodId) {
        setVeoPerformanceMood(nextTemplate.defaultMoodId);
      }
    }

    setVeoPrompt((prevPrompt) => {
      const base =
        prevPrompt && hasPersonaInPrompt(prevPrompt)
          ? prevPrompt
          : getResolvedEnglishPrompt(veoCameraCue, veoAllowSpeaking, effectiveLang);
      return reconcilePromptWithSceneDialogueAndReferences(base, {
        productName: productName || productSpec?.title || "the product",
        dialogue: sceneDialogue,
        language: effectiveLang,
        allowSpeaking: veoAllowSpeaking,
        templateIndex: nextIdx,
        rerollTemplate: true,
        performanceClause: nextPerf,
      });
    });
    setVeoSuccessMessage(`🎲 Swapped to Action Template (${nextIdx + 1}/6: ${nextTemplate.label})`);
  }, [
    currentTemplateIndex,
    availableActionTemplates,
    veoLanguageOverride,
    detectedSceneLanguage,
    currentScene.voiceoverScript,
    currentScene.headline,
    veoPerformance,
    getResolvedEnglishPrompt,
    veoCameraCue,
    veoAllowSpeaking,
    productName,
    productSpec?.title,
  ]);

  const handleRerollDialogue = useCallback(() => {
    const nextIdx = (currentDialogueIndex + 1) % availableDialogueOptions.length;
    setCurrentDialogueIndex(nextIdx);
    isVeoUserDirtyRef.current = false;
    const nextOption = availableDialogueOptions[nextIdx];
    const effectiveLang =
      veoLanguageOverride !== "auto" ? veoLanguageOverride : detectedSceneLanguage;

    setVeoPrompt((prevPrompt) => {
      const base =
        prevPrompt && hasPersonaInPrompt(prevPrompt)
          ? prevPrompt
          : getResolvedEnglishPrompt(veoCameraCue, true, effectiveLang);
      return reconcilePromptWithSceneDialogueAndReferences(base, {
        productName: productName || productSpec?.title || "the product",
        dialogue: nextOption.text,
        language: effectiveLang,
        allowSpeaking: true,
        performanceClause: veoPerformance,
      });
    });
    setVeoAllowSpeaking(true);
    setVeoSuccessMessage(`🎲 Rerolled Dialogue (${nextIdx + 1}/6: ${nextOption.label})`);
  }, [
    currentDialogueIndex,
    availableDialogueOptions,
    veoLanguageOverride,
    detectedSceneLanguage,
    getResolvedEnglishPrompt,
    veoCameraCue,
    productName,
    productSpec?.title,
    veoPerformance,
  ]);

  const handleSelectPerformanceMood = useCallback(
    (moodId: string) => {
      const mood = getPerformanceMood(moodId);
      if (!mood) return;
      setVeoPerformanceMood(moodId);
      setVeoPerformance(mood.clause);
      isVeoUserDirtyRef.current = false;

      if (veoAllowSpeaking) {
        setVeoPrompt((prevPrompt) => {
          const sceneDialogue = currentScene.voiceoverScript || currentScene.headline || "";
          const effectiveLang =
            veoLanguageOverride !== "auto" ? veoLanguageOverride : detectedSceneLanguage;
          const base =
            prevPrompt && hasPersonaInPrompt(prevPrompt)
              ? prevPrompt
              : getResolvedEnglishPrompt(veoCameraCue, true, effectiveLang);
          return reconcilePromptWithSceneDialogueAndReferences(base, {
            productName: productName || productSpec?.title || "the product",
            dialogue: sceneDialogue,
            language: effectiveLang,
            allowSpeaking: true,
            performanceClause: mood.clause,
            performanceMood: moodId,
          });
        });
        setVeoSuccessMessage(`🎭 Performance mood set to ${mood.emoji} ${mood.label}`);
      }
    },
    [
      veoAllowSpeaking,
      currentScene.voiceoverScript,
      currentScene.headline,
      veoLanguageOverride,
      detectedSceneLanguage,
      getResolvedEnglishPrompt,
      veoCameraCue,
      productName,
      productSpec?.title,
    ]
  );

  const handleChangePerformance = useCallback(
    (customClause: string) => {
      setVeoPerformance(customClause);
      setVeoPerformanceMood("custom");
      isVeoUserDirtyRef.current = false;

      if (veoAllowSpeaking) {
        setVeoPrompt((prevPrompt) => {
          const sceneDialogue = currentScene.voiceoverScript || currentScene.headline || "";
          const effectiveLang =
            veoLanguageOverride !== "auto" ? veoLanguageOverride : detectedSceneLanguage;
          const base =
            prevPrompt && hasPersonaInPrompt(prevPrompt)
              ? prevPrompt
              : getResolvedEnglishPrompt(veoCameraCue, true, effectiveLang);
          return reconcilePromptWithSceneDialogueAndReferences(base, {
            productName: productName || productSpec?.title || "the product",
            dialogue: sceneDialogue,
            language: effectiveLang,
            allowSpeaking: true,
            performanceClause: customClause,
          });
        });
      }
    },
    [
      veoAllowSpeaking,
      currentScene.voiceoverScript,
      currentScene.headline,
      veoLanguageOverride,
      detectedSceneLanguage,
      getResolvedEnglishPrompt,
      veoCameraCue,
      productName,
      productSpec?.title,
    ]
  );
  const [veoDuration, setVeoDuration] = useState<number>(8);
  const [isGeneratingVeo, setIsGeneratingVeo] = useState<boolean>(false);
  const [veoElapsedSeconds, setVeoElapsedSeconds] = useState<number>(0);
  const [veoStatusDetail, setVeoStatusDetail] = useState<string>("");
  const [veoJobId, setVeoJobId] = useState<string | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const [pollCadenceSeconds, setPollCadenceSeconds] = useState<number>(3);
  const [veoError, setVeoError] = useState<string | null>(null);
  const [veoSuccessMessage, setVeoSuccessMessage] = useState<string | null>(null);
  const [liveLogs, setLiveLogs] = useState<string[]>([]);
  const [showLiveLogsDrawer, setShowLiveLogsDrawer] = useState<boolean>(false);
  const [isCheckingNow, setIsCheckingNow] = useState<boolean>(false);
  const logsEndRef = useRef<HTMLDivElement | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const formatTimer = useCallback((totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, []);

  const stopVeoPollingAndTimer = useCallback(() => {
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
      stopVeoPollingAndTimer();
    };
  }, [stopVeoPollingAndTimer]);

  // Sync active category if productSpec detection changes or finishes loading
  useEffect(() => {
    if (initialVeoCategory && initialVeoCategory !== veoCategory) {
      setVeoCategory(initialVeoCategory);
    }
  }, [initialVeoCategory, veoCategory]);

  useEffect(() => {
    const isNewScene = lastVeoSceneIdRef.current !== currentScene.id;
    if (isNewScene) {
      lastVeoSceneIdRef.current = currentScene.id;
      isVeoUserDirtyRef.current = false;
      const sIdx = currentScene.sceneIndex || 0;
      setCurrentTemplateIndex(sIdx % 6);
      setCurrentDialogueIndex(sIdx % 6);
    }

    if (!isVeoUserDirtyRef.current || !hasPersonaInPrompt(veoPrompt) || !veoPrompt.trim()) {
      setVeoPrompt(getResolvedEnglishPrompt(veoCameraCue));
    }
    if (currentScene.cameraCue) {
      setVeoCameraCue(currentScene.cameraCue);
    }
  }, [currentScene.id, currentScene.customVeoPrompt, currentScene.cameraCue, currentScene.sceneIndex, getResolvedEnglishPrompt, veoCameraCue, veoPrompt]);

  const [selectedProductRefUrl, setSelectedProductRefUrl] = useState<string | null>(null);

  useEffect(() => {
    setSelectedProductRefUrl(null);
  }, [currentScene.id]);

  const resolvedPersonaImageUrl = useMemo(() => {
    return resolvePersonaAttireImageUrl({
      personaId,
      attireId,
      avatarSrc: avatarSrc || currentScene.presenterConfig?.avatarSrc || currentScene.presenter?.avatarSrc,
      actionLoopId: actionLoopId || currentScene.presenterConfig?.selectedActionLoopId,
      videoUrl: videoUrl || currentScene.presenterConfig?.videoUrl,
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
  ]);

  const candidateProductUrls = useMemo(() => {
    const urls: string[] = [];
    const seen = new Set<string>();

    const add = (u?: string | null) => {
      if (!u || typeof u !== "string") return;
      const clean = u.trim();
      if (!clean) return;
      if (
        clean.includes("/avatars/") ||
        clean.includes("avatar_") ||
        clean.includes("ruby_chroma") ||
        clean.includes("sofia_chroma") ||
        clean.includes("mateo_chroma") ||
        clean.includes("blaze_chroma")
      ) {
        return;
      }
      if (!seen.has(clean)) {
        seen.add(clean);
        urls.push(clean);
      }
    };

    if (currentScene.primaryMediaUrl) add(currentScene.primaryMediaUrl);
    if (currentScene.secondaryMediaUrl) add(currentScene.secondaryMediaUrl);

    if (Array.isArray(productAssets)) {
      const primaries = productAssets.filter((a) => a.isPrimary && a.url).map((a) => a.url);
      const others = productAssets.filter((a) => !a.isPrimary && a.url).map((a) => a.url);
      primaries.forEach(add);
      others.forEach(add);
    }

    if (Array.isArray(productSpec?.assets)) {
      for (const a of productSpec.assets) {
        if (a?.url) add(a.url);
      }
    }

    return urls;
  }, [
    currentScene.primaryMediaUrl,
    currentScene.secondaryMediaUrl,
    productAssets,
    productSpec?.assets,
  ]);

  const activeProductRefUrl = useMemo(() => {
    if (selectedProductRefUrl && candidateProductUrls.includes(selectedProductRefUrl)) {
      return selectedProductRefUrl;
    }
    return candidateProductUrls[0] || null;
  }, [selectedProductRefUrl, candidateProductUrls]);

  const effectiveVeoReferenceUrls = useMemo(() => {
    const productUrls: string[] = [];
    if (activeProductRefUrl) {
      productUrls.push(activeProductRefUrl);
    }

    return buildConditionedReferenceUrls({
      personaImageUrl: resolvedPersonaImageUrl,
      productMediaUrls: productUrls,
      maxImages: 2,
      hasCharacter: true,
    });
  }, [resolvedPersonaImageUrl, activeProductRefUrl]);

  const getJobStorageKey = useCallback(
    (sIndex: number) => `veo_job_${productId || "default"}_scene_${sIndex}`,
    [productId]
  );

  // Auto-recover active / pending job from localStorage on mount or scene navigation
  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = getJobStorageKey(currentScene.sceneIndex);
    const savedJobId = localStorage.getItem(key);
    if (savedJobId && !veoJobId) {
      setVeoJobId(savedJobId);
      setVeoStatusDetail(`Tracked job [${savedJobId}]. Checking status...`);
      fetch(
        `/api/ecommerce/generate-custom-scene?jobId=${encodeURIComponent(
          savedJobId
        )}&productId=${encodeURIComponent(productId || "")}&sceneIndex=${currentScene.sceneIndex}`
      )
        .then((r) => r.json())
        .then((data) => {
          setLastCheckedAt(new Date());
          if (data.status === "completed" && data.videoUrl) {
            onUpdateScene({
              sceneType: "custom_veo_hero",
              customVeoPrompt: veoPrompt.trim(),
              customVeoVideoUrl: data.videoUrl,
              primaryMediaUrl: data.videoUrl,
              audioUrl: data.videoUrl,
              audioCacheKey: `video::${data.videoUrl}`,
              audioDuration: currentScene.audioDuration || 8.0,
              durationFrames: Math.max(240, currentScene.durationFrames || 240),
              cameraCue: veoCameraCue,
            });
            if (onAddAsset) {
              onAddAsset({
                id: `asset_veo_${Date.now()}`,
                url: data.videoUrl,
                type: "existing_video",
                altText: `Custom Veo Hero Video: ${productName || "Product"}`,
              });
            }
            setVeoSuccessMessage("✨ Found completed Veo video and applied to scene!");
            setIsGeneratingVeo(false);
            localStorage.removeItem(key);
          } else if (data.status === "processing") {
            setVeoStatusDetail(data.progress || "Generation is in progress on cluster...");
            if (data.elapsedSeconds) setVeoElapsedSeconds(data.elapsedSeconds);
          } else if (data.status === "failed") {
            setVeoError(data.error || "Generation job failed");
          }
          if (data.logs && Array.isArray(data.logs)) setLiveLogs(data.logs);
        })
        .catch(() => {});
    }
  }, [currentScene.sceneIndex, currentScene.audioDuration, currentScene.durationFrames, getJobStorageKey, productId, veoJobId, onUpdateScene, veoPrompt, veoCameraCue, onAddAsset, productName]);

  // Auto-scroll live logs
  useEffect(() => {
    if (showLiveLogsDrawer) {
      logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [liveLogs, showLiveLogsDrawer]);

  // Manual check button action
  const handleManualCheckNow = useCallback(async () => {
    setIsCheckingNow(true);
    const key = getJobStorageKey(currentScene.sceneIndex);
    const savedJobId = typeof window !== "undefined" ? localStorage.getItem(key) : null;
    const activeId = veoJobId || savedJobId;

    setVeoStatusDetail("Scanning Google Flow, downloads & local disk for scene video...");
    setLastCheckedAt(new Date());

    const url = `/api/ecommerce/generate-custom-scene?${
      activeId ? `jobId=${encodeURIComponent(activeId)}&` : ""
    }productId=${encodeURIComponent(productId || "")}&sceneIndex=${currentScene.sceneIndex}`;

    try {
      const res = await fetch(url);
      const data = await res.json();
      setLastCheckedAt(new Date());

      if (data.progress) {
        setVeoStatusDetail(data.progress);
      }
      if (data.logs && Array.isArray(data.logs)) {
        setLiveLogs(data.logs);
      }

      if (data.status === "completed" && data.videoUrl) {
        stopVeoPollingAndTimer();
        onUpdateScene({
          sceneType: "custom_veo_hero",
          customVeoPrompt: filterPromptForSafety(veoPrompt.trim()),
          customVeoVideoUrl: data.videoUrl,
          primaryMediaUrl: data.videoUrl,
          audioUrl: data.videoUrl,
          audioCacheKey: `video::${data.videoUrl}`,
          audioDuration: currentScene.audioDuration || 8.0,
          durationFrames: Math.max(240, currentScene.durationFrames || 240),
          cameraCue: veoCameraCue,
        });
        if (onAddAsset) {
          onAddAsset({
            id: `asset_veo_${Date.now()}`,
            url: data.videoUrl,
            type: "existing_video",
            altText: `Custom Veo Hero Video: ${productName || "Product"}`,
          });
        }
        setVeoSuccessMessage("✨ Custom Veo scene verified, linked, and saved to product assets!");
        setIsGeneratingVeo(false);
        if (typeof window !== "undefined") localStorage.removeItem(key);
      } else if (data.status === "processing") {
        setVeoStatusDetail(data.progress || "Generation is in progress on cluster...");
        if (data.elapsedSeconds) setVeoElapsedSeconds(data.elapsedSeconds);
      } else if (data.status === "failed") {
        stopVeoPollingAndTimer();
        setVeoError(data.error || "Veo generation failed");
        setIsGeneratingVeo(false);
      } else if (data.status === "idle") {
        setVeoStatusDetail("No completed video found on disk yet. Click 'Open Google Flow' to view generation tiles or downloads.");
      }
    } catch (err: unknown) {
      const e = err as Error;
      console.warn("[handleManualCheckNow]", err);
      setVeoError("Failed to check status: " + (e?.message || String(err)));
    } finally {
      setIsCheckingNow(false);
    }
  }, [getJobStorageKey, currentScene.sceneIndex, currentScene.audioDuration, currentScene.durationFrames, veoJobId, productId, stopVeoPollingAndTimer, onUpdateScene, veoPrompt, veoCameraCue, onAddAsset, productName]);

  const handleResumePolling = useCallback(
    (targetJobId: string) => {
      stopVeoPollingAndTimer();
      setIsGeneratingVeo(true);
      setVeoJobId(targetJobId);
      setVeoStatusDetail(`Resuming live monitoring for job ${targetJobId}...`);
      setLastCheckedAt(new Date());

      const initialElapsed = veoElapsedSeconds || 0;
      const startTime = Date.now() - initialElapsed * 1000;
      timerRef.current = setInterval(() => {
        setVeoElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);

      const intervalMs = Math.max(2000, (pollCadenceSeconds || 3) * 1000);
      pollRef.current = setInterval(async () => {
        try {
          const pollUrl = `/api/ecommerce/generate-custom-scene?jobId=${encodeURIComponent(
            targetJobId
          )}&productId=${encodeURIComponent(productId || "")}&sceneIndex=${currentScene.sceneIndex}`;

          const pollRes = await fetch(pollUrl);
          const pollData = await pollRes.json();
          setLastCheckedAt(new Date());

          if (pollData.progress) {
            setVeoStatusDetail(pollData.progress);
          }
          if (pollData.logs && Array.isArray(pollData.logs)) {
            setLiveLogs(pollData.logs);
          }

          if (pollData.status === "completed" && pollData.videoUrl) {
            stopVeoPollingAndTimer();
            onUpdateScene({
              sceneType: "custom_veo_hero",
              customVeoPrompt: veoPrompt.trim(),
              customVeoVideoUrl: pollData.videoUrl,
              primaryMediaUrl: pollData.videoUrl,
              audioUrl: pollData.videoUrl,
              audioCacheKey: `video::${pollData.videoUrl}`,
              audioDuration: currentScene.audioDuration || 8.0,
              durationFrames: Math.max(240, currentScene.durationFrames || 240),
              cameraCue: veoCameraCue,
            });
            if (onAddAsset) {
              onAddAsset({
                id: `asset_veo_${Date.now()}`,
                url: pollData.videoUrl,
                type: "existing_video",
                altText: `Custom Veo Hero Video: ${productName || "Product"}`,
              });
            }
            setVeoSuccessMessage("✨ Custom Veo scene generated, applied, and saved!");
            setIsGeneratingVeo(false);
            if (typeof window !== "undefined") {
              localStorage.removeItem(getJobStorageKey(currentScene.sceneIndex));
            }
          } else if (pollData.status === "failed") {
            stopVeoPollingAndTimer();
            setVeoError(pollData.error || "Veo generation failed");
            setIsGeneratingVeo(false);
          }
        } catch (pollErr: unknown) {
          console.warn("[Veo Poll Notice]", pollErr);
        }
      }, intervalMs);
    },
    [
      stopVeoPollingAndTimer,
      veoElapsedSeconds,
      pollCadenceSeconds,
      productId,
      currentScene.sceneIndex,
      currentScene.audioDuration,
      currentScene.durationFrames,
      onUpdateScene,
      veoPrompt,
      veoCameraCue,
      onAddAsset,
      productName,
      getJobStorageKey,
    ]
  );

  const handleClearJob = useCallback(() => {
    stopVeoPollingAndTimer();
    setIsGeneratingVeo(false);
    setVeoJobId(null);
    setVeoStatusDetail("");
    setVeoError(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(getJobStorageKey(currentScene.sceneIndex));
    }
  }, [stopVeoPollingAndTimer, getJobStorageKey, currentScene.sceneIndex]);

  const handleGenerateVeoScene = async () => {
    if (!veoPrompt.trim()) return;
    stopVeoPollingAndTimer();
    setIsGeneratingVeo(true);
    setVeoElapsedSeconds(0);
    setVeoStatusDetail("Staging reference photos & initializing Veo 3.1...");
    setVeoError(null);
    setVeoSuccessMessage(null);
    setLastCheckedAt(new Date());

    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      setVeoElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    try {
      const res = await fetch("/api/ecommerce/generate-custom-scene", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          productName,
          sceneIndex: currentScene.sceneIndex,
          prompt: filterPromptForSafety(veoPrompt.trim(), { allowSpeaking: veoAllowSpeaking }),
          cameraCue: veoCameraCue,
          duration: 8,
          aspectRatio: "9:16",
          referenceImageUrls: effectiveVeoReferenceUrls,
          personaId,
          attireId,
          avatarSrc: avatarSrc || currentScene.presenterConfig?.avatarSrc || currentScene.presenter?.avatarSrc,
          actionLoopId: actionLoopId || currentScene.presenterConfig?.selectedActionLoopId,
          videoUrl: videoUrl || currentScene.presenterConfig?.videoUrl,
          mode: "async",
          allowSpeaking: veoAllowSpeaking,
          language: veoLanguageOverride !== "auto" ? veoLanguageOverride : detectedSceneLanguage,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to start custom Veo scene generation");
      }

      if (data.status === "completed" && data.videoUrl) {
        stopVeoPollingAndTimer();
        onUpdateScene({
          sceneType: "custom_veo_hero",
          customVeoPrompt: veoPrompt.trim(),
          customVeoVideoUrl: data.videoUrl,
          primaryMediaUrl: data.videoUrl,
          audioUrl: data.videoUrl,
          audioCacheKey: `video::${data.videoUrl}`,
          audioDuration: currentScene.audioDuration || 8.0,
          durationFrames: Math.max(240, currentScene.durationFrames || 240),
          cameraCue: veoCameraCue,
        });
        if (onAddAsset) {
          onAddAsset({
            id: `asset_veo_${Date.now()}`,
            url: data.videoUrl,
            type: "existing_video",
            altText: `Custom Veo Hero Video: ${productName || "Product"}`,
          });
        }
        setVeoSuccessMessage("✨ Custom Veo scene generated, applied, and saved to product assets!");
        setIsGeneratingVeo(false);
        if (typeof window !== "undefined") {
          localStorage.removeItem(getJobStorageKey(currentScene.sceneIndex));
        }
        return;
      }

      const activeJobId = data.jobId;
      setVeoJobId(activeJobId);
      if (typeof window !== "undefined") {
        localStorage.setItem(getJobStorageKey(currentScene.sceneIndex), activeJobId);
      }
      setVeoStatusDetail(data.message || "Synthesizing 8s video diffusion on Google Flow cluster...");

      const intervalMs = Math.max(2000, (pollCadenceSeconds || 3) * 1000);
      pollRef.current = setInterval(async () => {
        try {
          const pollUrl = `/api/ecommerce/generate-custom-scene?jobId=${encodeURIComponent(
            activeJobId
          )}&productId=${encodeURIComponent(productId || "")}&sceneIndex=${currentScene.sceneIndex}`;

          const pollRes = await fetch(pollUrl);
          const pollData = await pollRes.json();
          setLastCheckedAt(new Date());

          if (pollData.progress) {
            setVeoStatusDetail(pollData.progress);
          }
          if (pollData.logs && Array.isArray(pollData.logs)) {
            setLiveLogs(pollData.logs);
          }

          if (pollData.status === "completed" && pollData.videoUrl) {
            stopVeoPollingAndTimer();
            onUpdateScene({
              sceneType: "custom_veo_hero",
              customVeoPrompt: veoPrompt.trim(),
              customVeoVideoUrl: pollData.videoUrl,
              primaryMediaUrl: pollData.videoUrl,
              audioUrl: pollData.videoUrl,
              audioCacheKey: `video::${pollData.videoUrl}`,
              audioDuration: currentScene.audioDuration || 8.0,
              durationFrames: Math.max(240, currentScene.durationFrames || 240),
              cameraCue: veoCameraCue,
            });
            if (onAddAsset) {
              onAddAsset({
                id: `asset_veo_${Date.now()}`,
                url: pollData.videoUrl,
                type: "existing_video",
                altText: `Custom Veo Hero Video: ${productName || "Product"}`,
              });
            }
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            setVeoSuccessMessage(`✨ Custom Veo scene generated, applied, and saved in ${formatTimer(elapsed)}!`);
            setIsGeneratingVeo(false);
            if (typeof window !== "undefined") {
              localStorage.removeItem(getJobStorageKey(currentScene.sceneIndex));
            }
          } else if (pollData.status === "failed") {
            stopVeoPollingAndTimer();
            setVeoError(pollData.error || "Veo generation failed");
            setIsGeneratingVeo(false);
          }
        } catch (pollErr: unknown) {
          console.warn("[Veo Poll Check Notice]", pollErr);
        }
      }, intervalMs);

    } catch (err: unknown) {
      const e = err as Error;
      stopVeoPollingAndTimer();
      setVeoError(e?.message || "Failed to generate custom Veo scene");
      setIsGeneratingVeo(false);
    }
  };

  const [isDeletingVeo, setIsDeletingVeo] = useState<boolean>(false);

  const activeVeoUrl =
    currentScene.customVeoVideoUrl ||
    (currentScene.primaryMediaUrl && checkIsVideo(currentScene.primaryMediaUrl)
      ? currentScene.primaryMediaUrl
      : undefined);

  const handleDetachMediaFromScene = (e?: React.MouseEvent, sceneZeroIndex?: number) => {
    if (e) e.stopPropagation();
    stopVeoPollingAndTimer();
    setIsGeneratingVeo(false);

    const defaultPhoto =
      productAssets.find((a) => !checkIsVideo(a.url))?.url ||
      productSpec?.assets?.find((a) => !checkIsVideo(a.url))?.url ||
      "";

    const targetIdx =
      sceneZeroIndex !== undefined ? sceneZeroIndex : (currentScene.sceneIndex ?? 0);

    if (onAssignMediaToScene) {
      onAssignMediaToScene(targetIdx, defaultPhoto, false);
    } else {
      onUpdateScene({
        sceneType: "pattern_interrupt_hook",
        customVeoVideoUrl: undefined,
        primaryMediaUrl: defaultPhoto || currentScene.primaryMediaUrl,
      });
    }

    setVeoSuccessMessage(`↺ Scene #${targetIdx + 1} reverted to product photo packshot`);
    toast(
      "Video Removed from Scene",
      `Scene #${targetIdx + 1} reverted to product photo packshot.`,
      "info"
    );
  };

  const handleDeleteVeoVideo = async (videoUrlToDelete?: string) => {
    const targetUrl =
      videoUrlToDelete ||
      activeVeoUrl ||
      currentScene.customVeoVideoUrl ||
      (currentScene.primaryMediaUrl && checkIsVideo(currentScene.primaryMediaUrl)
        ? currentScene.primaryMediaUrl
        : null);

    if (!targetUrl) return;

    const confirmed =
      typeof window !== "undefined"
        ? window.confirm(
            "Are you sure you want to permanently delete this generated video? This will delete the video file from disk and remove it from your product assets."
          )
        : true;
    if (!confirmed) return;

    setIsDeletingVeo(true);
    setVeoError(null);

    try {
      const res = await fetch("/api/ecommerce/generate-custom-scene", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoUrl: targetUrl,
          jobId: veoJobId,
          productId,
          sceneIndex: currentScene.sceneIndex,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok && data?.error) {
        console.warn("[Delete Veo Video Notice]", data.error);
      }

      if (onRemoveAsset) {
        onRemoveAsset(targetUrl);
      }

      if (typeof window !== "undefined") {
        localStorage.removeItem(getJobStorageKey(currentScene.sceneIndex));
      }
      stopVeoPollingAndTimer();
      setIsGeneratingVeo(false);
      setVeoJobId(null);

      if (currentScene.customVeoVideoUrl === targetUrl || currentScene.primaryMediaUrl === targetUrl) {
        const fallbackAsset = productAssets.find((a) => a.url && a.url !== targetUrl)?.url || "";
        onUpdateScene({
          sceneType: "pattern_interrupt_hook",
          customVeoVideoUrl: undefined,
          primaryMediaUrl: fallbackAsset || "",
        });
      }

      setVeoSuccessMessage("🗑️ Custom generated video deleted successfully!");
    } catch (err: unknown) {
      const e = err as Error;
      console.error("Failed to delete custom video:", err);
      setVeoError(e?.message || "Failed to delete custom generated video");
    } finally {
      setIsDeletingVeo(false);
    }
  };

  return {
    veoCategory,
    setVeoCategory,
    veoPrompt,
    setVeoPrompt,
    isVeoUserDirtyRef,
    veoCameraCue,
    setVeoCameraCue,
    veoDuration,
    setVeoDuration,
    isGeneratingVeo,
    veoElapsedSeconds,
    veoStatusDetail,
    veoJobId,
    lastCheckedAt,
    pollCadenceSeconds,
    setPollCadenceSeconds,
    veoError,
    setVeoError,
    veoSuccessMessage,
    setVeoSuccessMessage,
    liveLogs,
    showLiveLogsDrawer,
    setShowLiveLogsDrawer,
    isCheckingNow,
    logsEndRef,
    formatTimer,
    stopVeoPollingAndTimer,
    handleManualCheckNow,
    handleResumePolling,
    handleClearJob,
    handleGenerateVeoScene,
    handleDeleteVeoVideo,
    handleDetachMediaFromScene,
    isDeletingVeo,
    activeVeoUrl,
    selectedProductRefUrl,
    setSelectedProductRefUrl,
    resolvedPersonaImageUrl,
    candidateProductUrls,
    activeProductRefUrl,
    effectiveVeoReferenceUrls,
    checkIsVideo,
    getResolvedEnglishPrompt,
    veoAllowSpeaking,
    setVeoAllowSpeaking,
    handleToggleAllowSpeaking,
    veoLanguageOverride,
    setVeoLanguageOverride,
    handleSelectLanguageOverride,
    detectedSceneLanguage,
    currentTemplateIndex,
    setCurrentTemplateIndex,
    availableActionTemplates,
    handleRerollActionTemplate,
    currentDialogueIndex,
    setCurrentDialogueIndex,
    availableDialogueOptions,
    handleRerollDialogue,
    veoPerformance,
    setVeoPerformance,
    veoPerformanceMood,
    setVeoPerformanceMood,
    handleSelectPerformanceMood,
    handleChangePerformance,
  };
}
