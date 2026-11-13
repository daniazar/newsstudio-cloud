/**
 * src/components/editor/shared/visuals/hooks/useSceneMediaGallery.ts
 *
 * Custom hook for aggregating, filtering, and applying media assets (photos & videos)
 * across scenes, product assets catalog, and custom URL inputs.
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  AdScene,
  ExtractedProductAsset,
  ProductSpec,
} from "@/lib/types/ecommerce";
import { MediaGalleryItem } from "../types";

export interface UseSceneMediaGalleryProps {
  currentScene: AdScene;
  onUpdateScene: (updates: Partial<AdScene>) => void;
  productAssets: ExtractedProductAsset[];
  productSpec?: ProductSpec;
  allScenes?: AdScene[];
  onAddAsset?: (asset: ExtractedProductAsset) => void;
  onAssignMediaToScene?: (
    sceneIndex: number,
    mediaUrl: string,
    isVideo?: boolean,
    asBackground?: boolean
  ) => void;
  activeSlot: "primary" | "secondary";
  isComparisonMode: boolean;
  checkIsVideo: (url: string, type?: string) => boolean;
}

export function useSceneMediaGallery({
  currentScene,
  onUpdateScene,
  productAssets = [],
  productSpec,
  allScenes = [],
  onAddAsset,
  onAssignMediaToScene,
  activeSlot,
  isComparisonMode,
  checkIsVideo,
}: UseSceneMediaGalleryProps) {
  const [customUrlInput, setCustomUrlInput] = useState("");
  const [showCustomUrlBox, setShowCustomUrlBox] = useState(false);
  const [processingUrl, setProcessingUrl] = useState<string | null>(null);
  const [mediaFilter, setMediaFilter] = useState<"all" | "photos" | "videos">("all");
  const [showVeoApplyMenu, setShowVeoApplyMenu] = useState<boolean>(false);
  const [activeMediaDropdownUrl, setActiveMediaDropdownUrl] = useState<string | null>(null);

  // Aggregate all media (photos & videos) from catalog, productSpec, and all scenes in script
  const allMedia = useMemo(() => {
    const list: MediaGalleryItem[] = [];
    const seen = new Set<string>();

    const catalogUrls = new Set<string>();
    for (const a of productAssets) {
      if (a?.url) catalogUrls.add(a.url);
    }
    if (productSpec?.assets) {
      for (const a of productSpec.assets) {
        if (a?.url) catalogUrls.add(a.url);
      }
    }

    const calculateUsedScenes = (url: string) => {
      const scenes: number[] = [];
      allScenes.forEach((s, idx) => {
        const sceneNum = s.sceneIndex !== undefined ? s.sceneIndex + 1 : idx + 1;
        if (
          s.primaryMediaUrl === url ||
          s.customVeoVideoUrl === url ||
          s.secondaryMediaUrl === url
        ) {
          if (!scenes.includes(sceneNum)) {
            scenes.push(sceneNum);
          }
        }
      });
      const curSceneNum = currentScene.sceneIndex !== undefined ? currentScene.sceneIndex + 1 : 1;
      if (
        (currentScene.primaryMediaUrl === url ||
          currentScene.customVeoVideoUrl === url ||
          currentScene.secondaryMediaUrl === url) &&
        !scenes.includes(curSceneNum)
      ) {
        scenes.push(curSceneNum);
      }
      return scenes.sort((a, b) => a - b);
    };

    // 1. Catalog assets (productAssets)
    for (const asset of productAssets) {
      if (asset?.url && !seen.has(asset.url)) {
        seen.add(asset.url);
        const isVid = checkIsVideo(asset.url, asset.type);
        list.push({
          url: asset.url,
          label:
            asset.type === "hero_packshot"
              ? "Hero Packshot"
              : asset.type === "lifestyle_context"
              ? "Lifestyle Context"
              : asset.type === "existing_video"
              ? "Custom Veo Video"
              : asset.altText || (isVid ? "Product Video" : "Product Image"),
          isVideo: isVid,
          isPrimary: asset.isPrimary,
          isSavedInCatalog: true,
          usedInScenes: calculateUsedScenes(asset.url),
        });
      }
    }

    // 2. ProductSpec assets
    if (Array.isArray(productSpec?.assets)) {
      for (const asset of productSpec.assets) {
        if (asset?.url && !seen.has(asset.url)) {
          seen.add(asset.url);
          const isVid = checkIsVideo(asset.url, asset.type);
          list.push({
            url: asset.url,
            label:
              asset.type === "existing_video"
                ? "Custom Veo Video"
                : asset.altText || (isVid ? "Product Video" : "Product Image"),
            isVideo: isVid,
            isPrimary: asset.isPrimary,
            isSavedInCatalog: true,
            usedInScenes: calculateUsedScenes(asset.url),
          });
        }
      }
    }

    // 3. Scan all scenes in script for any generated videos or images not yet cataloged
    for (const s of allScenes) {
      const sLabelNum = s.sceneIndex !== undefined ? s.sceneIndex + 1 : 1;
      const candidates = [
        { url: s.customVeoVideoUrl, isVid: true, defaultLabel: `Scene ${sLabelNum} Veo Video` },
        { url: s.primaryMediaUrl, isVid: checkIsVideo(s.primaryMediaUrl || ""), defaultLabel: `Scene ${sLabelNum} Visual` },
        { url: s.secondaryMediaUrl, isVid: checkIsVideo(s.secondaryMediaUrl || ""), defaultLabel: `Scene ${sLabelNum} Before` },
      ];

      for (const cand of candidates) {
        if (cand.url && !seen.has(cand.url)) {
          seen.add(cand.url);
          list.push({
            url: cand.url,
            label: cand.isVid
              ? cand.url.includes("veo")
                ? "Custom Veo Video"
                : "Scene Video"
              : cand.defaultLabel,
            isVideo: cand.isVid,
            isPrimary: false,
            isSavedInCatalog: catalogUrls.has(cand.url),
            usedInScenes: calculateUsedScenes(cand.url),
          });
        }
      }
    }

    // 4. Current scene's customVeoVideoUrl, primaryMediaUrl, secondaryMediaUrl if still not present
    if (currentScene.customVeoVideoUrl && !seen.has(currentScene.customVeoVideoUrl)) {
      seen.add(currentScene.customVeoVideoUrl);
      list.unshift({
        url: currentScene.customVeoVideoUrl,
        label: "Custom Veo Video",
        isVideo: true,
        isPrimary: false,
        isSavedInCatalog: catalogUrls.has(currentScene.customVeoVideoUrl),
        usedInScenes: calculateUsedScenes(currentScene.customVeoVideoUrl),
      });
    }
    if (currentScene.primaryMediaUrl && !seen.has(currentScene.primaryMediaUrl)) {
      seen.add(currentScene.primaryMediaUrl);
      const isVid = checkIsVideo(currentScene.primaryMediaUrl);
      list.push({
        url: currentScene.primaryMediaUrl,
        label: isVid ? "Current Video" : "Current Scene Image",
        isVideo: isVid,
        isPrimary: false,
        isSavedInCatalog: catalogUrls.has(currentScene.primaryMediaUrl),
        usedInScenes: calculateUsedScenes(currentScene.primaryMediaUrl),
      });
    }
    if (currentScene.secondaryMediaUrl && !seen.has(currentScene.secondaryMediaUrl)) {
      seen.add(currentScene.secondaryMediaUrl);
      const isVid = checkIsVideo(currentScene.secondaryMediaUrl);
      list.push({
        url: currentScene.secondaryMediaUrl,
        label: isVid ? "Current Before Video" : "Current Before Image",
        isVideo: isVid,
        isPrimary: false,
        isSavedInCatalog: catalogUrls.has(currentScene.secondaryMediaUrl),
        usedInScenes: calculateUsedScenes(currentScene.secondaryMediaUrl),
      });
    }

    return list;
  }, [productAssets, productSpec?.assets, allScenes, currentScene, checkIsVideo]);

  const photosCount = useMemo(() => allMedia.filter((m) => !m.isVideo).length, [allMedia]);
  const videosCount = useMemo(() => allMedia.filter((m) => m.isVideo).length, [allMedia]);

  const filteredMedia = useMemo(() => {
    if (mediaFilter === "photos") return allMedia.filter((m) => !m.isVideo);
    if (mediaFilter === "videos") return allMedia.filter((m) => m.isVideo);
    return allMedia;
  }, [allMedia, mediaFilter]);

  // Handle selecting media for the current scene
  const handleSelectMedia = (item: { url: string; isVideo?: boolean }) => {
    if (item.isVideo) {
      if (onAssignMediaToScene) {
        onAssignMediaToScene(currentScene.sceneIndex ?? 0, item.url, true);
      } else {
        onUpdateScene({
          sceneType: "custom_veo_hero",
          customVeoVideoUrl: item.url,
          primaryMediaUrl: item.url,
        });
      }
    } else {
      if (currentScene.sceneType === "scene_background") {
        const updates: Partial<AdScene> = {
          secondaryMediaUrl: item.url,
          primaryMediaUrl: item.url,
          sceneType: "scene_background",
          removeWhiteBg: false,
        };
        if (currentScene.presenterConfig?.mode === "hidden") {
          updates.presenterConfig = {
            ...currentScene.presenterConfig,
            mode: "custom",
            enabled: true,
          };
        }
        onUpdateScene(updates);
      } else if (isComparisonMode) {
        if (activeSlot === "secondary") {
          onUpdateScene({ secondaryMediaUrl: item.url });
        } else {
          onUpdateScene({
            primaryMediaUrl: item.url,
            customVeoVideoUrl: undefined,
            sceneType:
              currentScene.sceneType === "custom_veo_hero"
                ? "pattern_interrupt_hook"
                : currentScene.sceneType,
          });
        }
      } else {
        if (onAssignMediaToScene) {
          onAssignMediaToScene(currentScene.sceneIndex ?? 0, item.url, false);
        } else {
          onUpdateScene({
            primaryMediaUrl: item.url,
            customVeoVideoUrl: undefined,
            sceneType:
              currentScene.sceneType === "custom_veo_hero"
                ? "pattern_interrupt_hook"
                : currentScene.sceneType,
          });
        }
      }
    }
  };

  const handleSelectImage = (url: string) => {
    handleSelectMedia({ url, isVideo: checkIsVideo(url) });
  };

  const handleApplyMediaToTarget = (
    targetIndex: number,
    item: MediaGalleryItem,
    asBackground = false
  ) => {
    if (onAssignMediaToScene) {
      onAssignMediaToScene(targetIndex, item.url, item.isVideo, asBackground);
    } else if (targetIndex === (currentScene.sceneIndex ?? 0) || targetIndex === -1) {
      if (asBackground) {
        const updates: Partial<AdScene> = {
          secondaryMediaUrl: item.url,
          primaryMediaUrl: item.url,
          sceneType: "scene_background",
          removeWhiteBg: false,
        };
        if (currentScene.presenterConfig?.mode === "hidden") {
          updates.presenterConfig = {
            ...currentScene.presenterConfig,
            mode: "custom",
            enabled: true,
          };
        }
        onUpdateScene(updates);
      } else {
        handleSelectMedia(item);
      }
    }
    setActiveMediaDropdownUrl(null);
  };

  const handleSaveMediaToCatalog = useCallback(
    (e: React.MouseEvent, item: MediaGalleryItem) => {
      e.stopPropagation();
      onAddAsset?.({
        id: `asset_${item.isVideo ? "veo" : "photo"}_${Date.now()}`,
        url: item.url,
        type: item.isVideo ? "existing_video" : "lifestyle_context",
        altText: item.label || (item.isVideo ? "Product Video" : "Product Photo"),
      });
    },
    [onAddAsset]
  );

  const handleGenerateCutout = async (url: string) => {
    setProcessingUrl(url);
    try {
      const res = await fetch("/api/ecommerce/remove-background", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: url }),
      });
      const data = await res.json();
      if (data.mattedUrl) {
        handleSelectImage(data.mattedUrl);
      }
    } catch (err) {
      console.error("Failed to generate cutout:", err);
    } finally {
      setProcessingUrl(null);
    }
  };

  // Close menus when clicking outside
  useEffect(() => {
    const handleGlobalClick = () => {
      setShowVeoApplyMenu(false);
      setActiveMediaDropdownUrl(null);
    };
    if (showVeoApplyMenu || activeMediaDropdownUrl) {
      window.addEventListener("click", handleGlobalClick);
      return () => window.removeEventListener("click", handleGlobalClick);
    }
  }, [showVeoApplyMenu, activeMediaDropdownUrl]);

  const handleSwapBeforeAfter = () => {
    const currentPrimary = currentScene.primaryMediaUrl;
    const currentSecondary = currentScene.secondaryMediaUrl;
    if (!currentSecondary && !currentPrimary) return;

    onUpdateScene({
      primaryMediaUrl: currentSecondary || currentPrimary,
      secondaryMediaUrl: currentPrimary || currentSecondary,
    });
  };

  const handleApplyCustomUrl = () => {
    if (!customUrlInput.trim()) return;
    handleSelectImage(customUrlInput.trim());
    setCustomUrlInput("");
    setShowCustomUrlBox(false);
  };

  return {
    allMedia,
    photosCount,
    videosCount,
    mediaFilter,
    setMediaFilter,
    filteredMedia,
    customUrlInput,
    setCustomUrlInput,
    showCustomUrlBox,
    setShowCustomUrlBox,
    processingUrl,
    activeMediaDropdownUrl,
    setActiveMediaDropdownUrl,
    showVeoApplyMenu,
    setShowVeoApplyMenu,
    handleSelectMedia,
    handleSelectImage,
    handleApplyMediaToTarget,
    handleSaveMediaToCatalog,
    handleGenerateCutout,
    handleSwapBeforeAfter,
    handleApplyCustomUrl,
  };
}
