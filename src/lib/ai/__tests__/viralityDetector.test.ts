import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  analyzeScriptVirality,
  generateFallbackViralityAnalysis,
  ViralClipMomentSchema,
} from "../viralityDetector";

const generateLlmObjectMock = vi.fn();

vi.mock("@/lib/llm/aiSdkGateway", () => ({
  generateLlmObject: (...args: unknown[]) => generateLlmObjectMock(...args),
}));

describe("Virality Detector & Shorts Clipper", () => {
  const sampleScript = `
    NVIDIA has officially locked down over 84% of the global AI chip market, shattering all existing enterprise forecasts.
    The sudden surge in enterprise GPU demand triggered a global bottleneck across major server supply chains.
    Over thirty billion dollars in single-day derivatives turnover triggered an immediate short squeeze across international markets.
    Analysts are now questioning whether legacy tech giants can ever catch up to this dominant hardware lead.
    The implications for artificial intelligence and compute infrastructure are historic.
  `;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateFallbackViralityAnalysis", () => {
    it("generates 3 ranked viral moment clips with valid timecodes", () => {
      const result = generateFallbackViralityAnalysis(sampleScript, 30, 2.5);

      expect(result.overallStoryScore).toBeGreaterThanOrEqual(80);
      expect(result.clips.length).toBe(3);

      const [clip1, clip2, clip3] = result.clips;

      expect(clip1.rank).toBe(1);
      expect(clip1.viralScore).toBeGreaterThanOrEqual(85);
      expect(clip1.hookScore).toBeGreaterThan(80);
      expect(clip1.hookHeadline).toBeDefined();
      expect(clip1.durationSeconds).toBeGreaterThan(0);
      expect(clip1.startFrame).toBe(0);

      expect(clip2.rank).toBe(2);
      expect(clip2.suggestedCaptionStyle).toBe("beast_pop");

      expect(clip3.rank).toBe(3);
      expect(clip3.suggestedCaptionStyle).toBe("cyber_neon");
    });

    it("calculates start and end frames matching fps", () => {
      const fps = 60;
      const result = generateFallbackViralityAnalysis(sampleScript, fps, 2.5);

      result.clips.forEach((clip) => {
        expect(clip.startFrame).toBe(Math.round(clip.startTimeSeconds * fps));
        expect(clip.endFrame).toBe(Math.round(clip.endTimeSeconds * fps));
        expect(clip.hashtags.length).toBeGreaterThan(0);
      });
    });
  });

  describe("analyzeScriptVirality via AI SDK Gateway", () => {
    it("successfully analyzes virality via generateLlmObject", async () => {
      generateLlmObjectMock.mockResolvedValueOnce({
        object: {
          overallStoryScore: 92,
          primaryHook: "NVIDIA controls 84% of all AI compute.",
          clips: [
            {
              rank: 1,
              title: "Market Monopoly Exposed",
              hookHeadline: "NVIDIA OWNS 84% OF AI",
              viralScore: 95,
              hookScore: 98,
              conflictScore: 90,
              climaxScore: 92,
              startTimeSeconds: 0,
              endTimeSeconds: 28,
              durationSeconds: 28,
              rationale: "Massive monopoly statistic creates instant retention.",
              suggestedCaptionStyle: "hormozi_glow",
              hashtags: ["#NVIDIA", "#AI", "#Finance"],
              excerptText: "NVIDIA has officially locked down over 84%...",
            },
          ],
        },
        providerUsed: "gemini",
        modelUsed: "gemini-2.5-flash",
      });

      const result = await analyzeScriptVirality(sampleScript, { fps: 30, wpm: 150 });

      expect(generateLlmObjectMock).toHaveBeenCalledTimes(1);
      expect(result.overallStoryScore).toBe(92);
      expect(result.primaryHook).toBe("NVIDIA controls 84% of all AI compute.");
      expect(result.clips.length).toBe(1);
      expect(result.clips[0].startFrame).toBe(0);
      expect(result.clips[0].endFrame).toBe(30 * 28);
      expect(result.clips[0].suggestedCaptionStyle).toBe("hormozi_glow");
    });

    it("resiliently normalizes non-standard caption style via schema catch", () => {
      const parsed = ViralClipMomentSchema.parse({
        title: "Test Clip",
        suggestedCaptionStyle: "unsupported_unknown_style",
      });

      expect(parsed.suggestedCaptionStyle).toBe("hormozi_glow");
    });

    it("falls back gracefully to programmatic analysis when LLM throws", async () => {
      generateLlmObjectMock.mockRejectedValueOnce(new Error("LLM Rate limit"));
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await analyzeScriptVirality(sampleScript, { fps: 30 });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[analyzeScriptVirality] LLM analysis failed, using heuristic fallback:",
        "LLM Rate limit"
      );
      expect(result.clips.length).toBe(3);
      expect(result.overallStoryScore).toBeGreaterThanOrEqual(80);

      consoleErrorSpy.mockRestore();
    });
  });
});
