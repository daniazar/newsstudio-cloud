import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { clonePersonaFromImage } from "@/lib/personas/personaCloner";

export async function POST(req: Request) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const body = await req.json();
    const {
      imageBase64,
      imagePath,
      mimeType,
      slug,
      name,
      role,
      language,
      gender,
      voicePath,
      videoPath,
      voiceBase64,
      guidance,
      rejuvenate,
      ageShift,
      glamourLevel,
      genderSwap,
      bodyMod,
      outfitPreset,
      lightingUpgrade,
    } = body;

    if (!imageBase64 && !imagePath) {
      return NextResponse.json(
        { error: "Either imageBase64 or imagePath is required to clone a persona." },
        { status: 400 }
      );
    }

    const isRemote =
      process.env.NODE_ENV === "production" ||
      process.env.FORCE_REMOTE_WORKER === "true";

    if (isRemote && videoPath && !voiceBase64) {
      return NextResponse.json(
        {
          error:
            "Extracting audio from a local video file requires local worker mode or providing voiceBase64 directly.",
        },
        { status: 400 }
      );
    }

    const result = await clonePersonaFromImage({
      imageBase64,
      imagePath,
      mimeType,
      slug,
      name,
      role,
      language,
      gender,
      voicePath,
      videoPath,
      voiceBase64,
      guidance,
      rejuvenate,
      ageShift,
      glamourLevel,
      genderSwap,
      bodyMod,
      outfitPreset,
      lightingUpgrade,
      companyId: orgId,
      syncToDatabase: true,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("[POST /api/personas/clone] Error:", error);
    return NextResponse.json(
      { error: "Failed to clone persona: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
