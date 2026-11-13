import { describe, it, expect } from "vitest";
import {
  calculateStoryboardContinuity,
  healStoryboardActionLoopContinuity,
  getScenePoseBounds,
  isActionLoopScene,
} from "../actionLoopFsmEngine";
import { AdScene } from "@/lib/types/ecommerce";

describe("actionLoopFsmEngine - Continuity & Storyboard Healing", () => {
  it("correctly identifies action loop scenes and skips Veo hero video scenes", () => {
    const regularScene = {
      id: "s1",
      sceneType: "presenter_full",
      presenterVideoUrl: "/assets/action_loops/veo/ruby_burgundy/ruby_burgundy_M1_loop_v1.mp4",
    };
    const veoHeroScene = {
      id: "s2",
      sceneType: "custom_veo_hero",
      customVeoVideoUrl: "https://example.com/veo.mp4",
    };
    const brollScene = {
      id: "s3",
      sceneType: "broll_only",
      primaryMediaUrl: "https://example.com/photo.jpg",
    };

    expect(isActionLoopScene(regularScene)).toBe(true);
    expect(isActionLoopScene(veoHeroScene)).toBe(false);
    expect(isActionLoopScene(brollScene)).toBe(false);
  });

  it("reports 100% continuity for matching sequential pose loops", () => {
    const scenes: Partial<AdScene>[] = [
      {
        id: "s1",
        sceneType: "pattern_interrupt_hook",
        actionLoopSlices: [
          {
            clipId: "M1_loop_v1", // M1 -> M1
            videoUrl: "/test1.mp4",
            localStartFrame: 0,
            sliceDurationFrames: 90,
            audioStartFrame: 0,
            audioDurationFrames: 90,
          },
        ],
      },
      {
        id: "s2",
        sceneType: "before_after_wipe",
        actionLoopSlices: [
          {
            clipId: "T1_to_2", // M1 -> M2
            videoUrl: "/test2.mp4",
            localStartFrame: 0,
            sliceDurationFrames: 90,
            audioStartFrame: 0,
            audioDurationFrames: 90,
          },
        ],
      },
      {
        id: "s3",
        sceneType: "pattern_interrupt_hook",
        actionLoopSlices: [
          {
            clipId: "M2_loop_v1", // M2 -> M2
            videoUrl: "/test3.mp4",
            localStartFrame: 0,
            sliceDurationFrames: 90,
            audioStartFrame: 0,
            audioDurationFrames: 90,
          },
        ],
      },
    ];

    const report = calculateStoryboardContinuity(scenes, "ruby");
    expect(report.totalBoundaries).toBe(2);
    expect(report.seamlessBoundaries).toBe(2);
    expect(report.scorePct).toBe(100);
    expect(report.isSeamless).toBe(true);
    expect(report.discontinuities).toHaveLength(0);
  });

  it("detects posture discontinuities when exitPose !== entryPose", () => {
    const scenes: Partial<AdScene>[] = [
      {
        id: "s1",
        sceneType: "pattern_interrupt_hook",
        actionLoopSlices: [
          {
            clipId: "M1_loop_v1", // Exit pose: M1
            videoUrl: "/test1.mp4",
            localStartFrame: 0,
            sliceDurationFrames: 90,
            audioStartFrame: 0,
            audioDurationFrames: 90,
          },
        ],
      },
      {
        id: "s2",
        sceneType: "before_after_wipe",
        actionLoopSlices: [
          {
            clipId: "M3_loop_v1", // Entry pose: M3 -> Mismatch!
            videoUrl: "/test2.mp4",
            localStartFrame: 0,
            sliceDurationFrames: 90,
            audioStartFrame: 0,
            audioDurationFrames: 90,
          },
        ],
      },
    ];

    const report = calculateStoryboardContinuity(scenes, "ruby");
    expect(report.totalBoundaries).toBe(1);
    expect(report.seamlessBoundaries).toBe(0);
    expect(report.scorePct).toBe(0);
    expect(report.isSeamless).toBe(false);
    expect(report.discontinuities).toHaveLength(1);
    expect(report.discontinuities[0].exitPoseA).toBe("M1");
    expect(report.discontinuities[0].entryPoseB).toBe("M3");
  });

  it("automatically heals discontinuities across scenes", () => {
    const scenes: any[] = [
      {
        id: "s1",
        sceneType: "presenter_full",
        durationFrames: 90,
        actionLoopSlices: [
          {
            clipId: "M1_loop_v1", // Exit: M1
            videoUrl: "/test1.mp4",
            localStartFrame: 0,
            sliceDurationFrames: 90,
            audioStartFrame: 0,
            audioDurationFrames: 90,
          },
        ],
      },
      {
        id: "s2",
        sceneType: "presenter_pip",
        durationFrames: 90,
        actionLoopSlices: [
          {
            clipId: "M4_loop_v1", // Entry: M4 -> Discontinuity!
            videoUrl: "/test2.mp4",
            localStartFrame: 0,
            sliceDurationFrames: 90,
            audioStartFrame: 0,
            audioDurationFrames: 90,
          },
        ],
      },
    ];

    const healResult = healStoryboardActionLoopContinuity(scenes, "ruby");
    expect(healResult.healedCount).toBe(1);
    expect(healResult.initialScorePct).toBe(0);
    expect(healResult.finalScorePct).toBe(100);

    // Verify scene 2 was updated with a loop starting in M1
    const boundsS2 = getScenePoseBounds(healResult.healedScenes[1], "ruby");
    expect(boundsS2.entryPose).toBe("M1");
    expect(healResult.healedScenes[1].actionLoopSlices[0].clipId).toBeDefined();
    // Verify lip-sync signatures were invalidated for re-sync
    expect(healResult.healedScenes[1].lipSyncAudioUrl).toBeUndefined();
  });
});
