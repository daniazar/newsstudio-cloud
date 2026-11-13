import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";

/**
 * GET /api/pipeline/stats
 * Return overall pipeline queue counts and active workers for the tenant.
 */
export async function GET() {
  let orgId = "default";
  try {
    const t = await requireTenant();
    if (t.ok) {
      orgId = t.tenant.orgId;
    } else if (process.env.NODE_ENV === "production") {
      return t.response;
    } else {
      const firstCompany = await prisma.company.findFirst();
      if (firstCompany) orgId = firstCompany.id;
    }
  } catch {
    if (process.env.NODE_ENV === "production") {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
    const firstCompany = await prisma.company.findFirst();
    if (firstCompany) orgId = firstCompany.id;
  }

  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // 1. Fetch queue aggregations, active workers, and company settings in parallel
    const [grouped, workers, company] = await Promise.all([
      prisma.generationJob.groupBy({
        by: ["status", "type"],
        where: { companyId: orgId },
        _count: { _all: true },
      }),
      prisma.worker.findMany({
        where: { lastSeenAt: { gte: oneDayAgo } },
        orderBy: { lastSeenAt: "desc" },
        take: 50,
      }),
      prisma.company.findUnique({
        where: { id: orgId },
        select: {
          isPipelinePaused: true,
          minJobsAudio: true,
          minJobsVideo: true,
          minJobsRender: true,
          minJobsImage: true,
        },
      }),
    ]);

    let queued = 0;
    let queuedAudio = 0;
    let queuedVideo = 0;
    let queuedRender = 0;
    let queuedImage = 0;
    let queuedTurntable = 0;
    let inProgress = 0;
    let done = 0;
    let failed = 0;

    for (const g of grouped) {
      const count = g._count._all;
      if (g.status === "QUEUED") {
        queued += count;
        if (g.type === "audio") queuedAudio += count;
        if (["video", "video_full", "video_bubble", "musetalk", "ditto", "veo", "minimax", "taomate", "ltx", "wardrobe_inpaint"].includes(g.type)) queuedVideo += count;
        if (g.type === "render") queuedRender += count;
        if (g.type === "image") queuedImage += count;
        if (g.type === "turntable_3d") queuedTurntable += count;
      }
      if (g.status.includes("IN_PROGRESS")) {
        inProgress += count;
      }
      if (g.status === "DONE") {
        done += count;
      }
      if (g.status === "FAILED") {
        failed += count;
      }
    }

    return Response.json(
      {
        stats: {
          queued,
          queuedAudio,
          queuedVideo,
          queuedRender,
          queuedImage,
          queuedTurntable,
          inProgress,
          done,
          failed,
        },
        workers,
        isPipelinePaused: company?.isPipelinePaused ?? false,
        minJobsAudio: company?.minJobsAudio ?? 1,
        minJobsVideo: company?.minJobsVideo ?? 1,
        minJobsRender: company?.minJobsRender ?? 1,
        minJobsImage: company?.minJobsImage ?? 1,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=5, stale-while-revalidate=15",
        },
      }
    );
  } catch (error) {
    console.error("[Pipeline Stats API] Error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
