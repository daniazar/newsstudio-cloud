/**
 * scripts/gemini-cli/terminalPreview.ts
 *
 * In-Terminal ANSI 24-bit TrueColor Raster Image Previewer.
 * Renders generated images directly inside PowerShell / Windows Terminal.
 */

import fs from "fs";
import sharp from "sharp";

export async function renderTerminalImagePreview(
  imagePath: string,
  width: number = 64
): Promise<void> {
  if (!fs.existsSync(imagePath)) {
    return;
  }

  try {
    const meta = await sharp(imagePath).metadata();
    const origWidth = meta.width || 100;
    const origHeight = meta.height || 100;

    // Terminal character cells are approx 2:1 vertical-to-horizontal aspect ratio
    const height = Math.round((origHeight / origWidth) * (width / 2));

    const { data, info } = await sharp(imagePath)
      .resize(width, height, { fit: "fill" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    console.log(`\n🖼️ In-Terminal Image Preview [${info.width}x${info.height}]:`);
    console.log("┌" + "─".repeat(width) + "┐");

    for (let y = 0; y < info.height; y++) {
      let line = "│";
      for (let x = 0; x < info.width; x++) {
        const offset = (y * info.width + x) * 4;
        const r = data[offset];
        const g = data[offset + 1];
        const b = data[offset + 2];
        const a = data[offset + 3];

        if (a < 128) {
          line += " ";
        } else {
          line += `\x1b[48;2;${r};${g};${b}m \x1b[0m`;
        }
      }
      line += "│";
      console.log(line);
    }

    console.log("└" + "─".repeat(width) + "┘\n");
  } catch (err: any) {
    // If preview rendering fails, silently continue
  }
}
