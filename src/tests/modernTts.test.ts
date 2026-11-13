import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  applyRioplatenseYeismo,
  normalizeFinancialAcronyms,
  normalizeCurrenciesAndNumbers,
  normalizeTextForSpeech,
  numberStringToWords,
} from "../lib/tts/phoneticGlossary";
import {
  parseInlineSfxAndPauses,
  stripAllInlineTags,
  splitIntoRemotionTracks,
  parsePauseDuration,
} from "../lib/sfx/inlineSfxParser";
import {
  CADENCE_PRESETS,
  getCadencePreset,
  applyCadencePreset,
} from "../lib/tts/cadencePresets";
import {
  preprocessTextForTts,
} from "../lib/tts/textPreprocessor";
import {
  generateAudioWithModernTts,
  generateAudioWithModernTtsResult,
  checkModernTtsHealth,
  streamPiperTtsAudio,
} from "../lib/tts/modernTtsClient";
import { checkTTSHealth } from "../lib/health";

describe("Worker 4: Speech & Audio Hub Suite", () => {
  // ─────────────────────────────────────────────────────────────────────────
  // 1. Custom Pronunciation Glossaries & Text Normalization Tests
  // ─────────────────────────────────────────────────────────────────────────
  describe("Task 1: Custom Pronunciation Glossaries & Text Normalization", () => {
    describe("Argentine Spanish Rioplatense Yeísmo Rehilado (ll/y -> sh)", () => {
      it("should transform 'yo me llamo' to 'sho me shamo'", () => {
        const input = "yo me llamo";
        const result = applyRioplatenseYeismo(input);
        expect(result).toBe("sho me shamo");
      });

      it("should convert 'Yo me llamo' with proper capitalization to 'Sho me shamo'", () => {
        const input = "Yo me llamo";
        const result = applyRioplatenseYeismo(input);
        expect(result).toBe("Sho me shamo");
      });

      it("should convert uppercase 'YO ME LLAMO' to 'SHO ME SHAMO'", () => {
        const input = "YO ME LLAMO";
        const result = applyRioplatenseYeismo(input);
        expect(result).toBe("SHO ME SHAMO");
      });

      it("should transform words with 'll' and 'y' before vowels ('playa', 'calle', 'llegar', 'ayer', 'lluvia')", () => {
        expect(applyRioplatenseYeismo("Vamos a la playa")).toBe("Vamos a la plasha");
        expect(applyRioplatenseYeismo("Cruzar la calle")).toBe("Cruzar la cashe");
        expect(applyRioplatenseYeismo("Llegar a tiempo")).toBe("Shegar a tiempo");
        expect(applyRioplatenseYeismo("Ayer por la tarde")).toBe("Asher por la tarde");
        expect(applyRioplatenseYeismo("La lluvia de mayo")).toBe("La shuvia de masho");
        expect(applyRioplatenseYeismo("El proyecto de ley")).toBe("El proshecto de ley");
      });

      it("should PRESERVE conjunction 'y' and end-of-word diphthongs ('hoy', 'muy', 'rey', 'ley')", () => {
        // Conjunction 'y' between words must NOT turn to 'sh'
        const conjunction = "pan y manteca";
        expect(applyRioplatenseYeismo(conjunction)).toBe("pan y manteca");

        // End of word 'y' (diphthongs) must remain 'y'
        expect(applyRioplatenseYeismo("hoy es un día muy lindo")).toBe("hoy es un día muy lindo");
        expect(applyRioplatenseYeismo("el rey y la ley")).toBe("el rey y la ley");
        expect(applyRioplatenseYeismo("viaje a Uruguay y Paraguay")).toBe("viaje a Uruguay y Paraguay");
      });
    });

    describe("Financial Acronyms & Tickers Normalization", () => {
      it("should normalize Spanish financial tickers & acronyms (BTC, YPF, FED, Q3, BCRA)", () => {
        const input = "El valor de BTC subió mientras YPF y la FED anunciaron resultados del Q3 y el BCRA intervino.";
        const result = normalizeFinancialAcronyms(input, "es");

        expect(result).toContain("Bitcoin");
        expect(result).toContain("I-P-F");
        expect(result).toContain("Reserva Federal");
        expect(result).toContain("tercer trimestre");
        expect(result).toContain("Banco Central");
      });

      it("should normalize English financial acronyms & tickers (BTC, FED, Q3, GDP, CEO)", () => {
        const input = "The CEO stated that BTC jumped after the FED published Q3 GDP figures.";
        const result = normalizeFinancialAcronyms(input, "en");

        expect(result).toContain("C-E-O");
        expect(result).toContain("Bitcoin");
        expect(result).toContain("Federal Reserve");
        expect(result).toContain("third quarter");
        expect(result).toContain("G-D-P");
      });

      it("should handle quarterly markers Q1, Q2, Q3, Q4 and 1T, 2T, 3T, 4T in Spanish", () => {
        expect(normalizeFinancialAcronyms("Reporte Q1 y Q4", "es")).toBe("Reporte primer trimestre y cuarto trimestre");
        expect(normalizeFinancialAcronyms("Resultados 2T", "es")).toBe("Resultados segundo trimestre");
      });

      it("should handle S&P 500 in Spanish and English", () => {
        expect(normalizeFinancialAcronyms("El índice S&P 500 cerró en alza", "es")).toContain("S y P quinientos");
        expect(normalizeFinancialAcronyms("The S&P 500 hit record highs", "en")).toContain("S and P 500");
      });
    });

    describe("Currency and Number Normalization", () => {
      it("should normalize $10.5M to 'diez punto cinco millones de dólares' in Spanish", () => {
        const input = "La empresa recaudó $10.5M en la ronda.";
        const result = normalizeCurrenciesAndNumbers(input, "es");
        expect(result).toBe("La empresa recaudó diez punto cinco millones de dólares en la ronda.");
      });

      it("should normalize $10.5M to 'ten point five million dollars' in English", () => {
        const input = "The startup raised $10.5M in funding.";
        const result = normalizeCurrenciesAndNumbers(input, "en");
        expect(result).toBe("The startup raised ten point five million dollars in funding.");
      });

      it("should normalize $100 and $10.5k correctly in Spanish", () => {
        expect(normalizeCurrenciesAndNumbers("Cuesta $100 hoy", "es")).toBe("Cuesta cien dólares hoy");
        expect(normalizeCurrenciesAndNumbers("Inversión de $10.5k", "es")).toBe("Inversión de diez punto cinco mil dólares");
      });

      it("should normalize USD, ARS, EUR, and GBP currency expressions in Spanish", () => {
        expect(normalizeCurrenciesAndNumbers("Cotización USD 500", "es")).toContain("quinientos dólares estadounidenses");
        expect(normalizeCurrenciesAndNumbers("Presupuesto ARS 1000", "es")).toContain("mil pesos argentinos");
        expect(normalizeCurrenciesAndNumbers("Valor de €10M", "es")).toContain("diez millones de euros");
        expect(normalizeCurrenciesAndNumbers("Precio de £5M", "es")).toContain("cinco millones de libras esterlinas");
      });

      it("should normalize percentages (10.5% -> diez punto cinco por ciento)", () => {
        expect(normalizeCurrenciesAndNumbers("La inflación fue del 10.5%", "es")).toBe("La inflación fue del diez punto cinco por ciento");
        expect(normalizeCurrenciesAndNumbers("Interest rose by 5%", "en")).toBe("Interest rose by five percent");
      });

      it("should convert decimal and integer numbers into words accurately", () => {
        expect(numberStringToWords("10.5", "es")).toBe("diez punto cinco");
        expect(numberStringToWords("100", "es")).toBe("cien");
        expect(numberStringToWords("10.5", "en")).toBe("ten point five");
        expect(numberStringToWords("100", "en")).toBe("one hundred");
      });
    });

    describe("Full Normalization Pipeline (normalizeTextForSpeech)", () => {
      it("should run full pipeline combining currency, tickers, and yeísmo rehilado", () => {
        const input = "Yo anuncié que YPF ganó $10.5M en el Q3.";
        const result = normalizeTextForSpeech(input, {
          language: "es",
          expandCurrencies: true,
          expandFinancials: true,
          applyYeismo: true,
        });

        expect(result).toContain("Sho");
        expect(result).toContain("I-P-F");
        expect(result).toContain("diez punto cinco mishones de dólares");
        expect(result).toContain("tercer trimestre");
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Inline SFX Tag Parser & Track Splitter Tests
  // ─────────────────────────────────────────────────────────────────────────
  describe("Task 2: Inline SFX Tag Parser & Remotion Track Splitter", () => {
    it("should extract inline tags [sfx:whoosh], [sfx:stinger], [sfx:pop], and [pause: 0.5s]", () => {
      const script = "Bienvenidos a las noticias de hoy. [sfx:whoosh] Atención con la economía. [pause: 0.5s] [sfx:stinger] El dólar subió. [sfx:pop]";
      const parsed = parseInlineSfxAndPauses(script);

      expect(parsed.sfxCues).toHaveLength(3);
      expect(parsed.sfxCues[0].sfxId).toBe("whoosh");
      expect(parsed.sfxCues[1].sfxId).toBe("stinger");
      expect(parsed.sfxCues[2].sfxId).toBe("pop");

      expect(parsed.pauseCues).toHaveLength(1);
      expect(parsed.pauseCues[0].durationSeconds).toBe(0.5);
    });

    it("should strip all inline SFX, pause, and emotion tags so TTS voice never speaks them", () => {
      const raw = "[urgent] Bienvenidos a la emisión [sfx:whoosh] con [pause: 1s] información de último momento [sfx:pop] [sfx:stinger].";
      const clean = stripAllInlineTags(raw);

      expect(clean).not.toContain("[urgent]");
      expect(clean).not.toContain("[sfx:whoosh]");
      expect(clean).not.toContain("[pause: 1s]");
      expect(clean).not.toContain("[sfx:pop]");
      expect(clean).not.toContain("[sfx:stinger]");
      expect(clean).toBe("Bienvenidos a la emisión con información de último momento.");
    });

    it("should parse pause durations in seconds and milliseconds (0.5s, 500ms, 1.2, 2s)", () => {
      expect(parsePauseDuration("0.5s")).toBe(0.5);
      expect(parsePauseDuration("500ms")).toBe(0.5);
      expect(parsePauseDuration("1500ms")).toBe(1.5);
      expect(parsePauseDuration("2s")).toBe(2.0);
      expect(parsePauseDuration("1.2")).toBe(1.2);
    });

    it("should compute accurate cue timestamps accounting for preceding speech cadence and pauses", () => {
      const script = "Hola amigos. [pause: 1.0s] [sfx:whoosh] Continuamos con las novedades.";
      const parsed = parseInlineSfxAndPauses(script, { wpm: 120 }); // 2 words/sec

      expect(parsed.sfxCues).toHaveLength(1);
      const cue = parsed.sfxCues[0];
      expect(cue.timestampSeconds).toBeGreaterThanOrEqual(1.8);
      expect(cue.timestampSeconds).toBeLessThanOrEqual(2.2);
    });

    it("should split overlapping SFX cues across parallel Remotion audio tracks", () => {
      const cues = [
        {
          id: "cue_1",
          sfxId: "stinger",
          name: "News Stinger",
          tag: "[sfx:stinger]",
          url: "/sfx/news_stinger.mp3",
          defaultVolume: 0.8,
          volume: 0.8,
          durationSeconds: 3.0, // Ends at 3.0s
          rawCharIndex: 0,
          cleanCharIndex: 0,
          wordIndex: 0,
          timestampSeconds: 0.0,
        },
        {
          id: "cue_2",
          sfxId: "whoosh",
          name: "Transition Whoosh",
          tag: "[sfx:whoosh]",
          url: "/sfx/whoosh.mp3",
          defaultVolume: 0.7,
          volume: 0.7,
          durationSeconds: 1.0, // Starts at 1.0s (overlaps cue_1!)
          rawCharIndex: 10,
          cleanCharIndex: 10,
          wordIndex: 5,
          timestampSeconds: 1.0,
        },
        {
          id: "cue_3",
          sfxId: "pop",
          name: "Pop Notification",
          tag: "[sfx:pop]",
          url: "/sfx/pop.mp3",
          defaultVolume: 0.65,
          volume: 0.65,
          durationSeconds: 0.5, // Starts at 4.0s (track 1 is free)
          rawCharIndex: 25,
          cleanCharIndex: 25,
          wordIndex: 15,
          timestampSeconds: 4.0,
        },
      ];

      const tracks = splitIntoRemotionTracks(cues, 30, 3);
      expect(tracks.length).toBeGreaterThanOrEqual(2);

      // Track 1 should receive cue_1 and cue_3
      const track1 = tracks.find((t) => t.trackId === "sfx-track-1");
      expect(track1).toBeDefined();
      expect(track1?.items.map((i) => i.id)).toEqual(["cue_1", "cue_3"]);

      // Track 2 should receive cue_2 because cue_1 was still playing at t=1.0s
      const track2 = tracks.find((t) => t.trackId === "sfx-track-2");
      expect(track2).toBeDefined();
      expect(track2?.items.map((i) => i.id)).toEqual(["cue_2"]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Speech Emotion & Cadence Presets Tests
  // ─────────────────────────────────────────────────────────────────────────
  describe("Task 3: Speech Emotion & Cadence Presets", () => {
    it("should implement all 4 broadcast cadence presets with valid speed bounds (0.85x - 1.25x)", () => {
      const urgent = CADENCE_PRESETS.urgent_breaking;
      const solemn = CADENCE_PRESETS.solemn_report;
      const casual = CADENCE_PRESETS.casual_banter;
      const standard = CADENCE_PRESETS.standard_anchor;

      expect(urgent).toBeDefined();
      expect(urgent.speedMultiplier).toBeGreaterThanOrEqual(1.15);
      expect(urgent.speedMultiplier).toBeLessThanOrEqual(1.25);
      expect(urgent.pitchVarianceSemitones).toBeGreaterThan(0);

      expect(solemn).toBeDefined();
      expect(solemn.speedMultiplier).toBeGreaterThanOrEqual(0.85);
      expect(solemn.speedMultiplier).toBeLessThanOrEqual(0.90);
      expect(solemn.pitchVarianceSemitones).toBeLessThan(0);

      expect(casual).toBeDefined();
      expect(casual.speedMultiplier).toBeGreaterThanOrEqual(1.00);
      expect(casual.speedMultiplier).toBeLessThanOrEqual(1.05);

      expect(standard).toBeDefined();
      expect(standard.speedMultiplier).toBe(1.00);
    });

    it("should apply cadence preset to modulate text punctuation for breathing pauses", () => {
      const text = "Atención con las noticias de último momento. Los mercados abrieron en alza.";
      
      const urgentResult = applyCadencePreset(text, "urgent_breaking");
      expect(urgentResult.speed).toBe(CADENCE_PRESETS.urgent_breaking.speedMultiplier);
      expect(urgentResult.pitchShift).toBe(CADENCE_PRESETS.urgent_breaking.pitchVarianceSemitones);
      expect(urgentResult.processedText).toContain("...");

      const solemnResult = applyCadencePreset(text, "solemn_report");
      expect(solemnResult.speed).toBe(CADENCE_PRESETS.solemn_report.speedMultiplier);
      expect(solemnResult.pauseMultiplier).toBeGreaterThan(1.0);
    });

    it("should integrate cadence presets with preprocessTextForTts", () => {
      const script = "[urgent] Atención: el BTC subió a $10.5M en el Q3.";
      const processed = preprocessTextForTts(script, {
        engine: "f5_tts",
        language: "es",
        cadencePreset: "urgent_breaking",
      });

      expect(processed).not.toContain("[urgent]");
      expect(processed).toContain("Bitcoin");
      expect(processed).toContain("diez punto cinco millones de dólares");
      expect(processed).toContain("tercer trimestre");
      expect(processed).toContain("--");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Next.js Client & Health Probing Tests
  // ─────────────────────────────────────────────────────────────────────────
  describe("Task 4: Next.js Client & Health Probe", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("should synthesize audio with Modern-TTS-Server when server responds OK", async () => {
      const fakeWav = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00]).buffer;

      vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({
          "x-news-engine": "piper",
          "x-news-model": "es_AR-daniela-high",
          "x-tts-is-fallback": "false",
        }),
        arrayBuffer: async () => fakeWav,
      } as any);

      const result = await generateAudioWithModernTts("Hola Argentina", "", {
        engine: "piper",
        enableFallback: true,
      });

      expect(result.usedEngine).toBe("piper");
      expect(result.isFallback).toBe(false);
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it("should return structured ModernTtsResult from generateAudioWithModernTtsResult", async () => {
      const fakeWav = new Uint8Array([0x52, 0x49, 0x46, 0x46]).buffer;

      vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({
          "x-news-engine": "f5_tts",
          "x-news-model": "jpgallegoar/F5-Spanish",
          "x-tts-is-fallback": "false",
        }),
        arrayBuffer: async () => fakeWav,
      } as any);

      const result = await generateAudioWithModernTtsResult("Noticia de hoy", "", {
        engine: "f5_tts",
      });

      expect(result.usedEngine).toBe("f5_tts");
      expect(result.audioBuffer).toBeDefined();
    });

    it("should automatically fall back from primary engine to secondary engine on failure", async () => {
      const fakeWav = new Uint8Array([0x52, 0x49, 0x46, 0x46]).buffer;

      // First call (cosyvoice_3) fails with 500 error
      // Second call (f5_tts) succeeds
      vi.spyOn(global, "fetch")
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => "CosyVoice GPU Out of Memory",
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({
            "x-news-engine": "f5_tts",
            "x-news-model": "jpgallegoar/F5-Spanish",
            "x-tts-is-fallback": "true",
          }),
          arrayBuffer: async () => fakeWav,
        } as any);

      const result = await generateAudioWithModernTts("Hola Argentina", "", {
        engine: "cosyvoice_3",
        enableFallback: true,
      });

      expect(result.usedEngine).toBe("f5_tts");
      expect(result.isFallback).toBe(true);
      expect(result.fallbackReason).toContain("CosyVoice");
    });

    it("should stream low-latency audio via streamPiperTtsAudio", async () => {
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

      const result = await streamPiperTtsAudio("Noticia express");
      expect(result.usedEngine).toBe("piper");
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it("checkModernTtsHealth should accurately probe Modern-TTS-Server on Port 8005", async () => {
      vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: "ok",
          service: "Modern-TTS-Server",
          device: "cuda",
          gpu_name: "NVIDIA GeForce RTX 5090",
          vram_allocated_mb: 2048,
          cuda_available: true,
        }),
      } as any);

      const health = await checkModernTtsHealth();
      expect(health.status).toBe("ok");
      expect(health.gpu_name).toBe("NVIDIA GeForce RTX 5090");
      expect(health.device).toBe("cuda");
    });

    it("checkTTSHealth in src/lib/health.ts should probe Modern-TTS-Server and report online", async () => {
      vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ status: "ok" }),
      } as any);

      const status = await checkTTSHealth();
      expect(status.status).toBe("online");
      expect(status.latencyMs).toBeDefined();
    });
  });
});
