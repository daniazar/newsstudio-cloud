/**
 * scripts/veo-cli/generators/satelliteTossGenerator.ts
 *
 * Anchor-to-Field Live Satellite Toss Generator.
 * Coordinates Main Studio Anchor (@Ruby) tossing live to an Outdoor Field Reporter (@Camila)
 * holding a broadcast stick microphone with weather/location atmosphere (rain, umbrella, capitol, trading street)
 * and DVE split-screen broadcast staging.
 */

import fs from "fs";
import path from "path";
import { SatelliteTossOptions } from "../types";
import { getPersonaById, PERSONAS } from "../../../src/lib/tts/personas";
import { getFlowCharacterConfig } from "../flowCharacterRegistry";
import { compileSatelliteTossPrompt } from "../promptCompiler";
import { dispatchVeoGeneration } from "../engines/veoDispatcher";
import { stitchVideoClips } from "../processors/videoChainer";
import { printClickablePath } from "../artifactManager";

export async function runSatelliteTossGenerator(opts: SatelliteTossOptions): Promise<{
  success: boolean;
  masterVideoPath?: string;
  clipPaths: string[];
  prompts: string[];
}> {
  const studioSlug = opts.studioPersonaSlug || "ruby";
  const fieldSlug = opts.fieldPersonaSlug || "camila";

  const studioPersona = getPersonaById(studioSlug) || PERSONAS[0];
  const fieldPersona = getPersonaById(fieldSlug) || PERSONAS.find((p) => p.id === "camila") || PERSONAS[1];

  const studioCfg = getFlowCharacterConfig(studioSlug);
  const fieldCfg = getFlowCharacterConfig(fieldSlug);

  const engine = opts.engine || "flow_web";
  const modelTier = opts.model || "veo-3.1-lite";
  const durationPerBeat = 8;
  const isDryRun = !!opts.dryRun;
  const aspectRatio = opts.aspectRatio || "16:9";
  const locationType = opts.locationType || "financial_street";

  console.log("\n==================================================================");
  console.log(`📡 ANCHOR-TO-FIELD LIVE SATELLITE TOSS DIRECTOR`);
  console.log("==================================================================");
  console.log(`Main Studio Anchor:  ${studioPersona.name} [${studioSlug}] (${studioCfg.characterTag})`);
  console.log(`Live Field Reporter: ${fieldPersona.name} [${fieldSlug}] (${fieldCfg.characterTag})`);
  console.log(`Location Type:       ${locationType}`);
  console.log(`Props:               Stick Microphone: ${opts.holdingMic !== false ? "Yes" : "No"}, Umbrella: ${opts.hasUmbrella ? "Yes" : "No"}`);
  if (opts.envImage) {
    console.log(`Environment Plate:   ${opts.envImage}`);
  }
  console.log(`Engine & Model:      ${engine} (${modelTier})`);
  console.log("------------------------------------------------------------------");

  const phases: ("studio_toss" | "field_report")[] = ["studio_toss", "field_report"];
  const clipPaths: string[] = [];
  const prompts: string[] = [];
  const outputDir = path.resolve(process.cwd(), "public", "assets", "action_loops");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];
    const beatIndex = i + 1;

    const prompt = compileSatelliteTossPrompt({
      studioAnchor: {
        slug: studioSlug,
        name: studioPersona.name,
        characterTag: studioCfg.characterTag,
        attire: studioCfg.defaultAttire,
      },
      fieldReporter: {
        slug: fieldSlug,
        name: fieldPersona.name,
        characterTag: fieldCfg.characterTag,
        attire: "all-weather dark broadcast trench coat with microphone transmitter pack",
        hairStyle: fieldCfg.hairStyle,
        locationType,
        holdingMic: opts.holdingMic !== false,
        hasUmbrella: !!opts.hasUmbrella,
      },
      phase,
      envImage: phase === "studio_toss" ? opts.envImage : undefined,
      durationSeconds: durationPerBeat,
      aspectRatio,
      chromaMode: opts.chromaMode || "studio",
    });

    prompts.push(prompt);

    console.log(`\n▶️ [Phase ${beatIndex}/2] ${phase.toUpperCase()}:`);
    console.log(`Prompt: "${prompt.slice(0, 160)}..."`);

    if (isDryRun) {
      console.log(`  [DRY RUN] Would submit satellite toss phase prompt to ${engine}`);
      const mockClip = path.join(outputDir, `dry_run_satellite_${studioSlug}_${fieldSlug}_${phase}.mp4`);
      clipPaths.push(mockClip);
      continue;
    }

    const refImage = phase === "studio_toss"
      ? (opts.envImage || studioCfg.chromaMasterPath || studioCfg.headshotPath)
      : (fieldCfg.chromaMasterPath || fieldCfg.headshotPath);

    const res = await dispatchVeoGeneration({
      prompt,
      aspectRatio,
      durationSeconds: durationPerBeat as any,
      baseName: `satellite_${phase}_${Date.now().toString().slice(-4)}`,
      model: modelTier,
      engine,
      imagePath: refImage,
    });

    if (!res.success || !res.videoPath) {
      console.error(`❌ Failed to generate satellite phase ${phase}: ${res.error}`);
      return { success: false, clipPaths, prompts };
    }

    clipPaths.push(res.videoPath);
    console.log(`  ✔ Phase ${phase} rendered:`);
    printClickablePath(res.videoPath);
  }

  // Cross-Stitching
  let masterVideoPath: string | undefined;
  if (clipPaths.length > 1 && opts.stitch !== false && !isDryRun) {
    console.log(`\n🧵 Cross-stitching studio toss and field report...`);
    const masterOut = path.join(outputDir, `satellite_toss_${studioSlug}_${fieldSlug}_master_${Date.now().toString().slice(-4)}.mp4`);
    const stitchRes = await stitchVideoClips(clipPaths, masterOut, {
      crossfadeDurationSec: 0.5,
      fps: 30,
    });

    if (stitchRes.success && stitchRes.outputPath) {
      masterVideoPath = stitchRes.outputPath;
      console.log(`✔ Master satellite toss sequence ready:`);
      printClickablePath(masterVideoPath);
    }
  } else if (clipPaths.length === 1) {
    masterVideoPath = clipPaths[0];
  }

  console.log("\n==================================================================");
  console.log("🎉 SATELLITE TOSS SCENE GENERATION COMPLETED!");
  console.log("==================================================================\n");

  return {
    success: true,
    masterVideoPath,
    clipPaths,
    prompts,
  };
}
