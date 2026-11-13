/**
 * src/lib/ecommerce/__tests__/csvParser.test.ts
 *
 * Comprehensive unit tests for the CSV/TSV product catalog parser.
 */

import { describe, it, expect } from "vitest";
import {
  parseCsvRows,
  detectCsvFormat,
  parseProductCsv,
} from "../parsers/csvParser";

describe("CSV / TSV Product Catalog Parser", () => {
  describe("parseCsvRows Lexer", () => {
    it("parses simple comma-separated rows", () => {
      const csv = "Handle,Title,Price\nprod-1,Product One,19.99\nprod-2,Product Two,29.99";
      const rows = parseCsvRows(csv);
      expect(rows.length).toBe(3);
      expect(rows[0]).toEqual(["Handle", "Title", "Price"]);
      expect(rows[1]).toEqual(["prod-1", "Product One", "19.99"]);
      expect(rows[2]).toEqual(["prod-2", "Product Two", "29.99"]);
    });

    it("parses fields containing embedded commas and escaped quotes", () => {
      const csv = `Handle,Title,Description\nitem-1,"Deluxe, Premium Chair","Made with ""extra"" care and love"`;
      const rows = parseCsvRows(csv);
      expect(rows.length).toBe(2);
      expect(rows[1][1]).toBe("Deluxe, Premium Chair");
      expect(rows[1][2]).toBe('Made with "extra" care and love');
    });

    it("handles multi-line HTML fields inside quotes", () => {
      const csv = `Handle,Body (HTML)\nshoe-1,"<p>First paragraph.</p>\n<ul>\n<li>Breathable mesh</li>\n<li>All-day comfort</li>\n</ul>"`;
      const rows = parseCsvRows(csv);
      expect(rows.length).toBe(2);
      expect(rows[1][1]).toContain("Breathable mesh");
      expect(rows[1][1]).toContain("All-day comfort");
    });

    it("auto-detects tab delimiter for TSV files", () => {
      const tsv = "Handle\tTitle\tPrice\nhat-1\tSummer Straw Hat\t15.00";
      const rows = parseCsvRows(tsv);
      expect(rows.length).toBe(2);
      expect(rows[1]).toEqual(["hat-1", "Summer Straw Hat", "15.00"]);
    });
  });

  describe("detectCsvFormat", () => {
    it("detects Shopify export format", () => {
      const headers = ["Handle", "Title", "Body (HTML)", "Vendor", "Variant Price", "Image Src"];
      expect(detectCsvFormat(headers)).toBe("shopify");
    });

    it("detects WooCommerce export format", () => {
      const headers = ["ID", "Name", "Short description", "Regular price", "Sale price", "Images"];
      expect(detectCsvFormat(headers)).toBe("woocommerce");
    });

    it("detects URL list format", () => {
      const headers = ["Product URL"];
      expect(detectCsvFormat(headers)).toBe("url_list");
    });

    it("detects generic custom CSV format", () => {
      const headers = ["item_name", "cost", "vendor", "image"];
      expect(detectCsvFormat(headers)).toBe("generic_csv");
    });
  });

  describe("parseProductCsv with Real-World Catalog Samples", () => {
    it("groups multi-row variants and images for Shopify export", () => {
      const shopifyCsv = `Handle,Title,Body (HTML),Vendor,Variant Price,Variant Compare At Price,Image Src,Option1 Value,Option2 Value
aerobuds,AeroBuds Pro,"<p>Active noise cancelling titanium drivers.</p><ul><li>42dB Hybrid ANC</li><li>36h Battery Life</li><li>IPX7 Waterproof</li></ul>",SonicTech,49.99,99.99,https://cdn.example.com/earbuds_black.png,Black,Standard
aerobuds,AeroBuds Pro,"",SonicTech,49.99,99.99,https://cdn.example.com/earbuds_white.png,White,Standard
oak-floor,Luxury European Oak Flooring,"<p>Waterproof hardwood click-lock boards.</p>",LuxeFloor,89.00,129.00,https://cdn.example.com/oak_plank.png,Natural Oak,100sqft`;

      const result = parseProductCsv(shopifyCsv);
      expect(result.format).toBe("shopify");
      expect(result.totalProducts).toBe(2);

      const earbuds = result.products.find((p) => p.id === "prod_aerobuds");
      expect(earbuds).toBeDefined();
      expect(earbuds?.title).toBe("AeroBuds Pro");
      expect(earbuds?.vendor).toBe("SonicTech");
      expect(earbuds?.price).toBe(49.99);
      expect(earbuds?.compareAtPrice).toBe(99.99);

      // Should have gathered 2 variants
      expect(earbuds?.variants.length).toBe(2);
      expect(earbuds?.variants[0].title).toBe("Black / Standard");
      expect(earbuds?.variants[1].title).toBe("White / Standard");

      // Should have gathered 2 assets
      expect(earbuds?.assets.length).toBe(2);
      expect(earbuds?.assets[0].url).toBe("https://cdn.example.com/earbuds_black.png");
      expect(earbuds?.assets[1].url).toBe("https://cdn.example.com/earbuds_white.png");

      // Bullet points extracted from HTML <li>
      expect(earbuds?.bulletPoints).toContain("42dB Hybrid ANC");
      expect(earbuds?.bulletPoints).toContain("36h Battery Life");

      // Second product
      const floor = result.products.find((p) => p.id === "prod_oak-floor");
      expect(floor).toBeDefined();
      expect(floor?.typology).toBe("surface_material");
    });

    it("parses WooCommerce CSV with comma-separated images and sale price", () => {
      const wooCsv = `ID,Name,Description,Regular price,Sale price,Images,Categories
101,Titanium Field Watch,"<p>Swiss movement with sapphire crystal glass.</p>",250.00,199.00,"https://cdn.example.com/watch_front.jpg, https://cdn.example.com/watch_side.jpg",Accessories`;

      const result = parseProductCsv(wooCsv);
      expect(result.format).toBe("woocommerce");
      expect(result.totalProducts).toBe(1);

      const watch = result.products[0];
      expect(watch.title).toBe("Titanium Field Watch");
      expect(watch.price).toBe(199.00);
      expect(watch.compareAtPrice).toBe(250.00);
      expect(watch.assets.length).toBe(2);
      expect(watch.assets[0].url).toBe("https://cdn.example.com/watch_front.jpg");
      expect(watch.assets[1].url).toBe("https://cdn.example.com/watch_side.jpg");
    });

    it("parses custom generic CSV with standard columns", () => {
      const customCsv = `product_name,price,original_price,vendor,image_url,description
HydraSerum Vitamin C,38.00,55.00,GlowBotanics,https://cdn.example.com/serum.png,Clinical brightening serum with 15% pure Vitamin C.`;

      const result = parseProductCsv(customCsv);
      expect(result.format).toBe("generic_csv");
      expect(result.totalProducts).toBe(1);

      const serum = result.products[0];
      expect(serum.title).toBe("HydraSerum Vitamin C");
      expect(serum.price).toBe(38.00);
      expect(serum.compareAtPrice).toBe(55.00);
      expect(serum.vendor).toBe("GlowBotanics");
      expect(serum.typology).toBe("sensory_consumable");
    });

    it("returns warning and empty list for single-row CSV", () => {
      const singleRow = "Handle,Title,Price";
      const result = parseProductCsv(singleRow);
      expect(result.totalProducts).toBe(0);
      expect(result.warnings).toBeDefined();
    });
  });
});
