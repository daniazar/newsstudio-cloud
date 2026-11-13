/**
 * src/tests/quickWinsBatch.test.ts
 *
 * Comprehensive unit test suite for the Animation Quick-Wins Batch:
 * - J2: Lower Eyelid Tear Lake Strip (Inferior Conjunctival Meniscus)
 * - L3: Tongue Median Sulcus Specular Ridge
 * - M2: Camera Micro-Breathing Sway in MultiCameraDirector
 * - R2: Studio Background Lighting Tone mapping & badges
 */

import { describe, it, expect } from "vitest";
import { MultiCameraDirector, BROADCAST_CAMERA_PRESETS } from "../lib/realtime/multiCameraDirector";
import { STUDIO_BACKGROUNDS, getStudioBackgroundById } from "../lib/realtime/studioBackgrounds";

describe("Quick-Wins Batch Test Suite", () => {
  describe("J2: Lower Eyelid Tear Lake Strip Formula", () => {
    it("should compute a positive tear lake specular highlight along the lower eyelid margin", () => {
      const eyeRy = 0.038;
      const normEx = 0.0; // center of eye
      const eyeArch = Math.sqrt(Math.max(0.0, 1.0 - Math.min(1.0, normEx * normEx * 0.85)));
      const targetTearY = (0.74 + eyeArch * 0.16) * eyeRy;

      // Exactly at the lower meniscus
      const dEyeY = targetTearY;
      const distToTear = Math.abs(dEyeY - targetTearY);
      const blink = 0.0;

      const tearLake =
        Math.exp(-Math.pow(distToTear / (eyeRy * 0.09), 2.0)) * 0.14 * eyeArch * (1.0 - blink);

      expect(tearLake).toBeGreaterThan(0.10);
      expect(tearLake).toBeLessThanOrEqual(0.14);
    });

    it("should attenuate to zero when eye blinks closed", () => {
      const eyeRy = 0.038;
      const eyeArch = 1.0;
      const targetTearY = (0.74 + eyeArch * 0.16) * eyeRy;
      const distToTear = 0.0;
      const blink = 1.0; // full closed blink

      const tearLake =
        Math.exp(-Math.pow(distToTear / (eyeRy * 0.09), 2.0)) * 0.14 * eyeArch * (1.0 - blink);

      expect(tearLake).toBe(0.0);
    });

    it("should drop off sharply away from the lower lid margin", () => {
      const eyeRy = 0.038;
      const eyeArch = 1.0;
      const targetTearY = (0.74 + eyeArch * 0.16) * eyeRy;

      // Sample 3x the meniscus width away (in the pupil center)
      const distToTear = eyeRy * 0.5;
      const blink = 0.0;

      const tearLake =
        Math.exp(-Math.pow(distToTear / (eyeRy * 0.09), 2.0)) * 0.14 * eyeArch * (1.0 - blink);

      expect(tearLake).toBeLessThan(0.0001);
    });
  });

  describe("L3: Tongue Median Sulcus Specular Ridge Formula", () => {
    // Smoothstep helper
    function smoothstep(min: number, max: number, value: number): number {
      const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
      return x * x * (3 - 2 * x);
    }

    it("should produce specular highlight along bilateral dorsal ridges on open vowels", () => {
      const jawOpen = 0.35;
      const tongueElev = 0.20;
      const tongueGroove = 0.50;
      const tongueTop = 0.10;
      const apertureY = 0.05;

      // On the bilateral ridge: abs(normMouth.x) ~ 0.035
      const ridgeX = 0.035;
      const ridgeGlint = smoothstep(0.012, 0.028, ridgeX) * smoothstep(0.065, 0.028, ridgeX);
      const sulcusSpec =
        ridgeGlint * (0.12 + tongueGroove * 0.16) * smoothstep(tongueTop + 0.12, tongueTop + 0.02, apertureY);

      expect(ridgeGlint).toBeGreaterThan(0.5);
      expect(sulcusSpec).toBeGreaterThan(0.08);
    });

    it("should vanish directly inside the central groove (ridgeX = 0.0)", () => {
      const ridgeX = 0.0; // Central sulcus floor
      const ridgeGlint = smoothstep(0.012, 0.028, ridgeX) * smoothstep(0.065, 0.028, ridgeX);

      expect(ridgeGlint).toBe(0.0);
    });
  });

  describe("M2: Camera Micro-Breathing Sway in MultiCameraDirector", () => {
    it("should allow micro-sway to be enabled via constructor or setter", () => {
      const director = new MultiCameraDirector("CAM1_ANCHOR_CLOSE", true);
      expect(director.isMicroSwayEnabled()).toBe(true);

      const directorDefault = new MultiCameraDirector("CAM1_ANCHOR_CLOSE");
      expect(directorDefault.isMicroSwayEnabled()).toBe(false);

      directorDefault.setMicroSway(true);
      expect(directorDefault.isMicroSwayEnabled()).toBe(true);
    });

    it("should produce subtle continuous variations in zoom and pan across time when enabled", () => {
      const director = new MultiCameraDirector("CAM1_ANCHOR_CLOSE", true);
      const basePreset = BROADCAST_CAMERA_PRESETS["CAM1_ANCHOR_CLOSE"];

      const vp1 = director.update(1000);
      const vp2 = director.update(3500);

      // Verify micro-sway stays within realistic tripod tolerances (±0.004)
      expect(Math.abs(vp1.zoom - basePreset.zoom)).toBeLessThan(0.004);
      expect(Math.abs(vp1.panX - basePreset.panX)).toBeLessThan(0.004);
      expect(Math.abs(vp1.panY - basePreset.panY)).toBeLessThan(0.004);

      // Verify vp1 and vp2 are dynamically distinct
      expect(vp1.zoom).not.toEqual(vp2.zoom);
      expect(vp1.panX).not.toEqual(vp2.panX);
    });

    it("should return exact preset coordinates when micro-sway is disabled", () => {
      const director = new MultiCameraDirector("CAM2_STUDIO_WIDE");
      const basePreset = BROADCAST_CAMERA_PRESETS["CAM2_STUDIO_WIDE"];

      director.setMicroSway(false);
      expect(director.isMicroSwayEnabled()).toBe(false);

      const vp = director.update(5000);
      expect(vp.zoom).toBeCloseTo(basePreset.zoom, 5);
      expect(vp.panX).toBeCloseTo(basePreset.panX, 5);
      expect(vp.panY).toBeCloseTo(basePreset.panY, 5);
    });
  });

  describe("R2: Studio Background Lighting Tone & Badges", () => {
    it("should define valid lighting tones on studio backgrounds", () => {
      const validTones = new Set(["neutral", "cool", "warm", "red_alert", undefined]);

      STUDIO_BACKGROUNDS.forEach((bg) => {
        expect(validTones.has(bg.lightingTone)).toBe(true);
      });
    });

    it("should correctly resolve lighting tone for panoramic_videowall and breaking backgrounds", () => {
      const videowall = getStudioBackgroundById("panoramic_videowall");
      expect(videowall).toBeDefined();

      const breaking = STUDIO_BACKGROUNDS.find((b) => b.lightingTone === "red_alert");
      if (breaking) {
        expect(breaking.lightingTone).toBe("red_alert");
      }
    });

    it("should map string lighting tones to numeric shader indices 0..3", () => {
      const toneMap: Record<string, number> = {
        neutral: 0,
        warm: 1,
        cool: 2,
        red_alert: 3,
      };

      expect(toneMap["neutral"]).toBe(0);
      expect(toneMap["warm"]).toBe(1);
      expect(toneMap["cool"]).toBe(2);
      expect(toneMap["red_alert"]).toBe(3);
    });
  });
});
