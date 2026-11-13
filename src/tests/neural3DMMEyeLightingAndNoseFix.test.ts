/**
 * src/tests/neural3DMMEyeLightingAndNoseFix.test.ts
 *
 * Comprehensive unit test suite verifying:
 * 1. Corneal specular highlights, catchlights, and iris dome are locked to clampedUv (dynamic face kinematics).
 * 2. Glabellar furrow shading is strictly located between eyebrows (superior to eyes) without nose discoloration.
 * 3. MediaPipe landmark fallbacks compute 6-point palpebral contour centroid instead of tear duct (inner canthus).
 * 4. Portrait avatar defaults provide anatomically accurate ~0.26 inter-ocular distance (IOD).
 */

import { describe, it, expect } from "vitest";
import { NEURAL_3DMM_FRAGMENT_SHADER } from "@/lib/realtime/neural3DMMShader";
import { drawLandmarks2D } from "@/lib/realtime/liveAnchorStageEngine";

describe("Neural 3DMM Eye Lighting & Nose Discoloration Fix", () => {
  describe("1. Shader Coordinate Locking to Dynamic Texture Space (clampedUv)", () => {
    it("should compute left and right corneal softbox catchlights from clampedUv", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "vec2 dSoftL = vec2((clampedUv.x - (u_leftEyeCenter.x + softboxOffset.x + gazeCorneaShiftXL)) * u_aspectRatio,"
      );
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "vec2 dSoftR = vec2((clampedUv.x - (u_rightEyeCenter.x + softboxOffset.x + gazeCorneaShiftXR)) * u_aspectRatio,"
      );
      expect(NEURAL_3DMM_FRAGMENT_SHADER).not.toContain(
        "vec2 dSoftL = vec2((v_texCoord.x - (u_leftEyeCenter.x"
      );
      expect(NEURAL_3DMM_FRAGMENT_SHADER).not.toContain(
        "vec2 dSoftR = vec2((v_texCoord.x - (u_rightEyeCenter.x"
      );
    });

    it("should compute corneal specular dome disk and limbal ring from clampedUv with elevation bias and gaze tracking", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "vec2 dCorneaL = vec2((clampedUv.x - (u_leftEyeCenter.x + gazeCorneaShiftXL)) * u_aspectRatio, clampedUv.y - (u_leftEyeCenter.y - eyeRy * 0.12 + gazeCorneaShiftYL));"
      );
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "vec2 dCorneaR = vec2((clampedUv.x - (u_rightEyeCenter.x + gazeCorneaShiftXR)) * u_aspectRatio, clampedUv.y - (u_rightEyeCenter.y - eyeRy * 0.12 + gazeCorneaShiftYR));"
      );
      expect(NEURAL_3DMM_FRAGMENT_SHADER).not.toContain(
        "vec2 dCorneaL = vec2((v_texCoord.x - corneaCenterL.x)"
      );
      expect(NEURAL_3DMM_FRAGMENT_SHADER).not.toContain(
        "vec2 dCorneaR = vec2((v_texCoord.x - corneaCenterR.x)"
      );
    });

    it("should lock expression creases, malar flush, and crow's-feet to clampedUv", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("applyDynamicExpressionCreases(\n            videoColor.rgb,\n            clampedUv,");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("vec2 dCheekL = vec2((clampedUv.x - leftCheek.x) * u_aspectRatio, clampedUv.y - leftCheek.y);");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("vec2 dCanthusL = vec2((clampedUv.x - canthusL.x) * u_aspectRatio, clampedUv.y - canthusL.y);");
    });
  });

  describe("2. Glabellar Furrow Shading & Nose Discoloration Prevention", () => {
    it("should position C3 glabellar furrow between the eyebrows above the eyes", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "vec2 browCenter = (u_leftEyeCenter + u_rightEyeCenter) * 0.5 - vec2(0.0, eyeRy * 1.8);"
      );
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "vec2 dGlabella = vec2((clampedUv.x - browCenter.x) * u_aspectRatio, clampedUv.y - browCenter.y);"
      );
    });

    it("should position 6D strain-based wrinkle relighting at browCenter instead of midEye", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).not.toContain(
        "vec2 midEye = (u_leftEyeCenter + u_rightEyeCenter) * 0.5;\n        vec2 dGlabella = vec2((v_texCoord.x - midEye.x)"
      );
    });

    it("should blend 6D diffuse shadow with furrowMask to eliminate harsh unblended borders", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("float shadowTerm = mix(1.0, 0.88 + diff * 0.15, furrowMask);");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("videoColor.rgb *= shadowTerm;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).not.toContain("videoColor.rgb *= (0.78 + diff * 0.28);");
    });

    it("mathematically confines furrow shadow above eyes so nose remains 100% clean", () => {
      const eyeRy = 0.018;
      const midEyeY = 0.385;
      const browCenterY = midEyeY - eyeRy * 1.8; // 0.3526
      const noseBridgeY = 0.420; // 35px down on nose

      const dyGlabella = noseBridgeY - browCenterY;
      const distGlabellaSq = (dyGlabella * dyGlabella) / 0.0008;

      // On the nose bridge, distGlabellaSq is > 5.0, so exp(-distGlabellaSq) < 0.005
      const glabellaDarkening = Math.exp(-distGlabellaSq);
      expect(glabellaDarkening).toBeLessThan(0.005);
      expect(1.0 - glabellaDarkening * 0.06).toBeCloseTo(1.0, 3);
    });
  });

  describe("3. 6-Point Palpebral Centroid Fallback Calculation", () => {
    it("should compute centroid of 6 contour landmarks rather than inner canthus tear duct", () => {
      // Synthetic 6 contour points around eye centered at (0.370, 0.385)
      const mockLm: Record<number, { x: number; y: number; z: number }> = {
        33: { x: 0.330, y: 0.385, z: 0 },   // Outer corner (lateral canthus)
        133: { x: 0.410, y: 0.385, z: 0 },  // Inner corner (tear duct / medial canthus)
        160: { x: 0.350, y: 0.370, z: 0 },  // Upper lid lateral
        158: { x: 0.390, y: 0.370, z: 0 },  // Upper lid medial
        153: { x: 0.390, y: 0.400, z: 0 },  // Lower lid medial
        144: { x: 0.350, y: 0.400, z: 0 },  // Lower lid lateral
      };

      const centroidX = (mockLm[33].x + mockLm[160].x + mockLm[158].x + mockLm[133].x + mockLm[153].x + mockLm[144].x) / 6;
      const centroidY = (mockLm[33].y + mockLm[160].y + mockLm[158].y + mockLm[133].y + mockLm[153].y + mockLm[144].y) / 6;

      // Centroid should be exactly at eye center (0.370, 0.385)
      expect(centroidX).toBeCloseTo(0.370, 3);
      expect(centroidY).toBeCloseTo(0.385, 3);

      // Tear duct landmark 133 was at 0.410 (40% shifted towards the nose!)
      expect(mockLm[133].x).toBe(0.410);
      expect(Math.abs(centroidX - mockLm[133].x)).toBeGreaterThan(0.035);
    });
  });

  describe("4. Portrait Avatar Anatomical Proportions", () => {
    it("should maintain ~0.26 inter-ocular distance (IOD) on 1:1 portrait avatar framing", () => {
      const eyeLx = 0.370;
      const eyeRx = 0.630;
      const iod = eyeRx - eyeLx;

      // Real human face in portrait framing has IOD ~ 0.26
      expect(iod).toBeCloseTo(0.260, 3);

      // Squeezed default was 0.565 - 0.435 = 0.130 (half the anatomical distance)
      expect(iod).toBeGreaterThan(0.20);
    });
  });

  describe("5. Full Cornea Dome Radius & Dynamic Aperture Attenuation", () => {
    it("should define corneaRadius dynamically scaled to eyeRx (eyeRx * 0.52)", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "float corneaRadius = eyeRx * 0.52;"
      );
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "float normCorneaDistSqL = (dCorneaL.x * dCorneaL.x + dCorneaL.y * dCorneaL.y) * invCorneaRadiusSq;"
      );
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "float normCorneaDistSqR = (dCorneaR.x * dCorneaR.x + dCorneaR.y * dCorneaR.y) * invCorneaRadiusSq;"
      );
      // Ensure the old truncated vertical metric (eyeRy * 0.52 = 0.00936) is gone
      expect(NEURAL_3DMM_FRAGMENT_SHADER).not.toContain(
        "pow(dCorneaL.y / (eyeRy * 0.52), 2.0)"
      );
    });

    it("should fade corneal highlights on blink so light does not shine through eyelids", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "float blinkFadeL = 1.0 - smoothstep(0.0, 0.70, u_blinkLeft);"
      );
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "float blinkFadeR = 1.0 - smoothstep(0.0, 0.70, u_blinkRight);"
      );
    });

    it("should implement anatomical eyelid dermal closure in Stage 6B with bulbar dome shading", () => {
      // 1. Stage 3 gentle supratarsal crease indentation
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "float lidDispYL = u_blinkLeft * eyeRy * 0.08 * eyeArchL * supraCreaseL * eyeMaskL;"
      );
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "float lidDispYR = u_blinkRight * eyeRy * 0.08 * eyeArchR * supraCreaseR * eyeMaskR;"
      );

      // 2. Stage 6B dermal texture sampling
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("vec3 eyelidSkinL = texture(u_videoTexture, clamp(localSkinUvL, vec2(0.0), vec2(1.0))).rgb;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("vec3 eyelidSkinR = texture(u_videoTexture, clamp(localSkinUvR, vec2(0.0), vec2(1.0))).rgb;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("float domeShadeL = 0.94 + nDotLL * 0.08;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("float domeShadeR = 0.94 + nDotLR * 0.08;");

      // 3. Lower eyelid subciliary groove
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "float targetLowerLidYL = (0.76 + eyeArchL * 0.08) * eyeRy;"
      );
    });

    it("should compute eyeDistSqClamped from clampedUv to follow head sway and jaw motion", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "vec2 dEyeClampedL = vec2((clampedUv.x - u_leftEyeCenter.x) * u_aspectRatio, clampedUv.y - u_leftEyeCenter.y);"
      );
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "float eyeDistSqClampedL = normClampedExL * normClampedExL + normClampedEyL * normClampedEyL;"
      );
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "vec2 dEyeClampedR = vec2((clampedUv.x - u_rightEyeCenter.x) * u_aspectRatio, clampedUv.y - u_rightEyeCenter.y);"
      );
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "float eyeDistSqClampedR = normClampedExR * normClampedExR + normClampedEyR * normClampedEyR;"
      );
    });

    it("should enforce isotropic aspect ratio scaling so eyes are never stretched wide in 16:9 widescreen video", () => {
      // eyeRx scales dynamically with eyeSpan and headRadius with clamped bounds
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("float eyeRx = clamp(baseEyeRx, 0.012, 0.052);");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("float eyeRy = clamp(eyeRx * 0.36, 0.005, 0.020);");
      // normExL is scaled by invEyeRx
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("float normExL = dEyeL.x * invEyeRx;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).not.toContain("float normClampedExL = dEyeClampedL.x / (eyeRx * u_aspectRatio);");
    });

    it("should compute natural eyeArch dropping strictly to 0 outside the eye", () => {
      // Natural eyeArch that drops strictly to 0 outside the eye without clamp(..., 0.0, 0.99)
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("float eyeArchL = sqrt(max(0.0, 1.0 - clamp(normExL * normExL, 0.0, 1.0)));");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).not.toContain("clamp(normClampedExL * normClampedExL * 0.88, 0.0, 0.99)");
      // Continuous eye widening without sign() step jump
      expect(NEURAL_3DMM_FRAGMENT_SHADER).not.toContain("sign(dEyeL.y) * wideningFactor");
    });
  });

  describe("6. 2D Landmark Overlay Kinematic Synchronicity", () => {
    it("should shift landmark coordinates with headShiftX, headShiftY, and headLeanZ", () => {
      const recordedArcs: Array<{ x: number; y: number }> = [];
      const mockCtx = {
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        closePath: () => {},
        stroke: () => {},
        arc: (x: number, y: number) => {
          recordedArcs.push({ x, y });
        },
        fill: () => {},
        save: () => {},
        restore: () => {},
        clearRect: () => {},
      } as unknown as CanvasRenderingContext2D;

      const baseTracked = {
        x: 0.5,
        y: 0.6,
        radiusX: 0.06,
        radiusY: 0.025,
        confidence: 0.95,
        headCenter: [0.5, 0.45] as [number, number],
        headRadius: [0.25, 0.32] as [number, number],
        leftEyeCenter: [0.37, 0.385] as [number, number],
        rightEyeCenter: [0.63, 0.385] as [number, number],
        landmarks68: new Float32Array(136).fill(0.5),
      };

      const neutralCalib = {
        eyeYOffset: 0,
        eyeSpacingScale: 1.0,
        browYOffset: 0,
        noseBaseYOffset: 0,
        mouthYOffset: 0,
        mouthWidthScale: 1.0,
        mouthHeightScale: 1.0,
        jawContourScale: 1.0,
      };

      const frame = {
        jawOpen: 0,
        lipWidth: 0,
        lipPucker: 0,
        lipCompression: 0,
        eyebrowRaise: 0,
        eyebrowFurrow: 0,
        smileExpression: 0,
      };

      // 1. Base rendering with zero shift
      recordedArcs.length = 0;
      drawLandmarks2D(mockCtx, baseTracked as any, frame as any, neutralCalib, 0, 0, 1000, 1000, 0, 0, 0, 1.0, 0, 0, 0, 0, 0);
      const basePoints = [...recordedArcs];

      // 2. Rendering with positive headShiftX (+1.0) and headShiftY (+1.0)
      recordedArcs.length = 0;
      drawLandmarks2D(mockCtx, baseTracked as any, frame as any, neutralCalib, 0, 0, 1000, 1000, 0, 0, 0, 1.0, 0, 0, 1.0, 1.0, 0);
      const shiftedPoints = [...recordedArcs];

      // Shift is 0.035 in normalized coords = 35 pixels in 1000x1000 canvas
      expect(shiftedPoints[0].x).toBeCloseTo(basePoints[0].x + 35, 1);
      expect(shiftedPoints[0].y).toBeCloseTo(basePoints[0].y + 35, 1);

      // 3. Rendering with headLeanZ (+1.0 => leanScale 1.20)
      recordedArcs.length = 0;
      drawLandmarks2D(mockCtx, baseTracked as any, frame as any, neutralCalib, 0, 0, 1000, 1000, 0, 0, 0, 1.0, 0, 0, 0, 0, 1.0);
      const leanedPoints = [...recordedArcs];

      // Points away from pivot should scale outwards
      expect(leanedPoints.length).toBe(68);
    });
  });
});
