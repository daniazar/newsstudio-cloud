/**
 * src/lib/ecommerce/turntableRadarEngine.ts
 *
 * Dynamic Feature Radar Pin & Spec Callout Engine for Neural Product Turntables.
 * Auto-extracts high-converting selling points from ProductSpec bullet points and
 * typology specs, generating pulsing radar HUD pins synchronized to the 360° rotation.
 */

import { ProductSpec, TurntableRadarPin } from "@/lib/types/ecommerce";

/**
 * Spatial coordinate presets optimized for 360° rotating packshots (in % of stage dimensions).
 * Arranged so callout badges avoid colliding with center product mass and lower-third captions.
 */
const DEFAULT_PIN_POSITIONS = [
  { x: 74, y: 32 }, // Upper-Right (Head / Bezel / Dial / Collar)
  { x: 22, y: 50 }, // Middle-Left (Core Body / Chassis / Texture)
  { x: 72, y: 72 }, // Lower-Right (Base / Sole / Pedestal / Battery)
];

/**
 * Clean and abbreviate raw bullet points into punchy 2-4 word commercial HUD labels.
 */
export function formatRadarLabel(rawText: string): string {
  if (!rawText) return "PREMIUM SPEC";

  // Remove leading emojis (pictographs), dashes, bullets, asterisks, and numbering like "1. " or "2) "
  let cleaned = rawText
    .replace(/^[\p{Extended_Pictographic}\s\u2022\u25E6\u2023\u2219\u25AA\u25AB\u2013\u2014\-*•]+/u, "")
    .replace(/^\d+[\.\)\:\-]\s*/, "")
    .trim();

  // If text contains a colon (e.g., "Material: Aircraft-Grade Titanium"), take the value if short prefix
  if (cleaned.includes(":")) {
    const parts = cleaned.split(":");
    if (parts[0].trim().split(/\s+/).length <= 2) {
      cleaned = parts[1].trim() || parts[0].trim();
    } else {
      cleaned = parts[0].trim();
    }
  }

  // Remove parentheticals (e.g. "(IPX7 Submersible)") or trailing explanations
  cleaned = cleaned.replace(/\([^)]*\)/g, "").trim();

  // Truncate to first 4-5 words max for clean HUD badge readability
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length > 4) {
    cleaned = words.slice(0, 4).join(" ");
  }

  return cleaned.toUpperCase();
}

/**
 * Automatically extracts 2-3 prominent feature callouts from product specifications
 * and generates animated radar pins for Remotion ShoppableHotspotLayer / Turntable HUD.
 */
export function extractDefaultRadarPins(
  productSpec?: ProductSpec,
  accentColor: string = "#06b6d4",
  totalDurationFrames: number = 155
): TurntableRadarPin[] {
  const pins: TurntableRadarPin[] = [];
  const candidateTexts: string[] = [];

  // 1. Gather candidates from bullet points
  if (productSpec?.bulletPoints && productSpec.bulletPoints.length > 0) {
    candidateTexts.push(...productSpec.bulletPoints.slice(0, 5));
  }

  // 2. Gather candidates from typology specifics if available
  if (productSpec?.typologySpecifics) {
    const spec = productSpec.typologySpecifics;
    if (spec.surfaceMaterial?.durabilityRating) {
      candidateTexts.push(spec.surfaceMaterial.durabilityRating);
    }
    if (spec.surfaceMaterial?.waterproofGrade) {
      candidateTexts.push(spec.surfaceMaterial.waterproofGrade);
    }
    if (spec.discreteObject?.waterproofIpx) {
      candidateTexts.push(spec.discreteObject.waterproofIpx);
    }
    if (spec.discreteObject?.batteryLife) {
      candidateTexts.push(spec.discreteObject.batteryLife);
    }
    if (spec.apparel?.fabricComposition) {
      candidateTexts.push(spec.apparel.fabricComposition);
    }
    if (spec.sensoryConsumable?.clinicalClaim) {
      candidateTexts.push(spec.sensoryConsumable.clinicalClaim);
    }
  }

  // 3. Fallbacks if no bullet points exist
  if (candidateTexts.length === 0) {
    if (productSpec?.title) {
      candidateTexts.push(productSpec.title);
    }
    candidateTexts.push("PRECISION ENGINEERING", "CERTIFIED PREMIUM GRADE");
  }

  // Pick top 2 or 3 distinct candidates
  const selectedCandidates = Array.from(new Set(candidateTexts))
    .filter(Boolean)
    .slice(0, 3);

  // Stagger entry frames across rotation
  const frameInterval = Math.floor(totalDurationFrames / (selectedCandidates.length + 1));

  selectedCandidates.forEach((rawText, idx) => {
    const pos = DEFAULT_PIN_POSITIONS[idx % DEFAULT_PIN_POSITIONS.length];
    const label = formatRadarLabel(rawText);
    const startFrame = Math.max(8, idx * frameInterval);
    const durationFrames = Math.max(60, totalDurationFrames - startFrame);

    pins.push({
      id: `radar_pin_${idx + 1}_${Date.now()}`,
      label,
      subtitle: `FEATURE ${idx + 1}`,
      x: pos.x,
      y: pos.y,
      pulseColor: idx === 0 ? accentColor : idx === 1 ? "#f59e0b" : "#10b981",
      startFrame,
      durationFrames,
    });
  });

  return pins;
}
