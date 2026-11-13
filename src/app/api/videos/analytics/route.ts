import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";

export async function GET() {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const publishes = await prisma.videoPublish.findMany({
      where: {
        status: "PUBLISHED",
        publishedAt: { not: null },
        video: { is: { companyId: orgId } },
      },
      select: {
        videoId: true,
        viewCount: true,
        likeCount: true,
        publishedAt: true,
        video: {
          select: {
            id: true,
            personaId: true,
            thumbnailPath: true,
            outputPath: true,
            createdAt: true,
            story: {
              select: {
                title: true,
                category: true,
              },
            },
          },
        },
      },
    });

    // 1. Calculate Trend (last 7 days vs previous 7 days)
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    let recentViews = 0;
    let previousViews = 0;

    const categoryViews: Record<string, number> = {};
    const personaViews: Record<string, number> = {};
    const dayOfWeekViews: Record<number, number> = {}; // 0=Sun, 6=Sat
    const timeOfDayViews: Record<string, number> = {}; // "Morning", "Afternoon", "Evening", "Night"

    interface VideoPerformanceEntry {
      id: string;
      title: string;
      thumbnailPath: string | null;
      category: string;
      persona: string;
      totalViews: number;
      totalLikes: number;
      publishCount: number;
      createdAt: Date;
    }

    const performanceTableMap: Record<string, VideoPerformanceEntry> = {};

    for (const pub of publishes) {
      const pubDate = new Date(pub.publishedAt!);
      const views = pub.viewCount || 0;
      const likes = pub.likeCount || 0;

      // Trend accumulation
      if (pubDate >= sevenDaysAgo) {
        recentViews += views;
      } else if (pubDate >= fourteenDaysAgo) {
        previousViews += views;
      }

      // Metadata accumulation
      const category = pub.video.story.category || "General";
      const persona = pub.video.personaId || "ruby";
      
      categoryViews[category] = (categoryViews[category] || 0) + views;
      personaViews[persona] = (personaViews[persona] || 0) + views;

      const day = pubDate.getDay();
      dayOfWeekViews[day] = (dayOfWeekViews[day] || 0) + views;

      const hour = pubDate.getHours();
      let timeOfDay = "Night"; // 0-5
      if (hour >= 6 && hour < 12) timeOfDay = "Morning";
      else if (hour >= 12 && hour < 18) timeOfDay = "Afternoon";
      else if (hour >= 18) timeOfDay = "Evening";
      timeOfDayViews[timeOfDay] = (timeOfDayViews[timeOfDay] || 0) + views;

      // Group by video for performance table
      const vidId = pub.videoId;
      if (!performanceTableMap[vidId]) {
        performanceTableMap[vidId] = {
          id: vidId,
          title: pub.video.story.title,
          thumbnailPath: pub.video.thumbnailPath || pub.video.outputPath,
          category,
          persona,
          totalViews: 0,
          totalLikes: 0,
          publishCount: 0,
          createdAt: pub.video.createdAt,
        };
      }
      performanceTableMap[vidId].totalViews += views;
      performanceTableMap[vidId].totalLikes += likes;
      performanceTableMap[vidId].publishCount += 1;
    }

    const trendPercent = previousViews === 0 
      ? (recentViews > 0 ? 100 : 0) 
      : Math.round(((recentViews - previousViews) / previousViews) * 100);

    const bestCategory = Object.entries(categoryViews).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
    const bestPersona = Object.entries(personaViews).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
    
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const bestDayIdx = Object.entries(dayOfWeekViews).sort((a, b) => b[1] - a[1])[0]?.[0];
    const bestDay = bestDayIdx ? dayNames[parseInt(bestDayIdx)] : "N/A";

    const bestTime = Object.entries(timeOfDayViews).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

    const performanceList = Object.values(performanceTableMap).sort((a, b) => b.totalViews - a.totalViews);

    const response = NextResponse.json({
      trend: {
        recentViews,
        previousViews,
        percentChange: trendPercent,
      },
      bestPerforming: {
        category: bestCategory,
        persona: bestPersona,
        dayOfWeek: bestDay,
        timeOfDay: bestTime,
      },
      table: performanceList,
    });
    response.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=120");
    return response;
  } catch (error) {
    console.error("Failed to compute video analytics", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
