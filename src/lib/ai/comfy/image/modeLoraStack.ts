/**
 * src/lib/ai/comfy/image/modeLoraStack.ts
 *
 * Task SW-3 (IMAGE_ROADMAP.md Part 17).
 * Mode-Specific LoRA Stack Builder Engine.
 * Constructs content mode-specific LoRA stacks (SFW, NSFW_SOFT, NSFW_EXPLICIT)
 * while strictly maintaining Character -> Photorealism -> Content Unlocker -> Style ordering.
 */

import { ContentMode } from "./contentMode";
import { comfyLog } from "../api";

export interface ModeLoraSpec {
  name: string;
  strength: number;
  category: "character" | "photorealism" | "unlocker" | "style";
}

/**
 * Task SW-3: Builds mode-specific LoRA stack with strict category ordering.
 */
export function buildModeLoraStack(contentMode: ContentMode, personaId: string = "ruby"): ModeLoraSpec[] {
  const stack: ModeLoraSpec[] = [];

  // 1. Character LoRA always first
  stack.push({ name: `${personaId.toLowerCase()}_char.safetensors`, strength: 0.80, category: "character" });

  // 2. Photorealism LoRA second
  stack.push({ name: "photorealism_xl.safetensors", strength: 0.60, category: "photorealism" });

  // 3. Unlocker LoRAs (if NSFW)
  if (contentMode === "NSFW_EXPLICIT") {
    stack.push({ name: "nsfw_master_pony_v2.safetensors", strength: 0.90, category: "unlocker" });
    stack.push({ name: "explicit_content_pony.safetensors", strength: 0.75, category: "style" });
  } else if (contentMode === "NSFW_SOFT") {
    stack.push({ name: "nsfw_unlocker_soft.safetensors", strength: 0.50, category: "unlocker" });
    stack.push({ name: "boudoir_style_xl.safetensors", strength: 0.40, category: "style" });
  } else {
    stack.push({ name: "editorial_style_xl.safetensors", strength: 0.45, category: "style" });
  }

  comfyLog(`[ModeLoraStack] 🥞 Built ${contentMode} LoRA stack (${stack.length} adapters, ${stack.filter(s => s.category === "unlocker").length} unlockers)`);
  return stack;
}
