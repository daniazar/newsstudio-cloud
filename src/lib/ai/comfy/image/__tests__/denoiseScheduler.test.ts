import { describe, it, expect } from "vitest";
import { computeSceneComplexityScore, computeAdaptiveStageDenoise } from "../denoiseScheduler";

describe("Adaptive Denoise Scheduling Unit Tests (Task MP-12)", () => {
  it("should calculate correct baseline complexity score for empty text", () => {
    const score = computeSceneComplexityScore("");
    expect(score).toBe(0.2);
  });

  it("should scale complexity score higher for complex action and lighting keywords", () => {
    const lowComplexity = computeSceneComplexityScore("standing anchor in studio");
    const highComplexity = computeSceneComplexityScore("kneeling submissive, dramatic lighting, holding whiskey glass");

    expect(highComplexity).toBeGreaterThan(lowComplexity);
    expect(highComplexity).toBeGreaterThanOrEqual(0.7);
  });

  it("should return 1.0 denoise for Stage 1 (Environment)", () => {
    const denoise = computeAdaptiveStageDenoise(1);
    expect(denoise).toBe(1.0);
  });

  it("should dynamically scale Stage 2, Stage 3, Stage 4, Stage 5 denoise based on complexity", () => {
    const lowProps = computeAdaptiveStageDenoise(2, { sceneModifiers: "standing anchor" });
    const highProps = computeAdaptiveStageDenoise(2, { sceneModifiers: "intimate pose, dramatic lighting, news desk" });
    expect(highProps).toBeGreaterThan(lowProps);

    const lowPersona = computeAdaptiveStageDenoise(3, { sceneModifiers: "standing anchor" });
    const highPersona = computeAdaptiveStageDenoise(3, { sceneModifiers: "kneeling, dramatic lighting", isDualPersona: true });
    expect(highPersona).toBeGreaterThan(lowPersona);

    const lowRelight = computeAdaptiveStageDenoise(4, { sceneModifiers: "standing anchor" });
    const highRelight = computeAdaptiveStageDenoise(4, { sceneModifiers: "dramatic neon lighting" });
    expect(highRelight).toBeGreaterThan(lowRelight);
  });

  it("should enforce min/max safety boundaries for all stage denoise values", () => {
    const s2 = computeAdaptiveStageDenoise(2, { sceneModifiers: "dramatic action".repeat(10) });
    expect(s2).toBeLessThanOrEqual(0.75);
    expect(s2).toBeGreaterThanOrEqual(0.50);

    const s3 = computeAdaptiveStageDenoise(3, { sceneModifiers: "dramatic action".repeat(10), isDualPersona: true });
    expect(s3).toBeLessThanOrEqual(0.80);
    expect(s3).toBeGreaterThanOrEqual(0.60);

    const s4 = computeAdaptiveStageDenoise(4, { sceneModifiers: "dramatic action".repeat(10) });
    expect(s4).toBeLessThanOrEqual(0.28);
    expect(s4).toBeGreaterThanOrEqual(0.15);

    const s5 = computeAdaptiveStageDenoise(5, { sceneModifiers: "dramatic action".repeat(10) });
    expect(s5).toBeLessThanOrEqual(0.35);
    expect(s5).toBeGreaterThanOrEqual(0.20);
  });
});
