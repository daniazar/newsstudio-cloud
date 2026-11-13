/**
 * scripts/veo-cli/cameraMotionPresets.ts
 *
 * Broadcast-grade camera trajectory and kinematic motion presets for Google Veo.
 */

import { CameraMotionPreset } from "./types";
export type { CameraMotionPreset };

export const CAMERA_MOTION_PRESETS: Record<string, CameraMotionPreset> = {
  static_broadcast: {
    id: "static_broadcast",
    label: "🎥 Static Robotic Broadcast Camera (Zero Shake, 100% Locked)",
    description: "Tripod locked broadcast perspective. Perfect for MuseTalk 40 FPS lip-sync loops.",
    promptPhrase: "The camera is completely static and locked on a sturdy broadcast tripod. Zero camera shake, zero drift, crisp fixed focal framing.",
    speed: "static",
    category: "broadcast_desk",
  },
  dolly_in_slow: {
    id: "dolly_in_slow",
    label: "🔍 Slow 3D Dolly Push-In (Subtle Focus on Anchor)",
    description: "Smooth 3D push-in toward the anchor's chest and eyes over 2-4 seconds.",
    promptPhrase: "Smooth, continuous 3D dolly zoom pushing slowly and gracefully inward toward the presenter's face, creating subtle depth parallax.",
    speed: "subtle_slow",
    category: "cinematic_dolly",
  },
  dolly_out_reveal: {
    id: "dolly_out_reveal",
    label: "🔭 Slow Dolly Out (Environment Reveal)",
    description: "Slow pull-back revealing the news desk and LED video walls.",
    promptPhrase: "Smooth continuous dolly pull-back moving slowly outward to reveal the wide studio desk and panoramic skyline.",
    speed: "subtle_slow",
    category: "cinematic_dolly",
  },
  crane_down_desk: {
    id: "crane_down_desk",
    label: "🏗️ Studio Crane Boom Down (High-Production Intro)",
    description: "Camera sweeps downward from high angle to eye level.",
    promptPhrase: "Smooth robotic studio crane shot gently booming downward from a high studio angle to direct eye level with the anchor.",
    speed: "medium",
    category: "crane_sweep",
  },
  cam1_to_cam2_pivot: {
    id: "cam1_to_cam2_pivot",
    label: "🔄 20° Left Perspective Pivot (Cam 1 -> Cam 2)",
    description: "Smooth pan and lateral track pivoting 20 degrees to the left anchor perspective.",
    promptPhrase: "Smooth motorized robotic camera track pivoting 20 degrees to the left, capturing the anchor's three-quarter explanatory profile.",
    speed: "medium",
    category: "character_cut",
  },
  cam2_to_cam3_slash: {
    id: "cam2_to_cam3_slash",
    label: "⚡ 35° Right Dramatic Slash Pan (Cam 2 -> Cam 3 Close-Up)",
    description: "Dramatic cinematic slash move pushing into tight close-up.",
    promptPhrase: "Cinematic 35-degree right slash push-in, transitioning dynamically into a high-impact dramatic close-up with sharp rim lighting.",
    speed: "dynamic",
    category: "character_cut",
  },
  drone_flyover: {
    id: "drone_flyover",
    label: "🚁 Floating Aerial Sweep (Field & Breaking News)",
    description: "Wide forward floating camera flight over expansive environments.",
    promptPhrase: "Smooth floating airborne tracking forward at steady speed, pure unobstructed camera POV without visible drones or equipment, capturing cinematic scale and volumetric lighting.",
    speed: "dynamic",
    category: "drone_aerial",
  },
  ambient_orbit_3d: {
    id: "ambient_orbit_3d",
    label: "🌐 Subtle 3D Studio Orbit (Living Environment)",
    description: "Slow 5-degree ambient arc around the anchor desk.",
    promptPhrase: "Very subtle continuous 3D arc orbit moving gently around the presenter, maintaining focus on the anchor while studio reflections shift naturally.",
    speed: "subtle_slow",
    category: "broadcast_desk",
  },
};
