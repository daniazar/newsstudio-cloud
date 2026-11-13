/**
 * scripts/veo-cli/types.ts
 *
 * Domain types and interfaces for the Google Veo Video Generation & Action Loop Pipeline.
 */


export type VeoTierType = "lite" | "fast" | "quality" | "standard";
export type VeoModelType = "veo-3.1-lite" | "veo-3.1-fast" | "veo-3.1-quality" | "veo-3.1-standard" | "veo-2.0-generate-001" | "veo-2.0";
export type VeoEngineType = "gemini_web" | "flow_web" | "google_vids" | "web_portal" | "api" | "agy" | "tool_json";
export type AspectRatioType = "16:9" | "9:16" | "1:1";
export type VeoAspectRatio = AspectRatioType;
export type VideoDurationType = 4 | 8 | 2 | 5 | 10 | 16;
export type VeoDurationSeconds = VideoDurationType;

export type FlowMotionMode =
  | "subtle_idle"
  | "active_delivery"
  | "forward_articulation"
  | "seamless_loop"
  | "emotional_expression"
  | "character_turnaround";

export type FlowEmotionType =
  | "warm_approachable"
  | "authoritative_breaking"
  | "skeptical_investigative"
  | "empathetic_serious"
  | "confident_anchor";

/**
 * 6 Production Broadcast Scenario Domains
 */
export type BroadcastDomainType =
  | "seated_broadcast_desk"       // Domain 1: Seated behind newsroom broadcast desk with laptop & mic
  | "standing_broadcast_desk"     // Domain 2: Standing beside/behind newsroom broadcast desk or podium
  | "chroma_wall_standing"        // Domain 3: Pure standing on flat green/blue chroma wall with zero furniture
  | "chroma_wall_seated_desk"     // Domain 4: Seated behind chroma desk on chroma wall (virtual set)
  | "interview_lounge_standing"   // Domain 5: Standing in modern broadcast interview lounge set
  | "interview_lounge_seated_sofa"; // Domain 6: Seated in designer single sofa / armchair in lounge set

/**
 * High-Level Environment Groups (for cross-environment transition safety)
 */
export type EnvironmentGroupType =
  | "newsroom_studio"             // Domains 1 & 2 (Allows Sit <-> Stand posture transitions across bridge base)
  | "chroma_standing"             // Domain 3 (Strictly isolated standing transitions)
  | "chroma_desk"                 // Domain 4 (Strictly isolated seated chroma desk transitions)
  | "interview_lounge";           // Domains 5 & 6 (Allows Sit <-> Stand posture transitions across bridge base)

export interface CameraMotionPreset {
  id: string;
  label: string;
  description: string;
  promptPhrase: string;
  speed: "static" | "subtle_slow" | "medium" | "dynamic";
  category: "broadcast_desk" | "drone_aerial" | "crane_sweep" | "cinematic_dolly" | "character_cut";
}

export interface ActionPoseState {
  id: string;
  label: string;
  poseCode: string;
  description: string;
  motionPrompt: string;
  sampleImagePath?: string;
  handsPosition: string;
  recommendedCamera: "cam1" | "cam2" | "cam3" | "all";
  domain: BroadcastDomainType;
  requiresDesk?: boolean;
  prohibitsDesk?: boolean;
  requiredProps?: string[];
  isBridgeBase?: boolean; // Designated bridge base image for Sit <-> Stand posture transitions
}

export interface PoseTransitionConfig {
  fromPose: ActionPoseState;
  toPose: ActionPoseState;
  fromImagePath: string;
  toImagePath?: string;
  durationSeconds: VideoDurationType;
  motionPacing: "natural_deliberate" | "dynamic_emphasis" | "subtle_recovery";
}

export interface FSMState {
  id: string;
  poseId: string;
  cameraId: "cam1" | "cam2" | "cam3";
  imagePath: string;
  videoClipPath?: string;
}

export interface FSMTransitionProbabilities {
  selfLoopProb: number;      // e.g. 0.75 (Stay in current state with 4s subtle idle loop)
  poseShiftProb: number;     // e.g. 0.20 (Transition to another pose within permitted domain)
  cameraCutProb: number;     // e.g. 0.05 (Cut to another camera angle on 4s boundary)
}

export interface FSMSequenceStep {
  stepIndex: number;
  timeStartSec: number;
  timeEndSec: number;
  fromState: FSMState;
  toState: FSMState;
  transitionType: "idle_self_loop" | "pose_shift" | "camera_cut";
  videoPath: string;
  nlpTagTrigger?: string;
}

export interface CompiledVeoPrompt {
  prompt: string;
  imagePath?: string;        // Source frame for I2V (Image-to-Video)
  endImagePath?: string;     // Optional target frame for FLF (First-Last Frame)
  referenceImagePaths?: string[]; // Reference images for Ingredients-to-Video / Product Showcase
  aspectRatio: AspectRatioType;
  durationSeconds: VideoDurationType;
  fps?: number;
  resolution?: "720p" | "1080p" | "4k";
  baseName: string;
  model: VeoModelType;
  reuseConversation?: boolean; // Keep all video generations inside the same Gemini web chat thread
  engine?: VeoEngineType;
  outputDirectory?: string;
  attire?: string;
  characterTag?: string;
  emotion?: FlowEmotionType | string;
  motionMode?: FlowMotionMode;
  flowProjectUrl?: string;
  flowProjectId?: string;
  flowProjectName?: string;
}

export interface FlowProjectConfig {
  projectId: string;
  projectUrl: string;
  projectName: string;
}

export interface VeoGenerationResult {
  success: boolean;
  videoPath?: string;
  durationSeconds?: number;
  baseName: string;
  error?: string;
}

/**
 * Pre-Flight Multi-Modal Image Audit Result
 */
export interface ImageAuditResult {
  imagePath: string;
  filename: string;
  personaSlug: string;
  domain: BroadcastDomainType;
  environmentGroup: EnvironmentGroupType;
  posture: "standing" | "seated" | "podium";
  hasDesk: boolean;
  hasLaptop: boolean;
  hasTablet: boolean;
  hasPapers: boolean;
  hasFurniture: boolean;
  detectedBackdrop: "chroma_green" | "chroma_blue" | "virtual_studio" | "lounge_studio";
  handsState: string;
  isBridgeBase?: boolean;
  attireDescription: string;
  attireColorHex?: string;
  hairstyleDescription: string;
  aspectRatio: string;
  dimensions: { width: number; height: number };
  qualityScore: number;
  framingType?: "knee_up" | "waist_up" | "closeup" | "full_body" | "unknown";
  bottomClearancePx?: number;
  bottomClearancePct?: string;
  handClearancePx?: number;
  handClearancePct?: string;
  lateralMarginLeftPct?: string;
  lateralMarginRightPct?: string;
  framingPassed?: boolean;
  framingFailureReasons?: string[];
  validationStatus: "PASSED" | "FAILED" | "WARNING";
  warnings?: string[];
}

/**
 * Master Image Set Cohesion & Audit Report
 */
export interface SetAuditReport {
  setName: string;
  personaSlug: string;
  totalImages: number;
  images: ImageAuditResult[];
  isCohesive: boolean;
  cohesionScore: number;
  sharedDomain?: BroadcastDomainType;
  sharedEnvironment?: EnvironmentGroupType;
  permittedBeats: ActionPoseState[];
  permittedTransitions: {
    from: ActionPoseState;
    to: ActionPoseState;
    isBridge: boolean;
    label: string;
  }[];
  violations: string[];
  consistencyReport?: any;
}

/**
 * Multi-Persona Dual Anchor Interfaces
 */
export interface DualAnchorParticipant {
  slug: string;
  name: string;
  characterTag?: string;
  attire?: string;
  hairStyle?: string;
  role: "speaker" | "listener";
  position: "left" | "right";
  emotion?: string;
}

export interface DualAnchorOptions {
  personaSlug?: string;
  coPersonaSlug?: string;
  speakerRole?: "left" | "right" | "alternating" | "both";
  totalDurationSeconds?: number;
  beatsCount?: number;
  deskType?: "curved_glass" | "modern_wood" | "sleek_white" | "chroma_desk";
  envImage?: string;
  engine?: VeoEngineType;
  model?: VeoModelType;
  aspectRatio?: AspectRatioType;
  chromaMode?: "green" | "blue" | "studio";
  qc?: boolean;
  stitch?: boolean;
  dryRun?: boolean;
}

/**
 * Anchor-to-Field Satellite Toss Interfaces
 */
export interface SatelliteTossOptions {
  studioPersonaSlug?: string;
  fieldPersonaSlug?: string;
  locationType?: "outdoor_storm" | "capitol_building" | "financial_street" | "press_conference" | "breaking_scene";
  holdingMic?: boolean;
  hasUmbrella?: boolean;
  envImage?: string;
  engine?: VeoEngineType;
  model?: VeoModelType;
  aspectRatio?: AspectRatioType;
  chromaMode?: "green" | "blue" | "studio";
  qc?: boolean;
  stitch?: boolean;
  dryRun?: boolean;
}

/**
 * Over-The-Shoulder (OTS) Cinematic Multi-Cam Interfaces
 */
export interface OtsDirectorOptions {
  personaSlug?: string;
  coPersonaSlug?: string;
  angle?: "ots_left" | "ots_right" | "alternating_rack";
  depthOfField?: "shallow_f1.8" | "cinematic_bokeh";
  envImage?: string;
  engine?: VeoEngineType;
  model?: VeoModelType;
  aspectRatio?: AspectRatioType;
  chromaMode?: "studio" | "green";
  dryRun?: boolean;
}

/**
 * 3-Way Crossfire Debate Matrix Interfaces
 */
export interface CrossfireDebateOptions {
  moderatorSlug?: string;
  debaterLeftSlug?: string;
  debaterRightSlug?: string;
  activeSpeaker?: "moderator" | "debater_left" | "debater_right" | "round_robin";
  envImage?: string;
  engine?: VeoEngineType;
  model?: VeoModelType;
  aspectRatio?: AspectRatioType;
  dryRun?: boolean;
}

/**
 * Product Showcase & E-Commerce UGC Video Ad Interfaces
 */
export type ProductActionType =
  | "hold_and_present"
  | "unbox"
  | "demo"
  | "wear"
  | "apply"
  | "side_by_side"
  // Surfaces, Flooring, Materials & Tiles:
  | "swatch_presentation"
  | "room_walkthrough"
  | "torture_test"
  // Paint, Coatings & Wallpapers:
  | "paint_application"
  | "swatch_reveal"
  | "before_after_reveal"
  // SaaS, Apps & Digital Services:
  | "tablet_demo"
  | "holographic_data"
  | "saas_pitch_explainer"
  // Bulky Furniture:
  | "furniture_interaction"
  // Professional Services & Trades:
  | "service_expert";

export interface ProductPresenterOptions {
  personaSlug?: string;
  productName?: string;
  productImage?: string;
  productCategory?: "cosmetics" | "gadget" | "beverage" | "fashion" | "cpg" | "tech" | "general" | string;
  productAction?: ProductActionType;
  fuseBeats?: boolean;               // Fuses the 3 typology modes into a single cohesive commercial video
  beatsCount?: number;               // Number of fused beats (default: 3)
  customActions?: ProductActionType[];// Explicit custom sequence of actions to stitch
  stitch?: boolean;                  // Run optical flow video stitching (default: true)
  scriptText?: string;
  scriptFilePath?: string;
  withAudio?: boolean;
  bgmGenre?: string;
  sfxCue?: string;
  envImage?: string;
  talkingMode?: "silent_lipsync" | "natural_speech";
  engine?: VeoEngineType;
  model?: VeoModelType;
  aspectRatio?: AspectRatioType;
  chromaMode?: "green" | "blue" | "studio";
  durationSeconds?: number;
  dryRun?: boolean;
}

export type FlowVideoModel = "veo-3.1-quality" | "veo-3.1-fast" | "veo-3.1-lite" | "omni-1.1-flash";
export type FlowResolution = "720p" | "1080p" | "360p";
export type FlowConfirmPolicy = "never" | "always";
export type FlowExecutionMode = "direct" | "agent";

export interface FlowSettingsConfig {
  confirmPolicy: FlowConfirmPolicy;
  videoModel: FlowVideoModel;
  targetResolution: FlowResolution;
  upscale1080p: boolean;
  duration: "4s" | "6s" | "8s" | "10s";
  aspectRatio: AspectRatioType;
  batchCount: 1 | 2 | 3 | 4;
  executionMode: FlowExecutionMode;
  promptMode?: "ingredients" | "frames";
}

export interface FlowCreditCost {
  model: FlowVideoModel;
  resolution: FlowResolution;
  durationSec: number;
  batchCount: number;
  creditsPerClip: number;
  totalCredits: number;
  isUltraRate: boolean;
  upscaleCost: number;
}
