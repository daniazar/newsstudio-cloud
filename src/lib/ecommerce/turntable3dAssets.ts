/**
 * src/lib/ecommerce/turntable3dAssets.ts
 *
 * Server-side helpers for the 3D Product Turntable API routes: request validation,
 * source-image selection, and Product3DAsset → DTO mapping (storage keys → URLs).
 */

import type { GenerationJob, Product3DAsset, ProductAsset } from "@prisma/client";
import { storage } from "@/lib/storage";
import {
  TURNTABLE_3D_BACKGROUND_VALUES,
  TURNTABLE_3D_CAMERA_PRESET_VALUES,
  TURNTABLE_3D_DEFAULTS,
  TURNTABLE_3D_QUALITIES,
  TURNTABLE_3D_QUALITY_TIERS,
  TURNTABLE_3D_RENDER_ESTIMATE_SECONDS,
  type Product3DAssetDTO,
  type Product3DAssetStatus,
  type Turntable3DBackground,
  type Turntable3DCameraPreset,
  type Turntable3DQuality,
} from "@/lib/types/turntable3d";

export const TURNTABLE_3D_JOB_TYPE = "turntable_3d";
export const TURNTABLE_3D_JOB_STATUS = "TURNTABLE_IN_PROGRESS";
/** doneSteps is reported as a 0..100 percentage of the whole job. */
export const TURNTABLE_3D_TOTAL_STEPS = 100;

export type Turntable3DJobMode = "reconstruct_and_render" | "render_only";

export interface Turntable3DRenderSettings {
  background: Turntable3DBackground;
  cameraPreset: Turntable3DCameraPreset;
  frames: number;
  fps: number;
  width: number;
  height: number;
}

/** JSON stored in GenerationJob.config for `turntable_3d` jobs. */
export interface Turntable3DJobConfig extends Turntable3DRenderSettings {
  asset3DId: string;
  campaignId: string;
  mode: Turntable3DJobMode;
  quality: Turntable3DQuality;
  /** Storage key or absolute URL of the input image (reconstruct_and_render). */
  sourceImageKey?: string;
  /** Storage key of the existing normalized GLB (render_only). */
  meshKey?: string;
}

type Validation<T> = { ok: true; value: T } | { ok: false; error: string };

export function isTurntable3DQuality(v: unknown): v is Turntable3DQuality {
  return typeof v === "string" && (TURNTABLE_3D_QUALITIES as readonly string[]).includes(v);
}

function intInRange(name: string, v: unknown, fallback: number, min: number, max: number): Validation<number> {
  if (v === undefined || v === null) return { ok: true, value: fallback };
  if (typeof v !== "number" || !Number.isInteger(v) || v < min || v > max) {
    return { ok: false, error: `${name} must be an integer between ${min} and ${max}` };
  }
  return { ok: true, value: v };
}

/**
 * Validate optional render settings from a request body, falling back to `base`
 * (the asset's current settings on re-render, or PRD defaults).
 */
export function parseRenderSettings(
  body: Record<string, unknown>,
  base: Turntable3DRenderSettings = TURNTABLE_3D_DEFAULTS
): Validation<Turntable3DRenderSettings> {
  const background = body.background ?? base.background;
  if (typeof background !== "string" || !(TURNTABLE_3D_BACKGROUND_VALUES as readonly string[]).includes(background)) {
    return { ok: false, error: `background must be one of: ${TURNTABLE_3D_BACKGROUND_VALUES.join(", ")}` };
  }
  const cameraPreset = body.cameraPreset ?? base.cameraPreset;
  if (
    typeof cameraPreset !== "string" ||
    !(TURNTABLE_3D_CAMERA_PRESET_VALUES as readonly string[]).includes(cameraPreset)
  ) {
    return { ok: false, error: `cameraPreset must be one of: ${TURNTABLE_3D_CAMERA_PRESET_VALUES.join(", ")}` };
  }
  const frames = intInRange("frames", body.frames, base.frames, 8, 600);
  if (!frames.ok) return frames;
  const fps = intInRange("fps", body.fps, base.fps, 1, 60);
  if (!fps.ok) return fps;
  const width = intInRange("width", body.width, base.width, 256, 2160);
  if (!width.ok) return width;
  const height = intInRange("height", body.height, base.height, 256, 2160);
  if (!height.ok) return height;

  return {
    ok: true,
    value: {
      background: background as Turntable3DBackground,
      cameraPreset: cameraPreset as Turntable3DCameraPreset,
      frames: frames.value,
      fps: fps.value,
      width: width.value,
      height: height.value,
    },
  };
}

/**
 * Pick the reconstruction input: explicit asset → primary hero_packshot → any
 * hero_packshot → primary asset → first asset. Videos are skipped.
 */
export function pickTurntableSourceAsset(
  assets: ProductAsset[],
  sourceAssetId?: string
): ProductAsset | null {
  if (sourceAssetId) return assets.find((a) => a.id === sourceAssetId) ?? null;
  const images = assets.filter((a) => a.assetType !== "existing_video");
  return (
    images.find((a) => a.assetType === "hero_packshot" && a.isPrimary) ??
    images.find((a) => a.assetType === "hero_packshot") ??
    images.find((a) => a.isPrimary) ??
    images[0] ??
    null
  );
}

/** Storage key when the asset has been ingested, otherwise its raw (absolute) URL. */
export function sourceImageKeyFor(asset: ProductAsset): string | null {
  return asset.storageKey || asset.rawUrl || null;
}

export interface TurntableSourceRequest {
  sourceAssetId?: string;
  /** Image URL as shown in the editor — scraped spec images have no ProductAsset row. */
  sourceImageUrl?: string;
}

export type TurntableSourceResolution =
  | { ok: true; sourceAssetId: string | null; sourceImageKey: string }
  | { ok: false; status: 404 | 422; error: string };

/**
 * Resolve the reconstruction input for a campaign.
 *
 * `sourceImageUrl` is only accepted when it belongs to the campaign — it matches a ProductAsset
 * or appears in the scraped product metadata. The worker fetches this URL server-side, so an
 * arbitrary caller-supplied URL would be an SSRF vector.
 */
export function resolveTurntableSource(
  campaign: { assets: ProductAsset[]; rawMetadata: string },
  request: TurntableSourceRequest
): TurntableSourceResolution {
  const { sourceAssetId, sourceImageUrl } = request;
  const byId = sourceAssetId ? campaign.assets.find((a) => a.id === sourceAssetId) : undefined;
  const byUrl = sourceImageUrl
    ? campaign.assets.find((a) => a.rawUrl === sourceImageUrl || a.storageKey === sourceImageUrl)
    : undefined;
  const explicit = byId ?? byUrl;
  if (explicit) {
    const key = sourceImageKeyFor(explicit);
    return key
      ? { ok: true, sourceAssetId: explicit.id, sourceImageKey: key }
      : { ok: false, status: 422, error: "Selected product asset has no image URL or storage key" };
  }

  if (sourceImageUrl) {
    const isHttp = /^https?:\/\//i.test(sourceImageUrl);
    if (isHttp && campaign.rawMetadata.includes(sourceImageUrl)) {
      return { ok: true, sourceAssetId: null, sourceImageKey: sourceImageUrl };
    }
    return { ok: false, status: 404, error: "sourceImageUrl is not an image of this campaign" };
  }
  if (sourceAssetId) {
    return { ok: false, status: 404, error: "sourceAssetId not found on this campaign" };
  }

  const fallback = pickTurntableSourceAsset(campaign.assets);
  if (!fallback) return { ok: false, status: 422, error: "Campaign has no product image to reconstruct" };
  const key = sourceImageKeyFor(fallback);
  return key
    ? { ok: true, sourceAssetId: fallback.id, sourceImageKey: key }
    : { ok: false, status: 422, error: "Selected product asset has no image URL or storage key" };
}

export function estimateTurntableSeconds(quality: Turntable3DQuality, reconstructSeconds?: number): number {
  const tier = TURNTABLE_3D_QUALITY_TIERS.find((t) => t.value === quality);
  const base = typeof reconstructSeconds === "number" && reconstructSeconds > 0 ? reconstructSeconds : tier?.estimatedSeconds ?? 60;
  return Math.round(base + TURNTABLE_3D_RENDER_ESTIMATE_SECONDS);
}

function urlFor(key: string | null): string | null {
  if (!key) return null;
  if (/^(https?:|data:|blob:)/.test(key)) return key;
  return storage.getUrl(key);
}

type JobSummary = Pick<GenerationJob, "id" | "status" | "currentStep" | "doneSteps" | "totalSteps">;

export function toProduct3DAssetDTO(asset: Product3DAsset, job: JobSummary | null): Product3DAssetDTO {
  return {
    id: asset.id,
    campaignId: asset.campaignId,
    status: asset.status as Product3DAssetStatus,
    engine: asset.engine,
    quality: asset.quality as Turntable3DQuality,
    background: asset.background as Turntable3DBackground,
    cameraPreset: asset.cameraPreset as Turntable3DCameraPreset,
    frames: asset.frames,
    fps: asset.fps,
    width: asset.width,
    height: asset.height,
    meshUrl: urlFor(asset.meshKey),
    turntableUrl: urlFor(asset.turntableKey),
    turntableMp4Url: urlFor(asset.turntableMp4Key),
    previewUrl: urlFor(asset.previewKey),
    contactSheetUrl: urlFor(asset.contactSheetKey),
    inferenceMs: asset.inferenceMs,
    vertexCount: asset.vertexCount,
    textureSize: asset.textureSize,
    errorLog: asset.errorLog,
    createdAt: asset.createdAt.toISOString(),
    updatedAt: asset.updatedAt.toISOString(),
    job: job
      ? {
          id: job.id,
          status: job.status,
          currentStep: job.currentStep,
          doneSteps: job.doneSteps,
          totalSteps: job.totalSteps,
        }
      : null,
  };
}

export const JOB_SUMMARY_SELECT = {
  id: true,
  status: true,
  currentStep: true,
  doneSteps: true,
  totalSteps: true,
} as const;
