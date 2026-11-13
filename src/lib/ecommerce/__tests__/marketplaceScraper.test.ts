/**
 * src/lib/ecommerce/__tests__/marketplaceScraper.test.ts
 *
 * Unit tests for Stealth Marketplace Scraper (Amazon, Walmart, MercadoLibre).
 */

import { describe, it, expect } from "vitest";
import {
  isMarketplaceUrl,
  detectMarketplacePlatform,
  extractAmazonAsin,
  extractWalmartItemId,
  parseAmazonHtml,
  parseWalmartHtml,
  parseMercadoLibreHtml,
} from "../parsers/marketplaceScraper";

describe("Marketplace Scraper Suite", () => {
  describe("Domain & Platform Detection", () => {
    it("correctly identifies Amazon URLs across global TLDs and short links", () => {
      expect(isMarketplaceUrl("https://www.amazon.com/dp/B08N5WRWNW")).toBe(true);
      expect(isMarketplaceUrl("https://amazon.co.uk/gp/product/B08N5WRWNW")).toBe(true);
      expect(isMarketplaceUrl("https://amazon.de/dp/B08N5WRWNW")).toBe(true);
      expect(isMarketplaceUrl("https://amzn.to/3xyz123")).toBe(true);
      expect(isMarketplaceUrl("https://a.co/d/123456")).toBe(true);

      expect(detectMarketplacePlatform("https://www.amazon.com/dp/B08N5WRWNW")).toBe("amazon");
      expect(detectMarketplacePlatform("https://amzn.to/3xyz123")).toBe("amazon");
    });

    it("correctly identifies Walmart URLs", () => {
      expect(isMarketplaceUrl("https://www.walmart.com/ip/Apple-AirPods-Pro/12345678")).toBe(true);
      expect(detectMarketplacePlatform("https://www.walmart.com/ip/Apple-AirPods-Pro/12345678")).toBe("walmart");
    });

    it("correctly identifies MercadoLibre URLs", () => {
      expect(isMarketplaceUrl("https://www.mercadolivre.com.br/fone-bluetooth/p/MLB123456")).toBe(true);
      expect(isMarketplaceUrl("https://articulo.mercadolibre.com.ar/MLA-123456-auriculares")).toBe(true);
      expect(detectMarketplacePlatform("https://www.mercadolivre.com.br/p/MLB123")).toBe("mercadolibre");
    });

    it("returns false and unknown for regular non-marketplace storefronts", () => {
      expect(isMarketplaceUrl("https://luxefloor.com/products/hardwood")).toBe(false);
      expect(isMarketplaceUrl("https://store.apple.com/us/shop")).toBe(false);
      expect(detectMarketplacePlatform("https://luxefloor.com/products/hardwood")).toBe("unknown");
    });
  });

  describe("Product Identifier Extraction", () => {
    it("extracts 10-character Amazon ASIN from various path schemes", () => {
      expect(extractAmazonAsin("https://www.amazon.com/dp/B08N5WRWNW")).toBe("B08N5WRWNW");
      expect(extractAmazonAsin("https://www.amazon.com/Apple-AirPods-Max-Space-Gray/dp/B08PZHYWJS/ref=sr_1_1")).toBe("B08PZHYWJS");
      expect(extractAmazonAsin("https://www.amazon.com/gp/product/B09V3HN1KC")).toBe("B09V3HN1KC");
    });

    it("extracts numeric Walmart Item ID from URL", () => {
      expect(extractWalmartItemId("https://www.walmart.com/ip/Apple-AirPods-Pro-2nd-Generation/123456789")).toBe("123456789");
      expect(extractWalmartItemId("https://www.walmart.com/ip/123456789")).toBe("123456789");
    });
  });

  describe("Amazon HTML Parser", () => {
    const MOCK_AMAZON_HTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Amazon.com: Sony WH-1000XM5 Wireless Headphones</title>
        </head>
        <body>
          <h1 id="productTitle">Sony WH-1000XM5 Wireless Industry Leading Noise Canceling Headphones - Black</h1>
          <a id="bylineInfo" href="/sony">Visit the Sony Store</a>
          
          <div id="corePriceDisplay_desktop_feature_div">
            <span class="a-price aok-align-center">
              <span class="a-offscreen">$398.00</span>
            </span>
            <span class="a-price a-text-price">
              <span class="a-offscreen">$449.99</span>
            </span>
          </div>

          <div id="priceBadging_feature_div">
            <i class="a-icon a-icon-prime">Prime</i>
          </div>

          <span id="acrPopover" title="4.6 out of 5 stars"></span>
          <span id="acrCustomerReviewText">14,230 ratings</span>

          <img id="landingImage" src="https://m.media-amazon.com/images/I/71o8Q5XJS5L._AC_SX679_.jpg" 
               data-a-dynamic-image='{"https://m.media-amazon.com/images/I/71o8Q5XJS5L._AC_SL1500_.jpg":[1500,1500],"https://m.media-amazon.com/images/I/71o8Q5XJS5L._AC_SL1000_.jpg":[1000,1000]}' />

          <div id="feature-bullets">
            <ul>
              <li>Magnificent sound, engineered to perfection with the new Integrated Processor V1</li>
              <li>Crystal clear hands-free calling with 4 beamforming microphones</li>
              <li>Up to 30-hour battery life with quick charging (3 min charge for 3 hours of playback)</li>
            </ul>
          </div>
        </body>
      </html>
    `;

    it("parses Amazon product HTML into a complete ProductSpec with high-res packshot and Prime badge", () => {
      const spec = parseAmazonHtml(MOCK_AMAZON_HTML, "https://www.amazon.com/dp/B09XS7JWHH");

      expect(spec.id).toBe("amz_B09XS7JWHH");
      expect(spec.title).toContain("Sony WH-1000XM5");
      expect(spec.vendor).toBe("Sony");
      expect(spec.price).toBe(398.00);
      expect(spec.compareAtPrice).toBe(449.99);
      expect(spec.currency).toBe("USD");
      expect(spec.bulletPoints?.length).toBe(3);
      expect(spec.bulletPoints?.[0]).toContain("Processor V1");

      // High-Res Image extracted from data-a-dynamic-image 1500px packshot
      expect(spec.assets?.length).toBe(2);
      expect(spec.assets?.[0].url).toContain("_AC_SL1500_.jpg");
      expect(spec.assets?.[0].isPrimary).toBe(true);

      // Brand DNA and Prime theme
      expect(spec.brand?.primaryColor).toBe("#00a8e1"); // Prime cyan
      expect(spec.brand?.taglines).toContain("Prime Fast Free Delivery");

      // Verified review created from ratings
      expect(spec.topReviews?.length).toBe(1);
      expect(spec.topReviews?.[0].rating).toBe(5);
      expect(spec.topReviews?.[0].verifiedBuyer).toBe(true);

      // Typology classified as discrete_object (headphones)
      expect(spec.typology).toBe("discrete_object");
    });
  });

  describe("Walmart HTML Parser", () => {
    const MOCK_WALMART_HTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <script id="__NEXT_DATA__" type="application/json">
            {
              "props": {
                "pageProps": {
                  "initialData": {
                    "data": {
                      "product": {
                        "name": "Ninja Professional Plus Blender with Auto-iQ",
                        "brand": "Ninja",
                        "priceInfo": {
                          "currentPrice": { "price": 99.00, "currencyUnit": "USD" },
                          "wasPrice": { "price": 119.00 }
                        },
                        "shortDescription": "The Ninja Professional Plus Blender with Auto-iQ features a new modern design and a more powerful motor.",
                        "imageInfo": {
                          "allImages": [
                            { "url": "https://i5.walmartimages.com/seo/Ninja-Blender_hero.jpeg" }
                          ]
                        }
                      }
                    }
                  }
                }
              }
            }
          </script>
        </head>
        <body></body>
      </html>
    `;

    it("parses Walmart HTML with Next.js initial data into ProductSpec", () => {
      const spec = parseWalmartHtml(MOCK_WALMART_HTML, "https://www.walmart.com/ip/Ninja-Blender/45678912");

      expect(spec.id).toBe("wmt_45678912");
      expect(spec.title).toBe("Ninja Professional Plus Blender with Auto-iQ");
      expect(spec.vendor).toBe("Ninja");
      expect(spec.price).toBe(99.00);
      expect(spec.compareAtPrice).toBe(119.00);
      expect(spec.assets?.[0].url).toContain("Ninja-Blender_hero.jpeg");
      expect(spec.brand?.primaryColor).toBe("#0071dc"); // Walmart blue
      expect(spec.typology).toBe("discrete_object");
    });
  });

  describe("MercadoLibre HTML Parser", () => {
    const MOCK_ML_HTML = `
      <!DOCTYPE html>
      <html>
        <body>
          <h1 class="ui-pdp-title">Fone De Ouvido Sem Fio Bluetooth Cancelamento Ruído</h1>
          <div class="ui-pdp-price__second-line">
            <span class="andes-money-amount__currency-symbol">R$</span>
            <span class="andes-money-amount__fraction">189</span>
            <span class="andes-money-amount__cents">90</span>
          </div>
          <div class="ui-pdp-gallery__figure">
            <img src="https://http2.mlstatic.com/D_NQ_NP_12345-MLB.jpg" />
          </div>
        </body>
      </html>
    `;

    it("parses MercadoLibre HTML with Brazilian Real currency", () => {
      const spec = parseMercadoLibreHtml(MOCK_ML_HTML, "https://www.mercadolivre.com.br/p/MLB999");

      expect(spec.title).toContain("Fone De Ouvido");
      expect(spec.price).toBe(189.90);
      expect(spec.currency).toBe("BRL");
      expect(spec.assets?.[0].url).toContain("12345-MLB.jpg");
      expect(spec.brand?.name).toBe("MercadoLibre");
      expect(spec.brand?.primaryColor).toBe("#ffe600");
    });
  });
});
