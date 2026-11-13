import { describe, it, expect } from "vitest";
import { getCanonicalPose } from "../canonicalPoseLibrary";

describe("canonicalPoseLibrary (Task EX-4)", () => {
  it("should resolve pose map path for standing anchor pose", () => {
    const pose = getCanonicalPose("pose_standing_anchor");

    expect(pose.poseKey).toBe("pose_standing_anchor");
    expect(pose.category).toBe("standing");
    expect(pose.poseMapPath).toContain("pose_standing_anchor.png");
  });
});
