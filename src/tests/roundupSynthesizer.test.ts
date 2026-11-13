/**
 * src/tests/roundupSynthesizer.test.ts
 *
 * Test suite for Thematic Clustering & Multi-Anchor Television News Roundup Synthesizer.
 */

import { describe, it, expect, vi } from "vitest";
import {
  clusterArticlesByTheme,
  synthesizeMultiAnchorRoundup,
  generateFallbackRoundup,
  StoryCluster,
} from "../lib/ai/roundupSynthesizer";
import { IngestedArticle } from "../lib/ai/autonomousIngest";
import { PERSONAS } from "../lib/tts/personas";

vi.mock("@/lib/llm/aiSdkGateway", () => ({
  generateLlmObject: vi.fn().mockRejectedValue(new Error("AI Gateway offline in test environment")),
}));

describe("Roundup Synthesizer & Thematic Clustering Suite", () => {
  const mockArticles: IngestedArticle[] = [
    {
      title: "OpenAI and Google Announce Next-Gen Gemini and GPT Reasoning Models",
      url: "https://techcrunch.com/ai-breakthrough",
      source: "TechCrunch AI",
      category: "tech",
      rawText: "Major artificial intelligence research labs unveiled multi-modal neural network advancements.",
      publishedAt: new Date().toISOString(),
      hash: "hash_ai_1",
    },
    {
      title: "Anthropic Releases Claude 3.7 with Hybrid Fast-Thinking Architecture",
      url: "https://reuters.com/anthropic-model",
      source: "Reuters",
      category: "tech",
      rawText: "Anthropic introduces its latest frontier LLM with variable compute budgets.",
      publishedAt: new Date().toISOString(),
      hash: "hash_ai_2",
    },
    {
      title: "Bitcoin Surges Above $95,000 as Institutional Crypto Inflows Accelerate",
      url: "https://coindesk.com/btc-rally",
      source: "CoinDesk Crypto",
      category: "crypto",
      rawText: "Crypto markets rally across BTC and Ethereum following ETF capital investments.",
      publishedAt: new Date().toISOString(),
      hash: "hash_crypto_1",
    },
    {
      title: "Federal Reserve Signals Rate Cuts as Inflation Cools Across Global Markets",
      url: "https://bloomberg.com/fed-rates",
      source: "Bloomberg",
      category: "finance",
      rawText: "Central banks indicate monetary easing as economic indicators point toward stable GDP growth.",
      publishedAt: new Date().toISOString(),
      hash: "hash_markets_1",
    },
  ];

  describe("clusterArticlesByTheme", () => {
    it("should cluster ingested articles into accurate thematic topic groups", () => {
      const clusters = clusterArticlesByTheme(mockArticles);

      expect(clusters.length).toBeGreaterThanOrEqual(2);
      
      const aiCluster = clusters.find((c) => c.category === "ai");
      expect(aiCluster).toBeDefined();
      expect(aiCluster?.articles.length).toBe(2);
      expect(aiCluster?.keywords).toBeDefined();

      const cryptoCluster = clusters.find((c) => c.category === "crypto");
      expect(cryptoCluster).toBeDefined();
      expect(cryptoCluster?.articles.length).toBe(1);

      const marketsCluster = clusters.find((c) => c.category === "markets");
      expect(marketsCluster).toBeDefined();
    });

    it("should calculate importance scores based on article volume", () => {
      const clusters = clusterArticlesByTheme(mockArticles);
      const sorted = [...clusters].sort((a, b) => b.importanceScore - a.importanceScore);
      expect(clusters[0].importanceScore).toBe(sorted[0].importanceScore);
    });
  });

  describe("generateFallbackRoundup", () => {
    it("should generate a multi-scene broadcast script alternating between Lead and Co-Anchor", () => {
      const clusters = clusterArticlesByTheme(mockArticles);
      const ruby = PERSONAS.find((p) => p.id === "ruby") || PERSONAS[0];
      const blaze = PERSONAS.find((p) => p.id === "blaze") || PERSONAS[1];

      const roundup = generateFallbackRoundup(clusters, ruby, blaze);

      expect(roundup.headline).toBeDefined();
      expect(roundup.segments.length).toBeGreaterThanOrEqual(4);
      expect(roundup.totalDurationSec).toBeGreaterThan(45);

      // Verify Intro scene
      const intro = roundup.segments[0];
      expect(intro.order).toBe(1);
      expect(intro.personaId).toBe("ruby");
      expect(intro.cameraAngle).toBe("cam1_wide");
      expect(intro.fsmCue).toBe("[BREAKING]");
      expect(intro.tickerHeadline.length).toBeLessThanOrEqual(80);

      // Verify alternating anchor dynamic
      const personasUsed = new Set(roundup.segments.map((s) => s.personaId));
      expect(personasUsed.has("ruby")).toBe(true);
      expect(personasUsed.has("blaze")).toBe(true);

      // Verify Outro scene
      const outro = roundup.segments[roundup.segments.length - 1];
      expect(outro.fsmCue).toBe("[CONCLUSION]");
      expect(outro.personaId).toBe("ruby");
    });

    it("should assign distinct camera cues and FSM cues to each scene", () => {
      const clusters = clusterArticlesByTheme(mockArticles);
      const roundup = generateFallbackRoundup(clusters);

      for (const seg of roundup.segments) {
        expect(["cam1_wide", "cam2_left", "cam3_closeup"]).toContain(seg.cameraAngle);
        expect(["[BREAKING]", "[DATA]", "[EXPLAIN]", "[CONCLUSION]", "[SUMMARY]", "[FOCUS]"]).toContain(seg.fsmCue);
        expect(seg.dialogue.length).toBeGreaterThan(15);
        expect(seg.tickerHeadline.length).toBeGreaterThan(5);
        expect(seg.brollKeywords.length).toBeGreaterThan(0);
      }
    });
  });

  describe("synthesizeMultiAnchorRoundup", () => {
    it("should synthesize broadcast roundup with default fallbacks when offline", async () => {
      const clusters = clusterArticlesByTheme(mockArticles);
      const result = await synthesizeMultiAnchorRoundup(clusters, {
        leadPersonaId: "ruby",
        coPersonaId: "blaze",
      });

      expect(result.leadAnchorId).toBe("ruby");
      expect(result.coAnchorId).toBe("blaze");
      expect(result.segments.length).toBeGreaterThan(0);
      expect(result.totalDurationSec).toBeGreaterThan(0);
    });
  });
});
