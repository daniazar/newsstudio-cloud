/**
 * src/lib/ecommerce/mediaHistoryManager.ts
 *
 * Media History & Persona Swapping Engine for E-Commerce Video Ads.
 * Faithful implementation of the NewsStudio 48-hour Segment mediaHistory architecture
 * (newsstudio-media-caching skill).
 *
 * Capabilities:
 * - 48-Hour TTL for synthesized voiceovers and lip-synced presenter videos per persona
 * - Instant persona swapping: restores previously synthesized audio & video without GPU re-inference
 * - Automatic cache eviction of expired items
 * - Global & Per-Scene persona swapping with strict scope isolation
 * - Full invalidation on voiceover text modification
 */

import { AdScene, CachedMediaHistoryItem, ScenePresenterSettings } from "@/lib/types/ecommerce";
import { getPersonaById } from "@/lib/tts/personas";

export const MEDIA_CACHE_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours in milliseconds

/**
 * Filters out expired mediaHistory items lazily.
 */
export function filterExpiredMediaHistory(
  history?: CachedMediaHistoryItem[],
  now: number = Date.now()
): CachedMediaHistoryItem[] {
  if (!history || history.length === 0) return [];
  return history.filter((item) => item.expiresAt && item.expiresAt > now);
}

export interface SwapScenePersonaResult {
  updatedScene: AdScene;
  wasRestored: boolean;
  restoredItem?: CachedMediaHistoryItem;
}

/**
 * Swaps a single scene's persona while preserving/restoring media from the 48-hour mediaHistory cache.
 */
export function swapScenePersonaWithMediaHistory(
  scene: AdScene,
  newPersonaId: string,
  defaultPersonaId: string = "ruby_vance",
  avatarUrl?: string
): SwapScenePersonaResult {
  const now = Date.now();
  const currentPersonaId =
    scene.presenterConfig?.personaId ||
    scene.presenter?.personaId ||
    defaultPersonaId;

  // 1. Clean expired history entries
  let history = filterExpiredMediaHistory(scene.mediaHistory, now);

  // If the persona didn't actually change, return unmodified
  if (currentPersonaId === newPersonaId && scene.presenterConfig?.mode === "custom") {
    return { updatedScene: scene, wasRestored: false };
  }

  // 2. If current scene has active audio or presenter video, archive it into mediaHistory
  if (scene.audioUrl || scene.presenterVideoUrl) {
    // Remove existing entry for currentPersonaId if any, then push latest
    history = history.filter((h) => h.personaId !== currentPersonaId);
    history.push({
      personaId: currentPersonaId,
      audioUrl: scene.audioUrl,
      audioDuration: scene.audioDuration,
      audioCacheKey: scene.audioCacheKey,
      presenterVideoUrl: scene.presenterVideoUrl,
      lipSyncAudioUrl: scene.lipSyncAudioUrl,
      lipSyncAudioCacheKey: scene.lipSyncAudioCacheKey,
      lipSyncLoopId: scene.lipSyncLoopId,
      lipSyncSlicesSignature: scene.lipSyncSlicesSignature,
      expiresAt: now + MEDIA_CACHE_TTL_MS,
    });
  }

  // 3. Check if newPersonaId exists in mediaHistory
  const cachedIndex = history.findIndex((h) => h.personaId === newPersonaId);
  let restoredAudioUrl: string | undefined = undefined;
  let restoredAudioDuration: number | undefined = undefined;
  let restoredAudioCacheKey: string | undefined = undefined;
  let restoredVideoUrl: string | undefined = undefined;
  let restoredLipSyncAudioUrl: string | undefined = undefined;
  let restoredLipSyncAudioCacheKey: string | undefined = undefined;
  let restoredLipSyncLoopId: string | undefined = undefined;
  let restoredLipSyncSlicesSignature: string | undefined = undefined;
  let wasRestored = false;
  let restoredItem: CachedMediaHistoryItem | undefined = undefined;

  if (cachedIndex !== -1) {
    // Restore from cache and refresh active state
    restoredItem = history[cachedIndex];
    restoredAudioUrl = restoredItem.audioUrl;
    restoredAudioDuration = restoredItem.audioDuration;
    restoredAudioCacheKey = restoredItem.audioCacheKey;
    restoredVideoUrl = restoredItem.presenterVideoUrl;
    restoredLipSyncAudioUrl = restoredItem.lipSyncAudioUrl;
    restoredLipSyncAudioCacheKey = restoredItem.lipSyncAudioCacheKey;
    restoredLipSyncLoopId = restoredItem.lipSyncLoopId;
    restoredLipSyncSlicesSignature = restoredItem.lipSyncSlicesSignature;
    wasRestored = true;
  }

  // 4. Resolve persona metadata
  const p = getPersonaById(newPersonaId);
  const existingConfig = scene.presenterConfig || {
    mode: "custom" as const,
    personaId: newPersonaId,
    avatarSrc: avatarUrl || p?.avatarUrl || "/avatars/ruby.png",
    position: "bottom_right" as const,
    layoutMode: "bottom_right" as const,
    scale: 1.0,
    offsetX: 0,
    offsetY: 0,
    showNametag: true,
    presenterName: p?.name || newPersonaId,
    roleTag: p?.title || "Specialist",
  };

  const isNewRuby = newPersonaId.toLowerCase().includes("ruby");
  const isNewMateo = newPersonaId.toLowerCase().includes("mateo");
  const isNewBlaze = newPersonaId.toLowerCase().includes("blaze");

  let defaultActionLoopId = "face_only";
  let defaultPoseId = "face_only";
  let defaultVideoUrl: string | undefined = undefined;

  if (isNewRuby) {
    defaultActionLoopId = "ruby_burgundy_m1_loop_v1";
    defaultPoseId = "ruby_burgundy_m1";
    defaultVideoUrl = "/assets/action_loops/veo/ruby_burgundy/ruby_burgundy_M1_loop_v1.mp4";
  } else if (isNewMateo) {
    defaultActionLoopId = "mateo_default_trait_m1_loop_v1";
    defaultPoseId = "mateo_default_trait_m1";
    defaultVideoUrl = "/assets/action_loops/veo/mateo_default_trait/mateo_default_trait_M1_loop_v1.mp4";
  } else if (isNewBlaze) {
    defaultActionLoopId = "blaze_silver_blazer_m1_loop_v1";
    defaultPoseId = "blaze_silver_blazer_m1";
    defaultVideoUrl = "/assets/action_loops/veo/blaze_silver_blazer/blaze_silver_blazer_M1_loop_v1.mp4";
  }

  const updatedConfig = {
    ...existingConfig,
    mode: "custom" as const,
    personaId: newPersonaId,
    avatarSrc: avatarUrl || p?.avatarUrl || existingConfig.avatarSrc,
    presenterName: p?.name || existingConfig.presenterName,
    roleTag: p?.title || existingConfig.roleTag,
    selectedActionLoopId: wasRestored && existingConfig.personaId === newPersonaId ? existingConfig.selectedActionLoopId : defaultActionLoopId,
    selectedPoseId: wasRestored && existingConfig.personaId === newPersonaId ? existingConfig.selectedPoseId : defaultPoseId,
    videoUrl: wasRestored ? restoredVideoUrl : defaultVideoUrl,
  };

  const updatedScene: AdScene = {
    ...scene,
    presenterConfig: updatedConfig,
    presenter: updatedConfig,
    audioUrl: restoredAudioUrl,
    audioDuration: restoredAudioDuration,
    audioCacheKey: restoredAudioCacheKey,
    presenterVideoUrl: restoredVideoUrl,
    lipSyncAudioUrl: restoredLipSyncAudioUrl,
    lipSyncAudioCacheKey: restoredLipSyncAudioCacheKey,
    lipSyncLoopId: restoredLipSyncLoopId,
    lipSyncSlicesSignature: restoredLipSyncSlicesSignature,
    mediaHistory: history,
  };

  return {
    updatedScene,
    wasRestored,
    restoredItem,
  };
}

export interface SwapGlobalPersonaResult {
  updatedScenes: AdScene[];
  restoredCount: number;
}

/**
 * Swaps the global (commercial-level) persona across all scenes that do not have a custom scene override.
 */
export function swapGlobalPersonaWithMediaHistory(
  scenes: AdScene[],
  newPersonaId: string,
  oldPersonaId: string
): SwapGlobalPersonaResult {
  let restoredCount = 0;

  const updatedScenes = scenes.map((scene) => {
    // If scene has an explicit custom override, keep it unchanged
    if (scene.presenterConfig && scene.presenterConfig.mode === "custom") {
      return scene;
    }

    const res = swapScenePersonaWithMediaHistory(
      scene,
      newPersonaId,
      oldPersonaId
    );

    // Keep scene in inherit mode so it follows global defaults
    const inheritPresenter: ScenePresenterSettings = {
      ...(res.updatedScene.presenterConfig || {}),
      mode: "inherit",
      personaId: newPersonaId,
    };
    const inheritScene: AdScene = {
      ...res.updatedScene,
      presenterConfig: inheritPresenter,
      presenter: inheritPresenter,
    };

    if (res.wasRestored) restoredCount++;
    return inheritScene;
  });

  return {
    updatedScenes,
    restoredCount,
  };
}

/**
 * Invalidates media when the scene's voiceover text changes.
 * Script changes make prior audio and lip-sync video obsolete across all personas.
 */
export function invalidateSceneMediaOnScriptChange(
  scene: AdScene,
  newScriptText: string
): AdScene {
  const textChanged = (scene.voiceoverScript || "").trim() !== newScriptText.trim();
  if (!textChanged) {
    return scene;
  }

  return {
    ...scene,
    voiceoverScript: newScriptText,
    audioUrl: undefined,
    audioDuration: undefined,
    audioCacheKey: undefined,
    presenterVideoUrl: undefined,
    lipSyncAudioUrl: undefined,
    lipSyncAudioCacheKey: undefined,
    lipSyncLoopId: undefined,
    lipSyncSlicesSignature: undefined,
    // Clear history since the spoken text has changed
    mediaHistory: [],
  };
}

/**
 * Explicitly removes the presenter lip-sync video from a scene and its mediaHistory
 * for the current active persona.
 */
export function clearScenePresenterVideo(scene: AdScene): AdScene {
  const currentPersonaId =
    scene.presenterConfig?.personaId ||
    scene.presenter?.personaId ||
    "ruby";

  const updatedHistory = (scene.mediaHistory || []).map((item) => {
    if (item.personaId === currentPersonaId) {
      return {
        ...item,
        presenterVideoUrl: undefined,
        lipSyncAudioUrl: undefined,
        lipSyncAudioCacheKey: undefined,
        lipSyncLoopId: undefined,
        lipSyncSlicesSignature: undefined,
      };
    }
    return item;
  });

  const updatedPresenterConfig = scene.presenterConfig
    ? { ...scene.presenterConfig, videoUrl: undefined }
    : undefined;

  const updatedPresenter = scene.presenter
    ? { ...scene.presenter, videoUrl: undefined }
    : undefined;

  return {
    ...scene,
    presenterVideoUrl: undefined,
    lipSyncAudioUrl: undefined,
    lipSyncAudioCacheKey: undefined,
    lipSyncLoopId: undefined,
    lipSyncSlicesSignature: undefined,
    presenterConfig: updatedPresenterConfig,
    presenter: updatedPresenter,
    mediaHistory: updatedHistory,
  };
}
