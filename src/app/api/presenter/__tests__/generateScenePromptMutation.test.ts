import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../generate-scene/route";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { generateLlmText } from "@/lib/llm/aiSdkGateway";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    segment: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    personaAvatar: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/tenant", () => ({
  requireTenant: vi.fn(),
}));

vi.mock("@/lib/llm/aiSdkGateway", () => ({
  generateLlmText: vi.fn(),
}));

vi.mock("@/lib/storage", () => ({
  storage: {
    exists: vi.fn().mockResolvedValue(true),
    getUrl: vi.fn().mockResolvedValue("http://storage/avatar.png"),
    upload: vi.fn().mockResolvedValue(undefined),
  },
  withTenant: vi.fn((orgId: string, p: string) => `tenants/${orgId}/${p}`),
}));

describe("Presenter Scene Generation - LLM Prompt Mutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireTenant as any).mockResolvedValue({
      ok: true,
      tenant: { userId: "user_test", orgId: "org_alpha_999", isDefaultOrg: false },
    });
  });

  it("calls generateLlmText with companyId, storyId, and prompt when mutating preset avatar prompt", async () => {
    // Mock fetch for ComfyUI health check returning true, and prompt submission throwing after avatar mutation
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (typeof url === "string" && url.includes("/prompt")) {
        throw new Error("Halt stream after prompt mutation");
      }
      return { ok: true, json: async () => ({}) };
    });

    (prisma.segment.findFirst as any).mockResolvedValue({
      id: "seg_123",
      index: 1,
      audioPath: "/audio/scene-1.wav",
      personaId: "ruby",
      presetChoice: "emerald_blazer",
      personaImagePrompt: "A professional news anchor in an emerald blazer",
      script: {
        story: {
          id: "story_xyz_456",
          companyId: "org_alpha_999",
          video: { id: "vid_123" },
        },
      },
    });

    (prisma.personaAvatar.findMany as any).mockResolvedValue([
      { id: "av_1", storageKey: "avatars/av_1.png", prompt: "old prompt", preset: "emerald_blazer" },
    ]);

    // Force Math.random to > 0.7 to trigger the mutation branch
    const originalRandom = Math.random;
    Math.random = () => 0.99;

    (generateLlmText as any).mockResolvedValue({
      text: "A professional news anchor in a tailored velvet blazer with soft amber accents",
      providerUsed: "gemini",
      modelUsed: "gemini-2.5-flash",
    });

    const req = new NextRequest("http://localhost:3000/api/presenter/generate-scene", {
      method: "POST",
      body: JSON.stringify({
        storyId: "story_xyz_456",
        segmentId: "seg_123",
        renderEngine: "comfy",
      }),
    });

    const response = await POST(req);
    expect(response.status).toBe(200);

    // Consume the NDJSON stream
    const reader = response.body?.getReader();
    if (reader) {
      let done = false;
      while (!done) {
        const res = await reader.read();
        done = res.done;
      }
    }

    Math.random = originalRandom;

    expect(generateLlmText).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: "org_alpha_999",
        storyId: "story_xyz_456",
        temperature: 0.7,
      })
    );
  });
});
