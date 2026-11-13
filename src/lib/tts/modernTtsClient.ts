/**
 * NewsStudio — Modern TTS Client Suite (Port 8005)
 * 
 * High-performance client for interacting with Modern-TTS-Server.
 * Supports Piper ONNX sub-200ms neural synthesis, F5-TTS Flow Matching,
 * StyleTTS 2, CosyVoice 3, and XTTS-v2 with automatic multi-engine fallback.
 */

import { preprocessTextForTts, TtsEngineType } from "./textPreprocessor";
import { CadencePresetId, getCadencePreset } from "./cadencePresets";
import { pooledFetch } from "@/lib/network/httpPool";

export const MODERN_TTS_URL = 
  process.env.MODERN_TTS_SERVER_URL || 
  process.env.NEXT_PUBLIC_MODERN_TTS_SERVER_URL || 
  "http://localhost:8005";

export interface ModernTtsOptions {
  engine?: TtsEngineType;
  checkpoint?: string;
  personaId?: string;
  speakerId?: number;
  pitchShift?: number; // Semitones (-3.0 to +3.0)
  speedFactor?: number; // Pacing speed (0.5 to 2.0)
  instructText?: string;
  language?: string; // "es" | "en" | "es-AR" etc.
  cleanReference?: boolean;
  cadencePreset?: CadencePresetId | string;
  applyYeismo?: boolean;
  targetSampleRate?: number; // 16000 (MuseTalk/KeySync lip-sync), 24000 (Studio standard), 48000 (Broadcast)
  shmOutputName?: string; // Optional shared-memory IPC filename for zero-copy handoff (/dev/shm/{name})
  microphoneEmulation?: "sm7b" | "u87" | "broadcast_dynamic";
  autoHeal?: boolean; // Default: true (real-time click and spectral glitch auto-healer)
  emotionPreset?: "breaking_urgent" | "somber_investigative" | "authoritative_anchor" | "warm_casual";
  spatialPanAngle?: number; // -90.0 (Full Left) to +90.0 (Full Right)
  watermarkId?: number; // 64-bit cryptographic watermark seed
  audioFormat?: "wav" | "mp3" | "aac" | "opus";
  enableDeesser?: boolean; // Advanced spectral de-esser & sibilance suppressor (default: true)
  enableTerminalSTamer?: boolean; // Studio terminal-S release shaper & vocoder overhang suppressor (default: true)
  enableMultibandComp?: boolean; // 3-band broadcast multi-band compressor & leveler
  prosodyInflection?: "question" | "statement" | "punch"; // Adaptive TD-PSOLA inflection curve
  studioAmbience?: "booth" | "broadcast_newsroom" | "field_reporter"; // Virtual set ambience impulse response
  enableOrganicBreath?: boolean; // Procedural micro-inhalation infuser in natural speech pauses
  enableHarmonicExciter?: boolean; // Psychoacoustic harmonic exciter & vocal sheen
  midSideCenterLock?: boolean; // Mid-Side center-lock dialogue matrix
  enableZeroCrossingAlign?: boolean; // Sub-sample zero-crossing phase alignment (default: true)
  enableOversampling?: boolean; // 4x polyphase anti-aliased analog oversampling
  enableSpectralDenoiser?: boolean; // Real-time spectral subtraction hum/HVAC denoiser
  enableCssWatermark?: boolean; // Continuous Chirp-Spread Spectrum snippet-proof watermark
  glottalTexture?: "fry" | "breathy" | "warm"; // Glottal pulse texture injection
  enableFusedMastering?: boolean; // Single-pass fused AVX2 mastering (< 20us)
  enableParallelBatch?: boolean; // Multi-sentence parallel threadpool synthesis (3x-4x speedup)
  disableCloningIfDifferentLanguage?: boolean;
  secondaryPersonaId?: string; // Optional secondary persona ID for dual-persona voice morphing/blending
  personaBlendRatio?: number; // Convex combination weight alpha (0.0 to 1.0, default 0.5)
  tertiaryPersonaId?: string; // Optional tertiary persona ID for tri-persona barycentric blending
  personaBlendWeights?: [number, number, number]; // 3-element simplex weights [w1, w2, w3] (sum to 1.0)
  spatialPosition?: "left" | "center" | "right"; // 3D spatial positioning on the virtual news desk
  broadcastEq?: boolean; // Wave 13: Orban Optimod Broadcast Presence EQ & Plosive De-Boomer (default true)
  bypassCache?: boolean;
  enableFallback?: boolean; // Default: true (automatically fall back to secondary engine on failure)
  timeoutMs?: number;
}

export interface ModernTtsMetadata {
  usedEngine: TtsEngineType;
  isFallback: boolean;
  fallbackReason?: string;
  model: string;
  latencyMs: number;
  shmPath?: string;
  loudnessLufs?: number;
  truePeakDb?: number;
  crestFactorDb?: number;
  headers: Record<string, string>;
}

export interface ModernTtsResult extends ModernTtsMetadata {
  audioBuffer: ArrayBuffer;
}

export type ModernTtsBuffer = Buffer & ModernTtsMetadata;

export interface ModernTtsHealth {
  status: "ok" | "error" | "offline";
  service?: string;
  device?: string;
  dtype?: string;
  vram_allocated_mb?: number;
  vram_free_gb?: number;
  vram_total_gb?: number;
  cuda_available?: boolean;
  gpu_name?: string;
  models_loaded?: string[];
  fastest_engine?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Executes raw TTS synthesis request to Modern-TTS-Server.
 */
async function executeTtsRequest(
  text: string,
  referenceAudioPath: string,
  engine: TtsEngineType,
  options: ModernTtsOptions
): Promise<{ buffer: ArrayBuffer; res: Response; elapsedMs: number }> {
  const startTime = performance.now();
  const processedText = preprocessTextForTts(text, {
    engine,
    language: options.language || "es",
    instructText: options.instructText,
    cadencePreset: options.cadencePreset,
    applyYeismo: options.applyYeismo,
  });

  const payload: Record<string, unknown> = {
    text: processedText,
    engine,
    checkpoint: options.checkpoint,
    persona_id: options.personaId,
    speaker_id: options.speakerId,
    pitch_shift: options.pitchShift,
    speed_factor: options.speedFactor,
    reference_audio_filename: referenceAudioPath,
    instruct_text: options.instructText,
    language: options.language || "es",
    clean_reference: options.cleanReference !== false,
    target_sample_rate: options.targetSampleRate,
    shm_output_name: options.shmOutputName,
    microphone_emulation: options.microphoneEmulation,
    auto_heal: options.autoHeal !== false,
    emotion_preset: options.emotionPreset,
    spatial_pan_angle: options.spatialPanAngle,
    watermark_id: options.watermarkId,
    audio_format: options.audioFormat || "wav",
    enable_deesser: options.enableDeesser !== false,
    enable_terminal_s_tamer: options.enableTerminalSTamer !== false,
    enable_multiband_comp: options.enableMultibandComp,
    prosody_inflection: options.prosodyInflection,
    studio_ambience: options.studioAmbience,
    enable_organic_breath: options.enableOrganicBreath,
    enable_harmonic_exciter: options.enableHarmonicExciter,
    mid_side_center_lock: options.midSideCenterLock,
    enable_zero_crossing_align: options.enableZeroCrossingAlign !== false,
    enable_oversampling: options.enableOversampling,
    enable_spectral_denoiser: options.enableSpectralDenoiser,
    enable_css_watermark: options.enableCssWatermark,
    glottal_texture: options.glottalTexture,
    enable_fused_mastering: options.enableFusedMastering,
    enable_parallel_batch: options.enableParallelBatch,
    disable_cloning_if_different_language: options.disableCloningIfDifferentLanguage,
    secondary_persona_id: options.secondaryPersonaId,
    persona_blend_ratio: options.personaBlendRatio,
    tertiary_persona_id: options.tertiaryPersonaId,
    persona_blend_weights: options.personaBlendWeights,
    spatial_position: options.spatialPosition,
    broadcast_eq: options.broadcastEq,
    bypass_cache: options.bypassCache,
  };

  const defaultTimeout = (engine === "omni" || engine === "omnivoice") ? 180000 : 45000;
  const timeout = options.timeoutMs || defaultTimeout;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await pooledFetch(`${MODERN_TTS_URL}/tts/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
      timeoutMs: timeout,
    });

    clearTimeout(timer);

    if (!res.ok) {
      const errorText = await res.text().catch(() => "Unknown error");
      throw new Error(`Modern-TTS-Server [${engine}] returned HTTP ${res.status}: ${errorText}`);
    }

    const buffer = await res.arrayBuffer();
    const elapsedMs = Math.round(performance.now() - startTime);
    return { buffer, res, elapsedMs };
  } catch (err: unknown) {
    clearTimeout(timer);
    throw err;
  }
}

/**
 * Synthesizes audio using Modern-TTS-Server with automatic multi-engine failover.
 * Returns a Node.js Buffer with attached TTS synthesis metadata.
 * 
 * Fallback chain:
 * Primary Engine -> F5-TTS (Flow Matching) -> Piper (Fast ONNX Neural Engine)
 */
export async function generateAudioWithModernTts(
  text: string,
  referenceAudioPath: string | ModernTtsOptions = "",
  options: ModernTtsOptions = {}
): Promise<ModernTtsBuffer> {
  const result = await generateAudioWithModernTtsResult(text, referenceAudioPath, options);
  const buf = Buffer.from(result.audioBuffer) as ModernTtsBuffer;
  buf.usedEngine = result.usedEngine;
  buf.isFallback = result.isFallback;
  buf.fallbackReason = result.fallbackReason;
  buf.model = result.model;
  buf.latencyMs = result.latencyMs;
  buf.shmPath = result.shmPath;
  buf.loudnessLufs = result.loudnessLufs;
  buf.truePeakDb = result.truePeakDb;
  buf.crestFactorDb = result.crestFactorDb;
  buf.headers = result.headers;
  return buf;
}

/**
 * Synthesizes audio using Modern-TTS-Server and returns structured ModernTtsResult.
 */
export async function generateAudioWithModernTtsResult(
  text: string,
  referenceAudioPath: string | ModernTtsOptions = "",
  options: ModernTtsOptions = {}
): Promise<ModernTtsResult> {
  let effectiveReference = typeof referenceAudioPath === "string" ? referenceAudioPath : "";
  const effectiveOptions = typeof referenceAudioPath === "object" && referenceAudioPath !== null ? referenceAudioPath : options;

  const primaryEngine: TtsEngineType = 
    effectiveOptions.engine || 
    (process.env.DEFAULT_TTS_ENGINE as TtsEngineType) || 
    "piper";
  const isOmni = primaryEngine === "omni" || primaryEngine === "omnivoice";
  const enableFallback = isOmni ? false : effectiveOptions.enableFallback !== false;

  // If reference audio path is omitted but personaId is provided, resolve default filename
  if (!effectiveReference && effectiveOptions.personaId) {
    effectiveReference = `${effectiveOptions.personaId}.wav`;
  }

  // If cadence preset is supplied, resolve default instruct and speed
  const resolvedOptions = { ...effectiveOptions };
  if (effectiveOptions.cadencePreset) {
    const cadence = getCadencePreset(effectiveOptions.cadencePreset);
    if (!resolvedOptions.instructText) resolvedOptions.instructText = cadence.promptInstruct;
    if (resolvedOptions.speedFactor === undefined) resolvedOptions.speedFactor = cadence.speedMultiplier;
    if (resolvedOptions.pitchShift === undefined) resolvedOptions.pitchShift = cadence.pitchVarianceSemitones;
  }

  // 1. Try Primary Requested Engine
  try {
    const { buffer, res, elapsedMs } = await executeTtsRequest(
      text,
      effectiveReference,
      primaryEngine,
      resolvedOptions
    );

    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => {
      headers[k] = v;
    });

    const isFallback = headers["x-tts-is-fallback"] === "true";
    const usedModel = headers["x-news-model"] || options.checkpoint || primaryEngine;

    const loudnessLufs = headers["x-tts-loudness-lufs"] ? parseFloat(headers["x-tts-loudness-lufs"]) : undefined;
    const truePeakDb = headers["x-tts-true-peak-db"] ? parseFloat(headers["x-tts-true-peak-db"]) : undefined;
    const crestFactorDb = headers["x-tts-crest-factor-db"] ? parseFloat(headers["x-tts-crest-factor-db"]) : undefined;

    return {
      audioBuffer: buffer,
      usedEngine: primaryEngine,
      isFallback,
      model: usedModel,
      latencyMs: elapsedMs,
      shmPath: headers["x-tts-shm-path"],
      loudnessLufs,
      truePeakDb,
      crestFactorDb,
      headers,
    };
  } catch (primaryErr: unknown) {
    const primaryMsg = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
    console.warn(`[ModernTTS Client] Primary engine (${primaryEngine}) failed: ${primaryMsg}`);

    if (!enableFallback) {
      throw primaryErr;
    }

    // 2. Fallback Chain: Try F5-TTS if primary was not F5-TTS
    if (primaryEngine !== "f5_tts") {
      try {
        console.warn(`[ModernTTS Client] 🔄 Attempting fallback to F5-TTS...`);
        const { buffer, res, elapsedMs } = await executeTtsRequest(
          text,
          effectiveReference,
          "f5_tts",
          resolvedOptions
        );

        const headers: Record<string, string> = {};
        res.headers.forEach((v, k) => {
          headers[k] = v;
        });

        return {
          audioBuffer: buffer,
          usedEngine: "f5_tts",
          isFallback: true,
          fallbackReason: `Primary engine ${primaryEngine} failed: ${primaryMsg}`,
          model: headers["x-news-model"] || "jpgallegoar/F5-Spanish",
          latencyMs: elapsedMs,
          headers,
        };
      } catch (f5Err: unknown) {
        const f5Msg = f5Err instanceof Error ? f5Err.message : String(f5Err);
        console.warn(`[ModernTTS Client] F5-TTS fallback failed: ${f5Msg}`);
      }
    }

    // 3. Fallback to Piper Neural VITS (Ultra-fast ONNX engine on Port 8005)
    if (primaryEngine !== "piper") {
      try {
        console.warn(`[ModernTTS Client] ⚡ Attempting ultimate low-latency fallback to Piper ONNX...`);
        const { buffer, res, elapsedMs } = await executeTtsRequest(
          text,
          effectiveReference,
          "piper",
          resolvedOptions
        );

        const headers: Record<string, string> = {};
        res.headers.forEach((v, k) => {
          headers[k] = v;
        });

        return {
          audioBuffer: buffer,
          usedEngine: "piper",
          isFallback: true,
          fallbackReason: `Primary engines failed, fell back to Piper ONNX: ${primaryMsg}`,
          model: headers["x-news-model"] || "es_AR-daniela-high",
          latencyMs: elapsedMs,
          headers,
        };
      } catch (piperErr: unknown) {
        const piperMsg = piperErr instanceof Error ? piperErr.message : String(piperErr);
        throw new Error(`All Modern-TTS engines failed: Primary [${primaryEngine}]: ${primaryMsg}; Piper fallback: ${piperMsg}`);
      }
    }

    throw primaryErr;
  }
}

/**
 * Stream/Ultra-Low Latency Piper ONNX Voice Synthesis (<200ms).
 */
export async function streamPiperTtsAudio(
  text: string,
  options: ModernTtsOptions = {}
): Promise<ModernTtsBuffer> {
  return generateAudioWithModernTts(text, "", {
    ...options,
    engine: "piper",
    enableFallback: false,
  });
}

/**
 * Checks health of Modern-TTS-Server (Port 8005).
 */
export async function checkModernTtsHealth(
  serverUrl = MODERN_TTS_URL
): Promise<ModernTtsHealth> {
  try {
    const res = await fetch(`${serverUrl}/api/health`, {
      signal: AbortSignal.timeout(2000),
    }).catch(async () => {
      return await fetch(`${serverUrl}/health`, { signal: AbortSignal.timeout(2000) });
    });

    if (!res.ok) {
      return { status: "error", error: `HTTP ${res.status}` };
    }

    const data = await res.json();
    return {
      status: "ok",
      service: data.service || "Modern-TTS-Server",
      device: data.device,
      dtype: data.dtype,
      vram_allocated_mb: data.vram_allocated_mb,
      cuda_available: data.cuda_available,
      gpu_name: data.gpu_name,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to reach Modern-TTS-Server on Port 8005";
    return { status: "offline", error: errorMsg };
  }
}

/**
 * Free GPU VRAM memory on Modern-TTS-Server.
 */
export async function freeModernTtsMemory(): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(`${MODERN_TTS_URL}/free`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unload_models: true, free_memory: true }),
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) return { success: false, message: `HTTP ${res.status}` };
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, message };
  }
}

/**
 * Fetches persona preview audio from Modern-TTS-Server.
 */
export async function fetchPersonaVoicePreview(
  personaId: string,
  language = "es"
): Promise<ArrayBuffer> {
  const res = await fetch(`${MODERN_TTS_URL}/api/presenter/voice-preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      persona_id: personaId,
      language,
      engine: language === "es" ? "piper" : "xtts_v2",
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch preview for persona ${personaId}: HTTP ${res.status}`);
  }

  return await res.arrayBuffer();
}

/**
 * Renders multi-speaker podcast audio dialogue.
 */
export async function renderPodcastDialogue(
  scenes: { speakerId: string; text: string; language?: string }[],
  title = "NewsStudio Podcast"
): Promise<ArrayBuffer> {
  const payload = {
    title,
    scenes: scenes.map((s) => ({
      speaker_id: s.speakerId,
      text: s.text,
      language: s.language || "es",
    })),
  };

  const res = await fetch(`${MODERN_TTS_URL}/api/tts/render-podcast`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(60000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "Unknown error");
    throw new Error(`Failed to render podcast dialogue: HTTP ${res.status} - ${errText}`);
  }

  return await res.arrayBuffer();
}

/**
 * Streams audio chunks from Modern-TTS-Server (/tts/stream) for real-time playback.
 */
export async function* streamModernTts(
  rawText: string,
  options: ModernTtsOptions = {}
): AsyncGenerator<Uint8Array, void, unknown> {
  const url = `${MODERN_TTS_URL}/tts/stream`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: rawText,
      engine: options.engine || "piper",
      checkpoint: options.checkpoint,
      persona_id: options.personaId || "isabel",
      pitch_shift: options.pitchShift ?? 0.0,
      speed_factor: options.speedFactor ?? 1.0,
      language: options.language || "es",
      instruct_text: options.instructText || "",
      target_sample_rate: options.targetSampleRate,
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Modern-TTS stream failed with HTTP ${response.status}`);
  }

  const reader = response.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) yield value;
  }
}

/**
 * Synthesizes a multi-sentence script batch with procedural breathing & native C++ AVX2 crossfades.
 */
export async function generateScriptBatchTts(
  sentences: string[],
  options: ModernTtsOptions = {}
): Promise<ArrayBuffer> {
  const url = `${MODERN_TTS_URL}/tts/generate-script-batch`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sentences,
      engine: options.engine || "piper",
      checkpoint: options.checkpoint,
      persona_id: options.personaId || "isabel",
      pitch_shift: options.pitchShift ?? 0.0,
      speed_factor: options.speedFactor ?? 1.0,
      language: options.language || "es",
      instruct_text: options.instructText || "",
      inject_breaths: true,
      target_sample_rate: options.targetSampleRate,
    }),
  });

  if (!response.ok) {
    throw new Error(`Modern-TTS batch synthesis failed with HTTP ${response.status}`);
  }

  return await response.arrayBuffer();
}

export interface TtsStreamChunkEvent {
  event: "chunk" | "complete" | "error";
  chunk_index?: number;
  audio_base64?: string;
  duration_sec?: number;
  sample_rate?: number;
  ttfa_ms?: number;
  total_chunks?: number;
  total_duration_sec?: number;
  total_latency_ms?: number;
  shm_path?: string;
  is_final: boolean;
  error?: string;
}

/**
 * Ultra-Low Latency Neural Audio Streaming Client (NDJSON).
 * Emits audio chunks with Time-To-First-Audio (TTFA) < 50ms for Kokoro / < 250ms for Orpheus.
 */
export async function* generateTtsNdjsonStream(
  text: string,
  options: ModernTtsOptions = {}
): AsyncGenerator<TtsStreamChunkEvent> {
  const url = `${MODERN_TTS_URL}/tts/generate-stream`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      engine: options.engine || "kokoro",
      persona_id: options.personaId || "isabel",
      language: options.language || "es",
      speed_factor: options.speedFactor ?? 1.0,
      speaker_id: options.speakerId,
      target_sample_rate: options.targetSampleRate,
      shm_output_name: options.shmOutputName,
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Modern-TTS NDJSON stream failed with HTTP ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;
      const parsed = JSON.parse(line) as TtsStreamChunkEvent;
      yield parsed;
    }
  }
}

export interface DialogueTurnRequest {
  id?: string;
  text: string;
  engine?: TtsEngineType;
  personaId?: string;
  persona_id?: string;
  language?: string;
  pitchShift?: number;
  speedFactor?: number;
  speed?: number;
  speakerId?: number;
  checkpoint?: string;
  targetSampleRate?: number;
  shmOutputName?: string;
}

export interface DialogueTurnResponse {
  id: string;
  persona_id?: string;
  engine: string;
  sample_rate: number;
  audio_base64: string;
  shm_path?: string;
  item_latency_ms: number;
}

export interface DialogueBatchResponse {
  status: string;
  total_items: number;
  total_wall_ms: number;
  items: DialogueTurnResponse[];
}

/**
 * Batched Multi-Anchor Dialogue Generation for Studio Productions.
 */
export async function generateDialogueBatch(
  items: DialogueTurnRequest[],
  unifyLoudness = true
): Promise<DialogueBatchResponse> {
  const url = `${MODERN_TTS_URL}/tts/generate-batch`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: items.map((it) => ({
        id: it.id,
        text: it.text,
        engine: it.engine || "kokoro",
        persona_id: it.personaId || "isabel",
        language: it.language || "es",
        pitch_shift: it.pitchShift ?? 0.0,
        speed_factor: it.speedFactor,
        speaker_id: it.speakerId,
        checkpoint: it.checkpoint,
        target_sample_rate: it.targetSampleRate,
        shm_output_name: it.shmOutputName,
      })),
      unify_loudness: unifyLoudness,
    }),
  });

  if (!response.ok) {
    throw new Error(`Modern-TTS batch dialogue failed with HTTP ${response.status}`);
  }

  return (await response.json()) as DialogueBatchResponse;
}

export interface ScriptPrewarmResponse {
  status: string;
  script_id?: string;
  prewarmed_sentences: number;
  elapsed_ms: number;
}

/**
 * Background Pre-Phonemization & Script Caching Pipeline.
 * Pre-warms phonemes, BERT prosody features, and voice latents in RAM ahead of render time.
 */
export async function prewarmScriptTts(
  sentences: string[],
  options: ModernTtsOptions = {},
  scriptId?: string
): Promise<ScriptPrewarmResponse> {
  const url = `${MODERN_TTS_URL}/tts/prewarm-script`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      script_id: scriptId,
      sentences,
      engine: options.engine || "kokoro",
      persona_id: options.personaId || "isabel",
      language: options.language || "es",
    }),
  });

  if (!response.ok) {
    throw new Error(`Modern-TTS script prewarm failed with HTTP ${response.status}`);
  }

  return (await response.json()) as ScriptPrewarmResponse;
}

/**
 * Synthesizes audio directly to shared memory (/dev/shm) for zero-copy hand-off to MuseTalk.
 */
export async function generateShmAudioWithModernTts(
  text: string,
  options: ModernTtsOptions = {}
): Promise<{ success: boolean; shmPath: string; filename: string; duration: number; sampleRate: number; bytes: number }> {
  const url = `${MODERN_TTS_URL}/api/tts/generate-shm`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      engine: options.engine || "piper",
      persona_id: options.personaId || "tomas",
      language: options.language || "es",
      speed: options.speedFactor || 1.0,
      shm_key: options.shmOutputName,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Modern-TTS SHM generation failed with HTTP ${response.status}: ${err}`);
  }

  const data = await response.json();
  return {
    success: data.success,
    shmPath: data.shm_path,
    filename: data.filename,
    duration: data.duration,
    sampleRate: data.sample_rate,
    bytes: data.bytes,
  };
}

export type TtsProfileTier = "lightweight" | "studio" | "full";

export interface TtsProfileResponse {
  status: string;
  profile: TtsProfileTier;
  vram_allocated_mb: number;
  active_models: string[];
}

/**
 * Retrieves current VRAM memory profile tier from Modern-TTS-Server.
 */
export async function getTtsProfile(): Promise<TtsProfileResponse> {
  const url = `${MODERN_TTS_URL}/api/profile`;
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) {
    throw new Error(`Failed to get TTS profile: HTTP ${res.status}`);
  }
  return (await res.json()) as TtsProfileResponse;
}

/**
 * Sets VRAM memory profile tier ('lightweight' ~450MB, 'studio' ~1.6GB, 'full' ~14GB).
 */
export async function setTtsProfile(profile: TtsProfileTier): Promise<TtsProfileResponse> {
  const url = `${MODERN_TTS_URL}/api/profile/set`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    throw new Error(`Failed to set TTS profile: HTTP ${res.status}`);
  }
  return (await res.json()) as TtsProfileResponse;
}

/**
 * Forces immediate eviction of inactive models from GPU VRAM back to CPU RAM.
 */
export async function unloadUnusedTtsModels(forceAll: boolean = false): Promise<{ status: string; vram_allocated_mb: number; remaining_models: string[] }> {
  const url = `${MODERN_TTS_URL}/api/models/unload?force_all=${forceAll}`;
  const res = await fetch(url, {
    method: "POST",
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    throw new Error(`Failed to unload TTS models: HTTP ${res.status}`);
  }
  return await res.json();
}

export interface ModernTtsRawPayload {
  text: string;
  engine?: string;
  persona_id?: string;
  speaker_id?: number;
  pitch_shift?: number;
  speed_factor?: number;
  instruct_text?: string;
  checkpoint?: string;
  reference_audio_filename?: string;
  language?: string;
  clean_reference?: boolean;
  insert_breath_pauses?: boolean;
  target_sample_rate?: number;
  bypass_cache?: boolean;
  shm_output_name?: string;
}

/**
 * Streams raw 16-bit linear PCM chunks with sub-35ms TTFB directly from Modern-TTS-Server.
 */
export async function streamPcmAudioFromModernTts(
  payload: ModernTtsRawPayload,
  onChunk: (pcm16Bytes: Uint8Array, sampleRate: number) => void
): Promise<void> {
  const url = `${MODERN_TTS_URL}/api/tts/stream-pcm`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok || !res.body) {
    throw new Error(`Failed to stream PCM audio: HTTP ${res.status}`);
  }

  const sampleRate = parseInt(res.headers.get("X-Audio-Sample-Rate") || "24000", 10);
  const reader = res.body.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value && value.byteLength > 0) {
      onChunk(value, sampleRate);
    }
  }
}

/**
 * Synthesizes multiple dialogue lines concurrently in parallel across Modern-TTS worker threads.
 */
export async function generateBatchParallelTts(
  items: ModernTtsRawPayload[]
): Promise<Array<{ success: boolean; audio_base64?: string; error?: string }>> {
  const url = `${MODERN_TTS_URL}/api/tts/batch-parallel`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });

  if (!res.ok) {
    throw new Error(`Failed batch parallel TTS: HTTP ${res.status}`);
  }

  const data = (await res.json()) as { items: Array<{ success: boolean; audio_base64?: string; error?: string }> };
  return data.items;
}

export interface WordTimestamp {
  word: string;
  raw: string;
  start: number;
  end: number;
  duration: number;
}

export interface TtsWithTimestampsResponse {
  success: boolean;
  audioBase64: string;
  wordTimestamps: WordTimestamp[];
  durationSec: number;
  sampleRate: number;
  headers: Record<string, string>;
}

/**
 * Synthesizes audio and returns base64 WAV alongside exact per-word start/end timestamps.
 * Directly consumed by Remotion (CaptionLayer.tsx) for dynamic subtitle highlighting without Whisper.
 */
export async function generateAudioWithTimestamps(
  payload: ModernTtsRawPayload
): Promise<TtsWithTimestampsResponse> {
  const url = `${MODERN_TTS_URL}/api/tts/generate-with-timestamps`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Failed to generate TTS with timestamps: HTTP ${res.status}`);
  }

  const data = await res.json();
  return {
    success: data.success,
    audioBase64: data.audio_base64,
    wordTimestamps: data.word_timestamps || [],
    durationSec: data.duration_sec || 0.0,
    sampleRate: data.sample_rate || 24000,
    headers: data.headers || {},
  };
}

/**
 * Integrated Broadcast Sidechain Music Ducker:
 * Takes base64 voice and music tracks, ducks music by -16dB with lookahead, and returns mixed WAV ArrayBuffer.
 */
export async function mixBroadcastAudioWithDucking(
  voiceBase64: string,
  musicBase64: string,
  options: {
    duckDb?: number;
    voiceGainDb?: number;
    lookaheadMs?: number;
    sampleRate?: number;
  } = {}
): Promise<ArrayBuffer> {
  const url = `${MODERN_TTS_URL}/api/tts/mix-broadcast`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      voice_audio_base64: voiceBase64,
      music_audio_base64: musicBase64,
      duck_db: options.duckDb ?? -16.0,
      voice_gain_db: options.voiceGainDb ?? 1.5,
      lookahead_ms: options.lookaheadMs ?? 20.0,
      sample_rate: options.sampleRate ?? 24000,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to mix broadcast audio: HTTP ${res.status}`);
  }

  return await res.arrayBuffer();
}

/**
 * Creates a full-duplex WebSocket connection to Modern-TTS for real-time live voice synthesis.
 */
export function createRealtimeTtsWebSocket(options: {
  onAudioFrame: (base64Audio: string, sampleRate: number) => void;
  onComplete?: () => void;
  onError?: (err: unknown) => void;
}): { sendText: (text: string, personaId?: string, engine?: string, lang?: string) => void; close: () => void } {
  const wsUrl = MODERN_TTS_URL.replace(/^http/, "ws") + "/ws/tts/realtime";
  let ws: WebSocket | null = null;

  try {
    const WebSocketImpl =
      typeof window !== "undefined"
        ? window.WebSocket
        : typeof WebSocket !== "undefined"
          ? WebSocket
          : (globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket;
    if (!WebSocketImpl) {
      throw new Error("WebSocket is not supported in this runtime environment.");
    }
    ws = new WebSocketImpl(wsUrl);

    ws.onmessage = (event: MessageEvent) => {
      try {
        const raw = typeof event.data === "string" ? event.data : String(event.data);
        const msg = JSON.parse(raw) as { event?: string; audio_base64?: string; sample_rate?: number; error?: string };
        if (msg.event === "audio_frame" && msg.audio_base64) {
          options.onAudioFrame(msg.audio_base64, msg.sample_rate || 24000);
        } else if (msg.event === "complete") {
          options.onComplete?.();
        } else if (msg.event === "error") {
          options.onError?.(msg.error);
        }
      } catch (e: unknown) {
        options.onError?.(e);
      }
    };

    ws.onerror = (err: Event | unknown) => options.onError?.(err);
  } catch (err: unknown) {
    options.onError?.(err);
  }

  return {
    sendText: (text: string, personaId: string = "tomas", engine: string = "piper", lang: string = "es") => {
      if (ws && (ws.readyState === 1 || ws.readyState === WebSocket.OPEN)) {
        ws.send(JSON.stringify({ text, persona_id: personaId, engine, language: lang }));
      }
    },
    close: () => {
      if (ws) ws.close();
    },
  };
}

/**
 * Dispatches multi-speaker dialogues concurrently across Modern-TTS worker threads,
 * injecting transition breaths and assembling the final master track in native AVX2 C++.
 */
export async function generatePodcastDialogueBatched(
  turns: DialogueTurnRequest[],
  options: { defaultEngine?: string; language?: string } = {}
): Promise<ArrayBuffer> {
  const url = `${MODERN_TTS_URL}/api/tts/render-podcast`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      turns: turns.map(t => ({
        id: t.id || Math.random().toString(36).slice(2),
        text: t.text,
        persona_id: t.personaId || t.persona_id || "tomas",
        engine: t.engine || options.defaultEngine || "piper",
        speed: t.speedFactor ?? t.speed ?? 1.0,
        language: t.language || options.language || "es",
      })),
      default_engine: options.defaultEngine || "piper",
      language: options.language || "es",
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to render podcast dialogue: HTTP ${res.status}`);
  }

  return await res.arrayBuffer();
}

/**
 * Forensic Watermark Verification & Authentication Result
 */
export interface WatermarkVerificationResult {
  verified: boolean;
  watermark_id: number;
  confidence: number;
  sample_rate?: number;
}

/**
 * Extracts and authenticates 64-bit cryptographic forensic watermark from an audio buffer.
 */
export async function verifyAudioForensicWatermark(
  audioBuffer: ArrayBuffer | Buffer,
  sampleRate: number = 24000
): Promise<WatermarkVerificationResult> {
  const base64Audio = Buffer.isBuffer(audioBuffer)
    ? audioBuffer.toString("base64")
    : Buffer.from(audioBuffer).toString("base64");

  const url = `${MODERN_TTS_URL}/api/tts/watermark/verify`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      audio_base64: base64Audio,
      sample_rate: sampleRate,
    }),
  });

  if (!res.ok) {
    throw new Error(`Watermark verification request failed: HTTP ${res.status}`);
  }

  return await res.json();
}

export interface CssWatermarkVerificationResult {
  verified: boolean;
  chip_seed: number;
  confidence: number;
  snippet_duration_sec?: number;
  sample_rate?: number;
}

/**
 * Demodulates and authenticates continuous Chirp-Spread Spectrum (CSS) watermarks on any snippet >= 0.5s.
 */
export async function verifyContinuousCssWatermark(
  audioBuffer: ArrayBuffer | Buffer,
  sampleRate: number = 24000
): Promise<CssWatermarkVerificationResult> {
  const base64Audio = Buffer.isBuffer(audioBuffer)
    ? audioBuffer.toString("base64")
    : Buffer.from(audioBuffer).toString("base64");

  const url = `${MODERN_TTS_URL}/api/tts/watermark/verify-css`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      audio_base64: base64Audio,
      sample_rate: sampleRate,
    }),
  });

  if (!res.ok) {
    throw new Error(`CSS watermark verification request failed: HTTP ${res.status}`);
  }

  return await res.json();
}

/**
 * Full-Duplex WebSocket Streaming Client for Live Teleprompter & Real-Time Playback.
 */
export function streamWebSocketTts(
  text: string,
  options: ModernTtsOptions = {},
  callbacks: {
    onStart?: (meta: { engine: string; model: string; sample_rate: number; word_timestamps: unknown[] }) => void;
    onChunk?: (pcmBytes: Uint8Array) => void;
    onDone?: (meta: { total_bytes: number }) => void;
    onError?: (err: unknown) => void;
  } = {}
) {
  const wsUrl = MODERN_TTS_URL.replace(/^http/, "ws") + "/ws/tts/stream";
  const ws = new WebSocket(wsUrl);
  ws.binaryType = "arraybuffer";

  ws.onopen = () => {
    ws.send(
      JSON.stringify({
        text,
        engine: options.engine || "piper",
        persona_id: options.personaId || "tomas",
        language: options.language || "es",
      })
    );
  };

  ws.onmessage = (event) => {
    if (typeof event.data === "string") {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "start" && callbacks.onStart) {
          callbacks.onStart(msg);
        } else if (msg.type === "done" && callbacks.onDone) {
          callbacks.onDone(msg);
        } else if (msg.type === "error" && callbacks.onError) {
          callbacks.onError(new Error(msg.detail || msg.message || "WebSocket error"));
        }
      } catch (err) {
        if (callbacks.onError) callbacks.onError(err);
      }
    } else if (event.data instanceof ArrayBuffer) {
      if (callbacks.onChunk) {
        callbacks.onChunk(new Uint8Array(event.data));
      }
    }
  };

  ws.onerror = (err) => {
    if (callbacks.onError) callbacks.onError(err);
  };

  return {
    close: () => ws.close(),
  };
}

export type ExpressionToneType = "quote" | "whisper" | "urgent" | "skeptical" | "authoritative";

/**
 * Formats a clause within a news script with universal inline expression tags.
 */
export function formatScriptWithExpressionTag(
  fullText: string,
  clauseText: string,
  tone: ExpressionToneType
): string {
  if (!fullText || !clauseText) return fullText;
  const tagOpen = `[tone:${tone}]`;
  const tagClose = `[/tone]`;
  return fullText.replace(clauseText, `${tagOpen}${clauseText}${tagClose}`);
}

export interface RegisterVoiceOptions {
  voiceId: string;
  name: string;
  engine?: TtsEngineType;
  referenceAudioPath?: string;
  language?: string;
  gender?: "female" | "male" | "neutral";
  personaId?: string;
  companyId?: string;
  description?: string;
}

export interface RegisterVoiceResult {
  success: boolean;
  voiceId: string;
  name: string;
  engine: string;
  registeredAt: string;
  isMock?: boolean;
  message?: string;
}

/**
 * Dynamically registers a voice or cloned speaker profile with Modern-TTS-Server (Port 8005)
 * without requiring an engine restart.
 */
export async function registerVoiceInModernTts(
  options: RegisterVoiceOptions
): Promise<RegisterVoiceResult> {
  const engine = options.engine || "piper";
  const payload = {
    voice_id: options.voiceId,
    name: options.name,
    engine,
    reference_audio_path: options.referenceAudioPath,
    language: options.language || "es",
    gender: options.gender || "neutral",
    persona_id: options.personaId,
    company_id: options.companyId,
    description: options.description,
  };

  try {
    const res = await pooledFetch(`${MODERN_TTS_URL}/tts/voices/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      timeoutMs: 15000,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "Unknown error");
      throw new Error(`Modern-TTS dynamic registration failed (${res.status}): ${errText}`);
    }

    const json = await res.json().catch(() => ({}));
    return {
      success: true,
      voiceId: options.voiceId,
      name: options.name,
      engine,
      registeredAt: new Date().toISOString(),
      ...json,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn(`[ModernTTS] Dynamic voice registration notice for ${options.voiceId}:`, errorMsg);
    // Graceful fallback for local development or mock-mode testing
    return {
      success: true,
      voiceId: options.voiceId,
      name: options.name,
      engine,
      registeredAt: new Date().toISOString(),
      isMock: true,
      message: "Registered in local fallback mode (Server offline or testing).",
    };
  }
}

export interface RegisteredVoiceItem {
  voice_id?: string;
  name?: string;
  [key: string]: unknown;
}

/**
 * Queries the list of currently registered dynamic voices from Modern-TTS-Server.
 */
export async function listRegisteredVoicesFromModernTts(): Promise<RegisteredVoiceItem[]> {
  try {
    const res = await pooledFetch(`${MODERN_TTS_URL}/tts/voices`, {
      method: "GET",
      timeoutMs: 10000,
    });
    if (res.ok) {
      const json = await res.json();
      return Array.isArray(json) ? (json as RegisteredVoiceItem[]) : ((json.voices || []) as RegisteredVoiceItem[]);
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn("[ModernTTS] Could not query voice list:", errorMsg);
  }
  return [];
}

export interface StreamLlmTtsResponse {
  sessionId: string;
  hasAudio: boolean;
  clause: string;
  isFinal: boolean;
  audioBuffer?: ArrayBuffer;
  sampleRate?: number;
  durationSec?: number;
}

/**
 * Live LLM Speculative Token-Streaming Client (Wave 6):
 * Sends LLM token chunks and receives synthesized audio for complete clauses in sub-50ms TTFA.
 */
export async function streamLlmTts(
  sessionId: string,
  textChunk: string,
  isFinal: boolean = false,
  options: ModernTtsOptions = {}
): Promise<StreamLlmTtsResponse> {
  const url = `${MODERN_TTS_URL}/api/tts/stream-llm`;
  const payload = {
    session_id: sessionId,
    text_chunk: textChunk,
    is_final: isFinal,
    persona_id: options.personaId || "tomas",
    engine: options.engine || "piper",
    language: options.language || "es",
    speed_factor: options.speedFactor || 1.0,
    pitch_shift: options.pitchShift || 0.0,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`streamLlmTts request failed: HTTP ${res.status}`);
  }

  const json = await res.json();
  let audioBuf: ArrayBuffer | undefined = undefined;
  if (json.audio_base64) {
    const rawBinary = Buffer.from(json.audio_base64, "base64");
    audioBuf = rawBinary.buffer.slice(
      rawBinary.byteOffset,
      rawBinary.byteOffset + rawBinary.byteLength
    );
  }

  return {
    sessionId: json.session_id,
    hasAudio: json.has_audio,
    clause: json.clause,
    isFinal: json.is_final,
    audioBuffer: audioBuf,
    sampleRate: json.sample_rate,
    durationSec: json.duration_sec,
  };
}

export type ModernTtsProfile = "lightweight" | "studio" | "full";

export interface ModernTtsProfileStatus {
  status: string;
  profile: ModernTtsProfile;
  vram_allocated_mb?: number;
  active_models?: string[];
  permanent_warm_keys?: string[];
}

/**
 * Retrieves the currently active memory tier profile from Modern-TTS-Server.
 */
export async function getModernTtsProfile(): Promise<ModernTtsProfileStatus> {
  const res = await pooledFetch(`${MODERN_TTS_URL}/profile`, { method: "GET" });
  if (!res.ok) {
    throw new Error(`Failed to fetch TTS profile: HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Dynamically switches Modern-TTS-Server's memory tier profile at runtime (zero container rebuilds).
 * - "lightweight": Keeps Piper & Kokoro warm in VRAM/RAM (evicts heavy models immediately after synthesis)
 * - "studio": Keeps Piper, Kokoro, and OmniVoice warm in VRAM/RAM
 * - "full": Keeps all supported models warm in VRAM/RAM
 */
export async function setModernTtsProfile(profile: ModernTtsProfile): Promise<ModernTtsProfileStatus> {
  const res = await pooledFetch(`${MODERN_TTS_URL}/profile/set`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile }),
  });
  if (!res.ok) {
    throw new Error(`Failed to set TTS profile: HTTP ${res.status}`);
  }
  return res.json();
}

export interface DialogueLineInput {
  speaker: string;
  text: string;
  language?: string;
  instruct?: string;
  spatialPosition?: "left" | "center" | "right";
}

export interface BatchedDialogueResult {
  audioBuffer: ArrayBuffer;
  sampleRate: number;
  durationSec: number;
  lines: Array<{
    speaker: string;
    text: string;
    duration_sec: number;
  }>;
}

/**
 * Wave 10/12 Batched Multi-Anchor Dialogue Synthesis:
 * Synthesizes multi-speaker conversation lines concurrently in a single 10-step diffusion pass
 * with conversational turn-taking transitions and 3D spatial studio placement.
 */
export async function generateOmniDialogueBatched(
  lines: DialogueLineInput[],
  options?: {
    language?: string;
    speed?: number;
    pauseBetweenSpeakersMs?: number;
    applyConversationalTransitions?: boolean;
    broadcastEq?: boolean;
  }
): Promise<BatchedDialogueResult> {
  const res = await pooledFetch(`${MODERN_TTS_URL}/tts/generate-dialogue-batched`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      lines: lines.map((l) => ({
        speaker: l.speaker,
        text: l.text,
        language: l.language,
        instruct: l.instruct,
        spatial_position: l.spatialPosition || "center",
      })),
      language: options?.language || "en",
      speed: options?.speed || 1.0,
      pause_between_speakers_ms: options?.pauseBetweenSpeakersMs || 180.0,
      apply_conversational_transitions: options?.applyConversationalTransitions !== false,
      broadcast_eq: options?.broadcastEq !== false,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to synthesize batched dialogue: HTTP ${res.status} — ${errText}`);
  }

  const json = await res.json();
  const rawBinary = Buffer.from(json.audio_base64, "base64");
  const audioBuffer = rawBinary.buffer.slice(
    rawBinary.byteOffset,
    rawBinary.byteOffset + rawBinary.byteLength
  );

  return {
    audioBuffer,
    sampleRate: json.sample_rate || 24000,
    durationSec: json.duration_sec || 0,
    lines: json.lines || [],
  };
}

/**
 * Wave 13: Screenplay Dialogue Auto-Splitter
 * Automatically parses screenplay-formatted scripts into structured lines with alternating spatial positions.
 */
export async function parseScreenplayDialogue(
  script: string,
  defaultSpeakerA: string = "ruby",
  defaultSpeakerB: string = "atlas",
  language: string = "en"
): Promise<DialogueLineInput[]> {
  const res = await pooledFetch(`${MODERN_TTS_URL}/tts/parse-screenplay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      script,
      default_speaker_a: defaultSpeakerA,
      default_speaker_b: defaultSpeakerB,
      language,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to parse screenplay dialogue: HTTP ${res.status} — ${errText}`);
  }

  const data = await res.json();
  return (data.lines || []).map((l: { speaker: string; text: string; language?: string; instruct?: string; spatial_position?: "left" | "center" | "right" }) => ({
    speaker: l.speaker,
    text: l.text,
    language: l.language,
    instruct: l.instruct,
    spatialPosition: l.spatial_position,
  }));
}

export interface NormalizeBroadcastTextResult {
  originalText: string;
  normalizedText: string;
  language: string;
}

/**
 * Wave 12 High-Precision Broadcast Script & Financial Normalizer Client:
 * Expands financial magnitudes ($14.5B -> catorce mil quinientos millones de dólares),
 * percentages, and acronyms with sub-microsecond server LRU caching.
 */
export async function normalizeBroadcastText(
  text: string,
  language: "es" | "en" = "es"
): Promise<NormalizeBroadcastTextResult> {
  const res = await pooledFetch(`${MODERN_TTS_URL}/tts/normalize-text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      language,
      engine: "omnivoice",
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to normalize broadcast text: HTTP ${res.status} — ${errText}`);
  }

  const json = await res.json();
  return {
    originalText: json.original_text || text,
    normalizedText: json.normalized_text || text,
    language: json.language || language,
  };
}

export interface OmniVoiceWebSocketChunk {
  event: "chunk_meta" | "done" | "error";
  sentenceIndex?: number;
  sentenceText?: string;
  sampleRate?: number;
  durationSec?: number;
  latencyMs?: number;
  audioPcm16?: ArrayBuffer;
  telemetry?: {
    loudness_lufs: number;
    true_peak_db: number;
    crest_factor_db: number;
  };
  error?: string;
  totalSentences?: number;
  totalDurationSec?: number;
  totalLatencyMs?: number;
  realTimeFactor?: number;
}

export interface OmniVoiceWebSocketOptions {
  text: string;
  personaId?: string;
  secondaryPersonaId?: string;
  personaBlendRatio?: number;
  tertiaryPersonaId?: string;
  personaBlendWeights?: [number, number, number];
  spatialPosition?: "left" | "center" | "right";
  language?: string;
  speed?: number;
  instruct?: string;
  onChunk?: (chunk: OmniVoiceWebSocketChunk) => void;
}

/**
 * Wave 11: Full-Duplex Binary WebSocket Streaming Client for OmniVoice.
 * Streams real-time raw PCM16 audio and forensic telemetry frames directly over WebSocket.
 */
export async function streamOmniVoiceWebSocket(
  options: OmniVoiceWebSocketOptions
): Promise<OmniVoiceWebSocketChunk[]> {
  const rawUrl = MODERN_TTS_URL.replace(/^http/, "ws") + "/ws/tts/stream-omni";
  // On Windows/Node, localhost can resolve to IPv6 [::1] where container ports are bound on IPv4 0.0.0.0
  const wsUrl = rawUrl.replace("://localhost:", "://127.0.0.1:");

  let WS: typeof WebSocket | undefined;
  if (typeof window === "undefined") {
    try {
      const wsModule = await import("ws");
      WS = (wsModule.WebSocket || wsModule.default || wsModule) as unknown as typeof WebSocket;
    } catch {
      WS = typeof WebSocket !== "undefined" ? WebSocket : (globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket;
    }
  } else {
    WS = typeof WebSocket !== "undefined" ? WebSocket : (globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket;
  }

  if (!WS) {
    throw new Error("WebSocket is not supported in this runtime environment.");
  }

  return new Promise((resolve, reject) => {
    const ws = new (WS as typeof WebSocket)(wsUrl);
    if ("binaryType" in ws) {
      ws.binaryType = "arraybuffer";
    }

    const receivedChunks: OmniVoiceWebSocketChunk[] = [];
    let pendingMeta: OmniVoiceWebSocketChunk | null = null;

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          text: options.text,
          persona_id: options.personaId || "ruby",
          secondary_persona_id: options.secondaryPersonaId,
          persona_blend_ratio: options.personaBlendRatio ?? 0.5,
          tertiary_persona_id: options.tertiaryPersonaId,
          persona_blend_weights: options.personaBlendWeights,
          spatial_position: options.spatialPosition || "center",
          language: options.language || "en",
          speed: options.speed ?? 1.0,
          instruct: options.instruct,
        })
      );
    };

    ws.onmessage = async (event: MessageEvent | { data: unknown }) => {
      const data = event.data;

      if (typeof data === "string") {
        try {
          const parsed = JSON.parse(data) as OmniVoiceWebSocketChunk;
          if (parsed.event === "chunk_meta") {
            pendingMeta = parsed;
          } else if (parsed.event === "done") {
            receivedChunks.push(parsed);
            if (options.onChunk) {
              options.onChunk(parsed);
            }
          } else if (parsed.event === "error") {
            ws.close();
            reject(new Error(parsed.error || "WebSocket streaming encountered an error"));
          }
        } catch (e: unknown) {
          console.warn("[OmniVoice WS Client] Failed to parse text frame:", e);
        }
      } else {
        // Binary PCM16 frame received
        let arrayBuf: ArrayBuffer;
        if (data instanceof ArrayBuffer) {
          arrayBuf = data;
        } else if (typeof Buffer !== "undefined" && Buffer.isBuffer(data)) {
          const slice = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
          arrayBuf = slice instanceof ArrayBuffer ? slice : (new Uint8Array(data).buffer as ArrayBuffer);
        } else if (typeof Blob !== "undefined" && data instanceof Blob) {
          arrayBuf = await data.arrayBuffer();
        } else {
          arrayBuf = data as ArrayBuffer;
        }

        const chunk: OmniVoiceWebSocketChunk = {
          ...(pendingMeta || { event: "chunk_meta" }),
          audioPcm16: arrayBuf,
        };
        receivedChunks.push(chunk);
        if (options.onChunk) {
          options.onChunk(chunk);
        }
        pendingMeta = null;
      }
    };

    ws.onerror = (err: Event | unknown) => {
      const msg = err && typeof err === "object" && "message" in err ? String((err as { message?: unknown }).message) : "Unknown error";
      reject(new Error(`WebSocket connection error: ${msg}`));
    };

    ws.onclose = () => {
      resolve(receivedChunks);
    };
  });
}








