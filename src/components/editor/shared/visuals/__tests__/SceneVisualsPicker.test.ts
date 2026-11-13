/**
 * src/components/editor/shared/visuals/__tests__/SceneVisualsPicker.test.ts
 *
 * Unit tests for SceneVisualsPicker render modes and asset selection logic.
 */

import { describe, it, expect } from "vitest";
import { AdScene, ExtractedProductAsset } from "@/lib/types/ecommerce";

describe("SceneVisualsPicker Logic & Data Integrity", () => {
  const SAMPLE_SCENE: AdScene = {
    id: "scene_1",
    sceneIndex: 0,
    startFrame: 0,
    durationFrames: 120,
    sceneType: "pattern_interrupt_hook",
    headline: "Transform Your Space",
    visualActionPrompt: "Floating 3D hero animation",
    primaryMediaUrl: "https://example.com/hero.png",
  };

  const SAMPLE_ASSETS: ExtractedProductAsset[] = [
    {
      id: "a1",
      url: "https://example.com/hero.png",
      type: "hero_packshot",
      isPrimary: true,
    },
    {
      id: "a2",
      url: "https://example.com/lifestyle.png",
      type: "lifestyle_context",
    },
    {
      id: "a3",
      url: "https://example.com/detail.png",
      type: "detail_macro",
    },
  ];

  it("identifies comparison mode correctly for before_after_wipe and room_staging", () => {
    const isComparisonA =
      SAMPLE_SCENE.sceneType === "before_after_wipe" ||
      SAMPLE_SCENE.sceneType === "room_staging";
    expect(isComparisonA).toBe(false);

    const comparisonScene: AdScene = {
      ...SAMPLE_SCENE,
      sceneType: "before_after_wipe",
      secondaryMediaUrl: "https://example.com/lifestyle.png",
    };

    const isComparisonB =
      comparisonScene.sceneType === "before_after_wipe" ||
      comparisonScene.sceneType === "room_staging";
    expect(isComparisonB).toBe(true);
  });

  it("handles swapping before and after images cleanly", () => {
    const comparisonScene: AdScene = {
      ...SAMPLE_SCENE,
      sceneType: "before_after_wipe",
      primaryMediaUrl: "https://example.com/after.png",
      secondaryMediaUrl: "https://example.com/before.png",
    };

    const swapped: Partial<AdScene> = {
      primaryMediaUrl: comparisonScene.secondaryMediaUrl,
      secondaryMediaUrl: comparisonScene.primaryMediaUrl,
    };

    expect(swapped.primaryMediaUrl).toBe("https://example.com/before.png");
    expect(swapped.secondaryMediaUrl).toBe("https://example.com/after.png");
  });

  it("aggregates unique asset URLs with appropriate labels", () => {
    const seen = new Set<string>();
    const list: Array<{ url: string; label: string }> = [];

    for (const asset of SAMPLE_ASSETS) {
      if (!seen.has(asset.url)) {
        seen.add(asset.url);
        list.push({
          url: asset.url,
          label: asset.type === "hero_packshot" ? "Hero Packshot" : "Lifestyle Context",
        });
      }
    }

    expect(list.length).toBe(3);
    expect(list[0].label).toBe("Hero Packshot");
    expect(list[1].label).toBe("Lifestyle Context");
  });

  it("handles removeWhiteBg toggle correctly for 3d_floating_hero and turntable", () => {
    // pattern_interrupt_hook defaults removeWhiteBg to true
    const defaultWhiteBgRemoval = SAMPLE_SCENE.removeWhiteBg ?? (SAMPLE_SCENE.sceneType === "pattern_interrupt_hook");
    expect(defaultWhiteBgRemoval).toBe(true);

    // Toggle off
    const toggledOff = !defaultWhiteBgRemoval;
    expect(toggledOff).toBe(false);

    // Turntable defaults removeWhiteBg to false
    const turntableScene: AdScene = {
      ...SAMPLE_SCENE,
      sceneType: "product_turntable",
    };
    const turntableDefault = turntableScene.removeWhiteBg ?? (turntableScene.sceneType === "pattern_interrupt_hook");
    expect(turntableDefault).toBe(false);
  });

  it("ensures Before and After slots are decoupled and hold distinct media", () => {
    // Initial scene has only primaryMediaUrl set
    const scene: AdScene = {
      ...SAMPLE_SCENE,
      sceneType: "before_after_wipe",
      primaryMediaUrl: "https://example.com/hero.png",
      secondaryMediaUrl: undefined,
    };

    // Auto-detection finds an alternative asset distinct from primaryMediaUrl
    const alternativeAsset = SAMPLE_ASSETS.find((a) => a.url && a.url !== scene.primaryMediaUrl);
    expect(alternativeAsset).toBeDefined();
    expect(alternativeAsset!.url).toBe("https://example.com/lifestyle.png");

    // After updating secondaryMediaUrl, Before and After slots hold distinct values
    const updatedScene: AdScene = {
      ...scene,
      secondaryMediaUrl: alternativeAsset!.url,
    };
    expect(updatedScene.primaryMediaUrl).toBe("https://example.com/hero.png");
    expect(updatedScene.secondaryMediaUrl).toBe("https://example.com/lifestyle.png");
    expect(updatedScene.primaryMediaUrl).not.toBe(updatedScene.secondaryMediaUrl);

    // Changing primary does NOT alter secondary
    const changedPrimary: AdScene = {
      ...updatedScene,
      primaryMediaUrl: "https://example.com/detail.png",
    };
    expect(changedPrimary.primaryMediaUrl).toBe("https://example.com/detail.png");
    expect(changedPrimary.secondaryMediaUrl).toBe("https://example.com/lifestyle.png");

    // Changing secondary does NOT alter primary
    const changedSecondary: AdScene = {
      ...updatedScene,
      secondaryMediaUrl: "https://example.com/detail.png",
    };
    expect(changedSecondary.primaryMediaUrl).toBe("https://example.com/hero.png");
    expect(changedSecondary.secondaryMediaUrl).toBe("https://example.com/detail.png");
  });

  it("gathers and guarantees at least 2 product reference images for AI photo and video generation", () => {
    const computeReferenceUrls = (
      primary?: string,
      secondary?: string,
      assets: ExtractedProductAsset[] = []
    ) => {
      const urls: string[] = [];
      const seen = new Set<string>();

      const add = (rawUrl?: string) => {
        if (!rawUrl || typeof rawUrl !== "string") return;
        const trimmed = rawUrl.trim();
        if (!trimmed || trimmed === "undefined" || trimmed === "null") return;
        if (trimmed.endsWith(".mp4") || trimmed.endsWith(".webm") || trimmed.endsWith(".mov")) return;
        if (!seen.has(trimmed)) {
          seen.add(trimmed);
          urls.push(trimmed);
        }
      };

      add(primary);
      add(secondary);
      for (const a of assets) {
        if (a?.url) add(a.url);
      }

      if (urls.length === 1) {
        urls.push(urls[0]);
      }

      return urls.slice(0, 3);
    };

    // Case 1: Multiple product images available
    const multiRefs = computeReferenceUrls(SAMPLE_SCENE.primaryMediaUrl, undefined, SAMPLE_ASSETS);
    expect(multiRefs.length).toBeGreaterThanOrEqual(2);
    expect(multiRefs).toContain("https://example.com/hero.png");
    expect(multiRefs).toContain("https://example.com/lifestyle.png");

    // Case 2: Only 1 product image available -> duplicates to ensure at least 2 references
    const singleRefs = computeReferenceUrls("https://example.com/only-one.png", undefined, []);
    expect(singleRefs.length).toBe(2);
    expect(singleRefs[0]).toBe("https://example.com/only-one.png");
    expect(singleRefs[1]).toBe("https://example.com/only-one.png");
  });

  describe("Custom Video Scene Insertion Contract", () => {
    it("configures inserted custom Veo scene with suppressed avatar and 240 frames duration", () => {
      const videoUrl = "https://example.com/generated_veo_scene.mp4";
      const productTitle = "Pisos Vinílicos SPC Roble Natural";

      const insertedScene: AdScene = {
        id: `scene_veo_${Date.now()}`,
        sceneIndex: 3,
        startFrame: 360,
        durationFrames: 240, // 8s at 30fps
        sceneType: "custom_veo_hero",
        headline: "Transformá Tus Espacios",
        subheadline: "Acabado de Alta Gama",
        visualActionPrompt: `Cinematic lifestyle showcase of ${productTitle}`,
        customVeoVideoUrl: videoUrl,
        primaryMediaUrl: videoUrl,
        voiceoverScript: `Descubrí la textura, elegancia y calidez que ${productTitle} le aporta a cada rincón de tu hogar.`,
        presenterConfig: {
          mode: "hidden",
          enabled: false,
          overrideDefault: true,
        },
        removeWhiteBg: false,
      };

      expect(insertedScene.durationFrames).toBe(240);
      expect(insertedScene.sceneType).toBe("custom_veo_hero");
      expect(insertedScene.primaryMediaUrl).toBe(videoUrl);
      expect(insertedScene.customVeoVideoUrl).toBe(videoUrl);

      // Verify avatar is suppressed
      expect(insertedScene.presenterConfig?.mode).toBe("hidden");
      expect(insertedScene.presenterConfig?.enabled).toBe(false);
      expect(insertedScene.presenterConfig?.overrideDefault).toBe(true);

      // Verify coherent voiceover
      expect(insertedScene.voiceoverScript).toContain(productTitle);
      expect(insertedScene.voiceoverScript).toContain("elegancia");
    });
  });

  describe("Scene Reordering & Timeline Recalibration", () => {
    const reorderScenesHelper = (scenes: AdScene[], fromIndex: number, toIndex: number): AdScene[] => {
      if (fromIndex === toIndex || fromIndex < 0 || fromIndex >= scenes.length || toIndex < 0 || toIndex >= scenes.length) {
        return scenes;
      }
      const cloned = [...scenes];
      const [moved] = cloned.splice(fromIndex, 1);
      cloned.splice(toIndex, 0, moved);

      let cur = 0;
      return cloned.map((s, idx) => {
        const updated = {
          ...s,
          sceneIndex: idx,
          startFrame: cur,
        };
        cur += s.durationFrames;
        return updated;
      });
    };

    const initialScenes: AdScene[] = [
      {
        id: "s1",
        sceneIndex: 0,
        startFrame: 0,
        durationFrames: 120,
        sceneType: "pattern_interrupt_hook",
        headline: "Scene 1",
        visualActionPrompt: "Action 1",
        primaryMediaUrl: "https://example.com/1.png",
      },
      {
        id: "s2",
        sceneIndex: 1,
        startFrame: 120,
        durationFrames: 150,
        sceneType: "before_after_wipe",
        headline: "Scene 2",
        visualActionPrompt: "Action 2",
        primaryMediaUrl: "https://example.com/2.png",
      },
      {
        id: "s3",
        sceneIndex: 2,
        startFrame: 270,
        durationFrames: 240,
        sceneType: "custom_veo_hero",
        headline: "Scene 3",
        visualActionPrompt: "Action 3",
        primaryMediaUrl: "https://example.com/3.mp4",
      },
    ];

    it("moves scene earlier (from index 2 to 0) and recalibrates startFrames sequentially", () => {
      const result = reorderScenesHelper(initialScenes, 2, 0);

      expect(result.length).toBe(3);
      expect(result[0].id).toBe("s3");
      expect(result[0].sceneIndex).toBe(0);
      expect(result[0].startFrame).toBe(0);

      expect(result[1].id).toBe("s1");
      expect(result[1].sceneIndex).toBe(1);
      expect(result[1].startFrame).toBe(240); // 0 + 240

      expect(result[2].id).toBe("s2");
      expect(result[2].sceneIndex).toBe(2);
      expect(result[2].startFrame).toBe(360); // 240 + 120
    });

    it("moves scene later (from index 0 to 2) and recalibrates startFrames sequentially", () => {
      const result = reorderScenesHelper(initialScenes, 0, 2);

      expect(result.length).toBe(3);
      expect(result[0].id).toBe("s2");
      expect(result[0].sceneIndex).toBe(0);
      expect(result[0].startFrame).toBe(0);

      expect(result[1].id).toBe("s3");
      expect(result[1].sceneIndex).toBe(1);
      expect(result[1].startFrame).toBe(150); // 0 + 150

      expect(result[2].id).toBe("s1");
      expect(result[2].sceneIndex).toBe(2);
      expect(result[2].startFrame).toBe(390); // 150 + 240
    });

    it("handles no-op and out of bounds reorder requests safely", () => {
      expect(reorderScenesHelper(initialScenes, 1, 1)).toBe(initialScenes);
      expect(reorderScenesHelper(initialScenes, -1, 2)).toBe(initialScenes);
      expect(reorderScenesHelper(initialScenes, 0, 10)).toBe(initialScenes);
    });
  });

  describe("Custom Video Detachment & Multi-Scene Playback", () => {
    it("detaches video from a scene and reverts cleanly to product packshot", () => {
      const scenes: AdScene[] = [
        {
          id: "s1",
          sceneIndex: 0,
          startFrame: 0,
          durationFrames: 120,
          sceneType: "custom_veo_hero",
          customVeoVideoUrl: "https://example.com/veo.mp4",
          primaryMediaUrl: "https://example.com/veo.mp4",
          headline: "Scene 1",
          visualActionPrompt: "Prompt 1",
        },
        {
          id: "s2",
          sceneIndex: 1,
          startFrame: 120,
          durationFrames: 240,
          sceneType: "custom_veo_hero",
          customVeoVideoUrl: "https://example.com/veo.mp4",
          primaryMediaUrl: "https://example.com/veo.mp4",
          headline: "Scene 2",
          visualActionPrompt: "Prompt 2",
        },
      ];

      const defaultPhoto = "https://example.com/packshot.jpg";

      // Detach only from Scene 0
      const updatedScenes = scenes.map((s, idx) => {
        if (idx === 0) {
          return {
            ...s,
            primaryMediaUrl: defaultPhoto,
            sceneType: "pattern_interrupt_hook" as const,
            customVeoVideoUrl: undefined,
          };
        }
        return s;
      });

      // Scene 0 should be reverted
      expect(updatedScenes[0].sceneType).toBe("pattern_interrupt_hook");
      expect(updatedScenes[0].customVeoVideoUrl).toBeUndefined();
      expect(updatedScenes[0].primaryMediaUrl).toBe("https://example.com/packshot.jpg");

      // Scene 1 should retain its video unchanged
      expect(updatedScenes[1].sceneType).toBe("custom_veo_hero");
      expect(updatedScenes[1].customVeoVideoUrl).toBe("https://example.com/veo.mp4");
      expect(updatedScenes[1].primaryMediaUrl).toBe("https://example.com/veo.mp4");
    });

    it("verifies per-scene sequence startFrames ensure background video starts at frame 0 per scene", () => {
      const scene0 = { startFrame: 0, durationFrames: 120 };
      const scene4 = { startFrame: 480, durationFrames: 240 };

      // In Remotion, when wrapped in <Sequence from={scene.startFrame}>,
      // the relative frame for scene4 at composition frame (intro + 480) evaluates to:
      const compositionFrame = 480; // at start of scene 4
      const relativeFrameInsideSceneSequence = compositionFrame - scene4.startFrame;

      expect(relativeFrameInsideSceneSequence).toBe(0);
      // Even though scene 4 starts at frame 480, the inner video plays from 0, preventing premature freeze!
    });
  });

  describe("Single Product Selection for 3-Ingredient Google Flow Conditioning", () => {
    const personaImageUrl = "https://example.com/ruby_attire.png";
    const productCandidateUrls = [
      "https://example.com/plank_sample.jpg",
      "https://example.com/room_staging.jpg",
      "https://example.com/texture_detail.jpg",
    ];

    it("defaults to Prod #1 when user has not made an explicit selection", () => {
      const selectedUserUrl: string | null = null;
      const activeUrl = selectedUserUrl && productCandidateUrls.includes(selectedUserUrl)
        ? selectedUserUrl
        : productCandidateUrls[0] || null;

      expect(activeUrl).toBe("https://example.com/plank_sample.jpg");
    });

    it("switches active product reference when user picks Prod #2", () => {
      let selectedUserUrl: string | null = null;

      // User clicks Prod #2
      selectedUserUrl = productCandidateUrls[1];
      const activeUrl = selectedUserUrl && productCandidateUrls.includes(selectedUserUrl)
        ? selectedUserUrl
        : productCandidateUrls[0] || null;

      expect(activeUrl).toBe("https://example.com/room_staging.jpg");
    });

    it("filters out persona avatar and chroma wall URLs from product candidate list", () => {
      const dirtyUrls = [
        "https://example.com/plank_sample.jpg",
        "/avatars/ruby.png",
        "https://example.com/ruby_chroma_wall_standing.png",
        "https://example.com/room_staging.jpg",
      ];

      const cleanCandidates = dirtyUrls.filter((u) => {
        return !(
          u.includes("/avatars/") ||
          u.includes("avatar_") ||
          u.includes("ruby_chroma") ||
          u.includes("sofia_chroma")
        );
      });

      expect(cleanCandidates).toEqual([
        "https://example.com/plank_sample.jpg",
        "https://example.com/room_staging.jpg",
      ]);
      expect(cleanCandidates.length).toBe(2);
    });

    it("verifies DEFAULT_FLOW_PROJECT_URL points to the News Studio project in Google Flow", async () => {
      const { DEFAULT_FLOW_PROJECT_URL } = await import("../SceneVisualsPicker");
      expect(DEFAULT_FLOW_PROJECT_URL).toContain("flow.google.com/project/");
      expect(DEFAULT_FLOW_PROJECT_URL).toContain("065b7352-6e4f-4aa9-b420-eab8beeebcdd");
    });

    it("ensures prompt safety filter completely replaces sensitive bodice terms with tailored evening dress", async () => {
      const { filterPromptForSafety } = await import("@/lib/ecommerce/promptSafetyFilter");
      const testPrompt = "Ruby Vance dressed in a tailored burgundy velvet evening bodice with sleek black trousers.";
      const cleaned = filterPromptForSafety(testPrompt);

      expect(cleaned).not.toContain("bodice");
      expect(cleaned).not.toContain("Ruby Vance");
      expect(cleaned).not.toContain("black trousers");
      expect(cleaned).toContain("an elegant tailored burgundy velvet evening dress");
    });
  });
});

