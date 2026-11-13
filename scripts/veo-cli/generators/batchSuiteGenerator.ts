/**
 * scripts/veo-cli/generators/batchSuiteGenerator.ts
 *
 * Sequential Batch Motion Suite Generator for Google Veo.
 * Generates multiple dynamic gesture video loops one after the other from the same master image.
 * Waits between generations, handles errors gracefully, and registers all loops to the database.
 */

import fs from "fs";
import path from "path";
import { ACTION_POSE_STATES } from "../actionStateCatalog";
import { ActionPoseState, AspectRatioType, VeoEngineType, VeoGenerationResult, VeoModelType, VideoDurationType } from "../types";
import { runSubtleBeatGenerator } from "./subtleBeatGenerator";
import { getPersonaById, PERSONAS } from "../../../src/lib/tts/personas";

export interface BatchSuiteOptions {
  personaSlug?: string;
  model?: VeoModelType;
  durationSeconds?: VideoDurationType;
  aspectRatio?: AspectRatioType;
  engine?: VeoEngineType;
  poses?: ActionPoseState[];
  imagePath?: string;
  imageFiles?: string[];
  reuseConversation?: boolean;
  saveToDb?: boolean;
  dryRun?: boolean;
  pauseSecBetweenRuns?: number;
}

export async function runBatchSuiteGenerator(opts: BatchSuiteOptions): Promise<{
  total: number;
  successful: number;
  failed: number;
  results: Record<string, VeoGenerationResult>;
}> {
  const personaSlug = opts.personaSlug || "ruby";
  const persona = getPersonaById(personaSlug) || PERSONAS[0];
  const targetPoses = opts.poses && opts.poses.length > 0 ? opts.poses : Object.values(ACTION_POSE_STATES);
  const pauseSec = opts.pauseSecBetweenRuns ?? 10;
  const reuseConvo = opts.reuseConversation !== false;

  console.log("\n==================================================================");
  console.log(`📦 BATCH SEQUENTIAL MOTION SUITE GENERATOR (${targetPoses.length} POSES)`);
  console.log("==================================================================");
  console.log(`Persona:         ${persona.name} [${personaSlug}]`);
  console.log(`Total Poses:     ${targetPoses.length}`);
  console.log(`Aspect Ratio:    ${opts.aspectRatio || "9:16"}`);
  console.log(`Duration/Clip:   ${opts.durationSeconds || 4}s`);
  console.log(`Engine:          ${opts.engine || "gemini_web"}`);
  console.log(`Thread Mode:     ${reuseConvo ? "🔗 Reusing Same Gemini Conversation Thread" : "🆕 Separate Conversations"}`);
  console.log(`Pause Interval:  ${pauseSec}s between runs`);
  console.log("==================================================================\n");

  const results: Record<string, VeoGenerationResult> = {};
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < targetPoses.length; i++) {
    const pose = targetPoses[i];
    const indexStr = `[${i + 1}/${targetPoses.length}]`;

    // Match image specifically for this pose if multiple imageFiles were supplied
    let currentImagePath = opts.imagePath;
    if (opts.imageFiles && opts.imageFiles.length > 0) {
      const match = opts.imageFiles.find((f) => {
        const lower = path.basename(f).toLowerCase();
        return (
          lower.includes(pose.poseCode.toLowerCase()) ||
          lower.includes(`_${pose.id.toLowerCase()}_`) ||
          (pose.poseCode === "P01" && (lower.includes("01_m1") || lower.includes("stand_base") || lower.includes("default_clasped"))) ||
          (pose.poseCode === "P02" && (lower.includes("02_m2") || lower.includes("raised_right"))) ||
          (pose.poseCode === "P03" && (lower.includes("03_m3") || lower.includes("open_two_hands"))) ||
          (pose.poseCode === "P04" && (lower.includes("04_m4") || lower.includes("separated_arms"))) ||
          (pose.poseCode === "P05" && (lower.includes("05_m5") || lower.includes("turn_side")))
        );
      });
      if (match) {
        currentImagePath = match;
        console.log(`🎯 [IMAGE PAIRING]: Paired ${pose.poseCode} with image: ${path.basename(match)}`);
      }
    }

    console.log(`\n------------------------------------------------------------------`);
    console.log(`🚀 ${indexStr} Processing Pose: ${pose.id} (${pose.label})`);
    console.log(`------------------------------------------------------------------`);

    try {
      const res = await runSubtleBeatGenerator({
        pose,
        personaSlug,
        model: opts.model,
        durationSeconds: (opts.durationSeconds || 4) as any,
        aspectRatio: opts.aspectRatio,
        engine: opts.engine || "gemini_web",
        imagePath: currentImagePath,
        reuseConversation: false,
        saveToDb: opts.saveToDb !== false,
        dryRun: opts.dryRun,
      });

      results[pose.id] = res;

      if (res.success) {
        successCount++;
        console.log(`✔ ${indexStr} SUCCESS: ${pose.id} completed!`);
        if (res.videoPath) {
          console.log(`📁 Saved: ${res.videoPath}`);
        }
      } else {
        failCount++;
        console.log(`⚠️ ${indexStr} NOTICE: ${pose.id} ended with status: ${res.error || "incomplete"}`);
      }
    } catch (err: any) {
      failCount++;
      console.error(`❌ ${indexStr} ERROR generating ${pose.id}:`, err.message || err);
      results[pose.id] = {
        success: false,
        baseName: `veo_${personaSlug}_${pose.poseCode.toLowerCase()}`,
        error: err.message || String(err),
      };
    }

    // Rest interval between requests (skip after last item)
    if (i < targetPoses.length - 1 && !opts.dryRun) {
      console.log(`\n⏳ Cooling down for ${pauseSec}s before next pose generation...`);
      for (let s = pauseSec; s > 0; s--) {
        process.stdout.write(` ${s}s `);
        await new Promise((r) => setTimeout(r, 1000));
      }
      console.log("\n");
    }
  }

  // Summary Report
  console.log("\n==================================================================");
  console.log(`🏁 BATCH GENERATION SUITE COMPLETE`);
  console.log("==================================================================");
  console.log(`Total Scheduled: ${targetPoses.length}`);
  console.log(`✔ Successful:    ${successCount}`);
  console.log(`❌ Failed:        ${failCount}`);
  console.log("==================================================================\n");

  return {
    total: targetPoses.length,
    successful: successCount,
    failed: failCount,
    results,
  };
}
