/**
 * src/lib/ai/comfy/image/detailDaemon.ts
 *
 * Task EV-7 (IMAGE_ROADMAP.md Part 18).
 * Detail Daemon High-Frequency Texture Injector Engine.
 * Injects high-frequency texture detail (hair strands, fabric weave, skin micro-pores)
 * into Stage 3 and Stage 5 latent sampling passes with ~0ms GPU cost.
 */

import { comfyLog } from "../api";

export interface DetailDaemonConfig {
  strength: number;
  startStep: number;
  endStep: number;
}

import { ComfyWorkflow } from "../types";

/**
 * Task EV-7: Injects DetailDaemon node into ComfyUI workflow graph for Stage 3 & Stage 5.
 */
export function injectDetailDaemonNode(
  workflow: ComfyWorkflow,
  stageIndex: number,
  config: DetailDaemonConfig = { strength: 0.30, startStep: 14, endStep: 26 }
): boolean {
  if (stageIndex !== 3 && stageIndex !== 5) {
    return false;
  }

  workflow[`detail_daemon_stage_${stageIndex}`] = {
    class_type: "DetailDaemon",
    inputs: {
      strength: config.strength,
      start_step: config.startStep,
      end_step: config.endStep
    },
    _meta: { title: `Detail Daemon Texture Injector (Stage ${stageIndex})` }
  };

  comfyLog(`[DetailDaemon] ✨ Injected Detail Daemon texture node for Stage ${stageIndex} (Strength: ${config.strength})`);
  return true;
}
