/**
 * src/lib/types/stateMachine.ts
 *
 * Shared type definitions for the Anchor State Machine Video Orchestrator.
 */

/** The canonical set of anchor camera/framing states. */
export type AnchorStateId =
  | 'standing_wide'
  | 'seated_desk'
  | 'face_closeup';

/** Names for directed transition edges between states. */
export type AnchorTransitionId =
  | 'standing_wide_to_seated_desk'
  | 'seated_desk_to_face_closeup'
  | 'face_closeup_to_standing_wide'
  | 'seated_desk_to_standing_wide'
  | 'standing_wide_to_face_closeup'
  | 'face_closeup_to_seated_desk';

export function buildTransitionId(from: AnchorStateId, to: AnchorStateId): AnchorTransitionId {
  return `${from}_to_${to}` as AnchorTransitionId;
}

/** Describes a single canonical anchor state. */
export interface AnchorState {
  id: AnchorStateId;
  label: string;
  /** Glob pattern for master keyframe images matching this state. */
  keyframePattern: string;
  /** Short description of the camera framing. */
  description: string;
  /** Whether this state needs desk-aware (horizon-preserving) alpha matting. */
  deskAware: boolean;
}

export const ANCHOR_STATES: AnchorState[] = [
  {
    id: 'standing_wide',
    label: 'Standing Wide',
    keyframePattern: '*_standing_*',
    description: 'Full body or waist-up, standing in open studio space.',
    deskAware: false,
  },
  {
    id: 'seated_desk',
    label: 'Seated Desk',
    keyframePattern: '*_seated_*desk*',
    description: 'Anchor seated behind glass news desk with props.',
    deskAware: true,
  },
  {
    id: 'face_closeup',
    label: 'Face Close-Up',
    keyframePattern: '*_closeup_*',
    description: 'Tight face and shoulders close-up shot.',
    deskAware: false,
  },
];

/** A transition clip descriptor. */
export interface AnchorTransition {
  id: AnchorTransitionId;
  fromState: AnchorStateId;
  toState: AnchorStateId;
  /** Cinematic prompt for the motion between states. */
  transitionPrompt: string;
  /** Duration in frames (Wan default = 25 frames @ 25fps = 1.0s). */
  durationFrames: number;
  /** Path to the generated WebM on disk (if already generated). */
  webmPath?: string;
}

export const ANCHOR_TRANSITIONS: Omit<AnchorTransition, 'webmPath'>[] = [
  {
    id: 'standing_wide_to_seated_desk',
    fromState: 'standing_wide',
    toState: 'seated_desk',
    transitionPrompt: 'news anchor smoothly walks toward desk and sits down, cinematic studio camera push-in, broadcast lighting, seamless motion, 8k',
    durationFrames: 25,
  },
  {
    id: 'seated_desk_to_standing_wide',
    fromState: 'seated_desk',
    toState: 'standing_wide',
    transitionPrompt: 'news anchor stands up from desk and steps forward, cinematic camera crane pull-back wide, broadcast lighting, seamless motion, 8k',
    durationFrames: 25,
  },
  {
    id: 'seated_desk_to_face_closeup',
    fromState: 'seated_desk',
    toState: 'face_closeup',
    transitionPrompt: 'cinematic smooth camera dolly punch-in zoom to anchor face close-up, broadcast studio, dramatic tightening, 8k',
    durationFrames: 25,
  },
  {
    id: 'face_closeup_to_seated_desk',
    fromState: 'face_closeup',
    toState: 'seated_desk',
    transitionPrompt: 'cinematic smooth camera pull-back from close-up to full desk shot, broadcast studio, 8k',
    durationFrames: 25,
  },
  {
    id: 'face_closeup_to_standing_wide',
    fromState: 'face_closeup',
    toState: 'standing_wide',
    transitionPrompt: 'cinematic camera crane pull-back wide from close-up to full standing shot, broadcast studio, 8k',
    durationFrames: 25,
  },
  {
    id: 'standing_wide_to_face_closeup',
    fromState: 'standing_wide',
    toState: 'face_closeup',
    transitionPrompt: 'cinematic dolly push-in from wide standing to dramatic face close-up, broadcast studio, 8k',
    durationFrames: 25,
  },
];

/**
 * A single node in the runtime state graph used by the Remotion sequencer.
 * Each entry describes what clip to play and for how long (in Remotion frames at 30fps).
 */
export type StateMachineClipType = 'state_loop' | 'transition';

export interface StateMachineClip {
  type: StateMachineClipType;
  /** Storage key or local path of the .webm clip to play. */
  src: string;
  /** Duration in Remotion frames (30fps). */
  durationFrames: number;
  /** The anchor state active during this clip. */
  stateId: AnchorStateId;
  /** Optional transition ID if type is 'transition'. */
  transitionId?: AnchorTransitionId;
  /** Whether to loop this clip (only for state_loop type). */
  loop?: boolean;
}

/**
 * Per-segment director directive. Placed on RemotionSegment to tell the
 * StateMachinePresenterLayer which state the anchor should be in.
 */
export interface AnchorDirective {
  targetState: AnchorStateId;
  /** Optional specific action loop override (e.g. 'state_gesture_right'). */
  actionLoop?: string;
  /** Optional camera cue override (e.g. 'cam1_wide', 'cam2_left', 'cam3_closeup'). */
  cameraCue?: CameraCue;
}

// ============================================================
// 2D Emotion x Rhetorical Action Taxonomy (Director Engine)
// ============================================================

export type AnchorEmotion =
  | "neutral_composed"
  | "enthusiastic_upbeat"
  | "grave_solemn"
  | "analytical_scrutiny"
  | "empathetic_heartfelt";

export type RhetoricAction =
  | "little_movement"
  | "explaining"
  | "emphasizing"
  | "comparing"
  | "welcoming"
  | "presenting_graphic"
  | "forward_lean"
  | "side_turn";

export type EnergyLevel = "low" | "medium" | "high";

export type DirectorMode = "semantic" | "markov" | "hybrid";

export type MasterPoseKey = "M1" | "M2" | "M3" | "M4" | "M5";

export interface ActionLoopMetadata {
  id: string;
  poseState: MasterPoseKey;
  emotion: AnchorEmotion;
  rhetoricAction: RhetoricAction;
  energyLevel: EnergyLevel;
  description: string;
}

// ============================================================
// 10-Gesture Action Loop Matrix (Full-Mesh FSM)
// ============================================================

export type ActionStateId =
  | "state_idle"
  | "state_explaining"
  | "state_gesture_left"
  | "state_pointing_screen"
  | "state_intro_welcome"
  | "state_emphasis_nod"
  | "state_listen_tilt"
  | "state_chest_sincerity"
  | "state_balancing_comparison"
  | "state_breaking_alert"
  | "state_signoff_outro"
  | "state_dynamic_sweep"
  | "state_look_down_notes"
  | "state_gesture_right"
  | "state_deep_thought_analyst";

export interface ActionGestureOption {
  id: ActionStateId;
  label: string;
  icon: string;
  desc: string;
  category: "Core Base" | "Active Speech" | "Presentation" | "Editorial" | "Heartfelt" | "Breaking News" | "Closing";
  emotion?: AnchorEmotion;
  rhetoricAction?: RhetoricAction;
}

export const ACTION_MATRIX_GESTURES: ActionGestureOption[] = [
  {
    id: "state_idle",
    label: "Idle / Resting Home Base",
    icon: "🧘",
    desc: "Natural breathing rhythm, soft smile, natural blinking at waist clasp",
    category: "Core Base",
  },
  {
    id: "state_explaining",
    label: "Active Explaining",
    icon: "🗣️",
    desc: "Right-hand open-palm explanatory articulation at mid-chest",
    category: "Active Speech",
  },
  {
    id: "state_gesture_left",
    label: "Gesture Left",
    icon: "👈",
    desc: "Left-hand explanatory sweep, natural head tracking",
    category: "Presentation",
  },
  {
    id: "state_pointing_screen",
    label: "Pointing to Screen / Chart",
    icon: "📊",
    desc: "Body and gaze turned 20° toward side screen graphics",
    category: "Presentation",
  },
  {
    id: "state_intro_welcome",
    label: "Intro Welcome / Open Palms",
    icon: "👐",
    desc: "Both hands open outward in welcoming presentation overview",
    category: "Presentation",
  },
  {
    id: "state_emphasis_nod",
    label: "Confident Emphasis Nod",
    icon: "👍",
    desc: "Firm affirmative head nod with engaged direct eye contact",
    category: "Editorial",
  },
  {
    id: "state_listen_tilt",
    label: "Analytical Head Tilt",
    icon: "🤔",
    desc: "10° intelligent listening tilt and focused glance",
    category: "Editorial",
  },
  {
    id: "state_chest_sincerity",
    label: "Chest Sincerity / Heartfelt",
    icon: "❤️",
    desc: "Hand touches upper chest for empathetic delivery",
    category: "Heartfelt",
  },
  {
    id: "state_balancing_comparison",
    label: "Balancing Comparison",
    icon: "⚖️",
    desc: "Two hands alternate weighing multiple perspectives",
    category: "Editorial",
  },
  {
    id: "state_breaking_alert",
    label: "Breaking News Alert",
    icon: "🚨",
    desc: "Authoritative locked eye contact, high-impact focus",
    category: "Breaking News",
  },
  {
    id: "state_signoff_outro",
    label: "Sign-Off / Warm Smile",
    icon: "✨",
    desc: "Genuine warm closed-lip smile with gracious parting nod",
    category: "Closing",
  },
  {
    id: "state_dynamic_sweep",
    label: "Dynamic Arc Sweep",
    icon: "🌊",
    desc: "Confident torso arc sweep for topic transitions",
    category: "Presentation",
  },
];

// ============================================================
// 3-Camera Broadcast Studio Array Cues
// ============================================================

export type CameraCue = "cam1_wide" | "cam2_left" | "cam3_closeup";

export interface CameraCueOption {
  id: CameraCue;
  name: string;
  angle: string;
  lens: string;
  icon: string;
  desc: string;
  role: string;
  transforms: {
    scale: number;
    translateX: number;
    translateY: number;
    rotationY: number;
  };
}

export const CAMERA_CUES: CameraCueOption[] = [
  {
    id: "cam1_wide",
    name: "Camera 1 (Master Center Wide)",
    angle: "0° Dead Center",
    lens: "35mm Wide",
    icon: "🎥",
    desc: "Mid-thigh to head, full desk width. Addresses full audience.",
    role: "Intro hook (0-6s), macro topic shifts, sign-off",
    transforms: { scale: 1.0, translateX: 0, translateY: 0, rotationY: 0 },
  },
  {
    id: "cam2_left",
    name: "Camera 2 (Left Tight Medium)",
    angle: "20° Left Perspective",
    lens: "50mm Medium",
    icon: "📹",
    desc: "Waist-up, anchor turned 20° left referencing notes/laptop.",
    role: "70% core factual news reporting delivery",
    transforms: { scale: 1.25, translateX: -60, translateY: -35, rotationY: 3.5 },
  },
  {
    id: "cam3_closeup",
    name: "Camera 3 (Right Slash Close-Up)",
    angle: "35° Right Slash",
    lens: "85mm Telephoto",
    icon: "🎬",
    desc: "Chest-up close-up. Zero-Hand-Clipping: hands strictly below frame.",
    role: "Punchlines, major breaking reveals, high-impact quotes",
    transforms: { scale: 1.6, translateX: 80, translateY: -95, rotationY: -5.0 },
  },
];

// ============================================================
// Algorithmic FSM Action Loop Choice Selector
// ============================================================

export interface AlgorithmicActionLoopInfo {
  loopName: string;
  stateId: ActionStateId;
  label: string;
  icon: string;
  cameraCue: CameraCue;
  cameraLabel: string;
}

export function getAlgorithmicActionLoop(
  index: number = 0,
  totalSegments: number = 1,
  text?: string
): AlgorithmicActionLoopInfo {
  const safeIndex = typeof index === "number" && !isNaN(index) ? Math.max(0, Math.floor(index)) : 0;
  const safeTotal = typeof totalSegments === "number" && !isNaN(totalSegments) ? Math.max(1, Math.floor(totalSegments)) : 1;
  const lowerText = (text || "").toLowerCase();

  // Scene 1: Opening Welcome Hook
  if (safeIndex === 0) {
    return {
      loopName: "ruby_intro_welcome",
      stateId: "state_intro_welcome",
      label: "Intro Welcome",
      icon: "👐",
      cameraCue: "cam1_wide",
      cameraLabel: "Cam 1 (Center Wide)",
    };
  }

  // Final Scene: Closing Sign-off
  if (safeTotal > 1 && safeIndex === safeTotal - 1) {
    return {
      loopName: "ruby_signoff_outro",
      stateId: "state_signoff_outro",
      label: "Sign-Off Outro",
      icon: "✨",
      cameraCue: "cam1_wide",
      cameraLabel: "Cam 1 (Center Wide)",
    };
  }

  // Scene 2: Main Story Emphasis
  if (safeIndex === 1) {
    return {
      loopName: "ruby_emphasis_nod",
      stateId: "state_emphasis_nod",
      label: "Confident Nod",
      icon: "👍",
      cameraCue: "cam2_left",
      cameraLabel: "Cam 2 (Medium Left)",
    };
  }

  // Heuristic context rules based on text content
  if (lowerText.includes("breaking") || lowerText.includes("alert") || lowerText.includes("urgent")) {
    return {
      loopName: "ruby_breaking_alert",
      stateId: "state_breaking_alert",
      label: "Breaking Alert",
      icon: "🚨",
      cameraCue: "cam3_closeup",
      cameraLabel: "Cam 3 (Close-Up)",
    };
  }

  if (lowerText.includes("?") || lowerText.includes("why") || lowerText.includes("how") || lowerText.includes("investigat") || lowerText.includes("analys")) {
    return {
      loopName: "ruby_deep_thought_analyst",
      stateId: "state_deep_thought_analyst",
      label: "Deep Thought",
      icon: "💡",
      cameraCue: "cam3_closeup",
      cameraLabel: "Cam 3 (Close-Up)",
    };
  }

  if (lowerText.includes("listen") || lowerText.includes("interview") || lowerText.includes("guest") || lowerText.includes("expert")) {
    return {
      loopName: "ruby_listen_tilt",
      stateId: "state_listen_tilt",
      label: "Analytical Tilt",
      icon: "🤔",
      cameraCue: "cam2_left",
      cameraLabel: "Cam 2 (Medium Left)",
    };
  }

  if (lowerText.includes("data") || lowerText.includes("chart") || lowerText.includes("number") || lowerText.includes("report") || lowerText.includes("document")) {
    return {
      loopName: "ruby_look_down_notes",
      stateId: "state_look_down_notes",
      label: "Teleprompter Notes",
      icon: "📑",
      cameraCue: "cam2_left",
      cameraLabel: "Cam 2 (Medium Left)",
    };
  }

  // Natural Anchor FSM Cycling for intermediate scenes
  const intermediateCadence: AlgorithmicActionLoopInfo[] = [
    { loopName: "ruby_emphasis_nod", stateId: "state_emphasis_nod", label: "Confident Nod", icon: "👍", cameraCue: "cam2_left", cameraLabel: "Cam 2 (Medium Left)" },
    { loopName: "ruby_idle", stateId: "state_idle", label: "Resting Base", icon: "🧘", cameraCue: "cam1_wide", cameraLabel: "Cam 1 (Center Wide)" },
    { loopName: "ruby_gesture_left", stateId: "state_gesture_left", label: "Gesture Left", icon: "👈", cameraCue: "cam2_left", cameraLabel: "Cam 2 (Medium Left)" },
    { loopName: "ruby_look_down_notes", stateId: "state_look_down_notes", label: "Teleprompter Notes", icon: "📑", cameraCue: "cam3_closeup", cameraLabel: "Cam 3 (Close-Up)" },
    { loopName: "ruby_deep_thought_analyst", stateId: "state_deep_thought_analyst", label: "Deep Thought", icon: "💡", cameraCue: "cam2_left", cameraLabel: "Cam 2 (Medium Left)" },
    { loopName: "ruby_gesture_right", stateId: "state_gesture_right", label: "Gesture Right", icon: "👉", cameraCue: "cam2_left", cameraLabel: "Cam 2 (Medium Left)" },
  ];

  return intermediateCadence[safeIndex % intermediateCadence.length];
}

