/**
 * src/app/api/ecommerce/generate-product-photo/route.ts
 *
 * Autonomous E-Commerce Custom Product Photo Generation API.
 * Synthesizes hyper-photorealistic product photography staged in rooms,
 * architectural sets, or luxury pedestals using Google Imagen 3 / Gemini.
 *
 * Supports switching backends via IMAGE_GEN_BACKEND ("cli" | "api"):
 * - "cli" (Default): Antigravity agy CLI via scripts/gemini-image-cli.ts / agyRunner
 * - "api": Direct Google GenAI Imagen 3 API (@google/genai)
 *
 * Provides status polling via GET and asynchronous background job execution via POST.
 */

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { findAndSyncArtifact } from "../../../../../scripts/gemini-cli/artifactManager";
import { sanitizeDiffusionPrompt } from "@/lib/ecommerce/promptSafetyFilter";
import {
  resolvePersonaAttireImageUrl,
  buildConditionedReferenceUrls,
} from "@/lib/ecommerce/personaPromptHelper";
import { initJobLogging, cliLogger } from "../../../../../scripts/common/cliTelemetry";
import { requireTenant } from "@/lib/tenant";
import { checkRateLimit, rateLimitResponse, RateLimitTiers } from "@/lib/security/rateLimit";
import { createLogger } from "@/lib/logger";

const log = createLogger("api:ecommerce:generate-product-photo");

export interface PhotoSceneJob {
  id: string;
  productId: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: string;
  imageUrl?: string;
  imageFilePath?: string;
  error?: string;
  startedAt: number;
  updatedAt: number;
  completedAt?: number;
  aspectRatio: string;
  prompt: string;
  stdoutSnippet?: string;
}

declare global {
  var __photoSceneJobs: Map<string, PhotoSceneJob> | undefined;
}

// Global in-memory job map, persisting across Next.js HMR reloads
const photoSceneJobs: Map<string, PhotoSceneJob> =
  globalThis.__photoSceneJobs || (globalThis.__photoSceneJobs = new Map<string, PhotoSceneJob>());

function getJobLogsSnippet(jobId: string, maxLines = 40): string[] {
  try {
    const logsDir = path.join(process.cwd(), ".gemini", "logs");
    const file = path.join(logsDir, `job_${jobId}.log`);
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, "utf8");
      return raw.split(/\r?\n/).filter((l) => l.trim().length > 0).slice(-maxLines);
    }
    const altFile = path.join(logsDir, "gemini_cli.log");
    if (fs.existsSync(altFile)) {
      const raw = fs.readFileSync(altFile, "utf8");
      return raw.split(/\r?\n/).filter((l) => l.trim().length > 0).slice(-maxLines);
    }
  } catch {}
  return [];
}

/**
 * GET /api/ecommerce/generate-product-photo
 * Status polling endpoint: checks active in-memory jobs and disk artifacts.
 */
export async function GET(req: NextRequest) {
  const t = await requireTenant();
  if (!t.ok) return t.response;

  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");
    const productId = searchParams.get("productId");

    // 1. Direct jobId match
    if (jobId && photoSceneJobs.has(jobId)) {
      const job = photoSceneJobs.get(jobId)!;

      // Resilient check: If file is already on disk and complete
      if (job.imageFilePath && fs.existsSync(job.imageFilePath)) {
        try {
          const stat = fs.statSync(job.imageFilePath);
          if (stat.size > 5000) {
            job.status = "completed";
            job.progress = "Product photo generated and ready";
            job.completedAt = Date.now();
            delete job.error;
          }
        } catch {}
      }

      const elapsedSeconds = Math.floor((Date.now() - job.startedAt) / 1000);
      const logs = getJobLogsSnippet(job.id, 40);
      return NextResponse.json({
        success: true,
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        imageUrl: job.imageUrl,
        elapsedSeconds,
        error: job.status === "completed" ? undefined : job.error,
        stdoutSnippet: job.stdoutSnippet,
        logs,
      });
    }

    // 2. Query by productId
    if (productId) {
      const cleanId = String(productId).replace(/[^a-z0-9_-]/gi, "_");
      const outputDir = path.resolve(process.cwd(), "public/assets/ecommerce/product_photos");

      // Check in-memory jobs first if one is actively processing
      const activeJob = Array.from(photoSceneJobs.values())
        .filter((j) => j.productId === productId && j.status === "processing")
        .sort((a, b) => b.startedAt - a.startedAt)[0];

      if (activeJob) {
        if (activeJob.imageFilePath && fs.existsSync(activeJob.imageFilePath)) {
          try {
            if (fs.statSync(activeJob.imageFilePath).size > 5000) {
              activeJob.status = "completed";
              activeJob.progress = "Product photo generated and ready";
              activeJob.completedAt = Date.now();
              delete activeJob.error;
            }
          } catch {}
        }
        const elapsedSeconds = Math.floor((Date.now() - activeJob.startedAt) / 1000);
        const logs = getJobLogsSnippet(activeJob.id, 40);
        return NextResponse.json({
          success: true,
          jobId: activeJob.id,
          status: activeJob.status,
          progress: activeJob.progress,
          imageUrl: activeJob.imageUrl,
          elapsedSeconds,
          error: activeJob.status === "completed" ? undefined : activeJob.error,
          stdoutSnippet: activeJob.stdoutSnippet,
          logs,
        });
      }

      // Check on disk for completed photo
      if (fs.existsSync(outputDir)) {
        const files = fs.readdirSync(outputDir);
        const prefix = `photo_${cleanId}_`;
        const matches = files
          .filter((f) => (f.startsWith(prefix) || f.includes(cleanId)) && (f.endsWith(".png") || f.endsWith(".jpg")))
          .map((f) => {
            const full = path.join(outputDir, f);
            const stat = fs.statSync(full);
            return { file: f, mtime: stat.mtimeMs, size: stat.size };
          })
          .filter((f) => f.size > 5000)
          .sort((a, b) => b.mtime - a.mtime);

        if (matches.length > 0) {
          const latest = matches[0];
          const latestUrl = `/assets/ecommerce/product_photos/${latest.file}`;

          if (cleanId && cleanId !== "prod") {
            try {
              const existing = await prisma.productAsset.findFirst({
                where: { campaignId: cleanId, rawUrl: latestUrl },
              });
              if (!existing) {
                await prisma.productAsset.create({
                  data: {
                    campaignId: cleanId,
                    rawUrl: latestUrl,
                    assetType: "lifestyle_context",
                    isPrimary: false,
                  },
                });
              }
            } catch {}
          }

          const latestJob = Array.from(photoSceneJobs.values())
            .filter((j) => j.productId === productId)
            .sort((a, b) => b.startedAt - a.startedAt)[0];
          const logs = latestJob ? getJobLogsSnippet(latestJob.id, 40) : [];

          return NextResponse.json({
            success: true,
            jobId: latestJob?.id || `disk_${cleanId}`,
            status: "completed",
            imageUrl: latestUrl,
            progress: "Product photo ready on disk",
            fileSize: latest.size,
            lastModified: latest.mtime,
            logs,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      status: "idle",
      message: "No active photo generation job found",
      logs: [],
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/**
 * Background worker task to execute product photo generation and update job state
 */
async function executePhotoJobAsync(
  job: PhotoSceneJob,
  prompt: string,
  stagedRefPaths: string[],
  baseName: string,
  isCli: boolean,
  outputDir: string,
  timestamp: number
) {
  let stdout = "";
  let stderr = "";

  try {
    initJobLogging(job.id, "gemini");
    cliLogger.stage(
      "INITIALIZING",
      `Launching custom product photo studio for ${job.productId}...`,
      { jobId: job.id, aspectRatio: job.aspectRatio },
      "gemini"
    );

    cliLogger.stage(
      "STAGING_REFERENCES",
      `Loaded ${stagedRefPaths.length} multi-image conditioning references (presenter attire & product packshots)`,
      { references: stagedRefPaths.map((p) => path.basename(p)) },
      "gemini"
    );

    cliLogger.stage(
      "SUBMITTING_PROMPT",
      `Formulated lifestyle staging prompt: "${prompt.slice(0, 100)}..."`,
      { aspectRatio: job.aspectRatio },
      "gemini"
    );

    // Fast check: If matching photo already generated on disk
    if (job.imageFilePath && fs.existsSync(job.imageFilePath) && fs.statSync(job.imageFilePath).size > 5000) {
      cliLogger.success(`Found pre-existing generated photo on disk: ${job.imageFilePath}`, {}, "gemini");
      job.status = "completed";
      job.progress = "Product photo generated successfully!";
      job.completedAt = Date.now();
      job.updatedAt = Date.now();
      return;
    }

    if (isCli) {
      job.progress = "Staging prompt & launching Gemini / Imagen 3 CLI...";
      job.updatedAt = Date.now();

      const geminiDir = path.join(process.cwd(), ".gemini");
      if (!fs.existsSync(geminiDir)) {
        fs.mkdirSync(geminiDir, { recursive: true });
      }

      const promptFile = path.join(geminiDir, `temp_photo_prompt_${timestamp}.txt`);
      fs.writeFileSync(promptFile, prompt.trim(), "utf8");

      const isWin = process.platform === "win32";

      cliLogger.stage(
        "RENDERING_DIFFUSION",
        "Synthesizing high-fidelity scene texture, architectural lighting & character likeness with Imagen 3 / Gemini...",
        {},
        "gemini"
      );

      // 🛡️ Sentinel: Fixed Command Injection Risk (SEC-01 & SEC-02)
      // Pass arguments securely as an array to `spawn` with `shell: false`
      const spawnArgs: string[] = [
        path.join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs"),
        "scripts/gemini-image-cli.ts",
        "--mode=product_photo",
        `--prompt=${prompt.trim()}`,
        `--aspect=${job.aspectRatio}`,
        "--output-dir=public/assets/ecommerce/product_photos",
        `--name=${baseName}`,
        "--engine=agy",
      ];

      if (stagedRefPaths.length > 0) {
        spawnArgs.push(`--ref-images=${stagedRefPaths.join(",")}`);
        spawnArgs.push(`--image=${stagedRefPaths[0]}`);
      }

      const executable = process.execPath;

      const child = spawn(
        executable,
        spawnArgs,
        { cwd: process.cwd(), windowsHide: true, shell: false }
      );

      child.stdout?.on("data", (data) => {
        const str = data.toString();
        stdout += str;
        job.stdoutSnippet = stdout.slice(-600);

        str.split(/\r?\n/).forEach((line: string) => {
          const trimmed = line.trim();
          if (trimmed) cliLogger.info(trimmed, {}, "gemini");
        });

        if (str.includes("Spawning Antigravity CLI") || str.includes("CUSTOM PRODUCT PHOTO STUDIO")) {
          job.progress = "Synthesizing photorealistic staging with Gemini / Imagen 3 CLI...";
        } else if (str.includes("Calling generate_image") || str.includes("Executing agy")) {
          job.progress = "Rendering high-fidelity product texture & lighting...";
        } else if (str.includes("Generated & Saved") || str.includes("Multi-Reference Scene Composited")) {
          job.progress = "Finalizing photo artifact in workspace...";
        }
        job.updatedAt = Date.now();
      });

      child.stderr?.on("data", (data) => {
        const str = data.toString();
        stderr += str;
        job.stdoutSnippet = stderr.slice(-600);
        str.split(/\r?\n/).forEach((line: string) => {
          const trimmed = line.trim();
          if (trimmed) cliLogger.warn(trimmed, {}, "gemini");
        });
      });

      const execTimeout = new Promise<void>((_, reject) =>
        setTimeout(() => {
          try { child.kill(); } catch {}
          reject(new Error("Photo generation timed out after 180 seconds"));
        }, 180000)
      );

      const execProcess = new Promise<void>((resolve, reject) => {
        child.on("close", (code) => {
          if (code === 0) resolve();
          else reject(new Error(`Gemini CLI exited with code ${code}: ${stderr.slice(-400)}`));
        });
        child.on("error", (err) => reject(err));
      });

      await Promise.race([execProcess, execTimeout]);
    } else {
      job.progress = "Generating product photo via Google GenAI API...";
      job.updatedAt = Date.now();

      const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured in .env for API generation mode");
      }

      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });

      const validRatio = ["1:1", "9:16", "16:9", "4:3", "3:4"].includes(job.aspectRatio)
        ? job.aspectRatio
        : "1:1";

      cliLogger.stage("RENDERING_DIFFUSION", "Submitting prompt to Google GenAI API...", {}, "gemini");

      const response = await ai.models.generateImages({
        model: "imagen-3.0-generate-002",
        prompt: prompt.trim(),
        config: {
          numberOfImages: 1,
          aspectRatio: validRatio as "1:1" | "3:4" | "4:3" | "9:16" | "16:9",
          outputMimeType: "image/png",
        },
      });

      const generated = response.generatedImages?.[0];
      if (generated?.image?.imageBytes && job.imageFilePath) {
        const buffer = Buffer.from(generated.image.imageBytes, "base64");
        fs.writeFileSync(job.imageFilePath, buffer);
      } else {
        throw new Error("Google GenAI API returned no image bytes");
      }
    }

    // Verify output artifact exists
    let resolvedImageUrl: string | null = null;
    if (job.imageFilePath && fs.existsSync(job.imageFilePath) && fs.statSync(job.imageFilePath).size > 5000) {
      resolvedImageUrl = job.imageUrl || null;
    } else {
      const syncedPath = findAndSyncArtifact(baseName, timestamp - 10000, job.imageFilePath);
      if (syncedPath && fs.existsSync(syncedPath) && fs.statSync(syncedPath).size > 5000) {
        resolvedImageUrl = job.imageUrl || null;
      }
    }

    if (!resolvedImageUrl) {
      throw new Error(
        `Product photo generation finished but image was not found at ${job.imageFilePath}.\nCLI Output:\n${stdout.slice(-500)}\n${stderr.slice(-500)}`
      );
    }

    cliLogger.success(`Product photo generated and ready: ${resolvedImageUrl}`, { imageUrl: resolvedImageUrl }, "gemini");

    // Automatically persist to Prisma ProductAsset and campaign rawMetadata.assets so it appears in catalog immediately
    if (job.productId && job.productId !== "prod" && resolvedImageUrl) {
      try {
        const existing = await prisma.productAsset.findFirst({
          where: { campaignId: job.productId, rawUrl: resolvedImageUrl },
        });
        if (!existing) {
          await prisma.productAsset.create({
            data: {
              campaignId: job.productId,
              rawUrl: resolvedImageUrl,
              assetType: "lifestyle_context",
              isPrimary: false,
            },
          });
        }

        // Also update ProductCampaign rawMetadata.assets
        const camp = await prisma.productCampaign.findUnique({
          where: { id: job.productId },
        });
        if (camp && camp.rawMetadata) {
          const meta = JSON.parse(camp.rawMetadata);
          const assets = meta.assets || meta.spec?.assets || [];
          if (!assets.some((a: { url?: string }) => a.url === resolvedImageUrl)) {
            assets.push({
              id: `photo_gen_${Date.now()}`,
              url: resolvedImageUrl,
              type: "lifestyle_context",
              altText: `Custom AI Staged Photo: ${job.prompt.slice(0, 50)}`,
            });
            meta.assets = assets;
            if (meta.spec) meta.spec.assets = assets;
            await prisma.productCampaign.update({
              where: { id: job.productId },
              data: { rawMetadata: JSON.stringify(meta), updatedAt: new Date() },
            });
          }
        }
      } catch (assetErr) {
        console.warn("[executePhotoJobAsync] Failed to auto-persist to ProductAsset:", assetErr);
      }
    }

    job.status = "completed";
    job.progress = "Product photo generated successfully!";
    job.completedAt = Date.now();
    job.updatedAt = Date.now();
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[executePhotoJobAsync] Job ${job.id} failed:`, errorMsg);
    cliLogger.error(`Photo generation failed: ${errorMsg}`, err, "gemini");
    job.status = "failed";
    job.error = errorMsg;
    job.progress = `Failed: ${errorMsg}`;
    job.updatedAt = Date.now();
  }
}

/**
 * POST /api/ecommerce/generate-product-photo
 * Submits custom product photo generation job
 */
export async function POST(req: NextRequest) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  const rl = checkRateLimit(orgId, RateLimitTiers.AI_EXPENSIVE);
  if (!rl.allowed) return rateLimitResponse(rl);

  try {
    const body = await req.json();
    const {
      productId = "prod",
      productName: _productName,
      prompt,
      aspectRatio = "1:1",
      category = "surface_material",
      referenceImageUrl,
      referenceImageUrls = [],
      mode = "async",
      dryRun = false,
      personaId,
      attireId,
      avatarSrc,
      actionLoopId,
      videoUrl,
    } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "A descriptive prompt is required to generate a product photo." },
        { status: 400 }
      );
    }

    // Proactively filter prompt to eliminate prominent people names (e.g. Ruby Vance)
    // and sensitive terms to prevent Google Imagen 3 / Gemini policy blocks
    const { sanitizedPrompt: cleanPrompt, wasModified, neutralizedTerms } = sanitizeDiffusionPrompt(prompt);
    if (wasModified) {
      log.info(`[generate-product-photo] Neutralized prompt terms for policy safety: [${neutralizedTerms.join(", ")}]`);
      log.info(`[generate-product-photo] Sanitized prompt: "${cleanPrompt}"`);
    }

    // Determine generation backend from environment (default to "cli")
    const configuredBackend = (
      process.env.IMAGE_GEN_BACKEND ||
      process.env.GEMINI_IMAGE_PROVIDER ||
      "cli"
    ).toLowerCase();

    const isCli = configuredBackend === "cli" || configuredBackend === "agy";

    // Ensure output directory exists
    const outputDir = path.resolve(process.cwd(), "public/assets/ecommerce/product_photos");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = Date.now();
    const cleanId = String(productId).replace(/[^a-z0-9_-]/gi, "_");
    const baseName = `photo_${cleanId}_${timestamp}`;
    const fileName = `${baseName}.png`;
    const filePath = path.join(outputDir, fileName);
    const publicUrl = `/assets/ecommerce/product_photos/${fileName}`;

    // -------------------------------------------------------------
    // GATHER & CONDITION PERSONA ATTIRE (Index 0) + PRODUCT REFERENCES (Indices 1 & 2)
    // -------------------------------------------------------------
    const incomingUrls: string[] = [];
    if (Array.isArray(referenceImageUrls)) {
      incomingUrls.push(...referenceImageUrls.filter((u: unknown) => typeof u === "string" && (u as string).trim()));
    }
    if (referenceImageUrl && typeof referenceImageUrl === "string" && referenceImageUrl.trim() && !incomingUrls.includes(referenceImageUrl.trim())) {
      incomingUrls.unshift(referenceImageUrl.trim());
    }

    // If no references passed, attempt to query Prisma ProductAsset
    if (incomingUrls.length === 0 && productId && productId !== "prod") {
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
        console.warn("[generate-product-photo] DB asset query notice:", dbErr);
      }
    }

    // Resolve active persona attire image URL
    const effectivePersona = personaId || "ruby";
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
        maxImages: 3,
      });
    } else {
      candidateUrls = buildConditionedReferenceUrls({
        personaImageUrl: resolvedPersonaImageUrl,
        productMediaUrls: incomingUrls,
        maxImages: 3,
      });
    }

    const stagedRefPaths: string[] = [];
    const stagingDir = path.resolve(process.cwd(), "public/assets/ecommerce/product_photos/staged_refs");
    if (!fs.existsSync(stagingDir)) {
      fs.mkdirSync(stagingDir, { recursive: true });
    }

    // Download/copy and convert to local clean PNG files
    for (let i = 0; i < Math.min(candidateUrls.length, 3); i++) {
      const url = candidateUrls[i];
      try {
        const destPath = path.join(stagingDir, `photo_ref_${cleanId}_${i}_${timestamp}.png`);
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
        console.warn(`[generate-product-photo] Could not stage reference image ${url}:`, imgErr);
      }
    }

    if (dryRun) {
      return NextResponse.json({
        success: true,
        imageUrl: publicUrl,
        prompt: cleanPrompt,
        aspectRatio,
        backend: isCli ? "cli" : "api",
        referenceImageUrls: candidateUrls,
        stagedRefPaths,
        dryRun: true,
      });
    }

    // Initialize Job in Map
    const jobId = `photo_job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newJob: PhotoSceneJob = {
      id: jobId,
      productId: String(productId),
      status: "processing",
      progress: "Staging reference photos & initializing Gemini / Imagen 3 CLI...",
      imageUrl: publicUrl,
      imageFilePath: filePath,
      startedAt: Date.now(),
      updatedAt: Date.now(),
      aspectRatio,
      prompt: cleanPrompt,
    };
    photoSceneJobs.set(jobId, newJob);

    if (mode === "async") {
      // Execute asynchronously in background without blocking HTTP response
      executePhotoJobAsync(newJob, cleanPrompt, stagedRefPaths, baseName, isCli, outputDir, timestamp).catch(
        (err) => {
          console.error("[generate-product-photo] Unhandled worker failure:", err);
        }
      );

      return NextResponse.json({
        success: true,
        jobId,
        status: "processing",
        message: "Staging reference photos & launching Gemini / Imagen 3 CLI...",
        imageUrl: publicUrl,
        backend: isCli ? "cli" : "api",
        referenceCount: stagedRefPaths.length,
      });
    }

    // Synchronous execution mode
    await executePhotoJobAsync(newJob, cleanPrompt, stagedRefPaths, baseName, isCli, outputDir, timestamp);

    if (newJob.status === "failed") {
      return NextResponse.json(
        { success: false, error: newJob.error || "Failed to generate product photo" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      imageUrl: publicUrl,
      prompt: cleanPrompt,
      aspectRatio,
      category,
      backend: isCli ? "cli" : "api",
      fileName,
      referenceImageUrls: candidateUrls,
      stagedRefPaths,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[generate-product-photo] Error:", errorMsg);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
