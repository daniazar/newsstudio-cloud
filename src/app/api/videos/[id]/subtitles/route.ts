import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSRT, generateVTT } from "@/lib/subtitles/srt";
import { requireTenant } from "@/lib/tenant";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") || "srt"; // "srt" or "vtt"

  try {
    // 1. Fetch the video and its story with segments (scoped to the tenant)
    const video = await prisma.video.findFirst({
      where: { id, companyId: orgId },
      include: {
        story: {
          include: {
            script: {
              include: { segments: { orderBy: { index: "asc" } } },
            },
          },
        },
      },
    });

    if (!video || !video.story || !video.story.script) {
      return NextResponse.json({ error: "Video, story, or script not found" }, { status: 404 });
    }

    const segments = video.story.script.segments;
    if (segments.length === 0) {
      return NextResponse.json({ error: "No segments found to generate subtitles" }, { status: 400 });
    }

    // 2. Map DB segments to SubtitleSegment format
    const subtitleSegments = segments.map((seg) => ({
      index: seg.index,
      startTime: seg.startTime,
      endTime: seg.endTime,
      text: seg.text,
    }));

    // 3. Generate content
    let content = "";
    let contentType = "";
    let filename = "";

    if (format === "vtt") {
      content = generateVTT(subtitleSegments);
      contentType = "text/vtt; charset=utf-8";
      filename = `subtitles-${video.id}.vtt`;
    } else {
      content = generateSRT(subtitleSegments);
      contentType = "text/srt; charset=utf-8";
      filename = `subtitles-${video.id}.srt`;
    }

    // 4. Return as downloadable file
    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[Subtitles API] GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
