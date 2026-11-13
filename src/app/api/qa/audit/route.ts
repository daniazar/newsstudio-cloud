import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { prisma } from "@/lib/prisma";
import {
  auditRenderedVideo,
  auditVideoFramesWithGemini,
  generateHeuristicQaReport,
  ForensicQaReport,
} from "@/lib/ai/qaGatekeeper";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      videoId,
      videoPath: rawVideoPath,
      frames,
      scriptText,
      title,
      aspectRatio = "9:16",
      channel = "tiktok",
    } = body;

    let targetVideoPath = rawVideoPath;
    let resolvedTitle = title || "Broadcast Ad / Story";

    // 1. If videoId provided, lookup in Prisma
    if (videoId) {
      const video = await prisma.video.findUnique({
        where: { id: videoId },
        include: { story: true },
      });

      if (video) {
        resolvedTitle = video.story?.title || video.youtubeTitle || resolvedTitle;
        if (video.outputPath) {
          targetVideoPath = video.outputPath.startsWith("http")
            ? video.outputPath
            : path.resolve(process.cwd(), video.outputPath.replace(/^\//, ""));
        } else {
          // Check standard output paths
          const standardPath = path.resolve(process.cwd(), `public/assets/completed/${videoId}.mp4`);
          if (fs.existsSync(standardPath)) {
            targetVideoPath = standardPath;
          }
        }
      }
    }

    // 2. Normalize relative video path if provided
    if (targetVideoPath && !targetVideoPath.startsWith("http") && !path.isAbsolute(targetVideoPath)) {
      targetVideoPath = path.resolve(process.cwd(), targetVideoPath.replace(/^\//, ""));
    }

    let report: ForensicQaReport;

    // 3. If direct frames are provided (e.g. from canvas or browser player)
    if (Array.isArray(frames) && frames.length > 0) {
      report = await auditVideoFramesWithGemini(frames, {
        scriptText,
        title: resolvedTitle,
        aspectRatio,
        channel,
      });
    } else if (targetVideoPath && fs.existsSync(targetVideoPath)) {
      // 4. If video file exists on disk, run end-to-end video audit with ffmpeg extraction
      report = await auditRenderedVideo(targetVideoPath, {
        scriptText,
        title: resolvedTitle,
        aspectRatio,
        channel,
      });
    } else {
      // 5. If no video file yet, generate baseline pre-flight heuristic report
      report = generateHeuristicQaReport([], {
        scriptText,
        title: resolvedTitle,
        aspectRatio,
        channel,
      });
    }

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/qa/audit] Error:", msg);
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
