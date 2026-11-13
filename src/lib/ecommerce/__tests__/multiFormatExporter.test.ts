/**
 * src/lib/ecommerce/__tests__/multiFormatExporter.test.ts
 *
 * Unit tests for Sprint E6.2 Headless Multi-Format Video Exporter.
 */

import { describe, it, expect } from "vitest";
import {
  buildWebmCommand,
  buildWebpCommand,
  buildGifCommands,
  exportMultiFormatVideo,
} from "../multiFormatExporter";

describe("Sprint E6.2 Headless Multi-Format Exporter", () => {
  it("builds correct WebM transcode command with VP9 and 720p scale", () => {
    const cmd = buildWebmCommand("/path/to/master.mp4", "/path/to/loop.webm", 6);
    expect(cmd).toContain("libvpx-vp9");
    expect(cmd).toContain("-b:v 850k");
    expect(cmd).toContain("-crf 32");
    expect(cmd).toContain("-an");
    expect(cmd).toContain('scale=720:-2"');
    expect(cmd).toContain("-t 6");
  });

  it("builds correct WebP transcode command with 15fps and 480p scale", () => {
    const cmd = buildWebpCommand("/path/to/master.mp4", "/path/to/email.webp", 4);
    expect(cmd).toContain("libwebp");
    expect(cmd).toContain("fps=15,scale=480:-2:flags=lanczos");
    expect(cmd).toContain("-q:v 70");
    expect(cmd).toContain("-loop 0");
    expect(cmd).toContain("-t 4");
  });

  it("builds two-pass GIF command with palettegen and paletteuse", () => {
    const { pass1, pass2 } = buildGifCommands(
      "/path/to/master.mp4",
      "/path/to/palette.png",
      "/path/to/fallback.gif",
      3
    );
    expect(pass1).toContain("palettegen");
    expect(pass2).toContain("paletteuse");
    expect(pass2).toContain("fps=12,scale=400:-2");
  });

  it("runs exportMultiFormatVideo in dryRun mode and produces valid deliverables metadata", async () => {
    const result = await exportMultiFormatVideo("renders/ecommerce/test_ad.mp4", {
      dryRun: true,
      generateWebm: true,
      generateWebp: true,
      generateGif: true,
      loopDurationSec: 6,
    });

    expect(result.masterMp4.format).toBe("mp4");
    expect(result.masterMp4.filename).toBe("test_ad.mp4");

    expect(result.webmLoop).toBeDefined();
    expect(result.webmLoop?.format).toBe("webm");
    expect(result.webmLoop?.filename).toBe("test_ad-loop.webm");
    expect(result.webmLoop?.useCase).toContain("Shopify PDP Hero Banner");
    // WebM size should be under 2.5MB
    expect(result.webmLoop?.sizeBytes).toBeLessThan(2.5 * 1024 * 1024);

    expect(result.webpLoop).toBeDefined();
    expect(result.webpLoop?.format).toBe("webp");
    expect(result.webpLoop?.filename).toBe("test_ad-email.webp");
    expect(result.webpLoop?.useCase).toContain("Email Marketing");
    // WebP size should be under 1.8MB
    expect(result.webpLoop?.sizeBytes).toBeLessThan(1.8 * 1024 * 1024);

    expect(result.gifLoop).toBeDefined();
    expect(result.gifLoop?.format).toBe("gif");
    expect(result.gifLoop?.filename).toBe("test_ad-fallback.gif");

    expect(result.allFiles.length).toBe(4);
    expect(result.totalSizeBytes).toBeGreaterThan(0);
  });
});
