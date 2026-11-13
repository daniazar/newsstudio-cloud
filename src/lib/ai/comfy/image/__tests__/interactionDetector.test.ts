import { describe, it, expect } from "vitest";
import { hasPhysicalContact, determineSmartPipelineMode } from "../interactionDetector";

describe("Smart Interaction Detection Unit Tests (Task MP-14)", () => {
  it("should detect physical contact keywords in scene text", () => {
    expect(hasPhysicalContact("ruby and storm embracing intimately")).toBe(true);
    expect(hasPhysicalContact("missionary position on bed")).toBe(true);
    expect(hasPhysicalContact("kneeling submissive pose")).toBe(true);
    expect(hasPhysicalContact("ruby and storm sitting at news desk")).toBe(false);
  });

  it("should select SEQUENTIAL mode for zero-contact co-anchor scenes", () => {
    const mode = determineSmartPipelineMode("ruby and storm sitting at news desk, separate chairs", true);
    expect(mode).toBe("SEQUENTIAL");
  });

  it("should select SIMULTANEOUS mode for physical contact dual-persona scenes", () => {
    const mode = determineSmartPipelineMode("ruby and storm embracing, passionate kiss", true);
    expect(mode).toBe("SIMULTANEOUS");
  });

  it("should default to SEQUENTIAL mode for single persona scenes regardless of prompt text", () => {
    const mode = determineSmartPipelineMode("ruby in solo pose", false);
    expect(mode).toBe("SEQUENTIAL");
  });
});
