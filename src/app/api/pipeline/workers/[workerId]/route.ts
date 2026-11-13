import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ workerId: string }> }
) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const p = await params;

  try {
    // Delete worker
    await prisma.worker.delete({
      where: { id: p.workerId },
    });
    
    return Response.json({ success: true });
  } catch (error) {
    console.error("[Pipeline Worker DELETE] Error:", error);
    return Response.json({ error: "Failed to delete worker" }, { status: 500 });
  }
}
