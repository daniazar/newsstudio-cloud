import { describe, it, expect } from "vitest";
import {
  adaptNewsSegment,
  adaptAdScene,
  adaptNewsSegmentsToTimeline,
  adaptAdScenesToTimeline,
} from "../TimelineSceneAdapter";
import { AdScene } from "@/lib/types/ecommerce";

describe("TimelineSceneAdapter", () => {
  it("adapts a News Segment accurately", () => {
    const newsSegment = {
      id: "seg-101",
      index: 0,
      startTime: 0,
      endTime: 4.5,
      text: "Breaking tech news from Silicon Valley.",
      assetPath: "/storage/broll/tech.mp4",
      personaId: "ruby",
      presenterStatus: "done",
      sceneStrategy: "cyc_virtual_set",
      cameraCue: "zoom_in",
      transitionType: "glitch",
    };

    const item = adaptNewsSegment(newsSegment, 30);
    expect(item.id).toBe("seg-101");
    expect(item.index).toBe(0);
    expect(item.title).toBe("Scene 1");
    expect(item.startFrame).toBe(0);
    expect(item.durationFrames).toBe(135); // 4.5 * 30
    expect(item.status).toBe("cached");
    expect(item.categoryTag).toBe("cyc_virtual_set");
    expect(item.cameraCue).toBe("zoom_in");
    expect(item.transitionType).toBe("glitch");
  });

  it("adapts an E-Commerce AdScene accurately", () => {
    const adScene: AdScene = {
      id: "scene_1_hook",
      sceneIndex: 0,
      startFrame: 0,
      durationFrames: 120,
      sceneType: "pattern_interrupt_hook",
      headline: "Tired of Scuffed Floors?",
      subheadline: "Watch this transformation",
      visualActionPrompt: "Splashing water on luxury vinyl plank",
      primaryMediaUrl: "https://example.com/product_hero.webp",
      sfxTag: "[sfx:whoosh]",
      voiceoverScript: "Tired of scuffed floors? Meet Porcelanato Ilva!",
      featureBadgeText: "10 mm • 100% Waterproof",
    };

    const item = adaptAdScene(adScene, 30, "https://example.com/voiceover.wav");
    expect(item.id).toBe("scene_1_hook");
    expect(item.index).toBe(0);
    expect(item.title).toBe("Tired of Scuffed Floors?");
    expect(item.subtitle).toBe("Watch this transformation");
    expect(item.startFrame).toBe(0);
    expect(item.durationFrames).toBe(120);
    expect(item.thumbnailUrl).toBe("https://example.com/product_hero.webp");
    expect(item.audioUrl).toBe("https://example.com/voiceover.wav");
    expect(item.categoryTag).toBe("pattern_interrupt_hook");
    expect(item.metadata?.sfxTag).toBe("[sfx:whoosh]");
  });

  it("handles batch conversion safely", () => {
    const segments = [
      { id: "s1", index: 0, startTime: 0, endTime: 3, text: "Intro" },
      { id: "s2", index: 1, startTime: 3, endTime: 7, text: "Body" },
    ];
    const items = adaptNewsSegmentsToTimeline(segments, 30);
    expect(items.length).toBe(2);
    expect(items[0].durationFrames).toBe(90);
    expect(items[1].startFrame).toBe(90);
    expect(items[1].durationFrames).toBe(120);

    const empty = adaptAdScenesToTimeline([], 30);
    expect(empty).toEqual([]);
  });

  it("handles null, undefined, or missing startTime safely without throwing", () => {
    // Completely undefined/null segment
    const nullItem = adaptNewsSegment(null, 30);
    expect(nullItem).toBeDefined();
    expect(nullItem.startFrame).toBe(0);
    expect(nullItem.durationFrames).toBe(120);

    const undefItem = adaptNewsSegment(undefined, 30);
    expect(undefItem).toBeDefined();

    // Segment with missing startTime and endTime
    const partialSegment = {
      index: 2,
      text: "No timing info provided.",
    };
    const adaptedPartial = adaptNewsSegment(partialSegment, 30);
    expect(adaptedPartial.startFrame).toBe(0);
    expect(adaptedPartial.durationFrames).toBe(120);

    // Batch conversion with sparse/null array
    const sparseArray = [null, undefined, { index: 0, text: "Valid scene" }];
    const batchResult = adaptNewsSegmentsToTimeline(sparseArray as any, 30);
    expect(batchResult.length).toBe(1);
    expect(batchResult[0].text).toBe("Valid scene");
  });

  it("resolves raw tenant storage keys into absolute URLs", () => {
    const segment = {
      id: "seg_tenant",
      index: 3,
      startTime: 10,
      endTime: 14,
      text: "Tenant scene",
      assetPath: "tenants/org_123/broll/story-123/seg-3.mp4",
      audioPath: "tenants/org_123/stories/story-123/audio/seg-3.webm",
      presenterVideoPath: "tenants/org_123/presenter/story-123/scene-3.mp4",
      personaAvatarUrl: "tenants/org_123/avatars/ruby.png",
    };

    const item = adaptNewsSegment(segment, 30);
    // Since assetPath is a video (.mp4), thumbnailUrl should fall back to avatar URL
    expect(item.thumbnailUrl).toContain("tenants/org_123/avatars/ruby.png");
    expect(item.thumbnailUrl).toMatch(/^http:\/\/.*\/news-studio\/tenants\//);
    expect(item.mediaUrl).toBe("http://localhost:9000/news-studio/tenants/org_123/broll/story-123/seg-3.mp4");
    expect(item.audioUrl).toBe("http://localhost:9000/news-studio/tenants/org_123/stories/story-123/audio/seg-3.webm");
    expect(item.videoUrl).toBe("http://localhost:9000/news-studio/tenants/org_123/presenter/story-123/scene-3.mp4");
  });
});
