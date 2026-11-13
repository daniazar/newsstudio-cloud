import { verifySegmentFact } from "@/lib/ai/factChecker";
import { expandAcronyms } from "@/lib/ai/pronunciationDetector";
import { translateNewsScript,type TargetLanguage } from "@/lib/ai/translator";
import { generateScript,normalizeTextForAudio } from "@/lib/llm/client";
import { polishTextWithOllama } from "@/lib/llm/providers/ollama";
import { prisma } from "@/lib/prisma";
import { scrapeArticle } from "@/lib/scraper/articleScraper";
import { searchStock } from "@/lib/stock";
import { requireTenant } from "@/lib/tenant";
import { StoryStatus,VideoStatus } from "@/lib/types";
import { type ChildProcess } from "child_process";
import { NextRequest,NextResponse } from "next/server";
import { z } from "zod";

import { dispatchGenerateScript } from "@/lib/orchestration/dispatch";
import { broadcastWorkerWake } from "@/lib/worker-broker";
import { deleteSegmentStorageAssets,deleteStoryStorageAssets } from "@/lib/storage/cleanup";
import { planNewsBroadcastFsmSequence } from "@/lib/video/loopSelector";

// Track active render processes so we can cancel them
const activeRenders = new Map<string, ChildProcess>();

/**
 * GET /api/stories/[storyId] — Get a single story with all relations.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  const { storyId } = await params;

  const story = await prisma.story.findFirst({
    where: { id: storyId, companyId: orgId },
    include: {
      feed: {
        select: {
          id: true,
          name: true,
          url: true,
        },
      },
      script: {
        include: { segments: { orderBy: { index: "asc" } } },
      },
      video: true,
    },
  });

  if (!story) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }

  return NextResponse.json(story);
}

/**
 * POST /api/stories/[storyId] — Trigger actions on a story.
 * Actions: "generate-script" | "send-to-production" | "render"
 * Falls back to direct execution when Inngest isn't available.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  const { storyId } = await params;

  const ActionSchema = z.object({
    action: z.enum([
      "generate-script", "approve-script", "send-to-production",
      "render", "cancel-render", "delete-segment", "add-segment", "update-segment",
      "reorder-segments", "update-video", "polish-script",
      "split-segment", "merge-segments", "recast-persona",
      "fact-check-segment", "generate-hooks", "batch-export-all-formats",
      "translate-story", "auto-match-broll", "normalize-spoken-text",
      "batch-update-segments"
    ])
  }).passthrough();

  const rawBody = await request.json();
  const parsedData = ActionSchema.safeParse(rawBody);

  if (!parsedData.success) {
    return NextResponse.json(
      { error: "Invalid action payload", details: parsedData.error.format() },
      { status: 400 }
    );
  }

  const body = rawBody as {
    action: string;
    synchronous?: boolean;
    archetype?: string;
    customDirection?: string;
    segmentText?: string;
    text?: string;
    mode?: string;
    style?: string;
    segmentId?: string;
    targetLang?: TargetLanguage;
    segmentIndex?: number;
    query?: string;
    mediaType?: "video" | "photo";
    aspectRatio?: string;
    bgMusicPath?: string;
    bgMusicVolume?: number;
    globalBgVideoPath?: string;
    sloganId?: string;
    outroId?: string;
    voiceId?: string;
    captionStyle?: string;
    youtubeTitle?: string;
    youtubeDescription?: string;
    instagramCaption?: string;
    instagramHashtags?: string;
    headline?: string;
    spokenText?: string;
    assetPath?: string | null;
    assetType?: string | null;
    mediaSettings?: string | null;
    transitionType?: string;
    stickers?: unknown;
    backgroundPrompt?: string;
    voiceParams?: string;
    personaAvatarUrl?: string;
    presenterStatus?: string;
    startTime?: number;
    endTime?: number;
    presetChoice?: string;
    personaImagePrompt?: string;
    presenterVideoPrompt?: string;
    personaId?: string;
    firstSegmentId?: string;
    secondSegmentId?: string;
    engine?: string;
    language?: string;
    [key: string]: unknown;
  };
  const action = body.action;

  const story = await prisma.story.findFirst({
    where: { id: storyId, companyId: orgId },
    include: { feed: true, script: true },
  });
  if (!story) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }

  try {
    switch (action) {
      case "generate-script": {
        const isSynchronous = Boolean(body.synchronous);
        const archetype = typeof body.archetype === "string" ? body.archetype : undefined;
        const customDirection = typeof body.customDirection === "string" ? body.customDirection : undefined;
        const leadPersonaId = typeof body.personaId === "string" && body.personaId !== "auto" ? body.personaId : undefined;
        const targetLanguage = typeof body.language === "string" ? body.language : undefined;
        const targetChannel = typeof body.targetChannel === "string" ? body.targetChannel : undefined;
        const aspectRatio = typeof body.aspectRatio === "string" ? body.aspectRatio : undefined;
        const tickerText = typeof body.tickerText === "string" ? body.tickerText : undefined;

        // If synchronous execution is requested (e.g. from the Pre-Production Control Room modal),
        // execute directly and return the generated script payload in the HTTP response.
        if (isSynchronous) {
          await prisma.story.update({
            where: { id: storyId },
            data: {
              status: StoryStatus.SCRIPTING,
            },
          });

          try {

          const scrapeResult = await scrapeArticle(
            story.link,
            story.description ?? undefined
          );

          if (scrapeResult.article?.content) {
            await prisma.story.update({
              where: { id: storyId },
              data: {
                fullContent: scrapeResult.article.content,
                articleImageUrls: scrapeResult.article.images && scrapeResult.article.images.length > 0 ? JSON.stringify(scrapeResult.article.images) : null,
              },
            });
          }

          const articleContent =
            scrapeResult.article?.content ??
            story.description ??
            story.title;

          const activePersonas = await prisma.persona.findMany({
            where: { isActive: true },
          });
          const personasContext = activePersonas
            .map((p) => {
              return `Persona Slug: "${p.slug}"
- Name: ${p.name}
- Role: ${p.role}
- Description: ${p.description ?? ""}
- Visual Description: ${p.visualPrompt ?? ""}
- Visual/Style Guidelines (Attire/Hair/Makeup/Grooming): ${p.styleGuidelines ?? ""}`;
            })
            .join("\n\n");

          const scriptOutput = await generateScript({
            title: story.title,
            content: articleContent,
            author: story.author ?? undefined,
            source: story.feed.name,
            images: scrapeResult.article?.images,
          }, {
            personasContext,
            companyId: orgId,
            engine: "omni",
            language: targetLanguage || "es",
            archetype,
            customDirection,
            leadPersonaId,
          });

          await prisma.script.deleteMany({
            where: { storyId },
          });

          const scrapedImages = (scrapeResult.article?.images && scrapeResult.article.images.length > 0)
            ? scrapeResult.article.images
            : [];

          const effectivePersona = leadPersonaId || "ruby";
          const plannedFsmBeats = planNewsBroadcastFsmSequence(scriptOutput.segments, effectivePersona);

          const savedScript = await prisma.script.create({
            data: {
              storyId,
              rawJson: JSON.stringify(scriptOutput),
              headline: tickerText || scriptOutput.headline,
              segments: {
                create: scriptOutput.segments.map((seg, idx) => {
                  let assetPath: string | null = null;
                  let assetType: string = "placeholder";

                  if (seg.index === 0) {
                    assetPath = "/studio_environments/studio_plate_standup_skyline_9x16.jpg";
                    assetType = "image";
                  } else if (seg.index === 1) {
                    if (scrapedImages.length > 0) {
                      assetPath = scrapedImages[0];
                      assetType = "image";
                    } else if (seg.source_media_url) {
                      assetPath = seg.source_media_url;
                      assetType = "image";
                    }
                  } else {
                    const articleImgIdx = seg.index - 1;
                    if (scrapedImages.length > articleImgIdx) {
                      assetPath = scrapedImages[articleImgIdx];
                      assetType = "image";
                    } else if (seg.source_media_url && !scrapedImages.includes(seg.source_media_url)) {
                      assetPath = seg.source_media_url;
                      assetType = "image";
                    }
                  }

                  const beat = plannedFsmBeats[idx] || plannedFsmBeats.find((b) => b.index === seg.index);
                  const actionLoop = beat?.clipId || "M1_loop_v1";
                  const cameraCue = beat?.cameraCue || "cam1_wide";
                  const loopVideoUrl = beat?.videoUrl || null;
                  const sceneStrategy = "chroma_broll";

                  const mediaSettings = JSON.stringify({
                    scale: 1,
                    offsetX: 0,
                    offsetY: 0,
                    startTrim: 0,
                    endTrim: 0,
                    transitionType: "fade",
                    sceneStrategy,
                    actionLoop,
                    cameraCue,
                    startPose: beat?.startPose || "M1",
                    endPose: beat?.endPose || "M1",
                    actionStateLabel: beat?.actionStateLabel || "M1 Anchor Stance",
                    videoUrl: loopVideoUrl,
                    presenterVideoPath: loopVideoUrl,
                    layoutMode: "full_screen",
                  });

                  return {
                    index: seg.index,
                    startTime: seg.start_time,
                    endTime: seg.end_time,
                    text: seg.text,
                    spokenText: seg.spoken_text || null,
                    imagePrompt: seg.image_prompt,
                    assetPath,
                    assetType,
                    sceneStrategy,
                    mediaSettings,
                    suggestedPersonaId: effectivePersona,
                    personaId: effectivePersona,
                    presenterVideoPath: loopVideoUrl,
                    keyword: seg.keyword ?? null,
                    presetChoice: seg.preset_choice ?? null,
                    personaImagePrompt: seg.persona_image_prompt ?? null,
                    presenterVideoPrompt: seg.presenter_video_prompt ?? null,
                  };
                }),
              },
            },
            include: { segments: true },
          });

          await prisma.video.upsert({
            where: { storyId },
            create: {
              companyId: orgId,
              storyId,
              status: "PENDING",
              youtubeTitle: scriptOutput.youtube_title,
              youtubeDescription: scriptOutput.youtube_description,
              youtubeTags: scriptOutput.youtube_tags ? JSON.stringify(scriptOutput.youtube_tags) : null,
              instagramCaption: scriptOutput.instagram_caption,
              instagramHashtags: scriptOutput.instagram_hashtags ? JSON.stringify(scriptOutput.instagram_hashtags) : null,
              aspectRatio: aspectRatio === "16:9" ? "horizontal" : "vertical",
              personaId: leadPersonaId || "ruby",
            },
            update: {
              youtubeTitle: scriptOutput.youtube_title,
              youtubeDescription: scriptOutput.youtube_description,
              ...(aspectRatio ? { aspectRatio: aspectRatio === "16:9" ? "horizontal" : "vertical" } : {}),
              ...(leadPersonaId ? { personaId: leadPersonaId } : {}),
            },
          });

          await prisma.story.update({
            where: { id: storyId },
            data: { status: StoryStatus.SCRIPTED },
          });

          return NextResponse.json({
            success: true,
            storyId,
            script: {
              ...savedScript,
              headline: savedScript.headline,
              segments: savedScript.segments,
              rawJson: scriptOutput,
              archetype,
              targetChannel,
              aspectRatio,
              leadPersonaId: leadPersonaId || savedScript.segments[0]?.personaId || "ruby",
            },
          });
        } catch (syncError) {
          // Revert story status if synchronous generation failed so it doesn't get stuck in SCRIPTING
          await prisma.story.update({
            where: { id: storyId },
            data: { status: story.script ? StoryStatus.SCRIPTED : "INGESTED" },
          }).catch(() => {});
          throw syncError;
        }
      }

        void dispatchGenerateScript({
          storyId,
          companyId: orgId,
        }).catch((err) => {
          console.error(`[Newsroom] [${storyId}] Async script generation failed:`, err);
        });

        return NextResponse.json({
          success: true,
          action: "generate-script",
          mode: "async",
        });
      }

      case "approve-script": {
        await prisma.story.update({
          where: { id: storyId },
          data: { approvalStatus: "approved" },
        });
        // Fall through to send-to-production
      }

      case "send-to-production": {
        const video = await prisma.video.upsert({
          where: { storyId },
          create: {
            companyId: orgId,
            storyId,
            status: VideoStatus.AWAITING_VOICE,
            aspectRatio: body.aspectRatio ?? "vertical",
          },
          update: {
            status: VideoStatus.AWAITING_VOICE,
            aspectRatio: body.aspectRatio ?? "vertical",
          },
        });

        await prisma.story.update({
          where: { id: storyId },
          data: { status: StoryStatus.IN_PRODUCTION },
        });

        // Queue the Audio job for the new standalone worker pipeline
        const storyForPipeline = await prisma.story.findUnique({
          where: { id: storyId },
          include: { script: { include: { segments: true } } }
        });
        const segmentsCount = storyForPipeline?.script?.segments?.length || 0;
        await prisma.generationJob.create({
          data: {
            companyId: orgId,
            storyId: storyId,
            type: "audio",
            status: "QUEUED",
            totalSteps: segmentsCount,
            config: JSON.stringify({
              personaId: video.personaId,
              voiceId: video.personaId,
            }),
          }
        });
        void broadcastWorkerWake("job_queued");

        return NextResponse.json({
          success: true,
          action: "send-to-production",
          videoId: video.id,
          mode: "async",
        });
      }

      case "render": {
        const existingVideo = await prisma.video.findUnique({
          where: { storyId },
          include: { story: { include: { script: { include: { segments: { orderBy: { index: "asc" } } } } } } }
        });
        if (!existingVideo) {
          return NextResponse.json(
            { error: "No video record found" },
            { status: 400 }
          );
        }

        await prisma.video.update({
          where: { id: existingVideo.id },
          data: { status: VideoStatus.RENDERING, renderProgress: 0 },
        });
        await prisma.story.update({
          where: { id: storyId },
          data: { status: StoryStatus.RENDERING },
        });

        // Cancel any previous queued or in-progress render jobs for this story
        await prisma.generationJob.updateMany({
          where: {
            storyId,
            type: "render",
            status: { in: ["QUEUED", "CLAIMED", "RENDER_IN_PROGRESS"] },
          },
          data: { status: "CANCELLED" },
        });

        const aspectRatio = existingVideo.aspectRatio ?? "vertical";
        const compositionId =
          aspectRatio === "horizontal"
            ? "RubyNews-Horizontal"
            : aspectRatio === "square"
            ? "RubyNews-Square"
            : "RubyNews-Vertical";

        const job = await prisma.generationJob.create({
          data: {
            companyId: orgId,
            storyId,
            type: "render",
            status: "QUEUED",
            totalSteps: 4,
            config: JSON.stringify({
              videoId: existingVideo.id,
              aspectRatio,
              compositionId,
            }),
          },
        });
        void broadcastWorkerWake("job_queued");

        return NextResponse.json({
          success: true,
          action: "render",
          videoId: existingVideo.id,
          jobId: job.id,
          mode: "worker",
        });
      }

      case "cancel-render": {
        const video = await prisma.video.findUnique({
          where: { storyId },
        });

        if (video && activeRenders.has(video.id)) {
          const child = activeRenders.get(video.id);
          child?.kill("SIGKILL");
          activeRenders.delete(video.id);
        }

        // Cancel active generation jobs for this story
        await prisma.generationJob.updateMany({
          where: {
            storyId,
            type: "render",
            status: { in: ["QUEUED", "CLAIMED", "RENDER_IN_PROGRESS", "IN_PROGRESS"] },
          },
          data: { status: "CANCELLED" },
        });

        await prisma.video.update({
          where: { storyId },
          data: { status: "FAILED", renderProgress: 0 },
        });
        await prisma.story.update({
          where: { id: storyId },
          data: { status: "INGESTED" },
        });

        return NextResponse.json({ success: true, action: "cancel-render" });
      }

      case "delete-segment": {
        const { segmentId } = body;
        if (!segmentId) {
          return NextResponse.json({ error: "Missing segmentId" }, { status: 400 });
        }

        const segmentToDelete = await prisma.segment.findUnique({
          where: { id: segmentId },
        });

        if (!segmentToDelete) {
          return NextResponse.json({ error: "Segment not found" }, { status: 404 });
        }

        // Clean up physical storage assets for this segment asynchronously
        await deleteSegmentStorageAssets(segmentToDelete).catch((err) => {
          console.warn(`[Storage Cleanup] Failed to clean up assets for segment ${segmentId}:`, err);
        });

        // Use a transaction to delete and reorder
        await prisma.$transaction(async (tx: Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">) => {
          // Delete the segment
          await tx.segment.delete({ where: { id: segmentId } });

          // Shift indices and update start/end times for subsequent segments
          const script = await tx.script.findUnique({
            where: { id: segmentToDelete.scriptId },
            include: { segments: { orderBy: { index: "asc" } } },
          });

          if (script) {
            let currentStartTime = 0;
            const updates = script.segments.map((seg: { id: string; startTime: number; endTime: number; }, idx: number) => {
              const duration = seg.endTime - seg.startTime;
              const newStartTime = currentStartTime;
              const newEndTime = currentStartTime + duration;
              currentStartTime = newEndTime;

              return tx.segment.update({
                where: { id: seg.id },
                data: {
                  index: idx,
                  startTime: newStartTime,
                  endTime: newEndTime,
                },
              });
            });
            await Promise.all(updates);
          }
        });

        return NextResponse.json({ success: true, action: "delete-segment" });
      }

      case "add-segment": {
        const { afterIndex, text, duration } = body;
        const script = story.script;
        if (!script) {
          return NextResponse.json({ error: "Story script not found" }, { status: 400 });
        }

        const segments = await prisma.segment.findMany({
          where: { scriptId: script.id },
          orderBy: { index: "asc" },
        });

        const insertIndex = typeof afterIndex === "number" && afterIndex >= 0 && afterIndex <= segments.length
          ? afterIndex + 1
          : segments.length;

        const defaultDuration = typeof duration === "number" && duration > 0 ? duration : 4.0;
        const defaultText = typeof text === "string" && text.trim() ? text.trim() : "New scene narration...";

        const personaId = segments[0]?.personaId || "ruby";
        const personaAvatarUrl = segments[0]?.personaAvatarUrl || null;
        const actionLoop = "ruby_burgundy_M1_loop_v1";

        const newSegment = await prisma.$transaction(async (tx) => {
          if (insertIndex < segments.length) {
            // ⚡ Bolt Optimization: Replace loop N+1 queries with single updateMany
            await tx.segment.updateMany({
              where: {
                scriptId: script.id,
                index: { gte: segments[insertIndex].index },
              },
              data: { index: { increment: 1 } },
            });
          }

          const created = await tx.segment.create({
            data: {
              scriptId: script.id,
              index: insertIndex,
              startTime: 0,
              endTime: defaultDuration,
              text: defaultText,
              imagePrompt: "News studio broadcast visual b-roll",
              personaId,
              personaAvatarUrl,
              mediaSettings: JSON.stringify({ actionLoop, cameraCue: "cam1_wide" }),
              sceneStrategy: "transparent_anchor",
            },
          });

          const allSegments = await tx.segment.findMany({
            where: { scriptId: script.id },
            orderBy: { index: "asc" },
          });

          let runningTime = 0;
          // ⚡ Bolt Optimization: Replace sequential N+1 updates in loop with Promise.all
          // Expected impact: Eliminates N roundtrips over DB connection inside interactive transaction,
          // massively speeding up segment insertion time, particularly for larger scripts.
          const updates = allSegments.map((seg, i) => {
            const dur = seg.id === created.id ? defaultDuration : Math.max(1, seg.endTime - seg.startTime);
            const startTime = runningTime;
            runningTime += dur;
            return tx.segment.update({
              where: { id: seg.id },
              data: {
                index: i,
                startTime,
                endTime: runningTime,
              },
            });
          });
          await Promise.all(updates);

          return created;
        });

        return NextResponse.json({ success: true, action: "add-segment", segment: newSegment });
      }

      case "split-segment": {
        const { segmentId, splitIndex, splitTime } = body;
        if (!segmentId) {
          return NextResponse.json({ error: "Missing segmentId" }, { status: 400 });
        }

        const segment = await prisma.segment.findUnique({
          where: { id: segmentId },
        });

        if (!segment) {
          return NextResponse.json({ error: "Segment not found" }, { status: 404 });
        }

        const totalDuration = segment.endTime - segment.startTime;
        const words = segment.text.trim().split(/\s+/);
        let splitWordIdx = Math.max(1, Math.floor(words.length / 2));

        if (typeof splitIndex === "number" && splitIndex > 0 && splitIndex < words.length) {
          splitWordIdx = splitIndex;
        }

        const text1 = words.slice(0, splitWordIdx).join(" ");
        const text2 = words.slice(splitWordIdx).join(" ");

        let duration1 = totalDuration / 2;
        if (typeof splitTime === "number" && splitTime > segment.startTime && splitTime < segment.endTime) {
          duration1 = splitTime - segment.startTime;
        }

        const midTime = segment.startTime + duration1;

        await prisma.$transaction(async (tx) => {
          // 1. Shift indices of subsequent segments
          // ⚡ Bolt Optimization: Replace N+1 queries with single updateMany
          await tx.segment.updateMany({
            where: {
              scriptId: segment.scriptId,
              index: { gt: segment.index },
            },
            data: { index: { increment: 1 } },
          });

          // 2. Update first segment
          await tx.segment.update({
            where: { id: segment.id },
            data: {
              text: text1,
              endTime: midTime,
            },
          });

          // 3. Create second segment
          await tx.segment.create({
            data: {
              scriptId: segment.scriptId,
              index: segment.index + 1,
              text: text2 || "...",
              startTime: midTime,
              endTime: segment.endTime,
              assetPath: segment.assetPath,
              assetType: segment.assetType,
              imagePrompt: segment.imagePrompt,
              mediaSettings: segment.mediaSettings,
              transitionType: segment.transitionType,
              stickers: segment.stickers,
              personaId: segment.personaId,
              personaAvatarUrl: segment.personaAvatarUrl,
              voiceParams: segment.voiceParams,
            },
          });
        });

        return NextResponse.json({ success: true, action: "split-segment" });
      }

      case "merge-segments": {
        const { firstSegmentId, secondSegmentId } = body;
        if (!firstSegmentId) {
          return NextResponse.json({ error: "Missing firstSegmentId" }, { status: 400 });
        }

        const firstSeg = await prisma.segment.findUnique({
          where: { id: firstSegmentId },
        });

        if (!firstSeg) {
          return NextResponse.json({ error: "First segment not found" }, { status: 404 });
        }

        // Find second segment (explicit ID or index + 1)
        const secondSeg = secondSegmentId
          ? await prisma.segment.findUnique({ where: { id: secondSegmentId } })
          : await prisma.segment.findFirst({
              where: {
                scriptId: firstSeg.scriptId,
                index: firstSeg.index + 1,
              },
            });

        if (!secondSeg) {
          return NextResponse.json({ error: "Second segment not found to merge" }, { status: 404 });
        }

        const mergedText = `${firstSeg.text.trim()} ${secondSeg.text.trim()}`;
        const newEndTime = secondSeg.endTime;

        await prisma.$transaction(async (tx) => {
          // 1. Update first segment
          await tx.segment.update({
            where: { id: firstSeg.id },
            data: {
              text: mergedText,
              endTime: newEndTime,
            },
          });

          // 2. Delete second segment
          await tx.segment.delete({
            where: { id: secondSeg.id },
          });

          // 3. Shift following segments' indices down
          // ⚡ Bolt Optimization: Replace N+1 queries with single updateMany
          await tx.segment.updateMany({
            where: {
              scriptId: firstSeg.scriptId,
              index: { gt: secondSeg.index },
            },
            data: { index: { decrement: 1 } },
          });
        });

        return NextResponse.json({ success: true, action: "merge-segments" });
      }

      case "recast-persona": {
        const { personaId, personaAvatarUrl, voiceId } = body;
        if (!personaId) {
          return NextResponse.json({ error: "Missing personaId" }, { status: 400 });
        }

        const script = await prisma.script.findFirst({
          where: { storyId },
          select: { id: true },
        });

        if (script) {
          const updateData: Record<string, unknown> = { personaId };
          if (personaAvatarUrl) updateData.personaAvatarUrl = personaAvatarUrl;
          if (voiceId) updateData.voiceParams = JSON.stringify({ voiceId });

          await prisma.segment.updateMany({
            where: { scriptId: script.id },
            data: updateData,
          });

          // Automatically re-plan FSM sequence for the new persona across all segments
          const allSegments = await prisma.segment.findMany({
            where: { scriptId: script.id },
            orderBy: { index: "asc" },
          });

          const plannedBeats = planNewsBroadcastFsmSequence(allSegments, personaId);

          // ⚡ Bolt Optimization: Replaced N+1 sequential await prisma.segment.update
          // with a single Promise.all containing all updates
          const updateOps = allSegments.map((seg, i) => {
            const beat = plannedBeats[i] || plannedBeats.find((b) => b.index === seg.index);
            let ms: Record<string, unknown> = {};
            try {
              if (seg.mediaSettings) ms = JSON.parse(seg.mediaSettings);
            } catch {}

            ms.actionLoop = beat?.clipId || "M1_loop_v1";
            ms.cameraCue = beat?.cameraCue || "cam1_wide";
            ms.startPose = beat?.startPose || "M1";
            ms.endPose = beat?.endPose || "M1";
            ms.actionStateLabel = beat?.actionStateLabel || "Anchor Stance";
            ms.videoUrl = beat?.videoUrl;
            ms.presenterVideoPath = beat?.videoUrl;
            ms.sceneStrategy = "chroma_broll";

            return prisma.segment.update({
              where: { id: seg.id },
              data: {
                mediaSettings: JSON.stringify(ms),
                presenterVideoPath: beat?.videoUrl,
                sceneStrategy: "chroma_broll",
              },
            });
          });

          await prisma.$transaction(updateOps);
        }

        return NextResponse.json({ success: true, action: "recast-persona" });
      }

      case "fact-check-segment": {
        const { segmentText } = body;
        const articleText = (story as unknown as { fullContent?: string | null }).fullContent || story.description || story.title;
        const sourceName = story.feed?.name || "Verified News Feed";
        const citation = await verifySegmentFact(segmentText || "", articleText, sourceName);
        return NextResponse.json({ success: true, citation });
      }

      case "generate-hooks": {
        const headline = story.script?.headline || story.title;
        const cleanHeadline = headline.replace(/[:.-].*$/, "").trim();
        const hooks = [
          { id: "curiosity", label: "🔥 Curiosity Gap", text: `You won't believe what was just confirmed regarding ${cleanHeadline}—and why it matters right now.` },
          { id: "question", label: "❓ Direct Question", text: `Did you catch the massive breaking update on ${cleanHeadline}? Here is what you need to know.` },
          { id: "urgent", label: "🚨 Urgent Alert", text: `[urgent] [sfx:stinger] Breaking news: A major development has just been announced concerning ${cleanHeadline}.` },
          { id: "stat", label: "📊 Data / Stat Impact", text: `New numbers are officially in, and the true impact of ${cleanHeadline} is turning heads across the industry.` },
          { id: "narrative", label: "📖 Story Hook", text: `Just hours ago, a critical story broke that could fundamentally reshape ${cleanHeadline}.` },
        ];
        return NextResponse.json({ success: true, hooks });
      }

      case "update-segment": {
        const {
          segmentId, text, spokenText, assetPath, assetType, mediaSettings,
          transitionType, stickers, backgroundPrompt, personaId,
          voiceParams, personaAvatarUrl, presenterVideoPath,
          presenterStatus, startTime, endTime, audioPath,
          presetChoice, personaImagePrompt, presenterVideoPrompt
        } = body;

        if (!segmentId) {
          return NextResponse.json(
            { error: "Missing segmentId" },
            { status: 400 }
          );
        }

        const existingSegment = await prisma.segment.findUnique({
          where: { id: segmentId },
        });

        if (!existingSegment) {
          return NextResponse.json({ error: "Segment not found" }, { status: 404 });
        }

        const data: Record<string, unknown> = {};
        if (text !== undefined) data.text = text;
        if (spokenText !== undefined) data.spokenText = spokenText;
        if (assetPath !== undefined) data.assetPath = assetPath;
        if (assetType !== undefined) data.assetType = assetType;
        if (mediaSettings !== undefined) data.mediaSettings = mediaSettings;
        if (transitionType !== undefined) data.transitionType = transitionType;
        if (stickers !== undefined) data.stickers = typeof stickers === 'string' ? stickers : JSON.stringify(stickers);
        if (backgroundPrompt !== undefined) data.backgroundPrompt = backgroundPrompt;
        if (voiceParams !== undefined) data.voiceParams = voiceParams;
        if (personaAvatarUrl !== undefined) data.personaAvatarUrl = personaAvatarUrl;
        if (presenterStatus !== undefined) data.presenterStatus = presenterStatus;
        if (startTime !== undefined) data.startTime = startTime;
        if (endTime !== undefined) data.endTime = endTime;
        if (presetChoice !== undefined) data.presetChoice = presetChoice;
        if (personaImagePrompt !== undefined) data.personaImagePrompt = personaImagePrompt;
        if (presenterVideoPrompt !== undefined) data.presenterVideoPrompt = presenterVideoPrompt;

        // --- Media History Logic ---
        let history = existingSegment.mediaHistory ? JSON.parse(existingSegment.mediaHistory) : [];
        const now = Date.now();

        // 1. Lazily filter out expired entries (will be fully deleted in a separate cleanup cron)
        history = history.filter((h: { expiresAt?: number }) => Boolean(h.expiresAt && h.expiresAt > now));

        if (text !== undefined && text !== existingSegment.text) {
          // If text changed, the old media is obsolete for ANY persona.
          data.audioPath = null;
          data.presenterVideoPath = null;
          // Do not push to history.
        } else if (personaId !== undefined && personaId !== existingSegment.personaId) {
          // If persona changed without text change, save current to history (if it has media)
          data.personaId = personaId;
          
          if (existingSegment.audioPath || existingSegment.presenterVideoPath) {
            history.push({
              personaId: existingSegment.personaId,
              audioPath: existingSegment.audioPath,
              presenterVideoPath: existingSegment.presenterVideoPath,
              expiresAt: now + 48 * 60 * 60 * 1000 // 48 hours TTL
            });
          }

          // Check if new persona exists in history
          const cachedIndex = history.findIndex((h: { personaId?: string | null }) => h.personaId === personaId);
          if (cachedIndex !== -1) {
            // Restore from cache and remove from history (making it active resets TTL)
            const cached = history.splice(cachedIndex, 1)[0];
            data.audioPath = cached.audioPath || null;
            data.presenterVideoPath = cached.presenterVideoPath || null;
          } else {
            // No cache, force regeneration
            data.audioPath = null;
            data.presenterVideoPath = null;
          }
        } else {
          // Normal updates
          if (audioPath !== undefined) data.audioPath = audioPath;
          if (presenterVideoPath !== undefined) data.presenterVideoPath = presenterVideoPath;
          if (personaId !== undefined) data.personaId = personaId;
        }

        data.mediaHistory = JSON.stringify(history);

        await prisma.segment.update({
          where: { id: segmentId },
          data,
        });

        return NextResponse.json({
          success: true,
          action: "update-segment",
          restoredAudioPath: data.audioPath,
          restoredPresenterVideoPath: data.presenterVideoPath
        });
      }

      case "normalize-spoken-text": {
        const { text, segmentId, engine, language } = body;
        if (!text || typeof text !== "string") {
          return NextResponse.json({ error: "Missing or invalid text to normalize" }, { status: 400 });
        }

        const targetEngine = engine;
        let targetLanguage = language || "es";

        // If segmentId is provided and no engine/language specified, look up persona
        if (segmentId && (!targetEngine || !language)) {
          const seg = await prisma.segment.findUnique({ where: { id: segmentId } });
          if (seg?.personaId) {
            const persona = await prisma.persona.findUnique({ where: { slug: seg.personaId } });
            if (persona?.language) targetLanguage = persona.language;
          }
        }

        const normalizedSpokenText = await normalizeTextForAudio(text, {
          engine: targetEngine || process.env.DEFAULT_TTS_ENGINE || "omni",
          language: targetLanguage,
          companyId: orgId,
        });

        // If segmentId is provided, persist it directly to DB
        if (segmentId) {
          await prisma.segment.update({
            where: { id: segmentId },
            data: { spokenText: normalizedSpokenText },
          });
        }

        return NextResponse.json({
          success: true,
          action: "normalize-spoken-text",
          spokenText: normalizedSpokenText,
        });
      }

      case "reorder-segments": {
        const segmentsToUpdate = body.segments as Array<{ id: string, index: number, startTime: number, endTime: number }>;

        if (!segmentsToUpdate || !Array.isArray(segmentsToUpdate)) {
          return NextResponse.json({ error: "Invalid segments data" }, { status: 400 });
        }

        // Use a transaction for multiple updates
        await prisma.$transaction(
          segmentsToUpdate.map(s => prisma.segment.update({
            where: { id: s.id },
            data: { index: s.index, startTime: s.startTime, endTime: s.endTime }
          }))
        );

        return NextResponse.json({ success: true, action: "reorder-segments" });
      }

      case "batch-update-segments": {
        interface BatchSegmentUpdate {
          id?: string;
          segmentId?: string;
          text?: string;
          personaId?: string;
          mediaSettings?: string;
          actionLoop?: unknown;
          cameraCue?: unknown;
        }
        const segmentsToUpdate = body.segments as BatchSegmentUpdate[];

        if (!segmentsToUpdate || !Array.isArray(segmentsToUpdate)) {
          return NextResponse.json({ error: "Invalid segments data" }, { status: 400 });
        }

        // Using a transaction to process all segment updates atomically and efficiently
        await prisma.$transaction(
          segmentsToUpdate.map(s => {
            const data: {
              text?: string;
              personaId?: string;
              mediaSettings?: string;
              audioPath?: null;
              presenterVideoPath?: null;
            } = {};
            if (s.text !== undefined) data.text = s.text;
            if (s.personaId !== undefined) data.personaId = s.personaId;
            if (s.mediaSettings !== undefined) data.mediaSettings = s.mediaSettings;
            if (s.actionLoop !== undefined) {
              const ms = s.mediaSettings ? JSON.parse(s.mediaSettings) : {};
              ms.actionLoop = s.actionLoop;
              data.mediaSettings = JSON.stringify(ms);
            }
            if (s.cameraCue !== undefined) {
              const ms = data.mediaSettings ? JSON.parse(data.mediaSettings) : (s.mediaSettings ? JSON.parse(s.mediaSettings) : {});
              ms.cameraCue = s.cameraCue;
              data.mediaSettings = JSON.stringify(ms);
            }

            // Important: Handle media invalidation logic identical to single update-segment
            if (s.text !== undefined) {
              // Note: We don't have the existingSegment here easily to check if text *changed*,
              // but in the contexts this is used (batch editing text), we assume text changed
              // if it's included in the payload from the client.
              // To be perfectly robust without an N+1 read, if text is provided we invalidate.
              data.audioPath = null;
              data.presenterVideoPath = null;
            } else if (s.personaId !== undefined) {
              data.audioPath = null;
              data.presenterVideoPath = null;
            }

            return prisma.segment.update({
              where: { id: s.segmentId || s.id },
              data
            });
          })
        );

        return NextResponse.json({ success: true, action: "batch-update-segments" });
      }

      case "update-video": {
        const {
          aspectRatio, bgMusicPath, bgMusicVolume,
          globalBgVideoPath, sloganId, outroId,
          voiceId, captionStyle,
          youtubeTitle, youtubeDescription, instagramCaption, instagramHashtags,
          headline
        } = body;

        const data: Record<string, unknown> = {};
        if (aspectRatio !== undefined) data.aspectRatio = aspectRatio;
        if (bgMusicPath !== undefined) data.bgMusicPath = bgMusicPath;
        if (bgMusicVolume !== undefined) data.bgMusicVolume = bgMusicVolume;
        if (globalBgVideoPath !== undefined) data.globalBgVideoPath = globalBgVideoPath;
        if (sloganId !== undefined) data.sloganId = sloganId;
        if (outroId !== undefined) data.outroId = outroId;
        if (voiceId !== undefined) data.personaId = voiceId; // legacy voiceId from body maps to personaId
        if (captionStyle !== undefined) data.captionStyle = captionStyle;
        if (youtubeTitle !== undefined) data.youtubeTitle = youtubeTitle;
        if (youtubeDescription !== undefined) data.youtubeDescription = youtubeDescription;
        if (instagramCaption !== undefined) data.instagramCaption = instagramCaption;
        if (instagramHashtags !== undefined) data.instagramHashtags = instagramHashtags;

        await prisma.video.update({
          where: { storyId },
          data,
        });

        if (headline !== undefined) {
          await prisma.script.updateMany({
            where: { storyId },
            data: { headline },
          });
        }

        return NextResponse.json({
          success: true,
          action: "update-video",
        });
      }

      case "polish-script": {
        const text = body.text as string;
        const mode = (body.mode || body.style || "cadence") as string;
        const segmentId = body.segmentId as string | undefined;

        if (mode === "all_segments") {
          // Polish all segments in the story for natural breathing cadence & TTS rhythm
          const segments = await prisma.segment.findMany({
            where: { script: { storyId } },
            orderBy: { index: "asc" },
          });

          // ⚡ Bolt Optimization: Batch heterogeneous updates into a single transaction
          const polishedData = segments.map((seg) => {
            let polished = seg.text;
            // 1. Insert natural breathing cadence pauses
            polished = polished
              .replace(/,\s*/g, "... ")
              .replace(/;\s*/g, " — ")
              .replace(/\.\s+/g, ". ... ");
            // 2. Normalize acronyms
            polished = expandAcronyms(polished, "es");
            // 3. Clean up excess punctuation
            polished = polished.replace(/\.{4,}/g, "...").trim();
            return { id: seg.id, polished };
          });

          const updatePromises = polishedData.map(({ id, polished }) =>
            prisma.segment.update({
              where: { id },
              data: { text: polished },
            })
          );
          const updatedSegments = await prisma.$transaction(updatePromises);

          return NextResponse.json({
            success: true,
            action: "polish-script",
            mode: "all_segments",
            segments: updatedSegments,
          });
        }

        if (!text) {
          return NextResponse.json({ error: "No text provided" }, { status: 400 });
        }

        let polished = text;

        if (mode === "cadence") {
          polished = text
            .replace(/,\s*/g, "... ")
            .replace(/;\s*/g, " — ")
            .replace(/\.\s+/g, ". ... ")
            .replace(/\.{4,}/g, "...")
            .trim();
        } else if (mode === "phonetics") {
          polished = expandAcronyms(text, "es");
        } else if (mode === "emotion") {
          const emotions = ["[confident]", "[urgent]", "[curious]", "[excited]"];
          const chosen = emotions[Math.floor(Math.random() * emotions.length)];
          polished = `${chosen} ${text.replace(/^\[[a-zA-Z_]+\]\s*/, "")}`;
        } else {
          // Fallback to Ollama
          polished = await polishTextWithOllama(text, (mode === "short" || mode === "tiktok" ? mode : "punchy") as "punchy" | "short" | "tiktok");
        }

        if (segmentId) {
          await prisma.segment.update({
            where: { id: segmentId },
            data: { text: polished },
          });
        }

        return NextResponse.json({
          success: true,
          action: "polish-script",
          mode,
          polished,
        });
      }

      case "batch-export-all-formats": {
        const existingVideo = await prisma.video.findUnique({
          where: { storyId },
        });

        const formats: ("vertical" | "horizontal" | "square")[] = ["vertical", "horizontal", "square"];
        const queuedFormats = await Promise.all(
          formats.map(async (fmt) => {
            const compositionId =
              fmt === "horizontal"
                ? "RubyNews-Horizontal"
                : fmt === "square"
                ? "RubyNews-Square"
                : "RubyNews-Vertical";

            const job = await prisma.generationJob.create({
              data: {
                companyId: orgId,
                storyId,
                type: "render",
                status: "QUEUED",
                totalSteps: 4,
                config: JSON.stringify({
                  videoId: existingVideo?.id,
                  aspectRatio: fmt,
                  compositionId,
                }),
              },
            });
            void broadcastWorkerWake("job_queued");
            return { format: fmt, queued: true, jobId: job.id };
          })
        );

        return NextResponse.json({
          success: true,
          action: "batch-export-all-formats",
          formats: queuedFormats,
        });
      }

      case "translate-story": {
        const targetLang = (body.targetLang || "es_ar") as TargetLanguage;
        const segments = await prisma.segment.findMany({
          where: { script: { storyId } },
          orderBy: { index: "asc" },
        });

        // ⚡ Bolt Optimization: Separate network I/O from database transactions to prevent connection exhaustion
        const translations = await Promise.all(
          segments.map(async (seg) => {
            const trans = await translateNewsScript(seg.text, targetLang);
            return { id: seg.id, text: trans.translatedText };
          })
        );

        const updatePromises = translations.map(({ id, text }) =>
          prisma.segment.update({
            where: { id },
            data: { text },
          })
        );
        const translatedSegments = await prisma.$transaction(updatePromises);

        return NextResponse.json({
          success: true,
          action: "translate-story",
          targetLang,
          segments: translatedSegments,
        });
      }

      case "auto-match-broll": {
        const { segmentIndex, query, mediaType = "video" } = body;
        const segment = await prisma.segment.findFirst({
          where: { script: { storyId }, index: segmentIndex },
        });
        if (!segment) {
          return NextResponse.json({ error: "Segment not found" }, { status: 404 });
        }

        const searchQuery = query || segment.keyword || segment.text.slice(0, 30);
        const results = await searchStock(searchQuery, {
          type: mediaType === "video" ? "video" : "photo",
          perPage: 5,
        });

        if (results.length > 0) {
          const topAsset = results[0];
          const updated = await prisma.segment.update({
            where: { id: segment.id },
            data: {
              assetPath: topAsset.url,
              assetType: topAsset.type,
            },
          });
          return NextResponse.json({ success: true, segment: updated, asset: topAsset });
        }

        return NextResponse.json({ success: false, message: "No stock assets found" });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error(`[API] Action "${action}" failed for story ${storyId}:`, error);
    try {
      await prisma.notification.create({
        data: {
                          companyId: orgId,
          type: "system_alert",
          title: `Action Failed: ${action}`,
          message: `Action "${action}" failed for story ${storyId}: ${error instanceof Error ? error.message : "Unknown error"}`
        }
      });
    } catch {
      // Ignore notification creation errors
    }
    return NextResponse.json(
      {
        error: `Action "${action}" failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/stories/[storyId] — Delete a story and its relations.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  const { storyId } = await params;

  try {
    const existing = await prisma.story.findFirst({ where: { id: storyId, companyId: orgId }, select: { id: true } });
    if (!existing) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    // Clean up physical/cloud storage assets before removing DB records
    await deleteStoryStorageAssets(storyId).catch((err) => {
      console.warn(`[API] Storage cleanup warning for story ${storyId}:`, err);
    });

    // Prisma cascading delete will handle script, segments, video if configured
    await prisma.story.delete({
      where: { id: storyId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`[API] Failed to delete story ${storyId}:`, error);
    return NextResponse.json(
      { error: "Failed to delete story" },
      { status: 500 }
    );
  }
}
