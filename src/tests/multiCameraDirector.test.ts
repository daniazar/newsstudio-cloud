/**
 * src/tests/multiCameraDirector.test.ts
 *
 * Unit tests for MultiCameraDirector FSM
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MultiCameraDirector, BROADCAST_CAMERA_PRESETS } from '../lib/realtime/multiCameraDirector';

describe('MultiCameraDirector Suite', () => {
  let director: MultiCameraDirector;

  beforeEach(() => {
    director = new MultiCameraDirector();
  });

  it('should initialize with default CAM1_ANCHOR_CLOSE close-up shot', () => {
    const state = director.update(1000);
    expect(state.activeCameraId).toBe("CAM1_ANCHOR_CLOSE");
    expect(state.zoom).toBe(BROADCAST_CAMERA_PRESETS.CAM1_ANCHOR_CLOSE.zoom);
    expect(state.panX).toBe(BROADCAST_CAMERA_PRESETS.CAM1_ANCHOR_CLOSE.panX);
    expect(state.panY).toBe(BROADCAST_CAMERA_PRESETS.CAM1_ANCHOR_CLOSE.panY);
    expect(state.isTransitioning).toBe(false);
  });

  it('should perform instantaneous broadcast cut', () => {
    let switchedCam = "";
    director.onCameraSwitch = (cam) => { switchedCam = cam; };

    director.switchCamera("CAM2_STUDIO_WIDE", "cut");
    const state = director.update(1000);

    expect(state.activeCameraId).toBe("CAM2_STUDIO_WIDE");
    expect(state.zoom).toBe(BROADCAST_CAMERA_PRESETS.CAM2_STUDIO_WIDE.zoom);
    expect(state.panY).toBe(BROADCAST_CAMERA_PRESETS.CAM2_STUDIO_WIDE.panY);
    expect(state.isTransitioning).toBe(false);
    expect(switchedCam).toBe("CAM2_STUDIO_WIDE");
  });

  it('should smoothly interpolate during 400ms cinematic dolly transition', () => {
    director.switchCamera("CAM3_SIDEBAR_TICKER", "dolly", 400, 1000);

    // Mid-dolly at +200ms
    const midState = director.update(1200);
    expect(midState.isTransitioning).toBe(true);
    expect(midState.transitionProgress).toBeCloseTo(0.5, 1);
    expect(midState.zoom).toBeLessThan(BROADCAST_CAMERA_PRESETS.CAM1_ANCHOR_CLOSE.zoom);
    expect(midState.zoom).toBeGreaterThan(BROADCAST_CAMERA_PRESETS.CAM3_SIDEBAR_TICKER.zoom);
    expect(midState.panX).toBeLessThan(0.0);
    expect(midState.panX).toBeGreaterThan(BROADCAST_CAMERA_PRESETS.CAM3_SIDEBAR_TICKER.panX);

    // End-dolly at +450ms
    const endState = director.update(1450);
    expect(endState.isTransitioning).toBe(false);
    expect(endState.activeCameraId).toBe("CAM3_SIDEBAR_TICKER");
    expect(endState.zoom).toBe(BROADCAST_CAMERA_PRESETS.CAM3_SIDEBAR_TICKER.zoom);
    expect(endState.panX).toBe(BROADCAST_CAMERA_PRESETS.CAM3_SIDEBAR_TICKER.panX);
  });

  it('should cycle angles when auto-director is enabled', () => {
    director.enableAutoDirector(true, 5000, 1000);
    director.update(1000);

    // At +5500ms, auto-director should initiate switch to CAM2_STUDIO_WIDE
    const state = director.update(6500);
    expect(state.isTransitioning).toBe(true);
    expect(state.targetCameraId).toBe("CAM2_STUDIO_WIDE");
  });

  describe('Photo Headshot 1:1 Un-Truncated Framing vs Standing Video Framing', () => {
    it('should frame 1:1 square avatar photos at zoom 1.0 without hair crown truncation', () => {
      // Switch to photo headshot mode (avatar portraits)
      director.setMediaFraming(false);
      expect(director.getMediaFraming()).toBe(false);

      const stateCam1 = director.update(1000);
      expect(stateCam1.activeCameraId).toBe("CAM1_ANCHOR_CLOSE");
      expect(stateCam1.zoom).toBe(1.0);
      expect(stateCam1.panX).toBe(0.0);
      expect(stateCam1.panY).toBe(0.0);

      // CAM2 in photo mode should also remain un-truncated 1:1
      director.switchCamera("CAM2_STUDIO_WIDE", "cut");
      const stateCam2 = director.update(1000);
      expect(stateCam2.zoom).toBe(1.0);
      expect(stateCam2.panX).toBe(0.0);
      expect(stateCam2.panY).toBe(0.0);

      // CAM3 in photo mode should frame at zoom 1.0 with slight ticker pan
      director.switchCamera("CAM3_SIDEBAR_TICKER", "cut");
      const stateCam3 = director.update(1000);
      expect(stateCam3.zoom).toBe(1.0);
      expect(stateCam3.panX).toBe(-0.05);
      expect(stateCam3.panY).toBe(0.0);
    });

    it('should restore broadcast close-up zoom when switching back to standing action loop video', () => {
      director.setMediaFraming(false);
      director.switchCamera("CAM1_ANCHOR_CLOSE", "cut");
      expect(director.update(1000).zoom).toBe(1.0);

      // Switch to standing action loop video
      director.setMediaFraming(true);
      expect(director.getMediaFraming()).toBe(true);

      // Default standing CAM1 preset is 1.25x
      const standingState = director.update(1000);
      expect(standingState.zoom).toBe(BROADCAST_CAMERA_PRESETS.CAM1_ANCHOR_CLOSE.zoom);

      // With full-body standing presenter (head in top third, faceY = 0.20), zoom elevates to 1.70x
      director.setAnchorFaceCenter(0.50, 0.20);
      const elevatedPreset = director.getTargetPreset("CAM1_ANCHOR_CLOSE");
      expect(elevatedPreset.zoom).toBe(1.70);
    });
  });
});
