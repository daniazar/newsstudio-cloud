import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateFallbackSocietyForecast, runSyntheticSocietySimulation, SOCIETY_SYSTEM_PROMPT } from "../syntheticSocietyEngine";

const mockedGenerateLlmObject = vi.fn();

// Mock the AI SDK Gateway module
vi.mock("@/lib/llm/aiSdkGateway", () => {
  return {
    generateLlmObject: (...args: unknown[]) => mockedGenerateLlmObject(...args),
  };
});

describe("SyntheticSocietyEngine Unit Tests", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    // Clear mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("generates a fallback society forecast correctly", () => {
    const headline = "Test Headline for Society Simulation";
    const forecast = generateFallbackSocietyForecast(headline);

    expect(forecast.testHeadline).toBe(headline);

    // Check that timestamp is a valid ISO string
    expect(forecast.timestamp).toBeDefined();
    const timestampDate = new Date(forecast.timestamp);
    expect(isNaN(timestampDate.getTime())).toBe(false);
    expect(forecast.timestamp).toBe(timestampDate.toISOString());

    expect(forecast.simulatedPopulationCount).toBe(1000);
    expect(forecast.overallApprovalPct).toBe(48.0);
    expect(forecast.backlashRiskScore).toBe(68);
    expect(forecast.polarizationIndex).toBe(0.74);

    expect(forecast.archetypeBreakdown).toBeDefined();
    expect(forecast.archetypeBreakdown).toBeInstanceOf(Array);
    expect(forecast.archetypeBreakdown.length).toBe(5);

    const firstArchetype = forecast.archetypeBreakdown[0];
    expect(firstArchetype.archetypeName).toBe("Tech Innovators & Founders");
    expect(firstArchetype.populationWeight).toBe(0.15);
    expect(firstArchetype.averageSentimentScore).toBe(70);
    expect(firstArchetype.dominantEmotion).toBe("supportive");

    expect(forecast.topViralMemes).toBeDefined();
    expect(forecast.topViralMemes).toBeInstanceOf(Array);
    expect(forecast.topViralMemes).toContain("#ProtectTheLine");
    expect(forecast.topViralMemes).toContain("#UnstoppableCompute");
    expect(forecast.topViralMemes).toContain("#AITookMyHomework");
    expect(forecast.topViralMemes).toContain("#AuditTheWeights");

    expect(forecast.editorialRecommendation).toBeDefined();
    expect(typeof forecast.editorialRecommendation).toBe("string");
  });

  describe("runSyntheticSocietySimulation", () => {
    it("should successfully generate forecast using LLM gateway", async () => {
      const mockHeadline = "AI breakthrough changes everything";
      const mockAiResponse = {
        testHeadline: mockHeadline,
        simulatedPopulationCount: 1000,
        overallApprovalPct: 85.5,
        backlashRiskScore: 10,
        polarizationIndex: 0.2,
        archetypeBreakdown: [],
        topViralMemes: ["#AIRevolution", "#FutureIsNow"],
        editorialRecommendation: "Publish immediately with excitement.",
      };

      mockedGenerateLlmObject.mockResolvedValueOnce({
        object: mockAiResponse,
        providerUsed: "gemini",
        modelUsed: "gemini-2.5-flash",
      });

      const result = await runSyntheticSocietySimulation(mockHeadline, "Some context");

      // Verify the AI was called with the correct parameters
      expect(mockedGenerateLlmObject).toHaveBeenCalledTimes(1);

      const callArgs = mockedGenerateLlmObject.mock.calls[0][0];
      expect(callArgs.prompt).toContain(mockHeadline);
      expect(callArgs.prompt).toContain("Some context");
      expect(callArgs.system).toBe(SOCIETY_SYSTEM_PROMPT);

      // Verify the result incorporates the AI's mocked data
      expect(result.testHeadline).toBe(mockHeadline);
      expect(result.overallApprovalPct).toBe(85.5);
      expect(result.topViralMemes).toContain("#AIRevolution");

      // Verify timestamp was added
      expect(result.timestamp).toBeDefined();
    });

    it("should use fallback when API call throws an error", async () => {
      const mockHeadline = "Test Error Handling";

      mockedGenerateLlmObject.mockRejectedValueOnce(new Error("API Error"));

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await runSyntheticSocietySimulation(mockHeadline);

      // Verify it fell back successfully
      expect(result.testHeadline).toBe(mockHeadline);
      expect(result.overallApprovalPct).toBe(48.0); // From fallback
      expect(consoleSpy).toHaveBeenCalledWith(
        "❌ SyntheticSociety simulation failed:",
        "API Error"
      );

      consoleSpy.mockRestore();
    });

    it("should use fallback when all LLM providers fail", async () => {
      mockedGenerateLlmObject.mockRejectedValueOnce(new Error("All LLM providers failed"));

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await runSyntheticSocietySimulation("Test Failure");

      expect(result.testHeadline).toBe("Test Failure");
      expect(result.overallApprovalPct).toBe(48.0); // From fallback
      expect(consoleSpy).toHaveBeenCalledWith(
        "❌ SyntheticSociety simulation failed:",
        "All LLM providers failed"
      );

      consoleSpy.mockRestore();
    });

    it("should handle missing error.message correctly", async () => {
      const mockHeadline = "Error Message Test";

      // Throw an error without a message string to cover the err.message || err fallback
      const customError = "Just a string error";
      mockedGenerateLlmObject.mockRejectedValueOnce(customError);

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await runSyntheticSocietySimulation(mockHeadline, "Some context");

      expect(result.testHeadline).toBe(mockHeadline);
      expect(result.overallApprovalPct).toBe(48.0);
      expect(consoleSpy).toHaveBeenCalledWith("❌ SyntheticSociety simulation failed:", customError);

      consoleSpy.mockRestore();
    });
  });

  describe("SOCIETY_SYSTEM_PROMPT", () => {
    it("should be defined", () => {
      expect(SOCIETY_SYSTEM_PROMPT).toBeDefined();
      expect(typeof SOCIETY_SYSTEM_PROMPT).toBe("string");
    });

    it("should instruct to simulate 1,000 citizens", () => {
      expect(SOCIETY_SYSTEM_PROMPT).toContain("1,000 heterogeneous synthetic citizens");
    });

    it("should contain the 5 societal archetypes with correct weights", () => {
      expect(SOCIETY_SYSTEM_PROMPT).toContain("Tech Innovators & Founders (15% weight)");
      expect(SOCIETY_SYSTEM_PROMPT).toContain("Institutional Finance & Enterprise (20% weight)");
      expect(SOCIETY_SYSTEM_PROMPT).toContain("Working-Class & Trades (30% weight)");
      expect(SOCIETY_SYSTEM_PROMPT).toContain("Academic & Public Sector Regulators (15% weight)");
      expect(SOCIETY_SYSTEM_PROMPT).toContain("Gen-Z Digital Natives & Social Media Creators (20% weight)");
    });

    it("should mandate returning ONLY valid JSON", () => {
      expect(SOCIETY_SYSTEM_PROMPT).toContain("Return ONLY valid JSON");
    });

    it("should include specific fields in the JSON output format", () => {
      expect(SOCIETY_SYSTEM_PROMPT).toContain('"testHeadline"');
      expect(SOCIETY_SYSTEM_PROMPT).toContain('"simulatedPopulationCount"');
      expect(SOCIETY_SYSTEM_PROMPT).toContain('"overallApprovalPct"');
      expect(SOCIETY_SYSTEM_PROMPT).toContain('"backlashRiskScore"');
      expect(SOCIETY_SYSTEM_PROMPT).toContain('"polarizationIndex"');
      expect(SOCIETY_SYSTEM_PROMPT).toContain('"archetypeBreakdown"');
      expect(SOCIETY_SYSTEM_PROMPT).toContain('"topViralMemes"');
      expect(SOCIETY_SYSTEM_PROMPT).toContain('"editorialRecommendation"');
    });

    it("should contain a valid JSON block matching the SyntheticSocietyForecast interface", () => {
      // Extract the JSON block from the system prompt
      const jsonStart = SOCIETY_SYSTEM_PROMPT.indexOf("{");
      const jsonEnd = SOCIETY_SYSTEM_PROMPT.lastIndexOf("}") + 1;
      const jsonString = SOCIETY_SYSTEM_PROMPT.substring(jsonStart, jsonEnd);

      expect(jsonStart).toBeGreaterThan(-1);
      expect(jsonEnd).toBeGreaterThan(0);

      // Parse the JSON block
      let parsedJson: any;
      try {
        parsedJson = JSON.parse(jsonString);
      } catch (error) {
        throw new Error(`Failed to parse JSON from SOCIETY_SYSTEM_PROMPT: ${error}`);
      }

      // Assert that the parsed JSON has all required properties of SyntheticSocietyForecast
      expect(parsedJson).toHaveProperty("testHeadline");
      expect(typeof parsedJson.testHeadline).toBe("string");

      expect(parsedJson).toHaveProperty("simulatedPopulationCount");
      expect(typeof parsedJson.simulatedPopulationCount).toBe("number");

      expect(parsedJson).toHaveProperty("overallApprovalPct");
      expect(typeof parsedJson.overallApprovalPct).toBe("number");

      expect(parsedJson).toHaveProperty("backlashRiskScore");
      expect(typeof parsedJson.backlashRiskScore).toBe("number");

      expect(parsedJson).toHaveProperty("polarizationIndex");
      expect(typeof parsedJson.polarizationIndex).toBe("number");

      expect(parsedJson).toHaveProperty("archetypeBreakdown");
      expect(Array.isArray(parsedJson.archetypeBreakdown)).toBe(true);
      expect(parsedJson.archetypeBreakdown.length).toBeGreaterThan(0);

      const firstArchetype = parsedJson.archetypeBreakdown[0];
      expect(firstArchetype).toHaveProperty("archetypeName");
      expect(typeof firstArchetype.archetypeName).toBe("string");
      expect(firstArchetype).toHaveProperty("populationWeight");
      expect(typeof firstArchetype.populationWeight).toBe("number");
      expect(firstArchetype).toHaveProperty("averageSentimentScore");
      expect(typeof firstArchetype.averageSentimentScore).toBe("number");
      expect(firstArchetype).toHaveProperty("dominantEmotion");
      expect(typeof firstArchetype.dominantEmotion).toBe("string");
      expect(firstArchetype).toHaveProperty("primaryGrievanceOrSupport");
      expect(typeof firstArchetype.primaryGrievanceOrSupport).toBe("string");
      expect(firstArchetype).toHaveProperty("emergentMemeSlogan");
      expect(typeof firstArchetype.emergentMemeSlogan).toBe("string");

      expect(parsedJson).toHaveProperty("topViralMemes");
      expect(Array.isArray(parsedJson.topViralMemes)).toBe(true);

      expect(parsedJson).toHaveProperty("editorialRecommendation");
      expect(typeof parsedJson.editorialRecommendation).toBe("string");
    });
  });
});
