/**
 * src/lib/ai/comfy/utils.ts
 *
 * Windows sleep prevention and media helpers for the ComfyUI client library.
 */

import { ChildProcess,spawn } from "child_process";
import fs from "fs";
import { createLogger } from "@/lib/logger";

const log = createLogger("comfy:utils");

export function startKeepAwake(): ChildProcess | null {
  if (process.platform !== "win32") return null;
  try {
    const psCommand = `
      $signature = @'
      [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
      public static extern uint SetThreadExecutionState(uint esFlags);
      '@
      $type = $null
      try {
        $type = Add-Type -MemberDefinition $signature -Name "Win32Sleep" -Namespace "Win32API" -PassThru
      } catch {}
      $wsh = New-Object -ComObject WScript.Shell
      while ($true) {
        if ($type) { [void]$type::SetThreadExecutionState(0x80000043) }
        $wsh.SendKeys("{F15}")
        Start-Sleep -Seconds 30
      }
    `;
    const child = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", psCommand], {
      detached: true,
      stdio: "ignore"
    });
    log.info("[KeepAwake] Windows sleep prevention active.");
    return child;
  } catch (err) {
    console.warn("[KeepAwake] Failed to start keep-awake process:", err);
    return null;
  }
}

export function stopKeepAwake(child: ChildProcess | null) {
  if (!child) return;
  try {
    child.kill();
    log.info("[KeepAwake] Windows sleep prevention disabled.");
  } catch (err) {
    console.warn("[KeepAwake] Failed to stop keep-awake process:", err);
  }
}

export function getWavDuration(filePath: string): number {
  try {
    if (!fs.existsSync(filePath)) return 10;
    const b = fs.readFileSync(filePath);
    let offset = 12;
    let sampleRate = 0, channels = 0, bits = 0;
    while (offset < b.length) {
      const chunkId = b.toString("ascii", offset, offset + 4);
      const chunkSize = b.readUInt32LE(offset + 4);
      if (chunkId === "fmt ") {
        channels = b.readUInt16LE(offset + 8 + 2);
        sampleRate = b.readUInt32LE(offset + 8 + 4);
        bits = b.readUInt16LE(offset + 8 + 14);
        break;
      }
      offset += 8 + chunkSize;
    }
    if (sampleRate && channels && bits) {
      const duration = b.length / (sampleRate * channels * (bits / 8));
      return isNaN(duration) || !isFinite(duration) ? 10 : duration;
    }
  } catch (err) {
    console.warn("[ComfyClient] Failed to read WAV duration:", err);
  }
  return 10;
}

export function getPngDimensions(filePath: string): { width: number; height: number } {
  try {
    const buffer = fs.readFileSync(filePath);
    // 1. PNG
    if (buffer.length >= 24 && buffer.readUInt32BE(0) === 0x89504E47) {
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      return { width, height };
    }
    // 2. JPEG
    if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xD8) {
      let i = 2;
      while (i < buffer.length - 8) {
        if (buffer[i] === 0xFF) {
          const marker = buffer[i + 1];
          if ((marker >= 0xC0 && marker <= 0xC3) || (marker >= 0xC5 && marker <= 0xC7) || (marker >= 0xC9 && marker <= 0xCB) || (marker >= 0xCD && marker <= 0xCF)) {
            const height = buffer.readUInt16BE(i + 5);
            const width = buffer.readUInt16BE(i + 7);
            return { width, height };
          }
          const length = buffer.readUInt16BE(i + 2);
          i += 2 + length;
        } else {
          i++;
        }
      }
    }
    // 3. WebP
    if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
      const chunkType = buffer.toString("ascii", 12, 16);
      if (chunkType === "VP8 ") {
        const width = buffer.readUInt16LE(26) & 0x3FFF;
        const height = buffer.readUInt16LE(28) & 0x3FFF;
        return { width, height };
      } else if (chunkType === "VP8L") {
        const val = buffer.readUInt32LE(21);
        const width = (val & 0x3FFF) + 1;
        const height = ((val >> 14) & 0x3FFF) + 1;
        return { width, height };
      } else if (chunkType === "VP8X") {
        const width = (buffer.readUInt16LE(24) | (buffer[26] << 16)) + 1;
        const height = (buffer.readUInt16LE(27) | (buffer[29] << 16)) + 1;
        return { width, height };
      }
    }
  } catch {}
  return { width: 1024, height: 576 };
}

export { getFFmpegPath,getFFprobePath } from "@/lib/binaries";
