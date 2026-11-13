/**
 * src/lib/ecommerce/hookGenerator.ts
 *
 * AI Viral Hook Generator for E-Commerce Video Ads.
 * Generates 8 high-converting, performance-tested hook formulas
 * adapted to specific product specs and typologies.
 */

import { ProductSpec, AdScript } from "@/lib/types/ecommerce";

export type ViralHookFormula =
  | "negative_fomo"
  | "curiosity_gap"
  | "us_vs_them"
  | "tiktok_viral"
  | "industry_secret"
  | "shocking_stat"
  | "before_after_reveal"
  | "pain_point_relief";

export interface ViralHookVariant {
  id: string;
  formula: ViralHookFormula;
  badgeLabel: string;
  icon: string;
  headline: string;
  subheadline: string;
  voiceoverScript: string;
  sfxTag: string;
}

/**
 * Extracts a concise category name from title or typology.
 */
function getProductCategory(spec: ProductSpec): string {
  const t = spec.title.toLowerCase();
  if (spec.typology === "surface_material") {
    if (t.includes("floor") || t.includes("hardwood") || t.includes("plank")) return "flooring";
    if (t.includes("paint") || t.includes("wall")) return "paint";
    if (t.includes("tile")) return "tile";
    return "flooring";
  }
  if (spec.typology === "discrete_object") {
    if (t.includes("earbud") || t.includes("audio") || t.includes("headphone")) return "earbuds";
    if (t.includes("watch")) return "smartwatch";
    if (t.includes("charger") || t.includes("power")) return "charger";
    return "gadget";
  }
  if (spec.typology === "apparel_wearable") return "wear";
  if (spec.typology === "sensory_consumable") return "skincare";
  if (spec.typology === "bulky_furniture") return "furniture";
  if (spec.typology === "local_service") return "service";
  return "product";
}

/**
 * Identifies the primary USP from bullets or title.
 */
function getPrimaryUsp(spec: ProductSpec): string {
  if (spec.bulletPoints && spec.bulletPoints.length > 0) {
    return spec.bulletPoints[0];
  }
  return spec.description.slice(0, 60);
}

/**
 * Generates 8 battle-tested viral hooks dynamically tailored to the product.
 */
export function generateViralHooks(spec: ProductSpec): ViralHookVariant[] {
  const category = getProductCategory(spec);
  const vendor = spec.vendor || "our brand";
  const usp = getPrimaryUsp(spec);
  const isSurface = spec.typology === "surface_material";
  const isService = spec.typology === "local_service";

  const hooks: ViralHookVariant[] = [
    {
      id: "hook_negative_fomo",
      formula: "negative_fomo",
      badgeLabel: "Negative FOMO",
      icon: "🛑",
      headline: `Stop Scrolling If You Still Use Traditional ${category.toUpperCase()}!`,
      subheadline: `[emotion:urgent] Why thousands are upgrading this week`,
      voiceoverScript: `[sfx:whoosh] [emotion:urgent] Stop scrolling if you're still dealing with outdated ${category}. You're literally wasting hours when this new ${vendor} solution exists.`,
      sfxTag: "[sfx:whoosh]",
    },
    {
      id: "hook_curiosity_gap",
      formula: "curiosity_gap",
      badgeLabel: "Curiosity Gap",
      icon: "🤫",
      headline: `The One Feature Big Brands Don't Want You To Know`,
      subheadline: `[emotion:whisper] Engineered with ${usp.slice(0, 35)}...`,
      voiceoverScript: `[sfx:pop] [emotion:whisper] Most people don't realize this, but this 1 feature in the ${vendor} ${category} changes everything. Watch closely.`,
      sfxTag: "[sfx:pop]",
    },
    {
      id: "hook_us_vs_them",
      formula: "us_vs_them",
      badgeLabel: "Us vs. Them",
      icon: "⚔️",
      headline: `Why 10,000+ Buyers Threw Out Their Old ${category.toUpperCase()}`,
      subheadline: `[emotion:authoritative] Real durability test vs cheap alternatives`,
      voiceoverScript: `[sfx:whoosh] [emotion:authoritative] We put standard ${category} against ${vendor} head-to-head. The difference will completely blow your mind.`,
      sfxTag: "[sfx:whoosh]",
    },
    {
      id: "hook_tiktok_viral",
      formula: "tiktok_viral",
      badgeLabel: "TikTok Viral",
      icon: "🔥",
      headline: `I Finally Caved And Bought The Viral ${vendor} ${category}`,
      subheadline: `[emotion:excited] Was it worth the hype? Honest 30-day review`,
      voiceoverScript: `[sfx:ding] [emotion:excited] Okay, I finally caved and bought the viral ${vendor} ${category} that everyone on my feed has been talking about. Let's see if it actually works.`,
      sfxTag: "[sfx:ding]",
    },
    {
      id: "hook_industry_secret",
      formula: "industry_secret",
      badgeLabel: "Industry Secret",
      icon: "🕵️",
      headline: isSurface
        ? `The Flooring Hack Contractors Keep To Themselves`
        : isService
        ? `What Most Technicians Won't Tell You About Repairs`
        : `The Industry Secret Behind High-End ${category.toUpperCase()}`,
      subheadline: `[emotion:authoritative] Save thousands without cutting corners`,
      voiceoverScript: `[sfx:whoosh] [emotion:authoritative] Here is the insider secret most contractors won't share. You can get full commercial grade performance at half the price.`,
      sfxTag: "[sfx:whoosh]",
    },
    {
      id: "hook_shocking_stat",
      formula: "shocking_stat",
      badgeLabel: "Shocking Stat",
      icon: "📊",
      headline: `93% Of People Settle For Low Quality ${category.toUpperCase()}`,
      subheadline: `[emotion:urgent] Certified 99% accuracy specification`,
      voiceoverScript: `[sfx:whoosh] [emotion:urgent] Over 90% of buyers replace their ${category} within two years because of cheap materials. ${vendor} was built to solve that forever.`,
      sfxTag: "[sfx:whoosh]",
    },
    {
      id: "hook_before_after_reveal",
      formula: "before_after_reveal",
      badgeLabel: "Reveal Shock",
      icon: "✨",
      headline: `Watch This 5-Second Transformation Reveal!`,
      subheadline: `[emotion:excited] From worn out to showroom perfection`,
      voiceoverScript: `[sfx:whoosh] [emotion:excited] Watch what happens when we replace this old setup with the new ${vendor} ${category}. The before and after is unbelievable!`,
      sfxTag: "[sfx:whoosh]",
    },
    {
      id: "hook_pain_point_relief",
      formula: "pain_point_relief",
      badgeLabel: "Pain Relief",
      icon: "💡",
      headline: `If You're Sick Of Constant Maintenance, Look Here`,
      subheadline: `[emotion:relatable] The zero-hassle upgrade you need`,
      voiceoverScript: `[sfx:pop] [emotion:relatable] If you're completely exhausted by constant scratches, scuffs, and upkeep—you need to see how ${vendor} built this.`,
      sfxTag: "[sfx:pop]",
    },
  ];

  return hooks;
}

/**
 * Applies a selected viral hook to an existing AdScript.
 * Updates Scene 1 cleanly while preserving scene timing and other layers.
 */
export function applyHookToScript(script: AdScript, hook: ViralHookVariant): AdScript {
  const updatedScenes = script.scenes.map((scene, idx) => {
    if (idx === 0 || scene.sceneType === "pattern_interrupt_hook" || scene.sceneType === "before_after_wipe") {
      return {
        ...scene,
        headline: hook.headline,
        subheadline: hook.subheadline,
        voiceoverScript: hook.voiceoverScript,
        sfxTag: hook.sfxTag,
      };
    }
    return scene;
  });

  return {
    ...script,
    hookHeadline: hook.headline,
    scenes: updatedScenes,
  };
}
