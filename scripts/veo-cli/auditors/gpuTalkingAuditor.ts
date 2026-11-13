// scripts/veo-cli/auditors/gpuTalkingAuditor.ts
import { execFile } from "child_process";
import path from "path";
import fs from "fs";

const PYTHON_CANDIDATES = [
  "C:\\Users\\danie\\AppData\\Local\\Comfy-Desktop\\ComfyUI-Installs\\ComfyUI\\standalone-env\\python.exe",
  "python",
];

function resolvePython(): string {
  for (const p of PYTHON_CANDIDATES) {
    if (fs.existsSync(p)) return p;
  }
  return "python";
}

export interface GpuTalkingAuditResult {
  file: string;
  filename: string;
  status: "SILENT" | "SUBTLE_MOTION" | "TALKING" | "ERROR_OPEN" | "NO_FACE";
  isTalking: boolean;
  score: number;
  lipMotion: number;
  talkPercent: number;
  aspectRatio: string;
  durationSec: number;
}

export async function auditVideoTalkingGpu(videoPath: string, threshold: number = 35.0): Promise<GpuTalkingAuditResult> {
  const pythonPath = resolvePython();
  const scriptPath = path.resolve(process.cwd(), "scripts/detect_talking_gpu.py");

  const isRotationTransition = /T[1-5]_to_5|T5_to_[1-5]|turn/i.test(videoPath);
  const effectiveThreshold = (videoPath.toLowerCase().includes("jeremiah") || isRotationTransition) ? Math.max(threshold, 46.0) : threshold;
  const args = [scriptPath, "--file", videoPath, "--threshold", effectiveThreshold.toString(), "--json-stdout"];

  return new Promise((resolve, reject) => {
    execFile(pythonPath, args, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        return reject(new Error(`GPU Talking Auditor failed: ${err.message}\n${stderr}`));
      }
      try {
        const raw = stdout.trim();
        const jsonStart = raw.indexOf("{");
        const jsonStr = jsonStart !== -1 ? raw.slice(jsonStart) : raw;
        const parsed = JSON.parse(jsonStr);
        resolve({
          file: parsed.file,
          filename: parsed.filename,
          status: parsed.status,
          isTalking: parsed.is_talking,
          score: parsed.composite_talking_score,
          lipMotion: parsed.avg_lip_motion,
          talkPercent: parsed.talking_motion_pct,
          aspectRatio: parsed.aspect_ratio,
          durationSec: parsed.duration_sec,
        });
      } catch (parseErr: any) {
        reject(new Error(`Failed to parse Talking Auditor JSON: ${parseErr.message}\nRaw Output: ${stdout}`));
      }
    });
  });
}
