import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { prisma } from "../lib/prisma";

// Mock tenant auth
vi.mock("@/lib/tenant", () => ({
  requireTenant: vi.fn().mockResolvedValue({
    ok: true,
    tenant: { orgId: "org_test_bypass" },
  }),
  DEFAULT_ORG_ID: "org_default_tenant",
}));

describe("Job Bypass Routing & Worker Delegation Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("POST /api/stories/[storyId] (action: render) should create a render GenerationJob and return jobId", async () => {
    const { POST: storyPost } = await import("../app/api/stories/[storyId]/route");

    const mockStory = {
      id: "story_bypass_1",
      companyId: "org_test_bypass",
      title: "Breaking News Video",
      feed: { name: "Tech News" },
      script: { segments: [{ id: "seg_1", index: 0, text: "Welcome" }] },
    };

    const mockVideo = {
      id: "video_bypass_1",
      storyId: "story_bypass_1",
      aspectRatio: "vertical",
    };

    const mockJob = {
      id: "job_render_bypass_1",
      type: "render",
      status: "QUEUED",
      totalSteps: 4,
    };

    vi.spyOn(prisma.story, "findFirst").mockResolvedValueOnce(mockStory as any);
    vi.spyOn(prisma.video, "findUnique").mockResolvedValueOnce(mockVideo as any);
    vi.spyOn(prisma.video, "update").mockResolvedValueOnce(mockVideo as any);
    vi.spyOn(prisma.story, "update").mockResolvedValueOnce(mockStory as any);
    vi.spyOn(prisma.generationJob, "updateMany").mockResolvedValueOnce({ count: 0 });
    const createJobSpy = vi.spyOn(prisma.generationJob, "create").mockResolvedValueOnce(mockJob as any);

    const req = {
      json: async () => ({ action: "render" }),
    } as any;

    const res = await storyPost(req, { params: Promise.resolve({ storyId: "story_bypass_1" }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.action).toBe("render");
    expect(json.jobId).toBe("job_render_bypass_1");
    expect(json.mode).toBe("worker");

    expect(createJobSpy).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: "render",
        status: "QUEUED",
        companyId: "org_test_bypass",
        storyId: "story_bypass_1",
        config: expect.stringContaining("RubyNews-Vertical"),
      }),
    });
  });

  it("POST /api/stories/[storyId] (action: batch-export-all-formats) should create 3 render GenerationJobs", async () => {
    const { POST: storyPost } = await import("../app/api/stories/[storyId]/route");

    const mockStory = {
      id: "story_bypass_batch",
      companyId: "org_test_bypass",
      title: "Omnichannel Story",
      script: { segments: [] },
    };

    const mockVideo = {
      id: "video_bypass_batch",
      storyId: "story_bypass_batch",
    };

    vi.spyOn(prisma.story, "findFirst").mockResolvedValueOnce(mockStory as any);
    vi.spyOn(prisma.video, "findUnique").mockResolvedValueOnce(mockVideo as any);

    let jobCounter = 0;
    const createJobSpy = vi.spyOn(prisma.generationJob, "create").mockImplementation(((async ({ data }: any) => {
      jobCounter++;
      return {
        id: `job_batch_${jobCounter}`,
        ...data,
      };
    }) as any));

    const req = {
      json: async () => ({ action: "batch-export-all-formats" }),
    } as any;

    const res = await storyPost(req, { params: Promise.resolve({ storyId: "story_bypass_batch" }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.formats).toHaveLength(3);
    expect(json.formats[0].format).toBe("vertical");
    expect(json.formats[1].format).toBe("horizontal");
    expect(json.formats[2].format).toBe("square");
    expect(createJobSpy).toHaveBeenCalledTimes(3);
  });

  it("POST /api/stories/[storyId] (action: cancel-render) should mark active GenerationJobs CANCELLED", async () => {
    const { POST: storyPost } = await import("../app/api/stories/[storyId]/route");

    const mockStory = {
      id: "story_cancel_1",
      companyId: "org_test_bypass",
      script: { segments: [] },
    };

    vi.spyOn(prisma.story, "findFirst").mockResolvedValueOnce(mockStory as any);
    vi.spyOn(prisma.video, "findUnique").mockResolvedValueOnce({ id: "video_cancel_1" } as any);
    const cancelJobSpy = vi.spyOn(prisma.generationJob, "updateMany").mockResolvedValueOnce({ count: 1 });
    vi.spyOn(prisma.video, "update").mockResolvedValueOnce({} as any);
    vi.spyOn(prisma.story, "update").mockResolvedValueOnce({} as any);

    const req = {
      json: async () => ({ action: "cancel-render" }),
    } as any;

    const res = await storyPost(req, { params: Promise.resolve({ storyId: "story_cancel_1" }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(cancelJobSpy).toHaveBeenCalledWith({
      where: {
        storyId: "story_cancel_1",
        type: "render",
        status: { in: ["QUEUED", "CLAIMED", "RENDER_IN_PROGRESS", "IN_PROGRESS"] },
      },
      data: { status: "CANCELLED" },
    });
  });
});
