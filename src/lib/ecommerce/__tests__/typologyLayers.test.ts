import { describe, it, expect } from "vitest";
import { compileAdScript } from "../adCopywriter";
import { ProductSpec } from "@/lib/types/ecommerce";

const BASE_SPEC: ProductSpec = {
  id: "prod_base",
  sourceUrl: "https://example.com/item",
  title: "Universal Base Item",
  vendor: "Universal Co",
  description: "Test description",
  bulletPoints: ["Speedy deployment", "Zero setup required"],
  price: 99.0,
  compareAtPrice: 199.0,
  currency: "USD",
  inStock: true,
  rating: 4.9,
  reviewCount: 480,
  typology: "discrete_object",
  brand: {
    name: "Universal",
    domain: "universal.com",
    logoUrl: null,
    faviconUrl: null,
    appleTouchIconUrl: null,
    primaryColor: "#06b6d4",
    secondaryColor: "#f43f5e",
    surfaceColor: "#09090b",
    toneOfVoice: "playful_hype",
    taglines: [],
  },
  variants: [],
  assets: [
    {
      id: "a1",
      url: "https://example.com/asset.png",
      type: "hero_packshot",
      isPrimary: true,
    },
  ],
  topReviews: [
    {
      id: "r1",
      author: "Alex",
      rating: 5,
      body: "Fantastic experience!",
      verifiedBuyer: true,
    },
  ],
  scrapedAt: new Date().toISOString(),
};

describe("Typology Motion Layers & Copywriting Integration", () => {
  it("compiles digital_saas ad script with device_mockup_screen in Scene 2 and SaaS CTA", () => {
    const saasSpec: ProductSpec = {
      ...BASE_SPEC,
      id: "prod_saas",
      title: "CloudFlow AI Workflow Automation Platform",
      vendor: "CloudFlow",
      typology: "digital_saas",
      typologySpecifics: {
        digitalSaas: {
          platformType: "web",
          freeTrialDays: 14,
          timeSavedMetric: "98% TIME SAVED ⚡ (4h ➔ 15s)",
          integrations: ["Slack", "Stripe", "Shopify", "Zapier"],
        },
      },
    };

    const script = compileAdScript({
      productSpec: saasSpec,
      archetype: "viral_ugc",
      targetChannel: "tiktok_shop",
      durationSeconds: 20,
    });

    expect(script.scenes.length).toBe(5);

    // Scene 1: Hook targeting manual time sink
    expect(script.scenes[0].headline).toContain("Tired of Wasting Hours");
    expect(script.scenes[0].subheadline).toContain("Automate your workflow");

    // Scene 2: 3D Clay Device Mockup & Speedometer
    expect(script.scenes[1].sceneType).toBe("device_mockup_screen");
    expect(script.scenes[1].headline).toBe("Automate Your Entire Workflow");
    expect(script.scenes[1].subheadline).toBe("98% TIME SAVED ⚡ (4h ➔ 15s)");
    expect(script.scenes[1].voiceoverScript).toContain("Automate Your Entire Workflow");

    // Scene 5: Outro Call to Action
    expect(script.callToAction).toBe("START FREE TRIAL • NO CARD NEEDED");
    expect(script.scenes[4].sceneType).toBe("price_promo_outro");
  });

  it("compiles local_service ad script with service_trust_map in Scene 2 and Rapid Dispatch CTA", () => {
    const serviceSpec: ProductSpec = {
      ...BASE_SPEC,
      id: "prod_service",
      title: "Apex Premier 24/7 HVAC & Plumbing Service",
      vendor: "Apex Services",
      typology: "local_service",
      typologySpecifics: {
        localService: {
          serviceAreaCity: "Greater Austin Metro",
          responseTimeMinutes: 30,
          guaranteeYears: 10,
          licensedAndInsured: true,
          googleRating: 4.9,
          googleReviewCount: 520,
        },
      },
    };

    const script = compileAdScript({
      productSpec: serviceSpec,
      archetype: "viral_ugc",
      targetChannel: "tiktok_shop",
      durationSeconds: 20,
    });

    expect(script.scenes.length).toBe(5);

    // Scene 1: Emergency / Rapid Response Hook
    expect(script.scenes[0].headline).toContain("Emergency Repairs");
    expect(script.scenes[0].subheadline).toContain("Dispatched in under 30 minutes");

    // Scene 2: Service Trust Map & Radar Radius
    expect(script.scenes[1].sceneType).toBe("service_trust_map");
    expect(script.scenes[1].headline).toBe("Rapid Same-Day Local Dispatch");
    expect(script.scenes[1].subheadline).toContain("Greater Austin Metro");
    expect(script.scenes[1].voiceoverScript).toContain("Rapid Same-Day Local Dispatch");

    // Scene 5: Call Now CTA
    expect(script.callToAction).toBe("CALL NOW • SAME DAY BOOKING");
  });
});
