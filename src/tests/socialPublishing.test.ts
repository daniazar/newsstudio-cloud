import { describe, it, expect, vi, beforeEach } from "vitest";
import { uploadVideoToTikTok, fetchTikTokAnalytics, refreshTikTokToken } from "@/lib/social/tiktok";
import { uploadVideoToInstagramReels, fetchInstagramAnalytics, refreshInstagramToken } from "@/lib/social/instagram";
import { prisma } from "@/lib/prisma";

// Mock prisma.socialChannel
vi.mock("@/lib/prisma", () => ({
  prisma: {
    socialChannel: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    videoPublish: {
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    video: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    job: {
      create: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
  },
}));

describe("Phase 2: Social Publishing APIs (TikTok & Instagram Reels)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. TikTok Content Posting API v2", () => {
    it("simulates publishing when mock access token is present", async () => {
      const mockChannel = {
        id: "channel_tiktok_1",
        name: "Ruby News TikTok",
        platform: "tiktok",
        accessToken: "mock_tiktok_token_123",
        tokenExpiry: new Date(Date.now() + 86400000),
      };

      (prisma.socialChannel.findUnique as any).mockResolvedValue(mockChannel);

      const buffer = Buffer.from("fake_mp4_video_data");
      const resultId = await uploadVideoToTikTok(mockChannel.id, buffer, "Breaking Tech News");

      expect(resultId).toMatch(/^mock_tiktok_video_/);
    });

    it("throws error if channel does not exist", async () => {
      (prisma.socialChannel.findUnique as any).mockResolvedValue(null);
      const buffer = Buffer.from("fake_mp4");

      await expect(
        uploadVideoToTikTok("nonexistent_channel", buffer, "Test Title")
      ).rejects.toThrow("The channel with ID nonexistent_channel does not exist");
    });

    it("fetches simulated analytics for mock TikTok channel", async () => {
      const mockChannel = {
        id: "channel_tiktok_1",
        platform: "tiktok",
        accessToken: "mock_tiktok_token",
        tokenExpiry: new Date(Date.now() + 86400000),
      };

      (prisma.socialChannel.findUnique as any).mockResolvedValue(mockChannel);

      const analytics = await fetchTikTokAnalytics(mockChannel.id, "mock_tiktok_video_abc");
      expect(analytics).toBeDefined();
      expect(analytics?.viewCount).toBeGreaterThan(0);
      expect(analytics?.likeCount).toBeGreaterThan(0);
      expect(analytics?.shareCount).toBeGreaterThan(0);
    });
  });

  describe("2. Meta Instagram Graph API (Reels)", () => {
    it("simulates publishing when mock access token is present", async () => {
      const mockChannel = {
        id: "channel_ig_1",
        name: "Ruby News Reels",
        handle: "rubynews",
        platform: "instagram",
        accessToken: "mock_ig_token_456",
        tokenExpiry: new Date(Date.now() + 86400000),
      };

      (prisma.socialChannel.findUnique as any).mockResolvedValue(mockChannel);

      const buffer = Buffer.from("fake_mp4_reels_data");
      const resultId = await uploadVideoToInstagramReels(mockChannel.id, buffer, "Daily Tech Roundup #Reels");

      expect(resultId).toMatch(/^mock_instagram_reel_/);
    });

    it("throws error if Instagram channel has no handle/user ID", async () => {
      const mockChannel = {
        id: "channel_ig_no_handle",
        name: "Ruby News",
        handle: "",
        clientId: null,
        platform: "instagram",
        accessToken: "real_token_without_handle",
        tokenExpiry: new Date(Date.now() + 86400000),
      };

      (prisma.socialChannel.findUnique as any).mockResolvedValue(mockChannel);
      const buffer = Buffer.from("fake_mp4");

      await expect(
        uploadVideoToInstagramReels(mockChannel.id, buffer, "Caption")
      ).rejects.toThrow("Missing Instagram User ID / Handle");
    });

    it("fetches simulated analytics for mock Instagram channel", async () => {
      const mockChannel = {
        id: "channel_ig_1",
        platform: "instagram",
        accessToken: "mock_ig_token",
        tokenExpiry: new Date(Date.now() + 86400000),
      };

      (prisma.socialChannel.findUnique as any).mockResolvedValue(mockChannel);

      const analytics = await fetchInstagramAnalytics(mockChannel.id, "mock_instagram_reel_xyz");
      expect(analytics).toBeDefined();
      expect(analytics?.viewCount).toBeGreaterThan(0);
      expect(analytics?.likeCount).toBeGreaterThan(0);
      expect(analytics?.shareCount).toBeGreaterThan(0);
    });
  });

  describe("3. Real API Payload & Status Contracts", () => {
    it("executes real TikTok v2 direct post session flow when live token is present", async () => {
      const mockChannel = {
        id: "channel_tiktok_real",
        name: "Real TikTok",
        platform: "tiktok",
        accessToken: "valid_live_tiktok_jwt",
        tokenExpiry: new Date(Date.now() + 86400000),
      };

      (prisma.socialChannel.findUnique as any).mockResolvedValue(mockChannel);

      const mockFetch = vi.fn();
      // 1. Init post response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            publish_id: "v_pub_real_12345",
            upload_url: "https://open-upload.tiktokapis.com/upload/chunk",
          },
          error: { code: "ok" },
        }),
      });
      // 2. Upload chunk response
      mockFetch.mockResolvedValueOnce({
        ok: true,
      });
      // 3. Status fetch response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            status: "PUBLISH_COMPLETE",
            publicaly_available_post_id: ["7294829104829102910"],
          },
        }),
      });

      const originalFetch = global.fetch;
      global.fetch = mockFetch;

      try {
        const buffer = Buffer.from("real_video_mp4_bytes");
        const postId = await uploadVideoToTikTok(mockChannel.id, buffer, "Live TikTok Test");

        expect(postId).toBe("7294829104829102910");
        expect(mockFetch).toHaveBeenCalledTimes(3);

        // Verify init payload
        const initCallArgs = mockFetch.mock.calls[0];
        expect(initCallArgs[0]).toBe("https://open.tiktokapis.com/v2/post/publish/video/init/");
        const parsedBody = JSON.parse(initCallArgs[1].body);
        expect(parsedBody.post_info.title).toBe("Live TikTok Test");
        expect(parsedBody.source_info.video_size).toBe(buffer.length);
      } finally {
        global.fetch = originalFetch;
      }
    });

    it("executes real Instagram 3-step Reels publishing flow when live token is present", async () => {
      const mockChannel = {
        id: "channel_ig_real",
        name: "Real Instagram",
        handle: "rubynews_official",
        platform: "instagram",
        accessToken: "valid_meta_graph_token",
        tokenExpiry: new Date(Date.now() + 86400000),
      };

      (prisma.socialChannel.findUnique as any).mockResolvedValue(mockChannel);

      const mockFetch = vi.fn();
      // 1. Resumable container init
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "container_998877",
          uri: "https://rupload.facebook.com/ig-reels/upload_998877",
        }),
      });
      // 2. Binary upload to Instagram resumable endpoint
      mockFetch.mockResolvedValueOnce({
        ok: true,
      });
      // 3. Container status check
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status_code: "FINISHED",
        }),
      });
      // 4. Media publish call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "ig_published_reel_11223344",
        }),
      });

      const originalFetch = global.fetch;
      global.fetch = mockFetch;

      try {
        const buffer = Buffer.from("instagram_reels_video_bytes");
        const publishedId = await uploadVideoToInstagramReels(mockChannel.id, buffer, "Exclusive Scoop #Breaking");

        expect(publishedId).toBe("ig_published_reel_11223344");
        expect(mockFetch).toHaveBeenCalledTimes(4);

        // Verify publish container call
        const publishCallArgs = mockFetch.mock.calls[3];
        expect(publishCallArgs[0]).toContain("https://graph.facebook.com/v20.0/rubynews_official/media_publish");
      } finally {
        global.fetch = originalFetch;
      }
    });
  });
});
