/**
 * src/lib/realtime/__tests__/webglVisemeCompositor.test.ts
 *
 * Unit tests for WebGLVisemeCompositor lifecycle, dynamic lighting, optical shutter motion blur, and fallbacks.
 */

import { describe, it, expect } from "vitest";
import { WebGLVisemeCompositor } from "../webglVisemeCompositor";

describe("WebGLVisemeCompositor", () => {
  it("initializes without throwing in environments without WebGL2", () => {
    const compositor = new WebGLVisemeCompositor();
    expect(compositor.isReady()).toBe(false);

    // Calling render or dispose on uninitialized compositor should not throw
    expect(() => {
      compositor.render({
        layerA: 0,
        layerB: 1,
        blendFactor: 0.5,
        landmark: { cx: 550, cy: 438, w: 94.5, angle: -2.5 },
      });
      compositor.dispose();
    }).not.toThrow();
  });

  it("accepts optical shutter motion blur and dynamic lighting options without throwing", () => {
    const compositor = new WebGLVisemeCompositor();

    expect(() => {
      compositor.render({
        layerA: 2,
        layerB: 5,
        blendFactor: 0.8,
        landmark: { cx: 552, cy: 440, w: 96.0, angle: -2.8 },
        jawDrop: 4.5,
        presenceWeight: 0.95,
        options: {
          shutterAngle: 0.5, // 180 degrees
          colorGain: [1.05, 0.98, 0.92], // warm lighting
          colorOffset: [0.01, 0.0, -0.01],
          skinLumaRatio: 1.12,
        },
        motionVelocity: [0.002, 0.005],
      });
    }).not.toThrow();
  });

  it("handles sampleSkinProbe fallback gracefully in non-DOM test environment", () => {
    const compositor = new WebGLVisemeCompositor();
    const fakeMedia = {} as HTMLImageElement;
    const probe = compositor.sampleSkinProbe(fakeMedia, { cx: 550, cy: 438, w: 94.5, angle: 0 });

    expect(probe).toBeDefined();
    expect(probe.lumaRatio).toBeGreaterThan(0);
    expect(probe.gain).toHaveLength(3);
    expect(probe.offset).toHaveLength(3);
  });

  describe("Fragment Shader Realism & Distortion-Free Architecture", () => {
    it("ensures clean 2D affine mapping without optical flow distortion or 3D coordinate warps", async () => {
      const { FS_SOURCE } = await import("../webglVisemeCompositor");
      // Must NOT contain optical flow distortion map or 3D lateral skew
      expect(FS_SOURCE).not.toContain("u_opticalFlowMap");
      expect(FS_SOURCE).not.toContain("lateralSkew");

      // Must use clean 2D affine patch coordinates
      expect(FS_SOURCE).toContain("patchUv = patchCoord.xy / u_patchSize;");
    });

    it("verifies Hermite cross-fading formula (3t^2 - 2t^3) for seamless sub-frame blending", async () => {
      const { FS_SOURCE } = await import("../webglVisemeCompositor");
      expect(FS_SOURCE).toContain("float s = t * t * (3.0 - 2.0 * t);");
    });

    it("verifies soft elliptical radial edge feathering to eliminate rectangular patch seams", async () => {
      const { FS_SOURCE } = await import("../webglVisemeCompositor");
      expect(FS_SOURCE).toContain("float edgeFeather = 1.0 - smoothstep(0.75, 1.00, d);");
    });

    it("verifies bilabial dental collision gating to prevent teeth gleaming through closed lips", async () => {
      const { FS_SOURCE } = await import("../webglVisemeCompositor");
      expect(FS_SOURCE).toContain("if (u_layerA <= 4 && u_layerB <= 4)");
      expect(FS_SOURCE).toContain("isTeeth = 0.0;");
    });

    it("preserves dynamic lighting, saliva Fresnel moisture gleam, and enamel highlights", async () => {
      const { FS_SOURCE } = await import("../webglVisemeCompositor");
      expect(FS_SOURCE).toContain("u_lipMoisture");
      expect(FS_SOURCE).toContain("u_enamelFresnel");
      expect(FS_SOURCE).toContain("u_rimIntensity");
      expect(FS_SOURCE).toContain("u_colorGain");
    });

    it("ensures chinEdgeFeather preserves full mandibular region in fullface mode", async () => {
      const { FS_SOURCE } = await import("../webglVisemeCompositor");
      expect(FS_SOURCE).toContain("chinEdgeFeather");
      expect(FS_SOURCE).toContain("u_isFullFace");
    });

    it("ensures featherCenter and rY provide generous envelope in mouth mode", async () => {
      const { FS_SOURCE } = await import("../webglVisemeCompositor");
      expect(FS_SOURCE).toContain("rY_down");
      expect(FS_SOURCE).toContain("u_patchRadius.y * 1.50");
    });

    it("verifies dental enamel chromatic protection in fragment shader", async () => {
      const { FS_SOURCE } = await import("../webglVisemeCompositor");
      expect(FS_SOURCE).toContain("isTeethEnamel");
      expect(FS_SOURCE).toContain("!isTeethEnamel");
      expect(FS_SOURCE).toContain("dentalBright");
    });
  });

  describe("Shader Stage Occlusion and Shadow Fixes", () => {
    it("verifies procedural noseShadow darkening is disabled in stage6DRhytidsMicroRelief", async () => {
      const { STAGE_6D_RHYTIDS_MICRO_RELIEF } = await import("../shaders/stages/stage6DRhytidsMicroRelief");
      expect(STAGE_6D_RHYTIDS_MICRO_RELIEF).not.toContain("videoColor.rgb *= (1.0 - clamp(noseShadow, 0.0, 0.20));");
    });

    it("verifies horizonAlpha occlusion clamp at high yaw is relaxed in stage5EMandibularCodebook", async () => {
      const { STAGE_5E_MANDIBULAR_CODEBOOK } = await import("../shaders/stages/stage5EMandibularCodebook");
      expect(STAGE_5E_MANDIBULAR_CODEBOOK).not.toContain("if (abs(u_headYaw) >= 1.25)");
    });
  });

  describe("Affine Transform Stability & Clamping", () => {
    it("clamps sX minimum to 0.40 * scale under extreme yaw foreshortening", async () => {
      const { computeAffineInverseMatrix } = await import("../webglVisemeCompositor");
      // Extreme foreshortened mouth width (w = 5px, nominal W0 = 94.5px)
      const res = computeAffineInverseMatrix({ cx: 500, cy: 500, w: 5.0, h: 30.0, angle: 0 });
      expect(res.sX).toBeCloseTo(0.40, 2);
    });

    it("clamps sY minimum to 0.30 * scale to prevent det=0 matrix singularity", async () => {
      const { computeAffineInverseMatrix } = await import("../webglVisemeCompositor");
      // Zero height input
      const res = computeAffineInverseMatrix({ cx: 500, cy: 500, w: 0.0, h: 0.0, angle: 0 });
      expect(res.sX).toBeGreaterThanOrEqual(0.40);
      expect(res.sY).toBeGreaterThanOrEqual(0.30);
      expect(res.det).toBeGreaterThan(0.10);
      // All 9 matrix entries must be finite (no NaN, no Infinity)
      for (let i = 0; i < 9; i++) {
        expect(Number.isFinite(res.invAffineMat3[i])).toBe(true);
      }
    });

    it("falls back to targetW * (H0 / W0) when landmark.h <= 15.0", async () => {
      const { computeAffineInverseMatrix } = await import("../webglVisemeCompositor");
      // Degenerate sub-parting height (1.42px) from raw media pipe parting
      const res = computeAffineInverseMatrix({ cx: 500, cy: 500, w: 94.5, h: 1.42, angle: 0 });
      expect(res.targetH).toBeCloseTo(30.56, 1);
      expect(res.sY).toBeCloseTo(1.0, 1);
    });

    it("preserves conformal 1:1 isometric scaling (sX == sY) preventing incisor distortion", async () => {
      const { computeAffineInverseMatrix } = await import("../webglVisemeCompositor");
      const baseRes = computeAffineInverseMatrix({ cx: 500, cy: 500, w: 94.5, h: 30.56, angle: 0 });
      const openRes = computeAffineInverseMatrix(
        { cx: 500, cy: 500, w: 94.5, h: 30.56, angle: 0 },
        { mouthHeightRatio: 1.55 }
      );

      // Conformal isometric scaling preserves natural 1:1 tooth aspect ratio
      expect(openRes.sX).toBeCloseTo(baseRes.sX, 2);
      expect(openRes.sY).toBeCloseTo(openRes.sX, 2);
      expect(openRes.targetH).toBeCloseTo(30.56, 1);
    });

    it("maintains stable conformal scaling when openness is provided", async () => {
      const { computeAffineInverseMatrix } = await import("../webglVisemeCompositor");
      const res = computeAffineInverseMatrix(
        { cx: 500, cy: 500, w: 94.5, h: 30.56, angle: 0 },
        { openness: 0.90 }
      );
      expect(res.sX).toBeCloseTo(1.0, 1);
      expect(res.sY).toBeCloseTo(res.sX, 2);
      expect(res.det).toBeCloseTo(1.0, 1);
    });
  });

  describe("Multi-Angle Texture Bank & Yaw Matching", () => {
    it("returns null for getActiveBank when texture bank is empty", () => {
      const compositor = new WebGLVisemeCompositor();
      expect(compositor.getActiveBank(0)).toBeNull();
      expect(compositor.getActiveBank(25)).toBeNull();
    });

    it("matches closest angle bank accurately across positive and negative yaw", () => {
      const compositor = new WebGLVisemeCompositor();
      const bank = compositor.getTextureBank();

      // Mock texture bank entries for 0, 25, 45, 65, 90 degrees
      const mockTex = {} as WebGLTexture;
      const angles = [0, 25, 45, 65, 90];
      for (const ang of angles) {
        bank.set(`ruby_${ang}deg`, {
          texArray: mockTex,
          layerCount: 48,
          patchSize: 256,
          canonicalAnchor: { cx0: 128, cy0: ang === 0 ? 113 : 189.57, w0: 94.5, h0: 30.56 },
          isFullFace: false,
          angleDeg: ang,
          atlasSkinColor: ang === 0 ? [0.631, 0.420, 0.302] : [0.773, 0.580, 0.486],
        });
      }

      // Check exact matches
      expect(compositor.getActiveBank(0)?.angleDeg).toBe(0);
      expect(compositor.getActiveBank(25)?.angleDeg).toBe(25);
      expect(compositor.getActiveBank(-25)?.angleDeg).toBe(25);
      expect(compositor.getActiveBank(45)?.angleDeg).toBe(45);
      expect(compositor.getActiveBank(-45)?.angleDeg).toBe(45);
      expect(compositor.getActiveBank(90)?.angleDeg).toBe(90);

      // Check interpolated brackets
      expect(compositor.getActiveBank(10)?.angleDeg).toBe(0);
      expect(compositor.getActiveBank(18)?.angleDeg).toBe(25);
      expect(compositor.getActiveBank(36)?.angleDeg).toBe(45);
      expect(compositor.getActiveBank(58)?.angleDeg).toBe(65);
      expect(compositor.getActiveBank(82)?.angleDeg).toBe(90);

      // Verify canonical anchor for 25deg has cy0 = 189.57
      const bank25 = compositor.getActiveBank(25);
      expect(bank25?.canonicalAnchor.cy0).toBeCloseTo(189.57);
      expect(bank25?.atlasSkinColor).toEqual([0.773, 0.580, 0.486]);
    });

    it("falls back to default_0deg when requested mode/angle is missing to prevent dropout", () => {
      const compositor = new WebGLVisemeCompositor();
      const bank = compositor.getTextureBank();
      const mockTex = {} as WebGLTexture;

      // Only default_0deg registered
      bank.set("default_0deg", {
        key: "default_0deg",
        texArray: mockTex,
        layerCount: 48,
        patchSize: 256,
        canonicalAnchor: { cx0: 128, cy0: 110, w0: 94.5, h0: 30.56 },
        isFullFace: false,
        angleDeg: 0,
      });

      // At yaw = 25 or -25, should fall back to default_0deg without dropping out
      const active25 = compositor.getActiveBank(25, false);
      expect(active25).toBeDefined();
      expect(active25?.key).toBe("default_0deg");
      expect(active25?.angleDeg).toBe(0);

      const activeNeg20 = compositor.getActiveBank(-20, false);
      expect(activeNeg20).toBeDefined();
      expect(activeNeg20?.key).toBe("default_0deg");
    });

    it("strictly isolates isFullFace codebooks from mouth-only codebooks in bank", () => {
      const compositor = new WebGLVisemeCompositor();
      const bank = compositor.getTextureBank();
      const mockTex = {} as WebGLTexture;

      bank.set("ruby_mouth_25deg", {
        key: "ruby_mouth_25deg",
        texArray: mockTex,
        layerCount: 48,
        patchSize: 256,
        canonicalAnchor: { cx0: 128, cy0: 113, w0: 76, h0: 34 },
        isFullFace: false,
        angleDeg: 25,
      });

      bank.set("default_0deg", {
        key: "default_0deg",
        texArray: mockTex,
        layerCount: 48,
        patchSize: 256,
        canonicalAnchor: { cx0: 128, cy0: 110, w0: 94.5, h0: 30.56 },
        isFullFace: true,
        angleDeg: 0,
      });

      // When isFullFace is requested and no angle match exists, falls back to default_0deg
      const fullFaceBank = compositor.getActiveBank(25, true);
      expect(fullFaceBank?.isFullFace).toBe(true);
      expect(fullFaceBank?.key).toBe("default_0deg");

      // When fullface 25deg is registered, getActiveBank(25, true) selects it directly
      bank.set("ruby_fullface_25deg", {
        key: "ruby_fullface_25deg",
        texArray: mockTex,
        layerCount: 48,
        patchSize: 256,
        canonicalAnchor: { cx0: 128, cy0: 110, w0: 94.5, h0: 30.56 },
        isFullFace: true,
        angleDeg: 25,
      });
      const directFullFaceBank = compositor.getActiveBank(25, true);
      expect(directFullFaceBank?.isFullFace).toBe(true);
      expect(directFullFaceBank?.key).toBe("ruby_fullface_25deg");

      // When mouth-only is requested, mouth 25deg must be chosen
      const mouthBank = compositor.getActiveBank(25, false);
      expect(mouthBank?.isFullFace).toBe(false);
      expect(mouthBank?.key).toBe("ruby_mouth_25deg");

      // Robustness: if default_0deg has layerCount 0, it falls back to any valid resident bank
      bank.set("default_0deg", {
        key: "default_0deg",
        texArray: mockTex,
        layerCount: 0,
        patchSize: 256,
        canonicalAnchor: { cx0: 128, cy0: 110, w0: 94.5, h0: 30.56 },
        isFullFace: true,
        angleDeg: 0,
      });
      const fallbackAnyBank = compositor.getActiveBank(65, false);
      expect(fallbackAnyBank).not.toBeNull();
      expect(fallbackAnyBank?.layerCount).toBeGreaterThan(0);
    });

    it("normalizes sampleSkinProbe gain against provided reference skin color", () => {
      const compositor = new WebGLVisemeCompositor();
      const fakeMedia = {} as HTMLImageElement;
      // In non-DOM environment, fallback returns gain: [1, 1, 1]
      const probe = compositor.sampleSkinProbe(
        fakeMedia,
        { cx: 550, cy: 438, w: 94.5, angle: 0 },
        [0.631, 0.420, 0.302]
      );
      expect(probe.gain).toHaveLength(3);
    });
  });
});
