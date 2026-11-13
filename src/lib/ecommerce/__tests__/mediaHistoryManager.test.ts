import { describe, it, expect } from "vitest";
import {
  swapScenePersonaWithMediaHistory,
  swapGlobalPersonaWithMediaHistory,
  invalidateSceneMediaOnScriptChange,
  clearScenePresenterVideo,
  filterExpiredMediaHistory,
  MEDIA_CACHE_TTL_MS,
} from "@/lib/ecommerce/mediaHistoryManager";
import { AdScene } from "@/lib/types/ecommerce";

describe("mediaHistoryManager", () => {
  const baseScene: AdScene = {
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
    audioCacheKey: "key-ruby-1",
    presenterVideoUrl: "https://storage.local/videos/ruby-scene-1.mp4",
    presenterConfig: {
      mode: "custom",
      personaId: "ruby_vance",
      avatarSrc: "/avatars/ruby.png",
      position: "bottom_right",
      layoutMode: "bottom_right",
      scale: 1.0,
      offsetX: 0,
      offsetY: 0,
      showNametag: true,
      presenterName: "Ruby Vance",
      roleTag: "Anchor",
    },
  };

  it("archives active media to mediaHistory and clears active media when switching to a fresh persona", () => {
    const res = swapScenePersonaWithMediaHistory(baseScene, "mateo", "ruby_vance");
    expect(res.wasRestored).toBe(false);
    expect(res.updatedScene.presenterConfig?.personaId).toBe("mateo");
    expect(res.updatedScene.audioUrl).toBeUndefined();
    expect(res.updatedScene.presenterVideoUrl).toBeUndefined();

    // Verify Ruby's media was archived into mediaHistory
    expect(res.updatedScene.mediaHistory).toBeDefined();
    expect(res.updatedScene.mediaHistory?.length).toBe(1);
    expect(res.updatedScene.mediaHistory?.[0].personaId).toBe("ruby_vance");
    expect(res.updatedScene.mediaHistory?.[0].audioUrl).toBe(baseScene.audioUrl);
    expect(res.updatedScene.mediaHistory?.[0].presenterVideoUrl).toBe(baseScene.presenterVideoUrl);
  });

  it("instantly restores audio and video when switching back to a previously cached persona", () => {
    // Step 1: Switch Ruby -> Mateo (Ruby gets archived)
    const step1 = swapScenePersonaWithMediaHistory(baseScene, "mateo", "ruby_vance");

    // Step 2: Simulate generating Mateo's audio and video
    const mateoScene: AdScene = {
      ...step1.updatedScene,
      audioUrl: "https://storage.local/audio/mateo-scene-1.wav",
      audioDuration: 2.8,
      audioCacheKey: "key-mateo-1",
      presenterVideoUrl: "https://storage.local/videos/mateo-scene-1.mp4",
    };

    // Step 3: Switch back from Mateo -> Ruby
    const step2 = swapScenePersonaWithMediaHistory(mateoScene, "ruby_vance", "mateo");

    expect(step2.wasRestored).toBe(true);
    expect(step2.updatedScene.presenterConfig?.personaId).toBe("ruby_vance");
    expect(step2.updatedScene.audioUrl).toBe(baseScene.audioUrl);
    expect(step2.updatedScene.presenterVideoUrl).toBe(baseScene.presenterVideoUrl);
    expect(step2.updatedScene.audioDuration).toBe(3.0);

    // Mateo's media should now be saved in mediaHistory
    const mateoHistory = step2.updatedScene.mediaHistory?.find((h) => h.personaId === "mateo");
    expect(mateoHistory).toBeDefined();
    expect(mateoHistory?.audioUrl).toBe("https://storage.local/audio/mateo-scene-1.wav");
  });

  it("filters out expired media items past the 48-hour TTL", () => {
    const now = Date.now();
    const history = [
      {
        personaId: "sofia",
        audioUrl: "old.wav",
        expiresAt: now - 1000, // Expired
      },
      {
        personaId: "mateo",
        audioUrl: "fresh.wav",
        expiresAt: now + MEDIA_CACHE_TTL_MS, // Valid
      },
    ];

    const valid = filterExpiredMediaHistory(history, now);
    expect(valid.length).toBe(1);
    expect(valid[0].personaId).toBe("mateo");
  });

  it("handles global persona swapping for inheriting scenes while preserving custom overrides", () => {
    const scenes: AdScene[] = [
      {
        ...baseScene,
        id: "s1",
        presenterConfig: { mode: "inherit", personaId: "ruby_vance" } as any,
      },
      {
        ...baseScene,
        id: "s2",
        presenterConfig: { mode: "custom", personaId: "diego" } as any, // Custom override
      },
    ];

    const result = swapGlobalPersonaWithMediaHistory(scenes, "mateo", "ruby_vance");
    expect(result.updatedScenes[0].presenterConfig?.personaId).toBe("mateo");
    expect(result.updatedScenes[0].presenterConfig?.mode).toBe("inherit");

    // Scene 2 has custom override for Diego, should remain untouched
    expect(result.updatedScenes[1].presenterConfig?.personaId).toBe("diego");
    expect(result.updatedScenes[1].presenterConfig?.mode).toBe("custom");
  });

  it("invalidates all media and clears mediaHistory when the scene voiceover script changes", () => {
    const sceneWithHistory: AdScene = {
      ...baseScene,
      mediaHistory: [
        {
          personaId: "mateo",
          audioUrl: "https://storage.local/old.wav",
          expiresAt: Date.now() + 100000,
        },
      ],
    };

    const invalidated = invalidateSceneMediaOnScriptChange(
      sceneWithHistory,
      "Texto completamente nuevo para la escena."
    );

    expect(invalidated.audioUrl).toBeUndefined();
    expect(invalidated.presenterVideoUrl).toBeUndefined();
    expect(invalidated.audioCacheKey).toBeUndefined();
    expect(invalidated.mediaHistory).toEqual([]);
    expect(invalidated.voiceoverScript).toBe("Texto completamente nuevo para la escena.");
  });

  it("clears presenterVideoUrl from scene, presenter configs, and mediaHistory for the active persona", () => {
    const sceneWithVideo: AdScene = {
      ...baseScene,
      presenterVideoUrl: "https://storage.local/videos/ruby-scene-1.mp4",
      presenterConfig: {
        mode: "custom",
        personaId: "ruby",
        videoUrl: "https://storage.local/videos/ruby-scene-1.mp4",
      },
      presenter: {
        mode: "custom",
        personaId: "ruby",
        videoUrl: "https://storage.local/videos/ruby-scene-1.mp4",
      },
      mediaHistory: [
        {
          personaId: "ruby",
          audioUrl: "https://storage.local/ruby.wav",
          presenterVideoUrl: "https://storage.local/videos/ruby-scene-1.mp4",
          expiresAt: Date.now() + 100000,
        },
        {
          personaId: "mateo",
          audioUrl: "https://storage.local/mateo.wav",
          presenterVideoUrl: "https://storage.local/videos/mateo-scene-1.mp4",
          expiresAt: Date.now() + 100000,
        },
      ],
    };

    const cleared = clearScenePresenterVideo(sceneWithVideo);

    expect(cleared.presenterVideoUrl).toBeUndefined();
    expect(cleared.presenterConfig?.videoUrl).toBeUndefined();
    expect(cleared.presenter?.videoUrl).toBeUndefined();
    expect(cleared.audioUrl).toBe(baseScene.audioUrl); // Audio untouched!
    expect(cleared.mediaHistory?.[0].presenterVideoUrl).toBeUndefined();
    expect(cleared.mediaHistory?.[1].presenterVideoUrl).toBe("https://storage.local/videos/mateo-scene-1.mp4"); // Other persona untouched
  });
});
