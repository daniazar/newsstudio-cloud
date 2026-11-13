/**
 * scripts/veo-cli/generators/debateMatrixGenerator.ts
 *
 * 3-Way Crossfire Debate Matrix & OTS Cinematic Multi-Cam Generator.
 * Coordinates Moderator Center (@Ruby) with opposing Debaters (@Blaze & @Marcus),
 * and generates Over-The-Shoulder (OTS) depth shots with foreground shoulder bokeh and rack focus.
 */

import fs from "fs";
import path from "path";
import { CrossfireDebateOptions, OtsDirectorOptions } from "../types";
import { getPersonaById, PERSONAS } from "../../../src/lib/tts/personas";
import { getFlowCharacterConfig } from "../flowCharacterRegistry";
import { compileCrossfirePrompt, compileOtsPrompt } from "../promptCompiler";
import { dispatchVeoGeneration } from "../engines/veoDispatcher";
import { printClickablePath } from "../artifactManager";

/**
 * 3-Way Crossfire Debate Matrix Generator
 */
export async function runCrossfireDebateGenerator(opts: CrossfireDebateOptions): Promise<{
  success: boolean;
  videoPath?: string;
  prompt: string;
}> {
  const modSlug = opts.moderatorSlug || "ruby";
  const leftSlug = opts.debaterLeftSlug || "blaze";
  const rightSlug = opts.debaterRightSlug || "marcus";

  const modPersona = getPersonaById(modSlug) || PERSONAS[0];
  const leftPersona = getPersonaById(leftSlug) || PERSONAS[1];
  const rightPersona = getPersonaById(rightSlug) || PERSONAS[2] || PERSONAS[0];

  const modCfg = getFlowCharacterConfig(modSlug);
  const leftCfg = getFlowCharacterConfig(leftSlug);
  const rightCfg = getFlowCharacterConfig(rightSlug);

  const engine = opts.engine || "flow_web";
  const modelTier = opts.model || "veo-3.1-lite";
  const duration = 8;
  const isDryRun = !!opts.dryRun;
  const activeSpeaker = (opts.activeSpeaker === "round_robin" ? "moderator" : opts.activeSpeaker) || "moderator";

  console.log("\n==================================================================");
  console.log(`⚔️ 3-WAY CROSSFIRE DEBATE MATRIX DIRECTOR`);
  console.log("==================================================================");
  console.log(`Moderator Center:    ${modPersona.name} [${modSlug}] (${modCfg.characterTag})`);
  console.log(`Debater Left:        ${leftPersona.name} [${leftSlug}] (${leftCfg.characterTag})`);
  console.log(`Debater Right:       ${rightPersona.name} [${rightSlug}] (${rightCfg.characterTag})`);
  console.log(`Active Speaker:      ${activeSpeaker.toUpperCase()}`);
  if (opts.envImage) {
    console.log(`Environment Plate:   ${opts.envImage}`);
  }
  console.log(`Engine & Model:      ${engine} (${modelTier})`);
  console.log("------------------------------------------------------------------");

  const prompt = compileCrossfirePrompt({
    moderator: { slug: modSlug, name: modPersona.name, characterTag: modCfg.characterTag, attire: modCfg.defaultAttire },
    debaterLeft: { slug: leftSlug, name: leftPersona.name, characterTag: leftCfg.characterTag, attire: leftCfg.defaultAttire },
    debaterRight: { slug: rightSlug, name: rightPersona.name, characterTag: rightCfg.characterTag, attire: rightCfg.defaultAttire },
    activeSpeaker: activeSpeaker as any,
    envImage: opts.envImage,
    durationSeconds: duration,
    aspectRatio: "16:9",
  });

  console.log(`\n▶️ COMPILED CROSSFIRE PROMPT:`);
  console.log(`"${prompt}"\n`);

  if (isDryRun) {
    console.log(`[DRY RUN] Would dispatch 3-way debate prompt to ${engine}`);
    return { success: true, prompt };
  }

  const res = await dispatchVeoGeneration({
    prompt,
    aspectRatio: "16:9",
    durationSeconds: duration as any,
    baseName: `crossfire_${modSlug}_${leftSlug}_${rightSlug}_${Date.now().toString().slice(-4)}`,
    model: modelTier,
    engine,
    imagePath: opts.envImage || modCfg.chromaMasterPath || modCfg.headshotPath,
  });

  if (res.success && res.videoPath) {
    console.log(`✔ Crossfire debate video rendered:`);
    printClickablePath(res.videoPath);
    return { success: true, videoPath: res.videoPath, prompt };
  }

  return { success: false, prompt };
}

/**
 * Over-The-Shoulder (OTS) Cinematic Multi-Cam Generator
 */
export async function runOtsDirectorGenerator(opts: OtsDirectorOptions): Promise<{
  success: boolean;
  videoPath?: string;
  prompt: string;
}> {
  const fgSlug = opts.personaSlug || "ruby";
  const bgSlug = opts.coPersonaSlug || "blaze";

  const fgPersona = getPersonaById(fgSlug) || PERSONAS[0];
  const bgPersona = getPersonaById(bgSlug) || PERSONAS[1];

  const fgCfg = getFlowCharacterConfig(fgSlug);
  const bgCfg = getFlowCharacterConfig(bgSlug);

  const engine = opts.engine || "flow_web";
  const modelTier = opts.model || "veo-3.1-lite";
  const duration = 8;
  const isDryRun = !!opts.dryRun;
  const angle = opts.angle || "ots_left";
  const isRack = angle === "alternating_rack";

  console.log("\n==================================================================");
  console.log(`🎥 OVER-THE-SHOULDER (OTS) CINEMATIC DIRECTOR`);
  console.log("==================================================================");
  console.log(`Foreground Anchor:   ${fgPersona.name} [${fgSlug}] (Soft Bokeh)`);
  console.log(`Background Speaker:  ${bgPersona.name} [${bgSlug}] (Sharp Focus)`);
  console.log(`Camera Depth:        ${opts.depthOfField || "shallow_f1.8"}`);
  console.log(`Rack Focus:          ${isRack ? "Enabled" : "Disabled"}`);
  if (opts.envImage) {
    console.log(`Environment Plate:   ${opts.envImage}`);
  }
  console.log("------------------------------------------------------------------");

  const prompt = compileOtsPrompt({
    foregroundHost: {
      slug: fgSlug,
      name: fgPersona.name,
      characterTag: fgCfg.characterTag,
      position: angle === "ots_right" ? "right" : "left",
    },
    backgroundSpeaker: {
      slug: bgSlug,
      name: bgPersona.name,
      characterTag: bgCfg.characterTag,
      position: angle === "ots_right" ? "left" : "right",
      attire: bgCfg.defaultAttire,
      hairStyle: bgCfg.hairStyle,
    },
    depthOfField: opts.depthOfField || "shallow_f1.8",
    rackFocus: isRack,
    envImage: opts.envImage,
    durationSeconds: duration,
    aspectRatio: opts.aspectRatio || "16:9",
    chromaMode: opts.chromaMode || "studio",
  });

  console.log(`\n▶️ COMPILED OTS PROMPT:`);
  console.log(`"${prompt}"\n`);

  if (isDryRun) {
    console.log(`[DRY RUN] Would dispatch OTS prompt to ${engine}`);
    return { success: true, prompt };
  }

  const res = await dispatchVeoGeneration({
    prompt,
    aspectRatio: opts.aspectRatio || "16:9",
    durationSeconds: duration as any,
    baseName: `ots_${fgSlug}_${bgSlug}_${Date.now().toString().slice(-4)}`,
    model: modelTier,
    engine,
    imagePath: opts.envImage || bgCfg.chromaMasterPath || bgCfg.headshotPath,
  });

  if (res.success && res.videoPath) {
    console.log(`✔ OTS Cinematic video rendered:`);
    printClickablePath(res.videoPath);
    return { success: true, videoPath: res.videoPath, prompt };
  }

  return { success: false, prompt };
}
