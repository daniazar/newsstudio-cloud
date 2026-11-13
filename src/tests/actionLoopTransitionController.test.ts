/**
 * src/tests/actionLoopTransitionController.test.ts
 *
 * Unit tests for ActionLoopTransitionController (dual-texture morphing)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ActionLoopTransitionController } from '../lib/realtime/actionLoopTransitionController';

describe('ActionLoopTransitionController Suite', () => {
  let controller: ActionLoopTransitionController;

  beforeEach(() => {
    controller = new ActionLoopTransitionController();
  });

  it('should initialize cleanly without transitions', () => {
    const state = controller.update(1000);
    expect(state.isTransitioning).toBe(false);
    expect(state.morphAlpha).toBe(0.0);
    expect(state.activeSrc).toBe("");
  });

  it('should set initial source directly without morphing', () => {
    controller.setSource("/action_loops/state_idle.mp4");
    const state = controller.update(1000);
    expect(state.isTransitioning).toBe(false);
    expect(state.morphAlpha).toBe(0.0);
    expect(state.activeSrc).toBe("/action_loops/state_idle.mp4");
  });

  it('should initiate smooth transition on subsequent source change', () => {
    controller.setSource("/action_loops/state_idle.mp4");
    controller.update(1000);

    // Transition to explanatory beat over 120ms starting at 1000ms
    controller.setSource("/action_loops/state_explanatory.mp4", 120, 1000);

    // Mid-transition at +60ms
    const midState = controller.update(1060);
    expect(midState.isTransitioning).toBe(true);
    expect(midState.morphAlpha).toBeGreaterThan(0.2);
    expect(midState.morphAlpha).toBeLessThan(0.8);

    // Post-transition at +130ms
    let completedSrc = "";
    controller.onTransitionComplete = (src) => { completedSrc = src; };

    const endState = controller.update(1130);
    expect(endState.isTransitioning).toBe(false);
    expect(endState.morphAlpha).toBe(0.0);
    expect(endState.activeSrc).toBe("/action_loops/state_explanatory.mp4");
    expect(completedSrc).toBe("/action_loops/state_explanatory.mp4");
  });

  it('should cleanly release resources on destroy', () => {
    controller.setSource("/action_loops/state_idle.mp4");
    controller.destroy();
    expect(controller.getActiveVideo()).toBeNull();
  });

  it('should return correct gesture-coupled shoulder warp profiles for states', () => {
    const defaultProfile = controller.getShoulderProfile("unknown_state");
    expect(defaultProfile.shoulderBreathMult).toBe(1.0);
    expect(defaultProfile.shoulderShrugOffset).toBe(0.0);

    const alertProfile = controller.getShoulderProfile("/action_loops/state_breaking_alert.mp4");
    expect(alertProfile.shoulderShrugOffset).toBe(0.012);
    expect(alertProfile.chestExpansionOffset).toBe(0.010);

    const welcomeProfile = controller.getShoulderProfile("/action_loops/state_intro_welcome.mp4");
    expect(welcomeProfile.shoulderBreathMult).toBe(1.5);
  });
});
