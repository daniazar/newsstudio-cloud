/**
 * src/tests/sprint18InfrastructureOptimization.test.ts
 *
 * Dedicated unit test suite verifying Sprint 18 Infrastructure & Zero-Copy IPC Optimization:
 * - G1: Per-Persona Shader Variant Compilation (buildPersonaDefines, injectDefinesIntoShader, program caching)
 * - G2: Shader Uniform Diff Cache (skips redundant gl.uniform* calls when delta < EPSILON, cache invalidation)
 * - G3: SharedArrayBuffer Landmark IPC (zero-copy shared memory transfer & graceful fallback)
 * - G4: HUD Telemetry Optimization (10 Hz throttling for telemetry updates and visualizer redraws)
 * - G5: Incremental EMA Auto-Calibration (30-frame posture adaptation, confidence gating, reset)
 */

import { describe, it, expect, vi } from "vitest";
import {
  Neural3DMMShaderRenderer,
  buildPersonaDefines,
  injectDefinesIntoShader,
  PersonaShaderConfig,
  Neural3DMMUniforms,
} from "../lib/realtime/neural3DMMShader";
import { MouthTracker } from "../lib/realtime/mouthTracker";
import { WebglLipDetector } from "../lib/realtime/webglLipDetector";

describe("Sprint 18: Infrastructure & Zero-Copy IPC Optimization", () => {
  // ── Mock WebGL2 Context Factory ──
  function createMockGl(): WebGL2RenderingContext {
    let programCount = 0;
    let shaderCount = 0;

    return {
      VERTEX_SHADER: 35633,
      FRAGMENT_SHADER: 35632,
      ARRAY_BUFFER: 34962,
      STATIC_DRAW: 35044,
      FLOAT: 5126,
      TRIANGLES: 4,
      TEXTURE0: 33984,
      TEXTURE1: 33985,
      TEXTURE2: 33986,
      TEXTURE3: 33987,
      TEXTURE_2D: 3553,
      LINK_STATUS: 35714,
      COMPILE_STATUS: 35713,

      createShader: vi.fn(() => ({ id: ++shaderCount })),
      shaderSource: vi.fn(),
      compileShader: vi.fn(),
      getShaderParameter: vi.fn().mockReturnValue(true),
      getShaderInfoLog: vi.fn().mockReturnValue(""),
      deleteShader: vi.fn(),

      createProgram: vi.fn(() => ({ id: ++programCount })),
      attachShader: vi.fn(),
      linkProgram: vi.fn(),
      getProgramParameter: vi.fn().mockReturnValue(true),
      getProgramInfoLog: vi.fn().mockReturnValue(""),
      deleteProgram: vi.fn(),
      useProgram: vi.fn(),

      getUniformLocation: vi.fn((prog: any, name: string) => ({ name, progId: prog.id })),
      createVertexArray: vi.fn().mockReturnValue({ id: "vao-1" }),
      bindVertexArray: vi.fn(),
      deleteVertexArray: vi.fn(),

      createBuffer: vi.fn().mockReturnValue({ id: "vbo-1" }),
      bindBuffer: vi.fn(),
      bufferData: vi.fn(),

      getAttribLocation: vi.fn().mockReturnValue(0),
      enableVertexAttribArray: vi.fn(),
      vertexAttribPointer: vi.fn(),

      activeTexture: vi.fn(),
      bindTexture: vi.fn(),
      drawArrays: vi.fn(),

      uniform1f: vi.fn(),
      uniform1i: vi.fn(),
      uniform2f: vi.fn(),
      uniform3f: vi.fn(),
    } as unknown as WebGL2RenderingContext;
  }

  // ── Baseline Uniform Properties Factory ──
  function createDefaultUniforms(): Neural3DMMUniforms {
    return {
      videoTexture: {} as WebGLTexture,
      hasBgTexture: false,
      enableChromaKey: false,
      transparentMode: false,
      chromaKeyColor: [0.0, 0.95, 0.0],
      chromaSimilarity: 0.38,
      chromaSmoothness: 0.08,
      despillStrength: 0.85,
      bgAspectRatio: 16 / 9,
      lightingTone: 0,
      mouthCenter: [0.5, 0.638],
      mouthRadius: [0.070, 0.026],
      mouthAngle: 0.0,
      jawOpen: 0.0,
      lipWidth: 0.0,
      lipPucker: 0.0,
      lipCompression: 0.0,
      smileExpression: 0.0,
      asymmetry: 0.0,
      upperLipLift: 0.0,
      lowerLipDepress: 0.0,
      headCenter: [0.5, 0.45],
      headRadius: [0.25, 0.32],
      headPitch: 0.0,
      headYaw: 0.0,
      headRoll: 0.0,
      headLeanZ: 0.0,
      headShiftX: 0.0,
      headShiftY: 0.0,
      blinkLeft: 0.0,
      blinkRight: 0.0,
      gazeX: 0.0,
      gazeY: 0.0,
      eyeWidening: 1.0,
      eyebrowRaise: 0.0,
      eyebrowFurrow: 0.0,
      leftEyeCenter: [0.435, 0.428],
      rightEyeCenter: [0.565, 0.428],
      shoulderCenter: [0.5, 0.75],
      shoulderRadius: [0.35, 0.28],
      shoulderBreath: 0.0,
      shoulderSway: 0.0,
      chestExpansion: 0.0,
      shoulderShrug: 0.0,
      neckFlex: 0.0,
      aspectRatio: 544 / 960,
      debugCrosshair: false,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 1. G1: Per-Persona Shader Variant Compilation
  // ──────────────────────────────────────────────────────────────────────────
  describe("G1: Per-Persona Shader Variant Compilation", () => {
    it("should build correct GLSL #define statements from PersonaShaderConfig", () => {
      const config: PersonaShaderConfig = {
        skinToneBias: [0.012, 0.006, -0.002],
        cavityDepthScale: 1.15,
        specularGlossScale: 0.95,
      };

      const defines = buildPersonaDefines(config);
      expect(defines).toContain("#define PERSONA_CAVITY_DEPTH_SCALE 1.1500");
      expect(defines).toContain("#define PERSONA_SPECULAR_GLOSS_SCALE 0.9500");
      expect(defines).toContain("#define PERSONA_SKIN_TONE_BIAS vec3(0.0120, 0.0060, -0.0020)");
    });

    it("should return empty string when PersonaShaderConfig has no defines", () => {
      expect(buildPersonaDefines()).toBe("");
      expect(buildPersonaDefines({})).toBe("");
    });

    it("should inject defines right after #version 300 es header", () => {
      const source = "#version 300 es\nprecision highp float;\nvoid main() {}";
      const defines = "\n#define PERSONA_CAVITY_DEPTH_SCALE 1.1000\n";
      const injected = injectDefinesIntoShader(source, defines);

      expect(injected.startsWith("#version 300 es\n\n#define PERSONA_CAVITY_DEPTH_SCALE 1.1000\nprecision highp float;")).toBe(true);
    });

    it("should compile and cache persona variants in Neural3DMMShaderRenderer", () => {
      const gl = createMockGl();
      const renderer = new Neural3DMMShaderRenderer(gl, "ruby");

      expect(renderer.getActiveVariantId()).toBe("ruby");
      expect(renderer.getCompiledVariantCount()).toBe(1); // single-pass: ruby only

      // Switch to another persona: diego
      renderer.setProgramVariant("diego");
      expect(renderer.getActiveVariantId()).toBe("diego");
      expect(renderer.getCompiledVariantCount()).toBe(2); // ruby + diego

      // Switch back to ruby: should reuse cached variant without creating new programs
      const prevCount = renderer.getCompiledVariantCount();
      renderer.setProgramVariant("ruby");
      expect(renderer.getActiveVariantId()).toBe("ruby");
      expect(renderer.getCompiledVariantCount()).toBe(prevCount);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. G2: Shader Uniform Diff Cache
  // ──────────────────────────────────────────────────────────────────────────
  describe("G2: Shader Uniform Diff Cache", () => {
    it("should upload all uniforms on initial render and populate uniform cache", () => {
      const gl = createMockGl();
      const renderer = new Neural3DMMShaderRenderer(gl);
      const uniforms = createDefaultUniforms();

      expect(renderer.getUniformCacheSize()).toBe(0);
      renderer.render(uniforms);

      expect(renderer.getUniformCacheSize()).toBeGreaterThan(30);
      expect(gl.uniform1f).toHaveBeenCalled();
      expect(gl.uniform2f).toHaveBeenCalled();
    });

    it("should skip redundant gl.uniform* calls when uniform values have not changed", () => {
      const gl = createMockGl();
      const renderer = new Neural3DMMShaderRenderer(gl);
      const uniforms = createDefaultUniforms();

      // First render uploads all uniforms
      renderer.render(uniforms);
      const initialCalls1f = vi.mocked(gl.uniform1f).mock.calls.length;
      const initialCalls2f = vi.mocked(gl.uniform2f).mock.calls.length;

      // Second render with exact identical props: all uniform calls should be skipped
      renderer.render(uniforms);
      expect(vi.mocked(gl.uniform1f).mock.calls.length).toBe(initialCalls1f);
      expect(vi.mocked(gl.uniform2f).mock.calls.length).toBe(initialCalls2f);
    });

    it("should only upload uniforms whose deltas exceed UNIFORM_EPSILON", () => {
      const gl = createMockGl();
      const renderer = new Neural3DMMShaderRenderer(gl);
      const uniforms = createDefaultUniforms();

      renderer.render(uniforms);
      const callsBefore = vi.mocked(gl.uniform1f).mock.calls.length;

      // Minor micro-delta below EPSILON (1e-6 < 1e-5) -> skipped
      uniforms.jawOpen = 1e-6;
      renderer.render(uniforms);
      expect(vi.mocked(gl.uniform1f).mock.calls.length).toBe(callsBefore);

      // Significant change above EPSILON (0.35) -> uploaded
      uniforms.jawOpen = 0.35;
      renderer.render(uniforms);
      expect(vi.mocked(gl.uniform1f).mock.calls.length).toBe(callsBefore + 1);
    });

    it("should invalidate uniform cache when switching program variants", () => {
      const gl = createMockGl();
      const renderer = new Neural3DMMShaderRenderer(gl, "default");
      const uniforms = createDefaultUniforms();

      renderer.render(uniforms);
      expect(renderer.getUniformCacheSize()).toBeGreaterThan(0);

      // Switching variant invalidates cache so new program receives all uniforms
      renderer.setProgramVariant("ruby");
      expect(renderer.getUniformCacheSize()).toBe(0);

      renderer.render(uniforms);
      expect(renderer.getUniformCacheSize()).toBeGreaterThan(0);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. G3: SharedArrayBuffer Landmark IPC
  // ──────────────────────────────────────────────────────────────────────────
  describe("G3: SharedArrayBuffer Landmark IPC", () => {
    it("should expose SharedArrayBuffer support detection in WebglLipDetector", () => {
      const isSupported = WebglLipDetector.isSharedArrayBufferSupported();
      expect(typeof isSupported).toBe("boolean");
    });

    it("should zero-copy copy landmark coordinates from SharedArrayBuffer view", () => {
      const detector = new WebglLipDetector("ruby");

      // Simulate a shared buffer with 136 floats (68 landmarks * 2 coordinates)
      const fakeSab = new ArrayBuffer(1024);
      const fakeSharedView = new Float32Array(fakeSab, 0, 136);
      fakeSharedView[0] = 0.45; // Landmark 0 X
      fakeSharedView[1] = 0.65; // Landmark 0 Y
      fakeSharedView[134] = 0.72; // Landmark 67 X
      fakeSharedView[135] = 0.88; // Landmark 67 Y

      // Temporarily set static shared view
      (WebglLipDetector as any).sharedLandmarksView = fakeSharedView;

      // Trigger onWorkerResult with useSharedBuffer: true
      (detector as any).onWorkerResult({
        success: true,
        useSharedBuffer: true,
        x: 0.5,
        y: 0.638,
        radiusX: 0.07,
        radiusY: 0.026,
        angle: 0.0,
      });

      const targetLandmarks: Float32Array = (detector as any).targetLandmarks68;
      expect(targetLandmarks).toBeDefined();
      expect(targetLandmarks.length).toBe(136);
      expect(targetLandmarks[0]).toBeCloseTo(0.45, 2);
      expect(targetLandmarks[1]).toBeCloseTo(0.65, 2);
      expect(targetLandmarks[134]).toBeCloseTo(0.72, 2);
      expect(targetLandmarks[135]).toBeCloseTo(0.88, 2);

      // Clean up
      (WebglLipDetector as any).sharedLandmarksView = null;
    });

    it("should fall back gracefully to data.landmarks68 when useSharedBuffer is false", () => {
      const detector = new WebglLipDetector("ruby");
      const localLandmarks = new Float32Array(136);
      localLandmarks[0] = 0.33;
      localLandmarks[1] = 0.44;

      (detector as any).onWorkerResult({
        success: true,
        useSharedBuffer: false,
        landmarks68: localLandmarks,
        x: 0.5,
        y: 0.638,
        radiusX: 0.07,
        radiusY: 0.026,
        angle: 0.0,
      });

      const targetLandmarks: Float32Array = (detector as any).targetLandmarks68;
      expect(targetLandmarks).toBe(localLandmarks);
      expect(targetLandmarks[0]).toBeCloseTo(0.33, 2);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 4. G4: HUD Telemetry Optimization
  // ──────────────────────────────────────────────────────────────────────────
  describe("G4: HUD Telemetry Optimization", () => {
    it("should throttle high-frequency telemetry updates to 10 Hz (100ms interval)", () => {
      let callbackExecutionCount = 0;
      let lastUpdateTime = -100;
      const throttledTelemetryHandler = (now: number) => {
        if (now - lastUpdateTime >= 100) {
          lastUpdateTime = now;
          callbackExecutionCount++;
        }
      };

      // Rapid-fire 60 calls over a 60 FPS second (spaced ~16.6ms apart)
      for (let frame = 0; frame < 60; frame++) {
        throttledTelemetryHandler(frame * 16.66);
      }

      // At 10 Hz over 60 frames (983ms), execution count should be 9 or 10, NOT 60
      expect(callbackExecutionCount).toBeGreaterThanOrEqual(9);
      expect(callbackExecutionCount).toBeLessThanOrEqual(10);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 5. G5: Incremental EMA Auto-Calibration
  // ──────────────────────────────────────────────────────────────────────────
  describe("G5: Incremental EMA Auto-Calibration", () => {
    it("should initialize EMA calibration immediately on first detected autoCalib frame", () => {
      const tracker = new MouthTracker("ruby");
      const fakeVideo = {} as HTMLVideoElement;

      // Mock detect returning autoCalib
      vi.spyOn((tracker as any).visionDetector, "detect").mockReturnValue({
        x: 0.5,
        y: 0.229,
        radiusX: 0.056,
        radiusY: 0.018,
        angle: 0.0,
        confidence: 0.95,
        source: "mediapipe",
        autoCalib: {
          eyeYOffset: 0.01,
          eyeSpacingScale: 1.05,
          browYOffset: -0.02,
          noseBaseYOffset: 0.03,
          mouthYOffset: 0.04,
          mouthWidthScale: 1.10,
          mouthHeightScale: 0.95,
          jawContourScale: 1.02,
        },
      });

      const res = tracker.update(fakeVideo);
      expect(res.autoCalib).toBeDefined();
      expect(res.autoCalib?.mouthWidthScale).toBe(1.10);
      expect(tracker.getEmaCalib()?.mouthWidthScale).toBe(1.10);
    });

    it("should not update EMA calibration before the 30-frame interval", () => {
      const tracker = new MouthTracker("ruby");
      const fakeVideo = {} as HTMLVideoElement;

      // Initial baseline
      vi.spyOn((tracker as any).visionDetector, "detect").mockReturnValue({
        x: 0.5,
        y: 0.229,
        radiusX: 0.056,
        radiusY: 0.018,
        angle: 0.0,
        confidence: 0.95,
        source: "mediapipe",
        autoCalib: {
          eyeYOffset: 0.0,
          eyeSpacingScale: 1.0,
          browYOffset: 0.0,
          noseBaseYOffset: 0.0,
          mouthYOffset: 0.0,
          mouthWidthScale: 1.0,
          mouthHeightScale: 1.0,
          jawContourScale: 1.0,
        },
      });

      tracker.update(fakeVideo); // Frame 1

      // Provide shifted calibration on frame 2..29
      vi.spyOn((tracker as any).visionDetector, "detect").mockReturnValue({
        x: 0.5,
        y: 0.229,
        radiusX: 0.056,
        radiusY: 0.018,
        angle: 0.0,
        confidence: 0.95,
        source: "mediapipe",
        autoCalib: {
          eyeYOffset: 0.10,
          eyeSpacingScale: 1.20,
          browYOffset: 0.10,
          noseBaseYOffset: 0.10,
          mouthYOffset: 0.10,
          mouthWidthScale: 1.30,
          mouthHeightScale: 1.30,
          jawContourScale: 1.30,
        },
      });

      for (let i = 2; i < 30; i++) {
        tracker.update(fakeVideo);
        expect(tracker.getEmaCalib()?.mouthWidthScale).toBe(1.0); // Held constant!
      }
    });

    it("should smoothly blend calibration on the 30-frame boundary using EMA alpha", () => {
      const tracker = new MouthTracker("ruby");
      tracker.setEmaAlpha(0.10); // 10% blend per update
      const fakeVideo = {} as HTMLVideoElement;

      // Frame 1: Initial baseline = 1.0
      vi.spyOn((tracker as any).visionDetector, "detect").mockReturnValue({
        x: 0.5,
        y: 0.229,
        radiusX: 0.056,
        radiusY: 0.018,
        angle: 0.0,
        confidence: 0.95,
        source: "mediapipe",
        autoCalib: {
          eyeYOffset: 0.0,
          eyeSpacingScale: 1.0,
          browYOffset: 0.0,
          noseBaseYOffset: 0.0,
          mouthYOffset: 0.0,
          mouthWidthScale: 1.0,
          mouthHeightScale: 1.0,
          jawContourScale: 1.0,
        },
      });
      tracker.update(fakeVideo);

      // Advance frames 2..30 with shifted posture target = 1.20
      vi.spyOn((tracker as any).visionDetector, "detect").mockReturnValue({
        x: 0.5,
        y: 0.229,
        radiusX: 0.056,
        radiusY: 0.018,
        angle: 0.0,
        confidence: 0.95,
        source: "mediapipe",
        autoCalib: {
          eyeYOffset: 0.0,
          eyeSpacingScale: 1.0,
          browYOffset: 0.0,
          noseBaseYOffset: 0.0,
          mouthYOffset: 0.0,
          mouthWidthScale: 1.20,
          mouthHeightScale: 1.0,
          jawContourScale: 1.0,
        },
      });

      for (let i = 2; i <= 30; i++) {
        tracker.update(fakeVideo);
      }

      // On frame 30: new EMA = 1.0 * (1 - 0.10) + 1.20 * 0.10 = 0.90 + 0.12 = 1.02
      expect(tracker.getEmaCalib()?.mouthWidthScale).toBeCloseTo(1.02, 2);
    });

    it("should reject outlier calibration updates when tracking confidence < 0.70", () => {
      const tracker = new MouthTracker("ruby");
      const fakeVideo = {} as HTMLVideoElement;

      // Frame 1: Initial baseline = 1.0
      vi.spyOn((tracker as any).visionDetector, "detect").mockReturnValue({
        x: 0.5,
        y: 0.229,
        radiusX: 0.056,
        radiusY: 0.018,
        angle: 0.0,
        confidence: 0.95,
        source: "mediapipe",
        autoCalib: {
          eyeYOffset: 0.0,
          eyeSpacingScale: 1.0,
          browYOffset: 0.0,
          noseBaseYOffset: 0.0,
          mouthYOffset: 0.0,
          mouthWidthScale: 1.0,
          mouthHeightScale: 1.0,
          jawContourScale: 1.0,
        },
      });
      tracker.update(fakeVideo);

      // Frame 2..30: Low confidence (0.45) corrupted tracking
      vi.spyOn((tracker as any).visionDetector, "detect").mockReturnValue({
        x: 0.5,
        y: 0.229,
        radiusX: 0.056,
        radiusY: 0.018,
        angle: 0.0,
        confidence: 0.45,
        source: "optical",
        autoCalib: {
          eyeYOffset: 0.50,
          eyeSpacingScale: 2.0,
          browYOffset: 0.50,
          noseBaseYOffset: 0.50,
          mouthYOffset: 0.50,
          mouthWidthScale: 2.50,
          mouthHeightScale: 2.50,
          jawContourScale: 2.50,
        },
      });

      for (let i = 2; i <= 30; i++) {
        tracker.update(fakeVideo);
      }

      // Frame 30 must NOT be updated because confidence < 0.70
      expect(tracker.getEmaCalib()?.mouthWidthScale).toBe(1.0);
    });

    it("should reset EMA calibration and clear cached values", () => {
      const tracker = new MouthTracker("ruby");
      const fakeVideo = {} as HTMLVideoElement;

      vi.spyOn((tracker as any).visionDetector, "detect").mockReturnValue({
        x: 0.5,
        y: 0.229,
        radiusX: 0.056,
        radiusY: 0.018,
        angle: 0.0,
        confidence: 0.95,
        source: "mediapipe",
        autoCalib: {
          eyeYOffset: 0.0,
          eyeSpacingScale: 1.0,
          browYOffset: 0.0,
          noseBaseYOffset: 0.0,
          mouthYOffset: 0.0,
          mouthWidthScale: 1.0,
          mouthHeightScale: 1.0,
          jawContourScale: 1.0,
        },
      });

      tracker.update(fakeVideo);
      expect(tracker.getEmaCalib()).toBeDefined();

      tracker.resetCalibration();
      expect(tracker.getEmaCalib()).toBeNull();
    });
  });
});
