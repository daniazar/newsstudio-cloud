/**
 * NewsStudio — Centralized Environment & Runtime Configuration
 *
 * Provides typed, validated access to environment variables with sane defaults.
 */

import { createLogger, type LogLevel } from "./logger";

const log = createLogger("env");

export interface AppConfig {
  DATABASE_URL: string;
  LLM_PROVIDER: "gemini" | "ollama";
  GEMINI_API_KEY?: string;
  OLLAMA_BASE_URL: string;
  OLLAMA_MODEL: string;
  STORAGE_PROVIDER: "local" | "minio" | "azure" | "r2";
  S3_ENDPOINT: string;
  NEXT_PUBLIC_S3_ENDPOINT?: string;
  S3_ACCESS_KEY?: string;
  S3_SECRET_KEY?: string;
  S3_BUCKET_NAME: string;
  MAIN_APP_URL: string;
  MODERN_TTS_SERVER_URL: string;
  COMFYUI_URL: string;
  REMOTION_CONCURRENCY: number;
  LOG_LEVEL: LogLevel;
  NODE_ENV: "development" | "production" | "test";
  IS_DEV: boolean;
  IS_PROD: boolean;
}

function parseEnv(): AppConfig {
  const nodeEnv = (process.env.NODE_ENV || "development") as "development" | "production" | "test";
  const llmProvider = (process.env.LLM_PROVIDER === "ollama" ? "ollama" : "gemini") as "gemini" | "ollama";
  const storageProvider = (
    process.env.STORAGE_PROVIDER === "azure"
      ? "azure"
      : process.env.STORAGE_PROVIDER === "minio"
      ? "minio"
      : process.env.STORAGE_PROVIDER === "r2"
      ? "r2"
      : "local"
  ) as "local" | "minio" | "azure" | "r2";

  const rawConcurrency = process.env.REMOTION_CONCURRENCY ? parseInt(process.env.REMOTION_CONCURRENCY, 10) : 4;
  const remotionConcurrency = !isNaN(rawConcurrency) && rawConcurrency > 0 ? rawConcurrency : 4;

  const rawLogLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel | undefined;
  const logLevel: LogLevel =
    rawLogLevel && ["debug", "info", "warn", "error", "silent"].includes(rawLogLevel)
      ? rawLogLevel
      : nodeEnv === "production"
      ? "info"
      : "debug";

  const config: AppConfig = {
    DATABASE_URL: process.env.DATABASE_URL || "postgresql://newsstudio:newsstudiopassword@localhost:5432/newsstudio?schema=public",
    LLM_PROVIDER: llmProvider,
    GEMINI_API_KEY: (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)?.trim() || undefined,
    OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
    OLLAMA_MODEL: process.env.OLLAMA_MODEL || "qwen3.5:9b",
    STORAGE_PROVIDER: storageProvider,
    S3_ENDPOINT: process.env.S3_ENDPOINT || "http://localhost:9000",
    NEXT_PUBLIC_S3_ENDPOINT: process.env.NEXT_PUBLIC_S3_ENDPOINT,
    S3_ACCESS_KEY: process.env.S3_ACCESS_KEY,
    S3_SECRET_KEY: process.env.S3_SECRET_KEY,
    S3_BUCKET_NAME: process.env.S3_BUCKET_NAME || "news-studio",
    MAIN_APP_URL: process.env.MAIN_APP_URL || "http://localhost:3000",
    MODERN_TTS_SERVER_URL: process.env.MODERN_TTS_SERVER_URL || process.env.NEXT_PUBLIC_MODERN_TTS_SERVER_URL || "http://localhost:8005",
    COMFYUI_URL: process.env.COMFYUI_URL || process.env.NEXT_PUBLIC_COMFYUI_URL || "http://localhost:8188",
    REMOTION_CONCURRENCY: remotionConcurrency,
    LOG_LEVEL: logLevel,
    NODE_ENV: nodeEnv,
    IS_DEV: nodeEnv === "development",
    IS_PROD: nodeEnv === "production",
  };

  // Production integrity validations
  if (nodeEnv === "production") {
    if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length < 32) {
      throw new Error("ENCRYPTION_KEY must be a 32+ character secret in production");
    }

    if (config.LLM_PROVIDER === "gemini" && !config.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is required in production when LLM_PROVIDER='gemini'");
    }

    if (config.STORAGE_PROVIDER !== "local") {
      const ep = process.env.NEXT_PUBLIC_S3_ENDPOINT || "";
      if (!ep || ep.includes("localhost") || ep.includes("127.0.0.1")) {
        log.warn("NEXT_PUBLIC_S3_ENDPOINT is unset or points to localhost in production; client browsers will fail to load remote media.");
      }
    }
  }

  // Diagnostic warnings on misconfiguration
  if (config.LLM_PROVIDER === "gemini" && !config.GEMINI_API_KEY && config.IS_DEV) {
    log.warn("GEMINI_API_KEY is unset while LLM_PROVIDER='gemini'. Script generation will require a valid Gemini API key.");
  }

  if (config.STORAGE_PROVIDER === "minio" && !process.env.S3_ACCESS_KEY && config.IS_DEV) {
    log.warn("S3_ACCESS_KEY is unset while STORAGE_PROVIDER='minio'. MinIO storage requests may fail authentication.");
  }

  return config;
}

export const env: AppConfig = parseEnv();
