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
    const { label, url, storageKey, frameType, isDefault } = body;

    if (!url || !storageKey) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios: url, storageKey" },
        { status: 400 }
      );
    }

    // Find persona
    const persona = await prisma.persona.findFirst({
      where: { OR: [{ id }, { slug: id }], AND: { OR: [{ companyId: orgId }, { isSystemPersona: true }] } },
    });

    if (!persona) {
      return NextResponse.json({ error: "Persona no encontrada" }, { status: 404 });
    }

    if (persona.companyId !== orgId && !isDefaultOrg) {
      return NextResponse.json({ error: "Cannot modify a persona you do not own" }, { status: 403 });
    }

    // If setting as default, clear others
    if (isDefault) {
      await prisma.personaAvatar.updateMany({
        where: { personaId: persona.id },
        data: { isDefault: false },
      });
    }

    const avatar = await prisma.personaAvatar.create({
      data: {
        companyId: persona.companyId,
        personaId: persona.id,
        label: label || "Avatar Personalizado",
        url,
        storageKey,
        frameType: frameType || "portrait",
        isDefault: !!isDefault,
      },
    });

    // If this is the only avatar, or if it is marked default, update the defaultAvatarId
    if (isDefault) {
      await prisma.persona.update({
        where: { id: persona.id },
        data: { defaultAvatarId: avatar.id },
      });
    }

    return NextResponse.json(avatar);
  } catch (error) {
    return NextResponse.json(
      { error: "Error al agregar avatar: " + String(error) },
      { status: 500 }
    );
  }
}
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId, isDefaultOrg } = t.tenant;

  try {
    const { id } = await params;
    const body = await req.json();
    const { avatarId } = body;

    if (!avatarId) {
      return NextResponse.json({ error: "Falta el campo avatarId" }, { status: 400 });
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

    // Clear all defaults
    await prisma.personaAvatar.updateMany({
      where: { personaId: persona.id },
      data: { isDefault: false },
    });

    // Set new default
    const avatar = await prisma.personaAvatar.update({
      where: { id: avatarId },
      data: { isDefault: true },
    });

    // Update parent
    await prisma.persona.update({
      where: { id: persona.id },
      data: { defaultAvatarId: avatar.id },
    });

    return NextResponse.json(avatar);
  } catch (error) {
    return NextResponse.json(
      { error: "Error al establecer avatar por defecto: " + String(error) },
      { status: 500 }
    );
  }
}
