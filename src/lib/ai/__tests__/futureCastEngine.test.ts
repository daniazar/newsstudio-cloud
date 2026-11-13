import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  runFutureCastSimulation,
  generateFallbackFutureCast,
  FUTURECAST_SYSTEM_PROMPT,
} from "../futureCastEngine";

const generateLlmObjectMock = vi.fn();

vi.mock("@/lib/llm/aiSdkGateway", () => ({
  generateLlmObject: (...args: unknown[]) => generateLlmObjectMock(...args),
}));

describe("Monte Carlo Future-Cast Simulator Engine (futureCastEngine.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("FUTURECAST_SYSTEM_PROMPT", () => {
    it("should be a non-empty string defining simulation directives", () => {
      expect(typeof FUTURECAST_SYSTEM_PROMPT).toBe("string");
      expect(FUTURECAST_SYSTEM_PROMPT.length).toBeGreaterThan(0);
      expect(FUTURECAST_SYSTEM_PROMPT).toContain("72-hour");
      expect(FUTURECAST_SYSTEM_PROMPT).toContain("game-theoretic");
    });
  });

  describe("generateFallbackFutureCast", () => {
    it("should construct valid 72-hour simulation result with cascade timeline and agents", () => {
      const topic = "Critical Lithium Refinement Bottleneck";
      const result = generateFallbackFutureCast(topic);

      expect(result.topic).toBe(topic);
      expect(result.horizonHours).toBe(72);
      expect(result.totalIterations).toBe(100);
      expect(result.criticalProbability).toBeGreaterThan(0.7);
      expect(result.topScenario.scenarioId).toBe("scenario_primary_cascade");
      expect(result.topScenario.cascadeTimeline.length).toBeGreaterThanOrEqual(3);
      expect(result.participatingAgents.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("runFutureCastSimulation", () => {
    const topic = "Subsea Telecom Cable Sabotage Threat";

    it("should return simulated prediction parsed from LLM gateway", async () => {
      generateLlmObjectMock.mockResolvedValueOnce({
        object: {
          topic,
          horizonHours: 72,
          totalIterations: 100,
          criticalProbability: 0.86,
          topScenario: {
            scenarioId: "scenario_cable_sever",
            title: "Transatlantic Fiber Severance Cascade",
            probability: 0.86,
            severityScore: 94,
            triggerEvent: "Coordinated severing of redundant deep-sea fiber trunks.",
            cascadeTimeline: [
              { hour: 6, event: "BGP routing re-convergence overwhelms terrestrial satellites.", affectedSector: "Telecommunications" },
              { hour: 24, event: "Financial cross-border settlement clearing halts.", affectedSector: "Banking" },
            ],
            forecastHeadline: "72-HOUR OUTLOOK: CRITICAL SUBSEA INFRASTRUCTURE EMERGENCY",
            forecastScript: "[urgent] Predictive simulations confirm high probability of deep sea infrastructure isolation.",
            satelliteMapPrompt: "Satellite radar visualization of North Atlantic seabed routing lines glowing red.",
            marketReactionSummary: "Cross-border transaction fees jump 500%.",
          },
          alternativeScenarios: [],
          participatingAgents: [
            { id: "isp_consortium", name: "Tier-1 Carrier Alliance", role: "Bandwidth Routing", bias: "defensive", projectedAction: "Enacts traffic throttling." },
          ],
        },
        providerUsed: "gemini",
        modelUsed: "gemini-2.5-flash",
      });

      const result = await runFutureCastSimulation(topic);

      expect(generateLlmObjectMock).toHaveBeenCalledTimes(1);
      expect(result.topic).toBe(topic);
      expect(result.criticalProbability).toBe(0.86);
      expect(result.topScenario.scenarioId).toBe("scenario_cable_sever");
      expect(result.timestamp).toBeDefined();
    });

    it("should fall back gracefully to programmatic simulation when LLM gateway fails", async () => {
      generateLlmObjectMock.mockRejectedValueOnce(new Error("LLM failure: gateway offline"));

      const result = await runFutureCastSimulation(topic);

      expect(result.topic).toBe(topic);
      expect(result.topScenario.scenarioId).toBe("scenario_primary_cascade");
      expect(result.criticalProbability).toBe(0.81);
    });
  });
});
