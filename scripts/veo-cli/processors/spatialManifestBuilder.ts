/**
 * scripts/veo-cli/processors/spatialManifestBuilder.ts
 *
 * Remotion-Compatible Spatial Annotation & B-Roll PIP Manifest Builder.
 * Maps narrative gesture timecodes to on-screen graphic pockets (upper-right / upper-left)
 * so Remotion layers (infographic charts, breaking feeds, ticker tapes) render
 * precisely aligned with anchor physical pointers and gaze vectors.
 */

import fs from "fs";
import path from "path";
import { printClickablePath } from "../artifactManager";

export interface SpatialPipWindow {
  startSec: number;
  endSec: number;
  side: "right" | "left";
  boundingBox: {
    x: number;      // Normalized 0.0 - 1.0
    y: number;      // Normalized 0.0 - 1.0
    width: number;  // Normalized 0.0 - 1.0
    height: number; // Normalized 0.0 - 1.0
  };
  cueType: "infographic_chart" | "breaking_feed" | "stock_ticker" | "broll_footage" | "product_card";
  assetUrlOrPath?: string;
  headline?: string;
  subheadline?: string;
}

export interface ChainedClipEntry {
  index: number;
  filename: string;
  filePath: string;
  timeStart: number;
  timeEnd: number;
  durationSec: number;
  camera: "cam1" | "cam2" | "cam3";
  narrativeBeat: string;
  emotion: string;
  transitionToNext?: "optical_flow" | "cut";
  spatialPip?: SpatialPipWindow;
}

export interface BroadcastStoryManifest {
  storyId: string;
  personaSlug: string;
  totalDurationSec: number;
  fps: number;
  aspectRatio: "9:16" | "16:9";
  masterVideoPath?: string;
  audioPath?: string;
  clips: ChainedClipEntry[];
  createdAt: string;
}

export function createStoryManifest(opts: {
  storyId: string;
  personaSlug: string;
  aspectRatio?: "9:16" | "16:9";
  fps?: number;
}): BroadcastStoryManifest {
  return {
    storyId: opts.storyId,
    personaSlug: opts.personaSlug,
    totalDurationSec: 0,
    fps: opts.fps || 30,
    aspectRatio: opts.aspectRatio || "9:16",
    clips: [],
    createdAt: new Date().toISOString(),
  };
}

export function addClipToManifest(
  manifest: BroadcastStoryManifest,
  clip: Omit<ChainedClipEntry, "index" | "timeStart" | "timeEnd">
): ChainedClipEntry {
  const timeStart = manifest.totalDurationSec;
  const timeEnd = timeStart + clip.durationSec;
  const index = manifest.clips.length + 1;

  const fullClip: ChainedClipEntry = {
    ...clip,
    index,
    timeStart,
    timeEnd,
  };

  manifest.clips.push(fullClip);
  manifest.totalDurationSec = timeEnd;
  return fullClip;
}

export function saveStoryManifest(
  manifest: BroadcastStoryManifest,
  outputDir?: string
): string {
  const dir = outputDir || path.resolve(process.cwd(), "public", "assets", "action_loops", "manifests");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const manifestPath = path.join(dir, `${manifest.storyId}_manifest.json`);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

  console.log(`\n📋 Broadcast Story Manifest generated:`);
  printClickablePath(manifestPath);
  return manifestPath;
}
