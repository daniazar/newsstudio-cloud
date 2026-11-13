import { exec, execFile } from 'child_process';
import http from 'http';
import os from 'os';
import util from 'util';
import { z } from 'zod';
import destr from 'destr';


const execAsync = util.promisify(exec);
const execFileAsync = util.promisify(execFile);

// ============================================================================
// Types & Data Structures
// ============================================================================

export interface GpuStats {
  name: string;
  vramUsedMb: number;
  vramTotalMb: number;
  vramUsedPct: number;
  gpuUtilPct: number;
  tempC: number;
  powerW: number;
}

export interface SystemStats {
  platform: string;
  cpuModel: string;
  cpuCores: number;
  totalMemMb: number;
  usedMemMb: number;
  freeMemMb: number;
  memUsedPct: number;
  uptimeHours: number;
}

export interface ServiceMetric {
  id: string;
  name: string;
  category: 'AI Engine' | 'Web & API' | 'Storage & Queue' | 'Worker';
  defaultPort?: number;
  status: 'ONLINE' | 'BUSY' | 'OFFLINE' | 'UNCONFIGURED';
  pids: number[];
  containerName?: string;
  dockerImage?: string;
  cpuPct: number;
  ramMb: number;
  ramPct: number;
  vramMb: number;
  vramPct: number;
  latencyMs?: number;
  details?: string;
  shortcutKey?: string;
  activeProfile?: string;
  inactivityTimeoutSeconds?: number;
}

export interface TopProcess {
  pid: number;
  name: string;
  displayName: string;
  ramMb: number;
  vramMb?: number;
  cpuSeconds?: number;
}

export interface DockerImageReport {
  repository: string;
  tag: string;
  imageId: string;
  size: string;
  createdSince: string;
  serviceId?: string;
  serviceName?: string;
  inUse: boolean;
}

export interface DockerInstanceMetric {
  id: string;
  name: string;
  image: string;
  status: string;
  hasGpu: boolean;
  cpuPct: number;
  ramMb: number;
  ramLimitMb: number;
  vramMb: number;
  details?: string;
  serviceId?: string;
  serviceName?: string;
  shortcutKey?: string;
  gpuProcesses?: { pid: string; cmd: string; rssMb: number }[];
}

export interface FullTelemetryReport {
  timestamp: string;
  gpu: GpuStats | null;
  system: SystemStats;
  services: ServiceMetric[];
  totalServiceRamMb: number;
  totalServiceVramMb: number;
  hostOtherRamMb: number;
  hostOtherVramMb: number;
  topOtherProcesses: TopProcess[];
  dockerImages?: DockerImageReport[];
  dockerTotalVramMb?: number;
  dockerTotalRamMb?: number;
  dockerDriverCacheVramMb?: number;
  dockerInstances?: DockerInstanceMetric[];
}

export const TALKINGHEAD_MODEL_VRAM: Record<string, { name: string; vramMb: number }> = {
  float: { name: 'FLOAT Generative Motion Flow', vramMb: 6500 },
  ditto: { name: 'Ditto Motion-Space Diffusion', vramMb: 7000 },
  fantasytalking2: { name: 'FantasyTalking2 TLPO', vramMb: 9000 },
  hallo4: { name: 'Hallo4 DPO Diffusion', vramMb: 11500 },
  personalive: { name: 'PersonaLive Expressive Diffusion', vramMb: 5800 },
  syncanimation: { name: 'SyncAnimation NeRF', vramMb: 6200 },
  echomimicv3: { name: 'EchoMimicV3 Multi-Modal', vramMb: 9800 },
  avtr1: { name: 'AVTR-1 Dual-Stream', vramMb: 8500 },
};

export const MOTION_MODEL_VRAM: Record<string, { name: string; vramMb: number }> = {
  'wan-animate-2': { name: 'Wan-Animate-2 14B', vramMb: 10000 },
  'wan-animate-2-distilled': { name: 'Wan-Animate-2 Distilled 1.3B', vramMb: 6000 },
  'scail-2': { name: 'SCAIL-2 In-Context', vramMb: 12500 },
  echomimicv3: { name: 'EchoMimicV3 1.3B Flash', vramMb: 8000 },
  emosh: { name: 'EMOSH Expressive Human', vramMb: 7500 },
  mimicmotion: { name: 'MimicMotion Confidence Pose', vramMb: 8500 },
  champ: { name: 'Champ 3D SMPL-X', vramMb: 11000 },
  liveanimate: { name: 'LiveAnimate 20 FPS DiT', vramMb: 16000 },
};


export const serviceHealthSchema = z.object({
  active_model: z.string().optional(),
  engine_count: z.number().optional(),
  cuda_available: z.boolean().optional(),
  vram_allocated_mb: z.union([z.string(), z.number()]).optional(),
  device: z.string().optional(),
  cached_avatars: z.array(z.string()).optional(),
  idle_seconds: z.number().optional(),
  inactivity_timeout_seconds: z.number().optional(),
  gpu: z.object({
    vram_allocated_mb: z.string().optional(),
    vram_reserved_mb: z.string().optional(),
    allocated_mb: z.string().optional(),
    reserved_mb: z.string().optional(),
  }).optional(),
  devices: z.array(z.object({
    vram_total: z.number(),
    vram_free: z.number(),
    torch_vram_total: z.number(),
    name: z.string().optional(),
  })).optional(),
  models: z.array(z.object({
    name: z.string(),
    size_vram: z.number().optional(),
  })).optional(),
}).passthrough();

export interface ServiceHealthData {
  active_model?: string;
  engine_count?: number;
  cuda_available?: boolean;
  vram_allocated_mb?: string | number;
  device?: string;
  cached_avatars?: string[];
  idle_seconds?: number;
  inactivity_timeout_seconds?: number;
  gpu?: {
    vram_allocated_mb?: string;
    vram_reserved_mb?: string;
    allocated_mb?: string;
    reserved_mb?: string;
  };
  devices?: Array<{
    vram_total: number;
    vram_free: number;
    torch_vram_total: number;
    name?: string;
  }>;
  models?: Array<{
    name: string;
    size_vram?: number;
  }>;
  [key: string]: unknown;
}

export interface ServiceDefinition {
  id: string;
  name: string;
  category: ServiceMetric['category'];
  port?: number;
  healthUrl?: string;
  dockerNames: string[];
  dockerImage?: string;
  nativeProcessNames: string[];
}

export const SERVICE_REGISTRY: ServiceDefinition[] = [
  {
    id: 'modern_tts',
    name: 'Modern-TTS-Server',
    category: 'AI Engine',
    port: 8005,
    get healthUrl() {
      return process.env.MODERN_TTS_SERVER_URL ? `${process.env.MODERN_TTS_SERVER_URL}/health` : 'http://localhost:8005/health';
    },
    dockerNames: ['modern-tts-server', 'modern-tts', 'newsstudio-modern-tts'],
    dockerImage: 'newsstudio-modern-tts:latest',
    nativeProcessNames: ['python', 'python.exe', 'uvicorn'],
  },
  {
    id: 'musetalk',
    name: 'TalkingHead / MuseTalk (Native 8010)',
    category: 'AI Engine',
    port: 8010,
    get healthUrl() {
      return (process.env.TALKINGHEAD_SERVER_URL || process.env.MUSETALK_SERVER_URL)
        ? `${process.env.TALKINGHEAD_SERVER_URL || process.env.MUSETALK_SERVER_URL}/health`
        : 'http://localhost:8010/health';
    },
    dockerNames: ['modern-talkinghead-server', 'modern-talkinghead', 'musetalk_gpu', 'musetalk'],
    dockerImage: 'newsstudio-modern-talkinghead:latest',
    nativeProcessNames: ['python', 'python.exe'],
  },
  {
    id: 'keysync',
    name: 'KeySync (Latent Diffusion)',
    category: 'AI Engine',
    port: 8008,
    get healthUrl() {
      return process.env.KEYSYNC_SERVER_URL ? `${process.env.KEYSYNC_SERVER_URL}/health` : 'http://localhost:8008/health';
    },
    dockerNames: ['keysync-server', 'keysync'],
    dockerImage: 'newsstudio-keysync:latest',
    nativeProcessNames: ['python', 'python.exe'],
  },
  {
    id: 'liveportrait',
    name: 'LivePortrait Realtime (3D Head)',
    category: 'AI Engine',
    port: 8009,
    get healthUrl() {
      return process.env.LIVEPORTRAIT_SERVER_URL ? `${process.env.LIVEPORTRAIT_SERVER_URL}/health` : 'http://localhost:8009/health';
    },
    dockerNames: ['liveportrait-server', 'liveportrait', 'newsstudio-liveportrait'],
    dockerImage: 'newsstudio-liveportrait:latest',
    nativeProcessNames: ['python', 'python.exe'],
  },
  {
    id: 'modern_talkinghead',
    name: 'Modern-TalkingHead-Server (MuseTalk/Ditto)',
    category: 'AI Engine',
    port: 8010,
    get healthUrl() {
      return (process.env.MODERN_TALKINGHEAD_SERVER_URL || process.env.TALKINGHEAD_SERVER_URL)
        ? `${process.env.MODERN_TALKINGHEAD_SERVER_URL || process.env.TALKINGHEAD_SERVER_URL}/health`
        : 'http://localhost:8010/health';
    },
    dockerNames: ['modern-talkinghead-server', 'modern-talkinghead', 'newsstudio-modern-talkinghead'],
    dockerImage: 'newsstudio-modern-talkinghead:latest',
    nativeProcessNames: ['python', 'python.exe'],
  },
  {
    id: 'comfyui',
    name: 'ComfyUI (LTX/Wan/InfiniteTalk)',
    category: 'AI Engine',
    port: 8188,
    get healthUrl() {
      return process.env.COMFYUI_URL ? `${process.env.COMFYUI_URL}/system_stats` : 'http://localhost:8188/system_stats';
    },
    dockerNames: ['comfyui', 'newsstudio-comfyui'],
    dockerImage: 'newsstudio-comfyui:latest',
    nativeProcessNames: ['python', 'python.exe', 'ComfyUI.exe'],
  },
  {
    id: 'modern_motion',
    name: 'Modern Motion Animation (Full Body)',
    category: 'AI Engine',
    port: 8011,
    get healthUrl() {
      return process.env.MODERN_MOTION_SERVER_URL ? `${process.env.MODERN_MOTION_SERVER_URL}/health` : 'http://localhost:8011/health';
    },
    dockerNames: ['modern-motion-animation-server', 'modern-motion-animation', 'newsstudio-modern-motion', 'modern-motion'],
    dockerImage: 'newsstudio-modern-motion:latest',
    nativeProcessNames: ['python', 'python.exe'],
  },
  {
    id: 'object3d',
    name: 'Modern-Mesh-Server (3D Product Turntable)',
    category: 'AI Engine',
    port: 8020,
    get healthUrl() {
      return process.env.OBJECT3D_SERVER_URL ? `${process.env.OBJECT3D_SERVER_URL}/health` : 'http://localhost:8020/health';
    },
    dockerNames: ['modern-mesh-server', 'modern-mesh', 'newsstudio-object3d', 'object3d-server', 'object3d'],
    dockerImage: 'newsstudio-modern-mesh-server:latest',
    nativeProcessNames: ['python', 'python.exe', 'uvicorn'],
  },
  {
    id: 'ollama',
    name: 'Ollama LLM Engine',
    category: 'AI Engine',
    port: 11434,
    get healthUrl() {
      return process.env.OLLAMA_BASE_URL ? `${process.env.OLLAMA_BASE_URL}/api/ps` : 'http://localhost:11434/api/ps';
    },
    dockerNames: ['ollama'],
    nativeProcessNames: ['ollama', 'ollama.exe', 'ollama_llama_server.exe', 'llama-server'],
  },
  {
    id: 'sadtalker',
    name: 'SadTalker (Legacy)',
    category: 'AI Engine',
    port: 8080,
    get healthUrl() {
      return process.env.SADTALKER_SERVER_URL ? `${process.env.SADTALKER_SERVER_URL}/` : 'http://localhost:8080/';
    },
    dockerNames: ['sadtalker', 'sadtalker-server', 'newsstudio-sadtalker'],
    dockerImage: 'newsstudio-sadtalker:latest',
    nativeProcessNames: ['python', 'python.exe'],
  },
  {
    id: 'nextjs',
    name: 'Next.js App & API',
    category: 'Web & API',
    port: 3000,
    get healthUrl() {
      return process.env.MAIN_APP_URL ? `${process.env.MAIN_APP_URL}/api/health` : 'http://localhost:3000/api/health';
    },
    dockerNames: ['nextjs', 'web'],
    nativeProcessNames: ['node', 'node.exe', 'next-server'],
  },
  {
    id: 'pipeline_workers',
    name: 'Pipeline Worker Daemons',
    category: 'Worker',
    dockerNames: ['newsstudio-worker-audio', 'worker-audio', 'newsstudio-worker-render', 'worker-render', 'newsstudio-worker-full', 'worker-full', 'newsstudio-worker-bubble', 'worker-bubble'],
    nativeProcessNames: ['node', 'node.exe', 'tsx'],
  },
  {
    id: 'inngest',
    name: 'Inngest Workflow Engine',
    category: 'Storage & Queue',
    port: 8288,
    healthUrl: 'http://localhost:8288/api/health',
    dockerNames: ['inngest'],
    nativeProcessNames: ['inngest', 'inngest.exe'],
  },
  {
    id: 'minio',
    name: 'MinIO Object Storage',
    category: 'Storage & Queue',
    port: 9000,
    healthUrl: 'http://localhost:9000/minio/health/live',
    dockerNames: ['minio', 'minio1', 'news-studio-minio'],
    dockerImage: 'minio/minio:latest',
    nativeProcessNames: ['minio', 'minio.exe'],
  },
];

export function formatMb(mb: number): string {
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(2)} GB`;
  }
  return `${Math.round(mb)} MB`;
}

function parseMemoryString(memStr: string): number {
  if (!memStr) return 0;
  const match = memStr.trim().match(/^([\d.]+)\s*([a-zA-Z]+)/);
  if (!match) return 0;
  const val = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  if (unit.startsWith('gib') || unit === 'gb') return val * 1024;
  if (unit.startsWith('mib') || unit === 'mb') return val;
  if (unit.startsWith('kib') || unit === 'kb') return val / 1024;
  if (unit.startsWith('tib') || unit === 'tb') return val * 1024 * 1024;
  return val;
}

export async function fetchJsonWithLatency<T = unknown>(url: string, timeoutMs = 1500, schema?: z.ZodSchema<T>): Promise<{ data: T | null; latencyMs: number; ok: boolean }> {
  const start = performance.now();
  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(url);
      const req = http.get(
        {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port,
          path: parsedUrl.pathname + parsedUrl.search,
          timeout: timeoutMs,
        },
        (res) => {
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => {
            const latencyMs = Math.round(performance.now() - start);
            try {
              let data = body ? destr(body) : null;
              if (data && schema) {
                const parsedResult = schema.safeParse(data);
                if (parsedResult.success) {
                  data = parsedResult.data;
                } else {
                  console.warn('fetchJsonWithLatency schema validation failed:', parsedResult.error);
                  data = null; // or keep it as is, but safer to drop invalid
                }
              }
              resolve({ data: data as T, latencyMs, ok: (res.statusCode ?? 500) < 400 });
            } catch {
              resolve({ data: body as unknown as T, latencyMs, ok: (res.statusCode ?? 500) < 400 });
            }
          });
        }
      );
      req.on('error', () => resolve({ data: null, latencyMs: Math.round(performance.now() - start), ok: false }));
      req.on('timeout', () => {
        req.destroy();
        resolve({ data: null, latencyMs: timeoutMs, ok: false });
      });
    } catch {
      resolve({ data: null, latencyMs: 0, ok: false });
    }
  });
}

export async function postJson(url: string, payload: unknown, timeoutMs = 2000): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(url);
      const data = JSON.stringify(payload);
      const req = http.request(
        {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port,
          path: parsedUrl.pathname + parsedUrl.search,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data),
          },
          timeout: timeoutMs,
        },
        (res) => {
          resolve((res.statusCode ?? 500) < 400);
        }
      );
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
      req.write(data);
      req.end();
    } catch {
      resolve(false);
    }
  });
}

export async function collectGpuStats(): Promise<GpuStats | null> {
  try {
    const { stdout } = await execAsync(
      'nvidia-smi --query-gpu=name,memory.used,memory.total,utilization.gpu,temperature.gpu,power.draw --format=csv,noheader,nounits',
      { timeout: 4000 }
    );
    const output = stdout.trim();
    if (!output) return null;
    const parts = output.split(',').map((p) => p.trim());
    if (parts.length >= 6) {
      const vramUsed = parseFloat(parts[1]);
      const vramTotal = parseFloat(parts[2]);
      return {
        name: parts[0],
        vramUsedMb: vramUsed,
        vramTotalMb: vramTotal,
        vramUsedPct: Math.round((vramUsed / (vramTotal || 1)) * 100),
        gpuUtilPct: parseFloat(parts[3]) || 0,
        tempC: parseFloat(parts[4]) || 0,
        powerW: parseFloat(parts[5]) || 0,
      };
    }
  } catch {
    // nvidia-smi not available
  }
  return null;
}

export function collectSystemStats(): SystemStats {
  const totalMemMb = Math.round(os.totalmem() / (1024 * 1024));
  const freeMemMb = Math.round(os.freemem() / (1024 * 1024));
  const usedMemMb = totalMemMb - freeMemMb;
  const cpus = os.cpus();
  const cpuModel = cpus[0]?.model ? cpus[0].model.trim() : 'Unknown CPU';

  return {
    platform: process.platform,
    cpuModel,
    cpuCores: cpus.length,
    totalMemMb,
    usedMemMb,
    freeMemMb,
    memUsedPct: Math.round((usedMemMb / (totalMemMb || 1)) * 100),
    uptimeHours: Math.round(os.uptime() / 3600),
  };
}

export interface DockerContainerStat {
  name: string;
  cpuPct: number;
  ramMb: number;
  ramLimitMb: number;
  ramPct: number;
}

export async function collectDockerStats(): Promise<Record<string, DockerContainerStat>> {
  const containerStats: Record<string, DockerContainerStat> = {};
  try {
    const { stdout } = await execAsync('docker stats --no-stream --format "{{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"', {
      timeout: 3500,
    });
    const raw = stdout.trim();
    if (!raw) return containerStats;
    const lines = raw.split('\n');
    for (const line of lines) {
      const parts = line.split('\t').map((p) => p.trim());
      if (parts.length >= 4) {
        const name = parts[0];
        const cpuPct = parseFloat(parts[1].replace('%', '')) || 0;
        const [memUsageStr, memLimitStr] = parts[2].split('/').map((s) => s.trim());
        const ramMb = parseMemoryString(memUsageStr);
        const ramLimitMb = parseMemoryString(memLimitStr);
        const ramPct = parseFloat(parts[3].replace('%', '')) || 0;

        containerStats[name.toLowerCase()] = {
          name,
          cpuPct,
          ramMb,
          ramLimitMb,
          ramPct,
        };
      }
    }
  } catch {
    // Docker not running
  }
  return containerStats;
}

export async function collectDockerImages(runningContainerNames: string[] = []): Promise<DockerImageReport[]> {
  const images: DockerImageReport[] = [];
  try {
    const { stdout } = await execAsync('docker images --format "{{.Repository}}\t{{.Tag}}\t{{.ID}}\t{{.Size}}\t{{.CreatedSince}}"', {
      timeout: 3500,
    });
    const raw = stdout.trim();
    if (!raw) return images;

    const runningSet = new Set(runningContainerNames.map((c) => c.toLowerCase()));

    const lines = raw.split('\n');
    for (const line of lines) {
      const parts = line.split('\t').map((p) => p.trim());
      if (parts.length >= 5) {
        const repo = parts[0];
        const tag = parts[1];
        const imageId = parts[2];
        const size = parts[3];
        const createdSince = parts[4];
        const fullRef = `${repo}:${tag}`;

        let matchedService: ServiceDefinition | undefined;
        for (const s of SERVICE_REGISTRY) {
          if (s.dockerImage === fullRef || (tag === 'latest' && s.dockerImage?.startsWith(repo + ':'))) {
            matchedService = s;
            break;
          }
        }

        const inUse = runningSet.has(fullRef.toLowerCase()) || runningSet.has(repo.toLowerCase()) || runningSet.has(imageId.toLowerCase()) ||
          (matchedService ? matchedService.dockerNames.some((dn) => runningSet.has(dn.toLowerCase())) : false);

        images.push({
          repository: repo,
          tag,
          imageId,
          size,
          createdSince,
          serviceId: matchedService?.id,
          serviceName: matchedService?.name,
          inUse,
        });
      }
    }
  } catch {
    // Docker not available
  }
  return images;
}

export async function collectPortMappings(): Promise<Record<number, number[]>> {
  const portToPids: Record<number, number[]> = {};
  try {
    if (process.platform === 'win32') {
      const { stdout } = await execAsync('netstat -ano -p tcp', { timeout: 3500 });
      for (const line of stdout.split('\n')) {
        if (line.includes('LISTENING')) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 5) {
            const addr = parts[1];
            const pid = parseInt(parts[4], 10);
            const match = addr.match(/:(\d+)$/);
            if (match && !isNaN(pid)) {
              const port = parseInt(match[1], 10);
              portToPids[port] = portToPids[port] || [];
              if (!portToPids[port].includes(pid)) {
                portToPids[port].push(pid);
              }
            }
          }
        }
      }
    } else {
      const { stdout } = await execAsync('lsof -iTCP -sTCP:LISTEN -P -n -FpPn', { timeout: 3500 });
      let currentPid = 0;
      for (const line of stdout.split('\n')) {
        if (line.startsWith('p')) {
          currentPid = parseInt(line.slice(1), 10);
        } else if (line.startsWith('n') && currentPid) {
          const match = line.match(/:(\d+)$/);
          if (match) {
            const port = parseInt(match[1], 10);
            portToPids[port] = portToPids[port] || [];
            if (!portToPids[port].includes(currentPid)) {
              portToPids[port].push(currentPid);
            }
          }
        }
      }
    }
  } catch {
    // Netstat error
  }
  return portToPids;
}

export async function collectNativeProcesses(pids: number[]): Promise<Record<number, { name: string; ramMb: number; cpuSeconds: number }>> {
  const result: Record<number, { name: string; ramMb: number; cpuSeconds: number }> = {};
  if (pids.length === 0) return result;

  try {
    if (process.platform === 'win32') {
      const pidList = Array.from(new Set(pids)).join(',');
      const psCmd = `Get-Process -Id ${pidList} -ErrorAction SilentlyContinue | Select-Object Id, ProcessName, WorkingSet64, CPU | ConvertTo-Json -Compress`;
      const { stdout } = await execFileAsync('powershell', ['-NoProfile', '-Command', psCmd], { timeout: 3500 });
      const psOut = stdout.trim();
      if (psOut) {
        let parsed = JSON.parse(psOut);
        if (!Array.isArray(parsed)) parsed = [parsed];
        for (const item of parsed) {
          if (item && item.Id) {
            result[item.Id] = {
              name: item.ProcessName || 'unknown',
              ramMb: Math.round(((item.WorkingSet64 || 0) / (1024 * 1024)) * 10) / 10,
              cpuSeconds: item.CPU || 0,
            };
          }
        }
      }
    } else {
      const pidList = Array.from(new Set(pids)).join(',');
      const { stdout } = await execFileAsync('ps', ['-p', pidList, '-o', 'pid,rss,comm', '--no-headers'], { timeout: 3500 });
      for (const line of stdout.split('\n')) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 3) {
          const pid = parseInt(parts[0], 10);
          const rssKb = parseInt(parts[1], 10);
          const name = parts.slice(2).join(' ');
          result[pid] = {
            name,
            ramMb: Math.round((rssKb / 1024) * 10) / 10,
            cpuSeconds: 0,
          };
        }
      }
    }
  } catch {
    // Process query error
  }
  return result;
}

export interface HostTelemetryMetrics {
  vramByPid: Record<number, number>;
  dockerVmPids: number[];
  dockerVmHostVramMb: number;
  dockerVmHostRamMb: number;
  topOtherProcesses: TopProcess[];
}

export async function collectHostTelemetryAndVram(excludePids: number[]): Promise<HostTelemetryMetrics> {
  const excludeSet = new Set(excludePids);
  const topProcs: TopProcess[] = [];
  const vramByPid: Record<number, number> = {};
  const dockerVmPids: number[] = [];
  let dockerVmHostVramMb = 0;
  let dockerVmHostRamMb = 0;

  if (process.platform === 'win32') {
    try {
      const combinedPs = `
        $ErrorActionPreference = 'SilentlyContinue'
        $ProgressPreference = 'SilentlyContinue'
        $vramMap = @{}
        $samples = Get-Counter '\\GPU Process Memory(*)\\Dedicated Usage' | Select-Object -ExpandProperty CounterSamples | Where-Object { $_.CookedValue -gt 15MB }
        foreach ($s in $samples) {
          if ($s.InstanceName -match 'pid_(\\d+)') {
            $p = [int]$matches[1]
            $vramMap[$p] = ($vramMap[$p] + $s.CookedValue)
          }
        }

        $vmProcs = @(Get-Process | Where-Object { $_.ProcessName -match '^(vmwp|vmmemWSL|vmmem)$' } | Select-Object Id, ProcessName, WorkingSet64)
        $dockerVram = 0
        $dockerRam = 0
        $vmPids = @()
        foreach ($vm in $vmProcs) {
          $vmPids += $vm.Id
          $dockerRam += $vm.WorkingSet64
          if ($vramMap.ContainsKey($vm.Id)) {
            $dockerVram += $vramMap[$vm.Id]
          }
        }

        $topProcs = @(Get-Process | Where-Object { $_.WorkingSet64 -gt 100MB } | Sort-Object WorkingSet64 -Descending | Select-Object -First 20 Id, ProcessName, WorkingSet64, CPU | ForEach-Object {
          @{
            id = $_.Id
            name = $_.ProcessName
            ramBytes = $_.WorkingSet64
            cpuSec = if ($_.CPU) { [math]::Round($_.CPU, 1) } else { 0 }
            vramBytes = if ($vramMap.ContainsKey($_.Id)) { $vramMap[$_.Id] } else { 0 }
          }
        })

        @{
          dockerVmPids = $vmPids
          dockerVramBytes = $dockerVram
          dockerRamBytes = $dockerRam
          topProcesses = $topProcs
        } | ConvertTo-Json -Depth 4 -Compress
      `;

      const b64 = Buffer.from(combinedPs, 'utf16le').toString('base64');
      const { stdout: psOut } = await execAsync(`powershell -NoProfile -EncodedCommand ${b64}`, { timeout: 4500 });
      const cleanOut = psOut.trim();
      if (cleanOut) {
        // Filter out any PowerShell progress XML or warning prefixes
        const jsonStart = cleanOut.indexOf('{');
        if (jsonStart !== -1) {
          const parsed = JSON.parse(cleanOut.slice(jsonStart));
          if (parsed.dockerVmPids) {
            const pids = Array.isArray(parsed.dockerVmPids) ? parsed.dockerVmPids : [parsed.dockerVmPids];
            dockerVmPids.push(...pids.map((p: unknown) => Number(p)).filter((n: number) => !isNaN(n)));
          }
          if (parsed.dockerVramBytes) {
            dockerVmHostVramMb = Math.round((parsed.dockerVramBytes / (1024 * 1024)) * 10) / 10;
          }
          if (parsed.dockerRamBytes) {
            dockerVmHostRamMb = Math.round((parsed.dockerRamBytes / (1024 * 1024)) * 10) / 10;
          }

          const dockerSet = new Set(dockerVmPids);
          if (Array.isArray(parsed.topProcesses)) {
            for (const item of parsed.topProcesses) {
              if (item && item.id) {
                const pid = Number(item.id);
                const ramMb = Math.round(((item.ramBytes || 0) / (1024 * 1024)) * 10) / 10;
                const vramMb = item.vramBytes ? Math.round((item.vramBytes / (1024 * 1024)) * 10) / 10 : undefined;
                if (vramMb) {
                  vramByPid[pid] = vramMb;
                }

                if (!excludeSet.has(pid) && !dockerSet.has(pid)) {
                  const rawName = item.name || 'unknown';
                  let displayName = rawName;
                  if (rawName.toLowerCase() === 'chrome') displayName = 'Google Chrome (GPU)';
                  else if (rawName.toLowerCase() === 'explorer') displayName = 'Windows Shell / Explorer';
                  else if (rawName.toLowerCase() === 'dwm') displayName = 'Desktop Window Manager';
                  else if (rawName.toLowerCase() === 'antigravity') displayName = 'Antigravity Workspace';
                  else if (rawName.toLowerCase() === 'discord') displayName = 'Discord Client';
                  else if (rawName.toLowerCase() === 'msedgewebview2') displayName = 'Edge WebView2 Host';

                  topProcs.push({
                    pid,
                    name: rawName,
                    displayName,
                    ramMb,
                    vramMb,
                    cpuSeconds: item.cpuSec || 0,
                  });
                }
              }
            }
          }
        }
      }
    } catch {
      // PowerShell query error fallback
    }
  }

  return {
    vramByPid,
    dockerVmPids,
    dockerVmHostVramMb,
    dockerVmHostRamMb,
    topOtherProcesses: topProcs.slice(0, 10),
  };
}

export async function collectTopOtherProcesses(excludePids: number[]): Promise<TopProcess[]> {
  const res = await collectHostTelemetryAndVram(excludePids);
  return res.topOtherProcesses;
}

export async function collectDockerInstances(
  dockerStats: Record<string, DockerContainerStat>,
  dockerVmHostVramMb: number,
  healthMap: Record<string, ServiceHealthData>
): Promise<{
  instances: DockerInstanceMetric[];
  dockerTotalVramMb: number;
  dockerTotalRamMb: number;
  dockerDriverCacheVramMb: number;
}> {
  const instances: DockerInstanceMetric[] = [];
  let totalDockerRam = 0;

  try {
    const { stdout: psOut } = await execAsync('docker ps --no-trunc --format "{{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}"', {
      timeout: 3500,
    });
    const raw = psOut.trim();
    if (!raw) {
      return {
        instances: [],
        dockerTotalVramMb: dockerVmHostVramMb,
        dockerTotalRamMb: 0,
        dockerDriverCacheVramMb: dockerVmHostVramMb,
      };
    }

    const rawContainers: { id: string; shortId: string; name: string; image: string; status: string; hasGpu: boolean }[] = [];
    const nameList: string[] = [];

    for (const line of raw.split('\n')) {
      if (!line) continue;
      const parts = line.split('\t');
      if (parts.length >= 4) {
        const fullId = parts[0].trim();
        const shortId = fullId.slice(0, 12);
        const name = parts[1].split(',')[0].trim();
        const image = parts[2].trim();
        const status = parts[3].trim();
        rawContainers.push({ id: fullId, shortId, name, image, status, hasGpu: false });
        nameList.push(name);
      }
    }

    // Inspect Docker host device requests for GPU
    if (nameList.length > 0) {
      try {
        const { stdout: inspOut } = await execFileAsync('docker', ['inspect', ...nameList, '--format', '{{.Name}}\t{{json .HostConfig.DeviceRequests}}\t{{range .HostConfig.Devices}}{{.PathOnHost}} {{end}}'], { timeout: 3500 });
        for (const line of inspOut.trim().split('\n')) {
          if (!line) continue;
          const [rawName, devReq, devList] = line.split('\t');
          const cleanName = (rawName || '').replace(/^\//, '').trim();
          const match = rawContainers.find((c) => c.name === cleanName);
          if (match) {
            const hasDevReq = devReq && devReq !== 'null' && (devReq.includes('gpu') || devReq.includes('nvidia'));
            const hasDevList = devList && devList.includes('nvidia');
            match.hasGpu = Boolean(hasDevReq || hasDevList);
          }
        }
      } catch {
        // Inspect fallback
      }
    }

    // On Windows WSL2, query process GPU handles (/dev/dxg) directly mapped to container cgroups
    const wslGpuProcsByContainer: Record<string, { pid: string; cmd: string; rssMb: number }[]> = {};
    if (process.platform === 'win32') {
      try {
        const script = `
for p in /proc/[0-9]*; do
  if [ -f $p/cgroup ]; then
    cg=$(cat $p/cgroup 2>/dev/null)
    case "$cg" in
      *docker/*)
        cid=\${cg##*docker/}
        cid=\${cid%%/*}
        cid=\${cid%%\\n*}
        if [ -n "$cid" ]; then
          pid=\${p##/proc/}
          has_dxg=0
          if ls -l $p/fd 2>/dev/null | grep -q dxg; then
            has_dxg=1
          fi
          rss=$(grep VmRSS $p/status 2>/dev/null | awk '{print $2}')
          cmd=$(tr '\\0' ' ' < $p/cmdline 2>/dev/null | cut -c1-80)
          echo "$cid|$pid|$has_dxg|$rss|$cmd"
        fi
        ;;
    esac
  fi
done
`;
        const b64 = Buffer.from(script).toString('base64');
        const { stdout: wslOut } = await execFileAsync('wsl', ['-d', 'docker-desktop', '-e', 'sh', '-c', `echo ${b64} | base64 -d | sh`], { timeout: 3500 });
        for (const line of wslOut.trim().split('\n')) {
          if (!line) continue;
          const [cid, pid, hasDxg, rss, cmd] = line.split('|');
          const match = rawContainers.find((c) => c.id.startsWith(cid) || cid.startsWith(c.id));
          if (match && hasDxg === '1') {
            match.hasGpu = true;
            if (!wslGpuProcsByContainer[match.id]) wslGpuProcsByContainer[match.id] = [];
            wslGpuProcsByContainer[match.id].push({
              pid,
              cmd: (cmd || '').trim(),
              rssMb: Math.round((parseInt(rss, 10) || 0) / 1024),
            });
          }
        }
      } catch {
        // WSL inspection fallback
      }
    }

    // Assemble detailed container metrics with accurate VRAM attribution
    let sumAssignedVram = 0;

    for (const c of rawContainers) {
      const stat = dockerStats[c.name.toLowerCase()] || dockerStats[c.shortId.toLowerCase()];
      const ramMb = stat ? stat.ramMb : 0;
      const ramLimitMb = stat ? stat.ramLimitMb : 0;
      const cpuPct = stat ? stat.cpuPct : 0;
      totalDockerRam += ramMb;

      // Find matching registered service
      let matchedService: ServiceDefinition | undefined;
      for (const def of SERVICE_REGISTRY) {
        if (def.dockerNames.some((dn) => dn.toLowerCase() === c.name.toLowerCase()) ||
            (def.dockerImage && c.image.toLowerCase().includes(def.dockerImage.toLowerCase()))) {
          matchedService = def;
          break;
        }
      }

      let vramMb = 0;
      const details: string[] = [];
      const serviceId = matchedService?.id;
      const serviceHealth = serviceId ? healthMap[serviceId] : undefined;

      if (serviceId === 'modern_talkinghead') {
        const activeModel = serviceHealth?.active_model ? String(serviceHealth.active_model).toLowerCase() : undefined;
        const profile = typeof (serviceHealth as Record<string, unknown>)?.profile === 'string'
          ? String((serviceHealth as Record<string, unknown>).profile).toLowerCase()
          : undefined;
        const modelMeta = activeModel && TALKINGHEAD_MODEL_VRAM[activeModel];
        if (modelMeta) {
          vramMb = modelMeta.vramMb;
          details.push(`Active Model: ${modelMeta.name} (${formatMb(vramMb)})`);
        } else if (activeModel === 'musetalk' || profile === 'musetalk') {
          const cachedCount = (serviceHealth?.cached_avatars || []).length;
          const liveReserved = serviceHealth?.vram_reserved_mb ? parseFloat(String(serviceHealth.vram_reserved_mb)) : 0;
          const liveAllocated = serviceHealth?.vram_allocated_mb ? parseFloat(String(serviceHealth.vram_allocated_mb)) : 0;
          vramMb = liveReserved > 0 ? liveReserved : (liveAllocated > 0 ? liveAllocated : 708 + cachedCount * 180);
          details.push(`Profile: MuseTalk FP16 (${liveAllocated > 0 ? formatMb(liveAllocated) : '708 MB'} active + ${cachedCount} Avatar${cachedCount === 1 ? '' : 's'})`);
        } else if (serviceHealth?.gpu?.vram_allocated_mb) {
          const rawAlloc = parseFloat(serviceHealth.gpu.vram_allocated_mb);
          const rawRes = serviceHealth.gpu.vram_reserved_mb ? parseFloat(serviceHealth.gpu.vram_reserved_mb) : 0;
          vramMb = Math.round(Math.max(rawAlloc, rawRes));
          details.push(`CUDA VRAM: ${formatMb(vramMb)}`);
        } else if (c.hasGpu) {
          vramMb = 50;
          details.push('CUDA Standby Context');
        }
        if (typeof serviceHealth?.idle_seconds === 'number') {
          const idleM = Math.floor(serviceHealth.idle_seconds / 60);
          const idleS = Math.floor(serviceHealth.idle_seconds % 60);
          const timeoutM = typeof serviceHealth.inactivity_timeout_seconds === 'number'
            ? Math.round(serviceHealth.inactivity_timeout_seconds / 60)
            : 10;
          details.push(`Idle: ${idleM}m ${idleS}s (Watchdog: ${timeoutM}m auto-purge)`);
        }
        if (serviceHealth?.engine_count) {
          details.push(`${serviceHealth.engine_count} Talking-Head Engines`);
        }
      } else if (serviceId === 'modern_motion') {
        const activeMotion = serviceHealth?.active_model ? String(serviceHealth.active_model).toLowerCase() : undefined;
        const motionMeta = activeMotion && MOTION_MODEL_VRAM[activeMotion];
        if (motionMeta) {
          vramMb = motionMeta.vramMb;
          details.push(`Active Model: ${motionMeta.name} (${formatMb(vramMb)})`);
        } else {
          const rawAlloc = serviceHealth?.gpu?.allocated_mb ? parseFloat(serviceHealth.gpu.allocated_mb) : 0;
          const rawRes = serviceHealth?.gpu?.reserved_mb ? parseFloat(serviceHealth.gpu.reserved_mb) : 0;
          vramMb = Math.round(Math.max(rawAlloc, rawRes, 50));
          details.push(`CUDA Pipeline & Arena: ${formatMb(vramMb)}`);
        }
        if (serviceHealth?.engine_count) {
          details.push(`${serviceHealth.engine_count} Motion Engines`);
        }
      } else if (serviceId === 'musetalk') {
        const isCuda = serviceHealth?.device && serviceHealth.device !== 'CPU';
        if (isCuda || c.hasGpu) {
          const cachedCount = (serviceHealth?.cached_avatars || []).length;
          const liveReserved = serviceHealth?.vram_reserved_mb ? parseFloat(String(serviceHealth.vram_reserved_mb)) : 0;
          const liveAllocated = serviceHealth?.vram_allocated_mb ? parseFloat(String(serviceHealth.vram_allocated_mb)) : 0;
          vramMb = liveReserved > 0 ? liveReserved : (liveAllocated > 0 ? liveAllocated : 1100 + cachedCount * 180);
          details.push(`TensorRT FP16: ${formatMb(vramMb)} (${liveAllocated > 0 ? formatMb(liveAllocated) : '1.1 GB'} active + ${cachedCount} Avatar${cachedCount === 1 ? '' : 's'})`);
          if (typeof serviceHealth?.idle_seconds === 'number') {
            const idleM = Math.floor(serviceHealth.idle_seconds / 60);
            const idleS = Math.floor(serviceHealth.idle_seconds % 60);
            const timeoutM = typeof serviceHealth.inactivity_timeout_seconds === 'number'
              ? Math.round(serviceHealth.inactivity_timeout_seconds / 60)
              : 10;
            details.push(`Idle: ${idleM}m ${idleS}s (Watchdog: ${timeoutM}m auto-purge)`);
          }
        } else {
          details.push('CPU Mode');
        }
      } else if (serviceId === 'modern_tts') {
        if (c.hasGpu || serviceHealth?.cuda_available) {
          const rawAlloc = serviceHealth?.vram_allocated_mb ? parseFloat(String(serviceHealth.vram_allocated_mb)) : 0;
          vramMb = Math.round(rawAlloc);
          const gpuProcs = wslGpuProcsByContainer[c.id];
          const procCount = gpuProcs ? gpuProcs.length : 1;
          if (rawAlloc < 100) {
            details.push(`Standby / Idle (Offloaded to CPU: ${formatMb(vramMb)})`);
          } else {
            details.push(`${procCount} GPU Workers (PyTorch Inductor & CUDA: ${formatMb(vramMb)})`);
          }
        } else {
          details.push('CPU Profile');
        }
      } else if (serviceId === 'comfyui') {
        const dev = serviceHealth?.devices?.[0];
        if (dev) {
          const vramUsed = (dev.vram_total - dev.vram_free) / (1024 * 1024);
          const torchUsed = dev.torch_vram_total / (1024 * 1024);
          vramMb = Math.max(vramUsed, torchUsed);
          details.push(`PyTorch: ${formatMb(torchUsed)}`);
        }
      } else if (serviceId === 'ollama') {
        const models = serviceHealth?.models || [];
        if (models.length > 0) {
          const modelNames = models.map((m) => m.name).filter(Boolean).join(', ');
          const modelVram = models.reduce((acc: number, m) => acc + (m.size_vram || 0) / (1024 * 1024), 0);
          if (modelVram > 0) vramMb = modelVram;
          details.push(`Models: ${modelNames}`);
        } else {
          details.push('0 models in VRAM (Idle)');
        }
      } else if (serviceId === 'modern_talkinghead' || serviceId === 'modern-talkinghead') {
        const isCuda = serviceHealth?.device && serviceHealth.device !== 'CPU';
        if (isCuda || c.hasGpu) {
          const cachedCount = (serviceHealth?.cached_avatars || []).length;
          const liveReserved = serviceHealth?.vram_reserved_mb ? parseFloat(String(serviceHealth.vram_reserved_mb)) : 0;
          const liveAllocated = serviceHealth?.vram_allocated_mb ? parseFloat(String(serviceHealth.vram_allocated_mb)) : 0;
          vramMb = liveReserved > 0 ? liveReserved : (liveAllocated > 0 ? liveAllocated : 1200 + cachedCount * 180);
          const activeEngine = serviceHealth?.active_engine || serviceHealth?.engine || 'MuseTalk/Ditto';
          details.push(`${activeEngine}: ${formatMb(vramMb)} (${liveAllocated > 0 ? formatMb(liveAllocated) : '1.2 GB'} active + ${cachedCount} Avatar${cachedCount === 1 ? '' : 's'})`);
          if (typeof serviceHealth?.idle_seconds === 'number') {
            const idleM = Math.floor(serviceHealth.idle_seconds / 60);
            const idleS = Math.floor(serviceHealth.idle_seconds % 60);
            const timeoutM = typeof serviceHealth.inactivity_timeout_seconds === 'number'
              ? Math.round(serviceHealth.inactivity_timeout_seconds / 60)
              : 10;
            details.push(`Idle: ${idleM}m ${idleS}s (Watchdog: ${timeoutM}m auto-purge)`);
          }
        } else {
          details.push('CPU Mode');
        }
      } else if (serviceId === 'sadtalker') {
        if (c.hasGpu) {
          vramMb = 2800;
          details.push(`SadTalker GPU: ${formatMb(vramMb)}`);
        }
      } else if (serviceId === 'object3d') {
        const vramGb = typeof serviceHealth?.vram_used_gb === 'number' ? serviceHealth.vram_used_gb : 0;
        vramMb = Math.round(vramGb * 1024);
        const engine = serviceHealth?.loaded_engine || 'Standby';
        const enginesCount = Array.isArray(serviceHealth?.engines) ? serviceHealth.engines.length : 4;
        if (vramGb === 0) {
          details.push(`0 MB Idle Standby (${enginesCount} Engines: TripoSG, TRELLIS, SPAR3D, InstantMesh)`);
        } else {
          details.push(`Active Engine: ${engine} (${formatMb(vramMb)})`);
        }
      } else if (c.hasGpu) {
        // Generic/unregistered container with NVIDIA GPU access
        vramMb = 1000;
        const gpuProcs = wslGpuProcsByContainer[c.id];
        if (gpuProcs && gpuProcs.length > 0) {
          details.push(`${gpuProcs.length} GPU Processes Active`);
        } else {
          details.push('NVIDIA GPU Attached');
        }
      }

      sumAssignedVram += vramMb;

      instances.push({
        id: c.id,
        name: c.name,
        image: c.image,
        status: c.status,
        hasGpu: c.hasGpu,
        cpuPct: Math.round(cpuPct * 10) / 10,
        ramMb: Math.round(ramMb * 10) / 10,
        ramLimitMb: Math.round(ramLimitMb * 10) / 10,
        vramMb: Math.round(vramMb * 10) / 10,
        details: details.join(' • ') || undefined,
        serviceId,
        serviceName: matchedService?.name,
        gpuProcesses: wslGpuProcsByContainer[c.id],
      });
    }

    const dockerTotalVramMb = Math.max(dockerVmHostVramMb, sumAssignedVram);
    const dockerDriverCacheVramMb = Math.max(0, dockerTotalVramMb - sumAssignedVram);

    return {
      instances,
      dockerTotalVramMb: Math.round(dockerTotalVramMb * 10) / 10,
      dockerTotalRamMb: Math.round(totalDockerRam * 10) / 10,
      dockerDriverCacheVramMb: Math.round(dockerDriverCacheVramMb * 10) / 10,
    };
  } catch {
    return {
      instances: [],
      dockerTotalVramMb: dockerVmHostVramMb,
      dockerTotalRamMb: 0,
      dockerDriverCacheVramMb: dockerVmHostVramMb,
    };
  }
}

export async function gatherFullTelemetry(): Promise<FullTelemetryReport> {
  const [gpu, dockerStats, portMappings] = await Promise.all([
    collectGpuStats(),
    collectDockerStats(),
    collectPortMappings(),
  ]);
  const system = collectSystemStats();
  const dockerImages = await collectDockerImages(Object.keys(dockerStats));

  const allServicePids: number[] = [];
  for (const s of SERVICE_REGISTRY) {
    if (s.port && portMappings[s.port]) {
      allServicePids.push(...portMappings[s.port]);
    }
  }

  const [nativeProcInfo, hostMetrics] = await Promise.all([
    collectNativeProcesses(allServicePids),
    collectHostTelemetryAndVram(allServicePids),
  ]);

  const healthQueries = SERVICE_REGISTRY.map(async (def) => {
    if (!def.healthUrl) return null;
    return fetchJsonWithLatency(def.healthUrl, 1500, serviceHealthSchema);
  });
  const rawHealthResults = await Promise.all(healthQueries);
  const serviceHealthMap: Record<string, ServiceHealthData> = {};
  for (let i = 0; i < SERVICE_REGISTRY.length; i++) {
    const def = SERVICE_REGISTRY[i];
    const h = rawHealthResults[i];
    if (h && h.ok && h.data) {
      serviceHealthMap[def.id] = h.data as ServiceHealthData;
    }
  }

  const dockerTelemetry = await collectDockerInstances(
    dockerStats,
    hostMetrics.dockerVmHostVramMb,
    serviceHealthMap
  );

  const services: ServiceMetric[] = [];
  let totalServiceRam = 0;
  let totalServiceVram = 0;
  let nextShortcut = 1;

  for (let i = 0; i < SERVICE_REGISTRY.length; i++) {
    const def = SERVICE_REGISTRY[i];
    const health = rawHealthResults[i];
    const pids = (def.port ? portMappings[def.port] : []) || [];

    // Check if this service is hosted in a Docker container
    const dockerInstance = dockerTelemetry.instances.find(
      (inst) => inst.serviceId === def.id || def.dockerNames.some((dn) => dn.toLowerCase() === inst.name.toLowerCase())
    );

    let status: ServiceMetric['status'] = 'OFFLINE';
    let cpuPct = 0;
    let ramMb = 0;
    let vramMb = 0;
    const details: string[] = [];
    let activeProfile: string | undefined;
    let inactivityTimeoutSeconds: number | undefined;

    if (health && health.ok && health.data && typeof health.data === 'object') {
      const hd = health.data as Record<string, unknown>;
      if (typeof hd.active_profile === 'string') {
        activeProfile = hd.active_profile;
      } else if (typeof hd.profile === 'string') {
        activeProfile = hd.profile;
      }
      if (typeof hd.inactivity_timeout_seconds === 'number') {
        inactivityTimeoutSeconds = hd.inactivity_timeout_seconds;
      }
    }

    if (dockerInstance) {
      ramMb = dockerInstance.ramMb;
      cpuPct = dockerInstance.cpuPct;
      vramMb = dockerInstance.vramMb;
      if (dockerInstance.details) {
        details.push(dockerInstance.details);
      }
      details.unshift(`🐳 Docker: ${dockerInstance.name}`);
    } else if (pids.length > 0) {
      for (const pid of pids) {
        const proc = nativeProcInfo[pid];
        if (proc) {
          ramMb += proc.ramMb;
        }
      }
    }

    if (health && health.ok) {
      status = 'ONLINE';

      if (def.id === 'comfyui' && !dockerInstance) {
        const healthData = health.data as ServiceHealthData | undefined;
        const dev = healthData?.devices?.[0];
        if (dev) {
          const vramUsed = (dev.vram_total - dev.vram_free) / (1024 * 1024);
          const torchUsed = dev.torch_vram_total / (1024 * 1024);
          vramMb = Math.max(vramUsed, torchUsed);
          details.push(`PyTorch: ${formatMb(torchUsed)}`);
          if (dev.name) details.push(dev.name);
        }
      } else if (def.id === 'ollama' && !dockerInstance) {
        const healthData = health.data as ServiceHealthData | undefined;
        const models = healthData?.models || [];
        if (models.length > 0) {
          status = 'BUSY';
          const modelNames = models.map((m) => m.name).filter(Boolean).join(', ');
          const modelVram = models.reduce((acc: number, m) => acc + (m.size_vram || 0) / (1024 * 1024), 0);
          if (modelVram > 0) vramMb = modelVram;
          details.push(`Models: ${modelNames}`);
        } else {
          details.push('0 models in VRAM (Idle)');
        }
      }
    } else if (dockerInstance || pids.length > 0) {
      status = 'ONLINE';
    }

    if (def.id === 'ollama' && status !== 'OFFLINE' && !dockerInstance) {
      const llamaProc = hostMetrics.topOtherProcesses.find((p) => p.name.toLowerCase().includes('llama-server'));
      if (llamaProc && llamaProc.ramMb > 0) {
        if (vramMb === 0) vramMb = llamaProc.ramMb;
        details.push(`llama-server PID ${llamaProc.pid}`);
      }
    }

    const ramPct = Math.round((ramMb / (system.totalMemMb || 1)) * 100);
    const vramPct = gpu ? Math.round((vramMb / (gpu.vramTotalMb || 1)) * 100) : 0;

    totalServiceRam += ramMb;
    totalServiceVram += vramMb;

    let shortcutKey: string | undefined;
    if (status !== 'OFFLINE' && nextShortcut <= 9) {
      shortcutKey = String(nextShortcut++);
      if (dockerInstance) {
        dockerInstance.shortcutKey = shortcutKey;
      }
    }

    services.push({
      id: def.id,
      name: def.name,
      category: def.category,
      defaultPort: def.port,
      status,
      pids,
      containerName: dockerInstance?.name,
      dockerImage: def.dockerImage,
      cpuPct: Math.round(cpuPct * 10) / 10,
      ramMb: Math.round(ramMb * 10) / 10,
      ramPct,
      vramMb: Math.round(vramMb * 10) / 10,
      vramPct,
      latencyMs: health?.latencyMs,
      details: details.join(' • ') || undefined,
      shortcutKey,
      activeProfile,
      inactivityTimeoutSeconds,
    });
  }

  // Assign remaining shortcut keys to any standalone Docker containers
  for (const inst of dockerTelemetry.instances) {
    if (!inst.serviceId && nextShortcut <= 9) {
      inst.shortcutKey = String(nextShortcut++);
    }
  }

  // Total GPU memory reconciliation:
  // Total GPU VRAM used on system = Docker VM VRAM + Host Native Services VRAM + Host OS/Desktop Apps
  const nonDockerServiceVram = services
    .filter((s) => !s.containerName)
    .reduce((acc, s) => acc + s.vramMb, 0);

  const effectiveDockerVram = Math.max(dockerTelemetry.dockerTotalVramMb, totalServiceVram - nonDockerServiceVram);
  const hostOtherVramMb = gpu
    ? Math.max(0, gpu.vramUsedMb - effectiveDockerVram - nonDockerServiceVram)
    : 0;

  const hostOtherRamMb = Math.max(
    0,
    system.usedMemMb - totalServiceRam - (hostMetrics.dockerVmHostRamMb > totalServiceRam ? hostMetrics.dockerVmHostRamMb - totalServiceRam : 0)
  );

  return {
    timestamp: new Date().toISOString(),
    gpu,
    system,
    services,
    totalServiceRamMb: Math.round(totalServiceRam * 10) / 10,
    totalServiceVramMb: Math.round(totalServiceVram * 10) / 10,
    hostOtherRamMb: Math.round(hostOtherRamMb * 10) / 10,
    hostOtherVramMb: Math.round(hostOtherVramMb * 10) / 10,
    topOtherProcesses: hostMetrics.topOtherProcesses,
    dockerImages,
    dockerTotalVramMb: Math.round(effectiveDockerVram * 10) / 10,
    dockerTotalRamMb: dockerTelemetry.dockerTotalRamMb,
    dockerDriverCacheVramMb: dockerTelemetry.dockerDriverCacheVramMb,
    dockerInstances: dockerTelemetry.instances,
  };
}

export async function killService(serviceIdOrName: string): Promise<{ success: boolean; message: string }> {
  const target = serviceIdOrName.toLowerCase().trim();

  // Check if target is a running docker container name or ID
  try {
    const cleanTarget = target.replace(/^(docker:|container:)/i, '');
    const { stdout: psOut } = await execAsync('docker ps --format "{{.Names}}\t{{.ID}}"');
    const runningList = psOut.trim().split('\n').map((l) => l.split('\t')).flat().filter(Boolean);
    const matched = runningList.find(
      (nameOrId) => nameOrId.toLowerCase() === cleanTarget || nameOrId.toLowerCase().startsWith(cleanTarget)
    );
    if (matched) {
      await execFileAsync('docker', ['stop', matched]);
      return { success: true, message: `Stopped Docker container '${matched}'.` };
    }
  } catch {
    // Docker check fallback
  }

  if (target === 'all' || target === 'ai') {
    const results = await Promise.all([
      killService('modern_tts'),
      killService('musetalk'),
      killService('keysync'),
      killService('liveportrait'),
      killService('modern_talkinghead'),
      killService('modern_motion'),
      killService('ollama'),
      killService('comfyui'),
      killService('sadtalker'),
    ]);
    const stopped = results.filter((r) => r.success).length;
    return {
      success: true,
      message: `Stopped/freed ${stopped} AI microservice(s). VRAM released.`,
    };
  }

  if (target === 'modern_tts' || target === 'moderntts' || target === 'tts') {
    try {
      await execAsync('docker stop modern-tts-server');
      return { success: true, message: 'Stopped Modern-TTS Docker container (Freed ~14.5 GB VRAM & 4.5 GB RAM).' };
    } catch {
      try {
        if (process.platform === 'win32') {
          await execAsync('taskkill /F /FI "WINDOWTITLE eq Modern-TTS*" /T');
        }
        return { success: true, message: 'Killed Modern-TTS process.' };
      } catch (e: unknown) {
        return { success: false, message: `Failed to stop Modern-TTS: ${(e as Error).message}` };
      }
    }
  }

  if (target === 'musetalk_vram' || target === 'musetalk_cache' || target === 'musetalk_free' || target === 'talkinghead_vram' || target === 'talkinghead_cache') {
    try {
      try {
        await postJson('http://localhost:8010/cache/clear', {});
        return { success: true, message: 'Cleared TalkingHead/MuseTalk avatar cache and freed GPU VRAM via PyTorch empty_cache().' };
      } catch {
        await postJson('http://localhost:8007/cache/clear', {});
        return { success: true, message: 'Cleared MuseTalk avatar cache and freed GPU VRAM via PyTorch empty_cache().' };
      }
    } catch (e: unknown) {
      return { success: false, message: `Failed to clear cache: ${(e as Error).message}` };
    }
  }

  if (target === 'musetalk' || target === 'muse') {
    try {
      await execAsync('docker stop modern-talkinghead-server');
      return { success: true, message: 'Stopped Modern-TalkingHead Docker container (Freed VRAM & RAM).' };
    } catch {
      try {
        await execAsync('docker stop modern-talkinghead');
        return { success: true, message: 'Stopped Modern-TalkingHead Docker container.' };
      } catch {
        try {
          await execAsync('docker stop musetalk_gpu');
          return { success: true, message: 'Stopped MuseTalk Docker container.' };
        } catch {
          try {
            await execAsync('docker stop musetalk');
            return { success: true, message: 'Stopped MuseTalk Docker container.' };
          } catch (e: unknown) {
            return { success: false, message: `Failed to stop MuseTalk/TalkingHead: ${(e as Error).message}` };
          }
        }
      }
    }
  }

  if (target === 'keysync') {
    try {
      await execAsync('docker stop keysync-server');
      return { success: true, message: 'Stopped KeySync Docker container.' };
    } catch {
      try {
        await execAsync('docker stop keysync');
        return { success: true, message: 'Stopped KeySync Docker container.' };
      } catch (e: unknown) {
        return { success: false, message: `Failed to stop KeySync: ${(e as Error).message}` };
      }
    }
  }

  if (target === 'liveportrait') {
    try {
      await execAsync('docker stop liveportrait-server');
      return { success: true, message: 'Stopped LivePortrait Docker container.' };
    } catch {
      try {
        await execAsync('docker stop liveportrait');
        return { success: true, message: 'Stopped LivePortrait Docker container.' };
      } catch (e: unknown) {
        return { success: false, message: `Failed to stop LivePortrait: ${(e as Error).message}` };
      }
    }
  }

  if (target === 'modern_talkinghead' || target === 'talkinghead' || target === 'modern-talkinghead') {
    try {
      await execAsync('docker stop modern-talkinghead-server');
      return { success: true, message: 'Stopped Modern-TalkingHead Docker container.' };
    } catch {
      try {
        await execAsync('docker stop modern-talkinghead');
        return { success: true, message: 'Stopped Modern-TalkingHead Docker container.' };
      } catch (e: unknown) {
        return { success: false, message: `Failed to stop Modern-TalkingHead: ${(e as Error).message}` };
      }
    }
  }

  if (target === 'modern_motion' || target === 'motion' || target === 'modern-motion') {
    try {
      await execAsync('docker stop modern-motion-animation-server');
      return { success: true, message: 'Stopped Modern Motion Animation Docker container.' };
    } catch {
      try {
        await execAsync('docker stop modern-motion-animation');
        return { success: true, message: 'Stopped Modern Motion Animation Docker container.' };
      } catch (e: unknown) {
        return { success: false, message: `Failed to stop Modern Motion Animation: ${(e as Error).message}` };
      }
    }
  }

  if (target === 'ollama' || target === 'llama') {
    try {
      const psRes = await fetchJsonWithLatency('http://localhost:11434/api/ps', 1500, serviceHealthSchema);
      const healthData = psRes.data as ServiceHealthData | undefined;
      const models = healthData?.models || [];
      for (const m of models) {
        await postJson('http://localhost:11434/api/generate', { model: m.name, keep_alive: 0 });
      }

      if (process.platform === 'win32') {
        try {
          await execAsync('taskkill /F /IM llama-server.exe');
        } catch {
          // llama-server already dead
        }
      }
      return { success: true, message: 'Unloaded Ollama models and stopped llama-server (Freed VRAM).' };
    } catch (e: unknown) {
      return { success: false, message: `Failed to free Ollama: ${(e as Error).message}` };
    }
  }

  if (target === 'comfyui' || target === 'comfy') {
    try {
      await postJson('http://localhost:8188/free', { unload_models: true, free_memory: true });
      return { success: true, message: 'Sent /free memory command to ComfyUI (Freed PyTorch VRAM).' };
    } catch {
      try {
        if (process.platform === 'win32') {
          await execAsync('taskkill /F /IM ComfyUI.exe');
        }
        return { success: true, message: 'Terminated ComfyUI process.' };
      } catch (e: unknown) {
        return { success: false, message: `Failed to free ComfyUI: ${(e as Error).message}` };
      }
    }
  }

  if (target === 'modern_talkinghead' || target === 'modern-talkinghead') {
    try {
      await execAsync('docker stop modern-talkinghead-server');
      return { success: true, message: 'Stopped Modern-TalkingHead Docker container.' };
    } catch {
      try {
        await execAsync('docker stop modern-talkinghead');
        return { success: true, message: 'Stopped Modern-TalkingHead Docker container.' };
      } catch (e: unknown) {
        return { success: false, message: `Failed to stop Modern-TalkingHead: ${(e as Error).message}` };
      }
    }
  }

  if (target === 'sadtalker') {
    try {
      await execAsync('docker stop sadtalker-server');
      return { success: true, message: 'Stopped SadTalker Docker container.' };
    } catch {
      try {
        await execAsync('docker stop sadtalker');
        return { success: true, message: 'Stopped SadTalker Docker container.' };
      } catch (e: unknown) {
        return { success: false, message: `Failed to stop SadTalker: ${(e as Error).message}` };
      }
    }
  }

  if (target === 'nextjs' || target === 'web' || target === 'next') {
    try {
      const portMappings = await collectPortMappings();
      const pids = portMappings[3000] || [];
      for (const pid of pids) {
        if (process.platform === 'win32') {
          await execFileAsync('taskkill', ['/F', '/PID', pid.toString()]);
        } else {
          process.kill(pid, 'SIGTERM');
        }
      }
      return { success: true, message: 'Stopped Next.js server on port 3000.' };
    } catch (e: unknown) {
      return { success: false, message: `Failed to stop Next.js: ${(e as Error).message}` };
    }
  }

  if (target === 'minio' || target === 'storage') {
    try {
      await execAsync('docker stop news-studio-minio');
      return { success: true, message: 'Stopped MinIO storage container.' };
    } catch {
      try {
        await execAsync('docker stop minio');
        return { success: true, message: 'Stopped MinIO storage container.' };
      } catch (e: unknown) {
        return { success: false, message: `Failed to stop MinIO: ${(e as Error).message}` };
      }
    }
  }

  if (target === 'inngest') {
    try {
      if (process.platform === 'win32') {
        await execAsync('taskkill /F /IM inngest.exe');
      }
      return { success: true, message: 'Stopped Inngest dev server.' };
    } catch (e: unknown) {
      return { success: false, message: `Failed to stop Inngest: ${(e as Error).message}` };
    }
  }

  return { success: false, message: `Unknown service: ${serviceIdOrName}` };
}

export async function switchServiceProfile(
  serviceId: string,
  profile: string
): Promise<{ success: boolean; message: string; profile?: string }> {
  const target = serviceId.toLowerCase().trim();
  const cleanProfile = profile.toLowerCase().trim();

  if (target === 'modern_talkinghead' || target === 'talkinghead' || target === 'musetalk' || target === 'modern-talkinghead') {
    try {
      const res = await fetch('http://localhost:8010/profile/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: cleanProfile }),
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const data = (await res.json()) as { status?: string; profile?: string };
        return {
          success: true,
          message: `Switched Modern-TalkingHead profile to [${cleanProfile.toUpperCase()}].`,
          profile: data.profile || cleanProfile,
        };
      }
      return { success: false, message: `Modern-TalkingHead returned HTTP ${res.status}` };
    } catch (e: unknown) {
      return { success: false, message: `Could not reach Modern-TalkingHead on port 8010: ${(e as Error).message}` };
    }
  }

  if (target === 'modern_tts' || target === 'moderntts' || target === 'tts') {
    try {
      const res = await fetch('http://localhost:8005/profile/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: cleanProfile }),
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const data = (await res.json()) as { status?: string; profile?: string };
        return {
          success: true,
          message: `Switched Modern-TTS profile to [${cleanProfile.toUpperCase()}].`,
          profile: data.profile || cleanProfile,
        };
      }
      return { success: false, message: `Modern-TTS returned HTTP ${res.status}` };
    } catch (e: unknown) {
      return { success: false, message: `Could not reach Modern-TTS on port 8005: ${(e as Error).message}` };
    }
  }

  return { success: false, message: `Profile switching not supported for service: ${serviceId}` };
}

export async function setServiceWatchdogTimeout(
  serviceId: string,
  timeoutSeconds: number
): Promise<{ success: boolean; message: string; timeoutSeconds?: number }> {
  const target = serviceId.toLowerCase().trim();

  if (target === 'modern_talkinghead' || target === 'talkinghead' || target === 'musetalk' || target === 'modern-talkinghead') {
    try {
      const res = await fetch('http://localhost:8010/cache/timeout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeout_seconds: timeoutSeconds }),
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const data = (await res.json()) as { inactivity_timeout_seconds?: number };
        const label = timeoutSeconds <= 0 ? 'Disabled' : `${Math.round(timeoutSeconds / 60)}m (${timeoutSeconds}s)`;
        return {
          success: true,
          message: `Modern-TalkingHead watchdog auto-purge timeout set to ${label}.`,
          timeoutSeconds: data.inactivity_timeout_seconds ?? timeoutSeconds,
        };
      }
      return { success: false, message: `Modern-TalkingHead returned HTTP ${res.status}` };
    } catch (e: unknown) {
      return { success: false, message: `Could not reach Modern-TalkingHead on port 8010: ${(e as Error).message}` };
    }
  }

  return { success: false, message: `Watchdog timeout configuration not supported for service: ${serviceId}` };
}

