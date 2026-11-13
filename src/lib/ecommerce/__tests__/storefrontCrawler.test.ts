import { describe, it, expect } from "vitest";
import {
  parseShopifyProductsJson,
  parseGoogleMerchantXml,
  parseWooCommerceRss,
} from "../storefrontCrawler";

describe("Storefront Catalog & RSS Feed Ingestion Unit Tests", () => {
  it("parses Shopify /products.json format into normalized ProductSpec[]", () => {
    const mockShopifyData = {
      products: [
        {
          id: 7891234,
          title: "Tree Runner Everyday Sneaker",
          handle: "tree-runner-sneaker",
          vendor: "Allbirds",
          product_type: "Shoes",
          body_html: "<p>Light and breezy eucalyptus tree fiber sneaker.</p><ul><li>Breathable eucalyptus upper</li><li>Cushioned sugarcane midsole</li><li>Machine washable</li></ul>",
          variants: [
            {
              id: 987654,
              title: "Natural White / 10",
              price: "98.00",
              compare_at_price: "120.00",
              available: true,
            },
          ],
          images: [
            {
              id: 111,
              src: "https://cdn.shopify.com/s/files/shoes_white.jpg",
              width: 1080,
              height: 1080,
            },
          ],
        },
      ],
    };

    const products = parseShopifyProductsJson(mockShopifyData, "https://www.allbirds.com");
    expect(products).toHaveLength(1);

    const p = products[0];
    expect(p.id).toBe("7891234");
    expect(p.title).toBe("Tree Runner Everyday Sneaker");
    expect(p.sourceUrl).toBe("https://www.allbirds.com/products/tree-runner-sneaker");
    expect(p.vendor).toBe("Allbirds");
    expect(p.price).toBe(98);
    expect(p.compareAtPrice).toBe(120);
    expect(p.bulletPoints).toContain("Breathable eucalyptus upper");
    expect(p.assets).toHaveLength(1);
    expect(p.assets[0].url).toBe("https://cdn.shopify.com/s/files/shoes_white.jpg");
    expect(p.assets[0].isPrimary).toBe(true);
  });

  it("parses Google Merchant Center XML feed format", () => {
    const mockXml = `<?xml version="1.0"?>
    <rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
      <channel>
        <title>Google Shopping Test Feed</title>
        <item>
          <g:id>prod_gm_001</g:id>
          <g:title>SonicPro Wireless Noise Cancelling Earbuds</g:title>
          <g:description>Enjoy 40 hours of crystal-clear sound with ANC technology.</g:description>
          <g:link>https://audiobrand.com/products/earbuds</g:link>
          <g:image_link>https://audiobrand.com/images/earbuds_hero.jpg</g:image_link>
          <g:price>79.99 USD</g:price>
          <g:sale_price>59.99 USD</g:sale_price>
          <g:brand>SonicPro</g:brand>
          <g:availability>in_stock</g:availability>
        </item>
      </channel>
    </rss>`;

    const products = parseGoogleMerchantXml(mockXml, "https://audiobrand.com");
    expect(products).toHaveLength(1);

    const p = products[0];
    expect(p.id).toBe("prod_gm_001");
    expect(p.title).toBe("SonicPro Wireless Noise Cancelling Earbuds");
    expect(p.price).toBe(59.99);
    expect(p.compareAtPrice).toBe(79.99);
    expect(p.vendor).toBe("SonicPro");
    expect(p.assets[0].url).toBe("https://audiobrand.com/images/earbuds_hero.jpg");
  });

  it("parses WooCommerce product RSS feed format", () => {
    const mockWooRss = `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0">
      <channel>
        <title>Organic Cosmetics Shop</title>
        <item>
          <title>Glow Serum 30ml</title>
          <link>https://skincareshop.com/product/glow-serum/</link>
          <description><![CDATA[Revitalizing face serum with Vitamin C and Hyaluronic Acid.]]></description>
          <enclosure url="https://skincareshop.com/wp-content/uploads/serum.jpg" length="12345" type="image/jpeg" />
        </item>
      </channel>
    </rss>`;

    const products = parseWooCommerceRss(mockWooRss, "https://skincareshop.com");
    expect(products).toHaveLength(1);

    const p = products[0];
    expect(p.title).toBe("Glow Serum 30ml");
    expect(p.sourceUrl).toBe("https://skincareshop.com/product/glow-serum/");
    expect(p.assets[0].url).toBe("https://skincareshop.com/wp-content/uploads/serum.jpg");
  });
});
