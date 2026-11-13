/**
 * src/lib/realtime/head-engine/__tests__/EmotionController.test.ts
 *
 * Unit tests for EmotionController & Presets:
 * 1. Default neutral state returns 0 deltas and 1.0 rate scales.
 * 2. Setting target emotion triggers smooth continuous transition over durationMs.
 * 3. Emotion presets return coordinated signals across brows, eyes, head, respiration.
 * 4. "deep_analyst" introduces characteristic brow asymmetry and head tilt.
 * 5. "happy" introduces Duchenne squint and smile.
 * 6. "angry" introduces corrugator furrow, faster respiration, and downward head pitch.
 * 7. Custom emotion delta overrides blend properly.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { EmotionController } from "../emotions/EmotionController";
import { EMOTION_PRESETS } from "../emotions/presets";

describe("EmotionController", () => {
  let controller: EmotionController;

  beforeEach(() => {
    controller = new EmotionController();
  });

  it("initializes with neutral preset by default", () => {
    const state = controller.update({ timestamp: 0 });
    expect(state.activeEmotion).toBe("neutral");
    expect(state.deltas.browLift).toBe(0.0);
    expect(state.deltas.browFurrow).toBe(0.0);
    expect(state.deltas.respirationRateScale).toBe(1.0);
  });

  it("smoothly transitions between emotions across elapsed time", () => {
    controller.setEmotion("angry", 400); // 400ms duration

    // At t = 0ms: just started, should still be near neutral
    const at0 = controller.update({ timestamp: 1000 });
    expect(at0.deltas.browFurrow).toBeCloseTo(0.0, 1);

    // At t = 200ms: midway through transition (~50%)
    const at200 = controller.update({ timestamp: 1200 });
    expect(at200.deltas.browFurrow).toBeGreaterThan(0.2);
    expect(at200.deltas.browFurrow).toBeLessThan(EMOTION_PRESETS.angry.browFurrow);

    // At t = 450ms: transition complete
    const at450 = controller.update({ timestamp: 1450 });
    expect(at450.activeEmotion).toBe("angry");
    expect(at450.deltas.browFurrow).toBeCloseTo(EMOTION_PRESETS.angry.browFurrow, 2);
  });

  it("correctly models 'happy' with duchenne squint and smile", () => {
    controller.setEmotion("happy", 0); // instant
    const state = controller.update({ timestamp: 1000 });

    expect(state.activeEmotion).toBe("happy");
    expect(state.deltas.duchenneSquint).toBeGreaterThan(0.2);
    expect(state.deltas.smileAmount).toBeGreaterThan(0.3);
  });

  it("correctly models 'deep_analyst' with brow asymmetry and lateral tilt", () => {
    controller.setEmotion("deep_analyst", 0);
    const state = controller.update({ timestamp: 1000 });

    expect(state.activeEmotion).toBe("deep_analyst");
    expect(state.deltas.browAsymmetry).toBeGreaterThan(0.2);
    expect(state.deltas.headTiltDeg).toBeGreaterThan(2.0);
    // Deep analyst has deliberate slower respiration
    expect(state.deltas.respirationRateScale).toBeLessThan(1.0);
  });

  it("correctly models 'breaking_news' with alertness and rapid respiration", () => {
    controller.setEmotion("breaking_news", 0);
    const state = controller.update({ timestamp: 1000 });

    expect(state.activeEmotion).toBe("breaking_news");
    expect(state.deltas.eyeWidening).toBeGreaterThan(0.15);
    expect(state.deltas.respirationRateScale).toBeGreaterThan(1.2);
  });

  it("accepts custom delta overrides", () => {
    controller.setEmotion("neutral", 0);
    controller.setOverride({ browLift: 0.95 });

    const state = controller.update({ timestamp: 1000 });
    expect(state.deltas.browLift).toBeCloseTo(0.95, 2);
  });
});
