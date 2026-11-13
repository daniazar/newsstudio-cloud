import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";

export async function DELETE(_request: NextRequest) {
  const t = await requireTenant();
  if (!t.ok) return t.response;

  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    // Delete all offline workers
    const result = await prisma.worker.deleteMany({
      where: { lastSeenAt: { lt: fiveMinutesAgo } },
    });
    
    return Response.json({ success: true, count: result.count });
  } catch (error) {
    console.error("[Pipeline Worker Mass DELETE] Error:", error);
    return Response.json({ error: "Failed to delete offline workers" }, { status: 500 });
  }
}
