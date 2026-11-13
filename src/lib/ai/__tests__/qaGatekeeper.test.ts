import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  calculateQaStatus,
  generateHeuristicQaReport,
  auditVideoFramesWithGemini,
  QaDefect,
  QaDefectSchema,
} from "../qaGatekeeper";
import { parseArgs } from "../../../../scripts/ecommerce-ad-cli";

const generateLlmObjectMock = vi.fn();

vi.mock("@/lib/llm/aiSdkGateway", () => ({
  generateLlmObject: (...args: unknown[]) => generateLlmObjectMock(...args),
}));

describe("Pre-Publication QA Gatekeeper Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("certifies pass for scores >= 85 with no critical/warning defects", () => {
    const status = calculateQaStatus(92, []);
    expect(status).toBe("CERTIFIED_PASS");

    const statusWithMinor = calculateQaStatus(88, [
      {
        severity: "minor",
        dimension: "safe_zone",
        description: "Caption is close to right edge",
        recommendation: "Ensure 40px margin",
      },
    ]);
    expect(statusWithMinor).toBe("CERTIFIED_PASS");
  });

  it("flags for review when score is between 70 and 84 or contains warning defects", () => {
    const statusScore = calculateQaStatus(78, []);
    expect(statusScore).toBe("FLAGGED_REVIEW");

    const statusWarning: QaDefect[] = [
      {
        severity: "warning",
        dimension: "lip_sync",
        description: "Minor mouth blur during fast speech transition",
        recommendation: "Review presenter cadence",
      },
    ];
    const flagged = calculateQaStatus(90, statusWarning);
    expect(flagged).toBe("FLAGGED_REVIEW");
  });

  it("quarantines video when score < 70 or when critical defects exist", () => {
    const lowScore = calculateQaStatus(65, []);
    expect(lowScore).toBe("QUARANTINED");

    const criticalDefect: QaDefect[] = [
      {
        severity: "critical",
        dimension: "anatomy",
        description: "Hallucinated 6th finger on presenter hand",
        recommendation: "Re-generate presenter scene",
      },
    ];
    const quarantined = calculateQaStatus(95, criticalDefect);
    expect(quarantined).toBe("QUARANTINED");
  });

  it("generates a comprehensive heuristic QA report with all 4 dimensions", () => {
    const report = generateHeuristicQaReport([], {
      title: "Lumina Hardwood Ad",
      aspectRatio: "9:16",
      channel: "tiktok",
    });

    expect(report).toBeDefined();
    expect(report.overallScore).toBeGreaterThanOrEqual(70);
    expect(report.engine).toBe("heuristic_signal_stats");
    expect(report.dimensions.lipSync).toBeDefined();
    expect(report.dimensions.anatomy).toBeDefined();
    expect(report.dimensions.safeZone).toBeDefined();
    expect(report.dimensions.brandSafety).toBeDefined();
    expect(report.summary).toContain("Pre-flight heuristic");
  });

  it("parses --audit flag in ecommerce-ad-cli", () => {
    const opts = parseArgs(["--sample=flooring", "--audit"]);
    expect(opts.audit).toBe(true);

    const defaultOpts = parseArgs(["--sample=flooring"]);
    expect(defaultOpts.audit).toBe(false);
  });

  describe("auditVideoFramesWithGemini via Multimodal AI SDK Gateway", () => {
    const dummyKeyframes = [
      {
        timestamp: 1.5,
        base64: Buffer.from("fake-keyframe-data-1").toString("base64"),
        mimeType: "image/jpeg",
      },
    ];

    it("executes multimodal vision analysis and returns structured forensic report", async () => {
      generateLlmObjectMock.mockResolvedValueOnce({
        object: {
          overallScore: 94,
          dimensions: {
            lipSync: { score: 95, details: "Lip sync aligned" },
            anatomy: { score: 92, details: "Anatomy clean" },
            safeZone: { score: 96, details: "Text margins clear" },
            brandSafety: { score: 98, details: "Watermarks intact" },
          },
          defects: [],
          summary: "Inspection passed all broadcast standards.",
        },
        providerUsed: "gemini",
        modelUsed: "gemini-2.5-flash",
      });

      const report = await auditVideoFramesWithGemini(dummyKeyframes, {
        title: "Test Broadcast",
        channel: "youtube",
      });

      expect(generateLlmObjectMock).toHaveBeenCalledTimes(1);
      const callArgs = generateLlmObjectMock.mock.calls[0][0];

      // Verifies multimodal content structure
      expect(callArgs.messages).toBeDefined();
      expect(callArgs.messages[0].content).toHaveLength(2); // Prompt text + 1 image part
      expect(callArgs.messages[0].content[1].type).toBe("file");
      expect(callArgs.fallbackModel).toBe(process.env.OLLAMA_VISION_MODEL || "llava");

      expect(report.overallScore).toBe(94);
      expect(report.status).toBe("CERTIFIED_PASS");
      expect(report.engine).toBe("gemini_2.5_vision");
      expect(report.dimensions.lipSync.score).toBe(95);
    });

    it("resiliently normalizes non-standard defect severity and dimensions", () => {
      const defect = QaDefectSchema.parse({
        severity: "ultra_high_critical",
        dimension: "hallucinated_background",
      });

      expect(defect.severity).toBe("warning");
      expect(defect.dimension).toBe("safe_zone");
    });

    it("falls back gracefully to heuristic report when LLM gateway fails", async () => {
      generateLlmObjectMock.mockRejectedValueOnce(new Error("Multimodal endpoint timeout"));
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const report = await auditVideoFramesWithGemini(dummyKeyframes, {
        title: "Failing Video",
      });

      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(report.engine).toBe("heuristic_signal_stats");
      expect(report.overallScore).toBeGreaterThanOrEqual(70);

      consoleWarnSpy.mockRestore();
    });
  });
});
