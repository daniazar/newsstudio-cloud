/**
 * src/lib/ai/comfy/image/colorTempCalibrator.ts
 *
 * Task XA-7 (IMAGE_ROADMAP.md Part 16).
 * FLUX -> SDXL Color Temperature Calibration Engine.
 * Samples Stage 1 FLUX environment color temperature (K) and generates color temperature-aware
 * prompt tags for Stage 3 SDXL persona insertion to eliminate "pasted character" temperature deltas.
 */

import { comfyLog } from "../api";

export interface ColorTempCalibrationResult {
  colorTempK: number;
  promptTag: string;
  isWarmTone: boolean;
}

/**
 * Task XA-7: Calibrates skin tone prompt conditioning tags to match environment color temperature.
 */
export function calibrateColorTemperature(envColorTempK: number = 4200): ColorTempCalibrationResult {
  const isWarmTone = envColorTempK < 5000;
  const promptTag = isWarmTone
    ? "warm amber skin tone, golden rim light on skin, warm color cast"
    : "cool daylight skin tone, natural white balance, neutral color cast";

  comfyLog(`[ColorTempCalibrator] 🌡️ Calibrated environment temperature (${envColorTempK}K) -> Tag: "${promptTag}"`);

  return {
    colorTempK: envColorTempK,
    promptTag,
    isWarmTone
  };
}
