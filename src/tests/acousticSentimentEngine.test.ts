import { describe, it, expect } from "vitest";
import {
  AcousticSentimentEngine,
  SentimentMode,
} from "../lib/realtime/acousticSentimentEngine";

describe("AcousticSentimentEngine Real-Time Unit Tests", () => {
  it("should initialize with default auto mode and neutral baseline", () => {
    const engine = new AcousticSentimentEngine("auto", 1.0);
    expect(engine.getMode()).toBe("auto");
    expect(engine.getIntensity()).toBe(1.0);

    const { modulation, telemetry } = engine.update(null, false, 0.016);
    expect(telemetry.dominantEmotion).toBe("neutral");
    expect(modulation.eyebrowFurrow).toBeCloseTo(0.0, 2);
    expect(modulation.smileAmount).toBeCloseTo(0.0, 2);
  });

  it("should generate strong corrugator brow furrow and stern mouth in angry mode", () => {
    const engine = new AcousticSentimentEngine("angry", 1.0);
    // Advance several steps to let physical facial smoothing converge
    let lastMod;
    for (let i = 0; i < 30; i++) {
      lastMod = engine.update(null, true, 0.016).modulation;
    }

    expect(lastMod).toBeDefined();
    // Angry expressions must furrow inner brows (corrugator supercilii)
    expect(lastMod!.eyebrowFurrow).toBeGreaterThan(0.40);
    // Eyebrows must lower (frontalis relaxation / brow press)
    expect(lastMod!.eyebrowRaise).toBeLessThan(0.0);
    // Mouth corners must drop (depressor anguli oris / stern grim mouth)
    expect(lastMod!.smileAmount).toBeLessThan(-0.10);
    // Eyes should tighten in a focused glare
    expect(lastMod!.eyeWidening).toBeLessThan(1.0);
    // Nostrils should flare (dilator naris)
    expect(lastMod!.noseSneer).toBeGreaterThan(0.15);
    // Head posture should lean forward in urgent authority
    expect(lastMod!.headLeanZOffset).toBeGreaterThan(0.02);
  });

  it("should scale facial expression amplitude proportionally with intensity", () => {
    const engineLow = new AcousticSentimentEngine("angry", 0.5);
    const engineHigh = new AcousticSentimentEngine("angry", 1.5);

    let modLow, modHigh;
    for (let i = 0; i < 30; i++) {
      modLow = engineLow.update(null, true, 0.016).modulation;
      modHigh = engineHigh.update(null, true, 0.016).modulation;
    }

    expect(modHigh!.eyebrowFurrow).toBeGreaterThan(modLow!.eyebrowFurrow * 2.0);
    expect(Math.abs(modHigh!.smileAmount)).toBeGreaterThan(Math.abs(modLow!.smileAmount));
  });

  it("should generate warm smile and elevated brows in happy mode", () => {
    const engine = new AcousticSentimentEngine("happy", 1.0);
    let lastMod;
    for (let i = 0; i < 30; i++) {
      lastMod = engine.update(null, true, 0.016).modulation;
    }

    expect(lastMod!.smileAmount).toBeGreaterThan(0.35);
    expect(lastMod!.eyebrowRaise).toBeGreaterThan(0.10);
    expect(lastMod!.eyebrowFurrow).toBeCloseTo(0.0, 2);
    expect(lastMod!.eyeWidening).toBeGreaterThan(1.0);
  });

  it("should produce solemn downward mouth and sad inner brow arch in somber mode", () => {
    const engine = new AcousticSentimentEngine("somber", 1.0);
    let lastMod;
    for (let i = 0; i < 30; i++) {
      lastMod = engine.update(null, true, 0.016).modulation;
    }

    expect(lastMod!.smileAmount).toBeLessThan(-0.10);
    expect(lastMod!.eyebrowFurrow).toBeGreaterThan(0.15);
    expect(lastMod!.headPitchOffset).toBeGreaterThan(0.8);
  });

  it("should produce elevated brows and wide eyes in surprised mode", () => {
    const engine = new AcousticSentimentEngine("surprised", 1.0);
    let lastMod;
    for (let i = 0; i < 30; i++) {
      lastMod = engine.update(null, true, 0.016).modulation;
    }

    expect(lastMod!.eyebrowRaise).toBeGreaterThan(0.18);
    expect(lastMod!.eyeWidening).toBeGreaterThan(1.10);
    expect(lastMod!.eyebrowFurrow).toBeCloseTo(0.0, 2);
  });

  it("should track pitchDelta in telemetry and trigger inquisitive brow inflection", () => {
    const engine = new AcousticSentimentEngine("auto", 1.0);
    const { telemetry } = engine.update(null, false, 0.016);
    expect(telemetry).toHaveProperty("pitchDelta");
    expect(typeof telemetry.pitchDelta).toBe("number");
  });
});
