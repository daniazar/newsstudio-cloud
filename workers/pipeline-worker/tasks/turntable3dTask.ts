/**
 * workers/pipeline-worker/tasks/turntable3dTask.ts
 *
 * 3D Product Turntable job handler (GenerationJob type "turntable_3d").
 *
 *   reconstruct_and_render: image → Object3D-Server /jobs/reconstruct → mesh.glb + preview.png
 *                           → /jobs/turntable (mesh_job_id) → turntable.webm/.mp4 + contact sheet
 *   render_only:            stored mesh.glb → /jobs/turntable (mesh_base64) → turntable outputs
 *
 * The Object3D server keeps outputs on its own volume; this task downloads them and uploads
 * through the StorageClient abstraction. Domain updates go through the worker-authenticated
 * PATCH /api/ecommerce/turntable-3d/:assetId/worker-update route (same HTTP pattern as segments).
 */

import { storage, generateKey } from "@/lib/storage";
import {
  checkObject3DHealth,
  downloadObject3DFile,
  getObject3DServerUrl,
  submitReconstruction,
  submitTurntable,
  waitForObject3DJob,
  type Object3DJob,
  type Object3DJobMetrics,
} from "@/lib/ai/object3dClient";
import {
  TURNTABLE_3D_DEFAULTS,
  TURNTABLE_3D_QUALITIES,
  type Turntable3DBackground,
  type Turntable3DCameraPreset,
  type Turntable3DQuality,
} from "@/lib/types/turntable3d";
import { reportProgress, updateProduct3DAsset, type Product3DAssetUpdatePayload } from "../api";
import { config as workerConfig } from "../config";
import { JobCancelledError } from "./audioTask";

export const TURNTABLE_3D_IN_PROGRESS = "TURNTABLE_IN_PROGRESS";

export type Turntable3DMode = "reconstruct_and_render" | "render_only";

export interface Turntable3DTaskConfig {
  asset3DId: string;
  campaignId?: string;
  mode: Turntable3DMode;
  quality: Turntable3DQuality;
  sourceImageKey?: string;
  meshKey?: string;
  background: Turntable3DBackground;
  cameraPreset: Turntable3DCameraPreset;
  frames: number;
  fps: number;
  width: number;
  height: number;
}

export interface Turntable3DTaskOptions {
  /** Object3D job poll interval (ms). */
  pollMs?: number;
  /** Per server-job timeout (ms). */
  jobTimeoutMs?: number;
  serverUrl?: string;
}

export interface Turntable3DTaskResult {
  asset3DId: string;
  meshKey: string;
  previewKey: string | null;
  turntableKey: string;
  turntableMp4Key: string | null;
  contactSheetKey: string | null;
}

/** Progress window (percent of the whole job) for each phase, per mode. */
const PHASES: Record<Turntable3DMode, Record<"reconstruct" | "meshUpload" | "turntable" | "upload", [number, number]>> = {
  reconstruct_and_render: { reconstruct: [0, 55], meshUpload: [55, 60], turntable: [60, 92], upload: [92, 100] },
  render_only: { reconstruct: [0, 0], meshUpload: [0, 5], turntable: [5, 90], upload: [90, 100] },
};

/** Map a server job's 0..1 progress into the job-wide 0..100 window for a phase. */
export function mapPhaseProgress(window: [number, number], progress: number): number {
  const p = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0;
  return Math.round((window[0] + (window[1] - window[0]) * p) * 10) / 10;
}

export function parseTurntable3DConfig(raw: unknown): Turntable3DTaskConfig {
  const obj = (typeof raw === "string" ? JSON.parse(raw) : raw ?? {}) as Partial<Turntable3DTaskConfig>;
  if (!obj.asset3DId) throw new Error("turntable_3d job config is missing asset3DId");
  const mode: Turntable3DMode = obj.mode === "render_only" ? "render_only" : "reconstruct_and_render";
  if (mode === "reconstruct_and_render" && !obj.sourceImageKey) {
    throw new Error("turntable_3d job config is missing sourceImageKey");
  }
  if (mode === "render_only" && !obj.meshKey) {
    throw new Error("turntable_3d render_only job config is missing meshKey");
  }
  return {
    asset3DId: obj.asset3DId,
    campaignId: obj.campaignId,
    mode,
    quality: obj.quality && TURNTABLE_3D_QUALITIES.includes(obj.quality) ? obj.quality : TURNTABLE_3D_DEFAULTS.quality,
    sourceImageKey: obj.sourceImageKey,
    meshKey: obj.meshKey,
    background: obj.background ?? TURNTABLE_3D_DEFAULTS.background,
    cameraPreset: obj.cameraPreset ?? TURNTABLE_3D_DEFAULTS.cameraPreset,
    frames: obj.frames ?? TURNTABLE_3D_DEFAULTS.frames,
    fps: obj.fps ?? TURNTABLE_3D_DEFAULTS.fps,
    width: obj.width ?? TURNTABLE_3D_DEFAULTS.width,
    height: obj.height ?? TURNTABLE_3D_DEFAULTS.height,
  };
}

/** Load input image bytes from a storage key, an absolute URL, a data: URI or an app-relative path. */
async function loadSourceImage(keyOrUrl: string): Promise<Buffer> {
  if (keyOrUrl.startsWith("data:")) {
    const comma = keyOrUrl.indexOf(",");
    return Buffer.from(keyOrUrl.slice(comma + 1), "base64");
  }
  const isAbsolute = /^https?:\/\//i.test(keyOrUrl);
  if (isAbsolute || keyOrUrl.startsWith("/")) {
    const url = isAbsolute ? keyOrUrl : `${workerConfig.mainAppUrl}${keyOrUrl}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
    if (!res.ok) throw new Error(`Failed to fetch source image ${url}: HTTP ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  const buf = await storage.download(keyOrUrl);
  if (!buf || buf.length === 0) throw new Error(`Source image not found in storage: ${keyOrUrl}`);
  return buf;
}

function metricsPatch(metrics: Object3DJobMetrics | null | undefined): Product3DAssetUpdatePayload {
  if (!metrics) return {};
  const patch: Product3DAssetUpdatePayload = {};
  if (typeof metrics.inference_ms === "number") patch.inferenceMs = metrics.inference_ms;
  if (typeof metrics.bg_removal_ms === "number") patch.bgRemovalMs = metrics.bg_removal_ms;
  if (typeof metrics.vertex_count === "number") patch.vertexCount = metrics.vertex_count;
  if (typeof metrics.face_count === "number") patch.faceCount = metrics.face_count;
  if (typeof metrics.vram_peak_gb === "number") patch.vramPeakGb = metrics.vram_peak_gb;
  if (typeof metrics.texture_size === "string") patch.textureSize = metrics.texture_size;
  return patch;
}

async function tryDownload(jobId: string, name: string, serverUrl?: string): Promise<Buffer | null> {
  try {
    return await downloadObject3DFile(jobId, name, { serverUrl });
  } catch (err) {
    console.warn(`  ⚠️  [Turntable3D] Optional file ${name} unavailable for ${jobId}: ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

export async function stepTurntable3D(
  job: Record<string, unknown>,
  jobId: string,
  options: Turntable3DTaskOptions = {}
): Promise<Turntable3DTaskResult> {
  const companyId = job.companyId as string;
  if (!companyId) throw new Error("turntable_3d job is missing companyId");
  const cfg = parseTurntable3DConfig(job.config);
  const { asset3DId, mode } = cfg;
  const phases = PHASES[mode];
  const serverUrl = options.serverUrl;
  const pollMs = options.pollMs ?? 1500;
  const jobTimeoutMs = options.jobTimeoutMs ?? 20 * 60 * 1000;

  let lastStep = "";
  let lastPct = -1;
  const progress = async (step: string, pct: number, force = false): Promise<void> => {
    if (!force && step === lastStep && pct - lastPct < 2) return;
    lastStep = step;
    lastPct = pct;
    const ok = await reportProgress(jobId, { step, status: TURNTABLE_3D_IN_PROGRESS, doneSteps: pct });
    if (!ok) throw new JobCancelledError();
  };

  const update = async (patch: Product3DAssetUpdatePayload): Promise<void> => {
    const ok = await updateProduct3DAsset(asset3DId, patch);
    if (!ok) throw new Error(`Failed to update Product3DAsset ${asset3DId}`);
  };

  const onServerProgress = (window: [number, number]) => async (serverJob: Object3DJob) => {
    const step = serverJob.step === "done" ? (serverJob.kind === "reconstruct" ? "normalization" : "encode") : serverJob.step;
    await progress(step, mapPhaseProgress(window, serverJob.progress));
  };

  try {
    await progress("queued", 0, true);
    await update({
      status: mode === "render_only" ? "RENDERING" : "RECONSTRUCTING",
      errorLog: null,
      generationJobId: jobId,
    });

    const health = await checkObject3DHealth({ serverUrl, timeoutMs: 3000 });
    if (!health.online) {
      throw new Error(
        `Object3D server offline at ${getObject3DServerUrl(serverUrl)} — start it with docker compose -f docker-compose.object3d.yml up` +
          (health.error ? ` (${health.error})` : "")
      );
    }

    let meshKey: string;
    let previewKey: string | null = null;
    let turntableSource: { mesh_job_id: string } | { mesh_base64: string };

    if (mode === "reconstruct_and_render") {
      // ── 1. Reconstruct ────────────────────────────────────────────────────
      const image = await loadSourceImage(cfg.sourceImageKey as string);
      const submitted = await submitReconstruction(
        {
          image_base64: image.toString("base64"),
          quality: cfg.quality,
          engine: "auto",
          remove_background: true,
          texture_size: 1024,
          face_target: 100_000,
          seed: 42,
        },
        { serverUrl }
      );
      if (submitted.fallback_reason) {
        console.warn(`  ⚠️  [Turntable3D] Router fell back to ${submitted.engine}: ${submitted.fallback_reason}`);
      }
      await update({ serverJobId: submitted.job_id, engine: submitted.engine });

      const reconstructed = await waitForObject3DJob(submitted.job_id, {
        serverUrl,
        pollMs,
        timeoutMs: jobTimeoutMs,
        onProgress: onServerProgress(phases.reconstruct),
      });

      // ── 2. Persist mesh + preview ─────────────────────────────────────────
      await progress("upload", phases.meshUpload[0], true);
      const mesh = await downloadObject3DFile(submitted.job_id, "mesh.glb", { serverUrl });
      const preview = await tryDownload(submitted.job_id, "preview.png", serverUrl);
      const cutout = await tryDownload(submitted.job_id, "cutout.png", serverUrl);

      meshKey = generateKey({ companyId, type: "3d-objects", id: asset3DId, filename: "mesh.glb" });
      await storage.upload(meshKey, mesh, "model/gltf-binary");
      if (preview) {
        previewKey = generateKey({ companyId, type: "3d-objects", id: asset3DId, filename: "preview.png" });
        await storage.upload(previewKey, preview, "image/png");
      }
      if (cutout) {
        const cutoutKey = generateKey({ companyId, type: "3d-objects", id: asset3DId, filename: "cutout.png" });
        await storage.upload(cutoutKey, cutout, "image/png");
      }

      await update({
        ...metricsPatch(reconstructed.metrics),
        ...(reconstructed.engine ? { engine: reconstructed.engine } : {}),
        meshKey,
        ...(previewKey ? { previewKey } : {}),
        status: "RENDERING",
      });
      await progress("upload", phases.meshUpload[1], true);
      turntableSource = { mesh_job_id: submitted.job_id };
    } else {
      // ── 1'. Re-render from the stored canonical GLB ───────────────────────
      meshKey = cfg.meshKey as string;
      await progress("upload", phases.meshUpload[0], true);
      const mesh = await storage.download(meshKey);
      if (!mesh || mesh.length === 0) throw new Error(`Stored mesh not found: ${meshKey}`);
      turntableSource = { mesh_base64: mesh.toString("base64") };
      await progress("upload", phases.meshUpload[1], true);
    }

    // ── 3. Turntable render ─────────────────────────────────────────────────
    const tt = await submitTurntable(
      {
        ...turntableSource,
        frames: cfg.frames,
        fps: cfg.fps,
        width: cfg.width,
        height: cfg.height,
        background: cfg.background,
        camera_preset: cfg.cameraPreset,
      },
      { serverUrl }
    );
    await waitForObject3DJob(tt.job_id, {
      serverUrl,
      pollMs,
      timeoutMs: jobTimeoutMs,
      onProgress: onServerProgress(phases.turntable),
    });

    // ── 4. Persist turntable outputs ────────────────────────────────────────
    await progress("upload", phases.upload[0], true);
    const webm = await downloadObject3DFile(tt.job_id, "turntable.webm", { serverUrl });
    const mp4 = await tryDownload(tt.job_id, "turntable.mp4", serverUrl);
    const poster = await tryDownload(tt.job_id, "poster.png", serverUrl);
    const contactSheet = await tryDownload(tt.job_id, "contact_sheet.png", serverUrl);

    // Namespace by generation job so re-renders never overwrite (or serve cached) older outputs.
    const outId = `${asset3DId}/${jobId}`;
    const turntableKey = generateKey({ companyId, type: "3d-turntables", id: outId, filename: "turntable.webm" });
    await storage.upload(turntableKey, webm, "video/webm");

    let turntableMp4Key: string | null = null;
    if (mp4) {
      turntableMp4Key = generateKey({ companyId, type: "3d-turntables", id: outId, filename: "turntable.mp4" });
      await storage.upload(turntableMp4Key, mp4, "video/mp4");
    }
    let contactSheetKey: string | null = null;
    if (contactSheet) {
      contactSheetKey = generateKey({ companyId, type: "3d-turntables", id: outId, filename: "contact_sheet.png" });
      await storage.upload(contactSheetKey, contactSheet, "image/png");
    }
    if (poster && !previewKey && mode === "reconstruct_and_render") {
      previewKey = generateKey({ companyId, type: "3d-turntables", id: outId, filename: "poster.png" });
      await storage.upload(previewKey, poster, "image/png");
    }

    await update({
      turntableKey,
      turntableMp4Key,
      contactSheetKey,
      ...(previewKey && mode === "reconstruct_and_render" ? { previewKey } : {}),
      status: "READY",
      errorLog: null,
    });
    await progress("upload", phases.upload[1], true);

    return { asset3DId, meshKey, previewKey, turntableKey, turntableMp4Key, contactSheetKey };
  } catch (error) {
    const message =
      error instanceof JobCancelledError
        ? "Job cancelled"
        : error instanceof Error
          ? error.message
          : String(error);
    try {
      await updateProduct3DAsset(asset3DId, { status: "FAILED", errorLog: message });
    } catch {
      // Main app unreachable — the progress route marks the asset FAILED on terminal job failure.
    }
    throw error;
  }
}
