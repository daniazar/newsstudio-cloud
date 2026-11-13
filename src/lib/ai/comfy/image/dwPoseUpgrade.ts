/**
 * src/lib/ai/comfy/image/dwPoseUpgrade.ts
 *
 * Task EV-3 (IMAGE_ROADMAP.md Part 18).
 * DWPreprocessor 3D Pose Estimation Upgrade Engine.
 * Replaces legacy 2D OpenposePreprocessor nodes with instance-aware DWPreprocessor
 * for superior crossed arms and overlapping limb pose estimation.
 */

import { comfyLog } from "../api";
import { ComfyWorkflow } from "../types";

/**
 * Task EV-3: Swaps OpenposePreprocessor nodes with DWPreprocessor in ComfyUI workflow graph.
 */
export function upgradeToDWPosePreprocessor(workflow: ComfyWorkflow): number {
  let upgradedCount = 0;

  Object.keys(workflow).forEach(key => {
    const node = workflow[key];
    if (node && node.class_type === "OpenposePreprocessor") {
      node.class_type = "DWPreprocessor";
      if (!node.inputs) node.inputs = {};
      node.inputs["detect_hand"] = "enable";
      node.inputs["detect_body"] = "enable";
      node.inputs["detect_face"] = "enable";
      upgradedCount++;
    }
  });

  comfyLog(`[DWPoseUpgrade] 🤸 Upgraded ${upgradedCount} node(s) from OpenposePreprocessor to DWPreprocessor`);
  return upgradedCount;
}
