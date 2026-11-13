/**
 * src/lib/ecommerce/__tests__/ecommerceHarvester.test.ts
 *
 * Unit tests for Ruby E-Commerce Harvester & Typology Engine.
 * Tests offline parsing of Shopify JSON, JSON-LD metadata,
 * Brand DNA extraction, and classification across the 7 Typologies.
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { parseShopifyProductJson, upgradeShopifyImageUrl } from "../parsers/shopifyParser";
import { parseHtmlMetadata } from "../parsers/jsonLdParser";
import { classifyProductTypology } from "../typologyClassifier";
import { harvestBrandDNA } from "../brandHarvester";

const FIXTURES_DIR = path.join(__dirname, "fixtures");

describe("E-Commerce Harvester & Typology Suite", () => {
  describe("Shopify Direct JSON Parser", () => {
    it("correctly parses flooring JSON fixture into standardized ProductSpec", () => {
      const rawJson = JSON.parse(
        fs.readFileSync(path.join(FIXTURES_DIR, "flooring_fixture.json"), "utf8")
      );

      const result = parseShopifyProductJson(
        rawJson,
        "https://luxefloor.com/products/natural-european-white-oak-engineered-hardwood"
      );

      expect(result.isShopify).toBe(true);
      expect(result.domain).toBe("luxefloor.com");

      const spec = result.parsedSpec!;
      expect(spec.title).toBe("Natural European White Oak Engineered Hardwood Flooring");
      expect(spec.vendor).toBe("LuxeFloor Co");
      expect(spec.price).toBe(89.99);
      expect(spec.compareAtPrice).toBe(129.99);
      expect(spec.variants?.length).toBe(1);
      expect(spec.bulletPoints?.length).toBeGreaterThanOrEqual(3);
      expect(spec.bulletPoints?.[0]).toContain("100% Waterproof");

      // Verify image upgrade from _large.jpg
      expect(spec.assets?.[0].url).not.toContain("_large.jpg");
      expect(spec.assets?.[0].url).toContain("oak_plank.jpg");
      expect(spec.assets?.[0].type).toBe("hero_packshot");
    });

    it("correctly parses electronics/earbuds fixture with multi-variants", () => {
      const rawJson = JSON.parse(
        fs.readFileSync(path.join(FIXTURES_DIR, "earbuds_fixture.json"), "utf8")
      );

      const result = parseShopifyProductJson(
        rawJson,
        "https://sonictech.com/products/aerobuds-pro-anc-wireless"
      );

      expect(result.isShopify).toBe(true);
      const spec = result.parsedSpec!;
      expect(spec.title).toBe("AeroBuds Pro Active Noise Cancelling Wireless Earbuds");
      expect(spec.variants?.length).toBe(2);
      expect(spec.variants?.[0].title).toBe("Matte Black");
      expect(spec.variants?.[1].title).toBe("Starlight Silver");
      expect(spec.price).toBe(49.99);
      expect(spec.compareAtPrice).toBe(99.99);
    });

    it("upgradeShopifyImageUrl removes thumbnail suffixes and protocols", () => {
      const thumb = "//cdn.shopify.com/products/shoe_small.jpg?v=123";
      const upgraded = upgradeShopifyImageUrl(thumb);
      expect(upgraded).toBe("https://cdn.shopify.com/products/shoe.jpg");
    });
  });

  describe("JSON-LD & OpenGraph Parser", () => {
    it("extracts schema.org Product from HTML fixture", () => {
      const html = fs.readFileSync(path.join(FIXTURES_DIR, "paint_html_fixture.html"), "utf8");
      const result = parseHtmlMetadata(html, "https://auraliving.com/products/ultra-matte-paint");

      expect(result.hasProductData).toBe(true);
      const spec = result.parsedSpec!;
      expect(spec.title).toBe("Premium Ultra-Matte Interior Wall Paint");
      expect(spec.price).toBe(64);
      expect(spec.currency).toBe("USD");
      expect(spec.rating).toBe(4.9);
      expect(spec.reviewCount).toBe(184);
      expect(spec.assets?.length).toBe(2);
      expect(spec.description).toContain("1 gallon covers 400 sq ft");
    });
  });

  describe("Product Typology Classifier", () => {
    it("classifies hardwood flooring as surface_material", () => {
      const result = classifyProductTypology({
        title: "Natural European White Oak Engineered Hardwood Flooring",
        description: "Click-lock vinyl plank flooring with scratch-resistant surface. 24 sq ft per box.",
      });

      expect(result.typology).toBe("surface_material");
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.typologySpecifics.surfaceMaterial?.scratchResistant).toBe(true);
      expect(result.typologySpecifics.surfaceMaterial?.installationType).toContain("Uniclic");
    });

    it("classifies interior wall paint as surface_material", () => {
      const result = classifyProductTypology({
        title: "Ultra-Matte Washable Interior Wall Paint",
        description: "1 gallon covers 400 sq ft with zero VOC and scuff resistance.",
      });

      expect(result.typology).toBe("surface_material");
      expect(result.typologySpecifics.surfaceMaterial?.coveragePerUnit).toContain("400 sq. ft.");
      expect(result.typologySpecifics.surfaceMaterial?.finishType).toBe("ultra_matte");
    });

    it("classifies wireless earbuds as discrete_object", () => {
      const result = classifyProductTypology({
        title: "AeroBuds Pro Active Noise Cancelling Wireless Earbuds",
        description: "Bluetooth headphones with 36 hours battery life and titanium driver.",
      });

      expect(result.typology).toBe("discrete_object");
      expect(result.typologySpecifics.discreteObject?.waterproofIpx).toBe("IPX7 Submersible");
    });

    it("classifies merino wool runners as apparel_wearable", () => {
      const result = classifyProductTypology({
        title: "Men's Wool Runner Sneakers",
        description: "Breathable merino wool running shoes with 4-way stretch comfort.",
      });

      expect(result.typology).toBe("apparel_wearable");
      expect(result.typologySpecifics.apparel?.fabricComposition).toContain("Merino Wool");
    });

    it("classifies hyaluronic acid glow serum as sensory_consumable", () => {
      const result = classifyProductTypology({
        title: "Triple Hyaluronic Acid Glow Serum 30ml",
        description: "Vegan and cruelty-free facial skincare dropper with intense hydration.",
      });

      expect(result.typology).toBe("sensory_consumable");
      expect(result.typologySpecifics.sensoryConsumable?.certifications).toContain("100% Vegan");
    });

    it("classifies standing desk as bulky_furniture", () => {
      const result = classifyProductTypology({
        title: "Dual-Motor Ergonomic Standing Desk 60x30",
        description: "Solid wood electric adjustable desk with 500 lbs weight capacity.",
      });

      expect(result.typology).toBe("bulky_furniture");
      expect(result.typologySpecifics.bulkyFurniture?.weightCapacityLbs).toBe(500);
    });

    it("classifies emergency plumbing as local_service", () => {
      const result = classifyProductTypology({
        title: "24/7 Emergency Plumbing & Leaking Pipe Repair",
        description: "Licensed and insured plumber with same-day dispatch and 10-year warranty.",
      });

      expect(result.typology).toBe("local_service");
      expect(result.typologySpecifics.localService?.licensedAndInsured).toBe(true);
      expect(result.typologySpecifics.localService?.responseTimeMinutes).toBe(30);
    });
  });

  describe("Autonomous Brand DNA Harvester", () => {
    it("extracts CSS variable palette and logos from HTML", async () => {
      const html = fs.readFileSync(path.join(FIXTURES_DIR, "paint_html_fixture.html"), "utf8");
      const brand = await harvestBrandDNA({
        domain: "auraliving.com",
        html,
      });

      expect(brand.name).toBe("Aura Living");
      expect(brand.domain).toBe("auraliving.com");
      expect(brand.primaryColor).toBe("#10b981");
      expect(brand.secondaryColor).toBe("#f59e0b");
      expect(brand.logoUrl).toBe("https://auraliving.com/assets/logo.svg");
      expect(brand.faviconUrl).toBe("https://auraliving.com/favicon.ico");
    });

    it("extracts brand logo from JSON-LD Schema.org Organization", async () => {
      const html = `
        <html>
          <head>
            <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "Acme Brand",
              "url": "https://acmebrand.com",
              "logo": {
                "@type": "ImageObject",
                "url": "https://cdn.acmebrand.com/assets/acme-logo-hd.png"
              }
            }
            </script>
          </head>
          <body>
            <h1>Welcome to Acme</h1>
          </body>
        </html>
      `;

      const brand = await harvestBrandDNA({
        domain: "acmebrand.com",
        html,
      });

      expect(brand.name).toBe("Acme Brand");
      expect(brand.logoUrl).toBe("https://cdn.acmebrand.com/assets/acme-logo-hd.png");
    });

    it("extracts brand logo from Tiendanube header image with protocol-relative URL", async () => {
      const html = `
        <html>
          <header class="head-main">
            <a class="logo" href="/">
              <img src="//dcdn-us.mitiendanube.com/stores/006/100/594/themes/common/logo-984349678-1744744104-c583fca7419d636032dc7050fd72a8641744744104-480-0.webp" class="logo-img" alt="StoreHaus" />
            </a>
          </header>
          <body></body>
        </html>
      `;

      const brand = await harvestBrandDNA({
        domain: "storehaus.com.ar",
        html,
      });

      expect(brand.logoUrl).toBe(
        "https://dcdn-us.mitiendanube.com/stores/006/100/594/themes/common/logo-984349678-1744744104-c583fca7419d636032dc7050fd72a8641744744104.webp"
      );
    });
  });
});
