/**
 * src/lib/ecommerce/__tests__/languageDetector.test.ts
 *
 * Unit test suite for E-Commerce Intelligent Language & Locale Detection Engine.
 * Verifies 100% precision across real-world Spanish, English, and Portuguese titles,
 * proper noun disambiguation (e.g. "Los Angeles", "Del Mar"), and storefront URL/currency cues.
 */

import { describe, it, expect } from "vitest";
import {
  detectLanguage,
  detectTextLanguage,
  detectProductLanguage,
} from "../languageDetector";
import { ProductSpec } from "@/lib/types/ecommerce";

describe("E-Commerce Language Detector", () => {
  describe("detectLanguage() on plain text & scene dialogue", () => {
    it("accurately classifies real-world Spanish e-commerce titles WITHOUT diacritics", () => {
      const titles = [
        "Zapatillas deportivas negras talle 40",
        "Buzo rustico oversize gris topo",
        "Camisa blanca mangas largas lino italiano",
        "Sillon escandinavo dos cuerpos gris",
        "Remera algodon blanca estampada",
        "Mochila urbana porta notebook impermeable",
        "Lampara colgante vintage filamento led",
        "Vaso termico acero inoxidable frio calor",
        "Reloj pulsera digital sumergible deportivo",
        "Cuchillo artesanal acero damasco cabo ciervo",
      ];

      for (const title of titles) {
        expect(detectLanguage(title), `Failed on Spanish title: "${title}"`).toBe("Spanish");
      }
    });

    it("accurately classifies Spanish text WITH diacritics and inverted punctuation", () => {
      expect(
        detectLanguage("Transformá tus espacios con la más alta calidad y elegancia")
      ).toBe("Spanish");
      expect(
        detectLanguage("Descubrí el nuevo Porcelanato San Lorenzo para tu hogar")
      ).toBe("Spanish");
      expect(
        detectLanguage("¿Tenés dudas sobre la instalación? Hacé click acá")
      ).toBe("Spanish");
      expect(
        detectLanguage("¡Últimas unidades disponibles con envío gratis!")
      ).toBe("Spanish");
    });

    it("accurately classifies English e-commerce product titles & marketing copy", () => {
      const titles = [
        "Premium Scandinavian hardwood flooring engineered for luxury interiors",
        "Discover the latest collection of bespoke timepieces",
        "High quality interior and exterior furniture product",
        "Men's wireless noise cancelling over-ear headphones with travel case",
        "Stainless steel insulated water bottle 32oz vacuum sealed",
        "Minimalist modern ceramic coffee mug set of 4",
      ];

      for (const title of titles) {
        expect(detectLanguage(title), `Failed on English title: "${title}"`).toBe("English");
      }
    });

    it("correctly handles American proper nouns containing Spanish loan words", () => {
      // "Los Angeles", "Del Mar", "La Jolla", "El Paso" should NOT fool the detector into Spanish
      expect(detectLanguage("Los Angeles Dodgers Baseball Cap")).toBe("English");
      expect(detectLanguage("Del Mar Genuine Leather Watch Collection")).toBe("English");
      expect(detectLanguage("La Jolla Polarized Summer Sunglasses")).toBe("English");
      expect(detectLanguage("El Paso Western Cowboy Boots in Brown Leather")).toBe("English");
    });

    it("handles null, undefined, empty, and whitespace strings gracefully", () => {
      expect(detectLanguage("")).toBe("English");
      expect(detectLanguage("   ")).toBe("English");
      expect(detectLanguage(null)).toBe("English");
      expect(detectLanguage(undefined)).toBe("English");
    });
  });

  describe("detectTextLanguage() ISO codes", () => {
    it("returns 'es' for Spanish text", () => {
      expect(detectTextLanguage("Zapatillas deportivas urbanas")).toBe("es");
      expect(detectTextLanguage("Descubrí las mejores ofertas")).toBe("es");
    });

    it("returns 'en' for English text", () => {
      expect(detectTextLanguage("Shop the new autumn collection")).toBe("en");
    });

    it("returns 'pt' for Portuguese text with diacritics", () => {
      expect(detectTextLanguage("Revestimento de madeira com frete grátis para todo Brasil")).toBe("pt");
    });
  });

  describe("detectProductLanguage() on ProductSpec", () => {
    it("correctly identifies Argentine store with .com domain (fixes .com/ URL bug)", () => {
      const spec: Partial<ProductSpec> = {
        title: "Porcelanato San Lorenzo Moods 45x90 Rectificado",
        description: "Revestimiento de alto tránsito para pisos y paredes. Terminación satinada de primera calidad.",
        sourceUrl: "https://storehaus.com/products/porcelanato-san-lorenzo-moods",
        currency: "ARS",
        bulletPoints: ["1.22 m² por caja", "Apto para pisos y paredes"],
      };

      const result = detectProductLanguage(spec);
      expect(result.language).toBe("es");
      expect(result.locale).toBe("es-AR");
      expect(result.isSpanish).toBe(true);
      expect(result.isArgentine).toBe(true);
      expect(result.countryName).toBe("Argentina");
      expect(result.voiceModelSuggestion).toBe("es_AR-daniela-high");
      expect(result.defaultCtaText).toBe("COMPRÁ AHORA • TOCÁ ACÁ");
    });

    it("correctly identifies Argentine store from text voseo even with USD currency", () => {
      const spec: Partial<ProductSpec> = {
        title: "Remera Oversize Rustica Lisa",
        description: "Elegí tu talle y combiná con tu estilo favorito. Hacé tu pedido con envío a todo el país.",
        sourceUrl: "https://mystore.com/remera-oversize",
        currency: "USD",
      };

      const result = detectProductLanguage(spec);
      expect(result.language).toBe("es");
      expect(result.locale).toBe("es-AR");
      expect(result.isSpanish).toBe(true);
      expect(result.isArgentine).toBe(true);
    });

    it("correctly identifies Spanish store with .es domain", () => {
      const spec: Partial<ProductSpec> = {
        title: "Sillón de piel moderno para salón",
        description: "Haz tu pedido hoy con envío gratis a toda la península. Gran calidad y comodidad.",
        sourceUrl: "https://mueblesmadrid.es/sillon-piel",
        currency: "EUR",
      };

      const result = detectProductLanguage(spec);
      expect(result.language).toBe("es");
      expect(result.locale).toBe("es-ES");
      expect(result.isSpanish).toBe(true);
      expect(result.isArgentine).toBe(false);
      expect(result.countryName).toBe("Spain");
      expect(result.voiceModelSuggestion).toBe("es_ES-davefx-medium");
    });

    it("correctly identifies Mexican store with MXN currency or .com.mx", () => {
      const spec: Partial<ProductSpec> = {
        title: "Tenis Deportivos para Correr",
        description: "Compra tus tenis con envío a toda la república mexicana.",
        sourceUrl: "https://tienda.com.mx/tenis-deportivos",
        currency: "MXN",
      };

      const result = detectProductLanguage(spec);
      expect(result.language).toBe("es");
      expect(result.locale).toBe("es-MX");
      expect(result.isSpanish).toBe(true);
      expect(result.countryName).toBe("Latin America");
    });

    it("correctly identifies Brazilian store with .com.br or BRL currency", () => {
      const spec: Partial<ProductSpec> = {
        title: "Mesa de Jantar Madeira Maciça",
        description: "Compre agora com frete grátis em até 12 parcelas sem juros.",
        sourceUrl: "https://moveisbrasil.com.br/mesa-madeira",
        currency: "BRL",
      };

      const result = detectProductLanguage(spec);
      expect(result.language).toBe("pt");
      expect(result.locale).toBe("pt-BR");
      expect(result.isSpanish).toBe(false);
      expect(result.countryName).toBe("Brazil");
      expect(result.defaultCtaText).toBe("COMPRAR JÁ • CLIQUE AQUI");
    });

    it("correctly identifies US English product with USD currency", () => {
      const spec: Partial<ProductSpec> = {
        title: "Ergonomic Standing Desk Dual Motor",
        description: "Engineered for home office productivity. Durable steel frame with bamboo desktop.",
        sourceUrl: "https://flexispot.com/standing-desk",
        currency: "USD",
      };

      const result = detectProductLanguage(spec);
      expect(result.language).toBe("en");
      expect(result.locale).toBe("en-US");
      expect(result.isSpanish).toBe(false);
      expect(result.countryName).toBe("United States");
      expect(result.voiceModelSuggestion).toBe("en_US-amy-medium");
      expect(result.defaultCtaText).toBe("SHOP NOW • TAP BELOW");
    });

    it("correctly respects explicit language metadata", () => {
      const spec: Partial<ProductSpec> & { language: string } = {
        title: "Universal Global Gizmo",
        sourceUrl: "https://example.com/item",
        language: "es-AR",
      };

      const result = detectProductLanguage(spec);
      expect(result.language).toBe("es");
      expect(result.locale).toBe("es-AR");
      expect(result.isArgentine).toBe(true);
      expect(result.detectedBy).toBe("metadata");
    });

    it("returns default Argentine Spanish when spec is null or empty", () => {
      const result = detectProductLanguage(null);
      expect(result.language).toBe("es");
      expect(result.locale).toBe("es-AR");
      expect(result.isSpanish).toBe(true);
      expect(result.isArgentine).toBe(true);
    });
  });
});
