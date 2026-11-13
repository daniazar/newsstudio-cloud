/**
 * lib/ai/gestureChoreographer.ts
 *
 * Script → Gesture Choreography Engine
 *
 * Parses news script text and assigns semantically appropriate anchor motion
 * states to each sentence. Uses keyword analysis to choose deterministic states
 * for high-signal sentences, and the Markov chain for neutral continuation.
 *
 * Output feeds into StateMachinePresenterLayer and the Loop CLI broadcast renderer.
 */

import { MotionState, getNextMotionState, MOTION_STATE_TO_ACTION_LOOP } from "./markovTransitionMatrix";

export interface ChoreographedSegment {
  /** Original sentence text */
  text: string;
  /** Semantic tag for this sentence e.g. [DATA], [BREAKING], [GREETING] */
  tag: string;
  /** Assigned motion state */
  motionState: MotionState;
  /** Resolved action loop clip ID for the Loop CLI / StateMachinePresenterLayer */
  actionLoopId: string;
  /** Whether this state was deterministically assigned (true) or Markov-sampled (false) */
  isDeterministic: boolean;
}

/** Keyword → MotionState signal maps (ordered by specificity — first match wins) */
const SIGNAL_RULES: Array<{
  keywords: string[];
  tag: string;
  state: MotionState;
}> = [
  // Greetings / opens
  { keywords: ["hello", "welcome", "good morning", "good evening", "bienvenidos", "buenas", "hola"], tag: "[GREETING]", state: "greeting_wave" },

  // Breaking news / urgency
  { keywords: ["breaking", "urgent", "alert", "just in", "developing", "último momento", "alerta", "urgente"], tag: "[BREAKING]", state: "leaning_forward" },

  // Data / financial / statistics
  { keywords: ["percent", "%", "billion", "million", "data", "stock", "market", "index", "inflation", "gdp", "cpi", "rate", "mercado", "inflación", "porcentaje"], tag: "[DATA]", state: "pointing_screen" },

  // Reports / documents / official
  { keywords: ["report", "document", "according to", "study", "research", "paper", "official", "informe", "según", "estudio", "investigación"], tag: "[DOCUMENT]", state: "papers" },

  // Analysis / explanation
  { keywords: ["because", "why", "explain", "analyze", "analysis", "understand", "context", "means that", "significa", "porque", "analizar"], tag: "[EXPLANATION]", state: "open_palms" },

  // Sceptical / interrogative
  { keywords: ["however", "but", "critics", "question", "doubt", "controversial", "yet", "sin embargo", "críticos", "cuestionan"], tag: "[SCEPTICAL]", state: "cross_arms" },

  // Affirmation / agreement after a quote
  { keywords: ["exactly", "correct", "absolutely", "indeed", "certainly", "that's right", "exactamente", "correcto", "así es"], tag: "[AFFIRM]", state: "head_nod" },

  // Typing / notes
  { keywords: ["note", "detail", "specifically", "number", "figure", "statistic", "in total", "suma", "específicamente", "número"], tag: "[NOTES]", state: "typing" },

  // Standing wide / field / intro
  { keywords: ["here at", "on the ground", "live from", "from our studio", "field reporter", "desde", "en vivo desde", "corresponsal"], tag: "[FIELD]", state: "standing_wide" },
];

/**
 * Parses script text into sentences and assigns choreographed motion states.
 *
 * @param scriptText - Raw broadcast script (may include emotion tags like [urgent])
 * @param initialState - Starting motion state (defaults to micro_idle)
 */
export function choreographScript(
  scriptText: string,
  initialState: MotionState = "micro_idle"
): ChoreographedSegment[] {
  // Split on sentence boundaries (preserve the delimiter)
  const sentences = scriptText
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);

  let currentState: MotionState = initialState;

  return sentences.map((sentence) => {
    const lower = sentence.toLowerCase();

    // Strip emotion/camera tags for keyword matching
    const stripped = lower.replace(/\[[^\]]+\]/g, "");

    // Try to find a deterministic signal rule
    let matchedTag = "[GENERAL]";
    let matchedState: MotionState | null = null;

    for (const rule of SIGNAL_RULES) {
      if (rule.keywords.some((kw) => stripped.includes(kw))) {
        matchedTag = rule.tag;
        matchedState = rule.state;
        break;
      }
    }

    if (matchedState) {
      currentState = matchedState;
      return {
        text: sentence,
        tag: matchedTag,
        motionState: currentState,
        actionLoopId: MOTION_STATE_TO_ACTION_LOOP[currentState],
        isDeterministic: true,
      };
    }

    // No signal match — advance via Markov chain
    currentState = getNextMotionState(currentState);
    return {
      text: sentence,
      tag: "[GENERAL]",
      motionState: currentState,
      actionLoopId: MOTION_STATE_TO_ACTION_LOOP[currentState],
      isDeterministic: false,
    };
  });
}

/**
 * Generates a flat list of action loop IDs for a given script.
 * Convenience wrapper for the Loop CLI broadcast renderer.
 */
export function getScriptActionLoops(scriptText: string): string[] {
  return choreographScript(scriptText).map((seg) => seg.actionLoopId);
}
