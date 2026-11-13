import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { findGoldenSeed } from "../autoSeedSearch";

describe("autoSeedSearch (Task EV-11)", () => {
  const testDir = path.join(process.cwd(), "scratch", "test_golden_seeds");

  beforeEach(() => {
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it("should discover and return golden seed for persona + sceneType combination", () => {
    const record = findGoldenSeed("ruby", "hotel_bar_seated", testDir);

    expect(record.goldenSeed).toBeGreaterThan(0);
    expect(record.compositeScore).toBeGreaterThan(0.75);
  });
});
