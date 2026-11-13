/**
 * scripts/gemini-cli/loraDatasetGenerator.ts
 *
 * NewsStudio 48-Scenario Synthetic LoRA Dataset & Photoshoot Generator.
 * Extracted and streamlined from LoRA Dataset Studio V19.2.
 * Produces standardized multi-angle, multi-lighting, multi-attire datasets
 * with paired Kohya / Civitai trigger caption files (.txt).
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

export interface LoRAScenario {
  id: number;
  type: string;
  desc: string;
  bg: string;
  neg?: string;
  category: "angles" | "expressions" | "macro" | "props_gestures" | "full_body" | "camera_dynamics" | "lighting" | "wardrobe";
}

export const LORA_48_SCENARIOS: LoRAScenario[] = [
  // 1-7: Angles
  { id: 1, type: "Frontal Headshot", desc: "Full frontal headshot, looking directly at camera.", bg: "Solid, neutral medium-grey seamless studio backdrop.", category: "angles" },
  { id: 2, type: "45-Degree Left", desc: "45-degree three-quarter view from the left, looking slightly away.", bg: "Solid, neutral medium-grey seamless studio backdrop.", category: "angles" },
  { id: 3, type: "45-Degree Right", desc: "45-degree three-quarter view from the right.", bg: "Solid, neutral medium-grey seamless studio backdrop.", category: "angles" },
  { id: 4, type: "Profile Left", desc: "Hard 90-degree side profile view from the left, sharp jawline focus.", bg: "Solid, neutral medium-grey seamless studio backdrop.", category: "angles" },
  { id: 5, type: "Profile Right", desc: "Hard 90-degree side profile view from the right.", bg: "Solid, neutral medium-grey seamless studio backdrop.", category: "angles" },
  { id: 6, type: "Looking Up", desc: "Head tilted up, looking toward ceiling, exposing neck and underside of jaw.", bg: "Solid, neutral medium-grey seamless studio backdrop.", category: "angles" },
  { id: 7, type: "Looking Down", desc: "Head tilted down, looking toward floor, eyelids heavily visible.", bg: "Solid, neutral medium-grey seamless studio backdrop.", category: "angles" },

  // 8-14: Expressions
  { id: 8, type: "Slight Smile", desc: "Friendly professional closed-mouth smile, subtle cheek elevation.", bg: "Solid, neutral medium-grey seamless studio backdrop.", category: "expressions" },
  { id: 9, type: "Wide Smile", desc: "Wide open-mouth smile showing teeth prominently, joyful expression.", bg: "Solid, neutral medium-grey seamless studio backdrop.", category: "expressions" },
  { id: 10, type: "Speech O Vowel", desc: "Mid-speech, mouth formed in tight 'O' or 'U' vowel shape.", bg: "Solid, neutral medium-grey seamless studio backdrop.", category: "expressions" },
  { id: 11, type: "Speech E Vowel", desc: "Mid-speech, mouth stretched wide horizontally in 'E' or 'S' shape, teeth slightly parted.", bg: "Solid, neutral medium-grey seamless studio backdrop.", category: "expressions" },
  { id: 12, type: "Blinking Eyes Closed", desc: "Eyes completely closed, neutral face, highlighting eyelid skin texture.", bg: "Solid, neutral medium-grey seamless studio backdrop.", category: "expressions" },
  { id: 13, type: "Serious Concerned", desc: "Serious and concerned expression, deeply furrowed brow, narrowed eyes.", bg: "Solid, neutral medium-grey seamless studio backdrop.", category: "expressions" },
  { id: 14, type: "Candid Laugh", desc: "Candid mid-laugh, mouth wide open, eyes crinkling.", bg: "Solid, neutral medium-grey seamless studio backdrop.", category: "expressions" },

  // 15: Macro
  { id: 15, type: "Extreme Macro Eyes", desc: "Extreme close-up macro photography focusing tightly on eyes, iris catchlights, and nose bridge.", bg: "Out of focus void, neutral grey blur.", category: "macro" },

  // 16-28: Broadcast Gestures & Props
  { id: 16, type: "Neck Rotation", desc: "Medium shot, shoulders facing forward but neck rotated 45 degrees looking to side, capturing neck anatomy.", bg: "Solid, neutral medium-grey seamless studio backdrop.", category: "props_gestures" },
  { id: 17, type: "Touching Hair Face", desc: "Medium close-up, one hand casually tucking hair behind ear or adjusting collar.", bg: "Solid, neutral medium-grey seamless studio backdrop.", category: "props_gestures" },
  { id: 18, type: "Open Palm Gesture", desc: "Medium shot, both hands raised in open-palm explaining gesture, dynamic broadcast pose.", bg: "Solid, neutral medium-grey seamless studio backdrop.", category: "props_gestures" },
  { id: 19, type: "Drinking from Mug", desc: "Medium close-up, holding branded ceramic coffee mug near mouth, lips slightly parted.", bg: "Solid, neutral medium-grey seamless studio backdrop.", category: "props_gestures" },
  { id: 20, type: "Hands Near Chin", desc: "Medium shot, hands raised near chin in thoughtful analytical posture.", bg: "Solid, neutral medium-grey seamless studio backdrop.", category: "props_gestures" },
  { id: 21, type: "Holding Microphone", desc: "Medium close-up, holding broadcast news microphone up to mouth, engaged expression.", bg: "Solid, neutral medium-grey seamless studio backdrop.", category: "props_gestures" },
  { id: 22, type: "Reading Script Papers", desc: "Waist-up shot, looking down slightly, holding printed news script document stack in hands.", bg: "Solid, neutral medium-grey seamless studio backdrop.", category: "props_gestures" },
  { id: 23, type: "Taking Notes Pen", desc: "Waist-up shot, seated at desk, looking down writing on notepad with silver pen.", bg: "Solid, neutral medium-grey seamless studio backdrop with minimalist desk.", category: "props_gestures" },
  { id: 24, type: "Typing on Laptop", desc: "Waist-up shot, seated at desk, hands actively typing on sleek modern silver laptop.", bg: "Solid, neutral medium-grey seamless studio backdrop with minimalist desk.", category: "props_gestures" },
  { id: 25, type: "Touching IFB Earpiece", desc: "Medium close-up, pressing one finger against IFB earpiece in ear, listening intently to producer.", bg: "Solid, neutral medium-grey seamless studio backdrop.", category: "props_gestures" },
  { id: 26, type: "Pointing at Graphic", desc: "Waist-up shot, standing, gesturing and pointing firmly to side at digital graphic zone.", bg: "Solid, neutral medium-grey seamless studio backdrop.", category: "props_gestures" },
  { id: 27, type: "Leaning on News Desk", desc: "Waist-up shot, standing behind news desk, leaning forward with hands flat on desk.", bg: "Solid, neutral medium-grey seamless studio backdrop with minimalist desk.", category: "props_gestures" },
  { id: 28, type: "Interview Listening", desc: "Medium shot, angled slightly, holding microphone out towards off-screen guest, listening attentively.", bg: "Solid, neutral medium-grey seamless studio backdrop.", category: "props_gestures" },

  // 29-35: Full Body Postures
  { id: 29, type: "Full Body Neutral", desc: "EXTREME WIDE SHOT. Full body standing, looking at camera. Entire body from head to toe visible including shoes.", bg: "Solid, neutral medium-grey seamless studio cyclorama wall.", category: "full_body" },
  { id: 30, type: "Full Body Walking Front", desc: "EXTREME WIDE SHOT. Full body walking toward camera, dynamic stride, head to toe visible.", bg: "Solid, neutral medium-grey seamless studio cyclorama wall.", category: "full_body" },
  { id: 31, type: "Full Body Walking Left", desc: "EXTREME WIDE SHOT. Full body walking laterally from left to right, head to toe visible.", bg: "Solid, neutral medium-grey seamless studio cyclorama wall.", category: "full_body" },
  { id: 32, type: "Full Body Walking Right", desc: "EXTREME WIDE SHOT. Full body walking laterally from right to left, head to toe visible.", bg: "Solid, neutral medium-grey seamless studio cyclorama wall.", category: "full_body" },
  { id: 33, type: "Full Body Looking Back", desc: "EXTREME WIDE SHOT. Full body walking away from camera looking back over shoulder.", bg: "Solid, neutral medium-grey seamless studio cyclorama wall.", category: "full_body" },
  { id: 34, type: "Seated Waist-Up Desk", desc: "Waist-up shot, seated neutrally behind minimalist modern news desk.", bg: "Solid, neutral medium-grey seamless studio backdrop.", category: "full_body" },
  { id: 35, type: "Full Body Stool Sitting", desc: "EXTREME WIDE SHOT. Full body sitting casually on tall studio stool with legs crossed, head to toe visible.", bg: "Solid, neutral medium-grey seamless studio cyclorama wall.", category: "full_body" },

  // 36-39: Camera Dynamics
  { id: 36, type: "Over-The-Shoulder", desc: "View from behind shoulder, back of head visible, face turned in profile.", bg: "Solid, neutral medium-grey seamless studio backdrop.", category: "camera_dynamics" },
  { id: 37, type: "High Angle", desc: "High camera angle looking down at subject, dynamic perspective.", bg: "Solid, neutral medium-grey seamless studio backdrop.", category: "camera_dynamics" },
  { id: 38, type: "Low Angle", desc: "Low camera angle looking up at subject, imposing authoritative perspective.", bg: "Solid, neutral medium-grey seamless studio backdrop.", category: "camera_dynamics" },
  { id: 39, type: "Dutch Angle 30deg", desc: "Dynamic medium shot tilted at 30-degree Dutch angle, dramatic broadcast framing.", bg: "Solid, neutral medium-grey seamless studio backdrop.", category: "camera_dynamics" },

  // 40-43: Lighting Variations
  { id: 40, type: "Harsh Side Light", desc: "Dramatic chiaroscuro side-lighting, deep shadows on one side of face.", bg: "Pitch black studio void.", category: "lighting" },
  { id: 41, type: "Soft High-Key Light", desc: "Flat, even clinical high-key softbox illumination, bright clean white detail.", bg: "Bright solid white backdrop.", category: "lighting" },
  { id: 42, type: "Golden Hour Backlight", desc: "Warm sunset backlight causing golden rim-light effect on hair.", bg: "Soft blurred twilight studio background.", category: "lighting" },
  { id: 43, type: "Cinematic Noir Glow", desc: "Dark moody lighting, illuminated by cool digital screen glow.", bg: "Dark, moody room, out of focus.", category: "lighting" },

  // 44-48: Wardrobe & Styling
  { id: 44, type: "Casual White T-Shirt", desc: "Wearing a simple plain casual white crewneck t-shirt, relaxed styling.", bg: "Solid, neutral medium-grey seamless studio backdrop.", category: "wardrobe" },
  { id: 45, type: "Formal Sleek Pantsuit", desc: "Wearing a tailored, modern white executive pantsuit with sharp lapels.", bg: "Solid, neutral medium-grey seamless studio backdrop.", category: "wardrobe" },
  { id: 46, type: "Hair Tied Back", desc: "Hair tied back tightly in a sleek bun, completely exposing jawline and ears.", bg: "Solid, neutral medium-grey seamless studio backdrop.", category: "wardrobe" },
  { id: 47, type: "Reading Glasses", desc: "Wearing professional titanium wire-rimmed designer reading glasses.", bg: "Solid, neutral medium-grey seamless studio backdrop.", category: "wardrobe" },
  { id: 48, type: "The Masterpiece", desc: "Cinematic masterpiece broadcast portrait, signature attire, perfect studio lighting and composition.", bg: "Rich, out-of-focus professional broadcast newsroom.", category: "wardrobe" },
];

export interface LoRADatasetOptions {
  persona: Persona;
  outputDir?: string;
  count?: number; // 28 or 48 (default: 28)
  categoryFilter?: string;
  engine?: "agy" | "api" | "tool_json";
  dryRun?: boolean;
}

export function compileLoRAScenarioPrompt(
  persona: Persona,
  scenario: LoRAScenario,
  triggerWord: string = persona.id
): { prompt: string; caption: string } {
  const t = persona.traits;
  const genderTag = persona.gender === "male" ? "man, male news anchor" : "woman, female news anchor";
  const hairstyle = resolveHairstylePrompt(persona, "signature");

  const prompt = `A professional master studio photography shot for LoRA training depicting ${triggerWord}, a ${t.age}-year-old ${genderTag} (${persona.name}):
[IDENTITY & FACIAL CONTINUITY]:
• Use Reference 1 ONLY to match the facial features, eye color, ${t.face}, ${t.skinTone || "natural skin tone"}, and ${hairstyle} of ${persona.name}.
• DO NOT copy the frontal pose or neutral expression of Reference 1.

[CAMERA ANGLE & SPECIFIC POSE]:
• ${scenario.desc}

[STUDIO ENVIRONMENT & LIGHTING]:
• Backdrop: ${scenario.bg}
• Lighting & Optics: Professional 5600K studio broadcast lighting, razor-sharp focus, natural skin pore texture, 8k raw photo quality, neutral color grading.`;

  // Standard Kohya LoRA Trigger Caption
  const caption = `${triggerWord}, ${genderTag}, ${t.age} years old, ${t.face}, ${hairstyle}, ${scenario.type.toLowerCase()}, ${scenario.desc}, ${scenario.bg}, high quality, 8k, raw photo`;

  return { prompt, caption };
}


export async function runLoRADatasetGenerator(options: LoRADatasetOptions): Promise<void> {
  const persona = options.persona;
  const count = options.count || 28;
  const scenarios = LORA_48_SCENARIOS.slice(0, count);

  const datasetDir = options.outputDir || path.join(
    process.cwd(),
    "public",
    "avatars",
    `master_${persona.id}_archive`,
    "lora_dataset"
  );

  if (!fs.existsSync(datasetDir)) {
    fs.mkdirSync(datasetDir, { recursive: true });
  }

  console.log("\n==================================================================");
  console.log(`🤖 NEWSSTUDIO — SYNTHETIC LORA DATASET GENERATOR (${count} SCENARIOS)`);
  console.log("==================================================================");
  console.log(`Persona:      ${persona.name} [${persona.id}] (${persona.gender})`);
  console.log(`Dataset Path: ${datasetDir}`);
  console.log(`Total Shots:  ${scenarios.length}`);
  console.log(`Engine:       ${(options.engine || "agy").toUpperCase()}\n`);

  const avatarRef = resolvePersonaAvatarPath(persona);
  const imagePaths = avatarRef && fs.existsSync(avatarRef) ? [avatarRef] : [];

  for (let i = 0; i < scenarios.length; i++) {
    const s = scenarios[i];
    const indexStr = String(s.id).padStart(2, "0");
    const baseName = `${persona.id}_lora_${indexStr}_${s.type.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
    const imgDest = path.join(datasetDir, `${indexStr}.png`);
    const txtDest = path.join(datasetDir, `${indexStr}.txt`);

    const { prompt, caption } = compileLoRAScenarioPrompt(persona, s, persona.id);

    // Save caption file
    fs.writeFileSync(txtDest, caption, "utf-8");

    console.log(`[${i + 1}/${scenarios.length}] Scenario ${indexStr}: ${s.type} (${s.category})`);
    console.log(`  Caption: "${caption}"`);

    if (options.dryRun) {
      console.log(`  [DRY-RUN] Prompt: "${prompt}"\n`);
      continue;
    }

    const compiled: CompiledScenePrompt = {
      prompt,
      imagePaths,
      baseName,
      aspectRatio: s.category === "full_body" ? "9:16" : "1:1",
    };

    let generatedPath: string | null = null;
    if (options.engine === "api") {
      generatedPath = await runWithApi(compiled);
    } else if (options.engine === "tool_json") {
      outputToolJson(compiled);
    } else {
      generatedPath = await runWithAgy(compiled);
    }

    if (generatedPath && fs.existsSync(generatedPath)) {
      fs.copyFileSync(generatedPath, imgDest);
      console.log(`  ✅ Saved: ${imgDest}\n`);
    }
  }

  console.log("\n==================================================================");
  console.log(`🎉 LoRA Dataset Generation Complete!`);
  console.log(`📁 Dataset Folder: file:///${datasetDir.replace(/\\/g, "/")}`);
  console.log("==================================================================\n");
}
