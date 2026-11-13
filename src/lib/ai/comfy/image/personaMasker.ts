/**
 * src/lib/ai/comfy/image/personaMasker.ts
 *
 * Subject bounding region mask calculations for Stage 3A/3B Sequential Persona Insertion
 * (Part 10 — IMAGE_ROADMAP.md).
 * Ensures background pixels outside the subject mask remain 100% frozen from Stage 1 & 2.
 */

export interface MaskBounds {
  xMinNormalized: number;
  yMinNormalized: number;
  xMaxNormalized: number;
  yMaxNormalized: number;
  pixelXMin: number;
  pixelYMin: number;
  pixelWidth: number;
  pixelHeight: number;
}

/**
 * Calculates normalized and pixel-space bounding box mask coordinates for persona insertion.
 * Single persona: centered subject mask.
 * Dual personas: left (Persona A) and right (Persona B) subject masks with slight center overlap.
 */
export function createPersonaMaskRegion(
  width: number,
  height: number,
  personaIndex: number = 0,
  totalPersonas: number = 1
): MaskBounds {
  let xMinNorm = 0.15;
  let xMaxNorm = 0.85;
  const yMinNorm = 0.05;
  const yMaxNorm = 0.95;

  if (totalPersonas === 2) {
    if (personaIndex === 0) {
      // Persona A: Left zone (10% to 58% of canvas)
      xMinNorm = 0.10;
      xMaxNorm = 0.58;
    } else {
      // Persona B: Right zone (42% to 90% of canvas)
      xMinNorm = 0.42;
      xMaxNorm = 0.90;
    }
  }

  const pixelXMin = Math.round(xMinNorm * width);
  const pixelYMin = Math.round(yMinNorm * height);
  const pixelWidth = Math.round((xMaxNorm - xMinNorm) * width);
  const pixelHeight = Math.round((yMaxNorm - yMinNorm) * height);

  return {
    xMinNormalized: xMinNorm,
    yMinNormalized: yMinNorm,
    xMaxNormalized: xMaxNorm,
    yMaxNormalized: yMaxNorm,
    pixelXMin,
    pixelYMin,
    pixelWidth,
    pixelHeight
  };
}
