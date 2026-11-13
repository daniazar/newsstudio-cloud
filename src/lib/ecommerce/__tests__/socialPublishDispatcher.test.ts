/**
 * src/lib/ecommerce/__tests__/socialPublishDispatcher.test.ts
 *
 * Unit tests for Sprint E6.4 Autonomous Social Publishing Dispatcher.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generatePlatformAdCopy,
  dispatchAdPublish,
} from "../socialPublishDispatcher";
import { ProductSpec, AdScript } from "@/lib/types/ecommerce";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    adVariation: {
      findUnique: vi.fn(),
    },
    socialChannel: {
      findFirst: vi.fn(),
    },
    story: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    rssFeed: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    video: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    videoPublish: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

const mockProduct: ProductSpec = {
  id: "prod-pub-1",
  sourceUrl: "https://store.example.com/products/ultralight-sneakers",
  title: "AeroGlide Pro Cloud Running Shoes",
  vendor: "AeroGlide Athletics",
  description: "Carbon-fiber plated responsive running shoes designed for marathon speed.",
  price: 89.99,
  compareAtPrice: 149.99,
  currency: "USD",
  inStock: true,
  rating: 4.9,
  reviewCount: 380,
  typology: "apparel_wearable",
  brand: {
    name: "AeroGlide",
    domain: "aeroglide.com",
    logoUrl: null,
    faviconUrl: null,
    appleTouchIconUrl: null,
    primaryColor: "#ff0055",
    secondaryColor: "#111111",
    surfaceColor: "#000000",
    toneOfVoice: "playful_hype",
    taglines: ["Defy Gravity"],
  },
  bulletPoints: [
    "Proprietary AeroPlate carbon fiber propulsion system",
    "Dual-density supercritical nitrogen-infused foam",
    "Breathable engineered jacquard mesh upper",
  ],
  variants: [],
  assets: [],
  topReviews: [],
  scrapedAt: new Date().toISOString(),
};

const mockScript: AdScript = {
  id: "script-pub-1",
  archetype: "viral_ugc",
  targetChannel: "tiktok_shop",
  aspectRatio: "9:16",
  durationSeconds: 15,
  totalFrames: 450,
  fps: 30,
  hookHeadline: "Throw Away Your Heavy Running Shoes Right Now!",
  callToAction: "Get Yours Before Sold Out",
  scenes: [],
};

describe("Sprint E6.4 Social Publishing Dispatcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Platform Ad Copy Generation", () => {
    it("generates viral TikTok ad copy with 40% discount badge and fyp hashtags", () => {
      const copy = generatePlatformAdCopy(mockProduct, mockScript, "tiktok");
      expect(copy.platform).toBe("tiktok");
      expect(copy.title).toContain("40% OFF");
      expect(copy.description).toContain(mockScript.hookHeadline);
      expect(copy.description).toContain(mockProduct.bulletPoints[0]);
      expect(copy.hashtags).toContain("tiktokmademebuyit");
      expect(copy.hashtags).toContain("fyp");
      expect(copy.hashtags).toContain("aeroglide");
      expect(copy.hashtags).toContain("apparelwearable");
    });

    it("generates Instagram Reels ad copy with trending and unboxing tags", () => {
      const copy = generatePlatformAdCopy(mockProduct, mockScript, "instagram");
      expect(copy.platform).toBe("instagram");
      expect(copy.title).toContain("AeroGlide");
      expect(copy.description).toContain("Link in bio");
      expect(copy.hashtags).toContain("reels");
      expect(copy.hashtags).toContain("unboxing");
      expect(copy.hashtags).toContain("trending");
    });

    it("generates YouTube Shorts copy with #Shorts suffix and source URL", () => {
      const copy = generatePlatformAdCopy(mockProduct, mockScript, "youtube");
      expect(copy.platform).toBe("youtube");
      expect(copy.title).toContain("#Shorts");
      expect(copy.description).toContain(mockProduct.sourceUrl);
      expect(copy.hashtags).toContain("Shorts");
      expect(copy.hashtags).toContain("ProductReview");
    });
  });

  describe("dispatchAdPublish Execution", () => {
    it("throws error if AdVariation is not found", async () => {
      (prisma.adVariation.findUnique as any).mockResolvedValue(null);

      await expect(
        dispatchAdPublish({
          variationId: "nonexistent-var",
          channelId: "channel-1",
          companyId: "org-1",
        })
      ).rejects.toThrow("AdVariation with ID nonexistent-var not found");
    });

    it("throws error if SocialChannel is not found for tenant", async () => {
      (prisma.adVariation.findUnique as any).mockResolvedValue({
        id: "var-1",
        campaign: { rawMetadata: JSON.stringify(mockProduct) },
        scriptJson: JSON.stringify(mockScript),
      });
      (prisma.socialChannel.findFirst as any).mockResolvedValue(null);

      await expect(
        dispatchAdPublish({
          variationId: "var-1",
          channelId: "wrong-channel",
          companyId: "org-1",
        })
      ).rejects.toThrow("SocialChannel with ID wrong-channel not found");
    });

    it("successfully creates video record and publishes immediately to TikTok", async () => {
      (prisma.adVariation.findUnique as any).mockResolvedValue({
        id: "var-1",
        renderedVideoKey: "renders/ecommerce/cloud_shoes.mp4",
        thumbnailKey: "thumbnails/ecommerce/cloud_shoes.png",
        durationSeconds: 15,
        campaign: { rawMetadata: JSON.stringify(mockProduct) },
        scriptJson: JSON.stringify(mockScript),
      });

      (prisma.socialChannel.findFirst as any).mockResolvedValue({
        id: "ch-tiktok-1",
        companyId: "org-1",
        platform: "tiktok",
        name: "AeroGlide TikTok",
        accessToken: "mock_tiktok_tok",
      });

      (prisma.story.findFirst as any).mockResolvedValue({ id: "story-created-1" });
      (prisma.video.findFirst as any).mockResolvedValue(null);
      (prisma.video.create as any).mockResolvedValue({
        id: "vid-created-1",
        companyId: "org-1",
        outputPath: "renders/ecommerce/cloud_shoes.mp4",
      });

      (prisma.videoPublish.findFirst as any).mockResolvedValue(null);
      (prisma.videoPublish.create as any).mockResolvedValue({
        id: "pub-record-1",
        videoId: "vid-created-1",
        channelId: "ch-tiktok-1",
        status: "PUBLISHED",
        title: "AeroGlide Pro Cloud Running Shoes 🔥 40% OFF",
      });

      const res = await dispatchAdPublish({
        variationId: "var-1",
        channelId: "ch-tiktok-1",
        companyId: "org-1",
      });

      expect(res.success).toBe(true);
      expect(res.publish.status).toBe("PUBLISHED");
      expect(prisma.video.create).toHaveBeenCalledTimes(1);
      expect(prisma.videoPublish.create).toHaveBeenCalledTimes(1);
    });

    it("schedules publish when scheduledFor date is provided", async () => {
      (prisma.adVariation.findUnique as any).mockResolvedValue({
        id: "var-2",
        renderedVideoKey: "renders/ecommerce/cloud_shoes.mp4",
        thumbnailKey: "thumbnails/ecommerce/cloud_shoes.png",
        durationSeconds: 15,
        campaign: { rawMetadata: JSON.stringify(mockProduct) },
        scriptJson: JSON.stringify(mockScript),
      });

      (prisma.socialChannel.findFirst as any).mockResolvedValue({
        id: "ch-ig-1",
        companyId: "org-1",
        platform: "instagram",
        name: "AeroGlide IG",
      });

      (prisma.video.findFirst as any).mockResolvedValue({
        id: "vid-existing-1",
      });

      const futureDate = new Date(Date.now() + 3600000);
      (prisma.videoPublish.findFirst as any).mockResolvedValue(null);
      (prisma.videoPublish.create as any).mockResolvedValue({
        id: "pub-record-2",
        videoId: "vid-existing-1",
        channelId: "ch-ig-1",
        status: "SCHEDULED",
        scheduledFor: futureDate,
      });

      const res = await dispatchAdPublish({
        variationId: "var-2",
        channelId: "ch-ig-1",
        companyId: "org-1",
        scheduledFor: futureDate,
      });

      expect(res.success).toBe(true);
      expect(res.publish.status).toBe("SCHEDULED");
      expect(prisma.video.create).not.toHaveBeenCalled();
    });
  });
});
