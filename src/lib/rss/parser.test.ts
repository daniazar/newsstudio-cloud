import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  normalizeStoryInput,
  deduplicateStories,
} from "./parser";
import type { StoryInput } from "@/lib/types";
import type RssParser from "rss-parser";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    story: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

const mockFeedResponse = {
  title: "Test Tech Feed",
  link: "https://example.com",
  items: [
    {
      title: "AI Revolution in 2026",
      link: "https://example.com/article-1",
      content: "<p>AI is changing everything.</p>",
      contentSnippet: "AI is changing everything.",
      guid: "article-1-guid",
      isoDate: "2026-04-29T10:00:00Z",
      creator: "John Doe",
    },
    {
      title: "New Chip Architecture",
      link: "https://example.com/article-2",
      content: "<p>New chips are faster.</p>",
      contentSnippet: "New chips are faster.",
      guid: "article-2-guid",
      isoDate: "2026-04-28T10:00:00Z",
    },
    {
      title: "Quantum Computing Breakthrough",
      link: "https://example.com/article-3",
      content: "<p>Quantum is here.</p>",
      contentSnippet: "Quantum is here.",
      guid: "article-3-guid",
      isoDate: "2026-04-27T10:00:00Z",
      creator: "Jane Smith",
    },
  ],
};

describe("RSS Parser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("normalizeStoryInput", () => {
    it("should normalize an RSS item into a StoryInput", () => {
      const item = mockFeedResponse.items[0] as unknown as RssParser.Item;
      const feedId = "test-feed-id";

      const result = normalizeStoryInput(item, feedId);

      expect(result).toEqual({
        title: "AI Revolution in 2026",
        link: "https://example.com/article-1",
        description: "AI is changing everything.",
        author: "John Doe",
        pubDate: new Date("2026-04-29T10:00:00Z"),
        guid: "article-1-guid",
        feedId: "test-feed-id",
      });
    });

    it("should handle missing optional fields", () => {
      const item = {
        title: "Test",
        link: "https://example.com/test",
        guid: "test-guid",
      } as unknown as RssParser.Item;
      const feedId = "test-feed-id";

      const result = normalizeStoryInput(item, feedId);

      expect(result.title).toBe("Test");
      expect(result.author).toBeUndefined();
      expect(result.pubDate).toBeUndefined();
      expect(result.description).toBe("");
    });

    it("should use link as guid fallback if guid is missing", () => {
      const item = {
        title: "No GUID",
        link: "https://example.com/no-guid",
      } as unknown as RssParser.Item;
      const feedId = "test-feed-id";

      const result = normalizeStoryInput(item, feedId);

      expect(result.guid).toBe("https://example.com/no-guid");
    });
  });

  describe("deduplicateStories", () => {
    it("should filter out stories that already exist in DB", async () => {
      const { prisma } = await import("@/lib/prisma");
      const mockedPrisma = vi.mocked(prisma);

      // Simulate that article-1-guid already exists
      mockedPrisma.story.findMany = vi.fn().mockResolvedValue([
        { guid: "article-1-guid" },
      ]) as unknown as typeof mockedPrisma.story.findMany;

      const stories: StoryInput[] = [
        {
          title: "AI Revolution",
          link: "https://example.com/article-1",
          description: "desc",
          guid: "article-1-guid",
          feedId: "feed-1",
        },
        {
          title: "New Chips",
          link: "https://example.com/article-2",
          description: "desc",
          guid: "article-2-guid",
          feedId: "feed-1",
        },
      ];

      const result = await deduplicateStories(stories);

      expect(result).toHaveLength(1);
      expect(result[0].guid).toBe("article-2-guid");
    });

    it("should return all stories if none exist in DB", async () => {
      const { prisma } = await import("@/lib/prisma");
      const mockedPrisma = vi.mocked(prisma);

      mockedPrisma.story.findMany = vi.fn().mockResolvedValue([]) as unknown as typeof mockedPrisma.story.findMany;

      const stories: StoryInput[] = [
        {
          title: "Story 1",
          link: "https://example.com/1",
          description: "d",
          guid: "guid-1",
          feedId: "feed-1",
        },
        {
          title: "Story 2",
          link: "https://example.com/2",
          description: "d",
          guid: "guid-2",
          feedId: "feed-1",
        },
      ];

      const result = await deduplicateStories(stories);

      expect(result).toHaveLength(2);
    });

    it("should handle empty input array", async () => {
      const result = await deduplicateStories([]);
      expect(result).toHaveLength(0);
    });
  });
});
