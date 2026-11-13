import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { storage, withTenant } from "@/lib/storage";
import { requireTenant } from "@/lib/tenant";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId, isDefaultOrg } = t.tenant;

  try {
    const { id } = await params;
    const persona = await prisma.persona.findFirst({
      where: { id, OR: [{ companyId: orgId }, { isSystemPersona: true }] },
    });

    if (!persona) {
      return NextResponse.json({ error: "Persona not found" }, { status: 404 });
    }

    // Only the owning tenant (or the default org for system personas) may mutate.
    if (persona.companyId !== orgId && !isDefaultOrg) {
      return NextResponse.json({ error: "Cannot modify a persona you do not own" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const label = (formData.get("label") as string) || "Custom Voice";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate unique storage key
    const extension = file.name ? file.name.split(".").pop() : "wav";
    const filename = `voice_${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;
    const targetCompanyId = persona.companyId || orgId;
    const storageKey = withTenant(targetCompanyId, `personas/${persona.slug}/voices/${filename}`);

    // Upload to Storage
    const publicUrl = await storage.upload(storageKey, buffer, file.type || "audio/wav");

    // Save in DB
    const personaVoice = await prisma.personaVoice.create({
      data: {
        companyId: persona.companyId,
        personaId: id,
        label,
        audioPath: publicUrl,
        storageKey,
        language: persona.language,
        isDefault: false,
      },
    });

    return NextResponse.json({ success: true, voice: personaVoice });
  } catch (error: unknown) {
    console.error("[Persona Voice Upload Error]", error);
    return NextResponse.json({ error: "Failed to upload voice: " + String(error) }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId, isDefaultOrg } = t.tenant;

  try {
    const { id } = await params;
    const url = new URL(req.url);
    const voiceId = url.searchParams.get("voiceId");

    if (!voiceId) {
      return NextResponse.json({ error: "Voice ID is required" }, { status: 400 });
    }

    const voice = await prisma.personaVoice.findUnique({
      where: { id: voiceId },
    });

    if (!voice || voice.personaId !== id) {
      return NextResponse.json({ error: "Voice not found or belongs to a different persona" }, { status: 404 });
    }

    if (voice.companyId !== orgId && !isDefaultOrg) {
      return NextResponse.json({ error: "Cannot modify a persona you do not own" }, { status: 403 });
    }

    // Delete from storage
    if (voice.storageKey) {
      await storage.delete(voice.storageKey);
    }

    // Delete from DB
    await prisma.personaVoice.delete({
      where: { id: voiceId },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("[Persona Voice Delete Error]", error);
    return NextResponse.json({ error: "Failed to delete voice: " + String(error) }, { status: 500 });
  }
}
