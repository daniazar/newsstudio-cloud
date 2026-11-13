/**
 * src/lib/ai/comfy/image/crossArchConfig.ts
 *
 * Task XA-1 (IMAGE_ROADMAP.md Part 16).
 * Cross-Architecture Multi-Model Pipeline Configuration Engine.
 * Maps each stage index (0 to 6 + Refiner) to its optimal base model architecture
 * (FLUX, SDXL, PONY, ZIT, ICLIGHT).
 */


export type ArchitectureType = "FLUX" | "PONY" | "SDXL" | "ZIT" | "ICLIGHT";

export interface StageArchSpec {
  stageIndex: number;
  stageName: string;
  architecture: ArchitectureType;
  modelName: string;
  vaeChannelCount: 4 | 16;
  requiresVaeBridge: boolean;
}

export interface CrossArchPipelineConfig {
  stages: Record<number, StageArchSpec>;
}

/**
 * Task XA-1: Resolves optimal architecture assignment for a given stage index.
 */
export function getCrossArchStageConfig(stageIndex: number): StageArchSpec {
  switch (stageIndex) {
    case 0:
      return { stageIndex: 0, stageName: "Skeleton Pre-pass", architecture: "ZIT", modelName: "z_image_turbo.safetensors", vaeChannelCount: 4, requiresVaeBridge: false };
    case 1:
      return { stageIndex: 1, stageName: "Environment", architecture: "FLUX", modelName: "flux2_dev_fp8.safetensors", vaeChannelCount: 16, requiresVaeBridge: true };
    case 2:
      return { stageIndex: 2, stageName: "Props & Staging", architecture: "ZIT", modelName: "z_image_turbo.safetensors", vaeChannelCount: 4, requiresVaeBridge: false };
    case 2.5:
      return { stageIndex: 2.5, stageName: "Background Completion", architecture: "PONY", modelName: "cyberrealisticPony_v180Coreshift_inpaint.safetensors", vaeChannelCount: 4, requiresVaeBridge: false };
    case 3:
      return { stageIndex: 3, stageName: "Primary Persona", architecture: "PONY", modelName: "cyberrealisticPony_v180Coreshift.safetensors", vaeChannelCount: 4, requiresVaeBridge: false };
    case 3.5:
      return { stageIndex: 3.5, stageName: "Contact Coherence", architecture: "PONY", modelName: "cyberrealisticPony_v180Coreshift_inpaint.safetensors", vaeChannelCount: 4, requiresVaeBridge: false };
    case 4:
      return { stageIndex: 4, stageName: "Relighting & Shadow", architecture: "ICLIGHT", modelName: "iclight_v2.safetensors", vaeChannelCount: 4, requiresVaeBridge: false };
    case 5:
      return { stageIndex: 5, stageName: "FaceDetailer Pass", architecture: "SDXL", modelName: "cyberrealisticXL_v3.safetensors", vaeChannelCount: 4, requiresVaeBridge: false };
    case 6:
      return { stageIndex: 6, stageName: "HandDetailer Pass", architecture: "SDXL", modelName: "cyberrealisticXL_v3.safetensors", vaeChannelCount: 4, requiresVaeBridge: false };
    default:
      return { stageIndex: 1, stageName: "Environment", architecture: "FLUX", modelName: "flux2_dev_fp8.safetensors", vaeChannelCount: 16, requiresVaeBridge: true };
  }
}
