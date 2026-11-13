import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateFallbackRadarReport,
  analyzeResearchDocument,
  VerifiedClaimSchema,
  ResearchRadarReportSchema,
} from "../researchRadarEngine";

const generateLlmObjectMock = vi.fn();

vi.mock("@/lib/llm/aiSdkGateway", () => ({
  generateLlmObject: (...args: unknown[]) => generateLlmObjectMock(...args),
}));

describe("Multimodal Research & Fact-Check Radar Engine", () => {
  const sampleDoc = `NVIDIA reported record quarterly revenue of $30.04 billion, representing an 84% sequential growth. Data center hardware sales accounted for $26.3 billion. Operating margins expanded to 78.4% with zero debt.`;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateFallbackRadarReport", () => {
    it("evaluates truth score, sensationalism index, and objectivity score", () => {
      const report = generateFallbackRadarReport(sampleDoc, "https://sec.gov/10q");

      expect(report.title).toBeDefined();
      expect(report.truthScore).toBeGreaterThanOrEqual(80);
      expect(report.sensationalismIndex).toBeLessThanOrEqual(30);
      expect(report.objectivityScore).toBeGreaterThanOrEqual(70);
      expect(report.overallVerdict).toBe("HIGHLY_CREDIBLE");
    });

    it("extracts factual claims and quantitative data metrics", () => {
      const report = generateFallbackRadarReport(sampleDoc, "https://sec.gov/10q");

      expect(report.claims.length).toBeGreaterThanOrEqual(2);
      expect(report.claims[0].verdict).toBe("verified");
      expect(report.claims[0].confidenceScore).toBeGreaterThan(0.8);

      expect(report.metrics.length).toBeGreaterThanOrEqual(1);
    });

    it("synthesizes verified 3-segment broadcast news script with citation badges", () => {
      const report = generateFallbackRadarReport(sampleDoc, "https://sec.gov/10q");

      expect(report.suggestedScript.headline).toBeDefined();
      expect(report.suggestedScript.segments.length).toBe(3);
      expect(report.suggestedScript.segments[0].citationBadge).toBeDefined();
    });
  });

  describe("analyzeResearchDocument via AI SDK Gateway", () => {
    it("successfully analyzes research document using generateLlmObject", async () => {
      generateLlmObjectMock.mockResolvedValueOnce({
        object: {
          title: "Quarterly Financial Analysis",
          truthScore: 95,
          sensationalismIndex: 12,
          objectivityScore: 92,
          overallVerdict: "HIGHLY_CREDIBLE",
          executiveSummary: "Verified quarterly financial filings.",
          claims: [
            {
              id: "claim_1",
              claimText: "Quarterly revenue was $30.04 billion.",
              verdict: "verified",
              confidenceScore: 0.99,
              sourceCitation: "SEC Form 10-Q",
              explanation: "Directly matches filed 10-Q report.",
            },
          ],
          metrics: [
            {
              label: "Revenue",
              value: "$30.04B",
              context: "Quarterly total",
            },
          ],
          suggestedScript: {
            headline: "Tech Giant Reports Record Quarterly Revenue",
            segments: [
              {
                index: 1,
                text: "Quarterly figures confirm historic compute hardware growth.",
                citationBadge: "VERIFIED [SEC 10-Q]",
              },
            ],
          },
        },
        providerUsed: "gemini",
        modelUsed: "gemini-2.5-flash",
      });

      const report = await analyzeResearchDocument(sampleDoc, "https://sec.gov/10q");

      expect(generateLlmObjectMock).toHaveBeenCalledTimes(1);
      expect(report.truthScore).toBe(95);
      expect(report.overallVerdict).toBe("HIGHLY_CREDIBLE");
      expect(report.claims.length).toBe(1);
      expect(report.claims[0].verdict).toBe("verified");
      expect(report.metrics.length).toBe(1);
    });

    it("resiliently normalizes non-standard claim verdict via schema catch", () => {
      const parsed = VerifiedClaimSchema.parse({
        id: "claim_x",
        claimText: "Speculative claim",
        verdict: "completely_unsupported",
      });

      expect(parsed.verdict).toBe("verified");
    });

    it("resiliently normalizes non-standard report verdict via schema catch", () => {
      const parsed = ResearchRadarReportSchema.parse({
        title: "Test Report",
        overallVerdict: "NON_STANDARD_VERDICT",
      });

      expect(parsed.overallVerdict).toBe("HIGHLY_CREDIBLE");
    });

    it("falls back gracefully to programmatic report when LLM throws", async () => {
      generateLlmObjectMock.mockRejectedValueOnce(new Error("LLM Connection Error"));
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const report = await analyzeResearchDocument(sampleDoc, "https://sec.gov/10q");

      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(report.truthScore).toBeGreaterThanOrEqual(80);
      expect(report.claims.length).toBeGreaterThanOrEqual(2);

      consoleWarnSpy.mockRestore();
    });
  });
});
