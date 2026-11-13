import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  FORENSIC_SYSTEM_PROMPT,
  generateFallbackInvestigation,
  runForensicInvestigation,
} from "../forensicDocEngine";

const generateLlmObjectMock = vi.fn();

// Mock the AI SDK Gateway module
vi.mock("@/lib/llm/aiSdkGateway", () => {
  return {
    generateLlmObject: (...args: unknown[]) => generateLlmObjectMock(...args),
  };
});

describe("Forensic Document Engine", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset process.env and mocks before each test
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore process.env
    process.env = originalEnv;
  });

  it("FORENSIC_SYSTEM_PROMPT contains correct JSON output structure", () => {
    // The prompt should be a non-empty string
    expect(typeof FORENSIC_SYSTEM_PROMPT).toBe("string");
    expect(FORENSIC_SYSTEM_PROMPT.length).toBeGreaterThan(0);

    // The prompt should include the required schema keys
    expect(FORENSIC_SYSTEM_PROMPT).toContain("investigationTitle");
    expect(FORENSIC_SYSTEM_PROMPT).toContain("targetOrganization");
    expect(FORENSIC_SYSTEM_PROMPT).toContain("executiveSummary");
    expect(FORENSIC_SYSTEM_PROMPT).toContain("smokingGunFinding");
    expect(FORENSIC_SYSTEM_PROMPT).toContain("entities");
    expect(FORENSIC_SYSTEM_PROMPT).toContain("moneyTrail");
    expect(FORENSIC_SYSTEM_PROMPT).toContain("anomalySignals");
    expect(FORENSIC_SYSTEM_PROMPT).toContain("broadcastScript");
    expect(FORENSIC_SYSTEM_PROMPT).toContain("forensicVisualPrompts");
  });

  it("FORENSIC_SYSTEM_PROMPT contains valid parsable JSON matching InvestigativeReport structure", () => {
    const startIndex = FORENSIC_SYSTEM_PROMPT.indexOf("{");
    const endIndex = FORENSIC_SYSTEM_PROMPT.lastIndexOf("}");
    expect(startIndex).toBeGreaterThanOrEqual(0);
    expect(endIndex).toBeGreaterThan(startIndex);

    const jsonString = FORENSIC_SYSTEM_PROMPT.slice(startIndex, endIndex + 1);

    let parsed: any;
    expect(() => {
      parsed = JSON.parse(jsonString);
    }).not.toThrow();

    expect(parsed.investigationTitle).toBeDefined();
    expect(parsed.targetOrganization).toBeDefined();
    expect(parsed.executiveSummary).toBeDefined();
    expect(parsed.smokingGunFinding).toBeDefined();

    expect(Array.isArray(parsed.entities)).toBe(true);
    expect(parsed.entities.length).toBeGreaterThan(0);

    expect(Array.isArray(parsed.moneyTrail)).toBe(true);
    expect(parsed.moneyTrail.length).toBeGreaterThan(0);

    expect(Array.isArray(parsed.anomalySignals)).toBe(true);
    expect(parsed.anomalySignals.length).toBeGreaterThan(0);

    expect(parsed.broadcastScript).toBeDefined();
    expect(parsed.broadcastScript.coldOpen).toBeDefined();
    expect(parsed.broadcastScript.evidenceChapter1).toBeDefined();
    expect(parsed.broadcastScript.moneyTrailChapter2).toBeDefined();
    expect(parsed.broadcastScript.confrontationChapter3).toBeDefined();
    expect(parsed.broadcastScript.signoff).toBeDefined();

    expect(Array.isArray(parsed.forensicVisualPrompts)).toBe(true);
    expect(parsed.forensicVisualPrompts.length).toBeGreaterThan(0);
  });

  it("generateFallbackInvestigation generates a valid report", () => {
    const dummyText = "Some dummy leaked document text...";
    const report = generateFallbackInvestigation(dummyText);

    // Assert the properties exist and are correctly structured
    expect(report.investigationTitle).toBe("THE SHADOW PROTOCOL: Forensic Investigation");
    expect(report.targetOrganization).toBe("Offshore Strategic Holdings Group");
    expect(report.executiveSummary).toBeDefined();
    expect(report.smokingGunFinding).toBeDefined();

    // Arrays should have elements
    expect(report.entities.length).toBeGreaterThan(0);
    expect(report.moneyTrail.length).toBeGreaterThan(0);
    expect(report.anomalySignals.length).toBeGreaterThan(0);

    // Broadcast script should be fully populated
    expect(report.broadcastScript.coldOpen).toBeDefined();
    expect(report.broadcastScript.evidenceChapter1).toBeDefined();
    expect(report.broadcastScript.moneyTrailChapter2).toBeDefined();
    expect(report.broadcastScript.confrontationChapter3).toBeDefined();
    expect(report.broadcastScript.signoff).toBeDefined();

    // Visual prompts should exist
    expect(report.forensicVisualPrompts.length).toBeGreaterThan(0);

    // Validate an entity format
    const firstEntity = report.entities[0];
    expect(firstEntity.id).toBeDefined();
    expect(firstEntity.name).toBeDefined();
    expect(firstEntity.type).toBeDefined();
    expect(firstEntity.role).toBeDefined();
    expect(firstEntity.jurisdiction).toBeDefined();

    // Validate a money trail node
    const firstTrail = report.moneyTrail[0];
    expect(firstTrail.fromEntity).toBeDefined();
    expect(firstTrail.toEntity).toBeDefined();
    expect(firstTrail.amount).toBeDefined();
    expect(firstTrail.date).toBeDefined();
    expect(firstTrail.purpose).toBeDefined();
    expect(typeof firstTrail.isSuspicious).toBe("boolean");
  });

  describe("runForensicInvestigation", () => {
    const dummyText = "Sensitive financial records revealing hidden transactions...";

    it("should return successful parsed response from LLM gateway", async () => {
      const validResponse = {
        investigationTitle: "API GENERATED PROTOCOL",
        targetOrganization: "Some Corp",
        executiveSummary: "A summary",
        smokingGunFinding: "Found it",
        entities: [],
        moneyTrail: [],
        anomalySignals: [],
        broadcastScript: {
          coldOpen: "open",
          evidenceChapter1: "c1",
          moneyTrailChapter2: "c2",
          confrontationChapter3: "c3",
          signoff: "bye",
        },
        forensicVisualPrompts: [],
      };

      generateLlmObjectMock.mockResolvedValueOnce({
        object: validResponse,
        providerUsed: "gemini",
        modelUsed: "gemini-2.5-flash",
      });

      const result = await runForensicInvestigation(dummyText);
      expect(result.investigationTitle).toBe("API GENERATED PROTOCOL");
      expect(generateLlmObjectMock).toHaveBeenCalledTimes(1);
    });

    it("should return fallback report if LLM gateway throws an error", async () => {
      generateLlmObjectMock.mockRejectedValueOnce(new Error("API rate limit exceeded"));

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await runForensicInvestigation(dummyText);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "❌ Forensic investigation failed:",
        "API rate limit exceeded"
      );
      expect(result.investigationTitle).toBe("THE SHADOW PROTOCOL: Forensic Investigation");

      consoleErrorSpy.mockRestore();
    });

    it("should return fallback report when LLM gateway fails all providers", async () => {
      generateLlmObjectMock.mockRejectedValueOnce(new Error("All LLM providers failed"));

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await runForensicInvestigation(dummyText);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "❌ Forensic investigation failed:",
        "All LLM providers failed"
      );
      expect(result.investigationTitle).toBe("THE SHADOW PROTOCOL: Forensic Investigation");

      consoleErrorSpy.mockRestore();
    });
  });
});
