/**
 * src/lib/cache/redisClient.ts
 *
 * Canonical Dual-Mode Redis Client Singleton & Distributed Lock Helper.
 * Provides resilient, zero-crash Redis access with local in-memory fallback.
 *
 * Key Design Invariants:
 * 1. Zero-Crash Local Mode: When REDIS_URL is absent/empty, immediately returns null with zero connection attempts.
 * 2. Unhandled Error Immunity: Registers an error EventEmitter listener on every Redis instance so unreachable
 *    Redis servers never crash Node.js.
 * 3. Lazy Connection & Fast Health Probing: Configures lazyConnect and a 1500ms timeout for /api/health probes.
 * 4. Distributed Lock Utility: Atomic SET PX NX acquisition and Lua compare-and-delete release with seamless
 *    local-memory fallback.
 */

import Redis, { type RedisOptions } from "ioredis";
import { createLogger } from "@/lib/logger";
import type { ServiceStatus } from "@/lib/health";

const log = createLogger({ module: "redisClient" });

let cachedClient: Redis | null = null;
let cachedUrl: string | null = null;

export const RELEASE_LOCK_LUA_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

export interface DistributedLockHandle {
  key: string;
  token: string;
  backend: "redis" | "memory";
  expiresAt: number;
}

// In-memory fallback map for distributed locks
const memoryLockMap = new Map<string, { token: string; expiresAt: number }>();

function acquireMemoryLock(fullKey: string, token: string, ttlMs: number): DistributedLockHandle | null {
  const now = Date.now();
  const existing = memoryLockMap.get(fullKey);
  if (existing && existing.expiresAt > now) {
    return null;
  }
  const expiresAt = now + ttlMs;
  memoryLockMap.set(fullKey, { token, expiresAt });
  return {
    key: fullKey,
    token,
    backend: "memory",
    expiresAt,
  };
}

function releaseMemoryLock(fullKey: string, token: string): boolean {
  const existing = memoryLockMap.get(fullKey);
  if (!existing) {
    return false;
  }
  if (existing.token === token) {
    memoryLockMap.delete(fullKey);
    return true;
  }
  return false;
}

/**
 * Clears in-memory locks (used for test isolation).
 */
export function clearMemoryLocks(): void {
  memoryLockMap.clear();
}

/**
 * Returns true if REDIS_URL is non-empty in the provided or process environment.
 */
export function isRedisConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.REDIS_URL?.trim());
}

/**
 * Returns the active Redis singleton instance, or null if REDIS_URL is unconfigured.
 * If a customClient is provided, it is returned directly.
 */
export function getRedisClient(
  customClient?: Redis | null,
  overrideUrlOrOptions?: string | RedisOptions,
  customOptions?: RedisOptions
): Redis | null {
  if (customClient !== undefined) {
    return customClient;
  }

  const overrideUrl = typeof overrideUrlOrOptions === "string" ? overrideUrlOrOptions : undefined;
  const options = typeof overrideUrlOrOptions === "object" ? overrideUrlOrOptions : customOptions;

  const rawUrl = (overrideUrl ?? process.env.REDIS_URL ?? "").trim();
  if (!rawUrl) {
    if (cachedClient) {
      try {
        cachedClient.disconnect();
      } catch {
        // Ignore disconnect errors during teardown
      }
      cachedClient = null;
      cachedUrl = null;
    }
    return null;
  }

  // Reuse existing connection if URL hasn't changed
  if (cachedClient && cachedUrl === rawUrl) {
    return cachedClient;
  }

  // Disconnect previous instance if URL changed
  if (cachedClient) {
    try {
      cachedClient.disconnect();
    } catch {
      // Ignore disconnect errors
    }
    cachedClient = null;
    cachedUrl = null;
  }

  try {
    const client = new Redis(rawUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false,
      connectTimeout: 2000,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 200, 1000);
      },
      ...options,
    });

    // CRITICAL: Prevent unhandled 'error' events from crashing Node.js runtime
    client.on("error", (err: Error) => {
      log.warn({ err }, "Redis client error (local memory fallback active)");
    });

    cachedClient = client;
    cachedUrl = rawUrl;
    return cachedClient;
  } catch (err) {
    log.error({ err }, "Failed to instantiate Redis client");
    return null;
  }
}

/**
 * Gracefully disconnects and resets the cached Redis client.
 * Essential for deterministic test isolation.
 */
export async function resetRedisClient(): Promise<void> {
  clearMemoryLocks();
  if (cachedClient) {
    try {
      cachedClient.disconnect();
    } catch {
      // Ignore disconnect errors
    }
    cachedClient = null;
    cachedUrl = null;
  }
}

/**
 * Evaluates the health status and latency of the Redis service.
 * Never blocks longer than 1500ms.
 */
export async function checkRedisHealth(clientOverride?: Redis | null): Promise<ServiceStatus> {
  if (clientOverride === undefined && !isRedisConfigured()) {
    return { status: "unconfigured" };
  }

  const client = clientOverride !== undefined ? clientOverride : getRedisClient();
  if (!client) {
    return { status: "unconfigured" };
  }

  const start = performance.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const pingPromise = (async () => {
      if (client.status === "wait") {
        await client.connect();
      }
      return await client.ping();
    })();

    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("Redis ping timed out after 1500ms")), 1500);
      timer.unref?.();
    });

    const res = await Promise.race([pingPromise, timeoutPromise]);
    const latencyMs = Math.round(performance.now() - start);

    if (res === "PONG") {
      return { status: "online", latencyMs };
    }
    return { status: "offline", error: `Unexpected ping response: ${String(res)}` };
  } catch (err) {
    return {
      status: "offline",
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

/**
 * Acquires a distributed lock with automatic fallback to local memory locks.
 *
 * @param key Lock identifier (prefixed automatically with "newsstudio:lock:")
 * @param ttlMs Time-to-live in milliseconds (default: 30,000ms)
 * @param redisOverride Optional custom Redis client (e.g. for testing)
 */
export async function acquireDistributedLock(
  key: string,
  ttlMs = 30_000,
  redisOverride?: Redis | null
): Promise<DistributedLockHandle | null> {
  const fullKey = key.startsWith("newsstudio:lock:") ? key : `newsstudio:lock:${key}`;
  const validTtlMs = Math.max(1, ttlMs);
  const token = crypto.randomUUID();
  const client = redisOverride !== undefined ? redisOverride : getRedisClient();

  if (client) {
    try {
      if (client.status === "wait") {
        await client.connect();
      }
      const res = await client.set(fullKey, token, "PX", validTtlMs, "NX");
      if (res === "OK") {
        return {
          key: fullKey,
          token,
          backend: "redis",
          expiresAt: Date.now() + validTtlMs,
        };
      }
      return null;
    } catch (err) {
      log.warn({ err, key: fullKey }, "Redis acquireDistributedLock failed; falling back to memory lock");
      return acquireMemoryLock(fullKey, token, validTtlMs);
    }
  }

  return acquireMemoryLock(fullKey, token, validTtlMs);
}

/**
 * Releases a distributed lock previously acquired with acquireDistributedLock.
 * Only releases the lock if the token matches the current lock owner.
 */
export async function releaseDistributedLock(
  handle: DistributedLockHandle,
  redisOverride?: Redis | null
): Promise<boolean> {
  if (!handle || typeof handle !== "object" || !handle.key || !handle.token) {
    return false;
  }

  if (handle.backend === "redis") {
    const client = redisOverride !== undefined ? redisOverride : getRedisClient();
    if (client) {
      try {
        if (client.status === "wait") {
          await client.connect();
        }
        const res = await client.eval(RELEASE_LOCK_LUA_SCRIPT, 1, handle.key, handle.token);
        return Number(res) === 1;
      } catch (err) {
        log.warn({ err, key: handle.key }, "Redis releaseDistributedLock failed; checking memory lock");
        return releaseMemoryLock(handle.key, handle.token);
      }
    }
  }

  return releaseMemoryLock(handle.key, handle.token);
}
