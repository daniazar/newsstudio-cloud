import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

const mockRequireTenant = vi.fn();
const mockGenerateLlmText = vi.fn();
const mockGetDefaultProvider = vi.fn();

vi.mock("@/lib/tenant", () => ({
  requireTenant: (...args: unknown[]) => mockRequireTenant(...args),
  DEFAULT_ORG_ID: "org_default",
}));

vi.mock("@/lib/llm/aiSdkGateway", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/llm/aiSdkGateway")>();
  return {
    ...actual,
    generateLlmText: (...args: unknown[]) => mockGenerateLlmText(...args),
    getDefaultProvider: (...args: unknown[]) => mockGetDefaultProvider(...args),
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    story: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    segment: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
    $transaction: vi.fn(async (ops: Array<Promise<unknown>>) => Promise.all(ops)),
  },
}));

import { POST } from "@/app/api/stories/[storyId]/route";
import { prisma } from "@/lib/prisma";
import * as rssGroupsRoute from "@/app/api/rss-groups/route";
import * as feedsGroupsRoute from "@/app/api/feeds/groups/route";

describe("Story Actions: polish-script & rss-groups re-export", () => {
  const originalOllamaBaseUrl = process.env.OLLAMA_BASE_URL;
  const originalOllamaUrl = process.env.OLLAMA_URL;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.OLLAMA_BASE_URL;
    delete process.env.OLLAMA_URL;

    mockRequireTenant.mockResolvedValue({
      ok: true,
      tenant: { userId: "user_1", orgId: "org_1", isDefaultOrg: false },
    });
    mockGetDefaultProvider.mockReturnValue("gemini");

    (prisma.story.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "story_1",
      companyId: "org_1",
      title: "Cloud AI Release",
      feed: { id: "feed_1", name: "Tech Wire" },
      script: { id: "script_1" },
    });

    (prisma.segment.update as ReturnType<typeof vi.fn>).mockImplementation(
      async ({ where, data }: { where: { id: string }; data: { text: string } }) => ({
        id: where.id,
        text: data.text,
      })
    );
  });

  afterEach(() => {
    if (originalOllamaBaseUrl !== undefined) {
      process.env.OLLAMA_BASE_URL = originalOllamaBaseUrl;
    } else {
      delete process.env.OLLAMA_BASE_URL;
    }
    if (originalOllamaUrl !== undefined) {
      process.env.OLLAMA_URL = originalOllamaUrl;
    } else {
      delete process.env.OLLAMA_URL;
    }
  });

  it("re-exports GET, POST, DELETE in /api/rss-groups from /api/feeds/groups", () => {
    expect(rssGroupsRoute.GET).toBe(feedsGroupsRoute.GET);
    expect(rssGroupsRoute.POST).toBe(feedsGroupsRoute.POST);
    expect(rssGroupsRoute.DELETE).toBe(feedsGroupsRoute.DELETE);
  });

  it("polishes all story segments via generateLlmText when called without segmentId/text", async () => {
    (prisma.segment.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "seg_1", index: 0, text: "First raw segment." },
      { id: "seg_2", index: 1, text: "Second raw segment." },
    ]);

    mockGenerateLlmText.mockResolvedValueOnce({
      text: JSON.stringify({
        segments: [
          { id: "seg_1", text: "First polished broadcast segment." },
          { id: "seg_2", text: "Second polished broadcast segment." },
        ],
      }),
      providerUsed: "gemini",
      modelUsed: "gemini-2.5-flash",
    });

    const req = new NextRequest("http://localhost:3000/api/stories/story_1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "polish-script" }),
    });

    const res = await POST(req, { params: Promise.resolve({ storyId: "story_1" }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.updatedCount).toBe(2);
    expect(json.segments).toEqual([
      { id: "seg_1", text: "First polished broadcast segment." },
      { id: "seg_2", text: "Second polished broadcast segment." },
    ]);

    expect(mockGenerateLlmText).toHaveBeenCalledTimes(1);
    expect(mockGenerateLlmText).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: "org_1",
        storyId: "story_1",
        allowFallback: false,
      })
    );
    expect(prisma.segment.update).toHaveBeenCalledTimes(2);
  });

  it("falls back to per-segment generateLlmText when batch JSON fails", async () => {
    process.env.OLLAMA_BASE_URL = "http://localhost:11434";

    (prisma.segment.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "seg_1", index: 0, text: "Raw line one." },
      { id: "seg_2", index: 1, text: "Raw line two." },
    ]);

    mockGenerateLlmText
      .mockResolvedValueOnce({ text: "not valid json", providerUsed: "agy", modelUsed: "local" })
      .mockResolvedValueOnce({ text: "Polished line one.", providerUsed: "gemini", modelUsed: "gemini-2.5-flash" })
      .mockResolvedValueOnce({ text: "Polished line two.", providerUsed: "gemini", modelUsed: "gemini-2.5-flash" });

    const req = new NextRequest("http://localhost:3000/api/stories/story_1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "polish-script" }),
    });

    const res = await POST(req, { params: Promise.resolve({ storyId: "story_1" }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.updatedCount).toBe(2);
    expect(json.segments).toEqual([
      { id: "seg_1", text: "Polished line one." },
      { id: "seg_2", text: "Polished line two." },
    ]);
    expect(mockGenerateLlmText).toHaveBeenCalledTimes(3);
    expect(mockGenerateLlmText).toHaveBeenCalledWith(
      expect.objectContaining({
        allowFallback: true,
      })
    );
  });

  it("preserves single-segment punchy polish via generateLlmText when segmentId & text provided", async () => {
    mockGenerateLlmText.mockResolvedValueOnce({
      text: "Sharp broadcast hook!",
      providerUsed: "gemini",
      modelUsed: "gemini-2.5-flash",
    });

    const req = new NextRequest("http://localhost:3000/api/stories/story_1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "polish-script",
        segmentId: "seg_1",
        text: "Original text.",
        mode: "punchy",
      }),
    });

    const res = await POST(req, { params: Promise.resolve({ storyId: "story_1" }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.success).toBe(true);
    expect(json.polished).toBe("Sharp broadcast hook!");
    expect(prisma.segment.update).toHaveBeenCalledWith({
      where: { id: "seg_1" },
      data: { text: "Sharp broadcast hook!" },
    });
  });

  it("preserves deterministic cadence polish when mode=cadence with text", async () => {
    const req = new NextRequest("http://localhost:3000/api/stories/story_1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "polish-script",
        segmentId: "seg_1",
        text: "Hello, world.",
        mode: "cadence",
      }),
    });

    const res = await POST(req, { params: Promise.resolve({ storyId: "story_1" }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.polished).toBe("Hello... ... world.");
    expect(mockGenerateLlmText).not.toHaveBeenCalled();
    expect(prisma.segment.update).toHaveBeenCalledWith({
      where: { id: "seg_1" },
      data: { text: "Hello... ... world." },
    });
  });
});
