/**
 * src/lib/ai/__tests__/editorialToolsAgentic.test.ts
 *
 * Multi-Step Autonomous Editorial Tool-Calling Verification Suite (Unlock 2).
 *
 * Tests:
 * 1. Individual editorial tool execution, tenant isolation, and fault tolerance:
 *    - searchIngestedWireArticles (tenant scoping & DB error safety)
 *    - lookupPronunciationGlossary (timeout/offline safety & broadcast phonetic hints)
 *    - verifyStockBrollKeywords (abstract concept mapping & stock provider checks)
 * 2. Genuine multi-step agentic loop via MockLanguageModelV4:
 *    - Step 1: Model issues tool-call to searchIngestedWireArticles
 *    - Step 2: Engine feeds tool-result back, model returns verified structured JSON
 *    - Verifies across factChecker, situationRoomEngine, and researchRadarEngine
 * 3. Bounded loop termination via maxSteps (stopWhen: stepCountIs(N))
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MockLanguageModelV4 } from "ai/test";
import { createEditorialTools } from "@/lib/ai/editorialTools";
import { verifySegmentFact, verifySegmentsBatch } from "@/lib/ai/factChecker";
import { synthesizeBreakingDispatch, type OsintAlertEvent } from "@/lib/osint/situationRoomEngine";
import { analyzeResearchDocument } from "@/lib/ai/researchRadarEngine";
import { generateLlmText, generateLlmObject } from "@/lib/llm/aiSdkGateway";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    story: {
      findMany: vi.fn(),
    },
    aiTokenUsage: {
      create: vi.fn().mockResolvedValue({}),
    },
    $transaction: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("@/lib/llm/tokenTracker", () => ({
  trackLlmUsage: vi.fn().mockResolvedValue({}),
}));

interface ExecutableTool {
  execute?: (input: Record<string, unknown>, options: unknown) => Promise<unknown>;
}

interface SearchArticlesResult {
  matches: Array<{ id: string; title: string; excerpt: string }>;
  total: number;
  note?: string;
}

interface GlossaryResult {
  pronunciations: Record<string, string>;
  source: string;
}

interface BrollKeywordsResult {
  validatedKeywords: string[];
  suggestions: Record<string, string[]>;
  availableProviders: string[];
  priority: string[];
}

async function callToolExecute<TResult = Record<string, unknown>>(
  toolInstance: unknown,
  input: Record<string, unknown>
): Promise<TResult> {
  const toolWithExec = toolInstance as ExecutableTool;
  if (!toolWithExec.execute) {
    throw new Error("Tool execute method is not defined");
  }
  const result = await toolWithExec.execute(input, { toolCallId: "test_call", messages: [] });
  return result as TResult;
}

describe("Editorial Tools Registry (editorialTools.ts)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("searchIngestedWireArticles", () => {
    it("respects tenant companyId filter when provided", async () => {
      const tools = createEditorialTools({ companyId: "tenant_corp_123" });
      const searchTool = tools.searchIngestedWireArticles;

      const mockStories = [
        {
          id: "story_1",
          title: "Quarterly Revenue Up 15%",
          category: "Finance",
          pubDate: new Date("2026-10-25T10:00:00Z"),
          link: "https://wire.example.com/story1",
          description: "Enterprise quarterly results",
          fullContent: "Quarterly revenue increased fifteen percent year over year.",
        },
      ];

      (prisma.story.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockStories);

      const result = await callToolExecute<SearchArticlesResult>(searchTool, {
        query: "Quarterly Revenue",
        limit: 3,
      });

      expect(prisma.story.findMany).toHaveBeenCalledTimes(1);
      const callArgs = (prisma.story.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0];

      expect(callArgs.where.companyId).toBe("tenant_corp_123");
      expect(callArgs.where.OR).toBeDefined();
      expect(callArgs.take).toBe(3);

      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].id).toBe("story_1");
      expect(result.matches[0].title).toBe("Quarterly Revenue Up 15%");
      expect(result.matches[0].excerpt).toContain("fifteen percent");
    });

    it("safely handles database unavailability and errors without throwing", async () => {
      const tools = createEditorialTools({ companyId: "tenant_err" });
      const searchTool = tools.searchIngestedWireArticles;

      (prisma.story.findMany as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("Connection to database pool lost: ECONNREFUSED")
      );

      const result = await callToolExecute<SearchArticlesResult>(searchTool, {
        query: "earthquake",
      });

      expect(result).toEqual({ matches: [], note: "Archive unavailable" });
    });

    it("decomposes multi-word query into keyword OR conditions for resilient matching", async () => {
      const tools = createEditorialTools();
      const searchTool = tools.searchIngestedWireArticles;

      (prisma.story.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);

      await callToolExecute<SearchArticlesResult>(searchTool, {
        query: "Sendai earthquake disaster",
      });

      expect(prisma.story.findMany).toHaveBeenCalledTimes(1);
      const callArgs = (prisma.story.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const orClauses = callArgs.where.OR;
      expect(orClauses.length).toBeGreaterThan(3);
      expect(orClauses).toEqual(
        expect.arrayContaining([
          { title: { contains: "Sendai earthquake disaster" } },
          { title: { contains: "Sendai" } },
          { title: { contains: "earthquake" } },
          { title: { contains: "disaster" } },
        ])
      );
    });
  });

  describe("lookupPronunciationGlossary", () => {
    it("returns built-in broadcast phonetic expansions for acronyms and international toponyms", async () => {
      const tools = createEditorialTools();
      const glossaryTool = tools.lookupPronunciationGlossary;

      const result = await callToolExecute<GlossaryResult>(glossaryTool, {
        terms: ["USGS", "Sendai", "Tohoku", "BCRA", "AI", "NATO"],
      });

      expect(result.pronunciations.USGS).toBe("U-S-G-S");
      expect(result.pronunciations.Sendai).toBe("SEN-dye");
      expect(result.pronunciations.Tohoku).toBe("TOH-ho-koo");
      expect(result.pronunciations.BCRA).toBe("Be-Se-Erre-Ah");
      expect(result.pronunciations.AI).toBe("A-I");
      expect(result.pronunciations.NATO).toBe("NAY-toe");
    });

    it("extracts recognized toponyms from multi-word location phrases", async () => {
      const tools = createEditorialTools();
      const glossaryTool = tools.lookupPronunciationGlossary;

      const result = await callToolExecute<GlossaryResult>(glossaryTool, {
        terms: ["Off coast of Sendai, Japan", "Tohoku Prefecture", "City of Buenos Aires"],
      });

      expect(result.pronunciations["Off coast of Sendai, Japan"]).toBe("SEN-dye");
      expect(result.pronunciations["Tohoku Prefecture"]).toBe("TOH-ho-koo");
      expect(result.pronunciations["City of Buenos Aires"]).toBe("BWAY-nohs EYE-rehs");
    });

    it("unwraps remote Modern-TTS-Server glossary response when available", async () => {
      process.env.MODERN_TTS_SERVER_URL = "http://localhost:8005";
      const globalFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          glossary: {
            CUSTOM_TICKER: "Kus-tom Tik-er",
          },
        }),
      });
      vi.stubGlobal("fetch", globalFetch);

      const tools = createEditorialTools();
      const glossaryTool = tools.lookupPronunciationGlossary;

      const result = await callToolExecute<GlossaryResult>(glossaryTool, {
        terms: ["CUSTOM_TICKER"],
      });

      expect(result.pronunciations.CUSTOM_TICKER).toBe("Kus-tom Tik-er");
      expect(result.source).toBe("modern-tts-server");

      vi.unstubAllGlobals();
    });

    it("falls back gracefully when remote glossary fetch fails or times out", async () => {
      process.env.MODERN_TTS_SERVER_URL = "http://localhost:9999";
      const globalFetch = vi.fn().mockRejectedValueOnce(new Error("Network timeout after 1200ms"));
      vi.stubGlobal("fetch", globalFetch);

      const tools = createEditorialTools();
      const glossaryTool = tools.lookupPronunciationGlossary;

      const result = await callToolExecute<GlossaryResult>(glossaryTool, {
        terms: ["NASA", "UnknownAcronymXYZ"],
      });

      expect(result.pronunciations.NASA).toBe("NA-sa");
      // Fallback hyphenation for unknown all-caps acronyms
      expect(result.pronunciations.UnknownAcronymXYZ).toBe("UnknownAcronymXYZ");

      vi.unstubAllGlobals();
    });
  });

  describe("verifyStockBrollKeywords", () => {
    it("maps abstract broadcast concepts to concrete visual shot keywords", async () => {
      process.env.STOCK_PROVIDER_PRIORITY = "pexels,pixabay";
      process.env.PEXELS_API_KEY = "test_pexels_key";

      const tools = createEditorialTools();
      const brollTool = tools.verifyStockBrollKeywords;

      const result = await callToolExecute<BrollKeywordsResult>(brollTool, {
        keywords: ["economy", "earthquake", "ai", "city skyline"],
      });

      expect(result.validatedKeywords).toContain("stock exchange trading floor");
      expect(result.validatedKeywords).toContain("seismograph recording needle oscillation");
      expect(result.validatedKeywords).toContain("server rack room with glowing indicators");
      expect(result.validatedKeywords).toContain("city skyline");
      expect(result.availableProviders).toContain("pexels");
      expect(result.availableProviders).not.toContain("pixabay");
      expect(result.priority).toEqual(["pexels", "pixabay"]);
    });
  });
});

describe("Multi-Step Autonomous Editorial Tool-Calling Loop", () => {
  it("executes a genuine multi-step loop in factChecker with MockLanguageModelV4", async () => {
    (prisma.story.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      {
        id: "wire_story_88",
        title: "Consumer Price Index Rose 3.2% in March",
        category: "Economics",
        pubDate: new Date("2026-03-15T12:00:00Z"),
        link: "https://reuters.example.com/cpi-march",
        description: "Official federal labor statistics report.",
        fullContent: "The consumer price index rose three point two percent in March according to federal records.",
      },
    ]);

    let stepCall = 0;
    const mockModel = new MockLanguageModelV4({
      doGenerate: async (options) => {
        stepCall++;
        if (stepCall === 1) {
          // Step 1: Model autonomously requests wire search to corroborate inflation claim
          return {
            warnings: [],
            finishReason: { unified: "tool-calls", raw: "tool-calls" },
            content: [
              {
                type: "tool-call",
                toolCallId: "call_fc_1",
                toolName: "searchIngestedWireArticles",
                input: JSON.stringify({ query: "Consumer Price Index March" }),
              },
            ],
            usage: {
              inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
              outputTokens: { total: 10, text: 10, reasoning: 0 },
            },
          };
        }

        // Step 2: Model inspects tool-result fed back in prompt messages and returns final structured JSON
        const lastMessage = options.prompt[options.prompt.length - 1];
        expect(lastMessage.role).toBe("tool");

        return {
          warnings: [],
          finishReason: { unified: "stop", raw: "stop" },
          content: [
            {
              type: "text",
              text: JSON.stringify({
                isVerified: true,
                confidenceScore: 0.98,
                matchedClaim: "Verified 3.2% CPI increase against ingested wire report wire_story_88.",
              }),
            },
          ],
          usage: {
            inputTokens: { total: 25, noCache: 25, cacheRead: 0, cacheWrite: 0 },
            outputTokens: { total: 20, text: 20, reasoning: 0 },
          },
        };
      },
    });

    const citation = await verifySegmentFact(
      "Consumer prices surged 3.2% during the month of March.",
      "The Consumer Price Index rose 3.2% according to government data released Wednesday morning.",
      "Reuters",
      { customModel: mockModel, companyId: "test_tenant" }
    );

    expect(stepCall).toBe(2);
    expect(citation.isVerified).toBe(true);
    expect(citation.confidenceScore).toBe(0.98);
    expect(citation.toolsUsed).toContain("searchIngestedWireArticles");
  });

  it("executes a genuine multi-step loop in situationRoomEngine with MockLanguageModelV4", async () => {
    let stepCall = 0;
    const mockModel = new MockLanguageModelV4({
      doGenerate: async () => {
        stepCall++;
        if (stepCall === 1) {
          return {
            warnings: [],
            finishReason: { unified: "tool-calls", raw: "tool-calls" },
            content: [
              {
                type: "tool-call",
                toolCallId: "call_sr_1",
                toolName: "lookupPronunciationGlossary",
                input: JSON.stringify({ terms: ["Sendai", "USGS"] }),
              },
            ],
            usage: {
              inputTokens: { total: 12, noCache: 12, cacheRead: 0, cacheWrite: 0 },
              outputTokens: { total: 12, text: 12, reasoning: 0 },
            },
          };
        }

        return {
          warnings: [],
          finishReason: { unified: "stop", raw: "stop" },
          content: [
            {
              type: "text",
              text: JSON.stringify({
                headline: "M6.8 Major Earthquake Strikes Sendai, Japan",
                urgencyLevel: "CRITICAL",
                recommendedPersonaId: "storm",
                studioPlateCategory: "field_storm",
                lowerThirdAlert: "BREAKING: M6.8 SEISMIC EVENT NEAR SENDAI",
                tickerHeadline: "USGS Confirms M6.8 Earthquake off Sendai Coast",
                mapPrompt: "Tactical radar map of Sendai region with red seismic rings.",
                scriptSegments: [
                  {
                    speaker: "Storm Mitchell",
                    text: "[sfx:stinger] Breaking news: A major 6.8 magnitude earthquake has struck off the coast of Sendai, Japan.",
                    cameraAngle: "wide",
                    sfxTag: "[sfx:stinger]",
                    citationBadge: "USGS GLOBAL NETWORK",
                  },
                ],
              }),
            },
          ],
          usage: {
            inputTokens: { total: 30, noCache: 30, cacheRead: 0, cacheWrite: 0 },
            outputTokens: { total: 40, text: 40, reasoning: 0 },
          },
        };
      },
    });

    const sampleAlert: OsintAlertEvent = {
      id: "usgs_test_101",
      source: "USGS_EARTHQUAKE",
      severity: "CRITICAL",
      title: "M6.8 Earthquake — Sendai, Japan",
      location: "Off coast of Sendai, Japan",
      latitude: 38.26,
      longitude: 140.87,
      magnitudeOrIntensity: 6.8,
      timestamp: new Date().toISOString(),
      rawDetails: { depthKm: 40, tsunamiWarning: true },
    };

    const dispatch = await synthesizeBreakingDispatch(sampleAlert, "en", {
      customModel: mockModel,
    });

    expect(stepCall).toBe(2);
    expect(dispatch.headline).toContain("Sendai");
    expect(dispatch.toolsUsed).toContain("lookupPronunciationGlossary");
  });

  it("executes a genuine multi-step loop in researchRadarEngine with MockLanguageModelV4", async () => {
    let stepCall = 0;
    const mockModel = new MockLanguageModelV4({
      doGenerate: async () => {
        stepCall++;
        if (stepCall === 1) {
          return {
            warnings: [],
            finishReason: { unified: "tool-calls", raw: "tool-calls" },
            content: [
              {
                type: "tool-call",
                toolCallId: "call_rr_1",
                toolName: "verifyStockBrollKeywords",
                input: JSON.stringify({ keywords: ["technology", "growth"] }),
              },
            ],
            usage: {
              inputTokens: { total: 15, noCache: 15, cacheRead: 0, cacheWrite: 0 },
              outputTokens: { total: 15, text: 15, reasoning: 0 },
            },
          };
        }

        return {
          warnings: [],
          finishReason: { unified: "stop", raw: "stop" },
          content: [
            {
              type: "text",
              text: JSON.stringify({
                title: "Deep Investigation: Hyperscale Cloud Infrastructure",
                truthScore: 94,
                sensationalismIndex: 12,
                objectivityScore: 90,
                overallVerdict: "HIGHLY_CREDIBLE",
                executiveSummary: "Hyperscalers committed verified capital towards accelerated computing nodes.",
                claims: [
                  {
                    id: "c1",
                    claimText: "Capital expenditures rose by 40% year over year.",
                    verdict: "verified",
                    confidenceScore: 0.95,
                    sourceCitation: "Verified Filing",
                    explanation: "Cross-checked with quarterly audited disclosures.",
                  },
                ],
                metrics: [{ label: "Capex Growth", value: "+40%", context: "Annual expansion" }],
                suggestedScript: {
                  headline: "Hyperscale Capex Grows 40%",
                  segments: [
                    {
                      index: 0,
                      text: "Verified filings show capital expenditures surged forty percent.",
                      citationBadge: "Audited SEC Disclosures",
                    },
                  ],
                },
              }),
            },
          ],
          usage: {
            inputTokens: { total: 35, noCache: 35, cacheRead: 0, cacheWrite: 0 },
            outputTokens: { total: 50, text: 50, reasoning: 0 },
          },
        };
      },
    });

    const report = await analyzeResearchDocument(
      "Cloud infrastructure providers expanded their quarterly capex by forty percent.",
      "https://example.com/research-paper",
      { customModel: mockModel }
    );

    expect(stepCall).toBe(2);
    expect(report.truthScore).toBe(94);
    expect(report.overallVerdict).toBe("HIGHLY_CREDIBLE");
    expect(report.toolsUsed).toContain("verifyStockBrollKeywords");
  });

  it("bounds loop execution cleanly via maxSteps (stopWhen: stepCountIs(N))", async () => {
    let loopCount = 0;
    // Model returns a tool-call on every single step indefinitely
    const infiniteLoopModel = new MockLanguageModelV4({
      doGenerate: async () => {
        loopCount++;
        return {
          warnings: [],
          finishReason: { unified: "tool-calls", raw: "tool-calls" },
          content: [
            {
              type: "tool-call",
              toolCallId: `call_loop_${loopCount}`,
              toolName: "verifyStockBrollKeywords",
              input: JSON.stringify({ keywords: ["weather"] }),
            },
          ],
          usage: {
            inputTokens: { total: 5, noCache: 5, cacheRead: 0, cacheWrite: 0 },
            outputTokens: { total: 5, text: 5, reasoning: 0 },
          },
        };
      },
    });

    const tools = createEditorialTools();

    const result = await generateLlmText({
      prompt: "Investigate weather patterns",
      customModel: infiniteLoopModel,
      tools,
      maxSteps: 3,
    });

    expect(loopCount).toBe(3);
    expect(result.stepsCount).toBe(3);
    expect(result.toolNamesUsed).toContain("verifyStockBrollKeywords");
  });

  it("handles parallel tool calls in Step 1 and records all unique toolsUsed", async () => {
    (prisma.story.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      {
        id: "wire_story_tohoku",
        title: "Tohoku Region Geological Advisory",
        category: "Seismology",
        pubDate: new Date("2026-10-20T10:00:00Z"),
        link: "https://example.com/wire/tohoku",
        description: "Advisory on Tohoku plate movement.",
        fullContent: "Seismic sensors indicate minor stress accumulation in northern Tohoku.",
      },
    ]);

    let stepCall = 0;
    const mockModel = new MockLanguageModelV4({
      doGenerate: async () => {
        stepCall++;
        if (stepCall === 1) {
          // Model autonomously fires 2 tools simultaneously in parallel
          return {
            warnings: [],
            finishReason: { unified: "tool-calls", raw: "tool-calls" },
            content: [
              {
                type: "tool-call",
                toolCallId: "call_parallel_1",
                toolName: "searchIngestedWireArticles",
                input: JSON.stringify({ query: "Tohoku" }),
              },
              {
                type: "tool-call",
                toolCallId: "call_parallel_2",
                toolName: "lookupPronunciationGlossary",
                input: JSON.stringify({ terms: ["Tohoku"] }),
              },
            ],
            usage: {
              inputTokens: { total: 20, noCache: 20, cacheRead: 0, cacheWrite: 0 },
              outputTokens: { total: 25, text: 25, reasoning: 0 },
            },
          };
        }

        // Step 2: Model returns structured dispatch
        return {
          warnings: [],
          finishReason: { unified: "stop", raw: "stop" },
          content: [
            {
              type: "text",
              text: JSON.stringify({
                headline: "Tohoku Regional Geological Update",
                urgencyLevel: "MONITORING",
                recommendedPersonaId: "storm",
                studioPlateCategory: "tactical_radar",
                lowerThirdAlert: "MONITORING: TOHOKU REGION",
                tickerHeadline: "Tohoku Seismology Report Published",
                mapPrompt: "Tactical map of Tohoku coastline",
                scriptSegments: [
                  {
                    speaker: "Storm Mitchell",
                    text: "[sfx:whoosh] Regional monitors report minor tectonic activity in northern Tohoku.",
                    cameraAngle: "tight",
                    sfxTag: "[sfx:whoosh]",
                    citationBadge: "REGIONAL SEISMIC MONITOR",
                  },
                ],
              }),
            },
          ],
          usage: {
            inputTokens: { total: 40, noCache: 40, cacheRead: 0, cacheWrite: 0 },
            outputTokens: { total: 45, text: 45, reasoning: 0 },
          },
        };
      },
    });

    const sampleAlert: OsintAlertEvent = {
      id: "usgs_parallel_test",
      source: "USGS_EARTHQUAKE",
      severity: "MONITORING",
      title: "M4.6 Advisory — Tohoku Coast, Japan",
      location: "Tohoku Region, Japan",
      latitude: 39.5,
      longitude: 142.1,
      magnitudeOrIntensity: 4.6,
      timestamp: new Date().toISOString(),
      rawDetails: { depthKm: 50 },
    };

    const dispatch = await synthesizeBreakingDispatch(sampleAlert, "en", {
      customModel: mockModel,
    });

    expect(stepCall).toBe(2);
    expect(dispatch.toolsUsed).toBeDefined();
    expect(dispatch.toolsUsed).toContain("searchIngestedWireArticles");
    expect(dispatch.toolsUsed).toContain("lookupPronunciationGlossary");
    expect(dispatch.headline).toContain("Tohoku");
  });

  it("batch-verifies multiple segments via verifySegmentsBatch supporting objects and strings", async () => {
    const mockModel = new MockLanguageModelV4({
      doGenerate: async () => {
        return {
          warnings: [],
          finishReason: { unified: "stop", raw: "stop" },
          content: [
            {
              type: "text",
              text: JSON.stringify({
                isVerified: true,
                confidenceScore: 0.95,
                matchedClaim: "Verified batch segment claim.",
              }),
            },
          ],
          usage: {
            inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
            outputTokens: { total: 15, text: 15, reasoning: 0 },
          },
        };
      },
    });

    // 1. Verify array of objects with custom index
    const resultsObj = await verifySegmentsBatch(
      [
        { text: "First segment statement.", index: 0 },
        { text: "Second segment statement.", index: 1 },
      ],
      "Source article detailing both first and second statements.",
      "Reuters",
      { customModel: mockModel, enableTools: false }
    );

    expect(resultsObj).toHaveLength(2);
    expect(resultsObj[0].segmentIndex).toBe(0);
    expect(resultsObj[0].isVerified).toBe(true);
    expect(resultsObj[1].segmentIndex).toBe(1);

    // 2. Verify array of strings
    const resultsStr = await verifySegmentsBatch(
      ["Segment alpha text.", "Segment beta text."],
      "Source article detailing alpha and beta statements.",
      "Associated Press",
      { customModel: mockModel, enableTools: false }
    );

    expect(resultsStr).toHaveLength(2);
    expect(resultsStr[0].segmentIndex).toBe(0);
    expect(resultsStr[1].segmentIndex).toBe(1);
  });
});
