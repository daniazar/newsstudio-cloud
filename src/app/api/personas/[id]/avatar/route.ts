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

    if (persona.companyId !== orgId && !isDefaultOrg) {
      return NextResponse.json({ error: "Cannot modify a persona you do not own" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const label = (formData.get("label") as string) || "Avatar";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate unique storage key
    const extension = file.name ? file.name.split(".").pop() : "png";
    const filename = `photo_${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;
    const targetCompanyId = persona.companyId || orgId;
    const storageKey = withTenant(targetCompanyId, `personas/${persona.slug}/photos/${filename}`);

    // Upload to Storage
    const publicUrl = await storage.upload(storageKey, buffer, file.type || "image/png");

    // Save in DB
    const personaAvatar = await prisma.personaAvatar.create({
      data: {
        companyId: persona.companyId,
        personaId: id,
        label,
        url: publicUrl,
        storageKey,
        isDefault: false,
      },
    });

    return NextResponse.json({ success: true, avatar: personaAvatar });
  } catch (error: unknown) {
    console.error("[Persona Avatar Upload Error]", error);
    return NextResponse.json({ error: "Failed to upload avatar: " + String(error) }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId, isDefaultOrg } = t.tenant;

  try {
    const { id } = await params;
    const url = new URL(req.url);
    const avatarId = url.searchParams.get("avatarId");

    if (!avatarId) {
      return NextResponse.json({ error: "Avatar ID is required" }, { status: 400 });
    }

    const avatar = await prisma.personaAvatar.findUnique({
      where: { id: avatarId },
    });

    if (!avatar || avatar.personaId !== id) {
      return NextResponse.json({ error: "Avatar not found or belongs to a different persona" }, { status: 404 });
    }

    if (avatar.companyId !== orgId && !isDefaultOrg) {
      return NextResponse.json({ error: "Cannot modify a persona you do not own" }, { status: 403 });
    }

    // Delete from storage
    if (avatar.storageKey) {
      await storage.delete(avatar.storageKey);
    }

    // Delete from DB
    await prisma.personaAvatar.delete({
      where: { id: avatarId },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("[Persona Avatar Delete Error]", error);
    return NextResponse.json({ error: "Failed to delete avatar: " + String(error) }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId, isDefaultOrg } = t.tenant;

  try {
    const { id } = await params;
    const body = await req.json();
    const { avatarId, label } = body;

    if (!avatarId || !label) {
      return NextResponse.json({ error: "Avatar ID and label are required" }, { status: 400 });
    }

    const avatar = await prisma.personaAvatar.findUnique({
      where: { id: avatarId },
    });

    if (!avatar || avatar.personaId !== id) {
      return NextResponse.json({ error: "Avatar not found or belongs to a different persona" }, { status: 404 });
    }

    if (avatar.companyId !== orgId && !isDefaultOrg) {
      return NextResponse.json({ error: "Cannot modify a persona you do not own" }, { status: 403 });
    }

    const updatedAvatar = await prisma.personaAvatar.update({
      where: { id: avatarId },
      data: { label },
    });

    return NextResponse.json({ success: true, avatar: updatedAvatar });
  } catch (error: unknown) {
    console.error("[Persona Avatar Update Error]", error);
    return NextResponse.json({ error: "Failed to update avatar: " + String(error) }, { status: 500 });
  }
}

