import { describe, it, expect } from "vitest";
import {
  getPersonaPromptDetails,
  hasPersonaInPrompt,
  resolvePersonaAttireImageUrl,
  buildConditionedReferenceUrls,
  reconcilePromptWithSceneDialogueAndReferences,
  getSettingActionTemplates,
  getSettingActionTemplate,
  getSceneDialogueVariations,
  buildStructuredVideoPrompt,
  buildStructuredPhotoPrompt,
} from "../personaPromptHelper";

describe("personaPromptHelper Suite", () => {
  describe("Non-speaking & Audio SFX Contract", () => {
    it("injects closed-mouth non-speaking clause across different typologies", () => {
      const surfaceDetails = getPersonaPromptDetails({
        personaId: "ruby",
        attireId: "burgundy_corset",
        productName: "Luxury Engineered Hardwood Flooring",
        typology: "surface_material",
      });

      expect(surfaceDetails.fullPersonaPromptClause).toContain("closed mouth");
      expect(surfaceDetails.fullPersonaPromptClause).toContain("not speaking or talking");
      expect(surfaceDetails.fullPersonaPromptClause).toContain("spoken narration with voiceover");
      expect(surfaceDetails.fullPersonaPromptClause).toContain("clean ambient environment acoustic sound effects only without spoken dialogue");
      expect(surfaceDetails.actionClause).toContain("barefoot across");

      const apparelDetails = getPersonaPromptDetails({
        personaId: "blaze",
        attireId: "leather_jacket",
        productName: "Thermal Windbreaker Jacket",
        typology: "apparel_wearable",
      });

      expect(apparelDetails.fullPersonaPromptClause).toContain("closed mouth");
      expect(apparelDetails.fullPersonaPromptClause).toContain("not speaking or talking");
      expect(apparelDetails.fullPersonaPromptClause).toContain("spoken narration with voiceover");
    });

    it("synthesizes on-camera speaking dialogue, language, attire ref, and product ref without silent contract when allowSpeaking is enabled", () => {
      const details = getPersonaPromptDetails({
        personaId: "ruby",
        attireId: "burgundy_corset",
        productName: "Porcelanato San Lorenzo 45x90",
        typology: "surface_material",
        dialogue: "Descubrí la máxima calidad y elegancia para renovar tus pisos hoy mismo.",
        language: "Spanish",
        allowSpeaking: true,
      });

      // Spoken dialogue & audio language
      expect(details.fullPersonaPromptClause).toContain("speaking on camera with clear diction and natural lip synchronization");
      expect(details.fullPersonaPromptClause).toContain("delivering the dialogue in Spanish: 'Descubrí la máxima calidad y elegancia para renovar tus pisos hoy mismo.'");
      expect(details.fullPersonaPromptClause).toContain("Crisp broadcast vocal audio synchronized with realistic mouth articulation");

      // Wardrobe reference #1 & Product reference #2
      expect(details.fullPersonaPromptClause).toContain("the presenter's wardrobe and styling strictly match the character wardrobe reference photo in the first reference image");
      expect(details.fullPersonaPromptClause).toContain("while the presenter showcases and interacts with the exact product shown in the second reference image (Porcelanato San Lorenzo 45x90)");

      // Zero silent conditioning
      expect(details.fullPersonaPromptClause).not.toContain("closed mouth");
      expect(details.fullPersonaPromptClause).not.toContain("silent on-camera presenter");
      expect(details.fullPersonaPromptClause).not.toContain("not speaking or talking");
      expect(details.fullPersonaPromptClause).not.toContain("spoken narration with voiceover");
      expect(details.fullPersonaPromptClause).not.toContain("no on-camera talking or lip movement");
    });

    it("identifies prompts containing non-speaking or persona clauses with hasPersonaInPrompt", () => {
      expect(hasPersonaInPrompt("Cinematic shot with closed mouth and not speaking")).toBe(true);
      expect(hasPersonaInPrompt("Featuring a charismatic female presenter with auburn hair")).toBe(true);
      expect(hasPersonaInPrompt("Scene framed for spoken narration with voiceover")).toBe(true);
      expect(hasPersonaInPrompt("Generic product shot on white background")).toBe(false);
      expect(hasPersonaInPrompt("")).toBe(false);
      expect(hasPersonaInPrompt(null)).toBe(false);
    });
  });

  describe("Wardrobe & Attire Image Resolution", () => {
    it("resolves primary attire image for Ruby Vance burgundy corset", () => {
      const url = resolvePersonaAttireImageUrl({
        personaId: "ruby",
        attireId: "ruby_burgundy_corset_m1",
      });
      expect(url).toContain("ruby_chroma_wall_standing_burgundy_velvet_corset_01_M1_chroma_stand_base.jpg");
    });

    it("resolves specific motion pose when signal contains M2 or M3", () => {
      const m2Url = resolvePersonaAttireImageUrl({
        personaId: "ruby",
        actionLoopId: "ruby_m2_loop",
      });
      expect(m2Url).toContain("02_M2_chroma_raised_right.jpg");

      const m3Url = resolvePersonaAttireImageUrl({
        personaId: "ruby",
        attireId: "corset",
        actionLoopId: "m3_loop",
      });
      expect(m3Url).toContain("03_M3_chroma_open_two_hands.jpg");
    });

    it("resolves Blaze Wilder wardrobe reference", () => {
      const blazeUrl = resolvePersonaAttireImageUrl({
        personaId: "blaze",
        attireId: "silver_blazer",
      });
      expect(blazeUrl).toContain("master_blaze_archive");
    });
  });

  describe("buildConditionedReferenceUrls Ordering & Conditioning", () => {
    it("guarantees persona image is strictly at index 0 and product photos follow", () => {
      const personaImg = "/avatars/master_ruby_archive/m1.jpg";
      const productImages = [
        "https://example.com/product_hero.jpg",
        "https://example.com/product_angle.jpg",
      ];

      const conditioned = buildConditionedReferenceUrls({
        personaImageUrl: personaImg,
        productMediaUrls: productImages,
        maxImages: 3,
      });

      expect(conditioned).toHaveLength(3);
      expect(conditioned[0]).toBe(personaImg);
      expect(conditioned[1]).toBe(productImages[0]);
      expect(conditioned[2]).toBe(productImages[1]);
    });

    it("filters out video URLs (.mp4, .webm, .mov) and deduplicates", () => {
      const personaImg = "/avatars/ruby.png";
      const mixedMedia = [
        "https://example.com/prod1.jpg",
        "https://example.com/prod_video.mp4",
        "https://example.com/prod1.jpg", // Duplicate
        "https://example.com/prod2.png",
        "https://example.com/clip.webm",
      ];

      const conditioned = buildConditionedReferenceUrls({
        personaImageUrl: personaImg,
        productMediaUrls: mixedMedia,
        maxImages: 3,
      });

      expect(conditioned).toEqual([
        "/avatars/ruby.png",
        "https://example.com/prod1.jpg",
        "https://example.com/prod2.png",
      ]);
    });

    it("respects maxImages constraint", () => {
      const personaImg = "/avatars/ruby.png";
      const productImages = [
        "https://example.com/p1.jpg",
        "https://example.com/p2.jpg",
        "https://example.com/p3.jpg",
        "https://example.com/p4.jpg",
      ];

      const conditioned = buildConditionedReferenceUrls({
        personaImageUrl: personaImg,
        productMediaUrls: productImages,
        maxImages: 3,
      });

      expect(conditioned).toHaveLength(3);
      expect(conditioned[0]).toBe(personaImg);
    });
  });

  describe("reconcilePromptWithSceneDialogueAndReferences", () => {
    const rawLegacyPrompt =
      "Cinematic camera glide through a modern interior design showroom featuring an illuminated exhibition gallery wall of large architectural paint swatches, texture samples, and complementary flooring displays with Piso Flotante - Acatia - 8mm, pure unobstructed camera POV, no physical drones, no quadcopters, no camera equipment visible in frame, featuring a charismatic elegant female presenter with long wavy auburn hair and radiant confident expression, dressed in an elegant tailored burgundy velvet evening dress, walking up to an illuminated showroom gallery wall of large architectural paint swatches and complementary flooring displays, holding a sample finish card and comparing it against the wall texture and floorboard display with an appreciative, discerning expression, silent on-camera presenter with closed mouth, poised serene facial expression, persona not talking or speaking on camera, spoken narration with voiceover, voiceover narration only, clean ambient room acoustics, absolutely no on-camera talking or lip movement";

    it("reconciles prompt with wardrobe ref #1, product ref #2, and on-camera speech dialogue in Spanish", () => {
      const result = reconcilePromptWithSceneDialogueAndReferences(rawLegacyPrompt, {
        productName: "Piso Flotante - Acatia - 8mm",
        dialogue: "¿Querés renovar tus pisos sin romper nada? Mirá la calidad de este piso flotante Acatia.",
        language: "Spanish",
        allowSpeaking: true,
      });

      expect(result).not.toContain("silent on-camera presenter");
      expect(result).not.toContain("closed mouth");
      expect(result).not.toContain("absolutely no on-camera talking");
      expect(result).toContain("the presenter's wardrobe and styling strictly match the character wardrobe reference photo in the first reference image");
      expect(result).toContain("while the presenter showcases and interacts with the exact product shown in the second reference image (Piso Flotante - Acatia - 8mm)");
      expect(result).toContain("the presenter is speaking on camera with clear diction and natural lip synchronization, delivering the dialogue in Spanish");
      expect(result).toContain("¿Querés renovar tus pisos sin romper nada?");
    });

    it("reconciles prompt when persona speaks on camera is toggled OFF", () => {
      const speakingPrompt = reconcilePromptWithSceneDialogueAndReferences(rawLegacyPrompt, {
        productName: "Piso Flotante - Acatia - 8mm",
        dialogue: "¿Querés renovar tus pisos?",
        language: "Spanish",
        allowSpeaking: true,
      });

      const silentResult = reconcilePromptWithSceneDialogueAndReferences(speakingPrompt, {
        productName: "Piso Flotante - Acatia - 8mm",
        allowSpeaking: false,
      });

      expect(silentResult).not.toContain("speaking on camera");
      expect(silentResult).not.toContain("delivering the dialogue");
      expect(silentResult).toContain("the presenter's wardrobe and styling strictly match the character wardrobe reference photo in the first reference image");
      expect(silentResult).toContain("while the presenter showcases and interacts with the exact product shown in the second reference image (Piso Flotante - Acatia - 8mm)");
      expect(silentResult).toContain("silent on-camera presenter with closed mouth");
    });

    it("reconciles structured prompts and preserves custom user environment while updating dialogue", () => {
      const customStructuredPrompt = `[Environment]: Custom Bauhaus art gallery with high ceiling glass roof and exposed concrete beams.

[Persona]: featuring a charismatic elegant female presenter with long wavy auburn hair. the presenter's wardrobe and styling strictly match the character wardrobe reference photo in the first reference image.

[Camera]: Low-angle tracking glide.

[Action]:
- 0.0s - 2.5s: Presenter steps forward gracefully.
- 2.5s - 5.5s: Presenter touches the floor, while the presenter showcases and interacts with the exact product shown in the second reference image (Piso Flotante), faithfully reproducing the authentic finish, texture, and details of the product reference photo.
- 5.5s - 8.0s: Presenter turns to camera with a smile.

[Dialogue]: the presenter is speaking on camera in English: "Old dialogue".`;

      const updated = reconcilePromptWithSceneDialogueAndReferences(customStructuredPrompt, {
        productName: "Piso Flotante",
        dialogue: "Con el sistema Click lo instalás en una tarde.",
        language: "Spanish",
        allowSpeaking: true,
      });

      expect(updated).toContain("Custom Bauhaus art gallery with high ceiling glass roof");
      expect(updated).toContain("Low-angle tracking glide");
      expect(updated).toContain("Con el sistema Click lo instalás en una tarde");
      expect(updated).not.toContain("Old dialogue");
    });

    it("swaps [Camera] and [Action] sections when templateIndex is changed in structured prompt", () => {
      const initialStructured = `[Environment]: Upscale showroom.

[Persona]: featuring a charismatic presenter. the presenter's wardrobe and styling strictly match the character wardrobe reference photo in the first reference image.

[Camera]: Slow 3D macro dolly push.

[Action]:
- 0.0s - 2.5s: Initial action.
- 2.5s - 5.5s: Middle action.
- 5.5s - 8.0s: Closing action.

[Dialogue]: the presenter is speaking on camera in Spanish: "Hola".`;

      const rerolled = reconcilePromptWithSceneDialogueAndReferences(initialStructured, {
        productName: "Piso Flotante",
        settingKey: "showroom",
        templateIndex: 1, // Precision click lock joint assembly
        rerollTemplate: true,
      });

      expect(rerolled).toContain("tongue-and-groove");
      expect(rerolled).toContain("seamless DIY installation");
      expect(rerolled).toContain("Hola");
    });
  });

  describe("Setting Action Templates & Variations", () => {
    it("provides minimum 6 distinct action templates for each setting", () => {
      const settings = ["showroom", "living_room", "kitchen", "general"];
      for (const s of settings) {
        const templates = getSettingActionTemplates(s);
        expect(templates.length).toBeGreaterThanOrEqual(6);
        templates.forEach((t) => {
          expect(t.id).toBeDefined();
          expect(t.label).toBeDefined();
          expect(t.cameraMovement).toBeDefined();
          expect(t.environmentDesc).toBeDefined();
          expect(t.actions.time0_25).toBeDefined();
          expect(t.actions.time25_55).toBeDefined();
          expect(t.actions.time55_80).toBeDefined();
        });
      }
    });

    it("wraps templateIndex with modulo correctly", () => {
      const t0 = getSettingActionTemplate("showroom", 0);
      const t6 = getSettingActionTemplate("showroom", 6);
      expect(t6.id).toBe(t0.id);
    });
  });

  describe("Scene Dialogue Variations", () => {
    it("generates 6 distinct tailored dialogue angles in Spanish, Portuguese, and English", () => {
      const prodName = "Piso Flotante Vinílico Click";
      const es = getSceneDialogueVariations(prodName, "Spanish");
      expect(es.length).toBe(6);
      expect(es[0].id).toBe("curiosity_hook");
      expect(es[1].id).toBe("click_ease");
      expect(es[2].id).toBe("sensory_texture");
      expect(es[3].id).toBe("transformation");
      expect(es[4].id).toBe("architect_quality");
      expect(es[5].id).toBe("compelling_cta");
      es.forEach((d) => {
        expect(d.text).toContain(prodName);
        expect(d.text.length).toBeGreaterThan(20);
      });

      const pt = getSceneDialogueVariations(prodName, "Portuguese");
      expect(pt.length).toBe(6);
      expect(pt[1].text).toContain("encaixe");

      const en = getSceneDialogueVariations(prodName, "English");
      expect(en.length).toBe(6);
      expect(en[0].text).toContain("elevate your living space");
    });
  });

  describe("buildStructuredVideoPrompt & buildStructuredPhotoPrompt", () => {
    it("builds complete multi-section video prompt with timestamps and ingredient references", () => {
      const prompt = buildStructuredVideoPrompt({
        productName: "Porcelanato Ilva 60x120",
        settingKey: "showroom",
        templateIndex: 0,
        dialogue: "Descubrí la máxima calidad.",
        language: "Spanish",
        allowSpeaking: true,
      });

      expect(prompt).toContain("[Environment]:");
      expect(prompt).toContain("[Persona]:");
      expect(prompt).toContain("[Camera]:");
      expect(prompt).toContain("[Action]:");
      expect(prompt).toContain("- 0.0s - 2.5s:");
      expect(prompt).toContain("- 2.5s - 5.5s:");
      expect(prompt).toContain("- 5.5s - 8.0s:");
      expect(prompt).toContain("[Dialogue]:");
      expect(prompt).toContain("first reference image");
      expect(prompt).toContain("second reference image (Porcelanato Ilva 60x120)");
      expect(prompt).toContain("Descubrí la máxima calidad.");
      expect(prompt).toContain("Performance delivery:");
    });

    it("builds structured photo prompt without timestamps", () => {
      const prompt = buildStructuredPhotoPrompt({
        productName: "Porcelanato Ilva 60x120",
        settingKey: "living_room",
        templateIndex: 0,
      });

      expect(prompt).toContain("[Environment]:");
      expect(prompt).toContain("[Persona & Wardrobe]:");
      expect(prompt).toContain("[Product Staging]:");
      expect(prompt).toContain("[Lighting & Atmosphere]:");
      expect(prompt).toContain("[Composition & Style]:");
      expect(prompt).not.toContain("- 0.0s - 2.5s:");
      expect(prompt).toContain("first reference image");
      expect(prompt).toContain("second reference image (Porcelanato Ilva 60x120)");
    });

    it("injects custom performance clause and supports performance moods", () => {
      const promptWithMood = buildStructuredVideoPrompt({
        productName: "Porcelanato Ilva 60x120",
        settingKey: "showroom",
        dialogue: "Mirá este porcelanato pulido.",
        language: "Spanish",
        allowSpeaking: true,
        performanceMood: "intimate_whisper",
      });

      expect(promptWithMood).toContain("Performance delivery: intimate, close-mic soft-spoken delivery");

      const promptWithCustom = buildStructuredVideoPrompt({
        productName: "Porcelanato Ilva 60x120",
        settingKey: "kitchen",
        dialogue: "¡Increíble resistencia a manchas!",
        language: "Spanish",
        allowSpeaking: true,
        performanceClause: "talking slowly with a dramatic pause and breathless astonishment",
      });

      expect(promptWithCustom).toContain("Performance delivery: talking slowly with a dramatic pause and breathless astonishment");
    });

    it("reconciles prompt performance clause and preserves it across edits", () => {
      const initialPrompt = `[Environment]: Upscale showroom.

[Persona]: featuring a charismatic presenter. the presenter's wardrobe and styling strictly match the character wardrobe reference photo in the first reference image.

[Camera]: Slow 3D macro dolly push.

[Action]:
- 0.0s - 2.5s: Action 1.
- 2.5s - 5.5s: Action 2, while the presenter showcases and interacts with the exact product shown in the second reference image (Plank), faithfully reproducing the authentic finish, texture, and details of the product reference photo.
- 5.5s - 8.0s: Action 3.

[Dialogue]: the presenter is speaking on camera with clear diction and natural lip synchronization, delivering the dialogue in Spanish: "Texto inicial.". Performance delivery: energetic, upbeat commercial delivery. Crisp broadcast vocal audio.`;

      const updatedWithNewMood = reconcilePromptWithSceneDialogueAndReferences(initialPrompt, {
        productName: "Plank",
        dialogue: "Texto nuevo.",
        performanceMood: "happy_playful",
        allowSpeaking: true,
      });

      expect(updatedWithNewMood).toContain("Texto nuevo.");
      expect(updatedWithNewMood).toContain("Performance delivery: happy, radiant, cheerful delivery");
      expect(updatedWithNewMood).not.toContain("Texto inicial.");

      // Test preserving existing performance when only dialogue is changed
      const updatedDialogueOnly = reconcilePromptWithSceneDialogueAndReferences(updatedWithNewMood, {
        productName: "Plank",
        dialogue: "Tercer texto.",
        allowSpeaking: true,
      });

      expect(updatedDialogueOnly).toContain("Tercer texto.");
      expect(updatedDialogueOnly).toContain("happy, radiant, cheerful delivery");
    });
  });
});
