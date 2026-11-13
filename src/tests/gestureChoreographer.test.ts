import { describe, it, expect } from 'vitest';
import { choreographScript } from '../lib/ai/gestureChoreographer';
import { getNextMotionState } from '../lib/ai/markovTransitionMatrix';

describe('Sprint L-3: Gesture Choreographer & Markov Matrix', () => {
  it('should assign greeting_wave state for greeting script', () => {
    const segments = choreographScript('Welcome to NewsStudio AI Broadcast.');
    expect(segments[0].motionState).toBe('greeting_wave');
    expect(segments[0].tag).toBe('[GREETING]');
  });

  it('should assign open_palms state for explanation script', () => {
    const segments = choreographScript('Let us analyze why AI video loops eliminate drift.');
    expect(segments[0].motionState).toBe('open_palms');
    expect(segments[0].tag).toBe('[EXPLANATION]');
  });

  it('should respect Markov transition probability bounds', () => {
    const next = getNextMotionState('micro_idle', 0.1);
    expect(next).toBe('micro_idle');
  });
});
