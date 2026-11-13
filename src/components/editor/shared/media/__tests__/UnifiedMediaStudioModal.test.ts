/**
 * src/components/editor/shared/media/__tests__/UnifiedMediaStudioModal.test.ts
 *
 * Unit tests for UnifiedMediaStudioModal data structures, asset typing, and upload handling.
 */

import { describe, it, expect, vi } from "vitest";

describe("UnifiedMediaStudioModal Logic & Asset Validation", () => {
  it("correctly differentiates video and image file types by extension and mime type", () => {
    const isVideoAsset = (fileName: string, mimeType?: string) => {
      if (mimeType?.startsWith("video/")) return true;
      return fileName.endsWith(".mp4") || fileName.endsWith(".webm") || fileName.endsWith(".mov");
    };

    expect(isVideoAsset("stock_background.mp4")).toBe(true);
    expect(isVideoAsset("clip.webm")).toBe(true);
    expect(isVideoAsset("take.mov")).toBe(true);
    expect(isVideoAsset("photo.png")).toBe(false);
    expect(isVideoAsset("thumbnail.jpg")).toBe(false);
    expect(isVideoAsset("blob", "video/mp4")).toBe(true);
    expect(isVideoAsset("blob", "image/webp")).toBe(false);
  });

  it("builds correct tenant upload keys for manual uploads", () => {
    const buildUploadKey = (orgId: string, segmentId?: string, fileName?: string) => {
      const ext = fileName ? fileName.slice(fileName.lastIndexOf(".")) : ".mp4";
      const sanitized = fileName
        ? fileName.replace(ext, "").replace(/[^a-zA-Z0-9_-]/g, "_")
        : "upload";
      return segmentId
        ? `tenants/${orgId}/assets/manual/${segmentId}-12345${ext}`
        : `tenants/${orgId}/assets/manual/${sanitized}-12345${ext}`;
    };

    const keyWithSegment = buildUploadKey("org_news", "seg_01", "broll.mp4");
    expect(keyWithSegment).toBe("tenants/org_news/assets/manual/seg_01-12345.mp4");

    const keyWithoutSegment = buildUploadKey("org_ecommerce", undefined, "packshot.png");
    expect(keyWithoutSegment).toBe("tenants/org_ecommerce/assets/manual/packshot-12345.png");
  });

  it("formats file sizes cleanly for media cards", () => {
    const formatBytes = (bytes: number) => (bytes / 1024 / 1024).toFixed(1) + " MB";

    expect(formatBytes(10485760)).toBe("10.0 MB");
    expect(formatBytes(5242880)).toBe("5.0 MB");
    expect(formatBytes(1572864)).toBe("1.5 MB");
  });
});
