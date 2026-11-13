import { describe, it, expect } from "vitest";
import { runLowResCompositionGate } from "../lowResCompositionTester";

describe("lowResCompositionTester (Task QX-6)", () => {
  it("should evaluate low-res gates and authorize 1024px full render", () => {
    const res = runLowResCompositionGate("/tmp/thumb128.png", "/tmp/preview512.png");

    expect(res.passed128pxGate).toBe(true);
    expect(res.passed512pxGate).toBe(true);
    expect(res.allowFull1024pxRender).toBe(true);
  });
});
