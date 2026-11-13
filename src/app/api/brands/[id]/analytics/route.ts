import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const { id } = await params;

    const channel = await prisma.socialChannel.findFirst({ where: { id, companyId: orgId } });
    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    const platform = channel.platform;
    const analytics = [];
    const now = new Date();

    // Generate 30 days of consistent mock historical data based on platform!
    for (let i = 30; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 3600 * 1000);
      const dateStr = date.toLocaleDateString("es-ES", { month: "short", day: "numeric" });

      // Base scaling factors
      let viewsFactor = 500;
      let impressionsFactor = 5000;
      let gainsFactor = 5;

      if (platform === "youtube") {
        viewsFactor = 1500;
        impressionsFactor = 12000;
        gainsFactor = 8;
      } else if (platform === "tiktok") {
        viewsFactor = 3200;
        impressionsFactor = 18000;
        gainsFactor = 25;
      } else { // instagram
        viewsFactor = 900;
        impressionsFactor = 8000;
        gainsFactor = 12;
      }

      // Add pseudo-random variations to make the line graphs look dynamic and organic!
      const randomSeed = Math.sin(i + date.getDate()) * 0.4 + 1.0; // 0.6x to 1.4x variation
      const views = Math.round(viewsFactor * randomSeed);
      const impressions = Math.round(impressionsFactor * (randomSeed * 0.9 + 0.1));
      const gains = Math.round(gainsFactor * (randomSeed * 1.1 - 0.1));

      analytics.push({
        date: dateStr,
        views,
        impressions,
        gains: Math.max(0, gains),
      });
    }

    const response = NextResponse.json(analytics);
    response.headers.set("Cache-Control", "private, max-age=60, stale-while-revalidate=300");
    return response;
  } catch (error) {
    console.error("GET /api/brands/[id]/analytics failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
