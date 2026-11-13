import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET, POST, PUT, DELETE } from "../route";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { NextRequest } from "next/server";

// Mock dependencies
vi.mock("@/lib/prisma", () => ({
  prisma: {
    rssFeed: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    rssGroup: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock("@/lib/tenant", () => ({
  requireTenant: vi.fn(),
}));

describe("Feeds API Endpoint", () => {
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

  describe("GET /api/feeds", () => {
    it("should return paginated feeds for tenant", async () => {
      const mockFeeds = [
        {
          id: "feed_1",
          name: "Tech Feed",
          url: "https://example.com/feed",
          isActive: true,
          isEnabled: true,
          groups: [],
          _count: { stories: 10 },
        },
      ];

      (prisma.rssFeed.findMany as any).mockResolvedValue(mockFeeds);
      (prisma.rssFeed.count as any).mockResolvedValue(1);

      const request = new NextRequest("http://localhost:3000/api/feeds?page=1&limit=10");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.feeds).toBeDefined();
      expect(prisma.rssFeed.findMany).toHaveBeenCalled();
    });

    it("should return lite feeds when requested", async () => {
      const mockLiteFeeds = [
        {
          id: "feed_1",
          name: "Tech Feed",
          url: "https://example.com/feed",
          isActive: true,
          isEnabled: true,
        },
      ];

      (prisma.rssFeed.findMany as any).mockResolvedValue(mockLiteFeeds);
      (prisma.rssFeed.count as any).mockResolvedValue(1);

      const request = new NextRequest("http://localhost:3000/api/feeds?lite=true");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.feeds).toEqual(mockLiteFeeds);
      expect(response.headers.get("Cache-Control")).toContain("max-age=15");
    });

    it("should filter by status", async () => {
      (prisma.rssFeed.findMany as any).mockResolvedValue([]);
      (prisma.rssFeed.count as any).mockResolvedValue(0);

      const request = new NextRequest("http://localhost:3000/api/feeds?status=active");
      await GET(request);

      expect(prisma.rssFeed.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: "org_456",
            isEnabled: true,
          }),
        })
      );
    });

    it("should search by query", async () => {
      (prisma.rssFeed.findMany as any).mockResolvedValue([]);
      (prisma.rssFeed.count as any).mockResolvedValue(0);

      const request = new NextRequest("http://localhost:3000/api/feeds?q=technology");
      await GET(request);

      expect(prisma.rssFeed.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: "org_456",
            name: { contains: "technology" },
          }),
        })
      );
    });
  });

  describe("POST /api/feeds", () => {
    it("should create a new feed", async () => {
      const newFeed = {
        id: "feed_1",
        name: "New Feed",
        url: "https://example.com/new-feed",
        companyId: "org_456",
        fetchIntervalMinutes: 60,
        isEnabled: true,
        defaultPersonaId: null,
        autoScript: true,
        autoPublish: false,
        requireApproval: true,
        groups: [],
        _count: { stories: 0 },
      };

      (prisma.rssFeed.findUnique as any).mockResolvedValue(null);
      (prisma.rssFeed.create as any).mockResolvedValue(newFeed);

      const request = new NextRequest("http://localhost:3000/api/feeds", {
        method: "POST",
        body: JSON.stringify({
          name: "New Feed",
          url: "https://example.com/new-feed",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.name).toBe("New Feed");
      expect(prisma.rssFeed.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "New Feed",
            url: "https://example.com/new-feed",
            companyId: "org_456",
          }),
        })
      );
    });

    it("should return 400 when name or url is missing", async () => {
      const request = new NextRequest("http://localhost:3000/api/feeds", {
        method: "POST",
        body: JSON.stringify({ name: "Test" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("requeridos");
    });

    it("should return 400 when URL is invalid", async () => {
      const request = new NextRequest("http://localhost:3000/api/feeds", {
        method: "POST",
        body: JSON.stringify({
          name: "Test",
          url: "not-a-valid-url",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("inválido");
    });

    it("should return 409 when feed already exists", async () => {
      (prisma.rssFeed.findUnique as any).mockResolvedValue({
        id: "existing_feed",
        name: "Existing Feed",
        url: "https://example.com/feed",
      });

      const request = new NextRequest("http://localhost:3000/api/feeds", {
        method: "POST",
        body: JSON.stringify({
          name: "Test",
          url: "https://example.com/feed",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain("ya está registrado");
    });
  });

  describe("PUT /api/feeds", () => {
    it("should update an existing feed", async () => {
      const existingFeed = {
        id: "feed_1",
        name: "Old Name",
        url: "https://example.com/old",
        companyId: "org_456",
        fetchIntervalMinutes: 60,
        isEnabled: true,
        defaultPersonaId: null,
        autoScript: true,
        autoPublish: false,
        requireApproval: true,
      };

      const updatedFeed = {
        ...existingFeed,
        name: "New Name",
        groups: [],
        _count: { stories: 5 },
      };

      (prisma.rssFeed.findFirst as any).mockResolvedValue(existingFeed);
      (prisma.rssFeed.update as any).mockResolvedValue(updatedFeed);

      const request = new NextRequest("http://localhost:3000/api/feeds", {
        method: "PUT",
        body: JSON.stringify({
          id: "feed_1",
          name: "New Name",
        }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe("New Name");
      expect(prisma.rssFeed.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "feed_1" },
          data: expect.objectContaining({
            name: "New Name",
          }),
        })
      );
    });

    it("should return 400 when id is missing", async () => {
      const request = new NextRequest("http://localhost:3000/api/feeds", {
        method: "PUT",
        body: JSON.stringify({ name: "New Name" }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("obligatorio");
    });

    it("should return 404 when feed not found", async () => {
      (prisma.rssFeed.findFirst as any).mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/feeds", {
        method: "PUT",
        body: JSON.stringify({
          id: "nonexistent",
          name: "New Name",
        }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain("no encontrado");
    });
  });

  describe("DELETE /api/feeds", () => {
    it("should delete a feed", async () => {
      const existingFeed = {
        id: "feed_1",
        name: "Feed to Delete",
        url: "https://example.com/feed",
        companyId: "org_456",
      };

      vi.mocked(prisma.rssFeed.findFirst).mockResolvedValue(existingFeed as any);
      (prisma.rssFeed.delete as any).mockResolvedValue(existingFeed);

      const request = new NextRequest("http://localhost:3000/api/feeds?id=feed_1", {
        method: "DELETE",
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(prisma.rssFeed.delete).toHaveBeenCalledWith({
        where: { id: "feed_1" },
      });
    });

    it("should return 400 when id is missing", async () => {
      const request = new NextRequest("http://localhost:3000/api/feeds", {
        method: "DELETE",
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("requerido");
    });

    it("should return 404 when feed not found", async () => {
      (prisma.rssFeed.findFirst as any).mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/feeds?id=nonexistent", {
        method: "DELETE",
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain("no encontrado");
    });
  });
});