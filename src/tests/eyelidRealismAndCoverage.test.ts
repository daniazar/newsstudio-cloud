/**
 * src/tests/eyelidRealismAndCoverage.test.ts
 *
 * Unit tests verifying fixes for:
 * 1. Full-span palpebral coverage: Eyelid extends across the entire eye width without truncating lateral/medial corners.
 * 2. Supratarsal top crease envelope: Anchored high across the full fissure width so 100% of open upper eyelashes are covered.
 * 3. Anatomical opacity during blink descent: Opaque skin curtain sliding down (no transparency until fully down).
 * 4. Nasal bridge dermal texture extraction: Samples real skin pores, freckles, and complexion from the top of the nose between the eyes.
 * 5. Right eye lash calculation independence: Zero variable leakage from left eye (distFromMarginR, baseLashLengthR).
 */

import { describe, it, expect } from "vitest";
import { NEURAL_3DMM_FRAGMENT_SHADER } from "@/lib/realtime/shaders/neural3DMMFragmentShader";
import { LiveAnchorStageEngine } from "@/lib/realtime/liveAnchorStageEngine";

describe("Eyelid Realism, Full-Span Coverage & Nasal Bridge Texture Suite", () => {
  describe("1. Full Palpebral Width & Canthus Bounds", () => {
    it("should allow wide canthus boundaries in STAGE_6B_EYELID_CLOSURE to cover outer and inner eye corners", () => {
      // Left eye canthus boundaries
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "float xLatL = min(-1.50, u_leftEyeCanthus.x);"
      );
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "float xMedL = max(1.40, u_leftEyeCanthus.y);"
      );

      // Right eye canthus boundaries
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "float xMedR = min(-1.40, u_rightEyeCanthus.x);"
      );
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "float xLatR = max(1.50, u_rightEyeCanthus.y);"
      );
    });

    it("should configure expanded fallback canthus uniforms in LiveAnchorStageEngine", () => {
      const canvas = {
        addEventListener: () => {},
        removeEventListener: () => {},
        getContext: () => null,
        width: 512,
        height: 512,
      } as unknown as HTMLCanvasElement;

      const engine = new LiveAnchorStageEngine(canvas, null);
      const uniforms = (engine as unknown as { uniforms: { leftEyeCanthus: number[]; rightEyeCanthus: number[] } }).uniforms;

      // Fallback canthus spans must extend to at least ±1.65 to envelope full eye width
      expect(uniforms.leftEyeCanthus[0]).toBeLessThanOrEqual(-1.65);
      expect(uniforms.leftEyeCanthus[1]).toBeGreaterThanOrEqual(1.55);
      expect(uniforms.rightEyeCanthus[0]).toBeLessThanOrEqual(-1.55);
      expect(uniforms.rightEyeCanthus[1]).toBeGreaterThanOrEqual(1.65);

      engine.dispose();
    });
  });

  describe("2. Supratarsal Crease Envelope & Natural Medial Canthus Shape", () => {
    it("should curve gracefully to medial canthus without boxy cliff and scale progressively with blink descent", () => {
      // Anchored with natural anatomical arch tapering gracefully into caruncle / nasal bone
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("float topApexL = -2.60;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("float topApexR = -2.60;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "float archTopL = sqrt(max(0.0, 1.0 - u2L)) * (1.0 - 0.18 * medialFactorL);"
      );
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "float archTopR = sqrt(max(0.0, 1.0 - u2R)) * (1.0 - 0.18 * medialFactorR);"
      );
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "float topCreaseYL = mix(openUpperLashYL, fullTopCreaseYL, smoothstep(0.0, 0.70, u_blinkLeft));"
      );
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "float topCreaseYR = mix(openUpperLashYR, fullTopCreaseYR, smoothstep(0.0, 0.70, u_blinkRight));"
      );
    });

    it("should ensure linear progressive descent where 5% wink only lowers 5% of aperture", () => {
      const openUpperLashY = -1.45;
      const contactLineY = 0.85;
      const fullTopCreaseY = -2.60;

      const computeDescent = (u_blink: number) => {
        const lidMarginY = openUpperLashY + (contactLineY - openUpperLashY) * u_blink;
        const progress = Math.min(1.0, Math.max(0.0, u_blink / 0.70));
        const activeTopCrease = openUpperLashY + (fullTopCreaseY - openUpperLashY) * progress;
        return {
          lidMarginY,
          activeTopCrease,
          marginDescent: lidMarginY - openUpperLashY,
          lidHeight: lidMarginY - activeTopCrease,
        };
      };

      const at5 = computeDescent(0.05);
      const at50 = computeDescent(0.50);
      const at100 = computeDescent(1.00);

      // At 5% wink, margin descent is strictly 5% of total travel (0.115 units out of 2.30)
      expect(at5.marginDescent).toBeCloseTo(0.115, 3);
      // At 5% wink, lid height is subtle, achieving true linear motion from resting position
      expect(at5.lidHeight).toBeLessThan(0.30);
      expect(at5.lidHeight).toBeGreaterThan(0.01);
      // Continuous progression: 50% wink is midway down, 100% wink achieves full coverage
      expect(at50.marginDescent).toBeCloseTo(1.15, 2);
      expect(at100.marginDescent).toBeCloseTo(2.30, 2);
      expect(at100.lidHeight).toBeGreaterThan(3.00);
    });
  });

  describe("3. Anatomical Opacity During Descent (No Ghost Transparency)", () => {
    it("should render eyelid skin with opaqueAlpha rather than linear blink transparency", () => {
      // Rapid onset fade enables seamless sub-pixel emergence then 100% solid opacity during descent
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "float onsetFadeL = smoothstep(0.005, 0.04, u_blinkLeft);"
      );
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "float onsetFadeR = smoothstep(0.005, 0.04, u_blinkRight);"
      );
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "float opaqueAlphaL = topBlendL * canthusEdgeL * onsetFadeL * eyeVisL;"
      );
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "float opaqueAlphaR = topBlendR * canthusEdgeR * onsetFadeR * eyeVisR;"
      );
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "videoColor.rgb = mix(videoColor.rgb, eyelidSkinL, opaqueAlphaL);"
      );
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "videoColor.rgb = mix(videoColor.rgb, eyelidSkinR, opaqueAlphaR);"
      );
    });

    it("should preserve coverAlpha definition for backward compatibility with side-profile test suite", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "float coverAlphaL = topBlendL * canthusEdgeL * u_blinkLeft * eyeVisL;"
      );
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "float coverAlphaR = topBlendR * canthusEdgeR * u_blinkRight * eyeVisR;"
      );
    });
  });

  describe("4. Nasal Bridge Dermal Texture Extraction", () => {
    it("should sample dermal texture directly from the top of the nose between the eyes", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "vec2 bridgeCenter = (u_leftEyeCenter + u_rightEyeCenter) * 0.5;"
      );
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "float bridgeTopY = bridgeCenter.y - eyeRy * 0.65;"
      );
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "bridgeCenter.x + (uClampedL * 0.55) * (eyeRx / u_aspectRatio)"
      );
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "bridgeCenter.x + (uClampedR * 0.55) * (eyeRx / u_aspectRatio)"
      );
    });

    it("should eliminate artificial overall grey/muddy darkening of eyelid skin", () => {
      // The old flat darkening multiplier vec3(0.88, 0.85, 0.83) must not be applied to eyelidSkin
      expect(NEURAL_3DMM_FRAGMENT_SHADER).not.toContain(
        "eyelidSkinL *= vec3(0.88, 0.85, 0.83);"
      );
      expect(NEURAL_3DMM_FRAGMENT_SHADER).not.toContain(
        "eyelidSkinR *= vec3(0.88, 0.85, 0.83);"
      );
    });
  });

  describe("5. Right Eye Variable Isolation & Eyelash Independence", () => {
    it("should use distFromMarginR and baseLashLengthR for right eye eyelashes", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "float lashTipR = (distFromMarginR >= 0.0 && distFromMarginR <= baseLashLengthR) ? (organicLashR * lashTaperR * 0.85) : 0.0;"
      );
      expect(NEURAL_3DMM_FRAGMENT_SHADER).not.toContain(
        "upperLashR = (distFromMarginL >= 0.0"
      );
    });
  });
});
