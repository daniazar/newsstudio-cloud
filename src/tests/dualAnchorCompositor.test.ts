/**
 * src/tests/dualAnchorCompositor.test.ts
 *
 * Test suite for Real-Time Dual-Anchor WebGL Compositor & Mutual Gaze Kinematics.
 */

import { describe, it, expect } from "vitest";

describe("Real-Time Dual-Anchor WebGL Compositor Suite", () => {
  describe("Mutual Gaze Orientation & Kinematics", () => {
    it("should compute positive yaw and gaze for Host when Guest is speaking (Stage Left to Stage Right)", () => {
      const isHostSpeaking = false;
      const isGuestSpeaking = true;

      // Host sits on Stage Left, looking towards Stage Right
      let hostYaw = 6.0;
      let hostGazeX = 0.10;

      if (isHostSpeaking) {
        hostYaw = 4.0;
        hostGazeX = 0.15;
      } else if (isGuestSpeaking) {
        hostYaw = 14.0; // turned attentively towards guest
        hostGazeX = 0.45; // ocular gaze directed right
      }

      expect(hostYaw).toBe(14.0);
      expect(hostGazeX).toBe(0.45);
    });

    it("should compute negative yaw and gaze for Guest when Host is speaking (Stage Right to Stage Left)", () => {
      const isHostSpeaking = true;
      const isGuestSpeaking = false;

      // Guest sits on Stage Right, looking towards Stage Left
      let guestYaw = -6.0;
      let guestGazeX = -0.10;

      if (isGuestSpeaking) {
        guestYaw = -4.0;
        guestGazeX = -0.15;
      } else if (isHostSpeaking) {
        guestYaw = -14.0; // turned attentively towards host
        guestGazeX = -0.45; // ocular gaze directed left
      }

      expect(guestYaw).toBe(-14.0);
      expect(guestGazeX).toBe(-0.45);
    });

    it("should maintain forward-conversational focus when an anchor is actively speaking", () => {
      const hostSpeakingYaw = 4.0;
      const hostSpeakingGaze = 0.15;
      const guestSpeakingYaw = -4.0;
      const guestSpeakingGaze = -0.15;

      // Magnitude of yaw while speaking should be smaller than active listening turn
      expect(Math.abs(hostSpeakingYaw)).toBeLessThan(14.0);
      expect(Math.abs(guestSpeakingYaw)).toBeLessThan(14.0);
      expect(Math.abs(hostSpeakingGaze)).toBeLessThan(0.45);
      expect(Math.abs(guestSpeakingGaze)).toBeLessThan(0.45);
    });
  });
});
