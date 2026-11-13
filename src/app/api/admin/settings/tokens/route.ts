import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/apiHandler";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const GET = withAdminAuth(async (request: NextRequest) => {
  const { searchParams } = request.nextUrl;
  const companyId = searchParams.get("companyId");
  const daysParam = searchParams.get("days") || "30";
  const days = Math.min(Math.max(parseInt(daysParam, 10) || 30, 1), 365);

  const now = new Date();
  const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (days - 1)));

  const whereClause: { createdAt: { gte: Date }; companyId?: string } = {
    createdAt: { gte: startDate },
  };
  if (companyId) {
    whereClause.companyId = companyId;
  }

  const [records, totals] = await Promise.all([
    prisma.aiTokenUsage.findMany({
      where: whereClause,
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        companyId: true,
        provider: true,
        model: true,
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
        estimatedCost: true,
        createdAt: true,
      },
    }),
    prisma.aiTokenUsage.aggregate({
      where: whereClause,
      _sum: {
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
        estimatedCost: true,
      },
      _count: {
        id: true,
      },
    }),
  ]);

  // Aggregate by provider
  const byProvider: Record<string, { promptTokens: number; completionTokens: number; totalTokens: number; estimatedCost: number; calls: number }> = {
    gemini: { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCost: 0, calls: 0 },
    ollama: { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCost: 0, calls: 0 },
  };

  // Aggregate by model
  const byModelMap = new Map<string, { model: string; provider: string; promptTokens: number; completionTokens: number; totalTokens: number; estimatedCost: number; calls: number }>();

  // Aggregate timeline by day (YYYY-MM-DD)
  const timelineMap: Record<string, { date: string; geminiTokens: number; ollamaTokens: number; totalTokens: number; estimatedCost: number; calls: number }> = {};

  for (let i = 0; i < days; i++) {
    const d = new Date(startDate);
    d.setUTCDate(d.getUTCDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    timelineMap[dateStr] = {
      date: dateStr,
      geminiTokens: 0,
      ollamaTokens: 0,
      totalTokens: 0,
      estimatedCost: 0,
      calls: 0,
    };
  }

  for (const row of records) {
    const providerKey = row.provider.toLowerCase() === "ollama" ? "ollama" : "gemini";
    if (!byProvider[providerKey]) {
      byProvider[providerKey] = { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCost: 0, calls: 0 };
    }
    byProvider[providerKey].promptTokens += row.promptTokens || 0;
    byProvider[providerKey].completionTokens += row.completionTokens || 0;
    byProvider[providerKey].totalTokens += row.totalTokens || 0;
    byProvider[providerKey].estimatedCost += row.estimatedCost || 0;
    byProvider[providerKey].calls += 1;

    const modelKey = `${providerKey}:${row.model}`;
    const modelEntry = byModelMap.get(modelKey) || {
      model: row.model,
      provider: providerKey,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      estimatedCost: 0,
      calls: 0,
    };
    modelEntry.promptTokens += row.promptTokens || 0;
    modelEntry.completionTokens += row.completionTokens || 0;
    modelEntry.totalTokens += row.totalTokens || 0;
    modelEntry.estimatedCost += row.estimatedCost || 0;
    modelEntry.calls += 1;
    byModelMap.set(modelKey, modelEntry);

    const dateStr = row.createdAt.toISOString().split("T")[0];
    if (timelineMap[dateStr]) {
      if (providerKey === "gemini") {
        timelineMap[dateStr].geminiTokens += row.totalTokens || 0;
      } else {
        timelineMap[dateStr].ollamaTokens += row.totalTokens || 0;
      }
      timelineMap[dateStr].totalTokens += row.totalTokens || 0;
      timelineMap[dateStr].estimatedCost += row.estimatedCost || 0;
      timelineMap[dateStr].calls += 1;
    }
  }

  const byModel = Array.from(byModelMap.values()).sort((a, b) => b.totalTokens - a.totalTokens);
  const timeline = Object.keys(timelineMap).sort().map((d) => timelineMap[d]);

  return NextResponse.json({
    summary: {
      promptTokens: totals._sum.promptTokens || 0,
      completionTokens: totals._sum.completionTokens || 0,
      totalTokens: totals._sum.totalTokens || 0,
      estimatedCost: Number((totals._sum.estimatedCost || 0).toFixed(6)),
      totalCalls: totals._count.id || 0,
    },
    byProvider,
    byModel,
    timeline,
  });
});
