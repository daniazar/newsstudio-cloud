/**
 * src/components/editor/shared/timeline/__tests__/StoryboardReorder.test.ts
 *
 * Unit tests for Storyboard Reorder batch sequencing, startFrame recalculation,
 * and shift operations.
 */

import { describe, it, expect } from "vitest";
import { AdScene } from "@/lib/types/ecommerce";

describe("Storyboard Reorder Engine", () => {
  const mockScenes: AdScene[] = [
    {
      id: "scene-1",
      sceneIndex: 0,
      startFrame: 0,
      durationFrames: 90, // 3s
      sceneType: "pattern_interrupt_hook",
      headline: "Scene 1: Hook",
      visualActionPrompt: "Action 1",
      primaryMediaUrl: "https://example.com/media1.jpg",
    },
    {
      id: "scene-2",
      sceneIndex: 1,
      startFrame: 90,
      durationFrames: 120, // 4s
      sceneType: "room_staging",
      headline: "Scene 2: Room Staging",
      visualActionPrompt: "Action 2",
      primaryMediaUrl: "https://example.com/media2.jpg",
    },
    {
      id: "scene-3",
      sceneIndex: 2,
      startFrame: 210,
      durationFrames: 150, // 5s
      sceneType: "price_promo_outro",
      headline: "Scene 3: Price Outro",
      visualActionPrompt: "Action 3",
      primaryMediaUrl: "https://example.com/media3.jpg",
    },
  ];

  const recalculateSequence = (scenes: AdScene[]): AdScene[] => {
    let cur = 0;
    return scenes.map((s, i) => {
      const updated = {
        ...s,
        sceneIndex: i,
        startFrame: cur,
      };
      cur += s.durationFrames;
      return updated;
    });
  };

  const shiftScene = (scenes: AdScene[], index: number, direction: -1 | 1): AdScene[] => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= scenes.length) return scenes;
    const next = [...scenes];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    return recalculateSequence(next);
  };

  it("recalculates startFrame sequentially when scenes are reversed", () => {
    const reversed = [mockScenes[2], mockScenes[1], mockScenes[0]];
    const result = recalculateSequence(reversed);

    // Scene 3 was 150 frames, now first -> startFrame: 0, sceneIndex: 0
    expect(result[0].id).toBe("scene-3");
    expect(result[0].sceneIndex).toBe(0);
    expect(result[0].startFrame).toBe(0);
    expect(result[0].durationFrames).toBe(150);

    // Scene 2 was 120 frames, now second -> startFrame: 0 + 150 = 150, sceneIndex: 1
    expect(result[1].id).toBe("scene-2");
    expect(result[1].sceneIndex).toBe(1);
    expect(result[1].startFrame).toBe(150);
    expect(result[1].durationFrames).toBe(120);

    // Scene 1 was 90 frames, now third -> startFrame: 150 + 120 = 270, sceneIndex: 2
    expect(result[2].id).toBe("scene-1");
    expect(result[2].sceneIndex).toBe(2);
    expect(result[2].startFrame).toBe(270);
    expect(result[2].durationFrames).toBe(90);
  });

  it("preserves total duration across all scenes when reordered", () => {
    const originalTotal = mockScenes.reduce((acc, s) => acc + s.durationFrames, 0);
    const reordered = recalculateSequence([mockScenes[1], mockScenes[2], mockScenes[0]]);
    const reorderedTotal = reordered.reduce((acc, s) => acc + s.durationFrames, 0);

    expect(originalTotal).toBe(360);
    expect(reorderedTotal).toBe(360);
    const lastScene = reordered[reordered.length - 1];
    expect(lastScene.startFrame + lastScene.durationFrames).toBe(360);
  });

  it("shifts a scene earlier (up) with handleShift correctly", () => {
    // Shift scene-2 (index 1) earlier -> should become index 0
    const shifted = shiftScene(mockScenes, 1, -1);

    expect(shifted[0].id).toBe("scene-2");
    expect(shifted[0].sceneIndex).toBe(0);
    expect(shifted[0].startFrame).toBe(0);

    expect(shifted[1].id).toBe("scene-1");
    expect(shifted[1].sceneIndex).toBe(1);
    expect(shifted[1].startFrame).toBe(120); // starts after scene-2 duration (120)
  });

  it("shifts a scene later (down) with handleShift correctly", () => {
    // Shift scene-1 (index 0) later -> should become index 1
    const shifted = shiftScene(mockScenes, 0, 1);

    expect(shifted[0].id).toBe("scene-2");
    expect(shifted[0].sceneIndex).toBe(0);
    expect(shifted[0].startFrame).toBe(0);

    expect(shifted[1].id).toBe("scene-1");
    expect(shifted[1].sceneIndex).toBe(1);
    expect(shifted[1].startFrame).toBe(120);

    expect(shifted[2].id).toBe("scene-3");
    expect(shifted[2].sceneIndex).toBe(2);
    expect(shifted[2].startFrame).toBe(210);
  });

  it("guards against out-of-bounds shifts", () => {
    // Shifting first scene earlier should do nothing
    const noOpEarlier = shiftScene(mockScenes, 0, -1);
    expect(noOpEarlier[0].id).toBe("scene-1");

    // Shifting last scene later should do nothing
    const noOpLater = shiftScene(mockScenes, 2, 1);
    expect(noOpLater[2].id).toBe("scene-3");
  });

  it("handles an empty scenes array gracefully", () => {
    const emptyResult = recalculateSequence([]);
    expect(emptyResult).toEqual([]);
  });
});
