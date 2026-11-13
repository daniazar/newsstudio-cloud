import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";

export async function POST() {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    await prisma.notification.updateMany({
      where: {
        companyId: orgId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });
    
    return NextResponse.json({ success: true, message: "All notifications marked as read." });
  } catch (error) {
    return NextResponse.json(
      { error: "Error updating notifications: " + String(error) },
      { status: 500 }
    );
  }
}
