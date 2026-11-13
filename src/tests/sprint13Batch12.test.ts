import { describe, it, expect, beforeEach } from "vitest";
import { MultiCameraDirector } from "../lib/realtime/multiCameraDirector";

describe("Sprint 13 Batch 12: M1 Speech-Cadence & Rhetorical Camera Cuts", () => {
  let director: MultiCameraDirector;

  beforeEach(() => {
    director = new MultiCameraDirector("CAM1_ANCHOR_CLOSE", false, 0);
    director.enableAutoDirector(true, 15000, 0);
    director.setMinShotHoldMs(2500);
    director.setCadenceSensitivity("high"); // 350ms pause after 1800ms speech; 2600ms hold
  });

  it("should punch in to CAM1_ANCHOR_CLOSE when speech begins on a wide/sidebar shot", () => {
    // Switch to wide shot first
    director.switchCamera("CAM2_STUDIO_WIDE", "cut", 0, 0);
    director.update(0);
    expect(director.getActiveCamera()).toBe("CAM2_STUDIO_WIDE");

    // Fast-forward hold to 3000ms
    director.update(3000);

    // Anchor begins speaking
    director.setSpeechState(true, 3000);
    director.update(3100);

    // At +400ms of sustained speech, director must punch in to CAM1
    const state = director.update(3400);
    expect(state.targetCameraId).toBe("CAM1_ANCHOR_CLOSE");
  });

  it("should cut to CAM3_SIDEBAR_TICKER on rhetorical sentence boundary pause", () => {
    // Start on CAM1_ANCHOR_CLOSE with active speech for 3000ms
    director.setSpeechState(true, 0);
    director.update(0);
    director.update(2000);
    director.update(3000);

    // Anchor finishes statement and pauses rhetorically
    director.setSpeechState(false, 3000);

    // Silence at +400ms (within 350-2200ms rhetorical pause window)
    const state = director.update(3400);

    // Director must cut to sidebar to let graphics and statement sink in
    expect(state.targetCameraId).toBe("CAM3_SIDEBAR_TICKER");
  });

  it("should ignore short micro-breathing pauses (<300ms) without cutting", () => {
    director.setSpeechState(true, 0);
    director.update(0);
    director.update(3000);

    // Quick micro-breath of 150ms
    director.setSpeechState(false, 3000);
    const state = director.update(3150);

    // Must NOT cut away on short micro-inhalations
    expect(state.targetCameraId).toBe("CAM1_ANCHOR_CLOSE");
    expect(state.isTransitioning).toBe(false);
  });

  it("should execute an instantaneous hard cut on extreme emotion spikes", () => {
    director.switchCamera("CAM2_STUDIO_WIDE", "cut", 0, 0);
    director.update(0);

    // Fast-forward hold past 2000ms
    director.update(2500);

    // Sudden angry breaking alert spike
    director.setSentiment("angry", 0.95);
    const state = director.update(2600);

    // Must immediately command close-up on anchor's expressive face
    expect(state.targetCameraId).toBe("CAM1_ANCHOR_CLOSE");
    expect(state.activeCameraId).toBe("CAM1_ANCHOR_CLOSE"); // Instant hard cut
  });

  it("should adjust pause and hold thresholds when cadence sensitivity is changed", () => {
    director.setCadenceSensitivity("conservative");
    expect(director.getCadenceSensitivity()).toBe("conservative");

    director.setCadenceSensitivity("normal");
    expect(director.getCadenceSensitivity()).toBe("normal");
  });
});
