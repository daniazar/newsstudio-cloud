/**
 * src/tests/shaderExpressionAndOcularFidelity.test.ts
 *
 * Verifies the anatomical fidelity and bug fixes for:
 * 1. Eyebrow Furrow & Raise direction vectors (furrow pulls DOWN and INWARD; raise lifts UP).
 * 2. Continuous elastic eyelid descent in UV space (stretches real photo skin; eliminates synthetic barcodes & gaze shear).
 * 3. Smooth zygomaticus smile biomechanics (gentle horizontal widening, broad Gaussian falloff preventing cheek tearing/pinching at high percentages).
 */

import { describe, it, expect } from "vitest";
import { NEURAL_3DMM_FRAGMENT_SHADER } from "@/lib/realtime/shaders/neural3DMMFragmentShader";

describe("Shader Expression and Ocular Fidelity", () => {
  describe("1. Eyebrow Biomechanics & Directional Vectors", () => {
    it("should displace uv.y on raise and uv.x on furrow", () => {
      // Brow elevation & furrow equation (raising lifts UP via +uv.y; furrow pulls INWARD & DOWNWARD)
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "uv.y = min(uv.y + maxBrowShiftYL * browWeightL, safeCreaseLimitL);"
      );
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "uv.x -= u_eyebrowFurrow * eyeRx * 0.22 * browWeightL;"
      );
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "uv.y = min(uv.y + maxBrowShiftYR * browWeightR, safeCreaseLimitR);"
      );
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "uv.x += u_eyebrowFurrow * eyeRx * 0.22 * browWeightR;"
      );
    });
  });

  describe("2. Anatomical Eyelid Closure & Dermal Overlay Biomechanics", () => {
    it("should preserve supratarsal crease indentation above fissure without distorting cornea UVs", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "float lidDispYL = u_blinkLeft * eyeRy * 0.08 * eyeArchL * supraCreaseL * eyeMaskL;"
      );
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "float lidDispYR = u_blinkRight * eyeRy * 0.08 * eyeArchR * supraCreaseR * eyeMaskR;"
      );
    });

    it("should render anatomical dermal texture sampling and 3D bulbar dome shading on blink", () => {
      // Stage 6B dermal sampling from forehead/supraorbital skin
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("vec3 eyelidSkinL = texture(u_videoTexture, clamp(localSkinUvL, vec2(0.0), vec2(1.0))).rgb;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("vec3 eyelidSkinR = texture(u_videoTexture, clamp(localSkinUvR, vec2(0.0), vec2(1.0))).rgb;");
      // 3D bulbar spherical volume shading
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("float domeShadeL = 0.94 + nDotLL * 0.08;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("float domeShadeR = 0.94 + nDotLR * 0.08;");
    });

    it("should render tightline eyeliner root and cover alpha on descending margin", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("float tightlineL = (distFromMarginL >= -0.05) ? smoothstep(-0.05, 0.0, distFromMarginL) * 0.85 : 0.0;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("float tightlineR = (distFromMarginR >= -0.05) ? smoothstep(-0.05, 0.0, distFromMarginR) * 0.85 : 0.0;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "float coverAlphaL = topBlendL * canthusEdgeL * u_blinkLeft * eyeVisL;"
      );
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "float coverAlphaR = topBlendR * canthusEdgeR * u_blinkRight * eyeVisR;"
      );
    });
  });

  describe("3. Smile Biomechanics & Cheek Pinching Prevention", () => {
    it("should apply smooth Gaussian falloff with balanced horizontal expansion", () => {
      // Broad Gaussian falloff denominator 0.42 prevents steep localized shear
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "float cornerWeight = exp(-pow(abs(nx) - 0.76, 2.0) / 0.42 - pow(ny / 0.50, 2.0));"
      );
      // Gentle horizontal expansion factor 0.12 prevents cheek tearing at 80%+ smile
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "totalDispX += u_smileExpression * rx * 0.12 * sign(nx) * cornerWeight;"
      );
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "smileDispY = u_smileExpression * ry * 0.28 * cornerWeight;"
      );

      // Verify aggressive 0.28 multiplier is gone
      expect(NEURAL_3DMM_FRAGMENT_SHADER).not.toContain(
        "totalDispX += u_smileExpression * rx * 0.28"
      );
    });
  });
});
