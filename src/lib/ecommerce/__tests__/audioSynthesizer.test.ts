import { describe, it, expect } from "vitest";
import {
  assembleVoiceoverPrompt,
  estimateVoiceoverDuration,
  COMMERCIAL_VOICE_PERSONAS,
  COMMERCIAL_MUSIC_TRACKS,
} from "../audioSynthesizer";
import { AdScene } from "@/lib/types/ecommerce";

describe("audioSynthesizer Unit Tests", () => {
  it("assembles scene scripts with natural cadence pauses", () => {
    const mockScenes: AdScene[] = [
      {
        id: "scene-1",
        sceneIndex: 0,
        sceneType: "pattern_interrupt_hook",
        startFrame: 0,
        durationFrames: 90,
        headline: "Stop Scrolling!",
        voiceoverScript: "Stop scrolling if you need new floors.",
        visualActionPrompt: "Quick hook shot",
        primaryMediaUrl: "/sample.png",
      },
      {
        id: "scene-2",
        sceneIndex: 1,
        sceneType: "macro_texture_zoom",
        startFrame: 90,
        durationFrames: 90,
        headline: "Scratchproof Finish",
        voiceoverScript: "Our commercial grade coating protects against claws and spills.",
        visualActionPrompt: "Macro close-up",
        primaryMediaUrl: "/sample2.png",
      },
    ];

    const assembled = assembleVoiceoverPrompt(mockScenes);
    expect(assembled).toBe(
      "Stop scrolling if you need new floors. ... Our commercial grade coating protects against claws and spills."
    );
  });

  it("handles empty scenes gracefully", () => {
    expect(assembleVoiceoverPrompt([])).toBe("");
  });

  it("estimates speech duration while stripping [emotion:...] and [sfx:...] tags", () => {
    const rawTextWithTags =
      "[sfx:whoosh] [emotion:urgent] Stop scrolling right now! [sfx:ding] This new waterproof flooring is incredible.";
    // 10 real words: Stop scrolling right now This new waterproof flooring is incredible
    const duration = estimateVoiceoverDuration(rawTextWithTags, 145);
    expect(duration).toBeGreaterThan(3.5);
    expect(duration).toBeLessThan(5.0);
  });

  it("provides distinct commercial voice personas with recommended speeds", () => {
    expect(COMMERCIAL_VOICE_PERSONAS.length).toBeGreaterThanOrEqual(4);
    const personaIds = COMMERCIAL_VOICE_PERSONAS.map((p) => p.id);
    expect(personaIds).toContain("sofia");
    expect(personaIds).toContain("ruby");
    expect(personaIds).toContain("camila");
    expect(personaIds).toContain("mateo");
    expect(personaIds).toContain("diego");
  });

  it("provides curated commercial music tracks with valid audio paths", () => {
    expect(COMMERCIAL_MUSIC_TRACKS.length).toBeGreaterThanOrEqual(4);
    for (const track of COMMERCIAL_MUSIC_TRACKS) {
      expect(track.audioUrl).toMatch(/^\/music\/[a-z0-9_-]+\.mp3$/);
      expect(track.bpm).toBeGreaterThan(60);
      expect(track.bpm).toBeLessThan(180);
    }
  });
});
