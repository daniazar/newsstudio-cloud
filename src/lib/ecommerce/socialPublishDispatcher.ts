/**
 * src/lib/ecommerce/socialPublishDispatcher.ts
 *
 * Sprint E6.4: Autonomous Social Channel Publishing Dispatcher.
 * Connects completed AdVariation records to SocialChannel and VideoPublish models,
 * generates platform-optimized viral copy, and dispatches 1-click publishing to:
 * - TikTok for Business / Creator
 * - Instagram Reels
 * - YouTube Shorts
 */

import { prisma } from "@/lib/prisma";
import { uploadVideoToInstagramReels } from "@/lib/social/instagram";
import { uploadVideoToTikTok } from "@/lib/social/tiktok";
import { uploadVideoToYoutube } from "@/lib/social/youtube";
import { storage } from "@/lib/storage";
import { AdScript,ProductSpec } from "@/lib/types/ecommerce";

export interface SocialDispatchOptions {
  variationId: string;
  channelId: string;
  companyId: string;
  scheduledFor?: Date | string;
  customTitle?: string;
  customDescription?: string;
  customTags?: string[];
}

import { generatePlatformAdCopy,type PlatformPublishPayload } from "./socialAdCopy";
import { createLogger } from "@/lib/logger";

const log = createLogger("ecommerce:socialPublishDispatcher");
export { generatePlatformAdCopy,type PlatformPublishPayload };

/**
 * Dispatches an AdVariation to a target SocialChannel (immediate or scheduled).
 */
export async function dispatchAdPublish(options: SocialDispatchOptions) {
  const {
    variationId,
    channelId,
    companyId,
    scheduledFor,
    customTitle,
    customDescription,
    customTags,
  } = options;

  // 1. Fetch AdVariation
  const variation = await prisma.adVariation.findUnique({
    where: { id: variationId },
    include: { campaign: true },
  });

  if (!variation) {
    throw new Error(`AdVariation with ID ${variationId} not found.`);
  }

  // 2. Fetch Target Channel
  const channel = await prisma.socialChannel.findFirst({
    where: { id: channelId, companyId },
  });

  if (!channel) {
    throw new Error(`SocialChannel with ID ${channelId} not found for company ${companyId}.`);
  }

  const rawMetadata: ProductSpec = JSON.parse(variation.campaign.rawMetadata);
  const script: AdScript = JSON.parse(variation.scriptJson);

  const platformKey = (channel.platform === "instagram"
    ? "instagram"
    : channel.platform === "youtube"
    ? "youtube"
    : "tiktok") as "tiktok" | "instagram" | "youtube";

  const generatedCopy = generatePlatformAdCopy(rawMetadata, script, platformKey);

  const finalTitle = customTitle || generatedCopy.title;
  const finalDescription = customDescription || generatedCopy.description;
  const finalTags = customTags || generatedCopy.hashtags;

  const isScheduled = !!scheduledFor;
  const scheduleDate = isScheduled ? new Date(scheduledFor) : null;

  // 3. Ensure an underlying Video record exists for the VideoPublish foreign key
  let video = await prisma.video.findFirst({
    where: {
      companyId,
      outputPath: variation.renderedVideoKey || undefined,
    },
  });

  if (!video) {
    let story = await prisma.story.findFirst({
      where: { companyId, link: rawMetadata.sourceUrl },
    });

    if (!story) {
      let feed = await prisma.rssFeed.findFirst({
        where: { companyId, url: { contains: "ecommerce-campaigns" } },
      });
      if (!feed) {
        feed = await prisma.rssFeed.create({
          data: {
            companyId,
            name: "E-Commerce Commercial Ads",
            url: `https://internal.newsstudio.ai/ecommerce-campaigns/${companyId}`,
          },
        });
      }

      story = await prisma.story.create({
        data: {
          companyId,
          feedId: feed.id,
          title: finalTitle,
          link: `https://example.com/story-${Date.now()}`,
          guid: `story-${Date.now()}`,
          description: finalDescription,
        },
      });
    }

    video = await prisma.video.create({
      data: {
        companyId,
        storyId: story.id,
        youtubeTitle: finalTitle,
        youtubeDescription: finalDescription,
        status: "DONE",
        outputPath: variation.renderedVideoKey || "renders/placeholder.mp4",
        thumbnailStorageKey: variation.thumbnailKey,
        duration: variation.durationSeconds,
      },
    });
  }

  // 4. Upsert VideoPublish record
  const existingPublish = await prisma.videoPublish.findFirst({
    where: {
      videoId: video.id,
      channelId: channel.id,
    },
  });

  const publishRecord = existingPublish
    ? await prisma.videoPublish.update({
        where: { id: existingPublish.id },
        data: {
          status: isScheduled ? "SCHEDULED" : "PUBLISHED",
          scheduledFor: scheduleDate,
          publishedAt: isScheduled ? null : new Date(),
          title: finalTitle,
          description: finalDescription,
          tags: JSON.stringify(finalTags),
        },
      })
    : await prisma.videoPublish.create({
        data: {
          videoId: video.id,
          channelId: channel.id,
          status: isScheduled ? "SCHEDULED" : "PUBLISHED",
          scheduledFor: scheduleDate,
          publishedAt: isScheduled ? null : new Date(),
          title: finalTitle,
          description: finalDescription,
          tags: JSON.stringify(finalTags),
          platformVideoId: isScheduled ? null : `mock_${platformKey}_${Date.now()}`,
        },
      });

  // 5. If immediate publish and real credentials exist, execute actual network upload
  if (!isScheduled && variation.renderedVideoKey) {
    const isRealChannel = Boolean(channel.accessToken && !channel.accessToken.startsWith("mock_"));

    if (isRealChannel) {
      try {
        log.info(`[SocialPublishDispatcher] Downloading ${variation.renderedVideoKey} for ${channel.platform}...`);
        const videoBuffer = await storage.download(variation.renderedVideoKey);

        let realVideoId = "";
        if (channel.platform === "youtube") {
          realVideoId = await uploadVideoToYoutube(channel.id, videoBuffer, finalTitle, finalDescription);
        } else if (channel.platform === "tiktok") {
          realVideoId = await uploadVideoToTikTok(channel.id, videoBuffer, finalTitle);
        } else if (channel.platform === "instagram") {
          realVideoId = await uploadVideoToInstagramReels(channel.id, videoBuffer, `${finalTitle}\n\n${finalDescription}`);
        }

        if (realVideoId) {
          await prisma.videoPublish.update({
            where: { id: publishRecord.id },
            data: {
              platformVideoId: realVideoId,
              status: "PUBLISHED",
              publishedAt: new Date(),
            },
          });
          publishRecord.platformVideoId = realVideoId;
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`[SocialPublishDispatcher] Failed actual upload to ${channel.platform}:`, errorMsg);
        await prisma.videoPublish.update({
          where: { id: publishRecord.id },
          data: {
            status: "FAILED",
          },
        });
      }
    }
  }

  return {
    success: true,
    publish: publishRecord,
    copy: generatedCopy,
  };
}
