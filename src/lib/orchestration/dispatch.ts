import type { Persona } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { storage, withTenant } from "@/lib/storage";
import { createLogger } from "@/lib/logger";
import { generateScript } from "@/lib/llm/client";
import { generateLlmObject } from "@/lib/llm/aiSdkGateway";
import { SCRIPT_GENERATION_RULES } from "@/lib/llm/prompts";
import { scrapeArticle } from "@/lib/scraper/articleScraper";
import { generateOrFallbackMusic } from "@/lib/music";
import {
  downloadExternalAssetToStorage,
  downloadToStorage,
  searchStock,
} from "@/lib/stock";
import { ingestFeeds } from "@/lib/rss/parser";
import { startJobProgress, updateJobProgress, finishJobProgress } from "@/lib/notifications";
import { planNewsBroadcastFsmSequence } from "@/lib/video/loopSelector";
import { getNextRunEstimate } from "@/lib/types/scheduler";
import { StoryStatus } from "@/lib/types";
import { DEFAULT_ORG_ID } from "@/lib/tenant";
import { uploadVideoToYoutube, setYoutubeThumbnail } from "@/lib/social/youtube";
import { uploadVideoToTikTok } from "@/lib/social/tiktok";
import { uploadVideoToInstagramReels } from "@/lib/social/instagram";
import { sendOperationalAlert } from "@/lib/alerting/notifier";
import { broadcastWorkerWake } from "@/lib/worker-broker";

const log = createLogger({ module: "orchestration:dispatch" });

export async function dispatchIngest(params: {
  feedIds?: string[];
  companyId?: string;
}) {
  return ingestFeeds(params.feedIds, params.companyId);
}

export async function dispatchFetchStockAssets(params: {
  scriptId: string;
  storyId: string;
  companyId?: string;
}) {
  const { scriptId, storyId } = params;
  const script = await prisma.script.findUnique({
    where: { id: scriptId },
    include: {
      segments: { orderBy: { index: "asc" } },
      story: true,
    },
  });

  if (!script) {
    throw new Error(`Script ${scriptId} not found`);
  }

  const companyId = params.companyId || script.story.companyId;
  const progressId = await startJobProgress(
    `B-Roll: ${script.story?.title?.substring(0, 30) || storyId}...`,
    "Evaluating auto-broll missing segments...",
    script.segments.length,
    companyId
  );

  // Download crawled external images into storage to bypass CORS
  const externalImageSegments = script.segments.filter(
    (seg) => seg.assetPath && seg.assetPath.startsWith("http")
  );
  if (externalImageSegments.length > 0) {
    await Promise.all(
      externalImageSegments.map(async (seg) => {
        try {
          const ext = seg.assetPath!.includes(".png") ? "png" : "jpg";
          const storageKey = withTenant(
            companyId,
            `broll/story-${storyId}/seg-${seg.index}.${ext}`
          );
          await downloadExternalAssetToStorage(seg.assetPath!, storageKey);
          await prisma.segment.update({
            where: { id: seg.id },
            data: { assetPath: storageKey },
          });
        } catch (err) {
          log.warn(
            { storyId, sceneIndex: seg.index + 1, err },
            "Failed to download external crawled asset"
          );
          await prisma.segment.update({
            where: { id: seg.id },
            data: { assetPath: null },
          });
        }
      })
    );
  }

  const updatedSegments = await prisma.segment.findMany({
    where: { scriptId },
    orderBy: { index: "asc" },
  });

  const segmentsNeedingAssets = updatedSegments.filter(
    (seg) => !seg.assetPath && (seg.keyword || seg.imagePrompt)
  );

  if (segmentsNeedingAssets.length === 0) {
    await finishJobProgress(progressId, "All segments already have assets assigned.", true);
    return { status: "no_assets_needed", count: 0 };
  }

  let completed = 0;
  const parsedRawJson = (() => {
    try {
      return JSON.parse(script.rawJson) as {
        segments?: Array<{ index: number; backup_keywords?: string[] }>;
      };
    } catch {
      return null;
    }
  })();

  const results = await Promise.all(
    segmentsNeedingAssets.map(async (seg) => {
      try {
        await updateJobProgress(
          progressId,
          ++completed,
          `Processing segment ${seg.index + 1}... searching Pexels/Pixabay for '${seg.keyword || "B-roll"}'`
        );
        const scriptSeg = parsedRawJson?.segments?.find((s) => s.index === seg.index);
        const backupKeywords = scriptSeg?.backup_keywords ?? [];
        const searchQueries = [
          seg.keyword || seg.imagePrompt || "news background",
          ...backupKeywords,
        ].filter(Boolean) as string[];

        const minDuration = Math.ceil(seg.endTime - seg.startTime);
        let storageKey: string | null = null;
        let usedProvider = "";
        let usedQueryFinal = "";

        for (const query of searchQueries) {
          try {
            const stockResults = await searchStock(query, {
              type: "video",
              minDuration,
              perPage: 3,
              orientation: "portrait",
            });
            if (stockResults && stockResults.length > 0) {
              for (const match of stockResults) {
                try {
                  storageKey = await downloadToStorage(
                    match,
                    companyId,
                    `broll/story-${storyId}/seg-${seg.index}`
                  );
                  usedProvider = match.provider;
                  usedQueryFinal = query;
                  break;
                } catch (downloadErr) {
                  log.warn(
                    { provider: match.provider, err: downloadErr },
                    "Failed to download stock asset, trying next"
                  );
                }
              }
              if (storageKey) break;
            }
          } catch (searchErr) {
            log.error({ query, err: searchErr }, "Stock search failed for query");
          }
        }

        if (!storageKey) {
          return {
            index: seg.index,
            success: false,
            reason: `Failed to find/download assets for: ${searchQueries.join(" / ")}`,
          };
        }

        await prisma.segment.update({
          where: { id: seg.id },
          data: {
            assetPath: storageKey,
            assetType: "video",
            stockAssetSource: usedProvider,
            stockAssetQuery: usedQueryFinal,
          },
        });

        return { index: seg.index, success: true, provider: usedProvider };
      } catch (error) {
        return {
          index: seg.index,
          success: false,
          reason: error instanceof Error ? error.message : String(error),
        };
      }
    })
  );

  const successCount = results.filter((r) => r.success).length;
  await finishJobProgress(
    progressId,
    `Successfully downloaded and assigned ${successCount} new assets.`,
    true
  );

  return {
    status: "completed",
    count: segmentsNeedingAssets.length,
    successCount,
    details: results,
  };
}

async function queueAudioJobAndWake(params: {
  companyId: string;
  storyId: string;
  totalSteps: number;
  personaId?: string | null;
}) {
  await prisma.generationJob.create({
    data: {
      companyId: params.companyId,
      storyId: params.storyId,
      type: "audio",
      status: "QUEUED",
      totalSteps: params.totalSteps,
      config: JSON.stringify({
        personaId: params.personaId || null,
        voiceId: params.personaId || null,
      }),
    },
  });
  void broadcastWorkerWake("job_queued");
}

export async function dispatchGenerateScript(params: {
  storyId: string;
  companyId?: string;
}) {
  const { storyId } = params;
  const story = await prisma.story.update({
    where: { id: storyId },
    data: { status: StoryStatus.SCRIPTING },
    include: { feed: true },
  });
  const companyId = params.companyId || story.companyId;
  const progressId = await startJobProgress(
    "Script Generation",
    `Starting workflow for ${story.title.substring(0, 30)}...`,
    5,
    companyId,
    storyId
  );

  try {
    await updateJobProgress(progressId, 1, "Scraping full article content...");
    const scrapeResult = await scrapeArticle(story.link, story.description ?? undefined);
    if (scrapeResult.article?.content) {
      await prisma.story.update({
        where: { id: storyId },
        data: {
          fullContent: scrapeResult.article.content,
          articleImageUrls:
            scrapeResult.article?.images && scrapeResult.article.images.length > 0
              ? JSON.stringify(scrapeResult.article.images)
              : null,
        },
      });
    }

    await updateJobProgress(progressId, 2, "Generating AI script and segments...");
    const articleContent = scrapeResult.article?.content ?? story.description ?? story.title;

    const feedWithGroups = await prisma.rssFeed.findUnique({
      where: { id: story.feedId },
      include: { groups: true },
    });
    const groupIds = feedWithGroups?.groups.map((g) => g.id) || [];

    let targetPersonas: Persona[] = [];
    let brands: Array<{
      preferredMusicMood: string | null;
      personas: Persona[];
      toneOfVoice: string | null;
    }> = [];

    if (groupIds.length > 0) {
      brands = await prisma.brand.findMany({
        where: { rssGroups: { some: { id: { in: groupIds } } } },
        include: { personas: true },
      });

      const personaMap = new Map<string, Persona>();
      brands.forEach((b) => {
        b.personas.forEach((p) => {
          if (p.isActive) personaMap.set(p.id, p);
        });
      });
      targetPersonas = Array.from(personaMap.values());
    }

    if (targetPersonas.length === 0) {
      targetPersonas = await prisma.persona.findMany({ where: { isActive: true } });
    }

    const personasList = targetPersonas
      .map(
        (p) =>
          `PERSONA ID: "${p.slug}"\nName: ${p.name}\nRole: ${p.role}\nPersonality Instructions: ${p.systemPrompt || p.description}\n---`
      )
      .join("\n");

    const primaryBrand = brands.length > 0 ? brands[0] : null;
    const toneOfVoiceInstruction = primaryBrand?.toneOfVoice
      ? `\n\nCRITICAL BRAND TONE OF VOICE:\nThe overarching brand tone is: "${primaryBrand.toneOfVoice}".\nWhile each persona has their own unique delivery style (which takes precedence), the overall script and news angles should align with this brand tone.`
      : "";

    const ttsInstruction = `\n\nTTS EMOTION TAGS:\nIf applicable to the tone, you may use emotion tags like [laugh], [sigh], or [angry] within the script text to instruct the Modern-TTS engine.`;
    const systemInstruction = `You are a master news scriptwriter. Your job is to write an engaging script utilizing a specific portfolio of presenting personas.\n\n${SCRIPT_GENERATION_RULES}${toneOfVoiceInstruction}${ttsInstruction}

CRITICAL PERSONA ASSIGNMENT ROLE:
Evaluate which of the following active personas is the absolute best match to host/deliver each individual segment. For each segment, you MUST provide the field 'suggested_persona_id' containing their slug exactly as listed.
CRITICALLY IMPORTANT: When writing the 'text' for that segment, you MUST adopt that persona's exact personality, tone, and delivery style as defined in their Personality Instructions.

AVAILABLE PORTFOLIO OF ACTIVE PERSONAS (BRAND SPECIFIC):
${personasList}

Match the tone and topic of each segment to the persona's role and style. If no specific persona matches, fallback to "ruby".`;

    const scriptOutput = await generateScript(
      {
        title: story.title,
        content: articleContent,
        author: story.author ?? undefined,
        source: story.feed.name,
        images: scrapeResult.article?.images,
      },
      {
        systemInstruction,
        companyId,
        engine: "omni",
      }
    );

    await updateJobProgress(progressId, 3, "Saving generated script to database...");
    await prisma.script.deleteMany({ where: { storyId } });
    const scrapedImages =
      scrapeResult.article?.images && scrapeResult.article.images.length > 0
        ? scrapeResult.article.images
        : [];
    const primaryPersona = scriptOutput.segments[0]?.suggested_persona_id || "ruby";
    const plannedFsmBeats = planNewsBroadcastFsmSequence(scriptOutput.segments, primaryPersona);

    const savedScript = await prisma.script.create({
      data: {
        storyId,
        rawJson: JSON.stringify(scriptOutput),
        headline: scriptOutput.headline,
        segments: {
          create: scriptOutput.segments.map((seg, idx) => {
            let assetPath: string | null = null;
            let assetType = "placeholder";

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
              } else if (
                seg.source_media_url &&
                !scrapedImages.includes(seg.source_media_url)
              ) {
                assetPath = seg.source_media_url;
                assetType = "image";
              }
            }

            const beat =
              plannedFsmBeats[idx] || plannedFsmBeats.find((b) => b.index === seg.index);
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

            const effectiveSegPersona = seg.suggested_persona_id || primaryPersona;

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
              suggestedPersonaId: effectiveSegPersona,
              personaId: effectiveSegPersona,
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

    await updateJobProgress(progressId, 4, "Finalizing pipeline and creating video metadata...");
    const requireApproval = story.feed.requireApproval !== false;
    const videoRecord = await prisma.video.upsert({
      where: { storyId },
      create: {
        companyId,
        storyId,
        status: requireApproval ? "PENDING" : "AWAITING_VOICE",
        youtubeTitle: scriptOutput.youtube_title,
        youtubeDescription: scriptOutput.youtube_description,
        youtubeTags: scriptOutput.youtube_tags
          ? JSON.stringify(scriptOutput.youtube_tags)
          : null,
        instagramCaption: scriptOutput.instagram_caption,
        instagramHashtags: scriptOutput.instagram_hashtags
          ? JSON.stringify(scriptOutput.instagram_hashtags)
          : null,
      },
      update: {
        status: requireApproval ? "PENDING" : "AWAITING_VOICE",
        youtubeTitle: scriptOutput.youtube_title,
        youtubeDescription: scriptOutput.youtube_description,
        youtubeTags: scriptOutput.youtube_tags
          ? JSON.stringify(scriptOutput.youtube_tags)
          : null,
        instagramCaption: scriptOutput.instagram_caption,
        instagramHashtags: scriptOutput.instagram_hashtags
          ? JSON.stringify(scriptOutput.instagram_hashtags)
          : null,
      },
    });

    await prisma.story.update({
      where: { id: storyId },
      data: {
        status: requireApproval ? StoryStatus.SCRIPTED : "IN_PRODUCTION",
        approvalStatus: requireApproval ? "pending_review" : "auto_approved",
      },
    });

    if (requireApproval) {
      await prisma.notification.create({
        data: {
          companyId,
          type: "system_alert",
          title: "Script Awaiting Approval",
          message: `The script for the story "${story.title}" requires human review before passing to production.`,
          data: JSON.stringify({ storyId }),
        },
      });
    } else {
      await queueAudioJobAndWake({
        companyId,
        storyId,
        totalSteps: savedScript.segments.length,
        personaId: videoRecord.personaId,
      });
    }

    await finishJobProgress(
      progressId,
      `Script generation complete for "${story.title.substring(0, 30)}..."`,
      true
    );

    await dispatchFetchStockAssets({
      scriptId: savedScript.id,
      storyId,
      companyId,
    }).catch((err) => log.warn({ storyId, err }, "Stock asset fetch failed"));

    const mood = primaryBrand?.preferredMusicMood || scriptOutput.suggested_music_mood;
    const query = scriptOutput.suggested_music_query;
    if (mood || query) {
      try {
        const musicPrompt =
          query || (mood ? `${mood} broadcast news bed` : "broadcast news theme");
        const musicResult = await generateOrFallbackMusic(
          {
            prompt: musicPrompt,
            mood: mood || "serious",
            duration: 45,
            instrumental: true,
          },
          companyId
        );
        if (musicResult?.storageKey) {
          await prisma.video.update({
            where: { id: videoRecord.id },
            data: { bgMusicId: musicResult.id, bgMusicPath: musicResult.storageKey },
          });
        }
      } catch (musicErr) {
        log.warn({ storyId, err: musicErr }, "Auto music selection failed");
      }
    }

    return {
      storyId,
      scriptId: savedScript.id,
      headline: scriptOutput.headline,
      segmentCount: savedScript.segments.length,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await prisma.story
      .update({
        where: { id: storyId },
        data: { status: StoryStatus.FAILED, errorLog: errorMsg },
      })
      .catch(() => {});
    await prisma.notification
      .create({
        data: {
          companyId,
          type: "job_failed",
          title: `Script Generation Failed: ${story.title.substring(0, 50)}`,
          message: `AI Script generation failed: ${errorMsg}`,
          data: JSON.stringify({ storyId }),
        },
      })
      .catch(() => {});
    await finishJobProgress(progressId, `Script generation failed: ${errorMsg}`, false).catch(
      () => {}
    );
    throw err;
  }
}

export async function dispatchGenerateRoundup(params: {
  storyIds: string[];
  companyId?: string;
}) {
  const { storyIds } = params;
  const stories = await prisma.story.findMany({
    where: { id: { in: storyIds } },
    include: { feed: { include: { groups: true } }, video: true },
  });

  if (stories.length === 0) {
    throw new Error(`No stories found for IDs: ${storyIds.join(", ")}`);
  }

  const companyId = params.companyId || stories[0].companyId || DEFAULT_ORG_ID;
  const progressId = await startJobProgress(
    "Roundup Script Generation",
    `Preparing roundup for ${storyIds.length} stories...`,
    7,
    companyId
  );

  try {
    await updateJobProgress(progressId, 1, "Loading stories and brand context...");
    const groupIds = stories[0].feed.groups.map((g) => g.id);
    let brands: Array<{
      id: string;
      name: string;
      toneOfVoice: string | null;
      preferredMusicMood: string | null;
      personas: Persona[];
    }> = [];
    let targetPersonas: Persona[] = [];

    if (groupIds.length > 0) {
      brands = await prisma.brand.findMany({
        where: { rssGroups: { some: { id: { in: groupIds } } } },
        include: { personas: true },
      });
      const personaMap = new Map<string, Persona>();
      brands.forEach((b) => {
        b.personas.forEach((p) => {
          if (p.isActive) personaMap.set(p.id, p);
        });
      });
      targetPersonas = Array.from(personaMap.values());
    }
    if (targetPersonas.length === 0) {
      targetPersonas = await prisma.persona.findMany({ where: { isActive: true } });
    }

    await updateJobProgress(progressId, 2, `Scraping content for ${stories.length} articles...`);
    const parts: string[] = [];
    for (let i = 0; i < stories.length; i++) {
      const s = stories[i];
      if (s.video?.status === "COMPLETED" && s.video.outputPath) {
        parts.push(
          `--- STORY ${i + 1} of ${stories.length} [PRE-PRODUCED CLIP] ---\nStory ID: ${s.id}\nTitle: ${s.title}\nSource: ${s.feed.name}\n(Note: This story is already a completed video clip. DO NOT rewrite its full content. Write a 1-2 sentence transition introducing it.)\n`
        );
        continue;
      }
      let content = s.fullContent;
      if (!content && s.link.startsWith("http")) {
        const scrapeResult = await scrapeArticle(s.link);
        if (scrapeResult.article?.content) {
          content = scrapeResult.article.content;
          await prisma.story.update({
            where: { id: s.id },
            data: { fullContent: content },
          });
        }
      }
      if (!content) content = s.description || s.title;
      parts.push(
        `--- STORY ${i + 1} of ${stories.length} ---\nTitle: ${s.title}\nSource: ${s.feed.name}\nContent: ${content}\n`
      );
    }
    const combinedContent = parts.join("\n");

    await updateJobProgress(progressId, 3, "Generating cohesive roundup script with AI...");
    const primaryBrand = brands[0] || null;
    const personasList = targetPersonas
      .map(
        (p) =>
          `PERSONA ID: "${p.slug}"\nName: ${p.name}\nRole: ${p.role}\nPersonality Instructions: ${p.systemPrompt || p.description}\n---`
      )
      .join("\n");
    const toneInstruction = primaryBrand?.toneOfVoice
      ? `\n\nCRITICAL BRAND TONE OF VOICE:\nThe overarching brand tone is: "${primaryBrand.toneOfVoice}".`
      : "";

    const systemInstruction = `You are a master news scriptwriter synthesizing MULTIPLE stories into one cohesive broadcast roundup.\n\n${SCRIPT_GENERATION_RULES}${toneInstruction}\n\nAVAILABLE PORTFOLIO OF ACTIVE PERSONAS:\n${personasList}\n\nFallback to "ruby" if needed.`;

    const scriptOutput = await generateScript(
      {
        title: `Tech Roundup: ${stories.length} Key Stories`,
        content: combinedContent,
        source: "Multiple Sources",
      },
      { systemInstruction, companyId }
    );

    await updateJobProgress(progressId, 4, "Saving roundup script to database...");
    const roundupTitle =
      scriptOutput.headline || `Tech Roundup: ${stories.length} Key Stories`;
    const roundupDescription = stories.map((s) => s.title).join(" • ");
    const roundupId = `roundup-${Date.now()}`;

    const rStory = await prisma.story.create({
      data: {
        companyId,
        title: roundupTitle,
        description: roundupDescription,
        fullContent: combinedContent,
        link: `roundup://${roundupId}`,
        guid: roundupId,
        status: StoryStatus.SCRIPTED,
        feedId: stories[0].feedId,
        pubDate: new Date(),
      },
    });

    const savedScript = await prisma.script.create({
      data: {
        storyId: rStory.id,
        rawJson: JSON.stringify(scriptOutput),
        headline: scriptOutput.headline,
        segments: {
          create: scriptOutput.segments.map((seg) => {
            const prerenderedStory = seg.is_prerendered_clip
              ? stories.find((s) => s.id === seg.clip_id)
              : null;
            return {
              index: seg.index,
              startTime: seg.start_time,
              endTime: prerenderedStory
                ? seg.start_time + (prerenderedStory.video?.duration || 0)
                : seg.end_time,
              text: seg.is_prerendered_clip ? "" : seg.text,
              imagePrompt: seg.image_prompt,
              assetType: seg.is_prerendered_clip ? "prerendered_clip" : "placeholder",
              assetPath: prerenderedStory ? prerenderedStory.video?.outputPath ?? null : null,
              suggestedPersonaId: seg.suggested_persona_id || "ruby",
              personaId: seg.suggested_persona_id || "ruby",
              keyword: seg.keyword ?? null,
            };
          }),
        },
      },
      include: { segments: true },
    });

    const feed = await prisma.rssFeed.findUnique({ where: { id: stories[0].feedId } });
    const requireApproval = feed?.requireApproval !== false;

    const videoRecord = await prisma.video.create({
      data: {
        companyId,
        storyId: rStory.id,
        status: requireApproval ? "PENDING" : "AWAITING_VOICE",
        aspectRatio: "vertical",
        sloganId: "future-now",
        captionStyle: "beast",
        youtubeTitle: scriptOutput.youtube_title || roundupTitle,
        youtubeDescription: scriptOutput.youtube_description || roundupDescription,
        youtubeTags: scriptOutput.youtube_tags
          ? JSON.stringify(scriptOutput.youtube_tags)
          : null,
        instagramCaption: scriptOutput.instagram_caption,
        instagramHashtags: scriptOutput.instagram_hashtags
          ? JSON.stringify(scriptOutput.instagram_hashtags)
          : null,
      },
    });

    await prisma.story.update({
      where: { id: rStory.id },
      data: {
        status: requireApproval ? StoryStatus.SCRIPTED : "IN_PRODUCTION",
        approvalStatus: requireApproval ? "pending_review" : "auto_approved",
      },
    });

    if (!requireApproval) {
      await queueAudioJobAndWake({
        companyId,
        storyId: rStory.id,
        totalSteps: savedScript.segments.length,
        personaId: videoRecord.personaId,
      });
    }

    const storiesWithVideos = await prisma.story.findMany({
      where: { id: { in: storyIds }, video: { status: "COMPLETED" } },
      select: { id: true },
    });
    const idsWithVideos = storiesWithVideos.map((s) => s.id);
    const idsToMarkDraft = storyIds.filter((id) => !idsWithVideos.includes(id));
    if (idsToMarkDraft.length > 0) {
      await prisma.story.updateMany({
        where: { id: { in: idsToMarkDraft } },
        data: { status: "DRAFT" },
      });
    }

    await updateJobProgress(progressId, 5, "Fetching stock assets...");
    await dispatchFetchStockAssets({
      scriptId: savedScript.id,
      storyId: rStory.id,
      companyId,
    }).catch((err) => log.warn({ storyId: rStory.id, err }, "Roundup stock fetch failed"));

    await updateJobProgress(progressId, 6, "Selecting background music...");
    const mood = primaryBrand?.preferredMusicMood || scriptOutput.suggested_music_mood;
    const query = scriptOutput.suggested_music_query;
    if (mood || query) {
      const musicPrompt =
        query || (mood ? `${mood} broadcast news roundup bed` : "broadcast news theme");
      const musicResult = await generateOrFallbackMusic(
        { prompt: musicPrompt, mood: mood || "serious", duration: 60, instrumental: true },
        companyId
      ).catch(() => null);
      if (musicResult?.storageKey) {
        await prisma.video.update({
          where: { id: videoRecord.id },
          data: { bgMusicId: musicResult.id, bgMusicPath: musicResult.storageKey },
        });
      }
    }

    await finishJobProgress(progressId, `Roundup script created: "${roundupTitle}"`, true);
    return { roundupStoryId: rStory.id, scriptId: savedScript.id };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await finishJobProgress(progressId, `Roundup generation failed: ${errorMsg}`, false).catch(
      () => {}
    );
    throw err;
  }
}

export async function dispatchPublishVideo(params: { publishId: string }) {
  const { publishId } = params;
  if (!publishId) {
    throw new Error("Missing required 'publishId'");
  }

  const publish = await prisma.videoPublish.findUnique({
    where: { id: publishId },
    include: {
      video: { include: { story: true } },
      channel: true,
    },
  });

  if (!publish) {
    throw new Error(`VideoPublish record not found: ${publishId}`);
  }

  if (publish.status === "PUBLISHED") {
    return { success: true, alreadyPublished: true, publishId };
  }

  const executePublish = async () => {
    try {
      await prisma.videoPublish.update({
        where: { id: publishId },
        data: { status: "PUBLISHING" },
      });

      const { video, channel } = publish;
      if (!video.outputPath) {
        throw new Error(`Video ${video.id} has no outputPath to download`);
      }

      const videoBuffer = await storage.download(video.outputPath);
      const title =
        publish.title ||
        video.youtubeTitle ||
        video.story?.title ||
        "Ruby NewsStudio Broadcast";
      const description =
        publish.description ||
        video.youtubeDescription ||
        video.story?.description ||
        "";
      const platform = channel.platform.toLowerCase();

      let platformVideoId = "";
      if (platform === "youtube") {
        platformVideoId = await uploadVideoToYoutube(
          channel.id,
          videoBuffer,
          title,
          description
        );
        if (video.thumbnailStorageKey) {
          try {
            const thumbBuffer = await storage.download(video.thumbnailStorageKey);
            await setYoutubeThumbnail(channel.id, platformVideoId, thumbBuffer, "image/jpeg");
          } catch (thumbErr) {
            log.warn({ err: thumbErr }, "Failed to set YouTube thumbnail");
          }
        }
      } else if (platform === "tiktok") {
        platformVideoId = await uploadVideoToTikTok(channel.id, videoBuffer, title);
      } else if (platform === "instagram") {
        const caption = description ? `${title}\n\n${description}` : title;
        platformVideoId = await uploadVideoToInstagramReels(
          channel.id,
          videoBuffer,
          caption
        );
      } else {
        throw new Error(`Unsupported social platform: ${channel.platform}`);
      }

      await prisma.videoPublish.update({
        where: { id: publishId },
        data: {
          status: "PUBLISHED",
          platformVideoId,
          publishedAt: new Date(),
        },
      });

      await prisma.video.update({
        where: { id: video.id },
        data: { publishStatus: "PUBLISHED" },
      });

      await prisma.notification.create({
        data: {
          companyId: video.companyId,
          type: "video_published",
          title: "Video Published",
          message: `"${title}" has been published to ${channel.platform.toUpperCase()} (${channel.name || channel.id}).`,
          data: JSON.stringify({
            publishId,
            videoId: video.id,
            channelId: channel.id,
            platformVideoId,
            platform: channel.platform,
          }),
        },
      });

      return {
        success: true,
        publishId,
        platformVideoId,
        platform: channel.platform,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      try {
        const pub = await prisma.videoPublish.update({
          where: { id: publishId },
          data: { status: "FAILED" },
          include: { video: true, channel: true },
        });
        await prisma.notification.create({
          data: {
            companyId: pub.video.companyId,
            type: "job_failed",
            title: "Social Publish Failed",
            message: `Failed to publish video to ${pub.channel.platform.toUpperCase()}: ${errorMsg}`,
            data: JSON.stringify({ publishId, error: errorMsg }),
          },
        });
        await sendOperationalAlert({
          title: `Social Publishing Failed: ${pub.channel.platform.toUpperCase()}`,
          message: `Failed publishing video ${pub.videoId} to ${pub.channel.name || pub.channelId}: ${errorMsg}`,
          severity: "error",
          eventType: "social_publish_failed",
          companyId: pub.video.companyId,
          metadata: {
            publishId,
            videoId: pub.videoId,
            channelId: pub.channelId,
            platform: pub.channel.platform,
            error: errorMsg,
          },
        });
      } catch (e) {
        log.error({ err: e }, "Failed during dispatchPublishVideo failure handler");
      }
      throw error;
    }
  };

  if (publish.scheduledFor) {
    const delayMs = new Date(publish.scheduledFor).getTime() - Date.now();
    if (delayMs > 0) {
      const timer = setTimeout(() => {
        void executePublish().catch((err) =>
          log.error({ publishId, err }, "Deferred publish failed")
        );
      }, Math.min(delayMs, 2_147_483_647));
      timer.unref?.();
      return { success: true, scheduled: true, publishId };
    }
  }

  return executePublish();
}

export async function dispatchExecuteSchedule(params: {
  scheduleId: string;
  manual?: boolean;
  companyId?: string;
}) {
  const { scheduleId, manual } = params;
  const schedule = await prisma.schedule.findUnique({ where: { id: scheduleId } });
  if (!schedule) {
    throw new Error(`Schedule ${scheduleId} not found`);
  }

  const companyId = params.companyId || schedule.companyId;
  const run = await prisma.scheduleRun.create({
    data: {
      scheduleId,
      status: "RUNNING",
      startedAt: new Date(),
    },
  });

  const progressId = await startJobProgress(
    `Schedule: ${schedule.name}`,
    `${manual ? "Manual" : "Scheduled"} execution started...`,
    4,
    companyId
  );

  let totalNewStories = 0;
  const errors: string[] = [];

  try {
    let feedIds: string[] = [];
    try {
      feedIds = JSON.parse(schedule.feedIds) as string[];
    } catch {
      feedIds = [];
    }

    if (feedIds.length > 0) {
      await updateJobProgress(progressId, 1, `Ingesting ${feedIds.length} RSS feeds...`);
      const ingestResults = await ingestFeeds(feedIds, companyId);
      totalNewStories += ingestResults.reduce((sum, r) => sum + r.newItems, 0);
      errors.push(...ingestResults.flatMap((r) => r.errors));
    }

    if (schedule.autoScript && feedIds.length > 0) {
      await updateJobProgress(progressId, 2, "Checking for stories needing scripts...");
      let unscriptedStories = await prisma.story.findMany({
        where: {
          feedId: { in: feedIds },
          status: "INGESTED",
          script: null,
        },
        orderBy: { pubDate: "desc" },
        take: 50,
      });

      if (unscriptedStories.length > 0) {
        const isCurated = schedule.mode === "curated_top";
        try {
          const criteriaInstruction = isCurated
            ? `2. Evaluate the distinct stories against this specific criteria: "${schedule.selectionCriteria || "Most important and engaging"}".\n3. Select exactly the top ${schedule.count} distinct stories that best fit the criteria.`
            : `2. Select exactly the top ${schedule.count} most recent, distinct stories (prioritize newer pub dates).`;

          const prompt = `You are an expert news editor. I am giving you a list of recent news articles.
Your job is to:
1. Identify and group duplicate stories (the exact same news event reported from different sources based on subject, not just title).
${criteriaInstruction}
4. Return ONLY a JSON array containing the string IDs of the selected stories. Do not include markdown formatting or any other text.

Articles:
${unscriptedStories
  .map(
    (s) =>
      `ID: ${s.id}\nTitle: ${s.title}\nDate: ${s.pubDate}\nDesc: ${s.description?.substring(0, 300) || s.fullContent?.substring(0, 300) || ""}...\n---`
  )
  .join("\n")}`;

          const candidatePool = [...unscriptedStories];
          const { object: selectedIds } = await generateLlmObject({
            schema: z.array(z.string()),
            prompt,
            companyId,
            tier: "structured",
            temperature: 0.2,
          });

          const filteredStories = (selectedIds || [])
            .map((id) => candidatePool.find((s) => s.id === id))
            .filter((s): s is NonNullable<typeof s> => s !== undefined)
            .slice(0, schedule.count);

          unscriptedStories =
            filteredStories.length > 0
              ? filteredStories
              : candidatePool.slice(0, schedule.count);
        } catch (e) {
          errors.push(
            `AI Deduplication/Curation failed: ${e instanceof Error ? e.message : String(e)}. Falling back to latest N.`
          );
          unscriptedStories = unscriptedStories.slice(0, schedule.count);
        }
      }

      if (unscriptedStories.length > 0) {
        await updateJobProgress(
          progressId,
          2,
          `Generating scripts for ${unscriptedStories.length} stories...`
        );
        const isRoundup =
          schedule.mode === "roundup" ||
          (schedule.mode === "curated_top" && schedule.outputMode === "roundup");

        if (isRoundup && unscriptedStories.length > 1) {
          await dispatchGenerateRoundup({
            storyIds: unscriptedStories.map((s) => s.id),
            companyId,
          }).catch((e) =>
            errors.push(
              `Roundup dispatch error: ${e instanceof Error ? e.message : String(e)}`
            )
          );
        } else {
          for (const st of unscriptedStories) {
            await dispatchGenerateScript({ storyId: st.id, companyId }).catch((e) =>
              errors.push(
                `Script generation failed for ${st.id}: ${e instanceof Error ? e.message : String(e)}`
              )
            );
          }
        }
        totalNewStories = unscriptedStories.length;
      }
    }

    await updateJobProgress(progressId, 3, "Finalizing schedule run...");
    const status =
      errors.length > 0 ? (totalNewStories > 0 ? "PARTIAL" : "FAILED") : "SUCCESS";

    await prisma.scheduleRun.update({
      where: { id: run.id },
      data: {
        status,
        storyCount: totalNewStories,
        errorLog: errors.length > 0 ? errors.join("\n") : null,
        completedAt: new Date(),
      },
    });

    const nextRunAt = getNextRunEstimate(schedule.cronExpression);
    await prisma.schedule.update({
      where: { id: scheduleId },
      data: {
        lastRunAt: new Date(),
        nextRunAt,
        lastRunStatus: status,
      },
    });

    const successMsg =
      errors.length === 0
        ? `Schedule "${schedule.name}" completed successfully. ${totalNewStories} stories processed.`
        : `Schedule "${schedule.name}" completed with ${errors.length} errors. ${totalNewStories} stories processed.`;
    await finishJobProgress(progressId, successMsg, errors.length === 0);

    return { scheduleId, runId: run.id, totalNewStories, errors };
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    await prisma.scheduleRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        errorLog: errorMsg,
        completedAt: new Date(),
      },
    });
    await prisma.schedule.update({
      where: { id: scheduleId },
      data: {
        lastRunAt: new Date(),
        lastRunStatus: "FAILED",
      },
    });
    await finishJobProgress(
      progressId,
      `Schedule "${schedule.name}" failed: ${errorMsg}`,
      false
    ).catch(() => {});
    throw e;
  }
}
