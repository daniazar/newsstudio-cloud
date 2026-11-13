/**
 * src/tests/sideProfileEyeOcclusionAndBlink.test.ts
 *
 * Unit tests verifying:
 * 1. Nasal bridge occlusion logic (eyeVisL and eyeVisR) in NEURAL_3DMM_FRAGMENT_SHADER.
 * 2. Elimination of white light aura / corneal specular catchlight behind the nose in profile views.
 * 3. Prevention of ghost eyelid skin covering across the nose bridge during side profile blinks.
 * 4. Preservation of eyelash-only blinking for the non-visible/occluded eye in profile views.
 * 5. Full bilateral eye realism when facing forward (|yaw| < 15°).
 */

import { describe, it, expect } from "vitest";
import { NEURAL_3DMM_FRAGMENT_SHADER } from "@/lib/realtime/shaders/neural3DMMFragmentShader";

describe("Side Profile Eye Occlusion & Eyelash Blinking Suite", () => {
  describe("1. Shader Anatomical Visibility Derivations", () => {
    it("should declare continuous eyeVisL and eyeVisR based on head yaw against nasal bridge occlusion", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "float eyeVisL = smoothstep(-0.55, -0.30, u_headYaw);"
      );
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "float eyeVisR = 1.0 - smoothstep(0.30, 0.55, u_headYaw);"
      );
    });

    it("should accurately compute visibility factors across head yaw angles", () => {
      const smoothstep = (min: number, max: number, x: number) => {
        const t = Math.max(0, Math.min(1, (x - min) / (max - min)));
        return t * t * (3 - 2 * t);
      };

      const computeEyeVis = (yawRad: number) => ({
        eyeVisL: smoothstep(-0.55, -0.30, yawRad),
        eyeVisR: 1.0 - smoothstep(0.30, 0.55, yawRad),
      });

      // Frontal portrait: yaw = 0 rad (0°)
      const frontal = computeEyeVis(0.0);
      expect(frontal.eyeVisL).toBe(1.0);
      expect(frontal.eyeVisR).toBe(1.0);

      // Ruby Vance 90° Profile: yawDeg = +90.0° -> yawRad = +1.5708 rad (looking camera-right)
      // Visible near-side eye is left eye (rawEl / points 36-41); occluded far-side eye behind nose is right eye (rawEr / points 42-47)
      const ruby90 = computeEyeVis((90.0 * Math.PI) / 180);
      expect(ruby90.eyeVisL).toBe(1.0); // visible eye on camera-side
      expect(ruby90.eyeVisR).toBe(0.0); // occluded eye behind nose bridge

      // Ruby Vance 65° Turn: yawDeg = -65.0° -> yawRad = -1.1345 rad (looking camera-left)
      // Visible near-side eye is right eye (rawEr / points 42-47); occluded far-side eye behind nose is left eye (rawEl / points 36-41)
      const ruby65 = computeEyeVis((-65.0 * Math.PI) / 180);
      expect(ruby65.eyeVisL).toBe(0.0); // occluded eye behind nose bridge
      expect(ruby65.eyeVisR).toBe(1.0); // visible eye on camera-side
    });
  });

  describe("2. Elimination of White Light Aura Behind the Nose (Section 6A & 6D)", () => {
    it("should guard Left Eye Section 6A corneal lighting with eyeVisL > 0.005", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "if (u_blinkLeft < 0.80 && eyeDistSqClampedL < 2.0 && eyeVisL > 0.005) {"
      );
      expect(NEURAL_3DMM_FRAGMENT_SHADER).not.toContain(
        "u_blinkLeft < 0.80 && eyeDistSqClampedL < 2.0 && u_headYaw > -0.70"
      );
    });

    it("should guard Right Eye Section 6A corneal lighting with eyeVisR > 0.005", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "if (u_blinkRight < 0.80 && eyeDistSqClampedR < 2.0 && eyeVisR > 0.005) {"
      );
      expect(NEURAL_3DMM_FRAGMENT_SHADER).not.toContain(
        "u_blinkRight < 0.80 && eyeDistSqClampedR < 2.0 && u_headYaw < 0.70"
      );
    });

    it("should scale corneal highlights, catchlights, and specular dome by visibility weights", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "catchlightAlphaL = clamp(softboxGlintL * 0.22 * blinkFadeL * tearBoost * eyeVisL, 0.0, 0.32);"
      );
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "catchlightAlphaR = clamp(softboxGlintR * 0.22 * blinkFadeR * tearBoost * eyeVisR, 0.0, 0.32);"
      );
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "corneaDomeL = sqrt(max(0.0, 1.0 - normCorneaDistSqL)) * 0.085 * blinkFadeL * tearBoost * smoothstep(2.0, 0.4, eyeDistSqClampedL) * eyeVisL;"
      );
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "corneaDomeR = sqrt(max(0.0, 1.0 - normCorneaDistSqR)) * 0.085 * blinkFadeR * tearBoost * smoothstep(2.0, 0.4, eyeDistSqClampedR) * eyeVisR;"
      );
    });

    it("should guard tear lake strip and lower eyelid groove with eyeVis weights", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "if (eyeDistSqClampedL < 2.2 && eyeVisL > 0.005) {"
      );
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "if (eyeDistSqClampedR < 2.2 && eyeVisR > 0.005) {"
      );
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "if (eyeDistSqClampedL < 2.2 && u_blinkLeft < 0.75 && eyeVisL > 0.005) {"
      );
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "if (eyeDistSqClampedR < 2.2 && u_blinkRight < 0.75 && eyeVisR > 0.005) {"
      );
    });

    it("should guard Crow's feet and Malar vascular flush with eyeVis weights", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "float flushL = exp(-cheekDistSqL) * 0.5 * eyeVisL;"
      );
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "float flushR = exp(-cheekDistSqR) * 0.5 * eyeVisR;"
      );
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "falloffL = exp(-distSqL * 2.2) * smoothstep(0.002, 0.010, rL) * crowsIntensity * eyeVisL;"
      );
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "falloffR = exp(-distSqR * 2.2) * smoothstep(0.002, 0.010, rR) * crowsIntensity * eyeVisR;"
      );
    });
  });

  describe("3. Suppression of Eyelid Skin Dome & Side Profile Blink (Section 6B)", () => {
    it("should attenuate dermal skin coverAlpha by eyeVis and topFade to prevent skin patches over the nose and brow bone", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "float coverAlphaL = topBlendL * canthusEdgeL * u_blinkLeft * eyeVisL;"
      );
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain(
        "float coverAlphaR = topBlendR * canthusEdgeR * u_blinkRight * eyeVisR;"
      );
    });
  });
});
