import { NextResponse } from "next/server";
import { searchStock } from "@/lib/stock";
import type { StockSearchOptions } from "@/lib/stock";

import { z } from "zod";

const StockSearchSchema = z.object({
  query: z.string().min(1, "Search query is required"),
  type: z.enum(["video", "photo"]).default("video"),
  per_page: z.coerce.number().int().min(1).max(50).default(10),
  orientation: z.enum(["portrait", "landscape", "square"]).default("portrait"),
});

/**
 * GET /api/stock/search
 * Search for stock video or photo across all configured providers.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawParams = Object.fromEntries(searchParams.entries());

  const parsedData = StockSearchSchema.safeParse(rawParams);

  if (!parsedData.success) {
    return NextResponse.json(
      { error: "Invalid stock search parameters", details: parsedData.error.format() },
      { status: 400 }
    );
  }

  const { query, type, per_page, orientation } = parsedData.data;

  const options: StockSearchOptions = {
    type,
    perPage: per_page,
    orientation,
  };

  try {
    const results = await searchStock(query, options);
    return NextResponse.json({ results });
  } catch (error) {
    console.error("[API:StockSearch] Error:", error);
    return NextResponse.json(
      { error: "Failed to search stock providers", details: (error as Error).message },
      { status: 500 }
    );
  }
}
