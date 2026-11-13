/**
 * scripts/gemini-cli/satireMemeGenerator.ts
 *
 * NewsStudio Late-Night Studio Plate & Absurd Visual Meme Synthesizer.
 * Synthesizes satirical visual cutaways, over-the-shoulder comedic cards,
 * and talk-show host desk studio environments using Antigravity (AGY) or Google GenAI API.
 */

import fs from "fs";
import path from "path";
import { Persona } from "../../src/lib/tts/personas";
import { resolvePersonaAvatarPath } from "./personaAttires";
import { CompiledScenePrompt } from "./types";
import { runWithAgy } from "./engines/agyRunner";
import { runWithApi } from "./engines/apiRunner";

export const LATE_NIGHT_SET_PRESETS = {
  manhattan_skyline_desk: {
    id: "manhattan_skyline_desk",
    name: "🌃 Manhattan Twilight Skyline Host Desk",
    description: "Classic late-night talk show set with floor-to-ceiling glass windows overlooking a glowing Manhattan twilight skyline, polished curved walnut desk with brass microphone and custom late-night coffee mug, purple and gold studio rim lighting",
    prompt: "An iconic prime-time late-night comedy talk show television studio set. Center stage features a sleek polished curved dark walnut host desk with a vintage broadcast microphone, papers, and a coffee mug. In the background behind expansive floor-to-ceiling windows is a breathtaking glowing twilight city skyscraper skyline with purple, blue, and amber neon lights. Broadcast softbox key lighting with warm amber rim lights and deep studio depth of field, 8k resolution, ultra-high production value",
  },
  cyber_neon_monologue_stage: {
    id: "cyber_neon_monologue_stage",
    name: "⚡ Cyberpunk Neon Standup Comedy Stage",
    description: "Futuristic standup comedy monologue stage with glowing holographic city grid, elevated polished obsidian floor, and vibrant magenta/cyan stage spotlights",
    prompt: "A modern futuristic standup comedy monologue stage in a high-tech broadcast television theater. Elevated glossy dark reflective floor with neon edge lighting, backdrop features glowing cyan and magenta geometric holographic light arches, dramatic stage spotlights focusing on center stage, cinematic 8k broadcast television camera angle",
  },
};

export async function generateLateNightStudioPlate(options: {
  presetKey?: keyof typeof LATE_NIGHT_SET_PRESETS;
  engine?: "agy" | "api" | "dry";
  outputPath?: string;
}): Promise<string | null> {
  const { presetKey = "manhattan_skyline_desk", engine = "agy", outputPath } = options;
  const preset = LATE_NIGHT_SET_PRESETS[presetKey] || LATE_NIGHT_SET_PRESETS.manhattan_skyline_desk;

  console.log(`🎬 Synthesizing Late-Night Studio Environment: ${preset.name}...`);

  const baseName = `late_night_set_${preset.id}_${Date.now()}`;
  const compiled: any = {
    prompt: preset.prompt,
    baseName,
    imagePaths: [],
    aspectRatio: "16:9",
    outputPath,
  };

  if (engine === "dry") {
    console.log(`[Dry Run] Prompt: "${preset.prompt.slice(0, 100)}..."`);
    return outputPath || `/studio_plates/${baseName}.png`;
  }

  if (engine === "api") {
    return await runWithApi(compiled);
  }

  return await runWithAgy(compiled);
}

export async function generateSatiricalMemeCard(options: {
  memePrompt: string;
  headline: string;
  engine?: "agy" | "api" | "dry";
  outputPath?: string;
}): Promise<string | null> {
  const { memePrompt, headline, engine = "agy", outputPath } = options;

  console.log(`🎨 Synthesizing Over-The-Shoulder Satirical Meme: "${headline}"...`);

  const fullPrompt = `Editorial satirical comedy illustration for a late-night television news graphic card. ${memePrompt}. High visual clarity, satirical exaggeration, vibrant color palette, crisp 4:3 composition, studio-quality rendering, sharp focus, clean background suitable for graphic card overlay.`;

  const safeHeadline = headline.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 20);
  const baseName = `meme_card_${safeHeadline}_${Date.now()}`;

  const compiled: any = {
    prompt: fullPrompt,
    baseName,
    imagePaths: [],
    aspectRatio: "4:3",
    outputPath,
  };

  if (engine === "dry") {
    console.log(`[Dry Run] Meme Prompt: "${fullPrompt.slice(0, 100)}..."`);
    return outputPath || `/renders/memes/${baseName}.png`;
  }

  if (engine === "api") {
    return await runWithApi(compiled);
  }

  return await runWithAgy(compiled);
}
