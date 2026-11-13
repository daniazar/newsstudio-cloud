import { describe, it, expect } from "vitest";
import { AdScene } from "@/lib/types/ecommerce";

describe("Scene Media Assignment & Multi-Scene Aggregation", () => {
  const checkIsVideo = (url: string, type?: string) => {
    if (!url) return false;
    if (type === "existing_video" || type === "custom_veo_hero" || type === "video") return true;
    const clean = url.split("?")[0].toLowerCase();
    return (
      clean.endsWith(".mp4") ||
      clean.endsWith(".webm") ||
      clean.endsWith(".mov") ||
      clean.endsWith(".m4v") ||
      clean.includes("/video/") ||
      clean.includes("veo_")
    );
  };

  it("accurately identifies video URLs and video asset types", () => {
    expect(checkIsVideo("https://storage.example.com/renders/veo_scene_1.mp4")).toBe(true);
    expect(checkIsVideo("https://storage.example.com/preview.webm")).toBe(true);
    expect(checkIsVideo("https://example.com/asset?id=123", "existing_video")).toBe(true);
    expect(checkIsVideo("https://example.com/product.png")).toBe(false);
    expect(checkIsVideo("https://example.com/photo.jpg?w=800")).toBe(false);
  });

  it("calculates scene usage across all scenes in an ad script", () => {
    const videoUrl = "https://storage.example.com/veo_hero.mp4";
    const photoUrl = "https://storage.example.com/product_front.png";

    const scenes: AdScene[] = [
      {
        id: "sc_1",
        sceneIndex: 1,
        startFrame: 0,
        headline: "Hook",
        voiceoverScript: "Stop scrolling!",
        visualActionPrompt: "Close up hook",
        durationFrames: 150,
        primaryMediaUrl: photoUrl,
        sceneType: "pattern_interrupt_hook",
      },
      {
        id: "sc_2",
        sceneIndex: 2,
        startFrame: 150,
        headline: "Hero Presentation",
        voiceoverScript: "Check out this build.",
        visualActionPrompt: "Product rotation",
        durationFrames: 240,
        primaryMediaUrl: videoUrl,
        customVeoVideoUrl: videoUrl,
        sceneType: "custom_veo_hero",
      },
      {
        id: "sc_3",
        sceneIndex: 3,
        startFrame: 390,
        headline: "Call to Action",
        voiceoverScript: "Get yours today!",
        visualActionPrompt: "CTA button and card",
        durationFrames: 120,
        primaryMediaUrl: videoUrl,
        customVeoVideoUrl: videoUrl,
        sceneType: "custom_veo_hero",
      },
    ];

    const getUsedScenes = (url: string) => {
      const used: number[] = [];
      scenes.forEach((s, idx) => {
        const num = s.sceneIndex ?? (idx + 1);
        if (s.primaryMediaUrl === url || s.customVeoVideoUrl === url || s.secondaryMediaUrl === url) {
          if (!used.includes(num)) used.push(num);
        }
      });
      return used.sort((a, b) => a - b);
    };

    expect(getUsedScenes(photoUrl)).toEqual([1]);
    expect(getUsedScenes(videoUrl)).toEqual([2, 3]);
    expect(getUsedScenes("https://storage.example.com/unused.png")).toEqual([]);
  });

  it("correctly switches scene type to custom_veo_hero when a video is assigned", () => {
    const initialScene: AdScene = {
      id: "sc_1",
      sceneIndex: 1,
      startFrame: 0,
      headline: "Hook",
      voiceoverScript: "Watch this.",
      visualActionPrompt: "Initial hook prompt",
      durationFrames: 150,
      primaryMediaUrl: "https://example.com/photo.png",
      sceneType: "pattern_interrupt_hook",
    };

    const newVideoUrl = "https://storage.example.com/veo_generation.mp4";
    const isVideo = checkIsVideo(newVideoUrl);

    const updatedScene: AdScene = {
      ...initialScene,
      primaryMediaUrl: newVideoUrl,
      customVeoVideoUrl: isVideo ? newVideoUrl : undefined,
      sceneType: isVideo ? "custom_veo_hero" : (initialScene.sceneType === "custom_veo_hero" ? "pattern_interrupt_hook" : initialScene.sceneType),
    };

    expect(updatedScene.sceneType).toBe("custom_veo_hero");
    expect(updatedScene.customVeoVideoUrl).toBe(newVideoUrl);
    expect(updatedScene.primaryMediaUrl).toBe(newVideoUrl);
  });

  it("reverts scene type back from custom_veo_hero when a product photo is assigned", () => {
    const initialScene: AdScene = {
      id: "sc_2",
      sceneIndex: 2,
      startFrame: 0,
      headline: "Hero",
      voiceoverScript: "Amazing quality.",
      visualActionPrompt: "Packshot hero display",
      durationFrames: 240,
      primaryMediaUrl: "https://storage.example.com/veo.mp4",
      customVeoVideoUrl: "https://storage.example.com/veo.mp4",
      sceneType: "custom_veo_hero",
    };

    const newPhotoUrl = "https://example.com/packshot.jpg";
    const isVideo = checkIsVideo(newPhotoUrl);

    const updatedScene: AdScene = {
      ...initialScene,
      primaryMediaUrl: newPhotoUrl,
      customVeoVideoUrl: isVideo ? newPhotoUrl : undefined,
      sceneType: isVideo ? "custom_veo_hero" : (initialScene.sceneType === "custom_veo_hero" ? "pattern_interrupt_hook" : initialScene.sceneType),
    };

    expect(updatedScene.sceneType).toBe("pattern_interrupt_hook");
    expect(updatedScene.customVeoVideoUrl).toBeUndefined();
    expect(updatedScene.primaryMediaUrl).toBe(newPhotoUrl);
  });

  it("broadcasts media across all scenes when target is -1", () => {
    const scenes: AdScene[] = [
      { id: "1", sceneIndex: 1, startFrame: 0, headline: "H1", voiceoverScript: "N1", visualActionPrompt: "A1", primaryMediaUrl: "https://example.com/p1.png", durationFrames: 100, sceneType: "pattern_interrupt_hook" },
      { id: "2", sceneIndex: 2, startFrame: 100, headline: "H2", voiceoverScript: "N2", visualActionPrompt: "A2", primaryMediaUrl: "https://example.com/p2.png", durationFrames: 100, sceneType: "before_after_wipe" },
      { id: "3", sceneIndex: 3, startFrame: 200, headline: "H3", voiceoverScript: "N3", visualActionPrompt: "A3", primaryMediaUrl: "https://example.com/p3.png", durationFrames: 100, sceneType: "price_promo_outro" },
    ];

    const customVideoUrl = "https://storage.example.com/universal_hero.mp4";
    const targetSceneIndex = -1;
    const isVideo = true;

    const newScenes = scenes.map((s) => {
      if (targetSceneIndex === -1 || s.sceneIndex === targetSceneIndex) {
        return {
          ...s,
          primaryMediaUrl: customVideoUrl,
          customVeoVideoUrl: isVideo ? customVideoUrl : undefined,
          sceneType: isVideo
            ? ("custom_veo_hero" as const)
            : s.sceneType === "custom_veo_hero"
            ? ("pattern_interrupt_hook" as const)
            : s.sceneType,
        };
      }
      return s;
    });

    expect(newScenes.every((s) => s.primaryMediaUrl === customVideoUrl)).toBe(true);
    expect(newScenes.every((s) => s.customVeoVideoUrl === customVideoUrl)).toBe(true);
    expect(newScenes.every((s) => s.sceneType === "custom_veo_hero")).toBe(true);
  });
});
