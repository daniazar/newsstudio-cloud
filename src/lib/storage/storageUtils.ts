/**
 * src/lib/storage/storageUtils.ts
 *
 * Client-safe and Server-safe Storage URL Resolution & Proxy Helpers.
 */

export function getStorageEndpoint(): string {
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_S3_ENDPOINT || `http://${window.location.hostname}:9000`;
  }
  return process.env.S3_ENDPOINT || process.env.NEXT_PUBLIC_S3_ENDPOINT || "http://localhost:9000";
}

export function getStorageBucketName(): string {
  return process.env.NEXT_PUBLIC_S3_BUCKET_NAME || process.env.S3_BUCKET_NAME || "news-studio";
}

/**
 * Resolves a media key or partial URL into a fully-qualified accessible URL.
 */
export function resolveStorageUrl(keyOrUrl?: string | null): string {
  if (!keyOrUrl) return "";
  if (
    keyOrUrl.startsWith("http://") ||
    keyOrUrl.startsWith("https://") ||
    keyOrUrl.startsWith("data:") ||
    keyOrUrl.startsWith("blob:")
  ) {
    return keyOrUrl;
  }
  if (keyOrUrl.startsWith("/")) {
    return keyOrUrl;
  }

  const endpoint = getStorageEndpoint();
  const bucket = getStorageBucketName();
  const cleanKey = keyOrUrl.replace(/^\/+/, "");

  return `${endpoint}/${bucket}/${cleanKey}`;
}
