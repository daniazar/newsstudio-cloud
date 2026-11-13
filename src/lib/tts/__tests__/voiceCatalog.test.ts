import { describe, it, expect } from "vitest";
import {
  DUAL_TIER_VOICE_PROFILES,
  getVoiceProfileByPersonaId,
  getTier1VoiceConfig,
  getTier2VoiceConfig,
  getVoiceConfigForMode,
  getSpanishRioplatensePersonas,
  getEnglishPersonas,
  getPersonasByLocale,
  getBenchmarkSummary,
  resolveDualTierVoiceOptions,
} from "../voiceCatalog";

describe("Voice Catalog", () => {
  it("should have DUAL_TIER_VOICE_PROFILES array with items", () => {
    expect(DUAL_TIER_VOICE_PROFILES).toBeDefined();
    expect(Array.isArray(DUAL_TIER_VOICE_PROFILES)).toBe(true);
    expect(DUAL_TIER_VOICE_PROFILES.length).toBeGreaterThan(0);
  });

  describe("getVoiceProfileByPersonaId", () => {
    it("should return a profile for an existing personaId (case insensitive)", () => {
      const profile = getVoiceProfileByPersonaId("ruby");
      expect(profile).toBeDefined();
      expect(profile?.personaId).toBe("ruby");

      const profileUpper = getVoiceProfileByPersonaId("RUBY");
      expect(profileUpper).toBeDefined();
      expect(profileUpper?.personaId).toBe("ruby");
    });

    it("should return undefined for a non-existing personaId", () => {
      const profile = getVoiceProfileByPersonaId("non_existent_persona_123");
      expect(profile).toBeUndefined();
    });
  });

  describe("getTier1VoiceConfig", () => {
    it("should return tier1 config for an existing personaId", () => {
      const config = getTier1VoiceConfig("ruby");
      expect(config).toBeDefined();
      expect(config?.engine).toBe("piper");
    });

    it("should return undefined for a non-existing personaId", () => {
      const config = getTier1VoiceConfig("non_existent");
      expect(config).toBeUndefined();
    });
  });

  describe("getTier2VoiceConfig", () => {
    it("should return tier2 config for an existing personaId", () => {
      const config = getTier2VoiceConfig("ruby");
      expect(config).toBeDefined();
      expect(config?.engine).toBeDefined(); // f5_tts, styletts2, etc.
    });

    it("should return undefined for a non-existing personaId", () => {
      const config = getTier2VoiceConfig("non_existent");
      expect(config).toBeUndefined();
    });
  });

  describe("getVoiceConfigForMode", () => {
    it("should return tier1 config for 'fast' mode", () => {
      const config = getVoiceConfigForMode("ruby", "fast");
      expect(config).toBeDefined();
      expect(config?.engine).toBe("piper");
      expect(config?.modelOrCheckpoint).toBeDefined();
    });

    it("should return tier2 config for 'expressive' mode", () => {
      const config = getVoiceConfigForMode("ruby", "studio");
      expect(config).toBeDefined();
      expect(config?.engine).toBeDefined();
      expect(config?.modelOrCheckpoint).toBeDefined();
    });

    it("should return undefined for a non-existing personaId", () => {
      const config = getVoiceConfigForMode("non_existent", "fast");
      expect(config).toBeUndefined();
    });
  });

  describe("getSpanishRioplatensePersonas", () => {
    it("should return personas with es_AR, es_UY, or es_PY locales", () => {
      const personas = getSpanishRioplatensePersonas();
      expect(personas.length).toBeGreaterThan(0);
      personas.forEach((p) => {
        expect(["es_AR", "es_UY", "es_PY"]).toContain(p.locale);
      });
    });
  });

  describe("getEnglishPersonas", () => {
    it("should return personas with language 'en'", () => {
      const personas = getEnglishPersonas();
      expect(personas.length).toBeGreaterThan(0);
      personas.forEach((p) => {
        expect(p.language).toBe("en");
      });
    });
  });

  describe("getPersonasByLocale", () => {
    it("should return personas matching the locale (case insensitive)", () => {
      const enUsPersonas = getPersonasByLocale("en_US");
      expect(enUsPersonas.length).toBeGreaterThan(0);
      enUsPersonas.forEach((p) => {
        expect(p.locale).toBe("en_US");
      });

      const esArPersonasLower = getPersonasByLocale("es_ar");
      expect(esArPersonasLower.length).toBeGreaterThan(0);
      esArPersonasLower.forEach((p) => {
        expect(p.locale).toBe("es_AR");
      });
    });

    it("should return empty array for non-matching locale", () => {
      const personas = getPersonasByLocale("xx_XX");
      expect(personas).toEqual([]);
    });
  });

  describe("getBenchmarkSummary", () => {
    it("should calculate correct benchmark summary", () => {
      const summary = getBenchmarkSummary();
      expect(summary.totalPersonas).toBe(DUAL_TIER_VOICE_PROFILES.length);
      expect(summary.avgMos).toBeGreaterThan(0);
      expect(summary.avgRtfTier1).toBeGreaterThan(0);
      expect(summary.avgRtfTier2).toBeGreaterThan(0);
      expect(summary.avgPhoneticAccuracy).toBeGreaterThan(0);
      expect(summary.avgFinancialAccuracy).toBeGreaterThan(0);
    });
  });

  describe("resolveDualTierVoiceOptions", () => {
    it("should resolve tier1 options correctly for 'tier1' tier", () => {
      const options = resolveDualTierVoiceOptions("ruby", "tier1");
      expect(options.engine).toBe("piper");
      expect(options.personaId).toBe("ruby");
      expect(options.language).toBe("es");
      expect(options.applyYeismo).toBe(true); // ruby has es_AR locale
    });

    it("should resolve tier1 options correctly for 'fast' tier", () => {
      const options = resolveDualTierVoiceOptions("ruby", "fast");
      expect(options.engine).toBe("piper");
    });

    it("should resolve tier2 options correctly for 'tier2' tier", () => {
      const options = resolveDualTierVoiceOptions("ruby", "tier2");
      expect(options.engine).toBe("f5_tts"); // as defined in the default config
      expect(options.personaId).toBe("ruby");
    });

    it("should resolve tier2 options correctly for 'studio' tier", () => {
      const options = resolveDualTierVoiceOptions("ruby", "studio");
      expect(options.engine).toBe("f5_tts");
    });

    it("should apply overrides", () => {
      const options = resolveDualTierVoiceOptions("ruby", "tier1", { speedFactor: 1.5 });
      expect(options.speedFactor).toBe(1.5);
    });

    it("should handle non-existing persona smoothly falling back to overrides and default engines", () => {
      const optionsFast = resolveDualTierVoiceOptions("non_existent", "fast", { pitchShift: 2 });
      expect(optionsFast.engine).toBe("piper");
      expect(optionsFast.personaId).toBe("non_existent");
      expect(optionsFast.pitchShift).toBe(2);

      const optionsStudio = resolveDualTierVoiceOptions("non_existent", "studio");
      expect(optionsStudio.engine).toBe("f5_tts");
      expect(optionsStudio.personaId).toBe("non_existent");
    });
  });
});
