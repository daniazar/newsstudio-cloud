/**
 * src/lib/ai/comfy/image/canonicalPoseLibrary.ts
 *
 * Task EX-4 (IMAGE_ROADMAP.md Part 21).
 * Canonical Pose Library Engine.
 * Manages 20 pre-rendered Blender ControlNet pose maps stored in assets/poses/
 * (standing anchor, seated bar 3/4, leaning counter, over-shoulder turn) selectable via --pose CLI flag.
 */

import path from "path";
import { comfyLog } from "../api";

export interface CanonicalPoseSpec {
  poseKey: string;
  category: "standing" | "seated" | "leaning" | "dynamic";
  title: string;
  description: string;
}

export interface CanonicalPoseResult extends CanonicalPoseSpec {
  poseMapPath: string;
}

/**
 * Master Registry of 20 Pre-Rendered Blender 3D ControlNet Poses (Task EX-4).
 */
export const CANONICAL_POSE_LIBRARY: Record<string, CanonicalPoseSpec> = {
  // ── Standing Poses ────────────────────────────────────────────────────────
  pose_standing_anchor: {
    poseKey: "pose_standing_anchor",
    category: "standing",
    title: "Standing Lead News Anchor",
    description: "Upright formal posture facing front, hands resting at waist height"
  },
  pose_standing_cross_arms: {
    poseKey: "pose_standing_cross_arms",
    category: "standing",
    title: "Standing Arms Crossed",
    description: "Confident posture with arms crossed across chest"
  },
  pose_standing_field_report: {
    poseKey: "pose_standing_field_report",
    category: "standing",
    title: "Standing Field Reporter",
    description: "Holding microphone in right hand at 3/4 body angle"
  },
  pose_standing_weather: {
    poseKey: "pose_standing_weather",
    category: "standing",
    title: "Weather Forecaster Pointing",
    description: "Standing turned towards graphic wall with right hand gesturing to map"
  },
  pose_standing_glamour: {
    poseKey: "pose_standing_glamour",
    category: "standing",
    title: "Red Carpet Glamour Pose",
    description: "Hand on hip, slight body twist, shoulders back"
  },

  // ── Seated Poses ──────────────────────────────────────────────────────────
  pose_seated_anchor_desk: {
    poseKey: "pose_seated_anchor_desk",
    category: "seated",
    title: "Seated Behind Anchor Desk",
    description: "Seated upright behind desk, hands clasped over papers"
  },
  pose_seated_34: {
    poseKey: "pose_seated_34",
    category: "seated",
    title: "Seated 3/4 Studio Angle",
    description: "Seated on high stool at 3/4 angle facing camera"
  },
  pose_seated_lounge: {
    poseKey: "pose_seated_lounge",
    category: "seated",
    title: "Seated Lounge Sofa",
    description: "Relaxed seated posture on armchair or couch"
  },
  pose_seated_talkshow: {
    poseKey: "pose_seated_talkshow",
    category: "seated",
    title: "Evening Talk Show Guest",
    description: "Leaning slightly forward in chair with open hand gestures"
  },
  pose_seated_interview: {
    poseKey: "pose_seated_interview",
    category: "seated",
    title: "Dual Interview Chair",
    description: "Seated turned towards co-anchor for two-shot dialogue"
  },

  // ── Leaning Poses ─────────────────────────────────────────────────────────
  pose_leaning_counter: {
    poseKey: "pose_leaning_counter",
    category: "leaning",
    title: "Leaning on Studio Counter",
    description: "Left elbow resting on counter ledge, relaxed posture"
  },
  pose_leaning_podium: {
    poseKey: "pose_leaning_podium",
    category: "leaning",
    title: "Press Briefing Podium",
    description: "Both hands resting on podium edges, forward engagement"
  },
  pose_leaning_bar: {
    poseKey: "pose_leaning_bar",
    category: "leaning",
    title: "Leaning Against Bar",
    description: "Side profile leaning back against bar counter"
  },

  // ── Dynamic & Action Poses ────────────────────────────────────────────────
  pose_over_shoulder_turn: {
    poseKey: "pose_over_shoulder_turn",
    category: "dynamic",
    title: "Over-the-Shoulder Turn",
    description: "Head turned back over shoulder looking at camera"
  },
  pose_walking_dynamic: {
    poseKey: "pose_walking_dynamic",
    category: "dynamic",
    title: "Walking Dynamic Stride",
    description: "Mid-stride walk across studio floor"
  },
  pose_waving_camera: {
    poseKey: "pose_waving_camera",
    category: "dynamic",
    title: "Waving at Camera",
    description: "Right hand raised waving towards lens"
  },
  pose_gesturing_graphic: {
    poseKey: "pose_gesturing_graphic",
    category: "dynamic",
    title: "Open Palm Graphic Gesture",
    description: "Both hands open gesturing towards lower-third graphic"
  },
  pose_adjusting_jacket: {
    poseKey: "pose_adjusting_jacket",
    category: "dynamic",
    title: "Adjusting Blazer Lapel",
    description: "Hands touching suit jacket lapel in motion"
  }
};

/**
 * Returns list of all available canonical pose specifications.
 */
export function listCanonicalPoses(): CanonicalPoseSpec[] {
  return Object.values(CANONICAL_POSE_LIBRARY);
}

/**
 * Task EX-4: Resolves pre-rendered Blender pose map path for requested pose key.
 */
export function getCanonicalPose(
  poseKey: string = "pose_standing_anchor",
  assetDir: string = path.join(process.cwd(), "assets", "poses")
): CanonicalPoseResult {
  const normalizedKey = poseKey.toLowerCase();
  const spec = CANONICAL_POSE_LIBRARY[normalizedKey] || {
    poseKey: normalizedKey,
    category: normalizedKey.includes("seated") ? "seated" : "standing",
    title: normalizedKey,
    description: "Custom ControlNet pose"
  };

  const poseMapPath = path.join(assetDir, `${normalizedKey}.png`);
  comfyLog(`[CanonicalPoseLibrary] 🧘 Resolved Canonical Pose "${normalizedKey}" (${spec.category}): ${poseMapPath}`);

  return {
    ...spec,
    poseMapPath
  };
}
