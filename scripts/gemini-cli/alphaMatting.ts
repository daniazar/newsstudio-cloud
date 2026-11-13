/**
 * scripts/gemini-cli/alphaMatting.ts
 *
 * Automated Chroma Matting & 32-Bit Transparent PNG Conversion Pipeline.
 * Extracts subjects from Chroma Green (#00B140) or Chroma Blue (#0047BB) backgrounds
 * with edge despill and generates transparent RGBA PNGs for Remotion video layers.
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

export interface MattingResult {
  transparentPngPath: string;
  success: boolean;
}

export function convertToTransparentPng(
  inputImagePath: string,
  chromaColor: "green" | "blue" | "auto" = "auto",
  outputPngPath?: string
): MattingResult {
  const resolvedInput = path.resolve(inputImagePath);
  if (!fs.existsSync(resolvedInput)) {
    console.error(`❌ Error: Image file not found: ${resolvedInput}`);
    return { transparentPngPath: "", success: false };
  }

  const ext = path.extname(resolvedInput);
  const targetOutput = outputPngPath || resolvedInput.replace(new RegExp(`${ext}$`), "_transparent.png");

  console.log(`\n✂️ Executing Transparent Alpha Matting Pipeline on: ${path.basename(resolvedInput)}...`);

  // Python-based robust Chroma Key & Despill script
  const pyScript = `
import sys
from PIL import Image
import numpy as np

input_path = r"${resolvedInput.replace(/\\/g, "/")}"
output_path = r"${targetOutput.replace(/\\/g, "/")}"
chroma_mode = "${chromaColor}"

try:
    img = Image.open(input_path).convert("RGBA")
    arr = np.array(img, dtype=np.float32)

    r = arr[:, :, 0]
    g = arr[:, :, 1]
    b = arr[:, :, 2]
    a = arr[:, :, 3]

    # Auto-detect background if requested
    if chroma_mode == "auto":
        corner_r = float(np.mean(r[:20, :20]))
        corner_g = float(np.mean(g[:20, :20]))
        corner_b = float(np.mean(b[:20, :20]))
        if corner_g > corner_r + 20 and corner_g > corner_b + 20:
            chroma_mode = "green"
        elif corner_b > corner_r + 20 and corner_b > corner_g + 20:
            chroma_mode = "blue"
        else:
            chroma_mode = "green"

    if chroma_mode == "green":
        # Green Keying + Despill
        diff = g - np.maximum(r, b)
        alpha = np.clip(1.0 - (diff - 15.0) / 45.0, 0.0, 1.0)
        # Despill
        g = np.where(g > np.maximum(r, b), np.maximum(r, b), g)
    else:
        # Blue Keying + Despill
        diff = b - np.maximum(r, g)
        alpha = np.clip(1.0 - (diff - 15.0) / 45.0, 0.0, 1.0)
        # Despill
        b = np.where(b > np.maximum(r, g), np.maximum(r, g), b)

    arr[:, :, 0] = r
    arr[:, :, 1] = g
    arr[:, :, 2] = b
    arr[:, :, 3] = alpha * 255.0

    out_img = Image.fromarray(arr.astype(np.uint8), "RGBA")
    out_img.save(output_path, "PNG")
    print("SUCCESS")
except Exception as e:
    print(f"ERROR: {e}", file=sys.stderr)
    sys.exit(1)
`;

  try {
    const tempPy = path.join(process.cwd(), "scratch", "temp_matting.py");
    const scratchDir = path.dirname(tempPy);
    if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });
    fs.writeFileSync(tempPy, pyScript);

    execSync(`python "${tempPy}"`, { stdio: "pipe" });

    if (fs.existsSync(targetOutput)) {
      console.log(`🎉 Transparent Alpha PNG Generated Successfully!`);
      console.log(`📁 Clickable Output (Alt + Click to open):`);
      console.log(`file:///${targetOutput.replace(/\\/g, "/")}\n`);
      return { transparentPngPath: targetOutput, success: true };
    }
  } catch (err: any) {
    console.warn(`⚠️ Warning: Alpha matting failed:`, err.message || err);
  }

  return { transparentPngPath: "", success: false };
}
