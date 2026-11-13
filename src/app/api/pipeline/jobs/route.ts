import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { parseListParams, listResponse } from "@/lib/pagination";

/**
 * GET /api/pipeline/jobs
 * List generation jobs for the current tenant. User-facing.
 */
export async function GET(request: NextRequest) {
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
    const searchParams = new URL(request.url).searchParams;
    const { page, limit, skip, take, status } = parseListParams(searchParams);

    const where: Record<string, unknown> = { companyId: orgId };
    if (status) {
      where.status = status;
    }

    const [jobs, total] = await Promise.all([
      prisma.generationJob.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        select: {
          id: true,
          storyId: true,
          companyId: true,
          type: true,
          status: true,
          currentStep: true,
          totalSteps: true,
          doneSteps: true,
          workerId: true,
          startedAt: true,
          completedAt: true,
          errorLog: true,
          createdAt: true,
          durationMs: true,
          creditsUsed: true,
          attempts: true,
          maxAttempts: true,
          studioType: true,
          config: true,
          company: { select: { name: true } },
        },
      }),
      prisma.generationJob.count({ where }),
    ]);

    // Fetch story titles separately since storyId isn't a relation
    const storyIds = [...new Set(jobs.map((j) => j.storyId).filter(Boolean))];
    const stories = storyIds.length > 0
      ? await prisma.story.findMany({
          where: { id: { in: storyIds }, companyId: orgId },
          select: { id: true, title: true },
        })
      : [];
    const storyTitleMap = new Map(stories.map((s) => [s.id, s.title]));

    const enrichedJobs = jobs.map((job) => {
      let title = storyTitleMap.get(job.storyId);
      if (!title && job.type === "wardrobe_inpaint" && job.config) {
        try {
          const cfg = JSON.parse(job.config);
          title = `${cfg.personaName || "Anchor"} — ${cfg.outfitName || "Wardrobe Inpaint"}`;
        } catch {}
      }
      return {
        ...job,
        storyTitle: title ?? (job.type === "wardrobe_inpaint" ? "Wardrobe Inpaint" : "Unknown"),
      };
    });

    const response = Response.json({
      ...listResponse(enrichedJobs, total, page, limit),
    });
    response.headers.set("Cache-Control", "private, max-age=5, stale-while-revalidate=15");
    return response;
  } catch (error) {
    console.error("[Pipeline Jobs] GET error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
