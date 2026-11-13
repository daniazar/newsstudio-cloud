/**
 * src/lib/ai/comfy/image/blenderMannequinLibrary.ts
 *
 * Task OB-10 (IMAGE_ROADMAP.md Part 19).
 * Blender Mannequin 3D Proxy Library Engine.
 * Manages standard male/female mannequin proxy meshes at height variants
 * stored in assets/blender/mannequins/ for ground-truth 3D scene construction.
 */

import path from "path";
import { comfyLog } from "../api";

export type GenderType = "female" | "male";
export type HeightCategory = "petite" | "average" | "tall";

export interface MannequinMeshResult {
  gender: GenderType;
  heightCategory: HeightCategory;
  meshPath: string;
}

/**
 * Task OB-10: Resolves 3D mannequin proxy mesh file path based on gender and height.
 */
export function getBlenderMannequinMesh(
  gender: GenderType = "female",
  heightCategory: HeightCategory = "average",
  assetDir: string = path.join(process.cwd(), "assets", "blender", "mannequins")
): MannequinMeshResult {
  const meshPath = path.join(assetDir, `${gender}_${heightCategory}.blend`);

  comfyLog(`[BlenderMannequinLibrary] 🧍 Resolved 3D mannequin mesh proxy: ${meshPath}`);

  return {
    gender,
    heightCategory,
    meshPath
  };
}
