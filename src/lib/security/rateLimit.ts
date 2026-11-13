/**
 * src/lib/security/rateLimit.ts
 *
 * In-memory sliding-window token bucket rate limiter.
 * Protects expensive AI generation, video rendering, and file upload endpoints
 * from denial-of-service (DoS) and resource exhaustion attacks ([SEC-23]).
 */

import { NextResponse } from "next/server";
import type { Redis } from "ioredis";
import { getRedisClient } from "@/lib/cache/redisClient";
import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "rateLimit" });

export const RATE_LIMIT_LUA_SCRIPT = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
local pttl = redis.call("PTTL", KEYS[1])
if pttl < 0 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
  pttl = tonumber(ARGV[1])
end
return { current, pttl }
`;

export interface RateLimitConfig {
  limit: number;
  windowMs: number;
  keyPrefix?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number; // Unix timestamp in milliseconds
  retryAfterSeconds: number;
}

export const RateLimitTiers = {
  /** Heavy AI operations: Remotion render, Gemini generation, TTS synthesis, GPU talking heads */
  AI_EXPENSIVE: { limit: 15, windowMs: 60 * 1000 } as RateLimitConfig,
  /** File uploads to storage or S3 */
  UPLOADS: { limit: 30, windowMs: 60 * 1000 } as RateLimitConfig,
  /** Standard API operations */
  API_STANDARD: { limit: 120, windowMs: 60 * 1000 } as RateLimitConfig,
  /** Authentication and sensitive operations */
  AUTH: { limit: 10, windowMs: 60 * 1000 } as RateLimitConfig,
};

interface BucketEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, BucketEntry>();

// Sweeper interval to remove expired buckets and prevent memory growth
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 60 * 1000;

function cleanupExpiredBuckets(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;

  lastCleanup = now;
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now >= entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Evaluates whether a given key has exceeded the specified rate limit.
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  cleanupExpiredBuckets();

  const now = Date.now();
  const bucketKey = `${config.keyPrefix ? config.keyPrefix + ":" : ""}${key}`;
  const entry = rateLimitStore.get(bucketKey);

  if (!entry || now >= entry.resetTime) {
    // New or expired window
    const resetTime = now + config.windowMs;
    rateLimitStore.set(bucketKey, { count: 1, resetTime });
    return {
      allowed: true,
      limit: config.limit,
      remaining: config.limit - 1,
      resetTime,
      retryAfterSeconds: Math.ceil(config.windowMs / 1000),
    };
  }

  // Existing active window
  entry.count += 1;
  const remaining = Math.max(0, config.limit - entry.count);
  const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetTime - now) / 1000));
  const allowed = entry.count <= config.limit;

  return {
    allowed,
    limit: config.limit,
    remaining,
    resetTime: entry.resetTime,
    retryAfterSeconds,
  };
}

/**
 * Evaluates whether a given key has exceeded the specified rate limit using atomic
 * Redis Lua script counter (INCR + PEXPIRE) when REDIS_URL is configured.
 * Automatically falls back to the local in-memory sliding bucket if Redis is unconfigured
 * or encounters a network error (fail-open to local memory, never crashing API requests!).
 */
export async function checkRateLimitDistributed(
  key: string,
  config: RateLimitConfig,
  redisOverride?: Redis | null
): Promise<RateLimitResult> {
  const client = redisOverride !== undefined ? redisOverride : getRedisClient();
  if (!client) {
    return checkRateLimit(key, config);
  }

  const redisKey = `newsstudio:rl:${config.keyPrefix ? config.keyPrefix + ":" : ""}${key}`;

  try {
    if (client.status === "wait") {
      await client.connect();
    }
    const raw = (await client.eval(
      RATE_LIMIT_LUA_SCRIPT,
      1,
      redisKey,
      String(config.windowMs)
    )) as [number, number];

    const count = Number(raw?.[0] ?? 1);
    const pttlMs = Math.max(1, Number(raw?.[1] ?? config.windowMs));
    const now = Date.now();
    const resetTime = now + pttlMs;
    const remaining = Math.max(0, config.limit - count);
    const retryAfterSeconds = Math.max(1, Math.ceil(pttlMs / 1000));
    const allowed = count <= config.limit;

    return {
      allowed,
      limit: config.limit,
      remaining,
      resetTime,
      retryAfterSeconds,
    };
  } catch (err) {
    log.warn(
      { err, key: redisKey },
      "Redis rate limit check failed; falling back to local memory bucket"
    );
    return checkRateLimit(key, config);
  }
}

/**
 * Builds standard RFC rate limit headers for HTTP responses.
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": Math.ceil(result.resetTime / 1000).toString(),
  };

  if (!result.allowed) {
    headers["Retry-After"] = result.retryAfterSeconds.toString();
  }

  return headers;
}

/**
 * Generates an HTTP 429 Too Many Requests response with appropriate rate limit headers.
 */
export function rateLimitResponse(result: RateLimitResult, message?: string): NextResponse {
  return NextResponse.json(
    {
      error: message || "Too many requests. Please slow down.",
      retryAfter: result.retryAfterSeconds,
    },
    {
      status: 429,
      headers: getRateLimitHeaders(result),
    }
  );
}

/**
 * Clears all rate limit buckets (useful for test isolation).
 */
export function clearRateLimits(): void {
  rateLimitStore.clear();
}
