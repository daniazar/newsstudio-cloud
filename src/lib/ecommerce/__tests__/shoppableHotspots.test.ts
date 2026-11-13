/**
 * src/lib/ecommerce/__tests__/shoppableHotspots.test.ts
 *
 * Unit tests for Interactive Shoppable Hotspot & Web Video Embed Suite.
 */

import { describe, it, expect } from "vitest";
import {
  generateDefaultHotspots,
  computeActiveHotspots,
  compileHotspotEmbedHtml,
} from "../shoppableHotspots";
import { generateShoppableEmbed } from "../embedGenerator";
import { ProductSpec, ShoppableHotspot } from "@/lib/types/ecommerce";

const MOCK_PRODUCT_WITH_VARIANTS: ProductSpec = {
  id: "prod_variants_1",
  sourceUrl: "https://myshop.com/products/wireless-earbuds",
  title: "AeroBuds Pro Max",
  vendor: "SoundCore",
  description: "Studio-grade wireless earbuds with active noise cancellation.",
  bulletPoints: [
    "Hybrid Active Noise Cancellation up to 45dB",
    "48-hour continuous battery life with charging case",
    "IPX7 military-grade waterproof rating",
  ],
  price: 79.99,
  compareAtPrice: 129.99,
  currency: "USD",
  inStock: true,
  typology: "discrete_object",
  brand: {
    name: "SoundCore",
    domain: "soundcore.io",
    logoUrl: null,
    faviconUrl: null,
    appleTouchIconUrl: null,
    primaryColor: "#10b981",
    secondaryColor: "#06b6d4",
    surfaceColor: "#09090b",
    toneOfVoice: "authoritative_clinical",
    taglines: [],
  },
  variants: [
    { id: "var_black_01", title: "Matte Black Edition", price: 79.99, available: true },
    { id: "var_white_02", title: "Arctic White Edition", price: 79.99, available: true },
  ],
  assets: [
    { id: "a1", url: "https://soundcore.io/hero.jpg", type: "hero_packshot", isPrimary: true },
  ],
  topReviews: [],
  scrapedAt: new Date().toISOString(),
};

const MOCK_PRODUCT_NO_VARIANTS: ProductSpec = {
  id: "prod_no_var",
  sourceUrl: "https://myshop.com/products/oak-flooring",
  title: "European White Oak Planks",
  vendor: "NordicWood",
  description: "Engineered ultra-wide oak flooring.",
  bulletPoints: ["100% Water Resistant Core", "Scratch-Proof Diamond Finish"],
  price: 6.49,
  currency: "USD",
  inStock: true,
  typology: "surface_material",
  brand: {
    name: "NordicWood",
    domain: "nordicwood.com",
    logoUrl: null,
    faviconUrl: null,
    appleTouchIconUrl: null,
    primaryColor: "#f59e0b",
    secondaryColor: "#84cc16",
    surfaceColor: "#09090b",
    toneOfVoice: "minimalist_luxury",
    taglines: [],
  },
  variants: [],
  assets: [{ id: "a2", url: "https://nordicwood.com/floor.jpg", type: "lifestyle_context" }],
  topReviews: [],
  scrapedAt: new Date().toISOString(),
};

describe("Shoppable Hotspots Engine", () => {
  describe("generateDefaultHotspots", () => {
    it("creates variant-based hotspots with sequential frame ranges when variants exist", () => {
      const config = generateDefaultHotspots(MOCK_PRODUCT_WITH_VARIANTS);

      expect(config.enabled).toBe(true);
      expect(config.hotspots.length).toBe(2);

      const [h1, h2] = config.hotspots;
      expect(h1.title).toBe("Matte Black Edition");
      expect(h1.variantId).toBe("var_black_01");
      expect(h1.price).toBe(79.99);
      expect(h1.startFrame).toBe(90); // Starts at 3.0s (packshot reveal)
      expect(h1.durationFrames).toBe(180);

      expect(h2.title).toBe("Arctic White Edition");
      expect(h2.variantId).toBe("var_white_02");
      expect(h2.startFrame).toBe(180); // Sequentially follows h1
      expect(h2.x).toBeGreaterThan(0);
      expect(h2.y).toBeGreaterThan(0);
    });

    it("creates feature-based hotspots when no variants exist", () => {
      const config = generateDefaultHotspots(MOCK_PRODUCT_NO_VARIANTS);

      expect(config.enabled).toBe(true);
      expect(config.hotspots.length).toBe(2);

      const [f1, f2] = config.hotspots;
      expect(f1.title).toBe("100% Water Resistant Core");
      expect(f1.price).toBe(6.49);
      expect(f2.title).toBe("Scratch-Proof Diamond Finish");
    });

    it("falls back to default features if no variants and no bullet points exist", () => {
      const emptyProduct: ProductSpec = {
        ...MOCK_PRODUCT_NO_VARIANTS,
        bulletPoints: [],
        variants: [],
      };
      const config = generateDefaultHotspots(emptyProduct);

      expect(config.hotspots.length).toBe(2);
      expect(config.hotspots[0].title).toBe("Premium Engineering");
      expect(config.hotspots[0].price).toBe(6.49);
    });
  });

  describe("computeActiveHotspots", () => {
    const testHotspots: ShoppableHotspot[] = [
      {
        id: "hot_1",
        x: 35,
        y: 40,
        title: "Pin 1",
        price: 29.99,
        startFrame: 90,
        durationFrames: 60, // 90 to 149
      },
      {
        id: "hot_2",
        x: 65,
        y: 55,
        title: "Pin 2",
        price: 39.99,
        startFrame: 150,
        durationFrames: 90, // 150 to 239
      },
    ];

    it("returns empty array when playhead is before start frame", () => {
      const active = computeActiveHotspots(testHotspots, 45);
      expect(active).toHaveLength(0);
    });

    it("returns active hotspot when playhead is inside frame window", () => {
      const activeAt100 = computeActiveHotspots(testHotspots, 100);
      expect(activeAt100).toHaveLength(1);
      expect(activeAt100[0].id).toBe("hot_1");

      const activeAt180 = computeActiveHotspots(testHotspots, 180);
      expect(activeAt180).toHaveLength(1);
      expect(activeAt180[0].id).toBe("hot_2");
    });

    it("returns empty array after all hotspots have completed", () => {
      const active = computeActiveHotspots(testHotspots, 300);
      expect(active).toHaveLength(0);
    });

    it("handles concurrent/overlapping hotspots", () => {
      const overlapping: ShoppableHotspot[] = [
        { id: "a", x: 20, y: 20, title: "A", startFrame: 90, durationFrames: 100 },
        { id: "b", x: 80, y: 80, title: "B", startFrame: 120, durationFrames: 100 },
      ];
      const activeAt140 = computeActiveHotspots(overlapping, 140);
      expect(activeAt140).toHaveLength(2);
      expect(activeAt140.map((h) => h.id)).toEqual(["a", "b"]);
    });
  });

  describe("compileHotspotEmbedHtml", () => {
    it("compiles responsive DOM elements with radar pulses and timeupdate listener", () => {
      const hotspots: ShoppableHotspot[] = [
        {
          id: "pin_01",
          x: 42,
          y: 48,
          title: "Sonic ANC Pods",
          price: 79.99,
          variantId: "var_test_99",
          startFrame: 90,
          durationFrames: 120,
        },
      ];

      const html = compileHotspotEmbedHtml(hotspots, "test-container-id", "#10b981", 30);

      // Verify DOM container and hotspot element
      expect(html).toContain("test-container-id-hotspots-layer");
      expect(html).toContain("ruby-hotspot-pin");
      expect(html).toContain("ruby-hotspot-tag");
      expect(html).toContain('"id":"pin_01"');
      expect(html).toContain('"variantId":"var_test_99"');
      expect(html).toContain("Sonic ANC Pods");
      expect(html).toContain("$79.99");

      // Verify percentage coordinates in JSON
      expect(html).toContain('"x":42');
      expect(html).toContain('"y":48');

      // Verify radar ripple styles
      expect(html).toContain("ruby-pulse-wave");

      // Verify time synchronization script (90 frames @ 30fps = 3s, 120 frames = 4s duration -> 7s)
      expect(html).toContain('"startSec":3');
      expect(html).toContain('"endSec":7');
      expect(html).toContain("timeupdate");
      expect(html).toContain("test-container-id-cart-btn");
    });

    it("returns empty string if hotspots list is empty", () => {
      expect(compileHotspotEmbedHtml([], "#000", "USD")).toBe("");
    });
  });

  describe("generateShoppableEmbed integration", () => {
    it("embeds hotspot overlay and scripts when hotspots are passed in options", () => {
      const hotspots: ShoppableHotspot[] = [
        {
          id: "pin_integration",
          x: 50,
          y: 50,
          title: "Special Edition",
          price: 99.0,
          variantId: "var_special_1",
          startFrame: 60,
          durationFrames: 90,
        },
      ];

      const embedHtml = generateShoppableEmbed(MOCK_PRODUCT_WITH_VARIANTS, {
        videoUrl: "https://cdn.myshop.com/ad.mp4",
        aspectRatio: "9:16",
        hotspots,
      });

      expect(embedHtml).toContain("hotspots-layer");
      expect(embedHtml).toContain("Special Edition");
      expect(embedHtml).toContain('"id":"pin_integration"');
      expect(embedHtml).toContain('"startSec":2'); // 60 / 30fps = 2s
      expect(embedHtml).toContain('"endSec":5');   // (60 + 90) / 30fps = 5s
      expect(embedHtml).toContain("ruby-hotspot-pin");
    });
  });
});
