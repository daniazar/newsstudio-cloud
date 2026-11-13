import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  extractWithGemini,
  ProductVisualAttributesSchema,
  ProductExtractionSchema,
} from "../geminiVisionExtractor";

const generateLlmObjectMock = vi.fn();

vi.mock("@/lib/llm/aiSdkGateway", () => ({
  generateLlmObject: (...args: unknown[]) => generateLlmObjectMock(...args),
}));

describe("GeminiVisionExtractor Engine", () => {
  const sampleOptions = {
    sourceUrl: "https://store.example.com/products/leather-jacket",
    pageText: "Premium Italian Lambskin Leather Jacket. Handcrafted in Florence. Price: $299.00. 100% genuine lambskin.",
    imageUrls: ["https://store.example.com/images/hero.jpg", "https://store.example.com/images/detail.jpg"],
  };

  const sampleExtractedData = {
    title: "Premium Italian Lambskin Leather Jacket",
    vendor: "Firenze Sartoria",
    description: "Handcrafted Italian leather jacket.",
    bulletPoints: ["100% genuine lambskin", "Handmade in Florence", "Silk lining"],
    price: 299.0,
    compareAtPrice: 399.0,
    currency: "USD",
    inStock: true,
    rating: 4.9,
    reviewCount: 38,
    typology: "apparel_wearable" as const,
    brandColors: {
      primary: "#1e1e1e",
      secondary: "#c5a059",
    },
    variants: [{ title: "M / Black", price: 299.0, available: true }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports valid ProductVisualAttributesSchema and ProductExtractionSchema aliases", () => {
    expect(ProductVisualAttributesSchema).toBeDefined();
    expect(ProductExtractionSchema).toBe(ProductVisualAttributesSchema);

    const parsed = ProductVisualAttributesSchema.parse(sampleExtractedData);
    expect(parsed.title).toBe(sampleExtractedData.title);
    expect(parsed.typology).toBe("apparel_wearable");
  });

  it("extracts structured product specification using multimodal AI SDK gateway", async () => {
    generateLlmObjectMock.mockResolvedValueOnce({
      object: sampleExtractedData,
      providerUsed: "gemini",
      modelUsed: "gemini-2.5-flash",
    });

    const result = await extractWithGemini(sampleOptions);

    expect(result).not.toBeNull();
    expect(result?.title).toBe(sampleExtractedData.title);
    expect(result?.vendor).toBe("Firenze Sartoria");
    expect(result?.price).toBe(299.0);
    expect(result?.typology).toBe("apparel_wearable");
    expect(result?.brand?.name).toBe("Firenze Sartoria");
    expect(result?.brand?.domain).toBe("store.example.com");
    expect(result?.assets?.length).toBe(2);

    expect(generateLlmObjectMock).toHaveBeenCalledTimes(1);
    const callArgs = generateLlmObjectMock.mock.calls[0][0];
    expect(callArgs.schemaName).toBe("ProductVisualAttributes");
    expect(callArgs.schema).toBe(ProductVisualAttributesSchema);
    expect(callArgs.fallbackModel).toBeDefined();
    expect(callArgs.messages).toBeDefined();
    expect(callArgs.messages[0].content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "text" }),
        expect.objectContaining({ type: "image" }),
      ])
    );
  });

  it("handles text-only extraction when no imageUrls are provided", async () => {
    generateLlmObjectMock.mockResolvedValueOnce({
      object: sampleExtractedData,
      providerUsed: "gemini",
      modelUsed: "gemini-2.5-flash",
    });

    const result = await extractWithGemini({
      sourceUrl: "https://store.example.com/item",
      pageText: "Simple product text",
    });

    expect(result).not.toBeNull();
    expect(generateLlmObjectMock).toHaveBeenCalledTimes(1);
    const callArgs = generateLlmObjectMock.mock.calls[0][0];
    expect(callArgs.prompt).toBeDefined();
    expect(callArgs.fallbackModel).toBeUndefined();
  });

  it("handles data URI and base64 imageUrls seamlessly", async () => {
    generateLlmObjectMock.mockResolvedValueOnce({
      object: sampleExtractedData,
      providerUsed: "ollama",
      modelUsed: "llava",
    });

    const result = await extractWithGemini({
      sourceUrl: "https://store.example.com/item",
      pageText: "Product text",
      imageUrls: ["data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="],
    });

    expect(result).not.toBeNull();
    expect(generateLlmObjectMock).toHaveBeenCalledTimes(1);
    const callArgs = generateLlmObjectMock.mock.calls[0][0];
    expect(callArgs.fallbackModel).toBe(process.env.OLLAMA_VISION_MODEL || "llava");
    expect(callArgs.messages[0].content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "image", image: expect.stringContaining("data:image/png;base64,") }),
      ])
    );
  });

  it("returns null gracefully when AI SDK gateway throws or fails", async () => {
    generateLlmObjectMock.mockRejectedValueOnce(new Error("Vision model unavailable"));

    const result = await extractWithGemini(sampleOptions);

    expect(result).toBeNull();
  });
});
