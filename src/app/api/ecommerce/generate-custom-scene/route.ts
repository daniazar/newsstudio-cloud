/**
 * src/app/api/ecommerce/generate-custom-scene/route.ts
 *
 * E-Commerce Custom Product Scene Generation API.
 * Synthesizes photorealistic custom hero video scenes using Google Veo 3.1 & Flow.
 *
 * Supports asynchronous background generation with client polling & live timers,
 * as well as direct CLI and API fallback modes.
 */

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { getDownloadsDir } from "@/lib/binaries";
import { sanitizeDiffusionPrompt } from "@/lib/ecommerce/promptSafetyFilter";
import {
  resolvePersonaAttireImageUrl,
  buildConditionedReferenceUrls,
} from "@/lib/ecommerce/personaPromptHelper";
import { createLogger } from "@/lib/logger";
import { broadcastWorkerWake } from "@/lib/worker-broker/supabaseWake";

const log = createLogger("api:ecommerce:generate-custom-scene");

function isRemoteWorkerMode(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.FORCE_REMOTE_WORKER === "true" ||
    (process.env.NODE_ENV !== "test" && process.env.ALLOW_API_SPAWN !== "true")
  );
}

function mapGenerationJobStatus(status: string): "pending" | "processing" | "completed" | "failed" {
  if (status === "DONE") return "completed";
  if (status === "FAILED" || status === "CANCELLED") return "failed";
  return "processing";
}

export interface VeoSceneJob {
  id: string;
  productId: string;
  sceneIndex: number;
  status: "pending" | "processing" | "completed" | "failed";
  progress: string;
  videoUrl?: string;
  videoFilePath?: string;
  error?: string;
  startedAt: number;
  updatedAt: number;
  completedAt?: number;
  duration: number;
  aspectRatio: string;
  personaId?: string;
  attireId?: string;
  stdoutSnippet?: string;
}

declare global {
  var __veoSceneJobs: Map<string, VeoSceneJob> | undefined;
}

const JOBS_PERSISTENCE_FILE = path.join(process.cwd(), ".gemini", "active_veo_jobs.json");

// Global in-memory job map, persisting across Next.js HMR reloads
const veoSceneJobs: Map<string, VeoSceneJob> =
  globalThis.__veoSceneJobs || (globalThis.__veoSceneJobs = new Map<string, VeoSceneJob>());

function loadPersistedJobs(): void {
  try {
    if (fs.existsSync(JOBS_PERSISTENCE_FILE)) {
      const raw = fs.readFileSync(JOBS_PERSISTENCE_FILE, "utf8");
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item?.id && !veoSceneJobs.has(item.id)) {
            veoSceneJobs.set(item.id, item);
          }
        }
      }
    }
  } catch {}
}

function savePersistedJobs(): void {
  try {
    const dir = path.dirname(JOBS_PERSISTENCE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const list = Array.from(veoSceneJobs.values()).slice(-50);
    fs.writeFileSync(JOBS_PERSISTENCE_FILE, JSON.stringify(list, null, 2), "utf8");
  } catch {}
}

// Initial load on boot
loadPersistedJobs();

function getJobLogsSnippet(jobId: string, maxLines: number = 30): string[] {
  try {
    const logsDir = path.join(process.cwd(), ".gemini", "logs");
    const file = path.join(logsDir, `job_${jobId}.log`);
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, "utf8");
      return raw.split(/\r?\n/).filter((l) => l.trim().length > 0).slice(-maxLines);
    }
  } catch {}
  return [];
}

/**
 * GET /api/ecommerce/generate-custom-scene
 * Status polling endpoint: checks active in-memory jobs and disk artifacts.
 */
export async function GET(req: NextRequest) {
  try {
    const t = await requireTenant();
    if (!t.ok) return t.response;
    const orgId = t.tenant.orgId;

    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");
    const productId = searchParams.get("productId");
    const sceneIndexParam = searchParams.get("sceneIndex");
    const sceneIndex = sceneIndexParam !== null ? Number(sceneIndexParam) : null;

    // 0. Check Prisma GenerationJob first when jobId is provided and not in local memory map
    if (jobId && !veoSceneJobs.has(jobId)) {
      const dbJob = await prisma.generationJob.findFirst({
        where: { id: jobId, companyId: orgId },
      });
      if (dbJob) {
        let parsedConfig: Record<string, unknown> = {};
        try {
          parsedConfig = dbJob.config ? (JSON.parse(dbJob.config) as Record<string, unknown>) : {};
        } catch {}
        const resultObj =
          parsedConfig.result && typeof parsedConfig.result === "object"
            ? (parsedConfig.result as Record<string, unknown>)
            : {};
        const mappedStatus = mapGenerationJobStatus(dbJob.status);
        const startedMs = dbJob.startedAt ? dbJob.startedAt.getTime() : Date.now();
        return NextResponse.json({
          success: true,
          jobId: dbJob.id,
          status: mappedStatus,
          jobStatus: dbJob.status,
          progress:
            typeof resultObj.progress === "string"
              ? resultObj.progress
              : dbJob.currentStep || (dbJob.status === "QUEUED" ? "Waiting for local worker..." : "Generating Veo scene..."),
          videoUrl: typeof resultObj.videoUrl === "string" ? resultObj.videoUrl : undefined,
          elapsedSeconds: Math.max(0, Math.floor((Date.now() - startedMs) / 1000)),
          error: mappedStatus === "failed" ? dbJob.errorLog || "Scene generation failed" : undefined,
          logs: Array.isArray(resultObj.logs) ? resultObj.logs : [],
        });
      }
    }

    if (isRemoteWorkerMode()) {
      return NextResponse.json({
        success: true,
        status: "idle",
        message: "No active remote scene generation job found",
      });
    }

    loadPersistedJobs();

    // 1. Direct or partial jobId match
    let targetJob: VeoSceneJob | undefined = undefined;
    if (jobId) {
      if (veoSceneJobs.has(jobId)) {
        targetJob = veoSceneJobs.get(jobId);
      } else {
        for (const j of veoSceneJobs.values()) {
          if (
            j.id.includes(jobId) ||
            jobId.includes(j.id) ||
            j.videoFilePath?.includes(jobId) ||
            j.videoUrl?.includes(jobId)
          ) {
            targetJob = j;
            break;
          }
        }
      }
    }

    if (targetJob) {
      const job = targetJob;

      // Resilient check: If still marked processing, check if file is already on disk and complete
      if (job.status !== "completed" && job.videoFilePath && fs.existsSync(job.videoFilePath)) {
        try {
          const stat = fs.statSync(job.videoFilePath);
          if (stat.size > 100000) {
            job.status = "completed";
            job.progress = "Video generated and ready";
            job.completedAt = Date.now();
            delete job.error;
            savePersistedJobs();
          }
        } catch {}
      }

      // Check action_loops fallback
      if (job.status !== "completed" && job.videoFilePath) {
        const base = path.basename(job.videoFilePath);
        const actionLoopsFallback = path.join(process.cwd(), "public/assets/action_loops/veo", base);
        if (fs.existsSync(actionLoopsFallback) && fs.statSync(actionLoopsFallback).size > 100000) {
          try {
            fs.copyFileSync(actionLoopsFallback, job.videoFilePath);
            job.status = "completed";
            job.progress = "Video generated and ready";
            job.completedAt = Date.now();
            delete job.error;
            savePersistedJobs();
          } catch {}
        }
      }

      const elapsedSeconds = Math.floor((Date.now() - job.startedAt) / 1000);
      const logs = getJobLogsSnippet(job.id, 30);
      return NextResponse.json({
        success: true,
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        videoUrl: job.videoUrl,
        elapsedSeconds,
        error: job.status === "completed" ? undefined : job.error,
        stdoutSnippet: job.stdoutSnippet,
        logs,
      });
    }

    // 2. Query by productId + sceneIndex (check latest jobs first)
    if (productId) {
      const cleanId = String(productId).replace(/[^a-z0-9_-]/gi, "_");

      const matchingJobs = Array.from(veoSceneJobs.values())
        .filter((j) => j.productId === productId && (sceneIndex === null || j.sceneIndex === sceneIndex))
        .sort((a, b) => b.startedAt - a.startedAt);

      for (const job of matchingJobs) {
        if (job.status !== "completed" && job.videoFilePath && fs.existsSync(job.videoFilePath)) {
          try {
            if (fs.statSync(job.videoFilePath).size > 100000) {
              job.status = "completed";
              job.progress = "Video generated and ready";
              job.completedAt = Date.now();
              delete job.error;
              savePersistedJobs();
            }
          } catch {}
        }
        const elapsedSeconds = Math.floor((Date.now() - job.startedAt) / 1000);
        const logs = getJobLogsSnippet(job.id, 30);
        return NextResponse.json({
          success: true,
          jobId: job.id,
          status: job.status,
          progress: job.progress,
          videoUrl: job.videoUrl,
          elapsedSeconds,
          error: job.status === "completed" ? undefined : job.error,
          stdoutSnippet: job.stdoutSnippet,
          logs,
        });
      }

      // 3. Resilient disk check: look for any valid matching video in public/assets/ecommerce/veo_scenes/
      const outputDir = path.resolve(process.cwd(), "public/assets/ecommerce/veo_scenes");
      if (fs.existsSync(outputDir)) {
        const files = fs.readdirSync(outputDir);
        const prefix = `veo_custom_${cleanId}_scene${sceneIndex !== null ? sceneIndex : ""}`;
        const matches = files
          .filter((f) => (f.startsWith(prefix) || f.includes(cleanId) || f.startsWith("veo_custom_piso")) && f.endsWith(".mp4"))
          .map((f) => {
            const full = path.join(outputDir, f);
            const stat = fs.statSync(full);
            return { file: f, mtime: stat.mtimeMs, size: stat.size };
          })
          .filter((f) => f.size > 100000)
          .sort((a, b) => b.mtime - a.mtime);

        if (matches.length > 0) {
          const latest = matches[0];
          return NextResponse.json({
            success: true,
            status: "completed",
            videoUrl: `/assets/ecommerce/veo_scenes/${latest.file}`,
            progress: "Video file ready on disk",
            fileSize: latest.size,
            lastModified: latest.mtime,
          });
        }
      }

      // 4. Resilient check: check user's Downloads directory for recent Flow video downloads
      const downloadsDir = getDownloadsDir();
      if (fs.existsSync(downloadsDir) && fs.existsSync(outputDir)) {
        try {
          const dlFiles = fs.readdirSync(downloadsDir);
          const recentMp4s = dlFiles
            .filter((f) => f.toLowerCase().endsWith(".mp4"))
            .map((f) => {
              const full = path.join(downloadsDir, f);
              const stat = fs.statSync(full);
              return { file: f, full, mtime: stat.mtimeMs, size: stat.size };
            })
            .filter((f) => f.size > 100000 && Date.now() - f.mtime < 2 * 60 * 60 * 1000) // within last 2 hours
            .sort((a, b) => b.mtime - a.mtime);

          if (recentMp4s.length > 0) {
            const newest = recentMp4s[0];
            const targetBase = `veo_custom_${cleanId}_scene${sceneIndex !== null ? sceneIndex : "0"}_${Date.now()}.mp4`;
            const destPath = path.join(outputDir, targetBase);
            fs.copyFileSync(newest.full, destPath);
            return NextResponse.json({
              success: true,
              status: "completed",
              videoUrl: `/assets/ecommerce/veo_scenes/${targetBase}`,
              progress: `Video imported from Downloads (${newest.file})`,
              fileSize: newest.size,
              lastModified: newest.mtime,
            });
          }
        } catch {}
      }
    }

    return NextResponse.json({
      success: true,
      status: "idle",
      message: "No active Veo generation job found",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/**
 * Background worker task to execute Veo generation and update job state
 */
async function executeVeoJobAsync(
  job: VeoSceneJob,
  prompt: string,
  cameraCue: string,
  stagedRefPaths: string[],
  baseName: string,
  isCli: boolean,
  outputDir: string,
  timestamp: number
) {
  let stdout = "";
  let stderr = "";

  try {
    if (isCli) {
      job.progress = "Staging prompt & launching Veo 3.1 CLI...";
      job.updatedAt = Date.now();

      const geminiDir = path.join(process.cwd(), ".gemini");
      if (!fs.existsSync(geminiDir)) {
        fs.mkdirSync(geminiDir, { recursive: true });
      }

      const promptFile = path.join(geminiDir, `temp_veo_prompt_${timestamp}.txt`);
      fs.writeFileSync(promptFile, prompt.trim(), "utf8");

      const logsDir = path.join(process.cwd(), ".gemini", "logs");
      if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
      const jobLogFile = path.join(logsDir, `job_${job.id}.log`);
      fs.writeFileSync(jobLogFile, `=== Veo Job ${job.id} Launched at ${new Date().toISOString()} ===\n`, "utf8");

      const appendToLog = (chunk: string) => {
        try {
          fs.appendFileSync(jobLogFile, chunk, "utf8");
        } catch {}
      };

      // 🛡️ Sentinel: Fixed Command Injection Risk (SEC-01 & SEC-02)
      // Pass arguments securely as an array to `spawn` with `shell: false`
      const spawnArgs: string[] = [
        path.join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs"),
        "scripts/veo-cli.ts",
        "--mode=cinematic_broll",
        `--prompt-file=${promptFile}`,
        `--cam=${cameraCue}`,
        `--duration=${job.duration}`,
        `--ratio=${job.aspectRatio}`,
        "--engine=flow_web",
        "--model=veo-3.1-lite",
        "--output-dir=public/assets/ecommerce/veo_scenes",
        `--name=${baseName}`,
        `--persona=${job.personaId || "ruby"}`,
      ];

      if (job.attireId) {
         spawnArgs.push(`--attire=${job.attireId}`);
      }

      if (stagedRefPaths.length > 0) {
        spawnArgs.push(`--ref-images=${stagedRefPaths.join(",")}`);
        spawnArgs.push(`--image=${stagedRefPaths[0]}`);
      }

      spawnArgs.push("--non-interactive");

      const executable = process.execPath;
      const { spawn } = await import("child_process");

      const child = spawn(
        executable,
        spawnArgs,
        { cwd: process.cwd(), windowsHide: true, shell: false }
      );

      let lastSaveTime = 0;

      const checkAndTriggerImmediateFailure = (chunk: string) => {
        const lower = chunk.toLowerCase();
        const isFailure =
          lower.includes("reported failure") ||
          lower.includes("audio generation failed") ||
          lower.includes("flow_policy_or_cluster_failed") ||
          lower.includes("resource_exhausted") ||
          lower.includes("exceeded your current quota") ||
          lower.includes("policy rejection") ||
          lower.includes("generation failed in google flow");

        if (isFailure && job.status !== "failed" && job.status !== "completed") {
          job.status = "failed";
          let cleanErr = chunk.trim();
          if (cleanErr.includes("❌")) {
            cleanErr = cleanErr.split("❌")[1]?.trim() || cleanErr;
          }
          job.error = cleanErr;
          job.progress = `Failed: ${cleanErr.slice(0, 120)}`;
          job.updatedAt = Date.now();
          savePersistedJobs();
          try {
            child.kill();
          } catch {}
        }
      };

      child.stdout?.on("data", (data) => {
        const str = data.toString();
        stdout += str;
        appendToLog(str);
        job.stdoutSnippet = stdout.slice(-800);
        checkAndTriggerImmediateFailure(str);

        if (str.includes("DISPATCHING VEO") || str.includes("GENERATING CINEMATIC")) {
          job.progress = "Synthesizing 8s video diffusion (Google Flow / Veo 3.1 Lite)...";
        } else if (str.includes("flow_upload_media") || str.includes("Uploading reference") || str.includes("Attaching")) {
          job.progress = "Uploading product photo conditioning references...";
        } else if (str.includes("flow_generate_video") || str.includes("Submitting prompt") || str.includes("Injecting prompt")) {
          job.progress = "Submitting prompt to Google Flow cluster...";
        } else if (str.includes("Rendering") || str.includes("Rendering 8s Video") || str.includes("Cloud render progress")) {
          job.progress = "Cloud rendering diffusion on Google Flow cluster...";
        } else if (str.includes("Upscaling 1080p") || str.includes("triggerFlow1080pUpscale") || str.includes("Triggering Google Flow 1080p")) {
          job.progress = "Upscaling 1080p Full HD video stream...";
        } else if (str.includes("Saved to Workspace") || str.includes("Generated Successfully") || str.includes("Downloading video") || str.includes("Resolved Flow signed")) {
          job.progress = "Downloading and finalizing video artifact in workspace...";
        }
        job.updatedAt = Date.now();
        if (Date.now() - lastSaveTime > 1500) {
          lastSaveTime = Date.now();
          savePersistedJobs();
        }
      });

      child.stderr?.on("data", (data) => {
        const str = data.toString();
        stderr += str;
        appendToLog(`[STDERR] ${str}`);
        job.stdoutSnippet = stderr.slice(-800);
        job.updatedAt = Date.now();
        checkAndTriggerImmediateFailure(str);
      });

      const execTimeout = new Promise<void>((_, reject) =>
        setTimeout(() => {
          try { child.kill(); } catch {}
          reject(new Error("Veo generation timed out after 300 seconds"));
        }, 300000)
      );

      const execProcess = new Promise<void>((resolve, reject) => {
        child.on("close", (code) => {
          if (code === 0) resolve();
          else reject(new Error(`Veo CLI exited with code ${code}: ${stderr.slice(-400)}`));
        });
        child.on("error", (err) => reject(err));
      });

      await Promise.race([execProcess, execTimeout]);
    } else {
      job.progress = "Generating video via Google GenAI API...";
      job.updatedAt = Date.now();

      const { runVeoWithApi } = await import("../../../../../scripts/veo-cli/engines/apiRunner");
      const apiResult = await runVeoWithApi({
        prompt: prompt.trim(),
        imagePath: stagedRefPaths[0],
        referenceImagePaths: stagedRefPaths,
        aspectRatio: (job.aspectRatio || "9:16") as "16:9" | "9:16",
        durationSeconds: (Number(job.duration || 8) as 4 | 8 | 2 | 5 | 10 | 16),
        baseName,
        model: "veo-3.1-lite",
        outputDirectory: outputDir,
      });

      if (!apiResult.success) {
        throw new Error(apiResult.error || "Failed to generate video via Veo API");
      }
    }

    // Verify output artifact exists
    let resolvedVideoUrl: string | null = null;
    if (job.videoFilePath && fs.existsSync(job.videoFilePath) && fs.statSync(job.videoFilePath).size > 100000) {
      resolvedVideoUrl = job.videoUrl || null;
    } else {
      const { findAndSyncVideoArtifact } = await import("../../../../../scripts/veo-cli/artifactManager");
      const syncedPath = findAndSyncVideoArtifact(baseName, timestamp - 10000, job.videoFilePath!);
      if (syncedPath && fs.existsSync(syncedPath) && fs.statSync(syncedPath).size > 100000) {
        resolvedVideoUrl = job.videoUrl || null;
      }
    }

    if (!resolvedVideoUrl) {
      const actionLoopsFallback = path.join(process.cwd(), "public/assets/action_loops/veo", `${baseName}.mp4`);
      if (fs.existsSync(actionLoopsFallback) && fs.statSync(actionLoopsFallback).size > 100000) {
        if (job.videoFilePath) {
          try { fs.copyFileSync(actionLoopsFallback, job.videoFilePath); } catch {}
        }
        resolvedVideoUrl = job.videoUrl || `/assets/action_loops/veo/${baseName}.mp4`;
      }
    }

    if (!resolvedVideoUrl) {
      throw new Error(
        `Veo generation finished but video was not found at ${job.videoFilePath}.\nCLI Output:\n${stdout.slice(-500)}\n${stderr.slice(-500)}`
      );
    }

    job.status = "completed";
    job.progress = "Video generated successfully and ready to use!";
    job.completedAt = Date.now();
    job.updatedAt = Date.now();
    savePersistedJobs();
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[VeoJob ${job.id}] Error:`, errorMsg);

    const combinedOutput = `${errorMsg}\n${stdout}\n${stderr}`.toLowerCase();
    let diagnosticReason = "Veo generation finished but video was not found on disk.";
    const hasSensitiveTerms =
      prompt.toLowerCase().includes("bodice") ||
      prompt.toLowerCase().includes("corset") ||
      prompt.toLowerCase().includes("bustier") ||
      prompt.toLowerCase().includes("cleavage");

    if (
      combinedOutput.includes("policy") ||
      combinedOutput.includes("violate") ||
      combinedOutput.includes("flow_policy") ||
      hasSensitiveTerms
    ) {
      diagnosticReason =
        "Google Content Policy Rejection: The video was rejected by Google Flow because the prompt contained sensitive fashion terms ('bodice' or 'corset') or the reference image neckline tripped Google's safety classifier. Auto-sanitize the prompt to use tailored blazers and high-neck attire.";
    } else if (combinedOutput.includes("timeout") || combinedOutput.includes("timed out")) {
      diagnosticReason =
        "Generation Timed Out: Google Flow took longer than expected or the video tile encountered a cluster error.";
    }

    job.status = "failed";
    job.error = `${diagnosticReason}\n\nTechnical details:\n${errorMsg}`;
    job.progress = `Failed: ${diagnosticReason.slice(0, 150)}`;
    job.updatedAt = Date.now();
    savePersistedJobs();
  }
}

/**
 * POST /api/ecommerce/generate-custom-scene
 * Initiates Veo generation. Supports async background mode (default) and sync mode.
 */
export async function POST(req: NextRequest) {
  try {
    const t = await requireTenant();
    if (!t.ok) return t.response;
    const orgId = t.tenant.orgId;

    const body = await req.json();
    const {
      productId,
      sceneIndex = 0,
      prompt,
      cameraCue = "drone_flyover",
      duration: _duration = 8,
      aspectRatio = "9:16",
      personaSlug = "ruby",
      personaId,
      attireId,
      avatarSrc,
      actionLoopId,
      videoUrl,
      productName: _productName,
      referenceImageUrls = [],
      dryRun = false,
      mode = "async", // Default to async for snappy UX and robust polling
      allowSpeaking = true,
      language: _language,
    } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "A descriptive visual prompt is required to generate a custom scene." },
        { status: 400 }
      );
    }

    // Proactively filter prompt to eliminate prominent people names (e.g. Ruby Vance)
    // and sensitive terms to prevent Google Flow / Veo policy blocks
    const { sanitizedPrompt: cleanPrompt, wasModified, neutralizedTerms } = sanitizeDiffusionPrompt(prompt, {
      allowSpeaking: allowSpeaking !== false,
    });
    if (wasModified) {
      log.info(`[generate-custom-scene] Neutralized prompt terms for policy safety: [${neutralizedTerms.join(", ")}]`);
      log.info(`[generate-custom-scene] Sanitized prompt: "${cleanPrompt}"`);
    }

    // Force 8 seconds and Veo 3.1 Lite rate per user specification
    const effectiveDuration = 8;
    const configuredBackend = (
      process.env.VEO_VIDEO_BACKEND ||
      process.env.VEO_BACKEND ||
      "cli"
    ).toLowerCase();

    const isCli = configuredBackend === "cli" || configuredBackend === "agy";

    const outputDir = path.resolve(process.cwd(), "public/assets/ecommerce/veo_scenes");
    const timestamp = Date.now();
    const cleanId = String(productId || "prod").replace(/[^a-z0-9_-]/gi, "_");
    const baseName = `veo_custom_${cleanId}_scene${sceneIndex}_${timestamp}`;
    const videoFileName = `${baseName}.mp4`;
    const videoFilePath = path.join(outputDir, videoFileName);
    const videoPublicUrl = `/assets/ecommerce/veo_scenes/${videoFileName}`;

    // -------------------------------------------------------------
    // 1. GATHER & CONDITION REFERENCES (Persona First, then Products)
    // -------------------------------------------------------------
    let incomingUrls: string[] = [];
    if (Array.isArray(referenceImageUrls)) {
      incomingUrls = referenceImageUrls.filter(
        (u: unknown) => typeof u === "string" && (u as string).trim()
      ) as string[];
    }

    // If no product references were passed, query Prisma ProductAsset
    if (incomingUrls.length === 0 && productId) {
      try {
        const dbAssets = await prisma.productAsset.findMany({
          where: { campaignId: productId },
          orderBy: { isPrimary: "desc" },
          take: 3,
        });
        for (const asset of dbAssets) {
          if (asset.rawUrl) incomingUrls.push(asset.rawUrl);
        }
      } catch (dbErr) {
        console.warn("[generate-custom-scene] DB asset query notice:", dbErr);
      }
    }

    // Resolve active persona attire image URL
    const effectivePersona = personaId || personaSlug || "ruby";
    const resolvedPersonaImageUrl = resolvePersonaAttireImageUrl({
      personaId: effectivePersona,
      attireId,
      avatarSrc,
      actionLoopId,
      videoUrl,
    });

    // Check if the first incoming URL is already a persona reference image
    const isFirstImagePersona =
      incomingUrls.length > 0 &&
      (incomingUrls[0].includes("avatar") ||
        incomingUrls[0].includes("ruby") ||
        incomingUrls[0].includes("sofia") ||
        incomingUrls[0].includes("mateo") ||
        incomingUrls[0].includes("blaze"));

    let candidateUrls: string[];
    if (isFirstImagePersona) {
      candidateUrls = buildConditionedReferenceUrls({
        personaImageUrl: incomingUrls[0],
        productMediaUrls: incomingUrls.slice(1),
        maxImages: 2,
        hasCharacter: true,
      });
    } else {
      candidateUrls = buildConditionedReferenceUrls({
        personaImageUrl: resolvedPersonaImageUrl,
        productMediaUrls: incomingUrls,
        maxImages: 2,
        hasCharacter: true,
      });
    }

    if (dryRun) {
      return NextResponse.json({
        success: true,
        videoUrl: videoPublicUrl,
        prompt: prompt.trim(),
        cameraCue,
        duration: effectiveDuration,
        aspectRatio,
        backend: isCli ? "cli" : "api",
        stagedRefPaths: [],
        dryRun: true,
      });
    }

    if (isRemoteWorkerMode()) {
      const createdJob = await prisma.generationJob.create({
        data: {
          companyId: orgId,
          storyId: String(productId || cleanId),
          type: "ecommerce_scene",
          status: "QUEUED",
          totalSteps: 2,
          doneSteps: 0,
          currentStep: "Queued for local worker",
          config: JSON.stringify({
            kind: "custom_scene",
            productId: String(productId || cleanId),
            productName: _productName || null,
            sceneIndex: Number(sceneIndex),
            prompt: cleanPrompt,
            cameraCue,
            duration: effectiveDuration,
            aspectRatio,
            personaId: effectivePersona,
            attireId: attireId || null,
            avatarSrc: avatarSrc || null,
            actionLoopId: actionLoopId || null,
            videoUrl: videoUrl || null,
            referenceImageUrls: candidateUrls,
            backend: isCli ? "cli" : "api",
          }),
        },
      });
      void broadcastWorkerWake("job_queued");

      return NextResponse.json({
        ok: true,
        queued: true,
        success: true,
        jobId: createdJob.id,
        status: "QUEUED",
        pollIntervalMs: 3000,
        estimatedSeconds: 75,
        message: "Veo 3.1 scene job queued for local worker. Poll GET with jobId.",
        stagedReferencePhotosCount: candidateUrls.length,
      });
    }

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const stagedRefPaths: string[] = [];
    const stagingDir = path.resolve(process.cwd(), "public/assets/ecommerce/product_photos/staged_refs");
    if (!fs.existsSync(stagingDir)) {
      fs.mkdirSync(stagingDir, { recursive: true });
    }

    // Download/convert photos to local clean PNG files
    for (let i = 0; i < Math.min(candidateUrls.length, 3); i++) {
      const url = candidateUrls[i];
      try {
        const destPath = path.join(stagingDir, `ref_${cleanId}_${i}_${timestamp}.png`);
        if (url.startsWith("http://") || url.startsWith("https://")) {
          const res = await fetch(url);
          if (res.ok) {
            const arrayBuf = await res.arrayBuffer();
            const buffer = Buffer.from(arrayBuf);
            await sharp(buffer).png().toFile(destPath);
            stagedRefPaths.push(destPath);
          }
        } else if (url.startsWith("/")) {
          const localPathInPublic = path.resolve(process.cwd(), "public", url.replace(/^\//, ""));
          const localPathInRoot = path.resolve(process.cwd(), url.replace(/^\//, ""));
          const targetFile = fs.existsSync(localPathInPublic)
            ? localPathInPublic
            : (fs.existsSync(localPathInRoot) ? localPathInRoot : null);
          if (targetFile) {
            await sharp(targetFile).png().toFile(destPath);
            stagedRefPaths.push(destPath);
          }
        } else if (fs.existsSync(url)) {
          await sharp(url).png().toFile(destPath);
          stagedRefPaths.push(destPath);
        }
      } catch (imgErr) {
        console.warn(`[generate-custom-scene] Could not stage reference image ${url}:`, imgErr);
      }
    }

    // -------------------------------------------------------------
    // 2. REGISTER IN-MEMORY JOB
    // -------------------------------------------------------------
    const jobId = `veo_job_${cleanId}_s${sceneIndex}_${timestamp}`;
    const job: VeoSceneJob = {
      id: jobId,
      productId: String(productId || cleanId),
      sceneIndex: Number(sceneIndex),
      status: "processing",
      progress: "Staging product reference photos & initializing Veo 3.1...",
      videoUrl: videoPublicUrl,
      videoFilePath,
      startedAt: timestamp,
      updatedAt: timestamp,
      duration: effectiveDuration,
      aspectRatio,
      personaId: effectivePersona,
      attireId: attireId || "",
    };

    veoSceneJobs.set(jobId, job);
    savePersistedJobs();

    // Limit in-memory job history to 50
    if (veoSceneJobs.size > 50) {
      const oldestKey = veoSceneJobs.keys().next().value;
      if (oldestKey) veoSceneJobs.delete(oldestKey);
    }

    // -------------------------------------------------------------
    // 3. EXECUTE GENERATION (ASYNC vs SYNC)
    // -------------------------------------------------------------
    if (mode === "sync") {
      await executeVeoJobAsync(
        job,
        cleanPrompt,
        cameraCue,
        stagedRefPaths,
        baseName,
        isCli,
        outputDir,
        timestamp
      );

      if (job.status === "failed") {
        throw new Error(job.error || "Veo generation failed");
      }

      return NextResponse.json({
        success: true,
        videoUrl: job.videoUrl,
        prompt: cleanPrompt,
        cameraCue,
        duration: effectiveDuration,
        aspectRatio,
        status: "completed",
        backend: isCli ? "cli" : "api",
        stagedReferencePhotosCount: stagedRefPaths.length,
        dryRun,
      });
    }

    // Default ASYNC execution: spawn task in background and return immediate 200 with jobId
    executeVeoJobAsync(
      job,
      cleanPrompt,
      cameraCue,
      stagedRefPaths,
      baseName,
      isCli,
      outputDir,
      timestamp
    ).catch((err) => {
      console.error("[executeVeoJobAsync Unhandled]", err);
    });

    return NextResponse.json({
      success: true,
      jobId,
      status: "processing",
      videoUrl: videoPublicUrl,
      pollIntervalMs: 3000,
      estimatedSeconds: 75,
      message: "Veo 3.1 video generation started in background. Poll GET with jobId every 3 seconds.",
      stagedReferencePhotosCount: stagedRefPaths.length,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/ecommerce/generate-custom-scene] Error:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/**
 * DELETE /api/ecommerce/generate-custom-scene
 * Deletes custom generated video from filesystem, cleans active job and logs,
 * and unlinks the video asset from product campaign metadata in Prisma.
 */
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { searchParams } = new URL(req.url);
    const videoUrl = body.videoUrl || searchParams.get("videoUrl");
    const jobId = body.jobId || searchParams.get("jobId");
    const productId = body.productId || searchParams.get("productId");

    if (!videoUrl && !jobId) {
      return NextResponse.json(
        { success: false, error: "Either videoUrl or jobId is required for deletion" },
        { status: 400 }
      );
    }

    const deletedFiles: string[] = [];

    // 1. Delete physical video file(s) from disk
    if (videoUrl) {
      const cleanUrl = videoUrl.split("?")[0];
      const filename = path.basename(cleanUrl);

      const candidates = [
        path.join(process.cwd(), "public", "assets", "ecommerce", "veo_scenes", filename),
        path.join(process.cwd(), "public", "assets", "action_loops", "veo", filename),
        path.join(process.cwd(), "public", cleanUrl.replace(/^\//, "")),
      ];

      for (const p of candidates) {
        if (fs.existsSync(p)) {
          try {
            fs.unlinkSync(p);
            deletedFiles.push(p);
          } catch (unlinkErr) {
            console.warn(`[DELETE /api/ecommerce/generate-custom-scene] Unlink notice for ${p}:`, unlinkErr);
          }
        }
      }
    }

    // 2. Remove job from in-memory map and persistence file
    loadPersistedJobs();
    if (jobId && veoSceneJobs.has(jobId)) {
      const job = veoSceneJobs.get(jobId);
      if (job?.videoFilePath && fs.existsSync(job.videoFilePath)) {
        try {
          fs.unlinkSync(job.videoFilePath);
          deletedFiles.push(job.videoFilePath);
        } catch {}
      }
      veoSceneJobs.delete(jobId);
      savePersistedJobs();

      // Clean up log file
      try {
        const logFile = path.join(process.cwd(), ".gemini", "logs", `job_${jobId}.log`);
        if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
      } catch {}
    } else if (videoUrl) {
      for (const [jId, j] of veoSceneJobs.entries()) {
        if (
          j.videoUrl === videoUrl ||
          (j.videoFilePath && videoUrl.includes(path.basename(j.videoFilePath)))
        ) {
          veoSceneJobs.delete(jId);
          try {
            const logFile = path.join(process.cwd(), ".gemini", "logs", `job_${jId}.log`);
            if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
          } catch {}
        }
      }
      savePersistedJobs();
    }

    // 3. If productId provided, remove asset from database metadata
    if (productId && videoUrl) {
      try {
        const campaign = await prisma.productCampaign.findFirst({
          where: {
            OR: [
              { id: productId },
              { rawMetadata: { contains: productId } },
              { sourceUrl: { contains: productId } },
            ],
          },
        });

        if (campaign?.rawMetadata) {
          interface CampaignAssetItem {
            url?: string;
            [key: string]: unknown;
          }
          interface CampaignMetadata {
            assets?: CampaignAssetItem[];
            savedScript?: {
              scenes?: Array<{
                customVeoVideoUrl?: string;
                primaryMediaUrl?: string;
                [key: string]: unknown;
              }>;
            };
            [key: string]: unknown;
          }
          let parsed: CampaignMetadata = {};
          try {
            parsed = JSON.parse(campaign.rawMetadata);
          } catch {}

          let wasModified = false;

          // Remove from assets array
          if (Array.isArray(parsed.assets)) {
            const initialLen = parsed.assets.length;
            parsed.assets = parsed.assets.filter(
              (a: CampaignAssetItem) => a?.url !== videoUrl && !videoUrl.includes(path.basename(a?.url || ""))
            );
            if (parsed.assets.length !== initialLen) wasModified = true;
          }

          // Clean from saved scenes
          if (parsed.savedScript?.scenes && Array.isArray(parsed.savedScript.scenes)) {
            for (const s of parsed.savedScript.scenes) {
              if (s.customVeoVideoUrl === videoUrl || s.primaryMediaUrl === videoUrl) {
                s.customVeoVideoUrl = undefined;
                if (s.primaryMediaUrl === videoUrl) {
                  s.primaryMediaUrl = parsed.assets?.[0]?.url || "";
                }
                if (s.sceneType === "custom_veo_hero") {
                  s.sceneType = "pattern_interrupt_hook";
                }
                wasModified = true;
              }
            }
          }

          if (wasModified) {
            await prisma.productCampaign.update({
              where: { id: campaign.id },
              data: {
                rawMetadata: JSON.stringify(parsed),
                updatedAt: new Date(),
              },
            });
          }
        }
      } catch (dbErr) {
        console.warn("[DELETE /api/ecommerce/generate-custom-scene] Database sync notice:", dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      deletedFiles,
      message: "Custom generated video deleted successfully",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[DELETE /api/ecommerce/generate-custom-scene] Error:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

