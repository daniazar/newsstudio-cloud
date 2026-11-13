import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { storage, withTenant } from "@/lib/storage";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const { id: videoId } = await params;
    const body = await req.json();
    const { imageBase64 } = body;

    if (!imageBase64 || !imageBase64.startsWith("data:image/")) {
      return NextResponse.json({ error: "Invalid base64 payload" }, { status: 400 });
    }

    const video = await prisma.video.findFirst({ where: { id: videoId, companyId: orgId } });
    if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    const objectKey = withTenant(orgId, `thumbnails/${videoId}-manual.jpg`);
    const url = await storage.upload(objectKey, buffer, "image/jpeg");

    await prisma.video.update({
      where: { id: videoId },
      data: {
        thumbnailStorageKey: objectKey,
        thumbnailPath: url,
      },
    });

    return NextResponse.json({ success: true, url });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to save thumbnail";
    console.error("Failed to save thumbnail:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
