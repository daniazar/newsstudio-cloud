import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import {
  createTenantSandbox,
  cleanupTenantSandbox,
  withTenantSandbox,
  getTenantScratchFilePath,
} from "@/lib/storage/sandbox";
import {
  validateVideoContainer,
  validateAudioForensics,
  generateC2PAManifest,
  runMultimodalQACheck,
} from "@/lib/qa/qualityGatekeeper";

describe("Phase 4: Multimodal QA Gatekeeper & Tenant Sandboxing", () => {
  describe("1. Tenant Scratch Workspace Sandboxing", () => {
    it("creates isolated tenant scratch directories and cleans them up", async () => {
      const tenantId = "org_test_sandbox_123";
      const jobId = "job_test_render_456";

      const sandboxPath = await createTenantSandbox(tenantId, jobId);
      expect(fs.existsSync(sandboxPath)).toBe(true);
      expect(sandboxPath).toContain(path.join("scratch", "tenants", tenantId, jobId));

      // Write a dummy artifact in the sandbox
      const testFile = getTenantScratchFilePath(sandboxPath, "props.json");
      fs.writeFileSync(testFile, JSON.stringify({ test: true }));
      expect(fs.existsSync(testFile)).toBe(true);

      // Clean up sandbox
      await cleanupTenantSandbox(sandboxPath);
      expect(fs.existsSync(sandboxPath)).toBe(false);
    });

    it("executes operations inside withTenantSandbox and auto-cleans on completion", async () => {
      let createdPath = "";

      const result = await withTenantSandbox("org_sandbox_auto", "job_789", async (sandboxPath) => {
        createdPath = sandboxPath;
        expect(fs.existsSync(sandboxPath)).toBe(true);

        const scratchFile = path.join(sandboxPath, "temp.txt");
        fs.writeFileSync(scratchFile, "temporary data");
        return "completed_ok";
      });

      expect(result).toBe("completed_ok");
      expect(fs.existsSync(createdPath)).toBe(false);
    });
  });

  describe("2. Video Container & Audio Forensic Checks", () => {
    it("rejects truncated or empty video buffers with CRITICAL failure", () => {
      const emptyBuffer = Buffer.alloc(0);
      const res = validateVideoContainer(emptyBuffer);

      expect(res.passed).toBe(false);
      expect(res.severity).toBe("CRITICAL");
      expect(res.message).toContain("corrupted or truncated");
    });

    it("rejects buffers missing MP4 container box markers", () => {
      // 4KB of random non-MP4 junk
      const junkBuffer = Buffer.from("JUNK_RANDOM_DATA_WITHOUT_FTYP_OR_MOOV".repeat(120));
      const res = validateVideoContainer(junkBuffer);

      expect(res.passed).toBe(false);
      expect(res.severity).toBe("CRITICAL");
      expect(res.message).toContain("Missing standard MP4 box markers");
    });

    it("accepts valid MP4 containers with ftyp signature", () => {
      // Construct a minimal valid MP4 header box: 4 bytes length, 'ftyp', 'mp42'
      const mp4Buffer = Buffer.alloc(4096);
      mp4Buffer.writeUInt32BE(32, 0); // box size 32
      mp4Buffer.write("ftypisom", 4, "latin1"); // ftyp box with isom compatible brand

      const res = validateVideoContainer(mp4Buffer);
      expect(res.passed).toBe(true);
      expect(res.details?.hasFtyp).toBe(true);
    });

    it("flags completely silent audio tracks with CRITICAL failure", () => {
      const silentAudio = Buffer.alloc(10000, 0); // All zeroes
      const res = validateAudioForensics(silentAudio);

      expect(res.passed).toBe(false);
      expect(res.severity).toBe("CRITICAL");
      expect(res.message).toContain("completely silent or muted");
    });

    it("verifies healthy audio tracks with active acoustic energy", () => {
      const activeAudio = Buffer.alloc(10000);
      for (let i = 0; i < activeAudio.length; i++) {
        activeAudio[i] = Math.floor(Math.random() * 255);
      }

      const res = validateAudioForensics(activeAudio);
      expect(res.passed).toBe(true);
      expect(res.message).toContain("Audible energy and sound pressure distribution verified");
    });
  });

  describe("3. C2PA Provenance Manifest & QA Gatekeeper Evaluation", () => {
    it("generates a valid C2PA manifest with digital source type and model provenance", () => {
      const videoBuffer = Buffer.alloc(4096);
      videoBuffer.write("....ftypmp42", 0, "latin1");

      const manifest = generateC2PAManifest(videoBuffer, {
        title: "Autonomous Tech Briefing",
        studioType: "interview",
        companyId: "org_c2pa_123",
        modelsUsed: ["LTX-Video-2.5", "Piper-ONNX"],
      });

      expect(manifest.claim_generator).toBe("RubyNewsStudio-v5.0-C2PA");
      expect(manifest.title).toBe("Autonomous Tech Briefing");
      expect(((manifest.assertions[0] as any).data as { actions: Array<{ digitalSourceType: string }> }).actions[0].digitalSourceType).toContain("trainedAlgorithmicMedia");
      expect(((manifest.assertions[1] as any).data as { models: string[] }).models).toEqual(["LTX-Video-2.5", "Piper-ONNX"]);
    });

    it("passes QA gatekeeper and attaches C2PA manifest for healthy broadcast video", () => {
      // Construct healthy video buffer (> 50KB with ftyp)
      const healthyVideo = Buffer.alloc(65536);
      healthyVideo.write("....ftypmp42", 0, "latin1");

      const healthyAudio = Buffer.alloc(10000);
      for (let i = 0; i < healthyAudio.length; i++) {
        healthyAudio[i] = i % 128;
      }

      const report = runMultimodalQACheck(healthyVideo, {
        title: "Prime Time News",
        studioType: "interview",
        audioBuffer: healthyAudio,
      });

      expect(report.passed).toBe(true);
      expect(report.score).toBe(100);
      expect(report.errors).toHaveLength(0);
      expect(report.c2paManifest).toBeDefined();
    });

    it("fails QA gatekeeper when critical container corruptions are detected", () => {
      const corruptVideo = Buffer.from("broken");
      const report = runMultimodalQACheck(corruptVideo);

      expect(report.passed).toBe(false);
      expect(report.score).toBeLessThan(60);
      expect(report.errors.length).toBeGreaterThan(0);
      expect(report.c2paManifest).toBeUndefined();
    });
  });
});
