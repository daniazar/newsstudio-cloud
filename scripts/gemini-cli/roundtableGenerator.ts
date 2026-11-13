/**
 * scripts/gemini-cli/roundtableGenerator.ts
 *
 * NewsStudio 3-Presenter Roundtable & Presidential Debate Stage Compositor.
 * Fuses 3 Anchor Personas into a single stitched multi-character reference strip
 * and conditions directly on our official studio environment plate.
 */

import fs from "fs";
import path from "path";
import sharp from "sharp";
import { Persona, PERSONAS } from "../../src/lib/tts/personas";
import { resolvePersonaAvatarPath } from "./personaAttires";
import { STUDIO_PLATES_CATALOG } from "./studioCatalog";
import { CompiledScenePrompt } from "./types";
import { runWithAgy } from "./engines/agyRunner";
import { runWithApi } from "./engines/apiRunner";
import { outputToolJson } from "./engines/jsonRunner";
import { renderTerminalImagePreview } from "./terminalPreview";

export interface RoundtableLayout {
  id: string;
  name: string;
  description: string;
  deskPrompt: string;
  lightingPrompt: string;
  studioPlateKey?: string;
}

export const ROUNDTABLE_LAYOUTS: Record<string, RoundtableLayout> = {
  crescent_debate_desk: {
    id: "crescent_debate_desk",
    name: "🏛️ Curved Crescent Glass Anchor Desk (Full Skyline)",
    description: "Curved tempered-glass and brushed-aluminum broadcast news desk centered in front of panoramic floor-to-ceiling windows overlooking a blue twilight skyscraper skyline",
    deskPrompt: "seated side-by-side in separate black leather executive chairs behind the wide curved glass broadcast news desk from Reference 2, with papers, tablets, and studio microphones on the desk surface",
    lightingPrompt: "High-end 3-zone broadcast studio softbox lighting (5600K), matched key lights across all three presenters, realistic specular reflections on glass desk",
    studioPlateKey: "section_01_anchor_desk",
  },
  sunday_political_roundtable: {
    id: "sunday_political_roundtable",
    name: "☕ Sunday Morning Political Talk Show Lounge",
    description: "Intimate circular wooden broadcast talk-show set with warm vertical acoustic oak slat walls, soft ambient amber backlighting, and modern studio cameras visible in periphery",
    deskPrompt: "seated closely around a rich circular walnut table with water glasses and news documents, engaged in an analytical panel discussion",
    lightingPrompt: "Warm 3200K tungsten studio lighting with deep soft shadows and professional broadcast depth of field",
    studioPlateKey: "section_03_lounge_interview",
  },
  futuristic_panel_platform: {
    id: "futuristic_panel_platform",
    name: "⚡ 8K Video Wall Presidential Debate Stage",
    description: "Three separate high-tech illuminated glass debate lecterns on an elevated polished dark floor in front of an 8K curved panoramic video wall",
    deskPrompt: "standing behind three distinct sleek glass debate lecterns evenly spaced across the wide stage in front of the 8K video wall from Reference 2",
    lightingPrompt: "Bold architectural stage spotlights with blue and white key lights, majestic prime-time broadcast debate television production value",
    studioPlateKey: "section_02_videowall_flat",
  },
};

export interface RoundtableOptions {
  persona1: Persona; // Left
  persona2: Persona; // Center (Host)
  persona3: Persona; // Right
  layoutKey?: string;
  aspectRatio?: "16:9" | "32:9" | "21:9";
  engine: "agy" | "api" | "tool_json";
  dryRun?: boolean;
  preview?: boolean;
}

/**
 * Combines the 3 individual persona avatars horizontally into a single 3-in-1 character strip.
 * This allows passing all 3 personas as Reference 1, freeing Reference 2 for our actual studio environment plate.
 */
export async function createStitched3AnchorReference(
  p1: Persona,
  p2: Persona,
  p3: Persona
): Promise<string> {
  const geminiDir = path.join(process.cwd(), ".gemini");
  if (!fs.existsSync(geminiDir)) {
    fs.mkdirSync(geminiDir, { recursive: true });
  }

  const outputPath = path.join(geminiDir, `stitched_3anchors_${p1.id}_${p2.id}_${p3.id}.png`);

  const p1Path = resolvePersonaAvatarPath(p1);
  const p2Path = resolvePersonaAvatarPath(p2);
  const p3Path = resolvePersonaAvatarPath(p3);

  const targetHeight = 768;
  const targetWidth = 512;

  const b1 = await sharp(p1Path).resize(targetWidth, targetHeight, { fit: "cover", position: "top" }).toBuffer();
  const b2 = await sharp(p2Path).resize(targetWidth, targetHeight, { fit: "cover", position: "top" }).toBuffer();
  const b3 = await sharp(p3Path).resize(targetWidth, targetHeight, { fit: "cover", position: "top" }).toBuffer();

  await sharp({
    create: {
      width: targetWidth * 3,
      height: targetHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    },
  })
    .composite([
      { input: b1, left: 0, top: 0 },
      { input: b2, left: targetWidth, top: 0 },
      { input: b3, left: targetWidth * 2, top: 0 },
    ])
    .png()
    .toFile(outputPath);

  return outputPath;
}

export async function compileRoundtablePrompt(
  p1: Persona,
  p2: Persona,
  p3: Persona,
  layout: RoundtableLayout,
  aspectRatio: string = "16:9"
): Promise<CompiledScenePrompt> {
  // 1. Create Stitched 3-in-1 Character Reference Plate (Reference 1)
  const stitchedCharacterRefPath = await createStitched3AnchorReference(p1, p2, p3);

  // 2. Resolve our Studio Environment Plate (Reference 2)
  const plateKey = layout.studioPlateKey || "section_01_anchor_desk";
  const plate = STUDIO_PLATES_CATALOG[plateKey] || STUDIO_PLATES_CATALOG.section_01_anchor_desk;
  const fullPlatePath = path.resolve(plate.relativePath);

  const imagePaths: string[] = [stitchedCharacterRefPath];
  if (fs.existsSync(fullPlatePath)) {
    imagePaths.push(fullPlatePath);
  }

  const prompt = `A photorealistic ${aspectRatio} wide-angle broadcast studio television scene masterfully composing the provided reference images:
[MULTI-IMAGE REFERENCE BINDING]:
• SUBJECT IDENTITIES FROM REFERENCE 1 (3-Anchor Reference Strip):
  - LEFT ANCHOR: Match the exact likeness, face, and copper hair of 34-year-old female anchor ${p1.name} from the LEFT panel of Reference 1, dressed in tailored emerald green broadcast attire.
  - CENTER ANCHOR (MAIN HOST): Match the exact likeness, chiseled jaw, and salt-and-pepper hair of 38-year-old male anchor ${p2.name} from the CENTER panel of Reference 1, dressed in dark navy executive suit.
  - RIGHT ANCHOR: Match the exact likeness, diamond face, and platinum bob of 24-year-old female anchor ${p3.name} from the RIGHT panel of Reference 1, dressed in stylish metallic blazer.

• STUDIO ENVIRONMENT & ROOM CONTINUITY FROM REFERENCE 2:
  - Seamlessly place all three anchors directly into the physical broadcast studio set from Reference 2 (${plate.description}).
  - Replicate the exact physical curved glass news desk, executive chairs, window architecture, and blue twilight skyscraper skyline from Reference 2.
  - All three anchors are ${layout.deskPrompt}.

[CAMERA & BROADCAST LIGHTING]:
• Shot on 24mm wide broadcast studio lens, capturing all 3 anchors waist-up behind the exact desk from Reference 2 with generous room for the studio set and panoramic city skyline.
• ${layout.lightingPrompt}. Sharp focus across all three anchors, realistic skin textures, 8k raw photo quality, master television broadcast production.`;

  return {
    prompt,
    imagePaths,
    baseName: `roundtable_${p1.id}_${p2.id}_${p3.id}_${Date.now().toString().slice(-6)}`,
    aspectRatio,
  };
}

export async function runRoundtableMode(options: RoundtableOptions): Promise<string | null> {
  const layout = ROUNDTABLE_LAYOUTS[options.layoutKey || "crescent_debate_desk"] || ROUNDTABLE_LAYOUTS.crescent_debate_desk;
  const aspectRatio = options.aspectRatio || "16:9";

  console.log("\n==================================================================");
  console.log(`🎙️ NEWSSTUDIO — 3-PRESENTER ROUNDTABLE & DEBATE GENERATOR`);
  console.log("==================================================================");
  console.log(`Left Anchor:   ${options.persona1.name} [${options.persona1.id}]`);
  console.log(`Center Host:   ${options.persona2.name} [${options.persona2.id}]`);
  console.log(`Right Anchor:  ${options.persona3.name} [${options.persona3.id}]`);
  console.log(`Studio Layout: ${layout.name}`);
  console.log(`Aspect Ratio:  ${aspectRatio}`);
  console.log(`Engine:        ${options.engine.toUpperCase()}\n`);

  console.log("Compositing 3-in-1 Character Reference Plate...");
  const compiled = await compileRoundtablePrompt(options.persona1, options.persona2, options.persona3, layout, aspectRatio);
  console.log(`Image Name:    ${compiled.baseName}`);
  console.log(`Reference Plates Attached: ${compiled.imagePaths.length}`);
  console.log(`  [1] 3-in-1 Persona Strip: ${compiled.imagePaths[0]}`);
  if (compiled.imagePaths[1]) {
    console.log(`  [2] Studio Plate (Environment): ${compiled.imagePaths[1]}`);
  }
  console.log(`\nPrompt:\n"${compiled.prompt}"\n`);

  if (options.dryRun) {
    console.log("ℹ️ [DRY-RUN] Roundtable prompt compiled successfully without invoking generator.\n");
    return null;
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
    await renderTerminalImagePreview(generatedPath, 64);
  }

  return generatedPath;
}
