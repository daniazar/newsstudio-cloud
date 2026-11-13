/**
 * src/lib/ai/comfy/image/modelClassifier.ts
 *
 * Helper logic for identifying image generation model architectures
 * (SDXL, FLUX.1, Lumina-2 / Z-Image Turbo / Klein / Moody / Catalyst) and resolving
 * default workflow templates and sampler parameters.
 */

import fs from "fs";
import path from "path";
import { comfyLog } from "../api";

export interface ModelArchitectureInfo {
  unetName: string;
  isMoody: boolean;
  isKlein: boolean;
  isFlux1: boolean;
  isSdxl: boolean;
  isPony: boolean;
  isTurbo: boolean;
  isTensorRT: boolean;
  steps: number;
  workflowName: string;
  workflowPath: string;
}

/**
 * Resolves absolute path to a ComfyUI workflow JSON template.
 */
export function getImageWorkflowPath(baseName: string, suffix: string = ""): string {
  const nameWithSuffix = baseName.replace(".json", `${suffix}.json`);
  let fullPath = path.join(process.cwd(), "comfy_workflows", "image", nameWithSuffix);

  if (!fs.existsSync(fullPath) && suffix) {
    fullPath = path.join(process.cwd(), "comfy_workflows", "image", baseName);
  }

  return fullPath;
}

/**
 * Classifies an image generation model by its filename and computes architecture metadata.
 */
export function classifyImageModel(
  unetNameOverride?: string,
  isMulti: boolean = false
): ModelArchitectureInfo {
  const unetName = unetNameOverride || "z_image_turbo_bf16.safetensors";
  const unetLower = unetName.toLowerCase();

  const isKlein = unetLower.includes("z_image") || 
                  unetLower.includes("catalyst") || 
                  unetLower.includes("krea") || 
                  unetLower.includes("pornmaster") ||
                  unetLower.includes("lumina");

  const isFlux1 = unetLower.includes("flux1") || 
                  unetLower.includes("flux-4-play") ||
                  unetLower.includes("redcraft") ||
                  unetLower.includes("miraclein");

  const isSdxl = (
    unetLower.includes("sd_xl") || 
    unetLower.includes("sdxl") ||
    unetLower.includes("pony") ||
    unetLower.includes("ponydiffusion") ||
    unetLower.includes("iniverse") ||
    unetLower.includes("cyberrealisticpony") ||
    unetLower.includes("cyberrealisticxl") ||
    unetLower.includes("realvis") ||
    unetLower.includes("juggernaut") ||
    unetLower.includes("realxl") ||
    unetLower.includes("moody") ||
    unetLower.includes("desire")
  ) && !isKlein;

  const isMoody = (unetLower.includes("moody") || unetLower.includes("desire")) && isSdxl;

  comfyLog(`[ComfyClient] Model Classifier: unetName="${unetName}", isKlein=${isKlein}, isFlux1=${isFlux1}, isSdxl=${isSdxl}, isMoody=${isMoody}, isMulti=${isMulti}`);

  // Determine starting workflow template:
  // PuLID is strictly designed for FLUX.1 / FLUX.2 models.
  // Lumina-2 / Klein (z_image, moody, catalyst) and SDXL models must use flux2_img2img_api.json or sdxl_img2img_api.json.
  let workflowName = "flux2_pulid_api.json";
  if (isSdxl) {
    workflowName = fs.existsSync(getImageWorkflowPath("sdxl_img2img_api.json")) 
      ? "sdxl_img2img_api.json" 
      : "image_to_image_api.json";
  } else if (isKlein) {
    workflowName = fs.existsSync(getImageWorkflowPath("flux2_img2img_api.json"))
      ? "flux2_img2img_api.json"
      : "image_to_image_api.json";
  } else if (isMulti) {
    workflowName = fs.existsSync(getImageWorkflowPath("flux2_pulid_multi_v2.json"))
      ? "flux2_pulid_multi_v2.json"
      : "flux2_pulid_api.json";
  } else {
    const usePulid = process.env.USE_PULID !== "false" && fs.existsSync(getImageWorkflowPath("flux2_pulid_api.json"));
    workflowName = usePulid ? "flux2_pulid_api.json" : "flux2_img2img_api.json";
  }

  const workflowPath = getImageWorkflowPath(workflowName);
  const isTurbo = unetLower.includes("turbo") || unetLower.includes("schnell");
  const steps = isSdxl ? 30 : (isTurbo ? 4 : 20);

  const isPony = unetLower.includes("pony") || unetLower.includes("ponydiffusion") || unetLower.includes("cyberrealisticpony") || unetLower.includes("iniverse");

  const trtDir = path.join(process.cwd(), "models", "tensorrt");
  const trtEngineFile = unetName.replace(/\.safetensors$/i, ".engine");
  const isTensorRT = fs.existsSync(path.join(trtDir, trtEngineFile));
  if (isTensorRT) {
    comfyLog(`⚡ [TensorRT] Detected compiled TensorRT engine: ${trtEngineFile} (3x inference speed active)`);
  }

  return {
    unetName,
    isMoody,
    isKlein,
    isFlux1,
    isSdxl,
    isPony,
    isTurbo,
    isTensorRT,
    steps,
    workflowName,
    workflowPath
  };
}
