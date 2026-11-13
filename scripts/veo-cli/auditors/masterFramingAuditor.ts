// scripts/veo-cli/auditors/masterFramingAuditor.ts
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

export interface MasterFramingResult {
  directory: string;
  imagesAudited: number;
  targetFaceHeightPx: number;
  targetFaceRatioPct: number;
  mismatchesDetected: number;
  fixedCount: number;
  fixedFiles: string[];
  status: "PASS" | "FAIL_FRAMING_MISMATCH";
  items: Array<{
    file: string;
    name: string;
    faceDetected: boolean;
    faceHeight: number;
    faceRatio: number;
    shotType: string;
  }>;
}

export async function auditAndNormalizeMasterFraming(dirPath: string, autoFix: boolean = true): Promise<MasterFramingResult> {
  const pythonPath = resolvePython();
  const scriptPath = path.resolve(process.cwd(), "scripts/audit_and_normalize_framing.py");

  const args = [scriptPath, "--dir", dirPath, "--json"];
  if (autoFix) args.push("--fix");

  return new Promise((resolve, reject) => {
    execFile(pythonPath, args, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        return reject(new Error(`Master Framing Auditor failed: ${err.message}\n${stderr}`));
      }
      try {
        const raw = stdout.trim();
        // Extract JSON block if any warning logs precede it
        const jsonStart = raw.indexOf("{");
        const jsonStr = jsonStart !== -1 ? raw.slice(jsonStart) : raw;
        const parsed = JSON.parse(jsonStr);
        resolve({
          directory: parsed.directory,
          imagesAudited: parsed.images_audited,
          targetFaceHeightPx: parsed.target_face_height_px,
          targetFaceRatioPct: parsed.target_face_ratio_pct,
          mismatchesDetected: parsed.mismatches_detected,
          fixedCount: parsed.fixed_count,
          fixedFiles: parsed.fixed_files || [],
          status: parsed.status,
          items: (parsed.items || []).map((it: any) => ({
            file: it.file,
            name: it.name,
            faceDetected: it.face_detected,
            faceHeight: it.face_height,
            faceRatio: it.face_ratio,
            shotType: it.shot_type,
          })),
        });
      } catch (parseErr: any) {
        reject(new Error(`Failed to parse Framing Auditor JSON: ${parseErr.message}\nRaw Output: ${stdout}`));
      }
    });
  });
}
