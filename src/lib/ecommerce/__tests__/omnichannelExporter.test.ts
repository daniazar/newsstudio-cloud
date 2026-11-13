import { describe, it, expect, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import {
  adaptPropsForAspectRatio,
  OMNICHANNEL_FORMATS,
  renderOmnichannelBatch,
} from "../omnichannelExporter";
import { parseArgs } from "../../../../scripts/ecommerce-ad-cli";
import { ProductSpec, AdScript, ProductAdCompositionProps } from "@/lib/types/ecommerce";

const mockProduct: ProductSpec = {
  id: "omni_test_prod",
  sourceUrl: "https://testbrand.com/shoes",
  title: "CloudFlow Ultralight Running Shoes",
  vendor: "CloudFlow Athletics",
  description: "Experience effortless motion with carbon fiber plates.",
  bulletPoints: ["Zero gravity cushion", "Breathable mesh", "100% Recycled"],
  price: 139.99,
  compareAtPrice: 179.99,
  currency: "USD",
  inStock: true,
  rating: 4.9,
  reviewCount: 312,
  typology: "surface_material",
  brand: {
    name: "CloudFlow Athletics",
    domain: "cloudflow.com",
    logoUrl: null,
    faviconUrl: null,
    appleTouchIconUrl: null,
    primaryColor: "#06b6d4",
    secondaryColor: "#f43f5e",
    surfaceColor: "#09090b",
    toneOfVoice: "playful_hype",
    taglines: ["Defy Gravity"],
  },
  variants: [],
  assets: [],
  topReviews: [],
  scrapedAt: new Date().toISOString(),
};

const mockScript: AdScript = {
  id: "script_omni_test",
  archetype: "viral_ugc",
  targetChannel: "tiktok_shop",
  aspectRatio: "9:16",
  durationSeconds: 15,
  totalFrames: 450,
  fps: 30,
  scenes: [
    {
      id: "sc_1",
      sceneIndex: 0,
      startFrame: 0,
      durationFrames: 150,
      sceneType: "before_after_wipe",
      headline: "Tired of Heavy Shoes?",
      subheadline: "Meet CloudFlow",
      visualActionPrompt: "Shoe flex",
      primaryMediaUrl: "https://example.com/shoes.jpg",
      sfxTag: "[sfx:whoosh]",
      voiceoverScript: "Tired of heavy running shoes weighing you down?",
    },
  ],
  hookHeadline: "Tired of Heavy Shoes?",
  callToAction: "SHOP NOW • 25% OFF",
  discountPercentage: 25,
};

const mockBaseProps: ProductAdCompositionProps = {
  productSpec: mockProduct,
  script: mockScript,
  aspectRatio: "9:16",
  audioMode: "voiceover_tts",
  presenter: {
    enabled: true,
    personaId: "ruby",
    position: "bottom_right",
    scale: 1.0,
    showNameBadge: true,
  },
};

const testOutDir = path.join(process.cwd(), "renders", "test_omnichannel_bundle");

describe("1-Click Multi-Aspect Omnichannel Exporter Unit Tests", () => {
  afterAll(() => {
    if (fs.existsSync(testOutDir)) {
      fs.rmSync(testOutDir, { recursive: true, force: true });
    }
  });

  it("OMNICHANNEL_FORMATS covers all 3 commercial formats", () => {
    expect(OMNICHANNEL_FORMATS).toHaveLength(3);
    const keys = OMNICHANNEL_FORMATS.map((f) => f.key);
    expect(keys).toContain("vertical");
    expect(keys).toContain("landscape");
    expect(keys).toContain("square");

    const compIds = OMNICHANNEL_FORMATS.map((f) => f.compositionId);
    expect(compIds).toContain("ProductAd-Vertical");
    expect(compIds).toContain("ProductAd-Landscape");
    expect(compIds).toContain("ProductAd-Square");
  });

  it("adaptPropsForAspectRatio adapts scale and script ratio per format", () => {
    const verticalProps = adaptPropsForAspectRatio(mockBaseProps, "9:16");
    expect(verticalProps.aspectRatio).toBe("9:16");
    expect(verticalProps.script.aspectRatio).toBe("9:16");
    expect(verticalProps.presenter?.scale).toBe(1.0);

    const squareProps = adaptPropsForAspectRatio(mockBaseProps, "1:1");
    expect(squareProps.aspectRatio).toBe("1:1");
    expect(squareProps.script.aspectRatio).toBe("1:1");
    expect(squareProps.presenter?.scale).toBeLessThanOrEqual(0.88);

    const landscapeProps = adaptPropsForAspectRatio(mockBaseProps, "16:9");
    expect(landscapeProps.aspectRatio).toBe("16:9");
    expect(landscapeProps.script.aspectRatio).toBe("16:9");
    expect(landscapeProps.presenter?.scale).toBeLessThanOrEqual(0.92);
  });

  it("renderOmnichannelBatch creates manifest, CSVs, and video entries in dry-run mode", async () => {
    const bundle = await renderOmnichannelBatch({
      productSpec: mockProduct,
      script: mockScript,
      presenter: mockBaseProps.presenter,
      outputDir: testOutDir,
      dryRun: true,
    });

    expect(bundle).toBeDefined();
    expect(bundle.campaignId).toContain("cmp_omni_test_prod");
    expect(bundle.videos.vertical).toBeDefined();
    expect(bundle.videos.landscape).toBeDefined();
    expect(bundle.videos.square).toBeDefined();

    expect(bundle.videos.vertical?.resolution).toBe("1080x1920");
    expect(bundle.videos.landscape?.resolution).toBe("1920x1080");
    expect(bundle.videos.square?.resolution).toBe("1080x1080");

    expect(fs.existsSync(bundle.files.metaCsvPath)).toBe(true);
    expect(fs.existsSync(bundle.files.tiktokCsvPath)).toBe(true);
    expect(fs.existsSync(bundle.files.googlePmaxJsonPath)).toBe(true);
    expect(fs.existsSync(bundle.files.bundleManifestPath)).toBe(true);
  });

  it("parses --omnichannel flag in ecommerce-ad-cli", () => {
    const opts = parseArgs(["--sample=flooring", "--omnichannel"]);
    expect(opts.omnichannel).toBe(true);

    const defaultOpts = parseArgs(["--sample=flooring"]);
    expect(defaultOpts.omnichannel).toBe(false);
  });
});
