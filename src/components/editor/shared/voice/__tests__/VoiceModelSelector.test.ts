/**
 * src/components/editor/shared/voice/__tests__/VoiceModelSelector.test.ts
 *
 * Unit tests for Persona-Mapped Voices, OmniVoice/Piper defaults,
 * removal of Orpheus, and automatic checkpoint resolution.
 */

import { describe, it, expect } from "vitest";
import { MODERN_ENGINES } from "../VoiceModelSelector";
import { PERSONAS, getDefaultVoiceConfig, resolvePersonaVoiceSettings } from "@/lib/tts/personas";
import { getVoiceProfileByPersonaId } from "@/lib/tts/voiceCatalog";

describe("VoiceModelSelector Persona Mapping & Engine Catalog", () => {
  it("defaults to OmniVoice and Piper ONNX as the primary first two models", () => {
    expect(MODERN_ENGINES.length).toBeGreaterThanOrEqual(2);
    expect(MODERN_ENGINES[0].id).toBe("omni");
    expect(MODERN_ENGINES[0].name).toBe("OmniVoice");
    expect(MODERN_ENGINES[0].badge).toContain("Default Studio");

    expect(MODERN_ENGINES[1].id).toBe("piper");
    expect(MODERN_ENGINES[1].name).toBe("Piper ONNX");
    expect(MODERN_ENGINES[1].badge).toContain("Default Fast");
  });

  it("removes orpheus from the supported modern engine catalog", () => {
    const hasOrpheus = MODERN_ENGINES.some(
      (e) => e.id.toLowerCase().includes("orpheus") || e.name.toLowerCase().includes("orpheus")
    );
    expect(hasOrpheus).toBe(false);
  });

  it("automatically resolves checkpoints based on persona without requiring manual input", () => {
    // 1. Ruby Vance (Spanish - Argentina)
    const rubyProfile = getVoiceProfileByPersonaId("ruby");
    expect(rubyProfile).toBeDefined();
    expect(rubyProfile?.tier1.model).toBe("es_AR-daniela-high");
    expect(rubyProfile?.tier2.checkpoint).toBe("jpgallegoar/F5-Spanish");
    expect(rubyProfile?.voiceFile).toBe("ruby.wav");

    // 2. Valentina Paz (Spanish - Argentina)
    const valentinaProfile = getVoiceProfileByPersonaId("valentina");
    expect(valentinaProfile).toBeDefined();
    expect(valentinaProfile?.tier1.model).toBe("es_AR-daniela-high");
    expect(valentinaProfile?.tier2.checkpoint).toBe("jpgallegoar/F5-Spanish");
    expect(valentinaProfile?.voiceFile).toBe("valentina.wav");
  });

  it("maps persona language and gender correctly across the persona vault", () => {
    const ruby = PERSONAS.find((p) => p.id === "ruby");
    expect(ruby?.language).toBe("es");
    expect(ruby?.gender).toBe("female");

    const diego = PERSONAS.find((p) => p.id === "diego");
    expect(diego).toBeDefined();
    expect(diego?.gender).toBe("male");
  });

  it("checks language first, then genre (gender) when resolving voice defaults", () => {
    // 1. Spanish Female -> es_AR-daniela-high, valentina.wav
    const esFemale = getDefaultVoiceConfig("es", "female");
    expect(esFemale.language).toBe("es");
    expect(esFemale.gender).toBe("female");
    expect(esFemale.piperModel).toBe("es_AR-daniela-high");
    expect(esFemale.defaultVoiceFile).toBe("valentina.wav");

    // 2. Spanish Male -> es_AR-mateo-custom, mateo.wav
    const esMale = getDefaultVoiceConfig("es", "male");
    expect(esMale.language).toBe("es");
    expect(esMale.gender).toBe("male");
    expect(esMale.piperModel).toBe("es_AR-mateo-custom");
    expect(esMale.defaultVoiceFile).toBe("mateo.wav");

    // 3. English Female -> en_US-lessac-high, Emily.wav
    const enFemale = getDefaultVoiceConfig("en", "female");
    expect(enFemale.language).toBe("en");
    expect(enFemale.gender).toBe("female");
    expect(enFemale.piperModel).toBe("en_US-lessac-high");
    expect(enFemale.defaultVoiceFile).toBe("Emily.wav");

    // 4. English Male -> en_US-ryan-medium, James.wav
    const enMale = getDefaultVoiceConfig("en", "male");
    expect(enMale.language).toBe("en");
    expect(enMale.gender).toBe("male");
    expect(enMale.piperModel).toBe("en_US-ryan-medium");
    expect(enMale.defaultVoiceFile).toBe("James.wav");
  });

  it("uses cloning features to ensure identical voice consistency when persona has an associated voice", () => {
    // Ruby (ES female with ruby.wav associated)
    const rubyVoiceOmni = resolvePersonaVoiceSettings({
      personaId: "ruby",
      engine: "omni",
    });
    expect(rubyVoiceOmni.language).toBe("es");
    expect(rubyVoiceOmni.gender).toBe("female");
    expect(rubyVoiceOmni.hasAssociatedVoice).toBe(true);
    expect(rubyVoiceOmni.isCloningEnabled).toBe(true);
    expect(rubyVoiceOmni.referenceAudio).toBe("ruby.wav");
    expect(rubyVoiceOmni.checkpoint).toContain("k2-fsa/OmniVoice (Ref: ruby.wav)");
    expect(rubyVoiceOmni.cloningBadgeText).toContain("Active Zero-Shot Voice Clone (ruby.wav)");

    // Valentina (ES female with valentina.wav associated)
    const valentinaVoiceOmni = resolvePersonaVoiceSettings({
      personaId: "valentina",
      engine: "omni",
    });
    expect(valentinaVoiceOmni.language).toBe("es");
    expect(valentinaVoiceOmni.gender).toBe("female");
    expect(valentinaVoiceOmni.hasAssociatedVoice).toBe(true);
    expect(valentinaVoiceOmni.isCloningEnabled).toBe(true);
    expect(valentinaVoiceOmni.referenceAudio).toBe("valentina.wav");
    expect(valentinaVoiceOmni.checkpoint).toContain("k2-fsa/OmniVoice (Ref: valentina.wav)");

    // Mateo (ES male with mateo.wav associated)
    const mateoVoiceF5 = resolvePersonaVoiceSettings({
      personaId: "mateo",
      engine: "f5_tts",
    });
    expect(mateoVoiceF5.language).toBe("es");
    expect(mateoVoiceF5.gender).toBe("male");
    expect(mateoVoiceF5.hasAssociatedVoice).toBe(true);
    expect(mateoVoiceF5.isCloningEnabled).toBe(true);
    expect(mateoVoiceF5.referenceAudio).toBe("mateo.wav");
    expect(mateoVoiceF5.checkpoint).toContain("(Ref: mateo.wav)");

    // Piper engine uses dedicated fast ONNX model for the persona
    const valentinaPiper = resolvePersonaVoiceSettings({
      personaId: "valentina",
      engine: "piper",
    });
    expect(valentinaPiper.checkpoint).toBe("es_AR-daniela-high");
  });

  it("handles unmapped or custom personas by falling back to language and genre defaults", () => {
    // Custom French male persona without predefined catalog entry
    const customFrenchMale = resolvePersonaVoiceSettings({
      language: "fr",
      gender: "male",
      engine: "omni",
    });
    expect(customFrenchMale.language).toBe("fr");
    expect(customFrenchMale.gender).toBe("male");
    expect(customFrenchMale.piperModel).toBe("fr_FR-gilles-low");
    expect(customFrenchMale.referenceAudio).toBe("Henri.wav");

    // Custom Italian female persona
    const customItalianFemale = resolvePersonaVoiceSettings({
      language: "it",
      gender: "female",
      engine: "piper",
    });
    expect(customItalianFemale.language).toBe("it");
    expect(customItalianFemale.gender).toBe("female");
    expect(customItalianFemale.checkpoint).toBe("it_IT-paola-medium");
  });

  it("correctly resolves Spanish models and preserves female gender for EN personas speaking Spanish (Ruby, Blaze)", () => {
    // 1. Ruby Vance (EN female) speaking Spanish
    const rubySpanishPiper = resolvePersonaVoiceSettings({
      personaId: "ruby",
      language: "es",
      engine: "piper",
    });
    expect(rubySpanishPiper.language).toBe("es");
    expect(rubySpanishPiper.gender).toBe("female");
    expect(rubySpanishPiper.checkpoint).toBe("es_AR-daniela-high");
    expect(rubySpanishPiper.piperModel).toBe("es_AR-daniela-high");

    const rubySpanishF5 = resolvePersonaVoiceSettings({
      personaId: "ruby",
      language: "es",
      engine: "f5_tts",
    });
    expect(rubySpanishF5.language).toBe("es");
    expect(rubySpanishF5.checkpoint).toContain("jpgallegoar/F5-Spanish");

    // 2. Blaze (EN female) speaking Spanish
    const blazeSpanishPiper = resolvePersonaVoiceSettings({
      personaId: "blaze",
      language: "es",
      engine: "piper",
    });
    expect(blazeSpanishPiper.language).toBe("es");
    expect(blazeSpanishPiper.gender).toBe("female");
    expect(blazeSpanishPiper.checkpoint).toBe("es_AR-daniela-high");
    expect(blazeSpanishPiper.piperModel).toBe("es_AR-daniela-high");

    // 3. Male persona speaking Spanish
    const tomasSpanishPiper = resolvePersonaVoiceSettings({
      personaId: "tomas",
      language: "es",
      engine: "piper",
    });
    expect(tomasSpanishPiper.language).toBe("es");
    expect(tomasSpanishPiper.gender).toBe("male");
    expect(tomasSpanishPiper.checkpoint).toBe("es_AR-tomas-custom");
  });

  it("disables voice cloning when target language differs from persona and checkbox is enabled", () => {
    // 1. Blaze (EN) speaking Spanish (ES) with disableCloningIfDifferentLanguage: true
    const blazeSpanishNoClone = resolvePersonaVoiceSettings({
      personaId: "blaze",
      language: "es",
      engine: "omni",
      disableCloningIfDifferentLanguage: true,
    });
    expect(blazeSpanishNoClone.language).toBe("es");
    expect(blazeSpanishNoClone.gender).toBe("female");
    expect(blazeSpanishNoClone.isCloningEnabled).toBe(false);
    expect(blazeSpanishNoClone.hasAssociatedVoice).toBe(false);
    expect(blazeSpanishNoClone.referenceAudio).toBe("valentina.wav"); // Native Spanish reference
    expect(blazeSpanishNoClone.checkpoint).toBe("k2-fsa/OmniVoice");
    expect(blazeSpanishNoClone.checkpoint).not.toContain("Ref: blaze.wav");
    expect(blazeSpanishNoClone.cloningBadgeText).toContain("Cloning disabled: EN → ES");

    // 2. Blaze (EN) speaking Spanish (ES) with disableCloningIfDifferentLanguage: false (cross-lingual cloning preserved)
    const blazeSpanishWithClone = resolvePersonaVoiceSettings({
      personaId: "blaze",
      language: "es",
      engine: "omni",
      disableCloningIfDifferentLanguage: false,
    });
    expect(blazeSpanishWithClone.isCloningEnabled).toBe(true);
    expect(blazeSpanishWithClone.hasAssociatedVoice).toBe(true);
    expect(blazeSpanishWithClone.referenceAudio).toBe("blaze.wav");
    expect(blazeSpanishWithClone.checkpoint).toContain("Ref: blaze.wav");

    // 3. Valentina Paz (ES) speaking Spanish (ES) with disableCloningIfDifferentLanguage: true
    // Languages match (ES === ES), so cloning MUST NOT be disabled!
    const valentinaSpanish = resolvePersonaVoiceSettings({
      personaId: "valentina",
      language: "es",
      engine: "omni",
      disableCloningIfDifferentLanguage: true,
    });
    expect(valentinaSpanish.isCloningEnabled).toBe(true);
    expect(valentinaSpanish.hasAssociatedVoice).toBe(true);
    expect(valentinaSpanish.referenceAudio).toBe("valentina.wav");
    expect(valentinaSpanish.checkpoint).toContain("(Ref: valentina.wav)");

    // 4. Ruby Vance (ES) speaking Spanish (ES) with disableCloningIfDifferentLanguage: true
    // Languages match (ES === ES), so cloning MUST NOT be disabled!
    const rubySpanish = resolvePersonaVoiceSettings({
      personaId: "ruby",
      language: "es",
      engine: "omni",
      disableCloningIfDifferentLanguage: true,
    });
    expect(rubySpanish.isCloningEnabled).toBe(true);
    expect(rubySpanish.hasAssociatedVoice).toBe(true);
    expect(rubySpanish.referenceAudio).toBe("ruby.wav");
    expect(rubySpanish.checkpoint).toContain("(Ref: ruby.wav)");

    // 5. Ruby Vance (ES) speaking English (EN) with disableCloningIfDifferentLanguage: true
    // Languages differ (ES → EN), so cloning is disabled!
    const rubyEnglishNoClone = resolvePersonaVoiceSettings({
      personaId: "ruby",
      language: "en",
      engine: "omni",
      disableCloningIfDifferentLanguage: true,
    });
    expect(rubyEnglishNoClone.isCloningEnabled).toBe(false);
    expect(rubyEnglishNoClone.referenceAudio).toBe("Emily.wav");
    expect(rubyEnglishNoClone.cloningBadgeText).toContain("Cloning disabled: ES → EN");
  });
});


