/**
 * src/tests/tempCleaner.test.ts
 *
 * Unit tests for automated temp file and orphaned artifact garbage collection.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { cleanOrphanedTempFiles } from "../lib/storage/tempCleaner";

describe("Temp Artifact Garbage Collector", () => {
  const testFiles: string[] = [];

  beforeEach(() => {
    testFiles.length = 0;
  });

  afterEach(() => {
    for (const f of testFiles) {
      try {
        if (fs.existsSync(f)) {
          if (fs.statSync(f).isDirectory()) {
            fs.rmSync(f, { recursive: true, force: true });
          } else {
            fs.unlinkSync(f);
          }
        }
      } catch {}
    }
  });

  it("identifies and sweeps stale files matching extended TEMP_PREFIXES", () => {
    const tmpDir = os.tmpdir();
    
    // Create test files matching various prefixes
    const prefixes = ["fsm_stitch_", "presenter-", "audio-fsm-", "video-fsm-", "beat_chunker_"];
    const createdPaths: string[] = [];

    for (const prefix of prefixes) {
      const filePath = path.join(tmpDir, `${prefix}test_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.tmp`);
      fs.writeFileSync(filePath, "test content");
      // Set modification time to 2 days ago
      const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
      fs.utimesSync(filePath, twoDaysAgo, twoDaysAgo);
      createdPaths.push(filePath);
      testFiles.push(filePath);
    }

    // Run cleanOrphanedTempFiles with maxAgeMs = 1 hour
    const result = cleanOrphanedTempFiles({ maxAgeMs: 60 * 60 * 1000 });

    expect(result.scannedCount).toBeGreaterThanOrEqual(prefixes.length);
    expect(result.cleanedCount).toBeGreaterThanOrEqual(prefixes.length);

    // Verify all created test files have been deleted
    for (const p of createdPaths) {
      expect(fs.existsSync(p)).toBe(false);
    }
  });

  it("respects dryRun option and does not delete matching stale files", () => {
    const tmpDir = os.tmpdir();
    const filePath = path.join(tmpDir, `fsm_stitch_dryrun_${Date.now()}.tmp`);
    fs.writeFileSync(filePath, "dry run test data");
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    fs.utimesSync(filePath, twoDaysAgo, twoDaysAgo);
    testFiles.push(filePath);

    const result = cleanOrphanedTempFiles({ maxAgeMs: 60 * 60 * 1000, dryRun: true });

    expect(result.scannedCount).toBeGreaterThanOrEqual(1);
    expect(fs.existsSync(filePath)).toBe(true);
  });
});
