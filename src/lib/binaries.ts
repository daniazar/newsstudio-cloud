/**
 * src/lib/binaries.ts
 *
 * Centralized, cross-platform binary and directory resolution.
 * Replaces hardcoded local machine paths with configurable environment variables
 * and sensible Linux/Docker/Windows fallbacks.
 */

import fs from "fs";
import path from "path";
import os from "os";

/**
 * Resolve FFmpeg executable path.
 * Priority:
 * 1. FFMPEG_PATH environment variable
 * 2. System PATH ("ffmpeg")
 * 3. Remotion Windows compositor bundled binary (if on Windows)
 * 4. Local ComfyUI standalone-env (if on Windows and exists)
 */
export function getFFmpegPath(): string {
  if (process.env.FFMPEG_PATH && process.env.FFMPEG_PATH.trim() !== "") {
    return process.env.FFMPEG_PATH.trim();
  }

  if (process.platform === "win32") {
    // 1. Remotion Windows compositor
    const remotionFFmpeg = path.join(
      process.cwd(),
      "node_modules",
      "@remotion",
      "compositor-win32-x64-msvc",
      "ffmpeg.exe"
    );
    if (fs.existsSync(remotionFFmpeg)) {
      return remotionFFmpeg;
    }

    // 2. Local ComfyUI standalone desktop if present
    const localAppData = process.env.LOCALAPPDATA;
    if (localAppData) {
      const comfyFFmpeg = path.join(
        localAppData,
        "Comfy-Desktop",
        "ComfyUI-Installs",
        "ComfyUI",
        "standalone-env",
        "ffmpeg.exe"
      );
      if (fs.existsSync(comfyFFmpeg)) {
        return comfyFFmpeg;
      }
    }
  }

  // Default to system PATH
  return "ffmpeg";
}

/**
 * Resolve FFprobe executable path.
 * Priority:
 * 1. FFPROBE_PATH environment variable
 * 2. Remotion Windows compositor bundled binary (if on Windows)
 * 3. System PATH ("ffprobe")
 */
export function getFFprobePath(): string {
  if (process.env.FFPROBE_PATH && process.env.FFPROBE_PATH.trim() !== "") {
    return process.env.FFPROBE_PATH.trim();
  }

  if (process.platform === "win32") {
    const remotionFFprobe = path.join(
      process.cwd(),
      "node_modules",
      "@remotion",
      "compositor-win32-x64-msvc",
      "ffprobe.exe"
    );
    if (fs.existsSync(remotionFFprobe)) {
      return remotionFFprobe;
    }
  }

  // Default to system PATH
  return "ffprobe";
}

/**
 * Resolve Python executable path.
 * Priority:
 * 1. PYTHON_PATH environment variable
 * 2. Local project virtual environment (.venv)
 * 3. ComfyUI standalone/desktop python (if on Windows and exists)
 * 4. System python ("python3" or "python")
 */
export function getPythonPath(): string {
  if (process.env.PYTHON_PATH && process.env.PYTHON_PATH.trim() !== "") {
    return process.env.PYTHON_PATH.trim();
  }

  // Local repo virtualenv (.venv)
  const isWin = process.platform === "win32";
  const localVenv = isWin
    ? path.join(process.cwd(), ".venv", "Scripts", "python.exe")
    : path.join(process.cwd(), ".venv", "bin", "python");
  if (fs.existsSync(localVenv)) {
    return localVenv;
  }

  // ComfyUI desktop virtualenv if present on Windows
  if (isWin) {
    const localAppData = process.env.LOCALAPPDATA;
    if (localAppData) {
      const comfyVenvPy = path.join(
        localAppData,
        "Comfy-Desktop",
        "ComfyUI-Installs",
        "ComfyUI",
        "ComfyUI",
        ".venv",
        "Scripts",
        "python.exe"
      );
      if (fs.existsSync(comfyVenvPy)) return comfyVenvPy;

      const comfyStandalonePy = path.join(
        localAppData,
        "Comfy-Desktop",
        "ComfyUI-Installs",
        "ComfyUI",
        "standalone-env",
        "python.exe"
      );
      if (fs.existsSync(comfyStandalonePy)) return comfyStandalonePy;
    }
  }

  return isWin ? "python" : "python3";
}

/**
 * Resolve Google Chrome or Chromium executable.
 * Priority:
 * 1. CHROME_PATH or PUPPETEER_EXECUTABLE_PATH environment variable
 * 2. Standard Linux/Docker paths (/usr/bin/chromium, /usr/bin/google-chrome)
 * 3. Standard macOS paths
 * 4. Standard Windows paths
 */
export function getChromePath(): string {
  const envPath = process.env.CHROME_PATH || process.env.PUPPETEER_EXECUTABLE_PATH;
  if (envPath && envPath.trim() !== "") {
    return envPath.trim();
  }

  if (process.platform === "linux") {
    const linuxCandidates = [
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
    ];
    for (const c of linuxCandidates) {
      if (fs.existsSync(c)) return c;
    }
    return "chromium";
  }

  if (process.platform === "darwin") {
    const macPath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    if (fs.existsSync(macPath)) return macPath;
    return "google-chrome";
  }

  if (process.platform === "win32") {
    const winCandidates = [
      path.join(process.env["ProgramFiles"] || "C:\\Program Files", "Google", "Chrome", "Application", "chrome.exe"),
      path.join(process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)", "Google", "Chrome", "Application", "chrome.exe"),
      path.join(process.env["LOCALAPPDATA"] || "", "Google", "Chrome", "Application", "chrome.exe"),
    ];
    for (const c of winCandidates) {
      if (c && fs.existsSync(c)) return c;
    }
    return "chrome.exe";
  }

  return "google-chrome";
}

/**
 * Resolve the ComfyUI models directory.
 * Priority:
 * 1. COMFY_MODELS_DIR environment variable
 * 2. ./vendor/ComfyUI/models
 * 3. Windows local Comfy-Desktop AppData (if present)
 */
export function getComfyModelsDir(): string {
  if (process.env.COMFY_MODELS_DIR && process.env.COMFY_MODELS_DIR.trim() !== "") {
    return process.env.COMFY_MODELS_DIR.trim();
  }

  const vendorModels = path.join(process.cwd(), "vendor", "ComfyUI", "models");
  if (fs.existsSync(vendorModels)) {
    return vendorModels;
  }

  if (process.platform === "win32" && process.env.LOCALAPPDATA) {
    const desktopModels = path.join(
      process.env.LOCALAPPDATA,
      "Comfy-Desktop",
      "ComfyUI-Installs",
      "ComfyUI",
      "ComfyUI",
      "models"
    );
    if (fs.existsSync(desktopModels)) {
      return desktopModels;
    }
  }

  return vendorModels;
}

/**
 * Resolve user or temporary Downloads directory.
 */
export function getDownloadsDir(): string {
  if (process.env.DOWNLOADS_DIR && process.env.DOWNLOADS_DIR.trim() !== "") {
    return process.env.DOWNLOADS_DIR.trim();
  }

  const homeDownloads = path.join(os.homedir(), "Downloads");
  if (fs.existsSync(homeDownloads)) {
    return homeDownloads;
  }

  return path.join(os.tmpdir(), "newsstudio_downloads");
}
