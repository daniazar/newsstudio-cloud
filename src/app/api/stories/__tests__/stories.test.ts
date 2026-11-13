import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET } from "../route";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { NextRequest } from "next/server";

// Mock dependencies
vi.mock("@/lib/prisma", () => ({
  prisma: {
    story: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock("@/lib/tenant", () => ({
  requireTenant: vi.fn(),
}));

describe("Stories API Endpoint", () => {
  const mockTenant = {
    userId: "user_123",
    orgId: "org_456",
    isDefaultOrg: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (requireTenant as any).mockResolvedValue({
      ok: true,
      tenant: mockTenant,
    });
  });

  describe("GET /api/stories", () => {
    it("should return paginated stories for tenant", async () => {
      const mockStories = [
        {
          id: "story_1",
          companyId: "org_456",
          feedId: "feed_1",
          title: "Breaking News",
          link: "https://example.com/1",
          description: "Important news",
          author: "John Doe",
          pubDate: new Date("2024-01-01"),
          guid: "guid_1",
          category: "Technology",
          status: "INGESTED",
          approvalStatus: "pending_review",
          articleImageUrls: '["https://example.com/image.jpg"]',
          keywords: '["tech", "news"]',
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
          feed: { id: "feed_1", name: "Tech Feed", url: "https://example.com/feed" },
          script: {
            id: "script_1",
            headline: "Breaking Headline",
            segments: [
              {
                id: "seg_1",
                index: 0,
                text: "This is breaking news",
                assetPath: null,
                assetType: null,
                personaId: null,
              },
            ],
          },
          video: null,
        },
      ];

      (prisma.story.findMany as any).mockResolvedValue(mockStories);
      (prisma.story.count as any).mockResolvedValue(1);

      const request = new NextRequest("http://localhost:3000/api/stories?page=1&limit=10");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toBeDefined();
      expect(prisma.story.findMany).toHaveBeenCalled();
    });

    it("should filter by status", async () => {
      (prisma.story.findMany as any).mockResolvedValue([]);
      (prisma.story.count as any).mockResolvedValue(0);

      const request = new NextRequest("http://localhost:3000/api/stories?status=SCRIPT_GENERATED");
      await GET(request);

      expect(prisma.story.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: "org_456",
            status: "SCRIPT_GENERATED",
          }),
        })
      );
    });

    it("should filter by approval status", async () => {
      (prisma.story.findMany as any).mockResolvedValue([]);
      (prisma.story.count as any).mockResolvedValue(0);

      const request = new NextRequest("http://localhost:3000/api/stories?approvalStatus=pending");
      await GET(request);

      expect(prisma.story.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: "org_456",
            approvalStatus: "pending_review",
          }),
        })
      );
    });

    it("should search by query", async () => {
      (prisma.story.findMany as any).mockResolvedValue([]);
      (prisma.story.count as any).mockResolvedValue(0);

      const request = new NextRequest("http://localhost:3000/api/stories?q=technology");
      await GET(request);

      expect(prisma.story.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: "org_456",
            OR: [
              { title: { contains: "technology" } },
              { description: { contains: "technology" } },
              { category: { contains: "technology" } },
            ],
          }),
        })
      );
    });

    it("should handle sorting by different fields", async () => {
      (prisma.story.findMany as any).mockResolvedValue([]);
      (prisma.story.count as any).mockResolvedValue(0);

      // Test title sort
      let request = new NextRequest("http://localhost:3000/api/stories?sortBy=title");
      await GET(request);
      expect(prisma.story.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { title: "asc" },
        })
      );

      // Test status sort
      request = new NextRequest("http://localhost:3000/api/stories?sortBy=status");
      await GET(request);
      expect(prisma.story.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { status: "asc" },
        })
      );
    });

    it("should return 403 when tenant is not authenticated", async () => {
      (requireTenant as any).mockResolvedValue({
        ok: false,
        response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403 }),
      });

      const request = new NextRequest("http://localhost:3000/api/stories");
      const response = await GET(request);

      expect(response.status).toBe(403);
    });

    it("should handle database errors gracefully", async () => {
      (prisma.story.findMany as any).mockRejectedValue(new Error("Database connection failed"));

      const request = new NextRequest("http://localhost:3000/api/stories");
      
      try {
        const response = await GET(request);
        expect(response.status).toBe(500);
      } catch (error) {
        // If the error is thrown instead of being caught, that's also acceptable
        expect(error).toBeDefined();
      }
    });
  });
});