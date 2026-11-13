import { NextResponse } from "next/server";
import { downloadMusicToStorage } from "@/lib/music";
import { requireTenant } from "@/lib/tenant";

import { z } from "zod";

const MusicTrackSchema = z.object({
  externalId: z.string(),
  provider: z.string(),
  name: z.string(),
  artist: z.string().optional(),
  mood: z.string(),
  url: z.string().url(),
  previewUrl: z.string().url(),
  downloadUrl: z.string().url(),
  duration: z.number(),
  bpm: z.number().optional(),
  license: z.string(),
  tags: z.array(z.string()).optional(),
});

const DownloadPayloadSchema = z.object({
  track: MusicTrackSchema,
});

/**
 * POST /api/music/download
 * Download a selected background music track to MinIO/local storage
 * and create a BackgroundMusic record in the DB.
 */
export async function POST(request: Request) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const rawBody = await request.json();
    const parsedData = DownloadPayloadSchema.safeParse(rawBody);

    if (!parsedData.success) {
      return NextResponse.json(
        { error: "Invalid track payload provided", details: parsedData.error.format() },
        { status: 400 }
      );
    }

    const { track } = parsedData.data;

    const result = await downloadMusicToStorage(track, orgId);

    return NextResponse.json({ 
      success: true, 
      bgMusicId: result.id, 
      storageKey: result.storageKey 
    });
  } catch (error) {
    console.error("[API:MusicDownload] Error:", error);
    return NextResponse.json(
      { error: "Failed to download music track", details: (error as Error).message },
      { status: 500 }
    );
  }
}
