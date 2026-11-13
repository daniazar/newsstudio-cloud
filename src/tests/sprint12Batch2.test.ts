import { describe, it, expect } from "vitest";
import { OnnxAudioVisemeEngine } from "@/lib/realtime/onnxAudioVisemeEngine";
import { LiveAnchorStageEngine } from "@/lib/realtime/liveAnchorStageEngine";
import { NEURAL_3DMM_FRAGMENT_SHADER } from "@/lib/realtime/neural3DMMShader";

describe("Sprint 12 Batch 2: Oral Biomechanics & GPU Rendering", () => {
  describe("D4: Loudness Compressor on Blendshapes", () => {
    it("should preserve full 1.0 scale during low and moderate speech loudness (<= 0.40)", () => {
      expect(OnnxAudioVisemeEngine.computeLoudnessCompression(0.0)).toBe(1.0);
      expect(OnnxAudioVisemeEngine.computeLoudnessCompression(0.15)).toBe(1.0);
      expect(OnnxAudioVisemeEngine.computeLoudnessCompression(0.35)).toBe(1.0);
      expect(OnnxAudioVisemeEngine.computeLoudnessCompression(0.40)).toBe(1.0);
    });

    it("should softly attenuate high-gain audio spikes (> 0.40) to prevent screaming cartoon look", () => {
      const compMid = OnnxAudioVisemeEngine.computeLoudnessCompression(0.60);
      const compHigh = OnnxAudioVisemeEngine.computeLoudnessCompression(0.85);
      const compMax = OnnxAudioVisemeEngine.computeLoudnessCompression(1.20);

      expect(compMid).toBeLessThan(1.0);
      expect(compMid).toBeGreaterThan(0.80);

      expect(compHigh).toBeLessThan(compMid);
      expect(compHigh).toBeGreaterThanOrEqual(0.65);

      // Max attenuation is bounded to 35% reduction (scale >= 0.65)
      expect(compMax).toBeCloseTo(0.65, 2);
    });
  });

  describe("A5: Mandibular Condyle TMJ Oscillation Drift", () => {
    it("should initialize with jawCycleCount at 0", () => {
      const canvas = document.createElement("canvas");
      const engine = new LiveAnchorStageEngine(canvas, null, { personaId: "ruby" });

      expect(engine.getJawCycleCount()).toBe(0);
      engine.dispose();
    });

    it("should track jaw cycles and produce bounded lateral sinusoidal drift via computeTmjDrift", () => {
      const canvas = document.createElement("canvas");
      const engine = new LiveAnchorStageEngine(canvas, null, { personaId: "ruby" });

      // Run multiple jaw opening and closing cycles
      // 1. Initial rest
      engine.computeTmjDrift(0.0);
      // 2. Open up to 0.45 (positive velocity)
      engine.computeTmjDrift(0.45);
      // 3. Close down to 0.10 (negative velocity -> zero-crossing detected, increments cycle)
      const res1 = engine.computeTmjDrift(0.10);
      expect(res1.jawCycleCount).toBe(1);
      expect(Math.abs(res1.tmjDrift)).toBeLessThanOrEqual(0.003);

      // 4. Open up to 0.55
      engine.computeTmjDrift(0.55);
      // 5. Close down to 0.05 (cycle 2)
      const res2 = engine.computeTmjDrift(0.05);
      expect(res2.jawCycleCount).toBe(2);
      expect(Math.abs(res2.tmjDrift)).toBeLessThanOrEqual(0.003);

      expect(engine.getJawCycleCount()).toBe(2);

      engine.dispose();
    });
  });

  describe("A1, A6, C2: Neural 3DMM Shader Code Integrity", () => {
    it("should contain A1 Bilabial Pre-Burst Air Pressure Cheek Swell in fragment shader", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("A1: Bilabial Pre-Burst Air Pressure Cheek Swell");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("plosivePreBurst");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("plosiveCheekPush");
    });

    it("should contain C2 Breathing-Coupled Nostril Flare in fragment shader", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("C2: Breathing-Coupled Nostril Flare");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("inhalationFlare");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("nostrilFlareDisplacement");
    });

    it("should contain A6 Upper Lip Philtrum Column Tenting in fragment shader", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("A6: Upper Lip Philtrum Column Tenting on Open Vowels");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("tentingGain");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("philtrumHighlight");
    });
  });
});
