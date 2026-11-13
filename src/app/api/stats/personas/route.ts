import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";

export async function GET() {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    // 1. Fetch personas, video aggregations, and segment aggregations in parallel
    const [personas, videoStats, segmentStats] = await Promise.all([
      prisma.persona.findMany({
        where: {
          OR: [{ companyId: orgId }, { isSystemPersona: true }],
        },
        select: {
          id: true,
          slug: true,
          name: true,
          role: true,
          gender: true,
          language: true,
          isActive: true,
        },
      }),
      prisma.video.groupBy({
        by: ["personaId"],
        where: { companyId: orgId },
        _count: { id: true },
        _sum: { totalViews: true, totalLikes: true, duration: true },
      }),
      prisma.segment.groupBy({
        by: ["personaId"],
        _count: { id: true },
      }),
    ]);

    // 2. Build O(1) lookup maps
    const personaMap = new Map<string, { videosCount: number; totalViews: number; totalLikes: number; totalDurationSec: number }>();
    videoStats.forEach((stat) => {
      if (!stat.personaId) return;
      personaMap.set(stat.personaId, {
        videosCount: stat._count.id || 0,
        totalViews: stat._sum.totalViews || 0,
        totalLikes: stat._sum.totalLikes || 0,
        totalDurationSec: stat._sum.duration || 0,
      });
    });

    const segmentCountMap = new Map<string, number>();
    segmentStats.forEach((seg) => {
      if (!seg.personaId) return;
      segmentCountMap.set(seg.personaId, seg._count.id || 0);
    });

    const results = personas.map((p) => {
      const stats = personaMap.get(p.slug) || personaMap.get(p.id) || {
        videosCount: 0,
        totalViews: 0,
        totalLikes: 0,
        totalDurationSec: 0,
      };
      const scenesCount = segmentCountMap.get(p.slug) ?? segmentCountMap.get(p.id) ?? 0;
      
      return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        role: p.role,
        gender: p.gender,
        language: p.language,
        isActive: p.isActive,
        videosCount: stats.videosCount,
        scenesCount,
        totalViews: stats.totalViews,
        totalLikes: stats.totalLikes,
        totalDurationSec: Math.round(stats.totalDurationSec),
      };
    });

    // Sort by total views descending, then videos count descending
    results.sort((a, b) => b.totalViews - a.totalViews || b.videosCount - a.videosCount);

    const response = NextResponse.json({
      totalPersonas: personas.length,
      personas: results,
    });
    response.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=120");
    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Error fetching persona performance stats: " + message },
      { status: 500 }
    );
  }
}
