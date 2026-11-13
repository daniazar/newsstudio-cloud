import { describe, it, expect } from "vitest";
import {
  resolveStudioCompositionId,
  buildStudioSegments,
  buildStudioCameraCues,
} from "@/../workers/pipeline-worker/tasks/studioTask";

describe("Phase 3: Multi-Camera Studio Video Compositing", () => {
  describe("1. Studio Composition ID Resolution", () => {
    it("resolves 3-Camera Broadcast compositions across horizontal, vertical, and square aspect ratios", () => {
      expect(resolveStudioCompositionId("interview", "horizontal")).toBe("RubyNews-3CameraBroadcast-Horizontal");
      expect(resolveStudioCompositionId("podcast", "vertical")).toBe("RubyNews-3CameraBroadcast-Vertical");
      expect(resolveStudioCompositionId("vtuber", "square")).toBe("RubyNews-3CameraBroadcast-Square");
      expect(resolveStudioCompositionId("roundtable", undefined)).toBe("RubyNews-3CameraBroadcast-Horizontal");
    });

    it("resolves Debate Studio compositions across horizontal, vertical, and square aspect ratios", () => {
      expect(resolveStudioCompositionId("debate", "horizontal")).toBe("RubyNews-DebateStudio-Horizontal");
      expect(resolveStudioCompositionId("debate", "vertical")).toBe("RubyNews-DebateStudio-Vertical");
      expect(resolveStudioCompositionId("debate", "square")).toBe("RubyNews-DebateStudio-Square");
    });
  });

  describe("2. Studio Turn Segment Conversion & Frame Math", () => {
    it("converts multi-speaker turns into contiguous Remotion segments", () => {
      const turns = [
        {
          speakerId: "ruby",
          speakerName: "Ruby Vance",
          role: "Lead Anchor",
          text: "Welcome to today's special broadcast.",
          durationSeconds: 4.0,
          cameraAngle: "host_solo",
        },
        {
          speakerId: "marcus",
          speakerName: "Marcus Sterling",
          role: "Financial Analyst",
          text: "Thanks Ruby. Wall Street is seeing historic volatility today.",
          durationSeconds: 3.5,
          cameraAngle: "guest_solo",
        },
        {
          speakerId: "ruby",
          speakerName: "Ruby Vance",
          role: "Lead Anchor",
          text: "Let us examine the numbers on the big screen.",
          durationSeconds: 3.0,
        },
      ];

      const fps = 30;
      const segments = buildStudioSegments(turns, fps);

      expect(segments).toHaveLength(3);

      // Segment 0: 4s = 120 frames
      expect(segments[0].startFrame).toBe(0);
      expect(segments[0].endFrame).toBe(120);
      expect(segments[0].cameraCue).toBe("cam2_left");
      expect(segments[0].speakerName).toBe("Ruby Vance");
      expect(segments[0].speakerTitle).toBe("Lead Anchor");

      // Segment 1: 3.5s = 105 frames (from 120 to 225)
      expect(segments[1].startFrame).toBe(120);
      expect(segments[1].endFrame).toBe(225);
      expect(segments[1].cameraCue).toBe("cam3_closeup");
      expect(segments[1].speakerName).toBe("Marcus Sterling");

      // Segment 2: 3.0s = 90 frames (from 225 to 315)
      expect(segments[2].startFrame).toBe(225);
      expect(segments[2].endFrame).toBe(315);
      // Alternating camera cue when not specified: idx 2 % 3 === 2 -> cam3_closeup
      expect(segments[2].cameraCue).toBe("cam3_closeup");
    });

    it("enforces minimum 60 frames per studio turn", () => {
      const turns = [
        {
          speakerId: "ruby",
          text: "Quick interjection!",
          durationSeconds: 0.5, // 15 frames naturally
        },
      ];

      const segments = buildStudioSegments(turns, 30);
      expect(segments[0].endFrame - segments[0].startFrame).toBe(60); // Clamped to 60
    });
  });

  describe("3. Camera Cue Interval Generation", () => {
    it("generates frame-accurate 3-camera switching intervals", () => {
      const segments = [
        { cameraCue: "cam1_wide", startFrame: 0, endFrame: 90 },
        { cameraCue: "cam2_left", startFrame: 90, endFrame: 180 },
        { cameraCue: "cam3_closeup", startFrame: 180, endFrame: 300 },
      ];

      const cues = buildStudioCameraCues(segments);
      expect(cues).toEqual([
        { cam: "cam1_wide", startFrame: 0, endFrame: 90 },
        { cam: "cam2_left", startFrame: 90, endFrame: 180 },
        { cam: "cam3_closeup", startFrame: 180, endFrame: 300 },
      ]);
    });
  });
});
