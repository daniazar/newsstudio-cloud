/**
 * scripts/gemini-cli/wizard/handlers/clonePersonaHandler.ts
 *
 * Interactive Handler for the Persona Cloning Studio Workflow in Gemini Image CLI.
 * Takes a photo, extracts full persona & body proportions via Gemini Vision,
 * registers the persona, and seamlessly offers instant generation with the cloned persona.
 */

import prompts from "prompts";
import fs from "fs";
import path from "path";
import { clonePersonaFromImage } from "../../../../src/lib/personas/personaCloner";
import { getAttiresForPersona } from "../../personaAttires";
import { compileCompositeScene } from "../../promptCompiler";
import { runWithAgy } from "../../engines/agyRunner";
import { runWithApi } from "../../engines/apiRunner";
import { outputToolJson } from "../../engines/jsonRunner";
import { handleDomainSetWorkflow } from "./domainSetHandler";
import { handleThumbnailWorkflow } from "./thumbnailHandler";
import { handleLookbookWorkflow } from "./lookbookHandler";
import { handleSingleSceneConfigPrompt } from "./singleSceneHandler";

export async function handleClonePersonaWorkflow(initialImagePath?: string): Promise<void> {
  console.log("\n=======================================================");
  console.log("🧬 NEWSSTUDIO — VISION PERSONA CLONING STUDIO");
  console.log("=======================================================");
  console.log("Transform any photograph into a fully registered broadcast news anchor.");
  console.log("Forensically extracts body proportions (bust size, waist, hips), face, hair, and wardrobe.\n");

  let imagePath = initialImagePath;

  if (!imagePath) {
    const fileRes = await prompts({
      type: "text",
      name: "imagePath",
      message: "Enter the file path of the persona photograph to clone (PNG, JPG, WEBP):",
      validate: (val) => {
        if (!val || val.trim().length === 0) return "Please enter a valid file path.";
        const resolved = path.isAbsolute(val) ? val : path.resolve(process.cwd(), val);
        if (!fs.existsSync(resolved)) return `File not found: ${val}`;
        return true;
      },
    });

    if (!fileRes.imagePath) {
      console.log("❌ Persona cloning cancelled.");
      return;
    }

    imagePath = fileRes.imagePath.trim();
  }

  const resolvedImagePath = path.isAbsolute(imagePath) ? imagePath : path.resolve(process.cwd(), imagePath);

  // Optional overrides
  const customOpts = await prompts([
    {
      type: "text",
      name: "name",
      message: "Anchor Name (Leave blank for AI-generated name):",
    },
    {
      type: "text",
      name: "role",
      message: "Anchor Role / Beat (e.g. 'Senior Tech Reporter', leave blank for AI):",
    },
    {
      type: "select",
      name: "language",
      message: "Broadcast Primary Language:",
      choices: [
        { title: "🇺🇸 English (en)", value: "en" },
        { title: "🇦🇷 Spanish (es)", value: "es" },
        { title: "🇫🇷 French (fr)", value: "fr" },
        { title: "🇮🇹 Italian (it)", value: "it" },
        { title: "🇩🇪 German (de)", value: "de" },
        { title: "🇧🇷 Portuguese (pt)", value: "pt" },
        { title: "🇨🇳 Chinese (zh)", value: "zh" },
        { title: "🇯🇵 Japanese (ja)", value: "ja" },
      ],
      initial: 0,
    },
    {
      type: "text",
      name: "guidance",
      message: "Additional Character Notes or Attire Preferences (optional):",
    },
  ]);

  const transformPrompt = await prompts({
    type: "multiselect",
    name: "selectedTransforms",
    message: "✨ Apply Persona Transformations & Modifiers? (Optional)",
    choices: [
      { title: "👶 Rejuvenate / De-age Persona (Radiant youthful skin, vitality, preserved facial geometry)", value: "REJUVENATE" },
      { title: "💄 Broadcast Studio Glamour (HD studio hair, refined skin, luminous lighting)", value: "GLAMOUR" },
      { title: "🔄 Gender Swap (Generate opposite-gender counterpart anchor with matching likeness)", value: "GENDER_SWAP" },
      { title: "💃 Sculpt Body Proportions (Athletic toned, Voluptuous hourglass, Slender runway, Muscular)", value: "BODY_MOD" },
      { title: "👗 Overhaul Wardrobe (Replace casual clothes with Executive Suit, Gala Gown, or Techwear)", value: "OUTFIT_OVERHAUL" },
    ],
    hint: "Space to select, Enter to continue",
  });

  const transforms = transformPrompt.selectedTransforms || [];
  let rejuvenate: any;
  let glamourLevel: any;
  let genderSwap = false;
  let bodyMod: any;
  let outfitPreset: any;

  if (transforms.includes("REJUVENATE")) {
    const ageChoice = await prompts({
      type: "select",
      name: "preset",
      message: "Select Rejuvenation / Age Target:",
      choices: [
        { title: "🌱 Young Rookie Presenter (21-25yo) — Fresh, radiant, smooth contours", value: "young_rookie" },
        { title: "⭐ Prime-Time Lead Anchor (29-34yo) — Commanding poise, vibrant broadcast presence", value: "prime_anchor" },
        { title: "🏛️ Distinguished Senior Expert (55-65yo) — Seasoned authority, silver-accented hair", value: "mature_senior" },
      ],
    });
    rejuvenate = ageChoice.preset;
  }

  if (transforms.includes("GLAMOUR")) {
    glamourLevel = "broadcast_studio_hd";
  }

  if (transforms.includes("GENDER_SWAP")) {
    genderSwap = true;
  }

  if (transforms.includes("BODY_MOD")) {
    const bodyChoice = await prompts({
      type: "select",
      name: "type",
      message: "Select Body Sculpting Target:",
      choices: [
        { title: "🏋️ Athletic Toned (Defined waist, athletic tone, firm posture)", value: "athletic_toned" },
        { title: "⏳ Voluptuous Curvy Hourglass (34D/36DD bust, 25-inch waist, 38-inch curved hips)", value: "voluptuous_hourglass" },
        { title: "👗 Slender Runway Model (32B bust, 23-inch waist, 34-inch hips, tall silhouette)", value: "slender_runway" },
        { title: "💪 Muscular Bodybuilder / Power Build (Broad chest, tapered v-torso)", value: "muscular_bodybuilder" },
        { title: "✨ Curvy Plus Elegance (38DDD bust, 32-inch waist, 42-inch hips)", value: "curvy_plus" },
      ],
    });
    bodyMod = bodyChoice.type;
  }

  if (transforms.includes("OUTFIT_OVERHAUL")) {
    const outfitChoice = await prompts({
      type: "select",
      name: "preset",
      message: "Select Wardrobe Overhaul Preset:",
      choices: [
        { title: "👔 Executive Royal Cobalt Blue Suit & Silk Camisole", value: "executive_anchor_suit" },
        { title: "👗 Emerald Green Satin Gala Evening Gown", value: "cocktail_gala" },
        { title: "⚡ Cyberpunk Dark Techwear Jacket with LED Accents", value: "cyberpunk_techwear" },
        { title: "🧥 All-Weather Media Press Field Reporter Storm Jacket", value: "outdoor_storm_jacket" },
      ],
    });
    outfitPreset = outfitChoice.preset;
  }

  console.log("\n🔍 Analyzing photo with Gemini Vision AI & applying transformations...");
  console.log("   Extracting facial landmarks, body type, bust/waist/hip proportions, and broadcast demeanor...\n");

  try {
    const result = await clonePersonaFromImage({
      imagePath: resolvedImagePath,
      name: customOpts.name?.trim() || undefined,
      role: customOpts.role?.trim() || undefined,
      language: customOpts.language,
      guidance: customOpts.guidance?.trim() || undefined,
      rejuvenate,
      glamourLevel,
      genderSwap,
      bodyMod,
      outfitPreset,
    });

    const p = result.persona;
    const t = p.traits;

    console.log("\n=======================================================");
    console.log(`✅ PERSONA CLONED SUCCESSFULLY: ${p.name.toUpperCase()} (${p.id.toUpperCase()})`);
    console.log("=======================================================");
    console.log(`👤 Identity:        ${p.name} | ${p.title} | ${p.language.toUpperCase()} (${p.gender})`);
    console.log(`📏 Measurements:    ${t.age}yo | ${t.heightCm}cm (${t.heightFeet}) | ${t.weightKg}kg (${t.weightLbs}lbs)`);
    console.log(`💃 Body Type & Bust: ${t.build}`);
    console.log(`💇 Hair:            ${t.hair}`);
    console.log(`👁️ Face & Eyes:     ${t.face}`);
    console.log(`🎨 Skin:            ${t.skinTone} (${t.skinTexture || "Natural pores"})`);
    console.log(`👗 Default Attire:  ${t.defaultAttire}`);
    console.log(`📁 Avatar Saved:    ${result.avatarLocalPath}`);
    console.log(`📁 Master Archive:  ${result.masterArchivePath}`);
    console.log("=======================================================\n");

    const nextAction = await prompts({
      type: "select",
      name: "action",
      message: `🚀 Would you like to generate scenes with cloned anchor "${p.name}" now?`,
      choices: [
        { title: `🏛️ Generate Domain Keyframe Suite (M1..MK) for ${p.name}`, value: "domain_set" },
        { title: `👗 Generate AI Virtual Wardrobe Lookbook (12 Outfits) for ${p.name}`, value: "lookbook" },
        { title: `🔥 Generate High-CTR YouTube Video Thumbnail for ${p.name}`, value: "thumbnail" },
        { title: `⚡ Generate Single Broadcast Scene with ${p.name}`, value: "single_scene" },
        { title: `✅ Done (Exit and use in any CLI or Web Studio UI)`, value: "done" },
      ],
    });

    if (nextAction.action === "domain_set") {
      await handleDomainSetWorkflow(p.id);
    } else if (nextAction.action === "lookbook") {
      await handleLookbookWorkflow(p.id);
    } else if (nextAction.action === "thumbnail") {
      await handleThumbnailWorkflow(p.id);
    } else if (nextAction.action === "single_scene") {
      const res = await handleSingleSceneConfigPrompt(p);
      if (res && res.config) {
        const availableAttires = await getAttiresForPersona(p);
        const resolvedAttire = availableAttires.find((a) => a.id === res.config.wardrobeKey);
        const compiled = compileCompositeScene(res.config, resolvedAttire);
        if (res.engine === "agy") {
          await runWithAgy(compiled);
        } else if (res.engine === "api") {
          await runWithApi(compiled);
        } else {
          outputToolJson(compiled);
        }
      }
    } else {
      console.log(`\n🎉 Cloned persona "${p.name}" (${p.id}) is now ready across all tools!`);
    }
  } catch (err: any) {
    console.error(`\n❌ Persona cloning failed: ${err?.message || err}`);
  }
}
