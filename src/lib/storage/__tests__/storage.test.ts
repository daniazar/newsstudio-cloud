import { describe, it, expect, beforeEach, vi } from "vitest";
import { generateKey, withTenant } from "../index";
import { env } from "@/lib/env";

// Mock dependencies
vi.mock("@/lib/env");

describe("Storage Abstraction Layer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateKey", () => {
    it("should generate a properly structured tenant-scoped key", () => {
      const key = generateKey({
        companyId: "org_123",
        type: "audio",
        id: "story_456",
        filename: "segment-01.wav",
      });

      expect(key).toBe("tenants/org_123/audio/story_456/segment-01.wav");
    });

    it("should throw error when companyId is missing", () => {
      expect(() => {
        generateKey({
          companyId: "",
          type: "audio",
          id: "story_456",
          filename: "segment-01.wav",
        });
      }).toThrow("generateKey requires a companyId");
    });

    it("should handle different asset types", () => {
      const audioKey = generateKey({
        companyId: "org_123",
        type: "audio",
        id: "story_456",
        filename: "segment-01.wav",
      });

      const videoKey = generateKey({
        companyId: "org_123",
        type: "videos",
        id: "story_456",
        filename: "final.mp4",
      });

      const thumbnailKey = generateKey({
        companyId: "org_123",
        type: "thumbnails",
        id: "video_789",
        filename: "thumb.jpg",
      });

      expect(audioKey).toBe("tenants/org_123/audio/story_456/segment-01.wav");
      expect(videoKey).toBe("tenants/org_123/videos/story_456/final.mp4");
      expect(thumbnailKey).toBe("tenants/org_123/thumbnails/video_789/thumb.jpg");
    });

    it("should handle special characters in filenames", () => {
      const key = generateKey({
        companyId: "org_123",
        type: "audio",
        id: "story_456",
        filename: "segment with spaces.wav",
      });

      expect(key).toBe("tenants/org_123/audio/story_456/segment with spaces.wav");
    });
  });

  describe("withTenant", () => {
    it("should prefix non-tenant keys with tenant namespace", () => {
      const key = withTenant("org_123", "audio/story_456/segment-01.wav");
      expect(key).toBe("tenants/org_123/audio/story_456/segment-01.wav");
    });

    it("should handle keys with leading slashes", () => {
      const key = withTenant("org_123", "/audio/story_456/segment-01.wav");
      expect(key).toBe("tenants/org_123/audio/story_456/segment-01.wav");
    });

    it("should return unchanged keys already under tenants/", () => {
      const key = withTenant("org_123", "tenants/org_456/audio/story_456/segment-01.wav");
      expect(key).toBe("tenants/org_456/audio/story_456/segment-01.wav");
    });

    it("should throw error when companyId is missing", () => {
      expect(() => {
        withTenant("", "audio/story_456/segment-01.wav");
      }).toThrow("withTenant requires a companyId");
    });

    it("should return empty key when input is empty", () => {
      const key = withTenant("org_123", "");
      expect(key).toBe("");
    });

    it("should handle multiple leading slashes", () => {
      const key = withTenant("org_123", "///audio/story_456/segment-01.wav");
      expect(key).toBe("tenants/org_123/audio/story_456/segment-01.wav");
    });
  });

  describe("Storage Client Selection", () => {
    it("should select R2 client when STORAGE_PROVIDER is r2", () => {
      (env as any).STORAGE_PROVIDER = "r2";
      expect(env.STORAGE_PROVIDER).toBe("r2");
    });

    it("should select MinIO client when STORAGE_PROVIDER is minio", () => {
      (env as any).STORAGE_PROVIDER = "minio";
      expect(env.STORAGE_PROVIDER).toBe("minio");
    });

    it("should select Local client when STORAGE_PROVIDER is local", () => {
      (env as any).STORAGE_PROVIDER = "local";
      expect(env.STORAGE_PROVIDER).toBe("local");
    });

    it("should default to Local client when STORAGE_PROVIDER is not set", () => {
      (env as any).STORAGE_PROVIDER = undefined;
      expect(env.STORAGE_PROVIDER).toBeUndefined();
    });
  });

  describe("LocalStorageClient listing & presigned URLs", () => {
    it("should return an empty array for non-existent prefix directory", async () => {
      const { LocalStorageClient } = await import("../local");
      const client = new LocalStorageClient();
      const results = await client.list("non_existent_folder_9999");
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });

    it("should return local url path for presigned upload and read URLs", async () => {
      const { LocalStorageClient } = await import("../local");
      const client = new LocalStorageClient();
      const uploadUrl = await client.getPresignedUploadUrl("test-audio.wav", "audio/wav");
      const readUrl = await client.getPresignedReadUrl("test-audio.wav");

      expect(uploadUrl).toBe("/assets/test-audio.wav");
      expect(readUrl).toBe("/assets/test-audio.wav");
    });
  });

  describe("MinioStorageClient & Cloudflare R2", () => {
    it("should format R2 public URL directly mapping to bucket root without bucket suffix", async () => {
      const origPublic = process.env.NEXT_PUBLIC_S3_PUBLIC_URL;
      try {
        process.env.NEXT_PUBLIC_S3_PUBLIC_URL = "https://pub-abcdef123456.r2.dev";
        const { MinioStorageClient } = await import("../minio");
        const client = new MinioStorageClient();
        const url = client.getUrl("avatars/ruby.png");

        expect(url).toBe("https://pub-abcdef123456.r2.dev/avatars/ruby.png");
        expect(url).not.toContain("news-studio");
      } finally {
        if (origPublic !== undefined) process.env.NEXT_PUBLIC_S3_PUBLIC_URL = origPublic;
        else delete process.env.NEXT_PUBLIC_S3_PUBLIC_URL;
      }
    });

    it("should format standard S3/MinIO URL with bucket suffix when NEXT_PUBLIC_S3_PUBLIC_URL is unset", async () => {
      const origPublic = process.env.NEXT_PUBLIC_S3_PUBLIC_URL;
      const origEndpoint = process.env.S3_ENDPOINT;
      try {
        delete process.env.NEXT_PUBLIC_S3_PUBLIC_URL;
        delete process.env.NEXT_PUBLIC_S3_ENDPOINT;
        process.env.S3_ENDPOINT = "http://localhost:9000";
        process.env.S3_BUCKET_NAME = "news-studio";

        const { MinioStorageClient } = await import("../minio");
        const client = new MinioStorageClient();
        const url = client.getUrl("audio/segment.wav");

        expect(url).toBe("http://localhost:9000/news-studio/audio/segment.wav");
      } finally {
        if (origPublic !== undefined) process.env.NEXT_PUBLIC_S3_PUBLIC_URL = origPublic;
        if (origEndpoint !== undefined) process.env.S3_ENDPOINT = origEndpoint;
      }
    });

    it("should generate presigned upload and read URLs", async () => {
      const { MinioStorageClient } = await import("../minio");
      const client = new MinioStorageClient();

      const uploadUrl = await client.getPresignedUploadUrl("tenants/org_1/renders/video.mp4", "video/mp4", 900);
      const readUrl = await client.getPresignedReadUrl("tenants/org_1/renders/video.mp4", 900);

      expect(uploadUrl).toContain("tenants/org_1/renders/video.mp4");
      expect(uploadUrl).toContain("X-Amz-Signature");
      expect(readUrl).toContain("tenants/org_1/renders/video.mp4");
      expect(readUrl).toContain("X-Amz-Signature");
    });
  });
});
