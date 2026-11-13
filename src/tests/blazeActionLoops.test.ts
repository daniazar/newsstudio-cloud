import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import {
  getPersona37Clips,
  getClipMetaById,
  generateRandomLoopSequence,
} from "@/lib/ecommerce/actionLoopFsmEngine";
import { resolveBeatAssetPaths } from "@/lib/video/loopSelector";

describe("Blaze Wilder Action Loops and Veo Lite Catalog", () => {
  const dir = path.resolve(process.cwd(), "public/assets/action_loops/veo/blaze_silver_blazer");
  const manifestPath = path.join(dir, "manifest.json");

  it("should have all 10 core action loop video files generated on disk", () => {
    expect(fs.existsSync(dir)).toBe(true);
    const expectedFiles = [
      "blaze_silver_blazer_M1_loop_v1.mp4",
      "blaze_silver_blazer_M1_loop_v2.mp4",
      "blaze_silver_blazer_M2_loop_v1.mp4",
      "blaze_silver_blazer_M2_loop_v2.mp4",
      "blaze_silver_blazer_M3_loop_v1.mp4",
      "blaze_silver_blazer_M3_loop_v2.mp4",
      "blaze_silver_blazer_M4_loop_v1.mp4",
      "blaze_silver_blazer_M4_loop_v2.mp4",
      "blaze_silver_blazer_M5_loop_v1.mp4",
      "blaze_silver_blazer_M5_loop_v2.mp4",
    ];

    for (const file of expectedFiles) {
      const fullPath = path.join(dir, file);
      expect(fs.existsSync(fullPath), `File missing: ${file}`).toBe(true);
      const stat = fs.statSync(fullPath);
      expect(stat.size).toBeGreaterThan(100_000);
    }
  });

  it("should have a valid manifest.json containing action loops generated at 5 credits", () => {
    expect(fs.existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    const keys = Object.keys(manifest);
    expect(keys.length).toBeGreaterThanOrEqual(10);

    for (const key of keys) {
      const entry = manifest[key];
      expect(entry.width).toBe(1920);
      expect(entry.height).toBe(1080);
      expect(entry.fps).toBe(24);
      expect(entry.duration).toBeGreaterThanOrEqual(7);
      expect(entry.duration).toBeLessThanOrEqual(9);
      expect(entry.chargedCredits).toBe(5);
      expect(entry.sha256).toBeTruthy();
    }
  });

  it("should resolve Blaze 37-clip catalog with correct prefix", () => {
    const clips = getPersona37Clips("blaze");
    expect(clips.length).toBe(37);
    expect(clips[0].file).toBe("blaze_silver_blazer_M1_loop_v1.mp4");
    expect(clips[9].file).toBe("blaze_silver_blazer_M5_loop_v2.mp4");
  });

  it("should resolve clip meta by ID with blaze prefix", () => {
    const meta = getClipMetaById("blaze_silver_blazer_M3_loop_v1", "blaze");
    expect(meta).toBeDefined();
    expect(meta?.id).toBe("M3_loop_v1");
    expect(meta?.startPose).toBe("M3");
    expect(meta?.endPose).toBe("M3");
  });

  it("should generate random loop sequence for Blaze targeting duration", () => {
    const sequence = generateRandomLoopSequence(192 * 2, {
      personaId: "blaze",
      startingPose: "M1",
    });
    expect(sequence.length).toBeGreaterThanOrEqual(2);
    expect(sequence[0].videoUrl).toContain("blaze_silver_blazer");
  });

  it("should resolve broadcast loop sequence node for Blaze", () => {
    const node = {
      actionStateId: "explanatory_gesture",
      startPose: "M2",
      endPose: "M2",
      transitionType: "same_pose_beat" as const,
      camera: "cam1_wide" as const,
    };

    const resolved = resolveBeatAssetPaths(node, "blaze");
    expect(resolved.videoPath).toBe("/assets/action_loops/veo/blaze_silver_blazer/blaze_silver_blazer_M2_loop_v1.mp4");
  });
});
