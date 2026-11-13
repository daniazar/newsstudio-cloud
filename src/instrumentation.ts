/**
 * src/instrumentation.ts
 *
 * Next.js server lifecycle hook.
 * Runs once when the Node server initializes.
 *
 * In development, with --expose-gc enabled, performs gentle background
 * garbage collection when heap usage exceeds 1.5 GB to prevent V8 heap
 * bloat, deadlocks, and multi-gigabyte memory leaks over long dev sessions.
 */
import { registerOTel } from "@vercel/otel";
import { registerTelemetry } from "ai";
import { OpenTelemetry } from "@ai-sdk/otel";
import { createLogger } from "@/lib/logger";

const log = createLogger("instrumentation");

let telemetryInitialized = false;

export function resetInstrumentationForTests(): void {
  telemetryInitialized = false;
}

export function isTelemetryInitialized(): boolean {
  return telemetryInitialized;
}

export async function register() {
  if (!telemetryInitialized) {
    try {
      registerOTel({ serviceName: process.env.OTEL_SERVICE_NAME || "newsstudio" });
      registerTelemetry(
        new OpenTelemetry({
          agentSpanName: "functionId",
          usage: true,
          runtimeContext: true,
        })
      );
      telemetryInitialized = true;
    } catch (err) {
      console.warn("[Instrumentation] Failed to initialize OpenTelemetry:", err);
    }
  }

  if (process.env.NEXT_RUNTIME === "nodejs") {
    if (process.env.NODE_ENV !== "production" && typeof global.gc === "function") {
      const GC_CHECK_INTERVAL_MS = 90 * 1000; // Check every 90 seconds
      const HEAP_THRESHOLD_BYTES = 1536 * 1024 * 1024; // 1.5 GB

      const gcInterval = setInterval(() => {
        try {
          const mem = process.memoryUsage();
          if (mem.heapUsed > HEAP_THRESHOLD_BYTES) {
            const beforeMb = Math.round(mem.heapUsed / 1024 / 1024);
            global.gc?.();
            const afterMb = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
            if (process.env.DEBUG_GC === "true") {
              log.debug({ beforeMb, afterMb }, `[Dev-GC] Collected heap: ${beforeMb}MB -> ${afterMb}MB`);
            }
          }
        } catch {
          // Ignore
        }
      }, GC_CHECK_INTERVAL_MS);

      // Do not keep process alive solely for GC timer
      gcInterval.unref?.();
    }
  }
}
