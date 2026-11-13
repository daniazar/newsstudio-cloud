/**
 * workers/pipeline-worker/tasks/ecommerceMediaTask.ts
 *
 * Standalone local PC worker task handler for all offloaded E-Commerce and
 * Persona studio media generation jobs:
 * - ecommerce_photo: Custom product photo staging via Gemini CLI / Google GenAI
 * - ecommerce_scene: Turntable & custom hero video scenes (ComfyUI MiniMax H3 / Google Veo 3.1)
 * - ecommerce_veo: Product showcase Veo CLI / manifest generation
 * - ecommerce_lipsync: MuseTalk / Ditto real-time lip-sync + multi-slice concatenation + WebM alpha
 * - ecommerce_render: Headless Remotion ProductAdComposition (single or omnichannel batch)
 * - persona_studio_image: ComfyUI FLUX.2 + PuLID studio attire image generation
 *
 * Resolves local avatars/references from ./public/avatars, ../newsStudio/public/avatars,
 * or R2 storage URLs, uploads generated outputs directly to R2 via `storage.upload`,
 * updates Prisma records, and reports progress/results via `reportProgress`.
 */

import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import sharp from "sharp";
import { promisify } from "util";
import { execFile } from "child_process";
import { prisma } from "@/lib/prisma";
import { storage, withTenant } from "@/lib/storage";
import { createLogger } from "@/lib/logger";
import {
  checkComfyUIHealth,
  generatePresenterImage,
  getComfyUIUrl,
  getFFmpegPath,
  submitPrompt,
  uploadFileToComfyUI,
} from "@/lib/ai/comfyClient";
import { resolvePresenterDriver } from "@/lib/ecommerce/avatarResolver";
import { SceneClipSlice } from "@/lib/ecommerce/actionLoopFsmEngine";
import { renderOmnichannelBatch, type OmnichannelFormatKey } from "@/lib/ecommerce/omnichannelExporter";
import {
  checkMuseTalkHealth,
  ensureAvatarPreprocessed,
  generateMuseTalkLipSync,
} from "@/lib/ai/musetalkClient";
import {
  checkModelEngineStatus,
  generateTalkingHeadInference,
} from "@/lib/ai/talkingHeadsClient";
import {
  ensureTransparentWebmCompanion,
  sanitizePresenterVideo,
} from "@/lib/video/presenterSanitizer";
import {
  getOptimalRemotionConcurrency,
  getRemotionBinPath,
  getRemotionEntryPoint,
} from "@/lib/video/remotionUtils";
import { reportProgress } from "../api";
import { config as workerConfig, resolveLocalAvatarFile } from "../config";
import { JobCancelledError } from "./audioTask";
import { findAndSyncArtifact } from "../../../scripts/gemini-cli/artifactManager";
import { findAndSyncVideoArtifact } from "../../../scripts/veo-cli/artifactManager";
import { runVeoWithApi } from "../../../scripts/veo-cli/engines/apiRunner";

const log = createLogger("worker:tasks:ecommerceMediaTask");
const execFileAsync = promisify(execFile);

export const ECOMMERCE_MEDIA_JOB_TYPES = [
  "ecommerce_photo",
  "ecommerce_scene",
  "ecommerce_veo",
  "ecommerce_lipsync",
  "ecommerce_render",
  "persona_studio_image",
] as const;

export type EcommerceMediaJobType = (typeof ECOMMERCE_MEDIA_JOB_TYPES)[number];

function parseConfig(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof raw === "object") {
    return raw as Record<string, unknown>;
  }
  return {};
}

async function emitProgress(
  jobId: string,
  step: string,
  doneSteps: number,
  status = "IN_PROGRESS"
): Promise<void> {
  const ok = await reportProgress(jobId, { step, status, doneSteps });
  if (!ok) {
    throw new JobCancelledError(`Job ${jobId} cancelled during ${step}`);
  }
}

function resolveLocalPublicCandidate(relOrUrl: string): string | null {
  const cleanRel = relOrUrl.split("?")[0].replace(/^[/\\]+/, "");
  if (cleanRel.startsWith("avatars/") || !cleanRel.includes("/")) {
    const avatarMatch = resolveLocalAvatarFile(cleanRel.replace(/^avatars\//, ""));
    if (avatarMatch) return avatarMatch;
  }

  const candidates = [
    path.resolve(process.cwd(), "public", cleanRel),
    path.resolve(process.cwd(), "..", "newsStudio", "public", cleanRel),
    path.resolve(process.cwd(), cleanRel),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) {
      return c;
    }
  }
  return null;
}

async function fetchBufferFromAnySource(urlOrKey: string): Promise<Buffer | null> {
  if (!urlOrKey || typeof urlOrKey !== "string") return null;

  if (urlOrKey.startsWith("data:")) {
    const commaIdx = urlOrKey.indexOf(",");
    if (commaIdx !== -1) {
      return Buffer.from(urlOrKey.slice(commaIdx + 1), "base64");
    }
    return null;
  }

  if (urlOrKey.startsWith("http://") || urlOrKey.startsWith("https://")) {
    const res = await fetch(urlOrKey, { signal: AbortSignal.timeout(60_000) });
    if (res.ok) {
      return Buffer.from(await res.arrayBuffer());
    }
    return null;
  }

  if (path.isAbsolute(urlOrKey) && fs.existsSync(urlOrKey)) {
    return fs.readFileSync(urlOrKey);
  }

  const localCandidate = resolveLocalPublicCandidate(urlOrKey);
  if (localCandidate) {
    return fs.readFileSync(localCandidate);
  }

  // Fallback: attempt R2 / storage key download or mainAppUrl fetch
  try {
    const key = urlOrKey.replace(/^news-studio\//, "").replace(/^\/+/, "");
    const buf = await storage.download(key);
    if (buf && buf.length > 0) return buf;
  } catch {
    // Try mainAppUrl when relative path is hosted remotely
    if (urlOrKey.startsWith("/") && workerConfig.mainAppUrl) {
      try {
        const res = await fetch(`${workerConfig.mainAppUrl}${urlOrKey}`, {
          signal: AbortSignal.timeout(30_000),
        });
        if (res.ok) return Buffer.from(await res.arrayBuffer());
      } catch {}
    }
  }

  return null;
}

async function stageReferenceImages(
  urls: string[],
  tempDir: string,
  prefix: string
): Promise<string[]> {
  const staged: string[] = [];
  for (let i = 0; i < Math.min(urls.length, 3); i++) {
    const url = urls[i];
    try {
      const buf = await fetchBufferFromAnySource(url);
      if (buf && buf.length > 0) {
        const dest = path.join(tempDir, `${prefix}_ref_${i}.png`);
        await sharp(buf).png().toFile(dest);
        staged.push(dest);
      }
    } catch (err) {
      log.warn({ err, url }, `[ecommerceMediaTask] Failed staging reference`);
    }
  }
  return staged;
}

function runNodeCli(args: string[], timeoutMs = 300_000): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: process.cwd(),
      windowsHide: true,
      shell: false,
    });

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      try {
        child.kill();
      } catch {}
      reject(new Error(`CLI timed out after ${Math.round(timeoutMs / 1000)}s`));
    }, timeoutMs);

    child.stdout?.on("data", (d: Buffer) => {
      stdout += d.toString();
    });
    child.stderr?.on("data", (d: Buffer) => {
      stderr += d.toString();
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`CLI exited with code ${code}: ${stderr.slice(-400) || stdout.slice(-400)}`));
    });
  });
}

async function persistProductAssetInPrisma(
  productId: string | undefined,
  url: string,
  storageKey: string,
  assetType: string
): Promise<void> {
  if (!productId || productId === "prod") return;
  try {
    const existing = await prisma.productAsset.findFirst({
      where: { campaignId: productId, rawUrl: url },
    });
    if (!existing) {
      await prisma.productAsset.create({
        data: {
          campaignId: productId,
          rawUrl: url,
          storageKey,
          assetType,
          isPrimary: false,
        },
      });
    }

    const campaign = await prisma.productCampaign.findFirst({
      where: {
        OR: [{ id: productId }, { rawMetadata: { contains: productId } }],
      },
    });
    if (campaign?.rawMetadata) {
      const parsed = JSON.parse(campaign.rawMetadata) as Record<string, unknown>;
      const assets = Array.isArray(parsed.assets)
        ? (parsed.assets as Array<Record<string, unknown>>)
        : [];
      if (!assets.some((a) => a.url === url)) {
        assets.push({
          id: `asset_${Date.now()}`,
          url,
          type: assetType,
          altText: `${assetType} generated by local worker`,
        });
        parsed.assets = assets;
        await prisma.productCampaign.update({
          where: { id: campaign.id },
          data: { rawMetadata: JSON.stringify(parsed), updatedAt: new Date() },
        });
      }
    }
  } catch (err) {
    log.warn({ err }, `[ecommerceMediaTask] Non-fatal Prisma ProductAsset sync notice`);
  }
}

async function handleEcommercePhoto(
  jobId: string,
  companyId: string,
  cfg: Record<string, unknown>,
  tmpDir: string
): Promise<Record<string, unknown>> {
  const productId = String(cfg.productId || "prod");
  const prompt = String(cfg.prompt || "");
  const aspectRatio = String(cfg.aspectRatio || "1:1");
  const backend = String(cfg.backend || "cli");
  const refUrls = Array.isArray(cfg.referenceImageUrls)
    ? cfg.referenceImageUrls.filter((u): u is string => typeof u === "string")
    : [];

  await emitProgress(jobId, "Staging product & persona references...", 1);
  const stagedRefs = await stageReferenceImages(refUrls, tmpDir, "photo");

  const cleanId = productId.replace(/[^a-z0-9_-]/gi, "_");
  const timestamp = Date.now();
  const baseName = `photo_${cleanId}_${timestamp}`;
  const outDir = path.join(tmpDir, "photos");
  fs.mkdirSync(outDir, { recursive: true });
  const targetFile = path.join(outDir, `${baseName}.png`);

  await emitProgress(jobId, "Generating custom product photo...", 1);

  if (backend === "cli") {
    const args = [
      path.join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs"),
      "scripts/gemini-image-cli.ts",
      "--mode=product_photo",
      `--prompt=${prompt.trim()}`,
      `--aspect=${aspectRatio}`,
      `--output-dir=${outDir}`,
      `--name=${baseName}`,
      "--engine=agy",
    ];
    if (stagedRefs.length > 0) {
      args.push(`--ref-images=${stagedRefs.join(",")}`);
      args.push(`--image=${stagedRefs[0]}`);
    }
    await runNodeCli(args, 210_000);
  } else {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is missing for API product photo generation");
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });
    const validRatio = ["1:1", "9:16", "16:9", "4:3", "3:4"].includes(aspectRatio)
      ? aspectRatio
      : "1:1";
    const response = await ai.models.generateImages({
      model: "imagen-3.0-generate-002",
      prompt: prompt.trim(),
      config: {
        numberOfImages: 1,
        aspectRatio: validRatio as "1:1" | "3:4" | "4:3" | "9:16" | "16:9",
        outputMimeType: "image/png",
      },
    });
    const imgBytes = response.generatedImages?.[0]?.image?.imageBytes;
    if (!imgBytes) throw new Error("Google GenAI returned no image bytes");
    fs.writeFileSync(targetFile, Buffer.from(imgBytes, "base64"));
  }

  let finalPath: string | null =
    fs.existsSync(targetFile) && fs.statSync(targetFile).size > 5000 ? targetFile : null;
  if (!finalPath) {
    const synced = findAndSyncArtifact(baseName, timestamp - 10_000, targetFile);
    if (synced && fs.existsSync(synced) && fs.statSync(synced).size > 5000) {
      finalPath = synced;
    }
  }
  if (!finalPath) {
    throw new Error(`Generated product photo artifact not found for ${baseName}`);
  }

  const buffer = fs.readFileSync(finalPath);
  const storageKey = withTenant(companyId, `ecommerce/photos/${cleanId}/${baseName}.png`);
  const imageUrl = await storage.upload(storageKey, buffer, "image/png");

  await persistProductAssetInPrisma(productId, imageUrl, storageKey, "lifestyle_context");

  return {
    imageUrl,
    storageKey,
    progress: "Product photo generated and uploaded to R2",
  };
}

function buildMiniMaxTurntableWorkflow(imageFilename: string, prompt: string, steps: number, outputPrefix: string) {
  return {
    "1": {
      class_type: "UNETLoader",
      inputs: { unet_name: "minimax_h3_ref2va_pruned_fp8_scaled.safetensors", weight_dtype: "default" },
    },
    "2": {
      class_type: "LoraLoaderModelOnly",
      inputs: { model: ["1", 0], lora_name: "taomate_h3_3step_MAXQUALITY_bf16.safetensors", strength_model: 1.0 },
    },
    "3": { class_type: "ModelAttentionBackend", inputs: { model: ["2", 0], backend: "sageattn" } },
    "4": {
      class_type: "CLIPLoader",
      inputs: { clip_name: "umt5_xxl_fp8_e4m3fn_scaled.safetensors", type: "wan", device: "default" },
    },
    "5": { class_type: "VAELoader", inputs: { vae_name: "wan_2.1_vae.safetensors" } },
    "6": { class_type: "LoadImage", inputs: { image: imageFilename } },
    "7": { class_type: "CLIPTextEncode", inputs: { text: prompt, clip: ["4", 0] } },
    "8": {
      class_type: "CLIPTextEncode",
      inputs: { text: "blurry, deformed, distorted product, extra parts, watermark, text overlay", clip: ["4", 0] },
    },
    "9": {
      class_type: "WanImageToVideo",
      inputs: {
        positive: ["7", 0],
        negative: ["8", 0],
        vae: ["5", 0],
        width: 768,
        height: 1376,
        length: 124,
        batch_size: 1,
        start_image: ["6", 0],
      },
    },
    "10": {
      class_type: "KSampler",
      inputs: {
        model: ["3", 0],
        positive: ["9", 0],
        negative: ["9", 1],
        latent_image: ["9", 2],
        seed: Math.floor(Math.random() * 100_000_000),
        steps,
        cfg: 1.0,
        sampler_name: "res_multistep",
        scheduler: "simple",
        denoise: 1.0,
      },
    },
    "11": { class_type: "VAEDecode", inputs: { samples: ["10", 0], vae: ["5", 0] } },
    "12": {
      class_type: "VHS_VideoCombine",
      inputs: {
        images: ["11", 0],
        frame_rate: 24,
        loop_count: 0,
        filename_prefix: outputPrefix,
        format: "video/h264-mp4",
        save_output: true,
      },
    },
  };
}

async function handleEcommerceScene(
  jobId: string,
  companyId: string,
  cfg: Record<string, unknown>,
  tmpDir: string
): Promise<Record<string, unknown>> {
  const kind = String(cfg.kind || "custom_scene");
  const productId = String(cfg.productId || "prod");
  const cleanId = productId.replace(/[^a-z0-9_-]/gi, "_");
  const sceneIndex = Number(cfg.sceneIndex || 0);
  const engine = String(cfg.engine || "google_veo");
  const prompt = String(cfg.prompt || "");
  const aspectRatio = String(cfg.aspectRatio || "9:16");
  const duration = Number(cfg.duration || 8);
  const personaId = String(cfg.personaId || "ruby");
  const attireId = typeof cfg.attireId === "string" ? cfg.attireId : undefined;
  const cameraCue = String(cfg.cameraCue || "ambient_orbit_3d");
  const refUrls = Array.isArray(cfg.referenceImageUrls)
    ? cfg.referenceImageUrls.filter((u): u is string => typeof u === "string")
    : [];

  await emitProgress(jobId, "Staging scene reference photos...", 1);
  const stagedRefs = await stageReferenceImages(refUrls, tmpDir, "scene");

  const outDir = path.join(tmpDir, "scenes");
  fs.mkdirSync(outDir, { recursive: true });
  const timestamp = Date.now();
  const baseName =
    kind === "turntable"
      ? `turntable_${cleanId}_s${sceneIndex}_${timestamp}`
      : `veo_custom_${cleanId}_scene${sceneIndex}_${timestamp}`;
  const targetVideoPath = path.join(outDir, `${baseName}.mp4`);

  if (kind === "turntable" && engine === "minimax_h3") {
    const comfyOk = await checkComfyUIHealth();
    if (!comfyOk) {
      throw new Error("Local ComfyUI is offline on port 8188 for MiniMax H3 turntable generation.");
    }
    const comfyUrl = getComfyUIUrl();
    const imageFilename =
      stagedRefs.length > 0
        ? await uploadFileToComfyUI(stagedRefs[0], "", `prod_${cleanId}_${timestamp}.png`)
        : "product_ref.png";
    const steps = cfg.stepMode === "tao_3step" ? 3 : 2;
    const workflow = buildMiniMaxTurntableWorkflow(
      imageFilename,
      prompt,
      steps,
      `MiniMax_H3_ProductTurntable/tt_${jobId}`
    );
    const promptId = await submitPrompt(workflow);
    await emitProgress(jobId, "Sampling MiniMax H3 turntable in ComfyUI...", 1);

    const maxWaitMs = 360_000;
    const started = Date.now();
    let downloadedVideo: Buffer | null = null;

    while (Date.now() - started < maxWaitMs) {
      await new Promise((r) => setTimeout(r, 3000));
      const res = await fetch(`${comfyUrl}/history/${promptId}`).catch(() => null);
      if (!res || !res.ok) continue;
      const hist = (await res.json()) as Record<string, { status?: { completed?: boolean; status_str?: string }; outputs?: Record<string, { gifs?: Array<{ filename: string; subfolder?: string; type?: string }> }> }>;
      const entry = hist?.[promptId];
      if (!entry) continue;
      if (entry.status?.status_str === "error") {
        throw new Error("ComfyUI returned error during MiniMax H3 sampling");
      }
      if (entry.status?.completed) {
        const outputs = entry.outputs || {};
        for (const nodeOut of Object.values(outputs)) {
          const gif = nodeOut.gifs?.[0];
          if (gif?.filename) {
            const viewRes = await fetch(
              `${comfyUrl}/view?filename=${encodeURIComponent(gif.filename)}&subfolder=${encodeURIComponent(gif.subfolder || "")}&type=${encodeURIComponent(gif.type || "output")}`
            );
            if (viewRes.ok) {
              downloadedVideo = Buffer.from(await viewRes.arrayBuffer());
              break;
            }
          }
        }
        break;
      }
    }

    if (!downloadedVideo) {
      throw new Error("ComfyUI turntable render timed out or produced no video output");
    }
    fs.writeFileSync(targetVideoPath, downloadedVideo);
  } else {
    const backend = String(cfg.backend || process.env.VEO_VIDEO_BACKEND || "cli");
    await emitProgress(jobId, "Generating Veo 3.1 video scene...", 1);

    if (backend === "cli" || backend === "agy") {
      const promptFile = path.join(tmpDir, `veo_prompt_${timestamp}.txt`);
      fs.writeFileSync(promptFile, prompt.trim(), "utf8");
      const args = [
        path.join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs"),
        "scripts/veo-cli.ts",
        "--mode=cinematic_broll",
        `--prompt-file=${promptFile}`,
        `--cam=${cameraCue}`,
        `--duration=${duration}`,
        `--ratio=${aspectRatio}`,
        "--engine=flow_web",
        "--model=veo-3.1-lite",
        `--output-dir=${outDir}`,
        `--name=${baseName}`,
        `--persona=${personaId}`,
        "--non-interactive",
      ];
      if (attireId) args.push(`--attire=${attireId}`);
      if (stagedRefs.length > 0) {
        args.push(`--ref-images=${stagedRefs.join(",")}`);
        args.push(`--image=${stagedRefs[0]}`);
      }
      await runNodeCli(args, 300_000);
    } else {
      const apiRes = await runVeoWithApi({
        prompt: prompt.trim(),
        imagePath: stagedRefs[0],
        referenceImagePaths: stagedRefs,
        aspectRatio: (aspectRatio === "16:9" ? "16:9" : "9:16"),
        durationSeconds: (duration === 4 || duration === 8 ? duration : 8),
        baseName,
        model: "veo-3.1-lite",
        outputDirectory: outDir,
      });
      if (!apiRes.success) {
        throw new Error(apiRes.error || "Veo API video generation failed");
      }
    }
  }

  let finalPath: string | null =
    fs.existsSync(targetVideoPath) && fs.statSync(targetVideoPath).size > 100_000
      ? targetVideoPath
      : null;
  if (!finalPath) {
    const synced = findAndSyncVideoArtifact(baseName, timestamp - 10_000, targetVideoPath);
    if (synced && fs.existsSync(synced) && fs.statSync(synced).size > 100_000) {
      finalPath = synced;
    }
  }
  if (!finalPath) {
    throw new Error(`Generated scene video artifact not found for ${baseName}`);
  }

  const videoBuf = fs.readFileSync(finalPath);
  const storageKey = withTenant(companyId, `ecommerce/scenes/${cleanId}/${baseName}.mp4`);
  const videoUrl = await storage.upload(storageKey, videoBuf, "video/mp4");

  await persistProductAssetInPrisma(productId, videoUrl, storageKey, "existing_video");

  return {
    videoUrl,
    storageKey,
    progress: "Scene video generated and uploaded to R2",
  };
}

async function handleEcommerceVeo(
  jobId: string,
  companyId: string,
  cfg: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const productName = String(cfg.productName || "Product");
  const args = [
    path.join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs"),
    "scripts/veo-video-cli.ts",
    "--mode=product_showcase",
    `--persona=${String(cfg.personaSlug || "ruby")}`,
    `--product-name=${productName}`,
    `--product-category=${String(cfg.productCategory || "surface_material")}`,
    `--product-action=${String(cfg.productAction || "swatch_presentation")}`,
    "--non-interactive",
  ];
  if (cfg.fuseBeats) args.push("--fuse");
  if (cfg.withAudio) args.push("--with-audio");
  if (cfg.bgmGenre) args.push(`--bgm=${String(cfg.bgmGenre)}`);
  if (cfg.sfxCue) args.push(`--sfx=${String(cfg.sfxCue)}`);
  if (cfg.productImage) args.push(`--product-image=${String(cfg.productImage)}`);

  await emitProgress(jobId, "Running Veo product showcase CLI...", 1);
  const { stdout } = await runNodeCli(args, 300_000);

  const manifestMatch = stdout.match(/(?:file:\/\/\/|\s)([^\s]+\/fused_commercial_manifest_[^\s]+\.json)/i);
  let manifest: unknown = null;
  let videoUrl: string | undefined;

  if (manifestMatch) {
    let resolvedPath = manifestMatch[1].replace(/^file:\/\/\/?/, "");
    if (process.platform === "win32" && !resolvedPath.includes(":")) {
      resolvedPath = `C:/${resolvedPath}`;
    }
    if (fs.existsSync(resolvedPath)) {
      manifest = JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
      const mObj = manifest as Record<string, unknown>;
      if (typeof mObj.outputVideoPath === "string" && fs.existsSync(mObj.outputVideoPath)) {
        const key = withTenant(companyId, `ecommerce/veo/${Date.now()}_${path.basename(mObj.outputVideoPath)}`);
        videoUrl = await storage.upload(key, fs.readFileSync(mObj.outputVideoPath), "video/mp4");
      }
    }
  }

  return { videoUrl, manifest, progress: "Veo showcase completed" };
}

async function handleEcommerceLipsync(
  jobId: string,
  companyId: string,
  cfg: Record<string, unknown>,
  tmpDir: string
): Promise<Record<string, unknown>> {
  const personaId = String(cfg.personaId || "sofia");
  const engine = String(cfg.engine || "musetalk");
  const audioUrl = String(cfg.audioUrl || "");
  const fps = Number(cfg.fps || 30);
  const startFrameOffset = Number(cfg.startFrameOffset || 0);
  const asyncWebm = cfg.asyncWebm !== false;
  const slices = Array.isArray(cfg.slices) ? (cfg.slices as SceneClipSlice[]) : null;

  await emitProgress(jobId, `Connecting to ${engine} talking-head server...`, 1);
  if (engine === "ditto") {
    const status = await checkModelEngineStatus("ditto");
    if (!status.online) throw new Error("Ditto server is offline on local worker (port 8010)");
  } else {
    const online = await checkMuseTalkHealth();
    if (!online) throw new Error("MuseTalk server is offline on local worker (port 8010/8007)");
  }

  const audioBuf = await fetchBufferFromAnySource(audioUrl);
  if (!audioBuf) throw new Error(`Failed to fetch lip-sync audio source: ${audioUrl}`);

  const timestamp = Date.now();
  const audioPath = path.join(tmpDir, `lipsync_audio_${timestamp}.wav`);
  const outputPath = path.join(tmpDir, `lipsync_out_${timestamp}.mp4`);
  fs.writeFileSync(audioPath, audioBuf);

  let finalAvatarId = personaId;

  const resolveDriver = (driverVideoUrl?: string, driverLoopId?: string) => {
    const resolved = resolvePresenterDriver({
      personaId,
      videoUrl: driverVideoUrl,
      loopId: driverLoopId,
      attire: typeof cfg.attire === "string" ? cfg.attire : undefined,
      avatarUrl: typeof cfg.avatarUrl === "string" ? cfg.avatarUrl : undefined,
    });
    if (!fs.existsSync(resolved.driverPath)) {
      const alt = resolveLocalPublicCandidate(resolved.driverPath.replace(process.cwd(), ""));
      if (alt) resolved.driverPath = alt;
    }
    return resolved;
  };

  if (engine === "ditto") {
    const { driverPath, avatarId, isVideo } = resolveDriver(
      typeof cfg.videoUrl === "string" ? cfg.videoUrl : undefined,
      typeof cfg.loopId === "string" ? cfg.loopId : undefined
    );
    finalAvatarId = avatarId;
    await ensureAvatarPreprocessed(avatarId, driverPath, isVideo);
    const res = await generateTalkingHeadInference({
      modelId: "ditto",
      videoSrc: isVideo ? driverPath : undefined,
      avatarSrc: !isVideo ? driverPath : undefined,
      audioPath,
      fps,
    });
    if (!res.success || !res.videoUrl) {
      throw new Error(res.error || "Ditto lip-sync inference failed");
    }
    const videoBuf = await fetchBufferFromAnySource(res.videoUrl);
    if (!videoBuf || videoBuf.length === 0) {
      throw new Error(`Ditto output missing or unreadable at ${res.videoUrl}`);
    }
    fs.writeFileSync(outputPath, videoBuf);
    await sanitizePresenterVideo(outputPath);
  } else if (slices && slices.length > 1) {
    const ffmpeg = getFFmpegPath();
    const partFiles: string[] = [];
    for (let idx = 0; idx < slices.length; idx++) {
      const sl = slices[idx];
      const sliceAudio = path.join(tmpDir, `slice_audio_${idx}.wav`);
      const sliceOut = path.join(tmpDir, `slice_out_${idx}.mp4`);
      const startSec = Math.max(0, sl.audioStartFrame / fps);
      const durSec = Math.max(0.1, sl.sliceDurationFrames / fps);
      await execFileAsync(ffmpeg, [
        "-y", "-ss", startSec.toFixed(3), "-t", durSec.toFixed(3), "-i", audioPath, "-c:a", "pcm_s16le", sliceAudio,
      ]);

      const { driverPath, avatarId, isVideo } = resolveDriver(sl.videoUrl, sl.clipId);
      finalAvatarId = avatarId;
      await ensureAvatarPreprocessed(avatarId, driverPath, isVideo);
      const res = await generateMuseTalkLipSync({
        videoPath: driverPath,
        audioPath: sliceAudio,
        outputPath: sliceOut,
        avatarId,
        useCache: true,
        fps,
        startFrameOffset: sl.localStartFrame,
      });
      if (!res.success || !fs.existsSync(sliceOut)) {
        throw new Error(`MuseTalk slice ${idx + 1} failed`);
      }
      await sanitizePresenterVideo(sliceOut);
      partFiles.push(sliceOut);
    }

    const listFile = path.join(tmpDir, `concat_${timestamp}.txt`);
    fs.writeFileSync(listFile, partFiles.map((p) => `file '${p.replace(/\\/g, "/")}'`).join("\n"));
    await execFileAsync(ffmpeg, ["-y", "-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", outputPath]);
    await sanitizePresenterVideo(outputPath);
  } else {
    const singleSlice = slices?.[0];
    const { driverPath, avatarId, isVideo } = resolveDriver(
      singleSlice?.videoUrl ?? (typeof cfg.videoUrl === "string" ? cfg.videoUrl : undefined),
      singleSlice?.clipId ?? (typeof cfg.loopId === "string" ? cfg.loopId : undefined)
    );
    finalAvatarId = avatarId;
    await ensureAvatarPreprocessed(avatarId, driverPath, isVideo);
    const res = await generateMuseTalkLipSync({
      videoPath: driverPath,
      audioPath,
      outputPath,
      avatarId,
      useCache: true,
      fps,
      startFrameOffset: singleSlice?.localStartFrame ?? startFrameOffset,
    });
    if (!res.success || !fs.existsSync(outputPath)) {
      throw new Error(res.error || "MuseTalk lip-sync failed");
    }
    await sanitizePresenterVideo(outputPath);
  }

  await emitProgress(jobId, "Uploading lip-sync video to R2...", 2);
  const mp4Key = withTenant(companyId, `ecommerce/lipsync/${finalAvatarId}_${timestamp}.mp4`);
  const videoUrl = await storage.upload(mp4Key, fs.readFileSync(outputPath), "video/mp4");

  let webmUrl: string | undefined;
  if (asyncWebm) {
    try {
      const webmPath = await ensureTransparentWebmCompanion(outputPath);
      if (webmPath && fs.existsSync(webmPath)) {
        const webmKey = withTenant(companyId, `ecommerce/lipsync/${finalAvatarId}_${timestamp}.webm`);
        webmUrl = await storage.upload(webmKey, fs.readFileSync(webmPath), "video/webm");
      }
    } catch (webmErr) {
      log.warn({ err: webmErr }, `[ecommerceMediaTask] Non-fatal transparent WebM generation error`);
    }
  }

  return { videoUrl, webmUrl, engine, avatarId: finalAvatarId };
}

async function handleEcommerceRender(
  jobId: string,
  companyId: string,
  cfg: Record<string, unknown>,
  tmpDir: string
): Promise<Record<string, unknown>> {
  if (cfg.kind === "omnichannel") {
    await emitProgress(jobId, "Rendering 3-aspect omnichannel campaign batch...", 1);
    const bundle = await renderOmnichannelBatch({
      productSpec: cfg.productSpec as Parameters<typeof renderOmnichannelBatch>[0]["productSpec"],
      script: cfg.script as Parameters<typeof renderOmnichannelBatch>[0]["script"],
      presenter: cfg.presenter as Parameters<typeof renderOmnichannelBatch>[0]["presenter"],
      watermark: cfg.watermark as Parameters<typeof renderOmnichannelBatch>[0]["watermark"],
      usVsThem: cfg.usVsThem as Parameters<typeof renderOmnichannelBatch>[0]["usVsThem"],
      qrCode: cfg.qrCode as Parameters<typeof renderOmnichannelBatch>[0]["qrCode"],
      socialPopup: cfg.socialPopup as Parameters<typeof renderOmnichannelBatch>[0]["socialPopup"],
      audioMode: cfg.audioMode as Parameters<typeof renderOmnichannelBatch>[0]["audioMode"],
      musicBedUrl: typeof cfg.musicBedUrl === "string" ? cfg.musicBedUrl : undefined,
      baseMusicVolume: typeof cfg.baseMusicVolume === "number" ? cfg.baseMusicVolume : undefined,
      duckingDb: typeof cfg.duckingDb === "number" ? cfg.duckingDb : undefined,
      audioUrl: typeof cfg.audioUrl === "string" ? cfg.audioUrl : undefined,
      outputDir: tmpDir,
      dryRun: false,
    });

    await emitProgress(jobId, "Uploading omnichannel renders to R2...", 2);
    const formatKeys: OmnichannelFormatKey[] = ["vertical", "square", "landscape"];
    for (const fmt of formatKeys) {
      const meta = bundle.videos[fmt];
      if (meta?.outputPath && fs.existsSync(meta.outputPath)) {
        const key = withTenant(companyId, `ecommerce/renders/${bundle.campaignId}/${path.basename(meta.outputPath)}`);
        const r2Url = await storage.upload(key, fs.readFileSync(meta.outputPath), "video/mp4");
        meta.url = r2Url;
      }
    }

    return { bundle };
  }

  // Single ProductAdComposition render fallback
  const compositionId = String(cfg.compositionId || "ProductAd-Vertical");
  const videoId = String(cfg.videoId || `ecommerce_render_${Date.now()}`);
  const propsFile = path.join(tmpDir, "props.json");
  const outFile = path.join(tmpDir, `${videoId}.mp4`);
  fs.writeFileSync(propsFile, JSON.stringify(cfg.inputProps || {}));

  const { entryPoint } = getRemotionEntryPoint();
  const remotionBin = getRemotionBinPath();
  const concurrency = getOptimalRemotionConcurrency(false);
  const isWin = process.platform === "win32";
  const baseArgs = remotionBin.endsWith("npx") || remotionBin.endsWith("npx.cmd")
    ? ["remotion", "render"]
    : ["render"];
  const args = [
    ...baseArgs,
    entryPoint,
    compositionId,
    outFile,
    `--props=${propsFile}`,
    `--concurrency=${concurrency}`,
    `--gl=${process.env.REMOTION_GL || (isWin ? "angle" : "swangle")}`,
    "--pixel-format=yuv420p",
    "--crf=18",
  ];

  await emitProgress(jobId, `Rendering ${compositionId} with Remotion...`, 1);
  await new Promise<void>((resolve, reject) => {
    const child = spawn(remotionBin, args, { cwd: process.cwd(), shell: isWin });
    let errTail = "";
    child.stderr?.on("data", (d: Buffer) => {
      errTail = (errTail + d.toString()).slice(-500);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Remotion exited with code ${code}: ${errTail}`));
    });
  });

  if (!fs.existsSync(outFile)) {
    throw new Error(`Remotion render finished without producing ${outFile}`);
  }

  const key = withTenant(companyId, `ecommerce/renders/${videoId}.mp4`);
  const videoUrl = await storage.upload(key, fs.readFileSync(outFile), "video/mp4");
  return { videoUrl, storageKey: key };
}

async function handlePersonaStudioImage(
  jobId: string,
  companyId: string,
  cfg: Record<string, unknown>,
  tmpDir: string
): Promise<Record<string, unknown>> {
  const personaId = String(cfg.personaId || "");
  const personaSlug = String(cfg.personaSlug || "ruby");
  const studioType = String(cfg.studioType || "interview");
  const presetName = String(cfg.presetName || "");
  const attire = String(cfg.attire || "");
  const positivePrompt = String(cfg.positivePrompt || "");

  const comfyOk = await checkComfyUIHealth();
  if (!comfyOk) {
    throw new Error("ComfyUI is offline on port 8188. Start ComfyUI before generating studio images.");
  }

  let refPath =
    resolveLocalAvatarFile(`${personaSlug}_ref.png`) ||
    resolveLocalAvatarFile(`${personaSlug}.png`);

  if (!refPath) {
    const buf =
      (await fetchBufferFromAnySource(withTenant(companyId, `avatars/${personaSlug}_ref.png`))) ||
      (await fetchBufferFromAnySource(`avatars/${personaSlug}_ref.png`)) ||
      (await fetchBufferFromAnySource(`avatars/${personaSlug}.png`));
    if (buf) {
      refPath = path.join(tmpDir, `${personaSlug}_ref.png`);
      fs.writeFileSync(refPath, buf);
    }
  }

  if (!refPath || !fs.existsSync(refPath)) {
    throw new Error(`Reference image not found for persona "${personaSlug}"`);
  }

  await emitProgress(jobId, `Generating ${studioType} studio image in ComfyUI...`, 1);
  const imageBuffer = await generatePresenterImage(
    positivePrompt,
    refPath,
    undefined,
    [],
    Number(cfg.width || 1024),
    Number(cfg.height || 576),
    Number(cfg.denoise || 0.85)
  );

  const storageKey = withTenant(companyId, `studio-images/${personaSlug}/${studioType}/${Date.now()}.png`);
  const imageUrl = await storage.upload(storageKey, imageBuffer, "image/png");

  if (personaId) {
    try {
      await prisma.personaAvatar.create({
        data: {
          companyId,
          personaId,
          label: `${personaSlug} — ${presetName || studioType}`,
          url: imageUrl,
          storageKey,
          frameType: "portrait",
          presetName: presetName || null,
          promptUsed: positivePrompt.slice(0, 1000),
        },
      });
    } catch (dbErr) {
      log.warn({ err: dbErr }, `[ecommerceMediaTask] Non-fatal PersonaAvatar insert notice`);
    }
  }

  return {
    imageUrl,
    storageKey,
    personaId,
    personaSlug,
    studioType,
    presetUsed: presetName,
    attireUsed: attire,
  };
}

export async function stepEcommerceMediaTask(
  job: Record<string, unknown>,
  jobId: string
): Promise<void> {
  const startMs = Date.now();
  const type = String(job.type || "") as EcommerceMediaJobType;
  const companyId = String(job.companyId || "default");
  const cfg = parseConfig(job.config);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `ecom_worker_${type}_`));

  log.info(`🚀 [EcommerceMediaTask] Executing ${type} job ${jobId} for company=${companyId}`);

  try {
    let result: Record<string, unknown>;
    switch (type) {
      case "ecommerce_photo":
        result = await handleEcommercePhoto(jobId, companyId, cfg, tmpDir);
        break;
      case "ecommerce_scene":
        result = await handleEcommerceScene(jobId, companyId, cfg, tmpDir);
        break;
      case "ecommerce_veo":
        result = await handleEcommerceVeo(jobId, companyId, cfg);
        break;
      case "ecommerce_lipsync":
        result = await handleEcommerceLipsync(jobId, companyId, cfg, tmpDir);
        break;
      case "ecommerce_render":
        result = await handleEcommerceRender(jobId, companyId, cfg, tmpDir);
        break;
      case "persona_studio_image":
        result = await handlePersonaStudioImage(jobId, companyId, cfg, tmpDir);
        break;
      default:
        throw new Error(`Unsupported ecommerceMediaTask job type: ${type}`);
    }

    const durationMs = Date.now() - startMs;
    await reportProgress(jobId, {
      step: "done",
      status: "DONE",
      doneSteps: Number(job.totalSteps || 2),
      durationMs,
      result,
    });
    log.info(`✅ [EcommerceMediaTask] Completed ${type} job ${jobId} in ${(durationMs / 1000).toFixed(1)}s`);
  } catch (err) {
    if (err instanceof JobCancelledError) {
      throw err;
    }
    const errorMsg = err instanceof Error ? err.message : String(err);
    log.error(`❌ [EcommerceMediaTask] Failed ${type} job ${jobId}: ${errorMsg}`);
    await reportProgress(jobId, {
      step: "failed",
      status: "FAILED",
      errorLog: errorMsg,
      durationMs: Date.now() - startMs,
    }).catch(() => {});
    throw err;
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  }
}
