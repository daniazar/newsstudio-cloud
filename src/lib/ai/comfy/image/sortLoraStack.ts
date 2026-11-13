/**
 * src/lib/ai/comfy/image/sortLoraStack.ts
 *
 * Task EX-3 (IMAGE_ROADMAP.md Part 14).
 * LoRA Stack Order Optimization Engine.
 * Sorts active LoRA adapters into strict priority order:
 * 1. Character Identity -> 2. Photorealism/Skin -> 3. Style/Aesthetic -> 4. Content Unlocker.
 */

import { comfyLog } from "../api";
import { LoraConfig } from "./loraManager";
import { classifyLoraCategory } from "./loraScheduler";

export function getLoraCategoryPriority(category: string): number {
  switch (category) {
    case "character":
      return 1; // First
    case "photorealism":
      return 2;
    case "style":
      return 3;
    default:
      return 4; // Last
  }
}

/**
 * Task EX-3: Sorts LoRA stack into optimal fusion order regardless of user input order.
 */
export function sortLoraStack(loras: LoraConfig[]): LoraConfig[] {
  if (!loras || loras.length <= 1) return loras || [];

  const sorted = [...loras].sort((a, b) => {
    const prioA = getLoraCategoryPriority(classifyLoraCategory(a.name));
    const prioB = getLoraCategoryPriority(classifyLoraCategory(b.name));
    return prioA - prioB;
  });

  comfyLog(`[SortLoraStack] 🔀 Sorted ${loras.length} LoRA(s) into optimal order (Character -> Photorealism -> Style)`);
  return sorted;
}
