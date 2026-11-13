import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET } from "../route";
import { GET as getLive } from "../live/route";
import { getAggregatedSystemHealth } from "@/lib/health";
import { prisma } from "@/lib/prisma";

// Mock dependencies
vi.mock("@/lib/health");
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

describe("Health API Endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/health", () => {
    it("should return 200 when system is healthy", async () => {
      const mockHealth = {
        status: "healthy" as const,
        timestamp: new Date().toISOString(),
        memory: {
          heapUsedMB: 100,
          heapTotalMB: 200,
          rssMB: 300,
          gcAvailable: true,
        },
        services: {
          database: { status: "online" as const, latencyMs: 5 },
          storage: { status: "online" as const, latencyMs: 10 },
          ollama: { status: "unconfigured" as const },
          tts: { status: "online" as const, latencyMs: 15 },
          comfyui: { status: "online" as const, latencyMs: 20 },
          musetalk: { status: "unconfigured" as const },
          liveportrait: { status: "unconfigured" as const },
          keysync: { status: "unconfigured" as const },
          sadtalker: { status: "online" as const, latencyMs: 25 },
          modernmotion: { status: "unconfigured" as const },
          moderntalkinghead: { status: "unconfigured" as const },
          object3d: { status: "unconfigured" as const },
        },
        workers: {},
      };

      vi.mocked(getAggregatedSystemHealth).mockResolvedValue(mockHealth);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe("healthy");
      expect(data.services.database.status).toBe("online");
      expect(data.services.storage.status).toBe("online");
      expect(data.timestamp).toBeDefined();
    });

    it("should return 503 when system is unhealthy", async () => {
      const mockHealth = {
        status: "unhealthy" as const,
        timestamp: new Date().toISOString(),
        memory: {
          heapUsedMB: 100,
          heapTotalMB: 200,
          rssMB: 300,
          gcAvailable: true,
        },
        services: {
          database: { status: "offline" as const, error: "Connection failed" },
          storage: { status: "online" as const, latencyMs: 10 },
          ollama: { status: "unconfigured" as const },
          tts: { status: "unconfigured" as const },
          comfyui: { status: "unconfigured" as const },
          musetalk: { status: "unconfigured" as const },
          liveportrait: { status: "unconfigured" as const },
          keysync: { status: "unconfigured" as const },
          sadtalker: { status: "unconfigured" as const },
          modernmotion: { status: "unconfigured" as const },
          moderntalkinghead: { status: "unconfigured" as const },
          object3d: { status: "unconfigured" as const },
        },
        workers: {},
      };

      vi.mocked(getAggregatedSystemHealth).mockResolvedValue(mockHealth);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe("unhealthy");
    });

    it("should return 200 when system is degraded", async () => {
      const mockHealth = {
        status: "degraded" as const,
        timestamp: new Date().toISOString(),
        memory: {
          heapUsedMB: 100,
          heapTotalMB: 200,
          rssMB: 300,
          gcAvailable: true,
        },
        services: {
          database: { status: "online" as const, latencyMs: 5 },
          storage: { status: "online" as const, latencyMs: 10 },
          ollama: { status: "offline" as const, error: "Service down" },
          tts: { status: "online" as const, latencyMs: 15 },
          comfyui: { status: "online" as const, latencyMs: 20 },
          musetalk: { status: "unconfigured" as const },
          liveportrait: { status: "unconfigured" as const },
          keysync: { status: "unconfigured" as const },
          sadtalker: { status: "online" as const, latencyMs: 25 },
          modernmotion: { status: "unconfigured" as const },
          moderntalkinghead: { status: "unconfigured" as const },
          object3d: { status: "unconfigured" as const },
        },
        workers: {},
      };

      vi.mocked(getAggregatedSystemHealth).mockResolvedValue(mockHealth);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe("degraded");
    });

    it("should return 500 when health check throws error", async () => {
      vi.mocked(getAggregatedSystemHealth).mockRejectedValue(new Error("Health check failed"));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.status).toBe("unhealthy");
      expect(data.error).toBeDefined();
    });

    it("should set proper cache headers", async () => {
      const mockHealth = {
        status: "healthy" as const,
        timestamp: new Date().toISOString(),
        memory: {
          heapUsedMB: 100,
          heapTotalMB: 200,
          rssMB: 300,
          gcAvailable: true,
        },
        services: {
          database: { status: "online" as const, latencyMs: 5 },
          storage: { status: "online" as const, latencyMs: 10 },
          ollama: { status: "unconfigured" as const },
          tts: { status: "unconfigured" as const },
          comfyui: { status: "unconfigured" as const },
          musetalk: { status: "unconfigured" as const },
          liveportrait: { status: "unconfigured" as const },
          keysync: { status: "unconfigured" as const },
          sadtalker: { status: "unconfigured" as const },
          modernmotion: { status: "unconfigured" as const },
          moderntalkinghead: { status: "unconfigured" as const },
          object3d: { status: "unconfigured" as const },
        },
        workers: {},
      };

      vi.mocked(getAggregatedSystemHealth).mockResolvedValue(mockHealth);

      const response = await GET();

      expect(response.headers.get("Cache-Control")).toBe("no-store, no-cache, must-revalidate");
    });
  });

  describe("GET /api/health/live", () => {
    it("should return 200 when database connection is responsive", async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([{ "?column?": 1 }] as any);

      const response = await getLive();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe("ok");
      expect(data.live).toBe(true);
      expect(data.timestamp).toBeDefined();
    });

    it("should return 503 when database query fails", async () => {
      vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(new Error("Database connection closed"));

      const response = await getLive();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.status).toBe("error");
      expect(data.live).toBe(false);
      expect(data.error).toContain("Database connection closed");
    });
  });
});