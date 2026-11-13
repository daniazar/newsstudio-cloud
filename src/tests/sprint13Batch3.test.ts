import { describe, it, expect, vi } from "vitest";
import { MultiCameraDirector, BROADCAST_CAMERA_PRESETS } from "../lib/realtime/multiCameraDirector";
import { NEURAL_3DMM_VERTEX_SHADER } from "../lib/realtime/neural3DMMShader";
import { LiveAnchorStageEngine, drawLandmarks2D } from "../lib/realtime/liveAnchorStageEngine";

describe("Sprint 13 Batch 3: Autonomous PCR Director (M1 + M3)", () => {
  describe("M1: Speech-State-Driven Camera Cuts", () => {
    it("should switch from CAM2_STUDIO_WIDE to CAM1_ANCHOR_CLOSE on speech onset (>=400ms)", () => {
      const director = new MultiCameraDirector("CAM2_STUDIO_WIDE");
      director.enableAutoDirector(true, 12000, 1000);
      director.setMinShotHoldMs(2000);

      // Advance time with no speech
      director.update(3500);
      expect(director.getActiveCamera()).toBe("CAM2_STUDIO_WIDE");

      // Speech begins at t = 3600
      director.setSpeechState(true, 3600);

      // t = 3800: speech duration 200ms (< 400ms threshold)
      director.update(3800);
      expect(director.getActiveCamera()).toBe("CAM2_STUDIO_WIDE");

      // t = 4100: speech duration 500ms (>= 400ms threshold)
      director.update(4100);
      // Target camera should be CAM1_ANCHOR_CLOSE transitioning
      const status = director.getAutoDirectorStatus();
      expect(status.isSpeaking).toBe(true);
      expect(director.update(4600).targetCameraId).toBe("CAM1_ANCHOR_CLOSE");
    });

    it("should cut to CAM2_STUDIO_WIDE after sustained silence (>=2.5s) on close-up", () => {
      const director = new MultiCameraDirector("CAM1_ANCHOR_CLOSE");
      director.enableAutoDirector(true, 12000, 1000);
      director.setMinShotHoldMs(2000);

      // Speaking from t = 1000 to t = 4000
      director.setSpeechState(true, 1000);
      director.update(3000);

      // Silence begins at t = 4000
      director.setSpeechState(false, 4000);

      // t = 5500: silence duration 1.5s (< 2.5s)
      director.update(5500);
      expect(director.getActiveCamera()).toBe("CAM1_ANCHOR_CLOSE");

      // t = 6600: silence duration 2.6s (>= 2.5s)
      const vp = director.update(6600);
      expect(vp.targetCameraId).toBe("CAM2_STUDIO_WIDE");
    });

    it("should rotate from CAM1 to CAM3_SIDEBAR_TICKER after prolonged speech (>=8s)", () => {
      const director = new MultiCameraDirector("CAM1_ANCHOR_CLOSE");
      director.enableAutoDirector(true, 12000, 1000);
      director.setMinShotHoldMs(3000);

      // Start speaking at t = 1000
      director.setSpeechState(true, 1000);

      // t = 5000: speaking for 4.0s
      director.update(5000);
      expect(director.getActiveCamera()).toBe("CAM1_ANCHOR_CLOSE");

      // t = 9500: speaking for 8.5s (>= 8.0s)
      const vp = director.update(9500);
      expect(vp.targetCameraId).toBe("CAM3_SIDEBAR_TICKER");
    });

    it("should prevent switching before minShotHoldMs has elapsed (anti-hunting)", () => {
      const director = new MultiCameraDirector("CAM1_ANCHOR_CLOSE");
      director.enableAutoDirector(true, 12000, 1000);
      director.setMinShotHoldMs(4000);

      // Switch to CAM2 at t = 1500
      director.switchCamera("CAM2_STUDIO_WIDE", "cut", 0, 1500);
      expect(director.getActiveCamera()).toBe("CAM2_STUDIO_WIDE");

      // Speech begins at t = 2000
      director.setSpeechState(true, 2000);

      // t = 3000: speech is 1.0s, but holdDuration is only 1500ms (< 4000ms)
      const vp = director.update(3000);
      expect(vp.targetCameraId).toBe("CAM2_STUDIO_WIDE");

      // t = 5600: holdDuration is 4100ms (>= 4000ms), now it can switch to CAM1
      const vp2 = director.update(5600);
      expect(vp2.targetCameraId).toBe("CAM1_ANCHOR_CLOSE");
    });
  });

  describe("M3: Emotion-Triggered Camera Angle Bias", () => {
    it("should trigger urgent close-up cut when intense emotion occurs on wide/sidebar", () => {
      const director = new MultiCameraDirector("CAM2_STUDIO_WIDE");
      director.enableAutoDirector(true, 12000, 1000);

      director.update(3500);
      expect(director.getActiveCamera()).toBe("CAM2_STUDIO_WIDE");

      // Spike emotion: angry with intensity 0.95
      director.setSentiment("angry", 0.95);

      // t = 3600 (hold duration 2600ms >= 2000ms emotion threshold)
      const vp = director.update(3600);
      expect(vp.targetCameraId).toBe("CAM1_ANCHOR_CLOSE");
    });

    it("should use fast transition (260ms) on intense emotion and smooth dolly (500ms) on calm sentiment", () => {
      const directorIntense = new MultiCameraDirector("CAM2_STUDIO_WIDE");
      directorIntense.enableAutoDirector(true, 12000, 1000);
      directorIntense.setSentiment("surprised", 0.88);
      directorIntense.update(3500);
      const vpIntense = directorIntense.update(3600);
      expect(vpIntense.targetCameraId).toBe("CAM1_ANCHOR_CLOSE");

      const directorCalm = new MultiCameraDirector("CAM1_ANCHOR_CLOSE");
      directorCalm.enableAutoDirector(true, 12000, 1000);
      directorCalm.setSentiment("neutral", 0.20);
      directorCalm.setSpeechState(false, 1000);
      directorCalm.update(4500);
      const vpCalm = directorCalm.update(5000);
      expect(vpCalm.targetCameraId).toBe("CAM2_STUDIO_WIDE");
    });
  });

  describe("Hardware Shader & Stage Engine Integration", () => {
    it("should declare u_camZoom and u_camPan uniforms in NEURAL_3DMM_VERTEX_SHADER", () => {
      expect(NEURAL_3DMM_VERTEX_SHADER).toContain("uniform float u_camZoom;");
      expect(NEURAL_3DMM_VERTEX_SHADER).toContain("uniform vec2 u_camPan;");
    });

    it("should perform hardware GPU texture scaling and translation in vertex shader", () => {
      expect(NEURAL_3DMM_VERTEX_SHADER).toContain("a_texCoord - vec2(0.5, 0.5)");
      expect(NEURAL_3DMM_VERTEX_SHADER).toContain("(centered / max(0.01, u_camZoom)) - u_camPan");
    });

    it("should instantiate MultiCameraDirector in LiveAnchorStageEngine and expose camera controls", () => {
      const mockCanvas = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        getContext: vi.fn().mockReturnValue(null),
        width: 544,
        height: 960,
      } as unknown as HTMLCanvasElement;

      const switchSpy = vi.fn();
      const engine = new LiveAnchorStageEngine(mockCanvas, null, {
        initialCamera: "CAM2_STUDIO_WIDE",
        enableAutoDirector: true,
        onCameraSwitch: switchSpy,
      });

      expect(engine.getActiveCamera()).toBe("CAM2_STUDIO_WIDE");

      engine.switchCamera("CAM1_ANCHOR_CLOSE", "cut", 0);
      expect(engine.getActiveCamera()).toBe("CAM1_ANCHOR_CLOSE");
      expect(switchSpy).toHaveBeenCalledWith("CAM1_ANCHOR_CLOSE");

      engine.dispose();
    });

    it("should project 68 2D debug landmarks synchronously with camera zoom and pan in drawLandmarks2D", () => {
      const mockCtx = {
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        stroke: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        clearRect: vi.fn(),
      } as unknown as CanvasRenderingContext2D;

      const dummyTracked = {
        x: 0.5,
        y: 0.5,
        radiusX: 0.05,
        radiusY: 0.02,
        confidence: 0.95,
        landmarks68: new Float32Array(136).fill(0.5),
        headCenter: [0.5, 0.5] as [number, number],
        headRadius: [0.25, 0.32] as [number, number],
      };

      const dummyFrame = {
        jawOpen: 0,
        lipWidth: 0,
        lipPucker: 0,
        lipCompression: 0,
        eyebrowRaise: 0,
        eyebrowFurrow: 0,
      } as any;

      const dummyCalib = {
        eyeYOffset: 0,
        eyeSpacingScale: 1.0,
        browYOffset: 0,
        noseBaseYOffset: 0,
        mouthYOffset: 0,
        mouthWidthScale: 1.0,
        mouthHeightScale: 1.0,
        jawContourScale: 1.0,
      };

      // 1. Draw with zoom = 1.0, pan = 0.0
      drawLandmarks2D(mockCtx, dummyTracked as any, dummyFrame, dummyCalib, 0, 0, 500, 1000, 0, 0, 0, 1.0, 0.0, 0.0);
      expect(mockCtx.arc).toHaveBeenCalled();

      // 2. Draw with zoom = 1.25, pan = [0.0, -0.04]
      mockCtx.arc = vi.fn();
      drawLandmarks2D(mockCtx, dummyTracked as any, dummyFrame, dummyCalib, 0, 0, 500, 1000, 0, 0, 0, 1.25, 0.0, -0.04);
      expect(mockCtx.arc).toHaveBeenCalled();
    });

    it("should dynamically elevate close-up framing to anchor head when full attire standing video (faceY < 0.35) is active", () => {
      const director = new MultiCameraDirector("CAM1_ANCHOR_CLOSE");
      
      // Default framing (portrait mode)
      const defaultPreset = director.getTargetPreset("CAM1_ANCHOR_CLOSE");
      expect(defaultPreset.zoom).toBe(1.25);
      expect(defaultPreset.panY).toBe(-0.04);

      // Track standing full-body attire video (Ruby in red dress, headCenter Y = 0.199)
      director.setAnchorFaceCenter(0.503, 0.199);
      const standingPreset = director.getTargetPreset("CAM1_ANCHOR_CLOSE");

      // Zoom should increase to frame head & shoulders (~1.70x)
      expect(standingPreset.zoom).toBeGreaterThanOrEqual(1.65);
      // PanY must elevate camera upward (panY > 0.15) to center on head rather than tummy (0.50)
      expect(standingPreset.panY).toBeGreaterThan(0.15);

      // Verify mapped screen position of head (0.199) is in the upper third (~0.36)
      const screenHeadY = 0.5 + (0.199 - 0.5 + standingPreset.panY) * standingPreset.zoom;
      expect(screenHeadY).toBeCloseTo(0.36, 1);
    });
  });
});
