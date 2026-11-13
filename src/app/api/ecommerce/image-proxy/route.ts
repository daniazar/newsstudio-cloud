/**
 * src/app/api/ecommerce/image-proxy/route.ts
 *
 * CORS-Free Image Proxy & On-the-Fly Matte Streaming Route.
 * Solves browser/WebGL CORS issues for remote merchant CDNs and optionally
 * strips white packshot backgrounds into transparent 32-bit PNGs.
 */

import { NextRequest, NextResponse } from "next/server";
import { getOrProcessMattedImage } from "@/lib/ecommerce/imageMatte";
import { requireTenant } from "@/lib/tenant";
import { assertSafePublicUrl } from "@/lib/security/ssrf";

export async function GET(req: NextRequest) {
  try {
    const t = await requireTenant();
    if (!t.ok) return t.response;

    const { searchParams } = new URL(req.url);
    const imageUrl = searchParams.get("url");
    const removeWhite = searchParams.get("removeWhite") === "true" || searchParams.get("removeWhite") === "1";
    const thresholdStr = searchParams.get("threshold");
    const threshold = thresholdStr ? parseInt(thresholdStr, 10) : undefined;

    if (!imageUrl) {
      return NextResponse.json({ error: "Missing required 'url' parameter" }, { status: 400 });
    }

    // Validate and assert URL safety against SSRF
    await assertSafePublicUrl(imageUrl, {
      allowDevelopmentLoopback: process.env.NODE_ENV !== "production",
    });

    const processedBuffer = await getOrProcessMattedImage(imageUrl, {
      removeWhite,
      threshold,
    });

    const uint8 = new Uint8Array(processedBuffer);

    return new Response(uint8, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, immutable",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (error: unknown) {
    console.error("[image-proxy] Error proxying/matting image:", error);
    const msg = error instanceof Error ? error.message : "Failed to process image";
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
