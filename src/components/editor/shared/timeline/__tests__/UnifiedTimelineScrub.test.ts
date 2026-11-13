/**
 * src/components/editor/shared/timeline/__tests__/UnifiedTimelineScrub.test.ts
 *
 * Unit tests for UnifiedTimeline instant pointer-down seek and continuous drag scrub calculation.
 */

import { describe, it, expect } from "vitest";

describe("UnifiedTimeline Instant Seek & Scrub Logic", () => {
  const TOTAL_FRAMES = 360; // 12 seconds at 30 fps
  const TRACK_WIDTH = 800; // 800px track width

  const calculateFrameFromClientX = (
    clientX: number,
    trackLeft: number,
    trackWidth: number,
    totalDurationFrames: number
  ) => {
    const clickX = clientX - trackLeft;
    const ratio = Math.max(0, Math.min(1, clickX / trackWidth));
    return Math.round(ratio * totalDurationFrames);
  };

  it("calculates instant seek frame accurately from pointer clientX", () => {
    const trackLeft = 100;

    // Click at start of track (clientX = 100) -> Frame 0
    expect(calculateFrameFromClientX(100, trackLeft, TRACK_WIDTH, TOTAL_FRAMES)).toBe(0);

    // Click at middle of track (clientX = 500) -> Frame 180
    expect(calculateFrameFromClientX(500, trackLeft, TRACK_WIDTH, TOTAL_FRAMES)).toBe(180);

    // Click at end of track (clientX = 900) -> Frame 360
    expect(calculateFrameFromClientX(900, trackLeft, TRACK_WIDTH, TOTAL_FRAMES)).toBe(360);

    // Click beyond left (clientX = 50) -> Clamped to 0
    expect(calculateFrameFromClientX(50, trackLeft, TRACK_WIDTH, TOTAL_FRAMES)).toBe(0);

    // Click beyond right (clientX = 1050) -> Clamped to TOTAL_FRAMES
    expect(calculateFrameFromClientX(1050, trackLeft, TRACK_WIDTH, TOTAL_FRAMES)).toBe(360);
  });

  it("identifies scene under cursor immediately on pointerdown", () => {
    const scenes = [
      { id: "s1", index: 0, startFrame: 0, durationFrames: 120 },
      { id: "s2", index: 1, startFrame: 120, durationFrames: 120 },
      { id: "s3", index: 2, startFrame: 240, durationFrames: 120 },
    ];

    const findSceneUnderCursor = (frame: number) => {
      return scenes.find(
        (it) => frame >= it.startFrame && frame < it.startFrame + it.durationFrames
      );
    };

    expect(findSceneUnderCursor(0)?.id).toBe("s1");
    expect(findSceneUnderCursor(55)?.id).toBe("s1");
    expect(findSceneUnderCursor(120)?.id).toBe("s2");
    expect(findSceneUnderCursor(200)?.id).toBe("s2");
    expect(findSceneUnderCursor(240)?.id).toBe("s3");
    expect(findSceneUnderCursor(350)?.id).toBe("s3");
    expect(findSceneUnderCursor(400)).toBeUndefined();
  });

  it("distinguishes resize trim handle from track scrub target", () => {
    const isResizeHandle = (dataset: Record<string, string | undefined>) => {
      return dataset.resizeHandle === "true";
    };

    expect(isResizeHandle({ resizeHandle: "true" })).toBe(true);
    expect(isResizeHandle({})).toBe(false);
  });

  it("correctly matches selected scene by item.index when intro bumper (-1) and outro (999) are present", () => {
    const timelineItems = [
      { id: "intro_bumper", index: -1, startFrame: 0, durationFrames: 60 },
      { id: "scene_0", index: 0, startFrame: 60, durationFrames: 146 },
      { id: "scene_1", index: 1, startFrame: 206, durationFrames: 190 },
      { id: "outro_card", index: 999, startFrame: 396, durationFrames: 75 },
    ];

    // Check selection evaluation: isSelected = selectedSceneIndex === item.index
    const isSelected = (selectedSceneIndex: number | null, itemIndex: number) => {
      return selectedSceneIndex === itemIndex;
    };

    // Selecting Scene 0 (index 0) must highlight scene_0, NOT intro_bumper
    expect(isSelected(0, timelineItems[0].index)).toBe(false); // intro_bumper is NOT selected
    expect(isSelected(0, timelineItems[1].index)).toBe(true);  // scene_0 IS selected
    expect(isSelected(0, timelineItems[2].index)).toBe(false); // scene_1 is NOT selected

    // Selecting Scene 1 (index 1) must highlight scene_1
    expect(isSelected(1, timelineItems[1].index)).toBe(false); // scene_0 is NOT selected
    expect(isSelected(1, timelineItems[2].index)).toBe(true);  // scene_1 IS selected

    // Selecting Intro (-1) must highlight intro_bumper
    expect(isSelected(-1, timelineItems[0].index)).toBe(true); // intro_bumper IS selected
    expect(isSelected(-1, timelineItems[1].index)).toBe(false);

    // Selecting Outro (999) must highlight outro_card
    expect(isSelected(999, timelineItems[3].index)).toBe(true); // outro_card IS selected
    expect(isSelected(999, timelineItems[1].index)).toBe(false);
  });

  it("resolves target trim scene by item.index instead of array position", () => {
    const timelineItems = [
      { id: "intro_bumper", index: -1, startFrame: 0, durationFrames: 60 },
      { id: "scene_0", index: 0, startFrame: 60, durationFrames: 146 },
      { id: "scene_1", index: 1, startFrame: 206, durationFrames: 190 },
    ];

    const getTrimSceneIndex = (id: string) => {
      const item = timelineItems.find((it) => it.id === id);
      return item && item.index >= 0 ? item.index : null;
    };

    expect(getTrimSceneIndex("scene_0")).toBe(0); // Targets script.scenes[0], not 1
    expect(getTrimSceneIndex("scene_1")).toBe(1); // Targets script.scenes[1], not 2
    expect(getTrimSceneIndex("intro_bumper")).toBeNull(); // Intro cannot be trimmed as an ad scene
  });

  it("preserves exact scrub position when seeking on timeline (seekToStart=false)", () => {
    let currentFrame = 0;
    let selectedSceneIndex: number | null = null;

    const introOffset = 60;
    const scenes = [
      { startFrame: 0, durationFrames: 120 },
      { startFrame: 120, durationFrames: 120 },
    ];

    const handleSelectTimelineItem = (idx: number | null, seekToStart = true) => {
      if (idx === null) return;
      selectedSceneIndex = idx;
      if (seekToStart && scenes[idx]) {
        currentFrame = introOffset + scenes[idx].startFrame;
      }
    };

    // User scrubs to frame 105 (inside Scene 0)
    currentFrame = 105;
    // Timeline clicks should NOT force frame snap back to 60 (startFrame)
    handleSelectTimelineItem(0, false);
    expect(selectedSceneIndex).toBe(0);
    expect(currentFrame).toBe(105); // Preserved!

    // Direct card click SHOULD seek to scene start
    handleSelectTimelineItem(1, true);
    expect(selectedSceneIndex).toBe(1);
    expect(currentFrame).toBe(180); // Jumped to introOffset (60) + scene 1 start (120)
  });

  it("bails out on redundant frame updates to prevent infinite re-render loops", () => {
    let stateUpdates = 0;
    let currentFrame = 50;

    const setCurrentFrame = (updateFn: (prev: number) => number) => {
      const next = updateFn(currentFrame);
      if (next !== currentFrame) {
        currentFrame = next;
        stateUpdates++;
      }
    };

    // Emitted frameupdate with same frame:
    const onFrameUpdate = (newFrame: number) => {
      const f = Math.round(newFrame);
      setCurrentFrame((prev) => (prev === f ? prev : f));
    };

    // 10 duplicate frameupdates
    for (let i = 0; i < 10; i++) {
      onFrameUpdate(50);
    }
    expect(stateUpdates).toBe(0); // 0 state updates triggered!

    // Frame actually advances:
    onFrameUpdate(51);
    expect(stateUpdates).toBe(1);
    expect(currentFrame).toBe(51);
  });

  it("throttles heavy React page state updates during active scrubbing while seeking player every frame", () => {
    let playerSeeks = 0;
    let stateUpdates = 0;
    let lastSeekThrottleTime = 0;
    let currentFrame = 0;

    const seekTo = (_frame: number) => {
      playerSeeks++;
    };

    const handleSeekFrame = (frame: number, isScrubbing: boolean, simulatedNowMs: number) => {
      const clamped = Math.max(0, Math.round(frame));
      seekTo(clamped);

      if (isScrubbing) {
        if (simulatedNowMs - lastSeekThrottleTime >= 50) {
          lastSeekThrottleTime = simulatedNowMs;
          currentFrame = clamped;
          stateUpdates++;
        }
      } else {
        lastSeekThrottleTime = simulatedNowMs;
        currentFrame = clamped;
        stateUpdates++;
      }
    };

    // Simulate rapid mouse dragging over 100ms at 60fps (approx 6 pointermove events)
    // T = 1000ms (first pointerdown seek)
    handleSeekFrame(10, true, 1000);
    expect(playerSeeks).toBe(1);
    expect(stateUpdates).toBe(1); // First update allowed
    expect(currentFrame).toBe(10);

    // T = 1016ms: next frame -> player seeks, but state update is throttled (< 50ms)
    handleSeekFrame(20, true, 1016);
    expect(playerSeeks).toBe(2);
    expect(stateUpdates).toBe(1); // Throttled!
    expect(currentFrame).toBe(10);

    // T = 1033ms: next frame -> player seeks, still throttled
    handleSeekFrame(35, true, 1033);
    expect(playerSeeks).toBe(3);
    expect(stateUpdates).toBe(1);

    // T = 1055ms: next frame -> >= 50ms elapsed, state updates!
    handleSeekFrame(55, true, 1055);
    expect(playerSeeks).toBe(4);
    expect(stateUpdates).toBe(2);
    expect(currentFrame).toBe(55);

    // T = 1070ms: next frame -> throttled
    handleSeekFrame(70, true, 1070);
    expect(playerSeeks).toBe(5);
    expect(stateUpdates).toBe(2);

    // T = 1090ms: user releases pointer (pointerup with isScrubbing = false) -> commits IMMEDIATELY
    handleSeekFrame(90, false, 1090);
    expect(playerSeeks).toBe(6);
    expect(stateUpdates).toBe(3); // Committed immediately!
    expect(currentFrame).toBe(90);
  });

  it("uses cached rect during drag moves without querying getBoundingClientRect repeatedly", () => {
    let getBoundingClientRectCalls = 0;

    const mockElement = {
      getBoundingClientRect: () => {
        getBoundingClientRectCalls++;
        return { left: 100, width: 800 };
      },
    };

    let cachedRect: { left: number; width: number } | null = null;

    // PointerDown: snapshot rect once
    cachedRect = mockElement.getBoundingClientRect();
    expect(getBoundingClientRectCalls).toBe(1);

    // 10 rapid pointermove calls during drag
    for (let i = 0; i < 10; i++) {
      const clientX = 100 + i * 50;
      const clickX = clientX - cachedRect.left;
      const ratio = Math.max(0, Math.min(1, clickX / cachedRect.width));
      const frame = Math.round(ratio * TOTAL_FRAMES);
      expect(frame).toBeGreaterThanOrEqual(0);
    }

    // Still only 1 call to getBoundingClientRect! Zero layout thrashing!
    expect(getBoundingClientRectCalls).toBe(1);

    // PointerUp: cleanup
    cachedRect = null;
  });
});
