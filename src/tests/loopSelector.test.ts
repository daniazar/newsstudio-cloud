/**
 * src/tests/loopSelector.test.ts
 *
 * Test suite for Broadcast Loop Selector, FSM State Machine, 3-Tier Pacing Director,
 * Anti-Fatigue Decay, and Sequence Continuity Verification.
 */

import { describe, it, expect } from "vitest";
import {
  planBroadcastLoopSequence,
  planRubyAutoFsmSequence,
  planSceneLoopSequence,
  validateSequenceContinuity,
  extractScriptCues,
  calculateEffectiveBeatWeight,
  resolveBeatAssetPaths,
  MASTER_POSES,
} from "../lib/video/loopSelector";
import { ChoreographedBeatNode } from "../lib/video/loopSelectorTypes";

describe("Broadcast Loop Selector & Pacing Director Suite", () => {
  // ─────────────────────────────────────────────────────────────────────────
  // 1. Boundary & Continuity Invariants
  // ─────────────────────────────────────────────────────────────────────────
  describe("Boundary Invariants & Continuity", () => {
    it("should strictly start and end in Home Base (M1 Neutral Clasped)", () => {
      const result = planBroadcastLoopSequence({
        totalBeats: 8,
        personaId: "ruby",
        domain: "chroma_wall_standing",
      });

      expect(result.totalBeats).toBe(8);
      expect(result.sequence).toHaveLength(8);

      // Invariant 1: First beat starts and ends in Home Base
      expect(result.sequence[0].startPose).toBe("P01_NEUTRAL_CLASPED");
      expect(result.sequence[0].endPose).toBe("P01_NEUTRAL_CLASPED");
      expect(result.sequence[0].camera).toBe("cam1_wide");

      // Invariant 2: Final beat ends in Home Base
      expect(result.sequence[7].endPose).toBe("P01_NEUTRAL_CLASPED");
      expect(result.sequence[7].camera).toBe("cam1_wide");
    });

    it("should handle single-beat sequences cleanly in Home Base", () => {
      const result = planBroadcastLoopSequence({
        totalBeats: 1,
        personaId: "ruby",
      });

      expect(result.totalBeats).toBe(1);
      expect(result.sequence[0].startPose).toBe("P01_NEUTRAL_CLASPED");
      expect(result.sequence[0].endPose).toBe("P01_NEUTRAL_CLASPED");
      expect(result.sequence[0].durationSec).toBe(4.0);
    });

    it("should pass physical continuity verification with 0 jump-cuts", () => {
      const result = planBroadcastLoopSequence({
        totalBeats: 10,
        personaId: "ruby",
        scriptText: "Good evening. [BREAKING] Major news. [DATA] Here are stats. [CONCLUSION] Good night.",
      });

      const continuity = validateSequenceContinuity(result.sequence);
      expect(continuity.valid).toBe(true);
      expect(continuity.violations).toHaveLength(0);

      // Verify every adjacent pair matches
      for (let i = 0; i < result.sequence.length - 1; i++) {
        expect(result.sequence[i].endPose).toBe(result.sequence[i + 1].startPose);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Semantic Script Cue Extraction & Intent Mapping
  // ─────────────────────────────────────────────────────────────────────────
  describe("Semantic Script Cue Parsing & Intent", () => {
    it("should accurately parse tags and estimate timing from script text", () => {
      const script = "Welcome everyone to tonight's live report. [DATA] Market indices are surging today. [BREAKING] Urgent alert.";
      const cues = extractScriptCues(script);

      expect(cues.length).toBe(2);
      expect(cues[0].tag).toBe("DATA");
      expect(cues[0].sentiment).toBe("analytical");
      expect(cues[1].tag).toBe("BREAKING");
      expect(cues[1].sentiment).toBe("breaking");
    });

    it("should trigger explanatory pose and Camera 2 on [DATA] cue", () => {
      const result = planBroadcastLoopSequence({
        totalBeats: 5,
        personaId: "ruby",
        cues: [{ timeSec: 4.5, tag: "DATA" }], // Falls into beat 1 (4.0s - 8.0s)
      });

      expect(result.sequence[1].endPose).toBe("P02_RAISED_EXPLANATORY");
      expect(result.sequence[1].camera).toBe("cam2_left");
    });

    it("should trigger Authoritative Focus and Camera 3 on [BREAKING] cue", () => {
      const result = planBroadcastLoopSequence({
        totalBeats: 5,
        personaId: "ruby",
        cues: [{ timeSec: 4.2, tag: "BREAKING" }], // Falls into beat 1
      });

      expect(result.sequence[1].camera).toBe("cam3_closeup");
      expect(result.sequence[1].actionStateId).toBe("P10_AUTHORITATIVE_FOCUS");
    });

    it("should trigger Open Hands and Camera 1 on [GREETING] cue", () => {
      const result = planBroadcastLoopSequence({
        totalBeats: 5,
        personaId: "ruby",
        cues: [{ timeSec: 4.0, tag: "GREETING" }],
      });

      expect(result.sequence[1].endPose).toBe("P03_OPEN_TWO_HANDS");
      expect(result.sequence[1].camera).toBe("cam1_wide");
    });

    it("should trigger Side Screen Turn on [CHART] / [SCREEN] cue", () => {
      const result = planBroadcastLoopSequence({
        totalBeats: 5,
        personaId: "ruby",
        cues: [{ timeSec: 4.0, tag: "CHART" }],
      });

      expect(result.sequence[1].endPose).toBe("P05_SIDE_PERSPECTIVE_TURN");
      expect(result.sequence[1].camera).toBe("cam2_left");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Pacing Director & Anti-Fatigue Decay
  // ─────────────────────────────────────────────────────────────────────────
  describe("Pacing Director & Anti-Fatigue Decay", () => {
    it("should respect max macro actions budget per minute", () => {
      // 15 beats = 60s total duration
      const result = planBroadcastLoopSequence({
        totalBeats: 15,
        personaId: "ruby",
        pacingConfig: { maxMacroActionsPerMinute: 1 },
      });

      // Macro count should be <= 4 (including recovery transition to home base)
      expect(result.pacingSummary.macroCount).toBeLessThanOrEqual(4);
    });

    it("should apply exponential decay to recently used beat weights", () => {
      const baseWeight = 1.0;
      const history: ChoreographedBeatNode[] = [
        {
          beatIndex: 0,
          startTimeSec: 0,
          endTimeSec: 4,
          durationSec: 4,
          tier: "tier1_ambient_idle",
          startPose: "P01_NEUTRAL_CLASPED",
          endPose: "P01_NEUTRAL_CLASPED",
          transitionType: "same_pose_beat",
          camera: "cam1_wide",
          actionStateId: "state_idle",
          actionStateLabel: "Idle",
          videoPath: "dummy.mp4",
        },
      ];

      const decayedWeight = calculateEffectiveBeatWeight(
        baseWeight,
        "state_idle",
        1,
        history,
        {
          maxMacroActionsPerMinute: 1,
          minMicroBeatSpacingSec: 8,
          ambientIdleRatioTarget: 0.75,
          fatigueHistoryWindow: 3,
          fatigueDecayFactor: 0.35,
        }
      );

      expect(decayedWeight).toBeLessThan(baseWeight);
      expect(decayedWeight).toBeCloseTo(0.043, 3);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Multi-Domain & Desk Support
  // ─────────────────────────────────────────────────────────────────────────
  describe("Multi-Domain Compatibility", () => {
    it("should select Seated Desk bases for seated_broadcast_desk domain", () => {
      const result = planBroadcastLoopSequence({
        totalBeats: 4,
        personaId: "ruby",
        domain: "seated_broadcast_desk",
      });

      expect(result.sequence[0].startPose).toBe("D1_P01_DESK_CLASPED_BASE");
      expect(result.sequence[0].endPose).toBe("D1_P01_DESK_CLASPED_BASE");
    });

    it("should route [DATA] cue to laptop typing in seated_broadcast_desk domain", () => {
      const result = planBroadcastLoopSequence({
        totalBeats: 4,
        personaId: "ruby",
        domain: "seated_broadcast_desk",
        cues: [{ timeSec: 4.0, tag: "DATA" }],
      });

      expect(result.sequence[1].actionStateId).toBe("D1_P02_DESK_LAPTOP_TYPING");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 5. Asset Path & Cache Key Resolution
  // ─────────────────────────────────────────────────────────────────────────
  describe("Asset Resolution", () => {
    it("should resolve valid video paths, alpha WebMs, and latent cache keys", () => {
      const paths = resolveBeatAssetPaths(
        {
          startPose: "P01_NEUTRAL_CLASPED",
          endPose: "P01_NEUTRAL_CLASPED",
          actionStateId: "state_idle",
          transitionType: "same_pose_beat",
          camera: "cam1_wide",
        },
        "ruby"
      );

      expect(paths.videoPath).toBeDefined();
      expect(paths.transparentWebmPath).toContain(".webm");
      expect(paths.latentsCacheKey).toBeDefined();
      expect(paths.coordsCacheKey).toBeDefined();
    });

    it("should resolve FLF transition naming correctly", () => {
      const paths = resolveBeatAssetPaths(
        {
          startPose: "P01_NEUTRAL_CLASPED",
          endPose: "P02_RAISED_EXPLANATORY",
          actionStateId: "P12_DYNAMIC_SWEEP_EMPHASIS",
          transitionType: "flf_pose_transition",
          camera: "cam2_left",
        },
        "ruby"
      );

      expect(paths.transparentWebmPath).toContain("ruby_burgundy_T1_to_2_alpha.webm");
      expect(paths.videoPath).toContain("ruby_burgundy_T1_to_2.mp4");
    });
  });

  describe("Commercial Scene-by-Scene FSM Sequencer (planSceneLoopSequence)", () => {
    it("should sequence across scenes with unbroken physical continuity", () => {
      const dummyScenes = [
        { id: "s1", sceneType: "pattern_interrupt_hook", headline: "Welcome" },
        { id: "s2", sceneType: "before_after_wipe", headline: "Look at this difference" },
        { id: "s3", sceneType: "macro_texture_zoom", headline: "Spec and detail chart" },
        { id: "s4", sceneType: "social_proof_review", headline: "Verified review" },
        { id: "s5", sceneType: "price_promo_outro", headline: "Get 20% off today" },
      ];

      const sequence = planSceneLoopSequence(dummyScenes, {
        initialLoopId: "ruby_burgundy_m1_loop_v1",
        personaId: "ruby",
      });

      expect(sequence).toHaveLength(5);

      // Verify unbroken continuity: startPose(k+1) === endPose(k)
      for (let i = 0; i < sequence.length - 1; i++) {
        expect(sequence[i + 1].startPose).toBe(sequence[i].endPose);
      }

      // Verify Invariant 1: starts in M1
      expect(sequence[0].startPose).toBe("M1");

      // Verify Invariant 2: finishes in Home Base M1
      expect(sequence[sequence.length - 1].endPose).toBe("M1");

      // Verify video URLs are valid 1080p asset paths
      sequence.forEach((item) => {
        expect(item.videoUrl).toContain("/assets/action_loops/veo/ruby_burgundy/");
        expect(item.videoUrl.endsWith(".mp4")).toBe(true);
      });
    });
  });

  describe("Ruby Burgundy Auto FSM Cyclic Sequencer (planRubyAutoFsmSequence)", () => {
    it("should plan a seamless 7-beat sequence for news_anchor_long (28.36s) with 0 jump-cuts", () => {
      const sequence = planRubyAutoFsmSequence(28.36, 4.0);

      expect(sequence).toHaveLength(8);

      // Verify unbroken physical continuity using validator
      const validation = validateSequenceContinuity(sequence);
      expect(validation.valid).toBe(true);
      expect(validation.violations).toHaveLength(0);

      // Verify first beat is Home Base M1
      expect(sequence[0].startPose).toBe("P01_NEUTRAL_CLASPED");
      expect(sequence[0].videoPath).toContain("ruby_burgundy_M1_loop_v1.mp4");

      // Verify FLF transition T1_to_2 in beat 1
      expect(sequence[1].transitionType).toBe("flf_pose_transition");
      expect(sequence[1].startPose).toBe("P01_NEUTRAL_CLASPED");
      expect(sequence[1].endPose).toBe("P02_RAISED_EXPLANATORY");
      expect(sequence[1].videoPath).toContain("ruby_burgundy_T1_to_2.mp4");

      // Verify M2 loop in beat 2
      expect(sequence[2].startPose).toBe("P02_RAISED_EXPLANATORY");
      expect(sequence[2].endPose).toBe("P02_RAISED_EXPLANATORY");
      expect(sequence[2].videoPath).toContain("ruby_burgundy_M2_loop_v1.mp4");

      // Verify timecodes span continuously from 0s to 28.36s
      expect(sequence[0].startTimeSec).toBe(0);
      expect(sequence[sequence.length - 1].endTimeSec).toBeCloseTo(28.36, 2);
    });
  });
});
