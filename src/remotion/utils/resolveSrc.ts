import { staticFile } from "remotion";

/**
 * Resolves an asset URL or relative path for use inside Remotion compositions.
 * - Leaves remote HTTP/HTTPS, data:, and blob: URLs untouched.
 * - Correctly wraps local and public directory paths in Remotion's `staticFile()`
 *   so the headless CLI server can locate and serve them during bundle rendering.
 */
export const resolveSrc = (src?: string | null): string => {
  if (!src) return "";
  const publicBase = (process.env.NEXT_PUBLIC_S3_PUBLIC_URL || "").replace(/\/+$/, "");
  const isHttpsBrowser = typeof window !== "undefined" && window.location.protocol === "https:";

  if (isHttpsBrowser && publicBase && src.startsWith(`${publicBase}/`)) {
    return `/r2/${src.slice(publicBase.length + 1)}`;
  }

  if (
    src.startsWith("http://") ||
    src.startsWith("https://") ||
    src.startsWith("data:") ||
    src.startsWith("blob:")
  ) {
    return src;
  }
  if (src.startsWith("tenants/")) {
    if (isHttpsBrowser && publicBase) {
      return `/r2/${src}`;
    }
    if (publicBase) {
      return `${publicBase}/${src}`;
    }
    const endpoint =
      typeof window !== "undefined"
        ? process.env.NEXT_PUBLIC_S3_ENDPOINT || `http://${window.location.hostname}:9000`
        : process.env.S3_ENDPOINT || process.env.NEXT_PUBLIC_S3_ENDPOINT || "http://localhost:9000";
    const bucket = process.env.NEXT_PUBLIC_S3_BUCKET_NAME || process.env.S3_BUCKET_NAME || "news-studio";
    return `${endpoint}/${bucket}/${src}`;
  }
  if (src.startsWith("public/")) {
    return staticFile(src.substring(7));
  }
  if (src.startsWith("/public/")) {
    return staticFile(src.substring(8));
  }
  if (src.startsWith("/")) {
    return staticFile(src.substring(1));
  }
  return staticFile(src);
};
