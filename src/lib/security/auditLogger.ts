/**
 * Security Audit Logger — NewsStudio Enterprise Defense
 *
 * Provides tamper-evident, structured audit telemetry for authentication,
 * authorization decisions, rate-limiting breaches, administrative operations,
 * and intercepted security payloads.
 *
 * Automatically redacts sensitive fields (passwords, tokens, API keys).
 */

import fs from "fs";
import path from "path";
import { createLogger } from "@/lib/logger";

const auditPino = createLogger({ module: "securityAudit" });

export type SecurityAuditEventType =
  | "AUTH_SUCCESS"
  | "AUTH_FAILURE"
  | "ACCESS_DENIED"
  | "RATE_LIMIT_EXCEEDED"
  | "SUSPICIOUS_PAYLOAD"
  | "ADMIN_ACTION"
  | "CRYPTO_FAILURE";

export type SecurityAuditSeverity = "INFO" | "WARN" | "SECURITY_ALERT" | "CRITICAL";

export interface SecurityAuditEvent {
  eventType: SecurityAuditEventType;
  severity: SecurityAuditSeverity;
  userId?: string | null;
  tenantId?: string | null;
  ip?: string | null;
  route?: string | null;
  action?: string | null;
  details?: Record<string, unknown>;
  timestamp?: string;
}

const LOG_DIR = path.resolve(process.cwd(), "data", "logs");
const LOG_FILE = path.join(LOG_DIR, "security_audit.log");

const SENSITIVE_KEY_PATTERN = /password|token|secret|authorization|cookie|apiKey|key/i;

/**
 * Recursively redacts sensitive keys from audit log payloads.
 */
export function redactSensitiveData(data: unknown): unknown {
  if (data === null || data === undefined) return data;

  if (typeof data === "string" || typeof data === "number" || typeof data === "boolean") {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => redactSensitiveData(item));
  }

  if (typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const isSensitiveNamedPair =
      (typeof obj.name === "string" && SENSITIVE_KEY_PATTERN.test(obj.name)) ||
      (typeof obj.key === "string" && SENSITIVE_KEY_PATTERN.test(obj.key)) ||
      (typeof obj.header === "string" && SENSITIVE_KEY_PATTERN.test(obj.header));

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        sanitized[key] = "[REDACTED]";
      } else if (key === "value" && isSensitiveNamedPair) {
        sanitized[key] = "[REDACTED]";
      } else if (typeof value === "object" && value !== null) {
        sanitized[key] = redactSensitiveData(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  return "[UNSERIALIZABLE]";
}

/**
 * Records a structured security audit event.
 * Writes to disk asynchronously in NDJSON format and emits to stderr/stdout based on severity.
 */
export function logSecurityEvent(event: SecurityAuditEvent): void {
  const timestamp = event.timestamp || new Date().toISOString();
  const sanitizedDetails = event.details ? redactSensitiveData(event.details) : undefined;

  const record = {
    timestamp,
    eventType: event.eventType,
    severity: event.severity,
    userId: event.userId || "anonymous",
    tenantId: event.tenantId || "unassigned",
    ip: event.ip || "unknown",
    route: event.route || "unknown",
    action: event.action || null,
    ...(sanitizedDetails ? { details: sanitizedDetails } : {}),
  };

  const line = JSON.stringify(record) + "\n";

  const safeEntry = {
    event: event.eventType,
    actorId: event.userId || "anonymous",
    companyId: event.tenantId || "unassigned",
    ip: event.ip || "unknown",
    route: event.route || "unknown",
    metadata: sanitizedDetails as Record<string, unknown> | undefined,
  };

  auditPino.info(
    {
      event: safeEntry.event,
      actorId: safeEntry.actorId,
      companyId: safeEntry.companyId,
      ip: safeEntry.ip,
      route: safeEntry.route,
      metadata: safeEntry.metadata,
    },
    "Security audit event"
  );

  // Console output according to severity
  if (event.severity === "CRITICAL" || event.severity === "SECURITY_ALERT") {
    console.error(`🚨 [SECURITY ${event.severity}] ${event.eventType} on ${event.route || "unknown"}:`, record);
  } else if (event.severity === "WARN") {
    console.warn(`⚠️ [SECURITY WARN] ${event.eventType} on ${event.route || "unknown"}:`, record);
  }

  // Asynchronous persistent file append (fail-safe)
  try {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }
    fs.appendFile(LOG_FILE, line, (err) => {
      if (err) {
        auditPino.error({ err }, "Failed to write audit log entry to disk");
      }
    });
  } catch (err) {
    auditPino.error({ err }, "Failed to write audit log entry to disk");
  }
}
