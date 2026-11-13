import { describe, it, expect } from "vitest";
import {
  generateRandomLoopSequence,
  sliceSequenceForScene,
  RUBY_BURGUNDY_37_CLIPS,
  parsePoseFromClipId,
  getScenePoseBounds,
  getContinuityPreservingLoopCandidates,
  reshuffleSceneActionLoop,
} from "@/lib/ecommerce/actionLoopFsmEngine";

describe("actionLoopFsmEngine", () => {
  it("has loaded the full 37-clip manifest", () => {
    expect(RUBY_BURGUNDY_37_CLIPS.length).toBe(37);
  });

  describe("generateRandomLoopSequence", () => {
    it("generates a sequence meeting target duration with continuous Markov transitions", () => {
      const targetFrames = 300;
      const sequence = generateRandomLoopSequence(targetFrames, {
        startingLoopId: "M1_loop_v1",
      });

      expect(sequence.length).toBeGreaterThan(1);
      expect(sequence[0].clipId).toBe("M1_loop_v1");

      let total = 0;
      for (let i = 0; i < sequence.length; i++) {
        const clip = sequence[i];
        total += clip.durationFrames;

        if (i > 0) {
          const prev = sequence[i - 1];
          expect(clip.startPose).toBe(prev.endPose);
          expect(clip.globalStartFrame).toBe(prev.globalEndFrame);
        }
      }

      expect(total).toBeGreaterThanOrEqual(targetFrames);
    });

    it("picks a randomized starter across clips when startingLoopId is omitted", () => {
      const starters = new Set<string>();
      for (let i = 0; i < 30; i++) {
        const seq = generateRandomLoopSequence(100);
        starters.add(seq[0].clipId);
      }
      expect(starters.size).toBeGreaterThan(1);
    });

    it("respects requested finalPose return transition", () => {
      const sequence = generateRandomLoopSequence(500, {
        startingLoopId: "M3_loop_v1",
        finalPose: "M1",
      });

      const finalClip = sequence[sequence.length - 1];
      expect(finalClip.endPose).toBe("M1");
    });
  });

  describe("sliceSequenceForScene", () => {
    it("preserves continuous offsets between Scene 1 and Scene 2", () => {
      const sequence = [
        {
          clipId: "M1_loop_v1",
          type: "loop" as const,
          startPose: "M1",
          endPose: "M1",
          durationFrames: 185,
          videoUrl: "/assets/action_loops/veo/ruby_burgundy/ruby_burgundy_M1_loop_v1.mp4",
          globalStartFrame: 0,
          globalEndFrame: 185,
          label: "M1->M1",
        },
        {
          clipId: "T1_to_2",
          type: "transition" as const,
          startPose: "M1",
          endPose: "M2",
          durationFrames: 92,
          videoUrl: "/assets/action_loops/veo/ruby_burgundy/ruby_burgundy_T1_to_2.mp4",
          globalStartFrame: 185,
          globalEndFrame: 277,
          label: "M1->M2",
        },
      ];

      const scene1Slices = sliceSequenceForScene(sequence, 0, 100);
      expect(scene1Slices.length).toBe(1);
      expect(scene1Slices[0].clipId).toBe("M1_loop_v1");
      expect(scene1Slices[0].localStartFrame).toBe(0);
      expect(scene1Slices[0].sliceDurationFrames).toBe(100);

      const scene2Slices = sliceSequenceForScene(sequence, 100, 120);
      expect(scene2Slices.length).toBe(2);

      expect(scene2Slices[0].clipId).toBe("M1_loop_v1");
      expect(scene2Slices[0].localStartFrame).toBe(100);
      expect(scene2Slices[0].sliceDurationFrames).toBe(85);
      expect(scene2Slices[0].audioStartFrame).toBe(0);

      expect(scene2Slices[1].clipId).toBe("T1_to_2");
      expect(scene2Slices[1].localStartFrame).toBe(0);
      expect(scene2Slices[1].sliceDurationFrames).toBe(35);
      expect(scene2Slices[1].audioStartFrame).toBe(85);
    });
  });

  describe("Continuity-Preserving Single-Scene Reshuffling", () => {
    it("parses start and end poses accurately from clip IDs", () => {
      expect(parsePoseFromClipId("M1_loop_v1")).toEqual({ startPose: "M1", endPose: "M1" });
      expect(parsePoseFromClipId("ruby_burgundy_M3_dynamic_v1")).toEqual({ startPose: "M3", endPose: "M3" });
      expect(parsePoseFromClipId("T1_to_4")).toEqual({ startPose: "M1", endPose: "M4" });
      expect(parsePoseFromClipId("mateo_default_trait_T5_to_2")).toEqual({ startPose: "M5", endPose: "M2" });
    });

    it("extracts entry and exit poses from scenes correctly", () => {
      // From slices
      const slicedScene = {
        actionLoopSlices: [
          { clipId: "M2_loop_v1" },
          { clipId: "T2_to_5" },
        ],
      };
      expect(getScenePoseBounds(slicedScene as any)).toEqual({ entryPose: "M2", exitPose: "M5" });

      // From presenterConfig
      const singleScene = {
        presenterConfig: {
          selectedActionLoopId: "T3_to_1",
        },
      };
      expect(getScenePoseBounds(singleScene as any)).toEqual({ entryPose: "M3", exitPose: "M1" });
    });

    it("finds all valid clips preserving same-pose continuity (e.g. M1 -> M1)", () => {
      const result = getContinuityPreservingLoopCandidates({
        requiredStartPose: "M1",
        requiredEndPose: "M1",
        currentClipId: "M1_loop_v1",
        personaId: "ruby",
      });

      // M1_loop_v1, M1_loop_v2, M1_dynamic_v1, M1_hair_adjust_v1
      expect(result.allMatchingClips.length).toBe(4);
      expect(result.allMatchingClips.every((c) => c.startPose === "M1" && c.endPose === "M1")).toBe(true);

      // Alternative clips excludes the current clip (M1_loop_v1)
      expect(result.alternativeClips.length).toBe(3);
      expect(result.alternativeClips.some((c) => c.id === "M1_loop_v1")).toBe(false);
    });

    it("finds exact transition clip preserving pose change continuity (e.g. M2 -> M4)", () => {
      const result = getContinuityPreservingLoopCandidates({
        requiredStartPose: "M2",
        requiredEndPose: "M4",
        personaId: "ruby",
      });

      expect(result.allMatchingClips.length).toBe(1);
      expect(result.allMatchingClips[0].id).toBe("T2_to_4");
      expect(result.allMatchingClips[0].startPose).toBe("M2");
      expect(result.allMatchingClips[0].endPose).toBe("M4");
    });

    it("reshuffles active middle scene with strict continuity to prev and next scenes", () => {
      const scenes = [
        {
          id: "s0",
          durationFrames: 90,
          presenterConfig: { selectedActionLoopId: "T1_to_2" }, // Ends at M2
        },
        {
          id: "s1", // Active scene to reshuffle
          durationFrames: 120,
          presenterConfig: { selectedActionLoopId: "M2_loop_v1" }, // Starts M2, Ends M2
        },
        {
          id: "s2",
          durationFrames: 90,
          presenterConfig: { selectedActionLoopId: "M2_loop_v2" }, // Starts M2
        },
      ];

      const res = reshuffleSceneActionLoop(scenes, 1, "ruby");
      expect(res).not.toBeNull();
      expect(res!.requiredStartPose).toBe("M2");
      expect(res!.requiredEndPose).toBe("M2");
      expect(res!.selectedClip.startPose).toBe("M2");
      expect(res!.selectedClip.endPose).toBe("M2");

      // Verify that Scene 0 and Scene 2 were NOT modified
      expect(res!.updatedScenes[0].presenterConfig.selectedActionLoopId).toBe("T1_to_2");
      expect(res!.updatedScenes[2].presenterConfig.selectedActionLoopId).toBe("M2_loop_v2");

      // Verify Scene 1 was updated with valid slices and videoUrl
      const updatedS1 = res!.updatedScenes[1];
      expect(updatedS1.presenterConfig.selectedActionLoopId).toBe(res!.selectedClip.id);
      expect(updatedS1.actionLoopSlices).toHaveLength(1);
      expect(updatedS1.actionLoopSlices![0].clipId).toBe(res!.selectedClip.id);
      expect(updatedS1.actionLoopSlices![0].sliceDurationFrames).toBe(120);
    });

    it("allows any start pose when reshuffling the first scene (Scene 0)", () => {
      const scenes = [
        {
          id: "s0",
          durationFrames: 90,
          presenterConfig: { selectedActionLoopId: "M1_loop_v1" },
        },
        {
          id: "s1",
          durationFrames: 90,
          presenterConfig: { selectedActionLoopId: "M3_loop_v1" }, // Starts at M3
        },
      ];

      const res = reshuffleSceneActionLoop(scenes, 0, "ruby");
      expect(res).not.toBeNull();
      expect(res!.requiredStartPose).toBeNull();
      expect(res!.requiredEndPose).toBe("M3"); // Must end at M3 to feed into Scene 1!
      expect(res!.selectedClip.endPose).toBe("M3");
    });

    it("allows any end pose when reshuffling the last scene", () => {
      const scenes = [
        {
          id: "s0",
          durationFrames: 90,
          presenterConfig: { selectedActionLoopId: "T1_to_4" }, // Ends at M4
        },
        {
          id: "s1", // Last scene
          durationFrames: 90,
          presenterConfig: { selectedActionLoopId: "M4_loop_v1" },
        },
      ];

      const res = reshuffleSceneActionLoop(scenes, 1, "ruby");
      expect(res).not.toBeNull();
      expect(res!.requiredStartPose).toBe("M4"); // Must start at M4 from Scene 0!
      expect(res!.requiredEndPose).toBeNull();
      expect(res!.selectedClip.startPose).toBe("M4");
    });

    it("respects selected persona (e.g. storm) in reshuffleSceneActionLoop and sequence generation", () => {
      const scenes = [
        {
          id: "s0",
          durationFrames: 90,
          presenterConfig: { selectedActionLoopId: "storm_storm_field_jacket_M1_loop_v1" },
        },
        {
          id: "s1",
          durationFrames: 90,
          presenterConfig: { selectedActionLoopId: "storm_storm_field_jacket_M2_loop_v1" },
        },
      ];

      const res = reshuffleSceneActionLoop(scenes, 0, "storm");
      expect(res).not.toBeNull();
      expect(res!.selectedClip.file).toContain("storm_storm_field_jacket");

      const seq = generateRandomLoopSequence(120, { personaId: "storm" });
      expect(seq.length).toBeGreaterThan(0);
      expect(seq[0].videoUrl).toContain("storm_storm_field_jacket");
    });
  });
});
