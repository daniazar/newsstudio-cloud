/**
 * src/lib/ai/comfy/image/contactZoneManager.ts
 *
 * Task CC-7 — Contact Zone Map Auto-Generation
 * Calculates normalized spatial bounds and pixel-space mask coordinates for physical contact zones
 * (e.g., hugging, hand-holding, lap sitting, intimate contact) between subjects.
 */

export interface ContactZoneBounds {
  xMinNormalized: number;
  yMinNormalized: number;
  xMaxNormalized: number;
  yMaxNormalized: number;
  pixelXMin: number;
  pixelYMin: number;
  pixelWidth: number;
  pixelHeight: number;
  contactType: "NONE" | "SOFT_CONTACT" | "MODERATE_CONTACT" | "FULL_CONTACT";
}

/**
 * Detects contact type and calculates spatial bounding box for the contact interaction boundary.
 */
export function generateContactZoneBounds(
  sceneText: string,
  width: number,
  height: number
): ContactZoneBounds {
  const lower = (sceneText || "").toLowerCase();

  // Full Contact (Center-lower canvas overlap)
  const fullContactKeywords = ["intercourse", "penetration", "doggystyle", "cowgirl", "missionary", "titfuck", "creampie", "bdsm"];
  if (fullContactKeywords.some(k => lower.includes(k))) {
    const xMinNorm = 0.25;
    const xMaxNorm = 0.75;
    const yMinNorm = 0.35;
    const yMaxNorm = 0.90;

    return {
      xMinNormalized: xMinNorm,
      yMinNormalized: yMinNorm,
      xMaxNormalized: xMaxNorm,
      yMaxNormalized: yMaxNorm,
      pixelXMin: Math.round(xMinNorm * width),
      pixelYMin: Math.round(yMinNorm * height),
      pixelWidth: Math.round((xMaxNorm - xMinNorm) * width),
      pixelHeight: Math.round((yMaxNorm - yMinNorm) * height),
      contactType: "FULL_CONTACT"
    };
  }

  // Moderate Contact (Center overlap zone)
  const moderateContactKeywords = ["hugging", "embracing", "kissing", "lap sitting", "holding back of head", "pressed against", "kneeling together"];
  if (moderateContactKeywords.some(k => lower.includes(k))) {
    const xMinNorm = 0.30;
    const xMaxNorm = 0.70;
    const yMinNorm = 0.20;
    const yMaxNorm = 0.80;

    return {
      xMinNormalized: xMinNorm,
      yMinNormalized: yMinNorm,
      xMaxNormalized: xMaxNorm,
      yMaxNormalized: yMaxNorm,
      pixelXMin: Math.round(xMinNorm * width),
      pixelYMin: Math.round(yMinNorm * height),
      pixelWidth: Math.round((xMaxNorm - xMinNorm) * width),
      pixelHeight: Math.round((yMaxNorm - yMinNorm) * height),
      contactType: "MODERATE_CONTACT"
    };
  }

  // Soft Contact (Narrow center seam)
  const softContactKeywords = ["leaning toward", "shoulder touching", "holding hands", "shaking hands", "close together", "side by side"];
  if (softContactKeywords.some(k => lower.includes(k))) {
    const xMinNorm = 0.40;
    const xMaxNorm = 0.60;
    const yMinNorm = 0.30;
    const yMaxNorm = 0.85;

    return {
      xMinNormalized: xMinNorm,
      yMinNormalized: yMinNorm,
      xMaxNormalized: xMaxNorm,
      yMaxNormalized: yMaxNorm,
      pixelXMin: Math.round(xMinNorm * width),
      pixelYMin: Math.round(yMinNorm * height),
      pixelWidth: Math.round((xMaxNorm - xMinNorm) * width),
      pixelHeight: Math.round((yMaxNorm - yMinNorm) * height),
      contactType: "SOFT_CONTACT"
    };
  }

  // Fallback / No Contact
  return {
    xMinNormalized: 0.0,
    yMinNormalized: 0.0,
    xMaxNormalized: 1.0,
    yMaxNormalized: 1.0,
    pixelXMin: 0,
    pixelYMin: 0,
    pixelWidth: width,
    pixelHeight: height,
    contactType: "NONE"
  };
}
