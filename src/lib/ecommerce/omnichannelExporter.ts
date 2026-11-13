/**
 * src/lib/ecommerce/omnichannelExporter.ts
 *
 * 1-Click Multi-Aspect Omnichannel Campaign Exporter (Sprint 10 & 14 Deliverable).
 * Orchestrates batch rendering across 9:16 Vertical, 16:9 Landscape, and 1:1 Square,
 * executes Zero-Trust QA certification, and bundles ad manager CSVs.
 */

import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import {
  ProductSpec,
  AdScript,
  AdAspectRatio,
  ProductAdCompositionProps,
  AdPresenterConfig,
  BrandWatermarkConfig,
  UsVsThemConfig,
  QrCodeConfig,
  SocialProofPopupConfig,
  AdIntroConfig,
  AdOutroConfig,
  VideoBackdropConfig,
  AdCaptionStyle,
} from "@/lib/types/ecommerce";
import {
  generateCompleteCampaignPackage,
  CampaignPackage,
} from "./campaignExporter";
import {
  auditRenderedVideo,
  generateHeuristicQaReport,
  ForensicQaReport,
} from "@/lib/ai/qaGatekeeper";
import {
  getRemotionEntryPoint,
  getRemotionBinPath,
  getOptimalRemotionConcurrency,
} from "@/lib/video/remotionUtils";

const execFileAsync = promisify(execFile);

export type OmnichannelFormatKey = "vertical" | "landscape" | "square";

export interface FormatSpec {
  key: OmnichannelFormatKey;
  label: string;
  aspectRatio: AdAspectRatio;
  compositionId: "ProductAd-Vertical" | "ProductAd-Landscape" | "ProductAd-Square";
  resolution: string;
  targetChannels: string[];
}

export const OMNICHANNEL_FORMATS: FormatSpec[] = [
  {
    key: "vertical",
    label: "Vertical 9:16",
    aspectRatio: "9:16",
    compositionId: "ProductAd-Vertical",
    resolution: "1080x1920",
    targetChannels: ["TikTok Shop", "Instagram Reels", "YouTube Shorts"],
  },
  {
    key: "landscape",
    label: "Landscape 16:9",
    aspectRatio: "16:9",
    compositionId: "ProductAd-Landscape",
    resolution: "1920x1080",
    targetChannels: ["Amazon PDP", "Shopify Desktop", "YouTube Ads"],
  },
  {
    key: "square",
    label: "Square 1:1",
    aspectRatio: "1:1",
    compositionId: "ProductAd-Square",
    resolution: "1080x1080",
    targetChannels: ["Meta Feed", "Instagram Carousel", "LinkedIn Ads"],
  },
];

export interface OmnichannelVideoMeta {
  key: OmnichannelFormatKey;
  label: string;
  aspectRatio: AdAspectRatio;
  compositionId: string;
  resolution: string;
  outputPath: string;
  url: string;
  qaReport: ForensicQaReport;
}

export interface OmnichannelCampaignBundle {
  campaignId: string;
  productTitle: string;
  createdAt: string;
  videos: Partial<Record<OmnichannelFormatKey, OmnichannelVideoMeta>>;
  package: CampaignPackage;
  files: {
    metaCsvPath: string;
    tiktokCsvPath: string;
    googlePmaxJsonPath: string;
    bundleManifestPath: string;
  };
  overallQaCertified: boolean;
}

export interface OmnichannelRenderOptions {
  productSpec: ProductSpec;
  script: AdScript;
  presenter?: AdPresenterConfig;
  watermark?: BrandWatermarkConfig;
  usVsThem?: UsVsThemConfig;
  qrCode?: QrCodeConfig;
  socialPopup?: SocialProofPopupConfig;
  audioMode?: "voiceover_tts" | "silent_subtitles";
  musicBedUrl?: string;
  baseMusicVolume?: number;
  duckingDb?: number;
  audioUrl?: string;
  outputDir?: string;
  dryRun?: boolean; // Skips ffmpeg/remotion render for fast testing
  intro?: AdIntroConfig;
  outro?: AdOutroConfig;
  backdrop?: VideoBackdropConfig;
  captionStyle?: AdCaptionStyle;
  accentColorOverride?: string;
}

/**
 * Automatically adapts composition input props for specific aspect ratio
 */
export function adaptPropsForAspectRatio(
  baseProps: ProductAdCompositionProps,
  targetAspect: AdAspectRatio
): ProductAdCompositionProps {
  const adaptedScript: AdScript = {
    ...baseProps.script,
    aspectRatio: targetAspect,
  };

  // Adjust presenter scaling and positioning per format
  let presenterScale = baseProps.presenter?.scale || 1.0;
  if (targetAspect === "1:1") {
    presenterScale = Math.min(1.0, presenterScale * 0.88);
  } else if (targetAspect === "16:9") {
    presenterScale = Math.min(1.0, presenterScale * 0.92);
  }

  const adaptedPresenter: AdPresenterConfig | undefined = baseProps.presenter
    ? {
        ...baseProps.presenter,
        scale: presenterScale,
        position: baseProps.presenter.position || "bottom_right",
      }
    : undefined;

  return {
    ...baseProps,
    aspectRatio: targetAspect,
    script: adaptedScript,
    presenter: adaptedPresenter,
  };
}

/**
 * Execute 1-Click Multi-Aspect Omnichannel Rendering
 */
export async function renderOmnichannelBatch(
  options: OmnichannelRenderOptions
): Promise<OmnichannelCampaignBundle> {
  const { productSpec, script, outputDir: customOutDir, dryRun = false } = options;
  const campaignId = `cmp_${productSpec.id}_${Date.now()}`;
  const outDir = customOutDir || path.join(process.cwd(), "renders", "ecommerce", campaignId);
  fs.mkdirSync(outDir, { recursive: true });

  // 1. Generate Ad Copy & CSV Package
  const pkg = generateCompleteCampaignPackage(productSpec, script);

  const metaCsvPath = path.join(outDir, `meta-ads-${productSpec.id}.csv`);
  const tiktokCsvPath = path.join(outDir, `tiktok-ads-${productSpec.id}.csv`);
  const googlePmaxJsonPath = path.join(outDir, `google-pmax-${productSpec.id}.json`);

  fs.writeFileSync(metaCsvPath, pkg.metaCsv);
  fs.writeFileSync(tiktokCsvPath, pkg.tiktokCsv);
  fs.writeFileSync(googlePmaxJsonPath, JSON.stringify(pkg.googlePmax, null, 2));

  // 2. Base composition props
  const baseProps: ProductAdCompositionProps = {
    productSpec,
    script,
    aspectRatio: "9:16",
    audioMode: options.audioMode || "voiceover_tts",
    audioUrl: options.audioUrl,
    musicBedUrl: options.musicBedUrl || "/music/energetic_upbeat.mp3",
    baseMusicVolume: options.baseMusicVolume ?? 0.35,
    duckingDb: options.duckingDb ?? -14,
    presenter: options.presenter,
    watermark: options.watermark,
    usVsThem: options.usVsThem,
    qrCode: options.qrCode,
    socialPopup: options.socialPopup,
    intro: options.intro,
    outro: options.outro,
    backdrop: options.backdrop,
    captionStyle: options.captionStyle,
    accentColorOverride: options.accentColorOverride,
  };

  const videos: Partial<Record<OmnichannelFormatKey, OmnichannelVideoMeta>> = {};
  let allCertified = true;

  // 3. Render all 3 aspect ratios
  for (const format of OMNICHANNEL_FORMATS) {
    const formatProps = adaptPropsForAspectRatio(baseProps, format.aspectRatio);
    const outFile = path.join(outDir, `ad_${format.key}_${format.resolution}.mp4`);
    const propsFile = path.join(outDir, `props_${format.key}.json`);

    fs.writeFileSync(propsFile, JSON.stringify(formatProps, null, 2));

    let qaReport: ForensicQaReport;

    if (!dryRun) {
      const normalizedProps = propsFile.replace(/\\/g, "/");
      const normalizedOut = outFile.replace(/\\/g, "/");
      const { entryPoint } = getRemotionEntryPoint();
      const remotionBin = getRemotionBinPath();
      const concurrency = getOptimalRemotionConcurrency(false);

      const renderArgs = remotionBin.endsWith("npx") || remotionBin.endsWith("npx.cmd")
        ? [
            "remotion",
            "render",
            entryPoint,
            format.compositionId,
            normalizedOut,
            `--props=${normalizedProps}`,
            `--concurrency=${concurrency}`,
            "--gl=angle",
            "--pixel-format=yuv420p",
            "--crf=18",
            "--jpeg-quality=95",
            "--bundle-cache=true",
          ]
        : [
            "render",
            entryPoint,
            format.compositionId,
            normalizedOut,
            `--props=${normalizedProps}`,
            `--concurrency=${concurrency}`,
            "--gl=angle",
            "--pixel-format=yuv420p",
            "--crf=18",
            "--jpeg-quality=95",
            "--bundle-cache=true",
          ];

      try {
        const remotionCliJs = path.join(process.cwd(), "node_modules", "@remotion", "cli", "remotion-cli.js");
        if (process.platform === "win32" && remotionBin.endsWith(".cmd") && fs.existsSync(remotionCliJs)) {
          await execFileAsync(process.execPath, [remotionCliJs, ...renderArgs], { cwd: process.cwd() });
        } else {
          await execFileAsync(remotionBin, renderArgs, { cwd: process.cwd() });
        }
        // Run Multimodal QA Gatekeeper on real rendered video
        qaReport = await auditRenderedVideo(outFile, {
          title: productSpec.title,
          scriptText: script.scenes.map((s) => s.voiceoverScript).join(" "),
          aspectRatio: format.aspectRatio,
          channel: format.key === "vertical" ? "tiktok" : format.key === "square" ? "meta" : "youtube",
        });
      } catch (err) {
        console.warn(`[Omnichannel Exporter] Render warning for ${format.key}:`, err);
        qaReport = generateHeuristicQaReport([], {
          title: productSpec.title,
          aspectRatio: format.aspectRatio,
        });
      }
    } else {
      // Dry-run simulated report
      qaReport = generateHeuristicQaReport([], {
        title: productSpec.title,
        aspectRatio: format.aspectRatio,
      });
    }

    if (qaReport.status === "QUARANTINED") {
      allCertified = false;
    }

    videos[format.key] = {
      key: format.key,
      label: format.label,
      aspectRatio: format.aspectRatio,
      compositionId: format.compositionId,
      resolution: format.resolution,
      outputPath: outFile,
      url: `/assets/completed/${path.basename(outFile)}`,
      qaReport,
    };
  }

  // 4. Write master campaign manifest
  const manifestPath = path.join(outDir, "campaign-manifest.json");
  const bundle: OmnichannelCampaignBundle = {
    campaignId,
    productTitle: productSpec.title,
    createdAt: new Date().toISOString(),
    videos,
    package: pkg,
    files: {
      metaCsvPath,
      tiktokCsvPath,
      googlePmaxJsonPath,
      bundleManifestPath: manifestPath,
    },
    overallQaCertified: allCertified,
  };

  fs.writeFileSync(manifestPath, JSON.stringify(bundle, null, 2));

  return bundle;
}
