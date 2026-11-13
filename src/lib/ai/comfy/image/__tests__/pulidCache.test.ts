import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { getOrExtractPuLIDEmbedding, savePuLIDEmbeddingCache } from "../pulidCache";

describe("pulidCache (Task PR-5)", () => {
  const testDir = path.join(process.cwd(), "scratch", "test_pulid_cache");
  const testRefPath = path.join(testDir, "test_ruby.png");

  beforeEach(() => {
    fs.mkdirSync(testDir, { recursive: true });
    fs.writeFileSync(testRefPath, "fake image bytes");
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it("should return isCached: false when cache file does not exist", () => {
    const res = getOrExtractPuLIDEmbedding("ruby", testRefPath, testDir);
    expect(res.isCached).toBe(false);
  });

  it("should save embedding vector and return isCached: true on subsequent lookup", () => {
    const dummyVector = new Array(512).fill(0.123);
    savePuLIDEmbeddingCache("ruby", testRefPath, dummyVector, testDir);

    const res = getOrExtractPuLIDEmbedding("ruby", testRefPath, testDir);
    expect(res.isCached).toBe(true);
    expect(res.embeddingRecord?.embeddingVector.length).toBe(512);
  });

  it("should invalidate cache if face reference file mtime changes", () => {
    const dummyVector = new Array(512).fill(0.123);
    savePuLIDEmbeddingCache("ruby", testRefPath, dummyVector, testDir);

    // Modify test image timestamp
    const futureTime = new Date(Date.now() + 10000);
    fs.utimesSync(testRefPath, futureTime, futureTime);

    const res = getOrExtractPuLIDEmbedding("ruby", testRefPath, testDir);
    expect(res.isCached).toBe(false);
  });
});
