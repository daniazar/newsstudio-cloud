/**
 * src/lib/wardrobe/blueprintTypes.ts
 *
 * Client-safe pure types and attribute extractors for the AI Blueprint Generator.
 * Decoupled from node:fs, child_process, and prisma to guarantee clean bundling in client components.
 */

import {
  HairColorFamily,
  HairLength,
  HairTexture,
} from "@/lib/wardrobe/hairCatalog";

export type BlueprintType = "attire" | "hair";
export type BlueprintGender = "women" | "men" | "unisex" | "female" | "male";
export type BlueprintEngineOption = "api" | "agy" | "comfy" | "offline-fallback" | "auto";

export interface BlueprintGenerationInput {
  prompt: string;
  type: BlueprintType;
  gender?: BlueprintGender | string;
  category?: string;
  name?: string;
  preferredEngine?: BlueprintEngineOption;
}

export interface BlueprintItem {
  id: string;
  name: string;
  type: BlueprintType;
  gender: "women" | "men" | "unisex";
  category: string;
  prompt: string;
  compiledPrompt: string;
  samPrompt: string;
  imageUrl: string;
  localPath: string;
  panels: [string, string, string, string];
  engineUsed: string;
  isCustom: boolean;
  createdAt: string;
}

export interface BlueprintGenerationResult {
  success: boolean;
  blueprint?: BlueprintItem;
  error?: string;
}

export interface DerivedHairstyleAttributes {
  colorFamily: HairColorFamily;
  hairColor: string;
  hairLength: HairLength;
  hairTexture: HairTexture;
}

/**
 * Derives accurate color family, length, and texture taxonomies from hairstyle prompt.
 * Prevents custom hairstyles from disappearing under catalog filter chips.
 */
export function deriveHairstyleAttributes(
  prompt: string,
  category?: string
): DerivedHairstyleAttributes {
  const p = prompt.toLowerCase();

  // Color Family
  let colorFamily: HairColorFamily = "brunette";
  let hairColor = "dimensional custom tone";

  if (p.includes("platinum") || p.includes("nordic") || p.includes("ice") || p.includes("white")) {
    colorFamily = "platinum";
    hairColor = "cool nordic platinum ice";
  } else if (
    p.includes("silver") ||
    p.includes("grey") ||
    p.includes("gray") ||
    p.includes("salt and pepper") ||
    p.includes("ash")
  ) {
    colorFamily = "silver";
    hairColor = "reflective sterling silver";
  } else if (
    p.includes("blonde") ||
    p.includes("blond") ||
    p.includes("honey") ||
    p.includes("golden") ||
    p.includes("butter") ||
    p.includes("flaxen") ||
    p.includes("champagne")
  ) {
    colorFamily = "blonde";
    hairColor = "warm honey butter blonde";
  } else if (
    p.includes("black") ||
    p.includes("raven") ||
    p.includes("jet") ||
    p.includes("espresso") ||
    p.includes("charcoal") ||
    p.includes("ebony")
  ) {
    colorFamily = "black";
    hairColor = "glossy jet raven black";
  } else if (
    p.includes("red") ||
    p.includes("copper") ||
    p.includes("auburn") ||
    p.includes("ginger") ||
    p.includes("burgundy") ||
    p.includes("crimson") ||
    p.includes("mahogany")
  ) {
    colorFamily = "red";
    hairColor = "luminous copper auburn";
  } else if (
    p.includes("chestnut") ||
    p.includes("mocha") ||
    p.includes("caramel") ||
    p.includes("chocolate") ||
    p.includes("brunette") ||
    p.includes("brown")
  ) {
    colorFamily = "brunette";
    hairColor = "rich dimensional caramel chestnut";
  }

  // Length
  let hairLength: HairLength = "medium";
  if (
    p.includes("updo") ||
    p.includes("bun") ||
    p.includes("ponytail") ||
    p.includes("chignon") ||
    p.includes("topknot")
  ) {
    hairLength = "updo";
  } else if (
    p.includes("pixie") ||
    p.includes("crop") ||
    p.includes("buzz") ||
    p.includes("fade") ||
    p.includes("taper") ||
    p.includes("undercut") ||
    p.includes("crew") ||
    p.includes("short")
  ) {
    hairLength = "short";
  } else if (
    p.includes("long") ||
    p.includes("waist") ||
    p.includes("chest") ||
    p.includes("flowing") ||
    p.includes("extensions")
  ) {
    hairLength = "long";
  } else if (p.includes("bob") || p.includes("lob") || p.includes("shoulder") || p.includes("collarbone")) {
    hairLength = p.includes("micro-bob") ? "short" : "medium";
  }

  // Texture
  let hairTexture: HairTexture = "straight";
  if (
    p.includes("coil") ||
    p.includes("coils") ||
    p.includes("coily") ||
    p.includes("afro") ||
    p.includes("kinky") ||
    p.includes("4c")
  ) {
    hairTexture = "coily";
  } else if (
    p.includes("curly") ||
    p.includes("curls") ||
    p.includes("ringlet") ||
    p.includes("spiral")
  ) {
    hairTexture = "curly";
  } else if (
    p.includes("braid") ||
    p.includes("braids") ||
    p.includes("braided") ||
    p.includes("cornrow") ||
    p.includes("locs") ||
    p.includes("dreadlocks") ||
    p.includes("twists")
  ) {
    hairTexture = "braided";
  } else if (p.includes("wavy") || p.includes("waves") || p.includes("beach") || p.includes("shag")) {
    hairTexture = "wavy";
  } else if (category === "textured_curls") {
    hairTexture = "curly";
  } else {
    hairTexture = "straight";
  }

  return {
    colorFamily,
    hairColor,
    hairLength,
    hairTexture,
  };
}

/**
 * Normalizes input gender values to "women" | "men" | "unisex".
 */
export function normalizeGender(gender?: string): "women" | "men" | "unisex" {
  if (!gender) return "unisex";
  const g = gender.toLowerCase().trim();
  if (g === "female" || g === "women" || g === "woman" || g === "fem") return "women";
  if (g === "male" || g === "men" || g === "man" || g === "masc") return "men";
  return "unisex";
}

/**
 * Normalizes gender to "female" | "male" | "unisex" for catalog & database compatibility.
 */
export function toCatalogGender(gender: "women" | "men" | "unisex"): "female" | "male" | "unisex" {
  if (gender === "women") return "female";
  if (gender === "men") return "male";
  return "unisex";
}
