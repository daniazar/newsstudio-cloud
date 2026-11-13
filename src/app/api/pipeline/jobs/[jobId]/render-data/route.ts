import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWorkerKey } from "@/lib/workerAuth";
import { storage } from "@/lib/storage";
import { getPersonaById } from "@/lib/tts/personas";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const authErr = requireWorkerKey(req);
  if (authErr) return authErr;

  const { jobId } = await params;

  try {
    const job = await prisma.generationJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    let jobConfig: { videoId?: string; compositionId?: string; inputProps?: Record<string, unknown>; [key: string]: unknown } = {};
    if (job.config) {
      try {
        jobConfig = typeof job.config === "string" ? JSON.parse(job.config) : job.config;
      } catch (e) {
        console.warn(`[render-data] Failed to parse job.config:`, e);
      }
    }

    const targetVideoId = jobConfig.videoId;
    const video = targetVideoId
      ? await prisma.video.findUnique({
          where: { id: targetVideoId },
          include: {
            story: {
              include: {
                script: {
                  include: { segments: { orderBy: { index: "asc" } } },
                },
              },
            },
          },
        })
      : await prisma.video.findFirst({
          where: { storyId: job.storyId },
          include: {
            story: {
              include: {
                script: {
                  include: { segments: { orderBy: { index: "asc" } } },
                },
              },
            },
          },
        });

    if (!video) {
      if (jobConfig.inputProps) {
        return NextResponse.json({
          videoId: targetVideoId || job.storyId || job.id,
          storyId: job.storyId,
          companyId: job.companyId,
          aspectRatio: jobConfig.aspectRatio || "vertical",
          compositionId: jobConfig.compositionId || "RubyNews-Vertical",
          inputProps: jobConfig.inputProps,
        });
      }
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    const feedWithGroups = await prisma.rssFeed.findUnique({
      where: { id: video.story.feedId },
      include: { groups: true },
    });

    const groupIds = feedWithGroups?.groups.map((g) => g.id) || [];
    const brand = groupIds.length > 0
      ? await prisma.brand.findFirst({
          where: { rssGroups: { some: { id: { in: groupIds } } } },
        })
      : null;

    const resolveUrl = (p?: string | null): string | undefined => {
      if (!p) return undefined;
      if (p.startsWith("http://") || p.startsWith("https://") || p.startsWith("data:") || p.startsWith("/")) return p;
      return storage.getUrl(p);
    };

    let watermarkSrc: string | undefined;
    let brandPrimaryColor: string | undefined;
    let brandSecondaryColor: string | undefined;
    let captionStyle: string | undefined;
    let introVideoSrc: string | undefined;
    let outroVideoSrc: string | undefined;
    let logoSrc: string | undefined;

    if (brand) {
      if (brand.watermarkStorageKey) watermarkSrc = resolveUrl(brand.watermarkStorageKey);
      if (brand.introVideoStorageKey) introVideoSrc = resolveUrl(brand.introVideoStorageKey);
      if (brand.outroVideoStorageKey) outroVideoSrc = resolveUrl(brand.outroVideoStorageKey);

      brandPrimaryColor = brand.primaryColor || undefined;
      brandSecondaryColor = brand.secondaryColor || undefined;
      captionStyle = brand.captionStyle || undefined;

      if (brand.logoStorageKeys) {
        const keys = brand.logoStorageKeys.split(",").map((k) => k.trim()).filter(Boolean);
        if (keys.length > 0) {
          const randomKey = keys[Math.floor(Math.random() * keys.length)];
          logoSrc = resolveUrl(randomKey);
        }
      }
    }

    const aspectRatio = jobConfig.aspectRatio || video.aspectRatio || "vertical";
    const compositionId =
      jobConfig.compositionId ||
      (aspectRatio === "horizontal"
        ? "RubyNews-Horizontal"
        : aspectRatio === "square"
        ? "RubyNews-Square"
        : "RubyNews-Vertical");

    const segments =
      video.story.script?.segments.map((seg) => {
        interface MediaSettingsParsed {
          sceneStrategy?: string;
          actionLoop?: string;
          cameraCue?: string;
          [key: string]: unknown;
        }
        let mediaSettingsParsed: MediaSettingsParsed | undefined = undefined;
        try {
          if (seg.mediaSettings) {
            mediaSettingsParsed = typeof seg.mediaSettings === "string" ? JSON.parse(seg.mediaSettings) : seg.mediaSettings;
          }
        } catch (e) {
          console.warn(`[render-data] Failed to parse mediaSettings for segment ${seg.index}:`, e);
        }

        let stickersParsed: string[] | null = null;
        try {
          if (seg.stickers) {
            const val = seg.stickers;
            if (Array.isArray(val)) stickersParsed = val;
            else if (typeof val === "string") stickersParsed = val.startsWith("[") ? JSON.parse(val) : [val];
          }
        } catch (e) {
          console.warn(`[render-data] Failed to parse stickers for segment ${seg.index}:`, e);
        }

        let voiceParamsParsed: Record<string, unknown> | undefined = undefined;
        try {
          if (seg.voiceParams) {
            voiceParamsParsed = typeof seg.voiceParams === "string" ? JSON.parse(seg.voiceParams) : seg.voiceParams;
          }
        } catch (e) {
          console.warn(`[render-data] Failed to parse voiceParams for segment ${seg.index}:`, e);
        }

        const audioUrl = resolveUrl(seg.audioPath);
        const presenterVideoSrc = resolveUrl(seg.presenterVideoPath);
        const bRollSrc = resolveUrl(seg.assetPath);

        return {
          index: seg.index,
          startFrame: Math.round(seg.startTime * 30),
          endFrame: Math.round(seg.endTime * 30),
          text: seg.text,
          spokenText: seg.spokenText ?? undefined,
          bRollSrc,
          bRollType: (seg.assetType as "video" | "image" | "placeholder") ?? "placeholder",
          transitionType: seg.transitionType ?? undefined,
          stickers: stickersParsed,
          backgroundPrompt: seg.backgroundPrompt ?? undefined,
          mediaSettings: mediaSettingsParsed,
          personaId: seg.personaId ?? undefined,
          personaAvatarUrl: resolveUrl(seg.personaAvatarUrl),
          voiceParams: voiceParamsParsed,
          audioUrl,
          presenterVideoSrc,
          sceneStrategy: mediaSettingsParsed?.sceneStrategy ?? seg.sceneStrategy ?? null,
          actionLoop: mediaSettingsParsed?.actionLoop ?? "state_idle",
          cameraCue: mediaSettingsParsed?.cameraCue ?? (seg.index === 0 ? "cam1_wide" : seg.index % 2 === 1 ? "cam2_left" : "cam3_closeup"),
        };
      }) ?? [];

    const leadPersona = getPersonaById(video.personaId || "ruby");
    const presenterImageSrc = leadPersona?.avatarUrl || "/placeholder_ruby.png";

    const inputProps = {
      aspectRatio,
      segments,
      presenterVideoSrc: resolveUrl(video.presenterVideoPath),
      presenterImageSrc,
      presenterConfig: {
        avatarSrc: presenterImageSrc,
        scale: 1,
        layoutMode: "full_screen",
        personaId: video.personaId || "ruby",
      },
      presenterScale: 1,
      presenterLayoutMode: "full_screen",
      audioSrc: resolveUrl(video.presenterAudioPath),
      globalBgVideoSrc: resolveUrl(video.globalBgVideoPath),
      bgMusicSrc: resolveUrl(video.bgMusicPath),
      bgMusicVolume: video.bgMusicVolume ?? 0.2,
      sloganId: video.sloganId ?? "ruby-tech",
      outroId: video.outroId ?? "subscribe",
      voiceId: video.personaId ?? "ruby",
      captionStyle: video.captionStyle || captionStyle || "beast",
      watermarkSrc,
      brandPrimaryColor: brandPrimaryColor || "#00F0FF",
      brandSecondaryColor,
      introVideoSrc,
      outroVideoSrc,
      logoSrc,
      showSafeZones: false,
      showPresenter: true,
      showCaptions: true,
      showHeadline: true,
      showCitationBadge: true,
      showBrandLogo: Boolean(logoSrc),
      showBackdrop: true,
      showIntro: Boolean(introVideoSrc),
      showOutro: Boolean(outroVideoSrc),
      showTickerTape: true,
      language: (video.story as { language?: string })?.language || (video.story.script?.segments?.[0]?.personaId ? getPersonaById(video.story.script.segments[0].personaId)?.language : undefined) || "es",
      sfxEnabled: true,
    };

    const finalInputProps = jobConfig.inputProps
      ? {
          ...inputProps,
          ...jobConfig.inputProps,
          aspectRatio,
        }
      : inputProps;

    return NextResponse.json({
      videoId: video.id,
      storyId: video.storyId,
      companyId: job.companyId,
      aspectRatio,
      compositionId,
      inputProps: finalInputProps,
    });
  } catch (error) {
    console.error("Error generating render data:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
