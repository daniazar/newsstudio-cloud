/**
 * src/tests/loopAuditor.test.ts
 *
 * Test suite for Video Loop & Transition Boundary Auditor.
 */

import { describe, it, expect } from "vitest";
import path from "path";
import fs from "fs";
import {
  classifyVideoLoop,
  resolvePersonaReference,
  auditSingleVideo,
} from "../lib/video/loopAuditor";

describe("Video Loop & Transition Boundary Auditor Suite", () => {
  describe("classifyVideoLoop", () => {
    it("should classify idle beats correctly", () => {
      const res1 = classifyVideoLoop("veo_ruby_p01_standing_clasped_9x16_master.mp4");
      expect(res1.classification).toBe("idle_motion_beat");
      expect(res1.persona).toBe("ruby");

      const res2 = classifyVideoLoop("veo_blaze_p02_idle_4s_3063.mp4");
      expect(res2.classification).toBe("idle_motion_beat");
      expect(res2.persona).toBe("blaze");
    });

    it("should classify FLF transitions correctly", () => {
      const res = classifyVideoLoop("ruby_m1_to_m2_transition_4s.mp4");
      expect(res.classification).toBe("flf_transition");
      expect(res.persona).toBe("ruby");
    });
  });

  describe("resolvePersonaReference", () => {
    it("should resolve reference image for ruby and blaze", () => {
      const rubyRef = resolvePersonaReference("ruby");
      expect(rubyRef).toBeDefined();
      expect(typeof rubyRef).toBe("string");

      const blazeRef = resolvePersonaReference("blaze");
      expect(blazeRef).toBeDefined();
      expect(typeof blazeRef).toBe("string");
    });
  });

  describe("auditSingleVideo", () => {
    it("should audit an existing master loop and verify metrics", async () => {
      const loopPath = path.resolve(
        process.cwd(),
        "public/assets/action_loops/veo/veo_blaze_p03_idle_4s_9672.mp4"
      );

      if (fs.existsSync(loopPath)) {
        const result = await auditSingleVideo(loopPath, { targetSsim: 0.90 });
        expect(result.totalFrames).toBeGreaterThan(0);
        expect(result.fps).toBeGreaterThan(0);
        expect(result.seamMetrics.ssim).toBeGreaterThanOrEqual(0.90);
        expect(result.seamMetrics.psnr).toBeGreaterThanOrEqual(26.0);
        expect(result.passed).toBe(true);
      }
    });
  });
});
