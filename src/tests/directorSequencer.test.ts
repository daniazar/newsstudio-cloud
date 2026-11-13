/**
 * src/tests/directorSequencer.test.ts
 *
 * Comprehensive unit and integration test suite for the NewsStudio Director Engine:
 * - 2D Emotion x Rhetoric Action taxonomy
 * - Full-Mesh Kinematic Transitions (M_i -> M_j)
 * - Semantic, Markov, and Hybrid modes
 * - Inline bracket tag extraction
 * - Database asset resolution for Mateo Beltrán
 */

import { describe, it, expect } from "vitest";
import {
  sequenceStoryPlan,
  resolveDirectorPlanMedia,
  extractInlineDirectives,
  selectActionLoopId,
  buildPoseTransitionId,
  DirectorSegmentInput,
} from "../lib/ai/directorSequencer";

describe("Director Sequencer Engine", () => {
  describe("Utility & Tag Extraction", () => {
    it("extracts inline bracket directives for emotion, action, and pose", () => {
      const input = "Good evening. [emotion:grave_solemn] [action:emphasizing] [M2] We begin with breaking news.";
      const res = extractInlineDirectives(input);

      expect(res.emotion).toBe("grave_solemn");
      expect(res.rhetoricAction).toBe("emphasizing");
      expect(res.poseState).toBe("M2");
      expect(res.cleanText).toBe("Good evening. We begin with breaking news.");
    });

    it("builds correct transition IDs", () => {
      expect(buildPoseTransitionId("M1", "M2")).toBe("T1_to_2");
      expect(buildPoseTransitionId("M3", "M5")).toBe("T3_to_5");
      expect(buildPoseTransitionId("M5", "M1")).toBe("T5_to_1");
    });

    it("selects correct canonical loop IDs across poses", () => {
      expect(selectActionLoopId("M1", "neutral_composed", "little_movement").clipId).toBe("M1_loop_v1");
      expect(selectActionLoopId("M1", "neutral_composed", "explaining").clipId).toBe("M1_loop_v2");
      expect(selectActionLoopId("M1", "neutral_composed", "forward_lean").clipId).toBe("M1_dynamic_v1");

      expect(selectActionLoopId("M2", "enthusiastic_upbeat", "emphasizing").clipId).toBe("M2_loop_v1");
      expect(selectActionLoopId("M2", "analytical_scrutiny", "explaining").clipId).toBe("M2_loop_v2");

      expect(selectActionLoopId("M3", "enthusiastic_upbeat", "welcoming").clipId).toBe("M3_loop_v1");
      expect(selectActionLoopId("M3", "analytical_scrutiny", "comparing").clipId).toBe("M3_loop_v2");
      expect(selectActionLoopId("M3", "enthusiastic_upbeat", "forward_lean").clipId).toBe("M3_dynamic_v1");

      expect(selectActionLoopId("M4", "grave_solemn", "little_movement").clipId).toBe("M4_loop_v1");
      expect(selectActionLoopId("M4", "empathetic_heartfelt", "emphasizing").clipId).toBe("M4_loop_v2");

      expect(selectActionLoopId("M5", "analytical_scrutiny", "presenting_graphic").clipId).toBe("M5_loop_v1");
      expect(selectActionLoopId("M5", "neutral_composed", "side_turn").clipId).toBe("M5_loop_v2");
      expect(selectActionLoopId("M5", "analytical_scrutiny", "side_turn").clipId).toBe("M5_dynamic_v1");
    });
  });

  describe("Semantic Mode Choreography", () => {
    it("sequences a 5-segment broadcast script with seamless kinematic transitions", () => {
      const segments: DirectorSegmentInput[] = [
        {
          index: 0,
          text: "Welcome to tonight's special report.",
          duration: 4.0,
        },
        {
          index: 1,
          text: "Breaking tonight: Emergency interest rate hike announced by central banks.",
          duration: 4.5,
        },
        {
          index: 2,
          text: "Looking at the data chart, inflation surged past 8 percent.",
          duration: 5.0,
        },
        {
          index: 3,
          text: "However, on the other hand, tech equities rallied strongly.",
          duration: 4.0,
        },
        {
          index: 4,
          text: "That is all for tonight. Good night.",
          duration: 3.5,
        },
      ];

      const plan = sequenceStoryPlan(segments, {
        mode: "semantic",
        initialPose: "M1",
        personaSlug: "mateo",
      });

      expect(plan.mode).toBe("semantic");
      expect(plan.poseTransitionsCount).toBeGreaterThanOrEqual(4);

      // Verify trajectory:
      // Start M1 -> Segment 0 (Welcome) target M3 -> Transition T1_to_3 + M3_loop_v1
      const s0Transitions = plan.beats.filter((b) => b.segmentIndex === 0 && b.type === "transition");
      expect(s0Transitions.length).toBe(1);
      expect(s0Transitions[0].clipId).toBe("T1_to_3");

      const s0Loop = plan.beats.find((b) => b.segmentIndex === 0 && b.type === "loop");
      expect(s0Loop?.clipId).toBe("M3_loop_v1");
      expect(s0Loop?.cameraCue).toBe("cam1_wide");

      // Segment 1 (Breaking): target M2 -> Transition T3_to_2 + M2_loop_v1
      const s1Trans = plan.beats.find((b) => b.segmentIndex === 1 && b.type === "transition");
      expect(s1Trans?.clipId).toBe("T3_to_2");
      const s1Loop = plan.beats.find((b) => b.segmentIndex === 1 && b.type === "loop");
      expect(s1Loop?.clipId).toBe("M2_loop_v1");
      expect(s1Loop?.emotion).toBe("grave_solemn");

      // Segment 2 (Data Chart): target M5 -> Transition T2_to_5 + M5_loop_v1
      const s2Trans = plan.beats.find((b) => b.segmentIndex === 2 && b.type === "transition");
      expect(s2Trans?.clipId).toBe("T2_to_5");
      const s2Loop = plan.beats.find((b) => b.segmentIndex === 2 && b.type === "loop");
      expect(s2Loop?.clipId).toBe("M5_loop_v1");

      // Segment 3 (Compare): target M3 -> Transition T5_to_3 + M3_loop_v2
      const s3Trans = plan.beats.find((b) => b.segmentIndex === 3 && b.type === "transition");
      expect(s3Trans?.clipId).toBe("T5_to_3");
      const s3Loop = plan.beats.find((b) => b.segmentIndex === 3 && b.type === "loop");
      expect(s3Loop?.clipId).toBe("M3_loop_v2");

      // Segment 4 (Outro): target M1 -> Transition T3_to_1 + M1_loop_v1
      const s4Trans = plan.beats.find((b) => b.segmentIndex === 4 && b.type === "transition");
      expect(s4Trans?.clipId).toBe("T3_to_1");
      const s4Loop = plan.beats.find((b) => b.segmentIndex === 4 && b.type === "loop");
      expect(s4Loop?.clipId).toBe("M1_loop_v1");
      expect(s4Loop?.cameraCue).toBe("cam1_wide");
    });

    it("does not insert transitions when consecutive segments share the same pose", () => {
      const segments: DirectorSegmentInput[] = [
        { index: 0, text: "Statement one.", emotion: "neutral_composed", rhetoricAction: "explaining", poseState: "M2", duration: 3.0 },
        { index: 1, text: "Statement two.", emotion: "analytical_scrutiny", rhetoricAction: "explaining", poseState: "M2", duration: 3.0 },
      ];

      const plan = sequenceStoryPlan(segments, {
        mode: "semantic",
        initialPose: "M2",
      });

      expect(plan.poseTransitionsCount).toBe(0);
      expect(plan.beats.length).toBe(2);
      expect(plan.beats.every((b) => b.type === "loop")).toBe(true);
      expect(plan.beats.every((b) => b.startPose === "M2")).toBe(true);
    });
  });

  describe("Markov Mode Choreography", () => {
    it("generates a valid stochastic choreography sequence without failing", () => {
      const segments: DirectorSegmentInput[] = [
        { index: 0, text: "Sentence 1", duration: 3.0 },
        { index: 1, text: "Sentence 2", duration: 3.0 },
        { index: 2, text: "Sentence 3", duration: 3.0 },
        { index: 3, text: "Sentence 4", duration: 3.0 },
        { index: 4, text: "Sentence 5", duration: 3.0 },
      ];

      const plan = sequenceStoryPlan(segments, {
        mode: "markov",
        initialPose: "M1",
      });

      expect(plan.mode).toBe("markov");
      expect(plan.beats.length).toBeGreaterThanOrEqual(5);

      // Verify continuity between beats
      for (let i = 1; i < plan.beats.length; i++) {
        const prev = plan.beats[i - 1];
        const curr = plan.beats[i];
        expect(curr.startPose).toBe(prev.endPose);
      }
    });
  });

  describe("Hybrid Mode Choreography", () => {
    it("prioritizes high-signal tags deterministically and falls back to Markov for neutral speech", () => {
      const segments: DirectorSegmentInput[] = [
        { index: 0, text: "Welcome viewers.", duration: 4.0 }, // Deterministic Welcome -> M3
        { index: 1, text: "General neutral commentary about daily events.", duration: 4.0 }, // Markov continuation
        { index: 2, text: "A tribute to community solidarity and heartfelt recovery.", duration: 4.0 }, // Deterministic Heartfelt -> M4
        { index: 3, text: "Good night everyone.", duration: 3.5 }, // Deterministic Outro -> M1
      ];

      const plan = sequenceStoryPlan(segments, {
        mode: "hybrid",
        initialPose: "M1",
      });

      expect(plan.mode).toBe("hybrid");

      // Beat 0 should be deterministic welcoming
      const s0Loop = plan.beats.find((b) => b.segmentIndex === 0 && (b.type === "loop" || b.type === "dynamic_loop"));
      expect(s0Loop?.isDeterministic).toBe(true);
      expect(s0Loop?.startPose).toBe("M3");

      // Beat 2 should be deterministic heartfelt
      const s2Loop = plan.beats.find((b) => b.segmentIndex === 2 && (b.type === "loop" || b.type === "dynamic_loop"));
      expect(s2Loop?.isDeterministic).toBe(true);
      expect(s2Loop?.startPose).toBe("M4");

      // Beat 3 should be deterministic outro
      const s3Loop = plan.beats.find((b) => b.segmentIndex === 3 && (b.type === "loop" || b.type === "dynamic_loop"));
      expect(s3Loop?.isDeterministic).toBe(true);
      expect(s3Loop?.startPose).toBe("M1");
    });
  });

  describe("Database Asset Resolution", () => {
    it("resolves video keys for Mateo Beltrán from the SQLite database", async () => {
      const segments: DirectorSegmentInput[] = [
        { index: 0, text: "Welcome.", poseState: "M1", rhetoricAction: "little_movement", emotion: "neutral_composed", duration: 3.0 },
        { index: 1, text: "Explaining.", poseState: "M2", rhetoricAction: "emphasizing", emotion: "enthusiastic_upbeat", duration: 3.0 },
      ];

      const plan = sequenceStoryPlan(segments, {
        mode: "semantic",
        initialPose: "M1",
        personaSlug: "mateo",
      });

      const enriched = await resolveDirectorPlanMedia(plan, "mateo", "default_trait");

      const m1Loop = enriched.beats.find((b) => b.clipId === "M1_loop_v1");
      expect(m1Loop?.videoKey).toContain("assets/action_loops/veo/mateo_default_trait/mateo_default_trait_M1_loop_v1.mp4");

      const m2Loop = enriched.beats.find((b) => b.clipId === "M2_loop_v1");
      expect(m2Loop?.videoKey).toContain("assets/action_loops/veo/mateo_default_trait/mateo_default_trait_M2_loop_v1.mp4");
    });
  });
});
