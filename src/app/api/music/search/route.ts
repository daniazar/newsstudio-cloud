import { NextResponse } from "next/server";
import { searchMusic } from "@/lib/music";
import type { MusicSearchOptions, MusicMood } from "@/lib/music";

import { z } from "zod";

const SearchParamsSchema = z.object({
  query: z.string().min(1, "Search query is required"),
  mood: z.string().optional(),
  per_page: z.coerce.number().int().min(1).max(50).default(10),
});

/**
 * GET /api/music/search
 * Search for background music track across all configured providers.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawParams = Object.fromEntries(searchParams.entries());

  const parsedData = SearchParamsSchema.safeParse(rawParams);

  if (!parsedData.success) {
    return NextResponse.json(
      { error: "Invalid search parameters", details: parsedData.error.format() },
      { status: 400 }
    );
  }

  const { query, mood, per_page } = parsedData.data;

  const options: MusicSearchOptions = {
    mood: mood as MusicMood | undefined,
    perPage: per_page,
  };

  try {
    const results = await searchMusic(query, options);
    return NextResponse.json({ results });
  } catch (error) {
    console.error("[API:MusicSearch] Error:", error);
    return NextResponse.json(
      { error: "Failed to search music providers", details: (error as Error).message },
      { status: 500 }
    );
  }
}
