/**
 * src/app/api/ecommerce/remove-background/route.ts
 *
 * 1-Click Permanent Background Removal API for E-Commerce Product Assets.
 * Processes an asset through removeWhiteBackground, uploads the resulting 32-bit
 * transparent PNG to persistent storage, and associates the mattedKey in the database.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { storage, withTenant } from "@/lib/storage";
import { requireTenant } from "@/lib/tenant";
import { getOrProcessMattedImage } from "@/lib/ecommerce/imageMatte";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const body = await req.json();
    const {
      imageUrl,
      assetId,
      threshold = 232,
      featherRange = 35,
      defringe = true,
      maxSaturation = 22,
    } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: "Missing required 'imageUrl'" }, { status: 400 });
    }

    // 1. Download and remove white cyclorama background with defringing & edge despill
    const transparentPng = await getOrProcessMattedImage(imageUrl, {
      removeWhite: true,
      threshold,
      featherRange,
      defringe,
      maxSaturation,
    });

    // 2. Generate tenant-scoped storage key
    const hash = crypto.createHash("md5").update(imageUrl).digest("hex").slice(0, 10);
    const filename = `cutout_${hash}_${Date.now()}.png`;
    const storageKey = withTenant(orgId, `ecommerce/cutouts/${filename}`);

    // 3. Save to storage abstraction with resilient local fallback
    let publicUrl: string;
    try {
      publicUrl = await storage.upload(storageKey, transparentPng, "image/png");
    } catch (storageErr) {
      console.warn("[remove-background] Primary storage upload failed, falling back to LocalStorageClient:", storageErr);
      const { LocalStorageClient } = await import("@/lib/storage/local");
      const localClient = new LocalStorageClient();
      publicUrl = await localClient.upload(storageKey, transparentPng, "image/png");
    }

    // 4. Update ProductAsset in database if assetId provided and verified
    if (assetId) {
      try {
        const asset = await prisma.productAsset.findFirst({
          where: {
            id: assetId,
            campaign: { companyId: orgId },
          },
        });

        if (asset) {
          await prisma.productAsset.update({
            where: { id: assetId },
            data: { mattedKey: storageKey },
          });
        }
      } catch (dbErr) {
        console.warn("[remove-background] Could not update ProductAsset mattedKey:", dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      mattedUrl: publicUrl,
      storageKey,
      fileSizeKb: Math.round(transparentPng.length / 1024),
    });
  } catch (error: unknown) {
    const errObj = error as { errors?: Array<{ message?: string }>; cause?: { message?: string }; message?: string; stack?: string } | null;
    const errorDetails =
      errObj?.errors?.map((e) => e.message || String(e)).join(", ") ||
      errObj?.cause?.message ||
      errObj?.message ||
      String(error);
    console.error("[remove-background] Failed to process background removal:", errorDetails, errObj?.stack);
    return NextResponse.json({ error: errorDetails }, { status: 500 });
  }
}
