/**
 * src/lib/ecommerce/__tests__/adLocalizer.test.ts
 *
 * Unit tests for 1-Click Multilingual Product Ad Matrix Engine.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  MARKET_PROFILES,
  convertPrice,
  formatLocalizedPrice,
  translateAdText,
  localizeProductSpec,
  localizeAdScript,
  localizeAdCampaign,
} from "../adLocalizer";
import { ProductSpec, AdScript } from "@/lib/types/ecommerce";

const generateLlmTextMock = vi.fn();

vi.mock("@/lib/llm/aiSdkGateway", () => ({
  generateLlmText: (...args: unknown[]) => generateLlmTextMock(...args),
}));

const mockProduct: ProductSpec = {
  id: "prod-loc-1",
  sourceUrl: "https://store.example.com/products/wireless-earbuds",
  title: "AeroBuds Pro Active Noise Cancelling Earbuds",
  vendor: "Soniq Labs",
  description: "Next-generation true wireless bluetooth earbuds with 48dB active noise cancellation.",
  price: 79.99,
  compareAtPrice: 119.99,
  currency: "USD",
  inStock: true,
  rating: 4.8,
  reviewCount: 420,
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
    "48dB Hybrid Active Noise Cancellation",
    "Custom 11mm Graphene Drivers",
    "40-Hour Extended Battery Case",
  ],
  variants: [],
  assets: [],
  topReviews: [],
  scrapedAt: new Date().toISOString(),
};

const mockScript: AdScript = {
  id: "script-loc-1",
  archetype: "viral_ugc",
  targetChannel: "tiktok_shop",
  aspectRatio: "9:16",
  durationSeconds: 15,
  totalFrames: 450,
  fps: 30,
  hookHeadline: "[urgent] Stop Scrolling If You Still Use Cheap Earbuds!",
  callToAction: "Shop Now",
  scenes: [
    {
      id: "scene-0",
      sceneIndex: 0,
      startFrame: 0,
      durationFrames: 90,
      sceneType: "pattern_interrupt_hook",
      headline: "Stop Scrolling If You Still Use Cheap Earbuds!",
      subheadline: "Meet the new AeroBuds Pro",
      visualActionPrompt: "Presenter holds earbuds",
      primaryMediaUrl: "https://cdn.example.com/hero.jpg",
      voiceoverScript: "[urgent] Stop scrolling! If your earbuds sound tinny, you need to hear this.",
      featureBadgeText: "48dB ANC",
    },
    {
      id: "scene-1",
      sceneIndex: 1,
      startFrame: 90,
      durationFrames: 90,
      sceneType: "price_promo_outro",
      headline: "Claim 33% Off Today Only",
      subheadline: "Free Express Shipping Included",
      visualActionPrompt: "Price strike-through animation",
      primaryMediaUrl: "https://cdn.example.com/outro.jpg",
      voiceoverScript: "[excited] Tap below to grab yours before we sell out completely!",
      featureBadgeText: "LIMITED TIME OFFER",
    },
  ],
};

describe("1-Click Multilingual Product Ad Matrix Engine", () => {
  describe("Market Profiles & Currencies", () => {
    it("provides 8 global market profiles with valid exchange rates and locales", () => {
      const markets = Object.keys(MARKET_PROFILES);
      expect(markets.length).toBe(8);

      expect(MARKET_PROFILES.en_us.currency).toBe("USD");
      expect(MARKET_PROFILES.de_de.currency).toBe("EUR");
      expect(MARKET_PROFILES.en_gb.currency).toBe("GBP");
      expect(MARKET_PROFILES.pt_br.currency).toBe("BRL");
      expect(MARKET_PROFILES.ja_jp.currency).toBe("JPY");
    });

    it("converts USD prices to market currencies accurately", () => {
      const priceUsd = 100.0;

      const eur = convertPrice(priceUsd, "de_de");
      expect(eur).toBe(92.0);

      const gbp = convertPrice(priceUsd, "en_gb");
      expect(gbp).toBe(79.0);

      const brl = convertPrice(priceUsd, "pt_br");
      expect(brl).toBe(520.0);

      const jpy = convertPrice(priceUsd, "ja_jp");
      expect(jpy).toBe(15200);
    });

    it("formats localized prices respecting national standards and separators", () => {
      expect(formatLocalizedPrice(79.99, "en_us")).toBe("$79.99");
      expect(formatLocalizedPrice(73.59, "de_de")).toBe("73,59 €");
      expect(formatLocalizedPrice(73.59, "fr_fr")).toBe("73,59 €");
      expect(formatLocalizedPrice(63.19, "en_gb")).toBe("£63.19");
      expect(formatLocalizedPrice(415.95, "pt_br")).toBe("R$ 415,95");
      expect(formatLocalizedPrice(12200, "ja_jp")).toBe("¥12,200");
    });
  });

  beforeEach(() => {
    generateLlmTextMock.mockReset();
    generateLlmTextMock.mockImplementation(async ({ prompt }: { prompt?: string }) => {
      const clean = (prompt || "").replace(/^Text to translate:\s*/i, "").trim();
      const tagMatch = clean.match(/^(\[[^\]]+\]\s*)/);
      const tag = tagMatch ? tagMatch[1] : "";
      const content = clean.replace(/^(\[[^\]]+\]\s*)/, "");
      return {
        text: `${tag}¡Atención! ${content}`,
        providerUsed: "gemini",
        modelUsed: "gemini-2.5-flash",
      };
    });
  });

  describe("Script & Copy Translation", () => {
    it("preserves leading square bracket audio tags while translating", async () => {
      const text = "[urgent] Don't miss this limited offer!";
      const translated = await translateAdText(text, "es_latam");

      expect(translated.startsWith("[urgent]")).toBe(true);
      expect(translated).toContain("¡Atención!");
      expect(generateLlmTextMock).toHaveBeenCalledTimes(1);
      const callArgs = generateLlmTextMock.mock.calls[0][0];
      expect(callArgs.allowFallback).toBe(true);
    });

    it("falls back to deterministic dictionary when LLM fails", async () => {
      generateLlmTextMock.mockRejectedValueOnce(new Error("LLM failure"));
      const text = "[urgent] Don't miss this limited offer!";
      const translated = await translateAdText(text, "es_latam");
      expect(translated.startsWith("[urgent]")).toBe(true);
      expect(translated).toContain("¡Atención! Descubrí el nuevo");
    });

    it("translates CTA button per market", () => {
      expect(MARKET_PROFILES.en_us.ctaTranslation).toBe("Shop Now");
      expect(MARKET_PROFILES.es_latam.ctaTranslation).toBe("Comprar Ahora");
      expect(MARKET_PROFILES.de_de.ctaTranslation).toBe("Jetzt Kaufen");
      expect(MARKET_PROFILES.fr_fr.ctaTranslation).toBe("Acheter Maintenant");
      expect(MARKET_PROFILES.pt_br.ctaTranslation).toBe("Comprar Já");
      expect(MARKET_PROFILES.ja_jp.ctaTranslation).toBe("今すぐ購入");
    });
  });

  describe("ProductSpec & AdScript Localization", () => {
    it("localizes product price and currency without mutating original", () => {
      const germanProduct = localizeProductSpec(mockProduct, "de_de");

      expect(germanProduct.currency).toBe("EUR");
      expect(germanProduct.price).toBe(Number((79.99 * 0.92).toFixed(2)));
      expect(germanProduct.compareAtPrice).toBe(Number((119.99 * 0.92).toFixed(2)));

      // Original unchanged
      expect(mockProduct.currency).toBe("USD");
      expect(mockProduct.price).toBe(79.99);
    });

    it("localizes ad script scenes and hook headline", async () => {
      const germanScript = await localizeAdScript(mockScript, "de_de");

      expect(germanScript.callToAction).toBe("Jetzt Kaufen");
      expect(germanScript.hookHeadline).toBeDefined();
      expect(germanScript.scenes.length).toBe(2);

      // Voiceover tags preserved
      expect(germanScript.scenes[0].voiceoverScript).toContain("[urgent]");
    });
  });

  describe("Full Campaign Matrix Assembly", () => {
    it("assembles complete multilingual bundle across requested markets", async () => {
      const bundle = await localizeAdCampaign(mockProduct, mockScript, [
        "en_us",
        "de_de",
        "pt_br",
        "ja_jp",
      ]);

      expect(bundle.baseProduct.title).toBe(mockProduct.title);
      expect(Object.keys(bundle.markets).length).toBe(4);

      // Verify German market deliverable
      const de = bundle.markets.de_de;
      expect(de.marketKey).toBe("de_de");
      expect(de.productSpec.currency).toBe("EUR");
      expect(de.formattedPrice).toContain("€");
      expect(de.ctaText).toBe("Jetzt Kaufen");
      expect(de.voiceId).toBe("marlene");

      // Verify Brazilian market deliverable
      const br = bundle.markets.pt_br;
      expect(br.productSpec.currency).toBe("BRL");
      expect(br.formattedPrice).toContain("R$");
      expect(br.ctaText).toBe("Comprar Já");
      expect(br.voiceId).toBe("fabiana");

      // Verify Japanese market deliverable
      const jp = bundle.markets.ja_jp;
      expect(jp.productSpec.currency).toBe("JPY");
      expect(jp.formattedPrice).toContain("¥");
      expect(jp.ctaText).toBe("今すぐ購入");
      expect(jp.voiceId).toBe("sakura");
    });
  });
});
