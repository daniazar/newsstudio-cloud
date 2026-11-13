import { describe, it, expect } from "vitest";
import { STUDIO_SETS, type CompositionProps, type RemotionSegment } from "@/lib/types";
import { heuristicVerify, verifySegmentFact } from "@/lib/ai/factChecker";

describe("Editor Features Suite", () => {
  describe("360 Virtual Studio Sets", () => {
    it("should export the predefined studio sets", () => {
      expect(STUDIO_SETS.length).toBeGreaterThanOrEqual(6);
      const highrise = STUDIO_SETS.find(s => s.id === "highrise_newsroom");
      expect(highrise).toBeDefined();
      expect(highrise?.name).toContain("High-Rise");
      expect(highrise?.category).toBe("Broadcast");
    });
  });

  describe("Fact-Check Radar & Heuristics", () => {
    const article = "Anthropic and Google announced a major breakthrough in quantum computing with 1000 qubit fidelity in 2026.";

    it("should verify factual alignment accurately", () => {
      const result = heuristicVerify(
        "Anthropic and Google announced a major quantum breakthrough with 1000 qubits in 2026.",
        article
      );
      expect(result.isVerified).toBe(true);
      expect(result.confidenceScore).toBeGreaterThanOrEqual(0.7);
    });

    it("should evaluate unmatched numbers if article lacks statistics", () => {
      const result = heuristicVerify(
        "Tesla sold 999999 vehicles in 1990.",
        article
      );
      expect(result.confidenceScore).toBeLessThanOrEqual(0.75);
    });
  });

  describe("Composition & Ken Burns Settings", () => {
    it("should support stem volumes and custom ticker in composition props", () => {
      const props: CompositionProps = {
        aspectRatio: "vertical",
        segments: [],
        stemVolumes: {
          voice: 1.0,
          music: 0.2,
          sfx: 0.6,
          ambience: 0.15,
        },
        customTickerText: "MARKETS RALLY | TECH HITS ALL TIME HIGH | FED HOLDS RATES",
        studioSetId: "cyber_metropolis",
      };

      expect(props.stemVolumes?.music).toBe(0.2);
      expect(props.customTickerText).toContain("TECH HITS ALL TIME HIGH");
      expect(props.studioSetId).toBe("cyber_metropolis");
    });

    it("should allow segment Ken Burns motion choreography", () => {
      const segment: RemotionSegment = {
        index: 0,
        text: "Breaking update from our downtown bureau.",
        startFrame: 0,
        endFrame: 150,
        mediaSettings: {
          kenBurnsDirection: "push_in",
          studioSetId: "field_breaking",
          coAnchorId: "blaze",
        },
      };

      expect(segment.mediaSettings?.kenBurnsDirection).toBe("push_in");
      expect(segment.mediaSettings?.studioSetId).toBe("field_breaking");
      expect(segment.mediaSettings?.coAnchorId).toBe("blaze");
    });
  });
});
