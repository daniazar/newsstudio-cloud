import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { listResponse } from "@/lib/pagination";

interface HierarchyCacheEntry {
  hierarchy: Record<string, string[]>;
  timestamp: number;
}

const hierarchyCache = new Map<string, HierarchyCacheEntry>();
const HIERARCHY_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || undefined;
    const subCategory = searchParams.get("subCategory") || undefined;
    const subSubCategory = searchParams.get("subSubCategory") || undefined;
    const search = (searchParams.get("search") || "").trim();
    const studioApproved = searchParams.get("studioApproved") === "true";
    const fullAttire = searchParams.get("fullAttire") === "true";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "24", 10);

    const skip = (page - 1) * limit;

    // Define where query object
    const where: Prisma.VisualPresetWhereInput = {};
    if (category) where.category = category;
    if (subCategory) where.subCategory = subCategory;
    if (subSubCategory) where.subSubCategory = subSubCategory;
    if (studioApproved) where.isStudioApproved = true;
    if (fullAttire) where.isFullAttire = true;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { desc: { contains: search } }
      ];
    }

    const isFull = searchParams.get("full") === "true";
    const needsFull = isFull || category === "templates";

    // Execute queries in parallel
    const [items, totalCount] = await Promise.all([
      needsFull
        ? prisma.visualPreset.findMany({
            where,
            skip,
            take: limit,
            orderBy: { name: "asc" },
          })
        : prisma.visualPreset.findMany({
            where,
            skip,
            take: limit,
            orderBy: { name: "asc" },
            select: {
              id: true,
              name: true,
              desc: true,
              category: true,
              subCategory: true,
              subSubCategory: true,
              previewPath: true,
              isStudioApproved: true,
              isFullAttire: true,
              isCustom: true,
              createdAt: true,
            },
          }),
      prisma.visualPreset.count({ where }),
    ]);

    // Check in-memory hierarchy cache to avoid scanning 10,478 rows on every request
    const cacheKey = category || "__all__";
    let hierarchy: Record<string, string[]> = {};
    const cached = hierarchyCache.get(cacheKey);
    const now = Date.now();

    if (cached && now - cached.timestamp < HIERARCHY_CACHE_TTL_MS) {
      hierarchy = cached.hierarchy;
    } else {
      const hierarchySource = await prisma.visualPreset.findMany({
        where: category ? { category } : {},
        select: {
          subCategory: true,
          subSubCategory: true
        },
        distinct: ["subCategory", "subSubCategory"]
      });

      for (const row of hierarchySource) {
        if (!row.subCategory) continue;
        if (!hierarchy[row.subCategory]) {
          hierarchy[row.subCategory] = [];
        }
        if (row.subSubCategory && !hierarchy[row.subCategory].includes(row.subSubCategory)) {
          hierarchy[row.subCategory].push(row.subSubCategory);
        }
      }

      hierarchyCache.set(cacheKey, { hierarchy, timestamp: now });
    }

    const response = NextResponse.json({
      ...listResponse(items, totalCount, page, limit),
      items,
      totalCount,
      currentPage: page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      hierarchy
    });

    // Add brief HTTP Caching header for client speed
    response.headers.set("Cache-Control", "public, max-age=10, stale-while-revalidate=59");
    return response;
  } catch (error: unknown) {
    console.error("Error fetching presets:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error fetching presets" },
      { status: 500 }
    );
  }
}

// Support creating custom presets in the builder
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, desc, imageDesc, videoDesc, category, subCategory, subSubCategory } = body;

    if (!name || !desc || !category) {
      return NextResponse.json({ error: "Missing required fields: name, desc, category" }, { status: 400 });
    }

    const newPreset = await prisma.visualPreset.create({
      data: {
        name,
        desc,
        imageDesc: imageDesc || null,
        videoDesc: videoDesc || null,
        category,
        subCategory: subCategory || "Custom Presets",
        subSubCategory: subSubCategory || "My Presets",
        isCustom: true
      }
    });

    hierarchyCache.clear();

    return NextResponse.json(newPreset);
  } catch (error: unknown) {
    console.error("Error creating preset:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error creating preset" },
      { status: 500 }
    );
  }
}
