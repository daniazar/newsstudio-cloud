import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId, isDefaultOrg } = t.tenant;

  try {
    const { id } = await params;
    const body = await req.json();
    const { label, audioPath, storageKey, isDefault, language, duration } = body;

    if (!audioPath || !storageKey) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios: audioPath, storageKey" },
        { status: 400 }
      );
    }

    const persona = await prisma.persona.findFirst({
      where: { OR: [{ id }, { slug: id }], AND: { OR: [{ companyId: orgId }, { isSystemPersona: true }] } },
    });

    if (!persona) {
      return NextResponse.json({ error: "Persona no encontrada" }, { status: 404 });
    }

    if (persona.companyId !== orgId && !isDefaultOrg) {
      return NextResponse.json({ error: "Cannot modify a persona you do not own" }, { status: 403 });
    }

    if (isDefault) {
      await prisma.personaVoice.updateMany({
        where: { personaId: persona.id },
        data: { isDefault: false },
      });
    }

    const voice = await prisma.personaVoice.create({
      data: {
        companyId: persona.companyId,
        personaId: persona.id,
        label: label || "Voz Personalizada",
        audioPath,
        storageKey,
        isDefault: !!isDefault,
        language: language || "en",
        duration: duration || 0.0,
      },
    });

    return NextResponse.json(voice);
  } catch (error) {
    return NextResponse.json(
      { error: "Error al agregar voz: " + String(error) },
      { status: 500 }
    );
  }
}
