import { NextRequest, NextResponse } from "next/server";
import { storage, withTenant } from "@/lib/storage";
import { prisma } from "@/lib/prisma";
import { withTenantAuth } from "@/lib/apiHandler";
import { RateLimitTiers } from "@/lib/security/rateLimit";
import { validateMediaBuffer } from "@/lib/security/magicBytes";
import path from "path";

const MAX_UPLOAD_SIZE_BYTES = 100 * 1024 * 1024; // 100MB max upload cap

export const POST = withTenantAuth(
  async (request: NextRequest, { tenant }) => {
    const { orgId } = tenant;

    // 1. Early Content-Length check to prevent buffering oversized payloads into memory
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_UPLOAD_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Payload exceeds 100MB maximum upload limit" },
        { status: 413 }
      );
    }

    try {
      const formData = await request.formData();
      const file = formData.get("file") as File;
      const segmentId = formData.get("segmentId") as string | null;

      if (!file) {
        return NextResponse.json({ error: "Missing file" }, { status: 400 });
      }

      // 2. Check File object size before buffering
      if (file.size > MAX_UPLOAD_SIZE_BYTES) {
        return NextResponse.json(
          { error: "File size exceeds 100MB maximum upload limit" },
          { status: 413 }
        );
      }

      if (segmentId) {
        // Ownership: the segment's story must belong to the active tenant.
        const segment = await prisma.segment.findFirst({
          where: { id: segmentId, script: { story: { companyId: orgId } } },
          select: { id: true },
        });
        if (!segment) {
          return NextResponse.json({ error: "Segment not found" }, { status: 404 });
        }
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // 3. Inspect binary magic bytes to reject executables, scripts, and spoofed extensions
      const validation = validateMediaBuffer(buffer, file.type);
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error || "Invalid file content" },
          { status: 400 }
        );
      }

      const ext = path.extname(file.name) || (file.type.startsWith("video/") ? ".mp4" : ".png");
      const sanitizedName = file.name ? path.basename(file.name, ext).replace(/[^a-zA-Z0-9_-]/g, "_") : "upload";
      const objectKey = withTenant(
        orgId,
        segmentId
          ? `assets/manual/${segmentId}-${Date.now()}${ext}`
          : `assets/manual/${sanitizedName}-${Date.now()}${ext}`
      );

      // Upload to active storage provider (Azure Blob Storage / MinIO)
      const publicUrl = await storage.upload(objectKey, buffer, file.type);

      return NextResponse.json({
        url: publicUrl,
        key: objectKey,
        type: file.type.startsWith("video/") ? "video" : "image",
      });
    } catch (error) {
      console.error("Upload error:", error);
      return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
    }
  },
  { rateLimit: RateLimitTiers.UPLOADS }
);
