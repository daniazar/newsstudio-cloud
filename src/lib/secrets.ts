import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

/**
 * Returns a secure 32-byte Buffer derived from process.env.ENCRYPTION_KEY.
 *
 * Requirements:
 * - 64-char hexadecimal string (32 raw bytes), OR
 * - UTF-8 string containing at least 32 bytes (first 32 bytes used).
 *
 * Security:
 * - In production (NODE_ENV === "production"), throws an error if ENCRYPTION_KEY is missing or < 32 bytes.
 * - In development / testing, derives a fallback key with a visible warning to allow local testing.
 * - NEVER falls back to Buffer.alloc(32) null-byte keys.
 */
export function getKeyBuffer(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key || key.trim() === "") {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "FATAL: ENCRYPTION_KEY environment variable is not configured. A 32-byte key is strictly required in production."
      );
    }
    // Development/Test fallback with warning
    console.warn(
      "⚠️ [Secrets] ENCRYPTION_KEY is not configured in .env. Using fallback development key. Set ENCRYPTION_KEY for production security."
    );
    return crypto.createHash("sha256").update("newsstudio-development-encryption-key-fallback").digest();
  }

  // 1. 64-character hexadecimal representation (32 bytes)
  if (key.length === 64 && /^[0-9a-fA-F]+$/.test(key)) {
    return Buffer.from(key, "hex");
  }

  // 2. UTF-8 string representation with at least 32 bytes
  const byteLength = Buffer.byteLength(key, "utf8");
  if (byteLength >= 32) {
    return Buffer.from(key, "utf8").subarray(0, 32);
  }

  // Key provided but shorter than 32 bytes
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      `FATAL: ENCRYPTION_KEY is too short (${byteLength} bytes). It must be at least 32 bytes or 64 hex characters in production.`
    );
  }

  console.warn(
    `⚠️ [Secrets] ENCRYPTION_KEY is shorter than 32 bytes (${byteLength} bytes). Hashing key with SHA-256 for dev/test mode.`
  );
  return crypto.createHash("sha256").update(key, "utf8").digest();
}

/**
 * Generates a cryptographically secure 32-byte hex key for ENCRYPTION_KEY.
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Encrypts a string using AES-256-GCM
 * Format: iv:authTag:encryptedData
 */
export function encryptSecret(text: string): string {
  if (!text) return "";
  try {
    const iv = crypto.randomBytes(12); // GCM standard IV size
    const key = getKeyBuffer();
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");
    
    return `${iv.toString("hex")}:${authTag}:${encrypted}`;
  } catch (error) {
    console.error("[Secrets] Encryption failed:", error);
    throw new Error("Encryption failed");
  }
}

/**
 * Decrypts a string previously encrypted with encryptSecret
 */
export function decryptSecret(hash: string): string {
  if (!hash) return "";
  if (!hash.includes(":")) return hash; // If it's not a hash, return as is (for backwards compatibility if any plaintext exists)
  
  try {
    const parts = hash.split(":");
    if (parts.length !== 3) throw new Error("Invalid hash format");
    
    const [ivHex, authTagHex, encryptedHex] = parts;
    const key = getKeyBuffer();
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    console.error("[Secrets] Decryption failed:", error);
    throw new Error("Decryption failed");
  }
}
