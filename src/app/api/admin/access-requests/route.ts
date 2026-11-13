import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/superadmin";

export const dynamic = "force-dynamic";

/** List access requests for the super-admin review queue (pending first). */
export async function GET() {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const requests = await prisma.accessRequest.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return NextResponse.json({ requests, stats: { pendingCount, total: requests.length } });
}
