/**
 * src/lib/ecommerce/voiceSynthesisCalibrator.ts
 *
 * Voice Synthesis & Automatic Scene Duration Calibration Engine.
 * Generates spoken voiceover audio (via Modern-TTS-Server or speech-timed audio fallback),
 * calculates precise audio duration via Web Audio API, and ripple-shifts timeline scene frames.
 */

import { AdScene } from "@/lib/types/ecommerce";
import { getPersonaById, resolvePersonaVoiceSettings } from "@/lib/tts/personas";
import { optimizeSpeechCadence } from "./cadenceOptimizer";

export interface VoiceSynthesisOptions {
  engine?: string;
  model?: string;
  personaId?: string;
  speed?: number;
  pitchShift?: number;
  language?: string;
  disableCloningIfDifferentLanguage?: boolean;
  productId?: string;
  sceneIndex?: number;
  bypassCache?: boolean;
}

export interface CalibratedVoiceResult {
  blob: Blob;
  url: string;
  durationSeconds: number;
  durationFrames: number;
  source: "modern_tts" | "speech_calibrator" | "cache";
  cacheKey?: string;
}

/**
 * Deterministic audio cache key generator based on text, persona, and voice params.
 */
export function computeAudioCacheKey(
  text: string,
  options: VoiceSynthesisOptions = {}
): string {
  const clean = (text || "").trim().toLowerCase();
  const personaId = options.personaId || "ruby";
  const speed = (options.speed ?? 1.0).toFixed(2);
  const pitch = (options.pitchShift ?? 0).toString();
  const engine = options.engine || "omni";
  const model = options.model || "default";
  const lang = options.language || "es";
  const cloneTag = options.disableCloningIfDifferentLanguage ? "::noclone" : "";
  return `audio::${personaId}::s${speed}::p${pitch}::${engine}::${model}::${lang}${cloneTag}::${clean}`;
}

const IDB_DB_NAME = "newsstudio_audio_cache";
const IDB_STORE_NAME = "audio_blobs";
const IDB_VERSION = 1;

interface CachedAudioRecord {
  key: string;
  blob: Blob;
  url: string;
  durationSeconds: number;
  durationFrames: number;
  source: "modern_tts" | "speech_calibrator" | "cache";
  timestamp: number;
}

function openAudioDb(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !window.indexedDB) return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(IDB_DB_NAME, IDB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
          db.createObjectStore(IDB_STORE_NAME, { keyPath: "key" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function getCachedAudioFromIndexedDb(key: string): Promise<CalibratedVoiceResult | null> {
  try {
    const db = await openAudioDb();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE_NAME, "readonly");
      const store = tx.objectStore(IDB_STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => {
        const rec = req.result as CachedAudioRecord | undefined;
        if (rec && rec.blob && rec.blob.size > 100) {
          const liveUrl = rec.url && !rec.url.startsWith("blob:") ? rec.url : URL.createObjectURL(rec.blob);
          resolve({
            blob: rec.blob,
            url: liveUrl,
            durationSeconds: rec.durationSeconds,
            durationFrames: rec.durationFrames,
            source: "cache",
            cacheKey: key,
          });
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function setCachedAudioInIndexedDb(key: string, result: CalibratedVoiceResult): Promise<void> {
  try {
    const db = await openAudioDb();
    if (!db) return;
    const tx = db.transaction(IDB_STORE_NAME, "readwrite");
    const store = tx.objectStore(IDB_STORE_NAME);
    store.put({
      key,
      blob: result.blob,
      url: result.url,
      durationSeconds: result.durationSeconds,
      durationFrames: result.durationFrames,
      source: result.source,
      timestamp: Date.now(),
    });
  } catch {
    // Non-critical background caching
  }
}

export async function removeCachedAudioFromIndexedDb(key: string): Promise<void> {
  try {
    const db = await openAudioDb();
    if (!db) return;
    const tx = db.transaction(IDB_STORE_NAME, "readwrite");
    const store = tx.objectStore(IDB_STORE_NAME);
    store.delete(key);
  } catch {}
}

/**
 * In-memory session audio cache store.
 */
export const audioCacheStore = new Map<string, CalibratedVoiceResult>();

/**
 * Clears an individual cache entry or the entire audio cache store.
 */
export function clearAudioCacheEntry(cacheKey?: string): void {
  if (cacheKey) {
    audioCacheStore.delete(cacheKey);
    removeCachedAudioFromIndexedDb(cacheKey);
  } else {
    audioCacheStore.clear();
  }
}

/**
 * Permanently deletes the physical audio file from storage (MinIO / Local / Azure)
 * and purges all corresponding entries from the in-memory audio cache store.
 */
export async function deleteSceneAudioFileAndCache(options: {
  audioUrl?: string;
  storageKey?: string;
  cacheKey?: string;
  productId?: string;
  sceneIndex?: number;
}): Promise<boolean> {
  // 1. Purge from in-memory cache store and IndexedDB
  if (options.cacheKey) {
    clearAudioCacheEntry(options.cacheKey);
  }
  if (options.audioUrl) {
    for (const [key, val] of audioCacheStore.entries()) {
      if (val.url === options.audioUrl) {
        audioCacheStore.delete(key);
        removeCachedAudioFromIndexedDb(key);
      }
    }
  }

  // 2. Request physical deletion from persistent storage
  const isTest = typeof process !== "undefined" && (process.env.NODE_ENV === "test" || !!process.env.VITEST);
  const isBrowser = typeof window !== "undefined" && !isTest;

  if (isBrowser && typeof fetch !== "undefined") {
    try {
      const res = await fetch("/api/ecommerce/storage/save-audio", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options),
      });
      return res.ok;
    } catch (err) {
      console.warn("[deleteSceneAudioFileAndCache] Storage file delete failed:", err);
      return false;
    }
  }

  return true;
}

/**
 * Fast-path parsing of a RIFF WAV header from an audio Blob.
 * Slices only the first 256 bytes to compute duration instantaneously without AudioContext overhead.
 */
function parseWavHeaderDuration(headerBuffer: ArrayBuffer, totalBlobSize: number): number | null {
  if (headerBuffer.byteLength < 44) return null;
  const view = new DataView(headerBuffer);

  // Validate RIFF and WAVE signatures
  const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
  if (riff !== "RIFF" || wave !== "WAVE") return null;

  let byteRate = 0;
  let dataSize = 0;

  // Walk RIFF subchunks
  let offset = 12;
  while (offset + 8 <= headerBuffer.byteLength) {
    const chunkId = String.fromCharCode(
      view.getUint8(offset),
      view.getUint8(offset + 1),
      view.getUint8(offset + 2),
      view.getUint8(offset + 3)
    );
    const chunkSize = view.getUint32(offset + 4, true);

    if (chunkId === "fmt " && chunkSize >= 16) {
      byteRate = view.getUint32(offset + 16, true);
    } else if (chunkId === "data") {
      dataSize = chunkSize > 0 ? chunkSize : totalBlobSize - (offset + 8);
      break;
    }

    offset += 8 + chunkSize;
  }

  // Fallback for standard 44-byte PCM layout if loop exited early
  if (byteRate === 0 && headerBuffer.byteLength >= 32) {
    byteRate = view.getUint32(28, true);
  }
  if (dataSize === 0 && headerBuffer.byteLength >= 44) {
    dataSize = view.getUint32(40, true);
  }
  if (dataSize === 0 && totalBlobSize > 44) {
    dataSize = totalBlobSize - 44;
  }

  if (byteRate > 0 && dataSize > 0) {
    const duration = dataSize / byteRate;
    if (duration > 0 && Number.isFinite(duration)) {
      return Number(duration.toFixed(2));
    }
  }

  return null;
}

/**
 * Accurately decodes the duration in seconds of an audio Blob.
 * Fast-paths RIFF WAV header decoding (< 0.01ms), falling back to Web Audio API for compressed formats.
 */
export async function getDecodedAudioDuration(blob: Blob): Promise<number> {
  // 1. Instant Fast-Path: Parse RIFF WAV header (slices only first 256 bytes)
  try {
    const slice = blob.slice(0, Math.min(256, blob.size));
    const headerBuffer = await slice.arrayBuffer();
    const wavDuration = parseWavHeaderDuration(headerBuffer, blob.size);
    if (wavDuration !== null) {
      return wavDuration;
    }
  } catch {
    // Continue to AudioContext fallback
  }

  // 2. Web Audio API fallback for non-WAV / compressed streams (MP3/OGG/AAC)
  if (typeof window !== "undefined") {
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (AudioContextClass) {
      let audioContext: AudioContext | null = null;
      try {
        audioContext = new AudioContextClass();
        const arrayBuffer = await blob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        return Number(audioBuffer.duration.toFixed(2));
      } catch (e) {
        console.warn("[VoiceCalibrator] AudioContext decode failed, using default duration", e);
      } finally {
        if (audioContext) {
          audioContext.close().catch(() => {});
        }
      }
    }
  }

  return 3.0; // safe default fallback
}

/**
 * Estimates natural speaking duration based on commercial voice cadence (~145 wpm / 2.4 words/sec)
 * with breath and punctuation timing pauses.
 */
export function estimateSpeechDuration(text: string, speedFactor = 1.0): number {
  if (!text || !text.trim()) return 2.0;

  const clean = text.replace(/\[sfx:[^\]]+\]/gi, "").trim();
  const words = clean.split(/\s+/).filter(Boolean);
  const wordCount = Math.max(1, words.length);

  // Standard conversational/commercial cadence: 2.4 words per second
  const baseSeconds = wordCount / 2.4;

  // Punctuation pause padding (ellipses, commas, periods)
  const fullStops = (clean.match(/[\.\!\?]/g) || []).length;
  const commas = (clean.match(/[\,\;\:\—]/g) || []).length;
  const pauseSeconds = fullStops * 0.25 + commas * 0.15;

  const adjustedSeconds = (baseSeconds + pauseSeconds) / Math.max(0.5, Math.min(2.0, speedFactor));
  // Guarantee a minimum duration of 1.5s for natural video scene pacing
  return Number(Math.max(1.5, adjustedSeconds).toFixed(2));
}

/**
 * Generates a valid 16-bit mono PCM WAV audio Blob with a soft modulated harmonic tone
 * matching the exact estimated speaking duration.
 * This guarantees audio playback and duration calibration even when the local GPU TTS server is offline.
 */
export function createSpeechTimedWavBlob(text: string, speedFactor = 1.0, sampleRate = 24000): Blob {
  const durationSeconds = estimateSpeechDuration(text, speedFactor);
  const numSamples = Math.floor(sampleRate * durationSeconds);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // 1. RIFF Chunk Descriptor
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(view, 8, "WAVE");

  // 2. fmt Sub-chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true);  // AudioFormat (1 = PCM)
  view.setUint16(22, 1, true);  // NumChannels (1 = Mono)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
  view.setUint16(32, 2, true);  // BlockAlign (NumChannels * BitsPerSample/8)
  view.setUint16(34, 16, true); // BitsPerSample (16-bit)

  // 3. data Sub-chunk
  writeString(view, 36, "data");
  view.setUint32(40, numSamples * 2, true);

  // 4. Synthesize soft human-frequency harmonic audio with natural speech envelope
  let offset = 44;
  const f0 = 195; // Base vocal pitch in Hz (~G3)
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Cadence modulation (simulates speaking syllables every ~0.25s)
    const syllableSwell = 0.5 + 0.5 * Math.sin(2 * Math.PI * 4.2 * t);
    // Decay at very end so there are no clicks
    const tailDamping = Math.min(1.0, (durationSeconds - t) * 5);
    const envelope = syllableSwell * Math.max(0, tailDamping);

    // Warm vocal timbre harmonics (Fundamental + 2nd + 3rd harmonic)
    const sampleVal =
      0.6 * Math.sin(2 * Math.PI * f0 * t) +
      0.3 * Math.sin(2 * Math.PI * f0 * 2 * t) +
      0.1 * Math.sin(2 * Math.PI * f0 * 3 * t);

    // Scale to 16-bit signed integer (-32768 to 32767) at modest volume
    const intSample = Math.floor(sampleVal * envelope * 6500);
    view.setInt16(offset, intSample, true);
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Synthesizes voiceover audio for a single scene and calculates exact duration in frames.
 * Automatically injects breathing pauses and cadence rhythm before synthesis.
 * Checks the in-memory/session cache first to avoid redundant neural inference.
 */
export async function synthesizeSceneVoice(
  text: string,
  options: VoiceSynthesisOptions = {}
): Promise<CalibratedVoiceResult> {
  const raw = (text || "").trim();
  if (!raw) {
    const emptyBlob = createSpeechTimedWavBlob("Scene", 1.0);
    const url = URL.createObjectURL(emptyBlob);
    return {
      blob: emptyBlob,
      url,
      durationSeconds: 2.0,
      durationFrames: 60,
      source: "speech_calibrator",
      cacheKey: "empty",
    };
  }

  // 1. Auto-detect language if not explicitly provided or if script contains Spanish indicators
  let effectiveLanguage = options.language;
  if (!effectiveLanguage || effectiveLanguage === "en") {
    const isTextSpanish =
      /[¿¡áéíóúñÁÉÍÓÚÑ]/.test(raw) ||
      /\b(el|la|los|las|de|del|en|que|con|por|para|este|esta|piso|hogar|renovar|casa|calidad|oferta|comprar|consultá|precio|mirá|che)\b/i.test(raw);
    if (isTextSpanish) {
      effectiveLanguage = "es";
    }
  }

  // Automatically optimize speech cadence, breath pauses & acronyms
  const cadenceText = optimizeSpeechCadence(raw, effectiveLanguage);

  const engine = options.engine || "omni";
  const personaId = options.personaId || "ruby";
  const persona = getPersonaById(personaId);

  // Voice hierarchy: Language first -> Genre (gender) second -> Defaults in personas.ts -> Voice cloning features
  const voiceSettings = resolvePersonaVoiceSettings({
    personaId,
    persona,
    language: effectiveLanguage,
    engine,
    speed: options.speed,
    pitchShift: options.pitchShift,
    modelOverride: options.model,
    disableCloningIfDifferentLanguage: options.disableCloningIfDifferentLanguage,
  });

  const cacheKey = computeAudioCacheKey(cadenceText, {
    ...options,
    language: voiceSettings.language,
    personaId: voiceSettings.personaId,
    engine: voiceSettings.engine,
    model: voiceSettings.checkpoint,
    disableCloningIfDifferentLanguage: options.disableCloningIfDifferentLanguage,
  });

  // 2. Check in-memory audio cache store & persistent IndexedDB cache (ignore any legacy artificial tones)
  if (!options.bypassCache) {
    const cached = audioCacheStore.get(cacheKey);
    if (cached && cached.source !== "speech_calibrator") {
      return {
        ...cached,
        source: "cache",
        cacheKey,
      };
    }

    const cachedIdb = await getCachedAudioFromIndexedDb(cacheKey);
    if (cachedIdb && cachedIdb.source !== "speech_calibrator") {
      audioCacheStore.set(cacheKey, cachedIdb);
      return cachedIdb;
    }
  } else {
    audioCacheStore.delete(cacheKey);
    removeCachedAudioFromIndexedDb(cacheKey);
  }

  // 3. Try Modern-TTS via API proxy (timeout after 180 seconds for neural diffusion)
  const isTest = typeof process !== "undefined" && (process.env.NODE_ENV === "test" || !!process.env.VITEST);
  const isBrowser = typeof window !== "undefined" && !isTest;
  const baseUrl = isBrowser ? "" : (process.env.NEXT_PUBLIC_APP_URL || "");

  if ((isBrowser || baseUrl) && !isTest) {
    try {
      const res = await fetch(`${baseUrl}/api/tts/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: cadenceText,
          engine: voiceSettings.engine,
          checkpoint: voiceSettings.checkpoint,
          reference_audio_filename: voiceSettings.referenceAudio,
          personaId: voiceSettings.personaId,
          speed_factor: voiceSettings.speedFactor,
          pitch_shift: voiceSettings.pitchShift,
          language: voiceSettings.language,
          cadence_preset: voiceSettings.cadencePreset,
          apply_yeismo: voiceSettings.applyYeismo,
          disable_cloning_if_different_language: options.disableCloningIfDifferentLanguage,
          bypass_cache: options.bypassCache,
          bypassCache: options.bypassCache,
        }),
        signal: AbortSignal.timeout(180000),
      });

      if (res.ok) {
        const blob = await res.blob();
        if (blob && blob.size > 100) {
          const durationSeconds = await getDecodedAudioDuration(blob);
          const durationFrames = Math.max(30, Math.round(durationSeconds * 30));
          const url = await uploadAudioBlobToStorage(blob, {
            productId: options.productId,
            sceneIndex: options.sceneIndex,
            personaId: voiceSettings.personaId,
            durationSeconds,
            cacheKey,
          });
          const result: CalibratedVoiceResult = {
            blob,
            url,
            durationSeconds,
            durationFrames,
            source: "modern_tts",
            cacheKey,
          };
          audioCacheStore.set(cacheKey, result);
          setCachedAudioInIndexedDb(cacheKey, result);
          return result;
        }
      } else {
        const errJson = await res.json().catch(() => null);
        const errMsg = errJson?.error || errJson?.detail || `Modern-TTS error (HTTP ${res.status})`;
        console.error(`[VoiceCalibrator] Modern-TTS failed (${res.status}):`, errMsg);
        throw new Error(errMsg);
      }
    } catch (err: unknown) {
      if (isBrowser && (voiceSettings.engine === "omni" || voiceSettings.engine === "omnivoice" || options.productId)) {
        throw err;
      }
      console.warn("[VoiceCalibrator] Modern-TTS server offline or unreachable, using cadence calibrator fallback.");
    }
  }

  // 4. High-Fidelity Speech-Timed Fallback (Only in offline/non-commercial mock environments)
  const fallbackBlob = createSpeechTimedWavBlob(cadenceText, options.speed);
  const durationSeconds = await getDecodedAudioDuration(fallbackBlob);
  const durationFrames = Math.max(30, Math.round(durationSeconds * 30));
  const url = await uploadAudioBlobToStorage(fallbackBlob, {
    productId: options.productId,
    sceneIndex: options.sceneIndex,
    personaId: voiceSettings.personaId,
    durationSeconds,
    cacheKey,
  });

  const fallbackResult: CalibratedVoiceResult = {
    blob: fallbackBlob,
    url,
    durationSeconds,
    durationFrames,
    source: "speech_calibrator",
    cacheKey,
  };
  audioCacheStore.set(cacheKey, fallbackResult);

  return fallbackResult;
}

/**
 * Uploads an audio Blob to MinIO / persistent storage provider via the save-audio endpoint.
 * Falls back to URL.createObjectURL in offline or unit testing environments.
 */
export async function uploadAudioBlobToStorage(
  blob: Blob,
  params: {
    productId?: string;
    sceneIndex?: number;
    personaId: string;
    durationSeconds: number;
    cacheKey: string;
  }
): Promise<string> {
  const isTest = typeof process !== "undefined" && (process.env.NODE_ENV === "test" || !!process.env.VITEST);
  const isBrowser = typeof window !== "undefined" && !isTest;

  if (isBrowser && typeof fetch !== "undefined") {
    try {
      const formData = new FormData();
      formData.append("audio", blob, `scene_${params.sceneIndex ?? 0}.wav`);
      formData.append("productId", params.productId || "commercial");
      formData.append("sceneIndex", String(params.sceneIndex ?? 0));
      formData.append("personaId", params.personaId);
      formData.append("durationSeconds", String(params.durationSeconds));
      formData.append("cacheKey", params.cacheKey);

      const res = await fetch("/api/ecommerce/storage/save-audio", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.url) {
          return data.url;
        }
      } else {
        console.warn(`[uploadAudioBlobToStorage] save-audio returned HTTP ${res.status}, retrying via base64 JSON...`);
      }
    } catch (err) {
      console.warn("[uploadAudioBlobToStorage] FormData upload failed, attempting base64 JSON:", err);
    }

    // Secondary fallback: Convert blob to base64 and POST JSON
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      const res = await fetch("/api/ecommerce/storage/save-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioBase64: base64,
          productId: params.productId || "commercial",
          sceneIndex: params.sceneIndex ?? 0,
          personaId: params.personaId,
          durationSeconds: params.durationSeconds,
          cacheKey: params.cacheKey,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.url) {
          return data.url;
        }
      }
    } catch (err2) {
      console.error("[uploadAudioBlobToStorage] Secondary base64 upload failed:", err2);
    }
  }

  // Never return ephemeral blob: URLs into persistent scripts as Remotion CLI crashes on blob: URLs
  return `/storage/ecommerce/audio/${params.personaId}_${Date.now()}.wav`;
}

/**
 * Checks if a media URL points to a video asset (mp4, webm, mov, veo, or video route).
 */
export function isVideoMediaUrl(url?: string): boolean {
  if (!url) return false;
  const clean = url.toLowerCase().split("?")[0];
  return (
    clean.endsWith(".mp4") ||
    clean.endsWith(".webm") ||
    clean.endsWith(".mov") ||
    clean.includes("/generated_videos/") ||
    clean.includes("/veo_scenes/") ||
    clean.includes("/veo/") ||
    clean.includes("veo_") ||
    clean.includes("/video/")
  );
}

/**
 * Checks if an AdScene is a generated video scene or video-backed scene.
 */
export function isVideoScene(scene?: AdScene): boolean {
  if (!scene) return false;
  return (
    scene.sceneType === "custom_veo_hero" ||
    Boolean(scene.customVeoVideoUrl) ||
    isVideoMediaUrl(scene.primaryMediaUrl) ||
    isVideoMediaUrl(scene.secondaryMediaUrl)
  );
}

/**
 * Resolves the primary video media URL from a video scene (customVeoVideoUrl, primaryMediaUrl, or secondaryMediaUrl).
 */
export function getVideoSceneMediaUrl(scene?: AdScene): string | undefined {
  if (!scene) return undefined;
  if (scene.customVeoVideoUrl) return scene.customVeoVideoUrl;
  if (isVideoMediaUrl(scene.primaryMediaUrl)) return scene.primaryMediaUrl;
  if (isVideoMediaUrl(scene.secondaryMediaUrl)) return scene.secondaryMediaUrl;
  return undefined;
}

/**
 * Ripple-shifts scene startFrames when a specific scene's duration is calibrated.
 * For generated video scenes (e.g. Veo scenes of ~8s / 240 frames), does NOT shrink
 * the scene duration below the video length (minimum 240 frames / 8.0s), ensuring
 * the full video plays without being cut short by shorter voiceover audio.
 * If audio is longer than 8s, the scene expands to match the audio so it never clips.
 */
export function calculateRippleShiftedScenes(
  scenes: AdScene[],
  updatedIndex: number,
  targetDurationFrames: number,
  audioUrl?: string,
  audioDuration?: number,
  audioCacheKey?: string,
  options?: { preserveVideoDuration?: boolean }
): AdScene[] {
  if (!scenes || scenes.length === 0) return [];

  const targetScene = scenes[updatedIndex];
  let effectiveDurationFrames = targetDurationFrames;

  if (targetScene && options?.preserveVideoDuration !== false && isVideoScene(targetScene)) {
    // Generated video clips (Veo, Wan 2.1) have an 8.0-second baseline (240 frames at 30fps).
    // Preserve the video length (at least 240 frames, or existing scene duration if higher),
    // while still expanding if speech audio happens to be longer than 8s.
    const baseVideoFrames = Math.max(240, targetScene.durationFrames || 240);
    effectiveDurationFrames = Math.max(baseVideoFrames, targetDurationFrames);
  }

  const updated = scenes.map((s, idx) => {
    if (idx === updatedIndex) {
      return {
        ...s,
        durationFrames: effectiveDurationFrames,
        audioUrl: audioUrl || s.audioUrl,
        audioDuration: audioDuration || s.audioDuration,
        audioCacheKey: audioCacheKey || s.audioCacheKey,
      };
    }
    return { ...s };
  });

  // Ripple shift all subsequent scenes
  for (let i = 0; i < updated.length; i++) {
    if (i === 0) {
      updated[i].startFrame = 0;
    } else {
      updated[i].startFrame = updated[i - 1].startFrame + updated[i - 1].durationFrames;
    }
  }

  return updated;
}

export interface BatchSynthesizeOptions extends VoiceSynthesisOptions {
  skipCached?: boolean;
}

/**
 * Sequentially synthesizes all scenes and auto-calibrates the entire storyboard timeline.
 * Intelligently skips already cached/generated scenes when skipCached is true.
 * Automatically detects video scenes, skips neural voice synthesis, and uses the native audio track of the video.
 */
export async function batchSynthesizeAllScenes(
  scenes: AdScene[],
  options: BatchSynthesizeOptions = {},
  onProgress?: (completed: number, total: number, currentSceneIndex: number, status: "generating" | "cached" | "done" | "skipped") => void
): Promise<AdScene[]> {
  if (!scenes || scenes.length === 0) return [];

  let currentScenes = [...scenes];
  const skipCached = options.skipCached !== false;

  for (let i = 0; i < currentScenes.length; i++) {
    const scene = currentScenes[i];

    // CHECK AT THE TOP: If this is a video scene, skip audio synthesis and use the audio track of the video!
    const videoUrl = getVideoSceneMediaUrl(scene);
    if (isVideoScene(scene) && videoUrl) {
      const videoDurationSec = scene.audioDuration || (scene.durationFrames > 0 ? scene.durationFrames / 30 : 8.0);
      const videoDurationFrames = Math.max(240, scene.durationFrames > 0 ? scene.durationFrames : Math.round(videoDurationSec * 30));

      currentScenes = calculateRippleShiftedScenes(
        currentScenes,
        i,
        videoDurationFrames,
        videoUrl, // Use the video's own audio track
        videoDurationSec,
        `video::${videoUrl}`
      );
      onProgress?.(i + 1, currentScenes.length, i, "done");
      continue;
    }

    if (!scene.voiceoverScript || !scene.voiceoverScript.trim()) {
      onProgress?.(i + 1, currentScenes.length, i, "skipped");
      continue;
    }

    const scenePersonaId =
      scene.presenterConfig?.personaId ||
      scene.presenter?.personaId ||
      options.personaId ||
      "ruby";
    const sceneOptions = { ...options, personaId: scenePersonaId, sceneIndex: i };

    const expectedCacheKey = computeAudioCacheKey(scene.voiceoverScript, sceneOptions);

    // Skip re-synthesis if scene already has audio and matches its cache key
    if (
      skipCached &&
      scene.audioUrl &&
      scene.durationFrames > 0 &&
      (scene.audioCacheKey === expectedCacheKey || audioCacheStore.has(expectedCacheKey))
    ) {
      onProgress?.(i + 1, currentScenes.length, i, "cached");
      continue;
    }

    onProgress?.(i, currentScenes.length, i, "generating");

    const result = await synthesizeSceneVoice(scene.voiceoverScript, sceneOptions);
    currentScenes = calculateRippleShiftedScenes(
      currentScenes,
      i,
      result.durationFrames,
      result.url,
      result.durationSeconds,
      result.cacheKey
    );

    onProgress?.(i + 1, currentScenes.length, i, "done");
  }

  return currentScenes;
}
