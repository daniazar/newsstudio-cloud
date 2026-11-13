/**
 * scripts/veo-cli/generators/dualAnchorGenerator.ts
 *
 * Broadcast Dual-Anchor Newsroom Scene Generator.
 * Coordinates two anchor personas (@Ruby & @Blaze) seated co-anchoring at the broadcast desk.
 * Implements dynamic Active Speaker vs. Active Listener turn-taking, left/right quadrant anchoring,
 * custom environment image plate conditioning (--env-image), and seamless optical flow stitching.
 */

import fs from "fs";
import path from "path";
import { DualAnchorOptions, DualAnchorParticipant } from "../types";
import { getPersonaById, PERSONAS } from "../../../src/lib/tts/personas";
import { getFlowCharacterConfig } from "../flowCharacterRegistry";
import { compileDualAnchorPrompt } from "../promptCompiler";
import { dispatchVeoGeneration } from "../engines/veoDispatcher";
import { stitchVideoClips } from "../processors/videoChainer";
import { printClickablePath } from "../artifactManager";

export async function runDualAnchorGenerator(opts: DualAnchorOptions): Promise<{
  success: boolean;
  masterVideoPath?: string;
  clipPaths: string[];
  prompts: string[];
}> {
  const leftSlug = opts.personaSlug || "ruby";
  const rightSlug = opts.coPersonaSlug || "blaze";

  const leftPersona = getPersonaById(leftSlug) || PERSONAS[0];
  const rightPersona = getPersonaById(rightSlug) || PERSONAS[1] || PERSONAS[0];

  const leftCfg = getFlowCharacterConfig(leftSlug);
  const rightCfg = getFlowCharacterConfig(rightSlug);

  const engine = opts.engine || "flow_web";
  const modelTier = opts.model || "veo-3.1-lite";
  const durationPerBeat = 8;
  const beatsCount = opts.beatsCount || (opts.totalDurationSeconds ? Math.ceil(opts.totalDurationSeconds / durationPerBeat) : 2);
  const isDryRun = !!opts.dryRun;
  const aspectRatio = opts.aspectRatio || "16:9";
  const chromaMode = opts.chromaMode || (opts.envImage ? "studio" : "studio");

  console.log("\n==================================================================");
  console.log(`🎙️ DUAL-ANCHOR CO-HOSTING BROADCAST DIRECTOR`);
  console.log("==================================================================");
  console.log(`Screen Left Anchor:  ${leftPersona.name} [${leftSlug}] (${leftCfg.characterTag})`);
  console.log(`Screen Right Anchor: ${rightPersona.name} [${rightSlug}] (${rightCfg.characterTag})`);
  console.log(`Beats Count:         ${beatsCount} beats (~${beatsCount * durationPerBeat}s total)`);
  console.log(`Speaker Pattern:     ${opts.speakerRole || "alternating"}`);
  if (opts.envImage) {
    console.log(`Environment Plate:   ${opts.envImage}`);
  }
  console.log(`Engine & Model:      ${engine} (${modelTier})`);
  console.log(`Aspect Ratio:        ${aspectRatio}`);
  console.log("------------------------------------------------------------------");

  const clipPaths: string[] = [];
  const prompts: string[] = [];
  const outputDir = path.resolve(process.cwd(), "public", "assets", "action_loops");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  for (let i = 0; i < beatsCount; i++) {
    const beatIndex = i + 1;
    const isFirst = i === 0;
    const isFinal = i === beatsCount - 1;

    // Determine roles for this beat
    let leftRole: "speaker" | "listener" = "speaker";
    let rightRole: "speaker" | "listener" = "listener";

    if (opts.speakerRole === "left") {
      leftRole = "speaker";
      rightRole = "listener";
    } else if (opts.speakerRole === "right") {
      leftRole = "listener";
      rightRole = "speaker";
    } else if (opts.speakerRole === "both") {
      leftRole = "speaker";
      rightRole = "speaker";
    } else {
      // Default: alternating
      if (i % 2 === 0) {
        leftRole = "speaker";
        rightRole = "listener";
      } else {
        leftRole = "listener";
        rightRole = "speaker";
      }
    }

    const anchorLeft: DualAnchorParticipant = {
      slug: leftSlug,
      name: leftPersona.name,
      characterTag: leftCfg.characterTag,
      attire: leftCfg.defaultAttire,
      hairStyle: leftCfg.hairStyle,
      role: leftRole,
      position: "left",
    };

    const anchorRight: DualAnchorParticipant = {
      slug: rightSlug,
      name: rightPersona.name,
      characterTag: rightCfg.characterTag,
      attire: rightCfg.defaultAttire,
      hairStyle: rightCfg.hairStyle,
      role: rightRole,
      position: "right",
    };

    const prompt = compileDualAnchorPrompt({
      anchorLeft,
      anchorRight,
      envImage: opts.envImage,
      beatIndex,
      totalBeats: beatsCount,
      chromaMode,
      durationSeconds: durationPerBeat,
      aspectRatio,
      isFirstBeat: isFirst,
      isFinalBeat: isFinal,
    });

    prompts.push(prompt);

    console.log(`\n▶️ [Beat ${beatIndex}/${beatsCount}] ${anchorLeft.name} (${leftRole.toUpperCase()}) & ${anchorRight.name} (${rightRole.toUpperCase()}):`);
    console.log(`Prompt: "${prompt.slice(0, 160)}..."`);

    if (isDryRun) {
      console.log(`  [DRY RUN] Would submit dual-anchor prompt to ${engine}`);
      const mockClip = path.join(outputDir, `dry_run_dual_${leftSlug}_${rightSlug}_beat${beatIndex}.mp4`);
      clipPaths.push(mockClip);
      continue;
    }

    const res = await dispatchVeoGeneration({
      prompt,
      aspectRatio,
      durationSeconds: durationPerBeat as any,
      baseName: `dual_${leftSlug}_${rightSlug}_b${beatIndex}_${Date.now().toString().slice(-4)}`,
      model: modelTier,
      engine,
      imagePath: opts.envImage || leftCfg.chromaMasterPath || leftCfg.headshotPath,
    });

    if (!res.success || !res.videoPath) {
      console.error(`❌ Failed to generate dual-anchor beat ${beatIndex}: ${res.error}`);
      return { success: false, clipPaths, prompts };
    }

    clipPaths.push(res.videoPath);
    console.log(`  ✔ Beat ${beatIndex} rendered:`);
    printClickablePath(res.videoPath);
  }

  // Seamless Stitching across multi-beat scenes
  let masterVideoPath: string | undefined;
  if (clipPaths.length > 1 && opts.stitch !== false && !isDryRun) {
    console.log(`\n🧵 Stitching ${clipPaths.length} dual-anchor clips with optical flow blending...`);
    const masterOut = path.join(outputDir, `dual_anchor_${leftSlug}_${rightSlug}_master_${Date.now().toString().slice(-4)}.mp4`);
    const stitchRes = await stitchVideoClips(clipPaths, masterOut, {
      crossfadeDurationSec: 0.35,
      fps: 30,
    });

    if (stitchRes.success && stitchRes.outputPath) {
      masterVideoPath = stitchRes.outputPath;
      console.log(`✔ Master dual-anchor broadcast sequence ready:`);
      printClickablePath(masterVideoPath);
    }
  } else if (clipPaths.length === 1) {
    masterVideoPath = clipPaths[0];
  }

  console.log("\n==================================================================");
  console.log("🎉 DUAL-ANCHOR SCENE GENERATION COMPLETED!");
  console.log("==================================================================\n");

  return {
    success: true,
    masterVideoPath,
    clipPaths,
    prompts,
  };
}
