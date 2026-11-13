/**
 * scripts/gemini-cli/dualAnchorGenerator.ts
 *
 * Dual-Presenter & Co-Anchor Interview Mode Generator.
 * Composes two distinct persona identities into a shared broadcast scene (Anchor Desk two-shot,
 * Mega Video Wall split standup, or Interview Lounge armchairs) with matched lighting and chemistry.
 */

import { Persona } from "../../src/lib/tts/personas";
import { PersonaAttire, CompiledScenePrompt } from "./types";
import { resolvePersonaAvatarPath, getAttiresForPersona } from "./personaAttires";
import { resolveHairstylePrompt } from "./hairstylePresets";
import { STUDIO_PLATES_CATALOG } from "./studioCatalog";
import { LIGHTING_PRESETS } from "./lightingPresets";
import { runWithAgy } from "./engines/agyRunner";
import { runWithApi } from "./engines/apiRunner";
import { outputToolJson } from "./engines/jsonRunner";
import { renderTerminalImagePreview } from "./terminalPreview";
import fs from "fs";
import path from "path";

export interface DualAnchorScenario {
  id: string;
  name: string;
  sceneFormat: "desk_twoshot" | "lounge_interview" | "videowall_dual_standup";
  interactionStyle: "co_anchors_presenting" | "host_interviewing_guest" | "intense_debate";
}

export const DUAL_ANCHOR_SCENARIOS: Record<string, DualAnchorScenario> = {
  desk_dialogue_formal: {
    id: "desk_dialogue_formal",
    name: "🎙️ Prime-Time Co-Anchor Desk Two-Shot (Formal Co-Delivery)",
    sceneFormat: "desk_twoshot",
    interactionStyle: "co_anchors_presenting",
  },
  lounge_in_depth_interview: {
    id: "lounge_in_depth_interview",
    name: "🛋️ Interview Lounge In-Depth Conversation (Host & Guest)",
    sceneFormat: "lounge_interview",
    interactionStyle: "host_interviewing_guest",
  },
  videowall_breaking_standup: {
    id: "videowall_breaking_standup",
    name: "📊 Mega Video Wall Interactive Data Standup",
    sceneFormat: "videowall_dual_standup",
    interactionStyle: "co_anchors_presenting",
  },
  desk_intense_debate: {
    id: "desk_intense_debate",
    name: "⚡ 360° Heated Crossfire Debate (Dynamic Counterpoints)",
    sceneFormat: "desk_twoshot",
    interactionStyle: "intense_debate",
  },
};

export interface DualAnchorOptions {
  persona1: Persona;
  attire1?: PersonaAttire;
  hairstyle1?: string;
  persona2: Persona;
  attire2?: PersonaAttire;
  hairstyle2?: string;
  scenarioKey?: string;
  sceneFormat?: "desk_twoshot" | "lounge_interview" | "videowall_dual_standup";
  lightingKey?: string;
  aspectRatio?: string;
  interactionStyle?: "co_anchors_presenting" | "host_interviewing_guest" | "intense_debate";
  engine: "agy" | "api" | "tool_json";
  dryRun?: boolean;
  preview?: boolean;
  imageName?: string;
}

export function compileDualAnchorScene(options: DualAnchorOptions): CompiledScenePrompt {
  const persona1 = options.persona1;
  const persona2 = options.persona2;
  const scenario = options.scenarioKey ? DUAL_ANCHOR_SCENARIOS[options.scenarioKey] : undefined;

  const sceneFormat = options.sceneFormat || scenario?.sceneFormat || "desk_twoshot";
  const interactionStyle = options.interactionStyle || scenario?.interactionStyle || "co_anchors_presenting";
  const lightingKey = options.lightingKey || "prime_time_bright";
  const aspectRatio = options.aspectRatio || "16:9";

  const attire1Desc = options.attire1?.description || persona1.traits.defaultAttire || "Professional tailored broadcast newsroom attire";
  const attire2Desc = options.attire2?.description || persona2.traits.defaultAttire || "Professional tailored broadcast newsroom attire";

  const light = LIGHTING_PRESETS[lightingKey] || LIGHTING_PRESETS.prime_time_bright;
  const hair1 = resolveHairstylePrompt(persona1, options.hairstyle1);
  const hair2 = resolveHairstylePrompt(persona2, options.hairstyle2);

  const imagePaths: string[] = [];
  const p1Path = resolvePersonaAvatarPath(persona1);
  const p2Path = resolvePersonaAvatarPath(persona2);

  if (p1Path) imagePaths.push(p1Path);
  if (p2Path) imagePaths.push(p2Path);

  let formatDesc = "Seated together side-by-side behind the curved glass anchor desk, both facing camera with professional broadcast chemistry";
  let studioPlate = STUDIO_PLATES_CATALOG.section_01_anchor_desk;

  if (sceneFormat === "lounge_interview") {
    formatDesc = "Seated in matching charcoal leather club armchairs around a low glass coffee table in the walnut slat interview lounge, angled comfortably toward each other in active dialogue";
    studioPlate = STUDIO_PLATES_CATALOG.section_03_interview_lounge;
  } else if (sceneFormat === "videowall_dual_standup") {
    formatDesc = "Standing side-by-side in front of the 8K interactive mega video wall with real-time financial charts, dynamic co-host presentation stance";
    studioPlate = STUDIO_PLATES_CATALOG.section_02_videowall_flat;
  }

  if (studioPlate.relativePath && fs.existsSync(path.resolve(studioPlate.relativePath))) {
    imagePaths.push(path.resolve(studioPlate.relativePath));
  }

  let interactionDesc = "Both co-anchors delivering the broadcast report with aligned energy, smiling naturally into camera, balanced on-air chemistry.";
  if (interactionStyle === "host_interviewing_guest") {
    interactionDesc = `${persona1.name} (on left) is actively gesturing and interviewing ${persona2.name} (on right), who is listening attentively with an engaging expression.`;
  } else if (interactionStyle === "intense_debate") {
    interactionDesc = `Both co-hosts engaged in a lively, animated debate across the desk, expressive hands, sharp eye contact, dynamic journalistic exchange.`;
  }

  let aspectHeader = aspectRatio === "9:16"
    ? "A photorealistic vertical 9:16 (1080x1920) mobile broadcast scene"
    : "A photorealistic 16:9 widescreen television broadcast scene";

  const prompt = `${aspectHeader} masterfully composing a two-presenter co-anchor broadcast:
[MULTI-IMAGE REFERENCE BINDING]:
• ANCHOR 1 (LEFT): Match the exact 24-34 year old anchor from Reference 1 (${persona1.name}) with natural facial anatomy, ${persona1.traits.face}, ${persona1.traits.skinTone || "natural skin"}. Hairstyle: ${hair1}. Attire: ${attire1Desc}.
• ANCHOR 2 (RIGHT): Match the exact anchor from Reference 2 (${persona2.name}) with distinct facial features, ${persona2.traits.face}, ${persona2.traits.skinTone || "natural skin"}. Hairstyle: ${hair2}. Attire: ${attire2Desc}.
• ENVIRONMENT & SET CONTINUITY: Seamlessly place both anchors into the broadcast studio set from Reference 3 (${studioPlate.description}), maintaining exact floor reflections, window skyline, and glass desk geometry.
[TWO-SHOT FRAMING & OPTICS]:
• Wide broadcast two-shot framing capturing both presenters from waist up. ${formatDesc}.
[INTERACTION & CHEMISTRY]:
• ${interactionDesc}
[LIGHTING & DEPTH]:
• ${light.prompt}
• Sharp focus on both anchors, realistic depth of field, 8k raw photography, perfect broadcast television production value.`;

  const baseName = options.imageName || `dual_${persona1.id}_${persona2.id}_${sceneFormat}_${Date.now().toString().slice(-6)}`;

  return {
    prompt,
    imagePaths,
    baseName,
    aspectRatio,
  };
}

export async function runDualAnchorMode(options: DualAnchorOptions): Promise<void> {
  console.log("\n==================================================================");
  console.log("👥 DUAL-PRESENTER CO-ANCHOR STUDIO COMPOSITION");
  console.log("==================================================================");
  console.log(`Anchor 1 (Left):  ${options.persona1.name} [${options.persona1.id}] — ${options.attire1?.label || "Default Attire"}`);
  console.log(`Anchor 2 (Right): ${options.persona2.name} [${options.persona2.id}] — ${options.attire2?.label || "Default Attire"}`);
  console.log(`Studio Format:    ${options.sceneFormat || options.scenarioKey || "Desk Two-Shot"}`);
  console.log(`Aspect Ratio:     ${options.aspectRatio || "16:9"}`);
  console.log(`Engine:           ${options.engine.toUpperCase()}`);

  const compiled = compileDualAnchorScene(options);
  console.log(`Image Name:       ${compiled.baseName}`);
  console.log(`Reference Imgs:   ${compiled.imagePaths.join(", ")}`);
  console.log(`\nPrompt:\n${compiled.prompt}\n`);

  if (options.dryRun) {
    console.log("[DRY-RUN] Generation skipped.");
    return;
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
    await renderTerminalImagePreview(generatedPath);
  }
}
