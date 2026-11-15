import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { checkObject3DHealth } from "@/lib/ai/object3dClient";
import { checkRedisHealth } from "@/lib/cache/redisClient";

export { checkRedisHealth };

export interface ServiceStatus {
  status: "online" | "offline" | "unconfigured";
  latencyMs?: number;
  error?: string;
}

/** Object3D-Server (3D Product Turntable, port 8020) — adds GPU/queue details to ServiceStatus. */
export interface Object3DServiceStatus extends ServiceStatus {
  loadedEngine?: string | null;
  vramUsedGb?: number | null;
  vramTotalGb?: number | null;
  gpuName?: string | null;
  queueDepth?: number;
}

export interface ProcessMemoryHealth {
  heapUsedMB: number;
  heapTotalMB: number;
  rssMB: number;
  gcAvailable: boolean;
}

export interface AggregatedHealth {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  memory: ProcessMemoryHealth;
  services: {
    database: ServiceStatus;
    storage: ServiceStatus;
    ollama: ServiceStatus;
    tts: ServiceStatus;
    comfyui: ServiceStatus;
    musetalk?: ServiceStatus;
    liveportrait?: ServiceStatus;
    keysync?: ServiceStatus;
    sadtalker: ServiceStatus;
    modernmotion?: ServiceStatus;
    moderntalkinghead?: ServiceStatus;
    object3d?: Object3DServiceStatus;
    veo?: ServiceStatus;
    redis?: ServiceStatus;
  };
  workers: Record<string, { onlineCount: number; hasFailedJobs: boolean }>;
}

export function checkMemoryHealth(): ProcessMemoryHealth {
  const mem = process.memoryUsage();
  return {
    heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
    heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
    rssMB: Math.round(mem.rss / 1024 / 1024),
    gcAvailable: typeof global.gc === "function",
  };
}

async function measureLatency<T>(fn: () => Promise<T>): Promise<{ result: T; latency: number }> {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  return { result, latency: Math.round(end - start) };
}

/**
 * Returns true when running in cloud web mode (non-worker production or R2 storage)
 * and the engine URL is unset or points to container-local loopback (localhost/127.0.0.1).
 * Preserves existing test behavior when NODE_ENV === "test".
 */
export function isUnconfiguredLocalEngineInCloud(envUrl: string | undefined): boolean {
  if (process.env.NODE_ENV === "test") return false;
  const inCloudWebMode =
    (process.env.NODE_ENV === "production" || process.env.STORAGE_PROVIDER === "r2") &&
    process.env.IS_PIPELINE_WORKER !== "true";
  if (!inCloudWebMode) return false;

  const trimmed = envUrl?.trim();
  if (!trimmed) return true;

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host === "[::1]" ||
      host === "0.0.0.0"
    );
  } catch {
    const lower = trimmed.toLowerCase();
    return lower.includes("localhost") || lower.includes("127.0.0.1") || lower.includes("::1");
  }
}

async function probeEngineHealth(
  envUrl: string | undefined,
  defaultUrl: string
): Promise<ServiceStatus> {
  if (isUnconfiguredLocalEngineInCloud(envUrl)) {
    return { status: "unconfigured" };
  }
  const url = envUrl || defaultUrl;
  try {
    const { latency } = await measureLatency(async () => {
      const res = await fetch(`${url}/health`, {
        signal: AbortSignal.timeout(1500),
      }).catch(async () => {
        return await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(1500) });
      });
      if (!res.ok && res.status !== 404) throw new Error(`HTTP ${res.status}`);
    });
    return { status: "online", latencyMs: latency };
  } catch (error) {
    return { status: "offline", error: String(error) };
  }
}

export async function checkDatabaseHealth(): Promise<ServiceStatus> {
  try {
    const { latency } = await measureLatency(async () => {
      // Direct raw query with timeout guard
      await Promise.race([
        prisma.$queryRaw`SELECT 1`,
        new Promise((_, reject) => setTimeout(() => reject(new Error("DB health timeout")), 1500)),
      ]);
    });
    return { status: "online", latencyMs: latency };
  } catch (error) {
    return { status: "offline", error: String(error) };
  }
}

export async function checkStorageHealth(): Promise<ServiceStatus> {
  try {
    const { latency } = await measureLatency(async () => {
      await Promise.race([
        storage.exists("__healthcheck__"),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Storage health timeout")), 1500)),
      ]);
    });
    return { status: "online", latencyMs: latency };
  } catch (error) {
    return { status: "offline", error: String(error) };
  }
}

export async function checkOllamaHealth(): Promise<ServiceStatus> {
  if (process.env.LLM_PROVIDER && process.env.LLM_PROVIDER !== "ollama") {
    return { status: "unconfigured" };
  }
  if (isUnconfiguredLocalEngineInCloud(process.env.OLLAMA_BASE_URL)) {
    return { status: "unconfigured" };
  }
  const url = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  try {
    const { latency } = await measureLatency(async () => {
      const res = await fetch(`${url}/api/tags`, {
        signal: AbortSignal.timeout(1500),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    });
    return { status: "online", latencyMs: latency };
  } catch (error) {
    return { status: "offline", error: String(error) };
  }
}

export async function checkTTSHealth(): Promise<ServiceStatus> {
  if (process.env.NEXT_PUBLIC_TTS_MODE && process.env.NEXT_PUBLIC_TTS_MODE !== "server") {
    return { status: "unconfigured" };
  }
  const envUrl = process.env.MODERN_TTS_SERVER_URL || process.env.NEXT_PUBLIC_MODERN_TTS_SERVER_URL;
  if (isUnconfiguredLocalEngineInCloud(envUrl)) {
    return { status: "unconfigured" };
  }
  const modernUrl = envUrl || "http://localhost:8005";

  try {
    const { latency } = await measureLatency(async () => {
      // Probe Modern-TTS-Server (Port 8005)
      const res = await fetch(`${modernUrl}/api/health`, {
        signal: AbortSignal.timeout(1500),
      }).catch(async () => {
        return await fetch(`${modernUrl}/health`, { signal: AbortSignal.timeout(1500) });
      });
      if (!res.ok && res.status !== 404) throw new Error(`HTTP ${res.status}`);
    });
    return { status: "online", latencyMs: latency };
  } catch (error) {
    return { status: "offline", error: String(error) };
  }
}

export async function checkComfyUIHealth(): Promise<ServiceStatus> {
  if (process.env.DISABLE_COMFYUI === "true") {
    return { status: "unconfigured" };
  }
  if (isUnconfiguredLocalEngineInCloud(process.env.COMFYUI_URL)) {
    return { status: "unconfigured" };
  }
  const url = process.env.COMFYUI_URL || "http://localhost:8188";
  try {
    const { latency } = await measureLatency(async () => {
      const res = await fetch(`${url}/system_stats`, {
        signal: AbortSignal.timeout(1500),
      }).catch(async () => {
        return await fetch(url, { signal: AbortSignal.timeout(1500) });
      });
      if (!res.ok && res.status !== 404) throw new Error(`HTTP ${res.status}`);
    });
    return { status: "online", latencyMs: latency };
  } catch (error) {
    if (!process.env.COMFYUI_URL) {
      return { status: "unconfigured" };
    }
    return { status: "offline", error: String(error) };
  }
}

export async function checkSadTalkerHealth(): Promise<ServiceStatus> {
  if (!process.env.SADTALKER_SERVER_URL || isUnconfiguredLocalEngineInCloud(process.env.SADTALKER_SERVER_URL)) {
    return { status: "unconfigured" };
  }
  const url = process.env.SADTALKER_SERVER_URL;
  try {
    const { latency } = await measureLatency(async () => {
      const res = await fetch(`${url}/docs`, {
        signal: AbortSignal.timeout(1500),
      });
      if (!res.ok && res.status !== 404) throw new Error(`HTTP ${res.status}`);
    });
    return { status: "online", latencyMs: latency };
  } catch (error) {
    return { status: "offline", error: String(error) };
  }
}

export async function checkMuseTalkHealth(): Promise<ServiceStatus> {
  return probeEngineHealth(
    process.env.TALKINGHEAD_SERVER_URL || process.env.MUSETALK_SERVER_URL,
    "http://localhost:8010"
  );
}

export async function checkKeySyncHealth(): Promise<ServiceStatus> {
  return probeEngineHealth(process.env.KEYSYNC_SERVER_URL, "http://localhost:8008");
}

export async function checkLivePortraitHealth(): Promise<ServiceStatus> {
  return probeEngineHealth(process.env.LIVEPORTRAIT_SERVER_URL, "http://localhost:8009");
}

export async function checkModernMotionServerHealth(): Promise<ServiceStatus> {
  return probeEngineHealth(process.env.MODERN_MOTION_SERVER_URL, "http://localhost:8011");
}

export async function checkModernTalkingHeadServerHealth(): Promise<ServiceStatus> {
  return probeEngineHealth(process.env.MODERN_TALKINGHEAD_SERVER_URL, "http://localhost:8010");
}

export async function checkObject3DServerHealth(): Promise<Object3DServiceStatus> {
  if (isUnconfiguredLocalEngineInCloud(process.env.OBJECT3D_SERVER_URL)) {
    return { status: "unconfigured" };
  }
  const result = await checkObject3DHealth({ timeoutMs: 1500 });
  if (!result.online) {
    return { status: "offline", latencyMs: result.latencyMs, error: result.error };
  }
  const h = result.health;
  return {
    status: "online",
    latencyMs: result.latencyMs,
    loadedEngine: h?.loaded_engine ?? null,
    vramUsedGb: h?.vram_used_gb ?? null,
    vramTotalGb: h?.vram_total_gb ?? null,
    gpuName: h?.gpu_name ?? null,
    queueDepth: h?.queue_depth ?? 0,
  };
}

export async function checkVeoHealth(): Promise<ServiceStatus> {
  const configured = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
  if (!configured) {
    return { status: "unconfigured" };
  }
  return { status: "online", latencyMs: 1 };
}

export async function checkWorkersHealth(): Promise<Record<string, { onlineCount: number; hasFailedJobs: boolean }>> {
  try {
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
    const onlineWorkers = await prisma.worker.findMany({
      where: { lastSeenAt: { gte: fiveMinsAgo } },
      select: { type: true }
    });

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const failedJobs = await prisma.generationJob.findMany({
      where: {
        status: "FAILED",
        updatedAt: { gte: twentyFourHoursAgo },
      },
      select: { type: true },
    });

    const failedTypes = new Set(failedJobs.map((j) => j.type));
    
    // We only care about main types for the dashboard unless there are others online
    const mainTypes = ["audio", "video_full", "video_bubble", "render", "full", "veo", "minimax"];
    const allTypes = Array.from(new Set([...mainTypes, ...onlineWorkers.map(w => w.type), ...failedTypes]));

    const workerHealth: Record<string, { onlineCount: number; hasFailedJobs: boolean }> = {};
    for (const type of allTypes) {
      workerHealth[type] = {
        onlineCount: onlineWorkers.filter(w => w.type === type).length,
        hasFailedJobs: failedTypes.has(type),
      };
    }
    return workerHealth;
  } catch (e) {
    console.error("[checkWorkersHealth] Error:", e);
    return {};
  }
}

export async function getAggregatedSystemHealth(): Promise<AggregatedHealth> {
  const defaultOfflineService: ServiceStatus = { status: "offline", error: "Check timed out" };
  const allProbesPromise = Promise.all([
    checkDatabaseHealth(),
    checkStorageHealth(),
    checkOllamaHealth(),
    checkTTSHealth(),
    checkComfyUIHealth(),
    checkMuseTalkHealth(),
    checkLivePortraitHealth(),
    checkKeySyncHealth(),
    checkSadTalkerHealth(),
    checkModernMotionServerHealth(),
    checkModernTalkingHeadServerHealth(),
    checkObject3DServerHealth(),
    checkVeoHealth(),
    checkWorkersHealth(),
    checkRedisHealth(),
  ]);

  const timeoutPromise = new Promise<[
    ServiceStatus, ServiceStatus, ServiceStatus, ServiceStatus, ServiceStatus,
    ServiceStatus, ServiceStatus, ServiceStatus, ServiceStatus, ServiceStatus,
    ServiceStatus, ServiceStatus, ServiceStatus, Record<string, { onlineCount: number; hasFailedJobs: boolean }>,
    ServiceStatus
  ]>((resolve) =>
    setTimeout(
      () =>
        resolve([
          defaultOfflineService, defaultOfflineService, defaultOfflineService, defaultOfflineService,
          defaultOfflineService, defaultOfflineService, defaultOfflineService, defaultOfflineService,
          defaultOfflineService, defaultOfflineService, defaultOfflineService, defaultOfflineService,
          defaultOfflineService, {},
          defaultOfflineService,
        ]),
      2000
    )
  );

  const [db, storage, ollama, tts, comfyui, musetalk, liveportrait, keysync, sadtalker, modernmotion, moderntalkinghead, object3d, veo, workers, redis] =
    await Promise.race([allProbesPromise, timeoutPromise]);

  // Determine overall status
  const essentialOnline = db.status === "online" && storage.status === "online";
  const allOnline = essentialOnline && 
    (ollama.status === "online" || ollama.status === "unconfigured") && 
    (tts.status === "online" || tts.status === "unconfigured") && 
    (comfyui.status === "online" || comfyui.status === "unconfigured") &&
    (musetalk.status === "online" || musetalk.status === "unconfigured") &&
    (liveportrait.status === "online" || liveportrait.status === "unconfigured") &&
    (keysync.status === "online" || keysync.status === "unconfigured") &&
    (sadtalker.status === "online" || sadtalker.status === "unconfigured") &&
    (veo.status === "online" || veo.status === "unconfigured") &&
    (redis.status === "online" || redis.status === "unconfigured");

  let status: AggregatedHealth["status"] = "healthy";
  if (!essentialOnline) {
    status = "unhealthy";
  } else if (!allOnline) {
    status = "degraded";
  }

  return {
    status,
    timestamp: new Date().toISOString(),
    memory: checkMemoryHealth(),
    services: {
      database: db,
      storage: storage,
      ollama: ollama,
      tts: tts,
      comfyui: comfyui,
      musetalk: musetalk,
      liveportrait: liveportrait,
      keysync: keysync,
      sadtalker: sadtalker,
      modernmotion: modernmotion,
      moderntalkinghead: moderntalkinghead,
      object3d: object3d,
      veo: veo,
      redis: redis,
    },
    workers,
  };
}
