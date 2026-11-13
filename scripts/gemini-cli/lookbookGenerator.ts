/**
 * scripts/gemini-cli/lookbookGenerator.ts
 *
 * NewsStudio AI Virtual Wardrobe Lookbook Generator.
 * Synthesizes a comprehensive 12-outfit fashion catalog for any persona
 * and auto-registers clean wardrobe plates into the persona archive and database.
 */

import fs from "fs";
import path from "path";
import { Persona } from "../../src/lib/tts/personas";
import { resolvePersonaAvatarPath } from "./personaAttires";
import { resolveHairstylePrompt } from "./hairstylePresets";
import { CompiledScenePrompt } from "./types";
import { runWithAgy } from "./engines/agyRunner";
import { runWithApi } from "./engines/apiRunner";
import { outputToolJson } from "./engines/jsonRunner";
import { renderTerminalImagePreview } from "./terminalPreview";

export interface LookbookOutfit {
  id: string;
  name: string;
  category: "broadcast" | "gala" | "edgy" | "casual" | "techwear" | "executive";
  prompt: string;
}

export const LOOKBOOK_CATALOG: LookbookOutfit[] = [
  { id: "look_01_prime_blazer", name: "Executive Prime-Time Blazer", category: "broadcast", prompt: "Structured double-breasted navy blue crepe blazer with peaked lapels, gold crest buttons, and crisp white silk camisole" },
  { id: "look_02_crimson_sheath", name: "Crimson Red Asymmetric Sheath", category: "broadcast", prompt: "Structured crimson-red tailored crepe sheath dress with architectural asymmetric neckline and gold cuff bracelet" },
  { id: "look_03_cobalt_sweetheart", name: "Cobalt Blue Sweetheart Gown", category: "gala", prompt: "Form-fitting royal cobalt blue sweetheart neckline dress with gold waist belt and delicate gold chain necklace" },
  { id: "look_04_velvet_tuxedo", name: "Midnight Black Velvet Tuxedo", category: "gala", prompt: "High-fashion tailored black velvet tuxedo jacket with silk satin lapels and black tailored trousers" },
  { id: "look_05_moto_leather", name: "Cropped Biker Leather Jacket", category: "edgy", prompt: "Black moto leather cropped biker jacket with silver asymmetric zippers over tight black cutout bandeau and leather pants" },
  { id: "look_06_cyber_neon", name: "Cyberpunk Neon-Lined Streetwear", category: "edgy", prompt: "Metallic silver bomber jacket with glowing purple-lined collar over neon crop top and high-waisted cargo pants" },
  { id: "look_07_cashmere_knit", name: "Oversized Cashmere Chunky Knit", category: "casual", prompt: "Cozy oversized mustard-yellow chunky knit cashmere sweater over white collared shirt and tailored dark trousers" },
  { id: "look_08_italian_linen", name: "Crisp Sand-Colored Italian Linen", category: "casual", prompt: "Relaxed sand-colored Italian linen suit jacket worn over an open-collar white linen shirt, effortless summer sophistication" },
  { id: "look_09_tech_bomber", name: "Weatherproof Tactical Tech Bomber", category: "techwear", prompt: "Dark grey matte weather-resistant tactical windbreaker with waterproof zip accents over form-fitting black compression top" },
  { id: "look_10_minimal_turtleneck", name: "Minimalist Matte Black Turtleneck", category: "techwear", prompt: "Sleek architectural black ribbed turtleneck sweater with titanium smart glasses and minimalist silver ring" },
  { id: "look_11_trench_coat", name: "Classic Double-Breasted Trench Coat", category: "executive", prompt: "Classic beige gabardine trench coat belted at the waist with patterned silk neck scarf and pearl stud earrings" },
  { id: "look_12_emerald_wrap", name: "Emerald Green Satin Wrap Dress", category: "broadcast", prompt: "Flowing emerald green liquid satin wrap dress with subtle v-neck, gold belt, and elegant fluid drape" },
];

export interface LookbookOptions {
  persona: Persona;
  count?: number; // default: 6 or 12
  categoryFilter?: string;
  engine: "agy" | "api" | "tool_json";
  dryRun?: boolean;
  preview?: boolean;
}

export async function runLookbookGenerator(options: LookbookOptions): Promise<void> {
  const persona = options.persona;
  const count = options.count || 6;
  const outfits = LOOKBOOK_CATALOG.slice(0, count);

  console.log("\n==================================================================");
  console.log(`👗 NEWSSTUDIO — AI VIRTUAL WARDROBE LOOKBOOK GENERATOR`);
  console.log("==================================================================");
  console.log(`Persona:      ${persona.name} [${persona.id}]`);
  console.log(`Total Outfits: ${outfits.length}`);
  console.log(`Engine:       ${options.engine.toUpperCase()}\n`);

  const avatarPath = resolvePersonaAvatarPath(persona);
  const hairstyle = resolveHairstylePrompt(persona, "signature");

  for (let i = 0; i < outfits.length; i++) {
    const o = outfits[i];
    const baseName = `${persona.id}_lookbook_${o.id}`;

    console.log(`------------------------------------------------------------------`);
    console.log(`👗 [${i + 1}/${outfits.length}] ${o.name} (${o.category.toUpperCase()})`);

    const prompt = `A photorealistic 9:16 high-fashion editorial wardrobe catalog portrait:
[SUBJECT IDENTITY & LIKENESS]: Match the ${persona.traits.age}-year-old news anchor ${persona.name} with ${persona.traits.face}, ${persona.traits.skinTone || "natural skin tone"}, ${hairstyle}.
[BODY PROPORTIONS & SILHOUETTE LOCK]: Strictly preserve authentic physique: ${persona.traits.build}. Height: ${persona.traits.heightCm}cm (${persona.traits.heightFeet}), Weight: ${persona.traits.weightKg}kg (${persona.traits.weightLbs}lbs). Maintain exact bust, waist, and hip contours.
[EXACT WARDROBE ATTIRE]: ${o.prompt}.
[FRAMING & WARDROBE EMPHASIS]: Full-body to knee-up vertical fashion catalog portrait standing with confident elegance in a clean minimalist architectural showroom studio. Clear focus on the entire garment, showing the full cut, fabric texture, seams, waistline, and drape. The complete outfit occupies the primary focus of the composition (not a tight face close-up). 5600K high-fashion studio lighting, 8k raw editorial photo quality.`;

    const compiled: CompiledScenePrompt = {
      prompt,
      imagePaths: avatarPath ? [avatarPath] : [],
      baseName,
      aspectRatio: "9:16",
    };


    if (options.dryRun) {
      console.log(`  [DRY-RUN] Base Name: ${baseName}`);
      console.log(`  [DRY-RUN] Prompt: "${prompt.slice(0, 100)}..."\n`);
      continue;
    }

    let generatedPath: string | null = null;
    if (options.engine === "agy") {
      generatedPath = await runWithAgy(compiled);
    } else if (options.engine === "api") {
      generatedPath = await runWithApi(compiled);
    } else {
      outputToolJson(compiled);
    }

    if (generatedPath && options.preview) {
      await renderTerminalImagePreview(generatedPath, 48);
    }
  }

  console.log("\n==================================================================");
  console.log(`🎉 LOOKBOOK GENERATION COMPLETE FOR ${persona.name.toUpperCase()}!`);
  console.log("==================================================================\n");
}
