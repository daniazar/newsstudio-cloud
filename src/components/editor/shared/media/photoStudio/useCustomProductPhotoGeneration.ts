/**
 * src/components/editor/shared/media/photoStudio/useCustomProductPhotoGeneration.ts
 *
 * Hook managing async job submission, stopwatch timer, polling loop,
 * manual status verification, telemetry logs, and state resets for CustomProductPhotoStudioCard.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { AdScene, ExtractedProductAsset } from "@/lib/types/ecommerce";
import { filterPromptForSafety } from "@/lib/ecommerce/promptSafetyFilter";

interface UseCustomProductPhotoGenerationProps {
  currentScene: AdScene;
  productId?: string;
  resolvedName: string;
  productAssets: ExtractedProductAsset[];
  photoPrompt: string;
  aspectRatio: "1:1" | "9:16" | "16:9";
  activeCategory: string;
  effectiveReferenceUrls: string[];
  personaId?: string;
  attireId?: string;
  avatarSrc?: string;
  actionLoopId?: string;
  videoUrl?: string;
  onUpdateScene: (updates: Partial<AdScene>) => void;
  onAddAsset?: (asset: ExtractedProductAsset) => void;
}

export function useCustomProductPhotoGeneration({
  currentScene,
  productId = "prod",
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
}: UseCustomProductPhotoGenerationProps) {
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [photoElapsedSeconds, setPhotoElapsedSeconds] = useState<number>(0);
  const [photoStatusDetail, setPhotoStatusDetail] = useState<string>("");
  const [photoJobId, setPhotoJobId] = useState<string | null>(null);
  const [pollCadenceSeconds, setPollCadenceSeconds] = useState<number>(3);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [generatedPhotoUrl, setGeneratedPhotoUrl] = useState<string | null>(() => {
    if (
      currentScene.primaryMediaUrl &&
      (currentScene.primaryMediaUrl.includes("photo_") ||
        currentScene.primaryMediaUrl.includes("product_photos"))
    ) {
      return currentScene.primaryMediaUrl;
    }
    return null;
  });

  const [liveLogs, setLiveLogs] = useState<string[]>([]);
  const [showLiveLogsDrawer, setShowLiveLogsDrawer] = useState<boolean>(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const formatTimer = useCallback((totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, []);

  const stopPhotoPollingAndTimer = useCallback(() => {
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
      stopPhotoPollingAndTimer();
    };
  }, [stopPhotoPollingAndTimer]);

  // Auto-scroll live logs
  useEffect(() => {
    if (showLiveLogsDrawer) {
      logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [liveLogs, showLiveLogsDrawer]);

  // Initial check on mount for any existing generated photo or logs for this product
  useEffect(() => {
    if (productId && productId !== "prod") {
      fetch(`/api/ecommerce/generate-product-photo?productId=${encodeURIComponent(productId)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.status === "completed" && data.imageUrl) {
            setGeneratedPhotoUrl(data.imageUrl);
            if (onAddAsset) {
              onAddAsset({
                id: `photo_gen_${Date.now()}`,
                url: data.imageUrl,
                type: "lifestyle_context",
                altText: `Custom AI Staged Photo: ${resolvedName}`,
              });
            }
          }
          if (data.logs && Array.isArray(data.logs)) {
            setLiveLogs(data.logs);
          }
        })
        .catch(() => {});
    }
  }, [productId, onAddAsset, resolvedName]);

  // Manual check button action
  const handleManualCheckNow = useCallback(async () => {
    const activeId = photoJobId;
    const url = `/api/ecommerce/generate-product-photo?${
      activeId ? `jobId=${encodeURIComponent(activeId)}&` : ""
    }productId=${encodeURIComponent(productId || "")}`;

    try {
      const res = await fetch(url);
      const data = await res.json();
      setLastCheckedAt(new Date());

      if (data.progress) {
        setPhotoStatusDetail(data.progress);
      }
      if (data.logs && Array.isArray(data.logs)) {
        setLiveLogs(data.logs);
      }

      if (data.status === "completed" && data.imageUrl) {
        stopPhotoPollingAndTimer();
        setGeneratedPhotoUrl(data.imageUrl);
        onUpdateScene({
          primaryMediaUrl: data.imageUrl,
          removeWhiteBg: false,
        });
        if (onAddAsset) {
          onAddAsset({
            id: `photo_gen_${Date.now()}`,
            url: data.imageUrl,
            type: "lifestyle_context",
            altText: `Custom AI Staged Photo: ${resolvedName}`,
          });
        }
        setSuccessMessage("✨ Custom product photo verified and applied to scene!");
        setIsGenerating(false);
      } else if (data.status === "failed") {
        stopPhotoPollingAndTimer();
        setErrorMessage(data.error || "Product photo generation failed");
        setIsGenerating(false);
      }
    } catch (err: unknown) {
      console.warn("[handleManualCheckNow]", err);
    }
  }, [photoJobId, productId, stopPhotoPollingAndTimer, onUpdateScene, onAddAsset, resolvedName]);

  const handleGeneratePhoto = async () => {
    if (!photoPrompt.trim()) return;
    stopPhotoPollingAndTimer();
    setIsGenerating(true);
    setPhotoElapsedSeconds(0);
    setPhotoStatusDetail("Staging reference photos & initializing Gemini / Imagen 3 CLI...");
    setLiveLogs([]);
    setShowLiveLogsDrawer(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setLastCheckedAt(new Date());

    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      setPhotoElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    try {
      const res = await fetch("/api/ecommerce/generate-product-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          productName: resolvedName,
          prompt: filterPromptForSafety(photoPrompt.trim()),
          aspectRatio,
          category: activeCategory,
          referenceImageUrls: effectiveReferenceUrls,
          referenceImageUrl: effectiveReferenceUrls[0],
          personaId,
          attireId,
          avatarSrc:
            avatarSrc ||
            currentScene.presenterConfig?.avatarSrc ||
            currentScene.presenter?.avatarSrc,
          actionLoopId:
            actionLoopId || currentScene.presenterConfig?.selectedActionLoopId,
          videoUrl: videoUrl || currentScene.presenterConfig?.videoUrl,
          mode: "async",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to start custom product photo generation");
      }

      if (data.status === "completed" && data.imageUrl) {
        stopPhotoPollingAndTimer();
        setGeneratedPhotoUrl(data.imageUrl);
        if (data.logs && Array.isArray(data.logs)) {
          setLiveLogs(data.logs);
        }
        onUpdateScene({
          primaryMediaUrl: data.imageUrl,
          removeWhiteBg: false,
        });
        if (onAddAsset) {
          onAddAsset({
            id: `photo_gen_${Date.now()}`,
            url: data.imageUrl,
            type: "lifestyle_context",
            altText: `Custom AI Staged Photo: ${resolvedName}`,
          });
        }
        setSuccessMessage("✨ Custom product photo generated and applied to this scene!");
        setIsGenerating(false);
        return;
      }

      const activeJobId = data.jobId;
      setPhotoJobId(activeJobId);
      setPhotoStatusDetail(
        data.message || "Synthesizing custom product photo with Imagen 3 / Gemini CLI..."
      );

      const intervalMs = Math.max(2000, (pollCadenceSeconds || 3) * 1000);
      pollRef.current = setInterval(async () => {
        try {
          const pollUrl = `/api/ecommerce/generate-product-photo?jobId=${encodeURIComponent(
            activeJobId
          )}&productId=${encodeURIComponent(productId || "")}`;

          const pollRes = await fetch(pollUrl);
          const pollData = await pollRes.json();
          setLastCheckedAt(new Date());

          if (pollData.progress) {
            setPhotoStatusDetail(pollData.progress);
          }
          if (pollData.logs && Array.isArray(pollData.logs)) {
            setLiveLogs(pollData.logs);
          }

          if (pollData.status === "completed" && pollData.imageUrl) {
            stopPhotoPollingAndTimer();
            setGeneratedPhotoUrl(pollData.imageUrl);
            onUpdateScene({
              primaryMediaUrl: pollData.imageUrl,
              removeWhiteBg: false,
            });
            if (onAddAsset) {
              onAddAsset({
                id: `photo_gen_${Date.now()}`,
                url: pollData.imageUrl,
                type: "lifestyle_context",
                altText: `Custom AI Staged Photo: ${resolvedName}`,
              });
            }
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            setSuccessMessage(
              `✨ Custom product photo generated and applied in ${formatTimer(elapsed)}!`
            );
            setIsGenerating(false);
          } else if (pollData.status === "failed") {
            stopPhotoPollingAndTimer();
            setErrorMessage(pollData.error || "Product photo generation failed");
            setIsGenerating(false);
          }
        } catch (pollErr: unknown) {
          console.warn("[Photo Poll Check Notice]", pollErr);
        }
      }, intervalMs);
    } catch (err: unknown) {
      stopPhotoPollingAndTimer();
      setErrorMessage(err instanceof Error ? err.message : "Failed to generate custom product photo");
      setIsGenerating(false);
    }
  };

  const handleResetToPackshot = () => {
    stopPhotoPollingAndTimer();
    setIsGenerating(false);
    const defaultAsset = productAssets.find((a) => a.url)?.url || "";
    onUpdateScene({
      primaryMediaUrl: defaultAsset || currentScene.primaryMediaUrl,
      secondaryMediaUrl:
        currentScene.secondaryMediaUrl === generatedPhotoUrl
          ? undefined
          : currentScene.secondaryMediaUrl,
    });
    setGeneratedPhotoUrl(null);
    setSuccessMessage("↺ Reverted back to original scraped packshot");
  };

  return {
    isGenerating,
    photoElapsedSeconds,
    photoStatusDetail,
    pollCadenceSeconds,
    setPollCadenceSeconds,
    lastCheckedAt,
    successMessage,
    setSuccessMessage,
    errorMessage,
    setErrorMessage,
    generatedPhotoUrl,
    setGeneratedPhotoUrl,
    liveLogs,
    showLiveLogsDrawer,
    setShowLiveLogsDrawer,
    logsEndRef,
    formatTimer,
    handleGeneratePhoto,
    handleManualCheckNow,
    handleResetToPackshot,
  };
}
