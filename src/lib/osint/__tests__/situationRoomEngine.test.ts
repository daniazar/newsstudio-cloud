import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchLiveEarthquakes,
  synthesizeBreakingDispatch,
  BreakingDispatchStorySchema,
  type OsintAlertEvent,
} from "../situationRoomEngine";
import { weaveSponsorIntoScript, SAMPLE_SPONSOR_CAMPAIGNS } from "../../sponsors/sponsorEngine";

const generateLlmObjectMock = vi.fn();

vi.mock("@/lib/llm/aiSdkGateway", () => ({
  generateLlmObject: (...args: unknown[]) => generateLlmObjectMock(...args),
}));

describe("OSINT Situation Room Engine", () => {
  const sampleAlert: OsintAlertEvent = {
    id: "usgs_test_123",
    source: "USGS_EARTHQUAKE",
    severity: "CRITICAL",
    title: "M6.8 Major Earthquake — 12km NNE of Sendai, Japan",
    location: "Off the Pacific coast of Tohoku, Japan",
    latitude: 38.2688,
    longitude: 140.8721,
    magnitudeOrIntensity: 6.8,
    timestamp: new Date().toISOString(),
    rawDetails: { depthKm: 42, tsunamiWarning: true, feltReports: 1240 },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches and parses live or fallback earthquake sensor alerts", async () => {
    const alerts = await fetchLiveEarthquakes(4.5);
    expect(Array.isArray(alerts)).toBe(true);
    expect(alerts.length).toBeGreaterThan(0);

    const first = alerts[0];
    expect(first.source).toBe("USGS_EARTHQUAKE");
    expect(typeof first.title).toBe("string");
    expect(typeof first.latitude).toBe("number");
    expect(typeof first.longitude).toBe("number");
    expect(["CRITICAL", "SEVERE", "URGENT", "MONITORING"]).toContain(first.severity);
  });

  it("synthesizes breaking dispatch package with emergency graphics and script via AI SDK gateway", async () => {
    const mockDispatch = {
      headline: "Major M6.8 Earthquake Hits Sendai",
      urgencyLevel: "CRITICAL",
      recommendedPersonaId: "storm",
      studioPlateCategory: "field_storm" as const,
      lowerThirdAlert: "URGENT: MAJOR SEISMIC ACTIVITY",
      tickerHeadline: "M6.8 Sendai Earthquake • Tsunami Advisory Issued",
      mapPrompt: "Satellite radar view of Sendai coastline with seismic rings",
      scriptSegments: [
        {
          speaker: "Storm Mitchell",
          text: "[sfx:stinger] Breaking seismic activity detected off the Sendai coast.",
          cameraAngle: "wide",
          sfxTag: "[sfx:stinger]",
          citationBadge: "USGS SEISMIC NETWORK",
        },
      ],
    };

    generateLlmObjectMock.mockResolvedValueOnce({
      object: mockDispatch,
      providerUsed: "gemini",
      modelUsed: "gemini-2.5-flash",
    });

    const dispatch = await synthesizeBreakingDispatch(sampleAlert, "en");

    expect(generateLlmObjectMock).toHaveBeenCalledTimes(1);
    const callArgs = generateLlmObjectMock.mock.calls[0][0];
    expect(callArgs.schemaName).toBe("BreakingDispatchStory");
    expect(callArgs.schema).toBe(BreakingDispatchStorySchema);
    expect(dispatch.headline).toBe("Major M6.8 Earthquake Hits Sendai");
    expect(dispatch.scriptSegments[0].speaker).toBe("Storm Mitchell");
  });

  it("falls back to heuristic dispatch when AI SDK gateway fails", async () => {
    generateLlmObjectMock.mockRejectedValueOnce(new Error("Ollama ECONNREFUSED"));

    const dispatch = await synthesizeBreakingDispatch(sampleAlert, "es");

    expect(dispatch.headline).toBe(sampleAlert.title);
    expect(dispatch.recommendedPersonaId).toBe("isabel");
    expect(dispatch.lowerThirdAlert).toContain("ALERTA SÍSMICA");
    expect(dispatch.scriptSegments.length).toBe(2);
    expect(dispatch.scriptSegments[0].speaker).toBe("Isabel Rivera");
  });

  it("handles missing headline and mapPrompt with schema .catch() and fills alert fallbacks", async () => {
    generateLlmObjectMock.mockResolvedValueOnce({
      object: {
        scriptSegments: [
          { speaker: "Storm", text: "Urgent telemetry update." },
        ],
      },
      providerUsed: "ollama",
      modelUsed: "qwen3.5:9b",
    });

    const dispatch = await synthesizeBreakingDispatch(sampleAlert, "en");

    expect(dispatch.headline).toBe(sampleAlert.title);
    expect(dispatch.tickerHeadline).toContain(sampleAlert.title);
    expect(dispatch.mapPrompt).toContain(sampleAlert.location);
    expect(dispatch.scriptSegments.length).toBe(1);
  });
});

describe("Dynamic Sponsor Engine", () => {
  it("weaves verbal sponsor plugs into news script correctly", () => {
    const sampleScript = [
      { speaker: "Ruby", text: "Good evening, here are the top market headlines." },
      { speaker: "Ruby", text: "Tech stocks soared following breakthrough AI announcements." },
    ];

    const sponsor = SAMPLE_SPONSOR_CAMPAIGNS[0];
    const modified = weaveSponsorIntoScript(sampleScript, sponsor, "intro");

    expect(modified.length).toBe(3);
    expect(modified[1].text).toContain(sponsor.brandName);
  });
});
