import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  pruneExpiredEcommerceCache,
  cleanupStaleTempFiles,
  pruneExpiredDbRecords,
} from "../cleanup";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

describe("storage cleanup - pruneExpiredEcommerceCache", () => {
  const testCacheDir = path.join(process.cwd(), "public", "assets", "cache", "ecommerce");
  const testOldFile = path.join(testCacheDir, "test_old_temp_file_123.mp4");
  const testFreshFile = path.join(testCacheDir, "test_fresh_temp_file_456.mp4");

  beforeEach(() => {
    if (!fs.existsSync(testCacheDir)) {
      fs.mkdirSync(testCacheDir, { recursive: true });
    }
    // Create test files
    fs.writeFileSync(testOldFile, Buffer.from("old-temp-content"));
    fs.writeFileSync(testFreshFile, Buffer.from("fresh-temp-content"));

    // Set mtime for old file to 3 days ago (older than 48h)
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 3600 * 1000);
    fs.utimesSync(testOldFile, threeDaysAgo, threeDaysAgo);
  });

  afterEach(() => {
    try {
      if (fs.existsSync(testOldFile)) fs.unlinkSync(testOldFile);
    } catch {}
    try {
      if (fs.existsSync(testFreshFile)) fs.unlinkSync(testFreshFile);
    } catch {}
  });

  it("dryRun does not delete files but reports candidates for pruning", async () => {
    const result = await pruneExpiredEcommerceCache({
      dryRun: true,
      maxAgeMs: 48 * 3600 * 1000,
    });

    expect(result.scannedCount).toBeGreaterThanOrEqual(2);
    expect(result.cleanedCount).toBeGreaterThanOrEqual(1);
    // In dryRun, old file must still exist
    expect(fs.existsSync(testOldFile)).toBe(true);
    expect(fs.existsSync(testFreshFile)).toBe(true);
  });

  it("actual run unlinks old files and leaves fresh files intact", async () => {
    const result = await pruneExpiredEcommerceCache({
      dryRun: false,
      maxAgeMs: 48 * 3600 * 1000,
    });

    expect(result.cleanedCount).toBeGreaterThanOrEqual(1);
    // Old file should be deleted
    expect(fs.existsSync(testOldFile)).toBe(false);
    // Fresh file must be preserved
    expect(fs.existsSync(testFreshFile)).toBe(true);
  });
});

describe("storage cleanup - cleanupStaleTempFiles", () => {
  const rootDir = process.cwd();
  const testOldProps = path.join(rootDir, "tmp-props-test-old-unit.json");
  const testFreshProps = path.join(rootDir, "tmp-props-test-fresh-unit.json");

  beforeEach(() => {
    fs.writeFileSync(testOldProps, JSON.stringify({ test: "old" }));
    fs.writeFileSync(testFreshProps, JSON.stringify({ test: "fresh" }));

    const twoDaysAgo = new Date(Date.now() - 48 * 3600 * 1000);
    fs.utimesSync(testOldProps, twoDaysAgo, twoDaysAgo);
  });

  afterEach(() => {
    try {
      if (fs.existsSync(testOldProps)) fs.unlinkSync(testOldProps);
    } catch {}
    try {
      if (fs.existsSync(testFreshProps)) fs.unlinkSync(testFreshProps);
    } catch {}
  });

  it("dryRun does not unlink files but identifies them", async () => {
    const result = await cleanupStaleTempFiles({ dryRun: true, maxAgeMs: 24 * 3600 * 1000 });
    expect(result.scannedCount).toBeGreaterThanOrEqual(1);
    expect(result.cleanedCount).toBeGreaterThanOrEqual(1);
    expect(fs.existsSync(testOldProps)).toBe(true);
    expect(fs.existsSync(testFreshProps)).toBe(true);
  });

  it("actual run unlinks old tmp-props files and preserves fresh ones", async () => {
    const result = await cleanupStaleTempFiles({ dryRun: false, maxAgeMs: 24 * 3600 * 1000 });
    expect(result.cleanedCount).toBeGreaterThanOrEqual(1);
    expect(fs.existsSync(testOldProps)).toBe(false);
    expect(fs.existsSync(testFreshProps)).toBe(true);
  });
});

describe("storage cleanup - pruneExpiredDbRecords", () => {
  it("executes deleteMany on read notifications and old job logs", async () => {
    vi.spyOn(prisma.notification, "deleteMany").mockResolvedValue({ count: 5 } as any);
    vi.spyOn(prisma.jobLog, "deleteMany").mockResolvedValue({ count: 12 } as any);

    const result = await pruneExpiredDbRecords({
      notificationRetentionDays: 30,
      jobLogRetentionDays: 14,
    });

    expect(result.deletedNotificationsCount).toBe(5);
    expect(result.deletedJobLogsCount).toBe(12);
    expect(prisma.notification.deleteMany).toHaveBeenCalled();
    expect(prisma.jobLog.deleteMany).toHaveBeenCalled();
  });
});

