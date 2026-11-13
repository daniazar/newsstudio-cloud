/**
 * End-to-End Penetration & Multi-Tenant Isolation Test Suite — NewsStudio Phase 6
 *
 * Simulates adversarial attack vectors across:
 * 1. Multi-Tenant isolation boundaries (cross-tenant access)
 * 2. Unauthenticated perimeter defense
 * 3. Privilege escalation
 * 4. Path traversal and filesystem escape attacks
 * 5. Server-Side Request Forgery (SSRF) spectrum
 * 6. Malicious executable disguised media uploads
 * 7. DoS burst flooding & sliding-window rate limit throttling
 * 8. Cryptographic authentication tag tampering
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { withTenantAuth, withAdminAuth, withSuperAdminAuth } from "@/lib/apiHandler";
import { RateLimitTiers, checkRateLimit } from "@/lib/security/rateLimit";
import { validateSafePublicUrl, isPrivateOrReservedIp } from "@/lib/security/ssrf";
import { resolveSafeMediaFilePath, validateVoiceFilename, isPathInside } from "@/lib/security/pathSanitizer";
import { validateMediaBuffer } from "@/lib/security/magicBytes";
import { encryptSecret, decryptSecret, generateEncryptionKey } from "@/lib/secrets";

vi.mock("@/lib/tenant", () => ({
  requireTenant: vi.fn(),
}));

vi.mock("@/lib/adminAuth", () => ({
  requireAdmin: vi.fn(),
  requireSuperAdmin: vi.fn(),
}));

import { requireTenant } from "@/lib/tenant";
import { requireAdmin, requireSuperAdmin } from "@/lib/adminAuth";

describe("Phase 6: End-to-End Penetration & Multi-Tenant Security Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Vector 1: Multi-Tenant Boundary Isolation", () => {
    it("strictly isolates tenant data context and prevents cross-tenant access", async () => {
      // Mock tenant A session
      (requireTenant as any).mockResolvedValueOnce({
        ok: true,
        tenant: { orgId: "org_victim_corp", userId: "user_victim" },
      });

      const handler = withTenantAuth(async (req, { tenant }) => {
        // Assert handler receives the verified tenant from Clerk session, not client header
        return Response.json({ success: true, activeTenant: tenant.orgId });
      });

      // Attacker sends spoofed header pretending to be tenant B
      const attackerReq = new NextRequest("http://localhost:3000/api/stories", {
        headers: {
          "x-company-id": "org_attacker_corp",
        },
      });

      const res = await handler(attackerReq, { params: Promise.resolve({}) });
      const data = await res.json();

      // Verified tenant is authoritative org_victim_corp, attacker's spoofed header is ignored
      expect(data.activeTenant).toBe("org_victim_corp");
      expect(data.activeTenant).not.toBe("org_attacker_corp");
    });
  });

  describe("Vector 2: Unauthenticated Perimeter Defense", () => {
    it("rejects unauthenticated requests without invoking the handler", async () => {
      (requireTenant as any).mockResolvedValueOnce({
        ok: false,
        response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
      });

      const sensitiveAction = vi.fn();
      const handler = withTenantAuth(sensitiveAction);

      const req = new NextRequest("http://localhost:3000/api/ecommerce/render");
      const res = await handler(req, { params: Promise.resolve({}) });

      expect(res.status).toBe(401);
      expect(sensitiveAction).not.toHaveBeenCalled();
    });
  });

  describe("Vector 3: Privilege Escalation Defense", () => {
    it("blocks standard authenticated tenant from invoking superadmin controls", async () => {
      (requireSuperAdmin as any).mockResolvedValueOnce({
        ok: false,
        response: new Response(JSON.stringify({ error: "Forbidden: Superadmin access required" }), { status: 403 }),
      });

      const maintenanceAction = vi.fn();
      const handler = withSuperAdminAuth(maintenanceAction);

      const req = new NextRequest("http://localhost:3000/api/admin/services/control", { method: "POST" });
      const res = await handler(req, { params: Promise.resolve({}) });

      expect(res.status).toBe(403);
      expect(maintenanceAction).not.toHaveBeenCalled();
    });
  });

  describe("Vector 4: Path Traversal & Filesystem Escapes", () => {
    it("neutralizes deep directory traversal attacks and Windows backslash escapes", () => {
      const maliciousPayloads = [
        "../../../../../../Windows/System32/cmd.exe",
        "..\\..\\..\\..\\..\\Windows\\System32\\calc.exe",
        "%2e%2e%2f%2e%2e%2f.env",
        "....//....//....//etc/passwd",
        "/etc/shadow",
        "C:\\Users\\Administrator\\.ssh\\id_rsa",
      ];

      for (const payload of maliciousPayloads) {
        // Voice filename validator must reject traversal sequences with null
        const voiceFilenameResult = validateVoiceFilename(payload);
        expect(voiceFilenameResult).toBeNull();

        // Safe media file resolver must reject arbitrary system files and path traversal attempts
        const safePath = resolveSafeMediaFilePath(payload);
        expect(safePath).toBeNull();
      }
    });
  });

  describe("Vector 5: SSRF Injection Spectrum", () => {
    it("rejects all cloud metadata, loopback, private IP, and IPv6 SSRF targets", async () => {
      const forbiddenTargets = [
        "http://127.0.0.1:8188",
        "http://127.0.0.1:8005",
        "http://169.254.169.254/latest/meta-data/",
        "http://169.254.169.254/metadata/v1",
        "http://10.0.0.1:9000",
        "http://172.16.0.10:3000",
        "http://192.168.1.100:8080",
        "http://[::1]:8188",
      ];

      for (const target of forbiddenTargets) {
        const result = await validateSafePublicUrl(target, { allowDevelopmentLoopback: false });
        expect(result.ok).toBe(false);
      }

      // Check IP classifier directly
      expect(isPrivateOrReservedIp("127.0.0.1")).toBe(true);
      expect(isPrivateOrReservedIp("169.254.169.254")).toBe(true);
      expect(isPrivateOrReservedIp("10.200.1.5")).toBe(true);
      expect(isPrivateOrReservedIp("172.20.10.2")).toBe(true);
      expect(isPrivateOrReservedIp("192.168.0.1")).toBe(true);
      expect(isPrivateOrReservedIp("::1")).toBe(true);

      // Public benign targets should be allowed
      expect(isPrivateOrReservedIp("8.8.8.8")).toBe(false);
      expect(isPrivateOrReservedIp("1.1.1.1")).toBe(false);
    });
  });

  describe("Vector 6: Executable Upload Disguise (Polyglot Rejection)", () => {
    it("detects and rejects Windows PE executables disguised with image/png extensions", () => {
      // Create a buffer starting with 'MZ' (Windows PE header)
      const fakePng = Buffer.alloc(100);
      fakePng[0] = 0x4d; // 'M'
      fakePng[1] = 0x5a; // 'Z'

      const result = validateMediaBuffer(fakePng, "image/png");
      expect(result.valid).toBe(false);
      expect(result.detectedType).toBe("application/x-dosexec");
      expect(result.error).toContain("executable binaries are strictly forbidden");
    });

    it("detects and rejects Linux ELF executables disguised with video/mp4 extensions", () => {
      // Create a buffer starting with 0x7F, 'E', 'L', 'F'
      const fakeMp4 = Buffer.alloc(100);
      fakeMp4[0] = 0x7f;
      fakeMp4[1] = 0x45; // 'E'
      fakeMp4[2] = 0x4c; // 'L'
      fakeMp4[3] = 0x46; // 'F'

      const result = validateMediaBuffer(fakeMp4, "video/mp4");
      expect(result.valid).toBe(false);
      expect(result.detectedType).toBe("application/x-executable");
      expect(result.error).toContain("executable binaries are strictly forbidden");
    });

    it("detects and rejects PHP and script injections disguised as media files", () => {
      const phpScript = Buffer.from("<?php system($_GET['cmd']); ?>");
      const result = validateMediaBuffer(phpScript, "image/jpeg");
      expect(result.valid).toBe(false);
      expect(result.detectedType).toBe("application/x-script");
      expect(result.error).toContain("script payloads are strictly forbidden");
    });
  });

  describe("Vector 7: DoS Burst Flooding & Rate Limiting", () => {
    it("throttles excessive AI generation requests and returns Retry-After", () => {
      const clientKey = `penetration-attacker-${Date.now()}`;
      const tier = RateLimitTiers.AI_EXPENSIVE; // 15 req/min

      // Fire 15 allowed requests
      for (let i = 0; i < 15; i++) {
        const res = checkRateLimit(clientKey, tier);
        expect(res.allowed).toBe(true);
      }

      // 16th request must be rejected
      const blockedRes = checkRateLimit(clientKey, tier);
      expect(blockedRes.allowed).toBe(false);
      expect(blockedRes.remaining).toBe(0);
      expect(blockedRes.retryAfterSeconds).toBeGreaterThan(0);
    });
  });

  describe("Vector 8: Ciphertext Tamper Resistance", () => {
    it("fails closed when an attacker tampers with AES-256-GCM ciphertext bytes", () => {
      const testKey = generateEncryptionKey();
      process.env.ENCRYPTION_KEY = testKey;

      const plaintext = "sensitive-oauth-refresh-token-xyz-123";
      const encrypted = encryptSecret(plaintext);

      // Format: iv:authTag:encrypted
      const parts = encrypted.split(":");
      expect(parts.length).toBe(3);

      // Attacker flips one character in the ciphertext
      const originalCiphertext = parts[2];
      const tamperedChar = originalCiphertext[0] === "a" ? "b" : "a";
      parts[2] = tamperedChar + originalCiphertext.slice(1);
      const tamperedEncrypted = parts.join(":");

      // Decryption MUST fail due to authentication tag mismatch
      expect(() => decryptSecret(tamperedEncrypted)).toThrow();
    });
  });
});
