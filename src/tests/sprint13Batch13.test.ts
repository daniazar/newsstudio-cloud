import { describe, it, expect, vi } from "vitest";
import { MasterClockSync } from "../lib/realtime/masterClockSync";
import { OnnxAudioVisemeEngine } from "../lib/realtime/onnxAudioVisemeEngine";
import { LiveAnchorStageEngine } from "../lib/realtime/liveAnchorStageEngine";
import { NEURAL_3DMM_FRAGMENT_SHADER } from "../lib/realtime/neural3DMMShader";
import { CHROMA_COMPOSITOR_FS } from "../lib/realtime/shaders/chromaCompositorPass";
import { CHROMA_FRAGMENT_SHADER } from "../lib/realtime/webglChromaCompositor";

describe("Sprint 13 Batch 13: Final Architecture & Realism Upgrades (Q3, O2, Q4, TPS, FAB, N3)", () => {
  describe("Q3: Graceful TTS Audio Underrun Handling (MasterClockSync)", () => {
    it("should calculate remaining audio buffer duration in milliseconds", () => {
      const clock = new MasterClockSync({ sampleRate: 24000, targetFps: 30, preBufferThresholdMs: 400 });
      // Queue 24,000 samples (1000ms of audio)
      clock.registerQueuedSamples(24000);
      expect(clock.getRemainingBufferMs()).toBeCloseTo(1000, 1);

      // Play 12,000 samples (500ms played, 500ms remaining)
      clock.registerAudioSamples(12000);
      expect(clock.getRemainingBufferMs()).toBeCloseTo(500, 1);
    });

    it("should trigger onAudioUnderrunImminent callback and underrun_bridge action when buffer drops below preBufferThresholdMs", () => {
      const clock = new MasterClockSync({ sampleRate: 24000, targetFps: 30, preBufferThresholdMs: 400 });
      const underrunSpy = vi.fn();
      clock.onAudioUnderrunImminent = underrunSpy;

      // Queue 24,000 samples (1000ms)
      clock.registerQueuedSamples(24000);
      clock.registerAudioSamples(12000); // 500ms remaining (> 400ms threshold)
      clock.evaluateFrame(); // Video syncs to audio playback

      const status1 = clock.evaluateFrame();
      expect(status1.action).toBe("render");
      expect(underrunSpy).not.toHaveBeenCalled();

      // Play additional 6,000 samples (now 18,000 played, 6,000 remaining = 250ms < 400ms threshold)
      clock.registerAudioSamples(6000);
      const status2 = clock.evaluateFrame();

      expect(status2.action).toBe("underrun_bridge");
      expect(underrunSpy).toHaveBeenCalledTimes(1);
      expect(underrunSpy).toHaveBeenCalledWith(expect.closeTo(250, 1));
    });

    it("should replenish buffer when new TTS chunk arrives and exit underrun_bridge state", () => {
      const clock = new MasterClockSync({ sampleRate: 24000, targetFps: 30, preBufferThresholdMs: 400 });
      clock.registerQueuedSamples(24000);
      clock.registerAudioSamples(20000); // 4000 remaining = 166.7ms (< 400ms)

      const status1 = clock.evaluateFrame();
      expect(status1.action).toBe("underrun_bridge");

      // New TTS chunk arrives: +24,000 samples (+1000ms)
      clock.registerQueuedSamples(24000);
      expect(clock.getRemainingBufferMs()).toBeGreaterThan(1000);
      clock.evaluateFrame(); // Syncs video frame to audio position

      const status2 = clock.evaluateFrame();
      expect(status2.action).toBe("render");
    });
  });

  describe("O2: PCM Lookahead for Zero-Latency TTS Lip Sync (OnnxAudioVisemeEngine)", () => {
    it("should schedule and interpolate lookahead viseme frames with Hermite smoothing", () => {
      const engine = new OnnxAudioVisemeEngine();

      // Schedule Frame A at t = 1000ms with jawOpen = 0.20
      engine.queueLookaheadViseme(1000, { jawOpen: 0.20, lipWidth: -0.10 });
      // Schedule Frame B at t = 1100ms with jawOpen = 0.80
      engine.queueLookaheadViseme(1100, { jawOpen: 0.80, lipWidth: 0.30 });

      expect(engine.getLookaheadQueueLength()).toBe(2);

      // Query exactly at t = 1000ms
      const f1000 = engine.getLookaheadVisemeFrame(1000);
      expect(f1000?.jawOpen).toBeCloseTo(0.20, 2);

      // Query midway at t = 1050ms (alpha = 0.5, Hermite t = 0.5^2 * (3 - 1) = 0.5)
      const f1050 = engine.getLookaheadVisemeFrame(1050);
      expect(f1050?.jawOpen).toBeCloseTo(0.50, 2);
      expect(f1050?.lipWidth).toBeCloseTo(0.10, 2);

      // Query at t = 1100ms
      const f1100 = engine.getLookaheadVisemeFrame(1100);
      expect(f1100?.jawOpen).toBeCloseTo(0.80, 2);

      engine.destroy();
    });

    it("should purge expired frames older than 500ms from the lookahead queue", () => {
      const engine = new OnnxAudioVisemeEngine();
      engine.queueLookaheadViseme(100, { jawOpen: 0.1 });
      engine.queueLookaheadViseme(800, { jawOpen: 0.5 });
      engine.queueLookaheadViseme(1000, { jawOpen: 0.9 });

      // Query at t = 700ms -> frame at 100ms is older than 700 - 500 = 200ms, should be purged
      engine.getLookaheadVisemeFrame(700);
      expect(engine.getLookaheadQueueLength()).toBeLessThan(3);

      engine.clearLookaheadQueue();
      expect(engine.getLookaheadQueueLength()).toBe(0);

      engine.destroy();
    });
  });

  describe("Q4: Persona Hot-Swap Without Context Flash (LiveAnchorStageEngine)", () => {
    it("should smoothly interpolate calibration over transition duration without WebGL context loss", async () => {
      const mockCanvas = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        getContext: vi.fn().mockReturnValue(null),
      } as unknown as HTMLCanvasElement;

      const engine = new LiveAnchorStageEngine(mockCanvas, null, { personaId: "ruby" });
      expect(engine.getIsContextLost()).toBe(false);

      // Initiate zero-flash swap to diego over 50ms
      const swapPromise = engine.swapPersona("diego", undefined, 50);
      expect(swapPromise).toBeInstanceOf(Promise);

      const result = await swapPromise;
      expect(result).toBe(true);
      expect(engine.getIsContextLost()).toBe(false);

      engine.dispose();
    });
  });

  describe("TPS: Thin-Plate Spline Bi-Harmonic Landmark Cage (neural3DMMShader.ts)", () => {
    it("should include closed-form 2D bi-harmonic kernel U(r) = r^2 * ln(r) in NEURAL_3DMM_FRAGMENT_SHADER", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("float tpsKernel(float r)");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("r * r * log(r + 1e-6)");
    });

    it("should implement 8-point facial landmark cage deformation with boundary pinning", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("evaluateTPSBiHarmonicCage");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("dUpperLip");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("dLowerLip");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("wBoundary");
    });

    it("should declare and evaluate u_enableTPS uniform", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("uniform int u_enableTPS;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("if (u_enableTPS == 1");
    });
  });

  describe("FAB: Fabric & Garment Secondary Dynamics (neural3DMMShader.ts)", () => {
    it("should declare u_enableFabricDynamics uniform and compute multi-harmonic lapel drape wrinkles", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("uniform int u_enableFabricDynamics;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("6G. FABRIC TENSION CREASES & GARMENT SECONDARY DYNAMICS (FAB)");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("fabricStrain");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("u_enableFabricDynamics != 0");
    });

    it("should perturb garment normals and render anisotropic specular highlights", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("fabricNormal = normalize(vec3(-dFdx, -dFdy, 1.0));");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("fabricSpec = pow(max(0.0, dot(fabricNormal, halfDir)), 48.0);");
    });
  });

  describe("N3: Background Exposure Auto-Compensation", () => {
    it("should calculate auto-exposure scaling in LiveAnchorStageEngine based on fg/bg luminance", () => {
      const mockCanvas = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        getContext: vi.fn().mockReturnValue(null),
      } as unknown as HTMLCanvasElement;

      const engine = new LiveAnchorStageEngine(mockCanvas, null);

      // Balanced lighting
      expect(engine.computeBackgroundExposure(0.45, 0.50)).toBe(1.0);

      // Dark foreground (0.25) against bright studio set (0.80)
      const compensated = engine.computeBackgroundExposure(0.25, 0.80);
      expect(compensated).toBeLessThan(1.0);
      expect(compensated).toBeGreaterThanOrEqual(0.40);

      engine.dispose();
    });

    it("should include u_bgExposureComp uniform and highlight knee compression in chroma shaders", () => {
      expect(CHROMA_COMPOSITOR_FS).toContain("uniform float u_bgExposureComp;");
      expect(CHROMA_COMPOSITOR_FS).toContain("bgRgb *= u_bgExposureComp;");
      expect(CHROMA_FRAGMENT_SHADER).toContain("uniform float u_bgExposureComp;");
      expect(CHROMA_FRAGMENT_SHADER).toContain("bgRgb *= u_bgExposureComp;");
    });
  });
});
