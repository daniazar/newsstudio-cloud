import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  OllamaConversationalClient,
  detectQueryLanguage,
} from "../ollamaConversationalClient";

const generateLlmTextMock = vi.fn();
const streamLlmTextMock = vi.fn();

vi.mock("@/lib/llm/aiSdkGateway", () => ({
  generateLlmText: (...args: unknown[]) => generateLlmTextMock(...args),
  streamLlmText: (...args: unknown[]) => streamLlmTextMock(...args),
}));

describe("OllamaConversationalClient Engine", () => {
  let client: OllamaConversationalClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new OllamaConversationalClient();
  });

  describe("detectQueryLanguage", () => {
    it("detects Spanish accurately", () => {
      expect(detectQueryLanguage("¿Cómo cerraron los mercados hoy?")).toBe("es");
      expect(detectQueryLanguage("Buenas noches a todos")).toBe("es");
    });

    it("detects English accurately", () => {
      expect(detectQueryLanguage("What is the top news headline today?")).toBe("en");
      expect(detectQueryLanguage("Explain the latest tech market update")).toBe("en");
    });
  });

  describe("generateTurn", () => {
    it("generates a conversational turn via generateLlmText", async () => {
      generateLlmTextMock.mockResolvedValueOnce({
        text: "[gesture:wide] Good evening. The tech sector saw significant movement today following major earnings announcements. [project_ticker: NVDA]",
        providerUsed: "ollama",
        modelUsed: "qwen2.5:3b",
      });

      const response = await client.generateTurn({
        personaId: "ruby",
        userUtterance: "What is happening in the markets today?",
        language: "en",
      });

      expect(generateLlmTextMock).toHaveBeenCalledTimes(1);
      const callArgs = generateLlmTextMock.mock.calls[0][0];
      expect(callArgs.system).toContain("Ruby Vance");
      expect(callArgs.temperature).toBe(0.35);
      expect(callArgs.messages.every((m: { role: string }) => m.role !== "system")).toBe(true);

      expect(response.providerUsed).toBe("ollama");
      expect(response.modelUsed).toBe("qwen2.5:3b");
      expect(response.actionPose).toBe("M3_OPEN_HANDS");
      expect(response.projectedCard?.type).toBe("ticker");
      expect(response.projectedCard?.title).toContain("NVDA");
      expect(response.cleanSpokenText).not.toContain("[gesture:wide]");
      expect(response.cleanSpokenText).not.toContain("[project_ticker: NVDA]");
    });

    it("forwards custom baseUrl when client is initialized with custom endpoint", async () => {
      const customClient = new OllamaConversationalClient("http://remote-ollama:11434");
      generateLlmTextMock.mockResolvedValueOnce({
        text: "Custom Ollama responding.",
        providerUsed: "ollama",
        modelUsed: "qwen2.5:3b",
      });

      await customClient.generateTurn({
        personaId: "ruby",
        userUtterance: "Status check",
      });

      expect(generateLlmTextMock).toHaveBeenCalledTimes(1);
      expect(generateLlmTextMock.mock.calls[0][0].baseURL).toBe("http://remote-ollama:11434");
    });

    it("performs language alignment fast-translation if output language mismatches query", async () => {
      // First call returns Spanish when English was requested
      generateLlmTextMock.mockResolvedValueOnce({
        text: "[gesture:explanatory] Los mercados cerraron con ganancias notables hoy.",
        providerUsed: "gemini",
        modelUsed: "gemini-2.5-flash",
      });
      // Second call (translation) returns English
      generateLlmTextMock.mockResolvedValueOnce({
        text: "[gesture:explanatory] Markets closed with notable gains today.",
        providerUsed: "gemini",
        modelUsed: "gemini-2.5-flash",
      });

      const response = await client.generateTurn({
        personaId: "ruby",
        userUtterance: "How did the stock markets close today?",
        language: "en",
      });

      expect(generateLlmTextMock).toHaveBeenCalledTimes(2);
      expect(response.detectedLanguage).toBe("en");
      expect(response.cleanSpokenText).toContain("Markets closed with notable gains today.");
    });

    it("falls back cleanly to heuristic response when AI gateway throws", async () => {
      generateLlmTextMock.mockRejectedValueOnce(new Error("All LLM providers unavailable"));

      const response = await client.generateTurn({
        personaId: "ruby",
        userUtterance: "Tell me breaking news",
        language: "en",
        newsStories: [
          {
            id: "story_123",
            title: "Global AI Compute Allocations Break Record",
            description: "Surging hyperscale cloud capex.",
            category: "Technology",
            link: "https://example.com/ai-compute",
            pubDate: "2026-10-29T10:00:00Z",
            createdAt: "2026-10-29T10:00:00Z",
          },
        ],
      });

      expect(response.providerUsed).toBe("heuristic");
      expect(response.modelUsed).toBe("heuristic");
      expect(response.cleanSpokenText).toContain("Global AI Compute Allocations Break Record");
      expect(response.projectedCard?.storyId).toBe("story_123");
    });
  });

  describe("streamTurnText", () => {
    it("routes streaming requests through streamLlmText", async () => {
      const mockStreamResult = {
        textStream: (async function* () {
          yield "Breaking ";
          yield "tech ";
          yield "news.";
        })(),
        providerUsed: "gemini",
        modelUsed: "gemini-2.5-flash",
      };

      streamLlmTextMock.mockResolvedValueOnce(mockStreamResult);

      const result = await client.streamTurnText({
        personaId: "blaze",
        userUtterance: "What's new in gaming tech?",
        language: "en",
        forceGemini: true,
      });

      expect(streamLlmTextMock).toHaveBeenCalledTimes(1);
      const callArgs = streamLlmTextMock.mock.calls[0][0];
      expect(callArgs.provider).toBe("gemini");
      expect(callArgs.system).toContain("Blaze");
      expect(result).toBe(mockStreamResult);
    });
  });
});
