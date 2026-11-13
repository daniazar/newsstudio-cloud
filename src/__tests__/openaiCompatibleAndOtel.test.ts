import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { z } from "zod";
import { MockLanguageModelV4, MockEmbeddingModelV4 } from "ai/test";
import {
  generateLlmText,
  generateLlmObject,
  streamLlmText,
  streamLlmObject,
  resolveLanguageModel,
  resolveEmbeddingModel,
  getDefaultModelForTier,
  DEFAULT_TIER_MODELS,
  DEFAULT_EMBEDDING_MODELS,
  embedLlmText,
  embedLlmMany,
  resolveFallbackProvider,
  resolveProviderExecutionParams,
} from "@/lib/llm/aiSdkGateway";
import {
  saveTenantCredentials,
  getTenantCredentials,
  maskApiKey,
  isMaskedKey,
  invalidateTenantCredentialsCache,
  invalidateSystemSettingsCache,
  getSystemSettings,
  BYOK_SETTINGS_KEY,
  ADMIN_SETTINGS_KEY,
} from "@/lib/tenant/credentials";
import { calculateLlmCost } from "@/lib/llm/tokenTracker";
import { register, resetInstrumentationForTests, isTelemetryInitialized } from "@/instrumentation";
import { globalUndiciAgent, pooledFetch } from "@/lib/network/httpPool";
import { prisma } from "@/lib/prisma";
import { POST as settingsPost, PUT as settingsPut, maskAdminSettings } from "@/app/api/admin/settings/route";
import { sendHeartbeat } from "../../workers/pipeline-worker/api";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    systemSetting: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    company: {
      upsert: vi.fn().mockResolvedValue({ id: "org_openai_compat" }),
    },
    aiTokenUsage: {
      create: vi.fn().mockResolvedValue({ id: "usage_otel_1" }),
    },
    usageLog: {
      create: vi.fn().mockResolvedValue({ id: "log_otel_1" }),
    },
    $transaction: vi.fn().mockImplementation(async (ops: unknown[]) => {
      return Promise.all(ops);
    }),
  },
}));

describe("Workstream A: OpenAI-Compatible Multi-Provider Gateway, OTel & Undici Pooling", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.OPENAI_COMPATIBLE_API_KEY;
    delete process.env.OPENAI_COMPATIBLE_BASE_URL;
    invalidateSystemSettingsCache();
    invalidateTenantCredentialsCache();
    resetInstrumentationForTests();
  });

  afterEach(() => {
    process.env = originalEnv;
    invalidateSystemSettingsCache();
    invalidateTenantCredentialsCache();
    resetInstrumentationForTests();
  });

  // =========================================================================
  // 1. OpenAI-Compatible Model Resolution & Task Tiers
  // =========================================================================
  describe("OpenAI-Compatible Model & Tier Resolution", () => {
    it("returns correct default models for all 4 task complexity tiers on openai-compatible provider", () => {
      expect(getDefaultModelForTier("openai-compatible", "realtime")).toBe(DEFAULT_TIER_MODELS["openai-compatible"].realtime);
      expect(getDefaultModelForTier("openai-compatible", "structured")).toBe(DEFAULT_TIER_MODELS["openai-compatible"].structured);
      expect(getDefaultModelForTier("openai-compatible", "reasoning")).toBe(DEFAULT_TIER_MODELS["openai-compatible"].reasoning);
      expect(getDefaultModelForTier("openai-compatible", "vision")).toBe(DEFAULT_TIER_MODELS["openai-compatible"].vision);
    });

    it("honors env var overrides for openai-compatible default tier models", () => {
      process.env.OPENAI_COMPATIBLE_REALTIME_MODEL = "meta-llama/Llama-3.1-8B-Instruct";
      process.env.OPENAI_COMPATIBLE_REASONING_MODEL = "deepseek/deepseek-r1";

      expect(getDefaultModelForTier("openai-compatible", "realtime")).toBe("meta-llama/Llama-3.1-8B-Instruct");
      expect(getDefaultModelForTier("openai-compatible", "reasoning")).toBe("deepseek/deepseek-r1");
    });

    it("resolves language model for openai-compatible with custom baseURL and apiKey", () => {
      const res = resolveLanguageModel({
        provider: "openai-compatible",
        model: "mistralai/Mistral-Small-24B-Instruct-2501",
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: "sk-or-test-key-123456",
        skipMiddleware: true,
      });

      expect(res.provider).toBe("openai-compatible");
      expect(res.modelId).toBe("mistralai/Mistral-Small-24B-Instruct-2501");
      expect(res.model).toBeDefined();
    });

    it("resolves default tier model when model is omitted for openai-compatible", () => {
      const res = resolveLanguageModel({
        provider: "openai-compatible",
        tier: "reasoning",
        baseURL: "http://localhost:8000/v1",
        apiKey: "test-vllm-key",
        skipMiddleware: true,
      });

      expect(res.provider).toBe("openai-compatible");
      expect(res.modelId).toBe(DEFAULT_TIER_MODELS["openai-compatible"].reasoning);
    });

    it("resolves embedding model for openai-compatible with default text-embedding-3-small", () => {
      const res = resolveEmbeddingModel({
        provider: "openai-compatible",
        baseURL: "https://api.together.xyz/v1",
        apiKey: "together-key",
      });

      expect(res.provider).toBe("openai-compatible");
      expect(res.modelId).toBe(DEFAULT_EMBEDDING_MODELS["openai-compatible"]);
      expect(res.model).toBeDefined();
    });

    it("resolves custom embedding model for openai-compatible when specified", () => {
      const res = resolveEmbeddingModel({
        provider: "openai-compatible",
        model: "BAAI/bge-large-en-v1.5",
        baseURL: "http://localhost:8000/v1",
        apiKey: "test-vllm-key",
      });

      expect(res.provider).toBe("openai-compatible");
      expect(res.modelId).toBe("BAAI/bge-large-en-v1.5");
    });
  });

  // =========================================================================
  // 2. Gateway Execution & Telemetry Integration
  // =========================================================================
  describe("Gateway Execution & Telemetry Propagation", () => {
    it("executes generateLlmText with customModel and captures usage and telemetry", async () => {
      const mockModel = new MockLanguageModelV4({
        modelId: "mock-openai-text",
        doGenerate: async () => ({
          warnings: [],
          finishReason: { unified: "stop", raw: "stop" },
          usage: {
            inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
            outputTokens: { total: 25, text: 25, reasoning: 0 },
          },
          content: [
            {
              type: "text",
              text: "Generated response from OpenAI-compatible provider",
            },
          ],
        }),
      });

      const res = await generateLlmText({
        provider: "openai-compatible",
        customModel: mockModel,
        prompt: "Hello world",
        telemetryFunctionId: "newsstudio.test.generateText",
        telemetryEnabled: true,
      });

      expect(res.text).toBe("Generated response from OpenAI-compatible provider");
      expect(res.providerUsed).toBe("openai-compatible");
      expect(res.usage?.inputTokens).toBe(10);
      expect(res.usage?.outputTokens).toBe(25);
    });

    it("executes generateLlmObject with customModel and schema validation", async () => {
      const mockModel = new MockLanguageModelV4({
        modelId: "mock-openai-object",
        doGenerate: async () => ({
          warnings: [],
          finishReason: { unified: "stop", raw: "stop" },
          usage: {
            inputTokens: { total: 15, noCache: 15, cacheRead: 0, cacheWrite: 0 },
            outputTokens: { total: 40, text: 40, reasoning: 0 },
          },
          content: [
            {
              type: "text",
              text: JSON.stringify({ headline: "Breaking News", sentiment: "neutral" }),
            },
          ],
        }),
      });

      const schema = z.object({
        headline: z.string(),
        sentiment: z.enum(["positive", "negative", "neutral"]),
      });

      const res = await generateLlmObject({
        provider: "openai-compatible",
        customModel: mockModel,
        schema,
        prompt: "Extract headline and sentiment",
        telemetryFunctionId: "newsstudio.test.generateObject",
      });

      expect(res.object.headline).toBe("Breaking News");
      expect(res.object.sentiment).toBe("neutral");
      expect(res.providerUsed).toBe("openai-compatible");
    });

    it("executes embedLlmText with customEmbeddingModel", async () => {
      const mockEmbeddingModel = new MockEmbeddingModelV4({
        provider: "openai-compatible",
        modelId: "mock-openai-embedding",
        doEmbed: async ({ values }) => ({
          warnings: [],
          embeddings: values.map(() => [0.1, 0.2, 0.3, 0.4]),
          usage: { tokens: 8 * values.length },
        }),
      });

      const res = await embedLlmText({
        provider: "openai-compatible",
        value: "Sample text to embed",
        customEmbeddingModel: mockEmbeddingModel as any,
        telemetryFunctionId: "newsstudio.test.embedText",
      });

      expect(res.embedding).toEqual([0.1, 0.2, 0.3, 0.4]);
      expect(res.providerUsed).toBe("openai-compatible");
      expect(res.usage?.tokens).toBe(8);
    });

    it("executes embedLlmMany with customEmbeddingModel", async () => {
      const mockEmbeddingModel = new MockEmbeddingModelV4({
        provider: "openai-compatible",
        modelId: "mock-openai-embedding",
        doEmbed: async ({ values }) => ({
          warnings: [],
          embeddings: values.map((_, i) => [i * 0.1, i * 0.2, i * 0.3]),
          usage: { tokens: 8 * values.length },
        }),
      });

      const res = await embedLlmMany({
        provider: "openai-compatible",
        values: ["Text 1", "Text 2"],
        customEmbeddingModel: mockEmbeddingModel as any,
        telemetryFunctionId: "newsstudio.test.embedMany",
      });

      expect(res.embeddings.length).toBe(2);
      expect(res.providerUsed).toBe("openai-compatible");
      expect(res.usage?.tokens).toBe(16);
    });

    it("executes streamLlmText with customModel and captures stream", async () => {
      const mockModel = new MockLanguageModelV4({
        modelId: "mock-openai-stream-text",
        doStream: async () => ({
          stream: new ReadableStream({
            start(controller) {
              controller.enqueue({ type: "text-delta", id: "t1", delta: "Streaming chunk 1" });
              controller.enqueue({
                type: "finish",
                finishReason: { unified: "stop", raw: "stop" },
                usage: {
                  inputTokens: { total: 5, noCache: 5, cacheRead: 0, cacheWrite: 0 },
                  outputTokens: { total: 10, text: 10, reasoning: 0 },
                },
              });
              controller.close();
            },
          }),
        }),
      });

      const stream = await streamLlmText({
        provider: "openai-compatible",
        customModel: mockModel,
        prompt: "Stream prompt",
        telemetryFunctionId: "newsstudio.test.streamText",
      });

      expect(stream.providerUsed).toBe("openai-compatible");
      expect(stream.modelUsed).toBe("mock-openai-stream-text");
    });

    it("resolves dynamic fallback provider from openai-compatible appropriately", () => {
      // 1. With Gemini key present, fallback is gemini
      process.env.GEMINI_API_KEY = "test-gemini-key";
      expect(resolveFallbackProvider("openai-compatible")).toBe("gemini");

      // 2. Without Gemini key present, fallback is ollama
      delete process.env.GEMINI_API_KEY;
      delete process.env.GOOGLE_API_KEY;
      expect(resolveFallbackProvider("openai-compatible")).toBe("ollama");

      // 3. Mutual Gemini <-> Ollama fallback remains intact
      expect(resolveFallbackProvider("gemini")).toBe("ollama");
      expect(resolveFallbackProvider("ollama")).toBe("gemini");

      // 4. Fallback from openai-compatible chooses gemini if tenant BYOK has geminiApiKey
      const tenantCreds = {
        companyId: "tenant_fallback_test",
        geminiApiKey: "byok-gemini-key",
      };
      expect(resolveFallbackProvider("openai-compatible", tenantCreds)).toBe("gemini");
    });

    it("prevents primary provider's apiKey and baseURL from leaking to fallback provider", () => {
      const params = {
        provider: "openai-compatible" as const,
        apiKey: "sk-openai-primary-key",
        baseURL: "http://openai-server:8000/v1",
        fallbackModel: "qwen2.5:3b",
      };

      // Execution on primary provider keeps credentials
      const primaryRes = resolveProviderExecutionParams("openai-compatible", "openai-compatible", params);
      expect(primaryRes.apiKeyToUse).toBe("sk-openai-primary-key");
      expect(primaryRes.baseUrlToUse).toBe("http://openai-server:8000/v1");

      // Failover to secondary provider (Ollama) MUST NOT bleed primary credentials
      const fallbackRes = resolveProviderExecutionParams("ollama", "openai-compatible", params);
      expect(fallbackRes.apiKeyToUse).toBeUndefined();
      expect(fallbackRes.baseUrlToUse).toBeUndefined();
      expect(fallbackRes.modelToUse).toBe("qwen2.5:3b");
    });

    it("extracts structured JSON and strips <think> tags on openai-compatible provider", async () => {
      const mockModel = new MockLanguageModelV4({
        modelId: "mock-openai-reasoning-object",
        doGenerate: async () => ({
          warnings: [],
          finishReason: { unified: "stop", raw: "stop" },
          usage: {
            inputTokens: { total: 20, noCache: 20, cacheRead: 0, cacheWrite: 0 },
            outputTokens: { total: 50, text: 50, reasoning: 30 },
          },
          content: [
            {
              type: "text",
              text: "<think>Let me analyze the news story and verify details...</think>\n```json\n{\n  \"status\": \"verified\",\n  \"confidence\": 0.95\n}\n```",
            },
          ],
        }),
      });

      const schema = z.object({
        status: z.string(),
        confidence: z.number(),
      });

      const res = await generateLlmObject({
        provider: "openai-compatible",
        customModel: mockModel,
        schema,
        prompt: "Verify claim",
        telemetryFunctionId: "newsstudio.test.reasoningObject",
      });

      expect(res.object).toEqual({ status: "verified", confidence: 0.95 });
      expect(res.providerUsed).toBe("openai-compatible");
    });
  });

  // =========================================================================
  // 3. Multi-Tenant BYOK & Admin Settings Masking
  // =========================================================================
  describe("Multi-Tenant BYOK & Key Masking for OpenAI-Compatible", () => {
    it("masks API keys with •••• + last 4 characters correctly", () => {
      expect(maskApiKey("sk-or-v1-abcdef1234567890")).toBe("••••7890");
      expect(maskApiKey("1234")).toBe("••••");
      expect(maskApiKey("12345")).toBe("••••2345");
      expect(maskApiKey("")).toBe("");
      expect(maskApiKey(undefined)).toBe("");
      expect(isMaskedKey("••••7890")).toBe(true);
      expect(isMaskedKey("sk-or-v1-abcdef1234567890")).toBe(false);
    });

    it("saves and retrieves tenant credentials with openai-compatible fields", async () => {
      const storedData = {
        companyId: "org_openai_compat",
        provider: "openai-compatible",
        openaiCompatibleApiKey: "sk-or-v1-secret-key-1234",
        openaiCompatibleBaseUrl: "https://openrouter.ai/api/v1",
        tierModels: {
          realtime: "gpt-4o-mini",
        },
      };

      vi.mocked(prisma.systemSetting.findFirst).mockResolvedValueOnce({
        id: "byok_row_1",
        companyId: "org_openai_compat",
        key: BYOK_SETTINGS_KEY,
        value: JSON.stringify(storedData),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const creds = await getTenantCredentials("org_openai_compat");
      expect(creds).not.toBeNull();
      expect(creds?.provider).toBe("openai-compatible");
      expect(creds?.openaiCompatibleApiKey).toBe("sk-or-v1-secret-key-1234");
      expect(creds?.openaiCompatibleBaseUrl).toBe("https://openrouter.ai/api/v1");
      expect(creds?.tierModels?.realtime).toBe("gpt-4o-mini");
    });

    it("preserves existing secret key when saving with masked key indicator", async () => {
      // Mock initial findFirst returning unmasked key
      vi.mocked(prisma.systemSetting.findFirst).mockResolvedValueOnce({
        id: "byok_row_2",
        companyId: "org_openai_compat",
        key: BYOK_SETTINGS_KEY,
        value: JSON.stringify({
          companyId: "org_openai_compat",
          provider: "openai-compatible",
          openaiCompatibleApiKey: "sk-real-secret-key-9999",
          openaiCompatibleBaseUrl: "https://openrouter.ai/api/v1",
        }),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      // Save updated settings with masked key
      await saveTenantCredentials("org_openai_compat", {
        provider: "openai-compatible",
        openaiCompatibleApiKey: "••••9999", // Masked key sent from UI
        openaiCompatibleBaseUrl: "https://updated-router.ai/api/v1",
      });

      // Verify that prisma.systemSetting.create was called with preserved unmasked key
      expect(prisma.systemSetting.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyId: "org_openai_compat",
            value: expect.stringContaining("sk-real-secret-key-9999"),
          }),
        })
      );
    });

    it("calculates LLM token cost accurately for openai-compatible providers", () => {
      // Local / vLLM models are $0.0
      const localCost = calculateLlmCost("openai-compatible", "local/llama-3.1-8b", 10000, 5000);
      expect(localCost).toBe(0.0);

      const vllmCost = calculateLlmCost("openai-compatible", "vllm/qwen2.5-7b", 10000, 5000);
      expect(vllmCost).toBe(0.0);

      // Efficient models: $0.15 input / $0.60 output per 1M tokens
      const efficientCost = calculateLlmCost(
        "openai-compatible",
        "meta-llama/Llama-3.3-70B-Instruct",
        1_000_000,
        1_000_000
      );
      expect(efficientCost).toBeCloseTo(0.15 + 0.6, 4);

      // Frontier models: $2.50 input / $10.00 output per 1M tokens
      const frontierCost = calculateLlmCost(
        "openai-compatible",
        "deepseek/deepseek-r1",
        1_000_000,
        1_000_000
      );
      expect(frontierCost).toBeCloseTo(2.5 + 10.0, 4);

      // Models prefixed with ollama/ on openai-compatible proxy are 0.0
      const ollamaProxyCost = calculateLlmCost(
        "openai-compatible",
        "ollama/qwen2.5:7b",
        5000,
        2500
      );
      expect(ollamaProxyCost).toBe(0.0);
    });

    it("exports POST as alias for PUT in admin settings route and masks openaiCompatibleApiKey", () => {
      expect(settingsPost).toBe(settingsPut);

      const unmaskedSettings = {
        llm: {
          provider: "openai-compatible" as const,
          model: "gpt-4o-mini",
          apiKey: "AIzaSySecretGeminiKey1234",
          openaiCompatibleApiKey: "sk-or-v1-secret-openai-key-5678",
          tiers: {
            gemini: { realtime: "gemini-2.5-flash", structured: "gemini-2.5-flash", reasoning: "gemini-2.5-pro", vision: "gemini-2.5-flash" },
            ollama: { realtime: "qwen2.5:3b", structured: "qwen3.5:9b", reasoning: "qwen3.5:32b", vision: "llava" },
            "openai-compatible": { realtime: "gpt-4o-mini", structured: "gpt-4o-mini", reasoning: "gpt-4o", vision: "gpt-4o-mini" },
          },
        },
        servers: {
          ttsUrl: "http://localhost:8005",
          comfyuiUrl: "http://localhost:8188",
          ollamaUrl: "http://localhost:11434",
          openaiCompatibleUrl: "https://openrouter.ai/api/v1",
        },
        stock: { providerPriority: ["pexels"], pexelsApiKey: "", pixabayApiKey: "" },
        music: { providerPriority: [] },
        rendering: { defaultAspectRatio: "horizontal" as const, defaultCaptionStyle: "minimal" as const, defaultBgMusicVolume: 0.2 },
        automation: { globalAutoScript: true, globalAutoPublish: false, globalRequireApproval: true, schedulerIntervalMinutes: 30 },
        webhooks: { slackUrl: "", discordUrl: "" },
      };

      const masked = maskAdminSettings(unmaskedSettings);
      expect(masked.llm.openaiCompatibleApiKey).toBe("••••5678");
      expect(masked.llm.apiKey).toBe("••••1234");
      expect(masked.servers.openaiCompatibleUrl).toBe("https://openrouter.ai/api/v1");
    });
  });

  // =========================================================================
  // 4. OpenTelemetry Spans & Instrumentation Lifecycle
  // =========================================================================
  describe("OpenTelemetry Instrumentation", () => {
    it("initializes registerOTel and registerTelemetry idempotently", async () => {
      expect(isTelemetryInitialized()).toBe(false);

      await register();
      expect(isTelemetryInitialized()).toBe(true);

      // Second invocation should be a no-op and not re-register or throw
      await register();
      expect(isTelemetryInitialized()).toBe(true);
    });

    it("resets telemetry initialization status via resetInstrumentationForTests", async () => {
      await register();
      expect(isTelemetryInitialized()).toBe(true);

      resetInstrumentationForTests();
      expect(isTelemetryInitialized()).toBe(false);
    });
  });

  // =========================================================================
  // 5. Undici Keep-Alive Connection Pooling
  // =========================================================================
  describe("Undici Keep-Alive Connection Pooling", () => {
    it("exports globalUndiciAgent configured with Keep-Alive parameters", () => {
      expect(globalUndiciAgent).toBeDefined();
    });

    it("attaches globalUndiciAgent as dispatcher in pooledFetch", async () => {
      const mockResponse = new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

      const originalFetch = global.fetch;
      let capturedInit: RequestInit | undefined;

      global.fetch = vi.fn().mockImplementation(async (_url: string | URL, init?: RequestInit) => {
        capturedInit = init;
        return mockResponse;
      });

      try {
        const res = await pooledFetch("https://api.groq.com/openai/v1/models");
        expect(res.status).toBe(200);
        expect(capturedInit).toBeDefined();
        // Check that Connection: keep-alive header is present
        const headers = capturedInit?.headers as Headers;
        expect(headers.get("Connection")).toBe("keep-alive");
        // Check that dispatcher is attached
        const customInit = capturedInit as { dispatcher?: unknown };
        expect(customInit.dispatcher).toBe(globalUndiciAgent);
      } finally {
        global.fetch = originalFetch;
      }
    });

    it("allows custom dispatcher override in pooledFetch options", async () => {
      const mockResponse = new Response(JSON.stringify({ status: "custom" }), { status: 200 });
      const customDispatcher = {} as any;

      const originalFetch = global.fetch;
      let capturedInit: RequestInit | undefined;

      global.fetch = vi.fn().mockImplementation(async (_url: string | URL, init?: RequestInit) => {
        capturedInit = init;
        return mockResponse;
      });

      try {
        await pooledFetch("https://api.groq.com/openai/v1/models", {
          dispatcher: customDispatcher,
        });
        const customInit = capturedInit as { dispatcher?: unknown };
        expect(customInit.dispatcher).toBe(customDispatcher);
      } finally {
        global.fetch = originalFetch;
      }
    });

    it("verifies pipeline-worker routes HTTP requests through pooledFetch Keep-Alive dispatcher", async () => {
      const mockResponse = new Response(JSON.stringify({ ok: true }), { status: 200 });
      const originalFetch = global.fetch;
      let capturedInit: RequestInit | undefined;

      global.fetch = vi.fn().mockImplementation(async (_url: string | URL, init?: RequestInit) => {
        capturedInit = init;
        return mockResponse;
      });

      try {
        await sendHeartbeat({
          workerId: "test-worker-1",
          hostname: "test-host",
          type: "full",
          status: "idle",
        });

        expect(capturedInit).toBeDefined();
        const customInit = capturedInit as { dispatcher?: unknown };
        expect(customInit.dispatcher).toBe(globalUndiciAgent);
        const headers = capturedInit?.headers as Headers;
        expect(headers.get("Connection")).toBe("keep-alive");
      } finally {
        global.fetch = originalFetch;
      }
    });
  });
});
