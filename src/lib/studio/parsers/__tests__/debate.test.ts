import { describe, it, expect } from "vitest";
import {
  calculateDebateSpeakerGlow,
  calculateDebateVuMeters,
  DEFAULT_DEBATE_SPEAKERS_2WAY,
  DEFAULT_DEBATE_SPEAKERS_3WAY,
} from "@/remotion/layers/DebateMultiBoxLayer";
import { DEBATE_SYSTEM_PROMPT } from "../debate";
import type { DebatePayload, DebateSpeakerConfig } from "../types";

describe("Debate Studio Multi-Box & Parser Suite", () => {
  it("calculates active speaker glowing border with dynamic pulse", () => {
    const activeGlow = calculateDebateSpeakerGlow(true, 15, "#10b981");
    expect(activeGlow.borderColor).toBe("#10b981");
    expect(activeGlow.opacity).toBe(1.0);
    expect(activeGlow.scale).toBeGreaterThan(1.0);
    expect(activeGlow.boxShadow).toContain("#10b981");

    const inactiveGlow = calculateDebateSpeakerGlow(false, 15, "#10b981");
    expect(inactiveGlow.opacity).toBe(0.85);
    expect(inactiveGlow.scale).toBe(1.0);
  });

  it("calculates audio VU meter bars correctly for speaking and non-speaking states", () => {
    const speakingBars = calculateDebateVuMeters(20, true, 5);
    expect(speakingBars.length).toBe(5);
    speakingBars.forEach((bar) => {
      expect(bar).toBeGreaterThanOrEqual(20);
      expect(bar).toBeLessThanOrEqual(100);
    });

    const silentBars = calculateDebateVuMeters(20, false, 5);
    expect(silentBars.length).toBe(5);
    silentBars.forEach((bar) => {
      expect(bar).toBe(14);
    });
  });

  it("has valid 2-speaker and 3-speaker default configurations", () => {
    expect(DEFAULT_DEBATE_SPEAKERS_2WAY.length).toBe(2);
    expect(DEFAULT_DEBATE_SPEAKERS_2WAY[0].stance).toContain("PRO");
    expect(DEFAULT_DEBATE_SPEAKERS_2WAY[1].stance).toContain("CON");

    expect(DEFAULT_DEBATE_SPEAKERS_3WAY.length).toBe(3);
    expect(DEFAULT_DEBATE_SPEAKERS_3WAY[0].stance).toContain("MODERATOR");
    expect(DEFAULT_DEBATE_SPEAKERS_3WAY[1].stance).toContain("BULL");
    expect(DEFAULT_DEBATE_SPEAKERS_3WAY[2].stance).toContain("BEAR");
  });

  it("includes required instructions in DEBATE_SYSTEM_PROMPT", () => {
    expect(DEBATE_SYSTEM_PROMPT).toContain("desk_master");
    expect(DEBATE_SYSTEM_PROMPT).toContain("split_screen");
    expect(DEBATE_SYSTEM_PROMPT).toContain("solo_speaker");
    expect(DEBATE_SYSTEM_PROMPT).toContain("CROSS-EXAMINATION");
  });
});
