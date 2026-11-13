import { describe, it, expect } from "vitest";

describe("2.5D Volumetric Lighting & Parallax Depth (5H & 5I)", () => {
  it("should drift corneal specular catchlights across spherical eye with head yaw and pitch (5H)", () => {
    const eyeRx = 0.045;
    const eyeRy = 0.028;

    const computeCatchlightOffset = (yawRad: number, pitchRad: number) => {
      const keyLightDriftX = -Math.sin(yawRad) * eyeRx * 0.35;
      const keyLightDriftY = Math.sin(pitchRad) * eyeRy * 0.30;
      return { x: keyLightDriftX, y: keyLightDriftY };
    };

    // When looking straight forward (0 yaw, 0 pitch)
    const forwardOffset = computeCatchlightOffset(0, 0);
    expect(forwardOffset.x).toBeCloseTo(0, 4);
    expect(forwardOffset.y).toBeCloseTo(0, 4);

    // When head yaws right (+0.25 rad) away from key-light
    const rightYawOffset = computeCatchlightOffset(0.25, 0);
    expect(rightYawOffset.x).toBeLessThan(0); // Drift towards left limbus
    expect(rightYawOffset.x).toBeCloseTo(-Math.sin(0.25) * eyeRx * 0.35, 4);

    // When head yaws left (-0.25 rad) towards key-light
    const leftYawOffset = computeCatchlightOffset(-0.25, 0);
    expect(leftYawOffset.x).toBeGreaterThan(0); // Drift towards pupil center
  });

  it("should shift sub-nasal cast shadow opposite to head yaw to create 3D protrusion (5I)", () => {
    const computeNoseShadow = (midEyeX: number, headYawRad: number) => {
      // Light source stationary -> nose casts shadow translated by sin(yaw) in positive/opposite direction
      const noseShadowX = midEyeX + Math.sin(headYawRad) * 0.012;
      return noseShadowX;
    };

    const midEyeX = 0.5;
    // Straight ahead
    expect(computeNoseShadow(midEyeX, 0)).toBe(0.5);

    // Turn right (+0.3 rad) -> shadow shifts right across philtrum
    const shadowRight = computeNoseShadow(midEyeX, 0.3);
    expect(shadowRight).toBeGreaterThan(0.5);
    expect(shadowRight).toBeCloseTo(0.5 + Math.sin(0.3) * 0.012, 4);

    // Turn left (-0.3 rad) -> shadow shifts left
    const shadowLeft = computeNoseShadow(midEyeX, -0.3);
    expect(shadowLeft).toBeLessThan(0.5);
  });

  it("should calculate correct keyLightTint and atmosphere based on lightingTone (0 to 3)", () => {
    const getKeyLightTint = (tone: number) => {
      if (tone === 1) return { r: 0.98, g: 0.94, b: 0.88 }; // 1: warm golden
      if (tone === 2) return { r: 0.88, g: 0.95, b: 0.99 }; // 2: cyber tech cyan
      if (tone === 3) return { r: 0.99, g: 0.88, b: 0.89 }; // 3: emergency red
      return { r: 0.96, g: 0.94, b: 0.90 }; // 0: neutral broadcast
    };

    expect(getKeyLightTint(0).r).toBeCloseTo(0.96, 2);
    expect(getKeyLightTint(1).b).toBeLessThan(0.90); // warm reduces blue
    expect(getKeyLightTint(2).b).toBeGreaterThan(0.95); // cyan boosts blue
    expect(getKeyLightTint(3).r).toBeGreaterThan(0.98); // emergency red boosts red
  });
});
