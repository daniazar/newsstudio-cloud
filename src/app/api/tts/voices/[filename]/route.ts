import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { requireTenant } from "@/lib/tenant";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const t = await requireTenant();
    if (!t.ok) return t.response;

    const { filename } = await params;

    if (!filename || typeof filename !== "string") {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    const safeFilename = path.basename(filename);
    if (!/^[a-zA-Z0-9_.-]+\.(wav|mp3|ogg)$/i.test(safeFilename)) {
      return NextResponse.json({ error: "Invalid voice filename or unsupported audio extension" }, { status: 400 });
    }

    const allowedDirs = [
      path.resolve(process.cwd(), "public/presets/voices"),
      path.resolve(process.cwd(), "public/voices"),
    ];

    let resolvedVoicePath: string | null = null;
    for (const dir of allowedDirs) {
      const candidate = path.resolve(dir, safeFilename);
      // Ensure candidate path stays strictly inside allowed directory
      if (candidate.startsWith(dir + path.sep) && fs.existsSync(candidate)) {
        resolvedVoicePath = candidate;
        break;
      }
    }

    if (!resolvedVoicePath) {
      return NextResponse.json({ error: "Voice file not found" }, { status: 404 });
    }

    const stat = fs.statSync(resolvedVoicePath);
    const nodeStream = fs.createReadStream(resolvedVoicePath);
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;

    const ext = path.extname(safeFilename).toLowerCase();
    const contentType = ext === ".mp3" ? "audio/mpeg" : ext === ".ogg" ? "audio/ogg" : "audio/wav";

    return new Response(webStream, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": stat.size.toString(),
        "Accept-Ranges": "bytes",
      },
    });
  } catch (error) {
    console.error("[TTS Voice Proxy Error]", error);
    return NextResponse.json({ error: "Failed to read voice file" }, { status: 500 });
  }
}
