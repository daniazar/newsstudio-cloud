/**
 * src/lib/video/loopSelectorTypes.ts
 *
 * Comprehensive Type Definitions for the NewsStudio Broadcast Loop Selection,
 * Finite State Machine (FSM), 3-Tier Pacing Director, and 3-Camera Rig.
 */

export type MasterPoseCode =
  | "M1" // Neutral Clasped (Resting Home Base)
  | "M2" // Raised Right Hand (Dynamic Explanatory)
  | "M3" // Open Two Hands (Welcoming Overview)
  | "M4" // Separated Arms (Casual Relaxed)
  | "M5" // Side Perspective Turn (Infographics / Screen Reference)
  | "D1_P01" // Seated Desk Base
  | "D1_P02" // Seated Laptop Reference
  | "D1_P03" // Seated Script Review
  | "D1_P04" // Seated Explanatory
  | "D2_P01" // Standing Desk Base
  | "D2_P02" // Standing Podium Tablet
  | "D4_P01" // Chroma Desk Base
  | "D5_P01" // Interview Lounge Standing Mic
  | "D6_P01" // Interview Lounge Sofa Armchair
  | "D6_P02"; // Interview Lounge Sofa Casual

export type MotionTier =
  | "tier1_ambient_idle" // 75-80% Airtime (Natural breathing, subtle collarbone micro-shifts, locked gaze)
  | "tier2_micro_beat"   // 15-20% Airtime (Affirmative nods, 10° analytical tilt, single soft blink)
  | "tier3_macro_action"; // Max 1/60s (FLF Pose transition, dynamic hand sweep, 30° turn to screen)

export type BroadcastDomainType =
  | "seated_broadcast_desk"       // Domain 1: Seated behind newsroom broadcast desk with laptop & mic
  | "standing_broadcast_desk"     // Domain 2: Standing beside/behind newsroom broadcast desk or podium
  | "chroma_wall_standing"        // Domain 3: Pure standing on flat green/blue chroma wall with zero furniture
  | "chroma_wall_seated_desk"     // Domain 4: Seated behind chroma desk on chroma wall (virtual set)
  | "interview_lounge_standing"   // Domain 5: Standing in modern broadcast interview lounge set
  | "interview_lounge_seated_sofa"; // Domain 6: Seated in designer single sofa / armchair in lounge set

export type CameraRigId = "cam1_wide" | "cam2_left" | "cam3_closeup";

export type TransitionType =
  | "same_pose_beat"             // 4.0s boundary-locked motion beat (Mi -> Mi)
  | "flf_pose_transition"        // 4.0s First-Last Frame kinematic transition (Mi -> Mj)
  | "camera_cut"                 // Instant cut between Cam 1 (Wide), Cam 2 (Left), Cam 3 (Slash)
  | "bridge_posture_transition"; // Designated bridge transition (Sit <-> Stand across bridge bases)

export interface ScriptCue {
  timeSec: number;
  tag: string;
  rawMatch?: string;
  sentiment?: "neutral" | "urgent" | "breaking" | "analytical" | "warm" | "inquisitive";
}

export interface PacingDirectorConfig {
  /** Maximum Tier 3 Macro Actions allowed per 60 seconds of airtime (Default: 1) */
  maxMacroActionsPerMinute: number;
  /** Minimum spacing in seconds between Tier 2 Micro Beats (Default: 8.0s / 2 beats) */
  minMicroBeatSpacingSec: number;
  /** Target ratio of Tier 1 Ambient Idles / Base Beats (Default: 0.75) */
  ambientIdleRatioTarget: number;
  /** Sliding history window for anti-fatigue beat selection (Default: 3 beats) */
  fatigueHistoryWindow: number;
  /** Weight decay factor applied to recently played beats (Default: 0.35) */
  fatigueDecayFactor: number;
}

export interface ChoreographedBeatNode {
  beatIndex: number;
  startTimeSec: number;
  endTimeSec: number;
  durationSec: number;
  tier: MotionTier;
  startPose: string; // e.g. "P01_NEUTRAL_CLASPED" or "M1"
  endPose: string;   // e.g. "P01_NEUTRAL_CLASPED" or "P02_RAISED_EXPLANATORY"
  transitionType: TransitionType;
  camera: CameraRigId;
  actionStateId: string;
  actionStateLabel: string;
  videoPath: string;
  transparentWebmPath?: string;
  latentsCacheKey?: string;
  coordsCacheKey?: string;
  cueTag?: string;
  transitionFrom?: string;
  transitionTo?: string;
  isBridge?: boolean;
}

export interface LoopSelectorOptions {
  totalDurationSeconds?: number;
  totalBeats?: number;
  beatDurationSec?: number; // Default 4.0s
  personaId?: string;       // Default "ruby"
  domain?: BroadcastDomainType; // Default "chroma_wall_standing"
  scriptText?: string;
  cues?: ScriptCue[];
  initialPoseId?: string;
  initialCamera?: CameraRigId;
  pacingConfig?: Partial<PacingDirectorConfig>;
  probabilities?: {
    selfLoopProb?: number;  // Default 0.75
    poseShiftProb?: number; // Default 0.18
    cameraCutProb?: number; // Default 0.07
  };
  dryRun?: boolean;
}

export interface LoopSelectionResult {
  totalBeats: number;
  totalDurationSec: number;
  personaId: string;
  domain: BroadcastDomainType;
  sequence: ChoreographedBeatNode[];
  uniqueVideoAssets: string[];
  pacingSummary: {
    ambientCount: number;
    microCount: number;
    macroCount: number;
    cameraCutsCount: number;
  };
}
