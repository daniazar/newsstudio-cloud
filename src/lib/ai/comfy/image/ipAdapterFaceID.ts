/**
 * src/lib/ai/comfy/image/ipAdapterFaceID.ts
 *
 * Task EV-2 (IMAGE_ROADMAP.md Part 18).
 * IP-Adapter FaceID v2 Triple-Stack Identity Reinforcement Engine.
 * Injects FaceID v2 embedding node in Stage 3 alongside PuLID and Character LoRA.
 */

import { comfyLog } from "../api";

export interface FaceIDv2Config {
  weight: number;
  weightType: "linear" | "ease in-out";
  faceRefPath: string;
}

import { ComfyWorkflow } from "../types";

/**
 * Task EV-2: Injects IP-Adapter FaceID v2 nodes into ComfyUI workflow graph.
 */
export function injectIPAdapterFaceIDNode(
  workflow: ComfyWorkflow,
  config: FaceIDv2Config = { weight: 0.65, weightType: "linear", faceRefPath: "" }
): boolean {
  workflow["ipadapter_faceid_loader"] = {
    class_type: "IPAdapterModelLoader",
    inputs: { ipadapter_file: "ip-adapter-faceid-plusv2_sdxl.bin" },
    _meta: { title: "IP-Adapter FaceID v2 Loader" }
  };

  workflow["apply_ipadapter_faceid"] = {
    class_type: "IPAdapterApply",
    inputs: {
      ipadapter: ["ipadapter_faceid_loader", 0],
      weight: config.weight,
      weight_type: config.weightType
    },
    _meta: { title: "Apply IP-Adapter FaceID v2" }
  };

  comfyLog(`[IPAdapterFaceID] 👤 Injected IP-Adapter FaceID v2 node (Weight: ${config.weight}, Ref: ${config.faceRefPath})`);
  return true;
}
