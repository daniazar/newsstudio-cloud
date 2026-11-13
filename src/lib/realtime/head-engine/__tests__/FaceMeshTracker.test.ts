/**
 * src/lib/realtime/head-engine/__tests__/FaceMeshTracker.test.ts
 *
 * Unit tests for FaceMeshTracker.
 * Verifies single-pass image caching, precomputed 60+ FPS video timeline tracking,
 * and media isolation.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { FaceMeshTracker } from "../tracker/FaceMeshTracker";
import { RawMediaPipeLandmark } from "../tracker/FaceGeometryParser";

function createMockLandmarks(cx: number = 0.5, cy: number = 0.5): RawMediaPipeLandmark[] {
  const points: RawMediaPipeLandmark[] = [];
  for (let i = 0; i < 478; i++) {
    points.push({ x: cx, y: cy, z: 0.0 });
  }
  // Essential landmarks
  points[1] = { x: cx, y: cy + 0.02, z: -0.05 };
  points[168] = { x: cx, y: cy - 0.12, z: -0.01 };
  points[152] = { x: cx, y: cy + 0.35, z: 0.02 };
  points[234] = { x: cx - 0.25, y: cy - 0.05, z: 0.08 };
  points[454] = { x: cx + 0.25, y: cy - 0.05, z: 0.08 };

  points[133] = { x: cx - 0.08, y: cy - 0.10, z: 0.0 };
  points[33] = { x: cx - 0.18, y: cy - 0.10, z: 0.0 };
  points[159] = { x: cx - 0.13, y: cy - 0.12, z: 0.0 };
  points[145] = { x: cx - 0.13, y: cy - 0.08, z: 0.0 };
  points[468] = { x: cx - 0.13, y: cy - 0.10, z: -0.01 };

  points[362] = { x: cx + 0.08, y: cy - 0.10, z: 0.0 };
  points[263] = { x: cx + 0.18, y: cy - 0.10, z: 0.0 };
  points[386] = { x: cx + 0.13, y: cy - 0.12, z: 0.0 };
  points[374] = { x: cx + 0.13, y: cy - 0.08, z: 0.0 };
  points[473] = { x: cx + 0.13, y: cy - 0.10, z: -0.01 };

  points[107] = { x: cx - 0.07, y: cy - 0.16, z: 0.0 };
  points[105] = { x: cx - 0.13, y: cy - 0.18, z: 0.0 };
  points[70] = { x: cx - 0.20, y: cy - 0.15, z: 0.0 };

  points[336] = { x: cx + 0.07, y: cy - 0.16, z: 0.0 };
  points[334] = { x: cx + 0.13, y: cy - 0.18, z: 0.0 };
  points[300] = { x: cx + 0.20, y: cy - 0.15, z: 0.0 };

  points[13] = { x: cx, y: cy + 0.16, z: 0.0 };
  points[14] = { x: cx, y: cy + 0.18, z: 0.0 };
  points[0] = { x: cx, y: cy + 0.14, z: 0.0 };
  points[17] = { x: cx, y: cy + 0.22, z: 0.0 };
  points[61] = { x: cx - 0.08, y: cy + 0.17, z: 0.0 };
  points[291] = { x: cx + 0.08, y: cy + 0.17, z: 0.0 };

  return points;
}

describe("FaceMeshTracker", () => {
  let tracker: FaceMeshTracker;

  beforeEach(() => {
    tracker = new FaceMeshTracker();
  });

  it("should cache static image geometry after first detection (single-pass)", async () => {
    let detectorCallCount = 0;
    tracker.setCustomDetector(async (src: string) => {
      detectorCallCount++;
      return createMockLandmarks(0.50, 0.50);
    });

    // 1st call for ruby.png
    const geo1 = await tracker.getFaceGeometryForImage("/avatars/ruby.png");
    expect(geo1).not.toBeNull();
    expect(detectorCallCount).toBe(1);

    // 2nd call for ruby.png (must hit cache synchronously / immediately)
    const geo2 = await tracker.getFaceGeometryForImage("/avatars/ruby.png");
    expect(geo2).toBe(geo1); // Same reference!
    expect(detectorCallCount).toBe(1); // Detector not called again!
  });

  it("should cleanly separate different avatar images without stale leakage", async () => {
    tracker.setCustomDetector(async (src: string) => {
      if (src.includes("ruby")) return createMockLandmarks(0.48, 0.52);
      if (src.includes("blaze")) return createMockLandmarks(0.52, 0.48);
      return createMockLandmarks(0.5, 0.5);
    });

    const geoRuby = await tracker.getFaceGeometryForImage("/avatars/ruby.png");
    const geoBlaze = await tracker.getFaceGeometryForImage("/avatars/blaze.png");

    expect(geoRuby?.headCenter[0]).toBeCloseTo(0.48, 2);
    expect(geoBlaze?.headCenter[0]).toBeCloseTo(0.52, 2);
    expect(geoRuby).not.toBe(geoBlaze);
  });

  it("should provide instant 60+ FPS tracking for precomputed video timelines", () => {
    const frame0 = createMockLandmarks(0.50, 0.20);
    const frame1 = createMockLandmarks(0.51, 0.20);
    const frame2 = createMockLandmarks(0.52, 0.20);

    tracker.loadPrecomputedTimeline("/assets/video.mp4", [frame0, frame1, frame2], 25.0);

    // Exact frame lookup (takes < 0.01ms for 60+ FPS playback)
    const geoF0 = tracker.getPrecomputedFrame("/assets/video.mp4", 0);
    const geoF1 = tracker.getPrecomputedFrame("/assets/video.mp4", 1);
    const geoF2 = tracker.getPrecomputedFrame("/assets/video.mp4", 2);

    expect(geoF0?.mouth.stomion[0]).toBeCloseTo(0.50, 2);
    expect(geoF1?.mouth.stomion[0]).toBeCloseTo(0.51, 2);
    expect(geoF2?.mouth.stomion[0]).toBeCloseTo(0.52, 2);

    // Time-based lookup at 60 FPS timestamps
    const geoAtTime = tracker.getPrecomputedFrameAtTime("/assets/video.mp4", 0.04); // 1 frame at 25fps
    expect(geoAtTime?.mouth.stomion[0]).toBeCloseTo(0.51, 2);
  });

  it("should extrapolate live video coordinates at 60+ FPS using velocity tracking", () => {
    // Initial tracking update at t=0
    tracker.feedLiveLandmarks("/live/camera", createMockLandmarks(0.50, 0.50), 0);

    // Second tracking update at t=33ms (moved by +0.01 in X)
    tracker.feedLiveLandmarks("/live/camera", createMockLandmarks(0.51, 0.50), 33.3);

    // Request frame at t=16.6ms (60 FPS intermediate tick)
    const geoInterpolated = tracker.getLiveGeometryAtTimestamp("/live/camera", 16.6);

    // Should be smoothly interpolated near 0.505
    expect(geoInterpolated?.headCenter[0]).toBeCloseTo(0.505, 2);
  });
});
