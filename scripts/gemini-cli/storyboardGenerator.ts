/**
 * scripts/gemini-cli/storyboardGenerator.ts
 *
 * NewsStudio Full-Story Scene Auto-Generator.
 * Generates all master broadcast keyframe scenes for an entire news story in one command.
 * 
 * Camera Mapping:
 *   - Segment 1 (Intro): Anchor established at Center Desk (0° Camera 1)
 *   - Segment 2 (Analysis): Stand-Up at 8K Video Wall with topic graphics
 *   - Segment 3 (Deep Dive): Tight Close-Up dialogue framing (20° Camera 3)
 *   - Segment 4 (Outro): Anchor sign-off with closing presentation gesture
 */

import fs from "fs";
import path from "path";
import { prisma } from "../../src/lib/prisma";
import { PERSONAS, Persona } from "../../src/lib/tts/personas";
import { CompositeSceneConfig, PersonaAttire } from "./types";
import { compileCompositeScene } from "./promptCompiler";
import { getAttiresForPersona } from "./personaAttires";
import { runWithAgy } from "./engines/agyRunner";
import { runWithApi } from "./engines/apiRunner";
import { outputToolJson } from "./engines/jsonRunner";
import { renderTerminalImagePreview } from "./terminalPreview";

export interface StoryboardOptions {
  storyId?: string;
  persona?: Persona;
  wardrobeKey?: string;
  engine: "agy" | "api" | "tool_json";
  dryRun?: boolean;
  preview?: boolean;
  saveToDb?: boolean;
}

export async function runStoryboardGenerator(options: StoryboardOptions): Promise<void> {
  console.log("\n==================================================================");
  console.log("🎬 NEWSSTUDIO — FULL-STORY BROADCAST SCENE STORYBOARD GENERATOR");
  console.log("==================================================================");

  // 1. Fetch Story from DB
  let story: any = null;
  if (options.storyId && options.storyId !== "latest") {
    story = await prisma.story.findUnique({
      where: { id: options.storyId },
      include: { script: { include: { segments: { orderBy: { index: "asc" } } } } },
    });
  } else {
    story = await prisma.story.findFirst({
      orderBy: { createdAt: "desc" },
      include: { script: { include: { segments: { orderBy: { index: "asc" } } } } },
    });
  }

  if (!story) {
    console.error("❌ No Story found in database. Run `npx tsx scripts/autonomous-ingestion-cli.ts --save-to-db` first.");
    return;
  }

  const segments = story.script?.segments || [];
  const primaryPersona = options.persona || PERSONAS[0];
  const availableAttires = await getAttiresForPersona(primaryPersona);
  const chosenAttire = availableAttires.find((a) => a.id === options.wardrobeKey) || availableAttires[0];

  console.log(`Story Title:    "${story.title}" [ID: ${story.id}]`);
  console.log(`Anchor Persona: ${primaryPersona.name} (${primaryPersona.title})`);
  console.log(`Wardrobe:       ${chosenAttire.label}`);
  console.log(`Total Segments: ${segments.length}`);
  console.log(`Engine:         ${options.engine.toUpperCase()}\n`);

  const segmentSetups = [
    {
      order: 1,
      name: "Segment 1 (Intro Hook)",
      studioPlateKey: "section_01_anchor_desk",
      cameraPresetKey: "cam1_center_wide",
      expressionKey: "intense_breaking_news",
      gestureKey: "desk_hands_clasped",
      label: "Establishing Center Desk (0° Camera 1)",
    },
    {
      order: 2,
      name: "Segment 2 (Analysis)",
      studioPlateKey: "section_02_videowall_flat",
      cameraPresetKey: "standup_videowall",
      expressionKey: "calm_authoritative",
      gestureKey: "standing_presentation_palm",
      label: "Stand-Up at 8K Video Wall",
    },
    {
      order: 3,
      name: "Segment 3 (Deep Dive)",
      studioPlateKey: "section_01_anchor_desk",
      cameraPresetKey: "cam3_right_closeup",
      expressionKey: "serious_concerned",
      gestureKey: "desk_two_hands_open",
      label: "Tight Close-Up Dialogue (20° Camera 3)",
    },
    {
      order: 4,
      name: "Segment 4 (Outro)",
      studioPlateKey: "section_01_anchor_desk",
      cameraPresetKey: "cam1_center_wide",
      expressionKey: "warm_engaging_smile",
      gestureKey: "desk_hands_clasped",
      label: "Closing Sign-Off Delivery",
    },
  ];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const setup = segmentSetups[i % segmentSetups.length];
    const shotBaseName = `storyboard_${story.id.slice(0, 8)}_seg${seg.index}_${setup.cameraPresetKey}`;

    console.log(`------------------------------------------------------------------`);
    console.log(`🎬 [${i + 1}/${segments.length}] ${setup.name}: ${setup.label}`);
    console.log(`Dialogue: "${seg.text.slice(0, 75)}..."`);

    const config: CompositeSceneConfig = {
      persona: primaryPersona,
      studioPlateKey: setup.studioPlateKey,
      wardrobeKey: chosenAttire.id,
      cameraPresetKey: setup.cameraPresetKey,
      aspectRatio: "16:9",
      expressionKey: setup.expressionKey,
      gestureKey: setup.gestureKey,
      imageName: shotBaseName,
      engine: options.engine,
      saveToDb: options.saveToDb,
    };

    const compiled = compileCompositeScene(config, chosenAttire);

    if (options.dryRun) {
      console.log(`  [DRY-RUN] Base Name: ${compiled.baseName}`);
      console.log(`  [DRY-RUN] Prompt: "${compiled.prompt.slice(0, 120)}..."\n`);
      continue;
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
  }

  console.log("\n==================================================================");
  console.log(`🎉 STORYBOARD GENERATION COMPLETE FOR STORY "${story.title}"!`);
  console.log("==================================================================\n");
}
