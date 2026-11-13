/**
 * src/lib/ecommerce/campaignExporter.ts
 *
 * Multi-Platform Campaign Exporter for Ruby E-Commerce Studio.
 * Generates parameterized UTM links, Meta Ads Manager bulk-import CSVs,
 * TikTok Ads Manager bulk-upload CSVs, and Google Performance Max asset groups.
 */

import { ProductSpec, AdScript } from "@/lib/types/ecommerce";

export type CampaignPlatform = "meta" | "tiktok" | "google_pmax";

export interface CampaignBundleOptions {
  campaignName?: string;
  promoCode?: string;
  targetAudience?: string;
  videoFileName?: string;
}

export interface GooglePMaxAssetGroup {
  businessName: string;
  shortHeadlines: string[]; // max 30 chars each
  longHeadlines: string[];  // max 90 chars each
  descriptions: string[];   // max 90 chars each
  finalUrl: string;
}

export interface CampaignPackage {
  metaCsv: string;
  tiktokCsv: string;
  googlePmax: GooglePMaxAssetGroup;
  utmUrls: Record<CampaignPlatform, string>;
}

/**
 * Escapes a string according to RFC-4180 CSV specifications.
 */
function csvEscape(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Generates a clean URL slug from product title or custom name.
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 40);
}

/**
 * Appends standard UTM marketing tags to a destination URL.
 */
export function generateUtmUrl(
  baseUrl: string,
  platform: CampaignPlatform,
  campaignName: string
): string {
  const cleanBase = baseUrl || "https://example.com/product";
  const url = new URL(cleanBase);
  const slug = slugify(campaignName);

  url.searchParams.set("utm_source", platform === "meta" ? "facebook" : platform === "tiktok" ? "tiktok" : "google");
  url.searchParams.set("utm_medium", platform === "google_pmax" ? "cpc" : "paid_video");
  url.searchParams.set("utm_campaign", slug || "ruby_ecommerce_ad");
  url.searchParams.set("utm_content", "short_form_ugc");

  return url.toString();
}

/**
 * Generates Meta Ads Manager bulk-import CSV.
 */
export function generateMetaAdsCsv(
  product: ProductSpec,
  script: AdScript,
  options: CampaignBundleOptions = {}
): string {
  const campaignName = options.campaignName || `${product.vendor || "Brand"} - ${product.title.slice(0, 30)} - Sales`;
  const adSetName = `${campaignName} - Broad UGC`;
  const adName = `${slugify(product.title)} - ${script.archetype.toUpperCase()} - 9x16`;
  const videoFile = options.videoFileName || `${slugify(product.title)}-ad.mp4`;
  const landingUrl = generateUtmUrl(product.sourceUrl, "meta", campaignName);

  const displayUrl = product.brand?.domain || (product.sourceUrl ? new URL(product.sourceUrl).hostname : "brand.com");

  // Generate 5 dynamic headlines from script and specs
  const titles = [
    script.hookHeadline || product.title.slice(0, 40),
    product.compareAtPrice
      ? `Save ${Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)}% Today Only`
      : `Get Commercial Grade ${product.title.slice(0, 25)}`,
    product.bulletPoints[0]?.slice(0, 40) || "Over 10,000+ Happy Customers",
    `100% Guaranteed Durability`,
    `Shop Direct & Save`,
  ];

  // Primary text body
  const bodyText = `${script.hookHeadline} Discover why thousands are switching to ${product.vendor || "our brand"}. ${
    product.bulletPoints.slice(0, 2).map((b) => `✓ ${b}`).join(" ")
  } Tap below to claim your offer before stock runs out!`;

  const headers = [
    "Campaign Name",
    "Campaign Objective",
    "Buying Type",
    "Ad Set Name",
    "Ad Name",
    "Title 1",
    "Title 2",
    "Title 3",
    "Title 4",
    "Title 5",
    "Body",
    "Call to Action",
    "Link URL",
    "Display URL",
    "Video File Name",
  ];

  const row = [
    campaignName,
    "OUTCOME_SALES",
    "AUCTION",
    adSetName,
    adName,
    titles[0],
    titles[1],
    titles[2],
    titles[3],
    titles[4],
    bodyText,
    "SHOP_NOW",
    landingUrl,
    displayUrl,
    videoFile,
  ];

  return `${headers.map(csvEscape).join(",")}\n${row.map(csvEscape).join(",")}`;
}

/**
 * Generates TikTok Ads Manager bulk-upload CSV.
 */
export function generateTikTokAdsCsv(
  product: ProductSpec,
  script: AdScript,
  options: CampaignBundleOptions = {}
): string {
  const campaignName = options.campaignName || `${product.vendor || "Brand"} - TikTok Shop - ${product.title.slice(0, 25)}`;
  const adGroupName = `${campaignName} - Auto Target`;
  const adName = `${slugify(product.title)} - TikTok Ad`;
  const videoFile = options.videoFileName || `${slugify(product.title)}-tiktok.mp4`;
  const landingUrl = generateUtmUrl(product.sourceUrl, "tiktok", campaignName);

  // TikTok short punchy caption with viral hashtags
  const adText = `${script.hookHeadline} 🔥 Honest review of the viral ${product.title.slice(0, 30)}! #tiktokshop #review #deal #fyp`;

  const headers = [
    "Campaign Name",
    "Campaign Objective",
    "Ad Group Name",
    "Ad Name",
    "Ad Text",
    "Call to Action",
    "Landing Page URL",
    "Video Name",
  ];

  const row = [
    campaignName,
    "Conversions",
    adGroupName,
    adName,
    adText,
    "Shop Now",
    landingUrl,
    videoFile,
  ];

  return `${headers.map(csvEscape).join(",")}\n${row.map(csvEscape).join(",")}`;
}

/**
 * Truncates a string cleanly at the last word boundary before maxLength.
 */
function cleanTruncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  return lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated;
}

/**
 * Generates Google Performance Max Asset Group Copy obeying strict character limits:
 * - Short Headlines: max 30 characters
 * - Long Headlines: max 90 characters
 * - Descriptions: max 90 characters
 * - Business Name: max 25 characters
 */
export function generateGooglePMaxAssets(
  product: ProductSpec,
  script: AdScript,
  options: CampaignBundleOptions = {}
): GooglePMaxAssetGroup {
  const campaignName = options.campaignName || product.title;
  const finalUrl = generateUtmUrl(product.sourceUrl, "google_pmax", campaignName);

  const businessName = cleanTruncate(product.brand?.name || product.vendor || "Ruby Store", 25);

  // Short Headlines (<= 30 characters)
  const shortHeadlines = [
    cleanTruncate(product.title, 30),
    cleanTruncate(script.hookHeadline || "Exclusive Deals Online", 30),
    cleanTruncate(`Direct From ${businessName}`, 30),
    cleanTruncate(product.bulletPoints[0] || "100% Satisfaction Guarantee", 30),
    cleanTruncate("Shop Official Store", 30),
  ].filter((h) => h.length > 0 && h.length <= 30);

  // Long Headlines (<= 90 characters)
  const longHeadlines = [
    cleanTruncate(`${script.hookHeadline || product.title} - Certified Quality Direct to You`, 90),
    cleanTruncate(`Upgrade Your Setup with ${product.title} - Order Today & Save`, 90),
  ];

  // Descriptions (<= 90 characters)
  const descriptions = [
    cleanTruncate(product.description || `${script.hookHeadline} Guaranteed fast dispatch and warranty.`, 90),
    cleanTruncate(
      product.bulletPoints.length > 0
        ? `${product.bulletPoints[0]} - Engineered for long-term everyday performance.`
        : "Engineered for maximum reliability and value.",
      90
    ),
  ];

  return {
    businessName,
    shortHeadlines,
    longHeadlines,
    descriptions,
    finalUrl,
  };
}

/**
 * Assembles a complete multi-platform campaign package.
 */
export function generateCompleteCampaignPackage(
  product: ProductSpec,
  script: AdScript,
  options: CampaignBundleOptions = {}
): CampaignPackage {
  const campaignName = options.campaignName || product.title;

  return {
    metaCsv: generateMetaAdsCsv(product, script, options),
    tiktokCsv: generateTikTokAdsCsv(product, script, options),
    googlePmax: generateGooglePMaxAssets(product, script, options),
    utmUrls: {
      meta: generateUtmUrl(product.sourceUrl, "meta", campaignName),
      tiktok: generateUtmUrl(product.sourceUrl, "tiktok", campaignName),
      google_pmax: generateUtmUrl(product.sourceUrl, "google_pmax", campaignName),
    },
  };
}
