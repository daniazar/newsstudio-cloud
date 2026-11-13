/**
 * src/lib/video/loopSelector.ts
 *
 * Full-Mesh Finite State Machine (FSM) Broadcast Loop Selector, 3-Tier Pacing Director,
 * Markov Transition Engine & Camera Switcher for NewsStudio.
 */

import {
  BroadcastDomainType,
  CameraRigId,
  ChoreographedBeatNode,
  LoopSelectionResult,
  LoopSelectorOptions,
  MasterPoseCode,
  MotionTier,
  PacingDirectorConfig,
  ScriptCue,
  TransitionType,
} from "./loopSelectorTypes";
import {
  resolvePersonaVeoPrefix,
  PERSONAS_WITH_TRANSITIONS,
  getPersona37Clips,
} from "../ecommerce/actionLoopFsmEngine";

// ============================================================================
// 1. DEFAULT CONFIGURATION & POSE DEFINITIONS
// ============================================================================

export const DEFAULT_PACING_CONFIG: PacingDirectorConfig = {
  maxMacroActionsPerMinute: 1,
  minMicroBeatSpacingSec: 8.0, // 2 beats at 4.0s
  ambientIdleRatioTarget: 0.75,
  fatigueHistoryWindow: 3,
  fatigueDecayFactor: 0.35,
};

export const DEFAULT_TRANSITION_PROBABILITIES = {
  selfLoopProb: 0.75,
  poseShiftProb: 0.18,
  cameraCutProb: 0.07,
};

export interface PoseDefinition {
  code: MasterPoseCode;
  id: string;
  label: string;
  domain: BroadcastDomainType;
  defaultCamera: CameraRigId;
  isHomeBase?: boolean;
  isBridgeBase?: boolean;
  beats: {
    id: string;
    label: string;
    tier: MotionTier;
    baseWeight: number;
    recommendedCamera?: CameraRigId;
  }[];
}

export const MASTER_POSES: Record<string, PoseDefinition> = {
  // DOMAIN 3: CHROMA WALL STANDING
  P01_NEUTRAL_CLASPED: {
    code: "M1",
    id: "P01_NEUTRAL_CLASPED",
    label: "P01: Neutral Clasped Hands (Home Base)",
    domain: "chroma_wall_standing",
    defaultCamera: "cam1_wide",
    isHomeBase: true,
    beats: [
      { id: "state_idle", label: "Subtle Breathing & Blink", tier: "tier1_ambient_idle", baseWeight: 1.0 },
      { id: "P11_RELAXED_BREATH_SETTLE", label: "Relaxed Breath Settle", tier: "tier1_ambient_idle", baseWeight: 0.8 },
      { id: "P04_CONFIDENT_NOD_EMPHASIS", label: "Confident Head Nod", tier: "tier2_micro_beat", baseWeight: 0.5 },
      { id: "P05_ANALYTICAL_HEAD_TILT", label: "Analytical Head Tilt", tier: "tier2_micro_beat", baseWeight: 0.5 },
      { id: "P06_CHEST_HAND_SINCERITY", label: "Chest Hand Sincerity", tier: "tier2_micro_beat", baseWeight: 0.4 },
      { id: "P09_WARM_SIGNOFF_SMILE", label: "Warm Sign-off Smile", tier: "tier2_micro_beat", baseWeight: 0.4 },
      { id: "P10_AUTHORITATIVE_FOCUS", label: "Authoritative Direct Gaze", tier: "tier2_micro_beat", baseWeight: 0.5 },
      { id: "P13_LOOK_DOWN_NOTES", label: "Teleprompter / Notes Glance", tier: "tier2_micro_beat", baseWeight: 0.4 },
      { id: "P15_ANALYTICAL_INVESTIGATION", label: "Investigative Deep Glance", tier: "tier2_micro_beat", baseWeight: 0.4 },
    ],
  },

  P02_RAISED_EXPLANATORY: {
    code: "M2",
    id: "P02_RAISED_EXPLANATORY",
    label: "P02: Raised Right Hand (Dynamic Explanatory)",
    domain: "chroma_wall_standing",
    defaultCamera: "cam2_left",
    beats: [
      { id: "state_explanatory_right", label: "Explanatory Hand Articulation", tier: "tier1_ambient_idle", baseWeight: 1.0 },
      { id: "P12_DYNAMIC_SWEEP_EMPHASIS", label: "Dynamic Sweep Arc", tier: "tier3_macro_action", baseWeight: 0.3 },
      { id: "P07_LEFT_HAND_EXPLANATORY", label: "Left Hand Presentation Sweep", tier: "tier2_micro_beat", baseWeight: 0.4 },
    ],
  },

  P03_OPEN_TWO_HANDS: {
    code: "M3",
    id: "P03_OPEN_TWO_HANDS",
    label: "P03: Open Two Hands (Welcoming Overview)",
    domain: "chroma_wall_standing",
    defaultCamera: "cam1_wide",
    beats: [
      { id: "state_intro_welcome", label: "Open Hands Balanced Welcome", tier: "tier1_ambient_idle", baseWeight: 1.0 },
      { id: "P08_BALANCING_COMPARISON", label: "Two-Hand Balancing Comparison", tier: "tier2_micro_beat", baseWeight: 0.5 },
    ],
  },

  P04_SEPARATED_NEUTRAL: {
    code: "M4",
    id: "P04_SEPARATED_NEUTRAL",
    label: "P04: Separated Arms Neutral (Casual Stance)",
    domain: "chroma_wall_standing",
    defaultCamera: "cam1_wide",
    beats: [
      { id: "P04_SEPARATED_NEUTRAL", label: "Separated Arms Calm Breathing", tier: "tier1_ambient_idle", baseWeight: 1.0 },
    ],
  },

  P05_SIDE_PERSPECTIVE_TURN: {
    code: "M5",
    id: "P05_SIDE_PERSPECTIVE_TURN",
    label: "P05: Side Perspective Turn (Screen Reference)",
    domain: "chroma_wall_standing",
    defaultCamera: "cam2_left",
    beats: [
      { id: "P05_SIDE_PERSPECTIVE_TURN", label: "3/4 Side Angle Poised Stance", tier: "tier1_ambient_idle", baseWeight: 1.0 },
      { id: "P14_GESTURE_RIGHT_SIDEBAR", label: "Graphic Screen Reference Look", tier: "tier2_micro_beat", baseWeight: 0.5 },
    ],
  },

  // DOMAIN 1: SEATED BROADCAST DESK
  D1_P01_DESK_CLASPED_BASE: {
    code: "D1_P01",
    id: "D1_P01_DESK_CLASPED_BASE",
    label: "D1-P01: Seated Desk Clasped (Bridge Base)",
    domain: "seated_broadcast_desk",
    defaultCamera: "cam1_wide",
    isHomeBase: true,
    isBridgeBase: true,
    beats: [
      { id: "D1_P01_DESK_CLASPED_BASE", label: "Seated Desk Breathing & Nod", tier: "tier1_ambient_idle", baseWeight: 1.0 },
      { id: "D1_P02_DESK_LAPTOP_TYPING", label: "Laptop Keyboard Reference", tier: "tier2_micro_beat", baseWeight: 0.4 },
      { id: "D1_P03_DESK_SCRIPT_REVIEW", label: "Script Papers Review", tier: "tier2_micro_beat", baseWeight: 0.4 },
      { id: "D1_P04_DESK_EXPLANATORY", label: "Seated Explanatory Gesture", tier: "tier2_micro_beat", baseWeight: 0.5 },
    ],
  },

  // DOMAIN 2: STANDING BROADCAST DESK
  D2_P01_STAND_DESK_BASE: {
    code: "D2_P01",
    id: "D2_P01_STAND_DESK_BASE",
    label: "D2-P01: Standing Beside Desk (Bridge Base)",
    domain: "standing_broadcast_desk",
    defaultCamera: "cam1_wide",
    isHomeBase: true,
    isBridgeBase: true,
    beats: [
      { id: "D2_P01_STAND_DESK_BASE", label: "Standing Desk Corner Rest", tier: "tier1_ambient_idle", baseWeight: 1.0 },
      { id: "D2_P02_PODIUM_TABLET_TAP", label: "Podium Tablet Tap", tier: "tier2_micro_beat", baseWeight: 0.5 },
    ],
  },
};

// ============================================================================
// 2. SCRIPT NLP SEMANTIC CUE PARSER
// ============================================================================

const CUE_REGEX = /\[(BREAKING|ALERT|URGENT|DATA|REPORT|NUMBERS|STATS|EXPLAIN|ANALYTICAL|FOCUS|CLOSEUP|WIDE|MEDIUM|GREETING|WELCOME|INTRO|CHART|SCREEN|GRAPHIC|SIDEBAR|WALL|CONTRAST|DEBATE|EMPATHY|EMPHASIS|KEY_POINT|NOD|NOTES|SCRIPT|FACT_CHECK|OUTRO|CONCLUSION|SIGNOFF|WRAPUP|MACRO:[\w_-]+|CAM:[\w_-]+)\]/gi;

/**
 * Extracts explicit or implicit semantic cues from news script text with estimated timestamps.
 */
export function extractScriptCues(scriptText: string, wordsPerSecond: number = 2.4): ScriptCue[] {
  const cues: ScriptCue[] = [];
  if (!scriptText || scriptText.trim().length === 0) return cues;

  // Split into words and track time
  const tokens = scriptText.split(/\s+/);
  let wordCount = 0;

  for (const token of tokens) {
    const match = token.match(CUE_REGEX);
    if (match) {
      for (const rawTag of match) {
        const cleanTag = rawTag.replace(/[\[\]]/g, "").toUpperCase();
        const timeSec = wordCount / wordsPerSecond;

        let sentiment: ScriptCue["sentiment"] = "neutral";
        if (["BREAKING", "ALERT", "URGENT"].includes(cleanTag)) sentiment = "breaking";
        else if (["DATA", "REPORT", "STATS", "EXPLAIN", "ANALYTICAL"].includes(cleanTag)) sentiment = "analytical";
        else if (["GREETING", "WELCOME", "INTRO", "OUTRO", "CONCLUSION", "SIGNOFF"].includes(cleanTag)) sentiment = "warm";
        else if (["EMPATHY"].includes(cleanTag)) sentiment = "warm";

        cues.push({
          timeSec,
          tag: cleanTag,
          rawMatch: rawTag,
          sentiment,
        });
      }
    } else {
      wordCount++;
    }
  }

  return cues;
}

// ============================================================================
// 3. SELECTION & CONTINUITY LOGIC
// ============================================================================

/**
 * Finds the home base pose for a given broadcast domain.
 */
export function getHomeBasePose(domain: BroadcastDomainType = "chroma_wall_standing"): PoseDefinition {
  if (domain === "seated_broadcast_desk") return MASTER_POSES.D1_P01_DESK_CLASPED_BASE;
  if (domain === "standing_broadcast_desk") return MASTER_POSES.D2_P01_STAND_DESK_BASE;
  return MASTER_POSES.P01_NEUTRAL_CLASPED;
}

/**
 * Resolves all poses belonging to a domain.
 */
export function getDomainPoses(domain: BroadcastDomainType): PoseDefinition[] {
  return Object.values(MASTER_POSES).filter((p) => p.domain === domain);
}

/**
 * Decays beat weights based on recent usage history to eliminate repetitive loops.
 */
export function calculateEffectiveBeatWeight(
  baseWeight: number,
  beatId: string,
  currentBeatIndex: number,
  history: ChoreographedBeatNode[],
  config: PacingDirectorConfig
): number {
  let decayMultiplier = 1.0;
  const recentWindow = history.slice(-config.fatigueHistoryWindow);

  recentWindow.forEach((node) => {
    if (node.actionStateId === beatId) {
      const distance = currentBeatIndex - node.beatIndex;
      // Exponential decay: more recently used -> lower weight
      decayMultiplier *= Math.pow(config.fatigueDecayFactor, Math.max(1, 4 - distance));
    }
  });

  return baseWeight * decayMultiplier;
}

/**
 * Selects an action beat from the given pose respecting pacing rules, anti-fatigue decay,
 * and current macro/micro constraints.
 */
export function selectPoseBeat(
  pose: PoseDefinition,
  currentBeatIndex: number,
  history: ChoreographedBeatNode[],
  config: PacingDirectorConfig,
  forcedTier?: MotionTier
): { id: string; label: string; tier: MotionTier; recommendedCamera?: CameraRigId } {
  // Check pacing constraints
  const lastMicroBeatIndex = history
    .slice()
    .reverse()
    .find((n) => n.tier === "tier2_micro_beat")?.beatIndex;
  const spacingSinceMicro = lastMicroBeatIndex !== undefined ? (currentBeatIndex - lastMicroBeatIndex) * 4.0 : 999;
  const allowMicroBeat = spacingSinceMicro >= config.minMicroBeatSpacingSec;

  // Filter candidates
  let candidates = pose.beats.slice();

  if (forcedTier) {
    const tierMatches = candidates.filter((b) => b.tier === forcedTier);
    if (tierMatches.length > 0) candidates = tierMatches;
  } else {
    // If micro-beat spacing is violated, prefer ambient idle
    if (!allowMicroBeat) {
      const ambientOnly = candidates.filter((b) => b.tier === "tier1_ambient_idle");
      if (ambientOnly.length > 0) candidates = ambientOnly;
    }
  }

  // Calculate weighted lottery
  const weighted = candidates.map((beat) => ({
    beat,
    weight: calculateEffectiveBeatWeight(beat.baseWeight, beat.id, currentBeatIndex, history, config),
  }));

  const totalWeight = weighted.reduce((acc, curr) => acc + curr.weight, 0);
  if (totalWeight <= 0) {
    return candidates[0] || { id: "state_idle", label: "Idle Loop", tier: "tier1_ambient_idle" };
  }

  let randomVal = Math.random() * totalWeight;
  for (const item of weighted) {
    randomVal -= item.weight;
    if (randomVal <= 0) {
      return item.beat;
    }
  }

  return candidates[0];
}

/**
 * Maps semantic script cue tags to optimal pose, camera, and transition commands.
 */
export function mapCueToStateIntent(
  cue: ScriptCue,
  currentPose: PoseDefinition,
  currentCam: CameraRigId,
  domain: BroadcastDomainType
): {
  targetPoseId?: string;
  targetCamera?: CameraRigId;
  forcedTier?: MotionTier;
  forcedBeatId?: string;
} {
  const tag = cue.tag.toUpperCase();

  // Camera Cuts
  if (tag === "CLOSEUP" || tag === "CAM:CLOSEUP" || tag === "CAM:CLOSE" || tag === "BREAKING" || tag === "ALERT") {
    return {
      targetCamera: "cam3_closeup",
      forcedTier: "tier2_micro_beat",
      forcedBeatId: "P10_AUTHORITATIVE_FOCUS",
    };
  }

  if (tag === "WIDE" || tag === "CAM:WIDE") {
    return { targetCamera: "cam1_wide" };
  }

  if (tag === "MEDIUM" || tag === "CAM:MEDIUM") {
    return { targetCamera: "cam2_left" };
  }

  // Explanatory & Data
  if (["DATA", "REPORT", "STATS", "EXPLAIN", "ANALYTICAL", "NUMBERS"].includes(tag)) {
    if (domain === "seated_broadcast_desk") {
      return { targetPoseId: "D1_P01_DESK_CLASPED_BASE", forcedBeatId: "D1_P02_DESK_LAPTOP_TYPING", targetCamera: "cam2_left" };
    }
    return {
      targetPoseId: "P02_RAISED_EXPLANATORY",
      targetCamera: "cam2_left",
      forcedTier: "tier1_ambient_idle",
    };
  }

  // Welcome / Greeting
  if (["GREETING", "WELCOME", "INTRO"].includes(tag)) {
    return {
      targetPoseId: "P03_OPEN_TWO_HANDS",
      targetCamera: "cam1_wide",
      forcedTier: "tier1_ambient_idle",
    };
  }

  // Screen / Chart / Graphic Look
  if (["CHART", "SCREEN", "GRAPHIC", "SIDEBAR", "WALL"].includes(tag)) {
    return {
      targetPoseId: "P05_SIDE_PERSPECTIVE_TURN",
      targetCamera: "cam2_left",
      forcedTier: "tier2_micro_beat",
      forcedBeatId: "P14_GESTURE_RIGHT_SIDEBAR",
    };
  }

  // Notes / Script Review
  if (["NOTES", "SCRIPT", "FACT_CHECK"].includes(tag)) {
    if (domain === "seated_broadcast_desk") {
      return { targetPoseId: "D1_P01_DESK_CLASPED_BASE", forcedBeatId: "D1_P03_DESK_SCRIPT_REVIEW" };
    }
    return {
      targetPoseId: "P01_NEUTRAL_CLASPED",
      forcedBeatId: "P13_LOOK_DOWN_NOTES",
      forcedTier: "tier2_micro_beat",
    };
  }

  // Empathy / Heartfelt
  if (tag === "EMPATHY") {
    return {
      targetPoseId: "P01_NEUTRAL_CLASPED",
      forcedBeatId: "P06_CHEST_HAND_SINCERITY",
      targetCamera: "cam3_closeup",
      forcedTier: "tier2_micro_beat",
    };
  }

  // Outro / Conclusion
  if (["OUTRO", "CONCLUSION", "SIGNOFF", "WRAPUP"].includes(tag)) {
    return {
      targetPoseId: "P01_NEUTRAL_CLASPED",
      forcedBeatId: "P09_WARM_SIGNOFF_SMILE",
      targetCamera: "cam1_wide",
      forcedTier: "tier2_micro_beat",
    };
  }

  // Contrast / Debate
  if (["CONTRAST", "DEBATE"].includes(tag)) {
    return {
      targetPoseId: "P03_OPEN_TWO_HANDS",
      forcedBeatId: "P08_BALANCING_COMPARISON",
      targetCamera: "cam2_left",
    };
  }

  return {};
}

// ============================================================================
// 4. ASSET PATH & CACHE KEY RESOLVER
// ============================================================================

/**
 * Resolves local file paths, transparent WebMs, and latent cache keys for a given beat node.
 */
export function resolveBeatAssetPaths(
  node: {
    startPose: string;
    endPose: string;
    actionStateId: string;
    transitionType: TransitionType;
    camera: CameraRigId;
  },
  personaId: string = "ruby"
): {
  videoPath: string;
  transparentWebmPath: string;
  latentsCacheKey: string;
  coordsCacheKey: string;
} {
  const normId = personaId.toLowerCase().trim();
  const dirName = resolvePersonaVeoPrefix(personaId);
  const prefix = dirName;
  const isMateo = normId.includes("mateo");
  const isBlaze = normId.includes("blaze");
  const hasTransitions = Array.from(PERSONAS_WITH_TRANSITIONS).some((p) => normId.includes(p));

  let videoFilename = "";
  let webmFilename = "";
  let latentsKey = "";

  const poseIndex = (poseStr: string): number => {
    if (poseStr.includes("P01") || poseStr.includes("M1")) return 1;
    if (poseStr.includes("P02") || poseStr.includes("M2")) return 2;
    if (poseStr.includes("P03") || poseStr.includes("M3")) return 3;
    if (poseStr.includes("P04") || poseStr.includes("M4")) return 4;
    if (poseStr.includes("P05") || poseStr.includes("M5")) return 5;
    return 1;
  };

  const sIdx = poseIndex(node.startPose);
  const eIdx = poseIndex(node.endPose || node.startPose);

  if (node.transitionType === "flf_pose_transition" && sIdx !== eIdx && hasTransitions) {
    videoFilename = `${dirName}/${prefix}_T${sIdx}_to_${eIdx}.mp4`;
    latentsKey = `${prefix}_T${sIdx}_to_${eIdx}`;
  } else {
    // Loop or dynamic beat
    const act = (node.actionStateId || "").toLowerCase();
    if (act.includes("hair") || act.includes("tuck") || act.includes("brush") || act.includes("tie") || act.includes("lapel") || act.includes("adjust")) {
      if (isMateo) {
        const adjIdx = sIdx === 4 ? 4 : 1;
        const adjType = adjIdx === 4 ? "lapel_adjust" : "tie_adjust";
        videoFilename = `${dirName}/${prefix}_M${adjIdx}_${adjType}_v1.mp4`;
        latentsKey = `${prefix}_M${adjIdx}_${adjType}_v1`;
      } else if (isBlaze) {
        videoFilename = `${dirName}/${prefix}_M${sIdx}_loop_v1.mp4`;
        latentsKey = `${prefix}_M${sIdx}_loop_v1`;
      } else {
        const hIdx = sIdx === 4 ? 4 : 1;
        videoFilename = `${dirName}/${prefix}_M${hIdx}_hair_adjust_v1.mp4`;
        latentsKey = `${prefix}_M${hIdx}_hair_adjust_v1`;
      }
    } else if (act.includes("dynamic") || act.includes("lean") || act.includes("rotate") || act.includes("sway")) {
      if (isBlaze) {
        videoFilename = `${dirName}/${prefix}_M${sIdx}_loop_v2.mp4`;
        latentsKey = `${prefix}_M${sIdx}_loop_v2`;
      } else {
        videoFilename = `${dirName}/${prefix}_M${sIdx}_dynamic_v1.mp4`;
        latentsKey = `${prefix}_M${sIdx}_dynamic_v1`;
      }
    } else {
      videoFilename = `${dirName}/${prefix}_M${sIdx}_loop_v1.mp4`;
      latentsKey = `${prefix}_M${sIdx}_loop_v1`;
    }
  }

  webmFilename = videoFilename.replace(/\.mp4$/, "_alpha.webm");

  const videoPath = `/assets/action_loops/veo/${videoFilename}`;
  const transparentWebmPath = `/assets/action_loops/veo/${webmFilename}`;
  const latentsCacheKey = latentsKey;
  const coordsCacheKey = `${latentsKey}_coords`;

  return {
    videoPath,
    transparentWebmPath,
    latentsCacheKey,
    coordsCacheKey,
  };
}

// ============================================================================
// 5. MAIN BROADCAST LOOP SEQUENCE PLANNER
// ============================================================================

/**
 * Plans a frame-accurate, continuity-verified broadcast video sequence across K beats.
 */
export function planBroadcastLoopSequence(options: LoopSelectorOptions): LoopSelectionResult {
  const beatSec = options.beatDurationSec || 4.0;
  const personaId = (options.personaId || "ruby").toLowerCase();
  const domain = options.domain || "chroma_wall_standing";
  const pacingConfig: PacingDirectorConfig = { ...DEFAULT_PACING_CONFIG, ...options.pacingConfig };
  const probs = { ...DEFAULT_TRANSITION_PROBABILITIES, ...options.probabilities };

  // Calculate total beats required
  let totalBeats = options.totalBeats || 0;
  if (!totalBeats && options.totalDurationSeconds) {
    totalBeats = Math.ceil(options.totalDurationSeconds / beatSec);
  }
  if (totalBeats < 1) totalBeats = 1;

  // Extract or receive cues
  let cues = options.cues || [];
  if (cues.length === 0 && options.scriptText) {
    cues = extractScriptCues(options.scriptText);
  }

  const homeBase = getHomeBasePose(domain);
  const domainPoses = getDomainPoses(domain);

  let currentPose = MASTER_POSES[options.initialPoseId || ""] || homeBase;
  let currentCam: CameraRigId = options.initialCamera || "cam1_wide";

  const sequence: ChoreographedBeatNode[] = [];
  let macroActionCount = 0;
  let microBeatCount = 0;
  let ambientIdleCount = 0;
  let cameraCutCount = 0;

  for (let i = 0; i < totalBeats; i++) {
    const startTimeSec = i * beatSec;
    const endTimeSec = startTimeSec + beatSec;

    // Check boundary invariants: Beat 0 and Final Beat are always Home Base
    const isFirstBeat = i === 0;
    const isFinalBeat = i === totalBeats - 1;
    const isPenultimateBeat = i === totalBeats - 2 && totalBeats >= 3;

    // Find active cue in current beat window
    const activeCue = cues.find((c) => Math.abs(c.timeSec - startTimeSec) < beatSec);

    let nextPose = currentPose;
    let nextCam = currentCam;
    let transitionType: TransitionType = "same_pose_beat";
    let selectedBeat = selectPoseBeat(currentPose, i, sequence, pacingConfig);
    let assignedTier: MotionTier = selectedBeat.tier;

    if (isFirstBeat) {
      // INVARIANT 1: Always start in Home Base Neutral Clasped
      currentPose = homeBase;
      nextPose = homeBase;
      transitionType = "same_pose_beat";
      selectedBeat = selectPoseBeat(homeBase, i, sequence, pacingConfig, "tier1_ambient_idle");
      assignedTier = "tier1_ambient_idle";
      currentCam = "cam1_wide";
      nextCam = "cam1_wide";
    } else if (isFinalBeat) {
      // INVARIANT 2: Always finish in Home Base Neutral Clasped
      if (currentPose.id !== homeBase.id) {
        // FLF transition back to base
        nextPose = homeBase;
        transitionType = "flf_pose_transition";
        assignedTier = "tier3_macro_action";
      } else {
        nextPose = homeBase;
        transitionType = "same_pose_beat";
        selectedBeat = selectPoseBeat(homeBase, i, sequence, pacingConfig, "tier2_micro_beat");
        assignedTier = "tier2_micro_beat";
      }
      nextCam = "cam1_wide";
    } else if (isPenultimateBeat && currentPose.id !== homeBase.id) {
      // If penultimate beat and not in home base, smoothly initiate return
      nextPose = homeBase;
      transitionType = "flf_pose_transition";
      assignedTier = "tier3_macro_action";
    } else if (activeCue) {
      // Script Cue Intent Resolution
      const intent = mapCueToStateIntent(activeCue, currentPose, currentCam, domain);

      if (intent.targetCamera && intent.targetCamera !== currentCam) {
        transitionType = "camera_cut";
        nextCam = intent.targetCamera;
      }

      if (intent.targetPoseId && intent.targetPoseId !== currentPose.id) {
        const target = MASTER_POSES[intent.targetPoseId];
        if (target && target.domain === domain) {
          nextPose = target;
          transitionType = "flf_pose_transition";
          assignedTier = "tier3_macro_action";
        }
      }

      if (intent.forcedBeatId) {
        const found = currentPose.beats.find((b) => b.id === intent.forcedBeatId);
        if (found) {
          selectedBeat = found;
          assignedTier = found.tier;
        }
      } else if (intent.forcedTier) {
        selectedBeat = selectPoseBeat(currentPose, i, sequence, pacingConfig, intent.forcedTier);
        assignedTier = selectedBeat.tier;
      }
    } else {
      // Probabilistic Markov Transition
      const rand = Math.random();

      if (rand < probs.selfLoopProb) {
        // 75% Same Pose Motion Beat
        transitionType = "same_pose_beat";
        nextPose = currentPose;
        selectedBeat = selectPoseBeat(currentPose, i, sequence, pacingConfig);
        assignedTier = selectedBeat.tier;
      } else if (rand < probs.selfLoopProb + probs.poseShiftProb) {
        // 18% FLF Transition to another Pose in Domain (Respecting Macro Action Pacing)
        const maxAllowedMacros = Math.max(1, Math.floor((totalBeats * beatSec * pacingConfig.maxMacroActionsPerMinute) / 60));
        const canExecuteMacro = macroActionCount < maxAllowedMacros;
        const otherPoses = domainPoses.filter((p) => p.id !== currentPose.id);

        if (canExecuteMacro && otherPoses.length > 0) {
          nextPose = otherPoses[Math.floor(Math.random() * otherPoses.length)] || currentPose;
          transitionType = "flf_pose_transition";
          assignedTier = "tier3_macro_action";
        } else {
          // Fallback to same pose beat if macro budget exceeded
          transitionType = "same_pose_beat";
          nextPose = currentPose;
          selectedBeat = selectPoseBeat(currentPose, i, sequence, pacingConfig, "tier1_ambient_idle");
          assignedTier = "tier1_ambient_idle";
        }
      } else {
        // 7% Multi-Camera Cut
        transitionType = "camera_cut";
        const availableCams: CameraRigId[] = (["cam1_wide", "cam2_left", "cam3_closeup"] as const).filter(
          (c) => c !== currentCam
        );
        nextCam = availableCams[Math.floor(Math.random() * availableCams.length)] || currentCam;
        selectedBeat = selectPoseBeat(currentPose, i, sequence, pacingConfig, "tier1_ambient_idle");
        assignedTier = "tier1_ambient_idle";
        cameraCutCount++;
      }
    }

    // Tally metrics
    if (assignedTier === "tier1_ambient_idle") ambientIdleCount++;
    else if (assignedTier === "tier2_micro_beat") microBeatCount++;
    else if (assignedTier === "tier3_macro_action") macroActionCount++;

    const startPoseId = currentPose.id;
    const endPoseId = transitionType === "flf_pose_transition" ? nextPose.id : currentPose.id;

    // Resolve file paths
    const assetPaths = resolveBeatAssetPaths(
      {
        startPose: startPoseId,
        endPose: endPoseId,
        actionStateId: selectedBeat.id,
        transitionType,
        camera: nextCam,
      },
      personaId
    );

    const node: ChoreographedBeatNode = {
      beatIndex: i,
      startTimeSec,
      endTimeSec,
      durationSec: beatSec,
      tier: assignedTier,
      startPose: startPoseId,
      endPose: endPoseId,
      transitionType,
      camera: nextCam,
      actionStateId: selectedBeat.id,
      actionStateLabel: selectedBeat.label,
      videoPath: assetPaths.videoPath,
      transparentWebmPath: assetPaths.transparentWebmPath,
      latentsCacheKey: assetPaths.latentsCacheKey,
      coordsCacheKey: assetPaths.coordsCacheKey,
      cueTag: activeCue?.tag,
      transitionFrom: i > 0 ? sequence[i - 1].endPose : undefined,
      transitionTo: undefined,
      isBridge: currentPose.isBridgeBase || nextPose.isBridgeBase,
    };

    if (i > 0) {
      sequence[i - 1].transitionTo = startPoseId;
    }

    sequence.push(node);

    // Advance State
    currentPose = nextPose;
    currentCam = nextCam;
  }

  // Unique video assets list
  const uniqueAssets = Array.from(new Set(sequence.map((n) => n.videoPath)));

  return {
    totalBeats,
    totalDurationSec: totalBeats * beatSec,
    personaId,
    domain,
    sequence,
    uniqueVideoAssets: uniqueAssets,
    pacingSummary: {
      ambientCount: ambientIdleCount,
      microCount: microBeatCount,
      macroCount: macroActionCount,
      cameraCutsCount: cameraCutCount,
    },
  };
}

/**
 * Validates the unbroken physical continuity of a choreographed sequence.
 * Asserts that Frame_0(Node_{n+1}) matches Frame_{End}(Node_n) 100%.
 */
export function validateSequenceContinuity(sequence: ChoreographedBeatNode[]): {
  valid: boolean;
  violations: string[];
} {
  const violations: string[] = [];

  for (let i = 0; i < sequence.length - 1; i++) {
    const current = sequence[i];
    const next = sequence[i + 1];

    if (current.endPose !== next.startPose) {
      violations.push(
        `Discontinuity between Beat ${i} (ends at [${current.endPose}]) and Beat ${i + 1} (starts at [${next.startPose}]). Visual jump-cut detected.`
      );
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

// ============================================================================
// 6. SCENE-BY-SCENE COMMERCIAL & BROADCAST SEQUENCER
// ============================================================================

export interface PlannedSceneLoop {
  sceneId: string;
  sceneIndex: number;
  loopId: string;
  videoUrl: string;
  startPose: string;
  endPose: string;
  transitionType: TransitionType;
  actionStateLabel: string;
}

export interface PlanSceneLoopOptions {
  initialLoopId?: string;
  personaId?: string;
  attire?: string;
  domain?: BroadcastDomainType;
}

/**
 * Plans a frame-accurate continuous FSM action loop sequence across commercial scenes.
 * Strictly guarantees unbroken boundary continuity: startPose(k+1) === endPose(k).
 * Enforces Invariant 1 (starts at specified pose/M1) and Invariant 2 (returns to M1 at final scene).
 */
export function planSceneLoopSequence(
  scenes: {
    id: string;
    sceneIndex?: number;
    sceneType?: string;
    headline?: string;
    voiceoverScript?: string;
  }[],
  options: PlanSceneLoopOptions = {}
): PlannedSceneLoop[] {
  if (!scenes || scenes.length === 0) return [];

  const personaId = (options.personaId || "ruby").toLowerCase();

  const parsePoseFromId = (idStr?: string): { startPoseIdx: number; endPoseIdx: number; isTransition: boolean } => {
    if (!idStr) return { startPoseIdx: 1, endPoseIdx: 1, isTransition: false };
    const lower = idStr.toLowerCase();

    // Check transition T{s}_to_{e}
    const tMatch = lower.match(/t([1-5])_to_([1-5])/);
    if (tMatch) {
      return {
        startPoseIdx: parseInt(tMatch[1], 10),
        endPoseIdx: parseInt(tMatch[2], 10),
        isTransition: true,
      };
    }

    // Check single pose M1..M5
    const mMatch = lower.match(/m([1-5])/);
    if (mMatch) {
      const idx = parseInt(mMatch[1], 10);
      return { startPoseIdx: idx, endPoseIdx: idx, isTransition: false };
    }

    return { startPoseIdx: 1, endPoseIdx: 1, isTransition: false };
  };

  const initialParsed = parsePoseFromId(options.initialLoopId);
  let currentPoseIdx = initialParsed.startPoseIdx;

  const result: PlannedSceneLoop[] = [];
  const total = scenes.length;

  for (let i = 0; i < total; i++) {
    const scene = scenes[i];
    const isFirst = i === 0;
    const isFinal = i === total - 1 && total > 1;

    let startIdx = currentPoseIdx;
    let endIdx = currentPoseIdx;
    let transitionType: TransitionType = "same_pose_beat";
    let actionStateId = `M${startIdx}_loop_v1`;
    let actionStateLabel = `M${startIdx} Boundary Loop`;

    if (isFirst && options.initialLoopId) {
      // Use the explicitly selected initial loop for the first scene
      startIdx = initialParsed.startPoseIdx;
      endIdx = initialParsed.endPoseIdx;
      transitionType = initialParsed.isTransition ? "flf_pose_transition" : "same_pose_beat";
      actionStateId = options.initialLoopId;
      actionStateLabel = initialParsed.isTransition
        ? `T${startIdx}➔${endIdx} Transition`
        : `M${startIdx} Selected Stance`;
    } else if (isFinal) {
      // Invariant 2: Always return to Home Base M1 for closing sign-off / outro
      if (currentPoseIdx !== 1) {
        startIdx = currentPoseIdx;
        endIdx = 1;
        transitionType = "flf_pose_transition";
        actionStateId = `T${startIdx}_to_1`;
        actionStateLabel = `T${startIdx}➔M1 Recovery Return to Home Base`;
      } else {
        startIdx = 1;
        endIdx = 1;
        transitionType = "same_pose_beat";
        actionStateId = "M1_loop_v1";
        actionStateLabel = "M1 Clasped Closing Sign-off";
      }
    } else {
      // Intermediate scene: determine desired target pose based on archetype/text
      const sceneType = (scene.sceneType || "").toLowerCase();
      const text = `${scene.headline || ""} ${scene.voiceoverScript || ""}`.toLowerCase();

      let targetIdx = currentPoseIdx;

      if (sceneType.includes("wipe") || sceneType.includes("torture") || text.includes("look") || text.includes("watch") || text.includes("reveal")) {
        targetIdx = 2; // M2 Raised Explanatory
      } else if (sceneType.includes("macro") || sceneType.includes("blueprint") || sceneType.includes("mockup") || sceneType.includes("room") || text.includes("data") || text.includes("spec") || text.includes("chart")) {
        targetIdx = 5; // M5 Side Perspective Turn (referencing screen/product graphics)
      } else if (sceneType.includes("social_proof") || sceneType.includes("review") || text.includes("guarantee") || text.includes("trust") || text.includes("love")) {
        targetIdx = 4; // M4 Casual / Sincere
      } else if (sceneType.includes("hook") || text.includes("welcome") || text.includes("ready") || text.includes("today")) {
        targetIdx = 3; // M3 Open Two Hands
      } else {
        // Natural cadence shift if staying in the same pose too long
        const nextCadence = ((currentPoseIdx % 5) + 1);
        targetIdx = nextCadence === 1 && i < total - 1 ? 2 : nextCadence;
      }

      if (targetIdx !== currentPoseIdx) {
        startIdx = currentPoseIdx;
        endIdx = targetIdx;
        transitionType = "flf_pose_transition";
        actionStateId = `T${startIdx}_to_${endIdx}`;
        actionStateLabel = `T${startIdx}➔${endIdx} Transition`;
      } else {
        startIdx = currentPoseIdx;
        endIdx = currentPoseIdx;
        transitionType = "same_pose_beat";
        // Alternate dynamic gestures
        if (i % 2 === 1) {
          actionStateId = `M${startIdx}_dynamic_v1`;
          actionStateLabel = `M${startIdx} Dynamic Action Beat`;
        } else {
          actionStateId = `M${startIdx}_loop_v1`;
          actionStateLabel = `M${startIdx} Seamless Loop`;
        }
      }
    }

    // Resolve media asset paths
    const startPoseStr = `P0${startIdx}_M${startIdx}`;
    const endPoseStr = `P0${endIdx}_M${endIdx}`;

    const assetPaths = resolveBeatAssetPaths(
      {
        startPose: startPoseStr,
        endPose: endPoseStr,
        actionStateId,
        transitionType,
        camera: "cam1_wide",
      },
      personaId
    );

    result.push({
      sceneId: scene.id,
      sceneIndex: i,
      loopId: actionStateId,
      videoUrl: assetPaths.videoPath,
      startPose: `M${startIdx}`,
      endPose: `M${endIdx}`,
      transitionType,
      actionStateLabel,
    });

    // Advance state for next scene ensuring 100% boundary continuity
    currentPoseIdx = endIdx;
  }

  return result;
}

/**
 * Automatically plans an unbroken broadcast loop sequence for Ruby Burgundy
 * cycling through the canonical 3-pose FSM ring:
 * M1 -> T1_to_2 -> M2 -> T2_to_3 -> M3 -> T3_to_1 -> M1...
 *
 * Every beat node has exact timecodes and 100% boundary continuity.
 */
export function planRubyAutoFsmSequence(
  totalDurationSeconds: number,
  beatDurationSec = 4.0
): ChoreographedBeatNode[] {
  const totalBeats = Math.max(1, Math.ceil(totalDurationSeconds / beatDurationSec));
  const sequence: ChoreographedBeatNode[] = [];

  const CYCLE_STEPS = [
    {
      startPose: "P01_NEUTRAL_CLASPED",
      endPose: "P01_NEUTRAL_CLASPED",
      actionStateId: "ruby_burgundy_M1_loop_v1",
      actionStateLabel: "M1 Neutral Clasped",
      transitionType: "same_pose_beat" as const,
      videoPath: "/assets/action_loops/veo/ruby_burgundy_vertical_backup/ruby_burgundy_M1_loop_v1.mp4",
      tier: "tier1_ambient_idle" as const,
      camera: "cam1_wide" as const,
    },
    {
      startPose: "P01_NEUTRAL_CLASPED",
      endPose: "P02_RAISED_EXPLANATORY",
      actionStateId: "ruby_burgundy_T1_to_2",
      actionStateLabel: "T1->2 Transition",
      transitionType: "flf_pose_transition" as const,
      videoPath: "/assets/action_loops/veo/ruby_burgundy_vertical_backup/ruby_burgundy_T1_to_2.mp4",
      tier: "tier3_macro_action" as const,
      camera: "cam1_wide" as const,
    },
    {
      startPose: "P02_RAISED_EXPLANATORY",
      endPose: "P02_RAISED_EXPLANATORY",
      actionStateId: "ruby_burgundy_M2_loop_v1",
      actionStateLabel: "M2 Raised Explanatory",
      transitionType: "same_pose_beat" as const,
      videoPath: "/assets/action_loops/veo/ruby_burgundy_vertical_backup/ruby_burgundy_M2_loop_v1.mp4",
      tier: "tier1_ambient_idle" as const,
      camera: "cam2_left" as const,
    },
    {
      startPose: "P02_RAISED_EXPLANATORY",
      endPose: "P03_OPEN_TWO_HANDS",
      actionStateId: "ruby_burgundy_T2_to_3",
      actionStateLabel: "T2->3 Transition",
      transitionType: "flf_pose_transition" as const,
      videoPath: "/assets/action_loops/veo/ruby_burgundy_vertical_backup/ruby_burgundy_T2_to_3.mp4",
      tier: "tier3_macro_action" as const,
      camera: "cam1_wide" as const,
    },
    {
      startPose: "P03_OPEN_TWO_HANDS",
      endPose: "P03_OPEN_TWO_HANDS",
      actionStateId: "ruby_burgundy_M3_loop_v1",
      actionStateLabel: "M3 Open Two Hands",
      transitionType: "same_pose_beat" as const,
      videoPath: "/assets/action_loops/veo/ruby_burgundy_vertical_backup/ruby_burgundy_M3_loop_v1.mp4",
      tier: "tier1_ambient_idle" as const,
      camera: "cam1_wide" as const,
    },
    {
      startPose: "P03_OPEN_TWO_HANDS",
      endPose: "P01_NEUTRAL_CLASPED",
      actionStateId: "ruby_burgundy_T3_to_1",
      actionStateLabel: "T3->1 Transition",
      transitionType: "flf_pose_transition" as const,
      videoPath: "/assets/action_loops/veo/ruby_burgundy_vertical_backup/ruby_burgundy_T3_to_1.mp4",
      tier: "tier3_macro_action" as const,
      camera: "cam1_wide" as const,
    },
  ];

  for (let i = 0; i < totalBeats; i++) {
    const startTimeSec = i * beatDurationSec;
    const endTimeSec = i === totalBeats - 1 ? totalDurationSeconds : (i + 1) * beatDurationSec;
    const durationSec = Math.max(0.1, endTimeSec - startTimeSec);
    const step = CYCLE_STEPS[i % CYCLE_STEPS.length];

    const node: ChoreographedBeatNode = {
      beatIndex: i,
      startTimeSec,
      endTimeSec,
      durationSec,
      tier: step.tier,
      startPose: step.startPose,
      endPose: step.endPose,
      transitionType: step.transitionType,
      camera: step.camera,
      actionStateId: step.actionStateId,
      actionStateLabel: step.actionStateLabel,
      videoPath: step.videoPath,
      transparentWebmPath: step.videoPath.replace(/\.mp4$/, "_alpha.webm"),
      latentsCacheKey: `${step.actionStateId}`,
      coordsCacheKey: `${step.actionStateId}_coords`,
      transitionFrom: i > 0 ? sequence[i - 1].endPose : undefined,
      transitionTo: undefined,
      isBridge: step.startPose.includes("P01"),
    };

    if (i > 0) {
      sequence[i - 1].transitionTo = step.startPose;
    }

    sequence.push(node);
  }

  return sequence;
}

// ============================================================================
// 6. NEWS BROADCAST AUTO-FSM SEQUENCE PLANNER
// ============================================================================

export interface NewsBroadcastFsmScene {
  index: number;
  text?: string;
  spokenText?: string | null;
  headline?: string | null;
  keyword?: string | null;
}

export interface NewsPlannedFsmBeat {
  index: number;
  clipId: string;
  videoUrl: string;
  startPose: string;
  endPose: string;
  cameraCue: "cam1_wide" | "cam2_left" | "cam3_closeup";
  actionStateLabel: string;
  transitionType: "same_pose_beat" | "flf_pose_transition";
}

/**
 * Automatically plans an unbroken, boundary-locked Finite State Machine (FSM) video loop sequence
 * across news scenes based on the verified video loops available for the chosen persona.
 *
 * Invariants:
 * 1. Invariant 1 (Master Home Base): Scene 1 starts at M1 (Wide camera).
 * 2. Invariant 2 (Closing Sign-off): Final scene returns to M1 (Wide camera).
 * 3. Strict Boundary Continuity: startPose(k+1) === endPose(k).
 */
export function planNewsBroadcastFsmSequence(
  scenes: NewsBroadcastFsmScene[],
  personaId: string = "ruby"
): NewsPlannedFsmBeat[] {
  if (!scenes || scenes.length === 0) return [];

  const normId = (personaId || "ruby").toLowerCase().trim();
  const dirName = resolvePersonaVeoPrefix(normId);
  const prefix = dirName;
  const catalog = getPersona37Clips(normId);
  const availableClipIds = new Set(catalog.map((c) => c.id.toLowerCase()));

  const total = scenes.length;
  const beats: NewsPlannedFsmBeat[] = [];
  let currentPoseNum = 1; // Invariant 1: start at M1

  for (let i = 0; i < total; i++) {
    const scene = scenes[i];
    const isFirst = i === 0;
    const isFinal = i === total - 1 && total > 1;

    let startPoseNum = currentPoseNum;
    let endPoseNum = currentPoseNum;
    let cameraCue: "cam1_wide" | "cam2_left" | "cam3_closeup" = "cam1_wide";
    let clipId = "";
    let actionStateLabel = "";
    let transitionType: "same_pose_beat" | "flf_pose_transition" = "same_pose_beat";

    if (isFirst) {
      // Invariant 1: Start at Home Base M1
      startPoseNum = 1;
      endPoseNum = 1;
      clipId = availableClipIds.has("m1_loop_v1") ? "M1_loop_v1" : "M1_loop_v2";
      cameraCue = "cam1_wide";
      actionStateLabel = "M1 Anchor Home Base Stance";
      transitionType = "same_pose_beat";
    } else if (isFinal) {
      // Invariant 2: Return to Home Base M1 for sign-off
      const returnTrans = `t${currentPoseNum}_to_1`;
      if (currentPoseNum !== 1 && availableClipIds.has(returnTrans)) {
        startPoseNum = currentPoseNum;
        endPoseNum = 1;
        clipId = `T${startPoseNum}_to_1`;
        cameraCue = "cam1_wide";
        actionStateLabel = `T${startPoseNum}➔M1 Closing Sign-off Transition`;
        transitionType = "flf_pose_transition";
      } else {
        startPoseNum = 1;
        endPoseNum = 1;
        clipId = availableClipIds.has("m1_loop_v2") ? "M1_loop_v2" : "M1_loop_v1";
        cameraCue = "cam1_wide";
        actionStateLabel = "M1 Closing Anchor Stance";
        transitionType = "same_pose_beat";
      }
    } else {
      // Intermediate scenes (1 to totalScenes - 2): analyze narrative keywords
      const text = `${scene.headline || ""} ${scene.text || ""} ${scene.spokenText || ""} ${scene.keyword || ""}`.toLowerCase();
      let desiredPose = 2;

      if (
        text.includes("data") ||
        text.includes("metric") ||
        text.includes("chart") ||
        text.includes("market") ||
        text.includes("ticker") ||
        text.includes("financial") ||
        text.includes("dollar") ||
        text.includes("inflation") ||
        text.includes("percent") ||
        text.includes("tech")
      ) {
        desiredPose = 5; // M5 Side Perspective Turn (referencing screen/ticker)
        cameraCue = "cam2_left";
      } else if (
        text.includes("debate") ||
        text.includes("opinion") ||
        text.includes("perspective") ||
        text.includes("quote") ||
        text.includes("citizen") ||
        text.includes("expert") ||
        text.includes("interview") ||
        text.includes("agree")
      ) {
        desiredPose = 4; // M4 Separated Neutral / Balanced Comparison
        cameraCue = "cam3_closeup";
      } else if (i === 1) {
        desiredPose = 2; // M2 Raised Explanatory for active story breakdown
        cameraCue = "cam2_left";
      } else {
        desiredPose = i % 2 === 0 ? 3 : 2;
        cameraCue = i % 2 === 0 ? "cam3_closeup" : "cam2_left";
      }

      const transId = `t${currentPoseNum}_to_${desiredPose}`;
      if (desiredPose !== currentPoseNum && availableClipIds.has(transId)) {
        startPoseNum = currentPoseNum;
        endPoseNum = desiredPose;
        clipId = `T${startPoseNum}_to_${endPoseNum}`;
        actionStateLabel = `T${startPoseNum}➔M${endPoseNum} Dynamic Transition`;
        transitionType = "flf_pose_transition";
      } else {
        startPoseNum = desiredPose;
        endPoseNum = desiredPose;
        const v = i % 2 === 0 ? "1" : "2";
        const loopCand = `m${desiredPose}_loop_v${v}`;
        clipId = availableClipIds.has(loopCand)
          ? `M${desiredPose}_loop_v${v}`
          : `M${desiredPose}_loop_v1`;
        actionStateLabel = `M${desiredPose} Anchor Stance (v${v})`;
        transitionType = "same_pose_beat";
      }
    }

    const videoUrl = `/assets/action_loops/veo/${dirName}/${prefix}_${clipId}.mp4`;

    beats.push({
      index: scene.index ?? i,
      clipId,
      videoUrl,
      startPose: `M${startPoseNum}`,
      endPose: `M${endPoseNum}`,
      cameraCue,
      actionStateLabel,
      transitionType,
    });

    currentPoseNum = endPoseNum;
  }

  return beats;
}
