import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  decideSamPromptFromImage,
  buildHeuristicSamPrompt,
  DetectedGarmentPieceSchema,
} from "../wardrobeSamVision";

const generateLlmObjectMock = vi.fn();

vi.mock("@/lib/llm/aiSdkGateway", () => ({
  generateLlmObject: (...args: unknown[]) => generateLlmObjectMock(...args),
}));

describe("Wardrobe SAM 3.1 Vision Gateway Engine (wardrobeSamVision.ts)", () => {
  const sampleBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("successfully synthesizes SAM prompt using multimodal LLM gateway", async () => {
    generateLlmObjectMock.mockResolvedValueOnce({
      object: {
        samPrompt: "blazer, lapel, collar, dress shirt, silk tie",
        groundingDinoPrompt: "blazer . lapel . collar . dress shirt . silk tie",
        negativePrompt: "green screen, background",
        detectedGarments: [
          {
            label: "Navy Wool Blazer",
            category: "outerwear",
            samTokens: ["blazer", "lapel", "collar"],
            color: "navy",
            material: "wool",
          },
        ],
        confidence: 0.96,
        reasoning: "High-contrast multi-panel fashion plate inspected.",
      },
      providerUsed: "gemini",
      modelUsed: "gemini-2.5-flash",
    });

    const result = await decideSamPromptFromImage({
      imageBase64: sampleBase64,
      contextHint: "Navy double-breasted blazer and trousers",
      genderHint: "male",
      preferredProvider: "auto",
    });

    expect(generateLlmObjectMock).toHaveBeenCalledTimes(1);
    const callArgs = generateLlmObjectMock.mock.calls[0][0];

    // Verify multimodal image payload
    expect(callArgs.messages).toBeDefined();
    expect(callArgs.messages[0].content).toHaveLength(2); // Text + Image file part
    expect(callArgs.messages[0].content[1].type).toBe("file");
    expect(callArgs.messages[0].content[1].mediaType).toBe("image/png");

    // Verify fallback model configuration
    const expectedVisionModel = process.env.OLLAMA_VISION_MODEL || "llava";
    expect(callArgs.fallbackModel).toBe(expectedVisionModel);
    expect(callArgs.allowFallback).toBe(true);

    expect(result.success).toBe(true);
    expect(result.samPrompt).toContain("blazer");
    expect(result.groundingDinoPrompt).toContain(" . ");
    expect(result.providerUsed).toBe("gemini");
    expect(result.confidence).toBe(0.96);
  });

  it("passes vision model explicitly when preferredProvider is ollama", async () => {
    generateLlmObjectMock.mockResolvedValueOnce({
      object: {
        samPrompt: "tweed suit, vest, pocket square",
        groundingDinoPrompt: "tweed suit . vest . pocket square",
        negativePrompt: "studio wall",
        detectedGarments: [],
        confidence: 0.88,
        reasoning: "Ollama vision inspection.",
      },
      providerUsed: "ollama",
      modelUsed: "llava",
    });

    const result = await decideSamPromptFromImage({
      imageBase64: sampleBase64,
      contextHint: "Tweed three-piece suit",
      genderHint: "male",
      preferredProvider: "ollama",
    });

    expect(generateLlmObjectMock).toHaveBeenCalledTimes(1);
    const callArgs = generateLlmObjectMock.mock.calls[0][0];
    expect(callArgs.provider).toBe("ollama");
    expect(callArgs.model).toBe(process.env.OLLAMA_VISION_MODEL || "llava");
    expect(result.providerUsed).toBe("ollama");
  });

  it("resiliently normalizes non-standard garment category via schema catch", () => {
    const garment = DetectedGarmentPieceSchema.parse({
      label: "Custom accessory",
      category: "unsupported_non_standard_category",
    });

    expect(garment.category).toBe("top");
  });

  it("falls back gracefully to heuristic engine when LLM gateway fails", async () => {
    generateLlmObjectMock.mockRejectedValueOnce(new Error("All LLM providers offline"));
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const result = await decideSamPromptFromImage({
      imageBase64: sampleBase64,
      contextHint: "Navy double-breasted wool blazer with peak lapels",
      genderHint: "male",
      preferredProvider: "auto",
    });

    expect(consoleWarnSpy).toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.providerUsed).toBe("heuristic");
    expect(result.samPrompt).toContain("blazer");

    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });
});
