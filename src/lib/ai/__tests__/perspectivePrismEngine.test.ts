import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateFallbackPrism,
  runPerspectivePrism,
  PRISM_SYSTEM_PROMPT,
  PrismPerspectiveSchema,
} from "../perspectivePrismEngine";
import { PRISM_LENS_CONFIG } from "@/lib/types/perspectivePrismTypes";

const generateLlmObjectMock = vi.fn();

vi.mock("@/lib/llm/aiSdkGateway", () => ({
  generateLlmObject: (...args: unknown[]) => generateLlmObjectMock(...args),
}));

describe("PRISM_SYSTEM_PROMPT", () => {
  it("is a non-empty string", () => {
    expect(typeof PRISM_SYSTEM_PROMPT).toBe("string");
    expect(PRISM_SYSTEM_PROMPT.length).toBeGreaterThan(0);
  });

  it("includes the expected role assignment", () => {
    expect(PRISM_SYSTEM_PROMPT).toContain("Lead Epistemic Cognitive Scientist");
  });

  it("explicitly requires JSON output", () => {
    expect(PRISM_SYSTEM_PROMPT).toContain("ONLY valid JSON matching this exact structure");
  });

  it("references all 5 required lens types", () => {
    const requiredLenses = [
      "accelerationist",
      "populist_labor",
      "realpolitik_security",
      "longtermist_ecology",
      "neutral_arbiter"
    ];

    requiredLenses.forEach((lens) => {
      expect(PRISM_SYSTEM_PROMPT).toContain(lens);
    });
  });
});

describe("generateFallbackPrism", () => {
  const sampleTopic = "Global AI Regulation Summit 2025";

  it("returns the correct basic structure with the matching eventTopic", () => {
    const report = generateFallbackPrism(sampleTopic);

    expect(report.eventTopic).toBe(sampleTopic);
    expect(report.summary).toContain(sampleTopic);
    expect(report.steelMannedSynthesis).toBeDefined();
    expect(Array.isArray(report.perspectives)).toBe(true);
  });

  it("generates exactly 5 perspectives with the correct lens types", () => {
    const report = generateFallbackPrism(sampleTopic);

    expect(report.perspectives.length).toBe(5);

    const lensTypes = report.perspectives.map((p) => p.lens);
    expect(lensTypes).toContain("accelerationist");
    expect(lensTypes).toContain("populist_labor");
    expect(lensTypes).toContain("realpolitik_security");
    expect(lensTypes).toContain("longtermist_ecology");
    expect(lensTypes).toContain("neutral_arbiter");
  });

  it("populates perspectives with properties from PRISM_LENS_CONFIG", () => {
    const report = generateFallbackPrism(sampleTopic);

    report.perspectives.forEach((perspective) => {
      const config = PRISM_LENS_CONFIG[perspective.lens];

      expect(perspective.title).toBe(config.name);
      expect(perspective.assignedPersonaId).toBe(config.personaId);
      expect(perspective.assignedPersonaName).toBe(config.personaName);
      expect(perspective.avatarUrl).toBe(config.avatarUrl);
      expect(perspective.themeColor).toBe(config.themeColor);
      expect(perspective.coreThesis).toContain(config.name);
      expect(perspective.spokenScript).toContain(config.name);
      expect(perspective.framingTriggers).toContain(config.name);
    });
  });

  it("correctly interpolates the topic into summary, coreThesis, and spokenScript", () => {
    const report = generateFallbackPrism(sampleTopic);

    expect(report.summary).toBe(`Multifaceted 5-lens narrative deconstruction of "${sampleTopic}".`);

    report.perspectives.forEach((perspective) => {
      const config = PRISM_LENS_CONFIG[perspective.lens];
      expect(perspective.coreThesis).toBe(`Core perspective thesis for ${config.name} regarding ${sampleTopic}.`);
      expect(perspective.spokenScript).toBe(`[authoritative] Examining ${sampleTopic} through the lens of ${config.name}: verified structural momentum requires rigorous evaluation of underlying empirical variables. [sfx:whoosh]`);
    });
  });

  it("handles empty string topics without throwing errors", () => {
    const report = generateFallbackPrism("");

    expect(report.eventTopic).toBe("");
    expect(report.summary).toBe(`Multifaceted 5-lens narrative deconstruction of "".`);
    expect(report.perspectives.length).toBe(5);

    report.perspectives.forEach((perspective) => {
      const config = PRISM_LENS_CONFIG[perspective.lens];
      expect(perspective.coreThesis).toBe(`Core perspective thesis for ${config.name} regarding .`);
      expect(perspective.spokenScript).toBe(`[authoritative] Examining  through the lens of ${config.name}: verified structural momentum requires rigorous evaluation of underlying empirical variables. [sfx:whoosh]`);
    });
  });
});

describe("runPerspectivePrism via AI SDK Gateway", () => {
  const sampleTopic = "Global AI Compute Allocation";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates 5 perspective lenses via generateLlmObject", async () => {
    generateLlmObjectMock.mockResolvedValueOnce({
      object: {
        eventTopic: sampleTopic,
        summary: "5-way cognitive prism analysis",
        perspectives: [
          {
            lens: "accelerationist",
            title: "Techno-Capital Accelerationism",
            coreThesis: "Compute availability must be unconstrained to maintain competitive velocity.",
            spokenScript: "Speed is the only true defense against stagnation.",
            framingTriggers: ["exponential growth", "market dynamics"],
          },
        ],
        steelMannedSynthesis: "Synthesis of computational capacity debates.",
      },
      providerUsed: "gemini",
      modelUsed: "gemini-2.5-flash",
    });

    const report = await runPerspectivePrism(sampleTopic);

    expect(generateLlmObjectMock).toHaveBeenCalledTimes(1);
    expect(report.eventTopic).toBe(sampleTopic);
    expect(report.perspectives.length).toBe(1);
    expect(report.perspectives[0].lens).toBe("accelerationist");
    expect(report.perspectives[0].assignedPersonaId).toBe("ruby");
    expect(report.steelMannedSynthesis).toContain("Synthesis");
  });

  it("resiliently handles unknown lens enum via schema catch", () => {
    const parsed = PrismPerspectiveSchema.parse({
      lens: "unknown_fringe_lens",
      title: "Custom Perspective",
    });

    expect(parsed.lens).toBe("neutral_arbiter");
  });

  it("falls back gracefully to programmatic prism when LLM throws", async () => {
    generateLlmObjectMock.mockRejectedValueOnce(new Error("LLM Service Unavailable"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const report = await runPerspectivePrism(sampleTopic);

    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(report.perspectives.length).toBe(5);
    expect(report.eventTopic).toBe(sampleTopic);

    consoleErrorSpy.mockRestore();
  });
});
