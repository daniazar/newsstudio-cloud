import { NextRequest, NextResponse } from "next/server";
import { MuseTalkAssetService } from "@/lib/realtime/musetalkAssetService";
import fs from "fs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: avatarId } = await params;
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const frameParam = searchParams.get("frame");

    const meta = await MuseTalkAssetService.getAvatarMeta(avatarId);
    if (!meta) {
      return NextResponse.json(
        { error: `Avatar asset packet not found for '${avatarId}'` },
        { status: 404 }
      );
    }

    // 1. Single Frame Slice Request (?frame=N)
    if (frameParam !== null) {
      const frameIndex = parseInt(frameParam, 10);
      if (isNaN(frameIndex)) {
        return NextResponse.json({ error: "Invalid frame index" }, { status: 400 });
      }

      const frameBytes = await MuseTalkAssetService.getFrameLatentBytes(avatarId, frameIndex);
      if (!frameBytes) {
        return NextResponse.json({ error: "Failed to read frame bytes" }, { status: 404 });
      }

      return new NextResponse(new Uint8Array(frameBytes), {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Length": frameBytes.length.toString(),
          "X-Frame-Index": frameIndex.toString(),
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    // 2. Full Binary Stream Request (?type=latents) with HTTP Range support
    if (type === "latents" || type === "binary") {
      const binPath = MuseTalkAssetService.getLatentsBinPath(avatarId);
      if (!binPath || !fs.existsSync(binPath)) {
        return NextResponse.json({ error: "Latent binary file not found" }, { status: 404 });
      }

      const stat = await fs.promises.stat(binPath);
      const totalSize = stat.size;
      const rangeHeader = req.headers.get("range");

      if (rangeHeader) {
        // e.g. "bytes=0-16383"
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
        status: 200,
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Length": totalSize.toString(),
          "Accept-Ranges": "bytes",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    // 3. Default: JSON Metadata Packet
    return NextResponse.json({
      ...meta,
      latentsUrl: `/api/presenter/musetalk/packet/${avatarId}?type=latents`,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: "Failed to process asset packet request", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
