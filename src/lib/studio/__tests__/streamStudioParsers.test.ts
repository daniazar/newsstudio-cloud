import { describe, it, expect, vi, beforeEach } from "vitest";
import { MockLanguageModelV4 } from "ai/test";
import { NextRequest } from "next/server";
import {
  streamArticleForStudio,
  computeSceneCount,
} from "../parsers/stream";
import { streamStudioParse } from "../streamStudioClient";
import { POST as parseStudioPOST } from "@/app/api/stories/[storyId]/parse-studio/route";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    story: {
      findFirst: vi.fn(),
    },
    aiTokenUsage: {
      create: vi.fn().mockResolvedValue({ id: "token-usage-id" }),
    },
    $transaction: vi.fn().mockImplementation(async (ops: any[]) => Promise.all(ops)),
  },
}));

vi.mock("@/lib/tenant", () => ({
  requireTenant: vi.fn(),
}));

describe("Real-Time Progressive Studio Streaming Engine", () => {
  const mockTenant = {
    userId: "user_test_123",
    orgId: "org_test_123",
    isDefaultOrg: false,
  };

  const sampleArticle = `
    Global artificial intelligence spending reached record highs this quarter, exceeding $120 billion across
    enterprise infrastructure and autonomous agent deployments. Analysts at Morgan Stanley raised price targets
    on leading semiconductor designers, citing sustained cloud demand and data center acceleration.
  `.repeat(2);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireTenant).mockResolvedValue({
      ok: true,
      tenant: mockTenant,
    } as unknown as Awaited<ReturnType<typeof requireTenant>>);
  });

  describe("1. streamArticleForStudio AsyncGenerator", () => {
    it("streams partial interview turns and finishes with normalized complete payload", async () => {
      const mockModel = new MockLanguageModelV4({
        doGenerate: async () => ({
          content: [
            {
              type: "text",
              text: JSON.stringify({
                topic: "AI SURGE IN ENTERPRISE",
                turns: [
                  {
                    speakerId: "ruby",
                    text: "[urgent] Good evening. Enterprise AI is surging.",
                    cameraAngle: "host_solo",
                    emotion: "[urgent]",
                    pacing: "Urgent",
                  },
                ],
              }),
            },
          ],
          finishReason: { unified: "stop", raw: "stop" },
          usage: {
            inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
            outputTokens: { total: 30, text: 30, reasoning: 0 },
          },
          warnings: [],
        }),
        doStream: async () => {
          const stream = new ReadableStream({
            start(controller) {
              controller.enqueue({
                type: "text-start",
                id: "text-1",
              });
              controller.enqueue({
                type: "text-delta",
                id: "text-1",
                delta: '{"topic": "AI SURGE IN ENTERPRISE", ',
              });
              controller.enqueue({
                type: "text-delta",
                id: "text-1",
                delta: '"turns": [{"speakerId": "ruby", "text": "[urgent] Good evening. Enterprise AI is surging.", "cameraAngle": "host_solo", "emotion": "[urgent]", "pacing": "Urgent"}]}',
              });
              controller.enqueue({
                type: "text-end",
                id: "text-1",
              });
              controller.enqueue({
                type: "finish",
                finishReason: { unified: "stop", raw: "stop" },
                usage: {
                  inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
                  outputTokens: { total: 30, text: 30, reasoning: 0 },
                },
              });
              controller.close();
            },
          });
          return { stream };
        },
      });

      const events = [];
      const generator = streamArticleForStudio("interview", sampleArticle, {
        customModel: mockModel,
      });

      for await (const ev of generator) {
        events.push(ev);
      }

      expect(events.length).toBeGreaterThanOrEqual(2);
      const partials = events.filter((e) => e.type === "partial");
      const completes = events.filter((e) => e.type === "complete");

      expect(partials.length).toBeGreaterThan(0);
      expect(completes.length).toBe(1);

      const completeEvent = completes[0];
      expect(completeEvent.type).toBe("complete");
      expect(completeEvent.studioType).toBe("interview");
      expect(completeEvent.payload.studioType).toBe("interview");
      if (completeEvent.payload.studioType === "interview") {
        expect(completeEvent.payload.topic).toBe("AI SURGE IN ENTERPRISE");
        expect(completeEvent.payload.turns.length).toBe(1);
        expect(completeEvent.payload.turns[0].speakerId).toBe("ruby");
      }
    });

    it("streams debate panels with correct speaker and turn normalization", async () => {
      const mockDebateData = {
        topic: "THE FUTURE OF AUTONOMY",
        participantCount: 2,
        speakers: [
          {
            id: "ruby",
            name: "Ruby Vance",
            role: "Moderator",
            stance: "MODERATOR",
            location: "STUDIO 1",
            accentColor: "#22d3ee",
          },
          {
            id: "tomas",
            name: "Tomás Rossi",
            role: "Safety Lead",
            stance: "CON",
            location: "BUREAU",
            accentColor: "#f43f5e",
          },
        ],
        turns: [
          {
            id: "t1",
            speakerId: "ruby",
            speakerName: "Ruby Vance",
            stance: "MODERATOR",
            text: "[urgent] Welcome to tonight's debate.",
            emotion: "[urgent]",
            cameraCue: "desk_master",
            roundName: "ROUND 1",
          },
        ],
      };

      const mockModel = new MockLanguageModelV4({
        doGenerate: async () => ({
          content: [
            {
              type: "text",
              text: JSON.stringify(mockDebateData),
            },
          ],
          finishReason: { unified: "stop", raw: "stop" },
          usage: {
            inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
            outputTokens: { total: 40, text: 40, reasoning: 0 },
          },
          warnings: [],
        }),
        doStream: async () => {
          const stream = new ReadableStream({
            start(controller) {
              controller.enqueue({
                type: "text-start",
                id: "text-1",
              });
              controller.enqueue({
                type: "text-delta",
                id: "text-1",
                delta: JSON.stringify(mockDebateData),
              });
              controller.enqueue({
                type: "text-end",
                id: "text-1",
              });
              controller.enqueue({
                type: "finish",
                finishReason: { unified: "stop", raw: "stop" },
                usage: {
                  inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
                  outputTokens: { total: 40, text: 40, reasoning: 0 },
                },
              });
              controller.close();
            },
          });
          return { stream };
        },
      });

      const events = [];
      for await (const ev of streamArticleForStudio("debate", sampleArticle, {
        customModel: mockModel,
      })) {
        events.push(ev);
      }

      const completes = events.filter((e) => e.type === "complete");
      expect(completes.length).toBe(1);
      const complete = completes[0];
      if (complete.type === "complete" && complete.payload.studioType === "debate") {
        expect(complete.payload.participantCount).toBe(2);
        expect(complete.payload.speakers.length).toBe(2);
        expect(complete.payload.turns.length).toBe(1);
        expect(complete.payload.deskMasterImageSrc).toBe(
          "/studio_environments/composited_scenes/dual_ruby_tomas_desk_master.jpg"
        );
      }
    });

    it("streams podcast lines progressively", async () => {
      const mockPodcastData = {
        title: "THE MORNING PULSE",
        lines: [
          { speakerId: "ruby", text: "Welcome to the show.", language: "en", pacing: "standard" },
          { speakerId: "mateo", text: "Excited to be here.", language: "en", pacing: "casual" },
        ],
      };
      const mockModel = new MockLanguageModelV4({
        doGenerate: async () => ({
          content: [{ type: "text", text: JSON.stringify(mockPodcastData) }],
          finishReason: { unified: "stop", raw: "stop" },
          usage: { inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 30, text: 30, reasoning: 0 } },
          warnings: [],
        }),
        doStream: async () => {
          const stream = new ReadableStream({
            start(controller) {
              controller.enqueue({ type: "text-start", id: "t1" });
              controller.enqueue({ type: "text-delta", id: "t1", delta: JSON.stringify(mockPodcastData) });
              controller.enqueue({ type: "text-end", id: "t1" });
              controller.enqueue({ type: "finish", finishReason: { unified: "stop", raw: "stop" }, usage: { inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 30, text: 30, reasoning: 0 } } });
              controller.close();
            },
          });
          return { stream };
        },
      });

      const events = [];
      for await (const ev of streamArticleForStudio("podcast", sampleArticle, { customModel: mockModel })) {
        events.push(ev);
      }
      const completes = events.filter((e) => e.type === "complete");
      expect(completes.length).toBe(1);
      const complete = completes[0];
      if (complete.type === "complete" && complete.payload.studioType === "podcast") {
        expect(complete.payload.title).toBe("THE MORNING PULSE");
        expect(complete.payload.lines.length).toBe(2);
      }
    });

    it("streams vtuber reaction moments progressively", async () => {
      const mockVtuberData = {
        streamTitle: "REACTING TO AI SURGE 🚀",
        reactionMoments: [
          { text: "Chat, are you seeing this?", reaction: "[excited]", chatLine: "POGGERS", timestamp: 0 },
        ],
      };
      const mockModel = new MockLanguageModelV4({
        doGenerate: async () => ({
          content: [{ type: "text", text: JSON.stringify(mockVtuberData) }],
          finishReason: { unified: "stop", raw: "stop" },
          usage: { inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 30, text: 30, reasoning: 0 } },
          warnings: [],
        }),
        doStream: async () => {
          const stream = new ReadableStream({
            start(controller) {
              controller.enqueue({ type: "text-start", id: "t1" });
              controller.enqueue({ type: "text-delta", id: "t1", delta: JSON.stringify(mockVtuberData) });
              controller.enqueue({ type: "text-end", id: "t1" });
              controller.enqueue({ type: "finish", finishReason: { unified: "stop", raw: "stop" }, usage: { inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 30, text: 30, reasoning: 0 } } });
              controller.close();
            },
          });
          return { stream };
        },
      });

      const events = [];
      for await (const ev of streamArticleForStudio("vtuber", sampleArticle, { customModel: mockModel })) {
        events.push(ev);
      }
      const completes = events.filter((e) => e.type === "complete");
      expect(completes.length).toBe(1);
      const complete = completes[0];
      if (complete.type === "complete" && complete.payload.studioType === "vtuber") {
        expect(complete.payload.streamTitle).toBe("REACTING TO AI SURGE 🚀");
        expect(complete.payload.reactionMoments.length).toBe(1);
      }
    });

    it("streams localization tracks progressively", async () => {
      const mockLocalizationData = {
        sourceText: "Enterprise AI adoption is accelerating.",
        tracks: [
          { language: "es_ar", languageName: "Spanish", translatedText: "La adopción de IA empresarial se está acelerando." },
        ],
      };
      const mockModel = new MockLanguageModelV4({
        doGenerate: async () => ({
          content: [{ type: "text", text: JSON.stringify(mockLocalizationData) }],
          finishReason: { unified: "stop", raw: "stop" },
          usage: { inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 30, text: 30, reasoning: 0 } },
          warnings: [],
        }),
        doStream: async () => {
          const stream = new ReadableStream({
            start(controller) {
              controller.enqueue({ type: "text-start", id: "t1" });
              controller.enqueue({ type: "text-delta", id: "t1", delta: JSON.stringify(mockLocalizationData) });
              controller.enqueue({ type: "text-end", id: "t1" });
              controller.enqueue({ type: "finish", finishReason: { unified: "stop", raw: "stop" }, usage: { inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 30, text: 30, reasoning: 0 } } });
              controller.close();
            },
          });
          return { stream };
        },
      });

      const events = [];
      for await (const ev of streamArticleForStudio("localization", sampleArticle, { customModel: mockModel })) {
        events.push(ev);
      }
      const completes = events.filter((e) => e.type === "complete");
      expect(completes.length).toBe(1);
      const complete = completes[0];
      if (complete.type === "complete" && complete.payload.studioType === "localization") {
        expect(complete.payload.tracks.length).toBe(1);
        expect(complete.payload.tracks[0].language).toBe("es_ar");
      }
    });

    it("streams data studio graphics and tickers progressively", async () => {
      const mockDataStudioData = {
        headline: "MARKET INTELLIGENCE",
        summary: "Key indicators signal growth.",
        graphicType: "sparkline",
        tickers: [
          { symbol: "TECH", label: "Tech Index", value: "19,000", change: "+2.1%", direction: "up" },
        ],
      };
      const mockModel = new MockLanguageModelV4({
        doGenerate: async () => ({
          content: [{ type: "text", text: JSON.stringify(mockDataStudioData) }],
          finishReason: { unified: "stop", raw: "stop" },
          usage: { inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 30, text: 30, reasoning: 0 } },
          warnings: [],
        }),
        doStream: async () => {
          const stream = new ReadableStream({
            start(controller) {
              controller.enqueue({ type: "text-start", id: "t1" });
              controller.enqueue({ type: "text-delta", id: "t1", delta: JSON.stringify(mockDataStudioData) });
              controller.enqueue({ type: "text-end", id: "t1" });
              controller.enqueue({ type: "finish", finishReason: { unified: "stop", raw: "stop" }, usage: { inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 30, text: 30, reasoning: 0 } } });
              controller.close();
            },
          });
          return { stream };
        },
      });

      const events = [];
      for await (const ev of streamArticleForStudio("data_studio", sampleArticle, { customModel: mockModel })) {
        events.push(ev);
      }
      const completes = events.filter((e) => e.type === "complete");
      expect(completes.length).toBe(1);
      const complete = completes[0];
      if (complete.type === "complete" && complete.payload.studioType === "data_studio") {
        expect(complete.payload.headline).toBe("MARKET INTELLIGENCE");
        expect(complete.payload.tickers.length).toBe(1);
      }
    });

    it("streams narrative matrix perspectives progressively", async () => {
      const mockNarrativeData = {
        topic: "ENTERPRISE AUTOMATION DEBATE",
        perspectives: [
          { role: "The Optimist", personaId: "ruby", argumentText: "Productivity will double.", rebuttal: "Risks are manageable." },
          { role: "The Skeptic", personaId: "mateo", argumentText: "Costs are understated.", rebuttal: "ROI is uncertain." },
          { role: "The Pragmatist", personaId: "blaze", argumentText: "Hybrid approach is best.", rebuttal: "Balance is needed." },
        ],
      };
      const mockModel = new MockLanguageModelV4({
        doGenerate: async () => ({
          content: [{ type: "text", text: JSON.stringify(mockNarrativeData) }],
          finishReason: { unified: "stop", raw: "stop" },
          usage: { inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 30, text: 30, reasoning: 0 } },
          warnings: [],
        }),
        doStream: async () => {
          const stream = new ReadableStream({
            start(controller) {
              controller.enqueue({ type: "text-start", id: "t1" });
              controller.enqueue({ type: "text-delta", id: "t1", delta: JSON.stringify(mockNarrativeData) });
              controller.enqueue({ type: "text-end", id: "t1" });
              controller.enqueue({ type: "finish", finishReason: { unified: "stop", raw: "stop" }, usage: { inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 30, text: 30, reasoning: 0 } } });
              controller.close();
            },
          });
          return { stream };
        },
      });

      const events = [];
      for await (const ev of streamArticleForStudio("narrative_matrix", sampleArticle, { customModel: mockModel })) {
        events.push(ev);
      }
      const completes = events.filter((e) => e.type === "complete");
      expect(completes.length).toBe(1);
      const complete = completes[0];
      if (complete.type === "complete" && complete.payload.studioType === "narrative_matrix") {
        expect(complete.payload.topic).toBe("ENTERPRISE AUTOMATION DEBATE");
        expect(complete.payload.perspectives.length).toBe(3);
      }
    });

    it("falls back gracefully to synchronous parseArticleForStudio when streaming fails", async () => {
      const failingModel = new MockLanguageModelV4({
        doStream: async () => {
          throw new Error("Stream offline network disconnect");
        },
        doGenerate: async () => ({
          warnings: [],
          finishReason: { unified: "stop", raw: "stop" },
          usage: {
            inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
            outputTokens: { total: 20, text: 20, reasoning: 0 },
          },
          content: [
            {
              type: "text",
              text: JSON.stringify({
                topic: "RECOVERED VIA SYNCHRONOUS PARSER",
                turns: [
                  {
                    speakerId: "ruby",
                    text: "[calm] Resilient fallback operational.",
                    cameraAngle: "dual_shot",
                    emotion: "[calm]",
                    pacing: "Standard",
                  },
                ],
              }),
            },
          ],
        }),
      });

      const events = [];
      for await (const ev of streamArticleForStudio("interview", sampleArticle, {
        customModel: failingModel,
      })) {
        events.push(ev);
      }

      expect(events.length).toBe(1);
      const complete = events[0];
      expect(complete.type).toBe("complete");
      if (complete.type === "complete" && complete.payload.studioType === "interview") {
        expect(complete.payload.topic).toBe("RECOVERED VIA SYNCHRONOUS PARSER");
        expect(complete.payload.turns[0].text).toContain("Resilient fallback operational");
      }
    });

    it("throws immediately when article content is empty", async () => {
      const generator = streamArticleForStudio("interview", "   ");
      await expect(generator.next()).rejects.toThrow("Article content cannot be empty");
    });
  });

  describe("2. computeSceneCount Heuristics", () => {
    it("computes accurate sceneCount across different studio payloads", () => {
      expect(computeSceneCount("interview", { turns: [{}, {}] })).toBe(2);
      expect(computeSceneCount("podcast", { lines: [{}, {}, {}] })).toBe(3);
      expect(computeSceneCount("vtuber", { reactionMoments: [{}] })).toBe(1);
      expect(computeSceneCount("localization", { tracks: [{}, {}, {}, {}] })).toBe(4);
      expect(computeSceneCount("data_studio", { tickers: [{}, {}] })).toBe(2);
      expect(computeSceneCount("data_studio", { headline: "Chart Headline" })).toBe(1);
      expect(computeSceneCount("narrative_matrix", { perspectives: [{}, {}, {}] })).toBe(3);
      expect(computeSceneCount("debate", { turns: [{}, {}] })).toBe(2);
      expect(computeSceneCount("debate", { speakers: [{}, {}, {}] })).toBe(3);
    });
  });

  describe("3. streamStudioParse Client Helper", () => {
    it("handles NDJSON streams split across chunk boundaries", async () => {
      const partials: Array<{ partial: Record<string, unknown>; count: number }> = [];

      const line1 = JSON.stringify({
        type: "partial",
        studioType: "interview",
        partial: { topic: "Streaming Topic" },
        sceneCount: 0,
      });
      const line2 = JSON.stringify({
        type: "partial",
        studioType: "interview",
        partial: { topic: "Streaming Topic", turns: [{ text: "Turn 1" }] },
        sceneCount: 1,
      });
      const line3 = JSON.stringify({
        type: "complete",
        studioType: "interview",
        storyId: "story-101",
        storyTitle: "Top News",
        payload: {
          studioType: "interview",
          outputMode: "video",
          topic: "Streaming Topic",
          turns: [{ speakerId: "ruby", text: "Turn 1", cameraAngle: "host_solo", emotion: "[urgent]", pacing: "Urgent" }],
        },
      });

      // Split line2 across chunk boundaries
      const fullPayload = `${line1}\n${line2}\n${line3}\n`;
      const mid = Math.floor(fullPayload.length / 2);
      const chunk1 = fullPayload.slice(0, mid);
      const chunk2 = fullPayload.slice(mid);

      const encoder = new TextEncoder();
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(chunk1));
          controller.enqueue(encoder.encode(chunk2));
          controller.close();
        },
      });

      const mockResponse = new Response(mockStream, {
        headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
      });

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(mockResponse);

      const result = await streamStudioParse({
        storyId: "story-101",
        studioType: "interview",
        onPartial: (p, c) => {
          partials.push({ partial: p, count: c });
        },
      });

      expect(partials.length).toBe(2);
      expect(partials[0].partial.topic).toBe("Streaming Topic");
      expect(partials[1].count).toBe(1);

      expect(result.studioType).toBe("interview");
      expect(result.storyId).toBe("story-101");
      expect(result.storyTitle).toBe("Top News");
      if (result.studioType === "interview" && result.payload.studioType === "interview") {
        expect(result.payload.topic).toBe("Streaming Topic");
      }

      fetchSpy.mockRestore();
    });

    it("falls back to standard JSON response if response is not NDJSON", async () => {
      const mockResponse = new Response(
        JSON.stringify({
          studioType: "podcast",
          storyId: "story-202",
          storyTitle: "Daily Pod",
          payload: {
            studioType: "podcast",
            outputMode: "video",
            title: "Daily Pod",
            lines: [],
          },
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(mockResponse);

      const result = await streamStudioParse({
        storyId: "story-202",
        studioType: "podcast",
      });

      expect(result.studioType).toBe("podcast");
      expect(result.storyTitle).toBe("Daily Pod");
      if (result.payload.studioType === "podcast") {
        expect(result.payload.title).toBe("Daily Pod");
      }

      fetchSpy.mockRestore();
    });

    it("throws error when NDJSON event is of type error", async () => {
      const line = JSON.stringify({
        type: "error",
        error: "Quota rate limit reached",
      }) + "\n";

      const mockResponse = new Response(line, {
        headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
      });

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(mockResponse);

      await expect(
        streamStudioParse({
          storyId: "story-303",
          studioType: "data_studio",
        })
      ).rejects.toThrow("Quota rate limit reached");

      fetchSpy.mockRestore();
    });

    it("handles multibyte UTF-8 characters cleanly split across chunk boundaries", async () => {
      const line1 = JSON.stringify({
        type: "partial",
        studioType: "localization",
        partial: { sourceText: "Noticias en español: ¡Increíble! 🌟" },
        sceneCount: 1,
      });
      const line2 = JSON.stringify({
        type: "complete",
        studioType: "localization",
        storyId: "story-utf8",
        storyTitle: "Noticia Mundial",
        payload: {
          studioType: "localization",
          outputMode: "video",
          sourceText: "Noticias en español: ¡Increíble! 🌟",
          sourceLanguage: "es",
          tracks: [],
        },
      });

      const fullString = `${line1}\n${line2}\n`;
      const encoded = new TextEncoder().encode(fullString);
      const starByteIndex = encoded.indexOf(0xf0);
      const splitPoint = starByteIndex > -1 ? starByteIndex + 1 : Math.floor(encoded.length / 2);

      const chunk1 = encoded.subarray(0, splitPoint);
      const chunk2 = encoded.subarray(splitPoint);

      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(chunk1);
          controller.enqueue(chunk2);
          controller.close();
        },
      });

      const mockResponse = new Response(mockStream, {
        headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
      });

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(mockResponse);

      const result = await streamStudioParse({
        storyId: "story-utf8",
        studioType: "localization",
      });

      expect(result.storyId).toBe("story-utf8");
      if (result.payload.studioType === "localization") {
        expect(result.payload.sourceText).toContain("🌟");
      }

      fetchSpy.mockRestore();
    });
  });

  describe("4. API Route: POST /api/stories/[storyId]/parse-studio", () => {
    it("returns standard JSON response when stream is false or omitted", async () => {
      vi.mocked(prisma.story.findFirst).mockResolvedValue({
        id: "story-999",
        title: "Global Tech Boom",
        fullContent: sampleArticle,
        description: "Summary of tech spending",
      } as unknown as Awaited<ReturnType<typeof prisma.story.findFirst>>);

      const req = new NextRequest("http://localhost:3000/api/stories/story-999/parse-studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studioType: "data_studio",
          stream: false,
        }),
      });

      const response = await parseStudioPOST(req, {
        params: Promise.resolve({ storyId: "story-999" }),
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("application/json");

      const json = await response.json();
      expect(json.studioType).toBe("data_studio");
      expect(json.storyId).toBe("story-999");
      expect(json.storyTitle).toBe("Global Tech Boom");
      expect(json.payload.studioType).toBe("data_studio");
    });

    it("returns NDJSON streaming response when stream is true", async () => {
      vi.mocked(prisma.story.findFirst).mockResolvedValue({
        id: "story-999",
        title: "Global Tech Boom",
        fullContent: sampleArticle,
        description: "Summary of tech spending",
      } as unknown as Awaited<ReturnType<typeof prisma.story.findFirst>>);

      const req = new NextRequest("http://localhost:3000/api/stories/story-999/parse-studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studioType: "data_studio",
          stream: true,
        }),
      });

      const response = await parseStudioPOST(req, {
        params: Promise.resolve({ storyId: "story-999" }),
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("application/x-ndjson");

      const text = await response.text();
      const lines = text.trim().split("\n").filter(Boolean);
      expect(lines.length).toBeGreaterThan(0);

      const lastLine = JSON.parse(lines[lines.length - 1]);
      expect(lastLine.type).toBe("complete");
      expect(lastLine.studioType).toBe("data_studio");
      expect(lastLine.storyId).toBe("story-999");
      expect(lastLine.storyTitle).toBe("Global Tech Boom");
    });

    it("returns 404 if story does not exist", async () => {
      vi.mocked(prisma.story.findFirst).mockResolvedValue(null);

      const req = new NextRequest("http://localhost:3000/api/stories/non-existent/parse-studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studioType: "interview" }),
      });

      const response = await parseStudioPOST(req, {
        params: Promise.resolve({ storyId: "non-existent" }),
      });

      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.error).toBe("Story not found");
    });

    it("returns 422 if story has insufficient content", async () => {
      vi.mocked(prisma.story.findFirst).mockResolvedValue({
        id: "story-short",
        title: "Short",
        fullContent: "Too short",
        description: "",
      } as unknown as Awaited<ReturnType<typeof prisma.story.findFirst>>);

      const req = new NextRequest("http://localhost:3000/api/stories/story-short/parse-studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studioType: "interview" }),
      });

      const response = await parseStudioPOST(req, {
        params: Promise.resolve({ storyId: "story-short" }),
      });

      expect(response.status).toBe(422);
    });
  });
});
