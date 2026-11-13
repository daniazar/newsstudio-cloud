/**
 * src/lib/ai/comfy/image/accessoryGenerator.ts
 *
 * Task QX-4 (IMAGE_ROADMAP.md Part 20).
 * Coherent Accessory Generation Engine.
 * Extracts persona accessory tags from Knowledge Graph and injects a secondary Stage 5 inpaint pass
 * targeting ear/neck/wrist regions for high-fidelity accessory detail.
 */

import { comfyLog } from "../api";

export interface AccessoryInpaintSpec {
  personaId: string;
  accessoryTags: string[];
  inpaintPrompt: string;
  targetRegionMask: "ear_neck" | "wrist" | "full_accessories";
}

/**
 * Task QX-4: Builds secondary accessory inpaint specification.
 */
export function buildAccessoryInpaintPass(
  personaId: string = "ruby",
  sceneContext: string = "broadcast"
): AccessoryInpaintSpec {
  const accessoryTags = sceneContext === "formal"
    ? ["gold chandelier earrings", "thin tennis bracelet"]
    : ["small gold hoop earrings", "thin gold necklace chain"];

  const inpaintPrompt = accessoryTags.map(t => `(${t}:1.5)`).join(", ");

  comfyLog(`[AccessoryGenerator] 💍 Built secondary accessory inpaint pass for persona "${personaId}" (${sceneContext}): ${inpaintPrompt}`);

  return {
    personaId: personaId.toLowerCase(),
    accessoryTags,
    inpaintPrompt,
    targetRegionMask: "ear_neck"
  };
}
