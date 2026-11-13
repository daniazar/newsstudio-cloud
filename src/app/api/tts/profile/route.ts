import { NextRequest, NextResponse } from "next/server";
import { getModernTtsProfile, setModernTtsProfile, ModernTtsProfile } from "@/lib/tts/modernTtsClient";

/**
 * GET /api/tts/profile
 * Returns the active Docker memory mode ('lightweight' | 'studio' | 'full'), VRAM, and active models.
 */
export async function GET() {
  try {
    const status = await getModernTtsProfile();
    return NextResponse.json(status);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to fetch TTS profile";
    return NextResponse.json({ error: errorMsg }, { status: 502 });
  }
}

/**
 * POST /api/tts/profile
 * Switches Modern-TTS-Server memory mode at runtime with zero Docker container rebuilds.
 * Body: { "profile": "lightweight" | "studio" | "full" }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const profile = (body.profile || "").toLowerCase().trim() as ModernTtsProfile;
    if (!["lightweight", "studio", "full"].includes(profile)) {
      return NextResponse.json(
        { error: "Invalid profile. Must be 'lightweight', 'studio', or 'full'." },
        { status: 400 }
      );
    }

    const updated = await setModernTtsProfile(profile);
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to update TTS profile";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
