import sharp from "sharp";
import fs from "fs";
import path from "path";
import { comfyLog } from "../api";

/**
 * src/lib/ai/comfy/image/compositeBuilder.ts
 *
 * Composites two single-subject reference images (e.g. Ruby + Volt) side-by-side
 * into a single 1024x1024 dual-persona starting canvas.
 *
 * Primary subject on left half (512x1024), Partner subject on right half (512x1024).
 * Eliminates single-subject starting latent bias in SDXL/Pony img2img pipelines.
 */
export async function createSideBySideCompositeImage(
  primaryPath: string,
  partnerPath: string,
  targetWidth: number = 1024,
  targetHeight: number = 1024
): Promise<string> {
  const halfWidth = Math.floor(targetWidth / 2);

  comfyLog(`[CompositeBuilder] 🖼️  Creating Dual-Persona Composite Starting Canvas (${targetWidth}x${targetHeight})...`);
  comfyLog(`   └─ Left half (0-${halfWidth}px): ${path.basename(primaryPath)}`);
  comfyLog(`   └─ Right half (${halfWidth}-${targetWidth}px): ${path.basename(partnerPath)}`);

  const leftBuffer = await sharp(primaryPath)
    .resize(halfWidth, targetHeight, { fit: "cover", position: "centre" })
    .toBuffer();

  const rightBuffer = await sharp(partnerPath)
    .resize(halfWidth, targetHeight, { fit: "cover", position: "centre" })
    .toBuffer();

  const compositeBuffer = await sharp({
    create: {
      width: targetWidth,
      height: targetHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 }
    }
  })
  .composite([
    { input: leftBuffer, left: 0, top: 0 },
    { input: rightBuffer, left: halfWidth, top: 0 }
  ])
  .png()
  .toBuffer();

  const outputDir = path.join(process.cwd(), "scratch", "character_presets_output");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const p1Name = path.basename(primaryPath, path.extname(primaryPath));
  const p2Name = path.basename(partnerPath, path.extname(partnerPath));
  const outPath = path.join(outputDir, `composite_duo_${p1Name}_${p2Name}_${targetWidth}x${targetHeight}.png`);

  fs.writeFileSync(outPath, compositeBuffer);
  comfyLog(`[CompositeBuilder] ✅ Saved Dual-Persona Composite Starting Canvas: ${outPath} (${Math.round(compositeBuffer.length / 1024)} KB)`);
  return outPath;
}
