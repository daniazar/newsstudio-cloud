import { describe, it, expect } from 'vitest';
import { getAlgorithmicActionLoop, ANCHOR_STATES, ANCHOR_TRANSITIONS, buildTransitionId, CAMERA_CUES, ACTION_MATRIX_GESTURES } from '../stateMachine';

describe('ACTION_MATRIX_GESTURES', () => {
  it('should have an array length greater than 0', () => {
    expect(ACTION_MATRIX_GESTURES.length).toBeGreaterThan(0);
  });

  it('should have objects with all required properties', () => {
    ACTION_MATRIX_GESTURES.forEach((gesture) => {
      expect(typeof gesture.id).toBe('string');
      expect(typeof gesture.label).toBe('string');
      expect(typeof gesture.icon).toBe('string');
      expect(typeof gesture.desc).toBe('string');
      expect(typeof gesture.category).toBe('string');
    });
  });

  it('should have unique IDs', () => {
    const ids = ACTION_MATRIX_GESTURES.map((g) => g.id);
    expect(ids.length).toBe(new Set(ids).size);
  });

  it('should contain specific essential states', () => {
    const ids = ACTION_MATRIX_GESTURES.map((g) => g.id);
    expect(ids).toContain('state_idle');
    expect(ids).toContain('state_explaining');
    expect(ids).toContain('state_intro_welcome');
    expect(ids).toContain('state_signoff_outro');
  });
});

describe('CAMERA_CUES', () => {
  it('should contain the required standard cameras without duplicate IDs', () => {
    expect(CAMERA_CUES.length).toBeGreaterThanOrEqual(3);
    const ids = CAMERA_CUES.map((c) => c.id);
    expect(ids).toContain('cam1_wide');
    expect(ids).toContain('cam2_left');
    expect(ids).toContain('cam3_closeup');
    expect(ids.length).toBe(new Set(ids).size);
  });

  it('should have a valid CameraCueOption structure for all elements', () => {
    CAMERA_CUES.forEach((cue) => {
      expect(typeof cue.id).toBe('string');
      expect(typeof cue.name).toBe('string');
      expect(typeof cue.angle).toBe('string');
      expect(typeof cue.lens).toBe('string');
      expect(typeof cue.icon).toBe('string');
      expect(typeof cue.desc).toBe('string');
      expect(typeof cue.role).toBe('string');

      expect(cue.transforms).toBeDefined();
      expect(typeof cue.transforms.scale).toBe('number');
      expect(typeof cue.transforms.translateX).toBe('number');
      expect(typeof cue.transforms.translateY).toBe('number');
      expect(typeof cue.transforms.rotationY).toBe('number');
    });
  });
});

describe('getAlgorithmicActionLoop', () => {
  it('should return Opening Welcome Hook for index 0', () => {
    const result = getAlgorithmicActionLoop(0, 1, 'some text');
    expect(result.stateId).toBe('state_intro_welcome');
    expect(result.cameraCue).toBe('cam1_wide');
    expect(result.loopName).toBe('ruby_intro_welcome');
  });

  it('should return Closing Sign-off for the last segment when totalSegments > 1', () => {
    const result = getAlgorithmicActionLoop(4, 5, 'some text');
    expect(result.stateId).toBe('state_signoff_outro');
    expect(result.cameraCue).toBe('cam1_wide');
    expect(result.loopName).toBe('ruby_signoff_outro');
  });

  it('should return Main Story Emphasis for index 1', () => {
    const result = getAlgorithmicActionLoop(1, 5, 'some text');
    expect(result.stateId).toBe('state_emphasis_nod');
    expect(result.cameraCue).toBe('cam2_left');
    expect(result.loopName).toBe('ruby_emphasis_nod');
  });

  describe('Heuristic context rules', () => {
    it('should return Breaking Alert for text containing breaking keywords', () => {
      const texts = ['breaking news', 'red alert', 'urgent message'];
      for (const text of texts) {
        const result = getAlgorithmicActionLoop(2, 5, text);
        expect(result.stateId).toBe('state_breaking_alert');
        expect(result.cameraCue).toBe('cam3_closeup');
      }
    });

    it('should return Deep Thought for text containing analytical keywords', () => {
      const texts = ['why is this?', 'how to do it', 'investigating the issue', 'a deep analysis', 'what happened?'];
      for (const text of texts) {
        const result = getAlgorithmicActionLoop(2, 5, text);
        expect(result.stateId).toBe('state_deep_thought_analyst');
        expect(result.cameraCue).toBe('cam3_closeup');
      }
    });

    it('should return Analytical Tilt for text containing listening/interview keywords', () => {
      const texts = ['listen to this', 'in an interview', 'our guest tonight', 'an expert says'];
      for (const text of texts) {
        const result = getAlgorithmicActionLoop(2, 5, text);
        expect(result.stateId).toBe('state_listen_tilt');
        expect(result.cameraCue).toBe('cam2_left');
      }
    });

    it('should return Teleprompter Notes for text containing data/document keywords', () => {
      const texts = ['some data', 'look at this chart', 'a high number', 'this is a report', 'classified document'];
      for (const text of texts) {
        const result = getAlgorithmicActionLoop(2, 5, text);
        expect(result.stateId).toBe('state_look_down_notes');
        expect(result.cameraCue).toBe('cam2_left');
      }
    });
  });

  describe('Intermediate Cadence Cycling', () => {
    it('should cycle through intermediate cadence for non-matching text', () => {
      // Cadence:
      // 0: ruby_emphasis_nod (index=0 is welcome hook, so this normally wouldn't be hit unless index > 0 and cycle matches 0, e.g. index 6)
      // 1: ruby_idle (index=1 is emphasis nod, so e.g. index 7)
      // 2: ruby_gesture_left
      // 3: ruby_look_down_notes
      // 4: ruby_deep_thought_analyst
      // 5: ruby_gesture_right

      const result2 = getAlgorithmicActionLoop(2, 10, 'normal text');
      expect(result2.loopName).toBe('ruby_gesture_left');

      const result3 = getAlgorithmicActionLoop(3, 10, 'normal text');
      expect(result3.loopName).toBe('ruby_look_down_notes');

      const result4 = getAlgorithmicActionLoop(4, 10, 'normal text');
      expect(result4.loopName).toBe('ruby_deep_thought_analyst');

      const result5 = getAlgorithmicActionLoop(5, 10, 'normal text');
      expect(result5.loopName).toBe('ruby_gesture_right');

      const result6 = getAlgorithmicActionLoop(6, 10, 'normal text');
      expect(result6.loopName).toBe('ruby_emphasis_nod'); // 6 % 6 === 0

      const result7 = getAlgorithmicActionLoop(7, 10, 'normal text');
      expect(result7.loopName).toBe('ruby_idle'); // 7 % 6 === 1
    });
  });

  describe('Edge cases and validation', () => {
    it('should handle default parameters', () => {
      const result = getAlgorithmicActionLoop();
      // index defaults to 0
      expect(result.stateId).toBe('state_intro_welcome');
    });

    it('should handle undefined text', () => {
      const result = getAlgorithmicActionLoop(2, 5); // index 2, normal text
      expect(result.loopName).toBe('ruby_gesture_left');
    });

    it('should clamp negative index and totalSegments', () => {
      const result = getAlgorithmicActionLoop(-5, -10, 'normal text');
      // index -5 clamped to 0 -> Intro Welcome
      expect(result.stateId).toBe('state_intro_welcome');
    });

    it('should handle NaN index and totalSegments gracefully', () => {
      const result = getAlgorithmicActionLoop(NaN, NaN, 'normal text');
      // NaN clamped to index 0, total 1
      expect(result.stateId).toBe('state_intro_welcome');
    });

    it('should clamp floats for index and totalSegments', () => {
      const result = getAlgorithmicActionLoop(2.9, 5.9, 'normal text');
      // 2.9 -> 2, 5.9 -> 5
      expect(result.loopName).toBe('ruby_gesture_left'); // index 2 cadence
    });

    it('should gracefully fallback to default values for invalid string types', () => {
      const result = getAlgorithmicActionLoop("2" as any, "5" as any, 'normal text');
      // index string -> falls back to 0
      // total string -> falls back to 1
      expect(result.stateId).toBe('state_intro_welcome');
    });
  });
});

describe('buildTransitionId', () => {
  it('should correctly format transition ID', () => {
    expect(buildTransitionId('standing_wide', 'seated_desk')).toBe('standing_wide_to_seated_desk');
    expect(buildTransitionId('seated_desk', 'face_closeup')).toBe('seated_desk_to_face_closeup');
    expect(buildTransitionId('face_closeup', 'standing_wide')).toBe('face_closeup_to_standing_wide');
  });
});

describe('ANCHOR_STATES and ANCHOR_TRANSITIONS', () => {
  it('should define standing_wide correctly', () => {
    const state = ANCHOR_STATES.find((s) => s.id === 'standing_wide');
    expect(state).toBeDefined();
    expect(state).toEqual({
      id: 'standing_wide',
      label: 'Standing Wide',
      keyframePattern: '*_standing_*',
      description: 'Full body or waist-up, standing in open studio space.',
      deskAware: false,
    });
  });

  it('should define seated_desk correctly', () => {
    const state = ANCHOR_STATES.find((s) => s.id === 'seated_desk');
    expect(state).toBeDefined();
    expect(state).toEqual({
      id: 'seated_desk',
      label: 'Seated Desk',
      keyframePattern: '*_seated_*desk*',
      description: 'Anchor seated behind glass news desk with props.',
      deskAware: true,
    });
  });

  it('should define face_closeup correctly', () => {
    const state = ANCHOR_STATES.find((s) => s.id === 'face_closeup');
    expect(state).toBeDefined();
    expect(state).toEqual({
      id: 'face_closeup',
      label: 'Face Close-Up',
      keyframePattern: '*_closeup_*',
      description: 'Tight face and shoulders close-up shot.',
      deskAware: false,
    });
  });

  it('should contain the required standard states without duplicate IDs', () => {
    expect(ANCHOR_STATES.length).toBeGreaterThan(0);
    const ids = ANCHOR_STATES.map((s) => s.id);
    expect(ids).toContain('standing_wide');
    expect(ids).toContain('seated_desk');
    expect(ids).toContain('face_closeup');
    expect(ids.length).toBe(new Set(ids).size);
  });

  it('should correctly identify deskAware states and required properties', () => {
    const seatedDesk = ANCHOR_STATES.find((s) => s.id === 'seated_desk');
    expect(seatedDesk?.deskAware).toBe(true);
    const standingWide = ANCHOR_STATES.find((s) => s.id === 'standing_wide');
    expect(standingWide?.deskAware).toBe(false);

    ANCHOR_STATES.forEach((state) => {
      expect(typeof state.id).toBe('string');
      expect(typeof state.label).toBe('string');
      expect(typeof state.keyframePattern).toBe('string');
      expect(typeof state.description).toBe('string');
      expect(typeof state.deskAware).toBe('boolean');
    });
  });

  it('should have valid ANCHOR_TRANSITIONS and buildTransitionId', () => {
    expect(ANCHOR_TRANSITIONS.length).toBeGreaterThan(0);
    const stateIds = ANCHOR_STATES.map((s) => s.id);
    ANCHOR_TRANSITIONS.forEach((t) => {
      expect(stateIds).toContain(t.fromState);
      expect(stateIds).toContain(t.toState);
      expect(t.id).toBe(buildTransitionId(t.fromState, t.toState));
      expect(t.transitionPrompt.trim().length).toBeGreaterThan(0);
      expect(t.durationFrames).toBeGreaterThan(0);
      expect('webmPath' in t).toBe(false);
    });

    const standingToSeated = ANCHOR_TRANSITIONS.find((t) => t.id === 'standing_wide_to_seated_desk');
    expect(standingToSeated).toBeDefined();
    expect(standingToSeated?.fromState).toBe('standing_wide');
    expect(standingToSeated?.toState).toBe('seated_desk');
    expect(standingToSeated?.durationFrames).toBe(25);
  });
});
