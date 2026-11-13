import { hostname } from "os";
import { createLogger } from "@/lib/logger";

const log = createLogger("worker:config");

/**
 * Worker configuration — all values from environment variables.
 */
export const config = {
  /** URL of the Next.js admin app (e.g., http://192.168.1.50:3000) */
  mainAppUrl: process.env.MAIN_APP_URL || "http://localhost:3000",

  /** Shared secret for authenticating with worker-facing API routes */
  apiKey: process.env.WORKER_API_KEY || "",

  /** How often to poll for new jobs (ms) */
  pollIntervalMs: parseInt(process.env.WORKER_POLL_INTERVAL_MS || "10000", 10),

  /** Max concurrent stories (keep at 1 for GPU workers) */
  concurrency: parseInt(process.env.WORKER_CONCURRENCY || "1", 10),

  /** Heartbeat interval (ms) */
  heartbeatIntervalMs: parseInt(process.env.WORKER_HEARTBEAT_INTERVAL_MS || "30000", 10),

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
  log.info(`   Poll Interval:  ${config.pollIntervalMs}ms`);
  log.info(`   Concurrency:    ${config.concurrency}`);
  log.info(`   Heartbeat:      ${config.heartbeatIntervalMs}ms`);
}
