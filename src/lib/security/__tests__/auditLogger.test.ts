import { describe, it, expect, vi } from "vitest";
import { redactSensitiveData, logSecurityEvent, SecurityAuditEvent } from "../auditLogger";
import fs from "fs";

describe("Phase 6: Security Audit Logging", () => {
  describe("Sensitive Key Redaction", () => {
    it("redacts top-level sensitive fields", () => {
      const payload = {
        userId: "user_123",
        password: "SuperSecretPassword123!",
        token: "bearer_abc123xyz",
        apiKey: "sk-live-987654321",
        authorization: "Bearer secret-token",
        cookie: "session=xyz",
        secret: "oauth_secret_abc",
        action: "login",
      };

      const redacted = redactSensitiveData(payload) as Record<string, unknown>;

      expect(redacted.userId).toBe("user_123");
      expect(redacted.action).toBe("login");
      expect(redacted.password).toBe("[REDACTED]");
      expect(redacted.token).toBe("[REDACTED]");
      expect(redacted.apiKey).toBe("[REDACTED]");
      expect(redacted.authorization).toBe("[REDACTED]");
      expect(redacted.cookie).toBe("[REDACTED]");
      expect(redacted.secret).toBe("[REDACTED]");
    });

    it("recursively redacts nested sensitive fields within complex objects and arrays", () => {
      const complexPayload = {
        metadata: {
          tenantId: "tenant_abc",
          credentials: {
            appSecret: "topsecret",
            refreshToken: "rt_9999",
          },
        },
        headers: [
          { name: "Content-Type", value: "application/json" },
          { name: "Authorization", value: "Bearer dangerous" },
        ],
      };

      const redacted = redactSensitiveData(complexPayload) as any;

      expect(redacted.metadata.tenantId).toBe("tenant_abc");
      expect(redacted.metadata.credentials.appSecret).toBe("[REDACTED]");
      expect(redacted.metadata.credentials.refreshToken).toBe("[REDACTED]");
      expect(redacted.headers[0].value).toBe("application/json");
      expect(redacted.headers[1].value).toBe("[REDACTED]");
    });

    it("handles primitives and null values safely", () => {
      expect(redactSensitiveData(null)).toBeNull();
      expect(redactSensitiveData(undefined)).toBeUndefined();
      expect(redactSensitiveData(12345)).toBe(12345);
      expect(redactSensitiveData("safe string")).toBe("safe string");
      expect(redactSensitiveData(true)).toBe(true);
    });
  });

  describe("Security Event Logging", () => {
    it("appends structured audit event to log file without throwing", () => {
      const appendSpy = vi.spyOn(fs, "appendFile");

      const testEvent: SecurityAuditEvent = {
        eventType: "RATE_LIMIT_EXCEEDED",
        severity: "SECURITY_ALERT",
        userId: "user_attacker_1",
        tenantId: "org_target",
        ip: "203.0.113.42",
        route: "/api/ecommerce/render",
        details: {
          burstCount: 16,
          token: "should_be_redacted",
        },
      };

      expect(() => logSecurityEvent(testEvent)).not.toThrow();
      expect(appendSpy).toHaveBeenCalled();

      appendSpy.mockRestore();
    });
  });
});
