import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";

export async function POST(request: Request) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const { key } = await request.json();
    if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });

    // Only allow operating on keys inside the tenant's namespace.
    if (!String(key).startsWith(`tenants/${orgId}/`)) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    await storage.delete(key);

    const url = storage.getUrl(key);
    const endpoint = process.env.S3_ENDPOINT || "http://localhost:9000";
    const bucket = process.env.S3_BUCKET_NAME || "news-studio";
    const legacyS3Url = `${endpoint}/${bucket}/${key}`;

    await prisma.segment.updateMany({
      where: {
        assetPath: { in: [url, legacyS3Url, key] },
        script: { story: { companyId: orgId } },
      },
      data: { assetPath: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete asset error:", error);
    return NextResponse.json({ error: "Failed to delete asset" }, { status: 500 });
  }
}
