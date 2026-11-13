/**
 * src/components/ecommerce/turntable3d/useTurntable3DJob.ts
 *
 * Client hook + pure helpers for the 3D Product Turntable studio flow
 * (docs/3D-TURNTABLE-PRD.md §10, FR-04.4).
 *
 * The heavy lifting (bg removal → reconstruction → normalization → turntable
 * render → upload) runs in the standalone pipeline worker. This hook only talks
 * to the Next.js API routes under `/api/ecommerce/turntable-3d` and polls the
 * `Product3DAsset` DTO every 2 s until it reaches a terminal status.
 */

"use client";

import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import type { ExtractedProductAsset } from "@/lib/types/ecommerce";
import {
  TURNTABLE_3D_QUALITY_TIERS,
  TURNTABLE_3D_RENDER_ESTIMATE_SECONDS,
  TURNTABLE_3D_STEPS,
  type Product3DAssetDTO,
  type Product3DAssetStatus,
  type Turntable3DBackground,
  type Turntable3DCameraPreset,
  type Turntable3DEnginesResponse,
  type Turntable3DQuality,
  type Turntable3DStep,
} from "@/lib/types/turntable3d";

// ─── Constants ───────────────────────────────────────────────────────────────

export const TURNTABLE_3D_POLL_INTERVAL_MS = 2000;
/** Engines/offline status refresh — lets the card recover once Docker is started. */
export const TURNTABLE_3D_ENGINES_REFRESH_MS = 15000;

export const TURNTABLE_3D_API_BASE = "/api/ecommerce/turntable-3d";

/** The user-facing progress checklist (PRD §10 "Generation Flow UX"). */
export const TURNTABLE_3D_PROGRESS_STEPS: readonly Turntable3DStep[] = [
  "bg_removal",
  "reconstruction",
  "normalization",
  "turntable_render",
  "upload",
];

const PROGRESS_STEP_LABELS: Record<string, string> = {
  bg_removal: "Background removal",
  reconstruction: "3D reconstruction",
  normalization: "Mesh normalization",
  turntable_render: "Turntable render",
  upload: "Uploading",
};

/** Pipeline order of every step the worker can report. */
const STEP_ORDER: readonly Turntable3DStep[] = TURNTABLE_3D_STEPS.map((s) => s.value);

// ─── Pure helpers ────────────────────────────────────────────────────────────

export type Turntable3DStepState = "done" | "active" | "pending" | "failed";

export interface Turntable3DStepView {
  step: Turntable3DStep;
  label: string;
  state: Turntable3DStepState;
}

export function isTurntable3DStep(value: unknown): value is Turntable3DStep {
  return typeof value === "string" && (STEP_ORDER as readonly string[]).includes(value);
}

/** Coerce a raw `GenerationJob.currentStep` string into a known step (or null). */
export function normalizeTurntable3DStep(value: string | null | undefined): Turntable3DStep | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  return isTurntable3DStep(v) ? v : null;
}

export function isTerminalAssetStatus(status: Product3DAssetStatus | null | undefined): boolean {
  return status === "READY" || status === "FAILED";
}

export function getStepLabel(step: Turntable3DStep): string {
  return (
    PROGRESS_STEP_LABELS[step] ??
    TURNTABLE_3D_STEPS.find((s) => s.value === step)?.label ??
    step
  );
}

/**
 * Job-wide progress at which the worker starts the *final* asset upload. The worker
 * also reports `upload` while persisting the mesh (55–60 %) and `queued` while the
 * turntable job waits on the server, so the raw step alone is not monotonic.
 * Mirrors the phase windows in `workers/pipeline-worker/tasks/turntable3dTask.ts`
 * (final upload starts at 92 % / 90 % for render-only jobs).
 */
export const TURNTABLE_3D_FINAL_UPLOAD_PROGRESS = 0.9;

export interface StepViewContext {
  /** Job-wide 0..1 progress (see `computeTurntable3DProgress`). */
  progress?: number;
  /** The asset already has a reconstructed mesh (i.e. this is a render / re-render phase). */
  hasMesh?: boolean;
}

/** Index of the active checklist row (-1 = nothing started, length = all done). */
export function resolveActiveStepIndex(
  currentStep: string | null | undefined,
  status: Product3DAssetStatus | null | undefined,
  { progress = 0, hasMesh = false }: StepViewContext = {}
): number {
  const rows = TURNTABLE_3D_PROGRESS_STEPS;
  const total = rows.length;
  const step = normalizeTurntable3DStep(currentStep);

  if (status === "READY") return total;
  if (status === "PENDING" && !hasMesh && (!step || step === "queued")) return -1;

  const renderPhase =
    status === "RENDERING" || hasMesh || step === "turntable_render" || step === "encode";

  if (renderPhase) {
    if (step === "done") return total;
    if (step === "upload" && progress >= TURNTABLE_3D_FINAL_UPLOAD_PROGRESS) return rows.indexOf("upload");
    return rows.indexOf("turntable_render");
  }

  switch (step) {
    case "bg_removal":
      return rows.indexOf("bg_removal");
    case "reconstruction":
      return rows.indexOf("reconstruction");
    case "normalization":
    case "preview":
    case "upload": // mesh upload belongs to mesh preparation
      return rows.indexOf("normalization");
    default:
      return status === "RECONSTRUCTING" || status === "FAILED" ? rows.indexOf("bg_removal") : -1;
  }
}

/**
 * Build the checklist rows for an asset. Render / re-render jobs keep the
 * reconstruction rows as done, and the rows never move backwards when the worker
 * reports `upload` for the mesh or `queued` while the turntable job waits.
 */
export function getStepViews(
  currentStep: string | null | undefined,
  status: Product3DAssetStatus | null | undefined,
  context: StepViewContext = {}
): Turntable3DStepView[] {
  const total = TURNTABLE_3D_PROGRESS_STEPS.length;
  const activeIndex = resolveActiveStepIndex(currentStep, status, context);

  // A failed job with no step info fails on the first row.
  const failedIndex = status === "FAILED" ? Math.min(Math.max(activeIndex, 0), total - 1) : -2;

  return TURNTABLE_3D_PROGRESS_STEPS.map((s, idx) => {
    let state: Turntable3DStepState;
    if (idx === failedIndex) state = "failed";
    else if (idx < activeIndex) state = "done";
    else if (idx === activeIndex && status !== "FAILED") state = "active";
    else state = "pending";
    return { step: s, label: getStepLabel(s), state };
  });
}

/** Overall 0..1 progress. Prefers the worker's `doneSteps/totalSteps` when present. */
export function computeTurntable3DProgress(asset: Pick<Product3DAssetDTO, "status" | "job"> | null | undefined): number {
  if (!asset) return 0;
  if (asset.status === "READY") return 1;
  const job = asset.job;
  if (job && job.totalSteps > 0) {
    return clamp01(job.doneSteps / job.totalSteps);
  }
  const step = normalizeTurntable3DStep(job?.currentStep);
  if (!step) return 0;
  const rank = STEP_ORDER.indexOf(step);
  return clamp01(rank / (STEP_ORDER.length - 1));
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

export function formatEstimatedSeconds(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return "—";
  if (seconds < 90) return `~${Math.round(seconds)}s`;
  return `~${Math.round(seconds / 60)}m`;
}

export function formatDurationMs(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export interface Turntable3DQualityOption {
  value: Turntable3DQuality;
  label: string;
  description: string;
  engine: string;
  engineLabel: string;
  /** Reconstruction + turntable render estimate, seconds. */
  estimatedSeconds: number;
  vramGb: number | null;
  available: boolean;
  fallbackEngine: string | null;
  fallbackLabel: string | null;
  reason: string | null;
}

/**
 * Merge the static quality tiers with the live routing table from the server.
 * When the service is offline every tier is unavailable.
 */
export function resolveQualityOptions(
  engines: Turntable3DEnginesResponse | null | undefined
): Turntable3DQualityOption[] {
  const online = Boolean(engines?.online);
  const engineList = engines?.engines ?? [];
  const labelFor = (name: string | null | undefined): string | null => {
    if (!name) return null;
    return engineList.find((e) => e.name === name)?.label ?? name;
  };

  return TURNTABLE_3D_QUALITY_TIERS.map((tier) => {
    const route = engines?.quality_routing?.[tier.value];
    const engine = route?.engine ?? tier.engine;
    const engineInfo = engineList.find((e) => e.name === engine);
    const reconstructionSeconds = route?.estimated_seconds ?? tier.estimatedSeconds;
    const available = online && (route ? route.available : engineInfo ? engineInfo.status === "online" : true);
    const fallbackEngine = route?.fallback ?? null;
    return {
      value: tier.value,
      label: tier.label,
      description: tier.description,
      engine,
      engineLabel: labelFor(engine) ?? engine,
      estimatedSeconds: reconstructionSeconds + TURNTABLE_3D_RENDER_ESTIMATE_SECONDS,
      vramGb: engineInfo ? engineInfo.min_vram_gb : null,
      available,
      fallbackEngine,
      fallbackLabel: labelFor(fallbackEngine),
      reason: route?.reason ?? (online ? null : "3D service offline"),
    };
  });
}

/** Keep the preferred tier if it is available, else the first available one. */
export function pickQuality(
  options: readonly Turntable3DQualityOption[],
  preferred: Turntable3DQuality
): Turntable3DQuality {
  const current = options.find((o) => o.value === preferred);
  if (!current || current.available) return preferred;
  return options.find((o) => o.available)?.value ?? preferred;
}

/** Default reconstruction source: hero packshot → primary → first image with a URL. */
export function pickDefaultSourceAsset(
  assets: readonly ExtractedProductAsset[] | null | undefined
): ExtractedProductAsset | null {
  const withUrl = (assets ?? []).filter((a) => Boolean(a?.url));
  return (
    withUrl.find((a) => a.type === "hero_packshot" && a.isPrimary) ??
    withUrl.find((a) => a.type === "hero_packshot") ??
    withUrl.find((a) => a.isPrimary) ??
    withUrl[0] ??
    null
  );
}

/** URL to drop into the Remotion scene: alpha WebM preferred, opaque MP4 as fallback. */
export function getSceneVideoUrl(asset: Pick<Product3DAssetDTO, "turntableUrl" | "turntableMp4Url"> | null | undefined): string | null {
  return asset?.turntableUrl ?? asset?.turntableMp4Url ?? null;
}

export function canUseInScene(asset: Pick<Product3DAssetDTO, "status" | "turntableUrl" | "turntableMp4Url"> | null | undefined): boolean {
  return asset?.status === "READY" && getSceneVideoUrl(asset) !== null;
}

/** Find the revision whose turntable video is currently assigned to the scene. */
export function findAssetForSceneVideo(
  assets: readonly Product3DAssetDTO[],
  sceneVideoUrl: string | null | undefined
): Product3DAssetDTO | null {
  if (!sceneVideoUrl) return null;
  return assets.find((a) => a.turntableUrl === sceneVideoUrl || a.turntableMp4Url === sceneVideoUrl) ?? null;
}

/** Newest first. */
export function sortRevisions(assets: readonly Product3DAssetDTO[]): Product3DAssetDTO[] {
  return [...assets].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export function getStatusLabel(status: Product3DAssetStatus): string {
  switch (status) {
    case "PENDING":
      return "Queued";
    case "RECONSTRUCTING":
      return "Reconstructing";
    case "RENDERING":
      return "Rendering";
    case "READY":
      return "Ready";
    case "FAILED":
      return "Failed";
    default:
      return status;
  }
}

/** Pull a human-readable message out of an API error body. */
export function extractApiError(body: unknown, fallback: string): string {
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    for (const key of ["error", "detail", "message"]) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) return value;
    }
  }
  return fallback;
}

// ─── Fetchers ────────────────────────────────────────────────────────────────

async function jsonFetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok) {
    throw new Error(extractApiError(body, `Request failed (${res.status})`));
  }
  return body as T;
}

async function enginesFetcher(url: string): Promise<Turntable3DEnginesResponse> {
  try {
    return await jsonFetcher<Turntable3DEnginesResponse>(url);
  } catch (err) {
    return {
      online: false,
      error: err instanceof Error ? err.message : "3D service unreachable",
      engines: [],
      quality_routing: {},
    };
  }
}

export class Turntable3DApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "Turntable3DApiError";
  }
}

async function postJson<T>(url: string, payload: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok) {
    throw new Turntable3DApiError(extractApiError(body, `Request failed (${res.status})`), res.status);
  }
  return body as T;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export interface GenerateTurntable3DInput {
  sourceAssetId?: string;
  /**
   * The editor's product images can come from the scraped spec (ids that are not
   * `ProductAsset` rows); the API resolves those by URL against the campaign.
   */
  sourceImageUrl?: string;
  quality: Turntable3DQuality;
  background?: Turntable3DBackground;
  cameraPreset?: Turntable3DCameraPreset;
}

export interface RerenderTurntable3DInput {
  background?: Turntable3DBackground;
  cameraPreset?: Turntable3DCameraPreset;
}

interface EnqueueResponse {
  jobId: string;
  asset3DId: string;
  estimatedSeconds?: number;
}

export interface UseTurntable3DJobResult {
  engines: Turntable3DEnginesResponse | undefined;
  enginesLoading: boolean;
  online: boolean;
  qualityOptions: Turntable3DQualityOption[];
  revisions: Product3DAssetDTO[];
  revisionsLoading: boolean;
  activeAssetId: string | null;
  asset: Product3DAssetDTO | null;
  assetError: string | null;
  isPolling: boolean;
  isSubmitting: boolean;
  submitError: string | null;
  /** Non-fatal information about the last submission (e.g. source image fallback). */
  submitNotice: string | null;
  estimatedSeconds: number | null;
  generate: (input: GenerateTurntable3DInput) => Promise<string | null>;
  rerender: (input: RerenderTurntable3DInput) => Promise<string | null>;
  loadAsset: (assetId: string | null) => void;
  refreshEngines: () => void;
}

export function useTurntable3DJob(campaignId: string | null | undefined): UseTurntable3DJobResult {
  const [activeAssetId, setActiveAssetId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitNotice, setSubmitNotice] = useState<string | null>(null);
  const [estimatedSeconds, setEstimatedSeconds] = useState<number | null>(null);

  const {
    data: engines,
    isLoading: enginesLoading,
    mutate: mutateEngines,
  } = useSWR<Turntable3DEnginesResponse>(`${TURNTABLE_3D_API_BASE}/engines`, enginesFetcher, {
    refreshInterval: TURNTABLE_3D_ENGINES_REFRESH_MS,
    revalidateOnFocus: true,
  });

  const revisionsKey = campaignId
    ? `${TURNTABLE_3D_API_BASE}?campaignId=${encodeURIComponent(campaignId)}`
    : null;
  const {
    data: revisionsData,
    isLoading: revisionsLoading,
    mutate: mutateRevisions,
  } = useSWR<{ assets: Product3DAssetDTO[] }>(revisionsKey, jsonFetcher, {
    revalidateOnFocus: false,
  });

  const assetKey = activeAssetId ? `${TURNTABLE_3D_API_BASE}/${encodeURIComponent(activeAssetId)}` : null;
  const {
    data: asset,
    error: assetFetchError,
    mutate: mutateAsset,
  } = useSWR<Product3DAssetDTO>(assetKey, jsonFetcher, {
    // Poll every 2 s until READY / FAILED (FR-04.4).
    refreshInterval: (latest) =>
      latest && isTerminalAssetStatus(latest.status) ? 0 : TURNTABLE_3D_POLL_INTERVAL_MS,
    refreshWhenHidden: true,
    revalidateOnFocus: false,
    dedupingInterval: 500,
    onSuccess: (latest) => {
      if (isTerminalAssetStatus(latest.status)) {
        void mutateRevisions();
      }
    },
  });

  const online = Boolean(engines?.online);
  const qualityOptions = useMemo(() => resolveQualityOptions(engines), [engines]);
  const revisions = useMemo(() => sortRevisions(revisionsData?.assets ?? []), [revisionsData]);

  // Show the matching revision immediately while the detail request is in flight.
  const resolvedAsset: Product3DAssetDTO | null =
    asset && asset.id === activeAssetId
      ? asset
      : revisions.find((r) => r.id === activeAssetId) ?? null;

  const generate = useCallback(
    async (input: GenerateTurntable3DInput): Promise<string | null> => {
      if (!campaignId) {
        setSubmitError("No campaign loaded");
        return null;
      }
      setIsSubmitting(true);
      setSubmitError(null);
      setSubmitNotice(null);
      try {
        const res = await postJson<EnqueueResponse>(TURNTABLE_3D_API_BASE, { campaignId, ...input });
        setEstimatedSeconds(res.estimatedSeconds ?? null);
        setActiveAssetId(res.asset3DId);
        void mutateRevisions();
        return res.asset3DId;
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : "Failed to start 3D generation");
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [campaignId, mutateRevisions]
  );

  const rerender = useCallback(
    async (input: RerenderTurntable3DInput): Promise<string | null> => {
      if (!activeAssetId) return null;
      setIsSubmitting(true);
      setSubmitError(null);
      setSubmitNotice(null);
      try {
        const res = await postJson<EnqueueResponse>(
          `${TURNTABLE_3D_API_BASE}/${encodeURIComponent(activeAssetId)}/render`,
          input
        );
        setEstimatedSeconds(res.estimatedSeconds ?? TURNTABLE_3D_RENDER_ESTIMATE_SECONDS);
        setActiveAssetId(res.asset3DId);
        if (res.asset3DId === activeAssetId) {
          // Same SWR key: flip the cached READY asset to RENDERING so polling resumes immediately.
          void mutateAsset(
            (current) =>
              current
                ? {
                    ...current,
                    background: input.background ?? current.background,
                    cameraPreset: input.cameraPreset ?? current.cameraPreset,
                    status: "RENDERING",
                    job: null,
                  }
                : current,
            { revalidate: true }
          );
        }
        void mutateRevisions();
        return res.asset3DId;
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : "Failed to start turntable render");
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [activeAssetId, mutateAsset, mutateRevisions]
  );

  const loadAsset = useCallback((assetId: string | null) => {
    setSubmitError(null);
    setSubmitNotice(null);
    setEstimatedSeconds(null);
    setActiveAssetId(assetId);
  }, []);

  const refreshEngines = useCallback(() => {
    void mutateEngines();
  }, [mutateEngines]);

  return {
    engines,
    enginesLoading,
    online,
    qualityOptions,
    revisions,
    revisionsLoading,
    activeAssetId,
    asset: resolvedAsset,
    assetError: assetFetchError instanceof Error ? assetFetchError.message : null,
    isPolling: Boolean(resolvedAsset && !isTerminalAssetStatus(resolvedAsset.status)),
    isSubmitting,
    submitError,
    submitNotice,
    estimatedSeconds,
    generate,
    rerender,
    loadAsset,
    refreshEngines,
  };
}
