import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  DUAL_TIER_VOICE_PROFILES,
  VOICE_CATALOG,
  getVoiceProfileByPersonaId,
  getTier1VoiceConfig,
  getTier2VoiceConfig,
  getVoiceConfigForMode,
  getSpanishRioplatensePersonas,
  getEnglishPersonas,
  getPersonasByLocale,
  getBenchmarkSummary,
  resolveDualTierVoiceOptions,
  generateDualTierAudio,
} from "../lib/tts/voiceCatalog";
import { PERSONAS, getPersonaById, getPersonaDualTierVoice } from "../lib/tts/personas";

describe("Dual-Tier Voice Vault & Audio Catalog Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Roster Integrity (48 Personas)
  // ─────────────────────────────────────────────────────────────────────────
  describe("Task 1: 48-Persona Roster Integrity & Dual-Tier Architecture", () => {
    it("should contain exactly 48 personas in DUAL_TIER_VOICE_PROFILES and VOICE_CATALOG", () => {
      expect(DUAL_TIER_VOICE_PROFILES).toHaveLength(48);
      expect(Object.keys(VOICE_CATALOG)).toHaveLength(48);
      expect(PERSONAS).toHaveLength(48);
    });

    it("every persona in PERSONAS must have a corresponding DualTierVoiceProfile", () => {
      for (const persona of PERSONAS) {
        const profile = VOICE_CATALOG[persona.id.toLowerCase()];
        expect(profile).toBeDefined();
        expect(profile.personaId.toLowerCase()).toBe(persona.id.toLowerCase());
        expect(profile.gender).toBe(persona.gender);
        expect(profile.voiceFile).toBe(persona.voiceFile);
        expect(profile.voiceFile.endsWith(".wav")).toBe(true);
      }
    });

    it("every persona profile must have valid Tier 1 (Real-Time) and Tier 2 (Studio Master) configurations", () => {
      for (const profile of DUAL_TIER_VOICE_PROFILES) {
        // Tier 1 Real-Time Mode checks
        expect(profile.tier1).toBeDefined();
        expect(profile.tier1.engine).toBe("piper");
        expect(profile.tier1.model).toBeTruthy();
        expect(profile.tier1.latencyTargetMs).toBeLessThanOrEqual(150);
        expect(profile.tier1.latencyTargetMs).toBeGreaterThan(0);
        expect(profile.tier1.rtf).toBeLessThan(0.05);
        expect(profile.tier1.sampleRate).toBeGreaterThan(0);
        expect(profile.tier1.speedFactor).toBeGreaterThanOrEqual(0.5);
        expect(profile.tier1.speedFactor).toBeLessThanOrEqual(2.0);

        // Tier 2 Studio Master Mode checks
        expect(profile.tier2).toBeDefined();
        expect(["f5_tts", "styletts2", "cosyvoice_3", "xtts_v2"]).toContain(profile.tier2.engine);
        expect(profile.tier2.checkpoint).toBeTruthy();
        expect(profile.tier2.referenceAudio).toBe(profile.voiceFile);
        expect(profile.tier2.timbreIdentity).toBeTruthy();
        expect(profile.tier2.expressivenessRating).toBeGreaterThanOrEqual(4.5);
        expect(profile.tier2.speedFactor).toBeGreaterThanOrEqual(0.5);
        expect(profile.tier2.speedFactor).toBeLessThanOrEqual(2.0);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Spanish Rioplatense Persona Specific Mappings
  // ─────────────────────────────────────────────────────────────────────────
  describe("Task 2: Spanish Rioplatense (es_AR / es_UY / es_PY) Specific Mappings", () => {
    it("should retrieve all Spanish Rioplatense / Southern Cone personas", () => {
      const rioplatensePersonas = getSpanishRioplatensePersonas();
      expect(rioplatensePersonas.length).toBeGreaterThanOrEqual(20);

      const ids = rioplatensePersonas.map((p) => p.personaId);
      expect(ids).toContain("mateo");
      expect(ids).toContain("camila");
      expect(ids).toContain("sofia");
      expect(ids).toContain("diego");
      expect(ids).toContain("valentina");
      expect(ids).toContain("bautista");
      expect(ids).toContain("lucia");
      expect(ids).toContain("constanza");
    });

    it("female Rioplatense personas must map to pretrained/fine-tuned Piper Rioplatense ONNX models", () => {
      const femaleProfiles = getSpanishRioplatensePersonas().filter((p) => p.gender === "female");

      for (const female of femaleProfiles) {
        expect(female.tier1.model).toMatch(/^es_AR-(daniela|paola|florencia|camila|sofia|lucia|valentina|agustina)/);
        expect(female.tier2.referenceAudio).toBe(female.voiceFile);
      }
    });

    it("male Rioplatense personas must map to custom trained Piper Rioplatense ONNX models", () => {
      const maleProfiles = getSpanishRioplatensePersonas().filter((p) => p.gender === "male");

      for (const male of maleProfiles) {
        expect(male.tier1.model).toMatch(/^es_AR-(diego|lucas|mateo|facundo|gonzalo|bautista|joaquin|nicolas|tomas|nacho|renzo|fede)-custom/);
        expect(male.tier2.referenceAudio).toBe(male.voiceFile);
      }
    });

    it("should ensure identical acoustic reference embedding across Tier 1 and Tier 2 for Mateo", () => {
      const mateo = getVoiceProfileByPersonaId("mateo");
      expect(mateo).toBeDefined();
      expect(mateo?.tier1.engine).toBe("piper");
      expect(mateo?.tier1.model).toBe("es_AR-mateo-custom");
      expect(mateo?.tier2.engine).toBe("f5_tts");
      expect(mateo?.tier2.checkpoint).toBe("jpgallegoar/F5-Spanish");
      expect(mateo?.tier2.referenceAudio).toBe("mateo.wav");
      expect(mateo?.voiceFile).toBe("mateo.wav");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 3. English Personas Benchmark Metrics
  // ─────────────────────────────────────────────────────────────────────────
  describe("Task 3: English Personas (en_US / en_GB) Quality & Accuracy Benchmarks", () => {
    it("should retrieve all English personas with robust benchmark metrics", () => {
      const englishPersonas = getEnglishPersonas();
      expect(englishPersonas.length).toBeGreaterThanOrEqual(20);

      for (const en of englishPersonas) {
        const b = en.benchmarks;
        // MOS (Mean Opinion Score) Quality >= 4.7
        expect(b.mos).toBeGreaterThanOrEqual(4.7);
        // Speed (RTF) Tier 1 < 0.05
        expect(b.rtfTier1).toBeLessThan(0.05);
        // Speed (RTF) Tier 2 < 0.50
        expect(b.rtfTier2).toBeLessThan(0.5);
        // Phonetic Accuracy >= 98.0%
        expect(b.phoneticAccuracy).toBeGreaterThanOrEqual(98.0);
        // Proper names, financial tickers, numbers accuracy >= 98.0%
        expect(b.properNamesAccuracy).toBeGreaterThanOrEqual(98.0);
        expect(b.financialTickersAccuracy).toBeGreaterThanOrEqual(98.0);
        expect(b.numbersAccuracy).toBeGreaterThanOrEqual(99.0);
      }
    });

    it("should assign optimal Piper and F5-TTS models for lead English anchor Storm Sterling", () => {
      const storm = getVoiceProfileByPersonaId("storm");
      expect(storm).toBeDefined();
      expect(storm?.tier1.model).toBe("en_US-hfc_female-medium");
      expect(storm?.tier1.latencyTargetMs).toBeLessThanOrEqual(120);
      expect(storm?.tier1.rtf).toBeLessThan(0.04);
      expect(storm?.tier2.checkpoint).toBe("SWivid/F5-TTS");
      expect(storm?.tier2.referenceAudio).toBe("storm.wav");
      expect(storm?.benchmarks.mos).toBeGreaterThanOrEqual(4.7);
    });

    it("should filter personas by locale (en_US, en_GB, es_AR, es_ES, fr_FR, it_IT, de_DE)", () => {
      expect(getPersonasByLocale("en_US").length).toBeGreaterThan(0);
      expect(getPersonasByLocale("en_GB").length).toBeGreaterThan(0);
      expect(getPersonasByLocale("es_AR").length).toBeGreaterThan(0);
      expect(getPersonasByLocale("es_ES").length).toBeGreaterThan(0);
      expect(getPersonasByLocale("fr_FR").length).toBeGreaterThan(0);
      expect(getPersonasByLocale("it_IT").length).toBeGreaterThan(0);
      expect(getPersonasByLocale("de_DE").length).toBeGreaterThan(0);
    });

    it("should compute overall benchmark summary accurately", () => {
      const summary = getBenchmarkSummary();
      expect(summary.totalPersonas).toBe(48);
      expect(summary.avgMos).toBeGreaterThanOrEqual(4.8);
      expect(summary.avgRtfTier1).toBeLessThan(0.05);
      expect(summary.avgPhoneticAccuracy).toBeGreaterThanOrEqual(98.5);
      expect(summary.avgFinancialAccuracy).toBeGreaterThanOrEqual(98.5);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Helper Functions & Resolution
  // ─────────────────────────────────────────────────────────────────────────
  describe("Task 4: Lookup, Resolution, and Audio Generation Integration", () => {
    it("getVoiceProfileByPersonaId should be case-insensitive", () => {
      expect(getVoiceProfileByPersonaId("RUBY")).toBeDefined();
      expect(getVoiceProfileByPersonaId("ruby")).toBeDefined();
      expect(getVoiceProfileByPersonaId("MATEO")).toBeDefined();
      expect(getVoiceProfileByPersonaId("non_existent")).toBeUndefined();
    });

    it("getTier1VoiceConfig and getTier2VoiceConfig should return correct configurations", () => {
      const t1 = getTier1VoiceConfig("ruby");
      const t2 = getTier2VoiceConfig("ruby");

      expect(t1?.engine).toBe("piper");
      expect(t1?.model).toBe("es_AR-daniela-high");

      expect(t2?.engine).toBe("f5_tts");
      expect(t2?.checkpoint).toBe("jpgallegoar/F5-Spanish");
    });

    it("getVoiceConfigForMode should return config for fast vs studio modes", () => {
      const fastConfig = getVoiceConfigForMode("ruby", "fast");
      const studioConfig = getVoiceConfigForMode("ruby", "studio");

      expect(fastConfig?.engine).toBe("piper");
      expect(fastConfig?.modelOrCheckpoint).toBe("es_AR-daniela-high");

      expect(studioConfig?.engine).toBe("f5_tts");
      expect(studioConfig?.modelOrCheckpoint).toBe("jpgallegoar/F5-Spanish");
      expect(studioConfig?.referenceAudio).toBe("ruby.wav");
    });

    it("resolveDualTierVoiceOptions should automatically set yeismo for es_AR personas", () => {
      const mateoFast = resolveDualTierVoiceOptions("mateo", "tier1");
      expect(mateoFast.engine).toBe("piper");
      expect(mateoFast.checkpoint).toBe("es_AR-mateo-custom");
      expect(mateoFast.applyYeismo).toBe(true);

      const rubyFast = resolveDualTierVoiceOptions("ruby", "tier1");
      expect(rubyFast.engine).toBe("piper");
      expect(rubyFast.applyYeismo).toBe(true);
    });

    it("getPersonaById in personas.ts should attach voiceProfile seamlessly", () => {
      const rubyPersona = getPersonaById("ruby");
      expect(rubyPersona).toBeDefined();
      expect(rubyPersona?.voiceProfile).toBeDefined();
      expect(rubyPersona?.voiceProfile?.personaId).toBe("ruby");
      expect(rubyPersona?.voiceProfile?.tier1.engine).toBe("piper");

      const profile = getPersonaDualTierVoice("ruby");
      expect(profile?.personaName).toBe("Ruby Vance");
    });

    it("generateDualTierAudio should call generateAudioWithModernTts with resolved options", async () => {
      const fakeWav = new Uint8Array([0x52, 0x49, 0x46, 0x46]).buffer;

      vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({
          "x-news-engine": "piper",
          "x-news-model": "es_AR-daniela-high",
        }),
        arrayBuffer: async () => fakeWav,
      } as any);

      const result = await generateDualTierAudio("Live breaking news update", "ruby", "tier1");
      expect(result.usedEngine).toBe("piper");
      expect(Buffer.isBuffer(result)).toBe(true);
    });
  });
});
