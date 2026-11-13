/**
 * workers/pipeline-worker/tasks/audioTask.ts
 *
 * Modern Audio synthesis task handler for Modern-TTS-Server (Port 8005)
 * supporting Piper ONNX, F5-TTS, StyleTTS2, CosyVoice, and automatic fallback.
 * Honors job-level config (voice, engine, tier, speed, pitch), story video persona,
 * and segment-level voiceParams overrides.
 */

import fs from "fs";
import path from "path";
import os from "os";
import { promisify } from "util";
import { execFile } from "child_process";
import { storage, generateKey } from "@/lib/storage";
import { reportProgress, updateSegment } from "../api";
import { generateAudioWithModernTts } from "@/lib/tts/modernTtsClient";
import { resolvePersonaVoiceSettings } from "@/lib/tts/personas";
import type { TtsEngineType } from "@/lib/tts/textPreprocessor";
import { getAudioDuration } from "@/lib/audio/beatChunker";
import { getFFprobePath } from "@/lib/binaries";
import { PRICING } from "@/lib/constants/pricing";
import { createLogger } from "@/lib/logger";

const log = createLogger("worker:tasks:audioTask");

const execFileAsync = promisify(execFile);

export interface WorkerSegment {
  id: string;
  index: number;
  startTime?: number | null;
  endTime?: number | null;
  text?: string;
  spokenText?: string | null;
  personaId?: string | null;
  voiceParams?: string | null;
  language?: string | null;
  cadencePreset?: string | null;
  audioPath?: string | null;
  presenterVideoPath?: string | null;
  sceneStrategy?: string | null;
  personaAvatarUrl?: string | null;
  personaImagePrompt?: string | null;
  [key: string]: unknown;
}

export class JobCancelledError extends Error {
  constructor(message = "Job Cancelled") {
    super(message);
    this.name = "JobCancelledError";
  }
}

export async function stepTTS(
  job: Record<string, unknown>,
  story: Record<string, unknown>,
  defaultVoices: Array<{ personaId: string; audioPath: string }> | undefined,
  jobId: string,
  isShuttingDown: () => boolean
): Promise<Array<{ id: string; duration: number; index: number }>> {
  const script = (story as { script?: { segments?: WorkerSegment[] } })?.script;
  const segments: WorkerSegment[] = script?.segments ?? [];
  const segmentCount = segments.length;
  const companyId = (job.companyId as string) || "default";
  const storyId = (story?.id as string) || (job.storyId as string);

  // 1. Parse Job-Level Configuration for Voice & Audio Overrides
  interface JobAudioConfig {
    personaId?: string;
    voiceId?: string;
    voice?: string;
    ttsEngine?: TtsEngineType;
    engine?: TtsEngineType;
    tier?: string;
    speed?: number;
    speedFactor?: number;
    pitchShift?: number;
    cadencePreset?: string;
    language?: string;
    checkpoint?: string;
    speakerId?: number;
    [key: string]: unknown;
  }

  const jobConfig: JobAudioConfig =
    typeof job.config === "string"
      ? (() => {
          try {
            return JSON.parse(job.config) as JobAudioConfig;
          } catch {
            return {};
          }
        })()
      : ((job.config as unknown as JobAudioConfig) || {});

  const jobPersonaId = (jobConfig.personaId || jobConfig.voiceId || jobConfig.voice) as string | undefined;
  const jobEngine = (jobConfig.ttsEngine || jobConfig.engine) as TtsEngineType | undefined;
  const jobTier = (jobConfig.tier as string) || undefined; // "tier1" | "tier2" | "fast" | "studio"
  const jobSpeed =
    typeof jobConfig.speed === "number"
      ? jobConfig.speed
      : typeof jobConfig.speedFactor === "number"
      ? jobConfig.speedFactor
      : undefined;
  const jobPitchShift = typeof jobConfig.pitchShift === "number" ? jobConfig.pitchShift : undefined;
  const jobCadencePreset = (jobConfig.cadencePreset as string) || undefined;
  const jobLanguage = (jobConfig.language as string) || undefined;
  const jobCheckpoint = (jobConfig.checkpoint as string) || undefined;
  const jobSpeakerId = typeof jobConfig.speakerId === "number" ? jobConfig.speakerId : undefined;
  const storyVideoPersonaId = (story as { video?: { personaId?: string } })?.video?.personaId;

  log.info(`  🎙️  TTS: Processing ${segmentCount} segments via Modern-TTS-Server (:8005)...`);
  if (jobPersonaId || jobEngine || jobTier) {
    log.info(`     📋 Job Audio Profile: persona=[${jobPersonaId || "auto"}] engine=[${jobEngine || "auto"}] tier=[${jobTier || "auto"}]`);
  }

  if (segmentCount === 0) return [];

  const durations: Array<{ id: string; duration: number; index: number }> = [];
  const voiceMap = new Map<string, string>(
    defaultVoices?.map((v) => [v.personaId, v.audioPath]) ?? []
  );

  for (let i = 0; i < segmentCount; i++) {
    if (isShuttingDown()) break;
    const segment = segments[i];

    if (segment.audioPath) {
      log.info(`     ⏭️  Skipping TTS: audio already exists at ${segment.audioPath}`);
      const existingDuration = (segment.endTime ?? 0) - (segment.startTime ?? 0);
      durations.push({ id: segment.id, index: segment.index, duration: existingDuration });
      continue;
    }

    // 2. Parse Segment-Level Voice Parameters
    interface SegVoiceParams {
      personaId?: string;
      voiceId?: string;
      engine?: TtsEngineType;
      ttsEngine?: TtsEngineType;
      tier?: string;
      speed?: number;
      speedFactor?: number;
      pitchShift?: number;
      cadencePreset?: string;
      language?: string;
      speakerId?: number;
      checkpoint?: string;
      [key: string]: unknown;
    }

    let segVoiceParams: SegVoiceParams = {};
    if (segment.voiceParams) {
      try {
        segVoiceParams = typeof segment.voiceParams === "string" ? (JSON.parse(segment.voiceParams) as SegVoiceParams) : ((segment.voiceParams as unknown as SegVoiceParams) || {});
      } catch {
        segVoiceParams = {};
      }
    }

    // 3. Resolve Target Persona ID
    const effectivePersonaId = (
      segment.personaId ||
      segVoiceParams.personaId ||
      segVoiceParams.voiceId ||
      jobPersonaId ||
      storyVideoPersonaId ||
      "ruby"
    ).toLowerCase().trim();

    // 4. Resolve Engine & Tier Preference
    let requestedEngine = (
      segVoiceParams.engine ||
      segVoiceParams.ttsEngine ||
      jobEngine ||
      (process.env.DEFAULT_TTS_ENGINE as TtsEngineType) ||
      "piper"
    ) as TtsEngineType;

    const effectiveTier = (segVoiceParams.tier || jobTier || (requestedEngine === "piper" ? "tier1" : "tier2")).toLowerCase();
    if (!segVoiceParams.engine && !segVoiceParams.ttsEngine && !jobEngine) {
      if (effectiveTier === "tier2" || effectiveTier === "studio") {
        requestedEngine = "f5_tts";
      } else if (effectiveTier === "tier1" || effectiveTier === "fast") {
        requestedEngine = "piper";
      }
    }

    // 5. Resolve Custom Reference Audio & Persona Voice Settings
    const customRefAudio = voiceMap.get(effectivePersonaId);
    const resolvedVoice = resolvePersonaVoiceSettings({
      personaId: effectivePersonaId,
      language: segment.language || jobLanguage || undefined,
      engine: requestedEngine,
      modelOverride: (segVoiceParams.checkpoint || jobCheckpoint) as string,
      referenceAudioOverride: customRefAudio || segVoiceParams.voiceId || (typeof jobConfig.voice === "string" && jobConfig.voice.endsWith(".wav") ? jobConfig.voice : undefined),
      speed: segVoiceParams.speed ?? jobSpeed,
      pitchShift: segVoiceParams.pitchShift ?? jobPitchShift,
      cadencePreset: segment.cadencePreset || segVoiceParams.cadencePreset || jobCadencePreset,
      disableCloningIfDifferentLanguage: Boolean(jobConfig.disableCloningIfDifferentLanguage),
    });

    const refAudioFilename = path.basename(resolvedVoice.referenceAudio);
    const textToSpeak = segment.spokenText || segment.text || "";

    log.info(
      `     Segment ${i + 1}/${segmentCount}: Synthesizing for persona [${resolvedVoice.personaId}] via [${resolvedVoice.engine}] (model: ${resolvedVoice.checkpoint || "default"}, ref: ${refAudioFilename})`
    );

    let finalAudioBuffer: Buffer | null = null;

    // 6. Modern-TTS-Server (port 8005) Synthesis
    try {
      const result = await generateAudioWithModernTts(
        textToSpeak,
        refAudioFilename,
        {
          engine: resolvedVoice.engine as TtsEngineType,
          checkpoint: resolvedVoice.checkpoint || undefined,
          personaId: resolvedVoice.personaId,
          speakerId: segVoiceParams.speakerId ?? jobSpeakerId ?? resolvedVoice.speakerId,
          language: resolvedVoice.language || "es",
          pitchShift: resolvedVoice.pitchShift,
          speedFactor: resolvedVoice.speedFactor,
          cadencePreset: resolvedVoice.cadencePreset,
          applyYeismo: resolvedVoice.applyYeismo,
          enableFallback: true,
        }
      );
      finalAudioBuffer = Buffer.from(result);
    } catch (modernErr: unknown) {
      const errMsg = modernErr instanceof Error ? modernErr.message : String(modernErr);
      console.error(`     ❌ Modern-TTS synthesis failed: ${errMsg}`);
      throw new Error(`Failed to synthesize TTS audio for segment ${segment.id}: ${errMsg}`);
    }

    // 7. Measure Duration via Beat Chunker or FFprobe
    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, `tts-${segment.id}.wav`);
    fs.writeFileSync(tmpFile, finalAudioBuffer);

    let duration = 0;
    try {
      duration = await getAudioDuration(tmpFile);
    } catch {
      try {
        const ffprobeBin = getFFprobePath();
        const { stdout } = await execFileAsync(
          ffprobeBin,
          ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", tmpFile]
        );
        duration = parseFloat(stdout.trim());
        if (isNaN(duration)) duration = 0;
      } catch (err) {
        console.error(`     ⚠️ ffprobe failed for segment ${i + 1}:`, err);
      }
    }

    try {
      fs.unlinkSync(tmpFile);
    } catch {}

    // 8. Enforce Tenant-Scoped Storage Key & Persist to Storage / DB
    const audioFilename = `seg_${segment.index}_${resolvedVoice.personaId}.wav`;
    const objectKey = generateKey({
      companyId,
      type: "audio",
      id: storyId,
      filename: audioFilename,
    });

    await storage.upload(objectKey, finalAudioBuffer, "audio/wav");
    await updateSegment(jobId, segment.id as string, { audioPath: objectKey });
    durations.push({ id: segment.id as string, index: (segment.index as number) ?? i, duration });

    // Zero-Copy /dev/shm Hand-Off for real-time MuseTalk consumption
    if (process.platform === "linux" && fs.existsSync("/dev/shm")) {
      try {
        fs.writeFileSync(path.join("/dev/shm", `tts_${segment.id}.wav`), finalAudioBuffer);
      } catch {}
    }

    const creditsUsed = duration * PRICING.COST_PER_TTS_SEC;
    log.info(`     🎙️  TTS Duration: ${duration.toFixed(2)}s | Storage Key: ${objectKey}`);

    const ok = await reportProgress(jobId, {
      step: `tts_seg_${i}`,
      status: "TTS_IN_PROGRESS",
      doneSteps: i + 1,
      creditsUsed,
    });
    if (!ok) throw new JobCancelledError();
  }

  log.info(`  ✅ TTS synthesis complete for ${segmentCount} segments`);
  return durations;
}

export async function stepRecalibrateTiming(
  first: Array<{ id: string; duration: number; index: number }> | Record<string, unknown>,
  second: string | Array<{ id: string; duration: number; index: number }>,
  third?: string
): Promise<void> {
  log.info("  ⏱️  Timing: Recalibrating segment timings from audio durations...");

  let durations: Array<{ id: string; duration: number; index: number }> = [];
  let jobId = "";

  if (Array.isArray(first)) {
    durations = first;
    jobId = second as string;
  } else {
    durations = second as Array<{ id: string; duration: number; index: number }>;
    jobId = third || "";
  }

  durations.sort((a, b) => a.index - b.index);

  let currentStartTime = 0;
  const updates: Array<{ id: string; startTime: number; endTime: number }> = [];
  for (const seg of durations) {
    const startTime = currentStartTime;
    const endTime = startTime + seg.duration;
    updates.push({ id: seg.id, startTime, endTime });
    currentStartTime = endTime;
  }

  if (jobId && updates.length > 0) {
    await Promise.all(
      updates.map((u) => updateSegment(jobId, u.id, { startTime: u.startTime, endTime: u.endTime }))
    );
    await reportProgress(jobId, {
      step: "recalibrate_timing",
      status: "TTS_IN_PROGRESS",
    });
  }
  log.info("  ✅ Timing recalibrated successfully.");
}
