import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateFallbackBulletin,
  synthesizeHourlyBulletin,
  AutonomousBulletinPayloadSchema,
  type BulletinStoryCluster,
} from "../bulletinBotEngine";

const generateLlmObjectMock = vi.fn();

vi.mock("@/lib/llm/aiSdkGateway", () => ({
  generateLlmObject: (...args: unknown[]) => generateLlmObjectMock(...args),
}));

describe("24/7 Autonomous Bulletin Bot Engine", () => {
  const sampleClusters: BulletinStoryCluster[] = [
    {
      topic: "NVIDIA AI Monopoly & Compute Allocation",
      category: "tech_ai",
      headline: "NVIDIA Claims 84% Market Monopoly",
      sourceArticles: [
        { id: "art_1", title: "NVIDIA AI Hardware Share Jumps to 84%" },
        { id: "art_2", title: "Cloud Capex Surges in AI Supercycle" },
      ],
      summary: "Hyperscalers commit over thirty billion dollars in single-day hardware orders.",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("synthesizes a 3-scene 60-second broadcast bulletin payload via fallback", () => {
    const bulletin = generateFallbackBulletin(sampleClusters, "ruby");

    expect(bulletin.bulletinTitle).toBeDefined();
    expect(bulletin.estimatedDurationSeconds).toBe(60);
    expect(bulletin.targetPersonaId).toBe("ruby");
    expect(bulletin.scenes.length).toBe(3);

    // Scene 1: Lead Story
    const scene1 = bulletin.scenes[0];
    expect(scene1.index).toBe(0);
    expect(scene1.durationSeconds).toBe(20);
    expect(scene1.text).toContain("[urgent]");
    expect(scene1.cameraCue).toBe("cam1_wide");

    // Scene 2: Infographic Scene
    const scene2 = bulletin.scenes[1];
    expect(scene2.index).toBe(1);
    expect(scene2.sceneStrategy).toBe("infographic_ticker");
    expect(scene2.dataGraphic).toBeDefined();
    expect(scene2.dataGraphic?.type).toBe("bar_race");

    // Scene 3: Signoff Outro
    const scene3 = bulletin.scenes[2];
    expect(scene3.index).toBe(2);
    expect(scene3.actionLoop).toBe("state_signoff_outro");
  });

  it("generates complete social distribution metadata and hashtags", () => {
    const bulletin = generateFallbackBulletin(sampleClusters, "ruby");

    expect(bulletin.socialMetadata.title).toContain("AI News Bulletin");
    expect(bulletin.socialMetadata.description).toBeDefined();
    expect(bulletin.socialMetadata.hashtags.length).toBeGreaterThanOrEqual(3);
  });

  it("synthesizes hourly bulletin via unified AI SDK gateway with Zod schema", async () => {
    const mockPayload = {
      bulletinTitle: "Global Tech Briefing",
      edition: "Hourly Edition • 14:00 UTC",
      estimatedDurationSeconds: 60,
      targetPersonaId: "ruby",
      scenes: [
        {
          index: 0,
          durationSeconds: 20,
          speaker: "Ruby Vance",
          personaId: "ruby",
          sceneStrategy: "ltx_full_portrait",
          text: "[urgent] NVIDIA reaches 84% compute dominance.",
          bRollKeyword: "ai chip gpu",
          cameraCue: "cam1_wide",
          actionLoop: "state_breaking_alert",
        },
      ],
      socialMetadata: {
        title: "NVIDIA AI Monopoly Shock!",
        description: "Breaking tech briefing.",
        hashtags: ["#AI", "#TechNews"],
      },
    };

    generateLlmObjectMock.mockResolvedValueOnce({
      object: mockPayload,
      providerUsed: "gemini",
      modelUsed: "gemini-2.5-flash",
    });

    const result = await synthesizeHourlyBulletin(sampleClusters, { preferredPersonaId: "ruby" });

    expect(generateLlmObjectMock).toHaveBeenCalledTimes(1);
    const callArgs = generateLlmObjectMock.mock.calls[0][0];
    expect(callArgs.schemaName).toBe("AutonomousBulletinPayload");
    expect(callArgs.schema).toBe(AutonomousBulletinPayloadSchema);
    expect(result.bulletinTitle).toBe("Global Tech Briefing");
    expect(result.scenes.length).toBe(1);
  });

  it("falls back to heuristic bulletin when AI SDK gateway fails", async () => {
    generateLlmObjectMock.mockRejectedValueOnce(new Error("Network connection refused"));

    const result = await synthesizeHourlyBulletin(sampleClusters, { preferredPersonaId: "ruby" });

    expect(result.bulletinTitle).toContain("Hourly Autonomous Tech Bulletin");
    expect(result.scenes.length).toBe(3);
    expect(result.scenes[0].text).toContain("NVIDIA Claims 84% Market Monopoly");
  });

  it("falls back to heuristic bulletin if LLM returns empty scenes array", async () => {
    generateLlmObjectMock.mockResolvedValueOnce({
      object: {
        bulletinTitle: "Empty Bulletin",
        scenes: [],
      },
      providerUsed: "gemini",
      modelUsed: "gemini-2.5-flash",
    });

    const result = await synthesizeHourlyBulletin(sampleClusters, { preferredPersonaId: "ruby" });

    expect(result.bulletinTitle).toContain("Hourly Autonomous Tech Bulletin");
    expect(result.scenes.length).toBe(3);
  });

  it("handles malformed scene schema fields gracefully via .catch()", () => {
    const parsed = AutonomousBulletinPayloadSchema.parse({
      scenes: [
        {
          index: "invalid",
          text: null,
          durationSeconds: "invalid",
        },
      ],
    });

    expect(parsed.scenes.length).toBe(1);
    expect(parsed.scenes[0].text).toBe("");
    expect(parsed.scenes[0].index).toBe(0);
    expect(parsed.scenes[0].durationSeconds).toBe(20);
  });
});
