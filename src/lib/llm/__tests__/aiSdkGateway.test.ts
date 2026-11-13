import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { z } from "zod";
import { MockLanguageModelV4 } from "ai/test";
import { APICallError } from "ai";
import {
  generateLlmText,
  generateLlmObject,
  streamLlmText,
  streamLlmObject,
  cleanJsonText,
  getDefaultProvider,
  resolveLanguageModel,
} from "@/lib/llm/aiSdkGateway";
import {
  trackLlmUsage,
  trackGeminiUsage,
  calculateLlmCost,
} from "@/lib/llm/tokenTracker";
import { getProvider, generateScript, normalizeTextForAudio } from "@/lib/llm/client";
import { generateWithGemini } from "@/lib/llm/providers/gemini";
import { generateWithOllama } from "@/lib/llm/providers/ollama";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    aiTokenUsage: {
      create: vi.fn().mockResolvedValue({ id: "token-usage-id" }),
    },
    usageLog: {
      create: vi.fn().mockResolvedValue({ id: "usage-log-id" }),
    },
    $transaction: vi.fn().mockImplementation(async (ops: any[]) => {
      return Promise.all(ops);
    }),
  },
}));

describe("cleanJsonText helper", () => {
  it("should strip <think>...</think> tags", () => {
    const raw = "<think>Analyzing the user request carefully...</think>{\"status\":\"ok\"}";
    expect(cleanJsonText(raw)).toBe("{\"status\":\"ok\"}");
  });

  it("should extract JSON from markdown fences", () => {
    const raw = "```json\n{\"foo\":\"bar\"}\n```";
    expect(cleanJsonText(raw)).toBe("{\"foo\":\"bar\"}");
  });

  it("should extract JSON from fenced block with think tags", () => {
    const raw = "<think>\nThinking...\n</think>\n```json\n{\"count\":42}\n```";
    expect(cleanJsonText(raw)).toBe("{\"count\":42}");
  });

  it("should extract JSON object surrounded by conversational filler", () => {
    const raw = "Sure! Here is the output you asked for:\n{\"result\":true}\nHope this helps!";
    expect(cleanJsonText(raw)).toBe("{\"result\":true}");
  });

  it("should extract JSON array surrounded by conversational text", () => {
    const raw = "Here are the items:\n[{\"id\":1},{\"id\":2}]\nEnjoy!";
    expect(cleanJsonText(raw)).toBe("[{\"id\":1},{\"id\":2}]");
  });

  it("should extract JSON object when conversational prefix contains brackets", () => {
    const raw = "[Breaking Alert]: {\"headline\":\"AI Breakthrough\",\"urgency\":9}\nEnd of dispatch.";
    expect(cleanJsonText(raw)).toBe("{\"headline\":\"AI Breakthrough\",\"urgency\":9}");
  });

  it("should extract JSON array when conversational prefix contains braces", () => {
    const raw = "Here is {the requested breakdown}:\n[{\"id\":1},{\"id\":2}]\nDone.";
    expect(cleanJsonText(raw)).toBe("[{\"id\":1},{\"id\":2}]");
  });

  it("should extract JSON containing brackets and braces inside string values", () => {
    const raw = "Result:\n{\"title\":\"Headline with [bracket] and {brace}\",\"valid\":true}\nThanks!";
    expect(cleanJsonText(raw)).toBe("{\"title\":\"Headline with [bracket] and {brace}\",\"valid\":true}");
  });

  it("should repair truncated JSON with unclosed arrays and objects", () => {
    const raw = "{\"headline\":\"Truncated\",\"tags\":[\"tech\",\"ai\"";
    expect(cleanJsonText(raw)).toBe("{\"headline\":\"Truncated\",\"tags\":[\"tech\",\"ai\"]}");
  });

  it("should repair truncated JSON ending with trailing comma after array item", () => {
    const raw = "{\"headline\":\"Truncated\",\"tags\":[\"tech\",\"ai\"], ";
    expect(cleanJsonText(raw)).toBe("{\"headline\":\"Truncated\",\"tags\":[\"tech\",\"ai\"]}");
  });

  it("should repair truncated JSON ending with trailing comma after object key", () => {
    const raw = "{\"headline\":\"Truncated\", ";
    expect(cleanJsonText(raw)).toBe("{\"headline\":\"Truncated\"}");
  });

  it("should repair truncated JSON ending with dangling key and colon", () => {
    const raw = "{\"headline\":\"Truncated\",\"author\": ";
    expect(cleanJsonText(raw)).toBe("{\"headline\":\"Truncated\"}");
  });

  it("should repair truncated JSON when conversational prefix contains brackets", () => {
    const raw = "[Breaking Alert]: {\"headline\":\"Truncated\",\"tags\":[\"tech\"";
    expect(cleanJsonText(raw)).toBe("{\"headline\":\"Truncated\",\"tags\":[\"tech\"]}");
  });

  it("should handle already clean JSON string", () => {
    const raw = "{\"clean\":true}";
    expect(cleanJsonText(raw)).toBe("{\"clean\":true}");
  });
});

describe("Token & Cost Tracker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should calculate zero cost for local Ollama models", () => {
    const cost = calculateLlmCost("ollama", "qwen3.5:9b", 1000, 500);
    expect(cost).toBe(0.0);
  });

  it("should calculate correct Gemini Flash cost", () => {
    // 1M prompt = $0.15, 1M completion = $0.60
    const cost = calculateLlmCost("gemini", "gemini-2.5-flash", 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(0.75, 4);
  });

  it("should calculate correct Gemini Pro cost", () => {
    // 1M prompt = $1.25, 1M completion = $5.00
    const cost = calculateLlmCost("gemini", "gemini-1.5-pro", 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(6.25, 4);
  });

  it("should record token usage and log usage when companyId is provided", async () => {
    await trackLlmUsage({
      provider: "gemini",
      model: "gemini-2.5-flash",
      promptTokens: 100,
      completionTokens: 200,
      companyId: "org-123",
      storyId: "story-456",
    });

    expect(prisma.aiTokenUsage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          companyId: "org-123",
          provider: "gemini",
          model: "gemini-2.5-flash",
          promptTokens: 100,
          completionTokens: 200,
          totalTokens: 300,
          storyId: "story-456",
        }),
      })
    );

    expect(prisma.usageLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          companyId: "org-123",
          type: "llm_tokens",
          amount: 300,
        }),
      })
    );

    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it("should not create usageLog when companyId is null", async () => {
    await trackLlmUsage({
      provider: "ollama",
      model: "qwen3.5:9b",
      promptTokens: 50,
      completionTokens: 50,
      companyId: null,
    });

    expect(prisma.aiTokenUsage.create).toHaveBeenCalled();
    expect(prisma.usageLog.create).not.toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it("should preserve backward compatibility for trackGeminiUsage", async () => {
    await trackGeminiUsage(
      "org-999",
      { promptTokenCount: 80, candidatesTokenCount: 120, totalTokenCount: 200 },
      "gemini-2.5-flash",
      "story-789"
    );

    expect(prisma.aiTokenUsage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          companyId: "org-999",
          provider: "gemini",
          model: "gemini-2.5-flash",
          promptTokens: 80,
          completionTokens: 120,
          totalTokens: 200,
          storyId: "story-789",
        }),
      })
    );
  });
});

describe("AI SDK Gateway — Text Generation & Reasoning", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("should generate text and cleanly strip <think> blocks via middleware", async () => {
    const mockModel = new MockLanguageModelV4({
      doGenerate: async () => ({
        warnings: [],
        finishReason: { unified: "stop", raw: "stop" },
        usage: {
          inputTokens: { total: 15, noCache: 15, cacheRead: 0, cacheWrite: 0 },
          outputTokens: { total: 25, text: 25, reasoning: 0 },
        },
        content: [
          {
            type: "text",
            text: "<think>Let me ponder this topic deeply.</think>Breaking news in artificial intelligence.",
          },
        ],
      }),
    });

    const result = await generateLlmText({
      prompt: "Give me breaking news",
      customModel: mockModel,
    });

    expect(result.text).toBe("Breaking news in artificial intelligence.");
    expect(result.reasoning).toContain("Let me ponder this topic deeply.");
    expect(result.usage?.inputTokens).toBe(15);
    expect(result.usage?.outputTokens).toBe(25);
  });

  it("should respect provider default from env", () => {
    process.env.LLM_PROVIDER = "ollama";
    expect(getDefaultProvider()).toBe("ollama");
    expect(getProvider()).toBe("ollama");

    process.env.LLM_PROVIDER = "gemini";
    expect(getDefaultProvider()).toBe("gemini");
    expect(getProvider()).toBe("gemini");
  });
});

describe("AI SDK Gateway — Structured Object Generation", () => {
  const TestArticleSchema = z.object({
    headline: z.string(),
    tags: z.array(z.string()),
    urgency: z.number().int().min(1).max(10),
  });

  it("should generate structured object matching schema directly", async () => {
    const mockModel = new MockLanguageModelV4({
      doGenerate: async () => ({
        warnings: [],
        finishReason: { unified: "stop", raw: "stop" },
        usage: {
          inputTokens: { total: 20, noCache: 20, cacheRead: 0, cacheWrite: 0 },
          outputTokens: { total: 40, text: 40, reasoning: 0 },
        },
        content: [
          {
            type: "text",
            text: JSON.stringify({
              headline: "Tech Breakthrough 2026",
              tags: ["AI", "Tech"],
              urgency: 9,
            }),
          },
        ],
      }),
    });

    const result = await generateLlmObject({
      schema: TestArticleSchema,
      prompt: "Generate an article",
      customModel: mockModel,
    });

    expect(result.object.headline).toBe("Tech Breakthrough 2026");
    expect(result.object.tags).toEqual(["AI", "Tech"]);
    expect(result.object.urgency).toBe(9);
  });

  it("should perform text-based JSON repair when structured output contains fences or think blocks", async () => {
    let callCount = 0;
    const mockModel = new MockLanguageModelV4({
      doGenerate: async () => {
        callCount++;
        // If structured mode throws, text mode fallback returns fenced JSON
        return {
          warnings: [],
          finishReason: { unified: "stop", raw: "stop" },
          usage: {
            inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
            outputTokens: { total: 30, text: 30, reasoning: 0 },
          },
          content: [
            {
              type: "text",
              text: "<think>I must format properly.</think>\n```json\n{\"headline\":\"Repaired Headline\",\"tags\":[\"repair\"],\"urgency\":7}\n```",
            },
          ],
        };
      },
    });

    const result = await generateLlmObject({
      schema: TestArticleSchema,
      prompt: "Generate article with repair",
      customModel: mockModel,
    });

    expect(result.object.headline).toBe("Repaired Headline");
    expect(result.object.tags).toEqual(["repair"]);
    expect(result.object.urgency).toBe(7);
  });
});

describe("AI SDK Gateway — Streaming", () => {
  it("should stream text chunks via streamLlmText", async () => {
    const mockModel = new MockLanguageModelV4({
      doStream: async () => ({
        stream: new ReadableStream({
          start(controller) {
            controller.enqueue({ type: "text-delta", id: "1", delta: "Hello " });
            controller.enqueue({ type: "text-delta", id: "2", delta: "World" });
            controller.enqueue({
              type: "finish",
              finishReason: { unified: "stop", raw: "stop" },
              usage: {
                inputTokens: { total: 5, noCache: 5, cacheRead: 0, cacheWrite: 0 },
                outputTokens: { total: 8, text: 8, reasoning: 0 },
              },
            });
            controller.close();
          },
        }),
      }),
    });

    const streamResult = await streamLlmText({
      prompt: "Say hello",
      customModel: mockModel,
    });

    let fullText = "";
    for await (const chunk of streamResult.textStream) {
      fullText += chunk;
    }

    expect(fullText).toBe("Hello World");
  });
});

describe("AI SDK Gateway — Failover & Provider Routing", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("should fail immediately if allowFallback is false and provider fails", async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;

    await expect(
      generateLlmText({
        provider: "gemini",
        prompt: "Hello",
        allowFallback: false,
      })
    ).rejects.toThrow("GEMINI_API_KEY is not set in environment variables");
  });

  it("should attempt fallback when primary fails and allowFallback is true", async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Ollama connection refused"));

    await expect(
      generateLlmText({
        provider: "gemini",
        prompt: "Hello",
        allowFallback: true,
      })
    ).rejects.toThrow(/All LLM providers failed\. Primary \(gemini\): .* Fallback \(ollama\):/);
  });

  it("should fail immediately in streamLlmText when allowFallback is false", async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;

    await expect(
      streamLlmText({
        provider: "gemini",
        prompt: "Stream test",
        allowFallback: false,
      })
    ).rejects.toThrow("GEMINI_API_KEY is not set in environment variables");
  });

  it("should route streamLlmText to fallback provider when primary provider init fails", async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;

    // Primary gemini fails because of missing key, fallback is ollama
    const stream = await streamLlmText({
      provider: "gemini",
      prompt: "Stream test",
      allowFallback: true,
    });

    expect(stream.providerUsed).toBe("ollama");
  });

  it("should route streamLlmObject to fallback provider when primary provider init fails", async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;

    const stream = await streamLlmObject({
      provider: "gemini",
      schema: z.object({ title: z.string() }),
      prompt: "Stream object test",
      allowFallback: true,
    });

    expect(stream.providerUsed).toBe("ollama");
  });

  it("should resolve Ollama baseURL using OLLAMA_URL if OLLAMA_BASE_URL is not set", () => {
    delete process.env.OLLAMA_BASE_URL;
    process.env.OLLAMA_URL = "http://remote-ollama:11434";

    const resolved = resolveLanguageModel({
      provider: "ollama",
      skipMiddleware: true,
    });

    expect(resolved.provider).toBe("ollama");
    expect(resolved.modelId).toBe("qwen3.5:9b");
  });

  it("should normalize Ollama baseURL with trailing slashes or /api/", () => {
    delete process.env.OLLAMA_BASE_URL;
    process.env.OLLAMA_URL = "http://remote-ollama:11434/api/";

    const resolved = resolveLanguageModel({
      provider: "ollama",
      skipMiddleware: true,
    });
    expect(resolved.provider).toBe("ollama");

    process.env.OLLAMA_BASE_URL = "http://remote-ollama:11434/";
    delete process.env.OLLAMA_URL;
    const resolvedSlash = resolveLanguageModel({
      provider: "ollama",
      skipMiddleware: true,
    });
    expect(resolvedSlash.provider).toBe("ollama");
  });

  it("should avoid model bleed on streamLlmText failover when primary model is set", async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;

    const stream = await streamLlmText({
      provider: "gemini",
      model: "gemini-2.5-pro",
      prompt: "Stream test",
      allowFallback: true,
    });

    expect(stream.providerUsed).toBe("ollama");
    expect(stream.modelUsed).toBe("qwen3.5:9b");
  });

  it("should respect fallbackModel on streamLlmText failover", async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;

    const stream = await streamLlmText({
      provider: "gemini",
      model: "gemini-2.5-pro",
      fallbackModel: "qwen2.5:3b",
      prompt: "Stream test",
      allowFallback: true,
    });

    expect(stream.providerUsed).toBe("ollama");
    expect(stream.modelUsed).toBe("qwen2.5:3b");
  });

  it("should avoid model bleed on streamLlmObject failover when primary model is set", async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;

    const stream = await streamLlmObject({
      provider: "gemini",
      model: "gemini-2.5-pro",
      schema: z.object({ title: z.string() }),
      prompt: "Stream object test",
      allowFallback: true,
    });

    expect(stream.providerUsed).toBe("ollama");
    expect(stream.modelUsed).toBe("qwen3.5:9b");
  });

  it("should respect fallbackModel on streamLlmObject failover", async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;

    const stream = await streamLlmObject({
      provider: "gemini",
      model: "gemini-2.5-pro",
      fallbackModel: "qwen2.5:3b",
      schema: z.object({ title: z.string() }),
      prompt: "Stream object test",
      allowFallback: true,
    });

    expect(stream.providerUsed).toBe("ollama");
    expect(stream.modelUsed).toBe("qwen2.5:3b");
  });

  it("should avoid model bleed on generateLlmText failover when primary model is set", async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;

    const mockResponse = {
      model: "qwen3.5:9b",
      created_at: new Date().toISOString(),
      message: { role: "assistant", content: "Fallback text" },
      done: true,
      prompt_eval_count: 10,
      eval_count: 20,
    };

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const result = await generateLlmText({
      provider: "gemini",
      model: "gemini-2.5-pro",
      prompt: "Hello",
      allowFallback: true,
    });

    expect(result.providerUsed).toBe("ollama");
    expect(result.modelUsed).toBe("qwen3.5:9b");
    expect(result.text).toBe("Fallback text");

    fetchSpy.mockRestore();
  });

  it("should respect fallbackModel on generateLlmText failover", async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;

    const mockResponse = {
      model: "qwen2.5:3b",
      created_at: new Date().toISOString(),
      message: { role: "assistant", content: "Fallback with specific model" },
      done: true,
      prompt_eval_count: 10,
      eval_count: 20,
    };

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const result = await generateLlmText({
      provider: "gemini",
      model: "gemini-2.5-pro",
      fallbackModel: "qwen2.5:3b",
      prompt: "Hello",
      allowFallback: true,
    });

    expect(result.providerUsed).toBe("ollama");
    expect(result.modelUsed).toBe("qwen2.5:3b");
    expect(result.text).toBe("Fallback with specific model");

    fetchSpy.mockRestore();
  });

  it("should avoid model bleed on generateLlmObject failover when primary model is set", async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;

    const mockResponse = {
      model: "qwen3.5:9b",
      created_at: new Date().toISOString(),
      message: {
        role: "assistant",
        content: JSON.stringify({ headline: "Fallback Object", tags: ["news"], urgency: 5 }),
      },
      done: true,
      prompt_eval_count: 10,
      eval_count: 20,
    };

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const result = await generateLlmObject({
      provider: "gemini",
      model: "gemini-2.5-pro",
      schema: z.object({ headline: z.string(), tags: z.array(z.string()), urgency: z.number() }),
      prompt: "Hello",
      allowFallback: true,
    });

    expect(result.providerUsed).toBe("ollama");
    expect(result.modelUsed).toBe("qwen3.5:9b");
    expect(result.object.headline).toBe("Fallback Object");

    fetchSpy.mockRestore();
  });

  it("should respect fallbackModel on generateLlmObject failover", async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;

    const mockResponse = {
      model: "qwen2.5:3b",
      created_at: new Date().toISOString(),
      message: {
        role: "assistant",
        content: JSON.stringify({ headline: "Fallback Custom Model Object", tags: ["news"], urgency: 8 }),
      },
      done: true,
      prompt_eval_count: 10,
      eval_count: 20,
    };

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const result = await generateLlmObject({
      provider: "gemini",
      model: "gemini-2.5-pro",
      fallbackModel: "qwen2.5:3b",
      schema: z.object({ headline: z.string(), tags: z.array(z.string()), urgency: z.number() }),
      prompt: "Hello",
      allowFallback: true,
    });

    expect(result.providerUsed).toBe("ollama");
    expect(result.modelUsed).toBe("qwen2.5:3b");
    expect(result.object.headline).toBe("Fallback Custom Model Object");

    fetchSpy.mockRestore();
  });

  it("should avoid reverse model bleed on Ollama to Gemini failover for generateLlmObject", async () => {
    process.env.GEMINI_API_KEY = "dummy-gemini-key";

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes("11434") || urlStr.includes("ollama")) {
        throw new Error("Ollama connection refused");
      }
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({ headline: "Gemini Schema Output", tags: ["world"], urgency: 6 }),
                  },
                ],
              },
              finishReason: "STOP",
            },
          ],
          usageMetadata: { promptTokenCount: 15, candidatesTokenCount: 25, totalTokenCount: 40 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    const result = await generateLlmObject({
      provider: "ollama",
      model: "qwen2.5:3b",
      schema: z.object({ headline: z.string(), tags: z.array(z.string()), urgency: z.number() }),
      prompt: "Hello",
      allowFallback: true,
    });

    expect(result.providerUsed).toBe("gemini");
    expect(result.modelUsed).toBe("gemini-2.5-flash");
    expect(result.object.headline).toBe("Gemini Schema Output");

    fetchSpy.mockRestore();
  });

  it("should respect fallbackModel on Ollama to Gemini failover for generateLlmObject", async () => {
    process.env.GEMINI_API_KEY = "dummy-gemini-key";

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes("11434") || urlStr.includes("ollama")) {
        throw new Error("Ollama connection refused");
      }
      expect(urlStr).toContain("gemini-2.5-pro");
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({ headline: "Gemini Pro Schema Output", tags: ["tech"], urgency: 9 }),
                  },
                ],
              },
              finishReason: "STOP",
            },
          ],
          usageMetadata: { promptTokenCount: 15, candidatesTokenCount: 25, totalTokenCount: 40 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    const result = await generateLlmObject({
      provider: "ollama",
      model: "qwen2.5:3b",
      fallbackModel: "gemini-2.5-pro",
      schema: z.object({ headline: z.string(), tags: z.array(z.string()), urgency: z.number() }),
      prompt: "Hello",
      allowFallback: true,
    });

    expect(result.providerUsed).toBe("gemini");
    expect(result.modelUsed).toBe("gemini-2.5-pro");
    expect(result.object.headline).toBe("Gemini Pro Schema Output");

    fetchSpy.mockRestore();
  });
});

describe("LLM Client & Normalization Integration", () => {
  it("should fall back to local heuristic text preprocessor if all LLMs are unreachable in normalizeTextForAudio", async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Ollama connection refused"));

    const rawSubtitle = "La empresa reportó $4.5B en Q3.";
    const result = await normalizeTextForAudio(rawSubtitle, {
      language: "es",
      engine: "piper",
    });

    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("should accept maxRetries in generateWithGemini and generateWithOllama", async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;

    await expect(
      generateWithGemini(
        { title: "Test", content: "Content" },
        { maxRetries: 2 }
      )
    ).rejects.toThrow("GEMINI_API_KEY is not set in environment variables");

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(
        JSON.stringify({
          model: "qwen3.5:9b",
          created_at: new Date().toISOString(),
          message: {
            role: "assistant",
            content: JSON.stringify({
              headline: "Test headline",
              segments: [
                { index: 0, start_time: 0, end_time: 10, text: "Seg 1", image_prompt: "img 1" },
                { index: 1, start_time: 10, end_time: 20, text: "Seg 2", image_prompt: "img 2" },
                { index: 2, start_time: 20, end_time: 30, text: "Seg 3", image_prompt: "img 3" },
              ],
            }),
          },
          done: true,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const result = await generateWithOllama(
      { title: "Test", content: "Content" },
      { maxRetries: 3 }
    );
    expect(result.headline).toBe("Test headline");
    expect(result.segments).toHaveLength(3);

    fetchSpy.mockRestore();
  });

  it("should pass model and fallbackModel through normalizeTextForAudio", async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;

    const mockResponse = {
      model: "qwen2.5:3b",
      created_at: new Date().toISOString(),
      message: { role: "assistant", content: "Texto normalizado" },
      done: true,
    };

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const result = await normalizeTextForAudio("Texto de prueba $100.", {
      provider: "gemini",
      model: "gemini-2.5-pro",
      fallbackModel: "qwen2.5:3b",
      language: "es",
    });

    expect(result).toBe("Texto normalizado");

    fetchSpy.mockRestore();
  });

  it("should avoid reverse model bleed on Ollama to Gemini failover", async () => {
    process.env.GEMINI_API_KEY = "dummy-gemini-key";

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes("11434") || urlStr.includes("ollama")) {
        throw new Error("Ollama connection refused");
      }
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: { parts: [{ text: "Gemini response text" }] },
              finishReason: "STOP",
            },
          ],
          usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20, totalTokenCount: 30 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    const result = await generateLlmText({
      provider: "ollama",
      model: "qwen2.5:3b",
      prompt: "Hello",
      allowFallback: true,
    });

    expect(result.providerUsed).toBe("gemini");
    expect(result.modelUsed).toBe("gemini-2.5-flash");
    expect(result.text).toBe("Gemini response text");

    fetchSpy.mockRestore();
  });

  it("should respect fallbackModel on Ollama to Gemini failover for generateLlmText", async () => {
    process.env.GEMINI_API_KEY = "dummy-gemini-key";

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes("11434") || urlStr.includes("ollama")) {
        throw new Error("Ollama connection refused");
      }
      expect(urlStr).toContain("gemini-2.5-pro");
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: { parts: [{ text: "Gemini Pro response text" }] },
              finishReason: "STOP",
            },
          ],
          usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20, totalTokenCount: 30 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    const result = await generateLlmText({
      provider: "ollama",
      model: "qwen2.5:3b",
      fallbackModel: "gemini-2.5-pro",
      prompt: "Hello",
      allowFallback: true,
    });

    expect(result.providerUsed).toBe("gemini");
    expect(result.modelUsed).toBe("gemini-2.5-pro");
    expect(result.text).toBe("Gemini Pro response text");

    fetchSpy.mockRestore();
  });

  it("should honor maxRetries option on retryable errors", async () => {
    let callCount0 = 0;
    const model0 = new MockLanguageModelV4({
      doGenerate: async () => {
        callCount0++;
        throw new APICallError({
          message: "transient rate limit",
          isRetryable: true,
          url: "http://test",
          requestBodyValues: {},
        });
      },
    });

    await expect(
      generateLlmText({
        prompt: "Hello",
        customModel: model0,
        maxRetries: 0,
      })
    ).rejects.toThrow();
    expect(callCount0).toBe(1);

    let callCount1 = 0;
    const model1 = new MockLanguageModelV4({
      doGenerate: async () => {
        callCount1++;
        if (callCount1 === 1) {
          throw new APICallError({
            message: "transient network glitch",
            isRetryable: true,
            url: "http://test",
            requestBodyValues: {},
          });
        }
        return {
          warnings: [],
          finishReason: { unified: "stop", raw: "stop" },
          usage: {
            inputTokens: { total: 5, noCache: 5, cacheRead: 0, cacheWrite: 0 },
            outputTokens: { total: 5, text: 5, reasoning: 0 },
          },
          content: [{ type: "text", text: "Recovered on retry" }],
        };
      },
    });

    const result = await generateLlmText({
      prompt: "Hello",
      customModel: model1,
      maxRetries: 1,
    });
    expect(result.text).toBe("Recovered on retry");
    expect(callCount1).toBe(2);
  });

  it("should unwrap ZodArray element correctly when output is array in streamLlmObject", async () => {
    const arrayItemSchema = z.object({ id: z.string(), label: z.string() });
    const fullArraySchema = z.array(arrayItemSchema);

    const mockModel = new MockLanguageModelV4({
      doGenerate: async () => ({
        content: [
          {
            type: "text",
            text: JSON.stringify({ elements: [{ id: "item-1", label: "First" }] }),
          },
        ],
        finishReason: { unified: "stop", raw: "stop" },
        usage: {
          inputTokens: { total: 5, noCache: 5, cacheRead: 0, cacheWrite: 0 },
          outputTokens: { total: 10, text: 10, reasoning: 0 },
        },
        warnings: [],
      }),
      doStream: async () => {
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue({ type: "text-start", id: "t1" });
            controller.enqueue({
              type: "text-delta",
              id: "t1",
              delta: JSON.stringify({ elements: [{ id: "item-1", label: "First" }] }),
            });
            controller.enqueue({ type: "text-end", id: "t1" });
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
        });
        return { stream };
      },
    });

    const stream = await streamLlmObject({
      schema: fullArraySchema,
      output: "array",
      customModel: mockModel,
      prompt: "Generate items",
    });

    expect(stream).toBeDefined();
    const elements = [];
    if ("elementStream" in stream) {
      for await (const el of (stream as any).elementStream) {
        elements.push(el);
      }
    }
    const finalOutput = await stream.output;
    expect(finalOutput).toEqual([{ id: "item-1", label: "First" }]);
    expect(elements).toEqual([{ id: "item-1", label: "First" }]);
  });
});

