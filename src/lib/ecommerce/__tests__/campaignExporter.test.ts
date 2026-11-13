import { describe, it, expect } from "vitest";
import {
  generateUtmUrl,
  generateMetaAdsCsv,
  generateTikTokAdsCsv,
  generateGooglePMaxAssets,
  generateCompleteCampaignPackage,
} from "../campaignExporter";
import { ProductSpec, AdScript } from "@/lib/types/ecommerce";

const mockProduct: ProductSpec = {
  id: "prod-test-101",
  sourceUrl: "https://store.example.com/products/graphene-earbuds",
  title: "AeroBuds Pro Wireless ANC Earbuds (Gen 2)",
  vendor: "Soniq Labs",
  description: "Next-generation true wireless earbuds featuring 48dB active noise cancellation.",
  price: 79.99,
  compareAtPrice: 119.99,
  currency: "USD",
  inStock: true,
  rating: 4.8,
  reviewCount: 412,
  typology: "discrete_object",
  brand: {
    name: "Soniq Labs",
    domain: "soniqlabs.com",
    logoUrl: null,
    faviconUrl: null,
    appleTouchIconUrl: null,
    primaryColor: "#06b6d4",
    secondaryColor: "#3b82f6",
    surfaceColor: "#09090b",
    toneOfVoice: "playful_hype",
    taglines: [],
  },
  bulletPoints: [
    "48dB Hybrid Active Noise Cancellation with Transparency",
    "Custom 11mm Graphene Drivers with Spatial Surround",
    "40-Hour Extended Battery Case with Fast Qi Charging",
  ],
  variants: [],
  assets: [],
  topReviews: [],
  scrapedAt: new Date().toISOString(),
};

const mockScript: AdScript = {
  id: "script-mock-1",
  archetype: "viral_ugc",
  targetChannel: "tiktok_shop",
  aspectRatio: "9:16",
  durationSeconds: 20,
  totalFrames: 600,
  fps: 30,
  hookHeadline: "Stop Scrolling If You Still Use Cheap Earbuds!",
  callToAction: "Shop Now",
  scenes: [],
};

describe("campaignExporter Unit Tests", () => {
  it("generates correct parameterized UTM URLs for all platforms", () => {
    const metaUrl = generateUtmUrl(mockProduct.sourceUrl, "meta", "AeroBuds Launch");
    expect(metaUrl).toContain("utm_source=facebook");
    expect(metaUrl).toContain("utm_medium=paid_video");
    expect(metaUrl).toContain("utm_campaign=aerobuds-launch");

    const tiktokUrl = generateUtmUrl(mockProduct.sourceUrl, "tiktok", "AeroBuds Launch");
    expect(tiktokUrl).toContain("utm_source=tiktok");
    expect(tiktokUrl).toContain("utm_medium=paid_video");

    const googleUrl = generateUtmUrl(mockProduct.sourceUrl, "google_pmax", "AeroBuds Launch");
    expect(googleUrl).toContain("utm_source=google");
    expect(googleUrl).toContain("utm_medium=cpc");
  });

  it("generates valid Meta Ads Manager bulk-import CSV with RFC-4180 escaping", () => {
    const csv = generateMetaAdsCsv(mockProduct, mockScript);
    const lines = csv.split("\n");
    expect(lines.length).toBe(2);

    const headers = lines[0].split(",");
    expect(headers).toContain('"Campaign Name"');
    expect(headers).toContain('"Campaign Objective"');
    expect(headers).toContain('"Call to Action"');
    expect(headers).toContain('"Title 1"');

    expect(lines[1]).toContain('"OUTCOME_SALES"');
    expect(lines[1]).toContain('"SHOP_NOW"');
    expect(lines[1]).toContain("facebook");
  });

  it("generates valid TikTok Ads Manager bulk-upload CSV", () => {
    const csv = generateTikTokAdsCsv(mockProduct, mockScript);
    const lines = csv.split("\n");
    expect(lines.length).toBe(2);

    expect(lines[0]).toContain('"Campaign Name"');
    expect(lines[0]).toContain('"Landing Page URL"');
    expect(lines[1]).toContain('"Conversions"');
    expect(lines[1]).toContain('"Shop Now"');
    expect(lines[1]).toContain("#tiktokshop");
  });

  it("enforces strict Google Performance Max character limits", () => {
    const pmax = generateGooglePMaxAssets(mockProduct, mockScript);

    expect(pmax.businessName.length).toBeLessThanOrEqual(25);

    expect(pmax.shortHeadlines.length).toBeGreaterThan(0);
    for (const h of pmax.shortHeadlines) {
      expect(h.length).toBeLessThanOrEqual(30);
    }

    expect(pmax.longHeadlines.length).toBeGreaterThan(0);
    for (const lh of pmax.longHeadlines) {
      expect(lh.length).toBeLessThanOrEqual(90);
    }

    expect(pmax.descriptions.length).toBeGreaterThan(0);
    for (const desc of pmax.descriptions) {
      expect(desc.length).toBeLessThanOrEqual(90);
    }

    expect(pmax.finalUrl).toContain("utm_source=google");
  });

  it("assembles complete campaign package bundle", () => {
    const bundle = generateCompleteCampaignPackage(mockProduct, mockScript);
    expect(bundle.metaCsv).toBeDefined();
    expect(bundle.tiktokCsv).toBeDefined();
    expect(bundle.googlePmax).toBeDefined();
    expect(bundle.utmUrls.meta).toContain("utm_source=facebook");
    expect(bundle.utmUrls.tiktok).toContain("utm_source=tiktok");
    expect(bundle.utmUrls.google_pmax).toContain("utm_source=google");
  });
});
