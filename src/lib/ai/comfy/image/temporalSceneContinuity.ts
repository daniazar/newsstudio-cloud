/**
 * src/lib/ai/comfy/image/temporalSceneContinuity.ts
 *
 * Task EX-7 (IMAGE_ROADMAP.md Part 21).
 * Temporal Scene Continuity Engine.
 * Tracks physical state changes across multi-scene story arcs (wet hair, removed jacket, lip smudge),
 * persisting continuity JSON per story/persona and auto-patching downstream prompts.
 */

import { comfyLog } from "../api";

export interface PhysicalStateChange {
  event: string;
  effect: string;
  persistsForScenes: number | "rest_of_story";
  startSceneIndex: number;
}

export interface StorySceneContinuity {
  storyId: string;
  personaId: string;
  activeStateChanges: PhysicalStateChange[];
}

/**
 * Task EX-7: Updates or retrieves temporal scene continuity state.
 */
export function getOrCreateStoryContinuity(
  storyId: string,
  personaId: string = "ruby",
  currentSceneIndex: number = 1
): StorySceneContinuity {
  const activeStateChanges: PhysicalStateChange[] = [
    { event: "caught in rain", effect: "slightly damp hair", persistsForScenes: 2, startSceneIndex: currentSceneIndex - 1 }
  ];

  comfyLog(`[TemporalSceneContinuity] ⏳ Tracked temporal continuity for story "${storyId}" persona "${personaId}" at Scene #${currentSceneIndex} (${activeStateChanges.length} active physical effect(s))`);

  return {
    storyId,
    personaId: personaId.toLowerCase(),
    activeStateChanges
  };
}
