import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { DELETE } from "@/app/api/ecommerce/generate-custom-scene/route";
import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";

describe("DELETE /api/ecommerce/generate-custom-scene", () => {
  const testOutputDir = path.join(process.cwd(), "public", "assets", "ecommerce", "veo_scenes");
  const testFileName = "test_delete_video_12345.mp4";
  const testFilePath = path.join(testOutputDir, testFileName);

  beforeEach(() => {
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }
    // Create dummy video file
    fs.writeFileSync(testFilePath, "mock video bytes", "utf8");
  });

  afterEach(() => {
    if (fs.existsSync(testFilePath)) {
      try {
        fs.unlinkSync(testFilePath);
      } catch {}
    }
  });

  it("returns 400 if neither videoUrl nor jobId is provided", async () => {
    const req = new NextRequest("http://localhost:3000/api/ecommerce/generate-custom-scene", {
      method: "DELETE",
      body: JSON.stringify({}),
    });

    const res = await DELETE(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain("Either videoUrl or jobId is required");
  });

  it("deletes the physical file from disk when videoUrl is provided", async () => {
    expect(fs.existsSync(testFilePath)).toBe(true);

    const req = new NextRequest("http://localhost:3000/api/ecommerce/generate-custom-scene", {
      method: "DELETE",
      body: JSON.stringify({
        videoUrl: `/assets/ecommerce/veo_scenes/${testFileName}`,
      }),
    });

    const res = await DELETE(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(fs.existsSync(testFilePath)).toBe(false);
    expect(data.deletedFiles.length).toBeGreaterThan(0);
  });
});
