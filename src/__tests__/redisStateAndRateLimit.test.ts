/**
 * src/__tests__/redisStateAndRateLimit.test.ts
 *
 * Comprehensive Vitest suite for Phase 2:
 * Distributed Redis State, Rate Limiting & Bot Persistence (`ioredis` + `@chat-adapter/state-ioredis`).
 *
 * Verifies:
 * 1. `redisClient.ts` Zero-Crash Local Mode, lazy connect, error event safety, and health probes.
 * 2. `checkRateLimitDistributed` atomic Lua evaluation, count/PTTL window calculation, and fail-open memory fallback.
 * 3. Distributed Lock acquisition (SET PX NX) and atomic Lua owner-token release, with memory fallback.
 * 4. `newsroomBot.ts` dynamic state adapter selection (`ioredis` vs `memory`) and singleton invalidation.
 * 5. `logger.ts` automatic redaction of `redisUrl`.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventEmitter } from "events";
import { Writable } from "stream";
import { NextRequest, NextResponse } from "next/server";
import { IoRedisStateAdapter } from "@chat-adapter/state-ioredis";
import type { Redis } from "ioredis";

import {
  isRedisConfigured,
  getRedisClient,
  resetRedisClient,
  checkRedisHealth,
  acquireDistributedLock,
  releaseDistributedLock,
  clearMemoryLocks,
} from "@/lib/cache/redisClient";
import {
  checkRateLimit,
  checkRateLimitDistributed,
  clearRateLimits,
  RATE_LIMIT_LUA_SCRIPT,
} from "@/lib/security/rateLimit";
import { withTenantAuth } from "@/lib/apiHandler";
import {
  resolveBotStateAdapter,
  createNewsroomBot,
  getNewsroomBot,
  resetNewsroomBotForTests,
} from "@/lib/bot/newsroomBot";
import { createLogger, REDACT_PATHS } from "@/lib/logger";

// Mock tenant auth for API handler end-to-end tests
vi.mock("@/lib/tenant", () => ({
  requireTenant: vi.fn(),
}));
import { requireTenant } from "@/lib/tenant";

// Helper for logger output capture
function createMemoryDestination() {
  const chunks: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(chunk.toString());
      callback();
    },
  });

  return {
    stream,
    getLines(): Array<Record<string, unknown>> {
      return chunks
        .join("")
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line));
    },
    getRaw(): string {
      return chunks.join("");
    },
  };
}

// Create a mock Redis client extending EventEmitter
function createMockRedis(status = "ready"): Redis {
  const emitter = new EventEmitter();

  const mock = Object.assign(emitter, {
    status,
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockImplementation(() => {
      mock.status = "end";
    }),
    quit: vi.fn().mockResolvedValue("OK"),
    ping: vi.fn().mockResolvedValue("PONG"),
    eval: vi.fn(),
    set: vi.fn(),
    get: vi.fn(),
    del: vi.fn(),
    options: {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false,
    },
  });

  return mock as unknown as Redis;
}

describe("Phase 2: Distributed Redis State, Rate Limiting & Bot Persistence", () => {
  const originalEnv = { ...process.env };

  beforeEach(async () => {
    process.env = { ...originalEnv };
    delete process.env.REDIS_URL;
    delete process.env.SLACK_BOT_TOKEN;
    delete process.env.SLACK_SIGNING_SECRET;
    delete process.env.DISCORD_BOT_TOKEN;
    delete process.env.TELEGRAM_BOT_TOKEN;
    await resetRedisClient();
    clearRateLimits();
    clearMemoryLocks();
    resetNewsroomBotForTests();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    process.env = { ...originalEnv };
    await resetRedisClient();
    clearRateLimits();
    clearMemoryLocks();
    resetNewsroomBotForTests();
  });

  // ===========================================================================
  // 1. redisClient.ts — Zero-Crash Local Mode & Health Checks
  // ===========================================================================
  describe("1. redisClient.ts — Zero-Crash Local Mode & Health Probes", () => {
    it("returns null and reports unconfigured when REDIS_URL is unset or whitespace", async () => {
      delete process.env.REDIS_URL;
      expect(isRedisConfigured()).toBe(false);
      expect(getRedisClient()).toBeNull();

      const healthUnset = await checkRedisHealth();
      expect(healthUnset).toEqual({ status: "unconfigured" });

      process.env.REDIS_URL = "   ";
      expect(isRedisConfigured()).toBe(false);
      expect(getRedisClient()).toBeNull();

      const healthWhitespace = await checkRedisHealth();
      expect(healthWhitespace).toEqual({ status: "unconfigured" });
    });

    it("instantiates lazy client with safe configuration when REDIS_URL is set", async () => {
      process.env.REDIS_URL = "redis://127.0.0.1:6379";
      expect(isRedisConfigured()).toBe(true);

      const client = getRedisClient();
      expect(client).toBeDefined();
      expect(client?.options.lazyConnect).toBe(true);
      expect(client?.options.enableOfflineQueue).toBe(false);
      expect(client?.options.maxRetriesPerRequest).toBe(2);

      // Reuses singleton for same URL
      const client2 = getRedisClient();
      expect(client2).toBe(client);

      // Node.js EventEmitter safety: emitting 'error' does not crash the process
      expect(() => {
        client?.emit("error", new Error("Simulated connection refused"));
      }).not.toThrow();

      // Invalidate on URL change
      process.env.REDIS_URL = "redis://127.0.0.1:6380";
      const client3 = getRedisClient();
      expect(client3).toBeDefined();
      expect(client3).not.toBe(client);
    });

    it("resets cached client cleanly with resetRedisClient()", async () => {
      process.env.REDIS_URL = "redis://127.0.0.1:6379";
      const c1 = getRedisClient();
      expect(c1).toBeDefined();

      await resetRedisClient();

      const c2 = getRedisClient();
      expect(c2).toBeDefined();
      expect(c2).not.toBe(c1);
    });

    it("returns online with latencyMs when ping succeeds", async () => {
      const mock = createMockRedis("ready");
      (mock.ping as ReturnType<typeof vi.fn>).mockResolvedValue("PONG");

      const health = await checkRedisHealth(mock);
      expect(health.status).toBe("online");
      expect(typeof health.latencyMs).toBe("number");
      expect(health.latencyMs).toBeGreaterThanOrEqual(0);
      expect(mock.ping).toHaveBeenCalled();
    });

    it("connects client if in 'wait' status before pinging", async () => {
      const mock = createMockRedis("wait");
      (mock.ping as ReturnType<typeof vi.fn>).mockResolvedValue("PONG");

      const health = await checkRedisHealth(mock);
      expect(health.status).toBe("online");
      expect(mock.connect).toHaveBeenCalled();
      expect(mock.ping).toHaveBeenCalled();
    });

    it("returns offline with error message when ping rejects", async () => {
      const mock = createMockRedis("ready");
      (mock.ping as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("ECONNREFUSED 127.0.0.1:6379"));

      const health = await checkRedisHealth(mock);
      expect(health.status).toBe("offline");
      expect(health.error).toContain("ECONNREFUSED");
    });

    it("respects overrideUrl when provided to getRedisClient()", () => {
      const client = getRedisClient(undefined, "redis://override-host:6379");
      expect(client).toBeDefined();
      expect(client?.options.host).toBe("override-host");
      expect(client?.options.port).toBe(6379);
    });

    it("returns offline when ping times out after 1500ms", async () => {
      vi.useFakeTimers();
      try {
        const mock = createMockRedis("ready");
        // Never-resolving ping to trigger timeout
        (mock.ping as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

        const healthPromise = checkRedisHealth(mock);
        await vi.advanceTimersByTimeAsync(1600);

        const health = await healthPromise;
        expect(health.status).toBe("offline");
        expect(health.error).toContain("timed out after 1500ms");
      } finally {
        vi.useRealTimers();
      }
    });

    it("returns offline when ping returns an unexpected response", async () => {
      const mock = createMockRedis("ready");
      (mock.ping as ReturnType<typeof vi.fn>).mockResolvedValue("NOAUTH Authentication required");

      const health = await checkRedisHealth(mock);
      expect(health.status).toBe("offline");
      expect(health.error).toContain("Unexpected ping response");
    });
  });

  // ===========================================================================
  // 2. checkRateLimitDistributed — Distributed Sliding Window & Fail-Open
  // ===========================================================================
  describe("2. checkRateLimitDistributed — Sliding Window & Fail-Open Resilience", () => {
    it("falls back seamlessly to in-memory checkRateLimit when Redis is unconfigured", async () => {
      delete process.env.REDIS_URL;
      const config = { limit: 2, windowMs: 60000, keyPrefix: "unconf" };

      const r1 = await checkRateLimitDistributed("tenant_alpha", config);
      expect(r1.allowed).toBe(true);
      expect(r1.remaining).toBe(1);

      const r2 = await checkRateLimitDistributed("tenant_alpha", config);
      expect(r2.allowed).toBe(true);
      expect(r2.remaining).toBe(0);

      const r3 = await checkRateLimitDistributed("tenant_alpha", config);
      expect(r3.allowed).toBe(false);
      expect(r3.remaining).toBe(0);
      expect(r3.retryAfterSeconds).toBeGreaterThan(0);
    });

    it("uses atomic Redis Lua script counter and calculates window limits accurately", async () => {
      const mock = createMockRedis("ready");
      const config = { limit: 3, windowMs: 60000, keyPrefix: "api" };

      // Hit 1: count=1, PTTL=60000ms
      (mock.eval as ReturnType<typeof vi.fn>).mockResolvedValueOnce([1, 60000]);
      const r1 = await checkRateLimitDistributed("tenant_prod", config, mock);
      expect(r1.allowed).toBe(true);
      expect(r1.remaining).toBe(2);
      expect(r1.limit).toBe(3);
      expect(r1.retryAfterSeconds).toBe(60);
      expect(mock.eval).toHaveBeenCalledWith(
        RATE_LIMIT_LUA_SCRIPT,
        1,
        "newsstudio:rl:api:tenant_prod",
        "60000"
      );

      // Hit 2: count=2, PTTL=50200ms
      (mock.eval as ReturnType<typeof vi.fn>).mockResolvedValueOnce([2, 50200]);
      const r2 = await checkRateLimitDistributed("tenant_prod", config, mock);
      expect(r2.allowed).toBe(true);
      expect(r2.remaining).toBe(1);
      expect(r2.retryAfterSeconds).toBe(51);

      // Hit 3: count=3 (at limit)
      (mock.eval as ReturnType<typeof vi.fn>).mockResolvedValueOnce([3, 40000]);
      const r3 = await checkRateLimitDistributed("tenant_prod", config, mock);
      expect(r3.allowed).toBe(true);
      expect(r3.remaining).toBe(0);

      // Hit 4: count=4 (limit exceeded -> 429)
      (mock.eval as ReturnType<typeof vi.fn>).mockResolvedValueOnce([4, 30500]);
      const r4 = await checkRateLimitDistributed("tenant_prod", config, mock);
      expect(r4.allowed).toBe(false);
      expect(r4.remaining).toBe(0);
      expect(r4.retryAfterSeconds).toBe(31);
    });

    it("connects client if in 'wait' status before running Lua eval", async () => {
      const mock = createMockRedis("wait");
      (mock.eval as ReturnType<typeof vi.fn>).mockResolvedValueOnce([1, 60000]);

      const r = await checkRateLimitDistributed("tenant_lazy", { limit: 5, windowMs: 60000 }, mock);
      expect(r.allowed).toBe(true);
      expect(mock.connect).toHaveBeenCalled();
    });

    it("fails open to local in-memory bucket when Redis eval throws network error", async () => {
      const mock = createMockRedis("ready");
      (mock.eval as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("ECONNREFUSED"));

      const config = { limit: 2, windowMs: 60000, keyPrefix: "failopen" };

      // Should log warning and fall back to in-memory check without throwing!
      const r1 = await checkRateLimitDistributed("tenant_broken", config, mock);
      expect(r1.allowed).toBe(true);
      expect(r1.remaining).toBe(1);

      const r2 = await checkRateLimitDistributed("tenant_broken", config, mock);
      expect(r2.allowed).toBe(true);
      expect(r2.remaining).toBe(0);

      const r3 = await checkRateLimitDistributed("tenant_broken", config, mock);
      expect(r3.allowed).toBe(false);
      expect(r3.remaining).toBe(0);
    });

    it("fails open to local memory bucket when client.connect() throws network error", async () => {
      const mock = createMockRedis("wait");
      (mock.connect as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("ECONNREFUSED connect"));

      const config = { limit: 1, windowMs: 60000, keyPrefix: "connect_fail" };
      const r1 = await checkRateLimitDistributed("tenant_conn_fail", config, mock);
      expect(r1.allowed).toBe(true);

      const r2 = await checkRateLimitDistributed("tenant_conn_fail", config, mock);
      expect(r2.allowed).toBe(false);
    });

    it("enforces rate limits inside withTenantAuth wrapper with distributed checks", async () => {
      vi.mocked(requireTenant).mockResolvedValue({
        ok: true,
        tenant: {
          userId: "user_test_tenant",
          orgId: "org_dist_tenant",
          isDefaultOrg: false,
        },
      });

      const handler = vi.fn().mockImplementation(() => NextResponse.json({ ok: true }));
      const wrapped = withTenantAuth(handler, {
        rateLimit: { limit: 1, windowMs: 60000, keyPrefix: "route" },
      });

      const req = new NextRequest("http://localhost:3000/api/ai/generate");

      // First request passes
      const res1 = await wrapped(req, { params: Promise.resolve({}) });
      expect(res1.status).toBe(200);
      expect(res1.headers.get("X-RateLimit-Remaining")).toBe("0");

      // Second request blocked with 429
      const res2 = await wrapped(req, { params: Promise.resolve({}) });
      expect(res2.status).toBe(429);
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // 3. Distributed Locks (acquireDistributedLock / releaseDistributedLock)
  // ===========================================================================
  describe("3. Distributed Locks — SET PX NX & Atomic Owner-Token Release", () => {
    it("acquires and releases distributed lock via Redis when client is healthy", async () => {
      const mock = createMockRedis("ready");
      (mock.set as ReturnType<typeof vi.fn>).mockResolvedValueOnce("OK");
      (mock.eval as ReturnType<typeof vi.fn>).mockResolvedValueOnce(1);

      const handle = await acquireDistributedLock("stock_sync", 15000, mock);
      expect(handle).not.toBeNull();
      expect(handle?.key).toBe("newsstudio:lock:stock_sync");
      expect(handle?.backend).toBe("redis");
      expect(typeof handle?.token).toBe("string");
      expect(handle?.expiresAt).toBeGreaterThan(Date.now());
      expect(mock.set).toHaveBeenCalledWith(
        "newsstudio:lock:stock_sync",
        handle?.token,
        "PX",
        15000,
        "NX"
      );

      const released = await releaseDistributedLock(handle!, mock);
      expect(released).toBe(true);
      expect(mock.eval).toHaveBeenCalledWith(
        expect.stringContaining("redis.call(\"get\", KEYS[1]) == ARGV[1]"),
        1,
        handle?.key,
        handle?.token
      );
    });

    it("normalizes lock key when already prefixed with newsstudio:lock:", async () => {
      const mock = createMockRedis("ready");
      (mock.set as ReturnType<typeof vi.fn>).mockResolvedValueOnce("OK");

      const handle = await acquireDistributedLock("newsstudio:lock:already_prefixed", 10000, mock);
      expect(handle?.key).toBe("newsstudio:lock:already_prefixed");
      expect(mock.set).toHaveBeenCalledWith(
        "newsstudio:lock:already_prefixed",
        expect.any(String),
        "PX",
        10000,
        "NX"
      );
    });

    it("returns false gracefully when releasing null or malformed handle", async () => {
      expect(await releaseDistributedLock(null as any)).toBe(false);
      expect(await releaseDistributedLock(undefined as any)).toBe(false);
      expect(await releaseDistributedLock({} as any)).toBe(false);
      expect(await releaseDistributedLock({ key: "newsstudio:lock:foo" } as any)).toBe(false);
    });

    it("returns null when Redis lock is already held by another process", async () => {
      const mock = createMockRedis("ready");
      (mock.set as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

      const handle = await acquireDistributedLock("stock_sync", 15000, mock);
      expect(handle).toBeNull();
    });

    it("returns false when releasing a lock with mismatched owner token or already expired", async () => {
      const mock = createMockRedis("ready");
      (mock.eval as ReturnType<typeof vi.fn>).mockResolvedValueOnce(0);

      const handle = {
        key: "newsstudio:lock:already_expired",
        token: "expired_token_123",
        backend: "redis" as const,
        expiresAt: Date.now() - 1000,
      };

      const released = await releaseDistributedLock(handle, mock);
      expect(released).toBe(false);
    });

    it("falls back cleanly to in-memory lock map when Redis is unconfigured", async () => {
      delete process.env.REDIS_URL;

      const lock1 = await acquireDistributedLock("in_memory_job", 5000, null);
      expect(lock1).not.toBeNull();
      expect(lock1?.backend).toBe("memory");

      // Second concurrent acquire for same key should fail
      const lock2 = await acquireDistributedLock("in_memory_job", 5000, null);
      expect(lock2).toBeNull();

      // Release allows re-acquisition
      const released = await releaseDistributedLock(lock1!, null);
      expect(released).toBe(true);

      const lock3 = await acquireDistributedLock("in_memory_job", 5000, null);
      expect(lock3).not.toBeNull();
      expect(lock3?.backend).toBe("memory");
    });

    it("falls back to memory lock if Redis set throws network error", async () => {
      const mock = createMockRedis("ready");
      (mock.set as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Socket closed"));

      const handle = await acquireDistributedLock("faulty_lock", 5000, mock);
      expect(handle).not.toBeNull();
      expect(handle?.backend).toBe("memory");

      const released = await releaseDistributedLock(handle!, mock);
      expect(released).toBe(true);
    });

    it("returns false and does not throw when Redis eval throws during release", async () => {
      const mock = createMockRedis("ready");
      (mock.eval as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Connection lost during eval"));

      const handle = {
        key: "newsstudio:lock:eval_err",
        token: "token_abc",
        backend: "redis" as const,
        expiresAt: Date.now() + 10000,
      };

      const released = await releaseDistributedLock(handle, mock);
      expect(released).toBe(false);
    });
  });

  // ===========================================================================
  // 4. newsroomBot.ts — State Adapter Selection & Invalidation
  // ===========================================================================
  describe("4. newsroomBot.ts — State Adapter Selection & Singleton Invalidation", () => {
    it("uses in-memory state adapter when REDIS_URL is unset", () => {
      delete process.env.REDIS_URL;

      const resolved = resolveBotStateAdapter();
      expect(resolved.backend).toBe("memory");

      const bot = createNewsroomBot();
      expect(bot.stateBackend).toBe("memory");
    });

    it("uses IoRedisStateAdapter when REDIS_URL is configured", () => {
      process.env.REDIS_URL = "redis://localhost:6379";

      const resolved = resolveBotStateAdapter();
      expect(resolved.backend).toBe("ioredis");
      expect(resolved.state).toBeInstanceOf(IoRedisStateAdapter);

      const bot = createNewsroomBot({ redisUrl: "redis://localhost:6379" });
      expect(bot.stateBackend).toBe("ioredis");
    });

    it("uses IoRedisStateAdapter when explicit redisClient is provided", () => {
      const mock = createMockRedis("ready");
      const resolved = resolveBotStateAdapter({ redisClient: mock });
      expect(resolved.backend).toBe("ioredis");
      expect(resolved.state).toBeInstanceOf(IoRedisStateAdapter);
    });

    it("re-evaluates bot singleton when process.env.REDIS_URL changes", () => {
      delete process.env.REDIS_URL;
      resetNewsroomBotForTests();

      const botMemory = getNewsroomBot();
      expect(botMemory.stateBackend).toBe("memory");

      // Update env
      process.env.REDIS_URL = "redis://localhost:6379";

      const botRedis = getNewsroomBot();
      expect(botRedis.stateBackend).toBe("ioredis");
      expect(botRedis).not.toBe(botMemory);
    });

    it("preserves explicit custom stateAdapter override regardless of REDIS_URL", () => {
      process.env.REDIS_URL = "redis://localhost:6379";
      const customAdapter = {
        connect: vi.fn(),
        disconnect: vi.fn(),
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
      };

      const resolved = resolveBotStateAdapter({ stateAdapter: customAdapter as unknown as IoRedisStateAdapter });
      expect(resolved.backend).toBe("memory");
      expect(resolved.state).toBe(customAdapter);
    });

    it("falls back gracefully to memory state if Redis state adapter fails instantiation", () => {
      const resolved = resolveBotStateAdapter({ redisUrl: "redis://localhost:99999999" });
      expect(resolved.backend).toBe("memory");
      expect(resolved.state).toBeDefined();
    });
  });

  // ===========================================================================
  // 5. logger.ts — Redaction of redisUrl
  // ===========================================================================
  describe("5. logger.ts — Automatic Redaction of redisUrl", () => {
    it("verifies redisUrl paths are registered in REDACT_PATHS constant", () => {
      expect(REDACT_PATHS).toContain("redisUrl");
      expect(REDACT_PATHS).toContain("*.redisUrl");
      expect(REDACT_PATHS).toContain("*.*.redisUrl");
    });

    it("redacts top-level and nested redisUrl strings from serialized logs", () => {
      const dest = createMemoryDestination();
      const testLogger = createLogger(
        { module: "redisRedactionTest" },
        { level: "info", destination: dest.stream }
      );

      testLogger.info(
        {
          redisUrl: "rediss://default:supersecretpassword@upstash.io:6379",
          nested: {
            redisUrl: "redis://user:nestedpassword@10.0.0.1:6379",
          },
          safeInfo: "redis-cluster-primary",
        },
        "Initialized distributed cache"
      );

      const raw = dest.getRaw();
      const lines = dest.getLines();
      expect(lines).toHaveLength(1);

      // Verify raw secrets are nowhere in the output
      expect(raw).not.toContain("supersecretpassword");
      expect(raw).not.toContain("nestedpassword");

      // Verify redaction placeholder
      const line = lines[0];
      expect(line.redisUrl).toBe("[REDACTED]");
      expect((line.nested as Record<string, unknown>).redisUrl).toBe("[REDACTED]");
      expect(line.safeInfo).toBe("redis-cluster-primary");
    });
  });
});
