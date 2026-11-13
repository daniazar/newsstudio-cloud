/**
 * src/tests/videoBlinkingAndCorneaLighting.test.ts
 *
 * Unit tests for:
 * 1. Video Blinking Suppression (disableVideoBlinking on video sources vs photo sources)
 * 2. Cornea Lighting & Specular Dome Debug Toggle (enableCorneaLighting & u_enableCorneaLighting uniform)
 * 3. Reflex Blink skipping on camera switch when disableVideoBlinking is active
 */

import { describe, it, expect, vi } from "vitest";
import { LiveAnchorStageEngine } from "../lib/realtime/liveAnchorStageEngine";
import { NEURAL_3DMM_UNIFORM_NAMES } from "../lib/realtime/neural3DMMShader";
import { NEURAL_3DMM_FRAGMENT_SHADER } from "../lib/realtime/shaders/neural3DMMFragmentShader";

function createMockCanvas(w = 544, h = 960): HTMLCanvasElement {
  return {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    getContext: vi.fn().mockReturnValue(null),
    width: w,
    height: h,
  } as unknown as HTMLCanvasElement;
}

describe("Video Blinking Suppression & Cornea Lighting Suite", () => {
  describe("1. Engine Options, Defaults & Getters/Setters", () => {
    it("should initialize disableVideoBlinking to false by default and allow updates", () => {
      const canvas = createMockCanvas();
      const engine = new LiveAnchorStageEngine(canvas, null);

      expect(engine.getDisableVideoBlinking()).toBe(false);

      engine.setDisableVideoBlinking(true);
      expect(engine.getDisableVideoBlinking()).toBe(true);

      engine.setDisableVideoBlinking(false);
      expect(engine.getDisableVideoBlinking()).toBe(false);

      engine.dispose();
    });

    it("should accept disableVideoBlinking in constructor options", () => {
      const canvas = createMockCanvas();
      const engine = new LiveAnchorStageEngine(canvas, null, {
        disableVideoBlinking: true,
      });

      expect(engine.getDisableVideoBlinking()).toBe(true);
      engine.dispose();
    });

    it("should initialize enableCorneaLighting to true by default and allow updates", () => {
      const canvas = createMockCanvas();
      const engine = new LiveAnchorStageEngine(canvas, null);

      expect(engine.getEnableCorneaLighting()).toBe(true);

      engine.setEnableCorneaLighting(false);
      expect(engine.getEnableCorneaLighting()).toBe(false);

      engine.setEnableCorneaLighting(true);
      expect(engine.getEnableCorneaLighting()).toBe(true);

      engine.dispose();
    });

    it("should accept enableCorneaLighting in constructor options", () => {
      const canvas = createMockCanvas();
      const engine = new LiveAnchorStageEngine(canvas, null, {
        enableCorneaLighting: false,
      });

      expect(engine.getEnableCorneaLighting()).toBe(false);
      engine.dispose();
    });
  });

  describe("2. Robust Media Source Video Detection", () => {
    it("should accurately identify video files including cache-busting query strings", () => {
      const canvas = createMockCanvas();

      const engineVideo1 = new LiveAnchorStageEngine(canvas, null, {
        activeSrc: "/assets/action_loops/blaze_loop.mp4?t=1726589000",
      });
      expect(engineVideo1.getIsVideoSource()).toBe(true);
      engineVideo1.dispose();

      const engineVideo2 = new LiveAnchorStageEngine(canvas, null, {
        activeSrc: "/assets/action_loops/veo/blaze_silver_blazer_M1_loop_v1.mp4",
      });
      expect(engineVideo2.getIsVideoSource()).toBe(true);
      engineVideo2.dispose();

      const engineWebm = new LiveAnchorStageEngine(canvas, null, {
        activeSrc: "/output/stream.webm?cache=none",
      });
      expect(engineWebm.getIsVideoSource()).toBe(true);
      engineWebm.dispose();

      const enginePhoto = new LiveAnchorStageEngine(canvas, null, {
        activeSrc: "/avatars/ruby.png?v=2",
      });
      expect(enginePhoto.getIsVideoSource()).toBe(false);
      enginePhoto.dispose();
    });
  });

  describe("3. Camera Switch Reflex Blink Guarding", () => {
    it("should skip triggerReflexBlink on camera switch when isVideoSource and disableVideoBlinking are true", () => {
      const canvas = createMockCanvas();
      const engine = new LiveAnchorStageEngine(canvas, null, {
        activeSrc: "/assets/action_loops/ruby_idle.mp4",
        disableVideoBlinking: true,
        initialCamera: "CAM1_ANCHOR_CLOSE",
      });

      const driver = (engine as unknown as { driver: { triggerReflexBlink: ReturnType<typeof vi.fn> } }).driver;
      const reflexSpy = vi.spyOn(driver, "triggerReflexBlink");

      engine.switchCamera("CAM2_STUDIO_WIDE", "cut", 0);
      expect(reflexSpy).not.toHaveBeenCalled();

      // Now enable video blinking and verify reflex blink triggers
      engine.setDisableVideoBlinking(false);
      engine.switchCamera("CAM3_SIDEBAR_TICKER", "cut", 0);
      expect(reflexSpy).toHaveBeenCalledWith(35.0, true);

      engine.dispose();
    });

    it("should allow triggerReflexBlink on camera switch for static photo avatars even if disableVideoBlinking is true", () => {
      const canvas = createMockCanvas();
      const engine = new LiveAnchorStageEngine(canvas, null, {
        activeSrc: "/avatars/ruby.png",
        disableVideoBlinking: true,
        initialCamera: "CAM1_ANCHOR_CLOSE",
      });

      const driver = (engine as unknown as { driver: { triggerReflexBlink: ReturnType<typeof vi.fn> } }).driver;
      const reflexSpy = vi.spyOn(driver, "triggerReflexBlink");

      engine.switchCamera("CAM2_STUDIO_WIDE", "cut", 0);
      expect(reflexSpy).toHaveBeenCalledWith(35.0, true);

      engine.dispose();
    });
  });

  describe("4. Shader & Uniforms Integration for Cornea Lighting", () => {
    it("should include u_enableCorneaLighting in NEURAL_3DMM_UNIFORM_NAMES", () => {
      expect(NEURAL_3DMM_UNIFORM_NAMES).toContain("u_enableCorneaLighting");
    });

    it("should declare uniform int u_enableCorneaLighting in fragment shader source", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("uniform int u_enableCorneaLighting;");
    });

    it("should guard Section 6A corneal lighting with u_enableCorneaLighting != 0 in shader", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("if (u_enableCorneaLighting != 0) {");
    });

    it("should pass enableCorneaLighting in uniforms payload", () => {
      const canvas = createMockCanvas();
      const engine = new LiveAnchorStageEngine(canvas, null, {
        enableCorneaLighting: false,
      });

      expect(engine.getEnableCorneaLighting()).toBe(false);
      engine.dispose();
    });
  });
});
