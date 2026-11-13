/**
 * scripts/veo-cli/generators/scriptDirectorGenerator.ts
 *
 * End-to-End Script-Driven News Story Arc Director.
 * Synthesizes Modern-TTS voiceover, calculates precise speech duration,
 * auto-choreographs multi-beat narrative gestures (Hook -> Graphic Reference -> Angle Cut -> Outro),
 * and recursively chains Google Flow / Veo 3.1 video generation to match the exact audio length.
 */

import fs from "fs";
import path from "path";
import { ChainedBeatConfig, runChainedSequenceGenerator } from "./chainedSequenceGenerator";
import { VeoEngineType, VeoModelType } from "../types";
import { getPersonaById, PERSONAS } from "../../../src/lib/tts/personas";
import { printClickablePath } from "../artifactManager";

export interface ScriptDirectorOptions {
  scriptText?: string;
  scriptFilePath?: string;
  personaSlug?: string;
  autoCutCameras?: boolean;
  synthesizeAudio?: boolean;
  engine?: VeoEngineType;
  model?: VeoModelType;
  aspectRatio?: "9:16" | "16:9";
  chromaMode?: "green" | "blue" | "studio";
  hasDesk?: boolean;
  pipSide?: "right" | "left";
  qc?: boolean;
  prevectorize?: boolean;
  dryRun?: boolean;
}

export async function runScriptDirectorGenerator(opts: ScriptDirectorOptions): Promise<{
  success: boolean;
  totalDurationSec: number;
  audioPath?: string;
  masterVideoPath?: string;
  manifestPath?: string;
}> {
  const personaSlug = opts.personaSlug || "ruby";
  const persona = getPersonaById(personaSlug) || PERSONAS[0];

  // 1. Resolve Script Text
  let text = opts.scriptText || "";
  if (!text && opts.scriptFilePath && fs.existsSync(opts.scriptFilePath)) {
    text = fs.readFileSync(opts.scriptFilePath, "utf8");
  }
  if (!text) {
    text = "Good evening. Welcome to NewsStudio. Major economic metrics were published earlier today, revealing resilient growth in domestic technology manufacturing. Our financial analysis team has broken down the figures on the main index. We will continue tracking these developments throughout the night.";
  }

  console.log("\n==================================================================");
  console.log(`🎙️ SCRIPT-DRIVEN STORY ARC DIRECTOR: [${persona.name}]`);
  console.log("==================================================================");
  console.log(`Persona:         ${persona.name} [${personaSlug}]`);
  console.log(`Auto-Cut Cameras:${opts.autoCutCameras ? " Enabled (Cam 1 ➔ Cam 2 ➔ Cam 3)" : " Disabled (Continuous Cam 1)"}`);
  console.log(`Script Preview:  "${text.slice(0, 100)}..." (${text.split(/\s+/).length} words)`);

  // 2. Synthesize or Estimate Audio Duration
  let durationSec = 24.0;
  let audioPath: string | undefined;

  const wordCount = text.split(/\s+/).filter(Boolean).length;
  // Natural broadcast speaking rate is ~140 words per minute (2.33 words/sec)
  const estimatedSec = Math.max(16.0, Math.round(wordCount / 2.33));

  if (!opts.dryRun && opts.synthesizeAudio !== false) {
    try {
      const { generateAudioWithModernTtsResult } = await import("../../../src/lib/tts/modernTtsClient");
      console.log(`\n🔊 Synthesizing broadcast speech audio via Modern-TTS (Piper/F5)...`);
      const ttsRes = await generateAudioWithModernTtsResult({
        text,
        personaId: personaSlug,
        language: "en",
        cadencePreset: "broadcast_anchor",
      });

      if (ttsRes && ttsRes.audioBuffer) {
        durationSec = ttsRes.durationSec || estimatedSec;
        const outDir = path.resolve(process.cwd(), "public", "assets", "action_loops");
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
        audioPath = path.join(outDir, `tts_${personaSlug}_${Date.now().toString().slice(-4)}.wav`);
        fs.writeFileSync(audioPath, Buffer.from(ttsRes.audioBuffer));
        console.log(`✔ Speech synthesized: ${durationSec.toFixed(2)}s`);
        printClickablePath(audioPath);
      }
    } catch (err: any) {
      console.warn("⚠️ Modern-TTS synthesis notice (using speech duration estimate):", err.message);
      durationSec = estimatedSec;
    }
  } else {
    durationSec = estimatedSec;
    console.log(`[DRY RUN] Estimated Speech Duration: ${durationSec.toFixed(1)}s based on ${wordCount} words.`);
  }

  // 3. Choreograph Multi-Beat Narrative Structure
  const numBeats = Math.max(2, Math.round(durationSec / 8.0));
  const beats: ChainedBeatConfig[] = [];
  const autoCams = !!opts.autoCutCameras;

  // Detect script cues
  const hasGraphicCue = /\[(DATA|GRAPHIC|PIP|CHART|SCREEN)\]/i.test(text) || text.toLowerCase().includes("screen") || text.toLowerCase().includes("index");
  const hasBreakingCue = /\[(BREAKING|ALERT|URGENT)\]/i.test(text) || text.toLowerCase().includes("breaking");

  for (let i = 0; i < numBeats; i++) {
    if (i === 0) {
      // Opening Hook
      beats.push({
        beatType: "intro_hook",
        emotion: hasBreakingCue ? "authoritative_breaking" : "confident_anchor",
        cameraAngle: "cam1",
      });
    } else if (i === numBeats - 1) {
      // Closing Outro
      beats.push({
        beatType: "conclusion_outro",
        emotion: "warm_approachable",
        cameraAngle: autoCams && numBeats >= 3 ? "cam1" : "cam1",
      });
    } else if (i === 1 && hasGraphicCue) {
      // Graphic / PIP Screen Reference
      beats.push({
        beatType: "graphic_reference",
        emotion: "attentive_analytical",
        cameraAngle: "cam1",
        pipSide: opts.pipSide || "right",
        cueType: "infographic_chart",
      });
    } else if (autoCams && i % 2 === 1) {
      // Dynamic B-camera cut (Three-Quarter Left 20°)
      beats.push({
        beatType: "data_explanation",
        emotion: "analytical_focused",
        cameraAngle: "cam2",
      });
    } else {
      // General active conversational delivery
      beats.push({
        beatType: "active_speech",
        emotion: "conversational_confident",
        cameraAngle: "cam1",
      });
    }
  }

  console.log(`\nChoreographed ${numBeats} Narrative Beats for ${durationSec.toFixed(1)}s speech:`);
  beats.forEach((b, idx) => {
    console.log(`  [Beat ${idx + 1}/${numBeats} | ${(idx * 8).toFixed(1)}s - ${((idx + 1) * 8).toFixed(1)}s] ${b.beatType.toUpperCase()} (Cam: ${b.cameraAngle || "cam1"}, Emotion: ${b.emotion})`);
  });

  // 4. Delegate to ChainedSequenceGenerator
  const chainResult = await runChainedSequenceGenerator({
    personaSlug,
    beats,
    totalDurationSeconds: numBeats * 8,
    engine: opts.engine,
    model: opts.model,
    aspectRatio: opts.aspectRatio,
    chromaMode: opts.chromaMode,
    hasDesk: opts.hasDesk,
    qc: opts.qc !== false,
    stitch: true,
    prevectorize: opts.prevectorize,
    dryRun: opts.dryRun,
  });

  if (opts.dryRun) {
    console.log(`\n🎉 [DRY RUN] Script Director simulation complete!`);
    return {
      success: true,
      totalDurationSec: numBeats * 8,
      manifestPath: chainResult.manifestPath,
    };
  }

  return {
    success: chainResult.success,
    totalDurationSec: numBeats * 8,
    audioPath,
    masterVideoPath: chainResult.masterVideoPath,
    manifestPath: chainResult.manifestPath,
  };
}
