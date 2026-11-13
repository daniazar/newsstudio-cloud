import { NextRequest, NextResponse } from "next/server";
import { renderOmnichannelBatch } from "@/lib/ecommerce/omnichannelExporter";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { broadcastWorkerWake } from "@/lib/worker-broker/supabaseWake";

function isRemoteWorkerMode(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.FORCE_REMOTE_WORKER === "true" ||
    (process.env.NODE_ENV !== "test" && process.env.ALLOW_API_SPAWN !== "true")
  );
}

export async function GET(req: NextRequest) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const orgId = t.tenant.orgId;

  const jobId = new URL(req.url).searchParams.get("jobId");
  if (!jobId) {
    return NextResponse.json({ success: false, error: "jobId is required" }, { status: 400 });
  }

  const job = await prisma.generationJob.findFirst({
    where: { id: jobId, companyId: orgId },
  });
  if (!job) {
    return NextResponse.json({ success: false, error: "Render job not found" }, { status: 404 });
  }

  let parsedConfig: Record<string, unknown> = {};
  try {
    parsedConfig = job.config ? (JSON.parse(job.config) as Record<string, unknown>) : {};
  } catch {}
  const resultObj =
    parsedConfig.result && typeof parsedConfig.result === "object"
      ? (parsedConfig.result as Record<string, unknown>)
      : {};

  return NextResponse.json({
    success: true,
    jobId: job.id,
    status: job.status,
    progress: job.currentStep || (job.status === "QUEUED" ? "Queued for local worker..." : "Rendering omnichannel batch..."),
    bundle: resultObj.bundle ?? null,
    error: job.status === "FAILED" ? job.errorLog || "Omnichannel render failed" : undefined,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let {
      productSpec,
      script,
      productId,
      campaignId,
      presenter,
      presenterConfig,
      watermark,
      usVsThem,
      qrCode,
      socialPopup,
      audioMode,
      musicBedUrl,
      baseMusicVolume,
      duckingDb,
      audioUrl,
      audioConfig,
      dryRun = false,
    } = body;

    // Resolve mapped fields from editor page payloads
    if (!presenter && presenterConfig) {
      presenter = presenterConfig;
    }
    if (audioConfig) {
      if (audioConfig.bgmUrl && !musicBedUrl) musicBedUrl = audioConfig.bgmUrl;
      if (audioConfig.bgmVolume !== undefined && baseMusicVolume === undefined) baseMusicVolume = audioConfig.bgmVolume;
      if (audioConfig.duckingDb !== undefined && duckingDb === undefined) duckingDb = audioConfig.duckingDb;
    }

    // Resolve productSpec and script from database campaign if not explicitly provided
    const targetCampaignId = productId || campaignId;
    if ((!productSpec || !script) && targetCampaignId) {
      const campaign = await prisma.productCampaign.findUnique({
        where: { id: targetCampaignId },
        include: { variations: { take: 1, orderBy: { createdAt: "desc" } } },
      });

      if (campaign) {
        interface CampaignParsedMeta {
          sourceUrl?: string;
          title?: string;
          vendor?: string;
          description?: string;
          bulletPoints?: string[];
          rawFeatures?: string[];
          price?: number;
          compareAtPrice?: number;
          currency?: string;
          inStock?: boolean;
          typology?: string;
          brand?: {
            name?: string;
            domain?: string;
            logoUrl?: string | null;
            faviconUrl?: string | null;
            appleTouchIconUrl?: string | null;
            primaryColor?: string;
            secondaryColor?: string;
            surfaceColor?: string;
          };
          [key: string]: unknown;
        }
        let parsedMeta: CampaignParsedMeta = {};
        if (campaign.rawMetadata) {
          try {
            parsedMeta = JSON.parse(campaign.rawMetadata);
          } catch {}
        }

        const safeUrl = parsedMeta.sourceUrl || campaign.sourceUrl || "https://example.com/product";
        let safeDomain = "brand.com";
        try {
          safeDomain = new URL(safeUrl).hostname;
        } catch {}

        productSpec = {
          id: campaign.id,
          sourceUrl: safeUrl,
          title: parsedMeta.title || campaign.title,
          vendor: parsedMeta.vendor || campaign.vendor || "Brand",
          description: parsedMeta.description || campaign.title,
          bulletPoints: parsedMeta.bulletPoints || parsedMeta.rawFeatures || [],
          price: parsedMeta.price ?? campaign.price,
          compareAtPrice: parsedMeta.compareAtPrice ?? campaign.comparePrice,
          currency: parsedMeta.currency || campaign.currency || "USD",
          inStock: parsedMeta.inStock ?? true,
          typology: parsedMeta.typology || campaign.typology || "discrete_object",
          brand: parsedMeta.brand || {
            name: campaign.vendor || "Brand",
            domain: safeDomain,
            logoUrl: null,
            faviconUrl: null,
            appleTouchIconUrl: null,
            primaryColor: "#06b6d4",
            secondaryColor: "#f43f5e",
            surfaceColor: "#09090b",
            toneOfVoice: "playful_hype",
            taglines: [],
          },
          variants: parsedMeta.variants || [],
          assets: parsedMeta.assets || parsedMeta.mediaAssets || [],
          topReviews: parsedMeta.topReviews || [],
          scrapedAt: parsedMeta.scrapedAt || new Date().toISOString(),
        };

        if (!script && campaign.variations?.[0]?.scriptJson) {
          try {
            script = JSON.parse(campaign.variations[0].scriptJson);
          } catch {}
        }
      }
    }

    if (!productSpec || !script) {
      return NextResponse.json(
        { success: false, error: "Missing required productSpec or script payload" },
        { status: 400 }
      );
    }

    if (!dryRun && isRemoteWorkerMode()) {
      let companyId = "default";
      try {
        const t = await requireTenant();
        if (t.ok) companyId = t.tenant.orgId;
      } catch {}

      const job = await prisma.generationJob.create({
        data: {
          companyId,
          storyId: String(targetCampaignId || productSpec.id || `omnichannel_${Date.now()}`),
          type: "ecommerce_render",
          status: "QUEUED",
          totalSteps: 3,
          doneSteps: 0,
          currentStep: "Queued for local worker",
          config: JSON.stringify({
            kind: "omnichannel",
            productSpec,
            script,
            presenter,
            watermark,
            usVsThem,
            qrCode,
            socialPopup,
            audioMode,
            musicBedUrl,
            baseMusicVolume,
            duckingDb,
            audioUrl,
          }),
        },
      });
      void broadcastWorkerWake("job_queued");

      return NextResponse.json({
        ok: true,
        queued: true,
        success: true,
        jobId: job.id,
        status: "QUEUED",
        message: "Omnichannel render batch queued for local worker execution.",
      });
    }

    const bundle = await renderOmnichannelBatch({
      productSpec,
      script,
      presenter,
      watermark,
      usVsThem,
      qrCode,
      socialPopup,
      audioMode,
      musicBedUrl,
      baseMusicVolume,
      duckingDb,
      audioUrl,
      dryRun,
    });

    return NextResponse.json({
      success: true,
      bundle,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/ecommerce/omnichannel-render] Error:", msg);
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
