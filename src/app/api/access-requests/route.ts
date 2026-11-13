import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { isSuperAdminEmail } from "@/lib/superadmin";

export const dynamic = "force-dynamic";

/**
 * A signed-in but unapproved user asks for admin access. Idempotent: one row
 * per Clerk user. Re-requesting after a rejection re-opens the request; an
 * already-approved user is a no-op.
 */
export async function POST(request: Request) {
  const { userId, orgId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || null;

  // Already an admin / super admin → nothing to request.
  if (isSuperAdminEmail(email) || user?.publicMetadata?.role === "admin") {
    return NextResponse.json({ status: "approved", alreadyApproved: true });
  }

  let message: string | null = null;
  try {
    const body = await request.json();
    if (typeof body?.message === "string") message = body.message.slice(0, 500).trim() || null;
  } catch {
    // no body is fine
  }

  const existing = await prisma.accessRequest.findUnique({ where: { userId } });
  if (existing?.status === "approved") {
    return NextResponse.json({ status: "approved", alreadyApproved: true });
  }

  const record = await prisma.accessRequest.upsert({
    where: { userId },
    update: {
      status: "pending",
      message: message ?? existing?.message ?? null,
      email,
      name,
      orgId: orgId ?? null,
      reviewedBy: null,
      reviewedAt: null,
    },
    create: { userId, email, name, orgId: orgId ?? null, message, status: "pending" },
  });

  return NextResponse.json({ status: record.status });
}
