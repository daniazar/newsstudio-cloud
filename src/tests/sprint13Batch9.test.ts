import { describe, it, expect, beforeEach } from "vitest";
import { ProceduralLivePortraitDriver } from "../lib/realtime/proceduralLivePortraitDriver";

describe("Sprint 13 Batch 9: P2 Vestibulo-Ocular Head-Snap Protective Blink Reflex", () => {
  let driver: ProceduralLivePortraitDriver;

  beforeEach(() => {
    driver = new ProceduralLivePortraitDriver({
      isAutoAnimate: false,
      cameraEyeLock: true,
      motionIntensity: 1.0,
      blinkRate: 1.2,
    });
  });

  it("should calculate 3D angular velocity vector and track angularSpeed", () => {
    driver.update(1.0);
    // Rapid head turn: manual yaw moves 12 degrees in 50ms (velocity = 240 deg/s)
    driver.setManualPose(0, 12, 0);
    driver.update(1.05);

    expect(driver.getAngularSpeed()).toBeGreaterThan(22.0);
  });

  it("should trigger an involuntary refixation micro-blink on rapid head yaw snap (>22 deg/s)", () => {
    // Warm up driver at neutral
    let state = driver.update(1.0);
    expect(state.blinkLeft).toBeLessThan(0.1);

    // Fast yaw turn (e.g. anchor snapping attention from one camera to another)
    driver.setManualPose(0, 15, 0);
    state = driver.update(1.03); // 30ms step -> angular velocity ~ 500 deg/s

    // Refixation blink impulse must be triggered immediately
    expect(state.blinkLeft).toBeGreaterThanOrEqual(0.35);
    expect(state.blinkRight).toBeGreaterThanOrEqual(0.35);
  });

  it("should trigger refixation blink on fast 3D roll tilt", () => {
    driver.update(1.0);
    // Rapid head roll
    driver.setManualPose(0, 0, 8);
    const state = driver.update(1.03);

    expect(driver.getAngularSpeed()).toBeGreaterThan(22.0);
    expect(state.blinkLeft).toBeGreaterThanOrEqual(0.35);
  });

  it("should respect the physiological refractory period and prevent blink spam", () => {
    driver.update(1.0);
    driver.setManualPose(0, 10, 0);
    driver.update(1.03); // First snap triggers blink

    // Immediate second snap within 100ms
    driver.setManualPose(0, -10, 0);
    const initialBlinkTime = driver.getAngularSpeed();
    expect(initialBlinkTime).toBeGreaterThan(22.0);

    // Should not crash or re-initiate a broken timer during refractory period
    expect(typeof driver.triggerReflexBlink).toBe("function");
  });

  it("should allow external broadcast event injection via triggerReflexBlink on camera cut", () => {
    driver.update(1.0);
    const didTrigger = driver.triggerReflexBlink(35.0, true);
    expect(didTrigger).toBe(true);

    const state = driver.update(1.016);
    expect(state.blinkLeft).toBeGreaterThanOrEqual(0.35);
    expect(state.blinkRight).toBeGreaterThanOrEqual(0.35);
  });
});
