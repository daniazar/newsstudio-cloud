/**
 * src/lib/ai/comfy/image/sam2Masker.ts
 *
 * Task EX-6 (IMAGE_ROADMAP.md Part 14).
 * SAM 2 (Segment Anything Model 2) Instance Masking Engine.
 * Replaces rectangular YOLO bounding boxes with pixel-perfect silhouette instance masks
 * for persona, face, and hand isolation without background bleed.
 */

import { comfyLog } from "../api";

export interface SAM2MaskConfig {
  modelName: string;
  maskType: "body_silhouette" | "face_neck_instance" | "hand_finger_instance";
  precision: number;
}

import { ComfyWorkflow } from "../types";

/**
 * Task EX-6: Injects SAM 2 instance segmentation nodes into ComfyUI workflow graph.
 */
export function injectSAM2InstanceMasking(
  workflow: ComfyWorkflow,
  imageSourceId: string = "8",
  maskType: SAM2MaskConfig["maskType"] = "body_silhouette"
): boolean {
  if (!workflow[imageSourceId]) return false;

  workflow["sam2_model_loader"] = {
    class_type: "SAM2ModelLoader",
    inputs: { model_name: "sam2_hiera_large.safetensors" },
    _meta: { title: "SAM 2 (Segment Anything Model 2) Model Loader" }
  };

  workflow["sam2_segmentation"] = {
    class_type: "SAM2Segmentation",
    inputs: {
      sam2_model: ["sam2_model_loader", 0],
      image: [imageSourceId, 0],
      segment_target: maskType
    },
    _meta: { title: `SAM 2 Pixel-Perfect Instance Mask (${maskType})` }
  };

  comfyLog(`[SAM2Masker] 🎯 Injected SAM 2 pixel-perfect instance segmentation node (${maskType})`);
  return true;
}
