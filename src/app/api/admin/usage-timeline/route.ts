import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";

export async function GET(request: NextRequest) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const searchParams = request.nextUrl.searchParams;
    const daysParam = searchParams.get("days") || "30";
    const days = parseInt(daysParam, 10);

    if (isNaN(days) || days <= 0 || days > 365) {
      return NextResponse.json({ error: "Invalid days parameter" }, { status: 400 });
    }

    // Use UTC for all date logic to match the database timestamps
    const now = new Date();
    const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (days - 1)));

    // Fetch logs and AI token costs in parallel
    const [logs, aiLogs] = await Promise.all([
      prisma.usageLog.findMany({
        where: {
          companyId: orgId,
          createdAt: {
            gte: startDate,
          },
        },
        orderBy: {
          createdAt: "asc",
        },
        select: {
          type: true,
          amount: true,
          createdAt: true,
        },
      }),
      prisma.aiTokenUsage.findMany({
        where: {
          companyId: orgId,
          createdAt: { gte: startDate },
        },
        select: {
          createdAt: true,
          estimatedCost: true,
        },
      }),
    ]);

    // Group logs by date (YYYY-MM-DD) and type
    const groupedData: Record<string, Record<string, number>> = {};

    // Initialize all dates in range with 0 to ensure continuous timeline
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setUTCDate(d.getUTCDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      groupedData[dateStr] = {
        tts_credits: 0,
        video_credits: 0,
        render_credits: 0,
        llm_cost: 0,
        other: 0,
      };
    }

    // Populate data from UsageLog
    logs.forEach((log) => {
      const dateStr = log.createdAt.toISOString().split("T")[0];
      if (!groupedData[dateStr]) return;

      const amount = log.amount || 0;
      if (log.type === "tts_credits" || log.type === "audio_credits") {
        groupedData[dateStr].tts_credits += amount;
      } else if (log.type === "video_credits" || log.type === "video_full_credits" || log.type === "video_bubble_credits" || log.type.includes("video")) {
        groupedData[dateStr].video_credits += amount;
      } else if (log.type === "render_credits") {
        groupedData[dateStr].render_credits += amount;
      } else if (log.type !== "llm_tokens" && log.type !== "token") {
        groupedData[dateStr].other += amount;
      }
    });

    aiLogs.forEach((log) => {
      const dateStr = log.createdAt.toISOString().split("T")[0];
      if (groupedData[dateStr]) {
        groupedData[dateStr].llm_cost += log.estimatedCost || 0;
      }
    });

    // Format for recharts array
    const chartData = Object.keys(groupedData).sort().map((date) => ({
      date,
      ...groupedData[date],
    }));

    const response = NextResponse.json({ data: chartData });
    response.headers.set("Cache-Control", "private, max-age=60, stale-while-revalidate=180");
    return response;
  } catch (error) {
    console.error("Failed to load usage timeline:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
