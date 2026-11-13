import { describe, it, expect } from "vitest";
import {
  ProceduralLivePortraitDriver,
  IDLE_PRESETS,
  IdlePresetType,
} from "../lib/realtime/proceduralLivePortraitDriver";

describe("Autonomous Movement Presets & Dynamic Auto-Rotation", () => {
  it("should export a comprehensive catalog of 10 distinct movement presets", () => {
    expect(IDLE_PRESETS.length).toBe(10);
    const ids = IDLE_PRESETS.map((p) => p.id);
    expect(ids).toContain("dynamic_flow");
    expect(ids).toContain("intense_anchor");
    expect(ids).toContain("deep_analyst");
    expect(ids).toContain("attentive_listener");
    expect(ids).toContain("look_down_notes");
    expect(ids).toContain("breaking_urgent");
    expect(ids).toContain("warm_welcoming");
    expect(ids).toContain("skeptical_interviewer");
    expect(ids).toContain("roundtable_dialogue");
    expect(ids).toContain("relaxed_sway");

    // All presets should have icons, labels, and informative descriptions
    IDLE_PRESETS.forEach((preset) => {
      expect(preset.icon.length).toBeGreaterThan(0);
      expect(preset.label.length).toBeGreaterThan(0);
      expect(preset.description.length).toBeGreaterThan(15);
    });
  });

  it("should default to dynamic_flow auto-rotation", () => {
    const driver = new ProceduralLivePortraitDriver();
    // Default active rotating preset at t=0 should be intense_anchor
    const initialPose = driver.update(0.01);
    expect(initialPose).toBeDefined();
    expect(driver.getActivePreset()).toBe("intense_anchor");
  });

  it("should smoothly rotate across different movement presets over time in dynamic_flow mode", () => {
    const driver = new ProceduralLivePortraitDriver();

    // At t = 1.0s (first cycle: intense_anchor)
    driver.update(1.0);
    expect(driver.getActivePreset()).toBe("intense_anchor");

    // At t = 11.0s (second cycle: deep_analyst)
    driver.update(11.0);
    expect(driver.getActivePreset()).toBe("deep_analyst");

    // At t = 21.0s (third cycle: warm_welcoming)
    driver.update(21.0);
    expect(driver.getActivePreset()).toBe("warm_welcoming");

    // At t = 31.0s (fourth cycle: look_down_notes)
    driver.update(31.0);
    expect(driver.getActivePreset()).toBe("look_down_notes");
  });

  it("should produce continuous, bounded values without NaN during cross-fade transitions", () => {
    const driver = new ProceduralLivePortraitDriver();

    // Step across a transition window (between 8.0s and 12.0s where intense_anchor transitions to deep_analyst)
    for (let t = 8.0; t <= 12.0; t += 0.05) {
      const pose = driver.update(t);
      expect(Number.isNaN(pose.pitchDeg)).toBe(false);
      expect(Number.isNaN(pose.yawDeg)).toBe(false);
      expect(Number.isNaN(pose.rollDeg)).toBe(false);
      expect(Number.isNaN(pose.gazeX)).toBe(false);
      expect(Number.isNaN(pose.gazeY)).toBe(false);
      expect(Number.isNaN(pose.smileAmount)).toBe(false);

      // Verify bounded kinematics
      expect(Math.abs(pose.pitchDeg)).toBeLessThan(25);
      expect(Math.abs(pose.yawDeg)).toBeLessThan(25);
      expect(Math.abs(pose.rollDeg)).toBeLessThan(25);
    }
  });

  it("should allow locking to a specific preset without auto-rotation", () => {
    const driver = new ProceduralLivePortraitDriver();
    driver.setConfig({ idlePreset: "breaking_urgent" });

    expect(driver.getActivePreset()).toBe("breaking_urgent");

    // Even at t = 50s, it remains locked to breaking_urgent
    const pose = driver.update(50.0);
    expect(driver.getActivePreset()).toBe("breaking_urgent");
    expect(pose.eyeWidening).toBeGreaterThanOrEqual(1.0);
  });
});
