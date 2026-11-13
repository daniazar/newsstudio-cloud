import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { recordSessionConsistencyMetrics } from "../consistencyOracle";

describe("consistencyOracle (Task EX-11)", () => {
  const testDir = path.join(process.cwd(), "scratch", "test_oracle");

  beforeEach(() => {
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it("should record session consistency metrics and flag drift when distance > threshold", () => {
    const res = recordSessionConsistencyMetrics("ruby", "ruby_out.png", 0.75, 0.22, testDir);

    expect(res.isFlagged).toBe(true);
    expect(res.log.sessions.length).toBe(1);
    expect(res.log.sessions[0].faceEmbeddingDistance).toBe(0.22);
  });

  it("should return flagged: false for high similarity session", () => {
    const res = recordSessionConsistencyMetrics("ruby", "ruby_out.png", 0.94, 0.05, testDir);

    expect(res.isFlagged).toBe(false);
  });
});
