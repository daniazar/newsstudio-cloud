import { NextResponse } from "next/server";
import { downloadToStorage } from "@/lib/stock";
import { requireTenant } from "@/lib/tenant";

import { z } from "zod";

const StockResultSchema = z.object({
  externalId: z.string(),
  provider: z.string(),
  type: z.enum(["video", "photo"]),
  url: z.string().url(),
  previewUrl: z.string().url(),
  downloadUrl: z.string().url(),
  width: z.number(),
  height: z.number(),
  duration: z.number().optional(),
  license: z.string(),
  alt: z.string().optional(),
});

const StockDownloadPayloadSchema = z.object({
  stockResult: StockResultSchema,
  segmentKey: z.string().optional(),
});

/**
 * POST /api/stock/download
 * Download a selected stock asset to MinIO/local storage.
 * Used by the Editor UI when an editor manually assigns a clip.
 */
export async function POST(request: Request) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const rawBody = await request.json();
    const parsedData = StockDownloadPayloadSchema.safeParse(rawBody);

    if (!parsedData.success) {
      return NextResponse.json(
        { error: "Invalid stock result payload provided", details: parsedData.error.format() },
        { status: 400 }
      );
    }

    const { stockResult, segmentKey } = parsedData.data;

    const storageKey = await downloadToStorage(stockResult, orgId, segmentKey);

    return NextResponse.json({ success: true, storageKey });
  } catch (error) {
    console.error("[API:StockDownload] Error:", error);
    return NextResponse.json(
      { error: "Failed to download stock asset", details: (error as Error).message },
      { status: 500 }
    );
  }
}
