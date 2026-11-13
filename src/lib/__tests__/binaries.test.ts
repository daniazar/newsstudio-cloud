/**
 * src/lib/__tests__/binaries.test.ts
 *
 * Unit tests for dynamic cross-platform binary and directory resolution.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getFFmpegPath,
  getFFprobePath,
  getPythonPath,
  getChromePath,
  getComfyModelsDir,
  getDownloadsDir,
} from "@/lib/binaries";
import path from "path";
import os from "os";

describe("Dynamic Binary & Directory Resolution", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.FFMPEG_PATH;
    delete process.env.FFPROBE_PATH;
    delete process.env.PYTHON_PATH;
    delete process.env.CHROME_PATH;
    delete process.env.COMFY_MODELS_DIR;
    delete process.env.DOWNLOADS_DIR;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("FFmpeg & FFprobe Resolution", () => {
    it("respects FFMPEG_PATH environment variable override", () => {
      process.env.FFMPEG_PATH = "/custom/bin/ffmpeg";
      expect(getFFmpegPath()).toBe("/custom/bin/ffmpeg");
    });

    it("respects FFPROBE_PATH environment variable override", () => {
      process.env.FFPROBE_PATH = "/custom/bin/ffprobe";
      expect(getFFprobePath()).toBe("/custom/bin/ffprobe");
    });

    it("returns a valid non-empty string when no override is set", () => {
      const ffmpeg = getFFmpegPath();
      const ffprobe = getFFprobePath();
      expect(typeof ffmpeg).toBe("string");
      expect(ffmpeg.length).toBeGreaterThan(0);
      expect(typeof ffprobe).toBe("string");
      expect(ffprobe.length).toBeGreaterThan(0);
    });
  });

  describe("Python Resolution", () => {
    it("respects PYTHON_PATH environment variable override", () => {
      process.env.PYTHON_PATH = "/usr/bin/python3.11";
      expect(getPythonPath()).toBe("/usr/bin/python3.11");
    });

    it("returns a valid python executable path or fallback string", () => {
      const python = getPythonPath();
      expect(typeof python).toBe("string");
      expect(python.length).toBeGreaterThan(0);
    });
  });

  describe("Chrome Resolution", () => {
    it("respects CHROME_PATH environment variable override", () => {
      process.env.CHROME_PATH = "/opt/google/chrome/chrome";
      expect(getChromePath()).toBe("/opt/google/chrome/chrome");
    });

    it("returns a string path for chrome", () => {
      const chrome = getChromePath();
      expect(typeof chrome).toBe("string");
      expect(chrome.length).toBeGreaterThan(0);
    });
  });

  describe("Directory Resolution", () => {
    it("respects COMFY_MODELS_DIR environment variable override", () => {
      process.env.COMFY_MODELS_DIR = "/data/comfyui/models";
      expect(getComfyModelsDir()).toBe("/data/comfyui/models");
    });

    it("returns default models directory path when env is not set", () => {
      const dir = getComfyModelsDir();
      expect(typeof dir).toBe("string");
      expect(dir.length).toBeGreaterThan(0);
    });

    it("respects DOWNLOADS_DIR environment variable override", () => {
      process.env.DOWNLOADS_DIR = "/custom/downloads";
      expect(getDownloadsDir()).toBe("/custom/downloads");
    });

    it("defaults to user home Downloads folder", () => {
      const expected = path.join(os.homedir(), "Downloads");
      expect(getDownloadsDir()).toBe(expected);
    });
  });
});
