import { detectLanguage } from "@/lib/ecommerce/languageDetector";
import { resolveStorageUrl } from "@/lib/storage/storageUtils";
import { getPersonaById, Persona } from "@/lib/tts/personas";
import type { AspectRatio, CompositionProps, StudioSetId, PresenterConfig } from "@/lib/types";
import type { StoryData, StorySegment } from "../hooks/useStoryEditorState";

export interface TransformCompositionPropsParams {
  aspectRatio: AspectRatio;
  scriptSegments: StorySegment[];
  story: StoryData | null;
  globalBgEnabled: boolean;
  showSafeZones: boolean;
  showTickerTape: boolean;
  sfxEnabled: boolean;
  studioSetId: StudioSetId;
  clonedPersonas: { id: string; name: string }[];
  audioTimestamp: number;
  sceneBlobMap: Record<number, Blob>;
  batchBlobMap: Record<number, Blob>;
  showPresenter: boolean;
  showCaptions: boolean;
  showHeadline: boolean;
  showCitationBadge: boolean;
  showBrandLogo: boolean;
  showBackdrop: boolean;
  showIntro: boolean;
  showOutro: boolean;
  brandLogoOffsetX: number;
  brandLogoOffsetY: number;
  brandLogoScale: number;
  badgeOffsetX: number;
  badgeOffsetY: number;
  tickerTapeOffsetY: number;
  presenterConfig: PresenterConfig;
  fps?: number;
}

export function transformSegmentsToCompositionProps(params: TransformCompositionPropsParams): CompositionProps {
  const FPS = params.fps ?? 30;
  const resolveClientSrc = (src?: string | null) => {
    if (!src) return undefined;
    return resolveStorageUrl(src);
  };

  interface BrandItem {
    captionStyle?: string;
    primaryColor?: string;
    secondaryColor?: string;
    logoStorageKeys?: string;
  }
  const primaryBrand = (params.story?.feed?.groups?.[0] as { brands?: Array<BrandItem> } | undefined)?.brands?.[0];

  return {
    aspectRatio: params.aspectRatio,
    segments: (params.scriptSegments || []).map((seg) => {
      let mediaSettingsParsed = undefined;
      try {
        if (seg.mediaSettings) {
          mediaSettingsParsed = typeof seg.mediaSettings === "string"
            ? JSON.parse(seg.mediaSettings)
            : seg.mediaSettings;
        }
      } catch (e) {
        console.warn("Failed to parse mediaSettings:", e);
      }

      let stickersParsed = null;
      try {
        if (seg.stickers) {
          const val = seg.stickers;
          if (Array.isArray(val)) {
            stickersParsed = val;
          } else if (typeof val === "string") {
            stickersParsed = val.startsWith("[") ? JSON.parse(val) : [val];
          }
        }
      } catch (e) {
        console.warn("Failed to parse stickers:", e);
      }

      const memoryBlob = params.sceneBlobMap[seg.index] || params.batchBlobMap[seg.index];
      let resolvedAudioUrl = seg.audioPath ? `${resolveClientSrc(seg.audioPath)}?t=${params.audioTimestamp}` : undefined;
      if (!resolvedAudioUrl && memoryBlob) {
        resolvedAudioUrl = URL.createObjectURL(memoryBlob);
      }

      return {
        index: seg.index,
        startFrame: Math.round(seg.startTime * FPS),
        endFrame: Math.round(seg.endTime * FPS),
        text: seg.text,
        bRollSrc: resolveClientSrc(seg.assetPath),
        bRollType: (seg.assetType as "video" | "image" | "placeholder") ?? "placeholder",
        transitionType: seg.transitionType ?? undefined,
        stickers: stickersParsed,
        backgroundPrompt: seg.backgroundPrompt ?? undefined,
        mediaSettings: mediaSettingsParsed,
        personaId: seg.personaId ?? undefined,
        personaAvatarUrl: seg.personaAvatarUrl ?? undefined,
        voiceParams: seg.voiceParams ? (typeof seg.voiceParams === "string" ? JSON.parse(seg.voiceParams) : seg.voiceParams) : undefined,
        presenterVideoSrc: resolveClientSrc(seg.presenterVideoPath),
        audioUrl: resolvedAudioUrl,
        sceneStrategy: mediaSettingsParsed?.sceneStrategy ?? seg.sceneStrategy ?? null,
        actionLoop: mediaSettingsParsed?.actionLoop ?? "state_idle",
        cameraCue: mediaSettingsParsed?.cameraCue ?? (seg.index === 0 ? "cam1_wide" : seg.index % 2 === 1 ? "cam2_left" : "cam3_closeup"),
      };
    }),
    presenterVideoSrc: resolveClientSrc(params.story?.video?.presenterVideoPath),
    presenterImageSrc: params.presenterConfig.avatarSrc || getPersonaById(params.presenterConfig.personaId || "ruby")?.avatarUrl || "/placeholder_ruby.png",
    presenterConfig: params.presenterConfig,
    presenterScale: params.presenterConfig.scale,
    presenterLayoutMode: params.presenterConfig.layoutMode,
    presenterOffsetX: params.presenterConfig.offsetX,
    presenterOffsetY: params.presenterConfig.offsetY,
    presenterBubbleFaceZoom: params.presenterConfig.bubbleFaceZoom,
    presenterBubbleFaceOffsetY: params.presenterConfig.bubbleFaceOffsetY,
    presenterBubbleFaceOffsetX: params.presenterConfig.bubbleFaceOffsetX,
    audioSrc: resolveClientSrc(params.story?.video?.presenterAudioPath),
    globalBgVideoSrc: params.globalBgEnabled ? resolveClientSrc(params.story?.video?.globalBgVideoPath) : undefined,
    bgMusicSrc: resolveClientSrc(params.story?.video?.bgMusicPath),
    bgMusicVolume: params.story?.video?.bgMusicVolume ?? 0.2,
    sloganId: params.story?.video?.sloganId ?? "ruby-tech",
    outroId: params.story?.video?.outroId ?? "subscribe",
    voiceId: params.story?.video?.voiceId ?? "en-US-Standard-C",
    captionStyle: params.story?.video?.captionStyle ?? primaryBrand?.captionStyle ?? "beast",
    showSafeZones: params.showSafeZones,
    clonedPersonas: params.clonedPersonas as unknown as Persona[],
    brandPrimaryColor: primaryBrand?.primaryColor ?? undefined,
    brandSecondaryColor: primaryBrand?.secondaryColor ?? undefined,
    logoSrc: primaryBrand?.logoStorageKeys?.split(',')[0] ? resolveClientSrc(primaryBrand.logoStorageKeys.split(',')[0]) : undefined,
    showTickerTape: params.showTickerTape,
    language: params.story?.language || (params.scriptSegments?.[0]?.personaId ? getPersonaById(params.scriptSegments[0].personaId)?.language : undefined) || (params.scriptSegments?.[0]?.text ? (detectLanguage(params.scriptSegments[0].text) === "Spanish" ? "es" : "en") : "es"),
    sfxEnabled: params.sfxEnabled,
    studioSetId: params.studioSetId,
    showPresenter: params.showPresenter,
    showCaptions: params.showCaptions,
    showHeadline: params.showHeadline,
    showCitationBadge: params.showCitationBadge,
    showBrandLogo: params.showBrandLogo,
    showBackdrop: params.showBackdrop,
    showIntro: params.showIntro,
    showOutro: params.showOutro,
    brandLogoOffsetX: params.brandLogoOffsetX,
    brandLogoOffsetY: params.brandLogoOffsetY,
    brandLogoScale: params.brandLogoScale,
    citationBadgeOffsetX: params.badgeOffsetX,
    citationBadgeOffsetY: params.badgeOffsetY,
    tickerTapeOffsetY: params.tickerTapeOffsetY,
  };
}
