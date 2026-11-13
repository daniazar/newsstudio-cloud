import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";

export async function GET() {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const prefix = `tenants/${orgId}/assets/`;

    // Run storage listing and DB segment lookup concurrently
    const [objects, segments] = await Promise.all([
      storage.list ? storage.list(prefix) : Promise.resolve([]),
      prisma.segment.findMany({
        where: { assetPath: { not: null }, script: { story: { companyId: orgId } } },
        select: {
          assetPath: true,
          index: true,
          script: {
            select: {
              story: {
                select: { title: true, id: true },
              },
            },
          },
        },
      }),
    ]);

    const endpoint = process.env.S3_ENDPOINT || "http://localhost:9000";
    const bucket = process.env.S3_BUCKET_NAME || "news-studio";

    // Index usages by asset URL for O(1) lookup
    const usagesByUrl = new Map<string, Array<{ storyId: string; storyTitle: string; sceneIndex: number }>>();
    for (const s of segments) {
      if (!s.assetPath) continue;
      const list = usagesByUrl.get(s.assetPath) || [];
      list.push({
        storyId: s.script.story.id,
        storyTitle: s.script.story.title,
        sceneIndex: s.index,
      });
      usagesByUrl.set(s.assetPath, list);
    }

    const assets = objects.map((obj) => {
      const url = storage.getUrl(obj.key);
      const legacyS3Url = `${endpoint}/${bucket}/${obj.key}`;
      const name = obj.key?.split("/").pop() || obj.key;

      return {
        key: obj.key,
        name,
        url,
        size: obj.size,
        lastModified: obj.lastModified,
        usages: usagesByUrl.get(url) || usagesByUrl.get(legacyS3Url) || usagesByUrl.get(obj.key) || [],
      };
    });

    // Sort by newest
    assets.sort((a, b) => {
      if (!a.lastModified || !b.lastModified) return 0;
      return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
    });

    return NextResponse.json(
      { assets },
      {
        headers: {
          "Cache-Control": "private, max-age=15, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    console.error("Failed to list assets:", error);
    return NextResponse.json({ error: "Failed to list assets" }, { status: 500 });
  }
}
