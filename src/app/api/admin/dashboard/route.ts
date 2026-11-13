import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";

export async function GET() {
  // 1. Resolve tenant — admin dashboard is a per-tenant operational view
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    // 2. Fetch all live operational metrics concurrently in a single round-trip (scoped to tenant)
    const [
      storiesCount,
      feedsCount,
      channelsCount,
      publishesCount,
      jobsCount,
      schedulesCount,
      jobsByStatus,
      jobsByType,
      storiesByStatus,
      activeJobs,
      deadJobs,
      recentJobs,
      recentNotifications,
      aiUsage,
      workerUsage,
    ] = await Promise.all([
      prisma.story.count({ where: { companyId: orgId } }),
      prisma.rssFeed.count({ where: { companyId: orgId } }),
      prisma.socialChannel.count({ where: { companyId: orgId } }),
      prisma.videoPublish.count({ where: { video: { is: { companyId: orgId } } } }),
      prisma.generationJob.count({ where: { companyId: orgId } }),
      prisma.schedule.count({ where: { companyId: orgId } }),
      prisma.generationJob.groupBy({
        by: ["status"],
        where: { companyId: orgId },
        _count: { id: true },
      }),
      prisma.generationJob.groupBy({
        by: ["type", "status"],
        where: { companyId: orgId },
        _count: { id: true },
      }),
      prisma.story.groupBy({
        by: ["status"],
        where: { companyId: orgId },
        _count: { id: true },
      }),
      prisma.generationJob.findMany({
        where: {
          companyId: orgId,
          status: { in: ["QUEUED", "TTS_IN_PROGRESS", "VIDEO_IN_PROGRESS", "RENDER_IN_PROGRESS", "IMAGE_IN_PROGRESS"] },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          type: true,
          status: true,
          storyId: true,
          createdAt: true,
          startedAt: true,
        },
      }),
      prisma.generationJob.findMany({
        where: { companyId: orgId, status: "FAILED" },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          type: true,
          status: true,
          storyId: true,
          attempts: true,
          errorLog: true,
          createdAt: true,
        },
      }),
      prisma.generationJob.findMany({
        where: { companyId: orgId },
        take: 6,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          type: true,
          status: true,
          createdAt: true,
          completedAt: true,
        },
      }),
      prisma.notification.findMany({
        where: { companyId: orgId },
        take: 4,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          type: true,
          createdAt: true,
        },
      }),
      prisma.aiTokenUsage.aggregate({
        where: { companyId: orgId },
        _sum: {
          promptTokens: true,
          completionTokens: true,
          totalTokens: true,
          estimatedCost: true,
        },
      }),
      prisma.usageLog.aggregate({
        where: {
          companyId: orgId,
          type: {
            in: ["tts_credits", "video_credits", "render_credits", "audio_credits", "full_credits", "video_full_credits", "video_bubble_credits"],
          },
        },
        _sum: { amount: true },
      }),
    ]);

    // 3. Process job stats
    const jobStats = { queued: 0, processing: 0, done: 0, failed: 0, dead: 0 };
    jobsByStatus.forEach((group: { status: string; _count: { id: number } }) => {
      const status = group.status.toLowerCase();
      if (status === "queued") jobStats.queued = group._count.id;
      else if (status.includes("in_progress") || status === "processing") jobStats.processing += group._count.id;
      else if (status === "done" || status === "completed") jobStats.done += group._count.id;
      else if (status === "failed") jobStats.failed += group._count.id;
      else if (status === "dead") jobStats.dead += group._count.id;
    });

    // 4. Queue depth by job type
    const queueDepth: Record<string, { queued: number; processing: number; failed: number; total: number }> = {};
    const jobTypes = ["audio", "video_full", "video_bubble", "render", "image", "full"];
    for (const type of jobTypes) {
      queueDepth[type] = { queued: 0, processing: 0, failed: 0, total: 0 };
    }
    jobsByType.forEach((group: { type: string; status: string; _count: { id: number } }) => {
      const type = group.type;
      if (!queueDepth[type]) queueDepth[type] = { queued: 0, processing: 0, failed: 0, total: 0 };
      const status = group.status.toLowerCase();
      if (status === "queued") queueDepth[type].queued += group._count.id;
      else if (status.includes("in_progress") || status === "processing") queueDepth[type].processing += group._count.id;
      else if (status === "failed" || status === "dead") queueDepth[type].failed += group._count.id;
      queueDepth[type].total += group._count.id;
    });

    // 5. Pipeline funnel — stories by status
    const pipelineFunnel: Record<string, number> = {};
    storiesByStatus.forEach((group: { status: string; _count: { id: number } }) => {
      pipelineFunnel[group.status] = group._count.id;
    });

    // 6. Stage 2: Deduplicate and resolve story titles for active & dead jobs in a single query
    const allStoryIds = [...new Set([
      ...activeJobs.map((j) => j.storyId).filter(Boolean),
      ...deadJobs.map((j) => j.storyId).filter(Boolean),
    ])];

    const stories = allStoryIds.length > 0
      ? await prisma.story.findMany({
          where: { id: { in: allStoryIds as string[] }, companyId: orgId },
          select: { id: true, title: true },
        })
      : [];
    const storyMap = new Map(stories.map((s) => [s.id, s.title]));

    const enrichedActiveJobs = activeJobs.map((j) => ({
      ...j,
      _storyTitle: j.storyId ? storyMap.get(j.storyId) || null : null,
    }));

    const enrichedDeadJobs = deadJobs.map((j) => ({
      ...j,
      payload: null,
      result: j.errorLog || null,
      _storyTitle: j.storyId ? storyMap.get(j.storyId) || null : null,
    }));

    // 7. System health (fetch from internal endpoint with 2s timeout)
    let systemHealth = null;
    try {
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const healthRes = await fetch(`${baseUrl}/api/health`, { signal: AbortSignal.timeout(2000) });
      if (healthRes.ok) {
        systemHealth = await healthRes.json();
      }
    } catch { /* health check failed */ }

    // 8. System audit logs
    const systemLogs = [
      ...recentNotifications.map((n) => ({
        id: `notif-${n.id}`,
        user: "System",
        action: n.title,
        target: n.type,
        timestamp: n.createdAt.toISOString(),
        status: n.type === "job_failed" ? "error" as const : "success" as const,
      })),
      ...recentJobs.map((j: { id: string; type: string; status: string; createdAt: Date; completedAt: Date | null }) => ({
        id: `job-log-${j.id}`,
        user: "Background Worker",
        action: `Job ${j.type} processed`,
        target: "Job Queue / Worker",
        timestamp: (j.completedAt || j.createdAt).toISOString(),
        status: j.status === "DONE" ? "success" as const : j.status === "FAILED" ? "error" as const : "warning" as const,
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // 9. AI token and Worker credit stats
    const totalPromptTokens = aiUsage._sum.promptTokens || 0;
    const totalCompletionTokens = aiUsage._sum.completionTokens || 0;
    const totalTokens = aiUsage._sum.totalTokens || 0;
    const estimatedCost = aiUsage._sum.estimatedCost || 0.0;
    const workerCredits = workerUsage._sum.amount || 0.0;

    const response = NextResponse.json({
      metrics: {
        storiesCount,
        feedsCount,
        channelsCount,
        publishesCount,
        jobsCount,
        schedulesCount,
      },
      jobStats,
      queueDepth,
      pipelineFunnel,
      activeJobs: enrichedActiveJobs,
      deadJobs: enrichedDeadJobs,
      systemHealth,
      aiTokens: {
        totalPromptTokens,
        totalCompletionTokens,
        totalTokens,
        estimatedCost: estimatedCost.toFixed(4),
        workerCredits: workerCredits.toFixed(2),
      },
      systemLogs,
    });
    response.headers.set("Cache-Control", "private, max-age=10, stale-while-revalidate=30");
    return response;
  } catch (e: unknown) {
    console.error("Failed to load admin metrics:", e);
    return NextResponse.json(
      { error: "Internal server error", details: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
