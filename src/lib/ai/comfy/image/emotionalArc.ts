/**
 * src/lib/ai/comfy/image/emotionalArc.ts
 *
 * Task QX-12 (IMAGE_ROADMAP.md Part 20).
 * Emotional Arc System & Parameter Scheduler Engine.
 * Schedules progressive emotional arc parameter lerp across multi-shot series
 * (color temperature 6200K → 2800K, focal length 85mm → 35mm, CFG scale 6.5 → 5.0).
 */

import { comfyLog } from "../api";

export interface ShotArcStep {
  shotIndex: number;
  colorTemperatureK: number;
  focalLengthMM: number;
  cfgScale: number;
  negativeSpaceRatio: number;
}

export interface EmotionalArcSchedule {
  templateId: string;
  totalShots: number;
  schedule: ShotArcStep[];
}

/**
 * Task QX-12: Builds linearly interpolated emotional arc parameter schedule across shots.
 */
export function buildEmotionalArcSchedule(
  templateId: string = "professional_to_intimate",
  totalShots: number = 5
): EmotionalArcSchedule {
  const schedule: ShotArcStep[] = [];

  for (let i = 0; i < totalShots; i++) {
    const t = totalShots > 1 ? i / (totalShots - 1) : 0;

    schedule.push({
      shotIndex: i + 1,
      colorTemperatureK: Math.round(6200 - t * (6200 - 2800)),
      focalLengthMM: Math.round(85 - t * (85 - 35)),
      cfgScale: Number((6.5 - t * (6.5 - 5.0)).toFixed(1)),
      negativeSpaceRatio: Number((0.45 - t * (0.45 - 0.02)).toFixed(2))
    });
  }

  comfyLog(`[EmotionalArc] 🎭 Built ${totalShots}-shot emotional arc schedule for template "${templateId}" (Color Temp: 6200K -> 2800K, Focal: 85mm -> 35mm)`);

  return {
    templateId,
    totalShots,
    schedule
  };
}
