import { NextRequest, NextResponse } from "next/server";
import { AudioFeatureService } from "@/lib/realtime/audioFeatureService";
import fs from "fs";
import path from "path";
import os from "os";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const featureId = searchParams.get("id");
    const type = searchParams.get("type");
    const frameParam = searchParams.get("frame");

    // List all available features if no id specified
    if (!featureId) {
      const features = await AudioFeatureService.listFeatures();
      return NextResponse.json({ features });
    }

    const meta = await AudioFeatureService.getFeatureMeta(featureId);
    if (!meta) {
      return NextResponse.json(
        { error: `Audio features not found for '${featureId}'` },
        { status: 404 }
      );
    }

    // 1. Single Frame Slice Request (?frame=N)
    if (frameParam !== null) {
      const frameIndex = parseInt(frameParam, 10);
      if (isNaN(frameIndex) || frameIndex < 0 || frameIndex >= meta.numFrames) {
        return NextResponse.json({ error: "Invalid frame index" }, { status: 400 });
      }

      const binPath = AudioFeatureService.getFeatureBinaryPath(featureId);
      if (!binPath) {
        return NextResponse.json({ error: "Binary file not found" }, { status: 404 });
      }

      const bytesPerFrame = meta.bytesPerFrame;
      const offset = frameIndex * bytesPerFrame;
      const buffer = Buffer.alloc(bytesPerFrame);
      const fd = await fs.promises.open(binPath, "r");
      await fd.read(buffer, 0, bytesPerFrame, offset);
      await fd.close();

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Length": bytesPerFrame.toString(),
          "X-Frame-Index": frameIndex.toString(),
          "X-Is-Silent": meta.silenceMask[frameIndex] ? "true" : "false",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    // 2. Full Binary Stream Request (?type=binary) with HTTP Range support
    if (type === "binary" || type === "bin") {
      const binPath = AudioFeatureService.getFeatureBinaryPath(featureId);
      if (!binPath || !fs.existsSync(binPath)) {
        return NextResponse.json({ error: "Binary feature file not found" }, { status: 404 });
      }

      const stat = await fs.promises.stat(binPath);
      const totalSize = stat.size;
      const rangeHeader = req.headers.get("range");

      if (rangeHeader) {
        const parts = rangeHeader.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

        if (isNaN(start) || isNaN(end) || start > end || start >= totalSize) {
          return new NextResponse(null, {
            status: 416,
            headers: { "Content-Range": `bytes */${totalSize}` },
          });
        }

        const chunkSize = end - start + 1;
        const fileStream = fs.createReadStream(binPath, { start, end });
        const webStream = new ReadableStream({
          start(controller) {
            fileStream.on("data", (chunk) => controller.enqueue(chunk));
            fileStream.on("end", () => controller.close());
            fileStream.on("error", (err) => controller.error(err));
          },
          cancel() {
            fileStream.destroy();
          },
        });

        return new NextResponse(webStream as unknown as BodyInit, {
          status: 206,
          headers: {
            "Content-Range": `bytes ${start}-${end}/${totalSize}`,
            "Accept-Ranges": "bytes",
            "Content-Length": chunkSize.toString(),
            "Content-Type": "application/octet-stream",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      }

      // No range: full file stream
      const fileStream = fs.createReadStream(binPath);
      const webStream = new ReadableStream({
        start(controller) {
          fileStream.on("data", (chunk) => controller.enqueue(chunk));
          fileStream.on("end", () => controller.close());
          fileStream.on("error", (err) => controller.error(err));
        },
        cancel() {
          fileStream.destroy();
        },
      });

      return new NextResponse(webStream as unknown as BodyInit, {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Length": totalSize.toString(),
          "Accept-Ranges": "bytes",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    // 3. Default: Return Metadata JSON
    return NextResponse.json(meta, {
      headers: {
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err: unknown) {
    console.error("[API AudioFeatures GET] Error:", err);
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    // 1. JSON payload with file path
    if (contentType.includes("application/json")) {
      const body = await req.json();
      const { audioPath, fps = 25, customId } = body;

      if (!audioPath) {
        return NextResponse.json({ error: "audioPath is required" }, { status: 400 });
      }

      const meta = await AudioFeatureService.extractFeatures(audioPath, fps, customId);
      return NextResponse.json({ success: true, meta });
    }

    // 2. Multipart form upload
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("audio") as File | null;
      const fps = parseInt(formData.get("fps") as string || "25", 10);
      const customId = (formData.get("customId") as string) || undefined;

      if (!file) {
        return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const tempDir = os.tmpdir();
      const tempPath = path.join(tempDir, `musetalk_upload_${Date.now()}_${file.name}`);
      await fs.promises.writeFile(tempPath, buffer);

      try {
        const meta = await AudioFeatureService.extractFeatures(tempPath, fps, customId);
        return NextResponse.json({ success: true, meta });
      } finally {
        if (fs.existsSync(tempPath)) {
          await fs.promises.unlink(tempPath).catch(() => {});
        }
      }
    }

    return NextResponse.json({ error: "Unsupported Content-Type" }, { status: 415 });
  } catch (err: unknown) {
    console.error("[API AudioFeatures POST] Error:", err);
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) || "Extraction failed" }, { status: 500 });
  }
}
