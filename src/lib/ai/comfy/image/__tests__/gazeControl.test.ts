import { describe, it, expect } from "vitest";
import { injectGazeControlLandmarks } from "../gazeControl";

describe("gazeControl (Task OB-7)", () => {
  it("should inject EyeLandmarkPreprocessor and ControlNet nodes into workflow graph", () => {
    const workflow: Record<string, any> = {};

    const injected = injectGazeControlLandmarks(workflow, { gazeYawDeg: 12, gazePitchDeg: -5, weight: 0.80 });

    expect(injected).toBe(true);
    expect(workflow["gaze_landmark_preprocessor"]).toBeDefined();
    expect(workflow["apply_gaze_controlnet"]).toBeDefined();
    expect(workflow["gaze_landmark_preprocessor"].inputs.yaw_deg).toBe(12);
  });
});
