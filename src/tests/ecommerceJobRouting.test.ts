import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { prisma } from "../lib/prisma";

// Mock tenant auth
vi.mock("@/lib/tenant", () => ({
  requireTenant: vi.fn().mockResolvedValue({
    ok: true,
    tenant: { orgId: "org_ecom_test" },
  }),
  DEFAULT_ORG_ID: "org_ecom_default",
}));

// Mock rate limit
vi.mock("@/lib/security/rateLimit", () => ({
  checkRateLimit: vi.fn().mockReturnValue({ allowed: true }),
  rateLimitResponse: vi.fn(),
  RateLimitTiers: { AI_EXPENSIVE: "ai_expensive" },
}));

// Mock SSRF security check
vi.mock("@/lib/security/ssrf", () => ({
  assertSafePublicUrl: vi.fn().mockResolvedValue(true),
}));

describe("E-Commerce GenerationJob Routing & Cross-Platform Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("POST /api/ecommerce/render should create a GenerationJob (type: render) and return renderId + jobId", async () => {
    const { POST: renderPost } = await import("../app/api/ecommerce/render/route");

    const mockJob = {
      id: "render_ecom_123",
      type: "render",
      status: "QUEUED",
      totalSteps: 4,
      companyId: "org_ecom_test",
      config: JSON.stringify({
        videoId: "render_ecom_123",
        compositionId: "ProductAd-Vertical",
        aspectRatio: "9:16",
      }),
    };

    const createJobSpy = vi.spyOn(prisma.generationJob, "create").mockResolvedValueOnce(mockJob as any);

    const req = {
      json: async () => ({
        productSpec: {
          title: "Sonic Glow Serum",
          brand: "Lumiere",
          price: 49.99,
          currency: "USD",
          rawFeatures: ["Hydrating"],
          mediaAssets: [],
        },
        script: {
          archetype: "pdp_showcase",
          targetChannel: "tiktok_shop",
          scenes: [
            { id: "s1", voiceoverScript: "Say hello to glow.", durationFrames: 150 },
            { id: "s2", voiceoverScript: "Dermatologist approved.", durationFrames: 150 },
          ],
        },
        aspectRatio: "9:16",
        campaignId: "campaign_serum_1",
      }),
    } as any;

    const res = await renderPost(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.jobId).toBe("render_ecom_123");
    expect(json.compositionId).toBe("ProductAd-Vertical");
    expect(createJobSpy).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: "render",
        status: "QUEUED",
        companyId: "org_ecom_test",
        storyId: "campaign_serum_1",
        config: expect.stringContaining("ProductAd-Vertical"),
      }),
    });
  });

  it("GET /api/ecommerce/render should query GenerationJob from DB and return completed status", async () => {
    const { GET: renderGet } = await import("../app/api/ecommerce/render/route");

    const mockDbJob = {
      id: "render_done_456",
      companyId: "org_ecom_test",
      type: "render",
      status: "DONE",
      totalSteps: 4,
      doneSteps: 4,
      config: JSON.stringify({
        compositionId: "ProductAd-Vertical",
        totalFrames: 300,
        result: {
          outputPath: "https://minio.local/news-studio/renders/render_done_456.mp4",
          duration: 10,
        },
      }),
    };

    vi.spyOn(prisma.generationJob, "findFirst").mockResolvedValueOnce(mockDbJob as any);

    const req = {
      url: "http://localhost:3000/api/ecommerce/render?renderId=render_done_456",
    } as any;

    const res = await renderGet(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.id).toBe("render_done_456");
    expect(json.status).toBe("completed");
    expect(json.progress).toBe(100);
    expect(json.publicUrl).toBe("https://minio.local/news-studio/renders/render_done_456.mp4");
  });

  it("GET /api/ecommerce/render should report in-progress percentage from GenerationJob doneSteps", async () => {
    const { GET: renderGet } = await import("../app/api/ecommerce/render/route");

    const mockDbJob = {
      id: "render_prog_789",
      companyId: "org_ecom_test",
      type: "render",
      status: "RENDER_IN_PROGRESS",
      totalSteps: 4,
      doneSteps: 2,
      config: JSON.stringify({
        compositionId: "ProductAd-Vertical",
        totalFrames: 600,
      }),
    };

    vi.spyOn(prisma.generationJob, "findFirst").mockResolvedValueOnce(mockDbJob as any);

    const req = {
      url: "http://localhost:3000/api/ecommerce/render?renderId=render_prog_789",
    } as any;

    const res = await renderGet(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.id).toBe("render_prog_789");
    expect(json.status).toBe("rendering");
    expect(json.progress).toBe(50);
    expect(json.currentFrame).toBe(300);
  });

  it("POST /api/ecommerce/render (action: cancel) should mark GenerationJob CANCELLED in DB", async () => {
    const { POST: renderPost } = await import("../app/api/ecommerce/render/route");

    const updateManySpy = vi.spyOn(prisma.generationJob, "updateMany").mockResolvedValueOnce({ count: 1 });

    const req = {
      json: async () => ({
        action: "cancel",
        renderId: "render_cancel_999",
      }),
    } as any;

    const res = await renderPost(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.status).toBe("canceled");
    expect(updateManySpy).toHaveBeenCalledWith({
      where: {
        id: "render_cancel_999",
        companyId: "org_ecom_test",
        status: { in: ["QUEUED", "CLAIMED", "RENDER_IN_PROGRESS"] },
      },
      data: { status: "CANCELLED" },
    });
  });

  it("POST /api/ecommerce/omnichannel-render should resolve productSpec and script from database campaign if omitted", async () => {
    const { POST: omniPost } = await import("../app/api/ecommerce/omnichannel-render/route");

    const mockCampaign = {
      id: "prod_camp_omega",
      title: "Omega 3 Pro",
      vendor: "Vitality Labs",
      price: 29.99,
      currency: "USD",
      rawMetadata: JSON.stringify({
        title: "Omega 3 Pro",
        brand: "Vitality Labs",
        price: 29.99,
        currency: "USD",
        rawFeatures: ["Triple strength"],
        mediaAssets: [],
      }),
      variations: [
        {
          id: "var_1",
          scriptJson: JSON.stringify({
            archetype: "pdp_showcase",
            scenes: [{ id: "sc_1", voiceoverScript: "Fuel your mind.", durationFrames: 120 }],
          }),
        },
      ],
    };

    vi.spyOn(prisma.productCampaign, "findUnique").mockResolvedValueOnce(mockCampaign as any);

    const req = {
      json: async () => ({
        productId: "prod_camp_omega",
        dryRun: true,
      }),
    } as any;

    const res = await omniPost(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.bundle).toBeDefined();
    expect(json.bundle.videos.vertical).toBeDefined();
    expect(json.bundle.videos.landscape).toBeDefined();
    expect(json.bundle.videos.square).toBeDefined();
  });

  it("POST /api/pipeline/jobs/:jobId/progress on render DONE should persist AdVariation when campaignId is present", async () => {
    const { POST: progressPost } = await import("../app/api/pipeline/jobs/[jobId]/progress/route");

    const mockJob = {
      id: "job_render_advar_1",
      companyId: "org_ecom_test",
      storyId: "camp_advar_1",
      type: "render",
      status: "RENDER_IN_PROGRESS",
      startedAt: new Date(Date.now() - 30000),
      attempts: 1,
      totalSteps: 4,
      config: JSON.stringify({
        videoId: "vid_advar_1",
        campaignId: "camp_advar_1",
        aspectRatio: "9:16",
        script: { archetype: "problem_solution" },
        totalFrames: 600,
      }),
    };

    vi.spyOn(prisma.generationJob, "findUnique").mockResolvedValueOnce(mockJob as any);
    vi.spyOn(prisma.jobLog, "findFirst").mockResolvedValueOnce(null);
    vi.spyOn(prisma, "$transaction").mockResolvedValueOnce([{}]);
    vi.spyOn(prisma.story, "findFirst").mockResolvedValueOnce(null);
    vi.spyOn(prisma.video, "findUnique").mockResolvedValueOnce(null);
    vi.spyOn(prisma.story, "updateMany").mockResolvedValueOnce({ count: 0 });
    const createAdVariationSpy = vi.spyOn(prisma.adVariation, "create").mockResolvedValueOnce({} as any);
    vi.spyOn(prisma.notification, "create").mockResolvedValueOnce({} as any);

    const req = {
      headers: new Headers({ "x-worker-key": process.env.WORKER_API_KEY || "dev-worker-key" }),
      json: async () => ({
        step: "render_complete",
        status: "DONE",
        result: {
          outputPath: "https://minio.local/news-studio/renders/vid_advar_1.mp4",
          duration: 20,
        },
      }),
    } as any;

    const res = await progressPost(req, { params: Promise.resolve({ jobId: "job_render_advar_1" }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(createAdVariationSpy).toHaveBeenCalledWith({
      data: expect.objectContaining({
        campaignId: "camp_advar_1",
        aspectRatio: "9:16",
        status: "COMPLETED",
        renderedVideoKey: "https://minio.local/news-studio/renders/vid_advar_1.mp4",
        durationSeconds: 20,
      }),
    });
  });
});
