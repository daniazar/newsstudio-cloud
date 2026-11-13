import { describe, it, expect } from "vitest";
import {
  getDefaultEngineForMode,
  getModelPromptDirectives,
  getPromptSystemInstruction,
  buildSingleSegmentNormalizationPrompt,
  UNIVERSAL_BROADCAST_RULES,
} from "../modelPromptDirectives";
import { computeAudioCacheKey } from "@/lib/ecommerce/voiceSynthesisCalibrator";
import { AdScene } from "@/lib/types/ecommerce";

describe("Two-Tier Text Normalization & Model Audio Defaults", () => {
  describe("getDefaultEngineForMode", () => {
    it("returns 'kokoro' for realtime mode in English", () => {
      expect(getDefaultEngineForMode("realtime", "en")).toBe("kokoro");
      expect(getDefaultEngineForMode("realtime", "en-US")).toBe("kokoro");
      expect(getDefaultEngineForMode("realtime", "en-GB")).toBe("kokoro");
    });

    it("returns 'piper' for realtime mode in Spanish", () => {
      expect(getDefaultEngineForMode("realtime", "es")).toBe("piper");
      expect(getDefaultEngineForMode("realtime", "es-AR")).toBe("piper");
      expect(getDefaultEngineForMode("realtime", "es-ES")).toBe("piper");
    });

    it("returns 'omni' for news mode across all languages", () => {
      expect(getDefaultEngineForMode("news", "es")).toBe("omni");
      expect(getDefaultEngineForMode("news", "en")).toBe("omni");
      expect(getDefaultEngineForMode("news", "fr")).toBe("omni");
    });

    it("returns 'omni' for ecommerce mode across all languages", () => {
      expect(getDefaultEngineForMode("ecommerce", "es")).toBe("omni");
      expect(getDefaultEngineForMode("ecommerce", "en")).toBe("omni");
      expect(getDefaultEngineForMode("ecommerce", "pt")).toBe("omni");
    });

    it("defaults to 'news' mode ('omni') when mode is omitted", () => {
      expect(getDefaultEngineForMode()).toBe("omni");
    });
  });

  describe("Engine-Specific Directives & Prompts", () => {
    it("provides Piper Spanish directives targeting VITS pronunciation pitfalls", () => {
      const directives = getModelPromptDirectives("piper", "es");
      expect(directives.engineName).toContain("Piper");
      expect(directives.language).toBe("es");
      expect(directives.rules.some((r) => r.includes("SALUTATION CADENCE"))).toBe(true);
      expect(directives.rules.some((r) => r.includes("FOREIGN BRANDS"))).toBe(true);
      expect(directives.rules.some((r) => r.includes("VOWEL HIATUS"))).toBe(true);
    });

    it("provides Kokoro English directives targeting acronyms and broadcast prosody", () => {
      const directives = getModelPromptDirectives("kokoro", "en");
      expect(directives.engineName).toContain("Kokoro");
      expect(directives.language).toBe("en");
      expect(directives.rules.some((r) => r.includes("ACRONYM LETTER SPACING"))).toBe(true);
      expect(directives.rules.some((r) => r.includes("BROADCAST PROSODY"))).toBe(true);
    });

    it("provides OmniVoice directives with LATAM phonetic clarity", () => {
      const directives = getModelPromptDirectives("omni", "es");
      expect(directives.engineName).toContain("OmniVoice");
      expect(directives.language).toBe("es");
      expect(directives.rules.some((r) => r.includes("CLAUSE LENGTH CEILING"))).toBe(true);
      expect(directives.rules.some((r) => r.includes("BREATHING PUNCTUATION"))).toBe(true);
    });

    it("injects both universal broadcast rules and engine-specific rules into prompt instructions", () => {
      const prompt = getPromptSystemInstruction("kokoro", "en");
      expect(prompt).toContain("PART 1 — UNIVERSAL BROADCAST SCRIPT RULES");
      expect(prompt).toContain("PART 2 — ENGINE-SPECIFIC ACOUSTIC & PHONETIC DIRECTIVES");
      expect(prompt).toContain("PART 3 — EMPIRICALLY VALIDATED EXAMPLES");
      expect(prompt).toContain("Kokoro");
      expect(prompt).toContain(UNIVERSAL_BROADCAST_RULES[0].slice(0, 30));
    });

    it("builds a single segment normalization prompt with strict output boundaries", () => {
      const { systemInstruction, userPrompt } = buildSingleSegmentNormalizationPrompt(
        "Apple subió 3.5% hoy en Wall St.",
        "piper",
        "es"
      );
      expect(systemInstruction).toContain("ONLY the clean, perfected spoken string");
      expect(userPrompt).toContain("Apple subió 3.5% hoy en Wall St.");
      expect(userPrompt).toContain("piper (es)");
    });
  });

  describe("Two-Tier Text Preservation in E-Commerce & Editor", () => {
    it("distinguishes visual subtitle from spoken acoustic script in AdScene data model", () => {
      const scene: AdScene = {
        id: "test-scene-1",
        sceneIndex: 0,
        startFrame: 0,
        durationFrames: 90,
        sceneType: "pattern_interrupt_hook",
        headline: "¡Oferta Relámpago!",
        visualActionPrompt: "Close-up of smart watch",
        voiceoverScript: "El nuevo smartwatch cuesta solo $199 USD y tiene 50% de descuento.",
        spokenVoiceoverScript: "¡Buenas noticias! El nuevo es-mart-uatch cuesta solo ciento noventa y nueve dólares, y tiene cincuenta por ciento de descuento.",
        primaryMediaUrl: "/media/test.mp4",
      };

      // Visual subtitle must remain clean and pristine for Remotion CaptionsLayer
      expect(scene.voiceoverScript).toBe("El nuevo smartwatch cuesta solo $199 USD y tiene 50% de descuento.");
      // Spoken voiceover must have phonetically verbalized numbers and brands for neural TTS
      expect(scene.spokenVoiceoverScript).toContain("ciento noventa y nueve dólares");
      expect(scene.spokenVoiceoverScript).toContain("cincuenta por ciento");
      expect(scene.spokenVoiceoverScript).toContain("es-mart-uatch");
    });

    it("computes distinct audio cache keys for different spoken scripts of the same visual text", () => {
      const visualText = "Tesla subió 4.2% hoy.";
      const spokenForPiper = "¡Atención! La empresa Tesla, subió cuatro coma dos por ciento hoy.";
      const spokenForKokoro = "Tesla rose four point two percent today.";

      const keyPiper = computeAudioCacheKey(spokenForPiper, {
        personaId: "ruby",
        speed: 1.0,
        pitchShift: 0,
        engine: "piper",
        language: "es",
      });

      const keyKokoro = computeAudioCacheKey(spokenForKokoro, {
        personaId: "ruby",
        speed: 1.0,
        pitchShift: 0,
        engine: "kokoro",
        language: "en",
      });

      expect(keyPiper).not.toBe(keyKokoro);
    });
  });
});
