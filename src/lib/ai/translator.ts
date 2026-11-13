/**
 * Cultural Idiom Adaptation & Translation Engine
 * Translates news scripts across 6 target languages while preserving local cultural references.
 *
 * Uses Gemini 2.5 Flash for real AI-driven translation with cultural adaptation.
 * Falls back to the original text if the API is unavailable.
 */

import { generateLlmText } from "@/lib/llm/aiSdkGateway";

export type TargetLanguage = "es_ar" | "en_us" | "pt_br" | "de_de" | "fr_fr" | "ja_jp";

export interface TranslationResult {
  targetLang: TargetLanguage;
  translatedText: string;
  adaptedIdioms: string[];
  suggestedVoiceId: string;
}

const VOICE_MAP: Record<TargetLanguage, string> = {
  es_ar: "piper_rioplatense_male",
  en_us: "piper_english_female",
  pt_br: "piper_portuguese_male",
  de_de: "piper_german_female",
  fr_fr: "piper_french_male",
  ja_jp: "piper_japanese_female",
};

const LANGUAGE_LABELS: Record<TargetLanguage, string> = {
  es_ar: "Argentine Spanish (Rioplatense)",
  en_us: "American English",
  pt_br: "Brazilian Portuguese",
  de_de: "German",
  fr_fr: "French",
  ja_jp: "Japanese",
};

const CULTURAL_NOTES: Record<TargetLanguage, string> = {
  es_ar:
    "Use Argentine Rioplatense Spanish (voseo: 'vos tenés' not 'tú tienes'). " +
    "Replace US dollar references with Argentine pesos (ARS) context when appropriate. " +
    "Use local idioms and adapt formal broadcast register.",
  en_us:
    "Use clear, punchy American broadcast English. " +
    "Prefer active voice, short sentences, and TikTok-friendly phrasing.",
  pt_br:
    "Use Brazilian Portuguese with a warm, accessible broadcast tone. " +
    "Replace US cultural references with Brazilian context where natural.",
  de_de:
    "Use formal German broadcast register (Sie form). " +
    "Maintain precise, factual tone consistent with German public news style.",
  fr_fr:
    "Use standard French broadcast register. " +
    "Maintain journalistic neutrality and adapt US cultural references to European context.",
  ja_jp:
    "Use polite Japanese (丁寧語, desu/masu form) suitable for broadcast news. " +
    "Convert large numbers to Japanese units (万, 億) where appropriate.",
};

/**
 * Translate script text with cultural adaptation using unified AI SDK gateway (Gemini or Ollama).
 */
export async function translateNewsScript(
  text: string,
  targetLang: TargetLanguage
): Promise<TranslationResult> {
  const suggestedVoiceId = VOICE_MAP[targetLang] || "piper_rioplatense_male";
  const langLabel = LANGUAGE_LABELS[targetLang];
  const culturalNote = CULTURAL_NOTES[targetLang];
  if (!text || text.trim().length === 0) {
    return {
      targetLang,
      translatedText: text,
      adaptedIdioms: [],
      suggestedVoiceId,
    };
  }

  try {
    const systemPrompt = `You are a professional broadcast news translator and cultural adaptation specialist.
Your task is to translate the following news script segment into ${langLabel}.

Cultural guidelines:
${culturalNote}

Rules:
- Preserve all inline tags like [urgent], [pause: 0.5s], [sfx:stinger] exactly as-is (they are TTS instructions, not content).
- Do NOT translate or modify any text inside square brackets.
- Output ONLY the translated text. No explanations, no headers, no JSON.
- Maintain the original broadcast energy and pacing.`;

    const { text: rawTranslated } = await generateLlmText({
      system: systemPrompt,
      prompt: text,
      tier: "structured",
      temperature: 0.3,
      maxOutputTokens: 1024,
    });

    const translated = rawTranslated?.trim();

    if (!translated) {
      throw new Error("Empty translation response from LLM gateway");
    }

    // Extract any cultural adaptations that were made (simple heuristic)
    const adaptedIdioms: string[] = [`Translated to ${langLabel} with cultural adaptation`];
    if (targetLang === "es_ar" && translated.includes("vos")) {
      adaptedIdioms.push("Applied Rioplatense voseo register");
    }
    if (targetLang === "ja_jp") {
      adaptedIdioms.push("Applied polite Japanese (丁寧語) broadcast register");
    }

    return {
      targetLang,
      translatedText: translated,
      adaptedIdioms,
      suggestedVoiceId,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Translator] LLM translation failed for ${targetLang}:`, msg);
    // Graceful fallback — return original text so the pipeline doesn't crash
    return {
      targetLang,
      translatedText: text,
      adaptedIdioms: [`Translation failed: ${msg}. Returning original text.`],
      suggestedVoiceId,
    };
  }
}

/**
 * Translate a full script across all 6 target languages in parallel.
 */
export async function translateToAllLanguages(
  text: string
): Promise<Record<TargetLanguage, TranslationResult>> {
  const languages: TargetLanguage[] = ["es_ar", "en_us", "pt_br", "de_de", "fr_fr", "ja_jp"];

  const results = await Promise.all(
    languages.map((lang) => translateNewsScript(text, lang))
  );

  return Object.fromEntries(
    results.map((r) => [r.targetLang, r])
  ) as Record<TargetLanguage, TranslationResult>;
}
