import { describe, it, expect } from "vitest";
import { monitorSequentialModelOffload } from "../modelOffloadMonitor";

describe("modelOffloadMonitor (Task XA-10)", () => {
  it("should verify VRAM headroom for 14GB allocation on 24GB VRAM GPU", () => {
    const status = monitorSequentialModelOffload(1, 14.0, 12.0);

    expect(status.hasVramHeadroom).toBe(true); // 24 - 14 = 10GB free >= 8GB
    expect(status.activeVramGb).toBe(14.0);
    expect(status.maxVramGb).toBe(24);
  });

  it("should flag low VRAM headroom when active VRAM > 16GB", () => {
    const status = monitorSequentialModelOffload(1, 20.0, 30.0);

    expect(status.hasVramHeadroom).toBe(false);
  });
});
