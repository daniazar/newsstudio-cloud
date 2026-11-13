import { describe, it, expect } from "vitest";
import { generateViralHooks, applyHookToScript } from "../hookGenerator";
import { compileAdScript } from "../adCopywriter";
import { ProductSpec } from "@/lib/types/ecommerce";

const mockEarbuds: ProductSpec = {
  id: "test-earbuds",
  sourceUrl: "https://soniqaudio.com/products/earbuds",
  title: "AeroBuds Pro Active Noise Cancelling Spatial Wireless Earbuds",
  vendor: "Soniq Audio",
  description: "Flagship spatial audio earbuds with 48dB hybrid active noise cancellation.",
  price: 79.99,
  currency: "USD",
  inStock: true,
  rating: 4.8,
  reviewCount: 400,
  typology: "discrete_object",
  brand: {
    name: "Soniq Audio",
    domain: "soniqaudio.com",
    logoUrl: null,
    faviconUrl: null,
    appleTouchIconUrl: null,
    primaryColor: "#06b6d4",
    secondaryColor: "#3b82f6",
    surfaceColor: "#09090b",
    toneOfVoice: "playful_hype",
    taglines: ["Pure Studio Sound"],
  },
  bulletPoints: ["48dB Hybrid Active Noise Cancellation", "Spatial Audio"],
  variants: [],
  assets: [],
  topReviews: [],
  scrapedAt: new Date().toISOString(),
};

const mockFlooring: ProductSpec = {
  ...mockEarbuds,
  id: "test-flooring",
  title: "Scandinavian White Oak Engineered Hardwood",
  vendor: "Lumina Hardwood Co.",
  typology: "surface_material",
  bulletPoints: ["100% Waterproof Click-Lock", "AC4 Commercial Rating"],
};

describe("hookGenerator Unit Tests", () => {
  it("generates exactly 8 viral hook variants", () => {
    const hooks = generateViralHooks(mockEarbuds);
    expect(hooks).toHaveLength(8);

    const formulas = hooks.map((h) => h.formula);
    expect(formulas).toContain("negative_fomo");
    expect(formulas).toContain("curiosity_gap");
    expect(formulas).toContain("us_vs_them");
    expect(formulas).toContain("tiktok_viral");
    expect(formulas).toContain("industry_secret");
    expect(formulas).toContain("shocking_stat");
    expect(formulas).toContain("before_after_reveal");
    expect(formulas).toContain("pain_point_relief");
  });

  it("adapts industry secret hook specifically for surface materials", () => {
    const hooks = generateViralHooks(mockFlooring);
    const secretHook = hooks.find((h) => h.formula === "industry_secret");
    expect(secretHook?.headline).toContain("Flooring Hack Contractors");
  });

  it("applies selected hook to Scene 1 of an AdScript without corrupting other scenes", () => {
    const baseScript = compileAdScript({
      productSpec: mockEarbuds,
      archetype: "viral_ugc",
    });

    const initialScene2Headline = baseScript.scenes[1]?.headline;
    const hooks = generateViralHooks(mockEarbuds);
    const chosenHook = hooks.find((h) => h.formula === "negative_fomo")!;

    const updatedScript = applyHookToScript(baseScript, chosenHook);

    expect(updatedScript.hookHeadline).toBe(chosenHook.headline);
    expect(updatedScript.scenes[0].headline).toBe(chosenHook.headline);
    expect(updatedScript.scenes[0].voiceoverScript).toBe(chosenHook.voiceoverScript);
    expect(updatedScript.scenes[0].sfxTag).toBe(chosenHook.sfxTag);

    // Verify Scene 2 was untouched
    expect(updatedScript.scenes[1].headline).toBe(initialScene2Headline);
  });
});
