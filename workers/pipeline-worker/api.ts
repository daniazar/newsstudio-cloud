import { config } from "./config";
import { pooledFetch } from "@/lib/network/httpPool";
import { ECOMMERCE_MEDIA_JOB_TYPES } from "./tasks/ecommerceMediaTask";
import type {
  LlmBrokerClaimedTask,
  LlmBrokerCompletePayload,
  TtsPreviewBrokerClaimedTask,
  TtsPreviewBrokerCompletePayload,
} from "@/lib/worker-broker";

/**
 * HTTP client for calling the main Next.js app's pipeline API.
 * All requests include the WORKER_API_KEY as a Bearer token.
 */

interface ApiResponse<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
}

async function request<T = unknown>(
  method: string,
  path: string,
  body?: unknown
): Promise<ApiResponse<T>> {
  const url = `${config.mainAppUrl}${path}`;
  const headers: Record<string, string> = {
    "x-worker-key": config.apiKey,
    "Content-Type": "application/json",
  };

  try {
    const res = await pooledFetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = (await res.json()) as T;
    return { ok: res.ok, status: res.status, data };
  } catch (error) {
    console.error(`❌ API request failed: ${method} ${url}`, error);
    throw error;
  }
}

// ─── Queue Discovery ───────────────────────────────────────────────────────

export interface QueuedJob {
  id: string;
  storyId: string;
  companyId: string;
  type: string;
  status: string;
  totalSteps: number;
  config: string | null;
  createdAt: string;
}

interface QueueResponse {
  job: QueuedJob | null;
}

/** Fetch the oldest QUEUED job from the main app matching the worker's role */
export async function pollQueue(): Promise<QueuedJob | null> {
  let query = "";
  if (config.role !== "full") {
    if (config.role === "video") {
      // If a specific engine is requested (e.g. --engine=bubble, musetalk, ditto)
      if (config.engine === "bubble") {
        query = "?type=video_bubble,musetalk,ditto,ecommerce_lipsync";
      } else if (config.engine === "musetalk") {
        query = "?type=musetalk,video_bubble,ecommerce_lipsync";
      } else if (config.engine === "ditto") {
        query = "?type=ditto,video_bubble";
      } else if (config.engine === "full") {
        query = `?type=video_full,image,turntable_3d,veo,minimax,taomate,ltx,${ECOMMERCE_MEDIA_JOB_TYPES.join(",")}`;
      } else if (config.engine === "veo") {
        query = "?type=veo,video_full,ecommerce_veo";
      } else if (config.engine === "minimax" || config.engine === "taomate") {
        query = "?type=minimax,taomate,video_full";
      } else if (config.engine === "ltx") {
        query = "?type=ltx,video_full";
      } else {
        // If Mac, we only do bubble. If Windows, we can do both, so we request "video" which the backend will handle or we comma separate
        const isMac = process.platform === "darwin";
        query = isMac
          ? "?type=video_bubble,musetalk,ditto,ecommerce_lipsync"
          : `?type=video_full,video_bubble,musetalk,ditto,image,turntable_3d,veo,minimax,taomate,ltx,${ECOMMERCE_MEDIA_JOB_TYPES.join(",")}`;
      }
    } else if (config.role === "render") {
      query = "?type=render,ecommerce_render";
    } else if (config.role === "image") {
      query = "?type=image,ecommerce_photo,ecommerce_scene,persona_studio_image";
    } else {
      query = `?type=${config.role}`;
    }
  }

  const res = await request<QueueResponse>("GET", `/api/pipeline/queue${query}`);
  if (!res.ok) {
    console.error(`⚠️  Queue poll failed (${res.status}):`, res.data);
    return null;
  }
  return res.data.job;
}

// ─── Job Claim ─────────────────────────────────────────────────────────────

interface ClaimResponse {
  claimed: boolean;
  job?: Record<string, unknown>;
  story?: Record<string, unknown>;
  defaultVoices?: Array<{ personaId: string; audioPath: string }>;
}

/** Attempt to atomically claim a job */
export async function claimJob(
  jobId: string,
  workerId: string
): Promise<ClaimResponse> {
  const res = await request<ClaimResponse>(
    "POST",
    `/api/pipeline/jobs/${jobId}/claim`,
    { workerId }
  );

  if (!res.ok) {
    console.error(`⚠️  Claim failed (${res.status}):`, res.data);
    return { claimed: false };
  }

  return res.data;
}

// ─── Progress Reporting ────────────────────────────────────────────────────

interface ProgressPayload {
  step: string;
  status: string;
  doneSteps?: number;
  errorLog?: string;
  result?: unknown;
  durationMs?: number;
  creditsUsed?: number;
}

/** Report step completion to the main app */
export async function reportProgress(
  jobId: string,
  payload: ProgressPayload
): Promise<boolean> {
  const res = await request("POST", `/api/pipeline/jobs/${jobId}/progress`, payload);
  if (!res.ok) {
    console.error(`⚠️  Progress report failed (${res.status}):`, res.data);
    return false;
  }
  return true;
}

// ─── Segment Updating ──────────────────────────────────────────────────────

interface SegmentUpdatePayload {
  audioPath?: string;
  presenterVideoPath?: string;
  startTime?: number;
  endTime?: number;
  personaAvatarUrl?: string;
  generatedAvatarKey?: string;
  personaImagePrompt?: string;
}

/** Update segment in the main app */
export async function updateSegment(
  jobId: string,
  segmentId: string,
  payload: SegmentUpdatePayload
): Promise<boolean> {
  const res = await request("POST", `/api/pipeline/jobs/${jobId}/segments/${segmentId}`, payload);
  if (!res.ok) {
    console.error(`⚠️  Segment update failed (${res.status}):`, res.data);
    return false;
  }
  return true;
}

// ─── 3D Turntable Asset Updating ───────────────────────────────────────────

export interface Product3DAssetUpdatePayload {
  status?: "PENDING" | "RECONSTRUCTING" | "RENDERING" | "READY" | "FAILED";
  engine?: string;
  meshKey?: string | null;
  previewKey?: string | null;
  turntableKey?: string | null;
  turntableMp4Key?: string | null;
  contactSheetKey?: string | null;
  textureSize?: string | null;
  errorLog?: string | null;
  generationJobId?: string | null;
  serverJobId?: string | null;
  inferenceMs?: number | null;
  bgRemovalMs?: number | null;
  vertexCount?: number | null;
  faceCount?: number | null;
  vramPeakGb?: number | null;
}

/** Update a Product3DAsset record in the main app (worker-authenticated). */
export async function updateProduct3DAsset(
  assetId: string,
  payload: Product3DAssetUpdatePayload
): Promise<boolean> {
  const res = await request(
    "PATCH",
    `/api/ecommerce/turntable-3d/${encodeURIComponent(assetId)}/worker-update`,
    payload
  );
  if (!res.ok) {
    console.error(`⚠️  3D asset update failed (${res.status}):`, res.data);
    return false;
  }
  return true;
}

// ─── Heartbeat ─────────────────────────────────────────────────────────────

interface HeartbeatPayload {
  workerId: string;
  hostname: string;
  type: string;
  status: string;
  currentJobId?: string;
  currentStep?: string;
  gpuMemoryUsedMB?: number;
  gpuMemoryTotalMB?: number;
  processMemoryMB?: number;
  heapUsedMB?: number;
}

/** Send periodic heartbeat to the main app */
export async function sendHeartbeat(payload: HeartbeatPayload): Promise<void> {
  try {
    await request("POST", "/api/pipeline/heartbeat", payload);
  } catch {
    // Heartbeat failures are non-fatal — just log and continue
    console.warn("⚠️  Heartbeat failed — main app may be unreachable");
  }
}

// ─── Render Trigger & Polling ──────────────────────────────────────────────

export async function triggerRender(videoId: string): Promise<boolean> {
  const res = await request("POST", `/api/render/${videoId}`);
  if (!res.ok) {
    console.error(`⚠️  Trigger render failed (${res.status}):`, res.data);
    return false;
  }
  return true;
}

export interface RenderStatusResponse {
  id: string;
  status: string;
  outputPath?: string | null;
  duration?: number | null;
}

export async function pollRender(videoId: string): Promise<RenderStatusResponse | null> {
  const res = await request<RenderStatusResponse>("GET", `/api/render/${videoId}`);
  if (!res.ok) {
    console.error(`⚠️  Poll render failed (${res.status}):`, res.data);
    return null;
  }
  return res.data;
}

// ─── Render Data ─────────────────────────────────────────────────────────

export interface RenderDataResponse {
  videoId: string;
  storyId: string;
  companyId: string;
  aspectRatio: "horizontal" | "vertical";
  compositionId: string;
  inputProps: Record<string, unknown>;
}

/** Fetch data needed for Remotion rendering */
export async function getRenderData(jobId: string): Promise<RenderDataResponse> {
  const res = await request<RenderDataResponse>(
    "GET",
    `/api/pipeline/jobs/${jobId}/render-data`
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch render data: ${JSON.stringify(res.data)}`);
  }
  return res.data;
}

/** Trigger auto-publish for a completed render */
export async function triggerAutoPublish(jobId: string): Promise<{ success: boolean; publishedCount: number }> {
  const res = await request<{ success: boolean; publishedCount: number }>(
    "POST",
    `/api/pipeline/jobs/${jobId}/auto-publish`
  );
  if (!res.ok) {
    console.error(`⚠️ Auto-publish failed (${res.status}):`, res.data);
    return { success: false, publishedCount: 0 };
  }
  return res.data;
}

// ─── Cloud-to-Worker LLM Broker Client ────────────────────────────────────

/** Claim the oldest pending LLM task from the cloud app's in-memory broker */
export async function claimLlmTask(
  workerId: string
): Promise<LlmBrokerClaimedTask | null> {
  const res = await request<{ task?: LlmBrokerClaimedTask | null }>(
    "POST",
    `/api/pipeline/llm-tasks/claim`,
    { workerId }
  );
  if (!res.ok) {
    return null;
  }
  return res.data?.task ?? null;
}

/** Post the completed (or failed) local LLM result back to the cloud broker */
export async function completeLlmTask(
  taskId: string,
  payload: LlmBrokerCompletePayload
): Promise<boolean> {
  const res = await request<{ completed?: boolean }>(
    "POST",
    `/api/pipeline/llm-tasks/${encodeURIComponent(taskId)}/complete`,
    payload
  );
  return res.ok && Boolean(res.data?.completed);
}

/** Trigger a due automation schedule when Supabase PostgREST detects nextRunAt <= now */
export async function triggerScheduledRun(scheduleId: string): Promise<boolean> {
  const res = await request<{ success?: boolean }>(
    "POST",
    `/api/admin/schedules/${encodeURIComponent(scheduleId)}`
  );
  return res.ok && Boolean(res.data?.success);
}

// ─── Cloud-to-Worker TTS Preview Broker Client ────────────────────────────

/** Claim the oldest pending TTS voice preview task from the cloud broker */
export async function claimTtsPreviewTask(
  workerId: string
): Promise<TtsPreviewBrokerClaimedTask | null> {
  const res = await request<{ task?: TtsPreviewBrokerClaimedTask | null }>(
    "POST",
    `/api/pipeline/tts-preview/claim`,
    { workerId }
  );
  if (!res.ok) {
    return null;
  }
  return res.data?.task ?? null;
}

/** Post the completed (or failed) base64 WAV audio back to the cloud broker */
export async function completeTtsPreviewTask(
  taskId: string,
  payload: TtsPreviewBrokerCompletePayload
): Promise<boolean> {
  const res = await request<{ completed?: boolean }>(
    "POST",
    `/api/pipeline/tts-preview/${encodeURIComponent(taskId)}/complete`,
    payload
  );
  return res.ok && Boolean(res.data?.completed);
}
