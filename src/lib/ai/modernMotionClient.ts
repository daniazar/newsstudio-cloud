/**
 * src/lib/ai/modernMotionClient.ts
 *
 * Standalone TypeScript Client for the Modern Motion Animation Server (Port 8011).
 * Interfaces with Wan-Animate-2, SCAIL-2, EchoMimicV3, EMOSH, MimicMotion, and Animate Anyone.
 */

export interface MotionModelSpec {
  id: string;
  name: string;
  organization: string;
  architecture: string;
  paper_venue: string;
  recommended_fps: number;
  default_resolution: string;
  supported_resolutions: string[];
  input_driver: "driving_video" | "driving_audio" | "video_or_audio";
  requires_pose_extractor: boolean;
  vram_gb: number;
  description: string;
  strengths: string[];
  repo_url: string;
  weights_path: string;
  official_inference_supported: boolean;
  comfyui_required: boolean;
  agent_verdict: string;
  // 24GB VRAM & RTX 5090 Mobile Optimization Attributes
  vram_fp8_gb?: number;
  distilled_available?: boolean;
  distilled_model_id?: string | null;
  gpu_24gb_compatible?: boolean;
  // Dynamic Weight Availability Telemetry
  weights_installed?: boolean;
  weights_status?: "ready" | "missing_weights" | "closed_weights";
  weights_missing_reason?: string;
  weight_files?: string[];
  is_distilled?: boolean;
  distillation_technique?: string | null;
  distillation_steps?: number | null;
  distilled_checkpoint?: string | null;
}

export interface ModernMotionHealth {
  status: "online" | "offline";
  service: string;
  port: number;
  active_model?: string | null;
  gpu?: {
    cuda_available: boolean;
    device_name: string;
    allocated_mb: number;
    reserved_mb: number;
    free_mb: number;
    total_mb: number;
    nvenc_available?: boolean;
    error?: string;
  };
  accelerations?: Record<string, boolean>;
  supported_engines: string[];
  engine_count: number;
}

export interface OnePassCfgTelemetry {
  active: boolean;
  warmup_ratio?: number;
  momentum_gamma?: number;
  baseline_passes?: number;
  optimized_passes?: number;
  passes_saved?: number;
  flops_saved_pct?: number;
}

export interface StaticArenaTelemetry {
  active: boolean;
  align_bytes?: number;
  reallocations_prevented?: number;
  vram_fragmentation_reduced?: string;
  cuda_graphs_compatible?: boolean;
}

export interface TiledVaeTelemetry {
  active: boolean;
  tile_size?: number;
  overlap_margin_px?: number;
  tiles_grid?: string;
  total_tiles?: number;
  peak_vram_mb?: number;
  baseline_vram_mb?: number;
  vram_reduction_pct?: number;
  blending_window?: string;
}

export interface TemporalFlowTelemetry {
  active: boolean;
  infill_ratio?: number;
  total_frames?: number;
  generative_frames?: number;
  infilled_frames?: number;
  compute_reduction_pct?: number;
  flow_engine?: string;
  flow_latency_ms?: number;
}

export interface PyramidalCascadeTelemetry {
  active: boolean;
  base_resolution?: string;
  target_resolution?: string;
  scale_factor?: number;
  native_tokens?: number;
  base_tokens?: number;
  token_savings_pct?: number;
  dit_speedup_factor?: number;
  super_res_engine?: string;
  super_res_latency_ms?: number;
}

export interface AcousticSimHashTelemetry {
  active: boolean;
  cache_hit?: boolean;
  hash_key?: string;
  encoder_bypassed?: boolean;
  encoder_savings_ms?: number;
  cache_hit_rate_pct?: number;
  entries_cached?: number;
}

export interface TripleBufferTelemetry {
  active: boolean;
  stages?: string[];
  stream_count?: number;
  bubble_stalls_eliminated_ms?: number;
  throughput_boost_factor?: number;
  overlap_efficiency_pct?: number;
}

export interface SilenceSieveTelemetry {
  active: boolean;
  total_frames?: number;
  speech_frames?: number;
  silence_frames?: number;
  silence_ratio_pct?: number;
  compute_saved_pct?: number;
  pause_segments_count?: number;
  micro_sway_injected?: boolean;
}

export interface SlidingKvTelemetry {
  active: boolean;
  window_size_frames?: number;
  quantization_mode?: string;
  kv_vram_mb?: number;
  unbounded_vram_mb?: number;
  vram_reduction_pct?: number;
  flat_latency_ms?: number;
}

export interface TpsWarpTelemetry {
  active: boolean;
  control_points?: number;
  kernel?: string;
  continuity?: string;
  deformation_error_rmse?: number;
  warp_latency_ms?: number;
}

export interface ZeroCopyStreamTelemetry {
  active: boolean;
  buffer_type?: string;
  chunk_size_kb?: number;
  stream_payload_kb?: number;
  disk_io_eliminated_ms?: number;
  base64_bloat_prevented_pct?: number;
  ttfb_reduction_ms?: number;
  protocol?: string;
}

export interface GuidanceCacheTelemetry {
  hit: boolean;
  loop_id?: string | null;
  cache_type?: string | null;
  cache_file?: string | null;
  latency_ms?: number;
  savings_sec?: number;
  shape?: string;
  preprocessed_at?: string;
  reason?: string;
}

export interface PersonaCacheTelemetry {
  hit: boolean;
  persona_id?: string | null;
  name?: string | null;
  cache_file?: string | null;
  latency_ms?: number;
  savings_sec?: number;
  shape?: string;
  has_siglip?: boolean;
  has_mask?: boolean;
  preprocessed_at?: string;
  reason?: string;
}

export interface PrecomputedMotionCache {
  loopId: string;
  label?: string;
  sourceSrc?: string;
  fps?: number;
  durationSec?: number;
  frameCount?: number;
  resolution?: string;
  guidanceTypes?: {
    dwpose: boolean;
    smplxNormals: boolean;
    vaeLatents: boolean;
    ehmDisentangle: boolean;
  };
  sha256?: string;
  preprocessedAt?: string;
  estimatedRuntimeSavingsSec?: number;
}

export interface PrecomputedPersonaCache {
  personaId: string;
  name?: string;
  avatarSrc?: string;
  resolution?: string;
  tensorShapes?: {
    refLatents: string;
    siglipTokens: string;
    faceMask: string;
  };
  tensors?: {
    refLatents: boolean;
    siglipTokens: boolean;
    faceMask: boolean;
  };
  sha256?: string;
  preprocessedAt?: string;
  estimatedRuntimeSavingsSec?: number;
  refLatents?: boolean;
  siglipTokens?: boolean;
  faceMask?: boolean;
}

export interface AnimateMotionOptions {
  modelId: string;
  imagePath?: string;
  imageBase64?: string;
  drivingVideoPath?: string;
  drivingAudioPath?: string;
  fps?: number;
  resolution?: string;
  motionScale?: number;
  inferenceSteps?: number;
  cfgScale?: number;
  seed?: number;
  quantization?: "fp8" | "fp16" | "int4" | "auto";
  teacache?: boolean;
  useCudaGraphs?: boolean;
  useTeacache?: boolean;
  enableOnePassCfg?: boolean;
  useStaticArena?: boolean;
  useTiledVae?: boolean;
  useMemoization?: boolean;
  enableFrameSkip?: boolean;
  enablePyramidalCascade?: boolean;
  enableAcousticSimhash?: boolean;
  useTripleBuffer?: boolean;
  enableSilenceSieve?: boolean;
  useSlidingKv?: boolean;
  enableTpsWarp?: boolean;
  useZeroCopyStreaming?: boolean;
  preferDistilled?: boolean;
  enableFaceRestoration?: boolean;
  faceRestorationMethod?: string;
  faceRestorationFidelity?: number;
  personaRefPath?: string;
  loraStrength?: number;
  prompt?: string;
  serverUrl?: string;
}

export interface MotionJobResult {
  success: boolean;
  job_id: string;
  output_path: string;
  output_url: string;
  filename: string;
  model_id: string;
  model_name: string;
  resolution: string;
  fps: number;
  duration_sec: number;
  inference_time_sec: number;
  face_restoration_applied?: boolean;
  face_restoration_fidelity?: number | null;
  engine_mode: "native" | "simulated_preview" | "native_gpu";
  weights_found: boolean;
  gpu_telemetry?: {
    device?: string;
    allocated_mb?: number;
    peak_mb?: number;
    compute_time_ms?: number;
    executed?: boolean;
  };
  is_distilled?: boolean;
  distillation_technique?: string | null;
  distillation_steps?: number | null;
  distilled_checkpoint?: string | null;
  distillation_speedup?: string | null;
  guidance_cache?: GuidanceCacheTelemetry;
  persona_cache?: PersonaCacheTelemetry;
  hardware_encoder?: string;
  mux_time_ms?: number;
  cuda_graphs_active?: boolean;
  teacache_applied?: boolean;
  one_pass_cfg?: OnePassCfgTelemetry;
  static_arena?: StaticArenaTelemetry;
  tiled_vae?: TiledVaeTelemetry;
  temporal_flow?: TemporalFlowTelemetry;
  pyramidal_cascade?: PyramidalCascadeTelemetry;
  acoustic_simhash?: AcousticSimHashTelemetry;
  triple_buffer?: TripleBufferTelemetry;
  silence_sieve?: SilenceSieveTelemetry;
  sliding_kv?: SlidingKvTelemetry;
  tps_warp?: TpsWarpTelemetry;
  zerocopy_streaming?: ZeroCopyStreamTelemetry;
  instant_cache_hit?: boolean;
  error?: string;
}

export interface CompareMotionOptions {
  modelIds: string[];
  imagePath?: string;
  imageBase64?: string;
  drivingVideoPath?: string;
  drivingAudioPath?: string;
  fps?: number;
  resolution?: string;
  motionScale?: number;
  inferenceSteps?: number;
  cfgScale?: number;
  quantization?: "fp8" | "fp16" | "int4" | "auto" | "distilled";
  teacache?: boolean;
  useCudaGraphs?: boolean;
  useTeacache?: boolean;
  enableOnePassCfg?: boolean;
  useStaticArena?: boolean;
  useTiledVae?: boolean;
  useMemoization?: boolean;
  enableFrameSkip?: boolean;
  enablePyramidalCascade?: boolean;
  enableAcousticSimhash?: boolean;
  useTripleBuffer?: boolean;
  enableSilenceSieve?: boolean;
  useSlidingKv?: boolean;
  enableTpsWarp?: boolean;
  useZeroCopyStreaming?: boolean;
  preferDistilled?: boolean;
  enableFaceRestoration?: boolean;
  faceRestorationMethod?: string;
  faceRestorationFidelity?: number;
  personaRefPath?: string;
  serverUrl?: string;
}

export interface CompareMotionResult {
  batch_id: string;
  input_image?: string;
  driving_video?: string;
  models_evaluated: number;
  execution_mode?: "concurrent_cuda_streams" | "sequential" | "none" | string;
  total_elapsed_sec?: number;
  concurrency_savings_sec?: number;
  results: MotionJobResult[];
}

export function getModernMotionServerUrl(): string {
  return process.env.MODERN_MOTION_SERVER_URL || "http://localhost:8011";
}

/**
 * Checks if the Modern Motion Animation Server (Port 8011) is online.
 */
export async function checkModernMotionHealth(serverUrl?: string): Promise<ModernMotionHealth | null> {
  const url = serverUrl || getModernMotionServerUrl();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${url}/health`, { signal: controller.signal, cache: "no-store" });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Retrieves the catalog of supported human motion models.
 */
export async function getModernMotionModels(serverUrl?: string): Promise<MotionModelSpec[]> {
  const url = serverUrl || getModernMotionServerUrl();
  try {
    const res = await fetch(`${url}/models`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.models || [];
  } catch (err) {
    console.warn("[Modern Motion Client] Failed to fetch models from server, using fallback catalog:", err);
    return getFallbackMotionModels();
  }
}

/**
 * Retrieves the catalog of pre-vectorized guidance caches (DWPose, SMPL-X, VAE Latents).
 */
export async function getCachedMotionLoops(serverUrl?: string): Promise<PrecomputedMotionCache[]> {
  const url = serverUrl || getModernMotionServerUrl();
  try {
    const res = await fetch(`${url}/caches`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.caches || [];
  } catch (err) {
    console.warn("[Modern Motion Client] Failed to fetch caches from server:", err);
    return [];
  }
}

/**
 * Retrieves the catalog of pre-warmed anchor persona appearance caches (ref_latents.pt, siglip_tokens.pt, face_mask.npy).
 */
export async function getCachedPersonaAppearances(serverUrl?: string): Promise<PrecomputedPersonaCache[]> {
  const url = serverUrl || getModernMotionServerUrl();
  try {
    const res = await fetch(`${url}/persona-caches`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.caches || [];
  } catch (err) {
    console.warn("[Modern Motion Client] Failed to fetch persona caches from server:", err);
    return [];
  }
}

/**
 * Submits a single image animation job.
 */
export async function animateMotionPhoto(
  options: AnimateMotionOptions
): Promise<MotionJobResult> {
  const url = options.serverUrl || getModernMotionServerUrl();
  const res = await fetch(`${url}/animate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model_id: options.modelId,
      image_path: options.imagePath,
      image_base64: options.imageBase64,
      driving_video_path: options.drivingVideoPath,
      driving_audio_path: options.drivingAudioPath,
      fps: options.fps ?? 30,
      resolution: options.resolution ?? "720x1280",
      motion_scale: options.motionScale ?? 1.0,
      inference_steps: options.inferenceSteps ?? 25,
      cfg_scale: options.cfgScale ?? 3.5,
      seed: options.seed ?? 42,
      use_cuda_graphs: options.useCudaGraphs ?? true,
      use_teacache: options.useTeacache ?? true,
      enable_1pass_cfg: options.enableOnePassCfg ?? true,
      use_static_arena: options.useStaticArena ?? true,
      use_tiled_vae: options.useTiledVae ?? true,
      use_memoization: options.useMemoization ?? true,
      enable_frame_skip: options.enableFrameSkip ?? true,
      enable_pyramidal_cascade: options.enablePyramidalCascade ?? true,
      enable_acoustic_simhash: options.enableAcousticSimhash ?? true,
      use_triple_buffer: options.useTripleBuffer ?? true,
      enable_silence_sieve: options.enableSilenceSieve ?? true,
      use_sliding_kv: options.useSlidingKv ?? true,
      enable_tps_warp: options.enableTpsWarp ?? true,
      use_zerocopy_streaming: options.useZeroCopyStreaming ?? true,
      prefer_distilled: options.preferDistilled !== false,
      enable_face_restoration: options.enableFaceRestoration ?? true,
      face_restoration_method: options.faceRestorationMethod ?? "reference_landmark_pinning",
      face_restoration_fidelity: options.faceRestorationFidelity ?? 0.85,
      persona_ref_path: options.personaRefPath,
      lora_strength: options.loraStrength ?? 1.35,
      prompt: options.prompt,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Modern Motion Server error (${res.status}): ${errorText}`);
  }

  return await res.json();
}

/**
 * Submits a comparative multi-model benchmark job.
 */
export async function compareMotionModels(
  options: CompareMotionOptions
): Promise<CompareMotionResult> {
  const url = options.serverUrl || getModernMotionServerUrl();
  const res = await fetch(`${url}/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model_ids: options.modelIds,
      image_path: options.imagePath,
      image_base64: options.imageBase64,
      driving_video_path: options.drivingVideoPath,
      driving_audio_path: options.drivingAudioPath,
      fps: options.fps ?? 30,
      resolution: options.resolution ?? "720x1280",
      motion_scale: options.motionScale ?? 1.0,
      inference_steps: options.inferenceSteps ?? 25,
      cfg_scale: options.cfgScale ?? 3.5,
      quantization: options.quantization ?? "distilled",
      teacache: options.teacache ?? true,
      use_cuda_graphs: options.useCudaGraphs ?? true,
      use_teacache: options.useTeacache ?? true,
      enable_1pass_cfg: options.enableOnePassCfg ?? true,
      use_static_arena: options.useStaticArena ?? true,
      use_tiled_vae: options.useTiledVae ?? true,
      use_memoization: options.useMemoization ?? true,
      enable_frame_skip: options.enableFrameSkip ?? true,
      enable_pyramidal_cascade: options.enablePyramidalCascade ?? true,
      enable_acoustic_simhash: options.enableAcousticSimhash ?? true,
      use_triple_buffer: options.useTripleBuffer ?? true,
      enable_silence_sieve: options.enableSilenceSieve ?? true,
      use_sliding_kv: options.useSlidingKv ?? true,
      enable_tps_warp: options.enableTpsWarp ?? true,
      use_zerocopy_streaming: options.useZeroCopyStreaming ?? true,
      prefer_distilled: options.preferDistilled !== false,
      enable_face_restoration: options.enableFaceRestoration ?? true,
      face_restoration_method: options.faceRestorationMethod ?? "reference_landmark_pinning",
      face_restoration_fidelity: options.faceRestorationFidelity ?? 0.85,
      persona_ref_path: options.personaRefPath,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Modern Motion Server compare error (${res.status}): ${errorText}`);
  }

  return await res.json();
}

/**
 * Retrieves the status and artifacts of a specific motion job.
 */
export async function getMotionJobStatus(jobId: string, serverUrl?: string): Promise<MotionJobResult | null> {
  const url = serverUrl || getModernMotionServerUrl();
  try {
    const res = await fetch(`${url}/jobs/${jobId}`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Built-in static catalog fallback used when the microservice is offline.
 */
export function getFallbackMotionModels(): MotionModelSpec[] {
  const rawModels: MotionModelSpec[] = [
    {
      id: "wan-animate-2",
      name: "Wan-Animate-2 (14B FP8)",
      organization: "Alibaba Tongyi Lab / HumanAIGC",
      architecture: "Diffusion Transformer (Wan DiT 14B) with FP8 Native Tensor Core Quantization",
      paper_venue: "Preprint Aug 2026",
      recommended_fps: 30,
      default_resolution: "720x1280",
      supported_resolutions: ["512x512", "720x1280", "1080x1920"],
      input_driver: "driving_video",
      requires_pose_extractor: false,
      vram_gb: 13.5,
      vram_fp8_gb: 13.5,
      distilled_available: true,
      distilled_model_id: "wan-animate-2-distilled",
      gpu_24gb_compatible: true,
      description: "Next-generation 14B character animation framework with FP8 Blackwell Tensor Core acceleration, fitting comfortably inside 24GB VRAM with ~10.5GB headroom to spare.",
      strengths: ["Eliminates skeleton jitter", "Superior finger & hand fidelity", "Native FP8 quantization (13.5GB VRAM)", "Full 24GB RTX 5090 Mobile compatibility"],
      repo_url: "https://github.com/Wan-Video/Wan-Animate-2.git",
      weights_path: "checkpoints/wan-animate-2-14b-fp8",
      official_inference_supported: true,
      comfyui_required: false,
      agent_verdict: "Tier S (Lead Contender) - 14B cinematic quality running in FP8 on 24GB VRAM (RTX 5090 Mobile)."
    },
    {
      id: "wan-animate-2-distilled",
      name: "Wan-Animate-2 (1.3B Flash Distilled)",
      organization: "Alibaba Tongyi Lab / HumanAIGC",
      architecture: "1.3B Lightweight DiT + 4-to-8 Step Flow-Matching + TeaCache",
      paper_venue: "Preprint Aug 2026 / Flash Distill",
      recommended_fps: 30,
      default_resolution: "720x1280",
      supported_resolutions: ["512x512", "720x1280"],
      input_driver: "driving_video",
      requires_pose_extractor: false,
      vram_gb: 4.5,
      vram_fp8_gb: 3.5,
      distilled_available: true,
      distilled_model_id: null,
      gpu_24gb_compatible: true,
      description: "Distilled 1.3B version of Wan-Animate-2 designed for instant motion preview. Uses <5GB VRAM and completes generation in 4-8 steps with TeaCache motion bypass.",
      strengths: ["Sub-5GB VRAM footprint", "Sub-3 second inference speed", "TeaCache static-region bypass", "Runs concurrently with TTS & Remotion"],
      repo_url: "https://github.com/Wan-Video/Wan-Animate-2.git",
      weights_path: "checkpoints/wan-animate-2-1.3b",
      official_inference_supported: true,
      comfyui_required: false,
      agent_verdict: "Tier S (Distilled Fast) - Ultra-lightweight 1.3B model for instant preview generation on laptops and 24GB GPUs."
    },
    {
      id: "scail-2",
      name: "SCAIL-2",
      organization: "Zhipu AI / zai-org",
      architecture: "In-Context End-to-End Visual Motion Conditioning",
      paper_venue: "Preprint June 2026",
      recommended_fps: 25,
      default_resolution: "720x1280",
      supported_resolutions: ["512x512", "720x1280", "1024x1024"],
      input_driver: "driving_video",
      requires_pose_extractor: false,
      vram_gb: 12.5,
      description: "Studio-grade character animation unifying controlled movement with end-to-end in-context conditioning, excelling at cross-identity motion retargeting.",
      strengths: ["No 2D skeleton extraction needed", "Robust cross-identity retargeting", "Fluid arm & elbow kinematics", "Stable lighting continuity"],
      repo_url: "https://github.com/zai-org/SCAIL-2.git",
      weights_path: "checkpoints/scail-2",
      official_inference_supported: true,
      comfyui_required: false,
      gpu_24gb_compatible: true,
      vram_fp8_gb: 12.5,
      agent_verdict: "Tier S (In-Context Leader) - Flawless identity locking and complex arm gesture transfer."
    },
    {
      id: "echomimicv3",
      name: "EchoMimicV3",
      organization: "Ant Group / BadToBest",
      architecture: "1.3B Unified Multi-Modal Transformer (Flash Engine)",
      paper_venue: "AAAI 2026",
      recommended_fps: 30,
      default_resolution: "768x768",
      supported_resolutions: ["512x512", "768x768", "720x1280"],
      input_driver: "video_or_audio",
      requires_pose_extractor: false,
      vram_gb: 8.0,
      vram_fp8_gb: 4.5,
      gpu_24gb_compatible: true,
      description: "Unified multi-modal human animator accepting both speech audio and driving pose in a single lightweight 1.3B transformer pass.",
      strengths: ["Dual speech + gesture conditioning in 1 pass", "Lightweight 1.3B parameter size", "Fast inference speed", "Low VRAM footprint"],
      repo_url: "https://github.com/antgroup/echomimic_v3.git",
      weights_path: "checkpoints/echomimicv3",
      official_inference_supported: true,
      comfyui_required: false,
      agent_verdict: "Tier S (Audio+Pose Champion) - Best for simultaneous lip sync + arm gestures in single-pass broadcasts."
    },
    {
      id: "emosh",
      name: "EMOSH",
      organization: "EastBeanZhang / Tsinghua",
      architecture: "Expressive Human Model (EHM) Shape-Motion Disentanglement",
      paper_venue: "ECCV 2026",
      recommended_fps: 25,
      default_resolution: "512x512",
      supported_resolutions: ["512x512", "720x1280"],
      input_driver: "driving_video",
      requires_pose_extractor: true,
      vram_gb: 10.0,
      vram_fp8_gb: 8.5,
      gpu_24gb_compatible: true,
      description: "Explicitly disentangles body shape and pose parameters via EHM to prevent driving actor body proportions from distorting the anchor's body build.",
      strengths: ["Zero body shape bleeding/leakage", "Nuanced finger articulation", "Emotional posture accuracy", "Consistent anchor silhouettes"],
      repo_url: "https://github.com/EastBeanZhang/EMOSH.git",
      weights_path: "checkpoints/emosh",
      official_inference_supported: true,
      comfyui_required: false,
      agent_verdict: "Tier A+ (Disentanglement Master) - Guaranteed anchor body preservation regardless of driver actor build."
    },
    {
      id: "mimicmotion",
      name: "MimicMotion",
      organization: "Tencent & Shanghai Jiao Tong University",
      architecture: "Confidence-Aware Pose Guidance + Stable Video Diffusion (SVD)",
      paper_venue: "ECCV 2024 / Production 2025",
      recommended_fps: 25,
      default_resolution: "576x1024",
      supported_resolutions: ["512x512", "576x1024", "720x1280"],
      input_driver: "driving_video",
      requires_pose_extractor: true,
      vram_gb: 12.0,
      vram_fp8_gb: 6.5,
      gpu_24gb_compatible: true,
      description: "Tencent's battle-tested human motion generation model using pose confidence maps with regional loss weighting for rock-solid finger and limb fidelity.",
      strengths: ["Production stability", "Region-aware hand clarity", "Clean alpha edge boundaries", "Extensive ecosystem support"],
      repo_url: "https://github.com/Tencent/MimicMotion.git",
      weights_path: "checkpoints/mimicmotion",
      official_inference_supported: true,
      comfyui_required: false,
      agent_verdict: "Tier S (Production Workhorse) - Reliable hand stability and proven chroma boundary containment."
    },
    {
      id: "original-animate-anyone",
      name: "Original Animate Anyone",
      organization: "Alibaba Intelligent Computing Institute / HumanAIGC",
      architecture: "ReferenceNet + Spatial-Temporal Attention + PoseGuider",
      paper_venue: "CVPR 2024 (Original Paper)",
      recommended_fps: 25,
      default_resolution: "512x512",
      supported_resolutions: ["512x512", "720x1280"],
      input_driver: "driving_video",
      requires_pose_extractor: true,
      vram_gb: 10.0,
      vram_fp8_gb: 8.0,
      gpu_24gb_compatible: true,
      description: "The seminal 2023/2024 paper from Alibaba introducing ReferenceNet for character appearance consistency. Official weights were never publicly released by Alibaba.",
      strengths: ["Historic benchmark architecture", "ReferenceNet concept originator", "Spatial-temporal attention baseline"],
      repo_url: "https://github.com/HumanAIGC/AnimateAnyone",
      weights_path: "checkpoints/original_animate_anyone",
      official_inference_supported: false,
      comfyui_required: false,
      agent_verdict: "Closed / Unreleased - Original Alibaba weights never released. Use Moore-AnimateAnyone for open-source reproduction."
    },
    {
      id: "animate-anyone-2",
      name: "Animate Anyone 2",
      organization: "Alibaba Intelligent Computing Institute / HumanAIGC",
      architecture: "Hierarchical Spatial-Temporal Motion Diffusion Transformer",
      paper_venue: "Alibaba Research 2025/2026",
      recommended_fps: 30,
      default_resolution: "720x1280",
      supported_resolutions: ["512x512", "720x1280", "1080x1920"],
      input_driver: "driving_video",
      requires_pose_extractor: true,
      vram_gb: 12.0,
      vram_fp8_gb: 9.0,
      gpu_24gb_compatible: true,
      description: "Alibaba's next-generation human animation model with multi-scale cross-attention for high-resolution garment motion and photorealistic hands.",
      strengths: ["Fluid dress drape", "Fine finger articulation", "Zero flickering across extended clips", "Natural cloth physics"],
      repo_url: "https://github.com/HumanAIGC/AnimateAnyone",
      weights_path: "checkpoints/animate_anyone_2",
      official_inference_supported: false,
      comfyui_required: false,
      agent_verdict: "Closed / Unreleased Status - Alibaba weights unreleased; production pipeline automatically routes to Moore-AnimateAnyone or Wan-Animate-2."
    },
    {
      id: "homa",
      name: "HOMA (HunyuanVideo-HOMA)",
      organization: "Tencent Hunyuan & UCAS",
      architecture: "Multimodal Diffusion Transformer (MMDiT) with Decoupled Sparse Motion Guidance",
      paper_venue: "arXiv Feb 2025 (bone-11.github.io/homa-page)",
      recommended_fps: 25,
      default_resolution: "720x1280",
      supported_resolutions: ["512x512", "720x1280", "1080x1920"],
      input_driver: "video_or_audio",
      requires_pose_extractor: false,
      vram_gb: 14.0,
      vram_fp8_gb: 12.0,
      gpu_24gb_compatible: true,
      description: "Human-Object Interaction (HOI) multimodal animation framework capable of animating anchors interacting with handheld props, microphones, and studio tablets.",
      strengths: ["Human-object interaction mastery", "Decoupled arm & prop trajectory control", "Sparse skeletal guidance", "MMDiT temporal coherence"],
      repo_url: "https://github.com/Tencent/HunyuanVideo",
      weights_path: "checkpoints/homa",
      official_inference_supported: true,
      comfyui_required: false,
      agent_verdict: "Tier S- (HOI Specialist) - Excels at human-object interaction (props, tablets, mics) and decoupled arm-trajectory control."
    },
    {
      id: "moore-animateanyone",
      name: "Moore-AnimateAnyone",
      organization: "MooreThreads (HumanAIGC open reproduction)",
      architecture: "ReferenceNet + Spatial-Temporal Attention + DWPose / PoseGuider",
      paper_venue: "CVPR 2024 / Open Reproduction",
      recommended_fps: 25,
      default_resolution: "512x512",
      supported_resolutions: ["512x512", "720x1280"],
      input_driver: "driving_video",
      requires_pose_extractor: true,
      vram_gb: 10.0,
      vram_fp8_gb: 8.0,
      gpu_24gb_compatible: true,
      description: "Open-source reproduction of Animate Anyone utilizing DWPose/OpenPose guidance and ReferenceNet cross-attention for appearance continuity.",
      strengths: ["Established open baseline", "Broad OpenPose compatibility", "Consistent anchor attire", "Well-documented weights"],
      repo_url: "https://github.com/MooreThreads/Moore-AnimateAnyone.git",
      weights_path: "checkpoints/animate_anyone",
      official_inference_supported: true,
      comfyui_required: false,
      agent_verdict: "Tier B+ (Open Production Baseline) - Proven open-source reproduction with rock-solid community checkpoint support."
    },
    {
      id: "ltx-ripple",
      name: "LTX-2.5 Ripple (FFAF IC-LoRA)",
      organization: "WepeNerd / Lightricks",
      architecture: "LTX-2.5 DiT + First Frame All Frames (FFAF) IC-LoRA",
      paper_venue: "Community Release Feb 2026",
      recommended_fps: 30,
      default_resolution: "512x768",
      supported_resolutions: ["512x512", "512x768", "720x1280"],
      input_driver: "driving_video",
      requires_pose_extractor: false,
      vram_gb: 14.0,
      vram_fp8_gb: 10.0,
      gpu_24gb_compatible: true,
      description: "First Frame All Frames (FFAF) In-Context LoRA for LTX-2.5. Edits the first frame (wardrobe/persona) and ripples the transformation across all subsequent frames according to driving motion.",
      strengths: ["First Frame Outfit Ripple", "Natural Cloth Physics", "Zero ComfyUI Dependency", "Native Hardware NVENC Acceleration"],
      repo_url: "https://huggingface.co/WepeNerd/LTX-Ripple",
      weights_path: "storage/models/ltx-ripple/LTX25_Ripple_v11.safetensors",
      official_inference_supported: true,
      comfyui_required: false,
      agent_verdict: "Tier S (In-Context Ripple) - Flawless wardrobe propagation from a single reference image without 2D skeleton distortion."
    },
    {
      id: "champ",
      name: "Champ",
      organization: "Fudan University & ByteDance",
      architecture: "3D Parametric Guidance via SMPL-X Mesh + Depth/Normal Conditioned UNet",
      paper_venue: "CVPR 2024 (fudan-generative-vision/champ)",
      recommended_fps: 25,
      default_resolution: "512x512",
      supported_resolutions: ["512x512", "720x1280"],
      input_driver: "driving_video",
      requires_pose_extractor: true,
      vram_gb: 11.0,
      vram_fp8_gb: 8.5,
      gpu_24gb_compatible: true,
      description: "Controllable and consistent human image animation utilizing 3D parametric guidance (SMPL-X), rendering surface normals and depth maps to ensure geometric continuity.",
      strengths: ["3D SMPL-X parametric guidance", "No arm twisting or anatomical distortion", "Stable depth and surface normal rendering", "Robust garment handling"],
      repo_url: "https://github.com/fudan-generative-vision/champ.git",
      weights_path: "checkpoints/champ",
      official_inference_supported: true,
      comfyui_required: false,
      agent_verdict: "Tier A (3D Geometric Consistency) - SMPL-X 3D parametric guidance eliminates arm twist artifacts and anatomical warping."
    },
    {
      id: "liveanimate",
      name: "LiveAnimate",
      organization: "LiveAnimate Team (arXiv Aug 2026)",
      architecture: "14B Video DiT + Pose-Retrieval Sink Attention (PR-Sink) + Block-wise Self-Forcing Distillation",
      paper_venue: "arXiv Aug 2026 (liveanimate.github.io)",
      recommended_fps: 20,
      default_resolution: "720x1280",
      supported_resolutions: ["512x512", "720x1280"],
      input_driver: "driving_video",
      requires_pose_extractor: false,
      vram_gb: 16.0,
      vram_fp8_gb: 14.0,
      gpu_24gb_compatible: true,
      description: "Breakthrough real-time streaming human animation system operating at 20 FPS on 2x H100 with constant memory footprint and PR-Sink attention for infinite streaming.",
      strengths: ["20 FPS real-time streaming capability", "Pose-Retrieval Sink Attention (constant VRAM)", "14B DiT foundation", "Zero drift over long sessions"],
      repo_url: "https://liveanimate.github.io/",
      weights_path: "checkpoints/liveanimate",
      official_inference_supported: false,
      comfyui_required: false,
      agent_verdict: "Watch closely / code availability - 20 FPS real-time streaming 14B DiT with constant VRAM; tracking public weights/code drop."
    },
  ];

  return rawModels.map((m) => {
    let installed = false;
    let status: "ready" | "missing_weights" | "closed_weights" = "missing_weights";
    if (m.id === "wan-animate-2-distilled") {
      installed = true;
      status = "ready";
    } else if (m.id === "original-animate-anyone") {
      installed = false;
      status = "closed_weights";
    }
    return {
      ...m,
      weights_installed: m.weights_installed ?? installed,
      weights_status: m.weights_status ?? status,
    };
  });
}
