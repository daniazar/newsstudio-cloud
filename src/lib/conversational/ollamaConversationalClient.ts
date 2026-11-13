/**
 * src/lib/conversational/ollamaConversationalClient.ts
 *
 * Real-Time Conversational LLM Client with Local Ollama Primary & Gemini Fallback.
 * Directly adapted from tooling/discord-voice-bot/src/ai/ollamaClient.ts.
 */

import { getPersonaById, Persona } from "@/lib/tts/personas";
import {
  cleanSpokenText,
  GENERIC_AUDIO_TAGS_PROMPT_INSTRUCTION,
} from "./audioTagAdapter";
import { NewsStoryItem } from "./newsContextService";
import { generateLlmText, streamLlmText, AnyLanguageModel } from "@/lib/llm/aiSdkGateway";
import type { LLMProvider } from "@/lib/types";
import { ClauseStreamSplitter } from "./clauseStreamSplitter";

export interface ConversationalChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export type ConversationalStreamEvent =
  | { type: "delta"; textDelta: string; spokenPreview: string }
  | {
      type: "clause";
      index: number;
      spokenText: string;
      cleanSpokenText: string;
      actionPose: ConversationalResponse["actionPose"];
      detectedLanguage: "es" | "en";
      ttfaMs: number;
    }
  | { type: "complete"; response: ConversationalResponse }
  | { type: "error"; error: string };

export interface ProjectedCardData {
  type: "story" | "ticker";
  title: string;
  category?: string;
  badge?: string;
  snippet?: string;
  storyId?: string;
  change?: string;
  isPositive?: boolean;
}

export interface ConversationalResponse {
  rawText: string;
  spokenText: string;
  cleanSpokenText: string;
  actionPose: "M1_NEUTRAL_CLASPED" | "M2_RAISED_EXPLANATORY" | "M3_OPEN_HANDS" | "M5_SIDE_PERSPECTIVE_TURN";
  projectedCard?: ProjectedCardData | null;
  suggestedFollowUps: string[];
  detectedLanguage: "es" | "en";
  providerUsed: "ollama" | "gemini" | "heuristic";
  modelUsed: string;
  latencyMs: number;
}

export function detectQueryLanguage(text: string, defaultLang: "auto" | "es" | "en" = "auto"): "es" | "en" {
  const clean = text.trim();
  if (!clean) {
    return defaultLang === "en" ? "en" : "es";
  }

  const spanishIndicators = /[áéíóúñ¿¡]/i;
  if (spanishIndicators.test(clean)) return "es";

  const spanishWords = new Set([
    "el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del", "en", "que", "qué", "es", "son",
    "por", "para", "con", "hola", "buenas", "noticias", "estamos", "todos", "hoy", "acá", "esto", "esta",
    "aquí", "sobre", "cómo", "como", "cuál", "cuales", "cuáles", "quién", "gracias", "bienvenidos", "muy", "más", "novedades",
    "bien", "también", "pero", "porque", "si", "sí", "disculpen", "error", "destacamos", "primero", "segundo",
    "mundo", "país", "gobierno", "economía", "mercado", "minuto", "último", "momento", "saludos", "ahora",
    "dame", "resumen", "principales", "contame", "explicame", "pasando", "contar", "decir", "noche", "tarde", "dias"
  ]);

  const englishWords = new Set([
    "the", "be", "to", "of", "and", "a", "in", "that", "have", "i", "it", "for", "not", "on", "with",
    "he", "as", "you", "do", "at", "this", "but", "his", "by", "from", "they", "we", "say", "her",
    "she", "or", "an", "will", "my", "one", "all", "would", "there", "their", "what", "so", "up",
    "out", "if", "about", "who", "get", "which", "go", "me", "when", "make", "can", "like", "time",
    "no", "just", "him", "know", "take", "people", "into", "year", "your", "good", "some", "could",
    "them", "see", "other", "than", "then", "now", "look", "only", "come", "its", "over", "think",
    "also", "back", "after", "use", "two", "how", "our", "work", "first", "well", "way", "even",
    "new", "want", "because", "any", "these", "give", "day", "most", "us", "headlines", "tech", "today",
    "breaking", "evening", "welcome", "studio", "markets", "update", "report", "news", "tell", "explain",
    "summary", "blitz", "cryptos", "stock", "brief", "whats", "what's", "how's", "is", "are"
  ]);

  const cleanWords = (clean.toLowerCase().match(/[a-záéíóúñ']+/g) || []);
  let esCount = 0;
  let enCount = 0;

  for (const w of cleanWords) {
    if (spanishWords.has(w)) esCount++;
    if (englishWords.has(w)) enCount++;
  }

  if (enCount > esCount) return "en";
  if (esCount > enCount) return "es";

  // Fallback to defaultLang if ambiguous
  if (defaultLang === "es") return "es";
  if (defaultLang === "en") return "en";
  return /[a-zA-Z]/.test(clean) && !spanishIndicators.test(clean) ? "en" : "es";
}

export class OllamaConversationalClient {
  private baseUrl: string;
  private defaultModel: string;

  constructor(
    baseUrl: string = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434",
    defaultModel: string = process.env.OLLAMA_MODEL || "qwen2.5:3b"
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.defaultModel = defaultModel;
  }

  /**
   * Constructs the full system prompt with persona styling, newsroom wire briefing, and language directives.
   */
  public buildSystemPrompt(
    persona: Persona,
    newsPromptContext?: string,
    language: "es" | "en" | "auto" = "auto",
    userUtterance: string = ""
  ): string {
    const effectiveLang = detectQueryLanguage(userUtterance || "", language);
    const isEs = effectiveLang === "es";

    let prompt = isEs
      ? `Eres ${persona.name}, ${persona.title || "Presentadora Principal de Noticias"} en NewsStudio TV.`
      : `You are ${persona.name}, ${persona.title || "Lead News Anchor"} at NewsStudio TV.`;

    prompt += isEs
      ? `\nPersonalidad: ${persona.description || "Carismática, profesional, ágil y autoritaria."}`
      : `\nPersonality: ${persona.description || "Charismatic, professional, agile, and authoritative."}`;

    // Persona-specific tone nuances
    if (persona.id === "blaze") {
      prompt += isEs
        ? `\nEstilo de Entrega: Muy enérgica, entusiasta, rápida y apasionada por la tecnología y la cultura digital.`
        : `\nDelivery Style: High-energy, enthusiastic, fast-paced, and deeply passionate about technology and digital culture.`;
    } else if (persona.id === "mateo" || persona.id === "tomas") {
      prompt += isEs
        ? `\nEstilo de Entrega: Analítico, agudo, geopolítico y financiero con datos precisos.`
        : `\nDelivery Style: Analytical, sharp, geopolitical, and financial with precise data grounding.`;
    } else {
      prompt += isEs
        ? `\nEstilo de Entrega: Autoritaria, balanceada, cálida y con dicción perfecta de televisión.`
        : `\nDelivery Style: Authoritative, balanced, warm, with flawless broadcast television cadence.`;
    }

    // Rules for conversational brevity
    prompt += isEs
      ? `\n\nREGLAS DE RESPUESTA CONVERSACIONAL:
1. Responde de forma CONCISA, NATURAL y HABLADA (máximo 1 a 3 oraciones cortas, entre 15 y 40 palabras).
2. NO uses viñetas, ni markdown, ni encabezados. El texto será leído directamente por síntesis de voz.
3. Si hablas de una noticia específica de los cables provistos, incluye al final [project_story: StoryID].
4. Si hablas de un indicador financiero o cripto, incluye al final [project_ticker: TICKER].
5. Puedes incluir directivas de gestos corporales: [gesture:explanatory], [gesture:wide], o [gesture:perspective].`
      : `\n\nCONVERSATIONAL RULES:
1. Answer CONCISELY and NATURALLY in spoken broadcast style (1 to 3 short sentences, 15-40 words maximum).
2. Do NOT use bullet points, markdown formatting, or bold headers. Your answer will be synthesized to speech.
3. If you reference a specific story from the wire briefings, append [project_story: StoryID] at the end.
4. If you reference a financial/crypto ticker, append [project_ticker: SYMBOL] at the end.
5. You may include body gesture cues: [gesture:explanatory], [gesture:wide], or [gesture:perspective].`;

    // Strict Language Policy based on current user utterance
    if (isEs) {
      prompt += `\n\nPOLÍTICA ESTRICTA DE IDIOMA: La consulta del usuario está en ESPAÑOL. Debes responder EXCLUSIVAMENTE en ESPAÑOL fluido y natural. No respondas en inglés bajo ninguna circunstancia.`;
    } else {
      prompt += `\n\nSTRICT LANGUAGE POLICY: The user's query is in ENGLISH. You MUST respond EXCLUSIVELY in natural, professional ENGLISH. Do NOT output Spanish under any circumstance.`;
    }

    // Standard Audio Emotion Tags
    prompt += `\n\n${GENERIC_AUDIO_TAGS_PROMPT_INSTRUCTION}`;

    // Real-Time Newsroom Wire Briefing RAG
    if (newsPromptContext) {
      prompt += `\n\n${newsPromptContext}`;
    }

    return prompt;
  }

  /**
   * Generates a conversational turn using local Ollama, with graceful fallback to Gemini.
   */
  public async generateTurn(options: {
    personaId: string;
    userUtterance: string;
    history?: { role: "user" | "assistant"; text: string }[];
    newsStories?: NewsStoryItem[];
    newsPromptContext?: string;
    language?: "es" | "en" | "auto";
    modelOverride?: string;
    forceGemini?: boolean;
    companyId?: string | null;
    customModel?: AnyLanguageModel;
  }): Promise<ConversationalResponse> {
    const startTime = Date.now();
    const persona = getPersonaById(options.personaId) || {
      id: "ruby",
      name: "Ruby Vance",
      title: "Lead News Anchor",
      language: "es",
      description: "Charismatic broadcast anchor",
      systemPrompt: "You are Ruby, an intelligent AI news anchor.",
    } as Persona;

    const language = options.language || "auto";
    const effectiveLang = detectQueryLanguage(options.userUtterance, language);
    const systemPrompt = this.buildSystemPrompt(persona, options.newsPromptContext, language, options.userUtterance);

    const historyMessages: ConversationalChatMessage[] = [
      { role: "system", content: systemPrompt },
    ];

    if (options.history && options.history.length > 0) {
      // Include last turns, isolating against cross-language history priming for 3B LLMs
      for (const turn of options.history.slice(-6)) {
        const turnLang = detectQueryLanguage(turn.text);
        if (turn.role === "user" || turnLang === effectiveLang) {
          historyMessages.push({
            role: turn.role === "user" ? "user" : "assistant",
            content: turn.text,
          });
        }
      }
    }

    // Append explicit language directive to the user message to override previous conversation history bias in 3B LLMs
    const userPromptWithDirective =
      effectiveLang === "en"
        ? `${options.userUtterance}\n\n[CRITICAL DIRECTIVE: The user asked in ENGLISH. You MUST reply 100% in spoken broadcast ENGLISH. Do NOT output Spanish under any circumstance.]`
        : `${options.userUtterance}\n\n[DIRECTIVA CRÍTICA: La consulta está en ESPAÑOL. Debes responder 100% en ESPAÑOL hablado de televisión. No uses inglés bajo ninguna circunstancia.]`;

    historyMessages.push({
      role: "user",
      content: userPromptWithDirective,
    });

    let rawOutput = "";
    let providerUsed: "ollama" | "gemini" | "heuristic" = "ollama";
    let modelUsed = options.modelOverride || this.defaultModel;
    const targetModel = options.modelOverride || this.defaultModel;

    const primaryProvider: LLMProvider = options.forceGemini ? "gemini" : "ollama";
    const primaryModel = primaryProvider === "ollama" ? targetModel : undefined;
    const fallbackModel = primaryProvider === "gemini" ? targetModel : undefined;

    // 1 & 2. Unified text generation with mutual Ollama <-> Gemini failover via aiSdkGateway
    try {
      const chatTurns = historyMessages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

      const res = await generateLlmText({
        system: systemPrompt,
        messages: chatTurns,
        provider: primaryProvider,
        model: primaryModel,
        fallbackModel,
        tier: "realtime",
        baseURL: this.baseUrl,
        temperature: 0.35,
        maxTokens: 400,
        allowFallback: true,
        companyId: options.companyId,
        customModel: options.customModel,
      });

      rawOutput = res.text || "";
      providerUsed = res.providerUsed as "ollama" | "gemini";
      modelUsed = res.modelUsed;
    } catch (llmErr) {
      console.warn(
        `[OllamaClient] LLM generation failed: ${
          llmErr instanceof Error ? llmErr.message : String(llmErr)
        }. Switching to heuristic fallback.`
      );
    }

    // 3. Guaranteed Language Alignment Safeguard: If output mismatches query language, fast-translate
    if (rawOutput && effectiveLang === "en" && detectQueryLanguage(rawOutput) === "es") {
      try {
        const transRes = await generateLlmText({
          prompt: `Translate this news anchor broadcast text directly into natural English without conversational filler:\n${rawOutput}`,
          baseURL: this.baseUrl,
          temperature: 0.1,
          maxTokens: 350,
          allowFallback: true,
        });
        if (transRes.text) {
          rawOutput = transRes.text.trim();
        }
      } catch {}
    } else if (rawOutput && effectiveLang === "es" && detectQueryLanguage(rawOutput) === "en") {
      try {
        const transRes = await generateLlmText({
          prompt: `Traduce este texto de noticias directamente al español de televisión sin introducciones:\n${rawOutput}`,
          baseURL: this.baseUrl,
          temperature: 0.1,
          maxTokens: 350,
          allowFallback: true,
        });
        if (transRes.text) {
          rawOutput = transRes.text.trim();
        }
      } catch {}
    }

    // 4. Fallback to intelligent heuristic generation if both failed
    if (!rawOutput) {
      providerUsed = "heuristic";
      modelUsed = "heuristic";
      const isEs = language === "es" || persona.language === "es";
      const firstStory = options.newsStories?.[0];

      if (isEs) {
        rawOutput = firstStory
          ? `[gesture:explanatory] En este momento estamos siguiendo de cerca: ${firstStory.title}. El equipo de redacción continúa actualizando los datos en vivo. [project_story: ${firstStory.id}]`
          : `[gesture:explanatory] Buenas noches. Estamos monitoreando todos los cables de noticias y los mercados en tiempo real para nuestra cobertura.`;
      } else {
        rawOutput = firstStory
          ? `[gesture:explanatory] We are actively tracking breaking updates on ${firstStory.title}. Our newsroom is monitoring the wire as new details emerge. [project_story: ${firstStory.id}]`
          : `[gesture:explanatory] Welcome to our live newsroom desk. We are actively monitoring global headlines and market indices.`;
      }
    }

    const latencyMs = Date.now() - startTime;

    // Parse gesture action pose
    let actionPose: ConversationalResponse["actionPose"] = "M2_RAISED_EXPLANATORY";
    if (rawOutput.includes("[gesture:wide]") || rawOutput.includes("[gesture:open]")) {
      actionPose = "M3_OPEN_HANDS";
    } else if (rawOutput.includes("[gesture:perspective]") || rawOutput.includes("[gesture:side]")) {
      actionPose = "M5_SIDE_PERSPECTIVE_TURN";
    } else if (rawOutput.includes("[gesture:idle]") || rawOutput.includes("[gesture:nod]")) {
      actionPose = "M1_NEUTRAL_CLASPED";
    }

    // Parse holographic projected card
    let projectedCard: ProjectedCardData | null = null;
    const storyMatch = rawOutput.match(/\[project_story:\s*([^\]]+)\]/i);
    if (storyMatch && options.newsStories) {
      const matchId = storyMatch[1].trim();
      const foundStory = options.newsStories.find(
        (s) => s.id === matchId || s.title.toLowerCase().includes(matchId.toLowerCase())
      ) || options.newsStories[0];

      if (foundStory) {
        projectedCard = {
          type: "story",
          title: foundStory.title,
          category: foundStory.category || "BREAKING NEWS",
          badge: "VERIFIED WIRE",
          snippet: foundStory.description || foundStory.fullContentSnippet || "Live coverage from NewsStudio.",
          storyId: foundStory.id,
        };
      }
    }

    const tickerMatch = rawOutput.match(/\[project_ticker:\s*([^\]]+)\]/i);
    if (tickerMatch) {
      const sym = tickerMatch[1].trim().toUpperCase();
      projectedCard = {
        type: "ticker",
        title: `${sym} Market Update`,
        category: "FINANCIAL DESK",
        badge: "LIVE TICKER",
        snippet: `${sym} is actively trading on heavy volume today.`,
        change: "+3.4%",
        isPositive: true,
      };
    }

    // If no card was matched but user asked about news/market, provide relevant top story
    if (!projectedCard && options.newsStories && options.newsStories.length > 0) {
      const queryLower = options.userUtterance.toLowerCase();
      const matched = options.newsStories.find(
        (s) =>
          queryLower.includes(s.title.toLowerCase().slice(0, 15)) ||
          (s.category && queryLower.includes(s.category.toLowerCase()))
      );
      if (matched) {
        projectedCard = {
          type: "story",
          title: matched.title,
          category: matched.category || "HEADLINE",
          badge: "NEWSROOM WIRE",
          snippet: matched.description || "Updated report.",
          storyId: matched.id,
        };
      }
    }

    // Generate dynamic follow-up chips
    const suggestedFollowUps = this.generateDynamicFollowUps(
      persona,
      options.userUtterance,
      projectedCard,
      language
    );

    const spokenText = rawOutput
      .replace(/\[project_story:[^\]]+\]/gi, "")
      .replace(/\[project_ticker:[^\]]+\]/gi, "")
      .replace(/\[gesture:[^\]]+\]/gi, "")
      .trim();

    const cleanSpoken = cleanSpokenText(spokenText);

    return {
      rawText: rawOutput,
      spokenText,
      cleanSpokenText: cleanSpoken,
      actionPose,
      projectedCard,
      suggestedFollowUps,
      detectedLanguage: effectiveLang,
      providerUsed,
      modelUsed,
      latencyMs,
    };
  }

  /**
   * Streams a conversational turn using streamLlmText from unified aiSdkGateway.
   */
  public async streamTurnText(options: {
    personaId: string;
    userUtterance: string;
    history?: { role: "user" | "assistant"; text: string }[];
    newsStories?: NewsStoryItem[];
    newsPromptContext?: string;
    language?: "es" | "en" | "auto";
    modelOverride?: string;
    forceGemini?: boolean;
    companyId?: string | null;
    customModel?: AnyLanguageModel;
  }) {
    const persona = getPersonaById(options.personaId) || {
      id: "ruby",
      name: "Ruby Vance",
      title: "Lead News Anchor",
      language: "es",
      description: "Charismatic broadcast anchor",
      systemPrompt: "You are Ruby, an intelligent AI news anchor.",
    } as Persona;

    const language = options.language || "auto";
    const effectiveLang = detectQueryLanguage(options.userUtterance, language);
    const systemPrompt = this.buildSystemPrompt(persona, options.newsPromptContext, language, options.userUtterance);

    const historyMessages: ConversationalChatMessage[] = [
      { role: "system", content: systemPrompt },
    ];

    if (options.history && options.history.length > 0) {
      for (const turn of options.history.slice(-6)) {
        const turnLang = detectQueryLanguage(turn.text);
        if (turn.role === "user" || turnLang === effectiveLang) {
          historyMessages.push({
            role: turn.role === "user" ? "user" : "assistant",
            content: turn.text,
          });
        }
      }
    }

    const userPromptWithDirective =
      effectiveLang === "en"
        ? `${options.userUtterance}\n\n[CRITICAL DIRECTIVE: The user asked in ENGLISH. You MUST reply 100% in spoken broadcast ENGLISH. Do NOT output Spanish under any circumstance.]`
        : `${options.userUtterance}\n\n[DIRECTIVA CRÍTICA: La consulta está en ESPAÑOL. Debes responder 100% en ESPAÑOL hablado de televisión. No uses inglés bajo ninguna circunstancia.]`;

    historyMessages.push({
      role: "user",
      content: userPromptWithDirective,
    });

    const targetModel = options.modelOverride || this.defaultModel;
    const primaryProvider: LLMProvider = options.forceGemini ? "gemini" : "ollama";
    const primaryModel = primaryProvider === "ollama" ? targetModel : undefined;
    const fallbackModel = primaryProvider === "gemini" ? targetModel : undefined;

    const chatTurns = historyMessages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    return streamLlmText({
      system: systemPrompt,
      messages: chatTurns,
      provider: primaryProvider,
      model: primaryModel,
      fallbackModel,
      tier: "realtime",
      thinkingBudget: 0,
      baseURL: this.baseUrl,
      temperature: 0.35,
      maxTokens: 400,
      allowFallback: true,
      companyId: options.companyId,
      customModel: options.customModel,
    });
  }

  /**
   * Sub-450ms Conversational Clause-Streaming Engine (PRD §6.2).
   * Progressively yields token deltas, natural speech clauses with audio emotion tags,
   * and the final completed ConversationalResponse with seamless heuristic fallback.
   */
  public async *streamTurnClauses(options: {
    personaId: string;
    userUtterance: string;
    history?: { role: "user" | "assistant"; text: string }[];
    newsStories?: NewsStoryItem[];
    newsPromptContext?: string;
    language?: "es" | "en" | "auto";
    modelOverride?: string;
    forceGemini?: boolean;
    companyId?: string | null;
    customModel?: AnyLanguageModel;
  }): AsyncGenerator<ConversationalStreamEvent, void, unknown> {
    const startTime = Date.now();
    const language = options.language || "auto";
    const effectiveLang = detectQueryLanguage(options.userUtterance, language);

    let emittedClauseCount = 0;
    let firstClauseTtfaMs = 0;

    try {
      const streamResult = await this.streamTurnText(options);
      const splitter = new ClauseStreamSplitter();
      let accumulatedRaw = "";

      for await (const delta of streamResult.textStream) {
        accumulatedRaw += delta;
        const spokenPreview = cleanSpokenText(accumulatedRaw);
        yield { type: "delta", textDelta: delta, spokenPreview };

        const clauses = splitter.append(delta);
        for (const clause of clauses) {
          if (emittedClauseCount === 0) {
            const clauseLang = detectQueryLanguage(clause.spokenText, effectiveLang);
            if (
              (effectiveLang === "en" && clauseLang === "es") ||
              (effectiveLang === "es" && clauseLang === "en")
            ) {
              throw new Error(
                `Language mismatch on Clause 0 (expected ${effectiveLang}, detected ${clauseLang})`
              );
            }
            firstClauseTtfaMs = Date.now() - startTime;
          }

          yield {
            type: "clause",
            index: clause.index,
            spokenText: clause.spokenText,
            cleanSpokenText: clause.cleanSpokenText,
            actionPose: clause.actionPose,
            detectedLanguage: effectiveLang,
            ttfaMs: emittedClauseCount === 0 ? firstClauseTtfaMs : Date.now() - startTime,
          };
          emittedClauseCount++;
        }
      }

      // Flush any trailing spoken clause
      const trailingClauses = splitter.flush();
      for (const clause of trailingClauses) {
        if (emittedClauseCount === 0) {
          const clauseLang = detectQueryLanguage(clause.spokenText, effectiveLang);
          if (
            (effectiveLang === "en" && clauseLang === "es") ||
            (effectiveLang === "es" && clauseLang === "en")
          ) {
            throw new Error(
              `Language mismatch on Clause 0 (expected ${effectiveLang}, detected ${clauseLang})`
            );
          }
          firstClauseTtfaMs = Date.now() - startTime;
        }

        yield {
          type: "clause",
          index: clause.index,
          spokenText: clause.spokenText,
          cleanSpokenText: clause.cleanSpokenText,
          actionPose: clause.actionPose,
          detectedLanguage: effectiveLang,
          ttfaMs: emittedClauseCount === 0 ? firstClauseTtfaMs : Date.now() - startTime,
        };
        emittedClauseCount++;
      }

      if (emittedClauseCount === 0 && !accumulatedRaw.trim()) {
        throw new Error("Stream yielded empty text content");
      }

      // Metadata & gestures
      const metadata = splitter.getMetadata();
      let actionPose: ConversationalResponse["actionPose"] = "M2_RAISED_EXPLANATORY";
      if (
        metadata.gestureTag?.includes("wide") ||
        metadata.gestureTag?.includes("open") ||
        accumulatedRaw.includes("[gesture:wide]") ||
        accumulatedRaw.includes("[gesture:open]")
      ) {
        actionPose = "M3_OPEN_HANDS";
      } else if (
        metadata.gestureTag?.includes("perspective") ||
        metadata.gestureTag?.includes("side") ||
        accumulatedRaw.includes("[gesture:perspective]") ||
        accumulatedRaw.includes("[gesture:side]")
      ) {
        actionPose = "M5_SIDE_PERSPECTIVE_TURN";
      } else if (
        metadata.gestureTag?.includes("idle") ||
        metadata.gestureTag?.includes("nod") ||
        accumulatedRaw.includes("[gesture:idle]") ||
        accumulatedRaw.includes("[gesture:nod]")
      ) {
        actionPose = "M1_NEUTRAL_CLASPED";
      }

      // Projected holographic card
      let projectedCard: ProjectedCardData | null = null;
      const storyIdCandidate =
        metadata.projectStoryId ||
        accumulatedRaw.match(/\[project_story:\s*([^\]]+)\]/i)?.[1]?.trim();

      if (storyIdCandidate && options.newsStories) {
        const foundStory = options.newsStories.find(
          (s) => s.id === storyIdCandidate || s.title.toLowerCase().includes(storyIdCandidate.toLowerCase())
        ) || options.newsStories[0];

        if (foundStory) {
          projectedCard = {
            type: "story",
            title: foundStory.title,
            category: foundStory.category || "BREAKING NEWS",
            badge: "VERIFIED WIRE",
            snippet: foundStory.description || foundStory.fullContentSnippet || "Live coverage from NewsStudio.",
            storyId: foundStory.id,
          };
        }
      }

      const tickerCandidate =
        metadata.projectTickerSymbol ||
        accumulatedRaw.match(/\[project_ticker:\s*([^\]]+)\]/i)?.[1]?.trim();

      if (tickerCandidate) {
        const sym = tickerCandidate.toUpperCase();
        projectedCard = {
          type: "ticker",
          title: `${sym} Market Update`,
          category: "FINANCIAL DESK",
          badge: "LIVE TICKER",
          snippet: `${sym} is actively trading on heavy volume today.`,
          change: "+3.4%",
          isPositive: true,
        };
      }

      if (!projectedCard && options.newsStories && options.newsStories.length > 0) {
        const queryLower = options.userUtterance.toLowerCase();
        const matched = options.newsStories.find(
          (s) =>
            queryLower.includes(s.title.toLowerCase().slice(0, 15)) ||
            (s.category && queryLower.includes(s.category.toLowerCase()))
        );
        if (matched) {
          projectedCard = {
            type: "story",
            title: matched.title,
            category: matched.category || "HEADLINE",
            badge: "NEWSROOM WIRE",
            snippet: matched.description || "Updated report.",
            storyId: matched.id,
          };
        }
      }

      const persona = getPersonaById(options.personaId) || {
        id: "ruby",
        name: "Ruby Vance",
        language: "es",
      } as Persona;

      const suggestedFollowUps = this.generateDynamicFollowUps(
        persona,
        options.userUtterance,
        projectedCard,
        language
      );

      const spokenText = accumulatedRaw
        .replace(/\[project_story:[^\]]+\]/gi, "")
        .replace(/\[project_ticker:[^\]]+\]/gi, "")
        .replace(/\[gesture:[^\]]+\]/gi, "")
        .trim();

      const cleanSpoken = cleanSpokenText(spokenText);

      const response: ConversationalResponse = {
        rawText: accumulatedRaw,
        spokenText,
        cleanSpokenText: cleanSpoken,
        actionPose,
        projectedCard,
        suggestedFollowUps,
        detectedLanguage: effectiveLang,
        providerUsed: (streamResult.providerUsed as "ollama" | "gemini") || "gemini",
        modelUsed: streamResult.modelUsed || "gemini-2.5-flash",
        latencyMs: Date.now() - startTime,
      };

      yield { type: "complete", response };
    } catch (err: unknown) {
      if (emittedClauseCount === 0) {
        console.warn(
          `[OllamaClient] streamTurnClauses failed before clause emission (${
            err instanceof Error ? err.message : String(err)
          }). Falling back to generateTurn.`
        );

        const fallbackResponse = await this.generateTurn(options);
        const splitter = new ClauseStreamSplitter();
        const fallbackClauses = splitter.append(fallbackResponse.spokenText);
        const remaining = splitter.flush();
        const all = [...fallbackClauses, ...remaining];

        if (all.length === 0 && fallbackResponse.cleanSpokenText) {
          all.push({
            index: 0,
            spokenText: fallbackResponse.spokenText,
            cleanSpokenText: fallbackResponse.cleanSpokenText,
            actionPose: fallbackResponse.actionPose,
            wordCount: 1,
            isFirst: true,
            isFinal: true,
          });
        }

        for (const cl of all) {
          yield {
            type: "clause",
            index: cl.index,
            spokenText: cl.spokenText,
            cleanSpokenText: cl.cleanSpokenText,
            actionPose: fallbackResponse.actionPose,
            detectedLanguage: fallbackResponse.detectedLanguage,
            ttfaMs: Date.now() - startTime,
          };
        }

        yield { type: "complete", response: fallbackResponse };
      } else {
        yield { type: "error", error: err instanceof Error ? err.message : String(err) };
      }
    }
  }

  /**
   * Generates 2-3 dynamic follow-up suggestion questions based on context.
   */
  private generateDynamicFollowUps(
    persona: Persona,
    userQuery: string,
    card: ProjectedCardData | null | undefined,
    language: "es" | "en" | "auto"
  ): string[] {
    const isEs = language === "es" || persona.language === "es";

    if (card?.type === "story") {
      return isEs
        ? [
            "¿Cuáles son las principales repercusiones?",
            "¿Qué dicen los expertos sobre esto?",
            "¿Hay alguna actualización más reciente?",
          ]
        : [
            "What are the main market reactions?",
            "Who are the key players involved?",
            "What happens next in this story?",
          ];
    }

    if (card?.type === "ticker" || userQuery.toLowerCase().includes("market") || userQuery.toLowerCase().includes("mercado")) {
      return isEs
        ? [
            "¿Cómo afecta esto al sector tecnológico?",
            "¿Cuál es el panorama de Bitcoin hoy?",
            "¿Qué se espera para el cierre?",
          ]
        : [
            "How does this impact tech stocks?",
            "What is Bitcoin's trend today?",
            "What are analysts forecasting?",
          ];
    }

    return isEs
      ? [
          "¿Cuál es la noticia más importante de hoy?",
          "Dame un resumen de 30 segundos",
          "¿Qué está pasando con la economía?",
        ]
      : [
          "What is today's top headline?",
          "Give me a 30-second news blitz",
          "What is moving the markets right now?",
        ];
  }
}

export const ollamaConversationalClient = new OllamaConversationalClient();
