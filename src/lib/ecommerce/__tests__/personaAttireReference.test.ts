import { describe, it, expect } from "vitest";
import {
  resolvePersonaAttireImageUrl,
  buildConditionedReferenceUrls,
  getPersonaPromptDetails,
  hasPersonaInPrompt,
} from "../personaPromptHelper";

describe("personaAttireReference (Persona Attire Resolution & Reference Image Ordering)", () => {
  describe("resolvePersonaAttireImageUrl", () => {
    it("resolves Ruby Vance with burgundy corset pose id to standing M1 chroma image", () => {
      const url = resolvePersonaAttireImageUrl({
        personaId: "ruby",
        attireId: "ruby_burgundy_m1",
      });
      expect(url).toBe(
        "/avatars/master_ruby_archive/domain_chroma_wall_standing_burgundy_velvet_corset/ruby_chroma_wall_standing_burgundy_velvet_corset_01_M1_chroma_stand_base.jpg"
      );
    });

    it("resolves Ruby Vance with M2 raised-right action loop to M2 chroma image", () => {
      const url = resolvePersonaAttireImageUrl({
        personaId: "ruby",
        actionLoopId: "M2_loop_v1",
      });
      expect(url).toBe(
        "/avatars/master_ruby_archive/domain_chroma_wall_standing_burgundy_velvet_corset/ruby_chroma_wall_standing_burgundy_velvet_corset_02_M2_chroma_raised_right.jpg"
      );
    });

    it("resolves Ruby Vance with M3 open-two-hands action loop to M3 chroma image", () => {
      const url = resolvePersonaAttireImageUrl({
        personaId: "ruby",
        actionLoopId: "M3_loop_v1",
      });
      expect(url).toBe(
        "/avatars/master_ruby_archive/domain_chroma_wall_standing_burgundy_velvet_corset/ruby_chroma_wall_standing_burgundy_velvet_corset_03_M3_chroma_open_two_hands.jpg"
      );
    });

    it("resolves Ruby with Cobalt Sweetheart attire", () => {
      const url = resolvePersonaAttireImageUrl({
        personaId: "ruby",
        attireId: "ruby_08a_cobalt_sweetheart",
      });
      expect(url).toBe(
        "/avatars/master_ruby_archive/chroma_master_poses/ruby_08a_cobalt_sweetheart_default_clasped.jpg"
      );
    });

    it("resolves Ruby with Emerald Cowl attire", () => {
      const url = resolvePersonaAttireImageUrl({
        personaId: "ruby",
        attireId: "ruby_01a_emerald_cowl",
      });
      expect(url).toBe(
        "/avatars/master_ruby_archive/chroma_master_poses/ruby_01a_emerald_cowl_default_clasped.jpg"
      );
    });

    it("resolves Ruby with Emerald Keyhole attire", () => {
      const url = resolvePersonaAttireImageUrl({
        personaId: "ruby",
        attireId: "ruby_12a_emerald_keyhole",
      });
      expect(url).toBe(
        "/avatars/master_ruby_archive/chroma_master_poses/ruby_12a_emerald_keyhole_default_clasped.jpg"
      );
    });

    it("resolves Mateo Rossi with tailored Italian suit", () => {
      const url = resolvePersonaAttireImageUrl({
        personaId: "mateo",
      });
      expect(url).toBe(
        "/avatars/master_mateo_archive/domain_chroma_wall_standing_default_trait/mateo_169_widescreen_01_M1_stand_base.jpg"
      );
    });

    it("resolves Blaze Wilder with silver blazer", () => {
      const url = resolvePersonaAttireImageUrl({
        personaId: "blaze",
        attireId: "silver_blazer",
      });
      expect(url).toBe(
        "/avatars/master_blaze_archive/domain_chroma_wall_standing_silver_blazer/blaze_169_widescreen_01_M1_stand_base.jpg"
      );
    });

    it("does not mistakenly use generic headshot (/avatars/ruby.png) when attire/action loop is specified", () => {
      const url = resolvePersonaAttireImageUrl({
        personaId: "ruby",
        avatarSrc: "/avatars/ruby.png",
        attireId: "ruby_burgundy_m1",
        actionLoopId: "M1_loop_v1",
      });
      // Must NOT return /avatars/ruby.png
      expect(url).toBe(
        "/avatars/master_ruby_archive/domain_chroma_wall_standing_burgundy_velvet_corset/ruby_chroma_wall_standing_burgundy_velvet_corset_01_M1_chroma_stand_base.jpg"
      );
    });

    it("allows a custom non-generic avatar image URL", () => {
      const customUrl = "/avatars/custom_wardrobe_shoot_4k.jpg";
      const url = resolvePersonaAttireImageUrl({
        personaId: "ruby",
        avatarSrc: customUrl,
      });
      expect(url).toBe(customUrl);
    });

    it("rejects video URLs passed in avatarSrc", () => {
      const videoSrc = "/assets/videos/ruby_talking.mp4";
      const url = resolvePersonaAttireImageUrl({
        personaId: "ruby",
        avatarSrc: videoSrc,
      });
      // Should fall back to signature standing chroma image
      expect(url).not.toContain(".mp4");
      expect(url).toBe(
        "/avatars/master_ruby_archive/domain_chroma_wall_standing_burgundy_velvet_corset/ruby_chroma_wall_standing_burgundy_velvet_corset_01_M1_chroma_stand_base.jpg"
      );
    });
  });

  describe("buildConditionedReferenceUrls", () => {
    it("places persona reference image strictly first at index 0 and product photos at indices 1 and 2", () => {
      const personaImg = "/avatars/master_ruby_archive/domain_chroma_wall_standing_burgundy_velvet_corset/ruby_chroma_wall_standing_burgundy_velvet_corset_01_M1_chroma_stand_base.jpg";
      const prodImg1 = "https://images.unsplash.com/photo-1.jpg";
      const prodImg2 = "https://images.unsplash.com/photo-2.jpg";

      const refs = buildConditionedReferenceUrls({
        personaImageUrl: personaImg,
        productMediaUrls: [prodImg1, prodImg2],
        maxImages: 3,
      });

      expect(refs).toHaveLength(3);
      expect(refs[0]).toBe(personaImg);
      expect(refs[1]).toBe(prodImg1);
      expect(refs[2]).toBe(prodImg2);
    });

    it("duplicates product image when persona is provided and only 1 product image exists (guarantees >= 2 product views)", () => {
      const personaImg = "/avatars/master_ruby_archive/chroma_master_poses/ruby_08a_cobalt_sweetheart_default_clasped.jpg";
      const prodImg = "https://images.unsplash.com/product-packshot.jpg";

      const refs = buildConditionedReferenceUrls({
        personaImageUrl: personaImg,
        productMediaUrls: [prodImg],
        maxImages: 3,
      });

      expect(refs).toHaveLength(3);
      expect(refs[0]).toBe(personaImg);
      expect(refs[1]).toBe(prodImg);
      expect(refs[2]).toBe(prodImg); // Duplicated for multi-angle conditioning
    });

    it("filters out video files from conditioning array", () => {
      const personaImg = "/avatars/ruby_body.jpg";
      const prodImg = "https://images.unsplash.com/product.jpg";
      const videoAsset = "/assets/broll/product_demo.mp4";

      const refs = buildConditionedReferenceUrls({
        personaImageUrl: personaImg,
        productMediaUrls: [videoAsset, prodImg],
        maxImages: 3,
      });

      expect(refs).not.toContain(videoAsset);
      expect(refs[0]).toBe(personaImg);
      expect(refs[1]).toBe(prodImg);
    });

    it("deduplicates product images", () => {
      const personaImg = "/avatars/ruby_body.jpg";
      const prodImg1 = "https://images.unsplash.com/product-1.jpg";
      const prodImg2 = "https://images.unsplash.com/product-2.jpg";

      const refs = buildConditionedReferenceUrls({
        personaImageUrl: personaImg,
        productMediaUrls: [prodImg1, prodImg1, prodImg2, prodImg2],
        maxImages: 3,
      });

      expect(refs).toEqual([personaImg, prodImg1, prodImg2]);
    });

    it("respects maxImages constraint", () => {
      const personaImg = "/avatars/ruby_body.jpg";
      const prodImgs = [
        "https://images.unsplash.com/1.jpg",
        "https://images.unsplash.com/2.jpg",
        "https://images.unsplash.com/3.jpg",
        "https://images.unsplash.com/4.jpg",
      ];

      const refs = buildConditionedReferenceUrls({
        personaImageUrl: personaImg,
        productMediaUrls: prodImgs,
        maxImages: 3,
      });

      expect(refs).toHaveLength(3);
      expect(refs[0]).toBe(personaImg);
    });
  });

  describe("getPersonaPromptDetails", () => {
    it("neutralizes proper names and generates vivid persona interaction for surface materials", () => {
      const details = getPersonaPromptDetails({
        personaId: "ruby",
        attireId: "ruby_burgundy_m1",
        productName: "Patagonia Hardwood Oak Flooring",
        typology: "surface_material",
      });

      expect(details.fullPersonaPromptClause).toBeDefined();
      // Must not contain "Ruby Vance" in the prompt clause for safety policy compliance
      expect(details.fullPersonaPromptClause).not.toContain("Ruby Vance");
      expect(details.attireDescription).toContain("burgundy velvet");
      expect(details.actionClause).toContain("barefoot");
    });

    it("generates appropriate action for wearable apparel", () => {
      const details = getPersonaPromptDetails({
        personaId: "blaze",
        attireId: "silver_blazer",
        productName: "AeroPulse Running Jacket",
        typology: "apparel_wearable",
      });

      expect(details.fullPersonaPromptClause).not.toContain("Blaze Wilder");
      expect(details.actionClause).toContain("modeling and presenting");
      expect(details.attireDescription).toContain("silver");
    });

    it("correctly resolves action loop ids like M1_loop_v1 to burgundy velvet bodice", () => {
      const details = getPersonaPromptDetails({
        personaId: "ruby",
        attireId: "M1_loop_v1",
        productName: "Floor Tiles",
        typology: "surface_material",
      });
      expect(details.attireDescription).toContain("burgundy velvet");
    });
  });

  describe("hasPersonaInPrompt", () => {
    it("returns false for generic prompt without persona", () => {
      const genericPrompt =
        "Smooth floating aerial glide moving steadily forward across an expansive sunlit luxury living room featuring installed Piso Flotante - Acatia - 8mm, natural daylight reflections on the material, high-end Scandinavian interior architecture, photorealistic 8k commercial quality, 30fps";
      expect(hasPersonaInPrompt(genericPrompt)).toBe(false);
    });

    it("returns false for generic photo prompt without persona", () => {
      const genericPhoto =
        "Photorealistic product photograph of Piso Flotante in high-end studio lighting, 8k resolution";
      expect(hasPersonaInPrompt(genericPhoto)).toBe(false);
    });

    it("returns false for empty or null prompt", () => {
      expect(hasPersonaInPrompt("")).toBe(false);
      expect(hasPersonaInPrompt(null)).toBe(false);
      expect(hasPersonaInPrompt(undefined)).toBe(false);
    });

    it("returns true when prompt contains persona clause or presenter details", () => {
      const promptWithPersona =
        "Smooth floating aerial glide moving steadily forward across an expansive sunlit luxury living room with installed Flooring, featuring an elegant charismatic female presenter with long wavy auburn hair and radiant confident expression, dressed in an elegant tailored burgundy velvet evening dress, walking gracefully barefoot across the installed Flooring, 30fps";
      expect(hasPersonaInPrompt(promptWithPersona)).toBe(true);
    });

    it("returns true when prompt mentions specific persona names or wardrobe terms", () => {
      expect(hasPersonaInPrompt("Professional studio shot featuring Mateo dressed in Italian wool blazer")).toBe(true);
      expect(hasPersonaInPrompt("Vogue style photo featuring Blaze dressed in moto leather jacket")).toBe(true);
      expect(hasPersonaInPrompt("Presenter holding and presenting the product in a bright kitchen")).toBe(true);
    });
  });
});
