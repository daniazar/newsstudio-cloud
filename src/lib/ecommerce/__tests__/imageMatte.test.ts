/**
 * src/lib/ecommerce/__tests__/imageMatte.test.ts
 *
 * Unit tests for Sharp-based white background removal & BFS flood-fill.
 */

import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { removeWhiteBackground } from "../imageMatte";

describe("imageMatte background removal", () => {
  it("converts white perimeter pixels to alpha 0 while preserving colored foreground object", async () => {
    const width = 60;
    const height = 60;
    const rawRgba = new Uint8Array(width * height * 4);

    // Create a 60x60 test image:
    // Solid white background (255, 255, 255, 255)
    // Red square in the center (x: 20..40, y: 20..40) with color (200, 30, 30, 255)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const isCenter = x >= 20 && x <= 40 && y >= 20 && y <= 40;

        if (isCenter) {
          rawRgba[idx] = 200;     // R
          rawRgba[idx + 1] = 30;  // G
          rawRgba[idx + 2] = 30;  // B
          rawRgba[idx + 3] = 255; // A
        } else {
          rawRgba[idx] = 255;     // White R
          rawRgba[idx + 1] = 255; // White G
          rawRgba[idx + 2] = 255; // White B
          rawRgba[idx + 3] = 255; // White A
        }
      }
    }

    const testInputBuffer = await sharp(rawRgba, {
      raw: { width, height, channels: 4 },
    })
      .png()
      .toBuffer();

    const mattedBuffer = await removeWhiteBackground(testInputBuffer, {
      threshold: 230,
      maxSaturation: 20,
    });

    // Inspect output pixels
    const { data: outData, info } = await sharp(mattedBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    expect(info.width).toBe(width);
    expect(info.height).toBe(height);

    // 1. Top-left corner (0, 0) must be 100% transparent (alpha = 0)
    const cornerAlpha = outData[3];
    expect(cornerAlpha).toBe(0);

    // 2. Bottom-right corner (59, 59) must be 100% transparent
    const brIdx = ((height - 1) * width + (width - 1)) * 4;
    expect(outData[brIdx + 3]).toBe(0);

    // 3. Center pixel (30, 30) must remain opaque red (alpha = 255)
    const centerIdx = (30 * width + 30) * 4;
    expect(outData[centerIdx]).toBe(200);     // Red channel preserved
    expect(outData[centerIdx + 1]).toBe(30);   // Green preserved
    expect(outData[centerIdx + 2]).toBe(30);   // Blue preserved
    expect(outData[centerIdx + 3]).toBe(255);  // Opaque alpha
  });

  it("does not punch holes in interior white pixels enclosed by colored boundaries", async () => {
    const width = 40;
    const height = 40;
    const rawRgba = new Uint8Array(width * height * 4);

    // Background: White
    // Box: Blue border (x: 10..30, y: 10..30)
    // Box interior: White (x: 15..25, y: 15..25)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const isOuter = x < 10 || x > 30 || y < 10 || y > 30;
        const isInteriorWhite = x >= 15 && x <= 25 && y >= 15 && y <= 25;

        if (isOuter) {
          rawRgba[idx] = 255;
          rawRgba[idx + 1] = 255;
          rawRgba[idx + 2] = 255;
          rawRgba[idx + 3] = 255;
        } else if (isInteriorWhite) {
          rawRgba[idx] = 250;
          rawRgba[idx + 1] = 250;
          rawRgba[idx + 2] = 250;
          rawRgba[idx + 3] = 255;
        } else {
          // Blue border
          rawRgba[idx] = 20;
          rawRgba[idx + 1] = 50;
          rawRgba[idx + 2] = 220;
          rawRgba[idx + 3] = 255;
        }
      }
    }

    const testInputBuffer = await sharp(rawRgba, {
      raw: { width, height, channels: 4 },
    })
      .png()
      .toBuffer();

    const mattedBuffer = await removeWhiteBackground(testInputBuffer, {
      threshold: 230,
    });

    const { data: outData } = await sharp(mattedBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Interior white at (20, 20) must be PRESERVED because BFS did not breach the blue perimeter!
    const interiorIdx = (20 * width + 20) * 4;
    expect(outData[interiorIdx + 3]).toBe(255);
  });

  it("suppresses white edge halos and unmultiplies white bleed on dark object perimeters", async () => {
    const width = 50;
    const height = 50;
    const rawRgba = new Uint8Array(width * height * 4);

    // Dark product tile (30, 30, 30) centered at x: 15..35, y: 15..35
    // Near-white edge halo at x: 14, 36, y: 14, 36 with (220, 220, 220)
    // Pure white background elsewhere (255, 255, 255)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const isCore = x >= 16 && x <= 34 && y >= 16 && y <= 34;
        const isFringe = (x === 15 || x === 35 || y === 15 || y === 35) && x >= 14 && x <= 36 && y >= 14 && y <= 36;

        if (isCore) {
          rawRgba[idx] = 30;
          rawRgba[idx + 1] = 30;
          rawRgba[idx + 2] = 30;
          rawRgba[idx + 3] = 255;
        } else if (isFringe) {
          rawRgba[idx] = 225; // White fringe / bleed
          rawRgba[idx + 1] = 225;
          rawRgba[idx + 2] = 225;
          rawRgba[idx + 3] = 255;
        } else {
          rawRgba[idx] = 255; // White background
          rawRgba[idx + 1] = 255;
          rawRgba[idx + 2] = 255;
          rawRgba[idx + 3] = 255;
        }
      }
    }

    const testInputBuffer = await sharp(rawRgba, {
      raw: { width, height, channels: 4 },
    })
      .png()
      .toBuffer();

    const mattedBuffer = await removeWhiteBackground(testInputBuffer, {
      threshold: 232,
      defringe: true,
    });

    const { data: outData } = await sharp(mattedBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // The white fringe pixel at (15, 15) must be eroded/cleared or significantly reduced
    const fringeIdx = (15 * width + 15) * 4;
    expect(outData[fringeIdx + 3]).toBeLessThan(100);

    // Core tile at (25, 25) must remain opaque dark tile
    const coreIdx = (25 * width + 25) * 4;
    expect(outData[coreIdx]).toBe(30);
    expect(outData[coreIdx + 3]).toBe(255);
  });
});

