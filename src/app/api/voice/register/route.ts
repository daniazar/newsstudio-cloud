import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { checkTenantQuota } from "@/lib/quota/quotaEngine";
import { registerVoiceInModernTts } from "@/lib/tts/modernTtsClient";

export async function POST(request: Request) {
  try {
    const t = await requireTenant();
    if (!t.ok) return t.response;
    const companyId = t.tenant.orgId;
    const body = await request.json();

    const {
      voiceId,
      name,
      personaId,
      referenceAudioPath,
      language = "es",
      engine = "piper",
      isDefault = false,
      description,
    } = body;

    if (!voiceId || !name || !personaId) {
      return NextResponse.json(
        { error: "Missing required fields: voiceId, name, and personaId are mandatory." },
        { status: 400 }
      );
    }

    // Verify tenant persona quota
    const quotaCheck = await checkTenantQuota(companyId, "persona_generation", 1);
    if (!quotaCheck.allowed) {
      return NextResponse.json(
        { error: "Tenant persona generation quota exceeded. Upgrade tier to register more voices." },
        { status: 403 }
      );
    }

    // Register dynamically in Modern-TTS engine
    const registration = await registerVoiceInModernTts({
      voiceId,
      name,
      engine,
      referenceAudioPath,
      language,
      personaId,
      companyId,
      description,
    });

    // Save or update PersonaVoice in database
    const personaVoice = await prisma.personaVoice.create({
      data: {
        companyId,
        personaId,
        label: name,
        audioPath: referenceAudioPath || "",
        storageKey: referenceAudioPath || "",
        language,
        isDefault,
      },
    });

    return NextResponse.json({
      success: true,
      voice: personaVoice,
      registration,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to register voice";
    if (message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
