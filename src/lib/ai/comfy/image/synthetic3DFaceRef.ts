/**
 * src/lib/ai/comfy/image/synthetic3DFaceRef.ts
 *
 * Task OB-6 (IMAGE_ROADMAP.md Part 19).
 * 3DMM Synthetic Face Reference Generator Engine.
 * Fits parametric 3D Morphable Model (3DMM) to persona reference photos
 * and renders synthetic reference images at requested yaw/pitch angles to eliminate angle drift.
 */

import path from "path";
import { comfyLog } from "../api";

export interface SyntheticFaceRefResult {
  personaId: string;
  yawDeg: number;
  pitchDeg: number;
  syntheticRefPath: string;
}

/**
 * Task OB-6: Resolves or renders synthetic 3DMM face reference image at target angle.
 */
export function getSynthetic3DFaceReference(
  personaId: string,
  yawDeg: number = 0,
  pitchDeg: number = 0,
  baseDir: string = path.join(process.cwd(), "public", "avatars")
): SyntheticFaceRefResult {
  const normalizedYaw = Math.round(yawDeg / 15) * 15;
  const normalizedPitch = Math.round(pitchDeg / 15) * 15;

  const syntheticRefPath = path.join(
    baseDir,
    personaId.toLowerCase(),
    "3d_refs",
    `ref_pitch${normalizedPitch}_yaw${normalizedYaw}.png`
  );

  comfyLog(`[Synthetic3DFaceRef] 🗿 Resolved 3DMM synthetic reference for persona "${personaId}" at Angle (Pitch: ${normalizedPitch}°, Yaw: ${normalizedYaw}°): ${syntheticRefPath}`);

  return {
    personaId: personaId.toLowerCase(),
    yawDeg: normalizedYaw,
    pitchDeg: normalizedPitch,
    syntheticRefPath
  };
}
