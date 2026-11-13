import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  translateNewsScript,
  translateToAllLanguages,
  type TargetLanguage,
} from "../translator";

const generateLlmTextMock = vi.fn();

vi.mock("@/lib/llm/aiSdkGateway", () => ({
  generateLlmText: (...args: unknown[]) => generateLlmTextMock(...args),
}));

describe("Cultural Idiom Adaptation & Translation Engine (translator.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should successfully translate a script segment into Argentine Spanish with voseo", async () => {
    generateLlmTextMock.mockResolvedValueOnce({
      text: "Che, mirá lo que pasó: vos tenés que entender esto [urgent] [sfx:stinger]",
      providerUsed: "gemini",
      modelUsed: "gemini-2.5-flash",
    });

    const result = await translateNewsScript("Look at what happened: you have to understand this [urgent] [sfx:stinger]", "es_ar");

    expect(generateLlmTextMock).toHaveBeenCalledTimes(1);
    expect(result.targetLang).toBe("es_ar");
    expect(result.translatedText).toContain("vos tenés");
    expect(result.suggestedVoiceId).toBe("piper_rioplatense_male");
    expect(result.adaptedIdioms).toContain("Applied Rioplatense voseo register");
  });

  it("should successfully translate into Japanese with polite register note", async () => {
    generateLlmTextMock.mockResolvedValueOnce({
      text: "最新のニュースをお伝えします。[sfx:pop]",
      providerUsed: "gemini",
      modelUsed: "gemini-2.5-flash",
    });

    const result = await translateNewsScript("Here is the latest news. [sfx:pop]", "ja_jp");

    expect(result.targetLang).toBe("ja_jp");
    expect(result.suggestedVoiceId).toBe("piper_japanese_female");
    expect(result.adaptedIdioms).toContain("Applied polite Japanese (丁寧語) broadcast register");
  });

  it("should gracefully fall back to original text when LLM generation fails", async () => {
    generateLlmTextMock.mockRejectedValueOnce(new Error("Network timeout or LLM offline"));

    const originalText = "Breaking news: Market indices spike across global exchanges.";
    const result = await translateNewsScript(originalText, "de_de");

    expect(result.targetLang).toBe("de_de");
    expect(result.translatedText).toBe(originalText);
    expect(result.suggestedVoiceId).toBe("piper_german_female");
    expect(result.adaptedIdioms[0]).toContain("Translation failed");
  });

  it("should return immediately without calling LLM when text is empty or whitespace", async () => {
    const result = await translateNewsScript("   ", "es_ar");
    expect(generateLlmTextMock).not.toHaveBeenCalled();
    expect(result.translatedText).toBe("   ");
    expect(result.targetLang).toBe("es_ar");
  });

  it("should gracefully fall back to original text when LLM returns empty string", async () => {
    generateLlmTextMock.mockResolvedValueOnce({
      text: "   ",
      providerUsed: "gemini",
      modelUsed: "gemini-2.5-flash",
    });

    const originalText = "Original news script";
    const result = await translateNewsScript(originalText, "fr_fr");

    expect(result.targetLang).toBe("fr_fr");
    expect(result.translatedText).toBe(originalText);
    expect(result.adaptedIdioms[0]).toContain("Translation failed");
  });

  it("should translate across all 6 languages in parallel", async () => {
    generateLlmTextMock.mockImplementation(async (params: { prompt: string; system: string }) => {
      return {
        text: `Translated: ${params.prompt.slice(0, 15)}`,
        providerUsed: "gemini",
        modelUsed: "gemini-2.5-flash",
      };
    });

    const allResults = await translateToAllLanguages("Breaking report on energy grid innovation.");
    const expectedLangs: TargetLanguage[] = ["es_ar", "en_us", "pt_br", "de_de", "fr_fr", "ja_jp"];

    for (const lang of expectedLangs) {
      expect(allResults[lang]).toBeDefined();
      expect(allResults[lang].targetLang).toBe(lang);
      expect(allResults[lang].translatedText).toContain("Translated:");
    }
    expect(generateLlmTextMock).toHaveBeenCalledTimes(6);
  });
});
