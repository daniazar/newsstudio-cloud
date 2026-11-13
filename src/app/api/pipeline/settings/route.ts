import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";

/**
 * GET /api/pipeline/settings
 * Fetch company's queue worker start thresholds.
 */
export async function GET(_request: NextRequest) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const company = await prisma.company.findUnique({
      where: { id: orgId },
      select: {
        minJobsAudio: true,
        minJobsVideo: true,
        minJobsRender: true,
        minJobsImage: true,
      },
    });

    if (!company) {
      return Response.json({ error: "Company not found" }, { status: 404 });
    }

    return Response.json({
      minJobsAudio: company.minJobsAudio,
      minJobsVideo: company.minJobsVideo,
      minJobsRender: company.minJobsRender,
      minJobsImage: company.minJobsImage,
    });
  } catch (error) {
    console.error("[Pipeline Settings GET] Error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST /api/pipeline/settings
 * Update company's queue worker start thresholds.
 * Expects JSON: { minJobsAudio?: number, minJobsVideo?: number, minJobsRender?: number, minJobsImage?: number }
 */
export async function POST(request: NextRequest) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const body = await request.json();
    const { minJobsAudio, minJobsVideo, minJobsRender, minJobsImage } = body;

    const data: Record<string, number> = {};
    
    if (minJobsAudio !== undefined) {
      const val = Number(minJobsAudio);
      if (isNaN(val) || val < 1) {
        return Response.json({ error: "minJobsAudio must be a number >= 1" }, { status: 400 });
      }
      data.minJobsAudio = Math.floor(val);
    }
    
    if (minJobsVideo !== undefined) {
      const val = Number(minJobsVideo);
      if (isNaN(val) || val < 1) {
        return Response.json({ error: "minJobsVideo must be a number >= 1" }, { status: 400 });
      }
      data.minJobsVideo = Math.floor(val);
    }
    
    if (minJobsRender !== undefined) {
      const val = Number(minJobsRender);
      if (isNaN(val) || val < 1) {
        return Response.json({ error: "minJobsRender must be a number >= 1" }, { status: 400 });
      }
      data.minJobsRender = Math.floor(val);
    }

    if (minJobsImage !== undefined) {
      const val = Number(minJobsImage);
      if (isNaN(val) || val < 1) {
        return Response.json({ error: "minJobsImage must be a number >= 1" }, { status: 400 });
      }
      data.minJobsImage = Math.floor(val);
    }

    if (Object.keys(data).length === 0) {
      return Response.json(
        { error: "Invalid payload. Expected minJobsAudio, minJobsVideo, minJobsRender, or minJobsImage" },
        { status: 400 }
      );
    }

    const updatedCompany = await prisma.company.update({
      where: { id: orgId },
      data,
    });

    return Response.json({
      success: true,
      minJobsAudio: updatedCompany.minJobsAudio,
      minJobsVideo: updatedCompany.minJobsVideo,
      minJobsRender: updatedCompany.minJobsRender,
      minJobsImage: updatedCompany.minJobsImage,
    });
  } catch (error) {
    console.error("[Pipeline Settings POST] Error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
