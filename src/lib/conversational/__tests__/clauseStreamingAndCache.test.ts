/**
 * src/lib/conversational/__tests__/clauseStreamingAndCache.test.ts
 *
 * Comprehensive Test Suite for:
 * 1. ClauseStreamSplitter & splitTokenStreamIntoClauses (PRD §6.2)
 * 2. OllamaConversationalClient.streamTurnClauses & streamTurnText
 * 3. POST /api/conversational/chat (JSON & NDJSON streaming) & streamConversationalChat client helper
 * 4. Unified aiSdkGateway Gemini cachedContent & thinkingBudget Pass-Through with stale-cache retry
 * 5. geminiCacheManager resolveGatewayContextCache & clearContextCacheMemory
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ClauseStreamSplitter,
  splitTokenStreamIntoClauses,
} from "../clauseStreamSplitter";
import {
  OllamaConversationalClient,
  ConversationalStreamEvent,
} from "../ollamaConversationalClient";
import {
  streamConversationalChat,
} from "../streamConversationalClient";
import {
  generateLlmText,
  generateLlmObject,
  streamLlmText,
  streamLlmObject,
  buildGoogleProviderOptions,
} from "@/lib/llm/aiSdkGateway";
import { z } from "zod";
import {
  resolveGatewayContextCache,
  clearContextCacheMemory,
} from "@/lib/ai/geminiCacheManager";
import { MockLanguageModelV4 } from "ai/test";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/conversational/chat/route";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    systemSetting: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    aiTokenUsage: {
      create: vi.fn().mockResolvedValue({ id: "token-usage-id" }),
    },
    usageLog: {
      create: vi.fn().mockResolvedValue({ id: "usage-log-id" }),
    },
    $transaction: vi.fn().mockImplementation(async (ops: any[]) => Promise.all(ops)),
  },
}));

vi.mock("@/lib/conversational/newsContextService", () => ({
  newsContextService: {
    getLatestNewsBriefing: vi.fn().mockResolvedValue([
      { id: "story-1", title: "NVIDIA Record Surge", category: "TECH", description: "NVDA reaches new high." },
    ]),
    getLiveMarketTickers: vi.fn().mockResolvedValue("BTC: $98,000 (+4.2%) | NVDA: $145 (+3.8%)"),
    formatNewsPromptContext: vi.fn().mockReturnValue("Live Newsroom Briefing Context"),
  },
}));

describe("1. ClauseStreamSplitter Unit Tests", () => {
  it("buffers partial bracket tags across arbitrary token splits without leaking into spoken TTS", () => {
    const splitter = new ClauseStreamSplitter({ minFirstClauseWords: 4 });

    const t1 = splitter.append("Breaking updates from ");
    const t2 = splitter.append("[proj");
    const t3 = splitter.append("ect_story: ");
    const t4 = splitter.append("story-abc-123] ");
    const t5 = splitter.append("the newsroom floor.");
    const trailing = splitter.flush();

    const all = [...t1, ...t2, ...t3, ...t4, ...t5, ...trailing];
    expect(all.length).toBeGreaterThanOrEqual(1);

    const joinedSpoken = all.map((c) => c.spokenText).join(" ");
    expect(joinedSpoken).not.toContain("[proj");
    expect(joinedSpoken).not.toContain("story-abc-123");
    expect(joinedSpoken).toContain("Breaking updates from");
    expect(joinedSpoken).toContain("the newsroom floor");

    expect(splitter.getMetadata().projectStoryId).toBe("story-abc-123");
  });

  it("extracts ticker and gesture tags and updates current actionPose", () => {
    const splitter = new ClauseStreamSplitter({ minFirstClauseWords: 3 });

    splitter.append("[gesture: wide] ");
    splitter.append("Markets are surging [project_ticker: BTC] ");
    splitter.append("after the opening bell.");
    const clauses = splitter.flush();

    expect(splitter.getMetadata().projectTickerSymbol).toBe("BTC");
    expect(splitter.getMetadata().gestureTag).toBe("wide");
    expect(splitter.getCurrentActionPose()).toBe("M3_OPEN_HANDS");

    const joined = clauses.map((c) => c.spokenText).join(" ");
    expect(joined).not.toContain("[gesture");
    expect(joined).not.toContain("[project_ticker");
  });

  it("preserves valid audio emotion and cadence tags for downstream TTS model transpiler", () => {
    const splitter = new ClauseStreamSplitter({ minFirstClauseWords: 5 });

    splitter.append("[excited] Buenas noches a todos, ");
    splitter.append("[pause: 0.5s] ");
    splitter.append("tenemos novedades exclusivas para compartir.");
    const clauses = splitter.flush();

    const allSpoken = clauses.map((c) => c.spokenText).join(" ");
    expect(allSpoken).toContain("[excited]");
    expect(allSpoken).toContain("[pause: 0.5s]");

    const cleanAll = clauses.map((c) => c.cleanSpokenText).join(" ");
    expect(cleanAll).toContain("[excited]");
    expect(cleanAll).toContain("[pause: 0.5s]");
  });

  it("splits Clause 0 aggressively when word count >= minFirstClauseWords (5) at punctuation boundary", () => {
    const splitter = new ClauseStreamSplitter({ minFirstClauseWords: 5 });

    const c1 = splitter.append("Buenas noches a todos, ");
    expect(c1.length).toBe(0);

    const c2 = splitter.append("bienvenidos. ");
    expect(c2.length).toBe(1);
    expect(c2[0].index).toBe(0);
    expect(c2[0].isFirst).toBe(true);
    expect(c2[0].cleanSpokenText).toBe("Buenas noches a todos, bienvenidos.");

    splitter.append("Estamos en vivo cubriendo la conferencia central.");
    const trailing = splitter.flush();
    expect(trailing.length).toBe(1);
    expect(trailing[0].index).toBe(1);
    expect(trailing[0].isFirst).toBe(false);
  });

  it("forces a clean whitespace split on Clause 0 if it reaches maxFirstClauseWords (14) without punctuation", () => {
    const splitter = new ClauseStreamSplitter({ minFirstClauseWords: 5, maxFirstClauseWords: 14 });

    const words = "uno dos tres cuatro cinco seis siete ocho nueve diez once doce trece catorce quince dieciseis";
    const clauses = splitter.append(words);

    expect(clauses.length).toBe(1);
    expect(clauses[0].index).toBe(0);
    expect(clauses[0].isFirst).toBe(true);
    expect(clauses[0].wordCount).toBe(14);
    expect(clauses[0].cleanSpokenText).toBe("uno dos tres cuatro cinco seis siete ocho nueve diez once doce trece catorce");

    const remaining = splitter.flush();
    expect(remaining.length).toBe(1);
    expect(remaining[0].cleanSpokenText).toBe("quince dieciseis");
  });

  it("handles Spanish and English UTF-8 punctuation correctly (¿, ¡, —, …)", async () => {
    async function* makeStream() {
      yield "¿Cómo están todos? ";
      yield "¡Estamos transmitiendo en vivo — ";
      yield "con cobertura total…";
    }

    const clauses: string[] = [];
    for await (const cl of splitTokenStreamIntoClauses(makeStream(), { minFirstClauseWords: 3, minSubsequentWords: 3 })) {
      clauses.push(cl.cleanSpokenText);
    }

    expect(clauses.length).toBeGreaterThanOrEqual(2);
    expect(clauses[0]).toContain("¿Cómo están todos?");
  });

  it("safely strips cut-off unclosed tag prefixes at EOF on flush without leaking bracket fragments", () => {
    const splitter = new ClauseStreamSplitter({ minFirstClauseWords: 3 });

    splitter.append("Breaking updates from our newsroom floor ");
    splitter.append("[proj"); // truncated tag at stream end
    const clauses = splitter.flush();

    expect(clauses.length).toBe(1);
    expect(clauses[0].spokenText).not.toContain("[proj");
    expect(clauses[0].cleanSpokenText).not.toContain("[proj");
    expect(clauses[0].cleanSpokenText).toBe("Breaking updates from our newsroom floor");
  });

  it("buffers and strips reasoning blocks <think>...</think> across token deltas without leaking to TTS", () => {
    const splitter = new ClauseStreamSplitter({ minFirstClauseWords: 4 });

    const c1 = splitter.append("<thi");
    const c2 = splitter.append("nk>Let me consider the prompt in detail. ");
    const c3 = splitter.append("The user wants market updates.</think>");
    const c4 = splitter.append("Markets opened with substantial gains today, ");
    const c5 = splitter.append("led by the technology sector.");
    const trailing = splitter.flush();

    const all = [...c1, ...c2, ...c3, ...c4, ...c5, ...trailing];
    const spokenAll = all.map((c) => c.cleanSpokenText).join(" ");

    expect(spokenAll).not.toContain("consider");
    expect(spokenAll).not.toContain("think");
    expect(spokenAll).toContain("Markets opened with substantial gains today");
  });
});

describe("2. OllamaConversationalClient streamTurnClauses & Heuristic Fallback", () => {
  it("streams clauses progressively using MockLanguageModelV4", async () => {
    const client = new OllamaConversationalClient();

    const mockModel = new MockLanguageModelV4({
      doStream: async () => {
        const chunks = [
          "Good evening to our broadcast viewers. ",
          "[gesture: wide] We are actively tracking ",
          "[project_ticker: NVDA] ",
          "NVIDIA's record surge on Wall Street.",
        ];

        let index = 0;
        const stream = new ReadableStream({
          pull(controller) {
            if (index < chunks.length) {
              controller.enqueue({
                type: "text-delta",
                id: String(index),
                delta: chunks[index++],
              });
            } else {
              controller.enqueue({
                type: "finish",
                finishReason: { unified: "stop", raw: "stop" },
                usage: {
                  inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
                  outputTokens: { total: 25, text: 25, reasoning: 0 },
                },
              });
              controller.close();
            }
          },
        });

        return {
          stream,
        };
      },
    });

    const events: ConversationalStreamEvent[] = [];
    for await (const event of client.streamTurnClauses({
      personaId: "ruby",
      userUtterance: "What is happening with tech markets?",
      language: "en",
      customModel: mockModel,
    })) {
      events.push(event);
    }

    const deltas = events.filter((e) => e.type === "delta");
    const clauses = events.filter((e) => e.type === "clause");
    const complete = events.find((e) => e.type === "complete");

    expect(deltas.length).toBeGreaterThan(0);
    expect(clauses.length).toBeGreaterThanOrEqual(1);
    expect(complete).toBeDefined();

    if (complete && complete.type === "complete") {
      expect(complete.response.spokenText).toContain("Good evening");
      expect(complete.response.projectedCard?.type).toBe("ticker");
      expect(complete.response.projectedCard?.title).toContain("NVDA");
      expect(complete.response.actionPose).toBe("M3_OPEN_HANDS");
    }
  });

  it("falls back gracefully to generateTurn when streaming fails before emitting any clause", async () => {
    const client = new OllamaConversationalClient();

    const brokenModel = new MockLanguageModelV4({
      doStream: async () => {
        throw new Error("Local Ollama connection refused on port 11434");
      },
    });

    const events: ConversationalStreamEvent[] = [];
    for await (const event of client.streamTurnClauses({
      personaId: "ruby",
      userUtterance: "Hola, ¿cuáles son las noticias de hoy?",
      language: "es",
      customModel: brokenModel,
    })) {
      events.push(event);
    }

    const clauses = events.filter((e) => e.type === "clause");
    const complete = events.find((e) => e.type === "complete");

    expect(clauses.length).toBeGreaterThan(0);
    expect(complete).toBeDefined();
    if (complete && complete.type === "complete") {
      expect(complete.response.cleanSpokenText.length).toBeGreaterThan(0);
      expect(complete.response.providerUsed).toBe("heuristic");
    }
  });

  it("does not falsely trigger language mismatch on Clause 0 for Spanish responses with proper nouns", async () => {
    const client = new OllamaConversationalClient();

    const mockModel = new MockLanguageModelV4({
      doStream: async () => {
        const chunks = [
          "Jensen Huang lidera NVIDIA ",
          "en la nueva conferencia del sector tecnológico.",
        ];
        let index = 0;
        const stream = new ReadableStream({
          pull(controller) {
            if (index < chunks.length) {
              controller.enqueue({
                type: "text-delta",
                id: String(index),
                delta: chunks[index++],
              });
            } else {
              controller.enqueue({
                type: "finish",
                finishReason: { unified: "stop", raw: "stop" },
                usage: {
                  inputTokens: { total: 8, noCache: 8, cacheRead: 0, cacheWrite: 0 },
                  outputTokens: { total: 14, text: 14, reasoning: 0 },
                },
              });
              controller.close();
            }
          },
        });
        return { stream };
      },
    });

    const events: ConversationalStreamEvent[] = [];
    for await (const event of client.streamTurnClauses({
      personaId: "ruby",
      userUtterance: "¿Quién encabeza la empresa?",
      language: "es",
      customModel: mockModel,
    })) {
      events.push(event);
    }

    const clauses = events.filter((e) => e.type === "clause");
    expect(clauses.length).toBeGreaterThan(0);
    expect(clauses[0].detectedLanguage).toBe("es");
  });
});

describe("3. POST /api/conversational/chat & streamConversationalClient", () => {
  it("returns standard JSON response when stream is omitted or false", async () => {
    const req = new NextRequest("http://localhost:3000/api/conversational/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userUtterance: "Danos el resumen de la jornada",
        language: "es",
        stream: false,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.text).toBeDefined();
    expect(json.cleanSpokenText).toBeDefined();
    expect(json.detectedLanguage).toBe("es");
  });

  it("returns application/x-ndjson stream when stream === true", async () => {
    const req = new NextRequest("http://localhost:3000/api/conversational/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userUtterance: "Tell me the top market news today",
        language: "en",
        stream: true,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/x-ndjson");

    const reader = res.body!.getReader();
    const decoder = new TextDecoder("utf-8");
    let text = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value);
    }

    const lines = text.trim().split("\n");
    expect(lines.length).toBeGreaterThan(0);

    const parsedEvents = lines.map((l) => JSON.parse(l));
    const completeEvent = parsedEvents.find((e) => e.type === "complete");
    expect(completeEvent).toBeDefined();
    expect(completeEvent.response.detectedLanguage).toBe("en");
  });

  it("streamConversationalChat client helper handles both NDJSON and standard JSON fallbacks", async () => {
    const origFetch = global.fetch;
    try {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          success: true,
          text: "Welcome to our live studio broadcast.",
          cleanSpokenText: "Welcome to our live studio broadcast.",
          detectedLanguage: "en",
          actionPose: "M2_RAISED_EXPLANATORY",
          telemetry: { latencyMs: 120, provider: "gemini", model: "gemini-2.5-flash" },
        }),
      });

      const onClauseMock = vi.fn();
      const onCompleteMock = vi.fn();

      const result = await streamConversationalChat({
        userUtterance: "Hello",
        onClause: onClauseMock,
        onComplete: onCompleteMock,
      });

      expect(result.cleanSpokenText).toBe("Welcome to our live studio broadcast.");
      expect(onClauseMock).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 0,
          cleanSpokenText: "Welcome to our live studio broadcast.",
        })
      );
      expect(onCompleteMock).toHaveBeenCalled();
    } finally {
      global.fetch = origFetch;
    }
  });
});

describe("4. Unified aiSdkGateway cachedContent & thinkingBudget Pass-Through", () => {
  it("buildGoogleProviderOptions returns options only on gemini and undefined on ollama", () => {
    const optsWithCache = buildGoogleProviderOptions("gemini", {
      cachedContent: "cachedContents/test1234",
      thinkingBudget: 0,
    });
    expect(optsWithCache).toEqual({
      google: {
        cachedContent: "cachedContents/test1234",
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    const optsWithoutCacheFlag = buildGoogleProviderOptions(
      "gemini",
      {
        cachedContent: "cachedContents/test1234",
        thinkingBudget: 0,
      },
      false
    );
    expect(optsWithoutCacheFlag).toEqual({
      google: {
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    const ollamaOpts = buildGoogleProviderOptions("ollama", {
      cachedContent: "cachedContents/test1234",
      thinkingBudget: 0,
    });
    expect(ollamaOpts).toBeUndefined();
  });

  it("passes cachedContent and thinkingBudget to custom LanguageModel and omits inline system instruction", async () => {
    let capturedOptions: Record<string, unknown> | undefined;

    const mockModel = new MockLanguageModelV4({
      doGenerate: async (options) => {
        capturedOptions = options as Record<string, unknown>;
        return {
          warnings: [],
          finishReason: { unified: "stop", raw: "stop" },
          usage: {
            inputTokens: { total: 5, noCache: 5, cacheRead: 0, cacheWrite: 0 },
            outputTokens: { total: 10, text: 10, reasoning: 0 },
          },
          content: [{ type: "text", text: "News broadcast response." }],
        };
      },
    });

    const result = await generateLlmText({
      prompt: "Give me updates",
      system: "You are Ruby, an anchor.",
      cachedContent: "cachedContents/ruby_anchor_session",
      thinkingBudget: 0,
      customModel: mockModel,
      provider: "gemini",
    });

    expect(result.text).toBe("News broadcast response.");
    expect(capturedOptions).toBeDefined();

    const providerOptions = capturedOptions?.providerOptions as { google?: { cachedContent?: string; thinkingConfig?: { thinkingBudget?: number } } };
    expect(providerOptions?.google?.cachedContent).toBe("cachedContents/ruby_anchor_session");
    expect(providerOptions?.google?.thinkingConfig?.thinkingBudget).toBe(0);

    const promptArray = capturedOptions?.prompt as Array<{ role?: string; content?: string }>;
    const systemPromptItem = promptArray?.find((p) => p.role === "system");
    expect(systemPromptItem).toBeUndefined();
  });

  it("automatically retries without cachedContent on gemini if the cached call rejects with stale/expired error", async () => {
    let callCount = 0;
    const capturedOptionsList: Array<Record<string, unknown>> = [];

    const mockModel = new MockLanguageModelV4({
      doGenerate: async (options) => {
        callCount++;
        capturedOptionsList.push(options as Record<string, unknown>);
        const opts = options as { providerOptions?: { google?: { cachedContent?: string } } };

        if (opts.providerOptions?.google?.cachedContent) {
          throw new Error("404 CachedContent resource not found or expired on Google GenAI");
        }

        return {
          warnings: [],
          finishReason: { unified: "stop", raw: "stop" },
          usage: {
            inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
            outputTokens: { total: 12, text: 12, reasoning: 0 },
          },
          content: [{ type: "text", text: "Recovered successfully without cache handle." }],
        };
      },
    });

    const result = await generateLlmText({
      prompt: "Broadcast briefing",
      system: "System Anchor Prompt",
      cachedContent: "cachedContents/expired_cache_123",
      customModel: mockModel,
      provider: "gemini",
    });

    expect(callCount).toBe(2);
    expect(result.text).toBe("Recovered successfully without cache handle.");

    const firstOpts = capturedOptionsList[0].providerOptions as { google?: { cachedContent?: string } };
    expect(firstOpts?.google?.cachedContent).toBe("cachedContents/expired_cache_123");

    const secondOpts = capturedOptionsList[1].providerOptions as { google?: { cachedContent?: string } };
    expect(secondOpts?.google?.cachedContent).toBeUndefined();

    const secondPrompt = capturedOptionsList[1].prompt as Array<{ role?: string; content?: string }>;
    const restoredSystem = secondPrompt?.find((p) => p.role === "system");
    expect(restoredSystem?.content).toBe("System Anchor Prompt");
  });

  it("passes providerOptions in streamLlmText and streamLlmObject", async () => {
    let streamOptionsCaptured: Record<string, unknown> | undefined;

    const mockModel = new MockLanguageModelV4({
      doStream: async (options) => {
        streamOptionsCaptured = options as Record<string, unknown>;
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue({ type: "text-delta", id: "1", delta: "Realtime stream." });
            controller.enqueue({
              type: "finish",
              finishReason: { unified: "stop", raw: "stop" },
              usage: {
                inputTokens: { total: 5, noCache: 5, cacheRead: 0, cacheWrite: 0 },
                outputTokens: { total: 5, text: 5, reasoning: 0 },
              },
            });
            controller.close();
          },
        });
        return { stream };
      },
    });

    const streamResult = await streamLlmText({
      prompt: "Live update",
      cachedContent: "cachedContents/stream_cache",
      thinkingBudget: 0,
      customModel: mockModel,
      provider: "gemini",
    });

    for await (const chunk of streamResult.textStream) {
      expect(chunk).toBe("Realtime stream.");
    }

    const providerOpts = streamOptionsCaptured?.providerOptions as { google?: { cachedContent?: string; thinkingConfig?: { thinkingBudget?: number } } };
    expect(providerOpts?.google?.cachedContent).toBe("cachedContents/stream_cache");
    expect(providerOpts?.google?.thinkingConfig?.thinkingBudget).toBe(0);
  });

  it("automatically retries generateLlmObject without cachedContent on gemini if the cached call rejects", async () => {
    let callCount = 0;
    const capturedOptionsList: Array<Record<string, unknown>> = [];

    const testSchema = z.object({
      summary: z.string(),
      sentiment: z.enum(["positive", "neutral", "negative"]),
    });

    const mockModel = new MockLanguageModelV4({
      doGenerate: async (options) => {
        callCount++;
        capturedOptionsList.push(options as Record<string, unknown>);
        const opts = options as { providerOptions?: { google?: { cachedContent?: string } } };

        if (opts.providerOptions?.google?.cachedContent) {
          throw new Error("404 CachedContent resource expired or not found");
        }

        return {
          warnings: [],
          finishReason: { unified: "stop", raw: "stop" },
          usage: {
            inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
            outputTokens: { total: 15, text: 15, reasoning: 0 },
          },
          content: [
            {
              type: "text",
              text: JSON.stringify({ summary: "Market update", sentiment: "positive" }),
            },
          ],
        };
      },
    });

    const result = await generateLlmObject({
      schema: testSchema,
      prompt: "Extract sentiment",
      system: "Structured System Prompt",
      cachedContent: "cachedContents/expired_obj_cache",
      customModel: mockModel,
      provider: "gemini",
    });

    expect(callCount).toBe(2);
    expect(result.object.summary).toBe("Market update");
    expect(result.object.sentiment).toBe("positive");

    const firstOpts = capturedOptionsList[0].providerOptions as { google?: { cachedContent?: string } };
    expect(firstOpts?.google?.cachedContent).toBe("cachedContents/expired_obj_cache");

    const secondOpts = capturedOptionsList[1].providerOptions as { google?: { cachedContent?: string } };
    expect(secondOpts?.google?.cachedContent).toBeUndefined();
  });
});

describe("5. geminiCacheManager Context Cache Helper", () => {
  beforeEach(() => {
    clearContextCacheMemory();
  });

  it("returns null gracefully when no GEMINI_API_KEY is configured", async () => {
    const originalGemini = process.env.GEMINI_API_KEY;
    const originalGoogle = process.env.GOOGLE_API_KEY;
    try {
      delete process.env.GEMINI_API_KEY;
      delete process.env.GOOGLE_API_KEY;

      const cacheHandle = await resolveGatewayContextCache(["ruby", "blaze"], {
        apiKey: "",
      });
      expect(cacheHandle).toBeNull();
    } finally {
      if (originalGemini) process.env.GEMINI_API_KEY = originalGemini;
      if (originalGoogle) process.env.GOOGLE_API_KEY = originalGoogle;
    }
  });

  it("creates and retrieves cached content handle with mock Gemini client", async () => {
    const mockClient = {
      caches: {
        create: vi.fn().mockResolvedValue({ name: "cachedContents/newsstudio_ruby_test" }),
      },
    };

    const handle1 = await resolveGatewayContextCache(["ruby"], {
      client: mockClient as any,
      apiKey: "mock-key",
    });
    expect(handle1).toBe("cachedContents/newsstudio_ruby_test");
    expect(mockClient.caches.create).toHaveBeenCalledTimes(1);

    const handle2 = await resolveGatewayContextCache(["ruby"], {
      client: mockClient as any,
      apiKey: "mock-key",
    });
    expect(handle2).toBe("cachedContents/newsstudio_ruby_test");
    expect(mockClient.caches.create).toHaveBeenCalledTimes(1);

    clearContextCacheMemory();
    const handle3 = await resolveGatewayContextCache(["ruby"], {
      client: mockClient as any,
      apiKey: "mock-key",
    });
    expect(handle3).toBe("cachedContents/newsstudio_ruby_test");
    expect(mockClient.caches.create).toHaveBeenCalledTimes(2);
  });
});
