/**
 * scripts/veo-cli/generators/cyclicLoopGenerator.ts
 *
 * Isolated Generator for Complete Forward Physical Action Cycles.
 * 
 * Generates 4.0s forward-only video loops where the presenter naturally initiates a gesture,
 * reaches the articulation apex at ~1.5s, and naturally lowers/returns hands to the initial resting position by 4.0s.
 * 
 * Saves outputs to an isolated directory: public/assets/action_loops/veo_cyclic/
 */

import { ActionPoseState, CompiledVeoPrompt, VeoEngineType, VeoModelType, AspectRatioType, VeoGenerationResult } from "../types";
import { PERSONAS, getPersonaById } from "../../../src/lib/tts/personas";
import path from "path";
import fs from "fs";

export interface CyclicLoopOptions {
  pose: ActionPoseState;
  personaSlug?: string;
  imagePath?: string;
  engine: VeoEngineType;
  model?: VeoModelType;
  durationSeconds?: 4 | 8 | 2 | 5;
  aspectRatio?: AspectRatioType;
  outputDir?: string;
  dryRun?: boolean;
}

export function compileCyclicPhysicalPrompt(
  pose: ActionPoseState,
  persona: any
): string {
  const poseCode = pose.poseCode || "P01";
  
  // Specific complete forward action cycles with high dynamic range of motion
  let actionCycle = "";
  if (poseCode === "P02" || pose.id.includes("RAISED")) {
    actionCycle = "Starting with hands clasped at waist as shown in the reference photo. At 0.8s, the presenter clearly and dynamically raises her right hand and forearm up to mid-chest level, extending an expressive open-palm gesture with visible wrist and finger movement to emphasize key presentation points. She articulates the hand gesture outward with professional confidence through 2.3s. Then, from 2.5s to 3.8s, she smoothly and gracefully lowers her right arm back down to waist level, interlocking her fingers into the exact starting clasped stance, coming to a complete natural rest by 4.0s. Steady direct eye contact and locked closed lips throughout.";
  } else if (poseCode === "P03" || pose.id.includes("OPEN_TWO_HANDS")) {
    actionCycle = "Starting with hands clasped at waist as shown in the reference photo. At 0.8s, the presenter dynamically lifts and opens both arms outward to chest height in a wide, expansive overview gesture with palms facing forward and natural finger movement. She holds this commanding, expressive presentation gesture through 2.3s. Then, from 2.5s to 3.8s, she smoothly sweeps both arms back inward and lowers them back to the exact starting clasped position at her waist, settling completely motionless by 4.0s. Engaging facial expression, steady camera gaze, and closed mouth throughout.";
  } else if (poseCode === "P04" || pose.id.includes("SEPARATED")) {
    actionCycle = "Standing poised with arms resting comfortably at sides against the clean solid green screen background. At 1.0s, the presenter clearly raises both forearms in an engaged explanatory posture with open palms, delivers a strong affirmative nod, and smoothly lowers her arms back to rest at sides by 3.8s, settling into the exact starting posture by 4.0s.";
  } else if (poseCode === "P05" || pose.id.includes("TURN")) {
    actionCycle = "Standing poised in 3/4 perspective stance. At 1.0s, the presenter visibly turns her torso and head with a clear presenting gesture toward an off-screen graphic, then gracefully turns back to face the camera directly by 3.8s, settling into the exact starting frame by 4.0s with closed lips.";
  } else {
    actionCycle = "Standing poised in neutral stance with hands clasped at waist against the clean green screen background. Dynamic natural chest breathing rhythm, subtle expressive eyebrow engagement, single soft natural eye blink at 2.0s, maintaining steady posture throughout.";
  }

  const prompt = `Cinematic studio video of the presenter in the attached reference image in a 4-second complete cyclic motion beat.

PHYSICAL ACTION CYCLE:
${actionCycle}

CRITICAL RULES:
1. ABSOLUTE ZERO TALKING / CLOSED MOUTH: Mouth remains strictly closed and still throughout the entire 4 seconds. No speech movements, no open teeth.
2. BACKGROUND INTEGRITY: Solid clean chroma wall background remains completely flat, static, and constant without changes in lighting or color.
3. MOTION MOMENTUM: Fluid forward physical movement that starts from the initial frame and naturally returns to rest at the initial position by 4.0s.

Photorealistic 8K studio portrait quality, sharp studio lighting, 24fps.`;

  return prompt;
}

export async function runCyclicLoopGenerator(opts: CyclicLoopOptions): Promise<VeoGenerationResult> {
  const personaSlug = opts.personaSlug || "blaze";
  const persona = getPersonaById(personaSlug) || PERSONAS[0];
  const duration = opts.durationSeconds || 4;
  const outputDir = opts.outputDir || path.resolve(process.cwd(), "public/assets/action_loops/veo_cyclic");

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const prompt = compileCyclicPhysicalPrompt(opts.pose, persona);
  const baseName = `veo_cyclic_${personaSlug}_${opts.pose.poseCode.toLowerCase()}_${Date.now().toString().slice(-4)}`;

  const compiled: CompiledVeoPrompt = {
    prompt,
    durationSeconds: duration,
    aspectRatio: opts.aspectRatio || "9:16",
    model: opts.model || "veo-3.1-lite",
    imagePath: opts.imagePath,
    engine: opts.engine,
    baseName,
    outputDirectory: outputDir,
  };

  console.log("\n==================================================================");
  console.log(`🎬 CYCLIC FORWARD ACTION BEAT GENERATOR: ${opts.pose.label}`);
  console.log("==================================================================");
  console.log(`Persona:      ${persona.name} [${personaSlug}]`);
  console.log(`Pose:         ${opts.pose.label}`);
  console.log(`Duration:     ${duration} seconds`);
  console.log(`Output Dir:   ${outputDir}`);
  console.log(`Anchor I2V:   ${opts.imagePath || "None"}`);
  console.log(`Engine:       ${opts.engine}`);

  if (opts.dryRun) {
    console.log("\n[DRY RUN] Compiled Prompt:\n", prompt);
    return { success: true, baseName, durationSeconds: duration };
  }

  let result: VeoGenerationResult;
  if (opts.engine === "gemini_web") {
    const { runVeoWithGeminiWeb } = await import("../engines/geminiWebRunner");
    result = await runVeoWithGeminiWeb(compiled);
  } else {
    const { runVeoWithApi } = await import("../engines/apiRunner");
    result = await runVeoWithApi(compiled);
  }

  return result;
}
