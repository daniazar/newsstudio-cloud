import { describe, it, expect } from "vitest";
import { harvestSceneMetadata } from "../metadataHarvester";

describe("metadataHarvester (Task EX-3)", () => {
  it("should implicitly harvest HDRI, LUT, and Pose keys for bar night scene", () => {
    const meta = harvestSceneMetadata("Ruby seated at intimate hotel bar at night");

    expect(meta.autoHdriName).toBe("bar_amber_night");
    expect(meta.autoLutName).toBe("cinematic_teal_orange");
    expect(meta.autoPoseKey).toBe("pose_seated_34");
    expect(meta.contextNegatives.length).toBeGreaterThan(0);
  });
});
