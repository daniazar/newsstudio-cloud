/**
 * scripts/veo-cli/generators/chainedSequenceGenerator.ts
 *
 * Autonomous Recursive Video Chaining Engine for Long-Form Broadcast Presenter Videos.
 * Chained consecutive 8-second clips via terminal boundary frame hand-offs (F_end -> F_init),
 * multi-camera cuts, automated optical flow seam stitching, and Remotion PIP manifests.
 */

import fs from "fs";
import path from "path";
import { CompiledVeoPrompt, VeoEngineType, VeoModelType, VeoGenerationResult } from "../types";
import { getFlowCharacterConfig } from "../flowCharacterRegistry";
import { compileChainedBeatPrompt, ChainedBeatCompileOptions } from "../promptCompiler";
import { extractTerminalFrame, auditSeamContinuity, stitchVideoClips } from "../processors/videoChainer";
import { createStoryManifest, addClipToManifest, saveStoryManifest, BroadcastStoryManifest } from "../processors/spatialManifestBuilder";
import { printClickablePath } from "../artifactManager";
import { outputVeoJson } from "../engines/jsonRunner";

export interface ChainedBeatConfig {
  beatType: "intro_hook" | "active_speech" | "data_explanation" | "graphic_reference" | "seated_desk" | "conclusion_outro";
  emotion?: string;
  cameraAngle?: "cam1" | "cam2" | "cam3";
  pipSide?: "right" | "left";
  cueType?: "infographic_chart" | "breaking_feed" | "stock_ticker" | "broll_footage" | "product_card";
}

export interface ChainedSequenceOptions {
  personaSlug?: string;
  beats?: ChainedBeatConfig[];
  totalDurationSeconds?: number;
  engine?: VeoEngineType;
  model?: VeoModelType;
  aspectRatio?: "9:16" | "16:9";
  chromaMode?: "green" | "blue" | "studio";
  attire?: string;
  hasDesk?: boolean;
  qc?: boolean;
  stitch?: boolean;
  prevectorize?: boolean;
  pauseSecBetweenClips?: number;
  dryRun?: boolean;
}

export function parseBeatsString(beatsStr: string): ChainedBeatConfig[] {
  const tokens = beatsStr.split(",").map((s) => s.trim().toLowerCase());
  return tokens.map((token) => {
    if (token.includes("graphic") || token.includes("point") || token.includes("screen")) {
      return { beatType: "graphic_reference", pipSide: token.includes("left") ? "left" : "right", emotion: "attentive_analytical" };
    }
    if (token.includes("hook") || token.includes("intro") || token.includes("start")) {
      return { beatType: "intro_hook", emotion: "authoritative_breaking" };
    }
    if (token.includes("data") || token.includes("explain") || token.includes("analysis")) {
      return { beatType: "data_explanation", emotion: "analytical_focused" };
    }
    if (token.includes("desk") || token.includes("laptop")) {
      return { beatType: "seated_desk", emotion: "confident_anchor" };
    }
    if (token.includes("outro") || token.includes("conclude") || token.includes("signoff")) {
      return { beatType: "conclusion_outro", emotion: "warm_approachable" };
    }
    return { beatType: "active_speech", emotion: "conversational_confident" };
  });
}

export async function runChainedSequenceGenerator(opts: ChainedSequenceOptions): Promise<{
  success: boolean;
  masterVideoPath?: string;
  manifestPath?: string;
  clips: string[];
}> {
  const personaSlug = opts.personaSlug || "ruby";
  const flowConfig = getFlowCharacterConfig(personaSlug);
  const engine = opts.engine || "flow_web";
  const ratio = opts.aspectRatio || "9:16";
  const chroma = opts.chromaMode || "green";
  const attire = opts.attire || flowConfig.defaultAttire;
  const hairStyle = flowConfig.hairDescription;

  // Resolve Beats Configuration
  let beats: ChainedBeatConfig[] = opts.beats || [];
  if (beats.length === 0) {
    const totalSec = opts.totalDurationSeconds || 24;
    const numClips = Math.max(2, Math.round(totalSec / 8));
    if (numClips === 2) {
      beats = [{ beatType: "intro_hook" }, { beatType: "conclusion_outro" }];
    } else if (numClips === 3) {
      beats = [{ beatType: "intro_hook" }, { beatType: "graphic_reference", pipSide: "right" }, { beatType: "conclusion_outro" }];
    } else {
      beats = [
        { beatType: "intro_hook" },
        { beatType: "active_speech" },
        { beatType: "graphic_reference", pipSide: "right" },
        { beatType: "conclusion_outro" },
      ];
    }
  }

  const totalBeats = beats.length;
  const storyId = `story_${personaSlug}_${Date.now().toString().slice(-4)}`;

  console.log("\n==================================================================");
  console.log(`🎬 RECURSIVE CHAINED PRESENTER SEQUENCE: [${flowConfig.characterName}]`);
  console.log("==================================================================");
  console.log(`Persona:         ${flowConfig.characterName} (${flowConfig.tag})`);
  console.log(`Beats Count:     ${totalBeats} (${totalBeats * 8}s continuous sequence)`);
  console.log(`Chroma Mode:     ${chroma}`);
  console.log(`Engine:          ${engine}`);
  console.log(`Beats Rundown:`);
  beats.forEach((b, idx) => {
    console.log(`  [Beat ${idx + 1}/${totalBeats}] ${b.beatType.toUpperCase()} (Camera: ${b.cameraAngle || "cam1"}, Emotion: ${b.emotion || "default"})`);
  });
  console.log("------------------------------------------------------------------");

  const manifest = createStoryManifest({ storyId, personaSlug, aspectRatio: ratio });
  const generatedClips: string[] = [];
  const transitionTypes: Array<"cut" | "optical_flow"> = [];

  let currentInitImage: string | undefined = flowConfig.chromaMasterPath || flowConfig.headshotPath;
  let previousCam: "cam1" | "cam2" | "cam3" = "cam1";

  for (let i = 0; i < totalBeats; i++) {
    const beat = beats[i];
    const beatIndex = i + 1;
    const isFirstBeat = i === 0;
    const isFinalBeat = i === totalBeats - 1;
    const targetCam = beat.cameraAngle || "cam1";

    console.log(`\n▶️ EXECUTING BEAT ${beatIndex}/${totalBeats}: [${beat.beatType.toUpperCase()}]`);

    // Camera Cut Logic: If camera angle changes, use multi-angle turnaround still
    if (!isFirstBeat && targetCam !== previousCam) {
      transitionTypes.push("cut");
      const angleDir = path.resolve(process.cwd(), "public", "avatars", personaSlug, "angles");
      if (targetCam === "cam2" && fs.existsSync(path.join(angleDir, "02_angle_45_left.png"))) {
        currentInitImage = path.join(angleDir, "02_angle_45_left.png");
      } else if (targetCam === "cam3" && fs.existsSync(path.join(angleDir, "03_angle_45_right.png"))) {
        currentInitImage = path.join(angleDir, "03_angle_45_right.png");
      }
      console.log(`🎥 Multi-camera cut triggered (${previousCam} ➔ ${targetCam}). Init image: ${path.basename(currentInitImage || "")}`);
    } else if (!isFirstBeat) {
      transitionTypes.push("optical_flow");
    }

    const prompt = compileChainedBeatPrompt({
      personaName: flowConfig.characterName,
      characterTag: flowConfig.tag,
      attire,
      hairStyle,
      aspectRatio: ratio,
      chromaMode: chroma,
      durationSeconds: 8,
      beatIndex,
      totalBeats,
      beatType: beat.beatType,
      emotion: beat.emotion,
      pipSide: beat.pipSide,
      cameraAngle: targetCam,
      isFirstBeat,
      isFinalBeat,
      hasDesk: opts.hasDesk,
    });

    const baseName = `chained_${storyId}_beat_${beatIndex}_${beat.beatType}`;
    const compiled: CompiledVeoPrompt = {
      prompt,
      imagePath: currentInitImage && fs.existsSync(currentInitImage) ? currentInitImage : undefined,
      aspectRatio: ratio,
      durationSeconds: 8,
      fps: 30,
      resolution: "1080p",
      baseName,
      model: opts.model || "veo-3.1-lite",
      attire,
      characterTag: flowConfig.tag,
      motionMode: beat.beatType as any,
    };

    console.log(`Initial Frame:   ${currentInitImage || "None (Text-to-Video)"}`);

    if (opts.dryRun) {
      console.log(`[DRY RUN] Compiled Beat Prompt:\n`, prompt);
      const fakeClip = path.resolve(process.cwd(), "public", "assets", "action_loops", `${baseName}.mp4`);
      generatedClips.push(fakeClip);

      addClipToManifest(manifest, {
        filename: `${baseName}.mp4`,
        filePath: fakeClip,
        durationSec: 8,
        camera: targetCam,
        narrativeBeat: beat.beatType,
        emotion: beat.emotion || "composed",
        transitionToNext: isFinalBeat ? undefined : (transitionTypes[i] || "optical_flow"),
        spatialPip: beat.beatType === "graphic_reference"
          ? {
              startSec: 1.5,
              endSec: 5.5,
              side: beat.pipSide || "right",
              boundingBox: beat.pipSide === "left"
                ? { x: 0.05, y: 0.15, width: 0.40, height: 0.45 }
                : { x: 0.55, y: 0.15, width: 0.40, height: 0.45 },
              cueType: beat.cueType || "infographic_chart",
            }
          : undefined,
      });

      previousCam = targetCam;
      continue;
    }

    // Live Execution
    let result: VeoGenerationResult;
    if (engine === "flow_web") {
      const { runVeoWithFlowWeb } = await import("../engines/flowWebRunner");
      result = await runVeoWithFlowWeb(compiled);
    } else if (engine === "agy") {
      const { runVeoWithAgy } = await import("../engines/agyRunner");
      result = await runVeoWithAgy(compiled);
    } else if (engine === "api") {
      const { runVeoWithApi } = await import("../engines/apiRunner");
      result = await runVeoWithApi(compiled);
    } else {
      result = outputVeoJson(compiled);
    }

    if (!result.success || !result.videoPath) {
      console.error(`❌ Beat ${beatIndex} generation failed. Halting chained sequence.`);
      return { success: false, clips: generatedClips };
    }

    generatedClips.push(result.videoPath);

    addClipToManifest(manifest, {
      filename: path.basename(result.videoPath),
      filePath: result.videoPath,
      durationSec: 8,
      camera: targetCam,
      narrativeBeat: beat.beatType,
      emotion: beat.emotion || "composed",
      transitionToNext: isFinalBeat ? undefined : (transitionTypes[i] || "optical_flow"),
      spatialPip: beat.beatType === "graphic_reference"
        ? {
            startSec: 1.5,
            endSec: 5.5,
            side: beat.pipSide || "right",
            boundingBox: beat.pipSide === "left"
              ? { x: 0.05, y: 0.15, width: 0.40, height: 0.45 }
              : { x: 0.55, y: 0.15, width: 0.40, height: 0.45 },
            cueType: beat.cueType || "infographic_chart",
          }
        : undefined,
    });

    // Extract Boundary Frame for Next Beat
    if (!isFinalBeat) {
      const scratchDir = path.resolve(process.cwd(), "scratch");
      const nextBoundaryPng = path.join(scratchDir, `${baseName}_boundary_frame.png`);
      console.log(`📸 Extracting and stabilizing terminal frame for Beat ${beatIndex + 1}...`);
      const extracted = await extractTerminalFrame(result.videoPath, nextBoundaryPng, { offsetSecondsFromEnd: 0.04 });
      if (extracted) {
        currentInitImage = extracted;
        console.log(`✔ Boundary frame successfully prepared: ${nextBoundaryPng}`);
      }
    }

    previousCam = targetCam;

    if (i < totalBeats - 1) {
      const pauseSec = opts.pauseSecBetweenClips || 5;
      console.log(`⏳ Cooldown pause (${pauseSec}s) before Beat ${beatIndex + 1}...`);
      await new Promise((r) => setTimeout(r, pauseSec * 1000));
    }
  }

  // Save Spatial Manifest
  const manifestPath = saveStoryManifest(manifest);

  if (opts.dryRun) {
    console.log(`\n✔ [DRY RUN] Chained sequence simulation completed successfully! (${totalBeats * 8}s total)`);
    return { success: true, manifestPath, clips: generatedClips };
  }

  // Stitch All Clips into Master Video
  let masterVideoPath: string | undefined;
  if (opts.stitch !== false && generatedClips.length > 1) {
    const outDir = path.resolve(process.cwd(), "public", "assets", "action_loops");
    const masterPath = path.join(outDir, `${storyId}_master_continuous_${totalBeats * 8}s.mp4`);

    const stitched = await stitchVideoClips(generatedClips, masterPath, {
      transitions: transitionTypes,
      blendFrames: 6,
    });

    if (stitched) {
      masterVideoPath = stitched;
      manifest.masterVideoPath = masterVideoPath;
      saveStoryManifest(manifest);

      // Audit Seam Continuity
      if (opts.qc !== false) {
        console.log(`\n==================================================================`);
        console.log(`🔍 AUDITING SEAM CONTINUITY ACROSS ALL ${generatedClips.length - 1} JOINTS`);
        console.log(`==================================================================`);
        for (let j = 0; j < generatedClips.length - 1; j++) {
          const audit = await auditSeamContinuity(generatedClips[j], generatedClips[j + 1]);
          console.log(`Joint [Clip ${j + 1} ➔ Clip ${j + 2}]: ${audit.message}`);
        }
      }

      // Pre-Vectorize for Real-Time Broadcast Lip-Sync
      if (opts.prevectorize) {
        try {
          const { prevectorizeVideoClip } = await import("../processors/latentPrevectorizer");
          await prevectorizeVideoClip(masterVideoPath);
        } catch (err: any) {
          console.warn("⚠️ Pre-vectorization notice:", err.message);
        }
      }
    }
  }

  return {
    success: true,
    masterVideoPath,
    manifestPath,
    clips: generatedClips,
  };
}
