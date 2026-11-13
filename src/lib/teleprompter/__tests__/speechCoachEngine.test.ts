import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  calculateCadenceMetrics,
  calculateScrollVelocity,
  generateFallbackPolishedScript,
  polishScriptForSpeech,
  PolishedSpeechSchema,
} from "../speechCoachEngine";

const generateLlmObjectMock = vi.fn();

vi.mock("@/lib/llm/aiSdkGateway", () => ({
  generateLlmObject: (...args: unknown[]) => generateLlmObjectMock(...args),
}));

describe("Speech Coach & Teleprompter Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calculates accurate WPM and status when pacing is optimal", () => {
    // 75 words in 30 seconds = 150 WPM (Exact match for target 150)
    const metrics = calculateCadenceMetrics(75, 150, 30, 150);

    expect(metrics.currentWpm).toBe(150);
    expect(metrics.targetWpm).toBe(150);
    expect(metrics.status).toBe("optimal");
    expect(metrics.paceScore).toBe(100);
    expect(metrics.totalRemainingWords).toBe(75);
    expect(metrics.estimatedRemainingSeconds).toBe(30);
  });

  it("identifies when speaking too fast or too slow", () => {
    // 100 words in 30 seconds = 200 WPM (Too Fast for 150)
    const fastMetrics = calculateCadenceMetrics(100, 200, 30, 150);
    expect(fastMetrics.currentWpm).toBe(200);
    expect(fastMetrics.status).toBe("too_fast");

    // 40 words in 30 seconds = 80 WPM (Too Slow for 150)
    const slowMetrics = calculateCadenceMetrics(40, 200, 30, 150);
    expect(slowMetrics.currentWpm).toBe(80);
    expect(slowMetrics.status).toBe("too_slow");
  });

  it("calculates scroll velocity proportional to WPM and font size", () => {
    const vel150 = calculateScrollVelocity(150, 40, 800);
    const vel180 = calculateScrollVelocity(180, 40, 800);

    expect(vel180).toBeGreaterThan(vel150);
    expect(vel150).toBeGreaterThan(10);
  });

  it("generates fallback polished script with emotion and pause markers", () => {
    const raw = "NVIDIA announced record earnings. The artificial intelligence sector exploded. Hyperscale clouds bought all inventory.";
    const result = generateFallbackPolishedScript(raw, 150);

    expect(result.polishedText).toContain("[urgent]");
    expect(result.suggestedWpm).toBe(150);
    expect(result.keyTips.length).toBeGreaterThanOrEqual(2);
    expect(result.estimatedDurationSeconds).toBeGreaterThan(0);
  });

  it("polishes script via unified AI SDK gateway with Zod schema", async () => {
    const mockPolished = {
      polishedText: "[urgent] NVIDIA announced unprecedented quarterly revenue. [pause: 0.4s] [serious] AI compute spending expanded thirty-eight percent.",
      suggestedWpm: 145,
      estimatedDurationSeconds: 42,
      keyTips: ["Hit the pause before 'thirty-eight percent'", "Keep authoritative anchor cadence"],
    };

    generateLlmObjectMock.mockResolvedValueOnce({
      object: mockPolished,
      providerUsed: "gemini",
      modelUsed: "gemini-2.5-flash",
    });

    const result = await polishScriptForSpeech("Raw news text", 145);

    expect(generateLlmObjectMock).toHaveBeenCalledTimes(1);
    const callArgs = generateLlmObjectMock.mock.calls[0][0];
    expect(callArgs.schemaName).toBe("PolishedSpeech");
    expect(callArgs.schema).toBe(PolishedSpeechSchema);
    expect(result.polishedText).toContain("[pause: 0.4s]");
    expect(result.suggestedWpm).toBe(145);
  });

  it("falls back cleanly to heuristic script polisher when AI gateway throws", async () => {
    generateLlmObjectMock.mockRejectedValueOnce(new Error("LLM failure"));

    const raw = "Breaking news tonight. Global markets rallied to fresh highs. Central banks held rates unchanged.";
    const result = await polishScriptForSpeech(raw, 150);

    expect(result.polishedText).toContain("[urgent]");
    expect(result.suggestedWpm).toBe(150);
    expect(result.keyTips.length).toBeGreaterThanOrEqual(2);
  });

  it("falls back to heuristic script polisher if LLM returns empty polishedText", async () => {
    generateLlmObjectMock.mockResolvedValueOnce({
      object: {
        polishedText: "",
        suggestedWpm: 150,
        estimatedDurationSeconds: 45,
        keyTips: [],
      },
      providerUsed: "gemini",
      modelUsed: "gemini-2.5-flash",
    });

    const raw = "Headline news text to polish.";
    const result = await polishScriptForSpeech(raw, 150);

    expect(result.polishedText).toContain("[urgent]");
    expect(result.suggestedWpm).toBe(150);
  });

  it("handles malformed schema inputs gracefully with .catch() defaults", () => {
    const parsed = PolishedSpeechSchema.parse({
      polishedText: null,
      suggestedWpm: "invalid-string",
      keyTips: "invalid-not-array",
    });

    expect(parsed.polishedText).toBe("");
    expect(parsed.suggestedWpm).toBe(150);
    expect(parsed.keyTips).toEqual([]);
  });
});
