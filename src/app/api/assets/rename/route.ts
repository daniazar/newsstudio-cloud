import path from "path";
import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";

function getMimeType(extension: string): string {
  const ext = extension.toLowerCase();
  switch (ext) {
    case "mp4": return "video/mp4";
    case "webm": return "video/webm";
    case "png": return "image/png";
    case "jpg":
    case "jpeg": return "image/jpeg";
    case "webp": return "image/webp";
    case "mp3": return "audio/mpeg";
    case "wav": return "audio/wav";
    default: return "application/octet-stream";
  }
}

export async function POST(request: Request) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const { oldKey, newName } = await request.json();
    if (!oldKey || !newName) {
      return NextResponse.json({ error: "Missing oldKey or newName" }, { status: 400 });
    }

    // Only allow operating on keys inside the tenant's namespace.
    if (!String(oldKey).startsWith(`tenants/${orgId}/`)) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // Strip any user-provided extension so we preserve the original file type without duplicate extensions
    const rawBaseName = path.basename(String(newName)).replace(/\.[^/.]+$/, "");
    const sanitizedBase = rawBaseName.replace(/[^a-zA-Z0-9_-]/g, "_").trim();
    if (!sanitizedBase) {
      return NextResponse.json({ error: "Invalid newName" }, { status: 400 });
    }

    const ext = String(oldKey).split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "";
    const basePath = String(oldKey).split("/").slice(0, -1).join("/");
    const newKey = `${basePath}/${sanitizedBase}${ext ? `.${ext}` : ""}`;

    if (!newKey.startsWith(`tenants/${orgId}/`)) {
      return NextResponse.json({ error: "Invalid target path" }, { status: 403 });
    }

    // Storage Rename = Download + Upload + Delete
    const buffer = await storage.download(oldKey);
    const newUrl = await storage.upload(newKey, buffer, getMimeType(ext));
    await storage.delete(oldKey);

    const oldUrl = storage.getUrl(oldKey);
    const s3Endpoint = process.env.S3_ENDPOINT || "http://localhost:9000";
    const bucket = process.env.S3_BUCKET_NAME || "news-studio";
    const s3LegacyUrl = `${s3Endpoint}/${bucket}/${oldKey}`;

    // Update DB scoped strictly to the tenant's companyId
    await prisma.segment.updateMany({
      where: {
        assetPath: { in: [oldUrl, s3LegacyUrl] },
        script: { story: { companyId: orgId } },
      },
      data: { assetPath: newUrl },
    });

    return NextResponse.json({ success: true, newKey, newUrl });
  } catch (error) {
    console.error("Rename asset error:", error);
    return NextResponse.json({ error: "Failed to rename asset" }, { status: 500 });
  }
}
