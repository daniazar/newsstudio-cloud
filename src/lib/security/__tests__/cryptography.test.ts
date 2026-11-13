import { describe, it, expect, beforeEach, afterEach } from "vitest";
import crypto from "crypto";
import {
  encryptSecret,
  decryptSecret,
  getKeyBuffer,
  generateEncryptionKey,
} from "@/lib/secrets";
import { isSuperAdminEmail, getSuperAdminEmails } from "@/lib/superadmin";
import { hashPassword, verifyPassword } from "@/lib/passwords";
import { verifyShopifyHmac } from "@/lib/ecommerce/shopifyHmac";

describe("Phase 3: Cryptography & Secrets Management", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("1. Secrets Encryption & Key Validation ([SEC-17])", () => {
    it("generates valid 64-character hex encryption keys", () => {
      const key = generateEncryptionKey();
      expect(key).toHaveLength(64);
      expect(/^[0-9a-f]{64}$/.test(key)).toBe(true);
    });

    it("parses 64-hex key into a 32-byte Buffer", () => {
      const hexKey = crypto.randomBytes(32).toString("hex");
      process.env.ENCRYPTION_KEY = hexKey;

      const buf = getKeyBuffer();
      expect(buf).toHaveLength(32);
      expect(buf.toString("hex")).toBe(hexKey);
    });

    it("truncates UTF-8 key >= 32 bytes to exactly 32 bytes", () => {
      process.env.ENCRYPTION_KEY = "1234567890123456789012345678901234567890_extra";
      const buf = getKeyBuffer();
      expect(buf).toHaveLength(32);
      expect(buf.toString("utf8")).toBe("12345678901234567890123456789012");
    });

    it("throws fatal error in production when ENCRYPTION_KEY is missing", () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = "production";
      delete process.env.ENCRYPTION_KEY;

      expect(() => getKeyBuffer()).toThrow(/FATAL: ENCRYPTION_KEY.*not configured/);
    });

    it("throws fatal error in production when ENCRYPTION_KEY is shorter than 32 bytes", () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = "production";
      process.env.ENCRYPTION_KEY = "short-key";

      expect(() => getKeyBuffer()).toThrow(/FATAL: ENCRYPTION_KEY is too short/);
    });

    it("never produces a static 32-zero buffer fallback", () => {
      delete process.env.ENCRYPTION_KEY;
      (process.env as Record<string, string | undefined>).NODE_ENV = "development";

      const buf = getKeyBuffer();
      expect(buf).toHaveLength(32);
      // Zero-key check
      const zeroBuffer = Buffer.alloc(32);
      expect(buf.equals(zeroBuffer)).toBe(false);
    });

    it("encrypts and decrypts secret payloads with roundtrip integrity (AES-256-GCM)", () => {
      process.env.ENCRYPTION_KEY = generateEncryptionKey();
      const secret = "ya29.a0AXooCgu_super_secret_oauth_token_12345";

      const encrypted = encryptSecret(secret);
      expect(encrypted).not.toBe(secret);
      expect(encrypted.split(":")).toHaveLength(3); // iv:authTag:ciphertext

      const decrypted = decryptSecret(encrypted);
      expect(decrypted).toBe(secret);
    });

    it("throws decryption error on tampered ciphertext", () => {
      process.env.ENCRYPTION_KEY = generateEncryptionKey();
      const encrypted = encryptSecret("test-data");
      const parts = encrypted.split(":");
      parts[2] = parts[2].slice(0, -2) + "ff"; // tamper with ciphertext
      const tampered = parts.join(":");

      expect(() => decryptSecret(tampered)).toThrow(/Decryption failed/);
    });

    it("handles empty strings and legacy unencrypted values gracefully", () => {
      expect(encryptSecret("")).toBe("");
      expect(decryptSecret("")).toBe("");
      expect(decryptSecret("plain-old-value")).toBe("plain-old-value");
    });
  });

  describe("2. Super Admin Access Resolution ([User Directive])", () => {
    it("always includes danielazar@gmail.com by default even if env is empty", () => {
      delete process.env.SUPER_ADMIN_EMAILS;
      expect(getSuperAdminEmails()).toContain("danielazar@gmail.com");
      expect(isSuperAdminEmail("danielazar@gmail.com")).toBe(true);
      expect(isSuperAdminEmail("DANIELAZAR@GMAIL.COM")).toBe(true);
    });

    it("merges additional emails from SUPER_ADMIN_EMAILS environment variable", () => {
      process.env.SUPER_ADMIN_EMAILS = "anotheradmin@newsstudio.com, colleague@example.com";
      const emails = getSuperAdminEmails();

      expect(emails).toContain("danielazar@gmail.com");
      expect(emails).toContain("anotheradmin@newsstudio.com");
      expect(emails).toContain("colleague@example.com");
      expect(isSuperAdminEmail("anotheradmin@newsstudio.com")).toBe(true);
    });

    it("rejects non-admin emails", () => {
      expect(isSuperAdminEmail("attacker@evil.com")).toBe(false);
      expect(isSuperAdminEmail(null)).toBe(false);
      expect(isSuperAdminEmail(undefined)).toBe(false);
    });
  });

  describe("3. Password Hashing & Verification ([SEC-21])", () => {
    it("hashes password with PBKDF2 and random salt", () => {
      const password = "SuperSecretPassword123!";
      const hash1 = hashPassword(password);
      const hash2 = hashPassword(password);

      expect(hash1).toMatch(/^pbkdf2:100000:[0-9a-f]{32}:[0-9a-f]{64}$/);
      expect(hash2).toMatch(/^pbkdf2:100000:[0-9a-f]{32}:[0-9a-f]{64}$/);
      // Unique salts ensure different outputs for same password
      expect(hash1).not.toBe(hash2);
    });

    it("verifies correct password against PBKDF2 hash", () => {
      const password = "CorrectPassword123!";
      const hash = hashPassword(password);

      expect(verifyPassword(password, hash)).toBe(true);
      expect(verifyPassword("WrongPassword", hash)).toBe(false);
    });

    it("supports legacy single-round SHA-256 hashes gracefully", () => {
      const legacyPassword = "legacyPassword123";
      const legacyHash = crypto.createHash("sha256").update(legacyPassword, "utf8").digest("hex");

      expect(verifyPassword(legacyPassword, legacyHash)).toBe(true);
      expect(verifyPassword("WrongPassword", legacyHash)).toBe(false);
    });

    it("rejects invalid, malformed, or empty inputs", () => {
      expect(verifyPassword("", "some-hash")).toBe(false);
      expect(verifyPassword("password", "")).toBe(false);
      expect(verifyPassword("password", "malformed:hash")).toBe(false);
    });
  });

  describe("4. Shopify Webhook HMAC Verification ([SEC-20])", () => {
    const secret = "shpss_test_secret_key_12345";
    const body = JSON.stringify({ id: 1001, title: "Wireless Headphones" });

    it("validates correct HMAC-SHA256 signature", () => {
      const validHmac = crypto.createHmac("sha256", secret).update(body, "utf8").digest("base64");
      expect(verifyShopifyHmac(body, validHmac, secret)).toBe(true);
    });

    it("rejects invalid HMAC-SHA256 signature", () => {
      const invalidHmac = Buffer.from("invalid-signature").toString("base64");
      expect(verifyShopifyHmac(body, invalidHmac, secret)).toBe(false);
    });

    it("rejects when HMAC header is missing", () => {
      expect(verifyShopifyHmac(body, null, secret)).toBe(false);
      expect(verifyShopifyHmac(body, "", secret)).toBe(false);
    });

    it("handles length mismatch safely without throwing RangeError", () => {
      const shortHmac = "abc";
      expect(() => verifyShopifyHmac(body, shortHmac, secret)).not.toThrow();
      expect(verifyShopifyHmac(body, shortHmac, secret)).toBe(false);
    });

    it("fails closed in production when SHOPIFY_WEBHOOK_SECRET is missing", () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = "production";
      const validHmac = "some-hmac";
      expect(verifyShopifyHmac(body, validHmac, undefined)).toBe(false);
    });

    it("allows bypass only in development when secret is unconfigured", () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = "development";
      expect(verifyShopifyHmac(body, null, undefined)).toBe(true);
    });
  });

  describe("5. OAuth State Encryption & Tamper Resistance ([SEC-18], [SEC-19])", () => {
    it("creates tamper-proof state containing companyId and expiration", () => {
      process.env.ENCRYPTION_KEY = generateEncryptionKey();

      const statePayload = {
        companyId: "org_tenant_abc",
        brandId: "brand_123",
        nonce: crypto.randomBytes(16).toString("hex"),
        exp: Date.now() + 600000,
      };

      const encryptedState = encryptSecret(JSON.stringify(statePayload));
      const decrypted = JSON.parse(decryptSecret(encryptedState));

      expect(decrypted.companyId).toBe("org_tenant_abc");
      expect(decrypted.brandId).toBe("brand_123");
      expect(decrypted.nonce).toBe(statePayload.nonce);
      expect(decrypted.exp).toBeGreaterThan(Date.now());
    });
  });
});
