import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { storage, withTenant } from "@/lib/storage";
import { requireTenant } from "@/lib/tenant";

/**
 * POST /api/stories/[storyId]/audio
 * Uploads a generated audio blob for a specific segment and updates the database.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const { storyId } = await params;

    // Ownership: the story must belong to the active tenant.
    const story = await prisma.story.findFirst({ where: { id: storyId, companyId: orgId }, select: { id: true } });
    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    const formData = await req.formData();
    const segmentIndexStr = formData.get("segmentIndex") as string;
    const audioBlob = formData.get("audio") as Blob;

    if (!segmentIndexStr || !audioBlob) {
      return NextResponse.json({ error: "Missing segmentIndex or audio blob" }, { status: 400 });
    }

    const segmentIndex = parseInt(segmentIndexStr, 10);

    // 1. Prepare tenant-scoped S3 Key
    const objectKey = withTenant(orgId, `stories/${storyId}/audio/segment-${segmentIndex}.webm`);

    // 2. Upload to storage
    const buffer = Buffer.from(await audioBlob.arrayBuffer());
    const publicUrl = await storage.upload(objectKey, buffer, audioBlob.type || "audio/webm");

    // 3. Find the script for this story to get the correct scriptId
    const script = await prisma.script.findUnique({
      where: { storyId },
      select: { id: true }
    });

    if (!script) {
      return NextResponse.json({ error: "Script not found for this story" }, { status: 404 });
    }

    // 4. Update the segment in DB
    await prisma.segment.update({
      where: {
        scriptId_index: {
          scriptId: script.id,
          index: segmentIndex,
        }
      },
      data: {
        audioPath: objectKey,
        presenterVideoPath: null,
        presenterStatus: "pending"
      }
    });

    return NextResponse.json({ 
      success: true, 
      audioPath: objectKey,
      publicUrl
    });
  } catch (err: unknown) {
    console.error("[Audio Upload API] Error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
