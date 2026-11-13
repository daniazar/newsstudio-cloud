import { NextResponse } from "next/server";
import { z } from "zod";
import { generateOrFallbackMusic } from "@/lib/music";
import { requireTenant } from "@/lib/tenant";

const MusicGenerateSchema = z.object({
  prompt: z.string().min(1, "Musical prompt is required"),
  mood: z.string().optional().default("serious"),
  duration: z.coerce.number().min(3).max(180).optional().default(15),
  lyrics: z.string().optional(),
  bpm: z.coerce.number().optional(),
  instrumental: z.boolean().optional().default(true),
});

/**
 * POST /api/music/generate
 * Synthesizes AI background music using ACE-Step via Modern-TTS-Server (port 8005),
 * automatically falling back to royalty-free stock music (Pixabay/Jamendo/ccMixter)
 * if the local AI engine is unreachable or busy.
 */
export async function POST(request: Request) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const body = await request.json();
    const parsed = MusicGenerateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid music generation parameters", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { prompt, mood, duration, lyrics, bpm, instrumental } = parsed.data;

    const result = await generateOrFallbackMusic(
      {
        prompt,
        mood,
        duration,
        lyrics,
        bpm,
        instrumental,
      },
      orgId
    );

    return NextResponse.json({
      success: true,
      bgMusicId: result.id,
      storageKey: result.storageKey,
      name: result.name,
      mood: result.mood,
      duration: result.duration,
      provider: result.provider,
      isAiGenerated: result.isAiGenerated,
      isFallback: result.isFallback,
      fallbackProvider: result.fallbackProvider,
      track: result.track,
    });
  } catch (error: unknown) {
    console.error("[API:MusicGenerate] Error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to generate background music", details: message },
      { status: 500 }
    );
  }
}
