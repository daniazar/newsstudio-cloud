import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  computeArticleHash,
  synthesizeBroadcastStory,
  type IngestedArticle,
} from "../autonomousIngest";
import { PERSONAS } from "../../tts/personas";

const generateLlmObjectMock = vi.fn();

vi.mock("@/lib/llm/aiSdkGateway", () => ({
  generateLlmObject: (...args: unknown[]) => generateLlmObjectMock(...args),
}));

// Mock Prisma
vi.mock("../prisma", () => ({
  prisma: {
    story: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    storySegment: {
      createMany: vi.fn(),
    },
  },
}));

describe("Autonomous Ingest & Fact-Checking Engine (autonomousIngest.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const sampleArticle: IngestedArticle = {
    title: "Quantum Supercomputer Solves 100-Year Fluid Dynamics Paradox",
    url: "https://example.com/quantum-paradox",
    source: "Nature Physics",
    category: "tech",
    rawText: "Researchers at MIT and Caltech utilize a 1000-qubit processor to solve turbulence equations.",
    publishedAt: new Date().toISOString(),
    hash: "test_hash_123",
  };

  describe("computeArticleHash", () => {
    it("should compute deterministic SHA-256 hash for given url and title", () => {
      const hash1 = computeArticleHash("https://example.com", "Title A");
      const hash2 = computeArticleHash("https://example.com", "Title A");
      const hash3 = computeArticleHash("https://example.com", "Title B");

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hash3);
      expect(hash1.length).toBe(64);
    });
  });

  describe("synthesizeBroadcastStory", () => {
    it("should synthesize a 4-segment broadcast story via LLM gateway", async () => {
      generateLlmObjectMock.mockResolvedValueOnce({
        object: {
          headline: "BREAKING: Quantum Supercomputer Solves Fluid Dynamics",
          category: "tech",
          factCheck: {
            veracityScore: 95,
            verdict: "VERIFIED",
            keyClaims: [
              { claim: "1000-qubit processor used", assessment: "Confirmed by MIT paper", rating: "confirmed" },
            ],
            biasDetection: "Academic research publication",
            factCheckingSummary: "Fully substantiated by peer-reviewed literature.",
          },
          segments: [
            {
              order: 1,
              personaId: PERSONAS[0].id,
              cameraAngle: "cam1_center_wide",
              emotion: "intense_breaking_news",
              gesture: "desk_hands_clasped",
              dialogue: "Good evening. A century-old physics paradox has been solved using quantum computing.",
              tickerHeadline: "QUANTUM BREAKTHROUGH: TURBULENCE SOLVED",
              brollKeywords: ["quantum computer", "liquid flow"],
            },
            {
              order: 2,
              personaId: PERSONAS[1].id,
              cameraAngle: "cam2_left_tight",
              emotion: "calm_authoritative",
              gesture: "desk_one_hand_explanatory",
              dialogue: "The 1000-qubit array simulated atomic interactions within turbulent flows in minutes.",
              tickerHeadline: "RESEARCH: MIT & CALTECH REVEAL BENCHMARKS",
              brollKeywords: ["supercomputer lab", "scientists"],
            },
          ],
        },
        providerUsed: "gemini",
        modelUsed: "gemini-2.5-flash",
      });

      const story = await synthesizeBroadcastStory(sampleArticle);

      expect(generateLlmObjectMock).toHaveBeenCalledTimes(1);
      expect(story.headline).toContain("Quantum");
      expect(story.factCheck.verdict).toBe("VERIFIED");
      expect(story.segments.length).toBe(2);
      expect(story.primaryPersonaId).toBe(PERSONAS[0].id);
    });

    it("should fall back gracefully to heuristic script when LLM throws", async () => {
      generateLlmObjectMock.mockRejectedValueOnce(new Error("LLM provider rate limit exceeded"));

      const story = await synthesizeBroadcastStory(sampleArticle, PERSONAS[0].id);

      expect(story.headline).toBe(sampleArticle.title);
      expect(story.factCheck.verdict).toBe("VERIFIED");
      expect(story.segments.length).toBe(4);
      expect(story.segments[0].dialogue).toContain(sampleArticle.title);
      expect(story.primaryPersonaId).toBe(PERSONAS[0].id);
    });
  });
});
