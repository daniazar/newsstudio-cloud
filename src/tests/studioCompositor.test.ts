/**
 * src/tests/studioCompositor.test.ts
 *
 * Test suite for the Multi-Camera Remotion Studio Compositor & Timeline Synchronization.
 */

import { describe, it, expect } from "vitest";
import {
  normalizeCameraCue,
  isHandsBelowFrame,
  getCameraTransform,
  resolveActiveCameraCue,
} from "../remotion/Broadcast3CameraComposition";
import type { RemotionSegment } from "../lib/types";

describe("Multi-Camera Remotion Studio Compositor Suite", () => {
  describe("Camera Cue Normalization & Framing", () => {
    it("should normalize camera cues to standard identifiers", () => {
      expect(normalizeCameraCue("cam1")).toBe("cam1_wide");
      expect(normalizeCameraCue("cam1_wide")).toBe("cam1_wide");
      expect(normalizeCameraCue("cam2")).toBe("cam2_left");
      expect(normalizeCameraCue("cam2_left")).toBe("cam2_left");
      expect(normalizeCameraCue("cam3")).toBe("cam3_closeup");
      expect(normalizeCameraCue("cam3_closeup")).toBe("cam3_closeup");
      expect(normalizeCameraCue(null)).toBe("cam1_wide");
      expect(normalizeCameraCue(undefined)).toBe("cam1_wide");
    });

    it("should enforce zero-hand-clipping strictly on Camera 3 Close-Up shots", () => {
      expect(isHandsBelowFrame("cam3_closeup")).toBe(true);
      expect(isHandsBelowFrame("cam3")).toBe(true);
      expect(isHandsBelowFrame("cam1_wide")).toBe(false);
      expect(isHandsBelowFrame("cam2_left")).toBe(false);
    });

    it("should provide cinematic 3D parallax set transforms per camera angle", () => {
      const wide = getCameraTransform("cam1_wide");
      expect(wide.scale).toBe(1.0);
      expect(wide.translateX).toBe(0);
      expect(wide.rotationY).toBe(0);

      const left = getCameraTransform("cam2_left");
      expect(left.scale).toBeGreaterThan(1.0);
      expect(left.rotationY).toBeGreaterThan(0); // 3.5 deg perspective angle

      const closeup = getCameraTransform("cam3_closeup");
      expect(closeup.scale).toBeGreaterThan(left.scale); // 1.5x tight framing
    });
  });

  describe("Multi-Turn Timeline Alignment & Cue Resolution", () => {
    const mockSegments: RemotionSegment[] = [
      {
        index: 0,
        startFrame: 0,
        endFrame: 90,
        text: "Good evening, welcome to the broadcast.",
        cameraCue: "cam1_wide",
        speakerName: "Ruby Vance",
        speakerTitle: "Lead Anchor",
      },
      {
        index: 1,
        startFrame: 90,
        endFrame: 210,
        text: "Thank you Ruby, we have breaking developments today.",
        cameraCue: "cam3_closeup",
        speakerName: "Tomas Sterling",
        speakerTitle: "Finance Expert",
      },
      {
        index: 2,
        startFrame: 210,
        endFrame: 330,
        text: "Let's look at the data graphics together.",
        cameraCue: "cam2_left",
        speakerName: "Ruby Vance",
        speakerTitle: "Lead Anchor",
      },
    ];

    it("should resolve active camera cue dynamically across frame intervals", () => {
      // Frame 30 is inside Segment 0 -> cam1_wide
      expect(resolveActiveCameraCue(30, mockSegments, [])).toBe("cam1_wide");

      // Frame 120 is inside Segment 1 -> cam3_closeup
      expect(resolveActiveCameraCue(120, mockSegments, [])).toBe("cam3_closeup");

      // Frame 250 is inside Segment 2 -> cam2_left
      expect(resolveActiveCameraCue(250, mockSegments, [])).toBe("cam2_left");
    });

    it("should prioritize explicit camera cue intervals over segment defaults", () => {
      const customCues = [
        { cam: "cam2_left" as const, startFrame: 0, endFrame: 60 },
      ];

      // Frame 30 matches explicit cue -> cam2_left despite segment being cam1_wide
      expect(resolveActiveCameraCue(30, mockSegments, customCues)).toBe("cam2_left");

      // Frame 75 falls back to segment cue -> cam1_wide
      expect(resolveActiveCameraCue(75, mockSegments, customCues)).toBe("cam1_wide");
    });
  });
});
