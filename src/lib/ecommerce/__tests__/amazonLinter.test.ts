/**
 * src/lib/ecommerce/__tests__/amazonLinter.test.ts
 *
 * Unit tests for Amazon TOS Compliance & Regulatory Advertising Linter.
 */

import { describe, it, expect } from "vitest";
import { lintAdCopy } from "../amazonLinter";

describe("Amazon TOS & Compliance Linter", () => {
  it("detects and sanitizes banned superlative '#1' on Amazon channel", () => {
    const raw = "Our headphones are the #1 world's best audio device on the market.";
    const result = lintAdCopy(raw, { channel: "amazon_listing" });

    expect(result.isCompliant).toBe(false);
    expect(result.violations.length).toBeGreaterThanOrEqual(1);
    expect(result.violations[0].category).toBe("unsupported_superlative");
    expect(result.sanitizedText).not.toContain("#1");
    expect(result.sanitizedText).toContain("Premium quality");
  });

  it("detects and sanitizes 'best seller' badge claim on Amazon", () => {
    const raw = "The official Best Seller that thousands love.";
    const result = lintAdCopy(raw, { channel: "amazon_listing" });

    expect(result.isCompliant).toBe(false);
    expect(result.sanitizedText).not.toContain("Best Seller");
    expect(result.sanitizedText).toContain("Popular choice");
  });

  it("strips external website URLs when channel is amazon_listing", () => {
    const raw = "Visit our website at www.mybrand.com to claim warranty.";
    const result = lintAdCopy(raw, { channel: "amazon_listing" });

    expect(result.isCompliant).toBe(false);
    expect(result.violations.some((v) => v.category === "external_link")).toBe(true);
    expect(result.sanitizedText).not.toContain("www.mybrand.com");
    expect(result.sanitizedText).toContain("Available on Amazon");
  });

  it("allows superlative words when channel is tiktok_shop (only warns)", () => {
    const raw = "The #1 viral earbuds on TikTok!";
    const result = lintAdCopy(raw, { channel: "tiktok_shop" });

    // Non-amazon channels allow superlatives
    expect(result.isCompliant).toBe(true);
    expect(result.violations.length).toBeGreaterThanOrEqual(1);
    expect(result.violations[0].severity).toBe("warning");
  });

  it("injects FTC disclosure when isPaidSponsorship is true", () => {
    const raw = "Check out these new running shoes!";
    const result = lintAdCopy(raw, { isPaidSponsorship: true });

    expect(result.injectedDisclaimers).toContain("#AD");
    expect(result.injectedDisclaimers).toContain("PAID PARTNERSHIP");
  });

  it("injects FDA disclaimer when isSupplementOrCosmetic is true", () => {
    const raw = "Our collagen gummies support youthful glow.";
    const result = lintAdCopy(raw, { isSupplementOrCosmetic: true });

    expect(result.injectedDisclaimers.some((d) => d.includes("FDA"))).toBe(true);
  });
});
