#!/usr/bin/env tsx
/**
 * scripts/ecommerce-cli.ts
 *
 * Ruby E-Commerce Product-to-Video CLI Engine.
 * 
 * Capabilities:
 *   - Harvest product specs, packshots, and Brand DNA (logos, hex colors)
 *   - Classify 7 Product Typologies (Surfaces, Gadgets, Apparel, Consumables, Furniture, SaaS, Services)
 *   - Synthesize frame-accurate commercial scripts across 6 Video Archetypes
 *   - Enforce Amazon TOS & FTC Advertising Compliance
 *   - Headless Remotion video rendering (9:16, 16:9, 1:1)
 *
 * Usage:
 *   npx tsx scripts/ecommerce-cli.ts scrape <url> [--json] [--out=spec.json]
 *   npx tsx scripts/ecommerce-cli.ts script <url> [--archetype=viral_ugc] [--aspect=9:16]
 *   npx tsx scripts/ecommerce-cli.ts render <url> [--out=output.mp4] [--aspect=9:16]
 *   npx tsx scripts/ecommerce-cli.ts lint "text to check" [--channel=amazon_listing]
 *   npx tsx scripts/ecommerce-cli.ts demo [--render]
 */

import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
// @ts-ignore
import minimist from "minimist";
// @ts-ignore
import prompts from "prompts";
import dotenv from "dotenv";

import { fetchShopifyProduct } from "../src/lib/ecommerce/parsers/shopifyParser";
import { isMarketplaceUrl, fetchMarketplaceProduct } from "../src/lib/ecommerce/parsers/marketplaceScraper";
import { fetchHtmlAndParse } from "../src/lib/ecommerce/parsers/jsonLdParser";
import { harvestBrandDNA } from "../src/lib/ecommerce/brandHarvester";
import { classifyProductTypology } from "../src/lib/ecommerce/typologyClassifier";
import { compileAdScript } from "../src/lib/ecommerce/adCopywriter";
import { lintAdCopy } from "../src/lib/ecommerce/amazonLinter";
import {
  ProductSpec,
  VideoArchetype,
  TargetDistributionChannel,
  AdAspectRatio,
} from "../src/lib/types/ecommerce";

dotenv.config();
const execAsync = promisify(exec);

function printBanner() {
  console.log("\n================================================================================");
  console.log("🛍️  RUBY E-COMMERCE PRODUCT-TO-VIDEO ENGINE CLI");
  console.log("================================================================================");
  console.log("Autonomous Storefront Harvester, Brand DNA Extractor & Remotion Video Generator\n");
}

/**
 * Universal Harvester: Tries Tier 1 Shopify, then Tier 2 Schema.org JSON-LD.
 */
async function harvestUrl(targetUrl: string): Promise<{ productSpec: ProductSpec; brand: any }> {
  console.log(`🌐 Harvesting listing from: ${targetUrl}`);

  let domain = "store.com";
  try {
    domain = new URL(targetUrl).hostname;
  } catch {}

  let partialSpec: Partial<ProductSpec> | null = null;
  let rawHtml: string | undefined = undefined;

  // 1. Try Tier 1 Shopify Direct JSON
  try {
    const shopifyResult = await fetchShopifyProduct(targetUrl);
    if (shopifyResult.isShopify && shopifyResult.parsedSpec?.title) {
      partialSpec = shopifyResult.parsedSpec;
      console.log(`  ✅ Tier 1 Harvester: Shopify JSON extraction succeeded.`);
    }
  } catch (err: any) {
    console.log(`  ⚠️ Tier 1 bypass (${err.message}). Trying Tier 2...`);
  }

  // 1.5 Try Tier 1.5 Marketplace Scraper (Amazon, Walmart, MercadoLibre)
  if (!partialSpec?.title && isMarketplaceUrl(targetUrl)) {
    try {
      const marketplaceResult = await fetchMarketplaceProduct(targetUrl);
      if (marketplaceResult.parsedSpec?.title) {
        partialSpec = marketplaceResult.parsedSpec;
        console.log(`  ✅ Tier 1.5 Harvester: ${marketplaceResult.platform.toUpperCase()} extraction succeeded.`);
      }
    } catch (err: any) {
      console.log(`  ⚠️ Tier 1.5 marketplace bypass (${err.message}). Trying Tier 2...`);
    }
  }

  // 2. Try Tier 2 Schema.org JSON-LD
  if (!partialSpec?.title) {
    try {
      const jsonLdResult = await fetchHtmlAndParse(targetUrl);
      if (jsonLdResult.hasProductData && jsonLdResult.parsedSpec?.title) {
        partialSpec = jsonLdResult.parsedSpec;
        rawHtml = jsonLdResult.rawHtml;
        console.log(`  ✅ Tier 2 Harvester: Schema.org / OpenGraph extraction succeeded.`);
      }
    } catch (err: any) {
      console.log(`  ⚠️ Tier 2 bypass (${err.message}).`);
    }
  }

  // Fallback mock if completely unreachable
  if (!partialSpec?.title) {
    console.log(`  ℹ️ Live URL unreachable. Using default product demo profile.`);
    partialSpec = {
      title: "European White Oak Hardwood Flooring",
      vendor: "LuxeFloor",
      description: "Authentic wire-brushed European White Oak engineered hardwood planks.",
      bulletPoints: ["100% Waterproof", "Click-Lock DIY Interlocking", "AC4 Commercial Grade"],
      price: 79.99,
      compareAtPrice: 119.99,
      currency: "USD",
      inStock: true,
      assets: [{ id: "a1", url: "https://luxefloor.com/oak.png", type: "hero_packshot", isPrimary: true }],
      variants: [],
      topReviews: [],
    };
  }

  const brand = await harvestBrandDNA({
    domain,
    html: rawHtml,
    brandNameFallback: partialSpec.vendor,
  });

  const classification = classifyProductTypology({
    title: partialSpec.title,
    description: partialSpec.description,
    vendor: partialSpec.vendor,
    bulletPoints: partialSpec.bulletPoints,
  });

  const fullProductSpec: ProductSpec = {
    id: partialSpec.id || `prod_${Date.now()}`,
    sourceUrl: targetUrl,
    title: partialSpec.title,
    vendor: partialSpec.vendor || brand.name,
    description: partialSpec.description || "",
    bulletPoints: partialSpec.bulletPoints || [],
    price: partialSpec.price || 0,
    compareAtPrice: partialSpec.compareAtPrice,
    currency: partialSpec.currency || "USD",
    inStock: partialSpec.inStock ?? true,
    typology: classification.typology,
    typologySpecifics: classification.typologySpecifics,
    brand,
    variants: partialSpec.variants || [],
    assets: partialSpec.assets || [],
    topReviews: partialSpec.topReviews || [],
    scrapedAt: new Date().toISOString(),
  };

  return { productSpec: fullProductSpec, brand };
}

// ============================================================
// CLI Subcommands
// ============================================================

async function runScrapeCommand(url: string, args: any) {
  const { productSpec, brand } = await harvestUrl(url);

  if (args.json) {
    console.log(JSON.stringify({ productSpec, brand }, null, 2));
    return;
  }

  console.log("\n--- EXTRACTED PRODUCT SPECIFICATION ---");
  console.log(`Title       : ${productSpec.title}`);
  console.log(`Vendor      : ${productSpec.vendor}`);
  console.log(`Price       : $${productSpec.price.toFixed(2)}${productSpec.compareAtPrice ? ` (Was $${productSpec.compareAtPrice.toFixed(2)})` : ""}`);
  console.log(`Typology    : ${productSpec.typology.toUpperCase()}`);
  console.log(`Rating      : ${productSpec.rating || "N/A"} (${productSpec.reviewCount || 0} reviews)`);
  console.log(`Assets      : ${productSpec.assets.length} images extracted`);
  console.log(`Brand Colors: Primary ${brand.primaryColor} | Secondary ${brand.secondaryColor}`);
  console.log(`Bullets     :`);
  productSpec.bulletPoints.forEach((b, i) => console.log(`  ${i + 1}. ${b}`));

  if (args.out) {
    const outPath = path.resolve(process.cwd(), args.out);
    fs.writeFileSync(outPath, JSON.stringify({ productSpec, brand }, null, 2));
    console.log(`\n💾 Saved product spec JSON to: ${outPath}`);
  }
}

async function runScriptCommand(url: string, args: any) {
  const { productSpec } = await harvestUrl(url);

  const archetype: VideoArchetype = args.archetype || "viral_ugc";
  const channel: TargetDistributionChannel = args.channel || "tiktok_shop";
  const aspectRatio: AdAspectRatio = args.aspect || "9:16";

  console.log(`\n🎬 Compiling script [${archetype.toUpperCase()}] for channel [${channel}] (${aspectRatio})...`);
  const script = compileAdScript({
    productSpec,
    archetype,
    targetChannel: channel,
    aspectRatio,
    durationSeconds: 20,
    promoCode: args.promo || "TIKTOK15",
  });

  console.log(`\n--- COMMERCIAL SCRIPT: ${script.hookHeadline} ---`);
  console.log(`Target Channel: ${script.targetChannel} | Ratio: ${script.aspectRatio} | Length: ${script.durationSeconds}s`);
  console.log(`Call to Action: ${script.callToAction}`);
  if (script.discountPercentage) console.log(`Discount Badge: ${script.discountPercentage}% OFF`);

  console.log("\n--- SCENE CHOREOGRAPHY ---");
  script.scenes.forEach((scene, i) => {
    console.log(`\n[SCENE ${i + 1}: ${scene.sceneType.toUpperCase()}] (${(scene.startFrame / 30).toFixed(1)}s - ${((scene.startFrame + scene.durationFrames) / 30).toFixed(1)}s)`);
    console.log(`  Headline   : ${scene.headline}`);
    if (scene.subheadline) console.log(`  Subhead    : ${scene.subheadline}`);
    if (scene.voiceoverScript) console.log(`  Voiceover  : "${scene.voiceoverScript}"`);
    console.log(`  SFX Audio  : ${scene.sfxTag || "None"}`);
    if (scene.featureBadgeText) console.log(`  Badge      : ${scene.featureBadgeText}`);
  });
}

async function runRenderCommand(url: string, args: any) {
  const { productSpec } = await harvestUrl(url);
  const archetype: VideoArchetype = args.archetype || "viral_ugc";
  const aspectRatio: AdAspectRatio = args.aspect || "9:16";
  const outputFileName = args.out || `out/commercial-${Date.now()}.mp4`;

  console.log(`\n🎬 Compiling script for headless Remotion render...`);
  const script = compileAdScript({
    productSpec,
    archetype,
    targetChannel: aspectRatio === "16:9" ? "amazon_listing" : "tiktok_shop",
    aspectRatio,
    durationSeconds: 20,
    promoCode: args.promo || "SAVE20",
  });

  const compositionId =
    aspectRatio === "9:16"
      ? "ProductAd-Vertical"
      : aspectRatio === "1:1"
      ? "ProductAd-Square"
      : "ProductAd-Landscape";

  const inputProps = {
    productSpec,
    script,
    aspectRatio,
    audioMode: "voiceover_tts",
    musicBedUrl: "/music/energetic_upbeat.mp3",
    showSafeZones: false,
  };

  const outDir = path.dirname(path.resolve(process.cwd(), outputFileName));
  fs.mkdirSync(outDir, { recursive: true });

  const tempPropsFile = path.resolve(outDir, `props-${Date.now()}.json`);
  fs.writeFileSync(tempPropsFile, JSON.stringify(inputProps, null, 2));

  console.log(`🎥 Rendering Remotion composition [${compositionId}] (${script.totalFrames} frames)...`);
  const normalizedProps = tempPropsFile.replace(/\\/g, "/");
  const normalizedOut = path.resolve(process.cwd(), outputFileName).replace(/\\/g, "/");

  const cmd = `npx remotion render src/remotion/Root.tsx ${compositionId} "${normalizedOut}" --props="${normalizedProps}"`;
  console.log(`   Running: ${cmd}`);

  try {
    await execAsync(cmd, { cwd: process.cwd(), timeout: 600000 });
    console.log(`\n✅ Commercial video successfully rendered!`);
    console.log(`📁 File: ${normalizedOut}`);
  } catch (err: any) {
    console.error(`❌ Remotion render failed:`, err.message);
  } finally {
    if (fs.existsSync(tempPropsFile)) fs.unlinkSync(tempPropsFile);
  }
}

async function runLintCommand(text: string, args: any) {
  console.log(`🔍 Checking copy compliance for: "${text}"`);
  const report = lintAdCopy(text, {
    channel: args.channel || "amazon_listing",
    isPaidSponsorship: args.ad === true,
    isSupplementOrCosmetic: args.fda === true,
  });

  console.log(`\nCompliance: ${report.isCompliant ? "✅ PASS" : "❌ VIOLATION DETECTED"}`);
  if (report.violations.length > 0) {
    console.log(`\nViolations (${report.violations.length}):`);
    report.violations.forEach((v, i) => {
      console.log(`  ${i + 1}. [${v.severity.toUpperCase()}] Term: "${v.term}" — ${v.reason}`);
      if (v.replacement) console.log(`     Suggested replacement: "${v.replacement}"`);
    });
  }

  console.log(`\nSanitized Copy: "${report.sanitizedText}"`);
  if (report.injectedDisclaimers.length > 0) {
    console.log(`\nInjected Disclaimers:`);
    report.injectedDisclaimers.forEach((d) => console.log(`  • ${d}`));
  }
}

// ============================================================
// Main CLI Router
// ============================================================

async function main() {
  printBanner();
  const argv = minimist(process.argv.slice(2));
  const command = argv._[0];

  if (command === "scrape") {
    const url = argv._[1];
    if (!url) {
      console.error("Usage: npx tsx scripts/ecommerce-cli.ts scrape <url> [--json] [--out=spec.json]");
      process.exit(1);
    }
    await runScrapeCommand(url, argv);
  } else if (command === "script") {
    const url = argv._[1];
    if (!url) {
      console.error("Usage: npx tsx scripts/ecommerce-cli.ts script <url> [--archetype=viral_ugc] [--aspect=9:16]");
      process.exit(1);
    }
    await runScriptCommand(url, argv);
  } else if (command === "render") {
    const url = argv._[1];
    if (!url) {
      console.error("Usage: npx tsx scripts/ecommerce-cli.ts render <url> [--out=output.mp4] [--aspect=9:16]");
      process.exit(1);
    }
    await runRenderCommand(url, argv);
  } else if (command === "lint") {
    const text = argv._[1] || argv.text;
    if (!text) {
      console.error("Usage: npx tsx scripts/ecommerce-cli.ts lint \"text to check\" [--channel=amazon_listing]");
      process.exit(1);
    }
    await runLintCommand(text, argv);
  } else {
    // Interactive Prompt Mode
    const response = await prompts({
      type: "select",
      name: "action",
      message: "Select an E-Commerce Studio action:",
      choices: [
        { title: "🌐 Harvest Storefront DNA (Shopify / Amazon / WooCommerce)", value: "scrape" },
        { title: "🎬 Synthesize Commercial Video Script", value: "script" },
        { title: "🛡️ Amazon TOS & Regulatory Compliance Linter", value: "lint" },
        { title: "🎥 Headless Remotion Video Ad Render", value: "render" },
        { title: "🚪 Exit", value: "exit" },
      ],
    });

    if (response.action === "exit" || !response.action) {
      process.exit(0);
    }

    if (response.action === "scrape" || response.action === "script" || response.action === "render") {
      const urlPrompt = await prompts({
        type: "text",
        name: "url",
        message: "Enter product URL:",
        initial: "https://luxefloor.com/products/natural-oak",
      });

      if (!urlPrompt.url) process.exit(0);

      if (response.action === "scrape") await runScrapeCommand(urlPrompt.url, argv);
      else if (response.action === "script") await runScriptCommand(urlPrompt.url, argv);
      else if (response.action === "render") await runRenderCommand(urlPrompt.url, argv);
    } else if (response.action === "lint") {
      const textPrompt = await prompts({
        type: "text",
        name: "text",
        message: "Enter copy to check:",
        initial: "The #1 best seller headphones on the market. Visit our website for 100% money back guarantee!",
      });
      if (textPrompt.text) await runLintCommand(textPrompt.text, argv);
    }
  }
}

main().catch((err) => {
  console.error("Fatal CLI error:", err);
  process.exit(1);
});
