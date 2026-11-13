/**
 * src/tests/echomimicClient.test.ts
 *
 * Test suite for EchoMimic V3 Client, health checks, and fallback mechanisms.
 */

import { describe, it, expect, vi } from "vitest";
import {
  checkEchoMimicHealth,
  generateEchoMimicLipSync,
} from "../lib/ai/echomimicClient";

describe("EchoMimic V3 Client Suite", () => {
  describe("Health Check & Server Detection", () => {
    it("should return false if server is unreachable without crashing", async () => {
      // Port 9999 is guaranteed unreachable in test environment
      const isOnline = await checkEchoMimicHealth("http://127.0.0.1:9999");
      expect(isOnline).toBe(false);
    });

    it("should return true when health endpoint responds with 200 OK", async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch as any;

      const isOnline = await checkEchoMimicHealth("http://localhost:8006");
      expect(isOnline).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8006/health",
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });
  });

  describe("Validation & Error Resilience", () => {
    it("should throw a descriptive error if neither videoPath nor imagePath is provided", async () => {
      await expect(
        generateEchoMimicLipSync({
          audioPath: "dummy.wav",
          outputPath: "output.mp4",
        })
      ).rejects.toThrow("Must provide either videoPath or imagePath");
    });

    it("should throw if the provided audio file does not exist", async () => {
      await expect(
        generateEchoMimicLipSync({
          imagePath: "nonexistent.png",
          audioPath: "nonexistent.wav",
          outputPath: "output.mp4",
        })
      ).rejects.toThrow("Input image not found");
    });
  });
});
