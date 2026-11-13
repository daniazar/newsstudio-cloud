import { describe, it, expect } from "vitest";
import { OcularLifeEngine } from "@/lib/realtime/ocularLifeEngine";
import { ProceduralLivePortraitDriver } from "@/lib/realtime/proceduralLivePortraitDriver";
import { getStudioBgLuminance } from "@/lib/realtime/studioBackgrounds";
import { NEURAL_3DMM_FRAGMENT_SHADER } from "@/lib/realtime/neural3DMMShader";

describe("Sprint 12 Batch 3: Ocular Vitality & Anatomical Shadows", () => {
  describe("B1: Corneal Moisture Blink Refresh (Wet Tear Film Reset)", () => {
    it("should initialize with fresh tear film and high specular freshness (~1.25)", () => {
      const engine = new OcularLifeEngine();
      expect(engine.getTearFilmAge()).toBe(0.0);
      expect(engine.getTearFilmFreshness()).toBeCloseTo(1.25, 2);
    });

    it("should smoothly decay tear film freshness over seconds of open fixation", () => {
      const engine = new OcularLifeEngine();
      for (let t = 0; t <= 0.5; t += 0.033) engine.update(t, 0, 0, false, 1.0, 0.0);
      const f1 = engine.getTearFilmFreshness();

      for (let t = 0.533; t <= 1.5; t += 0.033) engine.update(t, 0, 0, false, 1.0, 0.0);
      const f2 = engine.getTearFilmFreshness();

      for (let t = 1.533; t <= 3.5; t += 0.033) engine.update(t, 0, 0, false, 1.0, 0.0);
      const f3 = engine.getTearFilmFreshness();

      expect(f1).toBeLessThan(1.25);
      expect(f2).toBeLessThan(f1);
      expect(f3).toBeLessThan(f2);
      expect(f3).toBeGreaterThan(1.0); // Never drops below 1.0 baseline
    });

    it("should reset tear film age to 0.0 and restore 1.25 specular boost upon blink reopening", () => {
      const engine = new OcularLifeEngine();

      // Fixate for 4 seconds so tear film evaporates (stepping across frames)
      for (let t = 0; t <= 4.0; t += 0.033) {
        engine.update(t, 0, 0, false, 1.0, 0.0);
      }
      expect(engine.getTearFilmFreshness()).toBeLessThan(1.05);

      // Blink closes (eyelid progress > 0.70)
      engine.update(4.05, 0, 0, false, 1.0, 0.85);

      // Blink re-opens (eyelid progress < 0.25)
      engine.update(4.15, 0, 0, false, 1.0, 0.05);

      // Tear film has freshly spread across cornea!
      expect(engine.getTearFilmAge()).toBeLessThan(0.16);
      expect(engine.getTearFilmFreshness()).toBeGreaterThanOrEqual(1.20);
    });
  });

  describe("B2: Pupillary Light Reflex (PLR)", () => {
    it("should estimate background set luminance accurately from preset metadata", () => {
      expect(getStudioBgLuminance("studio_plate_standup_skyline_9x16")).toBe(0.70);
      expect(getStudioBgLuminance("transparent_alpha")).toBe(0.85);
      expect(getStudioBgLuminance(null)).toBe(0.50);
      expect(getStudioBgLuminance(undefined)).toBe(0.50);
    });

    it("should constrict pupil under bright lighting (bgLuminance = 1.0) with biological lag", () => {
      const engine = new OcularLifeEngine();

      // Start at neutral 0.5
      engine.update(0.0, 0, 0, false, 1.0, 0.0, 0.5);
      expect(engine.getPlrScale()).toBeCloseTo(1.0, 2);

      // Step forward 600ms in a bright white cyclorama set (bgLuminance = 1.0)
      for (let t = 0.016; t <= 0.60; t += 0.016) {
        engine.update(t, 0, 0, false, 1.0, 0.0, 1.0);
      }

      // Pupils should be constricted (scale < 1.0)
      expect(engine.getPlrScale()).toBeLessThan(0.96);
      expect(engine.getPlrScale()).toBeGreaterThan(0.88);
    });

    it("should dilate pupil under dark cyber/night sets (bgLuminance = 0.0)", () => {
      const engine = new OcularLifeEngine();

      // Step forward 600ms in a dark cyber set (bgLuminance = 0.0)
      for (let t = 0.016; t <= 0.60; t += 0.016) {
        engine.update(t, 0, 0, false, 1.0, 0.0, 0.0);
      }

      // Pupils should be dilated (scale > 1.0)
      expect(engine.getPlrScale()).toBeGreaterThan(1.04);
      expect(engine.getPlrScale()).toBeLessThan(1.12);
    });

    it("should propagate plrScale and tearFilmFreshness through ProceduralLivePortraitDriver", () => {
      const driver = new ProceduralLivePortraitDriver();
      driver.setBgLuminance(0.90);

      const state = driver.update();
      expect(state.tearFilmFreshness).toBeDefined();
      expect(state.tearFilmFreshness).toBeGreaterThanOrEqual(1.0);
      expect(state.plrScale).toBeDefined();
      expect(state.plrScale).toBeLessThanOrEqual(1.0);
    });
  });

  describe("C3, A3, E5: Neural 3DMM Shader Code Integrity", () => {
    it("should contain C3 Orbital Rim Pitch Shadow and Glabellar Furrow in fragment shader", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("C3: Orbital Rim Pitch Shadow");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("pitchShadowGain");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("orbitalShadeL");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("C3: Glabellar Furrow Shading");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("glabellaShadow");
    });

    it("should contain A3 Velum Soft Palate Acoustic Coloring in fragment shader", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("A3: Velum Soft Palate Nasal Coupling & Acoustic Coloring");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("nasalCoupling");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("A3: Nasal Bridge Acoustic Resonance Highlight");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("nasalGlow");
    });

    it("should contain E5 Pre-Multiplied Alpha Compositing equations in fragment shader", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("E5: Pre-Multiplied Alpha Compositing against Virtual Studio Set");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("bgColor.rgb * (1.0 - alpha) + videoColor.rgb * alpha");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("E5: Pre-multiplied Alpha blend into procedural atmosphere");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("E5: True pre-multiplied alpha transparent WebM/canvas output");
    });

    it("should declare and upload u_tearFilmFreshness uniform", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("uniform float u_tearFilmFreshness;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("tearBoost");
    });
  });
});
