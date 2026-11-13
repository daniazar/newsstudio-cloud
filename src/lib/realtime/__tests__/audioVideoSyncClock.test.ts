/**
 * src/lib/realtime/__tests__/audioVideoSyncClock.test.ts
 *
 * Unit tests for Phase-Locked Loop (PLL) Audio-Video synchronization.
 */

import { describe, it, expect } from "vitest";
import { AudioVideoSyncClock } from "../audioVideoSyncClock";

describe("AudioVideoSyncClock", () => {
  it("maintains 1.0x playback rate when in tight sync (< 15ms drift)", () => {
    const sync = AudioVideoSyncClock.evaluateSync(
      1.005, // videoTimeSec
      1.000, // audioTimeSec
      7.40,  // loop video duration
      185,   // totalVideoFrames
      25.0
    );

    expect(sync.driftSec).toBeCloseTo(0.005, 3);
    expect(sync.recommendedPlaybackRate).toBe(1.0);
    expect(sync.requiresHardSeek).toBe(false);
    expect(sync.targetAudioFrame).toBe(25);
    expect(sync.videoFrameIndex).toBe(25);
  });

  it("gently brakes video (0.95x) when video leads audio by > 15ms", () => {
    const sync = AudioVideoSyncClock.evaluateSync(
      1.030, // video leads by 30ms
      1.000,
      7.40,
      185,
      25.0
    );

    expect(sync.driftSec).toBeCloseTo(0.030, 3);
    expect(sync.recommendedPlaybackRate).toBe(0.95);
    expect(sync.requiresHardSeek).toBe(false);
  });

  it("gently accelerates video (1.05x) when video lags audio by > 15ms", () => {
    const sync = AudioVideoSyncClock.evaluateSync(
      0.970, // video lags by 30ms
      1.000,
      7.40,
      185,
      25.0
    );

    expect(sync.driftSec).toBeCloseTo(-0.030, 3);
    expect(sync.recommendedPlaybackRate).toBe(1.05);
    expect(sync.requiresHardSeek).toBe(false);
  });

  it("triggers hard seek when drift exceeds 100ms threshold", () => {
    const sync = AudioVideoSyncClock.evaluateSync(
      2.500, // video jumped ahead by 1.5s
      1.000,
      7.40,
      185,
      25.0
    );

    expect(sync.requiresHardSeek).toBe(true);
    expect(sync.recommendedPlaybackRate).toBe(1.0);
    expect(sync.expectedVideoTime).toBeCloseTo(1.000, 3);
  });

  it("wraps around looping video duration seamlessly", () => {
    const sync = AudioVideoSyncClock.evaluateSync(
      0.500,
      8.000, // 8.0s on 7.4s loop -> 0.6s
      7.40,
      185,
      25.0
    );

    expect(sync.expectedVideoTime).toBeCloseTo(0.600, 2);
    // Drift = 0.5 - 0.6 = -0.10s -> lags by 100ms
    expect(sync.targetAudioFrame).toBe(200);
  });
});
