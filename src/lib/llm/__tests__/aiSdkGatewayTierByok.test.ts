import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { z } from "zod";
import { MockLanguageModelV4 } from "ai/test";
import {
  generateLlmText,
  generateLlmObject,
  streamLlmText,
  streamLlmObject,
  resolveLanguageModel,
  resolveLanguageModelAsync,
  getDefaultModelForTier,
  DEFAULT_TIER_MODELS,
  type LlmTaskTier,
} from "@/lib/llm/aiSdkGateway";
import {
  saveTenantCredentials,
  invalidateTenantCredentialsCache,
  invalidateSystemSettingsCache,
  BYOK_SETTINGS_KEY,
  ADMIN_SETTINGS_KEY,
} from "@/lib/tenant/credentials";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    systemSetting: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    company: {
      upsert: vi.fn().mockResolvedValue({ id: "org_acme" }),
    },
    aiTokenUsage: {
      create: vi.fn().mockResolvedValue({ id: "usage_1" }),
    },
    usageLog: {
      create: vi.fn().mockResolvedValue({ id: "log_1" }),
    },
    $transaction: vi.fn().mockImplementation(async (ops: any[]) => {
      return Promise.all(ops);
    }),
  },
}));

describe("Task-Tier Model Router & Multi-Tenant BYOK Gateway Integration", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.GEMINI_API_KEY = "test-gemini-key";
    process.env.LLM_PROVIDER = "gemini";
    invalidateSystemSettingsCache();
    invalidateTenantCredentialsCache();
  });

  afterEach(() => {
    process.env = originalEnv;
    invalidateTenantCredentialsCache();
  });

  describe("getDefaultModelForTier & DEFAULT_TIER_MODELS", () => {
    it("returns correct default models for all 4 task complexity tiers on Gemini", () => {
      expect(getDefaultModelForTier("gemini", "realtime")).toBe("gemini-2.5-flash");
      expect(getDefaultModelForTier("gemini", "structured")).toBe("gemini-2.5-flash");
      expect(getDefaultModelForTier("gemini", "reasoning")).toBe("gemini-2.5-pro");
      expect(getDefaultModelForTier("gemini", "vision")).toBe("gemini-2.5-flash");
    });

    it("returns correct default models for all 4 task complexity tiers on Ollama", () => {
      expect(getDefaultModelForTier("ollama", "realtime")).toBe("qwen2.5:3b");
      expect(getDefaultModelForTier("ollama", "structured")).toBe("qwen3.5:9b");
      expect(getDefaultModelForTier("ollama", "reasoning")).toBe("qwen3.5:32b");
      expect(getDefaultModelForTier("ollama", "vision")).toBe("llava");
    });

    it("honors environment variable overrides for tier models", () => {
      process.env.GEMINI_REASONING_MODEL = "gemini-2.5-pro-preview-custom";
      process.env.OLLAMA_REALTIME_MODEL = "qwen2.5:0.5b-turbo";

      expect(getDefaultModelForTier("gemini", "reasoning")).toBe("gemini-2.5-pro-preview-custom");
      expect(getDefaultModelForTier("ollama", "realtime")).toBe("qwen2.5:0.5b-turbo");
    });

    it("prefers system settings tier override over env vars and built-in defaults", async () => {
      vi.mocked(prisma.systemSetting.findFirst).mockResolvedValueOnce({
        id: "sys_1",
        companyId: null,
        key: ADMIN_SETTINGS_KEY,
        value: JSON.stringify({
          llm: {
            tiers: {
              gemini: { reasoning: "gemini-2.5-pro-admin-override" },
            },
          },
        }),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const { getSystemSettings } = await import("@/lib/tenant/credentials");
      await getSystemSettings();

      process.env.GEMINI_REASONING_MODEL = "gemini-env-fallback";
      expect(getDefaultModelForTier("gemini", "reasoning")).toBe("gemini-2.5-pro-admin-override");
    });
  });

  describe("resolveLanguageModelAsync with auto-cache prewarming", () => {
    it("asynchronously prewarms tenant BYOK cache and resolves model", async () => {
      vi.mocked(prisma.systemSetting.findFirst).mockResolvedValueOnce({
        id: "byok_async_row",
        companyId: "org_async",
        key: BYOK_SETTINGS_KEY,
        value: JSON.stringify({
          companyId: "org_async",
          provider: "gemini",
          geminiApiKey: "AIzaSyD-async-key",
          tierModels: {
            reasoning: "gemini-2.5-pro-async",
          },
        }),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const res = await resolveLanguageModelAsync({
        provider: "gemini",
        companyId: "org_async",
        tier: "reasoning",
        skipMiddleware: true,
      });

      expect(res.modelId).toBe("gemini-2.5-pro-async");
    });
  });

  describe("resolveLanguageModel with Tier & Tenant BYOK", () => {
    it("resolves tier model when model is not explicitly provided", () => {
      const res = resolveLanguageModel({
        provider: "gemini",
        tier: "reasoning",
        skipMiddleware: true,
      });

      expect(res.modelId).toBe("gemini-2.5-pro");
      expect(res.provider).toBe("gemini");
    });

    it("resolves Ollama tier models correctly", () => {
      const res = resolveLanguageModel({
        provider: "ollama",
        tier: "realtime",
        skipMiddleware: true,
      });

      expect(res.modelId).toBe("qwen2.5:3b");
      expect(res.provider).toBe("ollama");

      const visionRes = resolveLanguageModel({
        provider: "ollama",
        tier: "vision",
        skipMiddleware: true,
      });

      expect(visionRes.modelId).toBe("llava");
    });

    it("prefers explicitly supplied model over tier default", () => {
      const res = resolveLanguageModel({
        provider: "gemini",
        model: "gemini-custom-fine-tuned",
        tier: "reasoning",
        skipMiddleware: true,
      });

      expect(res.modelId).toBe("gemini-custom-fine-tuned");
    });

    it("resolves tenant BYOK credentials when companyId has stored credentials in cache", async () => {
      // Seed tenant BYOK credentials
      vi.mocked(prisma.systemSetting.findFirst).mockResolvedValueOnce({
        id: "byok_row",
        companyId: "org_acme",
        key: BYOK_SETTINGS_KEY,
        value: JSON.stringify({
          companyId: "org_acme",
          provider: "gemini",
          geminiApiKey: "AIzaSyD-acme-private-key",
          tierModels: {
            reasoning: "gemini-2.5-pro-enterprise",
          },
        }),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      // Pre-warm cache
      await saveTenantCredentials("org_acme", {
        geminiApiKey: "AIzaSyD-acme-private-key",
        tierModels: {
          reasoning: "gemini-2.5-pro-enterprise",
        },
      });

      const res = resolveLanguageModel({
        provider: "gemini",
        tier: "reasoning",
        companyId: "org_acme",
        skipMiddleware: true,
      });

      expect(res.modelId).toBe("gemini-2.5-pro-enterprise");
    });
  });

  describe("generateLlmText and generateLlmObject with Task-Tier routing", () => {
    it("routes generateLlmText with tier: reasoning using MockLanguageModel", async () => {
      const mockModel = new MockLanguageModelV4({
        modelId: "gemini-2.5-pro",
        doGenerate: async () => ({
          warnings: [],
          finishReason: { unified: "stop", raw: "stop" },
          usage: {
            inputTokens: { total: 40, noCache: 40, cacheRead: 0, cacheWrite: 0 },
            outputTokens: { total: 25, text: 25, reasoning: 0 },
          },
          content: [
            {
              type: "text",
              text: "Deep analytical reasoning output.",
            },
          ],
        }),
      });

      const result = await generateLlmText({
        tier: "reasoning",
        prompt: "Analyze market volatility causes.",
        customModel: mockModel,
      });

      expect(result.text).toBe("Deep analytical reasoning output.");
      expect(result.modelUsed).toBe("gemini-2.5-pro");
    });

    it("routes generateLlmObject with tier: structured using MockLanguageModel", async () => {
      const TestSchema = z.object({
        status: z.string(),
        confidence: z.number(),
      });

      const mockModel = new MockLanguageModelV4({
        modelId: "gemini-2.5-flash",
        doGenerate: async () => ({
          warnings: [],
          finishReason: { unified: "stop", raw: "stop" },
          usage: {
            inputTokens: { total: 30, noCache: 30, cacheRead: 0, cacheWrite: 0 },
            outputTokens: { total: 15, text: 15, reasoning: 0 },
          },
          content: [
            {
              type: "text",
              text: JSON.stringify({ status: "success", confidence: 0.98 }),
            },
          ],
        }),
      });

      const result = await generateLlmObject({
        schema: TestSchema,
        tier: "structured",
        prompt: "Evaluate system state.",
        customModel: mockModel,
      });

      expect(result.object).toEqual({ status: "success", confidence: 0.98 });
      expect(result.modelUsed).toBe("gemini-2.5-flash");
    });
  });

  describe("streamLlmText and streamLlmObject with Task-Tier routing", () => {
    it("initializes streamLlmText with custom model honoring tier", async () => {
      const mockModel = new MockLanguageModelV4({
        modelId: "gemini-2.5-flash",
        doStream: async () => {
          const stream = new ReadableStream({
            start(controller) {
              controller.enqueue({ type: "text-delta", text: "Realtime news live..." });
              controller.enqueue({
                type: "finish",
                finishReason: "stop",
                usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
              });
              controller.close();
            },
          });
          return { stream, rawCall: { rawPrompt: null, rawSettings: {} } };
        },
      });

      const stream = await streamLlmText({
        tier: "realtime",
        prompt: "Live anchor broadcast intro",
        customModel: mockModel,
      });

      expect(stream.modelUsed).toBe("gemini-2.5-flash");
    });
  });
});
