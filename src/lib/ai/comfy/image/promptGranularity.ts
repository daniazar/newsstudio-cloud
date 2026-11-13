/**
 * src/lib/ai/comfy/image/promptGranularity.ts
 *
 * Task XA-9 (IMAGE_ROADMAP.md Part 16).
 * Prompt Precision Escalation & Language Granularity Engine.
 * Matches prompt token scope to what each stage is actually refining,
 * preserving token budget and focusing attention (Stage 1: Environment, Stage 3: Anatomy, Stage 5: Micro-Face).
 */

import { comfyLog } from "../api";

export interface SceneManifestSpec {
  environment: string;
  props: string;
  persona: string;
  contact: string;
  faceMicro: string;
}

/**
 * Task XA-9: Extracts stage-scoped prompt text matching stage granularity.
 */
export function getStageScopedPrompt(stageIndex: number, manifest: SceneManifestSpec): string {
  let prompt = "";

  switch (stageIndex) {
    case 1:
      prompt = manifest.environment;
      break;
    case 2:
      prompt = manifest.props;
      break;
    case 3:
      prompt = manifest.persona;
      break;
    case 3.5:
      prompt = manifest.contact;
      break;
    case 5:
    case 6:
      prompt = manifest.faceMicro;
      break;
    default:
      prompt = manifest.persona;
  }

  comfyLog(`[PromptGranularity] 🎯 Stage ${stageIndex} prompt scoped to ${prompt.length} char(s)`);
  return prompt;
}
