/**
 * src/lib/storage/cas.ts
 *
 * Content-Addressable Storage (CAS) Deduplication Engine.
 * Calculates cryptographic hashes of media payloads (images, audio, video)
 * and verifies whether the asset already exists before writing to disk or S3/MinIO.
 * Prevents redundant storage consumption across duplicate assets, re-renders, and scenes.
 */

import crypto from "crypto";
import { storage, withTenant } from "@/lib/storage";

export interface CasUploadResult {
  url: string;
  key: string;
  isDuplicate: boolean;
  hash: string;
  bytes: number;
}

/**
 * Calculates a standard SHA-256 hash string for an arbitrary byte buffer.
 */
export function computeBufferHash(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * Generates a tenant-scoped Content-Addressable Storage (CAS) key.
 * Pattern: `tenants/{companyId}/cas/{type}/{hash}.{ext}`
 */
export function generateCasKey(
  companyId: string,
  type: string,
  extension: string,
  buffer: Buffer
): { key: string; hash: string } {
  const hash = computeBufferHash(buffer).slice(0, 32);
  const cleanExt = extension.replace(/^\./, "").toLowerCase() || "bin";
  const relativeKey = `cas/${type}/${hash}.${cleanExt}`;
  const key = withTenant(companyId, relativeKey);
  return { key, hash };
}

/**
 * Uploads a buffer using Content-Addressable Storage (CAS) deduplication.
 * If the exact asset payload already exists in storage for this tenant,
 * skips disk/network writes and returns the existing accessible URL immediately.
 */
export async function uploadWithCas(
  companyId: string,
  type: string,
  extension: string,
  buffer: Buffer,
  contentType: string
): Promise<CasUploadResult> {
  const { key, hash } = generateCasKey(companyId, type, extension, buffer);

  try {
    const alreadyExists = await storage.exists(key);
    if (alreadyExists) {
      const existingUrl = storage.getUrl(key);
      return {
        url: existingUrl,
        key,
        isDuplicate: true,
        hash,
        bytes: buffer.length,
      };
    }
  } catch {
    // If exists check fails or throws, fall through to upload safely
  }

  const uploadedUrl = await storage.upload(key, buffer, contentType);
  return {
    url: uploadedUrl,
    key,
    isDuplicate: false,
    hash,
    bytes: buffer.length,
  };
}
