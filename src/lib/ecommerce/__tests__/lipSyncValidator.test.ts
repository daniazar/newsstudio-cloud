import { describe, it, expect } from "vitest";
import {
  isLipSyncUpToDate,
  isRawActionLoopUrl,
  getActionLoopSlicesSignature,
  recordLipSyncSuccess,
  clearSceneLipSync,
} from "../lipSyncValidator";
import { AdScene } from "@/lib/types/ecommerce";

describe("lipSyncValidator", () => {
  const baseLipSyncedScene: AdScene = {
    id: "scene-1",
    sceneIndex: 0,
    startFrame: 0,
    durationFrames: 90,
    sceneType: "pattern_interrupt_hook",
    headline: "Hook Headline",
    visualActionPrompt: "Look at camera",
    primaryMediaUrl: "https://example.com/hero.jpg",
    voiceoverScript: "¡Atención! La revolución en pisos ya llegó.",
    audioUrl: "https://storage.local/audio/ruby-scene-1.wav",
    audioDuration: 3.0,
    audioCacheKey: "audio::ruby::s1.00::p0::omni::default::es::atencion",
    presenterVideoUrl: "/assets/cache/ecommerce/presenter_ruby_1789085421884.mp4",
    lipSyncAudioUrl: "https://storage.local/audio/ruby-scene-1.wav",
    lipSyncAudioCacheKey: "audio::ruby::s1.00::p0::omni::default::es::atencion",
    lipSyncLoopId: "ruby_burgundy_m1_loop_v1",
    lipSyncSlicesSignature: "ruby_burgundy_m1_loop_v1:90:0",
    presenterConfig: {
      mode: "custom",
      personaId: "ruby",
      avatarSrc: "/avatars/ruby.png",
      videoUrl: "/assets/cache/ecommerce/presenter_ruby_1789085421884.mp4",
      selectedActionLoopId: "ruby_burgundy_m1_loop_v1",
      actionLoopSlices: [
        {
          clipId: "ruby_burgundy_m1_loop_v1",
          videoUrl: "/assets/action_loops/veo/ruby_burgundy/ruby_burgundy_M1_loop_v1.mp4",
          localStartFrame: 0,
          sliceDurationFrames: 90,
          audioStartFrame: 0,
          audioDurationFrames: 90,
        },
      ],
    },
  };

  it("identifies raw action loop URLs vs synthesized presenter videos", () => {
    expect(isRawActionLoopUrl("/assets/action_loops/veo/ruby_burgundy/ruby_burgundy_M1_loop_v1.mp4")).toBe(true);
    expect(isRawActionLoopUrl("/assets/action_loops/ruby_master_suite/ruby_idle.mp4")).toBe(true);
    expect(isRawActionLoopUrl("/assets/cache/ecommerce/presenter_ruby_1789085421884.mp4")).toBe(false);
    expect(isRawActionLoopUrl("https://storage.example.com/ecommerce/ruby/videos/presenter_123.mp4")).toBe(false);
    expect(isRawActionLoopUrl("")).toBe(false);
    expect(isRawActionLoopUrl(undefined)).toBe(false);
  });

  it("skips previously generated lip-sync when audio and action loop are unchanged", () => {
    expect(isLipSyncUpToDate(baseLipSyncedScene)).toBe(true);
  });

  it("always skips Veo video scenes because they have native presenter performance", () => {
    const veoScene: AdScene = {
      ...baseLipSyncedScene,
      sceneType: "custom_veo_hero",
      customVeoVideoUrl: "/storage/veo_hero.mp4",
      presenterVideoUrl: undefined,
    };
    expect(isLipSyncUpToDate(veoScene)).toBe(true);
  });

  it("does NOT skip when presenterVideoUrl is missing or is an unsynthesized raw action loop", () => {
    const noVideoScene: AdScene = {
      ...baseLipSyncedScene,
      presenterVideoUrl: undefined,
    };
    expect(isLipSyncUpToDate(noVideoScene)).toBe(false);

    const rawLoopScene: AdScene = {
      ...baseLipSyncedScene,
      presenterVideoUrl: "/assets/action_loops/veo/ruby_burgundy/ruby_burgundy_M1_loop_v1.mp4",
    };
    expect(isLipSyncUpToDate(rawLoopScene)).toBe(false);
  });

  it("does NOT skip when underlying audio changed (audioUrl differs from lipSyncAudioUrl)", () => {
    const newAudioScene: AdScene = {
      ...baseLipSyncedScene,
      audioUrl: "https://storage.local/audio/ruby-scene-1-new-version.wav",
    };
    expect(isLipSyncUpToDate(newAudioScene)).toBe(false);
  });

  it("does NOT skip when underlying audio changed (audioCacheKey differs, e.g. text/speed/pitch shifted)", () => {
    const newCacheKeyScene: AdScene = {
      ...baseLipSyncedScene,
      audioCacheKey: "audio::ruby::s1.20::p2::omni::default::es::different_cadence",
    };
    expect(isLipSyncUpToDate(newCacheKeyScene)).toBe(false);
  });

  it("does NOT skip when loops are rerolled (selectedActionLoopId differs from lipSyncLoopId)", () => {
    const rerolledLoopScene: AdScene = {
      ...baseLipSyncedScene,
      presenterConfig: {
        ...baseLipSyncedScene.presenterConfig!,
        selectedActionLoopId: "ruby_burgundy_m3_loop_v1", // Rerolled from m1 to m3!
      },
    };
    expect(isLipSyncUpToDate(rerolledLoopScene)).toBe(false);
  });

  it("does NOT skip when continuous action loop slices are rerolled or reshuffled", () => {
    const rerolledSlicesScene: AdScene = {
      ...baseLipSyncedScene,
      actionLoopSlices: [
        {
          clipId: "ruby_burgundy_m4_loop_v1", // New continuous clip
          videoUrl: "/assets/action_loops/veo/ruby_burgundy/ruby_burgundy_M4_loop_v1.mp4",
          localStartFrame: 0,
          sliceDurationFrames: 90,
          audioStartFrame: 0,
          audioDurationFrames: 90,
        },
      ],
    };
    expect(isLipSyncUpToDate(rerolledSlicesScene)).toBe(false);
  });

  it("records lip-sync generation success with all tracking metadata", () => {
    const sceneToRecord: AdScene = {
      id: "scene-2",
      sceneIndex: 1,
      startFrame: 90,
      durationFrames: 90,
      sceneType: "pattern_interrupt_hook",
      headline: "Headline 2",
      visualActionPrompt: "Prompt",
      primaryMediaUrl: "/hero.jpg",
      voiceoverScript: "Check this out.",
      audioUrl: "/audio/ruby-2.wav",
      audioCacheKey: "key-ruby-2",
      presenterConfig: {
        mode: "custom",
        selectedActionLoopId: "ruby_burgundy_m2_loop_v1",
      },
    };

    const recorded = recordLipSyncSuccess(sceneToRecord, {
      videoUrl: "/assets/cache/ecommerce/presenter_ruby_scene_2.mp4",
      audioUrl: "/audio/ruby-2.wav",
      audioCacheKey: "key-ruby-2",
      loopId: "ruby_burgundy_m2_loop_v1",
    });

    expect(recorded.presenterVideoUrl).toBe("/assets/cache/ecommerce/presenter_ruby_scene_2.mp4");
    expect(recorded.lipSyncAudioUrl).toBe("/audio/ruby-2.wav");
    expect(recorded.lipSyncAudioCacheKey).toBe("key-ruby-2");
    expect(recorded.lipSyncLoopId).toBe("ruby_burgundy_m2_loop_v1");
    expect(isLipSyncUpToDate(recorded)).toBe(true);
  });

  it("clears lip-sync tracking metadata when cleared", () => {
    const cleared = clearSceneLipSync(baseLipSyncedScene);
    expect(cleared.presenterVideoUrl).toBeUndefined();
    expect(cleared.lipSyncAudioUrl).toBeUndefined();
    expect(cleared.lipSyncAudioCacheKey).toBeUndefined();
    expect(cleared.lipSyncLoopId).toBeUndefined();
    expect(cleared.lipSyncSlicesSignature).toBeUndefined();
    expect(isLipSyncUpToDate(cleared)).toBe(false);
  });
});
