/**
 * src/__tests__/logger.test.ts
 *
 * Comprehensive test suite for Structured Logging & OpenTelemetry Trace Correlation (pino).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Writable } from "stream";
import { trace } from "@opentelemetry/api";
import {
  createLogger,
  createRootLogger,
  createChatSdkLogger,
  resolveLogLevel,
  REDACT_PATHS,
  logger,
} from "@/lib/logger";
import { createNewsroomBot } from "@/lib/bot/newsroomBot";

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
      const raw = chunks.join("");
      return raw
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line));
    },
    getRaw(): string {
      return chunks.join("");
    },
    clear() {
      chunks.length = 0;
    },
  };
}

describe("Phase 1: Canonical Structured Logger (Pino + OpenTelemetry)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. Structured JSON output and Child Bindings
  // =========================================================================
  describe("Structured JSON Output & Bindings", () => {
    it("emits structured JSON with ISO time, readable level label, and child bindings", () => {
      const dest = createMemoryDestination();
      const testLogger = createLogger(
        {
          module: "audioWorker",
          companyId: "org_enterprise_1",
          storyId: "story_breaking_99",
          jobId: "job_tts_101",
          workerId: "worker-node-1",
        },
        { level: "debug", destination: dest.stream }
      );

      testLogger.info("TTS generation finished");

      const lines = dest.getLines();
      expect(lines).toHaveLength(1);
      const line = lines[0];

      expect(line.level).toBe("info");
      expect(line.msg).toBe("TTS generation finished");
      expect(line.module).toBe("audioWorker");
      expect(line.companyId).toBe("org_enterprise_1");
      expect(line.storyId).toBe("story_breaking_99");
      expect(line.jobId).toBe("job_tts_101");
      expect(line.workerId).toBe("worker-node-1");

      // Verify ISO timestamp format (e.g. 2026-10-30T21:00:00.000Z)
      expect(typeof line.time).toBe("string");
      expect(line.time).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it("omits undefined properties from log bindings so output remains clean", () => {
      const dest = createMemoryDestination();
      const testLogger = createLogger(
        {
          module: "scriptEngine",
          companyId: undefined,
          storyId: undefined,
          jobId: "job_presenter_5",
        },
        { level: "info", destination: dest.stream }
      );

      testLogger.info("Script compiled");

      const lines = dest.getLines();
      expect(lines).toHaveLength(1);
      const line = lines[0];

      expect(line.module).toBe("scriptEngine");
      expect(line.jobId).toBe("job_presenter_5");
      expect("companyId" in line).toBe(false);
      expect("storyId" in line).toBe(false);
      expect("workerId" in line).toBe(false);
    });

    it("accepts a string namespace as bindings parameter for backward compatibility", () => {
      const dest = createMemoryDestination();
      const testLogger = createLogger("inngest:cleanup-cron", {
        level: "info",
        destination: dest.stream,
      });

      testLogger.info("Storage cleanup started");

      const lines = dest.getLines();
      expect(lines).toHaveLength(1);
      expect(lines[0].module).toBe("inngest:cleanup-cron");
      expect(lines[0].msg).toBe("Storage cleanup started");
    });

    it("provides canonical root logger instance", () => {
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe("function");
      expect(typeof logger.child).toBe("function");
    });

    it("creates child logger of canonical root when called without options", () => {
      const child = createLogger({ module: "defaultChildModule", companyId: "test_comp_1" });
      expect(child).toBeDefined();
      expect(child.bindings().module).toBe("defaultChildModule");
      expect(child.bindings().companyId).toBe("test_comp_1");
    });

    it("serializes error objects using standard error serializer", () => {
      const dest = createMemoryDestination();
      const testLogger = createLogger(
        { module: "errorSerializerTest" },
        { level: "error", destination: dest.stream }
      );

      const testError = new TypeError("Failed to parse segment payload");
      testLogger.error({ err: testError }, "Segment parsing failed");

      const lines = dest.getLines();
      expect(lines).toHaveLength(1);
      const line = lines[0];
      expect(line.msg).toBe("Segment parsing failed");
      const err = line.err as Record<string, unknown>;
      expect(err.type).toBe("TypeError");
      expect(err.message).toBe("Failed to parse segment payload");
      expect(typeof err.stack).toBe("string");
    });
  });

  // =========================================================================
  // 2. Secret Redaction across Top-Level, Nested Objects, and Headers
  // =========================================================================
  describe("Automatic Secret Redaction", () => {
    it("redacts top-level, nested credentials, and sensitive HTTP headers without leaking raw secrets", () => {
      const dest = createMemoryDestination();
      const testLogger = createLogger(
        { module: "securityRedactionTest" },
        { level: "debug", destination: dest.stream }
      );

      const secretPayload = {
        apiKey: "sk-live-raw-top-level-api-key-12345",
        geminiApiKey: "AIzaSyRawGeminiKeySecret999888777",
        openaiCompatibleApiKey: "sk-proj-rawOpenAiCompatKey111222",
        botToken: "xoxb-raw-slack-bot-token-333444",
        signingSecret: "raw-slack-signing-secret-555666",
        secretToken: "raw-telegram-secret-token-777888",
        password: "MySuperSecretAdminPassword!",
        secret: "super-secret-jwt-signing-seed",
        token: "bearer-token-raw-value-999000",
        accessToken: "access-token-raw-secret-1234",
        refreshToken: "refresh-token-raw-secret-5678",
        nested: {
          apiKey: "nested-sk-live-raw-key",
          geminiApiKey: "nested-AIza-raw-gemini-key",
          openaiCompatibleApiKey: "nested-sk-proj-raw-openai",
          botToken: "nested-xoxb-raw-bot-token",
          signingSecret: "nested-raw-signing-secret",
          secretToken: "nested-raw-secret-token",
          password: "nested-raw-password-12345",
          secret: "nested-raw-secret-data",
          token: "nested-raw-token-data",
        },
        req: {
          headers: {
            authorization: "Bearer sensitive-jwt-bearer-token-here",
            cookie: "session_id=confidential_session_cookie_value",
            "x-worker-key": "worker-secret-passphrase-raw-value",
          },
        },
        headers: {
          authorization: "Bearer direct-headers-bearer-token",
          cookie: "auth_token=direct_cookie_secret",
          "x-worker-key": "direct-worker-header-secret",
        },
        "x-worker-key": "top-level-worker-header-secret",
        nonSensitiveField: "safe-public-identifier",
      };

      testLogger.info(secretPayload, "Dispatched secure pipeline payload");

      const rawOutput = dest.getRaw();
      const lines = dest.getLines();
      expect(lines).toHaveLength(1);
      const line = lines[0] as Record<string, unknown>;

      // 1. Assert raw secrets NEVER appear anywhere in the serialized log string
      expect(rawOutput).not.toContain("sk-live-raw-top-level-api-key-12345");
      expect(rawOutput).not.toContain("AIzaSyRawGeminiKeySecret999888777");
      expect(rawOutput).not.toContain("sk-proj-rawOpenAiCompatKey111222");
      expect(rawOutput).not.toContain("xoxb-raw-slack-bot-token-333444");
      expect(rawOutput).not.toContain("raw-slack-signing-secret-555666");
      expect(rawOutput).not.toContain("raw-telegram-secret-token-777888");
      expect(rawOutput).not.toContain("MySuperSecretAdminPassword!");
      expect(rawOutput).not.toContain("super-secret-jwt-signing-seed");
      expect(rawOutput).not.toContain("bearer-token-raw-value-999000");
      expect(rawOutput).not.toContain("access-token-raw-secret-1234");
      expect(rawOutput).not.toContain("refresh-token-raw-secret-5678");
      expect(rawOutput).not.toContain("nested-sk-live-raw-key");
      expect(rawOutput).not.toContain("nested-AIza-raw-gemini-key");
      expect(rawOutput).not.toContain("sensitive-jwt-bearer-token-here");
      expect(rawOutput).not.toContain("confidential_session_cookie_value");
      expect(rawOutput).not.toContain("worker-secret-passphrase-raw-value");
      expect(rawOutput).not.toContain("direct-headers-bearer-token");
      expect(rawOutput).not.toContain("direct_cookie_secret");
      expect(rawOutput).not.toContain("direct-worker-header-secret");
      expect(rawOutput).not.toContain("top-level-worker-header-secret");

      // 2. Assert values are replaced with [REDACTED]
      expect(line.apiKey).toBe("[REDACTED]");
      expect(line.geminiApiKey).toBe("[REDACTED]");
      expect(line.openaiCompatibleApiKey).toBe("[REDACTED]");
      expect(line.botToken).toBe("[REDACTED]");
      expect(line.signingSecret).toBe("[REDACTED]");
      expect(line.secretToken).toBe("[REDACTED]");
      expect(line.password).toBe("[REDACTED]");
      expect(line.secret).toBe("[REDACTED]");
      expect(line.token).toBe("[REDACTED]");
      expect(line.accessToken).toBe("[REDACTED]");
      expect(line.refreshToken).toBe("[REDACTED]");
      expect(line["x-worker-key"]).toBe("[REDACTED]");

      const nested = line.nested as Record<string, unknown>;
      expect(nested.apiKey).toBe("[REDACTED]");
      expect(nested.geminiApiKey).toBe("[REDACTED]");
      expect(nested.openaiCompatibleApiKey).toBe("[REDACTED]");
      expect(nested.botToken).toBe("[REDACTED]");
      expect(nested.signingSecret).toBe("[REDACTED]");
      expect(nested.secretToken).toBe("[REDACTED]");
      expect(nested.password).toBe("[REDACTED]");
      expect(nested.secret).toBe("[REDACTED]");
      expect(nested.token).toBe("[REDACTED]");

      const reqHeaders = (line.req as Record<string, unknown>).headers as Record<string, unknown>;
      expect(reqHeaders.authorization).toBe("[REDACTED]");
      expect(reqHeaders.cookie).toBe("[REDACTED]");
      expect(reqHeaders["x-worker-key"]).toBe("[REDACTED]");

      const directHeaders = line.headers as Record<string, unknown>;
      expect(directHeaders.authorization).toBe("[REDACTED]");
      expect(directHeaders.cookie).toBe("[REDACTED]");
      expect(directHeaders["x-worker-key"]).toBe("[REDACTED]");

      // Safe fields are untouched
      expect(line.nonSensitiveField).toBe("safe-public-identifier");
    });

    it("verifies REDACT_PATHS constant exports expected security patterns", () => {
      expect(REDACT_PATHS).toContain("apiKey");
      expect(REDACT_PATHS).toContain("*.apiKey");
      expect(REDACT_PATHS).toContain("geminiApiKey");
      expect(REDACT_PATHS).toContain("openaiCompatibleApiKey");
      expect(REDACT_PATHS).toContain("botToken");
      expect(REDACT_PATHS).toContain("signingSecret");
      expect(REDACT_PATHS).toContain("req.headers.authorization");
      expect(REDACT_PATHS).toContain("headers.authorization");
      expect(REDACT_PATHS).toContain('req.headers["x-worker-key"]');
    });

    it("redacts Title-Case and alternative HTTP headers (Authorization, Cookie, X-Worker-Key, X-Api-Key)", () => {
      const dest = createMemoryDestination();
      const testLogger = createLogger(
        { module: "titleCaseHeaderTest" },
        { level: "debug", destination: dest.stream }
      );

      testLogger.info(
        {
          headers: {
            Authorization: "Bearer sensitive-title-case-token",
            Cookie: "session=title-case-cookie-secret",
            "X-Worker-Key": "title-worker-secret-pass",
            "X-Api-Key": "title-api-key-secret",
          },
          req: {
            headers: {
              Authorization: "Bearer req-title-token",
              Cookie: "user_session=req-title-cookie",
              "X-Worker-Key": "req-title-worker-key",
              "X-Api-Key": "req-title-api-key",
            },
          },
          "X-Worker-Key": "top-level-title-worker-key",
          "x-api-key": "top-level-x-api-key",
        },
        "Emitted title case headers"
      );

      const raw = dest.getRaw();
      expect(raw).not.toContain("sensitive-title-case-token");
      expect(raw).not.toContain("title-case-cookie-secret");
      expect(raw).not.toContain("title-worker-secret-pass");
      expect(raw).not.toContain("title-api-key-secret");
      expect(raw).not.toContain("req-title-token");
      expect(raw).not.toContain("req-title-cookie");
      expect(raw).not.toContain("req-title-worker-key");
      expect(raw).not.toContain("req-title-api-key");
      expect(raw).not.toContain("top-level-title-worker-key");
      expect(raw).not.toContain("top-level-x-api-key");

      const line = dest.getLines()[0];
      const headers = line.headers as Record<string, unknown>;
      expect(headers.Authorization).toBe("[REDACTED]");
      expect(headers.Cookie).toBe("[REDACTED]");
      expect(headers["X-Worker-Key"]).toBe("[REDACTED]");
      expect(headers["X-Api-Key"]).toBe("[REDACTED]");
    });
  });

  // =========================================================================
  // 3. OpenTelemetry Trace Correlation (mixin)
  // =========================================================================
  describe("OpenTelemetry Trace Correlation", () => {
    it("does not inject traceId or spanId when there is no active span", () => {
      vi.spyOn(trace, "getActiveSpan").mockReturnValue(undefined);

      const dest = createMemoryDestination();
      const testLogger = createLogger(
        { module: "otelTestNoSpan" },
        { level: "info", destination: dest.stream }
      );

      testLogger.info("Operation with no trace");

      const lines = dest.getLines();
      expect(lines).toHaveLength(1);
      expect("traceId" in lines[0]).toBe(false);
      expect("spanId" in lines[0]).toBe(false);
    });

    it("does not inject traceId or spanId when span context contains all zeros", () => {
      const mockSpan = {
        spanContext: () => ({
          traceId: "00000000000000000000000000000000",
          spanId: "0000000000000000",
          traceFlags: 0,
        }),
      };
      vi.spyOn(trace, "getActiveSpan").mockReturnValue(mockSpan as unknown as ReturnType<typeof trace.getActiveSpan>);

      const dest = createMemoryDestination();
      const testLogger = createLogger(
        { module: "otelTestZeroSpan" },
        { level: "info", destination: dest.stream }
      );

      testLogger.info("Operation with invalid zero trace");

      const lines = dest.getLines();
      expect(lines).toHaveLength(1);
      expect("traceId" in lines[0]).toBe(false);
      expect("spanId" in lines[0]).toBe(false);
    });

    it("automatically injects traceId and spanId when an active OpenTelemetry span exists", () => {
      const activeTraceId = "4bf92f3577b34da6a3ce929d0e0e4736";
      const activeSpanId = "00f067aa0ba902b7";

      const mockSpan = {
        spanContext: () => ({
          traceId: activeTraceId,
          spanId: activeSpanId,
          traceFlags: 1,
        }),
      };
      vi.spyOn(trace, "getActiveSpan").mockReturnValue(mockSpan as unknown as ReturnType<typeof trace.getActiveSpan>);

      const dest = createMemoryDestination();
      const testLogger = createLogger(
        { module: "otelTestActiveSpan" },
        { level: "info", destination: dest.stream }
      );

      testLogger.info("Operation within distributed trace");

      const lines = dest.getLines();
      expect(lines).toHaveLength(1);
      expect(lines[0].traceId).toBe(activeTraceId);
      expect(lines[0].spanId).toBe(activeSpanId);
      expect(lines[0].msg).toBe("Operation within distributed trace");
    });

    it("safely handles exceptions in trace.getActiveSpan() without throwing or failing logs", () => {
      vi.spyOn(trace, "getActiveSpan").mockImplementation(() => {
        throw new Error("Telemetry provider exploded");
      });

      const dest = createMemoryDestination();
      const testLogger = createLogger(
        { module: "otelThrowingTest" },
        { level: "info", destination: dest.stream }
      );

      expect(() => {
        testLogger.info("Log should not crash even if OTel throws");
      }).not.toThrow();

      const lines = dest.getLines();
      expect(lines).toHaveLength(1);
      expect(lines[0].msg).toBe("Log should not crash even if OTel throws");
      expect("traceId" in lines[0]).toBe(false);
    });
  });

  // =========================================================================
  // 4. Log Level Resolution & Test Environment Safety
  // =========================================================================
  describe("Log Level Resolution", () => {
    it("defaults to silent when NODE_ENV === 'test' and no override is provided", () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = "test";
      delete process.env.LOG_LEVEL;

      expect(resolveLogLevel()).toBe("silent");
    });

    it("respects explicit overrideLevel parameter over environment variables", () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = "test";
      process.env.LOG_LEVEL = "silent";

      expect(resolveLogLevel("debug")).toBe("debug");
      expect(resolveLogLevel("WARN")).toBe("warn");
    });

    it("respects LOG_LEVEL environment variable (case-insensitive)", () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = "test";

      process.env.LOG_LEVEL = "debug";
      expect(resolveLogLevel()).toBe("debug");

      process.env.LOG_LEVEL = "WARN";
      expect(resolveLogLevel()).toBe("warn");

      process.env.LOG_LEVEL = "Error";
      expect(resolveLogLevel()).toBe("error");

      process.env.LOG_LEVEL = "trace";
      expect(resolveLogLevel()).toBe("trace");
    });

    it("falls back to test default (silent) on invalid LOG_LEVEL string in test environment", () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = "test";
      process.env.LOG_LEVEL = "unrecognized_level";

      expect(resolveLogLevel()).toBe("silent");
    });

    it("defaults to info in non-test environment when LOG_LEVEL is unset", () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = "production";
      delete process.env.LOG_LEVEL;

      expect(resolveLogLevel()).toBe("info");
    });

    it("does not emit output when resolved level is silent", () => {
      const dest = createMemoryDestination();
      const silentLogger = createRootLogger({ level: "silent", destination: dest.stream });

      silentLogger.info("This should not be written");
      silentLogger.error("This should not be written either");

      expect(dest.getLines()).toHaveLength(0);
    });
  });

  // =========================================================================
  // 5. Chat SDK Logger Adapter (createChatSdkLogger)
  // =========================================================================
  describe("Chat SDK Logger Adapter", () => {
    it("bridges plain message calls to pino structured levels", () => {
      const dest = createMemoryDestination();
      const base = createLogger({ module: "botAdapterTest" }, { level: "debug", destination: dest.stream });
      const chatLogger = createChatSdkLogger("newsroomBot", base);

      chatLogger.debug("Debug event");
      chatLogger.info("Info event");
      chatLogger.warn("Warn event");
      chatLogger.error("Error event");

      const lines = dest.getLines();
      expect(lines).toHaveLength(4);
      expect(lines[0].level).toBe("debug");
      expect(lines[0].msg).toBe("Debug event");
      expect(lines[1].level).toBe("info");
      expect(lines[1].msg).toBe("Info event");
      expect(lines[2].level).toBe("warn");
      expect(lines[2].msg).toBe("Warn event");
      expect(lines[3].level).toBe("error");
      expect(lines[3].msg).toBe("Error event");
    });

    it("bridges Error objects into structured { err } pino fields", () => {
      const dest = createMemoryDestination();
      const base = createLogger({ module: "botAdapterTest" }, { level: "debug", destination: dest.stream });
      const chatLogger = createChatSdkLogger("newsroomBot", base);

      const testError = new Error("Slack webhook failed");
      chatLogger.error("Webhook dispatch failure", testError);

      const lines = dest.getLines();
      expect(lines).toHaveLength(1);
      const line = lines[0] as Record<string, unknown>;
      expect(line.level).toBe("error");
      expect(line.msg).toBe("Webhook dispatch failure");
      expect(line.err).toBeDefined();
      expect((line.err as Record<string, unknown>).message).toBe("Slack webhook failed");
    });

    it("bridges non-Error metadata into { details } pino fields", () => {
      const dest = createMemoryDestination();
      const base = createLogger({ module: "botAdapterTest" }, { level: "debug", destination: dest.stream });
      const chatLogger = createChatSdkLogger("newsroomBot", base);

      chatLogger.warn("Rate limit approached", { remaining: 5, resetSec: 12 });

      const lines = dest.getLines();
      expect(lines).toHaveLength(1);
      const line = lines[0] as Record<string, unknown>;
      expect(line.level).toBe("warn");
      expect(line.msg).toBe("Rate limit approached");
      expect(line.details).toEqual({ remaining: 5, resetSec: 12 });
    });

    it("bridges multiple arguments into { details: [...] } array", () => {
      const dest = createMemoryDestination();
      const base = createLogger({ module: "botAdapterTest" }, { level: "debug", destination: dest.stream });
      const chatLogger = createChatSdkLogger("newsroomBot", base);

      chatLogger.info("Multi-argument notice", "target-channel-1", 42, { flag: true });

      const lines = dest.getLines();
      expect(lines).toHaveLength(1);
      const line = lines[0] as Record<string, unknown>;
      expect(line.details).toEqual(["target-channel-1", 42, { flag: true }]);
    });

    it("supports child sub-prefix chaining with chatComponent updates", () => {
      const dest = createMemoryDestination();
      const base = createLogger({ module: "botAdapterTest" }, { level: "debug", destination: dest.stream });
      const chatLogger = createChatSdkLogger("newsroomBot", base);

      const slackLogger = chatLogger.child("slack");
      slackLogger.info("Slack adapter connected");

      const webhookLogger = slackLogger.child("webhook");
      webhookLogger.info("Webhook event received");

      const lines = dest.getLines();
      expect(lines).toHaveLength(2);
      expect(lines[0].chatComponent).toBe("newsroomBot:slack");
      expect(lines[0].msg).toBe("Slack adapter connected");

      expect(lines[1].chatComponent).toBe("newsroomBot:slack:webhook");
      expect(lines[1].msg).toBe("Webhook event received");
    });

    it("plugs cleanly into createNewsroomBot without throwing", () => {
      const dest = createMemoryDestination();
      const customPino = createLogger({ module: "customNewsroomBot" }, { level: "debug", destination: dest.stream });
      const customChatLogger = createChatSdkLogger("testBot", customPino);

      expect(() => {
        createNewsroomBot({
          logger: customChatLogger,
          userName: "newsroomTestBot",
        });
      }).not.toThrow();
    });
  });
});
