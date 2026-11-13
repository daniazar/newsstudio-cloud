import { describe, it, expect } from "vitest";
import { NEURAL_3DMM_FRAGMENT_SHADER } from "../lib/realtime/neural3DMMShader";

describe("Sprint 13 Batch 5: Unified Cranial Hair Roll & Decoupled Torso Rotation with Hand Pinning", () => {
  describe("Shader Integration & Uniform Declarations", () => {
    it("should declare u_bodyRoll uniform in the fragment shader", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("uniform float u_bodyRoll;");
    });

    it("should implement Stage 0 decoupled torso tilt with pelvis pivot protection", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("vec2 pelvisPivot = vec2(sCenter.x, sCenter.y + sRadius.y * 0.58);");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("Zone 1: Above Pelvis (Torso, Ribcage, Shoulders)");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("spineAngle = u_bodyRoll * torsoWeight * upperWeight;");
    });

    it("should implement Stage 1 volumetric cranial & hair roll with full hair synchrony", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("1. VOLUMETRIC CRANIAL & HAIR ROLL (2D HEAD TILT WITH FULL HAIR SYNCHRONY)");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("float hRx = max(0.001, u_headRadius.x * u_aspectRatio * 1.95);");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("float chestTaper = smoothstep(u_headCenter.y + u_headRadius.y * 2.20, u_headCenter.y + u_headRadius.y * 0.75, uv.y);");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("float rollAtten = smoothstep(2.5, 0.15, hairDistSq) * chestTaper;");
    });
  });

  describe("Anatomical Hand & Waist Pinning Math (Zero Thumb Tearing)", () => {
    const smoothstep = (edge0: number, edge1: number, x: number) => {
      const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
      return t * t * (3 - 2 * t);
    };

    const computeTorsoTiltWeight = (
      uvY: number,
      bodyDistSq: number,
      chinY: number = 0.416,
      sCenterY: number = 0.54,
      sRadiusY: number = 0.36
    ) => {
      const bodyFloor = sCenterY + sRadiusY * 1.55;
      const waistFloor = sCenterY + sRadiusY * 0.65; // ~0.774
      const waistCeil = sCenterY + sRadiusY * 0.85;  // ~0.846

      if (uvY <= chinY || uvY >= bodyFloor || bodyDistSq >= 3.6) {
        return 0.0;
      }

      const bodyWeight = smoothstep(3.6, 0.15, bodyDistSq);
      const collarBlend = smoothstep(chinY, chinY + 0.08, uvY);
      const effectiveWeight = bodyWeight * collarBlend;
      const waistDecay = smoothstep(waistCeil, waistFloor, uvY);

      return effectiveWeight * waistDecay;
    };

    it("should allow active rotation on shoulders, clavicles, and bust", () => {
      // Clavicle / shoulder region (y ~ 0.58)
      const shoulderWeight = computeTorsoTiltWeight(0.58, 0.5);
      expect(shoulderWeight).toBeGreaterThan(0.75);

      // Mid-chest / bust region (y ~ 0.66)
      const bustWeight = computeTorsoTiltWeight(0.66, 0.6);
      expect(bustWeight).toBeGreaterThan(0.70);
    });

    it("should guarantee EXACTLY 0.0 rotation on resting hands, thumbs, and lower hips (y >= 0.85)", () => {
      // Resting hand on hip (y in 0.85 - 0.95)
      expect(computeTorsoTiltWeight(0.85, 0.8)).toBe(0.0);
      expect(computeTorsoTiltWeight(0.88, 1.2)).toBe(0.0);
      expect(computeTorsoTiltWeight(0.92, 1.5)).toBe(0.0);
    });
  });

  describe("Cranial & Hair Envelope Roll Math (Unified Head-Hair Motion)", () => {
    const smoothstep = (edge0: number, edge1: number, x: number) => {
      const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
      return t * t * (3 - 2 * t);
    };

    const computeHairRollAtten = (
      uvX: number,
      uvY: number,
      headCx: number = 0.50,
      headCy: number = 0.20,
      headRx: number = 0.17,
      headRy: number = 0.24,
      aspect: number = 544 / 960
    ) => {
      const dHairX = (uvX - headCx) * aspect;
      const dHairY = uvY - headCy;

      const hRx = headRx * aspect * 1.95;
      const hRy = headRy * (uvY < headCy ? 1.55 : 2.20);

      const normHx = dHairX / hRx;
      const normHy = dHairY / hRy;
      const hairDistSq = normHx * normHx + normHy * normHy;

      const chestTaper = smoothstep(headCy + headRy * 2.20, headCy + headRy * 0.75, uvY);
      return smoothstep(2.5, 0.15, hairDistSq) * chestTaper;
    };

    it("should rotate the facial core 1:1 with head roll", () => {
      const faceAtten = computeHairRollAtten(0.50, 0.20);
      expect(faceAtten).toBeCloseTo(1.0, 1);
    });

    it("should synchronously rotate lateral flowing hair locks with the head", () => {
      // Hair 1.4x head radius to the left
      const hairLeftAtten = computeHairRollAtten(0.50 - 0.17 * 1.4, 0.25);
      expect(hairLeftAtten).toBeGreaterThan(0.60);

      // Hair 1.4x head radius to the right
      const hairRightAtten = computeHairRollAtten(0.50 + 0.17 * 1.4, 0.25);
      expect(hairRightAtten).toBeGreaterThan(0.60);
    });

    it("should synchronously rotate the hair crown above the forehead", () => {
      // Hair crown at y = 0.08 (well above forehead)
      const crownAtten = computeHairRollAtten(0.50, 0.08);
      expect(crownAtten).toBeGreaterThan(0.80);
    });

    it("should smoothly decouple hair tips at the bust line", () => {
      // Lower tips on bust (y = 0.75)
      const lowerTipsAtten = computeHairRollAtten(0.50, 0.75);
      expect(lowerTipsAtten).toBe(0.0);
    });
  });
});
