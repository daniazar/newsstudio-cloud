/**
 * src/lib/ecommerce/sceneAutoDirector.ts
 *
 * AI Storyboard Auto-Director & Asset Matcher for Commercial Video Ads.
 * Automatically analyzes product typology, scraped assets, customer reviews,
 * and script narrative to assign the optimal kinematic scene mode and distinct,
 * non-repeating media assets across all scenes.
 */

import { ProductSpec, AdScene } from "@/lib/types/ecommerce";

export interface AutoDirectResult {
  updatedScenes: AdScene[];
  matchedCount: number;
  coveragePercent: number;
}

export interface AutoDirectOptions {
  /** Optional pre-rendered 3D turntable video URL (VP9 WebM or MP4) */
  default3dTurntableUrl?: string | null;
}

/**
 * Intelligently auto-directs scene modes and distributes product assets across all scenes.
 */
export function autoDirectSceneAssetsAndModes(
  scenes: AdScene[],
  productSpec?: ProductSpec | null,
  options?: AutoDirectOptions
): AutoDirectResult {
  if (!scenes || scenes.length === 0) {
    return { updatedScenes: [], matchedCount: 0, coveragePercent: 0 };
  }

  if (!productSpec) {
    return {
      updatedScenes: scenes.map((s) => ({
        ...s,
        turntable3dVideoUrl:
          s.sceneType === "product_turntable"
            ? s.turntable3dVideoUrl || options?.default3dTurntableUrl || undefined
            : s.turntable3dVideoUrl,
      })),
      matchedCount: scenes.filter((s) => !!s.primaryMediaUrl).length,
      coveragePercent: Math.round((scenes.filter((s) => !!s.primaryMediaUrl).length / Math.max(1, scenes.length)) * 100),
    };
  }

  // 1. Gather all product assets and deduplicate
  const assetPool: string[] = [];
  const lifestylePool: string[] = [];
  const texturePool: string[] = [];

  if (productSpec.assets && productSpec.assets.length > 0) {
    for (const a of productSpec.assets) {
      if (a.url && !assetPool.includes(a.url)) {
        assetPool.push(a.url);
        if (a.type === "lifestyle_context") lifestylePool.push(a.url);
        if (a.type === "detail_macro") texturePool.push(a.url);
      }
    }
  }

  if (productSpec.variants && productSpec.variants.length > 0) {
    for (const v of productSpec.variants) {
      if (v.imageUrl && !assetPool.includes(v.imageUrl)) {
        assetPool.push(v.imageUrl);
      }
    }
  }

  const heroAssetUrl =
    productSpec.assets?.find((a) => a.type === "hero_packshot" || a.isPrimary)?.url ||
    assetPool[0] ||
    "";
  const primaryLifestyleUrl = lifestylePool[0] || assetPool[1] || heroAssetUrl;
  const primaryTextureUrl = texturePool[0] || assetPool[2] || assetPool[1] || heroAssetUrl;

  const totalScenes = scenes.length;
  let matchedCount = 0;
  const updatedScenes: AdScene[] = [];

  for (let index = 0; index < totalScenes; index++) {
    const scene = scenes[index];
    const isFirst = index === 0;
    const isLast = index === totalScenes - 1;
    const isSecond = index === 1;
    const isThird = index === 2;
    const isFourth = index === 3;

    const lowerScript = (scene.voiceoverScript || "").toLowerCase();
    const lowerHeadline = (scene.headline || "").toLowerCase();
    const textContext = `${lowerScript} ${lowerHeadline}`;

    let resolvedSceneType: AdScene["sceneType"] = scene.sceneType;
    let primaryMediaUrl = scene.primaryMediaUrl || heroAssetUrl;
    let secondaryMediaUrl = scene.secondaryMediaUrl;
    let removeWhiteBg = scene.removeWhiteBg ?? false;

    // ─────────────────────────────────────────────────────────────
    // 2. Intelligent Mode Resolution
    // ─────────────────────────────────────────────────────────────
    if (isFirst) {
      // Scene 1: Always High-Impact Pattern Interrupt Hook
      resolvedSceneType = "pattern_interrupt_hook";
      primaryMediaUrl = primaryLifestyleUrl || heroAssetUrl;
      removeWhiteBg = false;
    } else if (isLast) {
      // Final Scene: Always Price Promo Outro with Call to Action
      resolvedSceneType = "price_promo_outro";
      primaryMediaUrl = heroAssetUrl;
      removeWhiteBg = true; // Cutout on dynamic brand gradient
    } else if (isSecond) {
      // Scene 2: Problem / Comparison / Technical Blueprint
      if (
        textContext.includes("vs") ||
        textContext.includes("generic") ||
        textContext.includes("antes") ||
        textContext.includes("before") ||
        textContext.includes("marca") ||
        textContext.includes("fallan")
      ) {
        resolvedSceneType = "before_after_wipe";
        primaryMediaUrl = heroAssetUrl;
        secondaryMediaUrl = primaryLifestyleUrl;
        removeWhiteBg = false;
      } else {
        resolvedSceneType = "3d_exploded_blueprint";
        primaryMediaUrl = primaryTextureUrl || heroAssetUrl;
        removeWhiteBg = true;
      }
    } else if (isThird) {
      // Scene 3: Torture Stress Test / Room Staging / Macro Texture
      if (productSpec.typology === "surface_material" || productSpec.typology === "bulky_furniture") {
        resolvedSceneType = textContext.includes("textur") || textContext.includes("detalle")
          ? "macro_texture_zoom"
          : "room_staging";
        primaryMediaUrl = primaryLifestyleUrl || primaryTextureUrl;
        removeWhiteBg = false;
      } else if (
        textContext.includes("impermeable") ||
        textContext.includes("waterproof") ||
        textContext.includes("resist") ||
        textContext.includes("test")
      ) {
        resolvedSceneType = "torture_stress_test";
        primaryMediaUrl = primaryTextureUrl || heroAssetUrl;
        removeWhiteBg = false;
      } else {
        resolvedSceneType = "macro_texture_zoom";
        primaryMediaUrl = primaryTextureUrl || heroAssetUrl;
        removeWhiteBg = false;
      }
    } else if (isFourth) {
      // Scene 4: Social Proof Review or Swatch Switcher
      if (productSpec.variants && productSpec.variants.filter((v) => v.imageUrl).length > 1) {
        resolvedSceneType = "colorway_swatch_switcher";
        primaryMediaUrl = productSpec.variants[0]?.imageUrl || heroAssetUrl;
        removeWhiteBg = false;
      } else if (productSpec.topReviews && productSpec.topReviews.length > 0) {
        resolvedSceneType = "social_proof_review";
        primaryMediaUrl = primaryLifestyleUrl || heroAssetUrl;
        removeWhiteBg = false;
      } else {
        resolvedSceneType = "product_turntable";
        primaryMediaUrl = heroAssetUrl;
        removeWhiteBg = true;
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 3. Asset Anti-Repetition Pass
    // ─────────────────────────────────────────────────────────────
    if (assetPool.length > 1 && index > 0) {
      const previousMedia = updatedScenes[index - 1]?.primaryMediaUrl;
      if (primaryMediaUrl === previousMedia) {
        const poolIndex = assetPool.indexOf(primaryMediaUrl);
        const nextAsset = assetPool[(poolIndex + 1) % assetPool.length];
        if (nextAsset) {
          primaryMediaUrl = nextAsset;
        }
      }
    }

    if (primaryMediaUrl) {
      matchedCount++;
    }

    const turntable3dVideoUrl =
      resolvedSceneType === "product_turntable"
        ? scene.turntable3dVideoUrl || options?.default3dTurntableUrl || undefined
        : scene.turntable3dVideoUrl;

    updatedScenes.push({
      ...scene,
      sceneType: resolvedSceneType,
      primaryMediaUrl,
      secondaryMediaUrl,
      removeWhiteBg,
      turntable3dVideoUrl,
    });
  }

  const coveragePercent = Math.round((matchedCount / totalScenes) * 100);

  return {
    updatedScenes,
    matchedCount,
    coveragePercent,
  };
}
