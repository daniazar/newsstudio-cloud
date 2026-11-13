/**
 * scripts/gemini-cli/cameraPresets.ts
 *
 * 3-Camera Broadcast Array & Framing Presets.
 */

import { CameraPreset } from "./types";

export const CAMERA_ARRAY_PRESETS: Record<string, CameraPreset> = {
  cam1_center_wide: {
    id: "cam1_center_wide",
    label: "📹 Camera 1: 0° Dead Center Wide / Medium (Establishing anchor intro)",
    cameraAngle: "Camera 1 (dead center 0-degree angle, 4-5 meters back)",
    lens: "35mm broadcast studio camera",
    framing: "Mid-thigh to head framing showing full desk width and open panoramic twilight skyline",
    defaultPose: "Seated upright in executive chair behind curved glass desk, hands clasped neatly on center of desk, calm authoritative direct delivery into lens",
  },
  cam2_left_tight: {
    id: "cam2_left_tight",
    label: "📹 Camera 2: 20° Left Angle Tight Medium (Explanatory rundown delivery)",
    cameraAngle: "Camera 2 (positioned 20-degrees to the left of the anchor desk, 3 meters back)",
    lens: "50mm broadcast camera with realistic parallax depth",
    framing: "Waist-up framing from a distinct 20-degree left perspective angle, angled glass desk surface and laptop visible in lower foreground",
    defaultPose: "Head and upper torso turned smoothly toward Camera 2 with natural three-dimensional parallax depth to shoulders and collarbones, right hand active near open laptop keyboard / explanatory palm gesture, left hand resting on glass desk",
  },
  cam3_right_closeup: {
    id: "cam3_right_closeup",
    label: "📹 Camera 3: 35° Right Slash Close-Up (Breaking news punchline — hands below frame)",
    cameraAngle: "Camera 3 (positioned 35-degrees to the right of the anchor desk, 2 meters back, telephoto 85mm lens)",
    lens: "85mm f/1.4 prime telephoto lens with shallow depth of field cinematic bokeh",
    framing: "True tight chest-up close-up framing (hands and arms are completely below the bottom frame edge on the lap/desk, strictly not visible in frame)",
    defaultPose: "Head and chest turned toward Camera 3 with dramatic 35-degree right slash perspective, dimensional profile lighting and golden rim lighting on hair, intense authoritative breaking-news punchline delivery with direct gaze and lips parted speaking, hands and arms resting completely below the frame",
  },
  standup_videowall: {
    id: "standup_videowall",
    label: "🧍 Stand-Up: Mega Video Wall Presentation (Interactive chart gesture)",
    cameraAngle: "Camera 4 (Video wall standup zone, 3.5 meters back)",
    lens: "50mm flat broadcast lens",
    framing: "Three-quarter standing body framing beside 8K video screen",
    defaultPose: "Standing in confident presenter stance, right hand gesturing toward financial trend lines on screen, warm engaging smile",
  },
  seated_lounge_interview: {
    id: "seated_lounge_interview",
    label: "🛋️ Lounge: Interview Armchair Discussion (Guest interview format)",
    cameraAngle: "Camera 5 (Interview lounge zone, 3 meters back)",
    lens: "50mm lens",
    framing: "Seated comfortably in charcoal leather club armchair, brass coffee table in foreground, walnut wood slats behind",
    defaultPose: "Relaxed conversational posture, open welcoming hand delivery, head tilted engaged in dialogue",
  },
  widescreen_standing_chroma_knee_up: {
    id: "widescreen_standing_chroma_knee_up",
    label: "🧍 Widescreen Standing Chroma: Knee-Up Framing (Option A broadcast standard)",
    cameraAngle: "Camera positioned dead-center at mid-torso level, 3.5 meters back",
    lens: "50mm prime broadcast studio lens",
    framing: "Three-quarters medium-long shot framing strictly from just above the knees to top of head, horizontally centered with generous lateral breathing room and wide margins on left and right borders against solid chroma green cyclorama wall (#00FF00)",
    defaultPose: "Standing upright with poise, hands comfortably positioned, direct gaze into camera lens, strictly closed lips, all arm and hand gestures safely centered within the frame with zero edge clipping",
  },
};
