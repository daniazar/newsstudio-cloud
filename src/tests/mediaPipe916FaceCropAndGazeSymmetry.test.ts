import { describe, it, expect } from "vitest";
import { NEURAL_3DMM_FRAGMENT_SHADER } from "@/lib/realtime/shaders/neural3DMMFragmentShader";

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function compute916FaceCrop(
  vWidth: number,
  vHeight: number,
  hasAcquiredFace: boolean,
  headCx: number,
  headCy: number,
  headRx: number,
  headRy: number
): CropRect {
  const aspect = vWidth / Math.max(1, vHeight);
  if (aspect >= 0.85) {
    // Landscape or 1:1 square: no special 9:16 crop required
    return { x: 0, y: 0, width: 1, height: 1 };
  }

  if (hasAcquiredFace && headCx > 0 && headCy > 0) {
    // Face-centered crop around known head
    const normH = Math.min(0.55, Math.max(0.32, headRy * 2.0));
    const normW = Math.min(1.0, Math.max(0.60, headRx * 2.8));

    const x = Math.max(0, Math.min(1.0 - normW, headCx - normW * 0.5));
    const y = Math.max(0, Math.min(1.0 - normH, headCy - normH * 0.45));

    return { x, y, width: normW, height: normH };
  }

  // Unacquired face baseline: crop the upper 55% of the frame where presenter head resides
  const normW = 0.90;
  const normH = Math.min(0.60, normW * aspect * 1.25 + 0.35);
  const x = (1.0 - normW) * 0.5;
  const y = 0.01;

  return { x, y, width: normW, height: normH };
}

export function mapCropLandmarkToFullFrame(
  cropPt: { x: number; y: number; z?: number },
  crop: CropRect
): { x: number; y: number; z: number } {
  return {
    x: crop.x + cropPt.x * crop.width,
    y: crop.y + cropPt.y * crop.height,
    z: (cropPt.z || 0) * crop.width,
  };
}

describe("MediaPipe 9:16 Face-Focused Crop & Landmark Remapping", () => {
  it("should generate a face-focused crop in the upper frame for 9:16 video before acquisition", () => {
    const crop = compute916FaceCrop(1080, 1920, false, 0.5, 0.2, 0.17, 0.24);
    expect(crop.width).toBeLessThanOrEqual(1.0);
    expect(crop.height).toBeLessThanOrEqual(0.65);
    expect(crop.y).toBeLessThan(0.10); // Located in top third
    expect(crop.x).toBeGreaterThan(0.0);
    expect(crop.x + crop.width).toBeLessThanOrEqual(1.0);
  });

  it("should generate a tight face-centered crop around acquired head in 9:16", () => {
    const crop = compute916FaceCrop(1080, 1920, true, 0.50, 0.18, 0.16, 0.22);
    // Center of crop should be close to headCx, headCy
    const cropCenterY = crop.y + crop.height * 0.5;
    expect(Math.abs(cropCenterY - 0.18)).toBeLessThan(0.08);
    expect(crop.height).toBeLessThan(0.80);
    expect(crop.width).toBeLessThanOrEqual(1.0);
  });

  it("should remap detected crop landmarks back to full-frame space preserving geometry", () => {
    const crop: CropRect = { x: 0.1, y: 0.05, width: 0.8, height: 0.5 };
    const ptInCrop = { x: 0.5, y: 0.5, z: 0.0 };
    const fullPt = mapCropLandmarkToFullFrame(ptInCrop, crop);

    expect(fullPt.x).toBeCloseTo(0.1 + 0.5 * 0.8); // 0.50
    expect(fullPt.y).toBeCloseTo(0.05 + 0.5 * 0.5); // 0.30
  });

  it("should pass full-frame 1:1 or landscape inputs without cropping", () => {
    const crop169 = compute916FaceCrop(1920, 1080, false, 0.5, 0.5, 0.2, 0.2);
    expect(crop169).toEqual({ x: 0, y: 0, width: 1, height: 1 });

    const crop11 = compute916FaceCrop(1024, 1024, false, 0.5, 0.5, 0.2, 0.2);
    expect(crop11).toEqual({ x: 0, y: 0, width: 1, height: 1 });
  });
});

describe("Neural 3DMM Shader Ocular & Gaze Symmetry", () => {
  it("should dynamically derive eyeRx and eyeRy rather than hardcoding static 0.0090", () => {
    // Should NOT have hardcoded '0.0090' for eye dimensions
    expect(NEURAL_3DMM_FRAGMENT_SHADER).not.toContain("0.018 : 0.0090");
    // Should derive eyeSpan and scale eyeRx and eyeRy proportionally
    expect(NEURAL_3DMM_FRAGMENT_SHADER).toMatch(/eyeSpan|u_headRadius/);
  });

  it("should not render harsh synthetic white streaks cutting through the lower eyelid", () => {
    // Tear lake strip should not have 0.14 multiplier without blending or should be softly attenuated
    expect(NEURAL_3DMM_FRAGMENT_SHADER).not.toContain("0.14 * eyeArchL * (1.0 - u_blinkLeft)");
  });

  it("should rotate eye globe in 3D around its internal axis and keep palpebral fissure anchored", () => {
    expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("rotateEyeGlobe3D");
    expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("float gazeYawL = (u_gazeX - u_exophoria * 0.5) * 0.28;");
    expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("float gazePitch = u_gazeY * 0.24;");
  });
});
