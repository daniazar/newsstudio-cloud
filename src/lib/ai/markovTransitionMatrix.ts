/**
 * lib/ai/markovTransitionMatrix.ts
 *
 * Discrete Markov Chain for anchor motion state transitions.
 *
 * Models natural presenter behaviour as a stochastic state machine.
 * Each state has a probability distribution over which state to transition
 * to next, calibrated for broadcast news anchor realism.
 *
 * States map to action loop clip IDs used by StateMachinePresenterLayer
 * and the Loop CLI action matrix.
 */

export type MotionState =
  | "micro_idle"       // Subtle micro-fidget breathing loop (default rest state)
  | "greeting_wave"    // Open arms welcome gesture
  | "open_palms"       // Explanatory open-palms gesture
  | "typing"           // Looking down at desk notes / typing
  | "papers"           // Shuffling papers / document reference
  | "pointing_screen"  // Pointing to left/right screen graphic
  | "leaning_forward"  // Engaged forward lean (breaking news)
  | "head_nod"         // Affirmative nod (after guest response)
  | "cross_arms"       // Sceptical / analytical posture
  | "standing_wide";   // Wide standing shot (field intro)

/**
 * Transition probability matrix.
 * Rows = current state, Columns = next state.
 * Each row must sum to 1.0.
 */
export const MARKOV_TRANSITION_MATRIX: Record<MotionState, Record<MotionState, number>> = {
  micro_idle:      { micro_idle: 0.25, greeting_wave: 0.05, open_palms: 0.25, typing: 0.10, papers: 0.10, pointing_screen: 0.10, leaning_forward: 0.05, head_nod: 0.05, cross_arms: 0.05, standing_wide: 0.00 },
  greeting_wave:   { micro_idle: 0.50, greeting_wave: 0.00, open_palms: 0.30, typing: 0.05, papers: 0.05, pointing_screen: 0.05, leaning_forward: 0.05, head_nod: 0.00, cross_arms: 0.00, standing_wide: 0.00 },
  open_palms:      { micro_idle: 0.30, greeting_wave: 0.05, open_palms: 0.10, typing: 0.15, papers: 0.10, pointing_screen: 0.15, leaning_forward: 0.05, head_nod: 0.05, cross_arms: 0.05, standing_wide: 0.00 },
  typing:          { micro_idle: 0.50, greeting_wave: 0.00, open_palms: 0.15, typing: 0.00, papers: 0.20, pointing_screen: 0.05, leaning_forward: 0.05, head_nod: 0.05, cross_arms: 0.00, standing_wide: 0.00 },
  papers:          { micro_idle: 0.50, greeting_wave: 0.00, open_palms: 0.15, typing: 0.15, papers: 0.00, pointing_screen: 0.05, leaning_forward: 0.05, head_nod: 0.05, cross_arms: 0.05, standing_wide: 0.00 },
  pointing_screen: { micro_idle: 0.40, greeting_wave: 0.00, open_palms: 0.25, typing: 0.10, papers: 0.05, pointing_screen: 0.00, leaning_forward: 0.10, head_nod: 0.05, cross_arms: 0.05, standing_wide: 0.00 },
  leaning_forward: { micro_idle: 0.35, greeting_wave: 0.00, open_palms: 0.20, typing: 0.10, papers: 0.10, pointing_screen: 0.10, leaning_forward: 0.00, head_nod: 0.10, cross_arms: 0.05, standing_wide: 0.00 },
  head_nod:        { micro_idle: 0.50, greeting_wave: 0.00, open_palms: 0.20, typing: 0.10, papers: 0.10, pointing_screen: 0.00, leaning_forward: 0.05, head_nod: 0.00, cross_arms: 0.05, standing_wide: 0.00 },
  cross_arms:      { micro_idle: 0.40, greeting_wave: 0.00, open_palms: 0.15, typing: 0.15, papers: 0.15, pointing_screen: 0.05, leaning_forward: 0.05, head_nod: 0.05, cross_arms: 0.00, standing_wide: 0.00 },
  standing_wide:   { micro_idle: 0.30, greeting_wave: 0.20, open_palms: 0.20, typing: 0.00, papers: 0.00, pointing_screen: 0.10, leaning_forward: 0.10, head_nod: 0.05, cross_arms: 0.05, standing_wide: 0.00 },
};

/**
 * Selects next motion state according to Markov transition probability.
 *
 * @param currentState - The anchor's current motion state
 * @param randomValue - Optional deterministic value (0–1) for testing; defaults to Math.random()
 */
export function getNextMotionState(
  currentState: MotionState,
  randomValue = Math.random()
): MotionState {
  const transitions = MARKOV_TRANSITION_MATRIX[currentState];
  let cumulative = 0;

  for (const [nextState, prob] of Object.entries(transitions)) {
    cumulative += prob;
    if (randomValue <= cumulative) {
      return nextState as MotionState;
    }
  }

  return "micro_idle"; // safe fallback
}

/**
 * Generates a sequence of N motion states using the Markov chain.
 * Useful for pre-computing an entire segment's motion choreography.
 *
 * @param initialState - Starting state
 * @param length - Number of states to generate
 * @param seed - Optional initial random seed for reproducibility
 */
export function generateMotionSequence(
  initialState: MotionState = "micro_idle",
  length: number = 10
): MotionState[] {
  const sequence: MotionState[] = [initialState];
  let current = initialState;

  for (let i = 1; i < length; i++) {
    current = getNextMotionState(current);
    sequence.push(current);
  }

  return sequence;
}

/**
 * Maps MotionState to the closest action loop ID used by the loop CLI
 * and StateMachinePresenterLayer.
 */
export const MOTION_STATE_TO_ACTION_LOOP: Record<MotionState, string> = {
  micro_idle:      "state_idle",
  greeting_wave:   "state_greeting",
  open_palms:      "state_explaining",
  typing:          "state_typing",
  papers:          "state_papers",
  pointing_screen: "state_pointing_screen",
  leaning_forward: "state_lean_forward",
  head_nod:        "state_nod",
  cross_arms:      "state_cross_arms",
  standing_wide:   "state_standing_wide",
};

/**
 * Maps MotionState to the corresponding Master Pose key (M1..M5)
 * in the Full-Mesh Action Matrix architecture.
 */
export const MOTION_STATE_TO_MASTER_POSE: Record<MotionState, "M1" | "M2" | "M3" | "M4" | "M5"> = {
  micro_idle:      "M1",
  greeting_wave:   "M3",
  open_palms:      "M2",
  typing:          "M1",
  papers:          "M1",
  pointing_screen: "M5",
  leaning_forward: "M1",
  head_nod:        "M2",
  cross_arms:      "M4",
  standing_wide:   "M4",
};

