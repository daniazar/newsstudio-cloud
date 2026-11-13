/**
 * src/lib/ai/object3dClient.ts
 *
 * Typed HTTP client for the Object3D-Server orchestrator (3D Product Turntable).
 * Contract: vendor/Object3D-Server/API.md — single image → normalized GLB → 360° turntable.
 *
 * The server never talks to object storage. Callers (the pipeline worker) download
 * produced files with `downloadObject3DFile` and upload them through `@/lib/storage`.
 */

import type {
  Turntable3DBackground,
  Turntable3DCameraPreset,
  Turntable3DEngineInfo,
  Turntable3DEnginesResponse,
  Turntable3DQuality,
  Turntable3DQualityRoute,
} from "@/lib/types/turntable3d";

export const OBJECT3D_DEFAULT_URL = "http://localhost:8020";

/** Resolve the orchestrator base URL (no trailing slash). */
export function getObject3DServerUrl(serverUrl?: string): string {
  return (serverUrl || process.env.OBJECT3D_SERVER_URL || OBJECT3D_DEFAULT_URL).replace(/\/+$/, "");
}

// ─── Contract types ─────────────────────────────────────────────────────────

export type Object3DJobKind = "reconstruct" | "turntable";
export type Object3DJobStatus = "queued" | "running" | "complete" | "failed";

/** Reconstruct steps: queued → bg_removal → reconstruction → normalization → preview → done */
export type Object3DReconstructStep = "queued" | "bg_removal" | "reconstruction" | "normalization" | "preview" | "done";
/** Turntable steps: queued → turntable_render → encode → done */
export type Object3DTurntableStep = "queued" | "turntable_render" | "encode" | "done";

export type Object3DReconstructFile = "cutout.png" | "raw.glb" | "mesh.glb" | "preview.png";
export type Object3DTurntableFile = "turntable.webm" | "turntable.mp4" | "poster.png" | "contact_sheet.png";

export interface Object3DHealthResponse {
  status: string;
  service: string;
  version: string;
  port: number;
  gpu_name?: string | null;
  vram_total_gb?: number | null;
  vram_used_gb?: number | null;
  loaded_engine?: string | null;
  queue_depth?: number;
  engines: Turntable3DEngineInfo[];
}

export interface Object3DHealthResult {
  online: boolean;
  latencyMs?: number;
  error?: string;
  health?: Object3DHealthResponse;
}

export interface Object3DEnginesPayload {
  engines: Turntable3DEngineInfo[];
  quality_routing: Partial<Record<Turntable3DQuality, Turntable3DQualityRoute>>;
}

export interface Object3DReconstructRequest {
  /** PNG/JPG bytes as base64, without a `data:` prefix. */
  image_base64: string;
  second_image_base64?: string | null;
  quality: Turntable3DQuality;
  /** `auto` or an engine name from `/engines`. */
  engine?: string;
  remove_background?: boolean;
  texture_size?: number;
  face_target?: number;
  seed?: number;
}

export interface Object3DReconstructResponse {
  job_id: string;
  kind: "reconstruct";
  engine: string;
  estimated_seconds: number;
  status: Object3DJobStatus;
  fallback_reason: string | null;
}

export interface Object3DTurntableRequest {
  /** A completed reconstruct job id. Exactly one of mesh_job_id / mesh_base64. */
  mesh_job_id?: string | null;
  /** A GLB as base64. Exactly one of mesh_job_id / mesh_base64. */
  mesh_base64?: string | null;
  frames?: number;
  fps?: number;
  width?: number;
  height?: number;
  background?: Turntable3DBackground;
  camera_preset?: Turntable3DCameraPreset;
}

export interface Object3DTurntableResponse {
  job_id: string;
  kind: "turntable";
  status: Object3DJobStatus;
}

export interface Object3DJobMetrics {
  bg_removal_ms?: number | null;
  inference_ms?: number | null;
  normalize_ms?: number | null;
  render_ms?: number | null;
  total_ms?: number | null;
  vram_peak_gb?: number | null;
  vertex_count?: number | null;
  face_count?: number | null;
  texture_size?: string | null;
}

export interface Object3DJob {
  job_id: string;
  kind: Object3DJobKind;
  status: Object3DJobStatus;
  step: Object3DReconstructStep | Object3DTurntableStep | string;
  /** 0..1 across the whole job. */
  progress: number;
  engine?: string | null;
  error: string | null;
  created_at: string;
  metrics?: Object3DJobMetrics | null;
  /** file name → server-relative download path. Files appear as they are produced. */
  files?: Record<string, string>;
}

export interface Object3DRequestOptions {
  serverUrl?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export class Object3DServerError extends Error {
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "Object3DServerError";
    this.status = status;
  }
}

// ─── Internals ──────────────────────────────────────────────────────────────

function buildSignal(timeoutMs: number, signal?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  if (!signal) return timeout;
  if (typeof AbortSignal.any === "function") return AbortSignal.any([signal, timeout]);
  const controller = new AbortController();
  const forward = (s: AbortSignal) => () => controller.abort(s.reason);
  if (signal.aborted) controller.abort(signal.reason);
  signal.addEventListener("abort", forward(signal), { once: true });
  timeout.addEventListener("abort", forward(timeout), { once: true });
  return controller.signal;
}

function describeError(err: unknown): string {
  if (err instanceof Error) {
    if (err.name === "TimeoutError") return "request timed out";
    const cause = (err as Error & { cause?: unknown }).cause;
    if (cause instanceof Error && cause.message) return `${err.message} (${cause.message})`;
    return err.message;
  }
  return String(err);
}

async function readErrorDetail(res: Response): Promise<string> {
  try {
    const text = await res.text();
    try {
      const parsed = JSON.parse(text) as { detail?: unknown };
      if (typeof parsed.detail === "string") return parsed.detail;
      if (parsed.detail !== undefined) return JSON.stringify(parsed.detail);
    } catch {
      // not JSON
    }
    return text.slice(0, 500) || res.statusText;
  } catch {
    return res.statusText;
  }
}

async function requestJson<T>(
  method: "GET" | "POST",
  path: string,
  body: unknown,
  opts: Object3DRequestOptions = {}
): Promise<T> {
  const base = getObject3DServerUrl(opts.serverUrl);
  const url = `${base}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: buildSignal(opts.timeoutMs ?? 30_000, opts.signal),
    });
  } catch (err) {
    if (opts.signal?.aborted) throw err;
    throw new Object3DServerError(`Object3D server unreachable at ${base}: ${describeError(err)}`);
  }
  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw new Object3DServerError(`Object3D ${method} ${path} failed (HTTP ${res.status}): ${detail}`, res.status);
  }
  return (await res.json()) as T;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/** `GET /health` — never throws; resolves `{ online: false, error }` when unreachable. */
export async function checkObject3DHealth(opts: Object3DRequestOptions = {}): Promise<Object3DHealthResult> {
  const base = getObject3DServerUrl(opts.serverUrl);
  const start = Date.now();
  try {
    const res = await fetch(`${base}/health`, { signal: buildSignal(opts.timeoutMs ?? 1500, opts.signal) });
    const latencyMs = Date.now() - start;
    if (!res.ok) {
      return { online: false, latencyMs, error: `HTTP ${res.status}: ${await readErrorDetail(res)}` };
    }
    const health = (await res.json()) as Object3DHealthResponse;
    return { online: true, latencyMs, health };
  } catch (err) {
    return { online: false, error: `Object3D server unreachable at ${base}: ${describeError(err)}` };
  }
}

/**
 * `GET /engines` merged with `/health` GPU info — never throws. When the server is
 * down, resolves `{ online: false, error, engines: [], quality_routing: {} }`.
 */
export async function getObject3DEngines(opts: Object3DRequestOptions = {}): Promise<Turntable3DEnginesResponse> {
  const timeoutMs = opts.timeoutMs ?? 2000;
  const [enginesResult, healthResult] = await Promise.all([
    requestJson<Object3DEnginesPayload>("GET", "/engines", undefined, { ...opts, timeoutMs }).then(
      (data) => ({ ok: true as const, data }),
      (err: unknown) => ({ ok: false as const, error: err instanceof Error ? err.message : String(err) })
    ),
    checkObject3DHealth({ ...opts, timeoutMs }),
  ]);

  if (!enginesResult.ok) {
    return { online: false, error: enginesResult.error, engines: [], quality_routing: {} };
  }
  const health = healthResult.health;
  return {
    online: true,
    engines: Array.isArray(enginesResult.data.engines) ? enginesResult.data.engines : [],
    quality_routing: enginesResult.data.quality_routing ?? {},
    ...(typeof health?.vram_total_gb === "number" ? { vram_total_gb: health.vram_total_gb } : {}),
    ...(health?.gpu_name ? { gpu_name: health.gpu_name } : {}),
  };
}

/** `POST /jobs/reconstruct` → 202. Throws `Object3DServerError` on failure. */
export async function submitReconstruction(
  req: Object3DReconstructRequest,
  opts: Object3DRequestOptions = {}
): Promise<Object3DReconstructResponse> {
  const body: Object3DReconstructRequest = {
    second_image_base64: null,
    engine: "auto",
    remove_background: true,
    ...req,
    image_base64: req.image_base64.replace(/^data:[^;]+;base64,/, ""),
  };
  return requestJson<Object3DReconstructResponse>("POST", "/jobs/reconstruct", body, {
    ...opts,
    timeoutMs: opts.timeoutMs ?? 60_000,
  });
}

/** `POST /jobs/turntable` → 202. Exactly one of `mesh_job_id` / `mesh_base64` is required. */
export async function submitTurntable(
  req: Object3DTurntableRequest,
  opts: Object3DRequestOptions = {}
): Promise<Object3DTurntableResponse> {
  const hasJob = Boolean(req.mesh_job_id);
  const hasMesh = Boolean(req.mesh_base64);
  if (hasJob === hasMesh) {
    throw new Object3DServerError("submitTurntable requires exactly one of mesh_job_id or mesh_base64");
  }
  const body: Object3DTurntableRequest = {
    ...req,
    mesh_job_id: req.mesh_job_id || null,
    mesh_base64: req.mesh_base64 || null,
  };
  return requestJson<Object3DTurntableResponse>("POST", "/jobs/turntable", body, {
    ...opts,
    timeoutMs: opts.timeoutMs ?? 60_000,
  });
}

/** `GET /jobs/{job_id}` */
export async function getObject3DJob(jobId: string, opts: Object3DRequestOptions = {}): Promise<Object3DJob> {
  return requestJson<Object3DJob>("GET", `/jobs/${encodeURIComponent(jobId)}`, undefined, {
    ...opts,
    timeoutMs: opts.timeoutMs ?? 10_000,
  });
}

/** `GET /jobs/{job_id}/files/{name}` → bytes. Throws (status 404) when not produced. */
export async function downloadObject3DFile(
  jobId: string,
  name: Object3DReconstructFile | Object3DTurntableFile | string,
  opts: Object3DRequestOptions = {}
): Promise<Buffer> {
  const base = getObject3DServerUrl(opts.serverUrl);
  const path = `/jobs/${encodeURIComponent(jobId)}/files/${encodeURIComponent(name)}`;
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, { signal: buildSignal(opts.timeoutMs ?? 120_000, opts.signal) });
  } catch (err) {
    if (opts.signal?.aborted) throw err;
    throw new Object3DServerError(`Object3D server unreachable at ${base}: ${describeError(err)}`);
  }
  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw new Object3DServerError(`Object3D file ${name} for job ${jobId} unavailable (HTTP ${res.status}): ${detail}`, res.status);
  }
  return Buffer.from(await res.arrayBuffer());
}

export interface WaitForObject3DJobOptions extends Object3DRequestOptions {
  /** Called after every poll. May be async; throwing aborts the wait (e.g. job cancelled). */
  onProgress?: (job: Object3DJob) => void | Promise<void>;
  /** Poll interval (default 1500 ms). */
  pollMs?: number;
  /** Overall timeout (default 15 min). */
  timeoutMs?: number;
  /** Consecutive transient poll errors tolerated before giving up (default 5). */
  maxConsecutiveErrors?: number;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason instanceof Error ? signal.reason : new Error("Aborted"));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason instanceof Error ? signal.reason : new Error("Aborted"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Poll `GET /jobs/{id}` until `complete` (resolves with the final job) or `failed`
 * (throws `Object3DServerError` with the server's error). Also throws on timeout/abort.
 */
export async function waitForObject3DJob(jobId: string, opts: WaitForObject3DJobOptions = {}): Promise<Object3DJob> {
  const pollMs = opts.pollMs ?? 1500;
  const timeoutMs = opts.timeoutMs ?? 15 * 60 * 1000;
  const maxErrors = opts.maxConsecutiveErrors ?? 5;
  const deadline = Date.now() + timeoutMs;
  let consecutiveErrors = 0;

  for (;;) {
    if (opts.signal?.aborted) {
      throw opts.signal.reason instanceof Error ? opts.signal.reason : new Error("Aborted");
    }

    let job: Object3DJob | null = null;
    try {
      job = await getObject3DJob(jobId, { serverUrl: opts.serverUrl, signal: opts.signal });
      consecutiveErrors = 0;
    } catch (err) {
      if (opts.signal?.aborted) throw err;
      // A 404 means the server lost the job (e.g. restarted) — not transient.
      if (err instanceof Object3DServerError && err.status === 404) throw err;
      consecutiveErrors += 1;
      if (consecutiveErrors >= maxErrors) throw err;
    }

    if (job) {
      if (opts.onProgress) await opts.onProgress(job);
      if (job.status === "complete") return job;
      if (job.status === "failed") {
        throw new Object3DServerError(
          `Object3D ${job.kind} job ${jobId} failed at step "${job.step}": ${job.error || "unknown error"}`
        );
      }
    }

    if (Date.now() >= deadline) {
      throw new Object3DServerError(`Timed out after ${Math.round(timeoutMs / 1000)}s waiting for Object3D job ${jobId}`);
    }
    await sleep(pollMs, opts.signal);
  }
}
