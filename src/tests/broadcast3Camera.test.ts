import { describe, it, expect } from "vitest";
import {
  getCameraTransform,
  isHandsBelowFrame,
  normalizeCameraCue,
  resolveActiveCameraCue,
} from "@/remotion/Broadcast3CameraComposition";
import type { RemotionSegment } from "@/lib/types";

describe("Broadcast3CameraComposition & 3-Camera Broadcast Array", () => {
  it("normalizes camera cues accurately", () => {
    expect(normalizeCameraCue("cam1")).toBe("cam1_wide");
    expect(normalizeCameraCue("cam1_wide")).toBe("cam1_wide");
    expect(normalizeCameraCue("cam2")).toBe("cam2_left");
    expect(normalizeCameraCue("cam2_left")).toBe("cam2_left");
    expect(normalizeCameraCue("cam3")).toBe("cam3_closeup");
    expect(normalizeCameraCue("cam3_closeup")).toBe("cam3_closeup");
    expect(normalizeCameraCue(null)).toBe("cam1_wide");
  });

  it("calculates distinct 3D parallax set transforms per camera angle", () => {
    const cam1 = getCameraTransform("cam1_wide");
    const cam2 = getCameraTransform("cam2_left");
    const cam3 = getCameraTransform("cam3_closeup");

    // Camera 1 (Center 0° Wide): Standard baseline framing
    expect(cam1.scale).toBe(1.0);
    expect(cam1.translateX).toBe(0);
    expect(cam1.translateY).toBe(0);
    expect(cam1.rotationY).toBe(0);

    // Camera 2 (20° Left Tight Medium): Shifted perspective
    expect(cam2.scale).toBeGreaterThan(1.0);
    expect(cam2.translateX).toBeLessThan(0); // Pan to left perspective
    expect(cam2.rotationY).toBeGreaterThan(0);

    // Camera 3 (35° Right Slash Close-Up): Telephoto dramatic punch-in
    expect(cam3.scale).toBeGreaterThan(cam2.scale);
    expect(cam3.translateX).toBeGreaterThan(0); // Pan to right slash perspective
    expect(cam3.rotationY).toBeLessThan(0);
  });

  it("strictly enforces the Zero-Hand-Clipping rule on Camera 3 Close-Up", () => {
    // Cam 1 Wide allows hands in frame (clasped at desk)
    expect(isHandsBelowFrame("cam1_wide")).toBe(false);
    expect(isHandsBelowFrame("cam1")).toBe(false);

    // Cam 2 Medium allows hands in frame (laptop / notes)
    expect(isHandsBelowFrame("cam2_left")).toBe(false);
    expect(isHandsBelowFrame("cam2")).toBe(false);

    // Cam 3 Close-Up strictly enforces hands below frame
    expect(isHandsBelowFrame("cam3_closeup")).toBe(true);
    expect(isHandsBelowFrame("cam3")).toBe(true);
  });

  it("resolves active camera cues dynamically across timeline frames", () => {
    const testSegments: RemotionSegment[] = [
      {
        index: 0,
        startFrame: 0,
        endFrame: 90,
        text: "Welcome to the news.",
        cameraCue: "cam1_wide",
      },
      {
        index: 1,
        startFrame: 90,
        endFrame: 240,
        text: "Core story details.",
        cameraCue: "cam2_left",
      },
      {
        index: 2,
        startFrame: 240,
        endFrame: 360,
        text: "Breaking quote reveal.",
        cameraCue: "cam3_closeup",
      },
    ];

    expect(resolveActiveCameraCue(45, testSegments)).toBe("cam1_wide");
    expect(resolveActiveCameraCue(150, testSegments)).toBe("cam2_left");
    expect(resolveActiveCameraCue(300, testSegments)).toBe("cam3_closeup");
  });
});
