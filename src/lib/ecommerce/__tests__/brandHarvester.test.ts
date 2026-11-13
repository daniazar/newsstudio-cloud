/**
 * src/lib/ecommerce/__tests__/brandHarvester.test.ts
 *
 * Unit tests for Brand DNA Harvester Color Extraction & Accessibility Contrast Engine.
 */

import { describe, it, expect } from "vitest";
import { harvestBrandDNA, getContrastingTextColor } from "../brandHarvester";

describe("Brand DNA Harvester & Color Contrast Engine", () => {
  describe("getContrastingTextColor (ITU-R BT.709 perceived luminance)", () => {
    it("returns dark text for light/bright backgrounds", () => {
      expect(getContrastingTextColor("#ffffff")).toBe("#09090b");
      expect(getContrastingTextColor("#ffe600")).toBe("#09090b"); // MercadoLibre yellow
      expect(getContrastingTextColor("#ff9900")).toBe("#09090b"); // Amazon orange
      expect(getContrastingTextColor("#06b6d4")).toBe("#09090b"); // Cyan teal
      expect(getContrastingTextColor("#fef08a")).toBe("#09090b"); // Pastel yellow
    });

    it("returns white text for dark/saturated backgrounds", () => {
      expect(getContrastingTextColor("#000000")).toBe("#ffffff");
      expect(getContrastingTextColor("#09090b")).toBe("#ffffff");
      expect(getContrastingTextColor("#2b30e0")).toBe("#ffffff"); // Tiendanube deep blue
      expect(getContrastingTextColor("#7c3aed")).toBe("#ffffff"); // Violet
      expect(getContrastingTextColor("#dc2626")).toBe("#ffffff"); // Red
      expect(getContrastingTextColor("#0f172a")).toBe("#ffffff"); // Slate 900
    });

    it("handles short 3-digit hex codes and edge cases gracefully", () => {
      expect(getContrastingTextColor("#fff")).toBe("#09090b");
      expect(getContrastingTextColor("#000")).toBe("#ffffff");
      expect(getContrastingTextColor("")).toBe("#ffffff");
      expect(getContrastingTextColor(undefined)).toBe("#ffffff");
    });
  });

  describe("Known Marketplace Domain Signature Colors", () => {
    it("falls back to MercadoLibre yellow (#ffe600) when HTML lacks palette", async () => {
      const brand = await harvestBrandDNA({
        domain: "articulo.mercadolibre.com.ar",
        html: "<html><head><title>Item ML</title></head><body><h1>Producto</h1></body></html>",
      });
      expect(brand.primaryColor).toBe("#ffe600");
    });

    it("falls back to Amazon signature orange (#ff9900)", async () => {
      const brand = await harvestBrandDNA({
        domain: "www.amazon.com",
        html: "<html><head><title>Amazon Product</title></head><body><h1>Item</h1></body></html>",
      });
      expect(brand.primaryColor).toBe("#ff9900");
    });

    it("falls back to Tiendanube blue (#2b30e0)", async () => {
      const brand = await harvestBrandDNA({
        domain: "mitiendanube.com",
        html: "<html><head><title>Mi Tienda</title></head><body><h1>Bienvenido</h1></body></html>",
      });
      expect(brand.primaryColor).toBe("#2b30e0");
    });
  });

  describe("HTML Meta Tag & CTA Button Color Harvesting", () => {
    it("extracts theme-color from HTML meta tag", async () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Rose Store</title>
            <meta name="theme-color" content="#e11d48">
          </head>
          <body>
            <h1>Tienda de Ropa</h1>
          </body>
        </html>
      `;
      const brand = await harvestBrandDNA({
        domain: "rosestore.com",
        html,
      });
      expect(brand.primaryColor).toBe("#e11d48");
    });

    it("extracts brand color from primary CTA add-to-cart button inline style", async () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head><title>Audio Tech Store</title></head>
          <body>
            <div class="product-page">
              <button class="btn-primary" style="background-color: #7c3aed; color: #fff;">
                Comprar Ahora
              </button>
            </div>
          </body>
        </html>
      `;
      const brand = await harvestBrandDNA({
        domain: "audiotech.com",
        html,
      });
      expect(brand.primaryColor).toBe("#7c3aed");
    });

    it("extracts brand color from Shopify product-form__submit button", async () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head><title>Sneakers Hub</title></head>
          <body>
            <form action="/cart/add" method="post">
              <button type="submit" name="add" class="product-form__submit" style="background: #059669">
                Add to Cart
              </button>
            </form>
          </body>
        </html>
      `;
      const brand = await harvestBrandDNA({
        domain: "sneakershub.com",
        html,
      });
      expect(brand.primaryColor).toBe("#059669");
    });

    it("extracts brand color from CSS custom properties in style tag", async () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Nordic Modern</title>
            <style>
              :root {
                --color-btn-primary: #f97316;
                --color-secondary: #3b82f6;
              }
            </style>
          </head>
          <body><h1>Mobiliario</h1></body>
        </html>
      `;
      const brand = await harvestBrandDNA({
        domain: "nordicmodern.com",
        html,
      });
      expect(brand.primaryColor).toBe("#f97316");
    });
  });
});
