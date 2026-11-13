/**
 * src/lib/ai/comfy/image/paletteLocker.ts
 *
 * Task PR-8 (IMAGE_ROADMAP.md Part 13).
 * Color Palette Locking & Ambient Temperature Tag Injection.
 * Maps dominant color clusters to SDXL prompt color tags to harmonize
 * persona lighting with environment reference images.
 */

import { comfyLog } from "../api";

export interface ColorPaletteMapResult {
  hexColors: string[];
  colorTags: string[];
  injectedStage1Prompt: string;
  injectedStage4Prompt: string;
}

export function hexToSDXLColorTag(hex: string): string {
  const cleanHex = hex.replace("#", "").toLowerCase();
  const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
  const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
  const b = parseInt(cleanHex.substring(4, 6), 16) || 0;

  if (r > 200 && g > 150 && b < 100) return "(warm amber lighting:1.3)";
  if (r > 150 && g < 100 && b < 100) return "(warm crimson red tones:1.2)";
  if (r < 100 && g > 180 && b > 180) return "(cyan neon lighting:1.2)";
  if (r < 100 && g < 100 && b > 180) return "(deep blue ambient illumination:1.2)";
  if (r > 100 && g > 50 && b < 50) return "(mahogany wood tones:1.2)";
  if (r < 60 && g < 60 && b < 60) return "(dark ambient shadows:1.1)";
  return "(warm studio ambient lighting:1.1)";
}

/**
 * Task PR-8: Extracts dominant hex colors and generates stage-scoped color tags for Stage 1 & Stage 4.
 */
export function injectColorPaletteLock(
  hexColors: string[],
  stage1Prompt: string,
  stage4Prompt: string
): ColorPaletteMapResult {
  const colorTags = Array.from(new Set(hexColors.map(hexToSDXLColorTag)));
  const tagString = colorTags.join(", ");

  const injectedStage1Prompt = [stage1Prompt, tagString].filter(Boolean).join(", ");
  const injectedStage4Prompt = [stage4Prompt, tagString].filter(Boolean).join(", ");

  comfyLog(`[PaletteLocker] 🎨 Injected ${colorTags.length} palette color tag(s) into Stage 1 & Stage 4 prompts: ${tagString}`);

  return {
    hexColors,
    colorTags,
    injectedStage1Prompt,
    injectedStage4Prompt
  };
}
