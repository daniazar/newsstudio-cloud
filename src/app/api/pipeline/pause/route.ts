import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";

/**
 * POST /api/pipeline/pause
 * Toggle the global pipeline pause state for the current tenant.
 * Expects JSON body: { pause: boolean }
 */
export async function POST(request: NextRequest) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const body = await request.json();
    const { pause } = body;

    if (typeof pause !== "boolean") {
      return Response.json(
        { error: "Invalid payload. Expected { pause: boolean }" },
        { status: 400 }
      );
    }

    const updatedCompany = await prisma.company.update({
      where: { id: orgId },
      data: { isPipelinePaused: pause },
    });

    return Response.json({
      success: true,
      isPipelinePaused: updatedCompany.isPipelinePaused,
    });
  } catch (error) {
    console.error("[Pipeline Pause API] Error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
