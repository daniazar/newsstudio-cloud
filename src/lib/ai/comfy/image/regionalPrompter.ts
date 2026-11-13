/**
 * src/lib/ai/comfy/image/regionalPrompter.ts
 *
 * Task EV-6 (IMAGE_ROADMAP.md Part 18).
 * Regional Prompter Dual-Persona Zone Isolation Engine.
 * Injects RegionalPrompter node for dual-persona SIMULTANEOUS mode,
 * strictly gated to scenes where contactIntensityScore < 15 to prevent overlap contamination.
 */

import { comfyLog } from "../api";

export interface RegionalPrompterConfig {
  zoneAPrompt: string;
  zoneBPrompt: string;
  splitRatio: string; // e.g. "1:1"
  contactIntensityScore: number;
}

import { ComfyWorkflow } from "../types";

/**
 * Task EV-6: Injects RegionalPrompter node into ComfyUI workflow graph if contact score < 15.
 */
export function injectRegionalPrompterNode(
  workflow: ComfyWorkflow,
  config: RegionalPrompterConfig
): boolean {
  if (config.contactIntensityScore >= 15) {
    comfyLog(`[RegionalPrompter] ⚠️ Blocked Regional Prompter injection (contact intensity ${config.contactIntensityScore} >= 15 threshold)`);
    return false;
  }

  workflow["regional_prompter"] = {
    class_type: "RegionalPrompter",
    inputs: {
      prompt_left: config.zoneAPrompt,
      prompt_right: config.zoneBPrompt,
      split_ratio: config.splitRatio || "1:1"
    },
    _meta: { title: "Regional Prompter (Zone Isolation)" }
  };

  comfyLog(`[RegionalPrompter] 🗺️ Injected Regional Prompter (Zone A: "${config.zoneAPrompt}", Zone B: "${config.zoneBPrompt}")`);
  return true;
}
