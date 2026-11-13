/**
 * src/lib/logger.ts
 *
 * Canonical Structured Logger Singleton for NewsStudio.
 * Provides high-performance JSON logging via Pino with:
 * - Automatic secret redaction for API keys, headers, and credentials.
 * - OpenTelemetry trace and span correlation mixin (traceId & spanId).
 * - Child logger binding isolation (module, companyId, storyId, jobId, workerId).
 * - Vercel Chat SDK Logger adapter bridge (createChatSdkLogger).
 * - Zero Webpack bundling hazards (pure JSON output, no worker-thread transport).
 */

import pino, {
  type DestinationStream,
  type Logger as PinoLogger,
  type LoggerOptions,
} from "pino";
import { trace } from "@opentelemetry/api";
import type { Logger as ChatSdkLogger, LogLevel as ChatLogLevel } from "chat";

export type { ChatSdkLogger, ChatLogLevel, PinoLogger };

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal" | "silent";

export const VALID_LOG_LEVELS: ReadonlySet<string> = new Set<LogLevel>([
  "trace",
  "debug",
  "info",
  "warn",
  "error",
  "fatal",
  "silent",
]);

/**
 * Resolves the operational log level with deterministic priority:
 * 1. Explicit override passed to function/logger options.
 * 2. Process environment variable LOG_LEVEL (case-insensitive).
 * 3. Default to "silent" in test environments (NODE_ENV === "test") to keep vitest clean.
 * 4. Default to "info" for production and standard execution.
 */
export function resolveLogLevel(overrideLevel?: string): LogLevel {
  if (overrideLevel && VALID_LOG_LEVELS.has(overrideLevel.toLowerCase())) {
    return overrideLevel.toLowerCase() as LogLevel;
  }
  const envLevel = process.env.LOG_LEVEL?.toLowerCase();
  if (envLevel && VALID_LOG_LEVELS.has(envLevel)) {
    return envLevel as LogLevel;
  }
  if (process.env.NODE_ENV === "test") {
    return "silent";
  }
  return "info";
}

/**
 * Field paths automatically censored by Pino during JSON serialization.
 */
export const REDACT_PATHS: string[] = [
  "apiKey",
  "*.apiKey",
  "*.*.apiKey",
  "geminiApiKey",
  "*.geminiApiKey",
  "*.*.geminiApiKey",
  "openaiCompatibleApiKey",
  "*.openaiCompatibleApiKey",
  "*.*.openaiCompatibleApiKey",
  "tavilyApiKey",
  "*.tavilyApiKey",
  "*.*.tavilyApiKey",
  "firecrawlApiKey",
  "*.firecrawlApiKey",
  "*.*.firecrawlApiKey",
  "botToken",
  "*.botToken",
  "*.*.botToken",
  "signingSecret",
  "*.signingSecret",
  "*.*.signingSecret",
  "secretToken",
  "*.secretToken",
  "*.*.secretToken",
  "password",
  "*.password",
  "*.*.password",
  "secret",
  "*.secret",
  "*.*.secret",
  "token",
  "*.token",
  "*.*.token",
  "accessToken",
  "*.accessToken",
  "*.*.accessToken",
  "refreshToken",
  "*.refreshToken",
  "*.*.refreshToken",
  "redisUrl",
  "*.redisUrl",
  "*.*.redisUrl",
  "authorization",
  "*.authorization",
  "*.*.authorization",
  "req.headers.authorization",
  "headers.authorization",
  "Authorization",
  "*.Authorization",
  "*.*.Authorization",
  "req.headers.Authorization",
  "headers.Authorization",
  "cookie",
  "*.cookie",
  "*.*.cookie",
  "req.headers.cookie",
  "headers.cookie",
  "Cookie",
  "*.Cookie",
  "*.*.Cookie",
  "req.headers.Cookie",
  "headers.Cookie",
  '["x-worker-key"]',
  '*["x-worker-key"]',
  '*.*["x-worker-key"]',
  'req.headers["x-worker-key"]',
  'headers["x-worker-key"]',
  '*.headers["x-worker-key"]',
  '["X-Worker-Key"]',
  '*["X-Worker-Key"]',
  '*.*["X-Worker-Key"]',
  'req.headers["X-Worker-Key"]',
  'headers["X-Worker-Key"]',
  '*.headers["X-Worker-Key"]',
  '["x-api-key"]',
  '*["x-api-key"]',
  '*.*["x-api-key"]',
  'req.headers["x-api-key"]',
  'headers["x-api-key"]',
  '*.headers["x-api-key"]',
  '["X-Api-Key"]',
  '*["X-Api-Key"]',
  '*.*["X-Api-Key"]',
  'req.headers["X-Api-Key"]',
  'headers["X-Api-Key"]',
  '*.headers["X-Api-Key"]',
];

export interface LogBindings {
  module: string;
  companyId?: string | null;
  storyId?: string | null;
  jobId?: string | null;
  workerId?: string | null;
  [key: string]: unknown;
}

/**
 * Strips undefined properties from log bindings so child contexts emit only defined fields.
 */
function cleanBindings(bindings: LogBindings): Record<string, unknown> {
  if (!bindings || typeof bindings !== "object") {
    return {};
  }
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(bindings)) {
    if (val !== undefined) {
      result[key] = val;
    }
  }
  return result;
}

/**
 * Builds base options for Pino instances, wiring ISO time, level formatting,
 * error serialization, secret redaction, and active OpenTelemetry span correlation.
 */
function buildPinoOptions(overrideLevel?: string): LoggerOptions {
  return {
    level: resolveLogLevel(overrideLevel),
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level(label: string) {
        return { level: label };
      },
    },
    serializers: {
      err: pino.stdSerializers.err,
    },
    redact: {
      paths: REDACT_PATHS,
      censor: "[REDACTED]",
    },
    mixin() {
      try {
        const activeSpan = trace.getActiveSpan();
        const ctx = activeSpan?.spanContext();
        if (
          ctx &&
          ctx.traceId &&
          ctx.spanId &&
          ctx.traceId !== "00000000000000000000000000000000" &&
          ctx.spanId !== "0000000000000000"
        ) {
          return { traceId: ctx.traceId, spanId: ctx.spanId };
        }
      } catch {
        // Safe fallback in case OpenTelemetry trace lookup encounters an error
      }
      return {};
    },
  };
}

/**
 * Creates a root logger instance. Accepts optional destination stream and log level override.
 */
export function createRootLogger(options?: {
  level?: string;
  destination?: DestinationStream;
}): PinoLogger {
  const pinoOptions = buildPinoOptions(options?.level);
  return options?.destination
    ? pino(pinoOptions, options.destination)
    : pino(pinoOptions);
}

/**
 * Singleton canonical root logger.
 */
export const logger: PinoLogger = createRootLogger();

/**
 * Creates a scoped child logger with the provided bindings.
 * Accepts either a string namespace or a LogBindings object.
 * If destination or level options are supplied, instantiates an isolated root logger
 * before attaching child bindings (useful for tests and custom log streams).
 */
export function createLogger(
  bindings: string | LogBindings,
  options?: { level?: string; destination?: DestinationStream }
): PinoLogger {
  const normBindings: LogBindings =
    typeof bindings === "string" ? { module: bindings } : bindings;
  const cleaned = cleanBindings(normBindings);

  if (options?.destination || options?.level) {
    const customRoot = createRootLogger(options);
    return customRoot.child(cleaned);
  }
  return logger.child(cleaned);
}

/**
 * Vercel Chat SDK Logger Adapter.
 * Maps Chat SDK logger calls (`child`, `debug`, `info`, `warn`, `error`) to Pino structured logs.
 */
export function createChatSdkLogger(
  prefix = "newsroomBot",
  baseLogger?: PinoLogger
): ChatSdkLogger {
  const currentPino =
    baseLogger ?? createLogger({ module: "newsroomBot", chatComponent: prefix });

  const logMethod = (
    level: "debug" | "info" | "warn" | "error",
    message: string,
    ...args: unknown[]
  ) => {
    if (args.length === 0) {
      currentPino[level](message);
    } else if (args.length === 1 && args[0] instanceof Error) {
      currentPino[level]({ err: args[0] }, message);
    } else {
      currentPino[level]({ details: args.length === 1 ? args[0] : args }, message);
    }
  };

  return {
    child(subPrefix: string): ChatSdkLogger {
      const combined = `${prefix}:${subPrefix}`;
      return createChatSdkLogger(
        combined,
        currentPino.child({ chatComponent: combined })
      );
    },
    debug(message: string, ...args: unknown[]): void {
      logMethod("debug", message, ...args);
    },
    info(message: string, ...args: unknown[]): void {
      logMethod("info", message, ...args);
    },
    warn(message: string, ...args: unknown[]): void {
      logMethod("warn", message, ...args);
    },
    error(message: string, ...args: unknown[]): void {
      logMethod("error", message, ...args);
    },
  };
}
