/**
 * src/components/editor/shared/visuals/__tests__/turntableStudio.test.ts
 *
 * Unit tests for Neural Product Turntable Studio:
 * 1. 24+ Contextual Environment catalog across 9 realms and auto-matching classifier.
 * 2. 6 Staging archetypes (material swatch, paint finish, apparel mannequin, persona orbit, podium, showroom).
 * 3. Dual-engine prompt compiler (MiniMax H3 with rigid-body locks vs Google Veo 3.1 orbit phrasing).
 * 4. Scene data model transitions and state recovery.
 */

import { describe, it, expect } from "vitest";
import {
  TURNTABLE_ENVIRONMENT_TEMPLATES,
  TURNTABLE_REALMS,
  getTurntableEnvironmentById,
  resolveContextualEnvironment,
} from "@/lib/ecommerce/turntableEnvironmentEngine";
import {
  TURNTABLE_STAGING_ARCHETYPES,
  TURNTABLE_CAMERA_ELEVATIONS,
  getTurntableCameraElevations,
  detectStagingArchetype,
  compileTurntablePrompt,
} from "@/lib/ecommerce/turntablePromptCompiler";
import {
  extractDefaultRadarPins,
  formatRadarLabel,
} from "@/lib/ecommerce/turntableRadarEngine";
import {
  generateZeroDependencyEmbedSnippet,
  generateShopifyLiquidSnippet,
  generateShopifyCollectionCardSnippet,
  generateSpritesheetEmbedSnippet,
} from "@/lib/ecommerce/turntableExportEngine";
import {
  getTurntableAmbientTrack,
  compileTurntableSfxTriggers,
} from "@/lib/ecommerce/turntableAudioEngine";
import { AdScene, ExtractedProductAsset, ProductSpecification, ProductSpec } from "@/lib/types/ecommerce";

describe("Neural Product Turntable Studio", () => {
  describe("1. Contextual Environment Engine & Catalog", () => {
    it("contains at least 24 verified environment templates across 9 realms", () => {
      expect(TURNTABLE_ENVIRONMENT_TEMPLATES.length).toBeGreaterThanOrEqual(24);
      expect(TURNTABLE_REALMS.length).toBe(9);

      // Verify every template has all mandatory properties
      TURNTABLE_ENVIRONMENT_TEMPLATES.forEach((tpl) => {
        expect(tpl.id).toBeDefined();
        expect(tpl.name).toBeTruthy();
        expect(tpl.realm).toBeTruthy();
        expect(tpl.icon).toBeTruthy();
        expect(tpl.tagline).toBeTruthy();
        expect(tpl.promptDescription).toBeTruthy();
        expect(Array.isArray(tpl.idealKeywords)).toBe(true);
        expect(tpl.idealKeywords.length).toBeGreaterThan(0);
      });
    });

    it("retrieves environment template by ID with safe lookup", () => {
      const rooftop = getTurntableEnvironmentById("rooftop_skyline");
      expect(rooftop).toBeDefined();
      expect(rooftop?.id).toBe("rooftop_skyline");
      expect(rooftop?.realm).toBe("urban_travel");

      const unknown = getTurntableEnvironmentById("non_existent_id");
      expect(unknown).toBeUndefined();
    });

    it("auto-matches suitcase and luggage to Urban & Travel (Rooftop City Skyline)", () => {
      const matched = resolveContextualEnvironment(
        { title: "Rimowa Aluminium Cabin Suitcase", description: "Hardshell spinner luggage" } as ProductSpecification,
        "Aviation Luggage"
      );
      expect(matched.id).toBe("rooftop_skyline");
      expect(matched.realm).toBe("urban_travel");
    });

    it("auto-matches trail running sneakers to Outdoor & Adventure (Waterfall Mountain Road)", () => {
      const matched = resolveContextualEnvironment(
        { title: "Gore-Tex Trail Runner 3", description: "All-terrain waterproof running shoe" } as ProductSpecification,
        "Performance Sneakers"
      );
      expect(matched.id).toBe("waterfall_nature_road");
      expect(matched.realm).toBe("outdoor_adventure");
    });

    it("auto-matches espresso maker to Culinary & Gourmet (Artisanal Espresso Bar)", () => {
      const matched = resolveContextualEnvironment(
        { title: "Barista Touch Espresso Machine", description: "Dual boiler coffee grinder" } as ProductSpecification,
        "Espresso Maker"
      );
      expect(matched.id).toBe("artisanal_espresso_bar");
      expect(matched.realm).toBe("culinary_gourmet");
    });

    it("auto-matches luxury chronometer to Luxury & Evening (Obsidian VIP Lounge)", () => {
      const matched = resolveContextualEnvironment(
        { title: "Royal Oak Chronograph 41mm", description: "18k rose gold sapphire watch" } as ProductSpecification,
        "Automatic Luxury Watch"
      );
      expect(matched.id).toBe("obsidian_vip_lounge");
      expect(matched.realm).toBe("luxury_nightlife");
    });

    it("auto-matches hardwood flooring and tiles to Architecture & Interior (Sunlit Architectural Villa)", () => {
      const matched = resolveContextualEnvironment(
        { title: "European White Oak Engineered Flooring", description: "Brushed matte polyurethane plank" } as ProductSpecification,
        "Hardwood Floor Planks"
      );
      expect(matched.id).toBe("sunlit_modern_villa");
      expect(matched.realm).toBe("architecture_interior");
    });

    it("auto-matches silk evening gown to Fashion & Runway (Parisian Fashion Atelier)", () => {
      const matched = resolveContextualEnvironment(
        { title: "Mulberry Silk Bias Cut Evening Dress", description: "Haute couture formal garment" } as ProductSpecification,
        "Silk Dress"
      );
      expect(matched.id).toBe("parisian_atelier");
      expect(matched.realm).toBe("fashion_runway");
    });

    it("auto-matches skincare serum to Spa & Wellness (Botanical Spa)", () => {
      const matched = resolveContextualEnvironment(
        { title: "Hyaluronic Acid Glow Drops", description: "Organic botanical facial serum" } as ProductSpecification,
        "Skin Serum"
      );
      expect(matched.id).toBe("botanical_spa");
      expect(matched.realm).toBe("wellness_spa");
    });

    it("auto-matches unknown generic item to Obsidian VIP Lounge as graceful fallback", () => {
      const matched = resolveContextualEnvironment(
        { title: "Item XYZ-9000", description: "Unspecified component" } as ProductSpecification,
        "Generic Object"
      );
      expect(matched.id).toBe("obsidian_vip_lounge");
    });
  });

  describe("2. Staging Archetypes & Auto-Detection", () => {
    it("defines 7 tailored staging archetypes covering irregular objects and personas", () => {
      expect(TURNTABLE_STAGING_ARCHETYPES.length).toBe(7);
      const keys = TURNTABLE_STAGING_ARCHETYPES.map((a) => a.id);
      expect(keys).toContain("material_swatch");
      expect(keys).toContain("paint_finish");
      expect(keys).toContain("apparel_mannequin");
      expect(keys).toContain("persona_orbit");
      expect(keys).toContain("podium_pedestal");
      expect(keys).toContain("showroom_floor");
      expect(keys).toContain("exploded_view");
    });

    it("detects material_swatch for flooring planks, tiles, slabs, and stone", () => {
      expect(detectStagingArchetype(undefined, "White Oak Hardwood Flooring Plank")).toBe("material_swatch");
      expect(detectStagingArchetype({ title: "Carrara Marble Subway Tile" } as any, "")).toBe("material_swatch");
      expect(detectStagingArchetype({ description: "Granite kitchen countertop slab" } as any, "")).toBe("material_swatch");
    });

    it("detects paint_finish for liquid paint cans, lacquers, primers, and stains", () => {
      expect(detectStagingArchetype(undefined, "Interior Matte Eggshell Wall Paint")).toBe("paint_finish");
      expect(detectStagingArchetype({ title: "Clear Gloss Marine Wood Varnish Lacquer" } as any, "")).toBe("paint_finish");
      expect(detectStagingArchetype({ description: "High-adhesion acrylic primer coat" } as any, "")).toBe("paint_finish");
    });

    it("detects apparel_mannequin for clothes, jackets, hoodies, and dresses", () => {
      expect(detectStagingArchetype(undefined, "Waterproof Outdoor Shell Jacket")).toBe("apparel_mannequin");
      expect(detectStagingArchetype({ title: "Heavyweight Cotton Fleece Hoodie" } as any, "")).toBe("apparel_mannequin");
      expect(detectStagingArchetype({ description: "Tailored wool suit trousers" } as any, "")).toBe("apparel_mannequin");
    });

    it("detects showroom_floor for sofas, tables, beds, and heavy furniture", () => {
      expect(detectStagingArchetype(undefined, "Mid-Century Modern Sectional Sofa")).toBe("showroom_floor");
      expect(detectStagingArchetype({ title: "Solid Walnut Dining Table" } as any, "")).toBe("showroom_floor");
    });

    it("detects podium_pedestal as default for packshot bottles, electronics, and accessories", () => {
      expect(detectStagingArchetype(undefined, "Ceramic Matte Coffee Mug")).toBe("podium_pedestal");
      expect(detectStagingArchetype(undefined, "Wireless Noise-Canceling Earbuds")).toBe("podium_pedestal");
      expect(detectStagingArchetype(undefined, "Chronograph Titanium Watch")).toBe("podium_pedestal");
    });
  });

  describe("3. Dual-Engine Typology-Aware Prompt Compiler", () => {
    const baseParams = {
      productName: "AeroGlide Titanium Chronograph",
      brandName: "Horology Lab",
      stagingArchetype: "podium_pedestal" as const,
      motionPreset: "loop_360" as const,
      pedestalStyle: "obsidian_black" as const,
      lightingStyle: "luxury_gold" as const,
      environmentId: "obsidian_vip_lounge",
      environmentPrompt: "Ultra-luxury executive penthouse lounge, dark fluted marble walls",
      aspectRatio: "9:16" as const,
    };

    it("compiles MiniMax H3 prompt with rigid-body locks and dry studio negative rules", () => {
      const prompt = compileTurntablePrompt({
        ...baseParams,
        engine: "minimax_h3",
        stepMode: "tao_2step",
      });

      expect(prompt).toContain("AeroGlide Titanium Chronograph");
      expect(prompt).toContain("Ultra-luxury executive penthouse lounge");
      expect(prompt).toContain("single monolithic rigid solid body: all components are permanently locked and rotate in exact 100% synchronized unison");
      expect(prompt).toContain("Zero water droplets, zero mist, zero water bubbles, zero condensation");
      expect(prompt).toContain("overall_soundscape: Quiet luxury commercial studio room, pristine silence.");
    });

    it("compiles Google Veo 3.1 prompt with cinematic 360-degree orbit camera language", () => {
      const prompt = compileTurntablePrompt({
        ...baseParams,
        engine: "veo_3_1",
      });

      expect(prompt).toContain("Cinematic 8k commercial showcase of AeroGlide Titanium Chronograph.");
      expect(prompt).toContain("Camera executes a smooth continuous full 360-degree circular turnaround rotation");
      expect(prompt).toContain("Background setting: Ultra-luxury executive penthouse lounge");
      expect(prompt).toContain("Shallow depth of field, sharp crisp macro focus");
      expect(prompt).not.toContain("integrated_multimodal_description");
    });

    it("properly renders persona_orbit archetype with presenter details for clothes wearing", () => {
      const prompt = compileTurntablePrompt({
        ...baseParams,
        productName: "Merino Wool Trench Coat",
        stagingArchetype: "persona_orbit",
        personaId: "ruby",
        engine: "minimax_h3",
      });

      expect(prompt).toContain("Professional presenter Ruby is standing gracefully wearing and showcasing the Merino Wool Trench Coat");
      expect(prompt).toContain("camera performs a smooth continuous 360-degree orbital arc sweep around her");
      expect(prompt).toContain("The garment Merino Wool Trench Coat fits naturally onto Ruby with zero fabric jitter and zero mesh deformation");
    });

    it("properly renders material_swatch archetype with angled easel and raking grazing light sweep", () => {
      const prompt = compileTurntablePrompt({
        ...baseParams,
        productName: "Nordic Smoked Oak Flooring Plank",
        stagingArchetype: "material_swatch",
        engine: "minimax_h3",
      });

      expect(prompt).toContain("The authentic sample slab of Nordic Smoked Oak Flooring Plank rests elegantly on an angled 45-degree minimalist architectural display easel.");
      expect(prompt).toContain("Dynamic grazing raking light sweeps smoothly across the surface, highlighting micro-bevels, natural surface texture, authentic grain, and refined finish sheen");
    });

    it("properly renders paint_finish archetype with paint can and dipped sample paddle", () => {
      const prompt = compileTurntablePrompt({
        ...baseParams,
        productName: "Deep Emerald Satin Interior Wall Paint",
        stagingArchetype: "paint_finish",
        engine: "veo_3_1",
      });

      expect(prompt).toContain("The container of Deep Emerald Satin Interior Wall Paint stands proudly on an industrial-clean studio plinth");
      expect(prompt).toContain("accompanying architectural test swatch board and dipped wooden paddle");
      expect(prompt).toContain("dynamic light glints showcasing liquid viscosity, rich color depth, and smooth uniform coverage");
    });
  });

  describe("4. AdScene Data Model & Video Binding Integrity", () => {
    it("correctly models a scene populated with a generated turntable video", () => {
      const scene: AdScene = {
        id: "scene_turntable_1",
        sceneIndex: 0,
        startFrame: 0,
        durationFrames: 155, // 5.16s @ 30fps
        sceneType: "product_turntable",
        headline: "Engineered For Precision",
        visualActionPrompt: "360-degree commercial sweep",
        primaryMediaUrl: "/assets/ecommerce/turntables/watch_turntable_hero_tao_2step_00001.mp4",
        customTurntableVideoUrl: "/assets/ecommerce/turntables/watch_turntable_hero_tao_2step_00001.mp4",
        turntablePreviewGifUrl: "/assets/ecommerce/turntables/watch_preview.gif",
        turntableEngine: "minimax_h3",
        turntableStagingArchetype: "podium_pedestal",
        turntableMotionPreset: "loop_360",
        turntablePedestal: "obsidian_black",
        turntableLighting: "luxury_gold",
        turntableStepMode: "tao_2step",
        turntableEnvironmentId: "obsidian_vip_lounge",
      };

      expect(scene.sceneType).toBe("product_turntable");
      expect(scene.customTurntableVideoUrl).toContain("watch_turntable_hero_tao_2step_00001.mp4");
      expect(scene.turntableEngine).toBe("minimax_h3");
      expect(scene.turntableStagingArchetype).toBe("podium_pedestal");
    });

    it("handles detaching turntable video and reverting to primary photo packshot", () => {
      const initialAssets: ExtractedProductAsset[] = [
        { id: "a1", url: "https://example.com/watch_photo.jpg", type: "hero_packshot", isPrimary: true },
        { id: "a2", url: "/assets/ecommerce/turntables/watch_turntable_hero_tao_2step_00001.mp4", type: "existing_video" },
      ];

      const sceneWithTurntable: AdScene = {
        id: "scene_1",
        sceneIndex: 0,
        startFrame: 0,
        durationFrames: 120,
        sceneType: "product_turntable",
        headline: "Precision Engineered",
        visualActionPrompt: "360-degree turnaround",
        primaryMediaUrl: "/assets/ecommerce/turntables/watch_turntable_hero_tao_2step_00001.mp4",
        customTurntableVideoUrl: "/assets/ecommerce/turntables/watch_turntable_hero_tao_2step_00001.mp4",
      };

      // Revert logic matching handleDetachMediaFromScene
      const defaultPhoto = initialAssets.find((a) => !a.url.endsWith(".mp4"))?.url || "";
      const revertedScene: AdScene = {
        ...sceneWithTurntable,
        customTurntableVideoUrl: undefined,
        primaryMediaUrl: defaultPhoto || sceneWithTurntable.primaryMediaUrl,
      };

      expect(revertedScene.customTurntableVideoUrl).toBeUndefined();
      expect(revertedScene.primaryMediaUrl).toBe("https://example.com/watch_photo.jpg");
    });
  });

  describe("5. Director Camera Elevation & Variant Colorway Prompting", () => {
    it("contains 4 director camera elevation configurations", () => {
      expect(TURNTABLE_CAMERA_ELEVATIONS.length).toBe(4);
      const ids = TURNTABLE_CAMERA_ELEVATIONS.map((c) => c.id);
      expect(ids).toContain("eye_level");
      expect(ids).toContain("high_angle_35");
      expect(ids).toContain("low_angle_hero");
      expect(ids).toContain("macro_detail_orbit");

      const helperElevations = getTurntableCameraElevations();
      expect(helperElevations.length).toBe(4);
    });

    it("injects 35° high-angle perspective into MiniMax H3 and Veo 3.1 prompts", () => {
      const prompt = compileTurntablePrompt({
        engine: "minimax_h3",
        productName: "Air Zoom Pegasus Running Shoes",
        stagingArchetype: "podium_pedestal",
        environmentId: "waterfall_nature_road",
        cameraElevation: "high_angle_35",
      });

      expect(prompt).toContain("high-angle");
      expect(prompt).toContain("35-degree");
    });

    it("injects low-angle hero perspective into prompt", () => {
      const prompt = compileTurntablePrompt({
        engine: "google_veo",
        productName: "Hydration Flask",
        stagingArchetype: "podium_pedestal",
        environmentId: "zen_pebble_garden",
        cameraElevation: "low_angle_hero",
      });

      expect(prompt).toContain("low-angle");
      expect(prompt).toContain("hero");
    });

    it("injects product variant and colorway into prompt conditioning", () => {
      const prompt = compileTurntablePrompt({
        engine: "minimax_h3",
        productName: "Aero Pro Wireless Headphones",
        stagingArchetype: "podium_pedestal",
        environmentId: "minimal_grey_concrete",
        variantTitle: "Midnight Onyx",
        variantColorHex: "#09090b",
      });

      expect(prompt).toContain("Midnight Onyx");
      expect(prompt).toContain("#09090b");
    });
  });

  describe("6. Dynamic Feature Radar Pin Extraction Engine", () => {
    const mockSpec = {
      title: "HyperFlight Carbon Road Helmet",
      vendor: "AeroTech",
      description: "Ultralight aerodynamic cycling helmet with MIPS rotational impact protection.",
      bulletPoints: [
        "Aerodynamic Carbon Fiber Shell with 18 High-Flow Wind Tunnel Vents",
        "MIPS Spherical Brain Protection System redirects rotational forces",
        "Ionic+ Antimicrobial Padding with Fidlock Magnetic Buckle",
      ],
      price: 280,
      currency: "USD",
      brand: {
        name: "AeroTech",
        domain: "aerotech.com",
        primaryColor: "#06b6d4",
        secondaryColor: "#f43f5e",
        surfaceColor: "#09090b",
        logoUrl: null,
        faviconUrl: null,
        appleTouchIconUrl: null,
        toneOfVoice: "authoritative_clinical",
        taglines: [],
      },
    } as unknown as ProductSpec;

    it("extracts 3 formatted radar pins with staggered entrances from product specs", () => {
      const pins = extractDefaultRadarPins(mockSpec, "#06b6d4", 240);

      expect(pins.length).toBe(3);

      // Pins have staggered entrances
      expect(pins[0].startFrame).toBe(8);
      expect(pins[1].startFrame).toBe(60);
      expect(pins[2].startFrame).toBe(120);

      // Pins avoid the center packshot (x != 50%) and bottom captions (y < 80%)
      pins.forEach((p) => {
        expect(Math.abs(p.x - 50)).toBeGreaterThan(15);
        expect(p.y).toBeLessThan(80);
        expect(["#06b6d4", "#f59e0b", "#10b981"]).toContain(p.pulseColor);
        expect(p.label).toBeTruthy();
        expect(p.label).toBe(p.label.toUpperCase());
      });
    });

    it("formats punchy, clean uppercase HUD labels", () => {
      const clean1 = formatRadarLabel("• 100% Genuine Full-Grain Leather Outer: handcrafted finish");
      expect(clean1).toBe("100% GENUINE FULL-GRAIN LEATHER");

      const clean2 = formatRadarLabel("🚀 Dual-Stage Active Noise Cancellation (ANC)");
      expect(clean2).toBe("DUAL-STAGE ACTIVE NOISE CANCELLATION");
    });

    it("provides fallback radar pins when no bullet points are present", () => {
      const fallbackSpec = {
        title: "Ceramic Minimalist Mug",
        vendor: "Studio Clay",
        description: "Matte stoneware cup",
        price: 35,
        currency: "USD",
      } as unknown as ProductSpec;

      const pins = extractDefaultRadarPins(fallbackSpec, "#f59e0b", 180);
      expect(pins.length).toBe(3);
      expect(pins[0].label).toContain("CERAMIC MINIMALIST MUG");
      expect(pins[0].pulseColor).toBe("#f59e0b");
    });
  });

  describe("7. Omnichannel 360° Export Media Kit & Zero-Dependency Snippet", () => {
    const embedOptions = {
      videoUrl: "https://storage.newsstudio.io/videos/turntable_360.mp4",
      productName: "HyperFlight Carbon Helmet",
      posterUrl: "https://storage.newsstudio.io/images/helmet_poster.jpg",
      accentColor: "#06b6d4",
      aspectRatio: "1:1" as const,
      showRotateBadge: true,
    };

    it("generates a 100% self-contained, zero-dependency HTML/JS snippet", () => {
      const snippet = generateZeroDependencyEmbedSnippet(embedOptions);

      // Verify zero external CDN script dependencies
      expect(snippet).not.toContain("<script src=");
      expect(snippet).not.toContain("three.js");
      expect(snippet).not.toContain("unpkg.com");
      expect(snippet).not.toContain("cdnjs.cloudflare.com");

      // Verify HTML5 video scrubbing logic
      expect(snippet).toContain("<video");
      expect(snippet).toContain(embedOptions.videoUrl);
      expect(snippet).toContain("currentTime");
      expect(snippet).toContain("pointerdown");
      expect(snippet).toContain("pointermove");
      expect(snippet).toContain("pointerup");
      expect(snippet).toContain("touch-action: none");
      expect(snippet).toContain("Drag To Spin 360°");
    });

    it("generates a complete Shopify Liquid section template", () => {
      const shopifyCode = generateShopifyLiquidSnippet(embedOptions);

      expect(shopifyCode).toContain("{% schema %}");
      expect(shopifyCode).toContain("{% endschema %}");
      expect(shopifyCode).toContain("section.settings.turntable_video_url");
      expect(shopifyCode).toContain("pointerdown");
    });

    it("generates a zero-dependency Shopify Collection Card hover-to-spin snippet", () => {
      const cardSnippet = generateShopifyCollectionCardSnippet(embedOptions);

      // Verify zero external CDN script dependencies
      expect(cardSnippet).not.toContain("<script src=");
      expect(cardSnippet).not.toContain("three.js");
      expect(cardSnippet).not.toContain("unpkg.com");

      // Verify hover interactions
      expect(cardSnippet).toContain("ns-card-360-wrapper");
      expect(cardSnippet).toContain("mouseenter");
      expect(cardSnippet).toContain("mouseleave");
      expect(cardSnippet).toContain("product-card-360-hover");
    });

    it("generates a 24-frame HTML5 Canvas spritesheet scrubber snippet", () => {
      const spriteSnippet = generateSpritesheetEmbedSnippet({
        ...embedOptions,
        totalFrames: 24,
      });

      // Verify zero external dependencies
      expect(spriteSnippet).not.toContain("<script src=");
      expect(spriteSnippet).not.toContain("three.js");

      // Verify canvas scrubber setup
      expect(spriteSnippet).toContain("<canvas");
      expect(spriteSnippet).toContain("totalFrames = 24");
      expect(spriteSnippet).toContain("isDragging");
      expect(spriteSnippet).toContain("mousedown");
      expect(spriteSnippet).toContain("touchstart");
    });
  });

  describe("8. Exploded / Disassembled View Engineering Transformation", () => {
    it("auto-detects exploded_view from engineering and teardown keywords", () => {
      const spec = {
        title: "Titanium Mechanical Watch",
        description: "Deconstructed exploded view showcasing Swiss movement gears and escapement",
      } as unknown as ProductSpec;

      const detected = detectStagingArchetype(spec);
      expect(detected).toBe("exploded_view");
    });

    it("compiles 2-stage deconstruction motion kinematics prompt", () => {
      const prompt = compileTurntablePrompt({
        productName: "Aerospace Drone Motor",
        category: "discrete_object",
        stagingArchetype: "exploded_view",
      });

      expect(prompt).toContain("engineering 2-stage deconstruction");
      expect(prompt).toContain("exploded floating internal components");
      expect(prompt).toContain("continuous 360-degree rotation");
      expect(prompt).toContain("zero shape morphing");
    });
  });

  describe("9. Spatial Foley Audio & Contextual Soundscapes Engine", () => {
    it("resolves contextual ambient soundscapes matching environment realms", () => {
      const urbanAmbience = getTurntableAmbientTrack("rooftop_skyline");
      expect(urbanAmbience.realm).toBe("urban_travel");
      expect(urbanAmbience.defaultVolume).toBe(0.25);

      const natureAmbience = getTurntableAmbientTrack("waterfall_nature_road");
      expect(natureAmbience.realm).toBe("outdoor_adventure");

      const cafeAmbience = getTurntableAmbientTrack("artisanal_espresso_bar");
      expect(cafeAmbience.realm).toBe("culinary_gourmet");
    });

    it("compiles synchronized foley cues and radar hotspot chimes", () => {
      const scene: AdScene = {
        id: "scene_0",
        sceneIndex: 0,
        sceneType: "product_turntable",
        headline: "TITANIUM CHRONO",
        visualActionPrompt: "Turntable 360 rotation",
        primaryMediaUrl: "/media/test.mp4",
        startFrame: 0,
        durationFrames: 155,
        turntableAudioAmbient: true,
        turntableAudioFoley: true,
        turntableAudioChimes: true,
        enableSpecularSheen: true,
        turntableSocialProof: {
          showScarcityTicker: true,
          scarcityText: "⚡ ONLY 7 LEFT",
        },
        turntableRadarPins: [
          {
            id: "pin_1",
            x: 30,
            y: 40,
            label: "SAPPHIRE GLASS",
            startFrame: 15,
            durationFrames: 100,
          },
        ],
      };

      const triggers = compileTurntableSfxTriggers(scene, 0);

      // Verify mechanical servo spin trigger
      const servo = triggers.find((t) => t.sfxId === "servo_spin");
      expect(servo).toBeDefined();
      expect(servo?.triggerFrame).toBe(4);

      // Verify specular light sweep shimmer
      const shimmer = triggers.find((t) => t.sfxId === "shimmer");
      expect(shimmer).toBeDefined();
      expect(shimmer?.triggerFrame).toBe(12);

      // Verify radar pin chime
      const radarPing = triggers.find((t) => t.sfxId === "radar_blip");
      expect(radarPing).toBeDefined();
      expect(radarPing?.triggerFrame).toBe(15);

      // Verify scarcity pop
      const pop = triggers.find((t) => t.sfxId === "pop");
      expect(pop).toBeDefined();
      expect(pop?.triggerFrame).toBe(14);
    });
  });
});
