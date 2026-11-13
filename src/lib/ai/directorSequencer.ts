/**
 * src/lib/ai/directorSequencer.ts
 *
 * NewsStudio Intelligent Automated Director Engine.
 *
 * Orchestrates anchor camera angles, emotional affect, rhetorical gestures,
 * and seamless Full-Mesh Kinematic Transitions (M_i -> M_j) across the 5 Master Poses.
 *
 * Supports three operational modes:
 *   1. "semantic" — Deterministic editorial direction based on 2D Emotion x Rhetorical Action tags.
 *   2. "markov"   — Stochastic broadcast news anchor simulation via discrete Markov chain.
 *   3. "hybrid"   — Default production mode: semantic tag-driven for key moments, Markov random walk for neutral flow.
 */

import { prisma } from "../prisma";
import type {
  AnchorEmotion,
  RhetoricAction,
  EnergyLevel,
  DirectorMode,
  MasterPoseKey,
  CameraCue,
} from "../types/stateMachine";
import {
  MotionState,
  getNextMotionState,
  MOTION_STATE_TO_MASTER_POSE,
} from "./markovTransitionMatrix";

export interface DirectorSegmentInput {
  index: number;
  text?: string;
  duration?: number;
  emotion?: AnchorEmotion;
  rhetoricAction?: RhetoricAction;
  energyLevel?: EnergyLevel;
  poseState?: MasterPoseKey;
  cameraCue?: CameraCue;
  dataGraphic?: unknown;
}

export interface DirectorBeat {
  segmentIndex: number;
  type: "transition" | "loop" | "dynamic_loop";
  clipId: string;
  startPose: MasterPoseKey;
  endPose: MasterPoseKey;
  emotion: AnchorEmotion;
  rhetoricAction: RhetoricAction;
  energyLevel: EnergyLevel;
  durationSec: number;
  cameraCue: CameraCue;
  isDeterministic: boolean;
  videoKey?: string;
}

export interface DirectorPlan {
  mode: DirectorMode;
  personaSlug: string;
  attireSlug: string;
  beats: DirectorBeat[];
  totalDurationSec: number;
  poseTransitionsCount: number;
}

export interface DirectorOptions {
  mode?: DirectorMode;
  initialPose?: MasterPoseKey;
  personaSlug?: string;
  attireSlug?: string;
  transitionDurationSec?: number;
  allowDynamicLeans?: boolean;
}

/**
 * Keyword rules to deduce affective emotion and rhetorical action when not explicitly provided.
 */
interface SemanticSignalRule {
  keywords: string[];
  tag: string;
  emotion: AnchorEmotion;
  rhetoricAction: RhetoricAction;
  energyLevel: EnergyLevel;
  targetPose: MasterPoseKey;
  cameraCue: CameraCue;
}

const SEMANTIC_RULES: SemanticSignalRule[] = [
  // Breaking News / Crisis
  {
    keywords: ["breaking", "urgent", "emergency", "alert", "alerta", "urgente", "último momento"],
    tag: "BREAKING",
    emotion: "grave_solemn",
    rhetoricAction: "emphasizing",
    energyLevel: "high",
    targetPose: "M2",
    cameraCue: "cam3_closeup",
  },
  // Data / Infographics / Statistics
  {
    keywords: ["percent", "%", "billion", "million", "data", "chart", "inflation", "gdp", "market", "inflación", "gráfico", "mercado"],
    tag: "DATA",
    emotion: "analytical_scrutiny",
    rhetoricAction: "presenting_graphic",
    energyLevel: "medium",
    targetPose: "M5",
    cameraCue: "cam2_left",
  },
  // Comparative / Perspectives / Trade-offs
  {
    keywords: ["however", "on the other hand", "alternatively", "versus", "vs", "por otro lado", "sin embargo", "comparado"],
    tag: "COMPARE",
    emotion: "analytical_scrutiny",
    rhetoricAction: "comparing",
    energyLevel: "medium",
    targetPose: "M3",
    cameraCue: "cam2_left",
  },
  // Investigation / Analytical Deep-Dive
  {
    keywords: ["why", "how", "investigate", "study", "analysis", "evidence", "report", "por qué", "análisis", "informe"],
    tag: "ANALYSIS",
    emotion: "analytical_scrutiny",
    rhetoricAction: "explaining",
    energyLevel: "medium",
    targetPose: "M2",
    cameraCue: "cam2_left",
  },
  // Heartfelt / Human Interest / Solidarity
  {
    keywords: ["heartfelt", "tribute", "compassion", "solidarity", "recovery", "community", "solidaridad", "homenaje", "recuperación"],
    tag: "HEARTFELT",
    emotion: "empathetic_heartfelt",
    rhetoricAction: "emphasizing",
    energyLevel: "medium",
    targetPose: "M4",
    cameraCue: "cam3_closeup",
  },
  // Upbeat / Breakthroughs / Triumphs
  {
    keywords: ["breakthrough", "record", "triumph", "celebrates", "victory", "success", "innovación", "triunfo", "éxito"],
    tag: "UPBEAT",
    emotion: "enthusiastic_upbeat",
    rhetoricAction: "emphasizing",
    energyLevel: "high",
    targetPose: "M2",
    cameraCue: "cam2_left",
  },
];

/**
 * Resolves inline bracket directives like [emotion:grave_solemn] [action:comparing] [M3]
 */
export function extractInlineDirectives(text: string): {
  cleanText: string;
  emotion?: AnchorEmotion;
  rhetoricAction?: RhetoricAction;
  poseState?: MasterPoseKey;
} {
  let cleanText = text;
  let emotion: AnchorEmotion | undefined;
  let rhetoricAction: RhetoricAction | undefined;
  let poseState: MasterPoseKey | undefined;

  const emotionMatch = text.match(/\[emotion:([a-z_]+)\]/i);
  if (emotionMatch) {
    emotion = emotionMatch[1].toLowerCase() as AnchorEmotion;
    cleanText = cleanText.replace(emotionMatch[0], "");
  }

  const actionMatch = text.match(/\[action:([a-z_]+)\]/i);
  if (actionMatch) {
    rhetoricAction = actionMatch[1].toLowerCase() as RhetoricAction;
    cleanText = cleanText.replace(actionMatch[0], "");
  }

  const poseMatch = text.match(/\[(M[1-5])\]/i);
  if (poseMatch) {
    poseState = poseMatch[1].toUpperCase() as MasterPoseKey;
    cleanText = cleanText.replace(poseMatch[0], "");
  }

  return {
    cleanText: cleanText.replace(/\s+/g, " ").trim(),
    emotion,
    rhetoricAction,
    poseState,
  };
}

/**
 * Selects the optimal Action Loop clip ID for a given Master Pose, Emotion, and Rhetoric Action.
 */
export function selectActionLoopId(
  pose: MasterPoseKey,
  emotion: AnchorEmotion,
  action: RhetoricAction | string,
  allowDynamic = true,
  isMale = true
): { clipId: string; type: "loop" | "dynamic_loop" } {
  // Check for grooming and attire micro-adjustments
  const act = (action || "").toLowerCase();
  if (act.includes("tie") || act.includes("collar") || act.includes("lapel") || act.includes("hair") || act.includes("groom")) {
    if (pose === "M1") {
      return { clipId: isMale ? "M1_tie_adjust_v1" : "M1_hair_adjust_v1", type: "dynamic_loop" };
    }
    if (pose === "M4") {
      return { clipId: isMale ? "M4_lapel_adjust_v1" : "M4_hair_adjust_v1", type: "dynamic_loop" };
    }
  }

  // Check for dynamic body actions
  if (allowDynamic) {
    if (act === "forward_lean") {
      if (pose === "M1") return { clipId: "M1_dynamic_v1", type: "dynamic_loop" };
      if (pose === "M3") return { clipId: "M3_dynamic_v1", type: "dynamic_loop" };
    }
    if (act === "side_turn" && pose === "M5" && emotion === "analytical_scrutiny") {
      return { clipId: "M5_dynamic_v1", type: "dynamic_loop" };
    }
    if (act === "dynamic" || act.includes("dynamic")) {
      if (pose === "M1") return { clipId: "M1_dynamic_v1", type: "dynamic_loop" };
      if (pose === "M2") return { clipId: "M2_dynamic_v1", type: "dynamic_loop" };
      if (pose === "M3") return { clipId: "M3_dynamic_v1", type: "dynamic_loop" };
      if (pose === "M4") return { clipId: "M4_dynamic_v1", type: "dynamic_loop" };
      if (pose === "M5") return { clipId: "M5_dynamic_v1", type: "dynamic_loop" };
    }
  }

  switch (pose) {
    case "M1":
      if (act === "explaining") return { clipId: "M1_loop_v2", type: "loop" };
      return { clipId: "M1_loop_v1", type: "loop" }; // little_movement / composed

    case "M2":
      if (act === "explaining" || emotion === "analytical_scrutiny") {
        return { clipId: "M2_loop_v2", type: "loop" };
      }
      return { clipId: "M2_loop_v1", type: "loop" }; // emphasizing

    case "M3":
      if (act === "comparing") return { clipId: "M3_loop_v2", type: "loop" };
      return { clipId: "M3_loop_v1", type: "loop" }; // welcoming / expansive

    case "M4":
      if (act === "emphasizing" || emotion === "empathetic_heartfelt") {
        return { clipId: "M4_loop_v2", type: "loop" };
      }
      return { clipId: "M4_loop_v1", type: "loop" }; // little_movement / solemn

    case "M5":
      if (act === "presenting_graphic") return { clipId: "M5_loop_v1", type: "loop" };
      return { clipId: "M5_loop_v2", type: "loop" }; // side_turn / aside

    default:
      return { clipId: "M1_loop_v1", type: "loop" };
  }
}

/**
 * Builds the canonical transition ID between two Master Poses.
 * e.g., M1 -> M3 gives "T1_to_3"
 */
export function buildPoseTransitionId(from: MasterPoseKey, to: MasterPoseKey): string {
  const fromNum = from.replace("M", "");
  const toNum = to.replace("M", "");
  return `T${fromNum}_to_${toNum}`;
}

/**
 * Synchronous Director Sequencer: Generates an optimized, choreographic video beat plan.
 */
export function sequenceStoryPlan(
  segments: DirectorSegmentInput[],
  options: DirectorOptions = {}
): DirectorPlan {
  const mode: DirectorMode = options.mode || "hybrid";
  const personaSlug = options.personaSlug || "ruby";
  const attireSlug = options.attireSlug || "default_attire";
  const transDur = options.transitionDurationSec ?? 1.0;
  const allowDynamic = options.allowDynamicLeans !== false;

  let currentPose: MasterPoseKey = options.initialPose || "M1";
  let currentMarkovState: MotionState = "micro_idle";
  const beats: DirectorBeat[] = [];
  let poseTransitionsCount = 0;

  const totalSegments = segments.length;

  for (let i = 0; i < totalSegments; i++) {
    const seg = segments[i];
    const segDuration = seg.duration && seg.duration > 0 ? seg.duration : 4.0;
    const rawText = seg.text || "";

    // 1. Extract inline directives if present
    const inline = extractInlineDirectives(rawText);
    const textToMatch = inline.cleanText.toLowerCase();

    let targetPose: MasterPoseKey = currentPose;
    let emotion: AnchorEmotion = seg.emotion || inline.emotion || "neutral_composed";
    let rhetoricAction: RhetoricAction = seg.rhetoricAction || inline.rhetoricAction || "little_movement";
    let energyLevel: EnergyLevel = seg.energyLevel || "medium";
    let cameraCue: CameraCue = seg.cameraCue || "cam2_left";
    let isDeterministic = false;

    // Direct pose override
    if (seg.poseState || inline.poseState) {
      targetPose = (seg.poseState || inline.poseState)!;
      isDeterministic = true;
    } else if (seg.dataGraphic) {
      // Infographics always anchor to M5 with Cam 2
      targetPose = "M5";
      emotion = "analytical_scrutiny";
      rhetoricAction = "presenting_graphic";
      energyLevel = "medium";
      cameraCue = "cam2_left";
      isDeterministic = true;
    } else if (mode === "semantic") {
      // Semantic mode: deterministic assignment from tags, structural rules, or keywords
      if (i === 0) {
        // Welcome Hook
        targetPose = "M3";
        emotion = "enthusiastic_upbeat";
        rhetoricAction = "welcoming";
        energyLevel = "high";
        cameraCue = "cam1_wide";
        isDeterministic = true;
      } else if (totalSegments > 1 && i === totalSegments - 1) {
        // Outro Sign-off
        targetPose = "M1";
        emotion = "neutral_composed";
        rhetoricAction = "little_movement";
        energyLevel = "low";
        cameraCue = "cam1_wide";
        isDeterministic = true;
      } else {
        const matched = SEMANTIC_RULES.find((rule) =>
          rule.keywords.some((kw) => textToMatch.includes(kw))
        );
        if (matched) {
          targetPose = matched.targetPose;
          emotion = matched.emotion;
          rhetoricAction = matched.rhetoricAction;
          energyLevel = matched.energyLevel;
          cameraCue = matched.cameraCue;
          isDeterministic = true;
        } else {
          // Default semantic progression
          targetPose = (i % 2 === 1) ? "M2" : "M1";
          emotion = "neutral_composed";
          rhetoricAction = (i % 2 === 1) ? "explaining" : "little_movement";
          energyLevel = "medium";
          cameraCue = "cam2_left";
          isDeterministic = true;
        }
      }
    } else if (mode === "markov") {
      // Pure Markov mode: Advance state stochastically
      currentMarkovState = getNextMotionState(currentMarkovState);
      targetPose = MOTION_STATE_TO_MASTER_POSE[currentMarkovState] || "M1";
      isDeterministic = false;
      // Derive emotion/action from Markov state
      if (currentMarkovState === "greeting_wave") {
        emotion = "enthusiastic_upbeat";
        rhetoricAction = "welcoming";
        cameraCue = "cam1_wide";
      } else if (currentMarkovState === "leaning_forward") {
        emotion = "grave_solemn";
        rhetoricAction = "forward_lean";
        cameraCue = "cam3_closeup";
      } else if (currentMarkovState === "pointing_screen") {
        emotion = "analytical_scrutiny";
        rhetoricAction = "presenting_graphic";
        cameraCue = "cam2_left";
      } else if (currentMarkovState === "open_palms") {
        emotion = "neutral_composed";
        rhetoricAction = "explaining";
        cameraCue = "cam2_left";
      } else {
        emotion = "neutral_composed";
        rhetoricAction = "little_movement";
        cameraCue = "cam2_left";
      }
    } else {
      // Hybrid mode: Check high-signal tags and rules; otherwise advance via Markov
      if (seg.emotion || seg.rhetoricAction || inline.emotion || inline.rhetoricAction) {
        // Explicit tags provided
        if (rhetoricAction === "welcoming" || rhetoricAction === "comparing") targetPose = "M3";
        else if (rhetoricAction === "presenting_graphic" || rhetoricAction === "side_turn") targetPose = "M5";
        else if (rhetoricAction === "explaining" || rhetoricAction === "emphasizing") targetPose = "M2";
        else if (emotion === "grave_solemn" || emotion === "empathetic_heartfelt") targetPose = "M4";
        else targetPose = "M1";
        isDeterministic = true;
      } else if (i === 0) {
        // Welcome Hook
        targetPose = "M3";
        emotion = "enthusiastic_upbeat";
        rhetoricAction = "welcoming";
        energyLevel = "high";
        cameraCue = "cam1_wide";
        isDeterministic = true;
      } else if (totalSegments > 1 && i === totalSegments - 1) {
        // Sign-off
        targetPose = "M1";
        emotion = "neutral_composed";
        rhetoricAction = "little_movement";
        energyLevel = "low";
        cameraCue = "cam1_wide";
        isDeterministic = true;
      } else {
        const matched = SEMANTIC_RULES.find((rule) =>
          rule.keywords.some((kw) => textToMatch.includes(kw))
        );
        if (matched) {
          targetPose = matched.targetPose;
          emotion = matched.emotion;
          rhetoricAction = matched.rhetoricAction;
          energyLevel = matched.energyLevel;
          cameraCue = matched.cameraCue;
          isDeterministic = true;
        } else {
          // Neutral speech continuation — use Markov to avoid static posture
          currentMarkovState = getNextMotionState(currentMarkovState);
          targetPose = MOTION_STATE_TO_MASTER_POSE[currentMarkovState] || "M1";
          isDeterministic = false;
        }
      }
    }

    // 2. Schedule Kinematic Transition if posture change is needed
    let remainingSegDuration = segDuration;
    if (currentPose !== targetPose) {
      const transId = buildPoseTransitionId(currentPose, targetPose);
      const actualTransDuration = Math.min(transDur, remainingSegDuration * 0.5);

      beats.push({
        segmentIndex: i,
        type: "transition",
        clipId: transId,
        startPose: currentPose,
        endPose: targetPose,
        emotion: "neutral_composed",
        rhetoricAction: "explaining",
        energyLevel: "medium",
        durationSec: actualTransDuration,
        cameraCue,
        isDeterministic,
      });

      remainingSegDuration -= actualTransDuration;
      poseTransitionsCount++;
      currentPose = targetPose;
    }

    // 3. Schedule target Action Loop
    const isMale = ["mateo", "diego", "blaze", "marcus", "ethan", "lucas"].some((m) =>
      personaSlug.toLowerCase().includes(m)
    );
    const { clipId: actionClipId, type: clipType } = selectActionLoopId(
      currentPose,
      emotion,
      rhetoricAction,
      allowDynamic,
      isMale
    );

    beats.push({
      segmentIndex: i,
      type: clipType,
      clipId: actionClipId,
      startPose: currentPose,
      endPose: currentPose,
      emotion,
      rhetoricAction,
      energyLevel,
      durationSec: Math.max(0.5, remainingSegDuration),
      cameraCue,
      isDeterministic,
    });
  }

  const totalDurationSec = beats.reduce((acc, b) => acc + b.durationSec, 0);

  return {
    mode,
    personaSlug,
    attireSlug,
    beats,
    totalDurationSec,
    poseTransitionsCount,
  };
}

/**
 * Enriches a DirectorPlan by querying the SQLite database for generated video assets.
 */
export async function resolveDirectorPlanMedia(
  plan: DirectorPlan,
  personaSlug?: string,
  attireSlug?: string
): Promise<DirectorPlan> {
  const persona = personaSlug || plan.personaSlug;
  const attire = attireSlug || plan.attireSlug;

  try {
    const personaRecord = await prisma.persona.findFirst({
      where: {
        OR: [{ slug: persona.toLowerCase() }, { name: { contains: persona } }],
      },
      include: {
        actionLoops: true,
      },
    });

    if (!personaRecord || !personaRecord.actionLoops.length) {
      // Fall back to canonical disk asset path pattern
      plan.beats.forEach((b) => {
        b.videoKey = `assets/action_loops/veo/${persona}_${attire}/${persona}_${attire}_${b.clipId}.mp4`;
      });
      return plan;
    }

    const loopMap = new Map(personaRecord.actionLoops.map((l) => [l.actionName, l.baseVideoKey]));

    plan.beats.forEach((b) => {
      if (loopMap.has(b.clipId)) {
        b.videoKey = loopMap.get(b.clipId) || undefined;
      } else {
        b.videoKey = `assets/action_loops/veo/${persona}_${attire}/${persona}_${attire}_${b.clipId}.mp4`;
      }
    });

    return plan;
  } catch {
    // Database query fallback
    plan.beats.forEach((b) => {
      b.videoKey = `assets/action_loops/veo/${persona}_${attire}/${persona}_${attire}_${b.clipId}.mp4`;
    });
    return plan;
  }
}
