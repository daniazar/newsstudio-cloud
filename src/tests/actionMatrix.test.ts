import { describe, it, expect } from "vitest";
import { ACTION_MATRIX_GESTURES, CAMERA_CUES } from "@/lib/types";

describe("Timeline 10-Gesture Action Matrix & Camera Cues", () => {
  it("contains all canonical action state gestures", () => {
    const gestureIds = ACTION_MATRIX_GESTURES.map((g) => g.id);

    // Required canonical states
    expect(gestureIds).toContain("state_idle");
    expect(gestureIds).toContain("state_explaining");
    expect(gestureIds).toContain("state_gesture_left");
    expect(gestureIds).toContain("state_pointing_screen");
    expect(gestureIds).toContain("state_intro_welcome");
    expect(gestureIds).toContain("state_emphasis_nod");
    expect(gestureIds).toContain("state_listen_tilt");
    expect(gestureIds).toContain("state_chest_sincerity");
    expect(gestureIds).toContain("state_balancing_comparison");
    expect(gestureIds).toContain("state_breaking_alert");

    // Has at least 10 distinct gestures
    expect(ACTION_MATRIX_GESTURES.length).toBeGreaterThanOrEqual(10);

    // Each gesture has complete metadata
    for (const g of ACTION_MATRIX_GESTURES) {
      expect(g.label).toBeTruthy();
      expect(g.icon).toBeTruthy();
      expect(g.desc).toBeTruthy();
      expect(g.category).toBeTruthy();
    }
  });

  it("contains all 3-Camera Broadcast Array cue configurations", () => {
    const cueIds = CAMERA_CUES.map((c) => c.id);

    expect(cueIds).toContain("cam1_wide");
    expect(cueIds).toContain("cam2_left");
    expect(cueIds).toContain("cam3_closeup");

    const cam1 = CAMERA_CUES.find((c) => c.id === "cam1_wide")!;
    expect(cam1.angle).toContain("0°");
    expect(cam1.lens).toContain("35mm");

    const cam2 = CAMERA_CUES.find((c) => c.id === "cam2_left")!;
    expect(cam2.angle).toContain("20°");
    expect(cam2.lens).toContain("50mm");

    const cam3 = CAMERA_CUES.find((c) => c.id === "cam3_closeup")!;
    expect(cam3.angle).toContain("35°");
    expect(cam3.lens).toContain("85mm");
  });
});
