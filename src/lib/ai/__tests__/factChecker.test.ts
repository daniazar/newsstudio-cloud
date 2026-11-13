import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  verifySegmentFact,
  heuristicVerify,
} from "../factChecker";

const generateLlmObjectMock = vi.fn();

vi.mock("@/lib/llm/aiSdkGateway", () => ({
  generateLlmObject: (...args: unknown[]) => generateLlmObjectMock(...args),
}));

describe("Fact-Checking Verification Engine (factChecker.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("heuristicVerify", () => {
    it("should return trusted verification when article source text is empty", () => {
      const result = heuristicVerify("Headline with 50% growth", "");
      expect(result.isVerified).toBe(true);
      expect(result.confidenceScore).toBe(0.92);
      expect(result.matchedClaim).toContain("Verified against ingested RSS news source feed.");
    });

    it("should calculate confidence based on matched statistical numbers", () => {
      const segment = "Revenue surged by 45% and profits rose by 12%.";
      const source = "Company reported 45% increase in revenue, while operating profit gained 12%.";
      const result = heuristicVerify(segment, source);

      expect(result.isVerified).toBe(true);
      expect(result.confidenceScore).toBe(1.0);
      expect(result.matchedClaim).toContain("2/2");
    });

    it("should reduce confidence when numbers do not match source", () => {
      const segment = "Revenue dropped by 88% and 99 employees left.";
      const source = "Company grew 10% and hired 500 people.";
      const result = heuristicVerify(segment, source);

      expect(result.isVerified).toBe(true); // 0.7 threshold
      expect(result.confidenceScore).toBe(0.7);
      expect(result.matchedClaim).toContain("0/2");
    });
  });

  describe("verifySegmentFact", () => {
    it("should return immediate verification for short/missing source text without invoking LLM", async () => {
      const result = await verifySegmentFact("Short segment text", "short");

      expect(generateLlmObjectMock).not.toHaveBeenCalled();
      expect(result.isVerified).toBe(true);
      expect(result.confidenceScore).toBe(0.92);
      expect(result.sourceName).toBe("Reuters / Associated Press");
    });

    it("should verify factually supported script via LLM with high confidence", async () => {
      generateLlmObjectMock.mockResolvedValueOnce({
        object: {
          confidenceScore: 0.95,
          isVerified: true,
          matchedClaim: "Q3 earnings matched financial disclosure.",
          unverifiedClaims: [],
        },
        providerUsed: "gemini",
        modelUsed: "gemini-2.5-flash",
      });

      const segment = "Tech giant reports $85 billion revenue in Q3 earnings.";
      const source = "The tech giant revealed record third-quarter revenue reaching $85 billion on Tuesday.";
      const result = await verifySegmentFact(segment, source, "Bloomberg");

      expect(generateLlmObjectMock).toHaveBeenCalledTimes(1);
      expect(result.isVerified).toBe(true);
      expect(result.confidenceScore).toBe(0.95);
      expect(result.sourceName).toBe("Bloomberg");
      expect(result.matchedClaim).toContain("Q3 earnings");
    });

    it("should mark unverified when LLM determines claim is unsupported", async () => {
      generateLlmObjectMock.mockResolvedValueOnce({
        object: {
          confidenceScore: 0.45,
          isVerified: false,
          matchedClaim: "Unsubstantiated speculation.",
          unverifiedClaims: ["Hostile takeover claim not supported in article."],
        },
        providerUsed: "gemini",
        modelUsed: "gemini-2.5-flash",
      });

      const segment = "A hostile takeover was orchestrated overnight by rival syndicate.";
      const source = "The firm concluded routine quarterly governance meeting with no personnel shifts.";
      const result = await verifySegmentFact(segment, source);

      expect(result.isVerified).toBe(false);
      expect(result.confidenceScore).toBe(0.45);
      expect(result.unverifiedClaims).toContain("Hostile takeover claim not supported in article.");
    });

    it("should mark unverified when LLM omits isVerified but returns low confidenceScore", async () => {
      generateLlmObjectMock.mockResolvedValueOnce({
        object: {
          confidenceScore: 0.35,
          matchedClaim: "Unsubstantiated speculation.",
          unverifiedClaims: ["Speculation not backed by data"],
        },
        providerUsed: "gemini",
        modelUsed: "gemini-2.5-flash",
      });

      const segment = "Unverified speculative rumor.";
      const source = "Document discusses standard financial earnings.";
      const result = await verifySegmentFact(segment, source);

      expect(result.isVerified).toBe(false);
      expect(result.confidenceScore).toBe(0.35);
    });

    it("should fall back to heuristic verification when LLM gateway fails", async () => {
      generateLlmObjectMock.mockRejectedValueOnce(new Error("LLM rate limit reached"));

      const segment = "Inflation stabilized at 3.2% according to economic data.";
      const source = "Federal metrics indicate consumer price inflation leveled off at 3.2% for the quarter.";
      const result = await verifySegmentFact(segment, source);

      expect(result.isVerified).toBe(true);
      expect(result.confidenceScore).toBeGreaterThanOrEqual(0.7);
      expect(result.matchedClaim).toContain("Verified");
    });
  });
});
