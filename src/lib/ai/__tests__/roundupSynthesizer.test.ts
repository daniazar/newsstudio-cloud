import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  clusterArticlesByTheme,
  synthesizeMultiAnchorRoundup,
  generateFallbackRoundup,
  type StoryCluster,
} from "../roundupSynthesizer";
import { PERSONAS } from "../../tts/personas";
import type { IngestedArticle } from "../autonomousIngest";

const generateLlmObjectMock = vi.fn();

vi.mock("@/lib/llm/aiSdkGateway", () => ({
  generateLlmObject: (...args: unknown[]) => generateLlmObjectMock(...args),
}));

describe("Thematic Clustering & News Roundup Synthesizer (roundupSynthesizer.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockArticles: IngestedArticle[] = [
    {
      title: "New Generative AI Model Released with Reasoning Superpowers",
      url: "https://example.com/ai-1",
      source: "Tech Wire",
      category: "tech",
      rawText: "OpenAI and Anthropic announce new frontier neural models.",
      publishedAt: new Date().toISOString(),
      hash: "hash1",
    },
    {
      title: "Bitcoin Surges Past Milestone High Amid Institutional ETF Inflows",
      url: "https://example.com/crypto-1",
      source: "Crypto News",
      category: "crypto",
      rawText: "Bitcoin and Ethereum rally as global ETF trading reaches all time highs.",
      publishedAt: new Date().toISOString(),
      hash: "hash2",
    },
    {
      title: "Federal Reserve Deliberates Interest Rate Outlook Amid Inflation Data",
      url: "https://example.com/finance-1",
      source: "Reuters",
      category: "markets",
      rawText: "Stock market indexes Dow and S&P climb ahead of Fed rate decision.",
      publishedAt: new Date().toISOString(),
      hash: "hash3",
    },
  ];

  describe("clusterArticlesByTheme", () => {
    it("should cluster ingested articles by keyword matching into appropriate thematic buckets", () => {
      const clusters = clusterArticlesByTheme(mockArticles);

      expect(clusters.length).toBeGreaterThanOrEqual(2);
      const categories = clusters.map((c) => c.category);
      expect(categories).toContain("ai");
      expect(categories).toContain("crypto");
    });

    it("should limit maximum clusters according to maxClusters option", () => {
      const clusters = clusterArticlesByTheme(mockArticles, { maxClusters: 1 });
      expect(clusters.length).toBeLessThanOrEqual(1);
    });
  });

  describe("synthesizeMultiAnchorRoundup", () => {
    const mockClusters: StoryCluster[] = [
      {
        id: "cluster_ai",
        category: "ai",
        headline: "Frontier AI Models Transform Developer Workflows",
        articles: [mockArticles[0]],
        keywords: ["ai", "models", "neural"],
        importanceScore: 95,
      },
      {
        id: "cluster_crypto",
        category: "crypto",
        headline: "Crypto Markets Surge On Record ETF Volume",
        articles: [mockArticles[1]],
        keywords: ["crypto", "bitcoin", "etf"],
        importanceScore: 88,
      },
    ];

    it("should synthesize a multi-anchor broadcast script via LLM gateway", async () => {
      generateLlmObjectMock.mockResolvedValueOnce({
        object: {
          headline: "Global Tech & Crypto Roundup",
          category: "technology",
          summary: "Comprehensive multi-topic coverage.",
          segments: [
            {
              order: 1,
              personaId: PERSONAS[0].id,
              personaName: PERSONAS[0].name,
              cameraAngle: "cam1_wide",
              emotion: "intense_breaking_news",
              fsmCue: "[BREAKING]",
              dialogue: "Good evening. Tonight, AI models achieve unprecedented reasoning breakthroughs.",
              tickerHeadline: "AI: FRONTIER MODELS UNVEILED",
              brollKeywords: ["data center", "ai code"],
              estimatedDurationSec: 15,
            },
            {
              order: 2,
              personaId: PERSONAS[1].id,
              personaName: PERSONAS[1].name,
              cameraAngle: "cam2_left",
              emotion: "analytical_confident",
              fsmCue: "[DATA]",
              dialogue: "Turning to digital assets, institutional inflows push crypto to new heights.",
              tickerHeadline: "MARKETS: CRYPTO REACHES NEW PEAK",
              brollKeywords: ["trading floor", "charts"],
              estimatedDurationSec: 18,
            },
          ],
        },
        providerUsed: "gemini",
        modelUsed: "gemini-2.5-flash",
      });

      const result = await synthesizeMultiAnchorRoundup(mockClusters);

      expect(generateLlmObjectMock).toHaveBeenCalledTimes(1);
      expect(result.headline).toBe("Global Tech & Crypto Roundup");
      expect(result.segments.length).toBe(2);
      expect(result.leadAnchorId).toBe("ruby");
      expect(result.coAnchorId).toBe("blaze");
      expect(result.totalDurationSec).toBe(33);
    });

    it("should fall back gracefully to programmatic synthesizer if LLM fails", async () => {
      generateLlmObjectMock.mockRejectedValueOnce(new Error("API gateway connection dropped"));

      const result = await synthesizeMultiAnchorRoundup(mockClusters);

      expect(result.headline).toContain("NewsStudio Roundup");
      expect(result.segments.length).toBeGreaterThan(0);
      expect(result.segments[0].fsmCue).toBe("[BREAKING]");
      expect(result.segments[0].dialogue).toContain("Ruby");
    });
  });

  describe("generateFallbackRoundup", () => {
    it("should generate structured multi-scene script without network dependencies", () => {
      const mockCluster: StoryCluster = {
        id: "cluster_1",
        category: "tech",
        headline: "Autonomous Software Agents Deploy at Scale",
        articles: [mockArticles[0]],
        keywords: ["tech", "ai"],
        importanceScore: 90,
      };

      const result = generateFallbackRoundup([mockCluster]);

      expect(result.segments.length).toBeGreaterThanOrEqual(2);
      expect(result.segments[0].order).toBe(1);
      expect(result.segments[0].personaId).toBe(PERSONAS[0].id);
      expect(result.segments[result.segments.length - 1].fsmCue).toBe("[CONCLUSION]");
      expect(result.totalDurationSec).toBeGreaterThan(20);
    });
  });
});
