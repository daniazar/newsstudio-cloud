/**
 * src/lib/ai/comfy/image/dualFormatPrompt.ts
 *
 * Task XA-4 (IMAGE_ROADMAP.md Part 16).
 * LLM Dual-Format Prompt Generator Engine.
 * Formats prompt conditioning automatically into descriptive natural language paragraphs for FLUX stages
 * and comma-separated Booru tags for SDXL/Pony stages.
 */

import { ArchitectureType } from "./crossArchConfig";
import { comfyLog } from "../api";

export interface RawPromptSpec {
  subject: string;
  environment: string;
  lighting: string;
  tags: string[];
}

export interface DualFormatPromptResult {
  architecture: ArchitectureType;
  formattedPrompt: string;
}

/**
 * Task XA-4: Formats raw prompt specification into model architecture-appropriate prompt string.
 */
export function formatDualFormatPrompt(
  architecture: ArchitectureType,
  spec: RawPromptSpec
): DualFormatPromptResult {
  if (architecture === "FLUX") {
    const formattedPrompt = `A high quality photograph of ${spec.subject} inside ${spec.environment}. ${spec.lighting}. Shot on Canon EOS R5 with 85mm f/1.8 lens, shallow depth of field, natural photographic grain.`;
    comfyLog(`[DualFormatPrompt] 📝 Formatted FLUX Natural Language Prompt: "${formattedPrompt.substring(0, 80)}..."`);
    return { architecture, formattedPrompt };
  }

  // PONY / SDXL / ZIT / ICLIGHT
  const tagList = [spec.subject, spec.environment, spec.lighting, ...spec.tags].filter(Boolean);
  const formattedPrompt = tagList.join(", ");
  comfyLog(`[DualFormatPrompt] 🏷️ Formatted SDXL/Pony Booru Tag Prompt: "${formattedPrompt.substring(0, 80)}..."`);

  return { architecture, formattedPrompt };
}
