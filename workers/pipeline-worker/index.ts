/**
 * workers/pipeline-worker/index.ts
 *
 * Standalone Pipeline Worker: polls the database queue, coordinates AI generation tasks,
 * executes atomic job claiming, manages background GPU model servers, and executes headless Remotion rendering.
 */

import { config, validateConfig } from "./config";
import { pollQueue, claimJob, reportProgress, sendHeartbeat, triggerAutoPublish } from "./api";
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
import { prisma } from "@/lib/prisma";
import { PRICING } from "@/lib/constants/pricing";
import { sendOperationalAlert } from "@/lib/alerting/notifier";
import { createLogger } from "@/lib/logger";

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
let pollTimer: ReturnType<typeof setInterval> | null = null;

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

    if (job.type === "turntable_3d") {
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

  if (pollTimer) clearInterval(pollTimer);
  if (heartbeatTimer) clearInterval(heartbeatTimer);

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

  await heartbeat();
  heartbeatTimer = setInterval(heartbeat, config.heartbeatIntervalMs);

  workerLog.info(
    {
      workerId: config.workerId,
      role: config.role,
      engine: config.engine,
      pollIntervalMs: config.pollIntervalMs,
    },
    "NewsStudio Pipeline Worker initialized"
  );

  workerLog.info(`\n🔍 Polling for jobs every ${config.pollIntervalMs}ms...\n`);
  pollTimer = setInterval(poll, config.pollIntervalMs);

  await poll();
}

if (!process.env.VITEST && process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("pipeline-worker/index.ts")) {
  main().catch((error) => {
    workerLog.fatal({ err: error }, "Fatal worker error");
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

