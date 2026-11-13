import { describe, it, expect } from "vitest";
import {
  buildChromaLoopSessionContextDocument,
  buildStudioPhotoshootContextDocument,
  buildTargetedPersonaContextDocument,
} from "../geminiCacheManager";
import { Persona, PERSONAS } from "../../tts/personas";
import { STUDIO_PLATES_CATALOG } from "../../../../scripts/gemini-cli/studioCatalog";

describe("geminiCacheManager", () => {
  const mockPersona: Persona = {
    id: "mock_persona_1",
    name: "Mock Persona",
    title: "Title",
    description: "Description",
    bio: "Bio",
    systemPrompt: "System Prompt",
    traits: {
      age: 30,
      heightCm: 180,
      heightFeet: "5'11",
      weightKg: 75,
      weightLbs: 165,
      skinTone: "fair",
      hair: "brown",
      face: "oval face",
      build: "athletic",
    },
    avatarUrl: "url",
    voiceFile: "voice",
    language: "en",
    gender: "female",
    params: {
      exaggeration: 1,
      cfgWeight: 1,
      temperature: 1,
      speed: 1,
      pitchShift: 1,
      maxNewTokens: 1,
      chunkSize: 1,
    },
  };

  const mockAttireDesc = "a blue suit with a white shirt";

  describe("buildChromaLoopSessionContextDocument", () => {
    it("should build the document with provided chroma color and name", () => {
      const chromaColorHex = "#FF0000";
      const chromaName = "Chroma Red";

      const doc = buildChromaLoopSessionContextDocument(mockPersona, mockAttireDesc, chromaColorHex, chromaName);

      expect(doc).toContain("MASTER CHROMA LOOP & MULTI-VIEW SESSION CACHE: MOCK PERSONA");

      expect(doc).toContain("## 1. Locked Subject Anatomy & Permanent Landmarks");
      expect(doc).toContain("- Name: Mock Persona (mock_persona_1)");
      expect(doc).toContain("- Age & Gender: 30-year-old female");
      expect(doc).toContain("- Facial Landmarks: oval face");
      expect(doc).toContain("- Skin Tone: fair");

      expect(doc).toContain("## 2. Locked Wardrobe Continuity");
      expect(doc).toContain("- Attire Description: a blue suit with a white shirt");
      expect(doc).toContain("- Strict Continuity: Maintain identical clothing cuts, fabrics, colors, folds, and accessories across all angles and keyframe loops.");

      expect(doc).toContain("## 3. Locked Chroma Backdrop & Lighting");
      expect(doc).toContain("- Backdrop: Perfectly flat, solid, shadowless Chroma Red (#FF0000) cyclorama backdrop.");
      expect(doc).toContain("- Lighting: 5600K clean broadcast studio lighting, zero spill on skin, crisp hair rim light.");

      expect(doc).toContain("## 4. Multi-Shot Continuity Protocol");
      expect(doc).toContain("- Maintain 100% facial symmetry, eye catchlights, ear height, and shoulder width across all poses, camera angles, and action loop keyframes.");
    });

    it("should build the document using default chroma color and name if not provided", () => {
      const doc = buildChromaLoopSessionContextDocument(mockPersona, mockAttireDesc);

      expect(doc).toContain("shadowless Chroma Green (#00B140) cyclorama backdrop");
    });

    it("should fallback to default skin tone if skinTone is not provided", () => {
      const mockPersonaNoSkinTone = { ...mockPersona, traits: { ...mockPersona.traits, skinTone: "" } };

      const doc = buildChromaLoopSessionContextDocument(mockPersonaNoSkinTone, mockAttireDesc);

      expect(doc).toContain("- Skin Tone: natural skin tone with fine skin texture");
    });
  });

  describe("buildStudioPhotoshootContextDocument", () => {
    it("should build a context document with valid specific studio plate", () => {
      const doc = buildStudioPhotoshootContextDocument(mockPersona, mockAttireDesc, "studio_plate_videowall_standup_16x9");
      const plate = STUDIO_PLATES_CATALOG["studio_plate_videowall_standup_16x9"];

      expect(doc).toContain(mockPersona.name.toUpperCase());
      expect(doc).toContain(mockPersona.name);
      expect(doc).toContain(mockPersona.id);
      expect(doc).toContain(`${mockPersona.traits.age}-year-old`);
      expect(doc).toContain(mockPersona.traits.face);
      expect(doc).toContain(mockPersona.traits.skinTone);
      expect(doc).toContain(mockAttireDesc);
      expect(doc).toContain(plate.label);
      expect(doc).toContain(plate.description);
      expect(doc).toContain("## 1. Locked Anchor Subject Likeness");
      expect(doc).toContain("## 2. Locked Wardrobe Specification");
      expect(doc).toContain("## 3. Locked Studio Set & Environment");
      expect(doc).toContain("## 4. Locked Lighting & Optical Atmosphere");
    });

    it("should use section_01_anchor_desk by default if studioPlateKey is omitted", () => {
      const doc = buildStudioPhotoshootContextDocument(mockPersona, mockAttireDesc);
      const defaultPlate = STUDIO_PLATES_CATALOG["section_01_anchor_desk"];

      expect(doc).toContain(defaultPlate.label);
      expect(doc).toContain(defaultPlate.description);
    });

    it("should fallback to section_01_anchor_desk if studioPlateKey is invalid", () => {
      const doc = buildStudioPhotoshootContextDocument(mockPersona, mockAttireDesc, "invalid_plate_key");
      const defaultPlate = STUDIO_PLATES_CATALOG["section_01_anchor_desk"];

      expect(doc).toContain(defaultPlate.label);
      expect(doc).toContain(defaultPlate.description);
    });

    it("should use a fallback skin tone if persona lacks skinTone", () => {
      const personaWithoutSkinTone: Persona = {
        ...mockPersona,
        traits: {
          ...mockPersona.traits,
          skinTone: "" as any,
        },
      };

      const doc = buildStudioPhotoshootContextDocument(personaWithoutSkinTone, mockAttireDesc);
      expect(doc).toContain("smooth natural skin with realistic pores and specular catchlights");
    });
  });

  describe("buildTargetedPersonaContextDocument", () => {
    it("should build a document with a single active persona", () => {
      const doc = buildTargetedPersonaContextDocument(["ruby"]);

      expect(doc).toContain("# RUBY NEWSSTUDIO TARGETED BROADCAST CONTEXT");
      expect(doc).toContain("## Active Anchor Personas (1)");
      expect(doc).toContain("[ID: ruby]");
    });

    it("should build a document with multiple active personas", () => {
      const doc = buildTargetedPersonaContextDocument(["ruby", "storm"]);

      expect(doc).toContain("## Active Anchor Personas (2)");
      expect(doc).toContain("[ID: ruby]");
      expect(doc).toContain("[ID: storm]");
    });

    it("should default to first persona if no active IDs match", () => {
      const doc = buildTargetedPersonaContextDocument(["unknown_persona"]);
      expect(doc).toContain("## Active Anchor Personas (1)");
    });

    it("should default to ruby if no argument is passed", () => {
      const doc = buildTargetedPersonaContextDocument();
      expect(doc).toContain("## Active Anchor Personas (1)");
      expect(doc).toContain("[ID: ruby]");
    });

    it("should apply fallbacks for missing optional traits", () => {
      const fallbackPersona: Persona = {
        ...mockPersona,
        id: "mock_fallback_persona",
        traits: {
          age: 25,
          heightCm: 170,
          heightFeet: "5'7",
          weightKg: 60,
          weightLbs: 132,
          face: "round face",
          // Intentionally omitting skinTone, hair, build, and defaultAttire to test fallbacks
        } as any,
      };

      PERSONAS.push(fallbackPersona);

      try {
        const doc = buildTargetedPersonaContextDocument(["mock_fallback_persona"]);

        expect(doc).toContain("- Skin Tone: natural");
        expect(doc).toContain("- Hair: natural");
        expect(doc).toContain("- Build: athletic broadcast anchor physique");
        expect(doc).toContain("- Default Attire: Professional Broadcast Suit");
      } finally {
        // Clean up the temporarily added persona
        PERSONAS.pop();
      }
    });
  });
});
