import { NextResponse } from "next/server";
import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { isSuperAdminEmail } from "@/lib/superadmin";

export const dynamic = "force-dynamic";

/**
 * Approve or reject an access request. Approval grants the Clerk user
 * `publicMetadata.role = "admin"` (the signal the /admin gate checks);
 * rejection revokes it. Super admin only.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const reviewer = await currentUser();
  const reviewerEmail = reviewer?.primaryEmailAddress?.emailAddress;
  if (!isSuperAdminEmail(reviewerEmail)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const action = body?.action;
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "action must be 'approve' or 'reject'" }, { status: 400 });
  }

  const req = await prisma.accessRequest.findUnique({ where: { id } });
  if (!req) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  // Sync the Clerk role first; only persist the decision if it succeeds.
  const client = await clerkClient();
  try {
    await client.users.updateUserMetadata(req.userId, {
      publicMetadata: { role: action === "approve" ? "admin" : null },
    });
  } catch {
    return NextResponse.json(
      { error: "Could not update the user in Clerk (they may have been deleted)." },
      { status: 502 },
    );
  }

  const updated = await prisma.accessRequest.update({
    where: { id },
    data: {
      status: action === "approve" ? "approved" : "rejected",
      reviewedBy: reviewerEmail ?? null,
      reviewedAt: new Date(),
    },
  });

  return NextResponse.json({ request: updated });
}
