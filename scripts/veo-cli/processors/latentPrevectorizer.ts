/**
 * scripts/veo-cli/processors/latentPrevectorizer.ts
 *
 * Pre-vectorization bridge for MuseTalk & KeySync real-time lip-sync engines.
 * Pre-computes:
 *   • 512x512 VAE Latent Tensors (latents.pt)
 *   • 68-point 2D Facial Landmark Trajectories (landmarks.npy)
 *   • Lower-Face Inpainting Masks (masks.pt)
 *   • Temporal Metadata Index (meta.json)
 */

import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { printClickablePath } from "../artifactManager";

export interface PrevectorizeResult {
  success: boolean;
  outputDir: string;
  latentsPath?: string;
  landmarksPath?: string;
  masksPath?: string;
  metaPath?: string;
  error?: string;
}

export async function prevectorizeVideoClip(
  videoPath: string,
  customOutputDir?: string
): Promise<PrevectorizeResult> {
  if (!fs.existsSync(videoPath)) {
    return { success: false, outputDir: "", error: `Video not found: ${videoPath}` };
  }

  const baseName = path.basename(videoPath, path.extname(videoPath));
  const defaultDir = path.join(process.cwd(), "public", "assets", "action_loops", "keysync_precomputed", baseName);
  const outDir = customOutputDir || defaultDir;

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log("\n==================================================================");
  console.log(`⚡ PRE-VECTORIZING CLIP FOR REAL-TIME LIP-SYNC: [${baseName}]`);
  console.log("==================================================================");
  console.log(`Source Video: ${videoPath}`);
  console.log(`Output Directory: ${outDir}`);

  const pyExeCandidates = [
    "C:\\Users\\danie\\AppData\\Local\\Comfy-Desktop\\ComfyUI-Installs\\ComfyUI\\ComfyUI\\.venv\\Scripts\\python.exe",
    "python",
    "python3",
  ];
  const pythonPath = pyExeCandidates.find((p) => p === "python" || fs.existsSync(p)) || "python";

  const scriptPath = path.resolve(process.cwd(), "scripts", "keysync", "pre_vectorize_pool.py");
  if (!fs.existsSync(scriptPath)) {
    return { success: false, outputDir: outDir, error: `Script not found: ${scriptPath}` };
  }

  try {
    const res = spawnSync(pythonPath, [scriptPath, "--video", videoPath, "--output", outDir], {
      stdio: "inherit",
      windowsHide: true,
      cwd: process.cwd(),
    });

    const latentsPath = path.join(outDir, "latents.pt");
    const landmarksPath = path.join(outDir, "landmarks.npy");
    const masksPath = path.join(outDir, "masks.pt");
    const metaPath = path.join(outDir, "meta.json");

    if (fs.existsSync(landmarksPath)) {
      console.log(`\n✔ Pre-vectorization completed successfully!`);
      printClickablePath(outDir);
      return {
        success: true,
        outputDir: outDir,
        latentsPath: fs.existsSync(latentsPath) ? latentsPath : undefined,
        landmarksPath,
        masksPath: fs.existsSync(masksPath) ? masksPath : undefined,
        metaPath: fs.existsSync(metaPath) ? metaPath : undefined,
      };
    } else {
      return { success: false, outputDir: outDir, error: "landmarks.npy was not created" };
    }
  } catch (err: any) {
    console.error("❌ Pre-vectorization execution failed:", err.message);
    return { success: false, outputDir: outDir, error: err.message || String(err) };
  }
}
