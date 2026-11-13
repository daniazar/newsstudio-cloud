/**
 * src/components/editor/shared/timeline/TimelineSceneAdapter.ts
 *
 * Adapter Pattern: Normalizes disparate scene models (News Story Segment vs.
 * E-Commerce Commercial AdScene) into a unified timeline domain model.
 */

import { AdScene, AdIntroConfig, AdOutroConfig } from "@/lib/types/ecommerce";
import { resolveStorageUrl } from "@/lib/storage/storageUtils";
import type { StorySegment } from "@/components/editor/hooks/useStoryEditorState";

export interface UnifiedTimelineItem {
  id: string;
  index: number;
  title: string;
  subtitle?: string;
  startFrame: number;
  durationFrames: number;
  text: string;
  thumbnailUrl?: string;
  mediaUrl?: string;
  audioUrl?: string;
  videoUrl?: string;
  status?: "ready" | "generating" | "error" | "pending" | "cached";
  categoryTag?: string;
  cameraCue?: string;
  transitionType?: string;
  actionLoop?: string;
  voiceoverScript?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Adapts a News Broadcast Segment into a UnifiedTimelineItem.
 */
export function adaptNewsSegment(segment: Partial<StorySegment> | null | undefined, fps = 30): UnifiedTimelineItem {
  if (!segment) {
    return {
      id: "empty_scene",
      index: 0,
      title: "Scene 1",
      startFrame: 0,
      durationFrames: 4 * fps,
      text: "",
      status: "ready",
      categoryTag: "Broadcast",
    };
  }

  const startSeconds = typeof segment.startTime === "number" ? segment.startTime : 0;
  const endSeconds = typeof segment.endTime === "number" ? segment.endTime : startSeconds + 4;
  const startFrame = Math.round(startSeconds * fps);
  const durationFrames = Math.max(15, Math.round((endSeconds - startSeconds) * fps));

  let status: UnifiedTimelineItem["status"] = "ready";
  if (segment.presenterStatus === "generating") status = "generating";
  else if (segment.presenterStatus === "error" || segment.presenterStatus === "failed") status = "error";
  else if (segment.presenterStatus === "cached" || segment.presenterStatus === "done") status = "cached";

  const resolvedAssetPath = segment.assetPath ? resolveStorageUrl(segment.assetPath) : undefined;
  const isVideoAsset =
    segment.assetType === "video" ||
    (typeof segment.assetPath === "string" && (segment.assetPath.endsWith(".mp4") || segment.assetPath.endsWith(".webm")));

  // If asset is a video, thumbnail cannot be the video file itself (an <img> will fail to render it)
  // Instead use the avatar or a fallback thumbnail
  const resolvedThumbnailUrl = isVideoAsset
    ? (segment.personaAvatarUrl ? resolveStorageUrl(segment.personaAvatarUrl) : "/placeholder_ruby.png")
    : (resolvedAssetPath || (segment.personaAvatarUrl ? resolveStorageUrl(segment.personaAvatarUrl) : undefined));

  const resolvedAudioUrl = segment.audioPath ? resolveStorageUrl(segment.audioPath) : undefined;
  const resolvedVideoUrl = segment.presenterVideoPath || segment.presenterVideoSrc
    ? resolveStorageUrl(segment.presenterVideoPath || segment.presenterVideoSrc)
    : undefined;

  const sceneIdx = segment.index ?? 0;
  return {
    id: segment.id || `seg_${sceneIdx}`,
    index: sceneIdx,
    title: `Scene ${sceneIdx + 1}`,
    subtitle: segment.keyword || (segment.text ? segment.text.slice(0, 32) + "..." : undefined),
    startFrame,
    durationFrames,
    text: segment.text || "",
    thumbnailUrl: resolvedThumbnailUrl,
    mediaUrl: resolvedAssetPath,
    audioUrl: resolvedAudioUrl,
    videoUrl: resolvedVideoUrl,
    status,
    categoryTag: segment.sceneStrategy || segment.presetChoice || "Broadcast",
    cameraCue: segment.cameraCue || undefined,
    transitionType: segment.transitionType || undefined,
    actionLoop: segment.actionLoop || undefined,
    voiceoverScript: segment.text || undefined,
    metadata: {
      imagePrompt: segment.imagePrompt,
      personaId: segment.personaId,
      voiceParams: segment.voiceParams,
      mediaSettings: segment.mediaSettings,
    },
  };
}

/**
 * Adapts an E-Commerce AdScene into a UnifiedTimelineItem.
 */
export function adaptAdScene(scene: AdScene, fps = 30, globalAudioUrl?: string): UnifiedTimelineItem {
  const startFrame = scene.startFrame || 0;
  const durationFrames = scene.durationFrames || 4 * fps;

  return {
    id: scene.id || `scene_${scene.sceneIndex}`,
    index: scene.sceneIndex,
    title: scene.headline || `Scene ${scene.sceneIndex + 1}`,
    subtitle: scene.subheadline || scene.sceneType.replace(/_/g, " "),
    startFrame,
    durationFrames,
    text: scene.voiceoverScript || "",
    thumbnailUrl: scene.primaryMediaUrl || "/placeholder_product.png",
    mediaUrl: scene.primaryMediaUrl,
    audioUrl: scene.audioUrl || globalAudioUrl,
    videoUrl: scene.primaryMediaUrl?.endsWith(".mp4") || scene.primaryMediaUrl?.endsWith(".webm") ? scene.primaryMediaUrl : undefined,
    status: "ready",
    categoryTag: scene.sceneType,
    cameraCue: undefined,
    transitionType: undefined,
    actionLoop: undefined,
    voiceoverScript: scene.voiceoverScript,
    metadata: {
      visualActionPrompt: scene.visualActionPrompt,
      sfxTag: scene.sfxTag,
      featureBadgeText: scene.featureBadgeText,
      secondaryMediaUrl: scene.secondaryMediaUrl,
      presenterConfig: scene.presenterConfig || scene.presenter,
    },
  };
}

/**
 * Batch adapters
 */
export function adaptNewsSegmentsToTimeline(segments: (Partial<StorySegment> | null | undefined)[], fps = 30): UnifiedTimelineItem[] {
  if (!segments || !Array.isArray(segments)) return [];
  return segments
    .filter((s): s is Partial<StorySegment> => Boolean(s) && typeof s === "object")
    .map((s, idx) => adaptNewsSegment({ ...s, index: s.index ?? idx }, fps));
}

export function adaptAdScenesToTimeline(
  scenes: AdScene[],
  fps = 30,
  globalAudioUrl?: string,
  introConfig?: AdIntroConfig,
  outroConfig?: AdOutroConfig,
  brandLogoUrl?: string | null
): UnifiedTimelineItem[] {
  if (!scenes || !Array.isArray(scenes)) return [];

  const items: UnifiedTimelineItem[] = [];
  const introEnabled = introConfig?.enabled ?? false;
  const introDuration = introEnabled ? (introConfig?.durationFrames || 60) : 0;

  // 1. Prepend Intro Bumper Item if enabled
  if (introEnabled) {
    items.push({
      id: "intro_bumper",
      index: -1,
      title: introConfig?.customHeadline || "Intro Bumper",
      subtitle: introConfig?.customSubheadline || "Brand Hook",
      startFrame: 0,
      durationFrames: introDuration,
      text: introConfig?.customHeadline || "Brand Reveal & Hook",
      thumbnailUrl: brandLogoUrl || "/placeholder_product.png",
      status: "ready",
      categoryTag: "Intro Bumper",
      metadata: {
        isIntro: true,
        sloganId: introConfig?.sloganId,
      },
    });
  }

  // 2. Map standard ad scenes, offset by introDuration
  let runningStartFrame = introDuration;
  scenes
    .filter((sc) => sc && typeof sc === "object")
    .forEach((sc, idx) => {
      const adapted = adaptAdScene({ ...sc, sceneIndex: sc.sceneIndex ?? idx }, fps, globalAudioUrl);
      const effectiveStart = typeof sc.startFrame === "number" && sc.startFrame >= 0
        ? sc.startFrame + introDuration
        : runningStartFrame;
      items.push({
        ...adapted,
        startFrame: effectiveStart,
      });
      runningStartFrame = effectiveStart + adapted.durationFrames;
    });

  // 3. Append Outro End-Card Item if enabled
  const outroEnabled = outroConfig?.enabled ?? false;
  const outroDuration = outroEnabled ? (outroConfig?.durationFrames || 75) : 0;

  if (outroEnabled) {
    const scenesEndFrame =
      items.length > (introEnabled ? 1 : 0)
        ? items[items.length - 1].startFrame + items[items.length - 1].durationFrames
        : introDuration;

    items.push({
      id: "outro_card",
      index: 999,
      title: outroConfig?.customHeadline || "Outro CTA",
      subtitle: outroConfig?.customCta || "Shop Now",
      startFrame: scenesEndFrame,
      durationFrames: outroDuration,
      text: outroConfig?.customCta || "Conversion Call-to-Action",
      thumbnailUrl: brandLogoUrl || "/placeholder_product.png",
      status: "ready",
      categoryTag: "Outro CTA",
      metadata: {
        isOutro: true,
        promoCode: outroConfig?.promoCode,
      },
    });
  }

  return items;
}

/**
 * Adapts News Broadcast Segments into an array of AdScene objects.
 * This allows all unified shared components (BatchPresenterScenesCard,
 * BatchVoiceGenerationCard, StoryboardReorderModal) to operate natively
 * on News Studio scripts.
 */
export function adaptNewsSegmentsToAdScenes(segments: StorySegment[], fps = 30): AdScene[] {
  if (!segments || !Array.isArray(segments)) return [];
  return segments
    .filter((seg) => seg && typeof seg === "object")
    .map((seg, idx) => {
      const index = seg.index ?? idx;
      const startSec = typeof seg.startTime === "number" ? seg.startTime : 0;
      const endSec = typeof seg.endTime === "number" ? seg.endTime : startSec + 4;
      const startFrame = Math.round(startSec * fps);
      const durationFrames = Math.max(15, Math.round((endSec - startSec) * fps));

      let mediaSettings: Record<string, unknown> = {};
      try {
        if (typeof seg.mediaSettings === "string") {
          mediaSettings = JSON.parse(seg.mediaSettings);
        } else if (seg.mediaSettings && typeof seg.mediaSettings === "object") {
          mediaSettings = seg.mediaSettings as Record<string, unknown>;
        }
      } catch {}

      const personaId = seg.personaId || "ruby";
      const actionLoop = seg.actionLoop || mediaSettings.actionLoop || "ruby_burgundy_M1_loop_v1";

      const resolvedAssetPath = seg.assetPath ? resolveStorageUrl(seg.assetPath) : undefined;
      const resolvedAvatarUrl = seg.personaAvatarUrl ? resolveStorageUrl(seg.personaAvatarUrl) : undefined;
      const resolvedAudioUrl = seg.audioPath ? resolveStorageUrl(seg.audioPath) : undefined;
      const resolvedVideoUrl = seg.presenterVideoPath || seg.presenterVideoSrc
        ? resolveStorageUrl(seg.presenterVideoPath || seg.presenterVideoSrc)
        : undefined;

      return {
        id: seg.id || `seg_${index}`,
        sceneIndex: index,
        startFrame,
        durationFrames,
        sceneType: "pattern_interrupt_hook",
        headline: `Scene ${index + 1}`,
        subheadline: seg.keyword || undefined,
        visualActionPrompt: seg.imagePrompt || "Broadcast visual b-roll",
        cameraCue: seg.cameraCue || mediaSettings.cameraCue || "cam1_wide",
        primaryMediaUrl: resolvedAssetPath || resolvedAvatarUrl || "/placeholder_product.png",
        voiceoverScript: seg.text || "",
        audioUrl: resolvedAudioUrl,
        audioDuration: Math.max(0.5, endSec - startSec),
        presenterVideoUrl: resolvedVideoUrl,
        presenterConfig: {
          personaId,
          avatarSrc: resolvedAvatarUrl,
          selectedActionLoopId: actionLoop,
          videoUrl: resolvedVideoUrl,
        },
        presenter: {
          personaId,
          avatarSrc: resolvedAvatarUrl,
          selectedActionLoopId: actionLoop,
          videoUrl: resolvedVideoUrl,
        },
      } as AdScene;
    });
}

/**
 * Re-maps modified AdScenes back to News Segment updates (e.g. after reordering or trimming).
 */
export function adaptAdScenesToNewsSegments(scenes: AdScene[], originalSegments: (StorySegment | Record<string, unknown>)[] = [], fps = 30): StorySegment[] {
  if (!scenes || !Array.isArray(scenes)) return [];
  let runningSec = 0;
  return scenes.map((sc, idx) => {
    const orig = (originalSegments.find((s) => s.id === sc.id || s.index === sc.sceneIndex) || {}) as Partial<StorySegment>;
    const durSec = (sc.durationFrames || 4 * fps) / fps;
    const startSec = runningSec;
    const endSec = runningSec + durSec;
    runningSec = endSec;

    return {
      ...orig,
      id: sc.id,
      index: idx,
      startTime: startSec,
      endTime: endSec,
      text: sc.voiceoverScript || orig.text || "",
      imagePrompt: orig.imagePrompt || "",
      audioPath: sc.audioUrl || orig.audioPath || null,
      presenterVideoPath: sc.presenterVideoUrl || orig.presenterVideoPath || null,
      actionLoop: sc.presenterConfig?.selectedActionLoopId || orig.actionLoop || "ruby_burgundy_M1_loop_v1",
      cameraCue: sc.cameraCue || orig.cameraCue || "cam1_wide",
    } as StorySegment;
  });
}

