/**
 * src/lib/ai/comfy/types.ts
 *
 * TypeScript types and interfaces for the ComfyUI client library.
 */

export interface LtxFeatureFlags {
  /**
   * "tts"           → real WAV → AudioVAEEncode (voice-driven)
   * "generated"     → LTXVEmptyLatentAudio (no audio input)
   * "multi_persona" → multi-speaker: two audio tracks mixed, positional prompt guidance
   * "sfx_only"      → audio effects only, voice conditioning disabled
   * "music_video"   → full music track drives motion; no voice/TTS, beat-sync visual generation
   */
  audioMode: "tts" | "generated" | "multi_persona" | "sfx_only" | "music_video";
  /** Insert DeepFilterNet between LoadAudio and AudioVAEEncode */
  noiseReduction: boolean;
  /** Insert LatentUpscaleWithModel (X2) before VAEDecode */
  spatialUpscale: boolean;
  /** Insert FaceDetailer after VAEDecode */
  faceDetailer: boolean;
  /** Insert RIFE VFI ×2 after FaceDetailer/VAEDecode */
  frameInterpolation: boolean;
  /** Insert RTXVideoSuperResolution after RIFE */
  superResolution: boolean;
  /**
   * "distilled" → ltx-2.5-22b-distilled-transformer-fp8_e4m3fn.safetensors
   * "dev"       → ltx-video-2.5.safetensors
   * "eros"      → eros_ltx_video_2.5_fp8.safetensors (uncensored fine-tune)
   * "sulphur"   → sulphur_ltx_video_2.5_fp8.safetensors (uncensored distilled fine-tune)
   */
  modelVariant: "distilled" | "dev" | "eros" | "sulphur";
}

export interface ComfyWorkflowInputs {
  /** Path to the avatar image (local filesystem path, will be uploaded to ComfyUI) */
  imagePath: string;
  /** Optional path to the ending frame image (local filesystem path) */
  lastImagePath?: string;
  /** Path to the audio file (local filesystem path, will be uploaded to ComfyUI) */
  audioPath: string;
  /** Optional path to a second audio file (e.g. for multi-persona mixed audio) */
  secondaryAudioPath?: string;
  /** Model to use */
  model:
    | "1.3b"
    | "14b"
    | "echomimic"
    | "sadtalker"
    | "ltx"
    | "ltx_2.5"
    | "ltx_2.5_distilled"
    | "ltx_distilled"
    | "distilled"
    | "ltx_audio"
    | "ltx_flfv_tts"
    | "ltx_flfv_generated"
    | "ltx_silent"
    | "ltx_multi_persona"
    | "ltx_sfx"
    | "ltx_music_video"
    | "rtx_sr_upscale"
    | "ltx_green_screen"
    | "eros"
    | "sulphur"
    | "wan_alpha"
    | "wan_transition"
    | "ltx_transition"
    | "minimax_h3"
    | "minimax"
    | "minimax_taomate"
    | "taomate"
    | "hunyuan_1.5"
    | "hunyuan"
    | "hunyuanvideo_1.5"
    | "hunyuanvideo";
  isSilent?: boolean;
  filenamePrefix?: string;
  positivePrompt?: string;
  negativePrompt?: string;
  steps?: number;
  /** Quality preset for LTX generation. "draft" = low steps for fast preview, "studio" = full steps for final render */
  quality?: "draft" | "studio";
  loras?: { name: string; strength: number }[];
  /** Optional feature flags to customize LTX generation dynamically */
  features?: Partial<LtxFeatureFlags>;
  spokenText?: string;
  transcript?: string;
  prompt?: string;
}

export interface ComfySubmitResult {
  promptId: string;
  outputFilename: string;
}

// ============================================================================
// Multi-Pass Progressive Composition Pipeline Types (Part 10 — IMAGE_ROADMAP.md)
// ============================================================================

export type PipelineMode = "SEQUENTIAL" | "HYBRID" | "SIMULTANEOUS" | "TANDEM_SKELETON";
export type ContentMode = "SFW" | "NSFW_SOFT" | "NSFW_EXPLICIT";
export type MultiPassStageIndex = 1 | 2 | 3 | 3.2 | 3.5 | 4 | 5 | 6 | 7 | number;

export interface CheckpointEvent {
  stageIndex: number;
  stageName: string;
  imagePath: string;
  currentPrompt: string;
  currentSeed: number;
  currentDenoise?: number;
  totalStages: number;
  elapsedMs?: number;
}

export type CheckpointActionType =
  | "PROCEED"
  | "REROLL_SEED"
  | "REROLL_VARIATIONS"
  | "CHANGE_VARIANT"
  | "EDIT_PROMPT"
  | "TWEAK_DENOISE"
  | "JUMP_BACK"
  | "FAST_FORWARD"
  | "CANCEL";

export interface CheckpointResponse {
  action: CheckpointActionType;
  newPrompt?: string;
  newSeed?: number;
  sampleCount?: number;
  newVariantKey?: string;
  newDenoise?: number;
  jumpStageIndex?: number;
}

export interface StageConfig {
  stageIndex: MultiPassStageIndex;
  stageName: string;
  denoise: number;
  cfg: number;
  steps: number;
  sampler: string;
  scheduler: string;
  stagePrompt: string;
  stageNegativePrompt?: string;
  seed: number;
  useInpaintModel?: boolean;
  useControlNetDepth?: boolean;
  useControlNetOpenPose?: boolean;
  freezeMaskRegion?: boolean;
  useFluxFillInpaint?: boolean;
}

export interface MultiPassPipelineConfig {
  masterSeed: number;
  storyId?: string;
  pipelineMode: PipelineMode;
  contentMode: ContentMode;
  interactionIntensityScore?: number;
  stages: StageConfig[];
  cacheEnabled?: boolean;
  cacheDir?: string;
}

export interface StageResult {
  stageIndex: MultiPassStageIndex;
  stageName: string;
  imageBuffer: Buffer;
  imagePath: string;
  executionTimeMs: number;
  cached: boolean;
  seed: number;
}

export interface ComfyWorkflowNode {
  class_type: string;
  inputs: Record<string, unknown>;
  _meta?: Record<string, unknown>;
  [key: string]: unknown;
}

export type ComfyWorkflow = Record<string, ComfyWorkflowNode>;

