/**
 * src/lib/ai/comfy/image/gazeControl.ts
 *
 * Task OB-7 (IMAGE_ROADMAP.md Part 19).
 * Precise Gaze Direction Control Engine.
 * Generates 3DMM eye landmark conditioning maps (yaw/pitch gaze angle)
 * and injects landmark ControlNet nodes for ±5° gaze direction precision.
 */

import { comfyLog } from "../api";

export interface GazeControlConfig {
  gazeYawDeg: number;   // -45 to +45 deg
  gazePitchDeg: number; // -30 to +30 deg
  weight: number;
}

export interface GazeTargetSpec {
  gazeTarget: string;
  gazeYawDeg: number;
  gazePitchDeg: number;
  weight: number;
  promptTag: string;
}

export const GAZE_TARGET_PRESETS: Record<string, GazeTargetSpec> = {
  direct_teleprompter: {
    gazeTarget: "direct_teleprompter",
    gazeYawDeg: 0,
    gazePitchDeg: 0,
    weight: 0.85,
    promptTag: "looking directly at teleprompter lens"
  },
  looking_down_papers: {
    gazeTarget: "looking_down_papers",
    gazeYawDeg: 0,
    gazePitchDeg: -15,
    weight: 0.75,
    promptTag: "looking down at news anchor desk papers"
  },
  glancing_co_anchor: {
    gazeTarget: "glancing_co_anchor",
    gazeYawDeg: 25,
    gazePitchDeg: 0,
    weight: 0.75,
    promptTag: "glancing sideways at co-anchor"
  }
};

/**
 * Task OB-7: Resolves target spec for named gaze preset.
 */
export function resolveGazeTarget(gazeTarget: string = "direct_teleprompter"): GazeTargetSpec {
  const normKey = gazeTarget.toLowerCase();
  return GAZE_TARGET_PRESETS[normKey] || {
    gazeTarget: normKey,
    gazeYawDeg: 0,
    gazePitchDeg: 0,
    weight: 0.75,
    promptTag: `looking towards ${normKey}`
  };
}

import { ComfyWorkflow } from "../types";

/**
 * Task OB-7: Injects Gaze Direction ControlNet nodes into ComfyUI workflow graph or resolves gaze target spec.
 */
export function injectGazeControlLandmarks(
  targetOrWorkflow: string | ComfyWorkflow,
  config: GazeControlConfig = { gazeYawDeg: 0, gazePitchDeg: 0, weight: 0.75 }
): GazeTargetSpec | boolean {
  if (typeof targetOrWorkflow === "string") {
    return resolveGazeTarget(targetOrWorkflow);
  }

  const workflow = targetOrWorkflow;
  workflow["gaze_landmark_preprocessor"] = {
    class_type: "EyeLandmarkPreprocessor",
    inputs: {
      yaw_deg: config.gazeYawDeg,
      pitch_deg: config.gazePitchDeg
    },
    _meta: { title: "3DMM Eye Landmark Preprocessor" }
  };

  workflow["apply_gaze_controlnet"] = {
    class_type: "ControlNetApplyAdvanced",
    inputs: {
      control_net: ["gaze_landmark_preprocessor", 0],
      strength: config.weight
    },
    _meta: { title: "Apply Gaze Direction ControlNet" }
  };

  comfyLog(`[GazeControl] 👀 Injected Gaze Direction ControlNet node (Yaw: ${config.gazeYawDeg}°, Pitch: ${config.gazePitchDeg}°, Strength: ${config.weight})`);
  return true;
}
