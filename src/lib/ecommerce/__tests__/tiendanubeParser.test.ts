import { describe, it, expect } from "vitest";
import {
  isTiendanubeStore,
  upgradeTiendanubeImageUrl,
  parseTiendanubeHtml,
} from "../parsers/tiendanubeParser";

describe("Generic Tiendanube / Nuvemshop Storefront Parser Tests", () => {
  it("detects Tiendanube stores from URL or CDN markers", () => {
    expect(isTiendanubeStore("", "https://mystore.mitiendanube.com")).toBe(true);
    expect(isTiendanubeStore("", "https://loja.lojavirtualnuvem.com.br")).toBe(true);
    expect(
      isTiendanubeStore(
        '<html><link rel="preconnect" href="https://dcdn-us.mitiendanube.com" /></html>',
        "https://www.storehaus.com.ar"
      )
    ).toBe(true);
    expect(
      isTiendanubeStore('<html><div class="js-item-product"></div></html>', "https://customdomain.com")
    ).toBe(true);
    expect(isTiendanubeStore("<html><body>Normal Site</body></html>", "https://example.com")).toBe(false);
  });

  it("upgrades thumbnail images to high-resolution packshots", () => {
    const thumb =
      "https://dcdn-us.mitiendanube.com/stores/006/100/594/products/piso-porcelanato-tribeca-55644-480-0.webp";
    const highRes = upgradeTiendanubeImageUrl(thumb);
    expect(highRes).toBe(
      "https://dcdn-us.mitiendanube.com/stores/006/100/594/products/piso-porcelanato-tribeca-55644-1024-1024.webp"
    );

    const normal = "https://example.com/image.png";
    expect(upgradeTiendanubeImageUrl(normal)).toBe(normal);
  });

  it("parses Tiendanube JSON-LD structured data and extracts full product description, ARS price, and tags", () => {
    const mockHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <link rel="preconnect" href="https://dcdn-us.mitiendanube.com" />
      </head>
      <body>
        <div class="js-item-product col-6 item-product" data-product-id="364152551" data-usage-tags="%5B%7B%22attributes%22%3A%7B%22tag%22%3A%22resistente%20al%20agua%20(waterproof)%22%7D%7D%2C%7B%22attributes%22%3A%7B%22tag%22%3A%22rectificado%22%7D%7D%5D">
          <script type="application/ld+json" data-component="structured-data.item">
          {
            "@context": "https://schema.org/",
            "@type": "Product",
            "name": "Porcelanato - Tribeca Concret Frankyln Out - 60x120",
            "image": "https://dcdn-us.mitiendanube.com/stores/006/100/594/products/piso-porcelanato-tribeca-concret-frankyln-out-55644-480-0.webp",
            "description": "Tribeca Concret Frankyln Out · 10 mm · 60x120 cm · Tránsito Residencial. Porcelanato rectificado y resistente al agua. Importadores directos. Consultá precio por m² en StoreHaus.",
            "sku": "23516",
            "brand": {
              "@type": "Brand",
              "name": "ILVA"
            },
            "offers": {
              "@type": "Offer",
              "url": "https://www.storehaus.com.ar/productos/porcelanato-tribeca-concret-frankyln-out-60x120-hm5bp/",
              "priceCurrency": "ARS",
              "price": "36759",
              "availability": "https://schema.org/InStock"
            }
          }
          </script>
        </div>
      </body>
    </html>
    `;

    const products = parseTiendanubeHtml(mockHtml, "https://www.storehaus.com.ar/productos/");
    expect(products).toHaveLength(1);

    const p = products[0];
    expect(p.id).toBe("tn_23516");
    expect(p.title).toBe("Porcelanato - Tribeca Concret Frankyln Out - 60x120");
    expect(p.vendor).toBe("ILVA");
    expect(p.price).toBe(36759);
    expect(p.currency).toBe("ARS");
    expect(p.inStock).toBe(true);

    // Verify description is completely preserved
    expect(p.description).toContain("Tribeca Concret Frankyln Out");
    expect(p.description).toContain("Porcelanato rectificado y resistente al agua");

    // Verify bullet points extracted from tags and description
    expect(p.bulletPoints).toBeDefined();
    expect(p.bulletPoints.length).toBeGreaterThanOrEqual(2);

    // Verify surface_material typology was accurately classified
    expect(p.typology).toBe("surface_material");

    // Verify image was upgraded to 1024px
    expect(p.assets).toHaveLength(1);
    expect(p.assets[0].url).toContain("-1024-1024.webp");
    expect(p.assets[0].isPrimary).toBe(true);

    // Verify BrandDNA was constructed
    expect(p.brand).toBeDefined();
    expect(p.brand.name).toBe("STOREHAUS");
    expect(p.brand.domain).toBe("www.storehaus.com.ar");
  });

  it("extracts Tiendanube brand logo from header or themes CDN paths", () => {
    const htmlWithHeaderLogo = `
    <html>
      <header>
        <a class="logo" href="/">
          <img src="//dcdn-us.mitiendanube.com/stores/006/100/594/themes/common/logo-984349678-1744744104-c583fca7419d636032dc7050fd72a8641744744104-480-0.webp" alt="StoreHaus" class="logo-img transition-soft" />
        </a>
      </header>
      <div class="js-item-product">
        <script type="application/ld+json">
        {
          "@context": "https://schema.org/",
          "@type": "Product",
          "name": "Test Item",
          "offers": { "price": "100", "priceCurrency": "ARS" }
        }
        </script>
      </div>
    </html>
    `;

    const products = parseTiendanubeHtml(htmlWithHeaderLogo, "https://www.storehaus.com.ar");
    expect(products).toHaveLength(1);
    expect(products[0].brand.logoUrl).toBe(
      "https://dcdn-us.mitiendanube.com/stores/006/100/594/themes/common/logo-984349678-1744744104-c583fca7419d636032dc7050fd72a8641744744104.webp"
    );
  });
});
