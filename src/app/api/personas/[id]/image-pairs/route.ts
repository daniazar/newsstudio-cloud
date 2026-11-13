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
    const image1 = formData.get("image1") as File;
    const image2 = formData.get("image2") as File | null;
    const label = (formData.get("label") as string) || "Scene Pair";

    if (!image1) {
      return NextResponse.json({ error: "Primary image (image1) is required" }, { status: 400 });
    }

    // Helper to upload a single image
    const uploadImage = async (file: File) => {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const extension = file.name ? file.name.split(".").pop() : "png";
      const filename = `photo_${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;
      // Using the same photos folder per user's request
      const targetCompanyId = persona.companyId || orgId;
      const storageKey = withTenant(targetCompanyId, `personas/${persona.slug}/photos/${filename}`);
      
      // Upload to Storage
      await storage.upload(storageKey, buffer, file.type || "image/png");
      return storageKey;
    };

    const image1Key = await uploadImage(image1);
    let image2Key: string | null = null;
    
    if (image2) {
      image2Key = await uploadImage(image2);
    }

    // Save in DB
    const pair = await prisma.personaImagePair.create({
      data: {
        personaId: id,
        label,
        image1Key,
        image2Key,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, pair });
  } catch (error: unknown) {
    console.error("[Persona Image Pair Upload Error]", error);
    return NextResponse.json({ error: "Failed to upload image pair: " + String(error) }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId, isDefaultOrg } = t.tenant;

  try {
    const { id } = await params;
    const url = new URL(req.url);
    const pairId = url.searchParams.get("pairId");

    if (!pairId) {
      return NextResponse.json({ error: "Pair ID is required" }, { status: 400 });
    }

    const pair = await prisma.personaImagePair.findUnique({
      where: { id: pairId },
      include: { persona: true }
    });

    if (!pair || pair.personaId !== id) {
      return NextResponse.json({ error: "Image pair not found or belongs to a different persona" }, { status: 404 });
    }

    if (pair.persona.companyId !== orgId && !isDefaultOrg) {
      return NextResponse.json({ error: "Cannot modify a persona you do not own" }, { status: 403 });
    }

    // Delete from storage
    if (pair.image1Key) await storage.delete(pair.image1Key);
    if (pair.image2Key) await storage.delete(pair.image2Key);

    // Delete from DB
    await prisma.personaImagePair.delete({
      where: { id: pairId },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("[Persona Image Pair Delete Error]", error);
    return NextResponse.json({ error: "Failed to delete image pair: " + String(error) }, { status: 500 });
  }
}
