/**
 * workers/pipeline-worker/index.ts
 *
 * Standalone Pipeline Worker: wakes instantly via Supabase Realtime Broadcast
 * or local HTTP loopback (:8766), executes local-first agy/Ollama LLM tasks
 * and GenerationJobs, manages GPU model servers, and runs headless Remotion renders.
 * Makes zero idle HTTP requests to MAIN_APP_URL while sleeping.
 */

process.env.IS_PIPELINE_WORKER = "true";
if (!process.env.AGY_MODEL) process.env.AGY_MODEL = "gemini-3.8-flash-low";
if (!process.env.AGY_EFFORT) process.env.AGY_EFFORT = "low";

import http from "http";
import { DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { BUCKET_NAME, s3Client } from "@/lib/storage/s3Client";
import { config, validateConfig } from "./config";
import {
  pollQueue,
  claimJob,
  reportProgress,
  sendHeartbeat,
  triggerAutoPublish,
  claimLlmTask,
  completeLlmTask,
  claimTtsPreviewTask,
  completeTtsPreviewTask,
  triggerScheduledRun,
} from "./api";
import type { QueuedJob } from "./api";
import { executeRenderTask } from "./render-task";
import {
  startModernTtsServer,
  stopModernTtsServer,
  startModernTalkingHeadServer,
  stopModernTalkingHeadServer,
  startComfyUIServer,
  stopComfyUIServer,
  modernTtsProcess,
  modernTalkingHeadProcess,
  comfyuiProcess,
  setShuttingDown,
} from "./serverLifecycle";
import { stepTTS, stepRecalibrateTiming } from "./tasks/audioTask";
import { stepVideo } from "./tasks/videoTask";
import { stepImage } from "./tasks/imageTask";
import { stepStudioJob } from "./tasks/studioTask";
import { stepTurntable3D } from "./tasks/turntable3dTask";
import { stepWardrobeInpaint } from "./tasks/wardrobeInpaintTask";
import { stepEcommerceMediaTask, ECOMMERCE_MEDIA_JOB_TYPES } from "./tasks/ecommerceMediaTask";
import { prisma } from "@/lib/prisma";
import { PRICING } from "@/lib/constants/pricing";
import { sendOperationalAlert } from "@/lib/alerting/notifier";
import { createLogger } from "@/lib/logger";
import { generateAudioWithModernTts, type ModernTtsOptions } from "@/lib/tts/modernTtsClient";
import {
  resolveSupabaseConfigFromEnv,
  startSupabaseRealtimeListener,
  checkSupabaseQueuedJobs,
  checkSupabaseDueSchedules,
  runLocalLlm,
} from "@/lib/worker-broker";

const workerLog = createLogger({
  module: "pipeline-worker",
  workerId: config.workerId,
  role: config.role,
});

const isMac = process.platform === "darwin";

let isShuttingDown = false;
let isProcessing = false;
let currentJobId: string | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let wakeServer: http.Server | null = null;
let realtimeStop: (() => void) | null = null;
let sleepCancel: (() => void) | null = null;
let pendingWakeReason: string | null = null;
let isDrainingLlm = false;
let pendingLlmDrain = false;
let isDrainingTtsPreview = false;
let pendingTtsPreviewDrain = false;
let lastTempSweepAt = 0;
const workerStartedAt = Date.now();
const TEMP_SWEEP_INTERVAL_MS = 12 * 60 * 60 * 1000;
const TEMP_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

let modernTtsIdleTimeout: ReturnType<typeof setTimeout> | null = null;
let modernTalkingHeadIdleTimeout: ReturnType<typeof setTimeout> | null = null;
let comfyIdleTimeout: ReturnType<typeof setTimeout> | null = null;

function clearModernTtsIdleTimeout() {
  if (modernTtsIdleTimeout) clearTimeout(modernTtsIdleTimeout);
}

function resetModernTtsIdleTimeout() {
  clearModernTtsIdleTimeout();
  modernTtsIdleTimeout = setTimeout(() => {
    stopModernTtsServer();
  }, 5 * 60 * 1000);
}

function clearModernTalkingHeadIdleTimeout() {
  if (modernTalkingHeadIdleTimeout) clearTimeout(modernTalkingHeadIdleTimeout);
}

function resetModernTalkingHeadIdleTimeout() {
  clearModernTalkingHeadIdleTimeout();
  modernTalkingHeadIdleTimeout = setTimeout(() => {
    stopModernTalkingHeadServer();
  }, 5 * 60 * 1000);
}

function clearComfyIdleTimeout() {
  if (comfyIdleTimeout) clearTimeout(comfyIdleTimeout);
}

function resetComfyIdleTimeout() {
  clearComfyIdleTimeout();
  comfyIdleTimeout = setTimeout(() => {
    stopComfyUIServer();
  }, 5 * 60 * 1000);
}

/**
 * Atomically claims a job using conditional database update:
 * `prisma.generationJob.updateMany({ where: { id: jobId, status: 'QUEUED' }, data: { status: 'IN_PROGRESS', workerId } })`
 * Guarantees zero duplicate processing across parallel workers.
 */
export async function claimJobAtomically(
  jobId: string,
  workerId: string,
  targetStatus: string = "IN_PROGRESS"
): Promise<{ claimed: boolean; job?: Awaited<ReturnType<typeof prisma.generationJob.findUnique>> }> {
  try {
    const result = await prisma.generationJob.updateMany({
      where: { id: jobId, status: "QUEUED" },
      data: {
        status: targetStatus,
        workerId,
        startedAt: new Date(),
      },
    });

    if (result.count === 0) {
      return { claimed: false };
    }

    const job = await prisma.generationJob.findUnique({
      where: { id: jobId },
    });

    return { claimed: true, job };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[Pipeline Claim] Atomic claim error for job ${jobId}:`, errMsg);
    return { claimed: false };
  }
}

async function stepRender(
  job: Record<string, unknown>,
  story: Record<string, unknown> | null,
  jobId: string
): Promise<void> {
  const jobConfig = job.config ? (typeof job.config === "string" ? JSON.parse(job.config) : job.config) : {};
  const videoId =
    (jobConfig as { videoId?: string })?.videoId ||
    (story as { video?: { id?: string } } | null)?.video?.id;
  if (!videoId) {
    throw new Error("No video ID found for render step");
  }

  workerLog.info(`  🎞️  Render: Triggering native Remotion render for video ${videoId}...`);
  const ok = await reportProgress(jobId, {
    step: "rendering",
    status: "RENDER_IN_PROGRESS",
    doneSteps: 0,
  });
  if (!ok) throw new Error("Job Cancelled");

  const { outputPath, duration, thumbnailStorageKey, thumbnailPath } = await executeRenderTask(
    jobId,
    async (progressData) => {
      const pOk = await reportProgress(jobId, progressData);
      if (!pOk) {
        throw new Error("Job Cancelled");
      }
      return pOk;
    }
  );

  workerLog.info(`  ✅ Render completed! Output: ${outputPath}`);

  const renderDuration = duration || 60;
  const creditsUsed = renderDuration * PRICING.COST_PER_RENDER_SEC;

  await reportProgress(jobId, {
    step: "render_complete",
    status: "DONE",
    result: { outputPath, duration, thumbnailStorageKey, thumbnailPath },
    creditsUsed,
  });

  // Trigger auto-publishing now that the video record and outputPath are committed in DB
  try {
    workerLog.info(`  📣 Triggering auto-publish after video record committed in DB...`);
    await triggerAutoPublish(jobId);
  } catch (publishErr) {
    console.warn(`  ⚠️ Failed to trigger auto-publish:`, publishErr);
  }
}

export async function processJob(queuedJob: QueuedJob): Promise<void> {
  const { id: jobId, totalSteps } = queuedJob;
  const startedAt = Date.now();

  workerLog.info(`\n🔄 Claiming job ${jobId} atomically...`);

  const claim = await claimJob(jobId, config.workerId);
  if (!claim.claimed) {
    workerLog.info("  ❌ Job was claimed by another worker — skipping");
    return;
  }

  workerLog.info(`✅ Claimed job ${jobId}`);
  currentJobId = jobId;
  isProcessing = true;

  // Send heartbeats ONLY while actively processing a job (zero idle heartbeats)
  void heartbeat();
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = setInterval(() => void heartbeat(), config.heartbeatIntervalMs);
  heartbeatTimer.unref?.();

  const job = claim.job!;
  const story = claim.story;
  const jobLog = workerLog.child({
    jobId: job.id,
    jobType: (job as { jobType?: string; type?: string }).jobType ?? (job as { type?: string }).type,
    storyId: job.storyId,
    companyId: job.companyId ?? null,
  });
  jobLog.info({ attempt: Number(job.attempts ?? 0) + 1 }, "Claimed pipeline job");
  try {
    const jobConfig = job.config ? (typeof job.config === "string" ? JSON.parse(job.config) : job.config) : {};
    const studioType = (job as { studioType?: string }).studioType || (jobConfig as { studioType?: string }).studioType;

    if (studioType) {
      if (comfyuiProcess === null) await startComfyUIServer();
      clearComfyIdleTimeout();
      await stepStudioJob(job, story || null, jobId, studioType, () => isShuttingDown);
      resetComfyIdleTimeout();
      return;
    }

    if ((ECOMMERCE_MEDIA_JOB_TYPES as readonly string[]).includes(String(job.type))) {
      await stepEcommerceMediaTask(job, jobId);
    } else if (job.type === "turntable_3d") {
      // 3D Product Turntable — pure HTTP orchestration against Object3D-Server (:8020).
      // No local GPU servers are started; the Object3D stack manages its own VRAM.
      await stepTurntable3D(job, jobId);
    } else if (job.type === "wardrobe_inpaint") {
      if (comfyuiProcess === null) await startComfyUIServer();
      clearComfyIdleTimeout();
      await stepWardrobeInpaint(job, jobId);
      resetComfyIdleTimeout();
    } else if (job.type === "image") {
      if (comfyuiProcess === null) await startComfyUIServer();
      clearComfyIdleTimeout();
      await stepImage(job, jobId);
      resetComfyIdleTimeout();
    } else if (job.type === "audio" || config.role === "audio") {
      if (modernTtsProcess === null) await startModernTtsServer();
      clearModernTtsIdleTimeout();

      const durations = await stepTTS(job, story!, claim.defaultVoices, jobId, () => isShuttingDown);
      if (isShuttingDown) return;

      resetModernTtsIdleTimeout();
      await stepRecalibrateTiming(durations, jobId);
    } else if (
      job.type === "video_full" ||
      job.type === "comfy_wan" ||
      job.type === "minimax" ||
      job.type === "taomate" ||
      job.type === "veo" ||
      job.type === "ltx" ||
      (config.role === "video" && (config.engine === "full" || config.engine === "minimax" || config.engine === "taomate" || config.engine === "veo" || config.engine === "ltx"))
    ) {
      const isVeoOnly = config.engine === "veo" || job.type === "veo";
      if (!isVeoOnly && comfyuiProcess === null) await startComfyUIServer();
      if (!isVeoOnly) clearComfyIdleTimeout();
      const targetStrategy = config.engine || (job.type === "video_full" ? "full" : String(job.type));
      await stepVideo(job, story!, jobId, targetStrategy, config, () => isShuttingDown);
      if (!isVeoOnly) resetComfyIdleTimeout();
    } else if (
      job.type === "video_bubble" ||
      job.type === "musetalk" ||
      job.type === "ditto" ||
      (config.role === "video" && (config.engine === "bubble" || config.engine === "musetalk" || config.engine === "ditto"))
    ) {
      if (modernTalkingHeadProcess === null) await startModernTalkingHeadServer();
      clearModernTalkingHeadIdleTimeout();
      const targetStrategy = config.engine === "ditto" || job.type === "ditto" ? "ditto" : "bubble";
      await stepVideo(job, story!, jobId, targetStrategy, config, () => isShuttingDown);
      resetModernTalkingHeadIdleTimeout();
    } else if (job.type === "video" || config.role === "video") {
      const isTalkingHead = config.engine === "bubble" || config.engine === "musetalk" || config.engine === "ditto" || isMac;
      const isVeoOnly = config.engine === "veo";
      if (!isTalkingHead && !isVeoOnly && comfyuiProcess === null) await startComfyUIServer();
      if (isTalkingHead && modernTalkingHeadProcess === null) await startModernTalkingHeadServer();
      if (!isVeoOnly) clearComfyIdleTimeout();
      clearModernTalkingHeadIdleTimeout();
      const targetStrategy = config.engine === "ditto" ? "ditto" : isTalkingHead ? "bubble" : (config.engine || "full");
      await stepVideo(job, story!, jobId, targetStrategy, config, () => isShuttingDown);
      if (!isTalkingHead && !isVeoOnly) resetComfyIdleTimeout();
      if (isTalkingHead) resetModernTalkingHeadIdleTimeout();
    } else if (job.type === "render" || config.role === "render") {
      await stepRender(job, story || null, jobId);
    } else {
      // Full pipeline: TTS (Modern-TTS:8005) -> Timing Recalibration -> Video (MuseTalk/Wan) -> Render
      // Guard: non-story job types (e.g. a type this worker build doesn't dispatch) come back from
      // the claim route without a story payload and must never run the full story pipeline.
      if (!story) {
        throw new Error(`Unsupported job type "${String(job.type)}": no story payload for the full story pipeline`);
      }
      if (modernTtsProcess === null) await startModernTtsServer();
      clearModernTtsIdleTimeout();

      const durations = await stepTTS(job, story!, claim.defaultVoices, jobId, () => isShuttingDown);
      if (isShuttingDown) return;
      await stepRecalibrateTiming(durations, jobId);
      if (isShuttingDown) return;

      resetModernTtsIdleTimeout();

      if (!isMac && comfyuiProcess === null) await startComfyUIServer();
      if (modernTalkingHeadProcess === null) await startModernTalkingHeadServer();
      clearComfyIdleTimeout();
      clearModernTalkingHeadIdleTimeout();

      await stepVideo(job, story!, jobId, "full", config, () => isShuttingDown);
      if (isShuttingDown) return;

      await stepRender(job, story!, jobId);

      stopModernTtsServer();
      stopModernTalkingHeadServer();
      stopComfyUIServer();
    }

    if (isShuttingDown) return;

    const durationMs = Date.now() - startedAt;
    jobLog.info({ durationMs, totalSteps }, "Completed pipeline job");

    await reportProgress(jobId, {
      step: "done",
      status: "DONE",
      doneSteps: totalSteps,
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const attempts = Number(job.attempts ?? 0) + 1;
    const maxAttempts = Number(job.maxAttempts ?? 3);

    if (attempts < maxAttempts && !isShuttingDown) {
      const backoffSec = Math.min(60, Math.pow(2, attempts) * 5); // 10s, 20s, 40s
      console.warn(`\n⚠️  Job ${jobId} failed attempt ${attempts}/${maxAttempts}. Scheduling backoff retry in ${backoffSec}s... Error: ${errorMsg}`);
      jobLog.warn(
        { err: error, attempts, maxAttempts, backoffSec, durationMs: Date.now() - startedAt },
        `Job failed attempt ${attempts}/${maxAttempts}. Scheduling backoff retry.`
      );

      await reportProgress(jobId, {
        step: "retry",
        status: "QUEUED",
        errorLog: `Attempt ${attempts}/${maxAttempts} failed: ${errorMsg}. Retrying in ${backoffSec}s.`,
      });
      await new Promise((r) => setTimeout(r, backoffSec * 1000));
    } else {
      console.error(`\n💥 Job ${jobId} permanently failed after ${attempts} attempts:`, errorMsg);
      jobLog.error(
        { err: error, attempts, maxAttempts, durationMs: Date.now() - startedAt },
        `Job permanently failed after ${attempts} attempts`
      );

      await reportProgress(jobId, {
        step: currentJobId ? `failed` : "unknown",
        status: "FAILED",
        errorLog: errorMsg,
      });

      sendOperationalAlert({
        title: `Worker Job Dead-Lettered: ${job.type}`,
        message: `Pipeline worker permanently failed job ${jobId} (${job.type}) after ${attempts} attempts: ${errorMsg}`,
        severity: "critical",
        eventType: "worker_job_dead_letter",
        companyId: String(job.companyId || "") || null,
        metadata: {
          jobId: String(jobId),
          jobType: String(job.type),
          storyId: String(job.storyId || ""),
          attempts: Number(attempts),
          maxAttempts: Number(maxAttempts),
          workerRole: String(config.role || ""),
          error: String(errorMsg),
        },
      }).catch(() => {});
    }
  } finally {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    isProcessing = false;
    currentJobId = null;

    // Proactive memory cleanup after heavy audio/video/render task execution
    if (typeof global.gc === "function") {
      try {
        global.gc();
      } catch {
        // Ignore GC errors
      }
    }

    // Memory Watchdog: Self-healing check to prevent memory accumulation over long-running daemons
    const postJobMem = process.memoryUsage();
    const postJobRssMb = Math.round(postJobMem.rss / 1024 / 1024);
    const maxAllowedRssMb = parseInt(process.env.WORKER_MAX_RAM_MB || "1800", 10);

    if (postJobRssMb > maxAllowedRssMb) {
      console.warn(`\n⚠️  [Worker Watchdog] Memory threshold exceeded (${postJobRssMb}MB > ${maxAllowedRssMb}MB). Initiating graceful process self-recycle...`);
      shutdown("WATCHDOG_RECYCLE");
    }
  }
}

export async function poll(): Promise<void> {
  if (isShuttingDown || isProcessing) return;

  try {
    const job = await pollQueue();
    if (job) {
      workerLog.info(`\n📬 Found queued job: ${job.id} (story: ${job.storyId})`);
      await processJob(job);
    }
  } catch (error) {
    console.error("⚠️  Poll error:", error instanceof Error ? error.message : error);
  }
}

function interruptibleSleep(ms: number): Promise<"woken" | "timeout"> {
  if (pendingWakeReason !== null) {
    return Promise.resolve("woken");
  }
  return new Promise((resolve) => {
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      sleepCancel = null;
      resolve("timeout");
    }, ms);
    timer.unref?.();

    sleepCancel = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      sleepCancel = null;
      resolve("woken");
    };
  });
}

function wakeWorker(reason: string): void {
  pendingWakeReason = reason;
  void heartbeat();
  if (reason === "tts_preview") {
    void drainTtsPreviewTasks();
  } else {
    void drainTtsPreviewTasks();
    void drainLlmTasks();
  }
  if (sleepCancel) {
    sleepCancel();
  }
}

async function synthesizePreviewWav(params: {
  text: string;
  engine: string;
  checkpoint: string;
  personaId: string;
  referenceAudio: string;
  pitchShift: number;
  speedFactor: number;
  language: string;
  applyYeismo: boolean;
}): Promise<{
  audioBuffer: Buffer;
  latencyMs: number;
  usedEngine: string;
  model: string;
}> {
  if (modernTtsProcess === null) {
    await startModernTtsServer();
  }
  clearModernTtsIdleTimeout();
  resetModernTtsIdleTimeout();

  const startedAt = performance.now();
  const audioBuffer = await generateAudioWithModernTts(params.text, params.referenceAudio, {
    engine: params.engine as ModernTtsOptions["engine"],
    checkpoint: params.checkpoint,
    personaId: params.personaId,
    pitchShift: Number.isFinite(params.pitchShift) ? params.pitchShift : 0.0,
    speedFactor: Number.isFinite(params.speedFactor) ? params.speedFactor : 1.0,
    language: params.language,
    applyYeismo: params.applyYeismo,
  });
  const latencyMs = Math.round(performance.now() - startedAt);
  resetModernTtsIdleTimeout();

  return {
    audioBuffer,
    latencyMs,
    usedEngine: String(audioBuffer.usedEngine || params.engine),
    model: String(audioBuffer.model || params.checkpoint),
  };
}

async function drainTtsPreviewTasks(): Promise<void> {
  if (isShuttingDown) return;
  if (isDrainingTtsPreview) {
    pendingTtsPreviewDrain = true;
    return;
  }
  isDrainingTtsPreview = true;
  try {
    do {
      pendingTtsPreviewDrain = false;
      while (!isShuttingDown) {
        const task = await claimTtsPreviewTask(config.workerId);
        if (!task) break;
        try {
          const synth = await synthesizePreviewWav({
            text: task.text,
            engine: task.engine,
            checkpoint: task.checkpoint,
            personaId: task.personaId,
            referenceAudio: task.referenceAudio,
            pitchShift: task.pitchShift,
            speedFactor: task.speedFactor,
            language: task.language,
            applyYeismo: task.applyYeismo,
          });
          await completeTtsPreviewTask(task.taskId, {
            status: "done",
            audioBase64: synth.audioBuffer.toString("base64"),
            latencyMs: synth.latencyMs,
            engine: synth.usedEngine,
            model: synth.model,
          });
          workerLog.info(
            { taskId: task.taskId, engine: synth.usedEngine, latencyMs: synth.latencyMs },
            "Completed cloud-relayed TTS preview task"
          );
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          await completeTtsPreviewTask(task.taskId, {
            status: "failed",
            error: errMsg,
          }).catch(() => {});
          workerLog.warn({ taskId: task.taskId, err: errMsg }, "Cloud-relayed TTS preview task failed");
        }
      }
    } while (pendingTtsPreviewDrain && !isShuttingDown);
  } catch (err) {
    workerLog.warn(
      { err: err instanceof Error ? err.message : String(err) },
      "Error draining TTS preview tasks"
    );
  } finally {
    isDrainingTtsPreview = false;
  }
}

async function sweepExpiredTempStorage(): Promise<void> {
  if (process.env.STORAGE_PROVIDER !== "r2") return;
  if (Date.now() - lastTempSweepAt < TEMP_SWEEP_INTERVAL_MS) return;
  lastTempSweepAt = Date.now();

  const rawPrefix = (process.env.S3_KEY_PREFIX || "").trim().replace(/^\/+|\/+$/g, "");
  const tempPrefix = rawPrefix ? `${rawPrefix}/temp/` : "temp/";
  const cutoffMs = Date.now() - TEMP_MAX_AGE_MS;

  try {
    let continuationToken: string | undefined;
    let deletedCount = 0;

    do {
      const listed = await s3Client.send(
        new ListObjectsV2Command({
          Bucket: BUCKET_NAME,
          Prefix: tempPrefix,
          ContinuationToken: continuationToken,
        })
      );
      for (const obj of listed.Contents || []) {
        if (obj.Key && obj.LastModified && obj.LastModified.getTime() < cutoffMs) {
          await s3Client.send(
            new DeleteObjectCommand({
              Bucket: BUCKET_NAME,
              Key: obj.Key,
            })
          );
          deletedCount += 1;
        }
      }
      continuationToken = listed.IsTruncated ? listed.NextContinuationToken : undefined;
    } while (continuationToken && !isShuttingDown);

    if (deletedCount > 0) {
      workerLog.info({ deletedCount, tempPrefix }, "Swept expired temporary R2 objects");
    }
  } catch (err) {
    workerLog.warn(
      { err: err instanceof Error ? err.message : String(err) },
      "Temporary R2 sweep skipped due to error"
    );
  }
}

async function drainLlmTasks(): Promise<void> {
  if (isShuttingDown) return;
  if (isDrainingLlm) {
    pendingLlmDrain = true;
    return;
  }
  isDrainingLlm = true;
  try {
    do {
      pendingLlmDrain = false;
      while (!isShuttingDown) {
        const task = await claimLlmTask(config.workerId);
        if (!task) break;
        const started = Date.now();
        try {
          const res = await runLocalLlm({
            prompt: task.prompt,
            systemPrompt: task.systemPrompt,
            schema: task.schema,
            model: task.model,
            effort: task.effort,
          });
          await completeLlmTask(task.taskId, {
            status: "done",
            text: res.text,
            model: res.model,
            engine: res.engine,
            inputTokens: res.inputTokens,
            outputTokens: res.outputTokens,
          });
          workerLog.info(
            { taskId: task.taskId, engine: res.engine, model: res.model, durationMs: Date.now() - started },
            "Completed local broker LLM task"
          );
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          await completeLlmTask(task.taskId, {
            status: "failed",
            error: errMsg,
          }).catch(() => {});
          workerLog.warn({ taskId: task.taskId, err: errMsg }, "Local broker LLM task failed");
        }
      }
    } while (pendingLlmDrain && !isShuttingDown);
  } catch (err) {
    workerLog.warn(
      { err: err instanceof Error ? err.message : String(err) },
      "Error draining LLM tasks"
    );
  } finally {
    isDrainingLlm = false;
  }
}

async function drainJobQueue(): Promise<void> {
  let processedAny = false;
  while (!isShuttingDown && !isProcessing) {
    const job = await pollQueue();
    if (!job) break;
    processedAny = true;
    workerLog.info(`\n📬 Found queued job: ${job.id} (story: ${job.storyId})`);
    await processJob(job);
  }

  if (processedAny && !isShuttingDown && !isProcessing) {
    await new Promise((r) => setTimeout(r, 800));
    while (!isShuttingDown && !isProcessing) {
      const followUp = await pollQueue();
      if (!followUp) break;
      workerLog.info(`\n📬 Found follow-up job: ${followUp.id} (story: ${followUp.storyId})`);
      await processJob(followUp);
    }
  }
}

const MAX_WAKE_PREVIEW_BODY_BYTES = 1024 * 1024;

async function readJsonBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;

    req.on("data", (chunk: Buffer) => {
      totalBytes += chunk.length;
      if (totalBytes > MAX_WAKE_PREVIEW_BODY_BYTES) {
        req.destroy();
        reject(new Error("Request payload too large"));
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        const parsed = JSON.parse(raw);
        resolve(parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {});
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });

    req.on("error", (err) => reject(err));
  });
}

async function handleLocalWakeTtsPreview(
  req: http.IncomingMessage,
  res: http.ServerResponse
): Promise<void> {
  let body: Record<string, unknown>;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message === "Request payload too large" ? 413 : 400;
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: message }));
    return;
  }

  const text =
    typeof body.text === "string" && body.text.trim().length > 0
      ? body.text
      : "Welcome to Ruby News Studio. Testing voice synthesis calibration.";
  const engine = typeof body.engine === "string" && body.engine ? body.engine : "piper";
  const checkpoint =
    typeof body.checkpoint === "string" && body.checkpoint
      ? body.checkpoint
      : "en_US-lessac-high";
  const personaId = typeof body.personaId === "string" && body.personaId ? body.personaId : "ruby";
  const referenceAudio =
    typeof body.referenceAudio === "string" && body.referenceAudio
      ? body.referenceAudio
      : "Emily.wav";
  const pitchShift = Number(body.pitchShift ?? 0.0);
  const speedFactor = Number(body.speedFactor ?? 1.0);
  const language = typeof body.language === "string" && body.language ? body.language : "auto";
  const applyYeismo = body.applyYeismo !== undefined ? Boolean(body.applyYeismo) : true;

  try {
    const synth = await synthesizePreviewWav({
      text,
      engine,
      checkpoint,
      personaId,
      referenceAudio,
      pitchShift: Number.isFinite(pitchShift) ? pitchShift : 0.0,
      speedFactor: Number.isFinite(speedFactor) ? speedFactor : 1.0,
      language,
      applyYeismo,
    });

    res.writeHead(200, {
      "Content-Type": "audio/wav",
      "Content-Length": String(synth.audioBuffer.length),
      "X-Synthesis-Latency-Ms": String(synth.latencyMs),
      "X-Synthesis-Engine": synth.usedEngine,
      "X-Synthesis-Model": synth.model,
    });
    res.end(synth.audioBuffer);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    workerLog.warn({ err: message }, "Local wake /tts/preview failed");
    if (!res.headersSent) {
      res.writeHead(503, { "Content-Type": "application/json" });
    }
    if (!res.writableEnded) {
      res.end(JSON.stringify({ error: message }));
    }
  }
}

export function startLocalWakeServer(port = config.wakePort): http.Server {
  const server = http.createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader(
      "Access-Control-Expose-Headers",
      "X-Synthesis-Latency-Ms, X-Synthesis-Engine, X-Synthesis-Model"
    );
    res.setHeader("Access-Control-Allow-Private-Network", "true");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const reqPath = (req.url || "/").split("?")[0];

    if (reqPath === "/wake") {
      wakeWorker("http_wake");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, woken: true, workerId: config.workerId }));
      return;
    }

    if (reqPath === "/status" || reqPath === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: true,
          service: "newsstudio-worker",
          running: true,
          busy: isProcessing,
          activeJobId: currentJobId,
          workerId: config.workerId,
          role: config.role,
          engine: config.engine,
          isProcessing,
          currentJobId,
          uptimeSec: Math.round((Date.now() - workerStartedAt) / 1000),
        })
      );
      return;
    }

    if (reqPath === "/tts/preview" && req.method === "POST") {
      void handleLocalWakeTtsPreview(req, res);
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  });

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      workerLog.warn(`Wake loopback port 127.0.0.1:${port} already in use; relying on Supabase Realtime`);
    } else {
      workerLog.warn({ err: err.message }, "Local wake server error");
    }
  });

  server.listen(port, "127.0.0.1", () => {
    workerLog.info(`🔔 Local HTTP wake server listening on http://127.0.0.1:${port}`);
  });

  wakeServer = server;
  return server;
}

async function heartbeat(): Promise<void> {
  const type = config.role === "video" && config.engine ? `video_${config.engine}` : config.role;
  const mem = process.memoryUsage();
  const toMB = (bytes: number) => Math.round((bytes / 1024 / 1024) * 100) / 100;

  await sendHeartbeat({
    workerId: config.workerId,
    hostname: config.hostname,
    type,
    status: isProcessing ? "busy" : "idle",
    currentJobId: currentJobId ?? undefined,
    processMemoryMB: toMB(mem.rss),
    heapUsedMB: toMB(mem.heapUsed),
  });
}

function shutdown(signal: string): void {
  if (isShuttingDown) return;
  isShuttingDown = true;
  setShuttingDown(true);

  workerLog.info(`\n⚡ Received ${signal} — shutting down gracefully...`);

  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  if (realtimeStop) {
    realtimeStop();
    realtimeStop = null;
  }
  if (wakeServer) {
    try {
      wakeServer.close();
    } catch {
      // ignore
    }
    wakeServer = null;
  }
  if (sleepCancel) {
    sleepCancel();
  }

  stopModernTtsServer();
  stopComfyUIServer();

  if (isProcessing) {
    workerLog.info("  ⏳ Waiting for current step to finish...");
    const checkDone = setInterval(() => {
      if (!isProcessing) {
        clearInterval(checkDone);
        workerLog.info("  ✅ Current step finished. Exiting.");
        process.exit(0);
      }
    }, 500);

    setTimeout(() => {
      clearInterval(checkDone);
      console.error("  ⚠️  Forced exit after 60s timeout");
      process.exit(1);
    }, 60_000);
  } else {
    workerLog.info("  ✅ No active work. Exiting immediately.");
    process.exit(0);
  }
}

export async function main(): Promise<void> {
  workerLog.info("═══════════════════════════════════════════");
  workerLog.info("  🏭 NewsStudio Pipeline Worker");
  workerLog.info("═══════════════════════════════════════════\n");

  const isHeadless =
    !process.stdout.isTTY ||
    process.env.CI === "true" ||
    process.env.NODE_ENV === "production" ||
    process.env.HEADLESS === "true";

  if (!isMac && config.role === "video" && !config.engine) {
    if (isHeadless) {
      config.engine = process.env.DEFAULT_FULL_VIDEO_ENGINE || process.env.DEFAULT_VIDEO_ENGINE || "veo";
      workerLog.info(`🤖 Headless container environment detected. Defaulting video engine to: ${config.engine}`);
    } else {
      const { default: prompts } = await import("prompts");
      const response = await prompts({
        type: "select",
        name: "engine",
        message: "Select the video engine to run on this worker:",
        choices: [
          { title: "Google Veo 3.1 Cloud API (Zero VRAM)", value: "veo" },
          { title: "MiniMax H3 + TaoMate LoRA (ComfyUI)", value: "minimax" },
          { title: "MuseTalk 40 FPS (Port 8007)", value: "musetalk" },
          { title: "ComfyUI Wan 2.1 / LTX-Video (Port 8188)", value: "comfy_wan" },
        ],
      });

      if (!response.engine) {
        workerLog.info("❌ No engine selected. Exiting.");
        process.exit(1);
      }

      config.engine = response.engine;
    }
  }

  validateConfig();

  if ((config.role === "video" || config.role === "full") && !config.engine) {
    if (isMac) {
      config.engine = "musetalk";
      workerLog.info(`💻 Mac detected. Defaulting engine to: ${config.engine}`);
    } else {
      config.engine = process.env.DEFAULT_FULL_VIDEO_ENGINE || process.env.DEFAULT_VIDEO_ENGINE || "veo";
      workerLog.info(`Selected engine: ${config.engine}`);
    }
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  startLocalWakeServer();
  void heartbeat();

  const supaCfg = resolveSupabaseConfigFromEnv();
  if (supaCfg) {
    const listener = startSupabaseRealtimeListener(supaCfg, {
      onWake: (reason) => wakeWorker(reason),
      onLog: (msg) => workerLog.info(msg),
    });
    realtimeStop = listener.stop;
  } else {
    workerLog.warn(`⚠️  SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY unset — Realtime wake disabled; relying on HTTP :${config.wakePort} wake and safety sleep.`);
  }

  workerLog.info(
    {
      workerId: config.workerId,
      role: config.role,
      engine: config.engine,
      dbSafetyPollMs: config.dbSafetyPollMs,
      wakePort: config.wakePort,
    },
    "NewsStudio Pipeline Worker initialized (zero-idle-poll mode)"
  );

  // Initial startup drain (only hits Railway if Supabase reports queued work or Supabase env is unset)
  const shouldDrainOnBoot = !supaCfg || (await checkSupabaseQueuedJobs(supaCfg));
  if (shouldDrainOnBoot) {
    await drainTtsPreviewTasks();
    await drainLlmTasks();
    await drainJobQueue();
  }

  while (!isShuttingDown) {
    const wakeOutcome = await interruptibleSleep(config.dbSafetyPollMs);
    if (isShuttingDown) break;

    if (wakeOutcome === "woken") {
      pendingWakeReason = null;
      await drainTtsPreviewTasks();
      await drainLlmTasks();
      await drainJobQueue();
      continue;
    }

    await sweepExpiredTempStorage();

    // 15m safety sweep: query Supabase PostgREST directly (<300 bytes) with 0 Railway traffic when idle
    if (supaCfg) {
      const dueSchedules = await checkSupabaseDueSchedules(supaCfg);
      for (const sched of dueSchedules) {
        await triggerScheduledRun(sched.id).catch(() => {});
      }
      const hasJobs = await checkSupabaseQueuedJobs(supaCfg);
      if (hasJobs || dueSchedules.length > 0) {
        await drainTtsPreviewTasks();
        await drainLlmTasks();
        await drainJobQueue();
      }
    } else {
      await drainTtsPreviewTasks();
      await drainLlmTasks();
      await drainJobQueue();
    }
  }
}

if (!process.env.VITEST && process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("pipeline-worker/index.ts")) {
  main().catch((error) => {
    workerLog.fatal({ err: error }, "Fatal worker error");
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

