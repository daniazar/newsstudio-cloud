import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import {
  HAIR_CATALOG,
  HAIR_COLOR_SWATCHES,
  getHairstyleById,
  getHairstylesByGender,
  getHairstylesByColorFamily,
} from "@/lib/wardrobe/hairCatalog";
import { GET as getHairstylesRoute } from "@/app/api/wardrobe/hairstyles/route";
import {
  generateMiniMaxHairstylePromptText,
  buildHairstyleInpaintPrompt,
  HairstyleInpaintInputs,
} from "@/lib/ai/comfy/hairstyleInpaintWorkflow";
import { preprocessOutfitImage } from "@/lib/ai/comfy/wardrobeInpaintWorkflow";

describe("Dedicated Hairstyle Catalog & Metamorphosis Pipeline", () => {
  // ========================================================
  // 1. DEDICATED HAIRSTYLE CATALOG SUITE
  // ========================================================
  describe("Hairstyle Catalog Data Integrity & Filtering", () => {
    it("contains 18 curated broadcast-grade hairstyles across female, male, and unisex", () => {
      expect(HAIR_CATALOG.length).toBe(18);

      const females = HAIR_CATALOG.filter((h) => h.gender === "female");
      const males = HAIR_CATALOG.filter((h) => h.gender === "male");
      const unisex = HAIR_CATALOG.filter((h) => h.gender === "unisex");

      expect(females.length).toBe(8);
      expect(males.length).toBe(6);
      expect(unisex.length).toBe(4);
    });

    it("verifies every hairstyle entry has required SAM tracking, face-preservation, and 4-panel prompt metadata", () => {
      for (const hair of HAIR_CATALOG) {
        expect(hair.id).toBeTruthy();
        expect(hair.name).toBeTruthy();
        expect(hair.hairColor).toBeTruthy();
        expect(hair.colorFamily).toMatch(/^(blonde|brunette|black|red|silver|platinum)$/);
        expect(hair.hairLength).toMatch(/^(short|medium|long|updo)$/);
        expect(hair.hairTexture).toMatch(/^(straight|wavy|curly|coily|braided)$/);
        expect(hair.samPrompt).toContain("hair");
        expect(hair.facePreservePrompt).toContain("face");
        expect(hair.facePreservePrompt).toContain("eyes");
        expect(hair.facePreservePrompt).toContain("lips");
        expect(hair.cleanGenPrompt).toContain("4-panel multi-view");
        expect(hair.cleanGenPrompt).toContain("#00FF00 green screen");
        expect(hair.imageUrl).toContain("/assets/hairstyles/");
      }
    });

    it("verifies hair color swatches and filters by colorFamily", () => {
      expect(HAIR_COLOR_SWATCHES.length).toBeGreaterThanOrEqual(8);
      for (const swatch of HAIR_COLOR_SWATCHES) {
        expect(swatch.id).toBeTruthy();
        expect(swatch.name).toBeTruthy();
        expect(swatch.hex).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(swatch.promptModifier).toBeTruthy();
        expect(swatch.family).toMatch(/^(blonde|brunette|black|red|silver|platinum)$/);
      }

      const blondes = getHairstylesByColorFamily("blonde");
      expect(blondes.length).toBeGreaterThanOrEqual(2);
      for (const b of blondes) {
        expect(b.colorFamily).toBe("blonde");
      }

      const blacks = getHairstylesByColorFamily("black");
      expect(blacks.length).toBeGreaterThanOrEqual(5);
      for (const bl of blacks) {
        expect(bl.colorFamily).toBe("black");
      }
    });

    it("retrieves hairstyles accurately using getHairstyleById", () => {
      const honeyLob = getHairstyleById("fem_hair_01_honey_blonde_lob");
      expect(honeyLob).toBeDefined();
      expect(honeyLob?.name).toBe("Honey Blonde Structured Blunt Lob");
      expect(honeyLob?.hairLength).toBe("medium");
      expect(honeyLob?.category).toBe("broadcast_anchor");

      const pixie = getHairstyleById("fem_hair_02_midnight_black_pixie");
      expect(pixie).toBeDefined();
      expect(pixie?.name).toBe("Midnight Raven Asymmetric Pixie");
      expect(pixie?.hairLength).toBe("short");
      expect(pixie?.category).toBe("bold_avantgarde");

      const nonExistent = getHairstyleById("non_existent_hair_id");
      expect(nonExistent).toBeUndefined();
    });

    it("filters hairstyles by gender including unisex fallback", () => {
      const femaleStyles = getHairstylesByGender("female");
      expect(femaleStyles.length).toBe(12); // 8 female + 4 unisex
      for (const h of femaleStyles) {
        expect(["female", "unisex"]).toContain(h.gender);
      }

      const maleStyles = getHairstylesByGender("male");
      expect(maleStyles.length).toBe(10); // 6 male + 4 unisex
      for (const h of maleStyles) {
        expect(["male", "unisex"]).toContain(h.gender);
      }

      const allStyles = getHairstylesByGender("all");
      expect(allStyles.length).toBe(18);

      const autoStyles = getHairstylesByGender("auto", "female");
      expect(autoStyles.length).toBe(12);
    });

    it("serves hairstyles through GET /api/wardrobe/hairstyles route with query filters", async () => {
      // 1. All hairstyles
      const reqAll = new NextRequest("http://localhost:3000/api/wardrobe/hairstyles");
      const resAll = await getHairstylesRoute(reqAll);
      const dataAll = await resAll.json();
      expect(dataAll.success).toBe(true);
      expect(dataAll.total).toBe(18);

      // 2. Filter female for Ruby Vance
      const reqFem = new NextRequest("http://localhost:3000/api/wardrobe/hairstyles?gender=female");
      const resFem = await getHairstylesRoute(reqFem);
      const dataFem = await resFem.json();
      expect(dataFem.success).toBe(true);
      expect(dataFem.total).toBe(12);

      // 3. Filter category
      const reqCat = new NextRequest("http://localhost:3000/api/wardrobe/hairstyles?category=broadcast_anchor");
      const resCat = await getHairstylesRoute(reqCat);
      const dataCat = await resCat.json();
      expect(dataCat.success).toBe(true);
      expect(dataCat.total).toBeGreaterThan(0);
      for (const h of dataCat.hairstyles) {
        expect(h.category).toBe("broadcast_anchor");
      }

      // 4. Filter length
      const reqLen = new NextRequest("http://localhost:3000/api/wardrobe/hairstyles?length=short");
      const resLen = await getHairstylesRoute(reqLen);
      const dataLen = await resLen.json();
      expect(dataLen.success).toBe(true);
      expect(dataLen.total).toBeGreaterThan(0);
      for (const h of dataLen.hairstyles) {
        expect(h.hairLength).toBe("short");
      }
    });
  });

  // ========================================================
  // 2. MINIMAX H3 HAIRSTYLE PROMPT COMPILER
  // ========================================================
  describe("MiniMax H3 Structured Hairstyle Prompt Linting", () => {
    const rubyLobInputs: HairstyleInpaintInputs = {
      sourceVideoPath: "ruby_burgundy_M1_loop_v1_audio.mp4",
      hairImagePath: "public/assets/hairstyles/generic/fem_hair_01_honey_blonde_lob.jpg",
      personaName: "Ruby Vance",
      sourceHairDescription: "long wavy copper auburn hair past shoulders",
      targetHairName: "Honey Blonde Structured Blunt Lob",
      targetHairDescription: "Precision blunt shoulder-length lob haircut in rich warm honey blonde with subtle dimension",
      hairLength: "medium",
      frameCount: 169,
      seed: 20261010,
    };

    it("generates strict 6-section prompt format for single-view inputs", () => {
      const prompt = generateMiniMaxHairstylePromptText(rubyLobInputs, 1);

      expect(prompt).toContain("subject_definitions:");
      expect(prompt).toContain("<Subject 1> is the target hairstyle:");
      expect(prompt).toContain("<Video 1> is the source video being edited.");
      expect(prompt).toContain("summary: [video editing + audio reuse]");
      expect(prompt).toContain("Replace the Ruby Vance's long wavy copper auburn hair past shoulders with <Subject 1>.");
      expect(prompt).toContain("retention_analysis:");
      expect(prompt).toContain("<Subject 1> (appears in [Shot 1]): fully_preserved");
      expect(prompt).toContain("<Video 1>: weak_reference");
      expect(prompt).toContain("Preserve the Ruby Vance's exact facial identity, eyes, nose, mouth movements");
      expect(prompt).toContain("detailed_description:");
      expect(prompt).toContain("Photorealistic professional broadcast green screen studio.");
      expect(prompt).toContain("her hair styled in the Honey Blonde Structured Blunt Lob.");
      expect(prompt).toContain("overall_soundscape:");
      expect(prompt).toContain("non_diegetic_music:");
    });

    it("generates 4-view 360-degree multi-angle prompt directives when refCount is 4", () => {
      const prompt = generateMiniMaxHairstylePromptText(rubyLobInputs, 4);

      expect(prompt).toContain("subject_definitions:");
      expect(prompt).toContain("<Picture 1> shows the front view");
      expect(prompt).toContain("<Picture 2> shows the side profile");
      expect(prompt).toContain("<Picture 3> shows the back view");
      expect(prompt).toContain("<Picture 4> shows the hair strand texture, luster, and color dimension.");
      expect(prompt).toContain("summary: [video editing + audio reuse]");
      expect(prompt).toContain("utilizing <Picture 1>, <Picture 2>, <Picture 3>, and <Picture 4> to maintain accurate 360-degree hair shape");
      expect(prompt).toContain("Clear any original hair that draped over the shoulders or chest if <Subject 1> is shorter.");
      expect(prompt).toContain("retention_analysis:");
      expect(prompt).toContain("follow <Picture 1> (front view), <Picture 2> (side view), and <Picture 3> (back view) corresponding to head orientation");
      expect(prompt).toContain("with the hair cuticles and shine from <Picture 4>");
      expect(prompt).toContain("detailed_description:");
      expect(prompt).toContain("secondary hair physics, matching the front view <Picture 1>, side profile <Picture 2>, back view <Picture 3>, and hair texture <Picture 4>");
    });
  });

  // ========================================================
  // 3. WORKFLOW GRAPH BUILDER (RUBY VANCE & BLAZE WILDER)
  // ========================================================
  describe("ComfyUI Graph Injections for Ruby Vance & Blaze Wilder", () => {
    it("builds calibrated ComfyUI graph for Ruby Vance (long copper to honey blonde lob)", () => {
      const rubyInputs: HairstyleInpaintInputs = {
        hairstyleId: "fem_hair_01_honey_blonde_lob",
        sourceVideoPath: "public/assets/action_loops/veo/ruby_burgundy_T3_to_1.mp4",
        hairImagePath: "public/assets/hairstyles/generic/fem_hair_01_honey_blonde_lob.jpg",
        personaName: "Ruby Vance",
        sourceHairDescription: "long wavy copper hair",
        targetHairName: "Honey Blonde Structured Blunt Lob",
        targetHairDescription: "Precision blunt collarbone lob in honey blonde",
        hairLength: "medium",
        frameCount: 169,
        seed: 20261010,
        outputPrefix: "ruby_hair_lob",
      };

      const views = [
        "fem_hair_01_view1_front.jpg",
        "fem_hair_01_view2_side.jpg",
        "fem_hair_01_view3_back.jpg",
        "fem_hair_01_view4_detail.jpg",
      ];

      const prompt = buildHairstyleInpaintPrompt(
        rubyInputs,
        "ruby_burgundy_T3_to_1.mp4",
        views
      );

      // 1. Video source node
      expect(prompt["11"]).toBeDefined();
      expect(prompt["11"].inputs.file).toBe("ruby_burgundy_T3_to_1.mp4");

      // 2. Timeline config
      expect(prompt["12"]).toBeDefined();
      expect(prompt["12"].inputs.frame_count).toBe(169);
      expect(prompt["12"].inputs.aspect_ratio).toBe("As Source");

      // 3. SAM 3.1 tracking prompt includes hair, hairline, locks, and clearance tokens for shoulders/neck
      expect(prompt["14"]).toBeDefined();
      const trackText = prompt["14"].inputs.text as string;
      expect(trackText).toContain("hair");
      expect(trackText).toContain("bangs");
      expect(trackText).toContain("scalp");
      expect(trackText).toContain("shoulders");
      expect(trackText).toContain("neck");
      expect(trackText).toContain("collarbone");

      // 4. MVEx_SubjectCrop connects directly to tracked mask with stillness preference
      expect(prompt["22"]).toBeUndefined();
      expect(prompt["19"].inputs.masks).toEqual(["16", 0]);
      expect(prompt["19"].inputs.mode).toBe("tracked");
      expect(prompt["19"].inputs.prefer).toBe("stillness");
      expect(prompt["19"].inputs.crop_scale).toBeCloseTo(1.61, 2);

      // 5. 4 Reference images loaded and connected
      expect(prompt["108"].inputs.value).toBe(4);
      expect(prompt["89"].inputs.ref_images).toBe(4);
      expect(prompt["100"].inputs.image).toBe("fem_hair_01_view1_front.jpg");
      expect(prompt["102"].inputs.image).toBe("fem_hair_01_view2_side.jpg");
      expect(prompt["130"].inputs.image).toBe("fem_hair_01_view3_back.jpg");
      expect(prompt["134"].inputs.image).toBe("fem_hair_01_view4_detail.jpg");

      // 6. Output prefix and seed
      expect(prompt["85"].inputs.filename_prefix).toBe("ruby_hair_lob");
      expect(prompt["28"].inputs.noise_seed).toBe(20261010);
    });

    it("builds calibrated ComfyUI graph for Blaze Wilder (silver blazer loop to midnight pixie crop)", () => {
      const blazeInputs: HairstyleInpaintInputs = {
        hairstyleId: "fem_hair_02_midnight_black_pixie",
        sourceVideoPath: "public/assets/action_loops/veo/blaze_silver_blazer/blaze_silver_blazer_M2_loop_v1.mp4",
        hairImagePath: "public/assets/hairstyles/generic/fem_hair_02_midnight_black_pixie.jpg",
        personaName: "Blaze Wilder",
        sourceHairDescription: "short platinum hair",
        targetHairName: "Midnight Raven Asymmetric Pixie",
        targetHairDescription: "Edgy razor-textured asymmetric pixie in jet raven black",
        hairLength: "short",
        frameCount: 185,
        seed: 20261011,
        outputPrefix: "blaze_hair_pixie",
      };

      const views = [
        "fem_hair_02_view1_front.jpg",
        "fem_hair_02_view2_side.jpg",
        "fem_hair_02_view3_back.jpg",
        "fem_hair_02_view4_detail.jpg",
      ];

      const prompt = buildHairstyleInpaintPrompt(
        blazeInputs,
        "blaze_silver_blazer_M2_loop_v1.mp4",
        views
      );

      // 1. Video source node
      expect(prompt["11"].inputs.file).toBe("blaze_silver_blazer_M2_loop_v1.mp4");

      // 2. Timeline config matching Blaze's 185 frames
      expect(prompt["12"].inputs.frame_count).toBe(185);
      const tl = JSON.parse(prompt["12"].inputs.timeline as string);
      expect(tl.clips[0].length).toBe(185);

      // 3. SAM 3.1 tracking prompt includes pixie, fringe, locks, and clearance tokens
      const trackText = prompt["14"].inputs.text as string;
      expect(trackText).toContain("hair");
      expect(trackText).toContain("pixie");
      expect(trackText).toContain("fringe");
      expect(trackText).toContain("scalp");

      // 4. Output prefix and seed
      expect(prompt["85"].inputs.filename_prefix).toBe("blaze_hair_pixie");
      expect(prompt["28"].inputs.noise_seed).toBe(20261011);
    });
  });

  // ========================================================
  // 4. 4-PANEL TECHNICAL REFERENCE PLATES EXTRACTION
  // ========================================================
  describe("4-Panel Multi-View Hair Reference Plate Extraction", () => {
    it("extracts all 4 subpanels (front, side, back, detail) from fem_hair_01_honey_blonde_lob.jpg", async () => {
      const platePath = "public/assets/hairstyles/generic/fem_hair_01_honey_blonde_lob.jpg";
      const result = await preprocessOutfitImage(platePath);

      expect(result.wasMultiView).toBe(true);
      expect(result.wasCropped).toBe(true);
      expect(result.panelCount).toBe(4);
      expect(result.panels.length).toBe(4);
      expect(result.originalWidth).toBe(1376);
      expect(result.originalHeight).toBe(768);

      // Panel 1: Front View (1376 / 4 = 344px)
      expect(result.panels[0].role).toBe("front");
      expect(result.panels[0].width).toBe(344);
      expect(result.panels[0].height).toBe(768);
      expect(result.panels[0].filename).toContain("view1_front");

      // Panel 2: Side Profile View
      expect(result.panels[1].role).toBe("side");
      expect(result.panels[1].width).toBe(344);
      expect(result.panels[1].height).toBe(768);
      expect(result.panels[1].filename).toContain("view2_side");

      // Panel 3: Rear Back View
      expect(result.panels[2].role).toBe("back");
      expect(result.panels[2].width).toBe(344);
      expect(result.panels[2].height).toBe(768);
      expect(result.panels[2].filename).toContain("view3_back");

      // Panel 4: Detail Texture Macro View
      expect(result.panels[3].role).toBe("detail");
      expect(result.panels[3].width).toBe(344);
      expect(result.panels[3].height).toBe(768);
      expect(result.panels[3].filename).toContain("view4_detail");
    });

    it("extracts all 4 subpanels (front, side, back, detail) from fem_hair_02_midnight_black_pixie.jpg", async () => {
      const platePath = "public/assets/hairstyles/generic/fem_hair_02_midnight_black_pixie.jpg";
      const result = await preprocessOutfitImage(platePath);

      expect(result.wasMultiView).toBe(true);
      expect(result.wasCropped).toBe(true);
      expect(result.panelCount).toBe(4);
      expect(result.panels.length).toBe(4);
      expect(result.originalWidth).toBe(1376);
      expect(result.originalHeight).toBe(768);

      expect(result.panels[0].role).toBe("front");
      expect(result.panels[1].role).toBe("side");
      expect(result.panels[2].role).toBe("back");
      expect(result.panels[3].role).toBe("detail");
    });
  });
});
