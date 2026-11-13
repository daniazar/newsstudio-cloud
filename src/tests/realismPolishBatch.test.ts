import { describe, it, expect } from "vitest";

describe("Realism Polish Batch (5F, 5G, 5J)", () => {
  describe("5F: Lip Edge Velocity Motion Blur Tracking", () => {
    it("should accurately track lip velocity on explosive mouth aperture changes", () => {
      let prevJaw = 0.0;
      let prevPucker = 0.0;
      let smoothVel = 0.0;

      const stepVelocity = (newJaw: number, newPucker: number) => {
        const delta = Math.abs(newJaw - prevJaw) + Math.abs(newPucker - prevPucker);
        const instVel = delta * 3.5;
        smoothVel += (instVel - smoothVel) * 0.45;
        prevJaw = newJaw;
        prevPucker = newPucker;
        return Math.max(0.0, Math.min(1.0, smoothVel));
      };

      // Frame 1: Still face
      const vel0 = stepVelocity(0.0, 0.0);
      expect(vel0).toBe(0.0);

      // Frame 2: Plosive release (jaw drops quickly from 0.0 to 0.50)
      const vel1 = stepVelocity(0.50, 0.0);
      expect(vel1).toBeGreaterThan(0.5); // Fast attack triggered

      // Frame 3: Sustained open vowel (jaw stays at 0.50) -> velocity decays smoothly
      const vel2 = stepVelocity(0.50, 0.0);
      expect(vel2).toBeLessThan(vel1);
      expect(vel2).toBeGreaterThan(0.2); // Exponential decay, not abrupt drop
    });
  });

  describe("5G: Hair Parallax Billboard Split (2.5D Depth)", () => {
    const computeHairParallax = (
      normHx: number,
      normHy: number,
      headDistSq: number,
      headYaw: number,
      headPitch: number,
      aspect: number = 1.777
    ) => {
      if ((Math.abs(headYaw) <= 0.005 && Math.abs(headPitch) <= 0.005) || headDistSq >= 2.4) {
        return { x: 0, y: 0 };
      }

      // Smoothstep helper
      const smoothstep = (min: number, max: number, val: number) => {
        const x = Math.max(0, Math.min(1, (val - min) / (max - min)));
        return x * x * (3 - 2 * x);
      };

      const crownZone = smoothstep(0.4, -0.6, normHy);
      const peripheralZone = smoothstep(0.45, 1.1, Math.abs(normHx));
      const hairMask = Math.max(0, Math.min(1, crownZone + peripheralZone * 0.75)) * smoothstep(2.4, 0.4, headDistSq);

      return {
        x: (-Math.sin(headYaw) * 0.0085 / aspect) * hairMask,
        y: (Math.sin(headPitch) * 0.0055) * hairMask,
      };
    };

    it("should generate zero parallax offset when head is neutral", () => {
      const p = computeHairParallax(0.0, -0.5, 0.5, 0.0, 0.0);
      expect(p.x).toBe(0);
      expect(p.y).toBe(0);
    });

    it("should generate stereoscopic horizontal parallax on crown hair during head yaw", () => {
      // Crown hair at normHy = -0.6, headYaw = +0.3 rad (yaw right)
      const p = computeHairParallax(0.0, -0.6, 0.6, 0.3, 0.0);
      expect(p.x).toBeLessThan(0); // Lags opposite to head turn for depth
    });

    it("should isolate parallax strictly to hair mask and drop to zero outside head bounds", () => {
      const pOutside = computeHairParallax(0.0, -0.6, 2.5, 0.3, 0.2);
      expect(pOutside.x).toBe(0);
      expect(pOutside.y).toBe(0);
    });
  });

  describe("5J: Skin Micro-Detail Pore Parallax & Specular Relief", () => {
    it("should calculate subtle living micro-relief bounded strictly within organic skin limits", () => {
      const computeMicroGlint = (
        uvX: number,
        uvY: number,
        headYaw: number,
        headPitch: number
      ) => {
        const poreScale = 850.0;
        const pX = Math.sin(uvX * poreScale * 1.777);
        const pY = Math.cos(uvY * poreScale);
        const poreRelief = pX * pY * 0.5 + 0.5;
        const keyAngle = (headYaw * 0.85 + headPitch * 0.45);
        return Math.sin(keyAngle * Math.PI + poreRelief * Math.PI * 2) * 0.024;
      };

      const glintA = computeMicroGlint(0.5, 0.45, 0.2, 0.1);
      const glintB = computeMicroGlint(0.505, 0.455, 0.2, 0.1);

      // Micro-relief should create subtle variation
      expect(Math.abs(glintA)).toBeLessThanOrEqual(0.024);
      expect(Math.abs(glintB)).toBeLessThanOrEqual(0.024);
      // High-frequency variation between adjacent coordinates
      expect(glintA).not.toEqual(glintB);
    });
  });
});
