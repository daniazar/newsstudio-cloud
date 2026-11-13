/**
 * src/lib/ecommerce/lipSyncValidator.ts
 *
 * Lip-Sync Validation & Smart Cache Engine for E-Commerce Video Ads.
 * Tracks and determines whether a scene's generated presenter/lip-sync video
 * is already up-to-date or needs regeneration due to:
 * 1. Audio changes (new voice synthesis, modified text, speed/pitch/model shifts)
 * 2. Loop rerolling (reshuffled action loop postures, continuous FSM slices re-sequencing)
 * 3. Veo native video scenes (which already feature native presenter performances and skip lip-sync)
 */

import { AdScene, ScenePresenterSettings } from "@/lib/types/ecommerce";
import { SceneClipSlice } from "@/lib/ecommerce/actionLoopFsmEngine";
import { isVideoScene } from "@/lib/ecommerce/voiceSynthesisCalibrator";

/**
 * Checks if a URL points to an un-lip-synced base template action loop
 * (e.g. /assets/action_loops/veo/ruby_burgundy/ruby_burgundy_M1_loop_v1.mp4).
 * Raw action loops are silent posture templates, NOT synthesized lip-sync videos.
 */
export function isRawActionLoopUrl(url?: string): boolean {
  if (!url) return false;
  const clean = url.toLowerCase().split("?")[0];
  return clean.includes("/assets/action_loops/") || clean.includes("action_loops/veo");
}

/**
 * Generates a deterministic signature string for a scene's continuous action loop slices.
 * Any reroll or sequence shift changes this signature.
 */
export function getActionLoopSlicesSignature(slices?: SceneClipSlice[]): string {
  if (!slices || slices.length === 0) return "";
  return slices
    .map((s) => `${s.clipId}:${s.sliceDurationFrames}:${s.localStartFrame}`)
    .join("|");
}

export interface LipSyncValidationOptions {
  currentAudioUrl?: string;
  currentAudioCacheKey?: string;
  currentLoopId?: string;
  currentSlices?: SceneClipSlice[];
}

/**
 * Determines whether a scene's presenter lip-sync video is already generated and up-to-date.
 * Returns true if:
 * 1. It is a Veo video scene (natively complete audio-visual presenter performance).
 * 2. It has a valid presenterVideoUrl (not empty, and not a raw action loop template).
 * 3. The underlying audio has NOT changed (matches lipSyncAudioUrl and lipSyncAudioCacheKey).
 * 4. The action loops have NOT been rerolled (matches lipSyncLoopId and lipSyncSlicesSignature).
 */
export function isLipSyncUpToDate(
  scene?: AdScene,
  options?: LipSyncValidationOptions
): boolean {
  if (!scene) return false;

  // 1. Veo video scenes already feature native presenter performance on camera
  if (isVideoScene(scene)) {
    return true;
  }

  // 2. Must have a presenterVideoUrl that is NOT a raw unsynthesized action loop
  if (!scene.presenterVideoUrl || !scene.presenterVideoUrl.trim()) {
    return false;
  }
  if (isRawActionLoopUrl(scene.presenterVideoUrl)) {
    return false;
  }

  // 3. Audio check: Must have underlying audio, and it must match the lip-synced audio
  const effectiveAudioUrl = options?.currentAudioUrl || scene.audioUrl;
  if (!effectiveAudioUrl || !effectiveAudioUrl.trim()) {
    return false; // Cannot have an up-to-date lip-sync without underlying audio
  }

  // If we recorded the audio URL used during lip-sync, verify it hasn't changed
  if (scene.lipSyncAudioUrl && scene.lipSyncAudioUrl !== effectiveAudioUrl) {
    return false; // The underlying audio URL changed!
  }

  // If we recorded the audio cache key (which tracks text, speed, pitch, persona), verify it
  const effectiveCacheKey = options?.currentAudioCacheKey || scene.audioCacheKey;
  if (
    scene.lipSyncAudioCacheKey &&
    effectiveCacheKey &&
    scene.lipSyncAudioCacheKey !== effectiveCacheKey
  ) {
    return false; // Spoken text or voice synthesis parameters changed!
  }

  // 4. Loop / Reroll check: Verify the action loop has not been rerolled
  const effectiveLoopId =
    options?.currentLoopId ||
    scene.presenterConfig?.selectedActionLoopId ||
    scene.presenter?.selectedActionLoopId;

  if (scene.lipSyncLoopId && effectiveLoopId && scene.lipSyncLoopId !== effectiveLoopId) {
    return false; // The action loop ID was rerolled or changed!
  }

  // Slices check for continuous FSM sequences
  const effectiveSlices =
    options?.currentSlices ||
    scene.actionLoopSlices ||
    scene.presenterConfig?.actionLoopSlices;
  const currentSlicesSig = getActionLoopSlicesSignature(effectiveSlices);

  if (
    scene.lipSyncSlicesSignature &&
    currentSlicesSig &&
    scene.lipSyncSlicesSignature !== currentSlicesSig
  ) {
    return false; // Continuous action loop sequence was reshuffled/rerolled!
  }

  // If presenterConfig has a raw action loop set as videoUrl and presenterVideoUrl equals it, loops were rerolled
  if (
    scene.presenterConfig?.videoUrl &&
    isRawActionLoopUrl(scene.presenterConfig.videoUrl) &&
    scene.presenterVideoUrl === scene.presenterConfig.videoUrl
  ) {
    return false;
  }

  return true;
}

export interface RecordLipSyncParams {
  videoUrl: string;
  audioUrl?: string;
  audioCacheKey?: string;
  loopId?: string;
  slices?: SceneClipSlice[];
  presenterConfigFallback?: ScenePresenterSettings | null;
}

/**
 * Records a successful lip-sync generation on an AdScene, saving both the synthesized video URL
 * and the exact audio & loop parameters used to generate it.
 */
export function recordLipSyncSuccess(
  scene: AdScene,
  params: RecordLipSyncParams
): AdScene {
  const slicesSig = getActionLoopSlicesSignature(params.slices || scene.actionLoopSlices);
  const effectiveLoopId =
    params.loopId ||
    scene.presenterConfig?.selectedActionLoopId ||
    scene.presenter?.selectedActionLoopId ||
    "ruby_burgundy_m1_loop_v1";

  const updatedConfig = {
    ...(scene.presenterConfig || params.presenterConfigFallback || {}),
    videoUrl: params.videoUrl,
    selectedActionLoopId: effectiveLoopId,
  };

  const updatedPresenter = {
    ...(scene.presenter || params.presenterConfigFallback || {}),
    videoUrl: params.videoUrl,
    selectedActionLoopId: effectiveLoopId,
  };

  return {
    ...scene,
    presenterVideoUrl: params.videoUrl,
    lipSyncAudioUrl: params.audioUrl || scene.audioUrl,
    lipSyncAudioCacheKey: params.audioCacheKey || scene.audioCacheKey,
    lipSyncLoopId: effectiveLoopId,
    lipSyncSlicesSignature: slicesSig,
    presenterConfig: updatedConfig,
    presenter: updatedPresenter,
  };
}

/**
 * Clears lip-sync video and validation metadata from a scene (e.g. on deletion, rerolling loops, or script change).
 */
export function clearSceneLipSync(scene: AdScene): AdScene {
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
  };
}
