import { describe, it, expect } from "vitest";
import { enforceContactModeGate } from "../contactModeGate";

describe("contactModeGate (Task SW-6)", () => {
  it("should cap intensity at 30 and fallback FULL_CONTACT to HYBRID in SFW mode", () => {
    const res = enforceContactModeGate("FULL_CONTACT", "SFW", 80);

    expect(res.allowedMode).toBe("HYBRID");
    expect(res.cappedIntensity).toBe(30);
    expect(res.isCappedOrBlocked).toBe(true);
  });

  it("should allow full contact and 100 intensity in NSFW_EXPLICIT mode", () => {
    const res = enforceContactModeGate("TANDEM_SKELETON", "NSFW_EXPLICIT", 100);

    expect(res.allowedMode).toBe("TANDEM_SKELETON");
    expect(res.cappedIntensity).toBe(100);
    expect(res.isCappedOrBlocked).toBe(false);
  });
});
