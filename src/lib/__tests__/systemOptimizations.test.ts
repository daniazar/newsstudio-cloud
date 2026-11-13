/**
 * src/lib/__tests__/systemOptimizations.test.ts
 *
 * Unit tests for system-wide optimizations:
 * - Remotion persistent entry point resolution
 * - Content-Addressable Storage (CAS) hash deduplication
 * - Database compaction & WAL checkpointing
 */

import { describe, it, expect, vi } from "vitest";
import {
  getRemotionEntryPoint,
  isRemotionBundleStale,
  getRemotionBinPath,
  getOptimalRemotionConcurrency,
} from "@/lib/video/remotionUtils";
import { computeBufferHash, generateCasKey, uploadWithCas } from "@/lib/storage/cas";
import { compactDatabase } from "@/lib/dbMaintenance";
import { storage } from "@/lib/storage";

describe("System Optimizations Suite", () => {
  describe("Remotion Pre-Bundle Resolution", () => {
    it("returns valid Remotion entry point configuration", () => {
      const info = getRemotionEntryPoint();
      expect(info).toBeDefined();
      expect(typeof info.entryPoint).toBe("string");
      expect(typeof info.isPrebundled).toBe("boolean");
      expect(info.prebundlePath).toContain("build");

      if (info.isPrebundled) {
        expect(info.entryPoint).toBe("build");
      } else {
        expect(info.entryPoint).toBe("src/remotion/Root.tsx");
      }
    });

    it("detects force fresh override via REMOTION_FORCE_FRESH", () => {
      const prev = process.env.REMOTION_FORCE_FRESH;
      process.env.REMOTION_FORCE_FRESH = "true";
      expect(isRemotionBundleStale()).toBe(true);
      process.env.REMOTION_FORCE_FRESH = prev;
    });

    it("resolves valid Remotion CLI executable path", () => {
      const bin = getRemotionBinPath();
      expect(typeof bin).toBe("string");
      expect(bin.length).toBeGreaterThan(0);
    });

    it("calculates balanced render concurrency based on hardware", () => {
      const concurrency = getOptimalRemotionConcurrency(false);
      expect(typeof concurrency).toBe("number");
      expect(concurrency).toBeGreaterThanOrEqual(2);
      expect(concurrency).toBeLessThanOrEqual(6);

      const draftConcurrency = getOptimalRemotionConcurrency(true);
      expect(draftConcurrency).toBeGreaterThanOrEqual(concurrency);
    });
  });

  describe("Content-Addressable Storage (CAS) Deduplication", () => {
    it("computes deterministic SHA-256 hash for buffer payloads", () => {
      const buffer1 = Buffer.from("NewsStudio E-Commerce Ad Sample Payload");
      const buffer2 = Buffer.from("NewsStudio E-Commerce Ad Sample Payload");
      const buffer3 = Buffer.from("Different payload data");

      const hash1 = computeBufferHash(buffer1);
      const hash2 = computeBufferHash(buffer2);
      const hash3 = computeBufferHash(buffer3);

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hash3);
      expect(hash1.length).toBe(64);
    });

    it("generates structured tenant-namespaced CAS keys", () => {
      const buffer = Buffer.from("Test audio sample buffer");
      const { key, hash } = generateCasKey("test-company-123", "audio", "wav", buffer);

      expect(key).toContain("tenants/test-company-123/cas/audio/");
      expect(key.endsWith(`.${hash}.wav`) || key.includes(hash)).toBe(true);
      expect(hash.length).toBe(32);
    });

    it("detects existing assets and returns without duplicate storage upload", async () => {
      const testBuffer = Buffer.from("Mock duplicate image content");
      const companyId = "test-tenant-abc";

      // First upload
      const res1 = await uploadWithCas(companyId, "images", "png", testBuffer, "image/png");
      expect(res1.key).toBeDefined();
      expect(res1.url).toBeDefined();

      // Second upload with identical buffer should detect duplicate
      const res2 = await uploadWithCas(companyId, "images", "png", testBuffer, "image/png");
      expect(res2.key).toBe(res1.key);
      expect(res2.url).toBe(res1.url);
      expect(res2.isDuplicate).toBe(true);
    });
  });

  describe("Database Compaction & WAL Truncation", () => {
    it("safely executes compactDatabase against active SQLite database", async () => {
      const result = await compactDatabase();
      expect(result).toBeDefined();
      expect(typeof result.success).toBe("boolean");
      expect(typeof result.durationMs).toBe("number");
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(["sqlite", "postgresql", "other"]).toContain(result.provider);
    });
  });
});
