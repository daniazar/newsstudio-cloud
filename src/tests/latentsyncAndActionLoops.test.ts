import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import {
  checkLatentSyncHealth,
  generateLatentSyncLipSync,
} from "@/lib/ai/latentsyncClient";
import {
  buildActionLoopsManifest,
  processPersonaActionLoops,
  SECONDARY_PERSONAS,
} from "../../scripts/generate-action-loops-batch";

describe("Phase 7: Secondary Action Loops & LatentSync UNet Inpainting", () => {
  describe("1. LatentSync UNet Inpainting Client", () => {
    it("reports offline gracefully when LatentSync server is not running", async () => {
      const isOnline = await checkLatentSyncHealth("http://127.0.0.1:9999");
      expect(isOnline).toBe(false);
    });

    it("validates local file existence before submission", async () => {
      const result = await generateLatentSyncLipSync({
        videoPath: "non_existent_video.mp4",
        audioPath: "non_existent_audio.wav",
        outputPath: "test_output.mp4",
        serverUrl: "http://127.0.0.1:9999",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Input video/image not found");
    });

    it("falls back to mock synthesis when server is offline and inputs exist", async () => {
      // Create temporary input files
      const tmpDir = path.join(process.cwd(), "scratch/tmp/test_latentsync");
      fs.mkdirSync(tmpDir, { recursive: true });

      const testVideo = path.join(tmpDir, "input_test.mp4");
      const testAudio = path.join(tmpDir, "input_test.wav");
      const testOut = path.join(tmpDir, "output_test.mp4");

      fs.writeFileSync(testVideo, Buffer.from("....ftypisom...."));
      fs.writeFileSync(testAudio, Buffer.alloc(1000, 1));

      try {
        const result = await generateLatentSyncLipSync({
          videoPath: testVideo,
          audioPath: testAudio,
          outputPath: testOut,
          serverUrl: "http://127.0.0.1:9999", // Unreachable port triggers mock
        });

        expect(result.success).toBe(true);
        expect(result.isMock).toBe(true);
        expect(result.durationSeconds).toBe(4.0);
        expect(fs.existsSync(testOut)).toBe(true);
      } finally {
        if (fs.existsSync(testVideo)) fs.unlinkSync(testVideo);
        if (fs.existsSync(testAudio)) fs.unlinkSync(testAudio);
        if (fs.existsSync(testOut)) fs.unlinkSync(testOut);
      }
    });
  });

  describe("2. Secondary Persona Action Loops Batching", () => {
    it("builds a standard 4.0s boundary-locked manifest for secondary personas", () => {
      const manifest = buildActionLoopsManifest("diego", 30);

      expect(manifest.personaId).toBe("diego");
      expect(manifest.fps).toBe(30);
      expect(manifest.loopDurationFrames).toBe(120); // 4.0s at 30fps
      expect(manifest.boundaryLocked).toBe(true);

      // Verify M1, M2, M3 loops exist
      expect(manifest.loops).toHaveLength(3);
      expect(manifest.loops[0].poseTag).toBe("M1");
      expect(manifest.loops[1].poseTag).toBe("M2");
      expect(manifest.loops[2].poseTag).toBe("M3");

      // Verify transitions
      expect(manifest.transitions.length).toBeGreaterThanOrEqual(4);
      expect(manifest.transitions[0].durationSeconds).toBe(2.0);
    });

    it("executes persona action loops dry-run and generates manifest JSON", async () => {
      const diegoPersona = SECONDARY_PERSONAS.find((p) => p.id === "diego")!;
      expect(diegoPersona).toBeDefined();

      const result = await processPersonaActionLoops(diegoPersona, true);
      expect(result.success).toBe(true);
      expect(fs.existsSync(result.manifestPath)).toBe(true);

      const parsedManifest = JSON.parse(fs.readFileSync(result.manifestPath, "utf-8"));
      expect(parsedManifest.personaId).toBe("diego");
      expect(parsedManifest.loops).toHaveLength(3);
    });
  });
});
