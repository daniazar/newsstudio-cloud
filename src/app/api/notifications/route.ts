import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { parseListParams, listResponse } from "@/lib/pagination";
import { liveNotifications } from "@/lib/notifications";

async function resolveOrgId() {
  try {
    const t = await requireTenant();
    if (t.ok) return { orgId: t.tenant.orgId, response: null };
    if (process.env.NODE_ENV === "production") return { orgId: null, response: t.response };
  } catch {
    if (process.env.NODE_ENV === "production") {
      return { orgId: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    }
  }
  const firstCompany = await prisma.company.findFirst();
  return { orgId: firstCompany?.id || "default", response: null };
}

export async function GET(request: NextRequest) {
  const { orgId, response } = await resolveOrgId();
  if (response) return response;
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const searchParams = new URL(request.url).searchParams;
    const { page, limit, skip, take, q } = parseListParams(searchParams);
    const type = searchParams.get("type");
    const unread = searchParams.get("unread");

    const andConditions: Record<string, unknown>[] = [{ companyId: orgId }];

    if (unread === "true") {
      andConditions.push({ isRead: false });
    }

    if (type && type !== "all") {
      andConditions.push({ type });
    }

    if (q) {
      andConditions.push({
        OR: [
          { title: { contains: q } },
          { message: { contains: q } },
        ],
      });
    }

    const where = { AND: andConditions };

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        select: {
          id: true,
          companyId: true,
          type: true,
          title: true,
          message: true,
          data: true,
          isRead: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take,
      }),
      prisma.notification.count({ where }),
    ]);

    // Inject any live transient updates from the global memory map
    const augmentedNotifs = notifications.map((notif: { id: string; message: string; data: string | null; [key: string]: unknown }) => {
      if (liveNotifications.has(notif.id)) {
        const liveData = liveNotifications.get(notif.id)!;
        return {
          ...notif,
          message: liveData.message,
          data: JSON.stringify({ progress: liveData.progress, total: liveData.total })
        };
      }
      return notif;
    });

    return NextResponse.json({
      ...listResponse(augmentedNotifs, total, page, limit),
      notifications: augmentedNotifs,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Error fetching notifications: " + String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const body = await req.json();
    const { type, title, message, data } = body;

    if (!type || !title || !message) {
      return NextResponse.json(
        { error: "Missing required fields: type, title, message" },
        { status: 400 }
      );
    }

    const notification = await prisma.notification.create({
      data: {
        companyId: orgId,
        type,
        title,
        message,
        data: data ? JSON.stringify(data) : null,
      },
    });

    return NextResponse.json(notification);
  } catch (error) {
    return NextResponse.json(
      { error: "Error creating notification: " + String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (id) {
      // Delete single notification (scoped to the tenant)
      await prisma.notification.deleteMany({
        where: { id, companyId: orgId },
      });
      return NextResponse.json({ success: true, message: "Notification deleted" });
    } else {
      // Delete all notifications for this tenant (clear history)
      await prisma.notification.deleteMany({ where: { companyId: orgId } });
      return NextResponse.json({ success: true, message: "All notifications cleared" });
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Error deleting notifications: " + String(error) },
      { status: 500 }
    );
  }
}
