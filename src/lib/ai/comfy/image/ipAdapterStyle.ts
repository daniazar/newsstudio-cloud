/**
 * src/lib/ai/comfy/image/ipAdapterStyle.ts
 *
 * Task AD-4 (IMAGE_ROADMAP.md Part 15).
 * IP-Adapter Style-Only Photographic Lock Engine.
 * Transfers editorial photography composition, bokeh, and color grading from reference images
 * with weight_type="style only" without identity leakage.
 */

import { comfyLog } from "../api";

export interface IPAdapterStyleConfig {
  styleRefPath: string;
  weight: number; // 0.40
  weightType: string; // "style only"
}

import { ComfyWorkflow } from "../types";

/**
 * Task AD-4: Injects IP-Adapter Style-Only node into ComfyUI workflow graph.
 */
export function injectIPAdapterStyleOnlyNode(
  workflow: ComfyWorkflow,
  styleRefPath: string = "styles/editorial_photography.jpg",
  weight: number = 0.40,
  modelSourceId: string = "1"
): boolean {
  if (!workflow[modelSourceId]) return false;

  workflow["ip_adapter_style_loader"] = {
    class_type: "IPAdapterModelLoader",
    inputs: { ipadapter_file: "ip-adapter_sdxl_vit-h.safetensors" },
    _meta: { title: "IP-Adapter Model Loader" }
  };

  workflow["ip_adapter_style_apply"] = {
    class_type: "IPAdapterApply",
    inputs: {
      model: [modelSourceId, 0],
      ipadapter: ["ip_adapter_style_loader", 0],
      image: styleRefPath,
      weight,
      weight_type: "style only"
    },
    _meta: { title: `IP-Adapter Style-Only Lock (Weight: ${weight})` }
  };

  if (workflow["8"] && workflow["8"].inputs) {
    workflow["8"].inputs.model = ["ip_adapter_style_apply", 0];
  }

  comfyLog(`[IPAdapterStyle] 📷 Injected IP-Adapter Style-Only node (Weight: ${weight}, Ref: ${styleRefPath})`);
  return true;
}
