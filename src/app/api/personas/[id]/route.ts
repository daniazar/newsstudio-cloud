import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { storage } from "@/lib/storage";

// GET a single persona
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const { id } = await params;

    const persona = await prisma.persona.findFirst({
      where: {
        AND: [
          { OR: [{ id }, { slug: id }] },
          { OR: [{ companyId: orgId }, { isSystemPersona: true }] },
        ],
      },
      include: {
        avatars: true,
        voices: true,
        imagePairs: true,
      },
    });

    if (!persona) {
      return NextResponse.json({ error: "Persona no encontrada" }, { status: 404 });
    }

    const [videosCount, videoMetrics, segments] = await Promise.all([
      prisma.video.count({ where: { personaId: persona.slug } }),
      prisma.video.aggregate({
        where: { personaId: persona.slug },
        _sum: { totalViews: true, totalLikes: true },
      }),
      prisma.segment.findMany({ 
        where: { personaId: persona.slug },
        select: { startTime: true, endTime: true, createdAt: true }
      })
    ]);

    const scenesCount = segments.length;
    const totalScreenTime = segments.reduce((acc, seg) => acc + (seg.endTime - seg.startTime), 0);
    const totalViews = videoMetrics._sum.totalViews || 0;
    const totalLikes = videoMetrics._sum.totalLikes || 0;

    const weeklyUsage: { label: string; value: number; count: number }[] = [];
    const now = new Date();
    // Start of current week (Monday)
    const currentWeekStart = new Date(now);
    currentWeekStart.setHours(0, 0, 0, 0);
    currentWeekStart.setDate(currentWeekStart.getDate() - (currentWeekStart.getDay() || 7) + 1);

    for (let i = 4; i >= 0; i--) {
      const startOfWeek = new Date(currentWeekStart.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const count = segments.filter(s => s.createdAt >= startOfWeek && s.createdAt < endOfWeek).length;
      
      const d = new Date(Date.UTC(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate()));
      d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
      const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);

      weeklyUsage.push({
        label: `Week ${weekNo}`,
        count,
        value: 0
      });
    }

    const maxCount = Math.max(...weeklyUsage.map(w => w.count), 1);
    weeklyUsage.forEach(w => {
      w.value = Math.round((w.count / maxCount) * 100);
    });

    const imagePairsWithUrls = (persona.imagePairs || []).map(pair => ({
      ...pair,
      url1: storage.getUrl(pair.image1Key),
      url2: pair.image2Key ? storage.getUrl(pair.image2Key) : null,
    }));

    return NextResponse.json({
      ...persona,
      imagePairs: imagePairsWithUrls,
      stats: {
        videosCount,
        scenesCount,
        totalScreenTime,
        totalViews,
        totalLikes,
        weeklyUsage
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Error al obtener persona: " + String(error) },
      { status: 500 }
    );
  }
}

// PUT (update) a persona
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;
  const isDefaultOrg = t.tenant.isDefaultOrg;

  try {
    const { id } = await params;
    const body = await req.json();

    // Find first (read-scope: own personas or globally-visible system personas)
    const existing = await prisma.persona.findFirst({
      where: {
        AND: [
          { OR: [{ id }, { slug: id }] },
          { OR: [{ companyId: orgId }, { isSystemPersona: true }] },
        ],
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Persona no encontrada" }, { status: 404 });
    }

    // Mutation ownership: only the owning tenant (or the default org) may edit.
    const owns = existing.companyId === orgId || isDefaultOrg;
    if (!owns) {
      return NextResponse.json(
        { error: "No se pueden modificar personas predeterminadas del sistema." },
        { status: 403 }
      );
    }

    // Prepare fields to update
    const { name, role, gender, language, description, bio, systemPrompt, visualPrompt, visualPromptNeutral, voiceParams, avatarType, isActive, defaultAvatarId } = body;

    const updated = await prisma.persona.update({
      where: { id: existing.id },
      data: {
        name: name !== undefined ? name : existing.name,
        role: role !== undefined ? role : existing.role,
        gender: gender !== undefined ? gender : existing.gender,
        language: language !== undefined ? language : existing.language,
        description: description !== undefined ? description : existing.description,
        bio: bio !== undefined ? bio : existing.bio,
        systemPrompt: systemPrompt !== undefined ? systemPrompt : existing.systemPrompt,
        visualPrompt: visualPrompt !== undefined ? visualPrompt : existing.visualPrompt,
        visualPromptNeutral: visualPromptNeutral !== undefined ? visualPromptNeutral : existing.visualPromptNeutral,
        voiceParams: voiceParams !== undefined ? JSON.stringify(voiceParams) : existing.voiceParams,
        avatarType: avatarType !== undefined ? avatarType : existing.avatarType,
        isActive: isActive !== undefined ? isActive : existing.isActive,
        defaultAvatarId: defaultAvatarId !== undefined ? defaultAvatarId : existing.defaultAvatarId,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: "Error al actualizar persona: " + String(error) },
      { status: 500 }
    );
  }
}

// DELETE a custom persona (only if not used in active segments)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;
  const isDefaultOrg = t.tenant.isDefaultOrg;

  try {
    const { id } = await params;

    const existing = await prisma.persona.findFirst({
      where: {
        AND: [
          { OR: [{ id }, { slug: id }] },
          { OR: [{ companyId: orgId }, { isSystemPersona: true }] },
        ],
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Persona no encontrada" }, { status: 404 });
    }

    // Mutation ownership: only the owning tenant (or the default org) may delete.
    const owns = existing.companyId === orgId || isDefaultOrg;
    if (!owns) {
      return NextResponse.json(
        { error: "No se pueden eliminar personas predeterminadas del sistema." },
        { status: 403 }
      );
    }

    // Safety check: is this persona utilized in any Story segment?
    const segmentUsage = await prisma.segment.findFirst({
      where: {
        personaId: existing.slug,
      },
    });

    if (segmentUsage) {
      return NextResponse.json(
        { error: "No se puede eliminar esta persona porque está asignada a escenas activas en el Centro de Control." },
        { status: 409 }
      );
    }

    await prisma.persona.delete({
      where: { id: existing.id },
    });

    return NextResponse.json({ success: true, message: "Persona eliminada con éxito." });
  } catch (error) {
    return NextResponse.json(
      { error: "Error al eliminar persona: " + String(error) },
      { status: 500 }
    );
  }
}
