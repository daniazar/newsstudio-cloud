import { describe, it, expect } from "vitest";
import { NEURAL_3DMM_FRAGMENT_SHADER } from "../lib/realtime/neural3DMMShader";

describe("Sprint 13 Batch 10: L2 Intraoral Tongue-Teeth Occlusal Contact Ambient Occlusion", () => {
  describe("Shader Integration", () => {
    it("should implement dual-sided Gaussian contact ambient occlusion in renderInterlabialAperture", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("L2: Intraoral Tongue-Teeth Occlusal Contact Shadow");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("float distToContact = abs(apertureY - (tongueTop + 0.02));");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("float contactBand = exp(-pow(distToContact / 0.038, 2.0));");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("cavityColor *= (1.0 - contactAO * 0.44);");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("tonguePink *= (1.0 - contactAO * 0.48);");
    });

    it("should implement lateral gingival margin ambient occlusion", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("float lateralMarginAO = smoothstep(0.38, 0.72, abs(normMouth.x)) * tongueMaskY * 0.22;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("tonguePink *= (1.0 - lateralMarginAO);");
    });
  });

  describe("Mathematical Contact Crease Profile", () => {
    const computeContactAO = (
      apertureY: number,
      tongueElev: number,
      normMouthX: number = 0.0,
      tongueProt: number = 0.0
    ) => {
      const tongueTop = (1.0 - tongueElev) * 0.20 + tongueElev * -0.08 - tongueProt * 0.12;
      const distToContact = Math.abs(apertureY - (tongueTop + 0.02));
      const contactBand = Math.exp(-Math.pow(distToContact / 0.038, 2.0));
      const smoothElev = Math.max(0, Math.min(1, (tongueElev - 0.28) / (0.75 - 0.28)));
      const elevWeight = smoothElev * smoothElev * (3 - 2 * smoothElev);
      const smoothX = Math.max(0, Math.min(1, (0.68 - Math.abs(normMouthX)) / (0.68 - 0.15)));
      const xWeight = smoothX * smoothX * (3 - 2 * smoothX);
      return contactBand * elevWeight * xWeight;
    };

    it("should evaluate to peak contact shadow (1.0 band) at the exact incisal contact line", () => {
      const tongueElev = 0.85; // High alveolar elevation (/d, t, n/)
      const tongueTop = (1.0 - tongueElev) * 0.20 + tongueElev * -0.08;
      const contactJunctionY = tongueTop + 0.02;

      const ao = computeContactAO(contactJunctionY, tongueElev);
      expect(ao).toBeGreaterThan(0.95);
    });

    it("should smoothly fall off to zero at relaxed open-vowel tongue positions", () => {
      const tongueElev = 0.10; // Relaxed tongue floor on open vowel /aa/
      const ao = computeContactAO(0.18, tongueElev);
      expect(ao).toBe(0.0);
    });

    it("should localize the contact shadow within a narrow 1-2mm crease without flooding the mouth", () => {
      const tongueElev = 0.85;
      const tongueTop = (1.0 - tongueElev) * 0.20 + tongueElev * -0.08;
      const contactJunctionY = tongueTop + 0.02;

      // 0.08 units away from contact line
      const distantAO = computeContactAO(contactJunctionY + 0.08, tongueElev);
      expect(distantAO).toBeLessThan(0.05);
    });
  });
});
