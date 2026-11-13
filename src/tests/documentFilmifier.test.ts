import { describe, it, expect } from "vitest";
import {
  extractDocumentMetrics,
  extractDocumentThesis,
  filmifyDocument,
} from "@/lib/document/documentFilmifier";

describe("Phase 8: 'Paper-to-Broadcast' 1-Click Document Filmifier Studio", () => {
  const sampleAcademicPaper = `
# Ambient Pressure Superconductivity in Lutetium Hydride

## Abstract
We demonstrate near-ambient superconductivity at 294 K under 10 kilobars of pressure, achieving a 3.8x speedup in magnetic flux pinning with 99.8% statistical confidence.

## Results
The critical temperature was verified across 45 trials with zero resistance. Commercial viability indicates a $12 billion market reduction in liquid nitrogen cryogenic expenditures.
  `;

  describe("1. Document Metrics & Thesis Extraction", () => {
    it("extracts key numerical statistics, percentages, and multipliers", () => {
      const metrics = extractDocumentMetrics(sampleAcademicPaper);

      expect(metrics.some((m) => m.includes("99.8%"))).toBe(true);
      expect(metrics.some((m) => m.includes("3.8x speedup"))).toBe(true);
      expect(metrics.some((m) => m.includes("$12 billion"))).toBe(true);
    });

    it("extracts headline title and executive abstract thesis", () => {
      const { title, thesis } = extractDocumentThesis(sampleAcademicPaper);

      expect(title).toBe("Ambient Pressure Superconductivity in Lutetium Hydride");
      expect(thesis).toContain("near-ambient superconductivity at 294 K");
    });
  });

  describe("2. Storyboard Synthesis & Presets", () => {
    it("filmifies a tech breakthrough paper into a 4-scene broadcast documentary", () => {
      const storyboard = filmifyDocument(sampleAcademicPaper, {
        preset: "tech_breakthrough",
        personaId: "ruby",
        language: "en",
      });

      expect(storyboard.title).toBe("Ambient Pressure Superconductivity in Lutetium Hydride");
      expect(storyboard.scenes).toHaveLength(4);

      // Verify sequence of scenes
      expect(storyboard.scenes[0].sceneType).toBe("hook");
      expect(storyboard.scenes[1].sceneType).toBe("methodology");
      expect(storyboard.scenes[2].sceneType).toBe("impact");
      expect(storyboard.scenes[3].sceneType).toBe("verdict");

      // Verify audio and SFX tags
      expect(storyboard.scenes[0].sfxTag).toBe("[sfx:stinger]");
      expect(storyboard.scenes[1].spokenScript).toContain("[sfx:whoosh]");
      expect(storyboard.scenes[0].spokenScript).toContain("[sfx:stinger]");
      expect(storyboard.scenes[2].spokenScript).toContain("[sfx:pop]");

      // Verify B-roll queries
      expect(storyboard.scenes[0].bRollKeyword).toBeDefined();
      expect(storyboard.scenes[1].bRollKeyword).toBeDefined();

      // Estimated duration should be around 75s
      expect(storyboard.estimatedDurationSec).toBeGreaterThanOrEqual(60);
    });

    it("filmifies a financial report with market terminology and Spanish localization", () => {
      const financialReport = `
# Q3 2026 Earnings Flash: Apex Technologies
Consolidated revenue hit $48.2 billion, up 28% year-over-year, with operating margins expanding to 38.5%.
      `;

      const storyboard = filmifyDocument(financialReport, {
        preset: "financial_earnings",
        personaId: "diego",
        language: "es",
      });

      expect(storyboard.preset).toBe("financial_earnings");
      expect(storyboard.language).toBe("es");
      expect(storyboard.personaId).toBe("diego");

      // Spoken script in Spanish
      expect(storyboard.scenes[0].spokenScript).toContain("Atención a los mercados");
      expect(storyboard.scenes[1].spokenScript).toContain("Examinando los balances");
      expect(storyboard.scenes[3].spokenScript).toContain("Ruby NewsStudio");
    });
  });
});
