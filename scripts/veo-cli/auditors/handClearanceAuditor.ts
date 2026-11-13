// scripts/veo-cli/auditors/handClearanceAuditor.ts
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

export interface HandClearanceResult {
  directory: string;
  allPassed: boolean;
  totalImages: number;
  passedCount: number;
  failedCount: number;
  failingImages: string[];
  images: Array<{
    file: string;
    filename: string;
    passed: boolean;
    reasons: string[];
    headroomPx: number;
    bottomClearancePx: number;
    handClearancePx?: number;
    leftMarginPx: number;
    rightMarginPx: number;
  }>;
}

export async function auditMasterHandClearance(dirPath: string): Promise<HandClearanceResult> {
  const pythonPath = resolvePython();
  const scriptPath = path.resolve(process.cwd(), "scripts/audit_master_hand_clearance.py");

  const args = [scriptPath, "--dir", dirPath, "--json"];

  return new Promise((resolve, reject) => {
    execFile(pythonPath, args, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      // Note: audit script exits with 1 if any image fails, but still outputs valid JSON
      try {
        const raw = stdout.trim();
        const jsonStart = raw.indexOf("{");
        if (jsonStart === -1) {
          return reject(new Error(`Failed to find JSON in auditor output: ${stdout}\nStderr: ${stderr}`));
        }
        const jsonStr = raw.slice(jsonStart);
        const parsed = JSON.parse(jsonStr);

        resolve({
          directory: parsed.directory,
          allPassed: parsed.all_passed,
          totalImages: parsed.total_images,
          passedCount: parsed.passed_count,
          failedCount: parsed.failed_count,
          failingImages: parsed.failing_images || [],
          images: (parsed.images || []).map((it: any) => ({
            file: it.file,
            filename: it.filename,
            passed: it.passed,
            reasons: it.reasons || [],
            headroomPx: it.headroom_px,
            bottomClearancePx: it.bottom_clearance_px,
            handClearancePx: it.hand_clearance_px,
            leftMarginPx: it.left_margin_px,
            rightMarginPx: it.right_margin_px,
          })),
        });
      } catch (parseErr: any) {
        reject(new Error(`Failed to parse Hand Clearance Auditor JSON: ${parseErr.message}\nRaw: ${stdout}\nStderr: ${stderr}`));
      }
    });
  });
}
