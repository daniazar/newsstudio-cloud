/**
 * src/tests/fsmStitcher.test.ts
 *
 * Test suite for Markov FSM Action Planning, Loop Resolution, and Video Lip-Sync Stitching.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import {
  planFsmGestureSequence,
  resolvePersonaActionLoop,
  stitchFsmStoryVideo,
  FsmActionState,
} from "../lib/video/fsmStitcher";
import { createSyntheticWav } from "../lib/audio/beatChunker";
import * as musetalkClient from "../lib/ai/musetalkClient";

describe("FSM Action Planner & Video Stitcher Suite", () => {
  let tempDir: string;

  beforeEach(() => {
    vi.restoreAllMocks();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fsm_stitcher_test_"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch {}
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 1. FSM Sequence Planner Tests
  // ─────────────────────────────────────────────────────────────────────────
  describe("planFsmGestureSequence", () => {
    it("should always start and end in M1 (Neutral Clasped) state", () => {
      const beats = 6;
      const sequence = planFsmGestureSequence(beats, "ruby");

      expect(sequence).toHaveLength(6);
      expect(sequence[0].state).toBe("M1_NEUTRAL_CLASPED");
      expect(sequence[0].beatIndex).toBe(0);
      expect(sequence[5].state).toBe("M1_NEUTRAL_CLASPED");
      expect(sequence[5].beatIndex).toBe(5);
    });

    it("should handle single-beat audio cleanly in M1 state", () => {
      const sequence = planFsmGestureSequence(1, "ruby");
      expect(sequence).toHaveLength(1);
      expect(sequence[0].state).toBe("M1_NEUTRAL_CLASPED");
      expect(sequence[0].beatIndex).toBe(0);
      expect(sequence[0].durationSec).toBe(4.0);
    });

    it("should map script cues to corresponding FSM gesture states", () => {
      const cues = [
        { timeSec: 4.5, tag: "BREAKING" }, // Falls into beat 1 (4.0s - 8.0s)
        { timeSec: 9.0, tag: "DATA" }, // Falls into beat 2 (8.0s - 12.0s)
        { timeSec: 13.0, tag: "CONCLUSION" }, // Falls into beat 3 (12.0s - 16.0s)
      ];

      const sequence = planFsmGestureSequence(5, "ruby", cues);

      expect(sequence[0].state).toBe("M1_NEUTRAL_CLASPED");
      expect(sequence[1].state).toBe("M2_RAISED_EXPLANATORY");
      expect(sequence[1].cueTag).toBe("BREAKING");
      expect(sequence[2].state).toBe("M2_RAISED_EXPLANATORY");
      expect(sequence[2].cueTag).toBe("DATA");
      expect(sequence[3].state).toBe("M3_OPEN_HANDS");
      expect(sequence[3].cueTag).toBe("CONCLUSION");
      expect(sequence[4].state).toBe("M1_NEUTRAL_CLASPED");
    });

    it("should establish continuous state transitions across graph nodes", () => {
      const sequence = planFsmGestureSequence(4, "ruby");

      for (let i = 0; i < sequence.length - 1; i++) {
        expect(sequence[i].transitionTo).toBe(sequence[i + 1].state);
        expect(sequence[i + 1].transitionFrom).toBe(sequence[i].state);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Action Loop Resolution Tests
  // ─────────────────────────────────────────────────────────────────────────
  describe("resolvePersonaActionLoop", () => {
    it("should return valid file paths for Ruby persona states", () => {
      const m1Loop = resolvePersonaActionLoop("ruby", "M1_NEUTRAL_CLASPED");
      const m2Loop = resolvePersonaActionLoop("ruby", "M2_RAISED_EXPLANATORY");

      expect(m1Loop).toBeDefined();
      expect(typeof m1Loop).toBe("string");
      expect(m2Loop).toBeDefined();
      expect(typeof m2Loop).toBe("string");
    });

    it("should return valid file paths for Blaze persona states", () => {
      const blazeLoop = resolvePersonaActionLoop("blaze", "M1_NEUTRAL_CLASPED");
      expect(blazeLoop).toBeDefined();
      expect(typeof blazeLoop).toBe("string");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 3. End-to-End FSM Story Video Stitching Tests
  // ─────────────────────────────────────────────────────────────────────────
  describe("stitchFsmStoryVideo", () => {
    it("should synthesize a complete FSM story video with mocked MuseTalk", async () => {
      // 1. Create a synthetic master WAV file (8.5s -> 3 beats = 12.0s)
      const masterAudioPath = path.join(tempDir, "master_speech_8_5s.wav");
      const audioBuf = createSyntheticWav(8.5, 24000);
      fs.writeFileSync(masterAudioPath, audioBuf);

      // 2. Mock MuseTalk health and lip-sync generation
      vi.spyOn(musetalkClient, "checkMuseTalkHealth").mockResolvedValue(true);
      vi.spyOn(musetalkClient, "generateMuseTalkLipSync").mockImplementation(async (opts) => {
        // Write a small fake mp4 buffer
        const outDir = path.dirname(opts.outputPath);
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
        fs.writeFileSync(opts.outputPath, Buffer.from("FAKE_MP4_CHUNK_DATA"));
        return {
          success: true,
          outputPath: opts.outputPath,
        };
      });

      const outputVideoPath = path.join(tempDir, "final_story_video.mp4");
      const progressCalls: any[] = [];

      const result = await stitchFsmStoryVideo({
        masterAudioPath,
        personaId: "ruby",
        scriptText: "Good evening. [BREAKING] Major news today. [CONCLUSION] Good night.",
        outputVideoPath,
        outputDir: tempDir,
        onProgress: (p) => progressCalls.push(p),
      });

      expect(result.success).toBe(true);
      expect(result.totalBeats).toBe(3); // 8.5s / 4.0s = 3 beats
      expect(result.durationSeconds).toBe(12.0);
      expect(result.plannedSequence).toHaveLength(3);
      expect(result.renderedChunks).toHaveLength(3);
      expect(fs.existsSync(result.finalVideoPath)).toBe(true);

      // Verify progress reporting
      expect(progressCalls.length).toBeGreaterThan(0);
      expect(progressCalls.some((p) => p.phase === "audio_chunking")).toBe(true);
      expect(progressCalls.some((p) => p.phase === "fsm_planning")).toBe(true);
      expect(progressCalls.some((p) => p.phase === "complete")).toBe(true);
    });

    it("should handle offline MuseTalk gracefully with fallback multiplexing", async () => {
      // 1. Create a synthetic master WAV file (4.0s -> 1 beat)
      const masterAudioPath = path.join(tempDir, "master_speech_4s.wav");
      const audioBuf = createSyntheticWav(4.0, 24000);
      fs.writeFileSync(masterAudioPath, audioBuf);

      // 2. Mock MuseTalk offline
      vi.spyOn(musetalkClient, "checkMuseTalkHealth").mockResolvedValue(false);

      const outputVideoPath = path.join(tempDir, "final_fallback_video.mp4");

      const result = await stitchFsmStoryVideo({
        masterAudioPath,
        personaId: "ruby",
        outputVideoPath,
        outputDir: tempDir,
      });

      expect(result.success).toBe(true);
      expect(result.totalBeats).toBe(1);
      expect(fs.existsSync(result.finalVideoPath)).toBe(true);
    });
  });
});
