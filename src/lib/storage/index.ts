import { StorageClient } from "./types";
import { LocalStorageClient } from "./local";
import { MinioStorageClient } from "./minio";
import { env } from "@/lib/env";
import { createLogger } from "@/lib/logger";

const log = createLogger("storage");

/**
 * Instantiate active storage client based on local environment configurations.
 * R2 is S3-compatible — it uses the MinIO/S3 client pointed at the R2 endpoint.
 */
function createStorageClient(): StorageClient {
  const provider = env.STORAGE_PROVIDER;

  if (env.IS_PROD && provider === "local") {
    throw new Error(
      "STORAGE_PROVIDER=local is not allowed in production. Set STORAGE_PROVIDER to 'r2', 'minio', or 'azure'."
    );
  }

  switch (provider) {
    case "azure":
      log.warn("AzureStorageClient requested but @azure/storage-blob is removed in lean cloud build. Falling back to S3/MinIO.");
      return new MinioStorageClient();
    case "r2":
      log.info("Using Cloudflare R2 provider (S3-compatible via MinIO client)");
      return new MinioStorageClient();
    case "minio":
      log.info("Using MINIO provider (S3)");
      return new MinioStorageClient();
    case "local":
    default:
      log.info("Using LOCAL provider (file system)");
      return new LocalStorageClient();
  }
}

// Export single global instance of the storage client
export const storage = createStorageClient();
export type { StorageClient, StorageItem } from "./types";

// ============================================================
// Sprint 7.1 — Tenant-namespaced storage keys
// All assets live under `tenants/{companyId}/...` for hard isolation.
// ============================================================

export interface GenerateKeyArgs {
  companyId: string;
  type: string; // "audio" | "broll" | "presenter" | "thumbnails" | "music" | "stock" | "personas" | ...
  id: string; // story id, persona slug, video id, etc.
  filename: string;
}

/**
 * Build a structured tenant-scoped key: `tenants/{companyId}/{type}/{id}/{filename}`.
 */
export function generateKey({ companyId, type, id, filename }: GenerateKeyArgs): string {
  if (!companyId) throw new Error("generateKey requires a companyId");
  return `tenants/${companyId}/${type}/${id}/${filename}`;
}

/**
 * Prefix an existing (legacy/relative) key with the tenant namespace. Idempotent —
 * keys already under `tenants/` are returned unchanged. Use this to wrap the
 * varied inline key shapes already in the codebase, and for storage migration.
 */
export function withTenant(companyId: string, key: string): string {
  if (!companyId) throw new Error("withTenant requires a companyId");
  if (!key) return key;
  if (key.startsWith("tenants/")) return key;
  return `tenants/${companyId}/${key.replace(/^\/+/, "")}`;
}

// Content-Addressable Storage (CAS) Deduplication
export { uploadWithCas, computeBufferHash, generateCasKey, type CasUploadResult } from "./cas";

