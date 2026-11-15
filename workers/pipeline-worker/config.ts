import fs from "fs";
import { hostname } from "os";
import path from "path";
import { createLogger } from "@/lib/logger";
import {
  getLocalActionLoopsRoots,
  resolveLocalAvatarsDir,
  resolveLocalPublicFile,
  resolveLocalPublicRoot as resolveSharedLocalPublicRoot,
} from "@/lib/storage/localAssets";

const log = createLogger("worker:config");

/**
 * Resolve external VENDOR_ROOT (for ComfyUI, Modern-TTS-Server, Modern-TalkingHead-Server)
 * checking process.env.VENDOR_ROOT and repo-relative sibling paths.
 */
export function resolveVendorRoot(): string {
  const cwd = process.cwd();
  const candidates = [
    process.env.VENDOR_ROOT,
    path.resolve(cwd, "vendor"),
    path.resolve(cwd, "..", "newsStudio", "vendor"),
    path.resolve(cwd, "..", "..", "newsStudio", "vendor"),
    path.resolve(cwd, "..", "..", "..", "newsStudio", "vendor"),
  ].filter((p): p is string => Boolean(p && p.trim().length > 0));

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return candidates[0] || path.resolve(cwd, "vendor");
}

/**
 * Resolve local `public/` root (prefers LOCAL_PUBLIC_ROOT or sibling newsStudio/public).
 */
export function resolveLocalPublicRoot(): string {
  return resolveSharedLocalPublicRoot();
}

/**
 * Resolve local `assets/action_loops` root.
 */
export function resolveLocalActionLoopsRoot(): string {
  const roots = getLocalActionLoopsRoots();
  return roots[0] || path.join(resolveSharedLocalPublicRoot(), "assets", "action_loops");
}

/**
 * Resolve external LOCAL_AVATARS_ROOT using shared localAssets discovery.
 */
export function resolveLocalAvatarsRoot(): string {
  return resolveLocalAvatarsDir();
}

/**
 * Find an avatar file across LOCAL_AVATARS_ROOT candidates, returning null
 * if no local copy exists (so callers can fall back to R2 storage).
 */
export function resolveLocalAvatarFile(relativeFile: string): string | null {
  const cleanRel = relativeFile.replace(/^[/\\]+/, "");
  const asAvatarRel = cleanRel.startsWith("avatars/") ? cleanRel : `avatars/${cleanRel}`;
  return resolveLocalPublicFile(asAvatarRel) || resolveLocalPublicFile(cleanRel);
}

/**
 * Worker configuration — all values from environment variables.
 */
export const config = {
  /** URL of the Next.js admin app (e.g., https://newsstudio.up.railway.app) */
  mainAppUrl: process.env.MAIN_APP_URL || "http://localhost:3000",

  /** Shared secret for authenticating with worker-facing API routes */
  apiKey: process.env.WORKER_API_KEY || "",

  /** Local loopback HTTP wake server port (8766 avoids collision with CineZero on 8765) */
  wakePort: parseInt(process.env.WORKER_WAKE_PORT || "8766", 10) || 8766,

  /** 15m safety sweep against Supabase PostgREST when idle (0 Railway polls while idle) */
  dbSafetyPollMs: parseInt(process.env.WORKER_DB_POLL_MS || "900000", 10),

  /** How often to poll for new jobs during active work drains (ms) */
  pollIntervalMs: parseInt(process.env.WORKER_POLL_INTERVAL_MS || "10000", 10),

  /** Max concurrent stories (keep at 1 for GPU workers) */
  concurrency: parseInt(process.env.WORKER_CONCURRENCY || "1", 10),

  /** Heartbeat interval during active job processing (ms) */
  heartbeatIntervalMs: parseInt(process.env.WORKER_HEARTBEAT_INTERVAL_MS || "30000", 10),

  /** External vendor root */
  vendorRoot: resolveVendorRoot(),

  /** External local public root */
  localPublicRoot: resolveLocalPublicRoot(),

  /** External local action loops root */
  localActionLoopsRoot: resolveLocalActionLoopsRoot(),

  /** External local avatars root */
  localAvatarsRoot: resolveLocalAvatarsRoot(),

  /** Unique worker ID: hostname-pid */
  workerId: `${hostname()}-${process.pid}`,

  /** Hostname for heartbeat reporting */
  hostname: hostname(),

  /** Worker role from CLI args or env: "audio" | "video" | "render" | "full" */
  role: process.argv.find(arg => arg.startsWith("--role="))?.split("=")[1] || process.env.WORKER_ROLE || "full",

  /** Optional engine selection for video roles: "musetalk" | "comfy_wan" | etc. */
  engine: process.argv.find(arg => arg.startsWith("--engine="))?.split("=")[1] || process.env.WORKER_ENGINE || null,
};

export function validateConfig(): void {
  if (!config.apiKey) {
    console.error("❌ WORKER_API_KEY is not set. Cannot authenticate with the main app.");
    process.exit(1);
  }

  log.info("📋 Worker Configuration:");
  log.info(`   Worker ID:      ${config.workerId}`);
  log.info(`   Worker Role:    ${config.role.toUpperCase()}`);
  log.info(`   Main App URL:   ${config.mainAppUrl}`);
  log.info(`   Wake Port:      127.0.0.1:${config.wakePort}`);
  log.info(`   Safety Poll:    ${config.dbSafetyPollMs}ms`);
  log.info(`   Vendor Root:    ${config.vendorRoot}`);
  log.info(`   Public Root:    ${config.localPublicRoot}`);
  log.info(`   Loops Root:     ${config.localActionLoopsRoot}`);
  log.info(`   Avatars Root:   ${config.localAvatarsRoot}`);
  log.info(`   Concurrency:    ${config.concurrency}`);
  log.info(`   Heartbeat:      ${config.heartbeatIntervalMs}ms`);
}
