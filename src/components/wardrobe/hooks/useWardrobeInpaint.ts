"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useToast } from "@/components/global/ToastContainer";
import {
  WardrobeInpaintJobSummary,
  InpaintProgressState,
  InpaintResultState,
  PersonaLoopOption,
  PersonaItem,
  OutfitItem,
  TransformationType,
  MorphologyPolicy,
} from "../types";
import {
  HairStyleItem,
  HairColorSwatch,
  formatHairstyleWithSwatch,
  compileSalonFormulaBadge,
  compileSalonNegativePrompt,
} from "@/lib/wardrobe/hairCatalog";
import {
  LightingEnvironmentConfig,
  compileLightingFormulaBadge,
} from "@/lib/wardrobe/lightingEngine";
import {
  VolumetricPaddingConfig,
  compileVolumetricFormulaBadge,
} from "@/lib/wardrobe/volumetricPaddingEngine";

export function useWardrobeInpaint(searchParamsJobId?: string | null) {
  const { toast } = useToast();

  const [isInpainting, setIsInpainting] = useState<boolean>(false);
  const [inpaintProgress, setInpaintProgress] = useState<InpaintProgressState>({
    phase: "idle",
    message: "Ready to transform outfit",
    percent: 0,
  });
  const [inpaintResult, setInpaintResult] = useState<InpaintResultState | null>(null);

  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [recentInpaintJobs, setRecentInpaintJobs] = useState<WardrobeInpaintJobSummary[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeJobIdRef = useRef<string | null>(null);
  const hasRecoveredRef = useRef<boolean>(false);

  // Fetch recent wardrobe inpaint jobs
  const fetchRecentJobs = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch("/api/wardrobe/inpaint");
      if (res.ok) {
        const data = await res.json();
        if (data.recentJobs) {
          setRecentInpaintJobs(data.recentJobs);
        }
        return data;
      }
    } catch {
      // Ignore background fetch error
    } finally {
      setIsLoadingHistory(false);
    }
    return null;
  }, []);

  // Poll progress and persist active job state across reloads
  const startJobPolling = useCallback(
    (jobId: string, meta?: { outfitName?: string; originalVideoUrl?: string }) => {
      if (pollingTimerRef.current && activeJobIdRef.current === jobId) {
        return;
      }
      activeJobIdRef.current = jobId;
      setActiveJobId(jobId);
      setIsInpainting(true);

      try {
        localStorage.setItem("wardrobe_active_job_id", jobId);
        const url = new URL(window.location.href);
        if (url.searchParams.get("jobId") !== jobId) {
          url.searchParams.set("jobId", jobId);
          window.history.replaceState({}, "", url.toString());
        }
      } catch {}

      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
      }

      const poll = async () => {
        try {
          const res = await fetch(`/api/wardrobe/inpaint?jobId=${encodeURIComponent(jobId)}`);
          if (!res.ok) return;
          const data = await res.json();
          const job = data.job;
          if (!job) return;

          setInpaintProgress({
            phase: job.status === "DONE" ? "done" : "running",
            message: job.currentStep || "Processing neural diffusion...",
            percent: Math.max(5, Math.min(100, job.doneSteps || 0)),
          });

          if (job.status === "DONE") {
            if (pollingTimerRef.current) {
              clearInterval(pollingTimerRef.current);
              pollingTimerRef.current = null;
            }
            activeJobIdRef.current = null;
            setIsInpainting(false);
            try {
              localStorage.removeItem("wardrobe_active_job_id");
            } catch {}

            const outputUrl =
              job.outputPublicUrl ||
              (job.config?.outputPublicUrl as string) ||
              "/assets/wardrobe_demo/ruby_sapphire_inpainted_full.mp4";
            const originalUrl =
              meta?.originalVideoUrl ||
              (job.config?.sourceVideoPath as string) ||
              "/assets/wardrobe_demo/ruby_burgundy_original_full.mp4";
            const outName =
              meta?.outfitName ||
              (job.config?.outfitName as string) ||
              "Transformed Wardrobe";

            const safeOutput = (outputUrl || "")
              .replace(/^public\//, "")
              .replace(/^([^/])/, "/$1");
            const safeOriginal = (originalUrl || "")
              .replace(/^public\//, "")
              .replace(/^([^/])/, "/$1");

            setInpaintResult({
              outputPublicUrl: safeOutput,
              originalVideoUrl: safeOriginal,
              outfitName: outName,
            });

            fetchRecentJobs();
            const jobMode = (job.config?.mode as string) || "attire";
            const successTitle =
              jobMode === "persona"
                ? "Persona Transference Ready"
                : jobMode === "compound"
                ? "Complete Makeover Ready"
                : jobMode === "hair"
                ? "Hairstyle Ready"
                : "Transformation Complete";
            const successDesc =
              jobMode === "persona"
                ? `Persona identity transference to ${job.config?.targetPersonaName || job.config?.targetPersonaId || "target"} ready!`
                : jobMode === "compound"
                ? `Complete anchor makeover (attire + hairstyle) ready for ${job.config?.personaName || "anchor"}!`
                : jobMode === "hair"
                ? `Hairstyle metamorphosis ready for ${job.config?.personaName || "anchor"}!`
                : `Neural wardrobe inpaint ready for ${job.config?.personaName || "anchor"}!`;

            toast(
              successTitle,
              successDesc,
              "success",
              `inpaint-done-${jobId}`
            );
          } else if (job.status === "FAILED") {
            if (pollingTimerRef.current) {
              clearInterval(pollingTimerRef.current);
              pollingTimerRef.current = null;
            }
            activeJobIdRef.current = null;
            setIsInpainting(false);
            try {
              localStorage.removeItem("wardrobe_active_job_id");
            } catch {}
            fetchRecentJobs();
            toast("Inpaint Error", job.errorLog || "Generation failed in ComfyUI", "error", `inpaint-failed-${jobId}`);
          }
        } catch {
          // Keep polling
        }
      };

      poll();
      pollingTimerRef.current = setInterval(poll, 3000);
    },
    [fetchRecentJobs, toast]
  );

  // Clear polling timer on unmount
  useEffect(() => {
    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
      }
    };
  }, []);

  // Auto-recovery ONCE on mount / refresh
  useEffect(() => {
    if (hasRecoveredRef.current) return;
    hasRecoveredRef.current = true;

    let mounted = true;
    const initRecovery = async () => {
      const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const urlJobId = urlParams?.get("jobId") || searchParamsJobId;
      let storedJobId: string | null = null;
      try {
        storedJobId = localStorage.getItem("wardrobe_active_job_id");
      } catch {}

      const targetJobId = urlJobId || storedJobId;
      const data = await fetchRecentJobs();
      if (!mounted) return;

      if (targetJobId) {
        try {
          const res = await fetch(`/api/wardrobe/inpaint?jobId=${encodeURIComponent(targetJobId)}`);
          if (res.ok) {
            const jobData = await res.json();
            const job = jobData.job;
            if (job) {
              if (job.status === "QUEUED" || job.status === "IN_PROGRESS") {
                startJobPolling(targetJobId, {
                  outfitName: job.config?.outfitName,
                  originalVideoUrl: job.config?.sourceVideoPath,
                });
                toast(
                  "Resumed Inpaint Session",
                  `Restored live job: ${job.config?.outfitName || targetJobId}`,
                  "info",
                  `recovery-${targetJobId}`
                );
                return;
              } else if (job.status === "DONE" && (job.outputPublicUrl || job.config?.outputPublicUrl)) {
                const recOutput = (job.outputPublicUrl || job.config?.outputPublicUrl || "")
                  .replace(/^public\//, "")
                  .replace(/^([^/])/, "/$1");
                const recOrig = (job.config?.sourceVideoPath || "/assets/wardrobe_demo/ruby_burgundy_original_full.mp4")
                  .replace(/^public\//, "")
                  .replace(/^([^/])/, "/$1");

                setInpaintResult({
                  outputPublicUrl: recOutput,
                  originalVideoUrl: recOrig,
                  outfitName: job.config?.outfitName || "Transformed Wardrobe",
                });
                setInpaintProgress({
                  phase: "done",
                  message: "Completed inpaint loaded from session",
                  percent: 100,
                });
                try {
                  localStorage.removeItem("wardrobe_active_job_id");
                } catch {}
                return;
              }
            }
          }
        } catch {}
      }

      if (data?.activeJob) {
        startJobPolling(data.activeJob.id, {
          outfitName: data.activeJob.config?.outfitName,
          originalVideoUrl: data.activeJob.config?.sourceVideoPath,
        });
        toast(
          "Active Inpaint Found",
          `Reconnected to in-progress job: ${data.activeJob.config?.outfitName || data.activeJob.id}`,
          "info",
          `recovery-${data.activeJob.id}`
        );
      }
    };

    initRecovery();
    return () => {
      mounted = false;
    };
  }, [searchParamsJobId, fetchRecentJobs, startJobPolling, toast]);

  const loadVerifiedDemo = () => {
    const verifiedOriginal = "/assets/wardrobe_demo/ruby_burgundy_original_full.mp4";
    const verifiedInpainted = "/assets/wardrobe_demo/ruby_sapphire_inpainted_full.mp4";
    setInpaintResult({
      outputPublicUrl: verifiedInpainted,
      originalVideoUrl: verifiedOriginal,
      outfitName: "Royal Sapphire Blue Tailored Blazer Dress",
    });
    setInpaintProgress({
      phase: "done",
      message: "Loaded verified 169-frame broadcast inpainting demo",
      percent: 100,
    });
    toast("Demo Loaded", "Loaded 169-frame verified MiniMax H3 inpainting comparison!", "success");
  };

  const triggerInpaint = async (params: {
    selectedLoop: PersonaLoopOption | null;
    currentPersona: PersonaItem;
    targetOutfit: OutfitItem;
    customOutfitImage: string;
    sourceGarment: string;
    trackPrompt: string;
    renderMode: "slice" | "full";
    seed: number;
    transformationType: TransformationType;
    activeHairstyle?: HairStyleItem;
    activeSwatch?: HairColorSwatch | null;
    targetPersonaId?: string;
    targetPersonaName?: string;
    keepOriginalHair?: boolean;
    morphologyPolicy?: MorphologyPolicy;
    sleeveStyle?: import("../types").SleeveStyleOption;
    lightingConfig?: LightingEnvironmentConfig;
    volumetricPaddingConfig?: VolumetricPaddingConfig;
  }) => {
    const {
      selectedLoop,
      currentPersona,
      targetOutfit,
      customOutfitImage,
      sourceGarment,
      trackPrompt,
      renderMode,
      seed,
      transformationType,
      activeHairstyle,
      activeSwatch,
      targetPersonaId,
      targetPersonaName,
      keepOriginalHair,
      morphologyPolicy,
      sleeveStyle,
      lightingConfig,
      volumetricPaddingConfig,
    } = params;

    if (!selectedLoop) {
      toast("Select Video", "Please select a source action loop first", "warning");
      return;
    }

    const isCompound = transformationType === "compound";
    const isHair = transformationType === "hair";
    const isPersona = transformationType === "persona";

    setIsInpainting(true);
    setInpaintProgress({
      phase: "init",
      message: isPersona
        ? `Dispatching Neural Persona Transference to ${targetPersonaName || targetPersonaId}...`
        : isCompound
        ? "Dispatching Complete Anchor Makeover (Attire + Hairstyle) 2-stage pipeline..."
        : isHair
        ? "Dispatching ComfyUI Hairstyle Metamorphosis job..."
        : "Dispatching MiniMax H3 + SAM 3.1 inpainting job...",
      percent: 5,
    });

    const formattedHair = activeHairstyle
      ? formatHairstyleWithSwatch(activeHairstyle, activeSwatch)
      : null;
    const targetHairDisplay =
      formattedHair?.displayName ||
      (activeSwatch ? `${activeSwatch.name} ${activeHairstyle?.name || "Hairstyle"}` : activeHairstyle?.name || "Hairstyle");
    const targetHairDescription = formattedHair?.resolvedPrompt || activeHairstyle?.prompt;
    const combinedName = isPersona
      ? `Transferred Identity: ${targetPersonaName || targetPersonaId}`
      : isCompound
      ? `${targetOutfit.name} + ${targetHairDisplay}`
      : isHair
      ? targetHairDisplay
      : targetOutfit.name;

    toast(
      "Starting Metamorphosis",
      isPersona
        ? `Transferring identity from ${currentPersona.name} to ${targetPersonaName || targetPersonaId} (outfit locked)...`
        : isCompound
        ? `Transforming ${currentPersona.name}: ${targetOutfit.name} + ${targetHairDisplay}...`
        : `Transforming ${currentPersona.name}'s ${isHair ? "hairstyle" : "outfit"} to ${isHair ? targetHairDisplay : targetOutfit.name}...`,
      "info"
    );

    try {
      const res = await fetch("/api/wardrobe/inpaint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceVideoPath: selectedLoop.videoUrl,
          outfitImagePath: isPersona
            ? (customOutfitImage || `/avatars/${targetPersonaId}.png`)
            : (customOutfitImage || targetOutfit.imageUrl || "/assets/wardrobe_demo/sapphire_dress_3view.jpg"),
          personaName: currentPersona.name,
          personaId: currentPersona.id,
          sourceGarment: sourceGarment || selectedLoop.sourceGarment,
          outfitName: isPersona
            ? `Preserved Outfit (${sourceGarment || selectedLoop.sourceGarment || "Broadcast Attire"})`
            : targetOutfit.name,
          outfitDescription: isPersona
            ? "Original garment silhouette, tailored sleeves and kinematics preserved"
            : targetOutfit.prompt,
          trackPrompt: trackPrompt,
          frameCount: renderMode === "slice" ? 39 : (selectedLoop.frameCount || 0),
          seed: seed,
          stream: false,
          mode: transformationType,
          // Persona transference parameters
          targetPersonaId: isPersona ? targetPersonaId : undefined,
          targetPersonaName: isPersona ? targetPersonaName : undefined,
          targetPersonaImagePath: isPersona ? (customOutfitImage || undefined) : undefined,
          keepOriginalHair: isPersona ? Boolean(keepOriginalHair) : undefined,
          morphologyPolicy: isPersona ? morphologyPolicy : undefined,
          sleeveStyle: isPersona ? sleeveStyle : undefined,
          // Hairstyle & compound parameters
          hairstyleId: (isHair || isCompound) ? activeHairstyle?.id : undefined,
          hairLength: (isHair || isCompound) ? activeHairstyle?.hairLength : undefined,
          hairImagePath: (isHair || isCompound) ? activeHairstyle?.imageUrl : undefined,
          targetHairName: (isHair || isCompound) ? targetHairDisplay : undefined,
          targetHairDescription: (isHair || isCompound) ? targetHairDescription : undefined,
          hairColorSwatch: (isHair || isCompound) ? activeSwatch?.id : undefined,
          salonTechnique: (isHair || isCompound) ? activeSwatch?.technique : undefined,
          salonDimension: (isHair || isCompound) ? activeSwatch?.dimension : undefined,
          rootTone: (isHair || isCompound) ? activeSwatch?.rootTone : undefined,
          tipTone: (isHair || isCompound) ? activeSwatch?.tipTone : undefined,
          salonFormula: (isHair || isCompound) && activeSwatch ? compileSalonFormulaBadge(activeSwatch) : undefined,
          salonNegativePrompt: (isHair || isCompound) && activeSwatch ? compileSalonNegativePrompt(activeSwatch) : undefined,
          // Phase 4: Dynamic Lighting & Environment Bleed Integration
          lightingPreset: lightingConfig?.presetId,
          keyDirection: lightingConfig?.keyDirection,
          rimLightWrap: lightingConfig?.rimLightWrap,
          despillEnabled: lightingConfig?.despillEnabled,
          ambientBleedTint: lightingConfig?.ambientTintHex,
          lightingConfig: lightingConfig,
          lightingFormula: lightingConfig ? compileLightingFormulaBadge(lightingConfig) : undefined,
          // Phase 6: Volumetric Mask Padding & Studio Set Adaptability
          volumetricPaddingConfig: volumetricPaddingConfig,
          volumetricPaddingPercent: volumetricPaddingConfig
            ? Math.round((volumetricPaddingConfig.paddingLeftPercent + volumetricPaddingConfig.paddingRightPercent) / 2)
            : undefined,
          featherRadiusPixels: volumetricPaddingConfig?.featherRadiusPixels,
          boundaryDecay: volumetricPaddingConfig?.boundaryDecay,
          autoVolumetricEnabled: volumetricPaddingConfig?.autoVolumetricEnabled,
          volumetricFormula: volumetricPaddingConfig
            ? compileVolumetricFormulaBadge(volumetricPaddingConfig)
            : undefined,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to enqueue inpaint job");
      }

      const data = await res.json();
      startJobPolling(data.jobId, {
        outfitName: combinedName,
        originalVideoUrl: selectedLoop.videoUrl,
      });
    } catch (err: unknown) {
      setIsInpainting(false);
      const msg = err instanceof Error ? err.message : "Inpainting failed";
      toast("Inpaint Failed", msg, "error");
    }
  };

  return {
    isInpainting,
    inpaintProgress,
    inpaintResult,
    setInpaintResult,
    activeJobId,
    recentInpaintJobs,
    isLoadingHistory,
    showHistoryModal,
    setShowHistoryModal,
    fetchRecentJobs,
    startJobPolling,
    loadVerifiedDemo,
    triggerInpaint,
  };
}
