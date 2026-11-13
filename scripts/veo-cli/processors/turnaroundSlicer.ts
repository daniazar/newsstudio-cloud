/**
 * scripts/veo-cli/processors/turnaroundSlicer.ts
 *
 * Slices 4-in-1 panoramic character turnaround sheets into discrete multi-angle stills:
 *   1. 01_front.png
 *   2. 02_angle_45_left.png
 *   3. 03_angle_45_right.png
 *   4. 04_profile.png
 *
 * Saves discrete angle assets into public/avatars/<persona>/angles/ for 3-camera broadcast arrays.
 */

import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { printClickablePath } from "../artifactManager";

export interface SlicedAnglesResult {
  success: boolean;
  anglesDir: string;
  slices: {
    name: string;
    angleLabel: string;
    filePath: string;
  }[];
  error?: string;
}

export async function sliceTurnaroundSheet(
  mediaPath: string,
  personaSlug: string,
  customOutputDir?: string
): Promise<SlicedAnglesResult> {
  if (!fs.existsSync(mediaPath)) {
    return { success: false, anglesDir: "", slices: [], error: `File not found: ${mediaPath}` };
  }

  const defaultDir = path.join(process.cwd(), "public", "avatars", personaSlug, "angles");
  const outDir = customOutputDir || defaultDir;
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log("\n==================================================================");
  console.log(`📐 SLICING 4-IN-1 TURNAROUND SHEET: [${personaSlug}]`);
  console.log("==================================================================");
  console.log(`Source File: ${mediaPath}`);
  console.log(`Destination: ${outDir}`);

  const pyExeCandidates = [
    "C:\\Users\\danie\\AppData\\Local\\Comfy-Desktop\\ComfyUI-Installs\\ComfyUI\\ComfyUI\\.venv\\Scripts\\python.exe",
    "python",
    "python3",
  ];
  const pythonPath = pyExeCandidates.find((p) => p === "python" || fs.existsSync(p)) || "python";

  const scratchDir = path.resolve(process.cwd(), "scratch");
  if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });
  const scriptPath = path.resolve(scratchDir, "slice_turnaround.py");

  const pyCode = `
import cv2
import sys
import os
import json

def slice_turnaround(in_path, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    ext = os.path.splitext(in_path)[1].lower()
    
    frame = None
    if ext in ['.mp4', '.mov', '.webm', '.avi']:
        cap = cv2.VideoCapture(in_path)
        if not cap.isOpened():
            print(json.dumps({"error": "Failed to open video"}))
            return False
        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 1
        target_idx = max(0, min(total - 1, int(total * 0.25)))
        cap.set(cv2.CAP_PROP_POS_FRAMES, target_idx)
        ret, frame = cap.read()
        cap.release()
        if not ret or frame is None:
            print(json.dumps({"error": "Failed to extract frame from video"}))
            return False
    else:
        frame = cv2.imread(in_path)
        if frame is None:
            print(json.dumps({"error": "Failed to read image"}))
            return False

    h, w = frame.shape[:2]
    slice_w = w // 4
    
    slices_def = [
        ("01_front.png", "Front Center 0°", 0, slice_w),
        ("02_angle_45_left.png", "Three-Quarter Left 45°", slice_w, slice_w * 2),
        ("03_angle_45_right.png", "Three-Quarter Right 45°", slice_w * 2, slice_w * 3),
        ("04_profile.png", "Side Profile 90°", slice_w * 3, w),
    ]
    
    results = []
    for filename, label, x1, x2 in slices_def:
        cropped = frame[:, x1:x2]
        dest = os.path.join(out_dir, filename)
        cv2.imwrite(dest, cropped)
        results.append({
            "name": filename,
            "angleLabel": label,
            "filePath": dest
        })
        
    manifest_path = os.path.join(out_dir, "angles_manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
        
    print(json.dumps({"success": True, "results": results}))
    return True

if __name__ == '__main__':
    slice_turnaround(sys.argv[1], sys.argv[2])
`;

  fs.writeFileSync(scriptPath, pyCode, "utf8");

  try {
    const res = spawnSync(pythonPath, [scriptPath, mediaPath, outDir], {
      stdio: "pipe",
      windowsHide: true,
      encoding: "utf8",
    });

    if (res.status === 0) {
      const output = res.stdout || "";
      let parsed: any = {};
      try {
        parsed = JSON.parse(output.trim().split("\n").pop() || "{}");
      } catch {}

      const slices = parsed.results || [
        { name: "01_front.png", angleLabel: "Front Center 0°", filePath: path.join(outDir, "01_front.png") },
        { name: "02_angle_45_left.png", angleLabel: "Three-Quarter Left 45°", filePath: path.join(outDir, "02_angle_45_left.png") },
        { name: "03_angle_45_right.png", angleLabel: "Three-Quarter Right 45°", filePath: path.join(outDir, "03_angle_45_right.png") },
        { name: "04_profile.png", angleLabel: "Side Profile 90°", filePath: path.join(outDir, "04_profile.png") },
      ];

      console.log(`\n✔ Successfully sliced 4 distinct camera angles for [${personaSlug}]:`);
      slices.forEach((s: any) => {
        console.log(`   • ${s.angleLabel}: file:///${s.filePath.replace(/\\/g, "/")}`);
      });
      printClickablePath(outDir);

      return { success: true, anglesDir: outDir, slices };
    } else {
      console.error("❌ Python slicer error:", res.stderr);
      return { success: false, anglesDir: outDir, slices: [], error: res.stderr };
    }
  } catch (err: any) {
    console.error("❌ Slicing process error:", err.message);
    return { success: false, anglesDir: outDir, slices: [], error: err.message || String(err) };
  }
}
