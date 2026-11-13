/**
 * src/lib/ai/comfy/image/denoiseScheduler.ts
 *
 * Adaptive Denoise Scheduling engine for Multi-Pass Pipeline (Task MP-12 — IMAGE_ROADMAP.md).
 * Dynamically computes optimal stage denoise levels based on scene transition complexity,
 * persona density, and architecture characteristics.
 */

export interface AdaptiveDenoiseOptions {
  sceneModifiers?: string;
  isDualPersona?: boolean;
  modelChoice?: string;
  unetName?: string;
}

/**
 * Computes a normalized scene complexity score (0.0 to 1.0) from prompt text keywords.
 */
export function computeSceneComplexityScore(sceneModifiers?: string): number {
  if (!sceneModifiers || !sceneModifiers.trim()) {
    return 0.2; // Default baseline complexity
  }

  const lower = sceneModifiers.toLowerCase();
  let score = 0.2;

  // High complexity action / pose keywords (+0.3)
  const highActionKeywords = ["intercourse", "penetration", "doggystyle", "cowgirl", "missionary", "kneeling", "submissive", "embracing", "kissing", "hugging", "action", "dynamic"];
  if (highActionKeywords.some(k => lower.includes(k))) {
    score += 0.3;
  }

  // Complex lighting / atmosphere keywords (+0.2)
  const lightingKeywords = ["rim light", "dramatic lighting", "volumetric", "cinematic lighting", "shadows", "contrast", "amber sconce", "neon"];
  if (lightingKeywords.some(k => lower.includes(k))) {
    score += 0.2;
  }

  // Detailed object / prop keywords (+0.2)
  const propKeywords = ["whiskey glass", "microphone", "podium", "news desk", "laptop", "camera", "chair", "sofa", "table"];
  if (propKeywords.some(k => lower.includes(k))) {
    score += 0.2;
  }

  return Math.min(1.0, score);
}

/**
 * Computes adaptive denoise level for a given pipeline stage index.
 */
export function computeAdaptiveStageDenoise(stageIndex: number, options: AdaptiveDenoiseOptions = {}): number {
  const complexity = computeSceneComplexityScore(options.sceneModifiers);
  const isPonyOrSdxl = ["pony", "moody", "sdxl", "catalyst", "cyber_pony", "iniverse_xl"].includes((options.modelChoice || "").toLowerCase());
  const isDual = !!options.isDualPersona;

  switch (stageIndex) {
    case 1:
      // Stage 1 (Environment): Always 1.0 for fresh latent generation
      return 1.0;

    case 2:
      // Stage 2 (Props & Foreground): Baseline 0.55 + complexity * 0.20
      const stage2Denoise = 0.55 + complexity * 0.20;
      return Math.min(0.75, Math.max(0.50, Number(stage2Denoise.toFixed(2))));

    case 3:
      // Stage 3 (Persona Insertion): Baseline 0.65 + complexity * 0.10 + (isDual ? 0.05 : 0)
      let stage3Denoise = 0.65 + complexity * 0.10 + (isDual ? 0.05 : 0);
      if (isPonyOrSdxl) stage3Denoise += 0.03; // SDXL requires slightly higher denoise for skin texture integration
      return Math.min(0.80, Math.max(0.60, Number(stage3Denoise.toFixed(2))));

    case 4:
      // Stage 4 (Relighting & Harmonization): Low denoise 0.18 - 0.28 to preserve stage 3 details
      const stage4Denoise = 0.18 + complexity * 0.08;
      return Math.min(0.28, Math.max(0.15, Number(stage4Denoise.toFixed(2))));

    case 5:
      // Stage 5 (Detailer & Micro-Anatomy): Baseline 0.25 - 0.35
      const stage5Denoise = 0.25 + complexity * 0.08;
      return Math.min(0.35, Math.max(0.20, Number(stage5Denoise.toFixed(2))));

    default:
      return 0.50;
  }
}
