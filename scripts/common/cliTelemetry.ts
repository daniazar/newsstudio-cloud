/**
 * scripts/common/cliTelemetry.ts
 *
 * Universal Monitoring & Observability Engine for NewsStudio AI CLIs (Veo Video & Gemini Image).
 * Provides structured file logging, phase tracking, live log tailing, and error forensics.
 */

import fs from "fs";
import path from "path";

export type CliStage =
  | "INITIALIZING"
  | "STAGING_REFERENCES"
  | "CONNECTING_CDP"
  | "CALIBRATING_SETTINGS"
  | "ATTACHING_INGREDIENTS"
  | "SUBMITTING_PROMPT"
  | "RENDERING_DIFFUSION"
  | "TRIGGERING_UPSCALE"
  | "DOWNLOADING_RPC"
  | "COMPLETED"
  | "FAILED";

export interface TelemetryEvent {
  timestamp: string;
  level: "INFO" | "STAGE" | "WARN" | "ERROR" | "SUCCESS";
  stage?: CliStage;
  message: string;
  meta?: Record<string, any>;
}

const LOGS_DIR = path.join(process.cwd(), ".gemini", "logs");

let activeJobId: string | null = null;
let activeLogFilePath: string | null = null;
let isConsoleHooked = false;

function ensureLogsDir(): void {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
}

/**
 * Initializes logging for a specific job run (e.g. `job_cmtt1z5zy008u344rt2nvj449_s0_1789331119649`)
 */
export function initJobLogging(jobId: string, cliType: "veo" | "gemini" = "veo"): string {
  ensureLogsDir();
  activeJobId = jobId;
  activeLogFilePath = path.join(LOGS_DIR, `job_${jobId}.log`);

  // Write initial header
  const header = `=== [${cliType.toUpperCase()} CLI LOG SESSION] Job: ${jobId} Started: ${new Date().toISOString()} ===\n`;
  fs.writeFileSync(activeLogFilePath, header, "utf8");

  // Also append to master CLI log
  const masterLog = path.join(LOGS_DIR, `${cliType}_cli.log`);
  fs.appendFileSync(masterLog, `\n--- [NEW SESSION ${jobId} at ${new Date().toISOString()}] ---\n`, "utf8");

  hookConsoleOutputs(cliType);
  return activeLogFilePath;
}

/**
 * Appends a structured log line to active job log file and master log file
 */
export function logTelemetry(event: TelemetryEvent, cliType: "veo" | "gemini" = "veo"): void {
  ensureLogsDir();
  const time = event.timestamp || new Date().toLocaleTimeString();
  const stageTag = event.stage ? ` [${event.stage}]` : "";
  const metaStr = event.meta ? ` ${JSON.stringify(event.meta)}` : "";
  const line = `[${time}] [${event.level}]${stageTag} ${event.message}${metaStr}\n`;

  // Write to active job log if active
  if (activeLogFilePath) {
    try {
      fs.appendFileSync(activeLogFilePath, line, "utf8");
    } catch {}
  }

  // Write to master log
  try {
    const masterLog = path.join(LOGS_DIR, `${cliType}_cli.log`);
    fs.appendFileSync(masterLog, line, "utf8");
  } catch {}
}

/**
 * Helper methods
 */
export const cliLogger = {
  info(message: string, meta?: Record<string, any>, cliType: "veo" | "gemini" = "veo") {
    logTelemetry({ timestamp: new Date().toISOString(), level: "INFO", message, meta }, cliType);
  },
  stage(stage: CliStage, message: string, meta?: Record<string, any>, cliType: "veo" | "gemini" = "veo") {
    logTelemetry({ timestamp: new Date().toISOString(), level: "STAGE", stage, message, meta }, cliType);
  },
  warn(message: string, meta?: Record<string, any>, cliType: "veo" | "gemini" = "veo") {
    logTelemetry({ timestamp: new Date().toISOString(), level: "WARN", message, meta }, cliType);
  },
  error(message: string, error?: any, cliType: "veo" | "gemini" = "veo") {
    const errText = error ? (error.stack || error.message || String(error)) : undefined;
    logTelemetry({
      timestamp: new Date().toISOString(),
      level: "ERROR",
      message: `${message}${errText ? ` | ${errText}` : ""}`,
    }, cliType);
  },
  success(message: string, meta?: Record<string, any>, cliType: "veo" | "gemini" = "veo") {
    logTelemetry({ timestamp: new Date().toISOString(), level: "SUCCESS", stage: "COMPLETED", message, meta }, cliType);
  },
};

/**
 * Intercepts standard console outputs to automatically mirror them to the active log file
 */
function hookConsoleOutputs(cliType: "veo" | "gemini"): void {
  if (isConsoleHooked) return;
  isConsoleHooked = true;

  const origLog = console.log;
  const origWarn = console.warn;
  const origError = console.error;

  console.log = (...args: any[]) => {
    origLog(...args);
    const msg = args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ");
    if (activeLogFilePath) {
      try {
        fs.appendFileSync(activeLogFilePath, `[${new Date().toLocaleTimeString()}] ${msg}\n`, "utf8");
      } catch {}
    }
  };

  console.warn = (...args: any[]) => {
    origWarn(...args);
    const msg = args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ");
    if (activeLogFilePath) {
      try {
        fs.appendFileSync(activeLogFilePath, `[${new Date().toLocaleTimeString()}] [WARN] ${msg}\n`, "utf8");
      } catch {}
    }
  };

  console.error = (...args: any[]) => {
    origError(...args);
    const msg = args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ");
    if (activeLogFilePath) {
      try {
        fs.appendFileSync(activeLogFilePath, `[${new Date().toLocaleTimeString()}] [ERROR] ${msg}\n`, "utf8");
      } catch {}
    }
  };
}

/**
 * Retrieves the last N lines from a job's log file
 */
export function getJobLogsTail(jobId: string, maxLines: number = 40): string[] {
  ensureLogsDir();
  const file = path.join(LOGS_DIR, `job_${jobId}.log`);
  if (!fs.existsSync(file)) {
    // Try without prefix or fallback
    const altFile = path.join(LOGS_DIR, `${jobId}.log`);
    if (!fs.existsSync(altFile)) return [];
    return readTailOfFile(altFile, maxLines);
  }
  return readTailOfFile(file, maxLines);
}

function readTailOfFile(filePath: string, maxLines: number): string[] {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
    return lines.slice(-maxLines);
  } catch {
    return [];
  }
}
